// =====================================================================
//  СТРАТЕГИЯ: камера у земли, выделение, группы, приказы, способности,
//  боковая панель производства, командная карточка, миникарта
// =====================================================================
// v6 rtsui: устойчивая камера стратегии.
//  • базис строится от касательного «вперёд» (fwd ⟂ dir): right = fwd × dir — без переворотов у полюсов и антипода;
//  • высота земли под фокусом и отъезд камеры от скал сглаживаются — без дёрганья на рельефе;
//  • панорамирование — параллельный перенос dir+fwd поворотом вокруг оси через центр, со сглаженной скоростью;
//  • зум плавный и к курсору; перелёты — по дуге большого круга (не через центр метеорита).
const RTS_HMIN = 12, RTS_HMAX = 285;
let RTS_GR = { dir: null, r: RM };
const RCAM = { gr: null, lift: 0, dt: 1 / 60, blend: null, good: null, vel: [0, 0], rotV: 0, edgeT: 0, mouseIn: false, overUI: false, mm: false };
const finite3 = v => !!v && isFinite(v[0]) && isFinite(v[1]) && isFinite(v[2]);
// поворот камеры вокруг оси через центр метеорита: dir и fwd вместе (fwd остаётся касательным — без рывков)
function rtsAxisRotate(axis, ang){
  const R = S.rts; if (!ang || !isFinite(ang)) return;
  R.dir = norm(rotAxis(R.dir, axis, ang)); R.fwd = tangent(rotAxis(R.fwd, axis, ang), R.dir);
  if (R.goal) R.goal = norm(rotAxis(R.goal, axis, ang));
}
// сдвиг камеры: вперёд/вправо на угол (рад) по экрану
function rtsPan(fwdAng, rightAng){
  const R = S.rts;
  if (fwdAng) rtsAxisRotate(norm(cross(R.dir, R.fwd)), fwdAng);
  if (rightAng){ const right = norm(cross(R.fwd, R.dir)); rtsAxisRotate(norm(cross(R.dir, right)), rightAng); }
}
// перенести камеру в точку по кратчайшей дуге (fwd переносится параллельно)
function rtsTransportTo(t){
  const R = S.rts; t = norm(t);
  const c = cross(R.dir, t), s = len(c), d = dot(R.dir, t);
  if (s < 1e-7 && d > 0) return;
  const axis = s < 1e-7 ? norm(cross(R.dir, R.fwd)) : mul(c, 1 / s);
  const ang = atan2(s, d);
  R.dir = norm(rotAxis(R.dir, axis, ang)); R.fwd = tangent(rotAxis(R.fwd, axis, ang), R.dir);
}
// высота земли под фокусом (над шахтами — не ниже RM−5); сглаживается в rtsCamera
function rtsGroundAt(N){ return max(RM - 5, groundR(N)); }
function rtsCamera(){
  const R = S.rts, dt = RCAM.dt;
  if (!finite3(R.dir) || len(R.dir) < 0.5 || !finite3(R.fwd)){
    R.dir = RCAM.good ? RCAM.good.dir.slice() : BASES[0].slice(); R.fwd = RCAM.good ? RCAM.good.fwd.slice() : anyTangent(R.dir);
    S.camFly = null; R.goal = null;
  }
  if (!isFinite(R.h)) R.h = 60;
  R.dir = norm(R.dir); R.fwd = tangent(R.fwd, R.dir);
  R.h = clamp(R.h, RTS_HMIN, RTS_HMAX);
  if (RCAM.good && dot(RCAM.good.dir, R.dir) < 0.97){ RCAM.gr = null; RCAM.lift = 0; }   // телепорт (загрузка, вход в режим)
  RCAM.good = { dir: R.dir.slice(), fwd: R.fwd.slice() };
  const N = R.dir, f = R.fwd;
  const grT = rtsGroundAt(N);
  if (RCAM.gr === null) RCAM.gr = grT;
  else RCAM.gr += (grT - RCAM.gr) * (1 - Math.exp(-dt * 5));
  RTS_GR.dir = N; RTS_GR.r = RCAM.gr;
  const focus = mul(N, RCAM.gr + 1);
  const tilt = lerp(0.95, 0.12, smoothstep(25, RTS_HMAX, R.h));
  let want = add(add(focus, mul(N, R.h)), mul(f, -R.h * tan(tilt)));
  // Камера не «подтягивается» к фокусу, если между ними скала или здание (в v5.3 так камера
  // внезапно ныряла в штаб/рельеф — рывок на сотни метров и тёмный экран). Вместо этого она
  // плавно ПОДНИМАЕТСЯ над препятствием в своей точке: вверх сразу, обратно — медленно.
  const NU = norm(want);
  let lift = 0;
  for (let i = 0; i < 40; i++){ const p = add(want, mul(NU, lift)), m = mapJS(p[0], p[1], p[2]); if (m > 2.5) break; lift += max(1, 2.5 - m); }
  if (lift > RCAM.lift) RCAM.lift += (lift - RCAM.lift) * (1 - Math.exp(-dt * 10));
  else RCAM.lift += (lift - RCAM.lift) * (1 - Math.exp(-dt * 2.5));
  let pos = add(want, mul(NU, RCAM.lift));
  for (let i = 0; i < 20; i++){ const m = mapJS(pos[0], pos[1], pos[2]); if (m > 0.6) break; pos = add(pos, mul(NU, max(0.5, 0.6 - m))); }   // страховка: никогда не внутри геометрии
  if (len(pos) > S.R - 4) pos = mul(norm(pos), S.R - 4);
  if (dist(pos, focus) < 2.5) pos = add(focus, mul(N, 2.5));
  let look = norm(sub(focus, pos));
  const right = norm(cross(f, N));
  let up = norm(cross(right, look));
  // плавный переход из шутера (камера «взлетает» от бойца)
  const B = RCAM.blend;
  if (B){
    B.t += dt;
    const e = smoothstep(0, 0.55, B.t);
    if (e >= 1) RCAM.blend = null;
    else {
      pos = add(mul(B.pos, 1 - e), mul(pos, e));
      const lk = add(mul(B.fwd, 1 - e), mul(look, e)), uk = add(mul(B.up, 1 - e), mul(up, e));
      if (len(lk) > 0.2 && len(uk) > 0.2){ look = norm(lk); return Object.assign({ pos }, camBasis(look, norm(uk))); }
    }
  }
  return { pos, right, up, fwd: look };
}
function rtsFocusPoint(){ return mul(S.rts.dir, RTS_GR.r); }
function rtsLookAt(p){ S.camFly = null; S.rts.goal = null; rtsTransportTo(p); }
// сброс состояния камеры при входе в стратегию (fromCam — камера шутера для плавного перехода)
function rtsCamReset(fromCam){
  const R = S.rts;
  R.hT = R.h; R.goal = null; S.camFly = null; RCAM.vel = [0, 0]; RCAM.rotV = 0; RCAM.edgeT = 0; RCAM.gr = null; RCAM.lift = 0;
  RCAM.blend = fromCam && finite3(fromCam.pos) ? { pos: fromCam.pos, fwd: fromCam.fwd, up: fromCam.up, t: 0 } : null;
  drag = null; mdrag = null; RCAM.mm = false;
}
// можно ли сейчас скроллить краем экрана: мышь в окне, не над панелями (кроме самого края), не тянем рамку
function rtsEdgeOK(){
  if (!SET.edgeScroll || !S.mouse || !RCAM.mouseIn || drag || mdrag || RCAM.mm || (typeof TOUCH !== 'undefined' && TOUCH.on)) return false;
  if (!document.hasFocus()) return false;
  return !RCAM.overUI || S.mouse[0] >= innerWidth - 3 || S.mouse[1] >= innerHeight - 3;
}
function updateRTSCamera(dt){
  const R = S.rts;
  RCAM.dt = dt;
  if (MENU.isOpen()) return;
  if (R.hT === undefined || !isFinite(R.hT)) R.hT = R.h;
  const k = (c1, c2) => (keys[c1] || keys[c2]) ? 1 : 0;
  let ud = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
  let lr = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
  if (keys.ControlLeft || keys.ControlRight){ ud = 0; lr = 0; }
  if (rtsEdgeOK()){
    const [mx, my] = S.mouse, m = 8;
    const el = mx < m ? -1 : mx > innerWidth - m ? 1 : 0, eu = my < m ? 1 : my > innerHeight - m ? -1 : 0;
    if (el || eu){ RCAM.edgeT += dt; if (RCAM.edgeT > 0.12){ lr = lr || el; ud = ud || eu; } } else RCAM.edgeT = 0;
  } else RCAM.edgeT = 0;
  const rot = k('KeyE', 'KeyE') - k('KeyQ', 'KeyQ');
  if ((ud || lr) && (S.camFly || R.goal)){ S.camFly = null; R.goal = null; }
  // сглаженная скорость: разгон ~0.1 с, остановка ~0.07 с; по диагонали не быстрее
  const a = 1 - Math.exp(-dt * ((ud || lr) ? 14 : 22));
  RCAM.vel[0] += (ud - RCAM.vel[0]) * a; RCAM.vel[1] += (lr - RCAM.vel[1]) * a;
  if (!ud && abs(RCAM.vel[0]) < 0.01) RCAM.vel[0] = 0;
  if (!lr && abs(RCAM.vel[1]) < 0.01) RCAM.vel[1] = 0;
  let vu = RCAM.vel[0], vr = RCAM.vel[1]; const vl = hypot(vu, vr); if (vl > 1){ vu /= vl; vr /= vl; }
  const speed = (30 + R.h * 1.1) / RM;   // рад/с: скорость растёт с высотой
  if (vu || vr) rtsPan(vu * speed * dt, vr * speed * dt);
  RCAM.rotV += (rot - RCAM.rotV) * (1 - Math.exp(-dt * 14));
  if (!rot && abs(RCAM.rotV) < 0.01) RCAM.rotV = 0;
  if (RCAM.rotV) R.fwd = tangent(rotAxis(R.fwd, R.dir, RCAM.rotV * dt * 1.6), R.dir);
  // плавный зум
  R.hT = clamp(R.hT, RTS_HMIN, RTS_HMAX);
  R.h += (R.hT - R.h) * (1 - Math.exp(-dt * 12));
  if (abs(R.hT - R.h) < 0.01) R.h = R.hT;
  // доводка к цели (зум к курсору)
  if (R.goal){
    const c = cross(R.dir, R.goal), s = len(c), ang = atan2(s, dot(R.dir, R.goal));
    if (ang < 1e-5 || s < 1e-9) R.goal = null;
    else rtsAxisRotate(mul(c, 1 / s), ang * (1 - Math.exp(-dt * 12)));
  }
  // перелёт по дуге
  const F = S.camFly;
  if (F){
    F.t += dt;
    const e = smoothstep(0, 1, F.t / F.dur);
    rtsTransportTo(rotAxis(F.from, F.axis, F.ang * e));
    if (F.t >= F.dur) S.camFly = null;
  }
}
function flyCamTo(p){
  const R = S.rts; if (!finite3(p)) return;
  const to = norm(p), from = R.dir.slice();
  const c = cross(from, to), s = len(c), ang = atan2(s, dot(from, to));
  if (ang < 1e-4) return;
  const axis = s < 1e-6 ? norm(cross(from, R.fwd)) : mul(c, 1 / s);
  R.goal = null;
  S.camFly = { from, axis, ang, t: 0, dur: clamp(0.35 + ang * 0.45, 0.35, 1.2) };
}
// видна ли точка с камеры (не за горизонтом метеорита)
function facing(p){ const l = len(p); if (l < 60) return true; return dot(sub(S.cam.pos, p), mul(p, 1 / l)) > -6; }
function screenRay(x, y){
  const c = S.cam, H = innerHeight;
  const ux = (x - innerWidth / 2) / H * c.fov, uy = -(y - H / 2) / H * c.fov;
  return norm(add(add(mul(c.right, ux), mul(c.up, uy)), c.fwd));
}
function pickGround(x, y){
  const d = screenRay(x, y), o = S.cam.pos;
  let t = 0;
  for (let i = 0; i < 400 && t < 2000; i++){
    const p = add(o, mul(d, t)), m = mapJS(p[0], p[1], p[2]);
    if (m < 0.3) return p;
    t += max(m * 0.7, 0.2);
  }
  return null;
}
function screenRadius(p, worldR){ const s = project(p); return s ? worldR / (s[2] * S.cam.fov) * innerHeight : 0; }
function pickEntity(x, y, wantEnemy){
  let best = null, bd = 16;
  const test = (e, p, r) => {
    if (!facing(p)) return;
    const s = project(p); if (!s) return;
    const d = hypot(s[0] - x, s[1] - y) - max(4, screenRadius(p, r || 1));
    if (d < bd){ bd = d; best = e; }
  };
  for (const u of S.units) if (u.alive && (u.team === 0 || (wantEnemy && u.seen[0] > 0))) test(u, u.pos, 0.6);
  for (const v of S.vehicles) if (v.alive && (v.team === 0 || (wantEnemy && v.seen[0] > 0))) test(v, v.pos, 2.5);
  for (const d of S.drones) if (d.alive && (d.team === 0 || (wantEnemy && d.seen[0] > 0))) test(d, d.pos, 1.2);
  for (const b of S.builders) if (b.alive && (b.team === 0 || (wantEnemy && b.seen[0] > 0))) test(b, b.pos, 0.9);
  for (const b of S.buildings) if (b.alive && (b.team === 0 || (wantEnemy && (b.known0 || b.seen[0] > 0)))) test(b, bldCenter(b), b.rad * 0.8);
  for (const h of S.hq) if (h.alive && (h.team === 0 || wantEnemy)) test(h, add(h.pos, mul(BASES[h.team], 4)), 10);
  return best;
}

