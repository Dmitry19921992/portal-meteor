// t35_run.js — CDP-драйвер проверки T35: ПК 1280×720 и телефон 844×390, скрины в t35_shots/.
// Пошагово: шаг -> evaluate -> поллинг DOM -> скрин. Свой headless Chrome (профиль chrome_t35,
// порт 9761), --mute-audio, закрывается в конце по PID.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const D = path.join(__dirname, 't35_shots');
fs.mkdirSync(D, { recursive: true });
const CDP = 9761;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOG = m => console.log(new Date().toISOString().slice(11, 19) + ' ' + m);

(async () => {
  const prof = path.join(__dirname, '..', 'chrome_t35');
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`,
    `--user-data-dir=${prof}`, '--window-size=1280,720',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  LOG('chrome pid ' + ch.pid);
  const errors = [];
  let ws, id = 0; const pending = new Map();
  const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const result = {};
  try {
    let targets = null;
    for (let k = 0; k < 60; k++){
      try { targets = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (targets.some(x => x.type === 'page')) break; } catch {}
      await sleep(500);
    }
    const t = targets.find(x => x.type === 'page');
    ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)){ const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
      else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning'))
        errors.push(m.params.type + ': ' + m.params.args.map(x => x.value !== undefined ? x.value : x.description).join(' ').slice(0, 400));
      else if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).slice(0, 500));
    };
    await send('Runtime.enable', {}); await send('Page.enable', {});
    const evl = async (expr, awaitP) => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: !!awaitP, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
      return r.result && r.result.value;
    };
    const shot = async p => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); fs.writeFileSync(path.join(D, p), Buffer.from(s.data, 'base64')); LOG('shot ' + p); };
    const boot = async () => {
      // ждём и собственный показ главного меню (main.js show('main') в конце загрузки) —
      // иначе он перебьёт открытую энциклопедию и замеры пойдут по удалённому DOM
      for (let i = 0; i < 240; i++){
        const ok = await evl(`typeof MENU !== 'undefined' && typeof CX813 !== 'undefined' && typeof CX820 !== 'undefined' && typeof S !== 'undefined' && S.attract !== undefined && MENU.cur === 'main'`);
        if (ok) return true;
        await sleep(500);
      }
      return false;
    };
    const openCodex = async () => {
      for (let i = 0; i < 8; i++){
        await evl(`MENU.show('codex813', true)`);
        for (let k = 0; k < 20; k++){
          await sleep(300);
          const n = await evl(`((MENU.cur === 'codex813' ? document.querySelectorAll('#cx813g .cxc').length : 0) || 0)`);
          if (n > 0) return n;
        }
      }
      return 0;
    };

    // ================= ПК 1280×720 =================
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await send('Page.navigate', { url: 'file:///D:/AI/pm_v6/dist/t35.html' });
    result.pcBoot = await boot();
    await openCodex();
    await evl(`CX813.tab('units')`);   // детерминизм: в localStorage мог остаться прошлый таб
    await sleep(800);
    result.pcCards = await evl(`document.querySelectorAll('#cx813g .cxc').length`);
    result.pc = await evl(`({
      canvases: document.querySelectorAll('#cx813g canvas[data-cxm]').length,
      search: !!document.getElementById('cx813q'),
      selfTest: CX820.selfTest(),
    })`);
    await shot('t35_pc_units.jpg');
    await evl(`CX813.tab('bld')`); await sleep(600);
    result.pcBldCanvases = await evl(`document.querySelectorAll('#cx813g canvas[data-cxm]').length`);
    await shot('t35_pc_bld.jpg');
    await evl(`CX813.tab('boss')`); await sleep(600);
    await shot('t35_pc_boss.jpg');
    // живые HP
    result.hp = await evl(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      try {
        const v0 = S.vehicles.length, d0 = S.drones.length, b0 = S.builders.length;
        makeTank([300, 0, 300], 0); makeTank([-300, 0, -300], 1);
        makeDrone([200, 30, 200], 0); makeBuilder(0);
        await sleep(300);
        S.vehicles.length = v0; S.drones.length = d0; S.builders.length = b0;
        return { ok: true, hp: JSON.parse(JSON.stringify(CX820.HP)),
          fb: { tankHp: CX813.FB.tankHp.slice(), droneHp: CX813.FB.droneHp, builderHp: CX813.FB.builderHp },
          ls: localStorage.getItem('pm835_hp') };
      } catch (e){ return { ok: false, err: String(e) }; }
    })()`, true);
    result.scanUsesScreen = await evl(`CX813.scan.toString().indexOf('onScreen') >= 0`);
    result.searchTank = await evl(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      // язык страницы = язык браузера (headless — EN): запрос берём из имени карточки танка
      const tq = (CX813.build().find(e => e.key === 'p:tank') || {}).name;
      const w = tq ? tq.replace(/<[^>]+>/g, '').trim().split(/\\s+/)[0] : 'tank';
      CX813.q = w; CX813.refresh(); await sleep(200);
      const n = document.querySelectorAll('#cx813g .cxc').length;
      CX813.q = ''; CX813.tab('units');
      return { n, w };
    })()`, true);
    await evl(`MENU.back()`);

    // ================= телефон 844×390 =================
    await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 3, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
    await send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 59, right: 59, bottom: 21 } }).catch(() => {});
    await send('Page.navigate', { url: 'file:///D:/AI/pm_v6/dist/t35.html' });
    result.phBoot = await boot();
    result.phTouch = await evl(`typeof TOUCH !== 'undefined' && TOUCH.on`);
    result.phCards = await openCodex();
    await evl(`CX813.tab('units')`);   // детерминизм вкладки и на телефоне
    await sleep(800);
    result.ph = await evl(`({
      canvases: document.querySelectorAll('#cx813g canvas[data-cxm]').length,
      search: !!document.getElementById('cx813q'),
      qVisible: (() => { const q = document.getElementById('cx813q'); if (!q) return false; const r = q.getBoundingClientRect(); return r.width > 30 && r.height > 10; })(),
    })`);
    await shot('t35_phone_units.jpg');
    await evl(`CX813.tab('bld')`); await sleep(600);
    await shot('t35_phone_bld.jpg');

    LOG('RESULT ' + JSON.stringify(result).slice(0, 2400));
    LOG('CONSOLE ISSUES (' + errors.length + '):');
    for (const e of errors.slice(0, 30)) LOG('  ' + e);
  } catch (e){
    LOG('FAIL ' + (e && e.stack || e));
    try { LOG('PARTIAL ' + JSON.stringify(result).slice(0, 2000)); } catch {}
    process.exitCode = 1;
  } finally {
    try { ch.kill(); } catch {}
  }
})();
