// fps_ttk.js — время убийства (TTK): игрок по боту, по дрону, бот против бота, боты против игрока
// чистое поле: вокруг никого, симуляция update(1/60)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const out = {};
const HITS = { n: 0, shots: 0 }; window.DMGLOG = (e, src, t, d) => { if (src === S.me) HITS.n++; }; const _ps = gunPlayerShot; gunPlayerShot = function(...a){ HITS.shots++; return _ps.apply(this, a); };
MENU.newGame(); await sleep(2000);
const me = S.me;
const spot0 = CPD[0], side = anyTangent(spot0), fw = norm(cross(spot0, side));   // ровная площадка точки A
const spot = offsetOnSphere(spot0, side, 6);
const clear = () => { S.units = S.units.filter(u => u === me); S.squads = S.squads.filter(s => s.units.includes(me)); S.vehicles = []; S.drones = []; S.builders = []; S.proj = []; for (const s of S.squads) s.units = [me]; };
const place = (u, dir, off) => { u.pos = surfacePoint(offsetOnSphere(dir, fw, off - 25)); u.vel = [0, 0, 0]; u.up = norm(u.pos); };
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ S.me = me; CAMFX.fly = null; S.mode = 'fps'; if (fn && fn(i / 60) === false) return; update(1 / 60); } };
const r2 = x => Math.round(x * 100) / 100;
const mkEnemy = (role, off, team) => { const sq = spawnSquad(team === undefined ? 1 : team, false, surfacePoint(offsetOnSphere(spot, fw, off - 25)), 1, [role]); const u = sq.units[0]; u.parked = true; u.leader = false; u.hp = u.maxhp = ROLES[role].hp; return u; };
// игрок по неподвижному боту
async function playerTTK(w, distM, role, aimHead){
  clear(); place(me, spot, 0); me.hp = me.maxhp = 1e6;
  S.kit.w = w; S.kit.mag[w] = WEAPONS[w].mag; S.kit.reloadT = 0; S.kit.bloom = 0; S.kit.kick = 0; me.cd = 0;
  const tg = mkEnemy(role || 'assault', distM);
  const aim = () => { S.kit.kick = 0; const e = add(me.pos, mul(me.up, RULES.EYE)); me.fwd = norm(sub(aimHead ? add(tg.pos, mul(tg.up, 0.94)) : add(tg.pos, mul(tg.up, 0.25)), e)); };
  step(0.6, () => { aim(); });
  const t0 = S.time; let tk = -1; HITS.n = 0; HITS.shots = 0;
  mouseL = true; if (w === 'rail') mouseR = true;
  step(6, () => { aim(); if (!tg.alive){ tk = S.time - t0; return false; } });
  mouseL = false; mouseR = false; S.aiming = false;
  return { ttk: r2(tk), shots: HITS.shots, hits: HITS.n, los: los(add(me.pos, mul(me.up, 1)), add(tg.pos, mul(tg.up, 0.3))), hpLeft: tg.alive ? Math.round(tg.hp) : 0 };
}
out.rifle15 = await playerTTK('rifle', 15);
out.rifle30 = await playerTTK('rifle', 30);
out.rifle45 = await playerTTK('rifle', 45);
out.rifle30head = await playerTTK('rifle', 30, 'assault', true);
out.rifle30heavy = await playerTTK('rifle', 30, 'heavy');
out.hmg30 = await playerTTK('hmg', 30);
me.role = 'scout'; out.smg20 = await playerTTK('smg', 20); me.role = 'assault';
out.rail45 = await playerTTK('rail', 45);
// игрок по дрону в воздухе (30 м, высота 12 м), дрон летает по кругу
{
  clear(); place(me, spot, 0); me.hp = me.maxhp = 1e6; S.kit.w = 'rifle'; S.kit.mag.rifle = 30; S.kit.reloadT = 0; me.cd = 0;
  const d = makeDrone(add(surfacePoint(offsetOnSphere(spot, fw, 5)), mul(spot, 12)), 1);
  d.focus = null; d.target = null;
  let tk = -1; const t0 = S.time; HITS.n = 0; HITS.shots = 0;
  mouseL = true;
  step(8, () => { const e = add(me.pos, mul(me.up, RULES.EYE)); me.fwd = norm(sub(d.pos, e)); if (!d.alive){ tk = S.time - t0; return false; } });
  mouseL = false;
  out.droneRifle30 = { ttk: r2(tk), shots: HITS.shots, hits: HITS.n, hp: d.maxhp, dist: Math.round(dist(me.pos, d.pos)) };
}
// бот против бота (оба штурмовики, стоят на месте), 30 и 60 м — среднее по 6 дуэлям
async function botDuel(distM, roleA, roleB){
  let sum = 0, n = 0, winsA = 0;
  for (let k = 0; k < 6; k++){
    clear(); place(me, spot, -300); me.hp = me.maxhp = 1e6;
    const a = mkEnemy(roleA || 'assault', 0, 0), b = mkEnemy(roleB || 'assault', distM, 1);
    a.parked = b.parked = true; a.hp = a.maxhp; b.hp = b.maxhp;
    const t0 = S.time; let tk = -1;
    step(25, () => { if (!a.alive || !b.alive){ tk = S.time - t0; if (a.alive) winsA++; return false; } });
    if (tk > 0){ sum += tk; n++; }
  }
  return { avgTTK: r2(n ? sum / n : -1), fights: n, winsA };
}
out.botDuel30 = await botDuel(30);
out.botDuel45 = await botDuel(45);
out.botDuelHeavyVsAssault40 = await botDuel(40, 'heavy', 'assault');
// боты против игрока: 2 штурмовика Роя на 35 м, игрок стоит (100 HP, не стреляет)
{
  let sum = 0, n = 0;
  for (let k = 0; k < 4; k++){
    clear(); place(me, spot, 0); me.maxhp = 100; me.hp = 100; me.alive = true;
    const a = mkEnemy('assault', 35), b = mkEnemy('assault', 40);
    a.parked = b.parked = true;
    const t0 = S.time; let tk = -1;
    const n0 = Math.round(10 * 60);
    for (let i = 0; i < n0; i++){ S.me = me; CAMFX.fly = null; S.mode = 'fps'; update(1 / 60); if (me.hp <= 0 || !me.alive){ tk = S.time - t0; break; } }
    if (tk > 0){ sum += tk; n++; }
    if (!me.alive){ me.alive = true; me.hp = 100; if (!S.units.includes(me)) S.units.push(me); }
  }
  out.twoBotsVsPlayer35 = { avgTTK: r2(n ? sum / n : -1), deaths: n, diff: diffLabel() };
}
// производительность трассировки ботов: 100 выстрелов
{
  clear(); place(me, spot, 0);
  const a = mkEnemy('assault', 0, 0), b = mkEnemy('assault', 50, 1);
  a.target = b; const t0 = performance.now();
  for (let i = 0; i < 300; i++){ a.cd = 0; a.lastTgt = b; gunBotFire(a, norm(sub(b.pos, a.pos)), false); a.mag = 30; b.hp = b.maxhp; }
  out.botShot_us = r2((performance.now() - t0) / 300 * 1000);
  const t1 = performance.now();
  for (let i = 0; i < 300; i++){ gunTrace(add(me.pos, mul(me.up, 1)), norm(add(me.fwd, mul(me.up, -0.05))), 280, 0, { steps: 170 }); }
  out.playerTrace_us = r2((performance.now() - t1) / 300 * 1000);
}
return out;
