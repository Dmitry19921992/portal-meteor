// =====================================================================
//  v8.19 (T168) — «ПРИЗЕМЛЕНИЕ» МОДЕЛЕЙ: постройки-меши и модели окружения стоят на грунте, а не висят над ним.
//  Было: постройки v7.0+ (дот, бункер, ангар дронов, цеха, сверхъюниты «Бастион»/«Жнец» и т. п. — ST70) рисуются
//  после рэймарчера и сами тени не дают: ни пятна на грунте, ни затемнения у основания — «наклейка поверх кадра».
//  У моделей окружения (AS75) контактная тень — плоский диск: на склоне половина уходит под грунт, половина висит
//  тёмной «тарелкой» в воздухе (и дрожит с грунтом по глубине на пологих местах).
//  Стало:
//   1) контактная тень-«декаль», облегающая рельеф: кольца вершин, высота каждой — groundR() (считается один раз
//      на позицию и кешируется, по времени не больше ~1,5 мс за кадр); форма — по пятну модели (скруглённый
//      прямоугольник для построек, эллипс для камней/растений). Поднята на 5–10 см + сдвиг глубины — без Z-fighting;
//   2) затемнение основания построек ST70 (как «ao» у AS75): второй проход того же меша умножением, у земли темнее;
//   3) у AS75 старый плоский диск отключается (вместо него — облегающая тень из п. 1).
//  Только графика: логика, коллизии, ГСЧ боя не трогаются. Выключить: ?gnd168=0 (или localStorage pm_gnd168 = '0').
//  Консоль: GND168.info().
// =====================================================================
const GND168 = {
  on: true, failed: false, err: '', P: null, U: null, aP: null, aU: null, vao: null, vbo: null, ibo: null, nullP: null,
  cache: new Map(), hcache: new Map(), mcache: new Map(), foot: {}, cap: 96, lastT: 0, crSig: '', crL: null,
  // движутся (боссы «Бастион»/«Жнец», фауна): ключ кеша грубее (2 м), сдвиг до точной позиции — при отрисовке
  MOVE: /^(b83|r83|f810)/,
  stats: { st: 0, as: 0, ao: 0, built: 0, miss: 0, ms: 0, buildMs: 0 },
  RINGS: [0, 0.6, 1.05, 1.85], SEG: 16,
  // модели ST70 без тени/затемнения: плоские площадки, проёмы шахт, купола
  SKIP: { v87pad: 1, tun82: 1, silo: 1 },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  fail(e){
    this.failed = true; this.err = String(e && e.message || e);
    try { if (this.oldS && typeof AS75 !== 'undefined'){ AS75.sP = this.oldS[0]; AS75.sU = this.oldS[1]; this.asHooked = false; } } catch (_){}   // вернуть старый диск AS75
    try { console.warn('GND168: приземление моделей отключено —', this.err); } catch (_){}
  },
};
try {
  const q = new URLSearchParams(location.search).get('gnd168');
  if (q === '0' || (q === null && localStorage.getItem('pm_gnd168') === '0')) GND168.on = false;
} catch (e){}

