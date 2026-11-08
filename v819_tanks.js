// =====================================================================
//  v8.19 (T94) — БОЕВЫЕ ТАНКИ НА МОДЕЛЯХ TRIPO вместо процедурного sdTank в бою
//  «Бульдог» (Консорциум) — колёсный броневик tripo armored_vehicle_1c3ee9b2 (Фитба 5), в Blender добавлена 3-я ось (6 колёс),
//    башня — отдельный меш и поворачивается за прицелом (как башня у sdTank).
//  «Паук» (Рой) — enemy_walker_1154771462 (Фитба 4), ноги шагают в вершинном шейдере (фаза/ход как у sdTank).
//  Ассеты: D:\AI\pm_assets\tripo_pro_1107 → Blender (децимация, AO в текстуру; D:\AI\t94\scripts) → assets3d_pack.pack →
//    assets3d/t94_<имя>_<lod>.glb (LOD0 / LOD0m телефон / LOD1), build.py кладёт их рядом со страницей (dist/assets3d/*.js),
//    грузятся по требованию тем же путём, что и окружение AS75 (?as3d=local — из папки рядом, иначе CDN). Лист приёмки — REPORT_T94.md.
//  SDF-версию живого танка прячет приём HV65 (отрицательный радиус в OBJ — рэймарчер его пропускает в прямом луче,
//    сквозь портал и в тенях остаётся старый вид): обёртки HV65.begin/take/draw, render.js не менялся.
//  Модель не загрузилась / ошибка / выключено — танк остаётся прежним sdTank.
//  Знак техники у стратега и командира: силуэт танка/паука по курсу вместо точки (обёртка r61Dot) и на миникарте (drawRTSMinimap).
//  Выключить всё: ?t94=0 (или localStorage pm_t94 = '0'). Консоль: T94.info(), T94.enable(false|true).
// =====================================================================
const T94 = {
  on: !/[?&]t94=0/.test(location.search) && (() => { try { return localStorage.getItem('pm_t94') !== '0'; } catch (e){ return true; } })(),
  user: true, failed: false, err: '', fr: 0, nid: 0,
  list: [], M: {}, pend: [], req: {}, P: null, U: null,
  stats: { drawn: 0, ms: 0, tris: 0, loaded: 0, kb: 0, req: 0, fail: 0, lods: [0, 0, 0] },
  // модели: части, LOD-дистанции (м), параметры анимации. Башня — в той же системе координат, что корпус; поворот вокруг оси через piv.
  DEF: {
    bulldog: { parts: ['t94_bulldog', 't94_bulldog_tur'], piv: [-0.002, 2.24, -0.106], tint: [0.98, 1.0, 0.86], tk: 0.25 },
    spider: { parts: ['t94_spider'], legs: [2.5, 0.95], tint: [1.0, 1.0, 1.0], tk: 0.0 },   // legs: высота бёдер, радиус корпуса (м)
  },
  D0: 70, D0L: 40,   // ближе — LOD0 (телефон — LOD0m), дальше — LOD1
  ok(){ return this.on && this.user && !this.failed; },
  fail(e){ this.failed = true; this.err = String(e && e.message || e); try { console.warn('T94: танки-меши отключены, остаётся sdTank —', this.err); } catch (_){} },
  safe(fn, tag){ try { return fn(); } catch (e){ this.fail(tag ? tag + ': ' + (e && e.message || e) : e); } },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  is(e){ return !!e && e.cls === 'tank' && !e.vk && e.alive; },   // боевой танк (не «Шакал»/«Град»/«Молот» v6)
  kind(e){ return e.team ? 'spider' : 'bulldog'; },
  // свои модели — из папки assets3d/ рядом со страницей (превью test.*.pages.dev, боевой сайт, localhost, file://);
  //   на других хостах (itch) — как окружение AS75 (CDN боевого сайта)
  base(){ const h = location.hostname; return (location.protocol === 'file:' || /[?&]as3d=local/.test(location.search) || /(^|\.)pages\.dev$|^(127\.0\.0\.1|localhost)$/.test(h)) ? 'assets3d/' : ((typeof AS75 !== 'undefined' && AS75.base) || 'assets3d/'); },
  enable(v){ this.user = v !== false; return this.ok(); },
};

