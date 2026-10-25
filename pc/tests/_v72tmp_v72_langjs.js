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

// v7.2: обучение на иврите и вьетнамском (скриншоты для проверки читаемости)
for (const L of ['he', 'vi', 'en']){
  SET.lang = L; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(200);
  document.getElementById('m_tutorial').click(); await sleep(300);
  await shot(tag + 'lang_' + L + '_menu.jpg');
  T72.start(L === 'en' ? 'pc_rts' : 'pc_fps'); await sleep(1800);
  R[L] = { on: T72.on, title: document.querySelector('#t72p h4') && document.querySelector('#t72p h4').textContent, how: (document.querySelector('#t72p .how') || {}).textContent };
  await shot(tag + 'lang_' + L + '_step.jpg');
  T72.act('exit'); await sleep(400);
}
SET.lang = 'ru'; applySettings(); MENU.applyLang();
R.errs = errs;
return R;
