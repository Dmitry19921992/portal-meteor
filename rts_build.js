// =====================================================================
//  ИНЖЕНЕРЫ-СТРОИТЕЛИ, СТРОЙКИ И ЭКОНОМИКА (v6, ветка rts)
//  Классическая RTS-стройка (StarCraft / C&C / Dawn of War): инженер-строитель
//  обучается в штабе или форпосте, сам идёт к месту, строит и чинит.
//  Руда — одна валюта. Откуда берётся (видно цифрами «+N»):
//    • штаб перерабатывает понемногу всегда;
//    • каждая захваченная точка приносит доход (территория, как в CoH/DoW);
//    • экстрактор, построенный инженером на рудной жиле (светящиеся кристаллы), — главный источник;
//    • трофеи: обломки врагов, склады экспедиции, кристаллы.
//  API для интерфейса (ветка rtsui):
//    rtsReason(action, arg) -> { ok, reason, fix }   (см. описание у функции)
//    BUILD_KEYS / BICON — горячие клавиши и значки построек
//    ecoBreakdown(team) -> доход по источникам, руда/мин
// =====================================================================
const ECO = {
  HQ: 1.3,          // руда/с — переработка в штабе (или в форпосте, если штаба нет)
  PT: 1.6,          // руда/с — за каждую захваченную точку
  CORE: 5,          // руда/с — за Ядро
  EXT: 1.0,         // руда/с — экстрактор на жиле (×«Масштаб боёв»: обычный 60/мин, крупный 108/мин)
  DRILL: 0.35,      // +35% к экстракторам за уровень исследования «Глубокое бурение»
  TICK: 5,          // раз в сколько секунд показывать «+N» над источниками
  POWER: [0, 1, 1.7, 2.2, 2.5],   // скорость стройки: 1 инженер 100%, 2 — 170%, 3 — 220%, 4+ — 250% (потолок, как Build Power в BAR)
  SPEED: 8.5,       // м/с — инженер быстрее пехоты
  HOVER: 0.75,      // высота парения над землёй
};
const BUILD_KEYS = { turret: 'KeyZ', aa: 'KeyX', extractor: 'KeyC', outpost: 'KeyV', factory: 'KeyB', hub: 'KeyN', airdock: 'KeyK' };
const BICON = { turret: '⌖', aa: '⇡', outpost: '⛫', factory: '⚙', hub: '◎', airdock: '✈', extractor: '⛏', builder: '⚒' };
const keyCap = code => String(code || '').replace(/^Key|^Digit/, '');

// ---------------------------------------------------------------------
//  РУДНЫЕ ЖИЛЫ: 3 у каждой базы, по одной у каждой точки, 6 нейтральных.
//  Позиции детерминированы (одинаковы при каждой загрузке — нужно для сохранений).
// ---------------------------------------------------------------------
let VEINS = null;
function veins(){
  if (VEINS) return VEINS;
  VEINS = [];
  if (!PROPS || !PROPS.length) return VEINS;   // мир ещё не создан
  const rnd = seeded(4242);
  const flat = dir => {
    const gr = groundR(dir); if (gr < RM - 22) return false;
    const t = anyTangent(dir), t2 = cross(dir, t), ang = 4 / RM;
    let lo = 1e9, hi = -1e9;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const h = groundR(norm(add(dir, add(mul(t, a * ang), mul(t2, b * ang))))); lo = min(lo, h); hi = max(hi, h); }
    return hi - lo < 1.8 && abs(gr - (hi + lo) / 2) < 1.5;
  };
  const free = dir => {
    for (const a of AXES) if (surfDist(dir, a) < 32) return false;
    for (const c of CPD) if (surfDist(dir, c) < 17) return false;
    for (const b of BASES) if (surfDist(dir, b) < 34) return false;
    for (const p of PROPS) if (surfDist(dir, p.dir) < (p.kind === 5 ? 6 : p.bound + 7)) return false;
    for (const v of VEINS) if (surfDist(dir, v.dir) < 26) return false;
    return true;
  };
  const place = (center, r0, r1, kind, ref) => {
    const t1 = anyTangent(center), t2 = cross(center, t1);
    for (let k = 0; k < 300; k++){
      const a = rnd() * PI * 2, rr = r0 + (r1 - r0) * rnd();
      const dir = offsetOnSphere(center, add(mul(t1, cos(a)), mul(t2, sin(a))), max(0.01, rr));
      if (free(dir) && flat(dir)){ VEINS.push({ i: VEINS.length, dir, pos: mul(dir, groundR(dir)), kind, ref }); return; }
    }
  };
  for (let t = 0; t < 2; t++) for (let k = 0; k < 3; k++) place(BASES[t], 46, 92, 'base', t);
  CPD.forEach((c, i) => place(c, 20, 36, 'cp', i));
  for (const [la, lo] of [[24, 0], [24, 180], [-24, 90], [-24, 270], [58, 130], [-58, 310]]) place(dirLL(la, lo), 0, 45, 'free', -1);
  // кристаллы-маяки у каждой жилы (видно и из шутера). v6.2: три огранённых кристалла —
  // крупный на базальтовом камне (variant 8), средний (9) и малый (10), вокруг — осколки и острые камни
  const K = PROP_KINDS[5];
  for (const v of VEINS){
    const t1 = anyTangent(v.dir), t2 = cross(v.dir, t1);
    for (let k = 0; k < 3; k++){
      const a = (v.i * 1.7 + k * 2.3), dir = offsetOnSphere(v.dir, add(mul(t1, cos(a)), mul(t2, sin(a))), [4.6, 4.3, 4.9][k]);
      const up = dir, fwd = tangent(add(mul(t1, -sin(a)), mul(t2, cos(a))), up), gr = groundR(dir);
      PROPS.push({ cls: 'prop', id: 100000 + PROPS.length, kind: 5, dir, pos: mul(dir, gr - K.sink), up, fwd, R: norm(cross(fwd, up)), hp: 1e7, maxhp: 1e7,
                   bound: K.br, integ: 1, alive: true, variant: 8 + k, team: 2, seen: [1, 1], flash: 0, loot: 0, vein: v.i });
    }
  }
  buildPropGrid();
  return VEINS;
}
function nearestVein(dir, maxD){
  let best = null, bd = maxD || 1e9;
  for (const v of veins()){ const d = surfDist(dir, v.dir); if (d < bd){ bd = d; best = v; } }
  return best;
}
function veinExtractor(v){ return S.buildings.find(b => b.alive && b.type === 'extractor' && b.vein === v.i) || null; }
function veinProblem(team, v){
  if (!v) return tr('Экстрактор ставится только на рудную жилу — светящиеся кристаллы', 'An extractor must go on an ore vein — the glowing crystals', 'Máy khai thác chỉ đặt trên mạch quặng — các tinh thể phát sáng');
  if (veinExtractor(v)) return tr('На этой жиле уже стоит экстрактор', 'This vein already has an extractor', 'Mạch quặng này đã có máy khai thác');
  const foe = 1 - team;
  if (S.hq[foe].alive && surfDist(v.dir, BASES[foe]) < GAME.BASE_R) return tr('Жила на вражеской базе', 'The vein is inside the enemy base', 'Mạch quặng nằm trong căn cứ địch');
  for (const cp of S.cps) if (!cp.core && cp.owner === foe && surfDist(v.dir, cp.dir) < 45) return tr('Жила у вражеской точки — сначала захвати точку', 'The vein is at an enemy point — capture the point first', 'Mạch quặng ở điểm của địch — hãy chiếm điểm trước');
  return null;
}
function veinSiteProblem(team, dir){ return veinProblem(team, nearestVein(dir, 14)); }

