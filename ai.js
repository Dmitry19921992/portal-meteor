// =====================================================================
//  ГРУППЫ: лидер, строй, приказы
// =====================================================================
const FORM = [[-3.5, -3], [3.5, -3], [0, -6.5], [-6.5, -6.5], [6.5, -6.5]];
function leaderOf(g){
  if (!g) return null;
  if (!isSquad(g)) return g.alive ? g : null;
  const playerHere = S.mode === 'fps' && !S.attract && S.me && S.me.alive && S.me.squad === g;
  if (playerHere && !S.follow) return S.me;
  return g.units.find(u => u.alive && !(playerHere && u === S.me)) || g.units.find(u => u.alive) || null;
}
function leaderPos(g){ const L = leaderOf(g); return L ? L.pos : null; }
// куда атаковать базу команды team: штаб, а если он разрушен — ближайшее ключевое здание
function assaultTarget(team, from){
  const b = BASES[team];
  if (S.hq[team].alive) return { pos: add(mul(b, RM), mul(tangent(sub(from, mul(b, RM)), b), 26)), ent: S.hq[team] };
  let best = null, bd = 1e9;
  for (const x of keyBuildings(team)){ const d = dist(x.pos, from); if (d < bd){ bd = d; best = x; } }
  if (best) return { pos: add(best.pos, mul(tangent(sub(from, best.pos), best.up), best.rad + 14)), ent: best };
  return { pos: add(mul(b, RM), mul(tangent(sub(from, mul(b, RM)), b), 26)), ent: null };
}
function attackPoint(team, from){ return assaultTarget(team, from).pos; }
function launchSpot(team, from){
  const b = BASES[team];
  return add(mul(b, RM), mul(tangent(sub(from, mul(b, RM)), b), 28));
}
function entName(e){
  if (!e) return '';
  if (e.cls === 'inf') return groupLabel(e.squad) + (e.team ? tr(' Роя', ' (Swarm)', ' (Bầy Đàn)') : '');
  if (e.cls === 'tank') return e.team ? (e.vk ? V2.name(e) + tr(' Роя', ' (Swarm)', ' (Bầy Đàn)') : tr('танк Роя', 'Swarm tank', 'xe tăng Bầy Đàn')) : groupLabel(e);
  if (e.cls === 'drone') return e.team ? tr('дрон Роя', 'Swarm drone', 'drone Bầy Đàn') : groupLabel(e);
  if (e.cls === 'bld') return bname(e.type) + (e.team ? tr(' Роя', ' (Swarm)', ' (Bầy Đàn)') : '');
  if (e.cls === 'hq') return e.team ? tr('штаб Роя', 'Swarm HQ', 'sở chỉ huy Bầy Đàn') : tr('наш штаб', 'our HQ', 'sở chỉ huy của ta');
  if (e.cls === 'prop') return N2(PROP_KINDS[e.kind].n);
  return '';
}
function orderText(g){
  if (!g) return '';
  if (g.cls === 'builder') return builderDoing(g);
  switch (g.order){
    case 'cap': return g.cp ? (g.cp.core ? tr('Захватить Ядро', 'Capture the Core', 'Chiếm Lõi') : tr(`Захватить точку ${g.cp.name}`, `Capture point ${g.cp.name}`, `Chiếm điểm ${g.cp.name}`)) : tr('Захват', 'Capture', 'Chiếm');
    case 'attack': return S.hq[1 - g.team].alive ? (g.team === 0 ? tr('Атаковать штаб Роя', 'Assault the Swarm HQ', 'Tấn công sở chỉ huy Bầy Đàn') : tr('Атаковать наш штаб', 'Assault our HQ', 'Tấn công sở chỉ huy của ta')) : tr('Уничтожить ключевые здания', 'Destroy key buildings', 'Phá các công trình then chốt');
    case 'defend': return tr('Оборонять базу', 'Defend the base', 'Bảo vệ căn cứ');
    case 'hold': return tr('Удерживать позицию', 'Hold position', 'Giữ vị trí');
    case 'sky': return tr('Десант через купол', 'Sky assault through the dome', 'Đổ bộ xuyên mái vòm');
    case 'move': return tr('Выдвинуться в точку', 'Move to position', 'Di chuyển tới vị trí');
    case 'focus': return tr(`Уничтожить: ${entName(g.focus)}`, `Destroy: ${entName(g.focus)}`, `Tiêu diệt: ${entName(g.focus)}`);
    case 'retreat': return tr('Отступить на ремонт', 'Fall back for repairs', 'Rút về sửa chữa');
    case 'escort': return tr(`Поддержать: ${groupLabel(g.escort)}`, `Support: ${groupLabel(g.escort)}`, `Yểm trợ: ${groupLabel(g.escort)}`);
    default: return tr('Ожидание', 'Standing by', 'Đang chờ lệnh');
  }
}
function orderSpeech(g){
  switch (g.order){
    case 'cap': return g.cp ? tr(`захватить ${cpSay(g.cp)}`, `capture ${cpSay(g.cp)}`, `chiếm ${cpSay(g.cp)}`) : tr('захват', 'capture', 'chiếm');
    case 'attack': return tr('атаковать базу противника', 'assault the enemy base', 'tấn công căn cứ địch');
    case 'defend': return tr('оборонять базу', 'defend the base', 'bảo vệ căn cứ');
    case 'sky': return tr('десант через купол на базу противника', 'sky assault through the dome onto the enemy base', 'đổ bộ xuyên mái vòm xuống căn cứ địch');
    case 'move': return tr('выдвинуться в указанную точку', 'move to the marked position', 'di chuyển tới vị trí đã đánh dấu');
    case 'hold': return tr('удерживать позицию', 'hold position', 'giữ vị trí');
    default: return orderText(g);
  }
}
// приказ группе. opts: cp, focus, by ('player'|'ai'), lock (сек ручного режима)
function setOrder(g, order, goal, opts){
  opts = opts || {};
  if (g.order !== order || !g.goal || !goal || dist(g.goal, goal) > 12) g.wp = opts.wp || null;
  g.order = order; g.goal = goal; g.cp = opts.cp || null; g.focus = opts.focus || null; g.escort = opts.escort || null; g.rush = !!opts.rush;
  if (order !== 'sky') g.sky = null;
  if (opts.lock) g.manualUntil = S.time + opts.lock;
  if (opts.by === 'player') emit('ack', { g, order });
}
// стратегическое распоряжение ИИ: группе игрока — через тактика (он решает, когда переключить)
function assign(g, order, goal, opts){
  if (g === playerGroup()){ g.strat = { order, goal, cp: (opts && opts.cp) || null, t: S.time, wp: (opts && opts.wp) || null }; return; }
  setOrder(g, order, goal, opts);
}

