const LOWQ = 1;
// v7.5 «Денди»: стоимость кадра рендера (мс, с синхронизацией GPU через readPixels) — «Обычный / Денди 180 / Денди 120 / 16-бит 240»
// Не зависит от rAF и троттлинга вкладки; попеременно по 3 круга — делим влияние соседних процессов на GPU поровну.
const R = { pc: !TOUCH.on, gpu: '' };
try { const e = gl.getExtension('WEBGL_debug_renderer_info'); R.gpu = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch (e){}
const MODES = [['normal', 0, 0], ['dendy180', 1, 180], ['dendy120', 1, 120], ['bit16_240', 2, 240]];
const px = new Uint8Array(4);
const setM = m => { SET.denStyle = m[1]; SET.denRows = m[2]; applySettings(); if (!TOUCH.on && !m[1]){ S.autoRes = false; S.scale = SET.scale; resize(); } };
const cost = n => {
  let t = performance.now();
  for (let i = 0; i < n; i++){ setupCamera(0.016); render(0.016, performance.now()); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  return (performance.now() - t) / n;
};
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  MENU.pause = function(){};
  SET.hintsOn = false;
  const LOW = typeof LOWQ !== 'undefined';   // v75d_gpu_low.js: «слабый ПК» — качество низкое, масштаб 0.5
  if (!TOUCH.on){ SET.quality = LOW ? 0 : 2; SET.bounces = LOW ? 2 : 4; SET.distort = !LOW; SET.autoRes = false; SET.scale = LOW ? 0.5 : 1; SET.lite = false; }
  R.low = LOW;
  applySettings();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(3000);
  if (MENU.cur && MENU.close) MENU.close();
  R.lite = LITE73.on; R.q = S.quality; R.scaleNormal = S.scale;
  const run = async tag => {
    const acc = {}; MODES.forEach(m => acc[m[0]] = []);
    for (let r = 0; r < 3; r++) for (const m of MODES){ setM(m); cost(3); await sleep(50); acc[m[0]].push(cost(12)); await sleep(50); }
    const o = {};
    for (const m of MODES){ const a = acc[m[0]].sort((x, y) => x - y); const med = a[1]; o[m[0]] = { ms: +med.toFixed(1), fps: +(1000 / med).toFixed(1) }; }
    o.res = { normal: 0 }; setM(MODES[0]); o.res.normal = canvas.width + 'x' + canvas.height; setM(MODES[1]); o.res.dendy180 = canvas.width + 'x' + canvas.height;
    R[tag] = o;
  };
  S.paused = true;
  await run('fps');
  S.paused = false; enterRTS(); await sleep(800); S.paused = true;
  await run('rts');
  S.paused = false; setM(MODES[0]);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;

