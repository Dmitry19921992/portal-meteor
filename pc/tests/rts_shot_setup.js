// Подготовка сцен для скриншотов. Сцена выбирается window.SHOT (1..4) через -e перед запуском, по умолчанию 1.
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(1000); }
const scene = window.SHOT || 1;
if (!window.SHOT_INIT){
  window.SHOT_INIT = 1;
  MENU.newGame(); if (TUT.on) TUT.finish(); enterRTS();
  for (let i = 0; i < 30 * 50; i++) update(1 / 30);
}
S.sel.clear(); S.selB = null; S.place = null; ecoPopToggle(false);
const bs = teamBuilders(0);
if (scene === 1){   // чертёж мехзавода у базы
  const site = findSite(0, 'factory') || offsetOnSphere(BASES[0], [1, 0, 0], 70);
  S.rts.dir = norm(site); S.rts.h = 55; S.rts.fwd = tangent(sub(BASES[0], site), S.rts.dir);
  for (const b of bs) S.sel.add(b);
  S.teams[0].ore = max(S.teams[0].ore, 400);
  S.place = 'factory'; S.mouse = [innerWidth / 2, innerHeight / 2 + 30];
}
if (scene === 2){   // стройка в процессе, инженеры работают
  S.teams[0].ore = 3000;
  const dir = findSite(0, 'outpost');
  for (const b of bs){ b.pos = surfacePoint(offsetOnSphere(dir, anyTangent(dir), 9), ECO.HOVER); S.sel.add(b); }
  playerPlace('outpost', dir, false);
  for (let i = 0; i < 30 * 9; i++) update(1 / 30);
  S.rts.dir = norm(dir); S.rts.h = 24; S.rts.fwd = tangent(anyTangent(dir), S.rts.dir);
}
if (scene === 3){   // окно «Откуда руда»
  S.rts.dir = norm(BASES[0]); S.rts.h = 120;
  ecoPopToggle(true);
}
if (scene === 4){   // крупно: инженер и экстрактор
  const ex = S.buildings.find(b => b.team === 0 && b.type === 'extractor' && b.done) || S.buildings.find(b => b.type === 'extractor');
  if (ex){ const b = bs[0]; b.pos = surfacePoint(offsetOnSphere(ex.up, ex.R, 5), ECO.HOVER); b.order = 'repair'; b.site = ex; ex.hp = ex.maxhp * 0.6; S.sel.add(b);
    S.rts.dir = norm(offsetOnSphere(ex.up, ex.R, 2.5)); S.rts.h = 12; S.rts.fwd = tangent(ex.fwd, S.rts.dir); }
}
updateCard(); updateSidebar();
await sleep(1500);
return { scene, ore: Math.round(S.teams[0].ore), sel: S.sel.size, place: S.place, builders: bs.map(b => b.order).join(',') };
