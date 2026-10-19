// =====================================================================
//  КУРАТОР (v6.4) — вместо пошагового обучения стратегии.
//  В стратегии по умолчанию включён и по текущему состоянию боя подсказывает,
//  что делать: одна короткая фраза за раз + рамка-стрелка на нужной кнопке
//  интерфейса + метка в мире (жила, штаб, точка, враг). Шаг засчитывается, когда
//  игрок его сделал (события: выбор, стройка, заказ, приказ…).
//  Устойчивость к смене интерфейса: шаги — данные (CUR_STEPS), кнопки ищутся по
//  селекторам [data-ux] / [data-cur] / [data-tab] / [data-t], а не по координатам;
//  если нужной кнопки нет на экране — остаётся текст и метка в мире.
//  Включение: кнопка «Куратор» внизу правой панели, «✕» в окне куратора,
//  Настройки → «Куратор в стратегии». Состояние хранится в SET.curator (pm_settings).
// =====================================================================
if (SET.curator === undefined) SET.curator = true;
const CUR = {
  cur: null, doneN: 0, evalT: 0, lastDone: -99, cool: {}, done: {}, E: {}, flash: null, rtsT: 0, enterT: -99, seen: false,
  once: (() => { try { return JSON.parse(localStorage.getItem('pm_curator') || '{}'); } catch (e){ return {}; } })(),
  enabled(){ return SET.curator !== false; },
  toggle(on){
    SET.curator = on === undefined ? !this.enabled() : !!on;
    try { MENU.save(); } catch (e){}
    if (!this.enabled()) this.cur = null;
    feed(this.enabled() ? tr('Куратор включён: буду подсказывать, что делать', 'Curator on: I will suggest what to do', 'Người hướng dẫn bật') : tr('Куратор выключен (включить — кнопка «Куратор» или Настройки)', 'Curator off (turn on with the "Curator" button or in Settings)', 'Người hướng dẫn tắt'), '#9cf');
    emit('ui', { kind: 'ok' });
    this.render(true);
  },
  reset(){ this.cur = null; this.doneN = 0; this.lastDone = -99; this.cool = {}; this.done = {}; this.E = {}; this.flash = null; this.rtsT = 0; },
  // события игрока (вызываются из обёрток ниже)
  ev(name, key){ this.E[name] = S.rtime; if (key) this.E[name + ':' + key] = S.rtime; if (this.cur) this.evalT = min(this.evalT, 0.05); },
  since(name, key){ const t = this.E[key ? name + ':' + key : name]; return t !== undefined && this.cur && t >= this.cur.t0; },
  saveOnce(){ try { localStorage.setItem('pm_curator', JSON.stringify(this.once)); } catch (e){} },
};
// ---------------------------------------------------------------------
//  контекст: всё, что нужно шагам, считается раз в 0.4 с
// ---------------------------------------------------------------------
function curCtx(){
  const T = S.teams[0], hq = S.hq[0];
  const my = t => S.buildings.filter(b => b.alive && b.team === 0 && b.type === t);
  const base = hq && hq.alive ? hq.pos : mul(BASES[0], RM);
  const c = { T, hq, base, my, bs: teamBuilders(0), sb: selBuilders(), sel: selGroups().filter(g => g.cls !== 'builder'), pb: v64PB(), ore: T.ore };
  c.squads = S.squads.filter(s => s.team === 0);
  c.ext = my('extractor'); c.turrets = my('turret'); c.factory = my('factory');
  c.queued = k => countQueued(0, [k]);
  c.hqPanel = c.pb && c.pb.cls === 'hq' && SIDE.tab === 'prod';
  // ближайшая к базе свободная жила, где можно ставить
  let bv = null, bd = 1e9;
  for (const v of veins()){ if (veinProblem(0, v)) continue; const d = surfDist(v.dir, BASES[0]); if (d < bd){ bd = d; bv = v; } }
  c.vein = bv; c.veinD = bd;
  // враги у базы (видимые)
  const near = [];
  for (const e of [...S.units, ...S.vehicles, ...S.drones]) if (e.alive && e.team === 1 && e.seen && e.seen[0] > 0 && (dist(e.pos, base) < 75 || S.buildings.some(b => b.alive && b.team === 0 && dist(e.pos, b.pos) < 30))) near.push(e);
  c.threat = near.length >= 2 ? near : null;
  if (c.threat){ let p = [0, 0, 0]; for (const e of near) p = add(p, e.pos); c.threatPos = mul(p, 1 / near.length); }
  // ближайшая не наша точка (не ядро)
  let cp = null, cd = 1e9; const from = S.rts.dir;
  for (const p of S.cps){ if (p.core || p.owner === 0) continue; const d = surfDist(p.dir, from) + surfDist(p.dir, BASES[0]) * 0.5; if (d < cd){ cd = d; cp = p; } }
  c.cp = cp; c.myPts = S.cps.filter(p => !p.core && p.owner === 0).length;
  c.idle = groupsOf(0).find(g => g.cls !== 'builder' && (g.order === 'idle' || !g.order) && groupAlive(g) && !groupUnits(g).some(u => S.time - (u.lastHurt || -99) < 5));
  return c;
}
function curNearestBuilder(c){ const p = c.vein ? c.vein.pos : c.base; return nearestBuilder(0, p, true) || c.bs[0]; }
const curL = (r, e, v) => tr(r, e, v);
// ---------------------------------------------------------------------
//  ШАГИ (данные). Поля: id, pri (важность), once (один раз навсегда), cool (с),
//  when(c) — уместен ли сейчас, done(c, cur) — сделан ли, text(c), ui — селекторы
//  кнопок (берётся первая видимая), world(c) → { pos, label } — метка в мире, init(c, cur).
// ---------------------------------------------------------------------
const CUR_W = {
  builder: () => curL('ИНЖЕНЕР', 'BUILDER', 'KỸ SƯ'), vein: () => curL('ЖИЛА ⛏', 'VEIN ⛏', 'MẠCH ⛏'), hq: () => curL('ШТАБ', 'HQ', 'SỞ CHỈ HUY'),
  enemy: () => curL('ВРАГ', 'ENEMY', 'ĐỊCH'), here: () => curL('СЮДА', 'HERE', 'ĐÂY'),
};
function curSelB(id, pri, when, why, cool){
  return { id, pri, cool, when: c => c.bs.length > 0 && !c.sb.length && when(c),
    text: c => why(c) + ' ' + (TOUCH.on ? curL('Выдели инженера: кнопка «⚒ Выбрать ближайшего инженера» или «⚒ Инженер».', 'Select a builder: the "⚒ Select nearest builder" or "⚒ Builder" button.', 'Chọn kỹ sư: nút “⚒ Chọn kỹ sư gần nhất”.')
      : curL('Выдели инженера: кнопка «⚒ Выбрать ближайшего инженера» справа или клик по нему.', 'Select a builder: "⚒ Select nearest builder" on the right or click one.', 'Chọn kỹ sư: nút “⚒ Chọn kỹ sư gần nhất” bên phải hoặc nhấp vào kỹ sư.')),
    ui: ['#side [data-cur="selbuilder"]', '#touch [data-t="builder"]', '#side .tabs [data-tab="build"]'],
    world: c => { const b = curNearestBuilder(c); return b ? { pos: b.pos, label: CUR_W.builder() } : null; },
    done: c => c.sb.length > 0 };
}
function curPlace(id, type, pri, when, text, world, cool){
  return [
    { id: id + '_btn', pri, cool, when: c => c.sb.length > 0 && S.place !== type && when(c), text,
      ui: ['#side [data-ux="build:' + type + '"]', '#side .tabs [data-tab="build"]'], world,
      done: c => S.place === type || CUR.since('place', type) },
    { id: id + '_put', pri: pri + 1, cool, when: c => S.place === type && when(c),
      text: () => type === 'extractor' ? (TOUCH.on ? curL('Тапни по отмеченной жиле ⛏ (светящиеся кристаллы), затем «✔ Строить». Метка за краем — тапни её, камера подлетит.', 'Tap the marked vein ⛏ (glowing crystals), then "✔ Build". Mark off-screen — tap it to fly the camera there.', 'Chạm mạch quặng ⛏ đã đánh dấu, rồi “✔ Xây”.') : curL('Кликни по отмеченной жиле ⛏ — светящимся кристаллам (ПКМ/Esc — отмена). Метка за краем экрана — кликни по ней, камера подлетит.', 'Click the marked vein ⛏ — the glowing crystals (RMB/Esc — cancel). Mark off-screen — click it to fly the camera there.', 'Nhấp mạch quặng ⛏ đã đánh dấu (chuột phải/Esc — hủy).'))
        : TOUCH.on ? curL(`Тапни место для «${bname(type)}», затем «✔ Строить».`, `Tap a spot for the ${bname(type)}, then "✔ Build".`, `Chạm chỗ đặt ${bname(type)}, rồi “✔ Xây”.`)
        : curL(`Кликни место для «${bname(type)}» (ПКМ/Esc — отмена).`, `Click a spot for the ${bname(type)} (RMB/Esc — cancel).`, `Nhấp chỗ đặt ${bname(type)} (chuột phải/Esc — hủy).`),
      ui: () => TOUCH.on && S.placeAt ? ['#placeBar [data-pb="ok"]'] : [], world,
      done: () => CUR.since('place', type) },
  ];
}
function curOpen(id, pri, when, bld, text, cool){
  return { id, pri, cool, when: c => { const b = bld(c); return !!b && !(SIDE.tab === 'prod' && c.pb === b) && when(c); }, text,
    ui: c => { const b = bld(c); return b ? ['#side [data-cur="pb-' + v64At(b) + '"]', ...(b.cls === 'hq' ? ['#side [data-cur="selhq"]'] : []), '#side .tabs [data-tab="prod"]'] : []; },
    world: c => { const b = bld(c); return b ? { pos: b.cls === 'hq' ? add(b.pos, mul(BASES[0], 6)) : bldCenter(b), label: v64BName(b).toUpperCase() } : null; },
    done: c => SIDE.tab === 'prod' && v64PB() === bld(c) };
}
function curOrder(id, key, pri, when, bld, text, cool){
  return { id, pri, cool, when: c => { const b = bld(c); return !!b && SIDE.tab === 'prod' && c.pb === b && when(c); }, text,
    ui: ['#side [data-ux="prod:' + key + '"]'],
    init: (c, k) => { k.n0 = (S.pOrder || {})[key] || 0; k.q0 = c.queued(key); },
    done: (c, k) => ((S.pOrder || {})[key] || 0) > k.n0 || c.queued(key) > k.q0 };
}
const curHQ = c => c.hq && c.hq.alive ? c.hq : null;
const curFactory = c => c.factory.find(b => b.done) || null;
const curVeinW = c => c.vein ? { pos: add(c.vein.pos, mul(c.vein.dir, 2)), label: CUR_W.vein() } : null;
const CUR_STEPS = [
  { id: 'intro', pri: 1000, once: true, when: () => true, min: 6,
    text: () => TOUCH.on ? curL('Я — Куратор: подсвечу нужную кнопку и место на карте. «✕» — выключить.', 'I am the Curator: I highlight the button and the spot on the map. "✕" turns me off.', 'Tôi là Người hướng dẫn: tôi chỉ nút và vị trí. “✕” để tắt.') : curL('Я — Куратор. Подскажу по ходу боя, что делать: подсвечу кнопку и место на карте. Выключить — «✕» здесь или кнопка «Куратор» внизу справа.', 'I am the Curator. I will suggest what to do as you play, highlighting the button and the spot on the map. Turn me off with "✕" here or the "Curator" button at the bottom right.', 'Tôi là Người hướng dẫn. Tôi sẽ gợi ý việc cần làm, đánh dấu nút và vị trí. Tắt bằng “✕” hoặc nút “Hướng dẫn”.'),
    ui: ['#curBtn'], done: (c, k) => S.rtime - k.t0 > 7 },
  { id: 'threat', pri: 900, cool: 50, when: c => !!c.threat,
    text: () => (TOUCH.on ? curL('Рой у базы! «Вся армия», затем долгий тап по врагам. Турель у базы тоже поможет.', 'The Swarm is at the base! "All army", then long-tap the enemies. A turret at the base helps too.', 'Bầy Đàn ở căn cứ! “Toàn quân”, rồi chạm giữ vào địch.')
      : curL('Рой у базы! Выдели войска (рамкой или Ctrl+A) и ПКМ по врагам. Турель (Z) у базы тоже поможет.', 'The Swarm is at the base! Select troops (box or Ctrl+A) and RMB the enemies. A turret (Z) helps too.', 'Bầy Đàn ở căn cứ! Chọn quân (kéo khung hoặc Ctrl+A) và chuột phải vào địch.')),
    ui: ['#touch [data-t="army"]'], world: c => c.threatPos ? { pos: c.threatPos, label: CUR_W.enemy(), col: '#ff6a5a' } : null,
    done: () => CUR.since('order') },
  { id: 'cam', pri: 800, once: true, when: c => CUR.rtsT > 4,
    text: () => TOUCH.on ? curL('Камера: тащи карту пальцем, двумя пальцами — масштаб и поворот. Сдвинь камеру.', 'Camera: drag the map with a finger, two fingers — zoom and rotate. Move the camera.', 'Camera: kéo bản đồ bằng một ngón, hai ngón — phóng to và xoay.')
      : curL('Камера: WASD или края экрана, колесо — высота, Q/E — поворот. Сдвинь камеру.', 'Camera: WASD or screen edges, wheel — height, Q/E — rotate. Move the camera.', 'Camera: WASD hoặc mép màn hình, con lăn — độ cao, Q/E — xoay.'),
    init: (c, k) => { k.ref = S.rts.dir.slice(); k.h = S.rts.h; }, done: (c, k) => surfDist(S.rts.dir, k.ref) > 25 || abs(S.rts.h - k.h) > 15 },
  // нет инженеров → штаб → заказать инженера
  curOpen('hq_open', 700, c => !c.bs.length && !c.queued('builder'), curHQ,
    () => curL('Инженеров нет, а без них не построить ни одного здания. Выбери штаб — кликни по нему или кнопку «⌂ Штаб».', 'No builders — and nothing gets built without them. Select the HQ — click it or the "⌂ HQ" button.', 'Không có kỹ sư — không thể xây gì. Chọn sở chỉ huy.')),
  curOrder('hq_builder', 'builder', 701, c => !c.bs.length && !c.queued('builder'), curHQ,
    () => curL('Закажи инженера — кнопка «⚒ Инженер-строитель» в панели штаба (50 руды).', 'Order a builder — the "⚒ Builder" button in the HQ panel (50 ore).', 'Gọi kỹ sư — nút “⚒ Kỹ sư” trong bảng sở chỉ huy (50 quặng).')),
  // первый экстрактор
  curSelB('ext_sel', 600, c => !c.ext.length && !!c.vein && c.ore >= 60, () => curL('Нужна руда — поставим экстрактор на рудную жилу.', 'We need ore — let us put an extractor on an ore vein.', 'Cần quặng — hãy đặt máy khai thác lên mạch quặng.')),
  ...curPlace('ext', 'extractor', 600, c => !c.ext.length && !!c.vein,
    () => curL('Нажми «Экстрактор» (C) и поставь его на светящиеся кристаллы жилы — я её отметил ⛏.', 'Press "Extractor" (C) and place it on the glowing crystals of the vein — I marked it ⛏.', 'Nhấn “Máy khai thác” (C) và đặt lên tinh thể phát sáng — tôi đã đánh dấu ⛏.'), curVeinW),
  // отряды
  curOpen('sq_open', 500, c => c.squads.length < 2 && c.ore >= 100 && !c.queued('squad'), curHQ,
    () => curL('Мало войск. Выбери штаб — там заказывают отряды.', 'Few troops. Select the HQ — squads are ordered there.', 'Ít quân. Chọn sở chỉ huy — gọi đội ở đó.'), 60),
  curOrder('sq_order', 'squad', 501, c => c.squads.length < 2 && c.ore >= 100 && !c.queued('squad'), curHQ,
    () => curL('Закажи «Штурмовой отряд» в панели штаба.', 'Order an "Assault squad" in the HQ panel.', 'Gọi “Đội xung kích” trong bảng sở chỉ huy.'), 60),
  // захват точек
  { id: 'cap_sel', pri: 450, cool: 90, when: c => c.myPts < 2 && !!c.cp && c.squads.length > 0 && !c.sel.length,
    text: () => TOUCH.on && typeof M67 !== 'undefined' && M67.active() ? curL('Точки дают руду. Выдели отряд — тап по нему или кнопка «◈ Отряд» справа.', 'Points give ore. Select a squad — tap it or the "◈ Squad" button on the right.', 'Điểm cho quặng. Chọn một đội.') : TOUCH.on ? curL('Точки дают руду. Выдели отряд — тап по нему или карточка «◆ Армия» сверху.', 'Points give ore. Select a squad — tap it or the "◆ Army" card at the top.', 'Điểm cho quặng. Chọn một đội.')
      : curL('Точки дают руду. Выдели отряд — клик по нему или карточка в панели «◆ Армия» слева.', 'Points give ore. Select a squad — click it or its card in the "◆ Army" panel on the left.', 'Điểm cho quặng. Chọn một đội — nhấp vào đội hoặc thẻ bên trái.'),
    ui: ['#r61cards .rc', '#r61cards .rh button', '#m67rail .m67sq'], world: c => { const L = c.squads[0] && leaderPos(c.squads[0]); return L ? { pos: L, label: groupLabel(c.squads[0]).toUpperCase() } : null; },
    done: c => c.sel.length > 0 },
  { id: 'cap_go', pri: 451, cool: 90, when: c => c.myPts < 2 && !!c.cp && c.sel.length > 0,
    text: c => TOUCH.on ? curL(`Долгий тап по точке ${c.cp.name} — отряд пойдёт захватывать.`, `Long-tap point ${c.cp.name} — the squad goes to capture it.`, `Chạm giữ điểm ${c.cp.name} — đội sẽ đi chiếm.`)
      : curL(`ПКМ по точке ${c.cp.name} — отряд пойдёт её захватывать.`, `RMB on point ${c.cp.name} — the squad goes to capture it.`, `Chuột phải vào điểm ${c.cp.name} — đội sẽ đi chiếm.`),
    world: c => ({ pos: c.cp.pos, label: curL('ТОЧКА ', 'POINT ', 'ĐIỂM ') + c.cp.name, col: '#ffd27a' }), done: () => CUR.since('order') },
  // турели после нападения
  curSelB('tur_sel', 350, c => (S.rtime - (S.lastAttackAlert || -999) < 120 || !!c.threat) && c.turrets.length < 2 && c.ore >= 90, () => curL('Базу атакуют — поставим турель.', 'The base is under attack — let us build a turret.', 'Căn cứ bị tấn công — xây tháp súng.'), 90),
  ...curPlace('tur', 'turret', 350, c => (S.rtime - (S.lastAttackAlert || -999) < 120 || !!c.threat) && c.turrets.length < 2 && c.ore >= 90,
    () => curL('Нажми «Турель» (Z) и поставь её у базы, ближе к врагу.', 'Press "Turret" (Z) and place it at the base, facing the enemy.', 'Nhấn “Tháp súng” (Z) và đặt ở căn cứ.'), c => ({ pos: c.base, label: CUR_W.here() }), 90),
  // мехзавод
  curSelB('fac_sel', 300, c => !c.factory.length && c.ore >= 250 && c.ext.length > 0, () => curL('Руды хватает на мехзавод — там делают танки и технику.', 'Enough ore for a mech factory — it makes tanks and vehicles.', 'Đủ quặng cho nhà máy cơ giới — làm xe tăng.'), 120),
  ...curPlace('fac', 'factory', 300, c => !c.factory.length && c.ore >= 250 && c.ext.length > 0,
    () => curL('Нажми «Мехзавод» (B) и поставь его на базе (ровное место внутри пунктира).', 'Press "Mech factory" (B) and place it at the base (a flat spot inside the dashed ring).', 'Nhấn “Nhà máy” (B) và đặt trong căn cứ.'), c => ({ pos: c.base, label: CUR_W.here() }), 120),
  // простаивающий отряд
  { id: 'idle', pri: 250, cool: 90, when: c => !!c.idle && CUR.rtsT > 30,
    text: c => curL(`${groupLabel(c.idle)} простаивает — выдели и дай приказ: ${TOUCH.on ? 'долгий тап' : 'ПКМ'} по точке или врагу.`, `${groupLabel(c.idle)} is idle — select it and give an order: ${TOUCH.on ? 'long-tap' : 'RMB'} a point or an enemy.`, `${groupLabel(c.idle)} đang rảnh — chọn và ra lệnh.`),
    world: c => { const L = leaderPos(c.idle); return L ? { pos: L, label: groupLabel(c.idle).toUpperCase() } : null; },
    init: (c, k) => { k.g = c.idle; }, done: (c, k) => CUR.since('order') || !k.g || (k.g.order && k.g.order !== 'idle') },
  // танки
  curOpen('tank_open', 200, c => !!curFactory(c) && S.vehicles.filter(v => v.alive && v.team === 0).length < 2 && c.ore >= 200 && !c.queued('tank'), curFactory,
    () => curL('Мехзавод готов. Выбери его — закажем танк.', 'The mech factory is ready. Select it to order a tank.', 'Nhà máy đã xong. Chọn nó để gọi xe tăng.'), 90),
  curOrder('tank_order', 'tank', 201, c => S.vehicles.filter(v => v.alive && v.team === 0).length < 2 && c.ore >= 200 && !c.queued('tank'), curFactory,
    () => curL('Закажи «Танк» в панели мехзавода.', 'Order a "Tank" in the factory panel.', 'Gọi “Xe tăng” trong bảng nhà máy.'), 90),
  // ещё экстракторы
  curSelB('ext2_sel', 180, c => c.ext.length > 0 && c.ext.length < 3 && !!c.vein && c.veinD < 160 && c.ore >= 120, () => curL('Больше экстракторов — больше руды. Рядом есть свободная жила.', 'More extractors — more ore. There is a free vein nearby.', 'Thêm máy khai thác — thêm quặng.'), 120),
  ...curPlace('ext2', 'extractor', 180, c => c.ext.length > 0 && c.ext.length < 3 && !!c.vein && c.veinD < 160 && c.ore >= 120,
    () => curL('«Экстрактор» (C) на отмеченную жилу ⛏.', '"Extractor" (C) on the marked vein ⛏.', '“Máy khai thác” (C) lên mạch ⛏.'), curVeinW, 120),
  // удары
  { id: 'power', pri: 150, cool: 150, when: c => c.T.cmd >= 3,
    text: () => SIDE.tab === 'cmd' ? curL('Выбери удар и кликни по скоплению врагов.', 'Pick a power and click an enemy cluster.', 'Chọn đòn đánh và nhấp vào cụm địch.') : curL('Накопились командные очки — вкладка «✺ Удары»: артудар, разведка, капсула.', 'Command points are piling up — the "✺ Powers" tab: artillery, recon, drop pod.', 'Điểm chỉ huy đã nhiều — thẻ “✺ Chỉ huy”.'),
    ui: () => SIDE.tab === 'cmd' ? ['#side [data-ux^="power:"]:not(.off)'] : ['#side .tabs [data-tab="cmd"]'], done: () => CUR.since('power') },
  { id: 'eco', pri: 120, once: true, when: c => c.ore < 60 && CUR.rtsT > 60,
    text: () => curL('Мало руды? Нажми «РУДА» вверху — покажу, откуда доход и как его ускорить.', 'Low on ore? Tap "ORE" at the top — see where income comes from and how to boost it.', 'Thiếu quặng? Nhấn “QUẶNG” ở trên.'),
    ui: ['.hb.ore'], done: () => CUR.since('eco') },
  { id: 'possess', pri: 100, once: true, when: c => CUR.rtsT > 100 && groupsOf(0).length > 0,
    text: () => curL('Хочешь повоевать сам? Выдели отряд и нажми «▶ Вселиться».', 'Want to fight yourself? Select a squad and press "▶ Possess".', 'Muốn tự chiến đấu? Chọn đội và nhấn “▶ Nhập vai”.'),
    ui: ['#card .poss'], done: () => S.mode === 'fps' },
];
// ---------------------------------------------------------------------
//  ДВИЖОК: выбор шага, засчитывание, переключение на срочное
// ---------------------------------------------------------------------
Object.assign(CUR, {
  steps: CUR_STEPS,
  val(f, c, k){ return typeof f === 'function' ? f(c, k) : f; },
  eligible(s){ return !(s.once && (this.once[s.id] || this.done[s.id])) && !(this.cool[s.id] > S.rtime); },
  pick(c, minPri){
    let best = null;
    for (const s of this.steps){
      if (s.pri <= (minPri || -1) || !this.eligible(s) || (best && s.pri <= best.pri)) continue;
      let ok = false; try { ok = !!s.when(c); } catch (e){ ok = false; }
      if (ok) best = s;
    }
    return best;
  },
  start(s, c){
    this.cur = { s, t0: S.rtime, gone: 0 };
    try { if (s.init) s.init(c, this.cur); } catch (e){}
    this.cur.text = this.val(s.text, c, this.cur);
    if (SET.hintsVoice && !TOUCH.on && this.cur.text && (this.spoke || 0) < S.rtime - 12){ this.spoke = S.rtime; AU.speak(this.cur.text, 'hint'); }
    this.render(true);
  },
  complete(c){
    const s = this.cur.s;
    this.doneN++; this.done[s.id] = (this.done[s.id] || 0) + 1;
    if (s.once){ this.once[s.id] = 1; this.saveOnce(); }
    this.cool[s.id] = S.rtime + (s.cool || 30);
    this.flash = { t: S.rtime, n: this.doneN };
    this.lastDone = S.rtime; this.cur = null;
    emit('ui', { kind: 'ok' });
    this.render(true);
  },
  skip(){
    if (!this.cur) return;
    const s = this.cur.s; this.cool[s.id] = S.rtime + max(120, s.cool || 0);
    if (s.once){ this.once[s.id] = 1; this.saveOnce(); }
    this.cur = null; this.lastDone = S.rtime; this.render(true);
  },
  think(){
    const c = curCtx();
    if (this.cur){
      const s = this.cur.s, age = S.rtime - this.cur.t0;
      let done = false; try { done = age > (s.min || 0.8) && s.done(c, this.cur); } catch (e){ done = false; }
      if (done){ this.complete(c); return; }
      let still = true; try { still = !!s.when(c, this.cur) || (s.min && age < s.min); } catch (e){ still = false; }
      this.cur.gone = still ? 0 : this.cur.gone + 0.4;
      if (this.cur.gone > 2){ this.cur = null; this.render(true); return; }
      const urgent = this.pick(c, s.pri + 250);   // срочное (атака на базу) перебивает текущий шаг
      if (urgent){ this.start(urgent, c); return; }
      const t = this.val(s.text, c, this.cur); if (t !== this.cur.text){ this.cur.text = t; this.render(true); }
      this.cur.c = c;
      return;
    }
    if (S.rtime - this.lastDone < 1.6) return;   // пауза между шагами — не спамим
    const s = this.pick(c);
    if (s){ this.start(s, c); this.cur.c = c; }
  },
  frame(dt){
    const active = this.enabled() && !S.attract && !S.over && !MENU.isOpen() && S.mode === 'rts';
    if (!active){
      if (this.cur && this.cur.s.id === 'possess' && S.mode === 'fps' && this.enabled()) this.complete();
      this.hide(); this.wasRts = false; return;
    }
    if (!this.wasRts){ this.wasRts = true; this.enterT = S.rtime; if (HINTS.cur) HINTS.cur = null; }
    this.rtsT += dt;
    this.evalT -= dt; if (this.evalT <= 0){ this.evalT = 0.4; try { this.think(); } catch (e){ if (!this.err){ this.err = 1; console.warn('curator', e); } } }
    this.render(false);
  },
});
// ---------------------------------------------------------------------
//  ОТРИСОВКА: окно куратора, рамка на кнопке, метка в мире
// ---------------------------------------------------------------------
Object.assign(CUR, {
  el(){
    let el = $('cur');
    if (!el){
      el = document.createElement('div'); el.id = 'cur';
      el.innerHTML = '<div class="cbox"><i class="cic">🎓</i><div class="ctx"><small></small><p></p></div><button data-c="skip" title="">»</button><button data-c="off" title="">✕</button></div><div class="cfr"><b></b></div><div class="cmk"><i></i><span></span></div>';
      document.body.appendChild(el);
      const go = e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation(); AU.init(); if (b.dataset.c === 'off') this.toggle(false); else if (b.dataset.c === 'skip') this.skip(); };
      el.querySelector('.cbox').addEventListener('click', go);
      el.querySelector('.cbox').addEventListener('touchstart', go, { passive: false });
      el.querySelector('.cbox').addEventListener('mousedown', e => e.stopPropagation());
      // метка за краем экрана / на карте: тап — камера к цели
      const fly = e => { e.preventDefault(); e.stopPropagation(); if (this.worldHit && this.worldHit.pos && S.mode === 'rts') flyCamTo(this.worldHit.pos); };
      el.querySelector('.cmk').addEventListener('mousedown', fly);
      el.querySelector('.cmk').addEventListener('touchstart', fly, { passive: false });
    }
    return el;
  },
  hide(){ const el = $('cur'); if (el && el.style.display !== 'none') el.style.display = 'none'; },
  findUI(list){
    for (const q of list || []){
      let all; try { all = document.querySelectorAll(q); } catch (e){ continue; }
      for (const e of all){
        if (!e.isConnected || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue;
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        return { e, r };
      }
    }
    return null;
  },
  // свободное место для окна: справа от верхних плашек и слева от правой панели, иначе — под ними
  place(box){
    const hbs = [...document.querySelectorAll('#hud .hb')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0);
    const hudR = hbs.length ? max(...hbs.map(r => r.right)) : 0, hudB = hbs.length ? max(...hbs.map(r => r.bottom)) : 50;
    const side = $('side'), sr = side && getComputedStyle(side).display !== 'none' ? side.getBoundingClientRect() : null;
    let sideL = sr && sr.width ? sr.left : innerWidth;
    for (const q0 of [document.querySelector('#touch:not(.hidden) .tt'), $('devLab')]){ if (!q0 || getComputedStyle(q0).display === 'none') continue; const q = q0.getBoundingClientRect(); if (q.width && q.top < 70) sideL = min(sideL, q.left); }
    const band = sideL - hudR - 16;
    if (band >= 250){ box.style.left = (hudR + 8) + 'px'; box.style.top = (TOUCH.on ? 4 : 8) + 'px'; box.style.maxWidth = min(band, 520) + 'px'; box.style.width = ''; }
    else { box.style.left = '8px'; box.style.top = (hudB + (TOUCH.on ? 48 : 70)) + 'px'; box.style.maxWidth = min(sideL - 24, 380) + 'px'; }
  },
  render(force){
    const el = this.el();
    const cur = this.cur, fl = this.flash && S.rtime - this.flash.t < 1.4 ? this.flash : null;
    if (!cur && !fl){ this.hide(); return; }
    el.style.display = 'block';
    const box = el.querySelector('.cbox');
    const sig = (cur ? cur.s.id + '|' + cur.text : 'fl' + (fl && fl.n)) + '|' + LANG.cur + '|' + this.doneN;
    if (force || box._sig !== sig){
      box._sig = sig;
      box.classList.toggle('ok', !cur);
      box.querySelector('small').textContent = tr('КУРАТОР', 'CURATOR', 'HƯỚNG DẪN') + (this.doneN ? ` · ✓ ${this.doneN}` : '');
      box.querySelector('p').textContent = cur ? cur.text : tr('Готово! ✓', 'Done! ✓', 'Xong! ✓');
      box.querySelector('[data-c="skip"]').title = tr('Пропустить совет', 'Skip this tip', 'Bỏ qua');
      box.querySelector('[data-c="off"]').title = tr('Выключить куратора', 'Turn the curator off', 'Tắt hướng dẫn');
      box.querySelector('[data-c="skip"]').style.display = cur ? '' : 'none';
      this.place(box); box._pt = S.rtime;
    } else if (S.rtime - (box._pt || 0) > 0.5){ this.place(box); box._pt = S.rtime; }
    // рамка на кнопке интерфейса
    const fr = el.querySelector('.cfr');
    const ui = cur ? this.findUI(this.val(cur.s.ui, cur.c || {}, cur)) : null;
    this.uiHit = ui ? ui.e : null;
    if (ui){
      const r = ui.r, p = 4;
      fr.style.display = 'block';
      fr.style.left = (r.left - p) + 'px'; fr.style.top = (r.top - p) + 'px'; fr.style.width = (r.width + p * 2) + 'px'; fr.style.height = (r.height + p * 2) + 'px';
      const arr = fr.querySelector('b'), right = r.left + r.width / 2 > innerWidth / 2;
      const a = r.top > 60 ? 'up' : right ? 'left' : 'right';
      arr.className = 'a-' + (r.top > 60 ? 'top' : right ? 'left' : 'right');
      arr.textContent = a === 'up' ? '▼' : a === 'left' ? '▶' : '◀';
    } else fr.style.display = 'none';
    // метка в мире
    const mk = el.querySelector('.cmk');
    let w = null; try { w = cur && cur.s.world ? cur.s.world(cur.c || curCtx(), cur) : null; } catch (e){ w = null; }
    this.worldHit = w;
    if (w && w.pos && S.cam){
      const s = facing(w.pos) ? project(w.pos) : null, m = 30, W = innerWidth, H = innerHeight;
      let x, y, on = s && s[0] > m && s[0] < W - m && s[1] > m && s[1] < H - m;
      if (on){ x = s[0]; y = s[1]; }
      else {
        const v = sub(w.pos, S.cam.pos); let dx = dot(v, S.cam.right), dy = -dot(v, S.cam.up);
        if (s){ dx = s[0] - W / 2; dy = s[1] - H / 2; }
        const sd = $('side'), sR = sd && getComputedStyle(sd).display !== 'none' ? sd.getBoundingClientRect().left : W;
        const x0 = 46, x1 = sR - 56, y0 = 96, y1 = H - 60, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const k = min((x1 - cx) / max(1e-3, abs(dx)), (y1 - cy) / max(1e-3, abs(dy)));
        x = cx + dx * k; y = cy + dy * k;
      }
      mk.style.display = 'block'; mk.style.left = x + 'px'; mk.style.top = y + 'px';
      mk.classList.toggle('off', !on);
      mk.style.setProperty('--c', w.col || '#7fdcff');
      mk.querySelector('i').style.transform = on ? '' : `rotate(${Math.atan2(y - H / 2, x - W / 2)}rad)`;
      const lt = w.label + (on ? '' : ' ➜'); const sp = mk.querySelector('span'); if (sp.textContent !== lt) sp.textContent = lt;
    } else mk.style.display = 'none';
  },
});
// ---------------------------------------------------------------------
//  СВЯЗКИ: события игрока, кадр, новый матч, настройки, старые подсказки стратегии
// ---------------------------------------------------------------------
{
  const used0 = HINTS.used.bind(HINTS);
  HINTS.used = function(a){ used0(a); CUR.ev(a); };
  const rs0 = HINTS.rtsStep.bind(HINTS);
  HINTS.rtsStep = function(){ if (CUR.enabled()) return; rs0(); };   // куратор заменяет подсказки стратегии
  const pp0 = playerPlace;
  playerPlace = function(type, dir, queue){ const why = pp0(type, dir, queue); if (!why) CUR.ev('place', type); return why; };
  const oa0 = orderAt;
  orderAt = function(){ const sel = selGroups().length; const r = oa0.apply(this, arguments); if (sel) CUR.ev('order'); return r; };
  const nm0 = newMatch;
  newMatch = function(o){ const r = nm0(o); CUR.reset(); return r; };
  const uf0 = uixFrame;
  uixFrame = function(dt){ uf0(dt); try { CUR.frame(dt); } catch (e){ if (!CUR.err2){ CUR.err2 = 1; console.warn('curator', e); } } };
  // Настройки → строка «Куратор в стратегии» рядом с «Подсказки»
  const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    const h = hs0.call(this), on = CUR.enabled();
    const row = `<div class="row"><label>${tr('Куратор в стратегии (советы по ходу игры)', 'Curator in strategy (tips while playing)', 'Người hướng dẫn trong chiến thuật')}</label><button class="tog ${on ? 'on' : ''}" data-tog="curator">${on ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</button></div>`;
    const i = h.indexOf('data-tog="hintsOn"');
    if (i < 0) return h;
    const j = h.indexOf('</div>', i) + 6;
    return h.slice(0, j) + row + h.slice(j);
  };
}
(function curCSS(){
  const st = document.createElement('style'); st.id = 'curcss';
  st.textContent = `
  #cur{position:fixed;inset:0;pointer-events:none;z-index:18;display:none;font-family:"Exo 2",sans-serif}
  #cur .cbox{box-sizing:border-box;position:fixed;left:660px;top:8px;display:flex;align-items:flex-start;gap:8px;max-width:460px;background:rgba(10,24,32,.93);border:1px solid rgba(127,212,255,.75);border-left:4px solid #7fd4ff;padding:7px 6px 7px 9px;pointer-events:auto;box-shadow:0 4px 18px rgba(0,0,0,.5);animation:curIn .25s ease-out}
  #cur .cbox.ok{border-color:#8fffaa;border-left-color:#8fffaa;background:rgba(14,36,22,.93)}
  #cur .cic{font-style:normal;font-size:22px;line-height:1.1}
  #cur .ctx{flex:1;min-width:0} #cur .ctx small{display:block;font:600 10px "Exo 2";letter-spacing:.16em;color:#7fd4ff} #cur .cbox.ok .ctx small{color:#8fffaa}
  #cur .ctx p{margin:2px 0 0;font-size:13.5px;line-height:1.32;color:#eaf6ff}
  #cur .cbox button{pointer-events:auto;flex:none;width:30px;height:30px;background:rgba(255,255,255,.06);border:1px solid rgba(127,212,255,.45);color:#cfeaff;font:700 14px "Exo 2";cursor:pointer;padding:0;border-radius:3px}
  #cur .cbox button:hover{border-color:#fff;color:#fff}
  #cur .cfr{position:fixed;display:none;border:2.5px solid #7fd4ff;border-radius:6px;box-shadow:0 0 0 3px rgba(127,212,255,.25),0 0 18px rgba(127,212,255,.65);animation:curPulse 1s ease-in-out infinite}
  #cur .cfr b{position:absolute;color:#7fd4ff;font-size:20px;text-shadow:0 0 6px #000;animation:curBob .7s ease-in-out infinite alternate}
  #cur .cfr b.a-top{left:50%;top:-26px;transform:translateX(-50%)} #cur .cfr b.a-left{left:-24px;top:50%;margin-top:-12px} #cur .cfr b.a-right{right:-24px;top:50%;margin-top:-12px}
  #cur .cmk{position:fixed;display:none;transform:translate(-50%,-50%);--c:#7fdcff;pointer-events:auto;cursor:pointer;padding:4px}
  #cur .cmk i{display:block;width:34px;height:34px;border:3px solid var(--c);border-radius:50%;box-shadow:0 0 12px var(--c);animation:curRing 1.1s ease-out infinite}
  #cur .cmk.off i{width:0;height:0;border:none;border-radius:0;box-shadow:none;border-left:22px solid var(--c);border-top:12px solid transparent;border-bottom:12px solid transparent;animation:none}
  #cur .cmk span{position:absolute;left:50%;top:-22px;transform:translateX(-50%);white-space:nowrap;font:700 12px "Exo 2";color:var(--c);text-shadow:0 0 4px #000,0 0 2px #000;letter-spacing:.06em}
  #cur .cmk.off span{top:18px}
  @keyframes curPulse{50%{box-shadow:0 0 0 6px rgba(127,212,255,.12),0 0 26px rgba(127,212,255,.9)}}
  @keyframes curBob{to{translate:0 4px}} @keyframes curRing{0%{scale:.75;opacity:1}100%{scale:1.35;opacity:.35}}
  @keyframes curIn{from{opacity:0;transform:translateY(-6px)}}
  body.touch #cur .cbox{padding:3px 3px 3px 6px;gap:5px;align-items:center} body.touch #cur .ctx small{display:none} body.touch #cur .ctx p{margin:0;font-size:11.5px;line-height:1.22} body.touch #cur .cic{font-size:15px}
  body.touch #cur .cbox button{width:32px;height:32px}`;
  document.head.appendChild(st);
})();
