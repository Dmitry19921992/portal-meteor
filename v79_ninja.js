// =====================================================================
//  v7.9 — ROBO-NINJA hero (branch v79ninja). Everything lives in this file and v79_ninja_ui.js (+2 lines in build.py).
//  A female robo-ninja assassin — the black antenna cyborg from the early concepts — one per side, both factions:
//  Consortium = black suit + beige plates + olive straps and pouches; Swarm = black steel, dark-red plates, red glow, spikes.
//  • Unlock: research «Протокол „Тень“» in the Barracks (needs a finished Mech factory) → «Робо-ниндзя» in the Barracks.
//  • Moves: blink-dashes (i-frames), slow telegraphed long-range teleport, 3-hit katana combos, shurikens, block / parry
//    (a block deflects bullets from the front), double jump, short wall-run.
//  • Robots are cut at the hit point — no blood: sparks, glowing coolant, short circuits, flying parts with hot cut faces.
//  • AUTO MODE: she teleports into a random enemy zone, closes in with blinks and slices; zone cleared → next zone.
//    AI ninjas always run it; when you possess her (3rd person) it is a toggle (P / phone «АВТО»).
//  • Two ninjas meet → boss duel: telegraphed heavy cuts and lunges, parry (block right before the hit), dodge (blink), posture.
//  • Rendering: procedural meshes in the v7.0 building pass (ST70: same GL program, depth-tested after the ray-marcher);
//    her SDF body is hidden (the SDF scout look stays as a fallback if ST70 is unavailable).
//  • Cheap: ≤ 2 heroes × 13 parts; debris ≤ 28 pieces (lite/phone/Dendy 8, shorter life, fewer particles).
//  Hooks (wrappers only): ROLES/PRODUCTS/ARMOR/ST70_DEF (+entries), canProduce, finishProduct, economy, botInput,
//  playerInput, playerFire, physStep, gunDash, damage, destroy, takeControl, setupCamera, gatherObjects, gatherParticles,
//  gatherLights, ST70.collect, update, newMatch, cardGroupIcon, uixFrame, SAVE.load. UI hooks — v79_ninja_ui.js. Off: ?nj79=0.
// =====================================================================
ROLES.ninja = { i: 5, icon: '✶', n: ['Робо-ниндзя', 'Robo-ninja', 'Ninja robot', 'נינג׳ה רובוטית'], hp: 520, dmg: 0, cd: 9, cdr: 9, spread: 1, rocket: 999, speed: 1.55, w: 'rifle', vision: 95,
  d: ['Героиня-убийца: рывки-телепорты, катана, сюрикены. Сама прыгает по зонам врага и режет роботов. 1 на сторону.', 'Assassin hero: blink-dashes, katana, shurikens. Teleports through enemy zones on her own and cuts robots apart. 1 per side.', 'Sát thủ: dịch chuyển, katana, phi tiêu.'] };
for (const k in ARMOR) if (ARMOR[k].k === undefined) ARMOR[k].k = { inf: 1, tank: 0.35, drone: 1, builder: 1, bld: 0.3, hq: 0.08, prop: 0.25 }[k] ?? 1;
PRODUCTS.nj79r = { n: ['Протокол «Тень»', 'Shadow protocol', 'Giao thức Bóng', 'פרוטוקול צל'], cost: 300, time: 45, at: ['barracks'], research: true, max: 1, icon: '☯',
  d: ['Исследование: открывает робо-ниндзя в Казарме. Нужен готовый Мехзавод.', 'Research: unlocks the robo-ninja in the Barracks. Requires a finished Mech factory.', 'Nghiên cứu: mở khóa ninja robot.'] };
PRODUCTS.nj79 = { n: ['Робо-ниндзя', 'Robo-ninja', 'Ninja robot', 'נינג׳ה רובוטית'], cost: 450, time: 30, at: ['barracks'], icon: '✶',
  d: ['Героиня (1 на сторону): сама телепортируется по зонам врага и режет роботов; можно вселиться и играть вручную.', 'Hero (1 per side): teleports through enemy zones on her own and cuts robots apart; possess her to play manually.', 'Anh hùng (1 mỗi phe).'] };
