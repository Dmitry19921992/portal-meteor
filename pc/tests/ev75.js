// node ev75.js "<expr>" [--reload] [--wait ms] — быстрый eval на вкладке dist/v75.html (CDP 9338), печатает исключения загрузки
const port = process.env.CDP_PORT || 9338;
(async () => {
  const a = process.argv.slice(2), expr = a[0];
  const wi = a.indexOf('--wait'), wait = wi >= 0 ? +a[wi + 1] : 0;
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const t = list.find(x => x.type === 'page' && x.url.includes(process.env.TGT || 'dist/v75.html'));
  if (!t){ console.log('NO TARGET', list.map(x => x.url)); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const W = {}, logs = [];
  const send = (m, p) => new Promise(r => { const i = ++id; W[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && W[m.id]){ W[m.id](m); delete W[m.id]; } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 700)); else if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) logs.push(m.params.type + ' ' + m.params.args.map(x => x.value || x.description).join(' ').slice(0, 300)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  if (a.includes('--reload')){ await send('Page.enable'); await send('Page.reload', { ignoreCache: true }); }
  if (wait) await new Promise(r => setTimeout(r, wait));
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result && (r.result.result ? r.result.result.value : r.result), null, 1));
  console.log(logs.join('\n'));
  process.exit(0);
})();
