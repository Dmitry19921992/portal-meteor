// =====================================================================
//  v8.2 — КОНСОРЦИУМ: УКРЕПЛЕНИЯ И ПОЛЕВОЙ РЕМОНТ (CON82)
//  • «Бетонный барьер» (wall82): секция 7 × 1.4 × 1.7 м. Держит пехоту, технику, пули и снаряды (bldSDF + точная
//    проверка видимости los), ИИ объезжает (рулёжка v8.1: секции, стоящие встык, — одно препятствие).
//    Ставится поперёк направления на ближайшую чужую точку / врага; рядом со своей секцией — встык, продолжением цепочки.
//    На телефоне после «Строить» сразу предлагается следующая секция цепочки.
//  • «Ремонтный пост» (rep82): чинит технику (36/с, в бою 18/с), здания (1 %/с) и пехоту (4/с) в 26 м — зелёные искры-лучи.
//  • Полевой ремонт: инженеры Консорциума чинят в 1.3 раза быстрее и сами берутся за побитую технику в 70 м и здания в 80 м;
//    инженеры Роя технику сами не чинят (у Роя — регенерация).
//  • Турели Консорциума: 80 руды вместо 90, прочность ×1.35, урон ×1.15.  Числа — CON82.K (подобраны боями бот против бота).
//  • ИИ Консорциума (FAC82.aiQ): ряды барьеров перед своими точками и базой, ремонтный пост.
// =====================================================================
const CON82 = {
  K: { field: 1.3, turHp: 1.35, turDmg: 1.15, turCost: 80 },
  L: 3.5, T: 0.7, PITCH: 7.2, R: 26, acc: 0, wz: [], wsig: '', wT: 0,
  stats: { walls: 0, wallBlocks: 0, repPost: 0, field: 0, fieldHp: 0, postHp: 0, aiWalls: 0 },
  wlT: -1, wlN: -1, WL: [],
  wl(){ if (this.wlT !== S.time || this.wlN !== S.buildings.length){ this.wlT = S.time; this.wlN = S.buildings.length; this.WL = S.buildings.filter(b => b.alive && b.type === 'wall82'); } return this.WL; },   // секции — кэш на кадр (для los)
  walls(t){ return S.buildings.filter(b => b.alive && b.type === 'wall82' && (t === undefined || b.team === t)); },
  // куда смотрит стена: на ближайшую чужую точку, вражеское здание или штаб
  fwdFor(team, dir){
    let best = null, bd = 1e9;
    const c = p => { const d = surfDist(dir, p); if (d > 8 && d < bd){ bd = d; best = p; } };
    for (const cp of S.cps) if (!cp.core && cp.owner !== team) c(cp.pos);
    for (const b of S.buildings) if (b.alive && b.team !== team && b.type !== 'wall82') c(b.pos);
    if (S.hq[1 - team] && S.hq[1 - team].alive) c(S.hq[1 - team].pos);
    return best ? tangent(sub(best, mul(dir, len(best))), dir) : tangent(sub(mul(BASES[team], -1), dir), dir);
  },
  // продолжение цепочки: рядом своя секция — ставим встык, тем же направлением
  snap(team, dir){
    let best = null, bd = 4.5;
    for (const w of this.walls(team)){
      if (surfDist(dir, w.up) > 12) continue;
      for (const s of [1, -1]){ const e = offsetOnSphere(w.up, mul(w.R, s), this.PITCH), d = surfDist(dir, e);
        if (d < bd && !this.walls(team).some(o => o !== w && surfDist(o.up, e) < 5)){ bd = d; best = { dir: e, fwd: tangent(w.fwd, e), next: offsetOnSphere(w.up, mul(w.R, s), this.PITCH * 2) }; } }
    }
    return best;
  },
  // точная проверка отрезка против секции (видимость: SDF-шаг 2.5 м мог проскочить 1.4 м бетона)
  segHits(a, b, w){
    const c = add(w.pos, mul(w.up, 0.55)), hy = 1.15 * max(0.05, w.built);
    const L = p => { const q = sub(p, c); return [dot(q, w.R), dot(q, w.up), dot(q, w.fwd)]; };
    const A = L(a), B = L(b), H = [this.L, hy, this.T];
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 3; i++){
      const d = B[i] - A[i];
      if (abs(d) < 1e-6){ if (abs(A[i]) > H[i]) return false; continue; }
      let u0 = (-H[i] - A[i]) / d, u1 = (H[i] - A[i]) / d; if (u0 > u1){ const x = u0; u0 = u1; u1 = x; }
      t0 = max(t0, u0); t1 = min(t1, u1); if (t0 > t1) return false;
    }
    return t1 > 0.001 && t0 < 0.999;
  },
  // препятствия для рулёжки ИИ (формат TER81.OB): секции встык — одна группа
  zones(){
    if (this.zT === S.time) return this.wz; this.zT = S.time;
    const W = this.wl().filter(w => w.built > 0.3); const sig = W.map(w => w.id).join(',');
    if (sig === this.wsig) return this.wz;
    this.wsig = sig;
    const par = W.map((_, i) => i), f = i => par[i] === i ? i : (par[i] = f(par[i]));
    const ends = W.map(w => [offsetOnSphere(w.up, w.R, -this.L), offsetOnSphere(w.up, w.R, this.L)]);
    for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++){
      if (surfDist(W[i].up, W[j].up) > this.PITCH + 2) continue;
      if (ends[i].some(a => ends[j].some(b => surfDist(a, b) < 1.6))) par[f(i)] = f(j);
    }
    const G = new Map();
    W.forEach((w, i) => { const k = f(i); if (!G.has(k)) G.set(k, []); G.get(k).push(i); });
    const Z = [];
    for (const [k, idx] of G){
      // концы группы: самые дальние концы секций вдоль общей оси
      const ax = W[idx[0]].R, c0 = W[idx[0]].up; let lo = null, hi = null, slo = 1e9, shi = -1e9;
      for (const i of idx) for (const e of ends[i]){ const s = dot(sub(e, c0), ax); if (s < slo){ slo = s; lo = e; } if (s > shi){ shi = s; hi = e; } }
      const GA3 = mul(lo, RM), GAB = sub(mul(hi, RM), GA3), Gil2 = 1 / max(1e-6, dot(GAB, GAB));
      for (const i of idx){
        const A3 = mul(ends[i][0], RM), AB = sub(mul(ends[i][1], RM), A3), Wd = this.T + 1.7;
        Z.push({ seg: 1, A3, AB, il2: 1 / dot(AB, AB), W: Wd, grp: 'w82_' + k, GA3, GAB, Gil2, c: W[i].up, cb: cos((this.L + Wd + 40) / RM), hard: 0, wall82: 1 });
      }
    }
    return (this.wz = Z);
  },
  // ---- кадр: ремонтный пост
  step(dt){
    this.acc += dt; if (this.acc < 0.25) return; const a = this.acc; this.acc = 0;
    const low = FAC82.low(), R2 = this.R * this.R;
    for (const p of S.buildings){
      if (!p.alive || !p.done || p.type !== 'rep82') continue;
      const top = add(p.pos, add(mul(p.up, 3.4), add(mul(p.R, 1.4), mul(p.fwd, 1.3))));
      const fx = (e, c) => { if (random() < (low ? 0.25 : 0.7)){ const v = sub(c, top), l = len(v); S.sparks.push({ pos: top, vel: mul(v, 1 / 0.45), life: min(0.45, l / 20 + 0.1), heal: 1, big: !low }); S.sparks.push({ pos: add(c, mul(randUnit(), 0.8)), vel: mul(norm(c), 2), life: 0.4, heal: 1 }); } };
      let n = 0;
      for (const v of S.vehicles) if (v.alive && v.team === p.team && v.hp < v.maxhp && dist2(v.pos, p.pos) < R2){ const h = min(v.maxhp - v.hp, (S.time - v.lastHurt < 2 ? 18 : 36) * a); v.hp += h; this.stats.postHp += h; fx(v, v.pos); n++; }
      for (const b of S.buildings) if (b !== p && b.alive && b.done && b.team === p.team && b.hp < b.maxhp && dist2(b.pos, p.pos) < R2){ const h = min(b.maxhp - b.hp, max(8, b.maxhp * 0.01) * a); b.hp += h; this.stats.postHp += h; if (n < 3) fx(b, bldCenter(b)); n++; }
      for (const u of S.units) if (u.alive && u.team === p.team && !u.tun82 && u.hp < u.maxhp && dist2(u.pos, p.pos) < R2){ u.hp = min(u.maxhp, u.hp + 4 * a); if (n < 4 && random() < 0.3) fx(u, u.pos); }
    }
  },
};
// ---------------------------------------------------------------- место барьера
{ const sp0 = siteProblem;
  siteProblem = function(team, type, dir){
    if (type !== 'wall82') return sp0.apply(this, arguments);
    const W = CON82.walls(); for (const w of W) w.alive = false;   // соседние секции не «занимают место» — ставим встык
    let r; try { r = sp0.apply(this, arguments); } finally { for (const w of W) w.alive = true; }
    if (r) return r;
    for (const w of W) if (surfDist(dir, w.up) < 5.5) return T82('Место занято', 'Spot is taken', 'Chỗ này đã có');
    if (typeof TER81 !== 'undefined' && TER81.ready && TER81.near(dir, 2)) return T82('Мешают скалы', 'Rocks in the way');
    return null;
  }; }
