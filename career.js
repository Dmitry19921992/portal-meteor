// =====================================================================
//  КАРЬЕРА v6.1: почти бесконечная прокачка между матчами.
//  Уровень карьеры (растущая кривая, каждые 50 — «Ветеран ★N»), мастерство классов
//  и оружия (уровни оружия открывают обвесы из gun.js ATTACH), медали с бесконечными
//  ступенями, ежедневные контракты, косметика (цвет прицела, эмблема).
//  Всё хранится в PROG.career → localStorage 'pm_career' (старые сохранения совместимы).
// =====================================================================
const CAREER_LV = { cost: L => Math.round(600 + 90 * Math.pow(L, 1.45)), prestige: 50 };
const WPN_KEYS = ['rifle', 'smg', 'hmg', 'rail', 'rocket', 'grenade', 'veh'];
const WPN_NAMES = { rocket: ['Ракета', 'Rocket', 'Tên lửa'], grenade: ['Граната', 'Grenade', 'Lựu đạn'], veh: ['Техника', 'Vehicles', 'Xe'] };
// уровень оружия, на котором открывается обвес (и слот обвеса)
const ATT_UNLOCK = {
  rifle: { comp: 2, extmag: 4, optic: 6, barrel: 9, hammer: 13 },
  smg:   { comp: 2, extmag: 4, optic: 7, barrel: 10, hammer: 14 },
  hmg:   { comp: 2, extmag: 5, optic: 8, barrel: 11 },
  rail:  { extmag: 3, barrel: 6, comp: 10 },
};
const ATT_SLOT = { comp: 'muzzle', extmag: 'mag', optic: 'optic', barrel: 'barrel', hammer: 'bolt' };
const MEDALS = {
  kills:  { b: 25, n: ['Охотник', 'Hunter', 'Thợ săn'], d: ['уничтожить роботов', 'destroy robots', 'hạ robot'] },
  head:   { b: 10, n: ['Меткий глаз', 'Sharp eye', 'Mắt tinh'], d: ['убийства в голову', 'headshot kills', 'hạ bằng phát vào đầu'] },
  streak: { b: 2,  n: ['Неудержимый', 'Unstoppable', 'Không thể cản'], d: ['серии из 5 без гибели', '5-kill streaks', 'chuỗi 5 mạng'] },
  multi:  { b: 2,  n: ['Мясорубка', 'Meat grinder', 'Máy xay'], d: ['3 убийства за 4 с', '3 kills in 4 s', '3 mạng trong 4 giây'] },
  drone:  { b: 5,  n: ['ПВО', 'Air defense', 'Phòng không'], d: ['сбить дроны', 'shoot down drones', 'bắn hạ drone'] },
  droneR: { b: 1,  n: ['Ракетой по мухе', 'Rocket swatter', 'Tên lửa đập ruồi'], d: ['сбить дрон ракетой', 'down a drone with a rocket', 'hạ drone bằng tên lửa'] },
  tank:   { b: 3,  n: ['Танкобой', 'Tank buster', 'Diệt tăng'], d: ['уничтожить технику', 'destroy vehicles', 'phá xe'] },
  long:   { b: 3,  n: ['Дальнобой', 'Long shot', 'Bắn xa'], d: ['рельса: убийства дальше 90 м', 'railgun kills beyond 90 m', 'súng ray: hạ xa hơn 90 m'] },
  veh:    { b: 10, n: ['Экипаж', 'Crew', 'Kíp xe'], d: ['убийства из техники', 'kills from vehicles', 'hạ từ xe'] },
  cap:    { b: 3,  n: ['Знаменосец', 'Flag bearer', 'Người cầm cờ'], d: ['захватить точки', 'capture points', 'chiếm điểm'] },
  core:   { b: 1,  n: ['Покоритель ядра', 'Core conqueror', 'Chinh phục lõi'], d: ['захватить ядро', 'capture the core', 'chiếm lõi'] },
  orders: { b: 5,  n: ['Исполнительный', 'Dutiful', 'Tận tụy'], d: ['выполнить приказы', 'complete orders', 'hoàn thành lệnh'] },
};
const MED_STEPS = [1, 4, 12, 30, 75, 180, 450, 1000];
const MED_TIER = [['Бронза', 'Bronze', 'Đồng'], ['Серебро', 'Silver', 'Bạc'], ['Золото', 'Gold', 'Vàng'], ['Платина', 'Platinum', 'Bạch kim'], ['Алмаз', 'Diamond', 'Kim cương'], ['Мастер', 'Master', 'Bậc thầy'], ['Грандмастер', 'Grandmaster', 'Đại sư'], ['Легенда', 'Legend', 'Huyền thoại']];
const MED_COL = ['#c98a4b', '#c9d2dc', '#ffd27a', '#9fe6ff', '#b6a4ff', '#8fffaa', '#ff9f6b', '#ff6fb0'];
const CTR_T = [
  { k: 'kills', n: [20, 40], xp: 45, d: ['Уничтожь роботов: {n}', 'Destroy robots: {n}', 'Hạ robot: {n}'] },
  { k: 'head', n: [5, 12], xp: 160, d: ['Убийства в голову: {n}', 'Headshot kills: {n}', 'Hạ bằng phát vào đầu: {n}'] },
  { k: 'w_rifle', n: [15, 30], xp: 60, d: ['Убийства из винтовки: {n}', 'Rifle kills: {n}', 'Hạ bằng súng trường: {n}'] },
  { k: 'w_hmg', n: [10, 25], xp: 70, d: ['Убийства из пулемёта: {n}', 'Machine gun kills: {n}', 'Hạ bằng súng máy: {n}'] },
  { k: 'w_rail', n: [4, 10], xp: 170, d: ['Убийства из рельсотрона: {n}', 'Railgun kills: {n}', 'Hạ bằng súng ray: {n}'] },
  { k: 'rocket', n: [3, 8], xp: 190, d: ['Убийства ракетой: {n}', 'Rocket kills: {n}', 'Hạ bằng tên lửa: {n}'] },
  { k: 'cap', n: [2, 4], xp: 380, d: ['Захвати точки лично: {n}', 'Capture points yourself: {n}', 'Tự chiếm điểm: {n}'] },
  { k: 'drone', n: [2, 5], xp: 280, d: ['Сбей дроны: {n}', 'Down drones: {n}', 'Bắn hạ drone: {n}'] },
  { k: 'tank', n: [1, 3], xp: 600, d: ['Уничтожь технику Роя: {n}', 'Destroy Swarm vehicles: {n}', 'Phá xe Bầy Đàn: {n}'] },
  { k: 'veh', n: [6, 15], xp: 90, d: ['Убийства из техники: {n}', 'Kills from vehicles: {n}', 'Hạ từ xe: {n}'] },
  { k: 'streak', n: [1, 2], xp: 900, d: ['Серия из 5 без гибели: {n}', '5-kill streak: {n}', 'Chuỗi 5 mạng: {n}'] },
  { k: 'orders', n: [2, 4], xp: 330, d: ['Выполни приказы: {n}', 'Complete orders: {n}', 'Hoàn thành lệnh: {n}'] },
  { k: 'cls_heavy', n: [10, 20], xp: 75, d: ['Убийства пулемётчиком: {n}', 'Kills as Heavy: {n}', 'Hạ khi là xạ thủ: {n}'] },
  { k: 'cls_rocket', n: [6, 12], xp: 110, d: ['Убийства гранатомётчиком: {n}', 'Kills as Rocketeer: {n}', 'Hạ khi là lính tên lửa: {n}'] },
  { k: 'cls_scout', n: [8, 16], xp: 95, d: ['Убийства разведчиком: {n}', 'Kills as Scout: {n}', 'Hạ khi là trinh sát: {n}'] },
];
const XCOLS = [
  { id: 'def', c: '242,234,210', lv: 1, n: ['Классика', 'Classic', 'Cổ điển'] }, { id: 'grn', c: '140,255,170', lv: 3, n: ['Зелёный', 'Green', 'Xanh lá'] },
  { id: 'cyan', c: '120,220,255', lv: 6, n: ['Лёд', 'Ice', 'Băng'] }, { id: 'yel', c: '255,220,90', lv: 10, n: ['Янтарь', 'Amber', 'Hổ phách'] },
  { id: 'mag', c: '255,120,220', lv: 15, n: ['Неон', 'Neon', 'Neon'] }, { id: 'red', c: '255,96,72', lv: 20, n: ['Красный', 'Red', 'Đỏ'] },
  { id: 'wht', c: '255,255,255', lv: 30, n: ['Белый', 'White', 'Trắng'] }, { id: 'gold', c: '255,190,60', lv: 51, n: ['Ветеранское золото', 'Veteran gold', 'Vàng cựu binh'] },
];
const EMBS = [['', 1], ['◆', 2], ['✦', 5], ['⬢', 8], ['☄', 12], ['⚙', 18], ['✪', 25], ['♛', 35], ['☢', 45], ['✺', 51], ['⚜', 101]];

