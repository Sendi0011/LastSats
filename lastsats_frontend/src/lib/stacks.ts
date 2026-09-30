/**
 * Stacks chain utilities — network config, balance reads
 */
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import {
  fetchCallReadOnlyFunction,
  principalCV,
  uintCV,
  noneCV,
  someCV,
  PostConditionMode,
} from '@stacks/transactions';


/**
 * Recursively decode a ClarityValue into plain JS.
 *
 * `fetchCallReadOnlyFunction` returns `ClarityValue` objects, and `cvToValue`
 * only converts the outermost layer — every nested field stays wrapped as
 * `{ type, value }`. Reading `raw['sbtc-amount']` on that yields `undefined`,
 * which silently produced vaults with no amount/status. This walks the tree and
 * returns real values (uint/int -> number, bool -> boolean, principal/string ->
 * string, none -> null).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cvToPlain(cv: unknown): any {
  if (cv === null || cv === undefined) return null;

  // Already a primitive.
  if (typeof cv !== 'object') return cv;

  // ClarityValue wrapper: { type, value }. Note `false`/`none` serialize WITHOUT
  // a `value` key (`{type:'false'}`), so type-only cases must be handled before
  // the generic recursion — otherwise they become truthy objects.
  if ('type' in cv) {
    const type = String(cv.type);

    if (type === 'true') return true;
    if (type === 'false') return false;
    if (type === 'none') return null;

    if (!('value' in cv)) return null;
    const value = cv.value;

    if (value === null || value === undefined) return null;

    // `(optional none)` -> null ; `(optional T)` -> decoded inner
    if (type.includes('optional')) return cvToPlain(value);

    if (type.startsWith('uint') || type.startsWith('int')) {
      return Number(value);
    }

    if (type === 'principal' || type === 'address') return String(value);
    if (type.startsWith('string-ascii') || type.startsWith('string-utf8')) {
      return String(value);
    }
    if (type === 'buff') return value;
    if (type.startsWith('tuple')) return cvToPlain(value);
    if (type.startsWith('list')) {
      return Array.isArray(value) ? value.map(cvToPlain) : [];
    }
    if (type.startsWith('response')) return cvToPlain(value);

    // Unknown type — try to recurse anyway.
    return cvToPlain(value);
  }

  // Plain array / object (e.g. already unwrapped).
  if (Array.isArray(cv)) return cv.map(cvToPlain);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cv)) out[k] = cvToPlain(v);
  return out;
}
import { openContractCall } from '@stacks/connect';
import type { VaultStatus } from '@/types/vault';

// ── Network ───────────────────────────────────────────────────────────────────

export const IS_MAINNET = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STACKS_NETWORK !== 'testnet';
export const STACKS_NETWORK = IS_MAINNET ? STACKS_MAINNET : STACKS_TESTNET;

// ── Contract addresses ────────────────────────────────────────────────────────

// sBTC SIP-010 token — network-aware (different address on mainnet vs testnet).
// On testnet this points at the local sbtc-mock-token test contract, because the
// real testnet sBTC faucet is exhausted and vault lifecycle testing needs funds.
export const SBTC_CONTRACT_ADDRESS = IS_MAINNET
  ? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4'
  : 'ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2';
export const SBTC_CONTRACT_NAME = IS_MAINNET ? 'sbtc-token' : 'sbtc-mock-token';

// Fungible-token asset name (the `::asset` suffix used by the Hiro API).
export const SBTC_ASSET_NAME = IS_MAINNET ? 'sbtc-token' : 'sbtc-mock-token';

// LastSats contract address from environment
const LASTSATS_CONTRACT_ENV = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS : undefined;

/**
 * Validate and parse a Stacks contract address
 * Format: SP/ST + 39 chars + . + contract-name
 * Validates and returns the contract address from environment
 */
function validateContractAddress(address: string | undefined): string {
  if (!address) {
    throw new Error(
      'NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS is not set. ' +
      'Required for production. Example: STCHTPYB58PW0W8N44PPES2KFGHCZXFWZS23JPYJ.lastsats-vault'
    );
  }
  
  const principalRegex = /^(SP|ST)[0-9A-HJKMNP-TV-Z]{38,40}$/;
  const parts = address.split('.');
  
  if (parts.length !== 2) {
    throw new Error(`Invalid contract address format: ${address}. Expected format: SP1234...ABCD.contract-name`);
  }
  
  const [principal, contractName] = parts;
  
  if (!principalRegex.test(principal)) {
    throw new Error(`Invalid Stacks principal: ${principal}. Must start with SP/ST and be 40-42 characters total`);
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

    const raw = cvToPlain(result);
    // SIP-010 get-balance returns (ok uint), which cvToPlain unwraps to a number.
    // Accept the other shapes defensively so this never throws into the REST fallback.
    const micro: bigint =
      typeof raw === 'bigint'
        ? raw
        : typeof raw === 'number'
        ? BigInt(raw)
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
    const key = `${SBTC_CONTRACT_ADDRESS}.${SBTC_CONTRACT_NAME}::${SBTC_ASSET_NAME}`;
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

/** Fetch raw vault data. Returns null if vault doesn't exist. */
export async function fetchRawVault(
  vaultId: number,
  userAddress: string,
): Promise<any | null> {

  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-vault',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    return cvToPlain(result);
  } catch (error) {
    console.warn(`Failed to fetch vault ${vaultId}:`, error);
    return null;
  }
}

/** Fetch computed vault status uint. Returns null if vault doesn't exist. */
export async function fetchRawVaultStatus(
  vaultId: number,
  userAddress: string,
): Promise<number | null> {

  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-vault-status',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    const raw = cvToPlain(result);
    return raw != null ? Number(raw) : null;
  } catch (error) {
    console.warn(`Failed to fetch vault status ${vaultId}:`, error);
    return null;
  }
}

