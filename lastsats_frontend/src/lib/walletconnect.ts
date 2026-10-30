'use client';

import { connect, WalletConnect } from '@stacks/connect';

/**
 * WalletConnect / Reown AppKit configuration.
 *
 * Mobile browsers have no injected Stacks provider, so `@stacks/connect` cannot
 * reach an installed wallet directly. WalletConnect is the SDK-supported way to
 * hand the request off to the wallet app and receive the approval back — the
 * same mechanism powers the "open in Xverse/Leather" experience.
 *
 * It needs a free project ID from https://dashboard.reown.com. Until
 * `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set we return an empty options
 * object, so the app keeps working with the injected-provider flow only.
 */

type ConnectOptions = NonNullable<Parameters<typeof connect>[0]>;

const PROJECT_ID = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '').trim();
const IS_MAINNET = process.env.NEXT_PUBLIC_STACKS_NETWORK !== 'testnet';

const APP_NAME = 'LastSats';
const APP_DESCRIPTION = 'Trustless Bitcoin inheritance vaults on Stacks';
const FALLBACK_APP_URL = 'https://lastsats.vercel.app';

/** True when a WalletConnect project ID is configured at build time. */
export const isWalletConnectEnabled = PROJECT_ID.length > 0;

function appUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_APP_URL).replace(/\/$/, '');
}

/**
 * Options passed to both `connect()` and every `request()` call.
 *
 * Passing them to `request()` too is what lets a WalletConnect session keep
 * working after a refresh: the provider is re-initialised from storage before
 * the selected provider is resolved.
 */
export function getWalletConnectConnectOptions(): ConnectOptions {
  if (!isWalletConnectEnabled) return {};

  const url = appUrl();
  const stacks = {
    ...WalletConnect.Networks.Stacks,
    chains: [
      IS_MAINNET ? WalletConnect.Chains.Stacks.Mainnet : WalletConnect.Chains.Stacks.Testnet,
    ],
  };

  return {
    walletConnect: {
      projectId: PROJECT_ID,
      metadata: {
        name: APP_NAME,
        description: APP_DESCRIPTION,
        url,
        icons: [`${url}/icon.png`],
      },
      networks: [stacks],
    },
  };
}
