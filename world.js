"use strict";
// =====================================================================
//  МИР — единый источник констант для шейдера и для коллизий
// =====================================================================
const RM = 500;            // радиус метеорита, м
const DOME = 800;          // радиус портального купола (300 м над поверхностью)
const TUN_R = 6, CORE_R = 35;
const PAD_B = [0.990, 0.997], PAD_C = [0.9965, 0.9992];
const DET_F = 1 / 48, DET_A = 1.0;   // мелкий рельеф (шум), ±0.45 м
const D2R = Math.PI / 180;
function dirLL(lat, lon){ lat *= D2R; lon *= D2R; return [Math.cos(lat)*Math.cos(lon), Math.sin(lat), Math.cos(lat)*Math.sin(lon)]; }
const BASES = [[0, 1, 0], [0, -1, 0]];           // Консорциум сверху, Рой снизу
const CPD = [dirLL(0, 45), dirLL(0, 225), dirLL(0, 135), dirLL(0, 315), dirLL(35, 90), dirLL(-35, 270)];
const CRATERS = [];
for (const [la, lo, r] of [[20, 20, 40], [-15, 100, 55], [50, 200, 35], [-40, 300, 60]])
  for (const s of [1, -1]){ const d = dirLL(la, lo); const k = s * (RM + r * 0.55); CRATERS.push([d[0]*k, d[1]*k, d[2]*k, r]); }
const NK = [
  [14,  [0.011, 0.004, -0.007], [-0.003, 0.009, 0.010]],
  [5,   [0.031, -0.022, 0.017], [0.019, 0.027, -0.024]],
  [0.6, [0.13, 0.09, -0.11],    [-0.08, 0.14, 0.10]],
];

