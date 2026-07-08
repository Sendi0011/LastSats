/**
 * Stacks chain utilities — network config, balance reads
 */
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  principalCV,
  uintCV,
  noneCV,
  someCV,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import type { VaultStatus } from '@/types/vault';

// ── Network ───────────────────────────────────────────────────────────────────

export const IS_MAINNET = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STACKS_NETWORK !== 'testnet';
export const STACKS_NETWORK = IS_MAINNET ? STACKS_MAINNET : STACKS_TESTNET;

// ── Contract addresses ────────────────────────────────────────────────────────

// sBTC SIP-010 token — same deployer on mainnet & testnet
export const SBTC_CONTRACT_ADDRESS = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4';
export const SBTC_CONTRACT_NAME = 'sbtc-token';

// LastSats contract address from environment
const LASTSATS_CONTRACT_ENV = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS : undefined;

/**
 * Validate and parse a Stacks contract address
 * Format: SP/ST + 39 chars + . + contract-name
 * Returns mock address in dev mode when contract address is not set
 */
function validateContractAddress(address: string | undefined): string {
  // Allow mock mode when no contract address is set
  if (!address) {
    console.warn('⚠️  LastSats running in mock mode - no contract deployment required');
    console.info('💡 To connect to real contract, set NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS environment variable');
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
export const LASTSATS_CONTRACT_PRINCIPAL = LASTSATS_CONTRACT_ADDRESS.split('.')[0];

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

// ── Contract interaction helpers ─────────────────────────────────────────────

/** Map on-chain status uint (0-5) to frontend VaultStatus */
export const STATUS_FROM_UINT: Record<number, VaultStatus> = {
  0: 'active', 1: 'warning', 2: 'grace',
  3: 'executing', 4: 'complete', 5: 'paused',
};

/** Map on-chain tier uint to tier string */
export const TIER_FROM_UINT: Record<number, 'free' | 'hodler' | 'whale'> = {
  0: 'free', 1: 'hodler', 2: 'whale',
};

/** Map tier string to on-chain uint */
export const TIER_TO_UINT: Record<string, number> = {
  free: 0, hodler: 1, whale: 2,
};

/** Convert whole sBTC → micro-sBTC (1e8) */
export function sbtcToMicro(sbtc: number): bigint {
  return BigInt(Math.round(sbtc * 1e8));
}

/** Convert micro-sBTC → whole sBTC */
export function microToSbtc(micro: number | bigint): number {
  return Number(micro) / 1e8;
}

/** Convert percentage (0–100) → basis points (0–10000) */
export function pctToBasisPoints(pct: number): bigint {
  return BigInt(Math.round(pct * 100));
}

/** Convert basis points → percentage */
export function basisPointsToPct(bps: number | bigint): number {
  return Number(bps) / 100;
}

/** Convert days → Stacks blocks (144 blocks/day) */
export function daysToBlocks(days: number): bigint {
  return BigInt(days * 144);
}

/** Convert blocks → days */
export function blocksToDays(blocks: number | bigint): number {
  return Math.round(Number(blocks) / 144);
}

/** Estimate a Date from a block height and the current block height */
export function estimateDateFromBlock(blockHeight: number, currentBlock: number): Date {
  if (!blockHeight || !currentBlock) return new Date(0);
  const blocksAgo = Math.max(0, currentBlock - blockHeight);
  return new Date(Date.now() - blocksAgo * 10 * 60 * 1000);
}

/** Compute a deadline Date from blocks-remaining */
export function deadlineFromBlocksRemaining(blocksRemaining: number | null): Date {
  if (blocksRemaining == null) return new Date(0);
  return new Date(Date.now() + Number(blocksRemaining) * 10 * 60 * 1000);
}

// ── Read-only contract functions ─────────────────────────────────────────────

/** Fetch current Stacks block height from Hiro API */
export async function fetchCurrentBlockHeight(): Promise<number> {
  try {
    const res = await fetch(`${HIRO_API_BASE}/v2/info`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.stacks_tip_height ?? 0;
  } catch {
    return 0;
  }
}

/** Fetch raw vault data. Returns null if vault doesn't exist or in mock mode. */
export async function fetchRawVault(
  vaultId: number,
  userAddress: string,
): Promise<any | null> {
  if (IS_MOCK_MODE) return null;
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-vault',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    const raw = cvToValue(result);
    return raw ?? null;
  } catch (error) {
    console.warn(`Failed to fetch vault ${vaultId}:`, error);
    return null;
  }
}

/** Fetch computed vault status uint. Returns null in mock mode. */
export async function fetchRawVaultStatus(
  vaultId: number,
  userAddress: string,
): Promise<number | null> {
  if (IS_MOCK_MODE) return null;
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-vault-status',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    const raw = cvToValue(result);
    return raw != null ? Number(raw) : null;
  } catch (error) {
    console.warn(`Failed to fetch vault status ${vaultId}:`, error);
    return null;
  }
}

/** Fetch beneficiary at a given slot. Returns null if slot empty or in mock mode. */
export async function fetchRawBeneficiary(
  vaultId: number,
  index: number,
  userAddress: string,
): Promise<any | null> {
  if (IS_MOCK_MODE) return null;
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-beneficiary',
      functionArgs: [uintCV(vaultId), uintCV(index)],
      senderAddress: userAddress,
    });
    const raw = cvToValue(result);
    return raw ?? null;
  } catch (error) {
    console.warn(`Failed to fetch beneficiary vault=${vaultId} idx=${index}:`, error);
    return null;
  }
}

