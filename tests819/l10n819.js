// test/v819-0811 l10n smoke (T181b): headless Chrome (MUTED, own profile, closes ONLY its own PID)
//   node l10n819.js <page|url> <tag> <pc|phone> [langs=ru,en,ar,ta,ka]
// Boot to menu -> check patches dict_fix_opus_1108 / dict_v819_new_1108 really reach L79.lookup -> switch languages in the menu
// (text, script share, dir=rtl, raw keys) -> battle in the last-but-one language (ar) -> console errors. out_<tag>/: menu_<L>.png, battle.png, result.json
const fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const PAGE = process.argv[2], TAG = process.argv[3] || 'l10n', MODE = process.argv[4] || 'pc', LANGS = (process.argv[5] || 'ru,en,ar,ta,ka').split(',');
const PHONE = MODE === 'phone', W = PHONE ? 390 : 1280, H = PHONE ? 844 : 720;
const D = path.join(__dirname, 'out_' + TAG); fs.mkdirSync(D, { recursive: true });
const CDP = 9700 + ([...TAG].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 97, 5));
const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' ' + m; console.log(s); fs.appendFileSync(path.join(D, 'log.txt'), s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = /^https?:/.test(PAGE) ? PAGE : 'http://127.0.0.1:8817/' + PAGE + '?as3d=local';
const R = { page: URL0, mode: MODE, errors: [], warns: [], patch: null, langs: {} };
const SCRIPT = { ru: '[А-Яа-яЁё]', en: '[A-Za-z]', ar: '[\\u0600-\\u06FF]', ta: '[\\u0B80-\\u0BFF]', ka: '[\\u10A0-\\u10FF]', hy: '[\\u0530-\\u058F]', be: '[ЎўІі]', sw: '[A-Za-z]' };
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
    const shot = async name => {
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
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    if (PHONE){
      await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
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
    stage = 'patch';
    R.ver = await ev("(()=>{try{return (typeof FX87!=='undefined'?FX87.VER:'?')+' | '+((typeof PREV818!=='undefined'&&PREV818.info)?JSON.stringify(PREV818.info()).slice(0,120):'')}catch(e){return 'ERR '+e.message}})()");
    R.patch = await ev(`(()=>{const o={};const F=typeof V8X_FIX_OPUS_1108!=='undefined'?V8X_FIX_OPUS_1108:null, N=typeof V8X_LANG_v819_1108!=='undefined'?V8X_LANG_v819_1108:null;
      o.fix=!!F;o.nw=!!N;o.dictLangs=typeof V8X_DICT!=='undefined'?Object.keys(V8X_DICT).length:0;o.known=typeof L79!=='undefined'&&L79.known?['ar','ta','ka','hy','be','sw','ur'].filter(c=>L79.known(c)).join(' '):'?';
      const chk=T=>{const r={langs:0,keys:0,dictOk:0,lookOk:0,lookOther:0,bad:[]};if(!T)return r;for(const L in T){r.langs++;const C=typeof V8X!=='undefined'&&V8X.code?V8X.code(L):L;for(const k in T[L]){r.keys++;const v=T[L][k];if(V8X_DICT[C]&&V8X_DICT[C][k]===v)r.dictOk++;let lk;try{lk=L79.lookup(L,k)}catch(e){lk='ERR '+e.message}
        if(lk===v||(lk===undefined&&v===k))r.lookOk++;else{r.lookOther++;if(r.bad.length<8)r.bad.push([L,k.slice(0,60),String(lk).slice(0,60),String(v).slice(0,60)])}}}return r};
      o.fixChk=chk(F);o.newChk=chk(N);return o})()`);
    LOG('patch ' + JSON.stringify(R.patch).slice(0, 900));
    for (const L of LANGS){
      stage = 'lang ' + L;
      R.langs[L] = await ev(`(async()=>{const L=${JSON.stringify(L)};SET.lang=L;MENU.applyLang();try{MENU.show(MENU.cur)}catch(e){}
        await new Promise(r=>setTimeout(r,2000));const sc=document.getElementById('screen');const tx=((sc&&sc.innerText)||document.body.innerText||'');
        const letters=(tx.match(/\\p{L}/gu)||[]).length, own=(tx.match(new RegExp(${JSON.stringify(SCRIPT[L] || '\\p{L}')},'gu'))||[]).length;
        const raw=tx.match(/\\{\\d+\\}|undefined|\\bnull\\b|NaN|\\[object|\\br\\d{2,}\\b|\\$\\{/g)||[];
        const F=typeof V8X_FIX_OPUS_1108!=='undefined'&&V8X_FIX_OPUS_1108[L]||{};const seen=Object.keys(F).filter(k=>F[k].length>3&&tx.includes(F[k])).slice(0,5).map(k=>[k.slice(0,40),F[k].slice(0,60)]);
        return {lang:SET.lang,cur:typeof LANG!=='undefined'?LANG.cur:null,menu:MENU.cur,dir:sc&&sc.getAttribute('dir'),l818:document.documentElement.getAttribute('data-l818'),
          letters,own,share:letters?+(own/letters).toFixed(2):0,raw,cyr:(L!=='ru'&&L!=='be')?(tx.match(/[А-Яа-яЁё]/g)||[]).length:null,fixSeen:seen,text:tx.replace(/\\s+/g,' ').slice(0,400)}})()`);
      LOG(L + ' ' + JSON.stringify(R.langs[L]).slice(0, 500)); await shot('menu_' + L);
    }
    const BL = LANGS.includes('ar') ? 'ar' : LANGS[LANGS.length - 1];
    stage = 'battle ' + BL;
    await ev(`(async()=>{SET.lang=${JSON.stringify(BL)};MENU.applyLang();try{MENU.newGame()}catch(e){};try{MENU.close()}catch(e){};S.paused=false;try{if(typeof T72!=='undefined'&&T72.on&&T72.skip)T72.skip()}catch(e){};return 1})()`);
    await sleep(25000);
    R.battle = await ev(`(()=>{const tx=document.body.innerText||'';const letters=(tx.match(/\\p{L}/gu)||[]).length,own=(tx.match(new RegExp(${JSON.stringify(SCRIPT[BL] || '\\p{L}')},'gu'))||[]).length;
      return {lang:SET.lang,mode:S.mode,share:letters?+(own/letters).toFixed(2):0,raw:tx.match(/\\{\\d+\\}|undefined|\\bnull\\b|NaN|\\[object/g)||[],leak:typeof L818!=='undefined'&&L818.leaks?L818.leaks().slice(0,5):null,text:tx.replace(/\\s+/g,' ').slice(0,300)}})()`);
    LOG('battle ' + JSON.stringify(R.battle).slice(0, 600)); await shot('battle_' + BL);
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
