// v7.8.1: phone RTS box selection in the tutorial (real CDP touches)
const R = { };
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
const O = 'D:/AI/pm_v6/shots_v781/box_' + innerWidth + 'x' + innerHeight + '_';
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
SET.lang = 'ru'; applySettings(); MENU.applyLang();
const vib = []; navigator.vibrate = ms => { vib.push(ms); return true; };
T72.start('ph_rts'); await sleep(1500);
const goStep = async st => { const i = T72.steps.indexOf(st); T72.leave(); T72.i = i; T72.enter(); await sleep(1800); };
const scr = g => { const p = leaderPos(g); const s = p && project(p); return s ? [Math.round(s[0]), Math.round(s[1])] : null; };
const trial = async (name, fn) => {
  await goStep('box'); S.sel.clear();
  const P = T72.tg ? T72.tg.map(scr) : [];
  const r = { pts: P, cam: Math.round(S.rts.h) };
  const d0 = S.rts.dir.slice();
  await fn(P, r);
  await sleep(400);
  r.sel = selGroups().length; r.idx = T72.i; r.step = T72.cur(); r.ok = T72.okT > 0 || T72.cur() !== 'box'; r.pan = +surfDist(S.rts.dir, d0).toFixed(1);
  r.vib = vib.slice(); vib.length = 0;
  R[name] = r;
};
// 1) long-press + drag
await trial('hold', async (P, r) => {
  if (P.length < 2 || !P[0] || !P[1]) return;
  const x0 = Math.min(P[0][0], P[1][0]) - 40, y0 = Math.min(P[0][1], P[1][1]) - 40, x1 = Math.max(P[0][0], P[1][0]) + 40, y1 = Math.max(P[0][1], P[1][1]) + 40;
  r.box = [x0, y0, x1, y1];
  await T.down(1, x0, y0); await sleep(500);
  r.armed = !!(TOUCH.rts && TOUCH.rts.armed);
  for (let i = 1; i <= 12; i++){ await sleep(25); await T.move(1, x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); }
  await shot(O + '01_dragging.jpg');
  await T.up(1);
});
// 2) quick swipe = pan (no selection)
await trial('swipe', async (P, r) => { await T.drag(1, 300, 250, 450, 200, 10, 16); await T.up(1); });
// 3) the «Рамка» rail button + drag
await trial('btn', async (P, r) => {
  const b = document.querySelector('#m71rail [data-k="box"]'); const bc = b && b.getBoundingClientRect();
  if (bc) await T.tap(bc.left + bc.width / 2, bc.top + bc.height / 2);
  await sleep(200); r.boxMode = TOUCH.boxMode;
  if (P.length < 2 || !P[0] || !P[1]) return;
  const x0 = Math.min(P[0][0], P[1][0]) - 40, y0 = Math.min(P[0][1], P[1][1]) - 40, x1 = Math.max(P[0][0], P[1][0]) + 40, y1 = Math.max(P[0][1], P[1][1]) + 40;
  await T.drag(1, x0, y0, x1, y1, 12, 20); await T.up(1);
});
// 4) tap select (one squad) then 2x tap
await trial('tap', async (P, r) => { if (!P[0]) return; await T.tap(P[0][0], P[0][1]); await sleep(150); r.sel1 = selGroups().length; });
await shot(O + '02_after.jpg');
T72.stop(); MENU.toMenu();
R.errs = errs;
return R;
