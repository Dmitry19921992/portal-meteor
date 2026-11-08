// t35_flags.js — проверка выключателей: ?t35=0 и ?cx813=0 (ПК и телефон).
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--mute-audio', '--remote-debugging-port=9764', '--user-data-dir=D:\\AI\\pm_v6\\chrome_t35f', '--window-size=1280,720', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let ws, id = 0; const pending = new Map();
  const send = (m, p) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const errs = [];
  try {
    let targets = null;
    for (let k = 0; k < 60; k++){ try { targets = await (await fetch('http://127.0.0.1:9764/json')).json(); if (targets.some(x => x.type === 'page')) break; } catch {} await sleep(500); }
    ws = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)){ const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(x => x.value || x.description).join(' ').slice(0, 200)); };
    await send('Runtime.enable', {}); await send('Page.enable', {});
    const evl = async ex => { const r = await send('Runtime.evaluate', { expression: ex, returnByValue: true }); return r.exceptionDetails ? { EX: String(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300) } : r.result.value; };
    const boot = async tag => { for (let i = 0; i < 120; i++){ if (await evl(`typeof MENU !== 'undefined' && typeof CX813 !== 'undefined' && typeof CX820 !== 'undefined' && typeof S !== 'undefined' && S.attract !== undefined && MENU.cur === 'main'`)) { console.log('boot ok: ' + tag); return true; } await sleep(500); } console.log('boot FAIL: ' + tag + ' state=' + JSON.stringify(await evl(`({ menu: typeof MENU, cx813: typeof CX813, cx820: typeof CX820, cur: typeof MENU !== 'undefined' && MENU.cur })`))); return false; };
    const open = async tag => { for (let i = 0; i < 8; i++){ await evl(`MENU.show('codex813', true)`); for (let k = 0; k < 20; k++){ await sleep(300); if (await evl(`MENU.cur === 'codex813' ? document.querySelectorAll('#cx813g .cxc').length : 0`) > 0) { console.log('open ok: ' + tag); return true; } } } console.log('open FAIL: ' + tag + ' cur=' + await evl(`MENU.cur`)); return false; };
    const out = {};
    // ПК ?t35=0
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await send('Page.navigate', { url: 'file:///D:/AI/pm_v6/dist/t35.html?t35=0' });
    out.pcT35off_boot = await boot('pc t35=0');
    out.pcT35off_open = await open('pc t35=0');
    await evl(`CX813.tab('units')`); await sleep(600);
    out.pcT35off = await evl(`({ on: CX820.on, canvases: document.querySelectorAll('#cx813g canvas[data-cxm]').length, icons: document.querySelectorAll('#cx813g .cxc > i:not(.cxmi)').length, search: !!document.getElementById('cx813q'), scanWrapped: CX813.scan.toString().indexOf('onScreen') >= 0 })`);
    await evl(`MENU.back()`);
    // телефон ?t35=0
    await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 3, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Page.navigate', { url: 'file:///D:/AI/pm_v6/dist/t35.html?t35=0' });
    out.phT35off_boot = await boot('ph t35=0');
    out.phTouch = await evl(`TOUCH.on`);
    out.phT35off_open = await open('ph t35=0');
    await evl(`CX813.tab('units')`); await sleep(600);
    out.phT35off = await evl(`({ canvases: document.querySelectorAll('#cx813g canvas[data-cxm]').length, search: !!document.getElementById('cx813q') })`);  // поиска нет — исходное поведение v8.13
    await evl(`MENU.back()`);
    // ПК ?cx813=0 — энциклопедии нет вообще, модуль инертен
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await send('Page.navigate', { url: 'file:///D:/AI/pm_v6/dist/t35.html?cx813=0' });
    out.pcCx813off_boot = await boot('pc cx813=0');
    out.pcCx813off = await evl(`({ cx813on: CX813.on, hooked: CX813.card.toString().indexOf('c0.apply') >= 0, btn: !!document.getElementById('m_codex813') })`);
    console.log(JSON.stringify(out, null, 1));
    console.log('CONSOLE ERRORS (' + errs.length + '): ' + errs.slice(0, 5).join(' | '));
  } finally { try { ch.kill(); } catch {} }
})();

