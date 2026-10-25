// v61fps_smoke.js — загрузка, меню, новый бой (эпичный масштаб), 25 с живой игры: FPS, время update(), ошибки консоли, экраны меню
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const errs = []; window.onerror = (m) => errs.push(String(m));
const out = { title: document.title };
SET.battle = 2; MENU.newGame(); await sleep(2000);
// прогреваем бой 60 с симуляции
for (let i = 0; i < 1200; i++) update(0.05);
CAMFX.fly = null; MENU.waitLock = false; S.paused = false;
const t0 = performance.now(); let n = 0, worst = 0;
const orig = update; let tot = 0;
const fpsS = [];
for (let k = 0; k < 5; k++){ await sleep(3000); fpsS.push(Math.round(fpsVal)); }
// время update() отдельно
for (let i = 0; i < 120; i++){ const a = performance.now(); update(1 / 60); const d = performance.now() - a; tot += d; worst = Math.max(worst, d); }
out.robots = S.units.filter(u => u.alive).length + S.vehicles.length + S.drones.length;
out.fps = fpsS; out.updateMs = { avg: +(tot / 120).toFixed(2), worst: +worst.toFixed(1) };
// AIMA и FPS61 в кадре — стоимость
const b0 = performance.now(); for (let i = 0; i < 500; i++) AIMA.step(1 / 60); out.aimaUs = +((performance.now() - b0) / 500 * 1000).toFixed(1);
// экраны меню
for (const s of ['pause', 'settings', 'career', 'controls']){ try { s === 'pause' ? MENU.pause() : MENU.show(s, true); await sleep(100); } catch (e){ errs.push(s + ': ' + e.message); } }
out.screens = MENU.cur; MENU.close(); S.paused = false;
SET.battle = 1;
out.errs = errs;
return out;
