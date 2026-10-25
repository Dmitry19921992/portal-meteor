// v6.9: FPS v6.8 vs v6.9 на ПК (1280×720, разрешение ×1, без авто-разрешения): бой стоя, бой со стрельбой, стратегия
const res = {};
S.autoRes = false; S.scale = 1; resize();
const f0 = frame; let acc = 0, n = 0;
frame = function(now){ const t = performance.now(); f0(now); acc += performance.now() - t; n++; };
const meas = async (k, ms) => { await sleep(1200); acc = 0; n = 0; const fps = []; const end = performance.now() + ms; while (performance.now() < end){ await sleep(1000); fps.push(fpsVal); } res[k] = { fps: +(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1), jsMs: +(acc / max(1, n)).toFixed(2) }; };
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500);
if (S.me && S.me.cls !== 'inf' && S.lastInf) takeControl(S.lastInf);
await meas('fps_idle', 6000);
S.kit.mag.rifle = 999; mouseL = true; await meas('fps_fire', 5000); mouseL = false;
enterRTS(); await meas('rts', 5000);
res.ver = document.title; res.wpn = typeof WPN69 !== 'undefined' ? +WPN69.stats.ms.toFixed(3) : null;
return res;
