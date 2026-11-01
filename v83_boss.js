// =====================================================================
//  v8.3 — СВЕРХЮНИТЫ ФРАКЦИЙ (BOSS83): по одному «боссу» на армию, поздняя игра
//   • Консорциум — сверхтяжёлый танк «Бастион»: главная пушка + 2 пулемётные башенки + ракетная кассета,
//     очень медленный, медленно поворачивает, огромная прочность; слабое место — корма (двигатель): урон ×1.8.
//   • Рой — шагоход «Жнец» на 6 ногах (шаги с IK — v83_mesh.js): луч искажения + «топот» по площади,
//     перешагивает бетонные барьеры; слабое место — светящееся ядро под брюхом: урон снизу/по ядру ×1.8–2.
//   • Открываются с 12:00 боя: здание «Сборочный цех» (Консорциум) / «Инкубатор» (Рой), нужен мехзавод;
//     сборка дорогая и долгая, живой — не больше одного на армию; противнику — радио «ВНИМАНИЕ: противник собирает…»
//     при начале сборки и при выходе на поле.
//   • Игрок: приказы в стратегии как танку (ПК и телефон), вселение — как в технику (ЛКМ — главное оружие,
//     ПКМ у «Жнеца» — топот; пулемёты и ракеты «Бастиона» стреляют сами), вид — всегда снаружи.
//   • ИИ: строит и ведёт босса на базу врага с сопровождением; по вражескому боссу — фокус огня, обход
//     (к корме «Бастиона», под брюхо «Жнеца»), ковровая бомбардировка.
//   • Полоска прочности босса вверху экрана, когда он виден; смерть — многоступенчатый взрыв, самая большая воронка.
//  Хуки — только обёртки: centerOf, hitRadius, damage, destroy, tankInput, tankPlayerInput, vehicleAimAndFire,
//  physStep, bldSDF, canBuild, canProduce, finishProduct, countProduct, groupLabel, abilList, useAbility,
//  setupCamera, FPS61.vehFP, objInfo, r61BldState, uixFrame, aiPowers (через FAC82.steps / plans / aiQ).
//  Выключить: ?boss83=0.
// =====================================================================
const BOSS83 = {
  on: (() => { try { return typeof FAC82 !== 'undefined' && new URLSearchParams(location.search).get('boss83') !== '0'; } catch (e){ return true; } })(),
  UNLOCK: 720,   // 12:00 боя
  err: {}, ann: {}, deaths: [], wrecks: [], lt: null,
  stats: { built: [0, 0], deployed: [0, 0], lost: [0, 0], dealt: [0, 0], weak: [0, 0], carpet: 0, flank: 0, focus: 0, beams: 0, stomps: 0, salvos: 0, tDeploy: [], tDie: [] },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('boss83 ' + tag, e); } } },
  // c — «Бастион» (Консорциум), s — «Жнец» (Рой)
  K: {
    c: { key: 'boss83c', bld: 'asm83c', hp: 15000, walk: 4.2, rad: 2.4, hitR: 5.4, cy: 1.8, turn: 0.32, camB: 22, camH: 9, camC: 3.2,
         n: ['«Бастион»', '"Bastion"', '"Bastion"'], acc: '«Бастион»', cls: ['Сверхтяжёлый танк', 'Super-heavy tank', 'Siêu xe tăng'] },
    s: { key: 'boss83s', bld: 'asm83s', hp: 12500, walk: 5.4, rad: 2.0, hitR: 5.0, cy: 7.0, turn: 1.0, camB: 24, camH: 10, camC: 8,
         n: ['«Жнец»', '"Reaper"', '"Reaper"'], acc: '«Жнеца»', cls: ['Шагоход', 'Walker', 'Cỗ máy đi bộ'] },
  },
  kindOf(t){ return FI76(t) === 1 ? 's' : 'c'; },
  name(v){ return T82(...this.K[v.boss83].n); },
  nameK(k){ return T82(...this.K[k].n); },
  list(t){ return S.vehicles.filter(v => v.alive && v.boss83 && (t === undefined || v.team === t)); },
  low(){ return FAC82.low(); },
};
ARMOR.boss83 = { b: 0.12, m: 0.3, r: 0.9, s: 0.85, f: 0.35, g: 0.5, a: 1.4, l: 0.7, x: 1 };   // авиабомбы — ×1.4
// ---------------------------------------------------------------- здания и заказы
Object.assign(BTYPES, {
  asm83c: { n: ['Сборочный цех', 'Assembly hall', 'Xưởng lắp ráp'], cost: 450, time: 45, hp: 4200, rad: 5.5, bound: 10.5, H: 9, code: 23, fac82: 0, lim82: 1, req: 'factory',
            d: ['Консорциум. С 12:00 боя. Здесь собирают сверхтяжёлый танк «Бастион» (один на армию).', 'Consortium. From 12:00. Builds the super-heavy tank "Bastion" (one per army).', 'Liên minh. Từ 12:00. Lắp siêu xe tăng "Bastion".'] },
  asm83s: { n: ['Инкубатор', 'Incubator', 'Lò ấp'], cost: 450, time: 45, hp: 4000, rad: 5.5, bound: 10.5, H: 8, code: 23, fac82: 1, lim82: 1, req: 'factory',
            d: ['Рой. С 12:00 боя. Здесь растёт шагоход «Жнец» (один на армию).', 'Swarm. From 12:00. Grows the "Reaper" walker (one per army).', 'Bầy Đàn. Từ 12:00. Nuôi cỗ máy "Reaper".'] },
});
FAC82.KEYS.push('asm83c', 'asm83s');
Object.assign(BICON, { asm83c: '▣', asm83s: '✺' });
if (typeof UIX_ICON !== 'undefined') Object.assign(UIX_ICON.b, { asm83c: '▣', asm83s: '✺' });
Object.assign(WORK_R, { asm83c: 7.5, asm83s: 7.5 });
Object.assign(BLD_BC, { asm83c: 4, asm83s: 3.5 }); Object.assign(BLD_SC, { asm83c: 4, asm83s: 3.5 });
Object.assign(BLD_SR, { asm83c: 5, asm83s: 4.5 }); Object.assign(BLD_BR, { asm83c: 11, asm83s: 10 });
FAC82.MESH.asm83c = 'asm83c'; FAC82.MESH.asm83s = 'asm83s';
FAC82.menus();
Object.assign(PRODUCTS, {
  boss83c: { n: ['Сверхтяжёлый танк «Бастион»', 'Super-heavy tank "Bastion"', 'Siêu xe tăng "Bastion"'], cost: 1600, time: 100, at: ['asm83c'], icon: '▣', fac76: 0,
             d76: ['Консорциум. Босс: 15000 прочности, пушка, 2 пулемёта, ракеты. Очень медленный. Слабое место — корма. Один на армию.', 'Consortium. Boss: 15000 hull, cannon, 2 MGs, rockets. Very slow. Weak spot — the rear. One per army.'] },
  boss83s: { n: ['Шагоход «Жнец»', 'Walker "Reaper"', 'Cỗ máy "Reaper"'], cost: 1500, time: 95, at: ['asm83s'], icon: '✺', fac76: 1,
             d76: ['Рой. Босс: 12500 прочности, луч искажения, топот. Перешагивает барьеры. Слабое место — ядро под брюхом. Один на армию.', 'Swarm. Boss: 12500 hull, distortion beam, stomp. Steps over barriers. Weak spot — the core underneath. One per army.'] },
});
BOSS83.isKey = k => k === 'boss83c' || k === 'boss83s';
BOSS83.isBld = type => type === 'asm83c' || type === 'asm83s';
{ const cb0 = canBuild;
  canBuild = function(team, type){
    if (BOSS83.isBld(type)){
      if (!BOSS83.on) return T82('Выключено', 'Disabled');
      if (S.time < BOSS83.UNLOCK) return T82(`Откроется на ${fmtTime(BOSS83.UNLOCK)} боя`, `Unlocks at ${fmtTime(BOSS83.UNLOCK)} of battle`);
    }
    return cb0.apply(this, arguments);
  }; }
{ const cp0 = canProduce;
  canProduce = function(team, key){
    if (BOSS83.isKey(key)){
      if (!BOSS83.on) return T82('Выключено', 'Disabled');
      if (BOSS83.list(team).length + countQueued(team, ['boss83c', 'boss83s']) >= 1) return T82('Лимит: 1 на армию', 'Limit: 1 per army');
    }
    return cp0.apply(this, arguments);
  }; }
{ const cn0 = countProduct;
  countProduct = function(team, key){ const n = cn0.apply(this, arguments); return key === 'tank' ? n - S.vehicles.filter(v => v.team === team && v.boss83).length : n; }; }
{ const fp0 = finishProduct;
  finishProduct = function(site, key){
    if (!BOSS83.isKey(key)) return fp0.apply(this, arguments);
    const v = BOSS83.safe(() => BOSS83.spawn(site, key === 'boss83s' ? 's' : 'c'), 'spawn');
    if (v && site.rally) setOrder(v, 'move', site.rally, { lock: 25 });
    if (v && site.team === 0 && S.pOrder && S.pOrder[key] > 0 && !S.attract){
      S.pOrder[key]--;
      if (S.mode === 'rts'){ v.byPlayer = true; v.manualUntil = 1e9; if (!site.rally) setOrder(v, 'hold', v.pos, {}); v.manualUntil = 1e9; }
    }
  }; }
