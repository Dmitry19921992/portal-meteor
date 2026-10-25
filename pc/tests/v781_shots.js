// v7.8.1 exploration screenshots: menus, sheet, quit, HUD (PC or phone depending on runner args)
const R = {};
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
const O = 'D:/AI/pm_v6/shots_v781/sh_' + (TOUCH.on ? 'ph' : 'pc') + innerWidth + 'x' + innerHeight + '_';
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
SET.lang = 'ru'; SET.denStyle = 0; SET.denUser = true; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(700);
await shot(O + '01_main.jpg');
MENU.newGame(false); await sleep(1200); if (MENU.cur) MENU.close(); await sleep(1200);
if (typeof TUT !== 'undefined' && TUT.finish && TUT.on) TUT.finish();
await shot(O + '02_fps.jpg');
if (TOUCH.on && typeof M67 !== 'undefined'){ M67.toggleSheet(true); await sleep(600); await shot(O + '03_sheet_fps.jpg'); R.sheetFps = M67.sheet.innerText.replace(/\s+/g, ' ').slice(0, 600); M67.toggleSheet(false); }
enterRTS(); await sleep(1500); await shot(O + '04_rts.jpg');
if (TOUCH.on && typeof M67 !== 'undefined'){ M67.toggleSheet(true); await sleep(600); await shot(O + '05_sheet_rts.jpg'); R.sheetRts = M67.sheet.innerText.replace(/\s+/g, ' ').slice(0, 600); M67.toggleSheet(false); }
MENU.pause(); await sleep(700); await shot(O + '06_pause.jpg');
document.getElementById('m_menu') && document.getElementById('m_menu').click(); await sleep(600); R.afterMenu = MENU.cur; await shot(O + '07_quit.jpg');
MENU.toMenu(); await sleep(500);
R.errs = errs;
return R;
