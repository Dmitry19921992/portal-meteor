// =====================================================================
//  v6.7 — ТЕЛЕФОН: новое управление и интерфейс (по образцу PUBG Mobile / CoD Mobile)
//  Работает ТОЛЬКО при сенсорном управлении (TOUCH.on). На ПК этот файл ничего не делает.
//  • Шутер: плавающий джойстик слева, обзор — правая половина, большая «Огонь» справа внизу,
//    вокруг — ранец, граната, прицел, перезарядка, ракета (+ по ситуации: оружие, рефлекс, удар,
//    «Войти/Выйти»); всё редкое — в меню ☰. «Простой огонь»: прицел на враге — стреляет сам.
//  • Стратегия: справа — «Вся армия / Отряд / Инженер / Рамка / Автономно»; панель стройки —
//    только с инженером или заводом; карточка выделенного — внизу; портрет и миникарты меньше.
//  • Вырез экрана и полоска «домой» (safe area) учитываются; в портретной — мягкая подсказка.
//  • ☰ → «Раскладка v6.6» возвращает старое расположение кнопок.
// =====================================================================
const M67 = {
  on: false, pref: { simple: true, left: false, sens: 1, mm: true, cam: true, classic: false },
  safe: { l: 0, r: 0, t: 0, b: 0 }, t: 0, open: false, sheetCtx: '', auto: false, onT: 0, offT: 0, leftId: null,
  sideSig: '', sideAuto: false, wasRts: null, sqI: -1, sig: '', btns: {}, err: 0,
  load(){ try { Object.assign(this.pref, JSON.parse(localStorage.getItem('pm_v67m') || '{}')); } catch (e){} if (SET.m67simpleOff !== undefined) this.pref.simple = !SET.m67simpleOff; TOUCH.sens = this.pref.sens; },
  save(){ try { localStorage.setItem('pm_v67m', JSON.stringify(this.pref)); } catch (e){} },
  active(){ return this.on && !this.pref.classic; },
  L(ru, en, vi){ return tr(ru, en, vi || en); },
  // ---------------------------------------------------------------- запуск
  init(){
    if (!TOUCH.on || this.on) return;
    this.on = true; this.load();
    const root = $('touch'); if (!root) return;
    // верхний правый угол: «⇆ сменить бойца», «◩ Стратегия / ▶ В бой», «☰»
    const tt = root.querySelector('.tt');
    const mk = (cls, html, fn, parent, before) => {
      const b = document.createElement('button'); b.className = cls; b.innerHTML = html;
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); fn(e, b); }, { passive: false });
      b.addEventListener('click', e => { e.stopPropagation(); if (!e.isTrusted || e.detail === 0) fn(e, b); });
      if (before) parent.insertBefore(b, before); else parent.appendChild(b);
      return b;
    };
    this.mk = mk;
    this.bNext = mk('m67n', '⇆', () => { TOUCH.key(SET.bind.switch); }, tt, tt.firstChild);
    this.bMenu = mk('m67m', '☰', () => this.toggleSheet(), tt);
    // меню ☰
    const sh = this.sheet = document.createElement('div'); sh.id = 'm67sheet'; root.appendChild(sh);
    const bd = this.back = document.createElement('div'); bd.id = 'm67back'; root.appendChild(bd);
    bd.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.toggleSheet(false); }, { passive: false });
    bd.addEventListener('click', e => { e.stopPropagation(); this.toggleSheet(false); });
    sh.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    this.buildSheet();
    // джойстик-«призрак» (где появится джойстик) и левая кнопка огня
    const gh = document.createElement('div'); gh.id = 'm67ghost'; gh.innerHTML = '<i></i>'; root.appendChild(gh);
    const lf = this.bLeft = document.createElement('button'); lf.id = 'm67left'; lf.innerHTML = '<i>●</i>'; root.appendChild(lf);
    lf.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); const tc = e.changedTouches[0]; this.leftId = { id: tc.identifier, x: tc.clientX, y: tc.clientY }; lf.classList.add('on'); }, { passive: false });
    lf.addEventListener('touchmove', e => { e.preventDefault(); for (const tc of e.changedTouches) if (this.leftId && tc.identifier === this.leftId.id){ lookBy((tc.clientX - this.leftId.x) * 1.4 * this.pref.sens, (tc.clientY - this.leftId.y) * 1.4 * this.pref.sens); this.leftId.x = tc.clientX; this.leftId.y = tc.clientY; } }, { passive: false });
    const lu = e => { e.preventDefault(); e.stopPropagation(); this.leftId = null; lf.classList.remove('on'); };
    lf.addEventListener('touchend', lu, { passive: false }); lf.addEventListener('touchcancel', lu, { passive: false });
    // миникарта шутера: тап — свернуть/развернуть
    const mm = this.bMM = document.createElement('button'); mm.id = 'm67mm'; root.appendChild(mm);
    mm.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.pref.mm = !this.pref.mm; this.save(); emit('ui', { kind: 'ok' }); this.mmBtn(); }, { passive: false });
    // стратегия: колонка больших кнопок справа
    const rail = this.rail = document.createElement('div'); rail.id = 'm67rail'; root.appendChild(rail);
    this.bSq = mk('wide m67sq', '', () => this.cycleSquad(), rail);
    this.bAuto = mk('wide m67auto', '', () => { if (typeof toggleAuto66 === 'function'){ if (!selGroups().length) this.selectArmy(); toggleAuto66(); } this.railLabels(true); }, rail);
    // портрет: кнопка «свернуть»
    const cx = this.bCam = document.createElement('button'); cx.id = 'm67cam'; document.body.appendChild(cx);
    const ct = e => { e.preventDefault(); e.stopPropagation(); AU.init(); this.pref.cam = !this.pref.cam; this.save(); emit('ui', { kind: 'ok' }); };
    cx.addEventListener('touchstart', ct, { passive: false }); cx.addEventListener('click', e => { e.stopPropagation(); if (!e.isTrusted || e.detail === 0) ct(e); });
    // поворот экрана: мягкая подсказка, можно закрыть
    this.rotText();
    // запомнить «дом» кнопок (для «Раскладки v6.6») и сделать подписи
    root.querySelectorAll('.tf.fps > button, .tf.rts > button').forEach(b => { b._m67home = b.parentElement; b._m67txt = b.innerHTML; });
    TOUCH.follow = true;
    this.measure(); addEventListener('resize', () => { this.measure(); this.t = 0; });
    this.apply();
  },
  rotText(){
    const rot = $('trot'); if (!rot || !this.active()) return;
    this.lang = LANG.cur;
    if (rot.parentElement !== document.body) document.body.appendChild(rot);   // видно и в меню (#touch в меню скрыт)
    rot.innerHTML = `<div class="m67rot"><i>📱</i><b>${this.L('Поверни телефон горизонтально', 'Turn your phone sideways', 'Xoay ngang điện thoại')}</b><small>${this.L('Так кнопки не мешают и видно больше поля боя', 'The buttons fit better and you see more of the battlefield', 'Nút bấm vừa hơn và thấy nhiều chiến trường hơn')}</small><button>${this.L('Играть так', 'Play anyway', 'Chơi luôn')}</button></div>`;
    const dis = e => { e.preventDefault(); e.stopPropagation(); this.rotOk = true; document.body.classList.add('m67rotok'); };
    rot.querySelector('button').addEventListener('touchstart', dis, { passive: false });
    rot.querySelector('button').addEventListener('click', dis);
  },
  // отступы выреза экрана в px (для того, что рисуется на канве)
  measure(){
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(d);
    const cs = getComputedStyle(d);
    this.safe = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    d.remove();
  },
  // включить/выключить новую раскладку
  apply(){
    const a = this.active();
    document.body.classList.toggle('m67', a);
    TOUCH.follow = a;
    if (!a){
      // вернуть кнопки на место (v6.6)
      for (const b of $('touch').querySelectorAll('button')){ if (b._m67home && b.parentElement !== b._m67home){ b._m67home.appendChild(b); } if (b._m67txt !== undefined && !b.classList.contains('g62b')) b.innerHTML = b._m67txt; b._m67h = ''; b.removeAttribute('data-s'); }
      if (this.bSq) this.bSq.remove(); if (this.bAuto) this.bAuto.remove();
      G62.btnSig = '';
      this.toggleSheet(false);
      if (typeof p64Side === 'function') p64Side(false);
    }
    this.sig = ''; this.t = 0;
  },
  // ---------------------------------------------------------------- подписи кнопок
  LAB: {
    fire: ['●', 'Огонь', 'Fire', 'Bắn'], jet: ['⇑', 'Ранец', 'Jetpack', 'Bay'], aim: ['◎', 'Прицел', 'Aim', 'Ngắm'], reload: ['⟳', 'Перезар.', 'Reload', 'Nạp'],
    rocket: ['➶', 'Ракета', 'Rocket', 'Tên lửa'], reflex: ['◔', 'Рефлекс', 'Reflex', 'Phản xạ'], strike: ['☄', 'Удар', 'Strike', 'Pháo'],
    interact: ['⏏', 'Войти', 'Enter', 'Vào'], jump: ['⤒', 'Прыжок', 'Jump', 'Nhảy'], down: ['⤓', 'Подкат · тормоз', 'Slide · brake', 'Trượt'],
    dash: ['»', 'Рывок', 'Dash', 'Lướt'], switch: ['⇆', 'Сменить бойца', 'Next unit', 'Đổi'], weap: ['⇄', 'Оружие', 'Weapon', 'Súng'],
    v: ['◐', 'Вид от 3-го лица', '3rd person', 'Góc 3'], m0: ['⇲', 'Переброска', 'Redeploy', 'Tái triển khai'], m1: ['✸', 'В гущу боя', 'Into the fight', 'Vào trận'], m2: ['⌖', 'Цель', 'Track', 'Mục tiêu'],
  },
  VEH: { reload: ['💥', 'Залп', 'Barrage', 'Loạt'], reflex: ['☁', 'Дым', 'Smoke', 'Khói'], grenade: ['⏩', 'Форсаж', 'Boost', 'Tăng tốc'], interact: ['⏏', 'Выйти', 'Exit', 'Ra'] },
  DRN: { reload: ['➤', 'Таран', 'Ram', 'Đâm'], jump: ['⤒', 'Вверх', 'Up', 'Lên'], down: ['⤓', 'Вниз', 'Down', 'Xuống'], interact: ['⏏', 'Выйти', 'Exit', 'Ra'] },
  keyOf(b){
    if (b.classList.contains('v61v')) return 'v';
    if (b._m67k) return b._m67k;
    return b.dataset.k || b.dataset.t || '';
  },
  label(b, k, ctx){
    if (k === 'grenade' && ctx === 'inf') return;   // граната — своя отрисовка (G62.touchBtn)
    const L = (ctx === 'veh' && this.VEH[k]) || (ctx === 'drone' && this.DRN[k]) || this.LAB[k]; if (!L) return;
    const h = `<i>${L[0]}</i><small>${this.L(L[1], L[2], L[3])}</small>`;
    if (b._m67h !== h){ b._m67h = h; b.innerHTML = h; if (k === 'grenade') G62.btnSig = ''; }
  },
};
Object.assign(M67, {
  // ---------------------------------------------------------------- шутер: какие кнопки у большого пальца
  ctxOf(c){ if (!c || c.cls === 'inf') return 'inf'; if (c.cls === 'drone') return 'drone'; if (c.cls === 'tank') return 'veh'; return 'tur'; },
  nearUse(c){
    if (!c || c.cls !== 'inf') return true;
    if (S.vehicles.some(v => v.alive && v.team === 0 && dist(v.pos, c.pos) < 22)) return true;
    return S.buildings.some(b => b.alive && b.done && b.team === 0 && b.type === 'turret' && dist(b.pos, c.pos) < 13);
  },
  fpsLayout(){
    const c = ctrlEntity(), ctx = this.ctxOf(c), K = S.kit, L = { fire: 'F', aim: 'C' };
    if (ctx === 'inf'){
      Object.assign(L, { jet: 'A', grenade: 'B', reload: 'D', rocket: 'E' });
      if (['rifle', 'rail', 'hmg'].filter(w => weaponAvail(w)).length > 1) L.weap = 'G';
      if (PROG.has('reflex')) L.reflex = 'H';
      if (PROG.has('strike') || (K && K.strikeCharges > 0)) L.strike = 'I';
      if (this.nearUse(c)) L.interact = 'J';
    } else if (ctx === 'veh') Object.assign(L, { reload: 'A', grenade: 'B', reflex: 'D', interact: 'J' });
    else if (ctx === 'drone') Object.assign(L, { jump: 'A', down: 'D', reload: 'B', interact: 'J' });
    else L.interact = 'J';
    return { L, ctx };
  },
  adopt(){
    const box = $('touch').querySelector('.tf.fps'); if (!box) return box;
    let mi = 0;
    for (const b of box.querySelectorAll('.mbt')) if (b._m67k) mi = max(mi, +b._m67k.slice(1) + 1);
    for (const b of [...box.children]){
      if (b.tagName !== 'BUTTON' || b._m67home) continue;
      b._m67home = box; b._m67txt = b.innerHTML;
      if (b.classList.contains('mbt')){ b._m67k = 'm' + mi; mi++; }
    }
    return box;
  },
  relayout(){
    const box = this.adopt(); if (!box) return;
    const { L, ctx } = this.fpsLayout();
    const all = [...box.querySelectorAll(':scope > button'), ...this.grid.querySelectorAll(':scope > button')];
    const sig = ctx + JSON.stringify(L) + LANG.cur + all.length;
    if (sig === this.sig) return;
    this.sig = sig;
    for (const b of all){
      const k = this.keyOf(b); if (!k || !b._m67home) continue;
      if (L[k]){ if (b.parentElement !== box) box.appendChild(b); b.dataset.s = L[k]; this.label(b, k, ctx); }
      else { if (b.parentElement !== this.grid) this.grid.appendChild(b); b.removeAttribute('data-s'); this.label(b, k, 'inf'); }
    }
    this.mmBtn();
  },
  mmBtn(){
    const b = this.bMM; if (!b) return;
    const R = 48, s = this.safe;
    b.classList.toggle('min', !this.pref.mm);
    b.style.left = (s.l + 8) + 'px'; b.style.top = '50px';
    b.style.width = b.style.height = this.pref.mm ? R * 2 + 'px' : '';
    b.innerHTML = this.pref.mm ? '' : `<i>🗺</i>`;
  },
  // ---------------------------------------------------------------- «Простой огонь»: на враге — стреляет сам
  simpleStep(dt){
    const fps = S.mode === 'fps' && !S.attract && !S.over && !MENU.isOpen() && !S.paused;
    const c = fps ? ctrlEntity() : null;
    let on = false;
    if (c && this.pref.simple && (c.cls === 'inf' || c.cls === 'drone') && !CAMFX.busy() && !(typeof G62 !== 'undefined' && G62.hold) && !this.open){
      const K = S.kit, reloading = c.cls === 'inf' && K && K.reloadT > 0;
      if (!reloading){
        const eye = c.cls === 'inf' ? gunEye(c) : c.pos, fwd = c.cls === 'inf' ? c.fwd : c.aim;
        const W = c.cls === 'inf' && K ? WEAPONS[K.w] : null, rng = W && W.range ? min(W.range, 150) : 120;
        // цель у прицела уже найдена помощью в прицеливании (AIMA.step в этом же кадре, с проверкой видимости) — второй раз не ищем
        let t = AIMA.K() > 0 ? AIMA.tgt : null;
        if (AIMA.K() <= 0 && (this.scanT = (this.scanT || 0) - dt) <= 0){ this.scanT = 0.1; const h = AIMA.scan(eye, fwd, c.team, 0.9 * PI / 180, rng); this.scanE = h ? h.e : null; }
        if (AIMA.K() <= 0) t = this.scanE;
        if (t && t.alive){
          const v = sub(centerOf(t), eye), d = len(v);
          if (d < rng && d > 1.5){ const hr = t.cls === 'inf' ? 0.45 : (typeof hitRadiusRay === 'function' ? hitRadiusRay(t) : hitRadius(t)); on = acos(clamp(dot(v, fwd) / d, -1, 1)) < Math.atan(hr / d) + 0.7 * PI / 180; }
        }
      }
    }
    if (on){ this.onT += dt; this.offT = 0; } else { this.offT += dt; this.onT = 0; }
    const want = on ? this.onT > 0.09 || this.auto : this.auto && this.offT < 0.14;
    this.auto = want;
    const held = !!(TOUCH.fireT || this.leftId);
    if (fps && (want || this.leftId)) { mouseL = true; this.mine = true; }
    else if (this.mine){ this.mine = false; if (!held) mouseL = false; }
    if (this.autoShown !== this.auto){ this.autoShown = this.auto; const fb = this.fb || (this.fb = $('touch').querySelector('[data-t="fire"]')); if (fb) fb.classList.toggle('m67auto', this.auto); }
  },
});
Object.assign(M67, {
  // ---------------------------------------------------------------- меню ☰
  buildSheet(){
    const sh = this.sheet;
    sh.innerHTML = `<div class="hd"><b>☰</b><button class="pz" data-r="pause">⏸</button><button data-x="1">✕</button></div>
      <div class="sec fsec"><h6></h6><div class="grid"></div></div>
      <div class="sec rsec"><h6></h6><div class="rgrid"></div></div>
      <div class="sec"><h6></h6><div class="opts"></div></div>`;
    this.grid = sh.querySelector('.grid'); this.rgrid = sh.querySelector('.rgrid'); this.opts = sh.querySelector('.opts');
    // нажал действие в сетке — меню закрывается
    this.grid.addEventListener('touchend', () => setTimeout(() => this.toggleSheet(false), 160), true);
    const act = e => {
      const t = e.target.closest('[data-o],[data-r],[data-x]'); if (!t || !sh.contains(t)) return;
      if (e.type === 'touchstart'){ e.preventDefault(); this.lastTap = performance.now(); }
      else if (performance.now() - (this.lastTap || -1e9) < 700) return;
      AU.init(); emit('ui', { kind: 'ok' });
      if (t.dataset.x){ this.toggleSheet(false); return; }
      if (t.dataset.o) this.option(t.dataset.o, t.dataset.v);
      if (t.dataset.r) this.rtsAct(t.dataset.r);
    };
    sh.addEventListener('touchstart', act, { passive: false });
    sh.addEventListener('click', act);
  },
  toggleSheet(v){
    const o = v === undefined ? !this.open : !!v;
    this.open = o;
    if (!this.sheet) return;
    this.sheet.classList.toggle('open', o); this.back.classList.toggle('open', o);
    if (this.bMenu) this.bMenu.classList.toggle('on', o);
    if (o) this.fillSheet();
  },
  fillSheet(){
    const rts = S.mode === 'rts';
    this.sheet.classList.toggle('rts', rts);
    this.sig = ''; if (!rts && this.active()) this.relayout();
    // стратегия: ИИ-стратег, автостройка, куратор, вкладки панели
    const q = s => this.sheet.querySelector(s);
    q('.hd b').textContent = '☰ ' + this.L('Меню', 'Menu', 'Menu');
    q('.fsec h6').textContent = this.L('Действия', 'Actions', 'Hành động'); q('.rsec h6').textContent = this.L('Стратегия', 'Strategy', 'Chiến thuật');
    q('.opts').previousElementSibling.textContent = this.L('Настройки телефона', 'Phone settings', 'Cài đặt điện thoại');
    q('.pz').textContent = '⏸ ' + this.L('Пауза · меню игры', 'Pause · game menu', 'Tạm dừng · menu');
    const txt = e => { const c = e.cloneNode(true); c.querySelectorAll('kbd').forEach(k => k.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
    let h = '';
    if (rts){
      for (const id of ['aiBtn', 'abBtn', 'curBtn']){ const b = $(id); if (b) h += `<button data-r="${id}">${id === 'curBtn' ? this.L('Куратор', 'Curator', 'Hướng dẫn') + ' ' : ''}${uixEsc(txt(b))}</button>`; }
      for (const t of document.querySelectorAll('#side .tabs button')) h += `<button data-r="tab:${t.dataset.tab}">▤ ${uixEsc(txt(t))}</button>`;
    }
    this.rgrid.innerHTML = h;
    const P = this.pref, tg = (k, on, ru, en, vi) => `<div class="row"><span>${this.L(ru, en, vi)}</span><button data-o="${k}" class="tog ${on ? 'on' : ''}">${on ? this.L('ВКЛ', 'ON', 'BẬT') : this.L('ВЫКЛ', 'OFF', 'TẮT')}</button></div>`;
    this.opts.innerHTML =
      tg('simple', P.simple, 'Простой огонь: прицел на враге — стреляет сам', 'Simple fire: shoots by itself when aimed at an enemy', 'Bắn đơn giản: tự bắn khi ngắm trúng địch') +
      tg('left', P.left, 'Вторая кнопка огня слева', 'Second fire button on the left', 'Nút bắn thứ hai bên trái') +
      `<div class="row"><span>${this.L('Обзор пальцем (чувствительность)', 'Look sensitivity', 'Độ nhạy nhìn')}</span><button data-o="sens" data-v="-1">−</button><b class="sv">${P.sens.toFixed(1)}</b><button data-o="sens" data-v="1">+</button></div>` +
      tg('mm', P.mm, 'Миникарта в бою', 'Minimap in battle', 'Bản đồ nhỏ') +
      tg('cam', P.cam, 'Живой портрет юнита в стратегии', 'Live unit portrait in strategy', 'Ảnh trực tiếp đơn vị') +
      tg('classic', P.classic, 'Раскладка кнопок v6.6 (старая)', 'Old v6.6 button layout', 'Bố cục cũ v6.6');
  },
  option(k, v){
    const P = this.pref;
    if (k === 'sens'){ P.sens = clamp(Math.round((P.sens + (+v) * 0.1) * 10) / 10, 0.4, 2.5); TOUCH.sens = P.sens; }
    else { P[k] = !P[k]; }
    this.save();
    if (k === 'simple'){ SET.m67simpleOff = !P.simple; MENU.save(); }
    if (k === 'classic'){ this.apply(); if (!this.active()) return; }
    if (k === 'simple') feed(P.simple ? this.L('Простой огонь: ВКЛ — наведи прицел на врага, стрельба сама', 'Simple fire: ON — aim at an enemy and it fires', 'Bắn đơn giản: BẬT') : this.L('Простой огонь: ВЫКЛ — стреляй кнопкой ●', 'Simple fire: OFF — fire with the ● button', 'Bắn đơn giản: TẮT'), '#9cf');
    this.sig = ''; this.t = 0;
    if (this.open) this.fillSheet();
  },
  rtsAct(r){
    if (r === 'pause'){ this.toggleSheet(false); if (!MENU.isOpen()) MENU.pause(); return; }
    if (r.startsWith('tab:')){
      const tab = r.slice(4); if (typeof p64Side === 'function') p64Side(false); this.sideAuto = true;
      SIDE.tab = tab; buildSidebar(); this.toggleSheet(false); return;
    }
    const b = $(r); if (b) b.click();
    setTimeout(() => { if (this.open) this.fillSheet(); }, 60);
  },
});
Object.assign(M67, {
  // ---------------------------------------------------------------- стратегия
  combat(){ return groupsOf(0).filter(g => groupAlive(g) && g.cls !== 'builder'); },
  selectArmy(){ S.sel.clear(); S.selB = null; for (const g of groupsOf(0)) S.sel.add(g); },
  cycleSquad(){
    const L = this.combat();
    if (!L.length){ feed(this.L('Отрядов нет — закажи в Казарме', 'No squads — order some at the Barracks', 'Không có đội'), '#f88'); emit('ui', { kind: 'deny' }); return; }
    const cur = selGroups(), i0 = cur.length === 1 ? L.indexOf(cur[0]) : this.sqI;
    const i = ((i0 < 0 ? -1 : i0) + 1) % L.length; this.sqI = i;
    const g = L[i]; S.sel.clear(); S.selB = null; S.sel.add(g);
    const p = typeof leaderPos === 'function' ? leaderPos(g) : g.pos; if (p && !onScreen(p)) flyCamTo(p);
    emit('ui', { kind: 'ok' }); this.railLabels(true);
  },
  railLabels(force){
    const L = this.combat(), sel = selGroups();
    const g = sel.length === 1 && L.includes(sel[0]) ? sel[0] : null;
    const sq = `<i>◈</i><b>${g ? uixEsc(groupLabel(g)) : this.L('Отряд', 'Squad', 'Đội')}</b><small>${g ? (L.indexOf(g) + 1) + ' / ' + L.length : this.L('по очереди', 'next', 'kế')}${L.length && !g ? ' · ' + L.length : ''}</small>`;
    if (force || this.bSq._h !== sq){ this.bSq._h = sq; this.bSq.innerHTML = sq; }
    const set = sel.length ? sel : groupsOf(0).filter(groupAlive);
    const on = typeof isAuto66 === 'function' && set.length && set.every(isAuto66), some = !on && typeof isAuto66 === 'function' && set.some(isAuto66);
    const au = `<i>${on ? '⟳' : '✋'}</i><b>${on ? this.L('Автономно', 'Autonomous', 'Tự hành') : some ? this.L('Частично', 'Mixed', 'Một phần') : this.L('Ручное', 'Manual', 'Thủ công')}</b><small>${sel.length ? this.L('выделенные', 'selected', 'đã chọn') : this.L('вся армия', 'all army', 'toàn quân')}</small>`;
    if (force || this.bAuto._h !== au){ this.bAuto._h = au; this.bAuto.innerHTML = au; this.bAuto.classList.toggle('on', !!on); }
  },
  railAdopt(){
    const tf = $('touch').querySelector('.tf.rts'); if (!tf) return;
    const R = this.rail, g = k => tf.querySelector(`[data-t="${k}"]`) || R.querySelector(`[data-t="${k}"]`);
    const order = [g('army'), this.bSq, g('builder'), g('box'), this.bAuto].filter(Boolean);
    for (const b of order){ if (!b._m67home) { b._m67home = tf; b._m67txt = b.innerHTML; } if (b.parentElement !== R || R.lastElementChild !== b) R.appendChild(b); }
  },
  sideStep(rts){
    if (!rts){ this.wasRts = false; return; }
    const sig = (selBuilders().length ? 'b' : '') + (S.selB && typeof v64IsProd === 'function' && v64IsProd(S.selB) ? 'h' + uixId(S.selB) : '');
    if (this.wasRts !== true){ this.wasRts = true; this.sideSig = sig; if (!sig){ p64Side(true); this.sideAuto = false; } else this.sideAuto = true; }
    if (sig !== this.sideSig){
      if (sig){ this.sideAuto = true; if (P64.min) p64Side(false); }
      else if (this.sideAuto){ p64Side(true); this.sideAuto = false; }
      this.sideSig = sig;
    }
    document.body.classList.toggle('m67side', !P64.min);
  },
  camStep(rts){
    const b = this.bCam; if (!b) return;
    let show = false;
    if (rts && typeof CAM66 !== 'undefined' && !CAM66.failed){
      if (this.pref.cam && CAM66.shown && CAM66.el){ const r = CAM66.el.getBoundingClientRect(); b.style.left = (r.right + 4) + 'px'; b.style.top = r.top + 'px'; b.textContent = '–'; b.className = ''; show = true; }
      else if (!this.pref.cam && this.camSubj0 && this.camSubj0.call(CAM66)){ b.style.left = (this.safe.l + 6) + 'px'; b.style.top = '132px'; b.innerHTML = '<i>📷</i>'; b.className = 'min'; show = true; }
    }
    b.style.display = show ? 'block' : 'none';
  },
  // ---------------------------------------------------------------- кадр
  frame(dt){
    if (!this.active()) return;
    this.simpleStep(dt);
    this.t -= dt; if (this.t > 0) return; this.t = 0.15;
    if (this.lang !== LANG.cur) this.rotText();
    const mo = MENU.isOpen(), fps = S.mode === 'fps' && !S.attract && !mo, rts = S.mode === 'rts' && !S.attract && !mo;
    const bc = document.body.classList;
    bc.toggle('m67fps', fps); bc.toggle('m67rts', rts);
    bc.toggle('m67left', fps && this.pref.left); bc.toggle('m67joy', !!TOUCH.joy); bc.toggle('m67nomm', !this.pref.mm);
    if (fps) this.relayout();
    if (rts){ this.railAdopt(); this.railLabels(false); }
    this.sideStep(rts);
    this.camStep(rts);
    if (this.open && (mo || S.attract)) this.toggleSheet(false);
    if (this.open && this.sheet.classList.contains('rts') !== (S.mode === 'rts')) this.fillSheet();
    const mb = this.bMenu; if (mb && (!fps && !rts)) this.toggleSheet(false);
  },
  // подсказки: на телефоне — про кнопки, без клавиатуры
  HINT: {
    g62: ['Граната: держи «Граната» — видна дуга и круг взрыва; веди пальцем — угол; отпусти — бросок.', 'Grenade: hold "Grenade" to see the arc and blast circle; drag to aim; release to throw.'],
    rocket: ['Рядом техника или постройка врага — жми ➶ «Ракета».', 'Enemy vehicle or structure nearby — tap ➶ "Rocket".'],
    grenade: ['Враги сбились в кучу — держи «Граната», веди пальцем, отпусти.', 'Enemies are bunched up — hold "Grenade", drag to aim, release.'],
    reflex: ['Много врагов — ◔ «Рефлекс» замедлит время.', 'Lots of hostiles — ◔ "Reflex" slows time down.'],
    strike: ['Наведи прицел на скопление врагов и жми ☄ «Удар».', 'Aim at the enemy cluster and tap ☄ "Strike".'],
    rail: ['Цели далеко — ⇄ «Оружие»: рельсотрон сильнее издалека.', 'Targets are far — ⇄ "Weapon": the railgun is stronger at range.'],
    hmg: ['У тебя временный тяжёлый пулемёт — ⇄ «Оружие».', 'You have a temporary heavy MG — ⇄ "Weapon".'],
    tank: ['Рядом наш танк — подойди и жми ⏏ «Войти».', 'One of our tanks is close — walk up and tap ⏏ "Enter".'],
    turret: ['Займи турель — подойди и жми ⏏ «Войти».', 'Man the turret — walk up and tap ⏏ "Enter".'],
    switch: ['Здесь тихо — ⇆ вверху справа переключит на бойца ближе к бою.', 'It is quiet here — ⇆ at the top right switches to a unit closer to the fight.'],
    reload: ['Перезаряжайся заранее, пока нет врагов — ⟳.', 'Reload early while no enemies are around — ⟳.'],
    redeploy: ['Цель далеко — ☰ → ⇲ «Переброска»: капсулой прямо к цели.', 'The objective is far — ☰ → ⇲ "Redeploy": drop pod straight to it.'],
    airbrake: ['В воздухе ☰ → ⤓ — тормоз ранцем.', 'In the air, ☰ → ⤓ is the jet brake.'],
    select: ['Тап по отряду — выделить, долгий тап по земле или врагу — приказ.', 'Tap a squad to select it, long-tap the ground or an enemy to order.'],
    rally: ['Долгий тап по земле — точка сбора для новых войск.', 'Long-tap the ground — rally point for new troops.'],
    build: ['Строят только инженеры: «⚒ Инженер» справа → здание → место → «✔ Строить».', 'Only builders build: "⚒ Builder" on the right → building → spot → "✔ Build".'],
    eco: ['Тап по «РУДА» вверху слева — откуда берётся руда.', 'Tap "ORE" at the top left — where ore comes from.'],
    vtank: ['Танк: 💥 «Залп», ☁ «Дым», ⏩ «Форсаж», ⏏ «Выйти».', 'Tank: 💥 "Barrage", ☁ "Smoke", ⏩ "Boost", ⏏ "Exit".'],
    vtank2: ['Целей много — 💥 «Залп».', 'Plenty of targets — 💥 "Barrage".'],
    vdrone: ['Дрон: ⤒ / ⤓ — выше / ниже, ➤ «Таран» — в точку прицела.', 'Drone: ⤒ / ⤓ — up / down, ➤ "Ram" your aim point.'],
  },
  hintFix(id, text, kbd){
    const h = this.HINT[id];
    if (h) return tr(h[0], h[1], h[1]);
    if (/^v2/.test(id) || ['slide', 'ai', 'third', 'ctl', 'rush', 'jet'].includes(id) && /Shift|ПКМ|RMB|Ctrl/.test(text)) return null;
    const plain = String(text).replace(/<[^>]+>/g, '');
    if (/<kbd|ЛКМ|ПКМ|LMB|RMB|Shift|Ctrl|клавиш|колес|wheel|Chuột/i.test(text)) return null;
    if ((kbd || []).length && /\b[A-Z]\b —|\(\w\)/.test(plain)) return null;
    return text;
  },
});
// ---------------------------------------------------------------------
//  ВСТРАИВАНИЕ — только на сенсорных устройствах; на ПК ни одна функция не подменяется
// ---------------------------------------------------------------------
if (TOUCH.on){
  { const ti0 = TOUCH.init; TOUCH.init = function(){ ti0.call(this); try { M67.init(); } catch (e){ console.warn('m67 init', e); } }; }
  { const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); try { M67.frame(dt); } catch (e){ if (!M67.err){ M67.err = 1; console.warn('m67', e); } } }; }
  // джойстик: плавно гаснет после отпускания
  { const sj0 = TOUCH.showJoy; TOUCH.showJoy = function(x, y, dx, dy){ const j = $('tjoy'); if (j) j.classList.remove('fade'); clearTimeout(M67.fj); sj0.call(this, x, y, dx, dy); }; }
  TOUCH.fadeJoy = function(){
    const j = $('tjoy'); if (!j) return;
    if (!M67.active()){ j.style.display = 'none'; return; }
    j.classList.add('fade'); clearTimeout(M67.fj);
    M67.fj = setTimeout(() => { if (!TOUCH.joy){ j.style.display = 'none'; j.classList.remove('fade'); } }, 230);
  };
  // кнопка гранаты: значок, число, полоса восстановления, подпись
  { const tb0 = G62.touchBtn; G62.touchBtn = function(){
      if (!M67.active()) return tb0.call(this);
      if (!S.kit) return;
      const b = document.querySelector('#touch .g62b'); if (!b) return;
      const c = ctrlEntity(), inf = !c || c.cls === 'inf';
      if (!inf) return;   // в технике — «Форсаж» (M67.label)
      const K = G62.kit(), fr = K.gren >= G62.MAX ? 1 : clamp(1 - K.grenCd / G62.RECH, 0, 1);
      const sig = 'm' + K.gren + ':' + Math.round(fr * 20) + (G62.hold ? 'h' : '') + LANG.cur;
      if (sig === G62.btnSig) return;
      G62.btnSig = sig; b._m67h = '';
      b.innerHTML = `<i class="g67"></i><sup>${K.gren}</sup><small>${M67.L('Граната', 'Grenade', 'Lựu đạn')}</small><s style="width:${Math.round(fr * 70)}%"></s>`;
      b.classList.toggle('g62e', K.gren <= 0); b.classList.toggle('g62h', !!G62.hold);
    }; }
  // подсказки без клавиатуры
  { const hs0 = HINTS.show; HINTS.show = function(id, text, kbd, act, force){
      if (M67.active()){
        const t = M67.hintFix(id, text, kbd);
        if (t === null){ this.shown[id] = (this.shown[id] || 0) + 1; this.shown[id + '_t'] = S.rtime; return false; }
        text = t; kbd = [];
      }
      return hs0.call(this, id, text, kbd, act, force);
    }; }
  // миникарта шутера: меньше, слева вверху, сворачивается тапом
  { const dm0 = drawMinimap; drawMinimap = function(){
      if (!M67.active()) return dm0();
      const m73 = typeof M73 !== 'undefined' && M73.act();   // v7.3: миникарта — в самом углу, без кнопки скрытия
      if (!M67.pref.mm && !m73) return;
      const R0 = 82, R = 48, k = R / R0, s = M67.safe;
      octx.save(); octx.translate(s.l + 8 + R, (m73 ? s.t + 6 : 50) + R); octx.scale(k, k); octx.translate(-(18 + R0), -(innerHeight - 18 - R0));
      try { dm0(); } finally { octx.restore(); }
    }; }
  // стрелка к цели у края экрана — не под вырезом (копия edgeMarker из ui.js с отступами safe area)
  { const em0 = edgeMarker; edgeMarker = function(p, color, label, subt){
      const s0 = M67.safe;
      if (!M67.active() || !(s0.l || s0.r || s0.b)) return em0(p, color, label, subt);
      p = navAnchor(p);
      const W = innerWidth, H = innerHeight, c = S.cam, v = sub(p, c.pos);
      const z = dot(v, c.fwd), x = dot(v, c.right), y = dot(v, c.up);
      const s = z > 0.3 ? project(p) : null, m = 46, mx = m + max(s0.l, s0.r), my = m + max(s0.t, s0.b);
      const on = s && s[0] > mx && s[0] < W - mx && s[1] > my && s[1] < H - my;
      if (on) return em0(p, color, label, subt);
      octx.lineWidth = 2;
      let ang = atan2(-y, x);
      if (z <= 0.3 && abs(x) < 1e-3 && abs(y) < 1e-3) ang = PI / 2;
      const cx = W / 2, cy = H / 2, rx = W / 2 - mx, ry = H / 2 - my;
      const k = min(rx / max(abs(cos(ang)), 1e-3), ry / max(abs(sin(ang)), 1e-3));
      const ex = cx + cos(ang) * k, ey = cy + sin(ang) * k;
      octx.save(); octx.translate(ex, ey); octx.rotate(ang);
      octx.fillStyle = color; octx.beginPath(); octx.moveTo(14, 0); octx.lineTo(-6, -9); octx.lineTo(-2, 0); octx.lineTo(-6, 9); octx.closePath(); octx.fill();
      octx.restore();
      octx.fillStyle = color; octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", Consolas, sans-serif';
      octx.fillText(`${label} ${subt}`, ex - cos(ang) * 34, ey - sin(ang) * 22 + 4);
    }; }
  // миникарты стратегии: меньше, слева внизу над полоской «домой»
  { const mc0 = mmCenters; mmCenters = function(){
      if (!M67.active()) return mc0();
      MM.R = innerHeight < 380 ? 32 : 36;
      const R = MM.R, s = M67.safe, y = innerHeight - s.b - 8 - R, x0 = s.l + 8 + R;
      return [[x0, y], [x0 + R * 2 + 12, y]];
    }; }
  // живой портрет: меньше, слева вверху; можно свернуть
  if (typeof CAM66 !== 'undefined'){
    const pl0 = CAM66.place; CAM66.place = function(el){
      if (!M67.active()) return pl0.call(this, el);
      const W = 84, H = 105, s = M67.safe;
      el.style.left = (s.l + 6) + 'px'; el.style.top = '132px'; el.style.width = W + 'px'; el.style.height = H + 'px'; el.classList.add('ph');
    };
    const sj0 = CAM66.subject; M67.camSubj0 = sj0;
    CAM66.subject = function(){ if (M67.active() && !M67.pref.cam) return null; return sj0.call(this); };
  }
  // куратор: одна строка; тап по тексту — развернуть
  { const cr0 = CUR.render; CUR.render = function(force){
      cr0.call(this, force);
      const box = document.querySelector('#cur .cbox');
      if (box && !box._m67){ box._m67 = 1; box.addEventListener('touchstart', e => { if (e.target.closest('button')) return; box.classList.toggle('x67'); }, { passive: true }); }
    }; }
  // настройки: «Простой огонь» (только на телефоне)
  { const hs0 = MENU.html_settings; MENU.html_settings = function(){
      const h = hs0.call(this);
      if (SET.m67simpleOff !== undefined) M67.pref.simple = !SET.m67simpleOff;
      const on = M67.pref.simple;
      const row = `<div class="row"><label>${tr('Простой огонь на телефоне: прицел на враге — стреляет сам', 'Simple fire on phone: shoots by itself when aimed at an enemy', 'Bắn đơn giản trên điện thoại')}</label><button class="tog ${on ? 'on' : ''}" data-tog="m67simpleOff">${on ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</button></div>`;
      const i = h.indexOf('data-tog="hintsOn"'); if (i < 0) return h;
      const j = h.indexOf('</div>', i) + 6;
      return h.slice(0, j) + row + h.slice(j);
    }; }
}
// ---------------------------------------------------------------------
//  СТИЛИ (все правила — под body.touch; новая раскладка — под body.m67)
// ---------------------------------------------------------------------
M67.css = function(){
  const st = document.createElement('style'); st.id = 'm67css';
  st.textContent = `
  body.touch{--sl:env(safe-area-inset-left,0px);--sr:env(safe-area-inset-right,0px);--sb:env(safe-area-inset-bottom,0px);--st:env(safe-area-inset-top,0px)}
  #touch .tt .m67n{display:none} #touch .tt .m67m{font-size:20px;min-width:44px}
  #touch .tt .m67m.on{background:rgba(214,198,154,.55);color:#111}
  #m67ghost,#m67left,#m67mm,#m67rail,#m67cam{display:none}
  #m67back{display:none;position:fixed;inset:0;pointer-events:auto;background:rgba(0,0,0,.28);z-index:29}
  #m67back.open{display:block}
  #m67sheet{display:none;position:fixed;top:calc(var(--st) + 58px);right:calc(var(--sr) + 6px);width:min(360px,62vw);max-height:calc(100vh - var(--st) - var(--sb) - 64px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
    pointer-events:auto;touch-action:pan-y;z-index:30;background:rgba(10,12,14,.95);border:1px solid rgba(214,198,154,.45);border-radius:12px;padding:6px 10px 10px;box-sizing:border-box;box-shadow:0 10px 30px rgba(0,0,0,.6)}
  #m67sheet.open{display:block}
  #m67sheet .hd{display:flex;align-items:center;gap:8px} #m67sheet .hd b{flex:1;font:700 15px "Exo 2";color:#f0e8d0}
  #touch #m67sheet .hd .pz{width:auto;height:44px;padding:0 14px;font-size:13px}
  body.touch #touch button *{pointer-events:none}
  #touch #m67sheet button{border-radius:9px;width:auto;height:auto;font:600 12.5px "Exo 2";padding:0 8px}
  #touch #m67sheet .hd button{width:48px;height:42px;font-size:18px}
  #m67sheet h6{margin:8px 0 5px;font:600 10px "Exo 2";letter-spacing:.16em;color:#a59d84;text-transform:uppercase}
  #m67sheet .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  #touch #m67sheet .grid > button{position:static;display:flex;flex-direction:column;align-items:center;justify-content:center;height:62px;padding:2px}
  #m67sheet .grid > button i{font-style:normal;font-size:21px;line-height:1.1} #m67sheet .grid > button small{font:600 10.5px "Exo 2";line-height:1.05;text-align:center;margin-top:2px}
  #m67sheet .rgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  #touch #m67sheet .rgrid button{min-height:50px;text-align:left;line-height:1.15;padding:4px 9px}
  #m67sheet .row{display:flex;align-items:center;gap:6px;min-height:52px;border-top:1px solid rgba(214,198,154,.12)}
  #m67sheet .row span{flex:1;font-size:12.5px;line-height:1.25;color:#e8e2d0}
  #touch #m67sheet .row button{width:66px;height:44px;flex:none;font-size:13px}
  #touch #m67sheet .row button[data-o="sens"]{width:48px;font-size:20px}
  #touch #m67sheet .row button.tog.on{background:rgba(60,130,80,.6);border-color:#8fffaa;color:#eaffef}
  #m67sheet .row .sv{min-width:30px;text-align:center;font:700 14px "Exo 2"}
  #m67sheet.rts .fsec, #m67sheet:not(.rts) .rsec{display:none}
  #m67sheet .grid:empty::after{content:"—";color:#666}
  /* ===== новая раскладка ===== */
  body.m67 #touch button{-webkit-tap-highlight-color:transparent}
  body.m67 #touch .tt{top:calc(var(--st) + 6px);right:calc(var(--sr) + 6px);gap:6px}
  body.m67 #touch .tt button{height:46px;min-width:48px;border-radius:10px;font-size:13.5px;padding:0 12px}
  body.m67 #touch .tt [data-t="pause"]{display:none}
  body.m67.m64fps #touch .tt .m67n{display:block;font-size:22px;padding:0}
  body.m67 #touch .tt .m67m{font-size:22px;padding:0}
  /* шутер: кнопки у правого большого пальца */
  body.m67 #touch.mfps .tf.fps{display:block;position:absolute;inset:0;width:auto;pointer-events:none}
  body.m67 #touch .tf.fps > button{position:absolute;display:none;border-radius:50%;padding:0;background:rgba(14,16,18,.36);border:1.5px solid rgba(232,220,184,.5);color:#f6efd8;box-shadow:0 2px 10px rgba(0,0,0,.25);text-shadow:0 1px 2px #000}
  body.m67 #touch .tf.fps > button[data-s]{display:flex;flex-direction:column;align-items:center;justify-content:center}
  body.m67 #touch .tf.fps > button i{font-style:normal;font-size:22px;line-height:1}
  body.m67 #touch .tf.fps > button small{font:700 9.5px "Exo 2";letter-spacing:.02em;margin-top:3px;opacity:.9;white-space:nowrap}
  body.m67 #touch .tf.fps > button.on{background:rgba(214,198,154,.5);color:#111;text-shadow:none}
  body.m67 #touch .tf.fps > [data-s="F"]{width:92px;height:92px;right:calc(var(--sr) + 16px);bottom:calc(var(--sb) + 14px);background:rgba(170,40,30,.42);border:2px solid rgba(255,130,100,.8)}
  body.m67 #touch .tf.fps > [data-s="F"] i{font-size:34px} body.m67 #touch .tf.fps > [data-s="F"] small{font-size:11px}
  body.m67 #touch .tf.fps > [data-s="F"].on{background:rgba(230,70,40,.62)}
  body.m67 #touch .tf.fps > [data-s="F"].m67auto{box-shadow:0 0 0 4px rgba(255,90,60,.35),0 0 18px rgba(255,90,60,.6)}
  body.m67 #touch .tf.fps > [data-s="A"]{width:66px;height:66px;right:calc(var(--sr) + 122px);bottom:calc(var(--sb) + 18px)}
  body.m67 #touch .tf.fps > [data-s="A"] i{font-size:28px}
  body.m67 #touch .tf.fps > [data-s="B"]{width:62px;height:62px;right:calc(var(--sr) + 100px);bottom:calc(var(--sb) + 110px)}
  body.m67 #touch .tf.fps > [data-s="C"]{width:58px;height:58px;right:calc(var(--sr) + 22px);bottom:calc(var(--sb) + 118px)}
  body.m67 #touch .tf.fps > [data-s="D"]{width:56px;height:56px;right:calc(var(--sr) + 204px);bottom:calc(var(--sb) + 22px)}
  body.m67 #touch .tf.fps > [data-s="E"]{width:56px;height:56px;right:calc(var(--sr) + 182px);bottom:calc(var(--sb) + 104px)}
  body.m67 #touch .tf.fps > [data-s="G"]{width:52px;height:52px;right:calc(var(--sr) + 96px);bottom:calc(var(--sb) + 184px)}
  body.m67 #touch .tf.fps > [data-s="H"]{width:52px;height:52px;right:calc(var(--sr) + 22px);bottom:calc(var(--sb) + 190px)}
  body.m67 #touch .tf.fps > [data-s="I"]{width:52px;height:52px;right:calc(var(--sr) + 164px);bottom:calc(var(--sb) + 178px)}
  body.m67 #touch .tf.fps > [data-s="J"]{width:56px;height:56px;right:calc(var(--sr) + 262px);bottom:calc(var(--sb) + 98px);border-color:rgba(143,255,170,.7)}
  body.m67 #touch .g62b sup{position:absolute;right:9px;top:7px;font:800 13px "Exo 2";color:#fff}
  body.m67 #touch .g62b s{position:absolute;left:15%;bottom:6px;height:3px;background:#ffd27a;border-radius:2px}
  body.m67 #touch .g62b.g62e{opacity:.55}
  body.m67 #touch .g62b.g62h{border-color:#ffd27a;box-shadow:0 0 12px rgba(255,210,122,.55)}
  .g67{display:block;width:20px;height:24px;position:relative;font-style:normal}
  .g67:before{content:"";position:absolute;left:1px;bottom:0;width:18px;height:18px;border-radius:50% 50% 46% 46%;background:#d8cca2;box-shadow:inset -3px -3px 0 rgba(0,0,0,.28)}
  .g67:after{content:"";position:absolute;left:5px;top:1px;width:8px;height:5px;border:2.5px solid #d8cca2;border-bottom:none;border-radius:3px 3px 0 0}
  #tjoy{transition:opacity .22s ease-out} #tjoy.fade{opacity:0}
  body.m67.m64fps:not(.m67joy) #m67ghost{display:block;position:absolute;left:calc(var(--sl) + 34px);bottom:calc(var(--sb) + 28px);width:120px;height:120px;border-radius:50%;border:2px dashed rgba(214,198,154,.26);pointer-events:none}
  #m67ghost i{position:absolute;left:36px;top:36px;width:44px;height:44px;border-radius:50%;background:rgba(214,198,154,.14)}
  body.m67.m67left #m67left{display:flex;align-items:center;justify-content:center;position:absolute;left:calc(var(--sl) + 22px);bottom:calc(var(--sb) + 166px);width:72px;height:72px;border-radius:50%;background:rgba(170,40,30,.38);border:2px solid rgba(255,130,100,.75);font-size:28px}
  body.m67.m67left #m67left.on{background:rgba(230,70,40,.6)}
  #m67left i{font-style:normal}
  body.m67.m64fps #m67mm{display:block;position:absolute;border-radius:50%;background:transparent;border:none}
  body.m67.m64fps #m67mm.min{width:46px;height:46px;border-radius:10px;background:rgba(12,13,14,.55);border:1.5px solid rgba(214,198,154,.5)}
  #m67mm i{font-style:normal;font-size:20px}
  /* шутер: компактный HUD */
  body.m67 #hud{left:calc(var(--sl) + 6px);top:calc(var(--st) + 6px);gap:4px}
  body.m67 #hud > .hb{display:none}
  body.m67.m64fps #hud > .hb:nth-child(4), body.m67.m64rts #hud > .hb:nth-child(1), body.m67.m64rts #hud > .hb:nth-child(4){display:block;padding:2px 8px;min-width:0}
  body.m67.m64fps #obj{top:calc(var(--st) + 4px);left:50%;right:auto;transform:translateX(-50%);max-width:34vw;min-width:0;padding:2px 12px 3px}
  body.m67.m64fps #obj em, body.m67.m64fps #obj i{display:none} body.m67.m64fps #obj small{font-size:8.5px;letter-spacing:.12em} body.m67.m64fps #obj b{font-size:13px}
  body.m67.m64fps #kit{top:auto;bottom:calc(var(--sb) + 34px);right:auto;left:50%;transform:translateX(-50%);opacity:1}
  body.m67.m64fps #kit .weap{min-width:0;padding:0 10px;border:none;border-radius:6px;background:rgba(10,12,14,.45);text-align:center}
  body.m67.m64fps #kit .weap small, body.m67.m64fps #kit .wl, body.m67.m64fps #kit .slots{display:none}
  body.m67.m64fps #kit .weap b{font-size:20px;line-height:1.15} body.m67.m64fps #kit .weap b em{font-size:12px}
  body.m67 #bars{width:230px;bottom:calc(var(--sb) + 6px);gap:2px}
  body.m67 #rankLbl, body.m67 #xpBar, body.m67 #bars > .lbl:last-child, body.m67 #hpLbl{display:none}
  body.m67 #bars .lbl{font-size:10px;justify-content:flex-end;position:absolute;right:0;top:-14px;width:auto}
  body.m67 #bars .bar{height:6px}
  body.m67.m64fps #feed{bottom:calc(var(--sb) + 68px);font-size:11px;max-width:40vw}
  body.m67.m64fps #feed > *:nth-last-child(n+3){display:none}
  body.m67.m64fps #hint{top:calc(var(--st) + 66px);font-size:11.5px;max-width:46vw;padding:3px 9px;line-height:1.3}
  body.m67 #hint i{width:18px;height:18px;font-size:12px}
  body.m67.m64fps #squadp{display:none !important}
  body.m67 #sq{top:calc(var(--st) + 60px);right:calc(var(--sr) + 6px);max-width:26vw}
  body.m67 #devLab{left:calc(var(--sl) + 4px);bottom:calc(var(--sb) + 2px)}
  /* стратегия */
  body.m67 #touch.mrts .tf.rts{display:none !important}
  body.m67.m64rts:not(.m67side):not(.placing) #m67rail{display:flex;flex-direction:column;gap:6px;position:absolute;right:calc(var(--sr) + 6px);top:calc(var(--st) + 60px);pointer-events:none}
  body.m67 #touch #m67rail button{pointer-events:auto;display:block;width:112px;height:52px;border-radius:12px;padding:0 6px;font:700 13px "Exo 2";line-height:1.2;background:rgba(12,14,16,.58);border:1.5px solid rgba(214,198,154,.55);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #m67rail button i{font-style:normal;margin-right:3px} #m67rail button b{font-weight:700} #m67rail button small{display:block;font:600 10.5px "Exo 2";opacity:.75}
  body.m67 #touch #m67rail button.on{background:rgba(214,198,154,.55);color:#111}
  body.m67 #touch #m67rail .m67auto{border-color:rgba(127,220,255,.6)} body.m67 #touch #m67rail .m67auto.on{background:rgba(30,90,110,.75);color:#eaf8ff;border-color:#7fdcff}
  body.m67.m64rts #r61cards{display:none !important}
  body.m67.m64rts #pstrip, body.m67.m64rts.r61open #pstrip{top:calc(var(--st) + 48px);left:calc(var(--sl) + 6px)}
  body.m67.m64rts #feed, body.m67.m64rts.r61open #feed{top:calc(var(--st) + 92px);left:calc(var(--sl) + 6px);max-width:30vw;max-height:34px}
  body.m67.m64rts #hint{top:calc(var(--st) + 52px);left:50%;transform:translateX(-50%);max-width:44vw}
  body.m67.m64rts #card{left:calc(var(--sl) + 176px);right:calc(var(--sr) + 126px);bottom:calc(var(--sb) + 4px)}
  body.m67.m64rts.m67side #card{right:calc(var(--sr) + var(--sideW) + 6px)}
  body.m67 #side{right:var(--sr);bottom:var(--sb)}
  body.m67 #side .sfoot{display:none}
  body.m67 #sideTog{right:calc(var(--sr) + var(--sideW) + 2px)}
  body.m67.side64min #sideTog{display:none !important}
  body.m67 #placeBar{bottom:calc(var(--sb) + 10px)}
  body.m67 #uxtoasts{bottom:calc(var(--sb) + 136px)}
  body.m67 #cur .ctx p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  body.m67 #cur .cbox.x67 .ctx p{white-space:normal}
  body.m67 #cur .cmk:not(.off){pointer-events:none}
  body.m67.m64rts #m67cam{display:none;position:fixed;z-index:12;width:36px;height:36px;padding:0;border-radius:6px;background:rgba(10,12,14,.7);border:1px solid rgba(214,198,154,.6);color:#f0e8d0;font:700 16px "Exo 2";line-height:1;pointer-events:auto}
  body.m67.m64rts #m67cam.min{width:46px;height:46px;border-radius:10px;font-size:20px}
  #m67cam i{font-style:normal}
  /* меню и экраны: не под вырезом */
  body.m67 #screen{padding-left:calc(var(--sl) + 4px);padding-right:calc(var(--sr) + 4px);box-sizing:border-box}
  /* поворот: мягкая подсказка */
  body.m67 #trot{background:rgba(4,5,6,.9);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);z-index:40}
  body.m67rotok #trot{display:none !important}
  .m67rot{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:300px}
  .m67rot i{font-style:normal;font-size:56px;animation:m67rot 2.4s ease-in-out infinite}
  .m67rot b{font:400 21px "Russo One","Exo 2",sans-serif;color:#e8dcb8;line-height:1.25}
  .m67rot small{font:14px "Exo 2",sans-serif;color:#cfc6ad;line-height:1.35}
  .m67rot button{pointer-events:auto;cursor:pointer;width:auto;min-height:50px;padding:0 24px;border-radius:12px;background:rgba(214,198,154,.15);border:1.5px solid #d6c69a;color:#f0e8d0;font:700 15px "Exo 2"}
  @keyframes m67rot{0%,25%{transform:rotate(0)}50%,80%{transform:rotate(-90deg)}100%{transform:rotate(0)}}`;
  document.head.appendChild(st);
};
if (TOUCH.on) M67.css();
