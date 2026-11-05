// =====================================================================
//  v8.13 — ЭНЦИКЛОПЕДИЯ (CX813): компактный справочник в главном меню и в паузе (ПК, телефон, планшет, геймпад).
//  Разделы: Юниты, Здания, Боссы, Фракции, Аномалии, Фауна, Поддержка, Режимы, Мир (биомы и погода).
//  Цифры (прочность, цена, время, лимиты, урон, радиусы, КО, перезарядка, множители брони) берутся ЖИВЬЁМ из таблиц
//  игры: BTYPES, PRODUCTS, ROLES, VK, ARMOR, GAME, BOSS83.K, A78.K, VER86.SP, POWERS, AB85, FAC76.ST, BIO86, CHAT.
//  Описания — из тех же таблиц (d / d76), где их нет — короткий текст здесь. Нет числа в таблицах — константа FB ниже.
//  • Поиск (ПК), фильтр по фракции, вкладки (геймпад: LB/RB — вкладка, крестовина — карточки, A — подробнее, B — назад).
//  • То, что ещё не встречалось (новая техника, боссы, аномалии, фауна), — «??? — встретьте в бою»; встреченное
//    запоминается (localStorage pm813_seen), «Показать всё» — без спойлер-замка.
//  • Подсказка один раз: метка «новое» на кнопке меню, пока не открыл; в первом бою — короткий совет «📖 в паузе».
//  Хуки — обёртки: MENU.html_main / html_pause / wire, GP812.nav. Новый код только здесь. Выкл.: ?cx813=0.
// =====================================================================
const CX813 = {
  on: (() => { try { return new URLSearchParams(location.search).get('cx813') !== '0'; } catch (e){ return true; } })(),
  err: {}, cat: 'units', q: '', fac: 'all', open: null, all: false, scanT: 0, hintT: 0,
  stats: { opened: 0, renders: 0, met: 0, cards: 0, search: 0 },
  // запасные числа — только там, где их нет в таблицах (задаются прямо в функциях спавна)
  FB: { tankHp: [1400, 1150], droneHp: 90, builderHp: 120, rhinoHp: 2300, weak: 1.8 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('CX813 ' + tag, e); } } },
  // названия фракций — без подмены (tr в матче за Рой меняет «Рой»/«Консорциум» местами)
  L: (ru, en, vi) => ((typeof FAC76 !== 'undefined' && FAC76.tr0) || tr)(ru, en, vi !== undefined ? vi : en),
  ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e){ return null; } },
  seen: (() => { try { return new Set(JSON.parse(localStorage.getItem('pm813_seen') || '[]')); } catch (e){ return new Set(); } })(),
  esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); },
  n2(p){ return Array.isArray(p) ? N2(p) : (p || ''); },
  fn(f){ return f === 0 || f === 1 ? (typeof FAC76 !== 'undefined' ? FAC76.name(f) : N2(TEAMN[f])) : ''; },
  r1(x){ return Math.round(x * 10) / 10; },
  // ---------------------------------------------------------------- «встретил в бою»
  mark(k, name){
    if (this.seen.has(k)) return;
    this.seen.add(k); this.stats.met++; this.ls('pm813_seen', JSON.stringify([...this.seen]));
    if (name && !S.attract && typeof feed === 'function') feed('📖 ' + this.L('В энциклопедии: ', 'Encyclopedia: ', 'Bách khoa: ') + name, '#ffd27a');
  },
  scan(){
    if (S.attract || !S.units) return;
    const vis = e => e.team === 0 || (e.seen && e.seen[0] > 0) || !SET.fog;
    for (const v of S.vehicles || []){ if (!v.alive || !vis(v)) continue;
      if (v.boss83) this.mark('boss:' + v.boss83, BOSS83.nameK(v.boss83));
      else if (v.vk) this.mark('u:' + v.vk, N2(VK[v.vk].n[FI76(v.team) ? 1 : 0]));
      else if (v.rhino76) this.mark('u:rhino76', N2(PRODUCTS.rhino76.n)); }
    const eyes = [];
    const me = ctrlEntity(); if (me) eyes.push(me.pos);
    for (const g of groupsOf(0).slice(0, 14)){ const L = leaderOf(g); if (L && L.pos) eyes.push(L.pos); }
    const near = (p, r) => eyes.some(q => dist(q, p) < r);
    if (typeof A78 !== 'undefined') for (const a of A78.L || []) if (a.pos && A78.K[a.k] && near(a.pos, 70)) this.mark('a:' + a.k, N2(A78.K[a.k].n));
    if (typeof VER86 !== 'undefined') for (const f of VER86.L || []) if (f.pos && VER86.SP[f.sp] && f.alive !== false && near(f.pos, 60)) this.mark('f:' + f.sp, N2(VER86.SP[f.sp].n));
  },
  // ---------------------------------------------------------------- подписи статов
  st(k, v){ return [k, v]; },
  LB(){ const L = this.L; return {
    hp: L('Прочность', 'HP', 'Độ bền'), cost: L('Руда', 'Ore', 'Quặng'), time: L('Время, с', 'Time, s', 'T.gian, s'), lim: L('Лимит', 'Limit', 'Giới hạn'),
    spd: L('Скорость', 'Speed', 'Tốc độ'), dmg: L('Урон', 'Damage', 'Sát thương'), rng: L('Дальность, м', 'Range, m', 'Tầm, m'), r: L('Радиус, м', 'Radius, m', 'Bán kính, m'),
    cp: L('КО', 'CP', 'ĐCH'), cd: L('Перезарядка, с', 'Cooldown, s', 'Hồi, s'), at: L('Где', 'Where', 'Ở đâu'), req: L('Нужно', 'Requires', 'Cần'),
    un: L('Открывается', 'Unlocks', 'Mở khóa'), agro: L('Агрессия, м', 'Aggro, m', 'Kích động, m'), vis: L('Обзор, м', 'Vision, m', 'Tầm nhìn, m') }; },
  AR: { b: ['пули', 'bullets', 'đạn'], m: ['крупный калибр', 'heavy MG', 'đại liên'], r: ['ракеты', 'rockets', 'tên lửa'], s: ['снаряды', 'shells', 'đạn pháo'], f: ['зенитки', 'flak', 'phòng không'],
        g: ['гранаты', 'grenades', 'lựu đạn'], a: ['артиллерия, бомбы', 'artillery, bombs', 'pháo, bom'], l: ['рельса', 'rail', 'súng ray'], x: ['орбита', 'orbital', 'quỹ đạo'] },
  armor(cls){
    const A = typeof ARMOR !== 'undefined' && ARMOR[cls]; if (!A) return '';
    return this.L('Урон по броне: ', 'Damage vs armour: ', 'Sát thương: ') + Object.keys(this.AR).filter(k => A[k] !== undefined).map(k => `${N2(this.AR[k])} ×${A[k]}`).join(' · ');
  },
  where(P){ return (P.at || []).map(a => a === 'hq' ? this.L('Штаб', 'HQ', 'Sở chỉ huy') : BTYPES[a] ? N2(BTYPES[a].n) : a).join(', '); },
  pc(P, i){ const c = Array.isArray(P.cost) ? P.cost.join('/') : P.cost, t = Array.isArray(P.time) ? P.time.join('/') : P.time; return [[this.LB().cost, c], [this.LB().time, t]]; },
  abilOf(who){ return typeof ABIL === 'undefined' ? '' : Object.keys(ABIL).filter(k => ABIL[k].who === who).map(k => `${ABIL[k].icon} ${N2(ABIL[k].n)} (${ABIL[k].cd} ${this.L('с', 's', 's')})`).join(' · '); },
  // ---------------------------------------------------------------- записи
  build(){
    const L = this.L, B = this.LB(), E = [], P = typeof PRODUCTS !== 'undefined' ? PRODUCTS : {};
    const add = o => { o.tags = o.tags || []; E.push(o); };
    const fi = f => (f === 0 || f === 1) ? f : undefined;
    // ---- Юниты: классы бойцов
    const FS = typeof FAC76 !== 'undefined' ? FAC76.ST : null;
    for (const k in ROLES){ const R = ROLES[k];
      const hp = FS ? `${R.hp} (${this.fn(0).charAt(0)} ${Math.round(R.hp * FS[0].infHp)} · ${this.fn(1).charAt(0)} ${Math.round(R.hp * FS[1].infHp)})` : R.hp;
      add({ cat: 'units', key: 'role:' + k, icon: R.icon, name: N2(R.n), sub: L('Боец', 'Trooper', 'Lính'), desc: N2(R.d),
        stats: [[B.hp, hp], [B.dmg, R.dmg], [B.spd, '×' + R.speed]].concat(R.range ? [[B.rng, R.range]] : []).concat(R.vision ? [[B.vis, R.vision]] : []),
        more: [WEAPONS[R.w] ? L('Оружие: ', 'Weapon: ', 'Vũ khí: ') + N2(WEAPONS[R.w].n) : '', R.heal ? L('Чинит соседей', 'Repairs others', 'Sửa đồng đội') : ''] }); }
    const comp = r => (r || []).map(x => ROLES[x] ? ROLES[x].icon + ' ' + N2(ROLES[x].n) : x).join(', ');
    const inf = [['squad', comp(SQUAD_ROLES.std)], ['elite', comp(SQUAD_ROLES.elite)], ['sniper1'], ['scout1'], ['heavy1'], ['pod'], ['builder']];
    for (const [k, c] of inf){ const p = P[k]; if (!p) continue;
      const d = p.d ? N2(p.d) : p.d76 ? N2(p.d76) : k === 'builder' ? L('Строит здания и экстракторы, чинит, снимает «Железный пух» с соседей.', 'Builds structures and extractors, repairs, cleans Steel fluff off others.')
        : k === 'pod' ? L('Отряд прилетает с пусковой площадки базы через небо-портал прямо к цели.', 'A squad flies from the base launch pad through the sky portal right to the target.')
        : c ? L('Отряд: ', 'Squad: ', 'Đội: ') + c : (p.solo && ROLES[p.solo] ? N2(ROLES[p.solo].d) : '');
      const st = this.pc(p).concat([[B.at, this.where(p)]]);
      if (k === 'builder') st.unshift([B.hp, this.FB.builderHp]), st.push([B.lim, GAME.MAX_BUILDERS]);
      if (k === 'squad' || k === 'elite') st.push([B.lim, GAME.MAX_SQUADS]);
      add({ cat: 'units', key: 'p:' + k, icon: p.icon, name: N2(p.n), sub: k === 'builder' ? L('Инженер', 'Engineer', 'Kỹ sư') : L('Пехота', 'Infantry', 'Bộ binh'), desc: d, stats: st,
        more: [c && d.indexOf(c) < 0 ? L('Состав: ', 'Members: ', 'Thành phần: ') + c : '', k === 'squad' ? this.abilOf('squad') : ''] }); }
    // ---- Техника
    if (P.tank) add({ cat: 'units', key: 'p:tank', icon: P.tank.icon, name: N2(TANK_NAME[0]) + ' / ' + N2(TANK_NAME[1]), sub: N2(P.tank.n),
      desc: L('Основной танк: пушка и пулемёт. У Консорциума — «Бульдог» (крепче), у Роя — «Паук» (быстрее).', 'Main battle tank: cannon and MG. Consortium "Bulldog" is tougher, Swarm "Spider" is faster.'),
      stats: [[B.hp, this.FB.tankHp.join(' / ')]].concat(this.pc(P.tank), [[B.at, this.where(P.tank)], [B.lim, GAME.MAX_TANKS]]), more: [this.abilOf('tank'), this.armor('tank')] });
    if (P.rhino76) add({ cat: 'units', key: 'u:rhino76', gate: 1, fac: 0, icon: P.rhino76.icon, name: N2(P.rhino76.n), sub: L('Тяжёлый танк', 'Heavy tank', 'Xe tăng nặng'), desc: N2(P.rhino76.d76),
      stats: [[B.hp, this.FB.rhinoHp]].concat(this.pc(P.rhino76), [[B.lim, P.rhino76.lim76]]), more: [this.armor('tank')] });
    if (typeof VK !== 'undefined') for (const k of ['raider', 'mlrs', 'cat']){ const K = VK[k], p = P[k]; if (!K || !p) continue;
      add({ cat: 'units', key: 'u:' + k, gate: 1, icon: K.icon, name: N2(K.n[0]) + ' / ' + N2(K.n[1]), sub: N2(K.cls[0]) + ' / ' + N2(K.cls[1]), desc: N2(p.d),
        stats: [[B.hp, K.hp.join(' / ')], [B.spd, K.walk.join(' / ')]].concat(K.rmax ? [[B.rng, (K.rmin ? (Array.isArray(K.rmin) ? K.rmin[0] : K.rmin) + '–' : '') + K.rmax]] : [], this.pc(p), p.unlock ? [[B.un, fmtTime(p.unlock)]] : []),
        more: [this.abilOf(k), this.armor(K.armor)] }); }
    if (P.drone) add({ cat: 'units', key: 'p:drone', icon: P.drone.icon, name: N2(P.drone.n), sub: L('Дрон', 'Drone', 'Drone'), desc: L('Автономный летающий стрелок: быстрый, хрупкий, боится ПВО.', 'Autonomous flying gunner: fast, fragile, fears anti-air.'),
      stats: [[B.hp, this.FB.droneHp]].concat(this.pc(P.drone), [[B.at, this.where(P.drone)], [B.lim, GAME.MAX_DRONES]]), more: [this.abilOf('drone'), this.armor('drone')] });
    for (const k of ['pack76', 'plates76', 'phase76', 'jet2', 'armor', 'weapons', 'drill']){ const p = P[k]; if (!p) continue;
      add({ cat: 'units', key: 'p:' + k, fac: fi(p.fac76), icon: p.icon, name: N2(p.n), sub: p.research ? L('Улучшение', 'Upgrade', 'Nâng cấp') : L('Дроны', 'Drones', 'Drone'),
        desc: p.d76 ? N2(p.d76) : k === 'jet2' ? L('Ранцы дальше и быстрее для всей пехоты.', 'Longer, faster jetpacks for all infantry.') : k === 'drill' ? L('Экстракторы добывают больше руды.', 'Extractors mine more ore.') : L('Уровни для всей армии: меньше урона по своим / больше урона по врагу.', 'Army-wide levels: less damage taken / more damage dealt.'),
        stats: this.pc(p).concat([[B.at, this.where(p)]], p.max ? [[L('Уровней', 'Levels', 'Cấp'), p.max]] : []) }); }
    // ---- Здания (включая скрытые здания другой фракции — неперечисляемые ключи v8.2)
    const LIMB = { turret: 'MAX_TURRETS', aa: 'MAX_AA', outpost: 'MAX_OUTPOSTS' };
    add({ cat: 'bld', key: 'b:hq', icon: '⌂', name: L('Штаб', 'HQ', 'Sở chỉ huy'), sub: L('База', 'Base', 'Căn cứ'), desc: L('Сердце базы: отряды, инженеры, капсулы, исследования. Потеря штаба — поражение.', 'Heart of the base: squads, engineers, pods, research. Lose it and you lose.'),
      stats: [[B.hp, GAME.HQ_HP]], more: [L('Производит: ', 'Produces: ', 'Sản xuất: ') + Object.keys(P).filter(k => (P[k].at || []).includes('hq')).map(k => N2(P[k].n)).join(', ')] });
    if (typeof LCH87 !== 'undefined') add({ cat: 'bld', key: 'b:pad', icon: '⇧', name: L('Пусковая площадка', 'Launch pad', 'Bệ phóng'), sub: L('База', 'Base', 'Căn cứ'),
      desc: L('Шахта у штаба: отсюда стартуют капсулы, ящики снабжения и бомбардировщики — через небо-портал к цели. Строить на ней нельзя.', 'A silo next to the HQ: pods, supply crates and bombers launch from here through the sky portal. Nothing can be built on it.'), stats: [] });
    for (const k of Object.getOwnPropertyNames(BTYPES)){ const b = BTYPES[k]; if (!b || !b.n) continue;
      const prod = Object.keys(P).filter(p => (P[p].at || []).includes(k)).map(p => N2(P[p].n));
      const st = [[B.hp, b.hp], [B.cost, b.cost], [B.time, b.time]];
      if (b.lim82 && b.lim82 < 99) st.push([B.lim, b.lim82]); else if (LIMB[k]) st.push([B.lim, GAME[LIMB[k]]]);
      if (b.req && BTYPES[b.req]) st.push([B.req, N2(BTYPES[b.req].n)]);
      if (k === 'asm83c' || k === 'asm83s') st.push([B.un, fmtTime(BOSS83.UNLOCK)]);
      add({ cat: 'bld', key: 'b:' + k, fac: fi(b.fac82), icon: (typeof BICON !== 'undefined' && BICON[k]) || '▪', name: N2(b.n), sub: b.vein ? L('Экономика', 'Economy', 'Kinh tế') : b.key ? L('Ключевое', 'Key building', 'Then chốt') : L('Здание', 'Building', 'Công trình'),
        desc: this.n2(b.d), stats: st, more: [prod.length ? L('Производит: ', 'Produces: ', 'Sản xuất: ') + prod.join(', ') : '', this.armor('bld')] }); }
    // ---- Боссы
    if (typeof BOSS83 !== 'undefined') for (const k of ['c', 's']){ const K = BOSS83.K[k], p = P[K.key] || {}, f = k === 'c' ? 0 : 1;
      add({ cat: 'boss', key: 'boss:' + k, gate: 1, fac: f, icon: p.icon || '★', name: N2(K.n), sub: N2(K.cls), desc: this.n2(p.d76),
        stats: [[B.hp, K.hp], [B.spd, K.walk]].concat(this.pc(p), [[B.at, this.where(p)], [B.un, fmtTime(BOSS83.UNLOCK)], [B.lim, 1]]),
        more: [k === 'c' ? L(`Слабое место — корма (двигатель): урон ×${this.FB.weak}. Пушка, 2 пулемётные башенки, ракетная кассета; очень медленно поворачивает — обходите сбоку.`, `Weak spot — the rear (engine): damage ×${this.FB.weak}. Cannon, 2 MG turrets, rocket pod; turns very slowly — flank it.`)
                         : L(`Слабое место — светящееся ядро под брюхом: урон снизу ×${this.FB.weak}. Луч искажения и топот по площади; перешагивает барьеры — держите дистанцию, не стойте кучей.`, `Weak spot — the glowing core underneath: damage from below ×${this.FB.weak}. Distortion beam and area stomp; steps over barriers — keep distance, don't bunch up.`),
               L('Против: авиабомбы и артиллерия (×' + ARMOR.boss83.a + '), ракеты (×' + ARMOR.boss83.r + '), ковровая бомбардировка; пули почти бесполезны (×' + ARMOR.boss83.b + ').', 'Counter: bombs and artillery (×' + ARMOR.boss83.a + '), rockets (×' + ARMOR.boss83.r + '), carpet bombing; bullets barely scratch it (×' + ARMOR.boss83.b + ').'),
               this.armor('boss83')] }); }
    // ---- Фракции
    if (FS) for (const f of [0, 1]){ const F = FS[f];
      const uniq = Object.keys(P).filter(k => P[k].fac76 === f).map(k => N2(P[k].n)).concat(Object.getOwnPropertyNames(BTYPES).filter(k => BTYPES[k].fac82 === f && !BTYPES[k].auto82).map(k => N2(BTYPES[k].n)));
      const pct = x => (x >= 1 ? '+' : '−') + Math.round(abs(x - 1) * 100) + ' %';
      add({ cat: 'fac', key: 'fac:' + f, fac: f, icon: f ? '✺' : '⛨', name: this.fn(f), sub: L('Фракция', 'Faction', 'Phe'),
        desc: f ? L('Быстрые машины, стаи дронов, туннели и регенерация. Пехота легче, но быстрее; пушки и рельсы бьют сильнее.', 'Fast machines, drone packs, tunnels and regeneration. Lighter but faster infantry; cannons and rails hit harder.')
                : L('Тяжёлая пехота в силовой броне, бетонные барьеры, ремонт и артиллерия. Медленнее, но крепче.', 'Heavy power-armoured infantry, concrete barriers, repair and artillery. Slower but tougher.'),
        stats: [[L('Пехота: прочность', 'Infantry HP', 'Bộ binh: bền'), pct(F.infHp)], [L('Пехота: скорость', 'Infantry speed', 'Bộ binh: tốc độ'), pct(F.infWalk)], [L('Ранцы', 'Jetpacks', 'Ba lô'), pct(F.jet)],
                [L('Танк', 'Tank', 'Xe tăng'), N2(TANK_NAME[f]) + ' ' + this.FB.tankHp[f]]],
        more: [Object.keys(F.out || {}).length ? L('Урон оружия: ', 'Weapon damage: ', 'Sát thương: ') + Object.keys(F.out).map(k => `${N2(this.AR[k] || [k, k])} ${pct(F.out[k])}`).join(' · ') : '',
               typeof VK !== 'undefined' ? L('Техника: ', 'Vehicles: ', 'Xe: ') + ['raider', 'mlrs', 'cat'].map(k => N2(VK[k].n[f])).join(', ') : '',
               L('Уникальное: ', 'Unique: ', 'Riêng: ') + uniq.join(', '),
               typeof BOSS83 !== 'undefined' ? L('Босс: ', 'Boss: ', 'Trùm: ') + N2(BOSS83.K[f ? 's' : 'c'].n) : '',
               f ? L('«Командир»: всплеск регенерации, рывок на ранцах.', 'Commander: regen burst, jet leap.') : L('«Командир»: полевой медик, мини-барьер.', 'Commander: field medic, mini barrier.')] }); }
    // ---- Аномалии
    if (typeof A78 !== 'undefined'){
      const W = { vein: 1, grav: 1, arc: 1, burn: 1, mist: 1, lens: 1, disloc: 2, mosaic: 2, geyser: 2, draft: 2, mute: 2, fluff: 3 };
      const D = this.AD();
      for (const k in A78.K){ const K = A78.K[k], d = D[k] || ['', ''], w = W[k] || 2;
        const warn = typeof CHAT !== 'undefined' && CHAT['a78_' + k] && CHAT['a78_' + k][0];
        add({ cat: 'anom', key: 'a:' + k, gate: 1, icon: K.icon, css: K.css, name: N2(K.n), sub: w === 1 ? L('Волна 1 · v7.8', 'Wave 1 · v7.8', 'Đợt 1') : w === 2 ? L('Волна 2 · v8.6', 'Wave 2 · v8.6', 'Đợt 2') : L('Осень · v8.10', 'Autumn · v8.10', 'Mùa thu'),
          desc: L(d[0], d[1]), stats: [[B.r, K.r]].concat(K.drift ? [[L('Дрейф', 'Drift', 'Trôi'), L('да', 'yes', 'có')]] : []),
          more: [warn ? L('Признак (радио): ', 'Tell (radio): ', 'Dấu hiệu: ') + '«' + N2(warn) + '»' : '', d[2] ? L(d[2], d[3]) : '',
                 k === 'fluff' ? '' : L('Разрядить: взрыв или брошенный болт (E / «Болт») — уснёт на 20–35 с, иногда оставит артефакт.', 'Discharge: an explosion or a thrown bolt (E / "Bolt") — it sleeps 20–35 s, sometimes leaves an artifact.')] }); }
      if (A78.AK) add({ cat: 'anom', key: 'a:arts', icon: '◆', name: L('Артефакты', 'Artifacts', 'Cổ vật'), sub: L('Награда', 'Reward', 'Thưởng'),
        desc: L('Иногда остаются после разрядки аномалии. Всегда плюс и минус, действуют 3 минуты.', 'Sometimes left after an anomaly is discharged. Always a plus and a minus, last 3 minutes.'),
        stats: [], more: Object.keys(A78.AK).map(k => { const a = A78.AK[k]; return `${N2(a.n)}: + ${N2(a.p)} · − ${N2(a.m)}`; }) });
    }
    // ---- Фауна
    if (typeof VER86 !== 'undefined'){
      add({ cat: 'fauna', key: 'f:all', icon: '❀', name: L('Верданы', 'Verdans', 'Verdan'), sub: L('Раса растений', 'Plant race', 'Chủng thực vật'),
        desc: L('Живут в «Зелёной аномальной зоне», тянутся к жилам. Нейтральны, пока не тронешь или не подойдёшь; опасны обеим сторонам. Огонь и напалм — ×1.6.', 'Live in the Green anomalous zone, drawn to crystal veins. Neutral until touched or approached; dangerous to both sides. Fire and napalm ×1.6.'), stats: [] });
      const D = this.FD();
      for (const k in VER86.SP){ const K = VER86.SP[k], d = D[k] || { d: ['', ''] };
        add({ cat: 'fauna', key: 'f:' + k, gate: 1, icon: d.i || '✿', css: K.css, name: N2(K.n), sub: k === 'root' || k === 'swarm' ? 'v8.10' : 'v8.6', desc: L(...d.d),
          stats: [[B.hp, K.hp], [B.agro, K.agroR]].concat(K.run ? [[B.spd, K.run]] : []), more: d.c ? [L(...d.c)] : [] }); }
    }
    // ---- Поддержка (за КО) и способности «Командира»
    if (typeof POWERS !== 'undefined') for (const k in POWERS){ const p = POWERS[k];
      add({ cat: 'sup', key: 's:' + k, icon: p.icon, name: N2(p.n), sub: '📡 ' + L('Поддержка', 'Support', 'Hỗ trợ'), desc: N2(p.d),
        stats: [[B.cp, p.cost], [B.cd, p.cd]].concat(p.r ? [[B.r, p.r]] : []) }); }
    if (typeof AB85 !== 'undefined') for (const k in AB85){ const a = AB85[k];
      add({ cat: 'sup', key: 'c:' + k, icon: a.ic, name: N2(a.n), sub: '⌖ ' + L('Командир', 'Commander', 'Chỉ huy'), desc: N2(a.d), fac: k === 'regen' ? 1 : k === 'barrier' ? 0 : undefined,
        stats: [[B.cd, a.cd]].concat(a.r ? [[B.rng, a.r]] : []) }); }
    // ---- Режимы и управление
    for (const m of this.MODES()) add(Object.assign({ cat: 'modes', stats: [], raw: 1 }, m));
    // ---- Биомы и погода
    if (typeof BIO86 !== 'undefined') BIO86.NAME.forEach((n, i) => { const d = this.BD()[i];
      add({ cat: 'world', key: 'w:b' + i, icon: ['◌', '❀', '❦', '❄'][i], name: N2(n), sub: L('Биом', 'Biome', 'Quần xã'), desc: L(d[0], d[1]), stats: [] }); });
    for (const w of this.WD()) add({ cat: 'world', key: 'w:' + w.k, icon: w.i, name: L(...w.n), sub: L('Погода', 'Weather', 'Thời tiết'), desc: L(...w.d), stats: [] });
    this.stats.cards = E.length;
    return E;
  },
  // ---------------------------------------------------------------- тексты, которых нет в таблицах
  AD(){ return {
    vein: ['Зелёный кристалл гудит и ритмично бьёт импульсами по кругу — перед импульсом вспыхивает.', 'A humming green crystal that pulses around itself — it flashes before each pulse.', 'Проходите между импульсами или разрядите взрывом.', 'Pass between pulses or discharge it with an explosion.'],
    grav: ['Затягивает к центру и швыряет о землю. Видно по камням, парящим над воронкой.', 'Pulls you to the centre and slams you down. Look for rocks floating above it.', 'Обходите по краю, не прыгайте на ранце над ним.', 'Go around the edge, don\'t jetpack over it.'],
    arc: ['Дуги тока между стержнями — бьют всех, кто внутри, технику тоже.', 'Electric arcs between rods hit everyone inside, vehicles too.', 'Слышен треск; проскочите в паузе между разрядами.', 'You hear crackling; dash through between discharges.'],
    burn: ['Наступишь — столб огня. Над ним дрожит горячий воздух.', 'Step on it and a pillar of fire bursts out. The air shimmers above it.', 'Смотрите на марево под ногами; болт поджигает её заранее.', 'Watch for heat haze underfoot; a bolt sets it off early.'],
    mist: ['Дрейфующее зелёное облако: урон по времени, пока стоишь внутри.', 'A drifting green cloud: damage over time while inside.', 'Медленно плывёт — просто уйдите с его пути.', 'It drifts slowly — just step out of its way.'],
    lens: ['Дрейфующее искажение пространства: гнёт пули и «плывёт» экран.', 'A drifting space distortion: bends bullets and warps the screen.', 'Не стреляйте сквозь неё — пули уйдут в сторону.', 'Don\'t shoot through it — bullets veer off.'],
    disloc: ['Пыль «падает вверх»: юнита уносит в небо-портал и через ~5 с выбрасывает в антиподе (выход виден обеим сторонам).', 'Dust falls upwards: a unit is pulled into the sky portal and thrown out at the antipode ~5 s later (exit visible to both sides).', 'Можно использовать как телепорт — но выход видят враги.', 'Can be used as a teleport — but enemies see the exit.'],
    mosaic: ['Квадрат 10×10 м крупных «пикселей»: движение рывками, разброс +50 %, ИИ теряет цели.', 'A 10×10 m square of big "pixels": jerky movement, +50% spread, AI loses targets.', 'Укрытие от ИИ, но стрелять оттуда трудно.', 'Cover from the AI, but hard to shoot from.'],
    geyser: ['Иней на земле, шипение 2 с — потом столб пара: заморозка (−60 % скорости, +40 % урона от взрывов, 8 с). Снег.', 'Frost on the ground, 2 s of hissing — then a steam column: freeze (−60% speed, +40% blast damage, 8 s). Snow.', 'Услышали шипение — сразу в сторону.', 'Hear the hiss — step aside at once.'],
    draft: ['Полоса марева 6×30 м толкает юнитов, ранцы и даже снаряды; направление меняется раз в 2 минуты. Осень.', 'A 6×30 m strip of haze pushes units, jetpacks and even projectiles; direction changes every 2 minutes. Autumn.', 'Ракеты через неё сносит — стреляйте с поправкой.', 'Rockets drift through it — lead your shots.'],
    mute: ['Серая статика: внутри нет радио и поддержки, обзор роботов ×0.4, выстрелы тихие.', 'Grey static: no radio or support inside, robot vision ×0.4, shots are quiet.', 'Хорошо для засады, плохо для вызова поддержки.', 'Good for ambushes, bad for calling support.'],
    fluff: ['Поляна стальных одуванчиков: пух налипает и разъедает броню −2/с, перескакивает на соседей при касании.', 'A meadow of steel dandelions: fluff sticks and corrodes armour −2/s, jumps to neighbours on contact.', 'Снять: инженер рядом (1.5 с) или стоять на месте 3 с вне боя; взрыв или болт сдувает пух.', 'Clean: an engineer nearby (1.5 s) or stand still 3 s out of combat; an explosion or bolt blows it away.'],
  }; },
  FD(){ return {
    whip: { i: '⌇', d: ['Корневище с лозами: почти не ходит, хлещет лозой всех рядом (урон и отброс).', 'A rootstock with vines: barely moves, lashes everyone nearby (damage and knockback).'], c: ['Бейте издалека — дальше радиуса агрессии он безопасен.', 'Hit it from range — beyond its aggro radius it is harmless.'] },
    spore: { i: '♣', d: ['Гриб со светящейся шляпкой: тронешь или подойдёшь — облако спор (урон и подавление, 6 с).', 'A mushroom with a glowing cap: touch or approach it and it bursts into spores (damage and suppression, 6 s).'], c: ['Стреляйте издалека или обходите.', 'Shoot from afar or walk around.'] },
    shell: { i: '⬢', d: ['Бронированный и медленный, пули почти не берут; рассердишь — таранит.', 'Armoured and slow, bullets barely work; anger it and it rams.'], c: ['Ракеты, гранаты, огонь.', 'Rockets, grenades, fire.'] },
    tri: { i: '⋀', d: ['Охотник на трёх ногах: подошёл близко — догоняет и бьёт когтями, через 20 с отстаёт.', 'A three-legged hunter: get close and it chases you and claws, gives up after 20 s.'], c: ['Держите дистанцию или уходите на ранце.', 'Keep your distance or escape by jetpack.'] },
    root: { i: '⥮', d: ['Корневище на ногах-корнях: зарывается (пыльный холмик идёт под землёй, неуязвим), выныривает под целью с подбросом.', 'A rootstock on root legs: burrows (a dust mound moves underground, invulnerable), surfaces under its target and tosses it.'], c: ['Следите за холмиком и отходите; бейте, пока он наверху.', 'Watch the mound and back off; hit it while it is above ground.'] },
    swarm: { i: '✧', d: ['Облако светящихся червячков: догоняет и «кусает» понемногу, пули почти бесполезны.', 'A cloud of glowing worms: chases you and nibbles; bullets barely work.'], c: ['Взрыв разгоняет рой на 6 с — граната лучше пулемёта.', 'An explosion scatters it for 6 s — a grenade beats the MG.'] },
  }; },
  BD(){ return [
    ['Пыль и базальт, шапки у штабов, лава. Обычные правила боя.', 'Dust and basalt, caps around the HQs, lava. Standard combat rules.'],
    ['Изумрудная трава, споры, кристаллы: трава прячет пехоту — дальше 40 м её не видно, пока не стреляет. Здесь живут верданы.', 'Emerald grass, spores, crystals: the grass hides infantry beyond 40 m until it fires. Verdans live here.'],
    ['Осенняя листва и листопад: шаги громче — враг слышит бегущих за 32 м. Здесь бывают Сквозняк и Железный пух.', 'Autumn leaves: footsteps are louder — the enemy hears runners at 32 m. Draughts and Steel fluff appear here.'],
    ['Снег: пехота −15 % скорости, обзор ×0.7, рядом ледяное озеро; метель и гейзеры хладагента.', 'Snow: infantry −15% speed, vision ×0.7, an ice lake nearby; blizzards and coolant geysers.'],
  ]; },
  WD(){ return [
    { k: 'rain', i: '☂', n: ['Дождь', 'Rain'], d: ['Видимость ×0.65, шагов не слышно.', 'Visibility ×0.65, footsteps are silent.'] },
    { k: 'fog', i: '≡', n: ['Туман', 'Fog'], d: ['Видимость 25 м: ИИ не берёт цель дальше.', 'Visibility 25 m: the AI cannot target beyond it.'] },
    { k: 'smoke', i: '☁', n: ['Дым', 'Smoke'], d: ['От больших взрывов, сбитой техники и напалма (30 с): цель в дыму дальше 10 м не видна.', 'From big explosions, wrecks and napalm (30 s): targets in smoke beyond 10 m are hidden.'] },
    { k: 'snow', i: '❄', n: ['Метель', 'Blizzard'], d: ['Только в «Белой шапке»: видимость ×0.5, белая пелена.', 'White cap only: visibility ×0.5, a white veil.'] },
    { k: 'dust', i: '◍', n: ['Пылевая буря и метеоритный дождь', 'Dust storm and meteor shower'], d: ['Сильно режут обзор; камни с неба бьют по всем — уходите в укрытие.', 'Cut vision hard; falling rocks hit everyone — take cover.'] },
  ]; },
  MODES(){
    const L = this.L, K = a => `<kbd>${this.esc(typeof keyLabel === 'function' && SET.bind && SET.bind[a] ? keyLabel(SET.bind[a]) : '?')}</kbd>`;
    const bn = a => typeof BIND_NAMES !== 'undefined' && BIND_NAMES[a] ? N2(BIND_NAMES[a]) : a;
    const pad = i => { if (typeof GP812 === 'undefined' || !GP812.MAP) return ''; const M = GP812.safe(() => GP812.MAP(), 'map'); const g = M && M[i]; return g ? '🎮 ' + g[1].map(r => r[0] + ' — ' + r[1]).join(' · ') : ''; };
    return [
      { key: 'm:ladder', icon: '⇅', name: L('Три режима — одна кнопка', 'Three modes — one button', 'Ba chế độ'), sub: L('Лестница', 'Ladder', 'Thang'),
        desc: L('Стратег → Командир → Шутер: одна кнопка режима (ПК — Tab/P, телефон — кнопка вверху, геймпад — View; удержание — выбор из трёх).', 'Strategist → Commander → Shooter: one mode button (PC Tab/P, phone — top button, gamepad — View; hold to pick).'),
        more: [L('Пауза: Esc / ☰ / Menu. Справка: F1 в бою, полный список клавиш — «/». Чистый экран — F9.', 'Pause: Esc / ☰ / Menu. Help: F1 in battle, full key list "/". Clean screen F9.')] },
      { key: 'm:rts', icon: '◩', name: L('Стратег', 'Strategist', 'Chiến lược'), sub: L('Режим', 'Mode', 'Chế độ'),
        desc: L('Вид сверху: стройка, производство, приказы группам, поддержка за КО. ЛКМ — выбрать, ПКМ — приказ; на телефоне — тапы и панель стройки.', 'Top view: building, production, group orders, CP support. LMB select, RMB order; on phone — taps and the build panel.'),
        more: [L('Здания: Z X C V B N K · группы v8.0 справа · ', 'Buildings: Z X C V B N K · v8.0 groups on the right · ') + K('rts') + ' ' + bn('rts'), pad(2)] },
      { key: 'm:cmd', icon: '⌖', name: L('Командир', 'Commander', 'Chỉ huy'), sub: L('Режим', 'Mode', 'Chế độ'),
        desc: L('Наклонная камера над своим отрядом: клик — идти, по врагу — атаковать, 1–4 — способности, Tab — другой отряд, двойной клик по бойцу — нырок в шутер.', 'Tilted camera over your squad: click to move, on an enemy to attack, 1–4 abilities, Tab next squad, double-click a trooper to dive into the shooter.'),
        more: [L('Камера: Q/E, колесо, WASD, Пробел — к отряду.', 'Camera: Q/E, wheel, WASD, Space — back to squad.'), pad(1)] },
      { key: 'm:fps', icon: '⊕', name: L('Шутер', 'Shooter', 'Bắn súng'), sub: L('Режим', 'Mode', 'Chế độ'),
        desc: L('Бой от первого лица за любого бойца или технику. Ранец, подкат, граната, ракета, рефлекс, артудар, удар прикладом.', 'First-person combat as any trooper or vehicle. Jetpack, slide, grenade, rocket, reflex, artillery, rifle-butt melee.'),
        more: [['fwd', 'jump', 'run', 'down', 'reload', 'rocket', 'grenade', 'reflex', 'strike', 'interact', 'sup78', 'switch'].filter(a => SET.bind && SET.bind[a]).map(a => K(a) + ' ' + this.esc(bn(a))).join(' · '),
               L('Телефон: левый джойстик — ходьба, правая половина — обзор, кнопки справа.', 'Phone: left joystick to move, right half to look, buttons on the right.'), pad(0)], raw: 1 },
    ];
  },
  // ---------------------------------------------------------------- страница
  CATS(){ const L = this.L; return [
    ['units', '◆', L('Юниты', 'Units', 'Đơn vị')], ['bld', '⚙', L('Здания', 'Buildings', 'Công trình')], ['boss', '★', L('Боссы', 'Bosses', 'Trùm')],
    ['fac', '⚑', L('Фракции', 'Factions', 'Phe')], ['anom', '◎', L('Аномалии', 'Anomalies', 'Dị thường')], ['fauna', '❀', L('Фауна', 'Fauna', 'Sinh vật')],
    ['sup', '📡', L('Поддержка', 'Support', 'Hỗ trợ')], ['modes', '⇅', L('Режимы', 'Modes', 'Chế độ')], ['world', '◍', L('Мир', 'World', 'Thế giới')]]; },
  locked(e){ return e.gate && !this.all && !this.seen.has(e.key); },
  list(){
    const E = this.build(), q = this.q.trim().toLowerCase();
    return E.filter(e => (this.fac === 'all' || e.fac === undefined || e.fac === +this.fac) && (q ? !this.locked(e) && (e.name + ' ' + e.sub + ' ' + e.desc + ' ' + (e.more || []).join(' ')).replace(/<[^>]+>/g, '').toLowerCase().indexOf(q) >= 0 : e.cat === this.cat));
  },
  card(e){
    const L = this.L, lk = this.locked(e), op = !lk && this.open === e.key, cn = this.CATS().find(c => c[0] === e.cat);
    const facT = e.fac === 0 || e.fac === 1 ? `<em class="f${e.fac}">${this.esc(this.fn(e.fac))}</em>` : '';
    if (lk) return `<button class="cxc lk" data-cx813="${e.key}"><i>?</i><div><b>???</b><small>${this.esc(e.sub)}</small><p>${L('??? — встретьте в бою', '??? — meet it in battle', '??? — gặp trong trận')}</p></div></button>`;
    const st = (e.stats || []).filter(s => s[1] !== undefined && s[1] !== '').map(s => `<span><u>${this.esc(s[0])}</u>${this.esc(s[1])}</span>`).join('');
    const more = op ? (e.more || []).filter(Boolean).map(m => `<p class="m">${e.raw ? m : this.esc(m)}</p>`).join('') : '';
    return `<button class="cxc${op ? ' op' : ''}" data-cx813="${e.key}"><i style="${e.css ? 'color:' + e.css : ''}">${this.esc(e.icon || '•')}</i><div><b>${this.esc(e.name)}</b><small>${this.esc(e.sub)}${this.q && cn ? ' · ' + this.esc(cn[2]) : ''} ${facT}</small>
      <p>${this.esc(e.desc)}</p>${st ? `<div class="cxs">${st}</div>` : ''}${more}${(e.more || []).some(Boolean) && !op ? `<small class="mo">${L('▸ подробнее', '▸ more', '▸ thêm')}</small>` : ''}</div></button>`;
  },
  body(){
    const L = this.L, E = this.list(); this.stats.renders++;
    const all = this.build().filter(e => e.gate), got = all.filter(e => this.seen.has(e.key)).length;
    const cnt = $('cx813cnt'); if (cnt) cnt.textContent = L('встречено', 'met', 'đã gặp') + ` ${got}/${all.length}`;
    return E.length ? E.map(e => this.card(e)).join('') : `<p class="cxe">${L('Ничего не найдено', 'Nothing found', 'Không tìm thấy')}</p>`;
  },
  html(){
    const L = this.L, ph = typeof TOUCH !== 'undefined' && TOUCH.on;
    const tabs = this.CATS().map(([k, ic, n]) => `<button id="cx813t_${k}" class="cxt${!this.q && this.cat === k ? ' cur pri' : ''}" data-cxt="${k}">${ic} ${n}</button>`).join('');
    const fac = [['all', L('Все', 'All', 'Tất cả')], ['0', this.fn(0)], ['1', this.fn(1)]].map(([v, n]) => `<button class="cxf${String(this.fac) === v ? ' cur' : ''}" data-cxf="${v}">${this.esc(n)}</button>`).join('');
    return `<div class="cx813"><div class="cxh"><h2>📖 ${L('ЭНЦИКЛОПЕДИЯ', 'ENCYCLOPEDIA', 'BÁCH KHOA')}</h2>
      ${ph ? '' : `<input id="cx813q" type="text" placeholder="${L('Поиск…', 'Search…', 'Tìm…')}" value="${this.esc(this.q)}" autocomplete="off">`}
      <span class="cxfr">${fac}</span><button class="cxa${this.all ? ' cur' : ''}" id="cx813all" title="${L('без спойлер-замка', 'no spoiler lock')}">${this.all ? '👁 ' : ''}${L('Показать всё', 'Show all', 'Hiện tất cả')}</button>
      <small id="cx813cnt"></small><button id="cx813back" class="cxb">✕ ${L('Назад', 'Back', 'Quay lại')}</button></div>
      <div class="cxtabs">${tabs}</div><div class="cxg" id="cx813g">${this.body()}</div></div>`;
  },
  refresh(keepTabs){
    const g = $('cx813g'); if (!g) return;
    if (!keepTabs){ for (const b of document.querySelectorAll('.cx813 [data-cxt]')) { const on = !this.q && b.dataset.cxt === this.cat; b.classList.toggle('cur', on); b.classList.toggle('pri', on); }
      for (const b of document.querySelectorAll('.cx813 [data-cxf]')) b.classList.toggle('cur', b.dataset.cxf === String(this.fac));
      const a = $('cx813all'); if (a){ a.classList.toggle('cur', this.all); a.textContent = (this.all ? '👁 ' : '') + this.L('Показать всё', 'Show all', 'Hiện tất cả'); } }
    g.innerHTML = this.body();
  },
  tab(k){ this.cat = k; this.q = ''; this.open = null; const i = $('cx813q'); if (i) i.value = ''; this.refresh(); const g = $('cx813g'); if (g) g.scrollTop = 0; this.ls('pm813_cat', k); },
  wire(){
    const root = document.querySelector('.cx813'); if (!root) return;
    this.stats.opened++; if (this.ls('pm813_opened') !== '1') this.ls('pm813_opened', '1');
    root.onclick = e => {
      const t = e.target.closest('button'); if (!t) return; e.stopPropagation(); AU.init(); emit('ui', { kind: 'tick' });
      if (t.id === 'cx813back'){ MENU.back(); return; }
      if (t.id === 'cx813all'){ this.all = !this.all; this.refresh(); return; }
      if (t.dataset.cxt){ this.tab(t.dataset.cxt); return; }
      if (t.dataset.cxf){ this.fac = t.dataset.cxf; this.refresh(); return; }
      if (t.dataset.cx813){ const k = t.dataset.cx813; this.open = this.open === k ? null : k; this.refresh(true); }
    };
    const q = $('cx813q');
    if (q){
      q.oninput = () => { this.q = q.value; this.open = null; this.stats.search++; this.refresh(); };
      q.onkeydown = e => { e.stopPropagation(); if (e.code === 'Escape'){ if (q.value){ q.value = ''; q.oninput(); } else { q.blur(); MENU.back(); } } };
      q.onkeyup = e => e.stopPropagation();
    }
  },
  tabStep(d){ const C = this.CATS().map(c => c[0]); this.tab(C[(C.indexOf(this.cat) + d + C.length) % C.length]); },
  // ---------------------------------------------------------------- кнопка в меню и паузе
  btn(){
    const nw = this.ls('pm813_opened') !== '1' ? `<sup class="cxnew">${this.L('новое', 'new', 'mới')}</sup>` : '';
    const t = this.L('Энциклопедия', 'Encyclopedia', 'Bách khoa');
    return typeof P71M !== 'undefined' && P71M.on && P71M.on() ? `<button id="m_codex813" class="p71t"><i class="cx813ic">📖</i><b>${t}${nw}</b></button>` : `<button id="m_codex813">📖 ${t}${nw}</button>`;
  },
  inject(h){
    if (typeof h !== 'string' || h.indexOf('m_codex813') >= 0) return h;
    for (const a of ['<button id="m_settings"', '<button id="m_controls"']){ const i = h.indexOf(a); if (i >= 0) return h.slice(0, i) + this.btn() + h.slice(i); }
    return h;
  },
  // ---------------------------------------------------------------- кадр: встречи, совет один раз
  tick(){
    if (!this.on || S.attract || MENU.isOpen()) return;
    const now = performance.now();
    if (now - this.scanT > 1500){ this.scanT = now; this.safe(() => this.scan(), 'scan'); }
    if (!this.hintT && S.time > 75 && !S.over && typeof HINTS !== 'undefined' && !(typeof TUT !== 'undefined' && TUT.on) && !(typeof T72 !== 'undefined' && T72.on)){
      this.hintT = 1;
      if (this.ls('pm813_opened') !== '1' && this.ls('pm813_hint') !== '1'){ this.ls('pm813_hint', '1');
        HINTS.show('cx813', TOUCH.on ? this.L('📖 Энциклопедия — в меню ☰ → пауза: юниты, боссы, аномалии', '📖 Encyclopedia — ☰ → pause: units, bosses, anomalies', '📖 Bách khoa — trong tạm dừng')
                                     : this.L('📖 Энциклопедия — в паузе (Esc): юниты, боссы, аномалии', '📖 Encyclopedia — in the pause menu (Esc): units, bosses, anomalies', '📖 Bách khoa — trong tạm dừng (Esc)')); }
    }
  },
};
if (CX813.on){
  try { const c = localStorage.getItem('pm813_cat'); if (c) CX813.cat = c; } catch (e){}
  MENU.html_codex813 = function(){ return CX813.safe(() => CX813.html(), 'html') || '<div class="mcol"><button id="cx813back">✕</button></div>'; };
  { const hm0 = MENU.html_main; MENU.html_main = function(){ return CX813.inject(hm0.apply(this, arguments)); }; }   // v813
  { const hp0 = MENU.html_pause; MENU.html_pause = function(){ return CX813.inject(hp0.apply(this, arguments)); }; }   // v813
  { const w0 = MENU.wire; MENU.wire = function(name){ const r = w0.apply(this, arguments);
      if (name === 'codex813'){ CX813.safe(() => CX813.wire(), 'wire'); const b = $('cx813back'); if (b && !document.querySelector('.cx813')) b.onclick = () => MENU.back(); }
      const b = $('m_codex813'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); this.show('codex813', true); };
      return r; }; }
  // геймпад: LB/RB — вкладки энциклопедии
  if (typeof GP812 !== 'undefined' && GP812.nav){ const n0 = GP812.nav; GP812.nav = function(dt, c){ const r = n0.apply(this, arguments);
      if (c === 'menu' && MENU.cur === 'codex813' && (this.dn(4) || this.dn(5))) CX813.safe(() => CX813.tabStep(this.dn(4) ? -1 : 1), 'pad');
      return r; }; }
  { const loop = () => { CX813.safe(() => CX813.tick(), 'tick'); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  const st = document.createElement('style'); st.id = 'cx813css'; st.textContent = `
  #screen.scr-codex813{padding:0;gap:0}
  .cx813{--kc:var(--k812,1);display:flex;flex-direction:column;box-sizing:border-box;width:min(1180px,100vw);height:100vh;height:100dvh;padding:calc(12px + var(--st,0px)) calc(16px + var(--sr,0px)) calc(10px + var(--sb,0px)) calc(16px + var(--sl,0px));gap:8px;color:#e8dfc6;font:13px "Exo 2",sans-serif}
  .cx813 .cxh{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .cx813 .cxh h2{margin:0 8px 0 0!important;font-size:calc(26px*var(--kc))!important;white-space:nowrap}
  .cx813 #cx813q{flex:1 1 180px;min-width:140px;max-width:320px;background:rgba(0,0,0,.45);border:1px solid rgba(214,198,154,.4);color:#f4ecd4;font:14px "Exo 2";padding:6px 10px;border-radius:6px}
  .cx813 button{font:600 calc(12px*var(--kc)) "Exo 2",sans-serif;color:#e8dfc6;background:rgba(20,22,24,.75);border:1px solid rgba(214,198,154,.28);border-radius:6px;padding:5px 10px;cursor:pointer;margin:0;text-align:left}
  .cx813 button.cur{background:rgba(214,198,154,.22);border-color:#d6c69a;color:#fff6dc}
  .cx813 .cxfr{display:flex;gap:4px} .cx813 #cx813cnt{opacity:.65;white-space:nowrap} .cx813 .cxb{margin-left:auto!important}
  .cx813 .cxtabs{display:flex;gap:4px;overflow-x:auto;flex:0 0 auto;padding-bottom:2px;scrollbar-width:thin}
  .cx813 .cxt{white-space:nowrap;flex:0 0 auto}
  .cx813 .cxg{flex:1 1 auto;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(calc(260px*var(--kc)),1fr));gap:8px;align-content:start;align-items:start;padding:2px 4px 8px 2px;overscroll-behavior:contain}
  .cx813 .cxc{display:flex;gap:9px;align-items:flex-start;padding:8px 10px;background:rgba(12,14,16,.82);border-color:rgba(214,198,154,.18);font-weight:400}
  .cx813 .cxc>i{flex:0 0 auto;width:calc(34px*var(--kc));height:calc(34px*var(--kc));border-radius:50%;display:flex;align-items:center;justify-content:center;font:400 calc(18px*var(--kc))/1 "Exo 2",sans-serif;font-style:normal;background:radial-gradient(circle at 35% 30%,rgba(214,198,154,.28),rgba(0,0,0,.5));border:1px solid rgba(214,198,154,.35);color:#ffd27a}
  .cx813 .cxc>div{min-width:0;flex:1}
  .cx813 .cxc b{display:block;font:400 calc(14px*var(--kc)) "Russo One",sans-serif;color:#f4e6bf}
  .cx813 .cxc small{display:block;font-size:calc(11px*var(--kc));opacity:.7;margin-top:1px}
  .cx813 .cxc p{margin:4px 0 0!important;font-size:calc(12px*var(--kc));line-height:1.32;color:#d8cfb6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .cx813 .cxc.op p{-webkit-line-clamp:unset;display:block} .cx813 .cxc p.m{color:#bfe0c8;font-size:calc(11.5px*var(--kc))}
  .cx813 .cxc p.m kbd{font:700 10px "Exo 2";padding:0 3px;border-radius:3px;background:rgba(255,255,255,.1);color:#ffd27a}
  .cx813 .cxc small.mo{color:#ffd27a;opacity:.6}
  .cx813 .cxc.lk{opacity:.55} .cx813 .cxc.lk>i{color:#888}
  .cx813 .cxc em{font-style:normal;font-size:10px;padding:0 5px;border-radius:3px;margin-left:4px} .cx813 em.f0{background:rgba(214,198,154,.25);color:#f1e2b5} .cx813 em.f1{background:rgba(255,74,58,.25);color:#ffb3a8}
  .cx813 .cxs{display:flex;flex-wrap:wrap;gap:3px 6px;margin-top:5px}
  .cx813 .cxs span{font-size:calc(11px*var(--kc));background:rgba(255,255,255,.05);border-radius:4px;padding:1px 5px;white-space:nowrap}
  .cx813 .cxs u{text-decoration:none;opacity:.6;margin-right:4px}
  .cx813 .cxe{opacity:.6;padding:20px}
  .cxnew{font:700 9px "Exo 2";color:#111;background:#ffd27a;border-radius:6px;padding:0 4px;margin-left:5px;vertical-align:top}
  body.tab812 #screen.p71scr > .cx813{zoom:1;max-width:none;width:min(1366px,100vw)}
  .p71t .cx813ic{font-style:normal;font-size:22px;line-height:1}
  @media (max-height:500px){ .cx813{gap:5px;padding-top:calc(6px + var(--st,0px))} .cx813 .cxh h2{font-size:18px!important} .cx813 .cxg{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px} .cx813 .cxc p{-webkit-line-clamp:2} .cx813 button{padding:4px 8px} }
  @media (max-width:520px){ .cx813{padding-left:calc(10px + var(--sl,0px));padding-right:calc(10px + var(--sr,0px))} .cx813 .cxh h2{font-size:18px!important;flex-basis:100%} .cx813 .cxg{grid-template-columns:1fr} .cx813 #cx813cnt{display:none} }
  `; document.head.appendChild(st);
}
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.13'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.13'; }
