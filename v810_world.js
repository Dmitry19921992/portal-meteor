// =====================================================================
//  v8.10 — НОВОЕ В МИРЕ (W810): аномалия «Железный пух», фауна «Корнеход» и «Рой светлячков», квест «Сопроводить конвой»
//  («Левша»), 3D-модели генератора и ретранслятора операций v8.9, «Показать подсказки заново», номер версии v8.10.
//  • «Железный пух» (осенний биом, каркас A78/AN86): поляна стальных одуванчиков. Пух налипает на всех в зоне и разъедает
//    броню −2/с; заразен: при касании (1.8 м, у техники 3.5 м) перескакивает на соседа. Снимается: инженер рядом (1.5 с)
//    или стоять на месте 3 с вне боя. Взрыв / болт сдувает пух (поляна спит 25 с). ИИ обходит поляну, заражённый бот вне
//    боя сам останавливается «отряхнуться».
//  • «Корнеход» (VER86): медленное корневище на ногах-корнях. Зарывается (пыльный холмик идёт под землёй, неуязвим),
//    выныривает под целью (удар 30 + подброс), бьёт корнями 16, снова уходит под землю.
//  • «Рой светлячков» (VER86): облако из многих светящихся червячков. Догоняет и «кусает» по чуть-чуть (5/с), пули ×0.45,
//    взрывы ×1.4 и РАЗГОНЯЮТ рой на 6 с (огоньки разлетаются, урона нет).
//  • Квест «Сопроводить конвой» (LIVE89, герой «Левша»): два «Шакала» с деталями идут к своей точке; ждут, если ты
//    дальше 55 м; на полпути — засада. Дошёл хоть один — +2 КО, +150 руды, «Шакалы» остаются в армии.
//  • Генератор и ретранслятор операций — процедурные модели (промышленный нейтральный вид), вместо одной метки.
//  • Настройки → «Показать подсказки заново» (два нажатия: подтверждение) — очищает pm88_tips, pm88_intro, pm_tips82
//    и отметки пройденных уроков pm_t72done.
//  Хуки — обёртки: A78.spawn/stepOne/discharge/parts, VER86.spawn/stepOne/hurt/collect/parts, rebuildTargets, botInput,
//  fxExplosion, damage, update, newMatch, ST70.collect, drawOverlay, LIVE89.offerQuest/qTalk/qTitle/qReward/answer/questStep/
//  target, MENU.html_settings, P71M.sec. Выключить: ?w810=0.
// =====================================================================
const W810 = {
  on: (() => { try { return new URLSearchParams(location.search).get('w810') !== '0'; } catch (e){ return true; } })(),
  err: {}, lt: null, acc: 0, tipT: -99,
  stats: { fluff: 0, inf: 0, spread: 0, cleanEng: 0, cleanStill: 0, corr: 0, roots: 0, burrow: 0, surface: 0, swarms: 0, bites: 0, scatter: 0, convoy: 0, convoyOk: 0, ambush: 0, reset: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('W810 ' + tag, e); } } },
  L: (ru, en, vi) => tr(ru, en, vi || en),
  lite(){ return typeof A78 !== 'undefined' && A78.lite(); },
  // ================================================================ «Железный пух»
  fluffSpawn(seed){
    if (typeof A78 === 'undefined' || !A78.on || SET.a78 === false) return;
    const rnd = seeded(((seed || 1) ^ 0x810f) >>> 0), n = this.lite() ? 1 : 2, V = typeof veins === 'function' ? veins() : [];
    for (let k = 0; k < n; k++){
      for (let i = 0; i < 200; i++){
        let dir;
        if (rnd() < 0.5){ const c = CPD[floor(rnd() * CPD.length)]; dir = offsetOnSphere(c, norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), 40 + rnd() * 80); }
        else dir = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
        if (typeof BIO86 !== 'undefined' && BIO86.on && BIO86.at(mul(dir, RM)) !== 2 && i < 170) continue;
        if (!A78.freeAt(dir, 8, V)) continue;
        const g = groundR(dir); if (abs(g - RM) > 14) continue;
        const a = A78.make('fluff', dir, g, rnd, this.lite());
        a.w810 = 1; a.seeds = [];
        for (let j = 0; j < (this.lite() ? 6 : 11); j++){ const an = rnd() * 6.283, r = Math.sqrt(rnd()) * a.r * 0.85; a.seeds.push({ an, r, h: 0.55 + rnd() * 0.6, s: 0.8 + rnd() * 0.5, ph: rnd() * 6.283 }); }
        A78.L.push(a); this.stats.fluff++;
        break;
      }
    }
  },
  fluffStep(a, dt){
    if (A78.dorm(a)){ a.st = 'dorm'; return; }
    if (a.st === 'dorm'){ a.st = 'idle'; a.t = 0; }
    a.t += dt;
    for (const e of a.occ) if (e.alive && !e.boss83 && (e.cls === 'inf' || e.cls === 'tank') && !e.fz810 && !e.tun82) this.infect(e, a);
  },
  infect(e, a, from){
    e.fz810 = { t: S.time, still: 0, eng: 0, tk: 0 };
    this.stats.inf++; if (from) this.stats.spread++;
    if (!S.attract && e === ctrlEntity()) feed('✾ ' + this.L('Железный пух налип — разъедает броню −2/с. Постой 3 с вне боя или к инженеру', 'Steel fluff stuck to you — corrodes armour −2/s. Stand still 3 s out of combat or find an engineer', 'Lông thép bám vào — ăn mòn giáp'), '#d8cfb8');
    else if (!S.attract && e.team === 0 && e.squad && e.squad === playerGroup() && S.time - this.tipT > 30 && typeof SQUADUI !== 'undefined'){ this.tipT = S.time; SQUADUI.say('a78_fluff', e, null, 14); }
  },
  clean(e, how){
    e.fz810 = null; this.stats[how === 'eng' ? 'cleanEng' : 'cleanStill']++;
    if (S.cam && dist2(e.pos, S.cam.pos) < 3600) for (let i = 0; i < (this.lite() ? 2 : 5); i++) S.sparks.push({ pos: add(e.pos, mul(randUnit(), 0.7)), vel: add(mul(norm(e.pos), 1.5), mul(randUnit(), 1.5)), life: 0.6 });
    if (!S.attract && e === ctrlEntity()) feed('✾ ' + (how === 'eng' ? this.L('Инженер счистил пух', 'An engineer brushed the fluff off', 'Kỹ sư đã gỡ lông thép') : this.L('Пух осыпался — броня цела', 'The fluff fell off — armour is safe', 'Lông thép đã rơi')), '#bfe6ff');
  },
  infStep(T){
    const L = [];
    for (const Ls of [S.units, S.vehicles]) for (const e of Ls){ if (!e.fz810) continue; if (!e.alive){ e.fz810 = null; continue; } L.push(e); }
    for (const e of L){
      const z = e.fz810;
      damage(e, 2 * T, null, 'z810'); this.stats.corr += 2 * T;
      if (!e.alive){ e.fz810 = null; continue; }
      // заразно: касание соседа
      const R = e.cls === 'tank' ? 3.5 : 1.8;
      for (const Ls of [S.units, S.vehicles]) for (const o of Ls){
        if (o === e || !o.alive || o.fz810 || o.boss83 || o.tun82 || (o.cls !== 'inf' && o.cls !== 'tank')) continue;
        const r2 = o.cls === 'tank' ? R + 1.7 : R;
        if (dist2(o.pos, e.pos) < r2 * r2 && random() < 0.35) this.infect(o, null, e);
      }
      // инженер рядом
      if (S.builders.some(b => b.alive && b.team === e.team && dist2(b.pos, e.pos) < 36)){ z.eng += T; if (z.eng >= 1.5){ this.clean(e, 'eng'); continue; } } else z.eng = 0;
      // стоять на месте 3 с вне боя
      const calm = S.time - (e.c810hit === undefined ? -99 : e.c810hit) > 3 && len(e.vel || [0, 0, 0]) < 0.9;
      if (calm){ z.still += T; if (z.still >= 3){ this.clean(e, 'still'); continue; } } else z.still = 0;
    }
  },
  // ================================================================ фауна: «Корнеход» и «Рой светлячков»
  faunaSpawn(){
    if (typeof VER86 === 'undefined' || !VER86.on) return;
    const lv = VER86.lv(), rnd = seeded((VER86.seed ^ 0x8100) >>> 0);
    const want = [['root', lv >= 1 ? 2 : 1], ['swarm', lv >= 2 ? 2 : 1]];
    const okBio = (sp, dir) => typeof BIO86 === 'undefined' || !BIO86.on || (sp === 'root' ? [1, 2].includes(BIO86.at(mul(dir, RM))) : BIO86.at(mul(dir, RM)) !== 3);
    for (const [sp, n] of want) for (let k = 0; k < n; k++){
      for (let i = 0; i < 220; i++){
        const dir = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]), ad = mul(dir, -1);
        if (!okBio(sp, dir) || !okBio(sp, ad) || !VER86.freeAt(dir) || !VER86.freeAt(ad)) continue;
        if (VER86.L.some(f => surfDist(f.dir, dir) < 50 || surfDist(f.dir, ad) < 50)) continue;
        for (const d of [dir, ad]){ const f = VER86.add(sp, d, rnd); f.w810 = 1; f.bur = null; f.cyc = 12 + rnd() * 14; f.sc = 0; f.bodies = this.bodies(f, rnd); }
        this.stats[sp === 'root' ? 'roots' : 'swarms'] += 2;
        break;
      }
    }
  },
  bodies(f, rnd){ if (f.sp !== 'swarm') return null; const n = [8, 12, 16, 20][VER86.lv()]; const B = []; for (let i = 0; i < n; i++) B.push({ a: rnd() * 6.283, b: rnd() * 6.283, r: 0.6 + rnd() * 1.1, w: 0.7 + rnd() * 1.4, h: rnd() * 1.4 - 0.4 }); return B; },
  rootStep(f, dt){
    const K = VER86.SP.root;
    f.t += dt; f.flash = max(0, f.flash - dt * 4); f.atkT -= dt; f.senseT -= dt; f.lash = max(0, f.lash - dt);
    const b = f.bur;
    if (b){
      b.t += dt;
      if (b.ph === 'down'){ f.hd = -2.6 * min(1, b.t / 1.4); if (random() < dt * 10) fxSmoke(add(mul(f.dir, f.g), mul(randUnit(), 0.8)), 0.8, 0.45, 0.6); if (b.t >= 1.4){ b.ph = 'under'; b.t = 0; } }
      else if (b.ph === 'under'){
        const tg = f.tgt && f.tgt.alive && f.st === 'agro' ? norm(f.tgt.pos) : b.to;
        const d = surfDist(f.dir, tg);
        if (d > 1.2) VER86.move(f, tg, f.st === 'agro' ? 4.2 : 2.6, dt);
        if (random() < dt * (VER86.lv() ? 6 : 3)) fxSmoke(add(mul(f.dir, f.g), mul(randUnit(), 0.4)), 0.5, 0.5, 0.45);
        if (d <= 1.2 || b.t > 14){ b.ph = 'up'; b.t = 0; this.surfaceHit(f); }
      } else if (b.ph === 'up'){ f.hd = -2.6 * max(0, 1 - b.t / 0.6); if (b.t >= 0.6){ f.bur = null; f.hd = 0; f.cyc = 10 + random() * 14; } }
    } else {
      f.cyc -= dt;
      if (f.senseT <= 0 && f.st !== 'agro'){ f.senseT = 0.3; const near = VER86.robots(f, K.agroR); if (near.length) VER86.agro(f, near[0], 'near'); }
      if (f.st === 'agro'){
        f.agroT -= dt;
        const e = f.tgt;
        if (!e || !e.alive || f.agroT <= 0 || dist(e.pos, f.pos) > 70){ f.st = 'calm'; f.tgt = null; }
        else {
          const d = dist(e.pos, f.pos) - (e.cls === 'tank' ? 2.5 : 0.5);
          f.fwd = norm(tangent(sub(e.pos, f.pos), f.dir));
          if (d < 3.2 && f.atkT <= 0){ f.atkT = 1.8; f.lash = 0.5; VER86.later(0.3, () => { if (f.alive && e.alive && dist(e.pos, f.pos) < 4.2) VER86.hit(f, e, 16, 3); }); }
          else if (d > 5 && f.cyc < 8) this.burrow(f, norm(e.pos));
          else if (d > 2.2) VER86.move(f, norm(e.pos), K.run, dt);
        }
      } else {
        if (f.cyc <= 0) this.burrow(f, offsetOnSphere(f.home, norm(tangent(randUnit(), f.home)), 10 + random() * 30));
        else { if (!f.goal || (f.goalT -= dt) <= 0){ f.goalT = 8 + random() * 8; f.goal = offsetOnSphere(f.home, norm(tangent(randUnit(), f.home)), random() * 25); }
          if (surfDist(f.dir, f.goal) > 1.5) VER86.move(f, f.goal, K.v, dt); }
      }
    }
    f.up = f.dir; f.pos = add(mul(f.dir, f.g), mul(f.dir, K.h + (f.hd || 0)));
    f.moving = !f.bur && f.st === 'agro' ? 1 : 0.4;
  },
  burrow(f, to){ f.bur = { ph: 'down', t: 0, to }; f.goal = null; this.stats.burrow++; VER86.sfx('puff', f); },
  surfaceHit(f){
    this.stats.surface++;
    const g = mul(f.dir, f.g);
    fxSmoke(add(g, mul(f.dir, 0.5)), 2.2, 0.45, 1.0); burst(add(g, mul(f.dir, 0.5)), VER86.lv() ? 10 : 5, 6, 0.5);
    if (S.cam && dist(S.cam.pos, g) < 50) S.shake = max(S.shake || 0, 0.35);
    for (const e of VER86.robots({ pos: g, g: f.g }, 3.6)){ VER86.hit(f, e, 30, 2); e.vel = add(e.vel, mul(norm(e.pos), e.cls === 'tank' ? 1 : 6)); e.grounded = false; }
    VER86.sfx('growl', f);
  },
  swarmStep(f, dt){
    const K = VER86.SP.swarm;
    f.t += dt; f.flash = max(0, f.flash - dt * 4); f.atkT -= dt; f.senseT -= dt;
    if (f.sc > S.time){   // разогнан взрывом: огоньки разлетаются, урона нет, отходит от места взрыва
      if (f.scFrom) VER86.move(f, norm(add(f.dir, mul(tangent(sub(f.pos, f.scFrom), f.dir), 0.02))), 2.5, dt);
      f.st = 'calm'; f.tgt = null;
    } else {
      if (f.senseT <= 0 && f.st !== 'agro'){ f.senseT = 0.3; const near = VER86.robots(f, K.agroR); if (near.length) VER86.agro(f, near[0], 'near'); }
      if (f.st === 'agro'){
        f.agroT -= dt;
        const e = f.tgt;
        if (!e || !e.alive || f.agroT <= 0 || dist(e.pos, f.pos) > 60){ f.st = 'calm'; f.tgt = null; }
        else {
          const d = dist(e.pos, f.pos);
          if (d > 1.2) VER86.move(f, norm(e.pos), K.run, dt);
          if (d < 3.2 && f.atkT <= 0){ f.atkT = 0.5; damage(e, 2.5, null, 'm'); VER86.stats.hits[e.team === 1 ? 1 : 0]++; this.stats.bites++; if (e.cls === 'inf') e.suppT = max(e.suppT || 0, 0.4); }
        }
      } else {
        if (!f.goal || (f.goalT -= dt) <= 0){ f.goalT = 5 + random() * 6; f.goal = offsetOnSphere(f.home, norm(tangent(randUnit(), f.home)), random() * 25); }
        if (surfDist(f.dir, f.goal) > 1.5) VER86.move(f, f.goal, K.v, dt);
      }
    }
    f.up = f.dir; f.pos = add(mul(f.dir, f.g), mul(f.dir, K.h + 0.3 * Math.sin(f.t * 1.3 + f.ph)));
    if (S.cam && f.alive && dist2(f.pos, S.cam.pos) < 2500 && random() < 0.5) addLight(f.pos, f.sc > S.time ? [1.6, 1.4, 0.3] : [2.6, 2.4, 0.6], 8, 0.05, 0.002);
  },
  scatter(f, from){
    if (!f.alive) return;
    if (f.sc < S.time) this.stats.scatter++;
    f.sc = S.time + 6; f.scFrom = from || f.pos; f.st = 'calm'; f.tgt = null;
    if (!S.attract && S.cam && dist2(f.pos, S.cam.pos) < 3600 && S.mode === 'fps' && S.time - (this.scT || -99) > 20){ this.scT = S.time; feed('✨ ' + this.L('Рой светлячков разогнан взрывом', 'The firefly swarm scattered by the blast', 'Bầy đom đóm bị tản ra'), '#ffe98a'); }
  },
  faunaCollect(items){
    if (!VER86.active() || !S.cam) return;
    const cam = S.cam.pos, T = S.rtime, far = [70, 110, 160, 200][VER86.lv()], rts = S.mode !== 'fps' && !S.attract;
    for (const f of VER86.L){
      if (!f.w810 || (!f.alive && f.dead > 3)) continue;
      const D = dist(f.pos, cam); if (D > (rts ? 400 : far)) continue;
      const Y = f.up, Z = f.fwd, X = norm(cross(Y, Z)), g = mul(f.dir, f.g), fl = f.flash * 0.8;
      const sh = f.alive ? 1 : max(0.05, 1 - f.dead / 3), pul = 0.6 + 0.4 * Math.sin(T * 2.2 + f.ph) + (f.st === 'agro' ? 0.6 : 0);
      if (f.sp === 'root'){
        if (f.bur && f.bur.ph === 'under'){ items.push({ m: 'f810mound', pos: g, X, Y, Z, s: 1, team: 0, sh: 1, flash: 0, glow: 0.3 }); continue; }
        const body = add(g, mul(Y, 0.9 + (f.hd || 0)));
        items.push({ m: 'f810root', pos: body, X, Y, Z, s: sh, team: 0, sh: 1, flash: fl, glow: pul });
        if (!f.alive || (f.hd || 0) < -1.2) continue;
        for (let k = 0; k < 5; k++){   // ноги-корни: шагают по кругу; при ударе одна хлещет
          const a = k * 1.2566 + f.ph, st = Math.sin(f.walk * 3 + k * 1.9) * 0.3 * f.moving;
          const hip = add(body, add(mul(X, Math.cos(a) * 0.6), mul(Z, Math.sin(a) * 0.6)));
          const foot = add(add(g, mul(X, Math.cos(a) * 1.7)), add(mul(Z, Math.sin(a) * 1.7 + st), mul(Y, max(0, st) * 0.6 + (k === 0 && f.lash > 0 ? 1.2 * Math.sin((1 - f.lash / 0.5) * PI) : 0))));
          const knee = add(mul(add(hip, foot), 0.5), mul(Y, 0.55));
          VER86.seg(items, 'f810leg', hip, knee, Z, 0.16, pul, fl); VER86.seg(items, 'f810leg', knee, foot, Z, 0.1, pul, fl);
        }
      } else if (f.sp === 'swarm' && f.alive && f.bodies){
        const spread = f.sc > S.time ? 3.2 : f.st === 'agro' ? 1.0 : 1.4;
        for (const b of f.bodies){
          const a = b.a + T * b.w, c = f.pos, r = b.r * spread;
          const p = add(c, add(add(mul(X, Math.cos(a) * r), mul(Z, Math.sin(a) * r)), mul(Y, b.h * spread * 0.6 + 0.3 * Math.sin(T * 2 + b.b))));
          const q = add(c, add(add(mul(X, Math.cos(a - 0.25) * r), mul(Z, Math.sin(a - 0.25) * r)), mul(Y, b.h * spread * 0.6 + 0.3 * Math.sin(T * 2 + b.b - 0.3))));
          VER86.seg(items, 'f810worm', q, add(q, mul(norm(sub(p, q)), 0.38)), Y, 0.06, 1.2 + 0.6 * Math.sin(T * 6 + b.b), fl);
        }
      }
    }
  },
  faunaParts(n){
    if (!VER86.active() || !S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP, T = S.rtime, cam = S.cam.pos;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    for (const f of VER86.L){
      if (!f.w810 || !f.alive || f.sp !== 'swarm' || dist2(f.pos, cam) > 3600) continue;
      for (let i = 0, m = VER86.lv() ? 4 : 2; i < m; i++){ const p = add(f.pos, mul(norm([Math.sin(i * 7.1 + T * 1.7), Math.cos(i * 3.3 + T * 1.1), Math.sin(i * 1.9 - T)]), (f.sc > S.time ? 3 : 1.2))); push(p, 0.035, add(p, mul(f.up, 0.05)), 9); }
    }
    return n;
  },
  // ================================================================ отрисовка пуха (меши + частицы) и генератор/ретранслятор
  fluffNear(){
    const cam = S.cam && S.cam.pos; if (!cam || typeof A78 === 'undefined') return [];
    const rts = S.mode !== 'fps' && !S.attract;
    return A78.L.filter(a => a.w810 && (!rts || a.known0) && dist2(a.pos, cam) < (rts ? 1e9 : 40000));
  },
  collect(items){
    if (typeof A78 !== 'undefined' && A78.active() && S.cam) for (const a of this.fluffNear()){
      const dorm = A78.dorm(a), T = S.rtime;
      for (const s of a.seeds){ const p = A78.ring(a, s.r, 0, s.an), sw = 0.05 * Math.sin(T * 1.4 + s.ph);
        items.push({ m: dorm ? 'f810stem' : 'f810dand', pos: p, X: norm(add(a.t1, mul(a.dir, sw))), Y: a.dir, Z: a.t2, s: s.s, team: 0, sh: 1, flash: 0, glow: dorm ? 0.1 : 0.5 + 0.3 * Math.sin(T * 2 + s.ph) }); }
    }
    if (typeof LIVE89 === 'undefined' || !S.cam) return;
    const ops = [LIVE89.cur, LIVE89.ai[0], LIVE89.ai[1]].filter(q => q && q.type === 'op' && q.pos);
    const seen = new Set();
    for (const op of ops){
      if (seen.has(op)) continue; seen.add(op);
      if (dist2(op.pos, S.cam.pos) > (S.mode === 'fps' ? 250 * 250 : 1e9)) continue;
      const up = norm(op.pos), X = op.X810 || (op.X810 = anyTangent(up)), Z = cross(up, X), g = mul(up, groundR(up) - 0.05);
      const pr = clamp(op.prog / (op.need || 6), 0, 1), bl = 0.6 + 0.4 * Math.sin(S.rtime * (3 + pr * 9));
      items.push({ m: op.kind === 'gen' ? 'gen810' : 'relay810', pos: g, X, Y: up, Z, s: 1, team: 0, sh: 1, flash: op.busy ? 0.3 : 0, glow: 0.7 + pr * 1.6 + bl * 0.4 });
      if (op.kind === 'relay'){ const a = S.rtime * 0.6; items.push({ m: 'relay810d', pos: add(g, mul(up, 6.2)), X: norm(add(mul(X, Math.cos(a)), mul(Z, Math.sin(a)))), Y: up, Z: norm(add(mul(Z, Math.cos(a)), mul(X, -Math.sin(a)))), s: 1, team: 0, sh: 1, flash: 0, glow: 0.8 + pr }); }
    }
  },
  parts(n){
    if (typeof A78 === 'undefined' || !A78.active() || !S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP, T = S.rtime, lite = this.lite(), cam = S.cam.pos;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    for (const a of this.fluffNear()){
      if (A78.dorm(a) || dist2(a.pos, cam) > 6400) continue;
      for (let i = 0, m = lite ? 3 : 8; i < m; i++){   // пушинки дрейфуют над поляной
        const ph = (T * 0.15 + i / m) % 1, ang = a.ph + i * 2.4 + T * 0.1, R = a.r * (0.2 + 0.8 * ((i * 0.37) % 1)), h = 0.6 + ph * 3.5;
        const p = A78.ring(a, R + ph * 3, h, ang); push(p, 0.03, add(p, mul(a.t1, 0.06)), 4);
      }
    }
    for (const Ls of [S.units, S.vehicles]) for (const e of Ls){ if (!e.fz810 || !e.alive || dist2(e.pos, cam) > 1600) continue; const p = add(centerOf(e), mul(randUnit(), e.cls === 'tank' ? 2 : 0.5)); push(p, 0.028, add(p, mul(norm(p), 0.04)), 4); }
    return n;
  },
  overlay(){
    const c = ctrlEntity(); if (!c || !c.fz810 || S.mode !== 'fps' || S.attract) return;
    const W = innerWidth, H = innerHeight, z = c.fz810;
    const g = octx.createRadialGradient(W / 2, H / 2, min(W, H) * 0.35, W / 2, H / 2, max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(150,120,80,0)'); g.addColorStop(1, `rgba(150,110,70,${(0.22 + 0.05 * Math.sin(S.rtime * 5)).toFixed(3)})`);
    octx.fillStyle = g; octx.fillRect(0, 0, W, H);
    octx.save(); octx.textAlign = 'center'; octx.font = '700 12px "Exo 2", sans-serif'; octx.fillStyle = '#e8dcc0'; octx.globalAlpha = 0.9;
    octx.fillText('✾ ' + this.L('ЖЕЛЕЗНЫЙ ПУХ −2/с · стой 3 с вне боя или к инженеру', 'STEEL FLUFF −2/s · stand still 3 s or find an engineer', 'LÔNG THÉP −2/s'), W / 2, H * 0.3);
    const k = clamp(max(z.still / 3, z.eng / 1.5), 0, 1);
    if (k > 0){ octx.fillStyle = 'rgba(0,0,0,.45)'; octx.fillRect(W / 2 - 60, H * 0.3 + 6, 120, 5); octx.fillStyle = '#bfe6ff'; octx.fillRect(W / 2 - 60, H * 0.3 + 6, 120 * k, 5); }
    octx.restore();
  },
  // ================================================================ квест «Сопроводить конвой» (Левша)
  convoyOffer(f){
    const cps = S.cps.filter(c => !c.core && c.owner === 0).map(c => ({ c, d: surfDist(f.pos, c.dir) })).filter(x => x.d > 160 && x.d < 520).sort((a, b) => a.d - b.d);
    if (!cps.length) return null;
    const dest = cps[0].c;
    return { kind: 'convoy', hero: 'lev', T: Math.round(max(320, 150 + cps[0].d / 2.2)), dest, dpos: surfacePoint(dest.dir, 0.5), dist0: cps[0].d };
  },
  convoyStart(q){
    const f = LIVE89.focus(); if (!f) return;
    const d0 = LIVE89.spotNear(f.pos, 14, 24);
    q.cv = [];
    for (let i = 0; i < 2; i++){
      const d = i ? LIVE89.spotNear(d0, 6, 9) : d0;
      const v = V2.make(surfacePoint(d, 1.5), 0, 'raider');
      v.walk = min(v.walk || 6, 5.2); v.convoy810 = 1; v.fwd = tangent(sub(q.dpos, v.pos), v.up); v.aim = v.fwd;
      setOrder(v, 'move', q.dpos, { lock: 400 });
      q.cv.push(v);
    }
    q.mid = surfacePoint(stepToward(norm(q.cv[0].pos), norm(q.dpos), surfDist(q.cv[0].pos, q.dpos) * 0.55 / RM), 0.5);
    q.len = surfDist(q.cv[0].pos, q.dpos); q.amb = 0; q.prog = 0;
    this.stats.convoy++;
    feed('★ ' + this.L('Конвой «Левши» готов: два «Шакала». Держись рядом — без тебя ждут', 'Lefty\'s convoy is ready: two Jackals. Stay close — they wait for you', 'Đoàn xe sẵn sàng'), '#ffd27a');
  },
  convoyStep(q, T){
    const cv = (q.cv || []).filter(v => v.alive);
    if (!cv.length){ this.convoyEnd(q); return 'fail'; }
    if (S.time - q.t0 > q.T){ this.convoyEnd(q); return 'fail'; }
    const f = LIVE89.focus(), lead = cv.reduce((b, v) => surfDist(v.pos, q.dpos) < surfDist(b.pos, q.dpos) ? v : b, cv[0]);
    const left = surfDist(lead.pos, q.dpos);
    q.prog = clamp(1 - left / max(1, q.len), 0, 1) * 2.99;
    const far = !f || dist(f.pos, lead.pos) > 55;
    q.busy = enemiesNear(0, lead.pos, 40, e => e.cls === 'inf' || e.cls === 'tank').length > 0;
    for (const v of cv){
      if (far){ if (v.order !== 'hold') setOrder(v, 'hold', v.pos, { lock: 400 }); }
      else if (v.order !== 'move' || !v.goal || dist(v.goal, q.dpos) > 5) setOrder(v, 'move', q.dpos, { lock: 400 });
    }
    if (far && S.time - (q.waitT || -99) > 25){ q.waitT = S.time; feed('★ ' + this.L('Конвой ждёт тебя', 'The convoy is waiting for you', 'Đoàn xe đang chờ'), '#ffd27a'); }
    // засада на полпути
    if (!q.amb && surfDist(lead.pos, q.mid) < 60){
      q.amb = 1; this.stats.ambush++;
      const d = LIVE89.spotNear(q.mid, 22, 32), sq = spawnSquad(1, false, surfacePoint(d, 0.5), 3);
      setOrder(sq, 'attack', lead.pos, { lock: 60, focus: lead }); q.guard = sq;
      VOX.radio('conv810', this.L('Засада! Прикрой «Шакалов»!', 'Ambush! Cover the Jackals!', 'Phục kích!'), 2, 5, true);
    }
    if (left < 22){
      LIVE89.rwCmd(2); S.teams[0].ore += 150;
      feed('★ ' + LIVE89.heroName('lev') + ': ' + this.L(`конвой дошёл (${cv.length} из 2)! +2 КО, +150 руды, «Шакалы» твои`, `the convoy made it (${cv.length} of 2)! +2 CP, +150 ore, the Jackals are yours`), '#ffd27a');
      VOX.radio('conv810ok', this.L('Детали на месте! Спасибо, командир.', 'The parts are delivered! Thanks, commander.', 'Đã giao!'), 1, 5, true);
      LIVE89.awardQ(); this.stats.convoyOk++; this.convoyEnd(q); return 'ok';
    }
    return null;
  },
  convoyEnd(q){ for (const v of q.cv || []){ v.convoy810 = 0; v.manualUntil = 0; } },
  // ================================================================ «Показать подсказки заново»
  resetTips(){
    for (const k of ['pm88_tips', 'pm88_intro', 'pm_tips82', 'pm_t72done']) try { localStorage.removeItem(k); } catch (e){}
    if (typeof HUD88 !== 'undefined' && HUD88.seen) for (const k in HUD88.seen) delete HUD88.seen[k];
    this.stats.reset++;
  },
  tipsBtn(phone){
    const lab = this.L('Показать подсказки заново', 'Show tips again', 'Hiện lại gợi ý');
    if (phone) return `<button class="p71o" data-r810="1"><span>${lab}</span><b>↺</b></button>`;
    return `<div class="row"><label>${lab}</label><button class="tog" data-r810="1">↺ ${this.L('Сбросить', 'Reset', 'Đặt lại')}</button></div>`;
  },
  tipsClick(b){
    const lbl = b.querySelector('b') || b;
    if (!b.dataset.r810c){
      b.dataset.r810c = '1'; b.dataset.r810t = lbl.textContent;
      lbl.textContent = this.L('Точно? Ещё раз', 'Sure? Tap again', 'Chắc chắn?');
      setTimeout(() => { if (b.dataset.r810c === '1'){ delete b.dataset.r810c; lbl.textContent = b.dataset.r810t; } }, 4000);
      return;
    }
    b.dataset.r810c = '2'; this.resetTips();
    lbl.textContent = '✓ ' + this.L('Готово', 'Done', 'Xong');
    if (typeof feed === 'function') feed('↺ ' + this.L('Подсказки и уроки покажутся заново', 'Tips and lessons will show again', 'Gợi ý sẽ hiện lại'), '#9cf');
  },
};
// ------------------------------------------------------------------ каталог: аномалия, фауна, реплики
if (typeof A78 !== 'undefined') A78.K.fluff = { n: ['Железный пух', 'Steel fluff', 'Lông Thép'], r: 6, css: '#d8cfb8', icon: '✾' };
if (typeof VER86 !== 'undefined') Object.assign(VER86.SP, {
  root:  { n: ['Корнеход', 'Rootwalker', 'Rễ Bộ'], hp: 380, h: 0.0, rad: 1.4, v: 0.5, run: 1.6, agroR: 7, css: '#d8a86a' },
  swarm: { n: ['Рой светлячков', 'Firefly swarm', 'Bầy Đom Đóm'], hp: 140, h: 1.5, rad: 1.6, v: 0.9, run: 5.2, agroR: 10, css: '#ffe98a' },
});
if (typeof CHAT !== 'undefined') Object.assign(CHAT, {
  a78_fluff: [['Стальные одуванчики — Железный пух! Налипнет — разъест броню!', 'Steel dandelions — Steel fluff! It sticks and eats armour!', 'Lông Thép!'], ['Пух летит — не лезь в поляну, и не трись о заражённых!', 'Fluff in the air — keep out of the meadow and away from the infected!', 'Tránh xa bãi lông thép!']],
});
// ------------------------------------------------------------------ меши (ST70): одуванчики, корнеход, холмик, червячок, генератор, ретранслятор
if (typeof ST70_DEF !== 'undefined'){
  const STL = [0.62, 0.63, 0.66], STL2 = [0.38, 0.39, 0.42], RUST = [0.42, 0.24, 0.12], FLF = [1.5, 1.45, 1.35], BARK = [0.22, 0.15, 0.09], AMB = [2.6, 1.5, 0.4];
  const YEL = [0.8, 0.62, 0.1], GRY = [0.27, 0.28, 0.3], DKG = [0.12, 0.12, 0.13];
  Object.assign(ST70_DEF, {
    f810stem(){ const g = G69(); g69tube(g, [0, 0, 0], [0.05, 0.9, 0.02], 0.035, 0.02, 5, STL2, 2); for (let i = 0; i < 3; i++){ const a = i * 2.1; g69box(g, [Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.12], [0.1, 0.012, 0.04], 0.01, RUST, 2); } return g; },
    f810dand(){   // стальной одуванчик: стебель, листья-лезвия, головка-шар из игл с белыми пушинками
      const g = G69(), rnd = seeded(8101);
      g69tube(g, [0, 0, 0], [0.05, 0.9, 0.02], 0.035, 0.02, 5, STL2, 2);
      for (let i = 0; i < 3; i++){ const a = i * 2.1; g69with(g, M34.ch(M34.T(Math.cos(a) * 0.14, 0.06, Math.sin(a) * 0.14), M34.RY(-a), M34.RZ(0.4)), () => g69box(g, [0, 0, 0], [0.16, 0.012, 0.045], 0.01, RUST, 2)); }
      g69box(g, [0.05, 0.95, 0.02], [0.07, 0.07, 0.07], 0.06, STL, 2);
      for (let i = 0; i < 16; i++){
        const u = rnd() * 2 - 1, a = rnd() * 6.283, s = Math.sqrt(1 - u * u), d = [s * Math.cos(a), u, s * Math.sin(a)];
        const b = [0.05 + d[0] * 0.07, 0.95 + d[1] * 0.07, 0.02 + d[2] * 0.07], e = [0.05 + d[0] * 0.3, 0.95 + d[1] * 0.3, 0.02 + d[2] * 0.3];
        g69tube(g, b, e, 0.008, 0.005, 3, STL, 2); g69box(g, e, [0.025, 0.025, 0.025], 0.02, FLF, 5);
      }
      return g;
    },
    f810root(){   // корнеход: узловатое корневище-луковица, наросты коры, янтарные светящиеся сучки
      const g = G69(), rnd = seeded(8102);
      g69tube(g, [0, -0.3, 0], [0, 0.5, 0], 0.75, 0.45, 9, BARK, 1);
      g69tube(g, [0, 0.5, 0], [0.1, 0.95, -0.05], 0.45, 0.12, 8, BARK, 1);
      for (let i = 0; i < 9; i++){ const a = rnd() * 6.283, y = -0.2 + rnd() * 0.8; g69box(g, [Math.cos(a) * 0.68, y, Math.sin(a) * 0.68], [0.16, 0.1 + rnd() * 0.12, 0.14], 0.07, [0.18, 0.12, 0.07], 1); }
      for (let i = 0; i < 6; i++){ const a = rnd() * 6.283, y = -0.1 + rnd() * 0.7; g69box(g, [Math.cos(a) * 0.74, y, Math.sin(a) * 0.74], [0.06, 0.06, 0.06], 0.04, AMB, 5); }
      for (let i = 0; i < 4; i++){ const a = i * 1.57 + 0.3; g69tube(g, [Math.cos(a) * 0.2, 0.85, Math.sin(a) * 0.2], [Math.cos(a) * 0.7, 1.5 + rnd() * 0.4, Math.sin(a) * 0.7], 0.07, 0.015, 4, BARK, 1); }
      g69box(g, [0, 0.2, 0.72], [0.22, 0.08, 0.06], 0.04, AMB, 5);
      return g;
    },
    f810leg(){ const g = G69(); g69tube(g, [0, 0, 0], [0, 1, 0], 1, 0.55, 5, BARK, 1); g69box(g, [0.5, 0.5, 0.4], [0.25, 0.08, 0.2], 0.05, [0.18, 0.12, 0.07], 1); return g; },
    f810mound(){ const g = G69(); g69tube(g, [0, -0.25, 0], [0, 0.25, 0], 1.3, 0.5, 9, [0.24, 0.18, 0.12], 1); for (let i = 0; i < 5; i++){ const a = i * 1.26; g69box(g, [Math.cos(a) * 0.9, 0.05, Math.sin(a) * 0.9], [0.18, 0.1, 0.14], 0.08, [0.2, 0.16, 0.11], 1); } return g; },
    f810worm(){ const g = G69(); g69tube(g, [0, 0, 0], [0, 1, 0], 0.7, 1, 5, [2.8, 2.5, 0.7], 5); g69box(g, [0, 1, 0], [0.9, 0.12, 0.9], 0.1, [3.2, 3.0, 1.2], 5); return g; },
    gen810(){   // генератор: плита, корпус-цилиндр с рёбрами, катушка, щит, кабели, жёлто-чёрные полосы
      const g = G69();
      g69box(g, [0, 0.15, 0], [2.2, 0.15, 1.6], 0.08, [0.3, 0.29, 0.27], 1);
      g69tube(g, [-1.3, 0.3, 0], [1.3, 0.3, 0], 0.95, 0.95, 12, GRY, 2); g69tube(g, [-1.3, 1.25, 0], [1.3, 1.25, 0], 0.1, 0.1, 6, GRY, 2);
      for (let i = 0; i < 7; i++){ const x = -1.1 + i * 0.37; g69with(g, M34.T(x, 1.05, 0), () => g69box(g, [0, 0, 0], [0.04, 0.95, 1.0], 0.02, STL2, 2)); }
      g69box(g, [0, 1.05, 0], [1.25, 0.06, 0.06], 0.03, DKG, 2);
      g69tube(g, [1.55, 0.3, 0], [1.55, 1.9, 0], 0.32, 0.26, 10, DKG, 2);
      for (let i = 0; i < 4; i++) g69tube(g, [1.55, 0.6 + i * 0.32, 0], [1.55, 0.72 + i * 0.32, 0], 0.4, 0.4, 10, [2.2, 1.6, 3.2], 5);
      g69box(g, [-1.8, 0.85, 0], [0.12, 0.55, 0.7], 0.04, GRY, 2); g69box(g, [-1.93, 1.05, 0.25], [0.02, 0.07, 0.07], 0.02, [3, 0.3, 0.1], 5); g69box(g, [-1.93, 1.05, -0.05], [0.02, 0.07, 0.07], 0.02, [0.3, 3, 0.4], 5);
      for (let i = 0; i < 6; i++) g69box(g, [-2.0 + i * 0.8, 0.32, 1.62], [0.2, 0.05, 0.02], 0, i % 2 ? DKG : YEL, 1);
      for (const s of [-1, 1]) g69tube(g, [-1.8, 0.3, s * 0.4], [-2.8, 0.05, s * 1.3], 0.06, 0.06, 5, DKG, 1);
      return g;
    },
    relay810(){   // ретранслятор: решётчатая мачта на опорах, площадка, антенны, сигнальный огонь
      const g = G69();
      g69box(g, [0, 0.12, 0], [1.4, 0.12, 1.4], 0.06, [0.3, 0.29, 0.27], 1);
      const H = 6;
      for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) g69tube(g, [x, 0.2, z], [x * 0.35, H, z * 0.35], 0.06, 0.04, 5, GRY, 2);
      for (let k = 0; k < 5; k++){ const y = 0.8 + k * 1.1, s = 0.6 - (0.6 - 0.21) * (y / H); for (const [a, b] of [[[-s, -s], [s, -s]], [[s, -s], [s, s]], [[s, s], [-s, s]], [[-s, s], [-s, -s]]]) g69tube(g, [a[0], y, a[1]], [b[0], y + 0.5, b[1]], 0.025, 0.025, 4, STL2, 2); }
      g69box(g, [0, H, 0], [0.45, 0.06, 0.45], 0.03, DKG, 2);
      g69tube(g, [0.3, H, 0.3], [0.3, H + 1.6, 0.3], 0.03, 0.015, 4, STL, 2); g69tube(g, [-0.3, H, -0.2], [-0.3, H + 1.1, -0.2], 0.03, 0.015, 4, STL, 2);
      g69box(g, [0.3, H + 1.65, 0.3], [0.07, 0.07, 0.07], 0.05, [3.2, 0.4, 0.15], 5);
      g69box(g, [0.9, 0.55, 0], [0.35, 0.4, 0.3], 0.05, GRY, 2); g69box(g, [1.26, 0.7, 0], [0.02, 0.08, 0.16], 0.02, [0.3, 2.6, 3], 5);
      for (let i = 0; i < 4; i++) g69box(g, [-1.2 + i * 0.8, 0.26, 1.42], [0.2, 0.04, 0.02], 0, i % 2 ? DKG : YEL, 1);
      return g;
    },
    relay810d(){   // вращающаяся тарелка ретранслятора
      const g = G69();
      g69with(g, M34.ch(M34.T(0, 0.25, 0), M34.RX(-0.5)), () => { g69torus(g, [0, 0, 0], 0.75, 0.05, 20, 4, STL, 2); g69tube(g, [0, -0.02, 0], [0, 0.05, 0], 0.75, 0.2, 14, STL2, 2); g69tube(g, [0, 0, 0], [0, 0.6, 0], 0.03, 0.02, 4, STL, 2); g69box(g, [0, 0.62, 0], [0.06, 0.06, 0.06], 0.04, [0.3, 2.6, 3], 5); });
      g69tube(g, [0, -0.2, 0], [0, 0.25, 0], 0.08, 0.08, 6, DKG, 2);
      return g;
    },
  });
}
// ------------------------------------------------------------------ хуки
if (W810.on){
  if (typeof A78 !== 'undefined'){
    { const sp0 = A78.spawn; A78.spawn = function(seed){ const r = sp0.apply(this, arguments); W810.safe(() => W810.fluffSpawn(this.seed), 'fspawn'); return r; }; }
    { const so0 = A78.stepOne; A78.stepOne = function(a, dt){ if (a && a.k === 'fluff') return W810.safe(() => W810.fluffStep(a, dt), 'fone'); return so0.apply(this, arguments); }; }
    { const ds0 = A78.discharge; A78.discharge = function(a, by){
        if (!a || a.k !== 'fluff') return ds0.apply(this, arguments);
        if (A78.dorm(a)) return false;
        a.dormT = S.time + 25; a.st = 'dorm'; A78.stats.discharged++;
        for (let i = 0; i < (W810.lite() ? 3 : 7); i++) fxSmoke(A78.ring(a, random() * a.r, 0.8 + random() * 2, random() * 6.283), 1.2, 0.85, 0.5);
        if (by && typeof isPlayerSrc === 'function' && isPlayerSrc(by) && !S.attract){ if (typeof addCmd === 'function') addCmd(0, 0.5); feed('✓ ' + A78.name(a) + ': ' + W810.L('пух сдуло, поляна спит 25 с · +0.5 КО', 'fluff blown away, dormant for 25 s · +0.5 CP'), A78.K.fluff.css); }
        A78.dropArt(a); return true;
      }; }
    { const fi0 = A78.fire; if (fi0) A78.fire = function(a){ if (a && a.k === 'fluff') return; return fi0.apply(this, arguments); }; }
    { const pa0 = A78.parts; A78.parts = function(n){ n = pa0.apply(this, arguments); const m = W810.safe(() => W810.parts(n), 'par'); return m === undefined ? n : m; }; }
  }
  if (typeof VER86 !== 'undefined' && VER86.on){
    { const sp0 = VER86.spawn; VER86.spawn = function(seed){ const r = sp0.apply(this, arguments); W810.safe(() => W810.faunaSpawn(), 'vspawn'); return r; }; }
    { const so0 = VER86.stepOne; VER86.stepOne = function(f, dt){
        if (f && (f.sp === 'root' || f.sp === 'swarm')){ if (!f.alive){ f.dead += dt; f.bur = null; f.hd = 0; return; } return W810.safe(() => f.sp === 'root' ? W810.rootStep(f, dt) : W810.swarmStep(f, dt), 'v' + f.sp); }
        return so0.apply(this, arguments);
      }; }
    { const hu0 = VER86.hurt; VER86.hurt = function(f, dmg, src, pt){
        if (f && f.sp === 'root'){ if (f.bur && f.bur.ph !== 'up') return; if (pt === 'b') dmg *= 0.6; }
        if (f && f.sp === 'swarm'){
          const boom = pt === 'g' || pt === 'r' || pt === 's' || pt === 'a' || pt === 'x';
          if (boom){ dmg *= 1.4 / 0.85; W810.scatter(f, src && src.pos); } else if (pt === 'b') dmg *= 0.45 / 0.85;
        }
        return hu0.call(this, f, dmg, src, pt);
      }; }
    { const c0 = VER86.collect; VER86.collect = function(items){ c0.apply(this, arguments); W810.safe(() => W810.faunaCollect(items), 'vcol'); }; }
    { const p0 = VER86.parts; VER86.parts = function(n){ n = p0.apply(this, arguments); const m = W810.safe(() => W810.faunaParts(n), 'vpar'); return m === undefined ? n : m; }; }
    { const rt0 = rebuildTargets; rebuildTargets = function(){ rt0.apply(this, arguments); if (VER86.L.some(f => f.bur && f.alive)) for (const t of [0, 1]) TGT[t] = TGT[t].filter(e => !(e.ver86 && e.bur && e.bur.ph !== 'up')); }; }
    { const fx0 = fxExplosion; fxExplosion = function(p, size){ const r = fx0.apply(this, arguments); if (p && VER86.L.length) W810.safe(() => { const R = 6 + (size || 1) * 3; for (const f of VER86.L) if (f.sp === 'swarm' && f.alive && dist2(f.pos, p) < R * R) W810.scatter(f, p); }, 'fx'); return r; }; }
  }
  // заражённый пухом бот вне боя сам останавливается «отряхнуться»
  { const bi0 = botInput; botInput = function(u, dt){ const inp = bi0.apply(this, arguments); if (inp && u.fz810 && !u.target && S.time - (u.c810hit === undefined ? -99 : u.c810hit) > 3 && !enemiesNear(u.team, u.pos, 45).length){ inp.wish = [0, 0, 0]; inp.speedMul = 0; } return inp; }; }
  { const ti0 = tankInput; tankInput = function(v, dt){ const inp = ti0.apply(this, arguments); if (inp && v.fz810 && !v.target && S.time - (v.c810hit === undefined ? -99 : v.c810hit) > 3 && !enemiesNear(v.team, v.pos, 60).length && inp.wish){ inp.wish = [0, 0, 0]; } return inp; }; }
  { const dm0 = damage; damage = function(e, dmg, src, pt){ if (e && pt !== 'z810' && dmg > 0) e.c810hit = S.time; return dm0.apply(this, arguments); }; }
  { const up0 = update; update = function(rdt){ const r = up0.apply(this, arguments); if (S.paused) return r;
      const dt = clamp(S.time - (W810.lt === null ? S.time : W810.lt), 0, 0.1); W810.lt = S.time;
      W810.acc += dt; if (W810.acc >= 0.5){ const T = W810.acc; W810.acc = 0; if (typeof A78 !== 'undefined' && A78.active()) W810.safe(() => W810.infStep(T), 'inf'); }
      return r; }; }
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); W810.lt = null; W810.acc = 0; for (const Ls of [S.units, S.vehicles]) for (const e of Ls) e.fz810 = null; return r; }; }
  if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect; ST70.collect = function(){ c0.apply(this, arguments); W810.safe(() => W810.collect(this.items), 'collect'); }; }
  { const do0 = drawOverlay; drawOverlay = function(){ const r = do0.apply(this, arguments); W810.safe(() => W810.overlay(), 'ov'); return r; }; }
  // квест «Сопроводить конвой»
  if (typeof LIVE89 !== 'undefined'){
    const LV = LIVE89;
    { const of0 = LV.offerQuest; LV.offerQuest = function(force){
        const f = this.focus();
        if (f && typeof V2 !== 'undefined' && (force === 'convoy' || (!force && random() < 0.34))){
          const q0 = W810.safe(() => W810.convoyOffer(f), 'coffer');
          if (q0){
            const q = Object.assign({ type: 'quest', prog: 0 }, q0); q.giver = this.heroUnit(q.hero);
            this.ask(q, 15); this.stats.quest++;
            VOX.radio('quest89', this.heroName(q.hero) + ': ' + this.qTalk(q), 1, 20, true);
            feed('★ ' + this.L('Квест от героя', 'Hero quest') + ' · ' + this.heroName(q.hero), '#ffd27a');
            this.tip(); return q;
          }
          if (force === 'convoy') return null;
        }
        return of0.apply(this, arguments);
      }; }
    { const t0 = LV.qTalk; LV.qTalk = function(q){ return q && q.kind === 'convoy' ? this.L(`Мои ребята везут детали на точку ${q.dest.name}. Проводи колонну — по дороге могут ждать.`, `My crew is hauling parts to point ${q.dest.name}. Escort the column — there may be an ambush.`) : t0.apply(this, arguments); }; }
    { const t1 = LV.qTitle; LV.qTitle = function(q){ return q && q.kind === 'convoy' ? this.L(`Сопроводить конвой к точке ${q.dest.name}`, `Escort the convoy to point ${q.dest.name}`) : t1.apply(this, arguments); }; }
    { const t2 = LV.qReward; LV.qReward = function(q){ return q && q.kind === 'convoy' ? this.L('+2 КО, +150 руды, «Шакалы» твои', '+2 CP, +150 ore, the Jackals are yours') : t2.apply(this, arguments); }; }
    { const an0 = LV.answer; LV.answer = function(yes){ const o = this.offer; const r = an0.apply(this, arguments); if (yes && o && o.item && o.item.kind === 'convoy' && this.cur === o.item) W810.safe(() => W810.convoyStart(o.item), 'cstart'); return r; }; }
    { const qs0 = LV.questStep; LV.questStep = function(q, T){ if (q && q.kind === 'convoy'){ const r = W810.safe(() => W810.convoyStep(q, T), 'cstep'); return r === undefined ? 'fail' : r; } return qs0.apply(this, arguments); }; }
    { const tg0 = LV.target; LV.target = function(q){ if (q && q.kind === 'convoy'){ const v = (q.cv || []).find(x => x.alive); return v ? v.pos : q.dpos; } return tg0.apply(this, arguments); }; }
    { const nm1 = newMatch; newMatch = function(){ const c = LV.cur; if (c && c.kind === 'convoy') W810.convoyEnd(c); return nm1.apply(this, arguments); }; }
  }
  // Настройки: «Показать подсказки заново» (после «Живого мира»)
  if (typeof MENU !== 'undefined' && MENU.html_settings){
    const hs0 = MENU.html_settings; MENU.html_settings = function(){
      const h = hs0.apply(this, arguments);
      const re = /(<button class="tog[^"]*" data-p74tog="live89">[^<]*<\/button><\/div>)/;
      return re.test(h) ? h.replace(re, '$1' + W810.tipsBtn(false)) : h + W810.tipsBtn(false);
    };
    if (typeof P71M !== 'undefined' && P71M.sec){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_game') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + W810.tipsBtn(true)); return h; }; }
    document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-r810]'); if (!b) return; e.preventDefault(); e.stopPropagation(); W810.safe(() => W810.tipsClick(b), 'tips'); }, true);
  }
}
// номер версии
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.10'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.10'; }
