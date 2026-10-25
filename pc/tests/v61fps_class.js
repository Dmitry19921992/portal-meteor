// v61fps_class.js — класс для вселения, сброс эффектов (рефлекс и др.), помощь в прицеливании, техника от 1-го лица
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const errs = []; window.onerror = (m) => errs.push(String(m));
MENU.newGame(); await sleep(1500);
S.teams[0].ai = S.teams[0].ai;   // как есть
const out = {};
// своя техника рядом (в начале боя её нет)
{ const m = S.me, Up = norm(m.pos), F = tangent(m.fwd, Up), R = norm(cross(F, Up));
  const at = k => surfacePoint(norm(add(m.pos, add(mul(F, 12 + k * 9), mul(R, 8)))), 1.5);
  makeTank(at(0), 0); V2.make(at(1), 0, 'raider'); V2.make(at(2), 0, 'mlrs'); V2.make(at(3), 0, 'cat'); makeDrone(add(at(4), mul(Up, 10)), 0); }
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ CAMFX.fly = null; if (fn) fn(i / 60); update(1 / 60); } };
const clr = () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; };
const enemy = () => { const sq = S.squads.find(s => s.team === 1 && s.units.length); return sq ? sq.units[0] : null; };
const killMe = () => { const e = enemy(); const me = S.me; damage(me, 9999, e, 'b'); step(0.1); return me; };
// --- 1. класс при смерти
const roles = {}; for (const u of S.units) if (u.team === 0 && u.alive) roles[u.role] = (roles[u.role] || 0) + 1;
out.roles = roles;
const res = {};
for (const pref of ['heavy', 'rocket', 'medic', 'sniper', 'scout', 'veh', 'any']){
  SET.prefCls = pref;
  const was = S.me; killMe();
  const c = ctrlEntity();
  res[pref] = { got: c ? (c.cls === 'inf' ? c.role : c.cls + (c.vk ? ':' + c.vk : '')) : null, card: !!(FPS61.card && FPS61.card.died), miss: FPS61.card && FPS61.card.miss ? FPS61.card.miss : '' };
  FPS61.missT = -99;
}
out.death = res;
// X — смена бойца: первым идёт свой класс
SET.prefCls = 'heavy'; SW.list = null; switchUnit(1); out.switchX = ctrlEntity() && ctrlEntity().role;
// цифра на карточке гибели
SET.prefCls = 'any'; killMe(); FPS61.key({ code: 'Digit3' }); step(0.05); out.digitPick = { pref: SET.prefCls, role: ctrlEntity() && ctrlEntity().role };
SET.prefCls = 'any';
// --- 2. сброс эффектов
PROG.unl.add('reflex'); S.kit.reflex = 1;
const rx = {};
const reflexOn = () => { S.kit.reflex = 1; if (!S.kit.reflexOn) toggleReflex(); step(0.4); return +S.slow.toFixed(2); };
rx.on1 = reflexOn();
const tank = S.vehicles.find(v => v.team === 0 && v.alive && !v.vk) || S.vehicles.find(v => v.team === 0 && v.alive);
if (tank){ takeControl(tank); step(0.2); rx.afterPossessTank = { slow: +S.slow.toFixed(2), on: S.kit.reflexOn }; }
// смерть с рефлексом (в пехоте)
const inf = S.units.find(u => u.team === 0 && u.alive && !u.parked); takeControl(inf); step(0.1);
rx.on2 = reflexOn(); killMe(); step(0.2); rx.afterDeath = { slow: +S.slow.toFixed(2), on: S.kit.reflexOn };
rx.on3 = reflexOn(); enterRTS(); step(0.2); rx.afterRTS = { slow: +S.slow.toFixed(2), on: S.kit.reflexOn }; enterFPS(); step(0.1);
rx.on4 = reflexOn(); MENU.pause(); rx.afterMenu = { slow: +S.slow.toFixed(2), on: S.kit.reflexOn }; MENU.close(); S.paused = false;
rx.on5 = reflexOn(); SW.list = null; switchUnit(1); step(0.2); rx.afterSwitch = { slow: +S.slow.toFixed(2), on: S.kit.reflexOn };
// ADS на телефоне не тянется в танк
TOUCH.aimOn = true; mouseR = true; if (tank && tank.alive){ takeControl(tank); rx.touchAimAfterTank = { aimOn: TOUCH.aimOn, mouseR }; }
clr(); TOUCH.aimOn = false;
out.reset = rx;
// --- 3. помощь в прицеливании
const me2 = S.units.find(u => u.team === 0 && u.alive && !u.parked); takeControl(me2); step(0.1); CAMFX.fly = null;
const aa = {};
// синтетика: мир стоит, крутим только AIMA (0.5 с «стрельбы» и 0.5 с без неё), цель в 30 м, прицел мимо на 1.6°
{ const Up = norm(me2.pos), F = tangent(me2.fwd, Up);
  me2.pos = add(me2.pos, mul(Up, 4));
  const sq = spawnSquad(1, false, add(me2.pos, mul(F, 30)), 1, ['assault']); const tg = sq.units[0]; tg.parked = true; tg.seen[0] = 3;
  tg.pos = add(me2.pos, mul(F, 30)); tg.alive = true; rebuildTargets();
  const syn = {};
  for (const lvl of [0, 1, 2, 3]){
    SET.aimAssist = lvl;
    const eye = gunEye(me2), to = norm(sub(centerOf(tg), eye));
    for (const fire of [true, false]){
      me2.fwd = norm(rotAxis(to, Up, 1.6 * PI / 180)); AIMA.reset();
      mouseL = fire; S.aiming = false;
      for (let i = 0; i < 30; i++) AIMA.step(1 / 60);
      const a1 = acos(clamp(dot(me2.fwd, to), -1, 1)) * 180 / PI;
      const fd = AIMA.fire(eye, norm(rotAxis(to, Up, 0.9 * PI / 180)), 0); const af = acos(clamp(dot(fd, to), -1, 1)) * 180 / PI;
      syn[lvl + (fire ? '_fire' : '_idle')] = { after05s: +a1.toFixed(2), sens: +AIMA.sens.toFixed(2), bulletFrom09: +af.toFixed(2) };
    }
  }
  mouseL = false; out.aimSynthetic = syn; out.aimLos = los(gunEye(me2), centerOf(tg));
  tg.alive = false; S.units.splice(S.units.indexOf(tg), 1); sq.units.length = 0; me2.pos = add(me2.pos, mul(Up, -4)); }
