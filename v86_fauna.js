// =====================================================================
//  v8.6 — ФАУНА «ВЕРДАНЫ» (VER86): раса пришельцев-растений (из VR 0.2). Процедурные модели ST70 в органичном стиле
//  (асимметрия, пульсация, светящиеся части), без крови — зелёный сок/слизь.
//   «Хлыстокорень» — корневище с лозами; почти не ходит, хлещет лозой всех в 6.5 м (22 урона + отброс).
//   «Споровик» — гриб на ножках со светящейся шляпкой; тронешь или подойдёшь — облако спор (урон, подавление, 6 с).
//   «Панцирник» — бронированный, медленный (пули ×0.3); рассердишь — таранит (40 урона).
//   «Треножник» — охотник на трёх ногах: подошёл ближе 14 м — догоняет и бьёт когтями; через 20 с отстаёт.
//  Живут в «Зелёной аномальной зоне» (BIO86), тянутся к жилам (питаются зелёным кристаллом), нейтральны, пока не тронешь
//  или не подойдёшь; опасны обеим фракциям. В TGT — как нейтральная цель (пули, гранаты, взрывы, огонь ×1.6 — растения горят);
//  ИИ обходит спокойных, а стреляет только по тем, кто напал на его команду или подошёл вплотную.
//  Количество: 8 / 6 / 4 (по ADG80), пары симметричны относительно антипода. Хуки — обёртки: rebuildTargets, damage,
//  findTarget, botInput, tankInput, update, newMatch, ST70.collect, gatherParticles, drawOverlay, drawMinimap.
//  Выключить: ?ver86=0 или localStorage pm_ver86 = '0'.
// =====================================================================
var VER86 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('ver86') === '0') return false; return localStorage.getItem('pm_ver86') !== '0'; } catch (e){ return true; } })(),
  L: [], err: {}, lt: null, seed: 1, nid: 0, clouds: [], warnT: -99, sayT: -99,
  stats: { spawned: 0, killed: 0, attacks: 0, hits: [0, 0], agro: 0, clouds: 0, avoided: 0, fed: 0, respawn: 0 },
  SP: {
    whip:  { n: ['Хлыстокорень', 'Whiproot', 'Rễ Roi'], hp: 160, h: 0.8, rad: 1.2, v: 0.15, agroR: 6.5, css: '#7dff8a' },
    spore: { n: ['Споровик', 'Sporecap', 'Nấm Bào Tử'], hp: 90, h: 1.0, rad: 0.95, v: 0.45, agroR: 8, css: '#d4ff6a' },
    shell: { n: ['Панцирник', 'Shellback', 'Mai Giáp'], hp: 600, h: 1.15, rad: 1.8, v: 0.6, run: 3.4, agroR: 6, css: '#9fe0c0' },
    tri:   { n: ['Треножник', 'Tristrider', 'Ba Chân'], hp: 220, h: 2.3, rad: 1.0, v: 1.1, run: 5.6, agroR: 14, css: '#a6ffd8' },
  },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('VER86 ' + tag, e); } } },
  lv(){ return typeof BIO86 !== 'undefined' ? BIO86.lv() : 2; },
  active(){ return this.on && !(typeof TUT !== 'undefined' && TUT.on) && !(typeof T72 !== 'undefined' && T72.on); },
  green(dir){ return typeof BIO86 === 'undefined' || !BIO86.on || BIO86.at(mul(dir, RM)) === 1; },
  name(f){ return N2(this.SP[f.sp].n); },
  freeAt(dir){
    for (const b of BASES) if (surfDist(dir, b) < 190) return false;
    for (const c of CPD) if (surfDist(dir, c) < 28) return false;
    if (typeof TER81 !== 'undefined' && TER81.ready && TER81.near(dir, 4)) return false;
    if (typeof A78 !== 'undefined') for (const a of A78.L) if (surfDist(dir, a.dir) < a.r + 6) return false;
    return abs(groundR(dir) - RM) < 14;
  },
  // ------------------------------------------------------------------ спавн: пары (точка и антипод), только в зелёном биоме
  spawn(seed){
    this.L = []; this.clouds = []; this.seed = seed >>> 0;
    if (!this.on) return;
    const rnd = seeded(this.seed ^ 0x5eed86), pairs = [3, 3, 4, 4][this.lv()];
    const kinds = ['whip', 'tri', 'spore', 'shell', 'whip', 'spore'];
    for (let i = 0; i < pairs; i++){
      const sp = kinds[i % kinds.length];
      for (let n = 0; n < 200; n++){
        const dir = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
        if (!this.green(dir) || !this.green(mul(dir, -1)) || !this.freeAt(dir) || !this.freeAt(mul(dir, -1))) continue;
        if (this.L.some(f => surfDist(f.dir, dir) < 60 || surfDist(f.dir, mul(dir, -1)) < 60)) continue;
        this.add(sp, dir, rnd); this.add(sp, mul(dir, -1), rnd);
        break;
      }
    }
  },
  add(sp, dir, rnd){
    const K = this.SP[sp], g = groundR(dir), fwd = tangent(anyTangent(dir), dir);
    const f = { ver86: sp, sp, id: ++this.nid, cls: 'fauna', team: 2, alive: true, hp: K.hp, maxhp: K.hp, rad: K.rad, dir, g, home: dir,
      up: dir, fwd, vel: [0, 0, 0], seen: [0, 0], flash: 0, st: 'calm', t: 0, tgt: null, agroT: 0, atkT: 0, senseT: rnd() * 0.3, gT: 0, goal: null, goalT: 0,
      ph: rnd() * 6.283, walk: 0, lash: 0, dead: 0, armor: 'fauna' };
    f.pos = add(mul(dir, g), mul(dir, K.h));
    this.L.push(f); this.stats.spawned++;
    return f;
  },
  // ------------------------------------------------------------------ симуляция
  robots(f, R){
    const L = [], R2 = R * R;
    for (const Ls of [S.units, S.vehicles]) for (const e of Ls){ if (!e.alive || !e.pos || e.tun82) continue; if (dist2(e.pos, f.pos) < R2 && len(e.pos) - f.g < 6) L.push(e); }
    return L;
  },
  step(dt){
    if (!this.active() || !this.L.length) return;
    for (const f of this.L) this.stepOne(f, dt);
    for (let i = this.clouds.length - 1; i >= 0; i--){
      const c = this.clouds[i]; c.t += dt;
      if (c.t > c.life){ this.clouds.splice(i, 1); continue; }
      c.tick -= dt;
      if (c.tick <= 0){ c.tick = 0.5; for (const e of this.robots({ pos: c.pos, g: len(c.pos) - 1 }, c.r)){ damage(e, 4, null, 'f'); if (e.cls === 'inf') e.suppT = max(e.suppT || 0, 0.7); this.stats.hits[e.team === 1 ? 1 : 0]++; } }
    }
    // респаун погибших через 2 минуты (снова в зелёной зоне, у дома или в антиподе)
    for (const f of this.L) if (!f.alive && f.dead > 120){ const d = random() < 0.5 ? f.home : mul(f.home, -1); if (this.freeAt(d)){ Object.assign(f, { alive: true, hp: f.maxhp, dir: d, g: groundR(d), st: 'calm', tgt: null, dead: 0, agroT: 0 }); f.pos = add(mul(d, f.g), mul(d, this.SP[f.sp].h)); this.stats.respawn++; } else f.dead = 100; }
  },
  agro(f, e, why){
    if (!e || !e.alive || !e.pos || e.team > 1) return;
    if (f.st !== 'agro') this.stats.agro++;
    f.st = 'agro'; f.tgt = e; f.agroT = f.sp === 'tri' ? 20 : 12;
    if (f.sp === 'spore' && S.time - (f.cloudT || -99) > 7) this.cloud(f);
    this.sfx('growl', f);
    if (!S.attract && S.mode === 'fps' && e === ctrlEntity() && S.time - this.warnT > 15){ this.warnT = S.time; feed(`🌱 ${this.name(f)}: ${tr('вердан разозлился!', 'the Verdan is angry!', 'Verdan nổi giận!')}`, this.SP[f.sp].css); }
  },
  cloud(f){
    f.cloudT = S.time; this.stats.clouds++;
    this.clouds.push({ pos: add(f.pos, mul(f.up, 0.8)), r: 6, t: 0, life: 6, tick: 0.2 });
    for (let i = 0; i < (this.lv() ? 4 : 2); i++) fxSmoke(add(f.pos, mul(randUnit(), 1.5)), 2.2, 0.55, 0.7);
    this.sfx('puff', f);
  },
  move(f, to, v, dt){
    const fw = tangent(sub(to, f.dir), f.dir); if (len(fw) < 1e-6) return 0;
    const F = norm(fw);
    f.fwd = norm(add(mul(f.fwd, 0.9), mul(F, 0.1 + dt * 3)));
    f.fwd = norm(tangent(f.fwd, f.dir));
    const nd = offsetOnSphere(f.dir, f.fwd, v * dt);
    if (typeof TER81 !== 'undefined' && TER81.ready && TER81.near(nd, 2)){ f.goal = null; return 0; }
    f.dir = nd; f.walk += v * dt;
    f.gT -= v * dt; if (f.gT <= 0){ f.gT = 0.8; f.g = groundR(f.dir); }
    return v;
  },
  stepOne(f, dt){
    const K = this.SP[f.sp];
    if (!f.alive){ f.dead += dt; return; }
    f.t += dt; f.flash = max(0, f.flash - dt * 4); f.lash = max(0, f.lash - dt); f.atkT -= dt;
    f.senseT -= dt;
    if (f.senseT <= 0){
      f.senseT = 0.3;
      if (f.st !== 'agro'){
        const near = this.robots(f, K.agroR);
        if (near.length) this.agro(f, near.reduce((b, e) => dist2(e.pos, f.pos) < dist2(b.pos, f.pos) ? e : b, near[0]), 'near');
      }
    }
    let v = 0;
    if (f.st === 'agro'){
      f.agroT -= dt;
      const e = f.tgt;
      if (!e || !e.alive || f.agroT <= 0 || dist(e.pos, f.pos) > 70){ f.st = 'calm'; f.tgt = null; }
      else {
        const d = dist(e.pos, f.pos) - (e.cls === 'tank' ? 2.5 : 0.5);
        if (f.sp === 'whip'){
          if (d < 6.5 && f.atkT <= 0){ f.atkT = 1.6; f.lash = 0.55; f.lashP = centerOf(e); this.later(0.35, () => { if (e.alive && dist(e.pos, f.pos) < 7.5 && f.alive) this.hit(f, e, 22, 4); }); }
          else if (d > 9) f.agroT = min(f.agroT, 1);
          f.fwd = norm(tangent(sub(e.pos, f.pos), f.dir));
        } else if (f.sp === 'spore'){
          if (S.time - (f.cloudT || -99) > 7 && d < 9) this.cloud(f);
          if (d > 10) f.agroT = min(f.agroT, 1.5);
        } else if (f.sp === 'shell'){
          if (d > 1.8) v = this.move(f, norm(e.pos), K.run, dt);
          if (d < 2.4 && f.atkT <= 0){ f.atkT = 2.2; this.hit(f, e, 40, 7); }
        } else if (f.sp === 'tri'){
          if (d > 1.6) v = this.move(f, norm(e.pos), K.run, dt);
          if (d < 2.6 && f.atkT <= 0){ f.atkT = 1.0; f.lash = 0.3; this.hit(f, e, 18, 2.5); }
        }
      }
    }
    if (f.st !== 'agro' && K.v > 0){
      // спокойные: бредут к жиле (питаются кристаллом) или по своей зелёной зоне
      f.goalT -= dt;
      if (!f.goal || f.goalT <= 0){
        f.goalT = 8 + random() * 10; f.goal = null;
        const V = typeof veins === 'function' ? veins() : [];
        let best = null, bd = 120;
        for (const vn of V){ const d = surfDist(vn.dir, f.dir); if (d < bd && this.green(vn.dir)){ bd = d; best = vn; } }
        if (best && random() < 0.6){ f.goal = offsetOnSphere(best.dir, anyTangent(best.dir), 5 + random() * 4); f.feed = 1; }
        else { const g = offsetOnSphere(f.home, norm(tangent(randUnit(), f.home)), random() * 35); if (this.green(g)) f.goal = g; f.feed = 0; }
      }
      if (f.goal){
        const d = surfDist(f.dir, f.goal);
        if (d > 1.5){ const nd = offsetOnSphere(f.dir, f.fwd, 1); if (this.green(nd) || !this.green(f.dir)) v = this.move(f, f.goal, K.v, dt); else f.goal = null; }
        else if (f.feed){ f.feed = 0; this.stats.fed++; }
      }
    }
    f.up = f.dir; f.pos = add(mul(f.dir, f.g), mul(f.dir, K.h + (f.sp === 'tri' ? 0.12 * Math.sin(f.walk * 3) : 0)));
    f.moving = v;
  },
  hit(f, e, dmg, push){
    if (!e.alive) return;
    damage(e, dmg, null, 'm');
    const v = tangent(sub(e.pos, f.pos), norm(e.pos));
    e.vel = add(e.vel, add(mul(norm(v), push * (e.cls === 'tank' ? 0.2 : 1)), mul(norm(e.pos), push * 0.4 * (e.cls === 'tank' ? 0.1 : 1)))); if (e.cls === 'inf') e.grounded = false;
    this.stats.attacks++; this.stats.hits[e.team === 1 ? 1 : 0]++;
    if (S.cam && dist2(e.pos, S.cam.pos) < 3600 && typeof FEEL76 !== 'undefined' && FEEL76.spray) FEEL76.spray(centerOf(e), null, 3, e.cls === 'inf' ? 3 : 0);
    this.sfx('lash', f);
    if (e.team === 0 && !S.attract && e.squad && e.squad === playerGroup() && S.time - this.sayT > 20){ this.sayT = S.time; if (typeof SQUADUI !== 'undefined') SQUADUI.say('v86_ver', e, null, 16); }
  },
  Q: [],
  // зелёный сок / слизь (частицы FEEL76, тип 9 — зелёный)
  sap(pos, n){
    if (typeof FEEL76 === 'undefined' || !FEEL76.P) return;
    const up = norm(pos);
    for (let i = 0; i < n; i++){ const l = 0.5 + random() * 0.5; FEEL76.P.push({ pos, vel: add(mul(randUnit(), 2.5), mul(up, 2 + random() * 2.5)), life: l, max: l, r: 0.045 + random() * 0.03, ty: 9, tl: 0.03, g: 7.5, drag: 0.4 }); }
  },
  later(t, fn){ this.Q.push({ t: S.time + t, fn }); },
  runQ(){ for (let i = this.Q.length - 1; i >= 0; i--) if (S.time >= this.Q[i].t){ const q = this.Q.splice(i, 1)[0]; this.safe(q.fn, 'q'); } },
  // урон по вердану: своя броня, огонь ×1.6, злится на обидчика; гибель — зелёный сок
  hurt(f, dmg, src, pt){
    if (!f.alive) return;
    const arm = f.sp === 'shell' ? { b: 0.3, m: 0.5, l: 0.6 } : { b: 0.85 };
    dmg *= arm[pt] !== undefined ? arm[pt] : 1;
    if (pt === 'f') dmg *= 1.6;
    f.hp -= dmg; f.flash = 1;
    if (S.cam && dist2(f.pos, S.cam.pos) < 6400) this.sap(f.pos, dmg > 30 ? 5 : 2);
    if (src && src.alive && src.pos && src.team < 2 && dist(src.pos, f.pos) < 80) this.agro(f, src, 'hurt');
    if (f.hp <= 0) this.die(f, src);
  },
  die(f, src){
    f.alive = false; f.dead = 0; f.st = 'dead'; this.stats.killed++;
    const c = f.pos;
    this.sap(c, 16);
    fxSmoke(c, 1.4, 0.35, 0.6);
    addLight(c, [0.6, 3, 1.2], 10, 0.5, 0.004);
    this.sfx('die', f);
    if (src && typeof isPlayerSrc === 'function' && isPlayerSrc(src) && !S.attract){
      if (typeof PROG !== 'undefined') PROG.award(10, tr('вердан', 'Verdan', 'Verdan'), 1, this.SP[f.sp].css);
      feed(`🌱 ${this.name(f)} — ${tr('уничтожен, брызги зелёного сока', 'destroyed, a spray of green sap', 'bị hạ, nhựa xanh văng ra')}`, this.SP[f.sp].css);
    }
  },
  // ИИ: спокойных обходит (10 м), разозлённых — бьёт (через findTarget)
  steer(u, inp, dt){
    if (!inp || !inp.wish || !this.L.length || len(inp.wish) < 0.01) return;
    u.v86T = (u.v86T || 0) - dt;
    if (u.v86T <= 0){ u.v86T = 0.4; u.v86f = null; let bd = 12; for (const f of this.L){ if (!f.alive || f.st === 'agro' && f.tgt === u) continue; const d = dist(f.pos, u.pos) - f.rad; if (d < bd){ bd = d; u.v86f = f; } } if (u.v86f) this.stats.avoided++; }
    const f = u.v86f; if (!f || !f.alive) return;
    const d = dist(f.pos, u.pos), lim = this.SP[f.sp].agroR + 3; if (d > lim) return;
    const Up = norm(u.pos), away = tangent(sub(u.pos, f.pos), Up);
    inp.wish = norm(add(inp.wish, mul(norm(away), clamp((lim - d) / 5, 0, 1) * 1.8)));
  },
  // ------------------------------------------------------------------ звук
  sfx(kind, f){
    if (typeof AU === 'undefined' || !AU.ready() || S.attract && !(typeof OPER !== 'undefined' && OPER.on)) return;
    const p = f.pos; if (!AU.allow(p, 90)) return;
    const t = AU.ctx.currentTime, o = AU.out(p, 0.3);
    if (kind === 'growl'){ AU.osc(o, t, 0.6, 'sawtooth', 70 + random() * 30, 45, 0.18); AU.nz(o, t, 0.5, 'bandpass', 500, 300, 2, 0.15, 0.05); }
    else if (kind === 'lash'){ AU.nz(o, t, 0.18, 'highpass', 2500, 900, 0.8, 0.5, 0.005); }
    else if (kind === 'puff'){ AU.nz(o, t, 0.9, 'lowpass', 900, 300, 0.7, 0.4, 0.05); }
    else if (kind === 'die'){ AU.nz(o, t, 0.6, 'lowpass', 1500, 200, 0.8, 0.5, 0.01); AU.osc(o, t, 0.5, 'sine', 220, 60, 0.15); }
  },
  // ------------------------------------------------------------------ отрисовка (ST70): тело + анимированные части
  seg(items, m, A, B, ref, w, glow, flash){
    const Y = sub(B, A), L = len(Y); if (L < 1e-4) return;
    const Yn = mul(Y, 1 / L), Z = norm(tangent(ref, Yn)), X = norm(cross(Yn, Z));
    items.push({ m, pos: A, X: mul(X, w), Y, Z: mul(Z, w), s: 1, team: 0, sh: 1, flash, glow });
  },
  collect(items){
    if (!this.active() || !S.cam) return;
    const cam = S.cam.pos, T = S.rtime, far = [70, 110, 160, 200][this.lv()], rts = S.mode !== 'fps' && !S.attract;
    for (const f of this.L){
      if (!f.alive && f.dead > 3) continue;
      const D = dist(f.pos, cam); if (D > (rts ? 400 : far)) continue;
      const Y = f.up, Z = f.fwd, X = norm(cross(Y, Z)), g = mul(f.dir, f.g), fl = f.flash * 0.8;
      const sh = f.alive ? 1 : max(0.05, 1 - f.dead / 3);   // мёртвый — сморщивается
      const pul = 0.6 + 0.4 * Math.sin(T * 2.2 + f.ph) + (f.st === 'agro' ? 0.6 : 0);
      const at = (x, y, z) => add(add(add(g, mul(X, x)), mul(Y, y)), mul(Z, z));
      if (f.sp === 'whip'){
        items.push({ m: 'v86whip', pos: g, X, Y, Z, s: sh, team: 0, sh: 1, flash: fl, glow: pul });
        if (!f.alive) continue;
        for (let k = 0; k < 3; k++){   // три лозы: покачиваются; при ударе одна хлещет к цели
          const a = f.ph + k * 2.1, base = at(Math.cos(a) * 0.5, 0.7, Math.sin(a) * 0.5);
          let tip;
          if (k === 0 && f.lash > 0 && f.lashP){ const q = 1 - f.lash / 0.55; tip = add(base, mul(sub(f.lashP, base), Math.sin(q * PI))); }
          else tip = at(Math.cos(a) * (1.4 + 0.3 * Math.sin(T * 1.3 + k)), 2.2 + 0.4 * Math.sin(T * 1.7 + k * 2), Math.sin(a) * (1.4 + 0.3 * Math.cos(T * 1.1 + k)));
          const mid = add(mul(add(base, tip), 0.5), mul(Y, 0.5));
          this.seg(items, 'v86vine', base, mid, X, 0.14, pul, fl); this.seg(items, 'v86vine', mid, tip, X, 0.09, pul, fl);
        }
      } else if (f.sp === 'spore'){
        items.push({ m: 'v86spore', pos: g, X, Y: mul(Y, 1 + 0.05 * Math.sin(T * 2 + f.ph)), Z, s: sh, team: 0, sh: 1, flash: fl, glow: pul });
      } else if (f.sp === 'shell'){
        const bob = 0.05 * Math.sin(f.walk * 4);
        items.push({ m: 'v86shell', pos: add(g, mul(Y, 0.55 + bob)), X, Y, Z, s: sh, team: 0, sh: 1, flash: fl, glow: pul });
        if (!f.alive) continue;
        for (let k = 0; k < 4; k++){ const sx = k % 2 ? 1 : -1, sz = k < 2 ? 1 : -1, sw = 0.35 * Math.sin(f.walk * 4 + k * PI / 2 + (k > 1 ? PI : 0));
          const hip = at(sx * 1.1, 0.75, sz * 0.9), foot = at(sx * 1.6, 0.02, sz * 1.0 + sw);
          this.seg(items, 'v86leg', hip, foot, Z, 0.2, pul, fl); }
      } else if (f.sp === 'tri'){
        const bodyP = sub(f.pos, mul(Y, 0.1));
        items.push({ m: 'v86tri', pos: bodyP, X, Y, Z, s: sh, team: 0, sh: 1, flash: fl, glow: pul });
        if (!f.alive) continue;
        for (let k = 0; k < 3; k++){   // три ноги, шаг по кругу; колено — вверх-наружу
          const a = k * 2.094 + 0.5, ph = f.walk * 2.2 + k * 2.094, lift = max(0, Math.sin(ph)) * 0.45 * (f.moving ? 1 : 0);
          const hip = add(bodyP, add(mul(X, Math.cos(a) * 0.45), mul(Z, Math.sin(a) * 0.45)));
          const foot = at(Math.cos(a) * 1.6 + (f.moving ? Math.cos(ph) * 0.4 * Z[0] * 0 : 0), lift, Math.sin(a) * 1.6 + (f.moving ? Math.cos(ph) * 0.5 : 0));
          const knee = add(mul(add(hip, foot), 0.5), add(mul(Y, 0.9), mul(norm(sub(foot, f.pos)), 0.5)));
          this.seg(items, 'v86leg', hip, knee, Z, 0.11, pul, fl); this.seg(items, 'v86leg', knee, foot, Z, 0.08, pul, fl);
        }
      }
    }
  },
  parts(n){
    if (!this.active() || !S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP, T = S.rtime, cam = S.cam.pos;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    for (const c of this.clouds){ if (dist2(c.pos, cam) > 6400) continue; for (let i = 0, m = this.lv() ? 6 : 3; i < m; i++){ const p = add(c.pos, mul(norm([Math.sin(i * 7.1 + T), Math.cos(i * 3.3 + T * 0.7), Math.sin(i * 1.9 - T * 0.5)]), c.r * 0.6 * ((i * 0.37) % 1 + 0.3))); push(p, 0.05, add(p, mul(norm(p), 0.05)), 9); } }
    // светлячки-споры над спокойными споровиками и кристаллы-«глаза» треножника — по 1–2 частицы рядом с камерой
    for (const f of this.L){ if (!f.alive || dist2(f.pos, cam) > 1600) continue; if (f.sp === 'spore'){ const p = add(f.pos, mul(f.up, 1 + 0.5 * Math.sin(T + f.ph))); push(add(p, mul(f.fwd, Math.sin(T * 1.3) * 0.8)), 0.03, p, 9); } }
    return n;
  },
  overlay(){
    const c = ctrlEntity(); if (!c || !c.pos || !this.active()) return;
    const W = innerWidth, H = innerHeight;
    octx.save(); octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", sans-serif';
    for (const f of this.L){
      if (!f.alive) continue; const d = dist(f.pos, c.pos); if (d > 32) continue;
      const s = project(add(f.pos, mul(f.up, 2.2))); if (!s || hypot(s[0] - W / 2, s[1] - H / 2) < 80) continue;
      octx.globalAlpha = clamp(1.3 - d / 32, 0.35, 1); octx.fillStyle = this.SP[f.sp].css;
      octx.fillText(`🌱 ${this.name(f)}${f.st === 'agro' ? ' · ' + tr('ЗОЛ', 'ANGRY', 'GIẬN') : ''} · ${Math.round(f.hp)}/${f.maxhp}`, s[0], s[1]);
    }
    octx.restore();
  },
  minimap(){
    const c = ctrlEntity(); if (!c || !c.pos || !this.active() || (typeof M67 !== 'undefined' && M67.active && M67.active())) return;
    const R = 82, cx = 18 + R, cy = innerHeight - 18 - R, range = 170, k = R / range;
    const my = norm(c.pos), fwd = tangent(c.cls === 'inf' ? c.fwd : (c.aim || c.fwd), my), right = norm(cross(fwd, my));
    octx.save();
    for (const f of this.L){
      if (!f.alive) continue; const dn = f.dir, s = acos(clamp(dot(dn, my), -1, 1)) * RM; if (s > 60) continue;
      const t = tangent(sub(dn, mul(my, dot(dn, my))), my), px = cx + dot(t, right) * s * k, py = cy - dot(t, fwd) * s * k;
      octx.fillStyle = f.st === 'agro' ? '#ff5a3a' : this.SP[f.sp].css; octx.beginPath(); octx.arc(px, py, 2.6, 0, 6.283); octx.fill();
    }
    octx.restore();
  },
};
// ------------------------------------------------------------------ модели (1 — матовый цвет, 2 — металл/хитин с бликом, 5 — свечение)
if (typeof ST70_DEF !== 'undefined'){
  const rnd = seeded(8686), FL = [0.10, 0.20, 0.09], FL2 = [0.16, 0.12, 0.20], SK = [0.06, 0.09, 0.06], GL = [0.4, 2.2, 0.9], GL2 = [1.6, 2.2, 0.4];
  Object.assign(ST70_DEF, {
    v86whip(){   // корневище: бугристая луковица, корни-щупальца по земле, светящиеся почки
      const g = G69();
      st70lathe(g, 0, 0, 0, [[-0.05, 0.2], [0.05, 0.55], [0.3, 0.7], [0.62, 0.62], [0.9, 0.35], [0.95, 0]], 10, FL, 1);
      for (let i = 0; i < 7; i++){ const a = i * 0.9 + rnd() * 0.5, L = 1.2 + rnd() * 1.4; g69tube(g, [Math.cos(a) * 0.45, 0.15, Math.sin(a) * 0.45], [Math.cos(a) * L, 0.0, Math.sin(a) * L], 0.12, 0.03, 4, SK, 1); }
      for (let i = 0; i < 6; i++){ const a = rnd() * 6.283, y = 0.3 + rnd() * 0.5; g69box(g, [Math.cos(a) * 0.62, y, Math.sin(a) * 0.62], [0.08, 0.1, 0.08], 0.05, GL, 5); }
      g69box(g, [0, 0.98, 0], [0.18, 0.08, 0.18], 0.06, GL, 5);
      return g;
    },
    v86vine(){ const g = G69(); g69tube(g, [0, 0, 0], [0, 1, 0], 1, 0.7, 5, [0.12, 0.26, 0.08], 1); g69box(g, [0.6, 0.6, 0], [0.35, 0.05, 0.35], 0.04, GL, 5); return g; },
    v86spore(){   // гриб: толстая ножка на корешках, асимметричная шляпка со светящимися пластинками и пятнами
      const g = G69();
      g69tube(g, [0, 0, 0], [0.1, 0.95, 0.05], 0.28, 0.18, 8, [0.32, 0.30, 0.22], 1);
      for (let i = 0; i < 4; i++){ const a = i * 1.57 + 0.4; g69tube(g, [0, 0.12, 0], [Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6], 0.09, 0.03, 4, SK, 1); }
      g69with(g, M34.ch(M34.T(0.1, 0.95, 0.05), M34.RZ(0.15)), () => {
        st70lathe(g, 0, 0, 0, [[0.0, 0.2], [-0.02, 0.85], [0.05, 0.95], [0.28, 0.8], [0.48, 0.45], [0.55, 0]], 14, FL2, 1);
        st70lathe(g, 0, -0.04, 0, [[-0.02, 0.2], [-0.04, 0.86], [0.0, 0.82], [0.02, 0.2]], 14, GL2, 5);
        for (let i = 0; i < 6; i++){ const a = rnd() * 6.283, r = 0.25 + rnd() * 0.5; g69box(g, [Math.cos(a) * r, 0.5 - r * 0.35, Math.sin(a) * r], [0.07, 0.04, 0.07], 0.03, GL, 5); }
      });
      return g;
    },
    v86shell(){   // панцирник: купол из пластин хитина, светящиеся щели между ними, морда с «усами»
      const g = G69();
      st70lathe(g, 0, -0.2, 0, [[-0.3, 0], [-0.25, 1.2], [0.0, 1.5], [0.3, 1.45], [0.7, 1.1], [0.95, 0.6], [1.0, 0]], 14, [0.18, 0.2, 0.12], 2);
      for (let i = 0; i < 6; i++){ const a = i * 1.047; g69with(g, M34.ch(M34.RY(a), M34.T(0, 0.55, 0.85), M34.RX(-0.6)), () => g69box(g, [0, 0, 0], [0.45, 0.06, 0.4], 0.05, [0.24, 0.26, 0.16], 2)); }
      for (let i = 0; i < 6; i++){ const a = i * 1.047 + 0.52; g69with(g, M34.ch(M34.RY(a), M34.T(0, 0.45, 1.0), M34.RX(-0.7)), () => g69box(g, [0, 0, 0], [0.05, 0.03, 0.3], 0.02, GL, 5)); }
      g69box(g, [0, -0.05, 1.45], [0.45, 0.3, 0.3], 0.2, FL, 1);
      for (const s of [-1, 1]){ g69box(g, [s * 0.22, 0.08, 1.72], [0.07, 0.07, 0.04], 0.03, GL2, 5); g69tube(g, [s * 0.3, -0.1, 1.7], [s * 0.9, -0.3, 2.4], 0.04, 0.01, 4, SK, 1); }
      return g;
    },
    v86leg(){ const g = G69(); g69tube(g, [0, 0, 0], [0, 1, 0], 1, 0.6, 6, [0.14, 0.17, 0.10], 2); g69box(g, [0, 0.5, 0.9], [0.4, 0.12, 0.25], 0.08, GL, 5); return g; },
    v86tri(){   // треножник: вытянутое тело-стручок, три светящихся глаза, гребень, жвалы
      const g = G69();
      g69with(g, M34.RX(PI / 2), () => st70lathe(g, 0, -1.1, 0, [[0, 0], [0.2, 0.35], [0.7, 0.5], [1.4, 0.45], [2.0, 0.28], [2.3, 0]], 10, FL, 1));
      for (let i = 0; i < 3; i++) g69box(g, [(i - 1) * 0.2, 0.25, 1.05 - abs(i - 1) * 0.08], [0.07, 0.07, 0.05], 0.035, GL2, 5);
      for (let i = 0; i < 5; i++) g69box(g, [0, 0.45 - i * 0.02, 0.6 - i * 0.35], [0.03, 0.12 - i * 0.015, 0.1], 0.02, GL, 5);
      for (const s of [-1, 1]) g69tube(g, [s * 0.18, -0.15, 1.05], [s * 0.3, -0.45, 1.5], 0.05, 0.01, 4, [0.3, 0.32, 0.2], 2);
      return g;
    },
  });
}
Object.assign(CHAT, {
  v86_ver: [['Вердан! Эта трава кусается!', 'A Verdan! This plant bites!', 'Verdan! Cây này cắn!'], ['Не трогайте растения — они злятся!', "Don't touch the plants — they get angry!", 'Đừng chạm vào cây — chúng nổi giận!']],
});
// ------------------------------------------------------------------ хуки
if (VER86.on){
  { const rt0 = rebuildTargets; rebuildTargets = function(){ rt0.apply(this, arguments); if (VER86.L.length && VER86.active()) for (const f of VER86.L) if (f.alive){ TGT[0].push(f); TGT[1].push(f); } }; }
  { const dm0 = damage; damage = function(e, dmg, src, pt){ if (e && e.ver86){ VER86.safe(() => VER86.hurt(e, dmg, src, pt || 'b'), 'hurt'); return; } return dm0.apply(this, arguments); }; }
  // ИИ стреляет по вердану, только если тот напал на его команду или подошёл вплотную (иначе — обходит)
  { const ft0 = findTarget; findTarget = function(src, team, eye, opts){
      const L = TGT[team];
      if (!L || !VER86.L.length || !eye) return ft0.apply(this, arguments);
      if (!L.some(e => e.ver86)) return ft0.apply(this, arguments);
      TGT[team] = L.filter(e => !e.ver86 || (e.st === 'agro' && e.tgt && e.tgt.team === team) || dist2(e.pos, eye) < 100);
      try { return ft0.apply(this, arguments); } finally { TGT[team] = L; }
    }; }
  { const bi0 = botInput; botInput = function(u, dt){ const inp = bi0.apply(this, arguments); if (!u.leapT && !u.skyState && !u.a86) VER86.safe(() => VER86.steer(u, inp, dt), 'steer'); return inp; }; }
  { const ti0 = tankInput; tankInput = function(v, dt){ const inp = ti0.apply(this, arguments); VER86.safe(() => VER86.steer(v, inp, dt), 'steerT'); return inp; }; }
  { const up0 = update; update = function(rdt){ up0(rdt); if (S.paused) return; const dt = clamp(S.time - (VER86.lt === null ? S.time : VER86.lt), 0, 0.1); VER86.lt = S.time; if (dt > 0) VER86.safe(() => { VER86.runQ(); VER86.step(dt); }, 'step'); }; }
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); VER86.lt = null; VER86.Q = []; VER86.safe(() => VER86.spawn(((Date.now() * 2246822519) ^ 0x86) >>> 0), 'spawn'); return r; }; }
  if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect; ST70.collect = function(){ c0.apply(this, arguments); VER86.safe(() => VER86.collect(this.items), 'collect'); }; }
  { const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); const m = VER86.safe(() => VER86.parts(n), 'par'); return m === undefined ? n : m; }; }
  { const do0 = drawOverlay; drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (!S.attract && S.mode === 'fps' && !(typeof OPER !== 'undefined' && OPER.on) && !(typeof M74 !== 'undefined' && M74.nohud)) VER86.safe(() => VER86.overlay(), 'ov'); return r; }; }
  { const dmm0 = drawMinimap; drawMinimap = function(){ const r = dmm0.apply(this, arguments); VER86.safe(() => VER86.minimap(), 'mm'); return r; }; }
}
