'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <header style={{ marginBottom: 20 }}>
        <div className="logo">Cheersbro Admin</div>
        <Link href="/" style={{ fontSize: 13, color: 'var(--orange)' }}>← Back</Link>
      </header>

      <div className="wallet-card">
        <div className="wallet-label">Company Revenue</div>
        <div className="wallet-balance">${data.balance.toFixed(2)}</div>
        <div className="wallet-meta">
          <span>Fee: {data.feePercent}%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' }}>
        <div style={{ background: 'var(--cream)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Today</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>${data.today.toFixed(2)}</div>
        </div>
        <div style={{ background: 'var(--cream)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>This month</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>${data.month.toFixed(2)}</div>
        </div>
      </div>

      <h2>Recent fees</h2>
      <div className="transaction-list">
        {(data.recent || []).map((e, i) => (
          <div key={i} className="tx-item">
            <div className="tx-info">
              <span className="tx-type">Fee</span>
              <span className="tx-meta">{e.email || '—'} · {e.at?.slice(0, 16)}</span>
            </div>
            <div className="tx-amount positive">+${e.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