for (const lvl of []){
  SET.aimAssist = lvl;
  const Up = norm(me2.pos), F = tangent(me2.fwd, Up);
  const sq = spawnSquad(1, false, add(me2.pos, mul(F, 30)), 1, ['assault']); const tg = sq.units[0]; tg.parked = true; tg.seen[0] = 3; tg.hp = 1e6;
  step(0.05, () => { tg.hp = 1e6; });
  const eye = gunEye(me2), to = norm(sub(centerOf(tg), eye));
  const right = norm(cross(to, Up));
  me2.fwd = norm(rotAxis(to, Up, 1.6 * PI / 180));   // 1.6° мимо
  const a0 = acos(clamp(dot(me2.fwd, norm(sub(centerOf(tg), gunEye(me2)))), -1, 1)) * 180 / PI;
  AIMA.step(1 / 60); const sens = +AIMA.sens.toFixed(2);
  aa['dbg' + lvl] = { los: los(eye, centerOf(tg)), scan: !!AIMA.scan(eye, me2.fwd, 0, 3 * PI / 180, 160), busy: CAMFX.busy(), ctrl: ctrlEntity() === me2, seen: tg.seen[0] };
  mouseL = true; let hits = 0; const hp0 = tg.hp;
  step(0.5, () => { me2.hp = me2.maxhp; tg.hp = max(tg.hp, 1e5); tg.pos = tg.pos; });
  mouseL = false; S.kit.mag[S.kit.w] = 30;
  const a1 = acos(clamp(dot(me2.fwd, norm(sub(centerOf(tg), gunEye(me2)))), -1, 1)) * 180 / PI;
  aa[lvl] = { a0: +a0.toFixed(2), a1: +a1.toFixed(2), sensNear: sens, dmg: Math.round(hp0 - tg.hp) };
  tg.alive = false; S.units.splice(S.units.indexOf(tg), 1); sq.units.length = 0;
  step(0.3);
}
out.aim = aa; SET.aimAssist = -1; out.aimDefault = AIMA.lvl();
// --- 4. техника от 1-го лица
const vfp = {};
{ const m = ctrlEntity(), Up = norm(m.pos), F = tangent(m.fwd || m.aim, Up), R = norm(cross(F, Up));
  const at = k => surfacePoint(norm(add(m.pos, add(mul(F, 12 + k * 9), mul(R, -8)))), 1.5);
  V2.make(at(1), 0, 'raider'); V2.make(at(2), 0, 'mlrs'); V2.make(at(3), 0, 'cat'); }
for (const v of S.vehicles.filter(v => v.team === 0 && v.alive).slice(0, 4)){
  takeControl(v); CAMFX.fly = null; step(0.1); setupCamera(1 / 60);
  const meIdx = gatherObjects(); const idx = renderList.findIndex(o => o.e === v);
  vfp[v.vk || 'tank'] = { fp: FPS61.vehFP(v), camH: +(len(S.cam.pos) - len(v.pos)).toFixed(2), hidden: meIdx === idx && idx >= 0 };
}
const dr = S.drones.find(d => d.team === 0 && d.alive); if (dr){ takeControl(dr); CAMFX.fly = null; step(0.1); setupCamera(1 / 60); vfp.drone = { fp: FPS61.vehFP(dr), d: +dist(S.cam.pos, dr.pos).toFixed(2) }; }
SET.vehView = 'tp'; setupCamera(1 / 60); vfp.tpWorks = !FPS61.vehFP(ctrlEntity()); SET.vehView = 'fp';
out.vehFP = vfp;
out.errs = errs; out.fps = Math.round(fpsVal);
return out;
