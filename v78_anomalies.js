// =====================================================================
//  v7.8 — ANOMALIES, wave 1 (inspired by S.T.A.L.K.E.R., own names and look) — everything lives in this file.
//  Kinds: «Поющая жила» / Singing Vein (green crystal, hums, rhythmic telegraphed pulses), «Омут» / Whirlpool
//  (pulls and slams), «Трескун» / Crackler (arcs between rods), «Жаровня» / Brazier (flame burst when stepped on),
//  «Кислый туман» / Acid mist (drifting green haze, damage over time), «Линза» / Lens (drifting space distortion,
//  bends bullets, F.E.A.R.-like screen warp).
//  • You feel them in advance: hum (one shared positional voice), glow lights, heat/lens distortion, floating rocks.
//  • Discharge: any explosion (grenade, rocket, artillery) or a thrown bolt (E / phone «Enter» near an anomaly) —
//    it fires once, then sleeps 20–35 s. Sometimes it leaves an artifact (a plus and a minus, 3 minutes).
//  • Static ones and drifting ones (mist, lens); spawned away from bases; the strategist sees them on the map only
//    after a scan (◎ recon). Squads warn over the radio; bots usually walk around, sometimes blunder in (traps).
//  • No blood: sparks and coolant (FEEL76.spray). Cheap: ≤ 15 anomalies, lite/phone/Dendy — 8, fewer particles.
//  Hooks (wrappers only): update, newMatch, splash, damage, botInput, tankInput, V2.aiInput, gunShoot, playerInput,
//  nearbyInteract, interact, gatherObjects, gatherParticles, gatherLights, gatherDistortion, drawOverlay,
//  drawMinimap, drawRTSOverlay, drawRTSMinimap, SAVE.save/load, M67.nearUse. Off: ?a78=0 / pm_a78=0 / Settings.
// =====================================================================
if (SET_DEF.a78 === undefined) SET_DEF.a78 = true;
if (SET.a78 === undefined) SET.a78 = true;
const A78 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('a78') === '0') return false; return localStorage.getItem('pm_a78') !== '0'; } catch (e){ return true; } })(),
  L: [], arts: [], bolt: null, seed: 1, err: {}, art: null, lt: null, scanT: 0, warnT: -99, trapT: -99, hurtT: -99, revT: 0, revSay: -99, sndT: 0, hum: null, boltCd: 0,
  stats: { pulses: 0, hits: [0, 0], trapped: [0, 0], kills: [0, 0], warned: 0, discharged: 0, bolts: 0, arts: 0, blunders: 0, avoided: 0, revealed: 0 },
  K: {
    vein: { n: ['Поющая жила', 'Singing Vein', 'Mạch Ngân'], r: 7, css: '#7dffb0', icon: '♫' },
    grav: { n: ['Омут', 'Whirlpool', 'Xoáy Hút'], r: 5.5, css: '#c9a2ff', icon: '◎' },
    arc:  { n: ['Трескун', 'Crackler', 'Lưới Điện'], r: 6, css: '#9fd4ff', icon: 'ϟ' },
    burn: { n: ['Жаровня', 'Brazier', 'Lò Than'], r: 3.4, css: '#ffae6a', icon: '♨' },
    mist: { n: ['Кислый туман', 'Acid mist', 'Sương Axit'], r: 7, css: '#b6ff7a', icon: '☁', drift: 0.32 },
    lens: { n: ['Линза', 'Lens', 'Thấu Kính'], r: 6, css: '#e6e6ff', icon: '◌', drift: 0.45 },
  },
  AK: {
    pulse: { n: ['Пульс-кристалл', 'Pulse crystal', 'Tinh thể Nhịp'], p: ['броня +25 %', 'armour +25%', 'giáp +25%'], m: ['скорость −12 %', 'speed −12%', 'tốc độ −12%'], css: '#7dffb0' },
    grav:  { n: ['Гравиядро', 'Gravity core', 'Lõi Trọng lực'], p: ['ранец ×1.6', 'jetpack ×1.6', 'ba lô ×1.6'], m: ['урон по тебе +15 %', 'damage taken +15%', 'nhận sát thương +15%'], css: '#c9a2ff' },
  },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('a78 ' + tag, e); } } },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  active(){ return this.on && SET.a78 !== false && !(typeof TUT !== 'undefined' && TUT.on) && !(typeof T72 !== 'undefined' && T72.on); },
  name(a){ return N2(this.K[a.k].n); },
  dorm(a){ return a.dormT > S.time; },
  ring(a, R, h, ang){ return add(add(a.pos, mul(a.dir, h)), add(mul(a.t1, cos(ang) * R), mul(a.t2, sin(ang) * R))); },
  frame(a){ a.t1 = anyTangent(a.dir); a.t2 = cross(a.dir, a.t1); },
  // ------------------------------------------------------------------ spawn (away from bases, capture pads, props, ore veins)
  freeAt(dir, r, V){
    for (const b of BASES) if (surfDist(dir, b) < 185) return false;
    for (const c of CPD) if (surfDist(dir, c) < 26 + r) return false;
    for (const p of PROPS) if (surfDist(dir, p.dir) < p.bound + r + 2) return false;
    for (const v of V) if (surfDist(dir, v.dir) < 18 + r) return false;
    for (const a of this.L) if (surfDist(dir, a.dir) < 46) return false;
    return true;
  },
  spawn(seed){
    this.seed = seed >>> 0; this.L = []; this.arts = []; this.bolt = null; this.art = null;
    if (!this.on || SET.a78 === false || typeof PROPS === 'undefined' || !PROPS.length) return;
    const rnd = seeded(this.seed), lite = this.lite();
    const plan = lite ? ['vein', 'vein', 'grav', 'arc', 'burn', 'burn', 'mist', 'lens']
                      : ['vein', 'vein', 'vein', 'grav', 'grav', 'grav', 'arc', 'arc', 'burn', 'burn', 'burn', 'mist', 'mist', 'lens', 'lens'];
    const V = typeof veins === 'function' ? veins() : [];
    for (const k of plan){
      const r = this.K[k].r;
      for (let n = 0; n < 60; n++){
        let dir;
        // more than half near capture points — that is where people actually walk
        if (rnd() < 0.55){ const c = CPD[floor(rnd() * CPD.length)]; dir = offsetOnSphere(c, norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), 34 + rnd() * 62); }
        else dir = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
        if (!this.freeAt(dir, r, V)) continue;
        const g = groundR(dir); if (abs(g - RM) > 14) continue;
        const t0 = anyTangent(dir), t1 = cross(dir, t0), m = r * 0.7 / RM;
        let lo = g, hi = g;
        for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const h = groundR(norm(add(dir, add(mul(t0, u * m), mul(t1, v * m))))); lo = min(lo, h); hi = max(hi, h); }
        if (hi - lo > 2.6) continue;
        this.L.push(this.make(k, dir, g, rnd, lite));
        break;
      }
    }
  },
  make(k, dir, g, rnd, lite){
    const K = this.K[k];
    const a = { id: this.L.length, k, dir, g, pos: mul(dir, g), r: K.r, st: 'idle', t: 0, dormT: 0, ph: rnd() * 6.283, known0: false, seen0: false, warnT: -999,
                occ: [], vel: [0, 0, 0], cnt: 0, hitT: 0, arcT: 0, tick: 0, ringT: -99, ringR: K.r, zap: null, fxT: 0, groundT: 0, disch: false };
    this.frame(a);
    if (k === 'vein'){
      const C = lite ? [[0, 0, 8]] : [[0, 0, 8], [2.5, 1.2, 9], [2.2, 3.9, 10]];
      a.cry = C.map(([d, ang, v]) => {
        const dd = d ? offsetOnSphere(dir, add(mul(a.t1, cos(ang)), mul(a.t2, sin(ang))), d) : dir;
        const gr = groundR(dd), f = tangent(add(mul(a.t1, -sin(ang + 1)), mul(a.t2, cos(ang + 1))), dd);
        return { dir: dd, pos: mul(dd, gr - 0.15), v, fwd: f, e: { phase: 0 } };
      });
    }
    if (k === 'arc') a.rods = [0, 1, 2].map(i => { const ang = a.ph + i * 2.094; const dd = offsetOnSphere(dir, add(mul(a.t1, cos(ang)), mul(a.t2, sin(ang))), 3.3); return mul(dd, groundR(dd)); });
    if (K.drift) a.vel = mul(tangent([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], dir), K.drift);
    return a;
  },
  // ------------------------------------------------------------------ simulation
  within(a, R){
    const L = [], R2 = R * R;
    for (const Ls of [S.units, S.vehicles]) for (const e of Ls){
      if (!e.alive || !e.pos) continue;
      if (dist2(e.pos, a.pos) > R2) continue;
      if (len(e.pos) - a.g > 4.5) continue;   // jet over it — safe
      L.push(e);
    }
    return L;
  },
  sense(){ for (const a of this.L) a.occ = this.dorm(a) ? [] : this.within(a, a.r + (a.k === 'arc' && a.occ ? 1 : 0.6)); },
  step(){
    const dt = clamp(S.time - (this.lt === null ? S.time : this.lt), 0, 0.1); this.lt = S.time;
    if (!this.active() || dt <= 0) return;
    if (this.L.length){
      this.scanT -= dt; if (this.scanT <= 0){ this.scanT = 0.15; this.sense(); }
      for (const a of this.L) this.stepOne(a, dt);
    }
    this.stepBolt(dt); this.stepArts(dt); this.artStep(dt);
    this.revT -= dt; if (this.revT <= 0){ this.revT = 0.5; this.reveal(); this.warnStep(); }
  },
  drift(a, dt){
    const K = this.K[a.k];
    if (random() < dt * 0.25) a.vel = mul(tangent(add(a.vel, mul(randUnit(), K.drift * 0.8)), a.dir), K.drift);
    for (const b of BASES) if (surfDist(a.dir, b) < 190) a.vel = mul(tangent(sub(a.dir, b), a.dir), K.drift);
    for (const c of CPD) if (surfDist(a.dir, c) < 22) a.vel = mul(tangent(sub(a.dir, c), a.dir), K.drift);
    a.dir = norm(add(a.dir, mul(a.vel, dt / RM)));
    a.groundT -= dt;
    if (a.groundT <= 0){ a.groundT = 0.5; a.g = groundR(a.dir); this.frame(a); a.vel = mul(tangent(a.vel, a.dir), K.drift); }
    a.pos = mul(a.dir, a.g);
  },
  stepOne(a, dt){
    if (this.dorm(a)){ a.st = 'dorm'; return; }
    if (a.st === 'dorm'){ a.st = 'idle'; a.t = 0; }
    a.t += dt;
    if (this.K[a.k].drift) this.drift(a, dt);
    const occ = a.occ.filter(e => e.alive);
    switch (a.k){
      case 'vein':
        if (a.st === 'idle'){ if (occ.length){ a.st = 'charge'; a.t = 0; this.sfx('charge', a); } }
        else if (a.st === 'charge'){ if (a.t >= 1.3){ this.fire(a, 1); a.st = 'cool'; a.t = 0; } }
        else if (a.st === 'cool' && a.t >= 1.9){ a.st = occ.length ? 'charge' : 'idle'; a.t = 0; if (a.st === 'charge') this.sfx('charge', a); }
        break;
      case 'grav':
        if (a.st === 'idle'){ if (occ.length){ a.st = 'charge'; a.t = 0; this.sfx('pull', a); } }
        else if (a.st === 'charge'){
          for (const e of this.within(a, a.r * 1.5)){
            const to = sub(add(a.pos, mul(a.dir, 1.2)), e.pos), d = len(to) || 1, k = e.cls === 'tank' ? 0.25 : 1;
            e.vel = add(e.vel, mul(to, dt * 15 * k / d)); e.grounded = false;
          }
          if (a.t >= 1.1){ this.fire(a, 1); a.st = 'cool'; a.t = 0; }
        } else if (a.st === 'cool' && a.t >= 5){ a.st = 'idle'; a.t = 0; }
        break;
      case 'arc':
        a.arcT -= dt;
        if (a.arcT <= 0){ a.arcT = 0.25 + random() * 0.6; const i = floor(random() * 3), j = (i + 1 + floor(random() * 2)) % 3; a.zap = { p: add(a.rods[i], mul(a.dir, 3)), q: add(a.rods[j], mul(a.dir, 3)), until: S.rtime + 0.12 }; if (random() < 0.35) this.sfx('crackS', a); }
        if (a.st === 'cool'){ if (a.t > 2.5){ a.st = 'idle'; a.t = 0; } break; }
        if (occ.length){
          a.hitT -= dt;
          if (a.hitT <= 0){
            a.hitT = 0.7;
            let best = occ[0], bd = 1e9;
            for (const e of occ){ const d = dist(e.pos, a.pos) - (e.cls === 'tank' ? 3 : 0); if (d < bd){ bd = d; best = e; } }   // armour attracts the arc
            this.strike(a, best, 28);
            if (++a.cnt >= 4){ a.st = 'cool'; a.t = 0; a.cnt = 0; }
          }
        } else a.hitT = min(a.hitT, 0.25);
        break;
      case 'burn':
        if (a.st === 'idle'){ if (occ.length){ a.st = 'charge'; a.t = 0; this.sfx('whoosh', a); } }
        else if (a.st === 'charge'){ if (a.t >= 0.35){ a.st = 'fire'; a.t = 0; a.tick = 0; this.stats.pulses++; } }
        else if (a.st === 'fire'){
          a.fxT -= dt;
          if (a.fxT <= 0){ a.fxT = this.lite() ? 0.22 : 0.12; S.fx.push({ type: 'fire', pos: this.ring(a, random() * a.r * 0.7, 0.7 + random() * 1.6, random() * 6.283), r0: 0.4, r1: 1.5, life: 0.5, t: 0, inten: 0.8 }); if (S.fx.length > 80) S.fx.splice(0, S.fx.length - 80); }
          a.tick -= dt;
          if (a.tick <= 0){ a.tick = 0.25; for (const e of this.within(a, a.r + 0.8)) this.hit(e, 8, 'f', a); }
          if (a.t >= 1.6){ a.st = 'cool'; a.t = 0; if (a.disch){ a.disch = false; a.dormT = S.time + 25; } }
        } else if (a.st === 'cool' && a.t >= 4){ a.st = 'idle'; a.t = 0; }
        break;
      case 'mist':
        a.tick -= dt;
        if (a.tick <= 0){ a.tick = 0.5; for (const e of occ) this.hit(e, 3.2, 'f', a); }
        break;
      case 'lens':
        for (const e of occ) if (e.cls === 'inf' && e !== S.me) e.suppT = max(e.suppT || 0, 0.6);   // warped sight: slow and missing
        break;
    }
  },
  // the main action of an anomaly (mul > 1 — bigger, on discharge)
  fire(a, mul){
    const up = a.dir, c = add(a.pos, mul_(up, 1.2));
    this.stats.pulses++;
    if (a.k === 'vein'){
      a.ringT = S.time; a.ringR = a.r * mul;
      for (const e of this.within(a, a.r * mul + 0.5)){ this.hit(e, 40 * (mul > 1 ? 1.3 : 1), 'l', a); this.push(e, a, 3.5, 2.2); }
      addWave(c, 1.6 * mul, 0.5); addLight(add(a.pos, mul_(up, 1.6)), [1.2, 7, 3], 16 * mul, 0.35, 0.01);
      this.sfx('zap', a);
    } else if (a.k === 'grav'){
      for (const e of this.within(a, a.r * mul + 0.5)){ this.hit(e, 65, 'x', a); this.push(e, a, e.cls === 'tank' ? 1.5 : 5, e.cls === 'tank' ? 2 : 8.5); }
      fxSmoke(c, 1.6, 0.25, 1.1); fxSmoke(add(c, mul_(a.t1, 1.5)), 1.2, 0.25, 0.9); burst(c, 14, 9, 0.5); addWave(c, 3 * mul, 0.6);
      emit('boom', { pos: c, size: 1.4 });
    } else if (a.k === 'arc'){
      for (const e of this.within(a, a.r * mul + 0.5)) this.strike(a, e, 40);
    } else if (a.k === 'burn'){
      a.st = 'fire'; a.t = 0; a.tick = 0; this.sfx('whoosh', a);
    } else if (a.k === 'lens'){
      for (const e of this.within(a, a.r * mul)) this.hit(e, 25, 'x', a);
      addWave(add(a.pos, mul_(up, 1.6)), 3.5, 0.7); this.sfx('zap', a);
    } else if (a.k === 'mist'){
      for (let i = 0; i < 3; i++) fxSmoke(this.ring(a, a.r * 0.5, 1, i * 2.1), 2.2, 0.12, 0.7);
      this.sfx('whoosh', a);
    }
  },
  strike(a, e, dmg){
    const rod = a.rods.reduce((b, r) => dist(r, e.pos) < dist(b, e.pos) ? r : b, a.rods[0]);
    a.zap = { p: add(rod, mul(a.dir, 3)), q: centerOf(e), until: S.rtime + 0.16, big: 1 };
    addLight(centerOf(e), [2, 3.5, 7], 12, 0.15, 0.01);
    this.hit(e, dmg, 'l', a);
    this.sfx('crack', a);
  },
  push(e, a, out, upv){
    const v = tangent(sub(e.pos, a.pos), a.dir);
    e.vel = add(e.vel, add(mul(v, out), mul(a.dir, upv))); e.grounded = false;
  },
  hit(e, dmg, pt, a){
    if (!e.alive) return;
    damage(e, dmg, null, pt);
    this.stats.hits[e.team === 1 ? 1 : 0]++;
    if (!e.alive) this.stats.kills[e.team === 1 ? 1 : 0]++;
    if (!e['a78h' + a.id]){ e['a78h' + a.id] = 1; this.stats.trapped[e.team === 1 ? 1 : 0]++; }
    if (S.cam && typeof FEEL76 !== 'undefined' && FEEL76.spray && dist2(e.pos, S.cam.pos) < 3600 && (e.cls === 'inf' || e.cls === 'tank')) FEEL76.spray(centerOf(e), null, 4, e.cls === 'inf' ? 3 : 0);
    this.onTrap(e, a, !e.alive);
  },
  onTrap(e, a, killed){
    if (S.attract || S.mode !== 'fps') return;
    const c = ctrlEntity(); if (!c || !c.pos) return;
    if (e.team === 1 && dist(e.pos, c.pos) < 150 && S.time - this.trapT > 22){
      this.trapT = S.time; this.trapSeen = (this.trapSeen || 0) + 1;
      if (!(typeof SQUADUI !== 'undefined' && SQUADUI.say('a78_trap', null, null, 18)) && killed) emit('radio', { text: tr('Враг попал в аномалию!', 'An enemy got caught in an anomaly!', 'Kẻ địch dính dị thường!'), pri: 0 });
      feed(`⚡ ${tr('Враг попал в аномалию', 'Enemy caught in an anomaly', 'Kẻ địch dính dị thường')}: ${this.name(a)}${killed ? ' — ' + tr('уничтожен', 'destroyed', 'bị hạ') : ''}`, this.K[a.k].css);
    } else if (e.team === 0 && e !== S.me && e.squad && e.squad === playerGroup() && S.time - this.hurtT > 20 && random() < 0.7){
      this.hurtT = S.time; if (typeof SQUADUI !== 'undefined') SQUADUI.say('a78_hurt', e, null, 16);
    }
  },
  discharge(a, by){
    if (!a || this.dorm(a)) return false;
    const sleep = { vein: 30, grav: 25, arc: 20, burn: 25, mist: 35, lens: 30 }[a.k];
    this.fire(a, a.k === 'mist' ? 1 : 1.25);
    if (a.k === 'burn'){ a.disch = true; } else { a.dormT = S.time + sleep; a.st = 'dorm'; }
    this.stats.discharged++;
    const mine = by && typeof isPlayerSrc === 'function' && isPlayerSrc(by);
    if (mine && !S.attract){
      if (typeof PROG !== 'undefined') PROG.award(15, tr('аномалия разряжена', 'anomaly discharged', 'xả dị thường'), 1, this.K[a.k].css);
      if (typeof addCmd === 'function') addCmd(0, 0.5);
      feed(`✓ ${this.name(a)}: ${tr('разряжена, спит', 'discharged, dormant for', 'đã xả, ngủ')} ${sleep} ${tr('с', 's', 'giây')} · +0.5 ${tr('КО', 'CP', 'ĐCH')}`, this.K[a.k].css);
      if (typeof SQUADUI !== 'undefined' && random() < 0.6) SQUADUI.say('a78_dis', null, null, 25);
    }
    this.dropArt(a);
    return true;
  },
  // explosions discharge anomalies (grenades, rockets, artillery — anything that calls splash())
  blast(p, radius, src){
    if (!this.active()) return;
    for (const a of this.L){
      if (this.dorm(a)) continue;
      if (dist(p, add(a.pos, mul(a.dir, 1))) < a.r + radius * 0.6) this.discharge(a, src);
    }
  },
  // ------------------------------------------------------------------ bolt (STALKER habit: throw something first)
  boltTarget(c){
    if (!this.active() || !c || c.cls !== 'inf' || S.attract || this.bolt) return null;
    let best = null, bd = 1e9;
    for (const a of this.L){ if (this.dorm(a)) continue; const d = dist(a.pos, c.pos); if (d < a.r + 16 && d < bd){ bd = d; best = a; } }
    return best;
  },
  throwBolt(a){
    const c = S.me; if (!c || this.bolt || S.rtime < this.boltCd) return;
    this.boltCd = S.rtime + 1.2;
    const eye = add(c.pos, mul(c.up, RULES.EYE)), to = add(a.pos, mul(a.dir, 0.6)), D = dist(eye, to);
    this.bolt = { a, from: eye, to, t: 0, T: clamp(D / 15, 0.45, 1.5), D };
    emit('throw', { pos: eye, src: c, me: true });
    this.stats.bolts++;
    if (typeof HINTS !== 'undefined') HINTS.used('a78bolt');
  },
  boltPos(b, k){ return add(add(mul(b.from, 1 - k), mul(b.to, k)), mul(norm(b.to), sin(PI * k) * b.D * 0.28)); },
  stepBolt(dt){
    const b = this.bolt; if (!b) return;
    b.t += dt;
    if (b.t >= b.T){ this.bolt = null; this.sfx('clink', b.a); this.discharge(b.a, S.me); }
  },
  // ------------------------------------------------------------------ artifacts: a plus and a minus, 3 minutes
  dropArt(a){
    if (this.arts.length >= 2) return;
    const ch = a.k === 'vein' ? 0.55 : a.k === 'grav' ? 0.45 : 0.15;
    if (random() > ch) return;
    const kind = a.k === 'vein' ? 'pulse' : a.k === 'grav' ? 'grav' : (random() < 0.5 ? 'pulse' : 'grav');
    const dir = a.k === 'vein' ? offsetOnSphere(a.dir, a.t1, 1.6) : a.dir;
    this.arts.push({ kind, dir, pos: mul(dir, groundR(dir) + 0.55), t: 0, life: 240 });
    if (!S.attract && S.cam && dist(a.pos, S.cam.pos) < 160) feed(`◈ ${tr('Аномалия оставила артефакт', 'The anomaly left an artifact', 'Dị thường để lại cổ vật')}: ${N2(this.AK[kind].n)}`, this.AK[kind].css);
  },
  stepArts(dt){
    for (let i = this.arts.length - 1; i >= 0; i--){
      const t = this.arts[i]; t.t += dt;
      if (t.t > t.life){ this.arts.splice(i, 1); continue; }
      const c = S.me;
      if (!S.attract && S.mode === 'fps' && c && c.alive && c.cls === 'inf' && dist(c.pos, t.pos) < 2.6){ this.arts.splice(i, 1); this.pick(t.kind); }
    }
  },
  pick(kind){
    const A = this.AK[kind];
    this.restoreJet();
    this.art = { k: kind, until: S.time + 180 };
    this.stats.arts++;
    feed(`◈ ${N2(A.n)}: + ${N2(A.p)}, − ${N2(A.m)} · 3 ${tr('мин', 'min', 'phút')}`, A.css);
    if (typeof AU !== 'undefined' && AU.ready()) AU.chime(true);
    if (typeof HINTS !== 'undefined') HINTS.used('a78art');
  },
  restoreJet(){ for (const u of S.units) if (u.jet && u.jet.a78) u.jet = jetOf(u); },
  artStep(){
    const A = this.art; if (!A) return;
    if (S.time > A.until || S.attract){ this.restoreJet(); this.art = null; if (!S.attract) feed(tr('◈ Артефакт выдохся', '◈ The artifact has faded', '◈ Cổ vật đã hết'), '#aaa'); return; }
    const c = ctrlEntity();
    if (A.k === 'grav' && c && c.cls === 'inf' && c.jet && !c.jet.a78) c.jet = Object.assign({}, c.jet, { emax: c.jet.emax * 1.6, rg: c.jet.rg * 1.25, a78: 1 });
  },
  // ------------------------------------------------------------------ AI: usually walk around, sometimes blunder in
  steer(u, inp, dt, base){
    if (!inp || !this.active() || !this.L.length || S.over) return;
    u.a78T = (u.a78T || 0) - dt;
    if (u.a78T <= 0){
      u.a78T = 0.3 + random() * 0.12;
      let best = -1, bd = 1e9;
      for (let i = 0; i < this.L.length; i++){ const a = this.L[i]; if (this.dorm(a)) continue; const d = dist(a.pos, u.pos) - a.r; if (d < 9 && d < bd){ bd = d; best = i; } }
      if (best >= 0 && best !== u.a78last){
        u.a78last = best;   // indices, not references: units are serialized into saves
        let p = base + (u.team === 1 ? 0.05 : 0);
        const sq = u.squad; if (sq && (sq.combat || sq.rush)) p += 0.12;
        if (u.target && u.target === ctrlEntity()) p += 0.12;   // chasing the player — the classic trap
        u.a78blunder = random() < p;
        if (u.a78blunder) this.stats.blunders++; else this.stats.avoided++;
      }
      u.a78A = best;
    }
    const a = this.L[u.a78A]; if (!a || this.dorm(a)) return;
    const d = dist(a.pos, u.pos), lim = a.r + 7; if (d > lim) return;
    const Up = norm(u.pos), away = tangent(sub(u.pos, a.pos), Up), k = clamp((lim - d) / 7, 0, 1) * 2.4;
    if (u.a78blunder){   // careless: cuts the corner straight through it
      if (len(inp.wish) > 0.01 && dot(inp.wish, away) < 0.3) inp.wish = norm(add(inp.wish, mul(away, -0.45)));
      return;
    }
    if (len(inp.wish) > 0.01) inp.wish = norm(add(inp.wish, mul(away, k)));
    else if (d < a.r + 1.5) inp.wish = away;
  },
  // ------------------------------------------------------------------ strategist sees anomalies only after a scan; squads warn over the radio
  reveal(){
    let n = 0;
    for (const z of S.scans){ if (z.team !== 0) continue; for (const a of this.L) if (!a.known0 && dist(a.pos, z.pos) < z.r + 10){ a.known0 = true; n++; } }
    if (!n) return;
    this.stats.revealed += n;
    if (S.attract) return;
    feed(`📡 ${tr('Разведка: аномалий в зоне', 'Recon: anomalies in the area', 'Trinh sát: dị thường trong vùng')} — ${n}. ${tr('Отмечены на карте', 'Marked on the map', 'Đã đánh dấu trên bản đồ')}`, '#9cf');
    if (S.rtime - this.revSay > 20){ this.revSay = S.rtime; emit('radio', { text: tr('Разведка: в районе аномалии, отметили на карте', 'Recon: anomalies in the area, marked on the map', 'Trinh sát: có dị thường, đã đánh dấu'), pri: 0 }); }
  },
  warnStep(){
    if (S.attract || S.mode !== 'fps' || S.over || S.rtime - this.warnT < 6) return;
    const c = ctrlEntity(); if (!c || c.cls === 'bld' || !c.fwd) return;
    const f = c.cls === 'inf' ? c.fwd : (c.aim || c.fwd);
    for (const a of this.L){
      if (this.dorm(a)) continue;
      const d = dist(a.pos, c.pos);
      if (d < 70) a.seen0 = true;
      if (d > 42 || S.time - a.warnT < 75) continue;
      if (dot(norm(sub(a.pos, c.pos)), f) < 0.2 && d > 20) continue;
      a.warnT = S.time; this.warnT = S.rtime; this.stats.warned++; this.lastWarn = a;
      const said = typeof SQUADUI !== 'undefined' && SQUADUI.say('a78_' + a.k, null, null, 8);
      const dm = Math.max(5, Math.round(d / 5) * 5);
      if (!said) emit('radio', { text: d < 8 ? tr('Внимание: аномалия рядом!', 'Caution: anomaly right here!', 'Chú ý: dị thường ngay đây!') : tr(`Внимание: аномалия впереди, метров ${dm}`, `Caution: anomaly ahead, ${dm} meters`, `Chú ý: dị thường phía trước, ${dm} mét`), pri: 0 });
      feed(`⚠ ${tr('Аномалия впереди', 'Anomaly ahead', 'Dị thường phía trước')}: ${this.name(a)} · ${Math.round(d)} ${tr('м', 'm', 'm')}`, this.K[a.k].css);
      break;
    }
  },
  // ------------------------------------------------------------------ bullets bend inside a lens
  bend(eye, dir, range){
    for (const a of this.L){
      if (a.k !== 'lens' || this.dorm(a)) continue;
      const c = add(a.pos, mul(a.dir, 1.6)), v = sub(c, eye), t = dot(v, dir);
      if (t < 0 || t > (range || 250)) continue;
      const off = sub(v, mul(dir, t)), d = len(off);
      if (d >= a.r || d < 1e-3) continue;
      dir = norm(add(dir, mul(off, 0.14 * (1 - d / a.r) / d)));
      this.bent = (this.bent || 0) + 1;
    }
    return dir;
  },
  // ------------------------------------------------------------------ sound: one shared positional hum + short event sounds
  sfx(kind, a){
    if (typeof AU === 'undefined' || !AU.ready() || S.attract && !OPER.on) return;
    const p = add(a.pos, mul(a.dir, 1)); if (!AU.allow(p, 160)) return;
    const t = AU.ctx.currentTime, o = AU.out(p, 0.3);
    if (kind === 'zap'){ AU.osc(o, t, 0.35, 'sawtooth', 1800, 220, 0.22); AU.osc(o, t, 0.5, 'sine', 240, 90, 0.4); AU.nz(o, t, 0.3, 'highpass', 3000, 900, 0.7, 0.3); }
    else if (kind === 'charge'){ AU.osc(o, t, 1.25, 'sine', 160, 520, 0.1, 0.4); AU.osc(o, t, 1.25, 'triangle', 320, 1040, 0.04, 0.5); }
    else if (kind === 'pull'){ AU.osc(o, t, 1.1, 'sine', 60, 30, 0.35, 0.3); AU.nz(o, t, 1.1, 'lowpass', 200, 900, 0.8, 0.3, 0.4); }
    else if (kind === 'crack'){ AU.nz(o, t, 0.12, 'highpass', 4500, 2000, 0.6, 0.55, 0.001); AU.osc(o, t, 0.08, 'square', 900, 300, 0.08); }
    else if (kind === 'crackS'){ AU.nz(o, t, 0.05, 'highpass', 6000, 3000, 0.6, 0.12, 0.001); }
    else if (kind === 'whoosh'){ AU.nz(o, t, 1.2, 'lowpass', 300, 1800, 0.6, 0.5, 0.15); }
    else if (kind === 'clink'){ AU.osc(o, t, 0.06, 'triangle', 2600, 2000, 0.1); AU.osc(o, t + 0.09, 0.05, 'triangle', 2300, 1900, 0.06); }
  },
  humInit(){
    const C = AU.ctx;
    const o = C.createOscillator(), o2 = C.createOscillator(), n = C.createBufferSource(), bp = C.createBiquadFilter(), gO = C.createGain(), gN = C.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = 110; o2.frequency.value = 221;
    n.buffer = AU.noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2;
    gO.gain.value = 0; gN.gain.value = 0;
    const pan = AU.mkPanner([0, 0, 0]);
    o.connect(gO); o2.connect(gO); n.connect(bp); bp.connect(gN); gO.connect(pan); gN.connect(pan);
    o.start(); o2.start(); n.start();
    this.hum = { o, o2, bp, gO, gN, pan };
  },
  humStep(){
    if (typeof AU === 'undefined' || !AU.ready() || !S.cam) return;
    if (!this.hum) this.safe(() => this.humInit(), 'hum');
    const H = this.hum; if (!H) return;
    const t = AU.ctx.currentTime, cp = S.cam.pos;
    let a = null, bd = 50;
    if (this.active() && (!S.attract || OPER.on) && !MENU.isOpen() && !S.paused) for (const x of this.L){ if (this.dorm(x)) continue; const d = dist(x.pos, cp); if (d < bd){ bd = d; a = x; } }
    let f = 110, f2 = 221, go = 0, gn = 0, bf = 900;
    if (a){
      const T = S.rtime;
      AU.setPos(H.pan, add(a.pos, mul(a.dir, 1)));
      if (a.k === 'vein'){ const ch = a.st === 'charge' ? min(1, a.t / 1.3) : 0; f = 105 + 140 * ch; f2 = f * 2.01; go = (0.07 + 0.03 * sin(T * 2.2 + a.ph)) * (1 + 1.6 * ch) * (0.6 + 0.4 * (0.5 + 0.5 * sin(T * 12 * (0.3 + ch)))); gn = 0.006; bf = 2400; }
      else if (a.k === 'grav'){ f = 42; f2 = 63; go = a.st === 'charge' ? 0.3 : 0.12; gn = 0.03; bf = 180; }
      else if (a.k === 'arc'){ f = 120; f2 = 240.6; go = 0.035; gn = a.zap && S.rtime < a.zap.until ? 0.12 : 0.03; bf = 3500; }
      else if (a.k === 'burn'){ f = 60; f2 = 90; go = 0.02; gn = a.st === 'fire' ? 0.25 : 0.05; bf = 700; }
      else if (a.k === 'mist'){ go = 0; gn = 0.05; bf = 5200; }
      else if (a.k === 'lens'){ f = 70 + 6 * sin(T * 1.7); f2 = 71.5; go = 0.09; gn = 0; }
    }
    H.o.frequency.setTargetAtTime(f, t, 0.08); H.o2.frequency.setTargetAtTime(f2, t, 0.08); H.bp.frequency.setTargetAtTime(bf, t, 0.1);
    H.gO.gain.setTargetAtTime(go, t, 0.15); H.gN.gain.setTargetAtTime(gn, t, 0.15);
  },
  // ------------------------------------------------------------------ rendering
  // the singing vein = real faceted emerald crystals of the ore-vein shader (object type 18, variants 8–10)
  objects(){
    if (!this.active() || !S.cam) return;
    const cam = S.cam.pos, rts = S.mode !== 'fps' && !S.attract;
    for (const a of this.L){
      if (a.k !== 'vein' || !a.cry || (rts && !a.known0)) continue;
      const d0 = dist(a.pos, cam); if (!rts && d0 > 340) continue;
      for (const c of a.cry){
        if (renderList.length >= MAXO) return;
        const up = c.dir, o = c.pos, bc = add(o, mul(up, 1.2)), br = c.v === 8 ? 3.4 : 2.4, k = renderList.length * 28;
        renderList.push({ e: c.e, origin: o, bc, br, type: 18, d: d0 });
        OBJ.set([bc[0], bc[1], bc[2], br, o[0], o[1], o[2], 18, up[0], up[1], up[2], 2, c.fwd[0], c.fwd[1], c.fwd[2], 0, c.fwd[0], c.fwd[1], c.fwd[2], 0, 0, 1, c.v, 0, 0, 0, 0, 0], k);
      }
    }
  },
  parts(n){
    if (!this.active() || !S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    const cam = S.cam.pos, rts = S.mode !== 'fps' && !S.attract, lite = this.lite(), T = S.rtime;
    let budget = lite ? 16 : 48;
    const L = this.L.filter(a => (!rts || a.known0) && dist2(a.pos, cam) < (rts ? 1e9 : 25600)).sort((p, q) => dist2(p.pos, cam) - dist2(q.pos, cam));
    for (const a of L){
      if (budget <= 0 || n >= pmax) break;
      const n0 = n, dorm = this.dorm(a);
      if (a.k === 'vein'){
        const m = dorm ? 0 : a.st === 'charge' ? (lite ? 4 : 9) : (lite ? 1 : 3), sp = a.st === 'charge' ? 0.9 : 0.25;
        for (let i = 0; i < m; i++){
          const ph = (T * sp + i / m) % 1, ang = a.ph + i * 2.4 + T * 0.3, R = (1 - ph) * a.r * 0.8 + 0.5, h = 0.2 + ph * 2.2;
          push(this.ring(a, R, h, ang), 0.05, this.ring(a, R + 0.25, h - 0.12, ang), 9);
        }
        const k = (S.time - a.ringT) / 0.45;
        if (k >= 0 && k < 1){ const seg = lite ? 8 : 16, R = a.ringR * (0.15 + 0.85 * k); for (let s = 0; s < seg; s++) push(this.ring(a, R, 0.35, s / seg * 6.283), 0.03 + 0.09 * (1 - k), this.ring(a, R, 0.35, (s + 1) / seg * 6.283), 9); }
      } else if (a.k === 'grav'){
        const pull = a.st === 'charge', sp = pull ? 3.2 : dorm ? 0.15 : 0.7, nr = lite ? 2 : 4;
        for (let i = 0; i < nr; i++){
          const ang = a.ph + i * 1.571 + T * sp, R = pull ? 2.4 * (1 - min(1, a.t / 1.1) * 0.6) : 2.4, h = (dorm ? 0.25 : 1.1) + (dorm ? 0 : 0.6 * sin(T * 1.3 + i));
          push(this.ring(a, R, h, ang), 0.2, this.ring(a, R, h + 0.22, ang + 0.15), 12.0);
        }
        if (!dorm && !lite) for (let i = 0; i < (pull ? 6 : 3); i++){ const ang = -T * sp * 1.6 + i * 2.1, R = a.r * (0.4 + 0.5 * ((T * 0.5 + i * 0.3) % 1)); push(this.ring(a, R, 0.3, ang), 0.03, this.ring(a, R, 0.3, ang + 0.3), 2); }
      } else if (a.k === 'arc'){
        for (const r of a.rods){ const top = add(r, mul(a.dir, 3)); push(sub(r, mul(a.dir, 0.2)), 0.09, top, 12.0); if (!dorm) push(top, 0.1, add(top, mul(a.dir, 0.06)), 4); }
        const z = a.zap;
        if (z && S.rtime < z.until && !dorm){
          const P = [z.p], jit = z.big ? 0.7 : 0.45;
          for (const f of [0.33, 0.66]) P.push(add(add(mul(z.p, 1 - f), mul(z.q, f)), mul(randUnit(), jit)));
          P.push(z.q);
          for (let i = 0; i < 3; i++) push(P[i], z.big ? 0.05 : 0.03, P[i + 1], 6);
        }
      } else if (a.k === 'burn'){
        if (!dorm) for (let i = 0, m = lite ? 2 : 5; i < m; i++){
          const ph = (T * 0.6 + i * 0.21 + a.ph) % 1, ang = a.ph * 3 + i * 1.9 + ph, R = a.r * 0.6 * ((i * 0.37 + a.ph) % 1), h = 0.1 + ph * 2.5;
          push(this.ring(a, R, h, ang), 0.035, this.ring(a, R, h - 0.14, ang), 2);
        }
      } else if (a.k === 'mist'){
        if (!dorm && !lite) for (let i = 0; i < 2; i++){ const ang = a.ph + i * 3.1 + T * 0.05; push(this.ring(a, a.r * 0.35, 1.3, ang), a.r * 0.75, [0.55, 0.22, 0], 11); }   // the haze itself (green from its light)
        if (!dorm) for (let i = 0, m = lite ? 3 : 9; i < m; i++){
          const ang = a.ph + i * 0.7 + T * 0.08 * (1 + i % 3), R = a.r * (0.25 + 0.7 * ((i * 0.618) % 1)), h = 0.4 + 2.2 * ((i * 0.37 + T * 0.05) % 1);
          push(this.ring(a, R, h, ang), 0.05, this.ring(a, R, h + 0.08, ang + 0.03), 9);
        }
      } else if (a.k === 'lens'){
        if (!dorm){
          const warp = SET.distort && !(typeof LITE73 !== 'undefined' && LITE73.on), m = warp ? 3 : lite ? 6 : 10;
          for (let i = 0; i < m; i++){ const ang = T * 0.6 + i / m * 6.283, h = 1.6 + 0.2 * sin(T * 2 + i); push(this.ring(a, a.r * 0.55, h, ang), 0.03, this.ring(a, a.r * 0.55, h, ang + 0.12), 4); }
        }
      }
      budget -= n - n0;
    }
    if (this.bolt){ const b = this.bolt, k = b.t / b.T; push(this.boltPos(b, k), 0.06, this.boltPos(b, max(0, k - 0.06)), 2); }
    for (const t of this.arts){
      if (dist2(t.pos, cam) > 6400) continue;
      const p = add(t.pos, mul(t.dir, 0.3 * sin(T * 3)));
      push(p, 0.17, add(p, mul(t.dir, 0.08)), t.kind === 'pulse' ? 9 : 4);
      push(add(p, mul(randUnit(), 0.5)), 0.025, p, 2);
    }
    return n;
  },
  lights(n){
    if (!this.active() || !S.cam) return n;
    const max_ = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxL : 16, cam = S.cam.pos, T = S.rtime, rts = S.mode !== 'fps' && !S.attract;
    let left = this.lite() ? 1 : 3;
    const L = this.L.filter(a => !this.dorm(a) && a.k !== 'lens' && (!rts || a.known0) && dist2(a.pos, cam) < 4900).sort((p, q) => dist2(p.pos, cam) - dist2(q.pos, cam));
    const put = (p, col, rad, glow) => { LP.set([p[0], p[1], p[2], rad], n * 4); LC.set([col[0], col[1], col[2], glow], n * 4); n++; left--; };
    for (const a of L){
      if (left <= 0 || n >= max_) break;
      const p = add(a.pos, mul(a.dir, 1.4));
      if (a.k === 'vein'){
        let k = 0.55 + 0.15 * sin(T * 2 + a.ph);
        if (a.st === 'charge') k = 0.6 + 2.2 * min(1, a.t / 1.3) * (0.75 + 0.25 * sin(T * 40));
        if (S.time - a.ringT < 0.3) k = 4;
        put(p, [0.25 * k, 2.2 * k, 0.9 * k], 9 + 3 * min(k, 2), 0.0012 * min(k, 2.5));
      } else if (a.k === 'grav'){ const k = a.st === 'charge' ? 1.6 : 0.45; put(p, [0.9 * k, 0.4 * k, 2 * k], 7, 0.001); }
      else if (a.k === 'arc'){ const k = a.zap && S.rtime < a.zap.until ? 2.5 : 0.3; put(add(p, mul(a.dir, 1.4)), [0.6 * k, 1.3 * k, 3 * k], 9, 0.002); }
      else if (a.k === 'burn'){ const f = a.st === 'fire'; const k = f ? 3 : 0.45 + 0.12 * sin(T * 7 + a.ph); put(add(a.pos, mul(a.dir, f ? 1.5 : 0.3)), [3 * k, 1.1 * k, 0.2 * k], f ? 12 : 5, f ? 0.004 : 0); }
      else if (a.k === 'mist'){ put(p, [0.22, 0.95, 0.25], a.r * 1.7, 0.006); }
    }
    for (const t of this.arts){ if (left <= 0 || n >= max_) break; if (dist2(t.pos, cam) < 900){ const c = t.kind === 'pulse' ? [0.3, 2.4, 1] : [1.4, 0.7, 2.6]; put(t.pos, c, 5, 0.003); } }
    return n;
  },
  distort(r){
    let nw = r[0]; const nt = r[1];
    if (!S.cam || !SET.distort || (typeof LITE73 !== 'undefined' && LITE73.on) || !this.active()) return r;
    const W = innerWidth, H = innerHeight;
    for (const a of this.L){
      if (nw >= 8) break;
      if ((a.k !== 'lens' && a.k !== 'grav') || this.dorm(a)) continue;
      const c = add(a.pos, mul(a.dir, a.k === 'lens' ? 1.6 : 1.2)), d = dist(c, S.cam.pos);
      if (d > 90) continue;
      if (a.k === 'lens' && d < a.r * 0.9){ WAVE.set([0.5, 0.5, 0.42, 0.25 + 0.1 * sin(S.rtime * 3)], nw * 4); nw++; continue; }
      const s = project(c); if (!s) continue;
      const R = (a.k === 'lens' ? a.r * 0.75 : (a.st === 'charge' ? 3.5 : 2.2)) / (s[2] * S.cam.fov); if (R > 2.5) continue;
      const str = (a.k === 'lens' ? 0.7 : a.st === 'charge' ? 1.4 : 0.35) * clamp(1.2 - d / 90, 0, 1);
      WAVE.set([s[0] / W, 1 - s[1] / H, R, str], nw * 4); nw++;
    }
    return [nw, nt];
  },
  overlay(){
    const c = ctrlEntity(); if (!c || !S.cam || !this.active()) return;
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    octx.save(); octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", sans-serif';
    for (const a of this.L){
      const d = dist(a.pos, c.pos); if (d > 48) continue;
      const s = project(add(a.pos, mul(a.dir, a.k === 'arc' ? 4 : 3))); if (!s || s[0] < 20 || s[0] > W - 20 || s[1] < 20 || s[1] > H - 20) continue;
      if (hypot(s[0] - cx, s[1] - cy) < 90) continue;   // golden rule: the centre stays free
      octx.globalAlpha = clamp(1.3 - d / 48, 0.35, 1);
      octx.fillStyle = this.K[a.k].css;
      octx.fillText(`⚠ ${this.name(a).toUpperCase()} · ${Math.round(d)} ${tr('м', 'm', 'm')}${this.dorm(a) ? ' · ' + tr('спит', 'dormant', 'ngủ') : ''}`, s[0], s[1]);
    }
    octx.globalAlpha = 1;
    for (const t of this.arts){
      const d = dist(t.pos, c.pos); if (d > 30) continue;
      const s = project(add(t.pos, mul(t.dir, 1))); if (!s || hypot(s[0] - cx, s[1] - cy) < 70) continue;
      const A = this.AK[t.kind]; octx.fillStyle = A.css;
      octx.fillText(`◈ ${N2(A.n)} · +${N2(A.p)} / −${N2(A.m)}`, s[0], s[1]);
    }
    // inside acid mist — green edges (centre untouched)
    const inMist = this.L.some(a => a.k === 'mist' && !this.dorm(a) && dist(a.pos, c.pos) < a.r);
    if (inMist){ const g = octx.createRadialGradient(cx, cy, min(W, H) * 0.35, cx, cy, max(W, H) * 0.7); g.addColorStop(0, 'rgba(90,255,80,0)'); g.addColorStop(1, `rgba(90,255,80,${(0.2 + 0.06 * sin(S.rtime * 4)).toFixed(3)})`); octx.fillStyle = g; octx.fillRect(0, 0, W, H); }
    octx.restore();
  },
  minimap(){
    const c = ctrlEntity(); if (!c || !this.active()) return;
    let tf = null;
    if (typeof M67 !== 'undefined' && M67.active && M67.active()){
      const m73 = typeof M73 !== 'undefined' && M73.act();
      if (!M67.pref.mm && !m73) return;
      tf = { s: M67.safe, m73 };
    }
    const R = 82, cx = 18 + R, cy = innerHeight - 18 - R, range = 170, k = R / range;
    const my = norm(c.pos), fwd = tangent(c.cls === 'inf' ? c.fwd : (c.aim || c.fwd), my), right = norm(cross(fwd, my));
    octx.save();
    if (tf){ const R0 = 82, Rs = 48, kk = Rs / R0; octx.translate(tf.s.l + 8 + Rs, (tf.m73 ? tf.s.t + 6 : 50) + Rs); octx.scale(kk, kk); octx.translate(-(18 + R0), -(innerHeight - 18 - R0)); }
    octx.font = '700 9px "Exo 2", sans-serif'; octx.textAlign = 'center';
    for (const a of this.L){
      if (!a.known0 && !a.seen0 && dist(a.pos, c.pos) > 60) continue;
      const dn = norm(a.pos), ang = acos(clamp(dot(dn, my), -1, 1)), s = ang * RM;
      if (s > range) continue;
      const t = tangent(sub(dn, mul(my, dot(dn, my))), my), px = cx + dot(t, right) * s * k, py = cy - dot(t, fwd) * s * k;
      if (hypot(px - cx, py - cy) > R - 5) continue;
      octx.fillStyle = this.dorm(a) ? 'rgba(160,160,160,.6)' : this.K[a.k].css;
      octx.beginPath(); octx.moveTo(px, py - 5); octx.lineTo(px + 4.5, py + 3.5); octx.lineTo(px - 4.5, py + 3.5); octx.closePath(); octx.fill();
      octx.fillStyle = '#000'; octx.fillText('!', px, py + 3);
    }
    octx.restore();
  },
  rtsOverlay(){
    if (!this.active()) return;
    octx.save(); octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", sans-serif';
    for (const a of this.L){
      if (!a.known0 || (typeof facing === 'function' && !facing(a.pos))) continue;
      octx.strokeStyle = this.K[a.k].css; octx.globalAlpha = this.dorm(a) ? 0.35 : 0.85; octx.lineWidth = 1.5;
      octx.setLineDash([4, 4]); groundRing(add(a.pos, mul(a.dir, 0.3)), a.r, 24); octx.setLineDash([]);
      const s = project(add(a.pos, mul(a.dir, 2.5))); if (!s) continue;
      octx.fillStyle = this.K[a.k].css; octx.fillText(`⚠ ${this.name(a)}`, s[0], s[1]);
    }
    octx.restore();
  },
  rtsMinimap(){
    if (!this.active() || typeof mmProject !== 'function') return;
    octx.save();
    for (const a of this.L){
      if (!a.known0) continue;
      const m = mmProject(a.pos);
      octx.fillStyle = this.dorm(a) ? 'rgba(160,160,160,.6)' : this.K[a.k].css;
      octx.beginPath(); octx.moveTo(m[0], m[1] - 3.5); octx.lineTo(m[0] + 3, m[1] + 2.5); octx.lineTo(m[0] - 3, m[1] + 2.5); octx.closePath(); octx.fill();
    }
    octx.restore();
  },
};
const mul_ = mul;   // (fire() shadows the name `mul` with its argument)
// radio lines (squad voice + subtitles in the squad panel; TTS like the rest of the chatter)
Object.assign(CHAT, {
  a78_vein: [['Аномалия впереди! Жила поёт — обходим!', 'Anomaly ahead! The vein is singing — go around!', 'Dị thường phía trước! Mạch đang ngân — đi vòng!'], ['Слышите гул? Поющая жила. Не подходить!', 'Hear that hum? A singing vein. Keep clear!', 'Nghe tiếng ù không? Mạch Ngân. Tránh xa!']],
  a78_grav: [['Аномалия! Воздух крутит — это омут, обходи!', 'Anomaly! The air is swirling — a whirlpool, go around!', 'Dị thường! Không khí xoáy — đi vòng!'], ['Камни висят в воздухе… Омут! Не лезь!', 'Rocks floating in the air… A whirlpool! Stay out!', 'Đá lơ lửng… Xoáy hút! Đừng vào!']],
  a78_arc: [['Аномалия впереди — трещит током!', 'Anomaly ahead — it is crackling with current!', 'Dị thường phía trước — điện lách tách!'], ['Штыри и молнии — Трескун. Броню он любит!', 'Rods and lightning — a Crackler. It loves armour!', 'Cọc và sét — tránh xa!']],
  a78_burn: [['Аномалия! Земля дрожит от жара — Жаровня!', 'Anomaly! The ground shimmers with heat — a Brazier!', 'Dị thường! Mặt đất bốc nhiệt!'], ['Осторожно, под ногами Жаровня!', 'Careful, a Brazier underfoot!', 'Cẩn thận, Lò Than dưới chân!']],
  a78_mist: [['Аномалия — зелёный туман! Кислота, не дышим!', 'Anomaly — green mist! Acid, hold your breath!', 'Dị thường — sương xanh! Axit!'], ['Туман ползёт к нам, обходим!', 'The mist is drifting our way, go around!', 'Sương đang trôi tới, đi vòng!']],
  a78_lens: [['Аномалия! Воздух как стекло — Линза, пули гнёт!', 'Anomaly! The air is like glass — a Lens, it bends bullets!', 'Dị thường! Thấu Kính bẻ cong đạn!'], ['Картинка плывёт… Линза рядом!', 'Everything is warping… a Lens nearby!', 'Hình ảnh méo… Thấu Kính gần đây!']],
  a78_trap: [['Ха! Враг влез прямо в аномалию!', 'Ha! An enemy walked right into the anomaly!', 'Ha! Kẻ địch đi thẳng vào dị thường!'], ['Попался! Заманивай их в аномалии!', 'Got him! Lure them into anomalies!', 'Dính rồi! Dụ chúng vào dị thường!'], ['Красиво жахнуло! Минус железка.', 'Beautiful zap! One less tin can.', 'Nổ đẹp! Bớt một hộp sắt.']],
  a78_hurt: [['Меня зацепило аномалией!', 'The anomaly got me!', 'Dị thường đánh trúng tôi!'], ['Ай! Не лезьте туда!', "Ow! Don't go in there!", 'Ái! Đừng vào đó!']],
  a78_dis: [['Разрядил! Теперь она спит.', 'Discharged! It is dormant now.', 'Đã xả! Giờ nó ngủ.'], ['Чисто, аномалия разряжена.', 'Clear, the anomaly is discharged.', 'An toàn, đã xả.']],
});
CHAT.banter.push(['Говорят, в жилах прячут артефакты. Только сначала жила поёт…', 'They say veins hide artifacts. Only first the vein sings…', 'Nghe nói trong mạch có cổ vật…'], ['Кидай болт, потом иди. Старая примета.', 'Throw a bolt first, then walk. Old habit.', 'Ném bu lông trước, rồi mới đi.']);
// ---------------------------------------------------------------------
//  hooks
// ---------------------------------------------------------------------
{ const up0 = update; update = function(rdt){ up0(rdt); if (!S.paused) A78.safe(() => A78.step(), 'step'); }; }
{ const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); A78.lt = null; A78.safe(() => A78.spawn(((Date.now() * 2654435761) ^ (performance.now() * 1000)) >>> 0), 'spawn'); return r; }; }   // own seed: the battle's random() is not shifted
{ const sp0 = splash; splash = function(p, team, dmg, radius, src, ptype){ const r = sp0.apply(this, arguments); A78.safe(() => A78.blast(p, radius || 3, src), 'blast'); return r; }; }
{ const dm0 = damage; damage = function(e, dmg, src, pt){ if (A78.art && e && dmg > 0 && !S.attract && e === ctrlEntity()) dmg *= A78.art.k === 'pulse' ? 0.75 : 1.15; return dm0.call(this, e, dmg, src, pt); }; }
{ const bi0 = botInput; botInput = function(u, dt){ const inp = bi0.apply(this, arguments); if (!u.leapT && !u.skyState) A78.safe(() => A78.steer(u, inp, dt, 0.13), 'steer'); return inp; }; }
{ const ti0 = tankInput; tankInput = function(v, dt){ const inp = ti0.apply(this, arguments); A78.safe(() => A78.steer(v, inp, dt, 0.05), 'steerT'); return inp; }; }
if (typeof V2 !== 'undefined' && V2.aiInput){ const ai0 = V2.aiInput; V2.aiInput = function(v, dt){ const inp = ai0.apply(this, arguments); A78.safe(() => A78.steer(v, inp, dt, 0.05), 'steerV'); return inp; }; }
{ const gs0 = gunShoot; gunShoot = function(src, eye, dir, W, o){ if (A78.L.length && A78.active()) dir = A78.safe(() => A78.bend(eye, dir, (o && o.range) || (W && W.range))) || dir; return gs0.call(this, src, eye, dir, W, o); }; }
{ const pi0 = playerInput; playerInput = function(p){ const r = pi0.apply(this, arguments); if (r && A78.art && A78.art.k === 'pulse') r.speedMul = (r.speedMul || 1) * 0.88; return r; }; }
{ const ni0 = nearbyInteract;
  nearbyInteract = function(me){
    const h = ni0.apply(this, arguments);
    if (h || !me || me.cls !== 'inf') return h;
    const a = A78.boltTarget(me); if (!a) return h;
    return { a78: a, text: `${typeof TOUCH !== 'undefined' && TOUCH.on ? '⏏' : bk('interact')} — ${tr('бросить болт', 'throw a bolt', 'ném bu lông')}: ${A78.name(a)} · ${Math.round(dist(a.pos, me.pos))} ${tr('м', 'm', 'm')}` };
  }; }
{ const in0 = interact;
  interact = function(){
    const me = S.me;
    if (me && me.cls === 'inf' && !S.attract && S.mode === 'fps'){ const h = nearbyInteract(me); if (h && h.a78){ A78.throwBolt(h.a78); return; } }
    return in0.apply(this, arguments);
  }; }
