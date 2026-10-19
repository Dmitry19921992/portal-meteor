// =====================================================================
//  v7.0 — ТОЧКИ И ШТАБ.
//  5) Захватил точку — капсула с отрядом (случайный состав) и инженером падает прямо на неё.
//     Инженер ставит форпост (V) — «сторожевую вышку». У каждого форпоста одна ветка улучшений
//     (точки специализируются): «Оборона» — дот с пулемётом → тяжёлый бункер с ПТ-пушкой;
//     «Поддержка» — ангар ремонтных дронов → силовой купол; «Разведка» — радиосканер (снимает туман
//     на большом радиусе) → снайперская вышка-корректировщик (метит цели, точнее артиллерия, снайпер).
//     Улучшение идёт, пока рядом (30 м) свой инженер. Кнопки — в карточке форпоста.
//  6) Штаб — «супер-точка»: бронеплиты, турели обороны, ускоренный орбитальный сброс, доход +25 %,
//     глобальный радар (раз в 40 с все враги видны 6 с), антенны связи (+командные очки).
//  ИИ пользуется тем же. Режим разработчика — бесплатно и мгновенно, инженер не нужен.
// =====================================================================
const BR70 = {
  def: { icon: '⛨', n: ['Оборона', 'Defence', 'Phòng thủ', 'הגנה'], col: '#ffb070', tiers: [
    { m: 'bunker', cost: 150, time: 25, n: ['Дот с пулемётом', 'MG bunker', 'Lô cốt súng máy', 'בונקר מקלע'],
      d: ['Бетонный дот у форпоста: пулемёт бьёт пехоту и дронов на 60 м.', 'A concrete pillbox by the outpost: its MG hits infantry and drones within 60 m.', 'Lô cốt bê tông: súng máy bắn bộ binh và drone trong 60 m.', 'בונקר בטון ליד המוצב: המקלע פוגע בחי"ר וברחפנים עד 60 מ׳.'] },
    { m: 'hbunker', cost: 280, time: 35, n: ['Тяжёлый бункер с ПТ-пушкой', 'Heavy bunker with AT gun', 'Hầm nặng với pháo chống tăng', 'בונקר כבד עם תותח נ"ט'],
      d: ['Второй бункер с противотанковой пушкой (технику до 110 м), дот обшит бронёй, форпост крепче на 35 %.', 'A second bunker with an anti-tank gun (vehicles out to 110 m); the pillbox gets armour plates and the outpost +35% HP.', 'Hầm thứ hai có pháo chống tăng (xe tới 110 m), lô cốt bọc giáp, tiền đồn +35% máu.', 'בונקר שני עם תותח נ"ט (רכבים עד 110 מ׳), הבונקר מקבל שריון והמוצב +35% חיים.'] },
  ] },
  sup: { icon: '✚', n: ['Поддержка', 'Support', 'Hỗ trợ', 'תמיכה'], col: '#8fffaa', tiers: [
    { m: 'bay', cost: 160, time: 25, n: ['Ангар ремонтных дронов', 'Repair-drone bay', 'Trạm drone sửa chữa', 'האנגר רחפני תיקון'],
      d: ['Три дрона-ремонтника чинят своих роботов, технику и здания в радиусе 28 м.', 'Three repair drones fix friendly robots, vehicles and buildings within 28 m.', 'Ba drone sửa robot, xe và công trình phe ta trong 28 m.', 'שלושה רחפני תיקון מתקנים רובוטים, רכבים ומבנים ידידותיים עד 28 מ׳.'] },
    { m: 'gen', cost: 300, time: 40, n: ['Силовой купол', 'Force-field dome', 'Vòm khiên năng lượng', 'כיפת שדה כוח'],
      d: ['Купол радиусом 24 м: свои внутри получают на 38 % меньше урона.', 'A 24 m dome: friendlies inside take 38% less damage.', 'Vòm bán kính 24 m: phe ta bên trong chịu ít hơn 38% sát thương.', 'כיפה ברדיוס 24 מ׳: כוחות ידידותיים בפנים סופגים 38% פחות נזק.'] },
  ] },
  rec: { icon: '◎', n: ['Разведка', 'Recon', 'Trinh sát', 'סיור'], col: '#9cf', tiers: [
    { m: 'mast', cost: 120, time: 20, n: ['Радиосканер', 'Radio scanner', 'Máy quét vô tuyến', 'סורק רדיו'],
      d: ['Мачта со сканером снимает туман войны на 150 м вокруг.', 'A scanner mast clears the fog of war within 150 m.', 'Cột quét xoá sương mù chiến tranh trong 150 m.', 'תורן סורק מסיר את ערפל הקרב ברדיוס 150 מ׳.'] },
    { m: 'tower', cost: 240, time: 30, n: ['Снайперская вышка-корректировщик', 'Sniper & spotter tower', 'Tháp bắn tỉa & trinh sát pháo', 'מגדל צלפים ותצפית'],
      d: ['Обзор 190 м, метит врагов для всей армии (160 м), артиллерия и РСЗО по отмеченному району бьют вдвое кучнее, снайпер на вышке стреляет по пехоте.', 'Vision 190 m, marks enemies for the whole army (160 m), artillery and MLRS are twice as accurate there, and a sniper on top shoots infantry.', 'Tầm nhìn 190 m, đánh dấu địch cho cả quân (160 m), pháo và MLRS chính xác gấp đôi, xạ thủ trên tháp bắn bộ binh.', 'ראייה 190 מ׳, מסמן אויבים לכל הצבא (160 מ׳), ארטילריה ומשגרי רקטות מדויקים פי שניים, וצלף בראש המגדל יורה בחי"ר.'] },
  ] },
};
const HQUP70 = {
  armor:   { icon: '⛨', m: 'plate', cost: 300, time: 40, n: ['Бронеплиты', 'Armour plating', 'Giáp tăng cường', 'לוחות שריון'],
             d: ['Штаб +50 % прочности и −25 % урона.', 'HQ +50% HP and −25% damage taken.', 'Sở chỉ huy +50% máu, −25% sát thương.', 'המפקדה +50% חיים ו-25%- נזק.'] },
  turrets: { icon: '⌖', m: 'hqtHead', cost: 350, time: 40, n: ['Турели обороны', 'Defence turrets', 'Tháp phòng thủ', 'צריחי הגנה'],
             d: ['4 спаренные турели на платформе штаба: пехота, дроны, лёгкая техника до 95 м.', '4 twin turrets on the HQ platform: infantry, drones and light vehicles within 95 m.', '4 tháp đôi trên bệ sở chỉ huy: bộ binh, drone, xe nhẹ trong 95 m.', '4 צריחים כפולים על רחבת המפקדה: חי"ר, רחפנים ורכבים קלים עד 95 מ׳.'] },
  drop:    { icon: '☄', m: 'beacon', cost: 250, time: 30, n: ['Ускоренный орбитальный сброс', 'Faster orbital drop', 'Thả quỹ đạo nhanh', 'הנחתה מסלולית מהירה'],
             d: ['Маяк наведения: отряды и одиночки из казармы, инженеры и капсула готовы на 35 % быстрее, капсула на 25 % дешевле.', 'A homing beacon: squads and solos from the barracks, builders and the drop pod are 35% faster, the pod is 25% cheaper.', 'Đèn dẫn đường: đội và lính lẻ từ doanh trại, kỹ sư và khoang nhanh hơn 35%, khoang rẻ hơn 25%.', 'משואת הכוונה: חוליות ובודדים מהקסרקטין, מהנדסים והתרמיל מהירים ב-35%, התרמיל זול ב-25%.'] },
  income:  { icon: '⛁', m: 'silo', cost: 400, time: 45, n: ['Обогатительные колонны', 'Ore refinery columns', 'Cột tinh luyện', 'עמודי זיקוק'],
             d: ['Доход +25 %.', 'Income +25%.', 'Thu nhập +25%.', 'הכנסה +25%.'] },
  radar:   { icon: '◎', m: 'radar', cost: 300, time: 35, n: ['Глобальный радар', 'Global radar', 'Radar toàn cầu', 'מכ"ם גלובלי'],
             d: ['Раз в 40 с — импульс: все враги на метеорите видны 6 с.', 'Every 40 s a pulse reveals every enemy on the meteor for 6 s.', 'Mỗi 40 giây một xung: mọi kẻ địch hiện ra 6 giây.', 'כל 40 שניות פולס חושף את כל האויבים למשך 6 שניות.'] },
  cmd:     { icon: '✺', m: 'comms', cost: 250, time: 30, n: ['Антенны связи', 'Comms array', 'Ăng-ten liên lạc', 'מערך תקשורת'],
             d: ['+2 командных очка сразу и ещё +1 каждые 40 с (удары, способности стратега).', '+2 command points now and +1 more every 40 s (strikes, strategist powers).', '+2 điểm chỉ huy ngay và +1 mỗi 40 giây.', '+2 נקודות פיקוד מיד ועוד +1 כל 40 שניות.'] },
};
const HQUP70_ORDER = ['income', 'armor', 'turrets', 'cmd', 'drop', 'radar'];
const BASE70 = {
  ENG_R: 30, DOME_R: 24, domes: [], spots: [], vis: new WeakMap(), t: 0, aiT: [0, 0], uiT: 0,
  N: n => N2(n),
  // ---------------------------------------------------------------- данные
  tw(b){ if (!b.tw70) b.tw70 = { br: null, tier: 0, job: null }; return b.tw70; },
  outposts(t){ return S.buildings.filter(b => b.alive && b.done && b.type === 'outpost' && (t === undefined || b.team === t)); },
  cpOf(b){ let best = null, bd = 70; for (const c of S.cps){ if (c.core) continue; const d = dist(c.pos, b.pos); if (d < bd){ bd = d; best = c; } } return best; },
  hqu(t){ const h = S.hq[t]; if (!h.up70) h.up70 = { done: {}, job: null, radT: 0, cmdT: 0 }; return h.up70; },
  hasHQ(t, k){ const h = S.hq[t]; return !!(h && h.alive && h.up70 && h.up70.done[k]); },
  engs(b){ return S.builders.filter(x => x.alive && x.team === b.team && dist(x.pos, b.pos) < this.ENG_R + b.rad); },
  dev(t){ return t === 0 && typeof DEV !== 'undefined' && DEV.on; },
  next(b){ const w = this.tw(b); if (!w.br || w.tier >= 2) return null; return BR70[w.br].tiers[w.tier]; },
  // почему нельзя начать улучшение (или null)
  why(b, br){
    const w = this.tw(b), t = b.team;
    if (!b.done) return tr('Форпост ещё строится', 'The outpost is still being built', 'Tiền đồn đang xây', 'המוצב עדיין בבנייה');
    if (w.job) return tr('Уже идёт улучшение', 'An upgrade is in progress', 'Đang nâng cấp', 'שדרוג בתהליך');
    if (w.br && br && br !== w.br) return tr('У форпоста уже выбрана другая ветка', 'This outpost already has another branch', 'Tiền đồn đã chọn nhánh khác', 'למוצב כבר נבחר ענף אחר');
    const B = BR70[br || w.br]; if (!B) return '?';
    if (w.tier >= 2) return tr('Ветка прокачана до конца', 'Branch fully upgraded', 'Nhánh đã tối đa', 'הענף שודרג עד הסוף');
    const T = B.tiers[w.tier];
    if (!this.dev(t) && S.teams[t].ore < T.cost) return tr(`Нужно ${T.cost} руды`, `Need ${T.cost} ore`, `Cần ${T.cost} quặng`, `צריך ${T.cost} עפרה`);
    return null;
  },
  start(b, br){
    const why = this.why(b, br); if (why) return why;
    const w = this.tw(b); w.br = br || w.br;
    const T = BR70[w.br].tiers[w.tier];
    if (!this.dev(b.team)) S.teams[b.team].ore -= T.cost;
    w.job = { tier: w.tier + 1, t: 0, T: T.time, cost: this.dev(b.team) ? 0 : T.cost };
    if (this.dev(b.team)) w.job.t = w.job.T;
    emit('place', { b });
    return null;
  },
  cancel(b){ const w = this.tw(b); if (!w.job) return; S.teams[b.team].ore += w.job.cost || 0; w.job = null; if (!w.tier) w.br = null; },
  finish(b){
    const w = this.tw(b), j = w.job; if (!j) return;
    w.tier = j.tier; w.job = null;
    if (w.br === 'def' && w.tier === 2){ b.maxhp = Math.round(BTYPES.outpost.hp * 1.35); b.hp = min(b.maxhp, b.hp + BTYPES.outpost.hp * 0.35); }
    if (w.br === 'rec') b.visR = w.tier === 2 ? 190 : 150;
    const T = BR70[w.br].tiers[w.tier - 1], cp = this.cpOf(b);
    emit('built70', { b });
    if (b.team === 0 && !S.attract){
      feed(tr(`Форпост${cp ? ' у точки ' + cp.name : ''}: готово — ${N2(T.n)}`, `Outpost${cp ? ' at point ' + cp.name : ''}: ${N2(T.n)} ready`, `Tiền đồn${cp ? ' ở điểm ' + cp.name : ''}: ${N2(T.n)} đã xong`, `מוצב${cp ? ' בנקודה ' + cp.name : ''}: ${N2(T.n)} מוכן`), TEAM[0].css);
      emit('radio', { text: tr(`${N2(T.n)} — в строю`, `${N2(T.n)} is online`, `${N2(T.n)} đã hoạt động`, `${N2(T.n)} פעיל`), pri: 1 });
    }
  },
  // штаб
  hqWhy(t, k){
    const h = S.hq[t], U = this.hqu(t), K = HQUP70[k];
    if (!h.alive) return tr('Штаб разрушен', 'The HQ is destroyed', 'Sở chỉ huy đã bị phá', 'המפקדה הושמדה');
    if (U.done[k]) return tr('Уже построено', 'Already built', 'Đã xây', 'כבר נבנה');
    if (U.job) return tr('Штаб уже строит улучшение', 'The HQ is already building an upgrade', 'Sở chỉ huy đang nâng cấp', 'המפקדה כבר בונה שדרוג');
    if (!this.dev(t) && S.teams[t].ore < K.cost) return tr(`Нужно ${K.cost} руды`, `Need ${K.cost} ore`, `Cần ${K.cost} quặng`, `צריך ${K.cost} עפרה`);
    return null;
  },
  hqStart(t, k){
    const why = this.hqWhy(t, k); if (why) return why;
    const U = this.hqu(t), K = HQUP70[k];
    if (!this.dev(t)) S.teams[t].ore -= K.cost;
    U.job = { k, t: this.dev(t) ? K.time : 0, T: K.time, cost: this.dev(t) ? 0 : K.cost };
    return null;
  },
  hqCancel(t){ const U = this.hqu(t); if (!U.job) return; S.teams[t].ore += U.job.cost || 0; U.job = null; },
  hqFinish(t){
    const U = this.hqu(t), k = U.job.k, h = S.hq[t]; U.job = null; U.done[k] = true;
    if (k === 'armor'){ h.maxhp = Math.round(h.maxhp * 1.5); h.hp = min(h.maxhp, h.hp * 1.5); }
    if (k === 'cmd') S.teams[t].cmd = min(GAME.CMD_MAX, S.teams[t].cmd + 2);
    if (k === 'radar') U.radT = 3;
    if (t === 0 && !S.attract){
      feed(tr(`Штаб: готово — ${N2(HQUP70[k].n)}`, `HQ: ${N2(HQUP70[k].n)} ready`, `Sở chỉ huy: ${N2(HQUP70[k].n)} xong`, `מפקדה: ${N2(HQUP70[k].n)} מוכן`), TEAM[0].css);
      emit('radio', { text: tr(`Штаб: ${N2(HQUP70[k].n)} — в строю`, `HQ: ${N2(HQUP70[k].n)} online`, `Sở chỉ huy: ${N2(HQUP70[k].n)} hoạt động`, `מפקדה: ${N2(HQUP70[k].n)} פעיל`), pri: 1 });
    } else if (t === 1 && !S.attract && (k === 'turrets' || k === 'radar')) feed(tr(`Разведка: штаб Роя получил «${N2(HQUP70[k].n)}»`, `Intel: the Swarm HQ got "${N2(HQUP70[k].n)}"`, `Tình báo: sở chỉ huy Bầy Đàn có “${N2(HQUP70[k].n)}”`, `מודיעין: מפקדת הנחיל קיבלה „${N2(HQUP70[k].n)}"`), '#f99');
  },
  // ---------------------------------------------------------------- капсула на захваченную точку
  ROLESETS: [['assault', 'heavy', 'rocket', 'medic'], ['heavy', 'heavy', 'rocket', 'medic'], ['sniper', 'scout', 'assault', 'medic'], ['rocket', 'rocket', 'assault', 'medic'], null],
  onCapture(cp, t){
    if (cp.core || S.attract) return;
    cp.pod70 = cp.pod70 || [-1e9, -1e9];
    if (S.time - cp.pod70[t] < 150) return;
    const sqN = S.squads.filter(s => s.team === t).length, bN = S.builders.filter(b => b.alive && b.team === t).length;
    const squad = sqN < GAME.MAX_SQUADS, eng = bN < GAME.MAX_BUILDERS;
    if (!squad && !eng) return;
    cp.pod70[t] = S.time;
    const k = floor(random() * this.ROLESETS.length), roles = this.ROLESETS[k];
    const land = surfacePoint(cp.dir, 0.5), up = norm(land);
    const from = add(add(land, mul(up, 230)), mul(anyTangent(up), 50 * (random() - 0.5)));
    S.pods.push({ team: t, from, to: land, pos: from, t: 0, dur: 3.0, elite: !roles, by: 'cap70', v70: { roles, squad, eng, cp: cp.i } });
    emit('podincoming', { team: t, pos: land });
    if (t === 0) feed(tr(`Точка ${cp.name}: орбита сбрасывает капсулу — отряд${eng ? ' и инженер' : ''}`, `Point ${cp.name}: orbit is dropping a pod — a squad${eng ? ' and a builder' : ''}`, `Điểm ${cp.name}: quỹ đạo thả khoang — một đội${eng ? ' và kỹ sư' : ''}`, `נקודה ${cp.name}: המסלול מנחית תרמיל — חוליה${eng ? ' ומהנדס' : ''}`), TEAM[0].css);
  },
  land(p){
    const V = p.v70, t = p.team, cp = S.cps[V.cp];
    fxExplosion(p.to, 2.2);
    splash(p.to, t, 100, 6, null, 'g');
    let sq = null, eng = null;
    if (V.squad){
      sq = V.roles ? spawnSquad(t, false, p.to, 4, V.roles) : spawnSquad(t, true, p.to);
      for (const u of sq.units) u.vel = add(mul(norm(u.pos), 3), mul(randUnit(), 2));
      sq.cp70 = V.cp; setOrder(sq, 'hold', p.to, { lock: 30 });
      if (t === 0 && typeof rtsCmd66 === 'function'){ if (rtsCmd66()){ makeManual66(sq); sq.manualUntil = 1e9; } else sq.auto66 = true; }
    }
    if (V.eng){
      const d = offsetOnSphere(norm(p.to), anyTangent(norm(p.to)), 5);
      eng = makeBuilder(t, surfacePoint(d, ECO.HOVER));
      if (eng){ eng.cp70 = V.cp; eng.manualUntil = S.time + 90; eng.order = 'idle'; eng.goal = null; if (t === 0 && typeof rtsCmd66 === 'function' && rtsCmd66()) makeManual66(eng); }
    }
    if (t === 0 && !S.attract){
      feed(tr(`Капсула на точке ${cp.name}: ${sq ? groupLabel(sq) : ''}${sq && eng ? ' и ' : ''}${eng ? groupLabel(eng) : ''}. Инженер может поставить форпост (V) и выбрать ветку улучшений.`,
              `Pod on point ${cp.name}: ${sq ? groupLabel(sq) : ''}${sq && eng ? ' and ' : ''}${eng ? groupLabel(eng) : ''}. The builder can place an outpost (V) and pick an upgrade branch.`,
              `Khoang tại điểm ${cp.name}: ${sq ? groupLabel(sq) : ''}${sq && eng ? ' và ' : ''}${eng ? groupLabel(eng) : ''}. Kỹ sư có thể đặt tiền đồn (V) và chọn nhánh nâng cấp.`,
              `תרמיל בנקודה ${cp.name}: ${sq ? groupLabel(sq) : ''}${sq && eng ? ' ו-' : ''}${eng ? groupLabel(eng) : ''}. המהנדס יכול להציב מוצב (V) ולבחור ענף שדרוג.`), TEAM[0].css);
      if (typeof CUR !== 'undefined' && CUR.ev) try { CUR.ev('pod70', cp.i); } catch (e){}
    }
    this.lastLand = { t: S.time, team: t, cp: V.cp, sq, eng };
    p.done = true;
    return sq;
  },
  // ---------------------------------------------------------------- шаг
  step(dt){
    if (!dt) return;
    for (const e of S.events) if (e.type === 'capture' && e.owner >= 0) this.onCapture(e.cp, e.owner);
    this.domes = []; this.spots = [];
    for (const b of S.buildings){
      if (!b.alive || b.type !== 'outpost' || !b.tw70) continue;
      const w = b.tw70;
      if (w.job){
        const n = this.engs(b);
        w.engN = n.length;
        if (n.length || this.dev(b.team)){
          w.job.t += dt * min(2, 1 + 0.4 * (n.length - 1));
          for (const e of n.slice(0, 3)) if (builderIdle(e) || e.order === 'move'){ e.beam = add(add(b.pos, mul(b.up, 2 + random() * 3)), mul(randUnit(), 4)); e.work = 1; if (random() < dt * 8) S.sparks.push({ pos: e.beam, vel: add(mul(norm(e.beam), 2.5), mul(randUnit(), 2.5)), life: 0.35 }); }
        }
        if (w.job.t >= w.job.T) this.finish(b);
      }
      if (!b.done || !w.br || !w.tier) continue;
      if (w.br === 'def') this.defStep(b, w, dt);
      else if (w.br === 'sup') this.supStep(b, w, dt);
      else if (w.br === 'rec') this.recStep(b, w, dt);
    }
    for (const t of [0, 1]) this.hqStep(t, dt);
    // артудар по отмеченному району — кучнее
    for (const s of S.strikes) if (s.type === 'arty' && !s.sp70){ s.sp70 = true; if (this.spotted(s.team, s.pos)){ s.r *= 0.55; } }
    this.aiStep(dt);
  },
  slots(b){
    let v = this.vis.get(b);
    if (!v){
      const fr = st70frame(b.pos, b.fwd), cs = [[2.2, 11.5], [4.1, 11.5], [PI, 12.5]];
      v = { fr, s: cs.map(([a, r]) => { const p = st70ground(b.pos, fr.X, fr.Z, sin(a) * r, cos(a) * r, 0); return st70frame(p, sub(p, b.pos)); }) };
      this.vis.set(b, v);
    }
    return v;
  },
  rt: new WeakMap(),   // состояние пушек и дронов — не в сохранение
  g70(b){ let g = this.rt.get(b); if (!g){ g = { cd: 0, think: 0, tg: null, aim: null, at: 0, atAim: null, atTg: null, heal: 0, drones: null, sn: 2, spot: 0, burst: 0, tur: null }; this.rt.set(b, g); } return g; },
  defStep(b, w, dt){
    const g = this.g70(b), v = this.slots(b), A = v.s[0];
    const gun = add(add(A.pos, mul(A.Y, 1.25)), mul(A.Z, 1.9));
    g.think -= dt; g.cd -= dt;
    if (g.think <= 0){ g.think = 0.35; g.tg = findTarget(b, b.team, gun, { range: 60, structures: false }); if (g.tg && (g.tg.cls === 'hq' || g.tg.cls === 'tank')) g.tg = null; }
    if (g.tg && g.tg.alive){
      const c = centerOf(g.tg), want = norm(sub(c, gun));
      g.aim = g.aim ? turnToward(g.aim, want, 3.5 * dt) : want;
      if (g.cd <= 0 && dot(g.aim, want) > 0.99){
        b.target = g.tg; gunShootSimple(b, add(gun, mul(g.aim, 1.3)), g.aim, 0.028, WEAPONS.turret); b.target = null;
        emit('shot', { pos: gun, team: b.team, src: b, heavy: true });
        if (random() < 0.4) addLight(add(gun, mul(g.aim, 1.4)), [5, 3.5, 1.6], 8, 0.05, 0.004);
        g.burst++; g.cd = (w.tier >= 2 ? 0.12 : 0.15) + (g.burst % 10 === 0 ? 0.7 : 0);
      }
    }
    if (w.tier < 2) return;
    const B = v.s[1], at = add(add(B.pos, mul(B.Y, 1.25)), mul(B.Z, 2.4));
    g.at -= dt;
    if (!g.atTg || !g.atTg.alive || g.at < -1.5 || dist(g.atTg.pos, at) > 115){
      g.atTg = null; let bd = 110;
      for (const e of TGT[b.team]){ if (!e.alive || (e.cls !== 'tank' && e.cls !== 'drone')) continue; const d = dist(e.pos, at); if (d < bd && los(at, centerOf(e))){ bd = d; g.atTg = e; } }
    }
    if (g.atTg){
      const c = centerOf(g.atTg), tt = dist(c, at) / 150, want = norm(sub(add(c, mul(g.atTg.vel || [0, 0, 0], tt)), at));
      g.atAim = g.atAim ? turnToward(g.atAim, want, 1.6 * dt) : want;
      if (g.at <= 0 && dot(g.atAim, want) > 0.995){
        const m = add(at, mul(g.atAim, 3.2));
        fire(m, g.atAim, b.team, 0.006, 160, 150, b, 's', { splash: 3 });
        addLight(m, [14, 9, 4], 20, 0.12, 0.02); addWave(m, 1.1, 0.3); fxSmoke(m, 0.7, 0.35);
        emit('cannon', { pos: m, team: b.team, src: b });
        g.at = 3.4; g.kick = S.time;
      }
    }
  },
  supStep(b, w, dt){
    const g = this.g70(b);
    if (!g.drones) g.drones = [0, 1, 2].map(i => ({ ph: i * 2.094, pos: add(b.pos, mul(b.up, 6)), tg: null }));
    g.heal -= dt;
    if (g.heal <= 0){
      g.heal = 0.5;
      const R = 28, L = [];
      const consider = e => { if (e.alive && e.team === b.team && e.hp < e.maxhp * 0.995 && dist(e.pos, b.pos) < R + (e.rad || 0)) L.push(e); };
      for (const u of S.units) consider(u); for (const x of S.vehicles) consider(x); for (const x of S.drones) consider(x); for (const x of S.builders) consider(x);
      for (const x of S.buildings) if (x.done) consider(x);
      L.sort((a, c) => a.hp / a.maxhp - c.hp / c.maxhp);
      g.drones.forEach((d, i) => { d.tg = L[i] || L[0] || null; });
    }
    for (const d of g.drones){
      d.ph += dt * 0.7;
      const e = d.tg && d.tg.alive && d.tg.hp < d.tg.maxhp ? d.tg : null;
      const fr = this.slots(b).fr;
      const home = add(b.pos, add(mul(b.up, 7 + sin(d.ph * 1.3) * 0.6), add(mul(fr.X, cos(d.ph) * 9), mul(fr.Z, sin(d.ph) * 9))));
      const goal = e ? add(centerOf(e), add(mul(norm(e.pos), (e.cls === 'bld' ? (e.H || 4) : e.cls === 'tank' ? 3.2 : 2.2)), mul(anyTangent(norm(e.pos)), sin(d.ph * 2) * 0.8))) : home;
      d.pos = add(d.pos, mul(sub(goal, d.pos), 1 - Math.exp(-dt * 2.2)));
      d.fw = norm(sub(goal, d.pos));
      if (e && dist(d.pos, goal) < 3.5){
        const rate = e.cls === 'inf' ? 9 : e.cls === 'tank' ? 35 : e.cls === 'bld' ? 25 : 10;
        e.hp = min(e.maxhp, e.hp + rate * dt);
        if (e === S.me) S.healGlow = 0.4;
        if (random() < dt * 12) S.sparks.push({ pos: add(d.pos, mul(norm(d.pos), -0.2)), vel: mul(sub(centerOf(e), d.pos), 2.4), life: 0.35, heal: 1 });
        d.beam = true;
      } else d.beam = false;
    }
    if (w.tier >= 2){ this.domes.push({ b, pos: b.pos, team: b.team, r: this.DOME_R }); }
  },
  recStep(b, w, dt){
    const g = this.g70(b);
    b.visR = w.tier >= 2 ? 190 : 150;
    if (w.tier < 2) return;
    this.spots.push({ team: b.team, pos: b.pos, r: 170 });
    g.spot -= dt; g.sn -= dt;
    if (g.spot <= 0){
      g.spot = 1.2;
      for (const e of TGT[b.team]){ if (!e.alive || e.cls === 'bld' || e.cls === 'hq') continue; if (dist(e.pos, b.pos) < 160) e.seen[b.team] = max(e.seen[b.team], 2.5); }
    }
    if (g.sn <= 0){
      g.sn = 3.2;
      const v = this.slots(b), B = v.s[1], eye = add(B.pos, mul(B.Y, 10.5));
      let tg = null, bd = 150;
      for (const e of TGT[b.team]){ if (!e.alive || e.cls !== 'inf') continue; const d = dist(e.pos, eye); if (d < bd && los(eye, centerOf(e))){ bd = d; tg = e; } }
      if (tg){
        const c = centerOf(tg), miss = MISS70 && tg === ctrlEntity() && random() < MISS70.pCine(tg);
        const to = miss ? add(c, mul(randUnit(), 1.4)) : c;
        S.beams.push({ a: eye, b: to, t: 0, life: 0.3, team: b.team, rail: 1 });
        addLight(eye, [3, 6, 12], 10, 0.1, 0.006);
        emit('rail', { pos: eye, src: b });
        if (!miss) damage(tg, 55, b, 'l'); else emit('crack70', { pos: tg.pos });
      }
    }
  },
  hqStep(t, dt){
    const h = S.hq[t]; if (!h.alive || !h.up70) return;
    const U = h.up70;
    if (U.job){ U.job.t += dt * (t === 1 ? DK().eco : 1); if (U.job.t >= U.job.T) this.hqFinish(t); }
    if (U.done.radar){
      U.radT -= dt;
      if (U.radT <= 0){
        U.radT = 40;
        S.scans.push({ team: t, pos: mul(BASES[t], RM + 10), t: 0, life: 6, r: 2200, radar70: true });
        for (const e of TGT[t]) if (e.alive && e.seen) e.seen[t] = max(e.seen[t], 6);
        addWave(mul(BASES[t], RM + 18), 3, 1.2);
        if (t === 0 && !S.attract){ feed(tr('Радар штаба: все враги видны 6 с', 'HQ radar: every enemy is visible for 6 s', 'Radar sở chỉ huy: thấy mọi kẻ địch 6 giây', 'מכ"ם המפקדה: כל האויבים גלויים ל-6 שניות'), '#9cf'); emit('scan', { pos: h.pos, team: 0 }); }
      }
    }
    if (U.done.cmd){ U.cmdT += dt; if (U.cmdT >= 40){ U.cmdT = 0; addCmd(t, 1); } }
    if (U.done.turrets){
      const G = this.g70(h); if (!G.tur) G.tur = [0, 1, 2, 3].map(k => ({ k, cd: random(), think: random() * 0.3, tg: null, aim: null, n: 0 }));
      const F = this.hqFrame(t);
      for (const q of G.tur){
        const a = PI / 8 + q.k * PI / 2, base = add(mul(F.Y, RM + 1.6), add(mul(F.X, cos(a) * 13), mul(F.Z, sin(a) * 13)));
        const gun = add(base, mul(F.Y, 1.5));
        q.pos = base; q.think -= dt; q.cd -= dt;
        if (q.think <= 0){ q.think = 0.3; q.tg = findTarget(h, t, gun, { range: 95, structures: false }); if (q.tg && (q.tg.cls === 'hq' || (q.tg.cls === 'tank' && !q.tg.vk))) q.tg = null; }
        if (q.tg && q.tg.alive){
          const want = norm(sub(centerOf(q.tg), gun));
          q.aim = q.aim ? turnToward(q.aim, want, 3 * dt) : want;
          if (q.cd <= 0 && dot(q.aim, want) > 0.99){
            const side = norm(cross(q.aim, F.Y)), m = add(add(gun, mul(q.aim, 2.1)), mul(side, (q.n++ % 2 ? 0.35 : -0.35)));
            h.target = q.tg; gunShootSimple(h, m, q.aim, 0.03, WEAPONS.turret); h.target = null;
            emit('shot', { pos: m, team: t, src: h, heavy: true });
            q.cd = 0.13 + (q.n % 12 === 0 ? 0.8 : 0);
          }
        }
      }
    }
  },
  hqFrame(t){ const Y = BASES[t], X = anyTangent(Y), Z = norm(cross(X, Y)); return { X, Y, Z }; },
  spotted(team, p){ for (const s of this.spots) if (s.team === team && dist(s.pos, p) < s.r) return true; return false; },
  inDome(e){
    for (const d of this.domes) if (d.team === e.team && dist(e.pos, d.pos) < d.r){ d.b.hit70 = S.time; return true; }
    return false;
  },
  // ---------------------------------------------------------------- ИИ: ставит форпосты на точках, выбирает ветки, качает штаб
  aiStep(dt){
    for (const t of [0, 1]){
      const T = S.teams[t];
      if (t === 0 && (!T.ai || T.autoBuild === false || S.attract || (typeof rtsCmd66 === 'function' && rtsCmd66()))) continue;
      if (t === 0 && this.dev(0)) continue;
      this.aiT[t] -= dt; if (this.aiT[t] > 0) continue;
      this.aiT[t] = 3 + 0.37 * t;
      const reserve = t === 0 ? 400 : 120;
      // инженер с капсулы ставит форпост на своей точке
      for (const e of S.builders){
        if (!e.alive || e.team !== t || e.cp70 === undefined || e.cp70 === null || builderBusy(e)) continue;
        const cp = S.cps[e.cp70];
        if (!cp || cp.owner !== t || S.buildings.some(b => b.alive && b.type === 'outpost' && dist(b.pos, cp.pos) < 45)){ e.cp70 = null; continue; }
        if (S.buildings.filter(b => b.alive && b.team === t && b.type === 'outpost').length >= GAME.MAX_OUTPOSTS || T.ore < BTYPES.outpost.cost + (t === 0 ? 250 : 40)) continue;
        for (let k = 0; k < 10; k++){
          const dir = offsetOnSphere(cp.dir, rotAxis(anyTangent(cp.dir), cp.dir, k * 0.63), 16 + (k % 3) * 5);
          if (siteProblem(t, 'outpost', dir)) continue;
          if (!placeBuilding(t, 'outpost', dir)){ builderGive(e, S.lastSite, false, false); e.manualUntil = S.time + 60; e.cp70 = null; }
          break;
        }
      }
      const ops = this.outposts(t);
      const used = { def: 0, sup: 0, rec: 0 }; for (const b of ops) if (b.tw70 && b.tw70.br) used[b.tw70.br]++;
      for (const b of ops){
        const w = this.tw(b); if (w.job || w.tier >= 2) continue;
        let br = w.br;
        if (!br){
          const front = surfDist(b.pos, BASES[1 - t]) < surfDist(b.pos, BASES[t]) * 1.05;
          const vehs = S.vehicles.filter(v => v.alive && v.team === t).length;
          const want = front ? 'def' : vehs >= 3 ? 'sup' : 'rec';
          br = used[want] > min(used.def, used.sup, used.rec) + 1 ? ['def', 'sup', 'rec'].sort((a, c) => used[a] - used[c])[0] : want;
        }
        const nx = BR70[br].tiers[w.tier];
        if (T.ore < nx.cost + reserve) continue;
        if (!this.engs(b).length){
          const e = S.builders.filter(x => x.alive && x.team === t && builderIdle(x) && x.manualUntil < S.time).sort((a, c) => dist(a.pos, b.pos) - dist(c.pos, b.pos))[0];
          if (e){ e.order = 'move'; e.goal = surfacePoint(norm(add(b.pos, mul(b.fwd, b.rad + 5))), ECO.HOVER); e.manualUntil = S.time + 45; e.site = null; e.jobs = []; }
          continue;
        }
        if (!this.start(b, br)){ used[br] += w.tier === 0 ? 1 : 0; break; }
      }
      // штаб
      const U = this.hqu(t);
      if (!U.job && S.hq[t].alive && S.time > (t === 1 ? 240 : 300)){
        const k = HQUP70_ORDER.find(x => !U.done[x]);
        if (k && T.ore >= HQUP70[k].cost + reserve + 80) this.hqStart(t, k);
      }
    }
  },
  // ---------------------------------------------------------------- 3D-постройки для ST70
  items(){
    const L = [];
    const fog = S.mode !== 'fps' && !S.attract;
    for (const b of S.buildings){
      if (!b.alive || b.type !== 'outpost' || !b.tw70 || (!b.tw70.tier && !b.tw70.job)) continue;
      if (fog && fogHidden(b)) continue;
      const w = b.tw70, v = this.slots(b), g = this.g70(b), t = b.team, fl = b.flash || 0;
      const job = w.job, jk = job ? clamp(job.t / job.T, 0, 1) : 1;
      const push = (m, fr, s, sink, extra) => L.push(Object.assign({ m, pos: sink ? sub(fr.pos, mul(fr.Y, sink)) : fr.pos, X: fr.X, Y: fr.Y, Z: fr.Z, s: s || 1, team: t, flash: fl }, extra || {}));
      const rise = H => (1 - jk) * H;   // стройка: постройка «вырастает» из земли
      const br = w.br, A = v.s[0], B = v.s[1], C = v.s[2];
      const have = k => w.tier >= k, build = k => job && job.tier === k;
      if (br === 'def'){
        if (have(1) || build(1)){
          const sk = build(1) ? rise(2.2) : 0;
          push('bunker', A, 1, sk);
          const gp = { pos: add(add(A.pos, mul(A.Y, 1.22 - sk)), mul(A.Z, 1.62)) };
          const fr = g.aim ? st70yaw(Object.assign({}, A, gp), g.aim) : Object.assign({}, A, gp);
          push('mg', fr);
        }
        if (have(2) || build(2)){
          const sk = build(2) ? rise(2.6) : 0;
          if (have(2)) push('bunkerArmor', A);
          push('hbunker', B, 1, sk);
          const gp = { pos: add(add(B.pos, mul(B.Y, 1.0 - sk)), mul(B.Z, 2.35)) };
          let fr = g.atAim ? st70yaw(Object.assign({}, B, gp), g.atAim) : Object.assign({}, B, gp);
          if (g.kick && S.time - g.kick < 0.4) fr = Object.assign({}, fr, { pos: sub(fr.pos, mul(fr.Z, 0.35 * (1 - (S.time - g.kick) / 0.4))) });
          push('at', fr);
        }
      } else if (br === 'sup'){
        if (have(1) || build(1)){
          push('bay', A, 1, build(1) ? rise(1.5) : 0, { glow: 0.7 + 0.3 * sin(S.time * 3) });
          if (have(1) && g.drones) for (const d of g.drones){ const fr = st70frame(d.pos, d.fw || b.fwd); push('drone', fr, 1, 0, { glow: d.beam ? 1.6 : 0.8 }); }
        }
        if (have(2) || build(2)){
          push('gen', B, 1, build(2) ? rise(5) : 0, { glow: 0.8 + 0.4 * sin(S.time * 5) });
          if (have(2)){ const hk = b.hit70 ? max(0, 1 - (S.time - b.hit70) / 0.5) : 0, inside = S.cam && dist(S.cam.pos, b.pos) < this.DOME_R ? 0.45 : 1; push('dome', { pos: b.pos, X: v.fr.X, Y: v.fr.Y, Z: v.fr.Z }, this.DOME_R, 0, { dome: true, glow: (0.75 + 0.15 * sin(S.time * 2) + 1.4 * hk) * inside }); }
        }
      } else if (br === 'rec'){
        if (have(1) || build(1)){
          const sk = build(1) ? rise(11.5) : 0;
          push('mast', C, 1, sk, { glow: sin(S.time * 4) > 0.3 ? 1 : 0.2 });
          const top = { pos: add(C.pos, mul(C.Y, 11.15 - sk)) };
          push('dish', st70yaw(Object.assign({}, C, top), rotAxis(C.Z, C.Y, S.time * 1.4)));
        }
        if (have(2) || build(2)) push('tower', B, 1, build(2) ? rise(13.5) : 0, { glow: sin(S.time * 3 + 1) > 0.5 ? 1 : 0.25 });
      }
    }
    for (const t of [0, 1]){
      const h = S.hq[t]; if (!h.alive || !h.up70) continue;
      const U = h.up70, F = this.hqFrame(t), fl = h.flash || 0;
      const job = U.job, jk = job ? clamp(job.t / job.T, 0, 1) : 1;
      const has = k => U.done[k] || (job && job.k === k);
      const sk = k => (job && job.k === k) ? (1 - jk) : 0;
      const at = (a, r, y) => { const p = add(mul(F.Y, RM), add(mul(F.X, cos(a) * r), mul(F.Z, sin(a) * r))); const d = norm(p); return mul(d, (y === undefined ? groundR(d) : RM + y)); };
      const fr = (p, out) => st70frame(p, out);
      const push = (m, f, s, sink, extra) => L.push(Object.assign({ m, pos: sink ? sub(f.pos, mul(f.Y, sink)) : f.pos, X: f.X, Y: f.Y, Z: f.Z, s: s || 1, team: t, flash: fl }, extra || {}));
      if (has('armor')) for (let k = 0; k < 8; k++){ const a = k * PI / 4, p = at(a, 7.95, 3.4), o = sub(p, mul(F.Y, RM)); push('plate', fr(p, o), 1, sk('armor') * 7, { glow: 0.8 }); }
      if (has('turrets')){
        for (let k = 0; k < 4; k++){
          const a = PI / 8 + k * PI / 2, p = at(a, 13, 1.6), f = fr(p, sub(p, mul(F.Y, RM))), s0 = sk('turrets') * 2.5;
          push('hqtBase', f, 1, s0);
          const G = this.g70(h), q = G.tur && G.tur[k], hp = { pos: add(p, mul(f.Y, 1.0 - s0)) };
          push('hqtHead', q && q.aim ? st70yaw(Object.assign({}, f, hp), q.aim) : Object.assign({}, f, hp));
        }
      }
      const K = 1.45;   // штаб большой — его постройки крупнее
      if (has('drop')){ const p = at(PI / 3, 30), f = fr(p, sub(p, mul(F.Y, RM))); push('beacon', f, K, sk('drop') * 9.5 * K, { glow: 0.6 + 0.4 * sin(S.time * 4) }); }
      if (has('income')) for (const [a, r] of [[2 * PI / 3, 28], [2 * PI / 3 + 0.36, 31]]){ const p = at(a, r), f = fr(p, sub(p, mul(F.Y, RM))); push('silo', f, K, sk('income') * 8 * K, { glow: 0.75 + 0.25 * sin(S.time * 2 + a) }); }
      if (has('radar')){
        const p = at(PI, 30), f = fr(p, sub(p, mul(F.Y, RM))), s0 = sk('radar') * 9 * K;
        push('radar', f, K, s0, { glow: sin(S.time * 4) > 0.2 ? 1 : 0.2 });
        push('bigDish', st70yaw({ pos: add(p, mul(f.Y, 7.7 * K - s0)), X: f.X, Y: f.Y, Z: f.Z }, rotAxis(f.Z, f.Y, S.time * 0.9)), K, 0, { glow: U.radT > 37 ? 2.5 : 1 });
      }
      if (has('cmd')){ const p = at(4 * PI / 3, 29), f = fr(p, sub(mul(F.Y, RM), p)); push('comms', f, K, sk('cmd') * 12 * K, { glow: sin(S.time * 6) > 0 ? 1 : 0.15 }); }
    }
    return L;
  },
};
V70.steps.push(dt => BASE70.step(dt));
// капсула на точку
{
  const ps0 = podStep;
  podStep = function(p, dt){
    if (!p.v70) return ps0(p, dt);
    p.t += dt;
    const k = clamp(p.t / p.dur, 0, 1), e = k * k;
    p.pos = add(mul(p.from, 1 - e), mul(p.to, e));
    if (random() < 0.7) S.fx.push({ type: 'fire', pos: p.pos, r0: 0.9, r1: 2.2, life: 0.35, t: 0, inten: 0.8 });
    if (random() < 0.35) S.fx.push({ type: 'smoke', pos: p.pos, vel: mul(randUnit(), 0.4), r0: 1.2, r1: 4, life: 3.5, t: 0, grey: 0.25, dens: 0.9, heat: 0.4 });
    addLight(p.pos, [6, 3, 1.2], 26, 0.05, 0.01);
    if (k >= 1) return BASE70.land(p);
    return null;
  };
}
// урон: бронеплиты штаба, силовой купол
{
  const dm0 = damage;
  damage = function(e, dmg, src, ptype){
    if (e && e.alive && e.team !== undefined && e.team < 2){
      if (e.cls === 'hq'){ if (e.up70 && e.up70.done.armor) dmg *= 0.75; }
      else if (e.cls !== 'prop' && BASE70.domes.length && BASE70.inDome(e)) dmg *= 0.62;
    }
    return dm0(e, dmg, src, ptype);
  };
  // доход, время и цена заказов в штабе
  const ei0 = ecoIncome;
  ecoIncome = function(t, a, b){ const v = ei0(t, a, b); return BASE70.hasHQ(t, 'income') ? v * 1.25 : v; };
  const pt0 = pTime;
  pTime = function(t, key){ const v = pt0(t, key); const P = PRODUCTS[key]; return P && !P.research && (P.at.includes('hq') || P.at.includes('barracks')) && BASE70.hasHQ(t, 'drop') ? v * 0.65 : v; };
  const pc0 = pCost;
  pCost = function(t, key){ const v = pc0(t, key); return key === 'pod' && BASE70.hasHQ(t, 'drop') ? Math.round(v * 0.75) : v; };
  // РСЗО по отмеченному району — кучнее
  const rg0 = V2.rocketG;
  V2.rocketG = function(v, tp){ BASE70.spotTp = tp; try { return rg0.apply(this, arguments); } finally { BASE70.spotTp = null; } };
  const sp0 = V2.spread;
  V2.spread = function(v, d, smoke){ const s = sp0.call(this, v, d, smoke); return !smoke && BASE70.spotTp && BASE70.spotted(v.team, BASE70.spotTp) ? s * 0.5 : s; };
}
// рисуем 3D-постройки: список собирается каждый кадр (render.js вызывает ST70.draw после 3D-бойцов)
ST70.collect = function(){ try { this.items = BASE70.items(); } catch (e){ this.items = []; if (!this.cerr){ this.cerr = true; console.warn('ST70 items', e); } } };
// ---------------------------------------------------------------- карточка форпоста и штаба (стратегия)
{
  const L = (ru, en, vi, he) => uixEsc(tr(ru, en, vi, he));
  BASE70.cardHTML = function(B){
    if (!B || B.team !== 0) return '';
    if (B.cls === 'hq'){
      if (!B.alive) return '';
      const U = this.hqu(0);
      let h = `<div class="u70"><h6>⌂ ${L('Улучшения штаба', 'HQ upgrades', 'Nâng cấp sở chỉ huy', 'שדרוגי מפקדה')}</h6><div class="u70g">`;
      for (const k of Object.keys(HQUP70)){
        const K = HQUP70[k], done = U.done[k], job = U.job && U.job.k === k, why = done || job ? null : this.hqWhy(0, k);
        const st = done ? '✓' : job ? `<i class="u70b"><s data-u70p="hq"></s></i>` : `${K.cost}`;
        const tip = `<b>${K.icon} ${uixEsc(N2(K.n))}</b><p>${uixEsc(N2(K.d))}</p><p class="dt">${done ? L('Построено', 'Built', 'Đã xây', 'נבנה') : job ? L('Строится — клик: отменить (руда вернётся)', 'Building — click to cancel (refund)', 'Đang xây — nhấn để huỷ', 'בבנייה — לחץ לביטול') : `${K.cost} ${L('руды', 'ore', 'quặng', 'עפרה')} · ${K.time} ${L('с', 's', 'giây', 'ש׳')}` + (why ? ' · ' + uixEsc(why) : '')}</p>`;
        h += `<button class="u70x ${done ? 'done' : ''} ${job ? 'job' : ''} ${why && !done && !job ? 'off' : ''}" data-v70="${job ? 'hqc' : 'hq'}:${k}" data-tip="${uixEsc(tip)}"><i>${K.icon}</i><b>${uixEsc(N2(K.n))}</b><em>${st}</em></button>`;
      }
      return h + '</div></div>';
    }
    if (B.cls !== 'bld' || B.type !== 'outpost' || !B.done) return '';
    const w = this.tw(B), cp = this.cpOf(B), en = this.engs(B).length;
    let h = `<div class="u70"><h6>⛫ ${L('Улучшения форпоста', 'Outpost upgrades', 'Nâng cấp tiền đồn', 'שדרוגי מוצב')}${cp ? ' · ' + L('точка', 'point', 'điểm', 'נקודה') + ' ' + cp.name : ''}</h6>`;
    if (!w.br){
      h += `<p class="u70n">${L('Выбери ветку — у каждой точки своя специализация:', 'Pick a branch — every point gets its own speciality:', 'Chọn nhánh — mỗi điểm một chuyên môn:', 'בחר ענף — לכל נקודה התמחות משלה:')}</p><div class="u70g u70br">`;
      for (const br of ['def', 'sup', 'rec']){
        const R = BR70[br], T = R.tiers[0], why = this.why(B, br);
        const tip = `<b>${R.icon} ${uixEsc(N2(R.n))}</b><p>I. ${uixEsc(N2(T.n))} — ${uixEsc(N2(T.d))}</p><p>II. ${uixEsc(N2(R.tiers[1].n))} — ${uixEsc(N2(R.tiers[1].d))}</p><p class="dt">${T.cost} ${L('руды', 'ore', 'quặng', 'עפרה')}${why ? ' · ' + uixEsc(why) : ''}</p>`;
        h += `<button class="u70x ${why ? 'off' : ''}" data-v70="br:${br}" data-tip="${uixEsc(tip)}" style="--c:${R.col}"><i>${R.icon}</i><b>${uixEsc(N2(R.n))}</b><small>${uixEsc(N2(T.n))}</small><em>${T.cost}</em></button>`;
      }
      h += '</div>';
    } else {
      const R = BR70[w.br];
      h += `<div class="u70g u70br">`;
      R.tiers.forEach((T, i) => {
        const done = w.tier > i, job = w.job && w.job.tier === i + 1, can = w.tier === i && !w.job, why = can ? this.why(B) : null;
        const st = done ? '✓' : job ? `<i class="u70b"><s data-u70p="op"></s></i>` : can ? `${T.cost}` : '🔒';
        const tip = `<b>${'I'.repeat(i + 1)}. ${uixEsc(N2(T.n))}</b><p>${uixEsc(N2(T.d))}</p><p class="dt">${done ? L('Построено', 'Built', 'Đã xây', 'נבנה') : job ? L('Строится — клик: отменить', 'Building — click to cancel', 'Đang xây — nhấn để huỷ', 'בבנייה — לחץ לביטול') : `${T.cost} ${L('руды', 'ore', 'quặng', 'עפרה')} · ${T.time} ${L('с', 's', 'giây', 'ש׳')}${why ? ' · ' + uixEsc(why) : ''}`}</p>`;
        h += `<button class="u70x ${done ? 'done' : ''} ${job ? 'job' : ''} ${!can && !done && !job ? 'lock' : ''} ${why ? 'off' : ''}" data-v70="${job ? 'opc' : 'up'}:${i}" data-tip="${uixEsc(tip)}" style="--c:${R.col}"><i>${R.icon}${'I'.repeat(i + 1)}</i><b>${uixEsc(N2(T.n))}</b><em>${st}</em></button>`;
      });
      h += `</div><p class="u70n">${R.icon} ${uixEsc(N2(R.n))}</p>`;
    }
    const needEng = (w.job || (!w.br || w.tier < 2)) && !en && !this.dev(0);
    h += needEng ? `<p class="u70w">⚒ ${L('Улучшение строит инженер рядом с форпостом (30 м).', 'A builder near the outpost (30 m) does the upgrade.', 'Kỹ sư gần tiền đồn (30 m) nâng cấp.', 'מהנדס ליד המוצב (30 מ׳) מבצע את השדרוג.')} <button data-v70="eng:0">⚒ ${L('Прислать инженера', 'Send a builder', 'Gửi kỹ sư', 'שלח מהנדס')}</button></p>`
                 : (w.job ? `<p class="u70n">⚒ ${L('Инженеров рядом', 'Builders nearby', 'Kỹ sư gần', 'מהנדסים בקרבת מקום')}: ${en}${this.dev(0) ? ' · 🛠' : ''}</p>` : '');
    return h + '</div>';
  };
  const sc0 = siteCardHTML;
  siteCardHTML = function(b){ return sc0(b) + BASE70.cardHTML(b); };
  const uc0 = updateCard;
  updateCard = function(){
    uc0();
    const el = $('card'); if (!el) return;
    const B = S.selB; if (!B) return;
    // прогресс без пересборки карточки
    for (const s of el.querySelectorAll('[data-u70p]')){
      let k = 0;
      if (s.dataset.u70p === 'hq'){ const U = S.hq[0].up70; if (U && U.job) k = U.job.t / U.job.T; }
      else if (B.tw70 && B.tw70.job) k = B.tw70.job.t / B.tw70.job.T;
      s.style.width = (clamp(k, 0, 1) * 100).toFixed(0) + '%';
    }
  };
  BASE70.act = function(t){
    const [a, v] = t.dataset.v70.split(':');
    AU.init();
    const B = S.selB;
    let why = null;
    if (a === 'hq') why = this.hqStart(0, v);
    else if (a === 'hqc') this.hqCancel(0);
    else if (B && B.cls === 'bld' && B.team === 0){
      if (a === 'br') why = this.start(B, v);
      else if (a === 'up') why = this.start(B);
      else if (a === 'opc') this.cancel(B);
      else if (a === 'eng'){
        const e = selBuilders()[0] || nearestBuilder(0, B.pos, true) || nearestBuilder(0, B.pos, false);
        if (!e) why = tr('Нет инженеров — обучи в штабе', 'No builders — train one at the HQ', 'Không có kỹ sư', 'אין מהנדסים — אמן במפקדה');
        else { e.order = 'move'; e.goal = surfacePoint(norm(add(B.pos, mul(B.fwd, B.rad + 4))), ECO.HOVER); e.site = null; e.jobs = []; e.byPlayer = true; e.manualUntil = 1e9; feed(tr(`${groupLabel(e)} идёт к форпосту`, `${groupLabel(e)} is heading to the outpost`, `${groupLabel(e)} đang tới tiền đồn`, `${groupLabel(e)} בדרך למוצב`), '#9cf'); }
      }
    }
    if (why){ feed(why, '#f88'); emit('ui', { kind: 'deny' }); }
    else { emit('ui', { kind: 'ok' }); if (typeof CUR !== 'undefined' && CUR.ev) try { CUR.ev('up70', a); } catch (e){} }
    CARD.sig = '';
    if (typeof uixTipHide === 'function') try { uixTipHide(); } catch (e){}
  };
  const T = { t0: null, at: -1e9 };
  const find = e => e.target && e.target.closest ? e.target.closest('[data-v70]') : null;
  document.addEventListener('click', e => { const t = find(e); if (!t) return; e.stopPropagation(); e.preventDefault(); if (performance.now() - T.at < 700) return; BASE70.act(t); }, true);
  document.addEventListener('mousedown', e => { if (find(e)) e.stopPropagation(); }, true);
  document.addEventListener('touchstart', e => { const t = find(e); if (!t){ T.t0 = null; return; } const p = e.changedTouches[0]; T.t0 = { t, x: p.clientX, y: p.clientY }; e.stopPropagation(); }, { capture: true, passive: true });
  document.addEventListener('touchend', e => {
    const t = find(e); if (!t || !T.t0 || T.t0.t !== t) return;
    const p = e.changedTouches[0]; e.stopPropagation(); if (e.cancelable) e.preventDefault();
    if (Math.hypot(p.clientX - T.t0.x, p.clientY - T.t0.y) > 14) return;
    T.at = performance.now(); T.t0 = null; BASE70.act(t);
  }, { capture: true, passive: false });
  const st = document.createElement('style');
  st.textContent = `.u70{margin-top:4px;background:rgba(12,13,14,.88);border:1px solid rgba(214,198,154,.24);border-radius:3px;padding:5px 7px;pointer-events:auto}
.u70 h6{margin:0 0 4px;font:600 10.5px "Exo 2",sans-serif;letter-spacing:.12em;color:#a59d84;text-transform:uppercase}
.u70g{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.u70 .u70x{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:52px;padding:3px 4px;background:rgba(232,220,184,.07);border:1px solid var(--c,rgba(232,220,184,.3));border-radius:4px;color:#e8dcb8;font:600 11px "Exo 2",sans-serif;cursor:pointer;text-align:center;line-height:1.1}
.u70 .u70x i{font-style:normal;font-size:16px;color:var(--c,#d6c69a)}.u70 .u70x b{font-weight:600;font-size:10.5px}.u70 .u70x small{font-size:9.5px;opacity:.7}
.u70 .u70x em{font-style:normal;font-size:10.5px;color:#ffd27a;min-height:12px}.u70 .u70x.done{border-color:#8fffaa;background:rgba(140,255,170,.12)}.u70 .u70x.done em{color:#8fffaa}
.u70 .u70x.off{opacity:.55}.u70 .u70x.lock{opacity:.4;filter:grayscale(1)}.u70 .u70x.job{border-color:#ffd27a}
.u70b{display:block;width:44px;height:5px;background:rgba(0,0,0,.5);border-radius:3px;overflow:hidden}.u70b s{display:block;height:100%;width:0;background:#ffd27a;text-decoration:none}
.u70n{margin:4px 0 0;font:500 11px "Exo 2",sans-serif;color:#cfc6ad}.u70w{margin:5px 0 0;font:500 11px "Exo 2",sans-serif;color:#ffb347;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.u70w button{background:rgba(255,179,71,.12);border:1px solid #ffb347;color:#ffd27a;font:600 11px "Exo 2",sans-serif;padding:4px 8px;border-radius:4px;cursor:pointer}
body.touch .u70 .u70x{min-height:58px}body.touch .u70w button{min-height:40px}`;
  document.head.appendChild(st);
}
