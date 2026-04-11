'use client';

import { useWallet } from '@/lib/wallet-context';
import { X, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, isConnecting, connected, error } = useWallet();

  // Auto-close once connected
  useEffect(() => {
    if (connected && isOpen) onClose();
  }, [connected, isOpen, onClose]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    await connect();
    // onClose is handled by the useEffect above once connected
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
              Connect your Xverse or Leather wallet to create and manage your Bitcoin inheritance vaults.
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

        {/* Supported wallets info */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            {
              name: 'Xverse',
              desc: 'Bitcoin & Stacks',
              icon: (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect width="36" height="36" rx="10" fill="#1A1A2E"/>
                  <path d="M8 10h8l4 8-4 8H8l4-8-4-8z" fill="#7C3AED"/>
                  <path d="M20 10h8l-4 8 4 8h-8l4-8-4-8z" fill="#A78BFA"/>
                </svg>
              ),
            },
            {
              name: 'Leather',
              desc: 'Bitcoin-native DeFi',
              icon: (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect width="36" height="36" rx="10" fill="#1C1200"/>
                  <rect x="8" y="14" width="20" height="14" rx="3" fill="#D97706"/>
                  <rect x="12" y="10" width="12" height="6" rx="2" fill="#B45309"/>
                  <circle cx="18" cy="21" r="2.5" fill="#1C1200"/>
                </svg>
              ),
            },
          ].map((w) => (
            <div
              key={w.name}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              {w.icon}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{w.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Connect button — triggers @stacks/connect unified wallet selector */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '14px 24px',
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 16,
            opacity: isConnecting ? 0.8 : 1,
          }}
        >
          {isConnecting ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Connecting...
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>

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
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, color: '#EF4444', lineHeight: 1.5, marginBottom: 4 }}>{error}</p>
              <a
                href="https://www.xverse.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#EF4444', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                Get Xverse <ExternalLink size={11} />
              </a>
              {' · '}
              <a
                href="https://leather.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#EF4444', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                Get Leather <ExternalLink size={11} />
              </a>
            </div>
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
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
