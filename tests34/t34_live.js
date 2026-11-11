// T34 live test (ПК, 1280×720): переназначение кнопок геймпада + страница «Геймпад».
// Модуль: v820_t34.js, глобальный T34 (?t34=0 — выкл.).
// Запуск (сервер 8831 и Chrome 9434 поднимает tests34/chrome.ps1):
//   node wt_t34/tests34/cdp_tab.js wt_t34/tests34/t34_live.js --target dist/t34_test.html --port 9434 --vp 1280x720
// Сценарии: a загрузка (T34.on, map()===null) · b настоящий бой и шутер · c заглушка геймпада
// · d переназначение (fire→4, физ.7 мимо, swap a↔b) · e страница (16 рядов, сброс)
// · f захват кнопки мышью по строке (без «нажатий» меню) · g Esc/таймаут отменяют захват
// · h persist/reset · i глифы · j флаг ?t34=0. Скрины: tests34/shots/pc_*.jpg.
return (async () => {
const out = { err: [] };
const SH = 'D:/AI/pm_v6/wt_t34/tests34/shots/pc_';
const W = (k, f) => { try { out[k] = f(); } catch (e){ out.err.push(k + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
// ---- загрузка игры
for (let i = 0; i < 400 && (typeof MENU === 'undefined' || MENU.cur == null); i++) await sleep(500);
W('boot', () => {
  const ls = JSON.parse(localStorage.getItem('pm_settings') || '{}');
  const r = { T34on: (typeof T34 !== 'undefined') && T34.on, roles: (typeof T34 !== 'undefined') ? T34.ROLES.length : 'no T34', attract: S.attract, lsMap: !!ls.gp812map };
  try { delete SET.gp812map; } catch (e){}   // прошлый прогон мог оставить раскладку в localStorage
  r.mapIsNull = T34.map() === null;
  return r;
});
// ---- a. настоящий бой (не аттракт) и сразу шутер
W('battle', () => {
  if (MENU.isOpen()) MENU.close();
  newMatch({ fac76: [0, 1] }); S.diff = 1; S.endless = true; S.paused = false;
  if (typeof V87M !== 'undefined') V87M.go('fps');
  return { mode: S.mode, attract: S.attract, paused: S.paused };
});
await sleep(2000);
W('fpsCtx', () => { if (MENU.isOpen()) MENU.close(); S.paused = false; return { mode: S.mode, attract: S.attract, me: !!ctrlEntity(), paused: S.paused }; });
await shot(SH + '1_battle.jpg');
// ---- b. заглушка геймпада: фейковый standard-пад (17 кнопок, 4 оси)
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
press(0, true);
for (let i = 0; i < 40 && !(typeof GP812 !== 'undefined' && GP812.active); i++) await sleep(100);
press(0, false); await sleep(300);
out.pad = { active: GP812.active, id: GP812.id, kind: GP812.kind };
// ---- c. переназначение: fire→4 (обмен с LB), затем swap a↔b
W('assignFire', () => { T34.assign('fire', 4); const m = T34.map(); return { fire: m && m.fire, aim: m && m.aim, lb: m && m.v[4], active: T34.remapActive() }; });
W('sanitize', () => { SET.swapMouse = false; mouseL = false; mouseR = false; return { swapMouse: SET.swapMouse }; });
const fire4 = await holdBtn(4, 450);
const fire7 = await holdBtn(7, 450);
W('swap', () => { T34.assign('a', 1); const m = T34.map(); return { v0: m && m.v[0], v1: m && m.v[1] }; });
out.remap = { fire4, fire7, swap: out.swap };
await shot(SH + '2_remap.jpg');
// ---- d. страница «Геймпад»: 16 рядов переназначения + кнопка сброса
W('pageOpen', () => { T34.reset(); MENU.show('gp812'); return MENU.cur; });
await shot(SH + '3_gp34page.jpg');
W('page', () => ({ rows: document.querySelectorAll('[data-gp34]').length, reset: !!document.querySelector('[data-reset="gp34"]'), note: !!document.querySelector('.t34map') }));
// ---- e. захват кнопки настоящим кликом по строке «Огонь»: клик → ожидание → нажатие физ. 5
const rowAt = sel => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
W('capStart', () => { const p = rowAt('tr[data-gp34="fire"]'); if (!p) return 'no row'; return { at: p }; });
{ const p = rowAt('tr[data-gp34="fire"]'); if (p) await IN.click(p[0], p[1]); await sleep(300); }
W('capArmed', () => ({ cap: T34.cap, page: MENU.cur, waitCell: !!document.querySelector('.t34wait') }));
await shot(SH + '4_capturing.jpg');
press(5, true); await sleep(400); press(5, false); await sleep(400);
W('capDone', () => { const m = T34.map(); return { cap: T34.cap, page: MENU.cur, fire: m && m.fire, holdFire: GP812.held.fire, mouseL }; });
// ---- f. отмена: Esc и таймаут (оба — без выхода со страницы)
W('capEscArm', () => { T34.startCapture('b'); return T34.cap; });
await IN.key('Escape', 60); await sleep(300);
W('capEsc', () => ({ cap: T34.cap, page: MENU.cur, cancels: T34.stats.cancels }));
W('capTimeoutArm', () => { T34.startCapture('x'); T34.capT = performance.now() + 250; return T34.cap; });
await sleep(700);
W('capTimeout', () => ({ cap: T34.cap, page: MENU.cur }));
await shot(SH + '5_page_after.jpg');
// ---- g. persist: раскладка в pm_settings, сброс → map()===null
W('persist', () => {
  T34.assign('fire', 4);
  const s = JSON.parse(localStorage.getItem('pm_settings') || '{}');
  const r = { saved: !!s.gp812map, lsFire: s.gp812map && s.gp812map.fire, setFire: SET.gp812map && SET.gp812map.fire };
  T34.reset();
  r.mapAfterReset = T34.map();
  r.setHasKey = 'gp812map' in SET;
  return r;
});
// ---- h. глифы: после assign('fire',4) подсказка огня — значок физ. кнопки 4
W('glyph', () => { T34.assign('fire', 4); return { glyph: GP812.glyph('fire'), g4: GP812.g(4), eq: GP812.glyph('fire') === GP812.g(4) }; });
// ---- i. флаг выключения: T34.on=false → физ. 7 (стандартный RT) снова даёт огонь
W('flagOff', () => { MENU.close(); T34.on = false; mouseL = false; mouseR = false; return 'ok'; });
const off7 = await holdBtn(7, 450);
W('flagOn', () => { T34.on = true; return 'ok'; });
out.flag = { off7 };
await shot(SH + '6_flagoff.jpg');
// ---- j. флаг: ?t34=0 — нет ни таблицы, ни увеличения (проверяем на живом объекте)
W('flagHtml', () => { T34.on = false; const h = GP812.html(); T34.on = true; return { hasTable: h.includes('t34map'), mmApi: (T34.on, T34.mmR()) }; });
// ---- k. ПК: миникарта шутера не изменилась (R=82), T34.mmR() === null
W('mmPc', () => {
  let capA = null;
  const a0 = CanvasRenderingContext2D.prototype.arc;
  CanvasRenderingContext2D.prototype.arc = function(x, y, r){ if (capA){ try { capA.push(Math.abs(this.getTransform().a) * r); } catch (e){ capA.push(r); } } return a0.apply(this, arguments); };
  const m = () => { capA = []; try { drawMinimap(); } catch (e){ out.err.push('drawMinimap: ' + e.message); } const v = capA && capA.length ? capA[0] : null; capA = null; return v; };
  try {
    M67.pref.mm = true;
    const rOn = m(); T34.on = false; const rOff = m(); T34.on = true;
    return { rOn, rOff, api: T34.mmR(), tab: (typeof TAB812 !== 'undefined') && TAB812.on, m67: M67.active() };
  } finally { CanvasRenderingContext2D.prototype.arc = a0; }
});
// ---- итог
out.verdict = {
  bootOn: out.boot.T34on === true,
  stdMap: out.boot.mapIsNull === true,
  roles16: out.boot.roles === 16,
  battleFps: out.battle.mode === 'fps' && out.fpsCtx.me === true && out.fpsCtx.attract === false,
  stubOk: out.padStub.stubbed === true,
  padActive: out.pad.active === true,
  assignFire: out.assignFire.fire === 4 && out.assignFire.lb === 7,
  fireOn4: fire4.mouseL === true,
  fireNotOn7: fire7.mouseL === false,
  swapAB: out.swap.v0 === 1 && out.swap.v1 === 0,
  rows16: out.page.rows === 16 && out.page.reset === true && out.page.note === true,
  capArmed: out.capArmed.cap === 'fire' && out.capArmed.page === 'gp812' && out.capArmed.waitCell === true,
  capAssign: out.capDone.fire === 5 && out.capDone.cap === null && out.capDone.page === 'gp812' && out.capDone.holdFire === 0,
  capEsc: out.capEsc.cap === null && out.capEsc.page === 'gp812',
  capTimeout: out.capTimeout.cap === null && out.capTimeout.page === 'gp812',
  persist: out.persist.saved === true && out.persist.lsFire === 4 && out.persist.mapAfterReset === null && out.persist.setHasKey === false,
  glyph: out.glyph.eq === true,
  flagOff: off7.mouseL === true,
  flagHtml: out.flagHtml && out.flagHtml.hasTable === false,
  mmPc: out.mmPc && out.mmPc.rOn === 82 && out.mmPc.rOff === 82 && out.mmPc.api === null,
  noErr: out.err.length === 0,
};
out.pass = Object.keys(out.verdict).every(k => out.verdict[k]);
W('stats', () => ({ T34: T34.stats, map: T34.map() && { fire: T34.map().fire }, on: T34.on }));
return out;
})();