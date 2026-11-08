// =====================================================================
//  v8.7 — ОДНА КНОПКА — ТРИ РЕЖИМА («лестница высоты»): Стратег → Командир → Шутер → Стратег (по кругу).
//  • ПК: Tab (клавиша режима) — следующий режим, Shift+Tab — предыдущий; прямые клавиши Alt+1 Стратег, Alt+2 (или P) Командир,
//    Alt+3 Шутер. Одна кнопка режима: в шутере — слева вверху (вместо «◩ Стратегия»), в стратегии — рядом с «▶ Вселиться»,
//    в «Командире» — справа от способностей. Клик — следующий режим, удержание или ПКМ — выбор из трёх.
//  • Телефон: та же кнопка вверху справа (бывшая «◩ Стратегия / ▶ В бой»): тап — следующий, долгое нажатие — 3 иконки.
//    «Командир» на телефоне включён по умолчанию (отдельная ⌖ больше не нужна); в Настройках — только «скрыть».
//  • Кнопка вселения по смыслу режима: Стратег — вселиться в выбранного; Командир — следующий отряд (сначала ближайший к бою,
//    X / ⇆); Шутер — переселиться в другого бойца (как было).
//  • В обычных уроках (кроме «Командира») лестница пропускает «Командира» — Tab, как раньше, ведёт стратегия ⇄ шутер.
//  Хуки: обёртки CMD85.allowed/btns/toggle/ui/enter, uixModeRender, p64Labels, helpRTS/helpFPS, feed, MENU.html_settings, P71M.sec;
//  1 строка в v85_cmd.js (клавиши в «Командире»). Новый код только здесь.
// =====================================================================
const V87M = {
  ORD: ['rts', 'cmd', 'fps'], err: {}, pr: null, tmr: 0, pk: null, cq: null, cqT: -99, cqI: 0, hintM: 0,
  stats: { next: 0, go: 0, pick: 0, sq: 0, long: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('V87M ' + tag, e); } } },
  L: (ru, en) => tr(ru, en, en, en),
  ph(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  mode(){ return S.mode === 'fps' ? 'fps' : (typeof CMD85 !== 'undefined' && CMD85.on ? 'cmd' : 'rts'); },
  // обычный урок или старое обучение — «Командира» в лестнице нет (Tab как раньше)
  tut(){ if (typeof CMD85 !== 'undefined' && CMD85.force) return false; return (typeof T72 !== 'undefined' && T72.on) || (typeof TUT !== 'undefined' && TUT.on); },
  cmdOk(){ return typeof CMD85 !== 'undefined' && CMD85.allowed() && !this.tut(); },
  INFO: {
    rts: { ic: '◩', n: ['Стратег', 'Strategist'], to: ['Стратегия', 'Strategy'], d: ['Вид сверху: база, заказ войск, приказы', 'Top view: base, orders, production'] },
    cmd: { ic: '⌖', n: ['Командир', 'Commander'], to: ['Командир', 'Commander'], d: ['Камера над одним отрядом, приказы кликом, способности 1–4', 'Camera over one squad, click orders, abilities 1–4'] },
    fps: { ic: '▶', n: ['Шутер', 'Shooter'], to: ['В бой', 'Fight'], d: ['Воюешь сам от первого лица', 'You fight yourself in first person'] },
  },
  nm(m){ const I = this.INFO[m]; return this.L(I.n[0], I.n[1]); },
  to(m){ const I = this.INFO[m]; return this.L(I.to[0], I.to[1]); },
  keyOf(m){ return 'Alt+' + (this.ORD.indexOf(m) + 1); },
  // следующий/предыдущий по лестнице (недоступный «Командир» пропускается)
  nextOf(m, dir){
    const O = this.ORD; let i = O.indexOf(m);
    for (let k = 0; k < 3; k++){ i = (i + (dir < 0 ? 2 : 1)) % 3; if (O[i] !== 'cmd' || this.cmdOk()) return O[i]; }
    return m;
  },
  canPlay(){ return !S.attract && !S.over && !MENU.isOpen(); },
  step(dir){ if (!this.canPlay()) return false; this.stats.next++; return this.go(this.nextOf(this.mode(), dir || 1)); },
  go(m){
    const cur = this.mode();
    if (m === cur || S.attract) return false;
    this.stats.go++;
    if (m === 'cmd' && !CMD85.allowed()){ feed(this.L('«Командир» скрыт в Настройках', 'Commander is hidden in Settings'), '#f88'); return false; }
    if (m === 'rts'){
      if (cur === 'cmd') CMD85.exit();
      else { CMD85.back = null; enterRTS(); if (typeof HINTS !== 'undefined') HINTS.used('rts'); }
    } else if (m === 'cmd'){ CMD85.toggle(); }
    else { if (cur === 'cmd') CMD85.dive(); else enterFPS(); }
    this.close(); this.hint();
    emit('ui', { kind: 'ok' });
    return this.mode() === m;
  },
  // кнопка вселения по смыслу режима
  poss(){
    const m = this.mode();
    if (m === 'rts') enterFPS();
    else if (m === 'cmd') this.nextSquad();
    else switchUnit(1);
  },
  nextSquad(){
    const C = CMD85, now = S.rtime || performance.now() / 1000;
    if (!this.cq || now - this.cqT > 4 || !this.cq.length){
      const sc = g => { const p = C.anchor(g); return p ? actionDist({ pos: p }, 0) - (isSquad(g) ? 10 : 0) : 1e9; };
      this.cq = C.list().filter(g => g !== C.g).map(g => ({ g, d: sc(g) })).sort((a, b) => a.d - b.d).map(o => o.g); this.cqI = 0;
    } else this.cqI = (this.cqI + 1) % this.cq.length;
    this.cqT = now;
    const g = this.cq.filter(x => C.ok(x))[this.cqI % max(1, this.cq.length)];
    if (!g){ feed(this.L('Других отрядов нет', 'No other squads'), '#f88'); return false; }
    C.switchTo(g); this.stats.sq++;
    return true;
  },
  hint(){
    if (this.hintM === S.match87 || S.attract) return;
    this.hintM = S.match87;
    feed(this.ph() ? this.L('Кнопка режима вверху справа: тап — следующий (Стратег → Командир → Шутер), удерживать — выбор', 'Mode button at the top right: tap — next (Strategist → Commander → Shooter), hold — pick')
      : this.L(`${bk('rts')} — по кругу: Стратег → Командир → Шутер · Alt+1/2/3 — сразу в режим`, `${bk('rts')} cycles: Strategist → Commander → Shooter · Alt+1/2/3 — straight to a mode`), '#9cf');
  },
  // ---------------------------------------------------------------- клавиши
  key(e){   // общий перехват (не в «Командире»; там — cmdKey из v85_cmd.js)
    if (S.attract || MENU.isOpen() || MENU.rebind || (typeof OPER !== 'undefined' && OPER.on) || S.over) return false;
    if (S.mode !== 'rts' && S.mode !== 'fps') return false;
    if (e.altKey && /^Digit[123]$/.test(e.code)){ this.go(this.ORD[+e.code.slice(5) - 1]); return true; }
    if (e.code === SET.bind.rts && !e.ctrlKey && !e.altKey && !e.metaKey){ if (!e.repeat) this.step(e.shiftKey ? -1 : 1); return true; }
    // телефон в стратегии: ⇆ (клавиша смены бойца) — вселиться в выбранного
    if (S.mode === 'rts' && !e.isTrusted && this.ph() && e.code === SET.bind.switch){ this.poss(); return true; }
    return false;
  },
  cmdKey(e){
    if (e.repeat && (e.code === SET.bind.rts || e.altKey)) { e.preventDefault(); e.stopImmediatePropagation(); return true; }
    let hit = false;
    if (e.altKey && /^Digit[123]$/.test(e.code)){ hit = true; this.go(this.ORD[+e.code.slice(5) - 1]); }
    else if (e.code === SET.bind.rts && !e.ctrlKey && !e.altKey){ hit = true; this.step(e.shiftKey ? -1 : 1); }
    else if (e.code === SET.bind.switch && !e.ctrlKey){ hit = true; AU.init(); this.nextSquad(); }
    if (hit){ e.preventDefault(); e.stopImmediatePropagation(); }
    return hit;
  },
  // ---------------------------------------------------------------- кнопка: тап / долгое нажатие / выбор
  isBtn(t){ return t && t.closest ? t.closest('#m87, #touch .tt [data-t="map"], #m74go') : null; },
  down(el, x, y){
    clearTimeout(this.tmr);
    this.pr = { el, x, y, long: false };
    this.tmr = setTimeout(() => { if (!this.pr) return; this.pr.long = true; this.stats.long++; this.open(el); if (typeof M71 !== 'undefined' && M71.haptic) M71.haptic(14); }, 430);
  },
  up(x, y){
    clearTimeout(this.tmr);
    const p = this.pr; this.pr = null; if (!p) return;
    if (p.long){ const t = document.elementFromPoint(x, y), o = t && t.closest ? t.closest('[data-m87]') : null; if (o && !o.disabled) this.pick(o.dataset.m87); return; }
    if (this.pk && this.pk.style.display !== 'none'){ this.close(); return; }
    AU.init(); this.step(1);
  },
  pick(m){ this.stats.pick++; this.close(); AU.init(); if (m !== this.mode()) this.go(m); },
  open(el){
    let P = this.pk;
    if (!P){
      P = this.pk = document.createElement('div'); P.id = 'm87pk'; document.body.appendChild(P);
      const act = e => { const o = e.target.closest('[data-m87]'); e.stopPropagation(); if (e.cancelable) e.preventDefault(); if (o && !o.disabled) this.pick(o.dataset.m87); };
      P.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
      P.addEventListener('touchend', act, { passive: false });
      P.addEventListener('mousedown', e => e.stopPropagation());
      P.addEventListener('click', act);
    }
    const cur = this.mode();
    P.innerHTML = this.ORD.map(m => { const dis = m === 'cmd' && !CMD85.allowed();
      return `<button data-m87="${m}" class="${m === cur ? 'cur' : ''}" ${dis ? 'disabled' : ''}><i>${this.INFO[m].ic}</i><b>${this.nm(m)}</b>${this.ph() ? '' : `<kbd>${this.keyOf(m)}</kbd>`}<small>${this.L(this.INFO[m].d[0], this.INFO[m].d[1])}</small></button>`; }).join('');
    P.classList.toggle('ph', this.ph());
    P.style.display = 'flex';
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 2, bottom: innerHeight / 2 };
    const w = P.offsetWidth, h = P.offsetHeight;
    let x = (r.left + r.right) / 2 - w / 2, y = r.bottom + 8;
    if (y + h > innerHeight - 6) y = r.top - h - 8;
    x = clamp(x, 6, innerWidth - w - 6); y = clamp(y, 6, innerHeight - h - 6);
    P.style.left = Math.round(x) + 'px'; P.style.top = Math.round(y) + 'px';
  },
  close(){ if (this.pk) this.pk.style.display = 'none'; },
  isOpen(){ return !!this.pk && this.pk.style.display !== 'none'; },
  // ---------------------------------------------------------------- отрисовка кнопки
  html(){
    const cur = this.mode(), nx = this.nextOf(cur, 1);
    const lad = this.ORD.map(m => `<i class="${m === cur ? 'on' : ''} ${m === 'cmd' && !this.cmdOk() ? 'off' : ''}">${this.INFO[m].ic}</i>`).join('');
    return `<span class="lad">${lad}</span><b>${this.INFO[nx].ic} ${this.to(nx)}</b><kbd>${bk('rts')}</kbd>`;
  },
  frame(){
    let b = $('m87');
    if (!b){
      b = document.createElement('button'); b.id = 'm87'; document.body.appendChild(b);
    }
    const play = !S.attract && !MENU.isOpen() && !S.over, ph = this.ph(), m = this.mode();
    if (!play && this.isOpen()) this.close();
    const show = play && !ph;
    if (!show){ if (b.parentNode !== document.body) document.body.appendChild(b); b.style.display = 'none'; }
    else {
      const h = this.html();
      if (b._h !== h){ b._h = h; b.innerHTML = h; b.title = this.L(`Режим: ${this.nm(m)}. Клик или ${bk('rts')} — следующий; удерживать или ПКМ — выбор; Alt+1/2/3 — сразу`, `Mode: ${this.nm(m)}. Click or ${bk('rts')} — next; hold or RMB — pick; Alt+1/2/3 — direct`); }
      b.style.display = '';
      b.dataset.m = m;
      if (m === 'fps'){
        const ux = $('uxmode');
        if (ux && ux.style.display !== 'none'){ if (b.parentNode !== ux) ux.insertBefore(b, ux.firstChild); b.classList.add('inux');
          const r = ux.getBoundingClientRect(), w = r.width > 20 ? Math.round(r.right - r.left + 10) + 'px' : '0px'; if (this.w87 !== w){ this.w87 = w; document.body.style.setProperty('--m87w', w); } }   // «Ты: …» (v7.3) — правее кнопки
        else { if (b.parentNode !== document.body) document.body.appendChild(b); b.classList.remove('inux'); b.style.left = '12px'; b.style.top = '64px'; b.style.bottom = ''; }
      } else {
        if (b.parentNode !== document.body) document.body.appendChild(b);
        b.classList.remove('inux'); b.style.top = '';
        if (m === 'cmd'){
          const bar = document.querySelector('#c85 .c5bar'), r = bar && bar.offsetWidth ? bar.getBoundingClientRect() : null;
          if (r && r.width > 20){ b.style.left = Math.round(r.right + 10) + 'px'; b.style.bottom = Math.round(innerHeight - r.bottom) + 'px'; }
          else { b.style.left = 'calc(50% + 200px)'; b.style.bottom = '10px'; }
        } else {
          const cd = document.querySelector('#card .poss') || $('card'), r = cd && cd.offsetWidth ? cd.getBoundingClientRect() : null;
          if (r && r.width > 40){ b.style.left = Math.round(r.right + 8) + 'px'; b.style.bottom = Math.round(innerHeight - r.bottom) + 'px'; }
          else { b.style.left = 'calc(50% - 90px)'; b.style.bottom = '10px'; }
        }
      }
    }
    // телефон: кнопка «простой стратегии» (v7.4) тоже ведёт по лестнице
    const g = $('m74go');
    if (g && ph){ const nx = this.nextOf(m, 1), t = `<b>${this.INFO[nx].ic}</b> ${uixEsc(this.to(nx))}`; if (g._h87 !== t){ g._h87 = t; g.innerHTML = t; } }
  },
  phLabel(){ const nx = this.nextOf(this.mode(), 1); return this.INFO[nx].ic + ' ' + this.to(nx); },
};
S.match87 = 0;
if (SET.cmd87ph === undefined) SET.cmd87ph = true;   // «Командир» на телефоне: по умолчанию показан
// ---------------------------------------------------------------- обёртки CMD85
CMD85.allowed = function(){ return !S.attract && (!this.ph() || SET.cmd87ph !== false || this.force); };
CMD85.btns = function(){ const b = $('c85go'); if (b) b.style.display = 'none'; };   // отдельная ⌖ больше не нужна — её заменила кнопка режима
{ const tg0 = CMD85.toggle; CMD85.toggle = function(){ const fromFps = S.mode === 'fps'; const r = tg0.apply(this, arguments);
    if (fromFps && this.on){ this.stats.ret++; if (typeof T72 !== 'undefined' && T72.on) T72.ev('ret85'); }   // из шутера прямо в «Командира» (P, Alt+2, выбор)
    return r; }; }
{ const ui0 = CMD85.ui; CMD85.ui = function(){ const r = ui0.apply(this, arguments); V87M.safe(() => {
    const t = document.querySelector('#c85 .c5tip'); if (!t) return;
    const s = t.textContent;
    if (s.includes('Tab — отряд')) t.textContent = s.replace('Tab — отряд', `${keyLabel(SET.bind.switch)} — другой отряд · ${bk('rts')} — в шутер`);
    else if (s.includes('Tab — squad')) t.textContent = s.replace('Tab — squad', `${keyLabel(SET.bind.switch)} — next squad · ${bk('rts')} — shooter`);
  }, 'ui'); return r; }; }
{ const fd0 = feed; feed = function(text, color){
    if (typeof text === 'string' && text.indexOf('Tab — ') >= 0 && typeof CMD85 !== 'undefined')
      text = text.replace('Tab — другой отряд, 2× по бойцу — в бой, P — стратегия', `${keyLabel(SET.bind.switch)} — другой отряд, ${bk('rts')} или 2× по бойцу — в бой, P — стратегия`)
                 .replace('Tab — next squad, double-click a trooper — fight, P — strategy', `${keyLabel(SET.bind.switch)} — next squad, ${bk('rts')} or double-click a trooper — fight, P — strategy`);
    return fd0.call(this, text, color); }; }
