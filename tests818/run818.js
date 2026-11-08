// v8.18 check on the real GPU (headless Chrome, muted, own profile; closes ONLY its own PID).
// node run818.js <page> <tag> [full]   page: v818_test.html | t54_hq_check.html ; full = language + controls tests
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const PAGE = process.argv[2] || 'v818_test.html', TAG = process.argv[3] || 'v818', FULL = process.argv[4] === 'full';
const D = path.join(__dirname, 'out_' + TAG); fs.mkdirSync(D, { recursive: true });
const W = 1920, H = 1080, CDP = 9600 + (TAG.length * 7 + TAG.charCodeAt(0)) % 300;
const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' ' + m; console.log(s); fs.appendFileSync(path.join(D, 'log.txt'), s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { page: PAGE, errors: [], warns: [] };
(async () => {
  const prof = path.join(__dirname, 'chrome_' + TAG + '_' + Date.now());
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  LOG('chrome pid ' + ch.pid + ' port ' + CDP + ' page ' + PAGE);
  fs.writeFileSync(path.join(D, 'chrome.pid'), String(ch.pid));
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
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') R.errors.push('log ' + (m.params.entry.text || '').slice(0, 200) + ' ' + (m.params.entry.url || '').slice(-60));
    };
    const send = (method, params = {}) => new Promise((r, j) => { const n = ++id; P.set(n, { r, j, t: setTimeout(() => { P.delete(n); j(Error('timeout ' + method)); }, 600000) }); ws.send(JSON.stringify({ id: n, method, params })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result && r.result.value; };
    const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(D, name + '.png'), Buffer.from(r.data, 'base64')); LOG('shot ' + name); };
    const key = (code, o = {}) => ev(`(()=>{const k=${JSON.stringify(Object.assign({ code, key: code.replace(/^Key|^Digit/, ''), bubbles: true, cancelable: true }, o))};window.dispatchEvent(new KeyboardEvent('keydown',k));window.dispatchEvent(new KeyboardEvent('keyup',k));return 1})()`);
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const t0 = Date.now();
    await send('Page.navigate', { url: 'http://127.0.0.1:8817/' + PAGE });
    LOG('navigate'); await sleep(20000);
    for (let k = 0; k < 900; k++){ let ok = false; try { ok = await ev("typeof window.BOOT!=='undefined' && typeof MENU!=='undefined' && !!MENU.cur"); } catch {} if (ok) break; await sleep(1000); }
    try { await ev('window.BOOT'); } catch (e){ LOG('boot wait ' + e.message); }
    R.bootS = Math.round((Date.now() - t0) / 1000); LOG('boot ' + R.bootS + ' s');
    const gfx = () => ev("(()=>{const c=document.getElementById('c');const i=typeof GFX818!=='undefined'?GFX818.info():(typeof ADG80!=='undefined'?ADG80.info():{});return {cw:c.width,ch:c.height,iw:innerWidth,ih:innerHeight,scale:S.scale,q:S.quality,L:i.L,s:i.s,mode:i.mode,hint:i.hint,gpu:(i.gpu||'').slice(0,60),f:i.f,f818:i.f818,emergency:i.emergency,floorOn:i.floorOn,log:(typeof ADG80!=='undefined'?ADG80.log.slice(-14):[])}})()");
    await sleep(8000);
    R.menu = await gfx(); LOG('menu gfx ' + JSON.stringify(R.menu));
    await shot('01_menu');
    // ---- battle
    await ev("(async()=>{try{MENU.newGame()}catch(e){};try{MENU.close()}catch(e){};S.paused=false;try{if(typeof T72!=='undefined'&&T72.on&&T72.skip)T72.skip()}catch(e){};return 1})()");
    await sleep(30000);
    R.battle30 = await gfx(); LOG('battle 30s ' + JSON.stringify(R.battle30));
    await ev("(()=>{try{S.debug=true}catch(e){};return 1})()");
    await sleep(15000);
    R.battle45 = await gfx(); LOG('battle 45s ' + JSON.stringify(R.battle45));
    R.dbg = await ev("(document.getElementById('dbg')||{}).textContent||''"); LOG('dbg ' + JSON.stringify(R.dbg));
    await shot('02_battle');
    await ev("(()=>{S.debug=false;return 1})()");
    if (FULL){
      // ---- controls
      const md = () => ev("(()=>({m:V87M.mode(),me:S.me&&S.me.cls,cmd:!!(typeof CMD85!=='undefined'&&CMD85.on)}))()");
      const C = R.ctl = [];
      const step = async (what, fn) => { try { await fn(); await sleep(1500); const m = await md(); C.push(what + ' → ' + JSON.stringify(m)); LOG('ctl ' + what + ' → ' + JSON.stringify(m)); } catch (e){ C.push(what + ' ERR ' + e.message); } };
      await ev("(()=>{if(V87M.mode()!=='fps')V87M.go('fps');return 1})()"); await sleep(1500);
      await step('start', async () => {});
      await step('Tab', () => key('Tab'));
      await step('Tab', () => key('Tab'));
      await shot('03_commander');
      R.cmdTip = await ev("(document.querySelector('#c85 .c5tip')||{}).textContent||''"); LOG('c5tip ' + R.cmdTip);
      R.feedTxt = await ev("(document.getElementById('feed')||{}).innerText||''");
      await step('X in commander (dive)', () => key('KeyX'));
      await step('Tab (fps→rts)', () => key('Tab'));
      await step('X in strategist (possess)', () => ev("(()=>{const g=groupsOf(0).find(g=>g.cls!=='builder'&&isSquad(g));if(g){S.sel.clear();S.sel.add(g)};return 1})()").then(() => key('KeyX')));
      await step('P in fps (no mode)', () => key('KeyP'));
      await step('Alt+2', () => key('Digit2', { altKey: true, key: '2' }));
      await step('P in commander (nothing)', () => key('KeyP'));
      await step('Alt+3', () => key('Digit3', { altKey: true, key: '3' }));
      await step('Alt+1', () => key('Digit1', { altKey: true, key: '1' }));
      await step('Shift+Tab', () => key('Tab', { shiftKey: true }));
      R.ctlStats = await ev("typeof CTL818!=='undefined'?CTL818.stats:null");
      R.helpFPS = await ev("typeof helpFPS==='function'?helpFPS().replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').slice(0,3000):''");
      R.pcBtns = await ev("(()=>{const out=[];for(const s of ['#touch','#c85 .c5mb','#m74go','.p71','#t64']){const e=document.querySelector(s);if(e){const cs=getComputedStyle(e);out.push(s+':'+cs.display+'/'+cs.visibility+'/'+e.offsetWidth)}};return out.join(' ; ')+' | bodyClass='+document.body.className})()");
      LOG('pcBtns ' + R.pcBtns);
      // ---- languages: tg / zh / he — pause menu, battle feed, voice subtitles
      R.lang = {};
      for (const L of ['tg', 'zh', 'he', 'uz', 'es']){
        const r = await ev(`(async()=>{
          L818.leak.clear(); SET.lang=${JSON.stringify(L)}; MENU.applyLang();
          if(V87M.mode()!=='fps')V87M.go('fps');
          const g=groupsOf(0).find(g=>isSquad(g)); const m0=L818.muted;
          try{ VOICE66.last=0; VOICE66.say(g||S.me,'sel',true); }catch(e){}
          await new Promise(r=>setTimeout(r,400));
          const sub=VOICE66.lastText, cur=!!VOICE66.cur, muted=L818.muted-m0;
          try{ AU.ack(g,'move'); }catch(e){}
          MENU.pause(); await new Promise(r=>setTimeout(r,500));
          const txt=document.body.innerText;
          const cyr=(txt.match(/[^\\n]*[А-Яа-яЁё][^\\n]*/g)||[]).slice(0,40);
          const ruOnly=(txt.match(/[^\\n]*[ыщьцЫЩЬЦ][^\\n]*/g)||[]).slice(0,40);
          const curMenu=MENU.cur;
          // смена языка в Настройках — экран остаётся
          MENU.show('settings', true); const b=document.querySelector('#screen [data-l79set="en"]'); let stay='no-btn';
          if(b){ b.click(); await new Promise(r=>setTimeout(r,300)); stay=MENU.cur; SET.lang=${JSON.stringify(L)}; MENU.applyLang(); MENU.show(MENU.cur); }
          return {sub, cur, muted, curMenu, stay, cyr, ruOnly, leaks:L818.leaks().slice(0,25), pack:VOICE66.packLang()};
        })()`);
        R.lang[L] = r; LOG('lang ' + L + ' ' + JSON.stringify(r).slice(0, 1500));
        await shot('04_pause_' + L);
        await ev("(()=>{MENU.resume&&MENU.resume();S.paused=false;return 1})()"); await sleep(4000);
        R.lang[L].battleCyr = await ev("(()=>{const t=document.body.innerText;return {cyr:(t.match(/[^\\n]*[А-Яа-яЁё][^\\n]*/g)||[]).slice(0,30),ruOnly:(t.match(/[^\\n]*[ыщьцЫЩЬЦ][^\\n]*/g)||[]).slice(0,30),leaks:L818.leaks().slice(0,25)}})()");
        await shot('05_battle_' + L);
      }
      // ---- main menu with the fan (simple + normal UI levels)
      await ev("(()=>{SET.lang='ru';MENU.applyLang();MENU.toMenu();return 1})()"); await sleep(5000);
      await shot('06_main_normal');
      R.mainSel = await ev("(()=>({sel:!!document.querySelector('#screen .l79sel'),words:L79.WORDS.length,langs:L79.LIST.length,added:L818.added}))()"); LOG('main ' + JSON.stringify(R.mainSel));
      await ev("(()=>{SET.ui815='simple';UI815.apply();MENU.show('main');return 1})()"); await sleep(1500);
      R.mainSimple = await ev("(()=>({sel:!!document.querySelector('#screen .u8l79 .l79sel'),cur:MENU.cur}))()"); LOG('simple ' + JSON.stringify(R.mainSimple));
      await shot('07_main_simple');
      await ev("(()=>{const b=document.querySelector('#screen [data-l79more]');b&&b.click();return 1})()"); await sleep(1200);
      await shot('08_lang_list');
      await ev("(()=>{SET.ui815='normal';UI815.apply();MENU.show('main');return 1})()");
    }
    R.final = await gfx();
  } catch (e){ LOG('ERR ' + e.stack); R.fatal = e.message; }
  finally {
    fs.writeFileSync(path.join(D, 'result.json'), JSON.stringify(R, null, 1));
    LOG('errors ' + R.errors.length + ' warns ' + R.warns.length);
    try { ws && ws.close(); } catch {}
    try { process.kill(ch.pid); } catch {}
    LOG('closed pid ' + ch.pid);
  }
})();