// ---------- векторы ----------
const { sin, cos, tan, hypot, max, min, abs, sqrt, acos, asin, atan2, random, floor, round, PI } = Math;
const add = (a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const mul = (a,s) => [a[0]*s, a[1]*s, a[2]*s];
const dot = (a,b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const len = a => hypot(a[0], a[1], a[2]);
const dist = (a,b) => hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
const dist2 = (a,b) => { const x = a[0]-b[0], y = a[1]-b[1], z = a[2]-b[2]; return x*x + y*y + z*z; };
const norm = a => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const clamp = (x,a,b) => max(a, min(b, x));
const lerp = (a,b,t) => a + (b - a) * t;
const smoothstep = (a,b,x) => { const t = clamp((x-a)/(b-a), 0, 1); return t*t*(3-2*t); };
function rotAxis(v, k, ang){
  const c = cos(ang), s = sin(ang), kv = cross(k, v), kd = dot(k, v);
  return [v[0]*c + kv[0]*s + k[0]*kd*(1-c), v[1]*c + kv[1]*s + k[1]*kd*(1-c), v[2]*c + kv[2]*s + k[2]*kd*(1-c)];
}
function anyTangent(u){ return norm(abs(u[1]) < 0.9 ? cross(u, [0,1,0]) : cross(u, [1,0,0])); }
function randUnit(){ let v; do { v = [random()*2-1, random()*2-1, random()*2-1]; } while (len(v) > 1 || len(v) < 0.1); return norm(v); }
function tangent(v, up){ const t = sub(v, mul(up, dot(v, up))); return len(t) < 1e-5 ? anyTangent(up) : norm(t); }
function surfDist(a, b){ return RM * acos(clamp(dot(norm(a), norm(b)), -1, 1)); }   // по дуге
function stepToward(dir, toward, angle){   // точка на сфере: от dir к toward на угол
  const t = tangent(sub(toward, mul(dir, dot(toward, dir))), dir);
  return norm(add(mul(dir, cos(angle)), mul(t, sin(angle))));
}
function offsetOnSphere(dir, tdir, meters){ return norm(add(mul(dir, cos(meters / RM)), mul(tangent(tdir, dir), sin(meters / RM)))); }
function seeded(seed){ let s = seed | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- 3D-шум (общий для GPU и коллизий) ----------
const NOISE_N = 64;
let NOISE = null;
function genNoise(){
  const rnd = seeded(1234567);
  const N = NOISE_N, NN = N * N, a = new Float32Array(N * NN), b = new Float32Array(N * NN);
  for (let i = 0; i < a.length; i++) a[i] = rnd();
  const pass = (src, dst, sx) => {
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
      const i = x + y * N + z * NN;
      let im, ip;
      if (sx === 1){ im = ((x + N - 1) % N) + y * N + z * NN; ip = ((x + 1) % N) + y * N + z * NN; }
      else if (sx === 2){ im = x + ((y + N - 1) % N) * N + z * NN; ip = x + ((y + 1) % N) * N + z * NN; }
      else { im = x + y * N + ((z + N - 1) % N) * NN; ip = x + y * N + ((z + 1) % N) * NN; }
      dst[i] = 0.25 * src[im] + 0.5 * src[i] + 0.25 * src[ip];
    }
  };
  pass(a, b, 1); pass(b, a, 2); pass(a, b, 3);
  let lo = 1, hi = 0; for (const v of b){ lo = min(lo, v); hi = max(hi, v); }
  const out = new Uint8Array(N * NN);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(clamp((b[i] - lo) / (hi - lo), 0, 1) * 255);
  NOISE = out;
}
function noiseJS(x, y, z){
  const N = NOISE_N;
  x = x * N - 0.5; y = y * N - 0.5; z = z * N - 0.5;
  const ix = floor(x), iy = floor(y), iz = floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const x0 = ((ix % N) + N) % N, y0 = ((iy % N) + N) % N, z0 = ((iz % N) + N) % N;
  const x1 = (x0 + 1) % N, y1 = (y0 + 1) % N, z1 = (z0 + 1) % N;
  const A = NOISE, NN = N * N;
  const v = (a, b, c) => A[a + b * N + c * NN];
  const c00 = v(x0,y0,z0) + (v(x1,y0,z0) - v(x0,y0,z0)) * fx;
  const c10 = v(x0,y1,z0) + (v(x1,y1,z0) - v(x0,y1,z0)) * fx;
  const c01 = v(x0,y0,z1) + (v(x1,y0,z1) - v(x0,y0,z1)) * fx;
  const c11 = v(x0,y1,z1) + (v(x1,y1,z1) - v(x0,y1,z1)) * fx;
  const c0 = c00 + (c10 - c00) * fy, c1 = c01 + (c11 - c01) * fy;
  return (c0 + (c1 - c0) * fz) / 255;
}
function fbm3JS(x, y, z){
  return 0.5 * noiseJS(x, y, z) + 0.25 * noiseJS(x*2.03 + 0.31, y*2.03 + 0.31, z*2.03 + 0.31)
       + 0.125 * noiseJS(x*4.07 + 0.73, y*4.07 + 0.73, z*4.07 + 0.73);
}

// ---------- SDF для коллизий (копия map() из шейдера) ----------
function sdCapsule(x,y,z, ax,ay,az, bx,by,bz, r){
  const pax=x-ax, pay=y-ay, paz=z-az, bax=bx-ax, bay=by-ay, baz=bz-az;
  const h = clamp((pax*bax+pay*bay+paz*baz)/(bax*bax+bay*bay+baz*baz), 0, 1);
  return hypot(pax-bax*h, pay-bay*h, paz-baz*h) - r;
}
function sdBox3(x, y, z, bx, by, bz){
  const qx = abs(x) - bx, qy = abs(y) - by, qz = abs(z) - bz;
  return hypot(max(qx, 0), max(qy, 0), max(qz, 0)) + min(max(qx, max(qy, qz)), 0);
}
function sdCylY(x,y,z,r,h){ const dx = hypot(x,z)-r, dy = abs(y)-h; return min(max(dx,dy),0) + hypot(max(dx,0), max(dy,0)); }
function sdCylZ(x,y,z,r,h){ const dx = hypot(x,y)-r, dy = abs(z)-h; return min(max(dx,dy),0) + hypot(max(dx,0), max(dy,0)); }
function hgt(qx,qy,qz){
  let h = 0;
  for (const [a,k1,k2] of NK) h += a * cos(qx*k1[0]+qy*k1[1]+qz*k1[2]) * cos(qx*k2[0]+qy*k2[1]+qz*k2[2]);
  return h;
}
// статичный мир: рельеф, туннели, ядро, штабы, маяки
function mapStatic(x,y,z){
  const r = max(hypot(x,y,z), 1e-3), nx = x/r, ny = y/r, nz = z/r;
  let mask = 1;
  for (const b of BASES) mask = min(mask, 1 - smoothstep(PAD_B[0], PAD_B[1], nx*b[0]+ny*b[1]+nz*b[2]));
  for (const c of CPD)   mask = min(mask, 1 - smoothstep(PAD_C[0], PAD_C[1], nx*c[0]+ny*c[1]+nz*c[2]));
  let d = r - RM - hgt(nx*RM, ny*RM, nz*RM) * mask;
  for (const c of CRATERS) d = max(d, -(hypot(x-c[0], y-c[1], z-c[2]) - c[3]));
  const tun = min(hypot(y,z) - TUN_R, hypot(x,y) - TUN_R, r - CORE_R);
  d = max(d, -tun);
  if (d < 1.5 && mask > 0) d -= (fbm3JS(x*DET_F, y*DET_F, z*DET_F) - 0.44) * DET_A * mask;
  d = min(d, hypot(x, abs(y) - 16, z) - 6);
  const by = abs(y) - RM;
  if (hypot(x, by, z) - 48 < d && (y > 0 ? HQ_ALIVE[0] : HQ_ALIVE[1])){
    const ax = abs(x), az = abs(z);
    const oct = max(ax, az, (ax + az) * 0.70710678);
    const plat = max(oct - 16, abs(by - 0.2) - 1.4);
    const blk = max(oct - 7.5, abs(by - 5) - 5, oct + by - 15.5);
    const top = max(oct - 4.2, abs(by - 11) - 1.2);
    const pyl = sdBox3(ax - 8.6, by - 2.6, az - 8.6, 1.3, 2.4, 1.3);
    const mast = sdCapsule(x, by, z, 0, 12, 0, 0, 36, 0, 0.45);
    const bc = hypot(x, by - 37.2, z) - 1.6;
    d = min(d, plat, blk, top, pyl, mast, bc);
  } else if (hypot(x, by, z) - 20 < d){
    // развалины штаба
    const ax = abs(x), az = abs(z);
    const oct = max(ax, az, (ax + az) * 0.70710678);
    d = min(d, max(oct - 16, abs(by - 0.2) - 1.4), max(oct - 8, abs(by - 1.6) - 1.6));
  }
  for (const c of CPD){
    const vx = x - c[0]*RM, vy = y - c[1]*RM, vz = z - c[2]*RM;
    if (hypot(vx, vy, vz) - 14 < d){
      const yy = vx*c[0] + vy*c[1] + vz*c[2];
      const rr = hypot(vx - c[0]*yy, vy - c[1]*yy, vz - c[2]*yy);
      const disk = max(rr - 4, abs(yy - 0.1) - 0.4);
      const tw = sdCapsule(vx, vy, vz, -c[0]*2, -c[1]*2, -c[2]*2, c[0]*10, c[1]*10, c[2]*10, 0.8);
      const bc = hypot(vx - c[0]*11.5, vy - c[1]*11.5, vz - c[2]*11.5) - 2;
      d = min(d, disk, tw, bc);
    }
  }
  return d;
}
const HQ_ALIVE = [true, true];   // разрушенный штаб превращается в руины (и в шейдере тоже)

// ---------- обломки старых экспедиций (разрушаемые) ----------
// kind: 0 спутник, 1 энергомодуль, 2 эхолокатор, 3 контейнеры, 4 упавшая ферма-мачта
const PROP_KINDS = [
  { code: 13, n: ['Упавший спутник', 'Crashed satellite', 'Vệ tinh rơi'],  br: 6.2, hp: 700,  sink: 0.35, tilt: 0.28, sc: [0, 1.2, 0], sr: 2.2 },
  { code: 14, n: ['Энергомодуль', 'Power module', 'Mô-đun năng lượng'],         br: 5.2, hp: 1100, sink: 0.55, tilt: 0.08, sc: [0, 1.4, 0], sr: 2.4 },
  { code: 15, n: ['Эхолокатор', 'Sonar array', 'Trạm sonar'],            br: 8.2, hp: 600,  sink: 0.05, tilt: 0.06, sc: [0, 5.5, 0], sr: 2.4 },
  { code: 16, n: ['Контейнеры', 'Cargo containers', 'Container hàng'],       br: 7.0, hp: 900,  sink: 0.2,  tilt: 0.04, sc: [0.8, 1.8, 0], sr: 2.8 },
  { code: 17, n: ['Упавшая мачта', 'Fallen truss tower', 'Tháp giàn đổ'],  br: 9.5, hp: 800,  sink: 0.25, tilt: 0.05, sc: [0, 0.8, 0], sr: 1.0 },
  { code: 18, n: ['Кристаллы', 'Crystals', 'Tinh thể'],                       br: 3.2, hp: 260,  sink: 0.15, tilt: 0.18, sc: [0, 1.0, 0], sr: 0.8, ore: 20 },
  { code: 19, n: ['Модуль первой экспедиции', 'First-expedition habitat', 'Mô-đun đoàn thám hiểm đầu tiên'], br: 6.2, hp: 1400, sink: 0.3, tilt: 0.05, sc: [0, 1.9, 0], sr: 2.0, loot: 60 },
  { code: 20, n: ['Склад первой экспедиции', 'First-expedition depot', 'Kho đoàn thám hiểm đầu tiên'], br: 6.8, hp: 1700, sink: 0.15, tilt: 0.03, sc: [0, 1.6, 0], sr: 3.0, loot: 100 },
];
// коллайдеры в локальных координатах (x — вправо, y — вверх, z — вперёд)
function propLocalSDF(kind, x, y, z, v){
  switch (kind){
    case 0: return min(sdBox3(x, y - 1.0, z, 1.15, 0.9, 0.9), sdBox3(x - 3.55, y - 1.15, z, 1.85, 0.12, 0.8),
                       sdBox3(x + 2.55, y - 0.15, z, 1.6, 0.9, 0.8), hypot(x, y - 3.15, z - 0.2) - 1.3);
    case 1: return min(sdCylZ(x, y - 1.15, z, 1.85, 2.95), sdCapsule(x, y, z, 0.6, 2.4, -1.2, 0.6, 4.6, -1.2, 0.5));
    case 2: return min(sdCylY(x, y - 0.2, z, 1.6, 0.25), sdCapsule(x, y, z, 0, 0, 0, 0, 6.5, 0, 0.35), hypot(x, y - 6.8, z - 0.6) - 2.3);
    case 3: {
      let d = sdBox3(x, y - 1.3, z, 1.2, 1.3, 3.0);
      const c = cos(0.2), s = sin(0.2), x2 = (x - 0.3) * c - (z - 0.8) * s, z2 = (x - 0.3) * s + (z - 0.8) * c;
      d = min(d, sdBox3(x2, y - 3.9, z2, 1.2, 1.3, 3.0));
      const c3 = cos(0.5), s3 = sin(0.5), x3 = (x - 3.6) * c3 - (z + 1.4) * s3, z3 = (x - 3.6) * s3 + (z + 1.4) * c3;
      d = min(d, sdBox3(x3, y - 1.0, z3, 1.3, 1.2, 3.0));
      return d;
    }
    case 4: return min(sdBox3(x, y - 0.65, z, 0.65, 0.65, 8.2), sdBox3(x, y - 1.0, z + 8.6, 1.4, 1.0, 1.4));
    case 5:   // v6.2: кристаллы жил (variant 8..10) — огранённые, крупный лежит на камне
      if (v === 8) return min(hypot(x, y - 1.62, z) - 0.95, sdBox3(x, y - 0.32, z, 1.2, 0.55, 0.95));
      if (v === 9) return hypot(x, y - 0.5, z) - 0.72;
      if (v === 10) return hypot(x, y - 0.3, z) - 0.47;
      return sdCapsule(x, y, z, 0, -0.2, 0, 0, 1.6, 0, 0.55);
    case 6: return min(sdCapsule(x, y, z, -3.4, 1.9, 0, 3.4, 1.9, 0, 1.6), sdCapsule(x, y, z, -1, 3.3, 0, -1, 5.6, 0, 0.1));
    case 7: return max(hypot(x, y) - 3.1, -y, abs(z) - 4.5);
  }
  return 1e9;
}
let PROPS = [];
function genProps(){
  const rnd = seeded(777);
  PROPS = [];
  const avoid = [];
  for (const b of BASES) avoid.push([b, 165]);
  for (const c of CPD) avoid.push([c, 42]);
  for (const a of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) avoid.push([a, 38]);
  for (const c of CRATERS) avoid.push([norm(c), c[3] * 0.9]);
  let tries = 0;
  const MAIN_KINDS = [0, 1, 2, 3, 4, 0, 1, 3, 6, 7];
  while (PROPS.length < 50 && tries++ < 4000){
    const dir = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
    let bad = false;
    for (const [a, r] of avoid) if (surfDist(dir, a) < r){ bad = true; break; }
    if (bad) continue;
    for (const p of PROPS) if (surfDist(dir, p.dir) < 46){ bad = true; break; }
    if (bad) continue;
    const kind = MAIN_KINDS[floor(rnd() * MAIN_KINDS.length)];
    const K = PROP_KINDS[kind];
    const gr = groundR(dir);
    if (abs(gr - RM) > 16) continue;
    let up = dir;
    const t0 = anyTangent(dir), t1 = cross(dir, t0);
    const ang = rnd() * PI * 2;
    let fwd = norm(add(mul(t0, cos(ang)), mul(t1, sin(ang))));
    // наклон (упавшие предметы лежат криво)
    const tilt = (rnd() - 0.5) * 2 * K.tilt;
    const side = norm(cross(fwd, up));
    up = norm(rotAxis(up, fwd, tilt)); fwd = norm(rotAxis(fwd, side, (rnd() - 0.5) * K.tilt));
    fwd = tangent(fwd, up);
    const pos = mul(dir, gr - K.sink);
    PROPS.push({ cls: 'prop', id: 100000 + PROPS.length, kind, dir, pos, up, fwd, R: norm(cross(fwd, up)), hp: K.hp, maxhp: K.hp,
                 bound: K.br, integ: 1, alive: true, variant: floor(rnd() * 4), team: 2, seen: [1, 1], flash: 0, loot: K.loot || 0 });
  }
  // инопланетные кристаллы: гроздьями у кратеров и по рудным полям
  const nMain = PROPS.length;
  tries = 0;
  while (PROPS.length < nMain + 40 && tries++ < 6000){
    let dir;
    if (rnd() < 0.6){ const c = CRATERS[floor(rnd() * CRATERS.length)]; dir = offsetOnSphere(norm(c), norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), c[3] * (0.5 + 0.6 * rnd())); }
    else dir = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
    let bad = false;
    for (const [a, r] of avoid) if (surfDist(dir, a) < (r > 100 ? r : r * 0.6)){ bad = true; break; }
    if (!bad) for (const p of PROPS) if (surfDist(dir, p.dir) < (p.kind === 5 ? 7 : p.bound + 6)){ bad = true; break; }
    if (bad) continue;
    const gr = groundR(dir); if (gr < RM - 26) continue;
    const up = dir, t0 = anyTangent(dir), t1 = cross(dir, t0), ang = rnd() * PI * 2;
    const fwd = norm(add(mul(t0, cos(ang)), mul(t1, sin(ang))));
    const K = PROP_KINDS[5];
    PROPS.push({ cls: 'prop', id: 100000 + PROPS.length, kind: 5, dir, pos: mul(dir, gr - K.sink), up, fwd, R: norm(cross(fwd, up)), hp: K.hp, maxhp: K.hp,
                 bound: K.br, integ: 1, alive: true, variant: floor(rnd() * 8), team: 2, seen: [1, 1], flash: 0, loot: 0 });
  }
  buildPropGrid();
}
function propSDF(p, x, y, z){
  const px = x - p.pos[0], py = y - p.pos[1], pz = z - p.pos[2];
  if (px*px + py*py + pz*pz > p.bound * p.bound) return 1e9;
  const qx = px*p.R[0] + py*p.R[1] + pz*p.R[2];
  const qy = px*p.up[0] + py*p.up[1] + pz*p.up[2];
  const qz = px*p.fwd[0] + py*p.fwd[1] + pz*p.fwd[2];
  const s = 0.3 + 0.7 * p.integ;     // разрушенные — сплющены в груду
  return propLocalSDF(p.kind, qx, qy / s, qz, p.variant) * s;
}
// ---------- пространственная сетка (ускоряет коллизии с обломками и зданиями)
const GRID_C = 32;
const gkey = (x, y, z) => ((floor(x / GRID_C) + 40) * 128 + (floor(y / GRID_C) + 40)) * 128 + (floor(z / GRID_C) + 40);
function gridInsert(grid, o, c, r){
  for (let ix = floor((c[0] - r) / GRID_C); ix <= floor((c[0] + r) / GRID_C); ix++)
    for (let iy = floor((c[1] - r) / GRID_C); iy <= floor((c[1] + r) / GRID_C); iy++)
      for (let iz = floor((c[2] - r) / GRID_C); iz <= floor((c[2] + r) / GRID_C); iz++){
        const k = ((ix + 40) * 128 + (iy + 40)) * 128 + (iz + 40);
        let L = grid.get(k); if (!L){ L = []; grid.set(k, L); } L.push(o);
      }
}
let PGRID = new Map(), BGRID = null;
function buildPropGrid(){ PGRID = new Map(); for (const p of PROPS) gridInsert(PGRID, p, p.pos, p.bound + 1); }
function bgrid(){ if (!BGRID){ BGRID = new Map(); for (const b of BLD_LIST) if (b.alive) gridInsert(BGRID, b, b.pos, b.bound + 1); } return BGRID; }
function bgridDirty(){ BGRID = null; }
function propAt(pt, pad){
  const L = PGRID.get(gkey(pt[0], pt[1], pt[2])); if (!L) return null;
  for (const p of L){ if (propSDF(p, pt[0], pt[1], pt[2]) < (pad || 0)) return p; }
  return null;
}

// здания (динамические): упрощённые формы в локальной системе
let BLD_LIST = [];
function bldSDF(b, x, y, z){
  const px = x - b.pos[0], py = y - b.pos[1], pz = z - b.pos[2];
  if (px*px + py*py + pz*pz > b.bound * b.bound) return 1e9;
  const qx = px*b.R[0] + py*b.R[1] + pz*b.R[2];
  const qy = px*b.up[0] + py*b.up[1] + pz*b.up[2];
  const qz = px*b.fwd[0] + py*b.fwd[1] + pz*b.fwd[2];
  const H = -1 + (b.H + 1) * max(0.05, b.built);
  let d;
  switch (b.type){
    case 'turret':  d = sdCylY(qx, qy - 0.4, qz, 1.1, 1.6); break;
    case 'aa':      d = sdCylY(qx, qy - 0.6, qz, 1.7, 2.0); break;
    case 'factory': d = min(sdBox3(qx, qy - 3, qz, 6, 6, 8), sdBox3(qx, qy + 1.4, qz, 7, 2, 9)); break;
    case 'hub':     d = min(sdCylY(qx, qy + 1, qz, 6.5, 1.4), hypot(qx, qy - 0.4, qz) - 3.2); break;
    case 'airdock': d = min(sdBox3(qx, qy + 1, qz, 6, 1.6, 6), sdBox3(abs(qx) - 3.2, qy - 7, qz + 3.5, 0.45, 6.5, 0.45)); break;
    case 'outpost': d = min(sdBox3(qx, qy + 0.5, qz, 4.6, 1.5, 4.6), sdBox3(qx, qy - 2.4, qz - 0.6, 3.2, 1.6, 2.8), sdCapsule(qx, qy, qz, 2.2, 3, -2, 2.2, 8.5, -2, 0.18)); break;
    case 'extractor': d = min(sdCylY(qx, qy + 0.05, qz, 2.4, 0.6), hypot(qx, max(0, qy - 0.72), qz) - 1.38, sdBox3(qx + 1.0, qy - 4.0, qz + 1.732, 0.42, 3.5, 0.42)); break;   // v6.2: постамент, купол, вышка
    default: d = 1e9;
  }
  return max(d, qy - H);
}
function mapJS(x,y,z){
  let d = mapStatic(x,y,z);
  const k = gkey(x, y, z);
  const bl = bgrid().get(k);
  if (bl) for (const b of bl) if (b.alive){ const e = bldSDF(b, x, y, z); if (e < d) d = e; }
  const pl = PGRID.get(k);
  if (pl) for (const p of pl){ const e = propSDF(p, x, y, z); if (e < d) d = e; }
  return d;
}
function bldAt(p, pad){
  const bl = bgrid().get(gkey(p[0], p[1], p[2])); if (!bl) return null;
  for (const b of bl) if (b.alive && bldSDF(b, p[0], p[1], p[2]) < (pad || 0)) return b;
  return null;
}
function gradN(p){
  const e = 0.02, [x,y,z] = p;
  return norm([mapJS(x+e,y,z)-mapJS(x-e,y,z), mapJS(x,y+e,z)-mapJS(x,y-e,z), mapJS(x,y,z+e)-mapJS(x,y,z-e)]);
}
// дымовые завесы режут прямую видимость
let SCREENS = [];
function los(a, b){
  for (const s of SCREENS){ if (s.t < s.life && segSphereHit(a, b, s.pos, s.r * min(1, s.t * 1.5))) return false; }
  const v = sub(b, a), L = len(v), n = Math.ceil(L / 2.5);
  for (let i = 1; i < n; i++){ const p = add(a, mul(v, i / n)); if (mapJS(p[0], p[1], p[2]) < 0) return false; }
  return true;
}
function segSphereHit(a, b, c, r){
  const ab = sub(b, a), t = clamp(dot(sub(c, a), ab) / (dot(ab, ab) || 1), 0, 1);
  return len(sub(add(a, mul(ab, t)), c)) < r;
}
// радиус поверхности вдоль направления (только статичный мир)
function groundR(dir){
  let t = RM + 45;
  for (let i = 0; i < 60; i++){
    const d = mapStatic(dir[0]*t, dir[1]*t, dir[2]*t);
    if (abs(d) < 0.03) break;
    t -= d * 0.8;
  }
  return t;
}
const gAt = r => r >= RM ? RULES.G * (1 + RULES.G_TOP * smoothstep(0, DOME - RM, r - RM)) : RULES.G * r / RM;
function inShaft(p){ const r = len(p); return r > 28 && r < RM + 8 && (hypot(p[1], p[2]) < TUN_R + 0.5 || hypot(p[0], p[1]) < TUN_R + 0.5); }
function underground(p){ const r = len(p); return r < CORE_R + 3 || (r < RM - 10 && inShaft(p)); }
const AXES = [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1]];
function bestAxis(dir){ let b = AXES[0], bd = -2; for (const a of AXES){ const d = dot(a, dir); if (d > bd){ bd = d; b = a; } } return b; }
function altitude(p){ return len(p) - RM; }
