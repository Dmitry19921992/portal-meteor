// =====================================================================
//  v7.8.1 — hotfix: phone / tablet UX + PC menu.
//  • ☰ in a corner (phone: top right; PC: «☰ Меню» top right, or Esc) → pause menu: Resume / Restart / Training / Graphics /
//    Settings / Main menu, destructive actions confirmed. Phone battle actions sheet → «⚡ Действия» tile in the pause menu.
//  • No auto-Dendy: normal graphics unless the player picks Dendy (switch in main + pause menu). Very low FPS → closable tip.
//  • Phone strategy: long-press (~0.35 s, haptic + ring) then drag = selection box; swipe = camera; finger jitter tolerated.
//  • Touch: context «✋» interaction button (Взять / Сесть / Строить / Слезть / Болт …) at the right thumb only when something
//    is in reach; tapping the highlighted object works too. Bigger hit areas; strategy panels hidden under menus.
//  Loaded last before main.js (after v78.js). Separate file so feature branches do not conflict on it.
// =====================================================================
const V781_NEWS = [
  ['☰ в углу — меню паузы: «Продолжить», «Начать заново», «Обучение», «Графика», «Настройки», «Главное меню» (с подтверждением). Телефон: ☰ вверху справа (действия боя — плитка «⚡ Действия»); ПК: кнопка «☰ Меню» вверху справа или Esc.',
   '☰ in the corner opens the pause menu: Resume, Restart, Training, Graphics, Settings, Main menu (with confirmation). Phone: ☰ at the top right (battle actions — the "⚡ Actions" tile); PC: the "☰ Menu" button at the top right or Esc.',
   '☰ ở góc mở menu tạm dừng: Tiếp tục, Chơi lại, Huấn luyện, Đồ họa, Cài đặt, Menu chính (có xác nhận). PC: nút “☰ Menu” góc trên phải hoặc Esc.'],
  ['Графика по умолчанию всегда обычная — «Денди» только по твоему выбору: переключатель «Графика: Обычная / Денди (8-бит) / 16-бит» прямо в главном меню и в паузе. Если игра сильно тормозит — подсказка с кнопкой «Включить Денди».',
   'Graphics are always normal by default — Dendy only if you pick it: the "Graphics: Normal / Dendy (8-bit) / 16-bit" switch is right in the main menu and the pause menu. If the game lags badly, a tip with a "Turn on Dendy" button appears.',
   'Đồ họa mặc định luôn bình thường — Dendy chỉ khi bạn chọn: công tắc “Đồ họa” trong menu chính và menu tạm dừng.'],
  ['Телефон и планшет: кнопка действия «✋» справа появляется, только когда рядом есть что сделать — «Взять» (тайник, ящик), «Сесть» (техника, турель, пушка), «Строить», «Слезть», «Болт» у аномалии. Можно и просто тапнуть по подсвеченному предмету.',
   'Phone and tablet: the "✋" action button on the right appears only when there is something to do nearby — "Take" (cache, crate), "Board" (vehicle, turret, gun), "Build", "Get off", "Bolt" at an anomaly. You can also just tap the highlighted object.',
   'Điện thoại và máy tính bảng: nút “✋” bên phải chỉ hiện khi có việc để làm gần đó — Lấy, Lên xe, Xây, Xuống, Bu lông. Có thể chạm thẳng vào vật được đánh dấu.'],
  ['Телефон, стратегия: держи палец ~0,3 с (телефон дрогнет, появится жёлтое кольцо) и веди — рамка выделения; обычный свайп — камера. Есть и кнопка «Рамка» справа; в обучении шаг «Рамка» засчитывает и выбор отряда тапом.',
   'Phone, strategy: hold a finger ~0.3 s (the phone buzzes, a yellow ring appears) and drag — a selection box; a normal swipe moves the camera. There is also the "Box" button on the right; in the training the "Box" step also accepts tapping a squad.',
   'Điện thoại, chiến thuật: giữ ngón ~0,3 giây (rung, vòng vàng) rồi kéo — khung chọn; vuốt thường — camera.'],
  ['Телефон: мелкие кнопки стало легче нажимать, список поддержки 📡 крупнее, панели стратегии не налезают на паузу и итоги. Версия v7.8 осталась в меню «🕘 Версия игры».',
   'Phone: tiny buttons are easier to hit, the 📡 support list is bigger, strategy panels no longer cover the pause and results screens. v7.8 stays in the "🕘 Game version" menu.',
   'Điện thoại: nút nhỏ dễ bấm hơn, danh sách 📡 lớn hơn. v7.8 vẫn có trong menu “🕘 Phiên bản”.'],
];
if (typeof STATS75 !== 'undefined') STATS75.ver = '7.8.1';
if (typeof VER75 !== 'undefined'){
  VER75.cur = 'v7_8_1';
  VER75.L = VER75.L.filter(o => o.id !== 'v7_6').map(o => o.id === 'v7_8' ? Object.assign({}, o, { tag: undefined }) : o);
  VER75.L.unshift({ id: 'v7_8_1', v: 'v7.8.1', d: '25.10.2026', mb: 6.9, tag: 'new', n: ['Меню ☰ на телефоне и ПК, графика без авто-Денди, кнопка «✋» на телефоне, рамка выделения', '☰ menu on phone and PC, no auto-Dendy, "✋" button on touch, box selection on phone'] });
}
const V781 = {
  err: 0, HOLD: 350, DZ: 22, conf: null, tipDone: false, fm: null, use: null, useT: 0,
  safe(fn, tag){ try { return fn(); } catch (e){ if (this.err++ < 4) console.warn('v781 ' + tag, e); } },
  ph(){ return typeof P71M !== 'undefined' && P71M.on && P71M.on(); },
  m73(){ return typeof M73 !== 'undefined' && M73.act(); },
  inTut(){ return typeof T72 !== 'undefined' && T72.on; },
  L(ru, en, vi){ return tr(ru, en, vi || en); },
  // ---------------------------------------------------------------- graphics (no auto-Dendy)
  gNames(){ return [this.L('Обычная', 'Normal', 'Thường'), this.L('Денди (8-бит)', 'Dendy (8-bit)', 'Dendy (8-bit)'), this.L('16-бит', '16-bit', '16-bit')]; },
  gSet(v){
    SET.denStyle = v | 0; SET.denUser = true; SET.denAuto = 0;
    applySettings(); MENU.save();
    if (typeof DEN75 !== 'undefined' && DEN75.noticeClose) DEN75.noticeClose();
    this.tipClose();
  },
  gCycle(){ this.gSet(((SET.denStyle | 0) + 1) % 3); },
  gRowPC(){
    const N = this.gNames(), cur = SET.denStyle | 0;
    return `<div class="diffrow g781"><span>🎨 ${this.L('Графика', 'Graphics', 'Đồ họa')}:</span>${N.map((n, i) => `<button class="${cur === i ? 'cur' : ''}" data-ch="denStyle" data-v="${i}">${n}</button>`).join('')}</div>`;
  },
  gPill(){ return `<button class="p71hb g781p" data-g781="1"><b>🎨</b><span>${this.L('Графика', 'Graphics', 'Đồ họa')}: <em>${this.gNames()[SET.denStyle | 0]}</em></span></button>`; },
  gTile(){ return P71M.tile('data-g781="1"', 'image', this.L('Графика', 'Graphics', 'Đồ họa'), this.gNames()[SET.denStyle | 0]); },
  tipShow(){
    if (this.tipDone || document.getElementById('g781tip')) return;
    this.tipDone = true;
    const el = document.createElement('div'); el.id = 'g781tip';
    el.innerHTML = `<span>${this.L('Тормозит? Включи Денди-графику — она легче.', 'Lagging? Try the Dendy graphics — they are lighter.', 'Bị giật? Bật đồ họa Dendy — nhẹ hơn.')}</span><button data-g781t="on">${this.L('Включить Денди', 'Turn on Dendy', 'Bật Dendy')}</button><button data-g781t="x">✕</button>`;
    const go = e => { const b = e.target.closest('[data-g781t]'); e.stopPropagation(); if (!b) return; e.preventDefault(); if (b.dataset.g781t === 'on') this.gSet(1); else this.tipClose(); };
    el.addEventListener('click', go, true); el.addEventListener('touchend', go, { capture: true, passive: false });
    for (const ev of ['mousedown', 'pointerdown', 'touchstart']) el.addEventListener(ev, e => e.stopPropagation(), { capture: true, passive: true });
    document.body.appendChild(el);
    clearTimeout(this.tipT); this.tipT = setTimeout(() => this.tipClose(), 25000);
  },
  tipClose(){ const el = document.getElementById('g781tip'); if (el) el.remove(); },
  // ---------------------------------------------------------------- pause actions
  openMenu(){ if (typeof M67 !== 'undefined' && M67.open) M67.toggleSheet(false); if (!MENU.isOpen() && !S.attract && !(typeof OPER !== 'undefined' && OPER.on)) MENU.pause(); },
  ask(kind){ this.conf = kind; MENU.show('c781', true); },
  confirmed(){
    const k = this.conf; this.conf = null;
    if (k === 'restart'){ if (this.inTut()) T72.start(T72.id); else MENU.newGame(); }
    else if (k === 'menu'){ if (this.inTut()) T72.stop(); MENU.toMenu(); }
  },
  actions(){ MENU.resume(); if (typeof M67 !== 'undefined') setTimeout(() => this.safe(() => M67.toggleSheet(true), 'sheet'), 60); },
  // ---------------------------------------------------------------- touch: context interaction button «✋»
  useOf(c){
    if (!c || S.mode !== 'fps' || S.attract) return null;
    const h = nearbyInteract(c), L = (r, e, v) => this.L(r, e, v);
    if (!h) return c.cls !== 'inf' ? { t: L('Выйти', 'Exit', 'Ra'), ic: '⏏' } : null;
    let t = L('Действие', 'Use', 'Dùng'), p = null, ic = '✋';
    if (h.unseat){ t = L('Слезть', 'Get off', 'Xuống'); ic = '⤓'; }
    else if (h.seat){ t = L('За пушку', 'Man gun', 'Ngồi súng'); p = h.seat.pos; }
    else if (h.v){ t = L('Сесть', 'Board', 'Lên xe'); p = h.v.pos; }
    else if (h.b && !h.field75){ t = L('Сесть', 'Man it', 'Vào'); p = typeof gunPos === 'function' ? gunPos(h.b) : h.b.pos; }
    else if (h.field75 === 'build'){ t = L('Строить', 'Build', 'Xây'); p = h.b && h.b.pos; }
    else if (h.field75 === 'stop'){ t = L('Стоп', 'Stop', 'Dừng'); ic = '■'; }
    else if (h.field75 === 'cache'){ t = L('Взять', 'Take', 'Lấy'); p = h.p && h.p.pos; }
    else if (h.s78){ t = L('Взять', 'Take', 'Lấy'); p = h.s78.pos; }
    else if (h.a78){ t = L('Болт', 'Bolt', 'Bu lông'); p = h.a78.pos; }
    return { t, ic, p };
  },
  useBtn(){
    let b = document.getElementById('i781'); if (b) return b;
    b = document.createElement('button'); b.id = 'i781';
    const go = e => { e.preventDefault(); e.stopPropagation(); AU.init(); b.classList.add('dn'); setTimeout(() => b.classList.remove('dn'), 140); TOUCH.key(SET.bind.interact); this.useT = 0; if (typeof M71 !== 'undefined') M71.haptic(12); };
    b.addEventListener('touchstart', go, { passive: false });
    b.addEventListener('click', e => { e.stopPropagation(); if (!e.isTrusted || e.detail === 0) go(e); });
    document.body.appendChild(b);
    return b;
  },
  useStep(dt){
    const on = TOUCH.on && typeof M71 !== 'undefined' && M71.active();
    document.body.classList.toggle('i781on', !!on);
    if (!on) return;
    this.useT -= dt; if (this.useT > 0) return; this.useT = 0.12;
    const show = S.mode === 'fps' && !S.attract && !S.over && !MENU.isOpen() && !(typeof M74 !== 'undefined' && M74.nohud) && !(typeof CAMFX !== 'undefined' && CAMFX.busy());
    const u = show ? this.safe(() => this.useOf(ctrlEntity()), 'use') : null;
    const b = this.useBtn(), was = this.use;
    this.use = u || null;
    if (!u){ if (b.style.display !== 'none') b.style.display = 'none'; return; }
    const h = `<i>${u.ic}</i><small>${uixEsc(u.t)}</small>`;
    if (b._h !== h){ b._h = h; b.innerHTML = h; }
    if (b.style.display !== 'flex'){ b.style.display = 'flex'; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); if (!was && typeof M71 !== 'undefined') M71.haptic(8); }
  },
  // tap right on the highlighted object = the same action
  tapUse(x, y){
    const u = this.use; if (!u || !u.p || !S.cam) return false;
    const s = project(u.p); if (!s || (s.length > 2 && s[2] <= 0)) return false;
    if (hypot(s[0] - x, s[1] - y) > max(64, innerHeight * 0.12)) return false;
    TOUCH.key(SET.bind.interact); if (typeof M71 !== 'undefined') M71.haptic(12); this.useT = 0;
    return true;
  },
  drawUse(){
    const u = this.use; if (!u || !u.p || !S.cam || MENU.isOpen() || S.mode !== 'fps') return;
    const s = project(u.p); if (!s || (s.length > 2 && s[2] <= 0) || s[0] < 20 || s[0] > innerWidth - 20 || s[1] < 20 || s[1] > innerHeight - 20) return;
    const t = performance.now() / 1000, r = 18 + 3 * Math.sin(t * 5);
    octx.save(); octx.strokeStyle = 'rgba(143,255,170,.9)'; octx.lineWidth = 2.5; octx.setLineDash([6, 5]); octx.lineDashOffset = -t * 20;
    octx.beginPath(); octx.arc(s[0], s[1], r, 0, 6.2832); octx.stroke(); octx.setLineDash([]);
    octx.font = '700 12px "Exo 2", sans-serif'; octx.textAlign = 'center'; octx.fillStyle = '#8fffaa'; octx.shadowColor = '#000'; octx.shadowBlur = 4;
    octx.fillText('✋ ' + u.t, s[0], s[1] - r - 6); octx.restore();
  },
  // phone texts: «⏏ Войти» → ✋, «☰ → ⇲» → «☰ → ⚡ → ⇲» (battle actions moved under ⚡ in the pause menu)
  tt(s){
    if (typeof s !== 'string' || !TOUCH.on) return s;
    return s.replace(/☰ → ([⇲⤓])/g, '☰ → ⚡ → $1').replace(/☰ ← /g, '☰ ← ⚡ ← ')
      .replace(/Кнопка «Войти»/g, 'Кнопка действия справа').replace(/The "Enter" button/g, 'The action button on the right')
      .replace(/⏏ «Войти»/g, '✋').replace(/⏏ "Enter"/g, '✋').replace(/[⏏⇥]/g, '✋');
  },
  // ---------------------------------------------------------------- per-frame
  frame(dt){
    document.body.classList.toggle('mo781', MENU.isOpen());
    const pc = document.getElementById('m781');
    if (pc){ const v = !TOUCH.on && !MENU.isOpen() && !S.attract && !(typeof OPER !== 'undefined' && OPER.on) && !(typeof T72 !== 'undefined' && T72.fin); pc.style.display = v ? 'flex' : 'none'; }
    this.useStep(dt);
  },
};
// =====================================================================
//  WIRING
// =====================================================================
// ---- 1. graphics: no auto-Dendy; old auto choices reset; low FPS → tip
{ const ld0 = MENU.load;
  MENU.load = function(){
    const r = ld0.apply(this, arguments);
    if (!SET.denUser && (SET.denStyle || SET.denAuto)){ SET.denStyle = 0; SET.denRows = 0; SET.denAuto = 0; try { localStorage.setItem('pm_settings', JSON.stringify(SET)); } catch (e){} }
    return r;
  }; }
