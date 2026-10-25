// запускает v72g_audio.js в странице dist/v72g.html (CDP 9246), забирает WAV из window.__a72 → D:/AI/pm_v6/shots/v72g/audio/
const fs = require('fs');
(async () => {
  const port = process.env.CDP_PORT || 9246, OUT = 'D:/AI/pm_v6/shots/v72g/audio/';
  fs.mkdirSync(OUT, { recursive: true });
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes('dist/v72g.html'));
  if (!t){ console.log('NO TARGET'); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const wait = {}; const logs = [];
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; } else if (m.method === 'Runtime.exceptionThrown') logs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 500)); else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(x => x.value || x.description).join(' ').slice(0, 300)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.reload', { ignoreCache: true }); await new Promise(r => setTimeout(r, 2500));
  for (let i = 0; i < 300; i++){ const r = await send('Runtime.evaluate', { expression: "(()=>{try{return document.getElementById('boot').classList.contains('done') && !!S.cps && MENU.cur === 'main'}catch(e){return false}})()", returnByValue: true }); if (r.result.result.value) break; await new Promise(r => setTimeout(r, 500)); }
  const code = fs.readFileSync(__dirname + '/v72g_audio.js', 'utf8');
  const res = await send('Runtime.evaluate', { expression: '(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));\n' + code + '\n})()', awaitPromise: true, returnByValue: true, timeout: 600000 });
  console.log(JSON.stringify(res.result.result ? res.result.result.value : res.result).slice(0, 2000));
  const n = (await send('Runtime.evaluate', { expression: '(window.__a72 || []).length', returnByValue: true })).result.result.value;
  for (let i = 0; i < n; i++){
    const r = await send('Runtime.evaluate', { expression: `JSON.stringify(window.__a72[${i}])`, returnByValue: true });
    const p = JSON.parse(r.result.result.value);
    fs.writeFileSync(OUT + p.name + '.wav', Buffer.from(p.b64, 'base64'));
  }
  console.log('wrote', n); if (logs.length) console.log('CONSOLE:\n' + logs.join('\n'));
  ws.close(); process.exit(0);
})();
