// =====================================================================
//  v7.6 — ВЫБОР ФРАКЦИИ И АСИММЕТРИЧНЫЕ ФРАКЦИИ
//  Команда 0 — всегда игрок (верхняя база), команда 1 — ИИ-стратег. Фракция — «раса» команды:
//    фракция 0 «Консорциум» — тяжёлая пехота в силовой броне (беж/олива), броня и артиллерия;
//    фракция 1 «Рой» — тёмная сталь и красные визоры, скорость, дроны, тяжёлые одиночные выстрелы с искажением.
//  FI76(team) → индекс фракции (модели и цвета в шейдере, техника vehicles2.js, статы). Игрок выбирает фракцию
//  перед матчем (запоминается SET.fac76); ИИ играет другой. Обучение — всегда за Консорциум.
//  Хуки в чужом коде: FI76(...) в vehicles2.js / render.js / game.js (makeTank) / v69_guns.js / squad.js,
//  uFac76 в scene.glsl (штабы, площадки, маяки). Остальное — обёртки здесь.
// =====================================================================
var FAC76_F = [0, 1];                       // var: читается из функций, вызванных до инициализации модуля
function FI76(t){ const f = FAC76_F; return f && (t === 0 || t === 1) ? f[t] : t; }
if (SET_DEF.fac76 === undefined) SET_DEF.fac76 = 0;
if (SET.fac76 === undefined) SET.fac76 = 0;
SCENE_U.push('uFac76');
const FAC76 = {
  // статы фракций (множители к общим правилам). Таблица — в REPORT_v76fac.md
  ST: [
    { infHp: 1.12, infWalk: 0.93, jet: 1.0, jetRg: 1.0, out: {}, inArmor: 1.0 },
    { infHp: 0.92, infWalk: 1.10, jet: 1.2, jetRg: 1.15, out: { b: 1.04, l: 1.2, s: 1.2, r: 1.1 }, inArmor: 1.0 },
  ],
  TEAM0: [{ css: '#d6c69a', dim: '#8f8664' }, { css: '#ff4a3a', dim: '#a8302a' }],
  forceTut: false, playerFac: 0,
  flip(){ return FAC76_F[0] === 1; },
  name(f){ return FAC76.tr0(...[['Консорциум', 'Consortium', 'Liên minh', 'הקונסורציום'], ['Рой', 'Swarm', 'Bầy Đàn', 'הנחיל']][f]); },
  setMap(f){
    FAC76_F = [f[0] | 0, f[1] | 0];   // цвета интерфейса (TEAM) не меняем: свои — песочные, враги — красные, как привычно
    FAC76.cache.clear();
  },
  // ---- тексты: в матче за Рой «Рой» в старых строках означает противника — меняем названия местами
  cache: new Map(),
  RU: { 'Рой': 'Консорциум', 'Роя': 'Консорциума', 'Рою': 'Консорциуму', 'Роем': 'Консорциумом', 'Рое': 'Консорциуме' },
  swapT(s){
    if (typeof s !== 'string' || s.length < 3) return s;
    const c = this.cache.get(s); if (c !== undefined) return c;
    let o = s;
    if (/Ро[йяюе]|Консорциум|Swarm|SWARM|Consortium|CONSORTIUM|Bầy Đàn|BẦY ĐÀN|Liên minh|LIÊN MINH|הנחיל|הלהקה|הקונסורציום/.test(s)){
      const RU = this.RU, RV = this.RV || (this.RV = Object.fromEntries(Object.entries(RU).map(([a, b]) => [b, a])));
      o = o.replace(/(?<![А-Яа-яЁё-])(Консорциум(?:ом|а|у|е)?|Ро(?:ем|й|я|ю|е))(?![-А-Яа-яЁё])/g, w => RU[w] || RV[w] || w);
      o = o.replace(/\b(Swarm|SWARM|Consortium|CONSORTIUM)\b(?!-)/g, w => ({ Swarm: 'Consortium', SWARM: 'CONSORTIUM', Consortium: 'Swarm', CONSORTIUM: 'SWARM' })[w]);
      o = o.replace(/Bầy Đàn|BẦY ĐÀN|Liên minh|LIÊN MINH/g, w => ({ 'Bầy Đàn': 'Liên minh', 'BẦY ĐÀN': 'LIÊN MINH', 'Liên minh': 'Bầy Đàn', 'LIÊN MINH': 'BẦY ĐÀN' })[w]);
      o = o.replace(/הנחיל|הלהקה|הקונסורציום/g, w => w === 'הקונסורציום' ? 'הנחיל' : 'הקונסורציום');
    }
    if (this.cache.size > 3000) this.cache.clear();
    this.cache.set(s, o);
    return o;
  },
};
{ const tr0 = tr; FAC76.tr0 = tr0;
  tr = function(){ const s = tr0.apply(this, arguments); return FAC76_F[0] === 1 ? FAC76.swapT(s) : s; }; }
{ const tn0 = teamName; teamName = function(t){ return FAC76.name(FI76(t)); }; }
tankName = function(t){ return N2(TANK_NAME[FI76(t)]); };

