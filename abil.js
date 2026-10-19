// =====================================================================
//  СПОСОБНОСТИ ГРУПП (как в Dawn of War II / Company of Heroes)
// =====================================================================
const ABIL = {
  grenade:   { who: 'squad', key: 'KeyR', cd: 22, range: 42, target: 'point', icon: '✹', n: ['Гранаты', 'Grenades', 'Lựu đạn'],
               d: ['Три бойца бросают осколочные гранаты в точку.', 'Three troopers throw frag grenades at a point.', 'Ba lính ném lựu đạn mảnh vào một điểm.'] },
  leap:      { who: 'squad', key: 'KeyF', cd: 26, range: 80, target: 'point', icon: '⤴', n: ['Рывок на ранцах', 'Jet leap', 'Phóng phản lực'],
               d: ['Отряд перелетает на ранцах в точку (до 80 м).', 'The squad jet-leaps to a point (up to 80 m).', 'Cả đội bay bằng ba lô phản lực tới một điểm (tối đa 80 m).'] },
  suppress:  { who: 'squad', key: 'KeyG', cd: 30, range: 70, target: 'point', icon: '≋', n: ['Подавление', 'Suppress', 'Áp chế'],
               d: ['Шквальный огонь по площади: враги замедлены и мажут.', 'Saturating fire: enemies in the area are slowed and miss.', 'Hỏa lực dày đặc: địch trong vùng bị chậm lại và bắn trượt.'] },
  repair:    { who: 'squad', key: 'KeyT', cd: 40, target: 'none', icon: '✚', n: ['Ремонт', 'Repair', 'Sửa chữa'],
               d: ['Нанороботы чинят всех бойцов отряда.', 'Nanobots repair every trooper in the squad.', 'Robot nano sửa mọi lính trong đội.'] },
  barrage:   { who: 'tank', key: 'KeyR', cd: 26, range: 125, target: 'point', icon: '☄', n: ['Залп', 'Barrage', 'Loạt pháo'],
               d: ['Три тяжёлых снаряда навесом в точку.', 'Three heavy shells lobbed at a point.', 'Ba quả đạn nặng bắn cầu vồng vào một điểm.'] },
  smoke:     { who: 'tank', key: 'KeyF', cd: 35, target: 'none', icon: '☁', n: ['Дымовая завеса', 'Smoke screen', 'Màn khói'],
               d: ['Завеса закрывает прямую видимость на 14 с.', 'A screen that blocks line of sight for 14 s.', 'Màn khói che tầm nhìn trong 14 giây.'] },
  overdrive: { who: 'tank', key: 'KeyG', cd: 30, target: 'none', icon: '»', n: ['Форсаж', 'Overdrive', 'Tăng tốc'],
               d: ['Скорость ×1.8 на 6 секунд.', 'Speed ×1.8 for 6 seconds.', 'Tốc độ ×1,8 trong 6 giây.'] },
  kamikaze:  { who: 'drone', key: 'KeyR', cd: 0, range: 95, target: 'point', icon: '✸', n: ['Таран', 'Ram', 'Đâm'],
               d: ['Дрон пикирует в точку и взрывается.', 'The drone dives at a point and explodes.', 'Drone lao xuống một điểm và phát nổ.'] },
};
function groupKind(g){ return isSquad(g) ? 'squad' : (g.vk || g.cls); }
function abilList(g){ const k = groupKind(g); return Object.keys(ABIL).filter(a => ABIL[a].who === k); }
function abilLeft(g, k){ return max(0, (g.abil[k] || 0) - S.time); }
function useAbility(g, k, pt){
  const A = ABIL[k];
  if (!A || A.who !== groupKind(g) || !groupAlive(g)) return tr('Недоступно', 'Unavailable', 'Không khả dụng');
  if (abilLeft(g, k) > 0) return tr('Перезарядка', 'Cooling down', 'Đang hồi chiêu');
  const L = leaderOf(g); if (!L) return tr('Нет бойцов', 'No troops', 'Không còn quân');
  if (A.target === 'point'){
    if (!pt) return tr('Нужна точка', 'Needs a point', 'Cần chọn điểm');
    if (dist(pt, L.pos) > A.range * 1.15){ pt = add(L.pos, mul(norm(sub(pt, L.pos)), A.range)); pt = surfacePoint(norm(pt), 0.2); }
  }
  g.abil[k] = S.time + A.cd;
  const bots = groupUnits(g).filter(u => u.alive && u !== S.me);
  switch (k){
    case 'grenade': {
      let n = 0;
      for (const u of (bots.length ? bots : groupUnits(g))){ if (n >= 3) break; throwGrenade(u, add(pt, mul(randUnit(), 2.5 * n)), 70, 5.5); n++; }
      break;
    }
    case 'leap':
      groupUnits(g).forEach((u, i) => { if (u === S.me && S.mode === 'fps') return; u.leapT = 2.6; u.leapTo = add(pt, mul(randUnit(), 3 + i)); });
      emit('leap', { pos: L.pos, g });
      break;
    case 'suppress':
      g.suppPos = pt; g.suppUntil = S.time + 6;
      S.supp.push({ team: g.team, pos: pt, r: 12, until: S.time + 6 });
      break;
    case 'repair':
      for (const u of groupUnits(g)){ u.repT = 5; }
      emit('repair', { pos: L.pos, g });
      break;
    case 'barrage':
      S.strikes.push({ type: 'barrage', team: g.team, pos: pt, src: g, t: 0, delay: 0.2, n: 3, every: 0.5, fired: 0, r: 5, dmg: 115, splash: 6.5 });
      break;
    case 'smoke': {
      const c = add(g.pos, mul(g.up, 2));
      SCREENS.push({ pos: c, r: 12, t: 0, life: 14 });
      for (let i = 0; i < 9; i++) S.fx.push({ type: 'smoke', pos: add(c, mul(randUnit(), 5)), vel: mul(randUnit(), 0.6), r0: 3, r1: 7, life: 12 + random() * 3, t: 0, grey: 0.45, dens: 2.2, heat: 0 });
      emit('smoke', { pos: c });
      break;
    }
    case 'overdrive': g.overT = 6; emit('overdrive', { pos: g.pos }); break;
    case 'kamikaze': g.kamikaze = pt; break;
    default: if (A.fn) A.fn(g, pt);   // способности новой техники (vehicles2.js)
  }
  return null;
}
function throwGrenade(u, pt, dmg, rad, src){
  const eye = add(u.pos, mul(u.up, RULES.EYE));
  const v = ballistic(eye, pt, 14, 0.7, 2.2);
  S.proj.push({ pos: eye, org: eye, vel: v, team: u.team, life: 4, fuse: dist(eye, pt) / 14 + 0.6, dmg, splash: rad, from: src || u, type: 'g' });
  emit('throw', { pos: eye, src: u });
}
// скорость для навесного броска из a в b (время полёта по горизонтальной скорости)
function ballistic(a, b, hs, tmin, tmax){
  const D = dist(a, b), T = clamp(D / hs, tmin, tmax);
  const g = gAt(len(a));
  const up = norm(a);
  return add(mul(sub(b, a), 1 / T), mul(up, 0.5 * g * T));
}
// подавление: враги в зоне замедлены и стреляют хуже
function suppStep(dt){
  for (let i = S.supp.length - 1; i >= 0; i--){
    const z = S.supp[i];
    if (S.time > z.until){ S.supp.splice(i, 1); continue; }
    for (const e of TGT[z.team]) if (e.alive && e.cls === 'inf' && dist(e.pos, z.pos) < z.r) e.suppT = 0.6;
  }
}

