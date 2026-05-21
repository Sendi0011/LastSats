/**
 * Stacks chain utilities — network config, balance reads
 */
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  principalCV,
} from '@stacks/transactions';

// ── Network ───────────────────────────────────────────────────────────────────

export const IS_MAINNET = process.env.NEXT_PUBLIC_STACKS_NETWORK !== 'testnet';
export const STACKS_NETWORK = IS_MAINNET ? STACKS_MAINNET : STACKS_TESTNET;

// ── Contract addresses ────────────────────────────────────────────────────────

// sBTC SIP-010 token — same deployer on mainnet & testnet
export const SBTC_CONTRACT_ADDRESS = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4';
export const SBTC_CONTRACT_NAME = 'sbtc-token';

// Hiro public REST API
export const HIRO_API_BASE = IS_MAINNET
  ? 'https://api.hiro.so'
  : 'https://api.testnet.hiro.so';

// ── sBTC balance ──────────────────────────────────────────────────────────────

/**
 * Read sBTC balance directly from chain via SIP-010 `get-balance`.
 * Falls back to Hiro REST API if the RPC call fails.
 * Returns balance in whole sBTC (micro-sBTC / 1e8).
 */
export async function fetchSbtcBalance(stxAddress: string): Promise<number> {
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: SBTC_CONTRACT_ADDRESS,
      contractName: SBTC_CONTRACT_NAME,
      functionName: 'get-balance',
      functionArgs: [principalCV(stxAddress)],
      senderAddress: stxAddress,
    });

    const raw = cvToValue(result);
    // SIP-010 get-balance returns (ok uint); cvToValue unwraps to bigint or { value }
    const micro: bigint =
      typeof raw === 'bigint'
        ? raw
        : typeof raw?.value === 'bigint'
        ? raw.value
        : BigInt(raw?.value ?? raw ?? 0);

    return Number(micro) / 1e8;
  } catch (error) {
    console.warn('Direct contract call failed, falling back to REST API:', error);
    return fetchSbtcBalanceRest(stxAddress);
  }
}

/**
 * Fallback: Hiro REST API fungible token balances endpoint.
 * GET /extended/v1/address/{addr}/balances
 */
async function fetchSbtcBalanceRest(stxAddress: string): Promise<number> {
  try {
    const res = await fetch(
      `${HIRO_API_BASE}/extended/v1/address/${stxAddress}/balances`
    );
    
    if (!res.ok) {
      console.error(`Hiro API error: ${res.status} ${res.statusText}`);
      return 0;
    }

    const data = await res.json();
    // The key format used by the Hiro API for fungible tokens
    const key = `${SBTC_CONTRACT_ADDRESS}.${SBTC_CONTRACT_NAME}::sbtc-token`;
    const entry = data?.fungible_tokens?.[key];
    return entry ? Number(entry.balance) / 1e8 : 0;
  } catch (error) {
    console.error('Failed to fetch sBTC balance from REST API:', error);
    return 0;
  }
}

// ── STX balance ───────────────────────────────────────────────────────────────

/**
 * Fetch STX balance from Hiro REST API.
 * Returns balance in whole STX (micro-STX / 1e6).
 */
export async function fetchStxBalance(stxAddress: string): Promise<number> {
  try {
    const res = await fetch(
      `${HIRO_API_BASE}/extended/v1/address/${stxAddress}/balances`
    );
    
    if (!res.ok) {
      console.error(`Hiro API error fetching STX balance: ${res.status} ${res.statusText}`);
      return 0;
    }
    
    const data = await res.json();
    return Number(data?.stx?.balance ?? 0) / 1e6;
  } catch (error) {
    console.error('Failed to fetch STX balance:', error);
    return 0;
  }
}
