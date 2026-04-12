import { AlertTriangle } from 'lucide-react';

interface UrgentBannerProps {
  count: number;
}

export default function UrgentBanner({ count }: UrgentBannerProps) {
  if (count === 0) return null;

  return (
    <div
      role="alert"
      style={{
        padding: '16px 20px',
        background: 'rgba(249,115,22,0.08)',
        border: '1px solid rgba(249,115,22,0.25)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 28,
      }}
    >
      <AlertTriangle size={18} color="var(--accent-orange)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-orange)', fontFamily: 'var(--font-display)' }}>
          {count} vault{count > 1 ? 's require' : ' requires'} your attention.
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 6 }}>
          Send a heartbeat to keep your vault active.
        </span>
      </div>
    </div>
  );
}
