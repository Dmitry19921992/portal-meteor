// T34 live test (PC, 1280×720): переназначение кнопок геймпада + страница «Геймпад».
// Модуль: v820_t34.js, глобальный T34 (?t34=0 — выкл.). Интерфейс зафиксирован в TASK T34.
// Запуск (из D:\AI\pm_v6, сервер 8831 поднимает tests34/chrome.ps1, Chrome — тоже он, порт 9434):
//   node wt_t34/tests34/cdp_tab.js wt_t34/tests34/t34_live.js --target dist/t34_test.html --port 9434 --vp 1280x720
// Сценарии: a загрузка (T34.on, map()===null, out.err пуст) · b страница gp812 (16 рядов [data-gp34], сброс)
// · c заглушка геймпада + GP812.active · d remap (fire→4, физ.7 мимо, swap a↔b) · e persist pm_settings
// · f глифы · g флаг T34.on=false → стандарт RT=7 снова огонь · h verdict/pass. Скрины: tests34/shots/pc_*.jpg.
// Тело обёрнуто в async-IIFE, чтобы проходил `node --check` (у t33_live.js тот же top-level await не проходит).
// Раннер cdp_tab.js всё равно оборачивает код в свой async-IIFE и ждёт awaitPromise — вложенный промис разворачивается.
return (async () => {
const out = { err: [] };
const SH = 'D:/AI/pm_v6/wt_t34/tests34/shots/pc_';
const W = (k, f) => { try { out[k] = f(); } catch (e){ out.err.push(k + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
// ---- вход в бой (паттерн из t33_live.js)
for (let i = 0; i < 400 && (typeof MENU === 'undefined' || MENU.cur == null); i++) await sleep(500);
// ---- a. загрузка: T34 включён, раскладка стандартная
W('boot', () => ({ T34on: (typeof T34 !== 'undefined') && T34.on, mapIsNull: (typeof T34 !== 'undefined') ? T34.map() === null : 'no T34', roles: (typeof T34 !== 'undefined') ? T34.ROLES.length : 'no T34', menu: MENU.cur, attract: S.attract }));
const p = ctr('#m_f76now') || ctr('#m_u815play'); if (p) await IN.click(p[0], p[1]);
for (let i = 0; i < 60; i++){ if (!(typeof FEEL76 !== 'undefined' && FEEL76.intro)) break; await sleep(500); }
await sleep(2500);
out.start = { attract: S.attract, mode: S.mode, menu: MENU.cur, me: !!S.me, T34on: (typeof T34 !== 'undefined') && T34.on, gp812on: (typeof GP812 !== 'undefined') && GP812.on };
await shot(SH + '1_battle.jpg');
// ---- b. страница «Геймпад»: 16 рядов переназначения + кнопка сброса (скрин ДО закрытия)
W('pageOpen', () => { MENU.show('gp812'); return MENU.cur; });
await shot(SH + '2_gp34page.jpg');
W('page', () => {
  const rows = document.querySelectorAll('[data-gp34]').length;
  const reset = document.querySelector('#gp34reset, [data-reset="gp34"]');
  const r = { rows, reset: !!reset };
  MENU.close();
  return r;
});
// ---- c. заглушка геймпада: фейковый standard-пад (17 кнопок, 4 оси), добиваемся GP812.active
const pad = { id: 'Xbox Wireless Controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
W('padStub', () => {
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] }); }
  catch (e){ Navigator.prototype.getGamepads = () => [pad]; }
  window.dispatchEvent(new Event('gamepadconnected'));
  return { stubbed: navigator.getGamepads().length === 1, id: navigator.getGamepads()[0].id };
});
const press = (i, v) => { const b = pad.buttons[i]; b.pressed = !!v; b.touched = !!v; b.value = v ? 1 : 0; };
const holdBtn = async (i, ms) => { press(i, true); await sleep(ms || 400); const r = { mouseL, mouseR }; press(i, false); await sleep(300); return r; };
W('fpsCtx', () => { if (MENU.isOpen()) MENU.close(); S.paused = false; return { mode: S.mode, me: !!ctrlEntity(), paused: S.paused }; });
press(0, true);
for (let i = 0; i < 40 && !(typeof GP812 !== 'undefined' && GP812.active); i++) await sleep(100);
press(0, false); await sleep(300);
out.pad = { active: (typeof GP812 !== 'undefined') && GP812.active, id: (typeof GP812 !== 'undefined') && GP812.id, kind: (typeof GP812 !== 'undefined') && GP812.kind };
await shot(SH + '3_pad.jpg');
// ---- d. remap: fire→4 (swap с lb), огонь с физ.4, мимо с физ.7, затем swap a↔b
W('assignFire', () => { T34.assign('fire', 4); const m = T34.map(); return { fire: m && m.fire, aim: m && m.aim, active: T34.remapActive() }; });
W('sanitize', () => { SET.swapMouse = false; mouseL = false; mouseR = false; return { swapMouse: SET.swapMouse }; });
const fire4 = await holdBtn(4, 450);
const before7 = mouseL;
const fire7 = await holdBtn(7, 450);
W('swap', () => { T34.assign('a', 1); const m = T34.map(); return { v0: m && m.v[0], v1: m && m.v[1] }; });
out.remap = { fire4, before7, fire7, swap: out.swap };
await shot(SH + '4_remap.jpg');
// ---- e. persist: gp812map в pm_settings, reset → map()===null и SET.gp812map удалён
W('persist', () => {
  const s = JSON.parse(localStorage.getItem('pm_settings') || '{}');
  const r = { saved: !!s.gp812map, lsFire: s.gp812map && s.gp812map.fire, setFire: SET.gp812map && SET.gp812map.fire };
  T34.reset();
  r.mapAfterReset = T34.map();
  r.setHasKey = 'gp812map' in SET;
  return r;
});
// ---- f. глифы: после повторного assign('fire',4) подсказка огня — это значок физ. кнопки 4
W('glyph', () => { T34.assign('fire', 4); return { glyph: GP812.glyph('fire'), g4: GP812.g(4), eq: GP812.glyph('fire') === GP812.g(4) }; });
// ---- g. флаг выключения: T34.on=false → физ. 7 (стандартный RT) снова даёт огонь
W('flagOff', () => { T34.on = false; mouseL = false; mouseR = false; return 'ok'; });
const off7 = await holdBtn(7, 450);
W('flagOn', () => { T34.on = true; return 'ok'; });
out.flag = { off7 };
await shot(SH + '5_flagoff.jpg');
// ---- h. итог
out.verdict = {
  bootOn: out.boot.T34on === true,
  stdMap: out.boot.mapIsNull === true,
  battleFps: out.start.mode === 'fps' && out.start.me === true,
  rows16: out.page.rows === 16,
  resetBtn: out.page.reset === true,
  stubOk: out.padStub.stubbed === true,
  padActive: out.pad.active === true,
  assignFire: out.assignFire.fire === 4,
  fireOn4: fire4.mouseL === true,
  fireNotOn7: before7 === false && fire7.mouseL === false,
  swapAB: out.swap.v0 === 1 && out.swap.v1 === 0,
  persist: out.persist.saved === true && out.persist.lsFire === 4 && out.persist.mapAfterReset === null && out.persist.setHasKey === false,
  glyph: out.glyph.eq === true,
  flagOff: off7.mouseL === true,
  noErr: out.err.length === 0,
};
out.pass = Object.keys(out.verdict).every(k => out.verdict[k]);
W('stats', () => ({ GP812: GP812.stats, T34map: T34.map() && { fire: T34.map().fire }, T34on: T34.on }));
return out;
})();
