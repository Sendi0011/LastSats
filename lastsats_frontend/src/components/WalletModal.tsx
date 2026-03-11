'use client';

import { useWallet } from '@/lib/wallet-context';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WALLETS = [
  {
    id: 'xverse' as const,
    name: 'Xverse',
    description: 'The Bitcoin & Stacks Wallet',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="10" fill="#1A1A2E"/>
        <path d="M8 10h8l4 8-4 8H8l4-8-4-8z" fill="#7C3AED"/>
        <path d="M20 10h8l-4 8 4 8h-8l4-8-4-8z" fill="#A78BFA"/>
      </svg>
    ),
    popular: true,
  },
  {
    id: 'leather' as const,
    name: 'Leather',
    description: 'Bitcoin-native DeFi wallet',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="10" fill="#1C1200"/>
        <rect x="8" y="14" width="20" height="14" rx="3" fill="#D97706"/>
        <rect x="12" y="10" width="12" height="6" rx="2" fill="#B45309"/>
        <circle cx="18" cy="21" r="2.5" fill="#1C1200"/>
      </svg>
    ),
    popular: false,
  },
];

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, isConnecting, connected } = useWallet();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (walletId: 'xverse' | 'leather') => {
    setConnecting(walletId);
    setError(null);
    try {
      await connect(walletId);
      onClose();
    } catch (e) {
      setError('Failed to connect. Please make sure your wallet extension is installed.');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-bright)',
          borderRadius: 20,
          padding: 32,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 22,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Connect Your Wallet
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Connect a Stacks-compatible wallet to create and manage your Bitcoin inheritance vaults.
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
              transition: 'all 0.2s',
              flexShrink: 0,
              marginLeft: 16,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Wallet options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {WALLETS.map((wallet) => {
            const isThisConnecting = connecting === wallet.id;
            return (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={!!connecting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  background: isThisConnecting ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isThisConnecting ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
                  borderRadius: 14,
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  opacity: connecting && !isThisConnecting ? 0.5 : 1,
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!connecting) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.borderColor = 'var(--border-bright)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isThisConnecting) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
              >
                <div style={{ flexShrink: 0 }}>{wallet.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                      {wallet.name}
                    </span>
                    {wallet.popular && (
                      <span className="badge badge-orange" style={{ fontSize: 9 }}>Popular</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{wallet.description}</span>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {isThisConnecting ? (
                    <Loader2 size={18} color="var(--accent-orange)" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h6M5 2l3 3-3 3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#EF4444', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* Footer note */}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          By connecting, you agree to our{' '}
          <span style={{ color: 'var(--accent-orange)', cursor: 'pointer' }}>Terms of Service</span>
          {' '}and{' '}
          <span style={{ color: 'var(--accent-orange)', cursor: 'pointer' }}>Privacy Policy</span>.
          <br />LastSats is non-custodial — we never hold your keys.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