const GND168_DVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aQ;
uniform mat3 uV; uniform vec4 uPr;
out vec3 vQ; out float vZ;
void main(){
  vQ = aQ;
  vec3 v = uV * aP; vZ = -v.z;
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
// aQ: xy — координата в пятне модели (1 = край пятна), z — сила; знак z = форма (+ скруглённый прямоугольник, − эллипс)
const GND168_DFS = `#version 300 es
precision highp float;
uniform float uFar;
in vec3 vQ; in float vZ;
out vec4 frag;
void main(){
  vec2 q = abs(vQ.xy);
  float r = vQ.z > 0.0 ? pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25) : length(q);
  float a = (1.0 - smoothstep(0.72, 1.62, r)) * abs(vQ.z);
  a *= 1.0 - 0.25 * smoothstep(0.0, 0.5, 1.0 - r);        // под самой моделью чуть светлее — не «чёрная дыра», если видно сквозь щели
  a *= 1.0 - smoothstep(uFar * 0.55, uFar, vZ);              // вдали тень плавно тает (без скачка на границе дальности)
  frag = vec4(vec3(1.0 - a), 1.0);
  gl_FragDepth = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0) - 0.000004;
}`;
// затемнение основания построек: тот же вершинный шейдер, что у ST70 (позиции в локальных координатах модели)
const GND168_AVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP;
uniform mat4 uM; uniform mat3 uV; uniform vec4 uPr;
out float vY; out float vZ; out float vD;
void main(){
  vec4 wp = uM * vec4(aP, 1.0);
  vY = aP.y;
  vec3 v = uV * wp.xyz; vZ = -v.z; vD = length(wp.xyz);
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
const GND168_AFS = `#version 300 es
precision highp float;
uniform vec2 uH;      // x — высота полосы затемнения (м, локально), y — сила
uniform float uFar;
in float vY; in float vZ; in float vD;
out vec4 frag;
void main(){
  float ao = mix(1.0 - uH.y, 1.0, smoothstep(0.0, uH.x, vY));
  ao = mix(1.0, ao, exp(-vD * 0.0011) * (1.0 - smoothstep(uFar * 0.55, uFar, vZ)));
  frag = vec4(vec3(ao), 1.0);
  gl_FragDepth = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0) - 0.000001;
}`;

GND168.build = function(){
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs, names) => {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const U = {}; for (const n of names) U[n] = gl.getUniformLocation(p, n); return [p, U];
  };
  [this.P, this.U] = prog(GND168_DVS, GND168_DFS, ['uV', 'uPr', 'uFar']);
  [this.aP, this.aU] = prog(GND168_AVS, GND168_AFS, ['uM', 'uV', 'uPr', 'uH', 'uFar']);
  const nv = 1 + (this.RINGS.length - 1) * this.SEG;
  this.nv = nv;
  // индексы одной декали: веер в центре + полосы между кольцами
  const I = [], S = this.SEG, ring = (k, j) => 1 + (k - 1) * S + (j % S);
  for (let j = 0; j < S; j++) I.push(0, ring(1, j), ring(1, j + 1));
  for (let k = 1; k < this.RINGS.length - 1; k++) for (let j = 0; j < S; j++){ const a = ring(k, j), b = ring(k, j + 1), c = ring(k + 1, j), d = ring(k + 1, j + 1); I.push(a, c, b, b, c, d); }
  this.ni = I.length;
  const all = new Uint16Array(I.length * this.cap);
  for (let n = 0; n < this.cap; n++) for (let i = 0; i < I.length; i++) all[n * I.length + i] = I[i] + n * nv;
  this.buf = new Float32Array(this.cap * nv * 6);
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
  this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, this.buf.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  this.ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, all, gl.STATIC_DRAW);
  gl.bindVertexArray(prevVao);
};

// пятно модели ST70 у грунта (локальное y = 0 — уровень грунта, фундамент ниже не считается): полуоси по X/Z и высота
GND168.footST = function(m){
  let f = this.foot[m];
  if (f !== undefined) return f;
  f = null;
  try {
    const G = ST70_DEF[m](), P = G.P;
    let ex = 0, ez = 0, H = 0;
    for (let i = 1; i < P.length; i += 3) H = max(H, P[i]);
    for (let i = 0; i < P.length; i += 3) if (P[i + 1] > -0.3 && P[i + 1] < 1.0){ ex = max(ex, abs(P[i])); ez = max(ez, abs(P[i + 2])); }
    if (ex > 0.3 && ez > 0.3 && H >= 1.2) f = { ex, ez, H, y0: 0 };
  } catch (e){ f = null; }
  this.foot[m] = f;
  return f;
};

