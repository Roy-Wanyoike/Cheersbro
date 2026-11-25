# Cheersbro – Next.js

Deposit & withdraw site with Onerway Checkout.

## Features
- Multi-step flow (Amount → Details → Confirm)
- Multi-currency (USD, EUR, GBP, KES)
- Dark mode
- Live balance & recent activity
- Payout method connection (Bank, M-Pesa, PayPal, Crypto)
- QR code sharing
- Real Onerway redirect via `/api/create-checkout`

## Setup

```bash
cd onerway-next
npm install
```

Create `.env.local`:

```
ONERWAY_MERCHANT_NO=your_merchant_no
ONERWAY_APP_ID=your_app_id
ONERWAY_SECRET=your_secret
ONERWAY_ENV=sandbox
```

## Run

```bash
npm run dev
```

Open http://localhost:3000

## API

`POST /api/create-checkout`  
Signs the request and calls Onerway, returns `{ redirectUrl }`.

## Files
- `app/page.js` – Main page
- `components/SupportApp.js` – Client UI
- `app/api/create-checkout/route.js` – Onerway integration
- `app/globals.css` – Styles