// ---------------------------------------------------------------- создание
BOSS83.spawn = function(site, k){
  const t = site.team, K = this.K[k];
  let dir = norm(add(site.pos, mul(site.fwd, site.rad + 13)));
  for (let i = 0; i < 14; i++){
    const p = surfacePoint(dir, K.rad);
    if (!bldAt(p, 5) && !inShaft(p) && !propAt(p, 5)) break;
    dir = norm(add(site.pos, add(mul(site.fwd, site.rad + 13 + i * 3), mul(site.R, (i % 2 ? 1 : -1) * i * 3))));
  }
  const v = makeTank(surfacePoint(dir, K.rad), t);
  TANK_SERIAL[t]--;
  Object.assign(v, { boss83: k, hp: K.hp, maxhp: K.hp, walk: K.walk, rad: K.rad, hitR: K.hitR, armor: 'boss83', serial: '', visR: 120,
                     cd: 2, mgCd: 0, mg83: [{ aim: null, cd: 0, tgt: null, think: 0 }, { aim: null, cd: 0.1, tgt: null, think: 0.25 }], rk83: 6, rkq: 0, rkT: 0, rkTgt: null,
                     st83: 4, bm83: null, born83: S.time });
  v.fwd = tangent(site.fwd, v.up); v.aim = v.fwd;
  this.stats.deployed[t]++; this.stats.tDeploy.push(+(S.time / 60).toFixed(1));
  this.announce(t, 'deploy', v);
  return v;
};
// радио и лента: при начале сборки и при выходе на поле (противнику — предупреждение)
BOSS83.announce = function(t, what, ent){
  if (S.attract) return;
  const k = this.kindOf(t), nm = this.nameK(k);
  if (t === 0){
    if (what === 'start') feed(T82(`${bname(this.K[k].bld)}: ${nm} — сборка начата (${Math.round(pTime(0, this.K[k].key))} с)`, `${nm}: assembly started`), TEAM[0].css);
    else { feed(T82(`${nm} готов к бою!`, `${nm} is ready for battle!`), TEAM[0].css); emit('radio', { text: T82(`${this.K[k].cls[0]} ${nm} вышел на поле боя`, `${nm} has entered the battlefield`), pri: 2 }); }
    return;
  }
  if (what === 'start'){
    feed(T82(`⚠ ВНИМАНИЕ: противник собирает ${this.K[k].acc}!`, `⚠ WARNING: the enemy is assembling the ${nm}!`), '#ff8a6a');
    emit('radio', { text: T82(`Внимание! Противник собирает ${this.K[k].acc}. Найдите и уничтожьте цех, пока не поздно.`, `Warning! The enemy is assembling the ${nm}. Find and destroy the plant before it is too late.`), pri: 2 });
    if (ent && ent.pos) pushAlert(ent.pos);
  } else {
    feed(T82(`⚠ ВНИМАНИЕ: ${nm} противника вышел на поле боя!`, `⚠ WARNING: the enemy ${nm} is on the battlefield!`), '#ff6a50');
    emit('radio', { text: T82(`Внимание! ${nm} противника на поле боя!`, `Warning! The enemy ${nm} is on the field!`), pri: 2 });
    if (ent && ent.pos){ pushAlert(ent.pos); ent.seen[0] = max(ent.seen[0], 6); }
  }
};
// ---------------------------------------------------------------- геометрия попаданий и физика
{ const c0 = centerOf; centerOf = function(e){ return e.boss83 ? add(e.pos, mul(e.up, BOSS83.K[e.boss83].cy)) : c0(e); }; }
{ const h0 = hitRadius; hitRadius = function(e){ return e.boss83 ? e.hitR : h0(e); }; }
BOSS83.noWall = false;
{ const ps0 = physStep;
  physStep = function(e){ if (e && e.boss83 === 's'){ BOSS83.noWall = true; try { return ps0.apply(this, arguments); } finally { BOSS83.noWall = false; } } return ps0.apply(this, arguments); }; }
{ const bs0 = bldSDF;
  bldSDF = function(b, x, y, z){
    if (BOSS83.noWall && b.type === 'wall82') return 1e9;   // «Жнец» перешагивает бетонные барьеры
    if (!BOSS83.isBld(b.type)) return bs0(b, x, y, z);
    const px = x - b.pos[0], py = y - b.pos[1], pz = z - b.pos[2];
    if (px*px + py*py + pz*pz > b.bound * b.bound) return 1e9;
    const qx = px*b.R[0] + py*b.R[1] + pz*b.R[2], qy = px*b.up[0] + py*b.up[1] + pz*b.up[2], qz = px*b.fwd[0] + py*b.fwd[1] + pz*b.fwd[2];
    const H = -1 + (b.H + 1) * max(0.05, b.built);
    const d = b.type === 'asm83c' ? sdBox3(qx, qy - 3.5, qz, 5.0, 4.5, 5.6) : (hypot(qx, qy * 1.15, qz) - 5.6) * 0.85;
    return max(d, qy - H);
  }; }
