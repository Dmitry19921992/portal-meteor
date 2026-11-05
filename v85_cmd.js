// =====================================================================
//  v8.5 — ТРЕТИЙ РЕЖИМ «КОМАНДИР» (RTT, как Dawn of War 2 / Company of Heroes): «Стратег» ⇄ «Командир» ⇄ «Шутер».
//  • Вход/выход: P (ПК) или кнопка «⌖ Командир» рядом с переключателем «Стратегия» / «Вселиться». На телефоне — опция
//    (Настройки → «Режим «Командир» на телефоне»), тогда кнопка ⌖ слева от ☰.
//  • Камера: наклонная, 27 м над своим отрядом, следует за ним; Q/E, средняя кнопка, колесо (палец: тянуть — поворот, щипок — зум).
//    WASD — сдвинуть взгляд, Пробел — к отряду. Колесо до упора «внутрь» — плавно в бойца от третьего лица.
//  • ЛКМ/тап по земле — идти строем (2× — бегом), по врагу — атаковать, по своему другому отряду — переключиться,
//    2× по бойцу текущего отряда — «нырок» в шутер (эффект вселения v6). Выход из шутера (Tab) — снова «Командир» над отрядом.
//  • 4 способности (1–4, кнопки, перезарядка): штурмовой отряд — дым, фланговый рывок, подавление, медик (у Роя — всплеск
//    регенерации); десант — дым, залп гранат, ПТ-ракета, мини-барьер (у Роя — рывок на ранцах); одиночка — дым, рывок, ПТ-ракета, медик.
//    Техника «под командованием» — её собственные способности (залп, дым, форсаж, таран, способности новой техники).
//  • Карточки отрядов слева (клик/тап, Tab / Shift+Tab, средняя кнопка по отряду на карте); прежний отряд продолжает
//    последний приказ (ручной режим 5 мин). Отряд погиб — автопереход к ближайшему к бою.
//  Новый код только здесь; хуки — обёртки: updateRTSCamera, rtsTilt, rtsKey, enterRTS, drawRTSOverlay, uixModeRender, uixFrame, update.
// =====================================================================
const AB85 = {
  smoke:    { ic: '☁', cd: 28, tgt: 'pt', r: 45, n: ['Дымовые гранаты', 'Smoke grenades'], d: ['Завеса в точке на 14 с — враги не видят сквозь неё.', 'A screen at a point for 14 s — enemies cannot see through.'] },
  sprint:   { ic: '»', cd: 24, tgt: 'pt', r: 95, n: ['Фланговый рывок', 'Flank sprint'], d: ['Бегом в точку ×1.6 скорости, не ввязываясь в бой (7 с).', 'Run to a point at ×1.6 speed without stopping to fight (7 s).'] },
  suppress: { ic: '≋', cd: 26, tgt: 'pt', r: 70, n: ['Огонь на подавление', 'Suppressing fire'], d: ['Шквал по площади 14 м: враги замедлены и мажут (7 с).', 'Saturating fire on a 14 m area: enemies slowed and missing (7 s).'] },
  medic:    { ic: '✚', cd: 35, tgt: 'none', n: ['Полевой медик', 'Field medic'], d: ['Сразу +20 % прочности всем, потом ремонт ещё 4 с.', '+20% hull to all at once, then 4 s of repair.'] },
  regen:    { ic: '✺', cd: 32, tgt: 'none', n: ['Всплеск регенерации', 'Regen burst'], d: ['Рой: 8 с быстрой регенерации всего отряда.', 'Swarm: 8 s of fast regeneration for the whole squad.'] },
  volley:   { ic: '✹', cd: 24, tgt: 'pt', r: 42, n: ['Залп гранат', 'Grenade volley'], d: ['Каждый боец бросает гранату в точку.', 'Every trooper throws a grenade at the point.'] },
  at:       { ic: '➹', cd: 18, tgt: 'ent', r: 110, n: ['ПТ-ракета', 'AT rocket'], d: ['Тяжёлые ракеты по технике или зданию (до 3).', 'Heavy rockets at a vehicle or building (up to 3).'] },
  leap:     { ic: '⤴', cd: 26, tgt: 'pt', r: 80, n: ['Рывок на ранцах', 'Jet leap'], d: ['Отряд перелетает на ранцах в точку (до 80 м).', 'The squad jet-leaps to a point (up to 80 m).'] },
  barrier:  { ic: '▥', cd: 45, tgt: 'none', n: ['Мини-барьер', 'Mini barrier'], d: ['Консорциум: секция бетона перед отрядом на 40 с.', 'Consortium: a concrete section in front of the squad for 40 s.'] },
};
const CMD85 = {
  on: false, g: null, h: 27, H0: 16, H1: 46, tilt: 0.78, tiltCur: 0.9, pan: [0, 0, 0], aim: null, back: null, tp: null, pend: [], walls: [], push: 0, pushT: 0,
  md: null, mdrag: null, tch: null, pinch: null, lastTap: { t: 0, e: null }, uiT: 0, sig: '', err: {}, force: false,
  stats: { enter: 0, orders: 0, abil: 0, sw: 0, dive: 0, ret: 0, auto: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('CMD85 ' + tag, e); } } },
  L: (ru, en) => tr(ru, en, en, en),
  ph(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  allowed(){ return !S.attract && (!this.ph() || SET.cmd85ph === true || this.force); },
  key(){ return 'KeyP'; },
  // ---------------------------------------------------------------- отряды
  ok(g){ return !!g && g.team === 0 && g.cls !== 'builder' && groupAlive(g); },
  list(){
    const sq = S.squads.filter(g => this.ok(g)).sort((a, b) => a.id - b.id);
    const vh = [...S.vehicles, ...S.drones].filter(g => this.ok(g));
    return [...sq, ...vh];
  },
  anchor(g){ if (!g) return null; if (isSquad(g)){ const L = leaderOf(g); return L ? L.pos : null; } return g.pos; },
  label(g){ return isSquad(g) && typeof CAMP85 !== 'undefined' ? CAMP85.labelOf(g) : groupLabel(g); },
  nearest(excl){
    let best = null, bd = 1e9;
    for (const g of this.list()){ if (g === excl) continue; const p = this.anchor(g); if (!p) continue; const d = actionDist({ pos: p }, 0) - (isSquad(g) ? 10 : 0); if (d < bd){ bd = d; best = g; } }
    return best;
  },
  // ---------------------------------------------------------------- вход / выход / смена / нырок
  enter(g, o){
    o = o || {};
    if (!this.allowed()) return false;
    if (S.mode === 'fps'){ this.back = null; enterRTS(); }
    if (S.mode !== 'rts') return false;
    g = this.ok(g) ? g : (this.ok(this.g) ? this.g : null) || this.selected() || this.nearest();
    if (!g){ feed(this.L('Нет отрядов для командования — закажи отряд', 'No squads to command — order a squad'), '#f88'); return false; }
    const was = this.on;
    this.on = true; this.aim = null; this.pan = [0, 0, 0]; this.push = 0; this.tOn = performance.now();
    if (!was){ this.tiltCur = rtsTilt0(S.rts.h); S.place = null; S.cast = null; this.stats.enter++; }
    this.setG(g);
    if (!was){ S.rts.hT = S.rts.h; RCAM.anc = null; S.camFly = null; S.rts.goal = null; }
    document.body.classList.add('cmd85');
    if (typeof UIX !== 'undefined' && UIX.closePop) UIX.closePop();
    updateModeUI(); this.sig = ''; this.ui(true);
    if (!was && !o.quiet) feed(this.L(`Командир: ${this.label(g)}. ЛКМ — идти / атаковать, 1–4 — способности, Tab — другой отряд, 2× по бойцу — в бой, P — стратегия`, `Commander: ${this.label(g)}. LMB — move / attack, 1–4 — abilities, Tab — next squad, double-click a trooper — fight, P — strategy`), '#9cf');
    if (this.ph() && !was && !o.quiet) feed(this.L('Тап — идти/атаковать, 2× тап по бойцу — в бой, кнопки справа — способности', 'Tap — move/attack, double-tap a trooper — fight, right buttons — abilities'), '#9cf');
    emit('ui', { kind: 'ok' });
    return true;
  },
  setG(g){
    this.g = g; this.aim = null; this.pan = [0, 0, 0];
    S.sel.clear(); S.selB = null; S.sel.add(g);
    this.h = clamp(isSquad(g) ? 27 : g.boss83 ? 40 : 33, this.H0, this.H1);
    this.sig = '';
  },
  selected(){ for (const g of S.sel) if (this.ok(g)) return g; const c = ctrlEntity(); const g = c && c.cls !== 'bld' ? groupOf(c) : null; return this.ok(g) ? g : null; },
  exit(){
    if (!this.on) return;
    this.on = false; this.aim = null;
    document.body.classList.remove('cmd85');
    S.rts.hT = max(S.rts.h, 75);
    if (this.ok(this.g)){ S.sel.clear(); S.sel.add(this.g); }
    updateModeUI(); this.ui(true);
    emit('ui', { kind: 'ok' });
  },
  toggle(){
    if (this.on){ this.exit(); feed(this.L('Стратегия', 'Strategy'), '#9cf'); return; }
    if (!this.allowed()) return;
    const c = S.mode === 'fps' ? ctrlEntity() : null;
    const g = c && c.cls !== 'bld' ? groupOf(c) : this.selected();
    this.enter(this.ok(g) ? g : null);
  },
  switchTo(g, auto){
    if (!this.ok(g) || g === this.g) return;
    const prev = this.g;
    if (prev && groupAlive(prev)) prev.manualUntil = max(prev.manualUntil || 0, S.time + 300);   // прежний — продолжает последний приказ
    this.setG(g);
    if (auto) this.stats.auto++; else this.stats.sw++;
    S.flashT = max(S.flashT, 0.05);
    if (!auto) feed(this.L(`Командование: ${this.label(g)}`, `Commanding: ${this.label(g)}`), '#9cf');
    if (typeof T72 !== 'undefined' && T72.on) T72.ev('sw85');
    emit('ui', { kind: 'ok' });
  },
  cycle(dir){
    const L = this.list(); if (!L.length) return;
    const i = L.indexOf(this.g), n = L.length;
    if (i < 0) this.switchTo(L[0]); else if (n > 1) this.switchTo(L[(i + dir + n) % n]);
  },
  dive(u, third){
    const g = this.g; if (!g) return;
    if (!u) u = isSquad(g) ? (leaderOf(g) || g.units.find(x => x.alive)) : g;
    if (!u || !u.alive) return;
    this.on = false; this.aim = null; document.body.classList.remove('cmd85');
    if (third && u.cls === 'inf' && typeof SET.tpv76 !== 'undefined'){ this.tp = !!SET.tpv76; SET.tpv76 = true; } else this.tp = null;
    enterFPS(u);
    if (S.mode !== 'fps'){ if (this.tp !== null){ SET.tpv76 = this.tp; this.tp = null; } this.enter(g, { quiet: true }); return; }
    if (third && u.cls === 'inf') S.third = true;
    this.back = g; this.stats.dive++;
    if (typeof T72 !== 'undefined' && T72.on) T72.ev('dive85');
    this.ui(true);
  },
  // ---------------------------------------------------------------- приказы
  order(x, y){
    const g = this.g; if (!g) return;
    S.sel.clear(); S.selB = null; S.sel.add(g);
    orderAt(x, y, false);
    g.manualUntil = max(g.manualUntil || 0, S.time + 300); g.c85o = S.time;
    this.stats.orders++;
    if (typeof T72 !== 'undefined' && T72.on) T72.ev('ord85');
  },
  orderDir(dir){
    const g = this.g; if (!g || !dir) return;
    const p = surfacePoint(norm(dir), 0.5);
    setOrder(g, 'move', p, { by: 'player', lock: 300 }); g.manualUntil = S.time + 300;
    S.orderMark = { p, t: 0.8, kind: 'amove', from: this.anchor(g) };
    this.stats.orders++; emit('ui', { kind: 'ok' });
  },
  click(x, y, btn){
    if (this.aim){ if (btn === 2){ this.aim = null; return; } this.cast(this.aim.k, x, y); return; }
    const md = typeof minimapDir === 'function' ? minimapDir(x, y) : null;
    if (md){ this.orderDir(md); return; }
    const ent = pickEntity(x, y, true);
    if (btn === 0 && ent && ent.team === 0 && ent.cls !== 'bld' && ent.cls !== 'hq'){
      const g = groupOf(ent);
      const now = performance.now(), dbl = now - this.lastTap.t < 380 && this.lastTap.e && groupOf(this.lastTap.e) === g;
      this.lastTap = { t: now, e: ent };
      if (g === this.g){ if (dbl) this.dive(ent.cls === 'inf' ? ent : null); return; }
      if (this.ok(g)){ this.switchTo(g); return; }
    }
    this.lastTap = { t: performance.now(), e: ent && ent.team === 0 ? ent : null };
    this.order(x, y);
  },
  // ---------------------------------------------------------------- способности
  set(g){
    g = g || this.g; if (!g) return [];
    if (!isSquad(g)) return abilList(g).slice(0, 4).map(k => ({ k, veh: true, A: ABIL[k] }));
    const fac = FI76(0), wall = typeof BTYPES !== 'undefined' && BTYPES.wall82;
    const heal = fac === 1 ? 'regen' : 'medic', def = fac === 1 || !wall ? 'leap' : 'barrier';
    const ks = g.elite ? ['smoke', 'volley', 'at', def] : g.solo ? ['smoke', 'sprint', 'at', heal] : ['smoke', 'sprint', 'suppress', heal];
    return ks.map(k => ({ k, A: AB85[k] }));
  },
  info(o){ return o.veh ? { ic: o.A.icon, n: N2(o.A.n), d: N2(o.A.d), tgt: o.A.target === 'point' ? 'pt' : 'none', r: o.A.range || 0 } : { ic: o.A.ic, n: this.L(o.A.n[0], o.A.n[1]), d: this.L(o.A.d[0], o.A.d[1]), tgt: o.A.tgt, r: o.A.r || 0 }; },
  left(g, o){ return o.veh ? abilLeft(g, o.k) : max(0, ((g.c85cd || {})[o.k] || 0) - S.time); },
  cdOf(g, o){ return o.veh ? (o.A.cd || 1) : o.A.cd * (typeof CAMP85 !== 'undefined' ? CAMP85.cdK(g) : 1); },
  press(i){
    const g = this.g; if (!g) return;
    const o = this.set(g)[i]; if (!o) return;
    const I = this.info(o);
    if (this.left(g, o) > 0){ feed(`${I.n}: ${this.L('перезарядка', 'cooling down')} ${this.left(g, o).toFixed(0)} ${this.L('с', 's')}`, '#f88'); return; }
    if (I.tgt === 'none'){ this.use(o, null, null); return; }
    if (this.aim && this.aim.k === i){   // повторное нажатие: ПК — по курсору, телефон — отмена
      if (!this.ph() && S.mouse){ this.cast(i, S.mouse[0], S.mouse[1]); return; }
      this.aim = null; this.ui(true); return;
    }
    this.aim = { k: i }; this.ui(true);
  },
  cast(i, x, y){
    const g = this.g; if (!g){ this.aim = null; return; }
    const o = this.set(g)[i]; if (!o){ this.aim = null; return; }
    const I = this.info(o);
    let ent = null, pt = null;
    if (I.tgt === 'ent'){ const e = pickEntity(x, y, true); if (e && e.team === 1) ent = e; }
    pt = ent ? centerOf(ent) : pickGround(x, y);
    if (!pt){ feed(this.L('Нужна точка на земле', 'Pick a point on the ground'), '#f88'); return; }
    this.aim = null;
    this.use(o, pt, ent);
    this.ui(true);
  },
  use(o, pt, ent){
    const g = this.g, I = this.info(o);
    if (o.veh){
      const why = useAbility(g, o.k, pt);
      if (why){ feed(`${I.n}: ${why}`, '#f88'); return; }
    } else {
      const why = this.fx(g, o.k, pt, ent);
      if (why){ feed(`${I.n}: ${why}`, '#f88'); return; }
      (g.c85cd = g.c85cd || {})[o.k] = S.time + this.cdOf(g, o);
    }
    g.manualUntil = max(g.manualUntil || 0, S.time + 300);
    this.stats.abil++;
    feed(`${I.ic} ${I.n}`, TEAM[0].css);
    if (typeof T72 !== 'undefined' && T72.on) T72.ev('ab85');
    emit('ui', { kind: 'ok' });
  },
  smokeAt(p){
    const up = norm(p), c = add(p, mul(up, 2));
    SCREENS.push({ pos: c, r: 11, t: 0, life: 14 });
    const n = typeof ADG80 !== 'undefined' && (ADG80.L | 0) < 1 ? 5 : 9;
    for (let i = 0; i < n; i++) S.fx.push({ type: 'smoke', pos: add(c, mul(randUnit(), 5)), vel: mul(randUnit(), 0.6), r0: 3, r1: 7, life: 12 + random() * 3, t: 0, grey: 0.5, dens: 2.2, heat: 0 });
    emit('smoke', { pos: c });
  },
  fx(g, k, pt, ent){
    const A = AB85[k], L = leaderOf(g); if (!L) return this.L('Нет бойцов', 'No troops');
    const bots = g.units.filter(u => u.alive && u !== S.me);
    if (A.tgt !== 'none' && pt && dist(pt, L.pos) > A.r * 1.15){ pt = add(L.pos, mul(norm(sub(pt, L.pos)), A.r)); pt = surfacePoint(norm(pt), 0.2); }
    switch (k){
      case 'smoke': { const u = bots[0] || L; emit('throw', { pos: u.pos, src: u }); const p = pt.slice(), t = S.time + min(1.2, 0.4 + dist(u.pos, p) / 40); this.pend.push({ t, fn: () => this.smokeAt(p) }); break; }
      case 'sprint': g.c85spr = S.time + 7; setOrder(g, 'move', pt, { by: 'player', lock: 300, rush: true }); S.orderMark = { p: pt, t: 0.8, col: '#9cf', kind: 'march', from: L.pos }; break;
      case 'suppress': g.suppPos = pt; g.suppUntil = S.time + 7; S.supp.push({ team: g.team, pos: pt, r: 14, until: S.time + 7 }); emit('ack', { g, order: 'focus' }); break;
      case 'medic': for (const u of g.units){ u.repT = max(u.repT || 0, 4); u.hp = min(u.maxhp, u.hp + u.maxhp * 0.2); } emit('repair', { pos: L.pos, g }); break;
      case 'regen': for (const u of g.units){ u.repT = max(u.repT || 0, 8); for (let i = 0; i < 6; i++) S.sparks.push({ pos: add(u.pos, mul(randUnit(), 0.8)), vel: mul(u.up, 2.5), life: 0.6, heal: 1 }); } emit('repair', { pos: L.pos, g }); break;
      case 'volley': { let n = 0; for (const u of (bots.length ? bots : g.units)){ throwGrenade(u, add(pt, mul(randUnit(), 1.5 + 2 * n)), 62, 5.2); n++; } break; }
      case 'at': {
        const sh = (bots.length ? bots : g.units).slice().sort((a, b) => (b.role === 'rocket') - (a.role === 'rocket')).slice(0, 3);
        for (const u of sh){
          const eye = add(add(u.pos, mul(u.up, RULES.EYE)), mul(norm(cross(u.fwd, u.up)), 0.25));
          fire(eye, norm(sub(pt, eye)), u.team, 0.004, 165, 70, u, 'r', { splash: 3.8 });
          emit('rocket', { pos: eye, src: u }); fxSmoke(eye, 0.4, 0.4);
        }
        break;
      }
      case 'leap': g.units.forEach((u, i) => { if (u === S.me && S.mode === 'fps') return; u.leapT = 2.6; u.leapTo = add(pt, mul(randUnit(), 3 + i)); }); emit('leap', { pos: L.pos, g }); break;
      case 'barrier': {
        const up = norm(L.pos), fp = g.foePos || (S.hq[1] && S.hq[1].pos) || mul(BASES[1], RM);
        let f = tangent(sub(fp, L.pos), up); f = len(f) > 1e-3 ? norm(f) : anyTangent(up);
        const d = offsetOnSphere(up, f, 4.5);
        const b = makeBuilding('wall82', 0, d, f);
        b.done = true; b.built = 1; b.hp = b.maxhp; b.c85exp = S.time + 40;
        if (typeof bgridDirty === 'function') bgridDirty();
        this.walls.push(b); fxSmoke(add(b.pos, mul(b.up, 1)), 1.2, 0.3);
        emit('place', { b });
        break;
      }
    }
    return null;
  },
  // ---------------------------------------------------------------- кадр (логика)
  step(dt){
    if (S.attract){ if (this.on) this.exit(); return; }
    for (let i = this.pend.length - 1; i >= 0; i--) if (S.time >= this.pend[i].t){ const p = this.pend.splice(i, 1)[0]; this.safe(p.fn, 'pend'); }
    for (let i = this.walls.length - 1; i >= 0; i--){
      const b = this.walls[i];
      if (!b.alive){ this.walls.splice(i, 1); continue; }
      if (S.time > b.c85exp){ b.alive = false; const j = S.buildings.indexOf(b); if (j >= 0) S.buildings.splice(j, 1); BLD_LIST = S.buildings; bgridDirty(); fxSmoke(add(b.pos, mul(b.up, 1)), 1.4, 0.35); this.walls.splice(i, 1); }
    }
    if (!this.on) return;
    if (S.mode !== 'rts'){ this.on = false; document.body.classList.remove('cmd85'); return; }
    if (!this.ok(this.g)){
      const was = this.g, n = this.nearest(was);
      if (n){ feed(this.L(`${was ? this.label(was) + ' — отряд потерян. ' : ''}Командование: ${this.label(n)} (ближе всех к бою)`, `${was ? this.label(was) + ' lost. ' : ''}Commanding: ${this.label(n)} (closest to the fight)`), '#ffb070'); this.switchTo(n, true); }
      else { feed(this.L('Отрядов не осталось — стратегия', 'No squads left — strategy'), '#f88'); this.exit(); }
    } else if (!S.sel.has(this.g) || S.sel.size > 1){ S.sel.clear(); S.sel.add(this.g); }
  },
  // ---------------------------------------------------------------- камера
  cam(dt){
    const R = S.rts; RCAM.dt = dt;
    if (MENU.isOpen()) return;
    RCAM.anc = null; S.camFly = null; R.goal = null;
    const k = c => keys[c] ? 1 : 0;
    const rot = k('KeyE') - k('KeyQ');
    if (rot) R.fwd = tangent(rotAxis(R.fwd, R.dir, rot * dt * 1.6), R.dir);
    const ud = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown'), lr = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft');
    if (ud || lr){
      const f = tangent(R.fwd, R.dir), r = norm(cross(f, R.dir));
      this.pan = add(this.pan, mul(add(mul(norm(f), ud), mul(r, lr)), dt * 45));
      const l = len(this.pan); if (l > 70) this.pan = mul(this.pan, 70 / l);
    }
    const p = this.anchor(this.g);
    if (p){
      const t = norm(add(p, this.pan)), a = 1 - Math.exp(-dt * 5);
      const nd = norm(add(mul(R.dir, 1 - a), mul(t, a)));
      if (finite3(nd)) rtsTransportTo(nd);
    }
    R.h += (this.h - R.h) * (1 - Math.exp(-dt * 4)); R.hT = R.h;
    this.tiltCur += (this.tilt - this.tiltCur) * (1 - Math.exp(-dt * 4));
    if (this.pushT > 0) this.pushT -= dt; else this.push = 0;
  },
  zoom(n){
    const h0 = this.h;
    this.h = clamp(this.h * Math.pow(1.12, n), this.H0, this.H1);
    if (n < 0 && h0 <= this.H0 + 0.01 && S.rts.h < this.H0 + 2){
      this.push++; this.pushT = 0.8;
      if (this.push >= 3 && isSquad(this.g)){ this.push = 0; this.dive(null, true); }   // колесо «внутрь» до упора — в бойца от третьего лица
    }
  },
  // ---------------------------------------------------------------- интерфейс
  ui(force){
    let root = $('c85');
    if (!root){
      root = document.createElement('div'); root.id = 'c85';
      root.innerHTML = '<div class="c5hd"></div><div class="c5cards"></div><div class="c5bar"></div><div class="c5tip"></div>';
      document.body.appendChild(root);
      root.addEventListener('mousedown', e => e.stopPropagation());
      root.addEventListener('click', e => { const b = e.target.closest('[data-c85]'); if (!b) return; e.stopPropagation(); e.preventDefault(); AU.init(); this.act(b.dataset.c85); });
      root.addEventListener('touchstart', e => { const b = e.target.closest('[data-c85]'); e.stopPropagation(); if (!b) return;
        if (b.classList.contains('c5cd')){ const t = e.changedTouches[0]; this.cardT = { b, y: t.clientY, x: t.clientX }; return; }   // карточки: тап на отпускании (список можно листать)
        if (e.cancelable) e.preventDefault(); AU.init(); this.act(b.dataset.c85); }, { passive: false });
      root.addEventListener('touchend', e => { const c = this.cardT; this.cardT = null; if (!c) return; const t = e.changedTouches[0]; e.stopPropagation(); if (e.cancelable) e.preventDefault(); if (hypot(t.clientX - c.x, t.clientY - c.y) > 10) return; AU.init(); this.act(c.b.dataset.c85); }, { passive: false });
      root.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    }
    const show = this.on && !MENU.isOpen() && !S.attract;
    root.style.display = show ? 'block' : 'none';
    root.classList.toggle('ph', this.ph()); document.body.classList.toggle('tch85', this.ph());
    root.classList.toggle('les', typeof T72 !== 'undefined' && !!T72.on);
    this.btns();
    if (!show) return;
    const g = this.g; if (!g) return;
    const L = this.list(), set = this.set(g), r = isSquad(g) && typeof CAMP85 !== 'undefined' ? CAMP85.ofSq(g) : null;
    const cards = L.slice(0, this.ph() ? 10 : 12).map(x => {
      const R = isSquad(x) && typeof CAMP85 !== 'undefined' ? CAMP85.ofSq(x) : null, hp = groupHP(x);
      return `<button class="c5cd ${x === g ? 'cur' : ''} ${x.combat ? 'c5fight' : ''}" data-c85="g:${isSquad(x) ? 's' + x.id : 'v' + (x.id !== undefined ? x.id : x.serial)}"><i>${cardGroupIcon(x)}</i><b>${this.label(x)}${x.vet ? ' <em>' + '★'.repeat(x.vet) + '</em>' : ''}</b><small>${R ? this.L('ур.', 'lv') + ' ' + (x.c85L || 0) + ' · ' : ''}${isSquad(x) ? x.units.length + this.L(' бойц.', ' tr.') : ''} ${uixEsc ? uixEsc(orderText(x)) : ''}</small><s style="width:${(hp * 100).toFixed(0)}%;background:${hp > 0.5 ? '#8fffaa' : hp > 0.25 ? '#ffd27a' : '#ff6050'}"></s></button>`;
    }).join('');
    const bar = set.map((o, i) => {
      const I = this.info(o);
      return `<button class="c5ab ${this.aim && this.aim.k === i ? 'aim' : ''}" data-c85="a:${i}" data-i="${i}" title="${uixEsc(I.n + ' — ' + I.d)}"><kbd>${i + 1}</kbd><i>${I.ic}</i><span>${I.n}</span><u></u></button>`;
    }).join('') || `<p class="c5none">${this.L('Нет способностей', 'No abilities')}</p>`;
    const sig = [g.id, g.serial, L.map(x => (x.id || x.serial) + ':' + x.vet + ':' + (x.c85L || 0) + ':' + x.units?.length + ':' + Math.round(groupHP(x) * 20) + ':' + !!x.combat + ':' + orderText(x)).join(','), this.aim && this.aim.k, SET.lang, set.length].join('|');
    if (force || sig !== this.sig){
      this.sig = sig;
      root.querySelector('.c5hd').innerHTML = `<b>⌖ ${this.L('КОМАНДИР', 'COMMANDER')}</b> · ${this.label(g)}${g.vet ? ' <em>' + '★'.repeat(g.vet) + '</em>' : ''}${r ? ' · ' + this.L('ур.', 'lv') + ' ' + (g.c85L || 0) + ' · ' + CAMP85.kindName(r) : ''}`;
      root.querySelector('.c5cards').innerHTML = cards;
      root.querySelector('.c5bar').innerHTML = bar + `<div class="c5mb"><button class="c5go" data-c85="dive" title="${this.L('В бой: вселиться в бойца отряда', 'Fight: possess a trooper of the squad')}">▶ ${this.L('В бой', 'Fight')} <kbd>F</kbd></button><button class="c5st" data-c85="exit">◩ ${this.L('Стратегия', 'Strategy')} <kbd>P</kbd></button></div>`;
      root.querySelector('.c5tip').textContent = this.aim ? (this.ph() ? this.L('Тапни точку на карте (или ту же кнопку — отмена)', 'Tap a point on the map (or the same button to cancel)') : this.L('ЛКМ — куда применить · та же клавиша — по курсору · ПКМ / Esc — отмена', 'LMB — where to use · same key — at cursor · RMB / Esc — cancel'))
        : (this.ph() ? this.L('Тап — идти / атаковать · 2× тап по бойцу — в бой · тянуть — поворот, щипок — зум', 'Tap — move / attack · double-tap a trooper — fight · drag — rotate, pinch — zoom')
          : this.L('ЛКМ — идти / атаковать (2× — бегом) · 2×ЛКМ по бойцу — в бой · Tab — отряд · Q/E, колесо — камера · H — стоять', 'LMB — move / attack (2× run) · double-click a trooper — fight · Tab — squad · Q/E, wheel — camera · H — hold'));
    }
    // перезарядка
    root.querySelectorAll('.c5ab').forEach(b => { const o = set[+b.dataset.i]; if (!o) return; const l = this.left(g, o), c = this.cdOf(g, o); b.classList.toggle('cool', l > 0); const u = b.querySelector('u'); if (u){ u.style.height = (l > 0 ? clamp(l / max(1, c), 0, 1) * 100 : 0) + '%'; u.textContent = l > 0 ? l.toFixed(0) : ''; } });
  },
  act(a){
    if (a === 'exit'){ this.exit(); return; }
    if (a === 'dive'){ this.dive(); return; }
    if (a === 'go'){ this.toggle(); return; }
    if (a.startsWith('a:')){ this.press(+a.slice(2)); return; }
    if (a.startsWith('g:')){ const id = a.slice(2), sq = id[0] === 's'; const g = this.list().find(x => sq ? isSquad(x) && 's' + x.id === id : !isSquad(x) && 'v' + (x.id !== undefined ? x.id : x.serial) === id); if (g){ if (g === this.g) this.pan = [0, 0, 0]; else this.switchTo(g); } }
  },
  // кнопки входа: ПК — рядом с «▶ Вселиться» (стратегия) и «◩ Стратегия» (шутер, внутри #uxmode); телефон — ⌖ слева от ☰
  btns(){
    const menu = MENU.isOpen(), play = !S.attract && !menu && !S.over;
    let b = $('c85go');
    if (!b){
      b = document.createElement('button'); b.id = 'c85go'; document.body.appendChild(b);
      const go = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); AU.init(); this.toggle(); };
      b.addEventListener('mousedown', e => e.stopPropagation());
      b.addEventListener('click', go);
      b.addEventListener('touchstart', go, { passive: false });
    }
    const ph = this.ph(), okPh = !ph || SET.cmd85ph === true || this.force;
    const show = play && okPh && !this.on && (S.mode === 'rts' || (ph && S.mode === 'fps'));
    b.style.display = show ? '' : 'none';
    b.classList.toggle('ph', ph);
    if (!show) return;
    const t = ph ? '⌖' : `⌖ ${this.L('Командир', 'Commander')} <kbd>P</kbd>`;
    if (b._t !== t){ b._t = t; b.innerHTML = t; b.title = this.L('Режим «Командир»: вид сверху на один отряд, способности 1–4', 'Commander mode: top view of one squad, abilities 1–4'); }
    if (!ph){
      const cd = document.querySelector('#card .poss') || $('card'), r = cd && cd.offsetWidth ? cd.getBoundingClientRect() : null;
      if (r && r.width > 40){ b.style.left = Math.round(r.right + 8) + 'px'; b.style.top = ''; b.style.bottom = Math.round(innerHeight - r.bottom) + 'px'; }
      else { b.style.left = 'calc(50% - 70px)'; b.style.bottom = '10px'; }
    } else { b.style.left = ''; b.style.bottom = ''; }
  },
};
// исходные функции (до обёрток)
const rtsTilt0 = rtsTilt;
// ---------------------------------------------------------------- хуки
rtsTilt = function(h){ return CMD85.on ? CMD85.tiltCur : rtsTilt0(h); };
{ const uc0 = updateRTSCamera; updateRTSCamera = function(dt){ if (CMD85.on && !S.attract){ CMD85.safe(() => CMD85.cam(dt), 'cam'); return; } return uc0.apply(this, arguments); }; }
{ const rk0 = rtsKey; rtsKey = function(e){ if (CMD85.on) return; return rk0.apply(this, arguments); }; }
{ const er0 = enterRTS;
  enterRTS = function(){
    const back = CMD85.back, wasFps = S.mode === 'fps';
    CMD85.back = null;
    const r = er0.apply(this, arguments);
    if (CMD85.tp !== null){ SET.tpv76 = CMD85.tp; S.third = !!CMD85.tp; CMD85.tp = null; }
    if (wasFps && back && CMD85.allowed() && !S.attract) CMD85.safe(() => {
      const c = S.me && S.me.alive ? S.me : null, g = c && c.cls !== 'bld' ? groupOf(c) : null;
      const tg = CMD85.ok(g) ? g : CMD85.ok(back) ? back : null;
      if (tg && CMD85.enter(tg, { quiet: true })){ CMD85.stats.ret++; if (typeof T72 !== 'undefined' && T72.on) T72.ev('ret85'); }
    }, 'ret');
    return r;
  }; }
{ const dr0 = drawRTSOverlay;
  drawRTSOverlay = function(dt){
    const r = dr0.apply(this, arguments);
    if (CMD85.on) CMD85.safe(() => drawCMD85(dt), 'draw');
    return r;
  }; }
