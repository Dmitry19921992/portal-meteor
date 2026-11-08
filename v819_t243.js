// =====================================================================
//  v8.19 (T243) — ВТОРАЯ ВОЛНА МОДЕЛЕЙ TRIPO: постройки, штабы, юниты Роя, снайпер, дроны, «Шакал»
//  (одобренные Дмитрием в Фитбе, оценка 4–5; первая волна — v819_units120.js (T120) и v819_tanks.js (T94)).
//  Только вид: коллизии, хитбоксы, стройка, логика — прежние. Модель не пришла / ошибка / выключено — прежний вид (SDF).
//  Кто чем рисуется:
//    ПОСТРОЙКИ Консорциума (готовые; пока идёт стройка — прежняя «печать»):
//      турель — turret_mg_196968732 (5)       t243_tur      верх поворачивается за прицелом
//      ПВО    — radar_839331274 (5)           t243_aa       купол поворачивается за прицелом
//      форпост — barracks_255553835 (5)       t243_outpost
//      мехзавод — power_plant_229809741 (5)   t243_factory
//      дрон-хаб — refinery_1917796550 (5)     t243_hub
//      аэродок — airpad_541218323 (5)         t243_airdock
//      экстрактор — extractor_1617651343 (5)  t243_extr
//    ПОСТРОЙКИ Роя: турель — enemy_turret_50285919 (5) t243_etur, ПВО — turret_enemy_1035424432 (5) t243_eaa (остальные — прежние)
//    ШТАБЫ: Консорциум — hq_1621726551 (5) t243_hq, Рой — enemy_hq_484098180 (5) t243_ehq. Штаб — часть рельефа (scene.glsl):
//      когда меш готов, render.js передаёт uHQ = 2 и в прямом луче остаются только площадка, мачта и маяк (тени, вид сквозь
//      портал и коллизии — прежние; руины разрушенного штаба — прежние).
//    ПЕХОТА Роя: разведчик / штурмовик / медик / снайпер — enemy_scout_606770238 (4) t243_esc,
//      гранатомётчик и элитный штурмовик — enemy_heavy_1044363531 (5) t243_ehv (пулемётчик — прежний HV65)
//    ПЕХОТА Консорциума: снайпер — sniper_unit_309116948 (5) t243_snp; для разнообразия рядом с моделями T120:
//      каждый второй гранатомётчик — bazooka_trooper_718251955 (5) t243_baz, каждый второй медик — medic_491287814 (5) t243_med,
//      командир штурмового отряда — rifleman_1917045054 (5) t243_rif
//    ДРОНЫ Консорциума: drone_attack_295014959 (5) t243_dra / drone_recon_1574402431 (5) t243_drr (через одного)
//    «Шакал» Консорциума — apc_760742074 (5) t243_apc
//  Ассеты: D:\AI\pm_assets\tripo_pro_1107 → D:\AI\t243\scripts (tex.py, b243.py Blender LOD, pack243.py) → assets3d/t243_<ключ>_<lod>.glb
//    (LOD0 / LOD0m телефон / LOD1); build.py кладёт их рядом со страницей, грузятся по требованию (загрузчик и фрагментный
//    шейдер — общие с T120). Отчёт — REPORT_T243.md.
//  Встраивание — те же обёртки HV65.begin/take/draw (после T94 и T120) + обёртка T120.kind (бойцы «для разнообразия»).
//  Выключить всё: ?t243=0 (или localStorage pm_t243 = '0'). Консоль: T243.info(), T243.enable(false|true).
// =====================================================================
const T243 = {
  on: typeof T120 !== 'undefined' && typeof T120_FS !== 'undefined' && !/[?&]t243=0/.test(location.search) && (() => { try { return localStorage.getItem('pm_t243') !== '0'; } catch (e){ return true; } })(),
  user: true, failed: false, err: '', fr: 0,
  list: [], M: {}, pend: [], req: {}, P: null, U: null, st: new WeakMap(), hqR: [false, false],
  stats: { drawn: 0, ms: 0, tris: 0, loaded: 0, kb: 0, req: 0, fail: 0, lods: [0, 0, 0], kinds: {}, hq: 0 },
  MAXN: 60,
  // a: 0 статичный, 1 двуногий (как T120), 3 турель (верх выше g[0]·H поворачивается вокруг точки g[1], g[2]), 4 парит (дрон)
  // d0 / d0l — до какой дистанции LOD0 (ПК / телефон), дальше LOD1
  DEF: {
    hq:      { a: 0, d0: 170, d0l: 100 },
    ehq:     { a: 0, d0: 170, d0l: 100 },
    outpost: { a: 0, d0: 110, d0l: 60 }, factory: { a: 0, d0: 130, d0l: 70 }, hub: { a: 0, d0: 120, d0l: 65 },
    airdock: { a: 0, d0: 120, d0l: 65 }, extr: { a: 0, d0: 70, d0l: 40 },
    tur:     { a: 3, d0: 60, d0l: 35, g: [0.42, 0, 0] },
    aa:      { a: 3, d0: 60, d0l: 35, g: [0.3, 0, 0] },
    etur:    { a: 3, d0: 60, d0l: 35, g: [0.3, 0, 0] },
    eaa:     { a: 3, d0: 60, d0l: 35, g: [0.45, 0, 0] },
    esc:     { a: 1, d0: 26, d0l: 14, g: [0.92, 0.5, 0.04, 1.45], amp: [0.5, 0.8, 0.25, 0.9], k: 3.7 },
    ehv:     { a: 1, d0: 30, d0l: 16, g: [1.0, 0.55, 0.08, 1.6], amp: [0.38, 0.6, 0.0, 0.8], k: 3.0 },
    snp:     { a: 1, d0: 26, d0l: 14, g: [0.86, 0.47, 0.035, 1.38], amp: [0.5, 0.8, 0.0, 0.9], k: 3.9 },
    baz:     { a: 1, d0: 26, d0l: 14, g: [0.86, 0.47, 0.035, 1.38], amp: [0.45, 0.75, 0.0, 0.8], k: 3.7 },
    med:     { a: 1, d0: 26, d0l: 14, g: [0.88, 0.48, 0.05, 1.42], amp: [0.45, 0.75, 0.0, 0.8], k: 3.7 },
    rif:     { a: 1, d0: 26, d0l: 14, g: [0.86, 0.47, 0.035, 1.38], amp: [0.5, 0.8, 0.0, 0.9], k: 3.9 },
    dra:     { a: 4, d0: 40, d0l: 22 }, drr: { a: 4, d0: 40, d0l: 22 },
    apc:     { a: 0, d0: 70, d0l: 40 },
  },
  BLD: [{ turret: 'tur', aa: 'aa', outpost: 'outpost', factory: 'factory', hub: 'hub', airdock: 'airdock', extractor: 'extr' }, { turret: 'etur', aa: 'eaa' }],
  VAR: { baz: 1, med: 1, rif: 1 },   // эти забираем у T120 (обёртка T120.kind)
  ok(){ return this.on && this.user && !this.failed; },
  fail(e){ this.failed = true; this.err = String(e && e.message || e); try { console.warn('T243: модели второй волны отключены, остаётся прежний вид —', this.err); } catch (_){} },
  safe(fn, tag){ try { return fn(); } catch (e){ this.fail(tag ? tag + ': ' + (e && e.message || e) : e); } },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  fac(e){ return typeof FI76 === 'function' ? FI76(e.team) : e.team; },
  base(){ return T120.base(); },
  enable(v){ this.user = v !== false; return this.ok(); },
  dead(kind){ const p = 't243_' + kind; return ['_lod0', '_lod0m', '_lod1'].every(l => this.M[p + l] && this.M[p + l].st === 3); },
  kind(e){
    if (!e || !e.alive) return null;
    const f = this.fac(e), odd = ((e.id | 0) & 1) === 1;
    if (e.cls === 'bld') return e.done ? (this.BLD[f] || {})[e.type] || null : null;
    if (e.cls === 'inf'){
      if (f === 1){ if (e.role === 'heavy') return null; return e.role === 'rocket' || (e.role === 'assault' && e.elite) ? 'ehv' : 'esc'; }
      if (f !== 0) return null;
      if (e.role === 'sniper') return 'snp';
      if (e.role === 'rocket' && odd) return 'baz';
      if (e.role === 'medic' && odd) return 'med';
      if (e.role === 'assault' && !e.elite && e.leader) return 'rif';
      return null;
    }
    if (e.cls === 'drone') return f === 0 ? (odd ? 'drr' : 'dra') : null;
    if (e.cls === 'tank' && e.vk === 'raider' && f === 0) return 'apc';
    return null;
  },
};

