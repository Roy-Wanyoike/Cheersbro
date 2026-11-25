'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    if (!token) { setStatus('No token'); return; }
    fetch(`/api/auth/verify?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          localStorage.setItem('cheersbro_access', data.access);
          localStorage.setItem('cheersbro_refresh', data.refresh);
          localStorage.setItem('cheersbro_email', data.email);
          setStatus('Signed in! Redirecting...');
          setTimeout(() => router.push('/'), 800);
        } else {
          setStatus(data.error || 'Failed');
        }
      })
      .catch(() => setStatus('Error'));
  }, [token, router]);

  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 48 }}>
      <h1>{status}</h1>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
