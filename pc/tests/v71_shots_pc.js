// v7.1: кадры «Полигона» на ПК (для листа скриншотов)
const P = 'D:/AI/pm_v6/shots/v71s_';
const R = {};
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (typeof CUR !== 'undefined') CUR.off = true;
  DEV.start(); await sleep(600);
  DEV.panel(true); await sleep(300); await shot(P + 'pc_arsenal.jpg');
  POLY71.start(); DEV.panel(false); await sleep(12000);
  enterRTS(); flyCamTo(mul(POLY71.c, RM)); S.rts.hT = 95; await sleep(3500);
  S.sel.clear(); await shot(P + 'pc_poly_rts.jpg');
  enterFPS(); switchUnit(1); await sleep(400);
  const cl = $('clicklock'); if (cl) cl.style.visibility = 'hidden'; S.paused = false;
  await sleep(2500); await shot(P + 'pc_poly_fps.jpg');
  if (cl) cl.style.visibility = '';
  R.ok = 1; R.slots = POLY71.slots.length;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
