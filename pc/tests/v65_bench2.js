// v6.5: A/B в одной сборке и одном кадре — render с 3D-моделью и без (HV65.on)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && S.cps) break; } catch (e) {} await sleep(500); }
await sleep(1000);
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(300);
S.paused = false; MENU.waitLock = false; S.autoRes = false; S.scale = 1; resize();
for (let i = 0; i < 400; i++) update(0.05);
const res = {}; const PX = new Uint8Array(4);
const one = on => { HV65.on = on; const t0 = performance.now(); render(1 / 60, performance.now()); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX); return performance.now() - t0; };
const bench = async (tag, setup) => {
  const A = [], B = [];
  for (let i = 0; i < 100; i++){
    update(1 / 60); setup(); setupCamera(1 / 60);
    if (i % 2){ A.push(one(true)); B.push(one(false)); } else { B.push(one(false)); A.push(one(true)); }
  }
  const med = T => { T = T.slice(20).sort((a, b) => a - b); return +T[T.length >> 1].toFixed(2); };
  res[tag] = { on: med(A), off: med(B), drawn: HV65.stats.drawn };
};
const H = S.units.filter(u => HV65.is(u) && u.alive);
const h = H[0];
await bench('fps_me', () => { S.camOverride = null; });
await bench('near_heavy', () => { const f = tangent(h.fwd, h.up); const look = add(h.pos, mul(h.up, 0.5)); S.camOverride = { pos: add(add(look, mul(f, 2.2)), mul(h.up, 0.4)), look }; });
S.camOverride = null; enterRTS(); await sleep(300);
await bench('rts', () => {});
HV65.on = true;
return { res, heavies: H.length, w: canvas.width, h: canvas.height };
