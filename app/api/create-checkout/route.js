import crypto from 'crypto';

const CONFIG = {
  merchantNo: process.env.ONERWAY_MERCHANT_NO || 'YOUR_MERCHANT_NO',
  appId: process.env.ONERWAY_APP_ID || 'YOUR_APP_ID',
  secret: process.env.ONERWAY_SECRET || 'YOUR_SECRET_KEY',
  baseUrl: process.env.ONERWAY_ENV === 'production'
    ? 'https://acq.onerway.com'
    : 'https://sandbox-acq.onerway.com',
};

function normalizeValue(value) {
  if (value == null || value === '') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function generateSignature(payload, secret) {
  const normalized = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k !== 'sign') normalized[k] = normalizeValue(v);
  }
  const keys = Object.keys(normalized).sort();
  let canonical = '';
  for (const k of keys) {
    const val = normalized[k];
    if (val != null && val !== '') canonical += val;
  }
  return crypto.createHash('sha256').update(canonical + secret, 'utf8').digest('hex');
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { amount, currency = 'USD', email, firstName, lastName, country, message, mode, returnUrl, notifyUrl } = body;

    if (!amount || !email) {
      return Response.json({ error: 'Amount and email required' }, { status: 400 });
    }

    const merchantTxnId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      merchantNo: CONFIG.merchantNo,
      merchantTxnId,
      orderAmount: Number(amount).toFixed(2),
      orderCurrency: currency,
      productType: 'ALL',
      subProductType: 'DIRECT',
      txnType: 'SALE',
      billingInformation: { firstName: firstName || 'Customer', lastName: lastName || 'User', email, country: country || 'US' },
      shippingInformation: { firstName: firstName || 'Customer', lastName: lastName || 'User', email, country: country || 'US' },
      txnOrderMsg: {
        returnUrl: returnUrl || 'https://yoursite.com/return',
        notifyUrl: notifyUrl || 'https://yoursite.com/api/webhook',
        appId: CONFIG.appId,
        products: [{ name: mode === 'withdraw' ? 'Withdrawal' : 'Deposit', price: Number(amount).toFixed(2), num: '1', currency }],
      },
    };

    payload.sign = generateSignature(payload, CONFIG.secret);

    const requestBody = {
      ...payload,
      billingInformation: JSON.stringify(payload.billingInformation),
      shippingInformation: JSON.stringify(payload.shippingInformation),
      txnOrderMsg: JSON.stringify({
        ...payload.txnOrderMsg,
        products: JSON.stringify(payload.txnOrderMsg.products),
      }),
    };

    const res = await fetch(`${CONFIG.baseUrl}/txn/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (data.respCode === '20000' && data.data?.redirectUrl) {
      return Response.json({ redirectUrl: data.data.redirectUrl, merchantTxnId, transactionId: data.data.transactionId });
    }

    return Response.json({ error: data.respMsg || 'Onerway error' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
