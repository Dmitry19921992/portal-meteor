// =====================================================================
//  v7.4 — ТЕЛЕФОН (фидбек 21.10 01:29 и 24.10 10:39). Работает только при раскладке v7.3 (M73.act()).
//   • три режима стиков: только левый — «авто» (магнит макс., пули слабее);
//     только правый — прицел включается сам, магнит сильнее и шире, точность выше;
//     оба — без прицела, магнит и точность меньше;
//   • кнопка 👁 — скрыть / вернуть интерфейс;
//   • стратегия «только инженер и здания»: карточки слева (тап — камера к нему), снизу — что строить /
//     производить, «В бой» слева сверху, армия воюет сама. Полная стратегия — Настройки → Телефон.
// =====================================================================
const M74 = {
  mode: 'L', lT: -9, aimSet: false, nohud: false, sel: null, sig: '', cardSig: '', err: 0,
  on(){ return typeof M73 !== 'undefined' && M73.act(); },
  inf(){ const c = ctrlEntity(); return !!c && c.cls === 'inf'; },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err){ this.err = 1; console.warn('m74 ' + tag, e); } } },
  // ------------------------------------------------------------ три режима стиков
  stickStep(){
    const now = performance.now() / 1000;
    if (TOUCH.joy) this.lT = now;
    const L = now - this.lT < 0.35, P = TOUCH.look && M71.tp[TOUCH.look.id], R = !!(TOUCH.look && P) || now - M73.rT < 0.7;
    const m = R && !L ? 'R' : R && L ? 'LR' : 'L';
    const fps = this.on() && S.mode === 'fps' && !S.attract && !MENU.isOpen() && this.inf() && !CAMFX.busy();
    this.mode = fps ? m : 'L';
    // только правый стик — прицел включается сам
    const wantAim = fps && m === 'R' && !(S.kit && S.kit.reloadT > 0);
    if (wantAim && !this.aimSet){ this.aimSet = true; mouseR = true; }
    else if (!wantAim && this.aimSet){ this.aimSet = false; if (!TOUCH.aimOn) mouseR = false; }
    let el = document.getElementById('m74mode');
    if (!el){ el = document.createElement('div'); el.id = 'm74mode'; document.body.appendChild(el); }
    const t = !fps ? '' : m === 'R' ? tr('◎ прицел', '◎ aim', '◎ ngắm', '◎ כוונת') : m === 'LR' ? tr('○ свободно', '○ free', '○ tự do', '○ חופשי') : tr('● авто', '● auto', '● tự động', '● אוטו');
    if (el._t !== t){ el._t = t; el.textContent = t; el.className = 'm74m' + this.mode; }
    el.style.display = t && !this.nohud ? 'block' : 'none';
  },
  // ------------------------------------------------------------ 👁 скрыть интерфейс
  eye(){
    let b = document.getElementById('m74eye');
    if (!b){
      b = document.createElement('button'); b.id = 'm74eye'; b.textContent = '👁'; document.body.appendChild(b);
      const go = e => { e.preventDefault(); e.stopPropagation(); this.nohud = !this.nohud; document.body.classList.toggle('m74nh', this.nohud); b.classList.toggle('on', this.nohud); M71.haptic(8); };
      b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('click', go);
    }
    const show = this.on() && S.mode === 'fps' && !S.attract && !MENU.isOpen() && !S.over;
    b.style.display = show ? 'flex' : 'none';
    if (!show && this.nohud){ this.nohud = false; document.body.classList.remove('m74nh'); b.classList.remove('on'); }
  },
};
// ---- магнит и точность по режиму стиков (только телефон, только пехота)
{ const k0 = AIMA.K.bind(AIMA);
  AIMA.K = function(){ const k = k0(); if (!M74.on() || !M74.inf()) return k; return M74.mode === 'R' ? max(k, 1) * 1.3 : M74.mode === 'LR' ? k * 0.5 : k; }; }
{ const gs0 = gunSpread;
  gunSpread = function(u, W, K){ const s = gs0(u, W, K); if (u !== S.me || !M74.on() || S.mode !== 'fps') return s; return M74.mode === 'R' ? s * 0.6 : M74.mode === 'LR' ? s * 1.25 : s; }; }
{ const sh0 = gunShoot;
  gunShoot = function(u, eye, dir, W, o){
    if (o && o.player && M74.on() && M74.mode === 'L' && M71.pref.auto) o = Object.assign({}, o, { dmgK: (o.dmgK || 1) * 0.8 });   // «авто» — пули слабее
    return sh0.call(this, u, eye, dir, W, o);
  }; }
