// v7.2: быстрая проверка — меню обучения и старт
const R = {};
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.show('main'); await sleep(200);
  R.ver = (document.querySelector('#screen .sub') || {}).textContent;
  document.getElementById('m_tutorial').click(); await sleep(300);
  R.cur = MENU.cur; R.tiles = [...document.querySelectorAll('[data-t72go]')].map(b => b.dataset.t72go);
  await shot('D:/AI/pm_v6/shots/v72_menu_probe.jpg');
  R.start = T72.start(TOUCH.on ? 'ph_fps' : 'pc_fps'); await sleep(1500);
  R.on = T72.on; R.steps = T72.steps; R.mode = S.mode; R.enemies = S.units.filter(u => u.team === 1).length;
  await shot('D:/AI/pm_v6/shots/v72_probe_fps.jpg');
  T72.stop(); MENU.toMenu(); await sleep(300);
  T72.start(TOUCH.on ? 'ph_rts' : 'pc_rts'); await sleep(1500);
  R.rsteps = T72.steps; R.rmode = S.mode;
  await shot('D:/AI/pm_v6/shots/v72_probe_rts.jpg');
  T72.act('exit'); await sleep(300); R.after = [MENU.cur, T72.on];
} catch (e){ R.err = String(e && e.stack || e).slice(0, 800); }
return R;
