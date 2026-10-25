// fps_perf.js — нагрузка: эпичный масштаб, ~125+ роботов, 400 шагов симуляции; время update() на шаг (мс)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
SET.battle = 2;
MENU.newGame(); await sleep(1500);
// добавим отряды обеим сторонам до ~130 роботов
for (let k = 0; k < 40 && S.units.length < 130; k++){ spawnSquad(k % 2, false, null, 4); }
// сдвинем армии друг к другу: все идут к точке A
for (const sq of S.squads) setOrder(sq, 'move', mul(CPD[0], RM), {});
const me = S.me;
// прогрев: 60 с боя (без замеров)
for (let i = 0; i < 1200; i++){ S.me = me; update(0.05); }
const N = 400; let tot = 0, worst = 0, shots0 = 0;
let shots = 0; const has = typeof gunShoot === 'function'; const _gs = has ? gunShoot : null; if (has) gunShoot = function(...a){ shots++; return _gs.apply(this, a); };
const p0 = S.proj.length; let projSum = 0;
for (let i = 0; i < N; i++){ const t0 = performance.now(); update(1 / 60); const d = performance.now() - t0; tot += d; worst = Math.max(worst, d); projSum += S.proj.length; }
if (has) gunShoot = _gs;
// реальные кадры 5 с
const f0 = performance.now(); let fr = 0; await new Promise(r => { const tick = () => { fr++; if (performance.now() - f0 < 5000) requestAnimationFrame(tick); else r(); }; requestAnimationFrame(tick); });
SET.battle = 1;
return { units: S.units.length, vehicles: S.vehicles.length, drones: S.drones.length, avgUpdateMs: +(tot / N).toFixed(2), worstMs: +worst.toFixed(1), hitscanPerSec: Math.round(shots / (N / 60)), realFPS: +(fr / 5).toFixed(1), avgProj: Math.round(projSum / N) };
