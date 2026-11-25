'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function StatusContent() {
  const params = useSearchParams();
  const status = (params.get('status') || 'pending').toLowerCase();
  const txnId = params.get('transactionId') || params.get('ref') || '';
  const amount = params.get('amount');
  const currency = params.get('currency') || 'USD';

  const states = {
    success: { icon: '🎉', title: 'Payment Successful!', msg: 'Thank you! Funds are on the way to the connected wallet.', color: '#16a34a' },
    s: { icon: '🎉', title: 'Payment Successful!', msg: 'Thank you! Funds are on the way to the connected wallet.', color: '#16a34a' },
    failed: { icon: '😔', title: 'Payment Failed', msg: 'Something went wrong. Please try again.', color: '#dc2626' },
    f: { icon: '😔', title: 'Payment Failed', msg: 'Something went wrong. Please try again.', color: '#dc2626' },
    pending: { icon: '⏳', title: 'Processing', msg: 'We are confirming your payment. This usually takes a few seconds.', color: '#d97706' },
    cancelled: { icon: '🚫', title: 'Cancelled', msg: 'The payment was cancelled.', color: '#6b7280' },
  };

  const s = states[status] || states.pending;

  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 48 }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>{s.icon}</div>
      <h1 style={{ marginBottom: 8, color: s.color }}>{s.title}</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>{s.msg}</p>
      {amount && <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{currency} {amount}</p>}
      {txnId && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          Reference: <code style={{ background: 'var(--cream)', padding: '2px 6px', borderRadius: 4 }}>{txnId}</code>
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="next-btn" style={{ textDecoration: 'none', padding: '12px 24px', display: 'inline-block' }}>
          Back to Cheersbro
        </Link>
        {status !== 'success' && status !== 's' && (
          <Link href={`/?ref=${txnId}`} className="back-btn" style={{ textDecoration: 'none' }}>
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <StatusContent />
    </Suspense>
  );
}
