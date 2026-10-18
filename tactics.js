// =====================================================================
//  ИИ-СТРАТЕГ В РЕАЛЬНОМ ВРЕМЕНИ: тактические задачи для группы игрока
//  (атаковать рядом, обойти с фланга, обойти стороной, танк, турель,
//   защитить точку, отступить на ремонт) + контроль выполнения
// =====================================================================
const TACT = {
  task: null, tick: 0, lastNag: -99, lastPraise: -99, lastSwitch: -99, onTask: false, lastStratKey: '', seq: 0, stick: null,
  reset(){ this.task = null; this.tick = 0; this.lastNag = -99; this.lastPraise = -99; this.lastSwitch = -99; this.onTask = false; this.lastStratKey = ''; this.stick = null; if (typeof MISSION !== 'undefined') MISSION.reset(); },
  aiOn(){ return S.teams[0] && S.teams[0].ai; },
  // ---------- куда вести игрока ----------
  navPos(){
    const t = this.task; if (!t || t.done) return null;
    if (t.wp && t.phase === 1) return t.wp;
    if (t.kind === 'escort') return t.tank && t.tank.alive ? t.tank.pos : t.pos;
    if (t.kind === 'capture') return t.cp.pos;
    if (t.kind === 'strat'){
      // приказ штаба: ведём по самому приказу (он «залипает»), а не по текущему состоянию группы
      if (t.order === 'attack'){ const a = assaultTarget(1, ctrlEntity() ? ctrlEntity().pos : t.pos); return a.ent ? centerOf(a.ent) : (t.goal || t.pos); }
      if (t.order === 'cap' && t.cp) return t.cp.core ? [0, 0, 0] : t.cp.pos;
      return t.goal || t.pos;
    }
    if (t.kind === 'player'){
      const g = t.g; if (!g) return t.pos;
      if (g.order === 'attack') return assaultTarget(1, leaderPos(g) || t.pos).ent ? centerOf(assaultTarget(1, leaderPos(g) || t.pos).ent) : t.pos;
      return groupGoal(g) || t.pos;
    }
    if (t.targets && t.targets.length){ const alive = t.targets.filter(e => e.alive); if (alive.length) return clusterCenter(alive).pos; }
    return t.pos;
  },
  // ---------- множитель опыта: за действия по приказу ----------
  multFor(victim){
    const t = this.task;
    if (!t || t.done || !this.aiOn()) return { m: 1, tag: '' };
    const tag2 = tr('ПРИКАЗ ×2', 'ORDER ×2', 'MỆNH LỆNH ×2'), tag3 = tr('ПРИКАЗ ×3', 'ORDER ×3', 'MỆNH LỆNH ×3');
    const vp = victim.pos || [0, 0, 0];
    if (t.targets && t.targets.includes(victim)) return t.mult >= 3 ? { m: 3, tag: tag3 } : { m: 2, tag: tag2 };
    if (t.kind === 'defend' && t.cp && dist(vp, t.cp.pos) < 55) return { m: 3, tag: tag3 };
    if ((t.kind === 'engage' || t.kind === 'flank') && t.pos && dist(vp, t.pos) < 28) return { m: 2, tag: tag2 };
    if (t.kind === 'capture' && dist(vp, t.cp.pos) < 65) return { m: 2, tag: tag2 };
    if (t.kind === 'escort' && t.tank && dist(vp, t.tank.pos) < 60) return { m: 2, tag: tag2 };
    if (t.kind === 'strat' && t.g){
      const g = { order: t.order, cp: t.cp };
      if (g.order === 'cap' && g.cp && dist(vp, g.cp.pos) < 65) return { m: 2, tag: tag2 };
      if (g.order === 'attack'){ const a = assaultTarget(1, vp); if (a.ent && dist(vp, a.ent.pos) < 90) return { m: 2, tag: tag2 }; }
      if (g.order === 'defend' && dist(vp, BASES[0].map(x => x * RM)) < 160) return { m: 2, tag: tag2 };
    }
    return { m: 1, tag: '' };
  },
  multForCapture(cp){
    const t = this.task;
    if (!t || !this.aiOn()) return { m: 1, tag: '' };
    if ((t.kind === 'strat' && (t.cp === cp || t.g && t.g.cp === cp)) || ((t.kind === 'defend' || t.kind === 'capture') && t.cp === cp)) return { m: 2, tag: tr('ПРИКАЗ ×2', 'ORDER ×2', 'MỆNH LỆNH ×2') };
    return { m: 1, tag: '' };
  },
  // ---------- основной цикл ----------
  step(dt){
    this.tick -= dt;
    const t = this.task;
    if (t && t.done){ if (S.time - t.doneT > 3.5) this.task = null; }
    if (this.tick > 0) return;
    this.tick = 1.0;
    if (S.attract || S.mode !== 'fps'){ return; }
    const g = playerGroup(), c = ctrlEntity();
    if (!g || !c || c.cls === 'bld'){ return; }
    if (this.task && this.task.g !== g){ this.task = null; }
    if (this.task && !this.task.done) this.evaluate(this.task, c, g);
    if (typeof MISSION !== 'undefined') MISSION.step(c, g);
    const ai = this.aiOn();
    const cand = ai ? this.candidates(c, g) : [];
    if (ai && typeof MISSION !== 'undefined') MISSION.candidates(c, g, cand);
    cand.push(this.stratTask(g));
    cand.sort((a, b) => b.pri - a.pri);
    const best = cand[0];
    const cur = this.task && !this.task.done ? this.task : null;
    if (!cur) this.begin(best, g, false);
    else if (best && !this.same(best, cur) && this.shouldSwitch(cur, best)) this.begin(best, g, true);
    else if (cur.kind === 'strat' || cur.kind === 'player'){
      // приказ штаба «залипает» (см. stratSrc): переозвучиваем, только если он действительно сменился
      const key = this.stratKey(g);
      if (key !== this.lastStratKey) this.begin(this.stratTask(g), g, false);
    }
    this.apply(g);
    this.monitor(c, g);
  },
  // та же задача? (тот же тип и те же цели / точка / танк)
  same(a, b){
    const cpOf = x => x.kind === 'capture' || (x.kind === 'strat' && x.order === 'cap') ? x.cp : null;
    if (cpOf(a) && cpOf(a) === cpOf(b)) return true;      // «захватить X» штаба и «X рядом» — одна и та же задача
    if (a.kind !== b.kind) return false;
    if (a.kind === 'strat' || a.kind === 'player') return a.order === b.order && a.cp === b.cp;
    if (a.cp || b.cp) return a.cp === b.cp;
    if (a.tank || b.tank) return a.tank === b.tank;
    if (a.targets && b.targets) return a.targets.some(e => b.targets.includes(e));
    return true;
  },
  // гистерезис: новая задача должна быть заметно важнее, а текущая — успеть поработать
  shouldSwitch(cur, best){
    const age = S.time - cur.t0, since = S.time - this.lastSwitch;
    if (best.pri >= 85) return since > 2;                                   // отступить на ремонт
    if (best.pri < cur.pri + 12) return false;
    if (cur.kind === 'strat' || cur.kind === 'player') return since > 6;    // бой рядом важнее дальнего приказа
    if (best.pri >= 75) return since > 5;                                   // танк, сигнальщик
    return age > 15 && since > 10;
  },
  stratKey(g){ const s = this.stratSrc(g); return s.order + '|' + (s.cp ? s.cp.name : '') + '|' + (s.order === 'move' && s.goal ? s.goal.map(x => Math.round(x / 60)).join(',') : ''); },
  // сколько держим приказ штаба, прежде чем принять другой (если он не выполнен и не потерял смысл)
  HOLD: { cap: 100, attack: 120, defend: 30, escort: 60, move: 45, hold: 45, idle: 0 },
  stratSrc(g){
    if (this.aiOn() && g.manualUntil < S.time){
      const s = g.strat ? { order: g.strat.order, goal: g.strat.goal, cp: g.strat.cp, wp: g.strat.wp } : { order: 'idle', goal: null, cp: null };
      return Object.assign(this.sticky(g, s), { by: 'ai' });
    }
    return { order: g.order, goal: g.goal, cp: g.cp, by: g.manualUntil >= S.time ? 'player' : 'ai' };
  },
  sticky(g, s){
    const k = this.stick, now = S.time;
    const same = k && k.g === g && k.order === s.order && k.cp === s.cp;
    if (same){ k.goal = s.goal; k.wp = s.wp; return k; }
    let take = !k || k.g !== g || k.order === 'idle';
    if (!take){
      const done = k.order === 'cap' && k.cp && k.cp.owner === 0 && abs(k.cp.prog) >= 1;
      const pointless = k.order === 'attack' && !S.hq[1].alive && !keyBuildings(1).length;
      const hold = this.HOLD[k.order] !== undefined ? this.HOLD[k.order] : 60;
      const c = ctrlEntity();
      const urgent = (s.order === 'defend' && k.order !== 'defend') ||
                     (s.order === 'cap' && s.cp && s.cp.owner === 0 && s.cp.contested && c && surfDist(c.pos, s.cp.pos) < 200);
      take = done || pointless || now - k.t0 > hold || (urgent && now - k.t0 > 8);
    }
    if (take && s.order !== 'idle' || !k || k.g !== g) this.stick = { g, order: s.order, goal: s.goal, cp: s.cp, wp: s.wp, t0: now };
    return this.stick;
  },
  stratTask(g){
    const s = this.stratSrc(g);
    const c = ctrlEntity(), far = !!(c && s.goal && len(s.goal) > 80 && surfDist(c.pos, s.cp ? s.cp.pos : s.goal) > 200);
    return { kind: s.by === 'player' && !this.aiOn() ? 'player' : 'strat', pri: s.order === 'idle' ? 5 : 30, order: s.order, goal: s.goal, cp: s.cp, swp: s.wp, by: s.by, pos: s.goal, far, xp: s.order === 'cap' ? 150 : 80 };
  },
  candidates(c, g){
    const L = [];
    const eye = add(c.pos, mul(c.up, 1));
    const vis = e => e.seen[0] > 0 || los(eye, centerOf(e));
    let enemies = enemiesNear(0, c.pos, 72, e => e.cls === 'inf' || e.cls === 'tank' || e.cls === 'drone');
    enemies.sort((a, b) => dist(a.pos, c.pos) - dist(b.pos, c.pos));
    enemies = enemies.slice(0, 14).filter(vis);
    const hpF = c.hp / c.maxhp, gHP = groupHP(g);
    const allies = groupUnits(g).length + groupsOf(0).filter(o => o !== g && leaderOf(o) && dist(leaderOf(o).pos, c.pos) < 45).length * 2;
    // отступить на ремонт
    if ((hpF < 0.3 || gHP < 0.33) && enemies.length >= 2 && c.cls !== 'drone'){
      const rp = this.repairPoint(c);
      if (rp) L.push({ kind: 'retreat', pri: 90, pos: rp, xp: 30 });
    }
    // вражеский танк
    const tank = enemies.find(e => e.cls === 'tank' && dist(e.pos, c.pos) < 80);
    if (tank) L.push({ kind: 'tank', pri: 80, targets: [tank], pos: tank.pos, xp: 120, mult: 3 });
    // скопление врагов
    const inf = enemies.filter(e => e.cls !== 'tank');
    if (inf.length){
      const cl = clusterCenter(inf);
      const mem = inf.filter(e => dist(e.pos, cl.pos) < 20);
      const n = mem.length;
      const sg = this.stratSrc(g);
      const farGoal = sg.goal && surfDist(c.pos, sg.goal) > 140;
      if (n >= max(4, allies * 3) && farGoal && c.cls === 'inf'){
        L.push({ kind: 'avoid', pri: 60, pos: cl.pos, targets: mem, wp: this.sidestep(c.pos, cl.pos, sg.goal, 55), phase: 1, xp: 60 });
      } else if (n >= max(3, allies * 1.6) && c.cls !== 'tank'){
        L.push({ kind: 'flank', pri: 74, pos: cl.pos, targets: mem, wp: this.flankPoint(c.pos, cl.pos, inf), phase: 1, xp: 150, mult: 3 });
      } else if (dist(cl.pos, c.pos) < 60){
        L.push({ kind: 'engage', pri: 70 + n, pos: cl.pos, targets: mem, xp: 50 + 15 * n, mult: 2 });
      }
    }
    // турель / ПВО
    const st = enemiesNear(0, c.pos, 78, e => e.cls === 'bld' && (e.type === 'turret' || e.type === 'aa') && e.done).filter(vis);
    if (st.length) L.push({ kind: 'struct', pri: 62, targets: [st[0]], pos: st[0].pos, xp: 100, mult: 2 });
    // защита точки
    for (const cp of S.cps){
      if (cp.core || (cp.owner !== 0 && cp.prog <= 0.2)) continue;
      if (dist(cp.pos, c.pos) > 170) continue;
      const foes = enemiesNear(0, cp.pos, 45, e => e.cls === 'inf' || e.cls === 'tank');
      if (foes.length >= 2) { L.push({ kind: 'defend', pri: 66, cp, pos: cp.pos, targets: foes.slice(), xp: 140, mult: 3 }); break; }
    }
    return L;
  },
  repairPoint(c){
    let best = null, bd = 1e9;
    const consider = (p, safeR) => { const d = dist(p, c.pos); if (d < bd && d > 12 && !enemiesNear(0, p, safeR || 35).length){ bd = d; best = p; } };
    for (const cp of S.cps) if (!cp.core && cp.owner === 0) consider(cp.pos);
    for (const b of S.buildings) if (b.alive && b.team === 0 && b.done && (b.type === 'outpost' || b.type === 'factory')) consider(siteExit(b, 4));
    if (S.hq[0].alive) consider(add(mul(BASES[0], RM), mul(tangent(sub(c.pos, mul(BASES[0], RM)), BASES[0]), 24)), 60);
    return best;
  },
  // точка для обхода с фланга: сбоку от противника, со стороны, где меньше врагов
  flankPoint(from, center, enemies){
    const up = norm(center);
    const toC = tangent(sub(center, from), up);
    const side = norm(cross(up, toC));
    let sL = 0, sR = 0;
    for (const e of enemies){ const s = dot(sub(e.pos, center), side); if (s > 0) sR++; else sL++; }
    const sgn = sR <= sL ? 1 : -1;
    const wp = add(add(center, mul(side, 34 * sgn)), mul(toC, -6));
    return surfacePoint(norm(wp), 0.5);
  },
  sidestep(from, center, goal, off){
    const up = norm(from);
    const toG = tangent(sub(goal, from), up);
    const side = norm(cross(up, toG));
    const s = dot(sub(center, from), side) > 0 ? -1 : 1;
    const mid = add(add(from, mul(toG, 50)), mul(side, off * s));
    return surfacePoint(norm(mid), 0.5);
  },
  begin(cand, g, preempt){
    if (!cand) return;
    const task = Object.assign({ g, t0: S.time, done: false, killed: 0, lastProgD: 1e9, stallT: 0, mult: 2 }, cand);
    if (task.targets) task.total = task.targets.length;
    const cur = this.task;
    if (cur && !cur.done && typeof MISSION !== 'undefined') MISSION.taskEnd(cur, false);
    this.task = task; this.lastSwitch = S.time; task.id = ++this.seq;
    const free = typeof MISSION !== 'undefined' && MISSION.free();
    if (task.kind === 'strat' || task.kind === 'player'){
      this.lastStratKey = this.stratKey(g);
      if (task.kind === 'strat' && this.aiOn() && !free) setOrder(g, task.order, task.goal, { cp: task.cp, wp: task.swp });
      if (task.order === 'idle') return;
      // одна озвучка на приказ: тот же приказ не повторяем чаще раза в 2 минуты
      const og = { order: task.order, cp: task.cp, team: g.team, focus: g.focus, escort: g.escort };
      const podTip = task.far && typeof MISSION !== 'undefined' && MISSION.canRedeploy() ? tr(` Далеко — ${bk('redeploy')}, капсула.`, ` It's far — ${bk('redeploy')} for a drop pod.`, ` Xa đấy — ${bk('redeploy')} để gọi khoang.`) : '';
      const say = `${groupLabel(g)}: ${task.kind === 'player' ? orderSpeech(g) : orderSpeech(og)}.${podTip}`;
      VOX.order(task, 'strat|' + task.order + '|' + (task.cp ? task.cp.name : ''), say, { cool: 120 });
      if (!free) S.navT = 8;
      return;
    }
    // тактическая задача
    const d = Math.round(dist(task.pos, ctrlEntity().pos) / 5) * 5;
    const dirw = relDirWord(task.pos);
    const n = task.targets ? task.targets.length : 0;
    const pre = preempt && cur && !cur.done && cur.kind !== 'strat' && cur.kind !== 'player' ? tr('Отставить! ', 'Belay that! ', 'Hủy lệnh! ') : '';
    const gl = groupLabel(g);
    let say = '';
    switch (task.kind){
      case 'engage': say = tr(`${gl}, противник ${dirw}, ${d} метров. ${n} ${plural(n, 'цель', 'цели', 'целей')}. Уничтожить!`, `${gl}, hostiles ${dirw}, ${d} meters. ${n} ${plural(n, 'target', 'targets', 'targets')}. Take them out!`, `${gl}, địch ở ${dirw}, ${d} mét. ${n} mục tiêu. Tiêu diệt!`); break;
      case 'flank': say = tr(`${gl}, их слишком много в лоб. Обойдите с фланга по маркеру, потом огонь!`, `${gl}, too many of them head-on. Flank along the marker, then open fire!`, `${gl}, chúng quá đông nếu đánh trực diện. Vòng sườn theo dấu chỉ, rồi khai hỏa!`); break;
      case 'avoid': say = tr(`${gl}, крупные силы противника ${dirw}. Не ввязывайтесь — обойдите их по маркеру.`, `${gl}, large enemy force ${dirw}. Don't engage — go around them via the marker.`, `${gl}, lực lượng lớn của địch ở ${dirw}. Đừng giao chiến — đi vòng qua chúng theo dấu chỉ.`); break;
      case 'tank': say = ctrlEntity().cls === 'inf' ? tr(`${gl}, вражеский танк ${dirw}! Ракеты — клавиша Q. Уничтожить!`, `${gl}, enemy tank ${dirw}! Rockets — Q. Destroy it!`, `${gl}, xe tăng địch ở ${dirw}! Tên lửa — phím Q. Tiêu diệt nó!`) : tr(`${gl}, вражеский танк ${dirw}, ${d} метров. Дуэль — уничтожить!`, `${gl}, enemy tank ${dirw}, ${d} meters. Duel — destroy it!`, `${gl}, xe tăng địch ở ${dirw}, ${d} mét. Đấu tay đôi — tiêu diệt nó!`); break;
      case 'struct': say = tr(`${gl}, ${entName(task.targets[0])} ${dirw} прижимает огнём. Уничтожить — ракеты и гранаты!`, `${gl}, ${entName(task.targets[0])} ${dirw} is pinning us. Destroy it — rockets and grenades!`, `${gl}, ${entName(task.targets[0])} ở ${dirw} đang ghìm chân ta. Phá nó — dùng tên lửa và lựu đạn!`); break;
      case 'defend': say = tr(`${gl}, ${cpSayNom(task.cp).toLowerCase()} атакована! На защиту — тройной опыт!`, `${gl}, ${cpSay(task.cp)} is under attack! Defend it — triple XP!`, `${gl}, ${cpSay(task.cp)} đang bị tấn công! Bảo vệ — kinh nghiệm gấp ba!`); break;
      case 'retreat': say = tr(`${gl}, вы сильно повреждены. Отходите к маркеру на ремонт!`, `${gl}, you are badly damaged. Fall back to the marker for repairs!`, `${gl}, bạn bị hư hại nặng. Rút về dấu chỉ để sửa chữa!`); break;
      case 'intercept': say = task.ambush
        ? tr(`${gl}, отряд Роя идёт к вам ${dirw}, ${d} метров. Засада: займите позицию у маркера и встречайте!`, `${gl}, a Swarm squad is coming ${dirw}, ${d} meters. Ambush: take the marked position and greet them!`, `${gl}, một đội Bầy Đàn đang tới ${dirw}, ${d} mét. Phục kích: chiếm vị trí đánh dấu và đón chúng!`)
        : tr(`${gl}, отряд Роя ${dirw}, ${d} метров. Перехватить!`, `${gl}, Swarm squad ${dirw}, ${d} meters. Intercept!`, `${gl}, đội Bầy Đàn ở ${dirw}, ${d} mét. Chặn đánh!`); break;
      case 'hunt': say = task.signal
        ? tr(`${gl}, сигнальщик Роя ${dirw}, ${d} метров! Убейте, пока не вызвал десант!`, `${gl}, Swarm signaller ${dirw}, ${d} meters! Kill it before it calls a drop!`, `${gl}, lính báo hiệu Bầy Đàn ở ${dirw}, ${d} mét! Hạ nó trước khi nó gọi đổ bộ!`)
        : tr(`${gl}, дрон Роя ${dirw}, ${d} метров. Сбить!`, `${gl}, Swarm drone ${dirw}, ${d} meters. Shoot it down!`, `${gl}, drone Bầy Đàn ở ${dirw}, ${d} mét. Bắn hạ!`); break;
      case 'raid': say = tr(`${gl}, ${entName(task.targets[0])} ${dirw}, ${d} метров. Уничтожить — ракеты, ${bk('rocket')}!`, `${gl}, ${entName(task.targets[0])} ${dirw}, ${d} meters. Destroy it — rockets, ${bk('rocket')}!`, `${gl}, ${entName(task.targets[0])} ở ${dirw}, ${d} mét. Phá nó — tên lửa, ${bk('rocket')}!`); break;
      case 'escort': say = tr(`${gl}, ${groupLabel(task.tank)} идёт в бой ${dirw}. Прикройте его!`, `${gl}, ${groupLabel(task.tank)} is moving into the fight ${dirw}. Cover it!`, `${gl}, ${groupLabel(task.tank)} đang vào trận ${dirw}. Yểm trợ nó!`); break;
      case 'capture': say = tr(`${gl}, ${cpSay(task.cp)} рядом, ${d} метров. Захватить!`, `${gl}, ${cpSay(task.cp)} is close, ${d} meters. Capture it!`, `${gl}, ${cpSay(task.cp)} ở gần, ${d} mét. Chiếm lấy!`); break;
    }
    const tkey = 'tac|' + task.kind + '|' + (task.cp ? task.cp.name : task.tank ? task.tank.id : task.targets && task.targets[0] ? (task.targets[0].squad ? 's' + task.targets[0].squad.id : task.targets[0].id) : '');
    VOX.order(task, tkey, pre + say, { tac: true, cool: 60, urgent: task.pri >= 75 });
    if (!free) S.navT = 10;
  },
  // проверка выполнения
  evaluate(t, c, g){
    const now = S.time;
    if (t.targets){
      const alive = t.targets.filter(e => e.alive);
      const before = t.killed;
      t.killed = t.total - alive.length;
      if (t.killed > before && now - this.lastPraise > 12 && alive.length){ this.lastPraise = now; VOX.radio('praise', alive.length === 1 ? tr('Есть! Остался один.', 'Got one! One left.', 'Hạ một! Còn một tên.') : tr(`Хорошо! Осталось ${alive.length}.`, `Good! ${alive.length} left.`, `Tốt! Còn ${alive.length}.`), 0, 20); }
      if (alive.length) t.pos = clusterCenter(alive).pos;
    }
    const finish = (ok) => {
      t.done = true; t.ok = ok; t.doneT = now;
      if (typeof MISSION !== 'undefined') MISSION.taskEnd(t, ok);
      if (ok){ PROG.onTaskDone(t); const say = VOX.ok('done', 25) && !MISSION.free(); if (say) VOX.mark('done'); emit('objdone', { text: say ? this.doneText(t) : '' }); }
    };
    switch (t.kind){
      case 'engage': case 'tank': case 'struct': case 'hunt': case 'raid':
        if (t.targets.every(e => !e.alive)) return finish(t.killed > 0);
        if (t.targets.every(e => !e.alive || dist(e.pos, c.pos) > (t.dir ? 280 : 110))) return finish(false);
        break;
      case 'intercept':
        if (t.phase === 1 && (dist(c.pos, t.wp) < 14 || t.targets.some(e => e.alive && dist(e.pos, c.pos) < 50))){ t.phase = 2; VOX.radio('inpos', tr('Они близко. Огонь!', 'They are close. Open fire!', 'Chúng tới gần rồi. Khai hỏa!'), 1, 20); }
        if (t.targets.every(e => !e.alive)) return finish(t.killed > 0);
        if (t.targets.every(e => !e.alive || dist(e.pos, c.pos) > 280)) return finish(false);
        break;
      case 'escort':
        if (!t.tank || !t.tank.alive) return finish(false);
        t.pos = t.tank.pos;
        if (now - t.t0 > 45) return finish(dist(c.pos, t.tank.pos) < 50);
        break;
      case 'capture':
        if (t.cp.owner === 0 && abs(t.cp.prog) >= 1) return finish(dist(c.pos, t.cp.pos) < 90);
        break;
      case 'flank':
        if (t.phase === 1 && dist(c.pos, t.wp) < 14){ t.phase = 2; VOX.radio('inpos', tr('На позиции. Огонь!', 'In position. Open fire!', 'Đã vào vị trí. Khai hỏa!'), 1, 20); }
        if (t.targets.every(e => !e.alive)) return finish(t.killed > 0);
        if (t.targets.every(e => !e.alive || dist(e.pos, c.pos) > 120)) return finish(false);
        break;
      case 'avoid':
        if (dist(c.pos, t.wp) < 16 || t.targets.every(e => !e.alive || dist(e.pos, c.pos) > 90)) return finish(true);
        break;
      case 'defend': {
        const foes = enemiesNear(0, t.cp.pos, 45, e => e.cls === 'inf' || e.cls === 'tank');
        t.targets = t.targets.filter(e => e.alive).concat(foes.filter(e => !t.targets.includes(e)));
        t.total = max(t.total, t.targets.length + t.killed);
        if (!foes.length && dist(c.pos, t.cp.pos) < 60){ t.clearT = (t.clearT || 0) + 1; if (t.clearT >= 4) return finish(true); } else t.clearT = 0;
        if (t.cp.owner === 1) return finish(false);
        break;
      }
      case 'retreat':
        if (dist(c.pos, t.pos) < 20) return finish(true);
        break;
      case 'strat': case 'player': {
        const o = t.kind === 'strat' ? t.order : g.order, cp = t.kind === 'strat' ? t.cp : g.cp, goal = t.kind === 'strat' ? t.goal : g.goal;
        if (o === 'cap' && cp && cp.owner === 0 && abs(cp.prog) >= 1) return finish(dist(c.pos, cp.pos) < 80);
        if (o === 'move' && goal && dist(c.pos, goal) < 15) return finish(true);
        break;
      }
    }
    const lim = { engage: 60, tank: 70, struct: 60, flank: 80, avoid: 50, defend: 90, retreat: 40, intercept: 90, hunt: 70, raid: 90, capture: 120 }[t.kind];
    if (lim && now - t.t0 > lim) return finish(false);
  },
  doneText(t){
    switch (t.kind){
      case 'engage': return tr('Противник уничтожен. Хорошая работа.', 'Hostiles down. Good work.', 'Địch đã bị hạ. Làm tốt lắm.');
      case 'flank': return tr('Отличный обход! Группа противника уничтожена.', 'Excellent flank! Enemy group destroyed.', 'Vòng sườn tuyệt vời! Nhóm địch đã bị tiêu diệt.');
      case 'tank': return tr('Танк противника уничтожен!', 'Enemy tank destroyed!', 'Xe tăng địch đã bị hạ!');
      case 'struct': return tr('Огневая точка подавлена.', 'Emplacement neutralised.', 'Ụ hỏa lực đã bị vô hiệu.');
      case 'defend': return tr(`${cpSayNom(t.cp)} удержана.`, `${cpSayNom(t.cp)} held.`, `${cpSayNom(t.cp)} đã được giữ vững.`);
      case 'avoid': return tr('Обошли. Продолжайте выполнение задачи.', 'Bypassed. Continue the mission.', 'Đã vòng qua. Tiếp tục nhiệm vụ.');
      case 'retreat': return tr('Вы в безопасности. Ремонт идёт.', 'You are safe. Repairs underway.', 'Bạn đã an toàn. Đang sửa chữa.');
      case 'intercept': return tr('Отряд Роя перехвачен. Отлично!', 'Swarm squad intercepted. Excellent!', 'Đã chặn đánh đội Bầy Đàn. Tuyệt vời!');
      case 'hunt': return t.signal ? tr('Сигнальщик уничтожен.', 'Signaller destroyed.', 'Lính báo hiệu đã bị hạ.') : tr('Дрон сбит.', 'Drone down.', 'Drone đã bị bắn hạ.');
      case 'raid': return tr('Цель уничтожена.', 'Target destroyed.', 'Mục tiêu đã bị phá.');
      case 'capture': return tr(`${cpSayNom(t.cp)} наша.`, `${cpSayNom(t.cp)} is ours.`, `${cpSayNom(t.cp)} là của ta.`);
      default: return tr('Задача выполнена.', 'Objective complete.', 'Hoàn thành nhiệm vụ.');
    }
  },
  // ведём бойцов отряда к задаче
  apply(g){
    const t = this.task; if (!t || t.done) return;
    if (typeof MISSION !== 'undefined' && MISSION.free()) return;   // свобода действий: отряд просто идёт за игроком
    if (t.kind === 'strat'){ if (this.aiOn() && t.order !== 'idle') setOrder(g, t.order, t.goal, { cp: t.cp, wp: t.swp }); return; }
    if (t.kind === 'player') return;
    if (t.kind === 'escort'){ if (t.tank && t.tank.alive) setOrder(g, 'escort', t.tank.pos, { escort: t.tank }); return; }
    if (t.kind === 'capture'){ setOrder(g, 'cap', t.cp.pos, { cp: t.cp }); return; }
    if (t.wp && t.phase === 1) setOrder(g, 'move', t.wp);
    else if (t.targets && t.targets.some(e => e.alive)){
      const tg = t.targets.filter(e => e.alive).sort((a, b) => dist(a.pos, (leaderPos(g) || a.pos)) - dist(b.pos, (leaderPos(g) || b.pos)))[0];
      g.order = 'focus'; g.focus = tg; g.goal = tg.pos;
    } else if (t.kind === 'retreat') setOrder(g, 'retreat', t.pos);
    else if (t.kind === 'defend') setOrder(g, 'cap', t.cp.pos, { cp: t.cp });
  },
  // следим, не отклоняется ли игрок
  monitor(c, g){
    const t = this.task; if (!t || t.done) { this.onTask = false; return; }
    const p = this.navPos(); if (!p){ this.onTask = false; return; }
    const d = len(p) < 80 ? 0 : dist(c.pos, p);
    this.onTask = d < (t.kind === 'strat' ? 70 : 55);
    // учёт для «работаешь сам?»: игрок у цели или к ней приближается
    t.ticks = (t.ticks || 0) + 1;
    if (this.onTask || d < t.lastProgD - 2) t.onTicks = (t.onTicks || 0) + 1;
    if (d < 35){ t.stallT = 0; t.lastProgD = d; return; }
    if (d < t.lastProgD - 2){ t.lastProgD = d; t.stallT = 0; }
    else t.stallT += 1;
    // напоминание — не чаще раза в 45 с и только в режиме «следовать приказам»
    if (t.stallT > 18 && S.time - this.lastNag > 45 && this.aiOn() && !(typeof MISSION !== 'undefined' && MISSION.free())){
      this.lastNag = S.time; t.stallT = 0; t.lastProgD = d;
      if (VOX.radio('nag', tr(`${groupLabel(g)}, вы отклоняетесь от задачи. Цель ${relDirWord(p)}, ${Math.round(surfDist(c.pos, p) / 10) * 10} метров.`, `${groupLabel(g)}, you are drifting off the objective. Target ${relDirWord(p)}, ${Math.round(surfDist(c.pos, p) / 10) * 10} meters.`, `${groupLabel(g)}, các bạn đang đi lệch nhiệm vụ. Mục tiêu ở ${relDirWord(p)}, ${Math.round(surfDist(c.pos, p) / 10) * 10} mét.`), 1, 45)) emit('nag', {});
    }
  },
  // текст для карточки задачи
  card(){
    const t = this.task; if (!t) return null;
    const c = ctrlEntity();
    const p = this.navPos();
    const d = p && c ? Math.round(len(p) < 80 ? dist(mul(bestAxis(norm(c.pos)), RM), c.pos) : surfDist(p, c.pos)) : 0;
    const free = typeof MISSION !== 'undefined' && MISSION.free() && t.kind !== 'player', quiet = free && !t.accepted;
    const head = t.done ? (t.ok ? tr('ЗАДАЧА ВЫПОЛНЕНА', 'OBJECTIVE COMPLETE', 'HOÀN THÀNH NHIỆM VỤ') : tr('ЗАДАЧА СНЯТА', 'OBJECTIVE CANCELLED', 'NHIỆM VỤ ĐÃ HỦY'))
               : quiet ? tr('ПОДСКАЗКА СТРАТЕГА · ПО ЖЕЛАНИЮ · Y — ПРИНЯТЬ', 'STRATEGIST SUGGESTION · OPTIONAL · Y — ACCEPT', 'GỢI Ý CHIẾN LƯỢC GIA · TÙY CHỌN · Y — NHẬN')
               : t.kind === 'player' ? tr('ТВОЙ ПРИКАЗ', 'YOUR ORDER', 'LỆNH CỦA BẠN') : (t.kind === 'strat' ? tr('ПРИКАЗ ШТАБА · ИИ-СТРАТЕГ', 'HQ ORDER · AI STRATEGIST', 'LỆNH SỞ CHỈ HUY · CHIẾN LƯỢC GIA AI') : tr('ТАКТИЧЕСКАЯ ЗАДАЧА · СТРАТЕГ', 'TACTICAL ORDER · STRATEGIST', 'LỆNH CHIẾN THUẬT · CHIẾN LƯỢC GIA'));
    let title = '', sub = '';
    switch (t.kind){
      case 'strat': title = orderText({ order: t.order, cp: t.cp, team: 0, focus: null, escort: null }); break;
      case 'player': title = orderText(t.g); break;
      case 'intercept': title = t.ambush && t.phase === 1 ? tr('Засада: встретить отряд Роя', 'Ambush the Swarm squad', 'Phục kích đội Bầy Đàn') : tr('Перехватить отряд Роя', 'Intercept the Swarm squad', 'Chặn đánh đội Bầy Đàn'); break;
      case 'hunt': title = t.signal ? tr('Убить сигнальщика до вызова десанта', 'Kill the signaller before it calls a drop', 'Hạ lính báo hiệu trước khi nó gọi đổ bộ') : tr('Сбить дрон Роя', 'Shoot down the Swarm drone', 'Bắn hạ drone Bầy Đàn'); break;
      case 'raid': title = tr(`Уничтожить: ${entName(t.targets[0])}`, `Destroy: ${entName(t.targets[0])}`, `Tiêu diệt: ${entName(t.targets[0])}`); break;
      case 'escort': title = tr(`Прикрыть: ${groupLabel(t.tank)}`, `Cover: ${groupLabel(t.tank)}`, `Yểm trợ: ${groupLabel(t.tank)}`); break;
      case 'capture': title = tr(`Захватить точку ${t.cp.name} (рядом)`, `Capture point ${t.cp.name} (nearby)`, `Chiếm điểm ${t.cp.name} (gần)`); break;
      case 'engage': title = tr('Уничтожить группу противника', 'Destroy the enemy group', 'Tiêu diệt nhóm địch'); break;
      case 'flank': title = t.phase === 1 ? tr('Обойти с фланга', 'Flank them', 'Vòng sườn') : tr('Атаковать с фланга', 'Attack from the flank', 'Tấn công từ bên sườn'); break;
      case 'avoid': title = tr('Обойти противника стороной', 'Bypass the enemy', 'Đi vòng tránh địch'); break;
      case 'tank': title = tr('Уничтожить вражеский танк', 'Destroy the enemy tank', 'Tiêu diệt xe tăng địch'); break;
      case 'struct': title = tr(`Уничтожить: ${entName(t.targets[0])}`, `Destroy: ${entName(t.targets[0])}`, `Tiêu diệt: ${entName(t.targets[0])}`); break;
      case 'defend': title = tr(`Защитить точку ${t.cp.name}`, `Defend point ${t.cp.name}`, `Bảo vệ điểm ${t.cp.name}`); break;
      case 'retreat': title = tr('Отступить на ремонт', 'Fall back for repairs', 'Rút về sửa chữa'); break;
    }
    if (!t.done){
      const parts = [];
      if (t.total) parts.push(`${t.killed}/${t.total}`);
      if (d) parts.push(`${d} ${tr('м', 'm', 'm')}`);
      if (t.kind === 'tank' && c && c.cls === 'inf') parts.push(tr('Q — ракета', 'Q — rocket', 'Q — tên lửa'));
      if ((t.kind === 'flank' || t.kind === 'intercept') && t.phase === 1) parts.push(tr('иди по маркеру', 'follow the marker', 'đi theo dấu chỉ'));
      if (t.kind === 'hunt' && t.signal && t.targets[0] && t.targets[0].squad && t.targets[0].squad.signal) parts.push(tr(`сигнал через ${Math.max(0, Math.ceil(t.targets[0].squad.signal - S.time))} с`, `signal in ${Math.max(0, Math.ceil(t.targets[0].squad.signal - S.time))} s`, `báo hiệu sau ${Math.max(0, Math.ceil(t.targets[0].squad.signal - S.time))} giây`));
      // дальняя цель — предлагаем транспорт
      if (d > 200 && c && c.cls === 'inf' && typeof MISSION !== 'undefined'){
        parts.push(S.time >= MISSION.podReadyT ? tr(`${bk('redeploy')} — капсула к цели`, `${bk('redeploy')} — drop pod`, `${bk('redeploy')} — khoang tới mục tiêu`) : tr(`капсула через ${Math.ceil(MISSION.podReadyT - S.time)} с`, `pod in ${Math.ceil(MISSION.podReadyT - S.time)} s`, `khoang sau ${Math.ceil(MISSION.podReadyT - S.time)} giây`));
        if (S.vehicles.some(v => v.alive && v.team === 0 && dist(v.pos, c.pos) < 30)) parts.push(tr(`${bk('interact')} — танк рядом`, `${bk('interact')} — tank nearby`, `${bk('interact')} — xe tăng gần`));
      }
      sub = parts.join(' · ');
    } else if (t.ok) sub = `+${t.xp} XP`;
    const mult = this.aiOn() && !t.done && t.kind !== 'player' && t.kind !== 'retreat' && t.kind !== 'avoid' ? (t.kind === 'strat' ? 2 : (t.mult || 2)) : 0;
    return { head, title, sub, mult, on: this.onTask, done: t.done, ok: t.ok, tac: t.kind !== 'strat' && t.kind !== 'player', free: quiet };
  },
};
