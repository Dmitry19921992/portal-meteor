// склейка сравнений «Обычный | Денди | 16-бит» в браузере (OffscreenCanvas): node montage75d.js <outDir>
const fs = require('fs');
const port = process.env.CDP_PORT || 9334;
const outDir = process.argv[2];
const SETS = [['1_fps_close', '1_шутер_вблизи'], ['2_fps_panorama', '2_шутер_панорама'], ['3_rts', '3_вид_стратега'], ['4_explosion', '4_взрыв']];
(async () => {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:8834/tests/`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {};
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; } };
  await new Promise(r => ws.onopen = r);
  for (let i = 0; i < 40; i++){ await new Promise(r => setTimeout(r, 250)); await send('Runtime.enable'); const r = await send('Runtime.evaluate', { expression: 'location.origin', returnByValue: true }); if (r.result && r.result.result && /^http/.test(r.result.result.value)) break; }
  fs.mkdirSync(outDir, { recursive: true });
  for (const [k, name] of SETS){
    const code = `(async () => {
      const ld = async u => { const b = await (await fetch(u, { cache: 'no-store' })).blob(); return await createImageBitmap(b); };
      const L = [['a_normal', 'Обычный'], ['b_dendy', 'Денди (8-бит)'], ['c_16bit', '16-бит (512 цветов)']];
      const W = 960, H = 540, T = 44, c = new OffscreenCanvas(W * 3 + 16, H + T), g = c.getContext('2d');
      g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 3; i++){
        const im = await ld('/shots/v75d_cmp_${k}_' + L[i][0] + '.jpg');
        g.imageSmoothingEnabled = false;   // пиксели не размываем
        g.drawImage(im, i * (W + 8), T, W, H);
        g.fillStyle = '#e8e2d0'; g.font = '600 26px Arial'; g.fillText(L[i][1], i * (W + 8) + 14, 31);
      }
      const bl = await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 }); const buf = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      return btoa(s);
    })()`;
    const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    const v = r.result && r.result.result && r.result.result.value;
    if (!v){ console.log(k, 'ERR', JSON.stringify(r.result && r.result.exceptionDetails || r).slice(0, 300)); continue; }
    fs.writeFileSync(outDir + '/сравнение_' + name + '.jpg', Buffer.from(v, 'base64'));
    console.log('ok', name);
  }
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
  process.exit(0);
})();
