// =====================================================================
//  СТРЕЛЬБА v6 (ветка fps): пули стрелкового оружия — мгновенные (hitscan),
//  трассеры, вспышки, отдача, разброс, прицеливание (ПКМ), магазины,
//  метки попаданий, «голова»-сенсор. Одни правила для игрока и ботов.
//  Ракеты, гранаты, пушки, зенитки и артиллерия остаются снарядами.
//  Здесь же: пригибание, рывок ранцем, «передача сигнала» при перелёте камеры.
// =====================================================================

// ---- параметры оружия (дополняют WEAPONS из game.js; названия и старые поля остаются)
//  rpm — темп (выстр/мин); dmg — урон до начала спада; fall: [м, м, множитель] — линейный спад урона с дистанцией
//  spread — разброс от бедра (рад); ads — множитель разброса в прицеле; zoom — приближение в прицеле
//  bloom — рост разброса за выстрел (рад), bloomMax — предел, rec — скорость спада разброса (рад/с)
//  kick — подброс ствола за выстрел (рад), kickX — случайный увод вбок (рад)
//  head — множитель урона по голове-сенсору; tracer — каждый N-й выстрел трассером; range — дальность (м)
//  spin — раскрутка (с); charge — заряд перед выстрелом (с); semi — одиночный огонь
//  bot: burst — длина очереди бота [мин, макс], pause — пауза между очередями [мин, макс] (с)
//  mods — задел под обвесы (см. ATTACH и gstat)
Object.assign(WEAPONS.rifle, { rpm: 720, dmg: 15, fall: [35, 100, 0.55], mag: 30, reload: 1.6, spread: 0.016, ads: 0.16, zoom: 1.5,
  bloom: 0.0032, bloomMax: 0.028, rec: 0.11, kick: 0.0042, kickX: 0.0016, head: 1.6, tracer: 2, range: 280, type: 'b', speed: 0,
  bot: { burst: [3, 6], pause: [0.8, 1.4] }, mods: {} });
WEAPONS.smg = { n: ['Пистолет-пулемёт', 'SMG', 'Súng tiểu liên'], rpm: 900, dmg: 10.5, fall: [18, 65, 0.5], mag: 40, reload: 1.35, spread: 0.019, ads: 0.24, zoom: 1.35,
  bloom: 0.0028, bloomMax: 0.034, rec: 0.14, kick: 0.0034, kickX: 0.0024, head: 1.5, tracer: 2, range: 220, type: 'b', speed: 0,
  bot: { burst: [4, 8], pause: [0.7, 1.2] }, mods: {} };
Object.assign(WEAPONS.hmg, { rpm: 850, dmg: 12, fall: [45, 130, 0.6], mag: 120, reload: 3.0, spread: 0.022, ads: 0.35, zoom: 1.3,
  bloom: 0.0011, bloomMax: 0.026, rec: 0.08, kick: 0.0029, kickX: 0.0026, head: 1.4, tracer: 2, range: 300, spin: 0.28, type: 'b', speed: 0,
  bot: { burst: [8, 14], pause: [1.0, 1.7] }, mods: {} });
Object.assign(WEAPONS.rail, { rpm: 57, dmg: 72, fall: null, far: [10, 110, 0.8, 1.3], mag: 5, reload: 2.4, spread: 0.0012, ads: 0, zoom: 3.4,
  bloom: 0, bloomMax: 0, rec: 1, kick: 0.028, kickX: 0.004, head: 1.6, tracer: 0, range: 420, charge: 0.28, semi: true, type: 'l', speed: 0,
  bot: { burst: [1, 1], pause: [1.8, 2.6] }, mods: {} });
// оружие техники и турелей (темп задаёт их собственный код в ai.js / sim.js)
WEAPONS.drone  = { n: ['Курсовой пулемёт', 'Drone gun', 'Súng drone'], dmg: 7, fall: [30, 95, 0.5], spread: 0.02, head: 1.3, tracer: 2, range: 200, type: 'b', mag: 0, rpm: 375, kick: 0.002, mods: {} };
WEAPONS.tankmg = { n: ['Спаренный пулемёт', 'Coaxial MG', 'Súng máy đồng trục'], dmg: 7, fall: [40, 120, 0.55], spread: 0.02, head: 1.3, tracer: 2, range: 220, type: 'b', mag: 0, rpm: 600, kick: 0.002, mods: {} };
WEAPONS.turret = { n: ['Турельный пулемёт', 'Turret MG', 'Súng máy tháp'], dmg: 8, fall: [50, 140, 0.6], spread: 0.02, head: 1.3, tracer: 2, range: 240, type: 'm', mag: 0, rpm: 375, kick: 0.002, mods: {} };
// обвесы: множители параметров (пока не выдаются в игре — задел под апгрейды)
const ATTACH = {
  extmag:  { n: ['Увеличенный магазин', 'Extended mag', 'Băng đạn mở rộng'], mag: 1.5, reload: 1.12 },
  comp:    { n: ['Компенсатор', 'Compensator', 'Bộ bù giật'], kick: 0.7, bloom: 0.85 },
  optic:   { n: ['Оптика ×2', 'Optic ×2', 'Ống ngắm ×2'], zoom: 1.35, ads: 0.8 },
  barrel:  { n: ['Длинный ствол', 'Long barrel', 'Nòng dài'], dmg: 1.08, spread: 0.85, rpm: 0.95 },
  hammer:  { n: ['Ускоренный затвор', 'Rapid bolt', 'Khóa nòng nhanh'], rpm: 1.12, kick: 1.1 },
};
function gstat(W, k){
  let v = W[k];
  if (v === undefined || v === null) return v;
  if (W.mods) for (const slot in W.mods){ const A = ATTACH[W.mods[slot]]; if (A && A[k] !== undefined) v *= A[k]; }
  return k === 'mag' ? Math.round(v) : v;
}
// v6.1: оружие игрока — копия с обвесами из карьеры (боты пользуются базовым WEAPONS)
const PWEAP = {};
function pW(w){
  const B = WEAPONS[w] || WEAPONS.rifle;
  let P = PWEAP[w];
  if (!P || Object.getPrototypeOf(P) !== B){ P = PWEAP[w] = Object.create(B); P.mods = {}; }
  const M = typeof CAREER !== 'undefined' ? CAREER.modsFor(w) : null;
  P.mods = M || {};
  return P;
}
function gunOfUnit(u){ const w = roleOf(u).w; return WEAPONS[w] || WEAPONS.rifle; }
ROLES.scout.w = 'smg';   // разведчик — с пистолетом-пулемётом

