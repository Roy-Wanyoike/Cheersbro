// Double-entry ledger helpers
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.VERCEL ? '/tmp/cheersbro-data' : path.join(process.cwd(), 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json');

const ACCOUNTS = {
  '1000': 'Cash / Settlement',
  '2000': 'User Liabilities',
  '2100': 'Pending Withdrawals',
  '4000': 'Service Fee Revenue',
  '5000': 'Payout Clearing',
  '6000': 'Provider Fees',
};

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEDGER_FILE)) fs.writeFileSync(LEDGER_FILE, '[]');
}

function load() {
  ensure();
  return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
}

function save(entries) {
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(entries, null, 2));
}

/**
 * Post a balanced journal.
 * lines: [{ accountCode, debit, credit, email?, memo? }]
 */
export function postJournal({ transactionId, currency = 'USD', lines }) {
  const debitSum = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const creditSum = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(debitSum - creditSum) > 0.001) {
    throw new Error(`Journal not balanced: debits=${debitSum} credits=${creditSum}`);
  }

  const entries = load();
  const now = new Date().toISOString();

  for (const line of lines) {
    entries.push({
      id: `le_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transactionId,
      accountCode: line.accountCode,
      accountName: ACCOUNTS[line.accountCode] || line.accountCode,
      debit: line.debit || 0,
      credit: line.credit || 0,
      currency,
      email: line.email || null,
      memo: line.memo || '',
      createdAt: now,
    });
  }

  save(entries);
  return { ok: true, transactionId, debitSum, creditSum };
}

/** User available balance = credits − debits on account 2000 */
export function getUserBalance(email) {
  const entries = load();
  return entries
    .filter(e => e.email === email && e.accountCode === '2000')
    .reduce((s, e) => s + e.credit - e.debit, 0);
}

/** Company revenue = credits on account 4000 */
export function getCompanyRevenue() {
  const entries = load();
  return entries
    .filter(e => e.accountCode === '4000')
    .reduce((s, e) => s + e.credit - e.debit, 0);
}

/** Cash position = debits − credits on account 1000 */
export function getCashPosition() {
  const entries = load();
  return entries
    .filter(e => e.accountCode === '1000')
    .reduce((s, e) => s + e.debit - e.credit, 0);
}

export function getLedgerEntries(limit = 50) {
  return load().slice(-limit).reverse();
}
