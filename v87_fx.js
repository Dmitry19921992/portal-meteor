// =====================================================================
//  v8.7 — ЭФФЕКТЫ: тяжёлые трассеры «как болтер» (Dawn of War 2), пули с искажением пространства и дымным следом
//  (F.E.A.R., сильнее в «рефлексе»), камера «засасывается» в юнита при вселении и «выплёвывается» при выходе
//  (вихрь-линза в пост-обработке + усиленный VHS-срыв v6), номер версии «v8.7» в главном меню.
//  Всё по уровню графики ADG80 (0 Низкая … 3 Ультра): на Низкой — без ядра трассера, без линз и дыма, вихрь без закрутки.
//  Пулы без выделений: тяжёлые трассеры — поля в TRACERS (gun.js), линзы — слоты WAVE, дым — свой пул частиц.
//  Хуки — обёртки: gunShoot, addTracer, tracersGather (замена), gatherDistortion, renderPost, update, MENU.html_main,
//  P71M.main, MENU.applyLang; post.glsl — 2 uniform и 4 строки с пометкой v87. Выключить: ?fx87=0.
// =====================================================================
const FX87 = {
  on: (() => { try { return new URLSearchParams(location.search).get('fx87') !== '0'; } catch (e){ return true; } })(),
  VER: '8.7', curW: null, curSrc: null, vx: null, prevMode: null, prevCmd: false, loc: null, locP: null, err: {},
  pool: [], POOLN: 48, poolI: 0, lens: 0,
  stats: { heavy: 0, light: 0, puffs: 0, lens: 0, suck: 0, spit: 0, reuse: 0, impacts: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('FX87 ' + tag, e); } } },
  lv(){ return typeof ADG80 !== 'undefined' ? clamp(ADG80.L | 0, 0, 3) : 1; },
  // ---------------------------------------------------------------- тяжёлые трассеры
  heavy(W, src){
    if (!W) return false;
    if (typeof WEAPONS !== 'undefined' && W === WEAPONS.hmg) return true;
    if (src && (src.role === 'heavy' || src.cls === 'bld' || src.boss83)) return true;
    return !!(W.heavy87 || (W.dmg >= 9 && W.rof && W.rof < 0.09));
  },
  onTracer(a, b, team, inc){
    const T = TRACERS[(trcI + TRC_N - 1) % TRC_N]; if (!T || !T.on) return;
    const hv = this.heavy(this.curW, this.curSrc), L = this.lv();
    T.h87 = hv ? 1 : 0; T.len87 = hv ? [11, 14, 16, 18][L] : 0;
    if (hv){ T.w = [0.085, 0.1, 0.115, 0.13][L]; this.stats.heavy++;
      if (L >= 1 && random() < 0.55){ burst(b, L >= 2 ? 4 : 2, 4, 0.18); this.stats.impacts++; if (L >= 2) addLight(b, [3.2, 2.0, 0.7], 7, 0.07, 0.006); }   // разрывной снаряд болтера
    } else this.stats.light++;
    this.trail(T, a, b, hv);
  },
  // дымный след пули у камеры (больше в «рефлексе»)
  trail(T, a, b, hv){
    const L = this.lv(); if (!S.cam || L === 0 || S.attract && !(typeof OPER !== 'undefined' && OPER.on)) return;
    const c = S.cam.pos, d = T.d;
    const s = clamp((c[0] - a[0]) * d[0] + (c[1] - a[1]) * d[1] + (c[2] - a[2]) * d[2], 0, T.L);
    const qx = a[0] + d[0] * s - c[0], qy = a[1] + d[1] * s - c[1], qz = a[2] + d[2] * s - c[2];
    if (qx * qx + qy * qy + qz * qz > 1600) return;   // далеко от камеры — следа не видно
    let n = [0, 1, 2, 3][L] + (hv ? 1 : 0) + (S.slow > 0.3 ? 3 : 0);
    for (let i = 0; i < n; i++){
      const h = clamp(s + (random() - 0.6) * 14, 1, T.L - 0.5);
      const p = this.puff(); if (!p) break;
      p.pos[0] = a[0] + d[0] * h; p.pos[1] = a[1] + d[1] * h; p.pos[2] = a[2] + d[2] * h;
      p.vel[0] = (random() - 0.5) * 0.3; p.vel[1] = (random() - 0.5) * 0.3; p.vel[2] = (random() - 0.5) * 0.3;
      p.t = 0; p.life = (S.slow > 0.3 ? 2.2 : 1.1) + random() * 0.6; p.r0 = 0.12; p.r1 = hv ? 0.9 : 0.55; p.dens = hv ? 0.5 : 0.32; p.grey = 0.8; p.heat = 0;
      S.fx.push(p); this.stats.puffs++;
    }
  },
  puff(){
    for (let k = 0; k < this.POOLN; k++){
      const i = (this.poolI + k) % this.POOLN;
      let p = this.pool[i];
      if (!p){ p = this.pool[i] = { type: 'smoke', pos: [0, 0, 0], vel: [0, 0, 0], r0: 0.1, r1: 0.5, life: 1, t: 1, grey: 0.8, dens: 0.3, heat: 0, p87: 1 }; this.poolI = (i + 1) % this.POOLN; return p; }
      if (p.t >= p.life && S.fx.indexOf(p) < 0){ this.poolI = (i + 1) % this.POOLN; this.stats.reuse++; return p; }
    }
    return null;   // все частицы пула ещё в воздухе
  },
  gather(push, near){
    const L = this.lv();
    for (let i = 0; i < TRC_N; i++){
      const T = TRACERS[i]; if (!T.on) continue;
      const Ln = T.h87 ? T.len87 : TRC_LEN;
      const h = min(T.L, T.t * TRC_SPEED + 1.5), tl = max(0, h - Ln);
      const a = [T.a[0] + T.d[0] * h, T.a[1] + T.d[1] * h, T.a[2] + T.d[2] * h];
      if (!near(a)) continue;
      const b = [T.a[0] + T.d[0] * tl, T.a[1] + T.d[1] * tl, T.a[2] + T.d[2] * tl];
      push(a, T.w, b, T.inc ? 3 : T.team);
      if (T.h87 && L >= 1){   // раскалённое ядро «болта» — короче и ярче
        const tc = max(0, h - Ln * 0.45);
        push(add(a, mul(T.d, 0.25)), T.w * 0.55, [T.a[0] + T.d[0] * tc, T.a[1] + T.d[1] * tc, T.a[2] + T.d[2] * tc], 3);
      }
    }
  },
  // ---------------------------------------------------------------- линзы-пузыри у пуль (F.E.A.R.)
  lensWaves(nw){
    const L = this.lv(); this.lens = 0;
    if (!S.cam || L === 0 || !SET.distort || (typeof LITE73 !== 'undefined' && LITE73.on)) return nw;
    const maxN = min(8, nw + [0, 2, 3, 4][L] + (S.slow > 0.3 ? 2 : 0));
    const W = innerWidth, H = innerHeight, c = S.cam.pos, cand = [];
    for (let i = 0; i < TRC_N; i++){
      const T = TRACERS[i]; if (!T.on) continue;
      const h = min(T.L, T.t * TRC_SPEED + 1.5); if (h >= T.L) continue;
      const p = [T.a[0] + T.d[0] * h, T.a[1] + T.d[1] * h, T.a[2] + T.d[2] * h], d = dist(p, c);
      if (d < 1.2 || d > 32) continue;
      cand.push({ p, d, hv: T.h87 });
    }
    for (const q of S.proj){ if (q.type !== 'b') continue; const d = dist(q.pos, c); if (d > 1.2 && d < 32) cand.push({ p: q.pos, d, hv: 0 }); }
    cand.sort((x, y) => x.d - y.d);
    for (const o of cand){
      if (nw >= maxN) break;
      const s = project(o.p); if (!s || s[2] <= 0.5) continue;
      const r = (o.hv ? 0.55 : 0.38) * (1 + S.slow * 1.2) / (s[2] * S.cam.fov);
      if (r > 0.25 || r < 0.004) continue;
      const str = (0.55 + S.slow * 1.6) * (o.hv ? 1.3 : 1) * clamp(14 / o.d, 0.35, 1.3);
      WAVE.set([s[0] / W, 1 - s[1] / H, r, str], nw * 4); nw++; this.lens++; this.stats.lens++;
    }
    return nw;
  },
  // ---------------------------------------------------------------- вихрь «засасывания» / «выплёвывания»
  watch(){
    const m = S.mode, cmd = typeof CMD85 !== 'undefined' && CMD85.on;
    if (this.prevMode !== null && !S.attract){
      if (this.prevMode !== 'fps' && m === 'fps'){ this.vx = { t: 0, dur: CAMFX.fly ? CAMFX.fly.dur : 0.55, dir: 1 }; this.stats.suck++; }
      else if (this.prevMode === 'fps' && m !== 'fps'){ this.vx = { t: 0, dur: 0.75, dir: -1 }; this.stats.spit++; }
    }
    this.prevMode = m; this.prevCmd = cmd;
  },
  // [x, y (uv), сила со знаком, радиус]
  vortex(dt){
    const V = this.vx; if (!V) return null;
    V.t += dt;
    const k = V.t / V.dur; if (k >= 1 || S.attract){ this.vx = null; return null; }
    let x = 0.5, y = 0.5, s;
    if (V.dir > 0){
      const c = ctrlEntity();
      if (c && S.cam){ const p = project(add(c.pos, mul(norm(c.pos), 1.2))); if (p && p[2] > 0){ x = clamp(p[0] / innerWidth, 0.1, 0.9); y = clamp(1 - p[1] / innerHeight, 0.1, 0.9); } }
      const f = clamp((V.dur - V.t) / 0.25, 0, 1);   // в конце — к центру экрана (камера уже в юните)
      x = lerp(0.5, x, f); y = lerp(0.5, y, f);
      s = smoothstep(0.05, 0.75, k) * (1 - smoothstep(0.82, 1, k));
    } else s = -(1 - smoothstep(0.0, 1, k)) * smoothstep(0, 0.08, k);
    const L = this.lv();
    return [x, y, s * [0.55, 0.8, 0.95, 1][L], L === 0 ? 0.32 : 0.42];
  },
  post(now, split){
    if (typeof POST === 'undefined' || !POST.p) return;
    if (this.locP !== POST.p){ this.locP = POST.p; this.loc = gl.getUniformLocation(POST.p, 'uVx87'); this.locK = gl.getUniformLocation(POST.p, 'uK87'); }
    const dt = clamp((now - (this.lastNow || now)) / 1000, 0, 0.1); this.lastNow = now;
    const v = split ? null : this.vortex(dt), L = this.lv();
    this.cur = v;
    gl.useProgram(POST.p);
    if (this.loc) gl.uniform4f(this.loc, v ? v[0] : 0.5, v ? v[1] : 0.5, v ? v[2] : 0, v ? v[3] : 0.4);
    if (this.locK) gl.uniform1f(this.locK, L === 0 ? 0 : 0.6 + 0.4 * L + S.slow * 2.5);
    return v;
  },
  // ---------------------------------------------------------------- номер версии
  ver(h){ return typeof h === 'string' ? h.replace(/v7\.8 · /g, 'v' + this.VER + ' · ') : h; },
};
if (FX87.on){
  { const gs0 = gunShoot; gunShoot = function(src, eye, dir, W){ const w0 = FX87.curW, s0 = FX87.curSrc; FX87.curW = W; FX87.curSrc = src; try { return gs0.apply(this, arguments); } finally { FX87.curW = w0; FX87.curSrc = s0; } }; }
  { const at0 = addTracer; addTracer = function(a, b, team, w, inc){ const r = at0.apply(this, arguments); FX87.safe(() => FX87.onTracer(a, b, team, inc), 'trc'); return r; }; }
  tracersGather = function(push, near){ FX87.gather(push, near); };
  { const gd0 = gatherDistortion; gatherDistortion = function(){ const r = gd0.apply(this, arguments); const nw = FX87.safe(() => FX87.lensWaves(r[0]), 'lens'); return nw === undefined ? r : [nw, r[1]]; }; }
  { const rp0 = renderPost; renderPost = function(now, split){
      const v = FX87.safe(() => FX87.post(now, split), 'post');
      const x0 = S.xfer;
      if (v && !S.attract) S.xfer = min(1, (S.xfer || 0) * 1.25 + abs(v[2]) * 0.55);   // v6 VHS-срыв — сильнее на вселении/выходе
      try { return rp0.apply(this, arguments); } finally { S.xfer = x0; }
    }; }
  { const up0 = update; update = function(dt){ const r = up0.apply(this, arguments); FX87.safe(() => FX87.watch(), 'watch'); return r; }; }
}
// номер версии в главном меню — всегда (даже с ?fx87=0)
{
  if (typeof STATS75 !== 'undefined') STATS75.ver = FX87.VER;
  const hm0 = MENU.html_main; MENU.html_main = function(){ return FX87.ver(hm0.apply(this, arguments)); };
  if (typeof P71M !== 'undefined' && P71M.main){ const pm0 = P71M.main; P71M.main = function(){ return FX87.ver(pm0.apply(this, arguments)); }; }
  const al0 = MENU.applyLang; MENU.applyLang = function(){ const r = al0.apply(this, arguments); document.title = 'Portal Meteor — v' + FX87.VER; return r; };
}