// ---------------------------------------------------------------- вершинный шейдер: как T120 + поворот верха турели (a = 3)
const T243_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aT;
uniform mat4 uM; uniform mat3 uV; uniform vec4 uPr; uniform vec3 uQo, uQs;
uniform vec4 uA;    // x тип (1 двуногий, 3 турель), y фаза шага, z ход 0..1, w в полёте 0..1
uniform vec4 uG;    // двуногий: таз, колено, |x| границы ноги, плечи;  турель: высота оси, x оси, z оси, высота модели
uniform vec4 uAmp;  // мах бедра, сгиб колена, мах рук, поворот корпуса / турели (рад)
out vec3 vW; out vec3 vN; out vec2 vT; out float vZ; out float vH;
vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(v.x * c - v.y * s, v.x * s + v.y * c); }
void main(){
  vec3 lp = uQo + aP * uQs, ln = aN;
  if (uA.x > 2.5){
    float w = smoothstep(uG.x - 0.025 * uG.w, uG.x + 0.025 * uG.w, lp.y);
    if (w > 0.0 && abs(uAmp.w) > 0.0005){ vec2 pv = uG.yz; lp.xz = pv + rot(lp.xz - pv, uAmp.w * w); ln.xz = rot(ln.xz, uAmp.w * w); }
  } else if (uA.x > 0.5){
    float hip = uG.x, knee = uG.y, H = uG.w;
    float w = smoothstep(hip + 0.04 * H, hip - 0.07 * H, lp.y) * smoothstep(uG.z * 0.3, uG.z, abs(lp.x));
    if (w > 0.0){
      float sd = lp.x < 0.0 ? 0.0 : 1.0;
      float ph = uA.y + sd * 3.14159;
      float a1 = sin(ph) * uAmp.x * uA.z;
      float a2 = -(0.12 + max(0.0, cos(ph))) * uAmp.y * uA.z;
      a1 = mix(a1, 0.35, uA.w); a2 = mix(a2, -0.7, uA.w);
      float wk = smoothstep(knee + 0.05 * H, knee - 0.05 * H, lp.y);
      vec2 pk = vec2(knee, 0.0);
      if (wk > 0.0){ lp.yz = pk + rot(lp.yz - pk, -a2 * wk * w); ln.yz = rot(ln.yz, -a2 * wk * w); }
      vec2 ph0 = vec2(hip, 0.0);
      lp.yz = ph0 + rot(lp.yz - ph0, -a1 * w); ln.yz = rot(ln.yz, -a1 * w);
    }
    float wu = smoothstep(hip - 0.02 * H, hip + 0.18 * H, lp.y);
    if (wu > 0.0 && abs(uAmp.w) > 0.001){ lp.xz = rot(lp.xz, uAmp.w * wu); ln.xz = rot(ln.xz, uAmp.w * wu); }
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

// ---------------------------------------------------------------- загрузка (общая с T120: <base>t243_<ключ>_<lod>.js → PM3D_reg)
T243.need = function(key){ return T120.need.call(this, key); };
T243.upload = function(key, b64){ return T120.upload.call(this, key, b64); };
T243.pump = function(){
  for (let n = 0; n < 2 && this.pend.length; n++){ const [key, b64] = this.pend.shift(); this.safe(() => this.upload(key, b64), 'upload ' + key); }
};
if (T243.on){
  const reg0 = window.PM3D_reg;
  window.PM3D_reg = (k, b) => { if (String(k).indexOf('t243_') === 0) T243.pend.push([k, b]); else if (reg0) reg0(k, b); };
}
T243.build = function(){
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, T243_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, T120_FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const U = {}; for (const n of ['uM', 'uV', 'uPr', 'uQo', 'uQs', 'uA', 'uG', 'uAmp', 'uTex', 'uCamW', 'uP', 'uLP', 'uLC', 'uNL', 'uLamp', 'uStorm']) U[n] = gl.getUniformLocation(p, n);
  this.P = p; this.U = U;
};
T243.lodKey = ['_lod0', '_lod0m', '_lod1'];
T243.pick = function(kind, d){
  const lite = this.lite(), D = this.DEF[kind], p = 't243_' + kind;
  const want = d < (lite ? D.d0l : D.d0) ? (lite ? 1 : 0) : 2;
  this.need(p + this.lodKey[want]);
  const ready = l => { const m = this.M[p + this.lodKey[l]]; return m && m.st === 2; };
  if (ready(want)) return want;
  for (const l of (want === 2 ? [lite ? 1 : 0, lite ? 0 : 1] : [2, want === 0 ? 1 : 0])) if (ready(l)) return l;
  if (want !== 2) this.need(p + '_lod1');
  return -1;
};

// ---------------------------------------------------------------- кадр: кто рисуется мешом (SDF у него молчит)
T243.frame = function(){
  this.list.length = 0; this.fr++;
  if (!this.on || this.failed) return;
  this.pump();
  // штабы: готов ли меш (если да — render.js передаёт uHQ = 2, в прямом луче остаётся только площадка)
  for (let t = 0; t < 2; t++){
    let r = false;
    if (this.ok() && typeof HQ_ALIVE !== 'undefined' && HQ_ALIVE[t] && typeof BASES !== 'undefined' && typeof S !== 'undefined' && S.cam){
      const k = this.hqKind(t), P = mul(BASES[t], RM + 1.6), d = Math.min(dist(P, S.cam.pos), dist(P, mul(S.cam.pos, -1)));
      r = d < 2600 && this.pick(k, d) >= 0;
    }
    this.hqR[t] = r;
  }
};
T243.hqKind = function(t){ return (typeof FI76 === 'function' ? FI76(t) : t) === 0 ? 'hq' : 'ehq'; };
T243.hqMesh = function(t){ return this.ok() && !!this.hqR[t]; };   // зовёт render.js при установке uHQ
T243.take = function(e, o, hideMe){
  if (!this.ok() || hideMe) return false;
  const kind = this.kind(e);
  if (!kind || this.list.length >= (this.lite() ? 30 : this.MAXN)) return false;
  const lod = this.pick(kind, o.d);
  if (lod < 0) return false;
  o.t243k = kind; o.t243lod = lod;
  this.list.push(o);
  return true;
};
T243.anim = function(e, D){
  let s = this.st.get(e);
  if (!s){ s = { p: e.pos.slice(), t: S.time, ph: Math.random() * 6, mv: 0, air: 0, yaw: 0, sh: 1, shAt: -9 }; this.st.set(e, s); }
  const dt = clamp(S.time - s.t, 0, 0.25);
  if (dt > 0 && D.a === 1){
    const up = e.up || norm(e.pos), dp = sub(e.pos, s.p), v = len(sub(dp, mul(up, dot(dp, up)))) / dt;
    const air = !e.grounded && (e.airT || 0) > 0.25 ? 1 : 0, vv = v > 25 ? 0 : v;
    if (!air) s.ph += vv * dt * D.k;
    s.mv += ((air ? 0 : clamp(vv / 3, 0, 1)) - s.mv) * (1 - Math.exp(-dt * 8));
    s.air += (air - s.air) * (1 - Math.exp(-dt * 6));
  }
  if (dt > 0){ s.p = e.pos.slice(); s.t = S.time; }
  return s;
};
const T243_UM = new Float32Array(16), T243_UV = new Float32Array(9);
T243.ALB = 1.35;
T243.one = function(U, m, D, kind, org, eu, fw, sc, s, flash, yaw, c){
  const xs = cross(eu, fw), ox = org[0] - c.pos[0], oy = org[1] - c.pos[1], oz = org[2] - c.pos[2];
  T243_UM.set([xs[0] * sc, xs[1] * sc, xs[2] * sc, 0, eu[0] * sc, eu[1] * sc, eu[2] * sc, 0, fw[0] * sc, fw[1] * sc, fw[2] * sc, 0, ox, oy, oz, 1]);
  gl.uniformMatrix4fv(U.uM, false, T243_UM);
  if (D.a === 1){
    gl.uniform4f(U.uA, 1, s.ph, s.mv, s.air); gl.uniform4f(U.uG, D.g[0], D.g[1], D.g[2], D.g[3]); gl.uniform4f(U.uAmp, D.amp[0], D.amp[1], D.amp[2], yaw);
  } else if (D.a === 3){
    gl.uniform4f(U.uA, 3, 0, 0, 0); gl.uniform4f(U.uG, D.g[0] * m.h, D.g[1], D.g[2], m.h); gl.uniform4f(U.uAmp, 0, 0, 0, yaw);
  } else { gl.uniform4f(U.uA, 0, 0, 0, 0); gl.uniform4f(U.uAmp, 0, 0, 0, 0); }
  gl.uniform4f(U.uP, 0.25 + 0.75 * s.sh, flash || 0, m.h || 1.8, this.ALB);
  gl.uniform3fv(U.uQo, m.qo); gl.uniform3fv(U.uQs, m.qs);
  gl.bindVertexArray(m.vao); gl.bindTexture(gl.TEXTURE_2D, m.tex);
  gl.drawElements(gl.TRIANGLES, m.n, m.type, 0);
  return m.n / 3;
};
// поворот модели к направлению v (в системе: X = up × fwd, Z = fwd) — модель смотрит в +Z, поворот rot(xz, a) в шейдере
T243.yawTo = function(v, xs, fw){ if (!v) return 0; const lx = dot(v, xs), lz = dot(v, fw); if (lx * lx + lz * lz < 1e-6) return 0; return -Math.atan2(lx, lz); };
T243.draw = function(c, nl){
  if (!this.ok() || (!this.list.length && !this.hqR[0] && !this.hqR[1])) return;
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
    T243_UV.set([R[0], Up[0], -F[0], R[1], Up[1], -F[1], R[2], Up[2], -F[2]]);
    gl.uniformMatrix3fv(U.uV, false, T243_UV);
    const aspect = fboW / fboH, fy = 2 / c.fov, fx = fy / aspect, n = 0.05, f = 20000;
    gl.uniform4f(U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
    gl.uniform3fv(U.uCamW, c.pos);
    gl.uniform4fv(U.uLP, LP); gl.uniform4fv(U.uLC, LC); gl.uniform1i(U.uNL, nl || 0);
    gl.uniform1f(U.uLamp, S.mode === 'fps' && !S.attract ? 1 : 0);
    gl.uniform1f(U.uStorm, (S.storm ? S.storm.k : 0) * ((S.mode === 'fps' || S.attract) ? 1 : 0.12));
    gl.uniform1i(U.uTex, 3); gl.activeTexture(gl.TEXTURE3);
    const tx = c.fov * 0.5 * aspect, ty = c.fov * 0.5;
    const vis = (p, r) => { const cx = p[0] - c.pos[0], cy = p[1] - c.pos[1], cz = p[2] - c.pos[2];
      const vx = R[0] * cx + R[1] * cy + R[2] * cz, vy = Up[0] * cx + Up[1] * cy + Up[2] * cz, vz = F[0] * cx + F[1] * cy + F[2] * cz;
      return !(vz < -r || Math.abs(vx) > vz * tx + r || Math.abs(vy) > vz * ty + r); };
    let drawn = 0, tris = 0;
    const lodN = this.stats.lods; lodN[0] = lodN[1] = lodN[2] = 0;
    const kinds = this.stats.kinds; for (const k in kinds) kinds[k] = 0;
    const count = (k, l, tr) => { tris += tr; drawn++; lodN[l]++; kinds[k] = (kinds[k] || 0) + 1; };
    for (const o of this.list){
      const e = o.e, kind = o.t243k, D = this.DEF[kind], m = this.M['t243_' + kind + this.lodKey[o.t243lod]];
      if (!m || m.st !== 2 || !vis(o.bc, o.br + 1)) continue;
      const s = this.anim(e, D);
      const eu = e.kdUp || e.up || norm(e.pos), fw = tangent(e.fwd || anyTangent(eu), eu), xs = cross(eu, fw);
      let org = o.origin;
      if (D.a === 4) org = add(e.pos, mul(eu, -0.5 * m.h + Math.sin(S.time * 2.1 + (e.id | 0)) * 0.08));   // дрон: центр модели — в точке дрона, лёгкое покачивание
      if (S.time - s.shAt > 0.4){ s.shAt = S.time + Math.random() * 0.1; s.sh = shadowJS(add(org, mul(eu, Math.min(2.5, m.h * 0.6)))); }
      let yaw = 0;
      if (D.a === 1 && e.aim) yaw = clamp(this.yawTo(e.aim, xs, fw), -0.96, 0.96) * D.amp[3];
      else if (D.a === 3) yaw = this.yawTo(e.aim, xs, fw);
      if (D.a === 1){ s.yaw += (yaw - s.yaw) * 0.25; yaw = s.yaw; }
      count(kind, o.t243lod, this.one(U, m, D, kind, org, eu, fw, e.cls === 'inf' && e.leader ? 1.06 : 1, s, e.flash, yaw, c));
    }
    // штабы (часть рельефа; ставим на площадку: 1.6 м над радиусом метеорита)
    for (let t = 0; t < 2; t++){
      if (!this.hqR[t]) continue;
      const kind = this.hqKind(t), up = BASES[t].slice(), P = mul(up, RM + 1.6);
      const d = Math.min(dist(P, c.pos), dist(P, mul(c.pos, -1))), lod = this.pick(kind, d);
      const m = lod >= 0 && this.M['t243_' + kind + this.lodKey[lod]];
      if (!m || m.st !== 2 || !vis(add(P, mul(up, 8)), 22)) continue;
      const fw = tangent([0, 0, 1], up), hq = (typeof S !== 'undefined' && S.hq && S.hq[t]) || {};
      const s = this.st.get(hq) || { sh: 1, shAt: -9 }; this.st.set(hq, s);
      if (S.time - s.shAt > 0.5){ s.shAt = S.time; s.sh = shadowJS(add(P, mul(up, 6))); }
      count(kind, lod, this.one(U, m, this.DEF[kind], kind, P, up, fw, 1, s, hq.flash || 0, 0, c));
      this.stats.hq++;
    }
    this.stats.drawn = drawn; this.stats.tris = tris;
  }, 'draw');
  gl.bindVertexArray(prevVao);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, prevTex); gl.activeTexture(gl.TEXTURE0);
  if (cull) gl.enable(gl.CULL_FACE); if (blend) gl.enable(gl.BLEND);
  if (prevProg) gl.useProgram(prevProg);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
};

