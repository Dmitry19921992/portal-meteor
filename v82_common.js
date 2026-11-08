// =====================================================================
//  v8.2 — ФРАКЦИИ ГЛУБЖЕ (FAC82): общая часть
//   • уникальные здания фракций в BTYPES: Консорциум — «Бетонный барьер» (wall82), «Ремонтный пост» (rep82);
//     Рой — «Нора-туннель» (tun82) и её «Выход туннеля» (tunx82, появляется сам, в меню нет);
//   • чужие здания в меню не видны: ключи BTYPES другой фракции делаются неперечисляемыми (for…in / Object.keys
//     их не видят — ни ПК-панель, ни телефон, ни куратор), а BTYPES[key] при этом работает (ИИ другой фракции строит);
//   • модели новых зданий — процедурные меши v7.0 (ST70), рэймарчер их не рисует (objInfo → null), столкновения — bldSDF;
//   • подсказки: по одной короткой при первом доступе к способности фракции (FAC82.tip).
//  Логика фракций — v82_swarm.js (туннели, регенерация) и v82_cons.js (барьеры, ремонт, турели).
//  Хуки — только обёртки: objInfo, bldSDF, canBuild, siteProblem, ST70.collect, newMatch, SAVE.load, update. Выключить: ?fac82=0.
// =====================================================================
// тексты v8.2 называют фракции прямо («Рой», «Консорциум»), поэтому — мимо подмены названий v7.6 (там «Рой» = противник)
const T82 = function(){ return (typeof FAC76 !== 'undefined' && FAC76.tr0 ? FAC76.tr0 : tr).apply(this, arguments); };
const FAC82 = {
  on: (() => { try { return new URLSearchParams(location.search).get('fac82') !== '0'; } catch (e){ return true; } })(),
  err: {}, tips: {}, lt: null, MESH: {}, stats: { tips: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('fac82 ' + tag, e); } } },
  low(){ return S.quality === 0 || (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()); },
  sw(t){ return FI76(t) === 1; },
  co(t){ return FI76(t) === 0; },
  // уникальные здания ИИ строит только сам за себя: в бою — команда 1, в «бот против бота» (attract) — обе
  aiOk(t){ return this.on && (t === 1 || S.attract) && !(typeof TUT !== 'undefined' && TUT.on); },
  mine(type, t){ return S.buildings.filter(b => b.alive && b.team === t && b.type === type); },
  // одна короткая подсказка на матч (карточка HINTS + строка в ленте)
  // подсказка показывается один раз (запоминается в localStorage pm_tips82), в матче — не чаще одной в 20 с
  seen: (() => { try { return JSON.parse(localStorage.getItem('pm_tips82') || '{}'); } catch (e){ return {}; } })(),
  tipLast: -99,
  tip(id, ru, en){
    if (S.attract || this.tips[id] || this.seen[id] || (typeof TUT !== 'undefined' && TUT.on)) return false;
    if (S.rtime - this.tipLast < 20) return false;
    this.tips[id] = 1; this.seen[id] = 1; this.stats.tips++; this.tipLast = S.rtime;
    try { localStorage.setItem('pm_tips82', JSON.stringify(this.seen)); } catch (e){}
    const t = T82(ru, en);
    try { HINTS.show('f82_' + id, t, [], null, true); } catch (e){}
    feed('💡 ' + t, '#9cf');
    return true;
  },
};
// ---------------------------------------------------------------- здания
Object.assign(BTYPES, {
  wall82: { n: ['Бетонный барьер', 'Concrete barrier', 'Rào bê tông'], cost: 30, time: 6, hp: 1100, rad: 1.2, bound: 4.6, H: 1.7, code: 23, fac82: 0, lim82: 24,
            d: ['Консорциум. Секция стены 7 м: держит пули, снаряды и технику. Ставь цепочкой (Shift+клик).', 'Consortium. 7 m wall section: stops bullets, shells and vehicles. Chain them (Shift+click).', 'Liên minh. Tường 7 m: chặn đạn và xe.'] },
  rep82:  { n: ['Ремонтный пост', 'Repair post', 'Trạm sửa chữa'], cost: 160, time: 18, hp: 1800, rad: 3.0, bound: 7.5, H: 6.5, code: 23, fac82: 0, lim82: 2,
            d: ['Консорциум. Чинит технику, здания и пехоту в радиусе 26 м.', 'Consortium. Repairs vehicles, buildings and infantry within 26 m.', 'Liên minh. Sửa xe, công trình, bộ binh trong 26 m.'] },
  tun82:  { n: ['Нора-туннель', 'Tunnel burrow', 'Hang đường hầm'], cost: 150, time: 20, hp: 1500, rad: 3.0, bound: 5.5, H: 3.0, code: 23, fac82: 1, lim82: 2,
            d: ['Рой. Вход в туннель: потом «Прорыть выход» в точку до 220 м — пехота пройдёт под землёй.', 'Swarm. Tunnel entrance: then "Dig the exit" to a point up to 220 m away — infantry travels underground.', 'Bầy Đàn. Lối vào đường hầm.'] },
  tunx82: { n: ['Выход туннеля', 'Tunnel exit', 'Lối ra đường hầm'], cost: 0, time: 1, hp: 900, rad: 2.6, bound: 5.0, H: 2.6, code: 23, fac82: 1, lim82: 99, auto82: true,
            d: ['Рой. Выход туннеля. Разрушишь — туннель обвалится.', 'Swarm. Tunnel exit. Destroy it and the tunnel collapses.', 'Bầy Đàn. Lối ra đường hầm.'] },
});
FAC82.KEYS = ['wall82', 'rep82', 'tun82', 'tunx82'];
Object.assign(BICON, { wall82: '▬', rep82: '✚', tun82: '◉', tunx82: '◎' });
if (typeof UIX_ICON !== 'undefined') Object.assign(UIX_ICON.b, { wall82: '▬', rep82: '✚', tun82: '◉', tunx82: '◎' });
Object.assign(WORK_R, { wall82: 2.2, rep82: 4.0, tun82: 4.0, tunx82: 3.6 });
Object.assign(BLD_BC, { wall82: 0.8, rep82: 2.0, tun82: 1.2, tunx82: 1.0 }); Object.assign(BLD_SC, { wall82: 0.8, rep82: 1.5, tun82: 1.2, tunx82: 1.0 });
Object.assign(BLD_SR, { wall82: 1.2, rep82: 2.5, tun82: 2.4, tunx82: 2.0 }); Object.assign(BLD_BR, { wall82: 4.5, rep82: 7, tun82: 5.5, tunx82: 5 });
// меню: здания чужой фракции (и «Выход туннеля») — неперечисляемые
FAC82.menus = function(){
  const pf = FI76(0);
  for (const k of this.KEYS){ const B = BTYPES[k]; if (!B) continue;
    Object.defineProperty(BTYPES, k, { value: B, writable: true, configurable: true, enumerable: this.on && !B.auto82 && B.fac82 === pf }); }
};
FAC82.menus();
// ---------------------------------------------------------------- проверки стройки
{ const cb0 = canBuild;
  canBuild = function(team, type){
    const B = BTYPES[type];
    if (B && B.fac82 !== undefined){
      if (!FAC82.on) return T82('Выключено', 'Disabled');
      if (B.auto82) return T82('Появляется сам, когда туннель прорыт', 'Appears by itself when the tunnel breaks through');
      if (FI76(team) !== B.fac82) return T82('Только у фракции «' + FAC76.name(B.fac82) + '»', 'Only for ' + FAC76.name(B.fac82));
      if (S.buildings.filter(b => b.alive && b.team === team && b.type === type).length >= B.lim82) return T82(`Лимит: ${B.lim82}`, `Limit: ${B.lim82}`);
    }
    return cb0.apply(this, arguments);
  }; }