if (typeof DEN75 !== 'undefined'){
  DEN75.autoSet = function(){};   // never switch by itself
  DEN75.autoFps = function(f){
    if (S.attract || S.paused || MENU.cur || document.visibilityState !== 'visible' || V781.tipDone || (SET.denStyle | 0) > 0 || V781.inTut()){ this.am781 = null; return; }
    const m = this.am781 || (this.am781 = { n: 0, f: 0, skip: 3 });
    if (m.skip > 0){ m.skip--; return; }   // the first seconds of a match are always slow (shaders, models)
    m.n++; m.f += f;
    if (m.n < 12) return;
    const avg = m.f / m.n; m.n = 0; m.f = 0;
    if (avg < 17) V781.tipShow();
  };
}
// ---- 2. version label, news, title
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.apply(this, arguments);
    h = h.replace(/(id="m_ver75"[\s\S]*?<small[^>]*>)v7\.8 · [^<]*(<\/small>)/, (m, a, b) => a + 'v7.8.1 · ' + tr('и старые: v7.8, v7.7, вехи v1–v7.0', 'and older: v7.8, v7.7, milestones v1–v7.0', 'và bản cũ', 'וגרסאות ישנות') + b);
    h = h.replace(/v7\.8 · /g, 'v7.8.1 · ');
    const m = h.match(/<h3>[^<]*v7\.8<\/h3>/);
    const news = `<h3>${tr('Новое в v7.8.1', 'New in v7.8.1', 'Mới trong v7.8.1', 'חדש ב-v7.8.1')}</h3><ul>${V781_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    if (!V781.ph()) h = h.replace(/(<button id="m_saves")/, V781.gRowPC() + '$1');
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.apply(this, arguments); document.title = 'Portal Meteor — v7.8.1'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){
      return pm0.apply(this, arguments).replace(/v7\.8 · /g, 'v7.8.1 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.8/, '$1v7.8.1')
        .replace(/(id="m_ver75"[\s\S]*?<small>)v7\.8(<\/small>)/, '$1v7.8.1$2')
        .replace(/<div class="p71hd"><i><\/i>/, '<div class="p71hd">' + V781.gPill());
    };
    P71M.news = function(){
      const all = V781_NEWS.concat(typeof V78_NEWS !== 'undefined' ? V78_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.8.1', 'NEW IN v7.8.1', 'MỚI TRONG v7.8.1', 'חדש ב-v7.8.1'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}
// ---- 3. pause menu (PC + phone) and confirmation screen
MENU.html_c781 = function(){
  const k = V781.conf, L = (r, e, v) => V781.L(r, e, v), tut = V781.inTut();
  const q = k === 'restart' ? L('Начать заново?', 'Restart?', 'Chơi lại?') : L('Выйти в главное меню?', 'Quit to the main menu?', 'Thoát ra menu chính?');
  const sub = tut ? L('Обучение начнётся с первого шага.', 'The training starts from step one.', 'Bài học bắt đầu lại.') : k === 'restart' ? L('Текущий бой закончится, начнётся новый матч с теми же настройками.', 'The current battle ends and a new match starts with the same settings.', 'Trận hiện tại kết thúc.') : '';
  return `<div class="mcol c781"><h2>${q}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}<button id="m_c781ok" class="big">${k === 'restart' ? '⟲ ' + L('Да, заново', 'Yes, restart', 'Có, chơi lại') : L('Да, выйти', 'Yes, quit', 'Có, thoát')}</button><button id="m_back">${L('Нет, вернуться', 'No, go back', 'Không, quay lại')}</button></div>`;
};
{ const hp0 = MENU.html_pause;
  MENU.html_pause = function(){
    let h = hp0.apply(this, arguments);
    if (V781.ph()){
      const L = (r, e, v) => V781.L(r, e, v);
      const add = P71M.tile('id="m_a781"', 'skills', L('Действия боя', 'Battle actions', 'Hành động'), L('рывок, переброска…', 'dash, redeploy…', 'lướt, tái triển khai…')) + P71M.tile('id="m_t781"', 'school', L('Обучение', 'Training', 'Huấn luyện')) + V781.gTile();
      h = h.replace(/(<button id="m_save"[^>]*>[\s\S]*?<\/button>)/, '$1' + add);
      h = h.replace(/(id="m_restart"[^>]*>[\s\S]*?<b>)[^<]*(<\/b>)/, '$1' + L('Начать заново', 'Restart', 'Chơi lại') + '$2');
      return h;
    }
    const L = (r, e, v) => V781.L(r, e, v);
    h = h.replace(/<button id="m_restart"[^>]*>[^<]*<\/button>/, '').replace(/<button id="m_menu"[^>]*>[^<]*<\/button>/, '');
    const top = `<div class="diffrow p781">${MENU.btn('restart', '⟲ ' + L('Начать заново', 'Restart', 'Chơi lại'))}${MENU.btn('menu', '⌂ ' + L('Главное меню', 'Main menu', 'Menu chính'))}</div>` + V781.gRowPC() +
      `<div class="diffrow g781 t781"><span>🎓 ${L('Обучение', 'Training', 'Huấn luyện')}:</span><button data-t781="fps">${L('Шутер', 'Shooter', 'Bắn súng')}</button><button data-t781="rts">${L('Стратегия', 'Strategy', 'Chiến thuật')}</button><button data-t781="cmd" class="dis" title="${L('Режима «Командир» в игре ещё нет', 'The Commander mode is not in the game yet', 'Chưa có')}">${L('Командир · скоро', 'Commander · soon', 'Chỉ huy · sắp có')}</button></div>`;
    return h.replace(/(<button id="m_resume"[^>]*>[^<]*<\/button>)/, '$1' + top);
  }; }
{ const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.apply(this, arguments);
    const el = $('screen'); if (!el) return;
    const on = (id, fn) => { const b = $('m_' + id); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
    el.querySelectorAll('[data-g781]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); V781.gCycle(); MENU.show(MENU.cur); });
    if (name === 'pause'){
      on('restart', () => V781.ask('restart'));
      if (V781.inTut()) on('menu', () => V781.ask('menu'));
      on('a781', () => V781.actions());
      on('t781', () => MENU.show('t72', true));
      el.querySelectorAll('[data-t781]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init();
        if (b.dataset.t781 === 'cmd'){ emit('ui', { kind: 'deny' }); b.textContent = V781.L('Командир — ещё в разработке', 'Commander — still in development', 'Đang phát triển'); return; }
        emit('ui', { kind: 'ok' }); T72.start('pc_' + b.dataset.t781); });
    }
    if (name === 'c781'){ on('c781ok', () => V781.confirmed()); }
    if (name === 'end') on('menu', () => MENU.toMenu());
  }; }
// leaving a running battle for a training: the battle is kept in «Автосохранение»
if (typeof T72 !== 'undefined'){ const st0 = T72.start; T72.start = function(id){ if (!this.on && !S.attract && !S.over && S.time > 20) V781.safe(() => SAVE.save('auto'), 'tsave'); return st0.apply(this, arguments); }; }
// ---- 4. PC: visible «☰ Меню» button in the top right corner (Esc does the same)
if (!TOUCH.on){
  const b = document.createElement('button'); b.id = 'm781';
  const lab = () => { b.innerHTML = `<b>☰</b><span>${V781.L('Меню', 'Menu', 'Menu')}</span><kbd>Esc</kbd>`; b.title = V781.L('Пауза: продолжить, заново, обучение, графика, настройки, главное меню', 'Pause: resume, restart, training, graphics, settings, main menu', 'Tạm dừng'); };
  lab(); b.style.display = 'none';
  b.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
  b.addEventListener('click', e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); V781.openMenu(); });
  document.body.appendChild(b);
  const al0 = MENU.applyLang; MENU.applyLang = function(){ const r = al0.apply(this, arguments); lab(); return r; };
}
// ---- 5. phone: ☰ opens the pause menu (the battle actions sheet is «⚡ Действия» there)
if (TOUCH.on && typeof M67 !== 'undefined'){
  const ti0 = TOUCH.init;
  TOUCH.init = function(){
    ti0.apply(this, arguments);
    V781.safe(() => {
      const o = M67.bMenu; if (!o || !o.parentElement) return;
      const n = o.cloneNode(true); o.parentElement.replaceChild(n, o); M67.bMenu = n;
      n.title = V781.L('Меню: пауза, заново, обучение, графика, настройки', 'Menu: pause, restart, training, graphics, settings', 'Menu');
      n.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); V781.openMenu(); }, { passive: false });
      n.addEventListener('click', e => { e.stopPropagation(); if (!e.isTrusted || e.detail === 0) V781.openMenu(); });
    }, 'menuBtn');
  };
}
// ---- 6. phone strategy: long-press then drag = box; small finger jitter is not a pan (and a tap stays a tap)
if (TOUCH.on && typeof M71 !== 'undefined'){
  const rs0 = M71.rtsStart;
  M71.rtsStart = function(e){
    const r = rs0.apply(this, arguments);
    V781.safe(() => {
      const q = TOUCH.rts; if (!q || !q._m71 || (typeof M74 !== 'undefined' && M74.simple()) || TOUCH.boxMode || S.place || S.cast) return;
      clearTimeout(this.holdT);
      this.holdT = setTimeout(() => {
        const t = TOUCH.rts; if (!t || t !== q || t.moved) return;
        t.armed = true;
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (er){}
        const R = this.ringEl; R.style.left = (t.x - 30) + 'px'; R.style.top = (t.y - 30) + 'px'; R.style.display = 'block';
      }, V781.HOLD);
    }, 'hold');
    return r;
  };
  const mv0 = TOUCH.moveEv;
  TOUCH.moveEv = function(e){
    const r = this.rts;
    if (S.mode === 'rts' && r && !r.moved && !r.armed && e.touches.length === 1 && !this.boxMode && !S.place && !S.cast && M71.active()){
      for (const tc of e.changedTouches) if (tc.identifier === r.id && hypot(tc.clientX - r.x0, tc.clientY - r.y0) < V781.DZ && performance.now() - r.t < 900){ e.preventDefault(); r.x = tc.clientX; r.y = tc.clientY; S.mouse = [r.x, r.y]; return; }
    }
    return mv0.apply(this, arguments);
  };
}
// ---- 7. tutorial: the «Рамка» step on phone explains the gesture and also accepts tap selection
if (typeof CTL72 !== 'undefined' && typeof DEF72 !== 'undefined'){
  const box = { g: 'drag', el: () => [{ zone: [0.25, 0.3, 0.75, 0.8] }], via: T => T.since('m71:rhold') || T.since('h:select') || T.since('box'),
    h: ['Держи палец на земле ~0,3 с — телефон дрогнет и появится жёлтое кольцо — и, не отпуская, веди: получится рамка. Или кнопка «Рамка» справа. Можно и просто тапнуть по отряду.',
        'Hold a finger on the ground ~0.3 s — the phone buzzes and a yellow ring appears — then drag without lifting: a box appears. Or use the "Box" button on the right. Simply tapping a squad also works.',
        'Giữ ngón tay ~0,3 giây — rung và vòng vàng — rồi kéo: thành khung. Hoặc nút “Khung” bên phải. Chạm vào đội cũng được.',
        'החזק אצבע ~0.3 ש׳ — רטט וטבעת צהובה — וגרור: נוצרת מסגרת. או כפתור „מסגרת" מימין. אפשר גם להקיש על חוליה.'] };
  for (const s of ['v71', 'v73']) if (CTL72.schemes[s] && CTL72.schemes[s].acts) CTL72.schemes[s].acts.box = box;
  const ck0 = DEF72.box.check;
  DEF72.box.check = function(T){
    if (ck0.apply(this, arguments)) return true;
    return T.plat === 'phone' && T.since('h:select') && selGroups().some(g => g.cls !== 'builder');
  };
}
// ---- 8. touch: «✋» action button; tap on the highlighted object; texts without E / ⏏
if (TOUCH.on){
  const bk0 = bk; bk = function(a){ return a === 'interact' ? '✋' : bk0(a); };
  { const ni0 = nearbyInteract; nearbyInteract = function(me){ const h = ni0.apply(this, arguments); if (h && typeof M71 !== 'undefined' && M71.active()) h.text = ''; return h; }; }   // centre of the screen stays free: the hint lives on the button + marker
  if (typeof M73 !== 'undefined'){ const ot0 = M73.onTap; M73.onTap = function(x, y){ if (V781.safe(() => V781.tapUse(x, y), 'tapUse')) return; return ot0.apply(this, arguments); }; }
  { const fd0 = feed; feed = function(t, c){ return fd0(V781.tt(t), c); }; }
  { const hs0 = HINTS.show; HINTS.show = function(id, text){ const a = [...arguments]; a[1] = V781.tt(text); return hs0.apply(this, a); }; }
  { const em0 = emit; emit = function(type, data){ if (type === 'radio' && data && typeof data.text === 'string') data.text = V781.tt(data.text); return em0(type, data); }; }
  if (typeof FEEL76 !== 'undefined' && FEEL76.hintText){ const ht0 = FEEL76.hintText; FEEL76.hintText = function(){ const r = ht0.apply(this, arguments); if (r){ r.t = V781.tt(r.t); r.s = V781.tt(r.s); } return r; }; }
  if (typeof M67 !== 'undefined' && M67.HINT) for (const k in M67.HINT){ const h = M67.HINT[k]; if (Array.isArray(h)) for (let i = 0; i < h.length; i++) h[i] = V781.tt(h[i]); }
  if (typeof drawOverlay === 'function'){ const do0 = drawOverlay; drawOverlay = function(){ const r = do0.apply(this, arguments); V781.safe(() => V781.drawUse(), 'drawUse'); return r; }; }
}
// strategy card help on phone (v7.1+ gestures): long tap is the command menu / box, not an order
if (TOUCH.on && typeof updateCard === 'function'){
  const uc0 = updateCard;
  updateCard = function(){
    const r = uc0.apply(this, arguments);
    V781.safe(() => {
      if (typeof M71 === 'undefined' || !M71.active()) return;
      const e = document.querySelector('#card .help'); if (!e || e._v781 === LANG.cur) return;
      e._v781 = LANG.cur;
      e.textContent = V781.L('Тап — выделить · тап по земле — идти · держи — меню приказов · держи и веди — рамка · 2 пальца — масштаб', 'Tap — select · tap ground — move · hold — command menu · hold and drag — box · 2 fingers — zoom', 'Chạm — chọn · giữ — menu lệnh · giữ và kéo — khung');
    }, 'help');
    return r;
  };
}
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); V781.safe(() => V781.frame(dt), 'frame'); }; }
(function v781CSS(){
  const st = document.createElement('style'); st.id = 'v781css';
  st.textContent = `
