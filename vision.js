// =====================================================================
//  ОБЗОР И ТУМАН ВОЙНЫ
//  Каждый юнит и здание «видит» врагов в своём радиусе. Видимые враги
//  получают seen[team] > 0 (метки, миникарта, цели способностей).
//  Здания, однажды замеченные, остаются на карте «призраком» (known).
// =====================================================================
const VIS_R = { inf: 52, tank: 62, drone: 88, builder: 32, turret: 72, aa: 90, outpost: 60, factory: 45, hub: 50, airdock: 50, hq: 150 };
let visT = 0;
function visRadius(e){
  const k = S.storm ? 1 - 0.45 * S.storm.k : 1;
  return visRadius0(e) * k;
}
function visRadius0(e){
  if (e.visR) return e.visR;
  if (e.cls === 'bld') return VIS_R[e.type] || 45;
  if (e.cls === 'inf') return e.role === 'scout' ? 115 : e.elite ? 62 : VIS_R.inf;
  return VIS_R[e.cls] || 40;
}
function visionStep(dt){
  visT -= dt;
  if (visT > 0) return;
  visT = 0.3;
  for (const t of [0, 1]){
    // источники обзора: [x, y, z, r²]
    const src = [];
    const addSrc = (e, r) => { if (e.alive !== false) src.push([e.pos[0], e.pos[1], e.pos[2], r * r]); };
    for (const u of S.units) if (u.alive && u.team === t) addSrc(u, visRadius(u));
    for (const v of S.vehicles) if (v.alive && v.team === t) addSrc(v, visRadius(v));
    for (const d of S.drones) if (d.alive && d.team === t) addSrc(d, visRadius(d));
    for (const b of S.builders) if (b.alive && b.team === t) addSrc(b, visRadius(b));
    for (const b of S.buildings) if (b.alive && b.team === t && b.done) addSrc(b, visRadius(b));
    if (S.hq[t].alive) src.push([...mul(BASES[t], RM + 10), VIS_R.hq * VIS_R.hq]);
    for (const cp of S.cps) if (!cp.core && cp.owner === t) src.push([...cp.pos, 45 * 45]);
    for (const z of S.scans || []) if (z.team === t) src.push([...z.pos, z.r * z.r]);
    const test = e => {
      const p = e.pos;
      // снайпер-одиночка, который не двигается, замаскирован: заметен только вблизи
      const hid = e.cls === 'inf' && e.squad && e.squad.solo === 'sniper' && e.moveAmt < 0.25 && S.time - (e.lastShotT || -99) > 2.5;
      for (let i = 0; i < src.length; i++){
        const s = src[i], x = p[0] - s[0], y = p[1] - s[1], z = p[2] - s[2];
        const d2 = x * x + y * y + z * z;
        if (hid ? d2 < 22 * 22 : d2 < s[3]) return true;
      }
      return false;
    };
    for (const e of TGT[t]){
      if (!e.alive) continue;
      if (test(e)){
        e.seen[t] = max(e.seen[t], 0.5);
        if (e.cls === 'bld'){ if (t === 0) e.known0 = true; else e.known1 = true; }
      }
    }
  }
}
// видно ли врага игроку (в стратегии с туманом войны)
function fogHidden(e){
  if (!SET.fog || S.attract || e.team !== 1) return false;
  if (e.cls === 'bld') return !e.known0;
  if (e.cls === 'hq' || e.cls === 'prop') return false;
  return e.alive !== false && e.seen[0] <= 0;
}
// туман на миникарте стратегии: затемнение с «дырами» обзора вокруг своих
let FOGC = null;
function drawFogMinimap(C, R, proj){
  if (!SET.fog) return;
  const W = Math.ceil(R * 4 + 60), H = Math.ceil(R * 2 + 8);
  if (!FOGC){ FOGC = document.createElement('canvas'); }
  const dpr = devicePixelRatio || 1;
  if (FOGC.width !== Math.round(W * dpr)){ FOGC.width = Math.round(W * dpr); FOGC.height = Math.round(H * dpr); }
  const f = FOGC.getContext('2d');
  const x0 = C[0][0] - R - 4, y0 = C[0][1] - R - 4;
  f.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
  f.globalCompositeOperation = 'source-over';
  f.clearRect(x0, y0, W, H);
  f.fillStyle = 'rgba(0,0,0,.62)';
  for (const c of C){ f.beginPath(); f.arc(c[0], c[1], R, 0, PI * 2); f.fill(); }
  f.globalCompositeOperation = 'destination-out';
  const hole = (p, r) => {
    const m = proj(p), rr = max(2, r / RM * R);
    const g = f.createRadialGradient(m[0], m[1], rr * 0.5, m[0], m[1], rr);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = g; f.beginPath(); f.arc(m[0], m[1], rr, 0, PI * 2); f.fill();
  };
  for (const u of S.units) if (u.alive && u.team === 0) hole(u.pos, visRadius(u));
  for (const v of S.vehicles) if (v.alive && v.team === 0) hole(v.pos, visRadius(v));
  for (const d of S.drones) if (d.alive && d.team === 0) hole(d.pos, visRadius(d));
  for (const b of S.buildings) if (b.alive && b.team === 0 && b.done) hole(b.pos, visRadius(b));
  if (S.hq[0].alive) hole(S.hq[0].pos, VIS_R.hq);
  for (const cp of S.cps) if (!cp.core && cp.owner === 0) hole(cp.pos, 45);
  octx.drawImage(FOGC, x0, y0, W, H);
}
