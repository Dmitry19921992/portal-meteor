// =====================================================================
//  v8.20 — T34: ПЕРЕНАЗНАЧЕНИЕ КНОПОК ГЕЙМПАДА + МИНИКАРТА ШУТЕРА КРУПНЕЕ НА ПЛАНШЕТЕ
//  Продолжение WIP Kimi (08.11): логика та же, захват кнопки переделан —
//  ожидание кнопки больше не проходит через обработку кадра геймпада (не «нажимает»
//  сфокусированную кнопку меню, не уводит со страницы на B/Esc/Start).
//  • Геймпад: страница «🎮 Геймпад» → таблица «Переназначение кнопок» — клик/тап по
//    действию, затем нажатие кнопки геймпада. Занятая кнопка меняется местами (swap).
//    Отмена: повторный клик, Esc, 12 с. Раскладка — SET.gp812map (pm_settings),
//    действует на шутер, командира, стратега и меню: обёртка GP812.frame переводит
//    физические кнопки в виртуальные стандартные индексы до обработки кадра.
//    Подсказки (bk/glyph) и таблица управления показывают текущую раскладку.
//    Сброс — кнопкой «Сброс раскладки».
//  • Планшет: миникарта шутера крупнее — 48 → 48·k (k = TAB812.k, 1.2…1.4), как
//    остальной интерфейс планшета. Телефон и ПК — без изменений.
//  Хуки — обёртки: GP812.frame/glyph/MAP/activate/key, MENU.wire, drawMinimap.
//  Новый код только здесь, старые файлы — одна строка в build.py. Выкл.: ?t34=0.
// =====================================================================
const T34 = {
  on: (() => { try { return new URLSearchParams(location.search).get('t34') !== '0'; } catch (e){ return true; } })(),
  cap: null, capT: 0, capPad: '', prev: [],
  // действие → стандартный индекс кнопки (16 действий; стики и оси не переназначаются)
  ROLES: [['fire', 7], ['aim', 6], ['a', 0], ['b', 1], ['x', 2], ['y', 3], ['lb', 4], ['rb', 5], ['view', 8], ['start', 9], ['l3', 10], ['r3', 11], ['up', 12], ['down', 13], ['left', 14], ['right', 15]],
  LBL: {
    fire: ['Огонь', 'Fire', 'Bắn'], aim: ['Прицел', 'Aim', 'Ngắm'],
    a: ['A — ранец · подтвердить', 'A — jetpack · confirm', 'A — phản lực · chọn'], b: ['B — присед/подкат · назад', 'B — crouch/slide · back', 'B — cúi/trượt · lùi'],
    x: ['X — перезарядка · использовать', 'X — reload · use', 'X — nạp · dùng'], y: ['Y — оружие · нырок', 'Y — weapon · dive', 'Y — súng · nhập vai'],
    lb: ['LB — граната', 'LB — grenade', 'LB — lựu đạn'], rb: ['RB — поддержка 📡', 'RB — support 📡', 'RB — hỗ trợ 📡'],
    view: ['View — лестница режимов', 'View — mode ladder', 'View — chế độ'], start: ['Start — пауза', 'Start — pause', 'Start — tạm dừng'],
    l3: ['L3 — рывок', 'L3 — dash', 'L3 — lướt'], r3: ['R3 — удар прикладом · вселиться', 'R3 — melee · possess', 'R3 — cận chiến · nhập'],
    up: ['▲ — способность 2', '▲ — ability 2', '▲ — kỹ năng 2'], down: ['▼ — способность 4', '▼ — ability 4', '▼ — kỹ năng 4'],
    left: ['◄ — способность 1', '◄ — ability 1', '◄ — kỹ năng 1'], right: ['► — способность 3', '► — ability 3', '► — kỹ năng 3'],
  },
  stats: { assigns: 0, resets: 0, caps: 0, cancels: 0, mmDraws: 0, mmSig: 0 },
  err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('T34 ' + tag, e); } } },
  L(ru, en, vi){ return tr(ru, en, vi || en, en); },
  // ---------------------------------------------------------------- раскладка
  defOf(role){ const r = this.ROLES.find(r => r[0] === role); return r ? r[1] : undefined; },
  physOf(role){ const d = this.defOf(role); if (d === undefined) return undefined; const m = SET.gp812map; const p = m && m[role] !== undefined ? +m[role] : d; return p >= 0 && p <= 16 ? p : d; },
  physOfVirt(v){ const r = this.ROLES.find(r => r[1] === v); return r ? this.physOf(r[0]) : v; },
  // null — стандартная раскладка; иначе { v: вирт→физ (17), aim, fire }
  map(){
    const m = SET.gp812map;
    if (!m || typeof m !== 'object') return null;
    const v = new Array(17); let any = false;
    for (const [role, def] of this.ROLES){ const p = this.physOf(role); v[def] = p; if (p !== def) any = true; }
    return any ? { v, aim: this.physOf('aim'), fire: this.physOf('fire') } : null;
  },
  remapActive(){ return !!this.map(); },
  assign(role, p){
    const d = this.defOf(role); if (d === undefined) return null;
    p = Math.round(+p); if (!(p >= 0 && p <= 16)) return null;
    if (!SET.gp812map || typeof SET.gp812map !== 'object') SET.gp812map = {};
    const old = this.physOf(role);
    if (old === p) return this.map();   // уже так
    const holder = this.ROLES.find(r => r[0] !== role && this.physOf(r[0]) === p);
    if (holder){ if (old === holder[1]) delete SET.gp812map[holder[0]]; else SET.gp812map[holder[0]] = old; }
    if (p === d) delete SET.gp812map[role]; else SET.gp812map[role] = p;
    try { MENU.save(); } catch (e){}
    this.stats.assigns++;
    return this.map();
  },
  reset(){ try { delete SET.gp812map; MENU.save(); } catch (e){} this.stats.resets++; },
  // ---------------------------------------------------------------- захват кнопки
  startCapture(role){
    if (!this.on || typeof GP812 === 'undefined') return;
    this.cap = role; this.capT = performance.now() + 12000; this.stats.caps++;
    this.prev = (GP812.b || []).slice();   // кнопка, которой только что нажали «в таблицу», не считается
    this.capPad = GP812.id || '';
    this.safe(() => GP812.release(), 'rel');   // не оставляем зажатыми огонь/прицел на время ожидания
    this.redraw();
  },
  cancelCapture(){
    if (!this.cap) return;
    this.cap = null; this.stats.cancels++;
    this.redraw();
  },
  // шаг ожидания: первая свежая кнопка геймпада назначается действию
  captureStep(pad){
    if (!this.cap) return;
    if (performance.now() > this.capT){ this.cancelCapture(); return; }
    const B = pad.b || [];
    if (this.capPad && pad.id && pad.id !== this.capPad){ this.capPad = pad.id; this.prev = B.slice(); return; }
    for (let p = 0; p < 17; p++){
      if (B[p] && !this.prev[p]){
        const role = this.cap; this.cap = null;
        this.assign(role, p);
        this.safe(() => pad.toast(this.L('Раскладка: ', 'Layout: ', 'Bố cục: ') + (this.LBL[role] ? this.L(this.LBL[role][0], this.LBL[role][1], this.LBL[role][2]).split(' ')[0] : role) + ' → ' + pad.g(p)), 'toast');
        emit('ui', { kind: 'ok' });
        this.redraw();
        return;
      }
    }
    this.prev = B.slice();
  },
  redraw(){ this.safe(() => { if (MENU.cur === 'gp812') MENU.show('gp812', false); }, 'redraw'); },
  // ---------------------------------------------------------------- радиус миникарты шутера на планшете
  mmR(){ if (!this.on || typeof TAB812 === 'undefined' || !TAB812.on) return null; return Math.round(48 * (TAB812.k || 1.25)); },
};
// ---------------------------------------------------------------------- хуки: геймпад
if (T34.on && typeof GP812 !== 'undefined'){
  // физические кнопки → виртуальные стандартные индексы на время кадра
  { const fr0 = GP812.frame;
    GP812.frame = function(dt){
      if (!T34.on) return fr0.apply(this, arguments);
      // ожидание кнопки: кадр игры не обрабатываем, чтобы нажатие не «нажимало» меню
      if (T34.cap){ T34.safe(() => T34.captureStep(this), 'cap'); return; }
      const M = T34.map();
      if (!M) return fr0.apply(this, arguments);
      const B = this.b, PB = this.pb, TD = this.tDown, TG = this.trig;
      const vb = [], vpb = [], vtd = [];
      for (let v = 0; v < 17; v++){ const p = M.v[v] !== undefined ? M.v[v] : v; vb[v] = !!(B && B[p]); vpb[v] = !!(PB && PB[p]); vtd[v] = TD ? TD[p] : 0; }
      const vtr = [0, 0];
      { const P = this.pad && this.pad.buttons;
        for (let s = 0; s < 2; s++){ const Bt = P && P[s ? M.fire : M.aim];
          vtr[s] = Bt ? +(Bt.value !== undefined ? Bt.value : (Bt.pressed ? 1 : 0)) || 0 : 0; } }
      this.b = vb; this.pb = vpb; this.tDown = vtd; this.trig = vtr;
      try { return fr0.apply(this, arguments); }
      finally { this.b = B; this.pb = PB; this.tDown = TD; this.trig = TG; }
    }; }
  // подсказки клавиш — по текущей раскладке
  { const gl0 = GP812.glyph;
    GP812.glyph = function(act){
      if (T34.remapActive()){
        if (act === 'fwd' || act === 'back' || act === 'left' || act === 'right') return gl0.apply(this, arguments);
        if (act === 'switch') return this.g(T34.physOf('y')) + '⏵';
        if (act === 'fire' || act === 'aim') return this.g(T34.physOf(act));
        const i = this.ACT[act];
        if (i !== undefined) return this.g(T34.physOfVirt(i));
      }
      return gl0.apply(this, arguments);
    }; }
  // таблица управления на странице «Геймпад» — тоже по текущей раскладке
  { const MP0 = GP812.MAP;
    GP812.MAP = function(){
      if (!T34.remapActive()) return MP0.apply(this, arguments);
      const g0 = this.g;
      this.g = i => g0.call(this, i >= 0 && i <= 15 ? T34.physOfVirt(i) : i);
      try { return MP0.apply(this, arguments); }
      finally { this.g = g0; }
    }; }
  // во время захвата: A/мышь не нажимают элементы под фокусом, Esc не закрывает страницу
  { const ac0 = GP812.activate;
    GP812.activate = function(el){ if (T34.cap) return false; return ac0.apply(this, arguments); }; }
  { const k0 = GP812.key;
    GP812.key = function(code, up){ if (T34.cap && !up && code === 'Escape') return; return k0.apply(this, arguments); }; }
  addEventListener('keydown', e => { if (T34.cap && e.code === 'Escape'){ e.stopPropagation(); T34.cancelCapture(); } }, { capture: true });
  // ---------------------------------------------------------------- страница «Геймпад»: таблица переназначения
  { const h0 = GP812.html;
    GP812.html = function(){
      const h = h0.apply(this, arguments);
      if (!T34.on) return h;
      const g = i => `<kbd>${GP812.g(i)}</kbd>`;
      const row = role => {
        const lbl = T34.LBL[role], waiting = T34.cap === role;
        return `<tr data-gp34="${role}" class="${waiting ? 't34cap' : ''}"><td>${T34.L(lbl[0], lbl[1], lbl[2])}</td><td>${waiting ? `<i class="t34wait">${T34.L('нажми кнопку геймпада…', 'press a gamepad button…', 'nhấn nút tay cầm…')}</i>` : g(T34.physOf(role))}</td></tr>`;
      };
      const tbl = list => `<table class="gp812map t34map">${list.map(row).join('')}</table>`;
      const sec = `<h4>${T34.L('Переназначение кнопок', 'Button remapping', 'Đổi nút')}</h4>
        ${tbl(T34.ROLES.map(r => r[0]))}
        <button class="tog t34reset" data-reset="gp34">${T34.L('Сброс раскладки', 'Reset layout', 'Đặt lại')}</button>
        <p class="note">${T34.L('Нажми на действие в таблице, затем — кнопку геймпада. Занятая кнопка меняется местами (обмен). Esc — отмена. Раскладка работает во всех режимах и сохраняется.', 'Click an action, then press a gamepad button. An occupied button swaps places. Esc — cancel. The layout works in all modes and is saved.', 'Bấm hành động, rồi bấm nút. Nút đã dùng sẽ hoán đổi. Esc — hủy. Bố cục dùng cho mọi chế độ và được lưu.')}</p>`;
      const i = h.indexOf('<p class="note">');
      if (i >= 0){ const j = h.indexOf('</p>', i) + 4; return h.slice(0, i) + sec + h.slice(j); }
      return h.replace('</div></div>', sec + '</div></div>');
    }; }
  { const w0 = MENU.wire;
    MENU.wire = function(name){
      const r = w0.apply(this, arguments);
      if (name === 'gp812' && T34.on){
        document.querySelectorAll('[data-gp34]').forEach(tr => { tr.onclick = e => {
          e.stopPropagation();
          if (T34.cap === tr.dataset.gp34) T34.cancelCapture(); else T34.startCapture(tr.dataset.gp34);
        }; });
        const rs = document.querySelector('[data-reset="gp34"]');
        if (rs) rs.onclick = e => { e.stopPropagation(); T34.reset(); MENU.show('gp812', false); emit('ui', { kind: 'ok' }); };
      }
      return r;
    }; }
  // ---------------------------------------------------------------- стили таблицы переназначения
  const st = document.createElement('style'); st.id = 't34css'; st.textContent = `
  .t34map td:last-child{min-width:84px} .t34map tr[data-gp34]{cursor:pointer} .t34map tr[data-gp34]:hover td{background:rgba(255,210,122,.07)}
  .t34map tr.t34cap td{background:rgba(255,210,122,.16);outline:1px solid rgba(255,210,122,.5);outline-offset:-1px} .t34map .t34wait{font-style:normal;color:#ffd27a;font-size:11px;animation:t34p 1s infinite}
  @keyframes t34p{50%{opacity:.4}} .t34reset{margin:2px 0 6px}
  /* планшет, миникарта в углу (M73) крупнее — счётчики рядом сдвигаются правее */
  body.t34mm.m73.m71.m64fps #hud{left:calc(var(--sl) + var(--t34mmx, 112px))}
  .gp812page .t34map td{padding:1px 6px} .gp812page .t34map tr:first-child td{padding-top:2px}
  .gp812page .t34grid{display:grid;grid-template-columns:1fr 1fr;gap:0 26px}
  @media (max-width:700px){ .gp812page .t34grid{grid-template-columns:1fr} }
  `; document.head.appendChild(st);
  // сторож захвата: таймаут и нажатие ловятся, даже если кадры геймпада не идут
  // (геймпад ещё «не активен» или отключён посреди ожидания)
  { const tick = () => {
      T34.safe(() => {
        if (!T34.cap) return;
        if (performance.now() > T34.capT){ T34.cancelCapture(); return; }
        if (GP812.pad && !GP812.active) T34.captureStep(GP812);
      }, 'wd');
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick); }
}
// ---------------------------------------------------------------------- хуки: миникарта шутера на планшете
if (T34.on && typeof drawMinimap === 'function'){
  const dm0 = drawMinimap;
  drawMinimap = function(){
    const R = T34.mmR();
    if (!R){
      if (T34.hudOn){ T34.hudOn = false; T34.hudR = 0; T34.safe(() => document.body.classList.remove('t34mm'), 'hud0'); }   // планшет/флаг выключили — вернуть счётчики
      return dm0.apply(this, arguments);
    }
    if (typeof M67 === 'undefined' || !M67.active()) return dm0.apply(this, arguments);
    const m73 = typeof M73 !== 'undefined' && M73.act();
    if (!M67.pref.mm && !m73) return dm0.apply(this, arguments);
    // размер сменился — пересчитать область тапа «свернуть карту» (#m67mm), иначе она меньше карты
    if (T34.mmSig !== R){ T34.mmSig = R; T34.safe(() => { if (M67.mmBtn) M67.mmBtn(); }, 'mmbtn'); }
    const R0 = 82, k = R / R0, s = M67.safe || { l: 0, t: 0 };
    // миникарта в самом углу (M73): счётчики POINTS стоят рядом — сдвигаем их правее, чтобы не налезали
    T34.safe(() => {
      const on = !!m73 && !!R;
      if (T34.hudOn === on && T34.hudR === R) return;
      T34.hudOn = on; T34.hudR = R;
      document.body.classList.toggle('t34mm', on);
      document.documentElement.style.setProperty('--t34mmx', (8 + 2 * R + 10) + 'px');
    }, 'hud');
    const on0 = M67.on; M67.on = false;   // телефонная обёртка M67 (R=48) пропустит вызов как есть
    octx.save();
    octx.translate(s.l + 8 + R, (m73 ? s.t + 6 : 50) + R);
    octx.scale(k, k);
    octx.translate(-(18 + R0), -(innerHeight - 18 - R0));
    T34.stats.mmDraws++;
    try { return dm0.apply(this, arguments); } finally { octx.restore(); M67.on = on0; }
  };
  // область тапа по миникарте — под увеличенный радиус (на планшете)
  if (typeof M67 !== 'undefined' && M67.mmBtn){ const mm0 = M67.mmBtn;
    M67.mmBtn = function(){
      const r = mm0.apply(this, arguments);
      T34.safe(() => {
        const R = T34.mmR(), b = this.bMM;
        if (!R || !b || !this.active() || !this.pref.mm) return;
        const m73 = typeof M73 !== 'undefined' && M73.act();
        b.style.width = b.style.height = (R * 2) + 'px';
        b.style.top = (m73 ? this.safe.t + 6 : 50) + 'px';
      }, 'mmbtn2');
      return r;
    }; }
  addEventListener('resize', () => { T34.mmSig = 0; });
}