// ---- попадание луча в хитбоксы
// пехота: голова-сенсор (сфера) + корпус (капсула); остальные — сфера
const HB = { head: 0.94, headR: 0.21, low: -0.4, top: 0.7, bodyR: 0.37, crouch: 0.28 };
function hitRadiusRay(e){
  if (e.cls === 'drone') return 1.2;
  if (e.cls === 'builder') return 0.8;
  if (e.cls === 'tank') return 2.4;
  return hitRadius(e);
}
// луч o + d·t против сферы: вход t или -1
function raySphereT(ox, oy, oz, d, cx, cy, cz, r){
  const lx = ox - cx, ly = oy - cy, lz = oz - cz;
  const b = lx * d[0] + ly * d[1] + lz * d[2];
  const c = lx * lx + ly * ly + lz * lz - r * r;
  const h = b * b - c;
  if (h < 0) return -1;
  const t = -b - Math.sqrt(h);
  return t > 0 ? t : (c < 0 ? 0.01 : -1);
}
// луч против капсулы a-b (приближённо: ближайшее сближение луча с отрезком)
function rayCapsuleT(o, d, a, b, r){
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const wx = o[0] - a[0], wy = o[1] - a[1], wz = o[2] - a[2];
  const A = 1, B = d[0] * ux + d[1] * uy + d[2] * uz, C = ux * ux + uy * uy + uz * uz;
  const D = d[0] * wx + d[1] * wy + d[2] * wz, E = ux * wx + uy * wy + uz * wz;
  const den = A * C - B * B;
  let s = den > 1e-9 ? (A * E - B * D) / den : 0;
  s = clamp(s, 0, 1);
  const px = a[0] + ux * s, py = a[1] + uy * s, pz = a[2] + uz * s;
  // ближайшая к точке оси точка луча
  const t = (px - o[0]) * d[0] + (py - o[1]) * d[1] + (pz - o[2]) * d[2];
  if (t < 0) return -1;
  const qx = o[0] + d[0] * t - px, qy = o[1] + d[1] * t - py, qz = o[2] + d[2] * t - pz;
  const q2 = qx * qx + qy * qy + qz * qz;
  if (q2 > r * r) return -1;
  return max(0.01, t - Math.sqrt(r * r - q2));
}
const _hbA = [0, 0, 0], _hbB = [0, 0, 0];
// res.head = true, если первой задета голова
function rayInfT(o, d, e, res, bonus){
  const P = e.pos, U = e.up, cr = e.crouch ? HB.crouch : 0;
  const hy = HB.head - cr;
  const th = raySphereT(o[0], o[1], o[2], d, P[0] + U[0] * hy, P[1] + U[1] * hy, P[2] + U[2] * hy, HB.headR + bonus * 0.5);
  _hbA[0] = P[0] + U[0] * HB.low; _hbA[1] = P[1] + U[1] * HB.low; _hbA[2] = P[2] + U[2] * HB.low;
  const ty = HB.top - cr;
  _hbB[0] = P[0] + U[0] * ty; _hbB[1] = P[1] + U[1] * ty; _hbB[2] = P[2] + U[2] * ty;
  const tb = rayCapsuleT(o, d, _hbA, _hbB, HB.bodyR + bonus);
  if (th > 0 && (tb < 0 || th <= tb + 0.06)){ res.head = true; return th; }
  res.head = false;
  return tb;
}
// трассировка выстрела: сущности (хитбоксы), потом рельеф/здания/обломки
// opt.steps — предел шагов по рельефу; opt.know — цель, до которой видимость уже проверена (боты)
const TR = { t: 0, ent: null, head: false, bld: null, prop: null, solid: false };
const _hres = { head: false };
function gunTrace(o, d, maxT, team, opt){
  let bt = maxT, be = null, bh = false;
  const bonus = opt.bonus || 0;
  // купол-портал: пули дальше не летят
  { const B = dot(o, d), C = dot(o, o) - S.R * S.R, h = B * B - C; if (h > 0){ const te = -B + Math.sqrt(h); if (te > 0 && te < bt) bt = te; } }
  const L = TGT[team];
  for (let i = 0; i < L.length; i++){
    const e = L[i];
    if (!e.alive || e.cls === 'bld' || e === opt.skip) continue;
    const P = e.pos;
    const inf = e.cls === 'inf';
    const off = inf ? 0.3 : e.cls === 'tank' ? 0.3 : 0;
    const cx = P[0] + e.up[0] * off - o[0], cy = P[1] + e.up[1] * off - o[1], cz = P[2] + e.up[2] * off - o[2];
    const b = cx * d[0] + cy * d[1] + cz * d[2];
    const R = (inf ? 1.0 : hitRadiusRay(e)) + bonus + 0.3;
    if (b < -R || b > bt + R) continue;
    const p2 = cx * cx + cy * cy + cz * cz - b * b;
    if (p2 > R * R) continue;
    let t;
    if (inf) t = rayInfT(o, d, e, _hres, bonus);
    else { t = raySphereT(o[0], o[1], o[2], d, P[0] + e.up[0] * off, P[1] + e.up[1] * off, P[2] + e.up[2] * off, hitRadiusRay(e) + bonus); _hres.head = false; }
    if (t > 0 && t < bt){ bt = t; be = e; bh = _hres.head; }
  }
  const hq = S.hq[1 - team];
  if (hq && hq.alive){ const t = raySphereT(o[0], o[1], o[2], d, hq.pos[0], hq.pos[1], hq.pos[2], 14); if (t > 0 && t < bt){ bt = t; be = hq; bh = false; } }
  TR.ent = be; TR.head = bh; TR.bld = null; TR.prop = null; TR.solid = false;
  // рельеф и постройки: шагаем по SDF до найденной цели (боты по «своей» цели не шагают — видимость уже проверена)
  if (!(opt.know && be === opt.know)){
    let t = 0.3, n = 0;
    const steps = opt.steps || 160;
    while (t < bt && n++ < steps){
      const px = o[0] + d[0] * t, py = o[1] + d[1] * t, pz = o[2] + d[2] * t;
      const m = mapJS(px, py, pz);
      if (m < 0.05){
        bt = t; TR.ent = null; TR.head = false; TR.solid = true;
        const p = [px, py, pz];
        const bl = bldAt(p, 0.3);
        if (bl){ if (bl.team !== team) TR.bld = bl; }
        else { const pr = propAt(p, 0.3); if (pr) TR.prop = pr; }
        break;
      }
      t += max(m * 0.9, 0.06);
    }
  }
  TR.t = bt;
  return TR;
}
function gunFall(W, t){
  if (W.far) return lerp(W.far[2], W.far[3], smoothstep(W.far[0], W.far[1], t));
  const f = W.fall; if (!f) return 1;
  return lerp(1, f[2], clamp((t - f[0]) / (f[1] - f[0]), 0, 1));
}
// направление с разбросом: равномерно в конусе (игрок) или «по Гауссу» (боты)
function spreadDir(d, s, gauss){
  if (s <= 0) return d;
  const t1 = anyTangent(d), t2 = cross(d, t1);
  const r = gauss ? s * 0.55 * Math.sqrt(-2 * Math.log(random() + 1e-9)) : s * Math.sqrt(random());
  const a = random() * PI * 2, ca = cos(a) * r, sa = sin(a) * r;
  return norm([d[0] + t1[0] * ca + t2[0] * sa, d[1] + t1[1] * ca + t2[1] * sa, d[2] + t1[2] * ca + t2[2] * sa]);
}

