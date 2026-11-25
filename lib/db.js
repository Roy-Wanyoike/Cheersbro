// Simple file-based store. On Vercel use /tmp (writable); locally use ./data.
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.VERCEL
  ? '/tmp/cheersbro-data'
  : path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TX_FILE = path.join(DATA_DIR, 'transactions.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
  if (!fs.existsSync(TX_FILE)) fs.writeFileSync(TX_FILE, '[]');
}

export function getUser(email) {
  ensure();
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  return users[email] || { email, balance: 0, payouts: {} };
}

export function updateUser(email, data) {
  ensure();
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  users[email] = { ...getUser(email), ...data };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  return users[email];
}

export function addTransaction(tx) {
  ensure();
  const txs = JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
  txs.unshift({ ...tx, id: Date.now().toString(), createdAt: new Date().toISOString() });
  fs.writeFileSync(TX_FILE, JSON.stringify(txs.slice(0, 100), null, 2));
  return txs[0];
}

export function getTransactions(email) {
  ensure();
  const txs = JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
  return txs.filter(t => t.email === email).slice(0, 20);
}

export function creditBalance(email, amount) {
  const user = getUser(email);
  const newBalance = (user.balance || 0) + amount;
  updateUser(email, { balance: newBalance });
  return newBalance;
}

export function setPayoutMethod(email, method, details, setPreferred = true) {
  const user = getUser(email);
  const payouts = { ...(user.payouts || {}), [method]: { ...details, connectedAt: new Date().toISOString() } };
  const update = { payouts };
  if (setPreferred) update.preferredPayout = method;
  updateUser(email, update);
  return getUser(email);
}

export function getPayoutMethods(email) {
  const user = getUser(email);
  return user.payouts || {};
}

export function setPreferredPayout(email, method) {
  const user = getUser(email);
  if (!user.payouts?.[method]) return null;
  updateUser(email, { preferredPayout: method });
  return getUser(email);
}

export function getPreferredPayout(email) {
  const user = getUser(email);
  if (!user.preferredPayout || !user.payouts?.[user.preferredPayout]) return null;
  return { method: user.preferredPayout, details: user.payouts[user.preferredPayout] };
}