CON82.hint = null;   // направление для следующей секции (snap / ИИ)
{ const mb0 = makeBuilding;
  makeBuilding = function(type, team, dir, fwdHint){
    if (type === 'wall82' && !fwdHint) fwdHint = CON82.hint || CON82.fwdFor(team, norm(dir));
    const b = mb0.call(this, type, team, dir, fwdHint);
    if (type === 'wall82'){ CON82.hint = null; CON82.stats.walls++; }
    if (type === 'turret' && FI76(team) === 0 && FAC82.on){ b.maxhp = round(BTYPES.turret.hp * CON82.K.turHp); b.hp = b.maxhp * 0.15; b.bast82 = 1; }
    return b;
  }; }
{ const pp0 = playerPlace;
  playerPlace = function(type, dir, queue){
    if (type !== 'wall82') return pp0.apply(this, arguments);
    const s = CON82.snap(0, dir); if (s) dir = s.dir; CON82.hint = s ? s.fwd : null;
    const r = pp0.call(this, type, dir, queue);
    CON82.hint = null;
    if (!r){
      FAC82.tip('wall', 'Барьер держит пули и технику. Рядом со своей секцией новая встаёт встык — так строится стена.', 'A barrier stops bullets and vehicles. Next to an existing section a new one snaps on — that is how you build a wall.');
      // телефон: сразу предлагаем следующую секцию цепочки
      if (TOUCH.on){ const last = S.lastSite; Promise.resolve().then(() => { if (canBuild(0, 'wall82') || !last) return; const n = CON82.snap(0, offsetOnSphere(last.up, last.R, CON82.PITCH));
        if (n){ S.place = 'wall82'; S.placeAt = mul(n.dir, groundR(n.dir)); } }); }
    }
    return r;
  }; }
