'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Shield } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { WalletModal } from '@/components/ui';

const STATS = [
  { value: '$140B+', label: 'Bitcoin permanently lost' },
  { value: '4M+', label: 'HODLers with no plan' },
  { value: '0', label: 'Inheritance protocols on Bitcoin' },
];

const TRUST_SIGNALS = ['Non-custodial', 'Open source', 'Audited contracts', 'Free tier available'];

export default function Hero() {
  const { connected } = useWallet();
  const [showModal, setShowModal] = useState(false);

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px',
        overflow: 'hidden',
      }}
      className="grid-bg"
    >
      {/* Orbs */}
      <div
        className="orb"
        style={{
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
          top: '10%', left: '50%', transform: 'translateX(-50%)',
        }}
      />
      <div
        className="orb"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          bottom: '20%', right: '-5%',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
        {/* Badge */}
        <div
          className="animate-fade-in"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px',
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: 100, marginBottom: 32,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-orange)', boxShadow: '0 0 6px var(--accent-orange)' }} />
          <span style={{ fontSize: 13, color: 'var(--accent-orange)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            Built on Stacks · Secured by Bitcoin
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up delay-100"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 7vw, 80px)',
            fontWeight: 800, lineHeight: 1.05,
            letterSpacing: '-0.03em', marginBottom: 28,
            color: 'var(--text-primary)',
          }}
        >
          Your Bitcoin survives you.
          <br />
          <span className="text-gradient">Your family gets the sats.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-in-up delay-200"
          style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'var(--text-secondary)', lineHeight: 1.7,
            marginBottom: 48, maxWidth: 600,
            margin: '0 auto 48px', fontWeight: 300,
          }}
        >
          The first trustless Bitcoin inheritance protocol on Stacks. Set a dead man&apos;s switch,
          designate your heirs, and let Clarity smart contracts handle the rest — automatically.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-in-up delay-300"
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}
        >
          {connected ? (
            <Link
              href="/dashboard"
              className="btn-primary"
              style={{ padding: '14px 32px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              Go to Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
              style={{ padding: '14px 32px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Protect Your Bitcoin <ArrowRight size={18} />
            </button>
          )}
          <Link
            href="#how-it-works"
            className="btn-secondary"
            style={{ padding: '14px 28px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            See How It Works
          </Link>
        </div>

        {/* Trust signals */}
        <div
          className="animate-fade-in-up delay-400"
          style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {TRUST_SIGNALS.map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} color="var(--accent-green)" />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div
        className="animate-fade-in-up delay-500"
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', gap: 0, marginTop: 80,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden', maxWidth: 700, width: '100%',
        }}
      >
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              flex: 1, padding: '24px 28px',
              borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
                color: i === 2 ? 'var(--accent-green)' : 'var(--text-primary)',
                marginBottom: 4, letterSpacing: '-0.02em',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </section>
  );
}