// ---------------------------------------------------------------------
//  ИНЖЕНЕР-СТРОИТЕЛЬ: парящий на подушке ремонтно-строительный робот.
//  Приказы: idle | move | build (site) | repair (site) | retreat | hold
// ---------------------------------------------------------------------
function builderSpawn(team){
  if (S.hq[team] && S.hq[team].alive){
    const b = BASES[team], t1 = anyTangent(b), t2 = cross(b, t1), a = random() * PI * 2;
    return surfacePoint(offsetOnSphere(b, add(mul(t1, cos(a)), mul(t2, sin(a))), 24 + random() * 6), ECO.HOVER);
  }
  const op = S.buildings.find(x => x.alive && x.team === team && x.done && (x.type === 'outpost' || x.type === 'factory'));
  return op ? surfacePoint(norm(siteExit(op, 3)), ECO.HOVER) : null;
}
function builderTarget(j){ return j.cls === 'hq' ? mul(BASES[j.team], RM + 2) : j.pos; }
// радиус, на котором инженер работает у объекта (по габаритам модели — чтобы не залезать на стройку)
const WORK_R = { turret: 1.6, aa: 2.2, outpost: 6.8, factory: 11.6, hub: 7.2, airdock: 8.8, extractor: 2.6 };
function builderTargetR(j){ return j.cls === 'hq' ? 17 : j.cls === 'tank' ? 2.6 : j.cls === 'bld' ? (WORK_R[j.type] || j.rad) : 1.5; }
function builderIdle(b){ return !b.order || b.order === 'idle' || b.order === 'hold'; }
function builderBusy(b){ return (b.order === 'build' || b.order === 'repair') && b.site; }
function repairable(e){
  if (!e || !e.alive) return false;
  if (e.cls === 'bld') return !e.done || e.hp < e.maxhp * 0.995;
  if (e.cls === 'hq' || e.cls === 'tank') return e.hp < e.maxhp * 0.995;
  return false;
}
// дать инженеру работу (стройка или ремонт). queue — в конец очереди (Shift)
function builderGive(b, site, queue, byPlayer){
  if (!b || !b.alive || !site) return;
  if (queue && builderBusy(b) && b.site !== site){ if (!b.jobs.includes(site)) b.jobs.push(site); }
  else { b.order = (site.cls === 'bld' && !site.done) ? 'build' : 'repair'; b.site = site; if (!queue) b.jobs = []; b.goal = null; }
  b.auto = false;
  if (byPlayer){ b.byPlayer = true; b.manualUntil = 1e9; }
}
function builderNext(b){
  b.site = null;
  while (b.jobs && b.jobs.length){
    const j = b.jobs.shift();
    if (repairable(j)){ b.order = (j.cls === 'bld' && !j.done) ? 'build' : 'repair'; b.site = j; return; }
  }
  b.order = 'idle'; b.auto = false;
}
function buildPower(n){ return ECO.POWER[min(n, ECO.POWER.length - 1)] || 0; }
// сколько инженеров работает над объектом (считаем по кадрам)
function siteWorkers(j){
  if (j._wt !== S.time){ j._wt = S.time; j._wp = j._wn || 0; j._wn = 0; }
  j._wn++;
  return max(1, j._wp, j._wn);
}
function builderWork(b, j, dt){
  const k = j.team === 1 ? DK().eco : 1;
  const n = siteWorkers(j), share = buildPower(n) / n;
  b.work = 1;
  if (j.cls === 'bld' && !j.done){
    const B = BTYPES[j.type];
    const d = dt * k * share / B.time;
    j.built = min(1, j.built + d);
    j.hp = min(j.maxhp, j.hp + j.maxhp * 0.85 * d);
    if (j.built >= 1) finishSite(j);
  } else if (j.cls === 'bld') j.hp = min(j.maxhp, j.hp + max(12, j.maxhp * 0.025) * dt * share);
  else if (j.cls === 'hq') j.hp = min(j.maxhp, j.hp + 22 * dt);
  else if (j.cls === 'tank') j.hp = min(j.maxhp, j.hp + 30 * dt);
  const top = j.cls === 'hq' ? add(builderTarget(j), mul(BASES[j.team], 6)) : j.cls === 'bld' ? add(j.pos, mul(j.up, max(0.4, j.H * max(0.15, j.built) * 0.9))) : add(j.pos, mul(j.up, 1));
  b.beam = add(top, mul(randUnit(), j.cls === 'bld' ? j.rad * 0.5 : 1));
  if (random() < dt * 10) S.sparks.push({ pos: b.beam, vel: add(mul(norm(b.beam), 2.5), mul(randUnit(), 2.5)), life: 0.35, heal: j.cls === 'bld' && !j.done ? 0 : 1 });
}
function finishSite(j){
  if (j.done) return;
  j.done = true; j.built = 1; j.hp = max(j.hp, j.maxhp * 0.98);
  emit('built', { b: j });
  if (j.team === 0 && !S.attract){
    feed(tr(`Построено: ${bname(j.type)}`, `Construction complete: ${bname(j.type)}`, `Đã xây xong: ${bname(j.type)}`), TEAM[0].css);
    if (j.type === 'extractor') ecoFloat(add(j.pos, mul(j.up, 6)), tr('экстрактор работает', 'extractor online', 'máy khai thác hoạt động'), '#ffd27a', 3);
  }
}
function cancelSite(j){
  if (!j || !j.alive || j.cls !== 'bld' || j.done) return false;
  const refund = BTYPES[j.type].cost;
  S.teams[j.team].ore += refund;
  j.alive = false;
  S.buildings.splice(S.buildings.indexOf(j), 1);
  BLD_LIST = S.buildings; bgridDirty();
  if (S.selB === j) S.selB = null;
  fxSmoke(add(j.pos, mul(j.up, 1)), j.rad * 0.4, 0.3);
  for (const b of S.builders) if (b.site === j) builderNext(b);
  if (j.team === 0 && !S.attract){ feed(tr(`Стройка отменена: ${bname(j.type)}, возврат ${refund} руды`, `Construction cancelled: ${bname(j.type)}, ${refund} ore refunded`, `Đã hủy xây: ${bname(j.type)}, hoàn ${refund} quặng`), '#ffd27a'); ecoFloat(j.pos, '+' + refund, '#ffd27a'); }
  return true;
}
// раз в полсекунды: проверка задачи, отступление, автоматическая помощь рядом
function builderThink(b){
  if (b.site && (!b.site.alive || !repairable(b.site))){
    const j = b.site;
    if (j.alive && b.order === 'build' && j.cls === 'bld' && j.done && j.hp < j.maxhp * 0.995){ b.order = 'repair'; }
    else builderNext(b);
  }
  if ((b.order === 'build' || b.order === 'repair') && !b.site) builderNext(b);
  // под огнём и сильно побит — отходит к базе (если игрок не держит его приказом)
  const hurt = S.time - b.lastHurt < 3;
  if (hurt && b.hp < b.maxhp * 0.5 && b.order !== 'retreat' && !b.byPlayer){
    const home = builderSpawn(b.team);
    if (home && surfDist(home, b.pos) > 40){ if (builderBusy(b)) b.jobs.unshift(b.site); b.order = 'retreat'; b.goal = home; b.site = null; b.retreatT = S.time; }
  }
  if (b.order === 'retreat' && (!b.goal || surfDist(b.pos, b.goal) < 8 || S.time - (b.retreatT || 0) > 25)){ b.order = 'idle'; if (b.jobs.length && S.time - b.lastHurt > 8) builderNext(b); }
  if (b.order === 'move' && b.goal && surfDist(b.pos, b.goal) < 2.5){ b.order = 'idle'; b.goal = null; }
  // автопомощь: свободный инженер достраивает и чинит то, что рядом (как автокаст ремонта в StarCraft)
  if (b.order === 'idle'){
    let best = null, bd = 1e9;
    for (const x of S.buildings){
      if (!x.alive || x.team !== b.team || !repairable(x)) continue;
      const d = surfDist(x.pos, b.pos) - (x.done ? 0 : 25);
      if (d < 70 - (x.done ? 25 : 0) && d < bd){ bd = d; best = x; }
    }
    if (!best){
      const h = S.hq[b.team];
      if (h.alive && repairable(h) && S.time - (h.lastHit || -99) > 6 && surfDist(builderTarget(h), b.pos) < 60) best = h;
      for (const v of S.vehicles) if (!best && v.alive && v.team === b.team && v.hp < v.maxhp * 0.7 && surfDist(v.pos, b.pos) < 35 && S.time - v.lastHurt > 3) best = v;
    }
    if (best){ b.order = (best.cls === 'bld' && !best.done) ? 'build' : 'repair'; b.site = best; b.auto = true; }
  }
}
function builderStep(b, dt){
  b.work = max(0, (b.work || 0) - dt * 3); b.beam = null;
  if (!b.jobs) b.jobs = [];
  if (!b.abil) b.abil = {};
  if (!b.order){ b.order = 'idle'; b.manualUntil = b.manualUntil || 0; }   // старые сохранения (v5: летающие дроны)
  if (!b.serial) b.serial = 1 + S.builders.filter(x => x.team === b.team).reduce((m, x) => max(m, x.serial || 0), 0);
  b.thinkT = (b.thinkT || 0) - dt;
  if (b.thinkT <= 0){ b.thinkT = 0.45 + random() * 0.15; builderThink(b); }
  let goal = null, face = null;
  const j = builderBusy(b) ? b.site : null;
  if (j){
    const c = builderTarget(j), R = builderTargetR(j) + 1.4;
    const d = surfDist(b.pos, c);
    if (d > R + 1){
      // встаём вокруг объекта, каждый на свою сторону
      const up = norm(c), from = tangent(sub(b.pos, c), up), side = norm(cross(up, from));
      const a = ((b.id * 2.39) % 2.4) - 1.2;
      goal = add(c, mul(norm(add(mul(from, cos(a)), mul(side, sin(a)))), R));
    } else { builderWork(b, j, dt); face = c; }
  } else if (b.order === 'move' || b.order === 'retreat') goal = b.goal;
  builderMove(b, goal, dt, face);
}
function builderMove(b, goal, dt, face){
  let Up = norm(b.pos);
  b.grT = (b.grT || 0) - dt;
  if (b.grT <= 0 || !b.gr){
    b.grT = 0.25;
    const g = groundR(Up);
    if (!inShaft(mul(Up, g - 1)) && g > RM - 30) b.gr = g; else if (!b.gr) b.gr = max(g, RM - 30);
  }
  let hv = [0, 0, 0];
  if (goal){
    const v = sub(goal, b.pos), t = sub(v, mul(Up, dot(v, Up))), d = len(t);
    if (d > 1.0){
      let w = mul(t, 1 / d);
      for (const a of AXES){ const dm = surfDist(b.pos, a); if (dm < 18) w = add(w, mul(tangent(sub(b.pos, mul(a, RM)), Up), (18 - dm) / 18 * 2.2)); }
      for (const c of S.cps){ if (c.core) continue; const dm = surfDist(b.pos, c.dir); if (dm < 7) w = add(w, mul(tangent(sub(b.pos, c.pos), Up), (7 - dm) / 7 * 1.5)); }
      for (const p of PROPS){
        if (!p.alive || p.kind === 5) continue;
        const dx = b.pos[0] - p.pos[0], dy = b.pos[1] - p.pos[1], dz = b.pos[2] - p.pos[2], r = p.bound + 2;
        if (dx * dx + dy * dy + dz * dz < r * r){ const dm = sqrt(dx * dx + dy * dy + dz * dz); w = add(w, mul(tangent([dx, dy, dz], Up), (r - dm) / r * 1.6)); }
      }
      for (const x of S.buildings){
        if (!x.alive) continue;
        const r = builderTargetR(x) + (x === b.site ? 0.4 : 1.8), dm = dist(b.pos, x.pos);
        if (dm < r) w = add(w, mul(tangent(sub(b.pos, x.pos), Up), (r - dm) / r * 1.6));
      }
      w = norm(w);
      hv = mul(w, min(ECO.SPEED * (b.order === 'retreat' ? 1.2 : 1), d * 1.6));
    }
  }
  if (b.hopT > 0) b.hopT -= dt;
  const alt = ECO.HOVER + (b.hopT > 0 ? 4.5 : 0);
  const vr = clamp((b.gr + alt - len(b.pos)) * 4, -12, 12);
  const want = add(hv, mul(Up, vr));
  b.vel = add(b.vel, mul(sub(want, b.vel), 1 - Math.exp(-dt * 6)));
  b.pos = add(b.pos, mul(b.vel, dt));
  if (len(b.pos) > S.R - 5) b.pos = mul(norm(b.pos), S.R - 5);
  collide(b);
  Up = norm(b.pos); b.up = Up;
  const hvel = sub(b.vel, mul(Up, dot(b.vel, Up))), sp = len(hvel);
  // застрял (упёрся в скалу) — подпрыгивает на подушке
  if (len(hv) > 2 && sp < 0.7) b.stuckT = (b.stuckT || 0) + dt; else b.stuckT = max(0, (b.stuckT || 0) - dt);
  if (b.stuckT > 1.2){ b.stuckT = 0; b.hopT = 1.3; }
  if (face) b.fwd = turnToward(tangent(b.fwd, Up), tangent(sub(face, b.pos), Up), 4 * dt);
  else if (sp > 0.6) b.fwd = turnToward(tangent(b.fwd, Up), mul(hvel, 1 / sp), 5 * dt);
  b.fwd = tangent(b.fwd, Up);
  b.aim = b.fwd;
  b.phase = (b.phase || 0) + dt * (2 + sp * 1.5);
  b.moveAmt = b.work;
}

