const fs = require('fs');
const NM = '/Users/user/lastsats/lastsats_frontend/node_modules';
const { STACKS_TESTNET } = require(NM + '/@stacks/network');
const tx = require(NM + '/@stacks/transactions');
const { mnemonicToSeedSync } = require(NM + '/@scure/bip39');
const { HDKey } = require(NM + '/@scure/bip32');

const TOML = '/Users/user/lastsats/lastsats_contracts/settings/Testnet.toml';
const DEPLOYER = 'ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2';
const DEPLOY_DIR = '/Users/user/lastsats/lastsats_contracts/deployments';

function deployerKey() {
  const toml = fs.readFileSync(TOML, 'utf8');
  const m = toml.match(/\[accounts\.deployer\][\s\S]*?mnemonic\s*=\s*"([^"]+)"/);
  const seed = mnemonicToSeedSync(m[1].trim());
  const child = HDKey.fromMasterSeed(seed).derive("m/44'/5757'/0'/0/0");
  return Buffer.from(child.privateKey).toString('hex') + '01';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitStatus(txid, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch('https://api.testnet.hiro.so/extended/v1/tx/' + txid);
      if (r.status === 200) {
        const j = await r.json();
        if (j.tx_status && j.tx_status !== 'pending') return j;
      }
    } catch (e) {}
    await sleep(5000);
  }
  return null;
}

// Prepend banner lines to a plan yaml (after any leading comment block).
function writeBanner(planPath, lines) {
  let body = fs.readFileSync(planPath, 'utf8');
  body = body.replace(/^﻿/, '');
  fs.writeFileSync(planPath, lines.join('\n') + '\n' + body);
}

module.exports = { STACKS_TESTNET, tx, DEPLOYER, DEPLOY_DIR, deployerKey, sleep, waitStatus, writeBanner, fs };
