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

// In-memory store (use Redis/DB in production)
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

    // Idempotency
    if (processed.has(transactionId)) {
      console.log(`[Idempotent] ${transactionId}`);
      return new Response(transactionId, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // Process payment
    console.log(`[Webhook] ${transactionId} status=${payload.status} amount=${payload.orderAmount}`);
    // TODO: credit user, update order, send email, etc.

    processed.set(transactionId, { status: payload.status, at: new Date().toISOString() });

    return new Response(transactionId, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Bad Request', { status: 400 });
  }
}
