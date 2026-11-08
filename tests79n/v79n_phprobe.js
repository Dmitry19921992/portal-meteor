// phone probe: which element receives touches at the tap point and on the AUTO button
const R = {};
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
const sim = async (sec, dt) => { dt = dt || 0.05; for (let t = 0; t < sec; t += dt){ update(dt); AU.process(S.events); } };
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (TUT.on && TUT.finish) TUT.finish();
  const a = NJ.spawn(0); takeControl(a); CAMFX.fly = null; await sleep(1500);
  const W = innerWidth, H = innerHeight;
  const desc = el => el ? (el.tagName + '#' + el.id + '.' + String(el.className).slice(0, 40) + ' ^' + (el.parentElement ? el.parentElement.id || el.parentElement.className : '')) : null;
  R.at = [[W * 0.5, H * 0.5], [W * 0.66, H * 0.55], [W * 0.75, H * 0.4]].map(([x, y]) => desc(document.elementFromPoint(x, y)));
  const b = document.querySelector('#nj79 [data-nj="auto"]'), r = b.getBoundingClientRect();
  R.btn = desc(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  R.btnRect = [r.left, r.top, r.width, r.height].map(v => v | 0);
  const log = []; document.addEventListener('touchstart', e => log.push('doc:' + desc(e.target)), true);
  await T.tap(W * 0.66, H * 0.55, 60); await T.tap(r.left + r.width / 2, r.top + r.height / 2, 60);
  await sleep(300);
  let cs = 0, ce = 0; canvas.addEventListener('touchstart', () => cs++, { passive: true }); canvas.addEventListener('touchend', () => ce++, { passive: true });
  const dbg = []; addEventListener('touchstart', e => dbg.push([e.target === canvas, !!NJ.ctrl(), MENU.isOpen(), e.changedTouches[0].clientX | 0, innerWidth]), { capture: true, passive: true }); R.dbg = dbg;
  await T.down(5, W * 0.66, H * 0.55); R.g = Object.keys(NJUI.g); for (let i = 1; i <= 4; i++){ await sleep(16); await T.move(5, W * 0.66 + i * 33, H * 0.55); } await T.up(5); await sleep(200); R.sw = NJUI.swipes; R.cs = [cs, ce]; R.ctrl = !!NJ.ctrl(); R.canvasIs = canvas === document.getElementById('c');
  R.log = log; R.autoP = NJ.autoP; R.taps = NJUI.taps; R.touchOn = TOUCH.on;
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 600); }
R.errs = errs;
return R;
