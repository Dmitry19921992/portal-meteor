// =====================================================================
//  v7.3 — ТЕЛЕФОН: новая раскладка шутера «два джойстика под пальцем»
//  Золотое правило: центр экрана свободен, всё остальное — в углах и у краёв.
//   • слева — движение, справа — обзор; оба джойстика появляются только под пальцем;
//   • только левый палец — «авто» (захват ближайшего врага, огонь сам);
//     правый палец в деле — стреляем сами, только когда прицел на враге (мягкий магнит остался);
//   • тап по врагу — ракета / граната по очереди (что готово); 2 тапа — рефлекс; 3 тапа — артудар;
//   • перезарядка сама; нижние углы пусты; ранец — кнопка у левого края посередине;
//   • миникарта в самом углу сверху слева; закрывать можно подсказки, задачу можно свернуть.
//  Старая раскладка (v7.2) осталась: Настройки → Телефон → «Раскладка v7.2 (старая)».
//  Всё работает только на сенсорных устройствах и только в M71.active() — ПК не затронут.
// =====================================================================
const M73 = {
  err: 0, taps: [], alt: 0, rT: -9, rcT: 0, fT: 0, closed: {}, objMin: false, introDone: false, modeT: 0, hitT: 0,
  act(){ return typeof M71 !== 'undefined' && M71.on && M71.active() && !M71.pref.old71; },
  fps(){ return this.act() && S.mode === 'fps' && !S.attract && !MENU.isOpen(); },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err){ this.err = 1; console.warn('m73 ' + tag, e); } } },
  // ---------------------------------------------------------------- тап по врагу на экране
  pick(x, y, c){
    const [eye, fwd] = M71.eyeFwd(c);
    let best = null, bd = 1e9;
    for (const e of TGT[c.team]){
      if (M71.cand(e, eye, fwd, 190, 0.2) < 0) continue;
      const ce = centerOf(e), p = project(ce); if (!p) continue;
      const d = max(2, dist(ce, eye)), hr = e.cls === 'inf' ? 0.7 : (typeof hitRadiusRay === 'function' ? hitRadiusRay(e) : hitRadius(e));
      const rr = 44 + clamp(hr / d * innerHeight * 1.1, 0, 130), dd = hypot(p[0] - x, p[1] - y);
      if (dd < rr && dd < bd){ bd = dd; best = e; }
    }
    return best;
  },
  want(){ try { if (typeof T72 !== 'undefined' && T72.on){ const a = T72.cur(); if (a === 'rocket' || a === 'grenade') return a; } } catch (e){} return null; },
  fireAt(t, c){
    const tw = this.want(), K = typeof G62 !== 'undefined' ? G62.kit() : null, d = dist(t.pos, c.pos);
    if (c.cls !== 'inf'){ if (c.cls === 'drone') M71.rocketAt(t); return; }
    const rOk = !(c.rocketCd > 0), gOk = !!(PROG.has('grenade') && K && K.gren > 0 && d < 60);
    const vehT = t.cls !== 'inf' && t.cls !== 'drone';
    let order = vehT ? ['r', 'g'] : (this.alt ? ['g', 'r'] : ['r', 'g']);
    if (tw === 'rocket') order = ['r']; else if (tw === 'grenade') order = ['g'];
    for (const k of order){
      if (k === 'r' && rOk){ M71.rocketAt(t); this.alt = 1; return; }
      if (k === 'g' && gOk){ M71.grenadeAt(t); this.alt = 0; return; }
    }
    if (tw === 'grenade' && !gOk && K && K.gren <= 0) feed(tr('Гранаты кончились', 'No grenades left', 'Hết lựu đạn', 'נגמרו הרימונים'), '#f88');
    else if (!rOk) feed(tr(`Ракета и граната заряжаются · ${Math.ceil(c.rocketCd)} с`, `Rocket and grenade recharging · ${Math.ceil(c.rocketCd)} s`, `Tên lửa và lựu đạn đang nạp · ${Math.ceil(c.rocketCd)} giây`, `רקטה ורימון נטענים · ${Math.ceil(c.rocketCd)} ש׳`), '#f88');
    emit('ui', { kind: 'deny' });
  },
  onTap(x, y, now, joy){
    if (!this.fps()) return;
    const c = ctrlEntity(); if (!c) return;
    const t = c.cls === 'inf' || c.cls === 'drone' ? this.pick(x, y, c) : null;
    if (t){ this.taps = []; clearTimeout(this.tapTm); this.fireAt(t, c); M71.used('frame'); return; }
    if (joy || c.cls !== 'inf') return;   // 2–3 тапа считаем только по правой половине и только пехотой
    const last = this.taps[this.taps.length - 1];
    if (last && now - last > 360) this.taps = [];
    this.taps.push(now);
    clearTimeout(this.tapTm);
    if (this.taps.length >= 3){ this.taps = []; playerStrike(); M71.used('dtap'); M71.haptic(30); return; }
    this.tapTm = setTimeout(() => { const n = this.taps.length; this.taps = []; if (n === 2 && this.fps()){ toggleReflex(); M71.used('dtap'); M71.haptic(20); } }, 300);
  },
  // ---------------------------------------------------------------- огонь, когда прицел на враге (правый палец в деле)
  manualFire(c, canAuto){
    let on = false;
    const fps = S.mode === 'fps' && !S.attract && !S.over && !MENU.isOpen() && !S.paused;
    if (fps && canAuto && c && !(typeof G62 !== 'undefined' && G62.hold) && !M67.open){
      const K = S.kit, reloading = c.cls === 'inf' && K && K.reloadT > 0;
      if (!reloading){
        const [eye, fwd] = M71.eyeFwd(c), h = AIMA.scan(eye, fwd, c.team, 2.2 * PI / 180, 160);
        on = !!h && h.ang < h.rad + 1.6 * PI / 180;
      }
    }
    if (on){ mouseL = true; M67.mine = true; M71.firing = true; }
    else if (M71.firing){ M71.firing = false; M67.mine = false; if (!TOUCH.fireT) mouseL = false; }
  },
  // ---------------------------------------------------------------- перезарядка сама
  autoReload(c){
    const K = S.kit; if (!K || c.cls !== 'inf' || S.over || MENU.isOpen() || S.paused || K.reloadT > 0) return;
    const W = typeof pW === 'function' ? pW(K.w) : WEAPONS[K.w], mx = gstat(W, 'mag'), m = K.mag[K.w];
    if (!(mx < 1e6) || !(m < mx)) return;
    if (m <= 0){ startReload(); return; }
    if (m < mx * 0.35 && !TGT[c.team].some(e => e.alive && e.cls !== 'bld' && e.cls !== 'hq' && dist(e.pos, c.pos) < 70)) startReload();
  },
  // ---------------------------------------------------------------- каждый кадр
  pre(dt){
    const a = this.act();
    TOUCH.split = a ? 0.5 : 0.42;
    const bc = document.body.classList;
    if (bc.contains('m73') !== a) bc.toggle('m73', a);
    if (!a) return;
    if (!M71.pref.hud) M71.pref.hud = true;
    if (S.mode !== 'fps' || S.attract){ if (M71.pref.auto){ M71.pref.auto = false; bc.remove('m71auto'); } return; }
    const c = ctrlEntity(), canAuto = !!c && (c.cls === 'inf' || c.cls === 'drone') && !CAMFX.busy();
    const now = performance.now() / 1000, L = TOUCH.look, P = L && M71.tp[L.id];
    if (P && P.tr > 6) this.rT = now;
    const manual = now - this.rT < 0.7, want = canAuto && !manual;
    if (M71.pref.auto !== want){ M71.pref.auto = want; if (!want) M71.setLock(null); bc.toggle('m71auto', want); }
    if (!want) this.manualFire(c, canAuto);
    this.rcT -= dt; if (this.rcT <= 0){ this.rcT = 0.3; if (c && canAuto) this.safe(() => this.autoReload(c), 'reload'); }
  },
  // ---------------------------------------------------------------- HUD: кнопки закрытия подсказок, сворачивание задачи
  chip(id, txt, fn){
    let b = document.getElementById(id);
    if (!b){
      b = document.createElement('button'); b.id = id; b.className = 'm73x'; b.textContent = txt; document.body.appendChild(b);
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
      b.addEventListener('click', e => { e.stopPropagation(); fn(); });
    }
    return b;
  },
  closeable: [['hint', 'm73hx'], ['cur', 'm73cx']],
  hud(){
    const on = this.act() && (S.mode === 'fps' || S.mode === 'rts') && !MENU.isOpen() && !S.attract;
    for (const [eid, bid] of this.closeable){
      const el = document.getElementById(eid), b = this.chip(bid, '✕', () => { const e2 = document.getElementById(eid); if (e2){ this.closed[eid] = e2.textContent; e2.classList.add('m73hid'); } b.style.display = 'none'; });
      if (!el){ b.style.display = 'none'; continue; }
      const txt = el.textContent, shown = el.style.display !== 'none' && txt.trim().length > 0;
      if (this.closed[eid] !== undefined && this.closed[eid] !== txt){ delete this.closed[eid]; el.classList.remove('m73hid'); }
      const r = el.getBoundingClientRect();
      if (!on || !shown || this.closed[eid] !== undefined || r.width < 20 || r.height < 10){ b.style.display = 'none'; continue; }
      b.style.display = 'flex'; b.style.left = clamp(r.right - 15, 0, innerWidth - 36) + 'px'; b.style.top = max(0, r.top - 13) + 'px';
    }
    // тактическая задача: свернуть / развернуть
    const ob = document.getElementById('obj'), ob2 = this.chip('m73ox', '–', () => { this.objMin = !this.objMin; this.hud(); });
    if (ob){
      ob.classList.toggle('m73oc', this.objMin);
      const r = ob.getBoundingClientRect(), shown = on && ob.style.display !== 'none' && r.width > 20 && ob.textContent.trim().length > 0 && S.mode === 'fps';
      ob2.textContent = this.objMin ? '+' : '–';
      if (shown){ ob2.style.display = 'flex'; ob2.style.left = clamp(r.right + 4, 0, innerWidth - 36) + 'px'; ob2.style.top = max(0, r.top) + 'px'; } else ob2.style.display = 'none';
    } else ob2.style.display = 'none';
    document.body.classList.toggle('m73drone', on && S.mode === 'fps' && (() => { const c = ctrlEntity(); return !!c && c.cls === 'drone'; })());
  },
  introText(){
    return tr('Слева — идти, справа — обзор · тап по врагу — ракета / граната · 2 тапа — рефлекс · 3 тапа — артудар', 'Left — move, right — look · tap an enemy — rocket / grenade · 2 taps — reflex · 3 taps — artillery strike', 'Trái — di chuyển, phải — nhìn · chạm kẻ địch — tên lửa / lựu đạn · 2 lần — phản xạ · 3 lần — pháo kích', 'שמאל — תנועה, ימין — מבט · הקשה על אויב — רקטה / רימון · 2 הקשות — רפלקס · 3 — הפצצה');
  },
  // ---------------------------------------------------------------- упрощённое меню телефона
  more(on){ return `<button id="m73more" class="p71t ${on ? 'on' : ''}"><b>${on ? tr('Меньше', 'Less', 'Ít hơn', 'פחות') : tr('Ещё', 'More', 'Thêm', 'עוד')}</b></button>`; },
  simplify(html, kind){
    const d = document.createElement('div'); d.innerHTML = html;
    const g = d.querySelector('.p71g'); if (!g) return html;
    const ids = kind === 'main' ? ['m_saves', 'm_dev', 'm_cinema', 'm_career'] : ['m_saves', 'm_career', 'm_devtog', 'm_devars'];
    let n = 0;
    const hid = el => { if (el && !el.classList.contains('p73h')){ el.classList.add('p73h'); n++; } };
    ids.forEach(id => hid(d.querySelector('#' + id)));
    if (kind === 'main') d.querySelectorAll('.p71s').forEach(hid);
    else { const l = d.querySelector('[data-p71go="lang"]'); hid(l); }
    if (n){ g.classList.toggle('m73open', !!this.menuOpen); g.insertAdjacentHTML('beforeend', this.more(!!this.menuOpen)); }
    return d.innerHTML;
  },
  moreClick(){
    this.menuOpen = !this.menuOpen;
    const b = document.getElementById('m73more'), g = b && b.closest('.p71g'); if (!g) return;
    g.classList.toggle('m73open', this.menuOpen); b.classList.toggle('on', this.menuOpen);
    b.innerHTML = `<b>${this.menuOpen ? tr('Меньше', 'Less', 'Ít hơn', 'פחות') : tr('Ещё', 'More', 'Thêm', 'עוד')}</b>`;
  },
  CSS: `
  /* ===== v7.3: телефон, «два джойстика под пальцем» ===== */
  .m73x{display:none;position:fixed;z-index:26;width:30px;height:30px;padding:0;align-items:center;justify-content:center;border-radius:50%;background:rgba(10,12,14,.8);border:1.5px solid rgba(214,198,154,.65);color:#f0e8d0;font:700 15px/1 "Exo 2",sans-serif;pointer-events:auto;touch-action:manipulation}
  .m73x:active{background:rgba(214,198,154,.6);color:#111}
  .m73hid{display:none !important}
  body.m73 #obj.m73oc b, body.m73 #obj.m73oc em, body.m73 #obj.m73oc i{display:none !important}
  body.m73 #obj.m73oc{opacity:.75}
  body.m73:not(.m64fps) .m73x{display:none !important}
  body.m73.m71 #touch .tf.fps > [data-s="R3"], body.m73.m71 #m71gh, body.m73.m71 #m67ghost, body.m73.m71 #m67mm, body.m73.m71 #m71hudb{display:none !important}
  body.m73.m71:not(.m71na) #touch .tf.fps > [data-s="LF"], body.m73.m71:not(.m71na) #touch .tf.fps > [data-s="R2"],
  body.m73.m71:not(.m71na) #touch .tf.fps > [data-s^="K"]:not([data-s="K4"]), body.m73.m71:not(.m71na) #m71auto, body.m73.m71:not(.m71na) #m71skb, body.m73.m71:not(.m71na) .g62b{display:none !important}
  body.m73.m71:not(.m71na):not(.m73drone) #touch .tf.fps > [data-s="R1"]{display:none !important}
  body.m73.m71 #touch .tf.fps > [data-s="LJ"]{left:calc(var(--sl) + 10px);right:auto;bottom:auto;top:calc(50% + 10px);width:60px;height:60px}
  body.m73.m71 #touch .tf.fps > [data-s="R4"]{right:calc(var(--sr) + 10px);left:auto;bottom:auto;top:calc(50% - 27px);width:54px;height:54px}
  body.m73.m71:not(.m73drone):not(.m71na) #touch .tf.fps > [data-s="K4"]{display:flex !important;right:calc(var(--sr) + 10px);left:auto;bottom:auto;top:calc(50% + 40px);width:48px;height:48px}
  body.m73.m71.m73drone #touch .tf.fps > [data-s="R1"]{display:flex !important;right:calc(var(--sr) + 10px);left:auto;bottom:auto;top:calc(50% + 40px);width:54px;height:54px}
  body.m73.m71.m71na #touch .tf.fps > [data-s="LF"]{left:auto;right:calc(var(--sr) + 10px);bottom:auto;top:calc(50% + 40px)}
  body.m73.m71.m64fps #hud{left:calc(var(--sl) + 112px);top:calc(var(--st) + 6px)}
  body.m73.m71 #bars{width:min(200px,28vw);bottom:calc(var(--sb) + 4px)}
  body.m73.m71 #bars .bar{height:3px}
  body.m73.m71 #bars .lbl{display:none}
  body.m73.m71.m64fps #hint{left:50%;transform:translateX(-50%);max-width:52vw}
  body.m73.m71.m64fps #feed{left:calc(var(--sl) + 80px);transform:none;bottom:calc(var(--sb) + 40px);max-width:34vw}
  .p71g:not(.m73open) > .p73h{display:none !important}
  #m73more{grid-column:span 1}
  `,
  init(){
    if (this.inited || !TOUCH.on) return; this.inited = true;
    const st = document.createElement('style'); st.id = 'm73css'; st.textContent = this.CSS; document.head.appendChild(st);
    // тап по кнопке «Ещё» в меню (делегирование: экраны меню перерисовываются)
    let lastT = 0;
    const h = e => { const b = e.target && e.target.closest && e.target.closest('#m73more'); if (!b) return; e.preventDefault(); e.stopPropagation(); const n = performance.now(); if (n - lastT < 400) return; lastT = n; this.moreClick(); };
    document.addEventListener('touchend', h, { capture: true, passive: false });
    document.addEventListener('click', h, true);
  },
};
// старая раскладка v7.2 — включается в Настройки → Телефон
Object.assign(M71, {
  lookJoy(){ return this.pref.look === 'joy' || M73.act(); },
});
{ const op0 = M71.option; M71.option = function(k){
    if (k === 'old71'){ this.pref.old71 = !this.pref.old71; this.pref.auto = false; this.setLock(null); this.save(); this.apply(); M67.sig = ''; G62.btnSig = ''; document.body.classList.remove('m71auto'); return; }
    return op0.apply(this, arguments);
  }; }
