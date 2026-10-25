// v7.2: «Шутер (ПК)» от начала до конца настоящими клавишами и мышью (CDP Input).  node v72run.js v72_pc_fps.js --vp 1280x720 --reload
Object.assign(shots, { look: 1, move: 1, fire: 1, rocket: 1, cover: 1, squad: 1, toRts: 1 });
try {
  try { localStorage.removeItem('pm_t72done'); } catch (e){}
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); SET.solo = false;
  MENU.show('main'); await sleep(300);
  ok('ver_v72', /v7\.2/.test(document.querySelector('#screen .sub').textContent) && document.title === 'Portal Meteor — v7.2');
  document.getElementById('m_tutorial').click(); await sleep(300);
  const tiles = [...document.querySelectorAll('[data-t72go]')].map(b => b.dataset.t72go);
  ok('menu_pc_tiles', MENU.cur === 't72' && tiles.join() === 'pc_rts,pc_fps', tiles);
  await shot(tag + 'menu.jpg');
  document.querySelector('[data-t72o]').click(); await sleep(200);
  ok('menu_others', [...document.querySelectorAll('[data-t72go]')].length === 4 && !!document.getElementById('m_t72old'));
  await shot(tag + 'menu_all.jpg');
  document.querySelector('[data-t72o]').click(); await sleep(200);
  document.querySelector('[data-t72go="pc_fps"]').click(); await sleep(1500);
  ok('started', T72.on && T72.id === 'pc_fps' && S.mode === 'fps' && T72.steps.length >= 12, T72.steps);
  ok('no_enemy_army', S.units.filter(u => u.team === 1 && !u.t72d).length === 0 && S.vehicles.every(v => v.team === 0) && !S.teams[0].ai && !S.teams[1].ai);
  ok('panel', !!rectOf('#t72p') && /1 \/ /.test(document.querySelector('#t72p .n').textContent));
  await IN.click(640, 420); await sleep(400);
  ok('pointer_lock', isLocked());
  const c0 = () => ctrlEntity();
  await step('look', async () => { for (let i = 1; i <= 24; i++){ await IN.move(640 + (i % 2 ? 60 : -60) * (1 + i % 3), 420); await sleep(25); } });
  await step('move', async () => {
    for (let k = 0; k < 40 && T72.goal; k++){ const c = c0(), v = sub(T72.goal, c.pos); c.fwd = norm(tangent(v, c.up)); await IN.key('KeyW', 220); if (dist(c.pos, T72.goal) < 4) break; }
  }, 4000);
  await step('jet', async () => { await IN.key('ShiftLeft', 1300); });
  await step('brake', async () => { await IN.down('ShiftLeft'); await sleep(700); await IN.up('ShiftLeft'); await IN.key('KeyC', 400); });
  await step('fire', async () => {
    const d = T72.dummies[1] || T72.dummies[0]; const c = c0(); c.fwd = norm(sub(centerOf(d), gunEye(c)));
    await IN.press(640, 360, 'left'); await sleep(1600); await IN.release(640, 360, 'left');
  }, 4000);
  await step('aim', async () => { await IN.press(640, 360, 'right'); await sleep(900); await IN.release(640, 360, 'right'); });
  await step('reload', async () => { await IN.key('KeyR', 80); });
  await step('rocket', async () => { const d = T72.dummies[1] || T72.dummies[0]; const c = c0(); c.fwd = norm(sub(centerOf(d), gunEye(c))); await IN.key('KeyQ', 80); });
  await step('grenade', async () => { const d = T72.dummies[1] || T72.dummies[0]; const c = c0(); c.fwd = norm(add(norm(sub(centerOf(d), gunEye(c))), mul(c.up, 0.25))); await IN.key('KeyG', 120); }, 4000);
  await step('reflex', async () => { await IN.key('KeyF', 80); });
  await step('cover', async () => {
    const c = c0(); if (!T72.hide) return;
    R.cover_tr = [];
    for (let k = 0; k < 40; k++){
      if (dist(T72.hide, c.pos) < 1.6 || (T72.hid && T72.acc > 0.1)) break;
      const p0 = c.pos.slice(); c.fwd = tangent(sub(T72.hide, c.pos), c.up); await IN.key('KeyW', 180);
      R.cover_tr.push(+dist(T72.hide, c.pos).toFixed(1));
      if (dist(p0, c.pos) < 0.4){ await IN.key('KeyA', 350); await IN.key('KeyW', 200); }   // упёрся — обойти
    }
    await sleep(1200);
  }, 4000);
  R.cover_info = { hid: T72.hid, sniper: !!T72.sniper, wall: !!T72.wall };
  await step('switch', async () => { await IN.key('KeyX', 80); }, 4000);
  await step('squad', async () => { await IN.key('KeyJ', 80); });
  ok('solo_toggled', !!SET.solo);
  await step('toRts', async () => { await IN.key('Tab', 80); });
  await shot(tag + 'fps_rts_side.jpg');
  await step('toFps', async () => { await IN.key('Tab', 80); });
  await sleep(600);
  ok('finished', T72.fin && !!rectOf('#t72fin .c'));
  await shot(tag + 'fps_final.jpg');
  ok('done_saved', (JSON.parse(localStorage.getItem('pm_t72done') || '{}')).pc_fps >= 1);
  // «повторить шаг» и выход
  T72.start('pc_fps'); await sleep(1200);
  await IN.click(640, 420); await sleep(300);
  for (let k = 0; k < 20 && cur() !== 'look'; k++) await sleep(100);
  await IN.move(700, 420); await IN.move(820, 420); await sleep(200);
  const acc1 = T72.acc;
  await IN.key('Backspace', 60); await sleep(200);
  ok('repeat_key', T72.acc === 0 && acc1 > 0 && T72.i === 0, [acc1, T72.acc]);
  document.querySelector('#t72p [data-t72="rep"]').click(); await sleep(200);
  ok('repeat_btn', T72.since('repeat'));
  ok('solo_restored', !SET.solo);
  document.querySelector('#t72p [data-t72="exit"]').click(); await sleep(600);
  ok('exit_menu', !T72.on && MENU.cur === 'main' && !rectOf('#t72p') && !document.body.classList.contains('t72'));
  ok('no_console_errors', errs.length === 0, errs);
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 900); R.fails.push('exception'); }
R.verdict = R.fails.length ? 'FAIL: ' + R.fails.join(',') : 'ALL OK';
return R;