// текущая цель движения группы: промежуточная точка маршрута (обход), сопровождение или сама цель
function groupGoal(g){
  if (g.wp){
    const L = leaderOf(g);
    if (!L || surfDist(L.pos, g.wp) < 15) g.wp = null; else return g.wp;
  }
  if (g.order === 'escort' && g.escort && groupAlive(g.escort)){ const EL = leaderOf(g.escort); if (EL) return add(EL.pos, mul(tangent(EL.fwd, EL.up), -9)); }
  return g.goal;
}
// точка обхода с фланга на пути от from к to
function flankWaypoint(from, to, side, off){
  const up = norm(from), dir = tangent(sub(to, from), up);
  const D = surfDist(from, to);
  const mid = add(add(from, mul(dir, D * 0.55)), mul(norm(cross(up, dir)), side * (off || 70)));
  return surfacePoint(norm(mid), 0.5);
}
// бой с остановкой (атака в движении): группа не прёт вперёд, а занимает укрытия и отстреливается
function holdAdvance(sq){
  if (!sq.combat || sq.rush || sq.order === 'sky' || sq.order === 'retreat' || sq.order === 'focus' || sq.foeDist > 50) return false;
  if (S.mode === 'fps' && !S.attract && S.me && S.me.squad === sq && !S.follow) return false;
  const L = leaderOf(sq), g = groupGoal(sq);
  if (L && g && sq.order === 'cap' && surfDist(L.pos, g) < 35) return false;
  return true;
}
function findCover(u, foePos, L){
  const anchor = L && L !== u ? L.pos : u.pos;
  let best = null, bd = 1e9;
  const consider = (c, r) => {
    const dA = dist(c, anchor); if (dA > 26) return;
    const away = tangent(sub(c, foePos), norm(c));
    const spot = add(c, mul(away, r + 1.3));
    if (dist(foePos, spot) < 9) return;
    const d = dist(spot, u.pos) + 0.5 * dA;
    if (d < bd){ bd = d; best = spot; }
  };
  for (const p of PROPS) if (p.alive && dist2(p.pos, anchor) < 1100) consider(p.pos, p.bound * 0.5);
  for (const b of S.buildings) if (b.alive && b.team === u.team && dist2(b.pos, anchor) < 1100) consider(b.pos, b.rad);
  if (!best) return null;
  const up = norm(best), side = norm(cross(up, tangent(sub(best, foePos), up)));
  best = add(best, mul(side, ((u.id % 3) - 1) * 1.7));
  return surfacePoint(norm(best), 0.5);
}
// раз в полсекунды: в бою ли отряд, укрытия, медик
function squadThink(dt){
  for (const sq of S.squads){
    sq.thinkT = (sq.thinkT || 0) - dt;
    if (sq.thinkT > 0) continue;
    sq.thinkT = 0.5;
    let foe = null, fd = 1e9;
    for (const u of sq.units){ const t = u.target; if (t && t.alive && t.cls !== 'bld' && t.cls !== 'hq'){ const d = dist(t.pos, u.pos); if (d < fd){ fd = d; foe = t; } } }
    sq.foeDist = fd;
    if (foe && fd < 75){ sq.combat = true; sq.foePos = foe.pos; sq.combatUntil = S.time + 4; }
    else if (S.time > (sq.combatUntil || 0)) sq.combat = false;
    if (sq.combat && S.time > (sq.coverT || 0)){
      sq.coverT = S.time + 2.5;
      const L = leaderOf(sq);
      for (const u of sq.units) if (u !== S.me) u.cover = findCover(u, sq.foePos, L);
    }
    if (!sq.combat) for (const u of sq.units) u.cover = null;
    for (const u of sq.units) u.crouch = sq.combat && u.grounded && u.moveAmt < 0.3;
    // инженер чинит подбитую технику рядом
    const eng = sq.units.find(u => u.role === 'medic' && u !== S.me && !u.healTo && u.hp > u.maxhp * 0.5);
    if (eng && !sq.combat){
      const tk = S.vehicles.find(v => v.alive && v.team === sq.team && v.hp < v.maxhp * 0.6 && dist(v.pos, eng.pos) < 35);
      if (tk){ eng.healTo = tk; eng.healStart = S.time; }
    }
    // медик: самый здоровый подбегает к самому раненому и чинит его
    sq.medT = (sq.medT || 0) - 0.5;
    if (sq.medT <= 0 && !sq.units.some(u => u.healTo)){
      const pat = sq.units.filter(u => u.hp < u.maxhp * 0.45).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
      if (pat){
        const med = sq.units.filter(u => u !== pat && u !== S.me && u.hp > u.maxhp * 0.55 && !u.parked && !u.leapT && !u.skyState).sort((a, b) => (a.role === 'medic' ? -30 : 0) + dist(a.pos, pat.pos) - (b.role === 'medic' ? -30 : 0) - dist(b.pos, pat.pos))[0];
        if (med && dist(med.pos, pat.pos) < 45){
          med.healTo = pat; med.healStart = S.time; sq.medT = 22;
          if (pat === S.me && !S.attract){ if (!SQUADUI.say('heal', med, { name: tr('командир', 'commander', 'chỉ huy') }, 5)) emit('radio', { text: tr('Держись, иду чинить!', 'Hold on, coming to patch you up!', 'Cố lên, tôi tới sửa cho bạn đây!'), pri: 1 }); feed(tr(`Медик ${callsign(med)} идёт к тебе`, `Medic ${callsign(med)} is on the way`, `Quân y ${callsign(med)} đang tới chỗ bạn`), '#8fffaa'); }
          else if (!S.attract && random() < 0.5) SQUADUI.say('heal', med, { name: callsign(pat) }, 20);
        }
      }
    }
  }
}

