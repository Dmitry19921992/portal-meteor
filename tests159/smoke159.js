// T159 smoke / feature test: headless Chrome (muted, own profile, closes ONLY its own PID).
// node tests159/smoke159.js <page> <query> <tag> [phone]
//   menu theme after a gesture -> battle: layers start, heat injected (enemy fire + booms near the camera) -> level 1 -> 2,
//   calm again -> back down; pause muffles; radio on -> music silent; settings row present (PC / phone); screenshots.
// Music level is measured on a tap AnalyserNode behind MUS159.out (real audio, not only the state flags).
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const PAGE = process.argv[2] || 't159_test.html', QY = process.argv[3] || '', TAG = process.argv[4] || 'pc', PHONE = process.argv[5] === 'phone';
const D = path.join(__dirname, 'out'); fs.mkdirSync(D, { recursive: true });
const W = PHONE ? 844 : 1600, H = PHONE ? 390 : 900, CDP = 9590 + (PHONE ? 1 : 0) + (QY ? 2 : 0);
const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' [' + TAG + '] ' + m; console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { page: PAGE, q: QY, tag: TAG, errors: [], warns: [], steps: [] };
(async () => {
  const prof = path.join(__dirname, 'chrome_' + TAG);
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  LOG('chrome pid ' + ch.pid);
  let ws;
  try {
    let t; for (let k = 0; k < 80; k++){ try { t = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (t.some(x => x.type === 'page')) break; } catch {} await sleep(500); }
    ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const P = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.id && P.has(m.id)){ const p = P.get(m.id); P.delete(m.id); m.error ? p.j(Error(JSON.stringify(m.error))) : p.r(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown'){ const d = m.params.exceptionDetails; R.errors.push('EXC ' + ((d.exception && d.exception.description) || d.text).slice(0, 300)); }
      if (m.method === 'Runtime.consoleAPICalled'){ const a = m.params.args.map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ').slice(0, 300);
        if (m.params.type === 'error') R.errors.push('console.error ' + a); else if (m.params.type === 'warning') R.warns.push(a); }
    };
    const send = (method, params = {}) => new Promise((r, j) => { const n = ++id; P.set(n, { r, j }); ws.send(JSON.stringify({ id: n, method, params })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.exceptionDetails) return 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 400); return r.result && r.result.value; };
    const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(D, name + '.png'), Buffer.from(r.data, 'base64')); LOG('shot ' + name); };
    const st = async tag => { const v = await ev(`(()=>{ if (typeof MUS159==='undefined') return {none:1}; const M=MUS159; let rms=null;
        if (window.__t159an){ const b=new Float32Array(2048); __t159an.getFloatTimeDomainData(b); let s=0; for(const x of b) s+=x*x; rms=+(20*Math.log10(Math.sqrt(s/b.length)+1e-9)).toFixed(1); }
        return {spk:!!AU.speaking, v66:!!(typeof VOICE66!=='undefined'&&VOICE66.cur), off:M.off, mode:M.mode, heat:+(M.hv||0).toFixed(2), want:M.want, level:M.level, resting:M.resting, started:M.started, layers:M.layers.map(L=>L.v), menu:M.menuEl?!M.menuEl.paused:false,
          gain:+(M.gainV||0).toFixed(3), duck:+(M.duckV||0).toFixed(2), sfxRms:+(M.sfxRms||0).toFixed(3), sfxAvg:+(M.sfxAvg||0).toFixed(3), lpf:M.lpfV, rmsDb:rms, ctx:AU.ctx&&AU.ctx.state, cred:(document.getElementById('mus159')||{}).textContent||''}; })()`);
      R.steps.push({ tag, t: Date.now(), v }); LOG(tag + ' ' + JSON.stringify(v)); return v; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: PHONE ? 2 : 1, mobile: PHONE });
    if (PHONE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Page.navigate', { url: 'http://127.0.0.1:8829/' + PAGE + QY });
    await sleep(12000);
    for (let k = 0; k < 600; k++){ const ok = await ev("typeof MENU!=='undefined' && !!MENU.cur && typeof S!=='undefined' && !!S.attract"); if (ok === true) break; await sleep(1000); }
    LOG('menu ready');
    // 1) main menu: first gesture -> menu theme
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: H - 5, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: H - 5, button: 'left', clickCount: 1 });
    await ev("(()=>{try{AU.init()}catch(e){}; return 1})()");
    await sleep(1500);
    await ev(`(()=>{ if (typeof MUS159==='undefined'||MUS159.off||!MUS159.out) return 0; const a=AU.ctx.createAnalyser(); a.fftSize=2048; MUS159.out.connect(a); window.__t159an=a; return 1; })()`);
    // timeline sampler (4 Hz): heat, layer gains (scheduled), measured music level — for the Fitba card chart
    await ev(`(()=>{ window.__t159tl=[]; const t0=performance.now(); const b=new Float32Array(2048); setInterval(()=>{ try{ const M=MUS159; let r=-90; if(window.__t159an){ __t159an.getFloatTimeDomainData(b); let s=0; for(const x of b) s+=x*x; r=20*Math.log10(Math.sqrt(s/b.length)+1e-9); }
      if(!window.__t159an&&M.out){ const a=AU.ctx.createAnalyser(); a.fftSize=2048; M.out.connect(a); window.__t159an=a; } __t159tl.push([+((performance.now()-t0)/1000).toFixed(2), +(M.hv||0).toFixed(3), M.layers.map(L=>+L.g.gain.value.toFixed(3)), +r.toFixed(1), M.mode, MENU.isOpen()&&!S.attract?1:0, (typeof R79!=='undefined'&&R79.on)?1:0]); }catch(e){} }, 250); return 1; })()`);
    await sleep(1500); await shot('menu_' + TAG);
    await sleep(2500); await st('menu');
    // 2) battle
    await ev("(async()=>{try{MENU.newGame()}catch(e){};try{MENU.close()}catch(e){};S.paused=false;try{if(typeof T72!=='undefined'&&T72.on&&T72.skip)T72.skip()}catch(e){};try{if(typeof TUT!=='undefined')TUT.on=false}catch(e){};try{if(V87M.mode()!=='fps')V87M.go('fps')}catch(e){};return 1})()");
    await sleep(3500); await st('battle_start'); await shot('cred_' + TAG);
    await sleep(5500);
    // keep enemies away from the camera for the calm phase (the test controls heat)
    await ev("(()=>{ window.__t159nf=MUS159.nearFoes; MUS159.nearFoes=()=>0; MUS159.heat=0; return 1})()");
    await sleep(6000); await st('battle_calm');
    // 3) contact: enemy rifle fire near the camera for 6 s
    await ev(`(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms)); for(let i=0;i<30;i++){ const p=S.cam.pos.map((x,k)=>x+(k===0?25:0)); emit('shot',{pos:p,team:1,src:null}); await sl(200);} return 1})()`);
    await st('contact_now'); await sleep(5000); await st('contact');
    // 4) heavy fight: booms + heavy fire + whiz for 8 s
    await ev(`(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms)); for(let i=0;i<40;i++){ const p=S.cam.pos.map((x,k)=>x+(k===2?18:0)); emit('shot',{pos:p,team:1,src:null,heavy:true}); if(i%5===0) emit('boom',{pos:p,size:1.5}); if(i%7===0) emit('whiz',{}); await sl(200);} return 1})()`);
    await st('combat_now'); await sleep(4500); await st('combat'); await shot('battle_' + TAG);
    // 5) pause: quieter + muffled
    await ev("(()=>{try{MENU.pause()}catch(e){}; return 1})()"); await sleep(2500); await st('pause');
    await ev("(()=>{try{MENU.show('settings')}catch(e){}; return !!document.querySelector('[data-sl=mus159vol],[data-mus159v]')})()").then(v => { R.settingsRow = v; LOG('settings row ' + v); });
    await sleep(800);
    if (PHONE) await ev("(()=>{try{ if (typeof P71M!=='undefined'){ const b=[...document.querySelectorAll('[data-p71s=s_snd],[data-sec=s_snd],button')].find(x=>/Звук|Sound/i.test(x.textContent)); if(b) b.click(); } }catch(e){}; return !!document.querySelector('[data-mus159v]')})()").then(v => { R.phoneRow = v; LOG('phone row ' + v); });
    await sleep(800); await shot('settings_' + TAG);
    R.rowsHtml = await ev("(()=>{const e=document.querySelector('[data-sl=mus159vol],[data-mus159v]'); return e? e.closest('.row,.p71s').outerHTML.slice(0,400):''})()");
    await ev("(()=>{try{MENU.close()}catch(e){}; S.paused=false; return 1})()"); await sleep(1500);
    // 6) calm again: heat decays -> level down after the hold (≥ 4 bars)
    await sleep(22000); await st('calm_again');
    // 7) radio on -> music silent
    await ev("(()=>{ if (typeof R79==='undefined') return 0; R79.on=true; R79.st='play'; return 1})()"); await sleep(2500); await st('radio_on');
    await ev("(()=>{ if (typeof R79==='undefined') return 0; R79.on=false; R79.st='off'; return 1})()"); await sleep(2500); await st('radio_off');
    // 7b) hidden tab (rAF stops in a real hidden tab): visibilitychange alone must silence the bus
    R.hidden = await ev(`(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms)); const raf=window.requestAnimationFrame; window.requestAnimationFrame=()=>0;
      Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'}); document.dispatchEvent(new Event('visibilitychange')); await sl(1200);
      const g=MUS159.out.gain.value; Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'}); document.dispatchEvent(new Event('visibilitychange'));
      window.requestAnimationFrame=raf; requestAnimationFrame(frame); await sl(1500); return {hiddenGain:+g.toFixed(4), backGain:+MUS159.out.gain.value.toFixed(3)}; })()`);
    LOG('hidden ' + JSON.stringify(R.hidden));
    // 8) volume 0 -> off
    await ev("(()=>{SET.mus159vol=0; return 1})()"); await sleep(2000); await st('vol0'); await ev("(()=>{SET.mus159vol=0.5; return 1})()");
    // 9) back to main menu -> menu theme again
    await ev("(()=>{try{MENU.toMenu()}catch(e){}; return 1})()"); await sleep(5000); await st('menu_again');
    R.timeline = await ev("window.__t159tl||[]");
    R.nodes = await ev("(()=>typeof MUS159==='undefined'?'undef':({off:MUS159.off, data:typeof MUS159_DATA!=='undefined'}))()");
  } catch (e){ R.fatal = e.stack; LOG('ERR ' + e.stack); }
  finally { fs.writeFileSync(path.join(D, 'smoke_' + TAG + '.json'), JSON.stringify(R, null, 1)); try { ws && ws.close(); } catch {} try { process.kill(ch.pid); } catch {} LOG('errors ' + R.errors.length + '; closed pid ' + ch.pid); }
})();
