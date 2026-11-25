# Cheersbro

Multi-currency payment platform: Onerway collects, Cheersbro ledger splits fees, Flutterwave disburses.

## Features
- Multi-step deposit / withdraw flow
- Multi-currency (USD, EUR, GBP, KES)
- Magic-link auth + JWT refresh rotation
- Service fee split (configurable %)
- Double-entry ledger
- Settlement wallet (available / pending / reserved)
- Direct payout via Flutterwave (bank / M-Pesa)
- Shareable payment links + QR
- Admin revenue & settlement views
- Dark mode

## Setup

```bash
npm install
cp .env.example .env.local
# fill Onerway + Flutterwave keys
npm run dev
```

## Environment

See `.env.example`. Key vars:

| Var | Purpose |
|-----|---------|
| `ONERWAY_*` | Collection gateway |
| `FLUTTERWAVE_*` | Disbursement gateway |
| `CHEERSBRO_FEE_PERCENT` | Service fee (default 2) |
| `JWT_SECRET` | Access token signing |
| `NEXT_PUBLIC_BASE_URL` | Magic links & callbacks |

## Flow

1. Customer pays via Onerway
2. Webhook verifies signature, posts ledger, splits fee
3. Net amount reserved from settlement wallet
4. Flutterwave sends to recipient's bank / M-Pesa
5. Callback updates status

## Deploy

Vercel. Set env vars in the dashboard. Data is stored in `/tmp` on serverless (ephemeral — use a real DB for production).
