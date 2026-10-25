// node cdp_phone.js <urlpart> <out.jpg> [w h dpr] — эмуляция телефона (сенсор, iOS UA), перезагрузка, новый бой, скриншоты
const fs = require('fs');
(async () => {
  const [want, shot, W = 932, H = 430, DPR = 3] = process.argv.slice(2);
  const list = await (await fetch('http://127.0.0.1:' + (process.env.CDP_PORT || 9232) + '/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes(want));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {}; const logs = [];
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; }
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 300)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: +DPR, mobile: true, screenOrientation: +W > +H ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
  await send('Page.enable'); await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));
  const ev = async e => (await send('Runtime.evaluate', { expression: '(async () => {' + e + '})()', awaitPromise: true, returnByValue: true, timeout: 300000 })).result;
  const r1 = await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e) {} await sleep(1000); } return { touch: document.body.classList.contains('touch'), q: SET.quality, scale: SET.scale, inner: [innerWidth, innerHeight] };`);
  console.log('menu', JSON.stringify(r1.result && r1.result.value));
  let s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot.replace('.jpg', '_menu.jpg'), Buffer.from(s.result.data, 'base64'));
  const r2 = await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); MENU.newGame(); await sleep(8000); return { mode: S.mode, fps: Math.round(S.fpsAvg || 0) };`);
  console.log('fps', JSON.stringify(r2.result && r2.result.value));
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64'));
  const r3 = await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); enterRTS(); await sleep(3000); return S.mode;`);
  console.log('rts', JSON.stringify(r3.result && r3.result.value || r3.exceptionDetails));
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot.replace('.jpg', '_rts.jpg'), Buffer.from(s.result.data, 'base64'));
  const r4 = await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); S.sel.clear(); for (const g of groupsOf(0).filter(isSquad).slice(0, 1)) S.sel.add(g); R61.pref.cards = true; R61.sig = ''; R61.t = 0; await sleep(1200); const c = document.querySelector('#card [data-more]'); if (c) c.click(); await sleep(400); const pc = document.getElementById('r61cards').getBoundingClientRect(), cd = document.getElementById('card').getBoundingClientRect(), sd = document.getElementById('side').getBoundingClientRect(); return { cards: [pc.left, pc.top, pc.right, pc.bottom].map(Math.round), card: [cd.left, cd.top, cd.right, cd.bottom].map(Math.round), side: [sd.left, sd.top].map(Math.round), rows: document.querySelectorAll('#r61cards .rc').length };`);
  console.log('rts2', JSON.stringify(r4.result && r4.result.value || r4.exceptionDetails));
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot.replace('.jpg', '_rts2.jpg'), Buffer.from(s.result.data, 'base64'));
  const r5 = await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); R61.more = false; S.sel.clear(); for (const b of teamBuilders(0)) S.sel.add(b); R61.t = 0; await sleep(1200); return SIDE.tab;`);
  console.log('rts3', JSON.stringify(r5.result && r5.result.value || r5.exceptionDetails));
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot.replace('.jpg', '_rts3.jpg'), Buffer.from(s.result.data, 'base64'));
  if (logs.length) console.log(logs.slice(0, 15).join('\n'));
  await send('Emulation.clearDeviceMetricsOverride'); await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: '' });
  ws.close(); process.exit(0);
})();
