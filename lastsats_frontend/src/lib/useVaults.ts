import { useState, useCallback, useEffect } from 'react';
import { MOCK_VAULTS, isVaultUrgent } from './vault';
import { useWallet } from './wallet-context';
import {
  IS_MOCK_MODE,
  fetchRawVault,
  fetchAllBeneficiaries,
  fetchBeneficiaryCount,
  fetchCurrentBlockHeight,
  vaultFromOnchain,
  openSendHeartbeat,
} from './stacks';
import type { Vault, VaultStatus } from '@/types/vault';

const VAULT_IDS_KEY = 'lastsats-vault-ids';
const VAULT_NAMES_KEY = 'lastsats-vault-names';

function getSavedVaultIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist a vault ID so we know to fetch it later. */
export function saveVaultId(id: number) {
  const ids = getSavedVaultIds();
  if (!ids.includes(id)) {
    localStorage.setItem(VAULT_IDS_KEY, JSON.stringify([...ids, id]));
  }
}

/** Get a user-assigned vault name from localStorage. */
export function getVaultName(vaultId: string): string {
  if (typeof window === 'undefined') return `Vault #${vaultId}`;
  try {
    const raw = localStorage.getItem(VAULT_NAMES_KEY);
    const names = raw ? JSON.parse(raw) : {};
    return names[vaultId] || `Vault #${vaultId}`;
  } catch {
    return `Vault #${vaultId}`;
  }
}

/** Store a user-assigned vault name in localStorage. */
export function setVaultName(vaultId: string, name: string) {
  try {
    const raw = localStorage.getItem(VAULT_NAMES_KEY);
    const names = raw ? JSON.parse(raw) : {};
    names[vaultId] = name;
    localStorage.setItem(VAULT_NAMES_KEY, JSON.stringify(names));
  } catch {}
}

/** Determine beneficiary label from localStorage or fall back to index-based name. */
function getBeneficiaryLabel(vaultId: string, index: number): string {
  if (typeof window === 'undefined') return `Beneficiary ${index + 1}`;
  try {
    const raw = localStorage.getItem('lastsats-beneficiary-labels');
    const labels = raw ? JSON.parse(raw) : {};
    return labels[`${vaultId}-${index}`] || `Beneficiary ${index + 1}`;
  } catch {
    return `Beneficiary ${index + 1}`;
  }
}

export function useVaults() {
  const { stxAddress } = useWallet();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [sendingHeartbeat, setSendingHeartbeat] = useState<string | null>(null);
  const [loadingVaults, setLoadingVaults] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vaults from chain on mount / address change
  useEffect(() => {
    if (IS_MOCK_MODE) {
      setVaults(MOCK_VAULTS);
      setLoadingVaults(false);
      setError(null);
      return;
    }

    if (!stxAddress) {
      setVaults([]);
      setLoadingVaults(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoadingVaults(true);
      setError(null);
      try {
        const vaultIds = getSavedVaultIds();
        const currentBlock = await fetchCurrentBlockHeight();
        const addr = stxAddress!;

        const result: Vault[] = [];

        for (const id of vaultIds) {
          if (cancelled) return;
          const raw = await fetchRawVault(id, addr);
          if (!raw) continue;

          const count = await fetchBeneficiaryCount(id, addr);
          const benOnchain = await fetchAllBeneficiaries(id, count, addr);

          const vaultData = vaultFromOnchain(raw, id, currentBlock, benOnchain);
          const name = getVaultName(String(id));

          result.push({
            ...vaultData,
            id: String(id),
            name,
            beneficiaries: vaultData.beneficiaries.map((b, i) => ({
              id: `b-${id}-${i}`,
              address: b.address,
              label: getBeneficiaryLabel(String(id), i),
              percentage: b.percentage,
              timeLockDays: b.timeLockDays > 0 ? b.timeLockDays : undefined,
            })),
          });
        }

        if (!cancelled) setVaults(result);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load vaults:', err);
          setError('Failed to load vaults from chain');
        }
      } finally {
        if (!cancelled) setLoadingVaults(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [stxAddress]);

  const addVault = useCallback((vault: Vault) => {
    setVaults((prev) => [vault, ...prev]);
  }, []);

  const heartbeatUpdate = useCallback((vaultId: string) => {
    setVaults((prev) =>
      prev.map((v) =>
        v.id === vaultId
          ? {
              ...v,
              status: 'active' as VaultStatus,
              lastHeartbeat: new Date(),
              nextDeadline: new Date(
                Date.now() + v.heartbeatIntervalDays * 24 * 60 * 60 * 1000
              ),
            }
          : v
      )
    );
  }, []);

  const sendHeartbeat = useCallback(async (vaultId: string) => {
    setSendingHeartbeat(vaultId);

    if (IS_MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 1800));
      heartbeatUpdate(vaultId);
      setSendingHeartbeat(null);
      return;
    }

    openSendHeartbeat({
      vaultId: BigInt(vaultId),
      onFinish: () => {
        heartbeatUpdate(vaultId);
        setSendingHeartbeat(null);
      },
      onCancel: () => {
        setSendingHeartbeat(null);
      },
    });
  }, [heartbeatUpdate]);

  const totalProtected = vaults.reduce((sum, v) => sum + v.sbtcAmount, 0);
  const urgentVaults = vaults.filter(isVaultUrgent);

  return {
    vaults,
    addVault,
    sendHeartbeat,
    sendingHeartbeat,
    totalProtected,
    urgentVaults,
    loadingVaults,
    error,
  };
}
