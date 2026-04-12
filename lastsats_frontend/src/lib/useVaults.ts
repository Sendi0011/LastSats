import { useState, useCallback } from 'react';
import { MOCK_VAULTS, isVaultUrgent } from './vault';
import type { Vault, VaultStatus } from '@/types/vault';

export function useVaults() {
  const [vaults, setVaults] = useState<Vault[]>(MOCK_VAULTS);
  const [sendingHeartbeat, setSendingHeartbeat] = useState<string | null>(null);

  const addVault = useCallback((vault: Vault) => {
    setVaults((prev) => [vault, ...prev]);
  }, []);

  const sendHeartbeat = useCallback(async (vaultId: string) => {
    setSendingHeartbeat(vaultId);
    // Simulate on-chain tx — replace with real contract call
    await new Promise((r) => setTimeout(r, 1800));
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
    setSendingHeartbeat(null);
  }, []);

  const totalProtected = vaults.reduce((sum, v) => sum + v.sbtcAmount, 0);
  const urgentVaults = vaults.filter(isVaultUrgent);

  return {
    vaults,
    addVault,
    sendHeartbeat,
    sendingHeartbeat,
    totalProtected,
    urgentVaults,
  };
}
