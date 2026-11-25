import crypto from 'crypto';

// Fields excluded from webhook signature (per Onerway docs)
// Future fields are included by default — only exclude these.
export const WEBHOOK_EXCLUDED = new Set([
  'originTransactionId',
  'originMerchantTxnId',
  'customsDeclarationAmount',
  'customsDeclarationCurrency',
  'paymentMethod',
  'walletTypeName',
  'periodValue',
  'tokenExpireTime',
  'sign',
]);

/**
 * Normalize a value for signature.
 * Objects/arrays must be used as their raw string form — do not re-parse and re-serialize.
 */
function normalizeValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  // If it's already a string (including JSON strings from the body), use as-is
  if (typeof value === 'string') return value;
  // Numbers, etc.
  return String(value);
}

/**
 * Build the canonical string for signature:
 * 1. Exclude WEBHOOK_EXCLUDED fields
 * 2. Sort remaining keys ASCII ascending
 * 3. Concatenate non-empty values
 * 4. Append secret
 */
export function buildCanonical(payload, secret) {
  const entries = [];
  for (const [k, v] of Object.entries(payload)) {
    if (WEBHOOK_EXCLUDED.has(k)) continue;
    const norm = normalizeValue(v);
    if (norm != null && norm !== '') {
      entries.push([k, norm]);
    }
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const values = entries.map(([, v]) => v).join('');
  return values + secret;
}

/**
 * Compute SHA-256 hex signature.
 */
export function computeSignature(payload, secret) {
  const canonical = buildCanonical(payload, secret);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Parse signature header.
 * Supports: "v1=abc, v1=def" (key rotation) and plain hex.
 * Prefers x-signature; falls back to X-Rh-Signature.
 */
export function parseSignatureHeader(header) {
  if (!header) return [];
  const sigs = [];
  header.split(',').forEach(part => {
    const trimmed = part.trim();
    const match = trimmed.match(/^v1=([a-f0-9]+)$/i);
    if (match) {
      sigs.push(match[1].toLowerCase());
    } else if (/^[a-f0-9]+$/i.test(trimmed)) {
      // plain hex fallback
      sigs.push(trimmed.toLowerCase());
    }
  });
  return sigs;
}

/**
 * Verify a webhook payload.
 * @param {object} payload - parsed JSON body
 * @param {string|null} signatureHeader - value of x-signature or X-Rh-Signature
 * @param {string} secret - merchant secret
 * @returns {{ ok: boolean, reason?: string, expected?: string }}
 */
export function verifyWebhook(payload, signatureHeader, secret) {
  if (!secret || secret === 'YOUR_SECRET_KEY') {
    return { ok: false, reason: 'Secret not configured' };
  }

  const expected = computeSignature(payload, secret);
  const provided = parseSignatureHeader(signatureHeader);

  // Prefer header signatures (supports key rotation)
  if (provided.length > 0) {
    const match = provided.includes(expected);
    return match
      ? { ok: true, expected }
      : { ok: false, reason: 'Signature mismatch', expected };
  }

  // Fallback to body sign (not recommended, but supported)
  if (payload.sign && typeof payload.sign === 'string') {
    const bodyMatch = payload.sign.toLowerCase() === expected;
    return bodyMatch
      ? { ok: true, expected }
      : { ok: false, reason: 'Body sign mismatch', expected };
  }

  return { ok: false, reason: 'No signature provided' };
}
