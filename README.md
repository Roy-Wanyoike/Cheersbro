# Cheersbro

Deposit & withdraw site with Onerway Checkout.

## Features
- Multi-step flow (Amount → Details → Confirm)
- Multi-currency (USD, EUR, GBP, KES)
- Dark mode
- Live balance & recent activity
- Payout method connection (Bank, M-Pesa, PayPal, Crypto)
- QR code sharing
- Real Onerway redirect via `/api/create-checkout`
- Webhook handler with signature verification
- Return/status page

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local with your Onerway credentials
npm run dev
```

## Environment variables

See `.env.example`.

## Deploy

The included GitHub Action deploys to Vercel on push to `main`.

Required secrets:
- `ONERWAY_MERCHANT_NO`
- `ONERWAY_APP_ID`
- `ONERWAY_SECRET`
- `ONERWAY_ENV`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## API routes

- `POST /api/create-checkout` — creates Onerway session, returns `redirectUrl`
- `POST /api/webhook` — receives Onerway payment notifications
- `GET /return` — post-payment status page