// =====================================================================
//  КОМАНДНЫЕ СПОСОБНОСТИ (тратят командные очки, КО)
// =====================================================================
const POWERS = {
  scan:    { cost: 1, cd: 25,  r: 140, icon: '◎', n: ['Разведка', 'Recon scan', 'Trinh sát'],       d: ['Показывает всех врагов в радиусе 140 м на 25 с.', 'Reveals all enemies within 140 m for 25 s.', 'Lộ mọi kẻ địch trong bán kính 140 m trong 25 giây.'] },
  arty:    { cost: 3, cd: 45,  r: 14,  icon: '☄', n: ['Артудар', 'Artillery strike', 'Pháo kích'],  d: ['9 снарядов по площади через 2 секунды.', '9 shells on an area after 2 seconds.', '9 quả đạn rơi xuống khu vực sau 2 giây.'] },
  pod:     { cost: 4, cd: 60,  r: 0,   icon: '⬇', n: ['Капсула с отрядом', 'Squad drop pod', 'Khoang thả đội'], d: ['Сбрасывает свежий отряд с орбиты рядом с вашими силами.', 'Drops a fresh squad from orbit near your forces.', 'Thả một đội mới từ quỹ đạo gần lực lượng của bạn.'] },
  orbital: { cost: 7, cd: 120, r: 16,  icon: '✺', n: ['Орбитальный удар', 'Orbital strike', 'Oanh kích quỹ đạo'], d: ['Луч с орбиты выжигает площадь. Сносит здания.', 'An orbital beam burns the area. Wrecks buildings.', 'Tia từ quỹ đạo thiêu rụi khu vực. Phá hủy công trình.'] },
};
function podAllowed(team, pt){
  for (const g of groupsOf(team)){ const L = leaderOf(g); if (L && dist(L.pos, pt) < 160) return true; }
  for (const b of S.buildings) if (b.alive && b.team === team && dist(b.pos, pt) < 160) return true;
  for (const cp of S.cps) if (!cp.core && cp.owner === team && dist(cp.pos, pt) < 160) return true;
  return surfDist(pt, BASES[team]) < 200;
}
function powerLeft(team, k){ const T = S.teams[team]; return max(0, ((T.powCd || {})[k] || 0) - S.time); }
function usePower(team, k, pt, by){
  const P = POWERS[k], T = S.teams[team];
  if (T.cmd < P.cost) return tr('Мало командных очков', 'Not enough command points', 'Không đủ điểm chỉ huy');
  if (powerLeft(team, k) > 0) return tr('Перезарядка', 'Cooling down', 'Đang hồi chiêu');
  if (!pt) return tr('Нужна точка', 'Needs a point', 'Cần chọn điểm');
  if (k === 'pod' && !podAllowed(team, pt)) return tr('Слишком далеко от ваших сил', 'Too far from your forces', 'Quá xa lực lượng của bạn');
  T.cmd -= P.cost; T.powCd = T.powCd || {}; T.powCd[k] = S.time + P.cd;
  startStrike(team, k, pt, by);
  return null;
}
function startStrike(team, k, pt, by, src){
  if (k === 'arty') S.strikes.push({ type: 'arty', team, pos: pt, t: 0, delay: 2.2, n: 9, every: 0.42, fired: 0, r: 14, dmg: 95, splash: 7, src: src || null, by });
  else if (k === 'party') S.strikes.push({ type: 'arty', team, pos: pt, t: 0, delay: 1.6, n: 6, every: 0.38, fired: 0, r: 9, dmg: 100, splash: 7, src: src || null, by });
  else if (k === 'orbital') S.strikes.push({ type: 'orb', team, pos: pt, t: 0, delay: 3.0, dur: 2.4, tick: 0, src: src || null, by });
  else if (k === 'scan'){ S.scans.push({ team, pos: pt, t: 0, life: 25, r: POWERS.scan.r }); emit('scan', { pos: pt, team }); return; }
  else if (k === 'pod'){ launchPod(team, norm(pt), false, by); return; }
  emit('strike', { team, pos: pt, kind: k, by });
  if (team === 1 && !S.attract){
    const c = ctrlEntity();
    if (c && dist(c.pos, pt) < 120){ feed(tr('ВНИМАНИЕ: вражеский удар по вашему району!', 'WARNING: enemy strike incoming on your area!', 'CẢNH BÁO: địch sắp oanh kích khu vực của bạn!'), '#f88'); emit('radio', { text: tr('Внимание! Удар по нашей позиции', 'Warning! Strike incoming on our position', 'Cảnh báo! Địch oanh kích vị trí của ta'), pri: 2 }); }
  }
}
function strikesStep(dt){
  for (let i = S.strikes.length - 1; i >= 0; i--){
    const s = S.strikes[i];
    s.t += dt;
    if (s.type === 'arty' || s.type === 'barrage'){
      if (s.t < s.delay) continue;
      const due = floor((s.t - s.delay) / s.every) + 1;
      while (s.fired < min(s.n, due)){
        s.fired++;
        const off = mul(tangent(randUnit(), norm(s.pos)), s.r * sqrt(random()));
        const tgt = add(s.pos, off);
        if (s.type === 'arty'){
          const up = norm(tgt);
          const from = add(add(tgt, mul(up, 150)), mul(anyTangent(up), 30 * (random() - 0.5)));
          S.proj.push({ pos: from, org: from, vel: mul(norm(sub(tgt, from)), 125), team: s.team, life: 3, dmg: s.dmg, splash: s.splash, from: s.src, type: 'a' });
        } else if (s.src && s.src.alive){
          const m = add(add(s.src.pos, mul(s.src.up, 1.6)), mul(s.src.aim || s.src.fwd, 2));
          S.proj.push({ pos: m, org: m, vel: ballistic(m, tgt, 38, 1.0, 3.2), team: s.team, life: 5, dmg: s.dmg, splash: s.splash, from: s.src, type: 's', lob: 1 });
          addLight(m, [14, 9, 4], 22, 0.12, 0.02); fxSmoke(m, 0.9, 0.35); addWave(m, 1.2, 0.3);
          emit('cannon', { pos: m, team: s.team, src: s.src });
        }
      }
      if (s.fired >= s.n) S.strikes.splice(i, 1);
    } else if (s.type === 'orb'){
      if (s.t < s.delay) continue;
      s.tick -= dt;
      if (s.tick <= 0){
        s.tick = 0.2;
        splash(s.pos, s.team, 95, 16, s.src, 'x');
        burst(s.pos, 8, 12, 0.5);
        if (random() < 0.5) fxSmoke(add(s.pos, mul(randUnit(), 6)), 3, 0.2, 1.2);
        addWave(s.pos, 2.5, 0.35);
      }
      addLight(add(s.pos, mul(norm(s.pos), 8)), [30, 22, 50], 70, 0.06, 0.02);
      if (s.t > s.delay + s.dur){
        fxExplosion(s.pos, 6); addWave(s.pos, 9, 1.0);
        for (let k = 0; k < 4; k++) fxExplosion(add(s.pos, mul(tangent(randUnit(), norm(s.pos)), 9)), 3, true);
        S.strikes.splice(i, 1);
      }
    }
  }
  for (let i = S.scans.length - 1; i >= 0; i--){
    const z = S.scans[i]; z.t += dt;
    if (z.t > z.life){ S.scans.splice(i, 1); continue; }
    for (const e of TGT[z.team]) if (e.alive && dist(e.pos, z.pos) < z.r) e.seen[z.team] = max(e.seen[z.team], 1);
  }
}