// ---- трассеры: пул без выделений памяти на выстрел
const TRC_N = 72, TRC_SPEED = 720, TRC_LEN = 8;
const TRACERS = [];
for (let i = 0; i < TRC_N; i++) TRACERS.push({ a: [0, 0, 0], d: [0, 0, 0], L: 0, t: 0, on: false, team: 0, w: 0.045, inc: 0 });
let trcI = 0;
function addTracer(a, b, team, w, inc){
  const T = TRACERS[trcI]; trcI = (trcI + 1) % TRC_N;
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  if (L < 1.5){ T.on = false; return; }
  T.a[0] = a[0]; T.a[1] = a[1]; T.a[2] = a[2];
  T.d[0] = dx / L; T.d[1] = dy / L; T.d[2] = dz / L;
  T.L = L; T.t = 0; T.on = true; T.team = team; T.w = w || 0.045; T.inc = inc ? 1 : 0;
}
function tracersStep(dt){
  for (let i = 0; i < TRC_N; i++){ const T = TRACERS[i]; if (!T.on) continue; T.t += dt; if (T.t * TRC_SPEED - TRC_LEN > T.L) T.on = false; }
}
// вызывается из gatherParticles (render.js): push(a, ширина, b, тип)
function tracersGather(push, near){
  for (let i = 0; i < TRC_N; i++){
    const T = TRACERS[i]; if (!T.on) continue;
    const h = min(T.L, T.t * TRC_SPEED + 1.5), tl = max(0, h - TRC_LEN);
    const a = [T.a[0] + T.d[0] * h, T.a[1] + T.d[1] * h, T.a[2] + T.d[2] * h];
    if (!near(a)) continue;
    push(a, T.w, [T.a[0] + T.d[0] * tl, T.a[1] + T.d[1] * tl, T.a[2] + T.d[2] * tl], T.inc ? 3 : T.team);
  }
}
// ближайшие к камере трассеры — для «марева» в пост-обработке
function tracersNear(cb){
  if (!S.cam) return;
  const c = S.cam.pos;
  for (let i = 0; i < TRC_N; i++){
    const T = TRACERS[i]; if (!T.on) continue;
    const h = min(T.L, T.t * TRC_SPEED + 1.5);
    const hx = T.a[0] + T.d[0] * h - c[0], hy = T.a[1] + T.d[1] * h - c[1], hz = T.a[2] + T.d[2] * h - c[2];
    if (hx * hx + hy * hy + hz * hz < 1600) cb(T, h);
  }
}

