'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type WalletType = 'xverse' | 'leather' | null;

interface WalletState {
  connected: boolean;
  address: string | null;
  walletType: WalletType;
  btcBalance: number;
  sbtcBalance: number;
  stxBalance: number;
}

interface WalletContextType extends WalletState {
  connect: (type: 'xverse' | 'leather') => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Simulated wallet connection for demo purposes
// In production, replace with real @stacks/connect calls
const MOCK_ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    walletType: null,
    btcBalance: 0,
    sbtcBalance: 0,
    stxBalance: 0,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('lastsats_wallet');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const connect = useCallback(async (type: 'xverse' | 'leather') => {
    setIsConnecting(true);
    try {
      // Simulate wallet handshake delay
      await new Promise(r => setTimeout(r, 1400));
      
      const newState: WalletState = {
        connected: true,
        address: MOCK_ADDRESS,
        walletType: type,
        btcBalance: 0.84721,
        sbtcBalance: 0.42350,
        stxBalance: 12480.5,
      };
      setState(newState);
      sessionStorage.setItem('lastsats_wallet', JSON.stringify(newState));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      walletType: null,
      btcBalance: 0,
      sbtcBalance: 0,
      stxBalance: 0,
    });
    sessionStorage.removeItem('lastsats_wallet');
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, isConnecting }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
