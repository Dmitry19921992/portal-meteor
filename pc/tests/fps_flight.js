// fps_flight.js — гравитация и ранец: числа «до/после» (запускать и на базе v5.3, и на ветке fps)
// симуляция вручную update(1/60); игрок удерживается, урон не получает
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const out = { build: location.pathname.split('/').pop() };
MENU.newGame(); await sleep(2500);
const me = S.me, B = SET.bind;
for (const u of S.units) if (u.team === 1) u.alive = false;
S.units = S.units.filter(u => u.alive);
const rel = () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; };
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ S.me = me; me.hp = me.maxhp; CAMFX.fly = null; S.mode = 'fps'; if (fn) fn(i / 60); update(1 / 60); } };
const r2 = x => Math.round(x * 100) / 100;
const d0 = norm(me.pos), t0 = anyTangent(d0);
const jetOf2 = k => Object.assign({}, JET[k]);
const reset = (k) => { me.jet = jetOf2(k || 'jet2'); me.energy = me.jet.emax; me.locked = false; me.hp = me.maxhp; me.vel = [0, 0, 0]; rel(); };
const toGround = () => { me.pos = surfacePoint(d0); me.vel = [0, 0, 0]; me.up = d0; me.fwd = t0; step(0.4); };
out.g = { surf: r2(gAt(RM)), a100: r2(gAt(RM + 100)), a250: r2(gAt(RM + 250)), dome: r2(gAt(DOME)) };
// J: прыжок с места
reset(); toGround();
{ const a0 = altitude(me.pos); let peak = 0, air = 0, landed = -1; keys[B.jump] = true;
  step(2.5, t => { if (t > 0.05) keys[B.jump] = false; peak = Math.max(peak, altitude(me.pos) - a0); if (t > 0.1 && landed < 0 && me.grounded) landed = t; });
  out.J_jump = { apex_m: r2(peak), airtime_s: r2(landed) }; }
// F: падение с 20 м
reset(); me.pos = mul(d0, groundR(d0) + 20); me.up = d0; me.fwd = t0;
{ let tl = -1, vimp = 0; step(5, t => { if (tl < 0 && t > 0.05){ vimp = Math.max(vimp, -dot(me.vel, norm(me.pos))); if (me.grounded) tl = t; } }); out.F_fall20 = { time_s: r2(tl), impact_ms: r2(vimp) }; }
// T1: отзывчивость ранца II: стоим, смотрим на горизонт, жмём ранец
reset(); toGround();
{ const a0 = altitude(me.pos); const s = {}; keys[B.run] = true;
  step(1.0, t => { const k = Math.round(t * 60); if (k === 12) s.alt_02 = r2(altitude(me.pos) - a0); if (k === 30) s.alt_05 = r2(altitude(me.pos) - a0); if (k === 59) { s.alt_10 = r2(altitude(me.pos) - a0); s.speed_10 = r2(len(me.vel)); } });
  out.T1_jetHorizon = s; rel(); }
