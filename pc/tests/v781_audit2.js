// v7.8.1 audit 2: faction screen, support panel, end screen, small buttons (<44px) on phone / PC main + HUD
const R = {};
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
const O = 'D:/AI/pm_v6/shots_v781/au_' + (TOUCH.on ? 'ph' : 'pc') + innerWidth + 'x' + innerHeight + '_';
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main' && S.teams && S.teams[0]) break; } catch (e){} await sleep(300); }
await sleep(800);
SET.lang = 'ru'; SET.denStyle = 0; SET.denUser = true; applySettings(); MENU.show('main'); await sleep(700);
const small = () => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && (r.width < 44 || r.height < 44) && r.right > 0 && r.left < innerWidth; }).map(b => { const r = b.getBoundingClientRect(); return (b.id || String(b.className).slice(0, 14) || b.dataset.t || '') + '[' + b.textContent.trim().slice(0, 10) + ']' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
await shot(O + '01_main.jpg'); R.mainSmall = small();
if (MENU.html_fac76){ MENU.show('fac76', true); await sleep(600); await shot(O + '02_fac.jpg'); R.facSmall = small(); MENU.show('main'); }
MENU.newGame(false); await sleep(1200); if (MENU.cur) MENU.close(); await sleep(1500);
await shot(O + '03_fps.jpg'); R.fpsSmall = small();
if (typeof S78 !== 'undefined'){ S.teams[0].cmd = 6; S78.open = true; S78.sig = ''; await sleep(800); await shot(O + '04_s78.jpg'); R.s78Small = small(); S78.open = false; S78.sig = ''; }
if (typeof HINTS !== 'undefined'){ try { HINTS.show('t78_test', 'Аномалия впереди: «Поющая жила». Её выдаёт гул, свечение или марево. Разряди взрывом или брось болт — уснёт на полминуты.', [], 'a78x'); } catch (e){} await sleep(500); await shot(O + '05_hint.jpg'); }
enterRTS(); await sleep(1300); await shot(O + '06_rts.jpg'); R.rtsSmall = small();
// end screen
S.over = true; S.winner = 0; S.overWhy = 'тест'; try { MENU.show('end'); } catch (e){ R.endErr = e.message; } await sleep(900); await shot(O + '07_end.jpg'); R.endSmall = small();
MENU.toMenu(); await sleep(500);
R.errs = errs;
return R;