function drawCMD85(dt){
  const C = CMD85, g = C.g; if (!g) return;
  const p = C.anchor(g); if (!p) return;
  const ring = (c, R, col, w, dash) => {
    const up = norm(c), t1 = anyTangent(up), t2 = cross(up, t1);
    octx.beginPath(); let st = false;
    for (let i = 0; i <= 32; i++){ const a = i / 32 * PI * 2; const q = project(surfacePoint(offsetOnSphere(up, norm(add(mul(t1, cos(a)), mul(t2, sin(a)))), R), 0.3)); if (!q){ st = false; continue; } if (!st){ octx.moveTo(q[0], q[1]); st = true; } else octx.lineTo(q[0], q[1]); }
    octx.strokeStyle = col; octx.lineWidth = w || 1.5; octx.setLineDash(dash || []); octx.stroke(); octx.setLineDash([]);
  };
  // отряд: кольцо под лидером, бойцы — маленькие кольца
  ring(p, isSquad(g) ? 7 : 6, 'rgba(255,210,122,.75)', 2);
  if (C.aim){
    const o = C.set(g)[C.aim.k];
    if (o){
      const I = C.info(o);
      if (I.r) ring(p, I.r, 'rgba(143,200,255,.45)', 1.5, [6, 6]);
      if (S.mouse){
        const [x, y] = S.mouse;
        const q = I.tgt === 'ent' ? pickEntity(x, y, true) : null, hit = q && q.team === 1;
        octx.strokeStyle = hit ? '#ff6050' : '#ffd27a'; octx.lineWidth = 2;
        octx.beginPath(); octx.arc(x, y, 14, 0, PI * 2); octx.moveTo(x - 20, y); octx.lineTo(x - 8, y); octx.moveTo(x + 8, y); octx.lineTo(x + 20, y); octx.moveTo(x, y - 20); octx.lineTo(x, y - 8); octx.moveTo(x, y + 8); octx.lineTo(x, y + 20); octx.stroke();
        octx.font = '700 12px "Exo 2", sans-serif'; octx.textAlign = 'center'; octx.fillStyle = '#fff'; octx.fillText(I.ic + ' ' + I.n, x, y - 26);
      }
    }
  }
  // подписи других своих отрядов (куда переключиться)
  octx.font = '600 11px "Exo 2", sans-serif'; octx.textAlign = 'center';
  for (const x of C.list()){
    if (x === g) continue;
    const q0 = C.anchor(x); if (!q0 || !facing(q0)) continue;
    const s = project(add(q0, mul(norm(q0), 3.2))); if (!s || s[0] < 0 || s[0] > innerWidth || s[1] < 0 || s[1] > innerHeight) continue;
    octx.fillStyle = 'rgba(0,0,0,.55)'; const t = C.label(x), w = octx.measureText(t).width + 10; octx.fillRect(s[0] - w / 2, s[1] - 13, w, 16);
    octx.fillStyle = '#cfe3ff'; octx.fillText(t, s[0], s[1]);
  }
}
{ const um0 = uixModeRender;
  uixModeRender = function(fps){
    um0.apply(this, arguments);
    const el = $('uxmode'); if (!el || el.style.display === 'none' || !CMD85.allowed()) return;
    if (!el.querySelector('#c85fps')){
      const b = document.createElement('button'); b.id = 'c85fps';
      b.innerHTML = `⌖ ${CMD85.L('Командир', 'Commander')} <kbd>P</kbd>`;
      b.setAttribute('data-tip', `<b>⌖ ${CMD85.L('Командир', 'Commander')}</b><p>${CMD85.L('Вид сверху на твой отряд: приказы кликом, способности 1–4.', 'Top view of your squad: click orders, abilities 1–4.')}</p>`);
      b.onclick = e => { e.stopPropagation(); AU.init(); CMD85.toggle(); };
      const s = el.querySelector('#uxStrat'); if (s && s.nextSibling) el.insertBefore(b, s.nextSibling); else el.appendChild(b);
    }
  }; }
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0.apply(this, arguments); CMD85.uiT -= dt; if (CMD85.uiT <= 0){ CMD85.uiT = 0.1; CMD85.safe(() => CMD85.ui(false), 'ui'); } }; }
{ const up0 = update; update = function(dt){ const r = up0.apply(this, arguments); CMD85.safe(() => CMD85.step(dt), 'step'); return r; }; }
{ const nm0 = newMatch; newMatch = function(){ if (CMD85.on) CMD85.exit(); CMD85.g = null; CMD85.back = null; CMD85.pend = []; CMD85.walls = []; return nm0.apply(this, arguments); }; }
// ---------------------------------------------------------------- ввод: клавиши
addEventListener('keydown', e => {
  const C = CMD85;
  if (S.attract || MENU.isOpen() || MENU.rebind || (typeof OPER !== 'undefined' && OPER.on)) return;
  const code = e.code;
  if (!C.on){
    if (code === C.key() && !e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat && (S.mode === 'rts' || S.mode === 'fps') && !S.over && C.allowed()){
      e.preventDefault(); e.stopImmediatePropagation(); AU.init(); C.toggle();
    }
    return;
  }
  if (typeof V87M !== 'undefined' && V87M.cmdKey(e)) return;   // v87: лестница режимов (Tab, Alt+1/2/3), X — следующий отряд
  if (code === SET.bind.rts && performance.now() - (C.tOn || 0) < 60) return;   // тот же Tab только что вернул из шутера
  if (['KeyM', 'KeyO', 'Slash', 'Backquote', 'Minus', 'Equal', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(code)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  keys[code] = true;
  if (e.repeat) return;
  AU.init();
  if (code.startsWith('Digit')){ const n = +code.slice(5); if (n >= 1 && n <= 4) C.press(n - 1); return; }
  switch (code){
    case 'Tab': C.cycle(e.shiftKey ? -1 : 1); return;
    case 'KeyP': C.exit(); return;
    case 'KeyF': case 'Enter': C.dive(); return;
    case 'Space': C.pan = [0, 0, 0]; return;
    case 'KeyH': if (C.g){ setOrder(C.g, 'hold', C.anchor(C.g), { by: 'player', lock: 300 }); feed(C.L('Стоять: удерживать позицию', 'Hold position'), '#9cf'); } return;
    case 'Escape': if (C.aim){ C.aim = null; C.ui(true); } else MENU.pause(); return;
  }
}, true);
// ---------------------------------------------------------------- ввод: мышь
document.addEventListener('mousedown', e => {
  const C = CMD85;
  if (!C.on || e.target !== canvas || MENU.isOpen()) return;
  e.stopPropagation(); e.preventDefault();
  if (e.button === 1){ C.mdrag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }; return; }
  C.md = { x: e.clientX, y: e.clientY, b: e.button };
}, true);
addEventListener('mousemove', e => {
  const C = CMD85; if (!C.on || !C.mdrag) return;
  const dx = e.clientX - C.mdrag.x, dy = e.clientY - C.mdrag.y; C.mdrag.x = e.clientX; C.mdrag.y = e.clientY;
  S.rts.fwd = tangent(rotAxis(S.rts.fwd, S.rts.dir, -dx * 0.006), S.rts.dir);
  C.h = clamp(C.h * (1 + dy * 0.004), C.H0, C.H1);
});
addEventListener('mouseup', e => {
  const C = CMD85;
  if (e.button === 1 && C.mdrag){
    const m = C.mdrag; C.mdrag = null;
    if (C.on && hypot(e.clientX - m.x0, e.clientY - m.y0) < 6){ const ent = pickEntity(e.clientX, e.clientY, false); const g = ent && groupOf(ent); if (C.ok(g)) C.switchTo(g); }
    return;
  }
  if (!C.on || !C.md || C.md.b !== e.button) return;
  const m = C.md; C.md = null;
  e.stopPropagation();
  if (hypot(e.clientX - m.x, e.clientY - m.y) > 8) return;
  C.safe(() => C.click(e.clientX, e.clientY, e.button), 'click');
}, true);
document.addEventListener('wheel', e => {
  const C = CMD85;
  if (!C.on || e.target !== canvas || MENU.isOpen()) return;
  e.preventDefault(); e.stopPropagation();
  const n = e.deltaMode === 1 ? e.deltaY / 3 : e.deltaY / 100;
  if (isFinite(n) && n) C.zoom(clamp(n, -1.5, 1.5));
}, { capture: true, passive: false });
// ---------------------------------------------------------------- ввод: касания
document.addEventListener('touchstart', e => {
  const C = CMD85;
  if (!C.on || e.target !== canvas || MENU.isOpen()) return;
  e.stopPropagation(); if (e.cancelable) e.preventDefault();
  const T = e.touches;
  if (T.length >= 2){ const a = T[0], b = T[1]; C.tch = null; C.pinch = { d: hypot(a.clientX - b.clientX, a.clientY - b.clientY), a: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX), h: C.h }; return; }
  const t = e.changedTouches[0];
  C.tch = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t: performance.now(), moved: false };
  S.mouse = [t.clientX, t.clientY];
}, { capture: true, passive: false });
document.addEventListener('touchmove', e => {
  const C = CMD85;
  if (!C.on || e.target !== canvas) return;
  e.stopPropagation(); if (e.cancelable) e.preventDefault();
  const T = e.touches;
  if (T.length >= 2 && C.pinch){
    const a = T[0], b = T[1], d = hypot(a.clientX - b.clientX, a.clientY - b.clientY), an = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
    C.h = clamp(C.pinch.h * C.pinch.d / max(10, d), C.H0, C.H1);
    let da = an - C.pinch.a; if (da > PI) da -= 2 * PI; if (da < -PI) da += 2 * PI; C.pinch.a = an;
    S.rts.fwd = tangent(rotAxis(S.rts.fwd, S.rts.dir, -da), S.rts.dir);
    return;
  }
  const t = [...e.changedTouches].find(x => C.tch && x.identifier === C.tch.id); if (!t) return;
  const dx = t.clientX - C.tch.x, dy = t.clientY - C.tch.y; C.tch.x = t.clientX; C.tch.y = t.clientY; S.mouse = [t.clientX, t.clientY];
  if (hypot(t.clientX - C.tch.x0, t.clientY - C.tch.y0) > 12) C.tch.moved = true;
  if (C.tch.moved && !C.aim){ S.rts.fwd = tangent(rotAxis(S.rts.fwd, S.rts.dir, -dx * 0.007), S.rts.dir); C.h = clamp(C.h * (1 + dy * 0.004), C.H0, C.H1); }
}, { capture: true, passive: false });
const tend85 = e => {
  const C = CMD85;
  if (!C.on || e.target !== canvas) return;
  e.stopPropagation(); if (e.cancelable) e.preventDefault();
  if (e.touches.length < 2) C.pinch = null;
  const t = [...e.changedTouches].find(x => C.tch && x.identifier === C.tch.id); if (!t) return;
  const m = C.tch; C.tch = null;
  if (m.moved || performance.now() - m.t > 600) return;
  C.safe(() => C.click(t.clientX, t.clientY, 0), 'tap');
};
document.addEventListener('touchend', tend85, { capture: true, passive: false });
document.addEventListener('touchcancel', e => { if (CMD85.on && e.target === canvas){ CMD85.tch = null; CMD85.pinch = null; } }, { capture: true, passive: true });
// ---------------------------------------------------------------- стили
(function(){ const st = document.createElement('style'); st.id = 'c85css'; st.textContent = `
  body.cmd85 #side, body.cmd85 #card, body.cmd85 #g80, body.cmd85 #cur, body.cmd85 #pstrip, body.cmd85 #uxtoasts, body.cmd85 #r61cards, body.cmd85 #m67rail,
  body.cmd85 #m71rail, body.cmd85 #m71sq, body.cmd85 #m71rad, body.cmd85 #sideTog, body.cmd85 #air84, body.cmd85 #uxpop, body.cmd85 #m74r,
  body.cmd85 #f76hint, body.cmd85 #touch .tt [data-t="map"], body.cmd85 #touch .tt .m67n{display:none!important}
  #c85{position:fixed;inset:0;pointer-events:none;z-index:30;font-family:"Exo 2",sans-serif;color:#e8dcb8}
  #c85 button{pointer-events:auto;font-family:inherit;cursor:pointer}
  #c85 .c5hd{position:absolute;left:12px;top:76px;max-width:440px;overflow:hidden;text-overflow:ellipsis;padding:4px 14px;border-radius:8px;background:rgba(10,12,16,.72);border:1px solid rgba(255,210,122,.35);font-size:13px;white-space:nowrap}
  #c85 .c5hd b{color:#ffd27a;font-family:"Russo One",sans-serif;font-weight:400;letter-spacing:.5px} #c85 em{font-style:normal;color:#ffd27a}
  #c85 .c5cards{position:absolute;left:12px;top:110px;width:206px;display:flex;flex-direction:column;gap:4px;max-height:calc(100vh - 330px);overflow-y:auto;pointer-events:auto;scrollbar-width:none}
  #c85 .c5cd{position:relative;display:grid;grid-template-columns:24px 1fr;gap:0 6px;align-items:center;text-align:left;padding:5px 8px 7px;border-radius:8px;border:1px solid rgba(232,220,184,.18);background:rgba(10,12,16,.78);color:#e8dcb8}
  #c85 .c5cd i{font-style:normal;grid-row:1/3;font-size:16px;text-align:center;color:#9fb8d0} #c85 .c5cd b{font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #c85 .c5cd small{font-size:10.5px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #c85 .c5cd s{position:absolute;left:8px;bottom:2px;height:2px;border-radius:2px}
  #c85 .c5cd.cur{border-color:#ffd27a;background:rgba(48,38,16,.88)} #c85 .c5cd.cur i{color:#ffd27a} #c85 .c5cd.c5fight::after{content:'';position:absolute;right:7px;top:7px;width:7px;height:7px;border-radius:50%;background:#ff6050;box-shadow:0 0 6px #ff6050}
  #c85 .c5cd:hover{border-color:rgba(255,210,122,.6)}
  #c85 .c5bar{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:6px;align-items:flex-end}
  #c85 .c5ab{position:relative;width:76px;height:76px;border-radius:10px;border:1px solid rgba(232,220,184,.3);background:rgba(10,12,16,.82);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;overflow:hidden}
  #c85 .c5ab kbd{position:absolute;left:5px;top:3px;font:700 11px "Exo 2";color:#ffd27a} #c85 .c5ab i{font-style:normal;font-size:24px;line-height:1} #c85 .c5ab span{font-size:10px;line-height:1.1;text-align:center;padding:0 3px}
  #c85 .c5ab u{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.62);text-decoration:none;display:flex;align-items:flex-start;justify-content:center;font:700 16px "Exo 2";color:#ffd27a;pointer-events:none}
  #c85 .c5ab.aim{border-color:#8fc8ff;box-shadow:0 0 12px rgba(143,200,255,.6)} #c85 .c5ab:hover{border-color:#ffd27a} #c85 .c5ab.c5cd{opacity:.85}
  #c85 .c5mb{display:flex;flex-direction:column;gap:6px;margin-left:8px}
  #c85 .c5mb button{height:35px;padding:0 12px;border-radius:8px;font-size:13px;font-weight:700;white-space:nowrap;border:1px solid rgba(232,220,184,.3);background:rgba(10,12,16,.82);color:#e8dcb8}
  #c85 .c5mb .c5go{background:rgba(30,90,50,.9);border-color:#8fffaa;color:#fff} #c85 kbd{font:700 10px "Exo 2";padding:0 4px;border-radius:3px;background:rgba(255,255,255,.12);margin-left:4px}
  #c85 .c5tip{position:absolute;left:50%;bottom:96px;transform:translateX(-50%);font-size:12px;color:#cfe3ff;text-shadow:0 1px 2px #000;white-space:nowrap}
  #c85.les .c5hd, #c85.les .c5tip{display:none}
  body.cmd85 #cam66{left:auto!important;right:12px!important;top:auto!important;bottom:12px!important}
  body.cmd85.tch85 #cam66{display:none!important}
  #c85 .c5none{margin:0;padding:8px 12px;background:rgba(10,12,16,.7);border-radius:8px;font-size:12px}
  #c85go{position:fixed;z-index:29;height:69px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,210,122,.6);background:rgba(36,28,10,.9);color:#ffd27a;font:700 14px "Exo 2",sans-serif;cursor:pointer;white-space:nowrap}
  #c85go kbd{font:700 10px "Exo 2";padding:0 4px;border-radius:3px;background:rgba(255,255,255,.12);margin-left:4px} #c85go:hover{border-color:#ffd27a;background:rgba(60,46,14,.95)}
  #c85go.ph{top:6px;right:226px;height:46px;width:46px;padding:0;font-size:22px;border-radius:10px}
  body.rtsm #c85go.ph{right:auto;left:8px;top:50px}
  #uxmode #c85fps{pointer-events:auto;cursor:pointer;font:700 13px "Exo 2",sans-serif;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,210,122,.55);background:rgba(36,28,10,.85);color:#ffd27a}
  #uxmode #c85fps kbd{font:700 10px "Exo 2";padding:0 4px;border-radius:3px;background:rgba(255,255,255,.12);margin-left:4px}
  #c85.ph .c5hd{left:50%;transform:translateX(-50%);top:6px;font-size:11px;padding:3px 10px;max-width:46vw;overflow:hidden;text-overflow:ellipsis}
  #c85.ph .c5cards{top:58px;left:6px;width:150px;max-height:calc(100vh - 160px);gap:3px}
  #c85.ph .c5cd{padding:3px 6px 5px} #c85.ph .c5cd b{font-size:11px} #c85.ph .c5cd small{font-size:9.5px}
  #c85.ph .c5bar{left:auto;right:8px;transform:none;bottom:8px;gap:5px}
  #c85.ph .c5ab{width:58px;height:58px;border-radius:50%} #c85.ph .c5ab span{display:none} #c85.ph .c5ab kbd{display:none} #c85.ph .c5ab i{font-size:22px}
  #c85.ph .c5mb{position:absolute;right:0;bottom:66px;margin:0;flex-direction:row}
  #c85.ph .c5mb button{height:40px;font-size:13px} #c85.ph .c5mb kbd{display:none}
  #c85.ph .c5tip{bottom:auto;top:30px;font-size:10.5px;max-width:60vw;white-space:normal;text-align:center}
  @media (orientation:portrait){ #c85.ph .c5cards{top:auto;bottom:222px;width:150px;max-height:32vh} #c85.ph .c5bar{right:50%;transform:translateX(50%);bottom:100px} #c85.ph .c5mb{right:50%;transform:translateX(50%)} #c85.ph .c5hd{top:58px;max-width:92vw} #c85.ph .c5tip{display:none} body:not(.rtsm) #c85go.ph{right:6px;top:158px} }
`; document.head.appendChild(st); })();
