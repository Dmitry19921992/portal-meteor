// =====================================================================
//  ОБНОВЛЕНИЕ МИРА
// =====================================================================
function fireRocket(u, dir){
  const eye = add(add(u.pos, mul(u.up, RULES.EYE)), mul(norm(cross(u.fwd, u.up)), 0.25));
  fire(eye, dir, u.team, 0.01, 110, 55, u, 'r', { splash: 3.5 });
  u.rocketCd = roleOf(u).rocket * (u.elite ? 0.65 : 1);
  if (u === S.me && S.kit.freeRockets > 0){ S.kit.freeRockets--; u.rocketCd = 0.6; }
  emit('rocket', { pos: eye, src: u });
  fxSmoke(eye, 0.4, 0.4);
  if (u === S.me) HINTS.used('rocket');
}
function dronePlayerStep(d, dt){
  const inp = dronePlayerInput(d);
  const Up = norm(d.pos);
  const f = tangent(d.aim, Up), r = norm(cross(f, Up));
  let wish = add(mul(f, inp.f), mul(r, inp.r));
  if (len(wish) > 1) wish = norm(wish);
  const sp = inp.run ? 22 : 14;
  d.grT -= dt; if (d.grT <= 0){ d.grT = 0.3; d.gr = groundR(Up); }
  d.alt = clamp((d.alt || 12) + inp.u * dt * 8, 3, 70);
  const vr = clamp((d.gr + d.alt - len(d.pos)) * 1.5, -10, 10);
  const want = add(mul(wish, sp), mul(Up, vr));
  d.vel = add(d.vel, mul(sub(want, d.vel), 1 - Math.exp(-dt * 3)));
  d.pos = add(d.pos, mul(d.vel, dt));
  const l = len(d.pos); if (l > S.R){ d.pos = mul(d.pos, 1 - 2 * S.R / l); S.flashT = 0.25; emit('portal', {}); }
  collide(d);
  const oldUp = d.up; d.up = norm(d.pos);
  const ax = cross(oldUp, d.up), la = len(ax);
  if (la > 1e-7) d.aim = norm(rotAxis(d.aim, mul(ax, 1 / la), asin(min(1, la))));
  d.fwd = tangent(d.aim, d.up);
  d.phase += dt * 30;
  d.cd -= dt;
  if (inp.fire && d.cd <= 0){
    const m = add(d.pos, mul(d.aim, 1.0));
    gunShootSimple(d, m, d.aim, 0.012, WEAPONS.drone);   // v6: мгновенная пуля
    d.cd = 0.16; S.recoil = 0.5;
    emit('shot', { pos: d.pos, team: d.team, src: d, me: true });
  }
}
function update(rdt){
  S.events.length = 0;
  S.rtime = (S.rtime || 0) + rdt;
  if (S.paused) return;
  // рефлекс: мир замедляется, игрок — меньше
  const slowK = 1 - 0.72 * S.slow;
  const dt = rdt * slowK;
  const pdt = rdt * (1 - 0.45 * S.slow);
  S.time += dt;
  rebuildTargets();
  visionStep(dt);
  for (const t of [0, 1]) commander(t, dt);
  for (const s of S.squads) skyUpdate(s);
  reinforceStep(dt);
  const fps = S.mode === 'fps' && !S.attract;
  const ctrl = ctrlEntity();
  if (!S.attract) kitStep(dt, rdt);
  gunStep(dt, rdt);   // v6: трассеры, отдача, разброс, перелёт камеры

  // ---- пехота
  for (const u of [...S.units]){
    if (!u.alive) continue;
    const isMe = fps && u === S.me;
    const edt = isMe ? pdt : dt;
    u.flash = max(0, u.flash - edt * 4);
    u.seen[0] = max(0, u.seen[0] - edt); u.seen[1] = max(0, u.seen[1] - edt);
    u.cd -= edt; u.rocketCd -= edt; u.suppT = max(0, (u.suppT || 0) - edt);
    // самовосстановление вне боя и ремонт
    if (u.repT > 0){ u.repT -= edt; u.hp = min(u.maxhp, u.hp + 14 * edt); if (random() < edt * 8) S.sparks.push({ pos: add(u.pos, mul(randUnit(), 0.5)), vel: mul(u.up, 2), life: 0.4, heal: 1 }); }
    else if (S.time - u.lastHurt > 10 && u.hp < u.maxhp) u.hp = min(u.maxhp, u.hp + 2.5 * edt);
    const inp = isMe ? playerInput(u) : botInput(u, edt);
    const skipPhys = isMe && !S.freecam && parkourStep(u, inp, edt);
    if (!skipPhys) physStep(u, inp, edt, isMe && S.freecam);
    if (isMe && u.justTeleported){ S.flashT = 0.25; emit('portal', {}); }
    if (isMe){
      if (!S.freecam) playerFire(u, inp, edt);
      if (u.role === 'medic'){   // медик-инженер: чинит своих рядом
        for (const m of u.squad.units) if (m !== u && m.alive && m.hp < m.maxhp && dist2(m.pos, u.pos) < 64){ m.hp = min(m.maxhp, m.hp + 6 * edt); if (random() < edt * 4) S.sparks.push({ pos: add(m.pos, mul(m.up, 0.6)), vel: mul(m.up, 2), life: 0.4, heal: 1 }); }
        for (const v of S.vehicles) if (v.alive && v.team === u.team && v.hp < v.maxhp && dist2(v.pos, u.pos) < 49){ v.hp = min(v.maxhp, v.hp + 22 * edt); if (random() < edt * 6) S.sparks.push({ pos: add(v.pos, mul(randUnit(), 1.5)), vel: mul(v.up, 2), life: 0.4, heal: 1 }); }
      }
    }
    else if (u.cd <= 0){
      let aim = inp.fire ? inp.aim : null;
      // подавление: стреляем по площади, если нет цели
      if (!aim && u.squad.suppUntil > S.time && u.squad.suppPos){ aim = norm(sub(add(u.squad.suppPos, mul(randUnit(), 6)), u.pos)); }
      // v6: то же оружие, что у игрока — мгновенные пули, очереди, магазины, модель точности (gun.js)
      if (aim) gunBotFire(u, aim, u.squad.suppUntil > S.time);
    }
    if (inp.rocket && u.rocketCd <= 0 && !(isMe && S.freecam)) fireRocket(u, isMe ? u.fwd : inp.aim);
    if (!isMe){
      const look = inp.aim || (inp.thrust ? inp.thrustDir : (len(inp.wish) > 0 ? inp.wish : null));
      if (look){ u.fwd = norm(add(u.fwd, mul(sub(look, u.fwd), 1 - Math.exp(-edt * 8)))); clampFwd(u); }
    }
    u.aim = u.fwd;
    const si = floor(u.phase / PI);
    if (si !== u.stepI){ u.stepI = si; if (u.grounded && u.moveAmt > 0.25) emit('step', { pos: u.pos, e: u }); }
    if (u.thrusting && random() < edt * 6) S.sparks.push({ pos: sub(u.pos, mul(u.up, 0.4)), vel: add(mul(u.up, -6), mul(randUnit(), 2)), life: 0.25 });
  }
  // ---- танки
  for (const v of [...S.vehicles]){
    if (!v.alive) continue;
    const isMe = fps && ctrl === v;
    const edt = isMe ? pdt : dt;
    v.flash = max(0, v.flash - edt * 4);
    v.seen[0] = max(0, v.seen[0] - edt); v.seen[1] = max(0, v.seen[1] - edt);
    v.overT = max(0, (v.overT || 0) - edt);
    if (S.time - v.lastHurt > 12 && v.hp < v.maxhp) v.hp = min(v.maxhp, v.hp + 4 * edt);
    const inp = v.vk ? (isMe ? V2.playerInput(v, edt) : V2.aiInput(v, edt)) : isMe ? tankPlayerInput(v, edt) : tankInput(v, edt);
    physStep(v, inp, edt, false);
    if (isMe && v.justTeleported){ S.flashT = 0.25; emit('portal', {}); }
    if (!isMe && len(inp.wish) > 0) v.fwd = tangent(turnToward(v.fwd, norm(inp.wish), 1.4 * edt), v.up);
    v.cd -= edt; v.mgCd -= edt;
    if (v.vk) V2.aimFire(v, edt, isMe, inp); else vehicleAimAndFire(v, edt, isMe, inp);
    if (v.overT > 0 && random() < edt * 10) S.sparks.push({ pos: sub(add(v.pos, mul(v.up, 0.8)), mul(v.fwd, 2.4)), vel: add(mul(v.fwd, -5), mul(randUnit(), 2)), life: 0.3 });
    if (v.hp < v.maxhp * 0.4 && random() < edt * 1.5) fxSmoke(add(v.pos, mul(v.up, 1)), 0.7, 0.12);
  }
  // ---- дроны и строители
  for (const d of [...S.drones]){
    if (!d.alive) continue;
    const isMe = fps && ctrl === d;
    const edt = isMe ? pdt : dt;
    d.flash = max(0, d.flash - edt * 4);
    d.seen[0] = max(0, d.seen[0] - edt); d.seen[1] = max(0, d.seen[1] - edt);
    if (isMe && !d.kamikaze) dronePlayerStep(d, edt); else droneStep(d, edt);
  }
  for (const b of [...S.builders]){
    if (!b.alive) continue;
    b.flash = max(0, b.flash - dt * 4);
    b.seen[0] = max(0, b.seen[0] - dt); b.seen[1] = max(0, b.seen[1] - dt);
    builderStep(b, dt);
  }
  // ---- здания
  for (const b of [...S.buildings]){
    if (!b.alive) continue;
    b.flash = max(0, b.flash - dt * 4);
    b.seen[0] = max(0, b.seen[0] - dt); b.seen[1] = max(0, b.seen[1] - dt);
    if (b.type === 'turret' || b.type === 'aa') turretStep(b, fps && S.me === b ? pdt : dt, fps && S.me === b ? turretPlayerInput(b) : null);
    else updateProduction(b, dt);
    if (b.done && b.hp < b.maxhp * 0.35 && random() < dt * 1.2) fxSmoke(add(bldCenter(b), mul(randUnit(), b.rad * 0.4)), b.rad * 0.25, 0.1);
  }
  for (const h of S.hq){ if (h.alive){ hqStep(h, dt); updateProduction(h, dt); } else if (random() < dt * 0.8) fxSmoke(add(mul(BASES[h.team], RM + 4), mul(randUnit(), 8)), 3, 0.1, 0.9); h.seen[0] = 1; h.seen[1] = 1; }
  for (const p of PROPS){ if (p.flash) p.flash = max(0, p.flash - dt * 4); if (!p.alive && random() < dt * 0.15) fxSmoke(add(p.pos, mul(p.up, 1)), 1.2, 0.1, 0.6); }
  for (const w of S.wrecks){ physStep(w, { wish: [0,0,0], speedMul: 1, thrustDir: w.up }, dt, false); w.flash = 0; w.heat = max(0, (w.heat || 0) - dt * 0.08); }
  // ---- капсулы, удары, подавление, дым
  for (let i = S.pods.length - 1; i >= 0; i--){ podStep(S.pods[i], dt); if (S.pods[i].done) S.pods.splice(i, 1); }
  strikesStep(dt);
  suppStep(dt);
  for (let i = SCREENS.length - 1; i >= 0; i--){ SCREENS[i].t += dt; if (SCREENS[i].t > SCREENS[i].life) SCREENS.splice(i, 1); }
  V2.projStep(dt);   // наведение ракет РСЗО, кассеты, «люстры» (vehicles2.js)

  // ---- снаряды
  for (let i = S.proj.length - 1; i >= 0; i--){
    const p = S.proj[i]; p.life -= dt;
    let dead = p.life <= 0, hitP = null, hitE = null, hitProp = null;
    if (p.fuse !== undefined){ p.fuse -= dt; if (p.fuse <= 0){ dead = true; hitP = p.pos; } }
    const n = max(1, Math.ceil(len(p.vel) * dt / 1.5)), h = dt / n;
    const grav = p.type === 'g' || p.type === 'a' || p.lob ? 1 : p.type === 'r' ? 0.3 : 0;
    if (grav) p.vel = add(p.vel, mul(norm(p.pos), -gAt(len(p.pos)) * dt * grav));
    for (let s = 0; s < n && !dead; s++){
      const a = p.pos; let b = add(a, mul(p.vel, h));
      for (const e of TGT[p.team]){
        if (!e.alive || e.cls === 'bld') continue;
        const r = hitRadius(e) + (p.type === 'f' && isAir(e) ? 2.2 : 0);
        if (segSphere(a, b, centerOf(e), r)){ hitE = e; hitP = b; break; }
      }
      if (!hitE){
        const hq = S.hq[1 - p.team];
        if (hq.alive && dist(b, hq.pos) < 14){ hitE = hq; hitP = b; }
      }
      if (!hitE){
        const bl = bldAt(b, 0);
        if (bl && bl.team !== p.team){ hitE = bl; hitP = b; }
        else if (bl){ hitP = b; }
        else {
          const pr = propAt(b, 0);
          if (pr){ hitP = b; hitProp = pr; }
          else if (mapStatic(b[0], b[1], b[2]) < 0){
            if (p.type === 'g' && p.fuse > 0.25){
              // граната отскакивает
              const nrm = gradN(a);
              p.vel = mul(sub(p.vel, mul(nrm, 1.6 * dot(p.vel, nrm))), 0.45);
              b = add(a, mul(nrm, 0.05));
              p.pos = b; break;
            }
            hitP = b;
          }
        }
      }
      if (hitP){ dead = true; break; }
      const l = len(b); if (l > S.R) b = mul(b, 1 - 2 * S.R / l);
      p.pos = b;
    }
    if (hitP){
      if (p.splash){
        splash(hitP, p.team, p.dmg, p.splash, p.from, p.ptype || (p.type === 'r' ? 'r' : p.type === 'g' ? 'g' : p.type === 'a' ? 'a' : 's'));
        if (hitE && (p.type === 's' || p.type === 'r') && hitE.alive !== false) damage(hitE, p.dmg * 0.35, p.from, p.ptype || p.type);
        fxExplosion(hitP, p.boom || (p.type === 's' ? 2.2 : p.type === 'a' ? 2.6 : p.type === 'g' ? 1.8 : 1.4));
      } else {
        let dmg = p.dmg;
        if (p.type === 'b') dmg *= rangeFactor(dist(hitP, p.org || hitP));
        if (hitE) damage(hitE, dmg, p.from, p.type);
        burst(hitP, hitE ? 3 : 2, 5);
        if (p.inc){ S.fx.push({ type: 'fire', pos: hitP, r0: 0.2, r1: 0.7, life: 0.3, t: 0, inten: 0.7 }); }
        if (p.type === 'f') fxSmoke(hitP, 0.6, 0.18);
        emit('impact', { pos: hitP, hit: !!hitE, cls: hitE ? hitE.cls : hitProp ? 'prop' : null });
      }
    } else if (dead && p.type === 'f'){
      fxSmoke(p.pos, 0.8, 0.2);
    }
    // свист пули мимо игрока
    if (!S.attract && fps && p.team === 1 && p.type === 'b' && S.cam && !p.whiz){
      if (dist2(p.pos, S.cam.pos) < 9){ p.whiz = 1; emit('whiz', { pos: p.pos }); }
    }
    if (dead) S.proj.splice(i, 1);
  }
  // ---- эффекты
  for (let i = S.sparks.length - 1; i >= 0; i--){
    const s = S.sparks[i]; s.life -= dt;
    if (s.life <= 0){ S.sparks.splice(i, 1); continue; }
    s.vel = add(s.vel, mul(norm(s.pos), -gAt(len(s.pos)) * dt * (s.heal ? -0.3 : 1)));
    s.pos = add(s.pos, mul(s.vel, dt));
  }
  for (let i = S.fx.length - 1; i >= 0; i--){
    const f = S.fx[i]; f.t += dt;
    if (f.t >= f.life){ S.fx.splice(i, 1); continue; }
    if (f.vel){ f.pos = add(f.pos, mul(f.vel, dt)); f.vel = mul(f.vel, 1 - dt * 0.4); }
  }
  for (let i = S.lights.length - 1; i >= 0; i--){ const l = S.lights[i]; l.t += dt; if (l.t >= l.life) S.lights.splice(i, 1); }
  for (let i = S.waves.length - 1; i >= 0; i--){ const w = S.waves[i]; w.t += rdt * (0.5 + 0.5 * slowK); if (w.t >= w.life) S.waves.splice(i, 1); }
  for (let i = S.beams.length - 1; i >= 0; i--){ const w = S.beams[i]; w.t += dt; if (w.t >= w.life) S.beams.splice(i, 1); }
  for (let i = S.markers.length - 1; i >= 0; i--){ const w = S.markers[i]; w.t += dt; if (w.t >= w.life) S.markers.splice(i, 1); }
  for (let i = S.popups.length - 1; i >= 0; i--){ const w = S.popups[i]; w.t += rdt; if (w.t >= 2.6) S.popups.splice(i, 1); }
  for (let i = S.wrecks.length - 1; i >= 0; i--){ S.wrecks[i].wreckT -= dt; if (S.wrecks[i].wreckT <= 0) S.wrecks.splice(i, 1); }

  // ---- захват точек и доход
  const surfOwned = [0, 0], coreOwned = [0, 0];
  for (const cp of S.cps){
    const R = cp.core ? CORE_R : 15;
    const n = [0, 0];
    for (const e of S.units) if (e.alive && dist(e.pos, cp.pos) < R) n[e.team]++;
    if (!cp.core) for (const v of S.vehicles) if (v.alive && dist(v.pos, cp.pos) < R + 2) n[v.team] += 2;
    if (n[0] && !n[1]) cp.prog = min(1, cp.prog + min(n[0], 3) * GAME.CAP_RATE * dt);
    else if (n[1] && !n[0]) cp.prog = max(-1, cp.prog - min(n[1], 3) * GAME.CAP_RATE * dt);
    cp.contested = n[0] > 0 && n[1] > 0;
    const old = cp.owner;
    if (cp.prog >= 1) cp.owner = 0; else if (cp.prog <= -1) cp.owner = 1;
    else if ((cp.owner === 0 && cp.prog <= 0) || (cp.owner === 1 && cp.prog >= 0)) cp.owner = -1;
    if (cp.owner !== old){
      if (!S.attract){
        if (cp.owner >= 0) feed(tr(`${teamName(cp.owner)} захватил ${cp.core ? 'Ядро' : 'точку ' + cp.name}`, `${teamName(cp.owner)} captured ${cp.core ? 'the Core' : 'point ' + cp.name}`, `${teamName(cp.owner)} đã chiếm ${cp.core ? 'the Core' : 'point ' + cp.name}`), TEAM[cp.owner].css);
        else feed(tr(`${teamName(old)} потерял ${cp.core ? 'Ядро' : 'точку ' + cp.name}`, `${teamName(old)} lost ${cp.core ? 'the Core' : 'point ' + cp.name}`, `${teamName(old)} đã mất ${cp.core ? 'the Core' : 'point ' + cp.name}`), '#aaa');
      }
      if (cp.owner >= 0){ addCmd(cp.owner, 1); S.stats.caps[cp.owner]++; if (cp.owner === 0){ PROG.onCapture(cp); if (S.me && dist(S.me.pos, cp.pos) < 50) SQUADUI.say('cap', null, null, 20); } }
      emit('capture', { cp, owner: cp.owner, old });
    }
    if (cp.owner >= 0){ if (cp.core) coreOwned[cp.owner]++; else surfOwned[cp.owner]++; }
  }
  for (const t of [0, 1]){
    const T = S.teams[t];
    T.income = ecoIncome(t, surfOwned[t], coreOwned[t]);   // v6: штаб + точки + экстракторы (rts_build.js)
    T.ore += T.income * dt;
    T.cmdT = (T.cmdT || 0) + dt; if (T.cmdT > 75){ T.cmdT = 0; addCmd(t, 1); }
  }
  ecoStep(dt);

  // ---- находки: склады и модули первой экспедиции (кто первым подошёл — тому руда)
  S.lootT = (S.lootT || 0) - dt;
  if (S.lootT <= 0){
    S.lootT = 1;
    for (const p of PROPS){
      if (!p.loot || !p.alive) continue;
      for (const u of S.units){
        if (!u.alive || dist2(u.pos, p.pos) > 100) continue;
        S.teams[u.team].ore += p.loot;
        if (!S.attract){
          if (u.team === 0){ feed(tr(`${N2(PROP_KINDS[p.kind].n)}: найдены припасы, +${p.loot} руды`, `${N2(PROP_KINDS[p.kind].n)}: supplies found, +${p.loot} ore`, `${N2(PROP_KINDS[p.kind].n)}: tìm thấy tiếp tế, +${p.loot} quặng`), '#ffb347'); if (u === S.me) PROG.award(40, tr('находка', 'salvage', 'tìm thấy'), 1, '#ffb347'); }
          else feed(tr('Разведка: Рой разграбил склад первой экспедиции', 'Intel: the Swarm looted a first-expedition depot', 'Tình báo: Bầy Đàn đã cướp một kho của đoàn thám hiểm đầu tiên'), '#f88');
        }
        p.loot = 0; break;
      }
    }
  }
  // ---- пылевая буря: раз в 5–9 минут, ~70 с, видимость падает
  S.stormT -= dt;
  if (!S.storm && S.stormT <= 0){ S.storm = { t: 0, dur: 60 + random() * 30, k: 0 }; if (!S.attract){ emit('radio', { text: tr('Внимание: идёт пылевая буря. Видимость падает.', 'Warning: a dust storm is coming. Visibility dropping.', 'Cảnh báo: bão bụi đang tới. Tầm nhìn giảm.'), pri: 1 }); feed(tr('Пылевая буря: видимость и обзор юнитов снижены', 'Dust storm: visibility and unit sight reduced', 'Bão bụi: tầm nhìn và tầm quan sát giảm'), '#d9b48a'); } }
  if (S.storm){
    const st = S.storm; st.t += dt;
    st.k = smoothstep(0, 8, st.t) * (1 - smoothstep(st.dur - 10, st.dur, st.t));
    if (st.t >= st.dur){ S.storm = null; S.stormT = 300 + random() * 240; }
  }
  // ---- стратег, подсказки
  squadThink(dt);
  if (!S.attract){ TACT.step(dt); HINTS.step(rdt); adaptStep(dt); }

  // ---- конец матча: штаб и все ключевые здания
  if (!S.over){
    let winner = null, why = '';
    for (const t of [0, 1]) if (!S.hq[t].alive && !keyBuildings(t).length){ winner = 1 - t; why = t === 1 ? tr('Штаб и все ключевые здания Роя уничтожены', 'The Swarm HQ and all key buildings are destroyed', 'Sở chỉ huy và mọi công trình then chốt của Bầy Đàn đã bị phá') : tr('Наш штаб и все ключевые здания уничтожены', 'Our HQ and all key buildings are destroyed', 'Sở chỉ huy và mọi công trình then chốt của ta đã bị phá'); }
    if (winner === null && !S.endless && S.time >= GAME.MATCH){
      const pts = [0, 1].map(t => S.cps.filter(c => c.owner === t).length);
      if (pts[0] !== pts[1]){ winner = pts[0] > pts[1] ? 0 : 1; why = tr(`Время вышло: точки ${pts[0]} : ${pts[1]}`, `Time is up: points ${pts[0]} : ${pts[1]}`, `Hết giờ: điểm ${pts[0]} : ${pts[1]}`); }
      else { const hp = S.hq.map(h => max(0, h.hp) / h.maxhp + keyBuildings(h.team).length * 0.2); winner = hp[0] >= hp[1] ? 0 : 1; why = tr('Время вышло, точки поровну — решила прочность баз', 'Time is up, points tied — base strength decided', 'Hết giờ, điểm hòa — độ bền căn cứ quyết định'); }
    }
    if (winner !== null){
      S.over = true; S.winner = winner; S.overWhy = why; S.overT = S.rtime;
      emit('over', { winner });
      if (!S.attract) PROG.matchEnd(winner === 0);
    }
  }
  if (fps && (!S.me || (!S.me.alive && S.me.cls !== 'bld')) && !S.over) autoSwitch();
}
