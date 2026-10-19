// =====================================================================
//  НОВАЯ ТЕХНИКА v6 (ветка units). Три вида машин, у фракций — разные модели и оружие:
//    raider — Консорциум: ракетный багги «Шакал» (4 НУР залпом + пулемёт);
//             Рой: ховер-байк «Оса» (то же оружие, быстрее, хрупче).
//    mlrs   — Консорциум: РСЗО «Град» (3 крупные полусамонаводящиеся ракеты);
//             Рой: «Улей» (6 мелких ракет, разброс сильнее).
//    cat    — Консорциум: миномётный краулер «Молот» (одна тяжёлая мина навесом);
//             Рой: бомбомёт-катапульта «Требушет» (кассета из 5 бомбочек).
//  Все — класс 'tank' с полем vk: группы, приказы, выделение, вселение, цели,
//  ветеранство и сохранение работают как у танка. Модели — sdVeh2() в scene.glsl
//  (тип объекта 5, вариант 1..3 + дробная часть — подъём пусковой / положение рычага).
// =====================================================================
const VK = {
  raider: { i: 1, icon: '➤', n: [['«Шакал»', '"Jackal"', '“Jackal”'], ['«Оса»', '"Wasp"', '“Wasp”']],
            cls: [['Рейдер', 'Raider', 'Raider'], ['Ховер-байк', 'Hoverbike', 'Hoverbike']],
            hp: [400, 340], walk: [15, 17], turn: 2.4, rad: 1.1, hitR: 1.8, armor: 'light', vis: 70,
            bcY: 1.2, br: 3.1, sr: 1.2, camB: 7.5, camH: 2.7, reload: 4.6, rmax: 85 },
  mlrs:   { i: 2, icon: '⁂', n: [['«Град»', '"Grad"', '“Grad”'], ['«Улей»', '"Hive"', '“Hive”']],
            cls: [['РСЗО', 'MLRS', 'MLRS'], ['Рой-ракетница', 'Swarm launcher', 'Swarm launcher']],
            hp: [560, 500], walk: [8, 8.5], turn: 1.4, rad: 1.4, hitR: 2.3, armor: 'light', vis: 55,
            bcY: 1.6, br: 3.9, sr: 1.5, camB: 12, camH: 6, reload: 9, rmin: 35, rmax: 160, safe: 9 },
  cat:    { i: 3, icon: '⌓', n: [['«Молот»', '"Hammer"', '“Hammer”'], ['«Требушет»', '"Trebuchet"', '“Trebuchet”']],
            cls: [['Миномёт', 'Mortar', 'Mortar'], ['Катапульта', 'Catapult', 'Catapult']],
            hp: [620, 560], walk: [6.5, 7.2], turn: 1.2, rad: 1.4, hitR: 2.2, armor: 'medium', vis: 45,
            bcY: 1.7, br: 3.7, sr: 1.5, camB: 12, camH: 6.5, reload: [4.6, 6.5], rmin: [30, 20], rmax: 115, safe: 8 },
};
function vkv(x, team){ return Array.isArray(x) ? x[team ? 1 : 0] : x; }
// броня лёгкой и средней техники (к таблице ARMOR из game.js)
ARMOR.light  = { b: 0.6,  m: 0.75,  r: 1.15, s: 1.1, f: 0.5, g: 0.9,  a: 1, l: 1,   x: 1 };
ARMOR.medium = { b: 0.3,  m: 0.55, r: 1.05, s: 1,   f: 0.4, g: 0.75, a: 1, l: 0.9, x: 1 };
// производство: мехзавод. Миномёт и РСЗО открываются по времени боя (середина партии)
Object.assign(PRODUCTS, {
  raider: { n: ['Рейдер «Шакал»', 'Raider "Jackal"', 'Raider "Jackal"'], cost: 120, time: 12, at: ['factory'], icon: '➤', vk: 'raider',
            d: ['Быстрый багги: залп из 4 ракет и пулемёт. Охотится на строителей и добытчиков, обходит с флангов. Хрупкий.', 'Fast buggy: a 4-rocket salvo and an MG. Hunts builders and harvesters, flanks. Fragile.'] },
  cat:    { n: ['Миномёт «Молот»', 'Mortar "Hammer"', 'Mortar "Hammer"'], cost: 220, time: 22, at: ['factory'], icon: '⌓', vk: 'cat', unlock: 300,
            d: ['Гусеничный миномёт: тяжёлая мина навесом через укрытия, гроза пехоты. Мёртвая зона 30 м, нужна разведка.', 'Tracked mortar: a heavy shell lobbed over cover, bane of infantry. 30 m dead zone, needs spotting.'] },
  mlrs:   { n: ['РСЗО «Град»', 'MLRS "Grad"', 'MLRS "Grad"'], cost: 260, time: 26, at: ['factory'], icon: '⁂', vk: 'mlrs', unlock: 420,
            d: ['Залп из 3 неточно самонаводящихся ракет на 160 м. Мёртвая зона 35 м, долгая перезарядка.', 'Salvo of 3 loosely homing rockets out to 160 m. 35 m dead zone, long reload.'] },
});
// способности (клавиши как у танка: R — основная, F — вторая, G — рывок)
const V2_ABIL = {
  v2hunt:  { who: 'raider', key: 'KeyR', cd: 30, target: 'none', icon: '⌖', n: ['Охота', 'Hunt', 'Săn'],
             d: ['Минуту рейдер сам ищет вражеских строителей, добытчиков и одиночек.', 'For a minute the raider hunts enemy builders, harvesters and stragglers.', 'For a minute the raider hunts enemy builders, harvesters and stragglers.'] },
  v2nitro: { who: 'raider', key: 'KeyG', cd: 16, target: 'none', icon: '»', n: ['Нитро', 'Nitro', 'Nitro'],
             d: ['Рывок: скорость ×1.8 на 4 секунды.', 'Dash: speed ×1.8 for 4 seconds.', 'Dash: speed ×1.8 for 4 seconds.'] },
  v2salvo: { who: 'mlrs', key: 'KeyR', cd: 1, range: 160, target: 'point', icon: '⁂', n: ['Огонь по площади', 'Attack ground', 'Attack ground'],
             d: ['Залпы по точке в течение 20 секунд (дальность 35–160 м).', 'Salvos at a point for 20 seconds (range 35–160 m).', 'Salvos at a point for 20 seconds (range 35–160 m).'] },
  v2smoke: { who: 'mlrs', key: 'KeyF', cd: 40, range: 160, target: 'point', icon: '☁', n: ['Дымовой залп', 'Smoke salvo', 'Smoke salvo'],
             d: ['Три дымовые ракеты: завеса режет прямую видимость на 14 с.', 'Three smoke rockets: a screen that blocks line of sight for 14 s.', 'Three smoke rockets: a screen that blocks line of sight for 14 s.'] },
  v2lob:   { who: 'cat', key: 'KeyR', cd: 1, range: 115, target: 'point', icon: '⌓', n: ['Огонь по площади', 'Attack ground', 'Attack ground'],
             d: ['Огонь навесом по точке в течение 20 секунд (дальность до 115 м).', 'Lobbed fire at a point for 20 seconds (range up to 115 m).', 'Lobbed fire at a point for 20 seconds (range up to 115 m).'] },
  v2flare: { who: 'cat', key: 'KeyF', cd: 30, range: 125, target: 'point', icon: '✧', n: ['Осветительная бомба', 'Flare bomb', 'Flare bomb'],
             d: ['«Люстра» над точкой: 14 с видно всех врагов в радиусе 45 м.', 'A flare over the point: reveals all enemies within 45 m for 14 s.', 'A flare over the point: reveals all enemies within 45 m for 14 s.'] },
};
Object.assign(ABIL, V2_ABIL);
const ECO_TYPES = new Set(['extractor', 'refinery', 'mine', 'harvester', 'drill', 'derrick', 'silo', 'collector', 'pump']);
function isEcoTarget(e){ return e.cls === 'builder' || e.cls === 'harvester' || (e.cls === 'bld' && (ECO_TYPES.has(e.type) || (BTYPES[e.type] && BTYPES[e.type].eco))); }

