
// =====================================================================
//  МИССИЯ (v6): стабильные приказы и фильтр голосовых строк, режимы игрока
//  («Свобода действий», «Действую один»), режиссёр боя (меньше беготни —
//  задачи рядом, переброска капсулой, прыжок в гущу боя), навигация
//  (компас, маркеры по поверхности, слежение за целью), вопрос «работаешь сам?»
// =====================================================================
Object.assign(BIND_DEF, { track: 'KeyH', freeplay: 'KeyK', solo: 'KeyJ', redeploy: 'KeyB' });   // v6-merge: Z занят рывком ранца (gun.js)
Object.assign(BIND_NAMES, {
  track: ['Следить за другой целью', 'Track another objective', 'Theo dõi mục tiêu khác'],
  freeplay: ['Приказы ↔ свобода действий', 'Orders ↔ free play', 'Lệnh ↔ tự do hành động'],
  solo: ['Отряд со мной ↔ действую один', 'Squad with me ↔ going solo', 'Đội đi cùng ↔ hành động một mình'],
  redeploy: ['Переброска: капсула к цели / в гущу боя', 'Redeploy: pod to objective / into the fight', 'Tái triển khai: khoang tới mục tiêu / vào trận'],
});
for (const k of ['track', 'freeplay', 'solo', 'redeploy']) if (!SET.bind[k]) SET.bind[k] = BIND_DEF[k];
Object.assign(SET_DEF, { ordersFree: false, solo: false });
if (SET.ordersFree === undefined) SET.ordersFree = false;
if (SET.solo === undefined) SET.solo = false;

// ---------------------------------------------------------------------
//  ГОЛОС: одна озвучка на новый приказ, напоминания не чаще ~45 с,
//  одинаковые строки не повторяются, между приказами — пауза
// ---------------------------------------------------------------------
const VOX = {
  last: {}, lastAny: -99, n: 0, muted: 0,
  reset(){ this.last = {}; this.lastAny = -99; this.n = 0; this.muted = 0; },
  ok(key, cool){ return S.time - (this.last[key] === undefined ? -1e9 : this.last[key]) >= cool; },
  mark(key){ this.last[key] = S.time; },
  // приказ: озвучиваем сейчас или откладываем (task.say), пока не пройдёт пауза
  order(task, key, text, opts){
    opts = opts || {};
    task.say = { key, text, tac: !!opts.tac, urgent: !!opts.urgent, cool: opts.cool || 90, t: S.time };
    this.flush(task);
  },
  flush(task){
    const s = task && task.say; if (!s) return;
    if (task.done || MISSION.free() || S.time - s.t > 10){ task.say = null; if (MISSION.free()) this.muted++; return; }
    if (!this.ok(s.key, s.cool)){ task.say = null; this.muted++; return; }
    if (!s.urgent && S.time - this.lastAny < 9) return;
    task.say = null;
    this.mark(s.key); this.lastAny = S.time; this.n++;
    emit('objective', { text: s.text, tac: s.tac });
  },
  // прочие строки рации стратега (похвала, «отклоняетесь», разведка)
  radio(key, text, pri, cool, force){
    if (!force && MISSION.free()) { this.muted++; return false; }
    if (!this.ok(key, cool || 30)) { this.muted++; return false; }
    this.mark(key);
    emit('radio', { text, pri: pri || 0 });
    return true;
  },
};

