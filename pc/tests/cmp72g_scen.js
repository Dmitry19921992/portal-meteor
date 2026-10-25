  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shots = [];
  const ui = on => { for (const e of document.querySelectorAll('body > *')) if (e.id !== 'c' && e.tagName !== 'SCRIPT') e.style.visibility = on ? '' : 'hidden'; };
  const shot = async n => { if (MENU.cur){ MENU.close(); S.paused = false; __pump(1); } S.xfer = 0; await sleep(300); shots.push(n); await window.__cdpShot(n); };
  if (location.hash === '#old') SET.gfx72 = false; else if (location.hash === '#new') SET.gfx72 = true;
  S.autoRes = false; S.scale = 1; resize();
  MENU.pause = function(){};   // в headless захват мыши не удаётся — не даём игре уходить в паузу
  AU.on = false;               // звук тратит общий Math.random по-разному в v7.1/новой — для одинаковых кадров выключаем
  __seed(4242); MENU.newGame(); if (TUT.on) TUT.finish(); if (typeof CUR !== 'undefined') CUR.off = true;
  DEV.start(); S.autoRes = false; S.scale = 1; resize();
  __pump(5); POLY71.start(); __pump(420);
  POLY71.possess(); __pump(2); MENU.close(); S.paused = false; __pump(150); if (MENU.cur){ MENU.close(); S.paused = false; }
  ui(false);
  S.kit.mag[S.kit.w] = 999; mouseL = true; __pump(20); await shot('1_fps_fire'); mouseL = false;
  const me = S.me; const camPos = add(me.pos, mul(me.up, 1.6));
  const ahead = surfacePoint(norm(add(me.pos, mul(tangent(S.cam.fwd, me.up), 14))), 0.3);
  S.camOverride = { pos: camPos, look: add(ahead, mul(norm(ahead), 2)) };
  fxExplosion(ahead, 3); __pump(8); await shot('2_boom_a');
  __pump(30); await shot('3_boom_b');
  __pump(120); await shot('4_boom_smoke');
  const b = BASES[0], t1 = anyTangent(b);
  const pc = POLY71.c, pt = anyTangent(pc);
  // небо и горизонт: низко над грунтом, взгляд вдаль и чуть вверх
  const sg = surfacePoint(offsetOnSphere(pc, cross(pc, pt), 60), 0.3), su = norm(sg), sf = tangent(pt, su);
  S.camOverride = { pos: add(sg, mul(su, 3)), look: add(add(sg, mul(su, 3 + 55)), mul(sf, 150)) }; __pump(10); await shot('7_sky');
  const c = CRATERS[0], cd = norm(c), ct = anyTangent(cd);
  S.camOverride = { pos: add(mul(cd, RM + 6), mul(ct, c[3] * 0.9)), look: add(mul(cd, RM - c[3] * 0.4), mul(ct, -c[3] * 0.4)) }; __pump(10); await shot('8_crater');
  S.camOverride = { pos: [RM - 12, 0.5, 0.5], look: [RM - 60, -1.5, 0] }; __pump(120); await shot('9_tunnel');
  const g = surfacePoint(offsetOnSphere(pc, pt, 20), 0.3), gu = norm(g), gt = anyTangent(gu);
  S.camOverride = { pos: add(add(g, mul(gu, 2.2)), mul(gt, -9)), look: add(g, mul(gu, 1.0)) }; __pump(120); await shot('11_poly_ground');
  S.camOverride = null;
  enterRTS(); flyCamTo(mul(BASES[0], RM)); S.rts.hT = 70; __pump(150); S.sel.clear(); S.selB = null; __pump(5); await shot('5_rts_base');
  S.camOverride = { pos: add(mul(b, RM + 14), mul(t1, 60)), look: mul(b, RM + 6) }; __pump(10); await shot('6_base_low');
  S.camOverride = { pos: add(mul(pc, RM + 22), mul(pt, 45)), look: mul(pc, RM + 2) }; __pump(30); await shot('10_poly_wide');
  S.camOverride = null; ui(true);
  return { shots, g72: typeof GFX72 !== 'undefined' ? GFX72.postK() : 'none', title: document.title };
