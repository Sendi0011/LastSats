'use client';

import Logo from '@/components/ui/Logo';

const FOOTER_LINKS = [
  { label: 'Docs', href: '#' },
  { label: 'GitHub', href: '#' },
  { label: 'Twitter', href: 'https://x.com/lastsats' },
  { label: 'Audit Report', href: '#' },
];

export default function Footer() {
  return (
    <footer
      style={{
        padding: '48px var(--pad-x)',
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
          <Logo variant="lockup" height={26} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Built on Stacks</span>
        </div>

        <div style={{ display: 'flex', gap: 28 }}>
          {FOOTER_LINKS.map(({ label, href }) => {
            const isExternal = href.startsWith('http');
            return (
              <a
                key={label}
                href={href}
                {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {label}
              </a>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} LastSats. Non-custodial. Open source.
        </p>
      </div>
    </footer>
  );
}
