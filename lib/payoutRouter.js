// Provider-independent payout router
import { flutterwaveTransfer } from './flutterwave';

/**
 * Route a payout to the right provider based on method.
 * - bank / mpesa / mobile_money → Flutterwave
 * - paypal → (future PayPal Payouts)
 * - crypto → (future)
 */
export async function dispatchPayout({ email, amount, currency, method, details, reference }) {
  const m = (method || '').toLowerCase();

  if (m === 'bank' || m === 'mpesa' || m === 'mobile_money') {
    return flutterwaveTransfer({ amount, currency, method: m, details, reference });
  }

  if (m === 'paypal') {
    console.log(`[Payout] PayPal not yet integrated for ${email}`);
    return { ok: false, error: 'PayPal payouts not enabled' };
  }

  console.log(`[Payout] Unsupported method: ${method}`);
  return { ok: false, error: `Unsupported payout method: ${method}` };
}
