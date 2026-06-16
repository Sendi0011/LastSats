'use client';

/**
 * Wallet context — real Xverse + Leather connect via @stacks/connect v8
 *
 * @stacks/connect v8 API used:
 *   connect()          — opens wallet selector (Xverse, Leather, etc.)
 *   disconnect()       — clears persisted session
 *   isConnected()      — checks if a session exists in localStorage
 *   getLocalStorage()  — returns { addresses: { stx, btc } } from cache
 *
 * sBTC balance is read directly from chain via SIP-010 get-balance.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  connect,
  disconnect as stacksDisconnect,
  isConnected,
  getLocalStorage,
} from '@stacks/connect';
import { fetchSbtcBalance, fetchStxBalance, IS_MOCK_MODE } from './stacks';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WalletType = 'xverse' | 'leather' | 'unknown' | null;

interface WalletState {
  connected: boolean;
  stxAddress: string | null;
  btcAddress: string | null;
  walletType: WalletType;
  sbtcBalance: number;
  stxBalance: number;
  /** true while balances are being fetched from chain */
  loadingBalances: boolean;
  /** true when using mock data instead of real blockchain data */
  isMockMode: boolean;
  /** error message if balance fetching fails */
  balanceError: string | null;
}

interface WalletContextType extends WalletState {
  /** Opens the @stacks/connect wallet selector */
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Re-fetch on-chain balances manually */
  refreshBalances: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | null>(null);

const EMPTY_STATE: WalletState = {
  connected: false,
  stxAddress: null,
  btcAddress: null,
  walletType: null,
  sbtcBalance: 0,
  stxBalance: 0,
  loadingBalances: false,
  isMockMode: IS_MOCK_MODE,
  balanceError: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Detect wallet type from the user-agent / installed extensions.
 * @stacks/connect v8 doesn't expose which wallet was chosen, so we
 * sniff window globals that each wallet injects.
 */
function detectWalletType(): WalletType {
  if (typeof window === 'undefined') return null;
  // Xverse injects window.XverseProviders or window.BitcoinProvider
  if ((window as any).XverseProviders || (window as any).xverse) return 'xverse';
  // Leather (formerly Hiro Wallet) injects window.LeatherProvider or window.StacksProvider
  if ((window as any).LeatherProvider || (window as any).leather) return 'leather';
  // Fallback — connected but type unknown
  return 'unknown';
}

/**
 * Pull addresses from @stacks/connect localStorage cache.
 */
function getAddressesFromCache(): { stxAddress: string | null; btcAddress: string | null } {
  if (typeof window === 'undefined') {
    return { stxAddress: null, btcAddress: null };
  }
  
  try {
    const data = getLocalStorage();
    const stxAddress = data?.addresses?.stx?.[0]?.address ?? null;
    const btcAddress = data?.addresses?.btc?.[0]?.address ?? null;
    return { stxAddress, btcAddress };
  } catch {
    return { stxAddress: null, btcAddress: null };
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(EMPTY_STATE);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Prevent duplicate balance fetches
  const fetchingRef = useRef(false);

  // ── Balance fetcher ─────────────────────────────────────────────────────────

  const fetchBalances = useCallback(async (stxAddress: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setState((s) => ({ ...s, loadingBalances: true, balanceError: null }));
    try {
      const [sbtc, stx] = await Promise.all([
        fetchSbtcBalance(stxAddress),
        fetchStxBalance(stxAddress),
      ]);
      setState((s) => ({
        ...s,
        sbtcBalance: sbtc,
        stxBalance: stx,
        loadingBalances: false,
        balanceError: null,
      }));
    } catch (error) {
      setState((s) => ({ 
        ...s, 
        loadingBalances: false,
        balanceError: error instanceof Error ? error.message : 'Failed to fetch balances'
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // ── Restore session on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let isMounted = true;
    
    try {
      if (!isConnected()) return;

      const { stxAddress, btcAddress } = getAddressesFromCache();
      if (!stxAddress || !isMounted) return;

      const walletType = detectWalletType();
      setState({
        connected: true,
        stxAddress,
        btcAddress,
        walletType,
        sbtcBalance: 0,
        stxBalance: 0,
        loadingBalances: true,
        isMockMode: IS_MOCK_MODE,
      });

      fetchBalances(stxAddress);
    } catch (error) {
      console.warn('Failed to restore wallet session:', error);
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchBalances]);

  // ── Connect ─────────────────────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Opens the @stacks/connect wallet selector UI (Xverse, Leather, etc.)
      const response = await connect();

      // v8 returns { addresses: { stx: [...], btc: [...] } }
      const stxAddress =
        (response?.addresses as any)?.stx?.[0]?.address ?? getAddressesFromCache().stxAddress;
      const btcAddress =
        (response?.addresses as any)?.btc?.[0]?.address ?? getAddressesFromCache().btcAddress;

      if (!stxAddress) throw new Error('No Stacks address returned from wallet.');

      const walletType = detectWalletType();

      setState({
        connected: true,
        stxAddress,
        btcAddress: btcAddress ?? null,
        walletType,
        sbtcBalance: 0,
        stxBalance: 0,
        loadingBalances: true,
        isMockMode: IS_MOCK_MODE,
      });

      // Fetch real on-chain balances after connecting
      fetchBalances(stxAddress);
    } catch (err: any) {
      const msg: string = err?.message ?? 'Connection failed.';
      // User closed the modal — not a real error
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('closed')) {
        setError(msg);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [fetchBalances]);

  // ── Disconnect ──────────────────────────────────────────────────────────────

  const handleDisconnect = useCallback(() => {
    stacksDisconnect();
    setState(EMPTY_STATE);
    setError(null);
  }, []);

  // ── Manual balance refresh ──────────────────────────────────────────────────

  const refreshBalances = useCallback(async () => {
    if (state.stxAddress) await fetchBalances(state.stxAddress);
  }, [state.stxAddress, fetchBalances]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect: handleConnect,
        disconnect: handleDisconnect,
        refreshBalances,
        isConnecting,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