// ---------------------------------------------------------------------
//  ИГРОК: выбор инженеров, стройка, приказы ПКМ, клавиши
// ---------------------------------------------------------------------
function teamBuilders(t){ return S.builders.filter(b => b.alive && b.team === t); }
function selBuilders(){ return [...S.sel].filter(g => g && g.cls === 'builder' && g.alive && g.team === 0); }
function nearestBuilder(team, p, idleOnly){
  let best = null, bd = 1e9;
  for (const b of teamBuilders(team)){
    if (idleOnly && !(builderIdle(b) || b.auto)) continue;
    const d = surfDist(b.pos, p) + (builderIdle(b) ? 0 : 400);
    if (d < bd){ bd = d; best = b; }
  }
  return best;
}
// игрок ставит здание: выбранные инженеры (или ближайший свободный) идут строить
function playerPlace(type, dir, queue){
  if (type === 'extractor'){ const v = nearestVein(dir, 14); if (v) dir = v.dir; }
  const why = canBuild(0, type) || siteProblem(0, type, dir);
  if (why) return why;
  let bs = selBuilders();
  if (!bs.length){ const nb = nearestBuilder(0, dir, true) || nearestBuilder(0, dir, false); if (nb) bs = [nb]; }
  if (!bs.length) return tr('Нет инженеров-строителей — обучи в штабе', 'No builders — train one at the HQ', 'Không có kỹ sư — hãy huấn luyện ở sở chỉ huy');
  const err = placeBuilding(0, type, dir);
  if (err) return err;
  const site = S.lastSite;
  for (const b of bs) builderGive(b, site, queue, true);
  S.orderMark = { p: site.pos, t: 0.8, col: '#8fffaa' };
  return null;
}
// ПКМ при выбранных инженерах: по своему зданию/технике — строить/чинить, по земле — идти
function builderOrderAt(bs, x, y, queue){
  const ent = pickEntity(x, y, true);
  if (ent && ent.team === 0 && repairable(ent) && ent.cls !== 'builder'){
    for (const b of bs) builderGive(b, ent, queue, true);
    feed(ent.cls === 'bld' && !ent.done ? tr(`Инженеры (${bs.length}): помогают строить`, `Builders (${bs.length}): helping to build`, `Kỹ sư (${bs.length}): giúp xây`) : tr(`Инженеры (${bs.length}): ремонт`, `Builders (${bs.length}): repairing`, `Kỹ sư (${bs.length}): sửa chữa`), '#8fffaa');
    S.orderMark = { p: centerOf(ent), t: 0.8, col: '#8fffaa' }; emit('ui', { kind: 'ok' });
    return true;
  }
  const p = pickGround(x, y); if (!p) return true;
  const n = bs.length;
  bs.forEach((b, i) => {
    let tp = p;
    if (n > 1){ const up = norm(p), a = i / n * PI * 2, t1 = anyTangent(up); tp = add(p, mul(add(mul(t1, cos(a)), mul(cross(up, t1), sin(a))), 2 + n * 0.8)); }
    b.order = 'move'; b.goal = surfacePoint(norm(tp), ECO.HOVER); b.site = null; b.jobs = []; b.auto = false; b.byPlayer = true; b.manualUntil = 1e9;
  });
  S.orderMark = { p, t: 0.8 }; emit('ui', { kind: 'ok' });
  return true;
}
function builderStop(bs){ for (const b of bs){ b.order = 'idle'; b.site = null; b.jobs = []; b.goal = null; } }
// после возвращения игрока в шутер стратег снова распоряжается инженерами
function releaseBuilders(){ for (const b of S.builders) if (b.byPlayer){ b.byPlayer = false; if (b.manualUntil > S.time + 30) b.manualUntil = S.time + 15; } }
// «.» — следующий свободный инженер (камера к нему)
const IDLEB = { i: 0 };
function selectIdleBuilder(){
  const all = teamBuilders(0);
  if (!all.length){ feed(tr('Инженеров нет — обучи в штабе (вкладка «Войска»)', 'No builders — train one at the HQ ("Units" tab)', 'Không có kỹ sư — huấn luyện ở sở chỉ huy (thẻ “Quân”)'), '#f88'); emit('ui', { kind: 'deny' }); return; }
  const idle = all.filter(b => builderIdle(b));
  const L = idle.length ? idle : all;
  const b = L[IDLEB.i++ % L.length];
  S.sel.clear(); S.selB = null; S.sel.add(b); flyCamTo(b.pos);
  if (!idle.length) feed(tr('Свободных инженеров нет — выбран занятый', 'No idle builders — selected a busy one', 'Không có kỹ sư rảnh — đã chọn một người đang bận'), '#9cf');
}
function startBuild(type){
  const r = rtsReason('build:' + type);
  if (!r.ok){
    feed(`${bname(type)}: ${r.reason}${r.fix ? ' — ' + r.fix : ''}`, '#f88'); emit('ui', { kind: 'deny' });
    // серая кнопка «Нужно: X» — сразу ставим чертёж X (или заказываем инженера)
    if (r.act && r.act !== 'build:' + type && !startBuild._depth){ startBuild._depth = 1; try { rtsDo(r.act); } finally { startBuild._depth = 0; } }
    return false;
  }
  if (!selBuilders().length){
    const p = S.cam ? rtsFocusPoint() : BASES[0];
    const b = nearestBuilder(0, p, true) || nearestBuilder(0, p, false);
    if (b){ S.sel.clear(); S.selB = null; S.sel.add(b); }
  }
  S.place = type; S.cast = null; S.placeAt = null;
  feed(TOUCH.on ? tr(`${bname(type)}: тапни место, затем «Строить»`, `${bname(type)}: tap a spot, then "Build"`, `${bname(type)}: chạm chỗ đặt, rồi “Xây”`)
                : tr(`${bname(type)}: ЛКМ — поставить (Shift — ещё), ПКМ/Esc — отмена`, `${bname(type)}: LMB — place (Shift — more), RMB/Esc — cancel`, `${bname(type)}: chuột trái — đặt (Shift — thêm), chuột phải/Esc — hủy`), '#9cf');
  return true;
}
// клавиши стратегии, связанные со стройкой. true — клавиша обработана
function builderKey(e){
  const c = e.code;
  if (e.ctrlKey || e.altKey) return false;
  if (c === 'Period'){ selectIdleBuilder(); return true; }
  if ((c === 'Delete' || c === 'Backspace') && S.selB && S.selB.cls === 'bld' && !S.selB.done && S.selB.team === 0){ cancelSite(S.selB); emit('ui', { kind: 'ok' }); return true; }
  const bs = selBuilders();
  if (!bs.length) return false;
  for (const k in BUILD_KEYS) if (BUILD_KEYS[k] === c){ startBuild(k); return true; }
  return false;
}

