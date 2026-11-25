'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';

const currencies = {
  USD: { symbol: '$', rate: 1 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  KES: { symbol: 'KSh ', rate: 129 },
};

const presetsByCurrency = {
  USD: [5, 10, 25, 50, 100],
  EUR: [5, 10, 20, 50, 100],
  GBP: [5, 10, 20, 40, 80],
  KES: [500, 1000, 2500, 5000, 10000],
};

const emojis = ['☕', '🥤', '🍕', '🎁', '🚀'];

export default function SupportApp() {
  const [theme, setTheme] = useState('light');
  const [mode, setMode] = useState('deposit');
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState('US');
  const [balance, setBalance] = useState(247.50);
  const [transactions, setTransactions] = useState([
    { type: 'deposit', amount: 50, currency: 'USD', date: '2h ago' },
    { type: 'withdraw', amount: 25, currency: 'USD', date: '1d ago' },
  ]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [qrModal, setQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [connectedPayouts, setConnectedPayouts] = useState({});
  const [preferredPayout, setPreferredPayout] = useState(null);
  const [payoutForm, setPayoutForm] = useState(null);
  const [payoutData, setPayoutData] = useState({});
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load payout methods for this user
  useEffect(() => {
    if (email && email.includes('@')) {
      fetch(`/api/payout-method?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.methods) setConnectedPayouts(data.methods);
          if (data.preferred) setPreferredPayout(data.preferred.method);
        })
        .catch(() => {});
    }
  }, [email]);

  useEffect(() => {
    if (email && email.includes('@')) {
      fetch(`/api/balance?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.balance != null) setBalance(data.balance);
          if (data.transactions?.length) setTransactions(data.transactions.map(t => ({
            ...t,
            date: new Date(t.createdAt).toLocaleDateString()
          })));
        })
        .catch(() => {});
    }
  }, [email]);

  const sym = currencies[currency].symbol;
  const convertedBalance = (balance * currencies[currency].rate).toFixed(2);
  const fee = amount > 0 ? (amount * 0.029 + 0.30).toFixed(2) : null;

  const selectPreset = (val) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustom = (val) => {
    setCustomAmount(val);
    setAmount(parseFloat(val) || 0);
  };

  const showStatus = (msg, type) => {
    setStatus({ msg, type });
    setTimeout(() => setStatus(null), 4000);
  };

  const goToStep = (n) => {
    if (n === 2 && amount <= 0) return showStatus('Select an amount', 'error');
    if (n === 3 && !email.includes('@')) return showStatus('Valid email required', 'error');
    setStep(n);
  };

  const handleSubmit = async () => {
    setLoading(true);
    showStatus('Creating secure checkout...', 'success');

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, currency, email, firstName, lastName, country, message, mode,
          returnUrl: window.location.origin + '/status',
          notifyUrl: window.location.origin + '/api/webhook',
        }),
      });
      const data = await res.json();

      if (data.redirectUrl) {
        setTransactions([{ type: mode, amount, currency, date: 'Just now' }, ...transactions]);
        if (mode === 'deposit') setBalance(b => b + amount);
        showStatus('Redirecting to Onerway...', 'success');
        setTimeout(() => { window.location.href = data.redirectUrl; }, 800);
      } else {
        throw new Error(data.error || 'No redirect');
      }
    } catch (err) {
      setTransactions([{ type: mode, amount, currency, date: 'Just now' }, ...transactions]);
      if (mode === 'deposit') setBalance(b => b + amount);
      showStatus('Demo mode: Backend not configured. Set Onerway env vars.', 'success');
    } finally {
      setLoading(false);
    }
  };

  const openQR = async () => {
    const url = await QRCode.toDataURL(window.location.href, { width: 180, margin: 1 });
    setQrDataUrl(url);
    setQrModal(true);
  };

  const createShareLink = async () => {
    if (amount <= 0 || !email.includes('@')) {
      return showStatus('Select amount and enter email first', 'error');
    }
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, email, firstName, lastName, message, mode }),
      });
      const data = await res.json();
      if (data.ref) {
        const link = `${window.location.origin}/pay?ref=${data.ref}`;
        setShareLink(link);
        navigator.clipboard.writeText(link).catch(() => {});
        fetch('/api/email-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, ref: data.ref, amount, currency, creatorName: firstName }),
        }).catch(() => {});
        showStatus('Payment link created, copied, and emailed!', 'success');
      }
    } catch {
      showStatus('Could not create link', 'error');
    }
  };

  const payoutFields = {
    bank: [{ id: 'name', label: 'Account Name' }, { id: 'number', label: 'Account Number' }, { id: 'bank', label: 'Bank Name' }],
    mpesa: [{ id: 'phone', label: 'Phone Number' }],
    paypal: [{ id: 'email', label: 'PayPal Email' }],
    crypto: [{ id: 'address', label: 'Wallet Address' }, { id: 'network', label: 'Network' }],
  };

  const openPayoutForm = (method) => {
    setPayoutForm(method);
    setPayoutData({});
  };

  const connectPayout = async () => {
    const fields = payoutFields[payoutForm] || [];
    for (const f of fields) {
      if (!payoutData[f.id]) return showStatus(f.label + ' required', 'error');
    }
    try {
      const res = await fetch('/api/payout-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, method: payoutForm, details: payoutData, setPreferred: true }),
      });
      const data = await res.json();
      if (data.methods) setConnectedPayouts(data.methods);
      if (data.preferred) setPreferredPayout(data.preferred);
    } catch {}
    setPayoutForm(null);
    showStatus(payoutForm + ' connected! Funds will go here.', 'success');
  };

  const makePreferred = async (method) => {
    try {
      await fetch('/api/payout-method', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, method }),
      });
      setPreferredPayout(method);
      showStatus(method + ' set as preferred', 'success');
    } catch {}
  };

  return (
    <div className="container">
      <header>
        <div className="header-top">
          <h1>Cheersbro</h1>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
        <div className="balance-card">
          <span className="balance-label">Available Balance</span>
          <span className="balance-value">{sym}{convertedBalance}</span>
          <span className="balance-currency">{currency}</span>
        </div>
        <div className="social-proof">
          <span className="proof-dot"></span>
          <span>142 people supported this week</span>
        </div>
        <Link href="/orders" style={{ fontSize: 12, color: 'var(--orange)', marginTop: 8, display: 'inline-block' }}>View order history →</Link>
      </header>

      <div className="progress-steps">
        {[1, 2, 3].map(n => (
          <div key={n} className={`step ${step === n ? 'active' : ''}`}>{n}. {['Amount', 'Details', 'Confirm'][n - 1]}</div>
        ))}
      </div>

      <div className="mode-toggle">
        <button className={mode === 'deposit' ? 'active' : ''} onClick={() => { setMode('deposit'); setStep(1); }}>☕ Deposit</button>
        <button className={mode === 'withdraw' ? 'active' : ''} onClick={() => { setMode('withdraw'); setStep(1); }}>💸 Withdraw</button>
      </div>

      {step === 1 && (
        <section>
          <div className="currency-switcher">
            {Object.keys(currencies).map(c => (
              <button key={c} className={`currency-btn ${currency === c ? 'active' : ''}`} onClick={() => setCurrency(c)}>{c}</button>
            ))}
          </div>
          <h2>Select Amount</h2>
          <div className="presets">
            {presetsByCurrency[currency].map((val, i) => (
              <button key={val} className={`preset ${amount === val ? 'active' : ''}`} onClick={() => selectPreset(val)}>
                <span>{emojis[i]}</span>{sym}{val}
              </button>
            ))}
          </div>
          <div className="form-group">
            <label>Custom Amount</label>
            <div className="input-wrapper">
              <span className="currency-prefix">{sym}</span>
              <input type="number" value={customAmount} onChange={e => handleCustom(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="selected-amount-card">
            <span className="amount-label">You're sending</span>
            <div className="amount-value">{sym}{amount.toFixed(2)}</div>
            <div className="fee-estimate">{fee ? `Est. fee: ${sym}${fee}` : 'No fees shown'}</div>
          </div>
          <button className="next-btn" onClick={() => goToStep(2)}>Continue →</button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>Your Details</h2>
          <div className="form-group">
            <label>Email <span className="required">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Alex" />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Rivera" />
            </div>
          </div>
          <div className="form-group">
            <label>Message (optional)</label>
            <textarea rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a note..." />
          </div>
          <div className="form-group">
            <label>Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)}>
              <option value="US">🇺🇸 United States</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="KE">🇰🇪 Kenya</option>
              <option value="NG">🇳🇬 Nigeria</option>
              <option value="ZA">🇿🇦 South Africa</option>
              <option value="IN">🇮🇳 India</option>
            </select>
          </div>
          <div className="step-nav">
            <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
            <button className="next-btn" onClick={() => goToStep(3)}>Review →</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>Confirm</h2>
          <div className="confirm-summary">
            <div><span>Amount</span><span>{sym}{amount.toFixed(2)}</span></div>
            <div><span>Email</span><span>{email}</span></div>
            {message && <div><span>Message</span><span>{message}</span></div>}
            <div><span>Mode</span><span>{mode}</span></div>
          </div>
          <div className="trust-badges">
            <div className="badge">🔒 Secure</div>
            <div className="badge">⚡ Instant</div>
            <div className="badge">💳 Card + Wallets</div>
          </div>
          <div className="step-nav">
            <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
            <button className={`submit-btn ${loading ? 'loading' : ''}`} onClick={handleSubmit} disabled={loading}>
              <span className="btn-text">Continue to Payment</span>
              <span className="btn-loader"></span>
            </button>
          </div>
        </section>
      )}

      {mode === 'withdraw' && (
        <section className="payout-section">
          <h2>Connect Payout Wallet</h2>
          <p className="payout-hint">Payments go directly to your preferred method</p>
          <div className="payout-methods">
            {['bank', 'mpesa', 'paypal', 'crypto'].map(m => (
              <div key={m} className="payout-method" style={{ cursor: 'default' }}>
                <span>{m === 'bank' ? '🏦' : m === 'mpesa' ? '📱' : m === 'paypal' ? '💳' : '₿'}</span>
                <span>{m.charAt(0).toUpperCase() + m.slice(1)}</span>
                {connectedPayouts[m] ? (
                  <>
                    <span className="connect-status">✓ Connected</span>
                    {preferredPayout === m ? (
                      <span style={{ fontSize: 11, color: 'var(--orange)', marginLeft: 8 }}>Preferred</span>
                    ) : (
                      <button
                        onClick={() => makePreferred(m)}
                        style={{ marginLeft: 'auto', fontSize: 11, background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer' }}
                      >
                        Set preferred
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => openPayoutForm(m)}
                    className="connect-status"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
          {payoutForm && (
            <div className="payout-form">
              {payoutFields[payoutForm].map(f => (
                <div key={f.id}>
                  <label>{f.label}</label>
                  <input value={payoutData[f.id] || ''} onChange={e => setPayoutData({ ...payoutData, [f.id]: e.target.value })} placeholder={f.label} />
                </div>
              ))}
              <button className="next-btn" onClick={connectPayout}>Connect</button>
            </div>
          )}
        </section>
      )}

      <section className="recent-section">
        <h2>Recent Activity</h2>
        <div className="transaction-list">
          {transactions.slice(0, 4).map((t, i) => (
            <div key={i} className="tx-item">
              <span>{t.type === 'deposit' ? '⬇️' : '⬆️'} {t.type}</span>
              <span className={`tx-amount ${t.type === 'deposit' ? 'positive' : 'negative'}`}>
                {t.type === 'deposit' ? '+' : '-'}{currencies[t.currency]?.symbol || '$'}{t.amount}
              </span>
              <span style={{ color: 'var(--muted)' }}>{t.date}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="share-section">
        <button className="share-btn" onClick={createShareLink}>🔗 Create payment link</button>
        <button className="share-btn" onClick={openQR}>📱 QR Code</button>
      </div>
      {shareLink && (
        <div style={{ marginTop: 12, padding: 12, background: 'var(--cream)', borderRadius: 12, fontSize: 13 }}>
          <strong>Share this link:</strong>
          <div style={{ wordBreak: 'break-all', marginTop: 4 }}>
            <a href={shareLink} target="_blank" rel="noopener">{shareLink}</a>
          </div>
          <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 12 }}>Stays in the browser — anyone with the link can pay.</p>
        </div>
      )}

      {qrModal && (
        <div className="modal" onClick={() => setQrModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setQrModal(false)}>&times;</button>
            <h3>Scan to support</h3>
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" width={180} height={180} />}
            <p className="qr-url">{typeof window !== 'undefined' ? window.location.href : ''}</p>
          </div>
        </div>
      )}

      {status && <div className={`status ${status.type}`}>{status.msg}</div>}
    </div>
  );
}
