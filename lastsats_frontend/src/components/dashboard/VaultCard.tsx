import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { Vault } from '@/types/vault';
import { statusColor, statusLabel, daysUntilDeadline, heartbeatProgress } from '@/lib/vault';
import HeartbeatRing from './HeartbeatRing';

interface VaultCardProps {
  vault: Vault;
  onClick: () => void;
}

export default function VaultCard({ vault, onClick }: VaultCardProps) {
  const days = daysUntilDeadline(vault.nextDeadline);
  const progress = heartbeatProgress(vault);
  const color = statusColor(vault.status);
  const isUrgent = vault.status === 'warning' || vault.status === 'grace';

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      role="button"
      tabIndex={0}
      aria-label={`Open vault: ${vault.name}`}
      className="card card-hover"
      style={{
        padding: 24, cursor: 'pointer',
        border: isUrgent ? `1px solid ${color}40` : '1px solid var(--border)',
        background: isUrgent ? `${color}08` : 'var(--bg-card)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {isUrgent && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <HeartbeatRing progress={progress} status={vault.status} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
                color: 'var(--text-primary)', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {vault.name}
            </h3>
            <span className="badge" style={{ background: `${color}18`, color, border: `1px solid ${color}28`, flexShrink: 0 }}>
              {statusLabel(vault.status)}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {vault.sbtcAmount.toFixed(5)}{' '}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>sBTC</span>
          </div>
        </div>

        <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
      </div>

      <hr className="divider" style={{ marginBottom: 16 }} />

      <div style={{ display: 'flex', gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Next Heartbeat
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: isUrgent ? color : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {isUrgent && <AlertTriangle size={13} />}
            {days}d remaining
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Beneficiaries
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {vault.beneficiaries.length} {vault.beneficiaries.length === 1 ? 'person' : 'people'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tier
          </div>
          <span
            className={`badge badge-${vault.tier === 'hodler' ? 'orange' : vault.tier === 'whale' ? 'blue' : 'gray'}`}
            style={{ textTransform: 'capitalize', fontSize: 10 }}
          >
            {vault.tier}
          </span>
        </div>
      </div>
    </div>
  );
}
