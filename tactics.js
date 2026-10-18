// =====================================================================
//  ИИ-СТРАТЕГ В РЕАЛЬНОМ ВРЕМЕНИ: тактические задачи для группы игрока
//  (атаковать рядом, обойти с фланга, обойти стороной, танк, турель,
//   защитить точку, отступить на ремонт) + контроль выполнения
// =====================================================================
const TACT = {
  task: null, tick: 0, lastNag: -99, lastPraise: -99, lastSwitch: -99, onTask: false, lastStratKey: '',
  reset(){ this.task = null; this.tick = 0; this.lastNag = -99; this.lastPraise = -99; this.lastSwitch = -99; this.onTask = false; this.lastStratKey = ''; },
  aiOn(){ return S.teams[0] && S.teams[0].ai; },
  // ---------- куда вести игрока ----------
  navPos(){
    const t = this.task; if (!t || t.done) return null;
    if (t.wp && t.phase === 1) return t.wp;
    if (t.kind === 'strat' || t.kind === 'player'){
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
    if (t.kind === 'strat' && t.g){
      const g = t.g;
      if (g.order === 'cap' && g.cp && dist(vp, g.cp.pos) < 65) return { m: 2, tag: tag2 };
      if (g.order === 'attack'){ const a = assaultTarget(1, vp); if (a.ent && dist(vp, a.ent.pos) < 90) return { m: 2, tag: tag2 }; }
      if (g.order === 'defend' && dist(vp, BASES[0].map(x => x * RM)) < 160) return { m: 2, tag: tag2 };
    }
    return { m: 1, tag: '' };
  },
  multForCapture(cp){
    const t = this.task;
    if (!t || !this.aiOn()) return { m: 1, tag: '' };
    if ((t.kind === 'strat' && t.g && t.g.cp === cp) || (t.kind === 'defend' && t.cp === cp)) return { m: 2, tag: tr('ПРИКАЗ ×2', 'ORDER ×2', 'MỆNH LỆNH ×2') };
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
    const ai = this.aiOn();
    const cand = ai ? this.candidates(c, g) : [];
    cand.push(this.stratTask(g));
    cand.sort((a, b) => b.pri - a.pri);
    const best = cand[0];
    const cur = this.task && !this.task.done ? this.task : null;
    if (!cur) this.begin(best, g, false);
    else if (best && best.kind !== cur.kind && best.pri >= cur.pri + 12 && (S.time - this.lastSwitch > 8 || best.pri >= 80)) this.begin(best, g, true);
    else if (cur.kind === 'strat' || cur.kind === 'player'){
      const key = this.stratKey(g);
      if (key !== this.lastStratKey) this.begin(best.kind === 'strat' || best.kind === 'player' ? best : this.stratTask(g), g, false);
    }
    this.apply(g);
    this.monitor(c, g);
  },
  stratKey(g){ const s = this.stratSrc(g); return s.order + '|' + (s.cp ? s.cp.name : '') + '|' + (s.goal ? s.goal.map(x => Math.round(x / 25)).join(',') : ''); },
  stratSrc(g){
    if (this.aiOn() && g.strat && g.manualUntil < S.time) return { order: g.strat.order, goal: g.strat.goal, cp: g.strat.cp, wp: g.strat.wp, by: 'ai' };
    return { order: g.order, goal: g.goal, cp: g.cp, by: g.manualUntil >= S.time ? 'player' : 'ai' };
  },
  stratTask(g){
    const s = this.stratSrc(g);
    return { kind: s.by === 'player' && !this.aiOn() ? 'player' : 'strat', pri: 30, order: s.order, goal: s.goal, cp: s.cp, swp: s.wp, by: s.by, pos: s.goal, xp: s.order === 'cap' ? 150 : 80 };
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
    this.task = task; this.lastSwitch = S.time;
    if (task.kind === 'strat' || task.kind === 'player'){
      this.lastStratKey = this.stratKey(g);
      if (task.kind === 'strat' && this.aiOn()) setOrder(g, task.order, task.goal, { cp: task.cp, wp: task.swp });
      // повторяем только если приказ поменялся
      const say = `${groupLabel(g)}: ${orderSpeech(g)}`;
      if (!cur || cur.kind !== task.kind || this.lastSaid !== say){ emit('objective', { text: say }); this.lastSaid = say; S.navT = 8; }
      return;
    }
    // тактическая задача
    const d = Math.round(dist(task.pos, ctrlEntity().pos) / 5) * 5;
    const dirw = relDirWord(task.pos);
    const n = task.targets ? task.targets.length : 0;
    const pre = preempt ? tr('Отставить! ', 'Belay that! ', 'Hủy lệnh! ') : '';
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
    }
    emit('objective', { text: pre + say, tac: true });
    S.navT = 10;
  },
  // проверка выполнения
  evaluate(t, c, g){
    const now = S.time;
    if (t.targets){
      const alive = t.targets.filter(e => e.alive);
      const before = t.killed;
      t.killed = t.total - alive.length;
      if (t.killed > before && now - this.lastPraise > 12 && alive.length){ this.lastPraise = now; emit('radio', { text: alive.length === 1 ? tr('Есть! Остался один.', 'Got one! One left.', 'Hạ một! Còn một tên.') : tr(`Хорошо! Осталось ${alive.length}.`, `Good! ${alive.length} left.`, `Tốt! Còn ${alive.length}.`), pri: 0 }); }
      if (alive.length) t.pos = clusterCenter(alive).pos;
    }
    const finish = (ok) => {
      t.done = true; t.ok = ok; t.doneT = now;
      if (ok){ PROG.onTaskDone(t); emit('objdone', { text: this.doneText(t) }); }
    };
    switch (t.kind){
      case 'engage': case 'tank': case 'struct':
        if (t.targets.every(e => !e.alive)) return finish(t.killed > 0);
        if (t.targets.every(e => !e.alive || dist(e.pos, c.pos) > 110)) return finish(false);
        break;
      case 'flank':
        if (t.phase === 1 && dist(c.pos, t.wp) < 14){ t.phase = 2; emit('radio', { text: tr('На позиции. Огонь!', 'In position. Open fire!', 'Đã vào vị trí. Khai hỏa!'), pri: 1 }); }
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
        const o = g.order;
        if (o === 'cap' && g.cp && g.cp.owner === 0 && abs(g.cp.prog) >= 1 && dist(c.pos, g.cp.pos) < 80) return finish(true);
        if (o === 'move' && g.goal && dist(c.pos, g.goal) < 15) return finish(true);
        break;
      }
    }
    const lim = { engage: 60, tank: 70, struct: 60, flank: 80, avoid: 50, defend: 90, retreat: 40 }[t.kind];
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
      default: return tr('Задача выполнена.', 'Objective complete.', 'Hoàn thành nhiệm vụ.');
    }
  },
  // ведём бойцов отряда к задаче
  apply(g){
    const t = this.task; if (!t || t.done) return;
    if (t.kind === 'strat'){ if (this.aiOn()) setOrder(g, t.order, t.goal, { cp: t.cp, wp: t.swp }); return; }
    if (t.kind === 'player') return;
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
    if (d < 35){ t.stallT = 0; t.lastProgD = d; return; }
    if (d < t.lastProgD - 2){ t.lastProgD = d; t.stallT = 0; }
    else t.stallT += 1;
    if (t.stallT > 18 && S.time - this.lastNag > 30 && this.aiOn()){
      this.lastNag = S.time; t.stallT = 0; t.lastProgD = d;
      emit('radio', { text: tr(`${groupLabel(g)}, вы отклоняетесь от задачи. Цель ${relDirWord(p)}, ${Math.round(d / 10) * 10} метров.`, `${groupLabel(g)}, you are drifting off the objective. Target ${relDirWord(p)}, ${Math.round(d / 10) * 10} meters.`, `${groupLabel(g)}, các bạn đang đi lệch nhiệm vụ. Mục tiêu ở ${relDirWord(p)}, ${Math.round(d / 10) * 10} mét.`), pri: 1 });
      emit('nag', {});
    }
  },
  // текст для карточки задачи
  card(){
    const t = this.task; if (!t) return null;
    const c = ctrlEntity();
    const p = this.navPos();
    const d = p && c ? Math.round(dist(len(p) < 80 ? mul(bestAxis(norm(c.pos)), RM) : p, c.pos)) : 0;
    const head = t.done ? (t.ok ? tr('ЗАДАЧА ВЫПОЛНЕНА', 'OBJECTIVE COMPLETE', 'HOÀN THÀNH NHIỆM VỤ') : tr('ЗАДАЧА СНЯТА', 'OBJECTIVE CANCELLED', 'NHIỆM VỤ ĐÃ HỦY'))
               : t.kind === 'player' ? tr('ТВОЙ ПРИКАЗ', 'YOUR ORDER', 'LỆNH CỦA BẠN') : (t.kind === 'strat' ? tr('ПРИКАЗ ШТАБА · ИИ-СТРАТЕГ', 'HQ ORDER · AI STRATEGIST', 'LỆNH SỞ CHỈ HUY · CHIẾN LƯỢC GIA AI') : tr('ТАКТИЧЕСКАЯ ЗАДАЧА · СТРАТЕГ', 'TACTICAL ORDER · STRATEGIST', 'LỆNH CHIẾN THUẬT · CHIẾN LƯỢC GIA'));
    let title = '', sub = '';
    switch (t.kind){
      case 'strat': case 'player': title = orderText(t.g); break;
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
      if (t.kind === 'flank' && t.phase === 1) parts.push(tr('иди по маркеру', 'follow the marker', 'đi theo dấu chỉ'));
      sub = parts.join(' · ');
    } else if (t.ok) sub = `+${t.xp} XP`;
    const mult = this.aiOn() && !t.done && t.kind !== 'player' && t.kind !== 'retreat' && t.kind !== 'avoid' ? (t.kind === 'strat' ? 2 : (t.mult || 2)) : 0;
    return { head, title, sub, mult, on: this.onTask, done: t.done, ok: t.ok, tac: t.kind !== 'strat' && t.kind !== 'player' };
  },
};