// ---------------------------------------------------------------- уникальные юниты и улучшения
Object.assign(PRODUCTS, {
  rhino76:  { n: ['Штурмовой танк «Носорог»', 'Assault tank "Rhino"', 'Xe tăng xung kích "Rhino"'], cost: 330, time: 30, at: ['factory'], icon: '◼', fac76: 0, lim76: 2,
              d76: ['Консорциум. Сверхтяжёлый танк: 2300 прочности, пушка +45 % урона, медленный.', 'Consortium. Super-heavy tank: 2300 hull, cannon +45% damage, slow.'] },
  plates76: { n: ['Керамитовые плиты', 'Ceramite plates', 'Giáp ceramite'], cost: 300, time: 60, at: ['hq'], research: true, max: 1, icon: '⛊', fac76: 0,
              d76: ['Консорциум. −13 % урона по всей пехоте и технике.', 'Consortium. −13% damage taken by all infantry and vehicles.'] },
  pack76:   { n: ['Стая дронов', 'Drone pack', 'Bầy drone'], cost: 140, time: 14, at: ['hub'], icon: '⁂', fac76: 1,
              d76: ['Рой. Сразу 3 боевых дрона со скидкой.', 'Swarm. Three combat drones at once, at a discount.'] },
  phase76:  { n: ['Фазовые ранцы', 'Phase jetpacks', 'Ba lô pha'], cost: 300, time: 60, at: ['hq'], research: true, max: 1, icon: '⇮', fac76: 1,
              d76: ['Рой. Пехота +8 % скорости, ранцы заряжаются в 1.5 раза быстрее.', 'Swarm. Infantry +8% speed, jetpacks recharge 1.5× faster.'] },
});
FAC76.stats = function(team){ return FAC76.ST[FI76(team)] || FAC76.ST[0]; };
FAC76.applyInf = function(u){
  if (!u || u.cls !== 'inf' || u.team > 1) return;
  const F = FAC76.stats(u.team), T = S.teams[u.team] || {};
  u.maxhp = round(u.maxhp * F.infHp); u.hp = u.maxhp;
  u.walk = u.walk * F.infWalk * (T.phase76 ? 1.08 : 1); u._w76 = u.walk;
};
{ const mi0 = makeInf; makeInf = function(){ const e = mi0.apply(this, arguments); FAC76.applyInf(e); return e; }; }
{ const at0 = addToSquad;   // v7.4 «классы отрядов» сбрасывают hp/скорость по роли — применяем снова
  addToSquad = function(){ const u = at0.apply(this, arguments); if (u && u._w76 !== u.walk){ const R = roleOf(u); u.maxhp = round(R.hp * (u.elite ? 1.5 : 1) + (u.leader ? 40 : 0)); u.walk = RULES.WALK * R.speed; FAC76.applyInf(u); } return u; }; }
{ const jo0 = jetOf;
  jetOf = function(u){
    const J = jo0.apply(this, arguments); if (!u || u.team > 1) return J;
    const F = FAC76.stats(u.team), T = S.teams && S.teams[u.team] || {};
    const rg = F.jetRg * (T.phase76 ? 1.5 : 1);
    if (F.jet === 1 && rg === 1) return J;
    return Object.assign({}, J, { emax: J.emax * F.jet, rg: J.rg * rg, ra: J.ra * rg });
  }; }
{ const dm0 = damage;
  damage = function(e, dmg, src, ptype){
    if (e && e.alive && dmg > 0){
      const pt = ptype || 'b';
      if (src && (src.team === 0 || src.team === 1)){
        const k = FAC76.stats(src.team).out[pt]; if (k) dmg *= k;
        if (src.rhino76 && pt === 's') dmg *= 1.45;
      }
      if ((e.team === 0 || e.team === 1) && e.cls !== 'bld' && e.cls !== 'hq' && e.cls !== 'prop'){
        dmg *= FAC76.stats(e.team).inArmor;
        if (S.teams[e.team] && S.teams[e.team].plates76) dmg *= 0.87;
      }
    }
    return dm0.call(this, e, dmg, src, ptype);
  }; }