const V2 = {
  arcs: new WeakMap(),
  K(e){ return VK[e.vk]; },
  name(e){ return N2(VK[e.vk].n[e.team ? 1 : 0]); },
  cname(vk, team){ return N2(VK[vk].cls[team ? 1 : 0]); },
  label(e){ return V2.cname(e.vk, e.team) + ' ' + e.serial; },
  reload(v){ return vkv(VK[v.vk].reload, v.team) * (v.team === 1 ? 0.95 : 1); },
  rmin(v){ return vkv(VK[v.vk].rmin || 0, v.team); },
  limit(vk){ const k = GAME.MAX_TANKS / 6; return Math.max(1, Math.round((vk === 'raider' ? 4 : 2) * k)); },
  // ---------------- создание
  make(pos, team, vk){
    const KK = VK[vk];
    const e = makeTank(pos, team);
    TANK_SERIAL[team]--;                       // номера танков не тратим
    const T = S.teams[team]; T.v2ser = T.v2ser || {};
    T.v2ser[vk] = (T.v2ser[vk] || 0) + 1;
    Object.assign(e, { vk, rad: KK.rad, hitR: KK.hitR, armor: KK.armor, visR: KK.vis, hp: KK.hp[team], maxhp: KK.hp[team], walk: KK.walk[team],
                       serial: T.v2ser[vk], cd: 1 + random(), load: 0.5, salvoN: 0, salvoT: 0, elev: 0.3, arm: 0, loaded: true, fireAt: null, swingT: 9 });
    return e;
  },
  spawnAt(site, key){
    const t = site.team, vk = PRODUCTS[key].vk;
    let dir = norm(add(site.pos, mul(site.fwd, 13)));
    for (let k = 0; k < 12; k++){
      const p = surfacePoint(dir, 1.5);
      if (!bldAt(p, 3) && !inShaft(p) && !propAt(p, 3)) break;
      dir = norm(add(site.pos, add(mul(site.fwd, 13 + k * 2), mul(site.R, (k % 2 ? 1 : -1) * k * 2))));
    }
    const e = V2.make(surfacePoint(dir, 1.5), t, vk);
    e.fwd = tangent(site.fwd, e.up); e.aim = e.fwd;
    if (t === 0 && !S.attract){ feed(tr(`${groupLabel(e)} ${V2.name(e)} готов`, `${groupLabel(e)} ${V2.name(e)} ready`, `${groupLabel(e)} ${V2.name(e)} ready`), TEAM[0].css); emit('radio', { text: tr(`${V2.cname(vk, 0)} готов к бою`, `${V2.cname(vk, 0)} ready for combat`, `${V2.cname(vk, 0)} ready for combat`), pri: 0 }); }
    return e;
  },
  count(team, vk){ return S.vehicles.filter(v => v.alive && v.team === team && v.vk === vk).length; },
  // дополнительные условия производства (вызывается из canProduce)
  canProduce(team, key){
    const P = PRODUCTS[key]; if (!P || !P.vk) return null;
    if (P.unlock && S.time < P.unlock) return tr(`Откроется на ${fmtTime(P.unlock)} боя`, `Unlocks at ${fmtTime(P.unlock)} of battle`, `Unlocks at ${fmtTime(P.unlock)}`);
    if (countProduct(team, key) >= V2.limit(P.vk)) return tr(`Лимит: ${V2.limit(P.vk)}`, `Limit: ${V2.limit(P.vk)}`, `Limit: ${V2.limit(P.vk)}`);
    return null;
  },
  // ---------------- оружие
  muzzle(v, k){
    const up = v.up, side = norm(cross(v.aim, up));
    if (v.vk === 'raider') return add(add(add(v.pos, mul(up, 0.75)), mul(tangent(v.fwd, up), -0.95)), add(mul(v.aim, 0.9), mul(side, (k % 2 ? 0.15 : -0.15))));
    if (v.vk === 'mlrs'){ const f = tangent(v.aim, up); return add(add(add(v.pos, mul(up, 1.6 + v.elev * 1.2)), mul(f, 0.2)), mul(side, (k - 1) * 0.48)); }
    return add(add(v.pos, mul(up, 3.0)), mul(tangent(v.aim, up), 0.6));
  },
  rocketR(v, aimPt, k, te){      // рейдер: неуправляемая ракета с неконтактным взрывателем
    const m = V2.muzzle(v, k);
    const dir = aimPt ? norm(sub(aimPt, m)) : v.aim;
    fire(m, dir, v.team, v === ctrlEntity() ? 0.012 : 0.022 * (v.team === 1 ? DK().acc : 1), 60, 78, v, 'r', { splash: 2.8, boom: 1.1, v2: 'rk', te: te && te.alive && te.cls !== 'hq' ? te : null });
    addLight(m, [8, 5, 2], 10, 0.08, 0.008);
    S.fx.length < 76 && S.fx.push({ type: 'smoke', pos: sub(m, mul(dir, 1.2)), vel: mul(dir, -1.5), r0: 0.4, r1: 1.6, life: 1.6, t: 0, grey: 0.4, dens: 0.9, heat: 0.3 });
    emit('v2', { k: 'rk', pos: m, src: v });
  },
  rocketG(v, tp, te, k, smoke){   // РСЗО: ракета с неточным наведением
    const m = V2.muzzle(v, k), up = v.up;
    const flat = tangent(sub(tp, v.pos), up);
    const dir = norm(add(add(mul(flat, 0.58), mul(up, 0.81)), mul(randUnit(), 0.06)));
    const d = dist(tp, v.pos), hive = v.team === 1 && !smoke;   // «Улей» Роя: 6 мелких ракет, разброс сильнее
    const spr = V2.spread(v, d, smoke);
    const off = mul(tangent(randUnit(), norm(tp)), spr * sqrt(random()));
    S.proj.push({ pos: m, org: m, vel: mul(dir, 24), team: v.team, life: 10, dmg: smoke ? 8 : hive ? 42 : 80, splash: smoke ? 2 : hive ? 4.6 : 5.5, from: v, type: 'r',
                  v2: smoke ? 'sm' : 'g', tp, te: te || null, off, t: 0, boom: smoke ? 0.8 : hive ? 1.2 : 1.9, ptype: 'a' });
    addLight(m, [12, 7, 3], 16, 0.12, 0.015);
    for (let i = 0; i < 2; i++) S.fx.length < 76 && S.fx.push({ type: 'smoke', pos: add(m, mul(randUnit(), 0.6)), vel: add(mul(dir, -2), mul(randUnit(), 1)), r0: 0.7, r1: 2.6, life: 2.6, t: 0, grey: 0.45, dens: 1.1, heat: 0.5 });
    burst(m, 4, 5);
    emit('v2', { k: 'salvo', pos: m, src: v });
    if (v === ctrlEntity()) S.shake = max(S.shake, 0.25);
  },
  spread(v, d, smoke){ return smoke ? 3 : v.team === 1 ? 3 + d * 0.035 : 2.5 + d * 0.035; },
  lobT(v, D){ return v.team === 0 ? 3 + D / 45 : 2.4 + D / 32; },
  // навесная траектория с поправкой на кривизну метеорита: тяжесть всегда к центру, поэтому
  // простая парабола промахивается на 5–8 м — уточняем точку прицеливания двумя прогонами
  lobPath(m, tp, T, wantPts){
    const D = dist(m, tp);
    let aim = tp, v0 = null, pts = null;
    for (let it = 0; it < 3; it++){
      v0 = ballistic(m, aim, D / T, T, T);
      let p = m, v = v0, best = 1e9, bp = m;
      const h = 1 / 30, P = [];
      for (let t = 0; t < T + 2; t += h){
        v = add(v, mul(norm(p), -gAt(len(p)) * h)); p = add(p, mul(v, h));
        const d = dist(p, tp); if (d < best){ best = d; bp = p; }
        if (wantPts && it === 2 && floor(t / h) % 6 === 0) P.push(p);
        if (d > best + 3) break;
      }
      if (it < 2) aim = add(aim, sub(tp, bp)); else pts = P;
    }
    return { v0, pts };
  },
  lob(v, tp, flare){             // миномёт: тяжёлая мина; катапульта Роя: кассета; обе — «люстра»
    const m = V2.muzzle(v, 0), mortar = v.team === 0;
    tp = flare ? tp : add(tp, mul(tangent(randUnit(), norm(tp)), (mortar ? 2.5 : 1.5) * sqrt(random())));   // рассеивание
    const D = dist(m, tp), T = V2.lobT(v, D);
    const vel = V2.lobPath(m, tp, T).v0;
    if (flare) S.proj.push({ pos: m, org: m, vel, team: v.team, life: T + 3, dmg: 5, splash: 1, from: v, type: 'g', v2: 'fl', tp, t: 0, T, boom: 0.6 });
    else if (mortar) S.proj.push({ pos: m, org: m, vel, team: v.team, life: T + 3, dmg: 95, splash: 6, from: v, type: 'g', v2: 'm', tp, t: 0, T, boom: 2.0, ptype: 'g' });
    else S.proj.push({ pos: m, org: m, vel, team: v.team, life: T + 3, dmg: 60, splash: 4, from: v, type: 'g', v2: 'c', tp, t: 0, T, boom: 1.3 });
    if (mortar){ addLight(m, [12, 8, 3], 16, 0.1, 0.015); addWave(m, 1.0, 0.3); for (let i = 0; i < 2; i++) S.fx.length < 76 && S.fx.push({ type: 'smoke', pos: add(m, mul(randUnit(), 0.4)), vel: add(mul(v.up, 2), mul(randUnit(), 0.6)), r0: 0.5, r1: 2.2, life: 2.4, t: 0, grey: 0.4, dens: 1.1, heat: 0.5 }); burst(m, 5, 5); }
    emit('v2', { k: mortar ? 'mortar' : 'lob', pos: m, src: v });
    v.swingT = 0;
    if (v === ctrlEntity()) S.shake = max(S.shake, 0.3);
  },
  // ---------------- полёт: наведение ракет РСЗО, раскрытие кассет, «люстры»
  guide(p, dt, quiet){
    p.t += dt;
    const up = norm(p.pos);
    p.vel = add(p.vel, mul(up, gAt(len(p.pos)) * dt * 0.3));   // компенсируем падение ракет из общего цикла
    const T = add(p.te && p.te.alive ? centerOf(p.te) : p.tp, p.off);
    const upT = norm(T), toT = sub(T, p.pos);
    const hd = len(sub(toT, mul(upT, dot(toT, upT))));
    const A = hd > 18 ? add(T, mul(upT, min(hd * 0.5, 60))) : T;
    let want = norm(sub(A, p.pos));
    if (!quiet) want = norm(add(want, mul(randUnit(), 0.14)));   // рыскание: «примерно» самонаводящиеся
    const rate = p.t < 0.35 ? 0.4 : hd < 30 ? 3.0 : 1.5;
    const sp = min(62, len(p.vel) + 45 * dt);
    p.vel = mul(turnToward(norm(p.vel), want, rate * dt), sp);
    return { T, d: len(toT), hd };
  },
  projStep(dt){
    const cam = S.cam ? S.cam.pos : null;
    for (const p of S.proj){
      if (!p.v2 || p.life <= 0) continue;
      if (p.v2 === 'rk'){
        if (p.te && p.te.alive){ const c = p.te.cls === 'bld' ? bldCenter(p.te) : centerOf(p.te), r = hitRadius(p.te) + 1.0; if (dist2(p.pos, c) < r * r) p.fuse = 0.0001; }
        if (random() < 0.6) S.sparks.push({ pos: p.pos, vel: add(mul(p.vel, -0.12), mul(randUnit(), 1.5)), life: 0.15 });
      } else if (p.v2 === 'g' || p.v2 === 'sm'){
        const g = V2.guide(p, dt);
        const back = sub(p.pos, mul(norm(p.vel), 0.9));
        if (random() < 0.8) S.sparks.push({ pos: back, vel: add(mul(p.vel, -0.15), mul(randUnit(), 2)), life: 0.18 + random() * 0.1 });
        p.puff = (p.puff || 0) - dt;
        if (p.puff <= 0 && S.fx.length < 72){ p.puff = 0.09; S.fx.push({ type: 'smoke', pos: back, vel: mul(randUnit(), 0.3), r0: 0.35, r1: 1.4, life: 1.6, t: 0, grey: 0.5, dens: 0.7, heat: 0.15 }); }
        if (cam && !p.whiz && p.team === 1 && dist2(p.pos, cam) < 1600 && dot(p.vel, sub(cam, p.pos)) > 0){ p.whiz = 1; emit('v2', { k: 'in', pos: p.pos }); }
        if (p.v2 === 'sm'){
          if (g.d < 6 || (g.hd < 8 && altitude(p.pos) < altitude(g.T) + 5)){ V2.smokeBurst(add(g.T, mul(norm(g.T), 2)), p.team); p.life = -1; }
        } else if (g.d < 2.2) p.fuse = 0.0001;   // неконтактный взрыватель
      } else if (p.v2 === 'm'){
        if (random() < 0.6) S.sparks.push({ pos: p.pos, vel: add(mul(p.vel, -0.1), mul(randUnit(), 1)), life: 0.2 });
        if (cam && !p.whiz && p.team === 1 && dist2(p.pos, cam) < 900 && dot(p.vel, norm(p.pos)) < 0){ p.whiz = 1; emit('v2', { k: 'in', pos: p.pos }); }
      } else if (p.v2 === 'c' || p.v2 === 'fl'){
        p.t += dt;
        const up = norm(p.pos), vr = dot(p.vel, up);
        if (random() < 0.5) S.sparks.push({ pos: p.pos, vel: mul(randUnit(), 1.2), life: 0.15 });
        if (vr < 0){
          const h = len(p.pos) - groundR(up);
          if (p.v2 === 'c' && (h < 7 || p.t > p.T - 0.5)){ V2.split(p); p.life = -1; }
          else if (p.v2 === 'fl' && h < 30){ V2.flareAt(p.pos, p.team); p.life = -1; }
        }
      }
    }
    // висящие «люстры»
    const F = S.v2fl || (S.v2fl = []);
    for (let i = F.length - 1; i >= 0; i--){
      const f = F[i]; f.t += dt;
      if (f.t > f.life){ F.splice(i, 1); continue; }
      f.pos = add(f.pos, mul(norm(f.pos), -1.1 * dt));
      const k = 1 - smoothstep(f.life - 2, f.life, f.t);
      addLight(f.pos, [7 * k, 6 * k, 4.2 * k], 70, 0.05, 0.012);
      if (random() < dt * 12) S.sparks.push({ pos: f.pos, vel: add(mul(norm(f.pos), -2), mul(randUnit(), 1.5)), life: 0.5, big: 1 });
    }
  },
  split(p){
    const up = norm(p.pos);
    for (let k = 0; k < 5; k++){
      const a = k * PI * 0.4 + random() * 0.7, t1 = anyTangent(up), t2 = cross(up, t1);
      const side = add(mul(t1, cos(a)), mul(t2, sin(a)));
      S.proj.push({ pos: p.pos, org: p.pos, vel: add(add(mul(p.vel, 0.9), mul(side, 2.6 + random() * 1.6)), mul(up, 1.2)), team: p.team, life: 3, dmg: 42, splash: 3.3,
                    from: p.from, type: 'g', boom: 0.9, ptype: 'g' });
    }
    burst(p.pos, 8, 6);
    addLight(p.pos, [6, 4, 2], 10, 0.1, 0.01);
    S.fx.length < 76 && S.fx.push({ type: 'smoke', pos: p.pos, vel: mul(up, 0.4), r0: 0.5, r1: 2, life: 2, t: 0, grey: 0.35, dens: 1, heat: 0.4 });
    emit('v2', { k: 'pop', pos: p.pos });
  },
  smokeBurst(c, team){
    SCREENS.push({ pos: c, r: 9, t: 0, life: 14 });
    for (let i = 0; i < 4; i++) S.fx.push({ type: 'smoke', pos: add(c, mul(randUnit(), 3.5)), vel: mul(randUnit(), 0.5), r0: 2.5, r1: 6.5, life: 12 + random() * 3, t: 0, grey: 0.5, dens: 2.2, heat: 0 });
    if (S.fx.length > 80) S.fx.splice(0, S.fx.length - 80);
    burst(c, 6, 4);
    emit('v2', { k: 'pop', pos: c });
  },
  flareAt(pos, team){
    const F = S.v2fl || (S.v2fl = []);
    F.push({ pos, t: 0, life: 14, team });
    const g = surfacePoint(norm(pos), 0.5);
    S.scans.push({ team, pos: g, t: 0, life: 14, r: 45 });
    burst(pos, 10, 5);
    emit('v2', { k: 'flare', pos });
  },
  // ---------------- ИИ: вождение (как у танка: обход шахт и обломков, выход из застревания)
  steer(v, goal, dt, arrive){
    const Up = norm(v.pos);
    const vv = sub(goal, v.pos), t = sub(vv, mul(Up, dot(vv, Up))), dd = len(t);
    if (dd <= arrive) return null;
    let w = norm(t);
    if (v.evadeT > 0){ v.evadeT -= dt; w = norm(add(mul(cross(Up, w), v.evadeS || 1), mul(w, -0.3))); }
    for (const a of AXES){
      const m = mul(a, RM), dm = surfDist(v.pos, m);
      if (dm < 30){ const away = tangent(sub(v.pos, m), Up); w = norm(add(w, mul(away, (30 - dm) / 30 * 2.5))); }
    }
    for (const p of PROPS){
      if (!p.alive) continue;
      const dm = dist(v.pos, p.pos);
      if (dm < p.bound + 6){ const away = tangent(sub(v.pos, p.pos), Up); w = norm(add(w, mul(away, 1.2))); }
    }
    for (const b of S.buildings){
      if (!b.alive || dist2(b.pos, v.pos) > (b.rad + 9) * (b.rad + 9)) continue;
      const away = tangent(sub(v.pos, b.pos), Up); w = norm(add(w, mul(away, 1.0)));
    }
    const vt = len(sub(v.vel, mul(Up, dot(v.vel, Up))));
    if (vt < 0.6) v.stuckT = (v.stuckT || 0) + dt; else v.stuckT = max(0, (v.stuckT || 0) - dt);
    if (v.stuckT > 2){ v.stuckT = 0; v.evadeT = 1.6; v.evadeS = random() < 0.5 ? 1 : -1; }
    return { w, d: dd };
  },
  // машина едет корпусом вперёд (как автомобиль), а не боком
  drive(v, inp, w, dt, speed){
    const Up = norm(v.pos), f = tangent(v.fwd, Up);
    v.fwd = tangent(turnToward(f, w, VK[v.vk].turn * dt), Up);
    const al = dot(tangent(v.fwd, Up), w);
    inp.wish = mul(tangent(v.fwd, Up), clamp(al, al < -0.2 ? -0.6 : 0.15, 1) * (speed || 1));
  },
  aiInput(v, dt){
    const Up = norm(v.pos);
    const inp = { wish: [0, 0, 0], speedMul: 1, jump: false, thrust: false, thrustDir: Up, lift: false };
    if (len(v.pos) < RM - 12){   // упал в шахту — эвакуация
      v.underT = (v.underT || 0) + dt; inp.lift = true;
      if (v.underT > 8){ v.pos = surfacePoint(stepToward(norm(v.pos), anyTangent(norm(v.pos)), 40 / RM), 1.5); v.vel = [0, 0, 0]; v.underT = 0; }
      return inp;
    }
    v.think -= dt;
    const art = v.vk !== 'raider';
    if (v.think <= 0){
      v.think = 0.45 + random() * 0.2;
      v.target = art ? V2.artyTarget(v) : findTarget(v, v.team, add(v.pos, mul(v.up, 1)), { range: 85, structures: true, prefer: 'builder', focus: v.focus });
      if (!art && v.target && v.target.cls === 'hq') v.target = null;
      V2.aiAbil(v);
    }
    const goal = art ? V2.artyGoal(v) : V2.raiderGoal(v);
    if (goal){
      const s = V2.steer(v, goal.p, dt, goal.arrive || 6);
      if (s) V2.drive(v, inp, s.w, dt, goal.slow ? 0.6 : 1);
    }
    return V2.grip(v, inp);
  },
  manual(v){ return v.manualUntil > S.time; },
  home(v){ const h = builderHome(v.team); return h || mul(BASES[v.team], RM); },
  raiderGoal(v){
    // ремонт: отходим, восстанавливаемся (регенерация вне боя) и возвращаемся
    if (v.hp < v.maxhp * 0.35 && !(v.manualUntil > S.time)) v.retreat = true;
    if (v.retreat && v.hp > v.maxhp * 0.85) v.retreat = false;
    if (v.retreat) return { p: V2.home(v), arrive: 25 };
    if (v.focus && v.focus.alive) return { p: centerOf(v.focus), arrive: 25 };
    const hunt = v.huntUntil > S.time;
    if (!hunt && (v.manualUntil > S.time || v.order === 'defend' || v.order === 'escort')){ const g = groupGoal(v); return g ? { p: g, arrive: 8 } : null; }
    // цель рядом и по зубам (не обычный танк, не турель при малом запасе брони) — кружим вокруг неё и стреляем
    const tg = v.target;
    const crowd = e => e.cls === 'inf' && TGT[v.team].filter(o => o !== e && o.alive && o.cls === 'inf' && dist2(o.pos, e.pos) < 225).length >= 2;   // полный отряд — не одиночка
    if (tg && tg.alive && tg.cls !== 'hq' && !(tg.cls === 'tank' && !tg.vk) && !crowd(tg) && !(tg.cls === 'bld' && (tg.type === 'turret' || tg.type === 'aa') && v.hp < v.maxhp * 0.6)){
      const c = centerOf(tg), d = dist(c, v.pos);
      if (d < 70){ const Up = norm(c), away = tangent(sub(v.pos, c), Up), side = norm(cross(Up, away)); return { p: add(c, add(mul(side, 20 * (v.id % 2 ? 1 : -1)), mul(away, 14))), arrive: 3 }; }
    }
    // охота: строители, добытчики, одиночки вдали от турелей и танков
    v.preyT = (v.preyT || 0) - 0.5;
    if (!v.prey || !v.prey.alive || S.time > (v.preyUntil || 0)){ v.prey = V2.findPrey(v); v.preyUntil = S.time + 4; }
    const pr = v.prey;
    if (pr){
      const c = centerOf(pr), d = dist(c, v.pos);
      if (d < 30){   // кружим вокруг цели, не тормозя
        const Up = norm(c), side = norm(cross(Up, tangent(sub(v.pos, c), Up)));
        return { p: add(c, add(mul(side, 18 * (v.id % 2 ? 1 : -1)), mul(tangent(sub(v.pos, c), Up), 10))), arrive: 3 };
      }
      return { p: c, arrive: 5 };
    }
    const g = groupGoal(v);
    return g ? { p: g, arrive: 8 } : null;
  },
  findPrey(v){
    let best = null, bs = 1e9;
    const team = v.team;
    for (const e of TGT[team]){
      if (!e.alive || e.cls === 'drone' || (e.cls === 'tank' && (!e.vk || e.vk === 'raider'))) continue;
      const d = dist(e.pos, v.pos);
      if (d > 320) continue;
      if (e.seen[team] <= 0 && d > 90) continue;
      let sc = d;
      if (isEcoTarget(e)) sc -= 90;
      else if (e.cls === 'tank') sc -= 70;          // артиллерия врага без прикрытия — лакомая цель
      else if (e.cls === 'inf'){
        let n = 0; for (const o of TGT[team]) if (o !== e && o.alive && o.cls !== 'bld' && dist2(o.pos, e.pos) < 625) n++;
        if (n > 0) continue;          // только одиночки
        sc -= 20;
      } else if (e.cls === 'bld'){ if (e.type === 'turret' || e.type === 'aa') continue; sc += 40; }
      else continue;
      // опасно: рядом турели и танки врага
      for (const o of TGT[team]) if (o.alive && ((o.cls === 'bld' && o.type === 'turret' && o.done) || (o.cls === 'tank' && !o.vk)) && dist2(o.pos, e.pos) < 2500) sc += 150;
      if (S.hq[1 - team].alive && dist(S.hq[1 - team].pos, e.pos) < 150) sc += 200;
      if (sc < bs){ bs = sc; best = e; }
    }
    return best;
  },
  // артиллерия: держится за линией фронта, на дистанции стрельбы
  artyGoal(v){
    const KK = VK[v.vk], rmin = V2.rmin(v), rmax = KK.rmax;
    if (v.hp < v.maxhp * 0.3 && S.time - v.lastHurt < 4 && !(v.manualUntil > S.time)) return { p: V2.home(v), arrive: 30 };
    const fa = v.fireAt && v.fireAt.until > S.time ? v.fireAt.pos : (v.focus && v.focus.alive ? centerOf(v.focus) : null);
    if (fa){
      const d = dist(fa, v.pos);
      if (d > rmax * 0.92) return { p: fa, arrive: 0 };
      if (d < rmin + 4){ const Up = norm(v.pos); return { p: add(v.pos, mul(tangent(sub(v.pos, fa), Up), 25)), arrive: 2 }; }
      return null;
    }
    // ближайший видимый враг: держим дистанцию 0.7 от максимальной
    let foe = null, fd = rmax + 40;
    for (const e of TGT[v.team]){ if (!e.alive || e.cls === 'bld' || e.seen[v.team] <= 0 || isAir(e)) continue; const d = dist(e.pos, v.pos); if (d < fd){ fd = d; foe = e; } }
    if (foe){
      const Up = norm(v.pos), away = tangent(sub(v.pos, foe.pos), Up);
      if (fd < rmin + 15 || (foe.cls !== 'inf' && fd < 45)) return { p: add(v.pos, mul(away, 30)), arrive: 2 };   // отходим
      if (v.target) return null;                                            // в позиции — стреляем
    }
    const g = groupGoal(v);
    if (!g) return null;
    if (V2.manual(v) && (v.order === 'move' || v.order === 'hold')) return { p: g, arrive: 5 };
    // встаём позади цели приказа — ближе к своей базе
    const back = stepToward(norm(g), norm(V2.home(v)), 55 / RM);
    const p = surfacePoint(back, 1);
    return { p, arrive: 12, slow: dist(p, v.pos) < 30 };
  },
  friendlyNear(team, c, r){
    const r2 = r * r;
    for (const u of S.units) if (u.alive && u.team === team && dist2(u.pos, c) < r2) return true;
    for (const u of S.vehicles) if (u.alive && u.team === team && dist2(u.pos, c) < r2) return true;
    return false;
  },
  artyTarget(v){
    const KK = VK[v.vk], rmin = V2.rmin(v);
    let best = null, bs = -1e9;
    if (v.focus && v.focus.alive && v.focus.cls !== 'hq'){ const d = dist(centerOf(v.focus), v.pos); if (d > rmin && d < KK.rmax) return v.focus; }
    for (const e of TGT[v.team]){
      if (!e.alive || e.seen[v.team] <= 0 || e.cls === 'drone' || e.cls === 'builder' || isAir(e)) continue;
      const c = centerOf(e), d = dist(c, v.pos);
      if (d < rmin || d > KK.rmax) continue;
      let n = 0; for (const o of TGT[v.team]) if (o !== e && o.alive && o.cls !== 'bld' && dist2(o.pos, e.pos) < 49) n++;
      let sc = n * 30 - d * 0.1;
      if (e.cls === 'inf') sc += v.vk === 'cat' ? 25 : 10;
      else if (e.cls === 'tank') sc += v.vk === 'mlrs' ? 25 : -15;
      else if (e.cls === 'bld') sc += (e.type === 'turret' || e.type === 'aa') ? 35 : 12;
      if (sc <= bs) continue;
      if (V2.friendlyNear(v.team, c, KK.safe)) continue;
      bs = sc; best = e;
    }
    return best;
  },
  aiAbil(v){
    if (v === ctrlEntity()) return;
    const now = S.time;
    if (v.vk === 'raider'){
      if (abilLeft(v, 'v2nitro') <= 0 && ((v.retreat && now - v.lastHurt < 3) || (v.prey && dist(v.prey.pos, v.pos) > 120))) useAbility(v, 'v2nitro');
    } else if (v.vk === 'mlrs'){
      if (abilLeft(v, 'v2smoke') <= 0 && v.hp < v.maxhp * 0.5 && now - v.lastHurt < 2 && v.lastAttacker && v.lastAttacker.alive){
        const a = v.lastAttacker.pos, d = dist(a, v.pos);
        if (d > 40 && d < 150) useAbility(v, 'v2smoke', add(v.pos, mul(sub(a, v.pos), 0.5)));
      }
    } else if (v.vk === 'cat'){
      const g = groupGoal(v);
      if (abilLeft(v, 'v2flare') <= 0 && !v.target && g && dist(g, v.pos) < 120 && dist(g, v.pos) > 30 && (v.order === 'attack' || v.order === 'cap') && random() < 0.25){
        const foes = TGT[v.team].some(e => e.alive && e.cls !== 'bld' && dist2(e.pos, g) < 3600);
        if (foes) useAbility(v, 'v2flare', g);
      }
    }
  },
  // ---------------- стрельба (ИИ и игрок); вызывается из sim.js вместо vehicleAimAndFire
  aimFire(v, dt, isMe, pin){
    const KK = VK[v.vk], R = V2.reload(v);
    v.load = clamp(1 - v.cd / R, 0, 1);
    v.swingT = (v.swingT === undefined ? 9 : v.swingT) + dt;
    // очередь пусков: ракеты рейдера и РСЗО уходят по одной
    if (v.salvoN > 0){
      v.salvoT -= dt;
      if (v.salvoT <= 0){
        const k = v.salvoK++;
        if (v.vk === 'raider'){ V2.rocketR(v, isMe ? v.aimPt : v.salvoAim, k, isMe ? v.aimEnt : v.salvoTe); v.salvoT = 0.14; }
        else { V2.rocketG(v, v.salvoTp, v.salvoTe && v.salvoTe.alive ? v.salvoTe : null, k % 3, v.salvoSmoke); v.salvoT = v.team === 1 && !v.salvoSmoke ? 0.16 : 0.27; }
        if (--v.salvoN <= 0) v.salvoSmoke = false;
      }
    } else if (v.smokeQ){ const p = v.smokeQ; v.smokeQ = null; V2.startSalvo(v, p, null, true); }
    // катапульта Роя: бомба уходит, когда рычаг почти распрямился
    if (v.lobTp && v.swingT > 0.22){ V2.lob(v, v.lobTp, false); v.lobTp = null; v.swingT = 0.22; }
    if (v.vk === 'cat'){
      const s = v.swingT;
      v.arm = v.team === 0 ? max(0, 1 - s / 0.35) : (s < 0.25 ? s / 0.25 : 1 - smoothstep(0.25, R * 0.75, s));
      v.loaded = v.cd <= R * 0.2 && s > 0.6;
    }
    if (isMe) V2.playerFire(v, dt, pin); else V2.aiFire(v, dt);
  },
  startSalvo(v, tp, te, smoke){
    v.salvoN = smoke ? 3 : v.team === 1 ? 6 : 3; v.salvoT = 0; v.salvoK = 0; v.salvoTp = tp; v.salvoTe = te || null; v.salvoSmoke = !!smoke;
  },
  shootMain(v, tp, te){
    const R = V2.reload(v);
    if (v.vk === 'raider'){ v.salvoN = 4; v.salvoT = 0; v.salvoK = 0; v.salvoAim = tp; v.salvoTe = te || null; v.cd = R; }
    else if (v.vk === 'mlrs'){ V2.startSalvo(v, tp, te, false); v.cd = R; }
    else { if (v.team === 0) V2.lob(v, tp, false); else { v.lobTp = tp; v.swingT = 0; } v.cd = R; }
  },
  mg(v, aimPt, spread){
    const m = add(add(v.pos, mul(v.up, 0.75)), mul(v.aim, 1.2));
    const dir = aimPt ? norm(sub(aimPt, m)) : v.aim;
    fire(m, dir, v.team, spread, 4.5, 130, v, 'b');
    v.mgCd = v === ctrlEntity() ? 0.1 : 0.18;
    emit('shot', { pos: m, team: v.team, src: v, heavy: true });
  },
  aiFire(v, dt){
    const KK = VK[v.vk];
    if (v.vk === 'raider'){
      const tg = v.target;
      if (tg && tg.alive){
        const m0 = add(v.pos, mul(v.up, 0.8)), d = dist(centerOf(tg), m0);
        // целимся чуть выше центра (ракеты не цепляют кочки) и с поправкой на падение
        const c = add(centerOf(tg), mul(norm(tg.pos), (tg.cls === 'bld' ? 0.8 : 0.35) + 0.5 * gAt(RM) * 0.3 * (d / 78) * (d / 78)));
        const lead = add(c, mul(tg.vel || [0, 0, 0], d / 78 * 0.8));
        const want = norm(sub(lead, m0));
        v.aim = turnToward(v.aim, want, 3.2 * dt);
        const ang = acos(clamp(dot(v.aim, want), -1, 1));
        const soft = tg.cls === 'inf' || tg.cls === 'drone';
        if (v.salvoN > 0) v.salvoAim = lead;
        // по пехоте ракетами — только по кучке (2+ бойца в 4 м), иначе пулемёт
        const bunch = soft && TGT[v.team].some(o => o !== tg && o.alive && o.cls === 'inf' && dist2(o.pos, tg.pos) < 16);
        if (v.cd <= 0 && v.salvoN === 0 && ang < 0.1 && d < 80 && (!soft || (bunch && d < 40))) V2.shootMain(v, lead, tg);
        if (v.mgCd <= 0 && ang < 0.2 && d < 70 && (soft || tg.cls === 'builder')) V2.mg(v, lead, 0.03 * (1 + len(v.vel) / 12) * (v.team === 1 ? DK().acc : 1));   // на ходу пулемёт мажет
      } else v.aim = turnToward(v.aim, tangent(v.fwd, v.up), dt);
      return;
    }
    const rmin = V2.rmin(v), rmax = KK.rmax;
    let tp = null, te = null;
    if (v.fireAt && v.fireAt.until > S.time){ const d = dist(v.fireAt.pos, v.pos); if (d >= rmin && d <= rmax) tp = v.fireAt.pos; }
    if (!tp && v.target && v.target.alive){
      te = v.target; const c = centerOf(te), d = dist(c, v.pos);
      const tof = v.vk === 'mlrs' ? 1.2 + d / 48 : (v.team === 0 ? 3 + d / 45 : 2.4 + d / 32);
      tp = add(c, mul(te.vel || [0, 0, 0], tof * 0.6));
    }
    if (!tp && v.order === 'attack'){ const h = S.hq[1 - v.team]; if (h.alive){ const d = dist(h.pos, v.pos); if (d > rmin && d < rmax) tp = add(h.pos, mul(randUnit(), 6)); } }
    const Up = v.up;
    if (tp){
      const d = dist(tp, v.pos), want = tangent(sub(tp, v.pos), Up);
      v.aim = tangent(turnToward(tangent(v.aim, Up), want, 1.4 * dt), Up);
      const el = v.vk === 'mlrs' ? 0.3 + 0.6 * clamp(d / rmax, 0, 1) : 0.98 * (1 - clamp(d / rmax, 0, 1)) * 0.8 + 0.1;
      v.elev += (el - v.elev) * min(1, dt * 2);
      const ang = acos(clamp(dot(tangent(v.aim, Up), want), -1, 1));
      if (v.cd <= 0 && v.salvoN === 0 && !v.lobTp && ang < 0.12 && !V2.friendlyNear(v.team, tp, KK.safe)) V2.shootMain(v, tp, te);
    } else {
      v.aim = tangent(turnToward(tangent(v.aim, Up), tangent(v.fwd, Up), 0.8 * dt), Up);
      v.elev += ((v.vk === 'mlrs' ? 0.12 : 0.4) - v.elev) * min(1, dt);
    }
  },
  playerFire(v, dt, pin){
    const KK = VK[v.vk];
    if (S.cam){ const r = rayCast(S.cam.pos, S.cam.fwd, 420, v.team, true); v.aimPt = r.pos; v.aimEnt = r.ent; }
    if (!v.aimPt) return;
    const d = dist(v.aimPt, v.pos);
    if (v.vk === 'raider'){
      if (pin.fire && v.cd <= 0 && v.salvoN === 0) V2.shootMain(v, v.aimPt, null);
      if ((pin.alt || (TOUCH.on && pin.fire && v.salvoN === 0)) && v.mgCd <= 0) V2.mg(v, v.aimPt, 0.018);
      return;
    }
    const rmin = V2.rmin(v);
    v.aimOk = d >= rmin && d <= KK.rmax;
    v.hiCam = !!pin.alt;
    const el = v.vk === 'mlrs' ? 0.3 + 0.6 * clamp(d / KK.rmax, 0, 1) : 0.98 * (1 - clamp(d / KK.rmax, 0, 1)) * 0.8 + 0.1;
    v.elev += (el - v.elev) * min(1, dt * 3);
    if (pin.fire && v.cd <= 0 && v.salvoN === 0 && !v.lobTp){
      if (v.aimOk) V2.shootMain(v, v.aimPt, v.vk === 'mlrs' && v.aimEnt && v.aimEnt.cls !== 'hq' ? v.aimEnt : null);
      else if (S.rtime - (v.denyT || -9) > 1.2){ v.denyT = S.rtime; feed(d < rmin ? tr(`Слишком близко: мёртвая зона ${rmin} м`, `Too close: ${rmin} m dead zone`, `Too close: ${rmin} m dead zone`) : tr(`Слишком далеко: дальность ${KK.rmax} м`, `Too far: range ${KK.rmax} m`, `Too far: range ${KK.rmax} m`), '#f88'); emit('ui', { kind: 'deny' }); }
    }
  },
  // ---------------- управление игроком (вместо tankPlayerInput)
  playerInput(v, dt){
    S.aiming = false;
    const KK = VK[v.vk];
    // только что вселились в артиллерию: опускаем прицел, чтобы перекрестие легло на землю в ~60 м
    if (v.vk !== 'raider' && S.rtime - (v.possT || -9) > 0.5){ const f0 = tangent(v.aim, v.up); v.aim = norm(add(f0, mul(v.up, -0.15))); }
    v.possT = S.rtime;
    const f = clamp((K('fwd') ? 1 : 0) - (K('back') ? 1 : 0) + TOUCH.move[1], -1, 1);
    const turn = clamp((K('right') ? 1 : 0) - (K('left') ? 1 : 0) + TOUCH.move[0], -1, 1);
    if (turn) v.fwd = tangent(rotAxis(v.fwd, v.up, -turn * (f < 0 ? -1 : 1) * KK.turn * dt * (v.grounded ? 1 : 0.35)), v.up);
    return V2.grip(v, { wish: mul(tangent(v.fwd, v.up), f), speedMul: K('run') ? 1.2 : 1,
             fire: SET.swapMouse ? mouseR : mouseL, alt: SET.swapMouse ? mouseL : mouseR, lift: K('jump'), thrustDir: v.up });
  },
  // прижимная сила: на кочках быстрая машина не «парит», а быстро возвращается на грунт
  grip(v, inp){
    if (!v.grounded && v.airT < 1.5 && len(v.pos) - groundR(norm(v.pos)) < v.rad + 2.5){ inp.boost = v.vk === 'raider' ? 7 : 4; inp.boostDir = mul(norm(v.pos), -1); }
    return inp;
  },
  // ---------------- камера при вселении: ПКМ у артиллерии — «вид сверху» для дальней наводки
  camera(c, dt){
    const KK = VK[c.vk];
    c.hiK = (c.hiK || 0) + ((c.hiCam ? 1 : 0) - (c.hiK || 0)) * min(1, dt * 4);
    const h = c.hiK, center = add(c.pos, mul(c.up, 1.0)), af = tangent(c.aim, c.up);
    const want = add(add(center, mul(af, -(KK.camB + h * 8))), mul(c.up, KK.camH + h * 42));
    const pos = pullCam(center, want);
    let lp = add(center, mul(c.aim, 40));
    if (h > 0.01){   // вид сверху: мышь вверх-вниз двигает точку взгляда по земле 15…170 м
      const el = asin(clamp(dot(c.aim, c.up), -1, 1)), D = clamp(70 + el * 160, 15, 175);
      const gp = surfacePoint(stepToward(norm(c.pos), norm(add(c.pos, mul(af, 10))), D / RM), 0.3);
      lp = add(mul(lp, 1 - h), mul(gp, h));
    }
    const look = norm(sub(lp, pos));
    return Object.assign({ pos }, camBasis(look, c.up));
  },
  // ---------------- данные для шейдера (render.js objInfo)
  objInfo(e){
    const KK = VK[e.vk];
    const o = sub(e.pos, mul(e.up, e.rad));
    const f = e.vk === 'mlrs' ? clamp(e.elev || 0, 0, 0.98) : e.vk === 'cat' ? clamp(e.team === 0 ? (e.elev || 0) : (e.arm || 0), 0, 0.98) : 0;
    const th = e.vk === 'cat' ? (e.team === 0 ? clamp(e.arm || 0, 0, 1) : (e.loaded ? 1 : 0)) : (e.overT > 0 ? 1 : 0);
    return { type: 5, origin: o, bc: add(o, mul(e.up, KK.bcY)), br: KK.br, sc: add(o, mul(e.up, 1.1)), sr: KK.sr, thrust: th, prog: clamp(e.load === undefined ? 1 : e.load, 0, 1), variant: KK.i + f * 0.5 };
  },
  // ---------------- прицел: дуга полёта и точка падения
  overlay(c){
    if (!c.aimPt || c.vk === 'raider'){
      if (c.vk === 'raider' && c.aimPt){ const s = project(c.aimPt); if (s){ octx.strokeStyle = c.cd > 0 ? 'rgba(232,220,184,.35)' : 'rgba(232,220,184,.9)'; octx.lineWidth = 1.5; octx.beginPath(); octx.arc(s[0], s[1], 9, 0, PI * 2); octx.stroke(); } }
      return;
    }
    const KK = VK[c.vk], ok = c.aimOk;
    const col = ok ? (c.cd > 0 ? 'rgba(232,220,184,.45)' : 'rgba(140,255,170,.9)') : 'rgba(255,96,80,.85)';
    const tp = c.aimPt, pts = [];
    if (c.vk === 'mlrs'){
      const p = { pos: V2.muzzle(c, 1), vel: null, tp, te: null, off: [0, 0, 0], t: 0 };
      const flat = tangent(sub(tp, c.pos), c.up);
      p.vel = mul(norm(add(mul(flat, 0.58), mul(c.up, 0.81))), 24);
      for (let i = 0; i < 90; i++){
        const g = V2.guide(p, 0.05, true);
        p.vel = add(p.vel, mul(norm(p.pos), -gAt(len(p.pos)) * 0.05 * 0.3));
        p.pos = add(p.pos, mul(p.vel, 0.05));
        if (i % 3 === 0) pts.push(p.pos);
        if (g.d < 2.5) break;
      }
    } else {
      const m = V2.muzzle(c, 0), D = dist(m, tp);
      let ac = V2.arcs.get(c);
      if (!ac || dist(ac.tp, tp) > 0.5 || dist(ac.m, m) > 0.3){ ac = { tp, m, pts: V2.lobPath(m, tp, V2.lobT(c, D), true).pts }; V2.arcs.set(c, ac); }
      pts.push(...ac.pts);
    }
    octx.strokeStyle = col; octx.lineWidth = 2; octx.setLineDash([5, 6]);
    octx.beginPath(); let st = false;
    for (const p of pts){ const s = project(p); if (!s){ st = false; continue; } if (!st){ octx.moveTo(s[0], s[1]); st = true; } else octx.lineTo(s[0], s[1]); }
    octx.stroke(); octx.setLineDash([]);
    const spr = c.vk === 'mlrs' ? V2.spread(c, dist(tp, c.pos), false) : c.team === 0 ? 6 : 6.5;
    groundRing(add(tp, mul(norm(tp), 0.3)), spr, 28);
    octx.lineWidth = 1; groundRing(add(tp, mul(norm(tp), 0.3)), 1.2, 12);
    const s = project(tp);
    if (s){
      octx.fillStyle = col; octx.textAlign = 'center'; octx.font = '600 12px "Exo 2", Consolas, sans-serif';
      const d = Math.round(dist(tp, c.pos));
      octx.fillText(`${d} ${tr('м', 'm', 'm')}${ok ? '' : ' · ' + (d < V2.rmin(c) ? tr('мёртвая зона', 'dead zone', 'dead zone') : tr('далеко', 'out of range', 'out of range'))}`, s[0], s[1] - 16);
    }
  },
  // ---------------- полоса оружия в HUD
  hudBar(c, jE, jL){
    jE.style.width = (clamp(c.load, 0, 1) * 100).toFixed(1) + '%';
    jE.style.background = c.cd > 0 ? '#887' : '#e8dcb8';
    const ready = c.cd <= 0 && !c.salvoN;
    const d = c.aimPt ? Math.round(dist(c.aimPt, c.pos)) : 0;
    if (c.vk === 'raider') jL.textContent = ready ? tr('РАКЕТЫ ГОТОВЫ · ЛКМ · ПКМ — пулемёт', 'ROCKETS READY · LMB · RMB — MG', 'ROCKETS READY · LMB · RMB — MG') : tr('ракеты перезаряжаются · ПКМ — пулемёт', 'rockets reloading · RMB — MG', 'rockets reloading · RMB — MG');
    else if (c.vk === 'mlrs') jL.textContent = (ready ? tr('ЗАЛП ГОТОВ · ЛКМ', 'SALVO READY · LMB', 'SALVO READY · LMB') : tr('пакет перезаряжается', 'launcher reloading', 'launcher reloading')) + ` · ${d} ${tr('м', 'm', 'm')} · ${tr('ПКМ — вид сверху', 'RMB — high view', 'RMB — high view')}`;
    else jL.textContent = (ready ? (c.team === 0 ? tr('МИНА ГОТОВА · ЛКМ', 'SHELL READY · LMB', 'SHELL READY · LMB') : tr('БОМБА ГОТОВА · ЛКМ', 'BOMB READY · LMB', 'BOMB READY · LMB')) : tr('перезарядка', 'reloading', 'reloading')) + ` · ${d} ${tr('м', 'm', 'm')} · ${tr('ПКМ — вид сверху', 'RMB — high view', 'RMB — high view')}`;
  },
  hint(c){
    if (c.vk === 'raider') return tr(`Рейдер: ЛКМ — залп 4 ракет, ПКМ — пулемёт, ${bk('grenade')} — нитро. Быстрый и хрупкий: бей по строителям и с фланга.`, `Raider: LMB — 4-rocket salvo, RMB — MG, ${bk('grenade')} — nitro. Fast and fragile: hit builders and flanks.`);
    if (c.vk === 'mlrs') return tr(`РСЗО: ЛКМ — залп в точку прицела (35–160 м), ПКМ — вид сверху для дальних целей, ${bk('reflex')} — дымовой залп.`, `MLRS: LMB — salvo at the aim point (35–160 m), RMB — high view for far targets, ${bk('reflex')} — smoke salvo.`);
    return tr(`${V2.cname('cat', c.team)}: ЛКМ — выстрел навесом в точку прицела, ПКМ — вид сверху, ${bk('reflex')} — осветительная бомба (разведка).`, `${V2.cname('cat', c.team)}: LMB — lob at the aim point, RMB — high view, ${bk('reflex')} — flare bomb (spotting).`);
  },
  help(c, row){
    row(`${bk('fwd')}/${bk('back')}`, tr('газ / задний ход', 'throttle / reverse', 'throttle / reverse')); row(`${bk('left')}/${bk('right')}`, tr('руль', 'steer', 'steer'));
    row(tr('мышь', 'mouse', 'chuột'), tr('прицел', 'aim', 'aim'));
    if (c.vk === 'raider'){ row(tr('ЛКМ', 'LMB', 'LMB'), tr('залп 4 ракет', '4-rocket salvo', '4-rocket salvo')); row(tr('ПКМ', 'RMB', 'RMB'), tr('пулемёт', 'machine gun', 'machine gun')); }
    else { row(tr('ЛКМ', 'LMB', 'LMB'), c.vk === 'mlrs' ? tr('залп по точке прицела', 'salvo at the aim point', 'salvo at the aim point') : tr('выстрел навесом в точку прицела', 'lob at the aim point', 'lob at the aim point')); row(tr('ПКМ', 'RMB', 'RMB'), tr('вид сверху для дальней наводки', 'high view for long-range aiming', 'high view for long-range aiming')); }
    for (const k of abilList(c)){ const A = ABIL[k]; row(A.key === 'KeyR' ? bk('reload') : A.key === 'KeyF' ? bk('reflex') : bk('grenade'), N2(A.n).toLowerCase()); }
    row(bk('interact'), tr('в пехоту рядом', 'to nearby infantry', 'về bộ binh gần đó'));
  },
  // ---------------- иконки на картах
  icon(x, y, v, col, s){
    s = s || 1;
    octx.fillStyle = col; octx.strokeStyle = col; octx.lineWidth = 1.5;
    const f = v.vk;
    if (f === 'raider'){ octx.beginPath(); octx.moveTo(x + 5 * s, y); octx.lineTo(x - 4 * s, y - 4 * s); octx.lineTo(x - 2 * s, y); octx.lineTo(x - 4 * s, y + 4 * s); octx.closePath(); octx.fill(); }
    else if (f === 'mlrs'){ octx.fillRect(x - 5 * s, y - 1 * s, 10 * s, 5 * s); for (let i = -1; i <= 1; i++){ octx.beginPath(); octx.moveTo(x + i * 3 * s, y - 1 * s); octx.lineTo(x + i * 3 * s + 2 * s, y - 5 * s); octx.stroke(); } }
    else { octx.fillRect(x - 4.5 * s, y, 9 * s, 4 * s); octx.beginPath(); octx.arc(x, y, 3.5 * s, PI, PI * 2); octx.stroke(); }
  },
  // ---------------- стратегия: круги дальности и цель огня по площади у выделенной артиллерии
  rtsOverlay(sel){
    for (const g of sel){
      if (!g.vk || g.vk === 'raider' || !g.alive) continue;
      const KK = VK[g.vk];
      octx.setLineDash([3, 6]); octx.lineWidth = 1;
      octx.strokeStyle = 'rgba(255,190,110,.45)'; groundRing(g.pos, KK.rmax, 64);
      octx.strokeStyle = 'rgba(255,96,80,.35)'; groundRing(g.pos, V2.rmin(g), 32);
      octx.setLineDash([]);
      if (g.fireAt && g.fireAt.until > S.time && facing(g.fireAt.pos)){
        octx.strokeStyle = '#ffb070'; octx.lineWidth = 2; groundRing(add(g.fireAt.pos, mul(norm(g.fireAt.pos), 0.4)), 6, 20);
        const a = project(g.pos), b = project(g.fireAt.pos);
        if (a && b){ octx.setLineDash([2, 5]); octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke(); octx.setLineDash([]); }
      }
    }
  },
  // ---------------- ИИ-командир: что заказывать (вставка в план economy() из ai.js)
  plan(t, plan, nFactory){
    if (!nFactory) return;
    const time = S.time, swarm = t === 1;
    const n = k => countProduct(t, k);
    // руды у ИИ всегда впритык: дешёвый рейдер (1–2 шт.) ставим перед танками, среднюю технику
    // (по одной, со временем по две) — сразу после первого танка, иначе до неё не доходит очередь
    const tk = []; plan.forEach((p, i) => { if (p[1] === 'tank') tk.push(i); });
    const mid = [];
    if (time > 300 && n('cat') < 1) mid.push(['p', 'cat']);
    if (time > 420 && n('mlrs') < 1) mid.push(['p', 'mlrs']);
    if (time > 360 && n('raider') < (swarm ? 3 : 2)) mid.push(['p', 'raider']);
    if (time > 700 && n('cat') < 2) mid.push(['p', 'cat']);
    if (time > 800 && n('mlrs') < 2) mid.push(['p', 'mlrs']);
    plan.splice(tk.length ? tk[0] + 1 : plan.length, 0, ...mid);
    const early = [];
    if (time > 90 && n('raider') < (swarm ? 2 : 1)) early.push(['p', 'raider']);
    plan.splice(tk.length ? tk[0] : plan.length, 0, ...early);
  },
  // ---------------- звук (процедурный, через AU)
  sound(e){
    if (!AU.ready()) return;
    const fps = S.mode === 'fps', mine = fps && e.src && e.src === ctrlEntity();
    const k = e.k;
    const far = k === 'salvo' || k === 'mortar' ? 420 : k === 'in' ? 60 : 260;
    if (!AU.allow(mine ? null : e.pos, far)) return;
    const t = AU.ctx.currentTime, out = AU.out(mine ? null : e.pos, 0.35);
    if (k === 'rk'){            // НУР: короткий шипящий свист
      AU.nz(out, t, 0.55, 'bandpass', 1200, 3200, 0.8, 0.55, 0.01);
      AU.osc(out, t, 0.12, 'sine', 160, 60, 0.45);
    } else if (k === 'salvo'){  // РСЗО: глухой удар + длинный рёв двигателя
      AU.osc(out, t, 0.3, 'sine', 70, 30, 1.0);
      AU.nz(out, t, 0.25, 'lowpass', 1800, 200, 0.6, 0.9);
      AU.nz(out, t + 0.03, 1.6, 'bandpass', 700, 2400, 0.7, 0.6, 0.08);
    } else if (k === 'mortar'){ // миномёт: «бум» трубы
      AU.osc(out, t, 0.35, 'sine', 95, 35, 1.2);
      AU.nz(out, t, 0.3, 'lowpass', 2200, 250, 0.6, 1.0);
      AU.osc(out, t + 0.02, 0.08, 'square', 600, 300, 0.08);
    } else if (k === 'lob'){    // катапульта: скрип и хлёсткий бросок
      AU.osc(out, t, 0.25, 'sawtooth', 140, 90, 0.18, 0.05);
      AU.nz(out, t + 0.12, 0.25, 'bandpass', 500, 1400, 1.2, 0.5, 0.02);
      AU.osc(out, t + 0.2, 0.18, 'triangle', 220, 70, 0.5);
    } else if (k === 'pop'){    // раскрытие кассеты / дымовой ракеты
      AU.nz(out, t, 0.12, 'highpass', 2500, 900, 0.7, 0.5);
      AU.osc(out, t, 0.1, 'square', 900, 300, 0.12);
    } else if (k === 'flare'){
      AU.nz(out, t, 0.15, 'highpass', 3000, 1000, 0.7, 0.5);
      AU.nz(out, t + 0.1, 2.5, 'bandpass', 4200, 3000, 2, 0.12, 0.3);
    } else if (k === 'in'){     // свист подлетающей ракеты/мины
      AU.osc(AU.sfx, t, 0.9, 'sine', 1800, 450, 0.22, 0.08);
      AU.nz(AU.sfx, t, 0.9, 'bandpass', 2200, 700, 3, 0.18, 0.1);
    }
  },
};
// исполнение способностей (вызов из useAbility, default-ветка)
V2_ABIL.v2hunt.fn = g => { g.huntUntil = S.time + 60; g.manualUntil = 0; g.byPlayer = false; g.prey = null; g.retreat = false; emit('ack', { g, order: 'abil' }); };
V2_ABIL.v2nitro.fn = g => { g.overT = 4; emit('overdrive', { pos: g.pos }); };
V2_ABIL.v2salvo.fn = V2_ABIL.v2lob.fn = (g, pt) => { g.fireAt = { pos: pt, until: S.time + 20 }; g.target = null; };
V2_ABIL.v2smoke.fn = (g, pt) => { if (g.salvoN > 0) g.smokeQ = pt; else V2.startSalvo(g, pt, null, true); };
V2_ABIL.v2flare.fn = (g, pt) => { V2.lob(g, pt, true); };