// ---------------------------------------------------------------- рисование: меши ST70, рэймарчер их не рисует
{ const oi0 = objInfo;
  objInfo = function(e){
    if (e && (e.tun82 || (e.cls === 'bld' && FAC82.MESH[e.type]))) return null;
    return oi0.apply(this, arguments);
  }; }
// столкновения (ходьба, пули, видимость)
{ const bs0 = bldSDF;
  bldSDF = function(b, x, y, z){
    const T = b.type;
    if (T !== 'wall82' && T !== 'rep82' && T !== 'tun82' && T !== 'tunx82') return bs0(b, x, y, z);
    const px = x - b.pos[0], py = y - b.pos[1], pz = z - b.pos[2];
    if (px*px + py*py + pz*pz > b.bound * b.bound) return 1e9;
    const qx = px*b.R[0] + py*b.R[1] + pz*b.R[2], qy = px*b.up[0] + py*b.up[1] + pz*b.up[2], qz = px*b.fwd[0] + py*b.fwd[1] + pz*b.fwd[2];
    const H = -1 + (b.H + 1) * max(0.05, b.built);
    let d;
    if (T === 'wall82') d = sdBox3(qx, qy - 0.55, qz, 3.5, 1.15, 0.7);
    else if (T === 'rep82') d = min(sdCylY(qx, qy - 0.1, qz, 2.6, 0.5), sdCapsule(qx, qy, qz, -1.2, 0, -1.2, -1.2, 6.2, -1.2, 0.35));
    else d = (hypot(qx * 0.95, qy * 1.25, qz + 0.6) - 2.5) * 0.8;   // курган норы (вход — яма впереди, без столкновения)
    return max(d, qy - H);
  }; }
