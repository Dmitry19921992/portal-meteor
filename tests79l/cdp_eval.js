// node cdp_eval.js "<expr>" [port] [targetSubstr] — evaluate an expression in the page (no waiting), prints JSON
(async () => {
  const [expr, port = 9363, tgt = 'v79l10n'] = process.argv.slice(2);
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes(tgt));
  if (!t){ console.log('NO TARGET', list.map(x => x.url)); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id === 1){ console.log(JSON.stringify(m.result.result.value !== undefined ? m.result.result.value : m.result, null, 1)); process.exit(0); } };
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
  setTimeout(() => { console.log('timeout'); process.exit(2); }, 15000);
})();
