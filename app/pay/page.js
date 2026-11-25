'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function PayContent() {
  const params = useSearchParams();
  const router = useRouter();
  const ref = params.get('ref');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ref) { setError('No payment reference'); setLoading(false); return; }
    fetch(`/api/order?ref=${ref}`)
      .then(r => r.json())
      .then(data => {
        if (data.order) setOrder(data.order);
        else setError(data.error || 'Order not found');
      })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false));
  }, [ref]);

  const pay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: order.amount,
          currency: order.currency,
          email: order.email,
          firstName: order.firstName,
          lastName: order.lastName,
          message: order.message,
          mode: order.mode,
          returnUrl: `${window.location.origin}/status?ref=${ref}&amount=${order.amount}&currency=${order.currency}`,
          notifyUrl: `${window.location.origin}/api/webhook`,
        }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError(data.error || 'Could not start payment');
        setPaying(false);
      }
    } catch {
      setError('Network error');
      setPaying(false);
    }
  };

  if (loading) return <div className="container">Loading payment...</div>;
  if (error) return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 48 }}>
      <div style={{ fontSize: 48 }}>❌</div>
      <h1>Order not found</h1>
      <p style={{ color: 'var(--muted)' }}>{error}</p>
    </div>
  );

  const symbols = { USD: '$', EUR: '€', GBP: '£', KES: 'KSh ' };
  const sym = symbols[order.currency] || '$';

  return (
    <div className="container" style={{ textAlign: 'center' }}>
      <h1 style={{ marginBottom: 8 }}>Pay {order.firstName || 'Creator'}</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Reference: <code>{ref}</code></p>

      <div className="selected-amount-card" style={{ marginBottom: 20 }}>
        <span className="amount-label">Amount due</span>
        <div className="amount-value">{sym}{order.amount.toFixed(2)}</div>
        {order.message && <p style={{ marginTop: 8, fontSize: 14 }}>"{order.message}"</p>}
      </div>

      <button className={`submit-btn ${paying ? 'loading' : ''}`} onClick={pay} disabled={paying}>
        <span className="btn-text">Pay now</span>
        <span className="btn-loader"></span>
      </button>

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        Secure payment via Onerway. This link stays in your browser.
      </p>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <PayContent />
    </Suspense>
  );
}