// призрак: прямоугольник секции с учётом стыковки
{ const dg0 = drawPlaceGhost;
  drawPlaceGhost = function(){
    dg0.apply(this, arguments);
    if (S.place !== 'wall82') return;
    FAC82.safe(() => {
      let dir = placeTarget(); if (!dir) return;
      const s = CON82.snap(0, dir), fw = s ? s.fwd : CON82.fwdFor(0, dir); if (s) dir = s.dir;
      const why = canBuild(0, 'wall82') || siteProblem(0, 'wall82', dir), col = why ? 'rgba(255,96,80,.95)' : 'rgba(143,255,170,.95)';
      const up = dir, R = norm(cross(fw, up)), g = groundR(dir);
      const P = (x, y, z) => project(add(mul(up, g + y), add(mul(R, x), mul(fw, z))));
      octx.strokeStyle = col; octx.lineWidth = 2;
      for (const y of [0.1, 1.7]){ const q = [P(-3.5, y, -0.7), P(3.5, y, -0.7), P(3.5, y, 0.7), P(-3.5, y, 0.7)]; if (q.some(v => !v)) continue;
        octx.beginPath(); octx.moveTo(q[0][0], q[0][1]); for (const v of q.slice(1)) octx.lineTo(v[0], v[1]); octx.closePath(); octx.stroke(); }
      const f0 = P(0, 0.2, 0.7), f1 = P(0, 0.2, 4); if (f0 && f1){ octx.beginPath(); octx.moveTo(f0[0], f0[1]); octx.lineTo(f1[0], f1[1]); octx.stroke(); }   // к врагу
    }, 'ghost');
  }; }
