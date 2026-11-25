import crypto from 'crypto';
import { getUser, updateUser } from './db';

function loadTokens() {
  const store = getUser('__magic_tokens__');
  return store.tokens || {};
}

function saveTokens(tokens) {
  updateUser('__magic_tokens__', { tokens });
}

export function createMagicToken(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokens = loadTokens();
  tokens[token] = {
    email,
    expires: Date.now() + 15 * 60 * 1000,
  };
  saveTokens(tokens);
  return token;
}

export function verifyMagicToken(token) {
  const tokens = loadTokens();
  const entry = tokens[token];
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    delete tokens[token];
    saveTokens(tokens);
    return null;
  }
  delete tokens[token];
  saveTokens(tokens);
  return entry.email;
}

export function createSession(email) {
  const session = crypto.randomBytes(32).toString('hex');
  const user = getUser(email);
  const sessions = user.sessions || {};
  sessions[session] = { createdAt: Date.now() };
  updateUser(email, { sessions });
  return session;
}

export function getSessionEmail(session) {
  if (!session) return null;
  const fs = require('fs');
  const path = require('path');
  const dataDir = process.env.VERCEL ? '/tmp/cheersbro-data' : path.join(process.cwd(), 'data');
  const file = path.join(dataDir, 'users.json');
  if (!fs.existsSync(file)) return null;
  const users = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [email, user] of Object.entries(users)) {
    if (email.startsWith('__')) continue;
    if (user.sessions?.[session]) return email;
  }
  return null;
}
