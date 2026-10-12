'use client';

import { useEffect, useState } from 'react';
import Logo from '@/components/ui/Logo';
import { useLocalStorage } from '@/lib/useLocalStorage';

type Status = 'idle' | 'loading' | 'error';

export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useLocalStorage('waitlist_subscribed', false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem('waitlist_submitted') === 'true' && !subscribed) {
        setSubscribed(true);
      }
    } catch {
      /* storage unavailable — ignore */
    }
  }, [subscribed, setSubscribed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company, source: 'landing' }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSubscribed(true);
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  };

  return (
    <section
      style={{
        padding: 'var(--section-y) var(--pad-x)',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div
          className="orb"
          style={{
            width: 500, height: 300,
            background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px', filter: 'drop-shadow(0 0 28px rgba(249,115,22,0.45))',
            }}
          >
            <Logo variant="mark" height={64} />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800, letterSpacing: '-0.025em',
              color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.1,
            }}
          >
            Don&apos;t let your Bitcoin
            <br />
            <span className="text-gradient">disappear with you.</span>
          </h2>

          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.7 }}>
            Join the waitlist. Be first to access mainnet launch and get 3 months free on any paid plan.
          </p>

          {subscribed ? (
            <div
              style={{
                padding: '20px 32px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 14,
                color: 'var(--accent-green)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600, fontSize: 15,
              }}
            >
              ✓ You&apos;re on the list! We&apos;ll email you when mainnet launches.
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto', flexWrap: 'wrap' }}
              >
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    position: 'absolute', left: '-9999px', width: 1, height: 1,
                    opacity: 0, pointerEvents: 'none',
                  }}
                />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                  style={{ flex: '1 1 200px', minWidth: 0 }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={status === 'loading'}
                  style={{ padding: '12px 24px', fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {status === 'loading' ? 'Joining…' : 'Join Waitlist'}
                </button>
              </form>
              {status === 'error' && error && (
                <p style={{ marginTop: 12, fontSize: 13, color: 'var(--accent-red)' }}>{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
