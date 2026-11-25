import { creditBalance, addTransaction, getPreferredPayout, creditCompany } from '@/lib/db';
import { sendToWallet } from '@/lib/payout';
import { verifyWebhook } from '@/lib/webhook';
import { calculateSplit } from '@/lib/fees';
import { postJournal } from '@/lib/ledger';

const CONFIG = {
  secret: process.env.ONERWAY_SECRET || '',
};

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

    const signatureHeader =
      req.headers.get('x-signature') ||
      req.headers.get('x-rh-signature');

    const verification = verifyWebhook(payload, signatureHeader, CONFIG.secret);
    if (!verification.ok) {
      console.warn(`[Webhook] Rejected ${transactionId}: ${verification.reason}`);
      return new Response('Invalid signature', { status: 400 });
    }

    if (processed.has(transactionId)) {
      return new Response(transactionId, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

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
      const { fee, recipient, feePercent } = calculateSplit(amount);

      // Double-entry journal
      postJournal({
        transactionId,
        currency: payload.orderCurrency || 'USD',
        lines: [
          { accountCode: '1000', debit: amount, memo: 'Deposit received' },
          { accountCode: '2000', credit: recipient, email, memo: 'User liability' },
          { accountCode: '4000', credit: fee, memo: 'Service fee revenue' },
        ],
      });

      creditCompany(fee, { email, transactionId, feePercent });

      const newBalance = creditBalance(email, recipient);
      addTransaction({
        email,
        type: 'deposit',
        amount: recipient,
        fee,
        feePercent,
        gross: amount,
        currency: payload.orderCurrency || 'USD',
        transactionId,
        status: 'success',
      });

      const preferred = getPreferredPayout(email);
      if (preferred) {
        const payoutResult = await sendToWallet({
          email,
          amount: recipient,
          currency: payload.orderCurrency || 'USD',
          method: preferred.method,
          details: preferred.details,
          reference: transactionId,
        });
        console.log(`[Payout] ${email} → ${preferred.method}:`, payoutResult.ok ? 'sent' : payoutResult.error);
        addTransaction({
          email,
          type: 'payout',
          amount: recipient,
          currency: payload.orderCurrency || 'USD',
          method: preferred.method,
          status: payoutResult.ok ? 'sent' : 'failed',
          reference: payoutResult.requestId,
        });
      }

      console.log(`[Webhook] Split: fee=${fee} (${feePercent}%), recipient=${recipient}`);
    } else {
      console.log(`[Webhook] Verified ${transactionId} status=${status}`);
    }

    processed.set(transactionId, { status, at: new Date().toISOString() });

    return new Response(transactionId, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return new Response('Bad Request', { status: 400 });
  }
}