// =====================================================================
//  СТРАТЕГИЯ НА ТЕЛЕФОНЕ: только инженер и здания
// =====================================================================
Object.assign(M74, {
  simple(){ return this.on() && S.mode === 'rts' && !S.attract && SET.m74simple !== false && !(typeof T72 !== 'undefined' && T72.on) && !(typeof TUT !== 'undefined' && TUT.on); },
  get KEYB(){ if (!this._kb){ const s = new Set(); for (const k in PRODUCTS) for (const a of PRODUCTS[k].at) if (a !== 'hq') s.add(a); this._kb = [...s]; } return this._kb; },
  // карточки: инженеры, штаб, здания с производством (и такие же в стройке)
  cards(){
    const L = [];
    teamBuilders(0).slice(0, 4).forEach((b, i) => L.push({ k: 'b' + uixId(b), e: b, ic: '⚒', n: groupLabel(b), st: builderIdle(b) ? tr('свободен', 'idle', 'rảnh', 'פנוי') : tr('строит', 'building', 'đang xây', 'בונה') }));
    if (S.hq[0] && S.hq[0].alive) L.push({ k: 'hq', e: S.hq[0], ic: '⌂', n: tr('Штаб', 'HQ', 'Sở chỉ huy', 'מפקדה'), st: this.qText(S.hq[0]) });
    for (const b of S.buildings){
      if (!b.alive || b.team !== 0 || !this.KEYB.includes(b.type)) continue;
      L.push({ k: 'x' + uixId(b), e: b, ic: UIX_ICON.b[b.type] || '▣', n: bname(b.type), st: b.done ? this.qText(b) : tr('стройка ', 'building ', 'xây ', 'בבנייה ') + Math.floor(b.built * 100) + '%' });
    }
    return L;
  },
  qText(b){ return b.queue && b.queue.length ? `${PRODUCTS[b.queue[0]].icon} ${Math.floor(clamp(b.prodT / pTime(0, b.queue[0]), 0, 1) * 100)}%${b.queue.length > 1 ? ' +' + (b.queue.length - 1) : ''}` : tr('ждёт', 'idle', 'chờ', 'ממתין'); },
  pick(e){
    S.sel.clear(); S.selB = null;
    if (e.cls === 'builder') S.sel.add(e); else S.selB = e;
    this.sel = e; this.sig = '';
    flyCamTo(e.pos); M71.haptic(8); emit('ui', { kind: 'ok' });
  },
  // что показывать в нижней панели для выбранного
  items(){
    const e = this.sel;
    if (!e || !(e.alive || e.cls === 'hq')) return null;
    if (e.cls === 'builder'){
      const L = Object.keys(BTYPES).map(k => ({ id: 'build:' + k, ic: UIX_ICON.b[k] || BICON[k] || '▣', n: bname(k), c: BTYPES[k].cost, f: () => { if (!selBuilders().length){ S.sel.clear(); S.sel.add(e); } startPlace(k); feed(tr(`${bname(k)}: тапни место на карте, затем «Строить»`, `${bname(k)}: tap a spot, then "Build"`, `${bname(k)}: chạm vị trí rồi “Xây”`, `${bname(k)}: הקש מקום ואז „בנה"`), '#9cf'); } }));
      L.push({ id: 'prod:builder', ic: '⚒', n: pname('builder'), c: pCost(0, 'builder'), f: () => uiProduce('builder'), key: 'builder' });
      return { t: `⚒ ${groupLabel(e)} — ${tr('что строить?', 'what to build?', 'xây gì?', 'מה לבנות?')}`, L };
    }
    const type = e.cls === 'hq' ? 'hq' : e.type;
    if (e.cls === 'bld' && !e.done) return { t: `${bname(e.type)} — ${tr('стройка', 'under construction', 'đang xây', 'בבנייה')} ${Math.floor(e.built * 100)}%`, L: [] };
    const L = Object.keys(PRODUCTS).filter(k => PRODUCTS[k].at.includes(type)).map(k => ({ id: 'prod:' + k, ic: PRODUCTS[k].icon, n: pname(k), c: pCost(0, k), f: () => uiProduce(k), key: k }));
    return { t: `${e.cls === 'hq' ? '⌂ ' + tr('Штаб', 'HQ', 'Sở chỉ huy', 'מפקדה') : bname(e.type)} — ${tr('что производить?', 'what to produce?', 'sản xuất gì?', 'מה לייצר?')}`, L };
  },
  ensure(){
    if (this.root) return;
    const R = this.root = document.createElement('div'); R.id = 'm74r'; document.body.appendChild(R);
    R.innerHTML = `<button id="m74go"><b>▶</b> ${uixEsc(tr('В бой', 'To battle', 'Vào trận', 'לקרב'))}</button><div id="m74L"></div><div id="m74B"><div class="t"></div><div class="row"></div></div>`;
    const tap = (el, fn) => {
      let t0 = null;
      el.addEventListener('touchstart', e => { const p = e.changedTouches[0]; t0 = { x: p.clientX, y: p.clientY, t: e.target }; e.stopPropagation(); }, { passive: true });
      el.addEventListener('touchend', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); const p = e.changedTouches[0]; if (!t0 || Math.hypot(p.clientX - t0.x, p.clientY - t0.y) > 12) return; const tg = t0.t; t0 = null; AU.init(); fn(tg); }, { passive: false });
      el.addEventListener('click', e => { e.stopPropagation(); fn(e.target); });
    };
    tap(R.querySelector('#m74go'), () => { emit('ui', { kind: 'ok' }); enterFPS(); });
    tap(R.querySelector('#m74L'), tg => { const c = tg.closest && tg.closest('[data-i]'); if (!c) return; const o = this.cardL && this.cardL[+c.dataset.i]; if (o) this.pick(o.e); });
    tap(R.querySelector('#m74B'), tg => { const c = tg.closest && tg.closest('[data-j]'); if (!c) return; const it = this.itL && this.itL[+c.dataset.j]; if (it){ it.f(); M71.haptic(10); this.sig = ''; } });
  },
  frame(){
    const on = this.simple();
    document.body.classList.toggle('m74s', on);
    if (!on){ if (this.root) this.root.style.display = 'none'; return; }
    this.ensure(); this.root.style.display = 'block';
    // выбрано то, чего в простом режиме нет (отряд, техника) — снимаем; по умолчанию — первый инженер
    const sg = selGroups().filter(g => g.cls !== 'builder');
    if (sg.length){ for (const g of sg) S.sel.delete(g); }
    const sb = selBuilders()[0];
    if (sb) this.sel = sb; else if (S.selB && S.selB.team === 0 && (S.selB.cls === 'hq' || this.KEYB.includes(S.selB.type))) this.sel = S.selB;
    if (!this.sel || !(this.sel.alive || this.sel.cls === 'hq')){ const b = teamBuilders(0)[0]; this.sel = b || (S.hq[0].alive ? S.hq[0] : null); if (b){ S.sel.clear(); S.sel.add(b); } else if (this.sel) S.selB = this.sel; }
    // карточки слева
    const L = this.cards(); this.cardL = L;
    const ch = L.map((o, i) => `<button class="c ${o.e === this.sel ? 'cur' : ''}" data-i="${i}"><i>${o.ic}</i><span><b>${uixEsc(o.n)}</b><small>${uixEsc(o.st)}</small></span></button>`).join('');
    if (ch !== this.cardSig){ this.cardSig = ch; document.getElementById('m74L').innerHTML = ch; }
    // нижняя панель
    const it = this.items(); this.itL = it ? it.L : [];
    const ore = S.teams[0].ore;
    const bh = it ? it.L.map((o, j) => { const x = uiExplain(o.id), n = o.key ? countQueued(0, [o.key]) : 0; return `<button class="it ${x.ok ? '' : 'off'}" data-j="${j}"><i>${o.ic}</i><b>${uixEsc(o.n)}</b><em>◆${o.c}</em>${n ? `<q>×${n}</q>` : ''}${!x.ok && x.short ? `<small>${uixEsc(x.short)}</small>` : ''}</button>`; }).join('') : '';
    const sig = (it ? it.t : '') + '|' + bh + '|' + Math.floor(ore / 10);
    if (sig !== this.sig){ this.sig = sig; const B = document.getElementById('m74B'); B.querySelector('.t').textContent = it ? it.t : tr('Выбери инженера или здание слева', 'Pick an engineer or a building on the left', 'Chọn kỹ sư hoặc công trình bên trái', 'בחר מהנדס או מבנה משמאל'); B.querySelector('.row').innerHTML = bh; }
  },
});
M74.CSS = `
  /* ===== v7.4 телефон ===== */
  #m74eye{display:none;position:fixed;z-index:27;right:calc(var(--sr, 0px) + 10px);top:calc(var(--st, 0px) + 58px);width:40px;height:40px;padding:0;align-items:center;justify-content:center;border-radius:50%;background:rgba(10,12,14,.55);border:1.5px solid rgba(214,198,154,.5);color:#f0e8d0;font-size:19px;pointer-events:auto;touch-action:manipulation}
  #m74eye.on{background:rgba(214,198,154,.75);color:#111;opacity:.65}
  body.m74nh #hud, body.m74nh #obj, body.m74nh #bars, body.m74nh #kit, body.m74nh #hint, body.m74nh #feed, body.m74nh #who73, body.m74nh .m73x, body.m74nh #cur,
  body.m74nh #ov, body.m74nh #touch .tf.fps > button, body.m74nh #touch .tt, body.m74nh #m74mode, body.m74nh #dcard, body.m74nh [id^="m67"], body.m74nh [id^="m71"]:not(#m71rj):not(#m71lj){opacity:0 !important;pointer-events:none !important}
  #m74mode{display:none;position:fixed;z-index:20;left:50%;transform:translateX(-50%);bottom:calc(var(--sb, 0px) + 20px);font:700 10px/1 "Exo 2",sans-serif;letter-spacing:.08em;color:rgba(240,232,208,.7);text-shadow:0 0 3px #000;pointer-events:none;text-transform:uppercase}
  #m74mode.m74mR{color:#8fffaa} #m74mode.m74mLR{color:#ffd27a}
  /* стратегия: только инженер и здания */
  #m74r{display:none;position:fixed;inset:0;z-index:24;pointer-events:none}
  #m74r button{pointer-events:auto;touch-action:manipulation;font-family:"Exo 2",sans-serif;color:#f0e8d0}
  #m74go{position:fixed;left:calc(var(--sl, 0px) + 8px);top:calc(var(--st, 0px) + 6px);height:38px;padding:0 14px;border-radius:9px;background:rgba(120,70,30,.82);border:1.5px solid #ffb347;font:700 15px "Exo 2",sans-serif}
  #m74go b{color:#ffd27a;margin-right:4px}
  #m74L{position:fixed;left:calc(var(--sl, 0px) + 8px);top:calc(var(--st, 0px) + 92px);bottom:calc(var(--sb, 0px) + 150px);width:132px;display:flex;flex-direction:column;gap:4px;overflow-y:auto;pointer-events:auto;scrollbar-width:none}
  #m74L .c{display:flex;align-items:center;gap:6px;min-height:40px;padding:3px 6px;border-radius:8px;background:rgba(10,12,14,.66);border:1px solid rgba(214,198,154,.3);text-align:left;flex:none}
  #m74L .c.cur{border-color:#8fffaa;background:rgba(40,90,55,.75)}
  #m74L .c i{font-style:normal;font-size:17px;width:20px;text-align:center;color:#ffd27a} #m74L .c span{display:flex;flex-direction:column;min-width:0}
  #m74L .c b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #m74L .c small{font-size:10px;opacity:.7;white-space:nowrap}
  #m74B{position:fixed;left:calc(var(--sl, 0px) + 250px);right:calc(var(--sr, 0px) + 8px);bottom:calc(var(--sb, 0px) + 6px);pointer-events:none;display:flex;flex-direction:column;align-items:center}
  #m74B .t{font:600 11px "Exo 2",sans-serif;color:#e8dcb8;text-shadow:0 0 3px #000;margin-bottom:3px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #m74B .row{display:flex;gap:4px;max-width:100%;overflow-x:auto;pointer-events:auto;scrollbar-width:none;padding-bottom:1px}
  #m74B .it{position:relative;flex:none;width:66px;height:58px;padding:3px 2px;border-radius:8px;background:rgba(10,12,14,.72);border:1px solid rgba(214,198,154,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
  #m74B .it i{font-style:normal;font-size:16px;color:#ffd27a} #m74B .it b{font-size:9.5px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:62px} #m74B .it em{font-style:normal;font-size:9.5px;color:#ffd27a}
  #m74B .it q{position:absolute;top:1px;right:3px;font-size:10px;color:#8fffaa;quotes:none} #m74B .it small{position:absolute;left:0;right:0;bottom:-1px;font-size:8px;color:#ff9a80;white-space:nowrap;overflow:hidden}
  #m74B .it.off{opacity:.55}
  body.m74s #m71rail, body.m74s #m71sq, body.m74s #cam66, body.m74s #m67cam, body.m74s #card, body.m74s #side, body.m74s #sideTog, body.m74s #pstrip, body.m74s #m71zi, body.m74s #m71zo,
  body.m74s #touch .tt [data-t="map"], body.m74s #m71rad, body.m74s .tf.rts{display:none !important}
  body.m74s #hud{left:calc(var(--sl, 0px) + 112px) !important}
  body.m74s #feed{left:calc(var(--sl, 0px) + 150px) !important;transform:none !important;top:calc(var(--st, 0px) + 92px) !important;max-width:40vw}
`;
// ---- встраивание (только телефон)
if (typeof TOUCH !== 'undefined' && TOUCH.on){
  { const ti0 = TOUCH.init; TOUCH.init = function(){ ti0.call(this); try { const st = document.createElement('style'); st.id = 'm74css'; st.textContent = M74.CSS; document.head.appendChild(st); } catch (e){ console.warn('m74 init', e); } }; }
  { const f0 = M71.frame; M71.frame = function(dt){
      M74.safe(() => M74.stickStep(), 'stick');
      f0.call(this, dt);
      M74.hT = (M74.hT || 0) - dt;
      if (M74.hT <= 0){ M74.hT = 0.15; M74.safe(() => { M74.eye(); M74.frame(); }, 'frame'); }
    }; }
  // простая стратегия: тап по своему отряду/технике не выделяет его; долгое нажатие и рамка — выкл.
  { const t0 = M71.rtsTap; M71.rtsTap = function(x, y){
      if (M74.simple()){ const ent = pickEntity(x, y, true); if (ent && ent.team === 0 && ent.cls !== 'bld' && ent.cls !== 'hq' && ent.cls !== 'builder'){ return; } }
      const r = t0.apply(this, arguments);
      if (M74.simple()) M74.safe(() => { const b = selBuilders()[0]; if (b) M74.sel = b; else if (S.selB && S.selB.team === 0) M74.sel = S.selB; M74.sig = ''; }, 'tap');
      return r;
    }; }
  { const s0 = M71.rtsStart; M71.rtsStart = function(e){ const r = s0.apply(this, arguments); if (M74.simple()){ clearTimeout(this.holdT); } return r; }; }
  { const ro0 = M71.radOpenAt; M71.radOpenAt = function(){ if (M74.simple()) return; return ro0.apply(this, arguments); }; }
  // в стратегию: сразу выбран инженер
  { const er0 = enterRTS; enterRTS = function(){ const r = er0.apply(this, arguments); if (M74.simple()) M74.safe(() => { M74.sel = null; S.sel.clear(); const b = teamBuilders(0)[0]; if (b){ S.sel.add(b); M74.sel = b; } M74.sig = ''; M74.cardSig = ''; }, 'enter'); return r; }; }
  // Настройки → Телефон: «Стратегия: простая»
  if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(k){
      let h = s0.apply(this, arguments);
      if (k === 's_phone'){ const on = SET.m74simple !== false; const row = `<button class="p71o ${on ? 'on' : ''}" data-p74tog="m74simple"><span>${uixEsc(tr('Стратегия: простая (инженер и здания)', 'Strategy: simple (engineer & buildings)', 'Chiến thuật: đơn giản', 'אסטרטגיה: פשוטה'))}</span><b>${L71(on ? 'on' : 'off')}</b></button>`; h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + row); }
      return h;
    }; }
}
