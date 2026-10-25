// node fps_phone.js <urlpart> <out.jpg> [w h dpr] — эмуляция телефона на CDP 9231: сенсор, новый бой, кнопки огня/прицела/перезарядки/рывка
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
  console.log('menu', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e) {} await sleep(1000); } return { touch: document.body.classList.contains('touch'), inner: [innerWidth, innerHeight] };`)));
  console.log('game', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); MENU.newGame(); await sleep(6000);
    const R = {}; const vw = innerWidth, vh = innerHeight; const rects = [];
    for (const b of document.querySelectorAll('#touch .tf.fps button')){ const r = b.getBoundingClientRect(); rects.push([b.dataset.k || b.dataset.t, Math.round(r.left), Math.round(r.top), Math.round(r.width)]); }
    R.buttons = rects; R.offscreen = rects.filter(r => r[1] < 0 || r[2] < 0 || r[1] + r[3] > vw || r[2] + r[3] > vh).map(r => r[0]);
    const sq = document.getElementById('squadp').getBoundingClientRect(); R.squadp = [Math.round(sq.left), Math.round(sq.top), Math.round(sq.width), Math.round(sq.height)];
    R.mode = S.mode; return R;`)));
  // нажатия: прицел (переключатель), огонь, перезарядка
  const tap = async (sel, holdMs) => {
    const r = await ev(`const b = document.querySelector('${sel}'); const q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2];`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r[0], y: r[1], id: 7 }] });
    await new Promise(z => setTimeout(z, holdMs || 80));
    return r;
  };
  const untap = async () => send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tap('#touch [data-t="aim"]'); await untap();
  await new Promise(z => setTimeout(z, 500));
  console.log('ads', JSON.stringify(await ev(`return { aiming: S.aiming, aimK: +(S.aimK || 0).toFixed(2), mouseR };`)));
  const mag0 = await ev(`return S.kit.mag[S.kit.w];`);
  await tap('#touch [data-t="fire"]', 600);
  console.log('fire', JSON.stringify(await ev(`return { mouseL, mag: S.kit.mag[S.kit.w] };`)), 'mag0', mag0);
  let s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64'));
  await untap();
  await tap('#touch [data-k="reload"]'); await untap();
  await new Promise(z => setTimeout(z, 200));
  console.log('reload', JSON.stringify(await ev(`return { reloadT: +S.kit.reloadT.toFixed(2) };`)));
  await tap('#touch [data-t="aim"]'); await untap();
  if (logs.length) console.log(logs.slice(0, 15).join('\n'));
  await send('Emulation.clearDeviceMetricsOverride'); await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: '' });
  ws.close(); process.exit(0);
})();
