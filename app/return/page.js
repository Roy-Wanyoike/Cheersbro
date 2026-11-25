'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function ReturnContent() {
  const params = useSearchParams();
  const status = params.get('status') || 'pending';
  const txnId = params.get('transactionId') || params.get('merchantTxnId') || '';

  const isSuccess = status === 'S' || status === 'success';
  const isFailed = status === 'F' || status === 'failed';

  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 48 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        {isSuccess ? '🎉' : isFailed ? '😔' : '⏳'}
      </div>
      <h1 style={{ marginBottom: 8 }}>
        {isSuccess ? 'Payment Successful!' : isFailed ? 'Payment Failed' : 'Processing...'}
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        {isSuccess
          ? 'Thank you for your support! Your balance has been updated.'
          : isFailed
          ? 'Something went wrong. Please try again or contact support.'
          : 'We are confirming your payment. This usually takes a few seconds.'}
      </p>
      {txnId && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          Reference: <code>{txnId}</code>
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link href="/" className="next-btn" style={{ textDecoration: 'none', padding: '12px 24px' }}>
          Back to Cheersbro
        </Link>
      </div>
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <ReturnContent />
    </Suspense>
  );
}
