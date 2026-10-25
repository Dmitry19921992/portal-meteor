// v7.5: проверка подгрузки моделей при открытии страницы как file:// (как Дмитрий открывает из OneDrive)
const R = { href: location.href };
try {
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (MENU.cur && MENU.close) MENU.close(); S.paused = false;
  AS75.placeStep(1e9);
  const it = AS75.items.find(i => i.e.p === 'ruin');
  S.camOverride = { pos: add(it.cen, add(mul(anyTangent(it.Y), it.rr * 2 + 6), mul(it.Y, 6))), look: it.cen };
  for (let i = 0; i < 60 && !(AS75.stats.loaded >= 2); i++) await sleep(250);
  await sleep(1500);
  R.info = AS75.info();
  S.camOverride = null;
} catch (e){ R.err = e.message; }
return R;
