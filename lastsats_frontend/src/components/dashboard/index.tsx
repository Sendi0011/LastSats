'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet-context';
import { Shield, Plus, Users, Lock, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { useVaults } from '@/lib/useVaults';
import type { Vault } from '@/types/vault';
import StatCard from './StatCard';
import VaultCard from './VaultCard';
import UrgentBanner from './UrgentBanner';
import CreateVaultModal from '@/components/vault/CreateVaultModal';
import VaultDetail from '@/components/vault/VaultDetail';
import { EmptyState } from '@/components/ui';

export default function Dashboard() {
  const { connected, sbtcBalance, stxBalance, loadingBalances, refreshBalances } = useWallet();
  const { vaults, addVault, sendHeartbeat, sendingHeartbeat, totalProtected, urgentVaults } = useVaults();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);

  const urgentCount = urgentVaults.length;

  // Adjust padding based on demo mode
  const topPadding = 64;

  const handleHeartbeat = async (vaultId: string) => {
    await sendHeartbeat(vaultId);
  };

  if (!connected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-primary)' }} className="grid-bg">
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Lock size={28} color="var(--text-muted)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', marginBottom: 12 }}>
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: topPadding }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: 6 }}>
              My Vaults
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {vaults.length} vault{vaults.length !== 1 ? 's' : ''} protecting{' '}
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{totalProtected.toFixed(5)} sBTC</span>
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
                transition: 'all 0.2s' 
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
        <UrgentBanner count={urgentCount} />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 36 }}>
          <StatCard icon={<Shield size={16} />} label="Total Protected" value={`${totalProtected.toFixed(4)} sBTC`} sub="Across all vaults" accent="var(--accent-orange)" />
          <StatCard icon={<TrendingUp size={16} />} label="sBTC Balance" value={loadingBalances ? '···' : `${sbtcBalance.toFixed(4)} sBTC`} sub="In connected wallet" accent="#F59E0B" />
          <StatCard icon={<Zap size={16} />} label="STX Balance" value={loadingBalances ? '···' : `${stxBalance.toFixed(0)} STX`} sub="For gas fees" accent="var(--accent-blue)" />
          <StatCard icon={<Users size={16} />} label="Beneficiaries" value={`${vaults.reduce((sum, v) => sum + v.beneficiaries.length, 0)}`} sub="Protected heirs" accent="var(--accent-green)" />
        </div>

        {/* Vault grid */}
        {vaults.length === 0 ? (
          <EmptyState
            icon={<Shield size={40} />}
            title="No vaults yet"
            description="Create your first vault to start protecting your Bitcoin inheritance."
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ padding: '11px 24px', fontSize: 14 }}>
                <Plus size={16} style={{ display: 'inline', marginRight: 6 }} /> Create First Vault
              </button>
            }
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {vaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault} onClick={() => setSelectedVault(vault)} />
            ))}
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
                transition: 'all 0.2s' 
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
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 11, 
                border: '1px dashed rgba(249,115,22,0.3)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--accent-orange)', 
                opacity: 0.7 
              }}>
                <Plus size={20} />
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                Create New Vault
              </span>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateVaultModal
          onClose={() => setShowCreate(false)}
          onCreated={(vault) => { addVault(vault); setShowCreate(false); }}
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
    </div>
  );
}