// =====================================================================
//  ИИ: использование способностей и командных очков
// =====================================================================
function enemiesNear(team, p, r, filter){
  const L = [];
  for (const e of TGT[team]) if (e.alive && dist(e.pos, p) < r && (!filter || filter(e))) L.push(e);
  return L;
}
function clusterCenter(list){
  if (!list.length) return null;
  let best = null, bn = 0;
  for (const a of list){ let n = 0; for (const b of list) if (dist(a.pos, b.pos) < 12) n++; if (n > bn){ bn = n; best = a; } }
  const mem = list.filter(b => dist(b.pos, best.pos) < 12);
  let c = [0, 0, 0]; for (const m of mem) c = add(c, m.pos);
  return { pos: mul(c, 1 / mem.length), n: mem.length };
}
function aiAbilities(g){
  const L = leaderOf(g); if (!L) return;
  if (g === playerGroup() && S.me && S.me.cls !== 'inf') return;
  const kind = groupKind(g);
  if (kind === 'squad'){
    const near = enemiesNear(g.team, L.pos, 40, e => e.cls === 'inf' || e.cls === 'builder' || (e.cls === 'bld' && e.type === 'turret'));
    if (abilLeft(g, 'grenade') <= 0 && near.length){
      const c = clusterCenter(near);
      if (c && (c.n >= 2 || near.some(e => e.cls === 'bld')) && random() < 0.7 && !(S.me && S.me.squad === g && dist(S.me.pos, c.pos) < 7)){ useAbility(g, 'grenade', c.pos); return; }
    }
    if (abilLeft(g, 'repair') <= 0 && groupHP(g) < 0.55 && !enemiesNear(g.team, L.pos, 40).length){ useAbility(g, 'repair'); return; }
    if (abilLeft(g, 'suppress') <= 0){
      const inf = enemiesNear(g.team, L.pos, 60, e => e.cls === 'inf');
      if (inf.length >= 2 && random() < 0.45){ const c = clusterCenter(inf); if (c) { useAbility(g, 'suppress', c.pos); return; } }
    }
    if (abilLeft(g, 'leap') <= 0 && g.goal && surfDist(L.pos, g.goal) > 130 && !enemiesNear(g.team, L.pos, 55).length && (g.elite ? random() < 0.5 : random() < 0.12) && !(S.me && S.me.squad === g)){
      const to = surfacePoint(stepToward(norm(L.pos), norm(g.goal), 70 / RM), 0.5);
      if (!inShaft(to)) useAbility(g, 'leap', to);
    }
  } else if (kind === 'tank'){
    if (abilLeft(g, 'smoke') <= 0 && g.hp < g.maxhp * 0.4 && S.time - g.lastHurt < 3){ useAbility(g, 'smoke'); return; }
    if (abilLeft(g, 'barrage') <= 0){
      const st = enemiesNear(g.team, L.pos, 115, e => e.cls === 'bld' || e.cls === 'tank');
      const inf = enemiesNear(g.team, L.pos, 110, e => e.cls === 'inf');
      const c = clusterCenter(inf);
      const tgt = st.length && random() < 0.6 ? centerOf(st[0]) : (c && c.n >= 3 ? c.pos : null);
      if (tgt && random() < 0.6){ useAbility(g, 'barrage', tgt); return; }
    }
    if (abilLeft(g, 'overdrive') <= 0 && g.goal && surfDist(g.pos, g.goal) > 150 && random() < 0.5) useAbility(g, 'overdrive');
  } else if (kind === 'drone'){
    if (g.hp < g.maxhp * 0.35 && g.target && g.target.alive && dist(g.target.pos, g.pos) < 45 && g.target.cls !== 'bld') useAbility(g, 'kamikaze', centerOf(g.target));
  }
}
function aiPowers(t){
  const T = S.teams[t];
  T.powT -= 2;
  if (T.powT > 0) return;
  T.powT = 10 + random() * 10;
  const known = TGT[t].filter(e => e.alive && (e.cls === 'inf' || e.cls === 'tank') && (e.seen[t] > 0 || groupsOf(t).some(g => { const L = leaderOf(g); return L && dist(L.pos, e.pos) < 90; })));
  // орбитальный удар — по ключевому зданию
  if (T.cmd >= POWERS.orbital.cost && powerLeft(t, 'orbital') <= 0 && (random() < 0.5 || T.cmd >= GAME.CMD_MAX - 1)){
    const kb = keyBuildings(1 - t).filter(b => b.seen[t] > 0 || S.time > 900 || T.cmd >= GAME.CMD_MAX - 1);
    const tgt = kb.length ? kb[floor(random() * kb.length)].pos : (S.hq[1 - t].alive && S.time > 600 ? add(S.hq[1 - t].pos, mul(randUnit(), 6)) : null);
    if (tgt && !usePower(t, 'orbital', tgt, 'ai')){ aiPowerNote(t, 'orbital', tgt); return; }
  }
  // артудар — по скоплению врагов, где нет наших
  if (T.cmd >= POWERS.arty.cost && powerLeft(t, 'arty') <= 0){
    const c = clusterCenter(known);
    if (c && c.n >= (T.cmd >= GAME.CMD_MAX - 2 ? 2 : 3)){
      const friendly = [...S.units, ...S.vehicles].some(u => u.alive && u.team === t && dist(u.pos, c.pos) < 18);
      if (!friendly && !usePower(t, 'arty', c.pos, 'ai')){ aiPowerNote(t, 'arty', c.pos); return; }
    }
  }
  if (T.cmd >= POWERS.pod.cost + (t === 1 ? 0 : 1) && powerLeft(t, 'pod') <= 0 && S.squads.filter(s => s.team === t).length < GAME.MAX_SQUADS){
    const dir = frontlineDir(t), p = surfacePoint(dir, 0.5);
    if (!usePower(t, 'pod', p, 'ai')){ aiPowerNote(t, 'pod', p); return; }
  }
  if (T.cmd >= 5 && powerLeft(t, 'scan') <= 0 && random() < 0.3){
    const cp = S.cps.find(c => !c.core && c.owner === 1 - t);
    if (cp) usePower(t, 'scan', cp.pos, 'ai');
  }
}
function aiPowerNote(t, k, p){
  if (S.attract || t !== 0) return;
  const near = S.cps.filter(c => !c.core).sort((a, b) => dist(a.pos, p) - dist(b.pos, p))[0];
  const where = near && dist(near.pos, p) < 120 ? tr(` у точки ${near.name}`, ` near point ${near.name}`, ` gần điểm ${near.name}`) : '';
  feed(tr(`Стратег: ${N2(POWERS[k].n).toLowerCase()}${where}`, `Strategist: ${N2(POWERS[k].n).toLowerCase()}${where}`, `Chiến lược gia: ${N2(POWERS[k].n).toLowerCase()}${where}`), '#9cf');
}