// ---------------------------------------------------------------------
//  rtsReason(action, arg) — почему кнопка недоступна и как это исправить.
//  action: 'build:<тип>'   — начать стройку (нужен инженер, руда, требования, лимит)
//          'place:<тип>'   — можно ли ставить в точке arg (направление/точка)
//          'produce:<ключ>'— заказ в очереди (войска, исследования, инженер 'builder')
//          'power:<ключ>'  — командная способность
//          'cancel'        — отменить выбранную стройку (S.selB)
//  Ответ: { ok, reason, fix, act } — reason короткая причина («Мало руды»),
//         fix — что сделать («Не хватает 40 руды (~15 с). Больше дохода: …»),
//         act — необязательное действие-исправление (строка action), которое UI
//         может выполнить по клику на серую кнопку (rtsDo(act)): например 'build:factory'.
// ---------------------------------------------------------------------
function rtsReason(action, arg){
  const ok = { ok: true, reason: '', fix: '', act: null };
  const no = (reason, fix, act) => ({ ok: false, reason, fix: fix || '', act: act || null });
  const [kind, key] = String(action || '').split(':');
  const T = S.teams[0];
  if (!T) return no('—');
  const oreFix = cost => {
    const lack = Math.ceil(cost - T.ore), inc = T.income || 0;
    return tr(`Не хватает ${lack} руды`, `${lack} more ore needed`, `Thiếu ${lack} quặng`) + (inc > 0.05 ? tr(` (~${Math.ceil(lack / inc)} с)`, ` (~${Math.ceil(lack / inc)} s)`, ` (~${Math.ceil(lack / inc)} giây)`) : '') +
      tr('. Больше дохода: экстракторы на жилах (C), захват точек', '. More income: extractors on veins (C), capture points', '. Thêm thu nhập: máy khai thác trên mạch quặng (C), chiếm điểm');
  };
  const atName = a => a === 'hq' ? tr('Штаб', 'HQ', 'Sở chỉ huy') : bname(a);
  if (kind === 'build' || kind === 'place'){
    const B = BTYPES[key]; if (!B) return no('?');
    if (B.req && !S.buildings.some(b => b.alive && b.team === 0 && b.type === B.req && b.done)){
      const site = S.buildings.find(b => b.alive && b.team === 0 && b.type === B.req);
      return no(tr(`Нужно: ${bname(B.req)}`, `Requires: ${bname(B.req)}`, `Cần: ${bname(B.req)}`), site ? tr(`${bname(B.req)} строится — ${Math.floor(site.built * 100)}%`, `${bname(B.req)} is under construction — ${Math.floor(site.built * 100)}%`, `${bname(B.req)} đang xây — ${Math.floor(site.built * 100)}%`) : tr(`Сначала постройте ${bname(B.req)} — клик поставит его чертёж`, `Build a ${bname(B.req)} first — click to place its blueprint`, `Hãy xây ${bname(B.req)} trước — nhấp để đặt bản vẽ`), site ? null : 'build:' + B.req);
    }
    if (!teamBuilders(0).length) return no(tr('Нет инженеров', 'No builders', 'Không có kỹ sư'), tr('Обучи инженера-строителя в штабе или форпосте (вкладка «Войска», 50 руды)', 'Train a builder at the HQ or an outpost ("Units" tab, 50 ore)', 'Huấn luyện kỹ sư ở sở chỉ huy hoặc tiền đồn (thẻ “Quân”, 50 quặng)'), 'produce:builder');
    const why = canBuild(0, key);
    if (why){
      if (T.ore < B.cost) return no(tr('Мало руды', 'Not enough ore', 'Không đủ quặng'), oreFix(B.cost));
      return no(why, tr('Лимит зависит от «Масштаба боёв» в настройках', 'The limit depends on "Battle scale" in the settings', 'Giới hạn phụ thuộc “Quy mô trận đánh” trong cài đặt'));
    }
    if (kind === 'place' && arg){
      let dir = norm(arg);
      if (key === 'extractor'){ const v = nearestVein(dir, 14); if (v) dir = v.dir; }
      const p = siteProblem(0, key, dir);
      if (p) return no(p, key === 'extractor' ? tr('Подведи к светящимся кристаллам жилы — свободные жилы отмечены ⛏', 'Move onto the glowing crystals of a vein — free veins are marked ⛏', 'Đặt lên tinh thể phát sáng — mạch quặng trống được đánh dấu ⛏')
                                        : tr('Ровное место на своей территории: база, своя точка или форпост (пунктир)', 'A flat spot on your territory: base, owned point or outpost (dashed rings)', 'Chỗ bằng phẳng trong lãnh thổ: căn cứ, điểm đã chiếm hoặc tiền đồn (vòng nét đứt)'));
    }
    return ok;
  }
  if (kind === 'produce'){
    const P = PRODUCTS[key]; if (!P) return no('?');
    const why = canProduce(0, key);
    if (!why) return ok;
    if (!productionSite(0, key)){
      const need = P.at.find(a => a !== 'hq') || 'outpost';
      const site = S.buildings.find(b => b.alive && b.team === 0 && P.at.includes(b.type));
      return no(tr(`Нужно: ${P.at.map(atName).join(tr(' или ', ' or ', ' hoặc '))}`, `Requires: ${P.at.map(atName).join(' or ')}`, `Cần: ${P.at.map(atName).join(' hoặc ')}`),
        site ? tr(`${bname(site.type)} строится — ${Math.floor(site.built * 100)}%`, `${bname(site.type)} under construction — ${Math.floor(site.built * 100)}%`, `${bname(site.type)} đang xây — ${Math.floor(site.built * 100)}%`) : tr(`Постройте ${bname(need)} инженером — клик поставит чертёж`, `Build a ${bname(need)} with a builder — click to place the blueprint`, `Xây ${bname(need)} bằng kỹ sư — nhấp để đặt bản vẽ`), site ? null : 'build:' + need);
    }
    if (T.ore < pCost(0, key)) return no(tr('Мало руды', 'Not enough ore', 'Không đủ quặng'), oreFix(pCost(0, key)));
    if (/[Оо]черед|[Qq]ueue|[Hh]àng/.test(why)) return no(why, tr('Дождись или отмени заказ (ПКМ по кнопке или клик по очереди здания)', 'Wait or cancel an order (RMB on the button or click the building queue)', 'Chờ hoặc hủy lệnh (chuột phải vào nút hoặc nhấp hàng chờ)'));
    if (/[Лл]имит|[Ll]imit|[Gg]iới/.test(why)) return no(why, tr('Лимит армии зависит от «Масштаба боёв» в настройках', 'Army limits depend on "Battle scale" in the settings', 'Giới hạn quân phụ thuộc “Quy mô trận đánh”'));
    return no(why);
  }
  if (kind === 'power'){
    const Pw = POWERS[key]; if (!Pw) return no('?');
    if (T.cmd < Pw.cost) return no(tr('Мало командных очков', 'Not enough command points', 'Không đủ điểm chỉ huy'), tr('КО дают захват точек, убийства и время (1 очко за 75 с)', 'CP come from captures, kills and time (1 per 75 s)', 'ĐCH đến từ chiếm điểm, tiêu diệt và thời gian'));
    const left = powerLeft(0, key);
    if (left > 0) return no(tr(`Перезарядка ${Math.ceil(left)} с`, `Cooldown ${Math.ceil(left)} s`, `Hồi chiêu ${Math.ceil(left)} giây`));
    return ok;
  }
  if (kind === 'cancel'){
    const b = S.selB;
    if (!b || b.cls !== 'bld' || b.team !== 0) return no(tr('Выбери свою стройку', 'Select your construction site', 'Chọn công trình đang xây của bạn'));
    if (b.done) return no(tr('Здание уже достроено', 'Already completed', 'Đã xây xong'));
    return ok;
  }
  return no('?');
}
// выполнить действие-исправление из rtsReason(...).act
function rtsDo(act){
  const [kind, key] = String(act || '').split(':');
  if (kind === 'build') return startBuild(key);
  if (kind === 'produce'){ uiProduce(key); return true; }
  if (kind === 'power'){ startPower(key); return true; }
  if (kind === 'cancel') return cancelSite(S.selB);
  return false;
}

