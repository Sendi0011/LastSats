import { Shield, Clock, Users, Lock } from 'lucide-react';

const STEPS = [
  {
    step: '01', title: 'Connect & Deposit',
    desc: 'Connect your Xverse or Leather wallet and deposit sBTC into your LastSats vault. You remain in full control.',
    icon: <Lock size={22} />, color: '#F97316',
  },
  {
    step: '02', title: 'Configure Beneficiaries',
    desc: 'Set wallet addresses, percentage splits, and optional time-locks. Add a guardian who can pause execution if needed.',
    icon: <Users size={22} />, color: '#3B82F6',
  },
  {
    step: '03', title: 'Set Your Heartbeat',
    desc: "Choose how often you check in — every 30, 60, or 90 days. A single transaction confirms you're alive.",
    icon: <Clock size={22} />, color: '#10B981',
  },
  {
    step: '04', title: 'Automatic Execution',
    desc: 'If your heartbeat is missed and the grace period expires, the Clarity smart contract distributes your sBTC automatically.',
    icon: <Shield size={22} />, color: '#8B5CF6',
  },
];

export default function HowItWorks() {
  return (
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
            fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: 16,
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
        {STEPS.map((item) => (
          <div
            key={item.step}
            className="card card-hover"
            style={{ padding: 32, position: 'relative', overflow: 'hidden' }}
          >
            <div
              style={{
                position: 'absolute', top: -20, right: -10,
                fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 800,
                color: 'rgba(255,255,255,0.03)', lineHeight: 1, userSelect: 'none',
              }}
            >
              {item.step}
            </div>
            <div
              style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${item.color}18`, border: `1px solid ${item.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.color, marginBottom: 20,
              }}
            >
              {item.icon}
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 10 }}>
              {item.title}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
