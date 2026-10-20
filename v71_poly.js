// =====================================================================
//  v7.1 — «ПОЛИГОН» (только режим разработчика, ПК и телефон)
//  Арсенал → «Полигон: ВКЛ/ВЫКЛ»: в нейтральном центре карты (на экваторе, между базами) идёт бесконечный бой —
//  отряды всех типов и по 2 машины каждого вида с обеих сторон, подкрепления по мере потерь, победы нет.
//  X (⇆) и «▶ Вселиться на полигоне» — сразу в бойца на полигоне. Вне режима разработчика ничего не делает.
// =====================================================================
const POLY71 = {
  on: false, c: null, slots: [], t: 0, reT: 0,
  SQ: [{ r: ['assault', 'heavy', 'rocket', 'medic'] }, { r: ['sniper', 'scout', 'assault', 'rocket'] }, { r: ['heavy', 'heavy', 'medic', 'assault'] }, { r: ['assault', 'sniper', 'rocket', 'assault'], elite: true }],
  VEH: ['tank', 'tank', 'raider', 'raider', 'mlrs', 'mlrs', 'cat', 'cat', 'drone', 'drone'],
  L(ru, en, vi, he){ return tr(ru, en, vi, he); },
  // нейтральный центр: точка на экваторе подальше от точек захвата и шахт
  pickCenter(){
    let best = null, bs = -1;
    for (let i = 0; i < 36; i++){
      const a = i / 36 * PI * 2, d = norm([cos(a), 0, sin(a)]);
      const p = surfacePoint(d, 0.5);
      if (typeof inShaft === 'function' && inShaft(p)) continue;
      let m = 1e9; for (const c of S.cps) if (!c.core) m = min(m, dist(c.pos, p));
      if (m > bs){ bs = m; best = d; }
    }
    return best || [1, 0, 0];
  },
  sideDir(team){ return offsetOnSphere(this.c, BASES[team], 34); },
  spot(team, i, n){
    const s = this.sideDir(team), E = norm(cross(s, [0, 1, 0]));
    return surfacePoint(offsetOnSphere(s, (i % 2) ? E : mul(E, -1), 6 + floor(i / 2) * 9 * (n > 6 ? 0.7 : 1)), 1.2);
  },
  front(team){ return surfacePoint(offsetOnSphere(this.c, BASES[1 - team], 6 + random() * 10), 0.5); },
  reg(g, slot){
    g.poly71 = true; g.byPlayer = false; g.auto66 = true; g.manualUntil = 1e9;
    setOrder(g, 'move', this.front(g.team), {}); g.manualUntil = 1e9;
    slot.g = g; slot.deadT = 0;
  },
  spawn(slot){
    const t = slot.team;
    if (slot.kind === 'sq'){
      const D = this.SQ[slot.i % this.SQ.length];
      const sq = spawnSquad(t, !!D.elite, this.spot(t, slot.i, 4), 4, D.r);
      if (sq){ if (t === 0) for (const u of sq.units) u.jet = jetOf(u); this.reg(sq, slot); }
    } else {
      const p = this.spot(t, slot.i + 1, 10), k = slot.kind;
      let v = null;
      if (k === 'tank') v = makeTank(p, t);
      else if (k === 'drone') v = makeDrone(add(p, mul(norm(p), 6)), t);
      else if (typeof V2 !== 'undefined') v = V2.make(p, t, k);
      if (v) this.reg(v, slot);
    }
  },
  start(){
    if (!(typeof DEV !== 'undefined' && DEV.on)){ feed(this.L('Полигон — только в режиме разработчика', 'The Polygon works in developer mode only', 'Chỉ trong chế độ nhà phát triển', 'רק במצב מפתח'), '#f88'); return; }
    this.on = true; this.c = this.pickCenter(); this.slots = [];
    for (const t of [0, 1]){
      for (let i = 0; i < this.SQ.length; i++) this.slots.push({ team: t, kind: 'sq', i });
      this.VEH.forEach((k, i) => this.slots.push({ team: t, kind: k, i }));
    }
    for (const s of this.slots) this.spawn(s);
    feed(this.L('⚔ Полигон: бой в центре карты, подкрепления без конца. X — вселиться в бойца на полигоне',
      '⚔ Polygon: an endless battle at the map centre with reinforcements. X — possess a soldier there',
      '⚔ Trường bắn: trận bất tận ở trung tâm bản đồ. X — nhập vai lính ở đó',
      '⚔ פוליגון: קרב אינסופי במרכז המפה עם תגבורות. X — השתלט על לוחם שם'), '#ffb347');
  },
  stop(){
    this.on = false;
    for (const s of this.slots) if (s.g){ s.g.poly71 = false; s.g.manualUntil = 0; }
    this.slots = [];
    feed(this.L('Полигон выключен — бойцы полигона вернулись под командование ИИ', 'Polygon off — its units are back under AI command', 'Đã tắt trường bắn', 'הפוליגון כבוי'), '#9cf');
  },
  toggle(){ if (this.on) this.stop(); else this.start(); },
  units(team){ const L = []; for (const s of this.slots) if (s.g && s.team === team && s.kind === 'sq') for (const u of s.g.units) if (u.alive) L.push(u); return L; },
  possess(){
    if (!this.on) this.start(); if (!this.on) return;
    const L = this.units(0).filter(u => u !== S.me); if (!L.length) return;
    const u = L[floor(random() * L.length)];
    if (S.mode !== 'fps') enterFPS(u); else takeControl(u);
  },
  step(dt){
    if (!this.on) return;
    if (!(typeof DEV !== 'undefined' && DEV.on && DEV.match) || S.attract){ this.on = false; this.slots = []; return; }
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    this.reT -= 1;
    for (const s of this.slots){
      const g = s.g;
      if (!g || !groupAlive(g)){ s.deadT += 1; if (s.deadT >= (s.kind === 'sq' ? 4 : 6)) this.spawn(s); continue; }
      g.manualUntil = 1e9; g.poly71 = true;
      // пополнение отряда (по бойцу раз в 6 с)
      if (s.kind === 'sq' && g.units.filter(u => u.alive).length < 4 && (s.topT = (s.topT || 0) - 1) <= 0){ s.topT = 6; const u = addToSquad(g, this.spot(s.team, s.i, 4)); if (u && s.team === 0) u.jet = jetOf(u); }
      const L = leaderPos(g);
      const far = !g.goal || surfDist(g.goal, mul(this.c, RM)) > 60 || (L && surfDist(L, mul(this.c, RM)) > 120);
      const idle = g.order !== 'move' && g.order !== 'focus';
      if (far || idle || this.reT <= 0) setOrder(g, 'move', this.front(g.team), {});
    }
    if (this.reT <= 0) this.reT = 20;
  },
};
// ---------------------------------------------------------------- встраивание (действует только при POLY71.on)
{
  const _u = uixFrame;
  uixFrame = function(dt){ _u(dt); try { POLY71.step(dt); } catch (e){ if (!POLY71.err){ POLY71.err = 1; console.warn('poly71', e); } } };
  const nm0 = newMatch;
  newMatch = function(o){ POLY71.on = false; POLY71.slots = []; return nm0(o); };
  if (typeof FPS61 !== 'undefined'){
    const sc0 = FPS61.sortCands;
    FPS61.sortCands = function(L){
      const r = sc0.call(this, L);
      if (!POLY71.on) return r;
      const c = mul(POLY71.c, RM);
      const P = r.filter(o => o.e && o.e.cls === 'inf' && o.e.squad && o.e.squad.poly71).sort((a, b) => dist(a.e.pos, c) - dist(b.e.pos, c));
      return P.concat(r.filter(o => !P.includes(o)));
    };
    const pa0 = FPS61.pickAuto;
    FPS61.pickAuto = function(){
      if (POLY71.on){ const L = POLY71.units(0).filter(u => u !== S.me && u.alive); if (L.length){ const c = mul(POLY71.c, RM); L.sort((a, b) => dist(a.pos, c) - dist(b.pos, c)); return L[0]; } }
      return pa0.apply(this, arguments);
    };
  }
}
if (typeof DEV !== 'undefined'){
  const ht0 = DEV.html;
  DEV.html = function(){
    const b = (a, t, on) => `<button data-dv71="${a}" class="${on ? 'p71on' : ''}">${t}</button>`;
    return ht0.call(this) + `<h5>v7.1 — ${tr('полигон', 'polygon', 'trường bắn', 'פוליגון')}</h5><div class="r">` +
      b('poly', '⚔ ' + tr('Полигон', 'Polygon', 'Trường bắn', 'פוליגון') + ': ' + (POLY71.on ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי')), POLY71.on) +
      b('go', '▶ ' + tr('Вселиться на полигоне', 'Possess at the Polygon', 'Nhập vai ở trường bắn', 'השתלט בפוליגון')) +
      b('cam', '◎ ' + tr('Камера на полигон', 'Camera to the Polygon', 'Camera tới trường bắn', 'מצלמה לפוליגון')) + `</div>`;
  };
  const pn0 = DEV.panel;
  DEV.panel = function(){
    const r = pn0.apply(this, arguments);
    const p = $('devPan');
    if (p && !p._v71){
      p._v71 = true;
      p.addEventListener('click', e => {
        const t = e.target.closest('[data-dv71]'); if (!t) return;
        e.stopPropagation(); e.preventDefault(); AU.init();
        const a = t.dataset.dv71;
        if (a === 'poly') POLY71.toggle();
        else if (a === 'go'){ DEV.panel(false); POLY71.possess(); }
        else if (a === 'cam'){ if (!POLY71.on) POLY71.start(); if (POLY71.on){ DEV.panel(false); if (S.mode !== 'rts') enterRTS(); flyCamTo(mul(POLY71.c, RM)); } }
        emit('ui', { kind: 'ok' });
        if (DEV.open) p.innerHTML = DEV.html();
      }, true);
      const st = document.createElement('style'); st.textContent = '#devPan button.p71on{border-color:#8fffaa;color:#c8ffd6;background:rgba(40,90,50,.7)}'; document.head.appendChild(st);
    }
    return r;
  };
}
