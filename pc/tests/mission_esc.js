// mission_esc.js — Esc: игра → пауза → Esc → назад (в headless мышь не захватывается → оверлей «кликни», игра на паузе)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(500); }
const key = code => dispatchEvent(new KeyboardEvent('keydown', { code, key: code }));
const up = code => dispatchEvent(new KeyboardEvent('keyup', { code, key: code }));
const out = {};
MENU.newGame();
await sleep(300);
const st = () => ({ menu: MENU.cur, paused: !!S.paused, waitLock: !!MENU.waitLock, clicklock: $('clicklock').style.display });
out.start = st();
key('Escape'); up('Escape'); await sleep(50);
out.afterEsc1 = st();
key('Escape'); up('Escape'); await sleep(50);
out.tooFast = st();                 // в первые 350 мс Esc игнорируется (тот же Esc, что отпустил мышь)
await sleep(400);
key('Escape'); up('Escape'); await sleep(50);
out.afterEsc2 = st();               // меню закрыто, ждём клик (пауза + оверлей)
key('Escape'); up('Escape'); await sleep(50);
out.afterEsc3 = st();               // снова меню
await sleep(400);
key('Escape'); up('Escape'); await sleep(50);
out.afterEsc4 = st();
// настройки из паузы: Esc возвращает в паузу, второй Esc — в игру
key('Escape'); up('Escape'); await sleep(400);
MENU.show('settings', true);
key('Escape'); up('Escape'); await sleep(50);
out.settingsBack = MENU.cur;
key('Escape'); up('Escape'); await sleep(50);
out.toGame = st();
// кино-режим: Esc выходит в меню
MENU.toMenu(); OPER.begin({ aspect: '16:9' }); await sleep(100);
key('Escape'); up('Escape'); await sleep(50);
out.cinemaEsc = { oper: OPER.on, menu: MENU.cur };
return out;
