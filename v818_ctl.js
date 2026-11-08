// =====================================================================
//  v8.18 — УПРАВЛЕНИЕ (T67, решение Дмитрия 07.11 00:27 №1). Обёртки над v87_mode.js / v85_cmd.js, старые файлы не трогаем.
//   • Tab — три режима по кругу ВЕЗДЕ, и в уроках тоже: Стратег → Командир → Шутер (Shift+Tab — назад). Alt+1/2/3 — сразу в режим.
//   • Клавиша P больше не режим: не включает «Командира» и не выходит из него; убрана из подсказок, уроков и энциклопедии
//     (P у ниндзя — «АВТО» — осталась: это не режим).
//   • X — вселение, своё в каждом режиме: Шутер — в ближайшего к бою бойца (как было); Командир — в бойца своего отряда
//     (Shift+X — другой отряд); Стратег — в выделенного бойца / машину / турель (ничего не выделено — в ближайшего к бою).
//     Выделены только инженеры — X, как раньше, строит ПВО (в инженера вселиться нельзя: у него нет тела для шутера).
//   • Alt+2 (и 1/3): Alt больше не уводит фокус в меню Chrome (мышь не отпускается); «ты уже в этом режиме» — подсказка.
//   • Смена режима — крупная надпись по центру на 1 с (в плейтесте терялся, в каком режиме).
//   • Кнопки телефона на ПК (без сенсора) не показываются.
//  Выкл.: ?ctl818=0. Консоль: CTL818.stats.
// =====================================================================
const CTL818 = {
  on: (() => { try { return new URLSearchParams(location.search).get('ctl818') !== '0'; } catch (e){ return true; } })(),
  err: {}, stats: { tab: 0, x: 0, xCmd: 0, xRts: 0, p: 0, alt: 0, banner: 0 }, lastM: null, bT: 0,
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('CTL818 ' + tag, e); } } },
  T: (ru, en) => tr(ru, en),
  X(){ return keyLabel(SET.bind.switch); },
  ph(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  // выделены только инженеры (тогда X — стройка ПВО, как раньше)
  buildersOnly(){ if (S.selB || !S.sel || !S.sel.size) return false; for (const g of S.sel) if (g.cls !== 'builder') return false; return true; },
  // ---- убрать «P» из текстов (любой язык: ключ — английский текст, правка — по шаблонам вокруг «P»)
  pKey: new Map(),
  hasP(en){
    if (typeof en !== 'string' || en.indexOf('P') < 0) return false;
    let v = this.pKey.get(en); if (v !== undefined) return v;
    v = /Tab\/P\b|\bP \/ Alt\+2|\bP or Alt\+2|, P — strategy|the P key|; P — to the Strategist|\[P\]|keys: P\b/.test(en);
    if (this.pKey.size < 3000) this.pKey.set(en, v);
    return v;
  },
  noP(s, en){
    if (typeof s !== 'string') return s;
    let r = s.replace(/Tab\s*\/\s*P\b/g, 'Tab')
      .replace(/\bP\s*\/\s*(Alt\+2)/g, '$1')
      .replace(/\bP\s+[^\s\d]{1,10}\s+(Alt\+2)/g, '$1')
      .replace(/\s*[,;،、，]\s*P\s*[—–-]\s*[^,;.。،、，·\n]*/g, '');
    if (en && /the P key/.test(en)) r = r.replace(/\bP\b/g, bk('rts'));
    return r;
  },
  // ---- надпись режима по центру
  banner(m){
    if (S.attract || !this.on) return;
    let el = document.getElementById('m818');
    if (!el){ el = document.createElement('div'); el.id = 'm818'; document.body.appendChild(el); }
    const I = V87M.INFO[m]; if (!I) return;
    el.innerHTML = `<b><i>${I.ic}</i> ${uixEsc(V87M.nm(m)).toUpperCase()}</b>${this.ph() ? '' : `<small>${uixEsc(this.T('Tab — следующий режим · X — вселиться', 'Tab — next mode · X — possess'))}</small>`}`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this.bT); this.bT = setTimeout(() => el.classList.remove('on'), 1150);
    this.stats.banner++;
  },
};
if (CTL818.on && typeof V87M !== 'undefined' && typeof CMD85 !== 'undefined'){
  // ---------------------------------------------------------------- переводы новых строк (ключ — английский, как V8X_DICT)
  if (typeof V8X_DICT !== 'undefined'){
    const A = {   // en -> [uz, tg, zh, es, pt-BR, he, vi]
      'Tab — next mode · X — possess': ['Tab — keyingi rejim · X — kirish', 'Tab — реҷаи навбатӣ · X — ворид шудан', 'Tab — 下一个模式 · X — 附身', 'Tab — siguiente modo · X — poseer', 'Tab — próximo modo · X — possuir', '‏Tab — המצב הבא · X — השתלטות', 'Tab — chế độ tiếp · X — nhập vai'],
      'Already in this mode': ['Sen allaqachon shu rejimdasan', 'Ту аллакай дар ҳамин реҷа ҳастӣ', '你已经在这个模式中', 'Ya estás en este modo', 'Você já está neste modo', '‏אתה כבר במצב הזה', 'Bạn đang ở chế độ này rồi'],
      '{0} — into a trooper · Shift+{0} — next squad · {1} — next mode': ['{0} — jangchiga · Shift+{0} — boshqa otryad · {1} — keyingi rejim', '{0} — ба ҷанговар · Shift+{0} — отряди дигар · {1} — реҷаи навбатӣ', '{0} — 附身士兵 · Shift+{0} — 下一支小队 · {1} — 下一个模式', '{0} — a un soldado · Shift+{0} — otro escuadrón · {1} — siguiente modo', '{0} — em um soldado · Shift+{0} — outro esquadrão · {1} — próximo modo', '‏{0} — לתוך לוחם · Shift+{0} — חוליה אחרת · {1} — המצב הבא', '{0} — vào lính · Shift+{0} — đội khác · {1} — chế độ tiếp'],
      'Press {0} — possess the selected unit (or the green "▶ Possess" below). {1} cycles the modes: Strategist → Commander → Shooter.': [
        '{0} ni bos — tanlangan jangchiga kir (yoki pastdagi yashil «▶ Kirish»). {1} — rejimlar aylanib: Strateg → Komandir → Otishma.',
        '{0}-ро пахш кун — ба интихобшуда ворид шав (ё тугмаи сабзи «▶ Ворид шудан» дар поён). {1} — реҷаҳо ба давр: Стратег → Фармондеҳ → Тирандоз.',
        '按 {0} —— 附身选中的单位（或点下方绿色的“▶ 附身”）。{1} 循环切换模式：战略家 → 指挥官 → 射手。',
        'Pulsa {0}: posee la unidad seleccionada (o el botón verde «▶ Poseer» abajo). {1} recorre los modos: Estratega → Comandante → Tirador.',
        'Aperte {0}: possua a unidade selecionada (ou o botão verde «▶ Possuir» abaixo). {1} alterna os modos: Estrategista → Comandante → Atirador.',
        '‏לחץ {0} — השתלט על היחידה שנבחרה (או על „▶ השתלט" הירוק למטה). {1} מחליף מצבים במעגל: אסטרטג ← מפקד ← יורה.',
        'Nhấn {0} — nhập vai đơn vị đã chọn (hoặc nút xanh “▶ Nhập vai” bên dưới). {1} — đổi chế độ vòng tròn: Chiến lược → Chỉ huy → Bắn súng.'],
    };
    const C = ['uz', 'tg', 'zh', 'es', 'pt-BR', 'he', 'vi'];
    for (const en in A) C.forEach((L, i) => { const D = V8X_DICT[L] || (V8X_DICT[L] = {}); if (D[en] === undefined) D[en] = A[en][i]; });
    if (typeof V8X !== 'undefined' && V8X.C) for (const L of C) delete V8X.C[L];
    if (typeof L79 !== 'undefined' && L79.D) for (const L in L79.D){ const d = L79.D[L]; if (d && d.cache) d.cache.clear(); }
  }
  // ---------------------------------------------------------------- Tab: три режима и в уроках; P — не режим
  V87M.cmdOk = function(){ return typeof CMD85 !== 'undefined' && CMD85.allowed(); };
  CMD85.key = function(){ return 'P818none'; };   // v85_cmd.js: P больше не включает «Командира»
  const key0 = V87M.key, cmdKey0 = V87M.cmdKey, go0 = V87M.go;
  const already = m => { if (m === V87M.mode() && V87M.canPlay()){ feed(CTL818.T('Ты уже в этом режиме', 'Already in this mode') + ': ' + V87M.nm(m), '#9cf'); CTL818.banner(m); return true; } return false; };
  V87M.key = function(e){
    if (S.attract || MENU.isOpen() || MENU.rebind || (typeof OPER !== 'undefined' && OPER.on) || S.over) return key0.apply(this, arguments);
    if (e.code === 'AltLeft' || e.code === 'AltRight'){ e.preventDefault(); return false; }   // Chrome: одиночный Alt уводит фокус в меню браузера
    if (e.altKey && /^Digit[123]$/.test(e.code)){ CTL818.stats.alt++; if (already(this.ORD[+e.code.slice(5) - 1])) return true; return key0.apply(this, arguments); }
    if (e.code === SET.bind.rts && !e.ctrlKey && !e.altKey && !e.metaKey) CTL818.stats.tab++;
    // Стратег: X — вселиться в выделенного (кроме «только инженеры» — там X = ПВО)
    if (S.mode === 'rts' && !CMD85.on && e.code === SET.bind.switch && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && !CTL818.buildersOnly()){
      if (!e.repeat){ CTL818.stats.x++; CTL818.stats.xRts++; AU.init(); enterFPS(); }
      return true;
    }
    return key0.apply(this, arguments);
  };
  V87M.cmdKey = function(e){
    if (e.code === 'KeyP' && !e.ctrlKey && !e.altKey && !e.metaKey){ e.preventDefault(); e.stopImmediatePropagation(); CTL818.stats.p++; return true; }   // P в «Командире» — ничего
    if (e.code === 'AltLeft' || e.code === 'AltRight'){ e.preventDefault(); return false; }
    if (e.altKey && /^Digit[123]$/.test(e.code) && !e.repeat){ CTL818.stats.alt++; if (already(this.ORD[+e.code.slice(5) - 1])){ e.preventDefault(); e.stopImmediatePropagation(); return true; } }
    if (e.code === SET.bind.switch && !e.ctrlKey && !e.altKey && !e.metaKey){
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat){ AU.init(); CTL818.stats.x++; CTL818.stats.xCmd++; if (e.shiftKey) this.nextSquad(); else CMD85.dive(); }
      return true;
    }
    return cmdKey0.apply(this, arguments);
  };
  // одиночный Alt (отпускание) — тоже без меню браузера, пока идёт бой
  addEventListener('keyup', e => { if ((e.code === 'AltLeft' || e.code === 'AltRight') && !S.attract && !MENU.isOpen()) e.preventDefault(); }, true);
  // кнопка вселения по режиму (телефон ⇆, кнопка «▶»): Командир — в бойца отряда
  V87M.poss = function(){ const m = this.mode(); if (m === 'rts') enterFPS(); else if (m === 'cmd') CMD85.dive(); else switchUnit(1); };
  // ---------------------------------------------------------------- надпись режима
  { const uf0 = uixFrame; uixFrame = function(dt){ uf0.apply(this, arguments); CTL818.safe(() => {
      const m = S.attract ? null : V87M.mode();
      if (m && CTL818.lastM && m !== CTL818.lastM) CTL818.banner(m);
      CTL818.lastM = m;
    }, 'mode'); }; }
  // ---------------------------------------------------------------- тексты без P
  { const trP = tr; tr = function(ru, en){ const r = trP.apply(this, arguments); return CTL818.hasP(en) ? CTL818.noP(r, en) : r; }; }
  { const n2P = N2; N2 = function(p){ const r = n2P.apply(this, arguments); return Array.isArray(p) && CTL818.hasP(p[1]) ? CTL818.noP(r, p[1]) : r; }; }
  // сообщение входа в «Командира» (v85): «… Tab — другой отряд, 2× по бойцу — в бой, P — стратегия» → «X — в бойца, Shift+X — другой отряд, Tab — режим»
  { const fdP = feed; feed = function(text, color){
      if (typeof text === 'string' && /\bP\s*[—–]\s/.test(text)) text = CTL818.safe(() => {
        const x = CTL818.X(), t = bk('rts');
        const want = tr(`${x} — в бойца · Shift+${x} — другой отряд · ${t} — следующий режим`, '{0} — into a trooper · Shift+{0} — next squad · {1} — next mode'.replace(/\{0\}/g, x).replace('{1}', t)).split(' · ').join(', ');
        let s = CTL818.noP(text);
        if (/\bTab\s*[—–]\s/.test(s)) s = s.replace(/\bTab\s*[—–]\s*[^,，、;]*/, want);
        return s;
      }, 'feedP') || text;
      return fdP.call(this, text, color); }; }
  if (typeof helpFPS === 'function'){ const hf = helpFPS; helpFPS = function(){ return CTL818.noP(hf.apply(this, arguments)); }; }
  // подсказка внизу «Командира»: X — в бойца, Shift+X — другой отряд, Tab — режим
  { const ui0 = CMD85.ui; CMD85.ui = function(){ const r = ui0.apply(this, arguments); CTL818.safe(() => {
      const t = document.querySelector('#c85 .c5tip'); if (!t || this.aim || this.ph()) return;
      const want = tr(`${CTL818.X()} — в бойца · Shift+${CTL818.X()} — другой отряд · ${bk('rts')} — следующий режим`, `{0} — into a trooper · Shift+{0} — next squad · {1} — next mode`.replace(/\{0\}/g, CTL818.X()).replace('{1}', bk('rts')));
      const s = t.textContent; if (s.indexOf(want) >= 0) return;
      // v87 уже заменил «Tab — отряд» на «X — другой отряд · Tab — в шутер» (RU/EN); для других языков — первый «Tab — …»
      const parts = s.split(' · ');
      const k = parts.findIndex(p => p.indexOf(CTL818.X() + ' — ') === 0 || p.indexOf('Tab — ') === 0 || p.indexOf(bk('rts') + ' — ') === 0);
      if (k < 0){ t.textContent = s + ' · ' + want; return; }
      let j = k; while (j + 1 < parts.length && (parts[j + 1].indexOf(bk('rts') + ' — ') === 0 || parts[j + 1].indexOf('Tab — ') === 0)) j++;
      parts.splice(k, j - k + 1, want);
      t.textContent = parts.join(' · ');
    }, 'c5tip'); return r; }; }
  // ---------------------------------------------------------------- уроки (ПК): «в бой / вселиться» — X; «Командир» — Tab / Alt+2, без P
  if (typeof CTL72 !== 'undefined'){
    CTL818.safe(() => {
      const possH = () => { const x = CTL818.X(), t = bk('rts'); return [`Нажми ${x} — вселиться в выделенного (или зелёную «▶ Вселиться» внизу). ${t} — режимы по кругу: Стратег → Командир → Шутер.`,
        'Press {0} — possess the selected unit (or the green "▶ Possess" below). {1} cycles the modes: Strategist → Commander → Shooter.'.replace('{0}', x).replace('{1}', t)]; };
      for (const id in CTL72.schemes){
        const s = CTL72.schemes[id]; if (!s || s.plat !== 'pc' || !s.acts) continue;
        const a = { keys: () => [CTL818.X()], el: () => [{ sel: '#card .poss' }] }; Object.defineProperty(a, 'h', { get: possH, enumerable: true });
        s.acts.toFps = a; s.acts.possess = a;
        if (s.acts.c85_enter){ s.acts.c85_enter = Object.assign({}, s.acts.c85_enter, { keys: () => [bk('rts')] }); }
        if (s.acts.c85_back){ const o = s.acts.c85_back, d = Object.getOwnPropertyDescriptor(o, 'h'); const n = Object.assign({}, o, { keys: () => ['Alt+2'] }); if (d && d.get) Object.defineProperty(n, 'h', { get: d.get, enumerable: true }); s.acts.c85_back = n; }
      }
    }, 'ctl72');
  }
  // ---------------------------------------------------------------- кнопки телефона на ПК без сенсора — скрыть
  CTL818.pcOnly = function(){
    const b = document.body; if (!b) return;
    const pc = !this.ph() && !(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0);
    b.classList.toggle('pc818', pc);
  };
  CTL818.safe(() => CTL818.pcOnly(), 'pc');
  addEventListener('resize', () => CTL818.safe(() => CTL818.pcOnly(), 'pc'));
  addEventListener('touchstart', () => CTL818.safe(() => setTimeout(() => CTL818.pcOnly(), 50), 'pc'), { passive: true, capture: true });
  (function(){ const st = document.createElement('style'); st.id = 'ctl818css'; st.textContent = `
  #m818{position:fixed;left:50%;top:26%;transform:translate(-50%,-50%) scale(.96);z-index:60;pointer-events:none;opacity:0;transition:opacity .18s,transform .18s;
    display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 22px;border-radius:12px;background:rgba(8,10,14,.62);border:1px solid rgba(255,210,122,.45);
    font-family:"Exo 2",sans-serif;color:#ffd27a;text-shadow:0 2px 6px #000}
  #m818.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
  #m818 b{font-size:30px;letter-spacing:2px;font-weight:800} #m818 b i{font-style:normal;margin-right:6px} #m818 small{font-size:13px;color:#e8dcb8;opacity:.85}
  body.pc818 #touch, body.pc818 #c85 .c5mb, body.pc818 .nj79ph, body.pc818 #v781act{display:none!important}
  `; document.head.appendChild(st); })();
}
