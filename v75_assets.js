// =====================================================================
//  v7.5 — 3D-МОДЕЛИ ОКРУЖЕНИЯ: первые модели из конвейера «концепт → TRELLIS → Blender» в игре.
//  Каталог (assets/catalog3d.json) встроен в страницу (<script id="as75cat">), сами модели лежат рядом со страницей
//  в папке assets3d/ (<имя>_lod0.js — GLB в base64, грузится тегом <script>, работает и с file://) и подгружаются
//  ПО ТРЕБОВАНИЮ — только то, что оказалось рядом с камерой. Стартовая загрузка страницы не растёт.
//  Что делает: расставляет по метеориту камни/кристаллы/грибы, укрепления у точек захвата, руины построек прошлых
//  экспедиций и брошенную технику (свой ГСЧ — бой не сдвигается). Лайкнутые Дмитрием модели встречаются в 3 раза чаще.
//  LOD по экранному размеру: LOD0 (~3k тр., текстура 512) → LOD1 (~500 тр., 256) → не рисуется.
//  Телефон / «Лёгкий режим»: LOD0m (текстура 256), меньше моделей, раньше переход на LOD1.
//  Крупные модели (руины, техника) — с простым коллайдером-коробкой (mapJS): сквозь них не пройти и не прострелить.
//  Настройки → Графика → «Новые 3D-модели окружения». Выключено — рендер и логика ровно как в v7.4.
//  Рисуется после рэймарчера, 3D-бойцов и построек (тест глубины, как heavy65.js / v70_mesh.js).
// =====================================================================
const AS75 = {
  cat: null, failed: false, err: '', missing: 0, items: [], placed: false, grid: new Map(), colOn: false,
  M: {}, queue: [], loading: 0, pend: [], nid: 0, P: null, U: null, sP: null, sU: null, sVao: null, base: 'assets3d/',
  stats: { drawn: 0, ms: 0, tris: 0, loaded: 0, kb: 0, req: 0, fail: 0, items: 0, lod: [0, 0, 0] },
  on(){ return SET.as75 !== false && !this.failed && !!this.cat && this.missing < 6; },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  fail(e){ this.failed = true; this.colOn = false; this.err = String(e && e.message || e); try { console.warn('AS75: 3D-модели окружения отключены —', this.err); } catch (_){} },
  init(){
    try { const el = document.getElementById('as75cat'); if (el && el.textContent.length > 10) this.cat = JSON.parse(el.textContent); } catch (e){ this.err = 'каталог: ' + e.message; }
    // v7.5 релиз: только модели с хорошими оценками Дмитрия (allowlist собирается при сборке: tools3d/allow3d.py —
    // есть оценка, среднее ≥ 4, ни одной 😡, без флага проблемы). Остальные не грузятся вовсе. Пустой список — модели выкл.
    try {
      const al = document.getElementById('as75allow'), A = al ? JSON.parse(al.textContent).allow : null;
      if (this.cat && Array.isArray(A)){ const s = new Set(A); this.cat.items = this.cat.items.filter(e => s.has(e.n)); }
      if (this.cat && !this.cat.items.length) this.cat = null;
    } catch (e){ this.cat = null; this.err = 'allowlist: ' + e.message; }
    // модели лежат на Cloudflare Pages (все, чтобы список мог расти без перезаливки); рядом со страницей — если есть.
    // ?as3d=local — брать из папки assets3d/ рядом со страницей. Недоступно (6 ошибок подряд) — тихо без моделей.
    try { const q = new URLSearchParams(location.search).get('as3d'); if (q !== 'local') this.base = AS75_CDN; } catch (e){ this.base = AS75_CDN; }
  },
};
const AS75_CDN = 'https://portal-meteor.pages.dev/assets3d/';
// v7.5 релиз: модели ВКЛ по умолчанию (только одобренные оценками); выключить: Настройки → Графика; выбор игрока запоминается
if (SET_DEF.as75 === undefined) SET_DEF.as75 = true;
if (SET.as75 === undefined) SET.as75 = SET_DEF.as75;
window.PM3D_reg = (k, b64) => { AS75.pend.push([k, b64]); };

