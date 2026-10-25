// v6.6: стоимость кадра (render + readPixels-синхронизация) — одинаковый сценарий для v65 и v66
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && S.cps) break; } catch (e) {} await sleep(500); }
await sleep(1500);
Math.random = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
MENU.newGame(); if (typeof TUT !== 'undefined' && TUT.on) TUT.finish(); await sleep(300);
S.paused = false; MENU.waitLock = false; S.autoRes = false; S.scale = 1; resize();
for (let i = 0; i < 400; i++) update(0.05);
const res = {}; const PX = new Uint8Array(4);
const bench = async (tag, setup) => {
  setup();
  for (let i = 0; i < 20; i++){ update(1 / 60); if (S.mode === 'rts') updateRTSCamera(1 / 60); setupCamera(1 / 60); render(1 / 60, performance.now()); }
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX);
  const T = [];
  for (let i = 0; i < 120; i++){
    update(1 / 60); if (S.mode === 'rts') updateRTSCamera(1 / 60); setupCamera(1 / 60);
    const t0 = performance.now(); render(1 / 60, performance.now()); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX); T.push(performance.now() - t0);
  }
  T.sort((a, b) => a - b);
  res[tag] = { med: +T[60].toFixed(2), p90: +T[108].toFixed(2) };
};
await bench('fps_me', () => { S.camOverride = null; });
S.camOverride = null; enterRTS(); await sleep(300);
S.sel.clear();
await bench('rts_nosel', () => {});
const sq = S.squads.find(s => s.team === 0); S.sel.add(sq);
await bench('rts_sel_squad', () => {});
return { res, w: canvas.width, h: canvas.height, ver: document.title, cam: typeof CAM66 !== 'undefined' ? { drawn: CAM66.drawn, shown: CAM66.shown } : null };
