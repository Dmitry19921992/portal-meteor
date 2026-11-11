// T34 phone test (iPhone, 844×390): регрессии нет — миникарта шутера осталась 48, страница «Геймпад» работает.
// Запуск: node wt_t34/tests34/cdp_tab.js wt_t34/tests34/t34_phone.js --target dist/t34_test.html --port 9434 --phone2 --reload
return (async () => {
const out = { err: [] };
const SH = 'D:/AI/pm_v6/wt_t34/tests34/shots/ph_';
const DPR = devicePixelRatio || 1;
const W = (k, f) => { try { out[k] = f(); } catch (e){ out.err.push(k + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
let capA = null;
const a0 = CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc = function(x, y, r){ if (capA){ try { capA.push(Math.abs(this.getTransform().a) * r); } catch (e){ capA.push(r); } } return a0.apply(this, arguments); };
for (let i = 0; i < 400 && (typeof MENU === 'undefined' || MENU.cur == null); i++) await sleep(500);
W('phone', () => ({ touch: TOUCH.on, tab: TAB812.on, k: +TAB812.k.toFixed(3), m67: M67.active(), vp: [innerWidth, innerHeight], dpr: DPR }));
W('battle', () => {
  if (MENU.isOpen()) MENU.close();
  newMatch({ fac76: [0, 1] }); S.diff = 1; S.endless = true; S.paused = false;
  if (typeof V87M !== 'undefined') V87M.go('fps');
  return { mode: S.mode, attract: S.attract };
});
await sleep(2200);
W('fpsCtx', () => { if (MENU.isOpen()) MENU.close(); S.paused = false; return { mode: S.mode, me: !!ctrlEntity() }; });
const mm = () => { capA = []; try { drawMinimap(); } catch (e){ out.err.push('drawMinimap: ' + e.message); } const v = capA && capA.length ? capA[0] : null; capA = null; return v; };
W('mm', () => { M67.pref.mm = true; const rOn = mm(); T34.on = false; const rOff = mm(); T34.on = true; return { rOn, rOff, expect: 48 * DPR, api: T34.mmR() }; });
await shot(SH + '1_battle.jpg');
W('page', () => { MENU.show('gp812'); const rows = document.querySelectorAll('[data-gp34]').length; const reset = !!document.querySelector('[data-reset="gp34"]'); return { cur: MENU.cur, rows, reset }; });
await shot(SH + '2_gp34page.jpg');
W('pageClose', () => { MENU.close(); return MENU.cur; });
out.verdict = {
  isPhone: out.phone.touch === true && out.phone.tab === false && out.phone.m67 === true,
  battle: out.fpsCtx.me === true,
  mmUnchanged: out.mm && Math.abs(out.mm.rOn - out.mm.expect) <= 2 * DPR && Math.abs(out.mm.rOff - out.mm.expect) <= 2 * DPR && out.mm.api === null,
  page: out.page.cur === 'gp812' && out.page.rows === 16 && out.page.reset === true,
  noErr: out.err.length === 0,
};
out.pass = Object.keys(out.verdict).every(k => out.verdict[k]);
return out;
})();