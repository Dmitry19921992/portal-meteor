// CDP-помощник ветки rtsui: node rtsui_cdp.js <file.js | -e "code"> [--vp 1280x720 | --phone] [--reload] [--shot out.jpg] [--port 9236]
// Эмуляция окна действует только пока открыта сессия, поэтому всё (перезагрузка, тест, скриншот) — за один запуск.
// Код выполняется внутри async-функции; можно вызывать shot('path') — скриншот посреди теста.
const fs = require('fs');
(async () => {
  const a = process.argv.slice(2);
  const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const code = a[0] === '-e' ? a[1] : fs.readFileSync(a[0], 'utf8');
  const port = opt('--port') || process.env.CDP_PORT || 9236;
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes('dist/v62.html'));
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
  await send('Runtime.enable'); await send('Page.enable');
  const phone = a.includes('--phone');
  const vp = opt('--vp');
  if (phone){
    await send('Emulation.setDeviceMetricsOverride', { width: 932, height: 430, deviceScaleFactor: 3, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' });
  } else if (vp){
    const [w, h, d] = vp.split('x').map(Number);
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: d || 1, mobile: false });
  }
  if (a.includes('--reload')){
    await send('Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 2500));
  }
  const shotTo = async p => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78 }); fs.writeFileSync(p, Buffer.from(s.result.data, 'base64')); };
  await send('Runtime.addBinding', { name: 'cdpShot' });
  // shot(path) внутри теста: вызывает binding и ждёт, пока мы снимем кадр
  const pre = `const sleep = ms => new Promise(r => setTimeout(r, ms));
    const shot = async p => { window.__shotDone = false; cdpShot(p); for (let i = 0; i < 100 && !window.__shotDone; i++) await sleep(50); };
    for (let i = 0; i < 600; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur !== undefined && S.cps) break; } catch (e) {} await sleep(500); }\n`;
  let done = false;
  const pump = (async () => { while (!done){ if (pendingShots.length){ const p = pendingShots.shift(); await shotTo(p); await send('Runtime.evaluate', { expression: 'window.__shotDone = true' }); } await new Promise(r => setTimeout(r, 40)); } })();
  const res = await send('Runtime.evaluate', { expression: '(async () => {' + pre + code + '\n})()', awaitPromise: true, returnByValue: true, timeout: 900000 });
  done = true; await pump;
  const r = res.result || {};
  if (r.exceptionDetails) console.log('EXCEPTION', JSON.stringify(r.exceptionDetails).slice(0, 2000));
  else console.log(JSON.stringify(r.result && r.result.value, null, 1));
  if (opt('--shot')) await shotTo(opt('--shot'));
  if (logs.length) console.log('CONSOLE:\n' + logs.slice(0, 40).join('\n'));
  ws.close(); process.exit(0);
})();