// ---------------------------------------------------------------- ввод
addEventListener('keydown', e => { if (V87M.safe(() => V87M.key(e), 'key')){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
{
  const isB = e => V87M.isBtn(e.target);
  document.addEventListener('touchstart', e => {
    if (V87M.isOpen() && !(e.target.closest && e.target.closest('#m87pk')) && !isB(e)) V87M.close();
    const b = isB(e); if (!b) return;
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    const t = e.changedTouches[0]; V87M.down(b, t.clientX, t.clientY);
  }, { capture: true, passive: false });
  document.addEventListener('touchmove', e => { if (V87M.pr && isB(e)){ e.stopPropagation(); if (e.cancelable) e.preventDefault(); } }, { capture: true, passive: false });
  document.addEventListener('touchend', e => {
    if (!V87M.pr) { if (isB(e)){ e.stopPropagation(); if (e.cancelable) e.preventDefault(); } return; }
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    const t = e.changedTouches[0]; V87M.safe(() => V87M.up(t.clientX, t.clientY), 'up');
  }, { capture: true, passive: false });
  document.addEventListener('touchcancel', () => { clearTimeout(V87M.tmr); V87M.pr = null; }, { capture: true, passive: true });
  document.addEventListener('mousedown', e => {
    if (V87M.isOpen() && !(e.target.closest && e.target.closest('#m87pk')) && !isB(e)) V87M.close();
    const b = isB(e); if (!b) return;
    e.stopPropagation(); e.preventDefault();
    if (e.button === 2){ V87M.open(b); return; }
    if (e.button === 0) V87M.down(b, e.clientX, e.clientY);
  }, true);
  document.addEventListener('mouseup', e => { if (!V87M.pr || e.button !== 0) return; e.stopPropagation(); V87M.safe(() => V87M.up(e.clientX, e.clientY), 'up'); }, true);
  document.addEventListener('click', e => { if (isB(e)){ e.stopPropagation(); e.preventDefault(); if (!e.isTrusted && !V87M.pr){ AU.init(); V87M.step(1); } } }, true);
  document.addEventListener('contextmenu', e => { if (isB(e)){ e.preventDefault(); e.stopPropagation(); } }, true);
}
// ---------------------------------------------------------------- кадр интерфейса, подписи, справка
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0.apply(this, arguments); V87M.safe(() => V87M.frame(), 'frame'); }; }
{ const nm0 = newMatch; newMatch = function(){ S.match87 = (S.match87 || 0) + 1; V87M.cq = null; V87M.close(); return nm0.apply(this, arguments); }; }
if (typeof p64Labels === 'function'){
  p64Labels = function(){
    const lab = { box: '⬚ ' + tr('Рамка', 'Box', 'Khung'), army: '◆ ' + tr('Вся армия', 'All army', 'Toàn quân'), builder: '⚒ ' + tr('Инженер', 'Builder', 'Kỹ sư'), map: V87M.phLabel() };
    for (const k in lab){ const b = document.querySelector(`#touch [data-t="${k}"]`); if (!b) continue; if (b.textContent !== lab[k]) b.textContent = lab[k]; if (k === 'map' && b.style.display) b.style.display = ''; }
  };
}
{ const hr0 = helpRTS; helpRTS = function(){ let h = hr0.apply(this, arguments);
    const o = tr('вселиться в выделенного (ничего не выделено — в бой)', 'possess the selection (nothing selected — to battle)', 'nhập vai đơn vị đã chọn');
    return h.replace(o, tr('режим по кругу: Стратег → Командир → Шутер · Alt+1/2/3 — сразу', 'mode cycle: Strategist → Commander → Shooter · Alt+1/2/3 — direct', 'chế độ: Chiến lược → Chỉ huy → Bắn súng')); }; }
{ const hf0 = helpFPS; helpFPS = function(){ let h = hf0.apply(this, arguments);
    const o = tr('стратегия (там та же клавиша — вселиться в выделенного)', 'strategy (the same key there possesses the selection)', 'chiến thuật');
    return h.replace(o, tr('стратегия (по кругу: Стратег → Командир → Шутер; P / Alt+2 — сразу в «Командира»)', 'strategy (cycle: Strategist → Commander → Shooter; P / Alt+2 — straight to Commander)', 'chiến thuật')); }; }
// ---------------------------------------------------------------- настройка: только «скрыть Командира» на телефоне
{ const lab = () => V87M.L('«Командир» на телефоне (выкл — скрыть)', '"Commander" on phone (off — hide)');
  const fixH = (h, phone) => h.replace(/<div class="row"><label>[^<]*<\/label><button class="tog[^"]*" data-p74tog="cmd85ph">[^<]*<\/button><\/div>/, () => V74.togBtn('cmd87ph', lab(), false))
    .replace(/<button class="p71o[^"]*" data-p74tog="cmd85ph"><span>[^<]*<\/span><b>[^<]*<\/b><\/button>/, () => V74.togBtn('cmd87ph', lab(), true));
  const hs0 = MENU.html_settings; MENU.html_settings = function(){ const h = hs0.apply(this, arguments); return typeof V74 === 'undefined' ? h : fixH(h); };
  if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(){ const h = s0.apply(this, arguments); return typeof V74 === 'undefined' ? h : fixH(h); }; } }
