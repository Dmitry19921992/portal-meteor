// =====================================================================
//  v8.2 — РОЙ: ТУННЕЛИ (TUN82) И РЕГЕНЕРАЦИЯ (REG82)
//  Туннель: инженер строит «Нору-туннель» на своей территории → в панели норы «Прорыть выход» → точка до 220 м
//  (ЛКМ / тап) → 24 с подкопа; за 10 с до прорыва у выхода пыль, дрожь земли и гул — враг предупреждён (окно на ответ).
//  Прорыв: яма в рельефе (воронка-«пин» CR76: та же формула SDF, что и у воронок, в JS и в шейдере — её не вытесняют)
//  и «Выход туннеля» — разрушаемое здание. Отряды: выделить → «В туннель» в карточке / ПКМ по норе, или «Отряды — в туннель»
//  (берёт отряды в 70 м от норы). Бойцы ныряют в зев, ~2.5 с под землёй (невидимы и неуязвимы), выходят у выхода.
//  Игрок в шутере сам может зайти в зев — выйдет на другом конце (и обратно).
//  Разрушен выход — туннель обвалился (можно прорыть заново); разрушена нора — обваливается всё.
//  ИИ Роя: строит нору с 4:00, роет выход во фланг ближайшей цели врага, время от времени посылает туда отряды.
//  ИИ любой стороны, услышав подкоп, шлёт свободную группу к месту прорыва.
//  Регенерация: пехота и дроны Роя вне боя (5 с без урона) лечатся на 4 % в секунду, тонкие искры (REG82.DELAY / RATE).
//  «Стая»: штурмовой отряд Роя на 8 % дешевле (REG82.SQ) — баланс по боям бот против бота.
// =====================================================================
const TUN82 = {
  MAXL: 220, MOUTH: 4.5, TRANS: 2.4, WARN: 10, prev: [], dustT: 0, aiT: [3, 5],
  stats: { dug: 0, opened: 0, sent: 0, through: 0, collapsed: 0, warn: 0, aiBuilt: 0, aiDig: 0, aiSend: 0, aiDef: 0, fps: 0 },
  list(t){ return S.buildings.filter(b => b.alive && b.team === t && b.type === 'tun82'); },
  st(b){ return b.t82 || (b.t82 = { st: 'idle', exitDir: null, exitId: 0, warned: 0 }); },
  byId(id){ for (const b of S.buildings) if (b.id === id && b.alive) return b; return null; },
  exitOf(b){ const s = this.st(b); return s.exitId ? this.byId(s.exitId) : null; },
  isOpen(b){ return !!(b && b.alive && b.done && b.type === 'tun82' && this.st(b).st === 'open' && this.exitOf(b)); },
  mouthDir(b){ return offsetOnSphere(b.up, b.fwd, this.MOUTH); },
  mouth(b){ const d = this.mouthDir(b); return mul(d, groundR(d) + 0.3); },
  // ---- ямы: воронки CR76 с флагом pin (не вытесняются, не сливаются)
  hole(dir){
    if (typeof CR76 === 'undefined' || !CR76.on) return;
    const g = groundR(dir), c = { p: mul(dir, g), rc: g, r: 3.2, D: 1.9, t: S.time, pin: 1 };
    CR76.L.unshift(c);
    for (let i = CR76.L.length - 1; i >= 0 && CR76.L.length > CR76.max(); i--) if (!CR76.L[i].pin) CR76.L.splice(i, 1);
    CR76.dirty(c);
  },
  unhole(dir){
    if (typeof CR76 === 'undefined' || !dir) return;
    for (const c of CR76.L) if (c.pin && dist(norm(c.p), dir) < 0.004){ c.pin = 0; c.D *= 0.45; c.t = S.time; CR76.dirty(c); }
  },
  // ---- выход: проверка точки
  exitProblem(b, dir){
    const m = this.mouthDir(b), d = surfDist(m, dir);
    if (d > this.MAXL) return T82(`Далеко: ${d | 0} м (можно до ${this.MAXL} м)`, `Too far: ${d | 0} m (max ${this.MAXL} m)`);
    if (d < 40) return T82('Слишком близко к норе', 'Too close to the burrow');
    if (typeof CR76 !== 'undefined' && !CR76.allowed(dir)) return T82('Здесь нельзя: штаб, точка захвата или скалы рядом', 'Not here: an HQ, a capture point or rocks nearby');
    if (typeof TER81 !== 'undefined' && TER81.ready && TER81.near(dir, 7)) return T82('Мешают скалы или озеро', 'Rocks or a lake in the way');
    if (groundR(dir) < RM - 20) return T82('Слишком глубоко', 'Too deep');
    for (const x of S.buildings) if (x.alive && surfDist(dir, x.up) < x.rad + 7) return T82('Место занято', 'Spot is taken');
    for (const a of AXES) if (surfDist(dir, a) < 25) return T82('Рядом шахта', 'A shaft is nearby');
    return null;
  },
  startDig(b, dir){
    const s = this.st(b); s.st = 'dig'; s.exitDir = dir; s.warned = 0;
    b.queue.push('tdig82'); this.stats.dug++;
  },
  // ---- прорыв
  open(b){
    const s = this.st(b), dir = s.exitDir;
    if (!dir || !b.alive){ s.st = 'idle'; return; }
    const fh = tangent(sub(dir, b.up), dir);
    const x = makeBuilding('tunx82', b.team, offsetOnSphere(dir, fh, -this.MOUTH), fh);
    x.built = 1; x.done = true; x.hp = x.maxhp; x.t82 = { ent: b.id };
    s.exitId = x.id; s.st = 'open'; s.warned = 0; this.stats.opened++;
    this.hole(dir);
    const g = groundR(dir), c = mul(dir, g + 0.6);
    fxExplosion(c, 2.6, true);
    for (let k = 0; k < (FAC82.low() ? 3 : 7); k++) fxSmoke(add(c, mul(randUnit(), 2.5)), 2.2 + random(), 0.55, 0.95);
    for (let k = 0; k < (FAC82.low() ? 8 : 24); k++) S.sparks.push({ pos: add(c, mul(randUnit(), 1.5)), vel: add(mul(dir, 6 + random() * 6), mul(randUnit(), 4)), life: 0.8 + random() * 0.6, big: k % 3 === 0 });
    addWave(c, 6, 0.8);
    if (S.cam && dist(S.cam.pos, c) < 90) S.shake = max(S.shake, 0.6);
    if (!S.attract){
      if (b.team === 0){ feed(TOUCH.on ? T82('Туннель прорыт! Выдели отряды → «В туннель» в карточке', 'Tunnel open! Select squads → "Into tunnel" on the card') : T82('Туннель прорыт! Выдели отряды → «В туннель» в карточке или ПКМ по норе', 'Tunnel open! Select squads → "Into tunnel" on the card or RMB the burrow'), TEAM[0].css); emit('radio', { text: T82('Туннель прорыт. Можно переходить', 'The tunnel is through. Ready to move'), pri: 1 });
        FAC82.tip('tunopen', 'Туннель открыт: выдели отряды и нажми «В туннель» в карточке. Выход можно разрушить — береги его.', 'Tunnel open: select squads and press "Into tunnel" on the card. The exit can be destroyed — guard it.'); }
      else { feed(T82('⚠ Рой прорвался из-под земли! Уничтожь «Выход туннеля»', '⚠ The Swarm broke through from underground! Destroy the "Tunnel exit"'), '#ff8a50'); pushAlert(c); }
    }
  },
  collapse(b, whole){
    const s = this.st(b); this.stats.collapsed++;
    const x = this.exitOf(b);
    if (x && whole){
      x.alive = false; S.buildings.splice(S.buildings.indexOf(x), 1); BLD_LIST = S.buildings; bgridDirty();
      if (S.selB === x) S.selB = null;
      fxSmoke(add(x.pos, mul(x.up, 1)), 3, 0.5, 0.9);
    }
    if (s.exitDir){ this.unhole(s.exitDir); fxSmoke(mul(s.exitDir, groundR(s.exitDir) + 1), 3, 0.5, 0.9); }
    if (whole) this.unhole(this.mouthDir(b));
    // кто был внутри — выбирается на уцелевшем конце, побитым; если концов нет — гибнет
    for (const u of S.units){
      if (!u.alive || !u.tun82 || u.tun82.b !== b.id) continue;
      damage(u, u.maxhp * 0.6, null, 'x');
      if (!u.alive) continue;
      if (!whole && b.alive) this.emerge(u, b); else { u.tun82 = null; damage(u, 9999, null, 'x'); }
    }
    if (!S.attract && b.team === 0) feed(T82('Туннель обвалился', 'The tunnel collapsed'), '#f88');
    if (!S.attract && b.team === 1) feed(T82('Туннель Роя обвалился', 'The Swarm tunnel collapsed'), TEAM[0].css);
    s.st = 'idle'; s.exitId = 0; s.exitDir = null; s.warned = 0;
  },
  // ---- отряды
  send(b, g, by, tgt){
    if (!this.isOpen(b) || !isSquad(g) || !groupAlive(g) || (g.order === 'sky' && g.sky) || g.team !== b.team) return false;
    const m = this.mouth(b);
    setOrder(g, 'move', m, { by: by === 'player' ? 'player' : 'ai', lock: by === 'player' ? 120 : 90, rush: true });
    g.t82 = { b: b.id, by: by || 'ai', tgt: tgt || null, t: S.time, inn: 0 };
    this.stats.sent++;
    return true;
  },
  enter(u, b, g){
    const md = this.mouthDir(b);
    u.tun82 = { b: b.id, g: g.id, until: S.time + this.TRANS + random() * 0.7 };
    u.vel = [0, 0, 0]; u.pos = mul(md, groundR(md) - 0.4); u.cd = max(u.cd, 9); u.rocketCd = max(u.rocketCd, 3);
    S.sel.delete(u);
    if (!g.t82.inn){ g.t82.inn = 1; g.t82.tin = S.time; } this.stats.through++;
    if (random() < 0.6) fxSmoke(add(u.pos, mul(md, 1.2)), 1.1, 0.55, 0.6);
  },
  emerge(u, at){
    const md = this.mouthDir(at), t1 = anyTangent(md), a = random() * PI * 2;
    const p = surfacePoint(offsetOnSphere(md, add(mul(t1, cos(a)), mul(cross(md, t1), sin(a))), 1.2 + random() * 3.2), RULES.RAD);
    u.pos = p; u.vel = add(mul(norm(p), 3.5), mul(at.fwd, 2)); u.grounded = false; u.cd = 0.4; u.tun82 = null;
    u.fwd = tangent(at.fwd, norm(p)); u.aim = u.fwd;
    if (random() < 0.7) fxSmoke(add(p, mul(norm(p), 0.5)), 1.2, 0.55, 0.7);
    S.sparks.push({ pos: p, vel: mul(norm(p), 5), life: 0.5 });
  },
  done(g, x){
    const t = g.t82; g.t82 = null; if (!x || !groupAlive(g)) return;
    const ahead = surfacePoint(offsetOnSphere(this.mouthDir(x), x.fwd, 14), 0.5);
    if (t.by === 'player'){
      setOrder(g, 'move', ahead, { by: 'player', lock: 120 });
      if (!S.attract) feed(T82(`${groupLabel(g)} вышел из туннеля`, `${groupLabel(g)} is out of the tunnel`), TEAM[0].css);
      return;
    }
    const tg = t.tgt;
    if (tg && tg.k === 'b'){ const e = this.byId(tg.id); if (e && e.team !== g.team){ setOrder(g, 'focus', centerOf(e), { focus: e, lock: 70 }); return; } }
    if (tg && tg.k === 'cp'){ const c = S.cps[tg.i]; if (c && c.owner !== g.team){ setOrder(g, 'cap', c.pos, { cp: c, lock: 70 }); return; } }
    if (tg && tg.k === 'hq' && S.hq[1 - g.team].alive){ setOrder(g, 'attack', S.hq[1 - g.team].pos, { lock: 70 }); return; }
    setOrder(g, 'move', ahead, { lock: 25 });
  },
  // ---- кадр
  step(dt){
    // гибель норы / выхода
    const cur = S.buildings.filter(b => b.alive && b.type === 'tun82');
    for (const b of this.prev) if (!b.alive && b.t82 && b.t82.st !== 'gone'){ this.collapse(b, true); b.t82.st = 'gone'; }
    this.prev = cur;
    for (const b of cur){ const s = this.st(b); if (s.st === 'open' && !this.exitOf(b)) this.collapse(b, false); }
    // подкоп: пыль и гул у будущего выхода
    this.dustT -= dt;
    const dust = this.dustT <= 0; if (dust) this.dustT = FAC82.low() ? 0.6 : 0.25;
    for (const b of cur){
      const s = this.st(b);
      if (b.queue[0] !== 'tdig82'){ if (s.st === 'dig' && !b.queue.includes('tdig82')) s.st = 'idle'; continue; }
      const left = (pTime(b.team, 'tdig82') - b.prodT) / (b.team === 1 ? DK().eco : 1);
      if (left > this.WARN || !s.exitDir) continue;
      if (!s.warned){ s.warned = 1; this.warn(b, s.exitDir); }
      if (dust){
        const g = groundR(s.exitDir), c = mul(s.exitDir, g + 0.4), k = 1 - left / this.WARN;
        fxSmoke(add(c, mul(randUnit(), 2.5 + k)), 0.9 + 1.4 * k, 0.6, 0.55 + 0.3 * k);
        for (let i = 0; i < (FAC82.low() ? 1 : 3); i++) S.sparks.push({ pos: add(c, mul(randUnit(), 2)), vel: add(mul(s.exitDir, 3 + random() * 3 * k), mul(randUnit(), 1.5)), life: 0.5 + random() * 0.4 });
        if (random() < 0.25) addWave(c, 2 + 3 * k, 0.6);
        if (S.cam && S.mode === 'fps' && dist(S.cam.pos, c) < 45) S.shake = max(S.shake, 0.12 + 0.25 * k);
      }
    }
    // отряды, идущие в туннель
    const me = ctrlEntity();
    for (const g of S.squads){
      const T = g.t82; if (!T) continue;
      const b = this.byId(T.b), inside = g.units.some(u => u.alive && u.tun82);
      if (!this.isOpen(b)){ if (!inside) g.t82 = null; continue; }
      const m = this.mouth(b);
      if (!inside && !T.inn && (g.order !== 'move' || !g.goal || dist(g.goal, m) > 9)){ g.t82 = null; continue; }   // игрок/ИИ передумал
      const P = T.P || (T.P = {});   // кто уже прошёл (выход может быть ближе 80 м ко входу — назад не ныряют)
      for (const u of g.units){
        if (!u.alive || u.tun82 || u === me || P[u.id]) continue;
        if (dist(u.pos, m) < 6.5 || (T.inn && dist(u.pos, m) < 80)){ this.enter(u, b, g); P[u.id] = 1; }   // первый нырнул — отряд за ним
      }
      const ins2 = g.units.some(u => u.alive && u.tun82);   // кто-то только что нырнул — ещё внутри
      if (ins2) continue;
      if (T.inn && !g.units.some(u => u.alive && !u.tun82 && u !== me && !P[u.id] && dist(u.pos, m) < 60)) this.done(g, this.exitOf(b));
      else if (T.inn && S.time - T.tin > 45) this.done(g, this.exitOf(b));
    }
    // под землёй: ждут и выходят
    for (const u of S.units){
      if (!u.alive || !u.tun82) continue;
      u.vel = [0, 0, 0]; u.cd = max(u.cd, 1); u.rocketCd = max(u.rocketCd, 1);
      if (S.time >= u.tun82.until){ const b = this.byId(u.tun82.b), x = b && this.exitOf(b); if (x) this.emerge(u, x); else if (b) this.emerge(u, b); else { u.tun82 = null; damage(u, 9999, null, 'x'); } }
    }
    // игрок в шутере: зашёл в зев — вышел на другом конце (и обратно)
    if (me && me.cls === 'inf' && S.mode === 'fps' && !S.attract && S.time > (me._t82cd || 0)){
      for (const b of cur){
        if (b.team !== me.team || !this.isOpen(b)) continue;
        const x = this.exitOf(b);
        const from = dist(me.pos, this.mouth(b)) < 2.8 ? b : dist(me.pos, this.mouth(x)) < 2.8 ? x : null; if (!from) continue;
        const to = from === b ? x : b;
        me.pos = surfacePoint(offsetOnSphere(this.mouthDir(to), to.fwd, 3.5), RULES.RAD); me.vel = mul(norm(me.pos), 4); me.grounded = false;
        me._t82cd = S.time + 4; S.flashT = 0.3; this.stats.fps++;
        feed(T82('Туннель: ты на другом конце', 'Tunnel: you are at the other end'), '#9cf'); emit('portal', {});
        break;
      }
    }
  },
  warn(b, dir){
    const foe = 1 - b.team, c = mul(dir, groundR(dir) + 1); this.stats.warn++;
    if (foe === 0 && !S.attract){
      feed(T82('⚠ Гул под землёй: Рой роет туннель! Прорыв через ~10 с — встречай', '⚠ Rumbling underground: the Swarm is digging a tunnel! Breakthrough in ~10 s — be ready'), '#ffb070');
      emit('radio', { text: T82('Внимание! Слышим подкоп. Противник роет туннель', 'Warning! Digging heard. The enemy is tunnelling'), pri: 2 });
      pushAlert(c); S.markers.push({ pos: c, t: 0, life: 14, col: '#ff8a50' });
    }
    // ИИ обороняющейся стороны отправляет свободную группу навстречу
    const T = S.teams[foe]; if (!T || !T.ai) return;
    let best = null, bd = 340;
    for (const g of groupsOf(foe)){
      if (g.manualUntil > S.time || (g.order === 'sky' && g.sky) || g.cls === 'drone' || g === playerGroup()) continue;
      const L = leaderOf(g); if (!L) continue; const d = surfDist(L.pos, c); if (d < bd){ bd = d; best = g; }
    }
    if (best){ setOrder(best, 'move', c, { rush: true, lock: 35 }); this.stats.aiDef++; }
  },
  // ---- ИИ Роя
  target(t, from){
    let best = null, bd = 1e9;
    const consider = (k, ref, pos) => { const d = surfDist(from, pos); if (d > 50 && d < bd){ bd = d; best = { k, id: ref, i: ref, pos }; } };
    for (const b of S.buildings) if (b.alive && b.team !== t && b.type !== 'wall82' && b.type !== 'tunx82') consider('b', b.id, b.pos);
    for (const c of S.cps) if (!c.core && c.owner !== t) consider('cp', c.i, c.pos);
    if (S.hq[1 - t].alive) consider('hq', 0, S.hq[1 - t].pos);
    return best;
  },
  planExit(b, tg){
    const m = this.mouthDir(b), D = surfDist(m, tg.pos);
    for (const kL of [1, 0.8, 0.6]){
      const L = clamp((D - 45) * kL, 60, this.MAXL - 20);
      for (const [side, s] of [[1, 30], [-1, 30], [1, 12], [-1, 12], [1, 0], [1, 50], [-1, 50]]){
        const dir = FAC82.offs(m, tg.pos, L, side, s);
        if (surfDist(m, dir) <= this.MAXL - 5 && !this.exitProblem(b, dir)) return dir;
      }
    }
    return null;
  },
  ai(t, dt){
    if (!FAC82.aiOk(t) || !FAC82.sw(t) || S.over) return;
    if ((this.aiT[t] -= dt) > 0) return; this.aiT[t] = 3;
    const T = S.teams[t];
    for (const b of this.list(t)){
      if (!b.done) continue;
      const s = this.st(b);
      if (s.st === 'idle' && !b.queue.length && T.ore >= pCost(t, 'tdig82') + 40){
        const tg = this.target(t, this.mouthDir(b)); const dir = tg && this.planExit(b, tg);
        if (dir){ T.ore -= pCost(t, 'tdig82'); this.startDig(b, dir); this.stats.aiDig++; s.aiUse = S.time + 30; }
      }
      if (this.isOpen(b) && S.time > (s.aiUse || 0)){
        s.aiUse = S.time + 25 + random() * 25;
        if (random() > 0.75) continue;
        const m = this.mouth(b), x = this.exitOf(b);
        const cand = S.squads.filter(g => g.team === t && !g.t82 && !g.solo && g.units.length >= 3 && g.manualUntil < S.time && !(g.order === 'sky' && g.sky) && g !== playerGroup())
          .map(g => ({ g, d: surfDist(leaderPos(g) || m, m) })).filter(o => o.d < 380).sort((a, b) => a.d - b.d).slice(0, 1 + (random() < 0.5 ? 1 : 0));
        const tg = this.target(t, this.mouthDir(x));
        for (const o of cand) if (this.send(b, o.g, 'ai', tg)) this.stats.aiSend++;
      }
    }
  },
  // ---- интерфейс: кнопки в панели норы (ПК и телефон), выбор точки выхода
  ui(key, site){
    if (key !== 'tdig82' && key !== 'tgo82') return false;
    const L = this.list(0).filter(b => b.done);
    let b = site && site.type === 'tun82' ? site : (S.selB && S.selB.type === 'tun82' && S.selB.team === 0 && S.selB.alive ? S.selB : null);
    const deny = why => { feed(`${pname(key)}: ${why}`, '#f88'); emit('ui', { kind: 'deny' }); return true; };
    if (key === 'tdig82'){
      if (!b || this.st(b).st !== 'idle') b = L.find(x => this.st(x).st === 'idle' && !x.queue.length) || b;
      if (!b) return deny(T82('Нужна Нора-туннель — её строят инженеры', 'Needs a Tunnel burrow — builders make it'));
      if (!b.done) return deny(T82('Нора ещё строится', 'The burrow is still being built'));
      const st = this.st(b).st;
      if (st !== 'idle') return deny(st === 'dig' ? T82('Уже роем', 'Already digging') : T82('Выход уже прорыт', 'The exit is already open'));
      if (S.teams[0].ore < pCost(0, key)) return deny(T82('Мало руды', 'Not enough ore'));
      S.cast = { kind: 'tun82', b }; S.place = null;
      feed(TOUCH.on ? T82(`Тапни точку выхода (до ${this.MAXL} м от норы)`, `Tap the exit point (up to ${this.MAXL} m from the burrow)`) : T82(`ЛКМ — точка выхода (до ${this.MAXL} м от норы), ПКМ — отмена`, `LMB — exit point (up to ${this.MAXL} m from the burrow), RMB — cancel`), '#9cf');
      emit('ui', { kind: 'ok' });
      FAC82.tip('tundig', `Выход — до ${this.MAXL} м. За 10 с до прорыва враг услышит гул и увидит пыль — выбирай место, где его не ждут.`, `Exit — up to ${this.MAXL} m. 10 s before breakthrough the enemy hears rumbling and sees dust — pick a spot they don't expect.`);
      return true;
    }
    if (!b || !this.isOpen(b)) b = L.find(x => this.isOpen(x)) || b;
    if (!b || !this.isOpen(b)) return deny(T82('Сначала пророй выход', 'Dig the exit first'));
    const m = this.mouth(b), G = new Set(selGroups().filter(isSquad));
    for (const g of S.squads) if (g.team === 0 && groupAlive(g)){ const p = leaderPos(g); if (p && surfDist(p, m) < 70) G.add(g); }
    let n = 0; for (const g of G) if (!g.t82 && this.send(b, g, 'player')) n++;
    if (n){ feed(T82(`В туннель: отрядов ${n}`, `Into the tunnel: ${n} squad(s)`), TEAM[0].css); emit('ui', { kind: 'ok' }); S.orderMark = { p: m, t: 0.8, col: '#ff7a5a', kind: 'amove' }; }
    else deny(T82('рядом с норой (70 м) отрядов нет — выдели отряды и ПКМ/тап по норе', 'no squads within 70 m of the burrow — select squads and RMB/tap the burrow'));
    return true;
  },
  castAt(x, y){
    const b = S.cast.b; if (!b || !b.alive){ S.cast = null; return; }
    const p = pickGround(x, y); if (!p) return;
    const dir = norm(p), why = this.exitProblem(b, dir);
    if (why){ feed(why, '#f88'); emit('ui', { kind: 'deny' }); return; }   // точку можно выбрать ещё раз
    if (S.teams[0].ore < pCost(0, 'tdig82')){ feed(T82('Мало руды', 'Not enough ore'), '#f88'); S.cast = null; return; }
    S.teams[0].ore -= pCost(0, 'tdig82'); this.startDig(b, dir); S.cast = null;
    feed(T82(`Роем туннель: ${pTime(0, 'tdig82')} с. Враг услышит гул за 10 с до прорыва`, `Digging: ${pTime(0, 'tdig82')} s. The enemy will hear it 10 s before breakthrough`), TEAM[0].css);
    emit('ui', { kind: 'ok' }); S.markers.push({ pos: mul(dir, groundR(dir) + 1), t: 0, life: 3, col: '#ff8a50' });
  },
  overlay(){
    if (S.mode !== 'rts' || !S.cast || S.cast.kind !== 'tun82') return;
    const b = S.cast.b; if (!b || !b.alive){ S.cast = null; return; }
    const m = this.mouth(b);
    octx.setLineDash([8, 6]); octx.strokeStyle = 'rgba(255,138,80,.75)'; octx.lineWidth = 2;
    FAC82.ring(this.mouthDir(b), this.MAXL, 96); octx.setLineDash([]);
    const p = S.mouse && !TOUCH.on ? pickGround(S.mouse[0], S.mouse[1]) : null; if (!p) return;
    const dir = norm(p), why = this.exitProblem(b, dir), col = why ? '#ff6050' : '#8fffaa';
    const a = project(m), q = project(mul(dir, groundR(dir) + 0.5));
    octx.strokeStyle = col; octx.lineWidth = 2;
    if (a && q){ octx.setLineDash([4, 6]); octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(q[0], q[1]); octx.stroke(); octx.setLineDash([]); }
    groundRing(mul(dir, groundR(dir) + 0.3), 4, 20);
    if (q){ octx.textAlign = 'center'; octx.font = '700 13px "Exo 2", sans-serif'; octx.fillStyle = col;
      octx.fillText(why || T82(`Выход · ${surfDist(this.mouthDir(b), dir) | 0} м · ${pTime(0, 'tdig82')} с`, `Exit · ${surfDist(this.mouthDir(b), dir) | 0} m · ${pTime(0, 'tdig82')} s`), q[0], q[1] - 16); }
  },
};
// ---------------------------------------------------------------- заказы норы
Object.assign(PRODUCTS, {
  tdig82: { n: ['Прорыть выход', 'Dig the exit', 'Đào lối ra'], cost: 100, time: 24, at: ['tun82'], icon: '⛏', fac76: 1,
            d76: ['Рой. Выбери точку до 220 м — выход прорвётся через 24 с. За 10 с до прорыва враг услышит гул и увидит пыль.', 'Swarm. Pick a point up to 220 m away — the exit breaks through in 24 s. 10 s before, the enemy hears rumbling and sees dust.'] },
  tgo82:  { n: ['Отряды — в туннель', 'Squads into the tunnel', 'Đội vào hầm'], cost: 0, time: 1, at: ['tun82'], icon: '⇣', fac76: 1,
            d76: ['Рой. Отряды в 70 м от норы (и выделенные) идут в туннель и выходят на другом конце. Или: выдели отряды и ПКМ/тап по норе.', 'Swarm. Squads within 70 m of the burrow (and selected ones) go through the tunnel. Or select squads and RMB/tap the burrow.'] },
});
{ const cp0 = canProduce;
  canProduce = function(team, key){
    if (key !== 'tdig82' && key !== 'tgo82') return cp0.apply(this, arguments);
    if (!FAC82.on) return T82('Выключено', 'Disabled');
    if (FI76(team) !== 1) return T82('Только у фракции «Рой»', 'Swarm only');
    const L = TUN82.list(team);
    if (!L.length) return T82('Нужна Нора-туннель', 'Needs a Tunnel burrow');
    if (key === 'tdig82'){
      if (!L.some(b => b.done && TUN82.st(b).st === 'idle' && !b.queue.length)) return L.some(b => !b.done) ? T82('Нора ещё строится', 'Still being built') : L.some(b => TUN82.st(b).st === 'dig') ? T82('Уже роем', 'Already digging') : T82('Выход уже прорыт', 'Exit already open');
      if (S.teams[team].ore < pCost(team, key)) return T82('Мало руды', 'Not enough ore', 'Không đủ quặng');
      return null;
    }
    return L.some(b => TUN82.isOpen(b)) ? null : T82('Сначала пророй выход', 'Dig the exit first');
  }; }
{ const up0 = uiProduce; uiProduce = function(key){ if (FAC82.on && TUN82.ui(key, null)) return; return up0.apply(this, arguments); }; }
if (typeof produceAt === 'function'){ const pa0 = produceAt; produceAt = function(site, key){ if (FAC82.on && TUN82.ui(key, site)) return true; return pa0.apply(this, arguments); }; }
{ const fp0 = finishProduct; finishProduct = function(site, key){ if (key === 'tdig82'){ FAC82.safe(() => TUN82.open(site), 'open'); return; } if (key === 'tgo82') return; return fp0.apply(this, arguments); }; }
{ const cx0 = cancelProduct; cancelProduct = function(site, idx){ const k = site && site.queue[idx]; const r = cx0.apply(this, arguments); if (k === 'tdig82' && site.t82 && !site.queue.includes('tdig82')){ site.t82.st = 'idle'; site.t82.exitDir = null; } return r; }; }
{ const tc0 = tryCast; tryCast = function(x, y){ if (S.cast && S.cast.kind === 'tun82'){ FAC82.safe(() => TUN82.castAt(x, y), 'cast'); return; } return tc0.apply(this, arguments); }; }
// ПКМ (тап) по своей открытой норе с выделенными отрядами — в туннель
{ const oa0 = orderAt;
  orderAt = function(x, y){
    const done = FAC82.on && FAC82.safe(() => {
      const sel = selGroups().filter(isSquad); if (!sel.length) return false;
      const ent = pickEntity(x, y, false);
      if (!ent || ent.cls !== 'bld' || ent.team !== 0 || ent.type !== 'tun82') return false;
      if (!TUN82.isOpen(ent)){ feed(ent.done ? T82('Выход ещё не прорыт — в панели норы «Прорыть выход»', 'No exit yet — "Dig the exit" in the burrow panel') : T82('Нора ещё строится', 'The burrow is still being built'), '#f88'); return false; }
      let n = 0; for (const g of sel) if (TUN82.send(ent, g, 'player')) n++;
      if (n){ S.orderMark = { p: TUN82.mouth(ent), t: 0.8, col: '#ff7a5a', kind: 'amove' }; feed(T82(`В туннель: отрядов ${n}`, `Into the tunnel: ${n} squad(s)`), TEAM[0].css); emit('ui', { kind: 'ok' }); }
      return n > 0;
    }, 'orderAt');
    if (done) return;
    return oa0.apply(this, arguments);
  }; }
