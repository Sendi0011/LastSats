'use client';

import { useSyncExternalStore } from 'react';

/**
 * Wallet environment detection.
 *
 * Mobile browsers have no injected Stacks provider unless the page is opened
 * inside a wallet's own in-app browser (Xverse, Leather, …). When there is no
 * provider, @stacks/connect falls back to its "download the wallet" branch —
 * even if the wallet is already installed. This helper lets the UI tell the
 * difference and guide the user instead of showing a false download prompt.
 */

export type WalletBrowser = 'xverse' | 'leather' | null;

export interface WalletEnv {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  /** Which wallet's in-app browser we appear to be running in, if detectable. */
  walletBrowser: WalletBrowser;
  /** A Stacks provider is injected (browser extension or wallet dApp browser). */
  hasInjectedProvider: boolean;
  /** Mobile with no injected provider → connecting here would prompt a download. */
  needsWalletBrowser: boolean;
}

export const DEFAULT_WALLET_ENV: WalletEnv = {
  isMobile: false,
  isIOS: false,
  isAndroid: false,
  walletBrowser: null,
  hasInjectedProvider: false,
  needsWalletBrowser: false,
};

const XVERSE_GLOBALS = ['XverseProviders', 'xverse'];
const LEATHER_GLOBALS = ['LeatherProvider', 'leather'];
const INJECTED_GLOBALS = [
  'StacksProvider',
  'HiroWalletProvider',
  ...XVERSE_GLOBALS,
  ...LEATHER_GLOBALS,
];

function hasGlobal(names: string[]): boolean {
  if (typeof window === 'undefined') return false;
  const globals = window as unknown as Record<string, unknown>;
  return names.some((name) => Boolean(globals[name]));
}

let cachedEnv: WalletEnv | null = null;
let cachedSignal = '';

export function getWalletEnv(): WalletEnv {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return DEFAULT_WALLET_ENV;
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const touchPoints = navigator.maxTouchPoints || 0;
  const hasXverse = hasGlobal(XVERSE_GLOBALS);
  const hasLeather = hasGlobal(LEATHER_GLOBALS);
  const hasInjectedProvider = hasGlobal(INJECTED_GLOBALS);

  // getWalletEnv feeds useSyncExternalStore, so repeated calls must return the
  // same object when nothing changed. Cache on the raw signals we read.
  const signal = `${ua}|${platform}|${touchPoints}|${hasXverse}|${hasLeather}|${hasInjectedProvider}`;
  if (cachedEnv && cachedSignal === signal) return cachedEnv;

  // iPadOS 13+ reports a desktop "MacIntel" UA, so fall back to touch points.
  const ipadOS = platform === 'MacIntel' && touchPoints > 1;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || ipadOS;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile|Windows Phone/i.test(ua);

  let walletBrowser: WalletBrowser = null;
  if (hasXverse || /Xverse/i.test(ua)) walletBrowser = 'xverse';
  else if (hasLeather || /Leather/i.test(ua)) walletBrowser = 'leather';

  cachedEnv = {
    isMobile,
    isIOS,
    isAndroid,
    walletBrowser,
    hasInjectedProvider,
    needsWalletBrowser: isMobile && !hasInjectedProvider,
  };
  cachedSignal = signal;
  return cachedEnv;
}

const subscribe = () => () => {};

/**
 * Client hook around getWalletEnv. The server snapshot is the "unknown" default,
 * so hydration matches; React swaps in the detected environment right after.
 */
export function useWalletEnv(): WalletEnv {
  return useSyncExternalStore(subscribe, getWalletEnv, () => DEFAULT_WALLET_ENV);
}