// стоимость и лимиты
{ const pc0 = pCost;
  pCost = function(team, key){ const c = pc0.apply(this, arguments); return key === 'drone' && FI76(team) === 1 ? Math.round(c * 0.75) : c; }; }
{ const cp0 = canProduce;
  canProduce = function(team, key){
    const P = PRODUCTS[key]; if (!P) return cp0.apply(this, arguments);
    if (P.fac76 !== undefined && FI76(team) !== P.fac76) return FAC76.tr0('Только у фракции «' + FAC76.name(P.fac76) + '»', 'Only for ' + FAC76.name(P.fac76), 'Chỉ cho ' + FAC76.name(P.fac76));
    if (key === 'rhino76' && S.vehicles.filter(v => v.alive && v.team === team && v.rhino76).length + countQueued(team, ['rhino76']) >= P.lim76) return tr(`Лимит: ${P.lim76}`, `Limit: ${P.lim76}`, `Limit: ${P.lim76}`);
    const sw = FI76(team) === 1, m0 = GAME.MAX_DRONES, ml = PRODUCTS.mlrs && PRODUCTS.mlrs.unlock;
    if (sw) GAME.MAX_DRONES = Math.round(m0 * 1.5);
    if (FI76(team) === 0 && PRODUCTS.mlrs) PRODUCTS.mlrs.unlock = 300;   // «Град» у Консорциума — с 5:00 (у Роя «Улей» — с 7:00)
    try {
      if ((key === 'pack76' || key === 'rhino76') && S.teams[team].ore < pCost(team, key)){ const why = cp0.call(this, team, key === 'pack76' ? 'drone' : 'tank'); return why || tr('Мало руды', 'Not enough ore', 'Không đủ quặng'); }
      if (key === 'pack76'){ const why = cp0.call(this, team, 'drone'); if (why) return why; if (countProduct(team, 'drone') + 3 > GAME.MAX_DRONES) return tr('Лимит дронов', 'Drone limit', 'Đã đạt giới hạn drone'); }
      if (key === 'rhino76'){ const why = cp0.call(this, team, 'tank'); if (why) return why; }
      return cp0.apply(this, arguments);
    } finally { GAME.MAX_DRONES = m0; if (PRODUCTS.mlrs) PRODUCTS.mlrs.unlock = ml; }
  }; }
{ const fp0 = finishProduct;
  finishProduct = function(site, key){
    const t = site.team;
    if (key === 'rhino76'){
      const n0 = S.vehicles.length; fp0.call(this, site, 'tank');
      const v = S.vehicles.length > n0 ? S.vehicles[S.vehicles.length - 1] : null;
      if (v){ v.rhino76 = true; v.hp = v.maxhp = 2300; v.walk = 5.2; v.hitR = 2.7; }
      return;
    }
    if (key === 'pack76'){ for (let i = 0; i < 3; i++) fp0.call(this, site, 'drone'); return; }
    if (key === 'plates76' || key === 'phase76'){
      const T = S.teams[t]; T[key] = 1;
      if (key === 'phase76') for (const u of S.units) if (u.alive && u.team === t){ u.walk *= 1.08; u._w76 = u.walk; u.jet = jetOf(u); }
      if (t === 0 && !S.attract){ feed(tr('Исследование завершено: ', 'Research complete: ', 'Nghiên cứu xong: ') + pname(key), TEAM[0].css); emit('radio', { text: tr('Исследование завершено. ', 'Research complete. ', 'Nghiên cứu xong. ') + pname(key), pri: 1 }); }
      return;
    }
    return fp0.apply(this, arguments);
  }; }
{ const gl0 = groupLabel;
  groupLabel = function(g){ if (g && g.rhino76) return tr('«Носорог»', '"Rhino"', '"Rhino"') + ' ' + (g.serial || ''); return gl0.apply(this, arguments); }; }
