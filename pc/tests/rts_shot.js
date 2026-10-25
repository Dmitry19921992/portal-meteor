// node rts_shot.js <out.jpg> [js-before] — скриншот вкладки v6_rts.html в окне 1600x900
const fs = require('fs');
(async () => {
  const [out, pre] = process.argv.slice(2);
  const list = await (await fetch('http://127.0.0.1:9232/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes('v6_rts.html'));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {};
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; } };
  await new Promise(r => ws.onopen = r);
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 1500));
  if (pre){ const r = await send('Runtime.evaluate', { expression: '(async () => {' + pre + '})()', awaitPromise: true, returnByValue: true }); console.log(JSON.stringify(r.result.result && r.result.result.value)); }
  await new Promise(r => setTimeout(r, 1500));
  const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  fs.writeFileSync(out, Buffer.from(s.result.data, 'base64'));
  await send('Emulation.clearDeviceMetricsOverride');
  ws.close(); process.exit(0);
})();
