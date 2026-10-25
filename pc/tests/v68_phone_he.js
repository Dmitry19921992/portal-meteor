// v6.8: тот же тест телефона v6.7, но в иврите (RTL)
const save0 = MENU.save; MENU.save = function(){}; SET.lang = 'he'; MENU.applyLang(); try {
// v6.7: телефон — настоящие касания (CDP Input.dispatchTouchEvent): шутер (джойстик, обзор, огонь, перезарядка, ранец,
// граната, простой огонь, ☰, ⇆, стратегия) и стратегия (тап, панорама, щипок, поворот, кнопки справа, автономно, рамка, приказ)
const W = innerWidth, H = innerHeight, tag = W + 'x' + H;
const out = { vp: tag, errors: [], checks: {}, info: {} };
const ok = (k, v, info) => { out.checks[k] = v ? 'OK' : 'FAIL'; if (!v) out.errors.push(k + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (info !== undefined) out.info[k] = info; };
const S0 = M67.safe;
const vis = e => { if (!e.isConnected) return false; let p = e; while (p && p !== document.body){ const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden') return false; p = p.parentElement; } return +getComputedStyle(e).opacity !== 0; };
const SEL = '#touch button, #card button, #side button, #cur .cbox, #kit, #obj, #pstrip .pc, #placeBar button, #sideTog, #hud .hb, #hint, #bars, #m67cam, #cam66';
function layout(state){
  const L = [];
  for (const e of document.querySelectorAll(SEL)){
    if (!vis(e) || e.closest('#m67sheet') || e.closest('#trot')) continue;
    let r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) continue;
    const box = e.closest('#side .items, #pstrip');
    let R = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    if (box && box !== e){ const q = box.getBoundingClientRect(); R = { l: max(R.l, q.left), t: max(R.t, q.top), r: min(R.r, q.right), b: min(R.b, q.bottom) }; if (R.r - R.l < 3 || R.b - R.t < 3) continue; }
    L.push({ e, R, n: (e.id ? '#' + e.id : e.tagName.toLowerCase()) + '[' + (e.dataset.t || e.dataset.k || e.dataset.s || e.className || '').toString().slice(0, 14) + ']' });
  }
  const over = [], offs = [], small = [];
  for (const a of L){
    if (a.R.l < S0.l - 1 || a.R.t < S0.t - 1 || a.R.r > W - S0.r + 1 || a.R.b > H - S0.b + 1) offs.push(a.n + ' ' + [a.R.l, a.R.t, a.R.r, a.R.b].map(Math.round).join(','));
    if (a.e.tagName === 'BUTTON' && a.e.closest('#touch') && (a.R.r - a.R.l < 44 || a.R.b - a.R.t < 44)) small.push(a.n + ' ' + Math.round(a.R.r - a.R.l) + '×' + Math.round(a.R.b - a.R.t));
  }
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++){
    const a = L[i], b = L[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = min(a.R.r, b.R.r) - max(a.R.l, b.R.l), h = min(a.R.b, b.R.b) - max(a.R.t, b.R.t);
    if (w > 2 && h > 2) over.push(`${a.n} × ${b.n} (${Math.round(w)}×${Math.round(h)})`);
  }
  out.info['L_' + state] = { n: L.length, over: over.slice(0, 10), off: offs.slice(0, 8), small: small.slice(0, 8) };
  if (over.length) out.errors.push(state + ': overlaps ' + over.join(' | ').slice(0, 300));
  if (offs.length) out.errors.push(state + ': in safe area / offscreen ' + offs.join(' | ').slice(0, 300));
}
const c2 = sel => ctr(sel);
try {
  ok('m67_on', document.body.classList.contains('m67') && M67.active());
  PROG.allUnlocked = true;
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1800);
  const me = S.me;
  layout('fps');
  await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_fps.jpg`);
  // --- джойстик
  const p0 = me.pos.slice(), jx = S0.l + 120, jy = H - S0.b - 110;
  await T.down(1, jx, jy); await sleep(60);
  ok('joy_shown', $('tjoy').style.display === 'block' && !document.body.classList.contains('m67joy') === false || $('tjoy').style.display === 'block');
  for (let i = 1; i <= 10; i++){ await T.move(1, jx, jy - 7 * i); await sleep(16); }
  ok('joy_forward', TOUCH.move[1] > 0.9, TOUCH.move);
  await sleep(900);
  ok('joy_walks', dist(me.pos, p0) > 1.5, +dist(me.pos, p0).toFixed(2));
  await T.move(1, jx + 10, jy - 230); await sleep(30);
  ok('joy_follow', TOUCH.joy && TOUCH.joy.y0 < jy - 100, TOUCH.joy && Math.round(TOUCH.joy.y0));
  await T.up(1); await sleep(60);
  ok('joy_fade', $('tjoy').classList.contains('fade') && TOUCH.move[0] === 0 && TOUCH.move[1] === 0);
  await sleep(400); ok('joy_hidden', $('tjoy').style.display === 'none');
  // --- обзор правой половиной
  M67.pref.simple = false;
  const f0 = me.fwd.slice();
  await T.drag(2, W * 0.62, H * 0.45, W * 0.62 + 100, H * 0.45, 10); await T.up(2); await sleep(50);
  const lookDeg = acos(clamp(dot(f0, me.fwd), -1, 1)) * 180 / PI;
  ok('look_drag', lookDeg > 10 && lookDeg < 60, +lookDeg.toFixed(1));
  // --- огонь
  const K = S.kit, w = K.w, m0 = K.mag[w];
  const fb = c2('#touch [data-t="fire"]'); await T.down(3, fb[0], fb[1]); await sleep(800);
  ok('fire_held', mouseL === true); await T.up(3); await sleep(80);
  ok('fire_shots', K.mag[w] < m0, { m0, m1: K.mag[w] }); ok('fire_release', mouseL === false);
  // --- перезарядка
  const rb = c2('#touch [data-k="reload"]'); await T.tap(rb[0], rb[1]); await sleep(120);
  ok('reload', K.reloadT > 0 || K.mag[w] === WEAPONS[w].mag, { t: K.reloadT });
  await sleep(2600);
  // --- ранец (держать)
  const h0 = len(me.pos), jb = c2('#touch [data-t="jet"]');
  await T.down(4, jb[0], jb[1]); await sleep(900); const h1 = len(me.pos); await T.up(4);
  ok('jetpack', h1 - h0 > 1, +(h1 - h0).toFixed(2));
  await sleep(2500);
  // --- граната: удержание — дуга, ведём пальцем, отпускание — бросок
  const gb = c2('#touch .g62b'), g0 = G62.kit().gren;
  await T.down(5, gb[0], gb[1]); await sleep(450);
  ok('grenade_aim', !!G62.hold);
  await T.move(5, gb[0] - 10, gb[1] - 25); await sleep(250);
  await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_fps_grenade.jpg`);
  await T.up(5); await sleep(300);
  ok('grenade_throw', G62.kit().gren < g0 && !G62.hold, { g0, g1: G62.kit().gren });
  // --- простой огонь: враг перед прицелом — стреляет сам
  M67.pref.simple = true; await sleep(2600);
  const en = S.units.find(u => u.alive && u.team === 1 && u.cls === 'inf');
  let autoSeen = false, mA = K.mag[K.w], hpA = en ? en.hp : 0;
  if (en){
    const up = norm(me.pos);
    let fw = tangent(me.fwd, up), ep = null;
    const p00 = en.pos;
    for (let k = 0; k < 32 && !ep; k++){   // направление и дальность, где враг на земле и его видно
      const d = rotAxis(fw, up, k * PI / 8), q = surfacePoint(norm(add(me.pos, mul(d, k < 16 ? 16 : 10))), 0);
      en.pos = q; if (los(gunEye(me), centerOf(en))){ fw = d; ep = q; }
    }
    if (!ep) en.pos = p00;
    out.info.sfSpot = !!ep;
    for (let i = 0; i < 20; i++){
      en.hp = 1e6; en.pos = ep || add(me.pos, mul(fw, 18)); en.vel = [0, 0, 0]; if (en.seen) en.seen[0] = 5;
      me.fwd = norm(sub(centerOf(en), gunEye(me)));
      await sleep(70); if (M67.auto) autoSeen = true;
      if (i === 12) await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_fps_simplefire.jpg`);
    }
    const eye = gunEye(me), h = AIMA.scan(eye, me.fwd, me.team, 0.9 * PI / 180, 150);
    out.info.sfDiag = { me: me === ctrlEntity(), alive: me.alive, h: h && [h.ang, h.rad].map(x => +(x * 180 / PI).toFixed(2)), los: los(eye, centerOf(en)), d: +dist(centerOf(en), eye).toFixed(1), rl: K.reloadT, hold: !!G62.hold, cam: CAMFX.busy(), open: M67.open, p: S.paused, mo: MENU.isOpen(), mode: S.mode, w: K.w };
  }
  ok('simple_fire_auto', autoSeen && (K.mag[K.w] < mA || K.reloadT > 0), { autoSeen, mA, m: K.mag[K.w], hp: en && en.hp });
  if (en) en.hp = 5;
  me.fwd = tangent(me.fwd, norm(me.pos)); await sleep(400);
  ok('simple_fire_stops', !M67.auto || !en.alive);
  // --- меню ☰
  const mb = c2('#touch .m67m'); await T.tap(mb[0], mb[1]); await sleep(250);
  ok('sheet_open', M67.open && vis($('m67sheet')));
  await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_fps_sheet.jpg`);
  const dash = $('m67sheet').querySelector('[data-k="dash"]'); ok('sheet_has_dash', !!dash && vis(dash));
  const xb = $('m67sheet').querySelector('[data-x]').getBoundingClientRect(); await T.tap(xb.left + xb.width / 2, xb.top + xb.height / 2); await sleep(200);
  ok('sheet_close', !M67.open);
  // --- ⇆ сменить бойца
  const c0 = ctrlEntity(), nb = c2('#touch .m67n'); await T.tap(nb[0], nb[1]); await sleep(1800);
  ok('next_unit', ctrlEntity() !== c0, { was: c0 && c0.id, now: ctrlEntity() && ctrlEntity().id });
  // --- в стратегию
  const sb = c2('#touch [data-t="map"]'); await T.tap(sb[0], sb[1]); await sleep(1500);
  ok('to_rts', S.mode === 'rts');
  layout('rts'); await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_rts.jpg`);
  ok('side_hidden_no_builder', P64.min && getComputedStyle($('side')).display === 'none');
  // кнопка «Вся армия»
  const ab = c2('#m67rail [data-t="army"]'); await T.tap(ab[0], ab[1]); await sleep(300);
  ok('rail_army', S.sel.size === groupsOf(0).length && S.sel.size > 1, S.sel.size);
  // «Отряд» по очереди
  const qb = c2('#m67rail .m67sq'); await T.tap(qb[0], qb[1]); await sleep(300);
  const s1 = selGroups()[0]; ok('rail_squad', selGroups().length === 1 && s1.cls !== 'builder', s1 && groupLabel(s1));
  await T.tap(qb[0], qb[1]); await sleep(300); ok('rail_squad_next', selGroups().length === 1 && selGroups()[0] !== s1);
  layout('rts_sel'); await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_rts_sel.jpg`);
  // «Автономно»
  const g = selGroups()[0], a0 = isAuto66(g), aub = c2('#m67rail .m67auto'); await T.tap(aub[0], aub[1]); await sleep(300);
  ok('rail_autonomy', isAuto66(g) !== a0 && $('m67rail').querySelector('.m67auto').classList.contains('on') === isAuto66(g));
  await T.tap(aub[0], aub[1]); await sleep(200); ok('rail_autonomy_back', isAuto66(g) === a0);
  // тап по юниту — выделение
  S.sel.clear(); const sq = groupsOf(0).find(x => isSquad(x) && groupAlive(x));
  rtsLookAt(leaderPos(sq)); await sleep(1200);
  let sp = null;
  const lp = () => { const L = leaderOf(sq); return L ? centerOf(L) : leaderPos(sq); };
  for (let i = 0; i < 30; i++){ sp = facing(lp()) ? project(lp()) : null; if (sp && sp[0] > W * 0.2 && sp[0] < W * 0.75 && sp[1] > H * 0.2 && sp[1] < H * 0.75 && document.elementFromPoint(sp[0], sp[1]) === canvas) break; sp = null; rtsLookAt(leaderPos(sq)); await sleep(150); }
  if (sp){ await T.tap(sp[0], sp[1]); await sleep(300); }
  ok('tap_select', S.sel.has(sq) || selGroups().length > 0, { sp: sp && sp.slice(0, 2).map(Math.round), n: selGroups().length });
  // долгий тап — приказ
  const gl0 = sq.goal && sq.goal.slice ? sq.goal.slice() : sq.goal;
  S.sel.clear(); S.sel.add(sq); await sleep(100);
  const ox = W * 0.42, oy = H * 0.42; await T.down(6, ox, oy); await sleep(650); await T.up(6); await sleep(300);
  ok('longtap_order', sq.goal && (!gl0 || dist(sq.goal, gl0) > 1), { o: sq.order });
  // панорама одним пальцем
  const d0 = S.rts.dir.slice(); await T.drag(7, W * 0.5, H * 0.5, W * 0.5 - 150, H * 0.5 + 40, 12); await T.up(7); await sleep(200);
  ok('pan', acos(clamp(dot(d0, S.rts.dir), -1, 1)) > 0.005, +acos(clamp(dot(d0, S.rts.dir), -1, 1)).toFixed(4));
  // щипок — масштаб
  const hh0 = S.rts.h, cx = W * 0.5, cy = H * 0.45;
  await T.down(10, cx - 50, cy); await T.down(11, cx + 50, cy);
  for (let i = 1; i <= 10; i++){ await T.move(10, cx - 50 - 9 * i, cy); await T.move(11, cx + 50 + 9 * i, cy); await sleep(16); }
  await T.up(11); await T.up(10); await sleep(200);
  ok('pinch_zoom', S.rts.h < hh0 * 0.8, { h0: +hh0.toFixed(1), h1: +S.rts.h.toFixed(1) });
  // поворот двумя пальцами
  const fw0 = S.rts.fwd.slice();
  await T.down(10, cx - 70, cy); await T.down(11, cx + 70, cy);
  for (let i = 1; i <= 10; i++){ const a = i * 0.06; await T.move(10, cx - 70 * cos(a), cy - 70 * sin(a)); await T.move(11, cx + 70 * cos(a), cy + 70 * sin(a)); await sleep(16); }
  await T.up(11); await T.up(10); await sleep(200);
  const rot = acos(clamp(dot(fw0, S.rts.fwd), -1, 1)) * 180 / PI;
  ok('twist_rotate', rot > 10, +rot.toFixed(1));
  // рамка
  const bb = c2('#m67rail [data-t="box"]'); await T.tap(bb[0], bb[1]); await sleep(150);
  ok('box_on', TOUCH.boxMode);
  S.sel.clear(); rtsLookAt(leaderPos(sq)); await sleep(1000); sp = project(leaderPos(sq));
  if (sp){ await T.drag(8, sp[0] - 90, sp[1] - 70, sp[0] + 90, sp[1] + 70, 8); await T.up(8); await sleep(300); }
  ok('box_select', selGroups().length > 0 && !TOUCH.boxMode, selGroups().length);
  // инженер → панель стройки открывается, снятие выделения → закрывается
  const eb = c2('#m67rail [data-t="builder"]'); await T.tap(eb[0], eb[1]); await sleep(700);
  ok('builder_side_open', selBuilders().length > 0 && !P64.min && getComputedStyle($('side')).display !== 'none');
  layout('rts_builder'); await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_rts_builder.jpg`);
  S.sel.clear(); S.selB = null; await sleep(700);
  ok('builder_side_closes', P64.min);
  // ☰ в стратегии
  await T.tap(mb[0], mb[1]); await sleep(250);
  ok('rts_sheet', M67.open && $('m67sheet').classList.contains('rts') && $('m67sheet').querySelectorAll('.rgrid button').length >= 4);
  await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_rts_sheet.jpg`);
  const pz = $('m67sheet').querySelector('.pz').getBoundingClientRect(); await T.tap(pz.left + pz.width / 2, pz.top + pz.height / 2); await sleep(400);
  ok('pause_menu', MENU.isOpen());
  await shot(`D:/AI/pm_v6/shots/v68phHE_${tag}_pause.jpg`);
  MENU.resume ? MENU.resume() : MENU.back(); await sleep(400);
  // обратно в бой «▶ В бой»
  if (MENU.isOpen()) MENU.back(); await sleep(300);
  const bb2 = c2('#touch [data-t="map"]'); if (bb2){ await T.tap(bb2[0], bb2[1]); await sleep(1500); }
  ok('back_to_fps', S.mode === 'fps');
  out.info.fps = +fpsVal.toFixed(1);
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); }
PROG.allUnlocked = SET.unlockAll;
return out;

} finally { MENU.save = save0; SET.lang = 'ru'; MENU.applyLang(); }