// урон: слабые места и учёт
BOSS83.weakK = function(e, src){
  if (!src || !src.pos || src.team === e.team) return 1;
  const pl = isPlayerSrc(src) && S.cam;
  if (e.boss83 === 'c'){
    const rel = tangent(sub(src.pos, e.pos), e.up), c = dot(rel, tangent(e.fwd, e.up));
    if (dist(src.pos, e.pos) > 3 && c < -0.45) return 1.8;
    return 1;
  }
  const core = add(e.pos, mul(e.up, 5.1));
  if (pl){ const v = sub(core, S.cam.pos), t = dot(v, S.cam.fwd); if (t > 0 && len(sub(v, mul(S.cam.fwd, t))) < 2.6) return 2.0; }
  const vv = sub(src.pos, e.pos), hd = len(sub(vv, mul(e.up, dot(vv, e.up))));
  return hd < 15 && dot(vv, e.up) < 5 ? 1.8 : 1;
};
{ const d0 = damage;
  damage = function(e, dmg, src, ptype){
    if (e && e.boss83 && e.alive && dmg > 0){
      const k = BOSS83.weakK(e, src);
      if (k > 1){ dmg *= k; BOSS83.stats.weak[e.team]++;
        if (S.rtime - (e.weakFx || 0) > 0.25){ e.weakFx = S.rtime; const p = e.boss83 === 'c' ? add(add(e.pos, mul(e.up, 2.2)), mul(e.fwd, -6.5)) : add(e.pos, mul(e.up, 5.1)); burst(p, BOSS83.low() ? 3 : 7, 6, 0.3); }
        if (isPlayerSrc(src) && !BOSS83.weakSaid){ BOSS83.weakSaid = 1; feed(T82('Слабое место! Урон почти вдвое больше', 'Weak spot! Nearly double damage'), '#ffd27a'); } }
    }
    if (src && src.boss83 && e && e.alive && dmg > 0 && e.team !== src.team) BOSS83.stats.dealt[src.team] += dmg;
    return d0.apply(this, [e, dmg, src, ptype]);
  }; }
// ---------------------------------------------------------------- смерть: многоступенчатый взрыв, воронка, остов
{ const de0 = destroy;
  destroy = function(e, src){
    const was = e && e.boss83 && e.alive;
    const r = de0.apply(this, arguments);
    if (was) BOSS83.safe(() => BOSS83.die(e, src), 'die');
    return r;
  }; }
