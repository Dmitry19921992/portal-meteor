// =====================================================================
//  ПОДСКАЗКИ: по управлению и геймплею, особенно если возможность есть,
//  а игрок ею не пользуется. Показываются карточкой и озвучиваются.
// =====================================================================
const HINTS = {
  use: {}, shown: {}, cur: null, lastT: -99, rtsT: 0,
  reset(){ this.use = {}; this.shown = {}; this.cur = null; this.lastT = -99; this.rtsT = 0; },
  used(a){ this.use[a] = S.rtime; if (this.cur && this.cur.act === a) this.cur.until = min(this.cur.until, S.rtime + 0.6); },
  idle(a, sec){ return S.rtime - (this.use[a] === undefined ? -1e9 : this.use[a]) > sec; },
  never(a){ return this.use[a] === undefined; },
  denied(what){
    const r = { grenade: 1, reflex: 3, rail: 4, strike: 5 }[what];
    if (what === 'hmg'){ this.show('deny_hmg', tr('Тяжёлый пулемёт стратег выдаёт как награду за выполненный приказ.', 'The heavy MG is a reward the strategist hands out for completed orders.', 'Súng máy hạng nặng là phần thưởng chiến lược gia trao khi hoàn thành lệnh.'), [], 0, true); return; }
    if (r === undefined) return;
    const u = UNLOCK_INFO[UNLOCKS[r]];
    this.show('deny_' + what, tr(`${N2(u.n)} откроется на звании «${PROG.rankName(r)}». Опыт дают убийства, захват точек и приказы стратега (×2–×3).`,
      `${N2(u.n)} unlocks at rank "${PROG.rankName(r)}". XP comes from kills, captures and strategist orders (×2–×3).`, `${N2(u.n)} mở khóa ở cấp “${PROG.rankName(r)}”. Kinh nghiệm có từ tiêu diệt, chiếm điểm và lệnh của chiến lược gia (×2–×3).`), [], 0, true);
  },
  show(id, text, kbd, act, force){
    if (!SET.hintsOn && !force) return false;
    this.shown[id] = (this.shown[id] || 0) + 1;
    this.shown[id + '_t'] = S.rtime;
    this.cur = { id, text, kbd: kbd || [], act, t: S.rtime, until: S.rtime + 8 };
    this.lastT = S.rtime;
    if (SET.hintsVoice) AU.speak(text.replace(/<[^>]+>/g, ''), 'hint');
    emit('hint', {});
    return true;
  },
  can(id, max, cool){ return (this.shown[id] || 0) < (max || 1) && S.rtime - (this.shown[id + '_t'] || -1e9) > (cool || 150); },
  step(dt){
    const el = $('hint');
    if (this.cur && S.rtime < this.cur.until && !MENU.isOpen()){
      el.style.display = 'flex';
      const sig = this.cur.id + this.cur.t;
      if (el.dataset.sig !== sig){
        el.dataset.sig = sig;
        el.innerHTML = `<i>?</i><div>${this.cur.kbd.map(k => `<kbd>${k}</kbd>`).join('')} ${this.cur.text}</div>`;
      }
    } else { el.style.display = 'none'; this.cur = null; }
    if (S.rtime - this.lastT < 14 || S.over || S.paused || TUT.on) return;
    if (S.mode === 'rts'){ this.rtsT += dt; this.rtsStep(); } else this.fpsStep();
  },
  fpsStep(){
    const c = ctrlEntity(); if (!c) return;
    const t = S.time, K = S.kit;
    const H = (id, max, cool, cond, text, kbd, act) => { if (this.can(id, max, cool) && cond()) { this.show(id, text, kbd, act); return true; } return false; };
    const near = r => enemiesNear(0, c.pos, r);
    if (c.cls === 'inf'){
      const TC = typeof TOUCH !== 'undefined' && TOUCH.on;   // v5.3: на телефоне — подсказки про кнопки, а не клавиатуру
      if (TC){
        if (H('move', 1, 0, () => t > 2 && this.never('move'), tr('Левый палец — идти, правый — обзор. Красная кнопка — огонь.', 'Left thumb — move, right thumb — look. Red button — fire.', 'Ngón trái — di chuyển, ngón phải — nhìn. Nút đỏ — bắn.'), [], 'move')) return;
        if (H('jet', 2, 120, () => t > 25 && this.idle('jet', 90), tr('⇑ — ранец: нажми для прыжка, держи для полёта. ◎ — прицел.', '⇑ — jetpack: tap to hop, hold to fly. ◎ — aim.', '⇑ — ba lô: nhấn để nhảy, giữ để bay. ◎ — ngắm.'), [], 'jet')) return;
        if (H('airbrake', 2, 150, () => !c.grounded && c.airT > 1.2 && len(c.vel) > 16 && this.never('airbrake'), tr('В воздухе ⤓ — тормоз ранцем.', 'In the air, ⤓ is the jet brake.', 'Trên không, ⤓ là phanh phản lực.'), [], 'airbrake')) return;
      }
      if (H('move', 1, 0, () => t > 2 && this.never('move'), tr('Двигайся и стреляй: мышь — обзор, ЛКМ — огонь.', 'Move and shoot: mouse to look, LMB to fire.', 'Di chuyển và bắn: chuột để nhìn, chuột trái để bắn.'), [bk('fwd') + bk('left') + bk('back') + bk('right')], 'move')) return;
      if (H('task', 1, 0, () => TACT.task && TACT.task.kind !== 'player' && t > 6, tr('Сверху — приказ ИИ-стратега. Выполняй его: опыт ×2 и ×3, а за выполнение бывают награды. Зелёный маркер и стрелки ведут к цели.', 'At the top is the AI strategist\'s order. Follow it: ×2 and ×3 XP, and completed orders can earn rewards. The green marker and chevrons lead the way.', 'Phía trên là lệnh của chiến lược gia AI. Làm theo: kinh nghiệm ×2 và ×3, hoàn thành lệnh còn có thể được thưởng. Dấu chỉ xanh và mũi tên sẽ dẫn đường.'), [], null)) return;
      if (H('jet', 2, 120, () => t > 25 && this.idle('jet', 90), tr('Shift — прыжковый ранец: нажми для прыжка, держи для полёта. ПКМ — прицел.', 'Shift — jump pack: tap to hop, hold to fly. RMB — aim.', 'Shift — ba lô nhảy: nhấn để nhảy, giữ để bay. Chuột phải — ngắm.'), ['Shift'], 'jet')) return;
      if (H('airbrake', 2, 150, () => !c.grounded && c.airT > 1.2 && len(c.vel) > 16 && this.never('airbrake'), tr('В воздухе C — тормоз ранцем. Затормози, развернись взглядом и дай тягу заново.', 'In the air, C is the jet brake. Stop, turn with the mouse and thrust again.', 'Trên không, C là phanh phản lực. Dừng lại, xoay chuột và đẩy lại.'), [bk('down')], 'airbrake')) return;
      if (H('rocket', 3, 90, () => c.rocketCd <= 0 && this.idle('rocket', 40) && near(85).some(e => e.cls === 'tank' || e.cls === 'bld'), tr('Рядом техника или постройка врага. Ракета — лучшее против них.', 'Enemy vehicle or structure nearby. A rocket is best against them.', 'Gần đây có xe hoặc công trình địch. Tên lửa là thứ tốt nhất để đối phó.'), [bk('rocket')], 'rocket')) return;
      if (H('grenade', 3, 100, () => PROG.has('grenade') && K.grenCd <= 0 && this.idle('grenade', 60) && near(32).filter(e => e.cls === 'inf').length >= 2, tr('Враги сбились в кучу — брось гранату.', 'Enemies are bunched up — throw a grenade.', 'Địch đang dồn cục — ném lựu đạn đi.'), [bk('grenade')], 'grenade')) return;
      if (H('reflex', 3, 100, () => PROG.has('reflex') && !K.reflexOn && K.reflex > 0.9 && this.idle('reflex', 60) && near(45).length >= 3, tr('Много врагов — включи рефлекс: время замедлится, а ты успеешь всех снять.', 'Lots of hostiles — trigger Reflex: time slows down and you can pick them off.', 'Nhiều địch quá — bật Phản xạ: thời gian chậm lại và bạn hạ từng tên.'), [bk('reflex')], 'reflex')) return;
      if (H('strike', 3, 120, () => (PROG.has('strike') || K.strikeCharges > 0) && K.strikeCd <= 0 && this.idle('strike', 90) && (clusterCenter(near(130)) || { n: 0 }).n >= 3, tr('Наведи прицел на скопление врагов и вызови удар.', 'Aim at the enemy cluster and call in a strike.', 'Ngắm vào cụm địch và gọi oanh kích.'), [bk('strike')], 'strike')) return;
      if (H('rail', 2, 120, () => PROG.has('rail') && K.w === 'rifle' && near(140).some(e => dist(e.pos, c.pos) > 75) && !near(40).length, tr('Цели далеко — рельсотрон сильнее на дальней дистанции.', 'Targets are far — the railgun is stronger at long range.', 'Mục tiêu ở xa — súng ray mạnh hơn ở tầm xa.'), [bk('w2')], null)) return;
      if (H('hmg', 2, 60, () => K.hmgT > 0 && K.w !== 'hmg', tr('У тебя временный тяжёлый пулемёт — пользуйся, пока не отозвали.', 'You have a temporary heavy MG — use it before it is recalled.', 'Bạn có súng máy hạng nặng tạm thời — dùng trước khi bị thu hồi.'), [bk('w3')], null)) return;
      if (H('slide', 2, 200, () => t > 60 && S.onRoute && this.never('slide'), tr('Паркур: на бегу C — подкат, прыжок у уступа — перелезть, прыжок у стены в воздухе — отскок.', 'Parkour: C while running — slide, jump at a ledge — climb it, jump next to a wall in the air — wall-jump.', 'Parkour: C khi chạy — trượt, nhảy cạnh gờ — leo lên, nhảy cạnh tường khi trên không — bật tường.'), [bk('down'), bk('jump')], 'slide')) return;
      if (H('range', 1, 0, () => t > 80, tr('Пули бьют сильнее всего на 20–50 м. В упор и издалека — заметно слабее, и по тебе тоже.', 'Bullets hit hardest at 20–50 m. Point-blank and long range are much weaker — for enemies too.', 'Đạn mạnh nhất ở 20–50 m. Bắn sát và bắn xa yếu hơn nhiều — với địch cũng vậy.'), [], null)) return;
      if (H('lowhp', 3, 90, () => c.hp < c.maxhp * 0.3, tr('Робот сильно повреждён. Уйди из-под огня — вне боя броня чинится сама.', 'Your robot is badly damaged. Get out of the fire — armor self-repairs out of combat.', 'Robot của bạn bị hư hại nặng. Rời khỏi làn đạn — giáp tự sửa khi ngoài giao tranh.'), [], null)) return;
      if (H('tank', 2, 120, () => t > 30 && this.idle('tank', 300) && S.vehicles.some(v => v.alive && v.team === 0 && dist(v.pos, c.pos) < 25), tr('Рядом наш танк. Подойди и нажми E — будешь управлять им.', 'One of our tanks is close. Walk up and press E to take control.', 'Xe tăng của ta ở gần. Lại gần và nhấn E để điều khiển.'), [bk('interact')], 'tank')) return;
      if (H('turret', 2, 120, () => this.never('turret') && S.buildings.some(b => b.alive && b.done && b.team === 0 && b.type === 'turret' && dist(b.pos, c.pos) < 14) && near(70).length, tr('Займи турель — E рядом с ней.', 'Man the turret — press E next to it.', 'Vào tháp súng — nhấn E khi đứng cạnh.'), [bk('interact')], 'turret')) return;
      if (H('switch', 2, 200, () => t > 60 && this.idle('switch', 240) && (!near(130).length), tr('Здесь тихо. Переключись на отряд или технику ближе к бою.', 'It is quiet here. Switch to a squad or vehicle closer to the fight.', 'Ở đây yên tĩnh. Chuyển sang đội hoặc xe gần trận đánh hơn.'), [bk('switch')], 'switch')) return;
      if (H('reload', 1, 0, () => K.mag[K.w] < WEAPONS[K.w].mag * 0.25 && K.reloadT <= 0 && this.never('reload'), tr('Перезаряжайся заранее, пока нет врагов.', 'Reload early while no enemies are around.', 'Nạp đạn sớm khi không có địch.'), [bk('reload')], 'reload')) return;
      if (H('route', 2, 200, () => t > 40 && this.never('route') && TACT.task && !TACT.task.done && navPts.length > 3, tr('Беги прямо по зелёным стрелкам стратега — на его маршруте ты бежишь быстрее.', 'Sprint right along the strategist\'s green chevrons — you run faster on his route.', 'Chạy dọc theo mũi tên xanh của chiến lược gia — trên tuyến đường đó bạn chạy nhanh hơn.'), [bk('run')], 'route')) return;
      if (H('rts', 2, 240, () => t > 150 && this.idle('rts', 400), tr('Режим стратегии: строй базу, заказывай войска, вызывай удары и командуй отрядами.', 'Strategy mode: build the base, order troops, call strikes and command squads.', 'Chế độ chiến thuật: xây căn cứ, gọi quân, gọi oanh kích và chỉ huy các đội.'), [bk('rts')], 'rts')) return;
      if (H('ai', 1, 0, () => t > 300, tr('Хочешь командовать сам? Выключи ИИ-стратега — тогда приказы отдаёшь ты.', 'Want full command? Turn off the AI strategist — then you give the orders.', 'Muốn tự chỉ huy? Tắt chiến lược gia AI — khi đó bạn ra lệnh.'), [bk('ai')], null)) return;
      if (H('third', 1, 0, () => t > 200 && this.never('third'), tr('Вид от третьего лица — чтобы видеть своего робота.', 'Third-person view — to see your robot.', 'Góc nhìn thứ ba — để thấy robot của bạn.'), [bk('third')], 'third')) return;
    } else if (c.cls === 'tank' && c.vk){   // новая техника (vehicles2.js)
      if (H('v2' + c.vk, 1, 0, () => true, V2.hint(c), [], 'vab')) return;
    } else if (c.cls === 'tank'){
      if (H('vtank', 1, 0, () => true, tr(`Танк: ${bk('reload')} — залп в точку прицела, ${bk('reflex')} — дымовая завеса, ${bk('grenade')} — форсаж. ${bk('interact')} — обратно в пехоту.`, `Tank: ${bk('reload')} — barrage at your aim point, ${bk('reflex')} — smoke screen, ${bk('grenade')} — overdrive. ${bk('interact')} — back to infantry.`, `Xe tăng: ${bk('reload')} — loạt pháo vào điểm ngắm, ${bk('reflex')} — màn khói, ${bk('grenade')} — tăng tốc. ${bk('interact')} — trở về bộ binh.`), [], 'vab')) return;
      if (H('vtank2', 2, 120, () => this.idle('vab', 90) && near(110).length >= 3, tr('Целей много — дай залп.', 'Plenty of targets — fire a barrage.', 'Nhiều mục tiêu — bắn loạt pháo đi.'), [bk('reload')], 'vab')) return;
    } else if (c.cls === 'drone'){
      if (H('vdrone', 1, 0, () => true, tr(`Дрон: ${bk('jump')}/${bk('down')} — выше/ниже, ЛКМ — огонь, ${bk('reload')} — таран в точку прицела.`, `Drone: ${bk('jump')}/${bk('down')} — up/down, LMB — fire, ${bk('reload')} — ram your aim point.`, `Drone: ${bk('jump')}/${bk('down')} — lên/xuống, chuột trái — bắn, ${bk('reload')} — đâm vào điểm ngắm.`), [], null)) return;
    }
  },
  rtsStep(){
    const t = this.rtsT, T = S.teams[0];
    const H = (id, max, cool, cond, text, kbd, act) => { if (this.can(id, max, cool) && cond()) { this.show(id, text, kbd, act); return true; } return false; };
    const sel = selGroups();
    if (H('select', 1, 0, () => t > 2 && this.never('select'), tr('Выдели отряд — ЛКМ или рамкой. ПКМ — приказ: идти, захватить точку или атаковать цель.', 'Select a squad — LMB or drag a box. RMB gives orders: move, capture a point or attack a target.', 'Chọn một đội — chuột trái hoặc kéo khung. Chuột phải để ra lệnh: di chuyển, chiếm điểm hoặc tấn công mục tiêu.'), [tr('ЛКМ', 'LMB', 'Chuột trái'), tr('ПКМ', 'RMB', 'Chuột phải')], 'select')) return;
    if (H('ability', 2, 120, () => sel.length && this.idle('ability', 120) && t > 10, tr('У отрядов есть способности: гранаты, рывок на ранцах, подавление, ремонт. У танков — залп, дым, форсаж.', 'Squads have abilities: grenades, jet leap, suppression, repair. Tanks: barrage, smoke, overdrive.', 'Các đội có kỹ năng: lựu đạn, phóng phản lực, áp chế, sửa chữa. Xe tăng: loạt pháo, khói, tăng tốc.'), ['R', 'F', 'G', 'T'], 'ability')) return;
    if (H('produce', 2, 150, () => T.ore > 450 && this.idle('produce', 120), tr('Руды много — закажи войска во вкладке «Войска» справа.', 'Plenty of ore — order troops in the "Units" tab on the right.', 'Nhiều quặng — gọi quân ở thẻ “Quân” bên phải.'), [], 'produce')) return;
    if (H('power', 2, 150, () => T.cmd >= 3 && this.idle('power', 200), tr('Накопились командные очки — вкладка «Командование»: разведка, артудар, капсула с отрядом, орбитальный удар.', 'Command points are piling up — "Command" tab: recon, artillery, squad drop pod, orbital strike.', 'Điểm chỉ huy đang dồn lại — thẻ “Chỉ huy”: trinh sát, pháo kích, khoang thả đội, oanh kích quỹ đạo.'), [], 'power')) return;
    if (H('build', 1, 0, () => t > 40 && this.never('build'), tr('Вкладка «Здания»: турели, ПВО, заводы. Форпост ставится у своей точки — это вторая база.', '"Build" tab: turrets, anti-air, factories. An outpost goes next to an owned point — a second base.', 'Thẻ “Xây”: tháp súng, phòng không, nhà máy. Tiền đồn đặt cạnh điểm đã chiếm — như căn cứ thứ hai.'), [], 'build')) return;
    if (H('ctl', 1, 0, () => t > 60 && this.never('ctlgroup'), tr('Ctrl+1…9 — запомнить группу, 1…9 — выбрать её, двойное нажатие — камера к ней.', 'Ctrl+1…9 — save a group, 1…9 — select it, double-tap — jump the camera.', 'Ctrl+1…9 — lưu nhóm, 1…9 — chọn nhóm, nhấn đúp — đưa camera tới.'), ['Ctrl', '1…9'], 'ctlgroup')) return;
    if (H('possess', 1, 0, () => t > 25 && this.never('possess'), tr('Двойной клик по своему юниту — вселиться в него и воевать самому.', 'Double-click your unit to possess it and fight yourself.', 'Nhấp đúp vào đơn vị của bạn để nhập vai và tự chiến đấu.'), [], 'possess')) return;
    if (H('rally', 1, 0, () => S.selB && S.selB.team === 0 && (S.selB.cls === 'hq' || ['outpost', 'factory', 'hub', 'airdock'].includes(S.selB.type)), tr('ПКМ по земле — точка сбора для новых войск этого здания.', 'RMB on the ground — rally point for this building\'s new troops.', 'Chuột phải xuống đất — điểm tập kết cho quân mới của công trình này.'), [tr('ПКМ', 'RMB', 'Chuột phải')], 'rally')) return;
    if (H('rush', 1, 0, () => t > 45 && this.never('rush') && sel.length, tr('ПКМ — идти с боем: отряды по пути занимают укрытия и отстреливаются. Двойной ПКМ — бегом, не ввязываясь.', 'RMB — advance while fighting: squads take cover and return fire on the way. Double RMB — run without engaging.', 'Chuột phải — vừa tiến vừa đánh: các đội nấp sau vật che và bắn trả. Nhấp đúp chuột phải — chạy, không giao chiến.'), [tr('ПКМ', 'RMB', 'Chuột phải')], 'rush')) return;
    if (H('camera', 1, 0, () => t > 15, tr('Камера: WASD и края экрана, Q/E — поворот, колесо — высота, Пробел — к последней тревоге.', 'Camera: WASD and screen edges, Q/E rotate, wheel zoom, Space — jump to the latest alert.', 'Camera: WASD và mép màn hình, Q/E xoay, con lăn phóng to, Space — tới cảnh báo gần nhất.'), [], null)) return;
  },
};
