// node gltrace75.js <url> <out.json> — один кадр: последовательность вызовов WebGL (имена + viewport/uRes), меню и бой (FPS, RTS)
const fs = require('fs');
const port = process.env.CDP_PORT || 9338;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const [url, outF] = process.argv.slice(2);
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const W = {};
  const send = (m, p) => new Promise(r => { const i = ++id; W[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && W[m.id]){ W[m.id](m); delete W[m.id]; } };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : r; };
  for (let i = 0; i < 600; i++){ if (await ev("(()=>{try{return document.getElementById('boot').classList.contains('done') && MENU.cur==='main'}catch(e){return false}})()") === true) break; await sleep(500); }
  const code = `(async () => {
    const names = ['useProgram','viewport','drawArrays','drawElements','bindFramebuffer','uniform1i','uniform1f','uniform2f','uniform3fv','uniform4f','uniform4fv','uniformMatrix3fv','uniformMatrix4fv','texSubImage2D','generateMipmap','enable','disable','depthFunc','bindTexture','activeTexture'];
    const P = WebGL2RenderingContext.prototype, orig = {}, log = [];
    const trace = async tag => {
      log.length = 0; let on = false;
      for (const n of names){ orig[n] = orig[n] || P[n]; P[n] = function(...a){ if (on) log.push(n + (n === 'viewport' ? ':' + a.join(',') : n === 'uniform2f' ? ':' + a.slice(1).map(x => Math.round(x)).join(',') : '')); return orig[n].apply(this, a); }; }
      await new Promise(r => requestAnimationFrame(() => { on = true; requestAnimationFrame(() => { on = false; r(); }); }));
      for (const n of names) P[n] = orig[n];
      return { tag, n: log.length, seq: log.slice() };
    };
    const out = [];
    out.push(await trace('menu'));
    MENU.newGame(); await new Promise(r => setTimeout(r, 2500)); out.push(await trace('fps'));
    enterRTS(); await new Promise(r => setTimeout(r, 1500)); out.push(await trace('rts'));
    return out;
  })()`;
  const res = await ev(code);
  fs.writeFileSync(outF, JSON.stringify(res, null, 1));
  console.log(Array.isArray(res) ? res.map(o => o.tag + ':' + o.n).join(' ') : JSON.stringify(res).slice(0, 300));
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
  process.exit(0);
})();
