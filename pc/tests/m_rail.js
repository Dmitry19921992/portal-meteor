// m_rail.js — рельса на 45 м в двух местах (у точки A и в стороне), что попадает в луч
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
MENU.newGame(); await sleep(1500); if (TUT.on) TUT.finish();
const out = {};
const me = S.me;
const clear = () => { S.units = S.units.filter(u => u === me); S.squads = S.squads.filter(s => s.units.includes(me)); S.vehicles = []; S.drones = []; S.builders = []; S.proj = []; for (const s of S.squads) s.units = [me]; };
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ S.me = me; CAMFX.fly = null; S.mode = 'fps'; if (fn && fn(i / 60) === false) return; update(1 / 60); } };
const log = [];
window.DMGLOG = (e, src, pt, d) => { if (src === me) log.push(e.cls + ':' + (e.type || e.role || '') + ':' + pt + ':' + d.toFixed(1)); };
async function test(spot0){
  const side = anyTangent(spot0), fw = norm(cross(spot0, side)), spot = offsetOnSphere(spot0, side, 6);
  clear(); me.pos = surfacePoint(offsetOnSphere(spot, fw, -25)); me.vel = [0, 0, 0]; me.up = norm(me.pos); me.hp = me.maxhp = 1e6;
  S.kit.w = 'rail'; S.kit.mag.rail = WEAPONS.rail.mag; S.kit.reloadT = 0; me.cd = 0;
  const sq = spawnSquad(1, false, surfacePoint(offsetOnSphere(spot, fw, 20)), 1, ['assault']); const tg = sq.units[0]; tg.parked = true; tg.hp = tg.maxhp = ROLES.assault.hp;
  const aim = () => { S.kit.kick = 0; const e = add(me.pos, mul(me.up, RULES.EYE)); me.fwd = norm(sub(add(tg.pos, mul(tg.up, 0.25)), e)); };
  log.length = 0;
  step(0.6, aim); mouseL = true; mouseR = true;
  step(3, () => { aim(); if (!tg.alive) return false; });
  mouseL = false; mouseR = false; S.aiming = false;
  return { alive: tg.alive, hp: Math.round(tg.hp), log: log.slice(0, 6), bldNear: S.buildings.filter(b => b.alive && surfDist(b.pos, spot) < 40).map(b => b.type) };
}
out.atA = await test(CPD[0]);
out.away = await test(norm(add(mul(CPD[0], 0.7), mul(anyTangent(CPD[0]), 0.7))));
return out;
