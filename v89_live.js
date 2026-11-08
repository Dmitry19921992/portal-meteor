// =====================================================================
//  v8.9 — «ЖИВОЙ МИР» (LIVE89): мир просит о помощи, герои дают задания, штаб ломает затянувшийся фронт.
//  • Просьбы своих ИИ-юнитов (Шутер и Командир): багги зажали / подбита, инженера обстреливают на стройке, отряд прижали.
//    Редко: первая через 2.5–4 мин, дальше раз в 2–4 мин, в каждом пятом бою — ни одной. Радио + маркер + компактная
//    карточка с таймером (✕ — убрать, можно просто игнорировать). Помог (врагов рядом нет, ты был рядом) — благодарность и
//    награда: ствол из кузова (пулемёт 90 с + полные магазины), место стрелка на втором орудии багги (Y/N),
//    боец капсулой С БАЗЫ (пусковая площадка v8.7) в твой отряд, прикрытие с орбиты 20 с, +2 КО.
//  • Квесты героев (не ниндзя): ветеран-разведчик «Сыч» (снести ПВО-радар врага, спасти сбитого пилота) и
//    инженер-изобретатель «Левша» (принести кристалл из «Поющей жилы»). Предложение: Y — принять, N — отказ.
//    Награды: КО, руда, артефакт; спасённый пилот встаёт в твой отряд. Над героем — имя «★ Сыч».
//  • Перелом боя: точки не меняли владельца ~7 мин → штаб предлагает (важный квест): подорвать генератор врага
//    (турели врага молчат 2 мин) или захватить ретранслятор (карта врага видна 60 с). В Стратеге — «Y — выдать отряду»
//    (выбранному или ближайшему). ИИ-противник тоже проводит такие операции — с предупреждением по радио и маркером ⚠.
//    В бою бот-против-бота — обе стороны одинаково.
//  • Одна карточка за раз (просьба, квест или операция; побочные задачи SIDEQ ждут), лента — по 1 строке на событие,
//    подсказка — одна, один раз. «Чистый экран» (F9) прячет карточку. Настройки: «Живой мир» (вкл/выкл). Выключить: ?lv89=0.
//  Хуки — обёртки: update, newMatch, podStep, turretStep, SIDEQ.offer, uixFrame, drawOverlay, drawRTSOverlay,
//  MENU.html_settings, P71M.sec, keydown (capture). Номер версии — v8.9.
// =====================================================================
if (SET.live89 === undefined) SET.live89 = true;
const LIVE89 = {
  on: (() => { try { return new URLSearchParams(location.search).get('lv89') !== '0'; } catch (e){ return true; } })(),
  STALL: (() => { try { return +(new URLSearchParams(location.search).get('st89') || 420); } catch (e){ return 420; } })(),
  err: {}, cur: null, offer: null, cover: null, warn: null, ai: [null, null], heroes: {}, el: null, sig: '', tick: 0, uiT: 0, tipT: 0,
  nextReq: 1e9, nextQuest: 1e9, opNext: [0, 0], cpSig: '', cpT: 0, quiet: false, force: false,
  stats: { req: 0, reqOk: 0, reqFail: 0, quest: 0, questOk: 0, questNo: 0, op: 0, opOk: 0, opNo: 0, ai: [0, 0], aiOk: [0, 0], pods: 0, landed: 0, rewards: {}, off: 0, scans: 0 },
  L: (ru, en) => tr(ru, en, en, en),
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('LIVE89 ' + tag, e); } } },
  ph(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  mode(){ return typeof V87M !== 'undefined' ? V87M.mode() : (S.mode === 'fps' ? 'fps' : 'rts'); },
  tut(){ return (typeof T72 !== 'undefined' && T72.on) || (typeof TUT !== 'undefined' && TUT.on); },
  lesson(){ return typeof T72 !== 'undefined' && T72.on && typeof L84 !== 'undefined' && L84.cur === 'l89live'; },
  live(){ return this.on && SET.live89 !== false && !S.attract && !S.over && (!this.tut() || this.lesson()); },
  focus(){
    const m = this.mode();
    if (m === 'fps'){ const c = ctrlEntity(); return c && c.alive && c.cls !== 'bld' ? c : null; }
    if (m === 'cmd' && typeof CMD85 !== 'undefined' && CMD85.g && groupAlive(CMD85.g)) return leaderOf(CMD85.g);
    return null;
  },
  mySquad(){
    const m = this.mode();
    if (m === 'fps'){ const g = playerGroup(); return isSquad(g) ? g : null; }
    if (m === 'cmd' && typeof CMD85 !== 'undefined' && isSquad(CMD85.g) && groupAlive(CMD85.g)) return CMD85.g;
    return null;
  },
  mmss(s){ s = max(0, Math.ceil(s)); return floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
  dTxt(p){ const f = this.focus(); return f ? Math.round(surfDist(f.pos, p)) + ' ' + tr('м', 'm', 'm') + ' ' + relDirWord(p) : ''; },
  // ---------------------------------------------------------------- матч
  reset(){
    this.cur = this.offer = this.cover = this.warn = null; this.ai = [null, null]; this.heroes = {};
    this.nextReq = 150 + random() * 90; this.nextQuest = 280 + random() * 100; this.opNext = [0, 0];
    this.cpSig = ''; this.cpT = 0; this.quiet = random() < 0.2; this.sig = ''; this.hideCard();
    if (!this.lesson()) this.force = false;
  },
  spotOk(dir){
    if (abs(groundR(dir) - RM) > 14) return false;
    if (typeof TER81 !== 'undefined' && TER81.ready){ if (TER81.lakeAt(mul(dir, RM))) return false; if (TER81.near(dir, 4)) return false; }
    for (const b of S.buildings) if (b.alive && surfDist(dir, b.pos) < (BTYPES[b.type] ? BTYPES[b.type].bound : 6) + 3) return false;
    return true;
  },
  spotNear(center, r0, r1){
    const c = norm(center);
    for (let k = 0; k < 30; k++){ const d = offsetOnSphere(c, tangent(randUnit(), c), r0 + (r1 - r0) * random()); if (this.spotOk(d)) return d; }
    return offsetOnSphere(c, anyTangent(c), r0);
  },
  // ---------------------------------------------------------------- кадр симуляции
  step(dt){
    if (!this.on || S.paused) return;
    this.tick -= dt; if (this.tick > 0) return; const T = 0.5 - this.tick; this.tick = 0.5;
    // затянувшийся фронт: точки не меняли владельца
    const sig = S.cps.filter(c => !c.core).map(c => c.owner).join(',');
    if (sig !== this.cpSig){ this.cpSig = sig; this.cpT = S.time; }
    this.coverStep(T);
    for (const t of [0, 1]) this.safe(() => this.aiStep(t, T), 'ai' + t);
    if (!this.live()){ this.offer = null; return; }
    if (this.offer && S.rtime > this.offer.until) this.answer(false, true);
    if (this.cur) this.safe(() => this.curStep(T), 'cur');
    if (this.cur || this.offer || S.over) return;
    if (this.force) return;
    if (typeof SIDEQ !== 'undefined' && SIDEQ.q) return;
    const m = this.mode();
    if (this.stalled(0) && S.time > this.opNext[0] && S.teams[0]) { this.safe(() => this.offerOp(), 'offerOp'); if (this.offer) return; }
    if (m !== 'fps' && m !== 'cmd') return;
    if (!this.focus()) return;
    if (S.time > this.nextQuest){ this.safe(() => this.offerQuest(), 'offerQ'); if (this.offer) return; }
    if (S.time > this.nextReq && !this.quiet) this.safe(() => this.offerReq(), 'offerR');
  },
  stalled(t, extra){ return S.time > 240 && S.time - this.cpT > this.STALL + (extra || 0); },
  // ================================================================ 1. ПРОСЬБЫ
  RW: {
    gun:  ['ствол из кузова', 'a gun from the trunk'],
    seat: ['место стрелка', 'the gunner seat'],
    pod:  ['боец капсулой с базы', 'a trooper by pod from the base'],
    sat:  ['прикрытие с орбиты 20 с', 'orbital cover 20 s'],
    cmd:  ['+2 КО', '+2 CP'],
  },
  rwName(k){ const r = this.RW[k]; return r ? this.L(r[0], r[1]) : ''; },
  foesAt(p, r, team){ return enemiesNear(team === undefined ? 0 : team, p, r, e => e.cls === 'inf' || e.cls === 'tank' || e.cls === 'drone'); },
  reqCands(f){
    const L = [], me = S.me, pg = this.mySquad();
    for (const v of S.vehicles){
      if (!v.alive || v.team !== 0 || v.vk !== 'raider' || v === me) continue;
      const d = surfDist(v.pos, f.pos); if (d < 25 || d > 220) continue;
      const n = this.foesAt(v.pos, 45).length;
      if (n >= 2 || (n >= 1 && v.hp < v.maxhp * 0.55)){ L.push({ kind: 'buggy', g: v, broke: v.hp < v.maxhp * 0.55 }); break; }
    }
    for (const b of S.builders){
      if (!b.alive || b.team !== 0 || !b.site || b === me) continue;
      const d = surfDist(b.pos, f.pos); if (d < 20 || d > 240) continue;
      if (this.foesAt(b.pos, 50).length >= 1){ L.push({ kind: 'eng', g: b, site: b.site }); break; }
    }
    for (const g of S.squads){
      if (g.team !== 0 || g === pg || !groupAlive(g)) continue;
      const Lg = leaderOf(g); if (!Lg) continue;
      const d = surfDist(Lg.pos, f.pos); if (d < 25 || d > 200) continue;
      if (groupHP(g) < 0.65 && this.foesAt(Lg.pos, 45).length >= 2){ L.push({ kind: 'pinned', g }); break; }
    }
    return L;
  },
  pickReward(kind){
    const fps = this.mode() === 'fps', c = ctrlEntity(), inf = fps && c && c.cls === 'inf', sq = this.mySquad();
    const podOk = sq && sq.units.length < 6 && (typeof LCH87 === 'undefined' || !LCH87.on || LCH87.src(0));
    let o = [];
    if (kind === 'buggy') o = inf ? ['gun', 'seat'] : podOk ? ['pod', 'cmd'] : ['cmd'];
    else if (kind === 'eng') o = ['sat', 'cmd'];
    else o = podOk ? ['pod', 'sat'] : ['sat', 'cmd'];
    return o[floor(random() * o.length)];
  },
  offerReq(force){
    const f = this.focus(); if (!f) return null;
    const L = force ? [force] : this.reqCands(f);
    if (!L.length){ this.nextReq = S.time + 20; return null; }
    const q = Object.assign({ type: 'req', t0: S.time, T: 80, foes: [], near: 0 }, L[floor(random() * L.length)]);
    q.rw = q.rw || this.pickReward(q.kind);
    q.who = groupLabel(q.g);
    this.cur = q; this.stats.req++;
    const ttl = this.reqTitle(q);
    VOX.radio('req89', q.who + ': ' + ttl + '!', 1, 20, true);
    feed('✋ ' + q.who + ': ' + ttl, '#ffcf6a');
    this.tip();
    return q;
  },
  reqTitle(q){
    if (q.kind === 'buggy') return q.broke ? this.L('подбита, прикрой — починюсь', 'hit and stuck, cover me while I fix up') : this.L('нас зажали — прикрой', 'pinned down — cover us');
    if (q.kind === 'eng') return this.L(`строю ${q.site && q.site.type ? bname(q.site.type).toLowerCase() : ''} — меня обстреливают`, `building a ${q.site && q.site.type ? bname(q.site.type).toLowerCase() : 'structure'} — under fire`);
    return this.L('нас прижали — помоги', 'we are pinned — help');
  },
  reqPos(q){ const L = isSquad(q.g) ? leaderOf(q.g) : q.g; return L && L.alive !== false ? L.pos : null; },
  // ================================================================ 2. КВЕСТЫ ГЕРОЕВ
  HERO: { syc: ['Сыч', 'Owl', 'ветеран-разведчик', 'veteran scout'], lev: ['Левша', 'Lefty', 'инженер-изобретатель', 'inventor engineer'] },
  heroName(id){ const H = this.HERO[id]; return this.L(H[0], H[1]); },
  heroUnit(id){
    let u = this.heroes[id];
    if (u && u.alive && u.team === 0) return u;
    u = null;
    if (id === 'lev') u = S.builders.find(b => b.alive && b.team === 0 && b !== S.me);
    if (!u) u = S.units.find(x => x.alive && x.team === 0 && x.cls === 'inf' && x !== S.me && x.role === 'scout' && x.squad !== this.mySquad());
    if (!u) u = S.units.find(x => x.alive && x.team === 0 && x.cls === 'inf' && x !== S.me && x.leader && x.squad !== this.mySquad());
    if (u){ u.hero89 = id; this.heroes[id] = u; }
    return u;
  },
  offerQuest(force){
    const f = this.focus(); if (!f) return null;
    const L = [];
    const aa = S.buildings.filter(b => b.alive && b.done && b.team === 1 && b.type === 'aa' && surfDist(b.pos, f.pos) < 650).sort((a, b) => surfDist(a.pos, f.pos) - surfDist(b.pos, f.pos))[0];
    if (aa) L.push({ kind: 'radar', hero: 'syc', b: aa, T: 300 });
    if (typeof A78 !== 'undefined' && A78.on && SET.a78 !== false){
      const v = A78.L.filter(a => a.k === 'vein' && surfDist(a.pos, f.pos) < 600 && surfDist(a.pos, f.pos) > 30).sort((a, b) => surfDist(a.pos, f.pos) - surfDist(b.pos, f.pos))[0];
      if (v) L.push({ kind: 'crystal', hero: 'lev', a: v, T: 300, ph: 0 });
    }
    L.push({ kind: 'pilot', hero: 'syc', T: 240 });
    let q = force ? L.find(o => o.kind === force) : L[floor(random() * L.length)];
    if (!q){ this.nextQuest = S.time + 60; return null; }
    q = Object.assign({ type: 'quest', prog: 0 }, q);
    if (q.kind === 'pilot'){ q.dir = this.spotNear(f.pos, 110, 160); q.pos = surfacePoint(q.dir, 0.3); q.name = this.L('Ястреб', 'Hawk'); }
    q.giver = this.heroUnit(q.hero);
    this.ask(q, 15);
    this.stats.quest++;
    VOX.radio('quest89', this.heroName(q.hero) + ': ' + this.qTalk(q), 1, 20, true);
    feed('★ ' + this.L('Квест от героя', 'Hero quest') + ' · ' + this.heroName(q.hero), '#ffd27a');
    this.tip();
    return q;
  },
  qTalk(q){
    if (q.kind === 'radar') return this.L('Командир, их ПВО-радар слепит нашу авиацию. Снеси его.', 'Commander, their AA radar blinds our air. Take it down.');
    if (q.kind === 'crystal') return this.L('Принеси кристалл из Поющей жилы — соберу из него штуку.', 'Bring me a crystal from the Singing Vein — I will build something.');
    return this.L(`Сбит наш пилот, ${this.dTxt(q.pos)}. Вытащи его.`, `Our pilot is down, ${this.dTxt(q.pos)}. Get him out.`);
  },
  qTitle(q){
    if (q.kind === 'radar') return this.L('Снести ПВО-радар врага', 'Destroy the enemy AA radar');
    if (q.kind === 'crystal') return q.ph ? this.L('Неси кристалл к своей базе или точке', 'Carry the crystal to your base or point') : this.L('Кристалл из «Поющей жилы»', 'A crystal from the Singing Vein');
    return this.L(`Спасти сбитого пилота «${q.name}»`, `Rescue downed pilot "${q.name}"`);
  },
  qReward(q){
    if (q.kind === 'radar') return this.L('+3 КО, +150 руды', '+3 CP, +150 ore');
    if (q.kind === 'crystal') return this.L('артефакт, +2 КО', 'an artifact, +2 CP');
    return this.L('пилот в отряд, +2 КО, +100 руды', 'pilot joins you, +2 CP, +100 ore');
  },
  dropoff(p){
    let best = null, bd = 1e9;
    for (const b of S.buildings) if (b.alive && b.team === 0 && b.done && (b.type === 'hq' || b.type === 'outpost' || b.type === 'barracks' || b.cls === 'hq')){ const d = surfDist(b.pos, p); if (d < bd){ bd = d; best = b.pos; } }
    if (S.hq[0] && S.hq[0].alive){ const d = surfDist(S.hq[0].pos, p); if (d < bd){ bd = d; best = S.hq[0].pos; } }
    for (const c of S.cps) if (!c.core && c.owner === 0){ const d = surfDist(c.pos, p); if (d < bd){ bd = d; best = c.pos; } }
    return best;
  },
  // ================================================================ 3. ПЕРЕЛОМ БОЯ (операции)
  OPN: { gen: ['Подорвать генератор врага', 'Blow up the enemy generator'], relay: ['Захватить ретранслятор', 'Capture the relay'] },
  makeOp(team, kind){
    const foe = 1 - team;
    const tur = S.buildings.filter(b => b.alive && b.done && b.team === foe && b.type === 'turret');
    if (!kind) kind = tur.length && random() < 0.6 ? 'gen' : 'relay';
    if (kind === 'gen' && !tur.length) kind = 'relay';
    let dir;
    if (kind === 'gen'){
      const f = team === 0 && !S.attract ? this.focus() : null, an = f ? f.pos : BASES[team];   // игроку — ближайшая к нему турель врага
      const b = tur.sort((a, c) => surfDist(a.pos, an) - surfDist(c.pos, an))[0];
      dir = this.spotNear(b.pos, 10, 16);
    } else {
      const own = (t) => S.cps.filter(c => !c.core && c.owner === t).sort((a, c) => surfDist(a.dir, BASES[1 - t]) - surfDist(c.dir, BASES[1 - t]))[0];
      const a = own(team), b = own(foe);
      const A = a ? a.dir : BASES[team], B = b ? b.dir : BASES[foe];
      let m = add(norm(A), norm(B)); m = len(m) < 0.2 ? offsetOnSphere(norm(A), anyTangent(norm(A)), 120) : norm(m);
      dir = this.spotNear(m, 0, 30);
    }
    const f = this.focus(), dd = f && team === 0 ? surfDist(f.pos, dir) : 300;
    return { type: 'op', kind, team, foe, dir, pos: surfacePoint(dir, 0.4), prog: 0, need: kind === 'gen' ? 6 : 8, t0: S.time, T: Math.round(clamp(150 + dd / 3.5, 220, 480)), g: null, imp: true };
  },
  offerOp(kind){
    const op = this.makeOp(0, kind);
    this.ask(op, 20); this.stats.op++;
    VOX.radio('op89', this.L(`Штаб: фронт встал. Есть шанс — ${this.L(this.OPN[op.kind][0], this.OPN[op.kind][1]).toLowerCase()}.`, `HQ: the front is stuck. There is a chance — ${this.L(this.OPN[op.kind][0], this.OPN[op.kind][1]).toLowerCase()}.`), 2, 30, true);
    feed('⚑ ' + this.L('Штаб: фронт встал — есть операция', 'HQ: the front is stuck — an op is available'), '#ffd27a');
    return op;
  },
  opEffect(op){ return op.kind === 'gen' ? this.L('турели врага молчат 2 мин', 'enemy turrets silent for 2 min') : this.L('карта врага видна 60 с', 'enemy map revealed for 60 s'); },
  opActors(op){
    const A = [];
    if (op.g && groupAlive(op.g)) for (const u of groupUnits(op.g)) if (u.alive) A.push(u);
    if (op.team === 0 && !S.attract){ const f = this.focus(); if (f) A.push(f); }
    return A;
  },
  opStep(op, T){
    if (op.g && groupAlive(op.g) && (!op.g.goal || dist(op.g.goal, op.pos) > 12) && S.time - (op.reT || 0) > 8){ op.reT = S.time; setOrder(op.g, 'move', op.pos, { lock: 60 }); }
    const R = op.kind === 'gen' ? 7 : 9;
    const near = this.opActors(op).some(u => dist(u.pos, op.pos) < R);
    const foes = enemiesNear(op.team, op.pos, 12, e => e.cls === 'inf' || e.cls === 'tank').length;
    op.busy = near && foes > 0;
    if (near && !foes) op.prog += T;
    if (op.kind === 'gen' && random() < 0.5) addLight(add(op.pos, mul(norm(op.pos), 2)), op.team === 0 ? [3, 6, 12] : [12, 4, 2], 14, 0.4, 0.2);
    if (op.prog >= op.need){ this.opApply(op); return 'ok'; }
    if (S.time - op.t0 > op.T) return 'fail';
    if (op.team !== 0 || S.attract){ if (!op.g || !groupAlive(op.g)) return 'fail'; }
    return null;
  },
  opApply(op){
    const t = op.team, foe = op.foe;
    if (op.kind === 'gen'){
      let n = 0; for (const b of S.buildings) if (b.alive && b.team === foe && b.type === 'turret'){ b.off89 = S.time + 120; n++; }
      fxExplosion(op.pos, 2.6); burst(op.pos, 14, 10, 0.6); this.stats.off += n;
    } else {
      S.scans.push({ team: t, pos: mul(BASES[foe], RM + 10), t: 0, life: 60, r: 2200, op89: 1 }); this.stats.scans++;
      burst(op.pos, 8, 6, 0.5);
    }
    this.cpT = S.time; this.opNext[t] = S.time + 240;
    if (S.attract) return;
    if (t === 0){
      feed((op.kind === 'gen' ? '⚡ ' + this.L('Генератор подорван', 'Generator destroyed') : '📡 ' + this.L('Ретранслятор наш', 'Relay captured')) + ': ' + this.opEffect(op), '#8fffaa');
      VOX.radio('op89ok', op.kind === 'gen' ? this.L('Генератор врага подорван! Их турели молчат две минуты.', 'Enemy generator down! Their turrets are silent for two minutes.') : this.L('Ретранслятор наш! Вся карта врага на минуту видна.', 'The relay is ours! The whole enemy map is visible for a minute.'), 2, 5, true);
    } else {
      feed('⚠ ' + (op.kind === 'gen' ? this.L('Диверсия врага: наши турели молчат 2 мин', 'Enemy sabotage: our turrets are down for 2 min') : this.L('Враг взял ретранслятор: видит нас 60 с', 'Enemy took the relay: they see us for 60 s')), '#f88');
      VOX.radio('op89bad', op.kind === 'gen' ? this.L('Диверсия! Наши турели обесточены на две минуты.', 'Sabotage! Our turrets are without power for two minutes.') : this.L('Враг взял ретранслятор — он видит всю нашу карту.', 'The enemy took the relay — they see our whole map.'), 2, 5, true);
    }
  },
  // ИИ-сторона тоже ломает фронт (в обычном бою — только Рой против игрока, в бою ботов — обе стороны)
  aiStep(t, T){
    const op = this.ai[t];
    if (op){
      const r = this.opStep(op, T);
      if (r){ this.ai[t] = null; if (r === 'ok') this.stats.aiOk[t]++; else this.opNext[t] = S.time + 150; if (this.warn === op) this.warn = null; }
      return;
    }
    if (!S.teams[t] || !S.teams[t].ai || S.over) return;
    if (t === 0 && !S.attract) return;
    if (!S.attract && (!this.live() || this.lesson())) return;
    if (!this.stalled(t, t === 1 && !S.attract ? 45 : 0) || S.time < this.opNext[t]) return;
    if (random() > 0.25){ this.opNext[t] = S.time + 10; return; }
    this.aiStart(t);
  },
  aiStart(t, kind){
    const op = this.makeOp(t, kind);
    const g = S.squads.filter(s => s.team === t && groupAlive(s) && leaderOf(s) && s !== playerGroup()).sort((a, b) => surfDist(leaderOf(a).pos, op.pos) - surfDist(leaderOf(b).pos, op.pos))[0];
    if (!g){ this.opNext[t] = S.time + 60; return null; }
    op.g = g; op.reT = S.time; setOrder(g, 'move', op.pos, { lock: 60 });
    this.ai[t] = op; this.stats.ai[t]++; this.opNext[t] = S.time + 240;
    if (t === 1 && !S.attract){
      this.warn = op;
      feed('⚠ ' + (op.kind === 'gen' ? this.L('Разведка: враг идёт взорвать наш генератор', 'Intel: the enemy is going for our generator') : this.L('Разведка: враг идёт к ретранслятору', 'Intel: the enemy is heading for the relay')), '#f88');
      VOX.radio('op89ai', op.kind === 'gen' ? this.L(`Внимание! Диверсанты врага идут к нашему генератору, ${relDirWord(op.pos)}. Перехватите!`, `Warning! Enemy saboteurs are heading for our generator, ${relDirWord(op.pos)}. Intercept!`) : this.L(`Внимание! Враг идёт захватить ретранслятор, ${relDirWord(op.pos)}. Не дайте!`, `Warning! The enemy is going to capture the relay, ${relDirWord(op.pos)}. Stop them!`), 2, 20, true);
    }
    return op;
  },
  // ================================================================ предложение (Y/N) и ход активного задания
  ask(item, sec){ this.offer = { item, until: S.rtime + (sec || 15) }; this.sig = ''; },
  answer(yes, timeout){
    const o = this.offer; if (!o) return;
    this.offer = null; this.sig = '';
    const q = o.item;
    if (q.type === 'seat'){
      if (yes && q.g && q.g.alive && typeof V74 !== 'undefined' && S.me && S.me.cls === 'inf' && dist(S.me.pos, q.g.pos) < 70){ V74.mount(q.g); this.rw('seat'); }
      return;
    }
    if (!yes){
      if (q.type === 'op'){ this.stats.opNo++; this.opNext[0] = S.time + 180; } else { this.stats.questNo++; this.nextQuest = S.time + 240 + random() * 120; }
      if (!timeout) feed(this.L('Отказ принят', 'Declined'), '#aaa');
      return;
    }
    q.t0 = S.time; this.cur = q;
    if (q.type === 'op'){
      const m = this.mode();
      if (m === 'rts' || m === 'cmd'){
        let g = m === 'cmd' && typeof CMD85 !== 'undefined' && isSquad(CMD85.g) && groupAlive(CMD85.g) ? CMD85.g : null;
        if (!g && typeof selGroups === 'function') g = selGroups().find(x => isSquad(x));
        if (!g) g = S.squads.filter(s => s.team === 0 && groupAlive(s) && leaderOf(s)).sort((a, b) => surfDist(leaderOf(a).pos, q.pos) - surfDist(leaderOf(b).pos, q.pos))[0];
        if (g){ q.g = g; q.reT = S.time; setOrder(g, 'move', q.pos, { lock: 60, by: 'player' }); if (typeof makeManual66 === 'function' && m === 'rts') makeManual66(g); }
        feed('⚑ ' + this.L('Операция выдана', 'Op assigned') + (g ? ': ' + groupLabel(g) : ''), '#ffd27a');
      } else feed('⚑ ' + this.L('Операция принята — к метке', 'Op accepted — go to the marker'), '#ffd27a');
    } else if (q.kind === 'pilot'){
      const gd = this.spotNear(q.pos, 12, 18);
      const sq = spawnSquad(1, false, surfacePoint(gd, 0.5), 2); q.guard = sq;
      setOrder(sq, 'hold', surfacePoint(gd, 0.5), { lock: 300 });
      feed('★ ' + this.L('Квест принят', 'Quest accepted') + ': ' + this.qTitle(q), '#ffd27a');
    } else feed('★ ' + this.L('Квест принят', 'Quest accepted') + ': ' + this.qTitle(q), '#ffd27a');
  },
  curStep(T){
    const q = this.cur; let r = null;
    if (q.type === 'req') r = this.reqStep(q, T);
    else if (q.type === 'quest') r = this.questStep(q, T);
    else if (q.type === 'op') r = this.opStep(q, T);
    if (!r) return;
    this.cur = null; this.sig = '';
    if (q.type === 'req'){ this.nextReq = S.time + 120 + random() * 120; if (r === 'ok') this.stats.reqOk++; else this.stats.reqFail++; }
    if (q.type === 'quest'){ this.nextQuest = S.time + 300 + random() * 120; if (r === 'ok') this.stats.questOk++; else feed(this.L('Квест провален', 'Quest failed'), '#aaa'); if (q.guard) for (const u of q.guard.units) u.manualUntil = 0; q.guard && (q.guard.manualUntil = 0); }
    if (q.type === 'op'){ if (r === 'ok') this.stats.opOk++; else { this.opNext[0] = S.time + 150; feed(this.L('Операция сорвана', 'Op failed'), '#aaa'); } }
    if (r === 'ok') emit('objdone', { text: q.type === 'req' ? this.L('Помощь оказана', 'Help delivered') : this.L('Выполнено', 'Complete') });
  },
  reqStep(q, T){
    const p = this.reqPos(q);
    if (!p || !groupAlive(q.g)) return 'fail';
    if (S.time - q.t0 > q.T){ return 'fail'; }
    const f = this.focus(); if (f && dist(f.pos, p) < 80) q.near = 1;
    q.foes = q.foes.filter(e => e.alive).concat(this.foesAt(p, 45).filter(e => !q.foes.includes(e)));
    if (q.foes.length || !q.near) return null;
    // помог
    PROG.award(90, this.L('помощь своим', 'helping your own'), 1, '#ffcf6a');
    const thx = { buggy: this.L('спасибо, выручил!', 'thanks, you saved us!'), eng: this.L('спасибо, достраиваю!', 'thanks, back to building!'), pinned: this.L('спасибо, мы в долгу!', 'thanks, we owe you!') }[q.kind];
    VOX.radio('thx89', q.who + ': ' + thx, 1, 5, true);
    if (q.rw === 'seat' && q.g.alive && S.me && S.me.cls === 'inf' && this.mode() === 'fps'){
      feed('✋ ' + q.who + ': ' + this.L('садись на второе орудие — прокатимся', 'take the second gun — let us ride'), '#ffcf6a');
      this.ask({ type: 'seat', g: q.g, who: q.who }, 12);
    } else this.rw(q.rw, q);
    return 'ok';
  },
  questStep(q, T){
    if (S.time - q.t0 > q.T) return 'fail';
    const f = this.focus(), A = this.opActors({ team: 0, g: null });
    if (q.kind === 'radar'){
      if (!q.b.alive){ this.rwCmd(3); S.teams[0].ore += 150; feed('★ ' + this.heroName('syc') + ': ' + this.L('радар снесён! +3 КО, +150 руды', 'radar down! +3 CP, +150 ore'), '#ffd27a'); this.awardQ(); return 'ok'; }
      return null;
    }
    if (q.kind === 'crystal'){
      if (!q.ph){
        if (A.some(u => dist(u.pos, q.a.pos) < q.a.r + 6)) q.prog += T;
        if (q.prog >= 2){ q.ph = 1; q.prog = 0; this.sig = ''; burst(q.a.pos, 10, 6, 0.6); feed('◈ ' + this.L('Кристалл у тебя — неси к базе или своей точке', 'You have the crystal — carry it to the base or your point'), '#7dffb0'); }
        return null;
      }
      if (!f) return null;
      const d = this.dropoff(f.pos);
      if (d && dist(f.pos, d) < 28){
        if (typeof A78 !== 'undefined' && A78.on && A78.AK){ const ks = Object.keys(A78.AK); A78.pick(ks[floor(random() * ks.length)]); } else PROG.giveReward();
        this.rwCmd(2); feed('★ ' + this.heroName('lev') + ': ' + this.L('вот это кристалл! Держи артефакт и +2 КО', 'what a crystal! Here is an artifact and +2 CP'), '#ffd27a'); this.awardQ(); return 'ok';
      }
      return null;
    }
    // pilot
    if (random() < 0.5) addLight(add(q.pos, mul(norm(q.pos), 1.5)), [12, 3, 1], 12, 0.4, 0.3);
    if (random() < 0.12) S.fx.push({ type: 'smoke', pos: add(q.pos, mul(norm(q.pos), 1)), vel: mul(norm(q.pos), 2), r0: 0.6, r1: 3, life: 3, t: 0, grey: 0.15, dens: 0.6, heat: 0.2 });
    const near = A.some(u => dist(u.pos, q.pos) < 7);
    const foes = enemiesNear(0, q.pos, 16, e => e.cls === 'inf').length;
    q.busy = near && foes > 0;
    if (near && !foes) q.prog += T;
    if (q.prog >= 3){
      const sq = this.mySquad(); let u = null;
      if (sq && sq.units.length < 6){ u = addToSquad(sq, q.pos); u.vel = mul(norm(u.pos), 2); }
      this.rwCmd(2); S.teams[0].ore += 100;
      feed('★ ' + this.L(`Пилот «${q.name}» спасён${u ? ' — теперь в твоём отряде' : ''}`, `Pilot "${q.name}" rescued${u ? ' — he joins your squad' : ''}`), '#ffd27a');
      VOX.radio('pil89', this.L('Спасибо, братцы! Беру винтовку — я с вами.', 'Thanks, guys! Grabbing a rifle — I am with you.'), 1, 5, true);
      this.awardQ(); return 'ok';
    }
    return null;
  },
  awardQ(){ PROG.award(160, this.L('квест героя', 'hero quest'), 1, '#ffd27a'); },
  // ================================================================ награды
  rwCmd(n){ const T = S.teams[0]; T.cmd = min(GAME.CMD_MAX, T.cmd + n); },
  rw(k, q){
    this.stats.rewards[k] = (this.stats.rewards[k] || 0) + 1;
    const who = q ? q.who + ': ' : '';
    if (k === 'gun'){
      const K = S.kit, c = S.me;
      if (K && WEAPONS.hmg){ K.hmgT = max(K.hmgT || 0, 90); K.mag.hmg = WEAPONS.hmg.mag; K.w = 'hmg'; K.reloadT = 0; emit('wswitch', {}); }
      if (K) for (const w in WEAPONS) if (WEAPONS[w].mag && K.mag) K.mag[w] = WEAPONS[w].mag;
      if (typeof G62 !== 'undefined') this.safe(() => { const G = G62.kit(); G.gren = max(G.gren || 0, G62.MAX || 3); }, 'gren');
      feed('🎁 ' + who + this.L('держи ствол из кузова — пулемёт 90 с', 'here, a gun from the trunk — MG for 90 s'), '#ffd27a');
      emit('reward', { text: this.rwName(k) });
    } else if (k === 'seat'){
      emit('reward', { text: this.rwName(k) });
    } else if (k === 'pod'){
      const sq = this.mySquad();
      if (!sq || !this.launchSoldier(sq, 0)) return this.rw('cmd', q);
      feed('🚀 ' + who + this.L('с базы летит капсула — боец в твой отряд', 'a pod is launched from the base — a trooper for your squad'), '#ffd27a');
    } else if (k === 'sat'){
      this.cover = { until: S.time + 20, nextT: S.time + 1 };
      feed('🛰 ' + who + this.L('спутник прикроет тебя 20 с', 'a satellite will cover you for 20 s'), '#ffd27a');
    } else {
      this.rwCmd(2); feed('🎁 ' + who + this.L('штабу +2 КО', '+2 CP for HQ'), '#ffd27a');
    }
  },
  launchSoldier(sq, team){
    const Lg = leaderOf(sq); if (!Lg) return false;
    if (typeof LCH87 !== 'undefined' && LCH87.on && !LCH87.src(team)) return false;
    const up0 = norm(Lg.pos), d = this.spotNear(up0, 5, 9);
    const land = surfacePoint(d, 0.5), up = norm(land), from = add(land, mul(up, 230));
    S.pods.push({ team, from, to: land, pos: from, t: 0, dur: 2.6, by: 'v89', v89: { sq } });
    emit('podincoming', { team, pos: land }); this.stats.pods++;
    return true;
  },
  podStep(p, dt, ps0, self, args){
    const V = p.v89;
    if (typeof LCH87 !== 'undefined' && LCH87.on && (!V.init || (p.v87 && p.v87.ph === 'up'))){
      V.init = 1; p.by = 'cap70'; ps0.apply(self, args); p.by = 'v89'; return null;   // пуск с площадки и полёт через небо — v8.7
    }
    p.t += dt;
    const k = clamp(p.t / p.dur, 0, 1), e = k * k;
    p.pos = add(mul(p.from, 1 - e), mul(p.to, e));
    if (random() < 0.7) S.fx.push({ type: 'fire', pos: p.pos, r0: 0.7, r1: 1.8, life: 0.3, t: 0, inten: 0.8 });
    addLight(p.pos, [6, 3, 1.2], 22, 0.05, 0.01);
    if (k < 1) return null;
    fxExplosion(p.to, 1.6); p.done = true;
    const sq = V.sq;
    if (sq && groupAlive(sq) && sq.units.length < 6){
      const u = addToSquad(sq, p.to); u.vel = add(mul(norm(u.pos), 3), mul(randUnit(), 1.5)); this.stats.landed++;
      if (p.team === 0 && !S.attract) feed('☄ ' + this.L(`Капсула с базы: ${callsign(u)} в отряде`, `Pod from the base: ${callsign(u)} joins the squad`), TEAM[0].css);
    }
    return null;
  },
  coverStep(){
    const C = this.cover; if (!C) return;
    if (S.time > C.until || S.attract){ this.cover = null; return; }
    if (S.time < C.nextT) return;
    C.nextT = S.time + 2.5;
    const f = this.focus() || (this.mySquad() && leaderOf(this.mySquad())); if (!f) return;
    const e = this.foesAt(f.pos, 60).filter(x => dist(x.pos, f.pos) > 7).sort((a, b) => dist(a.pos, f.pos) - dist(b.pos, f.pos))[0];
    if (!e) return;
    S.strikes.push({ type: 'arty', team: 0, pos: e.pos.slice(), t: 0, delay: 0.5, n: 1, every: 0.3, fired: 0, r: 1.5, dmg: 110, splash: 5, src: null, by: 'v89' });
    addLight(add(e.pos, mul(norm(e.pos), 30)), [4, 8, 14], 40, 0.3, 0.4);
  },
  // ================================================================ подсказка (одна, один раз)
  tip(){
    if (typeof HINTS === 'undefined' || (HINTS.cur && HINTS.cur.until > S.rtime)) return;
    const t = this.ph() ? this.L('Живой мир: свои просят помощи, герои дают квесты. Карточка справа — ✕ убрать.', 'Living world: your units ask for help, heroes give quests. Card on the right — ✕ to dismiss.')
      : this.L('Живой мир: свои просят помощи, герои дают квесты. Y — принять, N — отказ.', 'Living world: your units ask for help, heroes give quests. Y — accept, N — decline.');
    HINTS.show('live89', t, [], null);
  },
  // ================================================================ карточка
  item(){ return this.offer ? this.offer.item : this.cur || this.warn; },
  target(q){
    if (!q) return null;
    if (q.type === 'req') return this.reqPos(q);
    if (q.type === 'op') return q.pos;
    if (q.type === 'seat') return q.g && q.g.alive ? q.g.pos : null;
    if (q.kind === 'radar') return q.b.alive ? bldCenter(q.b) : null;
    if (q.kind === 'crystal'){ if (!q.ph) return q.a.pos; const f = this.focus(); return f ? this.dropoff(f.pos) : null; }
    return q.pos;
  },
  cardHTML(){
    const O = this.offer, q = this.item(); if (!q) return '';
    const L = this.L, ph = this.ph(), m = this.mode();
    const p = this.target(q), d = p ? this.dTxt(p) : '';
    let head = '', title = '', sub = '', cls = '', btn = '';
    if (q.type === 'req'){
      cls = 'req'; head = L('ПРОСЬБА', 'REQUEST') + ' · ' + this.mmss(q.T - (S.time - q.t0));
      title = `${q.who}: ${this.reqTitle(q)}`;
      sub = `${d} · ${L('врагов', 'foes')} ${q.foes.length} · ${L('награда', 'reward')}: ${this.rwName(q.rw)}`;
    } else if (q.type === 'seat'){
      cls = 'req'; head = L('ПРИГЛАШЕНИЕ', 'INVITE'); title = `${q.who}: ${L('второе орудие свободно', 'the second gun is free')}`; sub = L('сесть стрелком — машину ведёт ИИ', 'ride as the gunner — the AI drives');
    } else if (q.type === 'quest'){
      cls = 'quest'; head = `${L('КВЕСТ', 'QUEST')} · ★ ${this.heroName(q.hero)}, ${L(this.HERO[q.hero][2], this.HERO[q.hero][3])}`;
      title = this.qTitle(q);
      sub = `${d}${O ? '' : ' · ' + this.mmss(q.T - (S.time - q.t0))}${q.busy ? ' · ' + L('враги рядом', 'foes near') : q.prog > 0 && !q.ph && q.kind !== 'radar' ? ' · ' + Math.round(min(1, q.prog / (q.kind === 'crystal' ? 2 : 3)) * 100) + '%' : ''} · ${this.qReward(q)}`;
    } else if (q.type === 'op'){
      const mine = q.team === 0;
      cls = mine ? 'op' : 'warn';
      head = mine ? `${L('ВАЖНО', 'IMPORTANT')} · ${L('ПЕРЕЛОМ БОЯ', 'BREAKTHROUGH')}` : `⚠ ${L('ДИВЕРСИЯ ВРАГА', 'ENEMY SABOTAGE')}`;
      title = mine ? L(this.OPN[q.kind][0], this.OPN[q.kind][1]) : (q.kind === 'gen' ? L('Враг идёт к нашему генератору', 'The enemy is going for our generator') : L('Враг идёт к ретранслятору', 'The enemy is heading for the relay'));
      const pr = Math.round(min(1, q.prog / q.need) * 100);
      sub = `${d}${O ? '' : ' · ' + this.mmss(q.T - (S.time - q.t0)) + ' · ' + pr + '%'}${q.busy ? ' · ' + L('враги рядом', 'foes near') : ''}${q.g && mine ? ' · ' + groupLabel(q.g) : ''} · ${mine ? this.opEffect(q) : L('перехвати их', 'intercept them')}`;
    }
    if (O){
      const yes = q.type === 'op' && m === 'rts' ? L('Выдать отряду', 'Assign a squad') : q.type === 'seat' ? L('Сесть', 'Get on') : L('Принять', 'Accept');
      btn = `<div class="b89"><button data-a89="y">${ph ? '' : '<kbd>Y</kbd> '}${yes}</button><button data-a89="n">${ph ? '' : '<kbd>N</kbd> '}${L('Нет', 'No')}</button><i>${Math.max(0, Math.ceil(O.until - S.rtime))}</i></div>`;
    }
    const x = !O && q.type !== 'op' ? '<button class="x89" data-a89="x">✕</button>' : '';
    sub = sub.split(' · ').filter(t => t.trim()).join(' · ');
    return `<div class="c89 ${cls}${O ? ' ask' : ''}"><small>${head}</small>${x}<b>${title}</b><em>${sub}</em>${btn}</div>`;
  },
  hideCard(){ if (this.el) this.el.style.display = 'none'; },
  frame(){
    const now = performance.now();
    if (now - this.uiT < 150) return; this.uiT = now;
    const show = this.on && !S.attract && !MENU.isOpen() && (this.live() || this.lesson()) && !(S.mode === 'fps' && SET.clean88) && (!this.tut() || this.lesson());
    const h = show ? this.cardHTML() : '';
    let el = this.el;
    if (!h){ if (el && el.style.display !== 'none') el.style.display = 'none'; return; }
    if (!el){
      el = this.el = document.createElement('div'); el.id = 'c89'; document.body.appendChild(el);
      const go = e => { const b = e.target.closest && e.target.closest('[data-a89]'); if (!b) return; e.preventDefault(); e.stopPropagation();
        if (e.type === 'click' && performance.now() - (el._t || -1e9) < 700) return; if (e.type === 'touchstart') el._t = performance.now();
        if (typeof AU !== 'undefined') AU.init();
        const a = b.dataset.a89; if (a === 'x') this.dismiss(); else this.answer(a === 'y'); this.uiT = 0; this.frame(); };
      el.addEventListener('touchstart', go, { passive: false }); el.addEventListener('click', go);
      el.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('[data-a89]')) e.stopPropagation(); });
    }
    if (el.style.display !== 'block') el.style.display = 'block';
    if (el._h !== h){ el._h = h; el.innerHTML = h; }
    // в уроке панель шага сверху — карточка под ней
    let top = '';
    if (this.lesson()){ const P = $('t72p'); if (P && P.style.display !== 'none'){ const r = P.getBoundingClientRect(); if (r.height) top = Math.round(r.bottom + 6) + 'px'; } }
    if (el.style.top !== top) el.style.top = top;
    const sq = $('sq'); if (sq && sq.style.display !== 'none') sq.style.display = 'none';
  },
  dismiss(){
    const q = this.cur;
    if (q && q.type === 'req'){ this.cur = null; this.nextReq = S.time + 150 + random() * 90; feed(this.L('Просьба пропущена', 'Request skipped'), '#aaa'); }
    else if (q && q.type === 'quest'){ this.cur = null; this.nextQuest = S.time + 300; feed(this.L('Квест отменён', 'Quest dropped'), '#aaa'); }
    else if (this.warn && !q) this.warn = null;
  },
  key(e){
    if (!this.offer || e.repeat || MENU.isOpen() || !(this.live() || this.lesson())) return false;
    if (e.code === 'KeyY' || e.code === 'KeyN'){ this.answer(e.code === 'KeyY'); this.uiT = 0; return true; }
    return false;
  },
  // ================================================================ поверх кадра: маркеры, имена героев
  overlay(){
    if (S.attract || !this.on || !S.cam) return;
    if (S.mode === 'fps' && SET.clean88) return;
    const q = this.item();
    const p = this.target(q);
    if (p && (this.live() || this.lesson())){
      const col = !q ? '#fff' : q.type === 'req' || q.type === 'seat' ? '#ffcf6a' : q.type === 'quest' ? '#ffd27a' : q.team === 0 ? '#8fffaa' : '#ff6a5a';
      const lab = !q ? '' : q.type === 'req' ? '✋ ' + this.L('ПОМОЩЬ', 'HELP') : q.type === 'seat' ? '✋' : q.type === 'quest' ? '★ ' + this.L('КВЕСТ', 'QUEST')
        : q.team === 0 ? (q.kind === 'gen' ? '⚡ ' + this.L('ГЕНЕРАТОР', 'GENERATOR') : '📡 ' + this.L('РЕТРАНСЛЯТОР', 'RELAY')) : '⚠ ' + this.L('ДИВЕРСИЯ', 'SABOTAGE');
      const f = this.focus();
      edgeMarker(p, col, lab, f ? Math.round(surfDist(p, f.pos)) + ' ' + tr('м', 'm', 'm') : '');
    }
    if (this.warn && this.warn !== q && this.warn.pos) edgeMarker(this.warn.pos, '#ff6a5a', '⚠', '');
    if (S.mode !== 'fps') return;
    const c = ctrlEntity(); if (!c) return;
    octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", sans-serif';
    for (const id in this.heroes){
      const u = this.heroes[id]; if (!u || !u.alive || u === c || dist(u.pos, c.pos) > 90) continue;
      const s = project(add(u.pos, mul(u.up || norm(u.pos), 2.7))); if (!s || s[2] <= 0) continue;
      octx.fillStyle = 'rgba(0,0,0,.55)'; octx.fillText('★ ' + this.heroName(id), s[0] + 1, s[1] + 1);
      octx.fillStyle = '#ffd27a'; octx.fillText('★ ' + this.heroName(id), s[0], s[1]);
    }
  },
};
// ---------------------------------------------------------------- хуки
{ const up0 = update; update = function(rdt){ up0.apply(this, arguments); LIVE89.safe(() => LIVE89.step(rdt), 'step'); }; }
{ const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); LIVE89.safe(() => LIVE89.reset(), 'reset'); return r; }; }
{ const ps0 = podStep; podStep = function(p, dt){ if (p && p.v89) { const r = LIVE89.safe(() => LIVE89.podStep(p, dt, ps0, this, arguments), 'pod'); if (r === undefined && !p.done && LIVE89.err.pod) p.done = true; return null; } return ps0.apply(this, arguments); }; }
{ const ts0 = turretStep; turretStep = function(b, dt, pin){
    if (b && b.off89 > S.time && S.me !== b){ if (random() < dt * 1.5) burst(gunPos(b), 3, 4, 0.3); return; }
    return ts0.apply(this, arguments); }; }
