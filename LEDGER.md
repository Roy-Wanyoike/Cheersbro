# Cheersbro Double-Entry Ledger Design

## Core idea
Every transaction has equal **debits** and **credits**.  
The books always balance: `sum(debits) === sum(credits)`.

## Chart of accounts

| Code | Account | Type | Purpose |
|------|---------|------|---------|
| 1000 | Cash / Settlement | Asset | Money held at Onerway / bank |
| 2000 | User Liabilities | Liability | What Cheersbro owes users |
| 2100 | Pending Withdrawals | Liability | Funds reserved for payouts |
| 4000 | Service Fee Revenue | Income | Cheersbro’s earned fees |
| 5000 | Payout Clearing | Asset | In-flight payouts |
| 6000 | Provider Fees | Expense | Onerway / bank fees |

## Example: $100 payment, 2% fee

**Journal entry**

| Account | Debit | Credit |
|---------|-------|--------|
| Cash / Settlement (1000) | 100.00 | |
| User Liabilities (2000) | | 98.00 |
| Service Fee Revenue (4000) | | 2.00 |
| **Total** | **100.00** | **100.00** |

## Example: $98 payout to user

| Account | Debit | Credit |
|---------|-------|--------|
| User Liabilities (2000) | 98.00 | |
| Cash / Settlement (1000) | | 98.00 |
| **Total** | **98.00** | **98.00** |

## Example: $98 reserved for pending withdrawal

| Account | Debit | Credit |
|---------|-------|--------|
| User Liabilities (2000) | 98.00 | |
| Pending Withdrawals (2100) | | 98.00 |
| **Total** | **98.00** | **98.00** |

## Example: withdrawal fails (release hold)

| Account | Debit | Credit |
|---------|-------|--------|
| Pending Withdrawals (2100) | 98.00 | |
| User Liabilities (2000) | | 98.00 |
| **Total** | **98.00** | **98.00** |

## Data model

```js
// ledger_entries
{
  id: "le_xxx",
  transactionId: "txn_xxx",   // groups the two sides
  accountCode: "1000",
  accountName: "Cash / Settlement",
  debit: 100.00,
  credit: 0,
  currency: "USD",
  email: null,                // for user-specific liabilities
  memo: "Deposit from Onerway",
  createdAt: "..."
}
```

## Rules
1. Every journal must balance (debits = credits).
2. Never update a balance directly — always post entries.
3. User balance = sum of credits − debits on account 2000 for that email.
4. Company revenue = sum of credits on account 4000.
5. Cash position = sum of debits − credits on account 1000.
6. Use idempotency keys so the same webhook never posts twice.
