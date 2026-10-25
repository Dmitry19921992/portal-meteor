// время до главного меню в свежем профиле: node v66_boottime.js <port> <urlSubstr>
const port = process.argv[2] || 9240, want = process.argv[3] || 'v66.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t0 = Date.now();
  let t = null;
  for (let i = 0; i < 120 && !t; i++){ try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); t = list.find(x => x.type === 'page' && x.url.includes(want)); } catch (e){} if (!t) await sleep(500); }
  if (!t){ console.log('NO TARGET'); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const wait = {};
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; } };
  await new Promise(r => ws.onopen = r);
  const ev = async expr => { const i = ++id; ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } })); const m = await new Promise(r => wait[i] = r); return m.result && m.result.result && m.result.result.value; };
  let last = '';
  for (let k = 0; k < 600; k++){
    const v = await ev(`JSON.stringify({ done: !!(document.getElementById('boot') && document.getElementById('boot').classList.contains('done')), txt: (document.getElementById('bootTxt') || {}).textContent, perf: Math.round(performance.now()), par: typeof PAR_EXT !== 'undefined' && !!PAR_EXT, gl: (() => { try { const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch (e){ return ''; } })() })`);
    if (v && v !== last){ last = v; console.log(((Date.now() - t0) / 1000).toFixed(1) + 's ' + v); }
    if (v && JSON.parse(v).done) break;
    await sleep(500);
  }
  ws.close(); process.exit(0);
})();