BOSS83.die = function(e, src){
  const t = e.team;
  this.stats.lost[t]++; this.stats.tDie.push(+(S.time / 60).toFixed(1));
  this.deaths.push({ k: e.boss83, team: t, g: mul(norm(e.pos), groundR(norm(e.pos))), pos: e.pos, up: e.up, fwd: e.fwd, aim: e.aim, t: 0, st: 0, legs: e.legs83 || null });
  if (!S.attract){
    const nm = this.name(e);
    if (t === 0){ feed(T82(`Наш ${nm} уничтожен!`, `Our ${nm} is destroyed!`), '#f88'); emit('radio', { text: T82(`${nm} потерян!`, `${nm} is lost!`), pri: 2 }); }
    else { feed(T82(`${nm} противника уничтожен!`, `The enemy ${nm} is destroyed!`), TEAM[0].css); emit('radio', { text: T82(`Отлично! ${nm} противника уничтожен!`, `Great! The enemy ${nm} is down!`), pri: 2 }); }
  }
};
BOSS83.deathStep = function(dt){
  for (let i = this.deaths.length - 1; i >= 0; i--){
    const D = this.deaths[i]; D.t += dt;
    const low = this.low(), up = D.up, side = norm(cross(D.fwd, up));
    const at = (f, s, h) => add(add(add(D.pos, mul(D.fwd, f)), mul(side, s)), mul(up, h));
    const stages = low ? [0, 1.2, 2.2] : [0, 0.45, 0.9, 1.4, 2.2];
    while (D.st < stages.length && D.t >= stages[D.st]){
      const last = D.st === stages.length - 1, H = D.k === 's' ? 5 : 2;
      if (!last){
        const p = at((random() - 0.5) * 9, (random() - 0.5) * 6, H + random() * 2);
        fxExplosion(p, 2.4 + random() * 1.2, low && D.st > 0);
        if (!low) for (let k = 0; k < 10; k++) S.sparks.push({ pos: p, vel: add(mul(up, 6 + random() * 8), mul(randUnit(), 7)), life: 0.8 + random() * 0.7, big: 1 });
      } else {
        const g = surfacePoint(norm(D.pos), 0.2);
        fxExplosion(add(g, mul(up, 2)), low ? 5 : 7);
        if (!low){ fxExplosion(at(5, 0, 3), 3.5, true); fxExplosion(at(-5, 0, 3), 3.5, true); addWave(add(g, mul(up, 3)), 9, 0.9); }
        for (let k = 0; k < (low ? 8 : 26); k++) S.sparks.push({ pos: add(g, mul(up, 2)), vel: add(mul(up, 8 + random() * 14), mul(randUnit(), 10)), life: 1 + random() * 1.2, big: 1 });
        // самая большая воронка (калибр «large» v8.0, k = 1.2) + урон вокруг
        splash(g, D.team, 220, 14, null, 'x');
        try { if (typeof CR76 !== 'undefined' && CR76.add){ CR80.cal = 'large'; CR76.add(at(4, 2, 0), 12, 200); CR76.add(at(-4, -2, 0), 12, 200); } } catch (e){} finally { if (typeof CR80 !== 'undefined') CR80.cal = null; }
        if (S.cam && dist(S.cam.pos, g) < 160) S.shake = max(S.shake, S.mode === 'fps' ? 1.2 : 0.4);
        addLight(add(g, mul(up, 4)), [60, 30, 10], 70, 1.2, 0.02);
        this.wrecks.push({ k: D.k, team: D.team, g: D.g, pos: add(D.g, mul(norm(D.g), 2)), up: norm(D.pos), fwd: D.fwd, aim: D.aim, legs: D.legs, t: 0 });
        if (this.wrecks.length > 3) this.wrecks.shift();
      }
      D.st++;
    }
    if (D.st >= stages.length) this.deaths.splice(i, 1);
  }
  for (let i = this.wrecks.length - 1; i >= 0; i--){ const W = this.wrecks[i]; W.t += dt; if (!this.low() && random() < dt * 1.2) fxSmoke(add(W.pos, mul(W.up, 2 + random() * 2)), 1.6, 0.15, 0.9); if (W.t > 70) this.wrecks.splice(i, 1); }
};
// ---------------------------------------------------------------- движение: медленный поворот «Бастиона»
{ const ti0 = tankInput;
  tankInput = function(v, dt){
    const inp = ti0.apply(this, arguments);
    if (v.boss83 === 'c' && len(inp.wish) > 0.01) BOSS83.safe(() => {
      const f = tangent(v.fwd, v.up), w = tangent(inp.wish, v.up), c = dot(f, w), m = len(inp.wish);
      v.fwd = tangent(turnToward(f, w, BOSS83.K.c.turn * dt), v.up);
      inp.wish = mul(tangent(v.fwd, v.up), m * max(0, c) * max(0, c));
      if (c < 0.85) v.stuckT = 0;
    }, 'steer');
    return inp;
  }; }
{ const tp0 = tankPlayerInput;
  tankPlayerInput = function(v, dt){
    if (!v.boss83) return tp0.apply(this, arguments);
    const f0 = v.fwd, inp = tp0.apply(this, arguments);
    const mx = (v.boss83 === 'c' ? 0.42 : 1.0) * dt, a = acos(clamp(dot(f0, v.fwd), -1, 1));
    if (a > mx){ v.fwd = tangent(turnToward(f0, v.fwd, mx), v.up); inp.wish = mul(tangent(v.fwd, v.up), dot(inp.wish, v.fwd)); }
    inp.speedMul = min(inp.speedMul, 1.15);
    return inp;
  }; }
{ const al0 = abilList; abilList = function(g){ const L = al0.apply(this, arguments); return g && g.boss83 ? L.filter(k => k !== 'overdrive') : L; }; }
{ const ua0 = useAbility; useAbility = function(g, k){ if (g && g.boss83 && k === 'overdrive') return T82('Недоступно', 'Unavailable'); return ua0.apply(this, arguments); }; }
{ const gl0 = groupLabel; groupLabel = function(g){ return g && g.boss83 ? BOSS83.name(g) : gl0.apply(this, arguments); }; }
// ---------------------------------------------------------------- оружие
{ const af0 = vehicleAimAndFire;
  vehicleAimAndFire = function(v, dt, isPlayer, pin){ if (!v.boss83) return af0.apply(this, arguments); BOSS83.safe(() => BOSS83.fire(v, dt, isPlayer, pin), 'fire'); }; }
