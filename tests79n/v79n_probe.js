// v7.9 ninja: quick probe — match, spawn both ninjas, AI auto mode for a while, errors
const R = { steps: [] };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const warns = []; { const cw = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 400)); cw.apply(console, a); }; }
const O = 'D:/AI/pm_v6/shots_ninja/probe_';
const sim = async (sec, dt) => { dt = dt || 0.05; for (let t = 0; t < sec; t += dt){ update(dt); AU.process(S.events); } };
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  SET.denUser = true; if (typeof DEN75 !== 'undefined' && DEN75.style()) DEN75.set(0);
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (TUT.on && TUT.finish) TUT.finish();
  await sleep(300);
  R.nj = typeof NJ !== 'undefined'; R.prod = [canProduce(0, 'nj79r'), canProduce(0, 'nj79')];
  const a = NJ.spawn(0), b = NJ.spawn(1);
  R.ids = [a && a.id, b && b.id];
  await sim(30);
  R.st30 = JSON.parse(JSON.stringify(NJ.stats));
  R.alive = [a.alive, b.alive, a.hp | 0, b.hp | 0];
  R.zoneA = a.nj && a.nj.zone && a.nj.zone.name;
  takeControl(a); await sim(0.5); setupCamera(0.016); await sleep(400); await shot(O + '01.jpg');
  R.third = S.third; R.items = ST70.items.filter(i => i.nj).length; R.st70 = ST70.failed ? ST70.err : 'ok';
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 800); }
R.errs = errs.slice(0, 10); R.warns = warns.filter(w => /nj79|ST70/.test(w)).slice(0, 10);
return R;