if (typeof SIDEQ !== 'undefined'){ const of0 = SIDEQ.offer; SIDEQ.offer = function(){ if (LIVE89.cur || LIVE89.offer){ this.nextT = S.time + 30; return; } return of0.apply(this, arguments); }; }
{ const uf0 = uixFrame; uixFrame = function(){ const r = uf0.apply(this, arguments); LIVE89.safe(() => LIVE89.frame(), 'frame'); return r; }; }
{ const do0 = drawOverlay; drawOverlay = function(){ const r = do0.apply(this, arguments); LIVE89.safe(() => LIVE89.overlay(), 'ov'); return r; }; }
{ const dr0 = drawRTSOverlay; drawRTSOverlay = function(){ const r = dr0.apply(this, arguments); LIVE89.safe(() => LIVE89.overlay(), 'ovr'); return r; }; }
addEventListener('keydown', e => { if (LIVE89.safe(() => LIVE89.key(e), 'key')){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
// Настройки: «Живой мир»
{ const lab = () => LIVE89.L('Живой мир: просьбы своих, квесты героев, перелом боя', 'Living world: requests, hero quests, breakthrough ops');
  const hs0 = MENU.html_settings; MENU.html_settings = function(){
    const h = hs0.apply(this, arguments); if (typeof V74 === 'undefined') return h;
    const re = /(<button class="tog[^"]*" data-p74tog="clean88">[^<]*<\/button><\/div>)/;
    return re.test(h) ? h.replace(re, '$1' + V74.togBtn('live89', lab(), false)) : h; };
  if (typeof P71M !== 'undefined' && P71M.sec){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_game' && typeof V74 !== 'undefined') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + V74.togBtn('live89', lab(), true)); return h; }; } }
// номер версии
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.9'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.9'; }
// ---------------------------------------------------------------- стили: место карточки — как у побочной задачи (#sq), центр свободен
(function(){ const st = document.createElement('style'); st.id = 'live89css'; st.textContent = `
  #c89{position:fixed;left:50%;top:126px;transform:translateX(-50%);z-index:15;display:none;pointer-events:none;max-width:min(40vw,460px);min-width:240px}
  #c89 .c89{position:relative;padding:3px 14px 5px;text-align:center;border-radius:8px;background:linear-gradient(180deg,rgba(46,32,6,.88),rgba(30,20,6,.76));border:1px solid rgba(255,207,106,.55);color:#f2e6c8;font:500 12px/1.3 "Exo 2",sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.4)}
  #c89 .c89.quest{border-color:rgba(255,210,122,.75)} #c89 .c89.op{background:linear-gradient(180deg,rgba(10,40,24,.9),rgba(8,26,16,.78));border-color:rgba(143,255,170,.7)}
  #c89 .c89.warn{background:linear-gradient(180deg,rgba(60,12,10,.9),rgba(36,10,8,.78));border-color:rgba(255,106,90,.7)}
  #c89 small{display:block;font:700 9.5px "Exo 2";letter-spacing:.14em;color:#ffcf6a;text-transform:uppercase;opacity:.9} #c89 .op small{color:#8fffaa} #c89 .warn small{color:#ff8a7a}
  #c89 b{display:block;font:700 13px/1.25 "Exo 2";color:#fff3d6;margin:1px 0} #c89 em{display:block;font-style:normal;font-size:11px;opacity:.85}
  #c89 .b89{display:flex;gap:6px;justify-content:center;align-items:center;margin-top:4px}
  #c89 button{pointer-events:auto;cursor:pointer;font:600 12px "Exo 2",sans-serif;color:#fff3d6;background:rgba(255,255,255,.08);border:1px solid rgba(255,207,106,.5);border-radius:6px;padding:2px 10px}
  #c89 button[data-a89="y"]{border-color:#8fffaa;color:#c9ffd6} #c89 button:hover{background:rgba(255,255,255,.18)}
  #c89 .b89 i{font-style:normal;font-size:10px;opacity:.6;min-width:14px}
  #c89 kbd{font:700 10px "Exo 2";padding:0 4px;border-radius:3px;background:rgba(255,255,255,.14);color:#ffd27a}
  #c89 .x89{all:unset;pointer-events:auto;cursor:pointer;position:absolute;right:4px;top:2px;color:#b9b19a;font:700 12px "Exo 2";padding:1px 5px}
  body:not(.fps88):not(.touch) #c89{top:64px}
  body.rtsm:not(.touch) #c89{top:166px;left:auto;right:calc(var(--sideW,244px) + 14px);transform:none;max-width:360px}
  body.touch #c89{left:auto;right:calc(var(--sr,0px) + 62px);top:calc(var(--st,0px) + 102px);transform:none;max-width:36vw;min-width:200px}
  body.touch #c89 .c89{font-size:11px;padding:3px 10px 5px} body.touch #c89 b{font-size:12px}
  body.touch #c89 button{padding:6px 14px;font-size:13px;min-height:34px} body.touch #c89 .x89{padding:4px 8px;font-size:15px}
  @media (orientation:portrait){ body.touch #c89{right:8px;left:auto;top:calc(var(--st,0px) + 192px);max-width:calc(100vw - 110px)} }
  body.clean88 #c89, body.f76intro #c89{display:none!important}
`; document.head.appendChild(st); })();