// T1b: «поймать» падение: летим вниз 15 м/с, жмём ранец (смотрим вверх) — через сколько вертикальная скорость станет ≥ 0
reset(); me.pos = mul(d0, groundR(d0) + 80); me.vel = mul(d0, -15); me.up = d0; me.fwd = norm(add(mul(d0, 0.9), mul(t0, 0.44)));
{ let tc = -1; keys[B.run] = true; step(3, t => { if (tc < 0 && dot(me.vel, norm(me.pos)) >= 0) tc = t; }); out.T1b_catchFall_s = r2(tc); rel(); }
// T2: подъём к куполу (смотрим вверх), разные ранцы
for (const k of ['jet2', 'elite', 'basic']){
  reset(k); toGround(); me.fwd = norm(add(mul(d0, 0.99), mul(t0, 0.14))); reset(k);
  const tp = me.teleports; let maxAlt = 0, tUp = -1; keys[B.run] = true;
  step(25, t => { if (me.teleports === tp){ maxAlt = Math.max(maxAlt, altitude(me.pos)); } else if (tUp < 0) tUp = t; me.fwd = norm(add(mul(norm(me.pos), 0.99), mul(t0, 0.14))); });
  rel();
  out['T2_climb_' + k] = { maxAlt: Math.round(maxAlt), reachedDome: tUp >= 0, secToDome: r2(tUp), energyLeft: r2(me.energy) };
}
// T3: падение сверху после портала: скорость при посадке без ранца
reset(); me.pos = mul(d0, S.R - 1); me.vel = mul(d0, -6); me.up = d0;
{ let vmax = 0, tl = -1; step(20, t => { if (tl < 0){ vmax = Math.max(vmax, len(me.vel)); if (me.grounded) tl = t; } }); out.T3_domeFall = { time_s: r2(tl), vmax: r2(vmax) }; }
// C: воздушный тормоз на 30 м/с
reset(); me.pos = mul(d0, RM + 120); me.vel = mul(t0, 30); me.up = d0; me.fwd = t0;
keys[B.down] = true; step(0.3); const vC03 = len(me.vel); step(0.6); const vC09 = len(me.vel); rel();
out.C_brake = { v0: 30, after03: r2(vC03), after09: r2(vC09) };
// D: разворот: летим 25 м/с вперёд, смотрим назад, даём тягу
reset(); me.pos = mul(d0, RM + 120); me.vel = mul(t0, 25); me.up = d0; me.fwd = mul(t0, -1);
{ let tRev = -1; keys[B.run] = true; step(4, t => { if (tRev < 0 && dot(me.vel, t0) < 0) tRev = t; }); rel(); out.D_reverse_s = r2(tRev); }
// S: стрейф в воздухе: висим (ранец), жмём «вправо» — боковая скорость через 0.5 с
reset(); me.pos = mul(d0, RM + 120); me.vel = [0, 0, 0]; me.up = d0; me.fwd = t0;
{ const right = norm(cross(t0, d0)); keys[B.run] = true; keys[B.right] = true; step(0.5); out.S_strafe05 = r2(dot(me.vel, right)); rel(); }
// R: заряд ранца на земле с нуля до полного
reset(); toGround(); me.energy = 0; me.locked = true;
{ let tf = -1; step(8, t => { if (tf < 0 && me.energy >= me.jet.emax - 1e-3) tf = t; }); out.R_regenGround_s = r2(tf); }
// Z: рывок (если есть)
if (typeof gunDash === 'function'){
  reset(); me.pos = mul(d0, RM + 60); me.vel = [0, 0, 0]; me.up = d0; me.fwd = t0; GUNS.dashCd = 0;
  gunDash(); out.Z_dash = { v: r2(len(me.vel)), energyUsed: r2(me.jet.emax - me.energy) };
}
// A: касательный влёт в купол (проверка «пинг-понга» v5.3)
reset(); me.pos = mul(d0, S.R - 0.5); me.vel = add(mul(t0, 40), mul(d0, 1.5)); me.fwd = t0; me.up = d0;
{ const tp = me.teleports; keys[B.run] = true; step(4); rel(); out.A_tangent_teleports = me.teleports - tp; }
// E: боты — десант через купол
try {
  const sq = spawnSquad(0, true, BASES[0], 4);
  for (const u of sq.units){ u.jet = jetOf(u); u.energy = u.jet.emax; }
  sq.order = 'sky'; sq.sky = 'launch'; sq.launchT = S.time;
  for (const u of sq.units){ u.skyState = 'up'; u.tp0 = u.teleports; }
  let maxA = 0, tTele = -1, vLand = [];
  const t00 = S.time;
  step(45, () => { for (const u of sq.units) if (u.alive){ maxA = Math.max(maxA, altitude(u.pos)); if (tTele < 0 && u.teleports > u.tp0) tTele = S.time - t00; if (u.skyState === 'down' && u._v === undefined && altitude(u.pos) < 3) u._v = len(u.vel); } });
  out.E_sky = { maxAlt: Math.round(maxA), firstTeleport_s: r2(tTele), tele: sq.units.map(u => u.teleports - u.tp0).join(','), state: sq.units.map(u => u.skyState || 'landed').join(','),
    distToEnemyBase: sq.units.map(u => Math.round(surfDist(u.pos, BASES[1]))).join(','), landV: sq.units.map(u => u._v !== undefined ? r2(u._v) : '-').join(',') };
} catch (e) { out.E_err = String(e); }
return out;
