// диагностика дуэли 30 м: кто чем и сколько наносит
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!S.me || S.attract){ MENU.newGame(); await sleep(2500); }
const me = S.me; S.diff = 1;
const spot0 = CPD[0], side = anyTangent(spot0), fw = norm(cross(spot0, side));
const spot = offsetOnSphere(spot0, side, 6);
const log = [];
window.DMGLOG = (e, src, t, d) => { log.push([+S.time.toFixed(2), src ? (src.cls + src.team) : '-', t, +d.toFixed(1), e.cls + e.team]); };
const res = [];
for (let k = 0; k < 3; k++){
  S.units = S.units.filter(u => u === me); S.squads = S.squads.filter(s => s.units.includes(me)); for (const s of S.squads) s.units = [me];
  S.vehicles = []; S.drones = []; S.proj = []; me.pos = surfacePoint(offsetOnSphere(spot, fw, -400)); me.hp = me.maxhp = 1e6;
  const mk = (off, team) => { const sq = spawnSquad(team, false, surfacePoint(offsetOnSphere(spot, fw, off - 25)), 1, ['assault']); const u = sq.units[0]; u.parked = true; u.leader = false; u.hp = u.maxhp = 100; return u; };
  const a = mk(0, 0), b = mk(30, 1);
  log.length = 0; let shots = [0, 0];
  const _g = gunShoot; gunShoot = function(src, ...x){ if (src === a) shots[0]++; if (src === b) shots[1]++; return _g.call(this, src, ...x); };
  const t0 = S.time;
  for (let i = 0; i < 1200 && a.alive && b.alive; i++){ S.me = me; CAMFX.fly = null; update(1 / 60); }
  gunShoot = _g;
  res.push({ t: +(S.time - t0).toFixed(2), shots: shots.join(':'), log: log.slice(0, 14).map(x => x.join(' ')).join(' | ') });
}
window.DMGLOG = null;
return res;