BOSS83.side = v => norm(cross(v.fwd, v.up));
BOSS83.fire = function(v, dt, isPlayer, pin){
  const up = v.up, tg = v.target && v.target.alive ? v.target : null;
  v.st83 -= dt; v.rk83 -= dt;
  if (v.boss83 === 'c'){
    const base = add(v.pos, mul(up, 2.4));
    if (!isPlayer){
      if (tg){ const want = norm(sub(centerOf(tg), base)); v.aim = turnToward(v.aim, want, 0.75 * dt);
        if (acos(clamp(dot(v.aim, want), -1, 1)) < 0.06 && v.cd <= 0 && los(base, centerOf(tg))) this.cannon(v); }
      else v.aim = turnToward(v.aim, tangent(v.fwd, up), 0.5 * dt);
    } else if (pin.fire && v.cd <= 0) this.cannon(v);
    this.mgs(v, dt); this.rockets(v, dt);
    return;
  }
  // «Жнец»: луч искажения (заряд 0.9 с) и топот
  const head = add(v.pos, mul(up, 8.4));
  if (v.bm83){
    const B = v.bm83; B.t += dt;
    if (!isPlayer && B.tgt && B.tgt.alive) v.aim = turnToward(v.aim, norm(sub(centerOf(B.tgt), head)), 2.0 * dt);
    if (!this.low() && random() < dt * 14) S.sparks.push({ pos: add(head, mul(v.aim, 2.2)), vel: mul(randUnit(), 3), life: 0.25 });
    if (B.t >= 0.9){ v.bm83 = null; this.beam(v, isPlayer ? null : B.tgt); }
  } else if (!isPlayer){
    if (tg){ const want = norm(sub(centerOf(tg), head)); v.aim = turnToward(v.aim, want, 1.3 * dt);
      if (v.cd <= 0 && acos(clamp(dot(v.aim, want), -1, 1)) < 0.12 && dist(centerOf(tg), head) < 125 && los(head, centerOf(tg))) v.bm83 = { t: 0, tgt: tg }; }
    else v.aim = turnToward(v.aim, tangent(v.fwd, up), 0.8 * dt);
  } else if (pin.fire && v.cd <= 0) v.bm83 = { t: 0, tgt: null };
  if (v.st83 <= 0){
    let want = isPlayer && pin.alt;
    if (!isPlayer){ let n = 0, veh = false;
      for (const e of TGT[v.team]){ if (!e.alive || e.cls === 'bld' || e.cls === 'drone') continue; const d = dist(e.pos, v.pos); if (d < 12){ n++; if (e.cls === 'tank') veh = true; } }
      want = n >= 2 || veh; if (!want) v.st83 = 0.4; }
    if (want) this.stomp(v);
  }
};
BOSS83.cannon = function(v){
  const m = add(add(v.pos, mul(v.up, 2.4)), mul(v.aim, 10.4));
  fire(m, v.aim, v.team, isPlayerSrc(v) ? 0.003 : 0.006, 300, 150, v, 's', { splash: 8 });
  v.cd = 4.2;
  addLight(m, [20, 12, 5], 30, 0.15, 0.02); fxSmoke(m, 1.4, 0.35); addWave(m, 2.2, 0.4);
  emit('cannon', { pos: m, team: v.team, src: v });
  if (v === ctrlEntity()) S.shake = max(S.shake, 0.7);
};
BOSS83.MGP = [[2.55, 2.0, 3.9], [-2.55, 2.0, 3.9]];   // башенки: вбок, вверх, вперёд (от центра корпуса)
BOSS83.mgPos = function(v, i){ const P = this.MGP[i], f = tangent(v.fwd, v.up); return add(add(add(v.pos, mul(this.side(v), P[0])), mul(v.up, P[1])), mul(f, P[2])); };
BOSS83.mgs = function(v, dt){
  for (let i = 0; i < 2; i++){
    const M = v.mg83[i], eye = this.mgPos(v, i);
    M.cd -= dt; M.think -= dt;
    if (!M.aim) M.aim = tangent(v.fwd, v.up);
    if (M.think <= 0){
      M.think = 0.5 + random() * 0.2; M.tgt = null; let bd = 95;
      for (const e of TGT[v.team]){
        if (!e.alive || (e.cls !== 'inf' && e.cls !== 'drone' && e.cls !== 'builder')) continue;
        const d = dist(e.pos, eye); if (d < bd && los(eye, centerOf(e))){ bd = d; M.tgt = e; }
      }
    }
    if (M.tgt && M.tgt.alive){
      const want = norm(sub(centerOf(M.tgt), eye)); M.aim = turnToward(M.aim, want, 3.5 * dt);
      if (M.cd <= 0 && dot(M.aim, want) > 0.985){
        const t0 = v.target; v.target = M.tgt;
        try { gunShootSimple(v, add(eye, mul(M.aim, 1.6)), M.aim, 0.03, WEAPONS.tankmg); } finally { v.target = t0; }
        M.cd = 0.19; emit('shot', { pos: eye, team: v.team, src: v, heavy: true });
      }
    } else M.aim = turnToward(M.aim, tangent(v.fwd, v.up), 1.2 * dt);
  }
};
BOSS83.rockets = function(v, dt){
  if (v.rkq > 0){
    v.rkT -= dt;
    if (v.rkT <= 0){
      v.rkT = 0.16; v.rkq--;
      const te = v.rkTgt && v.rkTgt.alive ? v.rkTgt : null; if (!te){ v.rkq = 0; return; }
      const f = tangent(v.fwd, v.up), m = add(add(add(v.pos, mul(v.up, 2.3)), mul(f, -3.0)), mul(this.side(v), ((v.rkq % 3) - 1) * 0.4));
      const tp = centerOf(te), d = dist(tp, m), dir = norm(add(norm(sub(tp, m)), mul(v.up, 0.04 + d * 0.0009)));
      fire(m, dir, v.team, 0.035, 75, 72, v, 'r', { splash: 3.6, boom: 1.1 });
      addLight(m, [8, 5, 2], 10, 0.08, 0.008);
      if (!this.low()) S.fx.length < 76 && S.fx.push({ type: 'smoke', pos: sub(m, mul(dir, 1.2)), vel: mul(dir, -1.5), r0: 0.4, r1: 1.6, life: 1.4, t: 0, grey: 0.4, dens: 0.9, heat: 0.3 });
      emit('v2', { k: 'rk', pos: m, src: v });
    }
    return;
  }
  if (v.rk83 > 0) return;
  // цель — техника или здание в 30–150 м
  let best = null, bd = 150;
  const cand = v.target && v.target.alive && (v.target.cls === 'tank' || v.target.cls === 'bld') ? [v.target] : TGT[v.team];
  for (const e of cand){
    if (!e.alive || (e.cls !== 'tank' && e.cls !== 'bld')) continue;
    const d = dist(e.pos, v.pos); if (d < 30 || d > bd) continue;
    if (e.seen[v.team] <= 0 && e !== v.target) continue;
    bd = d; best = e;
  }
  if (!best){ v.rk83 = 1.5; return; }
  v.rkTgt = best; v.rkq = 6; v.rkT = 0; v.rk83 = 12; this.stats.salvos++;
};
BOSS83.beam = function(v, tg){
  const head = add(v.pos, mul(v.up, 8.4)), m = add(head, mul(v.aim, 3.0));
  let end;
  if (tg && tg.alive) end = centerOf(tg);
  else if (v === ctrlEntity() && S.cam){ const r = rayCast(S.cam.pos, S.cam.fwd, 170, v.team, true); end = r.pos; }
  else end = add(m, mul(v.aim, 120));
  let dir = norm(sub(end, m)); const L0 = min(140, dist(end, m));
  const r = rayCast(m, dir, L0, v.team, false); end = add(m, mul(dir, min(L0, r.t + 0.5)));
  const L = dist(end, m);
  v.cd = 6.5; this.stats.beams++;
  // все враги вдоль луча
  for (const e of TGT[v.team]){
    if (!e.alive || e.cls === 'bld') continue;
    const c = centerOf(e), t = clamp(dot(sub(c, m), dir), 0, L), dd = len(sub(c, add(m, mul(dir, t))));
    if (dd < hitRadius(e) + 1.6) damage(e, 330, v, 's');
  }
  splash(end, v.team, 160, 6.5, v, 's');
  S.beams.push({ a: m, b: end, t: 0, life: 0.55, team: v.team, rail: 1 });
  S.beams.push({ a: add(m, mul(randUnit(), 0.3)), b: add(end, mul(randUnit(), 0.8)), t: 0, life: 0.4, team: v.team, rail: 1 });
  const nw = this.low() ? 1 : 3;
  for (let i = 1; i <= nw; i++) addWave(add(m, mul(dir, L * i / (nw + 1))), 2.2, 0.55);
  addWave(end, 4, 0.7);
  if (!this.low()) for (let i = 0; i < 12; i++){ const p = add(m, mul(dir, L * random())); S.sparks.push({ pos: p, vel: mul(randUnit(), 4), life: 0.35 }); }
  addLight(m, [16, 2, 1], 30, 0.25, 0.02); addLight(end, [14, 3, 1], 26, 0.3, 0.02);
  emit('cannon', { pos: m, team: v.team, src: v });
  if (v === ctrlEntity()) S.shake = max(S.shake, 0.6);
};
BOSS83.stomp = function(v){
  v.st83 = 7; this.stats.stomps++;
  const p = surfacePoint(norm(v.pos), 0.3), up = norm(p);
  for (const e of TGT[v.team]){
    if (!e.alive || e.cls === 'bld' || e.cls === 'drone' || (e.cls === 'inf' && isAir(e))) continue;
    const d = dist(e.pos, p); if (d < 13) damage(e, 170 * (1 - d / 13 * 0.6), v, 'g');
  }
  knockback(add(p, mul(up, 1)), 260, 10);
  addWave(add(p, mul(up, 1)), 7, 0.7);
  for (let i = 0; i < (this.low() ? 6 : 18); i++){ const a = random() * PI * 2, t1 = anyTangent(up), t2 = cross(up, t1);
    S.sparks.push({ pos: add(p, mul(up, 0.5)), vel: add(mul(add(mul(t1, cos(a)), mul(t2, sin(a))), 9 + random() * 5), mul(up, 2 + random() * 3)), life: 0.5 + random() * 0.4 }); }
  if (!this.low()) for (let k = 0; k < 3; k++) fxSmoke(add(p, mul(randUnit(), 4)), 2.2, 0.35, 0.8);
  if (S.cam && dist(S.cam.pos, p) < 70) S.shake = max(S.shake, S.mode === 'fps' ? 0.6 : 0.2);
  emit('boom', { pos: p, size: 3 });
};
// ---------------------------------------------------------------- камера: всегда снаружи, дальше и выше
if (typeof FPS61 !== 'undefined' && FPS61.vehFP){ const vf0 = FPS61.vehFP; FPS61.vehFP = function(c){ return c && c.boss83 ? false : vf0.apply(this, arguments); }; }
BOSS83.camP = null;
{ const sc0 = setupCamera;
  setupCamera = function(dt){
    sc0.apply(this, arguments);
    const c = ctrlEntity();
    if (!c || !c.boss83 || S.mode !== 'fps' || S.attract || S.camOverride || (typeof CAMFX !== 'undefined' && CAMFX.busy()) || !S.cam){ BOSS83.camP = null; return; }
    BOSS83.safe(() => {
      const K = BOSS83.K[c.boss83], center = add(c.pos, mul(c.up, K.camC)), af = tangent(c.aim, c.up);
      let want = add(add(center, mul(af, -K.camB)), mul(c.up, K.camH));
      if (BOSS83.camP && dist(BOSS83.camP, want) < 30) want = add(BOSS83.camP, mul(sub(want, BOSS83.camP), 1 - Math.exp(-dt * 6)));
      const pos = pullCam(center, want); BOSS83.camP = pos;
      const look = norm(sub(add(center, mul(c.aim, 60)), pos));
      S.cam = Object.assign({}, S.cam, { pos }, camBasis(look, c.up));
    }, 'cam');
  }; }