// место норы: на своей территории, а зев — там, где можно копать (не на площадке штаба/точки, не в скалах)
{ const sp0 = siteProblem;
  siteProblem = function(team, type, dir){
    const r = sp0.apply(this, arguments);
    if (r || type !== 'tun82') return r;
    const md = offsetOnSphere(norm(dir), tangent(sub(mul(BASES[team], -1), norm(dir)), norm(dir)), TUN82.MOUTH);
    if (typeof CR76 !== 'undefined' && !CR76.allowed(md)) return T82('Слишком близко к штабу или точке — здесь не копают', 'Too close to the HQ or a point — no digging here');
    if (typeof TER81 !== 'undefined' && TER81.ready && TER81.near(md, 6)) return T82('Мешают скалы', 'Rocks in the way');
    return null;
  }; }
{ const fs0 = finishSite; finishSite = function(j){ const was = j.done; const r = fs0.apply(this, arguments);
    if (!was && j.type === 'tun82'){ FAC82.safe(() => { TUN82.hole(TUN82.mouthDir(j)); if (j.team === 0) FAC82.tip('tunbuilt', 'Нора готова: выбери её и нажми «Прорыть выход», потом — точку выхода.', 'Burrow ready: select it, press "Dig the exit", then pick the exit point.'); }, 'built'); }
    return r; }; }
