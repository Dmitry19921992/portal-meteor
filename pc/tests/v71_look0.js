// v7.1: снимки телефона (как есть) — для планировки
const tag = 'D:/AI/pm_v6/shots/v71_' + (innerWidth < 900 ? 'p2' : innerWidth < 920 ? 'and' : 'ip') + '_';
SET.lang = 'ru'; applySettings(); MENU.applyLang();
await shot(tag + 'menu.jpg');
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(2500);
await shot(tag + 'fps.jpg');
enterRTS(); await sleep(1500);
S.sel.clear(); S.sel.add(groupsOf(0).find(isSquad)); await sleep(800);
await shot(tag + 'rts.jpg');
MENU.pause(); await sleep(500); await shot(tag + 'pause.jpg');
MENU.show('settings', true); await sleep(500); await shot(tag + 'settings.jpg');
MENU.close(); S.paused = false;
return { ok: 1, w: innerWidth, h: innerHeight, safe: typeof M67 !== 'undefined' && M67.safe };