// ---------------------------------------------------------------- шейдер: текстурированный меш (по мотивам AS75/HV65) + шаг ног Паука
const T94_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aT;
uniform mat4 uM; uniform mat3 uV; uniform vec4 uPr; uniform vec3 uQo, uQs;
uniform vec4 uAn;     // ноги: x фаза, y ход 0..1, z высота бёдер, w радиус корпуса (w = 0 — без анимации)
out vec3 vW; out vec3 vN; out vec2 vT; out float vZ; out float vH;
void main(){
  vec3 lp = uQo + aP * uQs;
  if (uAn.w > 0.0){
    float hr = length(lp.xz);
    float w = smoothstep(uAn.w, uAn.w + 0.9, hr) * clamp(1.0 - lp.y / uAn.z, 0.0, 1.0);
    if (w > 0.0){
      float s = lp.x < 0.0 ? 0.0 : 1.0;
      float idx = lp.z > abs(lp.x) * 0.4 ? 2.0 : (lp.z < -abs(lp.x) * 0.4 ? 0.0 : 1.0);
      float ph = uAn.x * 1.4 + mod(idx + s, 2.0) * 3.14159;   // как у sdTank: ноги через одну
      lp.y += max(0.0, cos(ph)) * 0.42 * uAn.y * w;
      lp.z += sin(ph) * 0.38 * uAn.y * w;
    }
  }
  vH = lp.y;
  vec4 wp = uM * vec4(lp, 1.0);
  vW = wp.xyz; vN = mat3(uM) * aN; vT = aT;
  vec3 v = uV * wp.xyz; vZ = -v.z;
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
const T94_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uCamW, uTint;
uniform vec4 uP;      // x тень солнца, y вспышка попадания, z доля тонировки фракции, w яркость текстуры
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
  alb = mix(alb, alb * uTint, uP.z);                                     // тон фракции поверх текстуры Tripo
  alb = mix(alb, vec3(1.0, 0.62, 0.35), uP.y * 0.55);                    // вспышка попадания
  float ao = mix(0.55, 1.0, smoothstep(0.0, 0.6, vH));                   // у земли темнее — машина «сидит» на грунте
  float sp = 0.25;
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
  col += vec3(0.30, 0.48, 0.62) * 0.11 * rim * ao;
  col *= mix(0.82, 1.0, ao);
  col += vec3(1.0, 0.5, 0.2) * uP.y * 0.8;                               // раскалённый край при попадании
  col = mix(fogCol(-vd), col, exp(-cd * (0.0011 + 0.016 * uStorm)));
  frag = vec4(col, 1.0);
  gl_FragDepth = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0);
}`;

// ---------------------------------------------------------------- загрузка: <base>t94_<часть>_<lod>.js → PM3D_reg(ключ, base64 GLB)
T94.need = function(key){
  if (this.M[key] || this.req[key]) return;
  this.req[key] = 1; this.stats.req++;
  const s = document.createElement('script');
  s.async = true; s.src = this.base() + key + '.js';
  s.onload = () => s.remove();
  s.onerror = () => { s.remove(); this.M[key] = { st: 3 }; this.stats.fail++; };
  document.head.appendChild(s);
};
T94.pump = function(){
  for (let n = 0; n < 2 && this.pend.length; n++){
    const [key, b64] = this.pend.shift();
    this.safe(() => this.upload(key, b64), 'upload ' + key);
  }
};
// GLB из assets3d_pack.py: позиции uint16 (разжатие — translation/scale узла), нормали int8, UV uint16, индексы, одна JPEG-текстура
T94.upload = function(key, b64){
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const dv = new DataView(u.buffer);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('не GLB');
  let off = 12, J = null, BIN = null;
  while (off + 8 <= u.length){ const ln = dv.getUint32(off, true), ty = dv.getUint32(off + 4, true), ch = u.subarray(off + 8, off + 8 + ln); if (ty === 0x4E4F534A) J = JSON.parse(new TextDecoder().decode(ch)); else if (ty === 0x004E4942) BIN = ch; off += 8 + ln; }
  const A = J.accessors, V = J.bufferViews, at = J.meshes[0].primitives[0].attributes, ix = J.meshes[0].primitives[0].indices;
  const view = i => BIN.subarray(V[i].byteOffset || 0, (V[i].byteOffset || 0) + V[i].byteLength);
  const GT = { 5120: gl.BYTE, 5121: gl.UNSIGNED_BYTE, 5122: gl.SHORT, 5123: gl.UNSIGNED_SHORT, 5126: gl.FLOAT };
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const attr = (loc, ai, n) => { const a = A[ai], b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, view(a.bufferView), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, GT[a.componentType], a.componentType !== 5126, V[a.bufferView].byteStride || 0, a.byteOffset || 0); };
  attr(0, at.POSITION, 3); attr(1, at.NORMAL, 3); attr(2, at.TEXCOORD_0, 2);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, view(A[ix].bufferView), gl.STATIC_DRAW);
  gl.bindVertexArray(prevVao);
  const nd = J.nodes[0];
  const m = { st: 1, vao, n: A[ix].count, type: A[ix].componentType === 5125 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
              qo: new Float32Array(nd.translation || [0, 0, 0]), qs: new Float32Array(nd.scale || [1, 1, 1]), tex: null, kb: u.length / 1024 };
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
// перехват PM3D_reg: свои ключи (t94_*) — себе, остальные — окружению AS75 (как было)
if (T94.on){
  const reg0 = window.PM3D_reg;
  window.PM3D_reg = (k, b) => { if (String(k).indexOf('t94_') === 0) T94.pend.push([k, b]); else if (reg0) reg0(k, b); };
}

// ---------------------------------------------------------------- программа
T94.build = function(){
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, T94_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, T94_FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const U = {}; for (const n of ['uM', 'uV', 'uPr', 'uQo', 'uQs', 'uAn', 'uTex', 'uCamW', 'uTint', 'uP', 'uLP', 'uLC', 'uNL', 'uLamp', 'uStorm']) U[n] = gl.getUniformLocation(p, n);
  this.P = p; this.U = U;
};

// ---------------------------------------------------------------- кадр: решить, кто из танков рисуется мешом (SDF у него молчит)
T94.frame = function(){ this.list.length = 0; this.fr++; if (this.on && !this.failed) this.pump(); };
// LOD для дистанции: 0 — LOD0, 1 — LOD0m (телефон), 2 — LOD1; если нужного ещё нет — любой готовый (без скачка «исчез»)
T94.lodKey = ['_lod0', '_lod0m', '_lod1'];
T94.pick = function(kind, d){
  const lite = this.lite(), parts = this.DEF[kind].parts;
  const want = d < (lite ? this.D0L : this.D0) ? (lite ? 1 : 0) : 2;
  for (const p of parts) this.need(p + this.lodKey[want]);
  const ready = l => parts.every(p => { const m = this.M[p + this.lodKey[l]]; return m && m.st === 2; });
  if (ready(want)) return want;
  for (const l of (want === 2 ? [lite ? 1 : 0, lite ? 0 : 1] : [2, want === 0 ? 1 : 0])) if (ready(l)) return l;
  if (want !== 2) for (const p of parts) this.need(p + '_lod1');   // пока грузится ближний — подтянуть дальний
  return -1;
};
T94.take = function(e, o, hideMe){
  if (!this.ok() || hideMe || !this.is(e)) return false;
  const lod = this.pick(this.kind(e), o.d);
  if (lod < 0) return false;   // модель ещё не готова — танк остаётся sdTank
  o.t94lod = lod;
  this.list.push(o);
  return true;
};

const T94_UM = new Float32Array(16), T94_UT = new Float32Array(16), T94_UV = new Float32Array(9);
T94.ALB = 1.35;
T94.draw = function(c, nl){
  if (!this.list.length || !this.ok()) return;
  const t0 = performance.now();
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING), prevProg = gl.getParameter(gl.CURRENT_PROGRAM);
  gl.activeTexture(gl.TEXTURE3);
  const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D), cull = gl.isEnabled(gl.CULL_FACE), blend = gl.isEnabled(gl.BLEND);
  this.safe(() => {
    if (!this.P) this.build();
    const U = this.U;
    gl.useProgram(this.P);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    const R = c.right, Up = c.up, F = c.fwd;
    T94_UV.set([R[0], Up[0], -F[0], R[1], Up[1], -F[1], R[2], Up[2], -F[2]]);
    gl.uniformMatrix3fv(U.uV, false, T94_UV);
    const aspect = fboW / fboH, fy = 2 / c.fov, fx = fy / aspect, n = 0.05, f = 20000;
    gl.uniform4f(U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
    gl.uniform3fv(U.uCamW, c.pos);
    gl.uniform4fv(U.uLP, LP); gl.uniform4fv(U.uLC, LC); gl.uniform1i(U.uNL, nl || 0);
    gl.uniform1f(U.uLamp, S.mode === 'fps' && !S.attract ? 1 : 0);
    gl.uniform1f(U.uStorm, (S.storm ? S.storm.k : 0) * ((S.mode === 'fps' || S.attract) ? 1 : 0.12));
    gl.uniform1i(U.uTex, 3); gl.activeTexture(gl.TEXTURE3);
    const tx = c.fov * 0.5 * aspect, ty = c.fov * 0.5;
    let drawn = 0, tris = 0;
    const lodN = this.stats.lods; lodN[0] = lodN[1] = lodN[2] = 0;
    for (const o of this.list){
      const e = o.e, kind = this.kind(e), D = this.DEF[kind], lk = this.lodKey[o.t94lod];
      // отсечение по кадру (сфера объекта)
      const cx = o.bc[0] - c.pos[0], cy = o.bc[1] - c.pos[1], cz = o.bc[2] - c.pos[2], r = o.br + 1;
      const vx = R[0] * cx + R[1] * cy + R[2] * cz, vy = Up[0] * cx + Up[1] * cy + Up[2] * cz, vz = F[0] * cx + F[1] * cy + F[2] * cz;
      if (vz < -r || Math.abs(vx) > vz * tx + r || Math.abs(vy) > vz * ty + r) continue;
      if (!e.t94sh || S.time - (e.t94shAt || -9) > 0.4){ e.t94shAt = S.time + Math.random() * 0.1; e.t94sh = shadowJS(add(o.origin, mul(e.up, 1.4))); }
      // модель: X = Up × F (правая тройка), Y = нормаль поверхности, Z = вперёд; низ модели на o.origin (грунт)
      const eu = e.kdUp || e.up, fw = tangent(e.fwd, eu), xs = cross(eu, fw);
      const ox = o.origin[0] - c.pos[0], oy = o.origin[1] - c.pos[1], oz = o.origin[2] - c.pos[2];
      T94_UM.set([xs[0], xs[1], xs[2], 0, eu[0], eu[1], eu[2], 0, fw[0], fw[1], fw[2], 0, ox, oy, oz, 1]);
      gl.uniform3fv(U.uTint, D.tint);
      gl.uniform4f(U.uP, 0.25 + 0.75 * (e.t94sh === undefined ? 1 : e.t94sh), e.flash || 0, D.tk, this.ALB);
      if (D.legs) gl.uniform4f(U.uAn, e.phase || 0, clamp(e.moveAmt || 0, 0, 1), D.legs[0], D.legs[1]); else gl.uniform4f(U.uAn, 0, 0, 1, 0);
      for (let pi = 0; pi < D.parts.length; pi++){
        const m = this.M[D.parts[pi] + lk];
        if (!m || m.st !== 2) continue;
        if (pi === 1 && D.piv){
          // башня: поворот вокруг вертикали через piv за прицелом (как gYaw у sdTank: прицел в системе корпуса)
          const aim = e.aim || fw, lx = dot(aim, xs), lz = dot(aim, fw);
          const a = Math.atan2(lx, lz), ca = Math.cos(a), sa = Math.sin(a), pv = D.piv;
          // T(piv)·Ry(a)·T(-piv) в системе модели, затем матрица корпуса
          const tx0 = pv[0] - (ca * pv[0] + sa * pv[2]), tz0 = pv[2] - (-sa * pv[0] + ca * pv[2]);
          const c0 = [ca, 0, -sa], c2 = [sa, 0, ca];
          const col = v => [xs[0] * v[0] + eu[0] * v[1] + fw[0] * v[2], xs[1] * v[0] + eu[1] * v[1] + fw[1] * v[2], xs[2] * v[0] + eu[2] * v[1] + fw[2] * v[2]];
          const X = col(c0), Z = col(c2), T = col([tx0, 0, tz0]);
          T94_UT.set([X[0], X[1], X[2], 0, eu[0], eu[1], eu[2], 0, Z[0], Z[1], Z[2], 0, ox + T[0], oy + T[1], oz + T[2], 1]);
          gl.uniformMatrix4fv(U.uM, false, T94_UT);
        } else gl.uniformMatrix4fv(U.uM, false, T94_UM);
        gl.uniform3fv(U.uQo, m.qo); gl.uniform3fv(U.uQs, m.qs);
        gl.bindVertexArray(m.vao); gl.bindTexture(gl.TEXTURE_2D, m.tex);
        gl.drawElements(gl.TRIANGLES, m.n, m.type, 0);
        tris += m.n / 3;
      }
      drawn++; lodN[o.t94lod]++;
    }
    this.stats.drawn = drawn; this.stats.tris = tris;
  }, 'draw');
  gl.bindVertexArray(prevVao);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, prevTex); gl.activeTexture(gl.TEXTURE0);
  if (cull) gl.enable(gl.CULL_FACE); if (blend) gl.enable(gl.BLEND);
  if (prevProg) gl.useProgram(prevProg);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
};

// ---------------------------------------------------------------- знак техники: силуэт по курсу (x — вперёд), s — масштаб в пикселях
T94.glyph = function(x, y, ang, team, col, s){
  octx.save(); octx.translate(x, y); octx.rotate(ang); octx.scale(s, s);
  octx.lineJoin = 'round';
  const body = () => {
    octx.beginPath();
    if (!team){
      // «Бульдог»: корпус, 3 пары колёс по бокам, башня и длинный ствол вперёд
      octx.rect(-5, -2.6, 9.4, 5.2);
      for (const k of [-3.6, -0.4, 2.8]){ octx.rect(k - 1, -4, 2, 1.4); octx.rect(k - 1, 2.6, 2, 1.4); }
      octx.rect(-2.6, -1.7, 3.6, 3.4); octx.rect(1, -0.55, 7.6, 1.1);
    } else {
      // «Паук»: корпус-капля, глаз вперёд, 6 ног
      octx.ellipse(0.4, 0, 4.4, 2.9, 0, 0, Math.PI * 2);
    }
  };
  // тёмная обводка — читается на любом грунте
  octx.fillStyle = 'rgba(0,0,0,.7)'; octx.strokeStyle = 'rgba(0,0,0,.7)'; octx.lineWidth = 2.6 / s * 1.4;
  body(); octx.fill(); octx.stroke();
  if (team){ octx.beginPath(); for (const k of [-1, 0, 1]) for (const sd of [-1, 1]){ octx.moveTo(k * 2.2, sd * 2); octx.lineTo(k * 3.6 - 0.6, sd * 5.6); } octx.stroke(); }
  octx.fillStyle = col; octx.strokeStyle = col; octx.lineWidth = 1.3;
  body(); octx.fill();
  if (team){
    octx.beginPath(); for (const k of [-1, 0, 1]) for (const sd of [-1, 1]){ octx.moveTo(k * 2.2, sd * 2); octx.lineTo(k * 3.6 - 0.6, sd * 5.6); } octx.stroke();
    octx.fillStyle = '#ff3b30'; octx.beginPath(); octx.arc(3.6, 0, 1.1, 0, Math.PI * 2); octx.fill();
  } else { octx.fillStyle = 'rgba(0,0,0,.35)'; octx.fillRect(-2.6, -1.7, 3.6, 3.4); }
  octx.restore();
};
// курс на экране: проекция точки «вперёд на 5 м»
T94.ang2 = function(v, proj){
  const a = proj(v.pos), b = proj(add(v.pos, mul(tangent(v.fwd, v.up || norm(v.pos)), 5)));
  if (!a || !b) return 0;
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};
// стратег/командир: высоко камера рисует точки (r61Dot) — у танка вместо точки силуэт
T94.dot = function(u, s, col){
  const a = smoothstep(55, 110, S.rts.h);
  octx.globalAlpha = 0.6 + 0.4 * a;
  this.glyph(s[0], s[1], this.ang2(u, project), u.team, col, 1.05);
  octx.globalAlpha = 1;
};
// миникарта: силуэты поверх точек
T94.mark = function(){
  const s = clamp((MM.R || 62) / 62, 0.75, 1.2) * 0.62;
  const mp = p => { const m = mmProject(p); return m; };
  for (const v of S.vehicles){
    if (!this.is(v)) continue;
    if (v.team === 1 && SET.fog && !((v.seen || [0])[0] > 0)) continue;   // туман: чужих не видно (как точки в rts.js)
    const m = mmProject(v.pos), b = mmProject(add(v.pos, mul(tangent(v.fwd, v.up || norm(v.pos)), 8)));
    const ang = m[2] === b[2] ? Math.atan2(b[1] - m[1], b[0] - m[0]) : 0;
    const g = typeof groupOf === 'function' ? groupOf(v) : null;
    const sel = v.team === 0 && S.sel && (S.sel.has(v) || (g && S.sel.has(g)));
    this.glyph(m[0], m[1], ang, v.team, sel ? '#fff' : TEAM[v.team].css, s);
  }
};

// ---------------------------------------------------------------- встраивание (только обёртки, старые файлы не тронуты)
if (T94.on){
  if (typeof HV65 !== 'undefined'){
    let hvOn = false;   // свой ответ HV65.begin: если 3D-боец не готов, его take не зовём (иначе боец пропал бы)
    const hb = HV65.begin;   // v819: T94 решает вслед за HV65, кто рисуется мешом (радиус в OBJ уходит в минус — SDF молчит)
    HV65.begin = function(fp){ hvOn = !!hb.apply(this, arguments); T94.safe(() => T94.frame(), 'frame'); return hvOn || T94.ok(); };
    const ht = HV65.take;
    HV65.take = function(e, o, hideMe){ if (hvOn && ht.apply(this, arguments)) return true; return !!T94.safe(() => T94.take(e, o, hideMe), 'take'); };
    const hd = HV65.draw;   // v819: меши танков — сразу после тяжёлых бойцов (тот же HDR-буфер и тест глубины)
    HV65.draw = function(c, nl, np){ const r = hd.apply(this, arguments); T94.safe(() => T94.draw(c, nl), 'draw'); return r; };
  }
  if (typeof r61Dot === 'function'){   // v819: стратег/командир — у танка силуэт вместо точки
    const rd0 = r61Dot;
    r61Dot = function(u, s, col){ if (S.rts.h >= 55 && T94.is(u) && !T94.failed){ let ok = false; T94.safe(() => { T94.dot(u, s, col); ok = true; }, 'dot'); if (ok) return; } return rd0.apply(this, arguments); };
  }
  if (typeof drawRTSMinimap === 'function'){   // v819: силуэт танка на миникарте стратега/командира поверх точек
    const dm0 = drawRTSMinimap;
    drawRTSMinimap = function(){ const r = dm0.apply(this, arguments); if (!T94.failed) T94.safe(() => { octx.save(); T94.mark(); octx.restore(); }, 'mark'); return r; };
  }
}
T94.info = function(){ const s = this.stats; return { on: this.on, user: this.user, failed: this.failed, err: this.err, drawn: s.drawn, cand: this.list.length, tris: Math.round(s.tris), lods: s.lods.slice(), loaded: s.loaded, kb: Math.round(s.kb), req: s.req, fail: s.fail, ms: +s.ms.toFixed(3), base: this.base(), keys: Object.keys(this.M).filter(k => this.M[k].st === 2) }; };
