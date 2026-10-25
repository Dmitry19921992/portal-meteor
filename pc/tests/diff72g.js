// попиксельное сравнение PNG из shots/pcab: node diff67.js <tagA> <tagB> name1,name2,...  → число отличающихся пикселей, рамка отличий, картинка отличий
const fs = require('fs');
const port = process.env.CDP_PORT || 9246;
(async () => {
  const [A, B, names] = process.argv.slice(2);
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:8796/tests/`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {};
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; } };
  await new Promise(r => ws.onopen = r);
  await new Promise(r => setTimeout(r, 800));
  const out = {};
  for (const n of names.split(',')){
    const code = `(async () => {
      const ld = async u => { const b = await (await fetch(u, { cache: 'no-store' })).blob(); const im = await createImageBitmap(b); const c = new OffscreenCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height); };
      const a = await ld('/shots/pcab72g/${A}_${n}.png'), b = await ld('/shots/pcab72g/${B}_${n}.png');
      if (a.width !== b.width || a.height !== b.height) return { size: [a.width, a.height, b.width, b.height] };
      let d = 0, mx = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      const c = new OffscreenCanvas(a.width, a.height), g = c.getContext('2d'), o = g.createImageData(a.width, a.height);
      for (let i = 0; i < a.data.length; i += 4){
        const dd = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
        const p = i / 4, x = p % a.width, y = (p / a.width) | 0;
        o.data[i] = dd ? 255 : a.data[i] * 0.25; o.data[i + 1] = dd ? 40 : a.data[i + 1] * 0.25; o.data[i + 2] = dd ? 40 : a.data[i + 2] * 0.25; o.data[i + 3] = 255;
        if (dd){ d++; if (dd > mx) mx = dd; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
      }
      g.putImageData(o, 0, 0);
      const bl = await c.convertToBlob({ type: 'image/png' }); const buf = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      return { px: a.width * a.height, diff: d, maxDelta: mx, bbox: d ? [x0, y0, x1, y1] : null, png: btoa(s) };
    })()`;
    const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    const v = r.result && r.result.result && r.result.result.value;
    if (!v){ out[n] = r.result && r.result.exceptionDetails ? 'EXC ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300) : 'ERR'; continue; }
    if (v.png){ if (v.diff) fs.writeFileSync(`D:/AI/pm_v6/shots/pcab72g/diff_${A}_${B}_${n}.png`, Buffer.from(v.png, 'base64')); delete v.png; }
    out[n] = v;
  }
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})();
