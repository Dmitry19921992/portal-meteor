// =====================================================================
//  v8.4 — ДОДЕЛКИ по отчётам v8.0–v8.3 (V84)
//   • v8.0: горячие клавиши быстрых кнопок стратегии — Home «Штаб», «,» «Свободные», Пробел «Тревога» (в подсказках);
//     панель групп видна и во время обучения; простая стратегия телефона — долгое нажатие на «Отряды»/«Техника»
//     держит выделение (можно отдать приказ тапом по земле).
//   • v8.1: приказ «идти» в точку внутри ангара — на пол ангара, а не на крышу столовой горы;
//     направление ковровой бомбардировки в стратегии: колесо мыши / R (ПК), кнопка ⟳ (телефон),
//     или протянуть от цели в сторону захода (мышь и палец).
//   • v8.2: одна подпись на цепочку бетонных барьеров («Бетонный барьер ×N»); лёгкая и средняя техника Роя
//     (Шакал, Молот, Град — броня light/medium) ходит туннелем: «В туннель» / ПКМ (тап) по норе.
//   • v8.3: прочность боссов −23 % (бои бот против бота: раньше боссы не погибали); сохранение/загрузка
//     не теряет босса; на телефоне вселиться в босса можно всегда (даже если «Вселение: Техника» выкл);
//     главная пушка «Бастиона» поднимает ствол к цели.
//  Хуки — только обёртки: G80.show/render, M74.frame/pick, pickGround, tryCast, startPower, AIR81.dirFor/overlay,
//  TUN82.send/ui, orderAt, updateCard, rebuildTargets, V74.allowed, BOSS83M.bastion, SAVE.load, MENU.applyLang;
//  в ui.js — одна строка (// v84) для подписи барьеров.
// =====================================================================
const V84 = {
  err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('v84 ' + tag, e); } } },
  A(ru, en){ return tr(ru, en, en, en); },
  // ---------------------------------------------------------------- барьеры: одна подпись на цепочку
  chT: -1, chN: -1, CH: new Map(),
  chains(){
    if (this.chT > S.rtime - 0.5 && this.chN === S.buildings.length) return this.CH;
    this.chT = S.rtime; this.chN = S.buildings.length; this.CH = new Map();
    const W = S.buildings.filter(b => b.alive && b.type === 'wall82'), P = W.map((_, i) => i);
    const f = i => { while (P[i] !== i){ P[i] = P[P[i]]; i = P[i]; } return i; };
    const lim = (typeof CON82 !== 'undefined' ? CON82.PITCH : 7.2) * 1.3;
    for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) if (W[i].team === W[j].team && surfDist(W[i].up, W[j].up) < lim){ const a = f(i), b = f(j); if (a !== b) P[a] = b; }
    const G = new Map();
    W.forEach((w, i) => { const r = f(i); if (!G.has(r)) G.set(r, []); G.get(r).push(w); });
    for (const L of G.values()){
      let c = [0, 0, 0]; for (const w of L) c = add(c, w.up); c = norm(c);
      let head = L[0], bd = 1e9; for (const w of L){ const d = surfDist(w.up, c); if (d < bd){ bd = d; head = w; } }
      for (const w of L) this.CH.set(w, { head, n: L.length, built: L.filter(x => x.done).length });
    }
    return this.CH;
  },
  wallSkip(b){ const c = this.chains().get(b); return !!c && c.head !== b; },
  wallLabel(b, label){ const c = this.chains().get(b); if (!c || c.n < 2) return label; return bname('wall82') + ' ×' + c.n + (c.built < c.n ? ` (${c.built}/${c.n})` : ''); },
  // ---------------------------------------------------------------- ангар: точка приказа — на полу
  hangFix(p){
    if (!p || typeof TER81 === 'undefined' || !TER81.ready || !TER81.HANG.length) return p;
    for (const h of TER81.HANG){
      if (dist2(p, h.O) > 1600) continue;
      const [hx, hy, hz] = TER81.hang(h, p[0], p[1], p[2]);
      if (abs(hx) < 6.0 && hz > -1 && hz < 18 && hy > 4.5){
        let q = add(add(h.O, add(mul(h.Rt, hx), mul(h.Fw, hz))), mul(h.U, 3.5));
        for (let i = 0; i < 40; i++){ const m = mapJS(q[0], q[1], q[2]); if (m < 0.3) break; q = sub(q, mul(h.U, max(0.08, m * 0.8))); }
        const [, fy] = TER81.hang(h, q[0], q[1], q[2]);
        if (fy > -1 && fy < 3) return add(q, mul(h.U, 0.2));
      }
    }
    return p;
  },
};
// ---------------------------------------------------------------- v8.0: панель групп — горячие клавиши, обучение, простая стратегия
if (typeof G80 !== 'undefined' && G80.on){
  G80.show = function(){ return this.on && S.mode === 'rts' && !S.attract && !MENU.isOpen() && !S.over && !(typeof OPER !== 'undefined' && OPER.on) && !(typeof T72 !== 'undefined' && T72.on && T72.fin); };   // v84: и в обучении
  G80.KEYS84 = { hq: 'Home', idle: 'Comma', alarm: 'Space' };
  const rn0 = G80.render;
  G80.render = function(){
    const r = rn0.apply(this, arguments);
    V84.safe(() => {
      if (!this.el || this.touch()) return;
      for (const k in this.KEYS84){ const b = this.el.querySelector(`[data-g80="q:${k}"]`); if (b && !b.dataset.k84){ b.dataset.k84 = 1; b.title += ' · ' + V84.A('клавиша', 'key') + ' ' + keyLabel(this.KEYS84[k]); } }
    }, 'g80keys');
    return r;
  };
  addEventListener('keydown', e => {
    if (S.mode !== 'rts' || S.attract || MENU.isOpen() || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
    if (S.cast && S.cast.kind === 'power' && S.cast.key === 'carpet') return;
    const K = G80.KEYS84, a = e.code === K.hq ? 'hq' : e.code === K.idle ? 'idle' : e.code === K.alarm ? 'alarm' : null;
    if (!a) return;
    e.preventDefault(); e.stopImmediatePropagation();
    V84.safe(() => { if (a === 'hq') G80.goHQ(); else if (a === 'idle') G80.goIdle(); else G80.goAlarm(); }, 'g80key');
  }, true);
  // телефон, обучение: панель групп — под панелью шага (не перекрывает её)
  const pl0 = G80.place;
  G80.place = function(){
    const r = pl0.apply(this, arguments);
    if (this.touch() && this.el && typeof T72 !== 'undefined' && T72.on && T72.P && T72.P.style.display !== 'none') V84.safe(() => {
      const pb = T72.P.getBoundingClientRect(), e = this.el.getBoundingClientRect();
      if (pb.bottom > e.top && pb.left < e.right && pb.right > e.left){ const top = pb.bottom + 6, bot = parseFloat(this.el.style.top) + parseFloat(this.el.style.maxHeight || 0); this.el.style.top = top + 'px'; this.el.style.maxHeight = max(96, bot - top) + 'px'; }
    }, 'place');
    return r;
  };
  // простая стратегия телефона: «выбрать всех» в группе отрядов/техники держит выделение
  const sa0 = G80.selectAll;
  G80.selectAll = function(k){ const r = sa0.apply(this, arguments); if ((k === 'sq' || k === 'veh') && this.m74()) V84.keep = new Set(selGroups().filter(g => g.cls !== 'builder')); return r; };
  if (typeof M74 !== 'undefined'){
    const fr0 = M74.frame;
    M74.frame = function(){
      const K = V84.keep ? [...V84.keep].filter(g => S.sel.has(g) && groupAlive(g)) : [];
      const r = fr0.apply(this, arguments);
      if (K.length && this.simple()){ for (const g of K) S.sel.add(g); for (const b of selBuilders()) S.sel.delete(b); V84.keep = new Set(K); }
      else V84.keep = null;
      return r;
    };
    const pk0 = M74.pick; if (pk0) M74.pick = function(){ V84.keep = null; return pk0.apply(this, arguments); };
  }
}
// ---------------------------------------------------------------- v8.1: ангар — приказ на пол
{ const pg0 = pickGround; pickGround = function(x, y){ const p = pg0.apply(this, arguments); return V84.safe(() => V84.hangFix(p), 'hang') || p; }; }
// ---------------------------------------------------------------- v8.1: поворот полосы ковровой бомбардировки в стратегии
const AIR84 = { ang: 0, pend: null, firing: false, rotN: 0, btn: null,
  on(){ return S.mode === 'rts' && !S.attract && S.cast && S.cast.kind === 'power' && S.cast.key === 'carpet'; },
  rot(k){ this.ang = (this.ang + k * PI / 12) % (PI * 2); this.rotN++; emit('ui', { kind: 'ok' }); },
  dragDir(){ const P = this.pend; if (!P || !P.p || !S.mouse || hypot(S.mouse[0] - P.x, S.mouse[1] - P.y) < 24) return null; const q = pickGround(S.mouse[0], S.mouse[1]); if (!q) return null; const d = tangent(sub(q, P.p), norm(P.p)); return len(d) > 1e-3 ? norm(d) : null; },
  btnFrame(){
    if (!TOUCH.on) return;
    const want = this.on();
    if (!this.btn){ if (!want) return; const b = this.btn = document.createElement('button'); b.id = 'air84'; b.innerHTML = '⟳<small>' + V84.A('повернуть', 'rotate') + '</small>'; document.body.appendChild(b);
      const go = e => { e.preventDefault(); e.stopPropagation(); AU.init(); this.rot(2); };
      b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('mousedown', go); }
    const d = want ? 'flex' : 'none'; if (this.btn.style.display !== d) this.btn.style.display = d;
  },
};
if (typeof AIR81 !== 'undefined' && AIR81.on){
  const df0 = AIR81.dirFor;
  AIR81.dirFor = function(team, pt){ const d = df0.apply(this, arguments); if (team === 0 && !this.nextDir && AIR84.ang && AIR84.on()){ const up = norm(pt); return norm(tangent(rotAxis(d, up, AIR84.ang), up)); } return d; };
  const tc0 = tryCast;
  tryCast = function(x, y){
    if (AIR84.on() && !AIR84.firing){ AIR84.pend = { x, y, p: pickGround(x, y), args: [...arguments] }; return; }
    return tc0.apply(this, arguments);
  };
  addEventListener('mouseup', e => {
    const P = AIR84.pend; if (!P || e.button !== 0) return; AIR84.pend = null;
    if (!AIR84.on() || !P.p) return;
    V84.safe(() => {
      const dd = AIR84.dragDir() || (S.mouse = [e.clientX, e.clientY], AIR84.dragDir());
      const dir = dd || AIR81.dirFor(0, P.p);
      if (dd){ AIR84.rotN++; const base = df0.call(AIR81, 0, P.p), up = norm(P.p); AIR84.ang = Math.atan2(dot(cross(base, dd), up), dot(base, dd)); }
      AIR84.firing = true; AIR81.nextDir = dir;
      const pg = pickGround; pickGround = () => P.p;   // цель — точка нажатия (палец/мышь уже ушли)
      try { tc0.apply(window, P.args); } finally { pickGround = pg; AIR81.nextDir = null; AIR84.firing = false; }
    }, 'fire');
  }, true);
  addEventListener('wheel', e => { if (!AIR84.on() || MENU.isOpen()) return; e.preventDefault(); e.stopImmediatePropagation(); AIR84.rot(e.deltaY > 0 ? 1 : -1); }, { capture: true, passive: false });
  addEventListener('keydown', e => { if (!AIR84.on() || MENU.isOpen() || e.code !== 'KeyR') return; e.preventDefault(); e.stopImmediatePropagation(); AIR84.rot(e.shiftKey ? -1 : 1); }, true);
  const ov0 = AIR81.overlay;
  AIR81.overlay = function(){
    const P = AIR84.pend;
    if (!P || !P.p || !AIR84.on()) return ov0.apply(this, arguments);
    const k = S.cast.key; S.cast.key = 'carpet84';
    try { ov0.apply(this, arguments); } finally { S.cast.key = k; }
    octx.save(); octx.setLineDash([5, 5]); this.strip({ pos: P.p, dir: AIR84.dragDir() || this.dirFor(0, P.p) }, '#ffd27a', 'rgba(255,210,122,.14)', ''); octx.restore();
  };
  if (typeof startPower === 'function'){ const sp0 = startPower;
    startPower = function(k){ const r = sp0.apply(this, arguments);
      if (k === 'carpet' && S.cast && S.cast.key === 'carpet') feed(TOUCH.on ? V84.A('Полоса: ⟳ — повернуть, или протяни пальцем от цели в сторону захода', 'Strip: ⟳ to rotate, or drag from the target along the run') : V84.A('Полоса: колесо мыши или R — повернуть, или протяни мышью от цели в сторону захода', 'Strip: mouse wheel or R to rotate, or drag from the target along the run'), '#ffd27a');
      return r; }; }
  { const uf0 = uixFrame; uixFrame = function(dt){ const r = uf0.apply(this, arguments); V84.safe(() => AIR84.btnFrame(), 'airbtn'); return r; }; }
}
// ---------------------------------------------------------------- v8.2: техника Роя в туннеле (лёгкая и средняя)
const TUN84 = { stats: { sent: 0, through: 0 },
  ok(v){ return !!v && v.cls === 'tank' && v.alive && !v.boss83 && !v.rhino76 && (v.armor === 'light' || v.armor === 'medium'); },
  sel(){ return selGroups().filter(g => this.ok(g)); },
  send(b, v, by){
    if (typeof TUN82 === 'undefined' || !TUN82.isOpen(b) || !this.ok(v) || v.team !== b.team) return false;
    setOrder(v, 'move', TUN82.mouth(b), { by: by === 'player' ? 'player' : 'ai', lock: 120, rush: true });
    v.t84 = { b: b.id, by: by || 'ai', t: S.time }; this.stats.sent++;
    return true;
  },
  step(){
    const me = ctrlEntity();
    for (const v of S.vehicles){
      if (!v.alive || !v.t84) continue;
      const T = v.t84, b = TUN82.byId(T.b), x = b && TUN82.exitOf(b);
      if (v.tun82){
        v.vel = [0, 0, 0]; v.cd = max(v.cd || 0, 1); v.mgCd = max(v.mgCd || 0, 1);
        if (S.time < v.tun82.until) continue;
        const at = x || b; v.tun82 = null; v.t84 = null;
        if (!at){ damage(v, 1e5, null, 'x'); continue; }
        const md = TUN82.mouthDir(at), p = surfacePoint(offsetOnSphere(md, at.fwd, 6 + random() * 2), v.rad || 1.2);
        v.pos = p; v.up = norm(p); v.vel = mul(at.fwd, 3); v.fwd = tangent(at.fwd, v.up); v.aim = v.fwd; v.cd = 0.5;
        fxSmoke(add(p, mul(v.up, 0.8)), 1.8, 0.55, 0.8); this.stats.through++;
        const ahead = surfacePoint(offsetOnSphere(md, at.fwd, 18), 0.5);
        setOrder(v, 'move', ahead, { by: T.by === 'player' ? 'player' : 'ai', lock: T.by === 'player' ? 120 : 30 });
        if (T.by === 'player' && !S.attract) feed(V84.A(`${groupLabel(v)} вышел из туннеля`, `${groupLabel(v)} is out of the tunnel`), TEAM[0].css);
        continue;
      }
      if (!TUN82.isOpen(b) || v === me){ v.t84 = null; continue; }
      const m = TUN82.mouth(b);
      if (v.order !== 'move' || !v.goal || dist(v.goal, m) > 9){ v.t84 = null; continue; }
      if (dist(v.pos, m) < 7.5){
        const md = TUN82.mouthDir(b);
        v.tun82 = { b: b.id, until: S.time + TUN82.TRANS + 1 + random() * 0.6, veh: 1 };
        v.pos = mul(md, groundR(md) - 6); v.vel = [0, 0, 0]; S.sel.delete(v);
        fxSmoke(add(m, mul(md, 1.2)), 1.6, 0.55, 0.7);
      }
    }
  },
};
if (typeof TUN82 !== 'undefined' && typeof FAC82 !== 'undefined'){
  FAC82.steps.push(Object.assign(dt => TUN84.step(dt), { tag: 'tun84' }));
  const ui0 = TUN82.ui;
  TUN82.ui = function(key, site){
    if (key !== 'tgo82' || !FAC82.on) return ui0.apply(this, arguments);
    const V = TUN84.sel(); if (!V.length) return ui0.apply(this, arguments);
    const L = this.list(0).filter(b => this.isOpen(b));
    let b = site && this.isOpen(site) ? site : L[0];
    if (!b) return ui0.apply(this, arguments);
    let n = 0; for (const v of V) if (!v.t84 && TUN84.send(b, v, 'player')) n++;
    const sq = selGroups().filter(isSquad);
    if (sq.length){ for (const v of V) S.sel.delete(v); try { ui0.apply(this, arguments); } finally { for (const v of V) if (v.alive && !v.tun82) S.sel.add(v); } }
    if (n){ feed(V84.A(`В туннель: техники ${n}`, `Into the tunnel: ${n} vehicle(s)`), TEAM[0].css); emit('ui', { kind: 'ok' }); S.orderMark = { p: this.mouth(b), t: 0.8, col: '#ff7a5a', kind: 'amove' }; }
    return true;
  };
  const oa0 = orderAt;
  orderAt = function(x, y){
    const V = FAC82.on ? TUN84.sel() : [];
    if (V.length){
      const ent = pickEntity(x, y, false);
      if (ent && ent.cls === 'bld' && ent.team === 0 && ent.type === 'tun82' && TUN82.isOpen(ent)){
        let n = 0; for (const v of V) if (TUN84.send(ent, v, 'player')) n++;
        for (const v of V) S.sel.delete(v);
        try { if (selGroups().length) oa0.apply(this, arguments); } finally { for (const v of V) if (v.alive) S.sel.add(v); }
        if (n){ S.orderMark = { p: TUN82.mouth(ent), t: 0.8, col: '#ff7a5a', kind: 'amove' }; feed(V84.A(`В туннель: техники ${n}`, `Into the tunnel: ${n} vehicle(s)`), TEAM[0].css); emit('ui', { kind: 'ok' }); }
        return;
      }
    }
    return oa0.apply(this, arguments);
  };
  if (typeof updateCard === 'function'){ const uc0 = updateCard;
    updateCard = function(){
      uc0.apply(this, arguments);
      V84.safe(() => {
        const el = $('card'); if (!el) return;
        const cm = el.querySelector('.cmds'); if (!cm || el.querySelector('[data-t82]')) return;
        if (!(FAC82.on && FAC82.sw(0) && TUN84.sel().length && TUN82.list(0).some(b => TUN82.isOpen(b)))) return;
        const bt = document.createElement('button'); bt.className = 'ab'; bt.dataset.t82 = '1'; bt.dataset.ux = 'prod:tgo82';
        bt.title = V84.A('Лёгкая и средняя техника идёт в ближайший открытый туннель', 'Light and medium vehicles go into the nearest open tunnel');
        bt.innerHTML = `<i>⇣</i><b>${V84.A('В туннель', 'Into tunnel')}</b>`;
        bt.onclick = e => { e.stopPropagation(); AU.init(); TUN82.ui('tgo82', null); };
        const more = cm.querySelector('.more61'); if (more) cm.insertBefore(bt, more); else cm.appendChild(bt);
      }, 'card');
    }; }
  { const rt0 = rebuildTargets; rebuildTargets = function(){ rt0.apply(this, arguments); if (S.vehicles.some(v => v.tun82)) for (const t of [0, 1]) TGT[t] = TGT[t].filter(e => !e.tun82); }; }
  if (PRODUCTS.tgo82){ PRODUCTS.tgo82.d76 = ['Рой. Отряды в 70 м от норы (и выделенные), а также выделенная лёгкая/средняя техника (Шакал, Молот, Град) идут в туннель и выходят на другом конце. Или: выдели и ПКМ/тап по норе.', 'Swarm. Squads within 70 m of the burrow (and selected ones), plus selected light/medium vehicles (Jackal, Hammer, Grad), go through the tunnel. Or: select and RMB/tap the burrow.', 'Bầy Đàn. Đội và xe nhẹ/trung đi qua hầm.']; }
}
// ---------------------------------------------------------------- v8.3: боссы
if (typeof BOSS83 !== 'undefined'){
  // прочность −23 % (в 10 боях бот против бота босс ни разу не погиб)
  V84.BOSS_HP = { c: 11500, s: 9600 };
  BOSS83.K.c.hp = V84.BOSS_HP.c; BOSS83.K.s.hp = V84.BOSS_HP.s;
  if (PRODUCTS.boss83c) for (const L of [PRODUCTS.boss83c.d76]) if (L) for (let i = 0; i < L.length; i++) L[i] = String(L[i]).replace('15000', '11500');
  if (PRODUCTS.boss83s) for (const L of [PRODUCTS.boss83s.d76]) if (L) for (let i = 0; i < L.length; i++) L[i] = String(L[i]).replace('12500', '9600');
  // вселение: в своего босса — всегда (на телефоне «Вселение: Техника» по умолчанию выкл)
  if (typeof V74 !== 'undefined' && V74.allowed){ const al0 = V74.allowed; V74.allowed = function(u){ if (u && u.boss83 && u.team === 0) return true; return al0.apply(this, arguments); }; }
  // сохранение: поля босса (после загрузки — тот же босс, а не обычный танк)
  { const ld0 = SAVE.load;
    SAVE.load = function(){
      const r = ld0.apply(this, arguments);
      if (r) V84.safe(() => {
        for (const v of S.vehicles){
          if (!v.boss83 || !BOSS83.K[v.boss83]) continue;
          const K = BOSS83.K[v.boss83];
          Object.assign(v, { walk: K.walk, rad: K.rad, hitR: K.hitR, armor: 'boss83', visR: 120 });
          if (!Array.isArray(v.mg83) || v.mg83.length < 2) v.mg83 = [{ aim: null, cd: 0, tgt: null, think: 0 }, { aim: null, cd: 0.1, tgt: null, think: 0.25 }];
          for (const M of v.mg83){ if (M.tgt && !M.tgt.alive) M.tgt = null; if (M.aim && !Array.isArray(M.aim)) M.aim = null; }
          if (v.bm83 && typeof v.bm83 !== 'object') v.bm83 = null;
          if (v.st83 === undefined) v.st83 = 4; if (v.rk83 === undefined) v.rk83 = 6; v.rkq = v.rkq || 0; v.rkT = v.rkT || 0;
          if (v.boss83 === 's'){ v.phase = v.phase || 0; v.moveAmt = 0; if (typeof BOSS83M !== 'undefined' && BOSS83M.init) BOSS83M.init(v); }
          v.maxhp = max(v.maxhp || 0, 1); v.hp = min(v.hp, v.maxhp);
        }
      }, 'bossLoad');
      return r;
    }; }
  // «Бастион»: ствол главной пушки — отдельный меш, поднимается к цели
  if (typeof ST70_DEF !== 'undefined' && typeof BOSS83M !== 'undefined'){
    const C = C70, OL = [0.20, 0.22, 0.13];
    Object.assign(ST70_DEF, {
      b84tur(){   // башня без ствола (ствол — b84gun)
        const g = G69();
        st70lathe(g, 0, 0, 0, [[0, 2.3], [0.35, 2.3], [0.42, 0]], 24, OL, 1);
        g69box(g, [0, 1.0, 0.2], [2.0, 0.72, 2.5], 0.45, C.P, 0);
        g69box(g, [0, 1.0, -2.6], [1.7, 0.58, 0.8], 0.3, C.P, 0);
        st70lathe(g, -1.0, 1.7, -0.6, [[0, 0.6], [0.45, 0.55], [0.6, 0]], 14, OL, 1);
        g69box(g, [-1.0, 2.05, -0.6], [0.3, 0.06, 0.3], 0.05, C.WH, 4);
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g69tube(g, [s * 2.0, 1.45, 1.6 - k * 0.4], [s * 2.35, 1.7, 1.75 - k * 0.4], 0.09, 0.09, 6, C.DK, 2);
        g69box(g, [0, 1.75, 0.3], [1.4, 0.04, 0.05], 0.01, OL, 1);
        return g;
      },
      b84gun(){   // маска и ствол; начало — ось цапф
        const g = G69();
        g69box(g, [0, 0, 0], [1.05, 0.62, 0.4], 0.15, C.DK, 2);
        g69tube(g, [0, 0, 0.15], [0, 0, 7.65], 0.44, 0.34, 14, C.ST, 2);
        g69tube(g, [0, 0, 3.55], [0, 0, 4.85], 0.56, 0.56, 14, C.DK, 2);
        g69box(g, [0, 0, 7.8], [0.58, 0.42, 0.5], 0.12, C.DK, 2);
        return g;
      },
    });
    const bs0 = BOSS83M.bastion;
    BOSS83M.bastion = function(items, g, up, fwd, aim){
      const n0 = items.length, r = bs0.apply(this, arguments);
      V84.safe(() => {
        for (let i = n0; i < items.length; i++){
          const T = items[i]; if (T.m !== 'b83tur') continue;
          T.m = 'b84tur';
          const e = clamp(Math.asin(clamp(dot(norm(aim), up), -1, 1)), -0.12, 0.32), ce = cos(e), se = sin(e);
          const Z = add(mul(T.Z, ce), mul(T.Y, se)), Y = sub(mul(T.Y, ce), mul(T.Z, se));
          items.push(Object.assign({}, T, { m: 'b84gun', pos: add(T.pos, add(mul(T.Y, 1.05), mul(T.Z, 2.75))), X: T.X, Y, Z }));
          break;
        }
      }, 'gun');
      return r;
    };
  }
}
// ---------------------------------------------------------------- заголовок тестовой сборки
{ const al0 = MENU.applyLang; MENU.applyLang = function(){ const r = al0.apply(this, arguments); if (window.PM_ART80 || /v8[0-4]/.test(location.pathname)) document.title = 'Portal Meteor v8.4 test'; return r; }; }
// ---------------------------------------------------------------- стили
(function(){ const st = document.createElement('style'); st.id = 'v84css'; st.textContent = `
  #air84{position:fixed;left:50%;bottom:calc(var(--sb,0px) + 112px);transform:translateX(-50%);z-index:12;display:none;flex-direction:column;align-items:center;justify-content:center;
    width:64px;height:64px;border-radius:50%;border:2px solid #ffd27a;background:rgba(30,22,8,.85);color:#ffd27a;font:700 26px "Exo 2",sans-serif;line-height:1;touch-action:none;-webkit-tap-highlight-color:transparent}
  #air84 small{font-size:9px;font-weight:600;margin-top:2px}
`; document.head.appendChild(st); })();
