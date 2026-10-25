// оружие новой техники: попадания РСЗО (разброс), кассеты/мины, ракеты рейдера, вселение, сохранение
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && SCENE) break; await sleep(1000); }
MENU.newGame(); await sleep(1500);
S.teams[0].ai = false; S.teams[1].ai = false;
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ update(1 / 60); setupCamera(1 / 60); if (fn && fn(i / 60) === true) return true; } return false; };
const out = {};
// полигон: вдали от баз, у точки захвата
const cp = S.cps[0], up = cp.dir, t1 = anyTangent(up), t2 = cross(up, t1);
const at = (a, b, r) => surfacePoint(norm(add(add(mul(up, RM), mul(t1, a)), mul(t2, b))), r || 1.5);
// чистим поле: всех бойцов далеко от полигона — убираем
for (const u of [...S.units]) if (dist(u.pos, cp.pos) < 260){ u.alive = false; }
S.units = S.units.filter(u => u.alive); for (const sq of S.squads) sq.units = sq.units.filter(u => u.alive); S.squads = S.squads.filter(s => s.units.length);
for (const v of S.vehicles) if (dist(v.pos, cp.pos) < 260) v.alive = false;
S.vehicles = S.vehicles.filter(v => v.alive);
const track = (vkSel) => {   // следим за снарядами: где исчезли
  const seen = new Map(), ends = [];
  return { tick(){ const now = new Set(S.proj); for (const p of S.proj) if (p.from && p.from.vk === vkSel) seen.set(p, p.pos); for (const [p, pos] of seen) if (!now.has(p)){ ends.push({ pos: p.pos, v2: p.v2, type: p.type }); seen.delete(p); } }, ends };
};
// --- 1. РСЗО «Град» по танку на 110 м
{
  const m = V2.make(at(-55, 0), 0, 'mlrs'); m.manualUntil = 1e9; m.order = 'hold'; m.goal = m.pos;
  const tk = makeTank(at(55, 0), 1); tk.manualUntil = 1e9; tk.order = 'hold'; tk.goal = tk.pos; tk.hp = tk.maxhp = 99999;
  m.cd = 0;
  const tr = track('mlrs');
  let fired = 0;
  step(14, () => { tk.seen[0] = 2; tr.tick(); fired = max(fired, m.salvoK || 0); });
  const c = centerOf(tk);
  out.mlrs = { fired, landed: tr.ends.length, miss: tr.ends.map(e => +dist(e.pos, c).toFixed(1)), dmgTaken: Math.round(99999 - tk.hp), mlrsHp: m.hp, elev: +m.elev.toFixed(2), d: Math.round(dist(m.pos, tk.pos)) };
  m.alive = false; tk.alive = false; S.vehicles = S.vehicles.filter(v => v.alive);
}
// --- 2. «Улей» Роя по отряду на 90 м
{
  const h = V2.make(at(-45, 30), 1, 'mlrs'); h.manualUntil = 1e9; h.order = 'hold'; h.goal = h.pos; h.cd = 0;
  const sq = spawnSquad(0, false, at(45, 30, 0.5), 4); for (const u of sq.units){ u.parked = true; u.hp = u.maxhp = 400; }
  const tr = track('mlrs');
  const hp0 = sq.units.reduce((s, u) => s + u.hp, 0);
  step(12, () => { for (const u of sq.units) u.seen[1] = 2; tr.tick(); });
  out.hive = { landed: tr.ends.length, dmg: Math.round(hp0 - sq.units.reduce((s, u) => s + max(0, u.hp), 0)), alive: sq.units.filter(u => u.alive).length };
  h.alive = false; for (const u of sq.units) u.alive = false; S.vehicles = S.vehicles.filter(v => v.alive); S.units = S.units.filter(u => u.alive); S.squads = S.squads.filter(s => s !== sq);
}
// --- 3. катапульта Роя: кассета раскрывается; миномёт: мина
for (const team of [1, 0]){
  const c = V2.make(at(-40, -40), team, 'cat'); c.manualUntil = 1e9; c.order = 'hold'; c.goal = c.pos; c.cd = 0;
  const sq = spawnSquad(1 - team, false, at(40, -40, 0.5), 4); for (const u of sq.units){ u.parked = true; u.hp = u.maxhp = 400; }
  const hp0 = sq.units.reduce((s, u) => s + u.hp, 0);
  let splits = 0, maxH = 0; const tr = track('cat');
  step(13, () => { for (const u of sq.units) u.seen[team] = 2; for (const p of S.proj) if (p.v2 === 'c' || p.v2 === 'm') maxH = max(maxH, len(p.pos) - groundR(norm(p.pos))); for (const e of S.events) if (e.type === 'v2' && e.k === 'pop') splits++; tr.tick(); });
  const cc = sq.units[0].pos;
  out['cat' + team] = { splits, apex: Math.round(maxH), landed: tr.ends.length, miss: tr.ends.slice(0, 8).map(e => +dist(e.pos, cc).toFixed(1)), dmg: Math.round(hp0 - sq.units.reduce((s, u) => s + max(0, u.hp), 0)) };
  c.alive = false; for (const u of sq.units) u.alive = false; S.vehicles = S.vehicles.filter(v => v.alive); S.units = S.units.filter(u => u.alive); S.squads = S.squads.filter(s => s !== sq);
}
// --- 4. рейдер против турели (ИИ)
{
  const r = V2.make(at(-30, 60), 0, 'raider'); r.manualUntil = 1e9; r.order = 'hold'; r.goal = r.pos; r.cd = 0;
  const tu = makeBuilding('turret', 1, norm(at(25, 60, 0))); tu.built = 1; tu.done = true; tu.hp = tu.maxhp;
  let rk = 0; const t0 = S.time;
  step(25, () => { for (const e of S.events) if (e.type === 'v2' && e.k === 'rk') rk++; if (!tu.alive || !r.alive) return true; });
  out.raiderVsTurret = { rockets: rk, turretAlive: tu.alive, turretHp: Math.round(tu.hp), raiderHp: Math.round(r.hp), raiderAlive: r.alive, t: +(S.time - t0).toFixed(1) };
  if (tu.alive) destroy(tu, null); r.alive = false; S.vehicles = S.vehicles.filter(v => v.alive);
}
// --- 5. вселение в рейдер: газ, руль, залп
{
  const r = V2.make(at(0, -80), 0, 'raider');
  takeControl(r); S.mode = 'fps';
  const p0 = r.pos;
  keys[SET.bind.fwd] = true; step(3); keys[SET.bind.fwd] = false;
  const sp = len(r.vel), moved = dist(r.pos, p0);
  mouseL = true; let rk = 0; step(1.5, () => { for (const e of S.events) if (e.type === 'v2' && e.k === 'rk') rk++; }); mouseL = false;
  out.possessRaider = { me: S.me === r, speed: +sp.toFixed(1), moved: +moved.toFixed(1), rockets: rk, hud: document.getElementById('jetLbl').textContent };
  // РСЗО игрока: ЛКМ — залп в точку прицела
  const m = V2.make(at(0, -100), 0, 'mlrs'); takeControl(m); m.cd = 0;
  step(0.2); mouseL = true; let sal = 0; step(2, () => { for (const e of S.events) if (e.type === 'v2' && e.k === 'salvo') sal++; }); mouseL = false;
  out.possessMlrs = { salvoRockets: sal, aimDist: m.aimPt ? Math.round(dist(m.aimPt, m.pos)) : null, aimOk: m.aimOk };
  out.possessMlrs.abil = abilList(m).join(',');
  // миномёт игрока: вид сверху (ПКМ) и выстрел
  const c = V2.make(at(10, -100), 0, 'cat'); takeControl(c); c.cd = 0;
  mouseR = true; step(1); const dHi = c.aimPt ? Math.round(dist(c.aimPt, c.pos)) : null;
  mouseL = true; let mo = 0; step(1, () => { for (const e of S.events) if (e.type === 'v2' && e.k === 'mortar') mo++; }); mouseL = false; mouseR = false;
  out.possessMortar = { aimDistHighView: dHi, aimOk: c.aimOk, shells: mo, cam: S.cam ? Math.round(len(S.cam.pos) - len(c.pos)) : null };
  // приказ «огонь по площади» из стратегии (способность R) для РСЗО под ИИ
  takeControl(S.units.find(u => u.alive && u.team === 0));
  const m2 = V2.make(at(-60, -120), 0, 'mlrs'); m2.cd = 0; m2.manualUntil = 1e9; m2.order = 'hold'; m2.goal = m2.pos;
  const pt = at(60, -120, 0.3);
  const why = useAbility(m2, 'v2salvo', pt);
  const tr2 = track('mlrs'); step(8, () => tr2.tick());
  out.attackGround = { why, landed: tr2.ends.length, miss: tr2.ends.map(e => +dist(e.pos, pt).toFixed(1)) };
}
// --- 6. сохранение и загрузка
{
  const before = S.vehicles.filter(v => v.vk).map(v => v.vk + v.team + ':' + Math.round(v.hp)).sort().join(' ');
  const ok = SAVE.save();
  SAVE.load();
  const after = S.vehicles.filter(v => v.vk).map(v => v.vk + v.team + ':' + Math.round(v.hp)).sort().join(' ');
  step(1);
  out.save = { ok, same: before === after, before, after, meVk: S.me && S.me.vk, ser: JSON.stringify(S.teams[0].v2ser) };
}
return out;
