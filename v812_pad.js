// =====================================================================
//  v8.12 — ГЕЙМПАД (GP812): Gamepad API, стандартная раскладка (Xbox / PlayStation / Android-геймпады).
//  • Шутер: левый стик — ходьба, правый — обзор (мягкий доводчик как на телефоне), RT — огонь, LT — прицел,
//    A (удерж.) — прыжок/ранец, B — присед/подкат, X — перезарядка / «использовать» рядом с техникой, Y — оружие (удерж. — другой боец),
//    LB — граната (держать — дуга), ◄ — ракета, RB — поддержка 📡, крестовина ←↑→↓ — способности 1–4, Start — пауза, View — лестница режимов
//    (удерж. — выбор из трёх), L3 — рывок, R3 — удар прикладом (ближний бой).
//  • Командир: левый стик — курсор (у края — сдвиг камеры), правый — поворот/зум, A — идти / применить, X — атаковать цель у курсора,
//    LB/RB — другой отряд, крестовина — способности 1–4, B — отмена / стоять, Y — нырок в шутер.
//  • Стратег: курсор стиком, правый стик — панорама, LT/RT — зум, A — выбрать / подтвердить / приказ (если войска выделены),
//    удерж. A + стик — рамка, B — отмена, X — «Здания», Y — «Войска», LB/RB — группы по кругу, крестовина — фокус по панелям, R3 — вселиться.
//  • Меню, панели уроков, выбор режима: крестовина / левый стик — рамка фокуса, A — нажать, B — назад, ←/→ на ползунке — значение.
//  • Подключение — тост «Геймпад подключён», подсказки клавиш (bk) показывают кнопки Xbox или PS; Настройки → «Геймпад»:
//    мёртвая зона, чувствительность, инверсия Y, доводчик, вибрация, значки. Вибрация на взрывах и попаданиях по тебе.
//  Хуки — обёртки: bk, MENU.resume/html_pause/html_settings/wire, P71M.sec, AIMA.step/lvl. Новый код только здесь. Выкл.: ?gp812=0.
// =====================================================================
const GP812 = {
  on: (() => { try { return new URLSearchParams(location.search).get('gp812') !== '0'; } catch (e){ return true; } })(),
  pad: null, id: '', kind: 'xbox', active: false, b: [], pb: [], ax: [0, 0, 0, 0], tDown: [], last: 0, err: {},
  cur: null, curEl: null, ringEl: null, toastEl: null, focus: null, fsig: null, fRoot: null, fMode: false, rep: { d: -1, t: 0 },
  held: { fire: 0, aim: 0, keys: {}, move: 0 }, aDrag: false, zAcc: 0, lastShake: 0, lastHp: null, rumT: 0, meleeT: 0, snapT: 0, snap: null, longSel: false, yLong: false, lbLong: false,
  stats: { conn: 0, press: 0, clicks: 0, orders: 0, focusMoves: 0, activ: 0, rumble: 0, melee: 0, meleeHit: 0, cmdOrders: 0, cmdAtk: 0, rtsPan: 0, zoom: 0, ladder: 0, look: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('GP812 ' + tag, e); } } },
  L: (ru, en, vi) => tr(ru, en, vi || en, en),
  // ---------------------------------------------------------------- настройки
  dz(){ const v = +SET.gp812dz; return isFinite(v) ? clamp(v, 0.02, 0.5) : 0.15; },
  sens(){ const v = +SET.gp812sens; return isFinite(v) ? clamp(v, 0.3, 3) : 1; },
  ps(){ const g = SET.gp812gl || 'auto'; return g === 'ps' || (g === 'auto' && this.kind === 'ps'); },
  // ---------------------------------------------------------------- значки кнопок
  XB: ['Ⓐ', 'Ⓑ', 'Ⓧ', 'Ⓨ', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', '▲', '▼', '◄', '►'],
  PSG: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', '▲', '▼', '◄', '►'],
  g(i){ return (this.ps() ? this.PSG : this.XB)[i] || '?'; },
  // действие (SET.bind) → кнопка геймпада; null — нет кнопки (оставляем клавишу)
  ACT: { jump: 0, run: 0, down: 1, reload: 2, interact: 2, w1: 3, w2: 3, w3: 3, grenade: 4, sup78: 5, rts: 8, dash: 10, rocket: 14, reflex: 15, strike: 13 },
  glyph(act){
    if (act === 'fwd' || act === 'back' || act === 'left' || act === 'right') return this.L('л. стик', 'L-stick', 'cần trái');
    if (act === 'switch') return this.g(3) + '⏵';
    const i = this.ACT[act]; return i === undefined ? null : this.g(i);
  },
  // ---------------------------------------------------------------- опрос
  read(){
    let P = null;
    try { const L = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of L || []) if (p && p.connected !== false && (p.buttons || []).length){ if (!P || p.mapping === 'standard') P = p; if (p.mapping === 'standard') break; } } catch (e){}
    return P;
  },
  kindOf(id){ if (/xbox|045e|xinput/i.test(id || '')) return 'xbox'; return /054c|playstation|dualsense|dualshock|wireless controller|ps[345]/i.test(id || '') ? 'ps' : 'xbox'; },
  axis(v){ const d = this.dz(); const a = abs(v); return a < d ? 0 : Math.sign(v) * min(1, (a - d) / (1 - d)); },
  stick(x, y){   // радиальная мёртвая зона + кривая
    const d = this.dz(), l = hypot(x, y); if (l < d) return [0, 0];
    const k = min(1, (l - d) / (1 - d)), c = Math.pow(k, 1.6) / l; return [x * c, y * c];
  },
  dn(i){ return this.b[i] && !this.pb[i]; }, up(i){ return !this.b[i] && this.pb[i]; }, hold(i){ return this.b[i] ? (performance.now() - (this.tDown[i] || 0)) / 1000 : 0; },
  poll(){
    const now = performance.now(), dt = min(0.1, max(0.001, (now - (this.last || now)) / 1000)); this.last = now;
    const P = this.read();
    if (!P){ if (this.pad){ this.pad = null; this.toast(this.L('🎮 Геймпад отключён', '🎮 Gamepad disconnected', '🎮 Đã ngắt tay cầm')); this.release(); this.setActive(false); } return; }
    if (P.id !== this.id || !this.pad){ this.id = P.id; this.kind = this.kindOf(P.id); this.stats.conn++; this.toast(this.L('🎮 Геймпад подключён', '🎮 Gamepad connected', '🎮 Đã kết nối tay cầm') + ' · ' + (this.kind === 'ps' ? 'PlayStation' : 'Xbox') + ' · ' + this.g(9) + ' — ' + this.L('пауза', 'pause', 'tạm dừng')); }
    this.pad = P;
    this.pb = this.b; this.b = [];
    for (let i = 0; i < 17; i++){ const B = P.buttons[i]; const v = B ? (typeof B === 'object' ? (B.pressed || B.value > 0.5) : B > 0.5) : false; this.b[i] = !!v; if (v && !this.pb[i]) this.tDown[i] = now; }
    this.trig = [P.buttons[6] ? +(P.buttons[6].value !== undefined ? P.buttons[6].value : P.buttons[6].pressed) : 0, P.buttons[7] ? +(P.buttons[7].value !== undefined ? P.buttons[7].value : P.buttons[7].pressed) : 0];
    const A = P.axes || []; this.ax = [A[0] || 0, A[1] || 0, A[2] || 0, A[3] || 0];
    const any = this.b.some(Boolean) || this.ax.some(v => abs(v) > max(0.3, this.dz() + 0.1));
    if (any && !this.active) this.setActive(true);
    if (!this.active) return;
    if (this.b.some((v, i) => v && !this.pb[i])) this.stats.press++;
    this.frame(dt);
  },
  setActive(v){
    this.active = v; document.body.classList.toggle('gp812', v);
    if (!v){ this.release(); this.unfocus(); }
    if (typeof updateModeUI === 'function' && !S.attract) this.safe(() => updateModeUI(), 'mui');
  },
  // ---------------------------------------------------------------- общий кадр
  ctx(){
    if (typeof V87M !== 'undefined' && V87M.isOpen()) return 'pick';
    if (MENU.isOpen()) return 'menu';
    const fin = document.getElementById('t72fin'); if (fin && fin.style.display === 'flex' && fin.offsetWidth) return 'fin';
    if (S.attract || S.over) return S.over ? 'over' : 'menu';
    if (S.mode === 'fps') return 'fps';
    if (typeof CMD85 !== 'undefined' && CMD85.on) return 'cmd';
    return 'rts';
  },
  frame(dt){
    const c = this.ctx();
    if (c !== 'fps') this.release();
    if (MENU.waitLock && !MENU.isOpen()){ MENU.waitLock = false; S.paused = false; if (typeof AU !== 'undefined') AU.duck(false); }   // без мыши: не ждём захвата указателя
    // общие: Start, View
    if (this.dn(9)){ if (MENU.isOpen()){ if (MENU.cur === 'pause') MENU.resume(); } else if (c !== 'menu' && !S.attract){ this.release(); MENU.pause(); } return; }
    if (c === 'menu' || c === 'pick' || c === 'fin' || c === 'over'){ this.nav(dt, c); this.cursorShow(false); return; }
    if (this.b[8] && !this.longSel && this.hold(8) > 0.5 && typeof V87M !== 'undefined'){ this.longSel = true; V87M.open(document.getElementById('m87') || null); this.focus = null; return; }
    if (this.up(8)){ if (!this.longSel && typeof V87M !== 'undefined'){ this.stats.ladder++; this.release(); V87M.step(1); } this.longSel = false; return; }
    if (this.fMode && c !== 'rts') this.unfocus();
    if (this.fMode){ this.nav(dt, 'hud'); if (this.fMode) { this.cursorShow(c !== 'fps'); return; } }
    if (c === 'fps') this.fps(dt);
    else this.board(dt, c);
    this.fx(dt);
  },
  // ---------------------------------------------------------------- шутер
  key(code, up){ if (!code) return; dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { code, key: code, bubbles: true })); },
  tap(code){ if (!code) return; this.key(code); setTimeout(() => this.key(code, true), 60); },
  setKey(code, v){ if (!code) return; const H = this.held.keys; if (!!H[code] === !!v) return; H[code] = !!v; keys[code] = !!v; },
  release(){
    const H = this.held;
    for (const k in H.keys) if (H.keys[k]){ keys[k] = false; H.keys[k] = false; }
    if (H.fire){ H.fire = 0; if (SET.swapMouse) mouseR = false; else mouseL = false; }
    if (H.aim){ H.aim = 0; if (SET.swapMouse) mouseL = false; else mouseR = false; }
    if (H.move){ H.move = 0; TOUCH.move = [0, 0]; }
    if (H.gren){ H.gren = 0; this.key(SET.bind.grenade, true); }
    if (this.aDrag){ this.aDrag = false; const [x, y] = this.cur || [innerWidth / 2, innerHeight / 2]; window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, button: 0, bubbles: true })); }
  },
  fps(dt){
    const B = this.b, c = ctrlEntity(), inf = c && c.cls === 'inf';
    if (!c || S.paused){ this.release(); return; }
    // ходьба
    const [lx, ly] = this.stick(this.ax[0], this.ax[1]);
    if (lx || ly){ TOUCH.move = [lx, -ly]; this.held.move = 1; } else if (this.held.move){ TOUCH.move = [0, 0]; this.held.move = 0; }
    // обзор
    let [rx, ry] = this.stick(this.ax[2], this.ax[3]);
    if (rx || ry){
      this.turnT = abs(rx) > 0.92 ? (this.turnT || 0) + dt : 0;
      const boost = 1 + 0.7 * smoothstep(0.15, 0.6, this.turnT || 0);   // стик до упора — разворот быстрее
      const rate = 3.1 * this.sens() / (0.0022 * (SET.sens || 1));
      const inv = (SET.gp812inv ? -1 : 1) * (SET.invertY ? -1 : 1);
      lookBy(rx * rate * boost * dt, ry * 0.72 * rate * dt * inv); this.stats.look++;
    } else this.turnT = 0;
    // огонь / прицел (с учётом ЛКМ↔ПКМ)
    const fire = this.trig[1] > 0.35, aim = this.trig[0] > 0.35;
    if (!!this.held.fire !== fire){ this.held.fire = fire ? 1 : 0; if (SET.swapMouse) mouseR = fire; else mouseL = fire; }
    if (!!this.held.aim !== aim){ this.held.aim = aim ? 1 : 0; if (SET.swapMouse) mouseL = aim; else mouseR = aim; }
    // A — ранец/прыжок (пехота), вверх (техника, дрон); B — присед / подкат / вниз
    this.setKey(SET.bind[inf ? 'run' : 'jump'], B[0]);
    this.setKey(SET.bind.down, B[1]);
    // X — использовать рядом с техникой/турелью, иначе перезарядка
    if (this.dn(2)){ const near = !inf || (typeof nearbyInteract === 'function' && nearbyInteract(c)); this.tap(SET.bind[near ? 'interact' : 'reload']); }
    // Y — оружие по кругу, удержание — другой боец
    if (B[3] && !this.yLong && this.hold(3) > 0.5){ this.yLong = true; this.tap(SET.bind.switch); }
    if (this.up(3)){ if (!this.yLong){ if (inf){ const L = ['rifle', 'rail', 'hmg'].filter(w => weaponAvail(w)); const i = L.indexOf(S.kit.w); if (L.length > 1) switchWeapon(L[(i + 1) % L.length]); } else this.tap(SET.bind.reload); } this.yLong = false; }
    // LB — граната: держать — дуга и точка взрыва, отпустить — бросок (как клавиша G)
    if (this.dn(4)){ this.held.gren = 1; this.key(SET.bind.grenade); }
    if (this.up(4) && this.held.gren){ this.held.gren = 0; this.key(SET.bind.grenade, true); }
    // RB — поддержка 📡; крестовина — способности 1–4 (или вызовы поддержки, пока открыта панель)
    if (this.dn(5)) this.tap(SET.bind.sup78 || 'Digit4');
    const D = [14, 12, 15, 13];   // ← ↑ → ↓ = 1 2 3 4
    for (let k = 0; k < 4; k++) if (this.dn(D[k])){
      if (typeof S78 !== 'undefined' && S78.open) this.tap('Digit' + (k + 1));
      else this.tap(SET.bind[['rocket', 'grenade', 'reflex', 'strike'][k]]);
    }
    if (this.dn(10)) this.tap(SET.bind.dash || 'KeyZ');
    if (this.dn(11)) this.melee();
  },
  // R3 — удар прикладом: ближайший враг в 3.2 м перед бойцом
  melee(){
    const me = ctrlEntity(); if (!me || me.cls !== 'inf' || S.time < this.meleeT) return false;
    this.meleeT = S.time + 0.75; this.stats.melee++;
    let best = null, bd = 3.2;
    const eye = me.pos, f = me.fwd;
    for (const L of [S.units, S.builders || [], S.fauna86 || []]) for (const e of L){
      if (!e || !e.alive || e.team === me.team || e === me || !e.pos) continue;
      const v = sub(e.pos, eye), d = len(v); if (d > bd || d < 0.01) continue;
      if (dot(v, f) / d < 0.45) continue;
      best = e; bd = d;
    }
    if (me.vel) me.vel = add(me.vel, mul(tangent(f, me.up), 3));
    if (typeof CAMFX !== 'undefined' && S.shake !== undefined) S.shake = max(S.shake, 0.18);
    if (!best){ feed(this.L('Удар прикладом — мимо', 'Rifle butt — miss', 'Báng súng — trượt'), '#aab'); return false; }
    damage(best, best.cls === 'inf' ? 75 : 40, me, 'b');
    this.stats.meleeHit++;
    this.rumble(0.6, 0.4, 140);
    try { if (typeof fxSmoke === 'function') fxSmoke(add(centerOf(best), mul(f, -0.3)), 0.35, true); } catch (e){}
    emit('ui', { kind: 'ok' });
    feed(this.L('Удар прикладом!', 'Rifle butt strike!', 'Đập báng súng!'), '#ffd27a');
    return true;
  },
  // ---------------------------------------------------------------- курсор (Стратег, Командир)
  scale(){ return clamp(min(innerWidth, innerHeight) / 720, 0.6, 2); },
  cursorShow(v){
    let el = this.curEl;
    if (!el && v){ el = this.curEl = document.createElement('div'); el.id = 'gp812cur'; el.innerHTML = '<i></i><b></b>'; document.body.appendChild(el); }
    if (!el) return;
    if (!v){ if (el.style.display !== 'none') el.style.display = 'none'; return; }
    if (!this.cur) this.cur = [innerWidth / 2, innerHeight / 2];
    this.cur[0] = clamp(this.cur[0], 2, innerWidth - 2); this.cur[1] = clamp(this.cur[1], 2, innerHeight - 2);
    el.style.display = 'block'; el.style.transform = `translate(${Math.round(this.cur[0])}px,${Math.round(this.cur[1])}px)`;
    const sn = this.snap; el.className = sn ? (sn.e.team === 0 ? 'own' : 'foe') : '';
  },
  // ближайший объект к курсору на экране (для приказов с геймпада курсор «прилипает»)
  snapAt(x, y, foe){
    let best = null, bd = 34 * this.scale();
    const test = (e, p) => { if (!p || !facing(p)) return; const s = project(p); if (!s) return; const d = hypot(s[0] - x, s[1] - y); if (d < bd){ bd = d; best = { e, x: s[0], y: s[1] }; } };
    for (const L of [S.units, S.vehicles, S.drones, S.builders]) for (const e of L) if (e.alive && (foe ? e.team === 1 && e.seen && e.seen[0] > 0 : e.team === 0)) test(e, e.cls === 'inf' ? centerOf(e) : e.pos);
    if (foe) for (const b of S.buildings) if (b.alive && b.team === 1 && b.seen && b.seen[0] > 0) test(b, b.pos);
    return best;
  },
  moveCursor(dt){
    const [lx, ly] = this.stick(this.ax[0], this.ax[1]);
    if (!this.cur) this.cur = [innerWidth / 2, innerHeight / 2];
    const sp = 820 * this.scale() * (this.b[10] ? 1.8 : 1);
    if (lx || ly){ this.cur[0] += lx * sp * dt; this.cur[1] += ly * sp * dt; this.hover(); }
    const m = 34 * this.scale();
    // у края экрана — сдвиг камеры (стик толкает дальше)
    const eu = this.cur[1] < m && ly < 0 ? -ly : this.cur[1] > innerHeight - m && ly > 0 ? -ly : 0;
    const el = this.cur[0] < m && lx < 0 ? lx : this.cur[0] > innerWidth - m && lx > 0 ? lx : 0;
    this.cur[0] = clamp(this.cur[0], 2, innerWidth - 2); this.cur[1] = clamp(this.cur[1], 2, innerHeight - 2);
    this.snapT -= dt; if (this.snapT <= 0){ this.snapT = 0.1; this.snap = this.snapAt(this.cur[0], this.cur[1], true) || this.snapAt(this.cur[0], this.cur[1], false); }
    return [eu, el];
  },
  hover(){
    const [x, y] = this.cur; const t = document.elementFromPoint(x, y) || canvas;
    t.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
    if (typeof RCAM !== 'undefined'){ RCAM.mouseIn = false; }   // край экрана двигает только геймпад (см. moveCursor)
  },
  uiAt(x, y){ const t = document.elementFromPoint(x, y); return t && t !== canvas && t !== document.body && t !== document.documentElement && !t.closest('#gp812cur') ? t : null; },
  activate(el){
    if (!el) return false;
    this.stats.activ++;
    const r = el.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
    if (el.tagName === 'INPUT' && (el.type === 'range')) return true;
    if (el.closest('#g80')){ const o = { clientX: x, clientY: y, bubbles: true, pointerId: 77, isPrimary: true, button: 0 }; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); return true; }
    if (el.tagName === 'SELECT'){ el.selectedIndex = (el.selectedIndex + 1) % max(1, el.options.length); el.dispatchEvent(new Event('change', { bubbles: true })); return true; }
    if (typeof el.focus === 'function' && el.tagName === 'INPUT' && el.type === 'text'){ el.focus(); return true; }
    el.click();
    return true;
  },
  board(dt, c){
    const B = this.b, cmd = c === 'cmd', R = S.rts;
    this.cursorShow(true);
    const [eu, el] = this.moveCursor(dt);
    let [x, y] = this.cur;
    if (S.paused){ return; }
    const [rx, ry] = this.stick(this.ax[2], this.ax[3]);
    if (cmd){
      const C = CMD85;
      if (eu || el){ const f = tangent(R.fwd, R.dir), r = norm(cross(f, R.dir)); C.pan = add(C.pan, mul(add(mul(norm(f), eu), mul(r, el)), dt * 45)); const l = len(C.pan); if (l > 70) C.pan = mul(C.pan, 70 / l); }
      if (rx) R.fwd = tangent(rotAxis(R.fwd, R.dir, rx * dt * 1.6), R.dir);
      this.zAcc += (ry + (this.trig[0] - this.trig[1])) * dt * 5;
      if (abs(this.zAcc) >= 1){ C.zoom(Math.sign(this.zAcc)); this.zAcc = 0; this.stats.zoom++; }
      if (this.dn(0)){ const u = this.uiAt(x, y); if (u) this.activate(u); else { const s = this.snap && !C.aim ? this.snap : null; C.click(s ? s.x : x, s ? s.y : y, 0); this.stats.cmdOrders++; } }
      if (this.dn(2)){ const s = this.snapAt(x, y, true); if (s){ C.order(s.x, s.y); this.stats.cmdAtk++; feed(this.L('Атаковать цель', 'Attack the target', 'Tấn công mục tiêu'), '#ff9a80'); } else { C.order(x, y); feed(this.L('Нет врага у курсора — идём с боем', 'No enemy at the cursor — attack-move', 'Không có địch — tiến công'), '#cfe3ff'); } }
      if (this.dn(1)){ if (C.aim){ C.aim = null; C.ui(true); } else if (C.g){ setOrder(C.g, 'hold', C.anchor(C.g), { by: 'player', lock: 300 }); feed(C.L('Стоять: удерживать позицию', 'Hold position'), '#9cf'); } }
      if (this.dn(3)) C.dive();
      if (this.dn(4)) C.cycle(-1); if (this.dn(5)) C.cycle(1);
      const D = [14, 12, 15, 13]; for (let k = 0; k < 4; k++) if (this.dn(D[k])) C.press(k);
      if (this.dn(10)) C.pan = [0, 0, 0];
      return;
    }
    // ---- Стратег
    if (eu || el || rx || ry){
      const vu = eu || -ry, vr = el || rx;
      if (S.camFly || R.goal){ S.camFly = null; R.goal = null; }
      RCAM.anc = null;
      const speed = (30 + R.h * 1.1) / RM; rtsPan(vu * speed * dt, vr * speed * dt); this.stats.rtsPan++;
    }
    const z = this.trig[0] - this.trig[1];
    if (abs(z) > 0.12){ rtsZoomN(z * dt * 7, x, y); this.stats.zoom++; }
    if (this.dn(0)){
      const u = this.uiAt(x, y);
      if (u) this.activate(u);
      else if (S.place || S.cast){ canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, bubbles: true })); window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, button: 0, bubbles: true })); }
      else {
        const own = pickEntity(x, y, false), foe = this.snapAt(x, y, true);
        if (selGroups().length && (!own || own.team !== 0) && !minimapDir(x, y)){ const s = foe || { x, y }; orderAt(s.x, s.y, false); this.stats.orders++; }
        else { const s = own ? null : this.snap && this.snap.e.team === 0 ? this.snap : null; if (s){ x = s.x; y = s.y; } canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, bubbles: true })); this.aDrag = true; this.stats.clicks++; }
      }
    }
    if (this.aDrag && this.up(0)){ this.aDrag = false; window.dispatchEvent(new MouseEvent('mouseup', { clientX: this.cur[0], clientY: this.cur[1], button: 0, bubbles: true })); }
    if (this.dn(1)){ if ((typeof UIX !== 'undefined' && UIX.pop) || S.place || S.cast || S.sel.size || S.selB) this.key('Escape'); }
    if (this.dn(2) || this.dn(3)) this.sideTab(this.dn(2) ? 'build' : 'units');
    if (this.dn(4) || this.dn(5)) this.cycleGroup(this.dn(4) ? -1 : 1);
    if (this.dn(11) && typeof V87M !== 'undefined') V87M.poss();
    if (this.dn(12) || this.dn(13) || this.dn(14) || this.dn(15)){ this.enterFocus(document.body); }
  },
  sideTab(t){
    if (typeof SIDE === 'undefined') return;
    const side = document.getElementById('side');
    SIDE.tab = t; this.safe(() => buildSidebar(), 'side'); emit('ui', { kind: 'ok' });
    const m74 = document.getElementById('m74B');   // телефон / планшет, простая стратегия: панель «что строить / производить»
    if (side && side.offsetWidth) this.enterFocus(side, side.querySelector('.items .item'));
    else if (m74 && m74.offsetWidth) this.enterFocus(m74, m74.querySelector('.it'));
    else this.enterFocus(document.body);
  },
  cycleGroup(d){
    const L = groupsOf(0).filter(g => g.cls !== 'builder' && groupAlive(g)).sort((a, b) => (a.id || 0) - (b.id || 0)); if (!L.length) return;
    const cur = selGroups()[0]; let i = L.indexOf(cur); i = i < 0 ? (d > 0 ? 0 : L.length - 1) : (i + d + L.length) % L.length;
    S.sel.clear(); S.selB = null; S.sel.add(L[i]);
    const p = leaderPos(L[i]); if (p) flyCamTo(p);
    feed(groupLabel(L[i]), '#9cf'); emit('ui', { kind: 'ok' });
  },
  // ---------------------------------------------------------------- фокус по кнопкам (меню, панели)
  SEL: 'button,input,select,a[href],[data-g80],[data-t72go],[data-tab],.item,[data-m87],#m74B [data-j]',
  vis(e){
    if (e.disabled || e.closest('#gp812cur,#gp812ring')) return false;
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth){ const sc = e.closest('.mcol,.p71body,.items,#screen'); if (!sc) return false; }
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < 0.1 || cs.pointerEvents === 'none') return false;
    if (!e.offsetParent && cs.position !== 'fixed') return false;
    return true;
  },
  rootOf(c){
    if (c === 'pick') return V87M.pk;
    if (c === 'fin') return document.getElementById('t72fin');
    if (c === 'menu' || c === 'over') return document.getElementById('screen');
    return this.fRoot || document.body;
  },
  cands(root){
    if (!root) return [];
    const L = [...root.querySelectorAll(this.SEL)].filter(e => this.vis(e) && !(e.parentElement && e.parentElement.closest(this.SEL) && e.parentElement.closest(this.SEL) !== root));
    return L.filter(e => !(root === document.body && (e.closest('#screen') || e.closest('#touch .tf.fps'))));
  },
  sig(e){ return { id: e.id, ds: JSON.stringify(e.dataset || {}), tx: (e.textContent || '').trim().slice(0, 40), r: e.getBoundingClientRect() }; },
  setFocus(e){
    this.focus = e; this.fsig = e ? this.sig(e) : null;
    if (e){ try { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_){} this.stats.focusMoves++; }
    this.ring();
  },
  enterFocus(root, first){
    this.fMode = true; this.fRoot = root; this.release();
    const L = this.cands(root);
    this.setFocus(first && L.includes(first) ? first : this.pickFirst(L));
  },
  unfocus(){ this.fMode = false; this.fRoot = null; this.focus = null; this.fsig = null; this.ring(); },
  pickFirst(L){
    if (!L.length) return null;
    const top = (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    const pref = L.filter(e => /(^|\s)(big|pri)(\s|$)/.test(e.className) && e.tagName === 'BUTTON').sort(top)[0] || L.filter(e => e.dataset && e.dataset.m87 && /(^|\s)cur(\s|$)/.test(e.className))[0];
    return pref || L.slice().sort((a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return (A.top - B.top) * 3 + (A.left - B.left) * 0.2; })[0];
  },
  // фокус «потерялся» (меню перерисовалось) — тот же элемент по признакам или ближайший к старому месту
  reacquire(L){
    const f = this.fsig; if (!f) return this.pickFirst(L);
    let m = L.find(e => f.id && e.id === f.id) || L.find(e => JSON.stringify(e.dataset || {}) === f.ds && f.ds !== '{}' && (e.textContent || '').trim().slice(0, 40) === f.tx) || L.find(e => JSON.stringify(e.dataset || {}) === f.ds && f.ds !== '{}');
    if (m) return m;
    const cx = (f.r.left + f.r.right) / 2, cy = (f.r.top + f.r.bottom) / 2; let bd = 1e9;
    for (const e of L){ const r = e.getBoundingClientRect(), d = hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy); if (d < bd){ bd = d; m = e; } }
    return m;
  },
  move(dir, L){
    const f = this.focus; if (!f){ this.setFocus(this.pickFirst(L)); return; }
    const r = f.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const [dx, dy] = [[-1, 0], [0, -1], [1, 0], [0, 1]][dir];
    let best = null, bs = 1e9;
    for (const e of L){
      if (e === f) continue;
      const q = e.getBoundingClientRect(), ex = (q.left + q.right) / 2, ey = (q.top + q.bottom) / 2;
      // расстояние между краями по направлению (чтобы широкие кнопки рядом считались «рядом»)
      const along = dx ? (dx > 0 ? q.left - r.right : r.left - q.right) : (dy > 0 ? q.top - r.bottom : r.top - q.bottom);
      const cAlong = dx ? (ex - cx) * dx : (ey - cy) * dy;
      if (cAlong <= 2 || along < -8) continue;
      const ov = dx ? max(0, min(r.bottom, q.bottom) - max(r.top, q.top)) : max(0, min(r.right, q.right) - max(r.left, q.left));
      const perp = ov > 0 ? 0 : (dx ? min(abs(q.top - r.bottom), abs(r.top - q.bottom)) : min(abs(q.left - r.right), abs(r.left - q.right)));
      const s = max(0, along) + perp * 2.5 + (ov > 0 ? 0 : 40);
      if (s < bs){ bs = s; best = e; }
    }
    if (best){ this.setFocus(best); emit('ui', { kind: 'tick' }); }
  },
  slide(e, d){
    const st = +e.step || 1, v = clamp(+e.value + d * st, +e.min, +e.max); e.value = v;
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
  },
  nav(dt, c){
    const root = this.rootOf(c); if (!root){ this.unfocus(); return; }
    const L = this.cands(root);
    const scr = c + ':' + (MENU.cur || '') + ':' + (root.id || '');
    if (scr !== this.lastScr){ this.lastScr = scr; if (c !== 'hud') this.setFocus(this.pickFirst(L)); }
    if (!this.focus || !this.focus.isConnected || !L.includes(this.focus)) this.setFocus(this.reacquire(L)); else this.ring();
    // направление: крестовина или левый стик (с автоповтором)
    const [lx, ly] = this.stick(this.ax[0], this.ax[1]);
    let d = this.b[14] ? 0 : this.b[12] ? 1 : this.b[15] ? 2 : this.b[13] ? 3 : -1;
    if (d < 0 && c !== 'hud' && hypot(lx, ly) > 0.5) d = abs(lx) > abs(ly) ? (lx < 0 ? 0 : 2) : (ly < 0 ? 1 : 3);
    const now = performance.now();
    if (d >= 0){
      if (d !== this.rep.d){ this.rep = { d, t: now + 380 }; this.step(d, L); }
      else if (now > this.rep.t){ this.rep.t = now + 120; this.step(d, L); }
    } else this.rep.d = -1;
    if (this.dn(0) && this.focus){ const f = this.focus; this.activate(f); emit('ui', { kind: 'ok' }); if (c === 'hud' && !f.closest('#side')) this.unfocus(); }
    if (this.dn(1)){
      if (c === 'pick') V87M.close();
      else if (c === 'menu'){ if (MENU.cur === 'pause') MENU.resume(); else if (MENU.cur !== 'main') this.key('Escape'); }
      else this.unfocus();
    }
    if (c === 'hud' && (this.dn(4) || this.dn(5)) && this.fRoot && this.fRoot.id === 'side'){ const T = ['build', 'units', 'tech', 'cmd'], i = T.indexOf(SIDE.tab); this.sideTab(T[(i + (this.dn(4) ? 3 : 1)) % 4]); }
    if (c === 'hud' && hypot(lx, ly) > 0.6) this.unfocus();   // стик — снова курсор
  },
  step(d, L){
    const f = this.focus;
    if (f && f.tagName === 'INPUT' && f.type === 'range' && (d === 0 || d === 2)){ this.slide(f, d === 0 ? -1 : 1); return; }
    this.move(d, L);
  },
  ring(){
    let el = this.ringEl;
    const f = this.focus && this.focus.isConnected ? this.focus : null;
    if (!el && f){ el = this.ringEl = document.createElement('div'); el.id = 'gp812ring'; document.body.appendChild(el); }
    if (!el) return;
    if (!f){ el.style.display = 'none'; return; }
    const r = f.getBoundingClientRect();
    el.style.display = 'block'; el.style.left = (r.left - 3) + 'px'; el.style.top = (r.top - 3) + 'px'; el.style.width = (r.width + 6) + 'px'; el.style.height = (r.height + 6) + 'px';
  },
  // ---------------------------------------------------------------- вибрация
  rumble(strong, weak, ms){
    if (SET.gp812rum === false || !this.pad) return false;
    const now = performance.now(); if (now < this.rumT) return false; this.rumT = now + 60;
    const P = this.pad, a = P.vibrationActuator; this.stats.rumble++;
    try {
      if (a && a.playEffect){ const r = a.playEffect(a.type || 'dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: clamp(weak, 0, 1), strongMagnitude: clamp(strong, 0, 1) }); if (r && r.catch) r.catch(() => {}); return true; }
      if (P.hapticActuators && P.hapticActuators[0] && P.hapticActuators[0].pulse){ P.hapticActuators[0].pulse(clamp(strong, 0, 1), ms); return true; }
    } catch (e){}
    return false;
  },
  fx(dt){
    if (S.attract || S.paused) return;
    const sh = S.shake || 0;
    if (S.mode === 'fps' && sh > this.lastShake + 0.06) this.rumble(min(1, sh * 0.9), min(1, sh * 0.6), 90 + 220 * min(1, sh));
    this.lastShake = sh;
    const me = ctrlEntity();
    if (me && S.mode === 'fps' && me.hp !== undefined){
      if (this.lastHp !== null && this.lastMe === me && me.hp < this.lastHp - 0.5){ const k = (this.lastHp - me.hp) / max(1, me.maxhp || 100); this.rumble(min(1, 0.25 + k * 2), min(1, 0.35 + k), 80 + min(160, k * 600)); }
      this.lastHp = me.hp; this.lastMe = me;
    } else this.lastHp = null;
  },
  // ---------------------------------------------------------------- тост
  toast(t){
    let el = this.toastEl; if (!el){ el = this.toastEl = document.createElement('div'); el.id = 'gp812toast'; document.body.appendChild(el); }
    el.textContent = t; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => el.classList.remove('on'), 3200);
  },
  // ---------------------------------------------------------------- карта управления (страница «Геймпад»)
  MAP(){
    const g = i => `<kbd>${this.g(i)}</kbd>`, L = this.L;
    return [
      [L('Шутер', 'Shooter', 'Bắn súng'), [
        [L('л. стик / п. стик', 'L-stick / R-stick', 'cần trái / phải'), L('ходьба / обзор (доводчик)', 'move / look (aim assist)', 'đi / nhìn')], [g(7) + ' ' + g(6), L('огонь · прицел', 'fire · aim', 'bắn · ngắm')],
        [g(0) + ' ' + g(1), L('ранец (удерж.) · присед/подкат', 'jetpack (hold) · crouch/slide', 'phản lực · cúi/trượt')], [g(2) + ' ' + g(3), L('перезарядка/использовать · оружие (удерж. — боец)', 'reload/use · weapon (hold — trooper)', 'nạp/dùng · súng')],
        [g(4) + ' ' + g(5), L('граната (держать — дуга, отпустить — бросок) · поддержка 📡', 'grenade (hold — arc, release — throw) · support 📡', 'lựu đạn · hỗ trợ')], ['◄ ▲ ► ▼', L('способности 1–4: ракета (базука), граната, рефлекс, артудар; при открытой 📡 — вызовы 1–4', 'abilities 1–4: rocket (bazooka), grenade, reflex, strike; with 📡 open — calls 1–4', 'kỹ năng 1–4')],
        [g(10) + ' ' + g(11), L('рывок · удар прикладом', 'dash · melee', 'lướt · cận chiến')]]],
      [L('Командир', 'Commander', 'Chỉ huy'), [
        [L('л. стик', 'L-stick', 'cần trái'), L('курсор, у края — камера', 'cursor, at the edge — camera', 'con trỏ')], [L('п. стик', 'R-stick', 'cần phải') + ' ' + g(6) + g(7), L('поворот · зум', 'rotate · zoom', 'xoay · zoom')],
        [g(0) + ' ' + g(2), L('идти / применить · атаковать цель', 'move / cast · attack target', 'đi · tấn công')], [g(4) + ' ' + g(5), L('другой отряд', 'other squad', 'đội khác')],
        ['◄ ▲ ► ▼', L('способности 1–4', 'abilities 1–4', 'kỹ năng 1–4')], [g(1) + ' ' + g(3), L('отмена / стоять · нырок в шутер', 'cancel / hold · dive into shooter', 'hủy · nhập vai')]]],
      [L('Стратег', 'Strategist', 'Chiến lược'), [
        [L('л. стик', 'L-stick', 'cần trái'), L('курсор (удерж. ' + this.g(0) + ' — рамка)', 'cursor (hold ' + this.g(0) + ' — box)', 'con trỏ')], [L('п. стик', 'R-stick', 'cần phải') + ' ' + g(6) + g(7), L('панорама · зум', 'pan · zoom', 'kéo · zoom')],
        [g(0) + ' ' + g(1), L('выбрать / подтвердить / приказ · отмена', 'select / confirm / order · cancel', 'chọn · hủy')], [g(2) + ' ' + g(3), L('здания · войска (крестовина и ' + this.g(0) + ' по панели)', 'build · units (D-pad and ' + this.g(0) + ' in the panel)', 'xây · quân')],
        [g(4) + ' ' + g(5), L('группы по кругу', 'cycle groups', 'nhóm')], [g(11) + ' ◄▲►▼', L('вселиться · фокус по панелям', 'possess · focus the panels', 'nhập · bảng')]]],
      [L('Везде', 'Everywhere', 'Mọi nơi'), [[g(9), L('пауза / продолжить', 'pause / resume', 'tạm dừng')], [g(8), L('режим: Стратег → Командир → Шутер (удерж. — выбор)', 'mode: Strategist → Commander → Shooter (hold — pick)', 'chế độ')], ['◄▲►▼ ' + g(0) + ' ' + g(1), L('меню: выбор · нажать · назад', 'menus: move · press · back', 'menu')]]],
    ];
  },
  html(){
    const L = this.L, P = this.pad;
    const tog = k => `<button class="tog ${SET[k] ? 'on' : ''}" data-tog="${k}">${SET[k] ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</button>`;
    const sl = (k, a, b, st) => `<input type="range" data-sl="${k}" min="${a}" max="${b}" step="${st}" value="${SET[k]}"><span class="val" id="v_${k}">${SET[k]}</span>`;
    const ch = (k, opts) => `<span class="chs">${opts.map(([v, n]) => `<button class="${SET[k] === v ? 'cur' : ''}" data-ch="${k}" data-v="${v}">${n}</button>`).join('')}</span>`;
    const row = (l, c) => `<div class="row"><label>${l}</label>${c}</div>`;
    const map = this.MAP().map(([h, rows]) => `<h4>${h}</h4><table class="gp812map">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`).join('');
    return `<div class="mcol wide gp812page"><h2>🎮 ${L('ГЕЙМПАД', 'GAMEPAD', 'TAY CẦM')}</h2>
      <p class="sub">${P ? L('Подключён: ', 'Connected: ', 'Đã kết nối: ') + uixEsc(String(P.id).slice(0, 60)) : L('Геймпад не найден — подключи и нажми любую кнопку', 'No gamepad — connect one and press any button', 'Chưa có tay cầm — kết nối và nhấn nút bất kỳ')}</p>
      <div class="cols"><div>
      ${row(L('Мёртвая зона стиков', 'Stick dead zone', 'Vùng chết'), sl('gp812dz', 0.05, 0.4, 0.01))}
      ${row(L('Чувствительность обзора', 'Look sensitivity', 'Độ nhạy'), sl('gp812sens', 0.3, 3, 0.05))}
      ${row(L('Инверсия Y (геймпад)', 'Invert Y (gamepad)', 'Đảo trục Y'), tog('gp812inv'))}
      ${row(L('Доводчик прицела (как на телефоне)', 'Aim assist (like on phones)', 'Hỗ trợ ngắm'), tog('gp812aa'))}
      ${row(L('Вибрация (взрывы, попадания)', 'Rumble (explosions, hits)', 'Rung'), tog('gp812rum'))}
      ${row(L('Значки кнопок', 'Button glyphs', 'Biểu tượng nút'), ch('gp812gl', [['auto', L('авто', 'auto', 'tự động')], ['xbox', 'Xbox'], ['ps', 'PlayStation']]))}
      <p class="note">${L('Переназначение кнопок — в следующей версии. Клавиатура, мышь и сенсор работают как раньше; подсказки переключаются на геймпад сами, когда ты им пользуешься.', 'Button remapping comes in a later version. Keyboard, mouse and touch work as before; hints switch to the gamepad by themselves while you use it.', 'Đổi nút sẽ có sau.')}</p>
      </div><div>${map}</div></div>
      ${MENU.btn('back', '‹ ' + tr('Назад', 'Back', 'Quay lại'))}</div>`;
  },
};
// ---------------------------------------------------------------- настройки по умолчанию
for (const [k, v] of [['gp812dz', 0.15], ['gp812sens', 1], ['gp812inv', false], ['gp812rum', true], ['gp812aa', true], ['gp812gl', 'auto']]) if (SET[k] === undefined) SET[k] = v;
// ---------------------------------------------------------------- хуки
if (GP812.on){
  // подсказки клавиш → кнопки геймпада, пока играешь с него
  { const bk0 = bk; bk = function(act){ if (GP812.active){ const g = GP812.safe(() => GP812.glyph(act), 'glyph'); if (g) return g; } return bk0.apply(this, arguments); }; }
  // продолжить без захвата мыши
  { const r0 = MENU.resume; MENU.resume = function(){ const r = r0.apply(this, arguments); if (GP812.active && this.waitLock){ this.waitLock = false; S.paused = false; } return r; }; }
  // доводчик: с геймпада — как на телефоне (шире конус, сильнее притяжение)
  if (typeof AIMA !== 'undefined'){
    const st0 = AIMA.step, lv0 = AIMA.lvl;
    AIMA.lvl = function(){ if (GP812.active && !TOUCH.on && (SET.aimAssist === undefined || SET.aimAssist === null || SET.aimAssist < 0)) return SET.gp812aa === false ? 0 : 3; return lv0.apply(this, arguments); };
    AIMA.step = function(rdt){ if (!GP812.active || TOUCH.on || SET.gp812aa === false) return st0.apply(this, arguments); TOUCH.on = true; try { return st0.apply(this, arguments); } finally { TOUCH.on = false; } };
  }
  // страница «Геймпад» в меню
  MENU.html_gp812 = function(){ return GP812.html(); };
  { const hp0 = MENU.html_pause; MENU.html_pause = function(){ const h = hp0.apply(this, arguments); const add = this.btn('gp812', '🎮 ' + GP812.L('Геймпад', 'Gamepad', 'Tay cầm')); const i = h.indexOf('<button id="m_controls"'); return i >= 0 ? h.slice(0, i) + add + h.slice(i) : h; }; }
  { const hs0 = MENU.html_settings; MENU.html_settings = function(){ const h = hs0.apply(this, arguments); const add = `<div class="row"><label>🎮 ${GP812.L('Геймпад: мёртвая зона, чувствительность, вибрация, кнопки', 'Gamepad: dead zone, sensitivity, rumble, buttons', 'Tay cầm')}</label>${this.btn('gp812', GP812.L('Открыть', 'Open', 'Mở'))}</div>`;
    const i = h.indexOf('<h4>', h.indexOf('<h4>') + 4); return i >= 0 ? h.slice(0, i) + add + h.slice(i) : h + add; }; }
  { const w0 = MENU.wire; MENU.wire = function(name){ const r = w0.apply(this, arguments); const b = $('m_gp812'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); this.show('gp812', true); }; return r; }; }
  if (typeof P71M !== 'undefined' && P71M.sec){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_game') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + `<button class="p71o" id="m_gp812"><span>🎮 ${GP812.L('Геймпад', 'Gamepad', 'Tay cầm')}</span><b>›</b></button>`); return h; }; }
  // реальная клавиатура / мышь / палец — подсказки снова клавиатурные
  const off = e => { if (e.isTrusted && GP812.active && (e.type !== 'mousemove' || abs(e.movementX) + abs(e.movementY) > 3)) GP812.setActive(false); };
  for (const ev of ['keydown', 'mousedown', 'mousemove', 'touchstart']) addEventListener(ev, off, { capture: true, passive: true });
  addEventListener('gamepadconnected', e => { GP812.safe(() => { if (!GP812.pad) GP812.poll(); }, 'conn'); });
  const loop = () => { GP812.safe(() => GP812.poll(), 'poll'); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  // стили
  const st = document.createElement('style'); st.id = 'gp812css'; st.textContent = `
  #gp812cur{position:fixed;left:0;top:0;z-index:9990;pointer-events:none;display:none;will-change:transform}
  #gp812cur i{position:absolute;left:-15px;top:-15px;width:26px;height:26px;border-radius:50%;border:2px solid #ffd27a;box-shadow:0 0 0 1px rgba(0,0,0,.7),0 0 10px rgba(255,210,122,.45)}
  #gp812cur b{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#ffd27a;box-shadow:0 0 0 1px #000}
  #gp812cur.foe i{border-color:#ff6a50;box-shadow:0 0 0 1px #000,0 0 12px rgba(255,90,60,.7)} #gp812cur.own i{border-color:#7fe08a}
  #gp812ring{position:fixed;z-index:9991;pointer-events:none;display:none;border:2px solid #ffd27a;border-radius:9px;box-shadow:0 0 0 2px rgba(0,0,0,.6),0 0 14px rgba(255,210,122,.6);transition:left .08s,top .08s,width .08s,height .08s}
  #gp812toast{position:fixed;left:50%;top:14px;transform:translate(-50%,-30px);z-index:9992;pointer-events:none;opacity:0;transition:opacity .3s,transform .3s;
    background:rgba(8,12,18,.92);border:1px solid rgba(255,210,122,.55);color:#ffe6b0;font:600 13px "Exo 2",sans-serif;padding:7px 14px;border-radius:9px;white-space:nowrap}
  #gp812toast.on{opacity:1;transform:translate(-50%,0)}
  body.gp812 #clicklock{display:none!important}
  body.gp812.touch #touch .tf, body.gp812.touch #tjoy{visibility:hidden}
  .gp812page .gp812map{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:4px} .gp812page .gp812map td{padding:2px 6px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top}
  .gp812page .gp812map td:first-child{white-space:nowrap;color:#ffd27a;width:1%} .gp812page kbd{font:700 11px "Exo 2";padding:0 4px;border-radius:3px;background:rgba(255,255,255,.1);color:#ffd27a}
  `; document.head.appendChild(st);
}
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.12'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.12'; }
