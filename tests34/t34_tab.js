// T34 tablet test (iPad 1024×768, touch): увеличенная миникарта шутера на планшете.
// Запуск (из D:\AI\pm_v6; --tablet задаёт viewport/UA/тач в cdp_tab.js, --reload — чтобы эмуляция
// применилась ДО загрузки страницы, иначе TOUCH.on/TAB812 не включатся):
//   node wt_t34/tests34/cdp_tab.js wt_t34/tests34/t34_tab.js --target dist/t34_test.html --port 9434 --tablet --reload
// Ожидания: радиус мм шутера с T34 — Math.round(48*TAB812.k), без T34 — 48; радиус мм стратега
// без регресса — Math.round(36*TAB812.k). Скрины: tests34/shots/tab_*.jpg.
return (async () => {
const out = { err: [] };
const SH = 'D:/AI/pm_v6/wt_t34/tests34/shots/tab_';
const DPR = devicePixelRatio || 1;   // рекордер масштабирует радиус на dpr канвы
const W = (k, f) => { try { out[k] = f(); } catch (e){ out.err.push(k + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
// ---- рекордер окружностей: эффективный радиус = аргумент arc × текущий масштаб канвы
let cap = null;
const a0 = CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc = function(x, y, r){ if (cap){ try { cap.push(Math.abs(this.getTransform().a) * r); } catch (e){ cap.push(r); } } return a0.apply(this, arguments); };
for (let i = 0; i < 400 && (typeof MENU === 'undefined' || MENU.cur == null); i++) await sleep(500);
W('tab', () => ({ touch: TOUCH.on, tab: TAB812.on, k: +TAB812.k.toFixed(3), m67: M67.active(), mm: M67.pref.mm, vp: [innerWidth, innerHeight] }));
await shot(SH + '1_menu.jpg');
W('battle', () => {
  if (MENU.isOpen()) MENU.close();
  newMatch({ fac76: [0, 1] }); S.diff = 1; S.endless = true; S.paused = false;
  if (typeof V87M !== 'undefined') V87M.go('fps');
  return { mode: S.mode, attract: S.attract, paused: S.paused };
});
await sleep(2200);
W('fpsCtx', () => { if (MENU.isOpen()) MENU.close(); S.paused = false; return { mode: S.mode, attract: S.attract, me: !!ctrlEntity() }; });
out.battle = { mode: S.mode, me: !!S.me, attract: S.attract, tab: TAB812.on, k: +TAB812.k.toFixed(3), dpr: devicePixelRatio };
await shot(SH + '2_battle.jpg');
// ---- миникарта шутера: радиус первой окружности drawMinimap()
const mmR = () => { cap = []; try { drawMinimap(); } catch (e){ out.err.push('drawMinimap: ' + e.message); } const v = cap && cap.length ? cap[0] : null; const n = cap ? cap.length : 0; cap = null; return { r: v, arcs: n }; };
W('mmOn', () => { M67.pref.mm = true; const m = mmR(); return { r: m.r, arcs: m.arcs, k: +TAB812.k.toFixed(3), expect: Math.round(48 * TAB812.k) * DPR, tol: 2*DPR, api: T34.mmR(), dpr: DPR }; });
await sleep(300);
W('mmHotspot', () => { const b = M67.bMM; const R = T34.mmR(); return { w: b ? parseFloat(b.style.width) : null, h: b ? parseFloat(b.style.height) : null, expect: R * 2 }; });
W('mmClash', () => {
  const R = T34.mmR(), sf = M67.safe, m73 = M73.act();
  const top = m73 ? sf.t + 6 : 50;
  const map = [sf.l + 8, top, sf.l + 8 + 2 * R, top + 2 * R].map(Math.round);
  const hud = document.getElementById('hud'), hr = hud && hud.offsetWidth ? hud.getBoundingClientRect() : null;
  const box = hr ? [Math.round(hr.left), Math.round(hr.top), Math.round(hr.right), Math.round(hr.bottom)] : null;
  const ov = box ? !(box[2] < map[0] || box[0] > map[2] || box[3] < map[1] || box[1] > map[3]) : false;
  return { m73, map, hud: box, overlap: ov, cls: document.body.classList.contains('t34mm') };
});
await shot(SH + '3_mm_on.jpg');
W('mmOff', () => { try { T34.on = false; const m = mmR(); return { r: m.r, arcs: m.arcs, expect: 48 * DPR, tol: 2*DPR }; } finally { T34.on = true; } });
await sleep(300);
await shot(SH + '4_mm_off.jpg');
// ---- миникарта стратегa: не сломана (36*k как в v812_tab.js)
W('toRts', () => { if (typeof V87M !== 'undefined' && S.mode !== 'rts') V87M.go('rts'); return S.mode; });
await sleep(1500);
W('rtsMM', () => { mmCenters(); return { R: MM.R, expect: Math.round(36 * TAB812.k), k: +TAB812.k.toFixed(3), tab: TAB812.on, m67: M67.active() }; });
await shot(SH + '5_rts.jpg');
// ---- страница «Геймпад» на планшете: таблица влезает, тап по строке работает
W('pageOpen', () => { MENU.show('gp812'); return MENU.cur; });
await sleep(600);
W('pageFit', () => {
  const p = document.querySelector('.gp812page'), t = document.querySelector('.t34map');
  const pr = p && p.getBoundingClientRect(), tr = t && t.getBoundingClientRect();
  const rows = document.querySelectorAll('[data-gp34]').length;
  return { rows, pageH: pr && Math.round(pr.height), tblH: tr && Math.round(tr.height), vh: innerHeight, scroll: p ? p.scrollHeight > p.clientHeight + 4 : null };
});
await shot(SH + '6_gp34page.jpg');
W('pageClose', () => { MENU.close(); return MENU.cur; });
W('backFps', () => { if (typeof V87M !== 'undefined') V87M.go('fps'); return S.mode; });
await sleep(800);
// ---- итог
out.verdict = {
  tabOn: out.tab && out.tab.tab === true && out.tab.k > 1.2 && out.tab.m67 === true,
  battleFps: out.battle && out.battle.mode === 'fps' && out.fpsCtx.me === true && out.fpsCtx.attract === false,
  mmOn: out.mmOn && Math.abs(out.mmOn.r - out.mmOn.expect) <= out.mmOn.tol,
  mmApi: out.mmOn && (out.mmOn.api * DPR === out.mmOn.expect),
  mmHotspot: out.mmHotspot && Math.abs(out.mmHotspot.w - out.mmHotspot.expect) <= 2,
  mmOff: out.mmOff && Math.abs(out.mmOff.r - out.mmOff.expect) <= out.mmOff.tol,
  rtsNoRegress: out.rtsMM && out.rtsMM.R === out.rtsMM.expect,
  rows16: out.pageFit && out.pageFit.rows === 16,
  pageGroups: out.pageFit && out.pageFit.tblH > 0 && out.pageFit.tblH < out.pageFit.vh,
  mmNoClash: out.mmClash && out.mmClash.overlap === false,
  noErr: out.err.length === 0,
};
out.pass = Object.keys(out.verdict).every(k => out.verdict[k]);
return out;
})();