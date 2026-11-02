// =====================================================================
//  v8.15 — УРОВНИ ИНТЕРФЕЙСА: Простой (телефон/планшет по умолчанию) / Обычный (= v8.13) / Полный.
//  • Настройка SET.ui815 ('simple' | 'normal' | 'full'); без значения — телефон/планшет: Простой, ПК: Обычный.
//    Переключение — без перезагрузки (классы на body + перерисовка меню). ?ui815=0 — модуль выключен целиком (откат).
//  • Простой: главное меню «Играть / Обучение / Настройки / Ещё ▾» (в «Ещё» — ВСЕ кнопки старого меню списком),
//    пауза «Продолжить / Настройки / Выйти / Ещё ▾», ☰ в бою = пауза, короткие Настройки; матч — в Шутере,
//    Стратег/Командир открываются карточкой-предложением (после ~3 мин или первого убийства) + 3 шага объяснения;
//    ИИ-стратег своей стороны включён, пока Стратег не открыт. Прогресс — localStorage pm_ui815.
//  • Телефон, Стратег/Командир (Простой): поле боя главное — одна строка сообщений сверху (3.5 с), 🔔 — журнал,
//    панели (стройка, армия, отряды, миникарты) — в тонкой полосе иконок слева, лист закрывается после действия / тапом по полю.
//    Чёткие метки юнитов поверх (2D-слой в полном разрешении) и «магнит» тапа к ближайшей метке (44 px).
//  • Все уровни (пока модуль включён): 🎥 «1-е лицо» на телефоне в 3-м лице + тост; «Обучение»: три главных урока
//    Шутер → Командир → Стратег, «Уроки новых механик» свернуты; компактная плашка урока на телефоне.
//  • Состояния прицеливания (K815.aim): стоя — точнее, бег — шире, бег + прицел — середина; динамический прицел.
//  Хуки — только обёртки отсюда (MENU.html_*, MENU.wire, V87M.go/cmdOk, M67.toggleSheet, HUD88.renderFeed, feed,
//  HINTS.show, gunSpread, uixFrame, applySettings, newMatch, MENU.html_t72). Элементы с fb814 не скрываются.
// =====================================================================
const K815 = {
  offerT: 180, offerKillMin: 45, laterT: 240, cmdAfter: 240,   // предложение открыть Стратег / Командир (с, время матча)
  feedLife: 3.5, logMax: 80, snapPx: 44, snapPc: 16,
  aim: { still: 0.55, look: 0.8, move: 1.6, moveAim: 1.05, speed: 1.2, lerp: 10, closer: 0.45, shoulder: 0.5,   // 3-е лицо + прицел: камера ближе (доля пути к плечу) и вбок (м)
         gap: { still: 5, look: 8, move: 22, moveAim: 12 } },   // множитель разброса и зазор прицела (px) по состоянию
  mk: { r: 7, cluster: 26, maxN: 140 },                          // метки юнитов: радиус, радиус склейки (px), максимум
};
const UI815 = {
  on: (() => { try { return new URLSearchParams(location.search).get('ui815') !== '0'; } catch (e){ return true; } })(),
  LV: ['simple', 'normal', 'full'], err: {}, raw: false, log: [], unread: 0, sheet: null, nextOffer: 0, card: null, tourI: -1,
  stats: { offers: 0, accept: 0, later: 0, blocked: 0, logged: 0, snaps: 0, more: 0, third: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('UI815 ' + tag, e); } } },
  T(ru, en, vi){ return tr(ru, en, vi || en, en); },
  touch(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  lvl(){ const v = SET.ui815; return this.LV.includes(v) ? v : (this.touch() ? 'simple' : 'normal'); },
  simple(){ return this.on && !this.raw && this.lvl() === 'simple'; },
  clean(){ return this.on && !this.raw && this.lvl() !== 'full'; },   // чистка (сообщения, пауза, полоса) — Простой и Обычный
  P: { rts: 0, cmd: 0 },
  load(){ try { const s = localStorage.getItem('pm_ui815'); if (s) Object.assign(this.P, JSON.parse(s)); } catch (e){} },
  save(){ try { localStorage.setItem('pm_ui815', JSON.stringify(this.P)); } catch (e){} },
  tut(){ return (typeof T72 !== 'undefined' && T72.on) || (typeof TUT !== 'undefined' && TUT.on); },
  rv(m){ return m === 'fps' || !this.simple() || !!this.P[m] || this.tut(); },
  mode(){ return typeof V87M !== 'undefined' ? V87M.mode() : (S.mode === 'fps' ? 'fps' : 'rts'); },
  apply(){
    if (!this.on || !document.body) return;
    const b = document.body.classList, s = this.lvl() === 'simple';
    b.toggle('ui815s', s); b.toggle('ui815f', this.lvl() === 'full'); b.toggle('ui815c', this.lvl() !== 'full'); b.toggle('ui815t', this.touch());
    b.toggle('ui815r-rts', !s || !!this.P.rts); b.toggle('ui815r-cmd', !s || !!this.P.cmd);
    this.lessonReveal();
  },
  // пройденный урок Стратега / Командира — режим открыт
  lessonReveal(){
    if (typeof T72 === 'undefined' || !T72.doneMap) return;
    const d = this.safe(() => T72.doneMap(), 'dm') || {};
    let ch = false;
    if (!this.P.rts && (d.ph_rts || d.pc_rts)){ this.P.rts = 1; ch = true; }
    if (!this.P.cmd && d.l85cmd){ this.P.cmd = 1; this.P.rts = 1; ch = true; }
    if (ch){ this.save(); const b = document.body.classList; b.toggle('ui815r-rts', true); if (this.P.cmd) b.toggle('ui815r-cmd', true); }
  },
  setLevel(v){ SET.ui815 = v; MENU.save(); this.apply(); updateModeUI(); },
  lvlName(v){ return { simple: this.T('Простой', 'Simple', 'Đơn giản'), normal: this.T('Обычный', 'Normal', 'Bình thường'), full: this.T('Полный', 'Full', 'Đầy đủ') }[v]; },
  // ------------------------------------------------------------------ меню
  btnsOf(html){
    const d = document.createElement('div'); d.innerHTML = html;
    const skip = new Set(['m_f76now', 'm_tutorial', 'm_settings', 'm_resume', 'm_menu', 'm73more', 'm_back', 'm_load0']);
    return [...d.querySelectorAll('button')].filter(b => (b.id && b.id.startsWith('m_') && !skip.has(b.id) && !b.id.startsWith('m_u815')) || b.dataset.p71go || b.dataset.mm2)
      .filter(b => !b.closest('.p71s'));
  },
  rawHtml(src){ this.raw = true; try { return MENU['html_' + src](); } finally { this.raw = false; } },
  main(){
    const L = this.T, has = SAVE.has();   // v8.15b: три режима видны прямо в главном меню, язык — сверху (фидбэк Дмитрия 02.11 15:06–15:08)
    const dn = this.safe(() => T72.doneMap(), 'dm') || {}, pl = this.touch() ? 'ph' : 'pc';
    const fl = (typeof LANG_FLAG !== 'undefined' && LANG_FLAG[SET.lang]) || '🌐', ln = ((typeof LANGS !== 'undefined' && LANGS.find(x => x[0] === SET.lang)) || [0, SET.lang])[1];
    const langs = (typeof LANGS !== 'undefined' ? LANGS : []).map(([c, n]) => `<button class="${SET.lang === c ? 'cur' : ''}" data-lang="${c}">${(typeof LANG_FLAG !== 'undefined' && LANG_FLAG[c]) || ''} ${n}</button>`).join('');
    const first = !Object.keys(dn).length;
    const md = (go, id, ic, n, sub) => `<button class="u8md${first && id.endsWith('_fps') ? ' u8first' : ''}" ${go}><i>${ic}</i><span><b>${n}</b><small>${sub}</small><em>${first && id.endsWith('_fps') ? '★ ' + L('начни отсюда · урок ~2 мин', 'start here · ~2 min lesson', 'bắt đầu từ đây · ~2 phút') : dn[id] ? '✓ ' + L('урок пройден', 'lesson done', 'đã học') : '🎓 ' + L('урок ~2 мин', 'lesson ~2 min', 'bài học ~2 phút')}</em></span></button>`;
    return `<div class="u815 u815main"><div class="u8hd"><h1>PORTAL METEOR</h1><small class="u8v">v8.15</small><button id="m_u815lang" class="u8lang">${fl} ${ln} ▾</button></div>
      <div id="u8langs" class="u8langs" style="display:none">${langs}</div>
      <button id="m_u815play" class="u8big"><i>▶</i><span><b>${L('Играть', 'Play', 'Chơi')}</b><small>${L('сразу в бой — ты боец, армия воюет рядом', 'straight into battle — you fight, your army fights alongside', 'vào trận ngay — bạn chiến đấu cùng quân đội')}</small></span></button>
      <div class="u8mdh">${L('Три способа играть — переключаются в бою одной кнопкой. Нажми, чтобы пройти урок:', 'Three ways to play — switch in battle with one button. Tap one to take its lesson:', 'Ba cách chơi — đổi trong trận bằng một nút. Chạm để học:')}</div>
      <div class="u8mds">${md(`data-t72go="${pl}_fps"`, pl + '_fps', '🔫', L('Шутер', 'Shooter', 'Bắn súng'), L('сам бегаешь и стреляешь', 'run and shoot yourself', 'tự chạy và bắn'))}${md('data-l84go="l85cmd"', 'l85cmd', '⌖', L('Командир', 'Commander', 'Chỉ huy'), L('ведёшь один отряд', 'lead one squad', 'dẫn một đội'))}${md(`data-t72go="${pl}_rts"`, pl + '_rts', '🗺', L('Стратег', 'Strategist', 'Chiến lược'), L('вся армия, вид сверху', 'whole army, top view', 'cả quân đội, nhìn từ trên'))}</div>
      <div class="u8row">${has ? `<button id="m_u815load"><i>⏵</i><b>${L('Продолжить', 'Continue', 'Tiếp tục')}</b></button>` : ''}
        <button id="m_u815set"><i>⚙</i><b>${L('Настройки', 'Settings', 'Cài đặt')}</b></button>
        <button id="m_u815more"><i>☰</i><b>${L('Ещё ▾', 'More ▾', 'Thêm ▾')}</b></button></div></div>`;
  },
  // v8.15b: Android — на «Играть» полный экран и альбомная ориентация (iOS этого не умеет — там подсказка «поверни телефон»)
  land(){ if (!this.touch() || !/Android/i.test(navigator.userAgent)) return;
    try { const de = document.documentElement, rq = de.requestFullscreen || de.webkitRequestFullscreen; const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e){} };
      if (rq && !document.fullscreenElement){ const r = rq.call(de); if (r && r.then) r.then(lock).catch(() => {}); else lock(); } else lock(); } catch (e){} },
  pause(){
    const L = this.T;
    let les = '';   // v8.15d: в уроке — сразу перейти в урок другого режима
    if (this.tut()){ const pl = this.touch() ? 'ph' : 'pc', cur = typeof T72 !== 'undefined' ? T72.id : '';
      const lb = (go, id, ic, n) => `<button ${go} class="${cur === id ? 'cur' : ''}"><i>${ic}</i><b>${n}</b></button>`;
      les = `<div class="u8les2"><small>${L('Перейти в урок:', 'Switch lesson:', 'Đổi bài học:')}</small><div class="u8row">${lb(`data-u8go="${pl}_fps"`, pl + '_fps', '🔫', L('Шутер', 'Shooter', 'Bắn súng'))}${lb('data-u8go84="l85cmd"', 'l85cmd', '⌖', L('Командир', 'Commander', 'Chỉ huy'))}${lb(`data-u8go="${pl}_rts"`, pl + '_rts', '🗺', L('Стратег', 'Strategist', 'Chiến lược'))}</div></div>`; }
    return `<div class="u815 u815pause"><div class="u8hd"><h2>${L('ПАУЗА', 'PAUSED', 'TẠM DỪNG')}</h2><small class="u8v">${fmtTime(S.time)}</small></div>
      <button id="m_u815resume" class="u8big"><i>▶</i><span><b>${L('Продолжить', 'Resume', 'Tiếp tục')}</b></span></button>
      <div class="u8row"><button id="m_u815set2"><i>⚙</i><b>${L('Настройки', 'Settings', 'Cài đặt')}</b></button>
        <button id="m_u815quit"><i>⏏</i><b>${this.tut() ? L('Выйти из урока', 'Leave lesson', 'Thoát bài học') : L('Выйти', 'Quit', 'Thoát')}</b></button>
        <button id="m_u815more"><i>☰</i><b>${L('Ещё ▾', 'More ▾', 'Thêm ▾')}</b></button></div>${les}</div>`;
  },
  // «Ещё»: все кнопки старого меню (главного или паузы) — списком; нажатие = нажатие настоящей кнопки
  more(){
    const src = this.moreSrc || 'main', L = this.T;
    const B = this.btnsOf(this.rawHtml(src));
    const rows = B.map((b, i) => { const t = b.cloneNode(true); t.querySelectorAll('svg').forEach(s => s.classList.add('u8ic')); return `<button class="u8it" data-u8i="${i}">${t.innerHTML}</button>`; }).join('');
    const lv = this.LV.map(v => `<button class="u8lv ${this.lvl() === v ? 'cur' : ''}" data-u8lv="${v}">${this.lvlName(v)}</button>`).join('');
    return `<div class="u815 u815more"><div class="u8hd"><button id="m_back" class="u8bk">‹ ${L('Назад', 'Back', 'Quay lại')}</button><h2>${L('ЕЩЁ', 'MORE', 'THÊM')}</h2></div>
      <div class="u8list">${rows}</div><div class="u8lvrow"><span>${L('Интерфейс', 'Interface', 'Giao diện')}</span>${lv}</div></div>`;
  },
  doMore(i){
    const src = this.moreSrc || 'main';
    this.stats.more++;
    const b = this.btnsOf(this.rawHtml(src))[i]; if (!b) return;
    const key = b.id ? '#' + b.id : b.dataset.p71go ? `[data-p71go="${b.dataset.p71go}"]` : b.dataset.mm2 ? `[data-mm2="${b.dataset.mm2}"]` : null;
    if (MENU.stack[MENU.stack.length - 1] === src) MENU.stack.pop();
    this.raw = true; try { MENU.show(src); } finally { this.raw = false; }
    const live = key ? $('screen').querySelector(key) : null;
    if (live) live.click();
  },
  // короткие Настройки
  settings(){
    const L = this.T, ph = this.touch() && typeof M67 !== 'undefined';
    const st = (k, lab, val) => `<div class="u8st"><button data-u8c="${k}" data-d="-1">−</button><span><small>${lab}</small><b>${val}</b></span><button data-u8c="${k}" data-d="1">+</button></div>`;
    const q = [L('низкое', 'low', 'thấp'), L('среднее', 'medium', 'trung bình'), L('высокое', 'high', 'cao')][SET.quality] || SET.quality;
    const sens = ph ? (M67.pref.sens || 1) : (+SET.sens || 1);
    const ch = (k, opts) => `<div class="u8ch"><small>${opts.lab}</small><span>${opts.v.map(([v, n]) => `<button class="${SET[k] === v ? 'cur' : ''}" data-u8s="${k}" data-v="${v}">${n}</button>`).join('')}</span></div>`;
    const langs = LANGS.map(([c, n]) => `<button class="${SET.lang === c ? 'cur' : ''}" data-lang="${c}">${(typeof LANG_FLAG !== 'undefined' && LANG_FLAG[c]) || ''} ${n}</button>`).join('');
    return `<div class="u815 u815set"><div class="u8hd"><button id="m_back" class="u8bk">‹ ${L('Назад', 'Back', 'Quay lại')}</button><h2>${L('НАСТРОЙКИ', 'SETTINGS', 'CÀI ĐẶT')}</h2></div>
      <div class="u8grid">${st('vol', L('Звук', 'Sound', 'Âm thanh'), Math.round(SET.vol * 100) + '%')}${st('quality', L('Графика', 'Graphics', 'Đồ họa'), q)}
      ${st('sens', L('Чувствительность', 'Sensitivity', 'Độ nhạy'), sens.toFixed(1))}
      ${ch('tpv76', { lab: L('Вид бойца', 'Trooper view', 'Góc nhìn'), v: [[false, L('1-е лицо', '1st person', 'ngôi 1')], [true, L('3-е лицо', '3rd person', 'ngôi 3')]] })}
      ${ch('ui815', { lab: L('Интерфейс', 'Interface', 'Giao diện'), v: this.LV.map(v => [v, this.lvlName(v)]) })}
      ${typeof DEN75 !== 'undefined' ? `<div class="u8ch"><small>${L('Денди-графика (пиксели, легче)', 'Dendy graphics (pixels, lighter)', 'Đồ họa Dendy (nhẹ hơn)')}</small><span>${[[0, L('выкл', 'off', 'tắt')], [1, L('вкл', 'on', 'bật')]].map(([v, n]) => `<button class="${(SET.denStyle ? 1 : 0) === v ? 'cur' : ''}" data-u8d="${v}">${n}</button>`).join('')}</span></div>` : ''}
      <div class="u8ch"><small>${L('Кадров в секунду', 'Frame rate', 'Khung hình/giây')}</small><span>${[[30, L('30 · не греется', '30 · cooler', '30 · mát')], [60, '60'], [0, L('макс', 'max', 'tối đa')]].map(([v, n]) => `<button class="${this.fpsCap() === v ? 'cur' : ''}" data-u8f="${v}">${n}</button>`).join('')}</span></div>
      <div class="u8ch"><small>${L('Язык', 'Language', 'Ngôn ngữ')}</small><span>${langs}</span></div></div>
      <div class="u8row"><button id="m_u815all"><i>⚙</i><b>${L('Все настройки', 'All settings', 'Tất cả cài đặt')}</b></button>${typeof FB814 !== 'undefined' ? `<button id="m_u815fb"><i>📝</i><b>${L('Отзыв и заметки', 'Feedback & notes', 'Góp ý & ghi chú')}</b></button>` : ''}</div></div>`;
  },
  setStep(k, d){
    if (k === 'vol') SET.vol = clamp(Math.round((SET.vol + d * 0.1) * 10) / 10, 0, 1);
    else if (k === 'quality') SET.quality = clamp((SET.quality | 0) + d, 0, 2);
    else if (k === 'sens'){ if (this.touch() && typeof M67 !== 'undefined') { M67.option('sens', d); return; } SET.sens = clamp(+((+SET.sens || 1) + d * 0.1).toFixed(2), 0.3, 3); }
    applySettings(); MENU.save();
  },
  wire(name){
    const el = $('screen'); if (!el) return;
    const on = (id, fn) => { const b = $('m_' + id); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
    on('u815play', () => { this.land(); if (typeof FEEL76 !== 'undefined') FEEL76.playNow(); else MENU.newGame(); });
    on('u815load', () => MENU.loadGame());
    on('u815fb', () => MENU.show('fb814', true));
    on('u815tut', () => MENU.show('t72', true));
    { const lb = $('m_u815lang'); if (lb) lb.onclick = e => { e.stopPropagation(); const d = $('u8langs'); if (d) d.style.display = d.style.display === 'none' ? 'flex' : 'none'; }; }   // v8.15b
    if (name === 'main'){
      el.querySelectorAll('.u8md[data-t72go]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); T72.start(b.dataset.t72go); });
      el.querySelectorAll('.u8md[data-l84go]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); if (typeof L84 !== 'undefined') L84.start(b.dataset.l84go); });
    }
    on('u815set', () => MENU.show('u815set', true));
    on('u815all', () => { this.raw = true; try { MENU.show('settings', true); } finally { this.raw = false; } });
    on('u815more', () => { this.moreSrc = MENU.cur === 'pause' ? 'pause' : 'main'; MENU.show('u815more', true); });
    on('u815set2', () => { if (this.simple()) MENU.show('u815set', true); else { this.raw = true; try { MENU.show('settings', true); } finally { this.raw = false; } } });
    on('u815resume', () => MENU.resume());
    on('u815quit', () => { if (this.tut()){ if (typeof T72 !== 'undefined' && T72.on) T72.stop(); if (typeof TUT !== 'undefined') TUT.on = false; MENU.toMenu(); return; } if (typeof MISSION !== 'undefined') MENU.show('quit', true); else MENU.toMenu(); });   // v8.15b: из урока — сразу в главное меню
    if (name === 'u815more'){
      el.querySelectorAll('[data-u8i]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); this.doMore(+b.dataset.u8i); });
      el.querySelectorAll('[data-u8lv]').forEach(b => b.onclick = e => { e.stopPropagation(); this.setLevel(b.dataset.u8lv); MENU.show(MENU.cur); });
    }
    el.querySelectorAll('[data-u8go],[data-u8go84]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' });   // v8.15d
      const id = b.dataset.u8go || b.dataset.u8go84; MENU.stack = []; MENU.resume(); if (typeof T72 !== 'undefined' && T72.on) T72.stop();
      setTimeout(() => { if (b.dataset.u8go84 && typeof L84 !== 'undefined') L84.start(id); else T72.start(id); }, 0); });
    el.querySelectorAll('[data-u8d]').forEach(b => b.onclick = e => { e.stopPropagation(); this.safe(() => DEN75.set(+b.dataset.u8d), 'den'); MENU.show(MENU.cur); });   // v8.15d
    el.querySelectorAll('[data-u8f]').forEach(b => b.onclick = e => { e.stopPropagation(); SET.fps815 = +b.dataset.u8f; MENU.save(); MENU.show(MENU.cur); });   // v8.15c
    el.querySelectorAll('[data-u8c]').forEach(b => b.onclick = e => { e.stopPropagation(); this.setStep(b.dataset.u8c, +b.dataset.d); MENU.show(MENU.cur); });
    el.querySelectorAll('[data-u8s]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.u8s, v = b.dataset.v;
      if (k === 'ui815'){ this.setLevel(v); } else { SET[k] = v === 'true' ? true : v === 'false' ? false : v; applySettings(); MENU.save(); if (k === 'tpv76' && !S.attract){ S.third = !!SET.tpv76; } }
      if (k === 'ui815' && !this.simple() && MENU.cur === 'u815set'){ MENU.stack = MENU.stack.filter(s => !s.startsWith('u815')); MENU.show(S.attract ? 'main' : 'pause'); return; }
      MENU.show(MENU.cur); });
  },
  // строка «Интерфейс» в обычных Настройках (ПК и телефон)
  injectSettings(h){
    const L = this.T, cur = this.lvl();
    if (h.includes('class="p71 p71set"')){
      const t = `<button class="p71t" data-u8cyc="1">${typeof IC71 !== 'undefined' ? IC71('touch') : ''}<b>${L('Интерфейс', 'Interface', 'Giao diện')}</b><small>${this.lvlName(cur)}</small></button>`;
      return h.replace('<div class="p71g c4 tall">', '<div class="p71g c4 tall">' + t);
    }
    const row = `<div class="row"><label>${L('Интерфейс', 'Interface', 'Giao diện')}</label><span class="chs">${this.LV.map(v => `<button class="${cur === v ? 'cur' : ''}" data-u8s="ui815" data-v="${v}">${this.lvlName(v)}</button>`).join('')}</span></div>`;
    const i = h.indexOf('<h4>'); return i >= 0 ? h.slice(0, i) + row + h.slice(i) : h;
  },
  // ------------------------------------------------------------------ «Обучение»: три главных урока
  t72(h){
    const d = document.createElement('div'); d.innerHTML = h;
    const g = d.querySelector('.grid'); if (!g) return h;
    const dn = this.safe(() => T72.doneMap(), 'dm') || {}, pl = this.touch() ? 'ph' : 'pc', L = this.T;
    const tile = (attr, id, ic, n, sub) => `<button class="t72tile mine u8les" ${attr}><i class="u8lic">${ic}</i><b>${n}</b><small>${sub}</small><span class="st">${dn[id] ? '✓ ' + L('пройдено', 'done', 'xong') : L('не пройдено', 'not done yet', 'chưa xong')}</span></button>`;
    const three = tile(`data-t72go="${pl}_fps"`, pl + '_fps', '▶', L('Шутер', 'Shooter', 'Bắn súng'), L('сам в бою', 'you fight yourself', 'tự chiến đấu')) +
      tile('data-l84go="l85cmd"', 'l85cmd', '⌖', L('Командир', 'Commander', 'Chỉ huy'), L('ведёшь один отряд', 'you lead one squad', 'dẫn một đội')) +
      tile(`data-t72go="${pl}_rts"`, pl + '_rts', '◩', L('Стратег', 'Strategist', 'Chiến lược'), L('командуешь всей армией сверху', 'you command the whole army from above', 'chỉ huy cả quân đội từ trên cao'));
    const others = [...g.querySelectorAll('[data-t72go]')].filter(b => !b.dataset.t72go.startsWith(pl)).map(b => b.outerHTML).join('');
    g.innerHTML = three; g.classList.add('u8three');
    if (others){ const o = document.createElement('div'); o.className = 'grid u8oth'; o.innerHTML = others; g.after(o); }
    const lh = d.querySelector('.l84h'), lg = d.querySelector('.l84g');
    if (lh && lg){
      const c = lg.querySelector('[data-l84go="l85cmd"]'); if (c) c.remove();
      const det = document.createElement('details'); det.className = 'u8det'; if (this.t72open) det.open = true;
      det.innerHTML = `<summary>${lh.innerHTML}</summary>`; lh.replaceWith(det); det.appendChild(lg);
    }
    return d.innerHTML;
  },
  // ------------------------------------------------------------------ в бою
  frame(dt){
    if (!this.on) return;
    const b = document.body.classList, m = S.attract ? 'menu' : this.mode();
    b.toggle('ui815m-fps', m === 'fps'); b.toggle('ui815m-rts', m === 'rts'); b.toggle('ui815m-cmd', m === 'cmd');
    this.camBtn();
    if (MENU.isOpen()){ const t = $('u815toast'); if (t && t.style.display !== 'none') t.style.display = 'none'; }
    if (S.attract) { this.hideCard(); return; }
    const sim = this.simple();
    if (sim){
      // ИИ-стратег своей стороны — пока Стратег не открыт
      if (!this.P.rts && S.teams && S.teams[0]){ S.teams[0].ai = true; if (S.teams[0].autoBuild === false) S.teams[0].autoBuild = true; }
      // закрытые режимы
      if (!this.tut() && !MENU.isOpen() && !S.over){
        if (m === 'cmd' && !this.rv('cmd') && typeof V87M !== 'undefined'){ this.raw = true; try { V87M.go('fps'); } finally { this.raw = false; } }
        else if (m === 'rts' && !this.rv('rts') && !(typeof CAMFX !== 'undefined' && CAMFX.busy && CAMFX.busy()) && !(typeof FEEL76 !== 'undefined' && FEEL76.intro)) { this.stats.blocked++; enterFPS(); }
      }
      this.offerStep();
      if (m === 'rts' && !this.rtsT) this.rtsT = S.time;
    } else this.hideCard();
    const cl = this.clean() && (m === 'rts' || m === 'cmd');
    this.line(cl && !MENU.isOpen());
    this.bar(cl && this.touch() && !MENU.isOpen() && !S.over);
    this.lessonPlate();
    this.lesTgt();   // v8.15d
    this.eyeBtn(this.simple() && this.touch() && !S.attract && !MENU.isOpen() && !S.over);   // v8.15c
  },
  // ---- предложение открыть Стратег / Командир
  offerStep(){
    if (this.card || this.tut() || MENU.isOpen() || S.over || this.tourI >= 0 || this.mode() !== 'fps') return;
    if (S.time < this.nextOffer) return;
    const kills = typeof PROG !== 'undefined' ? PROG.matchKills : 0, caps = S.stats && S.stats.caps ? S.stats.caps[0] : 0;
    if (!this.P.rts){
      if (S.time > K815.offerT || ((kills > 0 || caps > 0) && S.time > K815.offerKillMin)) this.showCard('rts');
    } else if (!this.P.cmd && this.rtsT && S.time > this.rtsT + K815.cmdAfter) this.showCard('cmd');
  },
  showCard(m){
    const L = this.T; this.stats.offers++;
    let el = $('u815card'); if (!el){ el = document.createElement('div'); el.id = 'u815card'; document.body.appendChild(el); }
    el.innerHTML = m === 'rts'
      ? `<b>${L('Хочешь командовать армией?', 'Want to command the army?', 'Muốn chỉ huy quân đội?')}</b><span>${L('Открыть режим «Стратег»: смотришь сверху и отдаёшь приказы всей армии.', 'Unlock the Strategist mode: look from above and give orders to the whole army.', 'Mở chế độ Chiến lược.')}</span>`
      : `<b>${L('Хочешь вести один отряд?', 'Want to lead one squad?', 'Muốn dẫn một đội?')}</b><span>${L('Открыть режим «Командир»: камера над отрядом, тап — куда идти.', 'Unlock the Commander mode: camera over a squad, tap where to go.', 'Mở chế độ Chỉ huy.')}</span>`;
    el.innerHTML += `<div><button data-u8y="1">${L('Да', 'Yes', 'Có')}</button><button data-u8y="0">${L('Позже', 'Later', 'Để sau')}</button></div>`;
    el.style.display = 'flex'; this.card = m;
    const go = e => { const bt = e.target.closest && e.target.closest('[data-u8y]'); if (!bt) return; e.preventDefault(); e.stopPropagation();
      const y = bt.dataset.u8y === '1'; this.hideCard();
      if (y){ this.stats.accept++; this.P[m] = 1; if (m === 'cmd') this.P.rts = 1; this.save(); this.apply(); this.tour(m === 'rts' ? 0 : 2); }
      else { this.stats.later++; this.nextOffer = S.time + K815.laterT; } };
    el.ontouchstart = go; el.onclick = go;
  },
  hideCard(){ const el = $('u815card'); if (el) el.style.display = 'none'; this.card = null; },
  // ---- 3 шага: что такое режимы
  TOUR(){ const L = this.T; return [
    ['▶', L('Шутер', 'Shooter', 'Bắn súng'), L('Ты сам бежишь и стреляешь. Так ты играл до сих пор.', 'You run and shoot yourself. That is how you have played so far.', 'Bạn tự chạy và bắn.')],
    ['◩', L('Стратег', 'Strategist', 'Chiến lược'), L('Смотришь сверху и командуешь всей армией: строишь базу, отправляешь отряды. Армия и без тебя воюет сама.', 'Look from above and command the whole army: build the base, send squads. The army also fights on its own.', 'Nhìn từ trên cao và chỉ huy cả quân đội.')],
    ['⌖', L('Командир', 'Commander', 'Chỉ huy'), L('Ведёшь один отряд: камера над ним, тап по земле — куда идти.', 'You lead one squad: the camera is above it, tap the ground to move.', 'Dẫn một đội: chạm vào mặt đất để di chuyển.')]]; },
  tour(i){
    const T = this.TOUR(), L = this.T; this.tourI = i; S.paused = true;
    let el = $('u815tour'); if (!el){ el = document.createElement('div'); el.id = 'u815tour'; document.body.appendChild(el); }
    if (i >= T.length){ el.style.display = 'none'; this.tourI = -1; S.paused = false; document.body.classList.add('u815pulse'); setTimeout(() => document.body.classList.remove('u815pulse'), 6000);
      feed(L('Кнопка режима — вверху справа: тап — следующий режим.', 'The mode button is at the top right: tap for the next mode.', 'Nút chế độ ở góc trên bên phải.'), '#ffd27a'); return; }
    const t = T[i];
    el.innerHTML = `<div class="u8tc"><small>${i + 1} / ${T.length}</small><i>${t[0]}</i><b>${t[1]}</b><p>${t[2]}</p><button data-u8n="1">${i < T.length - 1 ? L('Дальше', 'Next', 'Tiếp') : L('Понятно', 'Got it', 'Đã hiểu')}</button></div>`;
    el.style.display = 'flex';
    const go = e => { const bt = e.target.closest && e.target.closest('[data-u8n]'); if (!bt) return; e.preventDefault(); e.stopPropagation(); this.tour(i + 1); };
    el.ontouchstart = go; el.onclick = go;
  },
  // ---- одна строка сообщений сверху (Стратег/Командир, телефон, Простой) + журнал 🔔
  push(text, color){
    if (typeof text !== 'string' || S.attract) return;
    const p = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); if (!p) return;
    const last = this.log.slice(-6).find(l => l.p === p); if (last){ last.t = S.time; last.n = (last.n || 1) + 1; return; }
    this.log.push({ p, c: color || '#cfe3ff', t: S.time, n: 1 }); if (this.log.length > K815.logMax) this.log.shift();
    this.unread++; this.stats.logged++;
  },
  line(on){
    let el = $('u815line');
    if (!on){ if (el && el.style.display !== 'none') el.style.display = 'none'; return; }
    if (!el){ el = document.createElement('div'); el.id = 'u815line'; document.body.appendChild(el); }
    const N = this.touch() ? 1 : 2, L = this.log.filter(f => S.time - f.t < K815.feedLife).slice(-N);
    const vis = L.length && !this.tut();
    el.style.display = vis ? 'block' : 'none';
    if (vis){ const h = L.map(f => `<div style="color:${f.c};opacity:${clamp((K815.feedLife - (S.time - f.t)) / 0.8, 0, 1).toFixed(2)}">${uixEsc(f.p.length > 90 ? f.p.slice(0, 88) + '…' : f.p)}${f.n > 1 ? ' ×' + f.n : ''}</div>`).join(''); if (el._t !== h){ el._t = h; el.innerHTML = h; } }
  },
  // ---- полоса иконок слева (Стратег/Командир)
  // v8.15d: в уроке на телефоне прячем лишние панели, но показываем ту, где цель текущего шага
  lesTgt(){
    const on = this.simple() && this.touch() && typeof T72 !== 'undefined' && T72.on;
    const panes = [$('m71rail'), $('m71sq'), document.querySelector('#card .cmds')];
    let tg = null;
    if (on){ try { const H = T72.how(T72.blocked || T72.cur()) || {}; for (const t of (H.el ? H.el(T72) : []) || []){ if (t && t.sel){ const e = document.querySelector(t.sel); if (e){ tg = e; break; } } } } catch (e){} }
    for (const pn of panes) if (pn) pn.classList.toggle('u8tgt', !!(tg && pn.contains(tg)));
  },
  // v8.15c: 👁 «Чистый вид» (Дмитрий 02.11 15:39: «нажимаешь на глазки — остальные кнопки съезжают и группируются в углу»)
  eyeBtn(on){
    let b = $('u815eye');
    document.body.classList.toggle('u8eyeok', !!on);
    if (!on){ if (b) b.style.display = 'none'; return; }
    if (!b){ b = document.createElement('button'); b.id = 'u815eye'; document.body.appendChild(b);
      const go = e => { e.preventDefault(); e.stopPropagation(); if (e.type === 'click' && performance.now() - (b._t || -1e9) < 600) return; if (e.type === 'touchstart') b._t = performance.now();
        AU.init(); emit('ui', { kind: 'ok' }); this.eye = !this.eye; document.body.classList.toggle('u8eye', this.eye); this.openSheet(null); this.eyeSig = ''; };
      b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('click', go); }
    const sig = this.eye + '|' + SET.lang;
    if (this.eyeSig !== sig){ this.eyeSig = sig; b.innerHTML = (this.eye ? '◉' : '👁') + '<small>' + (this.eye ? this.T('кнопки', 'buttons', 'nút') : this.T('чисто', 'clean', 'gọn')) + '</small>'; b.classList.toggle('on', !!this.eye); }
    b.style.display = 'flex';
  },
  // v8.15c: ограничение кадров на телефоне (меньше греется и не тормозит при долгой игре; девушка Дмитрия на iPhone 02.11 15:39)
  fpsCap(){ const v = SET.fps815; return v === 30 || v === 60 ? v : (v === 0 ? 0 : (this.touch() ? 30 : 0)); },
  bar(on){
    let el = $('u815bar');
    if (!on){ if (el && el.style.display !== 'none'){ el.style.display = 'none'; this.openSheet(null); } return; }
    const m = this.mode(), L = this.T;
    if (!el){
      el = document.createElement('div'); el.id = 'u815bar'; document.body.appendChild(el);
      const go = e => { const bt = e.target.closest && e.target.closest('[data-u8b]'); if (!bt) return; e.preventDefault(); e.stopPropagation();
        if (e.type === 'click' && performance.now() - (el._t || -1e9) < 600) return; if (e.type === 'touchstart') el._t = performance.now();
        const k = bt.dataset.u8b; AU.init(); emit('ui', { kind: 'ok' }); this.openSheet(this.sheet === k ? null : k); };
      el.addEventListener('touchstart', go, { passive: false }); el.addEventListener('click', go);
    }
    el.style.display = 'flex';
    const sel = !!(S.sel && S.sel.size);   // v8.15c: «⚡ Приказы» — только когда что-то выбрано
    const items = m === 'rts' ? [['build', '🔨', L('Строить', 'Build', 'Xây')], ['army', '◆', L('Армия', 'Army', 'Quân')], ...(sel ? [['ord', '⚡', L('Приказы', 'Orders', 'Lệnh')]] : []), ['map', '🗺', L('Карта', 'Map', 'Bản đồ')], ['log', '🔔', '']]
      : [['sq', '◆', L('Отряды', 'Squads', 'Đội')], ['map', '🗺', L('Карта', 'Map', 'Bản đồ')], ['log', '🔔', '']];
    const sig = m + '|' + this.sheet + '|' + this.unread + '|' + sel;
    if (el._s !== sig){ el._s = sig;
      el.innerHTML = items.map(([k, ic, n]) => `<button data-u8b="${k}" class="${this.sheet === k ? 'on' : ''}"><i>${ic}</i>${k === 'log' ? (this.unread ? `<em>${min(99, this.unread)}</em>` : '') : `<small>${n}</small>`}</button>`).join(''); }
    if (this.sheet && !items.find(i => i[0] === this.sheet)) this.openSheet(null);
  },
  openSheet(k){
    const b = document.body.classList;
    for (const s of ['build', 'army', 'map', 'sq', 'log', 'ord']) b.toggle('ui815o-' + s, k === s);
    this.sheet = k;
    if (k === 'log'){ this.unread = 0; this.renderLog(); } else { const l = $('u815log'); if (l) l.style.display = 'none'; }
    const el = $('u815bar'); if (el) el._s = '';
  },
  renderLog(){
    let el = $('u815log'); if (!el){ el = document.createElement('div'); el.id = 'u815log'; document.body.appendChild(el);
      const cl = e => { e.preventDefault(); e.stopPropagation(); this.openSheet(null); }; el.addEventListener('click', cl); el.addEventListener('touchstart', cl, { passive: false }); }
    const L = this.T, rows = this.log.slice(-30).reverse().map(l => `<div style="color:${l.c}"><i>${fmtTime(l.t)}</i> ${uixEsc(l.p)}${l.n > 1 ? ` <em>×${l.n}</em>` : ''}</div>`).join('');
    el.innerHTML = `<b>🔔 ${L('Сообщения', 'Messages', 'Tin nhắn')}</b>${rows || `<div>${L('пока пусто', 'nothing yet', 'chưa có')}</div>`}<small>${L('тап — закрыть', 'tap to close', 'chạm để đóng')}</small>`;
    el.style.display = 'block';
  },
  // тап по полю закрывает лист (кроме карты); после выбора в листе — закрыть
  fieldTap(e){
    if (!this.sheet || !this.simple() || !this.touch()) return;
    const t = e.target;
    if (t && (t.tagName === 'CANVAS')){ if (this.sheet !== 'map') this.openSheet(null); return; }
    if (t && t.closest && (t.closest('#g80') && this.sheet === 'army' || t.closest('#c85') && this.sheet === 'sq' || t.closest('#m74B') && this.sheet === 'build' || t.closest('#m74L') && this.sheet === 'army')){
      const bt = t.closest('button, .it, .c5cd, .gh, .qb'); if (bt && !(bt.classList.contains('c5ab'))) setTimeout(() => this.openSheet(null), 350);
    }
  },
  // ---- 🎥 1-е лицо (телефон, 3-е лицо)
  camBtn(){
    const c = !S.attract && S.mode === 'fps' && typeof ctrlEntity === 'function' ? ctrlEntity() : null;
    const tp = !!(c && c.cls === 'inf' && S.third && !S.freecam);
    if (this.tp0 !== undefined && tp !== this.tp0 && c && !S.attract && !MENU.isOpen()){ this.toast(tp ? (this.touch() ? this.T('Вид от 3-го лица — нажмите 🎥, чтобы вернуться', 'Third-person view — tap 🎥 to go back', 'Góc nhìn thứ ba — chạm 🎥 để quay lại') : this.T('Вид от 3-го лица — ' + this.key3() + ', чтобы вернуться', 'Third-person view — ' + this.key3() + ' to go back', 'Góc nhìn thứ ba — ' + this.key3())) : this.T('Вид от 1-го лица', 'First-person view', 'Góc nhìn thứ nhất')); if (tp) this.stats.third++; }
    this.tp0 = tp;
    if (!this.touch()) return;
    let b = $('u815cam');
    const show = tp && !MENU.isOpen() && !S.over;
    if (!b){ if (!show) return; b = document.createElement('button'); b.id = 'u815cam'; b.innerHTML = '🎥<small>' + this.T('1-е лицо', '1st person', 'ngôi 1') + '</small>'; document.body.appendChild(b);
      const go = e => { e.preventDefault(); e.stopPropagation(); S.third = false; SET.tpv76 = false; MENU.save(); };
      b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('click', go); }
    b.style.display = show ? 'flex' : 'none';
  },
  key3(){ const k = typeof keyLabel === 'function' ? keyLabel(SET.bind.third) : 'V'; return (typeof GP812 !== 'undefined' && GP812.active && GP812.active()) ? this.T('кнопка вида на геймпаде или ', 'the gamepad view button or ', '') + k : this.T('клавиша ', 'key ', 'phím ') + k; },
  toast(t){
    let el = $('u815toast'); if (!el){ el = document.createElement('div'); el.id = 'u815toast'; document.body.appendChild(el); }
    el.textContent = t; el.style.display = 'block'; el.style.opacity = '1';
    clearTimeout(this.toT); this.toT = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => { el.style.display = 'none'; }, 400); }, 3500);
  },
  // ---- плашка урока на телефоне: компактная, сворачивается в «?», уходит вниз, если закрывает цель
  lessonPlate(){
    const P = $('t72p'); if (!P) return;
    const on = typeof T72 !== 'undefined' && T72.on && P.style.display !== 'none';
    document.body.classList.toggle('u815les', on);
    if (!on) return;
    if (!P.querySelector('.u8min')){ const hd = P.querySelector('.hd'); if (hd){ const bt = document.createElement('button'); bt.className = 'u8min'; bt.textContent = '–'; hd.appendChild(bt);
        const go = e => { e.preventDefault(); e.stopPropagation(); P.classList.toggle('u815min'); }; bt.addEventListener('touchstart', go, { passive: false }); bt.addEventListener('click', go); } }
    if (!P._u8){ P._u8 = 1; const ex = e => { if (P.classList.contains('u815min')){ e.preventDefault(); e.stopPropagation(); P.classList.remove('u815min'); } }; P.addEventListener('touchstart', ex, { passive: false, capture: true }); P.addEventListener('click', ex, true); }
    if (!P._u8x && this.clean()){ P._u8x = 1;   // v8.15e: ✕ на плашке урока — свернуть подсказку, а не выйти из урока (Дмитрий 02.11 15:58)
      const cx = e => { const b = e.target.closest && e.target.closest('[data-t72="exit"]'); if (!b || P.classList.contains('u815min')) return; e.preventDefault(); e.stopPropagation();
        if (e.type === 'click' && performance.now() - (P._u8t || -1e9) < 600) return; if (e.type === 'touchstart') P._u8t = performance.now();
        P.classList.add('u815min'); this.toast(this.T('Подсказка свёрнута — «?» откроет её снова. Выйти из урока: ☰ → «Выйти из урока»', 'Hint hidden — tap «?» to open it. To leave the lesson: ☰ → «Leave lesson»', 'Đã ẩn gợi ý — chạm «?» để mở lại')); };
      P.addEventListener('touchstart', cx, { passive: false, capture: true }); P.addEventListener('click', cx, true); }
    const G = $('t72g'), r = P.getBoundingClientRect();
    let hit = false;
    for (const e of [G, ...document.querySelectorAll('.t72hl, .t72on')]){ if (!e || e === P || e.style.display === 'none') continue; const q = e.getBoundingClientRect(); if (!q.width) continue;
      if (q.left < r.right && r.left < q.right && q.top < r.bottom && r.top < q.bottom){ hit = true; break; } }
    if (hit && !P._hitT) { P._hitT = performance.now(); P.classList.toggle('u815bot', !P.classList.contains('u815bot')); }
    if (!hit) P._hitT = 0; else if (performance.now() - P._hitT > 1500) P._hitT = 0;
  },
  // ------------------------------------------------------------------ чёткие метки юнитов (Стратег / Командир)
  marks(){
    if (!this.clean() || S.attract || S.mode !== 'rts' || SET.mk815 === false || MENU.isOpen()) return;
    const W = innerWidth, H = innerHeight, R = K815.mk.r, CL = K815.mk.cluster;
    const pts = []; this.mkPts = pts;
    for (const e of S.units){
      if (!e || e.alive === false || pts.length > K815.mk.maxN * 2) continue;
      if (e.team === 1 && typeof fogHidden === 'function' && fogHidden(e)) continue;
      const p = project(e.pos); if (!p || p[0] < -20 || p[1] < -20 || p[0] > W + 20 || p[1] > H + 20) continue;
      pts.push({ e, x: p[0], y: p[1], z: p[2] });
    }
    // склейка по сетке при сильном отдалении
    const far = S.rts && S.rts.h > 60, cells = new Map(), out = [];
    for (const q of pts){
      if (!far){ out.push(q); continue; }
      const k = q.e.team + ':' + Math.floor(q.x / CL) + ':' + Math.floor(q.y / CL);
      const c = cells.get(k); if (c){ c.n++; c.x = (c.x * (c.n - 1) + q.x) / c.n; c.y = (c.y * (c.n - 1) + q.y) / c.n; } else { const o = Object.assign({ n: 1 }, q); cells.set(k, o); out.push(o); }
    }
    const g = octx; g.save(); g.lineWidth = 1.5; g.font = '700 9px "Exo 2", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const glyph = e => e.cls === 'builder' ? '⚒' : e.cls === 'tank' ? '■' : e.cls === 'drone' ? '✈' : (e.maxhp || 0) > 3000 ? '☠' : '•';
    let n = 0;
    for (const q of out){
      if (n++ > K815.mk.maxN) break;
      const e = q.e, mine = e.team === 0, col = mine ? (TEAM[0].css || '#7cf') : '#ff5a4a';
      const sel = mine && S.sel && (S.sel.has(groupOf(e)) || S.sel.has(e));
      const r = (q.n > 1 ? R + 3 : R) * (sel ? 1.25 : 1);
      g.beginPath(); g.arc(q.x, q.y - 10, r, 0, 2 * PI); g.fillStyle = mine ? 'rgba(8,24,40,.55)' : 'rgba(50,8,8,.6)'; g.fill(); g.strokeStyle = sel ? '#fff' : col; g.stroke();
      g.fillStyle = col; g.fillText(q.n > 1 ? String(q.n) : glyph(e), q.x, q.y - 9.5);
      const hp = e.maxhp ? e.hp / e.maxhp : 1;
      if ((hp < 0.98 || sel) && q.n === 1){ g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(q.x - 9, q.y - 10 - r - 5, 18, 3); g.fillStyle = hp > 0.5 ? '#7f7' : hp > 0.25 ? '#fd5' : '#f55'; g.fillRect(q.x - 9, q.y - 10 - r - 5, 18 * clamp(hp, 0, 1), 3); }
    }
    g.restore();
  },
  // «магнит»: тап рядом с меткой — точно в юнита
  snap(x, y, preferEnemy){
    const P = this.mkPts; if (!P || !P.length) return null;
    const sp = this.touch() ? K815.snapPx : K815.snapPc; let best = null, bd = sp * sp;
    for (const q of P){ const dx = q.x - x, dy = q.y - 10 - y, d = dx * dx + dy * dy - ((q.e.team === 1) === !!preferEnemy ? 200 : 0); if (d < bd){ bd = d; best = q; } }
    return best;
  },
  // ------------------------------------------------------------------ состояния прицеливания
  aimState(){
    if (this.forceSt) return this.forceSt;   // для тестов/скриншотов
    const c = S.me; if (!c || c.cls !== 'inf' || S.mode !== 'fps') return 'look';
    const sp = c.vel ? Math.hypot(c.vel[0], c.vel[1], c.vel[2]) : 0;
    const aim = typeof mouseR !== 'undefined' && !!mouseR;
    const mv = sp > K815.aim.speed;
    if (!mv) return aim || this.touch() ? 'still' : (this.lookT > 0 ? 'look' : 'still');
    return aim || (this.touch() && TOUCH.look) ? 'moveAim' : 'move';
  },
  reticle(dt){
    if (!this.on || SET.aim815 === false) return;
    let el = $('u815ret');
    const show = !S.attract && S.mode === 'fps' && S.me && S.me.cls === 'inf' && !MENU.isOpen() && !S.over;
    if (!el){ if (!show) return; el = document.createElement('div'); el.id = 'u815ret'; el.innerHTML = '<i></i><i></i><i></i><i></i><b></b><span></span>'; document.body.appendChild(el); }
    el.style.display = show ? 'block' : 'none'; if (!show) return;
    this.lookT = max(0, (this.lookT || 0) - dt);
    const st = this.aimState(); this.st = st;
    const want = K815.aim.gap[st] * (this.tp0 ? 1.1 : 1);
    this.gap = this.gap === undefined ? want : this.gap + (want - this.gap) * (1 - Math.exp(-dt * K815.aim.lerp));
    const sig = st + Math.round(this.gap * 2);
    if (el._s !== sig){ el._s = sig; el.style.setProperty('--g', this.gap.toFixed(1) + 'px'); el.className = 'st-' + st;
      el.querySelector('span').textContent = { still: this.T('◎ точно', '◎ precise', '◎ chính xác'), look: '', move: this.T('○ бег', '○ running', '○ chạy'), moveAim: this.T('◉ бег + прицел', '◉ run + aim', '◉ chạy + ngắm') }[st]; }
  },
};
UI815.load();
// =====================================================================
//  ВСТРАИВАНИЕ
// =====================================================================
if (UI815.on){
  const U = UI815, safe = (fn, t) => U.safe(fn, t);
  if (SET_DEF.ui815 === undefined) SET_DEF.ui815 = null;
  if (SET_DEF.fps815 === undefined) SET_DEF.fps815 = null;   // v8.15c
  // меню
  { const hm = MENU.html_main; MENU.html_main = function(){ return U.simple() ? U.main() : hm.apply(this, arguments); }; }
  { const hp = MENU.html_pause; MENU.html_pause = function(){ return U.clean() ? U.pause() : hp.apply(this, arguments); }; }
  { const hs = MENU.html_settings; MENU.html_settings = function(){ const h = hs.apply(this, arguments); return safe(() => U.injectSettings(h), 'inj') || h; }; }
  MENU.html_u815more = function(){ return U.more(); };
  MENU.html_u815set = function(){ return U.settings(); };
  if (MENU.html_t72){ const ht = MENU.html_t72; MENU.html_t72 = function(){ const h = ht.apply(this, arguments); return safe(() => U.t72(h), 't72') || h; }; }
  { const w0 = MENU.wire; MENU.wire = function(name){
      w0.apply(this, arguments);
      const el = $('screen'); if (!el) return;
      el.classList.toggle('u815scr', !!el.querySelector('.u815'));
      safe(() => U.wire(name), 'wire');
      el.querySelectorAll('[data-u8cyc]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = U.LV.indexOf(U.lvl()); U.setLevel(U.LV[(i + 1) % 3]); MENU.show(MENU.cur); });
      if (name === 't72'){ const d = el.querySelector('.u8det'); if (d) d.addEventListener('toggle', () => { U.t72open = d.open; }); }
    }; }
  { const as0 = applySettings; applySettings = function(){ const r = as0.apply(this, arguments); safe(() => U.apply(), 'apply'); return r; }; }
  // v8.15c: ограничение кадров только для главного цикла (frame)
  { const raf0 = window.requestAnimationFrame.bind(window); let last = 0;
    window.requestAnimationFrame = function(cb){
      if (typeof frame !== 'function' || cb !== frame) return raf0(cb);
      const step = t => { const c = U.fpsCap(); if (c && !S.attract && t - last < 1000 / c - 3){ raf0(step); return; } last = t; cb(t); };
      return raf0(step); }; }
  // ☰ в Шутере (Простой) = пауза
  if (typeof M67 !== 'undefined' && M67.toggleSheet){ const tg0 = M67.toggleSheet; M67.toggleSheet = function(v){
      if ((U.simple() || (U.clean() && U.tut())) && !S.attract && (v === true || (v === undefined && !this.open)))   /* v8.15b: в Простом и в уроках ☰ = чистая пауза во всех режимах */{ if (this.open) tg0.call(this, false); MENU.pause(); return; }
      return tg0.apply(this, arguments); }; }
  // закрытые режимы
  if (typeof V87M !== 'undefined'){
    const go0 = V87M.go; V87M.go = function(m){ if (!U.raw && U.simple() && !U.rv(m)){ U.stats.blocked++; if (m === 'rts' && !U.card && !S.attract) U.showCard('rts'); return false; } return go0.apply(this, arguments); };
    const ok0 = V87M.cmdOk; V87M.cmdOk = function(){ return ok0.apply(this, arguments) && U.rv('cmd'); };
  }
  // сообщения: журнал всегда; в Стратеге/Командире на телефоне (Простой) — одна строка
  { const fd0 = feed; feed = function(text, color){ safe(() => U.push(text, color), 'push'); return fd0.apply(this, arguments); }; }
  if (typeof HINTS !== 'undefined'){ const sh0 = HINTS.show; HINTS.show = function(id, text, kbd, act, force){
      if (!force && U.clean() && !S.attract && S.mode === 'rts' && !U.tut()){ if (!this._u8 || !this._u8[id]){ (this._u8 = this._u8 || {})[id] = 1; safe(() => U.push(text, '#ffd27a'), 'hpush'); } return false; }
      return sh0.apply(this, arguments); }; }
  { const nm0 = newMatch; newMatch = function(opts){ const r = nm0.apply(this, arguments); if (!opts || !opts.attract){ U.log = []; U.unread = 0; U.nextOffer = 0; U.rtsT = 0; U.hideCard(); U.openSheet(null); } return r; }; }
  // кадр
  { const uf0 = uixFrame; uixFrame = function(dt){ uf0.apply(this, arguments); safe(() => U.frame(dt), 'frame'); safe(() => U.marks(), 'marks'); safe(() => U.reticle(dt || 0.016), 'ret'); }; }
  addEventListener('touchstart', e => safe(() => U.fieldTap(e), 'ftap'), { capture: true, passive: true });
  addEventListener('click', e => safe(() => U.fieldTap(e), 'ftap'), true);
  addEventListener('mousemove', e => { if (S.mode === 'fps' && (Math.abs(e.movementX) + Math.abs(e.movementY) > 6)) U.lookT = 0.25; }, true);
  // разброс по состоянию (только свой боец-пехотинец)
  if (typeof gunSpread === 'function'){ const gs0 = gunSpread; gunSpread = function(u, W, K){ const s = gs0.apply(this, arguments);
      if (u !== S.me || SET.aim815 === false || !u || u.cls !== 'inf') return s; const st = U.st || 'still'; return s * (K815.aim[st] || 1); }; }
  // «магнит» тапа: Стратег на телефоне — pickEntity получает юнит рядом с меткой
  if (typeof pickEntity === 'function'){ const pe0 = pickEntity; pickEntity = function(x, y){
      const r = pe0.apply(this, arguments);
      if (r || !U.clean() || S.mode !== 'rts' || SET.mk815 === false || typeof x !== 'number') return r;
      const q = U.snap(x, y, false); if (q){ U.stats.snaps++; return q.e; } return r; }; }
  // крупные «летающие» надписи экономики (например «экстрактор работает») — в журнал, не поверх поля (телефон)
  if (typeof ecoFloat === 'function'){ const ef0 = ecoFloat; ecoFloat = function(pos, text, col){ if (U.clean() && U.touch() && S.mode === 'rts' && !S.attract && typeof text === 'string' && text.length > 8){ safe(() => U.push(text, col), 'eco'); return; } return ef0.apply(this, arguments); }; }
  // 3-е лицо + прицел (ПКМ / LT / прицел на телефоне): камера плавно ближе, через правое плечо
  if (typeof setupCamera === 'function' && typeof TPV76 !== 'undefined'){ const sc0 = setupCamera; setupCamera = function(dt){ sc0.apply(this, arguments); safe(() => {
      const c = ctrlEntity(), cam = S.cam; if (!cam || !c || !TPV76.on() || SET.aim815 === false){ U.sh = 0; return; }
      const aim = typeof mouseR !== 'undefined' && !!mouseR; U.sh = (U.sh || 0) + ((aim ? 1 : 0) - (U.sh || 0)) * (1 - Math.exp(-(dt || 0.016) * 10)); if (U.sh < 0.01) return;
      const head = add(add(c.pos, mul(c.up, 1.35)), mul(cam.right, K815.aim.shoulder));
      let p = add(cam.pos, mul(sub(head, cam.pos), U.sh * K815.aim.closer)); if (typeof pullCam === 'function') p = pullCam(add(c.pos, mul(c.up, 1.2)), p); cam.pos = p; }, 'sh'); }; }
  // миникарты Стратега/Командира на телефоне — по кнопке 🗺
  if (typeof mmCenters === 'function'){ const mc0 = mmCenters; mmCenters = function(){ const r = mc0.apply(this, arguments);
      if (U.clean() && U.touch() && S.mode === 'rts' && !S.attract && U.sheet !== 'map') return [[-9999, -9999], [-9999, -9999]]; return r; }; }
  // в обычных и полных уровнях — без изменений; модуль выключен (?ui815=0) — ничего не подменено
}
// версия (как в v8.11–v8.13; модуль выключен — тоже v8.15, сборка та же)
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.15'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.15'; }
// ---------------------------------------------------------------- стили
(function(){ if (!UI815.on) return; const st = document.createElement('style'); st.id = 'ui815css'; st.textContent = `
  #screen.u815scr{align-items:center;justify-content:center}
  .u815{display:flex;flex-direction:column;align-items:stretch;gap:12px;width:min(560px,92vw);max-height:100%;overflow:auto;padding:10px 4px;font-family:"Exo 2",sans-serif}
  .u815 .u8hd{display:flex;align-items:baseline;justify-content:center;gap:12px;position:relative}
  .u815 h1{margin:0;font:400 clamp(26px,6vw,44px) "Russo One",sans-serif;letter-spacing:.06em;color:#e8dcb8}
  .u815 h2{margin:0;font:400 24px "Russo One",sans-serif;color:#e8dcb8}
  .u815 .u8v{opacity:.6;font-size:12px}
  .u815 .u8bk{position:absolute;left:0;top:-4px;min-height:44px;padding:0 14px;margin:0}
  .u815 button{margin:0;min-height:52px;border-radius:12px;border:1px solid rgba(214,198,154,.45);background:rgba(12,14,16,.72);color:#f0e8d0;font:600 16px "Exo 2",sans-serif;cursor:pointer;touch-action:manipulation}
  .u815 button.cur{background:rgba(214,198,154,.85);color:#111;border-color:#e8dcb8}
  .u815 .u8big{display:flex;align-items:center;gap:16px;min-height:92px;padding:10px 22px;text-align:left;background:linear-gradient(90deg,rgba(214,198,154,.38),rgba(214,198,154,.1));border:1.5px solid #e8dcb8;box-shadow:0 0 24px rgba(214,198,154,.2)}
  .u815 .u8big i{font-style:normal;font-size:38px} .u815 .u8big b{display:block;font:400 30px "Russo One",sans-serif;letter-spacing:.04em} .u815 .u8big small{display:block;font-size:13px;opacity:.8}
  .u815 .u8row{display:flex;gap:10px} .u815 .u8row button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 10px}
  .u815 .u8row i{font-style:normal;font-size:18px}
  .u815 .u8list{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
  .u815 .u8it{display:flex;align-items:center;gap:10px;padding:6px 12px;text-align:left;min-height:52px}
  .u815 .u8it svg,.u815 .u8it .ic71{width:22px;height:22px;flex:none;fill:currentColor} .u815 .u8it b{font-weight:600} .u815 .u8it small{margin-left:auto;font-size:11px;opacity:.6}
  .u815 .u8it .p71new,.u815 .u8it em{font-size:10px}
  .u815 .u8lvrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap} .u815 .u8lvrow span{opacity:.75;margin-right:4px} .u815 .u8lvrow button{flex:1;min-height:48px}
  .u815 .u8grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .u815 .u8st,.u815 .u8ch{display:flex;align-items:center;gap:6px;padding:4px;border-radius:12px;background:rgba(12,14,16,.55);border:1px solid rgba(214,198,154,.2)}
  .u815 .u8st span{flex:1;text-align:center} .u815 .u8st small,.u815 .u8ch small{display:block;font-size:11px;opacity:.7} .u815 .u8st b{font-size:16px}
  .u815 .u8st button{width:52px;font-size:24px}
  .u815 .u8ch{flex-direction:column;align-items:stretch} .u815 .u8ch span{display:flex;gap:4px;flex-wrap:wrap} .u815 .u8ch span button{flex:1;min-height:48px;font-size:14px;padding:0 6px}
  .u815 .u8ch:last-child{grid-column:span 2}
  @media (max-height:430px){ .u815{gap:8px;width:min(720px,94vw)} .u815 .u8big{min-height:76px} .u815 .u8big b{font-size:26px} .u815main h1{font-size:30px} }
  @media (max-width:480px){ .u815 .u8row{flex-wrap:wrap} .u815 .u8row button{flex:1 1 40%} .u815 .u8grid{grid-template-columns:1fr} .u815 .u8ch:last-child{grid-column:auto} }
  /* Обучение: три главных урока */
  /* v8.15c: 👁 чистый вид, приказы по кнопке, портрет без лишних панелей */
  #u815eye{display:none;position:fixed;z-index:31;right:calc(var(--sr,0px) + 6px);top:calc(var(--st,0px) + 58px);width:48px;height:48px;border-radius:50%;border:1px solid rgba(214,198,154,.55);background:rgba(10,12,14,.6);color:#f0e8d0;flex-direction:column;align-items:center;justify-content:center;font-size:18px;line-height:1;touch-action:manipulation}
  #u815eye small{font:700 8px "Exo 2";margin-top:1px} #u815eye.on{background:rgba(214,198,154,.85);color:#111}
  body.ui815s.u8eyeok #touch .v61v{display:none!important}
  body.u8eyeok.ui815m-rts #u815eye, body.u8eyeok.ui815m-cmd #u815eye{top:calc(var(--st,0px) + 58px)}
  body.u8eye.u8eyeok #u815bar, body.u8eye.u8eyeok #m71rail, body.u8eye.u8eyeok #card, body.u8eye.u8eyeok #m71sq, body.u8eye.u8eyeok #c85, body.u8eye.u8eyeok #feed, body.u8eye.u8eyeok #obj,
  body.u8eye.u8eyeok #m71pl, body.u8eye.u8eyeok #kit, body.u8eye.u8eyeok #u815line, body.u8eye.u8eyeok #g80, body.u8eye.u8eyeok #m74B, body.u8eye.u8eyeok #m74L, body.u8eye.u8eyeok #r61cards,
  body.u8eye.u8eyeok #f76hint, body.u8eye.u8eyeok #c89, body.u8eye.u8eyeok #touch .m67n, body.u8eye.u8eyeok #m71rad, body.u8eye.u8eyeok #m67rail, body.u8eye.u8eyeok #m71mmb, body.u8eye.u8eyeok #intro88, body.u8eye.u8eyeok #t88, body.u8eye.u8eyeok #hint{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translate(40vw,-40vh) scale(.2)!important;transition:opacity .25s,transform .3s,visibility 0s .3s!important}
  body.ui815s.ui815t.u815les #m71rail:not(.u8tgt), body.ui815s.ui815t.u815les #card .cmds:not(.u8tgt), body.ui815s.ui815t.u815les #m71sq:not(.u8tgt){display:none!important}
  body.u8eyeok #m71rail{top:calc(var(--st,0px) + 112px)!important}
  .u815pause .u8les2{margin-top:10px;text-align:center} .u815pause .u8les2 small{display:block;font:500 13px "Exo 2",sans-serif;color:#cfc6ad;margin-bottom:6px} .u815pause .u8les2 button.cur{border-color:#ffd27a;color:#ffd27a}
  body.ui815s.ui815t.ui815m-rts:not(.u815les):not(.ui815o-army) #m71rail, body.ui815s.ui815t.ui815m-rts:not(.u815les):not(.ui815o-army) #m71sq{display:none!important}
  body.ui815s.ui815t.ui815m-rts:not(.u815les):not(.ui815o-ord) #card .cmds{display:none!important}
  body.ui815s.ui815t.ui815m-rts.ui815o-ord #card .cmds{display:flex!important}
  @media (orientation:portrait){ body.ui815s.ui815t #card{max-width:72vw} body.ui815s.ui815t #card .poss{min-height:44px!important;padding:4px 10px!important} body.ui815s.ui815t #card .poss small{display:none} }
  /* v8.15b: язык и три режима в главном меню */
  .u815main .u8hd{position:relative} .u815main .u8lang{position:absolute;right:0;top:0;min-height:40px;padding:0 12px;border-radius:10px;background:rgba(20,22,26,.85);border:1px solid rgba(214,198,154,.5);color:#f0e8d0;font:600 14px "Exo 2",sans-serif}
  .u815main .u8langs{flex-wrap:wrap;gap:6px;justify-content:flex-end;margin:-4px 0 6px} .u815main .u8langs button{min-height:40px;padding:0 12px;border-radius:10px;background:rgba(20,22,26,.9);border:1px solid rgba(214,198,154,.4);color:#f0e8d0;font:600 14px "Exo 2",sans-serif} .u815main .u8langs button.cur{border-color:#ffd27a;color:#ffd27a}
  .u815main .u8mdh{font:500 13px "Exo 2",sans-serif;color:#cfc6ad;margin:8px 2px 6px;text-align:center}
  .u815main .u8mds{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}
  .u815main .u8md{display:flex;align-items:center;gap:8px;text-align:left;min-height:64px;padding:8px 10px;border-radius:12px;background:rgba(20,22,26,.85);border:1px solid rgba(214,198,154,.45);color:#f0e8d0}
  .u815main .u8md i{font-style:normal;font-size:26px;color:#ffd27a} .u815main .u8md b{display:block;font:400 16px "Russo One",sans-serif} .u815main .u8md small{display:block;font:500 12px "Exo 2",sans-serif;color:#cfc6ad} .u815main .u8md em{display:block;font:600 11px "Exo 2",sans-serif;font-style:normal;color:#9fd18b;margin-top:2px}
  .u815main .u8md.u8first{border-color:#ffd27a;box-shadow:0 0 0 2px rgba(255,210,122,.35);animation:u8pulse 1.6s ease-in-out infinite} @keyframes u8pulse{50%{box-shadow:0 0 0 5px rgba(255,210,122,.12)}} .u815main .u8md.u8first em{color:#ffd27a}
  @media (max-aspect-ratio:1/1){ .u815main .u8mds{grid-template-columns:1fr} .u815main .u8md{min-height:54px} }
  @media (max-height:420px){ .u815main .u8big{min-height:58px!important} .u815main h1{font-size:22px!important;margin:0!important} .u815main .u8mdh{margin:4px 2px 4px} }
  .t72menu .grid.u8three{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  #screen .t72tile.u8les .u8lic{font-style:normal;font-size:30px;color:#ffd27a}
  .t72menu .u8det{margin-top:4px} .t72menu .u8det summary{cursor:pointer;font:400 16px "Russo One",sans-serif;color:#ffd23f;min-height:40px;display:flex;align-items:center;gap:6px}
  .t72menu .u8det summary small{font:400 12px "Exo 2",sans-serif;color:#cfc6ad}
  body.ui815s .t72menu .grid.u8oth, body.ui815s .t72menu [data-t72o], body.ui815s .t72menu #m_t72old{display:none}
  /* Простой: Шутер */
  body.ui815s.ui815t #m67n, body.ui815s.ui815t #touch .tt .m67n, body.ui815s #s78, body.ui815s #m73ox, body.ui815s #m74eye, body.ui815s #who73, body.ui815s #m74mode, body.ui815s #cur{display:none!important}
  body.ui815s:not(.ui815r-rts) #touch .tt [data-t="map"], body.ui815s:not(.ui815r-rts) #m87{display:none!important}
  body.ui815s:not(.ui815r-cmd) #c85go{display:none!important}
  body.ui815s.ui815m-fps #feed > div:not(:nth-last-child(-n+2)){display:none}
  body.ui815s #obj{font-size:13px} body.ui815s.ui815t #obj small, body.ui815s.ui815t #obj .sub{display:none}
  body.u815pulse #touch .tt [data-t="map"], body.u815pulse #m87{animation:u815p 1s ease-in-out infinite;box-shadow:0 0 0 3px #ffd27a}
  @keyframes u815p{50%{box-shadow:0 0 0 8px rgba(255,210,122,.25)}}
  /* карточка предложения и 3 шага */
  #u815card{display:none;position:fixed;z-index:40;left:50%;top:calc(var(--st,0px) + 54px);transform:translateX(-50%);width:min(440px,80vw);flex-direction:column;gap:6px;padding:12px 14px;border-radius:14px;background:rgba(14,16,18,.94);border:1.5px solid #ffd27a;color:#f0e8d0;font:14px "Exo 2",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6)}
  #u815card b{font:400 18px "Russo One",sans-serif;color:#ffd27a} #u815card div{display:flex;gap:10px;margin-top:4px}
  #u815card button{flex:1;min-height:48px;border-radius:10px;border:1px solid rgba(214,198,154,.6);background:rgba(255,255,255,.06);color:#fff;font:700 16px "Exo 2";margin:0}
  #u815card button[data-u8y="1"]{background:#ffd27a;color:#111}
  #u815tour{display:none;position:fixed;inset:0;z-index:60;align-items:center;justify-content:center;background:rgba(0,0,0,.6)}
  #u815tour .u8tc{width:min(420px,86vw);padding:16px 18px;border-radius:16px;background:#121416;border:1.5px solid #ffd27a;color:#f0e8d0;font:15px/1.4 "Exo 2",sans-serif;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
  #u815tour i{font-style:normal;font-size:40px;color:#ffd27a} #u815tour b{font:400 22px "Russo One",sans-serif} #u815tour p{margin:0} #u815tour small{opacity:.6}
  #u815tour button{min-height:50px;min-width:160px;border-radius:12px;border:none;background:#ffd27a;color:#111;font:700 17px "Exo 2";margin:4px 0 0}
  /* 🎥 и тост */
  #u815cam{display:none;position:fixed;z-index:30;right:calc(var(--sr,0px) + 10px);top:calc(var(--st,0px) + 108px);width:56px;height:56px;flex-direction:column;align-items:center;justify-content:center;border-radius:14px;background:rgba(214,198,154,.85);border:none;color:#111;font-size:22px;padding:0;pointer-events:auto;touch-action:manipulation}
  #u815cam small{font:700 9px "Exo 2"}
  #u815toast{display:none;position:fixed;z-index:45;left:50%;top:22%;transform:translateX(-50%);padding:8px 14px;border-radius:10px;background:rgba(10,12,14,.88);border:1px solid rgba(214,198,154,.6);color:#f0e8d0;font:600 14px "Exo 2",sans-serif;transition:opacity .4s;pointer-events:none;max-width:80vw;text-align:center}
  /* Простой, телефон: Стратег / Командир — поле главное */
  #u815line{display:none;position:fixed;z-index:24;left:calc(50% + 40px);top:calc(var(--st,0px) + 4px);transform:translateX(-50%);max-width:40vw;padding:3px 10px;border-radius:8px;background:rgba(8,10,12,.62);font:600 12px/1.3 "Exo 2",sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
  #u815bar{display:none;position:fixed;z-index:29;left:calc(var(--sl,0px) + 4px);top:50%;transform:translateY(-50%);flex-direction:column;gap:6px}
  #u815bar button{position:relative;width:50px;height:50px;margin:0;padding:0;border-radius:12px;border:1px solid rgba(214,198,154,.45);background:rgba(10,12,14,.6);color:#f0e8d0;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation}
  #u815bar button.on{background:rgba(214,198,154,.8);color:#111} #u815bar i{font-style:normal;font-size:18px;line-height:1} #u815bar small{font:700 8px "Exo 2";margin-top:2px}
  #u815bar em{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#e33;color:#fff;font:700 10px/18px "Exo 2";font-style:normal}
  #u815log{display:none;position:fixed;z-index:35;left:calc(var(--sl,0px) + 62px);top:calc(var(--st,0px) + 8px);bottom:8px;width:min(420px,60vw);overflow:auto;padding:8px 12px;border-radius:12px;background:rgba(10,12,14,.92);border:1px solid rgba(214,198,154,.4);font:13px/1.35 "Exo 2",sans-serif}
  #u815log b{display:block;color:#ffd27a;margin-bottom:4px} #u815log i{opacity:.5;font-style:normal;font-size:11px} #u815log div{padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)} #u815log small{display:block;opacity:.5;margin-top:4px}
  body.ui815c:not(.u815les).ui815m-rts #feed, body.ui815c:not(.u815les).ui815m-cmd #feed,
  body.ui815c.ui815m-rts #hint, body.ui815c.ui815m-cmd #hint, body.ui815c.ui815m-rts #m73hx, body.ui815c.ui815m-cmd #m73hx,
  body.ui815c.ui815m-rts #c89, body.ui815c.ui815m-cmd #c89, body.ui815c.ui815m-rts #m73cx, body.ui815c.ui815m-rts #cur, body.ui815c.ui815m-cmd #cur{display:none!important}
  body.ui815c:not(.ui815t) #u815line{left:50%;top:76px;max-width:46vw;font-size:13px}
  body.ui815c.ui815t.ui815m-rts:not(.ui815o-army) #g80, body.ui815c.ui815t.ui815m-rts:not(.ui815o-build) #m74B, body.ui815c.ui815t.ui815m-rts:not(.ui815o-army) #m74L, body.ui815c.ui815t.ui815m-rts #obj, body.ui815c.ui815t.ui815m-cmd #obj, body.ui815c.ui815t.ui815m-rts #f76hint, body.ui815c.ui815t.ui815m-cmd #f76hint,
  body.ui815c.ui815t.ui815m-rts:not(.ui815o-map) #m71mmb, body.ui815c.ui815t.ui815m-cmd:not(.ui815o-map) #m71mmb,
  body.ui815c.ui815t.ui815m-cmd:not(.ui815o-sq) #c85 .c5cds, body.ui815c.ui815t.ui815m-cmd:not(.ui815o-sq) #c85 .c5cd{display:none!important}
  body.ui815c.ui815t.ui815m-cmd #c85 .c5ab{width:48px!important;height:48px!important}
  @media (orientation:portrait){ #u815line{left:50%;top:calc(var(--st,0px) + 58px);max-width:88vw} }
  body.ui815c.ui815t.ui815m-rts.ui815o-army #g80{left:calc(var(--sl,0px) + 62px)!important;right:auto!important;top:calc(var(--st,0px) + 54px)!important;z-index:34}
  body.ui815c.ui815t.ui815m-cmd #c85 .c5hd, body.ui815c.ui815t.ui815m-cmd #c85:not(:has(.c5ab.aim)) .c5tip{display:none!important}
  body.ui815c.ui815m-rts #uxtoasts, body.ui815c.ui815m-cmd #uxtoasts, body.ui815c.ui815m-rts #banner, body.ui815c.ui815m-cmd #banner{display:none!important}
  body.ui815c.ui815t.ui815m-rts #m74go{right:calc(var(--sr,0px) + 60px)!important;left:auto!important;top:calc(var(--st,0px) + 6px)!important}
  body.tab812.ui815c.ui815t.ui815m-rts #m74go{right:calc(var(--sr,0px) + 88px)!important;transform-origin:top right}
  body.ui815s.ui815t.u815les #hint, body.ui815c.u815les #cur, body.ui815c.u815les #c89, body.ui815c.u815les #s78{display:none!important}
  body.ui815c.u815les #feed > div:not(:last-child){display:none}
  /* плашка урока на телефоне — компактная */
  body.ui815t.t72phone #t72p{max-height:20vh;overflow:hidden;padding:4px 8px 5px!important}
  body.ui815t.t72phone #t72p .dots{display:none} body.ui815t.t72phone #t72p h4{font-size:13px!important;margin:0!important;display:inline}
  body.ui815t.t72phone #t72p .how{font-size:12px!important;line-height:1.25!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  body.ui815t.t72phone #t72p .how kbd, body.ui815t.t72phone #t72p .how .ms{display:none}
  body.ui815t.t72phone #t72p .hd button{height:30px!important;min-width:34px!important}
  body.ui815t.t72phone #t72p.u815bot{top:auto!important;bottom:calc(var(--sb,0px) + 6px)!important}
  body.ui815c #t72p .u8min{display:none!important}
  body.ui815c #t72p.u815min{width:44px!important;height:44px!important;padding:0!important;border-radius:50%!important;overflow:hidden;left:calc(var(--sl,0px) + 6px)!important;transform:none!important}
  body.ui815c #t72p.u815min > *{display:none!important} body.ui815c #t72p.u815min::after{content:'?';display:flex;align-items:center;justify-content:center;width:44px;height:44px;font:700 22px "Exo 2";color:#ffd23f}
  /* прицел по состоянию */
  #u815ret{display:none;position:fixed;left:50%;top:50%;width:0;height:0;z-index:12;pointer-events:none;--g:8px}
  #u815ret i{position:absolute;background:rgba(255,255,255,.85);box-shadow:0 0 2px #000;transition:none}
  #u815ret i:nth-child(1){width:2px;height:7px;left:-1px;top:calc(-1 * var(--g) - 7px)} #u815ret i:nth-child(2){width:2px;height:7px;left:-1px;top:var(--g)}
  #u815ret i:nth-child(3){height:2px;width:7px;top:-1px;left:calc(-1 * var(--g) - 7px)} #u815ret i:nth-child(4){height:2px;width:7px;top:-1px;left:var(--g)}
  #u815ret b{position:absolute;width:3px;height:3px;left:-1.5px;top:-1.5px;border-radius:50%;background:#fff;opacity:0}
  #u815ret.st-still b{opacity:1} #u815ret.st-still i{background:#9fffb0} #u815ret.st-move i{background:rgba(255,200,140,.7)}
  #u815ret span{position:absolute;left:14px;top:26px;white-space:nowrap;font:700 10px "Exo 2",sans-serif;color:rgba(255,255,255,.75);text-shadow:0 0 3px #000}
  body.ui815s #u815ret span{display:none}
`; document.head.appendChild(st); })();
