// v7.6 feel: baseline look at the menu and battle HUD
const R = {};
const O = 'D:/AI/pm_v6/shots_v76feel/';
for (let i = 0; i < 200; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
SET.lang = 'ru'; applySettings(); MENU.applyLang(); MENU.show('main');
await sleep(800);
await shot(O + 'base_menu_' + (TOUCH.on ? 'ph' : 'pc') + '.jpg');
R.touch = TOUCH.on; R.den = typeof DEN75 !== 'undefined' ? DEN75.active() : null; R.lite = LITE73.on;
R.btns = [...document.querySelectorAll('#screen button')].slice(0, 30).map(b => b.id + ':' + b.textContent.trim().slice(0, 30));
MENU.newGame(); if (TUT.on) TUT.finish && TUT.finish(); await sleep(4000);
if (MENU.cur) MENU.close();
await shot(O + 'base_fps_' + (TOUCH.on ? 'ph' : 'pc') + '.jpg');
R.obj = $('obj').style.display + ' ' + $('obj').textContent.slice(0, 80);
return R;
