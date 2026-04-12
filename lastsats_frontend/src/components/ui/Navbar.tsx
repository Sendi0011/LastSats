'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet-context';
import WalletModal from './WalletModal';
import { Shield, ChevronDown, Copy, LogOut, ExternalLink, Menu, X } from 'lucide-react';
import { shortAddress as fmt } from '@/lib/constants';

export default function Navbar() {
  const { connected, stxAddress: address, walletType, disconnect, sbtcBalance, loadingBalances } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortAddr = address ? fmt(address) : '';

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(8,11,20,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(249,115,22,0.4)',
              }}
            >
              <Shield size={16} color="white" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Last<span style={{ color: 'var(--accent-orange)' }}>Sats</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
            }}
            className="hidden-mobile"
          >
            {[
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Docs', href: '#' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {connected ? (
              <>
                <Link
                  href="/dashboard"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(249,115,22,0.1)',
                    border: '1px solid rgba(249,115,22,0.2)',
                    color: 'var(--accent-orange)',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-display)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(249,115,22,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(249,115,22,0.1)';
                  }}
                >
                  Dashboard
                </Link>

                {/* Wallet button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-label="Wallet menu"
                    aria-expanded={showDropdown}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-bright)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-green)',
                        boxShadow: '0 0 6px var(--accent-green)',
                      }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{shortAddr}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {loadingBalances ? '···' : `${sbtcBalance.toFixed(4)} sBTC`}
                    </span>
                    <ChevronDown size={14} color="var(--text-muted)" />
                  </button>

                  {showDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-bright)',
                        borderRadius: 12,
                        padding: 8,
                        minWidth: 200,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 200,
                      }}
                    >
                      <div
                        style={{
                          padding: '8px 12px',
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Connected via {walletType}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {address?.slice(0, 14)}...{address?.slice(-6)}
                        </div>
                      </div>
                      <hr className="divider" style={{ margin: '4px 0' }} />
                      {[
                        { icon: <Copy size={14} />, label: copied ? 'Copied!' : 'Copy Address', action: copyAddress },
                        { icon: <ExternalLink size={14} />, label: 'View on Explorer', action: () => window.open(`https://explorer.hiro.so/address/${address}`, '_blank') },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => { item.action(); setShowDropdown(false); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '9px 12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: 13,
                            borderRadius: 8,
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          {item.icon} {item.label}
                        </button>
                      ))}
                      <hr className="divider" style={{ margin: '4px 0' }} />
                      <button
                        onClick={() => { disconnect(); setShowDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '9px 12px',
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: 13,
                          borderRadius: 8,
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      >
                        <LogOut size={14} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: 14 }}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      <WalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />

      {/* Close dropdown when clicking outside */}
      {showDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 150 }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </>
  );
}
