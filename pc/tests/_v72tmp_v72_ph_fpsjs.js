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

// v7.2: «Шутер (телефон)» от начала до конца настоящими касаниями (CDP).  node v72run.js v72_ph_fps.js --phone --reload
Object.assign(shots, { look: 1, move: 1, jet: 1, fire: 1, auto: 1, rocket: 1, grenade: 1, reflex: 1, skills: 1, cover: 1, squad: 1, toRts: 1 });
const c0 = () => ctrlEntity();
const tapSel = async (sel, ms) => { let p = null; for (let k = 0; k < 20 && !(p = cen(sel)); k++) await sleep(100); if (p){ await T.tap(p[0], p[1], ms || 70); return true; } return false; };
const aimAt = u => { const c = c0(); if (c && u) c.fwd = norm(sub(centerOf(u), gunEye(c))); };
// идти джойстиком к точке: палец слева, отклонение по направлению цели в экранных координатах (вперёд = вверх)
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
try {
  try { localStorage.removeItem('pm_t72done'); } catch (e){}
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); SET.solo = false;
  MENU.show('main'); await sleep(300);
  ok('ver_v72', /v7\.2/.test((document.querySelector('#screen .p71v') || {}).textContent || ''));
  await tapSel('#m_tutorial'); await sleep(500);
  if (MENU.cur !== 't72'){ document.getElementById('m_tutorial').click(); await sleep(300); }
  const tiles = [...document.querySelectorAll('[data-t72go]')].map(b => b.dataset.t72go);
  ok('menu_phone_tiles', MENU.cur === 't72' && tiles.join() === 'ph_rts,ph_fps', tiles);
  await shot(tag + 'menu.jpg');
  await tapSel('[data-t72o]'); await sleep(300);
  ok('menu_others', document.querySelectorAll('[data-t72go]').length === 4);
  await shot(tag + 'menu_all.jpg');
  await tapSel('[data-t72o]'); await sleep(300);
  await tapSel('[data-t72go="ph_fps"]'); await sleep(2000);
  ok('started', T72.on && T72.id === 'ph_fps' && S.mode === 'fps' && M71.active(), [T72.on, T72.id, S.mode]);
  ok('steps_phone', ['auto', 'skills'].every(s => T72.steps.includes(s)) && !T72.steps.includes('brake'), T72.steps);
  await step('look', async () => { await T.drag(5, W * 0.7, H * 0.5, W * 0.7 + 220, H * 0.5, 14, 18); await T.up(5); await T.drag(5, W * 0.75, H * 0.5, W * 0.75 - 200, H * 0.45, 14, 18); await T.up(5); });
  await step('move', async () => { if (T72.goal) await walkTo(T72.goal, 6000, 3.5); }, 3000);
  await step('jet', async () => { const p = cen('#touch [data-s="LJ"]'); await T.down(3, p[0], p[1]); await sleep(1300); await T.up(3); });
  await step('fire', async () => { const d = T72.dummies[1] || T72.dummies[0]; const p = cen('#touch [data-s="LF"]'); await T.down(3, p[0], p[1]); for (let i = 0; i < 16; i++){ aimAt(d); await sleep(100); } await T.up(3); }, 4000);
  await step('aim', async () => { await tapSel('#touch [data-s="R3"]'); await sleep(900); });
  await step('reload', async () => { await tapSel('#touch [data-s="R2"]'); });
  await step('auto', async () => { aimAt(T72.dummies[1] || T72.dummies[0]); await sleep(200); await tapSel('#m71auto'); await sleep(1000); }, 4000);
  // ракета: сначала через ряд навыков — шаг НЕ засчитан, показана подсказка; затем тап по красной рамке
  await step('rocket', async a => {
    if (a === 0){ await tapSel('#m71skb'); await sleep(300); await tapSel('#touch [data-s="K1"]'); await sleep(700); R.rocket_wrong = T72.wrongShown && T72.okT <= 0 ? 'OK' : 'FAIL'; await tapSel('#m71skb'); await sleep(300); const c = c0(); c.rocketCd = 0; }
    for (let k = 0; k < 20 && !M71.fr.rect; k++) await sleep(100);
    const r = M71.fr.rect; if (r) await T.tap((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 70);
  }, 3000);
  await step('grenade', async () => { for (let k = 0; k < 20 && !M71.target(); k++) await sleep(100); const p = cen('#touch .g62b'); await T.drag(4, p[0], p[1], p[0], p[1] - 70, 6, 16); await T.up(4); }, 4000);
  await step('reflex', async () => { await T.tap(W * 0.7, H * 0.35, 50); await sleep(90); await T.tap(W * 0.7, H * 0.35, 50); });
  await step('skills', async () => { await tapSel('#m71skb'); });
  if (M71.sk){ await tapSel('#m71skb'); await sleep(200); }
  if (M71.pref.auto){ await tapSel('#m71auto'); await sleep(200); }
  await step('cover', async () => { if (T72.hide) await walkTo(T72.hide, 7000, 1.2); await sleep(1200); }, 4000);
  await step('switch', async () => { await tapSel('#touch .tt .m67n'); }, 4000);
  await step('squad', async () => {
    await tapSel('#touch .tt .m67m'); await sleep(500);
    await shot(tag + 'fps_squad_sheet.jpg');
    await tapSel('#m67sheet .pz'); await sleep(600);
    await shot(tag + 'fps_squad_pause.jpg');
    await tapSel('#screen [data-mm2^="solo"]'); await sleep(400);
  }, 4000);
  await sleep(900);
  ok('squad_resumed', !MENU.isOpen() && !!SET.solo, [MENU.cur, SET.solo]);
  await step('toRts', async () => { await tapSel('#touch .tt [data-t="map"]'); });
  await shot(tag + 'fps_rts_side.jpg');
  await step('toFps', async () => { await tapSel('#touch .tt [data-t="map"]'); });
  await sleep(700);
  ok('finished', T72.fin && !!rectOf('#t72fin .c'));
  await shot(tag + 'fps_final.jpg');
  // повторить шаг — кнопкой на панели (касанием)
  await tapSel('#t72fin [data-t72="again"]'); await sleep(1800);
  ok('again', T72.on && T72.i === 0 && !T72.fin);
  await T.drag(5, W * 0.7, H * 0.5, W * 0.7 + 90, H * 0.5, 6, 18); await T.up(5); await sleep(200);
  const a1 = T72.acc; await tapSel('#t72p [data-t72="rep"]'); await sleep(250);
  ok('repeat_btn', a1 > 0 && T72.acc === 0 && T72.i === 0, [a1, T72.acc]);
  await tapSel('#t72p [data-t72="exit"]'); await sleep(700);
  ok('exit_menu', !T72.on && MENU.cur === 'main' && !document.body.classList.contains('t72'));
  ok('prefs_restored', !M71.pref.auto && !SET.solo);
  ok('no_console_errors', errs.length === 0, errs);
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 900); R.fails.push('exception'); }
R.verdict = R.fails.length ? 'FAIL: ' + R.fails.join(',') : 'ALL OK';
return R;
