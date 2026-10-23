'use client';

import { useWallet } from '@/lib/wallet-context';
import { X, Loader2, AlertCircle, ExternalLink, Smartphone, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, isConnecting, connected, error, walletEnv } = useWallet();
  const [copiedLink, setCopiedLink] = useState(false);

  const inMobileWalletBrowser =
    walletEnv.isMobile && walletEnv.walletBrowser !== null && walletEnv.hasInjectedProvider;
  const needsWalletBrowser = walletEnv.needsWalletBrowser;
  const walletBrowserLabel =
    walletEnv.walletBrowser === 'xverse'
      ? 'Xverse'
      : walletEnv.walletBrowser === 'leather'
        ? 'Leather'
        : 'wallet app';
  const siteHost = typeof window !== 'undefined' ? window.location.host : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* clipboard unavailable — the URL is still visible below */
    }
  };

  useEffect(() => {
    if (connected && isOpen) onClose();
  }, [connected, isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    await connect();
    // onClose is handled by the useEffect above once connected
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      aria-describedby="wallet-modal-description"
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
          background: 'var(--overlay-bg)',
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
          padding: 'clamp(20px, 5vw, 32px)',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 40px 100px var(--shadow-color)',
          animation: 'fadeInUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2
              id="wallet-modal-title"
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
            <p id="wallet-modal-description" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Connect your Xverse or Leather wallet to create and manage your Bitcoin inheritance vaults.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close wallet connection modal"
            style={{
              background: 'var(--surface-strong)',
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
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
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
                background: 'var(--surface-subtle)',
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

        {/* Mobile browsers without an injected provider can't reach a wallet —
            guide the user into the wallet's in-app browser instead of showing
            the misleading "download your wallet" prompt. */}
        {needsWalletBrowser ? (
          <div
            style={{
              marginBottom: 16,
              padding: '18px 18px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Smartphone size={18} color="var(--accent-orange)" style={{ flexShrink: 0 }} />
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Open this page in your wallet app
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              Your mobile browser can&apos;t reach Xverse or Leather directly. Open this
              link inside the wallet&apos;s built-in browser to connect.
            </p>
            <ol
              style={{
                margin: '0 0 14px 18px',
                padding: 0,
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}
            >
              <li>Open the Xverse or Leather app.</li>
              <li>
                Tap the <strong style={{ color: 'var(--text-primary)' }}>Browser</strong> /{' '}
                <strong style={{ color: 'var(--text-primary)' }}>Discover</strong> tab.
              </li>
              <li>Visit the link below.</li>
            </ol>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            >
              <code
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {siteHost}
              </code>
              <button
                type="button"
                onClick={copyLink}
                aria-live="polite"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }}>
              Don&apos;t have a wallet yet?{' '}
              <a
                href="https://www.xverse.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-orange)' }}
              >
                Get Xverse
              </a>
              {' · '}
              <a
                href="https://leather.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-orange)' }}
              >
                Get Leather
              </a>
            </p>
          </div>
        ) : (
          <>
            {/* In-app browser detection — connect works without a download step. */}
            {inMobileWalletBrowser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 10,
                  marginBottom: 16,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <Check size={15} color="#22C55E" style={{ flexShrink: 0 }} />
                <span>
                  {walletBrowserLabel} browser detected — tap Connect Wallet to continue.
                </span>
              </div>
            )}

            {/* Connect button — triggers @stacks/connect unified wallet selector */}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="btn-primary"
              aria-label={isConnecting ? "Connecting to wallet..." : "Connect wallet to LastSats"}
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
          </>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
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
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
