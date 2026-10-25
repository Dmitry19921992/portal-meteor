// fps_melee.js — мясорубка 4×4 отряда с обменом сторон (проверка симметрии), потери и выстрелы по командам
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const out = { build: location.pathname.split('/').pop() };
MENU.newGame(); await sleep(2000);
const me = S.me; S.diff = 1;
const spot0 = CPD[0], side = anyTangent(spot0), fw = norm(cross(spot0, side));
const spot = offsetOnSphere(spot0, side, 6);
const step = (sec) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ S.me = me; CAMFX.fly = null; S.mode = 'fps'; update(1 / 60); } };
const shots = [0, 0], hits = [0, 0];
window.DMGLOG = (e, src, t, d) => { if (src && src.team !== undefined && src.team < 2 && (t === 'b' || t === 'l')) hits[src.team]++; };
const _gs = typeof gunShoot === 'function' ? gunShoot : null; if (_gs) gunShoot = function(src, ...a){ shots[src.team]++; return _gs.call(this, src, ...a); };
for (const flip of [1, -1]){
  S.units = S.units.filter(u => u === me); S.squads = S.squads.filter(s => s.units.includes(me)); for (const s of S.squads) s.units = [me];
  S.vehicles = []; S.drones = []; S.proj = []; me.pos = surfacePoint(offsetOnSphere(spot, fw, -400)); me.hp = me.maxhp = 1e6;
  for (const T of S.teams){ T.ai = false; T.weapons = 0; T.armor = 0; T.cmd = 0; T.ore = 0; } S.buildings.length = 0; BLD_LIST = S.buildings; bgridDirty(); S.strikes = []; S.pods = []; S.supp = [];
  shots[0] = shots[1] = hits[0] = hits[1] = 0;
  for (let k = 0; k < 4; k++){
    const a = spawnSquad(0, false, surfacePoint(offsetOnSphere(spot, fw, flip * (-60 + k * 3))), 4); setOrder(a, 'move', mul(spot, RM), { lock: 999 });
    const b = spawnSquad(1, false, surfacePoint(offsetOnSphere(spot, fw, flip * (60 - k * 3))), 4); setOrder(b, 'move', mul(spot, RM), { lock: 999 });
  }
  const snap = [];
  for (let s = 0; s < 4; s++){ step(10); snap.push([0, 1].map(t => S.units.filter(u => u.team === t && u !== me && u.alive).length).join(':')); }
  out['flip' + flip] = { alive: snap.join(' '), shots: shots.join(':'), hits: hits.join(':') };
}
if (_gs) gunShoot = _gs;
return out;