// ---- общий выстрел: трассировка, урон, искры, трассер, звук попадания
// o: player (стреляет игрок), dmgK, from (точка вылета для трассера), know, steps, bonus, tracer (bool), td
const GUNS = { fb: { t: 0, kill: 0, head: 0 }, xfer: 0, raise: 0, lastMe: null, busy: false, crouchK: 0, xferTo: null, dashCd: 0, lastRunTap: -9, hide: 0, shotN: 0 };
function gunShoot(src, eye, dir, W, o){
  const team = src.team;
  const tr = gunTrace(eye, dir, o.range || W.range || 200, team, o);
  const t = tr.t, hit = [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
  const ent = tr.ent || tr.bld, head = tr.head;
  const camD2 = S.cam ? dist2(hit, S.cam.pos) : 1e9;
  if (ent){
    const dmg = W.dmg * gunFall(W, t) * (head ? (W.head || 1) : 1) * (o.dmgK || 1);
    const wasAlive = ent.alive;
    if (o.player) GUNS.lastHead = !!head;   // v6.1: для медали «в голову» (карьера)
    damage(ent, dmg, src, W.type || 'b');
    const killed = wasAlive && !ent.alive;
    if (camD2 < 90000) burst(hit, head ? 6 : (ent.cls === 'tank' || ent.cls === 'bld' || ent.cls === 'hq') ? 4 : 3, head ? 9 : 6, 0.12);
    if (o.player){
      GUNS.fb.t = 0.2; if (head) GUNS.fb.head = 0.35; if (killed){ GUNS.fb.kill = 0.5; emit('killmark', { head }); }
      if (head && !killed) emit('headmark', {});
    }
    if (camD2 < 4900) emit('impact', { pos: hit, hit: true, cls: ent.cls });
  } else if (tr.solid){
    if (camD2 < 40000) burst(hit, o.player ? 3 : 2, 4, 0.08);
    if (o.player && (GUNS.shotN % 3 === 0) && !tr.prop) fxSmoke(hit, 0.22, 0.32, 0.55);
    if (camD2 < 4900) emit('impact', { pos: hit, hit: false, cls: tr.prop ? 'prop' : null });
  }
  if (o.tracer !== false && W.tracer) addTracer(o.from || eye, hit, team, o.player ? 0.04 : 0.05, o.inc);
  // свист пуль мимо игрока
  if (!S.attract && S.mode === 'fps' && S.cam && team !== 0 && ent !== ctrlEntity()){
    const c = S.cam.pos, vx = c[0] - eye[0], vy = c[1] - eye[1], vz = c[2] - eye[2];
    const s = vx * dir[0] + vy * dir[1] + vz * dir[2];
    if (s > 0 && s < t){ const q = vx * vx + vy * vy + vz * vz - s * s; if (q < 6.25) emit('whiz', { pos: c }); }
  }
  tr.pos = hit;
  return tr;
}
// упрощённый выстрел техники/турели/дрона (темп считает вызывающий код)
function gunShootSimple(src, muzzle, dir, spread, W){
  const d = spreadDir(dir, spread * (src.team === 1 && !isPlayerSrc(src) ? DK().acc : 1) * 0.8, true);
  const pl = isPlayerSrc(src);
  return gunShoot(src, muzzle, d, W, { player: pl, from: muzzle, steps: pl ? 140 : 48, know: pl ? null : src.target, bonus: pl ? 0.05 : 0 });
}

// ---- игрок
function gunKitInit(K){
  if (K.bloom === undefined){ K.bloom = 0; K.spin = 0; K.charge = 0; K.trig = false; K.kick = 0; K.kickY = 0; K.lastFire = -9; K.dry = 0; }
  for (const k in WEAPONS) if (K.mag[k] === undefined && WEAPONS[k].mag) K.mag[k] = gstat(WEAPONS[k], 'mag');
}
function gunEye(u){ return add(u.pos, mul(u.up, RULES.EYE + (typeof PK !== 'undefined' ? PK.eye : 0) - 0.32 * GUNS.crouchK)); }
// точка вылета трассера: дуло оружия в руках (камера → мир)
function gunMuzzle(u){
  const c = S.cam; if (!c || S.third) return add(add(u.pos, mul(u.up, RULES.EYE * 0.8)), mul(u.fwd, 0.9));
  const ads = S.aimK || 0;
  return add(c.pos, add(add(mul(c.right, 0.19 * (1 - ads)), mul(c.up, lerp(-0.16, -0.06, ads))), mul(c.fwd, 1.0)));
}
function gunSpread(u, W, K){
  const ads = S.aimK || 0;
  let s = gstat(W, 'spread');
  const mv = clamp(u.moveAmt || 0, 0, 1);
  s *= u.grounded ? lerp(0.55, 1.15, mv) : 1.7;     // стоя — точнее, на бегу — хуже, в полёте — заметно хуже
  if (GUNS.crouchK > 0.5) s *= 0.7;
  s *= lerp(1, W.ads !== undefined ? W.ads : 0.3, ads);
  s += K.bloom * lerp(1, 0.55, ads);
  if (W === WEAPONS.hmg && !u.grounded) s *= 1.3;
  return s * (1 - 0.5 * (DK().assist || 0));
}
function pitchBy(p, ang){
  const right = norm(cross(p.fwd, p.up));
  const nf = norm(rotAxis(p.fwd, right, ang));
  if (abs(dot(nf, p.up)) < 0.995) p.fwd = nf;
}
function yawBy(p, ang){ p.fwd = norm(rotAxis(p.fwd, p.up, ang)); }
// «магнетизм» к дронам и летящим: малый конус вокруг прицела
function droneMagnet(eye, d, team){
  let best = null, ba = 0;
  for (const e of TGT[team]){
    if (!e.alive || !(e.cls === 'drone' || isAir(e))) continue;
    const c = centerOf(e), v = sub(c, eye), L = len(v);
    if (L > 140 || L < 2) continue;
    const cone = (e.cls === 'drone' ? 1.7 : 0.9) / L + 0.006;
    const cs = dot(v, d) / L; if (cs < 0.99) continue;
    const ang = acos(clamp(cs, -1, 1));
    if (ang < cone && (!best || ang < ba)){ best = c; ba = ang; }
  }
  return best ? norm(sub(best, eye)) : d;
}
function gunPlayerFire(u, inp, dt){
  const K = S.kit;
  if (!WEAPONS[K.w] || !WEAPONS[K.w].mag) K.w = 'rifle';
  gunKitInit(K);
  const w = K.w, W = pW(w);
  if (K.reloadT > 0){
    K.reloadT -= dt; K.charge = 0; K.spin = max(0, K.spin - dt * 2);
    if (K.reloadT <= 0){ K.reloadT = 0; K.mag[w] = gstat(W, 'mag'); K.dry = 0; }
    return;
  }
  const want = !!inp.fire && GUNS.raise < 0.45;
  if (W.spin){
    K.spin = clamp(K.spin + (want ? dt / W.spin : -dt / (W.spin * 1.5)), 0, 1);
    if (want && K.spin < 1){ if (!K.spinSnd){ K.spinSnd = 1; emit('spinup', {}); } return; }
    if (!want) K.spinSnd = 0;
  }
  if (!want){ K.trig = false; K.charge = max(0, K.charge - dt * 4); if (u.cd < 0) u.cd = 0; return; }
  if (K.mag[w] <= 0){ if (!K.dry){ K.dry = 1; emit('dry', {}); } startReload(); return; }
  if (u.cd > 0) return;
  if (W.semi && K.trig) return;
  if (W.charge){
    if (K.charge <= 0) emit('charge', {});
    K.charge += dt / W.charge;
    if (K.charge < 1) return;
    K.charge = 0;
  }
  if (!K.trig && u.cd < 0) u.cd = 0;
  u.cd = max(u.cd, -dt);
  const iv = 60 / gstat(W, 'rpm');
  for (let n = 0; n < 3 && u.cd <= 0 && K.mag[w] > 0; n++){
    gunPlayerShot(u, W, K, w);
    u.cd += iv;
    if (W.semi) break;
  }
  K.trig = true;
  K.lastFire = S.time;
  if (K.mag[w] <= 0) startReload();
}
function gunPlayerShot(u, W, K, w){
  K.mag[w]--; GUNS.shotN++; ADAPT.shots++;
  const eye = gunEye(u);
  let aimDir = assistAim(eye, u.fwd, u.team);
  aimDir = droneMagnet(eye, aimDir, u.team);
  const dir = spreadDir(aimDir, gunSpread(u, W, K), false);
  const inc = K.incT > 0;
  const from = gunMuzzle(u);
  const dmgK = (u.elite ? 1.15 : 1) * (inc ? 1.4 : 1);
  const r = gunShoot(u, eye, dir, W, { player: true, from, dmgK, inc, steps: 170, bonus: 0.03, tracer: W.tracer ? (GUNS.shotN % W.tracer === 1 || K.lastFire < S.time - 0.3) : false });
  // отдача: ствол вверх и чуть вбок, разброс растёт
  const ads = S.aimK || 0;
  const kick = gstat(W, 'kick') * (1 - 0.35 * ads) * (GUNS.crouchK > 0.5 ? 0.8 : 1) * (0.85 + 0.3 * random());
  const kx = (W.kickX || 0) * (random() * 2 - 0.7) * (1 - 0.3 * ads);
  pitchBy(u, kick); yawBy(u, -kx);
  K.kick += kick; K.kickY += kx;
  K.bloom = min(gstat(W, 'bloomMax') || 0, K.bloom + (gstat(W, 'bloom') || 0) * (ads > 0.5 ? 0.6 : 1));
  S.muzzle = 0.045;
  if (W.type === 'l'){
    S.beams.push({ a: from, b: r.pos, t: 0, life: 0.35, team: u.team, rail: 1 });
    addWave(r.pos, 0.9, 0.3);
    S.recoil = 2.4; S.shake = max(S.shake, 0.35);
    addLight(add(eye, mul(u.fwd, 1.2)), [3, 6, 12], 14, 0.12, 0.01);
    if (!r.ent) fxSmoke(r.pos, 0.5, 0.3);
    emit('rail', { pos: eye, src: u });
  } else {
    S.recoil = min(1.6, (w === 'hmg' ? 0.75 : 1.05) + S.recoil * 0.25);
    if (w === 'hmg') S.shake = max(S.shake, 0.12);
    if (GUNS.shotN % 2) addLight(from, inc ? [9, 4, 1] : [7, 5, 2.6], 9, 0.045, 0.004);
    emit('shot', { pos: eye, team: u.team, src: u, me: true, heavy: w === 'hmg', gun: w });
  }
  // гильза (дешёвая искра)
  if (S.cam && w !== 'rail' && GUNS.shotN % 2 === 0) S.sparks.push({ pos: add(from, mul(S.cam.fwd, -0.6)), vel: add(add(mul(S.cam.right, 3 + random()), mul(S.cam.up, 2.2)), u.vel), life: 0.35, big: 0 });
}

// ---- боты: то же оружие, магазины и темп; точность — по модели навыка
// разброс растёт с дистанцией, своим движением, полётом, подавлением; цель в движении — бот целится с запаздыванием
function gunBotFire(u, aimDir, supp){
  const R = roleOf(u), W = gunOfUnit(u);
  if (u.mag === undefined) u.mag = W.mag;
  if (u.mag <= 0){ u.mag = W.mag; u.cd = W.reload * (0.9 + random() * 0.4); u.burst = 0; return; }
  const tg = u.target && u.target.alive ? u.target : null;
  // реакция: новая цель — короткая пауза «прицеливания» (видна вспышка/поворот до выстрела)
  const vsPlayer = !!tg && tg === ctrlEntity() && !S.attract;
  // (пауза только если бот давно не стрелял — смена цели посреди боя не «замораживает» его)
  if (tg && u.lastTgt !== tg){
    const fresh = S.time - (u.lastShotT === undefined ? -99 : u.lastShotT) > 1.5;
    u.lastTgt = tg;
    // по игроку — «блик» визора/ствола перед первой очередью: видно, кто сейчас откроет огонь
    if (vsPlayer) addLight(add(u.pos, mul(u.up, RULES.EYE + 0.15)), u.team ? [7, 1.2, 0.5] : [3, 4, 7], 5, 0.35, 0.006);
    if (fresh || vsPlayer){ u.cd = (fresh ? 0.22 + random() * 0.25 : 0.1) + (vsPlayer ? 0.3 : 0) + (W.charge || 0); u.burst = 0; return; }
  }
  const eye = add(u.pos, mul(u.up, RULES.EYE * 0.8));
  let dir = aimDir, td = 60;
  if (tg){
    let c = centerOf(tg);
    if (tg.cls === 'inf' && (R.rail || u.elite) && random() < 0.3) c = add(tg.pos, mul(tg.up, HB.head - (tg.crouch ? HB.crouch : 0)));
    if (tg.vel) c = sub(c, mul(tg.vel, 0.17));      // запаздывание за движущейся целью
    const v = sub(c, eye); td = len(v); dir = mul(v, 1 / max(td, 0.01));
  }
  let err = W.spread * 0.4 + 0.015 + td * 0.00006;
  err += u.grounded ? (u.moveAmt || 0) * 0.012 : 0.022;
  if (u.suppT > 0) err += 0.02;
  if (u.crouch) err *= 0.75;
  if (u.team === 1) err *= DK().acc;
  if (u.elite) err *= 0.8;
  const g = u.squad; if (g && g.vet) err *= 1 - 0.07 * g.vet;
  if (R.rail) err *= 0.45;
  if (vsPlayer) err *= 1.1;   // по игроку боты бьют чуть менее метко: игрок убивает бота за ~0.5 с, боты его — за 2–4 с
  err += (u.burstN || 0) * 0.0025 * (W === WEAPONS.hmg ? 0.5 : 1);   // очередь «уводит» ствол
  dir = spreadDir(dir, err, true);
  const from = add(add(eye, mul(dir, 0.8)), mul(norm(cross(u.fwd, u.up)), 0.22));
  const r = gunShoot(u, eye, dir, W, { from, know: tg, steps: 40, range: min(W.range, (td || 60) + 40), dmgK: u.elite ? 1.15 : 1,
                                       tracer: W.tracer ? random() < (W === WEAPONS.hmg ? 0.5 : 0.36) : false });
  u.mag--;
  if (R.rail){
    S.beams.push({ a: from, b: r.pos, t: 0, life: 0.3, team: u.team, rail: 1 });
    addLight(add(eye, mul(dir, 1)), [3, 6, 12], 10, 0.1, 0.006);
    emit('rail', { pos: eye, src: u });
  } else {
    emit('shot', { pos: eye, team: u.team, src: u, heavy: !!R.supp });
    if (random() < 0.22) addLight(add(eye, mul(dir, 1.2)), u.team ? [6, 1.2, 0.5] : [4, 5, 7], 7, 0.05, 0.003);
  }
  // темп и очереди
  if (!u.burst || u.burst <= 0){ const b = W.bot.burst; u.burst = supp ? b[1] : b[0] + floor(random() * (b[1] - b[0] + 1)); u.burstN = 0; }
  u.burst--; u.burstN = (u.burstN || 0) + 1;
  u.cd = 60 / W.rpm;
  if (u.burst <= 0){ const p = W.bot.pause; u.cd += lerp(p[0], p[1], random()) * (supp ? 0.35 : 1) + (W.charge || 0); u.burstN = 0; }
  u.lastShotT = S.time;
}

// ---- шаг: трассеры, разброс, возврат отдачи, пригибание, подъём оружия, «передача сигнала»
function gunStep(dt, rdt){
  tracersStep(dt);
  GUNS.fb.t = max(0, GUNS.fb.t - rdt); GUNS.fb.kill = max(0, GUNS.fb.kill - rdt); GUNS.fb.head = max(0, GUNS.fb.head - rdt);
  GUNS.dashCd = max(0, GUNS.dashCd - rdt);
  if (S.attract || !S.kit) { GUNS.xfer = 0; return; }
  const K = S.kit; gunKitInit(K);
  const W = pW(K.w);
  const firing = S.time - K.lastFire < 0.12;
  K.bloom = max(0, K.bloom - (W.rec || 0.1) * rdt * (firing ? 0.25 : 1));
  const me = ctrlEntity();
  // возврат отдачи: ствол сам возвращается вниз, когда отпускаешь спуск
  if (me && me.cls === 'inf' && S.mode === 'fps'){
    if (K.kick > 0){
      const k = 1 - Math.exp(-rdt * (firing ? 1.5 : 9));
      const rp = K.kick * k, ry = K.kickY * k;
      pitchBy(me, -rp); yawBy(me, ry);
      K.kick -= rp; K.kickY -= ry;
      if (K.kick < 1e-4){ K.kick = 0; K.kickY = 0; }
    }
    // пригибание: C на земле, когда не бежишь (на бегу C — подкат)
    const cr = S.mode === 'fps' && K_('down') && me.grounded && !(typeof PK !== 'undefined' && PK.slideT > 0) && !CAMFX.busy();
    GUNS.crouchK += ((cr ? 1 : 0) - GUNS.crouchK) * min(1, rdt * 12);
    if (GUNS.crouchK > 0.5) me.crouch = true;
  } else { K.kick = 0; K.kickY = 0; GUNS.crouchK = 0; }
  // прицел: приближение и чувствительность
  const Wz = me && me.cls === 'inf' ? (gstat(W, 'zoom') || 1.4) : 1.4;
  S.adsZ = 1 - 1 / Wz; S.adsSens = 0.85 / Wz;
  // вселение и перелёт камеры
  const busy = CAMFX.busy();
  if (me !== GUNS.lastMe){ GUNS.lastMe = me; GUNS.raise = 1; }
  if (busy) GUNS.raise = 1; else GUNS.raise = max(0, GUNS.raise - rdt / 0.42);
  const F = CAMFX.fly;
  if (busy && F){ const k = clamp(F.t / F.dur, 0, 1); GUNS.xfer = max(0.55 + 0.45 * Math.exp(-F.t * 5), smoothstep(0.82, 1, k)); }
  else GUNS.xfer = max(0, GUNS.xfer - rdt * 4);
  S.xfer = GUNS.xfer;
  if (busy !== GUNS.busy){ GUNS.busy = busy; document.body.classList.toggle('xfer', busy); if (!busy && me && me.cls === 'inf') gunSfx('raise'); }
}
function K_(act){ return !!keys[SET.bind[act]]; }
// параметры для шейдера оружия: x — прицел, y — опущено (0..1), z — заряд, w — скрыть
function gunVM3(){
  const K = S.kit, W = K ? WEAPONS[K.w] : null;
  const ads = S.aimK || 0;
  const scope = W && W.zoom > 2.5 && ads > 0.55;
  const r = GUNS.raise, low = r * r * (3 - 2 * r);
  return [scope ? 0 : ads, low, K ? K.charge || 0 : 0, (scope || CAMFX.busy()) ? 1 : 0];
}

// ---- рывок ранцем: Z или двойное нажатие клавиши ранца (на земле и в воздухе), тратит энергию
const DASH = { cost: 0.8, imp: 12, cd: 0.7 };
function gunDash(){
  const u = ctrlEntity();
  if (!u || u.cls !== 'inf' || S.mode !== 'fps' || S.attract || CAMFX.busy() || !u.jet) return;
  if (GUNS.dashCd > 0 || u.locked || u.energy < DASH.cost * 0.6) return;
  const Up = norm(u.pos), F = tangent(u.fwd, Up), Rt = norm(cross(F, Up));
  const f = clamp((K_('fwd') ? 1 : 0) - (K_('back') ? 1 : 0) + TOUCH.move[1], -1, 1);
  const r = clamp((K_('right') ? 1 : 0) - (K_('left') ? 1 : 0) + TOUCH.move[0], -1, 1);
  let w = add(mul(F, f), mul(Rt, r)); if (len(w) < 0.2) w = F; else w = norm(w);
  // гасим скорость поперёк рывка — резкая смена направления
  const vh = sub(u.vel, mul(Up, dot(u.vel, Up)));
  u.vel = sub(u.vel, mul(vh, 0.6));
  u.vel = add(u.vel, add(mul(w, DASH.imp), mul(Up, u.grounded ? 3 : 1.5)));
  u.energy = max(0, u.energy - DASH.cost);
  GUNS.dashCd = DASH.cd;
  S.shake = max(S.shake, 0.25);
  for (let i = 0; i < 6; i++) S.sparks.push({ pos: sub(u.pos, mul(Up, 0.3)), vel: add(mul(w, -7 - random() * 4), mul(randUnit(), 2)), life: 0.3 });
  if (typeof HINTS !== 'undefined' && HINTS.used) HINTS.used('dash');
  gunSfx('dash');
}
addEventListener('keydown', e => {
  if (e.repeat || typeof SET === 'undefined' || !SET.bind) return;
  if (S.attract || S.mode !== 'fps' || (typeof MENU !== 'undefined' && MENU.isOpen())) return;
  if (SET.bind.dash && e.code === SET.bind.dash) gunDash();
  if (e.code === SET.bind.run){
    const now = S.rtime || 0;
    if (now - GUNS.lastRunTap < 0.28 && S.me && !S.me.grounded) gunDash();
    GUNS.lastRunTap = now;
  }
});
// клавиша рывка в меню управления (переназначается)
if (typeof BIND_DEF !== 'undefined' && !BIND_DEF.dash){
  BIND_DEF.dash = 'KeyZ';
  BIND_NAMES.dash = ['Рывок ранцем (или 2× ранец в воздухе)', 'Jet dash (or double-tap jetpack in the air)', 'Lướt bằng ba lô (hoặc nhấn đúp ba lô trên không)'];
  if (SET_DEF.bind) SET_DEF.bind.dash = 'KeyZ';
  if (SET.bind && !SET.bind.dash) SET.bind.dash = 'KeyZ';
}

// ---- звуки (поверх audio.js)
function gunSfx(kind, pos){
  if (typeof AU === 'undefined' || !AU.ready()) return;
  const t = AU.ctx.currentTime, o = AU.sfx;
  switch (kind){
    case 'dash': AU.nz(o, t, 0.32, 'bandpass', 500, 2600, 0.7, 0.55, 0.01); AU.osc(o, t, 0.2, 'sine', 140, 60, 0.35); break;
    case 'kill': AU.osc(o, t, 0.09, 'square', 1250, 1250, 0.07); AU.osc(o, t + 0.07, 0.16, 'triangle', 1900, 1500, 0.16); AU.nz(o, t, 0.12, 'highpass', 3500, 0, 0.6, 0.12); break;
    case 'head': AU.osc(o, t, 0.12, 'triangle', 2600, 2200, 0.13); AU.osc(o, t, 0.06, 'square', 900, 700, 0.04); break;
    case 'dry': AU.osc(o, t, 0.03, 'square', 2400, 1800, 0.08); AU.osc(o, t + 0.05, 0.03, 'square', 1600, 1200, 0.06); break;
    case 'charge': AU.osc(o, t, W_RAIL_CH(), 'sawtooth', 300, 2400, 0.06, 0.05); AU.osc(o, t, W_RAIL_CH(), 'sine', 600, 3800, 0.08, 0.05); break;
    case 'spin': AU.osc(o, t, 0.3, 'sawtooth', 60, 260, 0.06, 0.05); AU.nz(o, t, 0.3, 'bandpass', 400, 1600, 2, 0.12, 0.05); break;
    case 'xfer': AU.nz(o, t, 0.5, 'bandpass', 2600, 600, 4, 0.18, 0.02); AU.osc(o, t, 0.4, 'square', 1400, 300, 0.03); break;
    case 'raise': AU.osc(o, t, 0.05, 'square', 900, 600, 0.05); AU.nz(o, t + 0.08, 0.06, 'bandpass', 2400, 1800, 1.5, 0.12); break;
  }
}
function W_RAIL_CH(){ return (WEAPONS.rail.charge || 0.3) + 0.05; }
// события стрельбы → звук (AU.process обрабатывает остальные)
function gunEvents(events){
  if (S.attract) return;
  for (const e of events){
    if (e.type === 'killmark') gunSfx('kill');
    else if (e.type === 'headmark') gunSfx('head');
    else if (e.type === 'dry') gunSfx('dry');
    else if (e.type === 'charge') gunSfx('charge');
    else if (e.type === 'spinup') gunSfx('spin');
  }
}

// ---- перелёт камеры: «передача сигнала» (шум, полосы, хроматика в post.glsl), оружие спрятано
{
  const os = CAMFX.onSwitch;
  CAMFX.onSwitch = function(u){
    const was = !!this.fly;
    os.call(this, u);
    if (this.fly && !was){ GUNS.xferTo = u; GUNS.xferT0 = S.rtime || 0; gunSfx('xfer'); }
  };
}

// ---- наложение: динамический прицел, метки попаданий, прицел рельсы, патроны у прицела, перезарядка
function gunOverlay(dt){
  if (S.attract || S.mode !== 'fps' || !S.cam || OPER.on || (typeof MENU !== 'undefined' && MENU.isOpen())) return;
  const g = octx, W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
  const c = ctrlEntity();
  // передача сигнала
  if (CAMFX.busy()){
    const tt = (S.rtime || 0) - (GUNS.xferT0 || 0), F = CAMFX.fly, k = F ? clamp(F.t / F.dur, 0, 1) : 1;
    g.save();
    g.font = '700 ' + Math.round(clamp(H * 0.03, 13, 22)) + 'px "Exo 2", Consolas, sans-serif'; g.textAlign = 'center';
    g.fillStyle = (floor(tt * 6) % 2) ? 'rgba(150,230,255,.95)' : 'rgba(150,230,255,.6)';
    const to = GUNS.xferTo;
    const name = to ? (to.cls === 'inf' ? callsign(to) + ' · ' + N2(roleOf(to).n) : to.cls === 'bld' ? bname(to.type) : groupLabel(to)) : '';
    const ty = max(110, H * 0.24);
    g.fillText(tr('ПЕРЕДАЧА СИГНАЛА', 'SIGNAL TRANSFER', 'CHUYỂN TÍN HIỆU') + ' ▸ ' + name.toUpperCase(), cx, ty);
    g.fillStyle = 'rgba(150,230,255,.25)'; g.fillRect(cx - 120, ty + 12, 240, 4);
    g.fillStyle = 'rgba(150,230,255,.9)'; g.fillRect(cx - 120, ty + 12, 240 * k, 4);
    g.restore();
    return;
  }
  if (!c) return;
  const K = S.kit, inf = c.cls === 'inf';
  const Wp = inf && K ? pW(K.w) : null;
  const XC = typeof CAREER !== 'undefined' ? CAREER.xcol() : '242,234,210';   // v6.1: цвет прицела (косметика)
  const ads = S.aimK || 0;
  g.save();
  // прицел рельсы
  if (Wp && Wp.zoom > 2.5 && ads > 0.55){
    const R = min(W, H) * 0.42;
    g.fillStyle = 'rgba(0,0,0,.92)';
    g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, R, 0, PI * 2, true); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx - 8, cy); g.moveTo(cx + 8, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy + 8); g.lineTo(cx, cy + R); g.stroke();
    g.strokeStyle = 'rgba(120,200,255,.8)'; g.lineWidth = 1;
    for (let i = 1; i <= 4; i++){ g.beginPath(); g.moveTo(cx - 5, cy + i * R * 0.12); g.lineTo(cx + 5, cy + i * R * 0.12); g.stroke(); }
    g.fillStyle = 'rgba(255,90,60,.95)'; g.beginPath(); g.arc(cx, cy, 2, 0, PI * 2); g.fill();
    if (K.charge > 0){ g.strokeStyle = 'rgba(140,220,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 22, -PI / 2, -PI / 2 + PI * 2 * min(1, K.charge)); g.stroke(); }
  } else if (Wp){
    // разброс → расстояние штрихов
    const s = gunSpread(c, Wp, K);
    const gap = clamp(s * H / S.cam.fov, 2, 70) + 3;
    const a = clamp(1 - ads * 0.75, 0.25, 1);
    g.strokeStyle = `rgba(${XC},${(0.9 * a).toFixed(2)})`; g.lineWidth = 2; g.shadowColor = '#000'; g.shadowBlur = 2;
    const L = 7;
    g.beginPath();
    g.moveTo(cx - gap - L, cy); g.lineTo(cx - gap, cy); g.moveTo(cx + gap, cy); g.lineTo(cx + gap + L, cy);
    g.moveTo(cx, cy - gap - L); g.lineTo(cx, cy - gap); g.moveTo(cx, cy + gap); g.lineTo(cx, cy + gap + L);
    g.stroke();
    g.fillStyle = 'rgba(255,110,80,.95)'; g.beginPath(); g.arc(cx, cy, ads > 0.5 ? 2 : 1.3, 0, PI * 2); g.fill();
    g.shadowBlur = 0;
  } else {
    g.strokeStyle = `rgba(${XC},.85)`; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, 8, 0, PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,110,80,.95)'; g.beginPath(); g.arc(cx, cy, 1.5, 0, PI * 2); g.fill();
  }
  // метки попаданий: белый ×, голова — жёлтый, убийство — крупный красный
  const fb = GUNS.fb, ht = max(fb.t, S.hitT > 0 ? S.hitT / 0.15 * 0.2 : 0);
  if (ht > 0 || fb.kill > 0){
    const kill = fb.kill > 0, k = kill ? fb.kill / 0.5 : ht / 0.2;
    const r0 = kill ? 9 : 6, r1 = kill ? 22 : 14;
    g.strokeStyle = kill ? `rgba(255,60,40,${k.toFixed(2)})` : fb.head > 0 ? `rgba(255,215,90,${k.toFixed(2)})` : `rgba(255,255,255,${k.toFixed(2)})`;
    g.lineWidth = kill ? 3.5 : 2.2; g.shadowColor = '#000'; g.shadowBlur = 3;
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]){ g.moveTo(cx + sx * r0, cy + sy * r0); g.lineTo(cx + sx * r1, cy + sy * r1); }
    g.stroke(); g.shadowBlur = 0;
  }
  // патроны и перезарядка у прицела
  if (Wp && K){
    const mag = K.mag[K.w] || 0, full = gstat(Wp, 'mag');
    if (K.reloadT > 0){
      const p = 1 - K.reloadT / (gstat(Wp, 'reload') || 1);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 26, 0, PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,200,90,.95)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 26, -PI / 2, -PI / 2 + PI * 2 * p); g.stroke();
      g.font = '700 12px "Exo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffd27a'; g.fillText(tr('ПЕРЕЗАРЯДКА', 'RELOADING', 'ĐANG NẠP'), cx, cy + 46);
    } else if (mag <= full * 0.25){
      g.font = '700 13px "Exo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = mag ? '#ffb070' : '#ff6050';
      g.fillText(mag ? `${mag} · ${tr('мало патронов', 'low ammo', 'sắp hết đạn')} — ${bk('reload')}` : tr(`ПУСТО — ${bk('reload')}`, `EMPTY — ${bk('reload')}`, `HẾT ĐẠN — ${bk('reload')}`), cx, cy + 46);
    }
    if (Wp.spin && K.spin > 0 && K.spin < 1){ g.strokeStyle = 'rgba(255,190,90,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 18, -PI / 2, -PI / 2 + PI * 2 * K.spin); g.stroke(); }
  }
  g.restore();
}