if (typeof uixProdDesc === 'function'){ const pd0 = uixProdDesc;
  uixProdDesc = function(k){ const P = PRODUCTS[k]; if (P && P.d76) return tr(P.d76[0], P.d76[1]) + ' ' + tr('Где: ', 'At: ') + P.at.map(a => a === 'hq' ? tr('штаб', 'HQ') : bname(a)).join(' / ') + '.'; return pd0.apply(this, arguments); }; }
// ИИ-стратег: уникальные юниты своей фракции
{ const vp0 = V2.plan;
  V2.plan = function(t, plan, nFactory){
    vp0.apply(this, arguments);
    const f = FI76(t), time = S.time, T = S.teams[t];
    const has = type => S.buildings.some(b => b.alive && b.done && b.team === t && b.type === type);
    if (f === 0){
      if (nFactory && time > 480 && S.vehicles.filter(v => v.alive && v.team === t && v.rhino76).length < 1){ const i = plan.findIndex(p => p[1] === 'tank'); plan.splice(i < 0 ? plan.length : i, 0, ['p', 'rhino76']); }
      if (time > 420 && !T.plates76) plan.push(['p', 'plates76']);
    } else {
      if (has('hub') && time > 260){ const i = plan.findIndex(p => p[1] === 'drone'); plan.splice(i < 0 ? plan.length : i, 0, ['p', 'pack76']); }
      if (time > 420 && !T.phase76) plan.push(['p', 'phase76']);
    }
  }; }
// Рой: тяжёлые выстрелы оставляют волну искажения (в пост-обработке), без «пиу-пиу»
{ const sp0 = splash;
  splash = function(p, team, dmg, radius){ const r = sp0.apply(this, arguments); if (FI76(team) === 1 && radius >= 3 && S.waves) addWave(p, min(4, radius * 0.55), 0.75); return r; }; }
if (typeof fireCannon === 'function'){ const fc0 = fireCannon;
  fireCannon = function(v){ fc0.apply(this, arguments); if (v && FI76(v.team) === 1){ addWave(add(add(v.pos, mul(v.up, 0.5)), mul(v.aim, 4)), 1.8, 0.5); v.cd *= 1.15; } }; }

