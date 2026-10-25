// v7.4 ПК: настройки, пауза, рефлекс от убийств, десант, подсказки, голос при вселении
SET.lang = 'ru'; applySettings(); MENU.applyLang();
await shot('D:/AI/pm_v6/shots/v74_pc_menu.jpg');
ok('date', /сборка \d\d\.\d\d\.2026/.test(document.getElementById('screen').textContent), (document.getElementById('screen').textContent.match(/сборка [^·]*/) || [])[0]);
ok('ver', /v7\.4 ·/.test(document.getElementById('screen').textContent));
MENU.show('settings'); await sleep(500);
await shot('D:/AI/pm_v6/shots/v74_pc_settings.jpg');
ok('hintRows', document.querySelectorAll('#screen [data-p74tog]').length >= 5, document.querySelectorAll('#screen [data-p74tog]').length);
const pv = document.querySelector('#screen [data-p74tog="possVeh"]');
if (pv){ const v0 = SET.possVeh; pv.click(); await sleep(200); ok('togVeh', SET.possVeh === !v0); pv.click(); await sleep(200); ok('togVeh2', SET.possVeh === v0); }
const runs0 = HINT74.st.runs;
MENU.newGame(); await sleep(4500);
ok('runs', HINT74.st.runs === runs0 + 1);
ok('possVehPC', SET.possVeh === true);
// рефлекс от убийств
const K = S.kit; K.reflex = 0.2; const en = S.units.find(u => u.team === 1 && u.alive);
if (en){ PROG.onKill(en, S.me); PROG.onKill(en, S.me); ok('reflexKill', K.reflex > 0.33, K.reflex); ok('combo', REFL74.combo === 2); }
// подсказки: базовые на 3-м запуске
const st = HINT74.st.runs; HINT74.st.runs = 5; SET.hintBset = false;
ok('basicOff', !HINT74.basicOn());
HINT74.once = {}; HINT74.st.used.move = 1; ok('basicHidden', !HINT74.ok('move', 'move'));
delete HINT74.st.used.zzz; ok('unusedShown', HINT74.ok('squad', 'zzz') && !HINT74.ok('squad', 'zzz'));
HINT74.st.runs = st; HINT74.save();
// голос при вселении
const vp0 = VOICE66.played; const other = S.units.find(u => u.team === 0 && u.alive && u !== S.me && u.cls === 'inf');
if (other){ takeControl(other); await sleep(1500); ok('possessVoice', VOICE66.played > vp0, [vp0, VOICE66.played]); }
// десант: напарники далеко
const me = S.me, sq = me.squad;
if (sq){ for (const u of sq.units) if (u !== me && u.alive) u.pos = surfacePoint(norm(add(me.pos, mul(me.fwd, -300))), 0.3);
  S.teams[0].ore = 999; DROP74.cd = 0; DROP74.t = 0; const n0 = sq.units.filter(u => u.alive).length;
  await sleep(2600); ok('drop', sq.units.filter(u => u.alive).length > n0, [n0, sq.units.filter(u => u.alive).length]); await shot('D:/AI/pm_v6/shots/v74_pc_drop.jpg'); }
await sleep(1500);
await shot('D:/AI/pm_v6/shots/v74_pc_fps.jpg');
MENU.pause(); await sleep(400); await shot('D:/AI/pm_v6/shots/v74_pc_pause.jpg'); MENU.resume && MENU.resume();
ok('no_console_errors', errs.length === 0, errs.slice(0, 4));
return R;
