'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet-context';
import {
  Shield, Plus, Clock, Users, AlertTriangle, CheckCircle,
  ChevronRight, Heart, Zap, TrendingUp, Lock, Settings,
  ArrowUpRight, Info, X, Loader2
} from 'lucide-react';
import {
  MOCK_VAULTS,
  Vault,
  VaultStatus,
  statusColor,
  statusLabel,
  daysUntilDeadline,
  heartbeatProgress,
} from '@/lib/vault';
import CreateVaultModal from './CreateVaultModal';
import VaultDetail from './VaultDetail';

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: `${accent || 'var(--accent-orange)'}18`,
            border: `1px solid ${accent || 'var(--accent-orange)'}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent || 'var(--accent-orange)',
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

function HeartbeatRing({ progress, status }: { progress: number; status: VaultStatus }) {
  const color = statusColor(status);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Heart
          size={18}
          color={color}
          fill={status === 'warning' || status === 'grace' ? color : 'none'}
        />
      </div>
    </div>
  );
}

function VaultCard({ vault, onClick }: { vault: Vault; onClick: () => void }) {
  const days = daysUntilDeadline(vault.nextDeadline);
  const progress = heartbeatProgress(vault);
  const color = statusColor(vault.status);
  const isUrgent = vault.status === 'warning' || vault.status === 'grace';

  return (
    <div
      onClick={onClick}
      className="card card-hover"
      style={{
        padding: 24,
        cursor: 'pointer',
        border: isUrgent
          ? `1px solid ${color}40`
          : '1px solid var(--border)',
        background: isUrgent ? `${color}08` : 'var(--bg-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isUrgent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, ${color}, transparent)`,
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <HeartbeatRing progress={progress} status={vault.status} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 17,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {vault.name}
            </h3>
            <span
              className="badge"
              style={{
                background: `${color}18`,
                color: color,
                border: `1px solid ${color}28`,
                flexShrink: 0,
              }}
            >
              {statusLabel(vault.status)}
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
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
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isUrgent ? color : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
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

export default function Dashboard() {
  const { connected, stxAddress, sbtcBalance, stxBalance, loadingBalances, refreshBalances } = useWallet();
  const [vaults, setVaults] = useState<Vault[]>(MOCK_VAULTS);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [sendingHeartbeat, setSendingHeartbeat] = useState<string | null>(null);

  if (!connected) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg-primary)',
        }}
        className="grid-bg"
      >
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Lock size={28} color="var(--text-muted)" />
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 24,
              color: 'var(--text-primary)',
              marginBottom: 12,
            }}
          >
            Connect your wallet
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
            Connect your Xverse or Leather wallet to access your LastSats dashboard.
          </p>
          <Link href="/" className="btn-primary" style={{ padding: '13px 28px', fontSize: 14, display: 'inline-block', textDecoration: 'none' }}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const totalProtected = vaults.reduce((sum, v) => sum + v.sbtcAmount, 0);
  const urgentCount = vaults.filter((v) => v.status === 'warning' || v.status === 'grace').length;

  const handleHeartbeat = async (vaultId: string) => {
    setSendingHeartbeat(vaultId);
    await new Promise((r) => setTimeout(r, 1800));
    setVaults((prev) =>
      prev.map((v) =>
        v.id === vaultId
          ? {
              ...v,
              status: 'active' as VaultStatus,
              lastHeartbeat: new Date(),
              nextDeadline: new Date(Date.now() + v.heartbeatIntervalDays * 24 * 60 * 60 * 1000),
            }
          : v
      )
    );
    setSendingHeartbeat(null);
    if (selectedVault?.id === vaultId) {
      setSelectedVault(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 36,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 30,
                color: 'var(--text-primary)',
                letterSpacing: '-0.025em',
                marginBottom: 6,
              }}
            >
              My Vaults
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {vaults.length} vault{vaults.length !== 1 ? 's' : ''} protecting{' '}
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>
                {totalProtected.toFixed(5)} sBTC
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={refreshBalances}
              disabled={loadingBalances}
              title="Refresh on-chain balances"
              style={{
                padding: '11px 14px',
                borderRadius: 10,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-bright)',
                color: loadingBalances ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: loadingBalances ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                transition: 'all 0.2s',
              }}
            >
              <TrendingUp size={15} style={{ animation: loadingBalances ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary"
              style={{ padding: '11px 22px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={16} /> New Vault
            </button>
          </div>
        </div>

        {/* Urgent alert */}
        {urgentCount > 0 && (
          <div
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
                {urgentCount} vault{urgentCount > 1 ? 's require' : ' requires'} your attention.
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 6 }}>
                Send a heartbeat to keep your vault active.
              </span>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 36,
          }}
        >
          <StatCard icon={<Shield size={16} />} label="Total Protected" value={`${totalProtected.toFixed(4)} sBTC`} sub="Across all vaults" accent="var(--accent-orange)" />
          <StatCard icon={<TrendingUp size={16} />} label="sBTC Balance" value={loadingBalances ? '···' : `${sbtcBalance.toFixed(4)} sBTC`} sub="In connected wallet" accent="#F59E0B" />
          <StatCard icon={<Zap size={16} />} label="STX Balance" value={loadingBalances ? '···' : `${stxBalance.toFixed(0)} STX`} sub="For gas fees" accent="var(--accent-blue)" />
          <StatCard icon={<Users size={16} />} label="Beneficiaries" value={`${vaults.reduce((sum, v) => sum + v.beneficiaries.length, 0)}`} sub="Protected heirs" accent="var(--accent-green)" />
        </div>

        {/* Vaults grid */}
        {vaults.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '64px 32px',
              textAlign: 'center',
            }}
          >
            <Shield size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 18,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              No vaults yet
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Create your first vault to start protecting your Bitcoin inheritance.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary"
              style={{ padding: '11px 24px', fontSize: 14 }}
            >
              <Plus size={16} style={{ display: 'inline', marginRight: 6 }} />
              Create First Vault
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16,
            }}
          >
            {vaults.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                onClick={() => setSelectedVault(vault)}
              />
            ))}

            {/* Add vault card */}
            <div
              onClick={() => setShowCreate(true)}
              className="card"
              style={{
                padding: 24,
                cursor: 'pointer',
                border: '1px dashed var(--border-bright)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                minHeight: 200,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)';
                e.currentTarget.style.background = 'rgba(249,115,22,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-bright)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  border: '1px dashed rgba(249,115,22,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-orange)',
                  opacity: 0.7,
                }}
              >
                <Plus size={20} />
              </div>
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                }}
              >
                Create New Vault
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateVaultModal
          onClose={() => setShowCreate(false)}
          onCreated={(vault) => {
            setVaults((prev) => [vault, ...prev]);
            setShowCreate(false);
          }}
          sbtcBalance={sbtcBalance}
        />
      )}

      {selectedVault && (
        <VaultDetail
          vault={selectedVault}
          onClose={() => setSelectedVault(null)}
          onHeartbeat={() => handleHeartbeat(selectedVault.id)}
          isSendingHeartbeat={sendingHeartbeat === selectedVault.id}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
