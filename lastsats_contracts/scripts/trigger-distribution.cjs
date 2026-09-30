/**
 * Advance a vault to DISTRIBUTING and distribute sBTC to its beneficiaries.
 *
 * trigger-distribution requires compute-status == u3. Reaching it is time-gated
 * by design:
 *
 *   1. block-height >= last-heartbeat-block + heartbeat-interval
 *      (is-valid-interval only allows 30/60/90/180d, and 30d = 4320 blocks)
 *   2. sync-vault-status moves the vault to GRACE (u2) and records grace-start
 *   3. block-height >= grace-start + GRACE-PERIOD-BLOCKS (4320)
 *
 * So a freshly-created vault needs roughly 8640 blocks (~24h on testnet) before
 * this script can succeed. Run it as often as you like; it is a no-op with a
 * clear ETA until then.
 *
 *   node scripts/trigger-distribution.cjs <vault-id>
 */
const { STACKS_TESTNET, tx, DEPLOYER, deployerKey, waitStatus, cvToPlain } = require('./lib-testnet.cjs');

const C = 'ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2';
const VAULT = 'lastsats-vault-v3';
const API = 'https://api.testnet.hiro.so';
const GRACE_PERIOD_BLOCKS = 4320;
const BPS = 10000n;

const vaultId = BigInt(process.argv[2]);
if (vaultId === undefined || Number.isNaN(Number(vaultId))) {
  console.error('usage: node scripts/trigger-distribution.cjs <vault-id>');
  process.exit(1);
}

const call = async (fn, args) =>
  tx.fetchCallReadOnlyFunction({
    network: STACKS_TESTNET,
    contractAddress: C,
    contractName: VAULT,
    functionName: fn,
    functionArgs: args,
    senderAddress: DEPLOYER,
  });

async function send(label, fn, args) {
  const t = await tx.makeContractCall({
    contractAddress: C,
    contractName: VAULT,
    functionName: fn,
    functionArgs: args,
    network: STACKS_TESTNET,
    senderKey: deployerKey(),
    // Distributing moves sBTC to beneficiaries via as-contract transfers.
    postConditionMode: tx.PostConditionMode.Allow,
  });
  const { txid } = await tx.broadcastTransaction({ transaction: t, network: STACKS_TESTNET });
  const id = txid.startsWith('0x') ? txid : `0x${txid}`;
  process.stdout.write(`  ${label.padEnd(22)} ${id} ... `);
  const done = await waitStatus(id);
  console.log(`${done?.tx_status} ${done?.tx_result?.repr ?? ''}`);
  if (!done || done.tx_status !== 'success') {
    throw new Error(`${fn} failed: ${done?.vm_error ?? 'timeout'}`);
  }
  return id;
}

(async () => {
  const vault = cvToPlain(await call('get-vault', [tx.uintCV(vaultId)]));
  if (!vault) {
    console.error(`vault #${vaultId} does not exist`);
    process.exit(1);
  }
  const count = Number(cvToPlain(await call('get-beneficiary-count', [tx.uintCV(vaultId)]))?.count ?? 0);
  const untilDeadline = cvToPlain(await call('get-blocks-until-deadline', [tx.uintCV(vaultId)]));

  console.log(`vault #${vaultId}`);
  console.log(`  amount      ${vault['sbtc-amount']} micro sBTC`);
  console.log(`  finalized   ${vault.finalized}`);
  console.log(`  interval    ${vault['heartbeat-interval']} blocks`);
  console.log(`  lastHb      ${vault['last-heartbeat-block']}`);
  console.log(`  grace-start ${cvToPlain(vault['grace-start-block'])}`);
  console.log(`  until dl    ${untilDeadline === null ? 'DEADLINE PASSED' : untilDeadline}`);
  console.log(`  bens        ${count}\n`);

  if (!vault.finalized) {
    console.error('vault is not finalized — call finalize-beneficiaries first.');
    process.exit(1);
  }
  if (count === 0) {
    console.error('vault has no beneficiaries.');
    process.exit(1);
  }

  // Stage 1: past the deadline? move into GRACE and start the grace clock.
  if (untilDeadline !== null) {
    console.log(`not eligible yet: ${untilDeadline} blocks until the heartbeat deadline.`);
    console.log(`then ${GRACE_PERIOD_BLOCKS} more blocks of grace are required before distribution.`);
    console.log(`total remaining ≈ ${Number(untilDeadline) + GRACE_PERIOD_BLOCKS} blocks (~24h).`);
    process.exit(2);
  }

  if (cvToPlain(vault['grace-start-block']) === null) {
    const id = await send('sync-vault-status', 'sync-vault-status', [tx.uintCV(vaultId)]);
    console.log(`\ngrace started. Distribution unlocks in ${GRACE_PERIOD_BLOCKS} blocks (~12h).`);
    console.log(`re-run later; sync tx: ${id}`);
    process.exit(2);
  }

  // Stage 2: grace elapsed — distribute.
  const id = await send('trigger-distribution', 'trigger-distribution', [tx.uintCV(vaultId)]);
  console.log(`\ndistributed. tx: ${id}`);
})().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
