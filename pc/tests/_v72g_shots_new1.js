const __TAG = 'new1'; const __MODE = 'new';
// v7.2gfx: одинаковые ракурсы для «было/стало». TAG и MODE подставляются обёрткой (MODE: 'old' | 'new' | '' = как есть)
const TAG = typeof __TAG !== 'undefined' ? __TAG : 'x';
const MODE = typeof __MODE !== 'undefined' ? __MODE : '';
const P = 'D:/AI/pm_v6/shots/v72g/' + TAG + '_';
const R = { fps: {}, m: [] };
const shot0 = shot; const shotM = async p => { R.m.push((MENU.cur || '-') + (S.attract ? 'A' : '') + (S.paused ? 'P' : '')); await shot0(p); };
const fpsMeas = async (k, ms) => { await sleep(1000); const a = []; const end = performance.now() + ms; while (performance.now() < end){ await sleep(500); a.push(fpsVal); } R.fps[k] = +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1); };
try {
  SET.lang = 'ru'; S.autoRes = false; S.scale = 1; resize();
  if (MODE && typeof GFX72 !== 'undefined') GFX72.set(MODE === 'new');
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (typeof CUR !== 'undefined') CUR.off = true;
  S.autoRes = false; S.scale = 1; resize();
  const cl = $('clicklock'); if (cl) cl.style.visibility = 'hidden';
  DEV.start(); await sleep(400); S.autoRes = false; S.scale = 1; resize();
  POLY71.start(); await sleep(9000);
  // 1) Полигон из глаз бойца
  POLY71.possess(); await sleep(300); if (cl) cl.style.visibility = 'hidden'; S.paused = false;
  await sleep(1500);
  S.kit.mag[S.kit.w] = 999; mouseL = true; await sleep(250); await shotM(P + '1_fps_fire.jpg');
  await fpsMeas('fps_fire', 4000); mouseL = false;
  // 2) взрыв перед камерой (ракурс из глаз)
  const me = S.me; const ahead = surfacePoint(norm(add(me.pos, mul(S.cam.fwd, 14))), 0.3);
  const camPos = add(me.pos, mul(me.up, 1.6));
  S.camOverride = { pos: camPos, look: ahead };
  fxExplosion(ahead, 3); await sleep(140); await shotM(P + '2_boom_a.jpg');
  await sleep(600); await shotM(P + '3_boom_b.jpg');
  await sleep(1800); await shotM(P + '4_boom_smoke.jpg');
  S.camOverride = null;
  // 3) стратегия: обзор своей базы
  enterRTS(); flyCamTo(mul(BASES[0], RM)); S.rts.hT = 70; await sleep(3000); S.sel.clear(); await shotM(P + '5_rts_base.jpg');
  await fpsMeas('rts', 3000);
  // 4) база с низкого ракурса
  const b = BASES[0], t1 = anyTangent(b);
  const bp = add(mul(b, RM + 14), mul(t1, 60));
  S.camOverride = { pos: bp, look: mul(b, RM + 6) }; await sleep(900); await shotM(P + '6_base_low.jpg');
  // 5) у купола: взгляд вдоль портального шва
  const cp = mul(norm(add(b, mul(t1, 0.4))), 760);
  S.camOverride = { pos: cp, look: add(mul(norm(cp), 700), mul(cross(norm(cp), t1), 300)) }; await sleep(900); await shotM(P + '7_dome.jpg');
  // 6) кратер
  const c = CRATERS[0], cd = norm(c), ct = anyTangent(cd);
  S.camOverride = { pos: add(mul(cd, RM + 6), mul(ct, c[3] * 0.9)), look: add(mul(cd, RM - c[3] * 0.4), mul(ct, -c[3] * 0.4)) }; await sleep(900); await shotM(P + '8_crater.jpg');
  // 7) шахта/туннель
  S.camOverride = { pos: [RM - 60, 0.5, 0.5], look: [0, 0, 0] }; await sleep(900); await shotM(P + '9_tunnel.jpg');
  // 8) Полигон — общий план боя
  const pc = POLY71.c, pt = anyTangent(pc);
  S.camOverride = { pos: add(mul(pc, RM + 22), mul(pt, 45)), look: mul(pc, RM + 2) }; await sleep(1200); await shotM(P + '10_poly_wide.jpg');
  await fpsMeas('poly_wide', 3000);
  S.camOverride = null;
  R.ok = 1; R.mode = typeof GFX72 !== 'undefined' ? GFX72.on : 'none';
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;