// вершины декали в мире (кеш по позиции): запись { v: [x, y, z, qx, qz, вес] × nv, c: центр, r: радиус, stale }.
// null — ещё не посчитано (лимит времени кадра). Устаревшую (воронка рядом) пересчитываем, пока есть время, иначе рисуем старую.
GND168.verts = function(key, pos, X, Z, ex, ez, budget, H, cache){
  cache = cache || this.cache;
  let e = cache.get(key);
  if (e && !e.stale) return e;
  if (performance.now() > budget){ this.stats.miss++; return e || null; }
  const t0 = performance.now();
  const S = this.SEG, R = this.RINGS, nv = this.nv;
  const v = new Float32Array(nv * 6);
  const up = norm(pos), base = groundR(up);
  const lift = 0.05 + 0.01 * max(ex, ez);
  // солнце (как в шейдерах: SUN1 и противоположное SUN2): пятно сдвигается от солнца — чем ниже солнце, тем дальше
  const L = dot(up, GND168_SUN) >= 0 ? GND168_SUN : mul(GND168_SUN, -1), lu = dot(up, L);
  let off = [0, 0, 0];
  if (H && lu > 0.05){ const lt = sub(L, mul(up, lu)), tl = len(lt); if (tl > 1e-3) off = mul(lt, -min(H * 0.3 * tl / max(lu, 0.35), 0.45 * max(ex, ez)) / tl); }
  let n = 0;
  for (let k = 0; k < R.length; k++){
    const cnt = k === 0 ? 1 : S;
    for (let j = 0; j < cnt; j++){
      const a = j / S * Math.PI * 2, qx = Math.cos(a) * R[k], qz = Math.sin(a) * R[k];
      const w = add(add(pos, off), add(mul(X, qx * ex), mul(Z, qz * ez)));
      const d = norm(w);
      // высоту берём с грунта, но не даём «залезть» на соседние строения рэймарчера (штаб, вышки, скалы);
      // где пришлось обрезать (обрыв, стена) — тень там гасим, чтобы не висела в воздухе
      const g0 = groundR(d), lo = base - 2.5, hi = base + 1.2 + 0.25 * R[k] * max(ex, ez), g = clamp(g0, lo, hi);
      const wt = g0 < lo ? max(0, 1 - (lo - g0) * 0.7) : g0 > hi ? max(0, 1 - (g0 - hi) * 0.7) : 1;
      const p = mul(d, g + lift);
      v[n++] = p[0]; v[n++] = p[1]; v[n++] = p[2]; v[n++] = qx; v[n++] = qz; v[n++] = wt;
    }
  }
  if (cache.size > (cache === this.mcache ? 48 : 600)) cache.delete(cache.keys().next().value);
  e = { v, c: pos.slice(), r: max(ex, ez) * R[R.length - 1] + 2, stale: false };
  cache.set(key, e);
  this.stats.built++; this.stats.buildMs += performance.now() - t0;
  return e;
};

// воронки (CR76) меняют грунт: записи кеша рядом с изменившейся воронкой помечаем устаревшими
GND168.craters = function(){
  if (typeof CR76 === 'undefined' || !CR76.L) return;
  const L = CR76.L.slice(0, CR76.n === undefined ? CR76.L.length : CR76.n);
  const sig = L.length + ':' + L.map(c => Math.round(c.p[0] * 2) + ',' + Math.round(c.p[1] * 2) + ',' + Math.round(c.p[2] * 2) + ',' + Math.round(c.r * 10) + ',' + Math.round(c.D * 10)).join(';');
  if (sig === this.crSig) return;
  const now = L.map(c => ({ p: c.p.slice(), r: c.r, D: c.D }));
  const old = this.crL || [];
  const same = (a, b) => dist(a.p, b.p) < 0.3 && Math.abs(a.r - b.r) < 0.15 && Math.abs(a.D - b.D) < 0.15;
  const changed = now.filter(c => !old.some(o => same(o, c))).concat(old.filter(o => !now.some(c => same(o, c))));
  this.crSig = sig; this.crL = now;
  for (const c of changed){
    const R2 = c.r * 1.8;
    for (const C of [this.cache, this.mcache]) for (const e of C.values()) if (dist(e.c, c.p) < R2 + e.r) e.stale = true;
    for (const [k, h] of this.hcache) if (dist(h.c, c.p) < R2 + 8) this.hcache.delete(k);
  }
};

GND168.ok = function(){ return this.on && !this.failed && typeof gl !== 'undefined'; };

