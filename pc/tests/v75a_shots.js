// v7.5 3D-модели окружения: кадры «до/после» (одна сессия, тот же ракурс: ВЫКЛ -> ВКЛ) + замер FPS выкл/вкл/лёгкий режим
const R = { views: [], fps: {} };
const P = 'D:/AI/pm_v6/shots/v75a/';
const meas = async ms => { await sleep(1000); const f = []; const end = performance.now() + ms; while (performance.now() < end){ await sleep(400); f.push(fpsVal); } return +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1); };
// при 1–2 кадрах/с снимок экрана идёт дольше 5 с — ждём подтверждения до 40 с (иначе кадр «уезжает» на следующий ракурс)
const shotW = async p => { window.__shotDone = false; cdpShot(p); for (let i = 0; i < 800 && !window.__shotDone; i++) await sleep(50); };
const loaded = async () => { for (let i = 0; i < 60; i++){ await sleep(150); if (!AS75.queue.length && !AS75.loading && !AS75.pend.length && Object.values(AS75.M).every(m => m.st !== 1)) break; } await sleep(400); };
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  MENU.pause = function(){};
  SET.lang = 'ru'; SET.hintsOn = false; SET.quality = 2; SET.bounces = 4; SET.distort = true; SET.autoRes = false; SET.scale = 1; SET.lite = false;
  applySettings();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (typeof CUR !== 'undefined') CUR.off = true;
  if (MENU.cur && MENU.close) MENU.close(); S.paused = false;
  S.autoRes = false; S.scale = 1; resize();
  const cl = $('clicklock'); if (cl) cl.style.visibility = 'hidden';
  AS75.placeStep(1e9);
  const lit = it => dot(it.dir, SUN1);
  const best = cls => AS75.items.filter(it => it.e.p === cls && lit(it) > 0.35).sort((a, b) => b.e.w - a.e.w || lit(b) - lit(a))[0];
  const around = (it, dist, hgt, ang) => { const t0 = anyTangent(it.Y), t1 = cross(it.Y, t0), t = norm(add(mul(t0, Math.cos(ang)), mul(t1, Math.sin(ang)))); const d = norm(add(it.pos, mul(t, dist))); return mul(d, Math.max(groundR(d), len(it.pos)) + hgt); };
  S.third = true;   // без оружия в кадре
  // ракурс с прямой видимостью: перебираем 12 сторон, берём первую, откуда цель не закрыта рельефом
  const seeT = (p, q) => { const co = AS75.colOn; AS75.colOn = false; try { return los(p, q); } finally { AS75.colOn = co; } };
  const frame = (tgt, up, dist, hgt) => { const t0 = anyTangent(up), t1 = cross(up, t0); for (let k = 0; k < 12; k++){ const a = k * 0.5236 + 0.3, t = norm(add(mul(t0, Math.cos(a)), mul(t1, Math.sin(a)))), d = norm(add(tgt, mul(t, dist))), p = mul(d, groundR(d) + hgt); if (seeT(p, tgt)) return p; } const d = norm(add(tgt, mul(t0, dist))); return mul(d, groundR(d) + hgt * 2); };
  const dens = it => AS75.items.filter(j => dist(j.pos, it.pos) < 45).length;
  const V = [];
  const ru = AS75.items.filter(it => it.e.p === 'ruin' && lit(it) > 0.3).sort((a, b) => dens(b) - dens(a) || b.e.w - a.e.w)[0];
  if (ru){ const c = add(ru.pos, mul(ru.Y, ru.h * 0.35)); V.push(['1_ruin', frame(c, ru.Y, ru.r * 1.4 + 12, 4.5), c]); }
  const wr = AS75.items.filter(it => it.e.p === 'wreck' && lit(it) > 0.3 && it.r > 1.5).sort((a, b) => b.e.w - a.e.w || dens(b) - dens(a))[0];
  if (wr){ const c = add(wr.pos, mul(wr.Y, wr.h * 0.4)); V.push(['2_wreck', frame(c, wr.Y, wr.r * 1.6 + 6, 3.0), c]); }
  const cpi = CPD.map((c, i) => [dot(c, SUN1) * 2 + AS75.items.filter(it => it.e.p === 'camp' && surfDist(it.dir, c) < 40).length * 0.25, i]).sort((a, b) => b[0] - a[0])[0][1];
  { const cd = CPD[cpi], c = mul(cd, RM + 1.0); V.push(['3_point', frame(c, cd, 38, 9), c]); }
  const na = AS75.items.filter(it => it.e.p === 'nature' && lit(it) > 0.3).sort((a, b) => dens(b) - dens(a))[0];
  if (na){ const c = add(na.pos, mul(na.Y, 0.8)); V.push(['4_nature', frame(c, na.Y, 14, 3.2), c]); }
  if (ru){ const c = mul(ru.dir, RM); V.push(['5_rts', add(mul(ru.dir, RM + 48), mul(anyTangent(ru.dir), 40)), c]); }
  R.views = V.map(v => v[0]);
  for (const [name, pos, look] of V){
    S.camOverride = { pos, look };
    SET.as75 = false; await sleep(900); await shotW(P + name + '_off.jpg');
    SET.as75 = true; await sleep(300); await loaded(); await shotW(P + name + '_on.jpg');
    R[name] = AS75.info();
  }
  // FPS: ракурс руины (модели в кадре) и общий план; выкл/вкл попеременно, 2 круга.
  // Настройки ПК по умолчанию (авторазрешение) — так игра и идёт на этом ПК; плюс отдельный прогон «качество высокое, масштаб 1.0»
  const F = {};
  SET.quality = SET_DEF.quality; SET.autoRes = SET_DEF.autoRes; SET.scale = SET_DEF.scale; applySettings(); await sleep(500);
  F.q = S.quality; F.autoRes = S.autoRes;
  for (const [name, pos, look] of V.filter(v => v[0] === '1_ruin' || v[0] === '5_rts')){
    S.camOverride = { pos, look };
    for (let r = 0; r < 2; r++) for (const on of [false, true]){ SET.as75 = on; const k = name + (on ? '_on' : '_off'); const v = await meas(3000); F[k] = F[k] ? +((F[k] + v) / 2).toFixed(1) : v; if (on) F[k + '_ms'] = +AS75.stats.ms.toFixed(2); }
  }
  // лёгкий режим (как на телефоне): LOD0m 256, меньше дистанции
  SET.lite = true; applySettings(); await sleep(800);
  if (ru){ S.camOverride = { pos: V[0][1], look: V[0][2] }; SET.as75 = true; await loaded(); await shotW(P + '6_lite_on.jpg'); R.lite = AS75.info();
    for (let r = 0; r < 2; r++) for (const on of [false, true]){ SET.as75 = on; const k = 'lite_ruin' + (on ? '_on' : '_off'); const v = await meas(3500); F[k] = F[k] ? +((F[k] + v) / 2).toFixed(1) : v; }
    F.lite_px = canvas.width + 'x' + canvas.height; }
  SET.lite = false; applySettings();
  S.camOverride = null; SET.as75 = true;
  R.fps = F; R.px = canvas.width + 'x' + canvas.height; R.gpu = (() => { try { const g = gl.getExtension('WEBGL_debug_renderer_info'); return g ? gl.getParameter(g.UNMASKED_RENDERER_WEBGL) : '?'; } catch (e){ return '?'; } })();
  R.total = AS75.info();
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
