// =====================================================================
//  ОБУЧЕНИЕ: пошаговое знакомство с шутером и стратегией.
//  Рой в обучении не нападает — только строит базу. После последнего шага
//  начинается обычный бой.
// =====================================================================
const TUT = {
  on: false, i: 0, t0: 0, ref: null, done: false, sig: '',
  steps(){
    const me = () => ctrlEntity();
    const used = a => HINTS.use[a] !== undefined && HINTS.use[a] > this.t0;
    return [
      { text: tr('Добро пожаловать на метеорит! Ты — боевой робот Консорциума. Осмотрись мышью и иди: WASD.', 'Welcome to the meteor! You are a Consortium combat robot. Look around with the mouse and walk with WASD.', 'Chào mừng tới thiên thạch! Bạn là robot chiến đấu của Liên hiệp. Nhìn quanh bằng chuột và đi bằng WASD.'),
        kbd: ['W', 'A', 'S', 'D'], init: () => { this.ref = me() ? me().pos : null; }, check: () => me() && this.ref && dist(me().pos, this.ref) > 12 },
      { text: tr('Ранец: нажми Shift — прыжок, держи Shift — полёт. Энергия восстанавливается на земле.', 'Jetpack: tap Shift to hop, hold Shift to fly. Energy recharges on the ground.', 'Ba lô phản lực: nhấn Shift để nhảy, giữ Shift để bay. Năng lượng hồi khi đứng trên mặt đất.'),
        kbd: [bk('run')], check: () => used('jet') || (me() && me().cls === 'inf' && me().airT > 0.9) },
      { text: tr('Стреляй — ЛКМ. Прицел — ПКМ: точнее и с приближением. Сделай несколько выстрелов.', 'Fire — LMB. Aim — RMB: more accurate, with zoom. Fire a few shots.', 'Bắn — chuột trái. Ngắm — chuột phải: chính xác hơn và phóng to. Bắn vài phát.'),
        kbd: [tr('ЛКМ', 'LMB', 'Chuột trái'), tr('ПКМ', 'RMB', 'Chuột phải')], init: () => { this.ref = S.kit ? S.kit.mag.rifle : 32; }, check: () => S.kit && (S.kit.mag.rifle <= this.ref - 6 || S.kit.reloadT > 0) },
      { text: tr('Перезарядка — R. Пули сильнее всего бьют на средней дистанции, 20–50 метров.', 'Reload — R. Bullets hit hardest at medium range, 20–50 meters.', 'Nạp đạn — R. Đạn mạnh nhất ở tầm trung, 20–50 mét.'),
        kbd: [bk('reload')], check: () => S.kit && S.kit.reloadT > 0 },
      { text: tr('Ракета — Q. Против танков и зданий. Выпусти ракету.', 'Rocket — Q. For tanks and buildings. Fire a rocket.', 'Tên lửa — Q. Dùng cho xe tăng và công trình. Phóng một tên lửa.'),
        kbd: [bk('rocket')], check: () => used('rocket') },
      { text: tr('Наверху — задача от стратега. Беги по зелёным стрелкам: на маршруте у тебя спринт. Захвати точку — стой рядом с маяком.', 'At the top is the strategist\'s order. Run along the green arrows: you sprint on the route. Capture the point — stay near the beacon.', 'Ở trên là lệnh của chiến lược gia. Chạy theo mũi tên xanh: trên tuyến bạn chạy nước rút. Chiếm điểm — đứng gần cột đèn.'),
        kbd: [], target: () => { const c = me(); if (!c) return null; let b = null, bd = 1e9; for (const cp of S.cps) if (!cp.core && cp.owner !== 0){ const d = dist(cp.pos, c.pos); if (d < bd){ bd = d; b = cp; } } return b ? b.beacon : null; },
        check: () => { const c = me(); return c && S.cps.some(cp => !cp.core && cp.owner === 0 && dist(cp.pos, c.pos) < 40); } },
      { text: tr('Твой отряд прикрывает тебя: слева их портреты и здоровье. Если отряд отстаёт — бойцы попросят подождать.', 'Your squad has your back: their portraits and health are on the left. If they fall behind, they will ask you to wait.', 'Đội của bạn yểm trợ bạn: chân dung và máu của họ ở bên trái. Nếu bị tụt lại, họ sẽ nhờ bạn chờ.'),
        kbd: [], time: 7 },
      { text: tr('X — мгновенно вселиться в другой отряд или танк, ближе всего к бою. Попробуй.', 'X — instantly jump into another squad or tank, closest to the fight. Try it.', 'X — nhập ngay vào đội hoặc xe tăng khác, gần trận đánh nhất. Thử đi.'),
        kbd: [bk('switch')], check: () => used('switch') },
      { text: tr('Рядом с танком или турелью нажми E, чтобы управлять ими. Или просто иди дальше.', 'Next to a tank or turret press E to take control. Or just carry on.', 'Cạnh xe tăng hoặc tháp súng, nhấn E để điều khiển. Hoặc cứ tiếp tục.'),
        kbd: [bk('interact')], time: 8 },
      { text: tr('Теперь стратегия. Нажми Tab — вид сверху на поле боя.', 'Now strategy. Press Tab — a top view of the battlefield.', 'Giờ là chiến thuật. Nhấn Tab — nhìn chiến trường từ trên cao.'),
        kbd: [bk('rts')], check: () => S.mode === 'rts' },
      { text: tr('Камера: WASD или края экрана, колесо — высота, Q/E — поворот. Отлети в сторону.', 'Camera: WASD or screen edges, wheel — height, Q/E — rotate. Move away a bit.', 'Camera: WASD hoặc mép màn hình, con lăn — độ cao, Q/E — xoay. Di chuyển ra xa một chút.'),
        kbd: ['W', 'A', 'S', 'D'], init: () => { this.ref = S.rts.dir.slice(); }, check: () => S.mode === 'rts' && surfDist(S.rts.dir, this.ref) > 40 },
      { text: tr('ЛКМ — выделить отряд (или рамкой — несколько). Выдели кого-нибудь из своих.', 'LMB — select a squad (or drag a box for several). Select some of your troops.', 'Chuột trái — chọn đội (hoặc kéo khung để chọn nhiều). Chọn vài đơn vị của bạn.'),
        kbd: [tr('ЛКМ', 'LMB', 'Chuột trái')], check: () => S.mode === 'rts' && S.sel.size > 0 },
      { text: tr('ПКМ по земле — идти с боем. По врагу — атаковать. Двойной ПКМ — бегом. Отдай приказ.', 'RMB on the ground — attack-move. On an enemy — attack. Double RMB — run. Give an order.', 'Chuột phải xuống đất — vừa đi vừa đánh. Lên địch — tấn công. Nhấp đúp — chạy. Ra lệnh đi.'),
        kbd: [tr('ПКМ', 'RMB', 'Chuột phải')], check: () => groupsOf(0).some(g => g.manualUntil > S.time && g.manualUntil < 1e8) },
      { text: tr('Здания строят инженеры. Нажми «.» — выделится инженер, затем Z (Турель) и кликни место на базе. Инженер сам дойдёт и построит.', 'Builders construct buildings. Press "." to select a builder, then Z (Turret) and click a spot on your base. The builder walks there and builds it.', 'Kỹ sư xây công trình. Nhấn “.” để chọn kỹ sư, rồi Z (Tháp súng) và nhấp chỗ trên căn cứ.'),
        kbd: [], init: () => { this.ref = S.buildings.filter(b => b.team === 0 && b.type === 'turret').length; }, check: () => S.buildings.filter(b => b.team === 0 && b.type === 'turret').length > this.ref, skipAfter: 90 },
      { text: tr('Вкладка «Войска» — закажи штурмовой отряд. Новые войска слушаются тебя, пока ты в стратегии.', '"Units" tab — order an assault squad. New troops obey you while you are in strategy.', 'Thẻ “Quân” — gọi một đội xung kích. Quân mới nghe lệnh bạn khi bạn ở chế độ chiến thuật.'),
        kbd: [], check: () => used('produce'), skipAfter: 60 },
      { text: tr('Enter или Tab — обратно в бой. Пока ты стреляешь, ИИ-стратег командует армией сам.', 'Enter or Tab — back to battle. While you shoot, the AI strategist runs the army.', 'Enter hoặc Tab — trở lại trận. Khi bạn bắn, chiến lược gia AI tự chỉ huy quân đội.'),
        kbd: ['Enter'], check: () => S.mode === 'fps' },
      { text: tr('Обучение пройдено! Рой начинает наступление. Удачи, боец!', 'Training complete! The Swarm is launching its offensive. Good luck, trooper!', 'Hoàn thành huấn luyện! Bầy Đàn bắt đầu tấn công. Chúc may mắn, chiến binh!'),
        kbd: [], time: 6, final: true },
    ];
  },
  start(){
    this.on = true; this.i = 0; this.done = false; this.enter();
  },
  enter(){
    const st = this.steps()[this.i]; if (!st) return;
    this.t0 = S.rtime; this.sig = '';
    if (st.init) st.init();
    if (SET.hintsVoice !== false) AU.speak(st.text, 'hint');
  },
  step(dt){
    if (!this.on || S.paused) return;
    const L = this.steps(), st = L[this.i];
    if (!st){ this.finish(); return; }
    const age = S.rtime - this.t0;
    const ok = st.check ? (age > 1.2 && st.check()) : age > (st.time || 6);
    if (ok || (st.skipAfter && age > st.skipAfter)){
      emit('objdone', {});
      if (st.final){ this.finish(); return; }
      this.i++; this.enter();
    }
  },
  finish(){
    this.on = false; this.done = true;
    const T = S.teams[1]; T.waveT = 60; T.skyT = 200; T.podT = 120;
    $('tut').style.display = 'none';
  },
  render(){
    const el = $('tut');
    if (!this.on || MENU.isOpen()){ el.style.display = 'none'; return; }
    const L = this.steps(), st = L[this.i]; if (!st) return;
    el.style.display = 'block';
    const h = `<small>${tr('ОБУЧЕНИЕ', 'TRAINING', 'HUẤN LUYỆN')} · ${this.i + 1} / ${L.length}</small><p>${st.kbd.map(k => `<kbd>${k}</kbd>`).join(' ')} ${st.text}</p><div class="dots">${L.map((_, j) => `<i class="${j < this.i ? 'ok' : j === this.i ? 'cur' : ''}"></i>`).join('')}</div>` +
      (st.skipAfter ? `<em>${tr('можно пропустить через', 'skippable in', 'có thể bỏ qua sau')} ${max(0, Math.ceil(st.skipAfter - (S.rtime - this.t0)))} ${tr('с', 's', 'giây')}</em>` : '');
    if (h !== this.sig){ this.sig = h; el.innerHTML = h; }
  },
  overlay(){
    if (!this.on || S.mode !== 'fps') return;
    const st = this.steps()[this.i];
    if (st && st.target){ const p = st.target(); const c = ctrlEntity(); if (p && c) edgeMarker(p, '#9cf', tr('СЮДА', 'HERE', 'ĐẾN ĐÂY'), `${Math.round(dist(p, c.pos))} ${tr('м', 'm', 'm')}`); }
  },
};
