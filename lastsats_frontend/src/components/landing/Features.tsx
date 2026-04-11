import { Lock, Shield, Zap, Clock, Users, Globe } from 'lucide-react';

const FEATURES = [
  { icon: <Lock size={18} />, title: 'Non-Custodial', desc: 'LastSats never holds your keys or your Bitcoin. Ever.' },
  { icon: <Shield size={18} />, title: 'Bitcoin-Secured', desc: 'All state is anchored to Bitcoin via Stacks. Immutable.' },
  { icon: <Zap size={18} />, title: 'Automatic Execution', desc: 'Clarity smart contracts execute without any human intervention.' },
  { icon: <Clock size={18} />, title: 'Time-Locks', desc: 'Release funds to heirs at a specific age or date.' },
  { icon: <Users size={18} />, title: 'Multi-Beneficiary', desc: 'Split your vault across unlimited heirs with custom percentages.' },
  { icon: <Globe size={18} />, title: 'Guardian Role', desc: 'Assign a trusted contact to pause execution if something goes wrong.' },
];

export default function Features() {
  return (
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
              fontWeight: 800, letterSpacing: '-0.025em',
              color: 'var(--text-primary)', marginBottom: 12,
            }}
          >
            Built for the long-term HODLer.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
            Every feature designed around one goal: your Bitcoin reaches your family.
          </p>
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
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--accent-orange-dim)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-orange)', flexShrink: 0,
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
  );
}
