'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Clock, Users, Lock, ChevronRight, Check, Zap, Globe, ArrowRight, Bitcoin } from 'lucide-react';
import WalletModal from '@/components/WalletModal';
import { useWallet } from '@/lib/wallet-context';

const STATS = [
  { value: '$140B+', label: 'Bitcoin permanently lost' },
  { value: '4M+', label: 'HODLers with no plan' },
  { value: '0', label: 'Inheritance protocols on Bitcoin' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect & Deposit',
    desc: 'Connect your Xverse or Leather wallet and deposit sBTC into your LastSats vault. You remain in full control.',
    icon: <Lock size={22} />,
    color: '#F97316',
  },
  {
    step: '02',
    title: 'Configure Beneficiaries',
    desc: 'Set wallet addresses, percentage splits, and optional time-locks. Add a guardian who can pause execution if needed.',
    icon: <Users size={22} />,
    color: '#3B82F6',
  },
  {
    step: '03',
    title: 'Set Your Heartbeat',
    desc: 'Choose how often you check in — every 30, 60, or 90 days. A single transaction confirms you\'re alive.',
    icon: <Clock size={22} />,
    color: '#10B981',
  },
  {
    step: '04',
    title: 'Automatic Execution',
    desc: 'If your heartbeat is missed and the grace period expires, the Clarity smart contract distributes your sBTC automatically.',
    icon: <Shield size={22} />,
    color: '#8B5CF6',
  },
];

