// v7.0: сохранение и загрузка — ветки форпостов, улучшения штаба, падение. node cdp70.js v70_save.js --vp 1280x720 --reload
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500);
  let d0 = null; for (let k = 0; k < 24; k++){ const d = offsetOnSphere(BASES[0], rotAxis(anyTangent(BASES[0]), BASES[0], 1 + k * 0.06), 85 + (k % 4) * 10); d0 = d0 || d; if (!siteProblem(0, 'outpost', d)){ d0 = d; break; } }
  const b = makeBuilding('outpost', 0, d0); finishSite(b);
  Object.assign(BASE70.tw(b), { br: 'sup', tier: 2, job: null });
  const U = BASE70.hqu(0); U.done.income = true; U.done.turrets = true; U.job = { k: 'radar', t: 5, T: 35, cost: 300 };
  const u = S.units.find(x => x.team === 0 && x.alive && x !== ctrlEntity()); KD70.hit(u, 3, add(u.pos, mul(u.fwd, 1)));
  await sleep(800);
  ok('save', SAVE.save('s9') === true);
  SAVE.load('s9'); await sleep(1500);
  const b2 = S.buildings.find(x => x.alive && x.type === 'outpost' && x.tw70 && x.tw70.br === 'sup');
  ok('load_outpost', b2 && b2.tw70.tier === 2 && !b2.tw70.job, b2 && b2.tw70);
  const U2 = S.hq[0].up70;
  ok('load_hq', U2 && U2.done.income && U2.done.turrets && U2.job && U2.job.k === 'radar', U2);
  ok('load_effects', BASE70.hasHQ(0, 'income') && BASE70.domes.some(d => d.b === b2), BASE70.domes.length);
  ok('load_render', BASE70.items().length > 5);
  try { SAVE.del('s9'); } catch (e){}
  R.fps = Math.round(fpsVal);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