// ---------------------------------------------------------------- рисование: модели и цвета по фракции
{ const go0 = gatherObjects;
  gatherObjects = function(){
    const r = go0.apply(this, arguments);
    if (FAC76_F[0] === 1) for (let i = 0; i < renderList.length; i++){ const k = i * 28 + 11, t = OBJ[k]; if (t === 0 || t === 1) OBJ[k] = 1 - t; }
    return r;
  }; }
{ const gp0 = gatherParticles;
  gatherParticles = function(){
    const n = gp0.apply(this, arguments);
    if (FAC76_F[0] === 1) for (let i = 0; i < n; i++){ const k = i * 8 + 7, t = PAR[k]; if (t === 0 || t === 1) PAR[k] = 1 - t; }
    return n;
  }; }
if (typeof GFX72 !== 'undefined'){ const su0 = GFX72.sceneU;
  GFX72.sceneU = function(U){ su0.apply(this, arguments); if (U.uFac76) gl.uniform1f(U.uFac76, FAC76_F[0] === 1 ? 1 : 0); }; }
if (typeof HV65 !== 'undefined') HV65.is = function(e){ return !!e && e.cls === 'inf' && FI76(e.team) === 0 && e.role === 'heavy'; };
if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect;
  ST70.collect = function(){ c0.apply(this, arguments); for (const it of this.items || []){ if (it.t76 === undefined) it.t76 = it.team; it.team = FI76(it.t76); } }; }
// голоса: у Роя ниже и медленнее (рация «надзора»), у Консорциума как было
if (typeof VOICE66 !== 'undefined'){
  const V = VOICE66, say0 = V.say, dec0 = V.decode;
  V.say = function(g){ V.fac76 = g && typeof g === 'object' ? FI76(g.team !== undefined ? g.team : (g.units && g.units[0] ? g.units[0].team : 0)) : FI76(0); return say0.apply(this, arguments); };
  V.decode = function(){ const f = V.fac76; V.fac76 = undefined; return dec0.apply(this, arguments).then(b => { V.pend76 = f; return b; }); };
  FAC76.hookCtx = function(){
    if (!AU.ctx || AU.ctx.__f76) return; const C = AU.ctx, cb0 = C.createBufferSource.bind(C); C.__f76 = 1;
    C.createBufferSource = function(){ const s = cb0(); if (V.pend76 !== undefined){ if (V.pend76 === 1) try { s.playbackRate.value = 0.86; } catch (e){} V.pend76 = undefined; } return s; };
  };
}
try { if (window.speechSynthesis){ const sp0 = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = function(u){ try { if (FAC76_F[0] === 1 && !S.attract && u) u.pitch = max(0.1, (u.pitch || 1) * 0.72); } catch (e){} return sp0(u); }; } } catch (e){}

// ---------------------------------------------------------------- матч: фракции команд
{ const nm0 = newMatch;
  newMatch = function(opts){
    opts = opts || {};
    let f;
    if (opts.fac76) f = opts.fac76;                                   // тесты / баланс: [фракция команды 0, команды 1]
    else if (opts.attract) f = [0, 1];
    else { const p = FAC76.forceTut ? 0 : (SET.fac76 | 0) ? 1 : 0; f = [p, 1 - p]; }
    FAC76.setMap(f);
    const r = nm0.apply(this, arguments);
    S.teams.forEach((T, i) => { T.fac76 = FAC76_F[i]; });
    return r;
  }; }
{ const ng0 = MENU.newGame;
  MENU.newGame = function(tutorial){
    FAC76.forceTut = tutorial === true;
    try { return ng0.apply(this, arguments); }
    finally {
      FAC76.forceTut = false;
      if (!S.attract && tutorial !== true) feed(tr('Фракция: ', 'Faction: ', 'Phe: ') + FAC76.name(FAC76_F[0]) + ' · ' + tr('противник: ', 'enemy: ', 'địch: ') + FAC76.name(FAC76_F[1]), TEAM[0].css);
      if (FAC76.hookCtx) try { FAC76.hookCtx(); } catch (e){}
    }
  }; }
{ const l0 = SAVE.load;
  SAVE.load = function(){ const r = l0.apply(this, arguments); if (r) FAC76.setMap(S.teams.map((T, i) => T.fac76 !== undefined ? T.fac76 : i)); return r; }; }

