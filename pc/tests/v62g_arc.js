// v62gren: точность предсказанной дуги гранаты vs фактическое место взрыва; склон; купол; апогей; производительность
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && (MENU.cur || !S.attract)) break; } catch (e) {} await sleep(500); }
if (!S.me || S.attract){ MENU.newGame(); await sleep(2500); }
MENU.close && MENU.isOpen() && MENU.close(); S.paused = false;
PROG.allUnlocked = true; PROG.unl.add('grenade');
const me = S.me, B = SET.bind, out = {};
const step = n => { for (let i = 0; i < n; i++) update(1 / 60); };
const godmode = () => { me.hp = me.maxhp = 99999; };
// поставить игрока на точку и направить взгляд: yaw (рад) от касательной t0, pitch (рад)
function place(dir, yaw, pitch, alt){
  const d = norm(dir), t0 = anyTangent(d), t1 = cross(d, t0);
  const hz = add(mul(t0, Math.cos(yaw)), mul(t1, Math.sin(yaw)));
  me.pos = alt ? mul(d, len(surfacePoint(d, 0)) + alt) : surfacePoint(d, 0.6); me.vel = [0, 0, 0]; me.up = d;
  me.fwd = norm(add(mul(hz, Math.cos(pitch)), mul(d, Math.sin(pitch))));
  godmode(); CAMFX.fly = null;   // пролёт камеры идёт в рендере — в ручной симуляции не завершится
}
// бросок: удержание hold секунд (дуга считается), отпускание, ждём взрыв
function throwOnce(hold, setup, dtFn){
  S.kit.gren = G62.MAX; S.kit.grenCd = 0;
  keys[B.grenade] = true; G62.press();
  const nh = Math.max(1, Math.round(hold * 60));
  for (let i = 0; i < nh; i++){ if (setup) setup(); update(1 / 60); }
  if (setup) setup();
  keys[B.grenade] = false; update(1 / 60);
  const L = G62.last, P = L.pred, from = L.p0;
  const id = L.id;
  let boom = null, maxAlt = -1e9, p = S.proj.find(q => q.id === id);
  for (let i = 0; i < 1000 && !boom; i++){
    update(dtFn ? dtFn() : 1 / 60);
    p = S.proj.find(q => q.id === id);
    if (p) maxAlt = Math.max(maxAlt, altitude(p.pos));
    boom = G62.boomLog.find(b => b.id === id);
  }
  if (!boom || !P) return { err: 'no boom/pred', boom: !!boom, pred: !!P };
  return { range: +dist(me.pos, P).toFixed(1), err: +dist(P, boom.pos).toFixed(2), maxAlt: +maxAlt.toFixed(1), path: L.path };
}
// 1) открытая местность: точки вокруг базы, разные углы → дальности 10–40 м
const base = norm(add(BASES[0], mul(norm([0.3, 0, 0.2]), 0.25)));
const res = [];
for (const [yaw, pitch] of [[0, -0.35], [0.8, -0.2], [1.6, -0.1], [2.4, 0], [3.2, 0.1], [4.0, 0.2], [4.8, 0.3], [5.6, 0.45], [0.4, 0.55], [1.2, -0.25]]){
  place(base, yaw, pitch);
  step(20);   // встал на землю
  const fwd0 = me.fwd.slice();
  const r = throwOnce(0.5, () => { me.fwd = fwd0; me.vel = mul(me.vel, 0.5); });
  const P = r.path;
  res.push({ yaw, pitch, range: r.range, err: r.err, apex: r.maxAlt, land: P && P.land ? +dist(me.pos, P.land).toFixed(1) : null, roll: P && P.land ? +dist(P.land, P.end).toFixed(1) : null, bounces: P ? P.bp.length : null });
}
// 1b) тот же бросок при «рваном» FPS (шаг кадра 1/144…1/30 с) — фиксированный шаг гранаты не зависит от FPS
const resV = [];
for (const [yaw, pitch] of [[0.3, -0.2], [2.0, 0.1], [3.7, 0.35], [5.0, -0.05]]){
  place(base, yaw, pitch); step(20);
  const fwd0 = me.fwd.slice();
  const r = throwOnce(0.5, () => { me.fwd = fwd0; me.vel = mul(me.vel, 0.5); }, () => 1 / 144 + Math.random() * (1 / 30 - 1 / 144));
  resV.push({ range: r.range, err: r.err });
}
out.varFps = resV;
out.open = res;
out.openMaxErr = Math.max(...res.map(r => r.err));
out.openRanges = res.map(r => r.range).join(',');
// 2) склон кратера: ищем точку с уклоном > 18°, бросаем под уклон и вверх по склону
let slopeDir = null, slopeN = 0;
for (const c of CRATERS){
  const cc = [c[0], c[1], c[2]], dc = norm(cc);
  for (let k = 0; k < 24 && !slopeDir; k++){
    const t0 = anyTangent(dc), t1 = cross(dc, t0), a = k / 24 * Math.PI * 2;
    const d = norm(add(mul(dc, RM), mul(add(mul(t0, Math.cos(a)), mul(t1, Math.sin(a))), c[3] * 0.55)));
    const p = surfacePoint(d, 0.3), n = gradN(p), cosS = dot(n, d);
    if (cosS < 0.95 && cosS > 0.75){ slopeDir = d; slopeN = n; }
  }
  if (slopeDir) break;
}
if (slopeDir){
  const d = slopeDir, down = tangent(slopeN, d);   // по уклону вниз — туда, куда смотрит горизонтальная часть нормали
  const t0 = anyTangent(d), t1 = cross(d, t0), yawDown = Math.atan2(dot(down, t1), dot(down, t0));
  const sres = [];
  for (const [yaw, pitch] of [[yawDown, -0.5], [yawDown, -0.2], [yawDown + Math.PI, -0.1], [yawDown + Math.PI, 0.2], [yawDown + 1.2, -0.3]]){
    place(d, yaw, pitch); step(20);
    const fwd0 = me.fwd.slice();
    const r = throwOnce(0.4, () => { me.fwd = fwd0; me.vel = mul(me.vel, 0.5); });
    const P = r.path;
    sres.push({ yaw: +yaw.toFixed(2), pitch, range: r.range, err: r.err, roll: P && P.land ? +dist(P.land, P.end).toFixed(1) : null, bounces: P ? P.bp.length : null });
  }
  out.slope = { slopeDeg: +(Math.acos(dot(slopeN, slopeDir)) * 180 / Math.PI).toFixed(0), throws: sres, maxErr: Math.max(...sres.map(r => r.err)) };
} else out.slope = 'no slope found';
// 3) у купола: игрок в 12 м под куполом, бросок вверх — граната проходит портал
{
  const d = norm([0.2, 0.3, 0.9]);
  const dres = [];
  for (const pitch of [0.6, 1.0, 0.1]){
    place(d, 0.5, pitch); me.pos = mul(d, S.R - 12); me.vel = [0, 0, 0];
    const fwd0 = me.fwd.slice(), pos0 = me.pos.slice();
    const r = throwOnce(0.3, () => { me.fwd = fwd0; me.pos = pos0.slice(); me.vel = [0, 0, 0]; });
    dres.push({ pitch, err: r.err, tele: r.path ? r.path.tele : null, endAlt: r.path ? +altitude(r.path.end).toFixed(0) : null });
  }
  out.dome = dres;
}
// 4) быстрое нажатие (<0.2 с) — бросок сразу; запас гранат и восстановление
place(base, 0.3, 0.1); step(20);
S.kit.gren = 2; S.kit.grenCd = 0;
keys[B.grenade] = true; G62.press(); update(1 / 60); update(1 / 60); keys[B.grenade] = false; update(1 / 60);
const n1 = S.kit.gren, tap = G62.last.tap;
keys[B.grenade] = true; G62.press(); update(1 / 60); keys[B.grenade] = false; update(1 / 60);
const n0 = S.kit.gren;
keys[B.grenade] = true; G62.press(); const holdEmpty = !!G62.hold; keys[B.grenade] = false; update(1 / 60);
step(60 * 9.2); const after9 = S.kit.gren; step(60 * 9.2); const after18 = S.kit.gren;
out.ammo = { afterTap: n1, tapFlag: tap, afterSecond: n0, holdWhenEmpty: holdEmpty, after9s: after9, after18s: after18 };
// 5) производительность предсказания (наихудший — без кэша), мс
place(base, 1.0, 0.2); step(10);
S.kit.gren = 2; keys[B.grenade] = true; G62.press();
out.perfHold = !!G62.hold; if (!G62.hold) G62.hold = { u: me, t0: S.rtime, power: 1, under: false };
const ts = [];
for (let i = 0; i < 120; i++){ me.fwd = norm(add(me.fwd, mul(randUnit(), 0.05))); const t = performance.now(); G62.predict(me, true); ts.push(performance.now() - t); }
keys[B.grenade] = false; G62.cancel();
ts.sort((a, b) => a - b);
out.predictMs = { avg: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(3), p50: +ts[60].toFixed(3), p95: +ts[114].toFixed(3), max: +ts[119].toFixed(3), pts: G62.path ? G62.path.pts.length : 0 };
for (const k in keys) keys[k] = false;
return out;
