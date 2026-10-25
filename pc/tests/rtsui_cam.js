// Тест камеры стратегии: гоняем камеру по «патологическим» маршрутам и ловим NaN, перевороты, рывки, уход под землю.
// Работает и со старой (v5.3) камерой, и с новой — для сравнения «до/после».
if (!S.me || S.attract){ MENU.newGame(); await sleep(2500); }
S.paused = true;   // мир не крутим — только камера
enterRTS(); await sleep(100);
const DT = 1 / 60, rel = () => { for (const k in keys) keys[k] = false; };
const NEW = typeof RCAM !== 'undefined';
const deg = r => r * 180 / Math.PI;
let prev = null;
const M = {};
function frame(tag){
  updateRTSCamera(DT);
  const c = rtsCamera();
  S.cam = Object.assign({ fov: S.cam ? S.cam.fov : 1 }, c);
  const m = M[tag] || (M[tag] = { n: 0, nan: 0, maxTurn: 0, minRightDot: 1, minUpDot: 1, maxJump: 0, under: 0, degenerate: 0, maxR: 0 });
  m.n++;
  const ok = [c.pos, c.fwd, c.right, c.up].every(v => v && v.every(isFinite));
  if (!ok){ m.nan++; prev = null; return; }
  if (len(c.fwd) < 0.9 || len(c.up) < 0.9 || len(c.right) < 0.9) m.degenerate++;
  if (mapJS(c.pos[0], c.pos[1], c.pos[2]) < 0.15) m.under++;
  m.maxR = max(m.maxR, len(c.pos));
  if (prev){
    m.maxTurn = max(m.maxTurn, deg(acos(clamp(dot(prev.fwd, c.fwd), -1, 1))));
    m.minRightDot = min(m.minRightDot, dot(prev.right, c.right));
    m.minUpDot = min(m.minUpDot, dot(prev.up, c.up));
    m.maxJump = max(m.maxJump, dist(prev.pos, c.pos));
  }
  prev = { pos: c.pos, fwd: c.fwd, right: c.right, up: c.up };
}
const run = (tag, sec, fn) => { const n = Math.round(sec / DT); for (let i = 0; i < n; i++){ if (fn) fn(i * DT, i); frame(tag); } };
const setH = h => { S.rts.h = h; if (NEW) S.rts.hT = h; };
// A: прямо «вперёд» вокруг всего метеорита (через полюса/базы и антипод) на малой и большой высоте
if (NEW) RCAM.blend = null;   // переход из шутера проверяется отдельно (H)
S.rts.dir = [0, 1, 0]; S.rts.fwd = [0, 0, -1]; setH(40); prev = null;
keys.KeyW = true; run('A_fwd_low', 40); rel();
setH(280); prev = null; keys.KeyW = true; run('A_fwd_high', 14); rel();
// B: диагональ + вращение Q/E, потом стоп
setH(80); prev = null; run('B_diag_rot', 20, t => { rel(); keys.KeyW = true; keys.KeyD = true; if ((t % 4) < 2) keys.KeyQ = true; else keys.KeyE = true; }); rel(); run('B_diag_rot', 1);
// C: перелёты: точно в антипод, к полюсам, к случайным точкам
prev = null;
for (const p of [[0, -1, 0], [0, 1, 0], mul(S.rts.dir, -1), [1, 0, 0], [0, 0, -1], [0.3, -0.9, 0.3]]){ flyCamTo(p); run('C_fly', 1.6); }
for (let i = 0; i < 8; i++){ flyCamTo(randUnit()); run('C_fly', 1.4); }
// D: клики по миникарте: центры кругов (полюса), край (экватор), всё подряд
prev = null;
const C0 = mmCenters(), R0 = MM.R;
const pts = [[C0[0][0], C0[0][1]], [C0[1][0], C0[1][1]], [C0[0][0] + R0, C0[0][1]], [C0[1][0] - R0, C0[1][1]], [C0[0][0], C0[0][1] - R0 * 0.99], [C0[1][0], C0[1][1] + R0 * 0.7]];
for (const [x, y] of pts){ minimapClick(x, y, 0); run('D_minimap', 1.4); }
// E: зум: резкие экстремумы и зум к курсору
prev = null;
for (let i = 0; i < 6; i++){
  if (NEW){ for (let k = 0; k < 12; k++) rtsZoomAt(-120, innerWidth * (0.2 + 0.6 * random()), innerHeight * (0.2 + 0.6 * random())); }
  else setH(12);
  run('E_zoom', 0.8);
  if (NEW){ for (let k = 0; k < 12; k++) rtsZoomAt(120); } else setH(285);
  run('E_zoom', 0.8);
}
// F: «палец»: панорама рывками и щипок с поворотом
prev = null;
for (let i = 0; i < 200; i++){
  if (NEW) TOUCH.panPx((random() - 0.5) * 120, (random() - 0.5) * 120);
  else { const R = S.rts, k = (R.h * 1.6 + 20) / innerHeight / RM, right = norm(cross(R.fwd, R.dir)); R.dir = norm(add(R.dir, add(mul(right, -(random() - 0.5) * 120 * k), mul(R.fwd, (random() - 0.5) * 120 * k)))); R.fwd = tangent(R.fwd, R.dir); }
  S.rts.fwd = norm(rotAxis(S.rts.fwd, S.rts.dir, (random() - 0.5) * 0.3));
  frame('F_touch');
}
// G: низко над рельефом по случайным точкам — камера не должна быть в скале
prev = null;
setH(12);
for (let i = 0; i < 60; i++){ if (NEW) rtsLookAt(randUnit()); else S.rts.dir = randUnit(); prev = null; run('G_lowground', 0.3); }
// H: переходы шутер↔стратегия
S.paused = false;
const jumps = [];
for (let i = 0; i < 4; i++){
  enterFPS(); await sleep(400);
  const a = S.cam.pos.slice();
  enterRTS(); await sleep(34);
  jumps.push(Math.round(dist(a, S.cam.pos)));
  await sleep(600);
}
// I: край экрана: мышь ушла из окна → камера не должна ехать
let edge = 'n/a';
if (NEW){
  S.paused = true; const d0 = S.rts.dir.slice();
  RCAM.mouseIn = true; RCAM.overUI = false; S.mouse = [innerWidth - 2, innerHeight / 2];
  const hf = document.hasFocus;
  document.hasFocus = () => true;
  for (let i = 0; i < 30; i++) updateRTSCamera(DT);
  const moved1 = surfDist(d0, S.rts.dir);
  document.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: null }));
  const d1 = S.rts.dir.slice();
  for (let i = 0; i < 30; i++) updateRTSCamera(DT);
  edge = { movedInside: +moved1.toFixed(1), movedAfterLeave: +surfDist(d1, S.rts.dir).toFixed(2) };
  document.hasFocus = hf;
}
S.paused = false;
const R2 = o => { const r = {}; for (const k in o) r[k] = typeof o[k] === 'number' ? +o[k].toFixed(3) : o[k]; return r; };
const res = { version: NEW ? 'rtsui' : 'v5.3', dome: S.R };
for (const k in M) res[k] = R2(M[k]);
res.H_fpsToRtsFirstFrameJump_m = jumps;
res.I_edge = edge;
return res;