// ---------------------------------------------------------------- меню: экран выбора фракции (ПК и телефон)
MENU.html_fac76 = function(){
  const T = FAC76.tr0, cur = SET.fac76 | 0;
  const card = (f) => {
    const L = f === 0 ? {
      t: T('КОНСОРЦИУМ', 'CONSORTIUM', 'LIÊN MINH', 'הקונסורציום'),
      s: T('Тяжёлая пехота в силовой броне. Броня и артиллерия.', 'Heavy power-armoured infantry. Armour and artillery.', 'Bộ binh giáp nặng. Giáp và pháo binh.'),
      p: [T('пехота +12 % прочности', 'infantry +12% toughness', 'bộ binh +12% bền'), T('танк «Бульдог» 1400, «Град» с 5:00', '"Bulldog" tank 1400, "Grad" from 5:00', 'xe tăng 1400, "Grad" từ 5:00'), T('уникально: танк «Носорог», «Керамитовые плиты»', 'unique: "Rhino" tank, "Ceramite plates"', 'riêng: xe tăng "Rhino", "Giáp ceramite"')],
      m: [T('медленнее (−7 %)', 'slower (−7%)', 'chậm hơn (−7%)')] } : {
      t: T('РОЙ', 'SWARM', 'BẦY ĐÀN', 'הנחיל'),
      s: T('Быстрые машины, стаи дронов, тяжёлые одиночные выстрелы с искажением.', 'Fast machines, drone packs, heavy single shots with distortion.', 'Nhanh, bầy drone, phát bắn nặng.'),
      p: [T('пехота +10 % скорости, ранцы +20 %', 'infantry +10% speed, jetpacks +20%', 'bộ binh +10% tốc độ'), T('дроны −25 % цены, лимит ×1.5; пушки и рельсы +20 %', 'drones −25% cost, limit ×1.5; cannons & rails +20%', 'drone −25% giá; pháo +20%'), T('уникально: «Стая дронов», «Фазовые ранцы»', 'unique: "Drone pack", "Phase jetpacks"', 'riêng: "Bầy drone", "Ba lô pha"')],
      m: [T('пехота −8 % прочности, техника легче', 'infantry −8% toughness, lighter vehicles', 'bộ binh −8% bền')] };
    return `<button class="f76c f76c${f} ${cur === f ? 'cur' : ''}" data-fac76="${f}"><i></i><b>${L.t}</b><small>${L.s}</small><ul>${L.p.map(x => `<li class="pl">+ ${x}</li>`).join('')}${L.m.map(x => `<li class="mi">− ${x}</li>`).join('')}</ul></button>`;
  };
  return `<div class="f76"><h2>${T('ВЫБОР ФРАКЦИИ', 'CHOOSE YOUR FACTION', 'CHỌN PHE', 'בחר צד')}</h2>
    <p class="f76s">${T('Противником будет другая фракция под управлением ИИ-стратега. Выбор запоминается.', 'The other faction is played by the AI strategist. Your choice is remembered.', 'Phe kia do AI điều khiển. Lựa chọn được ghi nhớ.')}</p>
    <div class="f76row">${card(0)}${card(1)}</div>
    <div class="f76b"><button id="m_back" class="f76x">${T('Назад', 'Back', 'Quay lại', 'חזרה')}</button><button id="m_fac76go" class="big f76go">▶ ${T('В бой', 'To battle', 'Vào trận', 'לקרב')} · ${FAC76.name(cur)}</button></div></div>`;
};
{ const w0 = MENU.wire;
  MENU.wire = function(name){
    const r = w0.apply(this, arguments);
    if (name === 'main'){ const b = $('m_play'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); MENU.show('fac76', true); }; }
    if (name === 'fac76'){
      const el = $('screen');
      el.querySelectorAll('[data-fac76]').forEach(b => b.onclick = e => { e.stopPropagation(); emit('ui', { kind: 'ok' }); SET.fac76 = +b.dataset.fac76; MENU.save(); MENU.show('fac76'); });
      const g = $('m_fac76go'); if (g) g.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); MENU.newGame(); };
    }
    return r;
  }; }
