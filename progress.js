// =====================================================================
//  ОПЫТ И ЗВАНИЯ (как в Battlefield): убийства, захваты, приказы стратега
// =====================================================================
// v6.1: звания в бою — медленнее (каждое следующее дороже), после полковника — генералы и «Маршал ★N» без потолка
const RANKS = [
  [0, 'Рядовой', 'Private', 'Binh nhì'], [200, 'Ефрейтор', 'Lance Corporal', 'Binh nhất'], [550, 'Младший сержант', 'Corporal', 'Hạ sĩ'], [1000, 'Сержант', 'Sergeant', 'Trung sĩ'],
  [1650, 'Старший сержант', 'Staff Sergeant', 'Thượng sĩ'], [2500, 'Старшина', 'Master Sergeant', 'Thượng sĩ nhất'], [3600, 'Прапорщик', 'Warrant Officer', 'Chuẩn úy'],
  [5000, 'Лейтенант', 'Lieutenant', 'Trung úy'], [6800, 'Капитан', 'Captain', 'Đại úy'], [9000, 'Майор', 'Major', 'Thiếu tá'], [11800, 'Полковник', 'Colonel', 'Đại tá'],
  [15500, 'Генерал-майор', 'Major General', 'Thiếu tướng'], [20000, 'Генерал-лейтенант', 'Lieutenant General', 'Trung tướng'], [26000, 'Генерал-полковник', 'Colonel General', 'Thượng tướng'],
  [33500, 'Генерал армии', 'General of the Army', 'Đại tướng'], [43000, 'Маршал', 'Marshal', 'Nguyên soái'],
];
// порог звания i (за пределами таблицы: Маршал ★n, каждая звезда на 15% дороже)
function rankXPAt(i){
  const L = RANKS.length - 1;
  if (i <= L) return RANKS[max(0, i)][0];
  let x = RANKS[L][0];
  for (let n = 1; n <= i - L; n++) x += Math.round(12000 * Math.pow(1.15, n - 1));
  return x;
}
const UNLOCKS = { 1: 'grenade', 2: 'dmg1', 3: 'reflex', 4: 'rail', 5: 'strike', 6: 'armor', 7: 'jet', 8: 'dmg2', 9: 'reflex2', 10: 'orbital' };
const UNLOCK_INFO = {
  grenade: { key: 'G', n: ['Граната', 'Grenade', 'Lựu đạn'],               d: ['G — бросить гранату. Взрыв с ударной волной.', 'G — throw a grenade. Blast with a shockwave.', 'G — ném lựu đạn. Nổ kèm sóng xung kích.'] },
  dmg1:    { key: '',  n: ['Оружие +15%', 'Weapons +15%', 'Vũ khí +15%'],       d: ['Твои выстрелы наносят больше урона.', 'Your shots deal more damage.', 'Phát bắn của bạn gây thêm sát thương.'] },
  reflex:  { key: 'F', n: ['Рефлекс', 'Reflex', 'Phản xạ'],                 d: ['F — замедлить время, как в F.E.A.R.', 'F — slow down time, F.E.A.R. style.', 'F — làm chậm thời gian, kiểu F.E.A.R.'] },
  rail:    { key: '2', n: ['Рельсотрон', 'Railgun', 'Súng ray'],             d: ['2 — рельсотрон: мощнее всего на дальней дистанции.', '2 — railgun: strongest at long range.', '2 — súng ray: mạnh nhất ở tầm xa.'] },
  strike:  { key: 'T', n: ['Артудар', 'Artillery strike', 'Pháo kích'],        d: ['T — вызвать артудар в точку прицела.', 'T — call artillery on your aim point.', 'T — gọi pháo kích vào điểm ngắm.'] },
  armor:   { key: '',  n: ['Броня +20%', 'Armor +20%', 'Giáp +20%'],          d: ['Ты получаешь меньше урона.', 'You take less damage.', 'Bạn nhận ít sát thương hơn.'] },
  jet:     { key: '',  n: ['Усиленный ранец', 'Boosted jetpack', 'Ba lô phản lực tăng cường'], d: ['Запас ранца ×1.5.', 'Jetpack fuel ×1.5.', 'Nhiên liệu ba lô ×1,5.'] },
  dmg2:    { key: '',  n: ['Оружие +30%', 'Weapons +30%', 'Vũ khí +30%'],       d: ['Ещё больше урона.', 'Even more damage.', 'Sát thương còn cao hơn.'] },
  reflex2: { key: 'F', n: ['Рефлекс II', 'Reflex II', 'Phản xạ II'],           d: ['Замедление длится в полтора раза дольше.', 'Slow-mo lasts 50% longer.', 'Làm chậm kéo dài hơn 50%.'] },
  orbital: { key: 'T', n: ['Орбитальный удар', 'Orbital strike', 'Oanh kích quỹ đạo'], d: ['T теперь вызывает орбитальный луч.', 'T now calls an orbital beam.', 'Phím T giờ gọi tia quỹ đạo.'] },
};
const XP_KILL = { inf: 20, builder: 15, drone: 25, tank: 90, turret: 50, aa: 60, bld: 120, hq: 500 };
const PROG = {
  xp: 0, rank: 0, unl: new Set(), allUnlocked: false,
  career: { xp: 0, kills: 0, matches: 0, wins: 0, best: 0, tasks: 0 },
  matchKills: 0, matchTasks: 0, matchXP: 0,
  newMatch(){
    this.xp = 0; this.rank = 0; this.unl = new Set(); this.matchKills = 0; this.matchTasks = 0; this.matchXP = 0;
    if (this.allUnlocked) for (const k in UNLOCKS) this.unl.add(UNLOCKS[k]);
    S.kit = newKit();
  },
  has(k){ return this.unl.has(k); },
  dmgMul(){ return (this.has('dmg1') ? 1.15 : 1) * (this.has('dmg2') ? 1.13 : 1); },
  armorMul(){ return this.has('armor') ? 0.8 : 1; },
  rankName(i){
    i = i === undefined ? this.rank : i; const L = LANG.cur, j = min(i, RANKS.length - 1);
    const n = L === 'en' ? RANKS[j][2] : L === 'vi' ? RANKS[j][3] : RANKS[j][1];
    return i > j ? n + ' ★' + (i - j) : n;
  },
  rankXP(i){ return rankXPAt(i); },
  nextXP(){ return rankXPAt(this.rank + 1); },
  award(base, why, mult, color){
    if (S.attract || !base) return 0;
    mult = mult || 1;
    const amt = Math.round(base * mult);
    this.xp += amt; this.matchXP += amt; this.career.xp += amt;
    S.popups.push({ text: `+${amt} ${why}`, mult, t: 0, color: color || (mult >= 3 ? '#ffb347' : mult >= 2 ? '#8fffaa' : '#e8dcb8') });
    if (S.popups.length > 6) S.popups.shift();
    while (this.xp >= rankXPAt(this.rank + 1)) this.rankUp();
    return amt;
  },
  rankUp(){
    this.rank++;
    const u = UNLOCKS[this.rank];
    if (u) this.unl.add(u);
    if (u === 'jet' && S.me && S.me.cls === 'inf'){ S.me.jet = jetOf(S.me); }
    this.career.best = max(this.career.best, this.rank);
    const info = u ? UNLOCK_INFO[u] : null;
    S.rankBanner = { t: 0, rank: this.rank, unlock: u };
    const txt = tr(`Повышение! ${this.rankName()}.`, `Promotion! ${this.rankName()}.`, `Thăng cấp! ${this.rankName()}.`) + (info ? ' ' + tr('Открыто: ', 'Unlocked: ', 'Đã mở khóa: ') + N2(info.n) + '.' : '');
    feed(txt + (info ? ' ' + N2(info.d) : ''), '#ffd27a');
    emit('rankup', { text: txt + (info && info.key ? ' ' + tr('Клавиша ', 'Key ', 'Phím ') + info.key + '.' : '') });
    this.saveCareer();
    setTimeout(() => SQUADUI.say('rank', null, null, 30), 2500);
  },
  onKill(e, src){
    if (S.attract || !src || src.team !== 0) return;
    const kind = e.cls === 'bld' ? (e.type === 'turret' || e.type === 'aa' ? e.type : 'bld') : e.cls;
    const base = XP_KILL[kind] || 10;
    const what = { inf: tr('робот', 'robot', 'robot'), builder: tr('строитель', 'builder', 'thợ xây'), drone: tr('дрон', 'drone', 'drone'), tank: tr('танк', 'tank', 'xe tăng'), turret: tr('турель', 'turret', 'tháp súng'), aa: tr('ПВО', 'AA', 'phòng không'), bld: tr('здание', 'building', 'công trình'), hq: tr('ШТАБ', 'HQ', 'Sở chỉ huy') }[kind] || '';
    if (isPlayerSrc(src)){
      this.matchKills++; this.career.kills++;
      const m = TACT.multFor(e);
      this.award(base, what + (m.m > 1 ? ` · ${m.tag}` : ''), m.m);
      if (e.playerHitT) e.playerHitT = 0;
    } else if (S.me && S.me.squad && src.squad === S.me.squad && S.mode === 'fps'){
      this.award(Math.round(base * 0.25), tr('отряд', 'squad', 'đồng đội'), 1, '#b9b19a');
    } else if (e.playerHitT && S.time - e.playerHitT < 6){
      this.award(Math.round(base * 0.4), tr('помощь', 'assist', 'hỗ trợ'), 1, '#b9b19a');
    }
  },
  onCapture(cp){
    if (S.attract) return;
    const c = ctrlEntity(); if (!c || c.cls === 'bld') return;
    const R = cp.core ? CORE_R + 6 : 22;
    if (dist(c.pos, cp.pos) > R) return;
    const m = TACT.multForCapture(cp);
    this.award(120, tr(`захват ${cpName(cp)}`, `captured ${cpName(cp)}`, `chiếm ${cpName(cp)}`) + (m.m > 1 ? ` · ${m.tag}` : ''), m.m);
  },
  onTaskDone(task){
    this.matchTasks++; this.career.tasks++;
    this.award(task.xp || 80, tr('приказ выполнен', 'order complete', 'hoàn thành lệnh'), 1, '#8fffaa');
    if (task.kind !== 'retreat' && task.kind !== 'avoid' && random() < 0.45) this.giveReward();
  },
  giveReward(){
    const K = S.kit, c = ctrlEntity();
    const opts = [];
    if (c && c.cls === 'inf'){
      opts.push('hmg', 'inc', 'rockets');
      if (this.has('reflex') && K.reflex < 0.8) opts.push('reflex');
      opts.push('strike');
      if (c.squad && c.squad.units.length < 4) opts.push('squad');
    }
    opts.push('cmd');
    const r = opts[floor(random() * opts.length)];
    let text = '';
    switch (r){
      case 'hmg': K.hmgT = 90; K.mag.hmg = WEAPONS.hmg.mag; K.w = 'hmg'; text = tr('Стратег выдал экспериментальный пулемёт на 90 с (клавиша 3)', 'The strategist issued an experimental MG for 90 s (key 3)', 'Chiến lược gia cấp súng máy thử nghiệm trong 90 giây (phím 3)'); break;
      case 'inc': K.incT = 60; text = tr('Зажигательные патроны на 60 с: урон +50%', 'Incendiary rounds for 60 s: +50% damage', 'Đạn cháy trong 60 giây: +50% sát thương'); break;
      case 'rockets': K.freeRockets = 3; if (c) c.rocketCd = 0; text = tr('Поставка: 3 ракеты без перезарядки (Q)', 'Supply drop: 3 rockets with no cooldown (Q)', 'Tiếp tế: 3 tên lửa không cần nạp (Q)'); break;
      case 'reflex': K.reflex = 1; text = tr('Рефлекс полностью заряжен (F)', 'Reflex fully charged (F)', 'Phản xạ đã nạp đầy (F)'); break;
      case 'strike': K.strikeCharges++; text = tr('Тебе выдан заряд артудара (T)', 'You were granted an artillery charge (T)', 'Bạn được cấp một lượt pháo kích (T)'); break;
      case 'squad': { const sq = c.squad; while (sq.units.length < 4){ const u = addToSquad(sq, add(c.pos, mul(randUnit(), 4))); burst(u.pos, 8, 4); } text = tr('Отряд пополнен вне очереди', 'Your squad was reinforced out of turn', 'Đội của bạn được bổ sung quân ngay'); break; }
      case 'cmd': S.teams[0].cmd = min(GAME.CMD_MAX, S.teams[0].cmd + 2); text = tr('Штабу начислено +2 командных очка', 'HQ awarded +2 command points', 'Sở chỉ huy được thưởng +2 điểm chỉ huy'); break;
    }
    feed('★ ' + text, '#ffd27a');
    emit('reward', { text });
  },
  loadCareer(){ try { const s = localStorage.getItem('pm_career'); if (s) Object.assign(this.career, JSON.parse(s)); } catch (e){} },
  saveCareer(){ try { localStorage.setItem('pm_career', JSON.stringify(this.career)); } catch (e){} },
  matchEnd(win){ this.career.matches++; if (win) this.career.wins++; this.saveCareer(); },
};
