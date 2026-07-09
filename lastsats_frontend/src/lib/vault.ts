export type { VaultStatus, Beneficiary, Vault, VaultStore } from '@/types/vault';

import type { Vault, VaultStatus } from '@/types/vault';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Returns true if vault needs immediate attention */
export function isVaultUrgent(vault: Vault): boolean {
  return vault.status === 'warning' || vault.status === 'grace';
}
