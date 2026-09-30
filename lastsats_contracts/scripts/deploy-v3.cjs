const { STACKS_TESTNET, tx, DEPLOYER, deployerKey, waitStatus, fs } = require('./lib-testnet.cjs');

const source = fs.readFileSync(
  '/Users/user/lastsats/lastsats_contracts/contracts/lastsats-vault-v3.clar', 'utf8');

if (!source.includes('define-public (create-vault')) throw new Error('unexpected v3 source');

(async () => {
  const senderKey = deployerKey();
  const transaction = await tx.makeContractDeploy({
    contractName: 'lastsats-vault-v3',
    codeBody: source,
    senderKey,
    network: STACKS_TESTNET,
    clarityVersion: 2,
    fee: 30000,
  });
  const res = await tx.broadcastTransaction({ transaction, network: STACKS_TESTNET });
  console.log('contract  :', DEPLOYER + '.lastsats-vault-v3');
  console.log('DEPLOY TX :', res.txid);
  const j = await waitStatus(res.txid);
  console.log('status    :', j ? j.tx_status : 'timeout');
  if (!j || j.tx_status !== 'success') {
    if (j) console.log('error     :', JSON.stringify(j.tx_result || {}));
    process.exit(1);
  }
  fs.writeFileSync('/tmp/v3-txid.txt', res.txid);
})().catch((e) => { console.error('FAILED:', e && (e.stack || e.message)); process.exit(1); });