// ---------- мышь ----------
let drag = null, lastClick = 0, mdrag = null;
canvas.addEventListener('mousedown', e => {
  if (S.mode !== 'rts' || S.attract || MENU.isOpen()) return;
  if (minimapClick(e.clientX, e.clientY, e.button)){ if (e.button === 0) RCAM.mm = true; return; }
  if (e.button === 1){ mdrag = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
  if (e.button === 0){
    if (S.place){ tryPlace(e.clientX, e.clientY, e.shiftKey); return; }
    if (S.cast){ tryCast(e.clientX, e.clientY, e.shiftKey); return; }
    drag = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, shift: e.shiftKey, ctrl: e.ctrlKey };
  }
  if (e.button === 2){ if (S.place || S.cast){ S.place = null; S.cast = null; return; } orderAt(e.clientX, e.clientY, e.shiftKey); }
});
addEventListener('mousemove', e => {
  S.mouse = [e.clientX, e.clientY];
  RCAM.mouseIn = true; RCAM.overUI = e.target !== canvas;
  if (drag){ drag.x1 = e.clientX; drag.y1 = e.clientY; }
  if (RCAM.mm && S.mode === 'rts' && (e.buttons & 1)){ const d = minimapDir(e.clientX, e.clientY); if (d) rtsLookAt(d); }
  if (mdrag && S.mode === 'rts'){
    const dx = e.clientX - mdrag.x, dy = e.clientY - mdrag.y; mdrag.x = e.clientX; mdrag.y = e.clientY;
    S.rts.fwd = tangent(rotAxis(S.rts.fwd, S.rts.dir, -dx * 0.006), S.rts.dir);
    S.rts.h = S.rts.hT = clamp(S.rts.h * (1 + dy * 0.004), RTS_HMIN, RTS_HMAX);
  }
});
// мышь ушла из окна — край экрана больше не крутит камеру
document.addEventListener('mouseout', e => { if (!e.relatedTarget) RCAM.mouseIn = false; });
addEventListener('blur', () => { RCAM.mouseIn = false; mdrag = null; RCAM.mm = false; });
addEventListener('mouseup', e => {
  if (e.button === 1) mdrag = null;
  if (e.button === 0) RCAM.mm = false;
  if (S.mode !== 'rts'){ if (e.button === 0) drag = null; return; }
  if (e.button !== 0 || !drag) return;
  const d = drag; drag = null;
  if (!d.shift){ S.sel.clear(); S.selB = null; }
  if (hypot(d.x1 - d.x0, d.y1 - d.y0) < 6){
    const ent = pickEntity(d.x1, d.y1, false);
    const now = performance.now(), dbl = now - lastClick < 350 && S.lastPick === ent;
    lastClick = now; S.lastPick = ent;
    if (!ent) return;
    if (ent.cls === 'bld' || ent.cls === 'hq'){
      S.selB = ent;
      if (dbl && ent.cls === 'bld' && (ent.type === 'turret' || ent.type === 'aa') && ent.done){ S.turretBody = null; enterFPS(ent); HINTS.used('possess'); }
      return;
    }
    const g = groupOf(ent);
    if (d.ctrl){ for (const o of g.cls === 'builder' ? teamBuilders(0) : groupsOf(0)) if (groupKind(o) === groupKind(g) && onScreen(leaderPos(o))) S.sel.add(o); return; }
    S.sel.add(g);
    if (dbl && g.cls === 'builder'){ for (const o of teamBuilders(0)) if (onScreen(o.pos)) S.sel.add(o); return; }   // двойной клик по инженеру — все инженеры на экране
    if (dbl){ enterFPS(ent); HINTS.used('possess'); }
  } else {
    const x0 = min(d.x0, d.x1), x1 = max(d.x0, d.x1), y0 = min(d.y0, d.y1), y1 = max(d.y0, d.y1);
    const inBox = p => { if (!facing(p)) return false; const s = project(p); return s && s[0] >= x0 && s[0] <= x1 && s[1] >= y0 && s[1] <= y1; };
    for (const u of S.units) if (u.alive && u.team === 0 && inBox(u.pos)) S.sel.add(u.squad);
    for (const v of S.vehicles) if (v.alive && v.team === 0 && inBox(v.pos)) S.sel.add(v);
    for (const dr of S.drones) if (dr.alive && dr.team === 0 && inBox(dr.pos)) S.sel.add(dr);
    // инженеры попадают в рамку, только если в ней нет боевых групп (как рабочие в StarCraft II)
    if (![...S.sel].some(g => g.cls !== 'builder')) for (const b of S.builders) if (b.alive && b.team === 0 && inBox(b.pos)) S.sel.add(b);
  }
  if (S.sel.size) HINTS.used('select');
});
canvas.addEventListener('wheel', e => {
  if (S.mode !== 'rts' || S.attract) return;
  e.preventDefault();
  if (MENU.isOpen()) return;
  rtsZoomAt(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY, e.clientX, e.clientY);
}, { passive: false });
// зум колесом/щипком к точке под курсором (приближаемся — точка под курсором остаётся на месте)
function rtsZoomAt(delta, x, y){
  const R = S.rts, h0 = R.hT === undefined ? R.h : R.hT;
  const h1 = clamp(h0 * Math.pow(1.13, clamp(delta / 100, -3, 3)), RTS_HMIN, RTS_HMAX);
  if (abs(h1 - h0) < 1e-3) return;
  R.hT = h1;
  if (h1 < h0 && x !== undefined && !S.camFly){
    const p = pickGround(x, y); if (!p) return;
    const base = R.goal || R.dir, t = norm(p);
    const c = cross(base, t), s = len(c), ang = atan2(s, dot(base, t));
    if (s > 1e-6 && ang < 0.6) R.goal = norm(rotAxis(base, mul(c, 1 / s), ang * (1 - h1 / h0)));
  }
}
function onScreen(p){ if (!p || !facing(p)) return false; const s = project(p); return s && s[0] > 0 && s[0] < innerWidth && s[1] > 0 && s[1] < innerHeight; }
function selGroups(){ return [...S.sel].filter(g => g.team === 0 && groupAlive(g)); }

