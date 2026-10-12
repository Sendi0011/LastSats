'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet-context';
import WalletModal from './WalletModal';
import Logo from './Logo';
import { ChevronDown, Copy, LogOut, ExternalLink, Menu, X, Sun, Moon, Check } from 'lucide-react';
import { shortAddress as fmt } from '@/lib/constants';
import { useTheme } from '@/lib/theme-context';

export default function Navbar() {
  const { connected, stxAddress: address, walletType, disconnect, sbtcBalance, loadingBalances } = useWallet();
  const { toggleTheme } = useTheme();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const shortAddr = address ? fmt(address) : '';

  // Close dropdown on Escape
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDropdown(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showDropdown]);

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
        className="navbar-surface"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 var(--pad-x)',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link href="/" aria-label="LastSats home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo variant="lockup" height={30} priority />
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
                role="menuitem"
                aria-label={`Navigate to ${item.label} section`}
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
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title="Toggle theme"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: 6,
                borderRadius: 8,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <Sun size={18} className="theme-icon-dark" />
              <Moon size={18} className="theme-icon-light" />
            </button>

            {/* Mobile hamburger */}
            <button
              className="show-mobile"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 4 }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            {connected ? (
              <>
                <Link
                  href="/dashboard"
                  role="button"
                  aria-label="Go to dashboard"
                  className="hidden-mobile"
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
                    aria-label={`Wallet menu for ${shortAddr}. ${sbtcBalance.toFixed(4)} sBTC balance`}
                    aria-expanded={showDropdown}
                    aria-haspopup="menu"
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
                    <span className="hidden-mobile" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {loadingBalances ? '···' : `${sbtcBalance.toFixed(4)} sBTC`}
                    </span>
                    <ChevronDown size={14} color="var(--text-muted)" />
                  </button>

                  {showDropdown && (
                    <div
                      role="menu"
                      aria-label="Wallet actions"
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
                        boxShadow: '0 20px 60px var(--shadow-color)',
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
                          role="menuitem"
                          aria-label={item.label}
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
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          {item.icon} {item.label}
                        </button>
                      ))}
                      <hr className="divider" style={{ margin: '4px 0' }} />
                      <button
                        onClick={() => { disconnect(); setShowDropdown(false); }}
                        role="menuitem"
                        aria-label="Disconnect wallet"
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
                className="btn-primary nav-cta"
                aria-label="Connect your wallet to LastSats"
                style={{ padding: '9px 20px', fontSize: 14 }}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      <WalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />

      {/* Mobile nav menu */}
      {mobileOpen && (
        <div
          className="show-mobile"
          style={{
            position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
            background: 'var(--glass-bg-strong)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 24px 24px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          {[
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'Docs', href: '#' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 16, fontWeight: 500, padding: '12px 0', borderBottom: '1px solid var(--border)' }}
            >
              {item.label}
            </a>
          ))}
          {connected && address && (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                style={{ color: 'var(--accent-orange)', textDecoration: 'none', fontSize: 16, fontWeight: 600, padding: '12px 0', borderBottom: '1px solid var(--border)' }}
              >
                Dashboard
              </Link>
              <div
                style={{
                  padding: '12px 0 4px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 4,
                  }}
                >
                  Wallet · {walletType}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 8,
                  }}
                >
                  {address.slice(0, 10)}...{address.slice(-6)}
                </div>
                {[
                  {
                    icon: copied ? <Check size={14} /> : <Copy size={14} />,
                    label: copied ? 'Copied!' : 'Copy Address',
                    action: copyAddress,
                  },
                  {
                    icon: <ExternalLink size={14} />,
                    label: 'View on Explorer',
                    action: () => window.open(`https://explorer.hiro.so/address/${address}`, '_blank'),
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setMobileOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      padding: '8px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    disconnect();
                    setMobileOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-red)',
                    fontSize: 14,
                    padding: '8px 0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={14} /> Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
