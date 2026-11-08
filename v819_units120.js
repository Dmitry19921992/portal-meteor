// =====================================================================
//  v8.19 (T120) — ЮНИТЫ КОНСОРЦИУМА НА МОДЕЛЯХ TRIPO вместо процедурных (SDF), оценки Дмитрия 4–5 (Фитба 07.11 10:23–10:26)
//  Кто чем рисуется (только фракция Консорциум — FI76(team) === 0; Рой остаётся прежним):
//    штурмовик            — jetpack_trooper_858210208 (Фитба 4)     t120_jet
//    штурмовик десанта    — machinegunner_845503518  (Фитба 5)      t120_mg     (элитный отряд «Десант»)
//    гранатомётчик        — flamer_467385211         (Фитба 5)      t120_flamer
//    медик-инженер        — engineer_674863164       (Фитба 5)      t120_eng
//    разведчик            — spy_saboteur_1124653858  (Фитба 5)      t120_spy
//    строитель (дрон)     — robodog_1608362429       (Фитба 5)      t120_dog
//    РСЗО «Град»          — mech_1572162971          (Фитба 5)      t120_mechg
//    миномёт «Молот»      — mech_497112148           (Фитба 5)      t120_mechm
//  Пулемётчик остаётся скелетной моделью HV65, снайпер и робо-ниндзя — прежние (под них отдельные модели Tripo).
//  Ассеты: D:\AI\pm_assets\tripo_pro_1107 → Blender (децимация, AO в текстуру; D:\AI\t120\scripts) → упаковщик assets3d_pack →
//    assets3d/t120_<ключ>_<lod>.glb (LOD0 / LOD0m телефон / LOD1), build.py кладёт их рядом со страницей (dist/assets3d/*.js),
//    грузятся по требованию тем же путём, что окружение AS75. Лист приёмки — REPORT_T120.md / D:\AI\t120\ACCEPT_T120.md.
//  Скелета у моделей Tripo нет — шаг делает вершинный шейдер: ноги ниже таза качаются вокруг бедра (голень — вокруг колена),
//    у пса — четыре ноги рысью, корпус выше таза поворачивается за прицелом, в полёте на ранце ноги поджаты.
//  SDF-версию прячет приём HV65 (отрицательный радиус в OBJ — рэймарчер пропускает объект в прямом луче; тень и вид
//    сквозь портал остаются прежними), только обёртки HV65.begin/take/draw — render.js не менялся.
//  Модель не загрузилась / ошибка / выключено — юнит остаётся прежним (SDF).
//  Выключить всё: ?t120=0 (или localStorage pm_t120 = '0'). Консоль: T120.info(), T120.enable(false|true).
// =====================================================================
const T120 = {
  on: !/[?&]t120=0/.test(location.search) && (() => { try { return localStorage.getItem('pm_t120') !== '0'; } catch (e){ return true; } })(),
  user: true, failed: false, err: '', fr: 0,
  list: [], M: {}, pend: [], req: {}, P: null, U: null, st: new WeakMap(),
  stats: { drawn: 0, ms: 0, tris: 0, loaded: 0, kb: 0, req: 0, fail: 0, lods: [0, 0, 0], kinds: {} },
  MAXN: 90,   // больше мешей за кадр не рисуем — дальние остаются SDF (телефон — LITE.MAXN)
  // модели: a — тип анимации (1 двуногий, 2 четвероногий), d0/d0l — до какой дистанции LOD0 (ПК / телефон),
  //   g: двуногий [таз, колено, |x| границы ноги, плечи]; q: пёс [бёдра, z передних, z задних, низ корпуса];
  //   amp: [мах бедра, сгиб колена, мах рук, поворот корпуса за прицелом], k — шагов на метр, tint — тон фракции, tk — его доля
  DEF: {
    jet:    { a: 1, d0: 26, d0l: 14, g: [0.86, 0.47, 0.035, 1.38], amp: [0.5, 0.8, 0.0, 0.9], k: 3.9 },
    mg:     { a: 1, d0: 26, d0l: 14, g: [0.88, 0.48, 0.035, 1.42], amp: [0.5, 0.8, 0.0, 0.9], k: 3.9 },
    flamer: { a: 1, d0: 26, d0l: 14, g: [0.86, 0.46, 0.06, 1.42], amp: [0.42, 0.7, 0.0, 0.8], k: 3.6 },
    eng:    { a: 1, d0: 26, d0l: 14, g: [0.85, 0.46, 0.035, 1.36], amp: [0.5, 0.8, 0.25, 0.8], k: 3.9 },
    spy:    { a: 1, d0: 26, d0l: 14, g: [0.88, 0.48, 0.035, 1.42], amp: [0.55, 0.85, 0.3, 0.8], k: 3.9 },
    dog:    { a: 2, d0: 30, d0l: 16, q: [0.62, 0.45, -0.42, 0.55], amp: [0.45, 0.5, 0.0, 0.0], k: 3.2 },
    mechg:  { a: 1, d0: 70, d0l: 40, g: [2.0, 1.05, 0.12, 3.2], amp: [0.32, 0.55, 0.0, 1.0], k: 1.1 },
    mechm:  { a: 1, d0: 70, d0l: 40, g: [1.9, 1.0, 0.12, 3.0], amp: [0.32, 0.55, 0.0, 1.0], k: 1.1 },
  },
  ROLE: { assault: 'jet', rocket: 'flamer', medic: 'eng', scout: 'spy' },
  ok(){ return this.on && this.user && !this.failed; },
  fail(e){ this.failed = true; this.err = String(e && e.message || e); try { console.warn('T120: юниты-меши отключены, остаются прежние —', this.err); } catch (_){} },
  safe(fn, tag){ try { return fn(); } catch (e){ this.fail(tag ? tag + ': ' + (e && e.message || e) : e); } },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  fac(e){ return typeof FI76 === 'function' ? FI76(e.team) : e.team; },
  // какой моделью рисовать сущность (null — не нашей)
  kind(e){
    if (!e || !e.alive || this.fac(e) !== 0) return null;
    if (e.cls === 'inf'){ if (e.role === 'assault') return e.elite ? 'mg' : 'jet'; return this.ROLE[e.role] || null; }
    if (e.cls === 'builder') return 'dog';
    if (e.cls === 'tank'){ if (e.vk === 'mlrs') return 'mechg'; if (e.vk === 'cat') return 'mechm'; }
    return null;
  },
  // свои модели — из папки assets3d/ рядом со страницей (превью test.*.pages.dev, боевой сайт, localhost, file://);
  //   на других хостах (itch) — как окружение AS75 (CDN боевого сайта)
  base(){ const h = location.hostname; return (location.protocol === 'file:' || /[?&]as3d=local/.test(location.search) || /(^|\.)pages\.dev$|^(127\.0\.0\.1|localhost)$/.test(h)) ? 'assets3d/' : ((typeof AS75 !== 'undefined' && AS75.base) || 'assets3d/'); },
  enable(v){ this.user = v !== false; return this.ok(); },
};

