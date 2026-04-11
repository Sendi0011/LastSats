'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { WalletModal } from '@/components/ui';

const PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', period: 'forever',
    desc: 'For early adopters and small stacks.',
    features: ['Up to 0.05 sBTC per vault', '1 beneficiary', '180-day heartbeat only', 'Testnet access', 'Open-source contracts'],
    cta: 'Get Started Free', highlight: false,
  },
  {
    id: 'hodler', name: 'Hodler', price: '$9', period: '/month',
    desc: 'For serious Bitcoiners protecting their family.',
    features: ['Up to 2 sBTC per vault', 'Up to 5 beneficiaries', '30 / 60 / 90 / 180 day heartbeat', 'Guardian role', 'Time-locked releases', 'Audit certificate', 'Email & push notifications'],
    cta: 'Start Hodler', highlight: true,
  },
  {
    id: 'whale', name: 'Whale', price: '$49', period: '/month',
    desc: 'For whales, family offices, and institutions.',
    features: ['Unlimited sBTC per vault', 'Unlimited beneficiaries', 'Custom heartbeat interval', 'Multi-signature support', 'Legal document generator', 'Priority support', 'Institutional compliance docs'],
    cta: 'Go Whale', highlight: false,
  },
];

export default function Pricing() {
  const [showModal, setShowModal] = useState(false);

  return (
    <section id="pricing" style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 72 }}>
        <span className="badge badge-orange" style={{ marginBottom: 16 }}>Pricing</span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: 16,
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
          gap: 20, maxWidth: 1000, margin: '0 auto',
        }}
      >
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: plan.highlight
                ? 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.03) 100%)'
                : 'var(--bg-card)',
              border: `1px solid ${plan.highlight ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
              borderRadius: 20, padding: 32, position: 'relative', transition: 'all 0.2s',
            }}
          >
            {plan.highlight && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                <span className="badge badge-orange">Most Popular</span>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 6 }}>
                {plan.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{plan.period}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{plan.desc}</p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              style={{
                width: '100%', padding: '13px 24px', borderRadius: 10,
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', marginBottom: 24, transition: 'all 0.2s',
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
                  <Check size={15} color={plan.highlight ? 'var(--accent-orange)' : 'var(--accent-green)'} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </section>
  );
}
