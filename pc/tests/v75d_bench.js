// v7.5 «Денди»: FPS «Обычный / Денди 180 / Денди 120 / 16-бит 240» на одной странице, попеременно.
// ПК: качество «высокое», масштаб 1.0 без авторазрешения (как bench72g). Телефон: настройки телефона по умолчанию.
const R = { pc: !TOUCH.on, rounds: [] };
const meas = async ms => { await sleep(1200); const f = []; const end = performance.now() + ms; while (performance.now() < end){ await sleep(500); f.push(fpsVal); } return +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1); };
const MODES = [['normal', 0, 0], ['dendy180', 1, 180], ['dendy120', 1, 120], ['bit16_240', 2, 240]];
const setM = m => { SET.denStyle = m[1]; SET.denRows = m[2]; applySettings(); if (!TOUCH.on && !m[1]){ S.autoRes = false; S.scale = 1; resize(); } };
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  MENU.pause = function(){};
  SET.hintsOn = false;
  if (!TOUCH.on){ SET.quality = 2; SET.bounces = 4; SET.distort = true; SET.autoRes = false; SET.scale = 1; SET.lite = false; }
  applySettings();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (typeof CUR !== 'undefined') CUR.off = true;
  if (MENU.cur && MENU.close) MENU.close(); S.paused = false;
  R.lite = LITE73.on; R.q = S.quality;
  for (let r = 0; r < 2; r++){
    const o = {};
    for (const m of MODES){
      setM(m);
      if (!S.me || !S.me.alive){ try { autoSwitch(); } catch (e){} }
      if (r === 1 && S.cam){ for (let k = 0; k < 3; k++) fxExplosion(surfacePoint(norm(add(S.cam.pos, mul(S.cam.fwd, 15 + k * 6))), 0.3), 2 + k); }
      o[m[0]] = await meas(3000);
      if (m[1]) o[m[0] + '_px'] = canvas.width + 'x' + canvas.height + ' post ' + DEN75.stats.ms.toFixed(2) + 'ms';
      else o.normal_px = canvas.width + 'x' + canvas.height;
    }
    R.rounds.push(o);
  }
  enterRTS(); await sleep(600);
  const rt = {};
  for (const m of MODES){ setM(m); rt[m[0]] = await meas(3000); }
  R.rts = rt;
  setM(MODES[0]);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
