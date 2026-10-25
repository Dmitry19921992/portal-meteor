// v7.1: телефон — стратегия: тапы, удержание (радиальное меню / рамка), 2× тап, щипок, кнопки у края (настоящие касания CDP)
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const rect = el => el.getBoundingClientRect();
const vis = el => { if (!el) return false; const r = rect(el), cs = getComputedStyle(el); return r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
const cen = el => { const r = rect(el); return [r.left + r.width / 2, r.top + r.height / 2]; };
const tag = 'D:/AI/pm_v6/shots/v71_' + (innerWidth < 900 ? 'p2' : innerWidth < 920 ? 'and' : 'ip') + '_';
const tapEl = async (el, ms) => { const [x, y] = cen(el); await T.tap(x, y, ms || 70); await sleep(180); };
let vib = 0; try { navigator.vibrate = ms => { vib++; return true; }; } catch (e){}
const scr = p => { const s = project(p); return s && s[0] > 60 && s[0] < innerWidth - 60 && s[1] > 60 && s[1] < innerHeight - 60 ? s : null; };
try {
  try { localStorage.removeItem('pm_v71m'); localStorage.removeItem('pm_v71g'); } catch (e){} Object.assign(M71.pref, { v70: false, auto: false, look: 'swipe', gest: 'A', pinch: 'gren', box2: false, hud: true, mmR: true }); M71.done = {}; M71.apply();
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1200);
  if (typeof CUR !== 'undefined') CUR.off = true;
  enterRTS(); await sleep(1200);
  const sqs = groupsOf(0).filter(isSquad);
  const g0 = sqs[0]; flyCamTo(leaderPos(g0)); S.rts.hT = S.rts.h = 70; await sleep(1500);
  // --- кнопки у края: в экране, вне выреза, без наложений
  { const S0 = M67.safe, W = innerWidth, H = innerHeight;
    const els = [...document.querySelectorAll('#m71rail button'), ...[...document.querySelectorAll('#m71sq button')].filter(vis), $('m71mmb'), document.querySelector('#touch .tt .m67m')].filter(vis);
    const bad = els.filter(e => { const r = rect(e); return r.left < S0.l - 1 || r.right > W - S0.r + 1 || r.bottom > H - S0.b + 1; }).map(e => e.dataset.k || e.className);
    let ov = null; for (let i = 0; i < els.length && !ov; i++) for (let j = i + 1; j < els.length; j++){ const a = rect(els[i]), b = rect(els[j]); if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1){ ov = [els[i].dataset.k || els[i].className, els[j].dataset.k || els[j].className]; break; } }
    ok('rail_8', document.querySelectorAll('#m71rail button').length === 8 && vis($('m71rail')));
    ok('edge_safe', !bad.length, bad); ok('edge_no_overlap', !ov, ov); }
  // --- кнопки типов
  { await tapEl(document.querySelector('#m71rail [data-k="inf"]'));
    ok('type_inf', selGroups().length === sqs.length && selGroups().every(isSquad), [selGroups().length, sqs.length]);
    await tapEl(document.querySelector('#m71rail [data-k="veh"]'));
    ok('type_veh', selGroups().length > 0 && selGroups().every(g => g.cls === 'tank'), selGroups().length);
    await tapEl(document.querySelector('#m71rail [data-k="drones"]'));
    ok('type_drones', selGroups().length > 0 && selGroups().every(g => g.cls === 'drone'), selGroups().length);
    await tapEl(document.querySelector('#m71rail [data-k="eng"]'));
    ok('type_eng', selGroups().length > 0 && selGroups().every(g => g.cls === 'builder'), selGroups().length); }
  // --- карточки отрядов: тап — выбрать, 2× тап — камера
  { const c1 = document.querySelector('#m71sq button'); await tapEl(c1);
    ok('card_select', selGroups().length === 1 && selGroups()[0] === sqs[0]);
    const [x, y] = cen(c1); await T.tap(x, y, 50); await sleep(90); await T.tap(x, y, 50); await sleep(200);
    ok('card_dbl_cam', !!S.camFly || dist(rtsFocusPoint(), leaderPos(sqs[0])) < 60); await sleep(1200); }
  // --- тап по своему бойцу — выбрать
  S.sel.clear(); await sleep(200);
  { const L = leaderPos(g0), s = scr(L);
    if (s){ await T.tap(s[0], s[1], 60); await sleep(200); }
    ok('tap_select', s && selGroups().length === 1 && selGroups()[0] === g0, [!!s, selGroups().length]);
    // тап по земле — приказ
    const gx = innerWidth * 0.42, gy = innerHeight * 0.38, goal0 = g0.goal && g0.goal.slice();
    await T.tap(gx, gy, 60); await sleep(250);
    ok('tap_ground_order', g0.order === 'move' || g0.order === 'cap', [g0.order]);
    const gp0 = pickGround(gx, gy);
    ok('tap_ground_goal', g0.goal && gp0 && dist(g0.goal, gp0) < 40, g0.goal && gp0 && dist(g0.goal, gp0)); }
  // --- тап по врагу — атака
  { const p = pickGround(innerWidth * 0.55, innerHeight * 0.45), sq = spawnSquad(1, false, p, 1), e = sq.units[0]; e.seen[0] = 99; e.hp = e.maxhp = 5000; e.dummy = true; e.dPos = e.pos.slice(); DEV.dummies.push(e); DEV.match = true;
    await sleep(300); S.sel.clear(); S.sel.add(g0); const s = scr(e.pos);
    if (s){ await T.tap(s[0], s[1], 60); await sleep(250); }
    ok('tap_enemy_attack', s && g0.order === 'focus' && g0.focus === e, [!!s, g0.order]); }
  // --- 2× тап по бойцу — все такие на экране
  { const vis2 = sqs.filter(g => scr(leaderPos(g)) && !isNaN(1)); S.sel.clear(); await sleep(50);
    const s = scr(leaderPos(g0));
    if (s){ await T.tap(s[0], s[1], 50); await sleep(100); await T.tap(s[0], s[1], 50); await sleep(250); }
    ok('dtap_all_type', s && selGroups().length >= max(1, vis2.length) && selGroups().every(isSquad), [vis2.length, selGroups().length]); }
  // --- удержание на земле — радиальное меню; «Стоять»
  let gp = null; for (const fy of [0.3, 0.36, 0.42, 0.48]) for (const fx of [0.3, 0.36, 0.42, 0.48, 0.54, 0.6]){ const x = innerWidth * fx, y = innerHeight * fy; if (!gp && !pickEntity(x, y, true) && document.elementFromPoint(x, y) === canvas && pickGround(x, y)) gp = [x, y]; }
  R.gp = gp;
  { S.sel.clear(); S.sel.add(g0); const [x, y] = gp || [innerWidth * 0.36, innerHeight * 0.42];
    await T.down(3, x, y); await sleep(600); const ring = vis($('m71ring')); await T.up(3); await sleep(250);
    const items = [...document.querySelectorAll('#m71rad.open .m71ri')];
    ok('hold_radial', ring && items.length === 6, [ring, items.length]);
    await shot(tag + 'rts_radial.jpg');
    const hb = items.find(b => /Стоять/.test(b.textContent)); if (hb) await tapEl(hb);
    ok('radial_hold', g0.order === 'hold' && !document.querySelector('#m71rad.open'), g0.order); }
  // --- радиальное: патруль
  { S.sel.clear(); S.sel.add(g0); const x = innerWidth * 0.45, y = innerHeight * 0.4;
    await T.down(3, x, y); await sleep(600); await T.up(3); await sleep(250);
    const pb = [...document.querySelectorAll('#m71rad.open .m71ri')].find(b => /Патруль/.test(b.textContent)); if (pb) await tapEl(pb);
    ok('radial_patrol', !!g0.pat71 && g0.order === 'move', g0.order); }
  // --- удержание на своём бойце — способности и «Вселиться»
  { await sleep(300); const s = scr(leaderPos(g0));
    if (s){ await T.down(3, s[0], s[1]); await sleep(600); await T.up(3); await sleep(250); }
    const items = [...document.querySelectorAll('#m71rad.open .m71ri')];
    ok('unit_radial', items.length >= 4 && /Вселиться/.test(items[0].textContent), items.map(b => b.textContent.slice(0, 8)));
    M71.radClose(); }
  // --- удержать и тянуть — рамка
  { S.sel.clear(); const L = leaderPos(g0), s = scr(L);
    if (s){ await T.down(4, s[0] - 70, s[1] - 60); await sleep(520); for (let i = 1; i <= 8; i++){ await T.move(4, s[0] - 70 + i * 18, s[1] - 60 + i * 15); await sleep(16); } await T.up(4); await sleep(250); }
    ok('hold_drag_box', s && selGroups().includes(g0), [!!s, selGroups().length]); }
  // --- щипок — масштаб, поворот
  { const h0 = S.rts.h, f0 = S.rts.fwd.slice(), cx = innerWidth / 2, cy = innerHeight / 2;
    await T.down(5, cx - 40, cy); await T.down(6, cx + 40, cy); await sleep(40);
    for (let i = 1; i <= 6; i++){ await T.move(5, cx - 40 - i * 10, cy); await T.move(6, cx + 40 + i * 10, cy); await sleep(16); }
    await T.up(5); await T.up(6); await sleep(200);
    ok('pinch_zoom', S.rts.h < h0 * 0.9, [h0, S.rts.h]);
    await T.down(5, cx - 60, cy); await T.down(6, cx + 60, cy); await sleep(40);
    for (let i = 1; i <= 6; i++){ const a = i * 0.08; await T.move(5, cx - 60 * cos(a), cy - 60 * sin(a)); await T.move(6, cx + 60 * cos(a), cy + 60 * sin(a)); await sleep(16); }
    await T.up(5); await T.up(6); await sleep(200);
    ok('twist_rotate', dot(f0, S.rts.fwd) < 0.999, dot(f0, S.rts.fwd)); }
  // --- рамка двумя пальцами (настройка)
  { M71.pref.box2 = true; S.sel.clear(); await sleep(200); const s = scr(leaderPos(g0));
    if (s){ await T.down(7, s[0] - 60, s[1] - 50); await T.down(8, s[0] + 60, s[1] + 50); await sleep(60); await T.move(8, s[0] + 70, s[1] + 55); await sleep(60); await T.up(8); await T.up(7); await sleep(250); }
    ok('box2', s && selGroups().includes(g0), [!!s, selGroups().length]);
    ok('zoom_btns', vis($('m71zi')) && vis($('m71zo')));
    const h0 = S.rts.hT; await tapEl($('m71zi')); ok('zoom_in_btn', S.rts.hT < h0, [h0, S.rts.hT]);
    M71.pref.box2 = false; }
  // --- следить, миникарта
  { S.sel.clear(); S.sel.add(g0); await tapEl(document.querySelector('#m71rail [data-k="follow"]'));
    await sleep(500); ok('follow', M71.follow && dist(rtsFocusPoint(), leaderPos(g0)) < 25, dist(rtsFocusPoint(), leaderPos(g0)));
    await tapEl(document.querySelector('#m71rail [data-k="follow"]'));
    await tapEl($('m71mmb')); ok('mm_hide', !M71.pref.mmR && mmCenters()[0][0] < 0);
    await tapEl($('m71mmb')); ok('mm_show', M71.pref.mmR && mmCenters()[0][0] > 0); }
  // --- рамка-кнопка
  { await tapEl(document.querySelector('#m71rail [data-k="box"]')); ok('box_btn', TOUCH.boxMode); await tapEl(document.querySelector('#m71rail [data-k="box"]')); }
  await shot(tag + 'rts.jpg');
  ok('haptic', vib > 2, vib);
  R.fps = Math.round(fpsVal);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
