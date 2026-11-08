// =====================================================================
//  v8.6 — АНОМАЛИИ, волна 2 (AN86) — на каркасе волны 1 (v78_anomalies.js, A78): тот же список A78.L, обнаружение,
//  радио-предупреждения, обход ИИ, разрядка взрывом/болтом, артефакты, метки на картах.
//   «Вывих» — круг, пыль «падает вверх»; юнит взлетает в небо-портал и через ~5 с выходит в антиподе (выход подсвечен
//     обеим командам) с дезориентацией 2 с. Везде.
//   «Мозаика» — квадрат 10×10 м: крупные «пиксели Денди» (меняются тактами), движение рывками, разброс +50 %, ИИ теряет цели.
//   «Гейзер хладагента» — иней, шипение 2 с, столб пара: заморозка (−60 % скорости, +40 % урона от взрывов, 8 с). Снег.
//   «Сквозняк» — полоса марева 6 × 30 м, толкает юнитов, ранцы и снаряды; направление меняется раз в 2 минуты. Осень.
//   «Глушитель» — серая статика: внутри нет радио и поддержки, обзор роботов ×0.4, выстрелы тихие. Везде.
//  Бюджет: частицы/свет — только у ближайших 6 (на слабой графике 3). Хуки — обёртки A78.* (spawn, stepOne, discharge,
//  parts, lights, distort, overlay) и physStep, botInput, playerInput, gunShoot, findTarget, visRadius, damage, emit,
//  usePower, AU.shot, ST70.collect, drawOverlay. Выключается вместе с волной 1 (?a78=0) или отдельно ?an86=0.
// =====================================================================
var AN86 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('an86') === '0') return false; return localStorage.getItem('pm_an86') !== '0'; } catch (e){ return true; } })() && typeof A78 !== 'undefined',
  err: {}, W2: { disloc: 1, mosaic: 1, geyser: 1, draft: 1, mute: 1 },
  stats: { lifts: 0, exits: 0, frozen: 0, pushed: 0, muted: 0, blocked: 0, lost: 0, spread: 0, spawned: 0, dis: 0, projPushed: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('AN86 ' + tag, e); } } },
  lite(){ return A78.lite() || (typeof BIO86 !== 'undefined' && BIO86.lv() === 0); },
  is(a){ return !!(a && this.W2[a.k]); },
  // ------------------------------------------------------------------ спавн (после волны 1, свой генератор от того же зерна)
  spawn(seed){
    if (!this.on || !A78.on || SET.a78 === false) return;
    const rnd = seeded((seed ^ 0x8686) >>> 0), lite = A78.lite();
    const plan = lite ? ['disloc', 'mosaic', 'geyser', 'draft', 'mute'] : ['disloc', 'disloc', 'mosaic', 'geyser', 'geyser', 'draft', 'draft', 'mute'];
    const want = { geyser: 3, draft: 2 };   // биом: снег / осень (остальные — где угодно)
    const V = typeof veins === 'function' ? veins() : [];
    for (const k of plan){
      const r = A78.K[k].r;
      for (let n = 0; n < 160; n++){
        let dir;
        if (rnd() < 0.5){ const c = CPD[floor(rnd() * CPD.length)]; dir = offsetOnSphere(c, norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), 36 + rnd() * 70); }
        else dir = norm([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
        if (want[k] && typeof BIO86 !== 'undefined' && BIO86.on && BIO86.at(mul(dir, RM)) !== want[k] && n < 140) continue;
        if (!A78.freeAt(dir, r + (k === 'draft' ? 10 : 0), V)) continue;
        if (k === 'disloc'){ const ex = mul(dir, -1); if (!A78.freeAt(ex, 6, V) || abs(groundR(ex) - RM) > 14) continue; }
        const g = groundR(dir); if (abs(g - RM) > 14) continue;
        const t0 = anyTangent(dir), t1 = cross(dir, t0), m = (k === 'draft' ? 12 : r * 0.7) / RM;
        let lo = g, hi = g;
        for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const h = groundR(norm(add(dir, add(mul(t0, u * m), mul(t1, v * m))))); lo = min(lo, h); hi = max(hi, h); }
        if (hi - lo > (k === 'draft' ? 5 : 2.8)) continue;
        const a = A78.make(k, dir, g, rnd, lite);
        this.init(a, rnd);
        A78.L.push(a); this.stats.spawned++;
        break;
      }
    }
  },
  init(a, rnd){
    a.w2 = 1;
    if (a.k === 'disloc'){ a.ex = mul(a.dir, -1); a.exG = groundR(a.ex); a.exPos = mul(a.ex, a.exG); a.exT = -99; }
    if (a.k === 'draft'){ a.ax = a.t1; a.L = 15; a.W = 3; a.flipT = floor(rnd() * 120); }
    if (a.k === 'mosaic'){ a.half = 5; }
  },
  // точка внутри зоны аномалии (форма: круг / квадрат / полоса)
  inside(a, p, pad){
    pad = pad || 0;
    const v = sub(p, a.pos), h = dot(v, a.dir);
    if (h < -3 || h > (a.k === 'draft' ? 14 : 6)) return false;
    if (a.k === 'mosaic') return abs(dot(v, a.t1)) < a.half + pad && abs(dot(v, a.t2)) < a.half + pad;
    if (a.k === 'draft') return abs(dot(v, a.ax)) < a.L + pad && abs(dot(v, a.t2)) < a.W + pad;
    const t = sub(v, mul(a.dir, h)); return dot(t, t) < (a.r + pad) * (a.r + pad);
  },
  zoneOf(p, k){
    if (!this.on || !A78.L.length || !p || !A78.active()) return null;
    for (const a of A78.L){ if (a.k !== k || A78.dorm(a)) continue; if (dist2(a.pos, p) < 900 && this.inside(a, p)) return a; }
    return null;
  },
  sign(a){ return floor((S.time + a.flipT) / 120) % 2 ? 1 : -1; },
  // ------------------------------------------------------------------ симуляция
  stepOne(a, dt){
    if (A78.dorm(a)){ a.st = 'dorm'; return; }
    if (a.st === 'dorm'){ a.st = 'idle'; a.t = 0; }
    a.t += dt;
    const occ = a.occ.filter(e => e.alive && !e.boss83 && this.inside(a, e.pos, 0.5));
    switch (a.k){
      case 'disloc':
        if (a.st === 'cool'){ if (a.t > 3){ a.st = 'idle'; a.t = 0; } break; }
        for (const e of occ) this.lift(e, a);
        if (occ.length){ a.st = 'cool'; a.t = 0; }
        break;
      case 'geyser':
        if (a.st === 'idle'){ if (occ.length){ a.st = 'hiss'; a.t = 0; this.sfx('hiss', a); } }
        else if (a.st === 'hiss'){ if (random() < dt * 8) fxSmoke(A78.ring(a, random() * 1.2, 0.3, random() * 6.283), 0.5, 0.75, 0.5); if (a.t >= 2){ this.fire(a, 1); a.st = 'burst'; a.t = 0; } }
        else if (a.st === 'burst'){ a.fxT -= dt; if (a.fxT <= 0){ a.fxT = this.lite() ? 0.25 : 0.12; fxSmoke(add(a.pos, mul(a.dir, 1 + random() * 7)), 1.2 + random(), 0.85, 0.9); }
          if (a.t >= 1.5){ a.st = 'cool'; a.t = 0; } }
        else if (a.st === 'cool' && a.t >= 6){ a.st = 'idle'; a.t = 0; }
        break;
      case 'draft': {
        const s = this.sign(a), F = mul(a.ax, s * (a.gust > S.time ? 2.2 : 1));
        for (const e of A78.within(a, a.L + 2)){
          if (!e.alive || e.boss83 || !this.inside(a, e.pos)) continue;
          const k = e.cls === 'tank' ? 0.22 : e.cls === 'drone' ? 1.4 : e.grounded ? 1 : 1.6;   // ранцы в воздухе сносит сильнее
          if (e.grounded) e.pos = add(e.pos, mul(F, (e.cls === 'tank' ? 0.6 : 2.6) * dt));   // на земле — сносит шагом (трение гасит скорость)
          else e.vel = add(e.vel, mul(F, 7.5 * k * dt));
          this.stats.pushed++;
        }
        for (const p of S.proj){ if (p.type === 'b' || !p.pos || dist2(p.pos, a.pos) > (a.L + 4) ** 2 || !this.inside(a, p.pos, 1)) continue; p.vel = add(p.vel, mul(F, 16 * dt)); this.stats.projPushed++; }
        break;
      }
      case 'mosaic':
        for (const e of occ){ if (e.cls === 'inf' && e !== S.me && random() < dt * 2){ if (e.target){ e.target = null; this.stats.lost++; } } }
        break;
      case 'mute':
        break;
    }
  },
  fire(a, k){
    A78.stats.pulses++;
    if (a.k === 'geyser'){
      this.sfx('blast', a);
      for (const e of A78.within(a, a.r * k + 1.2)){ if (!this.inside(a, e.pos, 1.2 * k)) continue; this.freeze(e); A78.hit(e, 6, 'x', a); e.vel = add(e.vel, mul(a.dir, e.cls === 'tank' ? 1 : 4)); e.grounded = false; }
      for (let i = 0; i < (this.lite() ? 3 : 6); i++) fxSmoke(add(a.pos, mul(a.dir, 0.5 + i * 1.4)), 1.4 + i * 0.25, 0.85, 1.1);
      addWave(add(a.pos, mul(a.dir, 1.5)), 1.4 * k, 0.5); addLight(add(a.pos, mul(a.dir, 2)), [2, 3, 4.5], 12, 0.4, 0.004);
    }
  },
  freeze(e){ if (!e.alive || e.cls === 'bld' || e.cls === 'hq') return; e.frz86 = S.time + 8; this.stats.frozen++; if (e === ctrlEntity() && !S.attract) feed(tr('❄ Заморожен хладагентом: −60 % скорости, взрывы бьют сильнее (8 с)', '❄ Frozen by coolant: −60% speed, explosions hurt more (8 s)', '❄ Bị đóng băng: −60% tốc độ (8 giây)'), '#bfe6ff'); },
  lift(e, a){
    if (e.a86 || (e.a86cd || 0) > S.time || e.cls === 'bld' || e.tun82 || e.parked) return;
    e.a86 = { a: a.id, t: 0, ph: 'up', sw: random() * 6.283 }; this.stats.lifts++;
    e.grounded = false;
    this.sfx('lift', a);
    if (e === ctrlEntity() && !S.attract) feed(tr('⤒ Вывих! Тебя тянет в небо-портал…', '⤒ Dislocation! The sky portal is pulling you up…', '⤒ Trật khớp! Bị hút lên cổng trời…'), A78.K.disloc.css);
    else if (e.team === 0 && e.squad && e.squad === playerGroup() && typeof SQUADUI !== 'undefined') SQUADUI.say('a78_hurt', e, null, 12);
  },
  // перелёт: 3 с вверх (пыль, вращение) → вспышка → выход в антиподе с высоты 7 м
  stepLift(dt){
    for (const L of [S.units, S.vehicles]) for (const e of L){
      const s = e.a86; if (!s) continue;
      if (!e.alive){ e.a86 = null; continue; }
      s.t += dt;
      const a = A78.L[s.a];
      if (s.ph === 'up' && s.t >= 3 && a){
        const up = a.ex, P = add(a.exPos, mul(up, 7));
        addLight(add(e.pos, mul(norm(e.pos), 2)), [2.5, 3, 6], 14, 0.4, 0.006);
        e.pos = P; e.vel = mul(up, -2); e.grounded = false; e.teleports = (e.teleports || 0) + 1; e.justTeleported = true; e.keepLook = true;
        if (e.up) e.up = up;
        s.ph = 'down'; s.t = 0; e.dis86 = S.time + 2; a.exT = S.time; this.stats.exits++;
        addLight(P, [2.5, 3, 6], 16, 0.6, 0.008); addWave(P, 2, 0.6);
        if (e === ctrlEntity() && !S.attract){ S.flashT = max(S.flashT || 0, 0.25); S.shake = max(S.shake || 0, 0.5); feed(tr('⤓ Выход в антиподе — дезориентация 2 с', '⤓ Exit at the antipode — disoriented for 2 s', '⤓ Thoát ở điểm đối cực — choáng 2 giây'), A78.K.disloc.css); }
        if (S.cam && dist(P, S.cam.pos) < 200) this.sfx('exit', { pos: a.exPos, dir: up });
      } else if (s.ph === 'down' && (e.grounded || s.t > 4)){ e.a86 = null; e.a86cd = S.time + 6; }
      else if (s.ph === 'up' && !a){ e.a86 = null; }
    }
  },
  physPre(e, inp){
    const s = e.a86;
    if (s && s.ph === 'up'){
      const up = norm(e.pos), t1 = anyTangent(up), t2 = cross(up, t1), w = s.sw + s.t * 3;
      e.vel = add(mul(up, (e.cls === 'tank' ? 1.5 : 2) + 6 * s.t), mul(add(mul(t1, cos(w)), mul(t2, sin(w))), 1.2));
      e.grounded = false;
      return { wish: [0, 0, 0], speedMul: 0, jump: false, thrust: false, thrustDir: up, lift: false, fire: false, aim: inp.aim, rocket: false };
    }
    if (s && s.ph === 'down'){ const up = norm(e.pos), vr = dot(e.vel, up); if (vr < -4) e.vel = add(e.vel, mul(up, -4 - vr)); }
    let m = 1;
    if (e.frz86 > S.time) m *= 0.4;
    if (e.cls === 'inf' || e.cls === 'tank'){
      const z = this.zoneOf(e.pos, 'mosaic');
      if (z) m *= floor(S.time * 3 + z.ph) % 2 ? 1.5 : 0.08;   // тактовое движение: шаг — стоп — шаг
    }
    if (m !== 1 && inp && inp.speedMul !== undefined) return Object.assign({}, inp, { speedMul: inp.speedMul * m });
    return null;
  },
  // ------------------------------------------------------------------ разрядка (взрыв / болт)
  discharge(a, by){
    if (!a || A78.dorm(a)) return false;
    const sleep = { disloc: 25, mosaic: 25, geyser: 25, draft: 25, mute: 30 }[a.k];
    if (a.k === 'geyser') this.fire(a, 1.3);
    else if (a.k === 'disloc'){ for (const e of A78.within(a, a.r * 1.3)) if (this.inside(a, e.pos, a.r * 0.3)) this.lift(e, a); addWave(add(a.pos, mul(a.dir, 2)), 3, 0.6); this.sfx('lift', a); }
    else if (a.k === 'draft'){ a.gust = S.time + 1.2; this.sfx('gust', a); }
    else if (a.k === 'mosaic' || a.k === 'mute'){ for (const e of A78.within(a, a.r + 2)) if (this.inside(a, e.pos, 1)) e.suppT = max(e.suppT || 0, 1.2); addWave(add(a.pos, mul(a.dir, 1.5)), 2.5, 0.5); this.sfx('glitch', a); }
    a.dormT = S.time + sleep + (a.k === 'draft' ? 1.2 : 0); a.st = 'dorm';
    A78.stats.discharged++; this.stats.dis++;
    const mine = by && typeof isPlayerSrc === 'function' && isPlayerSrc(by);
    if (mine && !S.attract){
      if (typeof PROG !== 'undefined') PROG.award(15, tr('аномалия разряжена', 'anomaly discharged', 'xả dị thường'), 1, A78.K[a.k].css);
      if (typeof addCmd === 'function') addCmd(0, 0.5);
      feed(`✓ ${A78.name(a)}: ${tr('разряжена, спит', 'discharged, dormant for', 'đã xả, ngủ')} ${sleep} ${tr('с', 's', 'giây')} · +0.5 ${tr('КО', 'CP', 'ĐCH')}`, A78.K[a.k].css);
    }
    A78.dropArt(a);
    return true;
  },
  // ------------------------------------------------------------------ звук
  sfx(kind, a){
    if (typeof AU === 'undefined' || !AU.ready() || S.attract && !(typeof OPER !== 'undefined' && OPER.on)) return;
    const p = add(a.pos, mul(a.dir, 1)); if (!AU.allow(p, 160)) return;
    const t = AU.ctx.currentTime, o = AU.out(p, 0.3);
    if (kind === 'hiss') AU.nz(o, t, 2.0, 'highpass', 3500, 6000, 0.5, 0.35, 0.3);
    else if (kind === 'blast'){ AU.nz(o, t, 1.4, 'bandpass', 900, 2500, 0.6, 0.6, 0.02); AU.osc(o, t, 0.5, 'sine', 90, 40, 0.3); }
    else if (kind === 'lift'){ AU.osc(o, t, 2.8, 'sine', 120, 900, 0.18, 0.4); AU.osc(o, t, 2.8, 'triangle', 241, 1800, 0.05, 0.6); }
    else if (kind === 'exit'){ AU.osc(o, t, 0.6, 'sine', 900, 140, 0.25); AU.nz(o, t, 0.4, 'lowpass', 2000, 300, 0.6, 0.4); }
    else if (kind === 'gust') AU.nz(o, t, 1.5, 'lowpass', 400, 2400, 0.7, 0.6, 0.2);
    else if (kind === 'glitch'){ for (let i = 0; i < 4; i++) AU.osc(o, t + i * 0.07, 0.06, 'square', 300 + 500 * random(), 200, 0.12); }
  },
  // ------------------------------------------------------------------ отрисовка: частицы, свет, меши
  near(){
    const cam = S.cam && S.cam.pos; if (!cam) return [];
    const rts = S.mode !== 'fps' && !S.attract, n = this.lite() ? 3 : 6;
    return A78.L.filter(a => a.w2 && (!rts || a.known0) && dist2(a.pos, cam) < (rts ? 1e9 : 32400)).sort((p, q) => dist2(p.pos, cam) - dist2(q.pos, cam)).slice(0, n);
  },
  parts(n){
    if (!A78.active() || !S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    const T = S.rtime, lite = this.lite();
    for (const a of this.near()){
      const dorm = A78.dorm(a);
      if (a.k === 'disloc'){
        if (!dorm) for (let i = 0, m = lite ? 3 : 7; i < m; i++){   // пыль «падает вверх»
          const ph = (T * 0.45 + i / m) % 1, ang = a.ph + i * 2.4, R = a.r * (0.2 + 0.75 * ((i * 0.37) % 1)), h = ph * 9;
          push(A78.ring(a, R, h, ang + T * 0.4), 0.045, A78.ring(a, R, h - 0.35, ang + T * 0.4), 12.05);
        }
        // выход в антиподе — столб света (видят обе команды)
        const k = S.time - a.exT < 3 ? 2 : 1;
        if (dist2(a.exPos, S.cam.pos) < 40000) for (let i = 0; i < (lite ? 2 : 4); i++){ const ang = T * 1.2 + i * 1.571, h = ((T * 0.6 + i * 0.25) % 1) * 8 * k; push(add(add(a.exPos, mul(a.ex, h)), mul(anyTangent(a.ex), 0)), 0.05 * k, add(a.exPos, mul(a.ex, h + 0.6)), 4); }
      } else if (a.k === 'mute'){
        if (!dorm) for (let i = 0, m = lite ? 3 : 7; i < m; i++){   // серая статика: мерцающие крупинки
          const fl = floor(T * 12 + i * 3.7), h1 = (fl * 0.618 + i * 0.13) % 1, h2 = (fl * 0.414 + i * 0.71) % 1;
          const p = A78.ring(a, a.r * Math.sqrt(h1), 0.3 + 2.5 * h2, h2 * 40);
          push(p, 0.06, add(p, mul(a.t1, 0.12)), 12.0);
        }
      } else if (a.k === 'draft'){
        const s = this.sign(a);
        if (!dorm) for (let i = 0, m = lite ? 3 : 8; i < m; i++){   // марево: летящая пыль/листья вдоль полосы
          const ph = ((T * (a.gust > S.time ? 0.9 : 0.4) + i / m) % 1), x = (ph * 2 - 1) * a.L * s, y = ((i * 0.618) % 1 - 0.5) * a.W * 1.8, h = 0.4 + 2.5 * ((i * 0.37) % 1);
          const p = add(add(add(a.pos, mul(a.ax, x)), mul(a.t2, y)), mul(a.dir, h));
          push(p, 0.035, sub(p, mul(a.ax, s * 0.7)), (typeof BIO86 !== 'undefined' && i % 2) ? 12.32 : 12.05);
        }
      } else if (a.k === 'geyser'){
        if (!dorm){
          const act = a.st === 'hiss' || a.st === 'burst';
          for (let i = 0, m = act ? (lite ? 4 : 9) : (lite ? 1 : 3); i < m; i++){
            const ph = (T * (act ? 1.6 : 0.3) + i / m) % 1, ang = a.ph + i * 2.1, R = act ? 0.4 + ph * 1.2 : a.r * 0.8, h = act ? ph * (a.st === 'burst' ? 9 : 1.5) : 0.15;
            push(A78.ring(a, R, h, ang + T), 0.05, A78.ring(a, R, h + 0.3, ang + T), 4);
          }
        }
      }
    }
    // замороженные юниты — иней вокруг (только рядом с камерой)
    for (const L of [S.units, S.vehicles]) for (const e of L){ if (!(e.frz86 > S.time) || !e.alive || dist2(e.pos, S.cam.pos) > 1600) continue; const p = add(e.pos, mul(randUnit(), e.cls === 'tank' ? 2 : 0.6)); push(p, 0.03, add(p, mul(norm(p), 0.05)), 4); }
    return n;
  },
  lights(n){
    if (!A78.active() || !S.cam) return n;
    const max_ = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxL : 16;
    let left = this.lite() ? 1 : 2;
    const put = (p, col, rad, glow) => { if (left <= 0 || n >= max_) return; LP.set([p[0], p[1], p[2], rad], n * 4); LC.set([col[0], col[1], col[2], glow], n * 4); n++; left--; };
    for (const a of this.near()){
      if (A78.dorm(a) || dist2(a.pos, S.cam.pos) > 4900) continue;
      if (a.k === 'disloc') put(add(a.pos, mul(a.dir, 3)), [0.8, 1.0, 2.6], 9, 0.002);
      else if (a.k === 'geyser' && a.st !== 'idle') put(add(a.pos, mul(a.dir, 2)), [1.4, 2.0, 2.8], 10, 0.002);
      else if (a.k === 'mosaic') put(add(a.pos, mul(a.dir, 1.5)), [2.2 * (floor(S.rtime * 3) % 2), 1.2, 2.2 * (1 - floor(S.rtime * 3) % 2)], 8, 0.001);
    }
    return n;
  },
  collect(items){
    if (!A78.active() || !S.cam) return;
    const tick = floor(S.rtime * 3) % 3, T = S.rtime;
    for (const a of this.near()){
      const dorm = A78.dorm(a), Fr = { pos: a.pos, X: a.t1, Y: a.dir, Z: a.t2 };
      if (a.k === 'mosaic') items.push(Object.assign({ m: dorm ? 'a86mos0' : 'a86mos' + (tick + 1), s: 1, team: 0, sh: 1, flash: 0, glow: dorm ? 0.2 : 1 }, Fr));
      else if (a.k === 'geyser') items.push(Object.assign({ m: 'a86gey', s: 1, team: 0, sh: 1, flash: 0, glow: a.st === 'hiss' || a.st === 'burst' ? 1.6 : 0.6 }, Fr));
      else if (a.k === 'mute') items.push(Object.assign({ m: 'a86mute', s: 1, team: 0, sh: 1, flash: 0, glow: dorm ? 0.1 : 0.5 + 0.5 * (floor(T * 9) % 2) }, Fr));
      else if (a.k === 'disloc' && !dorm){   // камни висят и медленно «падают вверх»
        for (let i = 0; i < 4; i++){ const ph = (T * 0.12 + i * 0.25) % 1, ang = a.ph + i * 1.7 + T * 0.2;
          items.push({ m: 'a86rock', pos: A78.ring(a, a.r * (0.3 + 0.15 * i), 0.3 + ph * 6, ang), X: a.t1, Y: a.dir, Z: a.t2, s: (0.6 + 0.2 * i) * (1 - ph * 0.6), team: 0, sh: 1, flash: 0, glow: 1 }); }
        items.push({ m: 'a86ring', pos: a.exPos, X: anyTangent(a.ex), Y: a.ex, Z: cross(a.ex, anyTangent(a.ex)), s: 1, team: 0, sh: 1, flash: 0, glow: S.time - a.exT < 3 ? 1.8 : 0.8 });
      }
    }
  },
  // ------------------------------------------------------------------ экран игрока
  overlay(){
    const c = ctrlEntity(); if (!c || !c.pos || !A78.active()) return;
    const W = innerWidth, H = innerHeight;
    // выход Вывиха: подпись для обеих команд, если близко
    octx.save(); octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", sans-serif';
    for (const a of A78.L){ if (a.k !== 'disloc') continue; const d = dist(a.exPos, c.pos); if (d > 60) continue; const s = project(add(a.exPos, mul(a.ex, 3))); if (!s || hypot(s[0] - W / 2, s[1] - H / 2) < 90) continue;
      octx.globalAlpha = 0.85; octx.fillStyle = A78.K.disloc.css; octx.fillText(`⤓ ${tr('ВЫХОД ВЫВИХА', 'DISLOCATION EXIT', 'LỐI RA')} · ${Math.round(d)} ${tr('м', 'm', 'm')}`, s[0], s[1]); }
    octx.restore();
    const mos = this.zoneOf(c.pos, 'mosaic'), mute = this.zoneOf(c.pos, 'mute'), frz = c.frz86 > S.time, dis = c.dis86 > S.time;
    if (mos) this.pixelate();
    if (mute){   // серая статика по краям, центр свободен
      octx.save();
      if (!this.noise){ const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d'), im = x.createImageData(96, 96); for (let i = 0; i < im.data.length; i += 4){ const v = random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); this.noise = cv; }
      const ox = floor(random() * 96), oy = floor(random() * 96);
      octx.globalAlpha = 0.13; octx.fillStyle = octx.createPattern(this.noise, 'repeat'); octx.translate(-ox, -oy); octx.fillRect(0, 0, W + 96, H + 96); octx.translate(ox, oy);
      octx.globalAlpha = 0.8; octx.fillStyle = '#c8c8c8'; octx.font = '700 13px "Exo 2", sans-serif'; octx.textAlign = 'center';
      octx.fillText(tr('📻 ГЛУШИТЕЛЬ — нет связи и поддержки', '📻 MUFFLER — no radio, no support', '📻 MẤT SÓNG — không liên lạc'), W / 2, H * 0.24);
      octx.restore();
    }
    if (frz){ const g = octx.createRadialGradient(W / 2, H / 2, min(W, H) * 0.3, W / 2, H / 2, max(W, H) * 0.7); g.addColorStop(0, 'rgba(180,225,255,0)'); g.addColorStop(1, 'rgba(180,225,255,0.32)'); octx.fillStyle = g; octx.fillRect(0, 0, W, H); }
    if (dis){ octx.fillStyle = `rgba(120,140,255,${(0.1 + 0.08 * Math.sin(S.rtime * 13)).toFixed(3)})`; octx.fillRect(0, 0, W, H); }
  },
  // Мозаика изнутри: картинка крупными пикселями (уменьшить копию кадра → растянуть без сглаживания)
  pixelate(){
    const src = typeof gl !== 'undefined' && gl.canvas; if (!src || !src.width) return;
    if (!this.pc){ this.pc = document.createElement('canvas'); }
    const W = innerWidth, H = innerHeight, k = floor(S.rtime * 3) % 2 ? 9 : 12, w = max(8, floor(W / k / 4)), h = max(6, floor(H / k / 4));
    if (this.pc.width !== w || this.pc.height !== h){ this.pc.width = w; this.pc.height = h; }
    try {
      const x = this.pc.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, w, h);
      octx.save(); octx.imageSmoothingEnabled = false; octx.globalAlpha = 0.85; octx.drawImage(this.pc, 0, 0, W, H); octx.restore();
    } catch (e){}
  },
  distort(r){
    let nw = r[0]; const nt = r[1];
    const c = ctrlEntity();
    if (!c || !SET.distort || (typeof LITE73 !== 'undefined' && LITE73.on) || nw >= 8) return r;
    if (c.dis86 > S.time){ WAVE.set([0.5, 0.5, 0.5, 0.5 + 0.3 * Math.sin(S.rtime * 7)], nw * 4); nw++; }
    else if (c.a86 && c.a86.ph === 'up'){ WAVE.set([0.5, 0.5, 0.3 + c.a86.t * 0.1, 0.9], nw * 4); nw++; }
    return [nw, nt];
  },
};
// ------------------------------------------------------------------ каталог (тот же A78.K: имена, цвета, значки, радиус)
Object.assign(A78.K, {
  disloc: { n: ['Вывих', 'Dislocation', 'Trật Khớp'], r: 4.5, css: '#8fa8ff', icon: '⤒' },
  mosaic: { n: ['Мозаика', 'Mosaic', 'Khảm Điểm'], r: 7.2, css: '#ff7ad9', icon: '▦' },
  geyser: { n: ['Гейзер хладагента', 'Coolant geyser', 'Mạch Phun Lạnh'], r: 3.5, css: '#bfe6ff', icon: '❄' },
  draft:  { n: ['Сквозняк', 'Draught', 'Gió Lùa'], r: 9, css: '#e8d9a8', icon: '≋' },
  mute:   { n: ['Глушитель', 'Muffler', 'Vùng Câm'], r: 8, css: '#b8b8b8', icon: '▒' },
});
Object.assign(CHAT, {
  a78_disloc: [['Аномалия! Пыль падает вверх — Вывих, утащит в небо!', 'Anomaly! Dust falling upwards — a Dislocation, it will pull you into the sky!', 'Dị thường! Bụi rơi ngược — Trật Khớp!'], ['Вывих впереди — кто влезет, вылетит на другой стороне метеорита!', 'Dislocation ahead — step in and you come out on the other side of the meteor!', 'Trật Khớp phía trước — ra ở phía bên kia!']],
  a78_mosaic: [['Аномалия — картинка рассыпается на пиксели! Мозаика, прицел не держит!', 'Anomaly — the picture breaks into pixels! A Mosaic, aim goes wild!', 'Dị thường — Khảm Điểm, ngắm không chuẩn!'], ['Квадрат с пикселями — обходим, там всё дёргается.', 'Pixel square — go around, everything jerks in there.', 'Ô vuông điểm ảnh — đi vòng!']],
  a78_geyser: [['Иней на земле — Гейзер хладагента! Заморозит!', 'Frost on the ground — a coolant geyser! It will freeze you!', 'Sương giá — Mạch Phun Lạnh!'], ['Слышишь шипение? Гейзер, отходим!', 'Hear the hiss? Geyser, back off!', 'Nghe tiếng xì? Lùi lại!']],
  a78_draft: [['Марево полосой — Сквозняк, сносит и ракеты!', 'A strip of haze — a Draught, it blows even rockets away!', 'Gió Lùa — thổi lệch cả tên lửa!'], ['Сквозняк впереди, держись крепче!', 'Draught ahead, hold on!', 'Gió Lùa phía trước!']],
  a78_mute: [['Серая статика — Глушитель! Там пропадёт связь!', 'Grey static — a Muffler! We lose the radio in there!', 'Nhiễu xám — Vùng Câm! Mất liên lạc!'], ['Глушитель впереди: ни радио, ни поддержки.', 'Muffler ahead: no radio, no support.', 'Vùng Câm phía trước: không hỗ trợ.']],
});
// ------------------------------------------------------------------ меши (ST70): Мозаика (3 такта + спящая), гейзер, глушитель, камни Вывиха, кольцо выхода
if (typeof ST70_DEF !== 'undefined'){
  const NESC = ['F83800', 'FCA044', '00B800', '58D854', '0078F8', '3CBCFC', 'D800CC', 'F878F8', 'F8B800', 'E45C10', '6844FC', 'B8F818'].map(h => { const n = parseInt(h, 16); return [(n >> 16 & 255) / 255 * 0.8, (n >> 8 & 255) / 255 * 0.8, (n & 255) / 255 * 0.8]; });
  const mos = (seed) => () => {
    const g = G69(), rnd = seeded(seed), C = 1.25;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++){
      if (seed && rnd() < 0.18) continue;
      const h = seed ? 0.05 + rnd() * rnd() * 1.6 : 0.04, col = seed ? NESC[floor(rnd() * NESC.length)] : [0.2, 0.2, 0.22];
      g69box(g, [(i - 3.5) * C, h * 0.5, (j - 3.5) * C], [C * 0.5, h * 0.5, C * 0.5], 0, col, seed && rnd() < 0.25 ? 5 : 1);
    }
    for (const s of [-1, 1]){ g69box(g, [s * 5.05, 0.06, 0], [0.06, 0.06, 5.1], 0, [1.2, 0.4, 1.0], 5); g69box(g, [0, 0.06, s * 5.05], [5.1, 0.06, 0.06], 0, [1.2, 0.4, 1.0], 5); }
    return g;
  };
  Object.assign(ST70_DEF, {
    a86mos0: mos(0), a86mos1: mos(861), a86mos2: mos(862), a86mos3: mos(863),
    a86gey(){   // жерло: ледяной конус с трещинами + кольцо инея
      const g = G69(), rnd = seeded(8687);
      st70lathe(g, 0, 0, 0, [[-0.05, 1.5], [0.1, 1.3], [0.4, 0.7], [0.5, 0.35]], 12, [0.55, 0.62, 0.7], 1);
      g69tube(g, [0, 0.0, 0], [0, 0.52, 0], 0.32, 0.32, 10, [0.6, 1.2, 1.6], 5);
      for (let i = 0; i < 14; i++){ const a = rnd() * 6.283, r = 1.6 + rnd() * 1.8; g69with(g, M34.ch(M34.T(Math.cos(a) * r, 0, Math.sin(a) * r), M34.RY(rnd() * 3), M34.RX(rnd() * 0.5)), () => g69box(g, [0, 0.08, 0], [0.08 + rnd() * 0.1, 0.08 + rnd() * 0.2, 0.04], 0.02, [0.8, 0.88, 0.95], 2)); }
      return g;
    },
    a86mute(){   // сломанная мачта с серыми излучателями (статика)
      const g = G69();
      g69tube(g, [0, 0, 0], [0.3, 4.2, 0.1], 0.12, 0.07, 6, [0.25, 0.25, 0.27], 2);
      g69tube(g, [0.3, 4.2, 0.1], [1.4, 4.9, 0.4], 0.06, 0.04, 5, [0.25, 0.25, 0.27], 2);
      for (const [y, s] of [[1.6, 0.35], [2.8, 0.28], [3.9, 0.22]]) g69box(g, [0.15 + y * 0.05, y, 0.05], [s, 0.05, s], 0.03, [0.7, 0.7, 0.72], 5);
      g69box(g, [0, 0.15, 0], [0.6, 0.15, 0.6], 0.08, [0.18, 0.18, 0.19], 1);
      return g;
    },
    a86rock(){ const g = G69(); g69box(g, [0, 0, 0], [0.35, 0.25, 0.3], 0.15, [0.2, 0.18, 0.17], 1); g69box(g, [0.1, 0.18, 0], [0.12, 0.05, 0.1], 0.03, [0.6, 0.75, 1.6], 5); return g; },
    a86ring(){ const g = G69(); g69with(g, M34.ch(M34.T(0, 0.15, 0), M34.RX(PI / 2)), () => { g69torus(g, [0, 0, 0], 2.6, 0.08, 24, 5, [0.7, 0.9, 2.2], 5); g69torus(g, [0, 0, 0], 1.6, 0.05, 18, 4, [0.7, 0.9, 2.2], 5); }); return g; },
  });
}
// ------------------------------------------------------------------ хуки
if (AN86.on){
  { const sp0 = A78.spawn; A78.spawn = function(seed){ const r = sp0.apply(this, arguments); AN86.safe(() => AN86.spawn(this.seed), 'spawn'); return r; }; }
  { const so0 = A78.stepOne; A78.stepOne = function(a, dt){ if (a && AN86.W2[a.k]) return AN86.safe(() => AN86.stepOne(a, dt), 'one'); return so0.apply(this, arguments); }; }
  { const ds0 = A78.discharge; A78.discharge = function(a, by){ if (a && AN86.W2[a.k]) return AN86.safe(() => AN86.discharge(a, by), 'dis'); return ds0.apply(this, arguments); }; }
  { const fi0 = A78.fire; A78.fire = function(a){ if (a && AN86.W2[a.k]) return AN86.safe(() => AN86.fire(a, 1), 'fire'); return fi0.apply(this, arguments); }; }
  { const st0 = A78.step; A78.step = function(){ const r = st0.apply(this, arguments); AN86.safe(() => { const dt = clamp(S.time - (AN86.lt === undefined || AN86.lt === null ? S.time : AN86.lt), 0, 0.1); AN86.lt = S.time; if (dt > 0) AN86.stepLift(dt); }, 'lift'); return r; }; }
  { const pa0 = A78.parts; A78.parts = function(n){ n = pa0.apply(this, arguments); const m = AN86.safe(() => AN86.parts(n), 'par'); return m === undefined ? n : m; }; }
  { const li0 = A78.lights; A78.lights = function(n){ n = li0.apply(this, arguments); const m = AN86.safe(() => AN86.lights(n), 'lit'); return m === undefined ? n : m; }; }
  { const di0 = A78.distort; A78.distort = function(r){ r = di0.apply(this, arguments); return AN86.safe(() => AN86.distort(r)) || r; }; }
  { const ov0 = A78.overlay; A78.overlay = function(){ ov0.apply(this, arguments); AN86.safe(() => AN86.overlay(), 'ov'); }; }
  // волна 1 рисует частицы только для своих видов — для волны 2 в A78.parts нет веток (просто пропуск)
  { const ps0 = physStep; physStep = function(e, inp, dt, free){ if (!free && e && (e.a86 || e.frz86 > S.time || AN86.zoneOf(e.pos, 'mosaic'))){ const o = AN86.safe(() => AN86.physPre(e, inp || {}), 'phys'); if (o) arguments[1] = o; } return ps0.apply(this, arguments); }; }
  // дезориентация после выхода из Вывиха; Мозаика: ИИ теряет цель
  { const bi0 = botInput; botInput = function(u, dt){ const inp = bi0.apply(this, arguments); if (inp && u.dis86 > S.time){ const Up = norm(u.pos), t = anyTangent(Up); inp.wish = tangent(add(mul(t, Math.sin(S.time * 3 + u.id)), mul(cross(Up, t), Math.cos(S.time * 2.3 + u.id))), Up); inp.fire = false; inp.rocket = false; } return inp; }; }
  { const pi0 = playerInput; playerInput = function(p){ const r = pi0.apply(this, arguments); const c = ctrlEntity(); if (r && c && c.dis86 > S.time && r.wish && len(r.wish) > 0.01){ const Up = norm(c.pos), sd = norm(cross(Up, r.wish)), k = 0.8 * Math.sin(S.rtime * 5); r.wish = norm(add(r.wish, mul(sd, k))); S.shake = max(S.shake || 0, 0.15); } return r; }; }
  // разброс +50 % внутри Мозаики
  { const gs0 = gunShoot; gunShoot = function(src, eye, dir, W, o){ if (src && src.pos && AN86.zoneOf(src.pos, 'mosaic')){ dir = norm(add(dir, mul(randUnit(), 0.5 * ((W && W.spread) || 0.02) + 0.01))); AN86.stats.spread++; } return gs0.call(this, src, eye, dir, W, o); }; }
  // ИИ в Мозаике теряет цели (60 %), а цель внутри Мозаики не видна дальше 12 м
  { const ft0 = findTarget; findTarget = function(src, team, eye, opts){
      if (!A78.L.length || !A78.active()) return ft0.apply(this, arguments);
      if (src && src.pos && src !== S.me && AN86.zoneOf(src.pos, 'mosaic') && random() < 0.6){ AN86.stats.lost++; return null; }
      const r = ft0.apply(this, arguments);
      if (r && r.pos && r.cls !== 'bld' && r.cls !== 'hq' && eye && dist2(r.pos, eye) > 144 && AN86.zoneOf(r.pos, 'mosaic')){ AN86.stats.lost++; return null; }
      return r;
    }; }
  // Глушитель: обзор роботов внутри ×0.4
  { const vr0 = visRadius; visRadius = function(e){ const r = vr0.apply(this, arguments); return e && e.cls !== 'bld' && e.cls !== 'hq' && e.pos && AN86.zoneOf(e.pos, 'mute') ? r * 0.4 : r; }; }
  // заморозка: +40 % урона от взрывов
  { const dm0 = damage; damage = function(e, dmg, src, pt){ if (e && e.frz86 > S.time && (pt === 'r' || pt === 'g' || pt === 'a' || pt === 'x' || pt === 's')) arguments[1] = dmg * 1.4; return dm0.apply(this, arguments); }; }
  // Глушитель: внутри нет радио (реплики отряда и штаба)
  { const em0 = emit; emit = function(type, data){ if (type === 'radio' && !S.attract){ const c = ctrlEntity(); if (c && c.pos && S.mode === 'fps' && AN86.zoneOf(c.pos, 'mute')){ AN86.stats.muted++; return; } } return em0.apply(this, arguments); }; }
  if (typeof SQUADUI !== 'undefined' && SQUADUI.say){ const sy0 = SQUADUI.say; SQUADUI.say = function(){ const c = ctrlEntity(); if (!S.attract && c && c.pos && S.mode === 'fps' && AN86.zoneOf(c.pos, 'mute')){ AN86.stats.muted++; return true; } return sy0.apply(this, arguments); }; }
  // …и нет поддержки: удар/вызов в зону Глушителя или самому игроку изнутри — отказ
  { const up0 = usePower; usePower = function(team, k, pt, by){
      const c = ctrlEntity();
      if ((pt && AN86.zoneOf(pt, 'mute')) || (team === 0 && !S.attract && S.mode === 'fps' && c && c.pos && AN86.zoneOf(c.pos, 'mute'))){ AN86.stats.blocked++; return tr('Глушитель: нет связи', 'Muffler: no signal', 'Vùng Câm: mất sóng'); }
      return up0.apply(this, arguments);
    }; }
  // выстрелы внутри Глушителя — тихие
  if (typeof AU !== 'undefined' && AU.shot){ const sh0 = AU.shot; AU.shot = function(pos){ if (pos && AN86.zoneOf(pos, 'mute')){ if (random() < 0.7) return; } return sh0.apply(this, arguments); }; }
  if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect; ST70.collect = function(){ c0.apply(this, arguments); AN86.safe(() => AN86.collect(this.items), 'collect'); }; }
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); AN86.lt = null; for (const L of [S.units, S.vehicles]) for (const e of L){ e.a86 = null; e.frz86 = 0; e.dis86 = 0; } return r; }; }
}