// рэймарчер босса не рисует (модель — меши v83_mesh.js)
{ const oi0 = objInfo; objInfo = function(e){ return e && e.boss83 ? null : oi0.apply(this, arguments); }; }
// подписи в стратегии
if (typeof r61BldState === 'function'){ const bs0 = r61BldState;
  r61BldState = function(b){
    if (!b || !BOSS83.isBld(b.type) || !b.done) return bs0.apply(this, arguments);
    const q = b.queue[0];
    if (BOSS83.isKey(q)) return T82('собирает', 'assembling') + ' ' + Math.floor(clamp(b.prodT / pTime(b.team, q), 0, 1) * 100) + '%';
    return BOSS83.list(b.team).length ? T82('босс в бою', 'boss deployed') : T82('готов к сборке', 'ready to assemble');
  }; }
// ---------------------------------------------------------------- ИИ
FAC82.aiQ.unshift({ key: 'asm83c', ok: t => BOSS83.on && FAC82.co(t) && S.time >= BOSS83.UNLOCK && FAC82.mine('asm83c', t).length < 1 && FAC82.mine('factory', t).some(b => b.done) && S.teams[t].ore >= 470 });
FAC82.aiQ.unshift({ key: 'asm83s', ok: t => BOSS83.on && FAC82.sw(t) && S.time >= BOSS83.UNLOCK && FAC82.mine('asm83s', t).length < 1 && FAC82.mine('factory', t).some(b => b.done) && S.teams[t].ore >= 470 });
BOSS83.site = function(t, key){
  const foe = S.hq[1 - t].alive ? S.hq[1 - t].pos : mul(BASES[1 - t], RM);
  for (let k = 0; k < 40; k++){
    const rr = 40 + random() * 50, a = (random() - 0.5) * 2.4;
    const t1 = tangent(sub(foe, mul(BASES[t], RM)), BASES[t]), t2 = cross(BASES[t], t1);
    const dir = offsetOnSphere(BASES[t], add(mul(t1, cos(a)), mul(t2, sin(a))), rr);
    if (!siteProblem(t, key, dir)) return dir;
  }
  return null;
};
FAC82.sites.asm83c = t => BOSS83.site(t, 'asm83c');
FAC82.sites.asm83s = t => BOSS83.site(t, 'asm83s');
// заказ босса: в начало плана (ИИ копит руду: при «мало руды» план дальше не идёт), но после самого нужного
FAC82.plans.push(function(t, plan){
  if (!BOSS83.on || !FAC82.aiOk(t)) return;
  const k = BOSS83.kindOf(t), K = BOSS83.K[k];
  if (!S.buildings.some(b => b.alive && b.done && b.team === t && b.type === K.bld)) return;
  if (BOSS83.list(t).length || countQueued(t, [K.key])) return;
  if (S.time - (BOSS83.lostT && BOSS83.lostT[t] || -999) < 120) return;   // после потери — пауза 2 мин
  plan.splice(min(plan.length, 3), 0, ['p', K.key]);
});
BOSS83.lostT = [-999, -999];
BOSS83.aiT = [0, 0]; BOSS83.escT = [0, 0]; BOSS83.flT = [0, 0];
BOSS83.isFree = g => g.manualUntil < S.time && g !== playerGroup() && !g.byPlayer;
BOSS83.ai = function(dt){
  for (const t of [0, 1]){
    if ((this.aiT[t] -= dt) > 0) continue; this.aiT[t] = 1;
    if (!FAC82.aiOk(t) || !S.teams[t].ai || S.over) continue;
    const T = S.teams[t];
    // свой босс: напор на базу врага с сопровождением
    for (const v of this.list(t)){
      if (v.byPlayer || v === ctrlEntity()) continue;
      if (!v.goal || S.time - (v.ord83 || -99) > 6){ v.ord83 = S.time;
        // ближайшая точка противника (там идёт бой), иначе — его база
        let goal = attackPoint(1 - t, v.pos), bd = surfDist(v.pos, goal);
        for (const c of S.cps) if (!c.core && c.owner === 1 - t){ const d = surfDist(v.pos, c.dir); if (d < bd){ bd = d; goal = surfacePoint(c.dir, 1); } }
        setOrder(v, 'attack', goal, { lock: 9 }); }
      if ((this.escT[t] -= 1) <= 0){
        this.escT[t] = 15;
        const cand = groupsOf(t).filter(g => g !== v && !g.boss83 && g.cls !== 'drone' && g.cls !== 'builder' && this.isFree(g) && (isSquad(g) ? !g.solo : true))
          .map(g => ({ g, d: leaderOf(g) ? dist(leaderOf(g).pos, v.pos) : 1e9 })).filter(x => x.d < 170).sort((a, b) => a.d - b.d).slice(0, 3);
        for (const x of cand) setOrder(x.g, 'escort', v.pos, { escort: v, lock: 30 });
      }
    }
    // вражеский босс: фокус, обход, бомбардировка
    for (const B of this.list(1 - t)){
      const known = B.seen[t] > 0 || groupsOf(t).some(g => { const L = leaderOf(g); return L && dist(L.pos, B.pos) < 140; });
      if (!known) continue;
      for (const g of groupsOf(t)){
        if (g.boss83 || g.cls === 'builder' || g === playerGroup() || g.byPlayer) continue;
        const L = leaderOf(g); if (!L || dist(L.pos, B.pos) > 170) continue;
        if (g.focus !== B){ g.focus = B; this.stats.focus++; }
      }
      if ((this.flT[t] -= 1) <= 0){
        this.flT[t] = 12;
        const fwd = tangent(B.fwd, B.up), rear = surfacePoint(norm(add(B.pos, mul(fwd, B.boss83 === 'c' ? -26 : 0))), 0.5);
        const cand = groupsOf(t).filter(g => !g.boss83 && g.cls !== 'drone' && g.cls !== 'builder' && this.isFree(g) && (B.boss83 === 'c' ? true : isSquad(g)))
          .map(g => ({ g, d: leaderOf(g) ? dist(leaderOf(g).pos, B.pos) : 1e9 })).filter(x => x.d < 230).sort((a, b) => a.d - b.d).slice(0, 2);
        for (const x of cand){
          const L = leaderOf(x.g), side = dot(sub(L.pos, B.pos), norm(cross(fwd, B.up))) > 0 ? 1 : -1;
          const wp = B.boss83 === 'c' && x.d > 40 ? surfacePoint(norm(add(add(B.pos, mul(norm(cross(fwd, B.up)), side * 40)), mul(fwd, -10))), 0.5) : null;
          setOrder(x.g, 'attack', rear, { focus: B, lock: 16, wp }); this.stats.flank++;
        }
      }
      if (typeof POWERS !== 'undefined' && POWERS.carpet && T.cmd >= POWERS.carpet.cost && powerLeft(t, 'carpet') <= 0 && typeof AIR81 !== 'undefined'){
        const s = { k: 'carpet', pos: B.pos, dir: AIR81.dirFor(t, B.pos) };
        let bad = false;
        for (const u of [...S.units, ...S.vehicles, ...S.builders]) if (u.alive && u.team === t && AIR81.danger(s, u.pos, 8)){ bad = true; break; }
        if (!bad && !usePower(t, 'carpet', B.pos, 'ai')){ this.stats.carpet++; if (typeof aiPowerNote === 'function') aiPowerNote(t, 'carpet', B.pos); }
      }
    }
  }
};
// ---------------------------------------------------------------- шаг: объявления сборки, смерть, ИИ, подсказки
BOSS83.reset = function(){ this.ann = {}; this.deaths = []; this.wrecks = []; this.aiT = [0, 0]; this.escT = [0, 0]; this.flT = [0, 0]; this.lostT = [-999, -999]; this.camP = null; this.weakSaid = 0; this.tipT = 0; };
FAC82.resets.push(() => BOSS83.reset());
BOSS83.tipT = 0;
FAC82.steps.push(Object.assign(function(dt){
  const B = BOSS83; if (!B.on) return;
  for (const b of S.buildings){
    if (!b.alive || !B.isBld(b.type)) continue;
    const q = b.queue[0];
    if (b.done && B.isKey(q) && b.prodT > 0){ if (!B.ann[b.id]){ B.ann[b.id] = 1; B.stats.built[b.team]++; B.announce(b.team, 'start', b); } }
    else if (!B.isKey(q)) B.ann[b.id] = 0;
  }
  B.deathStep(dt);
  B.ai(dt);
  // подсказки (по одной, один раз вообще)
  if ((B.tipT -= dt) <= 0 && !S.attract && !S.over){
    B.tipT = 1;
    const k = B.kindOf(0);
    if (S.time >= B.UNLOCK && S.buildings.some(b => b.alive && b.done && b.team === 0 && b.type === 'factory'))
      FAC82.tip('boss83u', k === 'c' ? 'Открыт «Сборочный цех»: в нём собирается сверхтяжёлый танк «Бастион» — один на армию. Его слабое место — корма.'
                                     : 'Открыт «Инкубатор»: в нём растёт шагоход «Жнец» — один на армию. Его слабое место — светящееся ядро под брюхом.',
                                     k === 'c' ? 'The "Assembly hall" is unlocked: it builds the super-heavy tank "Bastion" — one per army. Its weak spot is the rear.'
                                     : 'The "Incubator" is unlocked: it grows the "Reaper" walker — one per army. Its weak spot is the glowing core underneath.');
    const foe = B.list(1).find(v => v.seen[0] > 0);
    if (foe) FAC82.tip('boss83e', foe.boss83 === 'c' ? 'Против «Бастиона»: заходите с кормы (урон почти вдвое), бейте авиаударом, Рою — туннелем в тыл.'
                                                     : 'Против «Жнеца»: стреляйте снизу, в светящееся ядро (урон почти вдвое), и бейте авиаударом.',
                                  foe.boss83 === 'c' ? 'Versus the "Bastion": hit it from the rear (nearly double damage), use air strikes, or tunnel behind it.'
                                                     : 'Versus the "Reaper": shoot the glowing core from below (nearly double damage) and use air strikes.');
  }
}, { tag: 'boss83' }));
{ const de1 = destroy;   // пауза ИИ после потери босса
  destroy = function(e){ if (e && e.boss83 && e.alive) BOSS83.lostT[e.team] = S.time; return de1.apply(this, arguments); }; }