if (typeof TOUCH !== 'undefined' && TOUCH.on){
  { const ti0 = TOUCH.init; TOUCH.init = function(){ ti0.call(this); try { M73.init(); } catch (e){ console.warn('m73 init', e); } }; }
  // кадр: M73 работает до M71 (переключает «авто» / ручной огонь)
  { const f0 = M71.frame; M71.frame = function(dt){
      M73.safe(() => M73.pre(dt), 'pre');
      f0.call(this, dt);
      if (!M73.hT) M73.hT = 0;
      M73.hT -= dt; if (M73.hT <= 0){ M73.hT = 0.15; M73.safe(() => M73.hud(), 'hud'); }
    }; }
  // старые жесты-подсказки M71 при новой раскладке не нужны
  { const gs0 = M71.ghStep; M71.ghStep = function(){ if (M73.act()){ this.ghHide(); return; } return gs0.apply(this, arguments); }; }
  // подсказки (HINTS) про кнопки, которых больше нет
  M73.HT = {
    g62: null, grenade: null, reload: null,
    rocket: ['Рядом техника или постройка врага — тапни по ней: уйдёт ракета.', 'Enemy vehicle or structure nearby — tap it: a rocket flies.'],
    reflex: ['Много врагов — быстро тапни 2 раза по свободному месту справа: рефлекс замедлит время.', 'Lots of hostiles — double tap an empty spot on the right: reflex slows time down.'],
    strike: ['Наведи прицел на скопление врагов и тапни 3 раза — артудар.', 'Aim at the enemy cluster and tap 3 times — artillery strike.'],
    move: ['Левый палец — идти, правый — обзор. Прицел на враге — огонь сам.', 'Left thumb — move, right thumb — look. Fires by itself when aimed at an enemy.'],
    jet: ['⇑ слева у края — ранец: нажми для прыжка, держи для полёта.', '⇑ at the left edge — jetpack: tap to hop, hold to fly.'],
    switch: ['Здесь тихо — ⇆ вверху справа переключит на бойца ближе к бою.', 'It is quiet here — ⇆ at the top right switches to a unit closer to the fight.'],
  };
  { const hf0 = M67.hintFix; M67.hintFix = function(id, text, kbd){
      if (M73.act() && Object.prototype.hasOwnProperty.call(M73.HT, id)){ const h = M73.HT[id]; return h ? tr(h[0], h[1], h[1]) : null; }
      return hf0.call(this, id, text, kbd);
    }; }
  // побочные задачи не показываем на телефоне; навигационная полоса сверху убрана
  if (typeof SIDEQ !== 'undefined'){ const sq0 = SIDEQ.step; SIDEQ.step = function(dt){ if (M73.act()) return; return sq0.call(this, dt); }; }
  if (typeof MISSION !== 'undefined' && MISSION.drawCompass){ const dc0 = MISSION.drawCompass; MISSION.drawCompass = function(){ if (M73.act()) return; return dc0.apply(this, arguments); }; }
  // меню: второстепенное — под «Ещё»
  if (typeof P71M !== 'undefined'){
    { const m0 = P71M.main; P71M.main = function(){ const h = m0.apply(this, arguments); return M73.act() ? M73.simplify(h, 'main') : h; }; }
    { const p0 = P71M.pause; P71M.pause = function(){ const h = p0.apply(this, arguments); return M73.act() ? M73.simplify(h, 'pause') : h; }; }
    { const s0 = P71M.sec; P71M.sec = function(k){
        let h = s0.apply(this, arguments);
        if (k === 's_phone' && M73.act() || (k === 's_phone' && M71.pref.old71)){
          const row = this.opt('v71:old71', tr('Раскладка v7.2 (старая)', 'Old v7.2 layout', 'Bố cục v7.2 (cũ)', 'פריסה v7.2 (ישנה)'), L71(M71.pref.old71 ? 'on' : 'off'), M71.pref.old71);
          h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + row);
        }
        return h;
      }; }
  }
}
// ---------------------------------------------------------------- обучение: схема «v73»
{
  const base = CTL72.schemes.v71, acts = Object.assign({}, base.acts);
  for (const k of ['reload', 'auto', 'skills', 'squad', 'aim']) delete acts[k];
  Object.assign(acts, {
    look: { g: 'swipe', el: () => [{ zone: [0.54, 0.24, 0.96, 0.86] }], h: ['Веди пальцем по правой половине экрана — под пальцем появится джойстик обзора.', 'Drag a finger on the right half of the screen — a look stick appears under it.', 'Kéo ngón tay ở nửa phải màn hình — cần nhìn hiện dưới ngón tay.', 'גרור אצבע בחצי הימני של המסך — ג׳ויסטיק מבט מופיע מתחת לאצבע.'] },
    move: { g: 'joy', el: () => [{ zone: [0.04, 0.4, 0.46, 0.95] }], h: ['Коснись слева и веди пальцем — под пальцем появится джойстик. Дойди до зелёной метки.', 'Touch the left side and slide — a stick appears under your finger. Reach the green marker.', 'Chạm bên trái và trượt — cần hiện dưới ngón tay. Tới dấu xanh.', 'גע בצד שמאל והחלק — ג׳ויסטיק מופיע מתחת לאצבע. הגע לסימון הירוק.'] },
    jet: { g: 'hold', el: () => [{ sel: '#touch [data-s="LJ"]' }], h: ['Держи кнопку «Ранец» у левого края.', 'Hold the "Jet" button at the left edge.', 'Giữ nút “Bay” ở mép trái.', 'החזק את כפתור „סילון" בקצה השמאלי.'] },
    fire: { g: 'joy', el: () => [{ zone: [0.54, 0.24, 0.96, 0.86] }], h: ['Правым джойстиком наведи прицел на манекен — боец стреляет сам, когда прицел на цели.', 'Aim at a dummy with the right stick — your trooper fires by itself when the crosshair is on it.', 'Ngắm hình nộm bằng cần phải — lính tự bắn khi tâm ngắm trúng.', 'כוון לבובה בג׳ויסטיק הימני — הלוחם יורה לבד כשהכוונת עליה.'] },
    rocket: { g: 'tap', h: ['Тапни по манекену на экране — вылетит ракета.', 'Tap the dummy on the screen — a rocket flies.', 'Chạm vào hình nộm trên màn hình — tên lửa bay ra.', 'הקש על הבובה במסך — רקטה יוצאת.'] },
    grenade: { g: 'tap', h: ['Тапни по манекену — полетит граната (в цель, дугой).', 'Tap the dummy — a grenade flies in an arc, right at it.', 'Chạm vào hình nộm — lựu đạn bay theo vòng cung.', 'הקש על הבובה — רימון עף בקשת ישר אליה.'] },
    reflex: { g: 'dtap', el: () => [{ zone: [0.54, 0.24, 0.96, 0.86] }], h: ['Быстро тапни 2 раза по свободному месту справа.', 'Double tap an empty spot on the right quickly.', 'Chạm nhanh 2 lần vào chỗ trống bên phải.', 'הקש פעמיים מהר על מקום פנוי מימין.'] },
  });
  CTL72.add('v73', { plat: 'phone', name: ['Телефон', 'Phone', 'Điện thoại', 'טלפון'], acts });
  CTL72.pickPhone = function(){ return typeof M71 !== 'undefined' && M71.pref && M71.pref.old71 ? 'v71' : 'v73'; };
}