// ---------------------------------------------------------------- шейдеры: статичный меш с текстурой (позиции/нормали/UV квантованы)
const AS75_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aT;
uniform mat4 uM; uniform mat3 uV; uniform vec4 uPr; uniform vec3 uQo, uQs;
out vec3 vW; out vec3 vN; out vec2 vT; out float vZ; out float vH;
void main(){
  vec3 lp = uQo + aP * uQs;
  vH = lp.y;
  vec4 wp = uM * vec4(lp, 1.0);
  vW = wp.xyz; vN = mat3(uM) * aN; vT = aT;
  vec3 v = uV * wp.xyz; vZ = -v.z;
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
const AS75_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uCamW;
uniform vec4 uP;      // x тень солнца, y высота модели (м, локально), z тон (0 — как есть, 1 — пыльнее), w яркость текстуры
uniform vec4 uLP[16]; uniform vec4 uLC[16]; uniform int uNL;
uniform float uLamp, uStorm;
in vec3 vW; in vec3 vN; in vec2 vT; in float vZ; in float vH;
out vec4 frag;
const vec3 SUN1 = normalize(vec3(0.62, 0.55, 0.56));
const vec3 SUN2 = -SUN1;
const vec3 C1 = vec3(1.0, 0.82, 0.62) * 1.7;
const vec3 C2 = vec3(0.58, 0.74, 1.0) * 1.55;
vec3 fogCol(vec3 d){
  vec3 f = vec3(0.016, 0.019, 0.032);
  f += C1 * 0.018 * pow(max(dot(d, SUN1), 0.0), 5.0);
  f += C2 * 0.018 * pow(max(dot(d, SUN2), 0.0), 5.0);
  return mix(f, vec3(0.085, 0.065, 0.045) * (0.8 + 0.4 * max(dot(d, SUN1), 0.0)), uStorm * 0.85);
}
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 p = vW + uCamW, vd = normalize(-vW), up = normalize(p);
  float cd = length(vW);
  vec3 alb = pow(texture(uTex, vT).rgb, vec3(2.2)) * uP.w;
  alb = mix(alb, vec3(dot(alb, vec3(0.33))) * vec3(1.05, 0.98, 0.9), uP.z);     // пыль метеорита приглушает «студийные» цвета
  float ao = mix(0.45, 1.0, smoothstep(0.0, max(0.35, uP.y * 0.25), vH));      // у земли темнее — модель «садится» в грунт
  float sp = 0.18;
  float d1 = dot(n, SUN1);
  vec3 L = d1 > 0.0 ? SUN1 : SUN2, LC = d1 > 0.0 ? C1 : C2;
  float sh = smoothstep(-0.1, 0.05, dot(up, L)); if (dot(up, L) > 0.0) sh *= uP.x;
  vec3 h = normalize(L + vd);
  vec3 col = LC * abs(d1) * sh * (alb + sp * pow(max(dot(n, h), 0.0), 40.0) * 0.5);
  float hemi = 0.5 + 0.5 * dot(n, up);
  vec3 bounce = mix(C2, C1, 0.5 + 0.5 * dot(up, SUN1)) * 0.012;
  vec3 amb = mix(vec3(0.016, 0.015, 0.014), vec3(0.03, 0.036, 0.05), hemi) + bounce * (1.0 - hemi * 0.5);
  col += alb * amb * ao;
  for (int i = 0; i < 16; i++){
    if (i >= uNL) break;
    vec3 lv = uLP[i].xyz - p; float dd = dot(lv, lv), rr = uLP[i].w;
    if (dd > rr * rr) continue;
    float ds = sqrt(dd); lv /= ds;
    float f = 1.0 - ds / rr, att = f * f / (1.0 + dd * 0.04);
    col += uLC[i].rgb * att * (alb * max(dot(n, lv), 0.0) + sp * pow(max(dot(n, normalize(lv + vd)), 0.0), 30.0) * 0.5);
  }
  col += alb * uLamp * max(dot(n, vd), 0.0) * vec3(1.0, 0.96, 0.9) * 0.3 * exp(-cd * 0.04);
  float rim = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 2.5);
  col += vec3(0.30, 0.48, 0.62) * 0.1 * rim * ao;
  col *= mix(0.8, 1.0, ao);
  col = mix(fogCol(-vd), col, exp(-cd * (0.0011 + 0.016 * uStorm)));
  frag = vec4(col, 1.0);
  gl_FragDepth = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0);
}`;
// контактная тень: плоский диск под моделью, умножается на кадр (смешивание ZERO, SRC_COLOR)
const AS75_SVS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ;
uniform mat4 uM; uniform mat3 uV; uniform vec4 uPr;
out vec2 vQ; out float vZ;
void main(){
  vQ = aQ;
  vec4 wp = uM * vec4(aQ.x, 0.0, aQ.y, 1.0);
  vec3 v = uV * wp.xyz; vZ = -v.z;
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
const AS75_SFS = `#version 300 es
precision highp float;
uniform float uK;
in vec2 vQ; in float vZ;
out vec4 frag;
void main(){
  float r = length(vQ);
  float a = (1.0 - smoothstep(0.35, 1.0, r)) * uK;
  frag = vec4(vec3(1.0 - a), 1.0);
  gl_FragDepth = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0) - 0.000004;
}`;

// ---------------------------------------------------------------- расстановка (свой ГСЧ; считается по кусочку за кадр — без рывка)
const AS75_LODS = ['lod0', 'lod0m', 'lod1'];
AS75.pick = function(cls, rnd){
  const L = this.cat.items.filter(e => e.p === cls); if (!L.length) return null;
  let s = 0; for (const e of L) s += e.w;
  let x = rnd() * s; for (const e of L){ x -= e.w; if (x <= 0) return e; }
  return L[L.length - 1];
};
AS75.plan = function(){
  const lite = this.lite(), k = lite ? 0.5 : 1;
  const rnd = seeded(75075);
  const P = [];   // задания расстановки: [класс, «где»]
  const n = (x) => Math.max(1, Math.round(x * k));
  for (let i = 0; i < n(10); i++) P.push(['ruin', 'far']);
  for (let i = 0; i < n(16); i++) P.push(['wreck', 'far']);
  for (let c = 0; c < CPD.length; c++) for (let i = 0; i < n(8); i++) P.push(['camp', 'cp', c]);
  for (let i = 0; i < n(64); i++) P.push(['nature', 'cluster']);
  this.jobs = P; this.rnd = rnd; this.items = []; this.tries = 0; this.grid = new Map(); this.placed = false;
};
AS75.groundPt = function(dir){ return mul(dir, groundR(dir)); };
AS75.normalAt = function(dir, r){
  const t0 = anyTangent(dir), t1 = cross(dir, t0), m = Math.max(1.2, r * 0.7) / RM;
  const a = this.groundPt(norm(add(dir, mul(t0, m)))), b = this.groundPt(norm(add(dir, mul(t1, m)))), c = this.groundPt(norm(sub(sub(dir, mul(t0, m * 0.7)), mul(t1, m * 0.7))));
  let nn = norm(cross(sub(a, c), sub(b, c)));
  if (dot(nn, dir) < 0) nn = mul(nn, -1);
  return nn;
};
AS75.free = function(dir, r, gap){
  for (const b of BASES) if (surfDist(dir, b) < 178 + r) return false;
  for (const a of AXES) if (surfDist(dir, a) < 40 + r) return false;
  for (const p of PROPS) if (surfDist(dir, p.dir) < p.bound + r + 3) return false;
  for (const it of this.items) if (surfDist(dir, it.dir) < it.r + r + gap) return false;
  return true;
};
// одна попытка поставить модель e в направлении dir; yawDir — куда смотреть (или null — случайно)
AS75.put = function(e, dir, opt){
  const rnd = this.rnd, cls = e.p;
  const s = cls === 'nature' ? 0.7 + rnd() * 0.65 : 0.88 + rnd() * 0.24;
  const r = 0.5 * Math.hypot(e.d[0], e.d[2]) * s, h = e.d[1] * s;
  if (!opt.cp) for (const c of CPD) if (surfDist(dir, c) < (cls === 'nature' ? 26 : 52) + r) return false;
  if (!this.free(dir, r, cls === 'nature' ? 1.2 : 5)) return false;
  const gr = groundR(dir);
  if (Math.abs(gr - RM) > 18) return false;
  // ровность площадки: разброс высот по краям
  const t0 = anyTangent(dir), t1 = cross(dir, t0), m = r * 0.75 / RM;
  let lo = 1e9, hi = -1e9;
  for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const g = groundR(norm(add(dir, add(mul(t0, u * m), mul(t1, v * m))))); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  if (hi - lo > (cls === 'ruin' ? 1.2 : 0.35 * h + 0.8)) return false;
  const nn = this.normalAt(dir, r);
  if (dot(nn, dir) < (cls === 'ruin' ? 0.94 : 0.86)) return false;
  let Y = norm(add(mul(dir, cls === 'ruin' ? 0.75 : 0.35), mul(nn, cls === 'ruin' ? 0.25 : 0.65)));
  const yaw = opt.face ? tangent(opt.face, Y) : norm(add(mul(t0, Math.cos(rnd() * 6.283)), mul(t1, Math.sin(rnd() * 6.283))));
  let Z = tangent(yaw, Y);
  if (cls === 'wreck'){ const ax = norm(cross(Y, Z)); Y = norm(rotAxis(Y, ax, (rnd() - 0.5) * 0.12)); Y = norm(rotAxis(Y, Z, (rnd() - 0.5) * 0.14)); Z = tangent(Z, Y); }
  const X = norm(cross(Y, Z));
  const sink = cls === 'ruin' ? 0.35 : cls === 'wreck' ? 0.18 + h * 0.03 : 0.05 + h * 0.04;
  const pos = mul(dir, gr - sink);
  const it = { e, key: e.n, dir, pos, X, Y, Z, s, r, h, rr: Math.hypot(r, h * 0.5), cen: add(pos, mul(Y, h * 0.5)), sh: -1, hide: false,
               col: cls === 'ruin' || (cls === 'wreck' && r > 1.8) || (cls === 'camp' && Math.max(e.d[0], e.d[2]) * s > 4), lodA: [0, 0, 0] };
  if (it.col){ it.hb = [e.d[0] * s * 0.4, h * 0.46, e.d[2] * s * 0.4]; gridInsert(this.grid, it, it.cen, it.rr + 1); }
  this.items.push(it);
  return it;
};
AS75.placeStep = function(budget){
  if (this.placed) return;
  if (!this.jobs) this.plan();
  const t0 = performance.now(), rnd = this.rnd;
  const rv = () => norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]);
  while (this.jobs.length && performance.now() - t0 < budget){
    const j = this.jobs[0]; j.t = (j.t || 0) + 1;
    if (!j.e) j.e = this.pick(j[0], rnd);
    if (!j.e){ this.jobs.shift(); continue; }
    let dir = null, opt = {};
    if (j[1] === 'far'){
      const ruins = this.items.filter(i => i.e.p === 'ruin');
      if (j[0] === 'wreck' && ruins.length && rnd() < 0.45){ const R0 = ruins[floor(rnd() * ruins.length)]; dir = offsetOnSphere(R0.dir, rv(), R0.r + 14 + rnd() * 40); }
      else dir = rv();
    } else if (j[1] === 'cp'){
      const c = CPD[j[2]]; dir = offsetOnSphere(c, rv(), 15 + rnd() * 17); opt = { cp: true, face: sub(c, dir) };
    } else if (j[1] === 'near'){
      const R0 = j[2]; dir = offsetOnSphere(R0.dir, rv(), R0.r + 3 + rnd() * 9); opt = { face: sub(R0.dir, dir) };
    } else {   // кучка природы: у кратеров или где угодно
      if (!j.c){ let d0; if (rnd() < 0.5 && CRATERS.length){ const c = CRATERS[floor(rnd() * CRATERS.length)]; d0 = offsetOnSphere(norm(c), rv(), c[3] * (0.75 + 0.6 * rnd())); } else d0 = rv(); j.c = { d0, left: 2 + floor(rnd() * 4) }; }
      dir = offsetOnSphere(j.c.d0, rv(), rnd() * 13);
    }
    const it = this.put(j.e, dir, opt);
    if (it && j[0] === 'ruin'){ const nn = 2 + floor(rnd() * 2) - (this.lite() ? 1 : 0); for (let i = 0; i < nn; i++) this.jobs.push(['camp', 'near', it]); }
    if (it && j.c && --j.c.left > 0){ j.e = null; j.t = 0; continue; }
    if (it || j.t > (j[1] === 'cluster' ? 24 : 60)){ this.jobs.shift(); continue; }
    if (j.t % 10 === 0){ j.e = null; if (j.c && j.t % 20 === 0) j.c = null; }
  }
  this.stats.placeMs = (this.stats.placeMs || 0) + performance.now() - t0;
  if (!this.jobs.length){ this.placed = true; this.stats.items = this.items.length; this.colN = this.items.filter(i => i.col).length; }
};
// постройки игроков поверх декора: такой декор прячем (и его коллайдер тоже)
AS75.checkHide = function(){
  if (S.time - (this.hideT || -9) < 0.5) return;
  this.hideT = S.time;
  for (const it of this.items){
    let h = false;
    for (const b of S.buildings) if (b.alive && dist2(b.pos, it.pos) < (it.r + (b.bound || 6) + 1) ** 2){ h = true; break; }
    it.hide = h;
  }
};
// коллайдер-коробка (локальная система модели)
AS75.sdf = function(it, x, y, z){
  const px = x - it.cen[0], py = y - it.cen[1], pz = z - it.cen[2];
  if (px * px + py * py + pz * pz > (it.rr + 0.5) ** 2) return 1e9;
  const X = it.X, Y = it.Y, Z = it.Z, b = it.hb;
  return sdBox3(px * X[0] + py * X[1] + pz * X[2], px * Y[0] + py * Y[1] + pz * Y[2], px * Z[0] + py * Z[1] + pz * Z[2], b[0], b[1], b[2]);
};
{ const m0 = mapJS;
  mapJS = function(x, y, z){
    const d = m0(x, y, z);
    if (!AS75.colOn) return d;
    const L = AS75.grid.get(gkey(x, y, z)); if (!L) return d;
    let e = d;
    for (const it of L){ if (it.hide) continue; const v = AS75.sdf(it, x, y, z); if (v < e) e = v; }
    return e;
  }; }

// ---------------------------------------------------------------- подгрузка по требованию: <script src="assets3d/<ключ>.js"> → PM3D_reg(ключ, base64)
AS75.need = function(key, d){
  if (this.M[key]) return;
  this.M[key] = { st: 1 };
  this.queue.push({ key, d });
};
AS75.pump = function(){
  if (this.queue.length && this.loading < 3){
    this.queue.sort((a, b) => b.d - a.d);
    while (this.queue.length && this.loading < 3){
      const q = this.queue.pop(), s = document.createElement('script');
      this.loading++; this.stats.req++;
      s.async = true; s.src = this.base + q.key + '.js';
      s.onload = () => { this.loading--; s.remove(); };
      s.onerror = () => { this.loading--; s.remove(); this.M[q.key] = { st: 3 }; this.stats.fail++; if (!this.stats.loaded) this.missing++; };
      document.head.appendChild(s);
    }
  }
  // разбор и загрузка в видеокарту — не больше 2 моделей за кадр
  for (let n = 0; n < 2 && this.pend.length; n++){
    const [key, b64] = this.pend.shift();
    try { this.upload(key, b64); } catch (e){ this.M[key] = { st: 3 }; this.stats.fail++; try { console.warn('AS75', key, e); } catch (_){} }
  }
};
AS75.upload = function(key, b64){
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const dv = new DataView(u.buffer);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('не GLB');
  let off = 12, J = null, BIN = null;
  while (off + 8 <= u.length){ const ln = dv.getUint32(off, true), ty = dv.getUint32(off + 4, true), ch = u.subarray(off + 8, off + 8 + ln); if (ty === 0x4E4F534A) J = JSON.parse(new TextDecoder().decode(ch)); else if (ty === 0x004E4942) BIN = ch; off += 8 + ln; }
  const A = J.accessors, V = J.bufferViews;
  const view = i => BIN.subarray(V[i].byteOffset || 0, (V[i].byteOffset || 0) + V[i].byteLength);
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const attr = (loc, ai, n, type) => { const a = A[ai], b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, view(a.bufferView), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, type, true, V[a.bufferView].byteStride || 0, 0); };
  attr(0, 0, 3, gl.UNSIGNED_SHORT); attr(1, 1, 3, gl.BYTE); attr(2, 2, 2, gl.UNSIGNED_SHORT);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, view(A[3].bufferView), gl.STATIC_DRAW);
  gl.bindVertexArray(prevVao);
  const nd = J.nodes[0];
  const m = { st: 1, id: ++this.nid, vao, n: A[3].count, type: A[3].componentType === 5125 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, qo: new Float32Array(nd.translation), qs: new Float32Array(nd.scale), tex: null, kb: u.length / 1024 };
  this.M[key] = m;
  this.stats.kb += m.kb; this.stats.loaded++;
  const im = J.images[0], blob = new Blob([view(im.bufferView)], { type: im.mimeType || 'image/jpeg' });
  const up = src => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE3);
    const prev = gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const an = !this.lite() && gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    gl.bindTexture(gl.TEXTURE_2D, prev);
    gl.activeTexture(gl.TEXTURE0);
    m.tex = t; m.st = 2;
  };
  const bad = () => { m.st = 3; this.stats.fail++; };
  const viaImg = () => { const img = new Image(); img.onload = () => { try { up(img); } catch (e){ bad(); } URL.revokeObjectURL(img.src); }; img.onerror = bad; img.src = URL.createObjectURL(blob); };
  if (typeof createImageBitmap === 'function') createImageBitmap(blob).then(b => { try { up(b); } catch (e){ bad(); } }).catch(viaImg); else viaImg();
};

// ---------------------------------------------------------------- программы
AS75.build = function(){
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs, names) => {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const U = {}; for (const n of names) U[n] = gl.getUniformLocation(p, n); return [p, U];
  };
  [this.P, this.U] = prog(AS75_VS, AS75_FS, ['uM', 'uV', 'uPr', 'uQo', 'uQs', 'uTex', 'uCamW', 'uP', 'uLP', 'uLC', 'uNL', 'uLamp', 'uStorm']);
  [this.sP, this.sU] = prog(AS75_SVS, AS75_SFS, ['uM', 'uV', 'uPr', 'uK']);
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  this.sVao = gl.createVertexArray(); gl.bindVertexArray(this.sVao);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(prevVao);
};
// ---------------------------------------------------------------- отрисовка (после рэймарчера, 3D-бойцов и построек v7.0)
const AS75_UM = new Float32Array(16), AS75_UV = new Float32Array(9);
AS75.draw = function(c, nl){
  if (!this.on() || typeof gl === 'undefined'){ this.colOn = false; return; }
  const t0 = performance.now();
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  gl.activeTexture(gl.TEXTURE3);
  const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D), cull = gl.isEnabled(gl.CULL_FACE);
  gl.activeTexture(gl.TEXTURE0);
  try {
    if (!this.P) this.build();
    this.placeStep(this.placed ? 0 : (this.items.length ? 4 : 10));
    this.colOn = true;
    this.checkHide();
    this.pump();
    const lite = this.lite(), R = c.right, Up = c.up, F = c.fwd;
    const aspect = fboW / fboH, tx = c.fov * 0.5 * aspect, ty = c.fov * 0.5;
    const k0 = lite ? 0.06 : 0.032, k1 = lite ? 0.009 : 0.0042;
    const vis = [];
    const lodN = this.stats.lod; lodN[0] = lodN[1] = lodN[2] = 0;
    for (const it of this.items){
      if (it.hide) continue;
      const cx = it.cen[0] - c.pos[0], cy = it.cen[1] - c.pos[1], cz = it.cen[2] - c.pos[2], r = it.rr;
      const vz = F[0] * cx + F[1] * cy + F[2] * cz;
      if (vz < -r) continue;
      const vx = R[0] * cx + R[1] * cy + R[2] * cz, vy = Up[0] * cx + Up[1] * cy + Up[2] * cz;
      if (Math.abs(vx) > vz * tx + r * 1.5 || Math.abs(vy) > vz * ty + r * 1.5) continue;
      const d = Math.hypot(cx, cy, cz), k = r / Math.max(d, 1);
      if (k < k1 * 0.7) continue;
      if (dot(sub(c.pos, it.cen), it.dir) < -r * 2) continue;   // за горизонтом (как в render.js)
      const L2 = it.key + '_lod1';
      this.need(L2, d);
      if (k < k1) continue;
      let m = null, li = 2;
      if (k > k0){ li = lite ? 1 : 0; const K = it.key + '_' + AS75_LODS[li]; this.need(K, d); m = this.M[K]; if (!m || m.st !== 2){ m = null; li = 2; } }
      if (!m){ m = this.M[L2]; if (!m || m.st !== 2) continue; }
      lodN[li]++;
      vis.push([m, it, d]);
    }
    if (vis.length > 260){ vis.sort((a, b) => a[2] - b[2]); vis.length = 260; }
    vis.sort((a, b) => a[0].id - b[0].id);   // меньше переключений буферов и текстур
    let drawn = 0, tris = 0;
    if (vis.length){
      const U = this.U;
      gl.useProgram(this.P);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      AS75_UV.set([R[0], Up[0], -F[0], R[1], Up[1], -F[1], R[2], Up[2], -F[2]]);
      gl.uniformMatrix3fv(U.uV, false, AS75_UV);
      const fy = 2 / c.fov, fx = fy / aspect, n = 0.05, f = 20000;
      gl.uniform4f(U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
      gl.uniform3fv(U.uCamW, c.pos);
      gl.uniform4fv(U.uLP, LP); gl.uniform4fv(U.uLC, LC); gl.uniform1i(U.uNL, nl || 0);
      gl.uniform1f(U.uLamp, S.mode === 'fps' && !S.attract ? 1 : 0);
      gl.uniform1f(U.uStorm, (S.storm ? S.storm.k : 0) * ((S.mode === 'fps' || S.attract) ? 1 : 0.12));
      gl.uniform1i(U.uTex, 3); gl.activeTexture(gl.TEXTURE3);
      let cur = null;
      for (const [m, it] of vis){
        if (m !== cur){ cur = m; gl.bindVertexArray(m.vao); gl.bindTexture(gl.TEXTURE_2D, m.tex); gl.uniform3fv(U.uQo, m.qo); gl.uniform3fv(U.uQs, m.qs); }
        if (it.sh < 0){ const co = this.colOn; this.colOn = false; try { it.sh = shadowJS(add(it.pos, mul(it.Y, it.h + 0.6))); } catch (e){ it.sh = 1; } this.colOn = co; }
        const s = it.s, X = it.X, Y = it.Y, Z = it.Z;
        AS75_UM.set([X[0] * s, X[1] * s, X[2] * s, 0, Y[0] * s, Y[1] * s, Y[2] * s, 0, Z[0] * s, Z[1] * s, Z[2] * s, 0, it.pos[0] - c.pos[0], it.pos[1] - c.pos[1], it.pos[2] - c.pos[2], 1]);
        gl.uniformMatrix4fv(U.uM, false, AS75_UM);
        gl.uniform4f(U.uP, 0.25 + 0.75 * it.sh, it.e.d[1], 0.15, this.ALB);
        gl.drawElements(gl.TRIANGLES, m.n, m.type, 0);
        drawn++; tris += m.n / 3;
      }
      // контактные тени — ближние модели
      const SU = this.sU;
      gl.useProgram(this.sP); gl.bindVertexArray(this.sVao);
      gl.uniformMatrix3fv(SU.uV, false, AS75_UV);
      gl.uniform4f(SU.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
      gl.enable(gl.BLEND); gl.blendFunc(gl.ZERO, gl.SRC_COLOR); gl.depthMask(false);
      gl.uniform1f(SU.uK, 0.5);
      for (const [m, it, d] of vis){
        if (d > (lite ? 120 : 260)) continue;
        const fr = it.r * 1.25, X = it.X, Y = it.Y, Z = it.Z, p = add(it.pos, mul(Y, 0.06 + (it.e.p === 'ruin' ? 0.35 : 0.04)));
        AS75_UM.set([X[0] * fr, X[1] * fr, X[2] * fr, 0, Y[0], Y[1], Y[2], 0, Z[0] * fr, Z[1] * fr, Z[2] * fr, 0, p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2], 1]);
        gl.uniformMatrix4fv(SU.uM, false, AS75_UM);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.disable(gl.BLEND); gl.depthMask(true);
    }
    this.stats.drawn = drawn; this.stats.tris = tris;
  } catch (e){ this.fail(e); }
  gl.bindVertexArray(prevVao);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, prevTex); gl.activeTexture(gl.TEXTURE0);
  if (cull) gl.enable(gl.CULL_FACE);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
};
AS75.ALB = 1.45;
// для тестов и скриншотов: ближайшие модели к точке
AS75.near = function(p, n, cls){ return this.items.filter(it => !cls || it.e.p === cls).map(it => [dist(it.pos, p), it]).sort((a, b) => a[0] - b[0]).slice(0, n || 5).map(x => x[1]); };
AS75.info = function(){ const s = this.stats; return { on: this.on(), err: this.err, items: this.items.length, placed: this.placed, col: this.colN || 0, drawn: s.drawn, tris: Math.round(s.tris), lod: s.lod.slice(), loaded: s.loaded, kb: Math.round(s.kb), req: s.req, fail: s.fail, ms: +s.ms.toFixed(2), placeMs: Math.round(s.placeMs || 0), byCls: ['nature', 'camp', 'ruin', 'wreck'].map(c => c + ':' + this.items.filter(i => i.e.p === c).length).join(' '), cat: this.cat ? this.cat.items.length : 0 }; };
AS75.init();
// встраивание: рисуем сразу после построек v7.0 (render.js вызывает ST70.draw после 3D-бойцов)
if (typeof ST70 !== 'undefined'){ const d0 = ST70.draw; ST70.draw = function(c, nl){ const r = d0.apply(this, arguments); AS75.draw(c, nl); return r; }; }
// настройки: ПК — «Графика» (рядом с «Лёгким режимом»), телефон — экран графики
{ const lab = ph => ph ? tr('3D-модели окружения', '3D environment models', 'Mô hình 3D môi trường', 'מודלי סביבה בתלת-ממד')
                       : tr('Новые 3D-модели окружения (камни, руины, техника)', 'New 3D environment models (rocks, ruins, wrecks)', 'Mô hình 3D môi trường mới (đá, tàn tích, xác xe)', 'מודלי סביבה חדשים בתלת-ממד (סלעים, חורבות, הריסות)');
  const hs0 = MENU.html_settings;
  MENU.html_settings = function(){ const h = hs0.apply(this, arguments); return h.replace(/(<button class="tog[^"]*" data-tog="lite">[^<]*<\/button><\/div>)/, '$1' + V74.togBtn('as75', lab(false), false)); };
  if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_gfx') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + V74.togBtn('as75', lab(true), true)); return h; }; } }
