'use client';

import { useWallet } from '@/lib/wallet-context';
import { Info } from 'lucide-react';
import { useEffect } from 'react';

export default function DemoBanner() {
  const { isMockMode } = useWallet();

  // Adjust body padding when in demo mode
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const style = document.documentElement.style;
    if (isMockMode) {
      style.setProperty('--demo-banner-height', '40px');
    } else {
      style.setProperty('--demo-banner-height', '0px');
    }

    return () => {
      style.removeProperty('--demo-banner-height');
    };
  }, [isMockMode]);

  if (!isMockMode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 64, // Below navbar
        left: 0,
        right: 0,
        zIndex: 90,
        background: 'linear-gradient(90deg, rgba(249,115,22,0.15), rgba(234,88,12,0.15))',
        borderBottom: '1px solid rgba(249,115,22,0.3)',
        padding: '10px 0',
        backdropFilter: 'blur(10px)',
        height: 40,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Info size={16} color="var(--accent-orange)" />
        <span
          style={{
            color: 'var(--accent-orange)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
          }}
        >
          DEMO MODE: Using mock data - Contract not deployed yet
        </span>
      </div>
    </div>
  );
}