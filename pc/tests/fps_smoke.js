// fps_smoke.js — загрузка, новый бой, стрельба по поставленной цели, проверка ошибок
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const out = { title: document.title };
const errs = []; window.onerror = (m) => errs.push(String(m));
MENU.newGame(); await sleep(3000);
const me = S.me; out.me = me && me.role;
CAMFX.fly = null;
// враг перед игроком в 25 м
const Up = norm(me.pos), F = tangent(me.fwd, Up);
const sq = spawnSquad(1, false, add(me.pos, mul(F, 25)), 1, ['assault']);
const tg = sq.units[0]; tg.hp = tg.maxhp = 100; tg.parked = true;
const eye = () => add(me.pos, mul(me.up, RULES.EYE));
const aimAt = () => { me.fwd = norm(sub(add(tg.pos, mul(tg.up, 0.3)), eye())); };
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ S.me = me; me.hp = me.maxhp; CAMFX.fly = null; if (fn) fn(i / 60); update(1 / 60); } };
step(0.3, aimAt);
let t0 = S.time, tk = -1; const hp0 = tg.hp;
mouseL = true;
step(3, () => { aimAt(); if (tk < 0 && !tg.alive) tk = S.time - t0; });
mouseL = false;
out.rifle = { ttk: tk.toFixed(2), alive: tg.alive, hpLeft: Math.round(tg.hp), mag: S.kit.mag[S.kit.w], shots: ADAPT.shots, tracers: TRACERS.filter(t => t.on).length };
await sleep(500);
out.errs = errs;
out.fps = Math.round(fpsVal);
return out;
