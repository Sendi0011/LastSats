'use client';

import { Vault, statusColor, statusLabel, daysUntilDeadline, heartbeatProgress } from '@/lib/vault';
import { X, Heart, Users, Clock, Shield, AlertTriangle, Loader2, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import HeartbeatRing from '@/components/dashboard/HeartbeatRing';
import { formatUsd, formatSbtc } from '@/lib/constants';

interface VaultDetailProps {
  vault: Vault;
  onClose: () => void;
  onHeartbeat: () => void;
  isSendingHeartbeat: boolean;
}

export default function VaultDetail({ vault, onClose, onHeartbeat, isSendingHeartbeat }: VaultDetailProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const color = statusColor(vault.status);
  const days = daysUntilDeadline(vault.nextDeadline);
  const progress = heartbeatProgress(vault);
  const isUrgent = vault.status === 'warning' || vault.status === 'grace';

  // Scroll-lock + Escape to close
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={vault.name}
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-bright)',
          width: '100%',
          maxWidth: 480,
          height: '100%',
          overflowY: 'auto',
          boxShadow: '-40px 0 80px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-card)',
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>
                {vault.name}
              </h2>
              <span
                className="badge"
                style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
              >
                {statusLabel(vault.status)}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {vault.id}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '28px' }}>
          {/* Urgent heartbeat CTA */}
          {isUrgent && (
            <div
              style={{
                padding: '20px',
                background: `${color}0F`,
                border: `1px solid ${color}40`,
                borderRadius: 14,
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <AlertTriangle size={20} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Heartbeat Required
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {vault.status === 'grace'
                      ? `Your vault has entered the grace period. Execution will trigger if no heartbeat is received within 30 days.`
                      : `Your heartbeat is due in ${days} days. Sign a transaction to confirm you're alive.`}
                  </p>
                </div>
              </div>
              <button
                onClick={onHeartbeat}
                disabled={isSendingHeartbeat}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSendingHeartbeat ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    Sending Heartbeat...
                  </>
                ) : (
                  <>
                    <Heart size={15} /> Send Heartbeat Now
                  </>
                )}
              </button>
            </div>
          )}

          {/* Heartbeat ring + countdown */}
          <div
            className="card"
            style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}
          >
            <HeartbeatRing progress={progress} status={vault.status} size={90} strokeWidth={6} />

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Next Heartbeat
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 32,
                  fontWeight: 800,
                  color: isUrgent ? color : 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  marginBottom: 4,
                }}
              >
                {days}
                <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>days</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Deadline: {vault.nextDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="progress-track" style={{ marginTop: 12 }}>
                <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
              </div>
            </div>
          </div>

          {/* sBTC Amount */}
          <div
            className="card"
            style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Protected Amount
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {formatSbtc(vault.sbtcAmount)}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>sBTC</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>~USD value</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-green)' }}>
                {formatUsd(vault.sbtcAmount)}
              </div>
            </div>
          </div>

          {/* Beneficiaries */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> Beneficiaries ({vault.beneficiaries.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vault.beneficiaries.map((b) => (
                <div
                  key={b.id}
                  className="card"
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--accent-orange-dim)',
                      border: '1px solid rgba(249,115,22,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--accent-orange)',
                      flexShrink: 0,
                    }}
                  >
                    {b.label.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{b.label}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {b.address}
                    </div>
                    {b.timeLockDays && (
                      <div style={{ fontSize: 11, color: 'var(--accent-blue)', marginTop: 2 }}>
                        🔒 {b.timeLockDays}d time-lock
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--accent-orange)' }}>
                      {b.percentage}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatSbtc(vault.sbtcAmount * b.percentage / 100)} sBTC
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guardian */}
          {vault.guardianAddress && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} /> Guardian
              </h3>
              <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0,
                  }}
                >
                  <Shield size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {vault.guardianAddress}
                  </div>
                </div>
                <button
                  onClick={() => copy(vault.guardianAddress!, 'guardian')}
                  aria-label={copied === 'guardian' ? 'Copied!' : 'Copy guardian address'}
                  title={copied === 'guardian' ? 'Copied!' : 'Copy address'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'guardian' ? 'var(--accent-green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Vault info */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Vault Info
            </h3>
            <div className="card" style={{ padding: '4px 0' }}>
              {[
                ['Heartbeat Interval', `Every ${vault.heartbeatIntervalDays} days`],
                ['Last Heartbeat', vault.lastHeartbeat.toLocaleDateString()],
                ['Created', vault.createdAt.toLocaleDateString()],
                ['Tier', vault.tier.charAt(0).toUpperCase() + vault.tier.slice(1)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {!isUrgent && (
            <button
              onClick={onHeartbeat}
              disabled={isSendingHeartbeat}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isSendingHeartbeat ? (
                <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
              ) : (
                <><Heart size={15} /> Send Early Heartbeat</>
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
