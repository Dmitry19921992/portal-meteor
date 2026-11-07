// test/v819-0811 smoke: headless Chrome (MUTED, own profile, closes ONLY its own PID) on http://127.0.0.1:8817/<page>
//   node smoke819.js <page> <tag> <pc|phone> [extra query, e.g. t92=0&t131=0]
// out_<tag>/: menu.png, battle1.png, battle2.png, result.json (errors, module info, fps)
const fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const PAGE = process.argv[2], TAG = process.argv[3] || 'x', MODE = process.argv[4] || 'pc', XQ = process.argv[5] || '';
const PHONE = MODE === 'phone' || MODE === 'phoneL', LAND = MODE === 'phoneL', W = LAND ? 844 : PHONE ? 390 : 1280, H = LAND ? 390 : PHONE ? 844 : 720;
const D = path.join(__dirname, 'out_' + TAG); fs.mkdirSync(D, { recursive: true });
const CDP = 9600 + ([...TAG].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 97, 3));
const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' ' + m; console.log(s); fs.appendFileSync(path.join(D, 'log.txt'), s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = /^https?:/.test(PAGE) ? PAGE + (XQ ? (PAGE.includes('?') ? '&' : '?') + XQ : '') : 'http://127.0.0.1:8817/' + PAGE + '?as3d=local' + (XQ ? '&' + XQ : '');
const R = { page: URL0, mode: MODE, errors: [], warns: [], info: {} };
(async () => {
  const prof = path.join(__dirname, 'chrome_' + TAG + '_' + Date.now());
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  LOG('chrome pid ' + ch.pid + ' port ' + CDP + ' ' + URL0);
  let ws;
  try {
    let t; for (let k = 0; k < 80; k++){ try { t = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (t.some(x => x.type === 'page')) break; } catch {} await sleep(500); }
    const wsUrl = t.find(x => x.type === 'page').webSocketDebuggerUrl;
    ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const P = new Map(); let stage = 'boot';
    ws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.id && P.has(m.id)){ const p = P.get(m.id); P.delete(m.id); clearTimeout(p.t); m.error ? p.j(Error(JSON.stringify(m.error))) : p.r(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown'){ const d = m.params.exceptionDetails; R.errors.push(stage + ' EXC ' + ((d.exception && d.exception.description) || d.text).slice(0, 400)); }
      if (m.method === 'Runtime.consoleAPICalled'){ const a = m.params.args.map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ').slice(0, 400);
        if (m.params.type === 'error') R.errors.push(stage + ' console.error ' + a); else if (m.params.type === 'warning') R.warns.push(stage + ' ' + a); }
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon\.ico/.test(m.params.entry.url || '')) R.errors.push(stage + ' log ' + (m.params.entry.text || '').slice(0, 300) + ' ' + (m.params.entry.url || '').slice(-80));
    };
    const send = (method, params = {}) => new Promise((r, j) => { const n = ++id; P.set(n, { r, j, t: setTimeout(() => { P.delete(n); j(Error('timeout ' + method)); }, 300000) }); ws.send(JSON.stringify({ id: n, method, params })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result && r.result.value; };
    const shot = async name => {   // fresh CDP connection per shot (headless sometimes never answers on the main one)
      for (let k = 0; k < 4; k++){
        const w2 = new WebSocket(wsUrl);
        try {
          await new Promise((r, j) => { w2.onopen = r; w2.onerror = j; });
          const data = await new Promise((r, j) => { const tm = setTimeout(() => j(Error('timeout shot')), 30000);
            w2.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1){ clearTimeout(tm); m.error ? j(Error(JSON.stringify(m.error))) : r(m.result.data); } };
            w2.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } })); });
          fs.writeFileSync(path.join(D, name + '.png'), Buffer.from(data, 'base64')); LOG('shot ' + name); return;
        } catch (e){ LOG('shot retry ' + e.message); await sleep(1500); } finally { try { w2.close(); } catch {} }
      }
      R.errors.push('shot failed ' + name);
    };
    const info = () => ev(`JSON.stringify((()=>{const o={};const g=(k,f)=>{try{o[k]=f()}catch(e){o[k]='ERR '+e.message}};
      g('ver',()=>typeof FX87!=='undefined'?FX87.VER:null);
      g('t92',()=>typeof T92!=='undefined'?{on:T92.on,st:T92.stats,err:Object.keys(T92.err)}:'none');
      g('t131',()=>typeof DET131!=='undefined'?{on:DET131.on,err:Object.keys(DET131.err)}:'none');
      g('gnd168',()=>typeof GND168!=='undefined'?GND168.info():'none');
      g('mat169',()=>typeof MAT169!=='undefined'?MAT169.info():'none');
      g('mus159',()=>typeof MUS159!=='undefined'?(MUS159.info?MUS159.info():{on:MUS159.on}):'none');
      g('t35',()=>typeof CX820!=='undefined'?{on:CX820.on}:'none');
      g('t31',()=>typeof T31!=='undefined'?{on:T31.on,st:T31.stats,err:Object.keys(T31.err)}:'none');
      g('t24',()=>typeof T24!=='undefined'?{on:T24.on}:'none');
      g('prev',()=>typeof PREV818!=='undefined'?PREV818.info():'none');
      g('touch',()=>typeof TOUCH!=='undefined'&&!!TOUCH.on);
      g('scale',()=>S.scale); g('mode',()=>S.mode); g('menu',()=>typeof MENU!=='undefined'?MENU.cur:null);
      g('dbg',()=>(document.getElementById('dbg')||{}).textContent||'');
      g('adg',()=>typeof ADG80!=='undefined'?{L:ADG80.L}:null);
      return o})())`);
    const fps = () => ev('new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<5000)requestAnimationFrame(f);else r(+(n*1000/(performance.now()-t0)).toFixed(1))};requestAnimationFrame(f)})');
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    if (PHONE){
      await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true, screenOrientation: LAND ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' });
    } else await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const t0 = Date.now();
    await send('Page.navigate', { url: URL0 });
    await sleep(15000);
    for (let k = 0; k < 900; k++){ let ok = false; try { ok = await ev("typeof MENU!=='undefined' && !!MENU.cur"); } catch {} if (ok) break; await sleep(1000); }
    try { await ev('window.BOOT'); } catch (e){ LOG('boot wait ' + e.message); }
    R.bootS = Math.round((Date.now() - t0) / 1000); LOG('boot ' + R.bootS + ' s');
    await sleep(4000);
    stage = 'menu'; R.info.menu = JSON.parse(await info()); await shot('menu');
    stage = 'battle';
    await ev("(async()=>{try{MENU.newGame()}catch(e){};try{MENU.close()}catch(e){};S.paused=false;try{if(typeof T72!=='undefined'&&T72.on&&T72.skip)T72.skip()}catch(e){};return 1})()");
    await sleep(20000);
    R.fps1 = await fps(); R.info.battle1 = JSON.parse(await info()); await shot('battle1');
    await sleep(25000);
    R.fps2 = await fps(); R.info.battle2 = JSON.parse(await info()); await shot('battle2');
    LOG('fps ' + R.fps1 + ' / ' + R.fps2 + ' info ' + JSON.stringify(R.info.battle2).slice(0, 900));
  } catch (e){ R.fatal = String(e && e.stack || e); LOG('FATAL ' + R.fatal); }
  finally {
    fs.writeFileSync(path.join(D, 'result.json'), JSON.stringify(R, null, 1));
    LOG('errors ' + R.errors.length + ' warns ' + R.warns.length);
    try { ws && ws.close(); } catch {}
    try { spawnSync('taskkill', ['/PID', String(ch.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {}
    LOG('closed pid ' + ch.pid);
    setTimeout(() => process.exit(0), 1000);
  }
})();