// ---------------------------------------------------------------------
//  ИИ (Рой и наш стратег): те же правила — инженеры, чертежи, жилы
// ---------------------------------------------------------------------
function aiFreeBuilders(t){ return teamBuilders(t).filter(b => !b.byPlayer && b.manualUntil < S.time && b.order !== 'retreat' && (builderIdle(b) || b.auto || b.order === 'move')); }
function aiAssign(t, site, n){
  const L = aiFreeBuilders(t).sort((a, b) => surfDist(a.pos, site.pos) - surfDist(b.pos, site.pos));
  let k = 0;
  for (const b of L){ if (k >= n) break; builderGive(b, site, false, false); k++; }
  return k;
}
function aiWantBuilders(t){
  const ops = S.buildings.filter(b => b.alive && b.done && b.team === t && b.type === 'outpost').length;
  return min(GAME.MAX_BUILDERS, 3 + (S.time > 150 ? 1 : 0) + (S.time > 360 ? 1 : 0) + (S.time > 700 ? 1 : 0) + ops);
}
// лучшая свободная жила для команды t: ближе к своей базе/точкам, без врагов рядом
function aiVein(t){
  let best = null, bs = 1e9;
  const home = S.hq[t].alive ? BASES[t] : ((keyBuildings(t)[0] || {}).up || BASES[t]);
  for (const v of veins()){
    if (veinProblem(t, v)) continue;
    if (S.buildings.some(b => b.alive && b.team === t && b.type === 'extractor' && !b.done && b.vein === v.i)) continue;
    let s = surfDist(v.dir, home);
    const cp = v.kind === 'cp' ? S.cps[v.ref] : null;
    const nb = teamBuilders(t).length;
    if (cp && cp.owner === t){ if (nb < 3) continue; s *= 0.35; }   // своя точка — жила под защитой
    else if (v.kind === 'cp' || v.kind === 'free'){ if (nb < 4 || S.time < 300) continue; s += 250; }   // спорные — когда инженеров хватает
    let foes = 0; for (const e of TGT[t]) if (e.alive && e.cls !== 'bld' && dist2(e.pos, v.pos) < 3600) foes++;
    s += foes * 400;
    if (s < bs){ bs = s; best = v; }
  }
  return bs < 1e8 ? best : null;
}
// каждые 2 с из economy(): незаконченные стройки и ремонт — свободным инженерам
function aiBuilderJobs(t){
  const free = aiFreeBuilders(t); if (!free.length) return;
  for (const s of S.buildings){
    if (!s.alive || s.team !== t || s.done) continue;
    const working = S.builders.filter(b => b.alive && b.site === s && builderBusy(b)).length;
    if (working < (BTYPES[s.type].cost >= 200 ? 2 : 1)) aiAssign(t, s, 1);
  }
  for (const s of S.buildings){
    if (!s.alive || s.team !== t || !s.done || s.hp > s.maxhp * 0.6 || S.time - s.lastHurt < 5) continue;
    if (!S.builders.some(b => b.alive && b.site === s)) aiAssign(t, s, 1);
  }
}
// для economy(): поставить чертёж и отправить инженеров. null — успех
function aiPlace(t, key, dir){
  if (!aiFreeBuilders(t).length) return tr('Нет свободных инженеров', 'No free builders', 'Không có kỹ sư rảnh');
  const why = placeBuilding(t, key, dir);
  if (why) return why;
  aiAssign(t, S.lastSite, BTYPES[key].cost >= 200 ? 2 : 1);
  return null;
}
function aiSiteFor(t, key){
  if (key === 'extractor'){ const v = aiVein(t); return v ? v.dir : null; }
  return findSite(t, key);
}
// набеги: раз в пару минут ИИ посылает свободную группу на вражеский экстрактор вне базы
function aiRaid(t, free){
  const T = S.teams[t];
  if (S.time < (T.raidT || 240)) return;
  T.raidT = S.time + 150 + random() * 90;
  const tg = S.buildings.filter(b => b.alive && b.team !== t && b.type === 'extractor' && (t === 1 ? b.seen[1] > 0 || b.done : b.known0) && !(S.hq[1 - t].alive && surfDist(b.pos, BASES[1 - t]) < GAME.BASE_R));
  if (!tg.length) return;
  const pg = playerGroup();
  const g = free.filter(x => x !== pg && x.order !== 'attack' && (x.cls === 'drone' || x.cls === 'tank' || (isSquad(x) && x.units.length >= 3)))
               .sort((a, b) => (b.cls === 'drone') - (a.cls === 'drone'))[0];
  if (!g) return;
  const L = leaderOf(g); if (!L) return;
  const e = tg.sort((a, b) => surfDist(a.pos, L.pos) - surfDist(b.pos, L.pos))[0];
  setOrder(g, 'focus', centerOf(e), { focus: e, lock: 90 });
  if (t === 1 && !S.attract && e.team === 0) feed(tr('Разведка: Рой идёт на наш экстрактор', 'Intel: the Swarm is moving on our extractor', 'Tình báo: Bầy Đàn đang tiến vào máy khai thác của ta'), '#f88');
}

// ---------------------------------------------------------------------
//  ЭКОНОМИКА: доход по источникам, «+N» над источниками
// ---------------------------------------------------------------------
function ecoReset(){ S.floaters = []; S.ecoT = 0; veins(); }
function ecoFloat(pos, text, col, size){
  const F = S.floaters || (S.floaters = []);
  F.push({ pos, text, col: col || '#ffd27a', t: 0, life: 2.4, size: size || 1 });
  if (F.length > 40) F.shift();
}
function ecoIncome(t, surf, core){
  const T = S.teams[t];
  let ext = 0; for (const b of S.buildings) if (b.alive && b.done && b.team === t && b.type === 'extractor') ext++;
  const drill = 1 + ECO.DRILL * (T.drill || 0);
  const k = GAME.INC_MUL * (t === 1 ? DK().eco : 1);
  const hqOn = S.hq[t].alive || S.buildings.some(b => b.alive && b.done && b.team === t && b.type === 'outpost');
  const P = { hq: (hqOn ? ECO.HQ : 0) * k, pts: surf * ECO.PT * k, core: core * ECO.CORE * k, ext: ext * ECO.EXT * drill * k, nPts: surf, nCore: core, nExt: ext, drill: T.drill || 0, k };
  T.incParts = P;
  return P.hq + P.pts + P.core + P.ext;
}
function ecoBreakdown(t){
  const P = S.teams[t].incParts || { hq: 0, pts: 0, core: 0, ext: 0, nPts: 0, nCore: 0, nExt: 0, drill: 0, k: 1 };
  const m = x => Math.round(x * 60);
  return { total: m(P.hq + P.pts + P.core + P.ext), hq: m(P.hq), pts: m(P.pts), core: m(P.core), ext: m(P.ext), nPts: P.nPts, nCore: P.nCore, nExt: P.nExt, drill: P.drill, k: P.k,
           perPt: m(ECO.PT * P.k), perExt: m(ECO.EXT * (1 + ECO.DRILL * P.drill) * P.k) };
}
// раз в ECO.TICK секунд: всплывающие «+N» над экстракторами, штабом и точками (только свои)
function ecoStep(dt){
  const F = S.floaters || (S.floaters = []);
  for (let i = F.length - 1; i >= 0; i--){ F[i].t += dt; if (F[i].t >= F[i].life) F.splice(i, 1); }
  S.ecoT = (S.ecoT || 0) + dt;
  if (S.ecoT < ECO.TICK) return;
  S.ecoT = 0;
  if (S.attract) return;
  const P = S.teams[0].incParts; if (!P) return;
  const per = x => '+' + Math.round(x * ECO.TICK);
  if (P.nExt){
    const one = P.ext / P.nExt;
    for (const b of S.buildings) if (b.alive && b.done && b.team === 0 && b.type === 'extractor'){
      ecoFloat(add(b.pos, mul(b.up, 5.6)), per(one), '#ffd27a');
      S.sparks.push({ pos: add(b.pos, mul(b.up, 4.8)), vel: mul(b.up, 4), life: 0.6, big: 1 });
    }
  }
  if (P.hq && S.hq[0].alive) ecoFloat(add(S.hq[0].pos, mul(BASES[0], 36)), per(P.hq), '#e8dcb8');
  if (P.nPts){ const one = P.pts / P.nPts; for (const c of S.cps) if (!c.core && c.owner === 0) ecoFloat(add(c.beacon, mul(c.dir, 4)), per(one), '#cfe3ff'); }
}

