// Settlement wallet: tracks funds settled from Onerway and available for payout.
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.VERCEL ? '/tmp/cheersbro-data' : path.join(process.cwd(), 'data');
const SETTLEMENT_FILE = path.join(DATA_DIR, 'settlement.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SETTLEMENT_FILE)) {
    fs.writeFileSync(SETTLEMENT_FILE, JSON.stringify({
      available: 0,
      pending: 0,
      reserved: 0,
      history: [],
    }, null, 2));
  }
}

function load() {
  ensure();
  return JSON.parse(fs.readFileSync(SETTLEMENT_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(SETTLEMENT_FILE, JSON.stringify(data, null, 2));
}

export function recordCollection(amount, meta = {}) {
  const s = load();
  s.pending = Number((s.pending + amount).toFixed(2));
  s.history.unshift({ type: 'collection', amount, at: new Date().toISOString(), ...meta });
  s.history = s.history.slice(0, 200);
  save(s);
  return s;
}

export function markSettled(amount, meta = {}) {
  const s = load();
  const move = Math.min(amount, s.pending);
  s.pending = Number((s.pending - move).toFixed(2));
  s.available = Number((s.available + move).toFixed(2));
  s.history.unshift({ type: 'settled', amount: move, at: new Date().toISOString(), ...meta });
  save(s);
  return s;
}

export function reserveForPayout(amount, meta = {}) {
  const s = load();
  if (s.available < amount) return { ok: false, reason: 'insufficient', available: s.available };
  s.available = Number((s.available - amount).toFixed(2));
  s.reserved = Number((s.reserved + amount).toFixed(2));
  s.history.unshift({ type: 'reserved', amount, at: new Date().toISOString(), ...meta });
  save(s);
  return { ok: true, settlement: s };
}

export function confirmPayout(amount, meta = {}) {
  const s = load();
  s.reserved = Number(Math.max(0, s.reserved - amount).toFixed(2));
  s.history.unshift({ type: 'payout_confirmed', amount, at: new Date().toISOString(), ...meta });
  save(s);
  return s;
}

export function releaseReservation(amount, meta = {}) {
  const s = load();
  s.reserved = Number(Math.max(0, s.reserved - amount).toFixed(2));
  s.available = Number((s.available + amount).toFixed(2));
  s.history.unshift({ type: 'released', amount, at: new Date().toISOString(), ...meta });
  save(s);
  return s;
}

export function getSettlement() {
  return load();
}
