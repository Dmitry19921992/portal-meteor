// дуэли под ИИ: кто кого (контры новой техники). Каждая — до 45 с боя
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && SCENE) break; await sleep(1000); }
const out = {};
const duel = (name, mkA, mkB) => {
  newMatch({ attract: true }); S.teams[0].ai = false; S.teams[1].ai = false;
  const cp = S.cps[1], up = cp.dir, t1 = anyTangent(up), t2 = cross(up, t1);
  const at = (a, b, r) => surfacePoint(norm(add(add(mul(up, RM), mul(t1, a)), mul(t2, b))), r || 1.5);
  for (const u of S.units) if (dist(u.pos, cp.pos) < 300) u.alive = false;
  S.units = S.units.filter(u => u.alive); for (const sq of S.squads) sq.units = sq.units.filter(u => u.alive); S.squads = S.squads.filter(s => s.units.length);
  for (const v of S.vehicles) if (dist(v.pos, cp.pos) < 300) v.alive = false; S.vehicles = S.vehicles.filter(v => v.alive);
  for (const b of S.buildings) if (dist(b.pos, cp.pos) < 300) destroy(b, null);
  const A = mkA(at, 0), B = mkB(at, 1);
  const units = g => g.units ? g.units : [g];
  const hp = g => Math.round(units(g).filter(u => u.alive).reduce((s, u) => s + max(0, u.hp), 0));
  const hp0 = [hp(A), hp(B)];
  let t = 0;
  for (; t < 45; t += 0.05){
    for (const g of [A, B]) for (const u of units(g)) u.seen[1 - u.team] = 2;
    update(0.05);
    if (!units(A).some(u => u.alive) || !units(B).some(u => u.alive)) break;
  }
  out[name] = { A: `${hp(A)}/${hp0[0]}`, B: `${hp(B)}/${hp0[1]}`, t: Math.round(t), winner: !units(A).some(u => u.alive) ? 'B' : !units(B).some(u => u.alive) ? 'A' : 'none' };
};
const veh = (vk, a, b) => (at, team) => { const v = vk === 'tank' ? makeTank(at(a, b), team) : V2.make(at(a, b), team, vk); v.order = 'attack'; v.goal = at(-a, -b); v.manualUntil = 0; return v; };
const squad = (a, b) => (at, team) => { const sq = spawnSquad(team, false, at(a, b, 0.5), 4); setOrder(sq, 'attack', at(-a, -b, 0.5), {}); return sq; };
duel('raider_vs_mlrs_close', veh('raider', -15, 0), veh('mlrs', 15, 0));
duel('raider_vs_tank', veh('raider', -25, 0), veh('tank', 25, 0));
duel('raider_vs_squad', veh('raider', -25, 0), squad(25, 0));
duel('mlrs_vs_squad_far', veh('mlrs', -60, 0), squad(60, 0));
duel('mortar_vs_squad', veh('cat', -45, 0), squad(45, 0));
duel('catapult_vs_squad', squad(-45, 0), veh('cat', 45, 0));
duel('mortar_vs_tank', veh('cat', -45, 0), veh('tank', 45, 0));
duel('hive_vs_tank', veh('tank', -60, 0), veh('mlrs', 60, 0));
duel('wasp_vs_raider', veh('raider', -25, 0), veh('raider', 25, 0));
return out;
