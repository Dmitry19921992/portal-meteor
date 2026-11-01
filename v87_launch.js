// =====================================================================
//  v8.7 — ВСЁ ПРИБЫВАЮЩЕЕ ВЫЛЕТАЕТ С БАЗЫ («вселенная замкнута сама на себя»).
//  • У штаба каждой фракции — пусковая площадка-шахта (меш ST70 v87pad: бетонная плита, створки, ферма, огни).
//  • Капсулы (захват точки, «Капсула с отрядом», покупка в казарме, подкрепления ИИ) и ящики снабжения 📦 стартуют с площадки:
//    свеча вверх → дуга к небу-порталу в точке, противоположной месту посадки → выход в антиподе прямо над целью → посадка.
//    Цель близко к базе (< 150 м) — короткая баллистическая дуга без портала. Пуск виден: пламя, дым, вспышки на куполе,
//    метки «⇧ ПУСК» / «☄» над капсулой, звук; тексты ленты/радио — «с базы запущена капсула».
//  • Нет живого штаба — пуск с форпоста (если есть), иначе капсул и ящиков нет (кнопки отвечают «нет штаба»).
//  • Авиаудары (ковровая, напалм): бомбардировщик взлетает с базы, уходит в небо-портал и выныривает над заходом на цель
//    (задержка удара +1.2 с — успеть увидеть взлёт).
//  Хуки — обёртки: podStep, usePower, BASE70.onCapture, S78.airdrop/dropPos/stepDrops, AIR81.start/parts, ST70.collect,
//  gatherParticles, drawOverlay, drawRTSOverlay, newMatch, feed. Выключить: ?lch87=0.
// =====================================================================
const LCH87 = {
  on: (() => { try { return new URLSearchParams(location.search).get('lch87') !== '0'; } catch (e){ return true; } })(),
  pads: [null, null], marks: [], err: {}, stats: { pods: 0, drops: 0, portal: 0, direct: 0, none: 0, outpost: 0, landed: 0, air: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('LCH87 ' + tag, e); } } },
  L: (ru, en) => tr(ru, en, en, en),
  lv(){ return typeof ADG80 !== 'undefined' ? clamp(ADG80.L | 0, 0, 3) : 1; },
  // ---------------------------------------------------------------- площадки
  makePads(){
    this.pads = [0, 1].map(t => {
      const h = S.hq[t]; if (!h) return null;
      const up = norm(h.pos), t1 = anyTangent(up), t2 = norm(cross(up, t1));
      let best = null, bs = -1;
      for (let i = 0; i < 16; i++){
        const a = i / 16 * PI * 2, f = norm(add(mul(t1, cos(a)), mul(t2, sin(a))));
        const d = offsetOnSphere(up, f, 31), p = surfacePoint(d, 0);
        let mn = 1e9; for (const b of S.buildings) if (b.alive) mn = min(mn, dist(b.pos, p));
        const sc = mn - abs(groundR(d) - RM) * 3;
        if (sc > bs){ bs = sc; best = { dir: d, f }; }
      }
      const Y = best.dir, Z = norm(tangent(best.f, Y)), X = norm(cross(Y, Z));
      return { team: t, dir: Y, pos: mul(Y, groundR(Y) + 0.05), X, Y, Z, glow: 0, open: 0, lastT: -99 };
    });
  },
  // точка старта для команды: площадка у живого штаба → форпост → нет
  src(t){
    const h = S.hq[t], P = this.pads[t];
    if (h && h.alive && P) return { pos: add(P.pos, mul(P.Y, 1.2)), pad: P, kind: 'pad' };
    const op = S.buildings.find(b => b.alive && b.done && b.team === t && b.type === 'outpost');
    if (op) return { pos: add(op.pos, mul(op.up || norm(op.pos), 6)), pad: null, kind: 'outpost' };
    return null;
  },
  noSrcTxt(){ return this.L('Нет штаба и форпоста — капсулу запускать неоткуда', 'No HQ or outpost — nowhere to launch a pod from'); },
  // ---------------------------------------------------------------- траектория: пуск → небо-портал → выход над целью
  plan(A, land, team){
    const a = norm(A), L = norm(land), Rd = S.R || DOME;
    const sd = surfDist(A, land);
    const o = { A, land, a, team, t: 0, Rd };
    if (sd < 150){ o.kind = 'direct'; o.T = clamp(1.1 + sd / 160, 1.1, 2.0); o.H = 55 + sd * 0.35; this.stats.direct++; }
    else {
      o.kind = 'portal'; o.b = mul(L, -1);
      const ang = Math.acos(clamp(dot(a, o.b), -1, 1)); o.ang = ang;
      o.T = clamp(1.5 + ang * Rd / 520, 1.6, 4.2);
      this.stats.portal++;
    }
    return o;
  },
  dirAt(a, b, g){   // slerp направлений
    const c = clamp(dot(a, b), -1, 1), w = Math.acos(c);
    if (w < 1e-4) return a;
    if (w > PI - 1e-3){ const t = anyTangent(a); return norm(add(mul(a, cos(w * g)), mul(t, sin(w * g)))); }
    const s = sin(w); return norm(add(mul(a, sin((1 - g) * w) / s), mul(b, sin(g * w) / s)));
  },
  posAt(o, s){
    if (o.kind === 'direct'){
      const L = norm(o.land), d = this.dirAt(o.a, L, s * s * (3 - 2 * s));
      return mul(d, lerp(len(o.A), groundR(L) + 40, s) + o.H * sin(PI * s));
    }
    const g = s * s, d = this.dirAt(o.a, o.b, g);
    const r = lerp(len(o.A), o.Rd - 1.5, 1 - Math.pow(1 - s, 2.4));
    return mul(d, r);
  },
  // вспышка и рябь на куполе (вход и выход портала)
  portalFx(p){
    const q = mul(norm(p), (S.R || DOME) - 3);
    addLight(q, [6, 4, 9], 60, 0.4, 0.004); addWave(q, 3.2, 0.9); burst(q, 14, 9, 0.5);
    if (S.cam && dist(S.cam.pos, q) < 220) S.flashT = max(S.flashT, 0.12);
  },
  exhaust(p, v, big, o, dt){
    const back = len(v) > 1e-3 ? norm(v) : norm(p), lo = this.lv() === 0;
    o.fT = (o.fT || 0) - dt; o.sT = (o.sT || 0) - dt;
    if (o.fT <= 0){ o.fT = lo ? 0.08 : 0.04; S.fx.push({ type: 'fire', pos: sub(p, mul(back, 1.6)), r0: big ? 1.4 : 0.9, r1: big ? 3 : 2.2, life: 0.35, t: 0, inten: 1 }); }
    if (o.sT <= 0){ o.sT = lo ? 0.25 : 0.12; S.fx.push({ type: 'smoke', pos: sub(p, mul(back, 2.5)), vel: mul(randUnit(), 0.5), r0: 1.4, r1: big ? 6 : 4.5, life: lo ? 2.2 : 3.5, t: 0, grey: 0.6, dens: 0.8, heat: 0.3 }); }
    addLight(p, [7, 3.5, 1.4], 30, 0.05, 0.01);
  },
  launchFx(src, team){
    const P = src.pad; if (P){ P.lastT = S.time; P.glow = 1; }
    const p = src.pos, up = norm(p);
    for (let i = 0; i < (this.lv() === 0 ? 3 : 7); i++) S.fx.push({ type: 'smoke', pos: add(p, add(mul(randUnit(), 3), mul(up, -0.5))), vel: add(mul(randUnit(), 2.5), mul(up, 0.6)), r0: 2, r1: 7, life: 5, t: 0, grey: 0.7, dens: 1.2, heat: 0.2 });
    fxExplosion(p, 1.1, true); addLight(p, [8, 5, 2], 40, 0.6, 0.006);
    emit('rocket', { pos: p, src: null }); emit('launch87', { pos: p, team });
    this.marks.push({ pos: add(p, mul(up, 6)), t: S.time, team, txt: '⇧ ' + this.L('ПУСК', 'LAUNCH') });
    if (this.marks.length > 8) this.marks.shift();
  },
  // ---------------------------------------------------------------- капсулы (S.pods)
  initPod(p){
    const src = this.src(p.team);
    if (!src){
      p.done = true; this.stats.none++;
      const T = S.teams[p.team];
      if (T){ if (p.by === 'buy') T.ore += pCost(p.team, 'pod'); else if (p.by !== 'cap70' && typeof POWERS !== 'undefined' && POWERS.pod) T.cmd = min(GAME.CMD_MAX || 99, T.cmd + POWERS.pod.cost); }
      if (p.team === 0 && !S.attract) feed('☄ ' + this.noSrcTxt(), '#f88');
      return false;
    }
    if (src.kind === 'outpost') this.stats.outpost++;
    p.v87 = this.plan(src.pos, p.to, p.team); p.v87.ph = 'up'; p.v87.from0 = p.from; p.v87.to0 = p.to;
    p.pos = src.pos.slice(); this.stats.pods++;
    this.launchFx(src, p.team);
    if (p.team === 0 && !S.attract && p.by !== 'cap70' && p.by !== 'buy') feed('🚀 ' + this.L('С базы запущена капсула с отрядом — через небо к цели', 'A squad pod is launched from the base — through the sky to the target'), TEAM[0].css);
    return true;
  },
  stepUp(o, dt, setPos){
    o.t += dt;
    const s = clamp(o.t / o.T, 0, 1), p = this.posAt(o, s), p2 = this.posAt(o, min(1, s + 0.02));
    const v = sub(p2, p); setPos(p, v);
    if (s < 1) this.exhaust(p, v, true, o, dt);
    return s >= 1;
  },
  podUp(p, dt){
    const o = p.v87;
    const done = this.stepUp(o, dt, (q, v) => { p.pos = q; const d = len(v) > 1e-4 ? norm(v) : norm(q); p.from = sub(q, mul(d, 2)); p.to = q; });
    if (!done) return;
    p.to = o.to0;
    if (o.kind === 'portal'){
      this.portalFx(o.b); const ex = mul(norm(o.land), (S.R || DOME) - 2); this.portalFx(ex);
      p.from = ex; p.pos = ex.slice(); p.dur = (p.dur || 3) + 0.3;
    } else { p.from = p.pos.slice(); p.dur = 0.7; }
    p.t = 0; o.ph = 'down';
  },
  // ---------------------------------------------------------------- ящики снабжения (S78.drops)
  dropPos(d){
    const o = d.v87;
    if (o.ph === 'up') return o.p || o.A;
    const k = min(1, d.t / d.T), H = o.kind === 'portal' ? (S.R || DOME) - len(d.to) - 2 : 40;
    return add(d.to, mul(d.dir, H * (1 - k) * (1 - k) + 0.1));
  },
  // ---------------------------------------------------------------- бомбардировщик: взлёт с базы → портал → заход
  planeAt(s, t){
    const o = s.v87; if (!o) return null;
    const t1 = s.delay - 1.6; if (t >= t1) return null;
    if (!o.ap){ o.ap = AIR81.planePos(Object.assign({}, s, { t: t1 })); o.X = mul(norm(o.ap), -(S.R || DOME) + 1.5); }
    const c = t1 * 0.55;
    if (t < c){ const q = t / c, d = this.dirAt(norm(o.A), norm(o.X), q * q); return mul(d, lerp(len(o.A), (S.R || DOME) - 1.5, 1 - Math.pow(1 - q, 2.2))); }
    if (!o.cross){ o.cross = 1; this.portalFx(o.X); this.portalFx(mul(o.X, -1)); }
    const q = (t - c) / (t1 - c), top = mul(norm(o.ap), (S.R || DOME) - 1.5);
    return add(mul(top, 1 - q * (2 - q)), mul(o.ap, q * (2 - q)));
  },
  // ---------------------------------------------------------------- рисование
  parts(n){
    if (!S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    for (const d of (typeof S78 !== 'undefined' ? S78.drops : [])){ const o = d.v87; if (!o || o.ph !== 'up' || !o.p) continue; const v = o.v || norm(o.p); push(o.p, 0.6, sub(o.p, mul(v, 2.4)), 3); }
    if (typeof AIR81 !== 'undefined') for (const s of AIR81.L){
      const p = this.planeAt(s, s.t); if (!p) continue;
      const p2 = this.planeAt(s, s.t + 0.03) || AIR81.planePos(Object.assign({}, s, { t: s.delay - 1.6 }));
      const f = norm(sub(p2, p)), up = norm(p), side = norm(cross(up, f));
      for (const k of [-1, 1]){ const e = add(p, mul(side, k * 4)); push(e, 0.55, sub(e, mul(f, 3)), 3); push(sub(e, mul(f, 3)), 0.12, sub(e, mul(f, 40)), 5); }
      push(add(p, mul(f, 5)), 0.35, sub(p, mul(f, 6)), 2);
      if (random() < 0.5) S.fx.push({ type: 'smoke', pos: sub(p, mul(f, 8)), vel: [0, 0, 0], r0: 1, r1: 3.5, life: 2.2, t: 0, grey: 0.75, dens: 0.6, heat: 0 });
    }
    return n;
  },
  collect(items){
    for (const P of this.pads){
      if (!P) continue;
      const h = S.hq[P.team]; if (!h || !h.alive) continue;
      if (S.cam && S.mode === 'fps' && dist(P.pos, S.cam.pos) > 260) continue;
      const k = clamp((S.time - P.lastT) / 3.5, 0, 1), op = k < 1 ? sin(PI * min(1, k * 1.4)) : 0;   // створки раскрываются на пуске
      const gl = 0.5 + 0.5 * sin(S.rtime * 3) + (1 - k) * 3;
      items.push({ m: 'v87pad', pos: P.pos, X: P.X, Y: P.Y, Z: P.Z, s: 1, team: P.team, sh: 1, flash: 0, glow: gl });
      for (const sd of [-1, 1]) items.push({ m: 'v87door', pos: add(add(P.pos, mul(P.X, sd * (1.25 + op * 2.2))), mul(P.Y, 0.55)), X: mul(P.X, sd), Y: P.Y, Z: P.Z, s: 1, team: P.team, sh: 1, flash: 0, glow: 0 });
    }
  },
  overlay(){
    if (!S.cam || S.attract) return;
    octx.save(); octx.textAlign = 'center'; octx.font = '700 12px "Exo 2", sans-serif';
    for (const m of this.marks){
      const a = S.time - m.t; if (a > 3) continue;
      const s = project(m.pos); if (!s) continue;
      octx.globalAlpha = 1 - a / 3; octx.fillStyle = m.team === 0 ? '#ffd27a' : '#ff8a6a'; octx.fillText(m.txt, s[0], s[1]);
    }
    octx.globalAlpha = 1;
    for (const p of S.pods){ const o = p.v87; if (!o || o.ph !== 'up') continue; const s = project(p.pos); if (!s) continue; octx.fillStyle = p.team === 0 ? '#9fdcff' : '#ff8a6a'; octx.fillText('☄ ↑', s[0], s[1] - 14); }
    octx.restore();
  },
};
// ---------------------------------------------------------------- модели площадки
if (typeof ST70_DEF !== 'undefined'){
  Object.assign(ST70_DEF, {
    v87pad(){   // бетонная плита-восьмиугольник, шахта, ферма обслуживания, сигнальные огни
      const g = G69();
      st70lathe(g, 0, -0.6, 0, [[0, 0], [0, 1.1], [4.6, 1.1], [5.4, 0.7], [5.6, 0]], 8, C70.CON, 1);
      st70ring(g, 0, 0.55, 0, 2.55, 0.16, C70.ST, 2, 32);
      st70lathe(g, 0, 0.3, 0, [[0, 0.1], [2.4, 0.1], [2.4, 0.3]], 24, C70.DK, 1);
      st70ring(g, 0, 0.62, 0, 4.4, 0.07, C70.AMB, 5, 40);
      for (let i = 0; i < 4; i++){ const a = i * PI / 2 + PI / 4; g69box(g, [Math.cos(a) * 4.8, 0.75, Math.sin(a) * 4.8], [0.22, 0.22, 0.22], 0.05, C70.RED, 5); }
      // ферма с консолью
      g69box(g, [0, 0.5, -4.3], [0.9, 0.3, 0.9], 0.1, C70.CON2, 1);
      for (const x of [-0.45, 0.45]) for (const z of [-4.75, -3.85]) g69tube(g, [x, 0.5, z], [x * 0.7, 9, z + (z < -4.3 ? 0.15 : -0.15)], 0.08, 0.06, 6, C70.ST, 2);
      for (const y of [2.5, 4.5, 6.5, 8.5]) g69box(g, [0, y, -4.3], [0.42, 0.05, 0.42], 0.02, C70.ST, 2);
      g69box(g, [0, 8.6, -2.6], [0.18, 0.18, 1.8], 0.04, C70.P, 0);
      g69box(g, [0, 9.2, -4.3], [0.15, 0.15, 0.15], 0.04, C70.AMB, 5);
      return g;
    },
    v87door(){   // створка шахты (половина люка), сдвигается на пуске
      const g = G69();
      g69box(g, [0, 0, 0], [1.22, 0.12, 2.4], 0.06, C70.P2, 2);
      for (const z of [-1.6, 0, 1.6]) g69box(g, [0, 0.14, z * 0.8], [1.0, 0.04, 0.1], 0.02, C70.AMB, 5);
      return g;
    },
  });
}
// ---------------------------------------------------------------- тексты: не «с орбиты», а «с базы»
{
  const RE = [
    ['орбита сбрасывает капсулу', 'с базы запущена капсула'], ['orbit is dropping a pod', 'a pod is launched from the base'],
    ['Капсула с отрядом летит к линии фронта', 'С базы запущена капсула с отрядом — через небо к линии фронта'], ['A squad pod is falling to the front line', 'A squad pod is launched from the base — through the sky to the front line'],
    ['Ящик снабжения: сброс через 4 секунды', 'Ящик снабжения: с базы запущена капсула'], ['Supply drop: landing in 4 seconds', 'Supply drop: a pod is launched from the base'],
    ['Стратег: сбрасываю тебе ящик снабжения', 'Стратег: запускаю тебе с базы ящик снабжения'], ['Strategist: dropping you a supply crate', 'Strategist: launching you a supply crate from the base'],
  ];
  const fix = t => { if (typeof t !== 'string') return t; for (const [a, b] of RE) if (t.indexOf(a) >= 0) t = t.replace(a, b); return t; };
  LCH87.fixTxt = fix;
  if (LCH87.on){
    const fd0 = feed; feed = function(text, color){ return fd0.call(this, fix(text), color); };
    const em0 = emit; emit = function(ev, o){ if (ev === 'radio' && o && typeof o.text === 'string') o.text = fix(o.text); return em0.apply(this, arguments); };
    if (typeof POWERS !== 'undefined' && POWERS.pod){ POWERS.pod.n = ['Капсула с отрядом', 'Squad pod', POWERS.pod.n[2]]; POWERS.pod.d = ['Запускает с базы капсулу со свежим отрядом: через небо-портал — к вашим силам.', 'Launches a pod with a fresh squad from the base: through the sky portal to your forces.', POWERS.pod.d[2]]; }
    if (typeof HQUP70 !== 'undefined' && HQUP70.drop) HQUP70.drop.n = ['Ускоренный пуск капсул', 'Faster pod launches', HQUP70.drop.n[2], HQUP70.drop.n[3]];
  }
}
// ---------------------------------------------------------------- хуки
if (LCH87.on){
  { const ps0 = podStep; podStep = function(p, dt){
      if (!p.carry && !p.v87 && !p.done){ if (!LCH87.safe(() => LCH87.initPod(p), 'init')){ if (p.done) return null; } }
      if (p.v87 && p.v87.ph === 'up'){ LCH87.safe(() => LCH87.podUp(p, dt), 'up'); return null; }
      const r = ps0.apply(this, arguments);
      if (p.done && p.v87) LCH87.stats.landed++;
      return r;
    }; }
  { const up0 = usePower; usePower = function(team, k, pt, by){
      if ((k === 'pod' || k === 'drop') && !LCH87.src(team)) return LCH87.noSrcTxt();
      return up0.apply(this, arguments);
    }; }
  if (typeof BASE70 !== 'undefined'){ const oc0 = BASE70.onCapture; BASE70.onCapture = function(cp, t){
      if (!cp.core && !S.attract && !LCH87.src(t)){ if (t === 0 && (S.time - ((cp.pod70 || [-1e9])[0])) > 150) feed(LCH87.L(`Точка ${cp.name} взята, но штаба нет — капсула не прилетит`, `Point ${cp.name} taken, but there is no HQ — no pod will come`), '#f88'); LCH87.stats.none++; return; }
      return oc0.apply(this, arguments);
    }; }
  if (typeof S78 !== 'undefined'){
    const ad0 = S78.airdrop; S78.airdrop = function(team, pt, by){
      const src = LCH87.src(team);
      if (!src){ LCH87.stats.none++; if (team === 0 && !S.attract) feed('📦 ' + LCH87.noSrcTxt(), '#f88'); return; }
      const n0 = this.drops.length; const r = ad0.apply(this, arguments);
      const d = this.drops[n0];
      if (d){ const o = LCH87.plan(src.pos, d.to, team); o.ph = 'up'; d.v87 = o; d.T = o.kind === 'portal' ? 3.2 : 0.8; LCH87.launchFx(src, team); LCH87.stats.drops++; }
      return r;
    };
    const dp0 = S78.dropPos; S78.dropPos = function(d){ return d.v87 ? LCH87.dropPos(d) : dp0.apply(this, arguments); };
    const sd0 = S78.stepDrops; S78.stepDrops = function(dt){
      for (const d of this.drops){ const o = d.v87; if (!o || o.ph !== 'up') continue;
        d.t -= dt;   // время посадки идёт только после выхода из портала
        const done = LCH87.stepUp(o, dt, (q, v) => { o.p = q; o.v = len(v) > 1e-4 ? norm(v) : norm(q); });
        if (done){ o.ph = 'down'; d.t = -dt; if (o.kind === 'portal'){ LCH87.portalFx(o.b); LCH87.portalFx(mul(norm(d.to), S.R || DOME)); } }
      }
      return sd0.apply(this, arguments);
    };
  }
  if (typeof AIR81 !== 'undefined'){
    const st0 = AIR81.start; AIR81.start = function(team, k, pt){
      const s = st0.apply(this, arguments);
      if (s && s.delay !== undefined){
        const src = LCH87.src(team), P = LCH87.pads[team];
        const A = src ? src.pos : mul(BASES[team], RM + 3);
        s.delay += 1.2; s.end += 1.2; s.v87 = { A }; LCH87.stats.air++;
        if (src) LCH87.launchFx(src, team);
        if (team === 0 && !S.attract) feed('✈ ' + LCH87.L('Бомбардировщик взлетел с базы — уходит в небо, выйдет над целью', 'The bomber took off from the base — into the sky, it will come out over the target'), TEAM[0].css);
      }
      return s;
    };
  }
  { const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); const m = LCH87.safe(() => LCH87.parts(n), 'par'); return m === undefined ? n : m; }; }
  if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect; ST70.collect = function(){ c0.apply(this, arguments); LCH87.safe(() => LCH87.collect(this.items), 'collect'); }; }
  { const do0 = drawOverlay; drawOverlay = function(){ const r = do0.apply(this, arguments); LCH87.safe(() => LCH87.overlay(), 'ov'); return r; }; }
  { const dr0 = drawRTSOverlay; drawRTSOverlay = function(){ const r = dr0.apply(this, arguments); LCH87.safe(() => LCH87.overlay(), 'ovr'); return r; }; }
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); LCH87.marks = []; LCH87.safe(() => LCH87.makePads(), 'pads'); return r; }; }
}
