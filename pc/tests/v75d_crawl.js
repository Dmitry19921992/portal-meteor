// v7.5 «Денди»: «ползание» пикселей при медленном повороте камеры. Камера поворачивается по 0.1 «денди-пикселя» за кадр
// (время шейдера заморожено). Для каждой пары кадров — доля изменившихся пикселей после лучшего целого сдвига (−2..2):
// чистый сдвиг картинки = 0 (пиксели не «кипят»), пересчёт сетки лучей = много.
const R = {};
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  MENU.pause = function(){};
  SET.hintsOn = false; applySettings();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(3000);
  if (MENU.cur && MENU.close) MENU.close();
  S.paused = true;
  const me = S.me, up = norm(me.pos), f0 = tangent(me.fwd, up), r0 = norm(cross(f0, up));
  const eye = add(me.pos, mul(up, 1.7));
  const grab = () => { const w = canvas.width, h = canvas.height, b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return { w, h, b }; };
  const cmp = (A, B) => {   // доля различий после лучшего сдвига (внутренняя область, без полей)
    let best = 1;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++){
      let d = 0, n = 0;
      for (let y = 4; y < A.h - 4; y++) for (let x = 4; x < A.w - 4; x++){
        const i = (y * A.w + x) * 4, j = ((y + dy) * A.w + (x + dx)) * 4; n++;
        if (Math.abs(A.b[i] - B.b[j]) + Math.abs(A.b[i + 1] - B.b[j + 1]) + Math.abs(A.b[i + 2] - B.b[j + 2]) > 24) d++;
      }
      best = Math.min(best, d / n);
    }
    return best;
  };
  const run = async (snap, rows) => {
    SET.denStyle = 1; SET.denRows = rows; SET.denSnap = snap; SET.denChop = 12; applySettings(); await sleep(300);
    const pa = 2 * Math.tan(75 * Math.PI / 360) / rows;   // тангенс угла на «денди-пиксель»
    let prev = null; const v = [];
    for (let k = 0; k < 40; k++){
      const t = 0.3 + k * 0.1 * pa;   // горизонтальный поворот
      const fw = norm(add(f0, mul(r0, t)));
      S.camOverride = { pos: eye, look: add(eye, mul(add(fw, mul(up, -0.12)), 50)) };
      setupCamera(0.016); render(0.016, 123456); const g = grab();
      if (prev) v.push(cmp(g, prev));
      prev = g;
    }
    v.sort((a, b) => a - b);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    return { mean: +(mean * 100).toFixed(2), median: +(v[v.length >> 1] * 100).toFixed(2), worst: +(v[v.length - 1] * 100).toFixed(2), clean: v.filter(x => x < 0.002).length + '/' + v.length };
  };
  R.snapOn_180 = await run(true, 180);
  R.snapOff_180 = await run(false, 180);
  R.snapOn_120 = await run(true, 120);
  R.snapOff_120 = await run(false, 120);
  S.camOverride = null; SET.denSnap = true; SET.denStyle = 0; SET.denRows = 0; applySettings(); S.paused = false;
  R.note = 'проценты пикселей, изменившихся между соседними кадрами после компенсации целого сдвига; clean — кадров почти без изменений';
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