/* PC: ☰ Меню in the top right corner */
#m781{position:fixed;right:12px;top:26px;z-index:16;display:none;align-items:center;gap:6px;height:32px;padding:0 10px;border-radius:6px;cursor:pointer;
  background:rgba(10,12,14,.78);border:1px solid rgba(214,198,154,.6);color:#f0e8d0;font:700 13px "Exo 2",sans-serif;pointer-events:auto}
#m781 b{font-size:17px;line-height:1} #m781 kbd{font-size:10px;line-height:14px;opacity:.75} #m781:hover{border-color:#ffd27a;background:rgba(40,34,20,.9)}
body:not(.touch) #help{top:66px} body.rtsm #m781{top:30px}
/* graphics + training rows (PC menus) */
#screen .diffrow.g781{align-items:center;flex-wrap:wrap} #screen .diffrow.g781 > span{font:600 13px "Exo 2";color:#e8dcb8;white-space:nowrap;margin-right:2px}
#screen .diffrow.g781 button{flex:1;min-width:0} #screen .diffrow.g781 button.dis{opacity:.5}
#screen .diffrow.p781 button{flex:1}
#screen .c781{align-items:stretch;margin:auto} #screen.p71scr .c781{max-width:460px;width:100%;justify-content:center;gap:10px}
#screen.p71scr .c781 button{min-height:52px;font-size:16px} #screen.p71scr .c781 h2{text-align:center}
/* phone: graphics pill in the main menu header */
#screen .p71hb.g781p{min-width:0;width:auto;gap:6px;font-size:12px;white-space:nowrap} #screen .p71hb.g781p em{font-style:normal;color:#8fffaa}
/* low-FPS tip */
#g781tip{position:fixed;left:50%;top:calc(var(--st, 0px) + 8px);transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:8px;max-width:94vw;
  background:rgba(10,12,14,.9);border:1px solid rgba(255,210,122,.6);border-radius:8px;padding:5px 6px 5px 12px;color:#ffd27a;font:600 13px "Exo 2",sans-serif;pointer-events:auto}
