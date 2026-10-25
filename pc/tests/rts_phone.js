// node rts_phone.js — эмуляция телефона (iPhone 14 Pro Max, 932x430), стройка инженером тапами, скриншоты shots\rts_phone_*.jpg
const fs = require('fs');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9232/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes('v6_rts.html'));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {}; const logs = [];
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; }
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 300)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 932, height: 430, deviceScaleFactor: 2, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
  await send('Page.enable'); await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));
  const ev = async e => { const r = (await send('Runtime.evaluate', { expression: '(async () => {' + e + '})()', awaitPromise: true, returnByValue: true, timeout: 300000 })).result; return r.result ? r.result.value : r; };
  const shot = async name => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync('D:\\AI\\pm_v6\\shots\\' + name, Buffer.from(s.result.data, 'base64')); };
  const T = `const T = (type, id, x, y, target) => { const t = new Touch({ identifier: id, target: target || canvas, clientX: x, clientY: y }); (target || canvas).dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); };`;
  console.log('boot', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e) {} await sleep(1000); } return { touch: TOUCH.on, inner: [innerWidth, innerHeight] };`)));
  console.log('setup', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); ${T}
    MENU.newGame(); if (TUT.on) TUT.finish(); S.teams[0].ai = false; await sleep(1500);
    const map = document.querySelector('#touch [data-t="map"]'); T('touchstart', 4, 5, 5, map); T('touchend', 4, 5, 5, map); await sleep(800);
    const dir = findSite(0, 'turret'); S.rts.dir = dir; S.rts.h = 40; await sleep(500);
    const bb = document.querySelector('#touch [data-t="builder"]'); if (bb){ T('touchstart', 6, 5, 5, bb); T('touchend', 6, 5, 5, bb); }
    S.rts.dir = dir; S.camFly = null; updateCard(); await sleep(600);
    const btn = document.querySelector('#card [data-build="turret"]'); if (btn) btn.click();
    await sleep(300);
    // тап по месту (центр экрана)
    const p = project(mul(dir, groundR(dir))) || [innerWidth / 2, innerHeight / 2];
    T('touchstart', 7, p[0], p[1]); T('touchend', 7, p[0], p[1]); await sleep(800);
    return { mode: S.mode, btn: !!bb, sel: selBuilders().length, place: S.place, placeAt: !!S.placeAt, bar: getComputedStyle(document.getElementById('placeBar') || document.body).display, card: !!btn };`)));
  await shot('rts_phone_place.jpg');
  console.log('confirm', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); ${T}
    const n0 = S.buildings.filter(b => b.team === 0 && b.type === 'turret').length;
    const ok = document.querySelector('#placeBar [data-pb="ok"]'); if (ok) T('touchstart', 8, 5, 5, ok);
    await sleep(4000);
    return { sites: S.buildings.filter(b => b.team === 0 && b.type === 'turret').length - n0, place: S.place, builders: teamBuilders(0).map(b => b.order).join(','), bar: getComputedStyle(document.getElementById('placeBar')).display };`)));
  await shot('rts_phone_build.jpg');
  if (logs.length) console.log(logs.slice(0, 15).join('\n'));
  await send('Emulation.clearDeviceMetricsOverride'); await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: '' });
  await send('Page.reload', { ignoreCache: true });
  ws.close(); process.exit(0);
})();
