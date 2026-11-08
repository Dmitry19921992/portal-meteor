// T243 check (adapted from tests819/t120/run120.js): headless Chrome (muted, own profile, closes ONLY its own PID).
// node run120.js <pc|phone|off> <page in D:\AI\pm_v6\dist | https URL> [views=all]
//   pc 1280x720 / phone 390x844 portrait + touch (+ phoneL 844x390) / off: ?t243=0 (T243 must report on=false)
//   For every view: <view>_off.png (T243.enable(false)) and <view>_on.png on the same camera. out_<mode>/result.json
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const MODE = process.argv[2] || 'pc', PAGE0 = process.argv[3] || 'v819_test_t243.html', VIEWS = (process.argv[4] || 'row,tur,aa,extr,etur,eaa,outpost,factory,hub,airdock,esc,ehv,snp,baz,med,rif,dra,drr,apc,hq,ehq').split(',');
const REMOTE = /^https?:/.test(PAGE0), PORT = 8817, DIST = 'D:\\AI\\pm_v6\\dist';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PY = ['C:/Users/klaas/AppData/Roaming/uv/python/cpython-3.12.12-windows-x86_64-none/python.exe'].find(p => fs.existsSync(p)) || 'python';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TAG = (process.env.TAG243 || '') + MODE;
const URL0 = REMOTE ? PAGE0 + (MODE === 'off' ? (PAGE0.includes('?') ? '&' : '?') + 't243=0' : '') : `http://127.0.0.1:${PORT}/${PAGE0}?as3d=local` + (MODE === 'off' ? '&t243=0' : '');
const up = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/version.json`, { method: 'HEAD' })).status < 500; } catch { return false; } };
(async () => {
  let srv = null;
  if (!REMOTE && !(await up())){ srv = spawn(PY, ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: DIST, windowsHide: true, stdio: 'ignore' }); for (let k = 0; k < 40 && !(await up()); k++) await sleep(250); }
  const PHONE = MODE === 'phone' || MODE === 'phoneL', LAND = MODE === 'phoneL', W = LAND ? 844 : PHONE ? 390 : 1280, H = LAND ? 390 : PHONE ? 844 : 720;
  const D = path.join(__dirname, 'out_' + TAG); fs.mkdirSync(D, { recursive: true });
  const CDP = 9500 + ([...TAG].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 97, 7));
  const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' [' + TAG + '] ' + m; console.log(s); fs.appendFileSync(path.join(D, 'log.txt'), s + '\n'); };
  const R = { mode: MODE, page: URL0, size: [W, H], errors: [], warns: [], views: {}, shots: [] };
  const prof = path.join(__dirname, 'chrome_' + TAG + '_' + Date.now());
  const ch = spawn(CHROME, ['--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  LOG('chrome pid ' + ch.pid + ' port ' + CDP + ' ' + URL0);
  let ws;
  try {
    let t; for (let k = 0; k < 80; k++){ try { t = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (t.some(x => x.type === 'page')) break; } catch {} await sleep(500); }
    const wsUrl = t.find(x => x.type === 'page').webSocketDebuggerUrl;
    ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const P = new Map(); let stage = 'boot';
    const err = s => { if (/favicon\.ico/.test(s)) return; R.errors.push(stage + ' ' + s); };
    ws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.id && P.has(m.id)){ const p = P.get(m.id); P.delete(m.id); clearTimeout(p.t); m.error ? p.j(Error(JSON.stringify(m.error))) : p.r(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown'){ const d = m.params.exceptionDetails; err('EXC ' + ((d.exception && d.exception.description) || d.text).slice(0, 400)); }
      if (m.method === 'Runtime.consoleAPICalled'){ const a = m.params.args.map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ').slice(0, 400);
        if (m.params.type === 'error') err('console.error ' + a); else if (m.params.type === 'warning') R.warns.push(stage + ' ' + a); }
      if (m.method === 'Log.entryAdded'){ const en = m.params.entry; if (en.level === 'error') err('log ' + (en.text || '').slice(0, 250) + ' ' + (en.url || '').slice(-70)); }
    };
    const send = (method, params = {}) => new Promise((r, j) => { const n = ++id; P.set(n, { r, j, t: setTimeout(() => { P.delete(n); j(Error('timeout ' + method)); }, 300000) }); ws.send(JSON.stringify({ id: n, method, params })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result && r.result.value; };
    const shot = async name => {
      for (let k = 0; k < 4; k++){
        const w2 = new WebSocket(wsUrl);
        try {
          await new Promise((r, j) => { w2.onopen = r; w2.onerror = j; });
          const data = await new Promise((r, j) => { const tm = setTimeout(() => j(Error('timeout shot')), 30000);
            w2.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1){ clearTimeout(tm); m.error ? j(Error(JSON.stringify(m.error))) : r(m.result.data); } };
            w2.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } })); });
          fs.writeFileSync(path.join(D, name + '.png'), Buffer.from(data, 'base64')); R.shots.push(name); LOG('shot ' + name); return;
        } catch (e){ LOG('shot ' + name + ' retry: ' + e.message); await sleep(1500); } finally { try { w2.close(); } catch {} }
      }
      R.errors.push('shot failed ' + name);
    };
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    if (PHONE){
      await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true, screenOrientation: LAND ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' });
    } else await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const t0 = Date.now();
    await send('Page.navigate', { url: URL0 });
    await sleep(20000);
    let ready = false;
    for (let k = 0; k < 1100 && !ready; k++){ try { ready = await ev("typeof window.BOOT!=='undefined' && typeof MENU!=='undefined' && !!MENU.cur"); } catch {} if (!ready) await sleep(1000); }
    try { await ev('window.BOOT'); } catch (e){ LOG('boot wait ' + e.message); }
    R.bootS = Math.round((Date.now() - t0) / 1000); LOG('boot ' + R.bootS + ' s');
    const info = () => ev("JSON.stringify({t94:typeof T94!=='undefined'?T94.info():null,t120:typeof T120!=='undefined'?T120.info():null,t243:typeof T243!=='undefined'?T243.info():null,touch:typeof TOUCH!=='undefined'&&!!TOUCH.on,fps:(document.getElementById('dbg')||{}).textContent||'',ver:typeof FX87!=='undefined'?FX87.VER:null,prev:typeof PREV818!=='undefined'&&PREV818.info?PREV818.info():null})").then(JSON.parse);
    R.info0 = await info(); LOG('info0 ' + JSON.stringify(R.info0).slice(0, 600));
    await shot('menu');
    stage = 'stand';
    await ev(fs.readFileSync(path.join(__dirname, 'stand243.js'), 'utf8'));
    if (!PHONE) await ev("(()=>{try{SET.gfx80=2;SET.res80=1;ADG80.reconf()}catch(e){};return 1})()");
    R.stand = await ev('(async()=>JSON.stringify(await STAND243.setup()))()'); LOG('stand ' + R.stand);
    try { await ev("(()=>{V87M.go('rts');return 1})()"); } catch (e){}
    // warm-up: look at every entity once so all models get requested and uploaded
    for (const v of VIEWS) { await ev(`STAND243.view('${v}')`); }
    await sleep(10000);
    const tog = on => ev(`(async()=>{for(const M of [typeof T243!=='undefined'?T243:null])if(M&&M.enable)M.enable(${on});await new Promise(r=>setTimeout(r,2000));return 1})()`);
    stage = 'views';
    for (const v of VIEWS){
      R.views[v + '_setup'] = await ev(`STAND243.view('${v}')`);
      if (MODE === 'off'){ await sleep(1500); await shot(v); R.views[v] = await info(); continue; }
      await tog(false); await shot(v + '_off'); R.views[v + '_off'] = await info();
      await tog(true); await shot(v + '_on'); R.views[v] = await info();
      LOG(v + ' t243 drawn ' + (R.views[v].t243 && R.views[v].t243.drawn) + ' kinds ' + JSON.stringify(R.views[v].t243 && R.views[v].t243.kinds) + ' hq ' + JSON.stringify(R.views[v].t243 && R.views[v].t243.hq) + ' t120 drawn ' + (R.views[v].t120 && R.views[v].t120.drawn));
    }
    // normal battle look (camera released, HUD on) for a few seconds
    stage = 'battle';
    await ev("(()=>{S.camOverride=null;STAND243.hud(true);return 1})()"); await sleep(5000);
    R.fps = await ev('new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<5000)requestAnimationFrame(f);else r(+(n*1000/(performance.now()-t0)).toFixed(1))};requestAnimationFrame(f)})');
    await shot('battle'); R.info = await info();
    if (MODE === 'off') R.offOk = !!R.info.t243 && R.info.t243.on === false;
    LOG('fps ' + R.fps + ' info ' + JSON.stringify(R.info.t243).slice(0, 1500));
  } catch (e){ R.fatal = String(e && e.stack || e); LOG('FATAL ' + R.fatal); }
  finally {
    fs.writeFileSync(path.join(D, 'result.json'), JSON.stringify(R, null, 1));
    LOG('errors ' + R.errors.length + ' warns ' + R.warns.length + ' shots ' + R.shots.length);
    try { ws && ws.close(); } catch {}
    try { require('child_process').spawnSync('taskkill', ['/PID', String(ch.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {}
    LOG('closed pid ' + ch.pid);
    if (srv){ try { process.kill(srv.pid); } catch {} }
    setTimeout(() => process.exit(0), 1000);
  }
})();