const MISSION = {
  ignoreRun: 0, askT: -1e9, ask: null, recall: null, former: null, podReadyT: 0, track: 'auto', nav: null,
  lastFight: 0, lastFightPos: null, lastSpawn: -99, hunters: [], walk: 0, lastPos: null, waitLock: false, detachedU: null,
  st: { spawnSquad: 0, spawnPod: 0, pods: 0, jumps: 0, asks: 0 },
  free(){ return !!SET.ordersFree; },
  reset(){
    VOX.reset();
    this.ignoreRun = 0; this.askT = -1e9; this.ask = null; this.recall = null; this.former = null; this.podReadyT = 0; this.nav = null;
    this.lastFight = S.time || 0; this.lastFightPos = null; this.lastSpawn = -99; this.hunters = []; this.detachedU = null;
    this.st = { spawnSquad: 0, spawnPod: 0, pods: 0, jumps: 0, asks: 0 };
    this.cool = {}; this.cpOwn = null; this.signal = null; this.counter = null; this.evN = 0; this.recallTried = false; this.track = 'auto';
    this.hideToast();
  },
  stats(){ return Object.assign({ voiced: VOX.n, muted: VOX.muted, ignoreRun: this.ignoreRun }, this.st); },
  // раз в секунду из TACT.step (только режим шутера, не кино)
  step(c, g){
    VOX.flush(TACT.task);
    if (this.cpOwn) S.cps.forEach((cp, i) => { if (this.cpOwn[i] !== cp.owner) this.onCapture(cp, cp.owner); });
    this.cpOwn = S.cps.map(cp => cp.owner);
    this.soloStep();
    this.pace(c, g);
    // долгий игнор одного и того же приказа тоже считается: каждые 45 с без продвижения к цели
    const tk = TACT.task;
    if (tk && !tk.done && !this.free() && tk.kind !== 'retreat' && tk.kind !== 'avoid' && tk.kind !== 'player' && (tk.ticks || 0) - (tk.ignMark || 0) >= 45){
      const on = (tk.onTicks || 0) - (tk.ignOn || 0);
      tk.ignMark = tk.ticks; tk.ignOn = tk.onTicks || 0;
      if (on < 7){ this.ignoreRun++; tk.ignCounted = true; if (this.ignoreRun >= 3 && S.time > this.askT && !this.ask && !S.attract) this.showAsk(); }
      else this.ignoreRun = 0;
    }
    if (this.ask && S.rtime > this.ask.until) this.answer(false, true);
    // подсказка про переброску, когда цель далеко
    const p = TACT.navPos();
    if (c.cls === 'inf' && p && len(p) > 80 && surfDist(c.pos, p) > 260 && S.time > this.podReadyT && !this.free() && typeof HINTS !== 'undefined' && HINTS.can('redeploy', 2, 240))
      HINTS.show('redeploy', tr(`Цель далеко. ${bk('redeploy')} — переброска капсулой прямо к цели (вместе с отрядом). Shift+${bk('redeploy')} — вселиться в бойца в гуще боя.`, `The objective is far. ${bk('redeploy')} — drop pod straight to it (with your squad). Shift+${bk('redeploy')} — possess a trooper in the thick of the fight.`, `Mục tiêu ở xa. ${bk('redeploy')} — khoang đổ bộ thẳng tới mục tiêu (cùng cả đội). Shift+${bk('redeploy')} — nhập vào lính giữa trận.`), [bk('redeploy')], 'redeploy');
  },
  // ---------------------------------------------------------------------
  //  РЕЖИССЁР: задачи рядом с игроком (перехват, засада, охота на дрона,
  //  налёт на постройку, сопровождение танка, захват ближней точки)
  // ---------------------------------------------------------------------
  known(e){ return (e.seen && e.seen[0] > 0) || e.known0 || this.hunters.includes(e.squad || e); },
  candidates(c, g, L){
    const R = 230, me = c.pos;
    if (TUT.on || len(me) < RM - 20 || altitude(me) > 60) return;     // обучение; в шахте, в ядре или высоко в небе — «рядом» не считается
    // сигнальщик — срочная цель
    if (this.signal && this.signal.units[0] && this.signal.units[0].alive){ const u = this.signal.units[0]; L.push({ kind: 'hunt', dir: true, signal: true, pri: 78, targets: [u], pos: u.pos, xp: 120, mult: 3 }); }
    const near = (p, a, b) => { const d = surfDist(p, me); return d >= a && d <= b && dist(p, me) <= b * 1.05 ? d : -1; };
    const n0 = L.length;
    const hasT = L.some(x => x.targets && x.targets.length);
    // перехват / засада: вражеский отряд идёт к нам (дальше 70 м — ближе уже «уничтожить группу»)
    for (const sq of S.squads){
      if (sq.team !== 1 || sq.order === 'sky' && sq.sky === 'launch') continue;
      const Lg = leaderOf(sq); if (!Lg || underground(Lg.pos)) continue;
      const d = near(Lg.pos, 66, R); if (d < 0 || !(this.known(Lg) || d < 100)) continue;
      const units = sq.units.filter(u => u.alive);
      const toMe = tangent(sub(me, Lg.pos), norm(Lg.pos)), v = tangent(Lg.vel || [0, 0, 0], norm(Lg.pos));
      const coming = len(Lg.vel || [0, 0, 0]) > 1.5 && dot(v, toMe) > 0.5;
      const cand = { kind: 'intercept', dir: true, pri: 57 + (coming ? 4 : 0) - d / 40, targets: units, pos: Lg.pos, xp: 70 + 20 * units.length, mult: 2, coming };
      if (coming && d > 110){ cand.wp = this.ambushPoint(me, Lg.pos); cand.phase = 1; cand.ambush = true; }
      L.push(cand);
    }
    // дрон Роя
    for (const dr of S.drones){
      if (!dr.alive || dr.team !== 1) continue;
      const d = near(dr.pos, 50, 200); if (d < 0 || !this.known(dr)) continue;
      L.push({ kind: 'hunt', dir: true, pri: dr.scout ? 46 : 51 - d / 50, targets: [dr], pos: dr.pos, xp: 90, mult: 2 });
    }
    // постройки и строители Роя
    for (const b of S.buildings){
      if (!b.alive || b.team !== 1 || !(b.known0 || surfDist(b.pos, me) < 120)) continue;
      const d = near(b.pos, 40, 210); if (d < 0) continue;
      const key = BTYPES[b.type] && BTYPES[b.type].key;
      L.push({ kind: 'raid', dir: true, pri: (key ? 55 : 52) - d / 50, targets: [b], pos: b.pos, xp: key ? 220 : 120, mult: key ? 3 : 2 });
    }
    for (const b of S.builders){
      if (!b.alive || b.team !== 1) continue;
      const d = near(b.pos, 30, 170); if (d < 0 || !this.known(b)) continue;
      L.push({ kind: 'raid', dir: true, pri: 50 - d / 50, targets: [b], pos: b.pos, xp: 80, mult: 2 });
    }
    // сопровождение своего танка, который идёт в бой
    if (!hasT) for (const v of S.vehicles){
      if (!v.alive || v.team !== 0 || v === c) continue;
      const d = near(v.pos, 25, 150); if (d < 0) continue;
      if (!(v.target && v.target.alive) && v.order !== 'attack') continue;
      L.push({ kind: 'escort', dir: true, pri: 44 - d / 60, tank: v, pos: v.pos, xp: 90 });
      break;
    }
    // захват точки — только рядом с местом последнего боя
    const fp = this.lastFightPos && S.time - this.lastFight < 90 ? this.lastFightPos : me;
    for (const cp of S.cps){
      if (cp.core || (cp.owner === 0 && abs(cp.prog) >= 1)) continue;
      const d = surfDist(cp.pos, fp), dm = surfDist(cp.pos, me);
      if (d > 110 || dm > 150) continue;
      L.push({ kind: 'capture', dir: true, cp, pri: 47 + (cp.owner === 1 ? 3 : 0) - dm / 30, pos: cp.pos, xp: 150 });
    }
    // сорвавшиеся задачи режиссёра не предлагаем снова минуту — иначе «дёргается»
    for (let i = L.length - 1; i >= n0; i--) if ((this.cool[this.candKey(L[i])] || 0) > S.time) L.splice(i, 1);
  },
  cool: {},
  candKey(t){ return t.kind + '|' + (t.cp ? t.cp.name : t.tank ? 'v' + t.tank.id : t.targets && t.targets[0] ? (t.targets[0].squad ? 's' + t.targets[0].squad.id : 'e' + t.targets[0].id) : ''); },
  ambushPoint(me, foe){
    const up = norm(me), to = tangent(sub(foe, me), up), side = norm(cross(up, to));
    const D = surfDist(me, foe);
    const p = add(add(me, mul(to, min(45, D * 0.35))), mul(side, (random() < 0.5 ? -1 : 1) * 16));
    return surfacePoint(norm(p), 0.5);
  },
  // ---------------------------------------------------------------------
  //  ТЕМП: если игрок долго без боя — враги сами идут к нему
  // ---------------------------------------------------------------------
  inFight(c, g){
    if (c.lastHurt > S.time - 3) return true;
    if (g && g.combat) return true;
    for (const e of TGT[0]) if (e.alive && e.cls !== 'bld' && e.cls !== 'hq' && e.seen[0] > 0 && dist2(e.pos, c.pos) < 3025) return true;
    return false;
  },
  pace(c, g){
    if (TUT.on || S.over) return;
    if (this.inFight(c, g)){ this.lastFight = S.time; this.lastFightPos = c.pos; }
    // охотники идут за игроком, пока не завяжется бой
    this.hunters = this.hunters.filter(sq => groupAlive(sq) && S.time < sq.huntUntil);
    for (const sq of this.hunters){
      const Lg = leaderOf(sq); if (!Lg) continue;
      if (sq.combat) { sq.huntUntil = min(sq.huntUntil, S.time + 20); continue; }
      if (S.time > (sq.huntRe || 0)){ sq.huntRe = S.time + 6; setOrder(sq, 'attack', add(c.pos, mul(tangent(sub(Lg.pos, c.pos), norm(c.pos)), 18)), { lock: 40 }); }
    }
    this.signalStep();
    this.counterStep();
    const calm = S.time - this.lastFight;
    if (calm < 25 || S.time - this.lastSpawn < 40 || S.time < 40) return;
    // кто-то уже рядом — подождём (но если тишина затянулась, враги рядом явно не идут — всё равно зовём)
    if (calm < 50) for (const e of TGT[0]) if (e.alive && (e.cls === 'inf' || e.cls === 'tank') && surfDist(e.pos, c.pos) < 150) return;
    if (underground(c.pos) || surfDist(c.pos, BASES[0]) < 90) return;
    this.lastSpawn = S.time;
    this.evN = (this.evN || 0) + 1;
    // 0) сигнальщик Роя: заметил игрока и через 12 с вызовет десант — если не убить
    if (this.evN % 3 === 2 && this.spawnSignaller(c)) return;
    // 1) ближайший свободный отряд Роя выдвигается к игроку
    let best = null, bd = 650;
    for (const sq of S.squads){
      if (sq.team !== 1 || sq.order === 'sky' || sq.order === 'defend' || sq.units.length < 2 || this.hunters.includes(sq)) continue;
      const Lg = leaderOf(sq); if (!Lg || underground(Lg.pos)) continue;
      const d = surfDist(Lg.pos, c.pos);
      if (d > 140 && d < bd && surfDist(Lg.pos, BASES[1]) > 60){ bd = d; best = sq; }
    }
    if (best){
      best.huntUntil = S.time + 120; best.huntRe = 0; this.hunters.push(best); this.st.spawnSquad++;
      const Lg = leaderOf(best);
      for (const u of best.units) u.seen[0] = max(u.seen[0], 6);
      VOX.radio('intel', tr(`Разведка: отряд Роя идёт к вам — ${relDirWord(Lg.pos)}, около ${Math.round(bd / 10) * 10} метров.`, `Intel: a Swarm squad is heading your way — ${relDirWord(Lg.pos)}, about ${Math.round(bd / 10) * 10} meters.`, `Tình báo: một đội Bầy Đàn đang tới chỗ các bạn — ${relDirWord(Lg.pos)}, khoảng ${Math.round(bd / 10) * 10} mét.`), 1, 40);
      return;
    }
    // 2) иначе — портальный десант Роя: капсула падает с неба в 70–115 м
    this.enemyDrop(offsetOnSphere(norm(c.pos), randUnit(), 70 + random() * 45));
  },
  enemyDrop(dir, why){
    if (S.squads.filter(s => s.team === 1).length >= GAME.MAX_SQUADS + 3) return false;
    if (surfDist(dir, BASES[0]) < 110) return false;
    launchPod(1, dir, false, 'director'); this.st.spawnPod++;
    const p = mul(dir, RM);
    VOX.radio('intel', why || tr(`Контакт сверху! Капсула Роя падает ${relDirWord(p)}, ${Math.round(surfDist(p, S.me ? S.me.pos : p) / 10) * 10} метров!`, `Contact from above! A Swarm pod is coming down ${relDirWord(p)}, ${Math.round(surfDist(p, S.me ? S.me.pos : p) / 10) * 10} meters!`, `Địch từ trên trời! Khoang Bầy Đàn đang rơi ${relDirWord(p)}, ${Math.round(surfDist(p, S.me ? S.me.pos : p) / 10) * 10} mét!`), 1, 30, true);
    return true;
  },
  // сигнальщик: одиночный разведчик Роя, через 12 с — капсула рядом с ним
  spawnSignaller(c){
    const dir = offsetOnSphere(norm(c.pos), randUnit(), 75 + random() * 30);
    if (surfDist(dir, BASES[0]) < 110 || S.squads.filter(s => s.team === 1).length >= GAME.MAX_SQUADS + 3) return false;
    const sq = spawnSquad(1, false, mul(dir, RM), 1, ['scout']);
    sq.solo = 'scout'; sq.signal = S.time + 12; sq.huntUntil = S.time + 40;
    const u = sq.units[0]; u.seen[0] = 14; u.signaller = true;
    setOrder(sq, 'hold', u.pos, { lock: 30 });
    this.signal = sq; this.st.signal = (this.st.signal || 0) + 1;
    VOX.radio('signal', tr(`Сигнальщик Роя ${relDirWord(u.pos)}! Через 12 секунд вызовет десант — убей его раньше!`, `Swarm signaller ${relDirWord(u.pos)}! It will call a drop in 12 seconds — kill it first!`, `Lính báo hiệu Bầy Đàn ở ${relDirWord(u.pos)}! 12 giây nữa nó sẽ gọi đổ bộ — hạ nó trước!`), 2, 20, true);
    return true;
  },
  signalStep(){
    const sq = this.signal; if (!sq) return;
    const u = sq.units[0];
    if (!groupAlive(sq) || !u || !u.alive){ this.signal = null; VOX.radio('signalok', tr('Сигнальщик сбит — десанта не будет.', 'Signaller down — no drop.', 'Lính báo hiệu đã bị hạ — không có đổ bộ.'), 1, 10, true); return; }
    if (S.time >= sq.signal){
      this.signal = null;
      for (let i = 0; i < 18; i++) S.sparks.push({ pos: add(u.pos, mul(u.up, 1.5 + i * 1.2)), vel: add(mul(u.up, 14), mul(randUnit(), 2)), life: 0.9 });   // сигнальная ракета
      addLight(add(u.pos, mul(u.up, 12)), [12, 2, 1], 40, 0.6, 0.01);
      this.enemyDrop(offsetOnSphere(norm(u.pos), randUnit(), 12), tr('Сигнальщик успел! Капсула Роя на подлёте.', 'The signaller got it off! Swarm pod inbound.', 'Lính báo hiệu kịp gọi! Khoang Bầy Đàn đang tới.'));
    }
  },
  // контратака: через 45–90 с после захвата точки рядом с игроком Рой идёт туда
  onCapture(cp, owner){
    const c = ctrlEntity();
    if (owner !== 0 || !c || S.attract || surfDist(cp.pos, c.pos) > 160) return;
    this.counter = { cp, t: S.time + 45 + random() * 45 };
  },
  counterStep(){
    const k = this.counter; if (!k || S.time < k.t) return;
    this.counter = null;
    if (k.cp.owner !== 0) return;
    let best = null, bd = 700;
    for (const sq of S.squads){
      if (sq.team !== 1 || sq.order === 'sky' || sq.order === 'defend' || sq.units.length < 2) continue;
      const Lg = leaderOf(sq); if (!Lg) continue;
      const d = surfDist(Lg.pos, k.cp.pos); if (d < bd){ bd = d; best = sq; }
    }
    if (best){ setOrder(best, 'cap', k.cp.pos, { cp: k.cp, lock: 90 }); for (const u of best.units) u.seen[0] = max(u.seen[0], 8); }
    else this.enemyDrop(offsetOnSphere(k.cp.dir, randUnit(), 60));
    this.st.counter = (this.st.counter || 0) + 1;
    VOX.radio('counter', tr(`Рой контратакует ${cpSay(k.cp)}! Готовьтесь к обороне.`, `The Swarm is counter-attacking ${cpSay(k.cp)}! Get ready to defend.`, `Bầy Đàn phản công ${cpSay(k.cp)}! Chuẩn bị phòng thủ.`), 2, 30, true);
  },
  // ---------------------------------------------------------------------
  //  «ДЕЙСТВУЮ ОДИН»: отряд уходит к стратегу; J — позвать обратно
  // ---------------------------------------------------------------------
  soloStep(){
    const me = S.me;
    if (!me || !me.alive || me.cls !== 'inf' || !me.squad) return;
    if (SET.solo && me.squad.units.length > 1 && !this.recall) this.detach(me);
    if (!SET.solo && me.squad.lone && !this.recall && !this.recallTried) this.callBack();
    if (this.recall) this.recallStep(me);
  },
  detach(me){
    const old = me.squad;
    old.units = old.units.filter(u => u !== me);
    if (old.units.length && !old.units.some(u => u.leader)) old.units[0].leader = true;
    const sq = newSquad(0, false);
    sq.lone = true; sq.units.push(me); me.squad = sq; sq.order = 'idle'; sq.vet = old.vet || 0;
    old.manualUntil = 0; old.strat = null; old.focus = null; if (old.order === 'focus') old.order = 'idle';
    for (const u of old.units) if (u.healTo === me) u.healTo = null;
    this.former = old; this.recallTried = false;
    if (TACT.task && TACT.task.g === old) TACT.task = null;
    if (!S.attract) feed(tr(`Действуешь один. ${groupLabel(old)} уходит под команду стратега. ${bk('solo')} — позвать обратно.`, `You're going solo. ${groupLabel(old)} returns to the strategist. ${bk('solo')} — call them back.`, `Bạn hành động một mình. ${groupLabel(old)} về dưới quyền chiến lược gia. ${bk('solo')} — gọi họ quay lại.`), '#9cf');
  },
  callBack(){
    const me = S.me; if (!me || me.cls !== 'inf') return;
    this.recallTried = true;
    let sq = this.former && groupAlive(this.former) && this.former.team === 0 && !this.former.lone && this.former.order !== 'sky' ? this.former : null;
    if (!sq){
      let bd = 420;
      for (const s of S.squads){ if (s.team !== 0 || s.lone || s.solo || s.order === 'sky' || !s.units.length) continue; const L = leaderOf(s); if (!L) continue; const d = surfDist(L.pos, me.pos); if (d < bd){ bd = d; sq = s; } }
    }
    if (!sq){ feed(tr('Свободных отрядов поблизости нет — ты пока один.', 'No free squads nearby — you stay solo for now.', 'Không có đội nào rảnh ở gần — bạn tạm thời một mình.'), '#f88'); return; }
    this.recall = { sq, t0: S.time };
    setOrder(sq, 'move', me.pos, { lock: 60 }); sq.rush = true;
    VOX.radio('recall', tr(`${groupLabel(sq)}: идём к тебе, командир!`, `${groupLabel(sq)}: on our way to you, commander!`, `${groupLabel(sq)}: đang tới chỗ anh, chỉ huy!`), 1, 8, true);
  },
  recallStep(me){
    const k = this.recall, sq = k.sq;
    if (!groupAlive(sq) || S.time - k.t0 > 150 || SET.solo){ this.recall = null; return; }
    const L = leaderOf(sq); if (!L) return;
    if (surfDist(L.pos, me.pos) < 24){ this.merge(me, sq); return; }
    setOrder(sq, 'move', me.pos, { lock: 60 }); sq.rush = true;
  },
  merge(me, sq){
    const lone = me.squad;
    if (lone && lone !== sq){
      lone.units = lone.units.filter(u => u !== me);
      if (!lone.units.length){ const i = S.squads.indexOf(lone); if (i >= 0) S.squads.splice(i, 1); S.sel.delete(lone); }
    }
    if (!sq.units.includes(me)) sq.units.push(me);
    me.squad = sq; sq.manualUntil = 0; sq.rush = false; sq.order = 'idle';
    this.recall = null; this.former = null;
    feed(tr(`${groupLabel(sq)} снова с тобой.`, `${groupLabel(sq)} is with you again.`, `${groupLabel(sq)} lại đi cùng bạn.`), '#8fffaa');
    if (typeof SQUADUI !== 'undefined'){ SQUADUI.lastT = -99; SQUADUI.say('possess', null, null, 5); }
  },
  setSolo(v){
    SET.solo = v; MENU.save();
    if (!v){ this.recallTried = false; if (S.me && S.me.squad && S.me.squad.lone) this.callBack(); }
    feed(v ? tr('Режим: действую один', 'Mode: going solo', 'Chế độ: một mình') : tr('Режим: отряд со мной', 'Mode: squad with me', 'Chế độ: đội đi cùng'), '#9cf');
  },
  setFree(v){
    SET.ordersFree = v; MENU.save();
    if (TACT.task) TACT.task.say = null;
    this.ignoreRun = 0; this.hideToast();
    if (v) VOX.radio('mode', tr('Понял, действуй сам. Подсказки буду давать без голоса.', 'Understood, you call the shots. I will only show quiet suggestions.', 'Rõ, bạn tự quyết. Tôi chỉ gợi ý không lời.'), 2, 3, true);
    else VOX.radio('mode', tr('Принято. Снова раздаю приказы.', 'Copy. Back to giving you orders.', 'Rõ. Tôi lại ra lệnh cho bạn.'), 2, 3, true);
    feed(v ? tr(`Режим: свобода действий (${bk('freeplay')})`, `Mode: free play (${bk('freeplay')})`, `Chế độ: tự do (${bk('freeplay')})`) : tr(`Режим: следовать приказам (${bk('freeplay')})`, `Mode: follow orders (${bk('freeplay')})`, `Chế độ: theo lệnh (${bk('freeplay')})`), '#9cf');
  },
  // пресеты одной клавишей (F2): Солдат → Свободный → Одиночка
  cyclePreset(){
    const cur = SET.ordersFree ? (SET.solo ? 2 : 1) : 0, nx = (cur + 1) % 3;
    if (!!SET.ordersFree !== (nx > 0)) this.setFree(nx > 0);
    if (!!SET.solo !== (nx === 2)) this.setSolo(nx === 2);
    feed([tr('Солдат: приказы стратега, отряд с тобой', 'Soldier: strategist orders, squad with you', 'Lính: lệnh chiến lược gia, đội đi cùng'), tr('Свободный: приказы — тихие подсказки, отряд с тобой', 'Free: orders become quiet suggestions, squad with you', 'Tự do: lệnh thành gợi ý, đội đi cùng'), tr('Одиночка: без приказов и без отряда', 'Lone wolf: no orders, no squad', 'Sói đơn độc: không lệnh, không đội')][nx], '#9cf');
  },
  // ---------------------------------------------------------------------
  //  ПЕРЕБРОСКА: капсула к цели (с отрядом) или прыжок в гущу боя
  // ---------------------------------------------------------------------
  // цель переброски: отслеживаемая точка; ядро — через ближайшую шахту
  trackTarget(){ const p = this.nav ? this.nav.raw : TACT.navPos(), c = ctrlEntity(); return p && c && len(p) < 80 ? navTargetFor(p, c.pos) : p; },
  canRedeploy(){
    const c = ctrlEntity(), p = this.trackTarget();
    return !!(c && c.cls === 'inf' && p && len(p) > 80 && S.time >= this.podReadyT && surfDist(c.pos, p) > 150 && !underground(c.pos));
  },
  redeploy(hot){
    const c = ctrlEntity(); if (!c || S.attract || S.mode !== 'fps') return false;
    if (typeof FPS61 !== 'undefined' && FPS61.coreEvac(hot)) return true;   // v6.1: из ядра/шахты — капсула на поверхность
    if (!hot && this.canRedeploy()) return this.podDrop(c, this.trackTarget());
    if (!hot && c.cls === 'inf' && S.time < this.podReadyT && this.trackTarget() && surfDist(c.pos, this.trackTarget()) > 150)
      feed(tr(`Капсула будет готова через ${Math.ceil(this.podReadyT - S.time)} с. Shift+${bk('redeploy')} — в гущу боя.`, `Pod ready in ${Math.ceil(this.podReadyT - S.time)} s. Shift+${bk('redeploy')} — into the fight.`, `Khoang sẵn sàng sau ${Math.ceil(this.podReadyT - S.time)} giây. Shift+${bk('redeploy')} — vào trận.`), '#f88');
    return this.jumpHot(c);
  },
  podDrop(c, target){
    const my = norm(c.pos), td = norm(target), total = surfDist(c.pos, target);
    const land = stepToward(my, td, max(0, total - 30) / RM);
    const units = [c];
    if (c.squad && !SET.solo) for (const u of c.squad.units) if (u !== c && u.alive && !u.parked && dist(u.pos, c.pos) < 90) units.push(u);
    const t1 = anyTangent(land);
    units.forEach((u, i) => {
      const d = i ? offsetOnSphere(land, rotAxis(t1, land, i * 2.1), 4 + i * 1.5) : land;
      u.pos = surfacePoint(d); u.vel = mul(norm(u.pos), 2); u.up = norm(u.pos); u.fwd = tangent(sub(target, u.pos), u.up);
      u.cover = null; u.healTo = null; u.leapT = 0; u.hopT = 0; u.skyState = null; u.stuckT = 0;
    });
    const to = surfacePoint(land, 0.3);
    S.pods.push({ team: 0, from: add(to, mul(norm(to), 160)), to, pos: add(to, mul(norm(to), 160)), t: 0, dur: 1.5, carry: true, by: 'player' });
    emit('podincoming', { team: 0, pos: to });
    CAMFX.onSwitch(c);
    S.flashT = max(S.flashT, 0.2);
    this.podReadyT = S.time + 60; this.st.pods++;
    HINTS.used && HINTS.used('redeploy');
    feed(tr(`Переброска капсулой: ${Math.round(total)} м за секунды`, `Drop pod redeploy: ${Math.round(total)} m in seconds`, `Tái triển khai bằng khoang: ${Math.round(total)} m trong vài giây`), '#8fffaa');
    VOX.radio('pod', tr('Капсула пошла! Высадка у цели.', 'Pod away! Landing at the objective.', 'Khoang đã phóng! Đáp xuống mục tiêu.'), 1, 10, true);
    return true;
  },
  hotSpots(){
    if (this._hs && S.rtime - this._hsT < 0.5 && this._hsMe === S.me) return this._hs;
    const L = this._hs = []; this._hsT = S.rtime; this._hsMe = S.me;
    const consider = e => {
      let n = 0; for (const x of TGT[0]) if (x.alive && x.cls !== 'bld' && x.cls !== 'hq' && dist2(x.pos, e.pos) < 3600) n++;
      if (n >= 2) L.push({ e, n });
    };
    for (const u of S.units) if (u.alive && u.team === 0 && !u.parked && u !== S.me && !underground(u.pos)) consider(u);
    for (const v of S.vehicles) if (v.alive && v.team === 0 && v !== S.me) consider(v);
    return L;
  },
  jumpHot(c){
    const tp = this.trackTarget();
    let best = null, bs = -1e9;
    for (const o of this.hotSpots()){
      if (c.squad && o.e.squad === c.squad) continue;
      const d = surfDist(o.e.pos, c.pos); if (d < 80) continue;
      const s = o.n * 10 + (tp && len(tp) > 80 && surfDist(o.e.pos, tp) < 90 ? 25 : 0) - d / 60 + (o.e.cls === 'tank' ? 5 : 0);
      if (s > bs){ bs = s; best = o; }
    }
    if (!best){ feed(tr('Горячих точек поблизости нет — бой и так рядом', 'No hot spots elsewhere — the fight is already here', 'Không có điểm nóng nào khác — trận đánh đã ở đây'), '#f88'); return false; }
    if (S.me && S.me.cls === 'bld' && S.turretBody){ S.turretBody.parked = false; S.turretBody = null; }
    takeControl(best.e);
    S.flashT = 0.15; this.st.jumps++;
    feed(tr(`В гущу боя: ${groupLabel(groupOf(best.e))} · врагов рядом: ${best.n}`, `Into the fight: ${groupLabel(groupOf(best.e))} · hostiles near: ${best.n}`, `Vào trận: ${groupLabel(groupOf(best.e))} · địch gần: ${best.n}`), '#9cf');
    return true;
  },
  // ---------------------------------------------------------------------
  //  НАВИГАЦИЯ: за какой целью следим (H), сглаженная точка маршрута
  // ---------------------------------------------------------------------
  trackList(){
    const L = [];
    const t = TACT.task;
    if (t && !t.done && (!this.free() || t.accepted)) L.push('order');
    if (SIDEQ.q) L.push('side');
    if (t && !t.done && this.free() && !t.accepted) L.push('order');
    const c = ctrlEntity();
    if (c && this.hotSpots().some(o => surfDist(o.e.pos, c.pos) > 80)) L.push('fight');
    return L;
  },
  trackMode(){
    const L = this.trackList();
    if (this.track !== 'auto' && L.includes(this.track)) return this.track;
    return L.find(m => m !== 'fight' && !(m === 'order' && this.free() && !(TACT.task && TACT.task.accepted))) || null;
  },
  cycleTrack(){
    const L = this.trackList();
    if (!L.length){ feed(tr('Целей для слежения нет', 'Nothing to track', 'Không có mục tiêu để theo dõi'), '#f88'); return; }
    const cur = this.trackMode();
    const i = L.indexOf(cur);
    this.track = L[(i + 1) % L.length];
    S.navT = 10;
    const name = { order: tr('приказ стратега', 'strategist order', 'lệnh chiến lược gia'), side: tr('побочная задача', 'side task', 'nhiệm vụ phụ'), fight: tr('ближайший бой', 'nearest fight', 'trận gần nhất') }[this.track];
    feed(tr(`Слежу: ${name}`, `Tracking: ${name}`, `Theo dõi: ${name}`), '#9cf');
    HINTS.used('track');
  },
  rawTarget(mode){
    if (mode === 'order') return TACT.navPos();
    if (mode === 'side') return SIDEQ.pos();
    if (mode === 'fight'){
      const c = ctrlEntity(); if (!c) return null;
      let best = null, bd = 1e9;
      for (const o of this.hotSpots()){ const d = surfDist(o.e.pos, c.pos) - o.n * 15; if (d < bd){ bd = d; best = o.e; } }
      return best ? best.pos : null;
    }
    return null;
  },
  // вызывается из computeNav (4 раза в секунду): сглаживание, чтобы линия не дёргалась
  updateNav(){
    const mode = this.trackMode();
    const raw = mode ? this.rawTarget(mode) : null;
    if (!raw){ this.nav = null; return null; }
    const t = TACT.task;
    const key = mode + ':' + (mode === 'order' && t ? (t.id || (t.id = ++TACT.seq)) : mode === 'side' && SIDEQ.q ? SIDEQ.q.t0 : '');
    if (!this.nav || this.nav.key !== key || len(raw) < 80 || dist(this.nav.p, raw) > 90) this.nav = { key, mode, raw, p: raw };
    else { this.nav.raw = raw; this.nav.p = add(this.nav.p, mul(sub(raw, this.nav.p), 0.18)); }
    return this.nav.p;
  },
  navPos(){ return this.nav ? this.nav.p : null; },
  navColor(){
    const m = this.nav && this.nav.mode;
    if (m === 'side') return '255,169,77';
    if (m === 'fight') return '255,110,90';
    const t = TACT.task;
    return t && t.kind !== 'strat' && t.kind !== 'player' ? '255,190,90' : '140,255,170';
  },
  // ---------------------------------------------------------------------
  //  «РАБОТАЕШЬ САМ?» — после трёх проигнорированных приказов, один раз
  // ---------------------------------------------------------------------
  taskEnd(t, ok){
    if (!t || t.ended) return;
    t.ended = true;
    if (t.dir && !ok) this.cool[this.candKey(t)] = S.time + 60;
    if (this.free() || t.kind === 'retreat' || t.kind === 'avoid' || t.kind === 'player') return;
    const ticks = t.ticks || 0, on = t.onTicks || 0;
    if (ok || (ticks > 4 && on / ticks > 0.4)){ this.ignoreRun = 0; return; }
    if (ticks >= 12 && on / ticks < 0.2 && !t.ignCounted) this.ignoreRun++;
    if (this.ignoreRun >= 3 && S.time > this.askT && !this.ask && !S.attract) this.showAsk();
  },
  showAsk(){
    this.st.asks++;
    this.ask = { until: S.rtime + 14 };
    VOX.radio('ask', tr('Командир, работаешь сам? Скажи — и я перестану дёргать.', 'Commander, working alone? Say so and I will stop nagging.', 'Chỉ huy, anh tự làm à? Nói một tiếng là tôi thôi làm phiền.'), 2, 5, true);
    emit('ask', {});
    let el = $('mtoast');
    if (!el){ el = document.createElement('div'); el.id = 'mtoast'; document.body.appendChild(el); el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b){ e.stopPropagation(); this.answer(b.dataset.a === 'y'); } }); el.addEventListener('touchstart', e => { const b = e.target.closest('[data-a]'); if (b){ e.preventDefault(); e.stopPropagation(); this.answer(b.dataset.a === 'y'); } }, { passive: false }); }
    el.innerHTML = `<span>${tr('Работаешь сам?', 'Working alone?', 'Tự làm à?')}</span><button data-a="y"><kbd>Y</kbd> ${tr('Да — не дёргать', 'Yes — stop nagging', 'Có — đừng làm phiền')}</button><button data-a="n"><kbd>N</kbd> ${tr('Нет', 'No', 'Không')}</button>`;
    el.style.display = 'flex';
  },
  hideToast(){ const el = $('mtoast'); if (el) el.style.display = 'none'; },
  answer(yes, timeout){
    this.ask = null; this.hideToast(); this.ignoreRun = 0;
    if (yes) this.setFree(true);
    else { this.askT = S.time + (timeout ? 300 : 600); if (!timeout) VOX.radio('mode', tr('Принято, продолжаем по плану.', 'Copy, sticking to the plan.', 'Rõ, tiếp tục theo kế hoạch.'), 1, 3, true); }
  },
  // принять подсказку в режиме свободы (Y)
  accept(){
    const t = TACT.task;
    if (!this.free() || !t || t.done || t.accepted) return false;
    t.accepted = true; S.navT = 10; this.track = 'order';
    emit('objective', { text: tr('Принято: ', 'Accepted: ', 'Đã nhận: ') + (TACT.card() || {}).title, tac: true });
    return true;
  },
  // клавиши режима шутера (до общего разбора действий). true — съели нажатие
  key(e){
    if (S.mode !== 'fps' || S.attract || S.over) return false;
    if (e.code === 'F2'){ e.preventDefault(); this.cyclePreset(); return true; }
    if (this.ask && (e.code === 'KeyY' || e.code === 'KeyN')){ this.answer(e.code === 'KeyY'); return true; }
    if (e.code === 'KeyY' && this.accept()) return true;
    const a = actOf(e.code);
    switch (a){
      case 'track': this.cycleTrack(); return true;
      case 'freeplay': this.setFree(!SET.ordersFree); return true;
      case 'solo': this.setSolo(!SET.solo); return true;
      case 'redeploy': this.redeploy(e.shiftKey); return true;
    }
    return false;
  },
  // ---------------------------------------------------------------------
  //  ЭКРАН: маркер приказа, компас, переключатель режима в панели отряда
  // ---------------------------------------------------------------------
  distTxt(c, p){ return `${Math.round(len(p) < 80 ? dist(p, c.pos) : surfDist(c.pos, p))} ${tr('м', 'm', 'm')}`; },
  navVisible(){
    const t = TACT.task;
    if (!this.nav) return false;
    if (this.nav.mode === 'order' && (!t || t.done)) return false;
    if (this.nav.mode === 'order' && this.free() && !t.accepted) return S.navLine;
    return S.navLine || S.navT > 0 || this.nav.mode !== 'order';
  },
  kindIcon(t){ return { intercept: '⚔ ', hunt: '✈ ', raid: '✸ ', capture: '◆ ', escort: '■ ', engage: '⚔ ', flank: '↪ ', tank: '■ ', struct: '✸ ', defend: '⛨ ', retreat: '✚ ' }[t.kind] || ''; },
  drawObjMarker(c){
    const t = TACT.task; if (!t || t.done) return;
    const op = TACT.navPos(); if (!op) return;
    const tgt = navTargetFor(op, c.pos);
    const quiet = this.free() && !t.accepted;
    const tac = t.kind !== 'strat' && t.kind !== 'player';
    octx.globalAlpha = quiet ? 0.55 : 1;
    const label = len(op) < 80 ? tr('ШАХТА → ЯДРО', 'SHAFT → CORE', 'GIẾNG → LÕI') : quiet ? tr('ПОДСКАЗКА', 'SUGGESTION', 'GỢI Ý') : this.kindIcon(t) + (tac ? tr('ТАКТИКА', 'TACTICAL', 'CHIẾN THUẬT') : tr('ЗАДАЧА', 'OBJECTIVE', 'NHIỆM VỤ'));
    edgeMarker(tgt, quiet ? '#b9c9bd' : tac ? '#ffbe5a' : '#8fffaa', label, this.distTxt(c, tgt) + (SIDEQ.sky ? ' · ↑' + tr('небо', 'sky', 'trời') : ''));
    octx.globalAlpha = 1;
  },
  overlay(c){
    if (!c || !S.cam) return;
    this.drawCompass(c);
    if (TOUCH.on && !this.tbtn) this.addTouch();
  },
  drawCompass(c){
    // компас — прямо под карточкой приказа (на её оси), без карточки — вверху по центру
    const ob = objEl && objEl.style.display !== 'none' ? objEl.getBoundingClientRect() : null;
    const W = innerWidth, cw = min(TOUCH.on ? 230 : 360, W * 0.4), cx = ob && ob.width ? ob.left + ob.width / 2 : W / 2, y = ob && ob.height ? ob.bottom + 4 : 6, h = 18, span = 1.35;
    const up = norm(c.pos), f = tangent(S.cam.fwd, up), r = norm(cross(f, up));
    let north = tangent([0, 1, 0], up); if (abs(up[1]) > 0.98) north = tangent([0, 0, 1], up);
    const east = norm(cross(north, up));
    const head = atan2(dot(f, east), dot(f, north));
    const rel = p => { const v = tangent(sub(p, c.pos), up); return atan2(dot(v, r), dot(v, f)); };
    const X = a => cx + a / span * cw / 2;
    octx.save();
    octx.fillStyle = 'rgba(8,12,18,.55)'; octx.fillRect(cx - cw / 2, y, cw, h);
    octx.strokeStyle = 'rgba(214,198,154,.35)'; octx.lineWidth = 1; octx.strokeRect(cx - cw / 2 + 0.5, y + 0.5, cw - 1, h - 1);
    octx.beginPath(); octx.rect(cx - cw / 2, y, cw, h + 16); octx.clip();
    octx.textAlign = 'center'; octx.font = '600 10px "Exo 2", Consolas, sans-serif';
    const CARD = [tr('С', 'N', 'B'), tr('В', 'E', 'Đ'), tr('Ю', 'S', 'N'), tr('З', 'W', 'T')];
    for (let k = 0; k < 24; k++){
      const ab = k * PI / 12; let a = ab - head; a = atan2(sin(a), cos(a));
      if (abs(a) > span) continue;
      const x = X(a);
      if (k % 6 === 0){ octx.fillStyle = 'rgba(232,220,184,.9)'; octx.fillText(CARD[k / 6], x, y + 13); }
      else { octx.fillStyle = 'rgba(214,198,154,.4)'; octx.fillRect(x - 0.5, y + (k % 2 ? 13 : 10), 1, k % 2 ? 5 : 8); }
    }
    const items = [];
    for (const hq of S.hq) if (hq.alive) items.push({ p: hq.pos, col: TEAM[hq.team].css, txt: hq.team ? tr('Р', 'S', 'B') : tr('Ш', 'H', 'S') });
    for (const cp of S.cps) if (!cp.core && surfDist(cp.pos, c.pos) < 280) items.push({ p: cp.pos, col: teamCss(cp.owner), txt: '◇' + cp.name });
    const sp = SIDEQ.pos(); if (sp) items.push({ p: sp, col: '#ffa94d', txt: '◆', mode: 'side' });
    const t = TACT.task, op = t && !t.done ? TACT.navPos() : null;
    if (op) items.push({ p: navTargetFor(op, c.pos), col: this.free() && !t.accepted ? '#b9c9bd' : (t.kind !== 'strat' && t.kind !== 'player' ? '#ffbe5a' : '#8fffaa'), txt: '◆', mode: 'order' });
    const hf = this.rawTarget('fight'); if (hf && surfDist(hf, c.pos) < 450) items.push({ p: hf, col: '#ff6e5a', txt: '✸', mode: 'fight' });
    if (SIDEQ.sky) items.push({ p: add(c.pos, mul(f, 10)), col: '#78c8ff', txt: '↑', fixed: 0 });
    const tm = this.nav && this.nav.mode;
    octx.font = '700 11px "Exo 2", Consolas, sans-serif';
    octx.restore(); octx.save();
    for (const it of items){
      let a = it.fixed !== undefined ? it.fixed : rel(it.p);
      const out = abs(a) > span; a = clamp(a, -span, span);
      const x = X(a) + (out ? (a > 0 ? -5 : 5) : 0);
      octx.fillStyle = it.col; octx.textAlign = 'center';
      octx.fillText(out ? (a > 0 ? it.txt + '›' : '‹' + it.txt) : it.txt, x, y + h - 5);
      if (it.mode && it.mode === tm){ octx.fillRect(x - 6, y + h + 1, 12, 2); if (it.mode !== 'fight'){ octx.font = '10px "Exo 2", Consolas, sans-serif'; octx.fillText(this.distTxt(c, it.p), x, y + h + 13); octx.font = '700 11px "Exo 2", Consolas, sans-serif'; } }
    }
    octx.restore();
  },
  chip(){
    const free = this.free(), solo = !!SET.solo;
    const rec = this.recall ? ` · ${tr('идут к тебе', 'coming', 'đang tới')}` : '';
    return `<div class="mm"><span data-mm="free" class="${free ? 'free' : ''}">${free ? tr('Свобода', 'Free play', 'Tự do') : tr('Приказы', 'Orders', 'Theo lệnh')} <kbd>${bk('freeplay')}</kbd></span><span data-mm="solo" class="${solo ? 'free' : ''}">${solo ? tr('Один', 'Solo', 'Một mình') + rec : tr('Отряд со мной', 'Squad with me', 'Đội đi cùng')} <kbd>${bk('solo')}</kbd></span></div>`;
  },
  addTouch(){
    const box = document.querySelector('#touch .tf.fps'); if (!box) return;
    this.tbtn = true;
    const mk = (txt, fn, title) => { const b = document.createElement('button'); b.textContent = txt; b.title = title; b.className = 'mbt'; b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); fn(); }, { passive: false }); box.appendChild(b); return b; };
    mk('⇲', () => this.redeploy(false), tr('Переброска', 'Redeploy', 'Tái triển khai'));
    mk('✸', () => this.redeploy(true), tr('В гущу боя', 'Into the fight', 'Vào trận'));
    mk('⌖', () => this.cycleTrack(), tr('Цель', 'Track', 'Mục tiêu'));
  },
  init(){
    if (this.inited) return; this.inited = true;
    const st = document.createElement('style');
    st.textContent = `
#sq{top:126px} #tut{top:132px}
body.touch #sq{top:70px}
#obj.free{background:rgba(14,18,16,.55);border-color:rgba(185,201,189,.35)} #obj.free small{color:#b9c9bd} #obj.free b{font-size:15px;color:#dfe8e1}
#squadp .mm{display:flex;gap:4px;margin:0 0 3px;pointer-events:auto}
#squadp .mm span{flex:1;cursor:pointer;font:600 10px "Exo 2";letter-spacing:.06em;padding:2px 5px;background:rgba(10,30,16,.6);border:1px solid rgba(143,255,170,.4);color:#cfeedd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#squadp .mm span.free{background:rgba(40,40,46,.6);border-color:rgba(156,204,255,.45);color:#d6e8ff}
#squadp .mm kbd{font-size:8px;padding:0 2px;margin-left:2px}
#mtoast{position:fixed;left:50%;top:32%;transform:translateX(-50%);display:none;gap:8px;align-items:center;z-index:16;background:rgba(10,18,28,.9);border:1px solid rgba(120,190,255,.6);padding:8px 12px;font:600 15px "Exo 2";color:#e6f2ff}
#mtoast button{pointer-events:auto;cursor:pointer;background:rgba(214,198,154,.1);border:1px solid var(--line);color:#fff;font:600 13px "Exo 2";padding:5px 10px}
#mtoast button:hover{border-color:var(--sand)}
#touch .tf button.mbt{width:44px;height:44px;font-size:18px;border-color:rgba(156,204,255,.6)}
#screen .slist{display:flex;flex-direction:column;gap:4px;margin:6px 0}
#screen .srow{display:flex;gap:6px;align-items:center;background:rgba(12,13,14,.6);border:1px solid var(--line);padding:5px 8px;font-size:13px}
#screen .srow div{flex:1;min-width:0} #screen .srow b{display:block;color:#fff} #screen .srow small{color:#9a937e}
#screen .srow button{font-size:12px;padding:4px 8px}
#screen textarea{width:100%;height:120px;background:#0b0c0d;color:#cfc6ad;border:1px solid var(--line);font:11px Consolas,monospace}
#screen .why{font-size:12px;color:#9a937e;line-height:1.45;margin:4px 0 8px}
#screen .mcol{max-height:96vh;overflow-y:auto}
body:has(#screen[style*="flex"]) #hint{display:none !important}
`;
    document.head.appendChild(st);
    const sp = $('squadp');
    const tap = e => { const b = e.target.closest('[data-mm]'); if (!b) return; e.preventDefault(); e.stopPropagation(); if (b.dataset.mm === 'free') this.setFree(!SET.ordersFree); else this.setSolo(!SET.solo); };
    if (sp){ sp.addEventListener('click', tap); sp.addEventListener('touchstart', tap, { passive: false }); }
    // радиоэфир: Полный / Важное / Тишина
    const r0 = AU.radio;
    AU.radio = function(text, pri){ const lv = SET.radioLvl === undefined ? 2 : SET.radioLvl; if (lv === 0 && (pri || 0) < 3) return; if (lv === 1 && (pri || 0) < 2) return; return r0.call(this, text, pri); };
    const m0 = AU.mate;
    AU.mate = function(text, pitch){ if ((SET.radioLvl === undefined ? 2 : SET.radioLvl) < 2) return; return m0.call(this, text, pitch); };
  },
};
// ---------------------------------------------------------------------
//  МЕНЮ: режимы в паузе, выход с подтверждением, экран сохранений
// ---------------------------------------------------------------------
MISSION.modeRows = function(){
  const b = (k, v, txt) => `<button data-mm2="${k}:${v}" class="${(k === 'free' ? !!SET.ordersFree : !!SET.solo) === v ? 'cur' : ''}">${txt}</button>`;
  return `<div class="diffrow">${b('free', false, tr('Следовать приказам', 'Follow orders', 'Theo lệnh'))}${b('free', true, tr('Свобода действий', 'Free play', 'Tự do hành động'))}</div>
    <div class="diffrow">${b('solo', false, tr('Отряд со мной', 'Squad with me', 'Đội đi cùng'))}${b('solo', true, tr('Действую один', 'Going solo', 'Một mình'))}</div>`;
};
MENU.html_quit = function(){
  return `<div class="mcol"><h2>${tr('ВЫЙТИ ИЗ БОЯ?', 'LEAVE THE BATTLE?', 'RỜI TRẬN?')}</h2>
    <p class="sub">${tr('Бой сохранится в слот «Автосохранение» — продолжишь из главного меню.', 'The battle will be stored in the "Autosave" slot — continue it from the main menu.', 'Trận sẽ được lưu vào ô «Tự động lưu» — tiếp tục từ menu chính.')}</p>
    ${this.btn('quitok', tr('Сохранить и выйти в главное меню', 'Save and quit to main menu', 'Lưu và thoát ra menu chính'), 'big')}
    ${this.btn('quitnosave', tr('Выйти без сохранения', 'Quit without saving', 'Thoát không lưu'))}
    ${this.btn('back', tr('Остаться в бою', 'Stay in the battle', 'Ở lại trận'))}</div>`;
};
MENU.html_saves = function(){
  const L = SAVE.list();
  const modeTxt = m => (m.endless === false ? tr('матч 60 мин', '60-min match', 'trận 60 phút') : tr('бесконечный', 'endless', 'bất tận')) + (DIFF[m.diff] ? ' · ' + N2(DIFF[m.diff].n).toLowerCase() : '') + (SCALES[m.battle] ? ' · ' + N2(SCALES[m.battle].n).toLowerCase() : '');
  const rows = L.length ? L.map(m => `<div class="srow"><div><b>${SAVE.slotName(m.slot)} · ${tr('бой', 'battle', 'trận')} ${fmtTime(m.time || 0)}</b><small>${SAVE.fmtAt(m.at)} · ${modeTxt(m)}${m.size ? ' · ' + Math.round(m.size / 1024) + ' KB' : ''}</small></div>
      <button data-sv="load:${m.slot}">${tr('Загрузить', 'Load', 'Tải')}</button><button data-sv="exp:${m.slot}">${tr('Экспорт в файл', 'Export to file', 'Xuất ra tệp')}</button><button data-sv="del:${m.slot}">✕</button></div>`).join('')
    : `<p class="why">${tr('Сохранений пока нет.', 'No saves yet.', 'Chưa có bản lưu.')}</p>`;
  return `<div class="mcol wide" style="max-width:760px"><h2>${tr('СОХРАНЕНИЯ', 'SAVES', 'BẢN LƯU')}</h2>
    <p class="why">${tr('Сохранения хранятся только в этом браузере на этом устройстве (localStorage). Если кто-то другой скачает игру — твоих сохранений у него не будет. Чтобы перенести бой на другой компьютер или браузер: «Экспорт в файл» здесь → «Импорт из файла» там. Автосохранение — каждые 3 минуты боя и при выходе в меню.',
      'Saves live only in this browser on this device (localStorage). Anyone else who downloads the game gets none of your saves. To move a battle to another computer or browser: "Export to file" here → "Import from file" there. Autosave runs every 3 minutes of battle and when you quit to the menu.',
      'Bản lưu chỉ nằm trong trình duyệt này trên thiết bị này (localStorage). Người khác tải game sẽ không có bản lưu của bạn. Để chuyển trận sang máy hoặc trình duyệt khác: «Xuất ra tệp» ở đây → «Nhập từ tệp» ở kia. Tự động lưu mỗi 3 phút và khi thoát ra menu.')}</p>
    <div class="slist">${rows}</div>
    <div class="diffrow">${this.btn('impfile', tr('Импорт из файла…', 'Import from file…', 'Nhập từ tệp…'))}${this.btn('imptext', tr('Вставить текст сохранения', 'Paste save text', 'Dán nội dung bản lưu'))}</div>
    <input type="file" id="m_file" accept=".json,.txt,application/json,text/plain" style="display:none">
    <div id="m_area" style="display:none"><textarea id="m_txt" spellcheck="false"></textarea>
      <div class="diffrow">${this.btn('txtload', tr('Загрузить из текста', 'Import this text', 'Nhập từ văn bản'))}${this.btn('copy', tr('Копировать текст', 'Copy text', 'Sao chép'))}</div></div>
    <p class="why" id="m_msg"></p>
    ${this.btn('back', tr('Назад', 'Back', 'Quay lại'), 'big')}</div>`;
};
MISSION.wireMenu = function(name){
  const el = $('screen');
  el.querySelectorAll('[data-mm2]').forEach(b => b.onclick = e => {
    e.stopPropagation(); const [k, v] = b.dataset.mm2.split(':'), val = v === 'true';
    if (k === 'free'){ if (!!SET.ordersFree !== val) this.setFree(val); } else if (!!SET.solo !== val) this.setSolo(val);
    MENU.show(MENU.cur);
  });
  const btn = (id, fn) => { const b = $('m_' + id); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); fn(); }; };
  if (name === 'quit'){
    btn('quitok', () => { const ok = SAVE.save('auto'); if (!ok) console.warn('autosave on quit failed'); MENU.toMenu(); });
    btn('quitnosave', () => MENU.toMenu());
  }
  if (name !== 'saves') return;
  const msg = (t, bad) => { const m = $('m_msg'); if (m){ m.textContent = t; m.style.color = bad ? '#f88' : '#8fffaa'; } };
  const area = $('m_area'), txt = $('m_txt');
  const imported = r => { if (r.err) return msg(r.err, true); MENU.show('saves'); msg(tr(`Импортировано в слот «${SAVE.slotName(r.slot)}». Нажми «Загрузить».`, `Imported into "${SAVE.slotName(r.slot)}". Press "Load".`, `Đã nhập vào «${SAVE.slotName(r.slot)}». Nhấn «Tải».`)); };
  el.querySelectorAll('[data-sv]').forEach(b => b.onclick = e => {
    e.stopPropagation(); AU.init();
    const [op, slot] = b.dataset.sv.split(':');
    if (op === 'load') MENU.loadGame(slot);
    else if (op === 'del'){ if (b.dataset.sure){ SAVE.del(slot); MENU.show('saves'); } else { b.dataset.sure = 1; b.textContent = tr('Точно?', 'Sure?', 'Chắc chưa?'); } }
    else if (op === 'exp'){
      const t = SAVE.exportText(slot); if (!t) return msg(tr('Слот пуст', 'Empty slot', 'Ô trống'), true);
      let ok = false;
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' }));
        a.download = `portal_meteor_${slot}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); ok = true;
      } catch (err){ ok = false; }
      area.style.display = 'block'; txt.value = t;
      msg((ok ? tr('Файл отправлен на скачивание. ', 'The file was sent to downloads. ', 'Đã gửi tệp để tải về. ') : '') + tr('Если файл не появился (например, игра открыта внутри claude.ai) — нажми «Копировать текст» и сохрани текст в любой файл .json или .txt.', 'If no file appeared (e.g. the game runs inside claude.ai), press "Copy text" and paste it into any .json or .txt file.', 'Nếu không thấy tệp (ví dụ game chạy trong claude.ai), nhấn «Sao chép» và dán vào tệp .json hoặc .txt bất kỳ.'));
      MISSION.lastExport = t;
    }
  });
  btn('impfile', () => { const f = $('m_file'); if (f) f.click(); });
  const fi = $('m_file');
  if (fi) fi.onchange = () => { const f = fi.files && fi.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => imported(SAVE.importText(rd.result)); rd.onerror = () => msg(tr('Не удалось прочитать файл', 'Could not read the file', 'Không đọc được tệp'), true); rd.readAsText(f); };
  btn('imptext', () => { area.style.display = 'block'; txt.value = ''; txt.focus(); msg(tr('Вставь текст сохранения (Ctrl+V) и нажми «Загрузить из текста».', 'Paste the save text (Ctrl+V) and press "Import this text".', 'Dán nội dung bản lưu (Ctrl+V) rồi nhấn «Nhập từ văn bản».')); });
  btn('txtload', () => imported(SAVE.importText(txt.value)));
  btn('copy', () => {
    const t = txt.value; if (!t) return;
    const fallback = () => { txt.focus(); txt.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e){} msg(ok ? tr('Скопировано.', 'Copied.', 'Đã sao chép.') : tr('Текст выделен — нажми Ctrl+C.', 'Text selected — press Ctrl+C.', 'Đã chọn văn bản — nhấn Ctrl+C.'), !ok); };
    try { navigator.clipboard.writeText(t).then(() => msg(tr('Скопировано в буфер обмена.', 'Copied to clipboard.', 'Đã sao chép vào bộ nhớ tạm.')), fallback); } catch (e){ fallback(); }
  });
};
if (SET.radioLvl === undefined) SET.radioLvl = 2;
SET_DEF.radioLvl = 2;
setTimeout(() => MISSION.init(), 0);   // AU объявлен ниже по сборке — инициализируемся после загрузки скрипта