// ---------------------------------------------------------------- видимость, рулёжка, гибель секций без спама в ленте
{ const lo0 = los;
  los = function(a, b){
    if (!lo0(a, b)) return false;
    if (!FAC82.on) return true;
    const W = CON82.wl(); if (!W.length) return true;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2, r = dist(a, b) / 2 + 4.5;
    for (const w of W){
      if (!w.alive || w.built < 0.3) continue;
      const dx = w.pos[0] - mx, dy = w.pos[1] - my, dz = w.pos[2] - mz; if (dx * dx + dy * dy + dz * dz > r * r) continue;
      if (CON82.segHits(a, b, w)){ CON82.stats.wallBlocks++; return false; }
    }
    return true;
  }; }
if (typeof AIR81 !== 'undefined' && AIR81.zones){ const z0 = AIR81.zones;
  AIR81.zones = function(){ const Z = z0.apply(this, arguments); if (!FAC82.on || !CON82.wl().length) return Z; const W = CON82.zones(); if (!W.length) return Z;
    const c = CON82.zc; if (c && c.t === S.time && c.Z === Z && c.n === Z.length && c.W === W) return c.out;
    const out = Z.concat(W); CON82.zc = { t: S.time, Z, n: Z.length, W, out }; return out; }; }
{ const de0 = destroy;
  destroy = function(e, src){
    if (!e || e.cls !== 'bld' || e.type !== 'wall82' || S.attract) return de0.apply(this, arguments);
    const f0 = feed, e0 = emit; feed = function(){}; emit = function(t){ if (t !== 'radio') return e0.apply(this, arguments); };
    try { return de0.apply(this, arguments); } finally { feed = f0; emit = e0; }
  }; }
// ---------------------------------------------------------------- турели Консорциума: дешевле, прочнее, сильнее
CON82.tcost = t => FI76(t) === 0 && FAC82.on ? CON82.K.turCost : 90;
CON82.withCost = function(t, fn){ const B = BTYPES.turret, c0 = B.cost; B.cost = this.tcost(t); try { return fn(); } finally { B.cost = c0; } };
{ const cb0 = canBuild; canBuild = function(team, type){ if (type !== 'turret') return cb0.apply(this, arguments); const a = arguments; return CON82.withCost(team, () => cb0.apply(this, a)); }; }
{ const pb0 = placeBuilding; placeBuilding = function(team, type){ if (type !== 'turret') return pb0.apply(this, arguments); const a = arguments; return CON82.withCost(team, () => pb0.apply(this, a)); }; }
{ const cs0 = cancelSite; cancelSite = function(j){ if (!j || j.type !== 'turret') return cs0.apply(this, arguments); const a = arguments; return CON82.withCost(j.team, () => cs0.apply(this, a)); }; }
CON82.TD = BTYPES.turret.d;
CON82.ui = function(){   // цена и описание турели в меню — для фракции игрока
  BTYPES.turret.cost = this.tcost(0);
  BTYPES.turret.d = FI76(0) === 0 && FAC82.on ? [`Автоматический пулемёт. Можно вселиться. Консорциум: дешевле (${this.K.turCost}), прочнее ×${this.K.turHp}, урон ×${this.K.turDmg}.`, `Automatic machine gun. Can be manned. Consortium: cheaper (${this.K.turCost}), toughness ×${this.K.turHp}, damage ×${this.K.turDmg}.`, CON82.TD[2]] : CON82.TD;
};
CON82.ui();
{ const dm0 = damage;
  damage = function(e, dmg, src){
    if (src && src.cls === 'bld' && src.type === 'turret' && src.bast82 && FAC82.on) arguments[1] = dmg * CON82.K.turDmg;
    return dm0.apply(this, arguments);
  }; }
