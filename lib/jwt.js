import crypto from 'crypto';
import { getUser, updateUser } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ACCESS_TTL = 15 * 60; // 15 minutes
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days

// --- Minimal JWT (HS256) without extra dependency ---
function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signJWT(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const data = `${header}.${body}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signAccess(email) {
  return signJWT(
    { sub: email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ACCESS_TTL },
    JWT_SECRET
  );
}

export function verifyAccess(token) {
  return verifyJWT(token, JWT_SECRET);
}

// --- Refresh token rotation ---
function loadRefresh() {
  return getUser('__refresh_tokens__').tokens || {};
}

function saveRefresh(tokens) {
  updateUser('__refresh_tokens__', { tokens });
}

export function createRefreshToken(email, family = null) {
  const token = crypto.randomBytes(32).toString('hex');
  const fam = family || crypto.randomBytes(16).toString('hex');
  const tokens = loadRefresh();
  tokens[token] = {
    email,
    family: fam,
    used: false,
    expires: Date.now() + REFRESH_TTL * 1000,
  };
  saveRefresh(tokens);
  return { token, family: fam };
}

export function rotateRefresh(oldToken) {
  const tokens = loadRefresh();
  const entry = tokens[oldToken];
  if (!entry) return { error: 'invalid' };
  if (entry.used) {
    // Reuse of an already-rotated token → possible theft → revoke family
    revokeFamily(entry.family);
    return { error: 'reused' };
  }
  if (Date.now() > entry.expires) {
    delete tokens[oldToken];
    saveRefresh(tokens);
    return { error: 'expired' };
  }

  // Mark old as used
  entry.used = true;
  tokens[oldToken] = entry;

  // Issue new refresh in the same family
  const newToken = crypto.randomBytes(32).toString('hex');
  tokens[newToken] = {
    email: entry.email,
    family: entry.family,
    used: false,
    expires: Date.now() + REFRESH_TTL * 1000,
  };
  saveRefresh(tokens);

  const access = signAccess(entry.email);
  return { access, refresh: newToken, email: entry.email };
}

export function revokeFamily(family) {
  const tokens = loadRefresh();
  for (const [k, v] of Object.entries(tokens)) {
    if (v.family === family) delete tokens[k];
  }
  saveRefresh(tokens);
}

export function revokeRefresh(token) {
  const tokens = loadRefresh();
  delete tokens[token];
  saveRefresh(tokens);
}