// главный проход: после ST70 (и AS75, который рисуется внутри ST70.draw)
GND168.draw = function(c){
  if (!this.ok()) return;
  const t0 = performance.now(), budget = t0 + 1.5;
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING), cull = gl.isEnabled(gl.CULL_FACE);
  try {
    if (!this.P) this.build();
    if (S.time < this.lastT - 1){ this.cache.clear(); this.hcache.clear(); this.mcache.clear(); this.crSig = ''; this.crL = null; }   // новый бой — новый рельеф
    this.lastT = S.time;
    this.craters();
    const lite = this.lite(), R = c.right, Up = c.up, F = c.fwd;
    const aspect = fboW / fboH, tx = c.fov * 0.5 * aspect, ty = c.fov * 0.5;
    const seen = (p, r, far) => {
      const cx = p[0] - c.pos[0], cy = p[1] - c.pos[1], cz = p[2] - c.pos[2];
      const vz = F[0] * cx + F[1] * cy + F[2] * cz; if (vz < -r || vz > far + r) return -1;
      const vx = R[0] * cx + R[1] * cy + R[2] * cz, vy = Up[0] * cx + Up[1] * cy + Up[2] * cz;
      if (Math.abs(vx) > vz * tx + r * 1.5 || Math.abs(vy) > vz * ty + r * 1.5) return -1;
      return Math.hypot(cx, cy, cz);
    };
    const rej = this.stats.rej = { seen: 0, h: 0, budget: 0, n: 0 };
    const decals = [];   // [verts, strength*shape]
    const aoList = [];
    // --- постройки ST70
    const farST = lite ? 160 : 320;
    if (typeof ST70 !== 'undefined' && ST70.ok() && ST70.built && ST70.items){
      const far = farST;
      for (const it of ST70.items){
        if (it.dome || this.SKIP[it.m] || !ST70.M[it.m]) continue;
        const f = this.footST(it.m); if (!f) continue;
        const s = it.s || 1;
        const d = seen(it.pos, ST70.M[it.m].R * s + 2, far); if (d < 0){ rej.seen++; continue; }
        const mv = this.MOVE.test(it.m), q = mv ? 0.5 : 4, qa = mv ? 8 : 50;
        const P = mv ? it.pos.map(x => Math.round(x * q) / q) : it.pos;
        const key = 's' + it.m + '|' + P.map(x => Math.round(x * q)).join(',') + '|' + Math.round(it.X[0] * qa) + ',' + Math.round(it.X[2] * qa);
        let he = this.hcache.get(key);
        if (he === undefined){
          if (performance.now() > budget){ this.stats.miss++; rej.budget++; continue; }
          he = { h: len(P) - groundR(norm(P)) + f.y0 * s, c: P.slice() };
          if (this.hcache.size > 600) this.hcache.delete(this.hcache.keys().next().value);
          this.hcache.set(key, he);
        }
        const h = he.h + (mv ? len(it.pos) - len(P) : 0);
        if (h > 0.45 || h < -1.5){ rej.h++; continue; }          // турели на крыше, дроны, утопленные шахты — не трогаем
        aoList.push([it, f, s]);
        if (decals.length < this.cap){
          const e = this.verts(key, P, it.X, it.Z, f.ex * s * 1.15, f.ez * s * 1.15, budget, f.H * s, mv ? this.mcache : this.cache);
          if (e) decals.push([e, 0.85, mv ? sub(it.pos, P) : null]);
        }
      }
    }
    this.stats.st = aoList.length;
    // --- модели окружения AS75 (видимые и уже загруженные)
    let nas = 0;
    if (typeof AS75 !== 'undefined' && AS75.on() && AS75.items && this.asHooked){
      const far = farST;
      for (const it of AS75.items){
        if (decals.length >= this.cap) break;
        if (it.hide || !it.e || !it.e.d) continue;
        const d = seen(it.cen || it.pos, it.rr || it.r || 4, far); if (d < 0) continue;
        const m = AS75.M[it.key + '_lod1']; if (!m || m.st !== 2) continue;
        if (it.dir && dot(sub(c.pos, it.cen || it.pos), it.dir) < -(it.rr || 4) * 2) continue;
        const s = it.s || 1, ex = max(0.4, it.e.d[0] * s * 0.5), ez = max(0.4, it.e.d[2] * s * 0.5);
        const key = 'a' + it.key + '|' + it.pos.map(x => Math.round(x * 4)).join(',');
        const e = this.verts(key, it.pos, it.X, it.Z, ex * 1.1, ez * 1.1, budget, it.e.d[1] * s);
        if (e){ decals.push([e, it.e.p === 'nature' ? -0.55 : 0.6, null]); nas++; }
      }
    }
    this.stats.as = nas;
    const fy = 2 / c.fov, fx = fy / aspect, n = 0.05, f = 20000;
    const UV = GND168_UV; UV.set([R[0], Up[0], -F[0], R[1], Up[1], -F[1], R[2], Up[2], -F[2]]);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ZERO, gl.SRC_COLOR); gl.depthMask(false);
    // --- затемнение основания построек (тот же меш, умножение)
    if (aoList.length){
      gl.useProgram(this.aP);
      gl.uniformMatrix3fv(this.aU.uV, false, UV);
      gl.uniform4f(this.aU.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
      gl.uniform1f(this.aU.uFar, farST);
      for (const [it, ft, s] of aoList){
        const M = ST70.M[it.m];
        GND168_UM.set([it.X[0] * s, it.X[1] * s, it.X[2] * s, 0, it.Y[0] * s, it.Y[1] * s, it.Y[2] * s, 0, it.Z[0] * s, it.Z[1] * s, it.Z[2] * s, 0,
                       it.pos[0] - c.pos[0], it.pos[1] - c.pos[1], it.pos[2] - c.pos[2], 1]);
        gl.uniformMatrix4fv(this.aU.uM, false, GND168_UM);
        gl.uniform2f(this.aU.uH, ft.y0 + clamp(ft.H * 0.25, 0.8, 2.8), 0.58);
        gl.bindVertexArray(M.vao);
        gl.drawElements(gl.TRIANGLES, M.n, M.type, 0);
      }
      this.stats.ao = aoList.length;
    } else this.stats.ao = 0;
    // --- облегающие контактные тени (одним вызовом)
    if (decals.length){
      const B = this.buf, nv = this.nv; let o = 0;
      for (const [e, k, dv] of decals){
        const v = e.v, ox = c.pos[0] - (dv ? dv[0] : 0), oy = c.pos[1] - (dv ? dv[1] : 0), oz = c.pos[2] - (dv ? dv[2] : 0);
        for (let i = 0; i < nv; i++){
          const j = i * 6;
          B[o++] = v[j] - ox; B[o++] = v[j + 1] - oy; B[o++] = v[j + 2] - oz;
          B[o++] = v[j + 3]; B[o++] = v[j + 4]; B[o++] = k * v[j + 5];
        }
      }
      gl.useProgram(this.P);
      gl.uniformMatrix3fv(this.U.uV, false, UV);
      gl.uniform4f(this.U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
      gl.uniform1f(this.U.uFar, farST);
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, B, 0, o);
      gl.drawElements(gl.TRIANGLES, this.ni * decals.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.BLEND); gl.depthMask(true);
  } catch (e){ this.fail(e); try { gl.disable(gl.BLEND); gl.depthMask(true); } catch (_){} }
  gl.bindVertexArray(prevVao);
  if (cull) gl.enable(gl.CULL_FACE);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
};
const GND168_UM = new Float32Array(16), GND168_UV = new Float32Array(9), GND168_SUN = typeof SUN1 !== 'undefined' ? SUN1 : norm([0.62, 0.55, 0.56]);

