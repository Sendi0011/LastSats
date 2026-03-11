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

// Helpers
export function daysUntilDeadline(deadline: Date): number {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function statusLabel(status: VaultStatus): string {
  const labels: Record<VaultStatus, string> = {
    active: 'Active',
    warning: 'Warning',
    grace: 'Grace Period',
    executing: 'Executing',
    complete: 'Complete',
    paused: 'Paused',
  };
  return labels[status];
}

export function statusColor(status: VaultStatus): string {
  const colors: Record<VaultStatus, string> = {
    active: '#10B981',
    warning: '#F59E0B',
    grace: '#F97316',
    executing: '#EF4444',
    complete: '#6B7280',
    paused: '#3B82F6',
  };
  return colors[status];
}

export function heartbeatProgress(vault: Vault): number {
  const total = vault.heartbeatIntervalDays * 24 * 60 * 60 * 1000;
  const elapsed = new Date().getTime() - vault.lastHeartbeat.getTime();
  return Math.min(100, (elapsed / total) * 100);
}

// Mock vaults for demo
export const MOCK_VAULTS: Vault[] = [
  {
    id: 'vault-001',
    name: 'Family Trust',
    sbtcAmount: 0.25,
    status: 'active',
    heartbeatIntervalDays: 90,
    lastHeartbeat: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    nextDeadline: new Date(Date.now() + 78 * 24 * 60 * 60 * 1000),
    beneficiaries: [
      { id: 'b1', address: 'SP1ABC...XYZ', label: 'Sarah (Spouse)', percentage: 60 },
      { id: 'b2', address: 'SP2DEF...ABC', label: 'James (Son)', percentage: 40, timeLockDays: 365 * 5 },
    ],
    guardianAddress: 'SP3GHI...DEF',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    tier: 'hodler',
  },
  {
    id: 'vault-002',
    name: 'Emergency Reserve',
    sbtcAmount: 0.05,
    status: 'warning',
    heartbeatIntervalDays: 30,
    lastHeartbeat: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
    nextDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    beneficiaries: [
      { id: 'b3', address: 'SP4JKL...MNO', label: 'Brother', percentage: 100 },
    ],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    tier: 'free',
  },
];
