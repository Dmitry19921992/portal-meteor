// v61rts: тест колеса мыши в стратегии. Настоящие WheelEvent на canvas (как от мыши/трекпада),
// между событиями — кадры камеры с шагом 1/60. Метрики как в rtsui_cam.js + «дрейф точки под курсором».
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!S.me || S.attract){ MENU.newGame(); await sleep(2500); }
S.paused = true;
enterRTS(); await sleep(60);
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
const base = BASES[0]; const log = [];
begin('11_low_hq', add(base, mul(anyTangent(base), 0.02)), 60); anchorAt(W * 0.5, H * 0.45);
let pf = S.cam.fwd;
const fr = () => { frame(); const t = deg(acos(clamp(dot(pf, S.cam.fwd), -1, 1))); pf = S.cam.fwd; if (t > 1) log.push([cur.n, +t.toFixed(2), +S.rts.h.toFixed(1), +RCAM.lift.toFixed(2), !!RCAM.anc, +RCAM.gr.toFixed(2)]); };
for (let i = 0; i < 20; i++){ wheel(-100, W * 0.5, H * 0.45); fr(); fr(); } for (let i = 0; i < 90; i++) fr();
S.paused = false; return log;
