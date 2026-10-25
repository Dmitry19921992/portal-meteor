// v7.3: обучение «Шутер (телефон)» новой раскладкой «два джойстика» настоящими касаниями.  node v73run.js v73_ph_fps.js --android --reload
Object.assign(shots, { look: 1, move: 1, jet: 1, fire: 1, rocket: 1, grenade: 1, reflex: 1 });
const c0 = () => ctrlEntity();
const tapSel = async (sel, ms) => { let p = null; for (let k = 0; k < 20 && !(p = cen(sel)); k++) await sleep(100); if (p){ await T.tap(p[0], p[1], ms || 70); return true; } return false; };
const aimAt = u => { const c = c0(); if (c && u) c.fwd = norm(sub(centerOf(u), gunEye(c))); };
const dum = () => T72.dummies[1] || T72.dummies[0];
const walkTo = async (goal, maxMs, near) => {
  const c = c0(), jx = W * 0.2, jy = H * 0.7; await T.down(1, jx, jy); await sleep(60);
  for (let t = 0; t < (maxMs || 4000); t += 120){
    if (dist(c.pos, goal) < (near || 2.5) || T72.okT > 0) break;
    const v = tangent(sub(goal, c.pos), c.up), f = tangent(c.fwd, c.up), r = norm(cross(f, c.up));
    const fx = dot(norm(v), r), fy = dot(norm(v), norm(f));
    await T.move(1, jx + fx * 52, jy - fy * 52); await sleep(120);
  }
  await T.up(1);
};
const tapDummy = async () => { for (let k = 0; k < 30; k++){ aimAt(dum()); await sleep(80); const p = scr(centerOf(dum())); if (p){ await T.tap(p[0], p[1], 60); return true; } } return false; };
try {
  try { localStorage.removeItem('pm_t72done'); } catch (e){}
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); SET.solo = false;
  MENU.show('main'); await sleep(300);
  ok('ver_v73', /v7\.3/.test((document.querySelector('#screen .p71v') || {}).textContent || ''));
  ok('menu_more', !!document.getElementById('m73more') && !document.getElementById('m_cinema') || getComputedStyle(document.getElementById('m_cinema') || document.body).display === 'none');
  await shot(tag + 'menu.jpg');
  await tapSel('#m73more'); await sleep(300);
  ok('menu_more_open', !!document.querySelector('.p71g.m73open'));
  await shot(tag + 'menu_open.jpg');
  await tapSel('#m73more'); await sleep(200);
  await tapSel('#m_tutorial'); await sleep(500);
  if (MENU.cur !== 't72'){ const b = document.getElementById('m_tutorial'); if (b) b.click(); await sleep(300); }
  await tapSel('[data-t72go="ph_fps"]'); await sleep(2000);
  ok('started', T72.on && T72.id === 'ph_fps' && S.mode === 'fps' && M71.active() && M73.act(), [T72.on, T72.id, S.mode]);
  ok('steps_phone', T72.scheme === 'v73' && !['auto', 'skills', 'reload', 'aim', 'squad'].some(s => T72.steps.includes(s)) && T72.steps.includes('rocket'), [T72.scheme, T72.steps]);
  ok('split', TOUCH.split === 0.5 && document.body.classList.contains('m73'));
  ok('buttons_hidden', ['LF', 'R2', 'R3'].every(s => { const e = document.querySelector('#touch [data-s="' + s + '"]'); return !e || getComputedStyle(e).display === 'none'; }) && (!document.getElementById('m71auto') || getComputedStyle(document.getElementById('m71auto')).display === 'none'));
  ok('auto_default', M71.pref.auto === true, M71.pref.auto);
  await step('look', async () => { await T.drag(5, W * 0.7, H * 0.5, W * 0.7 + 220, H * 0.5, 14, 18); await T.up(5); await T.drag(5, W * 0.75, H * 0.5, W * 0.75 - 200, H * 0.45, 14, 18); await T.up(5); });
  await step('move', async () => { if (T72.goal) await walkTo(T72.goal, 6000, 3.5); }, 3000);
  await step('jet', async () => { const p = cen('#touch [data-s="LJ"]'); await T.down(3, p[0], p[1]); await sleep(1300); await T.up(3); });
  // стрельба: правым пальцем (джойстик обзора) — авто-огонь только на враге
  await step('fire', async () => {
    const d = dum(); await T.down(3, W * 0.75, H * 0.5); await sleep(80); await T.move(3, W * 0.75 + 16, H * 0.5);
    await sleep(150); R.manual_auto_off = M71.pref.auto === false ? 'OK' : 'FAIL';
    for (let i = 0; i < 18; i++){ aimAt(d); await sleep(100); } await T.up(3);
  }, 4000);
  await step('rocket', async () => { await tapDummy(); }, 3000);
  await step('grenade', async () => { await tapDummy(); }, 4000);
  await step('reflex', async () => { await T.tap(W * 0.82, H * 0.3, 50); await sleep(90); await T.tap(W * 0.82, H * 0.3, 50); });
  await step('cover', async () => { if (T72.hide) await walkTo(T72.hide, 7000, 1.2); await sleep(1200); }, 4000);
  await step('switch', async () => { await tapSel('#touch .tt .m67n'); }, 4000);
  await step('toRts', async () => { await tapSel('#touch .tt [data-t="map"]'); });
  await shot(tag + 'fps_rts_side.jpg');
  await step('toFps', async () => { await tapSel('#touch .tt [data-t="map"]'); });
  await sleep(700);
  ok('finished', T72.fin && !!rectOf('#t72fin .c'));
  await shot(tag + 'fps_final.jpg');
  await tapSel('#t72fin [data-t72="exit"]'); await sleep(900);
  // вне обучения: тап по врагу вручную (ракета / граната по очереди), 2 тапа — рефлекс, перезарядка сама
  if (!MENU.isOpen()){
    const c = c0(); c.rocketCd = 0; const K = G62.kit(); K.gren = 3;
    const e = TGT[c.team].find(x => x.alive && x.cls === 'inf' && dist(x.pos, c.pos) < 90);
    R.tap_enemy = 'n/a';
    if (e){ c.fwd = norm(sub(centerOf(e), gunEye(c))); await sleep(200); const p = scr(centerOf(e)); const rc0 = c.rocketCd, g0 = K.gren; if (p){ await T.tap(p[0], p[1], 60); await sleep(300); R.tap_enemy = (c.rocketCd > rc0 || K.gren < g0) ? 'OK' : 'FAIL'; } }
    S.kit.mag[S.kit.w] = 1; S.kit.reloadT = 0;
    S.kit.mag[S.kit.w] = 0; await sleep(900); R.autoreload = S.kit.reloadT > 0 || S.kit.mag[S.kit.w] > 0 ? 'OK' : 'FAIL';
  }
  ok('no_console_errors', errs.length === 0, errs);
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 900); R.fails.push('exception'); }
R.verdict = R.fails.length ? 'FAIL: ' + R.fails.join(',') : 'ALL OK';
return R;
