// v7.5 «Денди»: подбор цвета — один и тот же замороженный кадр в разных вариантах
const R = {};
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
const O = 'D:/AI/pm_v6/shots/v75d_t_';
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; SET.hintsOn = false; SET.atm74 = false; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(2500);
  if (MENU.cur && MENU.close) MENU.close();
  S.paused = true; const cl = document.getElementById('clicklock'); if (cl) cl.style.display = 'none';
  const snap = async n => { await sleep(600); await shot(O + n + '.jpg'); };
  DEN75.set(1);
  const V = [
    ['d', [1, 1.6, 0.9], 0.1, [0.35, 0.7, 1.5]],
    ['e', [1.1, 1.7, 0.85], 0.1, [0.3, 0.6, 1.2]],
    ['f', [1, 1.9, 0.95], 0.08, [0.3, 0.65, 1.5]],
    ['g', [1.15, 1.6, 1], 0.1, [0.4, 0.8, 1.5]],
  ];
  for (const [n, g, d, l] of V){ DEN75.gain = g; DEN75.dith = d; DEN75.lit = l; DEN75.uKey = ''; await snap('v' + n); }
  enterRTS(); await sleep(1200);
  for (const [n, g, d, l] of V){ DEN75.gain = g; DEN75.dith = d; DEN75.lit = l; DEN75.uKey = ''; await snap('r' + n); }
  DEN75.set(0); await snap('r0');
  R.ok = true;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
R.errs = errs;
return R;
