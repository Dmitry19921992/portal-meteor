// v7.1: производительность на телефоне (v7.0 и v7.1 одинаково): FPS и время JS-кадра в бою и в стратегии + цена интерфейса (M67/M71)
const res = {};
const f0 = frame; let acc = 0, n = 0, mx = 0, ui = 0;
frame = function(now){ const t = performance.now(); f0(now); const d = performance.now() - t; acc += d; n++; if (d > mx) mx = d; };
for (const o of [typeof M67 !== 'undefined' ? M67 : null, typeof M71 !== 'undefined' ? M71 : null]) if (o){ const mf = o.frame.bind(o); o.frame = function(dt){ const t = performance.now(); mf(dt); ui += performance.now() - t; }; }
const meas = async (k, ms) => { await sleep(1500); acc = 0; n = 0; mx = 0; ui = 0; const t0 = performance.now(); let fps = []; const end = t0 + ms; while (performance.now() < end){ await sleep(1000); fps.push(fpsVal); } res[k] = { fps: +(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1), jsMs: +(acc / max(1, n)).toFixed(2), uiMs: +(ui / max(1, n)).toFixed(3), maxMs: +mx.toFixed(1) }; };
try { localStorage.removeItem('pm_v71m'); } catch (e){}
if (typeof M71 !== 'undefined'){ M71.pref.v70 = false; M71.pref.auto = false; M71.apply(); }
S.autoRes = false; S.scale = 0.45; resize();
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1000);
await meas('fps', 8000);
if (typeof M71 !== 'undefined'){ M71.pref.auto = true; M71.apply(); await meas('fps_auto', 6000); M71.pref.auto = false; M71.apply(); }
enterRTS(); await sleep(800);
S.sel.clear(); S.sel.add(groupsOf(0).find(isSquad)); await meas('rts_sel', 6000);
res.ver = document.title; res.touch = TOUCH.on;
return res;
