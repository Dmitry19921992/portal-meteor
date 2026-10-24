// =====================================================================
//  v7.5 — общие правки (фидбек 24.10): без ядра и тоннелей, телефон (👁, магнит, «Слезть»),
//  обучения по устройству, одно меню «Разработчик» (режим + арсенал + полигон), версия и «Новое в v7.5».
// =====================================================================
const V75 = {
  err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('v75 ' + tag, e); } } },
  phone(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  // экраны меню телефона (P71M) строятся отдельно — ПК-обёртки MENU.html_* их не трогают
  pm(){ return typeof P71M !== 'undefined' && P71M.on(); },
};
// ---------------------------------------------------------------------
//  1. Ядра нет: медаль «Покоритель ядра» и шутка про шахту — не показываем
// ---------------------------------------------------------------------
if (NOCORE75){
  V75.safe(() => { if (typeof MEDALS !== 'undefined' && MEDALS.core) Object.defineProperty(MEDALS, 'core', { value: MEDALS.core, enumerable: false, configurable: true, writable: true }); }, 'medal');
  V75.safe(() => { if (typeof CHAT !== 'undefined' && CHAT.banter) CHAT.banter = CHAT.banter.filter(l => !/шахт/i.test(l[0])); }, 'chat');
}
// ---------------------------------------------------------------------
//  2. ТЕЛЕФОН: магнит по режимам стиков (настраивается), «Слезть» за пушкой, 👁 оставляет нужное
// ---------------------------------------------------------------------
const MAG75 = {
  DEF: { L: 1, R: 1.8, LR: 0.5 },
  get(m){ const v = SET.mag75 && SET.mag75[m]; return typeof v === 'number' ? v : this.DEF[m]; },
  set(m, v){ SET.mag75 = Object.assign({}, this.DEF, SET.mag75 || {}); SET.mag75[m] = Math.round(clamp(v, 0, 3) * 10) / 10; MENU.save(); },
  active(){ return typeof M74 !== 'undefined' && M74.on() && M74.inf() && S.mode === 'fps' && !S.attract; },
};
if (typeof AIMA !== 'undefined' && typeof M74 !== 'undefined'){
  const base = () => [0, 0.45, 0.75, 1][AIMA.lvl()] || 0;
  const k74 = AIMA.K.bind(AIMA);
  // сила: только левый — как было × множитель; только правый — заметно сильнее (по умолчанию ×1.8 вместо ×1.3 в v7.4); оба — слабее
  AIMA.K = function(){
    if (!MAG75.active()) return k74();
    const k = base(), m = M74.mode;
    return m === 'R' ? max(k, 1) * MAG75.get('R') : m === 'LR' ? k * MAG75.get('LR') : k * MAG75.get('L');
  };
  // радиус: конус «прилипания» шире пропорционально множителю режима
  const sc0 = AIMA.scan.bind(AIMA);
  AIMA.scan = function(eye, fwd, team, cone, maxD){
    if (MAG75.active()){ const mm = MAG75.get(M74.mode === 'R' ? 'R' : M74.mode === 'LR' ? 'LR' : 'L'); if (mm > 1){ cone *= 1 + 0.6 * (mm - 1); maxD = (maxD || 160) * (1 + 0.15 * (mm - 1)); } }
    return sc0(eye, fwd, team, cone, maxD);
  };
}
// кнопка «Войти» за пушкой машины → «Слезть»
if (typeof M71 !== 'undefined' && typeof V74 !== 'undefined'){
  const lb0 = M71.label;
  M71.label = function(b, k, ctx){
    if (k === 'interact' && ctx === 'inf' && V74.seat){
      const I = (this.ICON.veh && this.ICON.veh.interact) || (this.ICON.inf && this.ICON.inf.interact);
      const h = `${I ? IC71(I) : '⏏'}<small>${tr('Слезть', 'Get off', 'Xuống', 'לרדת')}</small>`;
      if (b._m67h !== h){ b._m67h = h; b.innerHTML = h; }
      b.dataset.full = tr('Слезть с пушки', 'Get off the gun', 'Xuống khỏi súng', 'לרדת מהתותח');
      return true;
    }
    return lb0.apply(this, arguments);
  };
  let was = false;
  const f0 = M71.frame;
  M71.frame = function(dt){ const r = f0.apply(this, arguments); const s = !!V74.seat; if (s !== was){ was = s; V75.safe(() => { if (typeof M67 !== 'undefined') M67.sig = ''; document.querySelectorAll('#touch button').forEach(b => { b._m67h = ''; }); }, 'relabel'); } return r; };
}
// 👁 скрыть интерфейс: видимыми остаются ранец, ⇆, стики, сама 👁 и навигационный маркер задачи
V75.navOnly = function(){
  const c = ctrlEntity(); if (!c || !S.cam) return;
  const t = TACT.task;
  if (MISSION.navVisible() && navPts.length){
    const tt = performance.now() / 600, col = MISSION.navColor();
    octx.lineWidth = 2.5;
    for (let i = 0; i < navPts.length - 1; i++){
      const a = project(navPts[i]), b = project(navPts[i + 1]); if (!a || !b) continue;
      const ph = (i * 0.35 - tt) % 1, fade = 0.75 * (1 - i / navPts.length) * (0.45 + 0.55 * (ph < 0 ? ph + 1 : ph));
      const dx = b[0] - a[0], dy = b[1] - a[1], L = hypot(dx, dy); if (L < 1) continue;
      const ux = dx / L, uy = dy / L, sz = clamp(260 / a[2], 3, 16);
      octx.strokeStyle = `rgba(${col},${fade.toFixed(3)})`; octx.beginPath();
      octx.moveTo(a[0] - ux * sz + uy * sz * 0.8, a[1] - uy * sz - ux * sz * 0.8); octx.lineTo(a[0], a[1]); octx.lineTo(a[0] - ux * sz - uy * sz * 0.8, a[1] - uy * sz + ux * sz * 0.8); octx.stroke();
    }
  }
  MISSION.drawObjMarker(c);
};
{ const do0 = drawOverlay;
  drawOverlay = function(dt){
    if (V75.phone() && typeof M74 !== 'undefined' && M74.nohud && S.mode === 'fps' && !S.attract && !OPER.on){ octx.clearRect(0, 0, innerWidth, innerHeight); V75.safe(() => V75.navOnly(), 'nav'); return; }
    return do0.apply(this, arguments);
  }; }
