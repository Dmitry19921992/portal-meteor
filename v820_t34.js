// =====================================================================
//  v8.20 — T34: ПЕРЕНАЗНАЧЕНИЕ КНОПОК ГЕЙМПАДА + МИНИКАРТА ШУТЕРА КРУПНЕЕ НА ПЛАНШЕТЕ
//  • Геймпад: страница «🎮 Геймпад» → новая таблица «Переназначение кнопок» — клик по
//    действию, затем нажатие кнопки геймпада. Конфликт — обмен (swap). Esc / повторный
//    клик / 12 с — отмена ожидания. Раскладка хранится в SET.gp812map (pm_settings),
//    действует на шутер, командира, стратега и меню (обёртка GP812.frame: физические
//    кнопки → виртуальные стандартные индексы до обработки). Подсказки клавиш (bk/glyph),
//    таблица управления и глифы показывают текущую раскладку. Сброс — кнопкой.
//  • Планшет: миникарта шутера (drawMinimap) увеличена с 48 до 48·k (TAB812.k = 1.2…1.4)
//    — как остальной интерфейс планшета. На телефоне и ПК — без изменений.
//  Хуки — обёртки: GP812.frame/glyph/MAP/activate/key, MENU.wire, drawMinimap. Новый код
//  только здесь. Выкл.: ?t34=0.
// =====================================================================
const T34 = {
  on: (() => { try { return new URLSearchParams(location.search).get('t34') !== '0'; } catch (e){ return true; } })(),
  cap: null, capT: 0, err: {},
  ROLES: [['fire', 7], ['aim', 6], ['a', 0], ['b', 1], ['x', 2], ['y', 3], ['lb', 4], ['rb', 5], ['view', 8], ['start', 9], ['l3', 10], ['r3', 11], ['up', 12], ['down', 13], ['left', 14], ['right', 15]],
  LBL: {
    fire: ['Огонь', 'Fire', 'Bắn'], aim: ['Прицел', 'Aim', 'Ngắm'],
    a: ['A — ранец · подтвердить', 'A — jetpack · confirm', 'A'], b: ['B — присед/подкат · назад', 'B — crouch/slide · back', 'B'],
    x: ['X — перезарядка · использовать', 'X — reload · use', 'X'], y: ['Y — оружие · нырок', 'Y — weapon · dive', 'Y'],
    lb: ['LB — граната', 'LB — grenade', 'LB'], rb: ['RB — поддержка 📡', 'RB — support 📡', 'RB'],
    view: ['View — лестница режимов', 'View — mode ladder', 'View'], start: ['Start — пауза', 'Start — pause', 'Start'],
    l3: ['L3 — рывок', 'L3 — dash', 'L3'], r3: ['R3 — удар прикладом · вселиться', 'R3 — melee · possess', 'R3'],
    up: ['▲ — способность 2', '▲ — ability 2', '▲'], down: ['▼ — способность 4', '▼ — ability 4', '▼'],
    left: ['◄ — способность 1', '◄ — ability 1', '◄'], right: ['► — способность 3', '► — ability 3', '►'],
  },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('T34 ' + tag, e); } } },
  L(ru, en, vi){ return tr(ru, en, vi || en, en); },
  defOf(role){ const r = this.ROLES.find(r => r[0] === role); return r ? r[1] : undefined; },
  physOf(role){ const d = this.defOf(role); if (d === undefined) return undefined; const m = SET.gp812map; const p = m && m[role] !== undefined ? +m[role] : d; return p >= 0 && p <= 16 ? p : d; },
  physOfVirt(v){ const r = this.ROLES.find(r => r[1] === v); return r ? this.physOf(r[0]) : v; },
  // null — стандартная раскладка; иначе { v: вирт→физ (16), aim, fire }
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
    this.stats.assigns = (this.stats.assigns || 0) + 1;
    return this.map();
  },
  reset(){ try { delete SET.gp812map; MENU.save(); } catch (e){} this.stats.resets = (this.stats.resets || 0) + 1; },
  stats: { assigns: 0, resets: 0, caps: 0, mmDraws: 0 },
  // ---------------------------------------------------------------- захват кнопки (UI)
  startCapture(role){
    if (!this.on || typeof GP812 === 'undefined') return;
    this.cap = role; this.capT = performance.now() + 12000; this.stats.caps++;
    try { MENU.show('gp812', false); } catch (e){}
    emit('ui', { kind: 'tick' });
  },
  cancelCapture(){ if (!this.cap) return; this.cap = null; this.safe(() => { if (MENU.cur === 'gp812') MENU.show('gp812', false); }, 'cancel'); },
  // ---------------------------------------------------------------- радиус миникарты шутера на планшете
  mmR(){ if (!this.on || typeof TAB812 === 'undefined' || !TAB812.on) return null; return Math.round(48 * (TAB812.k || 1.3)); },
};
// ---------------------------------------------------------------------- хуки: геймпад
if (T34.on && typeof GP812 !== 'undefined'){
  // физические кнопки → виртуальные стандартные индексы на время кадра
  { const fr0 = GP812.frame;
    GP812.frame = function(dt){
      const M = T34.on ? T34.map() : null;
      if (!M) return fr0.apply(this, arguments);
      const B = this.b, PB = this.pb, TD = this.tDown, TG = this.trig;
      const vb = [], vpb = [], vtd = [];
      for (let v = 0; v < 17; v++){ const p = M.v[v] !== undefined ? M.v[v] : v; vb[v] = !!(B && B[p]); vpb[v] = !!(PB && PB[p]); vtd[v] = TD ? TD[p] : 0; }
      const vtr = [0, 0];
      { const PBt = this.pad && this.pad.buttons;
        for (let s = 0; s < 2; s++){ const p = s ? M.fire : M.aim; const Bt = PBt && PBt[p];
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
  // во время захвата: A не нажимает сфокусированную кнопку, B/Escape не уходят со страницы
  { const ac0 = GP812.activate;
    GP812.activate = function(el){ if (T34.cap) return false; return ac0.apply(this, arguments); }; }
  { const k0 = GP812.key;
    GP812.key = function(code, up){ if (T34.cap && !up && code === 'Escape') return; return k0.apply(this, arguments); }; }
  addEventListener('keydown', e => { if (T34.cap && e.code === 'Escape'){ e.stopPropagation(); T34.cancelCapture(); } }, { capture: true });
  // ---------------------------------------------------------------- страница «Геймпад»: таблица переназначения
  { const h0 = GP812.html;
    GP812.html = function(){
      let h = h0.apply(this, arguments);
      if (!T34.on) return h;
      const g = i => `<kbd>${GP812.g(i)}</kbd>`;
      const rows = T34.ROLES.map(([role]) => {
        const lbl = T34.LBL[role], waiting = T34.cap === role;
        return `<tr data-gp34="${role}" class="${waiting ? 't34cap' : ''}"><td>${T34.L(lbl[0], lbl[1], lbl[2])}</td><td>${waiting ? `<i class="t34wait">${T34.L('нажми кнопку геймпада…', 'press a gamepad button…', 'nhấn nút tay cầm…')}</i>` : g(T34.physOf(role))}</td></tr>`;
      }).join('');
      const sec = `<h4>${T34.L('Переназначение кнопок', 'Button remapping', 'Đổi nút')}</h4>
        <table class="gp812map t34map">${rows}</table>
        <button class="tog t34reset" data-reset="gp34">${T34.L('Сброс раскладки', 'Reset layout', 'Đặt lại')}</button>
        <p class="note">${T34.L('Нажми на действие в таблице, затем — кнопку геймпада. Занятая кнопка меняется местами (обмен). Esc — отмена. Раскладка работает во всех режимах.', 'Click an action, then press a gamepad button. An occupied button swaps places. Esc — cancel. The layout works in all modes.', 'Bấm hành động, rồi bấm nút. Nút đã dùng sẽ hoán đổi. Esc — hủy.')}</p>`;
      const i = h.indexOf('<p class="note">');
      if (i >= 0){ const j = h.indexOf('</p>', i) + 4; h = h.slice(0, i) + sec + h.slice(j); }
      else h = h.replace('</div></div>', sec + '</div></div>');
      return h;
    }; }
  { const w0 = MENU.wire;
    MENU.wire = function(name){
      const r = w0.apply(this, arguments);
      if (name === 'gp812' && T34.on){
        document.querySelectorAll('[data-gp34]').forEach(tr => tr.onclick = e => {
          e.stopPropagation();
          if (T34.cap === tr.dataset.gp34) T34.cancelCapture(); else T34.startCapture(tr.dataset.gp34);
        });
        const rs = document.querySelector('[data-reset="gp34"]');
        if (rs) rs.onclick = e => { e.stopPropagation(); T34.reset(); this.show('gp812', false); emit('ui', { kind: 'ok' }); };
      }
      return r;
    }; }
  // ---------------------------------------------------------------- цикл захвата: первая свежая кнопка назначается
  let prev = [];
  const capLoop = () => {
    T34.safe(() => {
      if (T34.cap){
        const B = GP812.b || [];
        for (let p = 0; p < 17; p++){
          if (B[p] && !prev[p]){
            const role = T34.cap;
            T34.cap = null;
            T34.assign(role, p);
            try { if (MENU.cur === 'gp812') MENU.show('gp812', false); } catch (e){}
            emit('ui', { kind: 'ok' });
            break;
          }
        }
        if (T34.cap && performance.now() > T34.capT) T34.cancelCapture();
      }
      prev = (GP812.b || []).slice();
    }, 'cap');
    requestAnimationFrame(capLoop);
  };
  requestAnimationFrame(capLoop);
  // ---------------------------------------------------------------- стили таблицы переназначения
  const st = document.createElement('style'); st.id = 't34css'; st.textContent = `
  .t34map td:last-child{min-width:74px} .t34map tr[data-gp34]{cursor:pointer} .t34map tr[data-gp34]:hover td{background:rgba(255,210,122,.07)}
  .t34map tr.t34cap td{background:rgba(255,210,122,.14)} .t34map .t34wait{font-style:normal;color:#ffd27a;font-size:11px;animation:t34p 1s infinite}
  @keyframes t34p{50%{opacity:.45}} .t34reset{margin:2px 0 6px}
  `; document.head.appendChild(st);
}
// ---------------------------------------------------------------------- хуки: миникарта шутера на планшете
if (T34.on){
  if (typeof drawMinimap === 'function'){
    const dm0 = drawMinimap;
    drawMinimap = function(){
      const R = T34.mmR();
      if (!R || typeof M67 === 'undefined' || !M67.active()) return dm0.apply(this, arguments);
      const m73 = typeof M73 !== 'undefined' && M73.act();
      if (!M67.pref.mm && !m73) return;
      T34.stats.mmDraws++;
      const R0 = 82, k = R / R0, s = M67.safe;
      const mon = M67.on; M67.on = false;   // телефонная обёртка M67 пропустит вызов как есть
      octx.save(); octx.translate(s.l + 8 + R, (m73 ? s.t + 6 : 54) + R); octx.scale(k, k); octx.translate(-(18 + R0), -(innerHeight - 18 - R0));
      try { dm0.apply(this, arguments); } finally { octx.restore(); M67.on = mon; }
    };
  }
}