// ---------- клавиши стратегии ----------
const GTAP = { n: -1, t: 0 };
function rtsKey(e){
  const c = e.code;
  if (builderKey(e)) return;   // v6: стройка инженерами (rts_build.js)
  if (c.startsWith('Digit')){
    const n = +c.slice(5);
    if (e.ctrlKey){ S.groupsCtl[n] = selGroups(); feed(tr(`Группа ${n}: ${S.groupsCtl[n].length}`, `Group ${n}: ${S.groupsCtl[n].length}`, `Nhóm ${n}: ${S.groupsCtl[n].length}`), '#9cf'); HINTS.used('ctlgroup'); return; }
    const G = (S.groupsCtl[n] || []).filter(groupAlive);
    if (!G.length) return;
    if (!e.shiftKey){ S.sel.clear(); S.selB = null; }
    for (const g of G) S.sel.add(g);
    const now = performance.now();
    if (GTAP.n === n && now - GTAP.t < 400){ const L = leaderPos(G[0]); if (L) flyCamTo(L); }
    GTAP.n = n; GTAP.t = now;
    HINTS.used('ctlgroup');
    return;
  }
  // одна клавиша режима (по умолчанию Tab): в стратегии — вселиться в выделенного или вернуться в бой
  if (c === SET.bind.rts){ enterFPS(); return; }
  if (typeof uixKey === 'function' && uixKey(e)) return;   // горячие клавиши панели (Z C V B N…), F1–F4 — вкладки
  switch (c){
    case 'KeyA': if (e.ctrlKey){ S.sel.clear(); for (const g of groupsOf(0)) S.sel.add(g); } return;
    case 'KeyR': case 'KeyF': case 'KeyG': case 'KeyT': abilityKey(c); return;
    case 'KeyH': if (e.shiftKey && typeof orderRetreat === 'function') orderRetreat(); else orderHold(); return;
    case 'KeyY': orderSkySel(); return;
    case 'KeyI': toggleAI(); return;
    case 'Space': { const a = S.alerts[S.alerts.length - 1]; if (a) flyCamTo(a.pos); return; }
    case 'Home': case 'Backspace': flyCamTo(S.hq[0].alive ? S.hq[0].pos : (keyBuildings(0)[0] || S.hq[0]).pos); return;
    case 'Escape':
      if (typeof UIX !== 'undefined' && UIX.closePop()) return;
      if (S.place || S.cast){ S.place = null; S.cast = null; return; }
      if (S.sel.size || S.selB){ S.sel.clear(); S.selB = null; return; }
      MENU.pause(); return;
  }
}
// R F G T: способность с этой клавишей у выделенных групп
function abilityKey(code){
  const sel = selGroups();
  if (!sel.length){ feed(tr('Выдели отряд или технику', 'Select a squad or vehicle', 'Hãy chọn một đội hoặc xe'), '#f88'); return; }
  let needPoint = false, did = 0;
  for (const g of sel){
    const k = abilList(g).find(a => ABIL[a].key === code); if (!k) continue;
    if (ABIL[k].target === 'point') needPoint = true;
    else { if (!useAbility(g, k)){ did++; } }
  }
  if (did){ emit('ui', { kind: 'ok' }); HINTS.used('ability'); }
  if (needPoint){ S.cast = { kind: 'abil', code }; S.place = null; }
  else if (!did) { feed(tr('Нет готовой способности на этой клавише', 'No ready ability on that key', 'Không có kỹ năng sẵn sàng ở phím này'), '#f88'); emit('ui', { kind: 'deny' }); }
}
function startPower(k){
  const why = S.teams[0].cmd < POWERS[k].cost ? tr('Мало командных очков', 'Not enough command points', 'Không đủ điểm chỉ huy') : powerLeft(0, k) > 0 ? tr('Перезарядка', 'Cooling down', 'Đang hồi chiêu') : null;
  if (why){ feed(`${N2(POWERS[k].n)}: ${why}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
  S.cast = { kind: 'power', key: k }; S.place = null;
  feed(tr(`${N2(POWERS[k].n)}: ЛКМ — цель, ПКМ — отмена`, `${N2(POWERS[k].n)}: LMB — target, RMB — cancel`, `${N2(POWERS[k].n)}: chuột trái — mục tiêu, chuột phải — hủy`), '#9cf');
}
// кнопки «Идти» / «Бегом» в карточке: следующий клик (тап) по земле или врагу — приказ
function startOrderCast(rush){
  if (!selGroups().length){ uiExplainShow(rush ? 'cmd:rush' : 'cmd:move'); return; }
  if (S.cast && S.cast.kind === 'order' && !!S.cast.rush === !!rush){ S.cast = null; return; }
  S.cast = { kind: 'order', rush: !!rush }; S.place = null;
  feed(TOUCH.on ? tr('Тапни по земле или врагу', 'Tap the ground or an enemy') : tr('Кликни по земле или врагу (ПКМ — отмена)', 'Click the ground or an enemy (RMB — cancel)'), '#9cf');
}
function tryCast(x, y, keep){
  if (!S.cast) return;
  if (S.cast.kind === 'order'){ const r = S.cast.rush; S.cast = null; orderAt(x, y, false, r); return; }
  const p = pickGround(x, y); if (!p) return;
  const C = S.cast;
  if (C.kind === 'power'){
    const why = usePower(0, C.key, p, 'player');
    if (why){ feed(why, '#f88'); emit('ui', { kind: 'deny' }); return; }
    feed(N2(POWERS[C.key].n), TEAM[0].css); emit('ui', { kind: 'ok' }); HINTS.used('power');
    S.markers.push({ pos: p, t: 0, life: 3, col: '#ffb070' });
    S.cast = null; return;
  }
  let n = 0;
  for (const g of selGroups()){
    const k = abilList(g).find(a => ABIL[a].key === C.code && ABIL[a].target === 'point'); if (!k) continue;
    if (!useAbility(g, k, p)) n++;
  }
  if (n){ emit('ui', { kind: 'ok' }); emit('ack', { g: selGroups()[0], order: 'abil' }); HINTS.used('ability'); S.orderMark = { p, t: 0.8, col: '#ffb070' }; }
  else { feed(tr('Способность не готова', 'Ability not ready', 'Kỹ năng chưa sẵn sàng'), '#f88'); emit('ui', { kind: 'deny' }); }
  if (!keep) S.cast = null;
}
function orderAt(x, y, queue, forceRush){
  let sel = selGroups();
  // v6: инженеры — свои приказы (стройка/ремонт/идти), остальным — как обычно
  const bsel = sel.filter(g => g.cls === 'builder');
  if (bsel.length){ builderOrderAt(bsel, x, y, queue); sel = sel.filter(g => g.cls !== 'builder'); if (!sel.length) return; }
  const p = pickGround(x, y);
  if (!sel.length){
    // точка сбора для производящего здания
    if (S.selB && S.selB.team === 0 && p && (S.selB.cls === 'hq' || ['outpost', 'factory', 'hub', 'airdock'].includes(S.selB.type))){
      S.selB.rally = p; feed(tr('Точка сбора установлена', 'Rally point set', 'Đã đặt điểm tập kết'), '#9cf'); emit('ui', { kind: 'ok' }); HINTS.used('rally');
    }
    return;
  }
  const ent = pickEntity(x, y, true);
  if (ent && ent.team === 1){
    for (const g of sel){ setOrder(g, 'focus', centerOf(ent), { focus: ent.cls === 'hq' ? null : ent, by: 'player', lock: 120 }); if (ent.cls === 'hq') g.order = 'attack'; }
    S.orderMark = { p: centerOf(ent), t: 0.8, col: '#ff6050' };
    emit('ui', { kind: 'ok' });
    return;
  }
  if (!p) return;
  // двойной ПКМ — бегом, не ввязываясь в бой; одиночный — движение с атакой по пути
  const now = performance.now();
  const rush = forceRush || S.lastRmb && now - S.lastRmb.t < 380 && hypot(S.lastRmb.x - x, S.lastRmb.y - y) < 30;
  S.lastRmb = { t: now, x, y };
  let target = p, order = 'move', cp = null;
  for (const c of S.cps) if (!c.core && dist(c.pos, p) < 25){ target = c.pos; order = 'cap'; cp = c; }
  if (len(p) < CORE_R + 10){ order = 'cap'; cp = S.cps[6]; target = cp.pos; }
  const n = sel.length;
  sel.forEach((g, i) => {
    if (g.order === 'sky' && g.sky) return;
    // разносим группы, чтобы не толпились в одной точке
    let tp = target;
    if (n > 1 && order === 'move'){ const up = norm(p), a = i / n * PI * 2; tp = add(p, mul(add(mul(anyTangent(up), cos(a)), mul(cross(up, anyTangent(up)), sin(a))), 5 + n * 1.5)); }
    setOrder(g, order, tp, { cp, by: 'player', lock: 120, rush });
  });
  S.orderMark = { p: target, t: 0.8, col: rush ? '#9cf' : null };
  if (rush) HINTS.used('rush');
  if (rush) feed(tr('Бегом! Не ввязываться в бой', 'On the double! Do not engage', 'Chạy nhanh! Không giao chiến'), '#9cf');
  emit('ui', { kind: 'ok' });
  HINTS.used('order');
}
function orderHold(){
  for (const g of selGroups()){ const L = leaderOf(g); if (L) setOrder(g, 'hold', L.pos, { by: 'player', lock: 300 }); }
  feed(tr('Удерживать позицию', 'Hold position', 'Giữ vị trí')); emit('ui', { kind: 'ok' });
}
function orderSkySel(){
  const sel = selGroups().filter(isSquad);
  if (!sel.length) return feed(tr('Выбери отряд', 'Select a squad', 'Hãy chọn một đội'), '#f88');
  let n = 0;
  for (const s of sel){ if (!(s.elite || S.teams[0].jet2)) continue; orderSky(s); n++; }
  if (!n){ feed(tr('Для десанта нужен «Небесный десант» или исследование «Ранцы II» (Аэродок)', 'Sky assault needs Sky troopers or the "Jetpacks II" research (Airdock)', 'Đổ bộ cần Lính đổ bộ hoặc nghiên cứu “Ba lô phản lực II” (Bến bay)'), '#f88'); emit('ui', { kind: 'deny' }); }
  else { feed(tr(`Десант через купол: ${n} отр. — сбор у штаба и взлёт`, `Sky assault: ${n} squad(s) — gathering at HQ and launching`, `Đổ bộ: ${n} đội — tập trung ở sở chỉ huy và cất cánh`), TEAM[0].css); emit('ui', { kind: 'ok' }); }
}
function startPlace(type){ startBuild(type); }   // v6: стройка через инженеров (rts_build.js)
function tryPlace(x, y, keep){
  const p = pickGround(x, y); if (!p) return;
  if (TOUCH.on){ S.placeAt = p; return; }   // телефон: тап — место, подтверждение кнопкой «Строить»
  const type = S.place;
  const why = playerPlace(type, norm(p), keep);
  if (why){ feed(why, '#f88'); emit('ui', { kind: 'deny' }); return; }
  feed(tr(`Стройка: ${bname(type)} — инженер в пути`, `Construction: ${bname(type)} — builder on the way`, `Xây dựng: ${bname(type)} — kỹ sư đang tới`), TEAM[0].css); emit('ui', { kind: 'ok' });
  HINTS.used('build');
  if (!keep || canBuild(0, type)) S.place = null;
}
function uiProduce(key){
  const why = produce(0, key);
  if (why){
    const r = rtsReason('produce:' + key);   // v6: причина + как исправить; «Нужно: здание» — сразу ставим его чертёж
    feed(`${pname(key)}: ${r.reason || why}${r.fix ? ' — ' + r.fix : ''}`, '#f88'); emit('ui', { kind: 'deny' });
    if (r.act && r.act.startsWith('build:')) startBuild(r.act.slice(6));
  }
  else { feed(tr(`В очереди: ${pname(key)}`, `Queued: ${pname(key)}`, `Đã xếp hàng: ${pname(key)}`), TEAM[0].css); emit('ui', { kind: 'ok' }); HINTS.used('produce'); S.pOrder = S.pOrder || {}; S.pOrder[key] = (S.pOrder[key] || 0) + 1; }
}
function pushAlert(pos){ if (!pos) return; S.alerts.push({ pos, t: S.rtime }); if (S.alerts.length > 6) S.alerts.shift(); }
let alertT = 0;
function rtsWatch(dt){
  alertT -= dt; if (alertT > 0) return; alertT = 2;
  if (S.attract) return;
  for (const g of groupsOf(0)){
    const L = leaderOf(g); if (!L) continue;
    if (groupUnits(g).some(u => S.time - u.lastHurt < 2) && !onScreen(L.pos) && S.rtime - (S.lastAttackAlert || -99) > 25){
      S.lastAttackAlert = S.rtime; pushAlert(L.pos);
      if (S.mode === 'rts'){ feed(tr(`${groupLabel(g)} под атакой! Пробел — к месту боя`, `${groupLabel(g)} under attack! Space — jump there`, `${groupLabel(g)} đang bị tấn công! Space — tới đó`), '#f88'); emit('radio', { text: tr(`${groupLabel(g)} под атакой`, `${groupLabel(g)} is under attack`, `${groupLabel(g)} đang bị tấn công`), pri: 0 }); }
      break;
    }
  }
}

// =====================================================================
//  БОКОВАЯ ПАНЕЛЬ (как в C&C) и КОМАНДНАЯ КАРТОЧКА
// =====================================================================
const SIDE = { tab: 'build', btns: [] };
// v6 rtsui: крупные кнопки со значком, ценой, временем, горячей клавишей и строкой состояния
// (причина недоступности / сколько осталось). Клик по серой кнопке — объяснение и решение (uix.js).
function buildSidebar(){
  const el = $('side'); el.innerHTML = '';
  const tabs = document.createElement('div'); tabs.className = 'tabs';
  const T = [['build', '⚒', tr('Здания', 'Build', 'Xây'), 'F1'], ['units', '◆', tr('Войска', 'Units', 'Quân'), 'F2'], ['tech', '⚗', tr('Улучш.', 'Tech', 'Công nghệ'), 'F3'], ['cmd', '✺', tr('Удары', 'Powers', 'Chỉ huy'), 'F4']];
  for (const [k, ic, n, f] of T){
    const b = document.createElement('button'); b.dataset.tab = k; b.className = SIDE.tab === k ? 'cur' : '';
    b.innerHTML = `<i>${ic}</i><span>${n}</span><em></em>`; b.dataset.tip = `<b>${ic} ${n}</b> <kbd>${f}</kbd>`;
    b.onclick = e => { e.stopPropagation(); SIDE.tab = k; buildSidebar(); emit('ui', { kind: 'ok' }); };
    tabs.appendChild(b);
  }
  el.appendChild(tabs);
  const list = document.createElement('div'); list.className = 'items'; el.appendChild(list);
  SIDE.btns = [];
  const ore = c => `<i class="ore"></i>${c}`;
  const mk = (id, icon, name, cost, time, fn, extra) => {
    const b = document.createElement('button'); b.className = 'item'; b.dataset.ux = id;
    const hk = SLOT_KEYS[SIDE.btns.length]; if (hk) b.dataset.hk = hk;
    b.innerHTML = `<i>${icon}</i>${hk ? `<kbd>${keyLabel(hk)}</kbd>` : ''}<b>${name}</b><span class="cost">${cost}</span>${time ? `<span class="tm">${time}</span>` : ''}<span class="q"></span><span class="st"></span><span class="bar"><s></s></span>`;
    b.onclick = e => { e.stopPropagation(); AU.init(); fn(); };
    b.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); if (extra && extra.cancel) extra.cancel(); };
    list.appendChild(b);
    SIDE.btns.push({ el: b, id, extra: extra || {} });
  };
  if (SIDE.tab === 'build'){
    mk('prod:builder', BICON.builder, pname('builder'), ore(pCost(0, 'builder')), fmtDur(pTime(0, 'builder')), () => uiProduce('builder'), { key: 'builder' });
    for (const k in BTYPES){ const B = BTYPES[k]; mk('build:' + k, UIX_ICON.b[k] || BICON[k] || '▣', bname(k), ore(B.cost), fmtDur(B.time), () => startPlace(k)); }
    const bq = document.createElement('div'); bq.className = 'bqueue'; bq.id = 'bqueue'; list.appendChild(bq);
  } else if (SIDE.tab === 'units' || SIDE.tab === 'tech'){
    for (const k in PRODUCTS){
      const P = PRODUCTS[k];
      if (!!P.research !== (SIDE.tab === 'tech')) continue;
      mk('prod:' + k, P.icon, pname(k), ore(pCost(0, k)), fmtDur(pTime(0, k)), () => uiProduce(k),
         { key: k, cancel: () => { if (UIX.wants.includes(k)){ UIX.wants = UIX.wants.filter(w => w !== k); emit('ui', { kind: 'ok' }); return; } for (const s of [S.hq[0], ...S.buildings]) { const i = s.team === 0 ? s.queue.lastIndexOf(k) : -1; if (i >= 0){ cancelProduct(s, i); emit('ui', { kind: 'ok' }); return; } } } });
    }
  } else {
    for (const k in POWERS){ const P = POWERS[k]; mk('power:' + k, P.icon, N2(P.n), P.cost + ' ' + tr('КО', 'CP', 'ĐCH'), fmtDur(P.cd), () => startPower(k), { power: k }); }
  }
  const hint = document.createElement('div'); hint.className = 'shint';
  hint.innerHTML = SIDE.tab === 'units' || SIDE.tab === 'tech' ? tr('ПКМ по кнопке — отменить последний заказ', 'RMB on a button — cancel the last order') : SIDE.tab === 'build' ? tr('Выбери здание и кликни место на своей базе', 'Pick a building, then click a spot on your base') : tr('Выбери удар и кликни цель на карте', 'Pick a power, then click the target');
  list.appendChild(hint);
  const foot = document.createElement('div'); foot.className = 'sfoot';
  foot.innerHTML = `<button id="aiBtn"></button><button id="abBtn"></button><button id="helpBtn" data-tip="${uixEsc(`<b>${tr('Управление', 'Controls')}</b><p>${tr('Все клавиши стратегии', 'All strategy keys')}</p>`)}">?${TOUCH.on ? '' : ' <kbd>/</kbd>'}</button>`;
  el.appendChild(foot);
  $('helpBtn').onclick = e => { e.stopPropagation(); S.showHelp = !S.showHelp; updateModeUI(); };
  $('aiBtn').onclick = e => { e.stopPropagation(); toggleAI(); updateSidebar(); };
  $('aiBtn').dataset.tip = `<b>${tr('ИИ-стратег', 'AI strategist')}</b><p>${tr('Включён — сам строит базу, заказывает войска и раздаёт приказы (твои приказы важнее). Выключен — всё делаешь ты.', 'On — builds the base, orders troops and gives orders by itself (your orders take priority). Off — you do everything.')}</p>`;
  $('abBtn').onclick = e => { e.stopPropagation(); const T = S.teams[0]; T.autoBuild = T.autoBuild === false; feed(T.autoBuild ? tr('Автостройка включена: стратег строит базу инженерами', 'Auto-build on: the strategist builds the base with builders', 'Tự xây bật') : tr('Автостройка выключена: здания строишь только ты', 'Auto-build off: only you build', 'Tự xây tắt'), '#9cf'); updateSidebar(); };
  updateSidebar();
}
function updateSidebar(){
  for (const b of SIDE.btns){
    const x = uiExplain(b.id);
    b.el.classList.toggle('off', !x.ok); b.el.classList.toggle('soft', !x.ok && !!x.soft);
    const q = b.el.querySelector('.q'), bar = b.el.querySelector('.bar s'), st = b.el.querySelector('.st');
    let stT = x.ok ? '' : (x.short || x.reason), stC = x.ok ? '' : 'bad', prog = 0;
    if (b.extra.key){
      const k = b.extra.key, n = countQueued(0, [k]);
      q.textContent = n ? '×' + n : '';
      let left = null;
      for (const s of [S.hq[0], ...S.buildings]) if (s.team === 0 && s.alive && s.queue[0] === k){ const tt = pTime(0, k); if (s.prodT / tt >= prog){ prog = s.prodT / tt; left = tt - s.prodT; } }
      if (UIX.wants.includes(k)){ stT = '⏳ ' + tr('ждёт руды', 'waiting for ore'); stC = 'wait'; }
      else if (left !== null && (x.ok || x.soft)){ stT = '▶ ' + fmtDur(left); stC = 'run'; }
      const P = PRODUCTS[k];
      if (P.max){ const lv = pLevel(0, k); b.el.querySelector('b').textContent = `${pname(k)} ${lv >= P.max ? 'MAX' : 'I'.repeat(lv + 1)}`; b.el.querySelector('.cost').innerHTML = lv >= P.max ? '—' : `<i class="ore"></i>${pCost(0, k)}`; }
    } else if (b.extra.power){
      const left = powerLeft(0, b.extra.power);
      prog = left > 0 ? 1 - left / POWERS[b.extra.power].cd : 0;
      q.textContent = '';
    } else if (b.id.startsWith('build:')){
      const n = S.buildings.filter(o => o.alive && o.team === 0 && o.type === b.id.slice(6)).length;
      q.textContent = n ? n + '' : '';
    }
    bar.style.width = (clamp(prog, 0, 1) * 100).toFixed(0) + '%';
    if (st.textContent !== stT) st.textContent = stT;
    st.className = 'st ' + stC;
  }
  // счётчики на вкладках
  const tq = { units: 0, tech: 0 };
  for (const s of [S.hq[0], ...S.buildings]) if (s && s.team === 0 && s.alive && s.queue) for (const k of s.queue) tq[PRODUCTS[k].research ? 'tech' : 'units']++;
  document.querySelectorAll('#side .tabs button').forEach(t => { const n = tq[t.dataset.tab]; const em = t.querySelector('em'); const v = n ? n + '' : ''; if (em.textContent !== v) em.textContent = v; });
  const ai = $('aiBtn'); if (ai) ai.innerHTML = `${tr('ИИ-стратег', 'AI strategist', 'chiến lược gia AI')}: <b class="${S.teams[0].ai ? 'on' : ''}">${S.teams[0].ai ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</b> <kbd>I</kbd>`;
  const ab = $('abBtn'); if (ab){ ab.innerHTML = `${tr('Автостройка', 'Auto-build', 'Tự xây')}: <b>${S.teams[0].autoBuild !== false && S.teams[0].ai ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</b>`; ab.title = tr('Стратег сам строит здания и экстракторы своими инженерами (когда ИИ-стратег включён). Твои приказы инженерам в стратегии — главнее.', 'The strategist builds buildings and extractors with its builders (when the AI strategist is on). Your orders to builders take priority.', 'Chiến lược gia tự xây'); }
  updateBuildQueue();
}
// ---------- нижняя карточка: кто выделен, приказы, большая кнопка «Вселиться» ----------
const CARD = { sig: '' };
// в кого вселит Tab / кнопка «Вселиться»
function cardPossessTarget(){
  const b = S.selB;
  if (b && b.alive && b.team === 0 && b.cls === 'bld' && (b.type === 'turret' || b.type === 'aa') && b.done && !selGroups().length) return { e: b, label: bname(b.type) };
  for (const g of selGroups()){ if (g.cls === 'builder') continue; const u = isSquad(g) ? g.units.find(x => x.alive) : g; if (u) return { e: u, label: groupLabel(g) }; }
  return null;
}
function cardGroupIcon(g){ return g.cls === 'builder' ? '⚒' : isSquad(g) ? (g.elite ? '✦' : g.solo ? (g.solo === 'sniper' ? '⌖' : '◈') : '◆') : g.cls === 'tank' ? '■' : '▲'; }
function cardHP(list){ let h = 0, m = 0; for (const u of list){ h += max(0, u.hp); m += u.maxhp; } return [h, m]; }
function updateCard(){
  const el = $('card');
  const sel = selGroups();
  const B = !sel.length && S.selB && S.selB.team === 0 && (S.selB.alive || S.selB.cls === 'hq') ? S.selB : (!sel.length && S.selB && S.selB.team === 1 && S.selB.alive ? S.selB : null);
  const pt = cardPossessTarget();
  const abil = {};
  for (const g of sel) for (const k of abilList(g)) abil[ABIL[k].key] = k;
  const sky = sel.some(isSquad);
  const bxh = builderCardHTML(sel) + (B && B.team === 0 ? siteCardHTML(B) : '');
  const prods = B && B.team === 0 ? Object.keys(PRODUCTS).filter(k => PRODUCTS[k].at.includes(B.cls === 'hq' ? 'hq' : B.type)) : [];
  const sig = [LANG.cur, sel.map(uixId).join(','), B ? uixId(B) + (B.done || B.cls === 'hq' ? 'd' : '') + ':' + (B.queue || []).join(',') : '', pt ? uixId(pt.e) : '', Object.keys(abil).join(''), sky, sel.length === 1 && isSquad(sel[0]) ? groupUnits(sel[0]).length : '', bxh].join('#');
  if (sig !== CARD.sig){
    CARD.sig = sig;
    let h = '<div class="inf">';
    if (sel.length === 1){
      const g = sel[0], L = leaderOf(g), us = groupUnits(g);
      const port = isSquad(g) && L && typeof SQUADUI !== 'undefined' ? `<img src="${SQUADUI.portrait(L)}">` : `<div class="glyph">${cardGroupIcon(g)}</div>`;
      const cls = isSquad(g) ? `${us.map(u => `<span title="${N2(roleOf(u).n)}">${roleOf(u).icon}</span>`).join('')} · ${us.length} ${tr('бойц.', 'troopers')}` : g.cls === 'tank' ? `${tr('Танк', 'Tank')} ${tankName(0)}` : g.cls === 'builder' ? tr('Инженер-строитель', 'Builder') : tr('Боевой дрон', 'Combat drone');
      h += `<div class="pt">${port}</div><div class="tx"><b>${groupLabel(g)}${g.vet ? ' <span class="vet">' + '★'.repeat(g.vet) + '</span>' : ''}</b><small>${cls}</small><div class="hp"><s data-hp="0"></s><em data-hpt="0"></em></div><em class="ord" data-ord="0"></em></div>`;
    } else if (sel.length > 1){
      const cnt = {}; for (const g of sel){ const i = cardGroupIcon(g); cnt[i] = (cnt[i] || 0) + 1; }
      h += `<div class="tx"><b>${tr('Выделено', 'Selected')}: ${sel.length}</b><small>${Object.keys(cnt).map(i => `${i}×${cnt[i]}`).join('  ')}</small><div class="ports">` +
        sel.slice(0, 12).map((g, i) => `<div class="port" data-pi="${i}" data-tip="${uixEsc(`<b>${groupLabel(g)}</b><p>${orderText(g)}</p><p class="dt">${tr('Клик — выделить только его · Shift — убрать · двойной — камера', 'Click — select only it · Shift — remove · double — camera')}</p>`)}"><i>${cardGroupIcon(g)}</i><s data-hp="${i}"></s></div>`).join('') +
        (sel.length > 12 ? `<div class="port more">+${sel.length - 12}</div>` : '') + '</div></div>';
    } else if (B){
      const nm = B.cls === 'hq' ? tr('Штаб', 'HQ', 'Sở chỉ huy') : bname(B.type);
      const ic = B.cls === 'hq' ? '⌂' : (UIX_ICON.b[B.type] || '▣');
      h += `<div class="pt"><div class="glyph ${B.team ? 'enemy' : ''}">${ic}</div></div><div class="tx"><b>${nm}${B.team ? ' · ' + tr('враг', 'enemy') : ''}</b><div class="hp"><s data-bhp></s><em data-bhpt></em></div><em class="ord" data-bst></em>`;
      if (B.queue && B.queue.length && B.team === 0) h += '<div class="queue">' + B.queue.map((k, i) => `<button data-q="${i}" data-tip="${uixEsc(`<b>${PRODUCTS[k].icon} ${pname(k)}</b><p class="dt">${tr('Клик — отменить (руда вернётся)', 'Click — cancel (ore refunded)')}</p>`)}"><i>${PRODUCTS[k].icon}</i>${i === 0 ? '<s data-qp></s>' : ''}</button>`).join('') + '</div>';
      h += '</div>';
    } else {
      h += `<div class="tx"><small class="help">${TOUCH.on ? tr('Тап — выделить · долгий тап — приказ · двойной тап — вселиться · палец — камера, два — масштаб', 'Tap — select · long tap — order · double tap — possess · drag — camera, pinch — zoom') : tr('ЛКМ — выделить · рамка — несколько · ПКМ — приказ · двойной клик — вселиться · Ctrl+1…9 — группа', 'LMB — select · drag — box · RMB — order · double-click — possess · Ctrl+1…9 — group')}</small></div>`;
    }
    h += '</div><div class="cmds">';
    if (sel.length){
      h += `<button class="ab" data-ux="cmd:move" data-act="move"><i>➤</i><b>${tr('Идти', 'Move')}</b><kbd>${tr('ПКМ', 'RMB')}</kbd></button>`;
      h += `<button class="ab" data-ux="cmd:rush" data-act="rush"><i>»</i><b>${tr('Бегом', 'Run')}</b><kbd>2×${tr('ПКМ', 'RMB')}</kbd></button>`;
      for (const code of ['KeyR', 'KeyF', 'KeyG', 'KeyT']){ const k = abil[code]; if (!k) continue; const A = ABIL[k]; h += `<button class="ab" data-ux="abil:${code}" data-key="${code}"><i>${A.icon}</i><b>${N2(A.n)}</b><kbd>${keyLabel(code)}</kbd><em></em><s></s></button>`; }
      h += `<button class="ab" data-ux="cmd:hold" data-act="hold"><i>⛊</i><b>${tr('Стоять', 'Hold', 'Giữ')}</b><kbd>H</kbd></button>`;
      h += `<button class="ab" data-ux="cmd:retreat" data-act="retreat"><i>↩</i><b>${tr('Отступить', 'Retreat')}</b><kbd>⇧H</kbd></button>`;
      if (sky) h += `<button class="ab" data-ux="cmd:sky" data-act="sky"><i>⇑</i><b>${tr('Десант', 'Sky assault', 'Đổ bộ')}</b><kbd>Y</kbd></button>`;
    } else if (B && prods.length && (B.cls === 'hq' || B.done)){
      h += prods.map(k => `<button class="ab prod" data-ux="prod:${k}" data-prod="${k}"><i>${PRODUCTS[k].icon}</i><b>${pname(k)}</b><kbd><i class="ore"></i>${pCost(0, k)}</kbd><em></em><s></s></button>`).join('');
    }
    h += '</div>' + bxh;
    const rally = B && B.team === 0 && prods.length ? `<em class="note">${TOUCH.on ? tr('Долгий тап по земле — точка сбора', 'Long tap on the ground — rally point') : tr('ПКМ по земле — точка сбора', 'RMB on the ground — rally point')}</em>` : '';
    h += `<button class="poss ${pt ? '' : 'back'}" data-ux="possess"><i>▶</i><b>${pt ? tr('Вселиться', 'Possess', 'Nhập vai') : tr('В бой', 'To battle', 'Vào trận')}</b><small>${pt ? uixEsc(pt.label) : tr('к своему бойцу', 'your unit')}</small>${TOUCH.on ? '' : `<kbd>${bk('rts')}</kbd>`}</button>` + rally;
    el.innerHTML = h;
    bindBuilderCard(el);
    el.querySelectorAll('[data-key]').forEach(b => b.onclick = e => { e.stopPropagation(); abilityKey(b.dataset.key); });
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); const a = b.dataset.act; if (a === 'hold') orderHold(); else if (a === 'retreat') orderRetreat(); else if (a === 'sky') orderSkySel(); else if (a === 'move' || a === 'rush') startOrderCast(a === 'rush'); });
    el.querySelectorAll('[data-prod]').forEach(b => b.onclick = e => { e.stopPropagation(); uiProduce(b.dataset.prod); });
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = e => { e.stopPropagation(); if (S.selB && S.selB.queue){ cancelProduct(S.selB, +b.dataset.q); emit('ui', { kind: 'ok' }); } });
    el.querySelector('.poss').onclick = e => { e.stopPropagation(); AU.init(); const t = cardPossessTarget(); enterFPS(t ? t.e : undefined); HINTS.used('possess'); };
    el.querySelectorAll('.port[data-pi]').forEach(p => p.onclick = e => { e.stopPropagation(); const g = sel[+p.dataset.pi]; if (!g) return; if (e.shiftKey){ S.sel.delete(g); return; } S.sel.clear(); S.sel.add(g); const L = leaderPos(g); if (L && performance.now() - (p._t || 0) < 400) flyCamTo(L); p._t = performance.now(); });
  }
  cardLive(el, sel, B);
}
// живые значения карточки (без пересборки DOM)
function cardLive(el, sel, B){
  const col = k => k > 0.5 ? '#9c9' : k > 0.25 ? '#dc6' : '#e66';
  el.querySelectorAll('[data-hp]').forEach(s => { const g = sel[+s.dataset.hp]; if (!g) return; const k = groupHP(g); s.style.width = (k * 100).toFixed(0) + '%'; s.style.background = col(k); });
  const ht = el.querySelector('[data-hpt]'); if (ht && sel[0]){ const [h, m] = cardHP(groupUnits(sel[0])); ht.textContent = `${Math.round(h)} / ${m}`; }
  const ord = el.querySelector('[data-ord]'); if (ord && sel[0]){ const t = orderText(sel[0]); if (ord.textContent !== t) ord.textContent = t; }
  if (B){
    const k = max(0, B.hp) / B.maxhp, s = el.querySelector('[data-bhp]'); if (s){ s.style.width = (k * 100).toFixed(0) + '%'; s.style.background = col(k); }
    const t = el.querySelector('[data-bhpt]'); if (t) t.textContent = `${Math.round(max(0, B.hp))} / ${B.maxhp}`;
    const st = el.querySelector('[data-bst]');
    if (st){ let v = ''; if (B.cls === 'bld' && !B.done){ const eta = uixBuildEta(B); v = tr('Стройка', 'Building') + ` ${Math.floor(B.built * 100)}%` + (eta ? ` · ≈${fmtDur(eta)}` : ' · ' + tr('ждёт строителей', 'waiting for builders')); } else if (B.queue && B.queue.length){ const tt = pTime(0, B.queue[0]); v = `${PRODUCTS[B.queue[0]].icon} ${pname(B.queue[0])} · ${fmtDur(tt - B.prodT)}` + (B.queue.length > 1 ? ` · ${tr('в очереди', 'queued')} ${B.queue.length - 1}` : ''); } else if (B.team === 0 && B.type !== 'turret' && B.type !== 'aa') v = tr('Простаивает', 'Idle'); if (st.textContent !== v) st.textContent = v; }
    const qp = el.querySelector('[data-qp]'); if (qp && B.queue && B.queue.length) qp.style.width = (clamp(B.prodT / pTime(0, B.queue[0]), 0, 1) * 100).toFixed(0) + '%';
  }
  el.querySelectorAll('.ab[data-ux]').forEach(b => {
    const x = uiExplain(b.dataset.ux);
    b.classList.toggle('off', !x.ok);
    const em = b.querySelector('em'), s = b.querySelector('s');
    const cd = b.dataset.key && !x.ok && x.eta;   // отсчёт и шторка — только для перезарядки способностей
    if (em) em.textContent = cd ? Math.ceil(x.eta) : '';
    if (s) s.style.height = cd && x.progress !== undefined ? ((1 - clamp(x.progress, 0, 1)) * 100).toFixed(0) + '%' : '0%';
    if (b.dataset.key) b.classList.toggle('cast', !!(S.cast && S.cast.code === b.dataset.key));
  });
  el.querySelectorAll('[data-act="move"],[data-act="rush"]').forEach(b => b.classList.toggle('on', !!(S.cast && S.cast.kind === 'order' && S.cast.rush === (b.dataset.act === 'rush'))));
  const pb = el.querySelector('.poss'); if (pb) pb.classList.toggle('off', !uiExplain('possess').ok);
}
function updateRTSHUD(){ $('sel').textContent = ''; }
function helpRTS(){
  const L = [];
  const row = (k, t) => L.push(`<b>${k}</b> ${t}`);
  row('WASD / ←↑→↓', tr('камера (и края экрана)', 'camera (and screen edges)', 'camera (và mép màn hình)')); row('Q / E', tr('поворот', 'rotate', 'xoay')); row(tr('колесо', 'wheel', 'con lăn'), tr('высота', 'zoom', 'phóng to')); row(tr('СКМ', 'MMB', 'chuột giữa'), tr('вращать', 'orbit', 'xoay quanh'));
  row(tr('ЛКМ', 'LMB', 'Chuột trái'), tr('выделить, рамка — несколько', 'select, drag — many', 'chọn, kéo khung — nhiều')); row('Ctrl+' + tr('клик', 'click', 'nhấp'), tr('все такие на экране', 'all of that type on screen', 'mọi đơn vị cùng loại trên màn hình'));
  row(tr('ПКМ', 'RMB', 'Chuột phải'), tr('идти / захват / атаковать цель', 'move / capture / attack target', 'đi / chiếm / tấn công mục tiêu'));
  row(tr('двойной клик', 'double-click', 'nhấp đúp'), tr('вселиться', 'possess', 'nhập vai')); row('R F G T', tr('способности', 'abilities', 'kỹ năng'));
  row('Z X C V B N K', tr('стройка (выбраны инженеры): турель, ПВО, экстрактор, форпост, мехзавод, дрон-хаб, аэродок', 'build (builders selected): turret, AA, extractor, outpost, factory, hub, airdock', 'xây (đã chọn kỹ sư)'));
  row('.', tr('свободный инженер', 'idle builder', 'kỹ sư rảnh')); row('Del', tr('отменить стройку (+руда)', 'cancel construction (refund)', 'hủy xây (hoàn quặng)'));
  row('H', tr('удерживать', 'hold', 'giữ')); row('Y', tr('десант через купол', 'sky assault', 'đổ bộ')); row('Ctrl+1…9 / 1…9', tr('группы', 'groups', 'nhóm')); row('Ctrl+A', tr('вся армия', 'whole army', 'toàn quân'));
  row(tr('Пробел', 'Space', 'Space'), tr('к последней тревоге', 'jump to last alert', 'tới cảnh báo gần nhất')); row('Home', tr('к базе', 'to base', 'về căn cứ')); row(bk('rts'), tr('вселиться в выделенного (ничего не выделено — в бой)', 'possess the selection (nothing selected — to battle)', 'nhập vai đơn vị đã chọn')); row('I', tr('ИИ-стратег', 'AI strategist', 'chiến lược gia AI'));
  row('Shift+H', tr('отступить к базе', 'retreat to base', 'rút về căn cứ')); row('Z C V B N J K L', tr('кнопки панели справа', 'right panel buttons', 'nút bảng bên phải')); row('F1…F4', tr('вкладки панели', 'panel tabs', 'thẻ bảng'));
  row(tr('миникарта', 'minimap', 'bản đồ nhỏ'), tr('клик/перетаскивание — камера, ПКМ — приказ', 'click/drag — camera, RMB — order', 'nhấp/kéo — camera, chuột phải — lệnh'));
  return L.join('<br>');
}

// =====================================================================
//  НАЛОЖЕНИЕ СТРАТЕГИИ
// =====================================================================
function drawRTSOverlay(dt){
  const sel = new Set(selGroups());
  drawWorldMarkers(true);
  // юниты
  const all = [...S.units, ...S.vehicles, ...S.drones, ...S.builders];
  for (const u of all){
    if (!u.alive || !facing(u.pos)) continue;
    if (u.team === 1 && u.seen[0] <= 0 && SET.fog) continue;
    const s = project(u.pos); if (!s) continue;
    const g = groupOf(u);
    const isSel = g && sel.has(g);
    const col = TEAM[u.team].css;
    if (isSel){
      octx.strokeStyle = 'rgba(140,255,170,.85)'; octx.lineWidth = 1.5;
      groundRing(u.pos, u.cls === 'tank' ? 3.2 : u.cls === 'drone' ? 1.6 : 0.9, 16);
    }
    const far = S.rts.h > 120;
    if (far || u.cls === 'builder'){
      octx.fillStyle = u.cls === 'builder' && u.team === 0 ? '#7fd4ff' : col;
      if (u.cls === 'tank') octx.fillRect(s[0] - 5, s[1] - 4, 10, 8);
      else if (u.cls === 'drone'){ octx.beginPath(); octx.moveTo(s[0], s[1] - 5); octx.lineTo(s[0] + 4, s[1] + 3); octx.lineTo(s[0] - 4, s[1] + 3); octx.fill(); }
      else { octx.beginPath(); octx.arc(s[0], s[1], u.leader ? 3.6 : 2.6, 0, PI * 2); octx.fill(); }
    }
    if (isSel || u.hp < u.maxhp * 0.95){
      const hp = add(u.pos, mul(u.up, u.cls === 'tank' ? 4 : u.cls === 'builder' ? 1.4 : 2.2));
      const q = project(hp);
      if (q){ const w = u.cls === 'tank' ? 30 : 16; octx.fillStyle = 'rgba(0,0,0,.6)'; octx.fillRect(q[0] - w / 2, q[1], w, 3); octx.fillStyle = u.hp / u.maxhp > 0.5 ? '#9c9' : u.hp / u.maxhp > 0.25 ? '#dc6' : '#e66'; octx.fillRect(q[0] - w / 2, q[1], w * max(0, u.hp) / u.maxhp, 3); }
    }
    if (u === ctrlEntity()){ octx.strokeStyle = '#7cf'; octx.lineWidth = 1.5; octx.beginPath(); octx.arc(s[0], s[1], 11, 0, PI * 2); octx.stroke(); }
  }
  // приказы выделенных
  octx.setLineDash([5, 5]); octx.lineWidth = 1.2;
  for (const g of sel){
    const L = leaderOf(g); if (!L) continue;
    const tgt = g.focus && g.focus.alive ? centerOf(g.focus) : g.goal;
    if (!tgt) continue;
    const a = project(L.pos), b = project(tgt);
    if (a && b && facing(L.pos)){ octx.strokeStyle = g.focus ? 'rgba(255,110,90,.7)' : 'rgba(255,255,255,.5)'; octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke(); }
    octx.fillStyle = '#fff'; octx.font = '600 11px "Exo 2", sans-serif'; octx.textAlign = 'center';
    if (a && facing(L.pos) && S.rts.h < 200) octx.fillText(groupLabel(g), a[0], a[1] - 18);
  }
  octx.setLineDash([]);
  // точка сбора
  const B = S.selB;
  if (B && B.rally){ const a = project(B.cls === 'hq' ? B.pos : B.pos), b = project(B.rally); if (b){ octx.strokeStyle = '#9cf'; octx.setLineDash([3, 4]); if (a){ octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke(); } octx.setLineDash([]); octx.fillStyle = '#9cf'; octx.fillRect(b[0], b[1] - 14, 10, 7); octx.fillRect(b[0], b[1] - 14, 1.5, 14); } }
  if (S.orderMark && S.orderMark.t > 0){
    S.orderMark.t -= dt;
    const s = project(S.orderMark.p);
    if (s){ octx.strokeStyle = S.orderMark.col || '#7f7'; octx.lineWidth = 2; octx.beginPath(); octx.arc(s[0], s[1], 6 + (0.8 - S.orderMark.t) * 20, 0, PI * 2); octx.stroke(); }
  }
  if (drag && hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > 6){
    octx.strokeStyle = '#8fffaa'; octx.lineWidth = 1; octx.fillStyle = 'rgba(140,255,170,.08)';
    const x = min(drag.x0, drag.x1), y = min(drag.y0, drag.y1), w = abs(drag.x1 - drag.x0), h = abs(drag.y1 - drag.y0);
    octx.fillRect(x, y, w, h); octx.strokeRect(x, y, w, h);
  }
  // прицел способности / командной способности
  if (S.cast && S.mouse){
    const p = pickGround(S.mouse[0], S.mouse[1]);
    if (p){
      const r = S.cast.kind === 'power' ? max(6, POWERS[S.cast.key].r) : 5;
      octx.strokeStyle = S.cast.kind === 'power' ? '#ffb070' : '#ffd27a'; octx.lineWidth = 2;
      groundRing(add(p, mul(norm(p), 0.4)), r, 28);
      if (S.cast.kind === 'abil'){
        octx.setLineDash([4, 6]); octx.strokeStyle = 'rgba(255,210,122,.4)';
        for (const g of sel){ const k = abilList(g).find(a => ABIL[a].key === S.cast.code); const L = leaderOf(g); if (k && L) groundRing(L.pos, ABIL[k].range, 40); }
        octx.setLineDash([]);
      }
    }
  }
  // призрак-чертёж стройки рисует drawEcoWorld → drawPlaceGhost (rts_build.js)
  // тревоги
  for (const a of S.alerts){ const k = (S.rtime - a.t); if (k > 6 || !facing(a.pos)) continue; const s = project(a.pos); if (!s) continue; octx.strokeStyle = `rgba(255,80,60,${(1 - k / 6).toFixed(2)})`; octx.lineWidth = 2; octx.beginPath(); octx.arc(s[0], s[1], 10 + (k * 30) % 30, 0, PI * 2); octx.stroke(); }
  uixWorldOverlay();   // прогресс стройки и производства над зданиями
  drawRTSMinimap();
}
// ---------- миникарта: два полушария (север — наша база, юг — Рой)
const MM = { R: 62 };
function mmCenters(){ MM.R = innerHeight < 500 || innerWidth < 1100 ? 50 : innerHeight > 900 ? 72 : 62; const R = MM.R, y = innerHeight - 22 - R; return [[20 + R, y], [20 + R * 3 + 14, y]]; }
function mmProject(p){
  const d = norm(p), C = mmCenters(), R = MM.R;
  if (d[1] >= 0) return [C[0][0] + d[0] * R, C[0][1] + d[2] * R, 0];
  return [C[1][0] - d[0] * R, C[1][1] + d[2] * R, 1];
}
// точка миникарты → направление на метеорите (null — мимо кругов)
function minimapDir(x, y, slack){
  const C = mmCenters(), R = MM.R;
  for (let i = 0; i < 2; i++){
    let dx = (x - C[i][0]) / R, dz = (y - C[i][1]) / R;
    const r2 = dx * dx + dz * dz;
    if (r2 > (slack || 1.02)) continue;
    if (r2 > 1){ const l = sqrt(r2); dx /= l; dz /= l; }
    const yy = sqrt(max(0, 1 - dx * dx - dz * dz));
    return i === 0 ? [dx, yy, dz] : [-dx, -yy, dz];
  }
  return null;
}
function minimapClick(x, y, btn){
  const dir = minimapDir(x, y);
  if (dir){
    if (btn === 0){ if (S.camFly || dot(dir, S.rts.dir) < 0.9995) flyCamTo(dir); }
    else if (btn === 2){
      const sel = selGroups(); if (!sel.length) return true;
      const p = surfacePoint(dir, 0.5);
      for (const g of sel) setOrder(g, 'move', p, { by: 'player', lock: 120 });
      S.orderMark = { p, t: 0.8 }; emit('ui', { kind: 'ok' });
    }
    return true;
  }
  return false;
}
function drawRTSMinimap(){
  const C = mmCenters(), R = MM.R;
  octx.save();
  for (let i = 0; i < 2; i++){
    octx.beginPath(); octx.arc(C[i][0], C[i][1], R, 0, PI * 2); octx.fillStyle = 'rgba(8,12,18,.78)'; octx.fill();
    octx.strokeStyle = 'rgba(214,198,154,.4)'; octx.lineWidth = 1; octx.stroke();
    octx.fillStyle = 'rgba(214,198,154,.6)'; octx.font = '10px "Exo 2", sans-serif'; octx.textAlign = 'center';
    octx.fillText(i === 0 ? tr('СЕВЕР · МЫ', 'NORTH · US', 'BẮC · TA') : tr('ЮГ · РОЙ', 'SOUTH · SWARM', 'NAM · BẦY ĐÀN'), C[i][0], C[i][1] - R - 4);
  }
  drawFogMinimap(C, R, mmProject);
  const pt = (p, col, r, sq) => { const m = mmProject(p); octx.fillStyle = col; if (sq) octx.fillRect(m[0] - r, m[1] - r, r * 2, r * 2); else { octx.beginPath(); octx.arc(m[0], m[1], r, 0, PI * 2); octx.fill(); } };
  for (const b of S.buildings) if (b.alive && (b.team === 0 || b.known0 || !SET.fog)) pt(b.pos, TEAM[b.team].dim, 2.5, true);
  ecoMinimap(mmProject);   // v6: рудные жилы и инженеры
  for (const h of S.hq) pt(h.pos, h.alive ? TEAM[h.team].css : '#555', 4, true);
  for (const cp of S.cps){ if (cp.core) continue; const m = mmProject(cp.pos); drawDiamond(m[0], m[1], 4, teamCss(cp.owner), 'rgba(0,0,0,.6)'); }
  for (const g of groupsOf(0)){ const L = leaderOf(g); if (L) pt(L.pos, S.sel.has(g) ? '#fff' : TEAM[0].css, g.cls === 'tank' ? 2.4 : 1.8); }
  for (const g of groupsOf(1)){ for (const u of groupUnits(g)) if (u.alive && (u.seen[0] > 0 || !SET.fog)){ pt(u.pos, TEAM[1].css, u.cls === 'tank' ? 2.4 : 1.6); } }
  for (const a of S.alerts){ const k = S.rtime - a.t; if (k > 6) continue; const m = mmProject(a.pos); octx.strokeStyle = `rgba(255,80,60,${(1 - k / 6).toFixed(2)})`; octx.beginPath(); octx.arc(m[0], m[1], 4 + (k * 8) % 8, 0, PI * 2); octx.stroke(); }
  for (const s of S.strikes){ const m = mmProject(s.pos); octx.strokeStyle = s.team ? '#ff5040' : '#ffb070'; octx.beginPath(); octx.arc(m[0], m[1], 4, 0, PI * 2); octx.stroke(); }
  // камера
  const fp = rtsFocusPoint(), f = mmProject(fp);
  // видимая область (по высоте камеры) и стрелка «куда смотрим»
  const vr = clamp(S.rts.h * 1.4 / RM * R, 4, R * 0.9);
  octx.strokeStyle = '#7cf'; octx.lineWidth = 1.5; octx.beginPath(); octx.arc(f[0], f[1], vr, 0, PI * 2); octx.stroke();
  const fa = mmProject(add(fp, mul(S.rts.fwd, 60)));
  if (fa[2] === f[2]){ const ax = fa[0] - f[0], ay = fa[1] - f[1], al = hypot(ax, ay) || 1; octx.fillStyle = '#7cf'; octx.beginPath(); octx.moveTo(f[0] + ax / al * (vr + 7), f[1] + ay / al * (vr + 7)); octx.lineTo(f[0] + ax / al * vr - ay / al * 4, f[1] + ay / al * vr + ax / al * 4); octx.lineTo(f[0] + ax / al * vr + ay / al * 4, f[1] + ay / al * vr - ax / al * 4); octx.closePath(); octx.fill(); }
  octx.restore();
}
