// v7.1: снимки телефона — новая раскладка (смоук)
const tag = 'D:/AI/pm_v6/shots/v71b_' + (innerWidth < 900 ? 'p2' : innerWidth < 920 ? 'and' : 'ip') + '_';
const R = {};
try {
  try { localStorage.removeItem('pm_v71m'); localStorage.removeItem('pm_v71g'); } catch (e){}
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); MENU.show('main');
  R.m71 = typeof M71 !== 'undefined' && M71.active();
  await sleep(300); await shot(tag + 'menu.jpg');
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(2500);
  await shot(tag + 'fps.jpg');
  M71.pref.auto = true; M71.apply(); M71.sk = true; M71.apply();
  // враг перед носом
  const me = ctrlEntity(); const p = surfacePoint(norm(add(me.pos, mul(me.fwd, 22))), 1);
  const sq = spawnSquad(1, false, p, 3); for (const u of sq.units){ u.dummy = true; u.dPos = u.pos.slice(); DEV.dummies.push(u); }
  DEV.match = true;
  await sleep(1500);
  R.lock = !!M71.lock; R.fr = M71.fr.rect;
  await shot(tag + 'fps_lock.jpg');
  M71.sk = false; M71.apply();
  enterRTS(); await sleep(1500);
  S.sel.clear(); S.sel.add(groupsOf(0).find(isSquad)); await sleep(600);
  M71.radOpenAt(innerWidth * 0.45, innerHeight * 0.55); await sleep(400);
  R.rad = document.querySelectorAll('#m71rad .m71ri').length;
  await shot(tag + 'rts_rad.jpg');
  M71.radClose();
  MENU.pause(); await sleep(400); await shot(tag + 'pause.jpg');
  MENU.show('settings', true); await sleep(300); await shot(tag + 'settings.jpg');
  MENU.show('p71lang', true); await sleep(300); await shot(tag + 'lang.jpg');
  MENU.show('p71s_gfx', true); await sleep(300); await shot(tag + 'gfx.jpg');
  MENU.show('p71s_ctl', true); await sleep(300); await shot(tag + 'ctl.jpg');
  MENU.close(); S.paused = false; enterFPS(); await sleep(800);
  M67.toggleSheet(true); M71.page = 'set'; M71.sheetPage(); await sleep(300); await shot(tag + 'sheet_set.jpg');
  M71.page = 'pos'; M71.sheetPage(); await sleep(200); await shot(tag + 'sheet_pos.jpg');
  M71.page = 'act'; M71.sheetPage(); await sleep(200); await shot(tag + 'sheet_act.jpg');
  M67.toggleSheet(false);
  R.fps = Math.round(fpsVal);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
