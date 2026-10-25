// v7.5 «Денди»: скриншоты-сравнения «Обычный / Денди / 16-бит» в одинаковых кадрах (пауза — кадр не меняется)
// вблизи (FPS), панорама (FPS, смотрим вдаль), стратег (RTS), взрыв (FPS) + настройки. Склейка — в браузере (OffscreenCanvas).
const R = { shots: [] };
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
const O = 'D:/AI/pm_v6/shots/v75d_cmp_';
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; SET.hintsOn = false; SET.quality = 2; SET.autoRes = false; SET.scale = 1; SET.lite = false; applySettings(); MENU.applyLang();
  MENU.pause = function(){};
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(6000);
  if (MENU.cur && MENU.close) MENU.close();
  const cl = document.getElementById('clicklock'); const hideCl = () => { if (cl) cl.style.display = 'none'; };
  const three = async name => {
    for (const [st, tag] of [[0, 'a_normal'], [1, 'b_dendy'], [2, 'c_16bit']]){
      SET.denStyle = st; SET.denRows = 0; applySettings(); if (!st){ S.autoRes = false; S.scale = 1; resize(); }
      hideCl(); await sleep(900); hideCl();
      const p = O + name + '_' + tag + '.jpg'; await shot(p); R.shots.push(p);
    }
  };
  // 1) вблизи: ближайший союзник перед камерой
  const me = S.me;
  const mate = S.units.filter(u => u.alive && u.team === 0 && u !== me && u.cls === 'inf').sort((a, b) => dist(a.pos, me.pos) - dist(b.pos, me.pos))[0];
  const look = (pos, tgt) => { S.camOverride = { pos, look: tgt }; S.freecam = true; };
  if (mate){ const up = norm(mate.pos), f = tangent(mate.fwd, up); look(add(add(mate.pos, mul(f, 3.2)), mul(up, 1.5)), add(mate.pos, mul(up, 0.9))); }
  S.paused = true; await three('1_fps_close');
  // 2) панорама: с высоты 4 м вдаль по горизонту
  { const up = norm(me.pos), f = tangent(me.fwd, up); look(add(me.pos, mul(up, 4)), add(add(me.pos, mul(f, 80)), mul(up, -2))); }
  await three('2_fps_panorama');
  S.camOverride = null; S.freecam = false;
  // 3) стратег
  S.paused = false; enterRTS(); await sleep(1500); S.paused = true; await three('3_rts');
  // 4) взрыв: сначала бой идёт, взрыв перед камерой, через 0.35 с — пауза
  S.paused = false; enterFPS(); await sleep(3500); S.xfer = 0;   // переход «передача сигнала» закончился
  { const m = S.me, up = norm(m.pos), f = tangent(m.fwd, up);
    const p = surfacePoint(norm(add(m.pos, mul(f, 16))), 0.3);
    fxExplosion(p, 3); for (let k = 0; k < 2; k++) fxExplosion(surfacePoint(norm(add(p, mul(randUnit(), 4))), 0.3), 2);
    look(add(m.pos, mul(up, 2.2)), add(p, mul(up, 2))); }
  await sleep(400); S.paused = true; S.xfer = 0; await three('4_explosion');
  S.camOverride = null; S.freecam = false; S.paused = false;
  // 5) настройки с «Расширенными»
  SET.denStyle = 1; applySettings(); DEN75.adv = true; MENU.show('settings'); await sleep(700);
  await shot(O + '5_settings.jpg'); R.shots.push(O + '5_settings.jpg');
  DEN75.adv = false; MENU.close && MENU.close();
  SET.denStyle = 0; applySettings();
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
R.errs = errs;
return R;
