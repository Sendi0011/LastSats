'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';

export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section
      style={{
        padding: '100px 24px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
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
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px', boxShadow: '0 0 40px rgba(249,115,22,0.4)',
            }}
          >
            <Shield size={28} color="white" />
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

          {submitted ? (
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
              ✓ You&apos;re on the list! We&apos;ll reach out when mainnet launches.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto' }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Join Waitlist
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