// ---- стили HUD v6 (крупнее портреты отряда, патроны, перелёт камеры) — внедряем отсюда, чтобы не трогать head.html
S.newMarks = true;
(function gunCSS(){
  const st = document.createElement('style');
  st.textContent = `
  #cross{display:none !important}
  body.xfer #kit, body.xfer #bars, body.xfer #squadp .chat{opacity:0;transition:opacity .15s}
  #kit, #bars{transition:opacity .25s}
  #squadp{width:300px;gap:4px;bottom:190px}
  #squadp h5{font-size:12px}
  #squadp .sm{gap:9px;padding:3px 8px 3px 3px;border-left-width:4px}
  #squadp img{width:48px;height:48px}
  #squadp b{font-size:15px;display:flex;align-items:baseline;gap:6px}
  #squadp b .hpn{margin-left:auto;font:600 13px "Exo 2";color:#e8dcb8}
  #squadp .sm.low b .hpn{color:#ff7a66}
  #squadp small{font-size:12px;height:15px;color:#c9c0a4}
  #squadp small .cls{color:var(--sand)}
  #squadp i{height:6px;margin-top:3px;border:1px solid rgba(0,0,0,.4)}
  #squadp .chat p{font-size:13px}
  .weap{min-width:200px;padding:5px 14px}
  .weap b{font-size:40px}
  .weap b em{font-size:16px}
  .weap.low b{color:#ff8a6a} .weap.rl b{color:#ffd27a;font-size:24px}
  .weap .rbar{height:3px;background:rgba(0,0,0,.5);margin-top:2px} .weap .rbar s{display:block;height:100%;background:#ffd27a}
  @media (max-height: 760px){
    #squadp{width:250px;bottom:186px;gap:3px} #squadp img{width:36px;height:36px} #squadp b{font-size:13px} #squadp small{font-size:11px;height:13px}
    #squadp .sm{padding:2px 6px 2px 2px} #squadp i{height:5px;margin-top:2px} #squadp .chat p{font-size:12px}
  }
  @media (max-height: 600px){ #squadp .chat p:nth-last-child(n+2){display:none} #squadp h5{display:none} }
  body.touch #squadp{transform:none;top:58px;width:232px;gap:3px;bottom:auto}
  body.touch #squadp img{width:34px;height:34px}
  body.touch #squadp b{font-size:13px} body.touch #squadp small{font-size:11px;height:13px}
  body.touch #squadp h5, body.touch #squadp .chat{display:none}
  body.touch #kit .weap b{font-size:24px}
  #touch .tf button.adsb{width:58px;height:58px;font-size:22px}
  `;
  document.head.appendChild(st);
})();

