// =====================================================================
//  v8.10 — ПЕРЕБРОСКА КАПСУЛОЙ (B) ТОЖЕ С БАЗЫ (CAP810): как все капсулы v8.7 — с пусковой площадки у штаба.
//  Игрок «сидит внутри»: короткий старт с площадки (вид сбоку) → свеча и дуга к небу-порталу → вспышка на куполе →
//  выход над целью и вид на посадку сверху → удар о землю, бойцы на месте. Быстро: ~2.5–3.5 с на всё.
//  Пока капсула летит, бойцы в ней неуязвимы и стоят на месте; Tab / смена режима — камера отпускается, посадка идёт сама.
//  Нет штаба/площадки (форпост — тоже ок) — как раньше, прямой сброс сверху.
//  Хуки — обёртки: MISSION.podDrop, setupCamera (S.camOverride), update, damage, drawOverlay, newMatch. Выключить: ?cap810=0.
// =====================================================================
const CAP810 = {
  on: (() => { try { return new URLSearchParams(location.search).get('cap810') !== '0'; } catch (e){ return true; } })() && typeof LCH87 !== 'undefined' && LCH87.on,
  ride: null, err: {}, stats: { rides: 0, landed: 0, fallback: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('CAP810 ' + tag, e); } } },
  L: (ru, en, vi) => tr(ru, en, vi || en),
  start(c, target){
    const src = LCH87.src(0); if (!src) return false;
    const my = norm(c.pos), td = norm(target), total = surfDist(c.pos, target);
    const land = stepToward(my, td, max(0, total - 30) / RM);
    const units = [c];
    if (c.squad && !SET.solo) for (const u of c.squad.units) if (u !== c && u.alive && !u.parked && dist(u.pos, c.pos) < 90) units.push(u);
    const to = surfacePoint(land, 0.3);
    const o = LCH87.plan(src.pos, to, 0); o.T = min(o.T, o.kind === 'portal' ? 2.0 : 1.2); o.ph = 'up'; o.from0 = to; o.to0 = to;
    const p = { team: 0, from: src.pos.slice(), to, pos: src.pos.slice(), t: 0, dur: 0.85, carry: true, by: 'player', ride810: true, v87: o };
    S.pods.push(p);
    LCH87.launchFx(src, 0); LCH87.stats.pods++;
    for (const u of units){ u.cap810 = { pos: u.pos.slice() }; u.vel = [0, 0, 0]; }
    this.ride = { p, c, units, land, target, total, t: 0, cam: null, ph: 'up', t0: S.time };
    emit('podincoming', { team: 0, pos: to });
    S.flashT = max(S.flashT, 0.2);
    MISSION.podReadyT = S.time + 60; MISSION.st.pods++;
    HINTS.used && HINTS.used('redeploy');
    this.stats.rides++;
    feed('🚀 ' + this.L(`Переброска капсулой с базы: ${Math.round(total)} м — через небо-портал`, `Pod redeploy from the base: ${Math.round(total)} m — through the sky portal`, `Tái triển khai từ căn cứ: ${Math.round(total)} m`), '#8fffaa');
    VOX.radio('pod', this.L('Капсула пошла с базы! Держитесь — выход над целью.', 'Pod away from the base! Hold on — exit over the target.', 'Khoang đã phóng!'), 1, 10, true);
    return true;
  },
  // камера: сбоку от капсулы на взлёте, сверху над целью на посадке
  camStep(dt){
    const R = this.ride; if (!R) return;
    const p = R.p, n = norm(p.pos), Rd = (S.R || DOME) - 5;
    const ph = p.v87 && p.v87.ph === 'up' ? 'up' : 'down';
    let d = sub(p.pos, p.from); d = len(d) > 1e-4 ? norm(d) : n;
    let side = cross(d, n); side = len(side) > 0.05 ? norm(side) : anyTangent(n);
    let want, look;
    if (ph === 'up'){ want = add(add(p.pos, mul(d, -9)), mul(side, 8)); look = add(p.pos, mul(d, 6)); }
    else { const ln = norm(R.land); want = add(add(p.pos, mul(ln, 9)), mul(anyTangent(ln), 6)); look = add(p.pos, mul(ln, -12)); }
    const wn = norm(want), gmin = groundR(wn) + 2.5;
    if (len(want) < gmin) want = mul(wn, gmin);
    if (len(want) > Rd) want = mul(wn, Rd);
    if (!R.cam || ph !== R.ph) R.cam = want; else R.cam = add(R.cam, mul(sub(want, R.cam), 1 - Math.exp(-dt * 9)));
    R.ph = ph;
    if (S.mode === 'fps' && !S.attract) S.camOverride = { pos: R.cam, look, cap810: 1 };
    else if (S.camOverride && S.camOverride.cap810) S.camOverride = null;
  },
  step(dt){
    const R = this.ride; if (!R) return;
    R.t += dt;
    for (const u of R.units) if (u.alive && u.cap810){ u.pos = u.cap810.pos.slice(); u.vel = [0, 0, 0]; }
    if (!R.p.done && R.t < 9) return;
    this.land();
  },
  land(){
    const R = this.ride; this.ride = null; if (!R) return;
    const t1 = anyTangent(R.land);
    R.units.forEach((u, i) => {
      u.cap810 = null; if (!u.alive) return;
      const d = i ? offsetOnSphere(R.land, rotAxis(t1, R.land, i * 2.1), 4 + i * 1.5) : R.land;
      u.pos = surfacePoint(d); u.vel = mul(norm(u.pos), 2); u.up = norm(u.pos); u.fwd = tangent(sub(R.target, u.pos), u.up);
      u.cover = null; u.healTo = null; u.leapT = 0; u.hopT = 0; u.skyState = null; u.stuckT = 0;
    });
    if (S.camOverride && S.camOverride.cap810) S.camOverride = null;
    const c = R.c;
    if (c && c.alive && S.me === c && S.mode === 'fps'){ CAMFX.onSwitch(c); S.shake = max(S.shake, 0.6); }
    this.stats.landed++;
    feed('☄ ' + this.L('Высадка у цели!', 'Landed at the objective!', 'Đã đáp xuống mục tiêu!'), '#8fffaa');
  },
  overlay(){
    const R = this.ride; if (!R || S.mode !== 'fps' || S.attract) return;
    const W = innerWidth;
    octx.save(); octx.textAlign = 'center';
    octx.font = '700 15px "Exo 2", sans-serif'; octx.fillStyle = '#ffd27a'; octx.globalAlpha = 0.92;
    const ph = R.p.v87 && R.p.v87.ph === 'up' ? this.L('ПУСК С БАЗЫ', 'LAUNCH FROM BASE', 'PHÓNG') : this.L('ПОСАДКА', 'LANDING', 'HẠ CÁNH');
    octx.fillText(`☄ ${this.L('ПЕРЕБРОСКА', 'REDEPLOY', 'TÁI TRIỂN KHAI')} · ${ph} · ${Math.round(R.total)} ${this.L('м', 'm', 'm')}`, W / 2, 92);
    octx.restore();
  },
};
if (CAP810.on && typeof MISSION !== 'undefined'){
  { const pd0 = MISSION.podDrop; MISSION.podDrop = function(c, target){
      if (CAP810.ride || S.attract || (typeof TUT !== 'undefined' && TUT.on)) return pd0.apply(this, arguments);
      const ok = CAP810.safe(() => CAP810.start(c, target), 'start');
      if (ok) return true;
      CAP810.stats.fallback++;
      return pd0.apply(this, arguments);
    }; }
  { const sc0 = setupCamera; setupCamera = function(dt){ if (CAP810.ride) CAP810.safe(() => CAP810.camStep(dt || 0.016), 'cam'); return sc0.apply(this, arguments); }; }
  { const up0 = update; update = function(dt){ const r = up0.apply(this, arguments); if (CAP810.ride) CAP810.safe(() => CAP810.step(dt), 'step'); return r; }; }
  { const dm0 = damage; damage = function(e){ if (e && e.cap810 && e.alive) return; return dm0.apply(this, arguments); }; }
  { const do0 = drawOverlay; drawOverlay = function(){ const r = do0.apply(this, arguments); CAP810.safe(() => CAP810.overlay(), 'ov'); return r; }; }
  { const nm0 = newMatch; newMatch = function(){ if (CAP810.ride){ for (const u of CAP810.ride.units) u.cap810 = null; CAP810.ride = null; if (S.camOverride && S.camOverride.cap810) S.camOverride = null; } return nm0.apply(this, arguments); }; }
}
