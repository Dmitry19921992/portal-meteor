// =====================================================================
//  v8.0 — ВОРОНКИ ПО КАЛИБРУ и «E в воздухе» (CR80). Поверх v7.6 CR76 (формула рельефа и шейдер не меняются):
//   • размер воронки задаёт калибр, а не только радиус поражения:
//       ручная граната — маленькая (R≈1.4 м, глубина ≈0.4; раньше гранаты воронок не делали),
//       ракета / базука / танковый снаряд / миномёт / бомба / капсула — средняя (R≈3, глубина ≈0.95),
//       артиллерия / «Град» / РСЗО / орбитальный удар — большая (R≈5.6, глубина ≈2);
//   • воронка под предметом: ящики снабжения (S78) и 3D-модели окружения (AS75) опускаются вместе с грунтом —
//     раньше ящик мог остаться висеть в воздухе с подсказкой «E — взять ящик»;
//   • ящик «у здания» исчезает вместе со зданием (раньше оставался с E у руин).
//  Хуки — обёртки: splash, G62.boom, CR76.size, CR76.add, S78.stepCrates. Выключить: ?cr80=0.
// =====================================================================
const CR80 = {
  on: (() => { try { return new URLSearchParams(location.search).get('cr80') !== '0'; } catch (e){ return true; } })(),
  cal: null, hand: false, err: 0, stats: { small: 0, medium: 0, large: 0, moved: 0, bldCrates: 0 },
  SZ: { small: [1.4, 0.38, 6], medium: [3.0, 0.95, 4.5], large: [5.6, 2.0, 8] },   // R, глубина, «типичный» радиус поражения
  safe(fn){ try { return fn(); } catch (e){ if (!this.err){ this.err = 1; console.warn('CR80', e); } } },
  classify(pt, src){
    if (this.hand) return 'small';
    if (pt === 'a' || pt === 'x') return 'large';
    if (pt === 'r' || pt === 's' || pt === 'g') return 'medium';
    return null;
  },
};
if (CR80.on && typeof CR76 !== 'undefined'){
  // ручная граната (G62) — отметка на время взрыва
  if (typeof G62 !== 'undefined' && G62.boom){ const b0 = G62.boom; G62.boom = function(){ CR80.hand = true; try { return b0.apply(this, arguments); } finally { CR80.hand = false; } }; }
  const sz0 = CR76.size;
  CR76.size = function(radius, dmg){
    const c = CR80.cal; if (!c) return sz0.apply(this, arguments);
    const Z = CR80.SZ[c], k = clamp(radius / Z[2], 0.8, 1.2);
    CR80.stats[c]++;
    return { r: Z[0] * k, D: Z[1] * k };
  };
  // предметы на грунте: запомнить высоту над грунтом до воронки и вернуть её после
  const add0 = CR76.add;
  CR76.add = function(p){
    const keep = [], dir = norm(p);
    CR80.safe(() => {
      const near = d => surfDist(d, dir) < 20;
      if (typeof S78 !== 'undefined') for (const k of S78.crates) if (near(k.dir)) keep.push({ o: k, h: len(k.pos) - groundR(k.dir), crate: 1 });
      if (typeof AS75 !== 'undefined' && AS75.items) for (const it of AS75.items) if (!it.s78 && it.dir && near(it.dir)) keep.push({ o: it, h: len(it.pos) - groundR(it.dir) });
    });
    const r = add0.apply(this, arguments);
    if (r) CR80.safe(() => {
      for (const K of keep){
        const o = K.o, d = o.dir, np = mul(d, groundR(d) + K.h), dh = len(np) - len(o.pos);
        if (abs(dh) < 0.02) continue;
        o.pos = np; CR80.stats.moved++;
        if (K.crate){ if (o.it){ o.it.pos = sub(o.pos, mul(o.it.Y, 0.08)); o.it.cen = add(o.pos, mul(o.it.Y, o.it.h * 0.5)); } }
        else if (o.cen) o.cen = add(o.cen, mul(d, dh));
      }
    });
    return r;
  };
  // калибр — на время splash (внутри него CR76 решает, делать ли воронку, и зовёт CR76.add → CR76.size)
  const sp0 = splash;
  splash = function(p, team, dmg, radius, src, ptype){
    const pt = ptype || 'g';
    CR80.cal = CR80.classify(pt, src);
    try {
      const r = sp0.apply(this, arguments);
      // CR76 пропускает «ручные» взрывы (тип g от пехотинца): граната — маленькая воронка, капсула игрока — средняя
      if (pt === 'g' && src && src.cls === 'inf' && dmg >= 20 && radius >= 2) CR80.safe(() => CR76.add(p, radius, dmg));
      return r;
    } finally { CR80.cal = null; }
  };
}
// ящик снабжения у разрушенного здания — убрать вместе со зданием (без «E — взять ящик» у руин)
if (CR80.on && typeof S78 !== 'undefined' && S78.stepCrates){
  const st0 = S78.stepCrates;
  S78.stepCrates = function(){
    for (let i = this.crates.length - 1; i >= 0; i--){
      const k = this.crates[i];
      if (k.kind === 'bld' && k.b && !k.b.alive){
        this.crates.splice(i, 1); CR80.stats.bldCrates++;
        if (k.it && typeof AS75 !== 'undefined' && AS75.items) AS75.items = AS75.items.filter(x => x !== k.it);
      }
    }
    return st0.apply(this, arguments);
  };
}