const FEATURES = [
  { icon: <Lock size={18} />, title: 'Non-Custodial', desc: 'LastSats never holds your keys or your Bitcoin. Ever.' },
  { icon: <Shield size={18} />, title: 'Bitcoin-Secured', desc: 'All state is anchored to Bitcoin via Stacks. Immutable.' },
  { icon: <Zap size={18} />, title: 'Automatic Execution', desc: 'Clarity smart contracts execute without any human intervention.' },
  { icon: <Clock size={18} />, title: 'Time-Locks', desc: 'Release funds to heirs at a specific age or date.' },
  { icon: <Users size={18} />, title: 'Multi-Beneficiary', desc: 'Split your vault across unlimited heirs with custom percentages.' },
  { icon: <Globe size={18} />, title: 'Guardian Role', desc: 'Assign a trusted contact to pause execution if something goes wrong.' },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'For early adopters and small stacks.',
    color: 'var(--border-bright)',
    accent: 'var(--text-secondary)',
    features: [
      'Up to 0.05 sBTC per vault',
      '1 beneficiary',
      '180-day heartbeat only',
      'Testnet access',
      'Open-source contracts',
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    id: 'hodler',
    name: 'Hodler',
    price: '$9',
    period: '/month',
    desc: 'For serious Bitcoiners protecting their family.',
    color: 'rgba(249,115,22,0.4)',
    accent: 'var(--accent-orange)',
    features: [
      'Up to 2 sBTC per vault',
      'Up to 5 beneficiaries',
      '30 / 60 / 90 / 180 day heartbeat',
      'Guardian role',
      'Time-locked releases',
      'Audit certificate',
      'Email & push notifications',
    ],
    cta: 'Start Hodler',
    highlight: true,
  },
  {
    id: 'whale',
    name: 'Whale',
    price: '$49',
    period: '/month',
    desc: 'For whales, family offices, and institutions.',
    color: 'rgba(139,92,246,0.4)',
    accent: '#8B5CF6',
    features: [
      'Unlimited sBTC per vault',
      'Unlimited beneficiaries',
      'Custom heartbeat interval',
      'Multi-signature support',
      'Legal document generator',
      'Priority support',
      'Institutional compliance docs',
    ],
    cta: 'Go Whale',
    highlight: false,
  },
];

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const { connected } = useWallet();
  const [emailInput, setEmailInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) {
      setSubmitted(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* HERO */}
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
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        <div
          className="orb"
          style={{
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            bottom: '20%',
            right: '-5%',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div
            className="animate-fade-in"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 100,
              marginBottom: 32,
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
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              marginBottom: 28,
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
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              marginBottom: 48,
              maxWidth: 600,
              margin: '0 auto 48px',
              fontWeight: 300,
            }}
          >
            The first trustless Bitcoin inheritance protocol on Stacks. Set a dead man's switch, designate your heirs, and let Clarity smart contracts handle the rest — automatically.
          </p>

          {/* CTA Buttons */}
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
            style={{
              display: 'flex',
              gap: 24,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {['Non-custodial', 'Open source', 'Audited contracts', 'Free tier available'].map((t) => (
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
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            gap: 0,
            marginTop: 80,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            maxWidth: 700,
            width: '100%',
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                padding: '24px 28px',
                borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 800,
                  color: i === 2 ? 'var(--accent-green)' : 'var(--text-primary)',
                  marginBottom: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span className="badge badge-orange" style={{ marginBottom: 16 }}>How It Works</span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 16,
            }}
          >
            Four steps to protect
            <br />
            <span className="text-gradient">a lifetime of stacking.</span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
            No lawyers. No custodians. No single point of failure. Just Clarity contracts secured by Bitcoin.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
          }}
        >
          {HOW_IT_WORKS.map((item, i) => (
            <div
              key={item.step}
              className="card card-hover"
              style={{ padding: 32, position: 'relative', overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -10,
                  fontFamily: 'var(--font-display)',
                  fontSize: 80,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.03)',
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {item.step}
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${item.color}18`,
                  border: `1px solid ${item.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color,
                  marginBottom: 20,
                }}
              >
                {item.icon}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--text-primary)',
                  marginBottom: 10,
                }}
              >
                {item.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section
        style={{
          padding: '80px 24px 120px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                marginBottom: 12,
              }}
            >
              Built for the long-term HODLer.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Every feature designed around one goal: your Bitcoin reaches your family.</p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card card-hover"
                style={{ padding: '24px 28px', display: 'flex', gap: 16, alignItems: 'flex-start' }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--accent-orange-dim)',
                    border: '1px solid rgba(249,115,22,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-orange)',
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span className="badge badge-orange" style={{ marginBottom: 16 }}>Pricing</span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 16,
            }}
          >
            Start free. Upgrade as
            <br />
            <span className="text-gradient">your stack grows.</span>
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            maxWidth: 1000,
            margin: '0 auto',
          }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.highlight ? 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.03) 100%)' : 'var(--bg-card)',
                border: `1px solid ${plan.highlight ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
                borderRadius: 20,
                padding: 32,
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <span className="badge badge-orange">Most Popular</span>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 20,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}
                >
                  {plan.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 40,
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{plan.desc}</p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                style={{
                  width: '100%',
                  padding: '13px 24px',
                  borderRadius: 10,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginBottom: 24,
                  transition: 'all 0.2s',
                  background: plan.highlight ? 'var(--accent-orange)' : 'transparent',
                  color: plan.highlight ? 'white' : 'var(--text-primary)',
                  border: plan.highlight ? 'none' : '1px solid var(--border-bright)',
                }}
                onMouseEnter={(e) => {
                  if (plan.highlight) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(249,115,22,0.4)';
                  } else {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  if (!plan.highlight) e.currentTarget.style.background = 'transparent';
                }}
              >
                {plan.cta}
              </button>

              <hr className="divider" style={{ marginBottom: 24 }} />

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Check
                      size={15}
                      color={plan.highlight ? 'var(--accent-orange)' : 'var(--accent-green)'}
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* WAITLIST / CTA */}
      <section
        style={{
          padding: '100px 24px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            className="orb"
            style={{
              width: 500,
              height: 300,
              background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 28px',
                boxShadow: '0 0 40px rgba(249,115,22,0.4)',
              }}
            >
              <Shield size={28} color="white" />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                marginBottom: 16,
                lineHeight: 1.1,
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
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                ✓ You&apos;re on the list! We&apos;ll reach out when mainnet launches.
              </div>
            ) : (
              <form
                onSubmit={handleWaitlist}
                style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto' }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
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

      {/* FOOTER */}
      <footer
        style={{
          padding: '48px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={14} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              Last<span style={{ color: 'var(--accent-orange)' }}>Sats</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Built on Stacks</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Docs', 'GitHub', 'Twitter', 'Audit Report'].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {link}
              </a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            © 2025 LastSats. Non-custodial. Open source.
          </p>
        </div>
      </footer>

      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
