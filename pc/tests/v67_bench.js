// v6.7: производительность на телефоне (одинаково для v6.6 и v6.7): FPS и время JS-кадра в бою и в стратегии,
// для v6.7 — отдельно цена нового интерфейса (M67.frame + обёртки)
const res = {};
const f0 = frame; let acc = 0, n = 0, mx = 0, m67 = 0;
frame = function(now){ const t = performance.now(); f0(now); const d = performance.now() - t; acc += d; n++; if (d > mx) mx = d; };
if (typeof M67 !== 'undefined'){ const mf = M67.frame.bind(M67); M67.frame = function(dt){ const t = performance.now(); mf(dt); m67 += performance.now() - t; }; }
const meas = async (k, ms) => { await sleep(1500); acc = 0; n = 0; mx = 0; m67 = 0; const t0 = performance.now(); let fps = []; const end = t0 + ms; while (performance.now() < end){ await sleep(1000); fps.push(fpsVal); } res[k] = { fps: +(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1), jsMs: +(acc / max(1, n)).toFixed(2), uiMs: +(m67 / max(1, n)).toFixed(3), maxMs: +mx.toFixed(1), frames: n }; };
S.autoRes = false; S.scale = 0.45; resize();
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1000);
await meas('fps', 8000);
enterRTS(); await sleep(800);
S.sel.clear(); S.sel.add(groupsOf(0).find(isSquad)); await meas('rts_sel', 6000);
S.sel.clear(); await meas('rts', 5000);
res.ver = document.title; res.touch = TOUCH.on;
return res;
