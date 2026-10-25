// v7.6: craters deform terrain (JS + shader), units walk into them; vehicle crosses.
// The battle is silenced (other units removed, AI off) and the simulation is stepped manually (PC runs ~4 FPS on Intel UHD).
const O = 'D:/AI/pm_v6/shots_v78/';
const out = { errs };
if (MENU.cur){ SET.fac76 = 0; MENU.newGame(); await sleep(3000); }
if (MENU.cur) MENU.close(); S.paused = false; DEN75.set(0);
const u = S.me;
const quiet = () => {
  for (const L of [S.units, S.vehicles, S.drones, S.builders]) for (const e of L) if (e !== u && e !== S.me && !e.keep76) e.alive = false;
  S.units = S.units.filter(e => e.alive); S.vehicles = S.vehicles.filter(e => e.alive); S.drones = S.drones.filter(e => e.alive); S.builders = S.builders.filter(e => e.alive);
  for (const sq of S.squads) sq.units = sq.units.filter(e => e.alive); S.squads = S.squads.filter(s => s.units.length);
  S.proj = []; S.strikes = []; for (const T of S.teams){ T.ai = false; T.ore = 0; T.waveT = T.skyT = T.podT = 1e9; }
  for (const h of S.hq) h.queue = [];
};
quiet(); CR76.reset();
const run76 = (n, fn) => { for (let i = 0; i < n; i++){ if (fn && fn(i) === false) break; update(0.05); } };
let spot = null;
for (let a = 0; a < 40 && !spot; a++){
  const d = offsetOnSphere(BASES[0], rotAxis(anyTangent(BASES[0]), BASES[0], a * 0.16), 175 + (a % 4) * 12);
  const t = anyTangent(d); let hmin = 1e9, hmax = -1e9;
  for (let k = 0; k < 8; k++){ const g = groundR(offsetOnSphere(d, rotAxis(t, d, k * 0.785), 9)); hmin = min(hmin, g); hmax = max(hmax, g); }
  if (hmax - hmin < 0.8 && !PROPS.some(p => surfDist(p.dir, d) < 25)) spot = d;
}
out.spotFound = !!spot; if (!spot) spot = offsetOnSphere(BASES[0], anyTangent(BASES[0]), 180);
const up = spot, fw = anyTangent(up);
u.pos = surfacePoint(offsetOnSphere(up, fw, -11), 0.5); u.vel = [0, 0, 0]; u.up = norm(u.pos); u.fwd = tangent(fw, u.up);
run76(20);
const prof = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 10].map(m => groundR(offsetOnSphere(spot, fw, m)));
const p0 = prof(), g0 = groundR(spot);
const tp = mul(spot, g0);
const T0 = performance.now();
for (let k = 0; k < 3; k++) splash(add(tp, mul(randUnit(), 0.6)), 1, 110, 7, null, 'a');   // «Град»: 3 ракеты
out.addMs = +((performance.now() - T0) / 3).toFixed(1);
const p1 = prof();
out.crater = { n: CR76.n, stats: Object.assign({}, CR76.stats), depthCenter: +(g0 - groundR(spot)).toFixed(2), L: CR76.L.map(c => [+c.r.toFixed(2), +c.D.toFixed(2)]),
  dentProfile_m0_10: p1.map((v, i) => +(v - p0[i]).toFixed(2)) };
