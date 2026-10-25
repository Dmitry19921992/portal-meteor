// v7.2: общие помощники тестов обучения (вставляется в начало каждого теста через v72run.js)
for (let i = 0; i < 480; i++){ try { if (document.getElementById('boot').classList.contains('done') && S.teams && MENU.cur === 'main') break; } catch (e){} await sleep(500); }
await sleep(500);
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

// v7.2: «Стратегия (ПК)» от начала до конца настоящими клавишами и мышью.  node v72run.js v72_pc_rts.js --vp 1280x720 --reload
Object.assign(shots, { pan: 1, select: 1, order: 1, box: 1, minimap: 1, builder: 1, build: 1, construct: 1, produce: 1, gather: 1, possess: 1 });
const gScr = g => { const p = g && leaderPos(g); return p ? scr(p) : null; };
const onGround = () => { for (const [x, y] of [[0.45, 0.55], [0.55, 0.45], [0.4, 0.4], [0.6, 0.6], [0.5, 0.3]]){ const px = W * x, py = H * y; if (pickGround(px, py) && !pickEntity(px, py, false)) return [px, py]; } return [W * 0.5, H * 0.55]; };
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.show('main'); await sleep(200);
  document.getElementById('m_tutorial').click(); await sleep(300);
  document.querySelector('[data-t72go="pc_rts"]').click(); await sleep(1800);
  ok('started', T72.on && T72.id === 'pc_rts' && S.mode === 'rts', [T72.on, S.mode]);
  ok('builder_panel_hidden', !rectOf('#side [data-ux="build:barracks"]'));
  await IN.move(W / 2, H / 2);
  await step('pan', async () => { await IN.down('KeyD'); await sleep(1400); await IN.up('KeyD'); });
  await step('zoom', async () => { for (let i = 0; i < 6; i++){ await IN.wheel(W / 2, H / 2, 120); await sleep(80); } });
  await step('select', async () => { await sleep(900); const s = gScr(T72.tg); if (s) await IN.click(s[0], s[1]); });
  await step('order', async () => { await sleep(900); const s = T72.goal && scr(T72.goal); if (s) await IN.click(s[0], s[1], 'right'); });
  await step('selType', async () => { await sleep(900); const s = gScr(T72.tg); if (s) await IN.click(s[0], s[1], 'left', 2); });
  await step('box', async () => { await sleep(1200); const L = (T72.tg || []).map(gScr).filter(Boolean); R.box_pts = L; if (!L.length) return; const xs = L.map(s => s[0]), ys = L.map(s => s[1]);
    await IN.drag(Math.max(5, Math.min(...xs) - 60), Math.max(80, Math.min(...ys) - 50), Math.min(W - 5, Math.max(...xs) + 60), Math.min(H - 5, Math.max(...ys) + 50), 12); });
  await step('minimap', async () => { const c = mmCenters()[0]; await IN.click(c[0] + 12, c[1] - 8); });
  await step('builder', async () => { await sleep(900); const b = T72.tg, s = b && scr(b.pos); if (s) await IN.click(s[0], s[1]); else await IN.key('Period', 60); });
  ok('builder_panel_shown', !!rectOf('#side [data-ux="build:barracks"]'));
  await step('build', async () => {
    await sleep(900); const bb = cen('#side [data-ux="build:barracks"]'); if (bb) await IN.click(bb[0], bb[1]); else await IN.key('KeyM', 60);
    await sleep(500); const s = T72.goal && scr(T72.goal); if (s) await IN.click(s[0], s[1]);
  }, 5000);
  await step('construct', async () => { await sleep(3000); }, 9000);
  await step('produce', async () => {
    await sleep(800); const b = T72bar(), s = b && scr(bldCenter(b)); if (s) await IN.click(s[0], s[1]); await sleep(700);
    const pb = cen('#side [data-ux="prod:squad"]'); if (pb) await IN.click(pb[0], pb[1]);
  }, 5000);
  await step('gather', async () => { await sleep(900); const f = T72.f, s = f && scr(add(f.pos, mul(f.dir, 0.8))); if (s) await IN.click(s[0], s[1], 'right'); });
  await step('possess', async () => { await sleep(500); const p = cen('#card .poss'); if (p) await IN.click(p[0], p[1]); else await IN.key('Tab', 60); });
  await shot(tag + 'rts_fps_side.jpg');
  await step('toRts', async () => { await IN.key('Tab', 60); });
  await sleep(600);
  ok('finished', T72.fin && !!rectOf('#t72fin .c'));
  await shot(tag + 'rts_final.jpg');
  ok('no_damage_taken', S.buildings.every(b => b.team !== 0 || b.hp > 0) && S.hq[0].hp >= S.hq[0].maxhp * 0.99);
  const mb = document.querySelector('#t72fin [data-t72="menu"]'); if (mb && T72.fin) mb.click(); else T72.act('exit'); await sleep(600);
  ok('exit_menu', !T72.on && MENU.cur === 'main');
  ok('no_console_errors', errs.length === 0, errs);
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 900); R.fails.push('exception'); }
R.verdict = R.fails.length ? 'FAIL: ' + R.fails.join(',') : 'ALL OK';
return R;