// =====================================================================
//  ИИ пехоты
// =====================================================================
function goalFor(u){
  const sq = u.squad, L = leaderOf(sq);
  if (sq.combat && u.cover && !sq.rush && (L !== u || holdAdvance(sq))) return u.cover;
  if (L && L !== u && L.cls === 'inf'){
    const alive = sq.units.filter(x => x.alive && x !== L);
    const off = FORM[max(0, alive.indexOf(u)) % FORM.length];
    const f = tangent(L.fwd, L.up), r = norm(cross(f, L.up));
    return add(L.pos, add(mul(r, off[0]), mul(f, off[1])));
  }
  if (sq.focus && sq.focus.alive){
    // подходим на «среднюю» дистанцию — там оружие бьёт сильнее
    const fp = centerOf(sq.focus), d = dist(fp, u.pos);
    if (d > 32) return fp;
    return u.pos;
  }
  if (holdAdvance(sq)) return u.pos;
  // враг далеко — сближаемся до средней дистанции, где оружие бьёт сильнее
  if (sq.combat && sq.foeDist > 50 && !sq.rush && sq.order !== 'sky' && sq.order !== 'retreat' && sq.foePos) return add(sq.foePos, mul(tangent(sub(u.pos, sq.foePos), norm(sq.foePos)), 38));
  return groupGoal(sq);
}
function botInput(u, dt){
  const r = len(u.pos), Up = mul(u.pos, 1 / r);
  const inp = { wish: [0,0,0], speedMul: 1, jump: false, thrust: false, thrustDir: Up, lift: false, fire: false, aim: null, rocket: false };
  const sq = u.squad;
  u.think -= dt;
  if (u.think <= 0){
    u.think = 0.25 + random() * 0.12;
    const eye = add(u.pos, mul(u.up, RULES.EYE));
    const R = roleOf(u);
    u.target = findTarget(u, u.team, eye, { range: R.range || GAME.RANGE, structures: true, focus: sq.focus, prefer: R.prefer });
  }
  if (u.parked) return withFire(u, inp);
  // медик: бежим к раненому и чиним
  if (u.healTo){
    const p = u.healTo;
    if (!p.alive || p.hp >= p.maxhp * 0.95 || S.time - u.healStart > 16) u.healTo = null;
    else {
      const d = dist(u.pos, p.pos);
      if (d > (p.cls === 'tank' ? 3.8 : 2.2)){ inp.wish = tangent(sub(p.pos, u.pos), Up); inp.speedMul = 1.8; }
      else {
        p.hp = min(p.maxhp, p.hp + 16 * dt * (roleOf(u).heal || 1) * (p.cls === 'tank' ? 1.6 : 1));
        if (random() < dt * 14) S.sparks.push({ pos: add(add(u.pos, mul(u.up, 0.5)), mul(randUnit(), 0.3)), vel: mul(sub(p.pos, u.pos), 2), life: 0.35, heal: 1 });
        if (p === S.me) S.healGlow = 0.4;
      }
      return withFire(u, inp);
    }
  }
  // прыжок-рывок (способность)
  if (u.leapT > 0) return leapInput(u, inp, dt);
  // десант через купол
  if (sq.order === 'sky' && sq.sky === 'launch' && u.skyState) return skyInput(u, inp, dt);

  const L = leaderOf(sq);
  const gg = groupGoal(sq);
  const goalCore = !!(gg && len(gg) < 60 && !(S.mode === 'fps' && L === S.me));
  const goal = goalCore ? gg : goalFor(u);
  if (underground(u.pos)){
    if (goalCore){
      if (r < 140 && len(u.vel) > 3){ inp.thrust = true; inp.thrustDir = norm(mul(u.vel, -1)); }
    } else {
      const gdir = goal ? norm(goal) : Up;
      if (r < CORE_R - 2){ inp.thrust = true; inp.thrustDir = norm(sub(mul(bestAxis(gdir), 45), u.pos)); }
      inp.lift = true;
      if (r > RM - 30 && goal){ inp.thrust = true; inp.thrustDir = norm(add(mul(Up, 0.8), tangent(sub(goal, u.pos), Up))); }
    }
  } else if (goal){
    let v = sub(goal, u.pos);
    if (goalCore) v = sub(mul(bestAxis(Up), RM), u.pos);
    const t = sub(v, mul(Up, dot(v, Up)));
    const dd = len(t);
    const arrive = L === u ? 5 : 1.5;
    if (dd > arrive || goalCore){
      inp.wish = dd > 1e-3 ? norm(t) : anyTangent(Up);
      inp.speedMul = dd > 8 ? 1.7 : 1;
      if (L === u && u !== S.me){
        const lag = sq.units.some(x => x !== u && x.alive && dist(x.pos, u.pos) > 28);
        if (lag) inp.speedMul = 0.7;
      }
      if (u.grounded && dd > 70 && u.energy >= u.jet.emax * 0.95 && random() < 0.02) u.hopT = min(u.jet.emax * 0.6, 1.4);
      const vt = len(sub(u.vel, mul(Up, dot(u.vel, Up))));
      if (u.grounded && vt < 0.5) u.stuckT += dt; else u.stuckT = max(0, u.stuckT - dt);
      if (u.stuckT > 1.2){ inp.jump = true; u.hopT = 0.7; u.stuckT = 0; }
    }
    // держим среднюю дистанцию: слишком близко — отходим боком
    if (u.target && u.target.alive && u.target.cls === 'inf'){
      const dT = dist(u.target.pos, u.pos);
      if (dT < (u.role === 'sniper' ? 38 : 11)){ const away = tangent(sub(u.pos, u.target.pos), Up), side = norm(cross(Up, away)); inp.wish = norm(add(mul(away, 0.8), mul(side, (u.id % 2 ? 0.6 : -0.6)))); inp.speedMul = 1.2; }
    }
  }
  if (u.hopT > 0){
    u.hopT -= dt;
    inp.thrust = true;
    inp.thrustDir = norm(add(mul(Up, 0.55), len(inp.wish) > 0 ? inp.wish : tangent(u.fwd, Up)));
  }
  // мягкая посадка после полёта
  if (!u.grounded && u.airT > 1.5 && dot(u.vel, Up) < -9 && altitude(u.pos) < 15 + dot(u.vel, Up) * dot(u.vel, Up) / (2 * max(4, u.jet.thrust - RULES.G))){
    inp.thrust = true; inp.thrustDir = norm(mul(u.vel, -1));
  }
  return withFire(u, inp);
}
function withFire(u, inp){
  const tg = u.target;
  if (tg && tg.alive){
    const aimP = centerOf(tg);
    const eye = add(u.pos, mul(u.up, RULES.EYE * 0.8));
    inp.aim = norm(sub(aimP, eye));
    inp.fire = true;
    const d = dist(aimP, eye);
    if ((tg.cls === 'tank' || tg.cls === 'bld' || tg.cls === 'hq') && u.rocketCd <= 0 && d < 80) inp.rocket = true;
  }
  return inp;
}
function leapInput(u, inp, dt){
  const Up = norm(u.pos);
  u.leapT -= dt;
  const t = tangent(sub(u.leapTo, u.pos), Up);
  const d = surfDist(u.pos, u.leapTo);
  inp.wish = t;
  if (u.leapT > 1.1) { inp.boost = 16; inp.boostDir = norm(add(mul(Up, 0.85), mul(t, 0.55))); }
  else if (d > 6){ inp.boost = 7; inp.boostDir = norm(add(mul(Up, 0.35), t)); }
  if (!u.grounded && dot(u.vel, Up) < -7 && altitude(u.pos) < 25){ inp.boost = 12; inp.boostDir = norm(add(mul(u.vel, -1), mul(Up, 0.5))); }
  if (u.grounded && u.leapT < 1.0) u.leapT = 0;
  return withFire(u, inp);
}
function skyInput(u, inp, dt){
  const Up = norm(u.pos);
  if (u.skyState === 'up'){
    inp.thrust = true;
    inp.thrustDir = Up;
    if (u.teleports > u.tp0){ u.skyState = 'down'; }
  } else if (u.skyState === 'down'){
    const goal = assaultTarget(1 - u.team, u.pos).pos;
    const t = tangent(sub(goal, u.pos), Up);
    inp.wish = t;
    const vr = dot(u.vel, Up), alt = altitude(u.pos);
    if ((alt < 90 || alt < 20 + vr * vr / (2 * max(4, u.jet.thrust - RULES.G))) && vr < -7){ inp.thrust = true; inp.thrustDir = norm(add(mul(u.vel, -1), mul(t, 3))); }
    else if (alt > 90 && u.energy > 1){ inp.thrust = random() < 0.3; inp.thrustDir = norm(add(mul(Up, -0.2), t)); }
    if (u.grounded){ u.skyState = null; if (S.stats.landed && surfDist(u.pos, BASES[1 - u.team]) < 200) S.stats.landed[u.team]++; }
  }
  return withFire(u, inp);
}