// ---------------------------------------------------------------- шейдер: текстурированный меш (как T94/AS75) + шаг ног / поворот корпуса
const T120_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aT;
uniform mat4 uM; uniform mat3 uV; uniform vec4 uPr; uniform vec3 uQo, uQs;
uniform vec4 uA;    // x тип (1 двуногий, 2 пёс), y фаза шага, z ход 0..1, w в полёте 0..1
uniform vec4 uG;    // двуногий: таз, колено, |x| границы ноги, плечи;  пёс: бёдра, z передних, z задних, низ корпуса
uniform vec4 uAmp;  // мах бедра, сгиб колена, мах рук, поворот корпуса (рад, уже со знаком)
out vec3 vW; out vec3 vN; out vec2 vT; out float vZ; out float vH;
vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(v.x * c - v.y * s, v.x * s + v.y * c); }
void main(){
  vec3 lp = uQo + aP * uQs, ln = aN;
  if (uA.x > 1.5){
    // пёс: четыре ноги ниже корпуса, рысь (диагональные пары вместе)
    float w = smoothstep(uG.w + 0.03, uG.w - 0.12, lp.y);
    if (w > 0.0){
      float front = lp.z > (uG.y + uG.z) * 0.5 ? 1.0 : 0.0, sd = lp.x < 0.0 ? 0.0 : 1.0;
      float ph = uA.y + mod(front + sd, 2.0) * 3.14159;
      float a = sin(ph) * uAmp.x * uA.z * w;
      vec2 pv = vec2(uG.x, front > 0.5 ? uG.y : uG.z);
      vec2 yz = rot(lp.yz - pv, -a); lp.yz = pv + yz; ln.yz = rot(ln.yz, -a);
      lp.y += max(0.0, cos(ph)) * 0.06 * uA.z * w;
    }
    lp.y += abs(sin(uA.y)) * 0.025 * uA.z;
  } else if (uA.x > 0.5){
    float hip = uG.x, knee = uG.y, H = uG.w;
    // ноги: ниже таза, по бокам от середины; бедро вокруг таза, голень ещё и вокруг колена (как sdInf: a1 / a2)
    float w = smoothstep(hip + 0.04 * H, hip - 0.07 * H, lp.y) * smoothstep(uG.z * 0.3, uG.z, abs(lp.x));
    if (w > 0.0){
      float sd = lp.x < 0.0 ? 0.0 : 1.0;
      float ph = uA.y + sd * 3.14159;
      float a1 = sin(ph) * uAmp.x * uA.z;
      float a2 = -(0.12 + max(0.0, cos(ph))) * uAmp.y * uA.z;
      a1 = mix(a1, 0.35, uA.w); a2 = mix(a2, -0.7, uA.w);           // в полёте на ранце — ноги поджаты
      float wk = smoothstep(knee + 0.05 * H, knee - 0.05 * H, lp.y);
      vec2 pk = vec2(knee, 0.0);
      if (wk > 0.0){ lp.yz = pk + rot(lp.yz - pk, -a2 * wk * w); ln.yz = rot(ln.yz, -a2 * wk * w); }
      vec2 ph0 = vec2(hip, 0.0);
      lp.yz = ph0 + rot(lp.yz - ph0, -a1 * w); ln.yz = rot(ln.yz, -a1 * w);
    }
    // корпус выше таза: лёгкое покачивание и поворот за прицелом (вокруг вертикали)
    float wu = smoothstep(hip - 0.02 * H, hip + 0.18 * H, lp.y);
    if (wu > 0.0 && abs(uAmp.w) > 0.001){ lp.xz = rot(lp.xz, uAmp.w * wu); ln.xz = rot(ln.xz, uAmp.w * wu); }
    // руки без оружия: мах навстречу ногам (выше таза, снаружи от плеч)
    if (uAmp.z > 0.0){
      float wa = smoothstep(uG.z * 3.0, uG.z * 4.5, abs(lp.x)) * step(hip, lp.y) * smoothstep(H + 0.05, H - 0.1, lp.y);
      float aa = -sin(uA.y + (lp.x < 0.0 ? 0.0 : 3.14159)) * uAmp.z * uA.z * wa;
      vec2 ps = vec2(H, 0.0); lp.yz = ps + rot(lp.yz - ps, -aa); ln.yz = rot(ln.yz, -aa);
    }
    lp.y += (abs(cos(uA.y)) - 0.5) * 0.03 * H * uA.z * (1.0 - uA.w);
  }
  vH = lp.y;
  vec4 wp = uM * vec4(lp, 1.0);
  vW = wp.xyz; vN = mat3(uM) * ln; vT = aT;
  vec3 v = uV * wp.xyz; vZ = -v.z;
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
const T120_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uCamW;
uniform vec4 uP;      // x тень солнца, y вспышка попадания, z высота модели (для AO у земли), w яркость текстуры
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
  alb = mix(alb, vec3(1.0, 0.62, 0.35), uP.y * 0.55);                    // вспышка попадания
  float ao = mix(0.6, 1.0, smoothstep(0.0, 0.25 * uP.z, vH));            // у земли темнее — стоит на грунте
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
  col += vec3(1.0, 0.5, 0.2) * uP.y * 0.8;
  col = mix(fogCol(-vd), col, exp(-cd * (0.0011 + 0.016 * uStorm)));
  frag = vec4(col, 1.0);
  gl_FragDepth = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0);
}`;

// ---------------------------------------------------------------- загрузка: <base>t120_<ключ>_<lod>.js → PM3D_reg(ключ, base64 GLB)
T120.need = function(key){
  if (this.M[key] || this.req[key]) return;
  this.req[key] = 1; this.stats.req++;
  const s = document.createElement('script');
  s.async = true; s.src = this.base() + key + '.js';
  s.onload = () => s.remove();
  s.onerror = () => { s.remove(); this.M[key] = { st: 3 }; this.stats.fail++; };
  document.head.appendChild(s);
};
T120.pump = function(){
  for (let n = 0; n < 2 && this.pend.length; n++){
    const [key, b64] = this.pend.shift();
    this.safe(() => this.upload(key, b64), 'upload ' + key);
  }
};
// GLB из assets3d_pack.py: позиции uint16 (разжатие — translation/scale узла), нормали int8, UV uint16, индексы, одна JPEG-текстура
T120.upload = function(key, b64){
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
  m.h = m.qo[1] + m.qs[1];
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
// перехват PM3D_reg: свои ключи (t120_*) — себе, остальные — дальше по цепочке (T94 / окружение AS75), как было
if (T120.on){
  const reg0 = window.PM3D_reg;
  window.PM3D_reg = (k, b) => { if (String(k).indexOf('t120_') === 0) T120.pend.push([k, b]); else if (reg0) reg0(k, b); };
}

// ---------------------------------------------------------------- программа
T120.build = function(){
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, T120_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, T120_FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const U = {}; for (const n of ['uM', 'uV', 'uPr', 'uQo', 'uQs', 'uA', 'uG', 'uAmp', 'uTex', 'uCamW', 'uP', 'uLP', 'uLC', 'uNL', 'uLamp', 'uStorm']) U[n] = gl.getUniformLocation(p, n);
  this.P = p; this.U = U;
};

// ---------------------------------------------------------------- кадр: кто из юнитов рисуется мешом (SDF у него молчит)
T120.frame = function(){ this.list.length = 0; this.fr++; if (this.on && !this.failed) this.pump(); };
T120.lodKey = ['_lod0', '_lod0m', '_lod1'];
// LOD для дистанции: 0 — LOD0, 1 — LOD0m (телефон), 2 — LOD1; если нужного ещё нет — любой готовый (без скачка «исчез»)
T120.pick = function(kind, d){
  const lite = this.lite(), D = this.DEF[kind], p = 't120_' + kind;
  const want = d < (lite ? D.d0l : D.d0) ? (lite ? 1 : 0) : 2;
  this.need(p + this.lodKey[want]);
  const ready = l => { const m = this.M[p + this.lodKey[l]]; return m && m.st === 2; };
  if (ready(want)) return want;
  for (const l of (want === 2 ? [lite ? 1 : 0, lite ? 0 : 1] : [2, want === 0 ? 1 : 0])) if (ready(l)) return l;
  if (want !== 2) this.need(p + '_lod1');   // пока грузится ближний — подтянуть дальний
  return -1;
};
T120.take = function(e, o, hideMe){
  if (!this.ok() || hideMe) return false;
  const kind = this.kind(e);
  if (!kind || this.list.length >= (this.lite() ? 40 : this.MAXN)) return false;
  const lod = this.pick(kind, o.d);
  if (lod < 0) return false;   // модель ещё не готова — юнит остаётся SDF
  o.t120k = kind; o.t120lod = lod;
  this.list.push(o);
  return true;
};
// своя фаза шага по пройденному пути (у строителей и техники e.phase нет / другая), сглаженный ход и поворот корпуса
T120.anim = function(e, D){
  let s = this.st.get(e);
  if (!s){ s = { p: e.pos.slice(), t: S.time, ph: Math.random() * 6, mv: 0, air: 0, yaw: 0, sh: 1, shAt: -9 }; this.st.set(e, s); }
  const dt = clamp(S.time - s.t, 0, 0.25);
  if (dt > 0){
    const up = e.up || norm(e.pos), dp = sub(e.pos, s.p), v = len(sub(dp, mul(up, dot(dp, up)))) / dt;
    const air = e.cls === 'inf' && !e.grounded && (e.airT || 0) > 0.25 ? 1 : 0;
    const vv = v > 25 ? 0 : v;   // телепорт / портал — не шаг
    if (!air) s.ph += vv * dt * D.k;
    s.mv += ((air ? 0 : clamp(vv / (e.cls === 'inf' ? 3 : 4), 0, 1)) - s.mv) * (1 - Math.exp(-dt * 8));
    s.air += (air - s.air) * (1 - Math.exp(-dt * 6));
    s.p = e.pos.slice(); s.t = S.time;
  }
  return s;
};

const T120_UM = new Float32Array(16), T120_UV = new Float32Array(9);
T120.ALB = 1.35;
T120.draw = function(c, nl){
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
    T120_UV.set([R[0], Up[0], -F[0], R[1], Up[1], -F[1], R[2], Up[2], -F[2]]);
    gl.uniformMatrix3fv(U.uV, false, T120_UV);
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
    const kinds = this.stats.kinds; for (const k in kinds) kinds[k] = 0;
    for (const o of this.list){
      const e = o.e, D = this.DEF[o.t120k], m = this.M['t120_' + o.t120k + this.lodKey[o.t120lod]];
      if (!m || m.st !== 2) continue;
      const cx = o.bc[0] - c.pos[0], cy = o.bc[1] - c.pos[1], cz = o.bc[2] - c.pos[2], r = o.br + 1;
      const vx = R[0] * cx + R[1] * cy + R[2] * cz, vy = Up[0] * cx + Up[1] * cy + Up[2] * cz, vz = F[0] * cx + F[1] * cy + F[2] * cz;
      const s = this.anim(e, D);
      if (vz < -r || Math.abs(vx) > vz * tx + r || Math.abs(vy) > vz * ty + r) continue;
      if (S.time - s.shAt > 0.4){ s.shAt = S.time + Math.random() * 0.1; s.sh = shadowJS(add(o.origin, mul(e.up, Math.min(1.4, m.h * 0.6)))); }
      // модель: X = Up × F (правая тройка), Y = нормаль поверхности, Z = вперёд; ступни на o.origin (грунт)
      const eu = e.kdUp || e.up, fw = tangent(e.fwd, eu), xs = cross(eu, fw), sc = e.cls === 'inf' && e.leader ? 1.06 : 1;
      const ox = o.origin[0] - c.pos[0], oy = o.origin[1] - c.pos[1], oz = o.origin[2] - c.pos[2];
      T120_UM.set([xs[0] * sc, xs[1] * sc, xs[2] * sc, 0, eu[0] * sc, eu[1] * sc, eu[2] * sc, 0, fw[0] * sc, fw[1] * sc, fw[2] * sc, 0, ox, oy, oz, 1]);
      gl.uniformMatrix4fv(U.uM, false, T120_UM);
      // поворот корпуса за прицелом (в системе корпуса, плавно, до ±55°)
      let yaw = 0;
      if (D.amp[3] > 0 && e.aim){ const lx = dot(e.aim, xs), lz = dot(e.aim, fw); yaw = clamp(Math.atan2(lx, lz), -0.96, 0.96) * D.amp[3]; }
      s.yaw += (yaw - s.yaw) * 0.25;
      gl.uniform4f(U.uA, D.a, s.ph, s.mv, s.air);
      if (D.a === 2) gl.uniform4f(U.uG, D.q[0], D.q[1], D.q[2], D.q[3]); else gl.uniform4f(U.uG, D.g[0], D.g[1], D.g[2], D.g[3]);
      gl.uniform4f(U.uAmp, D.amp[0], D.amp[1], D.amp[2], s.yaw);
      gl.uniform4f(U.uP, 0.25 + 0.75 * s.sh, e.flash || 0, m.h || 1.8, this.ALB);
      gl.uniform3fv(U.uQo, m.qo); gl.uniform3fv(U.uQs, m.qs);
      gl.bindVertexArray(m.vao); gl.bindTexture(gl.TEXTURE_2D, m.tex);
      gl.drawElements(gl.TRIANGLES, m.n, m.type, 0);
      tris += m.n / 3; drawn++; lodN[o.t120lod]++; kinds[o.t120k] = (kinds[o.t120k] || 0) + 1;
    }
    this.stats.drawn = drawn; this.stats.tris = tris;
  }, 'draw');
  gl.bindVertexArray(prevVao);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, prevTex); gl.activeTexture(gl.TEXTURE0);
  if (cull) gl.enable(gl.CULL_FACE); if (blend) gl.enable(gl.BLEND);
  if (prevProg) gl.useProgram(prevProg);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
};

// ---------------------------------------------------------------- встраивание (только обёртки, старые файлы не тронуты)
if (T120.on && typeof HV65 !== 'undefined'){
  let prevOn = false;   // ответ предыдущего begin (HV65 / T94): если он не готов, его take не зовём — иначе боец пропал бы
  const hb = HV65.begin;   // v819 (T120): после HV65 (и T94, если есть) решаем, кто из юнитов рисуется мешом
  HV65.begin = function(fp){ prevOn = !!hb.apply(this, arguments); T120.safe(() => T120.frame(), 'frame'); return prevOn || T120.ok(); };
  const ht = HV65.take;
  HV65.take = function(e, o, hideMe){ if (prevOn && ht.apply(this, arguments)) return true; return !!T120.safe(() => T120.take(e, o, hideMe), 'take'); };
  const hd = HV65.draw;   // v819 (T120): меши юнитов — сразу после тяжёлых бойцов (тот же буфер и тест глубины)
  HV65.draw = function(c, nl, np){ const r = hd.apply(this, arguments); T120.safe(() => T120.draw(c, nl), 'draw'); return r; };
}
T120.info = function(){ const s = this.stats; return { on: this.on, user: this.user, failed: this.failed, err: this.err, drawn: s.drawn, cand: this.list.length, tris: Math.round(s.tris), lods: s.lods.slice(), kinds: Object.assign({}, s.kinds), loaded: s.loaded, kb: Math.round(s.kb), req: s.req, fail: s.fail, ms: +s.ms.toFixed(3), base: this.base(), keys: Object.keys(this.M).filter(k => this.M[k].st === 2) }; };
