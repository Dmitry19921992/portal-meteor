// v7.2: общие помощники тестов обучения (вставляется в начало каждого теста через v72run.js)
for (let i = 0; i < 480; i++){ try { if (document.getElementById('boot').classList.contains('done') && S.teams && MENU.cur === 'main') break; } catch (e){} await sleep(500); }
await sleep(500);
// после старых тестов в профиле может остаться «Раскладка v7.0» — обучение проверяем на раскладке v7.1
if (TOUCH.on && typeof M71 !== 'undefined' && M71.pref.v70){ M71.pref.v70 = false; M71.save(); M71.apply(); if (MENU.cur) MENU.show(MENU.cur); await sleep(300); }
const R = { steps: {}, fails: [] }, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 300) : ''); if (!v) R.fails.push(k); };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 200)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const W = innerWidth, H = innerHeight, PH = TOUCH.on;
const tag = 'D:/AI/pm_v6/shots/v72_' + (PH ? 'ph' : 'pc') + '_';
const cur = () => T72.cur();
const rectOf = sel => { const e = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
const cen = sel => { const r = rectOf(sel); return r ? [r.left + r.width / 2, r.top + r.height / 2] : null; };
const scr = p => { const s = project(p); return s && s[0] > 4 && s[0] < W - 4 && s[1] > 4 && s[1] < H - 4 ? [s[0], s[1]] : null; };
// ждать, пока текущий шаг засчитается и обучение перейдёт к следующему
const waitStep = async (i0, ms) => { for (let t = 0; t < (ms || 6000); t += 50){ if (T72.i !== i0 || T72.fin || T72.okT > 0) return true; await sleep(50); } return false; };
// шаг не засчитывается без действия: ждём 1.6 с и проверяем, что индекс не сдвинулся
const idle = async () => { const i0 = T72.i; await sleep(1600); return T72.i === i0 && T72.okT <= 0; };
const step = async (name, fn, ms) => {
  for (let k = 0; k < 40 && cur() !== name; k++) await sleep(100);
  if (cur() !== name){ R.steps[name] = 'SKIP (cur ' + cur() + ')'; R.fails.push(name); return false; }
  await sleep(300);
  const nid = await idle();
  if (shots[name]) await shot(tag + T72.kind + '_' + name + '.jpg');
  let done = false;
  const i0 = T72.i;
  for (let a = 0; a < 3 && !done; a++){ try { await fn(a); } catch (e){ R.steps[name] = 'EXC ' + String(e).slice(0, 200); } done = await waitStep(i0, ms); }
  R.steps[name] = (done ? 'OK' : 'FAIL') + (nid ? '' : ' (засчитан без действия!)');
  if (!done || !nid) R.fails.push(name);
  await sleep(1100);
  return done;
};
const shots = {};

// v7.2: «Стратегия (телефон)» от начала до конца настоящими касаниями.  node v72run.js v72_ph_rts.js --phone --reload
Object.assign(shots, { pan: 1, zoom: 1, select: 1, order: 1, selType: 1, box: 1, radial: 1, cards: 1, minimap: 1, builder: 1, build: 1, construct: 1, produce: 1, gather: 1, possess: 1 });
const tapSel = async (sel, ms) => { let p = null; for (let k = 0; k < 20 && !(p = cen(sel)); k++) await sleep(100); if (p){ await T.tap(p[0], p[1], ms || 70); return true; } return false; };
const gScr = g => { const p = g && leaderPos(g); return p ? scr(p) : null; };
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.show('main'); await sleep(300);
  await tapSel('#m_tutorial'); await sleep(500);
  await tapSel('[data-t72go="ph_rts"]'); await sleep(2200); if (!T72.on){ const b = document.querySelector('[data-t72go="ph_rts"]'); if (b) b.click(); else T72.start('ph_rts'); await sleep(2200); R.start_retry = 1; }
  ok('started', T72.on && T72.id === 'ph_rts' && S.mode === 'rts', [T72.on, S.mode]);
  ok('steps_phone', ['radial', 'cards', 'selType'].every(s => T72.steps.includes(s)), T72.steps);
  ok('builder_panel_hidden', !rectOf('#side [data-ux="build:barracks"]'));
  await step('pan', async () => { await T.drag(1, W * 0.4, H * 0.55, W * 0.4 + 260, H * 0.55 + 60, 16, 18); await T.up(1); });
  await step('zoom', async () => { await T.down(1, W * 0.45, H * 0.5); await T.down(2, W * 0.55, H * 0.5); for (let i = 1; i <= 10; i++){ await T.move(1, W * 0.45 - i * 12, H * 0.5); await T.move(2, W * 0.55 + i * 12, H * 0.5); await sleep(16); } await T.up(2); await T.up(1); });
  await step('select', async () => { await sleep(1000); const s = gScr(T72.tg); if (s) await T.tap(s[0], s[1], 60); });
  await step('order', async () => { await sleep(1000); const s = T72.goal && scr(T72.goal); if (s) await T.tap(s[0], s[1], 60); });
  await step('selType', async () => { await sleep(1000); const s = gScr(T72.tg); if (s){ await T.tap(s[0], s[1], 50); await sleep(110); await T.tap(s[0], s[1], 50); } });
  await step('box', async () => {
    await sleep(1200); const L = (T72.tg || []).map(gScr).filter(Boolean); R.box_pts = L; if (!L.length) return;
    const xs = L.map(s => s[0]), ys = L.map(s => s[1]), pb = rectOf('#t72p'), x0 = Math.max(70, Math.min(...xs) - 50), y0 = Math.max(pb ? pb.bottom + 8 : 80, Math.min(...ys) - 45), x1 = Math.min(W - 80, Math.max(...xs) + 50), y1 = Math.min(H - 30, Math.max(...ys) + 45);
    await T.down(1, x0, y0); await sleep(520); for (let i = 1; i <= 12; i++){ await T.move(1, x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12); await sleep(16); } await T.up(1);
  });
  await step('radial', async () => {
    await sleep(1000); const s = T72.goal && scr(T72.goal) || [W * 0.45, H * 0.55];
    await T.down(1, s[0], s[1]); await sleep(560); await T.up(1); await sleep(400);
    await shot(tag + 'rts_radial_open.jpg');
    const bs = [...document.querySelectorAll('#m71rad .m71ri:not(.x)')], b = bs.find(x => /Стоять|Атака/.test(x.textContent)) || bs[1]; R.rad_items = bs.map(x => x.textContent); if (b){ const r = b.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2, 60); }
  });
  await step('cards', async () => { await tapSel('#m71sq button:nth-child(2)'); });
  await step('minimap', async () => { const c = mmCenters()[0]; await T.tap(c[0] + 10, c[1] - 6, 60); });
  await step('builder', async () => { await sleep(600); await tapSel('#m71rail [data-k="eng"]'); });
  await sleep(600);
  ok('builder_panel_shown', !!rectOf('#side [data-ux="build:barracks"]'));
  await step('build', async () => {
    await sleep(800); await tapSel('#side [data-ux="build:barracks"]'); await sleep(700);
    await shot(tag + 'rts_build_place.jpg');
    const s = T72.goal && scr(T72.goal); if (s) await T.tap(s[0], s[1], 60); await sleep(500);
    await shot(tag + 'rts_build_confirm.jpg');
    await tapSel('#placeBar [data-pb="ok"]');
  }, 5000);
  await step('construct', async () => { await sleep(3000); }, 9000);
  await step('produce', async () => {
    await sleep(900); const b = T72bar(), s = b && scr(bldCenter(b)); if (s) await T.tap(s[0], s[1], 60); await sleep(900);
    await shot(tag + 'rts_produce_panel.jpg');
    await tapSel('#side [data-ux="prod:squad"]');
  }, 5000);
  await step('gather', async () => { await sleep(1000); if (!(await tapSel('#card [data-gather]'))){ const f = T72.f, s = f && scr(add(f.pos, mul(f.dir, 0.8))); if (s) await T.tap(s[0], s[1], 60); } });
  await step('possess', async () => { await sleep(700); if (!(await tapSel('#card .poss'))) await tapSel('#touch .tt [data-t="map"]'); });
  await shot(tag + 'rts_fps_side.jpg');
  await step('toRts', async () => { await tapSel('#touch .tt [data-t="map"]'); });
  await sleep(700);
  ok('finished', T72.fin && !!rectOf('#t72fin .c'));
  await shot(tag + 'rts_final.jpg');
  ok('no_damage', S.hq[0].hp >= S.hq[0].maxhp * 0.99 && S.units.filter(u => u.team === 0).every(u => u.hp > 0));
  await tapSel('#t72fin [data-t72="menu"]'); await sleep(700);
  ok('exit_menu', !T72.on && MENU.cur === 'main');
  ok('no_console_errors', errs.length === 0, errs);
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 900); R.fails.push('exception'); }
R.verdict = R.fails.length ? 'FAIL: ' + R.fails.join(',') : 'ALL OK';
return R;
