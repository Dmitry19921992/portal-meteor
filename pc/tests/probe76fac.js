// node probe76fac.js "<expr>" — evaluates an expression on dist/v76fac.html (CDP 9352), prints JSON
(async () => {
  const list = await (await fetch('http://127.0.0.1:9352/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes('v76fac'));
  if (!t){ console.log('NO TARGET', list.map(x => x.url)); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const w = {};
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && w[m.id]){ w[m.id](m); } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params) => new Promise(r => { const i = ++id; w[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const r = await send('Runtime.evaluate', { expression: process.argv[2], returnByValue: true, awaitPromise: true, timeout: 20000 });
  console.log(String(JSON.stringify(r.result && r.result.result && r.result.result.value !== undefined ? r.result.result.value : r)).slice(0, 4000));
  if (process.argv[3]){ const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); require('fs').writeFileSync(process.argv[3], Buffer.from(s.result.data, 'base64')); }
  process.exit(0);
})();