// модель: { m: имя меша, sink: опустить при стройке на H }
FAC82.MESH = { wall82: 'wall82', rep82: 'rep82', tun82: 'tun82', tunx82: 'tunx82' };
if (typeof ST70_DEF !== 'undefined'){
  const C = C70, GRN = [0.2, 2.6, 1.0];
  Object.assign(ST70_DEF, {
    wall82(){   // три бетонных блока «нью-джерси» с полосой краски, арматура, мешки сверху
      const g = G69();
      for (const x of [-2.36, 0, 2.36]){
        g69box(g, [x, 0.0, 0], [1.13, 0.45, 0.72], 0.08, C.CON, 1);
        g69box(g, [x, 0.85, 0], [1.13, 0.45, 0.48], 0.1, C.CON, 1);
        g69box(g, [x, 1.42, 0], [1.13, 0.16, 0.34], 0.07, C.CON2, 1);
        g69box(g, [x, 0.62, 0.5], [1.0, 0.08, 0.03], 0.02, C.P, 0);        // полоса краски фракции
        g69box(g, [x, 0.62, -0.5], [1.0, 0.08, 0.03], 0.02, C.P, 0);
        for (const s of [-1, 1]) g69tube(g, [x + s * 0.7, 1.55, 0], [x + s * 0.7, 1.95, 0], 0.025, 0.025, 4, C.ST, 2);   // арматура-петли
      }
      for (let i = 0; i < 6; i++) g69box(g, [-2.9 + i * 1.16, 1.72, (i % 2) * 0.08 - 0.04], [0.5, 0.13, 0.26], 0.1, C.BAG, 1);
      return g;
    },
    rep82(){   // площадка, кран-мачта со стрелой, ремонтные манипуляторы, зелёные огни, ящики
      const g = G69();
      st70lathe(g, 0, -0.5, 0, [[0, 0], [0, 2.6], [0.75, 2.6], [0.85, 2.45], [0.85, 0]], 28, C.CON, 1);
      st70ring(g, 0, 0.38, 0, 2.2, 0.06, [1, 1, 1], 3, 36);
      for (let k = 0; k < 4; k++){ const a = k * PI / 2 + PI / 4; g69box(g, [Math.sin(a) * 2.35, 0.42, Math.cos(a) * 2.35], [0.12, 0.05, 0.12], 0.03, GRN, 5); }
      g69with(g, M34.T(-1.2, 0.3, -1.2), () => st70mast(g, 6.0, 0.4, 0.22, 0.05));
      g69box(g, [-1.2, 6.35, -1.2], [0.45, 0.3, 0.45], 0.08, C.P, 0);
      g69tube(g, [-1.2, 6.4, -1.2], [1.4, 6.0, 1.3], 0.12, 0.08, 8, C.P2, 0);      // стрела
      g69tube(g, [1.4, 6.0, 1.3], [1.4, 3.4, 1.3], 0.02, 0.02, 4, C.ST, 2);         // трос
      g69box(g, [1.4, 3.3, 1.3], [0.16, 0.12, 0.16], 0.04, C.AMB, 5);
      g69box(g, [-1.2, 6.75, -1.2], [0.07, 0.07, 0.07], 0.02, GRN, 5);
      for (const s of [-1, 1]){   // манипуляторы-сварки
        g69tube(g, [s * 1.3, 0.4, 1.0], [s * 1.6, 1.8, 1.4], 0.09, 0.07, 6, C.DK, 2);
        g69tube(g, [s * 1.6, 1.8, 1.4], [s * 1.1, 2.3, 2.0], 0.07, 0.05, 6, C.DK, 2);
        g69box(g, [s * 1.1, 2.3, 2.05], [0.08, 0.08, 0.1], 0.02, [1, 1, 1], 3);
      }
      g69box(g, [1.6, 0.55, -1.4], [0.45, 0.35, 0.4], 0.06, C.DK, 2);              // ящики с запчастями
      g69box(g, [1.0, 0.45, -1.8], [0.3, 0.25, 0.3], 0.05, C.P2, 0);
      g69box(g, [0.0, 0.62, -2.1], [0.8, 0.05, 0.02], 0.01, GRN, 5);               // табло «ремонт»
      return g;
    },
    tun82(){   // нора Роя: сегментированный панцирь-курган, рёбра, красный свет в пасти; впереди — тёмный зев ямы
      const g = G69();
      st70lathe(g, 0, -0.9, -0.6, [[0, 2.7], [0.8, 2.6], [1.6, 2.2], [2.3, 1.5], [2.75, 0.7], [2.9, 0]], 22, C.P, 0);
      for (let k = 0; k < 7; k++){ const a = -1.3 + k * 0.43; g69with(g, M34.ch(M34.T(0, -0.6, -0.6), M34.RY(a)), () => {
        g69tube(g, [0, 0, 2.7], [0, 1.55, 2.2], 0.16, 0.12, 6, C.DK, 2); g69tube(g, [0, 1.55, 2.2], [0, 2.2, 0.9], 0.12, 0.08, 6, C.DK, 2); }); }
      st70ring(g, 0, 0.9, 1.75, 0.95, 0.12, [1, 1, 1], 3, 24);                      // светящаяся пасть
      g69box(g, [0, 0.7, 1.95], [0.78, 0.55, 0.05], 0.3, [0.01, 0.01, 0.01], 2);
      // зев туннеля (яма в рельефе — воронка-«пин» CR76): тёмный диск у дна и кольцо зубцов по краю
      st70lathe(g, 0, -1.55, 4.5, [[0, 0], [0.02, 1.7], [0.0, 1.71]], 24, [0.008, 0.008, 0.01], 2);
      for (let k = 0; k < 10; k++){ const a = k * PI / 5; g69tube(g, [Math.sin(a) * 2.3, -0.5, 4.5 + Math.cos(a) * 2.3], [Math.sin(a) * 2.0, 0.55, 4.5 + Math.cos(a) * 2.0], 0.14, 0.03, 5, C.DK, 2); }
      for (let k = 0; k < 4; k++){ const a = k * PI / 2 + 0.4; g69box(g, [Math.sin(a) * 2.6, 0.1, 4.5 + Math.cos(a) * 2.6], [0.09, 0.09, 0.09], 0.03, C.RED, 5); }
      return g;
    },
    tunx82(){   // прорыв: развороченный панцирь, обломки грунта, зев
      const g = G69();
      for (let k = 0; k < 6; k++){ const a = -1.1 + k * 0.44; g69with(g, M34.ch(M34.T(0, -0.4, -0.4), M34.RY(a)), () => {
        g69tube(g, [0, 0, 2.2], [0, 1.3, 1.6], 0.15, 0.1, 6, C.P, 0); g69tube(g, [0, 1.3, 1.6], [0, 1.6, 0.6], 0.1, 0.05, 6, C.DK, 2); }); }
      st70ring(g, 0, 0.6, 1.3, 0.75, 0.1, [1, 1, 1], 3, 20);
      st70lathe(g, 0, -1.55, 4.5, [[0, 0], [0.02, 1.7], [0.0, 1.71]], 24, [0.008, 0.008, 0.01], 2);
      const R = seeded(82);
      for (let k = 0; k < 12; k++){ const a = R() * PI * 2, r = 2.4 + R() * 1.6, s = 0.25 + R() * 0.35;
        g69with(g, M34.ch(M34.T(Math.sin(a) * r, -0.15 + s * 0.4, 4.5 + Math.cos(a) * r), M34.RY(R() * 3)), () => g69box(g, [0, 0, 0], [s, s * 0.7, s * 0.9], s * 0.4, C.CON2, 1)); }
      for (let k = 0; k < 3; k++){ const a = k * 2.1 + 0.3; g69box(g, [Math.sin(a) * 2.5, 0.15, 4.5 + Math.cos(a) * 2.5], [0.08, 0.08, 0.08], 0.03, C.RED, 5); }
      return g;
    },
  });
}
// список мешей кадра: после построек v7.0 (там же v7.6 перекрашивает по фракциям; мы ставим фракцию сами)
if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect;
  ST70.collect = function(){
    c0.apply(this, arguments);
    if (!FAC82.on) return;
    FAC82.safe(() => {
      const fog = S.mode !== 'fps' && !S.attract;
      for (const b of S.buildings){
        const m = b.alive && FAC82.MESH[b.type]; if (!m) continue;
        if (fog && b.team !== 0 && fogHidden(b)) continue;
        const fr = st70frame(b.pos, b.fwd), sink = (1 - max(0.05, b.built)) * (b.H + 0.6);
        this.items.push({ m, pos: sink > 0.01 ? sub(fr.pos, mul(fr.Y, sink)) : fr.pos, X: fr.X, Y: fr.Y, Z: fr.Z, s: 1, team: FI76(b.team), t76: b.team, flash: b.flash || 0,
                          glow: b.type === 'tun82' || b.type === 'tunx82' ? 0.7 + 0.3 * sin(S.time * 3 + b.id) : 1 });
      }
    }, 'collect');
  }; }