// ---------------------------------------------------------------------
//  НАЛОЖЕНИЕ: призрак-чертёж, жилы, стройки, «+N»
// ---------------------------------------------------------------------
function placeTarget(){
  const p = S.placeAt || (S.mouse && !TOUCH.on ? pickGround(S.mouse[0], S.mouse[1]) : null);
  if (!p) return null;
  let dir = norm(p);
  if (S.place === 'extractor'){ const v = nearestVein(dir, 14); if (v) dir = v.dir; }
  return dir;
}
function drawPlaceGhost(){
  const type = S.place, T = BTYPES[type]; if (!T) return;
  // территория (пунктир): база, свои точки, форпосты
  octx.setLineDash([6, 6]); octx.strokeStyle = 'rgba(214,198,154,.35)'; octx.lineWidth = 1.5;
  if (type !== 'extractor'){
    if (S.hq[0].alive) groundRing(mul(BASES[0], RM + 1), GAME.BASE_R, 64);
    for (const cp of S.cps) if (!cp.core && cp.owner === 0 && facing(cp.pos)) groundRing(cp.pos, GAME.CP_BUILD_R, 40);
    for (const b of S.buildings) if (b.alive && b.done && b.team === 0 && b.type === 'outpost' && facing(b.pos)) groundRing(b.pos, 55, 40);
  }
  octx.setLineDash([]);
  const dir = placeTarget(); if (!dir) return;
  const why = canBuild(0, type) || siteProblem(0, type, dir);
  const rgb = why ? '255,96,80' : '143,255,170';
  const g = groundR(dir), up = dir, t1 = anyTangent(up), t2 = cross(up, t1), N = 24;
  const ring = h => { const L = []; for (let i = 0; i <= N; i++){ const a = i / N * PI * 2; L.push(project(add(mul(up, g + h), add(mul(t1, cos(a) * T.rad), mul(t2, sin(a) * T.rad))))); } return L; };
  const lo = ring(0.15), hi = ring(T.H);
  const path = (L, close) => { octx.beginPath(); let s = false; for (const q of L){ if (!q){ s = false; continue; } if (!s){ octx.moveTo(q[0], q[1]); s = true; } else octx.lineTo(q[0], q[1]); } if (close) octx.closePath(); };
  octx.fillStyle = `rgba(${rgb},.16)`; path(lo, true); octx.fill();
  octx.strokeStyle = `rgba(${rgb},.9)`; octx.lineWidth = 2; path(lo); octx.stroke();
  octx.strokeStyle = `rgba(${rgb},.55)`; octx.lineWidth = 1.2; path(hi); octx.stroke();
  octx.beginPath();
  for (let i = 0; i < N; i += 3){ const a = lo[i], b = hi[i]; if (a && b){ octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); } }
  octx.stroke();
  const s = project(mul(up, g + T.H + 1.5));
  if (s){
    octx.textAlign = 'center';
    octx.font = '700 13px "Exo 2", sans-serif'; octx.fillStyle = `rgb(${rgb})`;
    octx.fillText(why || `${BICON[type] || ''} ${bname(type)}`, s[0], s[1] - 16);
    octx.font = '11px "Exo 2", sans-serif'; octx.fillStyle = '#e8dcb8';
    const nb = max(1, selBuilders().length);
    octx.fillText(`${T.cost} ${tr('руды', 'ore', 'quặng')} · ${Math.round(T.time / buildPower(min(nb, 4)))} ${tr('с', 's', 'giây')} · ${tr('инженеров', 'builders', 'kỹ sư')}: ${nb}`, s[0], s[1] - 2);
  }
}
function drawEcoWorld(rts){
  const c = ctrlEntity();
  const near = p => rts ? facing(p) : (c && dist2(p, c.pos) < 140 * 140);
  octx.textAlign = 'center';
  // рудные жилы: в стратегии — всегда (тускло), ярко — если выбраны инженеры или ставим экстрактор
  if (rts){
    const hot = S.place === 'extractor' || selBuilders().length > 0;
    for (const v of veins()){
      if (!facing(v.pos) || veinExtractor(v)) continue;
      const s = project(add(v.pos, mul(v.dir, 1.5))); if (!s) continue;
      const bad = veinProblem(0, v);
      const col = bad ? 'rgba(160,150,130,.55)' : (hot ? '#ffd27a' : 'rgba(255,210,122,.6)');
      drawDiamond(s[0], s[1], hot ? 8 : 5, col, hot && !bad ? 'rgba(80,50,0,.55)' : null);
      if (hot || S.rts.h < 70){ octx.font = '600 11px "Exo 2", sans-serif'; octx.fillStyle = col; octx.fillText('⛏ ' + tr('жила', 'vein', 'mạch'), s[0], s[1] - 12); }
    }
  }
  // стройки: блеск, число инженеров, предупреждение «нет инженеров»
  for (const b of S.buildings){
    if (!b.alive || b.done || b.team !== 0) continue;
    const p = add(b.pos, mul(b.up, b.H * max(0.15, b.built) + 0.5));
    if (!near(p)) continue;
    const s = project(p); if (!s) continue;
    const n = S.builders.filter(x => x.alive && x.site === b && builderBusy(x)).length;
    const blink = 0.5 + 0.5 * sin(S.rtime * 6);
    octx.strokeStyle = n ? `rgba(120,210,255,${(0.4 + 0.4 * blink).toFixed(2)})` : `rgba(255,170,70,${(0.4 + 0.5 * blink).toFixed(2)})`;
    octx.lineWidth = 2; octx.setLineDash([4, 4]); groundRing(add(b.pos, mul(b.up, 0.3)), b.rad + 1, 28); octx.setLineDash([]);
    const w = 44;
    octx.fillStyle = 'rgba(0,0,0,.65)'; octx.fillRect(s[0] - w / 2, s[1] + 10, w, 5);
    octx.fillStyle = '#7fd4ff'; octx.fillRect(s[0] - w / 2, s[1] + 10, w * b.built, 5);
    octx.font = '600 11px "Exo 2", sans-serif';
    octx.fillStyle = n ? '#9fdcff' : '#ffb347';
    octx.fillText(n ? `⚒ ${n} · ${Math.floor(b.built * 100)}%` : tr('⚠ нет инженеров', '⚠ no builders', '⚠ không có kỹ sư'), s[0], s[1] + 28);
  }
  // «+N»
  for (const f of S.floaters || []){
    if (!near(f.pos)) continue;
    const k = f.t / f.life;
    const s = project(add(f.pos, mul(norm(f.pos), k * 4))); if (!s) continue;
    octx.globalAlpha = 1 - smoothstep(0.6, 1, k);
    octx.font = `700 ${Math.round(13 * f.size)}px "Exo 2", sans-serif`;
    octx.fillStyle = 'rgba(0,0,0,.6)'; octx.fillText(f.text, s[0] + 1, s[1] + 1);
    octx.fillStyle = f.col; octx.fillText(f.text, s[0], s[1]);
  }
  octx.globalAlpha = 1;
  if (rts){
    // подписи выбранных инженеров: что делают
    const said = new Set();
    for (const b of selBuilders()){
      const s = project(add(b.pos, mul(b.up, 1.8))); if (!s || !facing(b.pos)) continue;
      const key = builderBusy(b) ? b.site : b;
      if (!said.has(key) && S.rts.h < 90){ said.add(key); octx.font = '600 10px "Exo 2", sans-serif'; octx.fillStyle = '#9fdcff'; octx.fillText(builderDoing(b), s[0], s[1] - 6); }
      if (builderBusy(b)){ const q = project(builderTarget(b.site)); if (q){ octx.strokeStyle = 'rgba(127,212,255,.5)'; octx.setLineDash([3, 4]); octx.beginPath(); octx.moveTo(s[0], s[1]); octx.lineTo(q[0], q[1]); octx.stroke(); octx.setLineDash([]); } }
    }
    if (S.place) drawPlaceGhost();
  }
  placeBarUpdate();
}
function builderDoing(b){
  if (b.order === 'build' && b.site) return tr(`строит: ${bname(b.site.type)}`, `building: ${bname(b.site.type)}`, `đang xây: ${bname(b.site.type)}`) + (b.jobs.length ? ` +${b.jobs.length}` : '');
  if (b.order === 'repair' && b.site) return tr('ремонт', 'repairing', 'sửa chữa') + (b.jobs.length ? ` +${b.jobs.length}` : '');
  if (b.order === 'move') return tr('идёт', 'moving', 'di chuyển');
  if (b.order === 'retreat') return tr('отходит', 'falling back', 'rút lui');
  return tr('свободен', 'idle', 'rảnh');
}
function ecoMinimap(mmProject){
  for (const v of veins()){
    const m = mmProject(v.pos), ex = veinExtractor(v);
    octx.fillStyle = ex ? (ex.team === 0 ? '#ffd27a' : (ex.known0 || !SET.fog ? '#ff7a50' : 'rgba(255,210,122,.35)')) : 'rgba(255,210,122,.35)';
    octx.fillRect(m[0] - 1.5, m[1] - 1.5, 3, 3);
  }
  for (const b of S.builders){ if (!b.alive || (b.team === 1 && b.seen[0] <= 0 && SET.fog)) continue; const m = mmProject(b.pos); octx.fillStyle = b.team ? TEAM[1].css : '#7fd4ff'; octx.fillRect(m[0] - 1, m[1] - 1, 2, 2); }
}

