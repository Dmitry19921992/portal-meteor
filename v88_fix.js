// =====================================================================
//  v8.8 — МЕЛКИЕ ИСПРАВЛЕНИЯ ПО ОТЧЁТАМ v8.4–v8.7 (FIX88)
//  • Мини-барьер «Командира» (v8.5): место проверяется — без скал/озёр, крутых склонов, зданий, обломков, маяков точек
//    и пусковых площадок; перебираются соседние места перед отрядом (snap), нет места — отказ без перезарядки.
//  • Верданы (v8.6): ×1.6 крупнее (модель и хитбокс), ярче светящиеся части — силуэт читается издалека.
//  • Пусковая площадка у штаба (v8.7): на ней и рядом нельзя строить (игрок, ИИ, барьеры) — «Мешает пусковая площадка».
//  • Номер версии в меню — v8.8.
//  Хуки: обёртки siteProblem, CMD85.fx, VER86.collect; значения VER86.SP, FX87.VER. Новый код только здесь.
// =====================================================================
const FIX88 = {
  err: {}, VS: 1.6, PAD_R: 5.6,
  stats: { barOk: 0, barSnap: 0, barNo: 0, padBlock: 0 },
  L: (ru, en) => tr(ru, en, en, en),
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('FIX88 ' + tag, e); } } },
  padNear(dir, r){
    if (typeof LCH87 === 'undefined' || !LCH87.pads) return false;
    for (const P of LCH87.pads) if (P && surfDist(dir, P.dir) < this.PAD_R + r) return true;
    return false;
  },
  // ---------------------------------------------------------------- место мини-барьера
  barrierProblem(dir){
    const T = BTYPES.wall82, rad = T ? T.rad : 1.2;
    dir = norm(dir);
    if (typeof TER81 !== 'undefined' && TER81.ready){ if (TER81.near(dir, 2)) return 'rock'; const p = mul(dir, groundR(dir)); if (TER81.lakeAt(p) || TER81.inHangar(p)) return 'rock'; }
    for (const b of S.buildings) if (b.alive && surfDist(dir, b.up || norm(b.pos)) < (b.rad || 2) + rad + 1) return 'bld';
    for (const p of PROPS) if (surfDist(dir, p.dir) < p.bound * 0.8 + rad) return 'bld';
    for (const cp of S.cps) if (surfDist(dir, cp.dir) < 7 + rad) return 'bld';
    if (this.padNear(dir, rad + 1)) return 'pad';
    const t = anyTangent(dir), t2 = cross(dir, t), ang = 2.4 / RM, gr = groundR(dir);
    let hmin = 1e9, hmax = -1e9;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const h = groundR(norm(add(dir, add(mul(t, a * ang), mul(t2, b * ang))))); hmin = min(hmin, h); hmax = max(hmax, h); }
    if (hmax - hmin > 1.4 || abs(gr - (hmin + hmax) / 2) > 1.0) return 'steep';
    return null;
  },
  barrierSite(L, f){
    const up = norm(L.pos);
    let first = null;
    for (const [da, d] of [[0, 4.5], [0.35, 4.5], [-0.35, 4.5], [0, 6], [0, 3.5], [0.7, 4.5], [-0.7, 4.5], [0.35, 6], [-0.35, 6], [1.1, 4], [-1.1, 4]]){
      const t2 = norm(cross(up, f)), ff = norm(add(mul(f, cos(da)), mul(t2, sin(da))));
      const dir = offsetOnSphere(up, ff, d), why = this.barrierProblem(dir);
      if (!why) return { dir, f: ff, snap: da !== 0 || d !== 4.5 };
      if (!first) first = why;
    }
    return { why: first };
  },
  whyText(w){
    return w === 'steep' ? this.L('слишком круто', 'too steep') : w === 'pad' ? this.L('мешает пусковая площадка', 'the launch pad is in the way')
      : w === 'bld' ? this.L('мешают постройки', 'buildings in the way') : this.L('мешают скалы', 'rocks in the way');
  },
  // ---------------------------------------------------------------- верданы крупнее
  vscale(items, i0, g, s){
    for (let i = i0; i < items.length; i++){
      const it = items[i];
      it.pos = add(g, mul(sub(it.pos, g), s)); it.X = mul(it.X, s); it.Y = mul(it.Y, s); it.Z = mul(it.Z, s);
      if (typeof it.glow === 'number') it.glow = it.glow * 1.45 + 0.35;
    }
  },
};
// ---------------------------------------------------------------- площадка: не строить сверху (игрок, ИИ, все типы)
{ const sp0 = siteProblem; siteProblem = function(team, type, dir){
    const r = sp0.apply(this, arguments); if (r) return r;
    const T = BTYPES[type];
    if (FIX88.safe(() => FIX88.padNear(norm(dir), (T && T.rad || 2) + 1.5), 'pad')){ FIX88.stats.padBlock++; return FIX88.L('Мешает пусковая площадка', 'The launch pad is in the way'); }
    return null;
  }; }
// ---------------------------------------------------------------- мини-барьер с проверкой места
if (typeof CMD85 !== 'undefined' && CMD85.fx){ const fx0 = CMD85.fx; CMD85.fx = function(g, k, pt, ent){
    if (k !== 'barrier') return fx0.apply(this, arguments);
    const L = leaderOf(g); if (!L) return fx0.apply(this, arguments);
    const res = FIX88.safe(() => {
      const up = norm(L.pos), fp = g.foePos || (S.hq[1] && S.hq[1].pos) || mul(BASES[1], RM);
      let f = tangent(sub(fp, L.pos), up); f = len(f) > 1e-3 ? norm(f) : anyTangent(up);
      const s = FIX88.barrierSite(L, f);
      if (!s.dir){ FIX88.stats.barNo++; return FIX88.L('нет места', 'no room') + ' — ' + FIX88.whyText(s.why); }
      const b = makeBuilding('wall82', 0, s.dir, s.f);
      b.done = true; b.built = 1; b.hp = b.maxhp; b.c85exp = S.time + 40;
      if (typeof bgridDirty === 'function') bgridDirty();
      this.walls.push(b); fxSmoke(add(b.pos, mul(b.up, 1)), 1.2, 0.3);
      emit('place', { b });
      FIX88.stats.barOk++; if (s.snap) FIX88.stats.barSnap++;
      return '';
    }, 'barrier');
    if (res === undefined) return fx0.apply(this, arguments);
    return res || null;
  }; }
// ---------------------------------------------------------------- верданы ×1.6
if (typeof VER86 !== 'undefined'){
  for (const k in VER86.SP){ const K = VER86.SP[k]; K.rad *= FIX88.VS; K.h *= FIX88.VS; }
  const c0 = VER86.collect; VER86.collect = function(items){
    const L = this.L, S6 = FIX88.VS;
    if (!L || !L.length || !items) return c0.apply(this, arguments);
    try {
      for (const f of L){
        const g = mul(f.dir, f.g), p0 = f.pos, i0 = items.length;
        f.pos = add(g, mul(sub(p0, g), 1 / S6));   // модель строится по «старому» росту, потом растягивается от земли
        this.L = [f];
        try { c0.call(this, items); } finally { f.pos = p0; }
        FIX88.vscale(items, i0, g, S6);
      }
    } catch (e){ FIX88.safe(() => { throw e; }, 'vcollect'); }
    finally { this.L = L; }
  };
}
// ---------------------------------------------------------------- версия
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.8'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.8'; }
