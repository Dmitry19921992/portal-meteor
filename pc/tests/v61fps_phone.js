// node v61fps_phone.js <urlpart> <out.jpg> — эмуляция телефона (CDP 9231): помощь в прицеливании по умолчанию, кнопка V,
// карточка гибели с выбором класса тапом, сброс прицела-переключателя при вселении в технику, пауза с выбором класса
const fs = require('fs');
(async () => {
  const [want, shot, W = 932, H = 430, DPR = 3] = process.argv.slice(2);
  const list = await (await fetch('http://127.0.0.1:9231/json')).json();
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
  const tap = async (sel) => {
    const r = await ev(`const b = document.querySelector('${sel}'); if (!b) return null; if (b.closest('#screen')) b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2];`);
    if (!r) return null;
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r[0], y: r[1], id: 7 }] });
    await new Promise(z => setTimeout(z, 80));
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return r;
  };
  console.log('menu', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e) {} await sleep(1000); } return { touch: TOUCH.on, assist: AIMA.lvl() };`)));
  console.log('game', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); MENU.newGame(); await sleep(5000);
    const vb = document.querySelector('#touch .v61v'); const r = vb && vb.getBoundingClientRect();
    return { vBtn: !!vb, vRect: r && [Math.round(r.left), Math.round(r.top), Math.round(r.width)], inView: r ? r.right <= innerWidth && r.bottom <= innerHeight && r.left >= 0 : false };`)));
  // гибель → карточка → тап «Пулемётчик»
  await ev(`SET.prefCls = 'any'; const e = S.squads.find(s => s.team === 1 && s.units.length).units[0]; damage(S.me, 9999, e, 'b'); await new Promise(r => setTimeout(r, 600)); return 1;`);
  console.log('card', JSON.stringify(await ev(`const el = document.getElementById('dcard'); return { shown: !!el && el.style.display !== 'none', btns: el ? el.querySelectorAll('[data-pref]').length : 0 };`)));
  let s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64'));
  await tap('#dcard [data-pref="heavy"]');
  await new Promise(z => setTimeout(z, 300));
  console.log('tapHeavy', JSON.stringify(await ev(`const c = ctrlEntity(); return { pref: SET.prefCls, role: c && c.role };`)));
  // прицел-переключатель не переносится в технику
  console.log('adsTank', JSON.stringify(await ev(`TOUCH.aimOn = true; mouseR = true; const p = S.me; const Up = norm(p.pos); const v = makeTank(surfacePoint(norm(add(p.pos, mul(tangent(p.fwd, Up), 10))), 1.5), 0); takeControl(v); await new Promise(r => setTimeout(r, 300)); return { aimOn: TOUCH.aimOn, mouseR, fp: FPS61.vehFP(v) };`)));
  await tap('#touch .v61v'); await new Promise(z => setTimeout(z, 200));
  console.log('vTap', JSON.stringify(await ev(`return { vehView: SET.vehView };`)));
  await tap('#touch .v61v');
  // пауза: строка выбора класса, тап
  await tap('#touch [data-t="pause"]'); await new Promise(z => setTimeout(z, 300));
  await tap('#screen [data-ch="prefCls"][data-v="rocket"]'); await new Promise(z => setTimeout(z, 200));
  console.log('pause', JSON.stringify(await ev(`return { cur: MENU.cur, pref: SET.prefCls, career: !!document.getElementById('m_career') };`)));
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot.replace('.jpg', '_pause.jpg'), Buffer.from(s.result.data, 'base64'));
  await tap('#m_career'); await new Promise(z => setTimeout(z, 300));
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot.replace('.jpg', '_career.jpg'), Buffer.from(s.result.data, 'base64'));
  console.log('careerScr', JSON.stringify(await ev(`const r = MENU.cur; MENU.close(); S.paused = false; SET.prefCls = 'any'; MENU.save(); return r;`)));
  if (logs.length) console.log(logs.slice(0, 15).join('\n'));
  await send('Emulation.clearDeviceMetricsOverride'); await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: '' });
  await send('Page.reload', { ignoreCache: false });
  ws.close(); process.exit(0);
})();
