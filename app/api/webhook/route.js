import { creditBalance, addTransaction, getPreferredPayout } from '../../../../lib/db';
import { sendToWallet } from '../../../../lib/payout';
import { verifyWebhook } from '../../../../lib/webhook';

const CONFIG = {
  secret: process.env.ONERWAY_SECRET || '',
};

// Idempotency store (use Redis/DB in production)
const processed = new Map();

export async function POST(req) {
  try {
    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const transactionId = payload.transactionId;
    if (!transactionId) {
      return new Response('Missing transactionId', { status: 400 });
    }

    // Prefer x-signature, fall back to X-Rh-Signature
    const signatureHeader =
      req.headers.get('x-signature') ||
      req.headers.get('x-rh-signature');

    const verification = verifyWebhook(payload, signatureHeader, CONFIG.secret);
    if (!verification.ok) {
      console.warn(`[Webhook] Rejected ${transactionId}: ${verification.reason}`);
      return new Response('Invalid signature', { status: 400 });
    }

    // Idempotency
    if (processed.has(transactionId)) {
      console.log(`[Webhook] Idempotent replay ${transactionId}`);
      return new Response(transactionId, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Extract email
    let email = null;
    try {
      const billing = typeof payload.billingInformation === 'string'
        ? JSON.parse(payload.billingInformation)
        : payload.billingInformation;
      email = billing?.email;
    } catch {}

    const amount = parseFloat(payload.orderAmount) || 0;
    const status = payload.status;

    if (email && status === 'S' && amount > 0) {
      const newBalance = creditBalance(email, amount);
      addTransaction({
        email,
        type: 'deposit',
        amount,
        currency: payload.orderCurrency || 'USD',
        transactionId,
        status: 'success',
      });

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

      console.log(`[Webhook] Verified & credited ${email} +${amount}`);
    } else {
      console.log(`[Webhook] Verified ${transactionId} status=${status} (no credit)`);
    }

    processed.set(transactionId, { status, at: new Date().toISOString() });

    // Acknowledge with plain-text transactionId
    return new Response(transactionId, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return new Response('Bad Request', { status: 400 });
  }
}