/** Fetch beneficiary at a given slot. Returns null if slot empty. */
export async function fetchRawBeneficiary(
  vaultId: number,
  index: number,
  userAddress: string,
): Promise<any | null> {

  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-beneficiary',
      functionArgs: [uintCV(vaultId), uintCV(index)],
      senderAddress: userAddress,
    });
    return cvToPlain(result);
  } catch (error) {
    console.warn(`Failed to fetch beneficiary vault=${vaultId} idx=${index}:`, error);
    return null;
  }
}

/** Fetch beneficiary count for a vault. */
export async function fetchBeneficiaryCount(
  vaultId: number,
  userAddress: string,
): Promise<number> {
  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-beneficiary-count',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    const raw = cvToPlain(result);
    const count = raw?.count ?? raw;
    return Number(count ?? 0);
  } catch (error) {
    console.warn(`Failed to fetch beneficiary count vault=${vaultId}:`, error);
    return 0;
  }
}

/** Fetch protocol-level stats. Returns null if not available. */
export async function fetchProtocolStats(
  userAddress: string,
): Promise<{
  totalVaults: number;
  totalSbtcProtected: number;
  nextVaultId: number;
} | null> {

  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-protocol-stats',
      functionArgs: [],
      senderAddress: userAddress,
    });
    const raw = cvToPlain(result);
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

  try {
    const result = await fetchCallReadOnlyFunction({
      network: STACKS_NETWORK,
      contractAddress: LASTSATS_CONTRACT_PRINCIPAL,
      contractName: LASTSATS_CONTRACT_NAME,
      functionName: 'get-blocks-until-deadline',
      functionArgs: [uintCV(vaultId)],
      senderAddress: userAddress,
    });
    const raw = cvToPlain(result);
    return raw != null ? Number(raw) : null;
  } catch (error) {
    console.warn(`Failed to fetch blocks-until-deadline vault=${vaultId}:`, error);
    return null;
  }
}

/**
 * Read the authoritative vault ID a create-vault tx actually produced.
 *
 * The vault ID is assigned by the contract (`next-vault-id` at execution time)
 * and returned as the tx result `(ok uN)`. Guessing it client-side from
 * `get-protocol-stats` is racy — that value is the id for the NEXT vault — so we
 * poll the tx result instead. Returns null if the tx is unknown/failed or the
 * result can't be parsed.
 */
export async function fetchTxResultVaultId(txId: string): Promise<number | null> {
  const id = txId.startsWith('0x') ? txId.slice(2) : txId;
  const url = `${HIRO_API_BASE}/extended/v1/tx/${id}`;

  // The tx is broadcast immediately but may not be indexed yet; retry briefly.
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();

        if (data.tx_status === 'success') {
          const repr = String(data.tx_result?.repr ?? '');
          const m = repr.match(/\(ok\s+u(\d+)\)/);
          if (m) return Number(m[1]);
          return null;
        }
        // Still pending — keep polling.
        if (data.tx_status === 'pending') {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        return null; // failed/aborted
      }
    } catch {
      /* fall through to retry */
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

/**
 * Discover which vault IDs belong to `userAddress` by scanning 1..next-vault-id.
 *
 * The contract has no "get vaults by owner" index, so we probe each id. This
 * keeps the UI honest: vaults created from another browser/device, or before a
 * localStorage wipe, still show up because state comes from chain, not just
 * locally cached ids.
 */
export async function fetchVaultIdsOwnedBy(userAddress: string): Promise<number[]> {
  const stats = await fetchProtocolStats(userAddress);
  if (!stats) return [];

  const maxId = stats.nextVaultId; // ids are 1-based; this is the next free id
  // Bound the scan so a large protocol can't hang the dashboard on N sequential
  // call-reads. Raise alongside `MAX_SCAN` if the protocol outgrows this.
  const MAX_SCAN = 200;
  const upper = Math.min(maxId, MAX_SCAN + 1);

  const ids: number[] = [];
  for (let id = 1; id < upper; id++) {
    const raw = await fetchRawVault(id, userAddress);
    if (raw && raw['owner'] === userAddress) ids.push(id);
  }
  return ids;
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
    // create-vault pulls sBTC from the caller into the vault via
    // `contract-call? SBTC-TOKEN transfer ...`. @stacks/connect defaults to
    // PostConditionMode.Deny, which rejects any asset movement that lacks a
    // matching post-condition — so without this the deposit is always rolled
    // back with:
    //   "Fungible asset ...::... was moved by <caller> but not checked"
    // even though the contract itself returns (ok vault-id).
    //
    // We use PostConditionMode.Allow: this contract legitimately pulls the
    // caller's sBTC into the vault, and a precise fungible post-condition is
    // not reliably constructible with @stacks/transactions v7 (no Pc.standard,
    // and its two post-condition serializers don't round-trip). Allow is the
    // standard pattern for such contract calls. Verified working on testnet.
    postConditionMode: PostConditionMode.Allow,
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
