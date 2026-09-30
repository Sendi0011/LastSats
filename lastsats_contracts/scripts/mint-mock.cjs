const fs = require('fs');
const { STACKS_TESTNET } = require('/Users/user/lastsats/lastsats_frontend/node_modules/@stacks/network');
const tx = require('/Users/user/lastsats/lastsats_frontend/node_modules/@stacks/transactions');
const { mnemonicToSeedSync } = require('/Users/user/lastsats/lastsats_frontend/node_modules/@scure/bip39');
const { HDKey } = require('/Users/user/lastsats/lastsats_frontend/node_modules/@scure/bip32');

const TOML = '/Users/user/lastsats/lastsats_contracts/settings/Testnet.toml';
const RECIPIENT = 'ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2';
const AMOUNT = process.argv[2] || '10000000';

function deployerHex() {
  const toml = fs.readFileSync(TOML, 'utf8');
  const m = toml.match(/\[accounts\.deployer\][\s\S]*?mnemonic\s*=\s*"([^"]+)"/);
  const seed = mnemonicToSeedSync(m[1].trim());
  const child = HDKey.fromMasterSeed(seed).derive("m/44'/5757'/0'/0/0");
  return Buffer.from(child.privateKey).toString('hex') + '01';
}

(async () => {
  const senderKey = deployerHex();
  const deployer = tx.getAddressFromPrivateKey(senderKey, STACKS_TESTNET);
  if (deployer !== RECIPIENT) throw new Error('derivation mismatch: ' + deployer);

  const functionArgs = [tx.Cl.uint(AMOUNT), tx.Cl.principal(RECIPIENT)];
  const transaction = await tx.makeContractCall({
    contractAddress: RECIPIENT,
    contractName: 'sbtc-mock-token',
    functionName: 'mint',
    functionArgs,
    senderKey,
    network: STACKS_TESTNET,
    anchorMode: tx.AnchorMode.Any,
    postConditionMode: tx.PostConditionMode.Deny,
    fee: 8000,
  });

  const res = await tx.broadcastTransaction({ transaction, network: STACKS_TESTNET });
  console.log('signer   :', deployer);
  console.log('contract :', RECIPIENT + '.sbtc-mock-token');
  console.log('call     : mint(' + AMOUNT + ', ' + RECIPIENT + ')');
  console.log('amount   :', AMOUNT, 'micro =', Number(AMOUNT) / 1e8, 'sBTC');
  console.log('MINT TXID:', res.txid);
  fs.writeFileSync('/tmp/mint-txid.txt', res.txid);
})().catch((e) => { console.error('MINT FAILED:', e && (e.stack || e.message)); process.exit(1); });
