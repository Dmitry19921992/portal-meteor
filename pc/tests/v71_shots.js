// v7.1: кадры для листа скриншотов (телефон)
const P = 'D:/AI/pm_v6/shots/v71s_';
const R = {};
try {
  try { localStorage.removeItem('pm_v71m'); } catch (e){}
  Object.assign(M71.pref, { v70: false, auto: false, look: 'swipe', gest: 'A', pinch: 'gren', box2: false, hud: true, mmR: true }); M71.done = { look: 1, jet: 1, auto: 1, dtap: 1, gswipe: 1, pinch: 1, rtap: 1, rhold: 1, rpinch: 1 }; M71.apply();
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(400);
  await shot(P + 'menu.jpg');
  MENU.show('p71lang', true); await sleep(300); await shot(P + 'lang.jpg');
  MENU.show('settings', true); await sleep(200); MENU.show('p71s_gfx', true); await sleep(300); await shot(P + 'gfx.jpg');
  MENU.newGame(); if (TUT.on) TUT.finish(); DEV.enter(); DEV.match = false; DEV.on = false; DEV.ui(); await sleep(1500);
  if (typeof CUR !== 'undefined') CUR.off = true;
  for (const u of S.units) if (u.team === 1 && !u.dummy) u.pos = mul(BASES[1], RM + 2);
  const me = ctrlEntity(), right = norm(cross(me.fwd, me.up));
  const mk = (ahead, side) => { const p = surfacePoint(norm(add(add(me.pos, mul(tangent(me.fwd, me.up), ahead)), mul(right, side))), 1); const sq = spawnSquad(1, false, p, 1), u = sq.units[0]; u.dummy = true; u.dPos = u.pos.slice(); u.hp = u.maxhp = 6000; DEV.dummies.push(u); u.seen[0] = 99; return u; };
  const a = mk(12, -2), b = mk(15, 6);
  me.fwd = norm(tangent(sub(a.pos, me.pos), me.up));
  M71.pref.auto = true; M71.apply(); M71.sk = true; M71.apply(); await sleep(1600);
  await shot(P + 'fps_lock.jpg'); R.lock = !!M71.lock;
  M71.sk = false; M71.apply(); M71.done.frame = 0; delete M71.done.frame; M71.modeT = 5; await sleep(900); await shot(P + 'fps_hint.jpg');
  M71.pref.auto = false; M71.apply();
  enterRTS(); await sleep(1200);
  const g0 = groupsOf(0).find(isSquad); flyCamTo(leaderPos(g0)); S.rts.hT = S.rts.h = 70; await sleep(1600);
  S.sel.clear(); S.sel.add(g0); await sleep(300);
  let gp = null; for (const fy of [0.42, 0.36, 0.48]) for (const fx of [0.42, 0.36, 0.48, 0.54]){ const x = innerWidth * fx, y = innerHeight * fy; if (!gp && !pickEntity(x, y, true) && document.elementFromPoint(x, y) === canvas) gp = [x, y]; }
  M71.radOpenAt(gp[0], gp[1]); await sleep(400); await shot(P + 'rts_radial.jpg'); M71.radClose();
  M67.toggleSheet(true); M71.page = 'set'; M71.sheetPage(); await sleep(300); await shot(P + 'sheet.jpg'); M67.toggleSheet(false);
  R.ok = 1;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
