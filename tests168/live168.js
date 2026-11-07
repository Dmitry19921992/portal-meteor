// persistent headless Chrome on the GPU for interactive checks: drop q_<n>.js into tests818/live/ -> result in r_<n>.txt
// (expression is evaluated in the page with awaitPromise; "SHOT name" as the whole file = screenshot). Stop: create live/stop.
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const PAGE = process.argv[2] || 'v818_test.html', D = path.join(__dirname, 'live168'); fs.mkdirSync(D, { recursive: true });
const W = +(process.argv[3] || 1920), H = +(process.argv[4] || 1080), CDP = 9868;
const LOG = m => { const s = new Date().toISOString().slice(11, 19) + ' ' + m; console.log(s); fs.appendFileSync(path.join(D, 'log.txt'), s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
(async () => {
  const ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--mute-audio', `--remote-debugging-port=${CDP}`, `--user-data-dir=${path.join(__dirname, 'chrome_live_' + Date.now())}`, `--window-size=${W},${H}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  fs.writeFileSync(path.join(D, 'chrome.pid'), String(ch.pid)); LOG('chrome pid ' + ch.pid);
  let ws;
  try {
    let t; for (let k = 0; k < 80; k++){ try { t = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (t.some(x => x.type === 'page')) break; } catch {} await sleep(500); }
    ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const P = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.id && P.has(m.id)){ const p = P.get(m.id); P.delete(m.id); m.error ? p.j(Error(JSON.stringify(m.error))) : p.r(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown'){ const d = m.params.exceptionDetails; errs.push('EXC ' + ((d.exception && d.exception.description) || d.text).slice(0, 300)); }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('console.error ' + m.params.args.map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ').slice(0, 300));
    };
    const send = (method, params = {}) => new Promise((r, j) => { const n = ++id; P.set(n, { r, j }); ws.send(JSON.stringify({ id: n, method, params })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 600); return r.result && r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:8817/' + PAGE }); LOG('navigate ' + PAGE);
    await sleep(20000);
    for (let k = 0; k < 900; k++){ const ok = await ev("typeof window.BOOT!=='undefined' && typeof MENU!=='undefined' && !!MENU.cur"); if (ok === true) break; await sleep(1000); }
    await ev('window.BOOT'); LOG('READY');
    fs.writeFileSync(path.join(D, 'ready'), '1');
    for (;;){
      if (fs.existsSync(path.join(D, 'stop'))) break;
      const q = fs.readdirSync(D).filter(f => /^q_\w+\.js$/.test(f)).sort();
      for (const f of q){
        const src = fs.readFileSync(path.join(D, f), 'utf8'); fs.unlinkSync(path.join(D, f));
        let out;
        try {
          if (/^SHOT \w+/.test(src.trim())){ const r = await send('Page.captureScreenshot', { format: 'png' }); const n = src.trim().slice(5); fs.writeFileSync(path.join(D, n + '.png'), Buffer.from(r.data, 'base64')); out = 'shot ' + n; }
          else out = await ev(src);
        } catch (e){ out = 'ERR ' + e.message; }
        fs.writeFileSync(path.join(D, 'r_' + f.slice(2, -3) + '.txt'), (typeof out === 'string' ? out : JSON.stringify(out, null, 1)) + '\n--- errors so far: ' + errs.length + '\n' + errs.slice(-8).join('\n'));
      }
      await sleep(300);
    }
  } catch (e){ LOG('ERR ' + e.stack); }
  finally { try { ws && ws.close(); } catch {} try { process.kill(ch.pid); } catch {} LOG('closed pid ' + ch.pid); }
})();
