'use client';

import Logo from '@/components/ui/Logo';

const FOOTER_LINKS = ['Docs', 'GitHub', 'Twitter', 'Audit Report'];

export default function Footer() {
  return (
    <footer
      style={{
        padding: '48px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}
    >
      <div
        style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo variant="lockup" theme="dark" height={26} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Built on Stacks</span>
        </div>

        <div style={{ display: 'flex', gap: 28 }}>
          {FOOTER_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {link}
            </a>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} LastSats. Non-custodial. Open source.
        </p>
      </div>
    </footer>
  );
}