// =====================================================================
//  ИИ танков (автономные)
// =====================================================================
function tankInput(v, dt){
  const Up = norm(v.pos);
  const inp = { wish: [0,0,0], speedMul: 1, jump: false, thrust: false, thrustDir: Up, lift: false };
  v.think -= dt;
  if (v.think <= 0){
    v.think = 0.4 + random() * 0.15;
    const eye = add(v.pos, mul(v.up, 0.6));
    v.target = findTarget(v, v.team, eye, { range: 120, structures: true, prefer: 'tank', focus: v.focus });
  }
  let goal = groupGoal(v);
  if (v.focus && v.focus.alive) goal = centerOf(v.focus);
  if (goal && len(goal) < 60) goal = null;     // в ядро танки не лезут
  // застрял под землёй (упал в шахту) — эвакуация через 8 с
  if (len(v.pos) < RM - 12){ v.underT = (v.underT || 0) + dt; inp.lift = true; if (v.underT > 8){ v.pos = surfacePoint(stepToward(norm(v.pos), anyTangent(norm(v.pos)), 40 / RM), 1.5); v.vel = [0, 0, 0]; v.underT = 0; } return inp; }
  if (goal){
    const vv = sub(goal, v.pos), t = sub(vv, mul(Up, dot(vv, Up))), dd = len(t);
    if (dd > (v.order === 'escort' ? 6 : 9)){
      let w = norm(t);
      if (v.target && dist(centerOf(v.target), v.pos) < 45 && v.target.cls !== 'hq') w = mul(w, 0.0);   // стоять и стрелять
      if (v.evadeT > 0){ v.evadeT -= dt; w = norm(cross(Up, w)); }
      for (const a of AXES){
        const m = mul(a, RM), dm = surfDist(v.pos, m);
        if (dm < 30 && len(w) > 0){
          const away = tangent(sub(v.pos, m), Up);
          w = norm(add(w, mul(away, (30 - dm) / 30 * 2.5)));
        }
      }
      for (const p of PROPS){
        if (!p.alive) continue;
        const dm = dist(v.pos, p.pos);
        if (dm < p.bound + 6 && len(w) > 0){ const away = tangent(sub(v.pos, p.pos), Up); w = norm(add(w, mul(away, 1.2))); }
      }
      inp.wish = w;
      const vt = len(sub(v.vel, mul(Up, dot(v.vel, Up))));
      if (len(w) > 0 && vt < 0.6) v.stuckT += dt; else v.stuckT = max(0, v.stuckT - dt);
      if (v.stuckT > 2){ v.stuckT = 0; v.evadeT = 1.5; }
    }
  }
  return inp;
}
function vehicleAimAndFire(v, dt, isPlayer, pin){
  const muzzleBase = add(v.pos, mul(v.up, 0.5));
  if (!isPlayer){
    if (v.target && v.target.alive){
      const want = norm(sub(centerOf(v.target), muzzleBase));
      v.aim = turnToward(v.aim, want, 1.6 * dt);
      const ang = acos(clamp(dot(v.aim, want), -1, 1));
      const d = dist(centerOf(v.target), muzzleBase);
      const heavy = v.target.cls === 'tank' || v.target.cls === 'bld' || v.target.cls === 'hq' || d > 50;
      if (ang < 0.08 && v.cd <= 0 && heavy) fireCannon(v);
      if (ang < 0.15 && v.mgCd <= 0 && (v.target.cls === 'inf' || v.target.cls === 'drone' || v.target.cls === 'builder')) fireMG(v, 0.035);
    } else v.aim = turnToward(v.aim, v.fwd, 1.0 * dt);
  } else {
    if (pin.fire && v.cd <= 0) fireCannon(v);
    if (pin.alt && v.mgCd <= 0) fireMG(v, 0.02);
  }
}
function fireCannon(v){
  const m = add(add(v.pos, mul(v.up, 0.5)), mul(v.aim, 3.4));
  fire(m, v.aim, v.team, 0.006, 120, 140, v, 's', { splash: 6 });
  v.cd = 2.6;
  addLight(m, [14, 9, 4], 22, 0.12, 0.02);
  fxSmoke(m, 0.9, 0.35);
  addWave(m, 1.4, 0.35);
  emit('cannon', { pos: m, team: v.team, src: v });
  if (v === ctrlEntity()) S.shake = max(S.shake, 0.5);
}
function fireMG(v, spread){
  const m = add(add(v.pos, mul(v.up, 0.5)), mul(v.aim, 2.8));
  gunShootSimple(v, m, v.aim, spread, WEAPONS.tankmg);   // v6: мгновенная пуля
  v.mgCd = v === ctrlEntity() ? 0.1 : 0.22;
  emit('shot', { pos: m, team: v.team, src: v, heavy: true });
}
function turnToward(a, b, maxAng){
  const ang = acos(clamp(dot(a, b), -1, 1));
  if (ang < 1e-4) return b;
  const t = min(1, maxAng / ang);
  return norm(add(mul(a, 1 - t), mul(b, t)));
}

// =====================================================================
//  ДРОНЫ (автономные) и СТРОИТЕЛИ
// =====================================================================
function flyTo(e, goalPos, alt, speed, dt){
  const Up = norm(e.pos);
  e.grT -= dt;
  if (e.grT <= 0){ e.grT = 0.4 + random() * 0.2; e.gr = groundR(Up); }
  const wantR = e.gr + alt;
  const r = len(e.pos);
  let hv = [0, 0, 0];
  if (goalPos){
    const v = sub(goalPos, e.pos), t = sub(v, mul(Up, dot(v, Up)));
    const d = len(t);
    if (d > 2) hv = mul(norm(t), min(speed, d * 0.8));
  }
  const vr = clamp((wantR - r) * 1.2, -8, 8);
  const want = add(hv, mul(Up, vr));
  e.vel = add(e.vel, mul(sub(want, e.vel), 1 - Math.exp(-dt * 2.5)));
  e.pos = add(e.pos, mul(e.vel, dt));
  if (len(e.pos) > S.R - 5) e.pos = mul(norm(e.pos), S.R - 5);
  collide(e);
  e.up = norm(e.pos);
  const hvel = sub(e.vel, mul(e.up, dot(e.vel, e.up)));
  if (len(hvel) > 0.5) e.fwd = turnToward(tangent(e.fwd, e.up), norm(hvel), 3 * dt);
  else e.fwd = tangent(e.fwd, e.up);
  e.phase += dt * 30;
}
function droneGoalPos(d){
  if (d.kamikaze) return d.kamikaze;
  if (d.focus && d.focus.alive) return centerOf(d.focus);
  if (d.goal && (d.manualUntil > S.time || d.order === 'move' || d.order === 'cap' || d.order === 'hold')) return d.goal;
  if (d.escort && groupAlive(d.escort)){ const L = leaderOf(d.escort); if (L) return add(L.pos, mul(L.up, 2)); }
  const T = S.teams[d.team];
  if (T.droneGoal) return T.droneGoal;
  if (d.goal) return d.goal;
  return add(mul(BASES[d.team], RM), mul(anyTangent(BASES[d.team]), 30));
}
function droneStep(d, dt){
  d.think -= dt;
  if (d.think <= 0){ d.think = 0.35 + random() * 0.2; d.target = findTarget(d, d.team, d.pos, { range: 85, structures: true, focus: d.focus }); }
  let goal = droneGoalPos(d);
  if (d.kamikaze){
    flyTo(d, goal, 2, 26, dt);
    if (dist(d.pos, d.kamikaze) < 5 || d.grounded){ splash(d.pos, d.team, 160, 7, d, 'g'); fxExplosion(d.pos, 2.4); destroy(d, null); }
    return;
  }
  if (d.target && d.target.alive){
    const c = centerOf(d.target);
    const Up = norm(d.pos);
    const toT = tangent(sub(c, d.pos), Up);
    const side = norm(cross(Up, toT));
    goal = add(c, add(mul(side, 18 * d.orbit), mul(toT, -10)));
    d.aim = norm(sub(c, d.pos));
    d.cd -= dt;
    // v6: новая цель — дрон «зависает» и наводится 0.5–0.9 с (окно, чтобы его сбить), затем стреляет мгновенными пулями
    if (d.lastTgt !== d.target){ d.lastTgt = d.target; d.windT = 0.5 + random() * 0.4; }
    if (d.windT > 0){ d.windT -= dt; goal = add(d.pos, mul(d.vel, 0.2)); }
    else if (d.cd <= 0 && dist(c, d.pos) < 75 && los(d.pos, c)){
      gunShootSimple(d, add(d.pos, mul(d.aim, 1.0)), d.aim, 0.03, WEAPONS.drone);
      d.cd = 0.28 + random() * 0.1;
      emit('shot', { pos: d.pos, team: d.team, src: d });
    }
  } else d.aim = d.fwd;
  flyTo(d, goal, d.alt, 13, dt);
}
// v5: летающие дроны-строители (больше не используется; v6 — инженеры, rts_build.js: builderStep)
function builderStepV5(b, dt){
  if (!b.job || !b.job.alive || (b.job.done && b.job.hp >= b.job.maxhp)){
    b.job = null;
    let best = null, bd = 1e9;
    for (const x of S.buildings){
      if (!x.alive || x.team !== b.team) continue;
      const need = !x.done ? 0 : (x.hp < x.maxhp * 0.98 ? 150 : 1e9);
      if (need >= 1e9) continue;
      const d = dist(x.pos, b.pos) + need;
      if (d < bd){ bd = d; best = x; }
    }
    const hq = S.hq[b.team];
    if (!best && hq.alive && hq.hp < hq.maxhp * 0.98 && S.time - hq.lastHit > 15) best = hq;
    b.job = best;
  }
  let goal, alt = 9;
  if (b.job){
    const j = b.job;
    const top = j.cls === 'hq' ? add(j.pos, mul(BASES[j.team], 8)) : add(j.pos, mul(j.up, j.H * max(0.3, j.built) + 3));
    goal = j.cls === 'hq' ? add(j.pos, mul(anyTangent(BASES[j.team]), 18 * (b.id % 2 ? 1 : -1))) : add(j.pos, mul(j.fwd, (b.id % 2 ? 1 : -1) * (j.rad + 3)));
    alt = j.cls === 'hq' ? 16 : j.H * max(0.3, j.built) + 4;
    if (dist(b.pos, top) < (j.rad || 12) + 12){
      if (j.cls === 'bld' && !j.done){
        const B = BTYPES[j.type];
        const k = j.team === 1 ? DK().eco : 1;
        j.built = min(1, j.built + dt * k / B.time);
        j.hp = min(j.maxhp, j.hp + j.maxhp * 0.85 * dt * k / B.time);
        if (j.built >= 1){ j.done = true; emit('built', { b: j }); }
      } else if (j.cls === 'bld') j.hp = min(j.maxhp, j.hp + j.maxhp * 0.01 * dt);
      else if (S.time - j.lastHit > 12) j.hp = min(j.maxhp, j.hp + 8 * dt);
      b.beam = top;
    } else b.beam = null;
  } else {
    const a = S.time * 0.3 + b.id;
    const home = builderHome(b.team) || b.pos;
    const base = norm(home), t1 = anyTangent(base), t2 = cross(base, t1);
    goal = add(mul(base, RM), add(mul(t1, cos(a) * 20), mul(t2, sin(a) * 20)));
    b.beam = null; alt = 14;
  }
  flyTo(b, goal, alt, 11, dt);
}

