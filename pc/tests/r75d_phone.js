// v7.5 «Денди» на телефоне (844x390, касания, лёгкий режим по умолчанию): экран «Графика», кнопки − / +, кадр игры
const R = {};
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const O = 'D:/AI/pm_v6/shots75rel/t/v75d_ph_';
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  R.touch = TOUCH.on; R.lite = LITE73.on; R.style0 = SET.denStyle;
  MENU.show('p71s_gfx', true); await sleep(500);
  R.hasStep = !!document.querySelector('#screen [data-p71c="denStyle"]');
  await shot(O + 'gfx_normal.jpg');
  // «+» у «Стиль графики» — настоящим касанием
  const plus = document.querySelector('#screen [data-p71c="denStyle"][data-d="1"]');
  if (plus){ const r = plus.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); await sleep(700); }
  R.styleAfterPlus = SET.denStyle; R.dendyActive = DEN75.active();
  R.hasAdv = !!document.querySelector('#screen [data-den75adv]');
  const adv = document.querySelector('#screen [data-den75adv]');
  if (adv){ const r = adv.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); await sleep(700); }
  R.advOpen = DEN75.adv; R.advRows = document.querySelectorAll('#screen [data-p71c="denRows"],#screen [data-p71c="denChop"]').length;
  await shot(O + 'gfx_dendy_adv.jpg');
  DEN75.adv = false; MENU.back && MENU.back(); await sleep(300);
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(5000);
  R.canvas = canvas.width + 'x' + canvas.height; R.css = canvas.style.width + ' x ' + canvas.style.height; R.inner = innerWidth + 'x' + innerHeight;
  await shot(O + 'fps_dendy.jpg');
  enterRTS(); await sleep(2500); await shot(O + 'rts_dendy.jpg');
  enterFPS(); await sleep(1500);
  R.fps = fpsVal;
  DEN75.set(0); await sleep(1500); R.canvasBack = canvas.width + 'x' + canvas.height; R.cssBack = canvas.style.cssText;
  await shot(O + 'fps_normal.jpg');
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
R.errs = errs.slice(0, 6);
return R;