// ---------------------------------------------------------------- полевой ремонт
{ const bw0 = builderWork;
  builderWork = function(b, j, dt){
    if (FAC82.on && j && (j.cls !== 'bld' || j.done) && b.team < 2){
      const k = FI76(b.team) === 0 ? CON82.K.field : 1, h0 = j.hp;
      const r = bw0.call(this, b, j, dt * k);
      if (k > 1) CON82.stats.fieldHp += max(0, j.hp - h0);
      return r;
    }
    return bw0.apply(this, arguments);
  }; }
{ const bt0 = builderThink;
  builderThink = function(b){
    bt0.apply(this, arguments);
    if (!FAC82.on || b.team > 1) return;
    if (FI76(b.team) === 1){ if (b.auto && b.site && b.site.cls === 'tank' && b.order === 'repair'){ b.order = 'idle'; b.site = null; b.auto = false; } return; }
    if (b.order !== 'idle') return;
    let best = null, bd = 1e9;
    for (const v of S.vehicles){ if (!v.alive || v.team !== b.team || v.hp > v.maxhp * 0.92 || S.time - v.lastHurt < 1.5) continue; const d = surfDist(v.pos, b.pos); if (d < 70 && d < bd){ bd = d; best = v; } }
    if (!best) for (const x of S.buildings){ if (!x.alive || !x.done || x.team !== b.team || x.hp > x.maxhp * 0.95) continue; const d = surfDist(x.pos, b.pos); if (d < 80 && d < bd){ bd = d; best = x; } }
    if (best){ b.order = 'repair'; b.site = best; b.auto = true; CON82.stats.field++;
      if (b.team === 0 && best.cls === 'tank') FAC82.tip('field', 'Инженеры Консорциума сами чинят технику и здания рядом (до 70–80 м) и в 1.3 раза быстрее.', 'Consortium builders repair nearby vehicles and buildings on their own (up to 70–80 m), 1.3× faster.'); }
  }; }
{ const fs0 = finishSite; finishSite = function(j){ const was = j.done; const r = fs0.apply(this, arguments);
    if (!was && j.type === 'rep82'){ CON82.stats.repPost++; if (j.team === 0) FAC82.tip('rep', 'Ремонтный пост чинит технику, здания и пехоту в 26 м — ставь у линии фронта, за барьерами.', 'The repair post fixes vehicles, buildings and infantry within 26 m — put it near the front, behind barriers.'); }
    return r; }; }
FAC82.steps.push(Object.assign(dt => CON82.step(dt), { tag: 'rep' }));
FAC82.resets.push(() => { CON82.acc = 0; CON82.wsig = ''; CON82.wz = []; CON82.hint = null; CON82.ui(); });
{ const l0 = SAVE.load; SAVE.load = function(){ const r = l0.apply(this, arguments); if (r) FAC82.safe(() => CON82.ui(), 'uiL'); return r; }; }
// ---------------------------------------------------------------- ИИ Консорциума
// ИИ Консорциума: ремонтный пост (с 5:00, когда есть мехзавод), барьеры перед точками и базой (с 2:30, лимит растёт со временем)
FAC82.aiQ.push({ key: 'rep82', ok: t => FAC82.co(t) && S.time > 300 && FAC82.mine('rep82', t).length < 1 && FAC82.mine('factory', t).length > 0 && S.teams[t].ore >= 220 });
FAC82.aiQ.push({ key: 'wall82', ok: t => FAC82.co(t) && S.time > 150 && S.teams[t].ore >= 90 && FAC82.mine('wall82', t).length < min(14, 2 + floor(S.time / 150) * 2) });
// барьеры: ряд поперёк направления на врага перед своей точкой (или штабом)
FAC82.sites.wall82 = t => {
  const own = S.cps.filter(c => !c.core && c.owner === t), foe = S.hq[1 - t].alive ? S.hq[1 - t].pos : mul(BASES[1 - t], RM);
  const anchors = own.sort((a, b) => (b.contested ? 1 : 0) - (a.contested ? 1 : 0) || surfDist(a.dir, foe) - surfDist(b.dir, foe)).slice(0, 2).map(c => ({ c: c.dir, d: 24 }));
  if (S.hq[t].alive) anchors.push({ c: BASES[t], d: 72 });
  for (const A of anchors){
    const f = CON82.fwdFor(t, A.c);
    const row = offsetOnSphere(A.c, f, A.d);
    for (const k of [0, 1, -1, 2, -2, 3, -3]){
      const fr = CON82.fwdFor(t, row), side = norm(cross(row, fr));
      const dir = offsetOnSphere(row, side, k * CON82.PITCH);
      if (!siteProblem(t, 'wall82', dir)){ CON82.hint = tangent(fr, dir); CON82.stats.aiWalls++; return dir; }
    }
  }
  return null;
};
FAC82.sites.rep82 = t => {
  const own = S.cps.filter(c => !c.core && c.owner === t);
  for (let k = 0; k < 30; k++){
    const c = own.length && random() < 0.6 ? own[floor(random() * own.length)].dir : BASES[t], rr = c === BASES[t] ? 35 + random() * 60 : 16 + random() * 30;
    const a = random() * PI * 2, t1 = anyTangent(c), t2 = cross(c, t1);
    const dir = norm(add(mul(c, cos(rr / RM)), mul(add(mul(t1, cos(a)), mul(t2, sin(a))), sin(rr / RM))));
    if (!siteProblem(t, 'rep82', dir)) return dir;
  }
  return null;
};
