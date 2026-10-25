// mission_saves.js — слоты, экспорт → импорт → загрузка (круг), экран сохранений и выход в меню с автосохранением
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(500); }
window.requestAnimationFrame = () => 0;
const out = {};
MENU.newGame();
for (let i = 0; i < 600; i++) update(0.05);          // 30 с боя
const before = { time: Math.round(S.time), units: S.units.length, squads: S.squads.length, bld: S.buildings.length, ore: Math.round(S.teams[0].ore) };
out.saveM1 = SAVE.save('m1');
out.list1 = SAVE.list().map(m => m.slot + '@' + Math.round(m.time) + ' ' + Math.round((m.size || 0) / 1024) + 'KB');
const txt = SAVE.exportText('m1');
out.exportKB = Math.round(txt.length / 1024);
out.exportHead = txt.slice(0, 60);
SAVE.del('m1');
out.afterDel = SAVE.list().map(m => m.slot);
const bad = SAVE.importText('{"hello":1}');
out.badImport = bad.err || 'NO ERROR?!';
const r = SAVE.importText(txt);
out.import = r;
for (let i = 0; i < 200; i++) update(0.05);          // уходим вперёд, потом загружаем импорт
out.loaded = SAVE.load(r.slot);
const after = { time: Math.round(S.time), units: S.units.length, squads: S.squads.length, bld: S.buildings.length, ore: Math.round(S.teams[0].ore) };
out.roundtrip = { before, after, same: JSON.stringify(before) === JSON.stringify(after) };
for (let i = 0; i < 100; i++) update(0.05);          // после загрузки мир живёт без ошибок
out.aliveAfterLoad = !!(S.me && (S.me.alive || S.me.cls === 'bld'));
// экран сохранений: экспорт через кнопку (скачивание + текстовое поле)
MENU.pause(); MENU.show('saves', true);
out.rows = document.querySelectorAll('#screen .srow').length;
const exp = document.querySelector('#screen [data-sv^="exp:"]'); if (exp) exp.click();
out.textareaKB = Math.round(($('m_txt').value || '').length / 1024);
out.msg = $('m_msg').textContent.slice(0, 90);
// выход в меню: подтверждение + автосохранение
MENU.back();
out.inPause = MENU.cur;
$('m_menu').click();
out.quitScreen = MENU.cur;
const t0 = Date.now();
$('m_quitok').click();
const auto = SAVE.meta('auto');
out.quit = { menu: MENU.cur, attract: S.attract, autoFresh: !!(auto && auto.at >= t0 - 1000), autoTime: auto && Math.round(auto.time) };
out.mainHasContinue = !!$('m_load') && !!$('m_saves');
return out;