// ---------------------------------------------------------------- матч, загрузка, кадр
{ const nm0 = newMatch;
  newMatch = function(){ const r = nm0.apply(this, arguments); FAC82.tips = {}; FAC82.lt = null; FAC82.safe(() => FAC82.menus(), 'menus'); FAC82.safe(() => FAC82.reset(), 'reset'); return r; }; }
{ const l0 = SAVE.load;
  SAVE.load = function(){ const r = l0.apply(this, arguments); if (r) FAC82.safe(() => FAC82.menus(), 'menusL'); return r; }; }
FAC82.resets = []; FAC82.steps = [];
FAC82.reset = function(){ this.aiT = [6, 9]; for (const f of this.resets) f(); };
{ const up0 = update;
  update = function(rdt){
    up0(rdt);
    if (S.paused || !FAC82.on) return;
    const dt = clamp(S.time - (FAC82.lt === null ? S.time : FAC82.lt), 0, 0.1); FAC82.lt = S.time;
    if (dt <= 0) return;
    for (const f of FAC82.steps) FAC82.safe(() => f(dt), f.tag || 'step');
  }; }
// ИИ: план стройки/заказов (общая точка для обеих фракций)
FAC82.plans = [];
{ const vp0 = V2.plan;
  V2.plan = function(t, plan, nFactory){ vp0.apply(this, arguments); if (FAC82.on) for (const f of FAC82.plans) FAC82.safe(() => f(t, plan, nFactory), 'plan'); }; }
