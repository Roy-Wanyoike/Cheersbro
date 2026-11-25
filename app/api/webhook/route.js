import { creditBalance, addTransaction, getPreferredPayout } from '../../../../lib/db';
import { sendToWallet } from '../../../../lib/payout';
import crypto from 'crypto';

const CONFIG = {
  secret: process.env.ONERWAY_SECRET || 'YOUR_SECRET_KEY',
};

const WEBHOOK_EXCLUDED = new Set([
  'originTransactionId', 'originMerchantTxnId', 'customsDeclarationAmount',
  'customsDeclarationCurrency', 'paymentMethod', 'walletTypeName',
  'periodValue', 'tokenExpireTime', 'sign'
]);

function verifySignature(payload, signatureHeader, secret) {
  const signatures = [];
  if (signatureHeader) {
    signatureHeader.split(',').forEach(part => {
      const match = part.trim().match(/^v1=([a-f0-9]+)$/i);
      if (match) signatures.push(match[1].toLowerCase());
    });
  }

  const normalized = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!WEBHOOK_EXCLUDED.has(k) && v != null && v !== '') {
      normalized[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }

  const keys = Object.keys(normalized).sort();
  const canonical = keys.map(k => normalized[k]).join('');
  const expected = crypto.createHash('sha256').update(canonical + secret, 'utf8').digest('hex');

  return signatures.length > 0 ? signatures.includes(expected) : payload.sign?.toLowerCase() === expected;
}

const processed = new Map();

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const transactionId = payload.transactionId;

    if (!transactionId) {
      return new Response('Missing transactionId', { status: 400 });
    }

    const signatureHeader = req.headers.get('x-rh-signature') || req.headers.get('x-signature');
    if (!verifySignature(payload, signatureHeader, CONFIG.secret)) {
      return new Response('Invalid signature', { status: 400 });
    }

    if (processed.has(transactionId)) {
      return new Response(transactionId, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // Extract email from billing info if present
    let email = null;
    try {
      const billing = typeof payload.billingInformation === 'string'
        ? JSON.parse(payload.billingInformation)
        : payload.billingInformation;
      email = billing?.email;
    } catch {}

    const amount = parseFloat(payload.orderAmount) || 0;
    const status = payload.status; // S = success

    if (email && status === 'S' && amount > 0) {
      // Credit internal balance
      const newBalance = creditBalance(email, amount);
      addTransaction({
        email,
        type: 'deposit',
        amount,
        currency: payload.orderCurrency || 'USD',
        transactionId,
        status: 'success',
      });

      // Direct-to-wallet: if creator has a connected payout method, send funds immediately
      const preferred = getPreferredPayout(email);
      if (preferred) {
        const payoutResult = await sendToWallet({
          email,
          amount,
          currency: payload.orderCurrency || 'USD',
          method: preferred.method,
          details: preferred.details,
          reference: transactionId,
        });
        console.log(`[Payout] ${email} → ${preferred.method}:`, payoutResult.ok ? 'sent' : payoutResult.error);
        addTransaction({
          email,
          type: 'payout',
          amount,
          currency: payload.orderCurrency || 'USD',
          method: preferred.method,
          status: payoutResult.ok ? 'sent' : 'failed',
          reference: payoutResult.requestId,
        });
      }

      console.log(`[Webhook] Credited ${email} +${amount}, balance=${newBalance}`);
    } else {
      console.log(`[Webhook] ${transactionId} status=${status} (no credit)`);
    }

    processed.set(transactionId, { status, at: new Date().toISOString() });

    return new Response(transactionId, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Bad Request', { status: 400 });
  }
}