// =====================================================================
//  ТУРЕЛИ, ПВО, ПУШКА ШТАБА
// =====================================================================
function turretStep(b, dt, pin){
  if (!b.done) return;
  const gun = gunPos(b);
  b.cd -= dt;
  const isAA = b.type === 'aa';
  if (pin){
    if (pin.fire && b.cd <= 0) turretShoot(b, gun, b.aim, 0.012);
    return;
  }
  b.think -= dt;
  if (b.think <= 0){
    b.think = 0.3 + random() * 0.1;
    b.target = isAA ? findTarget(b, b.team, gun, { range: 180, air: true, structures: false })
                    : findTarget(b, b.team, gun, { range: 85, structures: false });
    if (b.target && b.target.cls === 'hq') b.target = null;
  }
  if (b.target && b.target.alive){
    const c = centerOf(b.target);
    const tt = dist(c, gun) / (isAA ? 220 : 150);
    const want = norm(sub(add(c, mul(b.target.vel || [0,0,0], tt)), gun));
    b.aim = turnToward(b.aim, want, (isAA ? 2.5 : 3.0) * dt);
    if (dot(b.aim, want) > 0.995 && b.cd <= 0) turretShoot(b, gun, b.aim, isAA ? 0.02 : 0.03);
  } else {
    const idle = tangent(rotAxis(b.aim, b.up, dt * 0.3), b.up);
    b.aim = turnToward(b.aim, isAA ? norm(add(idle, mul(b.up, 0.6))) : idle, dt);
  }
}
function turretShoot(b, gun, dir, spread){
  const isAA = b.type === 'aa';
  const side = norm(cross(dir, b.up));
  const m = add(add(gun, mul(dir, isAA ? 2.2 : 1.4)), mul(side, (b.barrel = -(b.barrel || 1)) * (isAA ? 0.22 : 0.14)));
  if (isAA) fire(m, dir, b.team, spread, 8, 220, b, 'f');
  else gunShootSimple(b, m, dir, spread, WEAPONS.turret);   // v6: мгновенная пуля
  b.cd = isAA ? 0.14 : 0.16;
  if (b === S.me) b.cd *= 0.8;
  emit('shot', { pos: m, team: b.team, src: b, heavy: isAA });
  if (random() < 0.5) addLight(m, [5, 3.5, 1.6], 8, 0.05, 0.004);
}
function hqStep(h, dt){
  if (!h.alive) return;
  // противотанковое орудие штаба
  h.acd = (h.acd || 0) - dt;
  if (h.acd <= 0){
    h.acd = 0.8;
    const gun = mul(BASES[h.team], RM + 15);
    let tk = null, td = 165;
    for (const e of TGT[h.team]){ if (!e.alive || e.cls !== 'tank') continue; const d = dist(e.pos, gun); if (d < td && los(gun, centerOf(e))){ td = d; tk = e; } }
    if (tk){
      const c = centerOf(tk), tt = td / 160;
      const dir = norm(sub(add(c, mul(tk.vel, tt)), gun));
      fire(add(gun, mul(dir, 3)), dir, h.team, 0.008, 210, 160, h, 's', { splash: 4 });
      addLight(gun, [14, 9, 4], 22, 0.12, 0.02); addWave(add(gun, mul(dir, 3)), 1.2, 0.3);
      emit('cannon', { pos: gun, team: h.team, src: h });
      h.acd = 2.6;
    }
  }
  h.cd -= dt; if (h.cd > 0) return;
  const gun = gunPos(h);
  let best = null, bs = 1e9;
  for (const e of TGT[h.team]){
    if (!e.alive || e.cls === 'bld') continue;
    const c = centerOf(e), d = dist(c, gun); if (d > 170) continue;
    const score = d - (isAir(e) ? 90 : 0);
    if (score < bs && los(gun, c)){ bs = score; best = e; }
  }
  if (best){
    const c = centerOf(best), tt = dist(c, gun) / 170;
    const dir = norm(sub(add(c, mul(best.vel || [0,0,0], tt)), gun));
    h.aim = dir;
    fire(add(gun, mul(dir, 2)), dir, h.team, 0.025, 5, 170, h, 'f');
    h.cd = 0.3; best.seen[h.team] = 1;
    emit('shot', { pos: gun, team: h.team, src: h, heavy: true });
  } else h.cd = 0.5;
}