// ИИ: своя стройка уникальных зданий раз в ~15 с (мимо общего плана: там стройка стоит, пока недостроены 2 здания,
// и инженеры часто заняты сбором кристаллов). Свободный инженер или сборщик (не инженер игрока) — ближайший к месту.
FAC82.aiQ = [];   // [{ t, key, want(t) → bool }]
FAC82.aiT = [6, 9];
FAC82.aiBuild = function(t, key){
  if (canBuild(t, key)) return false;
  const f = this.sites[key]; const dir = f && this.safe(() => f(t), 'site_' + key); if (!dir) return false;
  const L = teamBuilders(t).filter(b => !b.byPlayer && b.manualUntil < S.time && b.order !== 'retreat' && b.order !== 'build' && b.hp > b.maxhp * 0.4);
  if (!L.length) return false;
  if (placeBuilding(t, key, dir)) return false;
  const site = S.lastSite; L.sort((a, b) => surfDist(a.pos, site.pos) - surfDist(b.pos, site.pos));
  builderGive(L[0], site, false, false);
  return true;
};
FAC82.steps.push(Object.assign(function(dt){
  for (const t of [0, 1]){
    if (!FAC82.aiOk(t) || S.over || !S.teams[t].ai) continue;
    if ((FAC82.aiT[t] -= dt) > 0) continue; FAC82.aiT[t] = 12 + random() * 6;
    if (S.buildings.some(b => b.alive && b.team === t && !b.done && FAC82.KEYS.includes(b.type))) continue;   // своё уже строится
    for (const q of FAC82.aiQ) if (q.ok(t) && FAC82.aiBuild(t, q.key)) break;
  }
}, { tag: 'aibuild' }));
FAC82.sites = {};   // key → (t) => dir — где ИИ ставит уникальные здания
{ const as0 = aiSiteFor;
  aiSiteFor = function(t, key){ const f = FAC82.sites[key]; if (f){ const d = FAC82.safe(() => f(t), 'site_' + key); return d || null; } return as0.apply(this, arguments); }; }
