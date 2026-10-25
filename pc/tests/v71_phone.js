// v7.1: телефон — шутер: раскладка, «АВТО», рамка, жесты (настоящие касания CDP).  node cdp71.js v71_phone.js --phone --reload  (--android, --phone2)
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const rect = el => el.getBoundingClientRect();
const vis = el => { if (!el) return false; const r = rect(el), cs = getComputedStyle(el); return r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
const cen = el => { const r = rect(el); return [r.left + r.width / 2, r.top + r.height / 2]; };
const tag = 'D:/AI/pm_v6/shots/v71_' + (innerWidth < 900 ? 'p2' : innerWidth < 920 ? 'and' : 'ip') + '_';
const tapEl = async (el, ms) => { const [x, y] = cen(el); await T.tap(x, y, ms || 70); await sleep(160); };
let vib = 0; try { const v0 = navigator.vibrate ? navigator.vibrate.bind(navigator) : null; navigator.vibrate = ms => { vib++; return v0 ? v0(ms) : true; }; } catch (e){}
const face = (me, p) => { me.fwd = norm(tangent(sub(p, me.pos), me.up)); };
const dummy = (me, ahead, side) => {
  const right = norm(cross(me.fwd, me.up));
  const p = surfacePoint(norm(add(add(me.pos, mul(tangent(me.fwd, me.up), ahead)), mul(right, side || 0))), 1);
  const sq = spawnSquad(1, false, p, 1); const u = sq.units[0];
  u.dummy = true; u.dPos = u.pos.slice(); u.hp = u.maxhp = 6000; DEV.dummies.push(u); u.seen[0] = 99;
  return u;
};
try {
  try { localStorage.removeItem('pm_v71m'); localStorage.removeItem('pm_v71g'); } catch (e){} Object.assign(M71.pref, { v70: false, auto: false, look: 'swipe', gest: 'A', pinch: 'gren', box2: false, hud: true, mmR: true }); M71.done = {}; M71.apply();
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); DEV.enter(); await sleep(1500);
  for (const u of S.units) if (u.team === 1 && !u.dummy){ u.pos = mul(BASES[1], RM + 2); }
  ok('m71_active', TOUCH.on && M71.active() && document.body.classList.contains('m71'));
  M71.pref.auto = false; M71.apply(); await sleep(400);
  const me = ctrlEntity();
  // --- раскладка: всё в экране, вне выреза, без наложений
  { const S0 = M67.safe, W = innerWidth, H = innerHeight;
    const els = ['[data-s="LF"]', '[data-s="LJ"]', '.g62b', '[data-s="R2"]', '[data-s="R3"]', '#m71auto', '#m71hudb', '#m71skb', '.tt [data-t="map"]', '.tt .m67m', '.tt .m67n'].map(s => document.querySelector('#touch ' + s)).filter(vis);
    const bad = els.filter(e => { const r = rect(e); return r.left < S0.l - 1 || r.right > W - S0.r + 1 || r.bottom > H - S0.b + 1 || r.top < 0; }).map(e => e.className + e.id);
    let ov = null; for (let i = 0; i < els.length && !ov; i++) for (let j = i + 1; j < els.length; j++){ const a = rect(els[i]), b = rect(els[j]); if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1){ ov = [els[i].className || els[i].id, els[j].className || els[j].id]; break; } }
    ok('layout_count', els.length >= 10, els.length); ok('layout_safe', !bad.length, bad); ok('layout_no_overlap', !ov, ov);
    const lf = document.querySelector('#touch [data-s="LF"]'), lj = document.querySelector('#touch [data-s="LJ"]');
    ok('left_fire_jet', lf && lj && cen(lf)[0] < W / 2 && cen(lj)[0] < W / 2);
    ok('icons_svg', document.querySelectorAll('#touch .tf.fps > button[data-s] svg.ic71').length >= 5); }
  await shot(tag + 'fps.jpg');
  // --- левая «Огонь»: держать — стреляет
  { const lf = document.querySelector('#touch [data-s="LF"]'), [x, y] = cen(lf);
    await T.down(3, x, y); await sleep(150); const on = mouseL; await T.up(3); await sleep(100);
    ok('left_fire_hold', on && !mouseL, [on, mouseL]); }
  // --- ранец: держать — тяга, кольцо топлива
  { const lj = document.querySelector('#touch [data-s="LJ"]'), [x, y] = cen(lj), e0 = me.energy;
    await T.down(4, x, y); await sleep(450); const held = keys[SET.bind.run]; await T.up(4); await sleep(150);
    ok('jet_hold', held && !keys[SET.bind.run] && me.energy < e0, [held, e0, me.energy]);
    ok('jet_ring', !!lj.querySelector('.rg71 circle')); }
  // --- свайп справа — обзор
  { const f0 = me.fwd.slice(), x = innerWidth * 0.7, y = innerHeight * 0.45;
    await T.drag(5, x, y, x + 120, y, 8, 16); await T.up(5); await sleep(150);
    ok('swipe_look', dot(f0, me.fwd) < 0.995, dot(f0, me.fwd)); }
  // --- обзор джойстиком
  { M71.pref.look = 'joy'; const f0 = me.fwd.slice(), x = innerWidth * 0.7, y = innerHeight * 0.45;
    await T.down(6, x, y); await sleep(50); await T.move(6, x + 45, y); await sleep(400);
    const rj = vis($('m71rj')); await T.up(6); await sleep(100);
    const f1 = me.fwd.slice(); await sleep(250);
    ok('joy_look', rj && dot(f0, f1) < 0.98 && dot(f1, me.fwd) > 0.9999, [rj, dot(f0, f1), dot(f1, me.fwd)]);
    M71.pref.look = 'swipe'; }
  // --- «АВТО»: захват ближайшего, рамка, огонь сам, кнопка огня гаснет
  const d1 = dummy(me, 16, -3), d2 = dummy(me, 16, 7);
  face(me, d1.pos); await sleep(300);
  await tapEl($('m71auto'));
  ok('auto_on', M71.pref.auto && document.body.classList.contains('m71auto'));
  await sleep(1200);
  ok('auto_lock', M71.lock === d1 || M71.lock === d2, M71.lock && M71.lock.role);
  ok('frame_rect', !!M71.fr.rect, M71.fr.rect);
  { const lf = document.querySelector('#touch [data-s="LF"]'); ok('fire_greyed', +getComputedStyle(lf).opacity < 0.5); }
  { const m0 = S.kit.mag[S.kit.w]; await sleep(700); ok('auto_fire', S.kit.mag[S.kit.w] < m0 || S.kit.reloadT > 0, [m0, S.kit.mag[S.kit.w]]); }
  await shot(tag + 'fps_lock.jpg');
  // --- свайп при захвате — соседняя цель
  { const a = M71.lock, other = a === d1 ? d2 : d1, pa = project(centerOf(a)), pb = project(centerOf(other));
    const dx = pb && pa ? Math.sign(pb[0] - pa[0]) : 1, x = innerWidth * 0.66, y = innerHeight * 0.5;
    await T.drag(7, x, y, x + dx * 70, y, 6, 16); await T.up(7); await sleep(300);
    ok('flick_next', M71.lock === other, [!!pa, !!pb, dx]); }
  // --- вариант A: тап по красной рамке — ракета
  { await sleep(300); me.rocketCd = 0; const r = M71.fr.rect; const n0 = S.proj.length;
    if (r){ await T.tap((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 60); await sleep(150); }
    ok('frame_tap_rocket', r && me.rocketCd > 0, [r, me.rocketCd]); }
  // --- вариант A: свайп «Гранаты» вверх — граната в цель
  { const K = G62.kit(); K.gren = 2; const g0 = K.gren, gb = document.querySelector('#touch .g62b'), [x, y] = cen(gb);
    ok('gren_arrow', gb.classList.contains('m71sw'));
    await T.down(8, x, y); await sleep(40); for (let i = 1; i <= 5; i++){ await T.move(8, x, y - i * 14); await sleep(16); } await T.up(8); await sleep(200);
    ok('gren_swipe', K.gren === g0 - 1 && !G62.hold, [g0, K.gren, !!G62.hold]); }
  // --- 2× тап справа — рефлекс
  { const K = S.kit; K.reflex = 1; K.reflexOn = false; let x = innerWidth * 0.64, y = innerHeight * 0.56;
    for (const [fx, fy] of [[0.64, 0.56], [0.6, 0.62], [0.68, 0.4], [0.58, 0.35]]){ const e = document.elementFromPoint(innerWidth * fx, innerHeight * fy); if (e === canvas){ x = innerWidth * fx; y = innerHeight * fy; break; } }
    await T.tap(x, y, 50); await sleep(90); await T.tap(x + 4, y + 3, 50); await sleep(150);
    ok('dtap_reflex', K.reflexOn, K.reflexOn);
    await T.tap(x, y, 50); await sleep(90); await T.tap(x, y, 50); await sleep(150); }
  // --- вариант B: щипок — граната / прицел
  { M71.pref.gest = 'B'; M71.apply(); M71.pref.pinch = 'gren'; const K = G62.kit(); K.gren = 2; await sleep(300);
    const x = innerWidth * 0.7, y = innerHeight * 0.45;
    await T.down(10, x - 20, y); await T.down(11, x + 20, y); await sleep(40);
    for (let i = 1; i <= 6; i++){ await T.move(10, x - 20 - i * 12, y); await T.move(11, x + 20 + i * 12, y); await sleep(16); }
    await T.up(10); await T.up(11); await sleep(200);
    ok('pinch_gren', K.gren === 1, K.gren);
    M71.pref.pinch = 'zoom'; await sleep(100);
    await T.down(10, x - 20, y); await T.down(11, x + 20, y); await sleep(40);
    for (let i = 1; i <= 6; i++){ await T.move(10, x - 20 - i * 12, y); await T.move(11, x + 20 + i * 12, y); await sleep(16); }
    await T.up(10); await T.up(11); await sleep(150);
    ok('pinch_zoom', TOUCH.aimOn && mouseR);
    TOUCH.aimOn = false; mouseR = false; M71.pref.gest = 'A'; M71.pref.pinch = 'gren'; M71.apply(); }
  // --- навыки вверху справа и HUD
  { await tapEl($('m71skb')); const k1 = document.querySelector('#touch [data-s="K1"]');
    ok('skills_open', document.body.classList.contains('m71sk') && vis(k1));
    await shot(tag + 'fps_skills.jpg');
    me.rocketCd = 0; if (k1) await tapEl(k1); ok('skill_rocket', me.rocketCd > 0, me.rocketCd);
    await tapEl($('m71skb')); ok('skills_close', !document.body.classList.contains('m71sk'));
    await tapEl($('m71hudb')); ok('hud_hide', document.body.classList.contains('m71hudoff') && !vis($('m67mm')));
    await tapEl($('m71hudb')); ok('hud_show', !document.body.classList.contains('m71hudoff')); }
  // --- долгое нажатие — полное название
  { const b = document.querySelector('#touch [data-s="R3"]'), [x, y] = cen(b);
    await T.down(12, x, y); await sleep(650); const t = $('m71tip'); const on = vis(t) && t.textContent.length > 3; await T.up(12); await sleep(100);
    ok('long_press_name', on, t && t.textContent); TOUCH.aimOn = false; mouseR = false; }
  // --- смена бойца: плашка, без вспышки и карточки
  { await tapEl($('m71auto')); switchUnit(1); await sleep(120);
    ok('possess_plate', $('m71pl').classList.contains('on') && S.flashT === 0 && !vis($('dcard')), [S.flashT]); }
  // --- подсказка жеста при первом запуске
  { M71.done = {}; M71.modeT = 0; await sleep(3200); const g = $('m71gh'); ok('gesture_hint', vis(g) && g.textContent.length > 4, g && g.textContent); await shot(tag + 'fps_hint.jpg'); }
  ok('haptic', vib > 0, vib);
  R.fps = Math.round(fpsVal);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