const CAREER = {
  dirty: false, saveT: 0, streak: 0, kt: [], ban: null, mc: {},
  C(){
    const c = PROG.career;
    if (!c.cls){ c.cls = {}; c.wpn = {}; c.med = {}; c.medT = {}; c.mods = {}; c.cos = { xc: 'def', emb: '' }; c.ctr = null; }
    if (c.lvSeen === undefined) c.lvSeen = this.levelOf(c.xp || 0).L;   // старое сохранение: без «салюта» за прошлые уровни
    return c;
  },
  levelOf(xp){
    let L = 1, x = xp, need = CAREER_LV.cost(1);
    while (x >= need && L < 5000){ x -= need; L++; need = CAREER_LV.cost(L); }
    return { L, into: x, need };
  },
  pres(L){ return floor((L - 1) / CAREER_LV.prestige); },
  lvName(L){
    const p = this.pres(L), l = (L - 1) % CAREER_LV.prestige + 1;
    return (p ? tr('Ветеран', 'Veteran', 'Cựu binh') + ' ' + '★'.repeat(min(p, 5)) + (p > 5 ? p : '') + ' · ' : '') + tr('ур. ', 'lv ', 'cấp ') + l;
  },
  badge(){
    const c = this.C(), lv = this.levelOf(c.xp).L, e = c.cos.emb || '';
    return `<i style="font-style:normal;color:#ffd27a;margin-right:5px" title="${tr('Карьера', 'Career', 'Sự nghiệp')}">${e}${e ? ' ' : ''}${this.pres(lv) ? '★' + this.pres(lv) + ' ' : ''}${(lv - 1) % CAREER_LV.prestige + 1}</i>`;
  },
  xcol(){ const c = this.C(), x = XCOLS.find(o => o.id === c.cos.xc); return x ? x.c : XCOLS[0].c; },
  save(){ if (this.dirty){ this.dirty = false; PROG.saveCareer(); } },
  step(rdt){ this.saveT += rdt; if (this.saveT > 20){ this.saveT = 0; this.save(); } },
  // ---------------------------------------------------------------- опыт и уровни
  onXP(amt){
    if (S.attract || !amt) return;
    const c = this.C(); this.dirty = true;
    const ctl = ctrlEntity(), ck = ctl ? (ctl.cls === 'inf' ? ctl.role : ctl.cls === 'tank' || ctl.cls === 'drone' ? 'veh' : null) : null;
    if (ck) c.cls[ck] = (c.cls[ck] || 0) + amt;
    const lv = this.levelOf(c.xp).L;
    if (lv > c.lvSeen){
      const was = c.lvSeen; c.lvSeen = lv;
      const newP = this.pres(lv) > this.pres(was);
      const un = [...XCOLS.filter(o => o.lv > was && o.lv <= lv).map(o => tr('цвет прицела «', 'crosshair colour "', 'màu tâm "') + N2(o.n) + tr('»', '"', '"')), ...EMBS.filter(o => o[1] > was && o[1] <= lv).map(o => tr('эмблема ', 'emblem ', 'biểu tượng ') + o[0])];
      this.ban = { t: S.rtime, text: (newP ? tr('ВЕТЕРАНСТВО! ', 'VETERANCY! ', 'CỰU BINH! ') : tr('КАРЬЕРА: ', 'CAREER: ', 'SỰ NGHIỆP: ')) + this.lvName(lv).toUpperCase(), sub: un.join(' · ') };
      feed('★ ' + this.ban.text + (un.length ? ' — ' + tr('открыто: ', 'unlocked: ', 'mở khóa: ') + un.join(', ') : ''), '#ffd27a');
      emit('rankup', { text: this.ban.text });
      this.save(); this.dirty = true;
    }
  },
  // ---------------------------------------------------------------- оружие и обвесы
  wLv(w){ const x = (this.C().wpn[w] || {}).xp || 0; let L = 1, r = x, need = 300 + 150; while (r >= need){ r -= need; L++; need = 300 + 150 * L; } return { L, into: r, need }; },
  attOpen(w, a){ const U = ATT_UNLOCK[w]; return !!(U && U[a] && this.wLv(w).L >= U[a]); },
  attOn(w, a){ const m = this.C().mods[w] || {}; return this.attOpen(w, a) && m[a] !== false; },
  modsFor(w){
    const k = w + ':' + ((this.C().wpn[w] || {}).xp || 0) + ':' + JSON.stringify(this.C().mods[w] || {});
    const ca = this.mc[w];
    if (ca && ca.k === k) return ca.m;
    const m = {}; const U = ATT_UNLOCK[w] || {};
    for (const a in U) if (this.attOn(w, a)) m[ATT_SLOT[a]] = a;
    this.mc[w] = { k, m };
    return m;
  },
  wName(w){ return WPN_NAMES[w] ? N2(WPN_NAMES[w]) : WEAPONS[w] ? N2(WEAPONS[w].n) : w; },
  addW(w, xp){
    const c = this.C(); const o = c.wpn[w] || (c.wpn[w] = { xp: 0, k: 0 });
    const before = this.wLv(w).L;
    o.xp += xp; o.k++;
    const after = this.wLv(w).L;
    if (after > before){
      const U = ATT_UNLOCK[w] || {};
      const att = Object.keys(U).filter(a => U[a] > before && U[a] <= after);
      feed(`⚙ ${this.wName(w)}: ${tr('мастерство', 'mastery', 'thành thạo')} ${after}` + (att.length ? ' — ' + tr('новый обвес: ', 'new attachment: ', 'phụ kiện mới: ') + att.map(a => N2(ATTACH[a].n)).join(', ') + tr(' (включён, Карьера → обвесы)', ' (equipped, Career → attachments)', ' (đã lắp, Sự nghiệp → phụ kiện)') : ''), '#9fe6ff');
    }
  },
  // ---------------------------------------------------------------- медали
  medNeed(id, t){ const b = MEDALS[id].b; return t < MED_STEPS.length ? b * MED_STEPS[t] : Math.round(b * 1000 * Math.pow(2.5, t - MED_STEPS.length + 1)); },
  tierName(t){ return t < MED_TIER.length ? N2(MED_TIER[t]) : N2(MED_TIER[MED_TIER.length - 1]) + ' ' + (t - MED_TIER.length + 2); },
  med(id, n){
    const c = this.C(); n = n || 1;
    c.med[id] = (c.med[id] || 0) + n; this.dirty = true;
    let t = c.medT[id] || 0;
    while (c.med[id] >= this.medNeed(id, t)){
      t++; c.medT[id] = t;
      const xp = 150 * t + 100;
      feed(`🎖 ${tr('Медаль', 'Medal', 'Huy chương')}: ${N2(MEDALS[id].n)} — ${this.tierName(t - 1)}`, MED_COL[min(t - 1, MED_COL.length - 1)]);
      PROG.award(xp, tr('медаль', 'medal', 'huy chương'), 1, '#ffd27a');
    }
  },
  // ---------------------------------------------------------------- контракты (обновляются каждый день)
  today(){ const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  newCtr(used){
    const pool = CTR_T.filter(t => !used.includes(t.k));
    const T = pool[floor(random() * pool.length)] || CTR_T[0];
    const n = T.n[0] + floor(random() * (T.n[1] - T.n[0] + 1));
    return { k: T.k, n, p: 0, xp: Math.round((T.xp * n + 400) / 50) * 50, done: false };
  },
  ctrFill(force){
    const c = this.C(), day = this.today();
    if (!c.ctr || c.ctr.day !== day){ c.ctr = { day, list: [] }; }
    const L = c.ctr.list;
    for (let i = L.length - 1; i >= 0; i--) if (L[i].done && force) L.splice(i, 1);
    while (L.length < 3) L.push(this.newCtr(L.map(o => o.k)));
    this.dirty = true;
  },
  ctrText(o){ const T = CTR_T.find(t => t.k === o.k); return T ? N2(T.d).replace('{n}', o.n) : o.k; },
  ctr(k, n){
    const c = this.C(); if (!c.ctr) this.ctrFill(false);
    for (const o of c.ctr.list){
      if (o.done || o.k !== k) continue;
      o.p = min(o.n, o.p + (n || 1)); this.dirty = true;
      if (o.p >= o.n){
        o.done = true;
        feed(`📜 ${tr('Контракт выполнен', 'Contract complete', 'Hoàn thành hợp đồng')}: ${this.ctrText(o)}`, '#8fffaa');
        PROG.award(o.xp, tr('контракт', 'contract', 'hợp đồng'), 1, '#8fffaa');
      }
    }
  },
  // ---------------------------------------------------------------- события боя
  onKill(e, src){
    if (S.attract || !src || src.team !== 0 || !isPlayerSrc(src) || e.team === 0) return;
    const c = this.C(), pt = S.lastPT || 'b';
    const kind = e.cls === 'bld' ? (e.type === 'turret' || e.type === 'aa' ? e.type : 'bld') : e.cls;
    const base = XP_KILL[kind] || 10;
    let w = 'veh';
    if (src.cls === 'inf') w = pt === 'r' ? 'rocket' : pt === 'g' ? 'grenade' : (pt === 'b' || pt === 'l') ? (S.kit && S.kit.w) || 'rifle' : 'rocket';
    this.addW(w, base);
    const head = (pt === 'b' || pt === 'l') && typeof GUNS !== 'undefined' && GUNS.lastHead;
    if (kind === 'hq' || kind === 'bld') { this.dirty = true; return; }
    this.med('kills'); this.ctr('kills');
    if (head){ this.med('head'); this.ctr('head'); }
    if (WEAPONS[w] && w !== 'veh') this.ctr('w_' + (w === 'smg' ? 'rifle' : w));
    if (w === 'rocket') this.ctr('rocket');
    if (w === 'veh'){ this.med('veh'); this.ctr('veh'); }
    if (e.cls === 'drone'){ this.med('drone'); this.ctr('drone'); if (w === 'rocket') this.med('droneR'); }
    if (e.cls === 'tank'){ this.med('tank'); this.ctr('tank'); }
    if (pt === 'l' && dist(src.pos, e.pos) > 90) this.med('long');
    if (src.cls === 'inf') this.ctr('cls_' + src.role);
    this.streak++;
    if (this.streak % 5 === 0){ this.med('streak'); this.ctr('streak'); feed(tr(`Серия: ${this.streak} без гибели!`, `Streak: ${this.streak} without dying!`, `Chuỗi: ${this.streak} mạng!`), '#ffb347'); }
    const now = S.time; this.kt = this.kt.filter(t => now - t < 4); this.kt.push(now);
    if (this.kt.length === 3) this.med('multi');
  },
  onDeath(){ this.streak = 0; this.kt = []; },
  onCapture(cp, gained){ if (!gained) return; this.med('cap'); this.ctr('cap'); if (cp.core) this.med('core'); },
  onTask(){ this.med('orders'); this.ctr('orders'); },
  onMatch(){ this.streak = 0; this.kt = []; this.ctrFill(true); this.save(); },
  // ---------------------------------------------------------------- баннер уровня (рисует FPS61.overlay)
  drawBanner(g, W, H, cx){
    if (!this.ban || S.rtime - this.ban.t > 4) return;
    const k = S.rtime - this.ban.t, a = clamp(min(k * 4, 4 - k), 0, 1);
    g.save(); g.globalAlpha = a; g.textAlign = 'center';
    g.font = '700 20px "Exo 2", Consolas, sans-serif'; g.fillStyle = '#ffd27a'; g.fillText(this.ban.text, cx, H * 0.2);
    if (this.ban.sub){ g.font = '600 13px "Exo 2", sans-serif'; g.fillStyle = '#e8dcb8'; g.fillText(tr('Открыто: ', 'Unlocked: ', 'Mở khóa: ') + this.ban.sub, cx, H * 0.2 + 22); }
    g.restore();
  },
  // ---------------------------------------------------------------- меню
  bar(f, col){ return `<span class="cbar"><s style="width:${(clamp(f, 0, 1) * 100).toFixed(1)}%;background:${col || '#ffd27a'}"></s></span>`; },
  mainSide(){
    const c = this.C(), lv = this.levelOf(c.xp);
    return `<p>${tr('Карьера', 'Career', 'Sự nghiệp')}: <b>${this.lvName(lv.L)}</b> ${this.bar(lv.into / lv.need)}</p>` + MENU.btn('career', tr('Карьера: медали, обвесы, контракты', 'Career: medals, attachments, contracts', 'Sự nghiệp: huy chương, phụ kiện, hợp đồng'));
  },
  html(){
    const c = this.C(); if (!c.ctr || c.ctr.day !== this.today()) this.ctrFill(false);
    const lv = this.levelOf(c.xp);
    const nextUnl = [...XCOLS.filter(o => o.lv > lv.L).map(o => [o.lv, tr('прицел «', 'crosshair "', 'tâm "') + N2(o.n) + tr('»', '"', '"')]), ...EMBS.filter(o => o[1] > lv.L).map(o => [o[1], tr('эмблема ', 'emblem ', 'biểu tượng ') + o[0]])].sort((a, b) => a[0] - b[0])[0];
    const clsRow = k => { const x = c.cls[k] || 0; let L = 1, r = x, need = 750; while (r >= need){ r -= need; L++; need = 500 + 250 * L; } return `<div class="crow"><span>${k === 'veh' ? '■ ' + tr('Техника', 'Vehicles', 'Xe') : ROLES[k].icon + ' ' + N2(ROLES[k].n)}</span><b>${tr('ур.', 'lv', 'cấp')} ${L}</b>${this.bar(r / need, '#9fe6ff')}</div>`; };
    const wRow = w => {
      const o = c.wpn[w] || { xp: 0, k: 0 }, l = this.wLv(w), U = ATT_UNLOCK[w];
      const atts = U ? Object.keys(U).map(a => this.attOpen(w, a) ? `<button class="att ${this.attOn(w, a) ? 'on' : ''}" data-mod="${w}:${a}" title="${this.attDesc(a)}">${N2(ATTACH[a].n)}</button>` : `<button class="att lock" disabled title="${this.attDesc(a)}">🔒 ${N2(ATTACH[a].n)} · ${U[a]}</button>`).join('') : '';
      return `<div class="crow w"><span>${this.wName(w)}</span><b>${tr('ур.', 'lv', 'cấp')} ${l.L}</b><small>${o.k} ${tr('убийств', 'kills', 'mạng')}</small>${this.bar(l.into / l.need, '#8fffaa')}<div class="atts">${atts}</div></div>`;
    };
    const meds = Object.keys(MEDALS).map(id => {
      const t = c.medT[id] || 0, v = c.med[id] || 0, need = this.medNeed(id, t), prev = t ? this.medNeed(id, t - 1) : 0;
      return `<div class="med" style="border-color:${t ? MED_COL[min(t - 1, 7)] : 'rgba(232,220,184,.2)'}"><b style="color:${t ? MED_COL[min(t - 1, 7)] : '#888'}">${N2(MEDALS[id].n)}</b><small>${t ? this.tierName(t - 1) : '—'} · ${N2(MEDALS[id].d)}</small>${this.bar((v - prev) / max(1, need - prev), MED_COL[min(t, 7)])}<small>${v} / ${need}</small></div>`;
    }).join('');
    const ctrs = c.ctr.list.map(o => `<div class="crow ctr ${o.done ? 'done' : ''}"><span>${o.done ? '✔ ' : ''}${this.ctrText(o)}</span><b>+${o.xp} XP</b>${this.bar(o.p / o.n, '#8fffaa')}<small>${o.p} / ${o.n}</small></div>`).join('');
    const cos = XCOLS.map(o => `<button class="sw ${c.cos.xc === o.id ? 'cur' : ''}" ${lv.L >= o.lv ? `data-xc="${o.id}"` : 'disabled'} title="${N2(o.n)}${lv.L < o.lv ? ' · ' + tr('ур. ', 'lv ', 'cấp ') + o.lv : ''}"><i style="background:rgb(${o.c})"></i>${lv.L < o.lv ? '🔒' : ''}</button>`).join('');
    const embs = EMBS.map(([e, l]) => `<button class="sw ${c.cos.emb === e ? 'cur' : ''}" ${lv.L >= l ? `data-emb="${e || '_'}"` : 'disabled'} title="${lv.L < l ? tr('ур. ', 'lv ', 'cấp ') + l : ''}">${e || '∅'}${lv.L < l ? '🔒' : ''}</button>`).join('');
    return `<div class="mcol wide career"><h2>${tr('КАРЬЕРА', 'CAREER', 'SỰ NGHIỆP')}</h2>
      <p class="sub"><b style="font-size:20px;color:#ffd27a">${c.cos.emb || ''} ${this.lvName(lv.L)}</b> · ${tr('всего опыта', 'total XP', 'tổng KN')} ${c.xp} · ${tr('до следующего', 'to next', 'tới cấp sau')} ${lv.need - lv.into} ${this.bar(lv.into / lv.need)}</p>
      <p class="note">${tr('Каждый уровень дороже предыдущего; каждые 50 уровней — «Ветеран ★». Опыт идёт за всё: бой, приказы, медали, контракты.', 'Each level costs more than the last; every 50 levels — "Veteran ★". XP comes from everything: combat, orders, medals, contracts.', 'Mỗi cấp tốn hơn cấp trước; mỗi 50 cấp — "Cựu binh ★".')}${nextUnl ? ' ' + tr('Следующая награда: ', 'Next reward: ', 'Phần thưởng tiếp: ') + nextUnl[1] + ' (' + tr('ур. ', 'lv ', 'cấp ') + nextUnl[0] + ')' : ''}</p>
      <div class="cols"><div>
        <h4>${tr('Контракты на сегодня', "Today's contracts", 'Hợp đồng hôm nay')}</h4>${ctrs}
        <h4>${tr('Мастерство классов', 'Class mastery', 'Thành thạo lớp')}</h4>${['assault', 'heavy', 'rocket', 'sniper', 'medic', 'scout', 'veh'].map(clsRow).join('')}
        <h4>${tr('Внешний вид', 'Cosmetics', 'Ngoại hình')}</h4>
        <div class="crow"><span>${tr('Цвет прицела', 'Crosshair colour', 'Màu tâm')}</span><div class="sws">${cos}</div></div>
        <div class="crow"><span>${tr('Эмблема', 'Emblem', 'Biểu tượng')}</span><div class="sws">${embs}</div></div>
      </div><div>
        <h4>${tr('Оружие и обвесы (клик — снять/надеть)', 'Weapons & attachments (click to toggle)', 'Vũ khí & phụ kiện (nhấp để bật/tắt)')}</h4>${WPN_KEYS.map(wRow).join('')}
        <h4>${tr('Медали', 'Medals', 'Huy chương')}</h4><div class="meds">${meds}</div>
      </div></div>
      ${MENU.btn('back', tr('Назад', 'Back', 'Quay lại'), 'big')}</div>`;
  },
  attDesc(a){
    const A = ATTACH[a], p = [];
    const L = { mag: tr('магазин', 'mag', 'băng'), reload: tr('перезарядка', 'reload', 'nạp'), kick: tr('отдача', 'recoil', 'giật'), bloom: tr('разброс в очереди', 'bloom', 'tản'), zoom: tr('зум', 'zoom', 'zoom'), ads: tr('разброс в прицеле', 'ADS spread', 'tản khi ngắm'), dmg: tr('урон', 'damage', 'sát thương'), spread: tr('разброс', 'spread', 'tản'), rpm: tr('темп', 'fire rate', 'tốc độ bắn') };
    for (const k in A) if (k !== 'n') p.push(`${L[k] || k} ×${A[k]}`);
    return p.join(', ');
  },
  wire(name){
    if (name !== 'career') return;
    const el = $('screen'), c = this.C();
    el.querySelectorAll('[data-mod]').forEach(b => b.onclick = e => { e.stopPropagation(); const [w, a] = b.dataset.mod.split(':'); const m = c.mods[w] || (c.mods[w] = {}); m[a] = !this.attOn(w, a); this.mc = {}; this.dirty = true; this.save(); MENU.show('career'); });
    el.querySelectorAll('[data-xc]').forEach(b => b.onclick = e => { e.stopPropagation(); c.cos.xc = b.dataset.xc; this.dirty = true; this.save(); MENU.show('career'); });
    el.querySelectorAll('[data-emb]').forEach(b => b.onclick = e => { e.stopPropagation(); c.cos.emb = b.dataset.emb === '_' ? '' : b.dataset.emb; this.dirty = true; this.save(); MENU.show('career'); });
  },
};
MENU.html_career = () => CAREER.html();
// ---- перехват событий прогресса (PROG — progress.js), без правки его логики
(function(){
  const aw = PROG.award, ok = PROG.onKill, oc = PROG.onCapture, ot = PROG.onTaskDone, nm = PROG.newMatch;
  PROG.award = function(base, why, mult, color){ const a = aw.call(this, base, why, mult, color); if (a) CAREER.onXP(a); return a; };
  PROG.onKill = function(e, src){ ok.call(this, e, src); try { CAREER.onKill(e, src); } catch (err){ console.warn(err); } };
  PROG.onCapture = function(cp){ const x0 = this.matchXP; oc.call(this, cp); CAREER.onCapture(cp, this.matchXP > x0); };
  PROG.onTaskDone = function(t){ ot.call(this, t); CAREER.onTask(); };
  PROG.newMatch = function(){ nm.call(this); if (!S.attract) CAREER.onMatch(); };
})();
(function careerCSS(){
  const st = document.createElement('style');
  st.textContent = `.scr-career .mcol{max-width:1100px}.career h4{margin:12px 0 6px}.career .cbar{display:inline-block;width:110px;height:6px;background:rgba(232,220,184,.15);vertical-align:middle;margin:0 6px}
.career .cbar s{display:block;height:100%}.career .crow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(232,220,184,.08);font-size:13px}
.career .crow span{min-width:150px}.career .crow small{opacity:.65}.career .crow.done{opacity:.55}.career .atts{flex-basis:100%;display:flex;flex-wrap:wrap;gap:4px}
.career .att{font-size:11px;padding:2px 6px;background:rgba(232,220,184,.06);border:1px solid rgba(232,220,184,.25);color:#e8dcb8;cursor:pointer}.career .att.on{border-color:#8fffaa;color:#8fffaa;background:rgba(140,255,170,.12)}.career .att.lock{opacity:.45;cursor:default}
.career .meds{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px}.career .med{border:1px solid;padding:5px 7px;font-size:12px;display:flex;flex-direction:column;gap:2px}
.career .sws{display:flex;flex-wrap:wrap;gap:4px}.career .sw{min-width:30px;height:28px;padding:0 6px;background:rgba(232,220,184,.06);border:1px solid rgba(232,220,184,.25);color:#e8dcb8;cursor:pointer}.career .sw.cur{border-color:#ffd27a}.career .sw i{display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:middle}
.career .sw:disabled{opacity:.4;cursor:default}`;
  document.head.appendChild(st);
})();
