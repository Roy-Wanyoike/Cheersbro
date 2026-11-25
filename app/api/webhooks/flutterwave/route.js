import { verifyFlutterwaveSignature } from '@/lib/flutterwave';
import { addTransaction } from '@/lib/db';

export async function POST(req) {
  try {
    const raw = await req.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const signature = req.headers.get('verif-hash') || req.headers.get('x-flutterwave-signature');
    if (process.env.FLUTTERWAVE_WEBHOOK_SECRET && !verifyFlutterwaveSignature(payload, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = payload.event || payload.data?.status;
    const ref = payload.data?.reference || payload.reference;
    const status = payload.data?.status;

    console.log(`[Flutterwave Webhook] event=${event} ref=${ref} status=${status}`);

    if (ref && status) {
      addTransaction({
        type: 'payout_status',
        reference: ref,
        status: status.toLowerCase(),
        provider: 'flutterwave',
        raw: payload.data,
      });
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[Flutterwave Webhook]', err);
    return new Response('error', { status: 500 });
  }
}
