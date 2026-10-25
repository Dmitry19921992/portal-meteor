// node v75_arch.js — проверка itch-архива версий (dist/itch75): выбор v7.4, свои ключи localStorage, «↩ версии», автопереход
const port = process.env.CDP_PORT || 9338;
const base = 'http://127.0.0.1:8838/dist/itch75/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const W = {}; const logs = [];
  const send = (m, p) => new Promise(r => { const i = ++id; W[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && W[m.id]){ W[m.id](m); delete W[m.id]; } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : r; };
  const waitBoot = async () => { for (let i = 0; i < 240; i++){ const v = await ev("(()=>{try{return document.getElementById('boot').classList.contains('done') && typeof MENU!=='undefined' && !!MENU.cur}catch(e){return false}})()"); if (v === true) return true; await sleep(500); } return false; };
  const out = {};
  await send('Page.navigate', { url: base + 'index.html' }); await sleep(2000);
  out.boot1 = await waitBoot();
  out.v1 = await ev("[location.pathname, document.title, VER75.archive, localStorage.getItem('pm_ver75')]");
  await ev("localStorage.setItem('pm_settings_probe75', 'main'); VER75.pick('v7_4'); 1");
  await sleep(4000);
  out.v2 = await ev("[location.pathname, document.title, !!document.getElementById('pmv75back'), window.__pmLS ? __pmLS.g('pm_ver75') : null]");
  await sleep(20000);
  out.keys = await ev("Object.keys(localStorage).sort()");
  out.probe = await ev("[localStorage.getItem('pm_settings_probe75'), __pmLS.g('pm_settings_probe75')]");
  await ev("document.getElementById('pmv75back').click(); 1");
  await sleep(3000);
  out.v3path = await ev("location.pathname + location.search");
  out.boot3 = await waitBoot(); await sleep(1500);
  out.v3menu = await ev("MENU.cur");
  // повторный запуск index.html без параметров — выбор помнится → сразу v7.4
  await send('Page.navigate', { url: base + 'index.html' }); await sleep(4000);
  out.v4 = await ev("location.pathname");
  // вернуть «последнюю»
  await send('Page.navigate', { url: base + 'index.html?ver=latest' }); await sleep(2000); await waitBoot();
  await ev("VER75.pick('v7_5'); 1"); await sleep(500);
  out.v5 = await ev("[location.pathname, localStorage.getItem('pm_ver75')]");
  out.logs = logs.slice(0, 8);
  console.log(JSON.stringify(out, null, 1));
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
  process.exit(0);
})();
