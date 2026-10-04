const NM = '/Users/user/lastsats/lastsats_frontend/node_modules';
const tx = require(NM + '/@stacks/transactions');

const W = 'ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2';
const CID = W + '.sbtc-mock-token';
const API = 'https://api.testnet.hiro.so';

const fmt = (micro) => (Number(micro) / 1e8).toFixed(8);

async function callRead(fn, args) {
  const r = await fetch(`${API}/v2/contracts/call-read/${CID}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: W, arguments: args }),
  });
  const t = await r.text();
  if (r.status !== 200 || !t.trim().startsWith('{')) return { ok: false, status: r.status, body: t.slice(0, 80) };
  return { ok: true, json: JSON.parse(t) };
}

(async () => {
  // 1) holders endpoint (authoritative indexer view)
  const h = await fetch(`${API}/extended/v1/tokens/ft/${CID}/holders`);
  if (h.status === 200) {
    const j = await h.json();
    console.log('=== FT holders for sbtc-mock-token ===');
    (j.results || []).forEach((r) => {
      console.log('  ', r.address, '->', r.balance, 'micro =', fmt(r.balance));
    });
    if (!(j.results || []).length) console.log('   (no holders returned)');
  } else {
    console.log('holders endpoint HTTP', h.status);
  }

  // 2) direct contract read of our balance
  const arg = '0x' + tx.serializeCV(tx.Cl.principal(W));
  const bal = await callRead('get-balance', [arg]);
  if (bal.ok && bal.json.ok && bal.json.result) {
    const v = BigInt('0x' + bal.json.result.replace(/^0x/, '').slice(8));
    console.log('\nget-balance(' + W + ') =', v.toString(), 'micro =', fmt(v.toString()), 'sBTC');
  } else {
    console.log('\nget-balance unavailable:', JSON.stringify(bal));
  }
})();
