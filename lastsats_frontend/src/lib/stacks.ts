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

// LastSats contract address from environment
const LASTSATS_CONTRACT_ENV = process.env.NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS;

/**
 * Validate and parse a Stacks contract address
 * Format: SP/ST + 39 chars + . + contract-name
 * Returns mock address in dev mode when contract address is not set
 */
function validateContractAddress(address: string | undefined): string {
  // Allow mock mode when no contract address is set
  if (!address) {
    console.warn('⚠️  NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS not set - using mock mode');
    return 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.lastsats-vault-mock';
  }
  
  // Basic Stacks principal validation
  const principalRegex = /^(SP|ST)[0-9A-HJKMNP-TV-Z]{39}$/;
  const parts = address.split('.');
  
  if (parts.length !== 2) {
    throw new Error(`Invalid contract address format: ${address}. Expected format: SP1234...ABCD.contract-name`);
  }
  
  const [principal, contractName] = parts;
  
  if (!principalRegex.test(principal)) {
    throw new Error(`Invalid Stacks principal: ${principal}. Must start with SP/ST and be 41 characters total`);
  }
  
  if (!contractName || contractName.length === 0) {
    throw new Error(`Contract name cannot be empty in address: ${address}`);
  }
  
  return address;
}

// Validate contract address on module load
export const LASTSATS_CONTRACT_ADDRESS = validateContractAddress(LASTSATS_CONTRACT_ENV);
export const LASTSATS_CONTRACT_NAME = LASTSATS_CONTRACT_ADDRESS.split('.')[1];

// Mock mode detection
export const IS_MOCK_MODE = !LASTSATS_CONTRACT_ENV || LASTSATS_CONTRACT_ADDRESS.includes('mock');

// Hiro public REST API
export const HIRO_API_BASE = IS_MAINNET
  ? 'https://api.hiro.so'
  : 'https://api.testnet.hiro.so';

// ── sBTC balance ──────────────────────────────────────────────────────────────

/**
 * Read sBTC balance directly from chain via SIP-010 `get-balance`.
 * Falls back to Hiro REST API if the RPC call fails.
 * Returns balance in whole sBTC (micro-sBTC / 1e8).
 * In mock mode, returns simulated balance.
 */
export async function fetchSbtcBalance(stxAddress: string): Promise<number> {
  // Return mock data in mock mode
  if (IS_MOCK_MODE) {
    // Simulate slight delay
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock balance based on address to be consistent
    const addressHash = stxAddress.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return (addressHash % 100) / 100; // Between 0 and 0.99 sBTC
  }

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
 * In mock mode, returns simulated balance.
 */
export async function fetchStxBalance(stxAddress: string): Promise<number> {
  // Return mock data in mock mode
  if (IS_MOCK_MODE) {
    // Simulate slight delay
    await new Promise(resolve => setTimeout(resolve, 200));
    // Mock balance based on address to be consistent
    const addressHash = stxAddress.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return ((addressHash % 1000) + 500) / 10; // Between 50 and 149.9 STX
  }

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