const NJ = {
  on: (() => { try { return new URLSearchParams(location.search).get('nj79') !== '0'; } catch (e){ return true; } })(),
  err: {}, lt: null, dt: 0.016, pieces: [], shur: [], ghosts: [], duel: null, duelCd: 0, autoP: false, camF: null, camP: null, camFar: false,
  lastCut: null, bypass: false, warnT: -99, feedT: -99, possT: -99, swish: 0,
  stats: { spawned: [0, 0], tele: 0, zones: [0, 0], kills: [0, 0], cuts: 0, pieces: 0, duels: 0, duelWins: [0, 0], parries: 0, blocks: 0, deflects: 0, shur: 0, blinks: 0,
           dashStrikes: 0, postureBreaks: 0, hits: 0, ms: 0, msMax: 0, frames: 0 },
  ATK: {
    c0:    { T: 0.40, h0: 0.13, h1: 0.24, dmg: 58, reach: 2.7, cosA: 0.15, cut: 'diag' },
    c1:    { T: 0.40, h0: 0.12, h1: 0.23, dmg: 58, reach: 2.7, cosA: 0.15, cut: 'arm' },
    c2:    { T: 0.58, h0: 0.20, h1: 0.36, dmg: 84, reach: 3.0, cosA: -0.35, cut: 'waist' },
    heavy: { T: 1.25, h0: 0.62, h1: 0.78, dmg: 96, reach: 3.4, cosA: 0.0, cut: 'waist', tele: true },
    lunge: { T: 0.95, h0: 0.50, h1: 0.66, dmg: 80, reach: 3.0, cosA: 0.2, cut: 'neck', tele: true, dash: 7 },
  },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('nj79 ' + tag, e); } } },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  is(u){ return !!u && u.cls === 'inf' && u.role === 'ninja'; },
  fac(u){ return typeof FI76 === 'function' ? FI76(u.team) : u.team; },
  of(team){ return S.units.find(u => u.alive && u.role === 'ninja' && u.team === team) || null; },
  all(){ return S.units.filter(u => u.alive && u.role === 'ninja'); },
  ctrl(){ const c = ctrlEntity(); return c && this.is(c) && S.mode === 'fps' && !S.attract ? c : null; },
  meshOK(){ return typeof ST70 !== 'undefined' && ST70.ok() && !ST70.failed; },
  fresh(){ return { st: 'idle', atk: null, combo: 0, comboT: -9, blink: null, tp: null, wall: null, jumps: 0, iT: 0, block: false, parryT: 0, posture: 0, postT: 0, stag: 0,
                    blinkCd: 0, shurCd: 0, teleCd: 0, dashCd: 0, tgt: null, tT: 0, zone: null, zoneT: 0, clearT: 0, lastZone: null, home: false, duel: null, dT: 1, plan: null,
                    riposte: 0, postT: 0, parryT: -9, hidden: false, lPrev: false, rPrev: false, jPrev: false, pz: null, shT: 0, sh: 1, kills: 0, queued: false, faceT: 0 }; },
  N(u){ if (!u.nj) u.nj = this.fresh(); return u.nj; },
  T(ru, en, vi){ return tr(ru, en, vi); },
  name(u){ return N2(ROLES.ninja.n) + (u && typeof callsign === 'function' ? ' «' + callsign(u) + '»' : ''); },
  // ------------------------------------------------------------------ spawn
  spawn(team, at){
    if (this.of(team)) return this.of(team);
    const site = at || (S.hq[team] && S.hq[team].alive ? null : (S.buildings.find(b => b.alive && b.team === team && b.done) || null));
    const pos = site && site.pos ? (site.cls === 'hq' ? null : siteExit(site, 5)) : null;
    const sq = spawnSquad(team, false, pos, 1, ['ninja']);
    sq.solo = 'ninja';
    const u = sq.units[0]; u.nj = this.fresh(); u.armor = 'ninja'; u.jet = this.JET; u.energy = this.JET.emax;
    this.stats.spawned[team]++;
    this.fxArrive(u.pos, u, 1.3);
    if (!S.attract){
      if (team === 0){ feed(`✶ ${this.name(u)} ${tr('готова. Работает сама (АВТО) — вселись, чтобы играть вручную', 'is ready. She works on her own (AUTO) — possess her to play manually', 'sẵn sàng')}`, TEAM[0].css); emit('radio', { text: tr('Робо-ниндзя готова к бою', 'Robo-ninja ready for action', 'Ninja robot sẵn sàng'), pri: 1 }); }
      else { feed(tr('⚠ Разведка: у противника появилась робо-ниндзя!', '⚠ Intel: the enemy has a robo-ninja!', '⚠ Tình báo: địch có ninja robot!'), '#f88'); emit('radio', { text: tr('Внимание! У противника робо-ниндзя. Держитесь вместе', 'Warning! The enemy has a robo-ninja. Stay together', 'Cảnh báo! Địch có ninja robot'), pri: 2 }); }
    }
    return u;
  },
  // ------------------------------------------------------------------ helpers
  up(u){ return norm(u.pos); },
  faceTo(u, p){ const f = tangent(sub(p, u.pos), this.up(u)); if (len(f) > 0.01){ u.fwd = norm(add(f, mul(this.up(u), -0.04))); clampFwd(u); u.aim = u.fwd; } },
  enemyUnits(team){ return TGT[team].filter(e => e.alive && (e.cls === 'inf' || e.cls === 'builder' || e.cls === 'drone' || e.cls === 'tank')); },
  countNear(team, p, R){ let n = 0; const R2 = R * R; for (const e of TGT[team]){ if (!e.alive || e.cls === 'bld' || e.cls === 'hq' || this.is(e)) continue; if (dist2(e.pos, p) < R2) n++; } return n; },
  reach(t){ return t.cls === 'tank' ? 3.6 : t.cls === 'drone' ? 2.4 : 2.5; },
  safeSpot(dir, rad){
    for (let k = 0; k < 10; k++){
      const d = k ? offsetOnSphere(dir, randUnit(), 3 + k * 2.5) : dir;
      const p = surfacePoint(d, rad || 0.5);
      if (!bldAt(p, 1.2) && !propAt(p, 0.8) && !(typeof inShaft === 'function' && inShaft(p))) return p;
    }
    return surfacePoint(dir, rad || 0.5);
  },
  // ------------------------------------------------------------------ sounds (synth, positional)
  sfx(kind, p){
    if (typeof AU === 'undefined' || !AU.ready() || (S.attract && !(typeof OPER !== 'undefined' && OPER.on))) return;
    if (p && !AU.allow(p, 140)) return;
    const t = AU.ctx.currentTime, o = AU.out(p || null, 0.25);
    if (kind === 'swish'){ AU.nz(o, t, 0.16, 'bandpass', 900, 4200, 2.2, 0.32, 0.01); }
    else if (kind === 'cut'){ AU.nz(o, t, 0.2, 'highpass', 2500, 7000, 0.8, 0.45, 0.002); AU.osc(o, t, 0.35, 'triangle', 2900, 2100, 0.07); AU.osc(o, t, 0.12, 'square', 300, 90, 0.08); }
    else if (kind === 'hit'){ AU.nz(o, t, 0.08, 'highpass', 3000, 1500, 0.8, 0.3, 0.002); AU.osc(o, t, 0.1, 'triangle', 1800, 900, 0.05); }
    else if (kind === 'blink'){ AU.osc(o, t, 0.16, 'sine', 1400, 300, 0.12); AU.nz(o, t, 0.12, 'bandpass', 3000, 600, 3, 0.18, 0.004); }
    else if (kind === 'charge'){ AU.osc(o, t, 0.8, 'sine', 120, 900, 0.07, 0.4); AU.osc(o, t, 0.8, 'triangle', 241, 1803, 0.03, 0.5); }
    else if (kind === 'arrive'){ AU.osc(o, t, 0.4, 'sine', 900, 70, 0.25); AU.nz(o, t, 0.35, 'lowpass', 2000, 200, 0.7, 0.3, 0.003); }
    else if (kind === 'clang'){ AU.osc(o, t, 0.6, 'triangle', 2350, 2200, 0.16); AU.osc(o, t, 0.5, 'sine', 3520, 3400, 0.08); AU.nz(o, t, 0.1, 'highpass', 4000, 2500, 0.8, 0.4, 0.001); }
    else if (kind === 'block'){ AU.osc(o, t, 0.25, 'triangle', 1500, 1300, 0.1); AU.nz(o, t, 0.06, 'highpass', 3000, 2000, 0.8, 0.25, 0.001); }
    else if (kind === 'ping'){ AU.osc(o, t, 0.12, 'sine', 4200, 3000, 0.05); }
    else if (kind === 'shur'){ AU.nz(o, t, 0.25, 'bandpass', 5000, 2500, 6, 0.12, 0.01); }
    else if (kind === 'arc'){ AU.nz(o, t, 0.06, 'highpass', 6000, 3000, 0.6, 0.14, 0.001); }
    else if (kind === 'gong'){ AU.osc(o, t, 2.2, 'sine', 110, 104, 0.35, 0.01); AU.osc(o, t, 1.8, 'sine', 277, 270, 0.12, 0.01); AU.osc(o, t, 1.2, 'triangle', 523, 515, 0.05, 0.01); }
  },
  // ------------------------------------------------------------------ actions
  JET: { n: ['кибер-рывки', 'cyber blinks', 'dịch chuyển'], thrust: 0, emax: 3.2, rg: 2.4, ra: 1.0, unlock: 0.4 },
  aid: 0, acc: 0, autoHold: 0, tapT: -9, touchBlock: false, helpShown: false,
  pathEnd(u, to){   // a blink stops in front of walls and rocks
    const up = this.up(u), a = add(u.pos, mul(up, 0.55)), v = sub(to, u.pos), L = len(v);
    if (L < 0.1) return u.pos;
    const d = mul(v, 1 / L); let t = 0;
    for (let i = 0; i < 48 && t < L; i++){ const p = add(a, mul(d, t + 0.35)); if (mapJS(p[0], p[1], p[2]) < 0.12) break; t += 0.35; }
    return add(u.pos, mul(d, Math.max(0, Math.min(L, t) - 0.15)));
  },
  blink(u, to, then, air){
    const N = this.N(u);
    if (N.blink || N.tp || (u.energy < 0.6 && !then)) return false;
    let end = this.pathEnd(u, to);
    if (!air && mapJS(end[0], end[1], end[2]) < 0.45) end = surfacePoint(norm(end), 0.5);
    const D = dist(u.pos, end);
    if (D < 0.6 && !then) return false;
    N.blink = { from: u.pos, to: end, t: 0, T: 0.09 + D / 95, then: then || null };
    N.iT = N.blink.T + 0.1; N.blinkCd = 0.32; N.atk = null; N.block = false; N.wall = null; N.lastBlink = S.rtime;
    u.energy = max(0, u.energy - 0.75);
    this.ghosts.push({ a: u.pos, b: end, up: this.up(u), t: 0, team: this.fac(u) });
    if (this.ghosts.length > 12) this.ghosts.shift();
    this.sfx('blink', u.pos); this.stats.blinks++;
    if (then) this.stats.dashStrikes++;
    return true;
  },
  attack(u, k, tgt){
    const N = this.N(u), A = this.ATK[k];
    if (!A || N.atk || N.stag > 0 || N.tp || N.blink) return false;
    if (tgt && tgt.alive) this.faceTo(u, centerOf(tgt));
    N.atk = { k, A, t: 0, tgt: tgt || null, hit: new Set(), id: ++this.aid };
    this.stats.swings = (this.stats.swings || 0) + 1;
    N.block = false;
    if (k[0] === 'c'){ N.combo = +k[1]; N.comboT = S.time; }
    if (A.tele) this.sfx('charge', u.pos);
    return true;
  },
  nextCombo(u){ const N = this.N(u); return 'c' + (S.time - N.comboT < 0.8 ? (N.combo + 1) % 3 : 0); },
  dashStrike(u, t, k){
    const tu = norm(t.pos), from = tangent(sub(u.pos, t.pos), tu), air = t.cls === 'drone' && altitude(t.pos) - altitude(u.pos) > 2.5;
    const to = air ? add(t.pos, mul(from, 1.5)) : add(t.pos, mul(from, this.reach(t) * 0.7));
    return this.blink(u, to, { k, tgt: t }, air);
  },
  pick(u, R){   // soft lock: the enemy in front of the camera, nearest by angle and distance
    const up = this.up(u), f = S.cam && u === S.me ? S.cam.fwd : u.fwd, eye = add(u.pos, mul(up, 0.6));
    let best = null, bs = 1e9;
    for (const e of TGT[u.team]){
      if (!e.alive || e.cls === 'hq' || e.cls === 'bld') continue;
      const c = centerOf(e), v = sub(c, eye), d = len(v);
      if (d > R || d < 0.01) continue;
      const cs = dot(v, f) / d; if (cs < 0.55 && d > 2.2) continue;
      const s = d + (1 - cs) * 14;
      if (s < bs && (d < 3 || los(eye, c))){ bs = s; best = e; }
    }
    return best;
  },
  strikeInput(u){
    const N = this.N(u);
    if (N.stag > 0 || N.tp) return;
    if (N.blink){ N.queued = true; return; }
    if (N.atk){ if (N.atk.k[0] === 'c' && N.atk.t > N.atk.A.h1 + 0.02) N.atk = null; else { N.queued = true; return; } }
    const t = this.pick(u, 10);
    if (t && dist(t.pos, u.pos) > this.reach(t) + 0.6 && N.blinkCd <= 0 && u.energy >= 0.6){ this.dashStrike(u, t, this.nextCombo(u)); return; }
    this.attack(u, this.nextCombo(u), t && dist(t.pos, u.pos) < this.reach(t) + 1.5 ? t : null);
  },
  tapAttack(u, e){   // phone: tap an enemy — dash to it and cut
    if (!e || !e.alive) return this.strikeInput(u);
    const d = dist(e.pos, u.pos), N = this.N(u);
    if (N.atk || N.blink || N.tp || N.stag > 0){ N.queued = true; return; }
    if (d <= this.reach(e) + 0.6) return this.attack(u, this.nextCombo(u), e);
    if (d <= 16 && u.energy >= 0.6) return this.dashStrike(u, e, this.nextCombo(u));
    this.faceTo(u, e.pos);
    feed(tr('Далеко для рывка — подбеги ближе или телепорт', 'Too far for a dash — get closer or teleport', 'Quá xa — lại gần hơn'), '#f88');
  },
  throwFan(u, dir, n){
    const N = this.N(u), up = this.up(u), eye = add(u.pos, mul(up, 0.85));
    N.shurCd = u === S.me ? 1.1 : 2.6; N.throwT = S.rtime + 0.25;
    for (let i = 0; i < n; i++){
      const d = norm(rotAxis(dir, up, (i - (n - 1) / 2) * 0.09));
      this.shur.push({ pos: add(eye, mul(d, 0.6)), vel: mul(d, 46), team: u.team, src: u, life: 1.1, fac: this.fac(u), spin: random() * 6, stuck: 0 });
    }
    if (this.shur.length > 30) this.shur.splice(0, this.shur.length - 30);
    this.sfx('shur', eye); this.stats.shur += n;
  },
  teleport(u, to, zone){
    const N = this.N(u);
    if (N.tp || !to) return false;
    N.tp = { ph: 'charge', t: 0, ct: u === S.me && !this.autoActive(u) ? 0.7 : 0.9, to, zone: zone || null, cd: u === S.me ? 5 : 3.5 };
    N.atk = null; N.block = false; N.wall = null;
    this.sfx('charge', u.pos);
    addLight(add(u.pos, mul(this.up(u), 0.8)), this.fac(u) ? [5, 0.5, 0.3] : [0.6, 2.8, 1.4], 8, 0.9, 0.006);
    return true;
  },
  arriveSpot(u, p){ const dir = norm(p), away = tangent(sub(u.pos, p), dir); return this.safeSpot(offsetOnSphere(dir, away, 6 + random() * 3), 0.5); },
  homeSpot(team){
    if (S.hq[team] && S.hq[team].alive) return this.safeSpot(offsetOnSphere(BASES[team], anyTangent(BASES[team]), 32), 0.5);
    const b = S.buildings.find(x => x.alive && x.team === team && x.done && x.type === 'outpost');
    return b ? this.safeSpot(norm(siteExit(b, 6)), 0.5) : null;
  },
  fxVanish(u){
    const up = this.up(u), c = add(u.pos, mul(up, 0.6));
    burst(c, this.lite() ? 6 : 14, 7, 0.3); addWave(c, 1.1, 0.35);
    this.ghosts.push({ a: u.pos, b: add(u.pos, mul(up, 2.5)), up, t: 0, team: this.fac(u) });
    this.sfx('blink', c);
  },
  fxArrive(p, u, k){
    const up = norm(p), c = add(p, mul(up, 0.5));
    addWave(c, 1.4 * k, 0.4); burst(c, this.lite() ? 8 : 18, 8, 0.35);
    addLight(add(p, mul(up, 1)), u && this.fac(u) ? [6, 0.6, 0.3] : [0.8, 3.2, 1.6], 10, 0.35, 0.008);
    if (u) for (const e of TGT[u.team]){ if (!e.alive || (e.cls !== 'inf' && e.cls !== 'builder')) continue; const v = sub(e.pos, p), d = len(v); if (d < 4.5 && d > 0.01) e.vel = add(e.vel, add(mul(v, 5 / d), mul(up, 2))); }
    this.sfx('arrive', p);
  },
  autoActive(u){ return u !== S.me || S.attract || S.mode !== 'fps' || (this.autoP && S.rtime > this.autoHold); },
  setFace(u, p){
    const N = this.N(u), f = tangent(sub(p, u.pos), this.up(u));
    if (len(f) < 0.01) return;
    N.bf = f; N.faceT = S.rtime + 0.6;
    if (u !== S.me || this.autoActive(u)){ u.fwd = norm(add(f, mul(this.up(u), -0.04))); clampFwd(u); u.aim = u.fwd; }
  },
  bfwd(u){ const N = this.N(u), up = this.up(u); return N.bf && S.rtime < N.faceT ? tangent(N.bf, up) : tangent(u.fwd, up); },
  // ------------------------------------------------------------------ per-frame motion (blink / teleport / wall-run) — instead of physStep
  motion(u, dt){
    const N = this.N(u);
    if (N.blink){
      const B = N.blink; B.t += dt;
      const k = min(1, B.t / B.T), e = 1 - (1 - k) * (1 - k);
      const d = sub(B.to, B.from);
      u.pos = add(B.from, mul(d, e)); u.vel = mul(d, 0.12 / max(0.05, B.T)); u.grounded = false;
      alignUp(u, dt);
      if (k >= 1){
        N.blink = null; u.vel = mul(norm(d), 3);
        if (B.then && B.then.tgt && B.then.tgt.alive){ N.atk = null; this.attack(u, B.then.k, B.then.tgt); }
        else if (N.queued){ N.queued = false; this.strikeInput(u); }
      }
      return true;
    }
    if (N.tp){
      const P = N.tp; P.t += dt;
      if (P.ph === 'charge'){
        u.vel = mul(u.vel, 0.85);
        if (P.t >= P.ct){ P.ph = 'gone'; P.t = 0; N.hidden = true; N.iT = 0.8; this.fxVanish(u); }
        return false;
      }
      if (P.ph === 'gone'){
        u.vel = [0, 0, 0];
        if (P.t >= 0.32){
          u.pos = P.to; u.vel = [0, 0, 0]; u.up = norm(P.to); u.fwd = tangent(u.fwd, u.up); u.aim = u.fwd; u.grounded = false;
          P.ph = 'arrive'; P.t = 0; N.hidden = false; N.iT = 0.35; this.fxArrive(P.to, u, 1);
          this.stats.tele++;
          if (P.zone){ this.stats.zones[u.team]++; P.zone.arrived = S.time; }
        }
        return true;
      }
      if (P.ph === 'arrive' && P.t >= 0.25){ N.tp = null; N.teleCd = P.cd; }
      return false;
    }
    if (N.wall){
      const W = N.wall; W.t += dt;
      const up = this.up(u), n = W.n;
      const probe = add(add(u.pos, mul(up, 0.3)), mul(n, -0.9));
      const still = mapJS(probe[0], probe[1], probe[2]) < 0.35;
      if (!still || W.t > 1.0 || u.grounded || (u === S.me && !K('jump'))){
        N.wall = null;
        if (!u.grounded) u.vel = add(u.vel, add(mul(n, 5), mul(up, 4.5)));   // kick off the wall
        this.sfx('swish', u.pos);
        return false;
      }
      let along = tangent(W.dir, up); along = norm(sub(along, mul(n, dot(along, n))));
      u.vel = add(mul(along, max(7.5, W.sp)), mul(up, 1.8 - W.t * 2.2));
      u.pos = add(u.pos, mul(u.vel, dt));
      collide(u); alignUp(u, dt);
      u.phase += dt * 16; u.moveAmt = 1; N.jumps = 0;
      if (random() < dt * 20) S.sparks.push({ pos: add(u.pos, mul(n, -0.4)), vel: add(mul(along, -3), mul(randUnit(), 1.5)), life: 0.25 });
      return true;
    }
    return false;
  },
  tryWall(u){   // short wall-run: in the air, moving fast, next to a wall
    const N = this.N(u); if (N.wall || u.grounded) return false;
    const up = this.up(u), vt = sub(u.vel, mul(up, dot(u.vel, up))), sp = len(vt); if (sp < 3.5) return false;
    const f = mul(vt, 1 / sp), r = norm(cross(f, up));
    for (const s of [1, -1]){
      const p = add(add(u.pos, mul(up, 0.3)), mul(r, 0.85 * s));
      if (mapJS(p[0], p[1], p[2]) < 0.3){ const n = gradN(p); if (abs(dot(n, up)) < 0.55){ N.wall = { n: norm(sub(n, mul(up, dot(n, up)))), dir: f, sp, t: 0 }; this.sfx('swish', u.pos); return true; } }
    }
    return false;
  },
  // ------------------------------------------------------------------ hits and dismemberment
  hitPoint(e, cut){
    const up = norm(e.pos), feet = sub(e.pos, mul(up, 0.5));
    if (e.cls !== 'inf') return centerOf(e);
    const h = { neck: 1.32, waist: 0.92, arm: 1.18, diag: 1.12 }[cut] || 1.0;
    return add(feet, mul(up, h));
  },
  strike(u, e, A, mult, dir){
    const N = this.N(u), cut = A.cut;
    if (this.is(e)){   // ninja vs ninja: dodge, parry, block
      const M = this.N(e);
      if (M.iT > 0){ this.sfx('swish', e.pos); this.stats.dodges = (this.stats.dodges || 0) + 1; return 'dodge'; }
      const front = dot(this.bfwd(e), tangent(sub(u.pos, e.pos), this.up(e))) > 0.2;
      if (M.block && front){
        const p = add(centerOf(e), mul(this.up(e), 0.6));
        if (S.rtime - M.parryT < 0.24){
          N.posture += A === this.ATK.heavy ? 50 : 34; N.atk = null; N.stag = max(N.stag, 0.55); M.riposte = S.time + 1.2;
          if (N.posture >= 100){ N.posture = 0; N.stag = 1.9; this.stats.postureBreaks++; this.announce(u, 'broken'); }
          this.sfx('clang', p); burst(p, 22, 10, 0.3); addLight(p, [6, 5, 3], 9, 0.18, 0.01); addWave(p, 0.8, 0.25);
          this.stats.parries++; if (e === S.me || u === S.me){ S.shake = max(S.shake, 0.5); if (typeof FEEL76 !== 'undefined') FEEL76.slowmo(0.35, 0.5, true); }
          M.posture = max(0, M.posture - 10);
          return 'parry';
        }
        const heavy = A === this.ATK.heavy || A === this.ATK.lunge;
        M.posture += heavy ? 45 : 22; M.postT = S.time;
        this.sfx('block', p); burst(p, 8, 6, 0.25); this.stats.blocks++;
        if (M.posture >= 100){ M.posture = 0; M.stag = 1.8; M.block = false; this.stats.postureBreaks++; this.announce(e, 'broken'); }
        damage(e, A.dmg * (heavy ? 0.55 : 0.18), u, 'k');
        return 'block';
      }
      if (M.stag > 0 || S.time < N.riposte) mult *= 1.8;
      M.posture += 12; M.postT = S.time;
      if (M.atk && !M.atk.A.tele){ M.atk = null; M.stag = max(M.stag, 0.25); }   // a clean hit interrupts a light attack
    }
    const hp0 = e.hp, wasAlive = e.alive;
    damage(e, A.dmg * mult, u, 'k');
    if (e.cls === 'hq' || e.cls === 'bld') return 'hit';
    const p = this.hitPoint(e, cut);
    this.stats.hits++;
    if (wasAlive && !e.alive){
      this.stats.kills[u.team]++; N.kills++;
      this.dismember(e, cut, dir, p, u);
    } else {
      if (typeof FEEL76 !== 'undefined') FEEL76.spray(p, dir, e.cls === 'tank' ? 7 : 5, e.cls === 'inf' || e.cls === 'builder' ? 3 : 1);
      this.arc(p, e.cls === 'tank' ? 0.6 : 0.3);
      if (e.cls === 'tank' && random() < 0.35) this.piece('db_plate', p, dir, this.facOf(e), 0.9);
      this.sfx(e.cls === 'tank' ? 'clang' : 'hit', p);
    }
    return 'hit';
  },
  facOf(e){ return typeof FI76 === 'function' ? FI76(e.team) : e.team; },
  dismember(e, cut, dir, p, by){
    const f = this.facOf(e), up = norm(e.pos), feet = sub(e.pos, mul(up, 0.5)), side = norm(cross(dir, up));
    this.stats.cuts++;
    const L = (n, h, s) => add(add(feet, mul(up, h)), mul(side, s || 0));
    if (e.cls === 'inf'){
      if (cut === 'neck'){ this.piece('db_head', L(0, 1.45), add(dir, mul(up, 0.9)), f, 1.2); }
      else if (cut === 'arm'){ this.piece('db_arm', L(0, 1.15, 0.3), add(mul(side, 0.8), mul(up, 0.7)), f, 1.0); this.piece('db_gun', L(0, 1.0, 0.2), add(dir, mul(up, 0.5)), f, 0.8); }
      else if (cut === 'waist'){   // cut in two: the upper half flies, the legs stay and fall
        const wi = S.wrecks.indexOf(e); if (wi >= 0) S.wrecks.splice(wi, 1);
        this.piece('db_torso', L(0, 1.15), add(dir, mul(up, 1.1)), f, 1.3); this.piece('db_head', L(0, 1.5), add(mul(dir, 0.6), mul(up, 1.4)), f, 0.9); this.piece('db_arm', L(0, 1.15, -0.3), add(mul(side, -1), mul(up, 0.9)), f, 1.1);
        this.piece('db_leg', L(0, 0.5, 0.1), add(mul(dir, 0.15), mul(up, 0.2)), f, 0.25); this.piece('db_leg', L(0, 0.5, -0.1), add(mul(dir, -0.1), mul(up, 0.2)), f, 0.25);
      }
      else { this.piece('db_arm', L(0, 1.15, 0.3), add(mul(side, 0.9), mul(up, 0.6)), f, 1.0); this.piece('db_head', L(0, 1.45), add(dir, mul(up, 1.1)), f, 1.0); }
      if (!this.lite() && random() < 0.5) this.piece('db_leg', L(0, 0.45, 0.12), add(mul(dir, 0.5), mul(up, 0.6)), f, 0.7);
    } else if (e.cls === 'builder'){ this.piece('db_plate', p, add(dir, up), f, 1.2); this.piece('db_arm', p, add(side, up), f, 1); }
    else if (e.cls === 'drone'){ this.piece('db_rotor', p, add(side, up), f, 1.4); this.piece('db_rotor', p, add(mul(side, -1), up), f, 1.4); this.piece('db_plate', p, dir, f, 1); }
    else if (e.cls === 'tank'){ for (let i = 0; i < (this.lite() ? 2 : 4); i++) this.piece('db_plate', add(p, mul(randUnit(), 1)), add(randUnit(), up), f, 1.6); }
    if (typeof FEEL76 !== 'undefined'){ FEEL76.spray(p, dir, 8, 6); FEEL76.spray(p, mul(dir, -1), 4, 3); }
    burst(p, this.lite() ? 8 : 16, 9, 0.35);
    this.arc(p, 1.2); addLight(p, [3.2, 1.6, 0.6], 7, 0.25, 0.006);
    this.sfx('cut', p);
    if (by === S.me || (S.cam && dist(p, S.cam.pos) < 25)) S.shake = max(S.shake, 0.32);
    this.lastCut = { cls: e.cls, cut, t: S.time };
  },
  piece(m, pos, v, fac, k){
    const cap = this.lite() ? 8 : 28;
    if (this.pieces.length >= cap) this.pieces.shift();
    const d = norm(v), up = norm(pos);
    this.pieces.push({ m, pos, vel: add(mul(d, (4 + random() * 3) * k), mul(randUnit(), 1.5)), ax: randUnit(), w: 8 + random() * 10, R: [anyTangent(up), up, null], ang: random() * 6, life: this.lite() ? 3.5 : 7, t: 0, fac, hot: 1, g: groundR(norm(pos)), rest: false });
    this.stats.pieces++;
  },
  arc(p, dur){ this.arcs = this.arcs || []; this.arcs.push({ p, until: S.time + dur, n: 0 }); if (this.arcs.length > 10) this.arcs.shift(); },
  stepPieces(dt){
    for (let i = this.pieces.length - 1; i >= 0; i--){
      const q = this.pieces[i]; q.t += dt; q.hot = max(0, q.hot - dt * 0.35);
      if (q.t > q.life){ this.pieces.splice(i, 1); continue; }
      if (q.rest) continue;
      const up = norm(q.pos);
      q.vel = add(q.vel, mul(up, -gAt(len(q.pos)) * dt));
      q.pos = add(q.pos, mul(q.vel, dt)); q.ang += q.w * dt;
      const r = len(q.pos);
      if (r < q.g + 0.1){
        q.pos = mul(up, q.g + 0.1);
        const vn = dot(q.vel, up);
        q.vel = add(mul(sub(q.vel, mul(up, vn)), 0.55), mul(up, -vn * 0.3)); q.w *= 0.6;
        if (len(q.vel) < 0.6){ q.rest = true; q.vel = [0, 0, 0]; }
        else if (q.hot > 0.3 && random() < 0.5) burst(q.pos, 3, 3, 0.2);
      }
      if (q.hot > 0.4 && random() < dt * 6) S.sparks.push({ pos: q.pos, vel: add(mul(up, 1.5), mul(randUnit(), 1.2)), life: 0.3 });
    }
  },
  // ------------------------------------------------------------------ combat step (both player and AI)
  combat(u, dt){
    const N = this.N(u);
    N.blinkCd -= dt; N.shurCd -= dt; N.teleCd -= dt; N.iT -= dt; N.stag -= dt;
    if (S.time - N.postT > 1.5) N.posture = max(0, N.posture - dt * 18);
    u.cd = 99; u.rocketCd = 99;   // no guns, no rockets
    const A = N.atk; if (!A) return;
    A.t += dt;
    const K = A.A;
    if (!K.dash && A.tgt && A.tgt.alive && A.t < K.h1 && !this.is(A.tgt)){   // magnetism: step into a target that drifted just out of reach
      const v = sub(A.tgt.pos, u.pos), d = len(v), R = this.reach(A.tgt);
      if (d > R * 0.7 && d < R + 3) u.vel = add(mul(tangent(v, this.up(u)), min(9, (d - R * 0.6) / max(0.05, K.h0 - A.t + 0.05))), mul(this.up(u), dot(u.vel, this.up(u))));
    }
    if (K.dash && A.t > K.h0 - 0.12 && A.t < K.h1){   // lunge: a short charge forward during the hit window
      const f = this.bfwd(u);
      u.vel = add(mul(f, K.dash * 1.4), mul(this.up(u), dot(u.vel, this.up(u))));
    }
    if (A.t >= K.h0 && A.t <= K.h1){
      if (!A.sw){ A.sw = 1; this.sfx('swish', u.pos); }
      const up = this.up(u), f = this.bfwd(u), c = add(u.pos, mul(up, 0.4));
      const list = TGT[u.team];
      for (const e of list){
        if (!e.alive || A.hit.has(e) || e.cls === 'hq') continue;
        const ec = e.cls === 'bld' ? bldCenter(e) : centerOf(e);
        const v = sub(ec, c), d = len(v), rr = K.reach + (e.cls === 'tank' ? 1.6 : e.cls === 'bld' ? e.rad : 0);
        if (d > rr) continue;
        const vt = tangent(v, up); if (d > 1.0 && dot(vt, f) < K.cosA) continue;
        A.hit.add(e);
        const r = this.strike(u, e, K, A.k === 'c2' ? 1.1 : 1, norm(add(f, mul(up, 0.15))));
        if (r === 'parry' || r === 'block'){ if (r === 'parry') break; }
        if (e.cls === 'bld' || e.cls === 'tank') break;   // cleaving through infantry, but steel stops the blade
      }
    }
    if (A.t >= K.T){ N.atk = null; if (N.queued && u === S.me){ N.queued = false; this.strikeInput(u); } }
  },
  stepShur(dt){
    for (let i = this.shur.length - 1; i >= 0; i--){
      const s = this.shur[i]; s.life -= dt; s.spin += dt * 30;
      if (s.stuck){ if (s.life <= 0) this.shur.splice(i, 1); continue; }
      if (s.life <= 0){ this.shur.splice(i, 1); continue; }
      const a = s.pos, b = add(a, mul(s.vel, dt));
      let hit = null;
      for (const e of TGT[s.team]){ if (!e.alive || e.cls === 'bld' || e.cls === 'hq') continue; if (segSphere(a, b, centerOf(e), hitRadius(e) + 0.15)){ hit = e; break; } }
      if (hit){
        if (this.is(hit)){ const M = this.N(hit); if (M.block && dot(this.bfwd(hit), tangent(sub(s.pos, hit.pos), this.up(hit))) > 0.2){ this.sfx('ping', s.pos); burst(s.pos, 5, 6, 0.2); s.vel = mul(s.vel, -0.3); s.life = 0.3; s.team = hit.team; this.stats.deflects++; continue; } if (M.iT > 0) { s.pos = b; continue; } }
        const wasAlive = hit.alive;
        damage(hit, hit.cls === 'drone' ? 45 : hit.cls === 'tank' ? 10 : 26, s.src, 'k');
        if (wasAlive && !hit.alive){ this.stats.kills[s.team]++; this.dismember(hit, 'neck', norm(s.vel), centerOf(hit), s.src); }
        else { burst(b, 4, 5, 0.2); this.sfx('ping', b); if (typeof FEEL76 !== 'undefined') FEEL76.spray(b, norm(s.vel), 3, 1); }
        this.shur.splice(i, 1); continue;
      }
      if (mapJS(b[0], b[1], b[2]) < 0.05){ s.stuck = 1; s.life = 2.5; s.pos = a; this.sfx('ping', a); burst(a, 2, 3, 0.15); continue; }
      s.pos = b;
    }
  },
  // ------------------------------------------------------------------ AUTO MODE: zones → teleport → blink & slice → next zone
  zones(team){
    const Z = [];
    for (const c of S.cps) if (!c.core) Z.push({ id: 'cp' + c.i, pos: c.pos, name: tr('точка ', 'point ', 'điểm ') + c.name, cp: c });
    for (const b of S.buildings) if (b.alive && b.team !== team && b.done && BTYPES[b.type] && (b.type === 'outpost' || b.type === 'extractor' || b.type === 'depot')) Z.push({ id: 'b' + b.id, pos: b.pos, name: bname(b.type), b });
    // clusters of enemy troops in the field
    const E = this.enemyUnits(team).filter(e => !this.is(e) && e.cls !== 'tank');
    for (let i = 0; i < E.length; i += 4){ const e = E[i]; if (!Z.some(z => dist(z.pos, e.pos) < 50)) Z.push({ id: 'u' + e.id, pos: e.pos, name: tr('группа врага', 'enemy group', 'nhóm địch') }); }
    return Z;
  },
  pickZone(u){
    const N = this.N(u), Z = this.zones(u.team), cand = [];
    const ehq = S.hq[1 - u.team];
    for (const z of Z){
      const n = this.countNear(u.team, z.pos, 40);
      if (!n || (N.lastZone && z.id === N.lastZone && Z.length > 1)) continue;
      if (ehq && ehq.alive && dist(z.pos, ehq.pos) < 90) continue;   // the HQ turrets are not her job
      cand.push({ z, w: (z.cp && z.cp.owner === u.team ? 2.5 : 1) * min(4, n) + (z.b ? 1.5 : 0) });
    }
    if (!cand.length) return null;
    let s = cand.reduce((a, c) => a + c.w, 0) * random();   // a RANDOM enemy zone (weighted)
    for (const c of cand){ s -= c.w; if (s <= 0) return c.z; }
    return cand[cand.length - 1].z;
  },
  huntTarget(u, center, R){
    let best = null, bs = 1e9;
    for (const e of TGT[u.team]){
      if (!e.alive || e.cls === 'bld' || e.cls === 'hq') continue;
      const dz = center ? dist(e.pos, center) : 0; if (center && dz > R) continue;
      const d = dist(e.pos, u.pos);
      const s = d + (e.cls === 'tank' ? 25 : 0) + (e.cls === 'drone' && altitude(e.pos) > 6 ? 18 : 0) - (e.cls === 'builder' ? 6 : 0);
      if (s < bs){ bs = s; best = e; }
    }
    return best;
  },
  brain(u, dt){
    const N = this.N(u), up = this.up(u);
    const inp = { wish: [0, 0, 0], speedMul: 1.9, jump: false, thrust: false, thrustDir: up, lift: false, fire: false, aim: null, rocket: false };
    if (N.tp || N.blink || N.stag > 0){ inp.aim = u.fwd; return inp; }
    if (N.duel){ this.duelBrain(u, N.duel, inp, dt); return inp; }
    // retreat home to repair when badly hurt
    if (!N.home && u.hp < u.maxhp * 0.28 && N.teleCd <= 0){ const h = this.homeSpot(u.team); if (h){ N.home = true; N.zone = null; this.teleport(u, h, null); return inp; } }
    if (N.home){ u.hp = min(u.maxhp, u.hp + dt * 40); if (u.hp > u.maxhp * 0.85) N.home = false; else return inp; }
    // the commander may send her to a zone (RTS order / Commander mode)
    const g = u.squad, ord = g && g.manualUntil > S.time && g.goal && g.order !== 'idle' ? g : null;
    if (ord && (!N.zone || N.zone.ord !== ord.goal)){
      N.zone = { id: 'ord', pos: ord.focus && ord.focus.alive ? ord.focus.pos : ord.goal, name: tr('приказ', 'order', 'lệnh'), ord: ord.goal }; N.zoneT = S.time; N.clearT = 0;
      if (dist(u.pos, N.zone.pos) > 45 && N.teleCd <= 0){ this.teleport(u, this.arriveSpot(u, N.zone.pos), N.zone); return inp; }
    }
    N.tT -= dt;
    if (N.tT <= 0 || !N.tgt || !N.tgt.alive){
      N.tT = 0.3;
      N.tgt = this.huntTarget(u, N.zone ? N.zone.pos : null, N.zone ? 55 : 0);
      if (!N.zone) N.tgt = null;
    }
    // zone logic
    if (!N.zone){
      N.zoneT += dt;
      const z = this.pickZone(u);
      if (z && N.teleCd <= 0){ N.zone = z; N.zoneT = S.time; N.clearT = 0; this.teleport(u, this.arriveSpot(u, z.pos), z); }
      else if (!z){ const t = this.huntTarget(u, u.pos, 60); if (t) N.zone = { id: 'self', pos: t.pos, name: tr('рядом', 'nearby', 'gần') }; }
      return inp;
    }
    if (!N.tgt){
      N.clearT += dt;
      if (N.clearT > 1.2 || S.time - N.zoneT > 45){
        if (!N.zone.ord && N.zone.arrived && u.team === 0 && !S.attract && S.time - this.feedT > 8 && (u === S.me || dist(u.pos, S.cam ? S.cam.pos : u.pos) < 200)){ this.feedT = S.time; feed(`✶ ${tr('Зона зачищена', 'Zone cleared', 'Đã dọn vùng')}: ${N.zone.name}`, TEAM[0].css); }
        N.lastZone = N.zone.id; N.zone = null; N.clearT = 0;
        if (ord) ord.manualUntil = 0;
      } else if (dist(u.pos, N.zone.pos) > 8){ inp.wish = tangent(sub(N.zone.pos, u.pos), up); inp.aim = inp.wish; }
      return inp;
    }
    N.clearT = 0;
    const t = N.tgt, d = dist(t.pos, u.pos), R = this.reach(t);
    this.setFace(u, t.pos); inp.aim = tangent(sub(t.pos, u.pos), up);
    if (N.atk){ const t2 = N.atk.tgt; if (t2 && t2.alive && N.atk.t < N.atk.A.h1 && dist(t2.pos, u.pos) > this.reach(t2) * 0.7){ inp.wish = tangent(sub(t2.pos, u.pos), up); inp.speedMul = 1.6; } return inp; }
    const air = t.cls === 'drone' && altitude(t.pos) - altitude(u.pos) > 3;
    if (air && N.shurCd <= 0 && d < 40){ this.throwFan(u, norm(sub(centerOf(t), add(u.pos, mul(up, 0.85)))), 3); return inp; }
    if (d <= R + 0.4 && !air){ this.attack(u, this.nextCombo(u), t); return inp; }
    if (d < 15 && N.blinkCd <= 0 && u.energy >= 0.8){ this.dashStrike(u, t, this.nextCombo(u)); return inp; }
    if (d > 9 && d < 30 && N.shurCd <= 0 && random() < 0.4){ this.throwFan(u, norm(sub(centerOf(t), add(u.pos, mul(up, 0.85)))), 3); return inp; }
    if (d > 70 && N.teleCd <= 0){ this.teleport(u, this.arriveSpot(u, t.pos), null); return inp; }
    inp.wish = tangent(sub(t.pos, u.pos), up);
    if (u.grounded && (u.stuckT = (len(u.vel) < 1 ? (u.stuckT || 0) + dt : 0)) > 0.6){ inp.jump = true; u.stuckT = 0; }
    return inp;
  },
  // ------------------------------------------------------------------ NINJA DUEL (Dark Souls-like): telegraphs, parry, dodge, posture
  duelStep(dt){
    this.duelCd -= dt;
    const D = this.duel;
    if (D){
      const [a, b] = D.f;
      if (!a.alive || !b.alive || dist(a.pos, b.pos) > 70 || S.time - D.t0 > 90){ this.duelEnd(a.alive && !b.alive ? a : b.alive && !a.alive ? b : null); return; }
      D.T = S.time - D.t0;
      return;
    }
    if (this.duelCd > 0) return;
    const L = this.all(); if (L.length < 2) return;
    const a = L.find(u => u.team === 0), b = L.find(u => u.team === 1);
    if (!a || !b || this.N(a).tp || this.N(b).tp || this.N(a).home || this.N(b).home) return;
    if (dist(a.pos, b.pos) < 26 && los(add(a.pos, mul(this.up(a), 0.8)), add(b.pos, mul(this.up(b), 0.8)))) this.duelStart(a, b);
  },
  duelStart(a, b){
    const D = this.duel = { f: [a, b], t0: S.time, T: 0, c: mul(add(a.pos, b.pos), 0.5) };
    for (const u of D.f){ const N = this.N(u); N.duel = D; N.zone = null; N.atk = null; N.posture = 0; N.dT = 0.6; N.plan = null; }
    this.stats.duels++;
    this.sfx('gong', D.c);
    if (!S.attract){
      feed(tr('⚔ ДУЭЛЬ НИНДЗЯ! Блок перед ударом — парирование, рывок — уклонение. Следи за вспышкой замаха', '⚔ NINJA DUEL! Block right before a hit to parry, blink to dodge. Watch for the wind-up flash', '⚔ ĐẤU NINJA!'), '#ffd27a');
      emit('radio', { text: tr('Две ниндзя сошлись в дуэли!', 'The two ninjas have met in a duel!', 'Hai ninja đấu tay đôi!'), pri: 2 });
      if (typeof FEEL76 !== 'undefined') FEEL76.slowmo(0.7, 0.55, true);
    }
  },
  duelEnd(w){
    const D = this.duel; if (!D) return;
    for (const u of D.f){ const N = this.N(u); N.duel = null; N.plan = null; }
    this.duel = null; this.duelCd = 25;
    if (w){ this.stats.duelWins[w.team]++; if (!S.attract){ feed(w.team === 0 ? tr('⚔ Дуэль выиграна! Наша ниндзя сильнее', '⚔ Duel won! Our ninja prevails', '⚔ Thắng!') : tr('⚔ Дуэль проиграна…', '⚔ Duel lost…', '⚔ Thua…'), w.team === 0 ? '#ffd27a' : '#f88'); if (w.team === 0 && (w === S.me) && typeof PROG !== 'undefined') PROG.award(300, tr('дуэль ниндзя', 'ninja duel', 'đấu ninja'), 1, '#ffd27a'); } }
  },
  announce(u, what){ if (S.attract) return; if (what === 'broken'){ const p = add(u.pos, mul(this.up(u), 1.6)); if (u === S.me || (NJ.duel && NJ.duel.f.includes(S.me))) S.popups.push({ text: tr('СТОЙКА СЛОМЛЕНА', 'POSTURE BROKEN', 'VỠ THẾ'), mult: 1, t: 0, color: '#ffd27a' }); burst(p, 12, 6, 0.3); this.sfx('clang', p); } },
  duelBrain(u, D, inp, dt){   // AI fighter (both sides; the possessed one is the player)
    const N = this.N(u), o = D.f[0] === u ? D.f[1] : D.f[0], M = this.N(o), up = this.up(u), d = dist(o.pos, u.pos);
    this.setFace(u, o.pos); inp.aim = tangent(sub(o.pos, u.pos), up);
    if (N.atk){ N.block = false; return; }
    if (M.atk && N.react && N.react.id === M.atk.id && N.react.kind === 'parry' && N.block && M.atk.t <= M.atk.A.h1 + 0.05) return;   // hold the parry through the hit window
    // react to a telegraphed attack: parry (well-timed block) or blink sideways
    if (M.atk && M.atk.A.h0 - M.atk.t < 0.35 && M.atk.A.h0 - M.atk.t > 0 && d < M.atk.A.reach + 2.5){
      if (!N.react || N.react.id !== M.atk.id){
        const r = random(), skill = u.team === 1 ? 0.55 * (DK().acc ? 1 / DK().acc : 1) : 0.6;
        N.react = { id: M.atk.id, kind: r < skill * 0.55 ? 'parry' : r < skill ? 'dodge' : 'none' };
      }
      if (N.react.kind === 'parry' && M.atk.A.h0 - M.atk.t < 0.18){ if (!N.block){ N.block = true; N.parryT = S.rtime; } return; }
      if (N.react.kind === 'dodge' && N.blinkCd <= 0){ const side = norm(cross(up, tangent(sub(o.pos, u.pos), up))); this.blink(u, add(u.pos, add(mul(side, (random() < 0.5 ? 1 : -1) * 4.5), mul(tangent(sub(u.pos, o.pos), up), 1.5)))); N.react.kind = 'none'; return; }
    }
    N.block = false;
    N.dT -= dt;
    if (M.stag > 0 && d < 4){ this.attack(u, 'c2', o); return; }   // punish a broken posture
    if (N.dT > 0){
      // circle at mid range
      const side = norm(cross(up, tangent(sub(o.pos, u.pos), up)));
      inp.wish = norm(add(mul(side, u.id % 2 ? 1 : -1), mul(tangent(sub(o.pos, u.pos), up), d > 5 ? 0.6 : d < 3 ? -0.6 : 0)));
      inp.speedMul = 0.9;
      return;
    }
    N.dT = 0.9 + random() * 1.1;
    const r = random();
    if (d > 7){ if (r < 0.5 && N.blinkCd <= 0) this.blink(u, add(o.pos, mul(tangent(sub(u.pos, o.pos), up), 3.2))); else if (N.shurCd <= 0) this.throwFan(u, norm(sub(centerOf(o), add(u.pos, mul(up, 0.85)))), 3); else inp.wish = inp.aim; return; }
    if (r < 0.35) this.attack(u, 'heavy', o);
    else if (r < 0.6) this.attack(u, 'lunge', o);
    else this.attack(u, this.nextCombo(u), o);
  },
  // ------------------------------------------------------------------ PLAYER control (3rd person; auto toggle)
  playerStep(u, inp, dt){
    const N = this.N(u), up = this.up(u);
    const L = SET.swapMouse ? mouseR : mouseL, R = SET.swapMouse ? mouseL : mouseR, J = K('jump');
    const lTap = L && !N.lPrev, jTap = J && !N.jPrev;
    N.lPrev = L; N.jPrev = J;
    if (this.autoActive(u)){
      const ai = this.brain(u, dt);
      inp.wish = ai.wish; inp.jump = ai.jump; inp.speedMul = ai.speedMul;
      if (len(TOUCH.move) > 0.3 || K('fwd') || K('back') || K('left') || K('right')){ this.autoHold = S.rtime + 1.5; }
      if (lTap) this.strikeInput(u);
      return;
    }
    if (N.duel){ const o = N.duel.f[0] === u ? N.duel.f[1] : N.duel.f[0]; if (o && o.alive) this.setFace(u, o.pos); }
    // block / parry: right mouse (phone: the block button)
    const blk = (R && !S.aiming78) || this.touchBlock;
    if (blk && !N.block && !N.atk){ N.block = true; N.parryT = S.rtime; }
    if (!blk) N.block = false;
    S.aiming = false;
    if (N.block) inp.speedMul *= 0.4;
    if (lTap) this.strikeInput(u);
    // double jump + wall-run
    if (u.grounded) N.jumps = 0;
    if (jTap && !u.grounded && !N.wall){
      if (this.tryWall(u)) {}
      else if (N.jumps < 1){ N.jumps++; u.vel = add(sub(u.vel, mul(up, dot(u.vel, up))), mul(up, RULES.JUMP * 1.05)); this.sfx('swish', u.pos); for (let i = 0; i < 5; i++) S.sparks.push({ pos: sub(u.pos, mul(up, 0.4)), vel: add(mul(up, -4), mul(randUnit(), 2)), life: 0.25 }); }
    }
    inp.speedMul *= 1.0;
  },
  // ------------------------------------------------------------------ rendering: meshes for the ST70 pass
  rig(u){   // pose angles from the current action
    const N = this.N(u), A = N.atk, T = S.rtime;
    const P = { sword: 0, swY: 0, bodyY: 0, lean: 0, arm: 0, crouch: 0, block: N.block ? 1 : 0, glow: 1 };
    if (A){
      const K = A.A, k = A.t;
      const wind = clamp(k / K.h0, 0, 1), sw = clamp((k - K.h0) / max(0.05, K.h1 - K.h0), 0, 1), rec = clamp((k - K.h1) / max(0.05, K.T - K.h1), 0, 1);
      const sgn = A.k === 'c1' ? -1 : 1;
      if (A.k === 'lunge'){ P.sword = -1.4 * (1 - sw) + 0.0; P.lean = 0.35 * wind - 0.1 * rec; P.arm = 1.5; P.swY = 0; }
      else if (A.k === 'heavy'){ P.arm = 2.6 * wind * (1 - sw) - 0.6 * sw * (1 - rec); P.sword = 0; P.lean = -0.2 * wind + 0.45 * sw * (1 - rec); P.crouch = 0.15 * sw * (1 - rec); }
      else { P.swY = sgn * (1.6 * wind - 3.4 * sw) * (1 - rec); P.arm = 1.25; P.lean = 0.15 * sw * (1 - rec); P.bodyY = sgn * (0.35 * wind - 0.7 * sw) * (1 - rec); if (A.k === 'c2'){ P.bodyY *= 2.2; P.crouch = 0.2 * sw; } }
      if (K.tele && k < K.h0) P.glow = 2.5 + 2 * sin(T * 40);
    } else if (N.block){ P.arm = 1.3; P.swY = 0.5; P.sword = -1.2; }
    else if (N.wall){ P.lean = 0.3; P.arm = -0.4; }
    else if (u.cls === 'inf' && !u.grounded){ P.crouch = 0.25; P.arm = -0.3; }
    if (N.tp && N.tp.ph === 'charge'){ P.glow = 3 + 3 * sin(T * 30); P.crouch = 0.3; }
    if (N.stag > 0){ P.lean = -0.35; P.arm = -0.6; P.glow = 0.3 + 0.7 * (sin(T * 25) > 0 ? 1 : 0); }
    return P;
  },
  // frame helper: base {pos,X,Y,Z} × local M34 → world frame for ST70 items
  F(b, m){
    const ax = c => add(add(mul(b.X, m[c]), mul(b.Y, m[4 + c])), mul(b.Z, m[8 + c]));
    return { pos: add(b.pos, add(add(mul(b.X, m[3]), mul(b.Y, m[7])), mul(b.Z, m[11]))), X: ax(0), Y: ax(1), Z: ax(2) };
  },
  items(L){
    if (!this.meshOK() || !S.cam) return;
    const cam = S.cam.pos, rts = S.mode !== 'fps' && !S.attract, M = M34;
    for (const u of this.all()){
      const N = this.N(u);
      if (N.hidden || (rts && typeof fogHidden === 'function' && fogHidden(u))) continue;
      const dc = dist(u.pos, cam); if (dc > (rts ? 900 : 260)) continue;
      const fac = this.fac(u), P = this.rig(u), up = u.kdUp || u.up, Z = this.bfwd(u), X = norm(cross(up, Z));
      N.shT -= this.dt; if (N.shT <= 0){ N.shT = 0.25; N.sh = shadowJS(add(u.pos, mul(up, 0.4))); }
      const base = { pos: sub(u.pos, mul(up, 0.5)), X, Y: up, Z };
      const it = (m, fr, extra) => L.push(Object.assign({ m, pos: fr.pos, X: fr.X, Y: fr.Y, Z: fr.Z, s: 1, team: fac, sh: N.sh, flash: u.flash || 0, glow: P.glow, nj: 1 }, extra || {}));
      const ph = u.phase, mv = u.moveAmt, air = !u.grounded && !N.wall;
      const hy = 0.9 - P.crouch * 0.28 + (N.wall ? 0.05 : 0);
      const hip = M.T(0, hy, 0), waist = M.ch(hip, M.RY(P.bodyY), M.RX(P.lean));
      it('nj_torso', this.F(base, waist)); it(fac ? 'nj_kit1' : 'nj_kit0', this.F(base, waist));
      it('nj_head', this.F(base, M.ch(waist, M.T(0, 0.5, 0), M.RX(-P.lean * 0.4))));
      for (const s of [-1, 1]){
        let a1 = sin(ph + (s > 0 ? PI : 0)) * 0.6 * mv, a2 = a1 - (0.15 + 0.85 * max(0, cos(ph + (s > 0 ? PI : 0)))) * mv - 0.08;
        if (air){ a1 = s > 0 ? 0.7 : 0.25; a2 = a1 - 1.1; }
        a1 += P.crouch * 1.3; a2 -= P.crouch * 0.6;
        const th = M.ch(hip, M.T(0.1 * s, 0, 0), M.RX(-a1));
        it('nj_thigh', this.F(base, th)); it('nj_shin', this.F(base, M.ch(th, M.T(0, -0.42, 0), M.RX(-(a2 - a1)))));
      }
      // right arm + katana
      const shR = M.ch(waist, M.T(0.19, 0.42, 0), M.RY(P.swY), M.RX(-(P.arm + (N.atk ? 0 : 0.3 - 0.25 * sin(ph) * mv))));
      const faR = M.ch(shR, M.T(0, -0.28, 0), M.RX(-(N.atk ? 0.25 : 0.55)));
      it('nj_uarm', this.F(base, shR)); it('nj_farm', this.F(base, faR));
      it('nj_katana', this.F(base, M.ch(faR, M.T(0, -0.3, 0.01), M.RX(P.sword))), { glow: P.glow * (N.atk ? 1.6 : 1) });
      // left arm (throws shurikens)
      const thr = N.throwT && S.rtime < N.throwT;
      const shL = M.ch(waist, M.T(-0.19, 0.42, 0), M.RX(thr ? -1.5 : N.block ? -1.1 : -(0.1 + 0.4 * sin(ph) * mv)));
      it('nj_uarm', this.F(base, shL)); it('nj_farm', this.F(base, M.ch(shL, M.T(0, -0.28, 0), M.RX(thr ? -0.1 : -0.45))));
    }
    // flying parts (hot cut faces)
    for (const q of this.pieces){
      if (dist2(q.pos, cam) > (rts ? 0 : 40000)) continue;
      const up = norm(q.pos), f = anyTangent(up);
      const Xa = rotAxis(f, q.ax, q.ang), Ya = rotAxis(up, q.ax, q.ang), Za = norm(cross(Xa, Ya));
      L.push({ m: q.m, pos: q.pos, X: Xa, Y: Ya, Z: Za, s: 1, team: q.fac, sh: 1, flash: 0, glow: 0.15 + q.hot, nj: 1 });
    }
    for (const s of this.shur){
      if (dist2(s.pos, cam) > 10000) continue;
      const v = len(s.vel) > 0.1 ? norm(s.vel) : norm(s.pos), up = norm(s.pos), Ya = norm(cross(v, norm(cross(up, v)))), Xa = rotAxis(v, Ya, s.spin);
      L.push({ m: 'nj_shur', pos: s.pos, X: Xa, Y: Ya, Z: norm(cross(Xa, Ya)), s: 1, team: s.fac, sh: 1, flash: 0, glow: 1.5, nj: 1 });
    }
  },
  parts(n){
    if (!S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP, lite = this.lite();
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    const cam = S.cam.pos;
    // blink afterimages: a bright streak + a fading ghost column
    for (const g of this.ghosts){
      const k = 1 - g.t / 0.35; if (k <= 0 || dist2(g.a, cam) > 40000) continue;
      const ty = g.team ? 1 : 0, h = mul(g.up, 0.9);
      push(add(g.a, h), 0.05 * k + 0.02, add(g.b, h), ty);
      if (!lite){ push(add(g.a, mul(g.up, 0.2)), 0.12 * k, add(g.a, mul(g.up, 1.5)), ty); push(add(g.b, mul(g.up, 0.3)), 0.04 * k, add(g.b, mul(g.up, 1.4)), 6); }
    }
    // short circuits on cut robots: jagged blue arcs
    if (this.arcs) for (const a of this.arcs){
      if (S.time > a.until || dist2(a.p, cam) > 6400) continue;
      if (random() < (lite ? 0.35 : 0.7)){
        let p = a.p; const m = lite ? 2 : 3;
        for (let i = 0; i < m; i++){ const q = add(p, mul(randUnit(), 0.25 + random() * 0.25)); push(p, 0.012, q, 6); p = q; }
        if (random() < 0.15) this.sfx('arc', a.p);
      }
    }
    // telegraph: a glint on the blade before a heavy cut / lunge; the teleport charge column
    for (const u of this.all()){
      const N = this.N(u), up = this.up(u);
      if (N.atk && N.atk.A.tele && N.atk.t < N.atk.A.h0){ const p = add(add(u.pos, mul(up, 0.9)), mul(this.bfwd(u), 0.5)); push(p, 0.05 + 0.05 * sin(S.rtime * 50), add(p, mul(up, 0.02)), 8); }
      if (N.tp && N.tp.ph === 'charge'){ const k = N.tp.t / N.tp.ct; for (let i = 0; i < (lite ? 2 : 5); i++){ const a = S.rtime * 6 + i * 1.26, r = 0.9 * (1 - k) + 0.2; const pp = add(add(u.pos, mul(up, -0.4 + 2 * ((S.rtime * 1.5 + i * 0.2) % 1))), add(mul(anyTangent(up), cos(a) * r), mul(cross(up, anyTangent(up)), sin(a) * r))); push(pp, 0.03, add(pp, mul(up, 0.15)), this.fac(u) ? 1 : 9); } }
      if (N.block && !lite){ const p = add(add(u.pos, mul(up, 0.75)), mul(this.bfwd(u), 0.45)); push(p, 0.02, add(p, mul(up, 0.35)), 4); }
    }
    if (!this.meshOK()) for (const s of this.shur) push(s.pos, 0.07, add(s.pos, mul(norm(s.vel || [0, 1, 0]), -0.3)), 4);
    return n;
  },
  lights(n){
    if (!S.cam) return n;
    const max_ = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxL : 16;
    for (const u of this.all()){
      if (n >= max_) break;
      const N = this.N(u); if (dist2(u.pos, S.cam.pos) > 3600) continue;
      const tele = (N.atk && N.atk.A.tele && N.atk.t < N.atk.A.h0) || (N.tp && N.tp.ph === 'charge');
      if (!tele && !N.atk) continue;
      const p = add(u.pos, mul(this.up(u), 1)), c = this.fac(u) ? [3.5, 0.3, 0.15] : [0.5, 2.6, 1.3], k = tele ? 1.6 + sin(S.rtime * 40) : 0.6;
      LP.set([p[0], p[1], p[2], 6], n * 4); LC.set([c[0] * k, c[1] * k, c[2] * k, 0.002], n * 4); n++;
    }
    return n;
  },
  // ------------------------------------------------------------------ player helpers
  blinkInput(u){
    const N = this.N(u); if (N.blinkCd > 0 || N.tp || N.stag > 0) return;
    if (u.energy < 0.6){ this.sfx('ping', u.pos); return; }
    const up = this.up(u), F = tangent(u.fwd, up), Rt = norm(cross(F, up));
    const f = clamp((K('fwd') ? 1 : 0) - (K('back') ? 1 : 0) + TOUCH.move[1], -1, 1), r = clamp((K('right') ? 1 : 0) - (K('left') ? 1 : 0) + TOUCH.move[0], -1, 1);
    let w = add(mul(F, f), mul(Rt, r)); w = len(w) < 0.2 ? F : norm(w);
    if (N.atk) N.atk = null;
    this.blink(u, add(u.pos, mul(w, 6.5)), null, !u.grounded);
    if (typeof HINTS !== 'undefined') HINTS.used('dash');
  },
  teleAim(u){
    const N = this.N(u);
    if (N.teleCd > 0){ feed(`${tr('Телепорт', 'Teleport', 'Dịch chuyển')}: ${Math.ceil(N.teleCd)} ${tr('с', 's', 'giây')}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
    if (!S.cam) return;
    const r = rayCast(S.cam.pos, S.cam.fwd, 160, u.team, false);
    if (r.t >= 159 || dist(r.pos, u.pos) < 5){ feed(tr('Телепорт: наведи прицел на землю (до 150 м)', 'Teleport: aim at the ground (up to 150 m)', 'Dịch chuyển: ngắm xuống đất'), '#f88'); emit('ui', { kind: 'deny' }); return; }
    this.teleport(u, this.safeSpot(norm(r.pos), 0.5), null);
    S.markers.push({ pos: r.pos, t: 0, life: 1.2, col: '#9cf' });
  },
  toggleAuto(v){
    this.autoP = v === undefined ? !this.autoP : !!v; this.autoHold = 0;
    SET.nj79auto = this.autoP; try { MENU.save(); } catch (e){}
    const u = this.ctrl(); if (u){ const N = this.N(u); N.zone = null; N.tgt = null; N.atk = null; N.block = false; }
    const ph = typeof TOUCH !== 'undefined' && TOUCH.on;
    feed(this.autoP ? tr('✶ АВТО: сама прыгает по зонам врага и режет. Джойстик / WASD — пауза 1.5 с', '✶ AUTO: she hops through enemy zones and cuts on her own. Stick / WASD pauses it for 1.5 s', '✶ TỰ ĐỘNG') : ph ? tr('✶ Ручное: тап по врагу — рывок и удар, свайп — взмах, 🛡 — блок', '✶ Manual: tap an enemy — dash & cut, swipe — slash, 🛡 — block', '✶ Thủ công') : tr('✶ Ручное управление: ЛКМ — катана, ПКМ — блок, Shift — рывок, Q — сюрикены, G — телепорт', '✶ Manual: LMB — katana, RMB — block, Shift — blink, Q — shurikens, G — teleport', '✶ Thủ công'), '#ffd27a');
    emit('ui', { kind: 'ok' });
  },
  onPossess(u){
    this.autoP = !!SET.nj79auto; this.autoHold = 0; this.possT = S.time;
    if (!this.helpShown && !S.attract){ this.helpShown = true;
      const ph = typeof TOUCH !== 'undefined' && TOUCH.on;
      feed(ph ? tr('✶ Ниндзя: тап по врагу — рывок и удар, свайп справа — взмах, ● — удар, 🛡 — блок (вовремя = парирование), ⇑ — рывок, ✦ — сюрикены, ◎ — телепорт, АВТО — сама', '✶ Ninja: tap an enemy — dash & cut, swipe on the right — slash, ● — strike, 🛡 — block (timed = parry), ⇑ — blink, ✦ — shurikens, ◎ — teleport, AUTO — on her own', '✶ Ninja')
               : tr(`✶ Ниндзя: ЛКМ — катана (держать — тяжёлый удар), ПКМ — блок (вовремя = парирование), Shift/Z — рывок, Q — сюрикены, G — телепорт к прицелу, прыжок в воздухе — двойной / бег по стене, ${keyLabel(SET.bind.nj79auto || 'KeyP')} — АВТО`, `✶ Ninja: LMB — katana (hold — heavy cut), RMB — block (timed = parry), Shift/Z — blink, Q — shurikens, G — teleport to the crosshair, jump in the air — double jump / wall-run, ${keyLabel(SET.bind.nj79auto || 'KeyP')} — AUTO`, '✶ Ninja'), '#ffd27a');
    }
  },
  step(dt){
    const t0 = performance.now();
    for (const u of this.all()){ this.combat(u, dt); if (u.jet !== this.JET){ u.jet = this.JET; } }
    for (const ev of S.events) if (ev.type === 'ack' && ev.g && ev.g.solo === 'ninja'){ const L = ev.g.units[0]; if (L){ const N = this.N(L); N.ordT = S.time; N.zone = null; } }
    this.stepPieces(dt); this.stepShur(dt);
    for (let i = this.ghosts.length - 1; i >= 0; i--){ this.ghosts[i].t += dt; if (this.ghosts[i].t > 0.35) this.ghosts.splice(i, 1); }
    if (this.arcs) this.arcs = this.arcs.filter(a => S.time < a.until);
    this.duelStep(dt);
    const ms = performance.now() - t0; this.stats.ms = this.stats.ms * 0.95 + ms * 0.05; this.stats.msMax = max(this.stats.msMax * 0.999, ms); this.stats.frames++;
  },
};
// rig: the katana angle P.sword = RX in forearm space (π = continues the arm, π/2 = across, 2.3 = lowered forward-down)
{ const rg0 = NJ.rig; NJ.rig = function(u){ const P = rg0.call(this, u), N = this.N(u); P.sword = N.atk ? (N.atk.k === 'lunge' ? 3.1 : N.atk.k === 'heavy' ? 2.9 : 2.75) : N.block ? 1.57 : 2.3; return P; }; }
{ const sf0 = NJ.setFace; NJ.setFace = function(u, p){ const N = this.N(u), f = tangent(sub(p, u.pos), this.up(u)); if (len(f) < 0.01) return; N.bf = f; N.faceT = S.rtime + 0.6; if (u !== S.me){ u.fwd = norm(add(f, mul(this.up(u), -0.04))); clampFwd(u); u.aim = u.fwd; } }; }
NJ.faceTo = function(u, p){ this.setFace(u, p); };
NJ.bfwd = function(u){ const N = this.N(u), up = this.up(u); if (N.block && u === S.me && !this.autoActive(u) && !N.duel) return tangent(u.fwd, up); if (N.bf && S.rtime < N.faceT) return tangent(N.bf, up); if (N.mf && S.rtime < N.mfT) return tangent(N.mf, up); return tangent(u.fwd, up); };
// manual extras: heavy cut on hold, blink / shuriken on key edges, body faces the movement, auto mode turns the camera gently
{ const ps0 = NJ.playerStep;
  NJ.playerStep = function(u, inp, dt){
    const N = this.N(u), L = SET.swapMouse ? mouseR : mouseL;
    if (L && !N.lPrev) N.lDown = S.rtime;
    const run = K('run'), rk = K('rocket');
    if (run && !N.rnPrev) this.blinkInput(u);
    if (rk && !N.rkPrev && N.shurCd <= 0){ const t = this.pick(u, 40), up = this.up(u), eye = add(u.pos, mul(up, 0.85)); this.throwFan(u, t ? norm(sub(centerOf(t), eye)) : (S.cam ? S.cam.fwd : u.fwd), 3); }
    N.rnPrev = run; N.rkPrev = rk;
    ps0.call(this, u, inp, dt);
    if (!this.autoActive(u)){
      if (L && N.lDown && S.rtime - N.lDown > 0.42 && !N.heavyDone && !N.blink && !N.tp){ N.heavyDone = true; N.atk = null; this.attack(u, 'heavy', this.pick(u, 4)); }
      if (!L){ N.heavyDone = false; N.lDown = 0; }
      if (len(inp.wish) > 0.2){ N.mf = inp.wish; N.mfT = S.rtime + 0.25; }
    } else if (N.bf && S.rtime < N.faceT && S.rtime - (S.lookT79 || -9) > 0.6){
      const want = tangent(N.bf, this.up(u)), cur = tangent(u.fwd, this.up(u)), k = min(1, dt * 2.5), nf = norm(add(mul(cur, 1 - k), mul(want, k)));
      u.fwd = norm(add(nf, mul(this.up(u), dot(u.fwd, this.up(u))))); clampFwd(u);
      N.mf = null;
    }
    if (!this.autoActive(u)){ inp.jump = K('jump') && u.grounded; if (N.tp || N.stag > 0) inp.wish = [0, 0, 0]; }
    inp.thrust = false; inp.brake = false; inp.rocket = false; inp.fire = false; S.aiming = false;
  }; }
// ---------------------------------------------------------------------
//  meshes (ST70 builders: x right, y up, z forward; materials 0 faction paint, 1 matte, 2 metal, 3 faction glow, 4 glass, 5 hot/emissive)
// ---------------------------------------------------------------------
const C79 = { SUIT: [0.035, 0.035, 0.04], SUIT2: [0.06, 0.062, 0.07], P: [0.5, 0.5, 0.5], OL: [0.2, 0.215, 0.13], BL: [0.62, 0.64, 0.68], G: [1, 1, 1], HOT: [4.2, 1.5, 0.3], DK: [0.02, 0.02, 0.022], ST: [0.12, 0.12, 0.13] };
Object.assign(ST70_DEF, {
  nj_torso(){ const g = G69();
    g69box(g, [0, 0.02, 0], [0.13, 0.08, 0.085], 0.05, C79.SUIT, 2);            // pelvis
    g69tube(g, [0, 0.08, 0], [0, 0.27, 0], 0.085, 0.075, 10, C79.SUIT2, 2);      // slim waist
    g69box(g, [0, 0.37, 0.005], [0.15, 0.11, 0.095], 0.06, C79.SUIT, 2);         // chest
    g69tube(g, [0, 0.45, 0], [0, 0.55, 0.01], 0.042, 0.038, 8, C79.SUIT2, 2);    // neck
    g69box(g, [0, 0.33, 0.1], [0.01, 0.06, 0.004], 0.003, C79.G, 3);            // glowing seam
    for (const s of [-1, 1]) g69with(g, M34.T(s * 0.19, 0.42, 0), () => g69lathe(g, 0, 0, [[-0.06, 0], [-0.05, 0.045], [0, 0.058], [0.05, 0.045], [0.06, 0]], 10, C79.SUIT2, 2));
    return g; },
  nj_kit0(){ const g = G69();   // Consortium: beige plates, olive straps and pouches, back sheath
    g69box(g, [0, 0.38, 0.08], [0.125, 0.075, 0.03], 0.03, C79.P, 0);
    for (const s of [-1, 1]){ g69box(g, [s * 0.215, 0.45, 0], [0.065, 0.035, 0.075], 0.03, C79.P, 0); g69box(g, [s * 0.1, -0.06, 0.04], [0.045, 0.07, 0.06], 0.02, C79.P, 0); }
    g69box(g, [0, 0.085, 0], [0.135, 0.022, 0.092], 0.01, C79.OL, 1);
    for (const x of [-0.11, 0.11, -0.05]) g69box(g, [x, 0.06, 0.095], [0.028, 0.032, 0.02], 0.01, C79.OL, 1);
    g69with(g, M34.ch(M34.T(0, 0.33, 0), M34.RZ(0.75)), () => g69box(g, [0, 0, 0.1], [0.012, 0.19, 0.012], 0.004, C79.OL, 1));
    g69tube(g, [-0.13, 0.5, -0.11], [0.14, 0.02, -0.12], 0.022, 0.02, 6, C79.DK, 2);
    return g; },
  nj_kit1(){ const g = G69();   // Swarm: dark-red plates, spikes, red glow lines
    g69box(g, [0, 0.37, 0.08], [0.12, 0.085, 0.028], 0.02, C79.P, 0);
    for (const s of [-1, 1]){
      g69box(g, [s * 0.215, 0.45, 0], [0.07, 0.03, 0.08], 0.015, C79.P, 0);
      g69tube(g, [s * 0.23, 0.47, -0.01], [s * 0.31, 0.62, -0.06], 0.024, 0.002, 6, C79.P, 0);
      g69tube(g, [s * 0.2, 0.47, 0.03], [s * 0.25, 0.57, 0.02], 0.016, 0.002, 6, C79.P, 0);
      g69box(g, [s * 0.07, 0.25, 0.088], [0.006, 0.07, 0.004], 0.002, C79.G, 3);
      g69box(g, [s * 0.1, -0.06, 0.04], [0.045, 0.07, 0.05], 0.012, C79.P, 0);
    }
    g69tube(g, [0, 0.42, -0.1], [0, 0.6, -0.16], 0.02, 0.002, 6, C79.P, 0);
    g69tube(g, [-0.13, 0.5, -0.11], [0.14, 0.02, -0.12], 0.022, 0.02, 6, C79.DK, 2);
    return g; },
  nj_head(){ const g = G69();
    g69box(g, [0, 0.13, 0.005], [0.078, 0.1, 0.095], 0.07, C79.SUIT, 2);
    g69box(g, [0, 0.07, 0.07], [0.055, 0.035, 0.035], 0.03, C79.SUIT2, 2);       // jaw
    g69box(g, [0, 0.145, 0.093], [0.066, 0.013, 0.008], 0.005, C79.G, 3);        // visor slit
    for (const s of [-1, 1]){ g69tube(g, [s * 0.055, 0.2, -0.02], [s * 0.12, 0.47, -0.13], 0.009, 0.004, 5, C79.SUIT2, 2); g69box(g, [s * 0.12, 0.475, -0.13], [0.012, 0.012, 0.012], 0.006, C79.G, 3); }
    g69tube(g, [0, 0.2, -0.08], [0, 0.12, -0.2], 0.022, 0.018, 6, C79.SUIT2, 2);    // cable ponytail
    g69tube(g, [0, 0.12, -0.2], [0, -0.16, -0.25], 0.018, 0.008, 6, C79.SUIT2, 2);
    return g; },
  nj_thigh(){ const g = G69(); g69tube(g, [0, 0.02, 0], [0, -0.42, 0], 0.068, 0.048, 9, C79.SUIT, 2); g69lathe(g, 0, 0, [[-0.05, 0], [0, 0.05], [0.05, 0]], 8, C79.SUIT2, 2); return g; },
  nj_shin(){ const g = G69(); g69tube(g, [0, 0, 0], [0, -0.39, 0], 0.048, 0.032, 8, C79.SUIT2, 2); g69box(g, [0, -0.42, 0.04], [0.035, 0.025, 0.085], 0.015, C79.SUIT, 2); g69box(g, [0, -0.12, 0.04], [0.03, 0.09, 0.012], 0.01, C79.P, 0); return g; },
  nj_uarm(){ const g = G69(); g69tube(g, [0, 0, 0], [0, -0.28, 0], 0.045, 0.036, 8, C79.SUIT, 2); return g; },
  nj_farm(){ const g = G69(); g69tube(g, [0, 0, 0], [0, -0.27, 0], 0.036, 0.03, 8, C79.SUIT2, 2); g69box(g, [0, -0.3, 0.005], [0.028, 0.04, 0.03], 0.015, C79.SUIT, 2); g69box(g, [0, -0.13, 0.03], [0.026, 0.08, 0.01], 0.008, C79.P, 0); return g; },
  nj_katana(){ const g = G69();
    g69tube(g, [0, -0.22, 0], [0, 0.02, 0], 0.018, 0.018, 6, C79.DK, 1);                 // wrapped grip
    g69box(g, [0, 0.035, 0], [0.045, 0.008, 0.035], 0.004, C79.SUIT2, 2);                 // tsuba
    g69box(g, [0, 0.52, -0.004], [0.009, 0.48, 0.02], 0.004, C79.BL, 2);                 // blade
    g69box(g, [0, 0.52, 0.019], [0.006, 0.47, 0.006], 0.003, C79.G, 3);                  // energy edge (faction glow)
    g69tube(g, [0, 0.99, 0.0], [0, 1.08, 0.02], 0.014, 0.001, 4, C79.BL, 2);               // tip
    return g; },
  nj_shur(){ const g = G69(); for (let k = 0; k < 4; k++) g69with(g, M34.RY(k * PI / 2), () => g69tube(g, [0, 0, 0.02], [0, 0, 0.13], 0.03, 0.002, 4, C79.BL, 2)); g69box(g, [0, 0, 0], [0.025, 0.006, 0.025], 0.004, C79.G, 3); return g; },
  // debris: steel robot parts with faction-paint plates, a glowing hot cut face and sparking wires
  db_head(){ const g = G69(); g69box(g, [0, 0, 0], [0.105, 0.115, 0.125], 0.05, C79.ST, 2); g69box(g, [0, 0.09, 0], [0.11, 0.035, 0.13], 0.03, C79.P, 0); g69box(g, [0, 0.0, 0.122], [0.075, 0.028, 0.018], 0.01, C79.G, 3); g69box(g, [0, -0.118, 0], [0.07, 0.014, 0.07], 0.006, C79.HOT, 5); g69tube(g, [0.02, -0.12, 0], [0.06, -0.24, 0.03], 0.008, 0.006, 4, C79.G, 3); return g; },
  db_arm(){ const g = G69(); g69tube(g, [0, 0.16, 0], [0, -0.22, 0], 0.06, 0.048, 8, C79.ST, 2); g69box(g, [0, 0.04, 0.05], [0.045, 0.09, 0.02], 0.012, C79.P, 0); g69box(g, [0, -0.27, 0], [0.045, 0.055, 0.04], 0.02, C79.ST, 2); g69box(g, [0, 0.168, 0], [0.058, 0.012, 0.058], 0.005, C79.HOT, 5); g69tube(g, [0.01, 0.17, 0], [0.05, 0.28, 0.02], 0.007, 0.005, 4, C79.G, 3); return g; },
  db_leg(){ const g = G69(); g69tube(g, [0, 0.22, 0], [0, -0.26, 0], 0.075, 0.055, 8, C79.ST, 2); g69box(g, [0, 0.0, 0.06], [0.05, 0.12, 0.02], 0.012, C79.P, 0); g69box(g, [0, -0.3, 0.05], [0.065, 0.035, 0.11], 0.02, C79.ST, 2); g69box(g, [0, 0.228, 0], [0.07, 0.012, 0.07], 0.005, C79.HOT, 5); return g; },
  db_torso(){ const g = G69(); g69box(g, [0, 0, 0], [0.19, 0.18, 0.12], 0.05, C79.ST, 2); g69box(g, [0, 0.04, 0.11], [0.15, 0.11, 0.025], 0.02, C79.P, 0); g69box(g, [0, 0.03, -0.13], [0.14, 0.13, 0.04], 0.03, C79.P, 0);
    g69box(g, [0, -0.185, 0], [0.175, 0.014, 0.115], 0.006, C79.HOT, 5);
    for (const x of [-0.08, 0.03, 0.1]) g69tube(g, [x, -0.18, 0.02], [x * 1.4, -0.33, 0.05], 0.009, 0.006, 4, C79.G, 3);
    for (const s of [-1, 1]) g69tube(g, [s * 0.2, 0.12, 0], [s * 0.26, 0.0, 0.02], 0.05, 0.04, 6, C79.ST, 2);
    return g; },
  db_gun(){ const g = G69(); g69box(g, [0, 0, 0], [0.035, 0.05, 0.21], 0.015, C79.SUIT2, 2); g69tube(g, [0, 0.02, 0.2], [0, 0.02, 0.4], 0.018, 0.018, 6, C79.DK, 2); return g; },
  db_plate(){ const g = G69(); g69box(g, [0, 0, 0], [0.3, 0.03, 0.22], 0.02, C79.P, 0); g69box(g, [0.3, 0, 0], [0.012, 0.032, 0.21], 0.005, C79.HOT, 5); return g; },
  db_rotor(){ const g = G69(); g69with(g, M34.RX(-PI / 2), () => g69torus(g, [0, 0, 0], 0.32, 0.025, 16, 5, C79.SUIT2, 2)); g69tube(g, [-0.3, 0, 0], [0.3, 0, 0], 0.02, 0.02, 4, C79.DK, 2); g69box(g, [0, 0, 0], [0.04, 0.02, 0.04], 0.01, C79.HOT, 5); return g; },
});
// ---------------------------------------------------------------------
//  hooks
// ---------------------------------------------------------------------
ARMOR.ninja = { b: 0.55, m: 0.55, r: 0.6, s: 0.6, f: 0.5, g: 0.6, a: 0.6, l: 0.75, x: 1, k: 1 };
if (SET_DEF.nj79auto === undefined) SET_DEF.nj79auto = true;
if (SET.nj79auto === undefined) SET.nj79auto = true;
if (typeof BIND_DEF !== 'undefined' && !BIND_DEF.nj79auto){
  BIND_DEF.nj79auto = 'KeyP';
  BIND_NAMES.nj79auto = ['Робо-ниндзя: АВТО вкл/выкл', 'Robo-ninja: AUTO on/off', 'Ninja: TỰ ĐỘNG'];
  if (SET_DEF.bind) SET_DEF.bind.nj79auto = 'KeyP';
  if (SET.bind && !SET.bind.nj79auto) SET.bind.nj79auto = 'KeyP';
}
// --- unlock: research in the Barracks (needs a finished Mech factory), then the hero (1 per side)
{ const cp0 = canProduce;
  canProduce = function(team, key){
    if (key === 'nj79r' || key === 'nj79'){
      if (!NJ.on) return tr('Выключено', 'Disabled', 'Tắt');
      const T = S.teams[team], dev = team === 0 && typeof DEV !== 'undefined' && DEV.on;
      if (key === 'nj79r'){
        if (T.nj79r) return tr('Уже исследовано', 'Already researched', 'Đã nghiên cứu');
        if (!dev && !S.buildings.some(b => b.alive && b.team === team && b.done && b.type === 'factory')) return tr('Нужен готовый Мехзавод', 'Requires a finished Mech factory', 'Cần Nhà máy');
      } else {
        if (!T.nj79r && !dev) return tr('Нужно исследование «Протокол „Тень“»', 'Requires "Shadow protocol" research', 'Cần nghiên cứu');
        if (NJ.of(team) || countQueued(team, ['nj79']) > 0) return tr('Героиня уже есть (1 на сторону)', 'Hero already deployed (1 per side)', 'Đã có (1 mỗi phe)');
      }
    }
    return cp0.apply(this, arguments);
  }; }
{ const fp0 = finishProduct;
  finishProduct = function(site, key){
    if (key === 'nj79r'){
      const T = S.teams[site.team]; T.nj79r = 1;
      if (!S.attract){ if (site.team === 0){ feed(tr('Исследование завершено: Протокол «Тень» — в Казарме доступна робо-ниндзя', 'Research complete: Shadow protocol — the robo-ninja is available in the Barracks', 'Nghiên cứu xong: ninja robot'), TEAM[0].css); emit('radio', { text: tr('Протокол Тень готов. Можно призвать робо-ниндзя', 'Shadow protocol ready. The robo-ninja can be deployed', 'Giao thức Bóng sẵn sàng'), pri: 1 }); } }
      return;
    }
    if (key === 'nj79'){ const u = NJ.safe(() => NJ.spawn(site.team, site), 'spawn'); if (u && site.rally) setOrder(u.squad, 'move', site.rally, { lock: 25 }); return; }
    return fp0.apply(this, arguments);
  }; }
{ const ec0 = economy;
  economy = function(t){
    const r = ec0.apply(this, arguments);
    NJ.safe(() => {
      if (!NJ.on || S.time < (t === 1 ? 420 : 540) / max(0.5, GAME.INC_MUL)) return;
      const T = S.teams[t];
      if (!T.nj79r && countQueued(t, ['nj79r']) === 0 && T.ore > 420 && !canProduce(t, 'nj79r')) produce(t, 'nj79r');
      else if (T.nj79r && T.ore > 520 && !canProduce(t, 'nj79')) produce(t, 'nj79');
    }, 'eco');
    return r;
  }; }
// --- AI and player input, motion, attacks
{ const bi0 = botInput; botInput = function(u, dt){ if (NJ.is(u) && NJ.on){ const r = NJ.safe(() => NJ.brain(u, dt), 'brain'); if (r) return r; } return bi0.apply(this, arguments); }; }
{ const pi0 = playerInput;
  playerInput = function(p){
    const inp = pi0.apply(this, arguments);
    if (NJ.is(p) && inp && !CAMFX.busy()) NJ.safe(() => NJ.playerStep(p, inp, NJ.dt), 'pstep');
    return inp;
  }; }
{ const pf0 = playerFire; playerFire = function(u, inp, dt){ if (NJ.is(u)) return; return pf0.apply(this, arguments); }; }
{ const ph0 = physStep;
  physStep = function(e, inp, dt, free){
    if (e && e.role === 'ninja' && e.cls === 'inf' && e.alive && !free){ const skip = NJ.safe(() => NJ.motion(e, dt), 'motion'); if (skip) return; }
    return ph0.apply(this, arguments);
  }; }
{ const gd0 = gunDash; gunDash = function(){ const u = NJ.ctrl(); if (u){ NJ.blinkInput(u); return; } return gd0.apply(this, arguments); }; }
{ const lb0 = lookBy; lookBy = function(){ S.lookT79 = S.rtime; return lb0.apply(this, arguments); }; }
{ const dm0 = damage;
  damage = function(e, dmg, src, pt){
    if (e && e.role === 'ninja' && e.cls === 'inf' && e.alive && e.nj){
      const N = e.nj;
      if (N.hidden || (N.iT > 0 && pt !== 'x')) return;
      if (N.block && pt !== 'k' && src && src.pos && 'bmlf'.includes(pt || 'b') && dot(NJ.bfwd(e), tangent(sub(src.pos, e.pos), NJ.up(e))) > 0.2){
        const p = add(add(e.pos, mul(NJ.up(e), 0.75)), mul(NJ.bfwd(e), 0.4));
        dmg *= S.rtime - N.parryT < 0.3 ? 0 : 0.12; burst(p, 3, 6, 0.15); NJ.stats.deflects++;
        if (random() < 0.3) NJ.sfx('ping', p);
        if (dmg <= 0) return;
      }
      if (S.time - N.postT > 0.2 && pt !== 'k'){ N.posture = min(90, N.posture + dmg * 0.05); }
    }
    return dm0.call(this, e, dmg, src, pt);
  }; }
{ const ds0 = destroy;
  destroy = function(e, src){
    const nj = NJ.is(e) && e.alive;
    const r = ds0.apply(this, arguments);
    if (nj && !S.attract){
      feed(e.team === 0 ? tr('✶ Наша робо-ниндзя уничтожена. Можно призвать снова в Казарме', '✶ Our robo-ninja is down. Deploy her again in the Barracks', '✶ Ninja của ta bị hạ') : tr('✶ Робо-ниндзя противника уничтожена!', '✶ Enemy robo-ninja destroyed!', '✶ Đã hạ ninja địch!'), e.team === 0 ? '#f88' : '#ffd27a');
      emit('radio', { text: e.team === 0 ? tr('Мы потеряли робо-ниндзя', 'We lost the robo-ninja', 'Mất ninja') : tr('Робо-ниндзя противника уничтожена', 'Enemy robo-ninja destroyed', 'Đã hạ ninja địch'), pri: 1 });
    }
    return r;
  }; }
{ const tc0 = takeControl;
  takeControl = function(u){
    const r = tc0.apply(this, arguments);
    if (NJ.is(u) && !S.attract){ S.third = true; NJ.safe(() => NJ.onPossess(u), 'poss'); }
    return r;
  }; }
// --- camera: over-the-shoulder, a little further back and higher (the blade and the enemy stay visible)
{ const sc0 = setupCamera;
  setupCamera = function(dt){
    sc0.apply(this, arguments);
    NJ.safe(() => {
      const u = NJ.ctrl(), cam = S.cam;
      if (!u || !cam || S.freecam || S.camOverride || CAMFX.busy()){ NJ.camP = null; return; }
      if (!S.third){ S.third = true; }
      const up = u.up, f = u.fwd, right = norm(cross(f, up)), head = add(u.pos, mul(up, 1.1));
      const want = add(add(head, mul(f, -4.3)), add(mul(up, 0.75), mul(right, 0.6)));
      let p = !NJ.camP || dist(NJ.camP, want) > 30 ? want : add(NJ.camP, mul(sub(want, NJ.camP), 1 - Math.exp(-dt * 14)));
      p = pullCam(head, p); NJ.camP = p;
      Object.assign(cam, { pos: p }, camBasis(f, up));
      const el = len(cam.pos); if (el > S.R) cam.pos = mul(cam.pos, 1 - 2 * S.R / el);
    }, 'cam');
  }; }
// --- rendering
{ const go0 = gatherObjects;
  gatherObjects = function(){
    const r = go0.apply(this, arguments);
    NJ.safe(() => {
      const mesh = NJ.meshOK();
      for (let i = 0; i < renderList.length; i++){ const e = renderList[i].e; if (e && e.role === 'ninja' && e.cls === 'inf' && e.alive && (mesh || (e.nj && e.nj.hidden))) OBJ[i * 28 + 3] = -Math.abs(OBJ[i * 28 + 3]); }
    }, 'obj');
    return r;
  }; }
if (typeof ST70 !== 'undefined'){ const c0 = ST70.collect; ST70.collect = function(){ c0.apply(this, arguments); if (!this.items) this.items = []; NJ.safe(() => NJ.items(this.items), 'items'); }; }
{ const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); const m = NJ.safe(() => NJ.parts(n), 'par'); return m === undefined ? n : m; }; }
{ const gl0 = gatherLights; gatherLights = function(){ const n = gl0.apply(this, arguments); const m = NJ.safe(() => NJ.lights(n), 'lit'); return m === undefined ? n : m; }; }
// --- world step, match reset, saves, RTS card icon
{ const up0 = update;
  update = function(rdt){
    up0(rdt);
    if (S.paused || !NJ.on) return;
    const dt = clamp(S.time - (NJ.lt === null ? S.time : NJ.lt), 0, 0.1); NJ.lt = S.time; NJ.dt = dt || 0.016;
    if (dt > 0) NJ.safe(() => NJ.step(dt), 'step');
  }; }
{ const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); NJ.lt = null; NJ.pieces = []; NJ.shur = []; NJ.ghosts = []; NJ.arcs = []; NJ.duel = null; NJ.duelCd = 0; NJ.camP = null; return r; }; }
{ const ld0 = SAVE.load; SAVE.load = function(){ const ok = ld0.apply(this, arguments); if (ok) for (const u of S.units) if (u.role === 'ninja'){ u.nj = NJ.fresh(); u.jet = NJ.JET; } NJ.duel = null; return ok; }; }
{ const ci0 = cardGroupIcon; cardGroupIcon = function(g){ return g && g.solo === 'ninja' ? '✶' : ci0.apply(this, arguments); }; }
// console checks: NJ.demo.spawn(), .duel(), .cut(), .auto()
NJ.demo = {
  spawn(team){ const u = NJ.spawn(team === undefined ? 0 : team); return u && u.id; },
  near(u, d){ const c = ctrlEntity() || S.units.find(x => x.team === 0); if (!u || !c) return; u.pos = surfacePoint(offsetOnSphere(norm(c.pos), c.fwd || anyTangent(norm(c.pos)), d || 8), 0.5); u.vel = [0, 0, 0]; },
  duel(){ const a = NJ.of(0) || NJ.spawn(0), b = NJ.of(1) || NJ.spawn(1); b.pos = surfacePoint(offsetOnSphere(norm(a.pos), a.fwd, 12), 0.5); b.vel = [0, 0, 0]; NJ.duelCd = 0; return [a.id, b.id]; },
  possess(){ const a = NJ.of(0) || NJ.spawn(0); takeControl(a); return a.id; },
};
