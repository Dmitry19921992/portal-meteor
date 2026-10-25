// v7.8.1 exploration: phone screens (menu, match FPS/RTS, tutorial steps), DOM of corner buttons
const R = { };
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
const O = 'D:/AI/pm_v6/shots_v781/ex_' + innerWidth + 'x' + innerHeight + '_';
const btns = () => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }).map(b => { const r = b.getBoundingClientRect(); return (b.id || b.className || b.dataset.t || b.dataset.k || '').toString().slice(0, 18) + '[' + b.textContent.trim().slice(0, 14) + ']' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
SET.lang = 'ru'; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(600);
R.touch = TOUCH.on; R.m71 = typeof M71 !== 'undefined' && M71.active(); R.p71 = typeof P71M !== 'undefined' && P71M.on();
await shot(O + '01_menu.jpg');
R.menuBtns = btns();
MENU.newGame(false); await sleep(1200); if (MENU.cur) MENU.close(); await sleep(1500);
await shot(O + '02_fps.jpg');
R.fpsBtns = btns();
enterRTS(); await sleep(1500); await shot(O + '03_rts.jpg'); R.rtsBtns = btns();
MENU.pause(); await sleep(700); await shot(O + '04_pause.jpg'); R.pauseBtns = btns(); R.pauseCur = MENU.cur;
MENU.resume && MENU.resume(); await sleep(300);
MENU.toMenu(); await sleep(600);
MENU.show('t72', true); await sleep(500); await shot(O + '05_t72menu.jpg');
T72.start('ph_rts'); await sleep(1500);
R.steps = T72.steps.join(',');
for (const st of ['select', 'box', 'radial']){
  const i = T72.steps.indexOf(st); if (i < 0) continue; T72.leave(); T72.i = i; T72.enter(); await sleep(1500);
  await shot(O + '06_t72_' + st + '.jpg');
  R['t72_' + st] = btns();
}
T72.stop(); MENU.toMenu(); await sleep(400);
T72.start('ph_fps'); await sleep(2500); await shot(O + '07_t72fps.jpg'); R.t72fpsBtns = btns();
T72.stop(); MENU.toMenu();
R.errs = errs;
return R;