// =====================================================================
//  ПОПОЛНЕНИЕ ОТРЯДОВ и ДЕСАНТНЫЕ КАПСУЛЫ
// =====================================================================
function reinforcePoint(sq){
  const L = leaderOf(sq); if (!L) return null;
  const t = sq.team;
  if (S.hq[t].alive && surfDist(L.pos, BASES[t]) < 70) return add(mul(BASES[t], RM), mul(tangent(sub(L.pos, mul(BASES[t], RM)), BASES[t]), 22));
  for (const b of S.buildings) if (b.alive && b.done && b.team === t && b.type === 'outpost' && dist(b.pos, L.pos) < 45) return siteExit(b, 4);
  for (const cp of S.cps) if (!cp.core && cp.owner === t && dist(cp.pos, L.pos) < 28 && !cp.contested) return add(cp.pos, mul(tangent(sub(L.pos, cp.pos), cp.dir), 6));
  return null;
}
function reinforceStep(dt){
  for (const sq of S.squads){
    if (sq.units.length >= 4 || sq.order === 'sky' || sq.solo || sq.lone) continue;
    sq.reinfT = (sq.reinfT || 0) - dt;
    if (sq.reinfT > 0) continue;
    sq.reinfT = 1;
    const T = S.teams[sq.team];
    if (T.ore < GAME.REINF_COST) continue;
    if (sq.units.some(u => u.lastHurt > S.time - 4)) continue;
    const p = reinforcePoint(sq); if (!p) continue;
    T.ore -= GAME.REINF_COST;
    const u = addToSquad(sq, p);
    sq.reinfT = GAME.REINF_T;
    burst(u.pos, 10, 4); addLight(u.pos, [1, 2.2, 3], 10, 0.4, 0.004);
    emit('reinf', { pos: u.pos, sq });
    if (sq.team === 0 && S.me && S.me.squad === sq && !S.attract) feed(tr(`${groupLabel(sq)}: пополнение прибыло (−${GAME.REINF_COST} руды)`, `${groupLabel(sq)}: reinforcement arrived (−${GAME.REINF_COST} ore)`, `${groupLabel(sq)}: quân tiếp viện đã tới (−${GAME.REINF_COST} quặng)`), TEAM[0].css);
  }
}
// капсула падает с неба и высаживает отряд
function launchPod(team, landDir, elite, by){
  const land = surfacePoint(landDir, 0.5);
  const up = norm(land);
  const from = add(add(land, mul(up, 230)), mul(anyTangent(up), 60 * (random() - 0.5)));
  S.pods.push({ team, from, to: land, pos: from, t: 0, dur: 3.4, elite: !!elite, by: by || 'ai' });
  emit('podincoming', { team, pos: land });
  if (team === 0 && S.me && dist(S.me.pos, land) < 160) SQUADUI.say('pod', null, null, 40);
}
function podStep(p, dt){
  p.t += dt;
  const k = clamp(p.t / p.dur, 0, 1), e = k * k;
  p.pos = add(mul(p.from, 1 - e), mul(p.to, e));
  if (random() < 0.7) S.fx.push({ type: 'fire', pos: p.pos, r0: 0.9, r1: 2.2, life: 0.35, t: 0, inten: 0.8 });
  if (random() < 0.35) S.fx.push({ type: 'smoke', pos: p.pos, vel: mul(randUnit(), 0.4), r0: 1.2, r1: 4, life: 3.5, t: 0, grey: 0.25, dens: 0.9, heat: 0.4 });
  addLight(p.pos, [6, 3, 1.2], 26, 0.05, 0.01);
  if (k >= 1 && p.carry){   // капсула переброски игрока: бойцы уже на месте, только удар о землю
    fxExplosion(p.to, 1.8); splash(p.to, p.team, 90, 6, S.me, 'g'); S.shake = max(S.shake, 0.6);
    p.done = true; return null;
  }
  if (k >= 1){
    fxExplosion(p.to, 2.6);
    splash(p.to, p.team, 140, 7, null, 'g');
    const sq = spawnSquad(p.team, p.elite, p.to);
    for (const u of sq.units){ u.vel = add(mul(norm(u.pos), 3), mul(randUnit(), 2)); }
    if (p.team === 0 && !S.attract) feed(tr(`Капсула приземлилась: ${groupLabel(sq)} в бою`, `Pod landed: ${groupLabel(sq)} is in the fight`, `Khoang đổ bộ đã đáp: ${groupLabel(sq)} vào trận`), TEAM[0].css);
    p.done = true;
    return sq;
  }
  return null;
}
// куда сбрасывать подкрепление: точка у линии фронта
function frontlineDir(team){
  const enemyBase = BASES[1 - team];
  let best = null, bs = -1e9;
  for (const cp of S.cps){
    if (cp.core || cp.owner !== team) continue;
    const s = -surfDist(cp.dir, enemyBase) + (cp.contested ? 200 : 0);
    if (s > bs){ bs = s; best = cp.dir; }
  }
  if (best) return offsetOnSphere(best, randUnit(), 18 + random() * 10);
  // иначе — к лидеру отряда, что ближе всех к врагу
  for (const s of S.squads){ if (s.team !== team) continue; const L = leaderOf(s); if (!L) continue; const sc = -surfDist(L.pos, enemyBase); if (sc > bs){ bs = sc; best = norm(L.pos); } }
  return best ? offsetOnSphere(best, randUnit(), 20) : offsetOnSphere(BASES[team], randUnit(), 40);
}

