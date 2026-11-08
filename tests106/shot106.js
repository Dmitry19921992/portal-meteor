// T106: local check of the preview site (dist/preview106*) before / without deploy — headless Chrome, MUTED, own profile,
// closes ONLY its own PID. Serves the folder over http (version.json + l106/dicts.js need http), shots PC 1280×720 and
// phone 844×390 (mobile + touch emulation), checks PREV818 badge, languages, console errors, the "new test build" notice.
//   node tests106/shot106.js <site dir> <tag> [url]     url = check an already deployed site instead of the local folder
const fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process');
const SITE = path.resolve(process.argv[2] || 'D:/AI/pm_v6/dist/preview106'), TAG = process.argv[3] || 't106', REMOTE = process.argv[4] || '';
const D = path.join(__dirname, 'out_' + TAG); fs.mkdirSync(D, { recursive: true });
const HS = [...TAG].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 89, 7), PORT = 8900 + HS, CDP = 9700 + HS;
const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' ' + m; console.log(s); fs.appendFileSync(path.join(D, 'log.txt'), s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { site: REMOTE || SITE, errors: [], warns: [], runs: {} };
let bump = '';   // when set, version.json answers with another id (simulates a new test build)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(SITE, p); if (!f.startsWith(SITE) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  let body = fs.readFileSync(f);
  if (p === '/version.json' && bump){ const j = JSON.parse(body); j.id = bump; body = Buffer.from(JSON.stringify(j)); }
  s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); s.end(body);
});
(async () => {
  if (!REMOTE) await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const URL0 = REMOTE || `http://127.0.0.1:${PORT}/`;
  const prof = path.join(__dirname, 'chrome_' + TAG + '_' + Date.now());
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--window-size=1280,720',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  LOG('chrome pid ' + ch.pid + ' url ' + URL0);
  let ws;
  try {
    let t; for (let k = 0; k < 80; k++){ try { t = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (t.some(x => x.type === 'page')) break; } catch {} await sleep(500); }
    ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const P = new Map(); let run = 'init';
    ws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.id && P.has(m.id)){ const p = P.get(m.id); P.delete(m.id); clearTimeout(p.t); m.error ? p.j(Error(JSON.stringify(m.error))) : p.r(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown'){ const d = m.params.exceptionDetails; R.errors.push(run + ' EXC ' + ((d.exception && d.exception.description) || d.text).slice(0, 300)); }
      if (m.method === 'Runtime.consoleAPICalled'){ const a = m.params.args.map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ').slice(0, 300);
        if (m.params.type === 'error') R.errors.push(run + ' console.error ' + a); else if (m.params.type === 'warning') R.warns.push(run + ' ' + a); }
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon\.ico/.test(m.params.entry.url || '')) R.errors.push(run + ' log ' + (m.params.entry.text || '').slice(0, 200) + ' ' + (m.params.entry.url || '').slice(-60));
    };
    const send = (method, params = {}) => new Promise((r, j) => { const n = ++id; P.set(n, { r, j, t: setTimeout(() => { P.delete(n); j(Error('timeout ' + method)); }, 300000) }); ws.send(JSON.stringify({ id: n, method, params })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result && r.result.value; };
    const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(D, name + '.png'), Buffer.from(r.data, 'base64')); LOG('shot ' + name); };
    const probe = () => ev("(()=>({prev:typeof PREV818!=='undefined'?PREV818.info():null,badge:(document.getElementById('prev818')||{}).textContent||'',badgeBox:(()=>{const b=document.getElementById('prev818');if(!b)return null;const r=b.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})(),upd:(()=>{const u=document.getElementById('prev818u');return u?{show:u.style.display,text:u.textContent}:null})(),langs:typeof V8X_DICT!=='undefined'?Object.keys(V8X_DICT).length:-1,ar:typeof V8X_DICT!=='undefined'&&V8X_DICT.ar?Object.keys(V8X_DICT.ar).length:0,touch:typeof TOUCH!=='undefined'&&!!TOUCH.on,iw:innerWidth,ih:innerHeight,menu:typeof MENU!=='undefined'&&MENU.cur||''}))()");
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    const VIEWS = [
      { n: 'pc', w: 1280, h: 720, mobile: false, dsf: 1 },
      { n: 'phone', w: 844, h: 390, mobile: true, dsf: 2, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' }];
    for (const v of VIEWS){
      run = v.n; const O = R.runs[v.n] = {};
      await send('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: v.dsf, mobile: v.mobile, screenOrientation: v.mobile ? { type: 'landscapePrimary', angle: 90 } : undefined });
      await send('Emulation.setTouchEmulationEnabled', v.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
      await send('Emulation.setUserAgentOverride', { userAgent: v.ua || (await ev('navigator.userAgent')).replace('HeadlessChrome', 'Chrome') });
      bump = ''; const t0 = Date.now();
      await send('Page.navigate', { url: URL0 + (URL0.includes('?') ? '&' : '?') + 'v=' + Date.now() });
      await sleep(8000);
      for (let k = 0; k < 900; k++){ let ok = false;   // hook BOOT as soon as main.js defined it (parse of 10-25 MB takes a while)
        try { ok = await ev("(()=>{if(window.__b106)return true;if(window.BOOT&&window.BOOT.then&&!window.__h106){window.__h106=1;window.BOOT.then(()=>{window.__b106=1},()=>{window.__b106=2})}return false})()"); } catch {}
        if (ok) break; await sleep(1000); }   // headless shader compile here takes 250-450 s
      O.bootS = Math.round((Date.now() - t0) / 1000); LOG(v.n + ' boot ' + O.bootS + ' s');
      await sleep(6000);
      O.menu = await probe(); LOG(v.n + ' menu ' + JSON.stringify(O.menu));
      await shot(v.n + '_01_menu');
      await ev("(()=>{const b=document.getElementById('prev818');if(b)b.click();return 1})()"); await sleep(400);
      O.open = await probe(); await shot(v.n + '_02_badge_open');
      await ev("(()=>{const b=document.getElementById('prev818');if(b)b.click();return 1})()");
      await ev("(async()=>{try{MENU.newGame()}catch(e){};try{MENU.close()}catch(e){};S.paused=false;try{if(typeof T72!=='undefined'&&T72.on&&T72.skip)T72.skip()}catch(e){};return 1})()");
      await sleep(20000);
      O.battle = await probe(); await shot(v.n + '_03_battle');
      if (!REMOTE){   // new build on the "server": the notice must appear on the next check (visibilitychange / timer)
        bump = 'task/T106-preview · fff0000 · 07.11 23:59';
        await ev("(async()=>{await PREV818.check();return 1})()"); await sleep(500);
        O.upd = await probe(); LOG(v.n + ' after bump ' + JSON.stringify(O.upd.upd));
        await shot(v.n + '_04_new_build');
      }
    }
    R.ok = Object.values(R.runs).every(o => o.menu && o.menu.prev && o.menu.prev.on && o.menu.badge) && R.errors.length === 0;
  } catch (e){ R.fatal = String(e && e.stack || e); LOG('FATAL ' + R.fatal); }
  finally {
    fs.writeFileSync(path.join(D, 'result.json'), JSON.stringify(R, null, 1));
    try { ws && ws.close(); } catch {}
    try { require('child_process').spawnSync('taskkill', ['/PID', String(ch.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {}   // whole tree of OUR chrome first
    try { process.kill(ch.pid); } catch {}
    srv.close(); LOG('done ok=' + R.ok + ' errors=' + R.errors.length);
    setTimeout(() => process.exit(0), 1500);
  }
})();