// ---------------------------------------------------------------------
//  ПАНЕЛИ: меню стройки (карточка выбранных инженеров), стройка, очередь
// ---------------------------------------------------------------------
function buildBtnHTML(type){
  const B = BTYPES[type], r = rtsReason('build:' + type);
  const tip = (r.ok ? '' : r.reason + (r.fix ? ' — ' + r.fix : '') + '\n') + N2(B.d);
  return `<button class="ab bb ${r.ok ? '' : 'cd'} ${S.place === type ? 'cast' : ''}" data-build="${type}" title="${tip.replace(/"/g, '&quot;')}"><i>${BICON[type] || '■'}</i><b>${bname(type)}</b><span class="bc">${B.cost} · ${B.time}${tr('с', 's', 'g')}</span><kbd>${keyCap(BUILD_KEYS[type])}</kbd>${r.ok ? '' : `<em class="why">${r.reason}</em>`}</button>`;
}
function builderCardHTML(sel){
  const bs = sel.filter(g => g.cls === 'builder');
  if (!bs.length) return '';
  let h = '<div class="bmenu"><div class="bhead">' + tr(`⚒ Инженеры: ${bs.length} · ЛКМ по земле — поставить, Shift — несколько · ПКМ по своему — чинить/помогать`, `⚒ Builders: ${bs.length} · LMB on ground — place, Shift — several · RMB on own — repair/help`, `⚒ Kỹ sư: ${bs.length} · chuột trái — đặt, Shift — nhiều · chuột phải lên công trình — sửa/giúp`) + '</div><div class="abils">';
  for (const k in BTYPES) h += buildBtnHTML(k);
  h += '</div></div>';
  return h;
}
function siteCardHTML(b){
  if (!b || b.cls !== 'bld' || b.team !== 0 || b.done) return '';
  const n = S.builders.filter(x => x.alive && x.site === b && builderBusy(x)).length;
  const left = n ? Math.ceil((1 - b.built) * BTYPES[b.type].time / buildPower(min(n, 4))) : null;
  return `<span>${tr('Строят', 'Builders', 'Đang xây')}: ${n ? '⚒'.repeat(min(n, 6)) + ` · ${tr('ещё', 'ETA', 'còn')} ~${left} ${tr('с', 's', 'giây')}` : `<b style="color:#ffb347;font:600 12px 'Exo 2'">${tr('никто — выдели инженеров и ПКМ по стройке', 'nobody — select builders and RMB the site', 'không ai — chọn kỹ sư và chuột phải vào công trình')}</b>`}</span>` +
         `<div class="abils"><button class="ab" data-cancel="1" title="${tr('Отменить стройку и вернуть руду', 'Cancel and refund', 'Hủy và hoàn quặng')}"><i>✖</i><b>${tr('Отмена', 'Cancel', 'Hủy')} +${BTYPES[b.type].cost}</b><kbd>Del</kbd></button></div>`;
}
function bindBuilderCard(el){
  el.querySelectorAll('[data-build]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); startBuild(b.dataset.build); });
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = e => { e.stopPropagation(); if (cancelSite(S.selB)) emit('ui', { kind: 'ok' }); });
}
// правая панель, вкладка «Здания»: кнопки стройки + видимая очередь работ инженеров
function sidebarBuildTab(list, mk){
  const note = document.createElement('div'); note.className = 'bnote';
  note.innerHTML = tr('Здания строят <b>инженеры</b>: выбери здание → ЛКМ по месту. Пойдёт выделенный или ближайший свободный инженер. <kbd>.</kbd> — свободный инженер.', 'Buildings are built by <b>builders</b>: pick a building → LMB on a spot. The selected or nearest idle builder goes. <kbd>.</kbd> — idle builder.', 'Công trình do <b>kỹ sư</b> xây: chọn công trình → chuột trái lên chỗ đặt. <kbd>.</kbd> — kỹ sư rảnh.');
  list.appendChild(note);
  mk(BICON.builder, pname('builder'), pCost(0, 'builder'), tr('Обучить инженера-строителя в штабе/форпосте', 'Train a builder at the HQ/outpost', 'Huấn luyện kỹ sư'), () => uiProduce('builder'), () => { const r = rtsReason('produce:builder'); return r.ok ? null : r.reason; }, { key: 'builder' });
  for (const k in BTYPES){ const B = BTYPES[k]; mk(BICON[k], bname(k) + ` <kbd>${keyCap(BUILD_KEYS[k])}</kbd>`, B.cost, N2(B.d), () => startBuild(k), () => { const r = rtsReason('build:' + k); return r.ok ? null : r.reason + (r.fix ? ' — ' + r.fix : ''); }); }
  const q = document.createElement('div'); q.className = 'bqueue'; q.id = 'bqueue'; list.appendChild(q);
  updateBuildQueue();
}
function updateBuildQueue(){
  const el = document.getElementById('bqueue'); if (!el) return;
  const bs = teamBuilders(0);
  let h = `<h6>${tr('Работы инженеров', 'Builder jobs', 'Việc của kỹ sư')} · ${bs.length}/${GAME.MAX_BUILDERS}</h6>`;
  const sites = S.buildings.filter(b => b.alive && b.team === 0 && !b.done);
  for (const s of sites){
    const n = S.builders.filter(x => x.alive && x.site === s && builderBusy(x)).length;
    h += `<div class="bj" data-site="${s.id}"><i>${BICON[s.type] || '■'}</i>${bname(s.type)}<em>${n ? '⚒' + n : '⚠'}</em><s style="width:${(s.built * 100).toFixed(0)}%"></s></div>`;
  }
  const idle = bs.filter(b => builderIdle(b)).length, rep = bs.filter(b => b.order === 'repair').length;
  h += `<div class="bj sum">${tr('свободны', 'idle', 'rảnh')}: ${idle} · ${tr('ремонт', 'repair', 'sửa')}: ${rep}</div>`;
  if (el._h === h) return;
  el._h = h; el.innerHTML = h;
  el.querySelectorAll('[data-site]').forEach(d => d.onclick = e => { e.stopPropagation(); const s = S.buildings.find(b => b.id === +d.dataset.site); if (s){ S.sel.clear(); S.selB = s; flyCamTo(s.pos); } });
}