// под землёй: невидимы (objInfo — в v82_common), неуязвимы, не стреляют, не двигаются, не цели
{ const bi0 = botInput; botInput = function(u){ if (u && u.tun82) return { wish: [0, 0, 0], speedMul: 1, jump: false, thrust: false, thrustDir: u.up, lift: false, fire: false, aim: null, rocket: false }; return bi0.apply(this, arguments); }; }
{ const ps0 = physStep; physStep = function(e){ if (e && e.tun82){ e.vel = [0, 0, 0]; return; } return ps0.apply(this, arguments); }; }
{ const dm0 = damage; damage = function(e, dmg){ if (e && e.tun82 && dmg < 9000) return; return dm0.apply(this, arguments); }; }
{ const rt0 = rebuildTargets; rebuildTargets = function(){ rt0.apply(this, arguments); if (S.units.some(u => u.tun82)) for (const t of [0, 1]) TGT[t] = TGT[t].filter(e => !e.tun82); }; }
{ const do0 = drawOverlay; drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (!S.attract) FAC82.safe(() => TUN82.overlay(), 'ov'); return r; }; }
// ---------------------------------------------------------------- воронки: ямы туннелей (pin) не вытесняются и не сливаются
if (typeof CR76 !== 'undefined'){ const add0 = CR76.add;
  CR76.add = function(){
    const pins = this.L.filter(c => c.pin); if (!pins.length) return add0.apply(this, arguments);
    const m0 = this.max, k = pins.length;
    this.L = this.L.filter(c => !c.pin); this.sync(); this.max = function(){ return max(1, m0.call(this) - k); };
    try { return add0.apply(this, arguments); } finally { this.max = m0; this.L = pins.concat(this.L); this.sync(); }
  }; }
