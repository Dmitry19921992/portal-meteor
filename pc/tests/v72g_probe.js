const R = {};
try {
  R.c0 = MENU.cur; GFX72.set(true); R.c1 = MENU.cur;
  MENU.newGame(); R.c2 = MENU.cur; if (TUT.on) TUT.finish(); await sleep(800); R.c3 = MENU.cur;
  DEV.start(); await sleep(400); R.c4 = MENU.cur;
  R.scor = GFX72.scor.length; R.deb = GFX72.deb.length;
  const me = S.me; const ahead = surfacePoint(norm(add(me.pos, mul(S.cam.fwd, 14))), 0.3);
  fxExplosion(ahead, 3); await sleep(300);
  R.scor2 = GFX72.scor.map(s => [s.r, +len(s.pos).toFixed(1)]); R.deb2 = GFX72.deb.length; R.st = GFX72.stats; R.full = GFX72.full();
  R.gr = groundR(norm(ahead)); R.ahead = len(ahead);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
