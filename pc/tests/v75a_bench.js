// v7.5 3D-модели окружения: честная цена прохода моделей — время AS75.draw с gl.finish() до и после (GPU+CPU, мс/кадр),
// и FPS выкл/вкл попеременно (3 круга) на трёх ракурсах. Настройки ПК по умолчанию; затем «Лёгкий режим».
const R = { pass: {}, fps: {} };
const meas = async ms => { await sleep(900); const f = []; const end = performance.now() + ms; while (performance.now() < end){ await sleep(300); f.push(fpsVal); } return +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(2); };
const loaded = async () => { for (let i = 0; i < 80; i++){ await sleep(150); if (!AS75.queue.length && !AS75.loading && !AS75.pend.length && Object.values(AS75.M).every(m => m.st !== 1)) break; } await sleep(400); };
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  MENU.pause = function(){}; SET.hintsOn = false;
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (typeof CUR !== 'undefined') CUR.off = true;
  if (MENU.cur && MENU.close) MENU.close(); S.paused = false; S.third = true;
  AS75.placeStep(1e9);
  const lit = it => dot(it.dir, SUN1);
  const near = (it, d, h) => { const t = anyTangent(it.Y), q = norm(add(it.pos, mul(t, d))); return { pos: mul(q, Math.max(groundR(q), len(it.pos)) + h), look: add(it.pos, mul(it.Y, it.h * 0.4)) }; };
  // ракурс с наибольшим числом моделей в радиусе 80 м
  let bi = null, bn = -1; for (const it of AS75.items){ if (lit(it) < 0.2) continue; const n = AS75.items.filter(j => dist(j.pos, it.pos) < 80).length; if (n > bn){ bn = n; bi = it; } }
  const V = { busy: near(bi, 30, 6), ruin: near(AS75.items.find(i => i.e.p === 'ruin' && lit(i) > 0.2) || bi, 26, 3), rts: { pos: add(mul(bi.dir, RM + 90), mul(anyTangent(bi.dir), 60)), look: mul(bi.dir, RM) } };
  R.busyN = bn;
  const runSet = async tag => {
    for (const [k, v] of Object.entries(V)){
      S.camOverride = v; SET.as75 = true; await loaded();
      // проход моделей: синхронно (finish до и после) — только на время замера
      const d0 = AS75.draw; let ms = 0, n = 0;
      AS75.draw = function(){ gl.finish(); const t = performance.now(); d0.apply(this, arguments); gl.finish(); ms += performance.now() - t; n++; };
      await sleep(2500); AS75.draw = d0;
      R.pass[tag + '_' + k] = { ms: +(ms / Math.max(1, n)).toFixed(2), frames: n, drawn: AS75.stats.drawn, tris: Math.round(AS75.stats.tris), lod: AS75.stats.lod.slice() };
      for (let r = 0; r < 3; r++) for (const on of [false, true]){ SET.as75 = on; const kk = tag + '_' + k + (on ? '_on' : '_off'); const f = await meas(2500); R.fps[kk] = R.fps[kk] ? +((R.fps[kk] * r + f) / (r + 1)).toFixed(2) : f; }
    }
    R[tag + '_px'] = canvas.width + 'x' + canvas.height + ' q' + S.quality + ' lite ' + LITE73.on;
  };
  await runSet('pc');
  SET.lite = true; applySettings(); await sleep(1000);
  await runSet('lite');
  SET.lite = false; applySettings();
  S.camOverride = null; SET.as75 = true;
  R.info = AS75.info();
  R.gpu = (() => { try { const g = gl.getExtension('WEBGL_debug_renderer_info'); return g ? gl.getParameter(g.UNMASKED_RENDERER_WEBGL) : '?'; } catch (e){ return '?'; } })();
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
