// Flutterwave transfer (disbursement) client
import crypto from 'crypto';

const BASE = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';
const SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';

/**
 * Send money via Flutterwave Transfer.
 * Supports bank and mobile money (Kenya M-Pesa etc.).
 */
export async function flutterwaveTransfer({
  amount,
  currency = 'USD',
  method,          // 'bank' | 'mpesa' | 'mobile_money'
  details,         // { account_number, account_bank, phone, network, name }
  reference,
  narration = 'Cheersbro payout',
}) {
  if (!SECRET) {
    console.warn('[Flutterwave] No secret key — demo mode');
    return { ok: true, demo: true, reference };
  }

  const payload = {
    account_bank: method === 'mpesa' || method === 'mobile_money' ? 'MPS' : (details.account_bank || details.bank),
    account_number: method === 'mpesa' || method === 'mobile_money'
      ? details.phone
      : details.account_number || details.number,
    amount,
    narration,
    currency,
    reference,
    callback_url: process.env.FLUTTERWAVE_CALLBACK_URL || '',
    debit_currency: currency,
    beneficiary_name: details.name || details.account_name || 'Recipient',
  };

  try {
    const res = await fetch(`${BASE}/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.status !== 'success') {
      return { ok: false, error: data.message || 'Transfer failed', data };
    }
    return { ok: true, id: data.data?.id, status: data.data?.status, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Verify Flutterwave webhook signature */
export function verifyFlutterwaveSignature(payload, signature) {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || SECRET;
  if (!secret || !signature) return false;
  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
