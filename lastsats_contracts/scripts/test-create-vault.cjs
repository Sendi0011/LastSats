const { STACKS_TESTNET, tx, DEPLOYER, deployerKey, waitStatus, fs } = require('./lib-testnet.cjs');

const INTERVAL_30D = 30 * 144;
const TIER_HODLER = 1;
const DEPOSIT = 1000000; // 0.01 sBTC (we hold 10,000,000)

(async () => {
  const senderKey = deployerKey();
  const args = [
    tx.Cl.uint(INTERVAL_30D),
    tx.Cl.uint(DEPOSIT),
    tx.Cl.uint(TIER_HODLER),
    tx.Cl.none(),
  ];
  const transaction = await tx.makeContractCall({
    contractAddress: DEPLOYER,
    contractName: 'lastsats-vault-v3',
    functionName: 'create-vault',
    functionArgs: args,
    senderKey,
    network: STACKS_TESTNET,
    anchorMode: tx.AnchorMode.Any,
    postConditionMode: tx.PostConditionMode.Allow,
    fee: 8000,
  });
  const res = await tx.broadcastTransaction({ transaction, network: STACKS_TESTNET });
  console.log('call      : create-vault(interval=30d, amount=' + DEPOSIT + ', tier=1, guardian=none)');
  console.log('vault     :', DEPLOYER + '.lastsats-vault-v3');
  console.log('CREATE TX :', res.txid);
  const j = await waitStatus(res.txid);
  console.log('status    :', j ? j.tx_status : 'timeout');
  if (j) {
    console.log('result    :', JSON.stringify(j.tx_result || {}));
    if (j.tx_status === 'success') {
      const evs = (j.events || []).map((e) => JSON.stringify(e).slice(0, 220));
      evs.forEach((e) => console.log('event     :', e));
    }
  }
})().catch((e) => { console.error('FAILED:', e && (e.stack || e.message)); process.exit(1); });