// ---------------------------------------------------------------- встраивание (только обёртки; после HV65 → T94 → T120)
if (T243.on && typeof HV65 !== 'undefined'){
  let prevOn = false;
  const hb = HV65.begin;
  HV65.begin = function(fp){ prevOn = !!hb.apply(this, arguments); T243.safe(() => T243.frame(), 'frame'); return prevOn || T243.ok(); };
  const ht = HV65.take;
  HV65.take = function(e, o, hideMe){ if (prevOn && ht.apply(this, arguments)) return true; return !!T243.safe(() => T243.take(e, o, hideMe), 'take'); };
  const hd = HV65.draw;
  HV65.draw = function(c, nl, np){ const r = hd.apply(this, arguments); T243.safe(() => T243.draw(c, nl), 'draw'); return r; };
  // бойцы «для разнообразия» (гранатомётчик / медик через одного, командир штурмовиков): T120 их не берёт, пока модель T243 жива
  const k0 = T120.kind;
  T120.kind = function(e){ if (T243.ok() && e && e.alive && e.cls === 'inf'){ const k = T243.kind(e); if (k && T243.VAR[k] && !T243.dead(k)) return null; } return k0.apply(this, arguments); };
}
T243.info = function(){ const s = this.stats; return { on: this.on, user: this.user, failed: this.failed, err: this.err, drawn: s.drawn, cand: this.list.length, tris: Math.round(s.tris), lods: s.lods.slice(), kinds: Object.assign({}, s.kinds), hq: this.hqR.slice(), loaded: s.loaded, kb: Math.round(s.kb), req: s.req, fail: s.fail, ms: +s.ms.toFixed(3), base: this.base ? (T120.base && T120.base()) : '', keys: Object.keys(this.M).filter(k => this.M[k].st === 2) }; };
