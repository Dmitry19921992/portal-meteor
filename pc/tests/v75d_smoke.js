// v7.5 «Денди»: дымовой тест — включение, кадр, скриншоты, ошибки
const R = { steps: [] };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const warns = []; { const cw = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw.apply(console, a); }; }
const O = 'D:/AI/pm_v6/shots/v75d_';
try {
  for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(3000);
  if (MENU.cur) MENU.close && MENU.close();
  await shot(O + 'smoke_normal.jpg');
  DEN75.set(1); await sleep(1500);
  R.d1 = { active: DEN75.active(), w: canvas.width, h: canvas.height, css: canvas.style.width + ' ' + canvas.style.height, failed: DEN75.failed, stats: DEN75.stats };
  await shot(O + 'smoke_dendy.jpg');
  DEN75.set(2); await sleep(1500);
  R.d2 = { w: canvas.width, h: canvas.height };
  await shot(O + 'smoke_16.jpg');
  enterRTS(); await sleep(1500); await shot(O + 'smoke_16_rts.jpg');
  DEN75.set(1); await sleep(1000); await shot(O + 'smoke_dendy_rts.jpg');
  enterFPS(); await sleep(800);
  MENU.pause(); MENU.show('settings'); DEN75.adv = true; MENU.show('settings'); await sleep(500); await shot(O + 'smoke_settings.jpg');
  R.menu = document.querySelectorAll('#screen [data-ch="denStyle"]').length;
  DEN75.adv = false; MENU.resume && MENU.resume();
  DEN75.set(0); await sleep(1000);
  R.d0 = { active: DEN75.active(), w: canvas.width, h: canvas.height, css: canvas.style.cssText, uVal: DEN75.uVal };
  await shot(O + 'smoke_back.jpg');
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
R.errs = errs.slice(0, 6); R.warns = warns.slice(0, 6);
return R;
