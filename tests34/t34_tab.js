// T34 tablet test (iPad 1024×768, touch): увеличенная миникарта шутера на планшете.
// Запуск (из D:\AI\pm_v6; --tablet задаёт viewport/UA/тач в cdp_tab.js, --reload — чтобы эмуляция
// применилась ДО загрузки страницы, иначе TOUCH.on/TAB812 не включатся):
//   node wt_t34/tests34/cdp_tab.js wt_t34/tests34/t34_tab.js --target dist/t34_test.html --port 9434 --tablet --reload
// Ожидания по зафиксированному интерфейсу: радиус мм шутера с T34 — Math.round(48*TAB812.k),
// с T34.on=false — 48; радиус мм стратега без регресса — Math.round(36*TAB812.k). Скрины: tests34/shots/tab_*.jpg.
// Тело обёрнуто в async-IIFE, чтобы проходил `node --check` (раннер ждёт awaitPromise — вложенный промис разворачивается).
return (async () => {
const out = { err: [] };
const SH = 'D:/AI/pm_v6/wt_t34/tests34/shots/tab_';
const W = (k, f) => { try { out[k] = f(); } catch (e){ out.err.push(k + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
// ---- рекордер окружностей: эффективный радиус = аргумент arc × текущий масштаб канвы
// (модуль и M67-обёртка рисуют transform-scale: оригинальный drawMinimap пишет аргумент 82, масштаб задаёт transform)
let cap = null;
const a0 = CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc = function(x, y, r){ if (cap){ try { cap.push(Math.abs(this.getTransform().a) * r); } catch (e){ cap.push(r); } } return a0.apply(this, arguments); };
// ---- вход в бой (паттерн из t33_live.js)
for (let i = 0; i < 400 && (typeof MENU === 'undefined' || MENU.cur == null); i++) await sleep(500);
// ---- планшетный профиль активен
W('tab', () => ({ touch: TOUCH.on, tab: TAB812.on, k: +TAB812.k.toFixed(3), m67: M67.active(), mm: M67.pref.mm, vp: [innerWidth, innerHeight] }));
await shot(SH + '1_menu.jpg');
const p = ctr('#m_f76now') || ctr('#m_u815play'); if (p) await IN.click(p[0], p[1]);
for (let i = 0; i < 60; i++){ if (!(typeof FEEL76 !== 'undefined' && FEEL76.intro)) break; await sleep(500); }
await sleep(2500);
W('ensureFps', () => { if (typeof V87M !== 'undefined' && S.mode !== 'fps') V87M.go('fps'); if (MENU.isOpen()) MENU.close(); S.paused = false; return { mode: S.mode, me: !!ctrlEntity() }; });
await sleep(1500);
out.battle = { mode: S.mode, me: !!S.me, attract: S.attract, tab: TAB812.on, k: +TAB812.k.toFixed(3), dpr: devicePixelRatio };
await shot(SH + '2_battle.jpg');
// ---- миникарта шутера: радиус первой окружности drawMinimap()
const mmR = () => { cap = []; try { drawMinimap(); } catch (e){ out.err.push('drawMinimap: ' + e.message); } const v = cap && cap.length ? cap[0] : null; const n = cap ? cap.length : 0; cap = null; return { r: v, arcs: n }; };
W('mmOn', () => { M67.pref.mm = true; const m = mmR(); return { r: m.r, arcs: m.arcs, k: +TAB812.k.toFixed(3), expect: Math.round(48 * TAB812.k), tol: 3, api: (typeof T34.mmR === 'function') ? T34.mmR() : 'no mmR' }; });
await shot(SH + '3_mm_on.jpg');
W('mmOff', () => { try { T34.on = false; const m = mmR(); return { r: m.r, arcs: m.arcs, expect: 48, tol: 3 }; } finally { T34.on = true; } });
await shot(SH + '4_mm_off.jpg');
// ---- миникарта стратега: регресса нет (36*k как в v812_tab.js)
W('toRts', () => { if (typeof V87M !== 'undefined' && S.mode !== 'rts') V87M.go('rts'); return S.mode; });
await sleep(1200);
W('rtsMM', () => { mmCenters(); return { R: MM.R, expect: Math.round(36 * TAB812.k), k: +TAB812.k.toFixed(3), tab: TAB812.on, m67: M67.active() }; });
await shot(SH + '5_rts.jpg');
W('backFps', () => { if (typeof V87M !== 'undefined') V87M.go('fps'); return S.mode; });
await sleep(1000);
// ---- итог
out.verdict = {
  tabOn: out.tab && out.tab.tab === true && out.tab.k > 1.2 && out.tab.m67 === true,
  battleFps: out.battle && out.battle.mode === 'fps' && out.battle.me === true,
  mmOn: out.mmOn && Math.abs(out.mmOn.r - out.mmOn.expect) <= out.mmOn.tol,
  mmApi: out.mmOn && (out.mmOn.api === out.mmOn.expect),
  mmOff: out.mmOff && Math.abs(out.mmOff.r - out.mmOff.expect) <= out.mmOff.tol,
  rtsNoRegress: out.rtsMM && out.rtsMM.R === out.rtsMM.expect,
  noErr: out.err.length === 0,
};
out.pass = Object.keys(out.verdict).every(k => out.verdict[k]);
return out;
})();
