// v7.5 релиз, телефон: по умолчанию «Обычный» (телефон — только по FPS), авто-Денди из LITE73.adapt при FPS < 20, приоритет выбора игрока
const out = {};
const O = 'D:/AI/pm_v6/shots75rel/';
const info = () => ({ style: SET.denStyle, rows: SET.denRows, user: SET.denUser, auto: SET.denAuto, active: DEN75.active(), cv: canvas.width + 'x' + canvas.height, lite: LITE73.on, sc: LITE73.sc, deep: LITE73.deep, as75: SET.as75, fps: +fpsVal.toFixed(1) });
SET.denUser = false; SET.denAuto = 0; SET.denStyle = 0; SET.denRows = 0; applySettings(); MENU.save();
out.boot = Object.assign(info(), { weak: DEN75.weakGPU(), touch: TOUCH.on });
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(5000);
if (MENU.cur) MENU.close(); S.paused = false;
out.match = info();
await shot(O + 'ph_match_normal.jpg');
// слабый телефон: адаптация уже на минимуме, FPS 12 → через 8 с — «Денди» 120 строк
LITE73.sc = 0.35; LITE73.deep = 1; S.scale = 0.35; resize();
for (let i = 0; i < 9; i++) LITE73.adapt(12);
await sleep(2500);
out.auto = Object.assign(info(), { feed: S.feed.map(f => f.text).filter(t => /Денди|Dendy/.test(t)).length });
await shot(O + 'ph_match_autodendy.jpg');
enterRTS(); await sleep(2500); await shot(O + 'ph_rts_autodendy.jpg'); enterFPS(); await sleep(1000);
// игрок сам выбрал «Обычный» (кнопка − в ☰ → Настройки → Графика) — авто больше не включает
MENU.pause(); await sleep(300); MENU.show('p71s_gfx', true); await sleep(600);
out.gfxLabel = (document.querySelector('#screen [data-p71c="denStyle"]') || {}).parentElement ? document.querySelector('#screen [data-p71c="denStyle"]').parentElement.innerText.replace(/\s+/g, ' ').slice(0, 80) : null;
await shot(O + 'ph_gfx_auto.jpg');
const minus = document.querySelector('#screen [data-p71c="denStyle"][data-d="-1"]');
if (minus){ const r = minus.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); await sleep(800); }
out.userPick = Object.assign(info(), { saved: JSON.parse(localStorage.getItem('pm_settings') || '{}').denUser });
MENU.resume(); await sleep(500); if (MENU.cur) MENU.close(); S.paused = false;
for (let i = 0; i < 9; i++) LITE73.adapt(12);
await sleep(1500);
out.afterUser = info();
await shot(O + 'ph_match_userpick.jpg');
SET.denUser = false; SET.denAuto = 0; SET.denStyle = 0; SET.denRows = 0; applySettings(); MENU.save();
out.errs = errs.slice(0, 12);
return out;