const n0 = CR76.stats.made + CR76.stats.merged;
splash(mul(offsetOnSphere(up, fw, 40), RM + 1), 1, 30, 2, null, 'b');
splash(mul(offsetOnSphere(up, fw, 45), RM + 1), 1, 85, 6, u, 'g');
out.noCraterSmallArms = CR76.stats.made + CR76.stats.merged === n0;
fxExplosion(tp, 3);
S.camOverride = { pos: mul(offsetOnSphere(up, fw, -9), g0 + 4.5), look: tp }; await sleep(3500); await shot(O + 'pc_crater_view.jpg');
S.camOverride = { pos: mul(offsetOnSphere(up, fw, -2), g0 + 18), look: tp }; await sleep(3000); await shot(O + 'pc_crater_top.jpg'); S.camOverride = null;
let minA = 1e9, gr = 0, n = 0, minH = 1e9, passC = 1e9;
const far = mul(offsetOnSphere(up, fw, 12), RM);
run76(400, () => {
  u.fwd = tangent(sub(far, u.pos), norm(u.pos)); keys.KeyW = true;
  n++; if (u.grounded) gr++;
  minH = min(minH, len(u.pos) - 0.5 - g0); minA = min(minA, len(u.pos) - groundR(norm(u.pos))); passC = min(passC, surfDist(u.pos, tp));
  if (surfDist(u.pos, far) < 1.5) return false;
});
keys.KeyW = false;
out.walk = { lowestFeetVsOldGround: +minH.toFixed(2), minCenterAboveNewGround: +minA.toFixed(2), passedCenterAt: +passC.toFixed(2), groundedShare: +(gr / n).toFixed(2), reachedFarSide: surfDist(u.pos, far) < 2, steps: n };
u.pos = surfacePoint(spot, 0.5); u.vel = [0, 0, 0]; run76(10);
out.standInCenter = { feetVsOldGround: +(len(u.pos) - 0.5 - g0).toFixed(2), grounded: u.grounded };
S.camOverride = { pos: mul(offsetOnSphere(up, fw, -7), g0 + 3), look: u.pos }; await sleep(3000); await shot(O + 'pc_trooper_in_crater.jpg'); S.camOverride = null;
out.surfacePointFeetVsOld = +(len(surfacePoint(spot, 0.5)) - 0.5 - g0).toFixed(2);
const v = makeTank(surfacePoint(offsetOnSphere(up, fw, -14), 1.5), 0); v.keep76 = true;
v.fwd = tangent(fw, v.up); v.aim = v.fwd; takeControl(v); SET.vehView = 'tp';
const vfar = mul(offsetOnSphere(up, fw, 16), RM); let vmin = 1e9, vn = 0;
run76(500, () => { v.fwd = tangent(sub(vfar, v.pos), norm(v.pos)); keys.KeyW = true; vn++; vmin = min(vmin, len(v.pos) - 1.5 - g0); if (surfDist(v.pos, vfar) < 3) return false; });
keys.KeyW = false;
out.tank = { lowestVsOldGround: +vmin.toFixed(2), crossed: surfDist(v.pos, vfar) < 3.5, steps: vn };
v.pos = surfacePoint(offsetOnSphere(up, fw, -6), 1.5); v.vel = [0, 0, 0]; v.fwd = tangent(fw, norm(v.pos)); v.aim = norm(add(v.fwd, mul(norm(v.pos), -0.05)));
await sleep(3500); await shot(O + 'pc_tank_tpv_crater.jpg');
SET.vehView = 'fp';
for (let k = 0; k < 40; k++){ const d = offsetOnSphere(up, rotAxis(fw, up, k * 0.7), 20 + k * 3); splash(mul(d, groundR(d)), 1, 100, 6, null, 's'); }
out.budget = { n: CR76.n, max: CR76.max(), stats: Object.assign({}, CR76.stats), nearKept: CR76.L.some(c => dist(c.p, tp) < 6) };
let t1 = performance.now(); for (let i = 0; i < 20000; i++){ const d = randUnit(); mapStatic(d[0] * RM, d[1] * RM, d[2] * RM); } out.mapStaticUs = +((performance.now() - t1) / 20).toFixed(2);
const L0 = CR76.L; CR76.L = []; CR76.sync();
t1 = performance.now(); for (let i = 0; i < 20000; i++){ const d = randUnit(); mapStatic(d[0] * RM, d[1] * RM, d[2] * RM); } out.mapStaticUs0 = +((performance.now() - t1) / 20).toFixed(2);
CR76.L = L0; CR76.sync();
out.fps = +fpsVal.toFixed(1);
out.errs = errs.slice(0, 12);
return out;

