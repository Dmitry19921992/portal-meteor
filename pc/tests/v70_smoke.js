// v7.0: быстрый дым-тест. node cdp70.js v70_smoke.js --vp 1280x720 --reload
const R = {};
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500);
  R.ros = [0, 1].map(t => ({ sq: S.squads.filter(s => s.team === t).length, veh: S.vehicles.filter(v => v.team === t).map(v => v.vk || 'tank').join(','), dr: S.drones.filter(d => d.team === t).length, roles: [...new Set(S.units.filter(u => u.team === t).map(u => u.role))].join(',') }));
  DEV.enter(); await sleep(300);
  DEV.outpost70('def'); await sleep(200); DEV.outpost70('sup'); await sleep(200); DEV.outpost70('rec'); await sleep(200);
  DEV.hqAll(); await sleep(500);
  R.items = BASE70.items().length;
  enterRTS(); await sleep(800);
  S.selB = DEV.op70; flyCamTo(DEV.op70.pos); await sleep(1500);
  R.card = !!document.querySelector('#card .u70');
  await shot('D:/AI/pm_v6/shots/v70_smoke_rts.jpg');
  R.st70 = { ok: ST70.ok(), err: ST70.err, drawn: ST70.stats.drawn, tris: ST70.stats.tris, ms: +ST70.stats.ms.toFixed(3) };
  enterFPS(); await sleep(1500);
  DEV.blast70(3); await sleep(300);
  R.kd = ctrlEntity() && ctrlEntity().kd70 ? ctrlEntity().kd70.lv : null;
  await shot('D:/AI/pm_v6/shots/v70_smoke_kd.jpg');
  await sleep(2000);
  R.fps = fpsVal;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
