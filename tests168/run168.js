// T168 check on the real GPU (headless Chrome, muted, own profile; closes ONLY its own PID).
// node run168.js <pc|phone|off> [page]   -> out_<mode>/ : shots *_off.png / *_on.png (same frame, GND168 toggled), result.json
//   pc    — 1920×1080, battle + stand of ST70 meshes near our HQ (stand168.js), 3 camera views + first-person view
//   phone — 844×390, touch emulation (TOUCH.on → lite path), same stand
//   off   — page with ?gnd168=0: module must stay off, old AS75 disc must stay, 0 console errors
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const MODE = process.argv[2] || 'pc', PAGE0 = process.argv[3] || 't168_test.html';
const PAGE = PAGE0 + '?as3d=local' + (MODE === 'off' ? '&gnd168=0' : '');
const PHONE = MODE === 'phone', W = PHONE ? 844 : 1920, H = PHONE ? 390 : 1080;
const D = path.join(__dirname, 'out_' + MODE); fs.mkdirSync(D, { recursive: true });
const CDP = 9870 + ['pc', 'phone', 'off'].indexOf(MODE);
const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' ' + m; console.log(s); fs.appendFileSync(path.join(D, 'log.txt'), s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { mode: MODE, page: PAGE, errors: [], warns: [], views: {} };
(async () => {
  const prof = path.join(__dirname, 'chrome_' + MODE + '_' + Date.now());
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  LOG('chrome pid ' + ch.pid + ' port ' + CDP + ' page ' + PAGE);
  let ws;
  try {
    let t; for (let k = 0; k < 80; k++){ try { t = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (t.some(x => x.type === 'page')) break; } catch {} await sleep(500); }
    ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const P = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.id && P.has(m.id)){ const p = P.get(m.id); P.delete(m.id); clearTimeout(p.t); m.error ? p.j(Error(JSON.stringify(m.error))) : p.r(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown'){ const d = m.params.exceptionDetails; R.errors.push('EXC ' + ((d.exception && d.exception.description) || d.text).slice(0, 300)); }
      if (m.method === 'Runtime.consoleAPICalled'){ const a = m.params.args.map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ').slice(0, 300);
        if (m.params.type === 'error') R.errors.push('console.error ' + a); else if (m.params.type === 'warning') R.warns.push(a); }
      if (m.method === 'Log.entryAdded' && (m.params.entry.level === 'error' || /WebGL/.test(m.params.entry.text || ''))) R.errors.push('log ' + (m.params.entry.text || '').slice(0, 200) + ' ' + (m.params.entry.url || '').slice(-60));
    };
    const send = (method, params = {}) => new Promise((r, j) => { const n = ++id; P.set(n, { r, j, t: setTimeout(() => { P.delete(n); j(Error('timeout ' + method)); }, 300000) }); ws.send(JSON.stringify({ id: n, method, params })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result && r.result.value; };
    // headless: captureScreenshot on the main connection sometimes never answers; a fresh CDP connection per shot works
    const wsUrl = t.find(x => x.type === 'page').webSocketDebuggerUrl;
    const shot = async name => {
      for (let k = 0; k < 4; k++){
        const w2 = new WebSocket(wsUrl);
        try {
          await new Promise((r, j) => { w2.onopen = r; w2.onerror = j; });
          const data = await new Promise((r, j) => { const tm = setTimeout(() => j(Error('timeout shot')), 30000);
            w2.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1){ clearTimeout(tm); m.error ? j(Error(JSON.stringify(m.error))) : r(m.result.data); } };
            w2.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } })); });
          fs.writeFileSync(path.join(D, name + '.png'), Buffer.from(data, 'base64')); LOG('shot ' + name + (k ? ' (try ' + (k + 1) + ')' : '')); return;
        } catch (e){ LOG('shot ' + name + ' retry: ' + e.message); await sleep(1500); }
        finally { try { w2.close(); } catch {} }
      }
      R.errors.push('shot failed ' + name);
    };
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    if (PHONE){
      await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    } else await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const t0 = Date.now();
    await send('Page.navigate', { url: 'http://127.0.0.1:8817/' + PAGE });
    LOG('navigate'); await sleep(20000);
    for (let k = 0; k < 900; k++){ let ok = false; try { ok = await ev("typeof window.BOOT!=='undefined' && typeof MENU!=='undefined' && !!MENU.cur"); } catch {} if (ok) break; await sleep(1000); }
    try { await ev('window.BOOT'); } catch (e){ LOG('boot wait ' + e.message); }
    R.bootS = Math.round((Date.now() - t0) / 1000); LOG('boot ' + R.bootS + ' s');
    R.touch = await ev("typeof TOUCH!=='undefined'&&TOUCH.on");
    await ev(fs.readFileSync(path.join(__dirname, 'stand168.js'), 'utf8'));
    // fixed render size for comparable frames: manual graphics "High", resolution 1 (PC) / auto (phone)
    if (!PHONE) await ev("(()=>{try{SET.gfx80=2;SET.res80=1;ADG80.reconf()}catch(e){};return 1})()");
    R.stand = await ev('(async()=>JSON.stringify(await STAND168.setup()))()'); LOG('stand ' + R.stand);
    await sleep(8000);
    const info = () => ev("JSON.stringify({gnd:typeof GND168!=='undefined'?GND168.info():null,as:AS75.info(),fps:(document.getElementById('dbg')||{}).textContent||'',scale:S.scale,cw:document.getElementById('c').width})");
    if (MODE === 'off'){
      await ev("(()=>{V87M.go('rts');return 1})()"); await sleep(3000);
      await ev('STAND168.view(0, 18, 6, 30)'); await sleep(3000);
      await shot('off_bunker');
      R.info = JSON.parse(await info());
      R.offOk = R.info.gnd && R.info.gnd.on === false && R.info.gnd.asHooked === false;
    } else {
      await ev("(()=>{V87M.go('rts');return 1})()"); await sleep(3000);
      const views = PHONE ? [['bunker', 0, 18, 6, 30], ['hull', 6, 22, 8, 50]] : [['bunker', 0, 18, 6, 30], ['hull', 6, 22, 8, 50], ['bay', 2, 24, 7, 25], ['wide', 3, 45, 16, 20]];
      for (const [n, i, d, h, az] of views){
        await ev(`(async()=>{GND168.on=false;await STAND168.view(${i},${d},${h},${az});await new Promise(r=>setTimeout(r,2000));return 1})()`);
        await shot(n + '_off');
        await ev('(async()=>{GND168.on=true;await new Promise(r=>setTimeout(r,3000));return 1})()');
        await shot(n + '_on');
        R.views[n] = JSON.parse(await info()).gnd;
      }
      // cost: average module time per frame over 6 s with the wide view (stats.ms is an EMA, sampled each second)
      const ms = []; for (let k = 0; k < 6; k++){ await sleep(1000); ms.push(await ev('GND168.stats.ms')); }
      R.msAvg = +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(3);
      // first-person: back to the shooter, no camera override
      await ev("(async()=>{S.camOverride=null;STAND168.hud(true);V87M.go('fps');await new Promise(r=>setTimeout(r,3000));return 1})()");
      await ev('(async()=>{GND168.on=false;await new Promise(r=>setTimeout(r,1500));return 1})()'); await shot('fps_off');
      await ev('(async()=>{GND168.on=true;await new Promise(r=>setTimeout(r,2500));return 1})()'); await shot('fps_on');
      R.info = JSON.parse(await info());
    }
    LOG('info ' + JSON.stringify(R.info));
  } catch (e){ R.fatal = e.message; LOG('ERR ' + e.stack); }
  finally {
    fs.writeFileSync(path.join(D, 'result.json'), JSON.stringify(R, null, 1));
    LOG('errors ' + R.errors.length + ' warns ' + R.warns.length);
    try { ws && ws.close(); } catch {} try { process.kill(ch.pid); } catch {} LOG('closed pid ' + ch.pid);
    process.exit(0);
  }
})();