// ---------------------------------------------------------------------
//  3. Телефон → Настройки → Управление: «Расширенные: магнит прицела» (3 режима стиков)
// ---------------------------------------------------------------------
if (typeof P71M !== 'undefined'){
  const sec0 = P71M.sec;
  P71M.sec = function(k){
    let h = sec0.apply(this, arguments);
    if (k !== 's_ctl' || !V75.phone()) return h;
    const row = (m, lab) => `<div class="p71s"><button data-p75mag="${m}" data-d="-1">${IC71('minus')}</button><span><small>${uixEsc(lab)}</small><b>×${MAG75.get(m).toFixed(1)}</b></span><button data-p75mag="${m}" data-d="1">${IC71('plus')}</button></div>`;
    // одна кнопка «Расширенные: магнит ▸» в ту же сетку — сами ползунки на своём экране (без прокрутки)
    const add = `<button class="p71o" data-p75mag="open"><span>${uixEsc(tr('Расширенные: магнит прицела ▸', 'Advanced: aim magnet ▸', 'Nâng cao: hút ngắm ▸', 'מתקדם: מגנט כוונת ▸'))}</span><b>${['L', 'R', 'LR'].map(m => MAG75.get(m).toFixed(1)).join(' · ')}</b></button>`;
    const k2 = '</div><div class="p71ft">';
    return h.includes(k2) ? h.replace(k2, add + k2) : h;
  };
  V75.magRow = function(m, lab){ return `<div class="p71s"><button data-p75mag="${m}" data-d="-1">${IC71('minus')}</button><span><small>${uixEsc(lab)}</small><b>×${MAG75.get(m).toFixed(1)}</b></span><button data-p75mag="${m}" data-d="1">${IC71('plus')}</button></div>`; };
  MENU.html_p75mag = function(){
    const R = V75.magRow;
    return `<div class="p71 p71sec">${P71M.hd(tr('Магнит прицела', 'Aim magnet', 'Hút ngắm', 'מגנט כוונת'), true)}<div class="p71g c2 rows">` +
      R('L', tr('● только левый палец (авто)', '● left finger only (auto)', '● chỉ ngón trái (tự động)', '● רק אצבע שמאל (אוטו)')) +
      R('R', tr('◎ только правый (прицел) — сила и радиус', '◎ right only (aim) — strength & radius', '◎ chỉ phải (ngắm)', '◎ רק ימין (כוונת)')) +
      R('LR', tr('○ оба пальца (свободно)', '○ both fingers (free)', '○ cả hai (tự do)', '○ שתי אצבעות (חופשי)')) +
      `<button class="p71o" data-p75mag="reset"><span>${uixEsc(tr('Сбросить: 1 · 1.8 · 0.5', 'Reset: 1 · 1.8 · 0.5', 'Đặt lại', 'איפוס'))}</span><b>↺</b></button></div></div>`;
  };
  { const w0 = MENU.wire; MENU.wire = function(name){ w0.apply(this, arguments); if (name === 'p75mag'){ const b = $('m_back'); if (b) b.onclick = e => { e.stopPropagation(); MENU.back(); }; } }; }
}
{ // клики по ± магнита (капча: и мышь, и касание; общий обработчик меню не мешает)
  let at = -1e9;
  const go = b => {
    const m = b.dataset.p75mag;
    if (m === 'open'){ emit('ui', { kind: 'ok' }); MENU.show('p75mag', true); return; }
    if (m === 'reset'){ SET.mag75 = Object.assign({}, MAG75.DEF); MENU.save(); }
    else MAG75.set(m, MAG75.get(m) + (+b.dataset.d) * 0.1);
    emit('ui', { kind: 'ok' });
    if (MENU.cur) MENU.show(MENU.cur);
  };
  const find = e => e.target && e.target.closest ? e.target.closest('[data-p75mag]') : null;
  document.addEventListener('click', e => { const b = find(e); if (!b) return; e.stopPropagation(); e.preventDefault(); if (performance.now() - at < 700) return; go(b); }, true);
  document.addEventListener('touchend', e => { const b = find(e); if (!b) return; e.stopPropagation(); if (e.cancelable) e.preventDefault(); at = performance.now(); go(b); }, { capture: true, passive: false });
  document.addEventListener('mousedown', e => { if (find(e)) e.stopPropagation(); }, true);
  document.addEventListener('touchstart', e => { if (find(e)) e.stopPropagation(); }, { capture: true, passive: true });
}
// ---------------------------------------------------------------------
//  4. ОБУЧЕНИЕ: на телефоне — только телефонные, на ПК — только ПК; все 4 — в режиме разработчика
// ---------------------------------------------------------------------
V75.devAll = function(){ return !!(T72.devAll || (typeof DEV !== 'undefined' && (DEV.on || DEV.match))); };
if (typeof T72 !== 'undefined'){
  const ht0 = MENU.html_t72;
  MENU.html_t72 = function(){
    const all = V75.devAll(), o0 = T72.others;
    T72.others = all;
    let h;
    try { h = ht0.apply(this, arguments); } finally { T72.others = o0; }
    // переключатель «Показать другие» — только для разработчика
    if (!all) h = h.replace(/<button data-t72o="1"[^>]*>[\s\S]*?<\/button>/, '');
    else h = h.replace(/<button data-t72o="1"[^>]*>[\s\S]*?<\/button>/, `<span class="t75dev">🛠 ${tr('режим разработчика: все 4 обучения', 'developer mode: all 4 trainings', 'chế độ nhà phát triển: cả 4 bài', 'מצב מפתח: כל 4 האימונים')}</span>`);
    return h;
  };
  // старый общий флажок «показать другие» больше не действует
  T72.others = false;
  const sh0 = MENU.show;
  MENU.show = function(name){ if (name === 'main' || name === 'pause') T72.devAll = false; return sh0.apply(this, arguments); };
}
// ---------------------------------------------------------------------
//  5. ОДНО МЕНЮ «РАЗРАБОТЧИК»: режим (вкл/выкл) + арсенал + полигон + обучения + кино
// ---------------------------------------------------------------------
if (typeof DEV !== 'undefined'){
  // в матче: панель — заголовок «Разработчик», сверху сам режим
  const dh0 = DEV.html;
  DEV.html = function(){
    let h = dh0.apply(this, arguments);
    h = h.replace(/(<h4>🛠 )[^<]*/, '$1' + tr('Разработчик', 'Developer', 'Nhà phát triển', 'מפתח'));
    const top = `<h5>${tr('Режим разработчика', 'Developer mode', 'Chế độ nhà phát triển', 'מצב מפתח')}</h5><div class="r">` +
      `<button data-dv="dev" data-v="" class="${this.on ? 'p75on' : ''}">${this.on ? '☑ ' + tr('ВКЛ: руда без конца, всё открыто', 'ON: endless ore, all unlocked', 'BẬT', 'פועל') : '☐ ' + tr('ВЫКЛ (включить)', 'OFF (turn on)', 'TẮT (bật)', 'כבוי (הפעל)')}</button>` +
      `<button data-dv75="tut">🎓 ${tr('Обучения (все 4)', 'Trainings (all 4)', 'Huấn luyện (cả 4)', 'אימונים (כל 4)')}</button></div>`;
    h = h.replace(/(<\/h4>)/, '$1' + top);
    // кнопка «включить/выключить режим» внизу больше не нужна (она теперь сверху)
    h = h.replace(/<button data-dv="dev" data-v="">(Выключить режим|Включить режим|Turn mode off|Turn mode on|Tắt chế độ|Bật chế độ)<\/button>/, '');
    return h;
  };
  const pn0 = DEV.panel;
  DEV.panel = function(on){
    const r = pn0.apply(this, arguments);
    const p = $('devPan');
    if (p && !p._v75){ p._v75 = true; p.addEventListener('click', e => { const t = e.target.closest('[data-dv75]'); if (!t) return; e.stopPropagation(); AU.init(); if (t.dataset.dv75 === 'tut'){ DEV.panel(false); MENU.pause(); T72.devAll = true; MENU.show('t72', true); } }, true); }
    return r;
  };
  // метка в углу: одна кнопка «🛠 Разработчик»
  const du0 = DEV.ui;
  DEV.ui = function(){
    du0.apply(this, arguments);
    const lab = $('devLab'); if (!lab || lab.style.display === 'none') return;
    const h = `<b>${tr('РАЗРАБОТЧИК', 'DEVELOPER', 'NHÀ PHÁT TRIỂN', 'מפתח')}${this.on ? '' : ' · ' + tr('выкл', 'off', 'tắt', 'כבוי')}</b><button data-dl="1">🛠 ${tr('Меню', 'Menu', 'Menu', 'תפריט')}${TOUCH.on ? '' : ' <kbd>F8</kbd>'}</button>`;
    if (lab._h75 !== h + lab._h){ lab.innerHTML = h; lab._h75 = h + lab._h; }
  };
  // пауза (ПК): вместо двух кнопок «Режим: ВКЛ/ВЫКЛ» и «Арсенал» — одна «🛠 Разработчик»
  const hp0 = MENU.html_pause;
  MENU.html_pause = function(){
    let h = hp0.apply(this, arguments);
    if (V75.pm()) return h;
    h = h.replace(/<button id="m_devtog"[^>]*>[\s\S]*?<\/button>/, '').replace(/<button id="m_devars"[^>]*>[\s\S]*?<\/button>/, '');
    const i = h.indexOf('id="m_settings"'); if (i < 0) return h;
    const s = h.lastIndexOf('<button', i);
    return h.slice(0, s) + this.btn('devars', '🛠 ' + tr('Разработчик: режим, арсенал, полигон', 'Developer: mode, arsenal, range', 'Nhà phát triển: chế độ, kho, trường bắn', 'מפתח: מצב, נשקייה, מטווח') + (DEV.match ? (DEV.on ? ' · ' + tr('ВКЛ', 'ON', 'BẬT', 'פועל') : '') : ` <small style="opacity:.6">${tr('(матч не попадёт в карьеру)', '(match will not count for career)', '(trận không tính vào sự nghiệp)', '(המשחק לא ייספר)')}</small>`)) + h.slice(s);
  };
  // главное меню (ПК): «Режим разработчика» открывает экран «Разработчик»
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    if (V75.pm()) return hm0.apply(this, arguments);
    return hm0.apply(this, arguments).replace(/(<button id="m_dev"[^>]*>)[\s\S]*?(<\/button>)/, '$1🛠 ' + tr('Разработчик', 'Developer', 'Nhà phát triển', 'מפתח') + ` <small style="opacity:.6">${tr('полигон · все обучения · кино', 'sandbox · all trainings · cinema', 'sa bàn · mọi bài · điện ảnh', 'ארגז חול · כל האימונים · קולנוע')}</small>$2`);
  };
  MENU.html_dev75 = function(){
    const b = (id, ic, t, s) => `<button id="m_${id}" class="d75b"><i>${ic}</i><span><b>${t}</b><small>${s}</small></span></button>`;
    return `<div class="mcol d75"><div class="hdr"><button id="m_back" class="bk">‹ ${tr('Назад', 'Back', 'Quay lại', 'חזרה')}</button><h2>🛠 ${tr('РАЗРАБОТЧИК', 'DEVELOPER', 'NHÀ PHÁT TRIỂN', 'מפתח')}</h2></div>` +
      `<p class="sub">${tr('Карьера и сохранения не меняются. В бою то же меню — кнопка «🛠 Меню» вверху справа' + (TOUCH.on ? '' : ' или F8') + '.', 'Career and saves stay untouched. In battle the same menu is the "🛠 Menu" button at the top right' + (TOUCH.on ? '' : ' or F8') + '.', 'Sự nghiệp và bản lưu không đổi.', 'הקריירה והשמירות לא משתנות.')}</p>` +
      `<div class="d75g">` +
      b('d75play', '▶', tr('Новый матч разработчика', 'New developer match', 'Trận nhà phát triển', 'משחק מפתח חדש'), tr('всё открыто, руда без конца, мгновенная стройка, арсенал', 'all unlocked, endless ore, instant build, arsenal', 'mở hết, quặng vô hạn', 'הכול פתוח, עפרה בלי סוף')) +
      b('d75tut', '🎓', tr('Обучения — все 4', 'Trainings — all 4', 'Huấn luyện — cả 4', 'אימונים — כל 4'), tr('ПК и телефон (стратегия и шутер)', 'PC and phone (strategy and shooter)', 'PC và điện thoại', 'מחשב וטלפון')) +
      b('d75cine', '🎬', tr('Кино: сплитскрин', 'Cinema: split screen', 'Điện ảnh: chia đôi', 'קולנוע: מסך מפוצל'), tr('слева бот-стратег, справа бот-шутер', 'strategist bot left, shooter bot right', 'trái chiến lược, phải xạ thủ', 'אסטרטג משמאל, יורה מימין')) +
      b('d75cineall', '★', tr('Кино: всё построено', 'Cinema: everything built', 'Điện ảnh: xây hết', 'קולנוע: הכול בנוי'), tr('обе базы отстроены и прокачаны — для съёмки', 'both bases built and upgraded — for footage', 'cả hai căn cứ nâng cấp đầy đủ', 'שני הבסיסים בנויים ומשודרגים')) +
      `</div></div>`;
  };
  const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.apply(this, arguments);
    const on = (id, fn) => { const b = $('m_' + id); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
    if (name === 'main') on('dev', () => this.show('dev75', true));
    if (name === 'pause') on('devars', () => { if (!DEV.match) DEV.enter(); this.resume(); DEV.panel(true); });
    if (name === 'dev75'){
      on('back', () => this.back());
      on('d75play', () => DEV.start());
      on('d75tut', () => { T72.devAll = true; this.show('t72', true); });
      on('d75cine', () => { CINE75.split = true; CINE75.save(); OPER.begin({ aspect: '16:9' }); });
      on('d75cineall', () => { CINE75.split = true; CINE75.save(); OPER.begin({ aspect: '16:9' }); setTimeout(() => CINE75.preset(), 300); });
    }
  };
}
// телефон: главное меню — плитка «Разработчик» ведёт на тот же экран; в паузе одна плитка вместо двух
if (typeof P71M !== 'undefined' && typeof DEV !== 'undefined'){
  const pp0 = P71M.pause;
  if (pp0) P71M.pause = function(){
    let h = pp0.apply(this, arguments);
    h = h.replace(/<button[^>]*id="m_devtog"[^>]*>[\s\S]*?<\/button>/, '');
    if (!/id="m_devars"/.test(h)) h = h.replace(/(<button[^>]*id="m_career")/, this.tile('id="m_devars"', 'tool', tr('Разработчик', 'Developer', 'Nhà phát triển', 'מפתח'), DEV.on ? L71('on') : '', /id="m73more"/.test(h) ? 'p73h' : '') + '$1');
    else h = h.replace(/(<button[^>]*id="m_devars"[^>]*>[\s\S]*?)(Арсенал|Arsenal|Kho vũ khí|נשקייה)/, '$1' + tr('Разработчик', 'Developer', 'Nhà phát triển', 'מפתח'));
    return h;
  };
}
// ---------------------------------------------------------------------
//  6. ВЕРСИЯ И «НОВОЕ В v7.5»
// ---------------------------------------------------------------------
const V75_NEWS = [
  ['Кино-режим — сплитскрин: слева бот-стратег (вид сверху на базу и армию), справа бот-шутер от первого лица. Кнопки внизу (и клавиши S, P): «Сплитскрин» и «★ Всё построено» — обе базы отстроены и прокачаны для съёмки.',
   'Cinema mode — split screen: the strategist bot on the left (top view of the base and army), the shooter bot on the right in first person. Buttons at the bottom (keys S, P): "Split screen" and "★ All built" — both bases built and upgraded for footage.',
   'Chế độ điện ảnh chia đôi: trái — bot chiến lược nhìn từ trên, phải — bot xạ thủ góc nhìn thứ nhất. Nút “★ Xây hết” — hai căn cứ đầy đủ để quay.',
   'מצב קולנוע מפוצל: משמאל בוט אסטרטג במבט מלמעלה, מימין בוט יורה בגוף ראשון. „★ הכול בנוי" — שני הבסיסים משודרגים לצילום.'],
  ['Ядра и тоннелей сквозь метеорит больше нет — метеорит сплошной, бой только на поверхности.',
   'The core and the tunnels through the meteor are gone — the meteor is solid, the fight is on the surface only.',
   'Không còn lõi và đường hầm xuyên thiên thạch — chỉ chiến đấu trên bề mặt.',
   'אין יותר ליבה ומנהרות דרך המטאור — הקרב רק על פני השטח.'],
  ['Телефон: 👁 прячет интерфейс, но оставляет ранец, ⇆, стики и маркер задачи. «◎ Прицел» (только правый палец) — магнит заметно сильнее и шире; сила магнита для трёх режимов — Настройки → Управление → «Расширенные». За пушкой машины кнопка называется «Слезть».',
   'Phone: 👁 hides the HUD but keeps the jetpack, ⇆, the sticks and the objective marker. "◎ Aim" (right finger only) — a clearly stronger and wider magnet; the magnet for all three modes — Settings → Controls → "Advanced". On a vehicle gun the button says "Get off".',
   'Điện thoại: 👁 ẩn giao diện nhưng giữ ba lô bay, ⇆, cần và điểm nhiệm vụ. “◎ Ngắm” — hút mạnh và rộng hơn; chỉnh trong Cài đặt → Điều khiển → “Nâng cao”.',
   'טלפון: 👁 מסתיר את הממשק אבל משאיר את התרמיל, ⇆, הג׳ויסטיקים וסמן המשימה. „◎ כוונת" — מגנט חזק ורחב יותר; הגדרה — הגדרות → שליטה → „מתקדם".'],
  ['Обучение: на телефоне — только телефонные, на ПК — только ПК. Все 4 — в меню «🛠 Разработчик». Режим разработчика и Арсенал объединены в одно меню (в бою — «🛠 Меню» вверху справа, на ПК ещё F8).',
   'Training: phones show phone trainings only, PCs — PC only. All 4 are in the "🛠 Developer" menu. Developer mode and the Arsenal are one menu now (in battle — "🛠 Menu" at the top right, F8 on PC).',
   'Huấn luyện theo thiết bị; cả 4 bài — trong menu “🛠 Nhà phát triển”. Chế độ nhà phát triển và Kho vũ khí gộp thành một menu.',
   'אימון לפי מכשיר; כל 4 — בתפריט „🛠 מפתח". מצב מפתח והנשקייה מאוחדים לתפריט אחד.'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v7\.4 · /, 'v7.5 · ');
    const m = h.match(/<h3>[^<]*v7\.4[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.5', 'New in v7.5', 'Mới trong v7.5', 'חדש ב-v7.5')}</h3><ul>${V75_NEWS.concat(typeof V75F_NEWS !== 'undefined' ? V75F_NEWS : []).map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v7.5'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){ return pm0.apply(this, arguments).replace(/v7\.4 · /, 'v7.5 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.4/, '$1v7.5'); };
    const pn0 = P71M.news;
    P71M.news = function(){
      const all = V75_NEWS.concat(typeof V75F_NEWS !== 'undefined' ? V75F_NEWS : [], V74_NEWS);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.5', 'NEW IN v7.5', 'MỚI TRONG v7.5', 'חדש ב-v7.5'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}
(function v75CSS(){
  const st = document.createElement('style'); st.id = 'v75css';
  st.textContent = `
  .t75dev{font:600 12px "Exo 2",sans-serif;color:#ffb38a;padding:6px 10px;border:1px dashed rgba(255,138,90,.6);border-radius:4px}
  #devPan button.p75on{border-color:#8fffaa;color:#cfffdc}
  #screen .d75{max-width:760px} #screen .d75 .hdr{display:flex;align-items:center;gap:12px;width:100%} #screen .d75 .hdr h2{margin:0;font:400 24px "Russo One"}
  #screen .d75g{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
  #screen .d75b{display:flex;align-items:center;gap:12px;text-align:left;min-height:64px;padding:8px 14px}
  #screen .d75b i{font-style:normal;font-size:26px;width:34px;text-align:center;color:#ffd27a} #screen .d75b span{display:flex;flex-direction:column} #screen .d75b b{font-size:15px} #screen .d75b small{opacity:.7;font-size:11.5px}
  body.touch #screen .d75g{grid-template-columns:1fr 1fr} body.touch #screen .d75b{min-height:56px}
  /* 👁: ранец, ⇆, стики и 👁 остаются (правило v7.4 прятало весь верхний ряд и все кнопки шутера) */
  body.m74nh.m74nh.m74nh #touch .tt{opacity:1 !important;pointer-events:none !important}
  body.m74nh.m74nh.m74nh #touch .tt > *:not(.m67n){opacity:0 !important;pointer-events:none !important}
  body.m74nh.m74nh.m74nh #touch .tt > .m67n{opacity:1 !important;pointer-events:auto !important}
  body.m74nh.m74nh.m74nh #touch .tf.fps > [data-s="LJ"], body.m74nh.m74nh.m74nh #touch [data-s="LJ"], body.m74nh.m74nh.m74nh #touch .tf.fps > [data-t="jet"]{opacity:1 !important;pointer-events:auto !important}
  body.m74nh.m74nh.m74nh #ov{opacity:1 !important;pointer-events:none !important}`;
  document.head.appendChild(st);
})();
