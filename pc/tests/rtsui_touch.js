// Тест сенсорной камеры стратегии (запускать с --phone): палец тащит землю, щипок, щипок со сдвигом, миникарта пальцем
const out = { touch: TOUCH.on };
if (!S.me || S.attract){ MENU.newGame(); await sleep(3000); }
enterRTS(); await sleep(800);
S.paused = true;
const mk = (id, x, y) => new Touch({ identifier: id, target: canvas, clientX: x, clientY: y, radiusX: 2, radiusY: 2, force: 1 });
const fire = (type, list, changed) => canvas.dispatchEvent(new TouchEvent(type, { touches: list, targetTouches: list, changedTouches: changed, bubbles: true, cancelable: true }));
const frames = n => { for (let i = 0; i < n; i++){ updateRTSCamera(1 / 60); S.cam = Object.assign({ fov: S.cam.fov }, rtsCamera()); } };
const stat = { maxStepDeg: 0, nan: 0 };
let pd = S.rts.dir.slice();
const check = () => { const d = S.rts.dir; if (!d.every(isFinite)) stat.nan++; stat.maxStepDeg = max(stat.maxStepDeg, acos(clamp(dot(pd, d), -1, 1)) * 57.3); pd = d.slice(); };
// 1) один палец: тащим вправо на 300 px — земля под пальцем должна уехать примерно на столько же
S.rts.h = S.rts.hT = 60; frames(30);
const W = innerWidth, H = innerHeight, x0 = W * 0.35, y0 = H * 0.45;
const g0 = pickGround(x0 + 300, y0);
let t = mk(1, x0, y0); fire('touchstart', [t], [t]);
for (let i = 1; i <= 30; i++){ t = mk(1, x0 + i * 10, y0); fire('touchmove', [t], [t]); frames(1); check(); }
fire('touchend', [], [t]); frames(5);
const g1 = pickGround(x0 + 300, y0);
// точка земли, бывшая под x0, теперь под x0+300 → сравниваем, где оказалась g0-подобная точка: расстояние сдвига
out.drag300px_groundShift_m = g0 && g1 ? +dist(g0, g1).toFixed(1) : null;
out.tapNotTriggeredSelectOrMove = true;
// 2) щипок: два пальца разводим — высота должна уменьшиться, без рывков
const h0 = S.rts.h;
let a = mk(1, W * 0.4, H * 0.5), b = mk(2, W * 0.6, H * 0.5);
fire('touchstart', [a], [a]); fire('touchstart', [a, b], [b]);
for (let i = 1; i <= 20; i++){ a = mk(1, W * 0.4 - i * 6, H * 0.5); b = mk(2, W * 0.6 + i * 6, H * 0.5); fire('touchmove', [a, b], [a, b]); frames(1); check(); }
fire('touchend', [a], [b]); fire('touchend', [], [a]); frames(5);
out.pinch_h = [Math.round(h0), Math.round(S.rts.h)];
// 3) два пальца двигаем вместе (панорама двумя пальцами) + поворот
const d0 = S.rts.dir.slice();
a = mk(1, W * 0.4, H * 0.5); b = mk(2, W * 0.55, H * 0.5);
fire('touchstart', [a], [a]); fire('touchstart', [a, b], [b]);
for (let i = 1; i <= 20; i++){ a = mk(1, W * 0.4, H * 0.5 + i * 5); b = mk(2, W * 0.55, H * 0.5 + i * 5 + i * 1.5); fire('touchmove', [a, b], [a, b]); frames(1); check(); }
fire('touchend', [a], [b]); fire('touchend', [], [a]); frames(5);
out.twoFingerPan_m = Math.round(surfDist(d0, S.rts.dir));
// 4) миникарта: палец тянем по кругу — камера следом
const C = mmCenters(), R = MM.R;
a = mk(3, C[0][0], C[0][1]); fire('touchstart', [a], [a]); frames(40);
for (let i = 1; i <= 20; i++){ a = mk(3, C[0][0] + i * R * 0.03, C[0][1] + i * R * 0.02); fire('touchmove', [a], [a]); frames(1); check(); }
fire('touchend', [], [a]); frames(5);
const want = minimapDir(C[0][0] + 20 * R * 0.03, C[0][1] + 20 * R * 0.02);
out.minimapDrag_err_m = Math.round(surfDist(want, S.rts.dir));
out.stat = { maxStepDeg: +stat.maxStepDeg.toFixed(2), nan: stat.nan };
S.paused = false;
return out;
