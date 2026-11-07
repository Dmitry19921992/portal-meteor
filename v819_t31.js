// =====================================================================
//  v8.19 (T31, Claude) — «живой метеорит» доделан по ограничениям v8.6 (REPORT_v86cloud.md, «Не сделано»):
//   1. Растительность с коллизиями (BIO86): деревца, кристаллы и ледяные иглы — твёрдые (пехота и техника обходят /
//      упираются; на ранце над ними — пролетаешь). Кусты и сугробы — мягкие: пехота в них идёт медленнее (×0.75 / ×0.7).
//      Трава и опавшие листья — проходимы, как раньше. Техника на ходу (> 1.5 м/с) ломает деревца/кристаллы/иглы:
//      хруст, щепки/осколки, предмет пропадает до конца матча.
//   2. Верданы (VER86 + W810) нападают на постройки обеих команд: спокойный вердан, рядом с которым (в его радиусе
//      злости) стоит постройка, злится на неё — хлещет, таранит, грызёт, споровик окутывает облаком. Роботы рядом —
//      важнее постройки. Турели/ИИ защищают постройку: findTarget v86 уже пускает в цели вердана, злого на их команду.
//   3. Аномалии действуют на верданов (A78 + AN86): верданы попадают в A78.within/sense — аномалии на них срабатывают,
//      бьют током/огнём/кислотой (огонь и кислота ×1.6 — растения), Омут и разряды отбрасывают, Сквозняк сносит,
//      Гейзер замораживает (−60 % скорости 8 с), Вывих уносит в антипод, в Мозаике движение рывками и теряют цель,
//      в Глушителе чуют роботов только вблизи (×0.4). «Поющая жила» — зелёный кристалл, их еда: не бьёт, а ЛЕЧИТ.
//      Спокойные верданы обходят опасные аномалии (инстинкт), злые бегут напрямик — их можно заманить в аномалию.
//  Новый код только здесь; хуки — обёртки: physStep, BIO86.cell/collect, VER86.stepOne/move/robots, A78.within/hit,
//  AN86.lift, newMatch. Выключить всё: ?t31=0 или localStorage pm_t31 = '0'; по частям: ?t31veg=0, ?t31bld=0, ?t31an=0.
// =====================================================================
var T31 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('t31') === '0') return false; return localStorage.getItem('pm_t31') !== '0'; } catch (e){ return true; } })(),
  part(k){ try { return new URLSearchParams(location.search).get('t31' + k) !== '0'; } catch (e){ return true; } },
  err: {}, vcache: new (class extends Map { get size(){ return 0; } get n(){ return super.size; } })(), broken: new Set(),
  stats: { blocked: 0, slowed: 0, crushed: 0, bldAgro: 0, bldHits: 0, bldKills: 0, anHits: 0, anHeal: 0, pushed: 0, frozen: 0, lifts: 0, exits: 0, lost: 0, avoided: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('T31 ' + tag, e); } } },
  // ------------------------------------------------------------------ 1. растительность: твёрдое / мягкое (r, H — при масштабе s = 1)
  SOLID: { v86tree: { r: 0.3, H: 3.4 }, v86crys: { r: 0.38, H: 1.1 }, v86ice: { r: 0.42, H: 1.1 } },
  SOFT:  { v86bush: { r: 0.85, H: 1.4, k: 0.75 }, v86drift: { r: 1.35, H: 0.8, k: 0.7 } },
  C: 5.5,   // шаг сетки растительности BIO86.gather — должен совпадать
  vegOn(){ return this.VEG && typeof BIO86 !== 'undefined' && BIO86.on && !(typeof TUT !== 'undefined' && TUT.on) && !(typeof T72 !== 'undefined' && T72.on); },
  // ячейка сетки BIO86 по своему кэшу (кэш рендера у камеры не трогаем — иначе юниты по всей карте его вытесняют).
  // BIO86.cell сам чистит кэш при size > 6000 — у нашего Map size для него всегда 0, предел (40000) держим сами
  cellAt(i, j, k){
    const c0 = BIO86.cache; BIO86.cache = this.vcache;
    try { if (this.vcache.n > 40000) this.vcache.clear(); return BIO86.cell(i, j, k, this.C); } finally { BIO86.cache = c0; }
  },
  // растительность рядом с точкой (только твёрдое и мягкое) — ячейки ±1 у проекции на RM
  nearVeg(p, fn){
    const C = this.C, gp = mul(norm(p), RM), ci = floor(gp[0] / C), cj = floor(gp[1] / C), ck = floor(gp[2] / C);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (let k = ck - 1; k <= ck + 1; k++){
      const x = (i + 0.5) * C, y = (j + 0.5) * C, z = (k + 0.5) * C;
      if (abs(Math.sqrt(x * x + y * y + z * z) - RM) > C * 1.2) continue;
      const c = this.cellAt(i, j, k);
      if (c && !this.broken.has(c.k31)) fn(c);
    }
  },
  near(e){ const L = []; this.nearVeg(e.pos, c => { if (this.SOLID[c.m] || this.SOFT[c.m]) L.push(c); }); return L; },
  // где точка p относительно предмета c: h — высота над его основанием, t — горизонтальный вектор от ствола
  rel(c, p){ const v = sub(p, c.pos), h = dot(v, c.Y); return { h, t: sub(v, mul(c.Y, h)) }; },
  usable(e, free){ return !free && e && e.alive && e.pos && (e.cls === 'inf' || e.cls === 'tank' || e.cls === 'builder') && !e.tun82 && !e.a86 && !e.skyState && len(e.pos) - RM < 40; },
  // до шага: пехота в кусте / сугробе идёт медленнее
  slow(e, inp, L){
    if (e.cls !== 'inf' || !inp || inp.speedMul === undefined) return null;
    let m = 1;
    for (const c of L){
      const K = this.SOFT[c.m]; if (!K) continue;
      const q = this.rel(c, e.pos), R = K.r * c.s + e.rad * 0.5;
      if (q.h > -1 && q.h < K.H * c.s + 0.6 && dot(q.t, q.t) < R * R) m = min(m, K.k);
    }
    if (m >= 1) return null;
    this.stats.slowed++; e.veg31 = m;
    return Object.assign({}, inp, { speedMul: inp.speedMul * m });
  },
  // после шага: выталкиваем из твёрдых (скользим вдоль ствола), техника на ходу ломает
  block(e, L){
    if (!e.vel || !e.alive) return;
    const er = e.cls === 'inf' ? (e.rad || RULES.RAD) * 0.8 : (e.rad || 1.4), heavy = e.cls === 'tank' || !!e.boss83;
    for (const c of L){
      const K = this.SOLID[c.m]; if (!K || this.broken.has(c.k31)) continue;
      const q = this.rel(c, e.pos);
      if (q.h < -1.5 || q.h > K.H * c.s + er * 0.5) continue;   // перелетел сверху
      const R = K.r * c.s + er, d2 = dot(q.t, q.t);
      if (d2 >= R * R) continue;
      if (heavy && len(e.vel) > 1.5){ this.crush(c, e); continue; }
      const d = Math.sqrt(d2), n = d > 1e-4 ? mul(q.t, 1 / d) : norm(tangent(anyTangent(c.Y), c.Y));
      e.pos = add(e.pos, mul(n, R - d));
      const vn = dot(e.vel, n); if (vn < 0) e.vel = sub(e.vel, mul(n, vn));
      this.stats.blocked++;
    }
  },
  crush(c, e){
    this.broken.add(c.k31); this.stats.crushed++;
    e.vel = mul(e.vel, 0.85);
    if (!S.cam || dist2(c.pos, S.cam.pos) > 14400) return;
    const p = add(c.pos, mul(c.Y, 0.8));
    if (typeof burst === 'function') burst(p, c.m === 'v86tree' ? 8 : 5, 5, 0.4);
    if (typeof fxSmoke === 'function') fxSmoke(p, 1.0, c.m === 'v86ice' ? 0.85 : 0.45, 0.6);
    if (typeof AU !== 'undefined' && AU.ready() && AU.allow(p, 70)){
      const t = AU.ctx.currentTime, o = AU.out(p, 0.3);
      if (c.m === 'v86tree') AU.nz(o, t, 0.45, 'bandpass', 900, 300, 0.9, 0.5, 0.005);
      else AU.nz(o, t, 0.3, 'highpass', 3000, 1500, 0.7, 0.5, 0.003);   // кристалл / лёд — звон осколков
    }
  },
  // ------------------------------------------------------------------ 2. верданы и постройки
  REACH: { whip: 6.5, spore: 8, shell: 2.4, tri: 2.6, root: 3.2, swarm: 3.0 },
  BDMG:  { whip: [14, 1.6], shell: [30, 2.2], tri: [10, 1.0], root: [16, 1.8], swarm: [3, 0.5], spore: [5, 1.0] },   // урон (тип 'x') / перезарядка
  bldTgt(f){ const b = f.tgt; return !!(b && b.cls === 'bld'); },
  edge(f, b){ return dist(f.pos, b.pos) - (b.rad || 2); },
  findBld(f, R){
    let best = null, bd = R;
    for (const b of S.buildings){ if (!b.alive || b.team > 1 || dist2(b.pos, f.pos) > (R + 16) * (R + 16)) continue; const d = this.edge(f, b); if (d < bd){ bd = d; best = b; } }
    return best;
  },
  // спокойный вердан чует постройку в своём радиусе злости (роботы рядом — важнее: их v86 проверил раньше)
  senseBld(f, dt){
    if (!this.BLD || !f.alive || f.st === 'agro' || f.bur || f.a86 || !S.buildings.length) return;
    f.b31T = (f.b31T || 0) - dt; if (f.b31T > 0) return; f.b31T = 0.6;
    const K = VER86.SP[f.sp]; if (!K) return;
    const b = this.findBld(f, K.agroR); if (!b) return;
    VER86.agro(f, b, 'bld'); this.stats.bldAgro++;
    if (b.team === 0 && !S.attract && S.time - (this.bldSay || -99) > 30){ this.bldSay = S.time; feed(`🌱 ${VER86.name(f)}: ${tr('вердан напал на постройку', 'a Verdan attacks a building', 'Verdan tấn công công trình')} — ${N2(BTYPES[b.type] ? BTYPES[b.type].n : ['?', '?', '?'])}`, VER86.SP[f.sp].css); }
  },
  // шаг вердана, злого на постройку (вместо обычного: у здания нет скорости/отброса)
  stepBld(f, dt){
    const K = VER86.SP[f.sp], b = f.tgt;
    f.t += dt; f.flash = max(0, f.flash - dt * 4); f.lash = max(0, f.lash - dt); f.atkT -= dt; f.senseT -= dt; f.agroT -= dt;
    // роботы рядом важнее постройки: подошёл — переключается на него
    if (f.senseT <= 0){ f.senseT = 0.3; const n = VER86.robots(f, K.agroR); if (n.length){ VER86.agro(f, n.reduce((p, e) => dist2(e.pos, f.pos) < dist2(p.pos, f.pos) ? e : p, n[0]), 'near'); f.st31 = 0; return false; } }
    const d0 = b.alive ? this.edge(f, b) : 1e9, reach = this.REACH[f.sp] || 2.5;
    // не может подойти (скала, обрыв) 6 с — бросает
    if (d0 < reach) f.stuck31 = 0; else if (d0 < (f.last31 === undefined ? 1e9 : f.last31) - 0.05) f.stuck31 = 0; else f.stuck31 = (f.stuck31 || 0) + dt;
    f.last31 = d0;
    if (!b.alive || f.agroT <= 0 || f.stuck31 > 6 || dist(b.pos, f.pos) > 60){ f.st = 'calm'; f.tgt = null; f.b31T = f.stuck31 > 6 ? 30 : 3; f.stuck31 = 0; f.last31 = undefined; }
    else {
      const d = d0, D = this.BDMG[f.sp] || [8, 1.5];
      f.fwd = norm(tangent(sub(b.pos, f.pos), f.dir));
      if (d < reach) f.agroT = max(f.agroT, 4);   // достаёт — не остывает
      if (d > reach - 0.4 && f.sp !== 'whip' && f.sp !== 'spore') VER86.move(f, norm(b.pos), K.run || K.v * 2, dt);
      else if (d > reach && f.sp === 'spore') VER86.move(f, norm(b.pos), K.v, dt);
      if (d < reach && f.atkT <= 0){
        f.atkT = D[1];
        if (f.sp === 'spore'){ if (S.time - (f.cloudT || -99) > 7) VER86.cloud(f); }
        else { f.lash = f.sp === 'whip' ? 0.55 : 0.3; f.lashP = bldCenter(b); VER86.sfx('lash', f); }
        const hit = () => { if (!f.alive || !b.alive) return; damage(b, D[0], null, 'x'); this.stats.bldHits++; if (!b.alive) this.stats.bldKills++; if (S.cam && dist2(b.pos, S.cam.pos) < 3600) VER86.sap(bldCenter(b), 2); };
        if (f.sp === 'whip' || f.sp === 'root') VER86.later(0.35, hit); else hit();
      }
    }
    const bob = f.sp === 'swarm' ? 0.3 * Math.sin(f.t * 1.3 + f.ph) : f.sp === 'tri' ? 0.12 * Math.sin(f.walk * 3) : 0;
    f.up = f.dir; f.pos = add(mul(f.dir, f.g), mul(f.dir, K.h + (f.hd || 0) + bob));
    f.moving = f.st === 'agro' ? 1 : 0;
    return true;
  },
  // ------------------------------------------------------------------ 3. аномалии и верданы
  anOn(){ return this.AN && typeof A78 !== 'undefined' && A78.active() && A78.L.length; },
  faunaNear(p, R, g){
    const L = [], R2 = R * R;
    if (typeof VER86 === 'undefined' || !VER86.active()) return L;
    for (const f of VER86.L){ if (!f.alive || !f.pos || f.bur && f.bur.ph !== 'up' || f.a86) continue; if (dist2(f.pos, p) < R2 && len(f.pos) - g < 4.5) L.push(f); }
    return L;
  },
  // удар аномалии по вердану: «Поющая жила» (зелёный кристалл) кормит, остальное — урон без отброса-статистики роботов
  anHit(f, dmg, pt, a){
    if (!f.alive) return;
    if (a && a.k === 'vein'){ f.hp = min(f.maxhp, f.hp + 25); f.flash = 0.6; this.stats.anHeal++; if (S.cam && dist2(f.pos, S.cam.pos) < 3600) VER86.sap(add(f.pos, mul(f.up, 1)), 3); return; }
    damage(f, dmg, null, pt); this.stats.anHits++;
    if (!S.attract && S.mode === 'fps' && S.cam && dist2(f.pos, S.cam.pos) < 2500 && S.time - (this.anSay || -99) > 40){ this.anSay = S.time; if (a && A78.K[a.k]) feed(`🌱 ${VER86.name(f)}: ${tr('попал в аномалию', 'caught in an anomaly', 'dính dị thường')} — ${A78.name(a)}`, A78.K[a.k].css); }
  },
  hazard(a){ return !A78.dorm(a) && a.k !== 'vein'; },
  zoneAt(p, pad){   // опасная аномалия в точке (для обхода спокойными)
    for (const a of A78.L){ if (!this.hazard(a) || dist2(a.pos, p) > 1600) continue;
      if (a.w2 && typeof AN86 !== 'undefined' ? AN86.inside(a, p, pad) : dist(a.pos, p) < a.r + pad) return a; }
    return null;
  },
  zoneK(p, k){ return typeof AN86 !== 'undefined' && AN86.zoneOf ? AN86.zoneOf(p, k) : null; },
  // скорость вердана: заморозка, мозаика (рывками)
  speedMul(f){
    let m = 1;
    if (f.frz86 > S.time) m *= 0.4;
    const z = this.zoneK(f.pos, 'mosaic'); if (z) m *= floor(S.time * 3 + z.ph) % 2 ? 1.5 : 0.08;
    return m;
  },
  lift(f, a){
    if (f.a86 || (f.a86cd || 0) > S.time || f.bur) return;
    f.a86 = { a: a.id, t: 0, ph: 'up', sw: random() * 6.283 }; f.st = 'calm'; f.tgt = null; f.hz31 = f.hz31 || 0; f.vz31 = 0;
    this.stats.lifts++; if (typeof AN86 !== 'undefined') AN86.stats.lifts++;
  },
  // перелёт вердана: 3 с вверх (крутится) → выход в антиподе с 7 м → падает; как у роботов (AN86.stepLift)
  stepLift(f, dt){
    const s = f.a86, K = VER86.SP[f.sp], a = A78.L[s.a];
    s.t += dt; f.t += dt; f.flash = max(0, f.flash - dt * 4);
    if (s.ph === 'up'){
      if (!a){ f.a86 = null; return; }
      f.hz31 = (2 + 3 * s.t) * s.t;
      f.fwd = norm(tangent(rotAxis(f.fwd, f.dir, dt * 4), f.dir));
      if (s.t >= 3){
        if (S.cam && dist2(f.pos, S.cam.pos) < 40000) addLight(f.pos, [2.5, 3, 6], 14, 0.4, 0.006);
        f.dir = a.ex; f.g = groundR(a.ex); f.hz31 = 7; f.vz31 = -2; f.goal = null;
        f.home = a.ex;
        s.ph = 'down'; s.t = 0; f.dis86 = S.time + 2; a.exT = S.time; this.stats.exits++; if (typeof AN86 !== 'undefined') AN86.stats.exits++;
        if (S.cam && dist2(a.exPos, S.cam.pos) < 40000){ addLight(add(a.exPos, mul(a.ex, 7)), [2.5, 3, 6], 16, 0.6, 0.008); addWave(add(a.exPos, mul(a.ex, 7)), 2, 0.6); }
      }
    } else {
      f.vz31 -= 8 * dt; f.hz31 += f.vz31 * dt;
      if (f.hz31 <= 0 || s.t > 4){ f.hz31 = 0; f.vz31 = 0; f.a86 = null; f.a86cd = S.time + 6; }
    }
    f.up = f.dir; f.pos = add(mul(f.dir, f.g), mul(f.dir, K.h + (f.hd || 0) + f.hz31));
  },
  // скорость от аномалий (Омут, разряды, Сквозняк, Гейзер): вдоль земли — сдвиг с трением, вверх — подскок
  MASS: { whip: 0.15, shell: 0.35, root: 0.3, spore: 0.8, tri: 1, swarm: 1.4 },
  stepVel(f, dt){
    const v = f.vel; if (!v || !(v[0] || v[1] || v[2])) return;
    const k = this.MASS[f.sp] || 1, up = f.dir, vr = dot(v, up), vt = sub(v, mul(up, vr)), sp = len(vt) * k;
    if (sp > 0.05){
      const nd = offsetOnSphere(f.dir, norm(vt), min(sp * dt, 1.5));
      if (!(typeof TER81 !== 'undefined' && TER81.ready && TER81.near(nd, 2))){ f.dir = nd; f.g = groundR(nd); }
      this.stats.pushed++;
    }
    if (vr * k > 0.5 && !(f.hz31 > 0)){ f.vz31 = min(vr * k, 9); f.hz31 = 0.01; }
    f.vel = mul(vt, Math.exp(-dt * 3));   // вертикаль ушла в подскок, горизонталь гасится трением
    if (len(f.vel) < 0.05) f.vel = [0, 0, 0];
  },
  post(f, dt){
    if (!f.alive){ f.a86 = null; f.hz31 = 0; f.vz31 = 0; f.vel = [0, 0, 0]; f.frz86 = 0; return; }
    if (this.AN){
      this.stepVel(f, dt);
      if (f.hz31 > 0){ f.vz31 = (f.vz31 || 0) - 9 * dt; f.hz31 = max(0, f.hz31 + f.vz31 * dt); if (!f.hz31) f.vz31 = 0; }
      // мозаика: злой теряет цель; глушитель — см. robots()
      if (f.st === 'agro' && random() < dt * 2 && this.zoneK(f.pos, 'mosaic')){ f.st = 'calm'; f.tgt = null; this.stats.lost++; }
      if (f.hz31 > 0) f.pos = add(f.pos, mul(f.dir, f.hz31));
    }
    if (this.BLD) this.senseBld(f, dt);
  },
};
T31.VEG = T31.on && T31.part('veg'); T31.BLD = T31.on && T31.part('bld'); T31.AN = T31.on && T31.part('an');
// ------------------------------------------------------------------ хуки
if (T31.on){
  // 1. растительность
  if (typeof BIO86 !== 'undefined' && BIO86.on){
    { const ce0 = BIO86.cell; BIO86.cell = function(i, j, k){ const c = ce0.apply(this, arguments); if (c && c.k31 === undefined) c.k31 = i + ',' + j + ',' + k; return c; }; }
    { const co0 = BIO86.collect; BIO86.collect = function(items){
        if (!T31.broken.size) return co0.apply(this, arguments);
        // gather() внутри collect может заменить props — тогда фильтруем новый список (без сломанных) и оставляем его
        { const P = this.props; if (S.rtime > this.propT){ this.propT = S.rtime + 0.5; this.gather(); if (this.props === P) this.props = P.slice(); } }
        this.props = this.props.filter(c => !T31.broken.has(c.k31));
        return co0.apply(this, arguments);
      }; }
    { const ps0 = physStep; physStep = function(e, inp, dt, free){
        const L = T31.vegOn() && T31.usable(e, free) && BIO86.of(e) ? T31.safe(() => T31.near(e), 'near') : null;
        e.veg31 = 0;
        if (L && L.length){ const o = T31.safe(() => T31.slow(e, inp, L), 'slow'); if (o) arguments[1] = o; }
        const r = ps0.apply(this, arguments);
        if (L && L.length) T31.safe(() => T31.block(e, L), 'block');
        return r;
      }; }
  }
  // 2–3. верданы
  if (typeof VER86 !== 'undefined' && VER86.on){
    { const so0 = VER86.stepOne; VER86.stepOne = function(f, dt){
        if (f && f.alive && f.a86 && T31.AN) return T31.safe(() => T31.stepLift(f, dt), 'lift');
        if (!(f && f.alive && f.st === 'agro' && T31.bldTgt(f) && T31.safe(() => T31.stepBld(f, dt), 'bld') !== false)) so0.apply(this, arguments);
        T31.safe(() => T31.post(f, dt), 'post');
      }; }
    { const mv0 = VER86.move; VER86.move = function(f, to, v, dt){
        if (T31.anOn()){
          v *= T31.speedMul(f);
          if (f.dis86 > S.time) v *= 0.3;   // дезориентация после Вывиха
          // спокойные обходят опасные аномалии; злые бегут напрямик (можно заманить)
          if (f.st !== 'agro' && v > 0){ const nd = offsetOnSphere(f.dir, f.fwd, 1.2), p = mul(nd, f.g + 0.5);
            const z = T31.zoneAt(p, 1.5);
            if (z && !T31.zoneAt(f.pos, 0)){ const aw = tangent(sub(f.pos, z.pos), f.dir); if (len(aw) > 1e-4){ f.fwd = norm(aw); f.goal = offsetOnSphere(f.dir, f.fwd, 8); f.goalT = 4; } T31.stats.avoided++; return 0; } }
        }
        return mv0.call(this, f, to, v, dt);
      }; }
    { const ro0 = VER86.robots; VER86.robots = function(f, R){ if (f && f.ver86 && T31.anOn() && T31.zoneK(f.pos, 'mute')) R *= 0.4; return ro0.call(this, f, R); }; }
    // злость на постройку не сбрасывается обычным hurt — но если бьёт робот, вердан переключается на него (v86 agro)
  }
  if (typeof A78 !== 'undefined' && A78.on && typeof VER86 !== 'undefined' && VER86.on){
    { const wi0 = A78.within; A78.within = function(a, R){ const L = wi0.apply(this, arguments); if (T31.AN && a && a.pos && !(T31.sensing && a.k === 'vein')) for (const f of T31.faunaNear(a.pos, R, a.g)) L.push(f); return L; }; }
    { const se0 = A78.sense; A78.sense = function(){ T31.sensing = true; try { return se0.apply(this, arguments); } finally { T31.sensing = false; } }; }
    { const hi0 = A78.hit; A78.hit = function(e, dmg, pt, a){ if (e && e.ver86){ T31.safe(() => T31.anHit(e, dmg, pt, a), 'anHit'); return; } return hi0.apply(this, arguments); }; }
    // «Поющая жила» не отбрасывает верданов (кормит); отброс остальных — через f.vel (T31.stepVel)
    { const pu0 = A78.push; A78.push = function(e, a){ if (e && e.ver86 && a && a.k === 'vein') return; return pu0.apply(this, arguments); }; }
    if (typeof AN86 !== 'undefined' && AN86.on){
      { const li0 = AN86.lift; AN86.lift = function(e, a){ if (e && e.ver86){ T31.safe(() => T31.lift(e, a), 'lift0'); return; } return li0.apply(this, arguments); }; }
      { const fr0 = AN86.freeze; AN86.freeze = function(e){ const r = fr0.apply(this, arguments); if (e && e.ver86) T31.stats.frozen++; return r; }; }
    }
  }
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); T31.broken.clear(); T31.vcache.clear(); T31.bldSay = -99; T31.anSay = -99; return r; }; }
}
