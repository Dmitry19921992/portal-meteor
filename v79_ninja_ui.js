// =====================================================================
//  v7.9 — ROBO-NINJA: interface (HUD panel, duel bars, wind-up marks, map markers, phone buttons and gestures).
//  Phone (golden rule — the screen centre stays free): tap an enemy = dash + cut, quick swipe on the right = slash,
//  «● Удар» = katana, «⇑ Рывок» = blink, «Телепорт» (grenade button) = teleport to the crosshair, «Сюрикены» (rocket button),
//  two round buttons left of 📡: «АВТО» (auto mode) and «🛡» (hold = block, press just before a hit = parry).
//  Hooks: drawOverlay, drawRTSOverlay, drawRTSMinimap, uixFrame, playerGrenade, M67.label, keydown (P), canvas touch (passive).
// =====================================================================
const NJUI = {
  el: null, sig: '', g: {}, taps: 0, swipes: 0, wasNj: false,
  star(g, x, y, r, col){ g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++){ const a = i * PI / 4, rr = i % 2 ? r * 0.32 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.restore(); },
  bar(g, x, y, w, h, k, col, right){ g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y, w, h); g.fillStyle = col; const ww = w * clamp(k, 0, 1); g.fillRect(right ? x + w - ww : x, y, ww, h); },
  overlay(){
    if (S.attract || S.mode !== 'fps' || !S.cam || (typeof OPER !== 'undefined' && OPER.on) || MENU.isOpen()) return;
    const g = octx, W = innerWidth, H = innerHeight, ph = TOUCH.on, c = ctrlEntity();
    g.save(); g.textAlign = 'center';
    // wind-up marks: a red-gold star over a ninja preparing a heavy cut or a lunge (dodge / parry cue), «posture broken»
    for (const u of NJ.all()){
      const N = u.nj; if (!N || N.hidden || (c && dist(u.pos, c.pos) > 80) || u === S.me) continue;
      const s = project(add(u.pos, mul(NJ.up(u), 1.75))); if (!s) continue;
      if (N.atk && N.atk.A.tele && N.atk.t < N.atk.A.h0){ const k = N.atk.t / N.atk.A.h0; this.star(g, s[0], s[1], 7 + 10 * k, `rgba(255,${(200 - 140 * k) | 0},60,.95)`); if (N.duel && c === S.me && NJ.is(c)){ g.font = '700 12px "Exo 2", sans-serif'; g.fillStyle = '#ffd27a'; g.fillText(N.atk.k === 'lunge' ? tr('ВЫПАД — уклон!', 'LUNGE — dodge!', 'ĐÂM — né!') : tr('ТЯЖЁЛЫЙ — блок!', 'HEAVY — block!', 'NẶNG — đỡ!'), s[0], s[1] - 18); } }
      else if (N.stag > 0.3){ g.font = '700 11px "Exo 2", sans-serif'; g.fillStyle = '#ffd27a'; g.fillText(tr('ОГЛУШЕНА', 'STAGGERED', 'CHOÁNG'), s[0], s[1] - 6); }
      else if (u.team === 1 && (!c || dist(u.pos, c.pos) < 60)){ g.font = '700 11px "Exo 2", sans-serif'; g.fillStyle = '#ff7a66'; g.fillText('✶', s[0], s[1]); }
    }
    // duel HUD: two health bars and posture bars at the top (the centre stays free)
    const D = NJ.duel;
    if (D){
      const a = D.f[0], b = D.f[1], w = min(190, W * 0.22), y = ph ? 40 : 104, cx = W / 2;
      g.font = '700 11px "Exo 2", sans-serif';
      g.fillStyle = 'rgba(8,10,14,.55)'; g.fillRect(cx - w - 34, y - 14, 2 * w + 68, 36);
      g.fillStyle = '#ffd27a'; g.fillText('⚔', cx, y + 8);
      for (const [u, x, al, col] of [[a, cx - w - 22, 'left', TEAM[0].css], [b, cx + 22, 'right', '#ff7a66']]){
        g.textAlign = al; g.fillStyle = col; g.fillText((u === S.me ? tr('ТЫ · ', 'YOU · ', 'BẠN · ') : '') + NJ.name(u), al === 'left' ? x : x + w, y - 2);
        this.bar(g, x, y + 3, w, 6, u.hp / u.maxhp, col, al === 'right');
        this.bar(g, x, y + 11, w, 3, (u.nj ? u.nj.posture : 0) / 100, '#ffd27a', al === 'right');
      }
      g.textAlign = 'center';
    }
    const u = NJ.ctrl();
    if (u){
      const N = u.nj || NJ.N(u), auto = NJ.autoActive(u);
      const pips = '●'.repeat(Math.floor(u.energy / 0.75)) + '○'.repeat(max(0, 4 - Math.floor(u.energy / 0.75)));
      const cd = (t, n) => t > 0 ? `${n} ${Math.ceil(t)}${tr('с', 's', 's')}` : `${n} ✓`;
      if (!ph){
        const x = W - 16, y0 = 96;   // top right, under «Esc — menu»: the event feed lives at the bottom right
        const lines = [
          [`✶ ${N2(ROLES.ninja.n).toUpperCase()} · ${NJ.autoP ? (auto ? tr('АВТО', 'AUTO', 'TỰ ĐỘNG') : tr('АВТО — пауза', 'AUTO — paused', 'TỰ ĐỘNG — dừng')) : tr('РУЧНОЕ', 'MANUAL', 'THỦ CÔNG')} [${keyLabel(SET.bind.nj79auto || 'KeyP')}]`, NJ.autoP ? '#8fffaa' : '#ffd27a'],
          [`${tr('рывки', 'blinks', 'lướt')} ${pips} · ${cd(N.shurCd, tr('сюрикены', 'shurikens', 'phi tiêu'))} · ${cd(N.teleCd, tr('телепорт', 'teleport', 'dịch chuyển'))}${N.posture > 5 ? ` · ${tr('стойка', 'posture', 'thế')} ${Math.round(N.posture)}%` : ''}`, '#e8dcb8'],
          [auto ? `→ ${N.zone ? N.zone.name : tr('ищу зону врага', 'looking for an enemy zone', 'tìm vùng')}${N.tgt && N.tgt.alive ? ' · ' + entName(N.tgt) : ''}` : tr('ЛКМ — удар (держать — тяжёлый) · ПКМ — блок · Shift — рывок · Q — сюрикены · G — телепорт', 'LMB — strike (hold — heavy) · RMB — block · Shift — blink · Q — shurikens · G — teleport', 'LMB — chém'), '#b9b19a'],
        ];
        g.font = '600 12px "Exo 2", sans-serif'; g.textAlign = 'right';
        const wmax = max(...lines.map(l => g.measureText(l[0]).width));
        g.fillStyle = 'rgba(8,12,16,.62)'; g.fillRect(x - wmax - 12, y0 - 15, wmax + 18, lines.length * 17 + 8);
        lines.forEach((l, i) => { g.fillStyle = l[1]; g.fillText(l[0], x, y0 + i * 17); });
      } else {
        g.font = '600 11px "Exo 2", sans-serif'; g.textAlign = 'center';
        const t = `✶ ${pips}${auto && N.zone ? ' · → ' + N.zone.name : ''}${N.teleCd > 0 ? ' · ◎ ' + Math.ceil(N.teleCd) : ''}`;
        const tw = g.measureText(t).width; g.fillStyle = 'rgba(8,12,16,.55)'; g.fillRect(W / 2 - tw / 2 - 8, H - 112, tw + 16, 17);
        g.fillStyle = NJ.autoP ? '#8fffaa' : '#ffd27a'; g.fillText(t, W / 2, H - 99);
      }
    }
    g.restore();
  },
  rtsOverlay(){
    const g = octx; g.save(); g.textAlign = 'center'; g.font = '700 11px "Exo 2", sans-serif';
    for (const u of NJ.all()){
      if (u.team === 1 && typeof fogHidden === 'function' && fogHidden(u)) continue;
      if (typeof facing === 'function' && !facing(u.pos)) continue;
      const s = project(add(u.pos, mul(NJ.up(u), 2.6))); if (!s) continue;
      g.fillStyle = u.team === 0 ? TEAM[0].css : '#ff7a66';
      g.fillText(`✶ ${N2(ROLES.ninja.n)}${u.team === 0 && u.nj && u.nj.zone ? ' → ' + u.nj.zone.name : ''}`, s[0], s[1]);
      const N = u.nj;
      if (u.team === 0 && N && N.zone && N.zone.pos && (typeof facing !== 'function' || facing(N.zone.pos))){ g.strokeStyle = 'rgba(214,198,154,.7)'; g.lineWidth = 1.5; g.setLineDash([5, 5]); groundRing(add(N.zone.pos, mul(norm(N.zone.pos), 0.4)), 40, 32); g.setLineDash([]); }
    }
    g.restore();
  },
  rtsMinimap(){
    if (typeof mmProject !== 'function') return;
    for (const u of NJ.all()){
      if (u.team === 1 && typeof fogHidden === 'function' && fogHidden(u)) continue;
      const m = mmProject(u.pos); this.star(octx, m[0], m[1], 5, u.team === 0 ? '#ffe9a8' : '#ff5a40');
    }
  },
  // ---- phone: two round buttons left of 📡 (АВТО and block), gestures on the right half
  ensure(){
    if (this.el) return this.el;
    const el = this.el = document.createElement('div'); el.id = 'nj79'; document.body.appendChild(el);
    this.gestures();
    el.innerHTML = `<button data-nj="auto"><b>✶</b><small>${tr('АВТО', 'AUTO', 'TỰ ĐỘNG')}</small></button><button data-nj="block"><b>🛡</b><small>${tr('Блок', 'Block', 'Đỡ')}</small></button>`;
    const btn = k => el.querySelector(`[data-nj="${k}"]`);
    btn('auto').addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); NJ.toggleAuto(); if (typeof M71 !== 'undefined' && M71.haptic) M71.haptic(12); }, { passive: false });
    btn('auto').addEventListener('click', e => e.stopPropagation());
    const bd = e => { e.preventDefault(); e.stopPropagation(); NJ.touchBlock = true; NJ.autoHold = S.rtime + 1.5; btn('block').classList.add('on'); }, bu = e => { e.preventDefault(); e.stopPropagation(); NJ.touchBlock = false; btn('block').classList.remove('on'); };
    btn('block').addEventListener('touchstart', bd, { passive: false }); btn('block').addEventListener('touchend', bu, { passive: false }); btn('block').addEventListener('touchcancel', bu, { passive: false });
    return el;
  },
  frame(){
    const u = NJ.ctrl(), on = !!u && !MENU.isOpen() && !S.over;
    document.body.classList.toggle('nj79', on);
    if (on !== this.wasNj){
      this.wasNj = on;
      if (typeof M67 !== 'undefined') M67.sig = '';   // re-label the phone buttons
      if (typeof G62 !== 'undefined') G62.btnSig = '';
      if (!on) NJ.touchBlock = false;
    }
    if (!TOUCH.on) return;
    const el = this.ensure();
    el.style.display = on ? 'flex' : 'none';
    if (!on) return;
    const a = el.querySelector('[data-nj="auto"]'); a.classList.toggle('on', !!NJ.autoP);
    const gb = document.querySelector('#touch .g62b small'); if (gb && gb.textContent !== tr('Телепорт', 'Teleport', 'Dịch chuyển')) gb.textContent = tr('Телепорт', 'Teleport', 'Dịch chuyển');
  },
  pickScreen(x, y, u){
    let best = null, bd = 70;
    for (const e of TGT[u.team]){
      if (!e.alive || e.cls === 'bld' || e.cls === 'hq' || dist(e.pos, u.pos) > 30) continue;
      const s = project(centerOf(e)); if (!s) continue;
      const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd){ bd = d; best = e; }
    }
    return best;
  },
};
// ---- hooks
{ const do0 = drawOverlay; drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (!(typeof M74 !== 'undefined' && M74.nohud)) NJ.safe(() => NJUI.overlay(), 'ov'); return r; }; }
{ const dro0 = drawRTSOverlay; drawRTSOverlay = function(dt){ const r = dro0.apply(this, arguments); NJ.safe(() => NJUI.rtsOverlay(), 'rov'); return r; }; }
{ const drm0 = drawRTSMinimap; drawRTSMinimap = function(){ const r = drm0.apply(this, arguments); NJ.safe(() => NJUI.rtsMinimap(), 'rmm'); return r; }; }
{ const uf0 = uixFrame;
  uixFrame = function(dt){
    const c = NJ.ctrl(); let keep;
    if (c){ if (!S.third) S.third = true; keep = SET.tpv76; SET.tpv76 = true; }   // v7.6 3rd-person setting must not be overwritten by the hero camera
    try { uf0.apply(this, arguments); } finally { if (c) SET.tpv76 = keep; }
    NJ.safe(() => NJUI.frame(dt), 'ui');
  }; }
{ const pg0 = playerGrenade; playerGrenade = function(){ const u = NJ.ctrl(); if (u){ NJ.teleAim(u); return; } return pg0.apply(this, arguments); }; }
if (typeof M67 !== 'undefined' && M67.label){
  const lb0 = M67.label;
  const MAP = { fire: ['Удар', 'Strike', 'Chém'], jet: ['Рывок', 'Blink', 'Lướt'], rocket: ['Сюрикены', 'Shurikens', 'Phi tiêu'], aim: ['Блок', 'Block', 'Đỡ'] };
  M67.label = function(b, k, ctx){
    const r = lb0.apply(this, arguments);
    if (NJ.ctrl() && ctx === 'inf' && MAP[k]){ const sm = b.querySelector('small'); if (sm){ sm.textContent = N2(MAP[k]); b._m67h = 'nj79'; } }
    return r;
  };
}
addEventListener('keydown', e => {
  if (e.repeat || MENU.isOpen() || S.attract || S.mode !== 'fps' || !NJ.ctrl()) return;
  if (e.code === (SET.bind.nj79auto || 'KeyP')){ e.preventDefault(); NJ.toggleAuto(); }
});
NJUI.gestures = function(){   // window capture: other phone layers stop touchend before it reaches the canvas
  addEventListener('touchstart', e => {
    if (!NJ.ctrl() || MENU.isOpen() || e.target !== canvas) return;
    for (const t of e.changedTouches) if (t.clientX > innerWidth * 0.42) NJUI.g[t.identifier] = { x: t.clientX, y: t.clientY, t: performance.now() };
  }, { capture: true, passive: true });
  addEventListener('touchend', e => {
    const u = NJ.ctrl();
    for (const t of e.changedTouches){
      const s = NJUI.g[t.identifier]; delete NJUI.g[t.identifier];
      if (!s || !u) continue;
      const dd = Math.hypot(t.clientX - s.x, t.clientY - s.y), dt = performance.now() - s.t;
      if (dd < 14 && dt < 400){ const en = NJUI.pickScreen(t.clientX, t.clientY, u); if (en){ NJ.autoHold = S.rtime + 2; NJ.tapAttack(u, en); NJUI.taps++; } }
      else if (dd > 45 && dt < 450 && dd / dt > 0.3){ NJ.autoHold = S.rtime + 2; NJ.strikeInput(u); NJUI.swipes++; }   // a quick flick, not a slow look-drag
    }
  }, { capture: true, passive: true });
};
(function nj79CSS(){
  const st = document.createElement('style');
  st.textContent = `
#nj79{position:fixed;z-index:15;display:none;gap:8px;right:calc(var(--sr, 0px) + 62px);top:calc(var(--st, 0px) + 160px);flex-direction:row-reverse}
#nj79 button{all:unset;box-sizing:border-box;width:46px;height:46px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,12,14,.62);border:1.5px solid rgba(214,198,154,.55);color:#e8dcb8;font:600 9.5px "Exo 2",sans-serif;touch-action:manipulation;cursor:pointer}
#nj79 button b{font-size:16px;line-height:1}
#nj79 button.on{border-color:#8fffaa;color:#8fffaa;box-shadow:0 0 12px rgba(143,255,170,.35)}
#nj79 [data-nj="block"].on{border-color:#ffd27a;color:#ffd27a}
body.nj79 #kit .weap, body.nj79 #kit .slots{display:none}
body.m74nh #nj79, body.rtsm #nj79{display:none!important}`;
  document.head.appendChild(st);
})();
