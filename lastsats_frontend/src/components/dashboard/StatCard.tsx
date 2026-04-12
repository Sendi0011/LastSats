import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

export default function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <div className="card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <div
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: `${accent || 'var(--accent-orange)'}18`,
            border: `1px solid ${accent || 'var(--accent-orange)'}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent || 'var(--accent-orange)',
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}
