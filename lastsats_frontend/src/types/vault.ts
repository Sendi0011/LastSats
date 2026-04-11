export type VaultStatus = 'active' | 'warning' | 'grace' | 'executing' | 'complete' | 'paused';

export interface Beneficiary {
  id: string;
  address: string;
  label: string;
  percentage: number;
  timeLockDays?: number;
}

export interface Vault {
  id: string;
  name: string;
  sbtcAmount: number;
  status: VaultStatus;
  heartbeatIntervalDays: number;
  lastHeartbeat: Date;
  nextDeadline: Date;
  beneficiaries: Beneficiary[];
  guardianAddress?: string;
  createdAt: Date;
  tier: 'free' | 'hodler' | 'whale';
}

export interface VaultStore {
  vaults: Vault[];
  addVault: (vault: Omit<Vault, 'id' | 'createdAt' | 'lastHeartbeat'>) => void;
  sendHeartbeat: (vaultId: string) => void;
}
