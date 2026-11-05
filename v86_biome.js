// =====================================================================
//  v8.6 — «ЖИВОЙ МЕТЕОРИТ», этап 2: БИОМЫ с РЕЗКИМИ границами (BIO86)
//  Сферическая диаграмма Вороного по нормали: биом = ближайшее «зерно» (максимум dot(n, зерно)); у границы — шум ±0.03 рад
//  (сумма синусов — одна и та же формула в JS и в шейдере), переход 1.5 м. Каждое зерно повторено в антиподе — карта честная.
//   0 «Пустошь» (как раньше: пыль, базальт; шапки у штабов и лава), 1 «Зелёная аномальная зона» (изумрудная трава, споры,
//   кристаллы — трава прячет пехоту: дальше 40 м её не видно, пока не стреляет), 2 «Рыжий пояс» (осенняя листва, листопад;
//   шаги громче — враг слышит бегущих в 32 м), 3 «Белая шапка» (снег; пехота −15 % скорости, обзор ×0.7; рядом ледяное озеро).
//  Шейдер: одна строка // v86 в material() (scene.glsl). Растительность — меши ST70 у камеры (кусты травы, кристаллы, кусты,
//  деревца, сугробы, льдинки), количество — по ADG80/S.quality. Частицы: споры / листья / снежинки (немного, только в бою).
//  Хуки — обёртки: shaderConsts, startProgram, visionStep, visRadius, findTarget, physStep, AU.step, ST70.collect,
//  gatherParticles, update. Выключить: ?bio86=0 или localStorage pm_bio86 = '0'.
// =====================================================================
var BIO86 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('bio86') === '0') return false; return localStorage.getItem('pm_bio86') !== '0'; } catch (e){ return true; } })(),
  err: {}, S: [], K: [], cache: new Map(), props: [], propT: 0, propC: null, lastB: -1, sayT: -99, seenB: {}, lt: null,
  stats: { hidden: 0, heard: 0, snowSlow: 0, props: 0, cells: 0 },
  // [широта, долгота, биом] — север; юг = антипод (−p)
  SEEDS: [[90, 0, 0], [18, 50, 0], [28, 138, 3], [2, 92, 1], [38, 205, 1], [-4, 248, 1], [32, 300, 2], [52, 15, 2], [55, 250, 1]],
  NAME: [['Пустошь', 'Wasteland', 'Hoang mạc'], ['Зелёная аномальная зона', 'Green anomalous zone', 'Vùng dị thường xanh'],
         ['Рыжий пояс', 'Russet belt', 'Vành đai đỏ'], ['Белая шапка', 'White cap', 'Mũ trắng']],
  TIP: [null, ['трава прячет пехоту: дальше 40 м не видно, пока не стреляешь', 'grass hides infantry: unseen beyond 40 m unless firing', 'cỏ che bộ binh: ngoài 40 m không thấy'],
        ['листва шуршит: бегущего слышно за 32 м', 'leaves rustle: runners are heard 32 m away', 'lá xào xạc: chạy bị nghe thấy 32 m'],
        ['снег: пехота −15 % скорости, обзор ×0.7', 'snow: infantry −15% speed, sight ×0.7', 'tuyết: bộ binh −15% tốc độ, tầm nhìn ×0.7']],
  CSS: ['#c9b89a', '#62ff9a', '#ff9a3c', '#d8ecff'],
  ICON: ['◌', '🌿', '🍂', '❄'],
  // шум границы: те же частоты в шейдере (bq86)
  A: [[0.031, 0.017, -0.023], [-0.019, 0.029, 0.021], [0.024, -0.026, 0.018]],
  B: [[0.083, -0.061, 0.047], [0.052, 0.077, -0.069], [-0.071, 0.049, 0.088]],
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('BIO86 ' + tag, e); } } },
  low(){ return S.quality === 0 || (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()); },
  lv(){ return this.low() ? 0 : typeof ADG80 !== 'undefined' ? clamp(ADG80.L | 0, 0, 3) : 2; },
  name(b){ return N2(this.NAME[b]); },
  init(){
    if (this.S.length) return;
    for (const [la, lo, k] of this.SEEDS){ this.S.push(dirLL(la, lo), dirLL(-la, lo + 180)); this.K.push(k, k); }
  },
  q(x, y, z, nx, ny, nz){
    const A = this.A, B = this.B;
    let qx = nx + 0.022 * sin(A[0][0] * x + A[0][1] * y + A[0][2] * z) + 0.011 * sin(B[0][0] * x + B[0][1] * y + B[0][2] * z);
    let qy = ny + 0.022 * sin(A[1][0] * x + A[1][1] * y + A[1][2] * z) + 0.011 * sin(B[1][0] * x + B[1][1] * y + B[1][2] * z);
    let qz = nz + 0.022 * sin(A[2][0] * x + A[2][1] * y + A[2][2] * z) + 0.011 * sin(B[2][0] * x + B[2][1] * y + B[2][2] * z);
    return [qx, qy, qz];
  },
  // биом в точке p (мировые координаты): { b, b2, e (м до границы) }
  pick(p){
    this.init();
    const r = len(p) || 1, q = this.q(p[0], p[1], p[2], p[0] / r, p[1] / r, p[2] / r);
    let d1 = -9, i1 = 0;
    for (let i = 0; i < this.S.length; i++){ const s = this.S[i], d = s[0] * q[0] + s[1] * q[1] + s[2] * q[2]; if (d > d1){ d1 = d; i1 = i; } }
    const b = this.K[i1]; let d2 = -9, i2 = -1;
    for (let i = 0; i < this.S.length; i++){ if (this.K[i] === b) continue; const s = this.S[i], d = s[0] * q[0] + s[1] * q[1] + s[2] * q[2]; if (d > d2){ d2 = d; i2 = i; } }
    const s1 = this.S[i1], s2 = this.S[i2], e = (d1 - d2) / (Math.hypot(s1[0] - s2[0], s1[1] - s2[1], s1[2] - s2[2]) || 1) * RM / len(q);
    return { b, b2: this.K[i2], e };
  },
  at(p){ return this.on && p ? this.pick(p).b : 0; },
  // биом сущности — с кэшем (раз в ~0.4 с)
  of(e){
    if (!this.on || !e || !e.pos) return 0;
    if (e.b86T === undefined || S.time > e.b86T || S.time < e.b86T - 1){ e.b86 = this.at(e.pos); e.b86T = S.time + 0.35 + random() * 0.15; }
    return e.b86;
  },
  // ------------------------------------------------------------------ шейдер
  glslProto(){ return '\nvoid bio86(vec3 p, vec3 rn, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump);\n'; },
  glslStub(){ return '\nvoid bio86(vec3 p, vec3 rn, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){}\n'; },
  glslTail(){
    this.init();
    const v = a => `vec3(${f5(a)})`, n = this.S.length;
    return `
// ---- v8.6 BIO86: биомы (= BIO86.pick в v86_biome.js)
const vec3 BS86[${n}] = vec3[${n}](${this.S.map(v).join(', ')});
const int BK86[${n}] = int[${n}](${this.K.join(', ')});
vec3 bq86(vec3 p, vec3 rn){
  return rn + 0.022 * vec3(sin(dot(p, ${v(this.A[0])})), sin(dot(p, ${v(this.A[1])})), sin(dot(p, ${v(this.A[2])})))
            + 0.011 * vec3(sin(dot(p, ${v(this.B[0])})), sin(dot(p, ${v(this.B[1])})), sin(dot(p, ${v(this.B[2])})));
}
void bmat86(int b, vec3 p, float slope, vec3 a0, out vec3 a, out vec3 e, out float s){
  a = a0; e = vec3(0.0); s = -1.0;
  if (b == 0) return;
  float fl = 1.0 - smoothstep(0.24, 0.52, slope);          // на крутых склонах — голая порода
  float n1 = nz(p * 0.29), near = exp(-gDist * 0.02);
  float n2 = mix(0.5, nz(p * 1.37 + 7.1), near);
  if (b == 1){   // зелёная аномальная трава: изумруд, «прожилки» стеблей, светящиеся споры и кристаллы
    vec3 g = mix(vec3(0.030, 0.17, 0.070), vec3(0.085, 0.36, 0.13), n1);
    g = mix(g, vec3(0.02, 0.10, 0.085), smoothstep(0.62, 0.9, n2) * 0.7);
    float bl = mix(0.5, nz(vec3(p.x * 4.1, p.y * 4.3, p.z * 3.9)), near);
    a = mix(a0, g * (0.75 + 0.5 * bl), fl);
    float spo = smoothstep(0.88, 0.94, nz(p * 2.1 + vec3(0.0, uTime * 0.12, 0.0))) * near;
    e = vec3(0.12, 1.0, 0.5) * spo * fl * (0.55 + 0.45 * sin(uTime * 2.3 + n1 * 23.0));
    float cr = smoothstep(0.80, 0.83, nz(p * 0.11 + 3.3));
    a = mix(a, vec3(0.10, 0.48, 0.38), cr * 0.7); e += vec3(0.06, 0.6, 0.42) * cr * (0.75 + 0.25 * sin(uTime * 1.3 + n1 * 9.0));
    s = 0.1;
  } else if (b == 2){   // рыжий пояс: листва — ржавчина, охра, бордо; тёмная земля в прогалинах
    float k = nz(p * 0.62 + 1.7);
    vec3 c = mix(vec3(0.40, 0.10, 0.03), vec3(0.62, 0.27, 0.05), smoothstep(0.35, 0.5, k));
    c = mix(c, vec3(0.58, 0.42, 0.08), smoothstep(0.6, 0.72, k));
    c = mix(c, vec3(0.30, 0.05, 0.035), smoothstep(0.7, 0.85, n1) * 0.6);
    c *= 0.72 + 0.5 * n2;
    c = mix(c, vec3(0.09, 0.06, 0.045), smoothstep(0.72, 0.86, n2) * 0.8);
    a = mix(a0, c, fl * 0.95); s = 0.05;
  } else {   // белая шапка: снег с голубыми тенями в складках, искры наста
    float f2 = 1.0 - smoothstep(0.33, 0.6, slope);
    vec3 c = mix(vec3(0.60, 0.65, 0.72), vec3(0.78, 0.81, 0.86), n1) * (0.92 + 0.12 * n2);
    c = mix(c, vec3(0.42, 0.52, 0.66), smoothstep(0.08, 0.36, slope) * 0.55);
    a = mix(a0, c, f2); s = mix(0.04, 0.4, f2);
    e = vec3(1.1, 1.15, 1.25) * smoothstep(0.955, 0.985, nz(p * 3.3)) * f2 * exp(-gDist * 0.05) * 0.6;
  }
}
void bio86(vec3 p, vec3 rn, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){
  vec3 q = bq86(p, rn);
  float d1 = -9.0, d2 = -9.0; int i1 = 0, i2 = 0;
  for (int i = 0; i < ${n}; i++){ float d = dot(q, BS86[i]); if (d > d1){ d1 = d; i1 = i; } }
  int b = BK86[i1];
  for (int i = 0; i < ${n}; i++){ if (BK86[i] == b) continue; float d = dot(q, BS86[i]); if (d > d2){ d2 = d; i2 = i; } }
  float ed = (d1 - d2) / max(length(BS86[i1] - BS86[i2]), 1e-3) * RM / length(q);   // метры до границы
  vec3 a, e; float s;
  bmat86(b, p, slope, alb, a, e, s);
  if (ed < 1.5){   // резкая граница: переход 1.5 м
    vec3 a2, e2; float s2; bmat86(BK86[i2], p, slope, alb, a2, e2, s2);
    float w = 0.5 + 0.5 * smoothstep(0.0, 1.5, ed);
    a = mix(a2, a, w); e = mix(e2, e, w); s = mix(s2 < 0.0 ? sp : s2, s < 0.0 ? sp : s, w);
  }
  alb = a; em += e; if (s >= 0.0) sp = s;
  if (b != 0) bump *= 0.85;
}
`;
  },
  // ------------------------------------------------------------------ геймплей
  concealed(e){   // пехота в зелёной траве, не стреляла 2.5 с
    return e.cls === 'inf' && e.alive && this.of(e) === 1 && S.time - (e.lastShotT || -99) > 2.5 && !e.skyState && !(len(e.pos) - RM > 30);
  },
  // после обзора: спрятанных в траве видно только с 40 м; бегущих по листве слышно с 32 м
  visPost(prev){
    if (!this.on) return;
    const near = (t, p, R) => {
      const R2 = R * R;
      for (const L of [S.units, S.vehicles]) for (const o of L) if (o.alive && o.team === t && dist2(o.pos, p) < R2) return true;
      return false;
    };
    for (const e of S.units){
      if (!e.alive || e.team > 1) continue;
      const t = 1 - e.team, b = this.of(e);
      if (b === 1 && prev.has(e) && this.concealed(e)){
        const p0 = prev.get(e);
        if (e.seen[t] > p0 && !near(t, e.pos, 40) && !(S.scans || []).some(z => z.team === t && dist(z.pos, e.pos) < z.r)){ e.seen[t] = p0; this.stats.hidden++; }
      } else if (b === 2 && e.grounded && (e.moveAmt || 0) > 0.55 && e.seen[t] <= 0 && near(t, e.pos, 32)){ e.seen[t] = 0.5; this.stats.heard++; }
    }
  },
  // ------------------------------------------------------------------ растительность у камеры (меши ST70)
  hash(i, j, k, s){ let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; },
  cell(i, j, k, C){
    const key = i + ',' + j + ',' + k;
    let c = this.cache.get(key);
    if (c !== undefined) return c;
    c = null;
    const h = this.hash(i, j, k, 1);
    const p = [(i + 0.15 + 0.7 * h) * C, (j + 0.15 + 0.7 * this.hash(i, j, k, 2)) * C, (k + 0.15 + 0.7 * this.hash(i, j, k, 3)) * C];
    const r = len(p);
    if (r >= RM - C * 0.5 && r < RM + C * 0.5){
      const dir = mul(p, 1 / r), pk = this.pick(mul(dir, RM)), b = pk.b, u = this.hash(i, j, k, 4);
      let kind = null;
      if (b === 1) kind = u < 0.55 ? 'v86grass' : u < 0.6 ? 'v86crys' : null;
      else if (b === 2) kind = u < 0.32 ? 'v86bush' : u < 0.37 ? 'v86tree' : u < 0.5 ? 'v86leaf' : null;
      else if (b === 3) kind = u < 0.22 ? 'v86drift' : u < 0.27 ? 'v86ice' : null;
      if (kind && pk.e > 1.2 && this.free(dir)){
        const g = groundR(dir), fw = tangent(anyTangent(dir), dir), a = this.hash(i, j, k, 5) * 6.283;
        const t2 = cross(dir, fw), F = norm(add(mul(fw, cos(a)), mul(t2, sin(a))));
        // крутой склон — без растительности
        const d2 = offsetOnSphere(dir, F, 1.2), g2 = groundR(d2);
        if (abs(g2 - g) < 0.9) c = { m: kind, dir, pos: mul(dir, g - 0.05), Y: dir, Z: F, X: norm(cross(dir, F)), s: 0.75 + 0.6 * this.hash(i, j, k, 6), ph: a, b };
      }
    }
    this.stats.cells++;
    if (this.cache.size > 6000) this.cache.clear();
    this.cache.set(key, c);
    return c;
  },
  free(dir){
    for (const b of BASES) if (dot(dir, b) > PAD_B[0] - 0.004) return false;
    for (const c of CPD) if (dot(dir, c) > PAD_C[0] - 0.0015) return false;
    if (typeof TER81 !== 'undefined' && TER81.ready && TER81.near(dir, 2)) return false;
    return true;
  },
  gather(){
    const cam = S.cam && S.cam.pos; if (!cam) return;
    const lv = this.lv(), alt = len(cam) - RM;
    if (alt > 95 || S.over && S.attract && false){ this.props = []; return; }
    const R = [26, 40, 55, 70][lv], C = 5.5, maxN = [24, 60, 110, 160][lv];
    const gp = mul(norm(cam), RM), n = Math.ceil(R / C);
    const ci = floor(gp[0] / C), cj = floor(gp[1] / C), ck = floor(gp[2] / C), L = [];
    const R2 = R * R;
    for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) for (let k = ck - n; k <= ck + n; k++){
      const x = (i + 0.5) * C, y = (j + 0.5) * C, z = (k + 0.5) * C, rr = Math.sqrt(x * x + y * y + z * z);
      if (abs(rr - RM) > C * 1.2) continue;
      if ((x - gp[0]) ** 2 + (y - gp[1]) ** 2 + (z - gp[2]) ** 2 > R2 * 1.1) continue;
      const c = this.cell(i, j, k, C); if (c) L.push(c);
    }
    L.sort((a, b) => dist2(a.pos, cam) - dist2(b.pos, cam));
    this.props = L.slice(0, maxN); this.stats.props = this.props.length;
  },
  collect(items){
    if (!this.on || !S.cam) return;
    if (S.rtime > this.propT){ this.propT = S.rtime + 0.5; this.gather(); }
    const T = S.rtime;
    for (const c of this.props){
      const glow = c.m === 'v86grass' ? 0.55 + 0.45 * Math.sin(T * 2.1 + c.ph * 5) : c.m === 'v86crys' ? 0.7 + 0.3 * Math.sin(T * 1.4 + c.ph) : 1;
      // трава и кусты чуть колышутся (наклон оси Y)
      let Y = c.Y, Z = c.Z;
      if (c.m === 'v86grass' || c.m === 'v86bush' || c.m === 'v86tree'){ const w = 0.06 * Math.sin(T * 1.7 + c.ph * 3); Y = norm(add(c.Y, mul(c.Z, w))); Z = norm(sub(c.Z, mul(c.Y, w))); }
      items.push({ m: c.m, pos: c.pos, X: c.X, Y, Z, s: c.s, team: 0, sh: 1, flash: 0, glow });
    }
  },
  // ------------------------------------------------------------------ частицы: споры / листья / снежинки (только в бою, у камеры)
  parts(n){
    if (!this.on || !S.cam || S.mode !== 'fps' || S.attract && !(typeof OPER !== 'undefined' && OPER.on)) return n;
    const cam = S.cam.pos; if (len(cam) - RM > 40) return n;
    const b = this.at(cam); if (!b) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    const m = [3, 6, 9, 12][this.lv()], T = S.rtime, up = norm(cam), t1 = anyTangent(up), t2 = cross(up, t1);
    for (let i = 0; i < m && n < pmax; i++){
      const h1 = (i * 0.618 + 0.13) % 1, h2 = (i * 0.414 + 0.71) % 1, R = 3 + 14 * h1, a = h2 * 6.283 + T * 0.03 * (1 + i % 3);
      let hy, ty, ra, off;
      if (b === 1){ hy = 0.3 + 2.2 * ((h1 * 7 + T * 0.07) % 1); ty = 9; ra = 0.035; off = mul(up, 0.04); }
      else if (b === 2){ hy = 3.5 - 3.5 * ((h2 * 5 + T * 0.18) % 1); ty = 12.3 + 0.12 * h1; ra = 0.06; off = add(mul(t1, 0.07 * Math.sin(T * 3 + i)), mul(up, 0.02)); }
      else { hy = 4.5 - 4.5 * ((h2 * 5 + T * 0.25) % 1); ty = 4; ra = 0.03; off = mul(t2, 0.05); }
      const base = add(cam, add(mul(t1, cos(a) * R), mul(t2, sin(a) * R)));
      const p = mul(norm(base), groundR(norm(base)) + hy);
      PAR.set([p[0], p[1], p[2], ra, p[0] + off[0], p[1] + off[1], p[2] + off[2], ty], n * 8); n++;
    }
    return n;
  },
  // ------------------------------------------------------------------ подсказка: вошёл в новый биом
  step(){
    if (!this.on || S.attract || S.mode !== 'fps') return;
    const c = ctrlEntity(); if (!c || !c.pos || c.cls === 'bld') return;
    const b = this.of(c);
    if (b === this.lastB) return;
    const was = this.lastB; this.lastB = b;
    if (was < 0 || !b) return;
    if (S.time - this.sayT < 12) return;
    this.sayT = S.time;
    feed(`${this.ICON[b]} ${this.name(b)}${this.TIP[b] ? ': ' + N2(this.TIP[b]) : ''}`, this.CSS[b]);
    if (!this.seenB[b]){ this.seenB[b] = 1; if (typeof HINTS !== 'undefined' && HINTS.used) HINTS.used('bio86_' + b); }
  },
};
// ------------------------------------------------------------------ меши растительности (ST70: 1 — матовый цвет, 2 — металл, 5 — свечение)
if (typeof ST70_DEF !== 'undefined'){
  const rnd = seeded(8606);
  Object.assign(ST70_DEF, {
    v86grass(){   // куст инопланетной травы: тонкие стебли, на концах светящиеся споры
      const g = G69();
      for (let i = 0; i < 13; i++){
        const a = rnd() * 6.283, r = 0.15 + rnd() * 0.75, H = 0.45 + rnd() * 0.85, lean = 0.15 + rnd() * 0.35;
        const b = [Math.cos(a) * r, 0, Math.sin(a) * r], t = [b[0] + Math.cos(a) * lean, H, b[2] + Math.sin(a) * lean];
        const col = rnd() < 0.5 ? [0.05, 0.30, 0.12] : [0.08, 0.42, 0.20];
        g69tube(g, b, t, 0.045, 0.012, 3, col, 1);
        if (rnd() < 0.45) g69box(g, t, [0.04, 0.04, 0.04], 0.02, [0.25, 1.6, 0.75], 5);
      }
      return g;
    },
    v86crys(){   // зелёный кристалл: 4 грани-столбика
      const g = G69();
      for (let i = 0; i < 4; i++){
        const a = i * 1.7 + rnd(), L = 0.6 + rnd() * 1.1, tl = 0.2 + rnd() * 0.35;
        g69with(g, M34.ch(M34.T(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2), M34.ch(M34.RY ? M34.RY(a) : M34.RX(0), M34.RX(tl))), () => {
          g69box(g, [0, L * 0.5, 0], [0.13, L * 0.5, 0.13], 0.05, [0.2, 1.4, 0.95], 5);
        });
      }
      g69box(g, [0, 0.05, 0], [0.45, 0.08, 0.4], 0.06, [0.06, 0.09, 0.08], 1);
      return g;
    },
    v86bush(){   // рыжий куст: несколько «шапок» листвы на коротких стеблях
      const g = G69();
      const C = [[0.55, 0.20, 0.04], [0.68, 0.36, 0.06], [0.45, 0.08, 0.04], [0.62, 0.48, 0.10]];
      for (let i = 0; i < 5; i++){
        const a = rnd() * 6.283, r = rnd() * 0.5, h = 0.35 + rnd() * 0.5, s = 0.28 + rnd() * 0.25;
        g69tube(g, [0, 0, 0], [Math.cos(a) * r, h, Math.sin(a) * r], 0.035, 0.02, 4, [0.12, 0.07, 0.04], 1);
        g69box(g, [Math.cos(a) * r, h + s * 0.4, Math.sin(a) * r], [s, s * 0.75, s], s * 0.6, C[i % 4], 1);
      }
      return g;
    },
    v86tree(){   // тонкое деревце: изогнутый ствол, крона из нескольких комков
      const g = G69();
      g69tube(g, [0, 0, 0], [0.25, 1.8, 0.1], 0.12, 0.08, 6, [0.16, 0.10, 0.07], 1);
      g69tube(g, [0.25, 1.8, 0.1], [0.05, 3.4, -0.1], 0.08, 0.04, 6, [0.16, 0.10, 0.07], 1);
      const C = [[0.66, 0.24, 0.04], [0.74, 0.42, 0.07], [0.50, 0.10, 0.05]];
      for (let i = 0; i < 6; i++){ const a = i * 1.05 + rnd(), r = 0.35 + rnd() * 0.4, h = 2.7 + rnd() * 1.1, s = 0.45 + rnd() * 0.3;
        g69box(g, [Math.cos(a) * r, h, Math.sin(a) * r], [s, s * 0.7, s], s * 0.6, C[i % 3], 1); }
      return g;
    },
    v86leaf(){   // кучка опавших листьев
      const g = G69();
      for (let i = 0; i < 9; i++){ const a = rnd() * 6.283, r = rnd() * 0.9;
        g69box(g, [Math.cos(a) * r, 0.03, Math.sin(a) * r], [0.12 + rnd() * 0.08, 0.015, 0.07 + rnd() * 0.05], 0.01, rnd() < 0.5 ? [0.6, 0.22, 0.04] : [0.62, 0.42, 0.08], 1); }
      return g;
    },
    v86drift(){   // сугроб: приплюснутый холмик
      const g = G69();
      st70lathe(g, 0, 0, 0, [[-0.05, 1.6], [0.08, 1.5], [0.3, 1.1], [0.48, 0.6], [0.55, 0]], 12, [0.74, 0.78, 0.84], 1);
      return g;
    },
    v86ice(){   // ледяные иглы
      const g = G69();
      for (let i = 0; i < 4; i++){ const a = i * 1.6 + rnd(), L = 0.6 + rnd() * 1.0;
        g69with(g, M34.ch(M34.T(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25), M34.RX(0.25 + rnd() * 0.3)), () => g69tube(g, [0, 0, 0], [0, L, 0], 0.13, 0.01, 5, [0.55, 0.70, 0.86], 2)); }
      return g;
    },
  });
}
// ------------------------------------------------------------------ хуки
if (BIO86.on){
  const sc0 = shaderConsts;
  shaderConsts = function(){ return sc0.apply(this, arguments) + BIO86.glslProto(); };
  const sp0 = startProgram;
  startProgram = function(src){ if (typeof src === 'string' && src.indexOf('bio86(p, rn') >= 0 && src.indexOf('void bmat86') < 0) src += BIO86.safe(() => BIO86.glslTail(), 'glsl') || BIO86.glslStub(); return sp0.call(this, src); };
} else {
  const sc0 = shaderConsts;
  shaderConsts = function(){ return sc0.apply(this, arguments) + BIO86.glslStub(); };
}
if (BIO86.on){
  { const vs0 = visionStep;
    visionStep = function(dt){
      const prev = new Map();
      const will = visT - dt <= 0;
      if (will) for (const u of S.units) if (u.alive && u.cls === 'inf' && u.b86 === 1) prev.set(u, u.seen[1 - u.team] || 0);
      const r = vs0.apply(this, arguments);
      if (will) BIO86.safe(() => BIO86.visPost(prev), 'vis');
      return r;
    }; }
  { const vr0 = visRadius; visRadius = function(e){ const r = vr0.apply(this, arguments); return e && e.cls !== 'bld' && e.cls !== 'hq' && BIO86.of(e) === 3 ? r * 0.7 : r; }; }
  // ИИ не берёт в цель спрятанных в траве дальше 40 м
  { const ft0 = findTarget;
    findTarget = function(src, team, eye, opts){
      const L = TGT[team];
      if (!L || !L.length || !eye) return ft0.apply(this, arguments);
      let any = false;
      for (const e of L) if (e.cls === 'inf' && e.b86 === 1 && dist2(e.pos, eye) > 1600 && BIO86.concealed(e)){ any = true; break; }
      if (!any) return ft0.apply(this, arguments);
      TGT[team] = L.filter(e => !(e.cls === 'inf' && e.b86 === 1 && e.seen[team] < 1.9 && dist2(e.pos, eye) > 1600 && BIO86.concealed(e)));
      try { return ft0.apply(this, arguments); } finally { TGT[team] = L; }
    }; }
  // снег: пехота −15 % скорости
  { const ps0 = physStep;
    physStep = function(e, inp, dt, free){
      if (!free && e && e.cls === 'inf' && e.grounded && inp && inp.speedMul && BIO86.of(e) === 3){ const s0 = inp.speedMul; inp.speedMul = s0 * 0.85; BIO86.stats.snowSlow++; try { return ps0.apply(this, arguments); } finally { inp.speedMul = s0; } }
      return ps0.apply(this, arguments);
    }; }
  // шаги по биому: хруст снега, шорох листвы (громче), мягкая трава
  if (typeof AU !== 'undefined' && AU.step){ const st0 = AU.step;
    AU.step = function(pos, heavy, mine){
      const r = st0.apply(this, arguments);
      BIO86.safe(() => {
        if (!this.ready() || !this.allow(mine ? null : pos, 34)) return;
        const b = BIO86.at(pos); if (!b) return;
        const t = this.ctx.currentTime, out = this.out(mine ? null : pos), v = mine ? 0.16 : 0.3;
        if (b === 2) this.nz(out, t, 0.14, 'highpass', 2600 + Math.random() * 900, 1500, 0.7, v * 1.3);
        else if (b === 3) this.nz(out, t, 0.11, 'bandpass', 1100 + Math.random() * 300, 700, 1.4, v * 0.9);
        else if (b === 1) this.nz(out, t, 0.09, 'highpass', 4200, 2600, 0.6, v * 0.35);
      }, 'au');
      return r;
    }; }
  if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect; ST70.collect = function(){ c0.apply(this, arguments); BIO86.safe(() => BIO86.collect(this.items), 'collect'); }; }
  { const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); const m = BIO86.safe(() => BIO86.parts(n), 'par'); return m === undefined ? n : m; }; }
  { const up0 = update; update = function(rdt){ up0(rdt); if (!S.paused) BIO86.safe(() => BIO86.step(), 'step'); }; }
  { const nm0 = newMatch; newMatch = function(){ BIO86.lastB = -1; return nm0.apply(this, arguments); }; }
}
