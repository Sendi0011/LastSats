'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2, CheckCircle, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { Vault, Beneficiary, VaultStatus } from '@/lib/vault';

interface CreateVaultModalProps {
  onClose: () => void;
  onCreated: (vault: Vault) => void;
  sbtcBalance: number;
}

const STEPS = ['Vault Setup', 'Beneficiaries', 'Settings', 'Confirm'];

interface BeneficiaryInput {
  id: string;
  address: string;
  label: string;
  percentage: number;
  timeLockDays: number;
}

export default function CreateVaultModal({ onClose, onCreated, sbtcBalance }: CreateVaultModalProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Step 1
  const [vaultName, setVaultName] = useState('');
  const [sbtcAmount, setSbtcAmount] = useState('');

  // Step 2
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryInput[]>([
    { id: '1', address: '', label: '', percentage: 100, timeLockDays: 0 },
  ]);

  // Step 3
  const [heartbeatInterval, setHeartbeatInterval] = useState(90);
  const [guardianAddress, setGuardianAddress] = useState('');

  const totalPct = beneficiaries.reduce((s, b) => s + b.percentage, 0);
  const canProceed = [
    vaultName.trim() && parseFloat(sbtcAmount) > 0 && parseFloat(sbtcAmount) <= sbtcBalance,
    beneficiaries.every((b) => b.address.trim() && b.label.trim()) && totalPct === 100,
    true,
    true,
  ][step];

  const addBeneficiary = () => {
    const remaining = 100 - totalPct;
    setBeneficiaries((prev) => [
      ...prev,
      { id: Date.now().toString(), address: '', label: '', percentage: Math.max(0, remaining), timeLockDays: 0 },
    ]);
  };

  const removeBeneficiary = (id: string) => {
    if (beneficiaries.length > 1) {
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const updateBeneficiary = (id: string, field: keyof BeneficiaryInput, value: string | number) => {
    setBeneficiaries((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleDeploy = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2500));
    const newVault: Vault = {
      id: `vault-${Date.now()}`,
      name: vaultName,
      sbtcAmount: parseFloat(sbtcAmount),
      status: 'active',
      heartbeatIntervalDays: heartbeatInterval,
      lastHeartbeat: new Date(),
      nextDeadline: new Date(Date.now() + heartbeatInterval * 24 * 60 * 60 * 1000),
      beneficiaries: beneficiaries.map((b, i) => ({
        id: `b-${i}`,
        address: b.address,
        label: b.label,
        percentage: b.percentage,
        timeLockDays: b.timeLockDays || undefined,
      })),
      guardianAddress: guardianAddress || undefined,
      createdAt: new Date(),
      tier: 'hodler',
    };
    setLoading(false);
    setSuccess(true);
    setTimeout(() => onCreated(newVault), 1500);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-bright)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 560,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.25s ease',
        }}
      >
        {success ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <CheckCircle size={32} color="var(--accent-green)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 10 }}>
              Vault Deployed!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Your vault has been created on Stacks. Your Bitcoin is now protected.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Create New Vault
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Step indicator */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background: i <= step ? 'var(--accent-orange)' : 'var(--border)',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: '28px' }}>
              {/* STEP 1 */}
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                      Vault Name
                    </label>
                    <input
                      className="input-field"
                      placeholder="e.g. Family Trust, Emergency Fund..."
                      value={vaultName}
                      onChange={(e) => setVaultName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                      sBTC Amount to Deposit
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input-field"
                        type="number"
                        step="0.00001"
                        placeholder="0.00000"
                        value={sbtcAmount}
                        onChange={(e) => setSbtcAmount(e.target.value)}
                        style={{ paddingRight: 80 }}
                      />
                      <button
                        onClick={() => setSbtcAmount(Math.min(sbtcBalance, 0.05).toFixed(5))}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'var(--accent-orange-dim)',
                          border: '1px solid rgba(249,115,22,0.2)',
                          borderRadius: 6,
                          color: 'var(--accent-orange)',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        MAX
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Available: {sbtcBalance.toFixed(5)} sBTC · Free tier limit: 0.05 sBTC
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {beneficiaries.map((b, idx) => (
                    <div
                      key={b.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                          Beneficiary {idx + 1}
                        </span>
                        {beneficiaries.length > 1 && (
                          <button
                            onClick={() => removeBeneficiary(b.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input className="input-field" placeholder="Label (e.g. Spouse, Child)" value={b.label} onChange={(e) => updateBeneficiary(b.id, 'label', e.target.value)} />
                        <input className="input-field" placeholder="Stacks wallet address (SP...)" value={b.address} onChange={(e) => updateBeneficiary(b.id, 'address', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Share %</label>
                            <input className="input-field" type="number" min="1" max="100" value={b.percentage} onChange={(e) => updateBeneficiary(b.id, 'percentage', parseInt(e.target.value) || 0)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Time-lock (days, optional)</label>
                            <input className="input-field" type="number" min="0" placeholder="0 = immediate" value={b.timeLockDays || ''} onChange={(e) => updateBeneficiary(b.id, 'timeLockDays', parseInt(e.target.value) || 0)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      onClick={addBeneficiary}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'none',
                        border: '1px dashed var(--border-bright)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontFamily: 'var(--font-display)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--accent-orange)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <Plus size={14} /> Add Beneficiary
                    </button>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: totalPct === 100 ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {totalPct}% / 100%
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, fontFamily: 'var(--font-display)' }}>
                      Heartbeat Interval
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[30, 60, 90, 180].map((days) => (
                        <button
                          key={days}
                          onClick={() => setHeartbeatInterval(days)}
                          style={{
                            flex: 1,
                            padding: '12px 8px',
                            borderRadius: 10,
                            border: `1px solid ${heartbeatInterval === days ? 'var(--accent-orange)' : 'var(--border)'}`,
                            background: heartbeatInterval === days ? 'var(--accent-orange-dim)' : 'transparent',
                            color: heartbeatInterval === days ? 'var(--accent-orange)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 13,
                            transition: 'all 0.2s',
                          }}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      You must send a heartbeat transaction every {heartbeatInterval} days to keep your vault active.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                      Guardian Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      className="input-field"
                      placeholder="SP... (trusted contact who can pause execution)"
                      value={guardianAddress}
                      onChange={(e) => setGuardianAddress(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Your guardian can pause vault execution during the grace period if they believe you are still alive.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 4 — Review */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      background: 'rgba(249,115,22,0.06)',
                      border: '1px solid rgba(249,115,22,0.2)',
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    {[
                      ['Vault Name', vaultName],
                      ['sBTC Deposit', `${parseFloat(sbtcAmount || '0').toFixed(5)} sBTC`],
                      ['Beneficiaries', `${beneficiaries.length} ${beneficiaries.length === 1 ? 'person' : 'people'}`],
                      ['Heartbeat', `Every ${heartbeatInterval} days`],
                      ['Guardian', guardianAddress || 'None'],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '14px 16px',
                      background: 'rgba(59,130,246,0.07)',
                      border: '1px solid rgba(59,130,246,0.15)',
                      borderRadius: 10,
                    }}
                  >
                    <Info size={15} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      This will deploy a Clarity smart contract to Stacks mainnet. The deployment requires a small STX gas fee. Your sBTC will be locked in the contract.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '20px 28px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 12,
                justifyContent: 'space-between',
              }}
            >
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="btn-secondary"
                  style={{ padding: '11px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <button onClick={onClose} className="btn-secondary" style={{ padding: '11px 20px', fontSize: 14 }}>
                  Cancel
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed}
                  className="btn-primary"
                  style={{ padding: '11px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleDeploy}
                  disabled={loading}
                  className="btn-primary"
                  style={{ padding: '11px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Deploying Contract...
                    </>
                  ) : (
                    'Deploy Vault →'
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      