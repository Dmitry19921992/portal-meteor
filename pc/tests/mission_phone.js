// node mission_phone.js <urlpart> <out.jpg> — эмуляция телефона на CDP_PORT (по мотивам pm_tools/cdp_phone.js):
// новый бой, кнопки ⇲ ✸ ⌖, тап по «Режим» в панели отряда, пауза → «Продолжить» без захвата мыши
const fs = require('fs');
(async () => {
  const [want, shot, W = 932, H = 430, DPR = 1.5] = process.argv.slice(2);
  const list = await (await fetch('http://127.0.0.1:' + (process.env.CDP_PORT || 9233) + '/json')).json();
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
  await send('Page.enable'); await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));
  const ev = async e => { const r = (await send('Runtime.evaluate', { expression: '(async () => {' + e + '})()', awaitPromise: true, returnByValue: true, timeout: 300000 })).result; return r.result ? r.result.value : r.exceptionDetails; };
  console.log('menu', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e) {} await sleep(1000); } return { touch: TOUCH.on };`)));
  console.log('game', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); MENU.newGame(); for (let i = 0; i < 400; i++) update(0.05); await sleep(2500);
    const tb = [...document.querySelectorAll('#touch .mbt')].map(b => b.textContent);
    const chip = document.querySelector('#squadp [data-mm="free"]');
    const r = chip ? chip.getBoundingClientRect() : null;
    let freeAfterTap = null;
    if (chip){ chip.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [], changedTouches: [] })); freeAfterTap = SET.ordersFree; }
    const tr0 = document.querySelector('#touch .mbt:nth-of-type(1)');
    return { mode: S.mode, touchBtns: tb, chipRect: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], freeAfterTap, clicklock: $('clicklock').style.display };`)));
  let s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64'));
  console.log('pause', JSON.stringify(await ev(`const sleep = ms => new Promise(r => setTimeout(r, ms)); MISSION.setFree(false); MENU.pause(); await sleep(300); const p = MENU.cur; MENU.resume(); await sleep(200); return { menuWas: p, paused: S.paused, waitLock: !!MENU.waitLock, menu: MENU.cur };`)));
  if (logs.length) console.log(logs.slice(0, 15).join('\n'));
  await send('Emulation.clearDeviceMetricsOverride'); await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: '' });
  await send('Page.reload', { ignoreCache: false });
  ws.close(); process.exit(0);
})();