// AS75: старый плоский диск-тень выключаем (вместо него облегающая тень GND168). Его uniform-вызовы с null-локациями
// WebGL молча пропускает; программа-«пустышка» не выводит ни одного пикселя.
GND168.hookAS = function(){
  if (typeof AS75 === 'undefined' || this.asHooked) return;
  const kill = () => {
    if (!AS75.sP || this.asHooked) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, '#version 300 es\nlayout(location=0) in vec2 aQ;\nvoid main(){ gl_Position = vec4(aQ * 0.0, 2.0, 1.0); }'));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, '#version 300 es\nprecision mediump float;\nout vec4 frag;\nvoid main(){ frag = vec4(1.0); }'));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.nullP = p; this.oldS = [AS75.sP, AS75.sU];
    AS75.sP = p; AS75.sU = { uM: null, uV: null, uPr: null, uK: null };
    this.asHooked = true;
  };
  try { kill(); } catch (e){ console.warn('GND168 AS75', e); return; }
  if (!this.asHooked){
    const b0 = AS75.build;
    AS75.build = function(){ const r = b0.apply(this, arguments); try { kill(); } catch (e){ console.warn('GND168 AS75', e); } return r; };
  }
};

GND168.info = function(){ const s = this.stats; return { on: this.on, failed: this.failed, err: this.err, st: s.st, ao: s.ao, as: s.as, cache: this.cache.size, built: s.built, miss: s.miss, buildMs: +s.buildMs.toFixed(1), ms: +s.ms.toFixed(2), rej: s.rej, asHooked: !!this.asHooked }; };

if (GND168.on && typeof ST70 !== 'undefined'){
  try {
    GND168.hookAS();
    const d0 = ST70.draw;
    ST70.draw = function(c, nl){ const r = d0.apply(this, arguments); GND168.draw(c); return r; };
  } catch (e){ GND168.fail(e); }
}