// ---------------------------------------------------------------- регенерация Роя
const REG82 = { acc: 0, stats: { hp: 0 }, DELAY: 5, RATE: 0.04,
  step(dt){
    this.acc += dt; if (this.acc < 0.2) return; const a = this.acc; this.acc = 0;
    const low = FAC82.low(), cam = S.cam && S.cam.pos;
    const heal = (e, k) => {
      if (!e.alive || e.tun82 || e.hp >= e.maxhp || S.time - (e.lastHurt === undefined ? -99 : e.lastHurt) < this.DELAY || FI76(e.team) !== 1 || e.team > 1) return false;
      const h = min(e.maxhp - e.hp, e.maxhp * k * a); e.hp += h; this.stats.hp += h;
      if (cam && random() < (low ? 0.15 : 0.45) && dist2(e.pos, cam) < 160 * 160) S.sparks.push({ pos: add(e.pos, mul(randUnit(), 0.6)), vel: add(mul(norm(e.pos), 1.6), mul(randUnit(), 0.4)), life: 0.45, heal: 1 });
      return true;
    };
    let mine = false;
    for (const u of S.units) if (heal(u, this.RATE) && u.team === 0) mine = true;
    for (const d of S.drones) heal(d, this.RATE);
    if (mine && FAC82.sw(0)) FAC82.tip('regen', 'Рой: пехота и дроны сами лечатся вне боя — через 5 с без урона, 4 % в секунду. Отведи раненых — вернутся целыми.', 'Swarm: infantry and drones heal out of combat — after 5 s without damage, 4% per second. Pull the wounded back.');
  },
};
FAC82.steps.push(Object.assign(dt => TUN82.step(dt), { tag: 'tun' }));
FAC82.steps.push(Object.assign(dt => { TUN82.ai(0, dt); TUN82.ai(1, dt); }, { tag: 'tunai' }));
FAC82.steps.push(Object.assign(dt => REG82.step(dt), { tag: 'regen' }));
FAC82.resets.push(() => { TUN82.prev = []; TUN82.aiT = [3, 5]; REG82.acc = 0; });
// ИИ: стройка норы и место для неё
// ИИ Роя: нора с 4:00 (вторая — после 15:00)
FAC82.aiQ.push({ key: 'tun82', ok: t => FAC82.sw(t) && S.time > 240 && S.teams[t].ore >= 220 && TUN82.list(t).length < (S.time > 900 ? 2 : 1) });
FAC82.sites.tun82 = t => {
  const own = S.cps.filter(c => !c.core && c.owner === t);
  const foe = S.hq[1 - t].alive ? S.hq[1 - t].pos : mul(BASES[1 - t], RM);
  own.sort((a, b) => surfDist(a.dir, foe) - surfDist(b.dir, foe));
  const anchors = own.slice(0, 2).map(c => ({ c: c.dir, r0: 50, r1: 60 }));
  if (S.hq[t].alive) anchors.push({ c: BASES[t], r0: 92, r1: 120 });
  for (let k = 0; k < 36; k++){
    const A = anchors[k % anchors.length]; if (!A) return null;
    const rr = A.r0 + random() * (A.r1 - A.r0), a = random() * PI * 2, t1 = anyTangent(A.c), t2 = cross(A.c, t1);
    const dir = norm(add(mul(A.c, cos(rr / RM)), mul(add(mul(t1, cos(a)), mul(t2, sin(a))), sin(rr / RM))));
    if (!siteProblem(t, 'tun82', dir)){ TUN82.stats.aiBuilt++; return dir; }
  }
  return null;
};
// карточка выделенных отрядов (ПК и телефон, полная стратегия): кнопка «В туннель», когда у Роя открыт туннель
if (typeof updateCard === 'function'){ const uc0 = updateCard;
  updateCard = function(){
    uc0.apply(this, arguments);
    FAC82.safe(() => {
      const el = $('card'); if (!el) return;
      const cm = el.querySelector('.cmds'), old = el.querySelector('[data-t82]');
      const want = FAC82.on && FAC82.sw(0) && cm && selGroups().some(isSquad) && TUN82.list(0).some(b => TUN82.isOpen(b));
      if (!want){ if (old) old.remove(); return; }
      if (old) return;
      const bt = document.createElement('button'); bt.className = 'ab'; bt.dataset.t82 = '1'; bt.dataset.ux = 'prod:tgo82';
      bt.title = T82('Выделенные отряды идут в ближайший открытый туннель и выходят на другом конце', 'Selected squads go into the nearest open tunnel and come out at the other end');
      bt.innerHTML = `<i>⇣</i><b>${T82('В туннель', 'Into tunnel')}</b>`;
      bt.onclick = e => { e.stopPropagation(); AU.init(); TUN82.ui('tgo82', null); };
      const more = cm.querySelector('.more61');
      if (more) cm.insertBefore(bt, more); else cm.appendChild(bt);
    }, 'card');
  }; }
// «стая»: штурмовые отряды Роя на 8 % дешевле (баланс по боям бот против бота: без этого Консорциум выигрывал ~2 из 3)
REG82.SQ = 0.92;
{ const pc0 = pCost; pCost = function(team, key){ const c = pc0.apply(this, arguments); return key === 'squad' && FAC82.on && team < 2 && FI76(team) === 1 ? Math.round(c * REG82.SQ) : c; }; }