/** Fetch beneficiary count for a vault. Returns 0 in mock mode. */
export async function fetchBeneficiaryCount(
  vaultId: number,
  userAddress: string,
): Promise<number> {
  if (IS_MOCK_MODE) return 0;
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-beneficiary-count',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    const raw = cvToValue(result);
    const count = raw?.count ?? raw;
    return Number(count ?? 0);
  } catch (error) {
    console.warn(`Failed to fetch beneficiary count vault=${vaultId}:`, error);
    return 0;
  }
}

/** Fetch protocol-level stats. Returns null in mock mode. */
export async function fetchProtocolStats(
  userAddress: string,
): Promise<{
  totalVaults: number;
  totalSbtcProtected: number;
  nextVaultId: number;
} | null> {
  if (IS_MOCK_MODE) return null;
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-protocol-stats',
      functionArgs: [],
      senderAddress: userAddress,
    });
    const raw: any = cvToValue(result);
    if (!raw) return null;
    return {
      totalVaults: Number(raw['total-vaults'] ?? 0),
      totalSbtcProtected: microToSbtc(raw['total-sbtc-protected'] ?? 0),
      nextVaultId: Number(raw['next-vault-id'] ?? 0),
    };
  } catch (error) {
    console.warn('Failed to fetch protocol stats:', error);
    return null;
  }
}

/** Fetch blocks until heartbeat deadline. Returns null if past deadline. */
export async function fetchBlocksUntilDeadline(
  vaultId: number,
  userAddress: string,
): Promise<number | null> {
  if (IS_MOCK_MODE) return null;
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-blocks-until-deadline',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    const raw = cvToValue(result);
    return raw != null ? Number(raw) : null;
  } catch (error) {
    console.warn(`Failed to fetch blocks-until-deadline vault=${vaultId}:`, error);
    return null;
  }
}

/**
 * Convert raw on-chain vault data to a frontend Vault-like shape.
 * Requires the current block height for date estimation.
 * Callers should supplement `name` from localStorage.
 */
export function vaultFromOnchain(
  raw: any,
  vaultId: number,
  currentBlock: number,
  beneficiaries: VaultBeneficiaryOnchain[],
): {
  id: string;
  sbtcAmount: number;
  status: VaultStatus;
  heartbeatIntervalDays: number;
  lastHeartbeat: Date;
  nextDeadline: Date;
  beneficiaries: { address: string; percentage: number; timeLockDays: number }[];
  guardianAddress: string | undefined;
  createdAt: Date;
  tier: 'free' | 'hodler' | 'whale';
} {
  const statusUint = Number(raw['status'] ?? 0);
  const tierUint = Number(raw['tier'] ?? 0);
  const intervalBlocks = Number(raw['heartbeat-interval'] ?? 0);
  const lastHbBlock = Number(raw['last-heartbeat-block'] ?? 0);
  const createdBlock = Number(raw['created-at-block'] ?? 0);
  const guardian: string | undefined = raw['guardian'] ?? undefined;

  const lastHeartbeat = estimateDateFromBlock(lastHbBlock, currentBlock);
  const createdAt = estimateDateFromBlock(createdBlock, currentBlock);
  const deadlineBlock = lastHbBlock + intervalBlocks;
  const nextDeadline = estimateDateFromBlock(deadlineBlock, currentBlock);

  return {
    id: String(vaultId),
    sbtcAmount: microToSbtc(raw['sbtc-amount'] ?? 0),
    status: STATUS_FROM_UINT[statusUint] ?? 'active',
    heartbeatIntervalDays: blocksToDays(intervalBlocks),
    lastHeartbeat,
    nextDeadline,
    beneficiaries: beneficiaries.map((b, i) => ({
      address: b.address,
      percentage: basisPointsToPct(b.percentage),
      timeLockDays: blocksToDays(b.timeLockBlocks),
    })),
    guardianAddress: guardian && guardian !== '' ? guardian : undefined,
    createdAt,
    tier: TIER_FROM_UINT[tierUint] ?? 'free',
  };
}

