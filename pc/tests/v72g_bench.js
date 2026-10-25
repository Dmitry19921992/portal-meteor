// v7.2gfx: FPS «v7.1 / новая» на одной странице, попеременно (бой на Полигоне — самая тяжёлая сцена; стратегия)
const R = { pc: !TOUCH.on, q: S.quality, rounds: [] };
const meas = async ms => { await sleep(900); const f = []; let acc = 0, n = 0; const f0 = frame; const end = performance.now() + ms; while (performance.now() < end){ await sleep(500); f.push(fpsVal); } return +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1); };
try {
  MENU.pause = function(){};
  if (!TOUCH.on){ SET.quality = 2; SET.bounces = 4; SET.distort = true; applySettings(); S.autoRes = false; S.scale = 1; resize(); R.q = S.quality; }
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (typeof CUR !== 'undefined') CUR.off = true;
  DEV.start(); await sleep(300); if (!TOUCH.on){ S.autoRes = false; S.scale = 1; resize(); }
  POLY71.start(); await sleep(8000);
  POLY71.possess(); MENU.close(); S.paused = false; await sleep(1200);
  for (let r = 0; r < 3; r++){
    const o = {};
    for (const v of [false, true]){
      GFX72.set(v);
      if (!S.me || !S.me.alive){ POLY71.possess(); MENU.close(); S.paused = false; await sleep(600); }
      if (S.kit) S.kit.mag[S.kit.w] = 999; mouseL = true;
      if (r === 1 && S.cam){ for (let k = 0; k < 4; k++) fxExplosion(surfacePoint(norm(add(S.cam.pos, mul(randUnit(), 25))), 0.3), 2 + k); }
      o[v ? 'new' : 'old'] = await meas(3500); mouseL = false;
    }
    R.rounds.push(o);
  }
  enterRTS(); await sleep(500);
  for (const v of [false, true, false, true]){ GFX72.set(v); R['rts_' + (v ? 'new' : 'old') + (R['rts_' + (v ? 'new' : 'old')] !== undefined ? '2' : '')] = await meas(3000); }
  GFX72.set(true);
  R.scale = S.scale; R.stats = GFX72.stats; R.postK = GFX72.postK();
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