#g781tip button{all:unset;cursor:pointer;min-height:36px;padding:0 10px;border-radius:6px;border:1px solid rgba(143,255,170,.6);color:#8fffaa;display:flex;align-items:center}
#g781tip button[data-g781t="x"]{border-color:rgba(255,255,255,.3);color:#e8dcb8;min-width:36px;justify-content:center;padding:0}
/* touch: context action button at the right thumb (never centre) */
#i781{position:fixed;z-index:16;display:none;flex-direction:column;align-items:center;justify-content:center;gap:1px;right:calc(var(--sr, 0px) + 10px);top:calc(50% - 42px);
  width:66px;height:66px;padding:0;border-radius:50%;background:rgba(30,90,50,.72);border:2px solid #8fffaa;color:#eafff0;font-family:"Exo 2",sans-serif;
  pointer-events:auto;touch-action:manipulation;box-shadow:0 0 14px rgba(143,255,170,.35)}
#i781 i{font-style:normal;font-size:24px;line-height:1} #i781 small{font:700 11px "Exo 2";max-width:62px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#i781.pop{animation:i781pop .32s ease-out} #i781.dn{transform:scale(.9);background:rgba(143,255,170,.6);color:#111}
@keyframes i781pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
body.i781on #touch .tf.fps > [data-s="R4"]{display:none !important}
body.mo781 #i781, body.mo781 #m74r, body.mo781 #m74eye, body.mo781 #cur, body.mo781 #g781tipx{display:none !important}
/* touch: bigger hit areas for tiny chips (visual size unchanged) */
body.touch .m73x::after, body.touch #m71mmb::after, body.touch #cur .cbox button::after, body.touch #f76hint button::after, body.touch #hint .t78x::after{content:"";position:absolute;inset:-8px}
body.touch .m73x, body.touch #m71mmb, body.touch #cur .cbox button{position:fixed}
body.touch #cur .cbox button{position:relative} body.touch #f76hint button, body.touch #hint .t78x{position:relative}
body.touch #s78.ph .ls button{min-height:42px;font-size:14px} body.touch #s78.ph .ls{width:230px}
body.touch #screen .f76end button{min-height:44px}
@media (max-height:440px){ body.touch #i781{width:58px;height:58px;top:calc(50% - 36px)} }
`;
  document.head.appendChild(st);
})();