// чужие уникальные кнопки в стратегии не показываем
{ const uf0 = uixFrame; let tt = 0;
  uixFrame = function(dt){
    uf0.apply(this, arguments); tt -= dt; if (tt > 0) return; tt = 0.25;
    if (S.mode !== 'rts' && !MENU.isOpen()) return;
    for (const k in PRODUCTS){ const P = PRODUCTS[k]; if (P.fac76 === undefined) continue;
      const hide = FI76(0) !== P.fac76;
      document.querySelectorAll(`[data-ux="prod:${k}"],[data-id="prod:${k}"]`).forEach(el => { const d = hide ? 'none' : ''; if (el.style.display !== d) el.style.display = d; }); }
  }; }
{ const st = document.createElement('style'); st.id = 'f76css';
  st.textContent = `#screen .f76{display:flex;flex-direction:column;align-items:center;gap:10px;max-width:min(980px,96vw);max-height:96vh;overflow:auto;padding:4px 8px}
#screen .f76 h2{margin:0}#screen .f76s{margin:0;opacity:.75;font-size:13px;text-align:center}
#screen .f76row{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;width:100%}
#screen .f76c{flex:1 1 300px;max-width:460px;text-align:left;display:flex;flex-direction:column;gap:6px;padding:14px 16px;border:1px solid rgba(255,255,255,.18);border-radius:10px;cursor:pointer;position:relative;overflow:hidden}
#screen .f76c0{background:linear-gradient(160deg,rgba(84,80,64,.55),rgba(30,32,24,.85))}#screen .f76c1{background:linear-gradient(160deg,rgba(32,36,46,.75),rgba(10,12,18,.9))}
#screen .f76c i{position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;opacity:.25}
#screen .f76c0 i{background:radial-gradient(#cfc29b,transparent 70%)}#screen .f76c1 i{background:radial-gradient(#ff3020,transparent 70%)}
#screen .f76c b{font:400 24px "Russo One",sans-serif;letter-spacing:.06em}#screen .f76c0 b{color:#d9cfb0}#screen .f76c1 b{color:#ff7a66}
#screen .f76c small{font-size:13px;opacity:.85}#screen .f76c ul{margin:2px 0 0;padding:0;list-style:none;font-size:12.5px;line-height:1.45}
#screen .f76c .pl{color:#b9e8c0}#screen .f76c .mi{color:#f0a49a}
#screen .f76c0,#screen .f76c0.cur{background:linear-gradient(160deg,rgba(84,80,64,.55),rgba(30,32,24,.85))!important;color:#e8e2d0!important}
#screen .f76c1,#screen .f76c1.cur{background:linear-gradient(160deg,rgba(32,36,46,.75),rgba(10,12,18,.9))!important;color:#e8e2d0!important}
#screen .f76c.cur{outline:2px solid #fff;box-shadow:0 0 24px rgba(255,255,255,.18)}#screen .f76c:not(.cur){opacity:.72}#screen .f76c0.cur{outline-color:#d9cfb0}#screen .f76c1.cur{outline-color:#ff6a50}
#screen .f76b{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}#screen .f76go{min-width:260px}
@media (max-height:520px){#screen .f76{gap:6px}#screen .f76 h2{font-size:20px}#screen .f76s{display:none}#screen .f76c{padding:8px 10px;gap:3px}#screen .f76c b{font-size:18px}#screen .f76c small{font-size:11.5px}#screen .f76c ul{font-size:11px;line-height:1.3}#screen .f76row{flex-wrap:nowrap;gap:8px}#screen .f76c{flex:1 1 0}}`;
  document.head.appendChild(st); }