// ---------------------------------------------------------------- стили
(function(){ const st = document.createElement('style'); st.id = 'm87css'; st.textContent = `
  #c85go, #uxmode #c85fps, #uxmode #uxStrat{display:none!important}
  #c85 .c5mb{display:none!important}
  html body.cmd85.touch #touch .tt [data-t="map"]{display:block!important}
  html body.cmd85.touch #touch .tt .m67n{display:block!important}
  #m87{position:fixed;z-index:31;display:flex;align-items:center;gap:8px;height:46px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,210,122,.6);
    background:rgba(20,22,26,.9);color:#ffd27a;font:700 13px "Exo 2",sans-serif;cursor:pointer;white-space:nowrap;pointer-events:auto;user-select:none}
  #m87:hover{border-color:#ffd27a;background:rgba(48,38,16,.95)}
  #m87 .lad{display:flex;gap:2px} #m87 .lad i{font-style:normal;width:20px;height:22px;line-height:22px;text-align:center;border-radius:5px;color:#8a8270;background:rgba(255,255,255,.05);font-size:13px}
  #m87 .lad i.on{color:#111;background:#ffd27a} #m87 .lad i.off{opacity:.3}
  #m87 b{color:#fff2d0;font-weight:700} #m87 kbd{font:700 10px "Exo 2";padding:1px 5px;border-radius:3px;background:rgba(255,255,255,.12);color:#ffd27a}
  body:not(.touch).m64fps #who73, body:not(.touch) #who73{margin-left:var(--m87w,0px)}
  #m87.inux{position:static;height:34px;padding:0 10px;margin-right:6px}
  #m87[data-m="cmd"]{height:70px;flex-direction:column;justify-content:center;gap:4px}
  #m87pk{position:fixed;z-index:80;display:none;gap:6px;padding:6px;border-radius:12px;background:rgba(8,10,14,.94);border:1px solid rgba(255,210,122,.45);box-shadow:0 6px 24px rgba(0,0,0,.6);font-family:"Exo 2",sans-serif}
  #m87pk button{position:relative;width:118px;min-height:92px;border-radius:10px;border:1px solid rgba(232,220,184,.25);background:rgba(24,26,30,.95);color:#e8dcb8;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;padding:8px 6px;cursor:pointer;font-family:inherit}
  #m87pk button i{font-style:normal;font-size:26px;line-height:1;color:#ffd27a} #m87pk button b{font-size:13px} #m87pk button small{font-size:10px;opacity:.7;line-height:1.15;text-align:center}
  #m87pk button kbd{position:absolute;right:5px;top:4px;font:700 9px "Exo 2";padding:0 4px;border-radius:3px;background:rgba(255,255,255,.1);color:#ffd27a}
  #m87pk button.cur{border-color:#ffd27a;background:rgba(60,46,14,.95)} #m87pk button:hover{border-color:#ffd27a} #m87pk button[disabled]{opacity:.35}
  #m87pk.ph button{width:86px;min-height:74px;padding:6px 4px} #m87pk.ph button small{display:none} #m87pk.ph button i{font-size:30px}
  body.touch #touch .tt [data-t="map"]{position:relative}
  body.touch #touch .tt [data-t="map"]::after{content:'';position:absolute;right:3px;bottom:3px;width:0;height:0;border-left:5px solid transparent;border-top:5px solid rgba(255,255,255,.6);transform:rotate(-90deg)}
`; document.head.appendChild(st); })();
// ---------------------------------------------------------------- урок «Командир» под новую схему (те же 6 шагов)
if (typeof CTL72 !== 'undefined' && typeof L84 !== 'undefined' && L84.LES && L84.LES.l85cmd){
  L84.LES.l85cmd.d = A84('Одна кнопка — три режима: Стратег → Командир → Шутер. Вид сверху на один отряд, приказы кликом, 4 способности, смена отряда, нырок в шутер и обратно',
    'One button, three modes: Strategist → Commander → Shooter. Top view of one squad, click orders, 4 abilities, squad switching, diving into the shooter and back');
  const PC = {
    c85_enter: { keys: () => [bk('rts'), 'P'], el: () => [{ sel: '#m87' }], h: () => A84(`Одна кнопка — три режима, по кругу: Стратег → Командир → Шутер. Нажми ${bk('rts')} или кнопку режима внизу (рядом с «▶ Вселиться») — попадёшь в «Командира». Сразу туда — P или Alt+2.`, `One button, three modes in a cycle: Strategist → Commander → Shooter. Press ${bk('rts')} or the mode button below (next to "▶ Possess") to get to Commander. Straight there — P or Alt+2.`) },
    c85_switch: { keys: () => [keyLabel(SET.bind.switch)], el: () => [{ sel: '#c85 .c5cd:not(.cur)' }], h: () => A84(`Смени отряд: ${keyLabel(SET.bind.switch)} — следующий (сначала тот, кто ближе к бою), карточка слева или средняя кнопка мыши по отряду. Прежний отряд сам продолжит приказ.`, `Switch squads: ${keyLabel(SET.bind.switch)} — the next one (closest to the fight first), a card on the left or the middle mouse button on a squad. The previous squad keeps its order.`) },
    c85_dive: { keys: () => [bk('rts'), 'F'], el: () => [{ sel: '#m87' }], h: () => A84(`Дальше по лестнице — «Шутер»: ${bk('rts')} или кнопка режима. Ещё можно: двойной ЛКМ по бойцу или F. Колесо «внутрь» до упора — в бойца от третьего лица.`, `Next on the ladder is the Shooter: ${bk('rts')} or the mode button. Also: double LMB on a trooper or F. Wheel all the way in — third person.`) },
    c85_back: { keys: () => ['P', 'Alt+2'], el: () => [{ sel: '#m87' }], h: () => A84(`${bk('rts')} в шутере ведёт по кругу к «Стратегу». Сразу в «Командира» — P или Alt+2 (или удержи кнопку режима и выбери ⌖). Ветеранство отрядов сохраняется: меню → «Мои отряды».`, `${bk('rts')} in the shooter cycles on to the Strategist. Straight to Commander — P or Alt+2 (or hold the mode button and pick ⌖). Squad veterancy is kept: menu → "My squads".`) },
  };
  const MB = '#touch .tt [data-t="map"]';
  const PH = {
    c85_enter: { g: 'tap', el: () => [{ sel: MB }], h: A84('Кнопка режима вверху справа: тап — следующий режим по кругу (Стратег → Командир → Шутер). Тапни — попадёшь в «Командира» ⌖. Удержи — выбор из трёх.', 'The mode button at the top right: tap — next mode in the cycle (Strategist → Commander → Shooter). Tap it to get to Commander ⌖. Hold — pick one of three.') },
    c85_switch: { g: 'tap', el: () => [{ sel: '#c85 .c5cd:not(.cur)' }], h: A84('Тапни другую карточку слева или ⇆ вверху — следующий отряд (сначала ближайший к бою).', 'Tap another card on the left or ⇆ at the top — the next squad (closest to the fight first).') },
    c85_dive: { g: 'tap', el: () => [{ sel: MB }], h: A84('Тап по кнопке режима «▶ В бой» — дальше по лестнице, в «Шутер». Или двойной тап по бойцу отряда.', 'Tap the mode button "▶ Fight" — next on the ladder, the Shooter. Or double-tap a trooper of the squad.') },
    c85_back: { g: 'hold', el: () => [{ sel: MB }], h: A84('Удержи кнопку режима — появятся три иконки — выбери ⌖ «Командир». (Простой тап ведёт по кругу к «Стратегу».) Ветеранство сохраняется: меню → «Мои отряды».', 'Hold the mode button — three icons appear — pick ⌖ Commander. (A plain tap cycles on to the Strategist.) Veterancy is kept: menu → "My squads".') },
  };
  const wrap = o => { const r = Object.assign({}, o); if (typeof o.h === 'function'){ const f = o.h; Object.defineProperty(r, 'h', { get: f, enumerable: true }); } return r; };
  for (const id in CTL72.schemes){ const s = CTL72.schemes[id]; if (!s.acts) continue; const src = s.plat === 'pc' ? PC : PH; for (const k in src) s.acts[k] = Object.assign({}, s.acts[k] || {}, wrap(src[k])); }
}