// =====================================================================
//  СНАРЯЖЕНИЕ ИГРОКА: оружие, гранаты, рефлекс (замедление), удар
// =====================================================================
function newKit(){
  const mag = {}; for (const k in WEAPONS) if (WEAPONS[k].mag) mag[k] = WEAPONS[k].mag;   // v6: магазины всех видов оружия
  return { w: 'rifle', mag, reloadT: 0, grenCd: 0, reflex: 1, reflexOn: false,
           strikeCd: 0, hmgT: 0, incT: 0, freeRockets: 0, strikeCharges: 0, lastShot: -9 };
}
// луч из глаз: первая поверхность или сущность
function rayCast(o, d, maxT, team, wantEnt){
  let t = 0.5, hitE = null;
  for (let i = 0; i < 400 && t < maxT; i++){
    const p = add(o, mul(d, t));
    const m = mapJS(p[0], p[1], p[2]);
    if (m < 0.05) break;
    t += max(m * 0.8, 0.25);
  }
  t = min(t, maxT);
  const end = add(o, mul(d, t));
  if (wantEnt){
    let bt = t;
    for (const e of TGT[team]){
      if (!e.alive) continue;
      const c = centerOf(e), r = hitRadius(e) + 0.15;
      const oc = sub(o, c), b = dot(oc, d), h = b * b - (dot(oc, oc) - r * r);
      if (h < 0) continue;
      const tt = -b - sqrt(h);
      if (tt > 0 && tt < bt){ bt = tt; hitE = e; }
    }
    const h = S.hq[1 - team];
    if (h.alive){ const oc = sub(o, h.pos), b = dot(oc, d), hh = b * b - (dot(oc, oc) - 196); if (hh > 0){ const tt = -b - sqrt(hh); if (tt > 0 && tt < bt){ bt = tt; hitE = h; } } }
    return { t: bt, pos: add(o, mul(d, bt)), ent: hitE };
  }
  return { t, pos: end, ent: null };
}
function weaponAvail(w){
  const role = S.me && S.me.cls === 'inf' ? S.me.role : null;
  if (w === 'rifle') return role !== 'scout';
  if (w === 'smg') return role === 'scout';   // v6: у разведчика основное — ПП
  if (w === 'rail') return PROG.has('rail') || role === 'sniper';
  if (w === 'hmg') return S.kit.hmgT > 0 || role === 'heavy';
  return false;
}
function switchWeapon(w){
  if (w === 'rifle' && S.me && S.me.cls === 'inf' && roleOf(S.me).w === 'smg') w = 'smg';   // клавиша 1 — основное оружие роли
  if (!weaponAvail(w)){ HINTS.denied(w); return; }
  if (S.kit.w === w) return;
  S.kit.w = w; S.kit.reloadT = 0;
  emit('wswitch', {});
}
function startReload(){
  const K = S.kit, W = WEAPONS[K.w];
  if (K.reloadT > 0 || K.mag[K.w] >= gstat(W, 'mag')) return;
  K.reloadT = gstat(W, 'reload');
  HINTS.used('reload');
  emit('reload', {});
}
// огонь игрока (вызывается из sim для своего бойца)
function playerFire(u, inp, dt){ return gunPlayerFire(u, inp, dt); }   // v6: стрельба — gun.js (hitscan, отдача, разброс)
// помощь в прицеливании (зависит от сложности): пуля слегка «притягивается» к цели у перекрестия
function assistAim(eye, fwd, team){
  const a = DK().assist || 0;
  if (a <= 0) return fwd;
  const cone = 0.012 + 0.05 * a;
  let best = null, ba = cone;
  for (const e of TGT[team]){
    if (!e.alive || e.cls === 'bld') continue;
    const c = centerOf(e), v = sub(c, eye), d = len(v);
    if (d > 150 || d < 1) continue;
    const ang = acos(clamp(dot(v, fwd) / d, -1, 1));
    if (ang < ba && los(eye, c)){ ba = ang; best = c; }
  }
  if (!best) return fwd;
  return norm(add(mul(fwd, 1 - 0.75 * a), mul(norm(sub(best, eye)), 0.75 * a)));
}
function playerGrenade(){
  const u = S.me; if (!u || u.cls !== 'inf') return;
  if (!PROG.has('grenade')){ HINTS.denied('grenade'); return; }
  if (S.kit.grenCd > 0) return;
  S.kit.grenCd = 9;
  const eye = add(u.pos, mul(u.up, RULES.EYE));
  const v = add(mul(u.fwd, 21), mul(u.up, 4.5 * Math.sqrt(RULES.G / 3.5)));   // v6: гравитация сильнее — бросаем выше
  S.proj.push({ pos: add(eye, mul(u.fwd, 0.6)), org: eye, vel: add(v, mul(u.vel, 0.5)), team: u.team, life: 4, fuse: 1.9, dmg: 85, splash: 6, from: u, type: 'g' });
  HINTS.used('grenade');
  emit('throw', { pos: eye, src: u, me: true });
}
function toggleReflex(){
  if (!PROG.has('reflex')){ HINTS.denied('reflex'); return; }
  const K = S.kit;
  if (K.reflexOn){ K.reflexOn = false; emit('slowoff', {}); return; }
  if (K.reflex < 0.25){ feed(tr('Рефлекс ещё заряжается', 'Reflex is still charging', 'Phản xạ đang nạp lại'), '#f88'); return; }
  K.reflexOn = true;
  HINTS.used('reflex');
  emit('slowon', {});
}
function playerStrike(){
  const c = ctrlEntity(); if (!c || c.cls === 'bld') return;
  const K = S.kit;
  const allowed = PROG.has('strike') || K.strikeCharges > 0;
  if (!allowed){ HINTS.denied('strike'); return; }
  if (K.strikeCd > 0 && K.strikeCharges <= 0){ feed(tr(`Удар перезаряжается: ${Math.ceil(K.strikeCd)} с`, `Strike recharging: ${Math.ceil(K.strikeCd)} s`, `Pháo kích đang nạp: ${Math.ceil(K.strikeCd)} giây`), '#f88'); return; }
  const eye = S.cam.pos, d = S.cam.fwd;
  const r = rayCast(eye, d, 320, c.team, false);
  if (r.t >= 319){ feed(tr('Наведи прицел на землю', 'Aim at the ground', 'Hãy ngắm xuống mặt đất'), '#f88'); return; }
  if (K.strikeCharges > 0) K.strikeCharges--; else K.strikeCd = 90;
  const orb = PROG.has('orbital');
  startStrike(c.team, orb ? 'orbital' : 'party', r.pos, 'player', c);
  S.markers.push({ pos: r.pos, t: 0, life: orb ? 5.4 : 4.5, col: '#ff7050' });
  HINTS.used('strike');
  feed(orb ? tr('Орбитальный удар наведён!', 'Orbital strike designated!', 'Đã chỉ định oanh kích quỹ đạo!') : tr('Артудар наведён — держись подальше!', 'Artillery designated — keep clear!', 'Đã chỉ định pháo kích — tránh xa ra!'), '#ffb070');
  emit('radio', { text: orb ? tr('Орбита: цель принята, огонь через три секунды', 'Orbit: target locked, firing in three seconds', 'Quỹ đạo: đã khóa mục tiêu, khai hỏa sau ba giây') : tr('Артиллерия: цель принята', 'Artillery: target received', 'Pháo binh: đã nhận mục tiêu'), pri: 1 });
}
function kitStep(dt, rdt){
  const K = S.kit;
  K.grenCd = max(0, K.grenCd - dt); K.strikeCd = max(0, K.strikeCd - dt);
  if (K.hmgT > 0){ K.hmgT -= dt; if (K.hmgT <= 0){ K.hmgT = 0; if (K.w === 'hmg') K.w = 'rifle'; feed(tr('Экспериментальный пулемёт отозван', 'The experimental MG has been recalled', 'Súng máy thử nghiệm đã bị thu hồi'), '#aaa'); } }
  if (K.incT > 0) K.incT = max(0, K.incT - dt);
  const dur = PROG.has('reflex2') ? 9 : 6;
  if (K.reflexOn){
    K.reflex -= rdt / dur;
    const c = ctrlEntity();
    if (K.reflex <= 0 || !c){ K.reflex = max(0, K.reflex); K.reflexOn = false; emit('slowoff', {}); }
  } else K.reflex = min(1, K.reflex + rdt / 40);
  S.slow += ((K.reflexOn ? 1 : 0) - S.slow) * (1 - Math.exp(-rdt * 6));
}
