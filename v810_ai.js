// =====================================================================
//  v8.10 — ИИ: способности «Командира» у своих отрядов + ИИ дожимает вражеского босса (CAI810).
//  • Отряды ИИ (команды с S.teams[t].ai, не отряд игрока и не командуемый) применяют способности v8.5 (AB85):
//    дым при потерях под огнём, фланговый рывок на марше, медик / всплеск регенерации, залп гранат по скоплению,
//    ПТ-ракеты по технике / турели / боссу, мини-барьер (Консорциум, отряд держит позицию под огнём).
//    Перезарядка как у игрока ×1.25; у каждой способности простое условие. Одинаково для обеих сторон.
//  • Босс: ИИ «коммитится» — до 4 ближайших свободных групп в 260 м идут на босса (фокус + обход к слабому месту),
//    танки дают залп по боссу, отряды — ПТ-ракеты; ремонт / регенерация босса под огнём (10 с) не идёт,
//    вне боя — в 2.5 раза медленнее. Бомбардировка по боссу — как в v8.3, но без ожидания полного запаса КО.
//  Хуки — обёртки: aiAbilities, BOSS83.ai, damage(учёт), newMatch. Выключить: ?cai810=0.
// =====================================================================
const CAI810 = {
  on: (() => { try { return new URLSearchParams(location.search).get('cai810') !== '0'; } catch (e){ return true; } })(),
  err: {}, pend: [], walls: [],
  zero(){ return { smoke: [0, 0], sprint: [0, 0], heal: [0, 0], volley: [0, 0], at: [0, 0], atBoss: [0, 0], barrier: [0, 0], commit: [0, 0], tankBoss: [0, 0], noRep: 0 }; },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('CAI810 ' + tag, e); } } },
  CDK: 1.25,
  ok(g){
    if (!this.on || !g || !isSquad(g) || !S.teams[g.team] || !S.teams[g.team].ai) return false;
    if (g === playerGroup() || g.byPlayer || (typeof CMD85 !== 'undefined' && CMD85.on && CMD85.g === g)) return false;
    if (typeof TUT !== 'undefined' && TUT.on) return false;
    if (typeof T72 !== 'undefined' && T72.on) return false;
    return true;
  },
  kit(g){
    const sw = FI76(g.team) === 1, heal = sw ? 'regen' : 'medic';
    if (g.elite) return sw ? ['smoke', 'volley', 'at'] : ['smoke', 'volley', 'at', 'barrier'];
    if (g.solo) return ['smoke', 'sprint', 'at', heal];
    return ['smoke', 'sprint', heal];
  },
  left(g, k){ return max(0, ((g.c85cd || {})[k] || 0) - S.time); },
  hurt(g, s){ let t = -99; for (const u of g.units) if (u.alive && u.lastHurt !== undefined) t = max(t, u.lastHurt); return S.time - t < (s || 3); },
  mark(g, k){ (g.c85cd = g.c85cd || {})[k] = S.time + AB85[k].cd * this.CDK * (typeof CAMP85 !== 'undefined' ? CAMP85.cdK(g) : 1); },
  // ---------------------------------------------------------------- применение
  use(g, k, pt, ent){
    const L = leaderOf(g); if (!L) return false;
    let ok = true;
    if (k === 'smoke'){
      const u = g.units.find(x => x.alive) || L, p = pt.slice();
      emit('throw', { pos: u.pos, src: u });
      this.pend.push({ t: S.time + min(1.2, 0.4 + dist(u.pos, p) / 40), fn: () => CMD85.smokeAt(p) });
    } else if (k === 'sprint'){ g.c85spr = S.time + 7; }
    else if (k === 'barrier') ok = this.barrier(g, L);
    else { const why = CMD85.fx(g, k, pt, ent); ok = !why; }
    if (!ok) return false;
    this.mark(g, k);
    const st = this.stats[k === 'medic' || k === 'regen' ? 'heal' : k]; if (st) st[g.team]++;
    return true;
  },
  barrier(g, L){
    if (typeof FIX88 === 'undefined' || !BTYPES.wall82) return false;
    const up = norm(L.pos), fp = g.foePos || mul(BASES[1 - g.team], RM);
    let f = tangent(sub(fp, L.pos), up); f = len(f) > 1e-3 ? norm(f) : anyTangent(up);
    const s = FIX88.barrierSite(L, f); if (!s.dir) return false;
    const b = makeBuilding('wall82', g.team, s.dir, s.f);
    b.done = true; b.built = 1; b.hp = b.maxhp; b.c810exp = S.time + 40;
    if (typeof bgridDirty === 'function') bgridDirty();
    this.walls.push(b); fxSmoke(add(b.pos, mul(b.up, 1)), 1.2, 0.3); emit('place', { b });
    return true;
  },
  // ---------------------------------------------------------------- решения (раз в такт армии ИИ, ~2 с)
  think(g){
    const L = leaderOf(g); if (!L || !L.alive) return;
    const t = g.team, kit = this.kit(g), has = k => kit.includes(k) && this.left(g, k) <= 0;
    const foes = enemiesNear(t, L.pos, 75), hurt = this.hurt(g), hp = groupHP(g);
    // 1) лечение под огнём
    const heal = kit.find(k => k === 'medic' || k === 'regen');
    if (heal && has(heal) && hp < 0.5 && (hurt || foes.length)){ if (this.use(g, heal)) return; }
    // 2) дым: отряд теряет бойцов под огнём — завеса между ним и врагом
    if (has('smoke') && hurt && hp < 0.6 && foes.length >= 2){
      const c = clusterCenter(foes) || { pos: foes[0].pos };
      const d = dist(L.pos, c.pos), p = surfacePoint(norm(add(L.pos, mul(norm(sub(c.pos, L.pos)), min(25, d * 0.4)))), 0.2);
      if (this.use(g, 'smoke', p)) return;
    }
    // 3) ПТ-ракеты: босс → техника → турель
    if (has('at')){
      let best = null, bs = -1;
      for (const e of enemiesNear(t, L.pos, 105, e => e.cls === 'tank' || (e.cls === 'bld' && (e.type === 'turret' || e.type === 'aa')))){
        const s = (e.boss83 ? 100 : e.cls === 'tank' ? 50 : 20) - dist(e.pos, L.pos) * 0.1;
        if (s > bs && los(add(L.pos, mul(norm(L.pos), 1.6)), centerOf(e))){ bs = s; best = e; }
      }
      if (best && this.use(g, 'at', centerOf(best), best)){ if (best.boss83) this.stats.atBoss[t]++; return; }
    }
    // 4) залп гранат по скоплению пехоты (своих рядом нет)
    if (has('volley')){
      const inf = enemiesNear(t, L.pos, 42, e => e.cls === 'inf' || (e.cls === 'bld' && e.type === 'turret'));
      const c = clusterCenter(inf);
      if (c && (c.n >= 3 || inf.some(e => e.cls === 'bld')) && !S.units.some(u => u.alive && u.team === t && dist2(u.pos, c.pos) < 49) && random() < 0.75){ if (this.use(g, 'volley', c.pos)) return; }
    }
    // 5) мини-барьер: держим позицию (захват/оборона) под огнём
    if (has('barrier') && foes.length >= 2 && hurt && (g.order === 'cap' || g.order === 'hold' || g.order === 'defend' || (g.goal && surfDist(L.pos, g.goal) < 25))){ g.foePos = foes[0].pos; if (this.use(g, 'barrier')) return; }
    // 6) фланговый рывок на марше
    if (has('sprint') && !foes.length && g.goal && surfDist(L.pos, g.goal) > 120 && random() < 0.5){ if (this.use(g, 'sprint')) return; }
  },
  step(){
    for (let i = this.pend.length - 1; i >= 0; i--) if (S.time >= this.pend[i].t){ const p = this.pend.splice(i, 1)[0]; this.safe(p.fn, 'pend'); }
    for (let i = this.walls.length - 1; i >= 0; i--){
      const b = this.walls[i];
      if (!b.alive){ this.walls.splice(i, 1); continue; }
      if (S.time > b.c810exp){ b.alive = false; const j = S.buildings.indexOf(b); if (j >= 0) S.buildings.splice(j, 1); BLD_LIST = S.buildings; if (typeof bgridDirty === 'function') bgridDirty(); fxSmoke(add(b.pos, mul(b.up, 1)), 1.4, 0.35); this.walls.splice(i, 1); }
    }
  },
  // ---------------------------------------------------------------- босс: дожать
  commitT: [0, 0],
  bossCommit(t){
    if ((this.commitT[t] -= 1) > 0) return; this.commitT[t] = 4;
    for (const B of BOSS83.list(1 - t)){
      const known = B.seen && B.seen[t] > 0 || groupsOf(t).some(g => { const L = leaderOf(g); return L && dist(L.pos, B.pos) < 160; });
      if (!known) continue;
      const fwd = tangent(B.fwd, B.up), rear = surfacePoint(norm(add(B.pos, mul(fwd, B.boss83 === 'c' ? -18 : 0))), 0.5);
      // до 4 ближайших свободных групп в 260 м (остальные — по своим задачам: босс не должен «выключать» всю армию)
      const cand = groupsOf(t).filter(g => !g.boss83 && g.cls !== 'builder' && g.cls !== 'drone' && BOSS83.isFree(g) && !(isSquad(g) && g.solo) && leaderOf(g))
        .map(g => ({ g, d: dist(leaderOf(g).pos, B.pos) })).filter(x => x.d < 260).sort((a, b) => a.d - b.d).slice(0, 4);
      const n = cand.length;
      for (const { g, d } of cand){
        const L = leaderOf(g);
        if (g.focus !== B || S.time - (g.c810bo || -99) > 12){
          g.c810bo = S.time;
          const sv = norm(cross(fwd, B.up)), side = dot(sub(L.pos, B.pos), sv) > 0 ? 1 : -1;
          const wp = B.boss83 === 'c' && d > 45 ? surfacePoint(norm(add(add(B.pos, mul(sv, side * 34)), mul(fwd, -8))), 0.5) : null;
          // «Жнец»: стрелять с кольца 22 м (под брюхо лезут только 2 группы обхода v8.3); «Бастион»: к корме
          const ring = surfacePoint(norm(add(B.pos, mul(norm(tangent(sub(L.pos, B.pos), B.up)), 22))), 0.5);
          setOrder(g, 'attack', !isSquad(g) ? B.pos : B.boss83 === 'c' ? rear : ring, { focus: B, lock: 14, wp });
          this.stats.commit[t]++;
        }
        // танки: залп по боссу
        if (!isSquad(g) && g.abil && abilLeft(g, 'barrage') <= 0 && d < 120 && groupKind(g) === 'tank'){ if (!useAbility(g, 'barrage', centerOf(B))) this.stats.tankBoss[t]++; }
      }
      // бомбардировка: хватает КО — бомбим (v8.3 ждал своих не на полосе — та же проверка)
      if (typeof POWERS !== 'undefined' && POWERS.napalm && S.teams[t].cmd >= POWERS.napalm.cost && powerLeft(t, 'napalm') <= 0 && typeof AIR81 !== 'undefined' && n){
        const s = { k: 'napalm', pos: B.pos, dir: AIR81.dirFor(t, B.pos) };
        let bad = false; for (const u of [...S.units, ...S.vehicles, ...S.builders]) if (u.alive && u.team === t && AIR81.danger(s, u.pos, 8)){ bad = true; break; }
        if (!bad && !usePower(t, 'napalm', B.pos, 'ai') && typeof aiPowerNote === 'function') aiPowerNote(t, 'napalm', B.pos);
      }
    }
  },
};
CAI810.stats = CAI810.zero();
if (CAI810.on && typeof CMD85 !== 'undefined' && typeof AB85 !== 'undefined'){
  { const aa0 = aiAbilities; aiAbilities = function(g){ const r = aa0.apply(this, arguments); if (CAI810.ok(g)) CAI810.safe(() => CAI810.think(g), 'think'); return r; }; }
  { const up0 = update; update = function(dt){ const r = up0.apply(this, arguments); CAI810.safe(() => CAI810.step(), 'step'); return r; }; }
  { const nm0 = newMatch; newMatch = function(){ CAI810.pend = []; CAI810.walls = []; CAI810.commitT = [0, 0]; return nm0.apply(this, arguments); }; }
  if (typeof BOSS83 !== 'undefined'){
    const ai0 = BOSS83.ai; BOSS83.ai = function(dt){
      const r = ai0.apply(this, arguments);
      for (const t of [0, 1]) if (BOSS83.on && FAC82.aiOk(t) && S.teams[t].ai && !S.over && BOSS83.aiT[t] >= 0.99) CAI810.safe(() => CAI810.bossCommit(t), 'boss');
      return r;
    };
    // ремонт и регенерация босса: под огнём (6 с) — нет, вне боя — вдвое медленнее
    const bossHeal = () => { for (const v of BOSS83.list()){ if (v.c810hp === undefined){ v.c810hp = v.hp; continue; }
        const d = v.hp - v.c810hp;
        if (d > 0){ const hot = S.time - (v.lastHurt === undefined ? -99 : v.lastHurt) < 10; v.hp = hot ? v.c810hp : v.c810hp + d * 0.4; CAI810.stats.noRep += hot ? d : d * 0.6; }
        v.c810hp = v.hp; } };
    { const dm0 = damage; damage = function(e, dmg){ const r = dm0.apply(this, arguments); if (e && e.boss83) e.c810hp = e.hp; return r; }; }
    { const up1 = update; update = function(dt){ const r = up1.apply(this, arguments); CAI810.safe(bossHeal, 'heal'); return r; }; }
  }
}
