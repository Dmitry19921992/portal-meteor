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
      { text: tr(`${bk('switch')} — быстрая смена бойца, не выходя из боя: прыжок в отряд или танк ближе всего к схватке. Попробуй.`, `${bk('switch')} — quick unit switch without leaving the battle: jump into the squad or tank closest to the fight. Try it.`, `${bk('switch')} — đổi nhanh mà không rời trận: nhập vào đội hoặc xe tăng gần trận đánh nhất. Thử đi.`),
        kbd: [bk('switch')], check: () => used('switch') },
      { text: tr('Рядом с танком или турелью нажми E, чтобы управлять ими. Или просто иди дальше.', 'Next to a tank or turret press E to take control. Or just carry on.', 'Cạnh xe tăng hoặc tháp súng, nhấn E để điều khiển. Hoặc cứ tiếp tục.'),
        kbd: [bk('interact')], time: 8 },
      { text: TOUCH.on ? tr('Теперь стратегия. Нажми «◩ Стратегия» справа вверху — вид сверху на поле боя.', 'Now strategy. Tap "◩ Strategy" at the top right — a top view of the battlefield.', 'Giờ là chiến thuật. Nhấn “◩ Chiến thuật” góc trên — nhìn chiến trường từ trên cao.')
          : tr(`Теперь стратегия. Нажми ${bk('rts')} (или «◩ Стратегия» слева вверху) — вид сверху на поле боя.`, `Now strategy. Press ${bk('rts')} (or "◩ Strategy" at the top left) — a top view of the battlefield.`, `Giờ là chiến thuật. Nhấn ${bk('rts')} — nhìn chiến trường từ trên cao.`),
        kbd: TOUCH.on ? [] : [bk('rts')], check: () => S.mode === 'rts' },
      // v6.4: стратегию дальше ведёт Куратор (curator.js) — подсказки по состоянию боя
      { text: tr('В стратегии тебе помогает Куратор: окно сверху говорит, что сделать, рамка показывает кнопку, кольцо — место на карте. Выполни три его совета.', 'In strategy the Curator helps you: the box at the top says what to do, a frame shows the button, a ring marks the spot on the map. Complete three of its tips.', 'Trong chiến thuật, Người hướng dẫn giúp bạn: khung phía trên nói việc cần làm, khung sáng chỉ nút, vòng tròn đánh dấu vị trí. Hoàn thành ba gợi ý.'),
        kbd: [], init: () => { if (typeof CUR !== 'undefined' && !CUR.enabled()) CUR.toggle(true); this.ref = typeof CUR !== 'undefined' ? CUR.doneN : 0; },
        check: () => S.mode === 'rts' && typeof CUR !== 'undefined' && CUR.doneN - this.ref >= 3, skipAfter: 150 },
      { text: TOUCH.on ? tr('Выдели отряд и нажми зелёную кнопку «▶ Вселиться» — снова в бой за этого бойца. Пока ты стреляешь, ИИ-стратег командует армией сам.', 'Select a squad and tap the green "▶ Possess" button — back into battle as that trooper. While you shoot, the AI strategist runs the army.', 'Chọn một đội và nhấn nút xanh “▶ Nhập vai” — trở lại trận. Khi bạn bắn, chiến lược gia AI tự chỉ huy quân đội.')
          : tr(`Выдели отряд и нажми ${bk('rts')} или зелёную «▶ Вселиться» — снова в бой за этого бойца (без выделения — к своему). Пока ты стреляешь, ИИ-стратег командует армией сам.`, `Select a squad and press ${bk('rts')} or the green "▶ Possess" — back into battle as that trooper (nothing selected — your own). While you shoot, the AI strategist runs the army.`, `Chọn một đội và nhấn ${bk('rts')} hoặc “▶ Nhập vai” — trở lại trận. Khi bạn bắn, chiến lược gia AI tự chỉ huy quân đội.`),
        kbd: TOUCH.on ? [] : [bk('rts')], check: () => S.mode === 'fps' },
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