// ---------------------------------------------------------------- полоска прочности вверху экрана
BOSS83.bar = null; BOSS83.barT = 0;
BOSS83.mkBar = function(){
  const st = document.createElement('style'); st.id = 'boss83css';
  st.textContent = `#boss83{position:fixed;left:50%;top:max(44px,calc(env(safe-area-inset-top) + 40px));transform:translateX(-50%);width:min(440px,56vw);pointer-events:none;z-index:30;display:none;font:600 12px "Exo 2",sans-serif;color:#f2e6c8;text-align:center;text-shadow:0 1px 2px #000}
#boss83 .b83n{letter-spacing:.08em;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#boss83 .b83n i{font-style:normal;opacity:.7;font-weight:500}
#boss83 .b83b{height:9px;border:1px solid rgba(255,255,255,.45);background:rgba(0,0,0,.55);border-radius:2px;overflow:hidden;position:relative}
#boss83 .b83f{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#ff7a5a,#b8261a);transition:width .25s}
#boss83.own .b83f{background:linear-gradient(#e8dcae,#8f8664)}#boss83.own .b83n{color:#e8dcb8}#boss83.foe .b83n{color:#ffb4a0}
@media (max-width:600px){#boss83{top:max(54px,calc(env(safe-area-inset-top) + 50px));left:calc(50% - 15px);width:150px;font-size:10.5px}#boss83 .b83n{white-space:normal;line-height:1.15}#boss83 .b83b{height:7px}}
@media (max-height:440px){#boss83{top:6px;left:calc(50% + 16px);width:min(290px,34vw);font-size:10.5px}#boss83 .b83b{height:6px}}`;
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'boss83'; d.innerHTML = '<div class="b83n"></div><div class="b83b"><div class="b83f"></div></div>';
  document.body.appendChild(d); this.bar = d;
};
BOSS83.barFrame = function(dt){
  if ((this.barT -= dt) > 0) return; this.barT = 0.1;
  if (!this.bar) this.mkBar();
  let best = null, bd = 1e9;
  const cam = S.cam, open = typeof MENU !== 'undefined' && MENU.isOpen && MENU.isOpen();
  if (cam && !S.attract && !open && this.on) for (const v of S.vehicles){
    if (!v.alive || !v.boss83) continue;
    if (v.team !== 0 && (S.mode === 'fps' ? v.seen[0] <= 0 : fogHidden(v))) continue;
    const d = dist(cam.pos, v.pos), me = v === ctrlEntity();
    if (!me && S.mode === 'fps' && (d > 260 || dot(sub(v.pos, cam.pos), cam.fwd) < 0)) continue;
    if (S.mode === 'rts' && !me){ const p = project(centerOf(v)); if (!p || p[0] < 0 || p[0] > innerWidth || p[1] < 0 || p[1] > innerHeight) continue; }
    const s = me ? -1 : d; if (s < bd){ bd = s; best = v; }
  }
  const el = this.bar;
  if (!best){ if (el.style.display !== 'none') el.style.display = 'none'; return; }
  el.style.display = 'block';
  const cls = best.team === 0 ? 'own' : 'foe'; if (el.className !== cls) el.className = cls;
  const pct = max(0, best.hp / best.maxhp);
  const txt = `${BOSS83.name(best).toUpperCase()} <i>· ${best.team === 0 ? T82('наш', 'ours') : T82('противник', 'enemy')} · ${Math.ceil(pct * 100)} %</i>`;
  if (el._t !== txt){ el._t = txt; el.firstChild.innerHTML = txt; }
  el.querySelector('.b83f').style.width = (pct * 100).toFixed(1) + '%';
};
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0.apply(this, arguments); BOSS83.safe(() => BOSS83.barFrame(dt), 'bar'); }; }
// заголовок вкладки тестовой сборки
{ const al0 = MENU.applyLang; MENU.applyLang = function(){ const r = al0.apply(this, arguments); if (window.PM_ART80 || /v8[0-3]/.test(location.pathname)) document.title = 'Portal Meteor v8.3 test'; return r; }; }
