// v6.7: доказательство, что ПК-версия не изменилась. Детерминированный прогон (свой Math.random, своё время,
// кадры вручную) одной и той же сцены в v6.6 и v6.7 на ПК (1280×720, мышь, без сенсора) → PNG и попиксельное сравнение.
// node pcab67.js <tagA> <urlA> <tagB> <urlB>   (порт CDP 9240)
const fs = require('fs');
const port = process.env.CDP_PORT || 9240;
const OUT = 'D:/AI/pm_v6/shots/pcab/';
fs.mkdirSync(OUT, { recursive: true });
const INJECT = `(() => {
  let seed = 1234567;
  Math.random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__seed = s => { seed = s; };
  let now = 0; performance.now = () => now; Date.now = () => 1792440000000 + Math.floor(now);
  const q = []; let auto = true, pend = false;
  const flush = () => { pend = false; const L = q.splice(0); now += 1000 / 60; for (const cb of L) { try { cb(now); } catch (e) { console.error('pcab', e && e.message); } } sched(); };
  const sched = () => { if (!auto || pend || !q.length) return; const b = document.getElementById('boot'); if (b && b.classList.contains('done')) { auto = false; return; } pend = true; setTimeout(flush, 16); };
  window.requestAnimationFrame = cb => { q.push(cb); sched(); return q.length; };
  window.__pump = n => { auto = false; for (let i = 0; i < n; i++) flush(); };
  try { localStorage.clear(); } catch (e) {}
  addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '*,*:before,*:after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); });
})();`;
const SCEN = `
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shots = [];
  const shot = async n => { await sleep(350); shots.push(n); await window.__cdpShot(n); };
  __pump(3); await shot('menu');
  __seed(4242); MENU.newGame(); if (TUT.on) TUT.finish(); __pump(150); await shot('fps');
  __pump(120); await shot('fps2');
  enterRTS(); __pump(90); await shot('rts');
  S.sel.clear(); S.selB = null; S.sel.add(groupsOf(0).find(isSquad)); __pump(40); await shot('rts_sel');
  S.sel.clear(); S.selB = S.hq[0]; __pump(40); await shot('rts_hq');
  S.sel.clear(); S.selB = null; enterFPS(); __pump(60); await shot('fps3');
  MENU.pause(); __pump(5); await shot('pause');
  MENU.show('settings'); __pump(5); await shot('settings');
  return { shots, touch: TOUCH.on, title: document.title, m67: typeof M67 !== 'undefined' ? M67.on : 'none' };
`;
async function run(tag, url){
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {}; const logs = [];
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  let shotReq = null;
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; }
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) logs.push(m.params.type + ': ' + m.params.args.map(x => x.value || x.description).join(' ').slice(0, 300));
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 600));
    else if (m.method === 'Runtime.bindingCalled' && m.params.name === 'cdpShot') shotReq = m.params.payload;
  };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: INJECT });
  await send('Runtime.addBinding', { name: 'cdpShot' });
  await send('Page.navigate', { url });
  // ждём загрузку
  for (let i = 0; i < 400; i++){
    await new Promise(r => setTimeout(r, 500));
    const r = await send('Runtime.evaluate', { expression: "(()=>{try{return document.getElementById('boot').classList.contains('done') && !!S.cps && MENU.cur === 'main'}catch(e){return false}})()", returnByValue: true });
    if (r.result && r.result.result && r.result.result.value) break;
  }
  await send('Runtime.evaluate', { expression: `window.__cdpShot = n => new Promise(r => { window.__shotDone = r; cdpShot(n); });` });
  const pump = (async () => {
    for (;;){
      if (shotReq === 'END') return;
      if (shotReq){ const n = shotReq; shotReq = null; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(OUT + tag + '_' + n + '.png', Buffer.from(s.result.data, 'base64')); await send('Runtime.evaluate', { expression: 'window.__shotDone()' }); }
      await new Promise(r => setTimeout(r, 30));
    }
  })();
  const res = await send('Runtime.evaluate', { expression: '(async () => {' + SCEN + '})()', awaitPromise: true, returnByValue: true, timeout: 600000 });
  shotReq = 'END'; await pump;
  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
  return { tag, res: res.result && (res.result.result ? res.result.result.value : res.result), logs: logs.slice(0, 20) };
}
(async () => {
  const a = process.argv.slice(2);
  const out = [];
  for (let i = 0; i < a.length; i += 2) out.push(await run(a[i], a[i + 1]));
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})();
