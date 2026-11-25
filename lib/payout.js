import crypto from 'crypto';

const CONFIG = {
  merchantNo: process.env.ONERWAY_MERCHANT_NO || 'YOUR_MERCHANT_NO',
  secret: process.env.ONERWAY_SECRET || 'YOUR_SECRET_KEY',
  payoutBase: process.env.ONERWAY_ENV === 'production'
    ? 'https://api.onerway.com/payout'
    : 'https://sandbox-api.onerway.com/payout',
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

/**
 * Send funds directly to a connected payout method via Onerway Transfer API.
 * method: 'bank' | 'mpesa' | 'paypal' | 'crypto'
 * details: the fields the user filled when connecting
 */
export async function sendToWallet({ email, amount, currency, method, details, reference }) {
  const requestId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // Map our method to Onerway paymentMethod
  const methodMap = {
    bank: 'BANK_TRANSFER',
    mpesa: 'E_WALLET',
    paypal: 'E_WALLET',
    crypto: 'E_WALLET',
  };

  const paymentMethod = methodMap[method] || 'BANK_TRANSFER';

  // Build account information based on method
  let accountInfomation = {};
  if (method === 'bank') {
    accountInfomation = {
      accountName: details.name || '',
      accountNumber: details.number || '',
      bankName: details.bank || '',
    };
  } else if (method === 'mpesa') {
    accountInfomation = {
      walletType: 'MPESA',
      walletPhone: details.phone || '',
    };
  } else if (method === 'paypal') {
    accountInfomation = {
      walletType: 'PAYPAL',
      email: details.email || '',
    };
  } else if (method === 'crypto') {
    accountInfomation = {
      walletType: 'CRYPTO',
      walletAddress: details.address || '',
      network: details.network || '',
    };
  }

  const payload = {
    merchantNo: CONFIG.merchantNo,
    requestId,
    payoutCurrency: currency || 'USD',
    payoutAmount: Number(amount).toFixed(2),
    paymentMethod,
    entityType: '1', // individual
    bankCountry: 'US',
    receiverInfo: JSON.stringify({
      firstName: details.name?.split(' ')[0] || 'Creator',
      lastName: details.name?.split(' ').slice(1).join(' ') || 'User',
      email,
    }),
    accountInfomation: JSON.stringify(accountInfomation),
    address: JSON.stringify({ country: 'US' }),
    remark: `Cheersbro direct payout ${reference || ''}`.trim(),
  };

  payload.sign = generateSignature(payload, CONFIG.secret);

  try {
    const res = await fetch(`${CONFIG.payoutBase}/api/v1/txn/remittance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: data.respCode === '20000', data, requestId };
  } catch (err) {
    return { ok: false, error: err.message, requestId };
  }
}