// ---------------------------------------------------------------------
//  ВЕРХНЯЯ ПАНЕЛЬ: руда, доход в минуту; по клику — «Откуда руда / как ускорить»
// ---------------------------------------------------------------------
function ecoHB(T){
  const E = ecoBreakdown(0);
  ecoPopUpdate();
  return `<div class="hb ore" data-eco="1" title="${tr('Откуда руда и как ускорить — клик', 'Where ore comes from — click', 'Quặng từ đâu — nhấp')}"><small>${tr('РУДА', 'ORE', 'QUẶNG')} ⓘ</small><b>${Math.floor(T.ore)}</b><em>+${E.total}/${tr('мин', 'min', 'phút')}</em></div>`;
}
const ECOPOP = { open: false, t: 0 };
function ecoPopHTML(){
  const E = ecoBreakdown(0), T = S.teams[0];
  const row = (icon, name, n, val, note) => `<tr><td>${icon}</td><td>${name}${n !== null ? ` <i>×${n}</i>` : ''}${note ? `<small>${note}</small>` : ''}</td><td>+${val}</td></tr>`;
  const bs = teamBuilders(0).length;
  return `<h4>${tr('Откуда руда', 'Where ore comes from', 'Quặng từ đâu')} <span>+${E.total}/${tr('мин', 'min', 'phút')}</span><button data-close="1">✕</button></h4><table>` +
    row('🏭', tr('Штаб — переработка', 'HQ — refining', 'Sở chỉ huy — tinh luyện'), null, E.hq, tr('идёт всегда, пока цел штаб или форпост', 'always on while the HQ or an outpost stands', 'luôn có khi sở chỉ huy hoặc tiền đồn còn')) +
    row('⛏', tr('Экстракторы на жилах', 'Extractors on veins', 'Máy khai thác'), E.nExt, E.ext, tr(`по +${E.perExt}/мин каждый${E.drill ? ` (бурение ${'I'.repeat(E.drill)})` : ''} — над ними всплывает «+N»`, `+${E.perExt}/min each${E.drill ? ` (drilling ${'I'.repeat(E.drill)})` : ''} — watch the "+N"`, `+${E.perExt}/phút mỗi máy`)) +
    row('◆', tr('Захваченные точки', 'Captured points', 'Điểm đã chiếm'), E.nPts, E.pts, tr(`по +${E.perPt}/мин за точку`, `+${E.perPt}/min per point`, `+${E.perPt}/phút mỗi điểm`)) +
    (E.nCore ? row('✺', tr('Ядро', 'Core', 'Lõi'), null, E.core, '') : '') +
    `</table><p class="ex">${tr('Ещё: обломки уничтоженных врагов, склады первой экспедиции и кристаллы (разбить) дают руду разово.', 'Also: wrecks of destroyed enemies, first-expedition depots and crystals (shoot them) give one-off ore.', 'Thêm: xác địch, kho thám hiểm và tinh thể cho quặng một lần.')}${E.k !== 1 ? tr(` Масштаб боёв: доход ×${E.k.toFixed(1)}.`, ` Battle scale: income ×${E.k.toFixed(1)}.`, ` Quy mô: ×${E.k.toFixed(1)}.`) : ''}</p>` +
    `<h5>${tr('Как ускорить', 'How to speed it up', 'Cách tăng tốc')}</h5><ol>` +
    `<li>${tr(`Инженером (<kbd>.</kbd> — найти, сейчас ${bs}) построй <b>экстрактор</b> <kbd>C</kbd> на светящейся жиле ⛏. Самые безопасные — у базы, ещё по жиле у каждой точки.`, `With a builder (<kbd>.</kbd> to find one, you have ${bs}) build an <b>extractor</b> <kbd>C</kbd> on a glowing ⛏ vein. Safest are at the base, plus one at every point.`, `Dùng kỹ sư xây <b>máy khai thác</b> <kbd>C</kbd> trên mạch quặng ⛏.`)}</li>` +
    `<li>${tr('Захватывай и удерживай точки — каждая даёт доход и открывает свою жилу.', 'Capture and hold points — each pays income and opens its vein.', 'Chiếm và giữ điểm — mỗi điểm cho thu nhập.')}</li>` +
    `<li>${tr('Исследуй «Глубокое бурение» в штабе: +35% к экстракторам за уровень.', 'Research "Deep drilling" at the HQ: +35% extractor output per level.', 'Nghiên cứu “Khoan sâu” ở sở chỉ huy: +35% mỗi cấp.')}</li>` +
    `<li>${tr('Береги инженеров и экстракторы: Рой охотится за ними. Турель рядом с жилой окупается.', 'Protect builders and extractors: the Swarm hunts them. A turret next to a vein pays off.', 'Bảo vệ kỹ sư và máy khai thác: Bầy Đàn săn chúng.')}</li></ol>` +
    `<p class="ex">${tr('Тратится руда на войска, здания, пополнение отрядов (по 18 за бойца) и капсулы.', 'Ore is spent on troops, buildings, squad reinforcements (18 per trooper) and drop pods.', 'Quặng dùng cho quân, công trình, bổ sung quân và khoang thả.')}</p>`;
}
function ecoPopToggle(on){
  ECOPOP.open = on === undefined ? !ECOPOP.open : on;
  if (S.attract || MENU.isOpen()) ECOPOP.open = false;
  let el = document.getElementById('ecoPop');
  if (!el){ el = document.createElement('div'); el.id = 'ecoPop'; document.body.appendChild(el); el.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target.dataset.close) ecoPopToggle(false); }); }
  el.style.display = ECOPOP.open ? 'block' : 'none';
  if (ECOPOP.open){ el.innerHTML = ecoPopHTML(); HINTS.used && HINTS.used('eco'); }
}
function ecoPopUpdate(){
  if (!ECOPOP.open) return;
  if (S.attract || MENU.isOpen() || S.mode !== 'rts' && isLocked()){ ecoPopToggle(false); return; }
  const el = document.getElementById('ecoPop'); if (!el) return;
  const h = ecoPopHTML(); if (el._h !== h){ el._h = h; el.innerHTML = h; }
}
// ---------------------------------------------------------------------
//  ТЕЛЕФОН: тап — место, затем кнопки «Строить» / «Отмена»
// ---------------------------------------------------------------------
function placeBarUpdate(){
  // кнопка «⚒ Инженер» в сенсорной панели стратегии (выбрать свободного инженера)
  if (TOUCH.on && !placeBarUpdate.btn){
    const box = document.querySelector('#touch .tf.rts');
    if (box){
      const b = document.createElement('button'); b.className = 'wide'; b.dataset.t = 'builder'; b.textContent = '⚒ ' + tr('Инженер', 'Builder', 'Kỹ sư');
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); selectIdleBuilder(); }, { passive: false });
      box.appendChild(b); placeBarUpdate.btn = b;
    }
  }
  const show = S.place && S.mode === 'rts' && !S.attract && (TOUCH.on || S.placeAt);
  if (document.body.classList.contains('placing') !== !!show) document.body.classList.toggle('placing', !!show);
  let el = document.getElementById('placeBar');
  if (!show){ if (el && el.style.display !== 'none') el.style.display = 'none'; return; }
  if (!el){
    el = document.createElement('div'); el.id = 'placeBar'; document.body.appendChild(el);
    const go = e => { e.preventDefault(); e.stopPropagation(); AU.init();
      const a = e.target.closest('button'); if (!a) return;
      if (a.dataset.pb === 'ok'){
        if (!S.placeAt){ feed(tr('Сначала тапни место на земле', 'Tap a spot on the ground first', 'Chạm chỗ trên mặt đất trước'), '#f88'); return; }
        const why = playerPlace(S.place, norm(S.placeAt), false);
        if (why){ feed(why, '#f88'); emit('ui', { kind: 'deny' }); return; }
        feed(tr(`Стройка: ${bname(S.place)} — инженер в пути`, `Construction: ${bname(S.place)} — builder on the way`, `Xây dựng: ${bname(S.place)} — kỹ sư đang tới`), TEAM[0].css); emit('ui', { kind: 'ok' }); HINTS.used('build');
        S.place = null; S.placeAt = null;
      } else { S.place = null; S.placeAt = null; }
    };
    el.addEventListener('touchstart', go, { passive: false });
    el.addEventListener('mousedown', go);
  }
  const dir = placeTarget();
  const why = !S.placeAt ? tr('тапни место', 'tap a spot', 'chạm chỗ') : (canBuild(0, S.place) || (dir && siteProblem(0, S.place, dir)));
  const h = `<span>${BICON[S.place] || ''} ${bname(S.place)}${why ? ' — ' + why : ''}</span><button data-pb="ok" class="${why ? 'off' : ''}">✔ ${tr('Строить', 'Build', 'Xây')}</button><button data-pb="no">✖ ${tr('Отмена', 'Cancel', 'Hủy')}</button>`;
  if (el._h !== h){ el._h = h; el.innerHTML = h; }
  el.style.display = 'flex';
}
// стили (свои, чтобы не трогать head.html)
(function ecoCSS(){
  const st = document.createElement('style');
  st.textContent = `
  .hb.ore{pointer-events:auto;cursor:pointer} .hb.ore:hover{border-color:var(--amber)} .hb.ore small{color:#ffd27a}
  #ecoPop{position:fixed;left:12px;top:64px;z-index:16;display:none;width:min(430px,92vw);background:rgba(12,13,14,.94);border:1px solid var(--line);border-left:3px solid #ffd27a;padding:8px 12px;font-size:12px;color:#d8cfb4;pointer-events:auto}
  #ecoPop h4{margin:0 0 4px;font:400 15px "Russo One";color:#ffd27a;display:flex;gap:8px;align-items:center} #ecoPop h4 span{color:#fff;font-size:13px} #ecoPop h4 button{margin-left:auto;background:none;border:1px solid var(--line);color:#ccc;cursor:pointer}
  #ecoPop h5{margin:6px 0 2px;font:600 11px "Exo 2";letter-spacing:.14em;color:var(--sand2);text-transform:uppercase}
  #ecoPop table{width:100%;border-collapse:collapse} #ecoPop td{padding:2px 4px;vertical-align:top} #ecoPop td:last-child{text-align:right;color:#8fffaa;font-weight:700;white-space:nowrap}
  #ecoPop td small{display:block;color:#9a937e;font-size:10px} #ecoPop td i{font-style:normal;color:#ffd27a}
  #ecoPop ol{margin:2px 0;padding-left:18px} #ecoPop li{margin:2px 0} #ecoPop .ex{margin:4px 0;color:#9a937e;font-size:11px}
  #card .bmenu{display:flex;flex-direction:column;align-items:center;gap:3px} #card .bhead{font-size:11px;color:#9fdcff;text-shadow:0 0 3px #000}
  #card .ab.bb{width:92px;height:62px} #card .ab.bb .bc{display:block;font-size:10px;color:#ffd27a}
  #card .ab.bb em.why{left:0;right:0;top:auto;bottom:1px;font-size:9px;color:#ffb0a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #side .bnote{grid-column:1/-1;font-size:11px;line-height:1.35;color:#cfc6ad;padding:2px 2px 4px} #side .bnote b{color:#9fdcff}
  #side .bqueue{grid-column:1/-1;margin-top:4px;font-size:11px} #side .bqueue h6{margin:2px 0 3px;font:600 10px "Exo 2";letter-spacing:.12em;color:var(--sand2);text-transform:uppercase}
  #side .bj{position:relative;display:flex;gap:6px;align-items:center;background:rgba(40,38,30,.5);border:1px solid var(--line);padding:3px 6px 5px;margin-bottom:3px;cursor:pointer;overflow:hidden}
  #side .bj i{font-style:normal;color:var(--sand)} #side .bj em{margin-left:auto;font-style:normal;color:#9fdcff} #side .bj s{position:absolute;left:0;bottom:0;height:3px;background:#7fd4ff}
  #side .bj.sum{cursor:default;color:#9a937e}
  #placeBar{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:17;display:none;gap:8px;align-items:center;background:rgba(12,13,14,.9);border:1px solid var(--line);padding:6px 10px;font:600 13px "Exo 2";color:#e8dcb8}
  #placeBar button{pointer-events:auto;font:700 15px "Exo 2";padding:10px 16px;border-radius:6px;border:1.5px solid rgba(143,255,170,.7);background:rgba(40,90,50,.6);color:#eaffef}
  #placeBar button[data-pb=no]{border-color:rgba(255,120,90,.7);background:rgba(110,40,30,.6);color:#ffe0d8} #placeBar button.off{opacity:.45}
  body.touch #ecoPop{top:40px;font-size:11px} body.touch #placeBar{bottom:10px}
  body.touch.placing #card{display:none !important}
  body.touch #card .ab.bb{width:66px;height:48px} body.touch #card .ab.bb .bc{font-size:9px} body.touch #card .bhead{display:none}`;
  document.head.appendChild(st);
  document.addEventListener('pointerdown', e => { const t = e.target.closest && e.target.closest('.hb.ore'); if (t){ e.stopPropagation(); ecoPopToggle(); } }, true);
})();
