// fps_duel.js — баланс ботов: дуэли 1×1 на 20/30/45 м и «мясорубка» 8×8 отрядов (потери за 40 с). Работает и на базе v5.3.
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const out = { build: location.pathname.split('/').pop() };
MENU.newGame(); await sleep(2000);
const me = S.me;
const spot0 = CPD[0], side = anyTangent(spot0), fw = norm(cross(spot0, side));
const spot = offsetOnSphere(spot0, side, 6);
const clear = () => { for (const T of S.teams){ T.ai = false; T.weapons = 0; T.armor = 0; T.cmd = 0; T.ore = 0; } S.buildings.length = 0; BLD_LIST = S.buildings; bgridDirty(); S.strikes = []; S.pods = []; S.supp = []; ADAPT.v = 0;
  S.units = S.units.filter(u => u === me); S.squads = S.squads.filter(s => s.units.includes(me)); S.vehicles = []; S.drones = []; S.builders = []; S.proj = []; for (const s of S.squads) s.units = [me]; };
const r2 = x => Math.round(x * 100) / 100;
const mk = (role, off, team) => { const sq = spawnSquad(team, false, surfacePoint(offsetOnSphere(spot, fw, off - 25)), 1, [role]); const u = sq.units[0]; u.parked = true; u.leader = false; u.hp = u.maxhp = ROLES[role].hp; return u; };
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ S.me = me; CAMFX.fly = null; S.mode = 'fps'; if (fn && fn() === false) return; update(1 / 60); } };
async function duel(d, ra, rb){
  let sum = 0, n = 0;
  for (let k = 0; k < 8; k++){
    clear(); me.pos = surfacePoint(offsetOnSphere(spot, fw, -400)); me.hp = me.maxhp = 1e6;
    const a = mk(ra, 0, 0), b = mk(rb, d, 1);
    const t0 = S.time; let tk = -1;
    step(30, () => { if (!a.alive || !b.alive){ tk = S.time - t0; return false; } });
    if (tk > 0){ sum += tk; n++; }
  }
  return { avg: r2(n ? sum / n : -1), n };
}
S.diff = 1;   // «Нормальная» — без адаптивной подстройки
out.duel20 = await duel(20, 'assault', 'assault');
out.duel30 = await duel(30, 'assault', 'assault');
out.duel45 = await duel(45, 'assault', 'assault');
out.heavy30 = await duel(30, 'heavy', 'assault');
out.sniper60 = await duel(40, 'sniper', 'assault');
// мясорубка: 4 отряда против 4, сходятся у точки A
{
  clear(); me.pos = surfacePoint(offsetOnSphere(spot, fw, -400)); me.hp = me.maxhp = 1e6;
  for (let k = 0; k < 4; k++){
    const a = spawnSquad(0, false, surfacePoint(offsetOnSphere(spot, fw, -60 + k * 3)), 4); setOrder(a, 'move', mul(spot, RM), { lock: 999 });
    const b = spawnSquad(1, false, surfacePoint(offsetOnSphere(spot, fw, 60 - k * 3)), 4); setOrder(b, 'move', mul(spot, RM), { lock: 999 });
  }
  const n0 = [0, 1].map(t => S.units.filter(u => u.team === t && u !== me).length);
  const snap = [];
  for (let s = 0; s < 4; s++){ step(10); snap.push([0, 1].map(t => S.units.filter(u => u.team === t && u !== me && u.alive).length).join(':')); }
  out.melee16v16 = { start: n0.join(':'), after10_20_30_40s: snap.join(' ') };
}
return out;
