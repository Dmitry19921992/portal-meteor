// v7.5 3D-модели окружения: дымовой тест — модели расставлены, подгружаются, рисуются; кадры у ближайших моделей
const R = { steps: [] };
const P = 'D:/AI/pm_v6/shots75rel/t/v75a/smoke_';
try {
  SET.lang = 'ru'; SET.hintsOn = false; SET.as75 = true;
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (typeof CUR !== 'undefined') CUR.off = true;
  if (MENU.cur && MENU.close) MENU.close(); S.paused = false;
  const cl = $('clicklock'); if (cl) cl.style.visibility = 'hidden';
  await sleep(3000);
  R.info0 = AS75.info();
  // камера у трёх разных классов моделей
  for (const cls of ['ruin', 'wreck', 'camp', 'nature']){
    const it = AS75.near(S.me ? S.me.pos : [0, RM, 0], 1, cls)[0];
    if (!it) { R.steps.push(cls + ': нет'); continue; }
    const t1 = anyTangent(it.Y), back = add(it.cen, add(mul(t1, it.rr * 2.6 + 3), mul(it.Y, it.rr * 0.9 + 1.5)));
    S.camOverride = { pos: back, look: it.cen };
    for (let i = 0; i < 40 && !(AS75.M[it.key + '_lod0'] && AS75.M[it.key + '_lod0'].st === 2); i++) await sleep(150);
    await sleep(500);
    await shot(P + cls + '.jpg');
    R.steps.push([cls, it.key, AS75.info()]);
  }
  S.camOverride = null;
  R.info1 = AS75.info();
  R.col = (() => { const it = AS75.items.find(i => i.col); if (!it) return 'нет'; return { key: it.key, inside: mapJS(it.cen[0], it.cen[1], it.cen[2]) } })();
  SET.as75 = false; await sleep(400); R.off = { col: AS75.colOn, drawn: AS75.stats.drawn };
  await sleep(400);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
