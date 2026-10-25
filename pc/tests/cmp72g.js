// v6.7: доказательство, что ПК-версия не изменилась. Детерминированный прогон (свой Math.random, своё время,
// кадры вручную) одной и той же сцены в v6.6 и v6.7 на ПК (1280×720, мышь, без сенсора) → PNG и попиксельное сравнение.
// node pcab67.js <tagA> <urlA> <tagB> <urlB>   (порт CDP 9246)
const fs = require('fs');
const port = process.env.CDP_PORT || 9246;
const OUT = 'D:/AI/pm_v6/shots/pcab72g/';
fs.mkdirSync(OUT, { recursive: true });
const INJECT = `(() => {
  let seed = 1234567;
  Math.random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__seed = s => { seed = s; };
  let now = 0; performance.now = () => now; Date.now = () => 1792460000000 + Math.floor(now);
  const q = []; let auto = true, pend = false;
  const flush = () => { pend = false; const L = q.splice(0); now += 1000 / 60; for (const cb of L) { try { cb(now); } catch (e) { console.error('pcab', e && e.message); } } sched(); };
  const sched = () => { if (!auto || pend || !q.length) return; const b = document.getElementById('boot'); if (b && b.classList.contains('done')) { auto = false; return; } pend = true; setTimeout(flush, 16); };
  window.requestAnimationFrame = cb => { q.push(cb); sched(); return q.length; };
  window.__pump = n => { auto = false; for (let i = 0; i < n; i++) flush(); };
  try { localStorage.clear(); } catch (e) {}
  addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '*,*:before,*:after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); });
})();`;
const SCEN = "  const sleep = ms => new Promise(r => setTimeout(r, ms));\n  const shots = [];\n  const ui = on => { for (const e of document.querySelectorAll('body > *')) if (e.id !== 'c' && e.tagName !== 'SCRIPT') e.style.visibility = on ? '' : 'hidden'; };\n  const shot = async n => { if (MENU.cur){ MENU.close(); S.paused = false; __pump(1); } S.xfer = 0; await sleep(300); shots.push(n); await window.__cdpShot(n); };\n  if (location.hash === '#old') SET.gfx72 = false; else if (location.hash === '#new') SET.gfx72 = true;\n  S.autoRes = false; S.scale = 1; resize();\n  MENU.pause = function(){};   // в headless захват мыши не удаётся — не даём игре уходить в паузу\n  AU.on = false;               // звук тратит общий Math.random по-разному в v7.1/новой — для одинаковых кадров выключаем\n  __seed(4242); MENU.newGame(); if (TUT.on) TUT.finish(); if (typeof CUR !== 'undefined') CUR.off = true;\n  DEV.start(); S.autoRes = false; S.scale = 1; resize();\n  __pump(5); POLY71.start(); __pump(420);\n  POLY71.possess(); __pump(2); MENU.close(); S.paused = false; __pump(150); if (MENU.cur){ MENU.close(); S.paused = false; }\n  ui(false);\n  S.kit.mag[S.kit.w] = 999; mouseL = true; __pump(20); await shot('1_fps_fire'); mouseL = false;\n  const me = S.me; const camPos = add(me.pos, mul(me.up, 1.6));\n  const ahead = surfacePoint(norm(add(me.pos, mul(tangent(S.cam.fwd, me.up), 14))), 0.3);\n  S.camOverride = { pos: camPos, look: add(ahead, mul(norm(ahead), 2)) };\n  fxExplosion(ahead, 3); __pump(8); await shot('2_boom_a');\n  __pump(30); await shot('3_boom_b');\n  __pump(120); await shot('4_boom_smoke');\n  const b = BASES[0], t1 = anyTangent(b);\n  const pc = POLY71.c, pt = anyTangent(pc);\n  // небо и горизонт: низко над грунтом, взгляд вдаль и чуть вверх\n  const sg = surfacePoint(offsetOnSphere(pc, cross(pc, pt), 60), 0.3), su = norm(sg), sf = tangent(pt, su);\n  S.camOverride = { pos: add(sg, mul(su, 3)), look: add(add(sg, mul(su, 3 + 55)), mul(sf, 150)) }; __pump(10); await shot('7_sky');\n  const c = CRATERS[0], cd = norm(c), ct = anyTangent(cd);\n  S.camOverride = { pos: add(mul(cd, RM + 6), mul(ct, c[3] * 0.9)), look: add(mul(cd, RM - c[3] * 0.4), mul(ct, -c[3] * 0.4)) }; __pump(10); await shot('8_crater');\n  S.camOverride = { pos: [RM - 12, 0.5, 0.5], look: [RM - 60, -1.5, 0] }; __pump(120); await shot('9_tunnel');\n  const g = surfacePoint(offsetOnSphere(pc, pt, 20), 0.3), gu = norm(g), gt = anyTangent(gu);\n  S.camOverride = { pos: add(add(g, mul(gu, 2.2)), mul(gt, -9)), look: add(g, mul(gu, 1.0)) }; __pump(120); await shot('11_poly_ground');\n  S.camOverride = null;\n  enterRTS(); flyCamTo(mul(BASES[0], RM)); S.rts.hT = 70; __pump(150); S.sel.clear(); S.selB = null; __pump(5); await shot('5_rts_base');\n  S.camOverride = { pos: add(mul(b, RM + 14), mul(t1, 60)), look: mul(b, RM + 6) }; __pump(10); await shot('6_base_low');\n  S.camOverride = { pos: add(mul(pc, RM + 22), mul(pt, 45)), look: mul(pc, RM + 2) }; __pump(30); await shot('10_poly_wide');\n  S.camOverride = null; ui(true);\n  return { shots, g72: typeof GFX72 !== 'undefined' ? GFX72.postK() : 'none', title: document.title };\n";
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
