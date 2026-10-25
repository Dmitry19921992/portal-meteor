// v61rts: тест колеса мыши в стратегии. Настоящие WheelEvent на canvas (как от мыши/трекпада),
// между событиями — кадры камеры с шагом 1/60. Метрики как в rtsui_cam.js + «дрейф точки под курсором».
const nap = ms => new Promise(r => setTimeout(r, ms));
if (!S.me || S.attract){ MENU.newGame(); await nap(2500); }
S.paused = true;
enterRTS(); await nap(60);
RCAM.blend = null;
const DT = 1 / 60, rel = () => { for (const k in keys) keys[k] = false; };
const deg = r => r * 180 / Math.PI;
let prev = null, M = {}, cur = null;
function frame(){
  updateRTSCamera(DT);
  const c = rtsCamera();
  S.cam = Object.assign({ fov: S.cam ? S.cam.fov : 1 }, c);
  const m = cur;
  m.n++;
  const ok = [c.pos, c.fwd, c.right, c.up].every(v => v && v.every(isFinite));
  if (!ok){ m.nan++; prev = null; return; }
  if (mapJS(c.pos[0], c.pos[1], c.pos[2]) < 0.15) m.under++;
  if (prev){
    m.maxTurn = max(m.maxTurn, deg(acos(clamp(dot(prev.fwd, c.fwd), -1, 1))));
    m.maxRoll = max(m.maxRoll, deg(acos(clamp(dot(prev.right, c.right), -1, 1))));
    m.maxJump = max(m.maxJump, dist(prev.pos, c.pos));
    m.maxDh = max(m.maxDh, abs(S.rts.h - prev.h));
  }
  m.hs.push(S.rts.h);
  if (m.anchor){ const s = project(m.anchor.p); m.last = s ? hypot(s[0] - m.anchor.x, s[1] - m.anchor.y) : 9999; m.drift = max(m.drift, m.last); }
  prev = { pos: c.pos, fwd: c.fwd, right: c.right, h: S.rts.h };
}
function begin(tag, dir, h, fwd){
  cur = M[tag] = { n: 0, nan: 0, under: 0, maxTurn: 0, maxRoll: 0, maxJump: 0, maxDh: 0, hs: [], drift: 0, anchor: null };
  S.camFly = null; S.rts.goal = null; prev = null;
  if (dir){ S.rts.dir = norm(dir); S.rts.fwd = tangent(fwd || anyTangent(S.rts.dir), S.rts.dir); }
  if (h){ S.rts.h = S.rts.hT = h; }
  RCAM.gr = null; RCAM.lift = 0;
  for (let i = 0; i < 40; i++) frame();   // устоялась
  cur.n = 0; cur.maxTurn = 0; cur.maxJump = 0; cur.maxDh = 0; cur.maxRoll = 0; cur.hs = []; prev = null; frame();
}
function anchorAt(x, y){ const p = pickGround(x, y); cur.anchor = p ? { p, x, y } : null; cur.drift = 0; }
const target = () => document.elementFromPoint(innerWidth / 2, innerHeight / 2) === canvas ? canvas : canvas;
function wheel(dy, x, y, opt){
  const ev = new WheelEvent('wheel', Object.assign({ deltaY: dy, deltaMode: 0, clientX: x, clientY: y, bubbles: true, cancelable: true }, opt || {}));
  (opt && opt.el || canvas).dispatchEvent(ev);
}
const frames = n => { for (let i = 0; i < n; i++) frame(); };
const W = innerWidth, H = innerHeight;
const summary = m => {
  // максимальное изменение высоты за любую секунду (во сколько раз)
  let maxK = 1; const hs = m.hs, w = 60;
  for (let i = 0; i < hs.length; i++){ const j = min(hs.length - 1, i + w); let lo = 1e9, hi = 0; for (let k = i; k <= j; k++){ lo = min(lo, hs[k]); hi = max(hi, hs[k]); } maxK = max(maxK, hi / lo); }
  return { frames: m.n, nan: m.nan, under: m.under, maxTurnDeg: +m.maxTurn.toFixed(2), maxRollDeg: +m.maxRoll.toFixed(2), maxJump_m: +m.maxJump.toFixed(1), maxDh_m: +m.maxDh.toFixed(1), hRatioPerSec: +maxK.toFixed(2), anchorDriftMax_px: m.anchor ? Math.round(m.drift) : null, anchorDriftEnd_px: m.anchor ? Math.round(m.last) : null, hEnd: +hs[hs.length - 1].toFixed(1) };
};
const base = BASES[0];
// 1. обычное колесо: по щелчку раз в 80 мс, курсор у правого-верхнего угла
begin('1_notches_in', base, 200); anchorAt(W * 0.7, H * 0.35);
for (let i = 0; i < 8; i++){ wheel(-100, W * 0.7, H * 0.35); frames(5); } frames(60);
const r1 = summary(cur);
begin('1b_notches_out', base, 40);
for (let i = 0; i < 8; i++){ wheel(100, W * 0.3, H * 0.6); frames(5); } frames(60);
// 2. быстрое вращение: 2 события за кадр, 30 штук, потом обратно
begin('2_fast_spin', base, 285); anchorAt(W * 0.62, H * 0.45);
for (let i = 0; i < 30; i++){ wheel(-100, W * 0.62, H * 0.45); if (i % 2) frame(); } frames(90);
const r2a = summary(cur);
for (let i = 0; i < 30; i++){ wheel(100, W * 0.62, H * 0.45); if (i % 2) frame(); } frames(90);
// 3. «разогнанное» колесо (свободный ход): deltaY 400–1200
begin('3_accel_wheel', base, 285); anchorAt(W * 0.4, H * 0.55);
for (const d of [-400, -800, -1200, -1200, -800]){ wheel(d, W * 0.4, H * 0.55); frame(); } frames(90);
// 4. трекпад: дробные deltaY каждый кадр (инерция), затем щипок (ctrlKey)
begin('4_trackpad', base, 150); anchorAt(W * 0.55, H * 0.5);
for (let i = 0; i < 120; i++){ wheel(-(1 + 7 * Math.sin(i / 120 * Math.PI)) * 1.37, W * 0.55, H * 0.5); frame(); } frames(60);
for (let i = 0; i < 60; i++){ wheel(2.3 + (i % 3) * 0.7, W * 0.55, H * 0.5, { ctrlKey: true }); frame(); } frames(60);
// 5. режимы строк и страниц
begin('5_lines', base, 200); anchorAt(W * 0.5, H * 0.5);
for (let i = 0; i < 6; i++){ wheel(-3, W * 0.5, H * 0.5, { deltaMode: 1 }); frames(4); } frames(60);
const r5 = summary(cur);
begin('5b_pages', base, 200);
for (let i = 0; i < 3; i++){ wheel(-1, W * 0.5, H * 0.5, { deltaMode: 2 }); frames(6); } frames(60);
// 6. колесо во время перелёта
begin('6_during_fly', base, 120);
flyCamTo([0.6, 0.2, 0.77]); for (let i = 0; i < 40; i++){ wheel(-100, W * 0.8, H * 0.2); frame(); } frames(90);
// 7. колесо во время панорамы WASD и вращения Q
begin('7_during_pan', base, 120);
keys.KeyW = true; keys.KeyQ = true; for (let i = 0; i < 60; i++){ if (i % 3 === 0) wheel(i < 30 ? -100 : 100, W * 0.75, H * 0.3); frame(); } rel(); frames(60);
// 8. высоко, курсор у края диска метеорита / над небом / у кромки экрана
begin('8_limb_sky', base, 285);
for (const [x, y] of [[W * 0.5, H * 0.04], [W * 0.97, H * 0.5], [W * 0.03, H * 0.1], [W * 0.5, H * 0.15], [W * 0.99, H * 0.99]]){ for (let i = 0; i < 6; i++){ wheel(-100, x, y); frames(3); } frames(30); for (let i = 0; i < 6; i++){ wheel(100, x, y); frames(3); } frames(30); }
// 9. полюс и антипод
begin('9_pole', [0, 1, 0], 100); anchorAt(W * 0.3, H * 0.3);
for (let i = 0; i < 10; i++){ wheel(-100, W * 0.3, H * 0.3); frames(4); } frames(60);
const r9 = summary(cur);
begin('9b_antipode', [0, -1, 0], 100); anchorAt(W * 0.7, H * 0.65);
for (let i = 0; i < 10; i++){ wheel(-100, W * 0.7, H * 0.65); frames(4); } frames(60);
const r9b = summary(cur);
// 10. колесо над правой панелью — камера не должна меняться (и страница не прокручивается)
begin('10_over_panel', base, 120);
const side = $('side'), card = $('card');
const h10 = S.rts.h;
for (let i = 0; i < 10; i++){ wheel(-100, W - 30, H * 0.4, { el: side }); wheel(-100, W * 0.5, H - 20, { el: card }); frames(3); } frames(30);
const r10 = Object.assign(summary(cur), { hChanged: +(S.rts.h - h10).toFixed(2), pageScroll: scrollY + document.scrollingElement.scrollTop });
// 11. низко у штаба (мачта/здания): тянем вниз до упора
begin('11_low_hq', add(base, mul(anyTangent(base), 0.02)), 60); anchorAt(W * 0.5, H * 0.45);
for (let i = 0; i < 20; i++){ wheel(-100, W * 0.5, H * 0.45); frames(2); } frames(90);
const out = { W, H };
for (const k in M) out[k] = k === '1_notches_in' ? r1 : k === '2_fast_spin' ? Object.assign(summary(M[k]), { zoomInPart: r2a }) : k === '5_lines' ? r5 : k === '9_pole' ? r9 : k === '9b_antipode' ? r9b : k === '10_over_panel' ? r10 : (cur = M[k], summary(M[k]));
S.paused = false;
return out;
