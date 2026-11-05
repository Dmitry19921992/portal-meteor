// =====================================================================
//  v8.6 — МЕСТНАЯ ПОГОДА: «погодные пятна» (WX86). Сферы-объёмы с мягким краем 8 м, медленно дрейфуют; не больше 4 на карту
//  (на слабой графике — 3). Пылевая буря и метеоритный дождь уже есть (не дублируются).
//   • Дождь — штрихи только внутри, видимость ×0.65, шаги не слышны (глушит «шорох» листвы и хруст снега);
//   • Туман — видимость 25 м (ИИ не берёт цель в тумане дальше 25 м);
//   • Дым — от больших взрывов, сбитой техники и напалма (живёт 30 с): блокирует наведение (цель в дыму дальше 10 м не видна);
//   • Метель — только в «Белой шапке»: видимость ×0.5, белая пелена.
//  Шейдер: одна строка // v86 в главном цикле scene.glsl (после тумана метана) — wx86(): пересечение луча со сферой,
//  4 uniform vec4 (xyz центр, w = вид·1000 + радиус). На «Низкой» без штрихов дождя/снега (только пелена).
//  Хуки — обёртки: shaderConsts, startProgram, GFX72.sceneU, visRadius, findTarget, fxExplosion, AU.step, update, newMatch,
//  gatherParticles, drawOverlay. Выключить: ?wx86=0 или localStorage pm_wx86 = '0'.
// =====================================================================
var WX86 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('wx86') === '0') return false; return localStorage.getItem('pm_wx86') !== '0'; } catch (e){ return true; } })(),
  P: [], err: {}, lt: null, smokeT: -99, inK: null, sayT: -99, U: new Float32Array(16),
  stats: { spawned: 0, smoke: 0, visCut: 0, tgtCut: 0 },
  KIND: { rain: 1, fog: 2, smoke: 3, snow: 4 },
  NAME: { rain: ['Дождь', 'Rain', 'Mưa'], fog: ['Туман', 'Fog', 'Sương mù'], smoke: ['Дым', 'Smoke', 'Khói'], snow: ['Метель', 'Blizzard', 'Bão tuyết'] },
  TIP: { rain: ['видимость −35 %, шагов не слышно', 'visibility −35%, footsteps muffled', 'tầm nhìn −35%'], fog: ['видимость 25 м', 'visibility 25 m', 'tầm nhìn 25 m'],
         smoke: ['наведение сбито', 'targeting blocked', 'mất khóa mục tiêu'], snow: ['видимость ×0.5', 'visibility ×0.5', 'tầm nhìn ×0.5'] },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('WX86 ' + tag, e); } } },
  lv(){ return typeof BIO86 !== 'undefined' ? BIO86.lv() : 2; },
  maxN(){ return this.lv() === 0 ? 3 : 4; },
  ok(dir){ for (const b of BASES) if (surfDist(dir, b) < 160) return false; return true; },
  spawn(seed){
    this.P = []; this.smokeT = -99;
    if (!this.on) return;
    const rnd = seeded((seed ^ 0x77a86) >>> 0), plan = ['rain', 'fog', 'snow'].slice(0, this.maxN() - 1);
    for (const k of plan) this.make(k, rnd);
  },
  make(k, rnd, at, R, life){
    let dir = at;
    for (let n = 0; !dir && n < 200; n++){
      const d = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
      if (!this.ok(d)) continue;
      const b = typeof BIO86 !== 'undefined' && BIO86.on ? BIO86.at(mul(d, RM)) : 0;
      if (k === 'snow' ? b !== 3 : b === 3) continue;
      if (this.P.some(p => surfDist(p.dir, d) < 90)) continue;
      dir = d;
    }
    if (!dir) return null;
    const p = { k, dir, R: R || (k === 'fog' ? 34 : k === 'snow' ? 40 : 32) * (0.85 + 0.3 * rnd()), t: 0, life: life || 200 + rnd() * 120, a: 0,
                vel: mul(tangent([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], dir), k === 'smoke' ? 0.6 : 0.35), h: k === 'smoke' ? 4 : 8 };
    p.pos = mul(dir, RM + p.h);
    this.P.push(p); this.stats.spawned++;
    return p;
  },
  // плотность пятна в точке (0..1), мягкий край 8 м
  dens(p, x){
    const v = sub(x, p.pos), d = len(v);
    return p.a * (1 - smoothstep(p.R - 8, p.R, d)) * (len(x) - RM < p.h + p.R * 0.6 ? 1 : 0);
  },
  at(x, k){ let m = 0; for (const p of this.P) if (!k || p.k === k) m = max(m, this.dens(p, x)); return m; },
  kindAt(x){ let best = null, bm = 0.35; for (const p of this.P){ const d = this.dens(p, x); if (d > bm){ bm = d; best = p.k; } } return best; },
  step(dt){
    if (!this.on) return;
    for (let i = this.P.length - 1; i >= 0; i--){
      const p = this.P[i]; p.t += dt;
      p.a = min(1, p.t / 6) * min(1, max(0, (p.life - p.t) / 6));   // появляется и тает за 6 с
      if (p.t > p.life){ this.P.splice(i, 1); if (p.k !== 'smoke') this.make(p.k, Math.random); continue; }
      if (random() < dt * 0.05) p.vel = mul(tangent(add(p.vel, mul(randUnit(), 0.2)), p.dir), len(p.vel));
      for (const b of BASES) if (surfDist(p.dir, b) < 150) p.vel = mul(tangent(sub(p.dir, b), p.dir), len(p.vel));
      const nd = norm(add(p.dir, mul(p.vel, dt / RM)));
      if (p.k === 'snow' && typeof BIO86 !== 'undefined' && BIO86.on && BIO86.at(mul(nd, RM)) !== 3) p.vel = mul(p.vel, -1);   // метель не уходит из снега
      else p.dir = nd;
      p.pos = mul(p.dir, RM + p.h);
    }
    this.hint();
  },
  smoke(x, size){
    if (!this.on || S.time - this.smokeT < 15 || len(x) - RM > 25) return;
    const old = this.P.filter(p => p.k === 'smoke');
    if (this.P.length >= this.maxN()){ if (!old.length) return; this.P.splice(this.P.indexOf(old[0]), 1); }
    this.smokeT = S.time; this.stats.smoke++;
    this.make('smoke', Math.random, norm(x), 10 + size * 2, 30);
  },
  hint(){
    if (S.attract || S.mode !== 'fps') return;
    const c = ctrlEntity(); if (!c || !c.pos) return;
    const k = this.kindAt(c.pos);
    if (k === this.inK) return;
    this.inK = k;
    if (k && S.time - this.sayT > 10){ this.sayT = S.time; feed(`${k === 'rain' ? '🌧' : k === 'fog' ? '🌫' : k === 'smoke' ? '💨' : '🌨'} ${N2(this.NAME[k])}: ${N2(this.TIP[k])}`, '#b8c8d8'); }
  },
  // ------------------------------------------------------------------ шейдер
  glslProto(){ return '\nuniform vec4 uWx86[4];\nvec3 wx86(vec3 o, vec3 d, float tH, vec3 c);\n'; },
  glslTail(){ return `
// ---- v8.6 WX86: погодные пятна (= WX86 в v86_wx.js)
vec3 wx86(vec3 o, vec3 d, float tH, vec3 c){
  for (int i = 0; i < 4; i++){
    vec4 P = uWx86[i]; if (P.w < 1.0) continue;
    float k = floor(P.w / 1000.0), R = P.w - k * 1000.0;
    vec3 oc = o - P.xyz; float b = dot(oc, d), cc = dot(oc, oc) - R * R, h = b * b - cc;
    if (h <= 0.0) continue;
    float s = sqrt(h), t0 = max(-b - s, 0.0), t1 = min(-b + s, tH);
    if (t1 <= t0) continue;
    float tc = clamp(-b, t0, t1), ed = length(oc + d * tc);
    float soft = 1.0 - smoothstep(R - 8.0, R, ed), L = (t1 - t0) * soft;
    vec3 lit = C1 * max(dot(normalize(P.xyz), SUN1), 0.0) + C2 * max(dot(normalize(P.xyz), SUN2), 0.0);
    vec3 fc; float de;
    if (k < 1.5){ fc = vec3(0.06, 0.07, 0.085) + lit * vec3(0.03, 0.035, 0.045); de = 0.022; }        // дождь
    else if (k < 2.5){ fc = vec3(0.085, 0.09, 0.1) + lit * vec3(0.05, 0.055, 0.06); de = 0.07; }      // туман
    else if (k < 3.5){ fc = vec3(0.05, 0.045, 0.04) + lit * vec3(0.02, 0.018, 0.015); de = 0.09; }    // дым
    else { fc = vec3(0.12, 0.13, 0.15) + lit * vec3(0.08, 0.085, 0.095); de = 0.05; }                // метель
    float am = 1.0 - exp(-L * de);
    if (uQ > 0 && (k < 1.5 || k > 3.5)){   // штрихи дождя / хлопья снега (на «Низкой» — только пелена)
      vec3 q = d * (k < 1.5 ? vec3(90.0, 14.0, 90.0) : vec3(60.0)) + vec3(0.0, uTime * (k < 1.5 ? 9.0 : 2.0), uTime * (k > 3.5 ? 1.5 : 0.0));
      am *= 0.75 + 0.5 * smoothstep(0.55, 0.85, nz(q));
    }
    c = mix(c, fc, clamp(am, 0.0, 0.92));
  }
  return c;
}
`; },
  uniforms(U){
    const A = this.U; A.fill(0);
    this.P.slice(0, 4).forEach((p, i) => { if (p.a < 0.02) return; A.set([p.pos[0], p.pos[1], p.pos[2], this.KIND[p.k] * 1000 + p.R * (0.4 + 0.6 * p.a)], i * 4); });
    gl.uniform4fv(U.uWx86, A);
  },
  // ------------------------------------------------------------------ частицы: штрихи дождя / снег у камеры, если камера внутри
  parts(n){
    if (!this.on || !S.cam || S.mode !== 'fps') return n;
    const cam = S.cam.pos, k = this.kindAt(cam); if (k !== 'rain' && k !== 'snow') return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP, m = [3, 6, 8, 10][this.lv()], T = S.rtime, up = norm(cam), t1 = anyTangent(up), t2 = cross(up, t1);
    for (let i = 0; i < m && n < pmax; i++){
      const h1 = (i * 0.618 + 0.2) % 1, h2 = (i * 0.414 + 0.6) % 1, R = 2 + 10 * h1, a = h2 * 6.283;
      const fall = k === 'rain' ? (T * 1.6 + h1) % 1 : (T * 0.3 + h1) % 1, hy = 6 - 7 * fall;
      const p = add(add(cam, add(mul(t1, cos(a) * R), mul(t2, sin(a) * R))), mul(up, hy));
      const q = k === 'rain' ? sub(p, mul(up, 0.5)) : add(p, mul(t1, 0.06));
      PAR.set([p[0], p[1], p[2], k === 'rain' ? 0.012 : 0.03, q[0], q[1], q[2], 4], n * 8); n++;
    }
    return n;
  },
  overlay(){
    const c = ctrlEntity(); if (!c || !c.pos) return;
    const k = this.kindAt(c.pos); if (!k) return;
    const W = innerWidth, H = innerHeight, col = k === 'smoke' ? '70,60,50' : k === 'snow' ? '230,240,255' : k === 'fog' ? '170,180,190' : '120,140,170';
    const g = octx.createRadialGradient(W / 2, H / 2, min(W, H) * 0.25, W / 2, H / 2, max(W, H) * 0.7);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${k === 'smoke' ? 0.35 : 0.22})`);
    octx.fillStyle = g; octx.fillRect(0, 0, W, H);
  },
};
// ------------------------------------------------------------------ хуки
if (WX86.on){
  const sc0 = shaderConsts; shaderConsts = function(){ return sc0.apply(this, arguments) + WX86.glslProto(); };
  const sp0 = startProgram; startProgram = function(src){ if (typeof src === 'string' && src.indexOf('wx86(o, d') >= 0 && src.indexOf('// ---- v8.6 WX86') < 0) src += WX86.glslTail(); return sp0.call(this, src); };
} else {
  const sc0 = shaderConsts; shaderConsts = function(){ return sc0.apply(this, arguments) + '\nuniform vec4 uWx86[4];\nvec3 wx86(vec3 o, vec3 d, float tH, vec3 c){ return c; }\n'; };
}
SCENE_U.push('uWx86');
if (typeof GFX72 !== 'undefined'){ const su0 = GFX72.sceneU; GFX72.sceneU = function(U){ su0.apply(this, arguments); if (U.uWx86) WX86.safe(() => WX86.uniforms(U), 'uni'); }; }
if (WX86.on){
  // обзор: внутри дождя ×0.65, метели ×0.5, тумана — не дальше 25 м, дыма — 15 м
  { const vr0 = visRadius; visRadius = function(e){ let r = vr0.apply(this, arguments); if (!WX86.P.length || !e || !e.pos || e.cls === 'bld' || e.cls === 'hq') return r;
      for (const p of WX86.P){ const d = WX86.dens(p, e.pos); if (d < 0.05) continue; const m = p.k === 'rain' ? 0.65 : p.k === 'snow' ? 0.5 : p.k === 'fog' ? min(1, 25 / r) : min(1, 15 / r); r *= 1 - (1 - m) * d; WX86.stats.visCut++; }
      return r; }; }
  // наведение ИИ: цель в дыму дальше 10 м, в тумане дальше 25 м — не берётся (стрелок внутри тумана — тоже 25 м)
  { const ft0 = findTarget; findTarget = function(src, team, eye, opts){
      const r = ft0.apply(this, arguments);
      if (!r || !r.pos || !WX86.P.length || r.cls === 'hq' || !eye) return r;
      const d2 = dist2(r.pos, eye);
      if (d2 > 100 && WX86.at(r.pos, 'smoke') > 0.5){ WX86.stats.tgtCut++; return null; }
      if (d2 > 625 && (WX86.at(r.pos, 'fog') > 0.5 || WX86.at(eye, 'fog') > 0.5)){ WX86.stats.tgtCut++; return null; }
      return r;
    }; }
  { const fx0 = fxExplosion; fxExplosion = function(p, size){ const r = fx0.apply(this, arguments); if (size >= 2.6 && !S.attract || size >= 2.6 && S.attract && random() < 0.3) WX86.safe(() => WX86.smoke(p, size), 'smoke'); return r; }; }
  if (typeof AU !== 'undefined' && AU.step){ const st0 = AU.step; AU.step = function(pos){ if (pos && WX86.P.length && WX86.at(pos, 'rain') > 0.5) return; return st0.apply(this, arguments); }; }
  { const up0 = update; update = function(rdt){ up0(rdt); if (S.paused) return; const dt = clamp(S.time - (WX86.lt === null ? S.time : WX86.lt), 0, 0.1); WX86.lt = S.time; if (dt > 0) WX86.safe(() => WX86.step(dt), 'step'); }; }
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); WX86.lt = null; WX86.inK = null; WX86.safe(() => WX86.spawn(((Date.now() * 2654435761) ^ 0x1ce) >>> 0), 'spawn'); return r; }; }
  { const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); const m = WX86.safe(() => WX86.parts(n), 'par'); return m === undefined ? n : m; }; }
  { const do0 = drawOverlay; drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (!S.attract && S.mode === 'fps' && !(typeof OPER !== 'undefined' && OPER.on)) WX86.safe(() => WX86.overlay(), 'ov'); return r; }; }
}