// =====================================================================
//  ИИ-КОМАНДИР (для каждой команды; для игрока — пока включён)
// =====================================================================
function findSite(t, type){
  const T = BTYPES[type];
  for (let k = 0; k < 40; k++){
    let center = BASES[t], rr;
    const owned = S.cps.filter(c => !c.core && c.owner === t);
    if ((type === 'outpost' || ((type === 'turret' || type === 'aa') && random() < 0.4) || !S.hq[t].alive) && owned.length){
      const cp = type === 'outpost' ? owned.sort((a, b) => surfDist(b.dir, BASES[t]) - surfDist(a.dir, BASES[t]))[floor(random() * min(2, owned.length))] : owned[floor(random() * owned.length)];
      center = cp.dir; rr = 16 + random() * 30;
    }
    if (!rr) rr = type === 'turret' ? 30 + random() * 70 : type === 'aa' ? 26 + random() * 50 : 30 + random() * 55;
    const a = random() * PI * 2, t1 = anyTangent(center), t2 = cross(center, t1);
    const dir = norm(add(mul(center, cos(rr / RM)), mul(add(mul(t1, cos(a)), mul(t2, sin(a))), sin(rr / RM))));
    if (!siteProblem(t, type, dir)) return dir;
  }
  return null;
}
function commander(t, dt){
  const T = S.teams[t];
  // десантные капсулы прилетают всем — по расписанию
  T.podT -= dt;
  if (T.podT <= 0 && !(TUT.on && t === 1) && (S.hq[t].alive || keyBuildings(t).length)){
    T.podT = GAME.POD_EVERY * (0.85 + random() * 0.3) / (t === 1 ? DK().eco : 1);
    if (S.squads.filter(s => s.team === t).length < GAME.MAX_SQUADS + 2){
      launchPod(t, frontlineDir(t), false, 'sched');
      if (!S.attract){
        if (t === 0) emit('radio', { text: tr('Орбита: сбрасываем капсулу с подкреплением', 'Orbit: dropping a reinforcement pod', 'Quỹ đạo: đang thả khoang quân tiếp viện'), pri: 0 });
        else feed(tr('Разведка: Рой сбрасывает капсулу с подкреплением', 'Intel: the Swarm is dropping a reinforcement pod', 'Tình báo: Bầy Đàn đang thả khoang quân tiếp viện'), '#f88');
      }
    }
  }
  T.think -= dt;
  if (T.think > 0) return;
  T.think = 2;
  if (!T.ai) return;
  economy(t);
  if (TUT.on && t === 1) return;   // в обучении Рой только строится
  army(t);
  aiPowers(t);
}
function economy(t){
  const T = S.teams[t], time = S.time;
  const my = S.buildings.filter(b => b.alive && b.team === t);
  const n = type => my.filter(b => b.type === type).length;
  const unfinished = my.filter(b => !b.done).length;
  const squads = S.squads.filter(s => s.team === t).length + countQueued(t, ['squad', 'elite']);
  const tanks = countProduct(t, 'tank'), drones = countProduct(t, 'drone');
  const enemyAir = S.teams[1 - t].jet2 || S.drones.some(d => d.team !== t) ||
                   S.buildings.some(b => b.team !== t && b.type === 'airdock' && b.alive);
  const ownedCP = S.cps.filter(c => !c.core && c.owner === t).length;
  const plan = [];
  // v6: инженеры и добыча — те же правила, что у игрока
  aiBuilderJobs(t);
  const nB = countProduct(t, 'builder'), wantB = aiWantBuilders(t), nExt = n('extractor');
  if (nB < 2) plan.push(['p', 'builder']);
  if (!S.hq[t].alive && ownedCP && n('outpost') < 2) plan.push(['b', 'outpost']);
  if (nExt < 2) plan.push(['b', 'extractor']);
  if (squads < 4) plan.push(['p', 'squad']);
  if (nB < wantB) plan.push(['p', 'builder']);
  if (nExt < 3 + ownedCP) plan.push(['b', 'extractor']);
  if (n('turret') < 1) plan.push(['b', 'turret']);
  if (time > 60 && n('factory') < 1) plan.push(['b', 'factory']);
  if (n('factory') && tanks < 2) plan.push(['p', 'tank']);
  if ((time > 200 || enemyAir) && n('aa') < 1) plan.push(['b', 'aa']);
  if (squads < 6) plan.push(['p', 'squad']);
  if (time > 220 && n('hub') < 1) plan.push(['b', 'hub']);
  if (n('hub') && drones < 4) plan.push(['p', 'drone']);
  const solos = S.squads.filter(s => s.team === t && s.solo).length + countQueued(t, ['sniper1', 'scout1']);
  if (time > 150 && solos < 2) plan.push(['p', random() < 0.5 ? 'sniper1' : 'scout1']);
  if ((time > 300 || !S.hq[t].alive) && ownedCP >= 1 && n('outpost') < min(GAME.MAX_OUTPOSTS, 1 + floor(time / 900))) plan.push(['b', 'outpost']);
  if (time > 420 && n('airdock') < 1) plan.push(['b', 'airdock']);
  if (n('airdock') && !T.jet2) plan.push(['p', 'jet2']);
  if (n('airdock') && countProduct(t, 'elite') < 2) plan.push(['p', 'elite']);
  if (enemyAir && n('aa') < 2 + (time > 900 ? 1 : 0)) plan.push(['b', 'aa']);
  if (n('turret') < 2 + floor(time / 500)) plan.push(['b', 'turret']);
  if (tanks < 4) plan.push(['p', 'tank']);
  if (nExt >= 3 && (time > 240 || T.ore > 400)) plan.push(['p', 'drill']);
  if (time > 300 || T.ore > 500){ plan.push(['p', 'weapons']); plan.push(['p', 'armor']); }
  if (n('factory') < 2 && time > 900) plan.push(['b', 'factory']);
  if (drones < GAME.MAX_DRONES) plan.push(['p', 'drone']);
  if (squads < GAME.MAX_SQUADS) plan.push(['p', 'squad']);
  if (T.ore > 600 * GAME.INC_MUL) plan.push(['p', 'pod']);
  if (tanks < GAME.MAX_TANKS) plan.push(['p', 'tank']);
  V2.plan(t, plan, n('factory'));   // рейдеры, миномёты/катапульты, РСЗО (vehicles2.js)
  for (const [kind, key] of plan){
    if (kind === 'p'){
      // ИИ нашей команды оставляет в очередях место для заказов игрока
      if (t === 0 && !S.attract){ const site = productionSite(t, key); if (site && site.queue.length >= (key === 'builder' ? 4 : 3)) continue; }
      const why = canProduce(t, key);
      if (!why){ produce(t, key); if (T.ore < 150) return; continue; }
      if (why === tr('Мало руды', 'Not enough ore', 'Không đủ quặng')) return;
    } else {
      if (unfinished >= 2) continue;
      if (t === 0 && T.autoBuild === false && !S.attract) continue;   // «Автостройка» выключена игроком
      const why = canBuild(t, key);
      if (!why){
        const dir = aiSiteFor(t, key);
        if (dir && !aiPlace(t, key, dir)) return;
      } else if (why === tr('Мало руды', 'Not enough ore', 'Không đủ quặng')) return;
    }
  }
}
function army(t){
  const T = S.teams[t];
  const allIn = T.ore > 1300 * GAME.INC_MUL && S.time > 600;
  const mine = groupsOf(t);
  const myHQ = S.hq[t];
  const pg = playerGroup();
  // угрозы базе и точкам
  let threatPos = null, threatN = 0;
  const homeP = myHQ.alive ? myHQ.pos : (keyBuildings(t)[0] || {}).pos;
  for (const e of TGT[t]){
    if (!e.alive || e.cls === 'bld' || !homeP) continue;
    if (dist(e.pos, homeP) < 140){ threatN++; threatPos = e.pos; }
  }
  if (t === 0 && !S.attract && threatN >= 3 && S.time - T.lastAlert > 40){ T.lastAlert = S.time; emit('radio', { text: tr('Внимание! Противник у базы', 'Warning! Enemy at the base', 'Cảnh báo! Địch ở căn cứ'), pri: 2 }); feed(tr('Противник у нашей базы!', 'Enemy at our base!', 'Địch ở căn cứ của ta!'), '#f88'); pushAlert(threatPos); }
  const isFree = g => g.manualUntil < S.time && !(g.order === 'sky' && g.sky);
  // дроны: роем — к угрозе, к волне или сопровождают отряды
  T.droneGoal = threatPos ? threatPos : (S.time < (T.waveUntil || 0) ? T.waveTarget : null);
  // десант через купол
  T.skyT -= 2;
  const skyCapable = s => isSquad(s) && (s.elite || T.jet2);
  if (T.skyT <= 0){
    const cand = mine.filter(s => isFree(s) && skyCapable(s) && s !== pg && s.units.length >= 3 && s.order !== 'defend');
    const enemyAA = S.buildings.filter(b => b.team !== t && b.type === 'aa' && b.done).length;
    if (cand.length && (enemyAA < 3 || random() < 0.4)){
      const s = cand.sort((a, b) => (b.elite - a.elite))[0];
      orderSky(s);
      T.skyT = (allIn ? 70 : 140) + random() * 80;
    } else T.skyT = 30;
  }
  // волны атаки
  T.waveT -= (T.ore > 700 * GAME.INC_MUL ? 5 : 2) * (t === 1 ? DK().eco : 1);
  const free = mine.filter(isFree);
  let defenders = 0;
  if (T.waveT <= 0 && S.time > 150){
    const pool = free.filter(g => g.order !== 'attack' && g !== pg && g.cls !== 'drone').sort((a, b) => (b.cls === 'tank' ? 1 : 0) - (a.cls === 'tank' ? 1 : 0));
    const n = allIn ? pool.length : min(pool.length, Math.round((3 + floor(S.time / 700)) * GAME.WAVE_MUL));
    if (n >= 2){
      const tanksIn = [];
      for (let i = 0; i < n; i++){
        const g = pool[i], L = leaderOf(g); if (!L) continue;
        const tgt = attackPoint(1 - t, L.pos);
        // каждая вторая группа заходит с фланга
        const wp = i % 2 === 1 && surfDist(L.pos, tgt) > 200 ? flankWaypoint(L.pos, tgt, i % 4 === 1 ? 1 : -1, 80) : null;
        assign(g, 'attack', tgt, { wp });
        if (g === pg) {} else if (wp) g.wp = wp;
        g.waveUntil = S.time + 500;
        if (g.cls === 'tank') tanksIn.push(g);
      }
      // отряды прикрывают танки
      for (const tk of tanksIn){
        const esc = free.find(g => isSquad(g) && g !== pg && g.order !== 'attack' && g.order !== 'escort' && !g.elite);
        if (esc) assign(esc, 'escort', tk.pos, { escort: tk });
      }
      T.waveTarget = attackPoint(1 - t, leaderPos(pool[0]) || [0, 0, 0]); T.waveUntil = S.time + (allIn ? 240 : 150);
      if (t === 1 && !S.attract){ feed(tr('Разведка: Рой собирает ударную группу', 'Intel: the Swarm is massing a strike group', 'Tình báo: Bầy Đàn đang tập hợp mũi tấn công'), '#f88'); emit('radio', { text: tr('Разведка докладывает: противник начал наступление', 'Intel reports: the enemy is advancing', 'Tình báo báo cáo: địch đang tiến công'), pri: 1 }); }
      T.waveT = 170 + random() * 100;
    } else T.waveT = 40;
  }
  // перехват: враг у нашей точки
  const cpThreat = [];
  for (const cp of S.cps){
    if (cp.core || cp.owner !== t) continue;
    let n = 0; for (const e of TGT[t]) if (e.alive && (e.cls === 'inf' || e.cls === 'tank') && dist(e.pos, cp.pos) < 70) n++;
    if (n >= 2) cpThreat.push({ cp, n });
  }
  const owned = S.cps.filter(c => c.owner === t).length;
  const sqs = free.filter(g => g.cls !== 'drone');
  for (const g of sqs){
    const L = leaderOf(g); if (!L) continue;
    if (threatN >= 2 && defenders < 1 + (threatN > 6 ? 1 : 0) && homeP && dist(L.pos, homeP) < 400){ assign(g, 'defend', attackPoint(t, L.pos)); defenders++; continue; }
    if (g.order === 'defend' && threatN === 0) g.order = 'idle';
    if (g.order === 'attack' && S.time < (g.waveUntil || 0)) continue;
    if (g.order === 'escort' && g.escort && groupAlive(g.escort) && g.escort.order === 'attack') continue;
    // ближайшая точка под угрозой
    let ct = null, ctd = 1e9;
    for (const c of cpThreat){ const d = surfDist(c.cp.pos, L.pos); if (d < 260 && d < ctd && !mine.some(o => o !== g && o.cp === c.cp && o.order === 'cap')){ ctd = d; ct = c.cp; } }
    if (ct){ assign(g, 'cap', ct.pos, { cp: ct }); continue; }
    let best = null, bs = 1e9;
    for (const cp of S.cps){
      if (cp.owner === t && abs(cp.prog) >= 1) continue;
      if (cp.core && !isSquad(g)) continue;
      let d = cp.core ? RM * 1.1 : surfDist(cp.pos, L.pos);
      d += 220 * mine.filter(o => o !== g && o.cp === cp).length;
      if (g.cp === cp) d -= 80;
      if (d < bs){ bs = d; best = cp; }
    }
    if (best) assign(g, 'cap', best.pos, { cp: best });
    else if (owned >= 5 || random() < 0.35) assign(g, 'attack', attackPoint(1 - t, L.pos));
    else {
      let near = null, nd = 1e9;
      for (const cp of S.cps){ if (cp.core || cp.owner !== t) continue; const d = surfDist(cp.pos, L.pos); if (d < nd){ nd = d; near = cp; } }
      if (near) assign(g, 'cap', near.pos, { cp: near });
    }
  }
  // стратег высылает технику сопровождения отряду игрока, когда тот в бою
  if (t === 0 && pg && isSquad(pg) && pg.combat && S.time > (T.escortT || 0) && !S.attract){
    const PL = leaderOf(pg);
    const has = mine.some(g => g.escort === pg && groupAlive(g));
    if (PL && !has){
      let best = null, bd = 380;
      for (const g of free){ if (g.cls !== 'tank' || g.vk || g.order === 'attack' && S.time < (g.waveUntil || 0)) continue; const d = surfDist(g.pos, PL.pos); if (d < bd){ bd = d; best = g; } }
      const drones = free.filter(g => g.cls === 'drone' && surfDist(g.pos, PL.pos) < 300).slice(0, 2);
      if (best || drones.length){
        if (best) setOrder(best, 'escort', PL.pos, { escort: pg });
        for (const d of drones){ d.escort = pg; d.order = 'escort'; d.manualUntil = S.time + 90; }
        T.escortT = S.time + 75;
        const what = best ? tr('танк', 'a tank', 'xe tăng') : tr('дроны', 'drones', 'drone');
        emit('radio', { text: tr(`${groupLabel(pg)}, высылаю вам ${what} поддержки`, `${groupLabel(pg)}, sending you ${what} for support`, `${groupLabel(pg)}, gửi ${what} yểm trợ cho các bạn`), pri: 1 });
        feed(tr(`Стратег: к вам идёт ${best ? groupLabel(best) : 'звено дронов'}`, `Strategist: ${best ? groupLabel(best) : 'a drone flight'} is coming to support you`, `Chiến lược gia: ${best ? groupLabel(best) : 'phi đội drone'} đang tới yểm trợ`), '#8fffaa');
      } else T.escortT = S.time + 20;
    }
  }
  // свободные дроны — сопровождают ближайший отряд, идущий в бой
  for (const d of free.filter(g => g.cls === 'drone')){
    if (d.escort && groupAlive(d.escort) && random() < 0.8) continue;
    let best = null, bd = 1e9;
    for (const s of S.squads){ if (s.team !== t || (s.order !== 'attack' && s.order !== 'cap')) continue; const L = leaderOf(s); if (!L) continue; const dd = dist(L.pos, d.pos) + 60 * S.drones.filter(o => o.escort === s).length; if (dd < bd){ bd = dd; best = s; } }
    d.escort = best; d.order = best ? 'escort' : 'idle';
  }
  aiRaid(t, free);   // v6: набеги на вражеские экстракторы
  // способности
  for (const g of mine) aiAbilities(g);
}
function orderSky(s){
  const L = leaderOf(s);
  setOrder(s, 'sky', launchSpot(s.team, L ? L.pos : mul(BASES[s.team], RM)), { lock: 60 });
  s.sky = 'gather'; s.skyT = S.time;
}
function skyUpdate(s){
  if (s.order !== 'sky' || !s.sky) return;
  const home = BASES[s.team];
  if (s.sky === 'gather'){
    const near = s.units.filter(u => u.alive && surfDist(u.pos, home) < 48);
    if ((near.length === s.units.length || S.time - s.skyT > 35) && near.length){
      s.sky = 'launch'; s.launchT = S.time; if (S.stats.sky) S.stats.sky[s.team]++;
      for (const u of s.units){ u.skyState = surfDist(u.pos, home) < 60 ? 'up' : null; u.tp0 = u.teleports; }
      if (S.attract) return;
      if (s.team === 1){ feed(tr('ВНИМАНИЕ: десант Роя взлетает — скоро будет над нашей базой!', 'WARNING: Swarm sky assault launching — incoming over our base!', 'CẢNH BÁO: Bầy Đàn đổ bộ từ trời — sắp xuất hiện trên căn cứ ta!'), '#f88'); emit('radio', { text: tr('Внимание! Вражеский десант в небе', 'Warning! Enemy sky assault inbound', 'Cảnh báo! Địch đổ bộ từ trên trời'), pri: 2 }); }
      else if (!(S.me && S.me.squad === s)) feed(tr(`Десант #${s.id} пошёл через купол`, `Sky assault #${s.id} is going through the dome`, `Đổ bộ #${s.id} đang bay xuyên mái vòm`), TEAM[0].css);
    }
  } else if (s.sky === 'launch'){
    const flying = s.units.filter(u => u.alive && u.skyState);
    if (!flying.length || S.time - s.launchT > 70){
      s.sky = null;
      const L = leaderOf(s);
      setOrder(s, 'attack', attackPoint(1 - s.team, L ? L.pos : [0, 0, 0]), { lock: 120 });
    }
  }
}