// игрок сам тянет мышь вниз против отдачи — автовозврат уменьшается (не «перетягивает» прицел)
{
  const lb = lookBy;
  lookBy = function(mx, my){
    const K = S.kit;
    if (K && K.kick > 0){
      const down = my * (SET.invertY ? -1 : 1);
      if (down > 0) K.kick = max(0, K.kick - down * 0.0022 * SET.sens * (S.aiming ? (S.adsSens || 0.6) : 1));
    }
    return lb(mx, my);
  };
}
// в начале боя — короткая памятка по новому управлению стрельбой и ранцем
{
  const nm = newMatch;
  newMatch = function(opts){
    const r = nm(opts);
    GUNS.lastMe = null; GUNS.raise = 0; GUNS.xfer = 0; for (const T of TRACERS) T.on = false;
    if (!S.attract){
      if (typeof TOUCH !== 'undefined' && TOUCH.on) feed(tr('◎ — прицел, R — перезарядка, » — рывок ранцем', '◎ — aim, R — reload, » — jet dash', '◎ — ngắm, R — nạp đạn, » — lướt'), '#9cf');
      else feed(tr(`ПКМ — прицел · ${bk('reload')} — перезарядка · ${bk('down')} стоя — пригнуться · ${bk('dash')} или 2×${bk('run')} в воздухе — рывок`, `RMB — aim · ${bk('reload')} — reload · ${bk('down')} standing — crouch · ${bk('dash')} or 2×${bk('run')} in the air — dash`, `Chuột phải — ngắm · ${bk('reload')} — nạp · ${bk('down')} khi đứng — cúi · ${bk('dash')} hoặc 2×${bk('run')} trên không — lướt`), '#9cf');
    }
    return r;
  };
}
