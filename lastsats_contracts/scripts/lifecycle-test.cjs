/**
 * Full lifecycle test against Stacks testnet.
 *
 * Runs: create-vault (+ sBTC deposit) -> add-beneficiary -> finalize-beneficiaries
 *       -> send-heartbeat            (vault A)
 *       create-vault (+ deposit) -> withdraw-vault                  (vault B)
 *
 * trigger-distribution is NOT run here: it requires compute-status == u3
 * (DISTRIBUTING), which needs the heartbeat deadline to pass AND
 * GRACE-PERIOD-BLOCKS (4320) to elapse after sync-vault-status. The minimum
 * allowed heartbeat interval is 30d (4320 blocks), so the earliest a vault can
 * reach DISTRIBUTING is ~8640 blocks (~24h) after creation. Run
 * `node scripts/trigger-distribution.cjs <vault-id>` once that has passed.
 */
const { STACKS_TESTNET, tx, DEPLOYER, deployerKey, sleep, waitStatus } = require('./lib-testnet.cjs');

const VAULT = 'lastsats-vault-v3';
const C = 'ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2';
const TOKEN = 'sbtc-mock-token';
const ASSET = `${C}.${TOKEN}::${TOKEN}`;
const API = 'https://api.testnet.hiro.so';

// Beneficiary must differ from the owner (is-valid-beneficiary asserts that).
const BENEFICIARY = 'ST3D6QCYKSF0MNQWZXAJTASXP54ER6G91XSKY87WY';

const BPS = 10000n;
const INTERVAL_30D = 4320n; // 30 * 144 — minimum allowed by is-valid-interval
const DEPOSIT = 100000n; // 0.001 sBTC — enough to avoid share rounding to 0
const TIER_HODLER = 1n;

const results = [];

async function sbtcBalance(addr) {
  const r = await fetch(`${API}/extended/v1/address/${addr}/balances`);
  const j = await r.json();
  const entry = (j.fungible_tokens || {})[ASSET];
  return entry ? BigInt(entry.balance) : 0n;
}

async function send(label, fn, args, { movesTokens = false } = {}) {
  const t = await tx.makeContractCall({
    contractAddress: C,
    contractName: VAULT,
    functionName: fn,
    functionArgs: args,
    network: STACKS_TESTNET,
    senderKey: deployerKey(),
    // The vault moves the caller's sBTC via contract-call?/as-contract, which
    // Deny mode rejects outright. Allow is required for token-moving calls.
    ...(movesTokens ? { postConditionMode: tx.PostConditionMode.Allow } : {}),
  });

  const { txid: txId } = await tx.broadcastTransaction({ transaction: t, network: STACKS_TESTNET });
  const txid = txId.startsWith('0x') ? txId : `0x${txId}`;

  process.stdout.write(`  ${label.padEnd(34)} ${txid}  ... `);
  const done = await waitStatus(txid);
  if (!done) {
    console.log('TIMED OUT');
    results.push({ label, txid, status: 'timeout', result: '' });
    throw new Error(`${fn} did not confirm in time`);
  }
  console.log(`${done.tx_status}  ${done.tx_result?.repr ?? ''}`);
  results.push({ label, txid, status: done.tx_status, result: done.tx_result?.repr ?? '' });
  if (done.tx_status !== 'success') {
    throw new Error(`${fn} failed: ${done.vm_error || done.tx_result?.repr}`);
  }
  return { txid, repr: done.tx_result?.repr ?? '' };
}

(async () => {
  console.log(`deployer : ${DEPLOYER}`);
  console.log(`vault    : ${C}.${VAULT}`);
  console.log(`benefic. : ${BENEFICIARY}\n`);

  const startDeployer = await sbtcBalance(DEPLOYER);
  const startBenef = await sbtcBalance(BENEFICIARY);
  console.log(`starting balances — deployer=${startDeployer} beneficiary=${startBenef}\n`);

  // ── Vault A: full lifecycle up to heartbeat ────────────────────────────────
  console.log('VAULT A — create + deposit, beneficiary, finalize, heartbeat');

  const a = await send(
    'create-vault (deposit 0.001)',
    'create-vault',
    [uint(INTERVAL_30D), uint(DEPOSIT), uint(TIER_HODLER), noneCV()],
    { movesTokens: true }
  );
  const vaultA = Number((a.repr.match(/\(ok\s+u(\d+)\)/) || [])[1]);
  console.log(`  -> vault id ${vaultA}, deployer now ${await sbtcBalance(DEPLOYER)}\n`);

  await send(
    'add-beneficiary (100%)',
    'add-beneficiary',
    [uint(BigInt(vaultA)), principalCV(BENEFICIARY), uint(BPS), uint(0n)]
  );

  await send('finalize-beneficiaries', 'finalize-beneficiaries', [uint(BigInt(vaultA))]);

  await send('send-heartbeat', 'send-heartbeat', [uint(BigInt(vaultA))]);

  // ── Vault B: withdrawal path (terminal, so it needs its own vault) ─────────
  console.log('\nVAULT B — create + deposit, then withdraw-vault');
  const b = await send(
    'create-vault (deposit 0.001)',
    'create-vault',
    [uint(INTERVAL_30D), uint(DEPOSIT), uint(TIER_HODLER), noneCV()],
    { movesTokens: true }
  );
  const vaultB = Number((b.repr.match(/\(ok\s+u(\d+)\)/) || [])[1]);
  console.log(`  -> vault id ${vaultB}`);

  await send(
    'withdraw-vault (to owner)',
    'withdraw-vault',
    [uint(BigInt(vaultB)), principalCV(DEPLOYER)],
    { movesTokens: true }
  );

  console.log('\nbalances — deployer:', await sbtcBalance(DEPLOYER), ' beneficiary:', await sbtcBalance(BENEFICIARY));

  console.log('\n═══ TRANSACTION IDS ═══');
  for (const r of results) console.log(`${r.label.padEnd(34)} ${r.txid}`);
  console.log(`\nvaultA=${vaultA} vaultB=${vaultB}`);
  console.log(`trigger-distribution for vault ${vaultA} after ~8640 blocks (~24h), then:`);
  console.log(`  node scripts/trigger-distribution.cjs ${vaultA}`);
})().catch((e) => {
  console.error('\nLIFECYCLE FAILED:', e.message);
  console.error('\npartial results:');
  for (const r of results) console.log(`${r.label.padEnd(34)} ${r.txid}  ${r.status}`);
  process.exit(1);
});

// helpers
function uint(v) {
  return tx.uintCV(v);
}
function noneCV() {
  return tx.noneCV();
}
function principalCV(p) {
  return tx.principalCV(p);
}