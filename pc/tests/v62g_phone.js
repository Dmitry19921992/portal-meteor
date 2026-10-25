// node v62g_phone.js <urlpart> <out.jpg> — телефон 932×430 (CDP 9234): кнопка G — удержание = дуга, палец по кнопке = угол, отпускание = бросок; короткий тап = бросок
const fs = require('fs');
(async () => {
  const [want = 'v62g', shot = 'D:\\AI\\pm_v6\\shots\\v62g_phone.jpg', W = 932, H = 430, DPR = 3] = process.argv.slice(2);
  const list = await (await fetch('http://127.0.0.1:9234/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes(want));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {}; const logs = [];
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; }
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 300)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: +DPR, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
  await send('Page.enable'); await send('Page.reload', { ignoreCache: false });
  await new Promise(r => setTimeout(r, 4000));
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: '(async () => {' + e + '})()', awaitPromise: true, returnByValue: true, timeout: 300000 }); return r.result && (r.result.result ? r.result.result.value : r.result.exceptionDetails); };
  const sleep = ms => new Promise(z => setTimeout(z, ms));
  const out = {};
  out.menu = await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e) {} await sleep(500); } return { touch: TOUCH.on };`);
  out.game = await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); MENU.newGame(); await sleep(4000); PROG.unl.add('grenade'); S.kit.gren = 2; S.kit.grenCd = 0; S.me.hp = S.me.maxhp = 99999; SET.hintsOn = false;
    const hi = document.getElementById('hint'); if (hi) hi.style.visibility = 'hidden';
    const me = S.me, Up = norm(me.pos), hz = tangent(me.fwd, Up); me.fwd = norm(add(mul(hz, Math.cos(-0.2)), mul(Up, Math.sin(-0.2))));
    await sleep(400);
    const b = document.querySelector('#touch .g62b'); const r = b && b.getBoundingClientRect();
    return { btn: !!b, html: b && b.innerHTML, rect: r && [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inView: r ? r.right <= innerWidth && r.bottom <= innerHeight : false };`);
  const r = out.game.rect; const x = r[0] + r[2] / 2, y = r[1] + r[3] / 2;
  // удержание
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 3 }] });
  await sleep(700);
  out.hold = await ev(`return { hold: !!G62.hold, path: !!G62.path, dist: G62.path ? +dist(S.me.pos, G62.path.end).toFixed(1) : null, pitch: +Math.asin(dot(S.me.fwd, norm(S.me.pos))).toFixed(3), key: !!keys[SET.bind.grenade] };`);
  // палец ведём вверх по кнопке — взгляд выше, бросок дальше
  for (let i = 1; i <= 6; i++){ await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 8, id: 3 }] }); await sleep(40); }
  await sleep(300);
  out.swipe = await ev(`return { hold: !!G62.hold, dist: G62.path ? +dist(S.me.pos, G62.path.end).toFixed(1) : null, pitch: +Math.asin(dot(S.me.fwd, norm(S.me.pos))).toFixed(3) };`);
  let s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 75 }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64'));
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(150);
  out.release = await ev(`return { hold: !!G62.hold, gren: S.kit.gren, thrown: S.proj.filter(p => p.g62 && p.me).length, tap: G62.last.tap, sinceThrow: +(S.rtime - G62.last.t).toFixed(2) };`);
  // короткий тап — бросок сразу
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 4 }] });
  await sleep(90);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(150);
  out.tap = await ev(`return { hold: !!G62.hold, gren: S.kit.gren, tap: G62.last.tap };`);
  await sleep(400);
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 75 }); fs.writeFileSync(shot.replace('.jpg', '_after.jpg'), Buffer.from(s.result.data, 'base64'));
  out.btnAfter = await ev(`const b = document.querySelector('#touch .g62b'); return b && b.innerHTML;`);
  console.log(JSON.stringify(out, null, 1));
  if (logs.length) console.log(logs.slice(0, 15).join('\n'));
  await send('Emulation.clearDeviceMetricsOverride'); await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: '' });
  await send('Page.reload', { ignoreCache: false });
  ws.close(); process.exit(0);
})();
