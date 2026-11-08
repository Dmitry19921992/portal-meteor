// =====================================================================
//  ПОБОЧНЫЕ ЗАДАЧИ (оранжевые) и КОРОТКИЙ ПУТЬ ЧЕРЕЗ НЕБО (голубой)
//  Побочные задачи — необязательные, рядом с игроком, за опыт и награды.
//  Короткий путь: если цель ближе к антиподу, а ранец достаёт до купола —
//  стратег подсказывает взлететь: выйдешь с другой стороны метеорита.
// =====================================================================
const SIDEQ = {
  q: null, nextT: 40, tick: 0, sky: null, skyToldT: -99,
  reset(){ this.q = null; this.nextT = 40 + random() * 30; this.tick = 0; this.sky = null; },
  step(dt){
    if (S.attract || S.mode !== 'fps' || TUT.on) { if (S.attract) this.q = null; return; }
    this.tick -= dt; if (this.tick > 0) return; this.tick = 1;
    const c = ctrlEntity(); if (!c || c.cls === 'bld') return;
    if (this.q) this.check(c); else if (S.time > this.nextT) this.offer(c);
    this.skyRoute(c);
  },
  offer(c){
    const L = [];
    const prop = PROPS.filter(p => p.alive && p.vein === undefined && dist(p.pos, c.pos) < 130 && dist(p.pos, c.pos) > 15).sort((a, b) => dist(a.pos, c.pos) - dist(b.pos, c.pos))[0];
    if (prop) L.push(['salvage', 3, prop]);
    const sonar = PROPS.find(p => p.alive && p.kind === 2 && dist(p.pos, c.pos) < 170);
    if (sonar) L.push(['beacon', 3, sonar]);
    if (!underground(c.pos)) L.push(['drone', 2, null]);
    const hut = PROPS.filter(p => p.alive && p.loot > 0 && dist(p.pos, c.pos) < 240).sort((a, b) => dist(a.pos, c.pos) - dist(b.pos, c.pos))[0];
    if (hut) L.push(['loot', 4, hut]);
    for (const g of groupsOf(0)){
      if (g === playerGroup()) continue;
      const Lg = leaderOf(g); if (!Lg) continue;
      const d = dist(Lg.pos, c.pos);
      if (d < 160 && d > 25 && groupHP(g) < 0.6 && enemiesNear(0, Lg.pos, 45, e => e.cls === 'inf' || e.cls === 'tank').length >= 2){ L.push(['rescue', 5, g]); break; }
    }
    if (!L.length){ this.nextT = S.time + 20; return; }
    let sum = 0; for (const o of L) sum += o[1];
    let r = random() * sum, pick = L[0];
    for (const o of L){ r -= o[1]; if (r <= 0){ pick = o; break; } }
    const [kind, , obj] = pick;
    const q = { kind, t0: S.time, prog: 0 };
    if (kind === 'salvage'){ q.prop = obj; q.xp = 80; }
    if (kind === 'beacon'){ q.prop = obj; q.xp = 90; }
    if (kind === 'loot'){ q.prop = obj; q.xp = 70; }
    if (kind === 'rescue'){ q.g = obj; q.xp = 140; q.foes = enemiesNear(0, leaderOf(obj).pos, 50, e => e.cls === 'inf' || e.cls === 'tank'); }
    if (kind === 'drone'){
      const up = norm(c.pos), dir = offsetOnSphere(up, randUnit(), 70 + random() * 40);
      const d = makeDrone(add(surfacePoint(dir, 0.7), mul(dir, 30)), 1);
      d.hp = d.maxhp = 70; d.scout = true; d.alt = 26; d.goal = surfacePoint(dir, 0.7); d.order = 'hold'; d.manualUntil = 1e9;
      q.drone = d; q.xp = 100;
    }
    this.q = q;
    emit('radio', { text: tr('Побочная задача: ', 'Side task: ', 'Nhiệm vụ phụ: ') + this.title(q), pri: 0 });
    emit('sideq', {});
  },
  title(q){
    switch (q.kind){
      case 'salvage': return tr(`разобрать ${N2(PROP_KINDS[q.prop.kind].n).toLowerCase()} на руду`, `blow up the ${N2(PROP_KINDS[q.prop.kind].n).toLowerCase()} for ore`, `phá ${N2(PROP_KINDS[q.prop.kind].n).toLowerCase()} lấy quặng`);
      case 'loot': return tr(`обыскать: ${N2(PROP_KINDS[q.prop.kind].n).toLowerCase()} — там припасы`, `search the ${N2(PROP_KINDS[q.prop.kind].n).toLowerCase()} — supplies inside`, `lục soát ${N2(PROP_KINDS[q.prop.kind].n).toLowerCase()} — có tiếp tế`);
      case 'beacon': return tr('включить старый эхолокатор — постой рядом', 'switch on the old sonar array — stay next to it', 'bật trạm sonar cũ — đứng cạnh nó');
      case 'drone': return tr('сбить разведдрон Роя', 'shoot down the Swarm scout drone', 'bắn hạ drone trinh sát của Bầy Đàn');
      case 'rescue': return tr(`выручить ${groupLabel(q.g).toLowerCase()} — его зажали`, `help ${groupLabel(q.g)} — they are pinned down`, `cứu ${groupLabel(q.g)} — họ đang bị kẹp`);
    }
    return '';
  },
  pos(){
    const q = this.q; if (!q) return null;
    if (q.prop) return add(q.prop.pos, mul(q.prop.up, 3));
    if (q.drone) return q.drone.pos;
    if (q.g){ const L = leaderOf(q.g); return L ? L.pos : null; }
    return null;
  },
  check(c){
    const q = this.q, age = S.time - q.t0;
    let ok = false, fail = age > 150;
    if (q.kind === 'salvage'){ ok = !q.prop.alive; }
    else if (q.kind === 'loot'){ if (!q.prop.alive) fail = true; else if (!q.prop.loot) { ok = dist(c.pos, q.prop.pos) < 30; fail = !ok; } }
    else if (q.kind === 'beacon'){
      if (!q.prop.alive) fail = true;
      else if (dist(c.pos, q.prop.pos) < 9){ q.prog += 1 / 6; if (q.prog >= 1){ ok = true; S.scans.push({ team: 0, pos: q.prop.pos, t: 0, life: 40, r: 140 }); emit('scan', { pos: q.prop.pos, team: 0 }); } }
    }
    else if (q.kind === 'drone'){ ok = !q.drone.alive; }
    else if (q.kind === 'rescue'){
      if (!groupAlive(q.g)) fail = true;
      else { q.foes = q.foes.filter(e => e.alive); const L = leaderOf(q.g); q.foes = q.foes.concat(enemiesNear(0, L.pos, 45, e => (e.cls === 'inf' || e.cls === 'tank') && !q.foes.includes(e))); ok = !q.foes.length && dist(c.pos, L.pos) < 70; }
    }
    if (ok){
      PROG.award(q.xp, tr('побочная задача', 'side task', 'nhiệm vụ phụ'), 1, '#ffb347');
      if (q.kind === 'rescue'){ addCmd(0, 2); feed(tr(`${groupLabel(q.g)}: «Спасибо, мы в долгу!» +2 КО`, `${groupLabel(q.g)}: "Thanks, we owe you!" +2 CP`, `${groupLabel(q.g)}: “Cảm ơn, nợ bạn một lần!” +2 ĐCH`), '#ffb347'); }
      if (q.kind === 'beacon') feed(tr('Эхолокатор ожил: враги в радиусе 140 м видны 40 с', 'The sonar is alive: enemies within 140 m revealed for 40 s', 'Trạm sonar hoạt động: lộ địch trong 140 m suốt 40 giây'), '#ffb347');
      if (q.kind === 'drone' && random() < 0.6) PROG.giveReward();
      emit('objdone', { text: tr('Побочная задача выполнена', 'Side task complete', 'Hoàn thành nhiệm vụ phụ') });
      this.q = null; this.nextT = S.time + 70 + random() * 50;
    } else if (fail){
      if (q.drone && q.drone.alive){ q.drone.manualUntil = 0; }
      this.q = null; this.nextT = S.time + 45;
    }
  },
  // короткий путь через купол
  skyRoute(c){
    this.sky = null;
    if (c.cls !== 'inf' || underground(c.pos)) return;
    const goal = (typeof MISSION !== 'undefined' && MISSION.navPos()) || TACT.navPos(); if (!goal || len(goal) < 80) return;
    const J = c.jet; if (!J || J.thrust < 10) return;     // ранец должен достать до купола
    const dNow = surfDist(c.pos, goal), dSky = surfDist(mul(c.pos, -1), goal) + 120;
    if (dNow < 420 || dSky > dNow - 220) return;
    this.sky = { exit: surfacePoint(norm(mul(c.pos, -1)), 0.5), save: Math.round(dNow - dSky) };
    if (S.time - this.skyToldT > 90){ this.skyToldT = S.time; emit('radio', { text: tr('Есть короткий путь: взлетай прямо вверх через купол — выйдешь у цели.', 'Shortcut available: fly straight up through the dome — you will come out near the target.', 'Có lối tắt: bay thẳng lên xuyên mái vòm — bạn sẽ ra gần mục tiêu.'), pri: 0 }); }
  },
  card(){
    const q = this.q; if (!q) return '';
    const c = ctrlEntity(), p = this.pos();
    const d = p && c ? Math.round(surfDist(p, c.pos)) : 0;
    const extra = q.kind === 'beacon' && q.prog > 0 ? ` · ${Math.round(q.prog * 100)}%` : q.kind === 'rescue' ? ` · ${tr('врагов', 'foes', 'địch')} ${q.foes.length}` : '';
    const trk = typeof MISSION !== 'undefined' ? (MISSION.nav && MISSION.nav.mode === 'side' ? ' · ' + tr('маршрут показан', 'route shown', 'đang dẫn đường') : ` · ${bk('track')} — ${tr('маршрут', 'route', 'dẫn đường')}`) : '';
    return `<small>${tr('ПОБОЧНАЯ ЗАДАЧА', 'SIDE TASK', 'NHIỆM VỤ PHỤ')} · +${q.xp} XP</small><b>${this.title(q)}</b><em>${d} ${tr('м', 'm', 'm')} ${p ? relDirWord(p) : ''}${extra}${trk}</em>`;
  },
  overlay(){
    const c = ctrlEntity(); if (!c) return;
    const p = this.pos();
    if (p) edgeMarker(p, '#ffa94d', '◆ ' + tr('ПОБОЧНАЯ', 'SIDE', 'PHỤ') + (typeof MISSION !== 'undefined' && MISSION.nav && MISSION.nav.mode === 'side' ? ' ✓' : ''), `${Math.round(surfDist(p, c.pos))} ${tr('м', 'm', 'm')}`);
    if (this.sky){
      // голубые шевроны вверх над бойцом: «взлетай»
      const up = norm(c.pos), tt = performance.now() / 500;
      octx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++){
        const h = 6 + ((i * 6 + tt * 6) % 36);
        const s = project(add(add(c.pos, mul(tangent(c.fwd, up), 8)), mul(up, h))); if (!s) continue;
        const a = 1 - h / 42, sz = clamp(240 / s[2], 4, 16);
        octx.strokeStyle = `rgba(120,200,255,${a.toFixed(2)})`;
        octx.beginPath(); octx.moveTo(s[0] - sz, s[1] + sz * 0.6); octx.lineTo(s[0], s[1] - sz * 0.4); octx.lineTo(s[0] + sz, s[1] + sz * 0.6); octx.stroke();
      }
      octx.fillStyle = 'rgba(140,210,255,.95)'; octx.font = '600 13px "Exo 2", sans-serif'; octx.textAlign = 'center';
      octx.fillText(tr(`КОРОТКИЙ ПУТЬ ЧЕРЕЗ НЕБО · ${bk('run')} — взлёт · экономия ~${this.sky.save} м`, `SKY SHORTCUT · ${bk('run')} — take off · saves ~${this.sky.save} m`, `LỐI TẮT QUA BẦU TRỜI · ${bk('run')} — cất cánh · tiết kiệm ~${this.sky.save} m`), innerWidth / 2, innerHeight / 2 + 92);
    }
  },
};
