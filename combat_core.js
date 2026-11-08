// =====================================================================
//  combat_core — ОДИН общий слой боя для Portal Meteor VR Arena (D:\AI\pm_vr) и основной игры (ниндзя v7.9+).
//  T141 «главное правило» (08.11.2026): VR и основная игра подключают один и тот же код; различия — ТОЛЬКО флагами
//  профиля режима (profile: 'vr_arena' | 'main'), не разной логикой.
//  Чистый JS: без three.js, без DOM, без глобалей игры. Векторы — [x,y,z] или {x,y,z} (THREE.Vector3 тоже годится).
//  Подключение:
//    основная игра — обычный <script> (build.py) → глобальный CombatCore;
//    VR (esbuild)  — import './combat_core.js'; const CombatCore = globalThis.CombatCore;
//    тесты         — node tests/combat_core.test.mjs (грузит файл в пустой vm-контекст: проверка «нет DOM/three»).
//  Канон: D:\AI\combat_core\combat_core.js → копии в оба репозитория скриптом sync.ps1 (тест сверяет VERSION и хеш).
//  Что внутри:
//    meter     — энергия и заряды спецударов «вариант C» (молния ← комбо без урона, замедление ← увороты,
//                стрелковое ← убийства, щит ← парирования; любое действие понемногу заряжает всё);
//    cooldowns — кулдауны по ключу; tokens — attackTokens (одновременно бьют 2–3, сзади ждут, пока ты занят спереди);
//    lineOfFire — стрелок не стреляет, если на линии свой; friendlyMult — френдли-фаер по профилю;
//    swing     — результат удара от скорости, угла, оружия и части тела (царапина / рана / разрез / парирование);
//    body      — манекен из ≥ 6 частей, отрубил руку — бьёт другой; aimPick — цель «куда смотришь» по лучу aimRay();
//    adrenaline — замедление при здоровье < 25 %, не чаще раза в 60 с и раза за волну; wave — кривая сложности;
//    debrisCap — лимит обломков расчленёнки «Авто/Выкл/Мало/Много».
// =====================================================================
(function (root, factory) {
  root.CombatCore = factory();   // только глобаль: так файл одинаково работает обычным <script>, внутри ESM-сборки esbuild и в vm-тесте
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '0.1.0';

  // ---------- общие числа (из VR 0.3: abilities.js COST/GAIN, enemies.js пороги разреза и парирования) ----------
  const BASE = {
    energyMax: 100, energyStart: 30, hurtEnergyLoss: 10,
    cost: { shur: 8, heat: 25, elec: 25, cross: 30, wave: 35, slam: 40, uzi: 45, turret: 40, walker: 60, rockets: 0 },
    gain: { cut: 7, gash: 2.5, kill: 10, dodge: 9, block: 11, parry: 11, interrupt: 8, shur: 2, comboClean: 3 },
    // вариант C: какое действие что заряжает (0..1 за событие, 1 = полный заряд); «любое действие понемногу заряжает всё» — trickle
    charge: {
      lightning: { comboClean: 0.2 }, slow: { dodge: 0.25 }, uzi: { kill: 0.2 }, shield: { parry: 0.34, block: 0.15 },
      trickle: 0.03,
    },
    comboWindow: 0.8,            // с между ударами, чтобы комбо продолжалось
    // удар: скорость клинка (м/с) → результат. cutV = базовый порог настоящего разреза (VR 0.3: s.cutV ~ 3.2–4)
    minSpeed: 0.5, cutV: 3.4, gashFrac: 0.55, parryMaxSpeed: 4.2, staggerSpeed: 1.4,
    angleBest: 1.0,              // cos между плоскостью лезвия и направлением взмаха: 1 = идеально режущий удар
    // части тела манекена: множитель порога разреза (меньше = легче отрубить) и урон «здоровью» за рану
    parts: {
      head:  { cutK: 0.9,  vital: true,  hpDmg: 2 },
      torso: { cutK: 1.6,  vital: true,  hpDmg: 1 },
      armL:  { cutK: 0.8,  vital: false, hpDmg: 0, arm: true },
      armR:  { cutK: 0.8,  vital: false, hpDmg: 0, arm: true },
      legL:  { cutK: 1.1,  vital: false, hpDmg: 0, leg: true },
      legR:  { cutK: 1.1,  vital: false, hpDmg: 0, leg: true },
    },
    bodyHp: 6,                   // «убить сложно»: 3 глубоких раны в голову или 6 в торс
    // оружие: свой хват и характер удара. cut — множитель порога разреза (меньше = режет легче), dmg — урон,
    // stab — бонус колющему удару (вдоль клинка), blunt — дробящий (ломает броню, не режет), reach — м, chain — цепь
    weapons: {
      katana:   { cut: 1.0,  dmg: 1.0, stab: 0.3, blunt: 0,   reach: 0.95, grip: 'one_hand_long', speedK: 1.0 },
      dagger:   { cut: 0.85, dmg: 0.6, stab: 1.0, blunt: 0,   reach: 0.35, grip: 'reverse_short', speedK: 1.35 },
      cleaver:  { cut: 1.25, dmg: 1.6, stab: 0,   blunt: 0.5, reach: 0.55, grip: 'hatchet',       speedK: 0.8 },
      staff:    { cut: 99,   dmg: 0.9, stab: 0.4, blunt: 1.0, reach: 1.6,  grip: 'two_hand',      speedK: 0.9 },
      nunchaku: { cut: 99,   dmg: 0.8, stab: 0,   blunt: 1.0, reach: 0.7,  grip: 'chain',         speedK: 1.5, chain: { links: 6, len: 0.32 } },
      flail:    { cut: 99,   dmg: 1.8, stab: 0,   blunt: 1.4, reach: 0.9,  grip: 'chain',         speedK: 0.7, chain: { links: 8, len: 0.6 } },
      curved:   { cut: 0.8,  dmg: 0.9, stab: 0.2, blunt: 0,   reach: 0.8,  grip: 'one_hand_long', speedK: 1.1, drawCut: 1.3 },
      wrist:    { cut: 0.9,  dmg: 0.8, stab: 0.8, blunt: 0,   reach: 0.5,  grip: 'wrist_mount',   speedK: 1.25 },
      uzi:      { cut: 99,   dmg: 0.35, stab: 0,  blunt: 0,   reach: 0,    grip: 'pistol',        speedK: 1.0, ranged: true },
    },
    switchTime: 0.25,            // с: переключение оружия (приёмка: < 0,3 с, без меню)
    // attackTokens
    tokensMax: 2, tokensPerWave: 1 / 3, tokensCap: 3, backWaitWhileFront: true, frontCos: 0.2, tokenHold: 2.5,
    // линия огня
    lofRadius: 0.45,
    // адреналин
    adrenaline: { hpBelow: 0.25, dur: 3.5, timeScale: 0.45, cooldown: 60, oncePerWave: true },
    // наведение «куда смотришь»
    aim: { maxAngleDeg: 12, maxDist: 60, angleWeight: 1.0, distWeight: 0.08 },
    // кривая сложности: значение на волне w = a + b*(w-1), с потолком cap. 1–3 волны — новичок, 10-я — с трудом
    curve: {
      speed:     { a: 1.0,  b: 0.04,  cap: 1.5 },
      count:     { a: 3,    b: 1.2,   cap: 16 },
      dodge:     { a: 0.0,  b: 0.035, cap: 0.35 },
      block:     { a: 0.0,  b: 0.04,  cap: 0.4 },
      armor:     { a: 0.0,  b: 0.05,  cap: 0.5 },
      elite:     { a: -0.1, b: 0.03,  cap: 0.25 },
      ranged:    { a: 0.0,  b: 0.05,  cap: 0.4 },
      dmg:       { a: 1.0,  b: 0.06,  cap: 1.8 },
    },
    debris: { off: 0, low: 8, auto: 16, high: 28 },
    rockets: { every: 12, count: 3, spreadDeg: 18, homing: 0.35 },   // ракетница из-за спины: раз в N с, 3 неточные самонаводящиеся
  };

  // ---------- профили режимов: ТОЛЬКО флаги/числа, логика одна ----------
  const PROFILES = {
    vr_arena: { friendlyFireDamage: true,  lineOfFireCheck: true, tokensMax: 2, debrisMode: 'auto', aimSource: 'headset', comfortFade: true },
    main:     { friendlyFireDamage: false, lineOfFireCheck: true, tokensMax: 2, debrisMode: 'auto', aimSource: 'camera',  comfortFade: false },
  };

  // ---------- мелочи ----------
  const V = (v) => Array.isArray(v) ? v : [v.x, v.y, v.z];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.sqrt(dot(a, a));
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  function merge(dst, src) {
    for (const k in src) {
      const s = src[k];
      if (s && typeof s === 'object' && !Array.isArray(s)) { dst[k] = merge(dst[k] && typeof dst[k] === 'object' ? dst[k] : {}, s); }
      else dst[k] = s;
    }
    return dst;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // расстояние от точки p до отрезка a→b и параметр t (0..1)
  function segPoint(a, b, p) {
    const ab = sub(b, a), ap = sub(p, a), L2 = dot(ab, ab) || 1e-9, t = clamp(dot(ap, ab) / L2, 0, 1);
    const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
    return { d: len(sub(p, q)), t };
  }

  function create(profile, overrides) {
    if (!PROFILES[profile]) throw new Error('combat_core: unknown profile ' + profile);
    const cfg = merge(merge(clone(BASE), PROFILES[profile]), overrides || {});
    cfg.profile = profile;

    // ===== meter: энергия + заряды (вариант C) =====
    const meter = {
      energy: cfg.energyStart, charges: { lightning: 0, slow: 0, uzi: 0, shield: 0 }, combo: 0, comboT: -99, comboHurt: false, used: {},
      reset(e) { this.energy = e == null ? cfg.energyStart : e; for (const k in this.charges) this.charges[k] = 0; this.combo = 0; this.comboT = -99; this.comboHurt = false; this.used = {}; },
      // событие боя: 'cut' | 'gash' | 'kill' | 'dodge' | 'block' | 'parry' | 'interrupt' | 'shur' | 'hit'(удар по врагу, для комбо)
      // возвращает список зарядов, которые только что стали полными (для вибрации/свечения кнопки/иконки жеста)
      gain(ev, now, mult) {
        const m = mult == null ? 1 : mult, ready = [];
        const before = this.energy;
        if (cfg.gain[ev]) this.energy = Math.min(cfg.energyMax, this.energy + cfg.gain[ev] * m);
        for (const k in cfg.cost) { const c = cfg.cost[k]; if (c > 0 && before < c && this.energy >= c) { ready.push('energy:' + k); break; } }
        if (ev === 'hit' || ev === 'cut' || ev === 'gash') {
          if (now - this.comboT > cfg.comboWindow) { this.combo = 0; this.comboHurt = false; }
          this.combo++; this.comboT = now;
          if (this.combo >= 3 && !this.comboHurt) { this._charge('comboClean', m, ready); this.combo = 0; }
        }
        this._charge(ev, m, ready);
        return ready;
      },
      _charge(ev, m, ready) {
        for (const k in this.charges) {
          const rule = cfg.charge[k] || {}, was = this.charges[k];
          const add = (rule[ev] || 0) * m + (ev !== 'comboClean' && cfg.gain[ev] ? cfg.charge.trickle * m : 0);
          if (!add) continue;
          this.charges[k] = Math.min(1, was + add);
          if (was < 1 && this.charges[k] >= 1 && ready.indexOf(k) < 0) ready.push(k);
        }
      },
      hurt() { this.combo = 0; this.comboHurt = true; this.energy = Math.max(0, this.energy - cfg.hurtEnergyLoss); },
      canPay(k) { return this.energy >= (cfg.cost[k] || 0); },
      pay(k, free) { const c = cfg.cost[k] || 0; if (!free && this.energy < c) return false; if (!free) this.energy -= c; this.used[k] = (this.used[k] || 0) + 1; return true; },
      ready(k) { return this.charges[k] >= 1; },
      spend(k) { if (this.charges[k] < 1) return false; this.charges[k] = 0; this.used[k] = (this.used[k] || 0) + 1; return true; },
    };

    // ===== cooldowns =====
    const cooldowns = {
      until: {},
      start(k, now, dur) { this.until[k] = now + dur; },
      ready(k, now) { return !(this.until[k] > now); },
      left(k, now) { return Math.max(0, (this.until[k] || 0) - now); },
      reset() { this.until = {}; },
    };

    // ===== attackTokens =====
    // request(attacker, target, now, {front}) → true, если можно начинать атаку. front — атакующий перед лицом цели.
    // Сзади не бьют, пока цель занята спереди (кто-то спереди держит токен); всего держат не больше max().
    const tokens = {
      held: new Map(),  // attackerId → { target, t, front }
      max(wave) { return Math.min(cfg.tokensCap, cfg.tokensMax + Math.floor(((wave || 1) - 1) * cfg.tokensPerWave)); },
      count(target) { let n = 0; for (const h of this.held.values()) if (h.target === target) n++; return n; },
      frontBusy(target) { for (const h of this.held.values()) if (h.target === target && h.front) return true; return false; },
      request(id, target, now, o) {
        const opt = o || {}; this.expire(now);
        if (this.held.has(id)) { this.held.get(id).t = now; return true; }
        const front = opt.front !== false;
        if (this.count(target) >= this.max(opt.wave)) return false;
        if (!front && cfg.backWaitWhileFront && this.frontBusy(target)) return false;
        this.held.set(id, { target, t: now, front }); return true;
      },
      release(id) { this.held.delete(id); },
      expire(now) { for (const [id, h] of this.held) if (now - h.t > cfg.tokenHold) this.held.delete(id); },
      reset() { this.held.clear(); },
    };
    // атакующий спереди? (pos цели, взгляд цели, pos атакующего)
    function isFront(targetPos, targetFwd, attackerPos) {
      const d = sub(V(attackerPos), V(targetPos)); d[1] = 0; const f = V(targetFwd).slice(); f[1] = 0;
      return dot(norm(d), norm(f)) > cfg.frontCos;
    }

    // ===== линия огня + френдли-фаер =====
    // shooter/target — точки; allies — [{pos, r?, id}] своих стрелка. Возвращает { clear, blocker }.
    function lineOfFire(shooter, target, allies, radius) {
      if (!cfg.lineOfFireCheck) return { clear: true, blocker: null };
      const a = V(shooter), b = V(target), R = radius || cfg.lofRadius;
      for (const al of allies || []) {
        const p = V(al.pos || al), r = (al.r || 0) + R, s = segPoint(a, b, p);
        if (s.t > 0.02 && s.t < 0.98 && s.d < r) return { clear: false, blocker: al };
      }
      return { clear: true, blocker: null };
    }
    function friendlyMult(srcTeam, dstTeam) { return srcTeam !== dstTeam ? 1 : (cfg.friendlyFireDamage ? 1 : 0); }

    // ===== удар: скорость/угол/оружие/часть → результат =====
    // o: { speed (м/с), edgeCos (0..1: насколько взмах идёт режущей кромкой), stab (0..1: вдоль клинка), weapon, part,
    //      targetState ('idle'|'windup'|'strike'|'stagger'), targetWeapon (бьём по оружию врага?), armor (часть в броне), power, element }
    function swing(o) {
      const W = cfg.weapons[o.weapon || 'katana'] || cfg.weapons.katana, P = cfg.parts[o.part || 'torso'] || cfg.parts.torso;
      const sp = (o.speed || 0) * W.speedK, st = o.targetState || 'idle';
      const res = { kind: 'none', dmg: 0, hp: 0, stagger: 0, part: o.part || 'torso', speed: sp };
      if (o.speed < cfg.minSpeed && st !== 'strike') return res;
      // парирование: ЛЮБОЙ контакт оружием по оружию врага во время замаха/удара (не «точная поза»)
      if (o.targetWeapon && (st === 'strike' || st === 'windup') && o.speed < cfg.parryMaxSpeed) { res.kind = 'parry'; res.stagger = 0.9; return res; }
      const edge = clamp(o.edgeCos == null ? cfg.angleBest : o.edgeCos, 0, 1), stab = clamp(o.stab || 0, 0, 1);
      // броня: дробящее ломает, острое царапает (быстрый удар скалывает пластину)
      if (o.armor) {
        if (W.blunt > 0 && sp * W.blunt > 2.0) { res.kind = 'chip'; res.dmg = W.dmg; return res; }
        if (sp > 1.3) { res.kind = 'chip'; res.dmg = W.dmg * 0.3; return res; }
        res.kind = 'scratch'; return res;
      }
      const blunt = W.blunt > 0 && W.cut >= 99;
      let cutV = cfg.cutV * W.cut * P.cutK / (o.power || 1);
      cutV /= 0.35 + 0.65 * edge + stab * W.stab * 0.5;          // плоский удар режет хуже, укол — по колющим
      if (W.drawCut && edge > 0.8) cutV /= W.drawCut;
      if (st === 'stagger') cutV *= 0.85;
      if (o.element === 'heat') cutV *= 0.75; else if (o.element === 'elec') cutV *= 0.88;
      res.dmg = W.dmg * sp;
      if (!blunt && sp >= cutV) { res.kind = 'cut'; res.hp = P.vital ? cfg.bodyHp : 0; }
      else if (blunt && sp * W.blunt >= cfg.cutV * 0.9) { res.kind = 'smash'; res.hp = P.vital ? P.hpDmg * 2 : 0; res.stagger = 0.7; }
      else if (sp >= cutV * cfg.gashFrac) { res.kind = 'gash'; res.hp = P.hpDmg; }
      else res.kind = 'scratch';
      if (st === 'windup' && sp > cfg.staggerSpeed && res.kind !== 'scratch') res.stagger = Math.max(res.stagger, 0.45);
      return res;
    }

    // ===== манекен: ≥ 6 частей, отрубил руку — бьёт другой =====
    function body(o) {
      const b = { hp: (o && o.hp) || cfg.bodyHp, alive: true, parts: {}, weapon: (o && o.weapon) || 'katana' };
      for (const k in cfg.parts) b.parts[k] = { attached: true, wounds: 0 };
      return b;
    }
    // применить результат swing() к манекену: { severed, died, attackArm }
    function applyHit(b, res) {
      const out = { severed: null, died: false };
      if (!b.alive || res.kind === 'none' || res.kind === 'parry') return out;
      const p = b.parts[res.part]; if (!p || !p.attached) return out;
      if (res.kind === 'gash' || res.kind === 'smash') p.wounds++;
      if (res.kind === 'cut') { p.attached = false; out.severed = res.part; }
      b.hp -= res.hp;
      if (b.hp <= 0 || (!b.parts.head.attached) || (!b.parts.torso.attached)) { b.alive = false; out.died = true; }
      return out;
    }
    // какой рукой бьёт: правой, если есть; иначе левой; без рук — 'none' (может только толкаться)
    function attackArm(b) { return b.parts.armR.attached ? 'armR' : b.parts.armL.attached ? 'armL' : 'none'; }
    function mobility(b) { const n = (b.parts.legL.attached ? 1 : 0) + (b.parts.legR.attached ? 1 : 0); return n === 2 ? 1 : n === 1 ? 0.45 : 0.25; }

    // ===== наведение «куда смотришь» =====
    // ray = aimRay() адаптера: { origin, dir } (VR — из шлема, ПК/телефон — из камеры).
    // candidates: [{pos, id, team, alive?}]; вернёт лучшего врага в конусе maxAngleDeg или null.
    function aimPick(ray, candidates, o) {
      const opt = o || {}, A = cfg.aim, org = V(ray.origin), dir = norm(V(ray.dir));
      const cosMax = Math.cos((opt.maxAngleDeg || A.maxAngleDeg) * Math.PI / 180), maxD = opt.maxDist || A.maxDist;
      let best = null, bs = Infinity;
      for (const c of candidates || []) {
        if (c.alive === false || (opt.team != null && c.team === opt.team)) continue;
        const v = sub(V(c.pos), org), d = len(v); if (d < 0.01 || d > maxD) continue;
        const cs = dot(v, dir) / d; if (cs < cosMax) continue;
        const ang = Math.acos(clamp(cs, -1, 1)) * 180 / Math.PI, s = ang * A.angleWeight + d * A.distWeight;
        if (s < bs) { bs = s; best = c; }
      }
      return best;
    }

    // ===== адреналин =====
    const adrenaline = {
      until: -99, last: -1e9, wave: -1,
      // вызывать каждый кадр: вернёт { active, timeScale, started }
      update(hpFrac, now, wave) {
        const A = cfg.adrenaline; let started = false;
        if (now >= this.until && hpFrac > 0 && hpFrac < A.hpBelow && now - this.last >= A.cooldown && !(A.oncePerWave && this.wave === wave)) {
          this.until = now + A.dur; this.last = now; this.wave = wave; started = true;
        }
        const active = now < this.until;
        return { active, timeScale: active ? A.timeScale : 1, started, left: Math.max(0, this.until - now) };
      },
      reset() { this.until = -99; this.last = -1e9; this.wave = -1; },
    };

    // ===== кривая сложности =====
    function wave(w) {
      const out = { wave: w };
      for (const k in cfg.curve) { const c = cfg.curve[k]; out[k] = Math.min(c.cap, Math.max(0, c.a + c.b * (w - 1))); }
      out.count = Math.round(out.count); out.attackers = tokens.max(w);
      return out;
    }
    function debrisCap(mode, lite) { const m = mode || cfg.debrisMode; if (m === 'auto') return lite ? cfg.debris.low : cfg.debris.auto; return cfg.debris[m] != null ? cfg.debris[m] : cfg.debris.auto; }

    // ===== ракетница из-за спины: раз в N с — 3 неточные самонаводящиеся, не по своим =====
    function rocketTargets(enemies, from, now, state) {
      const R = cfg.rockets, s = state || {};
      if (s.next == null) s.next = now + R.every;
      if (now < s.next) return { fire: false, targets: [], state: s };
      s.next = now + R.every;
      const list = (enemies || []).filter(e => e.alive !== false && (s.team == null || e.team !== s.team))
        .map(e => ({ e, d: len(sub(V(e.pos), V(from))) })).sort((a, b) => a.d - b.d).slice(0, R.count).map(x => x.e);
      return { fire: list.length > 0, targets: list, state: s };
    }

    return { VERSION, cfg, profile, meter, cooldowns, tokens, isFront, lineOfFire, friendlyMult, swing, body, applyHit, attackArm, mobility,
      aimPick, adrenaline, wave, debrisCap, rocketTargets };
  }

  return { VERSION, BASE, PROFILES, create };
});