// точка на поверхности: от a к b на m метров, затем вбок на s метров
FAC82.offs = function(a, toward, m, side, s){
  const a0 = norm(a), T0 = tangent(sub(toward, mul(a0, len(toward))), a0);
  let d = offsetOnSphere(a0, T0, m);
  if (s){ const L = norm(cross(d, tangent(T0, d))); d = offsetOnSphere(d, mul(L, side || 1), s); }
  return d;
};
// кольцо на поверхности сферы (радиус по дуге, без «провисания» плоского круга на больших радиусах)
FAC82.ring = function(dir, r, n){
  const t1 = anyTangent(dir), t2 = cross(dir, t1);
  octx.beginPath(); let on = false;
  for (let i = 0; i <= n; i++){
    const a = i / n * PI * 2, d = offsetOnSphere(dir, add(mul(t1, cos(a)), mul(t2, sin(a))), r), p = mul(d, RM + 1);
    const s = facing(p) ? project(p) : null;
    if (!s){ on = false; continue; } if (!on){ octx.moveTo(s[0], s[1]); on = true; } else octx.lineTo(s[0], s[1]);
  }
  octx.stroke();
};
// подсказки «впервые доступно»: проверка раз в секунду
FAC82.tipT = 0;
FAC82.steps.push(Object.assign(function(dt){
  if ((FAC82.tipT -= dt) > 0 || S.attract || S.over) return; FAC82.tipT = 1;
  if (S.mode === 'rts' && S.time > 25 && teamBuilders(0).length){
    if (FAC82.sw(0)) FAC82.tip('swarm', 'Рой: инженеры строят «Нору-туннель» — подкоп с выходом до 220 м, пехота пройдёт под землёй в тыл врагу. Отряды Роя дешевле и лечатся вне боя.', 'Swarm: builders can make a "Tunnel burrow" — dig an exit up to 220 m away and move infantry underground behind enemy lines. Swarm squads are cheaper and heal out of combat.');
    else FAC82.tip('cons', 'Консорциум: инженеры ставят «Бетонные барьеры» и «Ремонтный пост», турели дешевле и прочнее, инженеры сами чинят технику.', 'Consortium: builders place "Concrete barriers" and a "Repair post"; turrets are cheaper and tougher, builders repair vehicles on their own.');
  }
}, { tag: 'tips' }));
// панель групп v8.0 «Здания»: секции барьеров не перечисляем (их может быть 24 — панель утонет), нора/выход/пост — да
if (typeof G80 !== 'undefined' && G80.blds){ const bl0 = G80.blds; G80.blds = function(){ return bl0.apply(this, arguments).filter(b => b.type !== 'wall82'); }; }

// описание заказов фракций (d76) — без подмены названий (иначе за Рой «Рой. …» превращалось в «Консорциум. …»; так было и у v7.6)
if (typeof uixProdDesc === 'function' && typeof FAC76 !== 'undefined'){ const pd0 = uixProdDesc;
  uixProdDesc = function(k){ const P = PRODUCTS[k]; if (P && P.d76) return T82(P.d76[0], P.d76[1]) + ' ' + tr('Где: ', 'At: ') + P.at.map(a => a === 'hq' ? tr('штаб', 'HQ') : bname(a)).join(' / ') + '.'; return pd0.apply(this, arguments); }; }
// заголовок вкладки тестовой сборки (как у v8.0/v8.1)
{ const al0 = MENU.applyLang; MENU.applyLang = function(){ const r = al0.apply(this, arguments); if (window.PM_ART80 || /v8[012]/.test(location.pathname)) document.title = 'Portal Meteor v8.2 test'; return r; }; }
// состояние зданий v8.2 в подписях стратегии (rts61) — вместо «простаивает»
if (typeof r61BldState === 'function'){ const bs0 = r61BldState;
  r61BldState = function(b){
    if (!b || b.cls !== 'bld' || !b.done || !FAC82.MESH[b.type]) return bs0.apply(this, arguments);
    if (b.type === 'wall82') return T82('укрытие', 'cover');
    if (b.type === 'rep82') return T82('чинит в 26 м', 'repairs within 26 m');
    if (b.type === 'tunx82') return T82('выход туннеля', 'tunnel exit');
    const s = typeof TUN82 !== 'undefined' ? TUN82.st(b) : null; if (!s) return bs0.apply(this, arguments);
    if (s.st === 'dig') return T82('роет выход', 'digging the exit') + ' ' + Math.floor(clamp(b.prodT / pTime(b.team, 'tdig82'), 0, 1) * 100) + '%';
    return s.st === 'open' ? T82('туннель открыт', 'tunnel open') : T82('выход не прорыт', 'no exit yet');
  }; }
