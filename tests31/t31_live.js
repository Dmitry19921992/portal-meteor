// T31 live test: vegetation collisions, Verdans vs buildings, anomalies vs Verdans.
// node tests/cdp73.js wt_t31/tests31/t31_live.js --target t31_test.html --port 9431 --vp 1280x720   (phone: --phone2, window.__t31pre='ph')
const out = { err: [] }; const SH = 'D:/AI/pm_v6/wt_t31/tests31/shots/' + (window.__t31pre || 'pc') + '_';
const W = (k, f) => { try { out[k] = f(); } catch (e){ out.err.push(k + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
for (let i = 0; i < 400 && (typeof MENU === 'undefined' || MENU.cur == null); i++) await sleep(500);
const p = ctr('#m_f76now') || ctr('#m_u815play'); if (p) await IN.click(p[0], p[1]);
for (let i = 0; i < 60; i++){ if (!(typeof FEEL76 !== 'undefined' && FEEL76.intro)) break; await sleep(500); }
await sleep(2500);
out.start = { attract: S.attract, mode: S.mode, menu: MENU.cur, me: !!S.me, T31: { on: T31.on, VEG: T31.VEG, BLD: T31.BLD, AN: T31.AN }, verdans: VER86.L.length, anomalies: A78.L.map(a => a.k).join(',') };
const ground = (d, h) => mul(d, groundR(d) + h);
const findCell = (kind, bio) => { for (let n = 0; n < 6000; n++){ const d = norm([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]); if (BIO86.at(mul(d, RM)) !== bio) continue; let r = null; T31.nearVeg(mul(d, RM), c => { if (!r && c.m === kind) r = c; }); if (r) return r; } return null; };
const mkInp = (u, wish) => ({ wish, speedMul: 1, jump: false, thrust: false, thrustDir: norm(u.pos), lift: false, boost: 0, brake: false, fire: false, aim: u.fwd });
// ------------------------------------------------------------------ 1. vegetation (game paused, manual physStep)
S.paused = true;
const walk = (u, c, startOff, steps, straight) => {
  const F = c.Z, d0 = offsetOnSphere(c.dir, F, -startOff);
  u.pos = ground(d0, u.rad + 0.05); u.vel = [0, 0, 0]; u.up = norm(u.pos); u.fwd = norm(tangent(F, u.up)); u.suppT = 0; u.overT = 0; u.b86T = undefined;
  let minD = 1e9; const p0 = u.pos;
  for (let i = 0; i < steps; i++){
    const wish = straight ? norm(tangent(F, norm(u.pos))) : norm(tangent(sub(c.pos, u.pos), norm(u.pos)));
    physStep(u, mkInp(u, wish), 1 / 60, false);
    minD = Math.min(minD, len(T31.rel(c, u.pos).t));
  }
  return { minD: +minD.toFixed(2), moved: +dist(p0, u.pos).toFixed(2) };
};
const inf = S.units.find(u => u.alive && u.cls === 'inf' && u !== S.me && u.team === 1);
const veh = S.vehicles.find(v => v.alive && v.cls === 'tank');
for (const [kind, bio] of [['v86tree', 2], ['v86crys', 1], ['v86ice', 3]]) W('veg_' + kind, () => {
  const c = findCell(kind, bio); if (!c) return 'no cell';
  const pos0 = inf.pos;
  T31.VEG = true; const on = walk(inf, c, 3, 150);
  T31.VEG = false; const off = walk(inf, c, 3, 150); T31.VEG = true;
  inf.pos = pos0;
  return { s: +c.s.toFixed(2), R: +(T31.SOLID[kind].r * c.s + inf.rad * 0.8).toFixed(2), on, off, pass: on.minD > T31.SOLID[kind].r * c.s && off.minD < 0.35 };
});
W('veg_bush', () => {
  const c = findCell('v86bush', 2); if (!c) return 'no cell';
  T31.VEG = true; const on = walk(inf, c, 0.2, 60, true);
  T31.VEG = false; const off = walk(inf, c, 0.2, 60, true); T31.VEG = true;
  return { on, off, ratio: +(on.moved / off.moved).toFixed(2) };
});
W('veg_crush', () => {
  if (!veh) return 'no vehicle';
  const c = findCell('v86tree', 2); if (!c) return 'no cell';
  const b0 = T31.broken.size, F = c.Z; veh.pos = ground(offsetOnSphere(c.dir, F, -7), veh.rad + 0.1); veh.up = norm(veh.pos); veh.fwd = norm(tangent(F, veh.up)); veh.vel = mul(veh.fwd, 6); veh.b86T = undefined;
  for (let i = 0; i < 120; i++) physStep(veh, mkInp(veh, norm(tangent(F, norm(veh.pos)))), 1 / 60, false);
  return { broken: T31.broken.has(c.k31), added: T31.broken.size - b0, crushed: T31.stats.crushed };
});
S.paused = false;
// ------------------------------------------------------------------ 2. Verdans vs buildings (live)
const look = (pt, back, hh) => { const me = S.me; if (!me) return; const d = norm(pt), F = norm(tangent(anyTangent(d), d)); let md = offsetOnSphere(d, F, -back); for (let k = 0; k < 8 && groundR(md) > len(pt) + 1; k++) md = offsetOnSphere(d, norm(tangent(randUnit(), d)), back); me.pos = ground(md, hh || 2.5); me.vel = [0, 0, 0]; me.up = norm(me.pos); me.fwd = norm(tangent(sub(pt, me.pos), me.up)); me.aim = norm(sub(pt, add(me.pos, mul(me.up, 0.8)))); if (typeof S.pitch === 'number') S.pitch = Math.asin(clamp(dot(me.aim, me.up), -1, 1)); if (me.maxhp) me.hp = me.maxhp; };
const camAt = (pt, back, hh) => { const d = norm(pt); let best = null; for (let k = 0; k < 12; k++){ const F = norm(tangent(k ? randUnit() : anyTangent(d), d)), md = offsetOnSphere(d, F, back), e = ground(md, hh); if (!best || len(e) - groundR(md) > 0 && groundR(md) < (best.g)) best = { e, g: groundR(md) }; } S.camOverride = { pos: best.e, look: pt }; };
let bScene = null, wScene = null;
W('bld', () => {
  const f = VER86.L.find(f => f.alive && f.st !== 'agro' && (f.sp === 'shell' || f.sp === 'tri')); if (!f) return 'no verdan'; f.used31 = 1;
  const b = makeBuilding('turret', 1, offsetOnSphere(f.dir, f.fwd, 5)); if (typeof finishSite === 'function') finishSite(b);
  b.hp = b.maxhp; bScene = { f, b, hp0: b.hp };
  return { sp: f.sp, type: b.type, edge: +T31.edge(f, b).toFixed(1), hp0: b.hp };
});
W('bldWhip', () => {
  const f = VER86.L.find(f => f.alive && f.sp === 'whip' && f.st !== 'agro' && !f.used31); if (!f) return 'no whip'; f.used31 = 1;
  const b = makeBuilding(BTYPES.wall82 ? 'wall82' : 'turret', 1, offsetOnSphere(f.dir, f.fwd, 4.5)); if (typeof finishSite === 'function') finishSite(b);
  b.hp = b.maxhp; wScene = { f, b, hp0: b.hp };
  return { type: b.type, edge: +T31.edge(f, b).toFixed(1) };
});
if (bScene) look(bScene.b.pos, 14);
await sleep(5000);
if (bScene){ camAt(add(bScene.b.pos, mul(norm(bScene.b.pos), 1.2)), 11, 4); await sleep(600); await shot(SH + 'bld.jpg'); S.camOverride = null; }
await sleep(6000);
W('bldResult', () => bScene ? { st: bScene.f.st, tgtIsBld: bScene.f.tgt === bScene.b, hpLost: Math.round(bScene.hp0 - bScene.b.hp), bldAlive: bScene.b.alive, verdanAlive: bScene.f.alive,
  whip: wScene ? { st: wScene.f.st, tgtIsBld: wScene.f.tgt === wScene.b, hpLost: Math.round(wScene.hp0 - wScene.b.hp) } : null, stats: { agro: T31.stats.bldAgro, hits: T31.stats.bldHits } } : null);
// ------------------------------------------------------------------ 3. anomalies vs Verdans (live)
const anyV = () => VER86.L.find(f => f.alive && !f.used31 && !f.a86 && f.sp !== 'swarm' && !f.bur);
const put = (f, a, off) => { const d = off ? offsetOnSphere(a.dir, a.t1, off) : a.dir; f.dir = d; f.g = groundR(d); f.home = d; f.goal = null; f.st = 'calm'; f.tgt = null; f.pos = add(mul(d, f.g), mul(d, VER86.SP[f.sp].h)); f.used31 = 1; };
const AT = {};
for (const k of ['arc', 'grav', 'vein', 'burn', 'mist', 'disloc', 'geyser', 'draft']){
  const a = A78.L.find(x => x.k === k && !A78.dorm(x)); const f = anyV();
  if (!a || !f){ AT[k] = !a ? 'no anomaly' : 'no verdan'; continue; }
  if (k === 'vein'){ f.hp = f.maxhp * 0.5; f.hp0v = f.hp; }
  put(f, a, k === 'draft' ? 0 : 0.8);
  AT[k] = { f, a, hp0: f.hp, dir0: f.dir, sp: f.sp };
}
if (AT.disloc && AT.disloc.f) look(AT.disloc.f.pos, 12);
if (AT.vein && AT.vein.a) setTimeout(() => A78.discharge(AT.vein.a, null), 600);   // жила поёт (разрядка) — вердан внутри должен вылечиться
await sleep(2200);
if (AT.disloc && AT.disloc.f && AT.disloc.f.a86){ camAt(AT.disloc.f.pos, 12, 1.5); await sleep(300); await shot(SH + 'disloc.jpg'); S.camOverride = null; }
await sleep(3500);
W('anom', () => { const R = {}; for (const k in AT){ const t = AT[k]; if (typeof t === 'string'){ R[k] = t; continue; }
  R[k] = { sp: t.sp, dHp: Math.round(t.f.hp - t.hp0), alive: t.f.alive, moved: +surfDist(t.dir0, t.f.dir).toFixed(1), frz: t.f.frz86 > S.time, lift: t.f.a86 ? t.f.a86.ph : null }; } return R; });
W('stats', () => ({ T31: T31.stats, err: T31.err, VERerr: VER86.err, A78err: A78.err, AN86err: AN86.err, BIOerr: BIO86.err }));
// tree right in front of the player (first person)
W('treeShot', () => { const c = findCell('v86tree', 2); if (!c) return 'no tree'; const F = c.Z, d = offsetOnSphere(c.dir, F, -2.2); S.me.pos = ground(d, 1); S.me.vel = [0, 0, 0]; S.me.up = norm(S.me.pos); S.me.fwd = norm(tangent(F, S.me.up)); S.me.aim = S.me.fwd; return 'ok'; });
await sleep(1500); await shot(SH + 'tree.jpg');
return out;
