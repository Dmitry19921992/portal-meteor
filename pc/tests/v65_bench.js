// v6.5: замер стоимости кадра (render + синхронизация readPixels) — одинаковый сценарий для v64 и v65
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && S.cps) break; } catch (e) {} await sleep(500); }
await sleep(1500);
Math.random = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
MENU.newGame(); if (typeof TUT !== 'undefined' && TUT.on) TUT.finish(); await sleep(300);
S.paused = false; MENU.waitLock = false; S.autoRes = false; S.scale = 1; resize();
for (let i = 0; i < 400; i++) update(0.05);
const res = {}; const PX = new Uint8Array(4);
const bench = async (tag, setup) => {
  setup();
  for (let i = 0; i < 20; i++){ update(1 / 60); setupCamera(1 / 60); render(1 / 60, performance.now()); }
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX);
  const T = [];
  for (let i = 0; i < 90; i++){
    update(1 / 60); setupCamera(1 / 60);
    const t0 = performance.now(); render(1 / 60, performance.now()); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX); T.push(performance.now() - t0);
  }
  T.sort((a, b) => a - b);
  res[tag] = { med: +T[45].toFixed(2), p90: +T[81].toFixed(2), hv: typeof HV65 !== 'undefined' ? HV65.stats.drawn : '-' };
};
const h = S.units.find(u => u.team === 0 && u.role === 'heavy' && u.alive);
await bench('fps_me', () => { S.camOverride = null; });
await bench('near_heavy', () => { const f = tangent(h.fwd, h.up); const look = add(h.pos, mul(h.up, 0.5)); S.camOverride = { pos: add(add(look, mul(f, 3)), mul(h.up, 0.6)), look }; });
S.camOverride = null; enterRTS(); await sleep(300);
await bench('rts', () => { S.camOverride = null; });
return { res, w: canvas.width, h: canvas.height };
