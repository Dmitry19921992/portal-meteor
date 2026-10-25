// CDP-???????? ????? rtsui: node rtsui_cdp.js <file.js | -e "code"> [--vp 1280x720 | --phone] [--reload] [--shot out.jpg] [--port 9235]
// ???????? ???? ????????? ?????? ???? ??????? ??????, ??????? ??? (????????????, ????, ????????) ? ?? ???? ??????.
// ??? ??????????? ?????? async-???????; ????? ???????? shot('path') ? ???????? ??????? ?????.
const fs = require('fs');
(async () => {
  const a = process.argv.slice(2);
  const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const code = a[0] === '-e' ? a[1] : fs.readFileSync(a[0], 'utf8');
  const port = opt('--port') || process.env.CDP_PORT || 9246;
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const tgt = opt('--target') || 'dist/v73.html';
  const t = list.find(x => x.type === 'page' && x.url.includes(tgt));
  if (!t){ console.log('NO TARGET', list.map(x => x.url)); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {}; const logs = [];
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; }
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) logs.push(m.params.type + ': ' + m.params.args.map(x => x.value || x.description).join(' ').slice(0, 400));
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 900));
    else if (m.method === 'Runtime.bindingCalled' && m.params.name === 'cdpShot'){ pendingShots.push(m.params.payload); }
  };
  const pendingShots = [];
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable'); await send('Page.bringToFront');   // фоновая вкладка не рисует кадры
  const andr = a.includes('--android'), port_ = a.includes('--portrait');
  const phone = a.includes('--phone') || a.includes('--phone2') || andr; let PW = a.includes('--phone2') ? 844 : andr ? 915 : 932, PH = a.includes('--phone2') ? 390 : andr ? 412 : 430;
  if (port_){ const q = PW; PW = PH; PH = q; }
  const vp = opt('--vp');
  if (phone){
    await send('Emulation.setDeviceMetricsOverride', { width: PW, height: PH, deviceScaleFactor: andr ? 2.625 : 3, mobile: true, screenOrientation: port_ ? { type: 'portraitPrimary', angle: 0 } : { type: 'landscapePrimary', angle: 90 } });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setUserAgentOverride', andr ? { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l' } : { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
    // вырез/полоска «домой» iPhone 14 Pro Max в альбомной ориентации: 59 px слева/справа, 21 px снизу
    if (!andr && !a.includes('--nosafe')){ const r = await send('Emulation.setSafeAreaInsetsOverride', { insets: port_ ? { top: 59, bottom: 34 } : { left: 59, right: 59, bottom: 21 } }); if (r.error) console.log('safe-area override n/a: ' + r.error.message); }
  } else if (vp){
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });   // v7.4: после телефонного теста вкладка оставалась «сенсорной»
    await send('Emulation.setUserAgentOverride', { userAgent: '' });
    const [w, h, d] = vp.split('x').map(Number);
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: d || 1, mobile: false });
  }
  if (a.includes('--reload')){
    await send('Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 2500));
  }
  const shotTo = async p => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78 }); fs.writeFileSync(p, Buffer.from(s.result.data, 'base64')); };
  await send('Runtime.addBinding', { name: 'cdpShot' });
  await send('Runtime.addBinding', { name: 'cdpTouch' });
  const pendingTouch = [], pendingIn = [];
  await send('Runtime.addBinding', { name: 'cdpIn' });
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.method === 'Runtime.bindingCalled' && m.params.name === 'cdpIn') pendingIn.push(JSON.parse(m.params.payload)); });
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.method === 'Runtime.bindingCalled' && m.params.name === 'cdpTouch') pendingTouch.push(JSON.parse(m.params.payload)); });
  // shot(path) ?????? ?????: ???????? binding ? ????, ???? ?? ?????? ????
  const pre = `const sleep = ms => new Promise(r => setTimeout(r, ms));
    const shot = async p => { window.__shotDone = false; cdpShot(p); for (let i = 0; i < 100 && !window.__shotDone; i++) await sleep(50); };
    // настоящие касания через CDP (Input.dispatchTouchEvent): T.down(id,x,y) / T.move(id,x,y) / T.up(id)
    const T = { act: {}, async send(type){ window.__touchDone = false; cdpTouch(JSON.stringify({ type, pts: Object.entries(this.act).map(([id, p]) => ({ id: +id, x: p[0], y: p[1] })) })); for (let i = 0; i < 100 && !window.__touchDone; i++) await sleep(10); },
      async down(id, x, y){ this.act[id] = [x, y]; await this.send('touchStart'); }, async move(id, x, y){ this.act[id] = [x, y]; await this.send('touchMove'); },
      async up(id){ delete this.act[id]; await this.send('touchEnd'); },
      async tap(x, y, ms){ await this.down(9, x, y); await sleep(ms || 60); await this.up(9); },
      async drag(id, x0, y0, x1, y1, n, ms){ await this.down(id, x0, y0); for (let i = 1; i <= n; i++){ await sleep(ms || 16); await this.move(id, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); } } };
    // настоящие мышь и клавиатура через CDP Input: IN.key('KeyW', ms), IN.click(x, y, 'left'|'right'), IN.drag(x0,y0,x1,y1), IN.wheel(x,y,dy), IN.move(x,y)
    const IN = { async q(m, p){ window.__inDone = false; cdpIn(JSON.stringify({ m, p })); for (let i = 0; i < 100 && !window.__inDone; i++) await sleep(5); },
      KC: { Tab: 9, Backspace: 8, Escape: 27, Space: 32, ShiftLeft: 16, ControlLeft: 17, Period: 190, Digit1: 49 },
      kd(code, mods){ const k = code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : ''; return { code, key: k ? k.toLowerCase() : code, windowsVirtualKeyCode: this.KC[code] || (k ? k.toUpperCase().charCodeAt(0) : 0), modifiers: mods || 0 }; },
      async down(code, mods){ await this.q('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, this.kd(code, mods))); },
      async up(code, mods){ await this.q('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, this.kd(code, mods))); },
      async key(code, ms, mods){ await this.down(code, mods); await sleep(ms || 60); await this.up(code, mods); },
      async move(x, y, btn){ await this.q('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: btn || 'none', buttons: btn === 'left' ? 1 : btn === 'right' ? 2 : 0 }); },
      async press(x, y, btn, mods){ await this.q('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: btn || 'left', buttons: btn === 'right' ? 2 : 1, clickCount: 1, modifiers: mods || 0 }); },
      async release(x, y, btn, mods){ await this.q('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: btn || 'left', buttons: 0, clickCount: 1, modifiers: mods || 0 }); },
      async click(x, y, btn, mods){ await this.move(x, y); await this.press(x, y, btn, mods); await sleep(40); await this.release(x, y, btn, mods); },
      async drag(x0, y0, x1, y1, n){ await this.move(x0, y0); await this.press(x0, y0); for (let i = 1; i <= (n || 10); i++){ await sleep(16); await this.move(x0 + (x1 - x0) * i / (n || 10), y0 + (y1 - y0) * i / (n || 10), 'left'); } await this.release(x1, y1); },
      async wheel(x, y, dy){ await this.q('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); } };
    const ctr = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : null; };
    for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur !== undefined && S.cps) break; } catch (e) {} await sleep(500); }\n`;
  let done = false;
  const pump = (async () => { while (!done){
    while (pendingIn.length){ const q = pendingIn.shift(); await send(q.m, q.p); await send('Runtime.evaluate', { expression: 'window.__inDone = true' }); }
    while (pendingTouch.length){ const t = pendingTouch.shift(); await send('Input.dispatchTouchEvent', { type: t.type, touchPoints: t.pts.map(p => ({ x: p.x, y: p.y, id: p.id, radiusX: 6, radiusY: 6, force: 1 })) }); await send('Runtime.evaluate', { expression: 'window.__touchDone = true' }); }
    if (pendingShots.length){ const p = pendingShots.shift(); await shotTo(p); await send('Runtime.evaluate', { expression: 'window.__shotDone = true' }); } await new Promise(r => setTimeout(r, 8)); } })();
  const res = await send('Runtime.evaluate', { expression: '(async () => {' + pre + code + '\n})()', awaitPromise: true, returnByValue: true, timeout: 900000 });
  done = true; await pump;
  const r = res.result || {};
  if (r.exceptionDetails) console.log('EXCEPTION', JSON.stringify(r.exceptionDetails).slice(0, 2000));
  else console.log(JSON.stringify(r.result && r.result.value, null, 1));
  if (opt('--shot')) await shotTo(opt('--shot'));
  if (logs.length) console.log('CONSOLE:\n' + logs.slice(0, 40).join('\n'));
  ws.close(); process.exit(0);
})();
