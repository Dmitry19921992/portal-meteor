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

// отладка шага «все такие» на телефоне
T72.start('ph_rts'); await sleep(1500);
const go = async n => { T72.leave(); T72.i = T72.steps.indexOf(n); T72.enter(); await sleep(1500); };
await go('selType');
const g = T72.tg, p = leaderPos(g), s = scr(p);
const ent = s ? pickEntity(s[0], s[1], true) : null;
R.a = { s, ent: ent && [ent.cls, ent.team, ent.squad === g], h: S.rts.h, sqs: T72sqs().map(q => { const z = scr(leaderPos(q)); return z && z.map(Math.round); }) };
if (s){ await T.tap(s[0], s[1], 50); await sleep(110); R.b1 = { n: S.sel.size, last: !!M71.lastTapG }; await T.tap(s[0], s[1], 50); await sleep(200); }
R.b = { n: S.sel.size, kinds: selGroups().map(x => groupKind(x)), ev: T72.since('selType'), cur: cur() };
await shot(tag + 'dbg_seltype.jpg');
T72.act('exit'); await sleep(300);
return R;