if (typeof M67 !== 'undefined' && M67.nearUse){ const nu0 = M67.nearUse; M67.nearUse = function(c){ return nu0.call(this, c) || !!A78.boltTarget(c); }; }
{ const go0 = gatherObjects; gatherObjects = function(){ const r = go0.apply(this, arguments); A78.safe(() => A78.objects(), 'obj'); return r; }; }
{ const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); const m = A78.safe(() => A78.parts(n), 'par'); return m === undefined ? n : m; }; }
{ const gl0 = gatherLights; gatherLights = function(){ const n = gl0.apply(this, arguments); const m = A78.safe(() => A78.lights(n), 'lit'); return m === undefined ? n : m; }; }
{ const gd0 = gatherDistortion; gatherDistortion = function(){ const r = gd0.apply(this, arguments); return A78.safe(() => A78.distort(r), 'dist') || r; }; }
{ const do0 = drawOverlay; drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (!S.attract && S.mode === 'fps' && !OPER.on && !(typeof M74 !== 'undefined' && M74.nohud)) A78.safe(() => A78.overlay(), 'ov'); A78.sndT -= dt || 0; if (A78.sndT <= 0){ A78.sndT = 0.1; A78.safe(() => A78.humStep(), 'humS'); } return r; }; }
{ const dmm0 = drawMinimap; drawMinimap = function(){ const r = dmm0.apply(this, arguments); A78.safe(() => A78.minimap(), 'mm'); return r; }; }
{ const dro0 = drawRTSOverlay; drawRTSOverlay = function(dt){ const r = dro0.apply(this, arguments); A78.safe(() => A78.rtsOverlay(), 'rov'); return r; }; }
{ const drm0 = drawRTSMinimap; drawRTSMinimap = function(){ const r = drm0.apply(this, arguments); A78.safe(() => A78.rtsMinimap(), 'rmm'); return r; }; }
// saves: the anomaly seed and what the strategist already knows — in a separate key next to the slot (save format unchanged)
{ const sv0 = SAVE.save;
  SAVE.save = function(slot){ const ok = sv0.apply(this, arguments); try { if (ok) localStorage.setItem(this.keyOf(slot) + ':a78', JSON.stringify({ seed: A78.seed, known: A78.L.map(a => a.known0 ? 1 : 0) })); } catch (e){} return ok; };
  const ld0 = SAVE.load;
  SAVE.load = function(slot){ const ok = ld0.apply(this, arguments); try { if (ok){ const s = localStorage.getItem(this.keyOf(slot || this.newest()) + ':a78'); if (s){ const o = JSON.parse(s); A78.spawn(o.seed); (o.known || []).forEach((k, i) => { if (k && A78.L[i]) A78.L[i].known0 = true; }); } } } catch (e){} return ok; }; }