export interface VaultBeneficiaryOnchain {
  address: string;
  percentage: number;
  timeLockBlocks: number;
  distributed: boolean;
}

/**
 * Fetch all beneficiaries for a vault by iterating slots.
 * Slots beyond the beneficiary count return null.
 */
export async function fetchAllBeneficiaries(
  vaultId: number,
  count: number,
  userAddress: string,
): Promise<VaultBeneficiaryOnchain[]> {
  if (IS_MOCK_MODE) return [];
  const result: VaultBeneficiaryOnchain[] = [];
  for (let i = 0; i < count; i++) {
    const raw = await fetchRawBeneficiary(vaultId, i, userAddress);
    if (raw) {
      result.push({
        address: raw['address'] ?? '',
        percentage: Number(raw['percentage'] ?? 0),
        timeLockBlocks: Number(raw['time-lock-blocks'] ?? 0),
        distributed: raw['distributed'] ?? false,
      });
    }
  }
  return result;
}

// ── Write transaction helpers ────────────────────────────────────────────────

/**
 * Open the wallet to sign a create-vault transaction.
 * The caller handles onFinish/onCancel for tx lifecycle.
 */
export function openCreateVault(options: {
  heartbeatIntervalBlocks: bigint;
  sbtcAmountMicro: bigint;
  tier: bigint;
  guardian?: string;
  onFinish?: (data: any) => void;
  onCancel?: (error?: Error) => void;
}) {
  const { heartbeatIntervalBlocks, sbtcAmountMicro, tier, guardian, onFinish, onCancel } = options;
  const args = [
    uintCV(heartbeatIntervalBlocks),
    uintCV(sbtcAmountMicro),
    uintCV(tier),
    guardian ? someCV(principalCV(guardian)) : noneCV(),
  ];

  openContractCall({
    network: STACKS_NETWORK,
    contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
    contractName: LASTSATS_CONTRACT_NAME,
    functionName: 'create-vault',
    functionArgs: args,
    onFinish,
    onCancel,
  });
}

/** Open the wallet to sign a send-heartbeat transaction. */
export function openSendHeartbeat(options: {
  vaultId: bigint;
  onFinish?: (data: any) => void;
  onCancel?: (error?: Error) => void;
}) {
  openContractCall({
    network: STACKS_NETWORK,
    contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
    contractName: LASTSATS_CONTRACT_NAME,
    functionName: 'send-heartbeat',
    functionArgs: [uintCV(options.vaultId)],
    onFinish: options.onFinish,
    onCancel: options.onCancel,
  });
}

/** Open the wallet to sign an add-beneficiary transaction. */
export function openAddBeneficiary(options: {
  vaultId: bigint;
  beneficiaryAddress: string;
  percentage: bigint;
  timeLockBlocks: bigint;
  onFinish?: (data: any) => void;
  onCancel?: (error?: Error) => void;
}) {
  const { vaultId, beneficiaryAddress, percentage, timeLockBlocks, onFinish, onCancel } = options;
  openContractCall({
    network: STACKS_NETWORK,
    contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
    contractName: LASTSATS_CONTRACT_NAME,
    functionName: 'add-beneficiary',
    functionArgs: [
      uintCV(vaultId),
      principalCV(beneficiaryAddress),
      uintCV(percentage),
      uintCV(timeLockBlocks),
    ],
    onFinish,
    onCancel,
  });
}

/** Open the wallet to sign a finalize-beneficiaries transaction. */
export function openFinalizeBeneficiaries(options: {
  vaultId: bigint;
  onFinish?: (data: any) => void;
  onCancel?: (error?: Error) => void;
}) {
  openContractCall({
    network: STACKS_NETWORK,
    contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
    contractName: LASTSATS_CONTRACT_NAME,
    functionName: 'finalize-beneficiaries',
    functionArgs: [uintCV(options.vaultId)],
    onFinish: options.onFinish,
    onCancel: options.onCancel,
  });
}
