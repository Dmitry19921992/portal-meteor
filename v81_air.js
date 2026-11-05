// =====================================================================
//  v8.1 — АВИАУДАРЫ СТРАТЕГА и МЕТЕОРИТНЫЙ ДОЖДЬ (AIR81, MET81)
//   • «Ковровая бомбардировка» (5 КО, 100 с): через 3.5 с бомбардировщик проходит над полосой 80 м и кладёт 10 бомб
//     через 9 м — воронки по калибру (CR80: тип 'a' — крупные), полоса — вдоль захода «от своей базы к цели»
//     (в бою — вдоль взгляда). Предупреждение: красная полоса на земле с обратным отсчётом, лазеры-маркеры на концах,
//     сирена (свист удара) и строка «ВОЗДУХ!» тому, кто под ударом.
//   • «Напалм» (3 КО, 60 с): через 2.5 с три бака огня, зона R 12 м горит 9 с — урон по времени (огонь 'f':
//     пехота полностью, танки ×0.3, здания ×0.2), подавление, дым, опалины; ИИ обходит и выбегает из огня;
//     поджигает метановое озеро.
//   • Кнопки: стратегия — вкладка «Удары» (ПК и телефон, сами из POWERS), в бою — панель «Поддержка» (4 → 5/6, 📡 на телефоне).
//   • Боты: Рой и наш ИИ-стратег иногда применяют оба удара (скопления, ключевые здания; не по своим).
//   • Метеоритный дождь — событие раз в 6–9 минут: за 10 с подсказка «в укрытие», потом ~20 с падают метеориты
//     (урон обеим сторонам, воронки). На «Низкой» графике — меньше огня, дыма и метеоритов.
//  Хуки — обёртки: POWERS (+2), startStrike, aiPowers, S78.call, update, newMatch, gatherParticles, gatherLights,
//  drawOverlay, keydown (capture). Выключить: ?air81=0, метеориты: ?met81=0.
// =====================================================================
const AIR81 = {
  on: (() => { try { return new URLSearchParams(location.search).get('air81') !== '0'; } catch (e){ return true; } })(),
  L: [], aiT: [20, 30], nextDir: null, lt: null, err: {}, Z: [], stats: { carpet: 0, napalm: 0, bombs: 0, aiCarpet: 0, aiNapalm: 0, burnTicks: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('AIR81 ' + tag, e); } } },
  low(){ return S.quality === 0 || (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()); },
  CL: 80, CW: 7, NB: 10,   // полоса ковровой бомбардировки: длина, полуширина, бомб
  dirFor(team, pt){
    const up = norm(pt);
    if (this.nextDir) return tangent(this.nextDir, up);
    let t = tangent(sub(pt, mul(BASES[team], RM)), up);   // заход со стороны своей базы
    if (!isFinite(t[0])) t = anyTangent(up);
    return t;
  },
  P(s, k, off){ const key = (off || 0).toFixed(1), C = s._pc || (s._pc = {}); return C[key] || (C[key] = surfacePoint(offsetOnSphere(norm(s.pos), s.dir, off || 0), 0.1)); },   // точка полосы на земле (кэш)
  start(team, k, pt, by, src){
    const up = norm(pt), s = { k, team, pos: mul(up, groundR(up)), dir: this.dirFor(team, pt), t: 0, by, src: src || null, n: 0, tick: 0, fxT: 0 };
    if (k === 'carpet'){ s.delay = 3.5; s.end = s.delay + 3.2; }
    else { s.delay = 2.5; s.end = s.delay + 9; s.r = POWERS.napalm.r; }
    this.L.push(s); this.stats[k]++;
    emit('strike', { team, pos: s.pos, kind: k, by });
    // предупреждение тем, кто под ударом
    const c = ctrlEntity();
    if (c && !S.attract && team === 1 && this.danger(s, c.pos, 40)){
      feed(k === 'carpet' ? tr('✈ ВОЗДУХ! Ковровая бомбардировка Роя — уходи с красной полосы!', '✈ AIR RAID! Swarm carpet bombing — get off the red strip!', '✈ KHÔNG KÍCH! Ném bom rải thảm — rời khỏi dải đỏ!')
                          : tr('♨ ВОЗДУХ! Напалм Роя — уходи из красного круга!', '♨ AIR RAID! Swarm napalm — get out of the red circle!', '♨ KHÔNG KÍCH! Bom napalm — rời khỏi vòng đỏ!'), '#f66');
      emit('radio', { text: tr('Воздух! Бомбардировщик над нами!', 'Air raid! Bomber overhead!', 'Không kích! Máy bay ném bom!'), pri: 2 });
    }
    return s;
  },
  danger(s, p, pad){
    if (s.k === 'napalm') return dist(p, s.pos) < s.r + pad;
    const up = norm(s.pos), v = sub(p, s.pos), a = dot(v, s.dir), side = len(sub(sub(v, mul(s.dir, a)), mul(up, dot(v, up))));
    return abs(a) < this.CL / 2 + pad && side < this.CW + pad;
  },
  planePos(s){
    // бомбардировщик: 55 м над полосой, 69 м/с; над началом полосы — в момент delay
    const sp = 69, x = -this.CL / 2 + (s.t - s.delay) * sp, up = norm(s.pos);
    const g = offsetOnSphere(up, s.dir, x);
    return mul(g, groundR(up) + 55);
  },
  step(dt){
    const low = this.low();
    this.Z.length = 0;
    for (let i = this.L.length - 1; i >= 0; i--){
      const s = this.L[i]; s.t += dt;
      if (s.k === 'carpet'){
        while (s.n < this.NB && s.t >= s.delay + s.n * 0.13){
          const off = -this.CL / 2 + s.n * (this.CL / (this.NB - 1)), tgt = add(this.P(s, 0, off), mul(norm(cross(norm(s.pos), s.dir)), (random() - 0.5) * 3));
          const from = add(this.planePos(Object.assign({}, s, { t: s.delay + s.n * 0.13 })), mul(s.dir, -3));
          S.proj.push({ pos: from, org: from, vel: mul(norm(sub(tgt, from)), 80), team: s.team, life: 3, dmg: 140, splash: 8, from: s.src, type: 'a', bomb81: 1 });
          s.n++; this.stats.bombs++;
          if (s.n % 3 === 1) emit('strike', { team: s.team, pos: tgt, kind: 'carpet' });
        }
      } else {
        if (s.t >= s.delay && !s.hit){
          s.hit = 1;
          for (const o of [-6, 0, 6]){
            const p = this.P(s, 0, o);
            fxExplosion(p, 2.6, o !== 0); splash(p, s.team, 45, 7, s.src, 'f');
            if (typeof GFX72 !== 'undefined' && GFX72.full && GFX72.full()){ GFX72.scor.push({ pos: sub(p, mul(norm(p), 0.1)), r: 6, t: 0, n81: s }); if (GFX72.scor.length > 24) GFX72.scor.shift(); }
          }
          if (S.cam && dist(S.cam.pos, s.pos) < 90) S.shake = max(S.shake, 0.45);
        }
        if (s.hit && s.t < s.end){
          const up = norm(s.pos);
          this.Z.push({ c: up, W: s.r + 2, hard: 1, cb: cos((s.r + 60) / RM) });
          s.tick -= dt;
          if (s.tick <= 0){
            s.tick = 0.5; this.stats.burnTicks++;
            for (const e of TGT[s.team]){
              if (!e.alive || dist(e.pos, s.pos) > s.r + (e.cls === 'bld' ? e.rad || 3 : 0.5)) continue;
              damage(e, 13, s.src, 'f');
              if (e.cls === 'inf') e.suppT = max(e.suppT || 0, 0.8);
            }
            if (typeof GFX72 !== 'undefined') for (const c of GFX72.scor) if (c.n81 === s) c.t = 0;   // опалины тлеют, пока горит
            if (s.t > s.delay + 1 && random() < 0.5) splash(s.pos, s.team, 1, s.r, s.src, 'f');   // огонь над метаном поджигает его
          }
          s.fxT -= dt;
          if (s.fxT <= 0){
            s.fxT = low ? 0.32 : 0.12;
            const t1 = anyTangent(up), a = random() * PI * 2, rr = s.r * Math.sqrt(random()) * 0.92;
            const p = surfacePoint(offsetOnSphere(up, add(mul(t1, cos(a)), mul(cross(up, t1), sin(a))), rr), 0.2);
            const fade = 1 - smoothstep(s.end - 2, s.end, s.t);
            S.fx.push({ type: 'fire', pos: add(p, mul(up, 0.6)), r0: 0.5, r1: 1.6 + 1.6 * fade, life: 0.8 + random() * 0.4, t: 0, inten: 0.85 * fade + 0.15 });
            if (random() < (low ? 0.12 : 0.25)) fxSmoke(add(p, mul(up, 2)), 2.4, 0.1, 1.1);
            if (S.fx.length > 80) S.fx.splice(0, S.fx.length - 80);
          }
        }
      }
      if (s.t > s.end) this.L.splice(i, 1);
    }
  },
  zones(){ return this.Z; },
  // ---------------- ИИ
  ai(t){
    if (S.over || !this.on) return;
    if (typeof TUT !== 'undefined' && TUT.on) return;
    this.aiT[t] -= 2; if (this.aiT[t] > 0) return;
    this.aiT[t] = 14 + random() * 14;
    const T = S.teams[t], keep = t === 0 && !S.attract ? 4 : 0;
    const own = (p, r) => [...S.units, ...S.vehicles, ...S.builders].some(u => u.alive && u.team === t && dist(u.pos, p) < r);
    const known = TGT[t].filter(e => e.alive && (e.cls === 'inf' || e.cls === 'tank' || e.cls === 'builder') && e.seen[t] > 0);
    if (T.cmd >= POWERS.napalm.cost + keep && powerLeft(t, 'napalm') <= 0 && random() < 0.7){
      const c = clusterCenter(known.filter(e => e.cls !== 'tank'));
      if (c && c.n >= 3 && !own(c.pos, 20) && !usePower(t, 'napalm', c.pos, 'ai')){ this.stats.aiNapalm++; aiPowerNote(t, 'napalm', c.pos); return; }
    }
    if (T.cmd >= POWERS.carpet.cost + keep && powerLeft(t, 'carpet') <= 0 && random() < 0.6){
      let p = null; const c = clusterCenter(known);
      if (c && c.n >= 3) p = c.pos;
      else if (random() < 0.4){ const kb = keyBuildings(1 - t).filter(b => b.seen[t] > 0); if (kb.length) p = kb[floor(random() * kb.length)].pos; }
      if (p){
        const s = { pos: p, dir: this.dirFor(t, p) };
        let bad = false;
        for (const u of [...S.units, ...S.vehicles, ...S.builders]) if (u.alive && u.team === t && this.danger(Object.assign({ k: 'carpet' }, s), u.pos, 10)){ bad = true; break; }
        if (!bad && !usePower(t, 'carpet', p, 'ai')){ this.stats.aiCarpet++; aiPowerNote(t, 'carpet', p); }
      }
    }
  },
  // ---------------- рендер
  parts(n){
    if (!S.cam || !this.L.length) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    for (const s of this.L){
      const up = norm(s.pos);
      if (s.t < s.delay){   // лазеры-маркеры цели
        const pts = s.k === 'carpet' ? [this.P(s, 0, -this.CL / 2), this.P(s, 0, this.CL / 2), s.pos] : [s.pos];
        for (const p of pts) push(add(p, mul(up, 0.2)), 0.22, add(p, mul(up, 3 + 2 * sin(S.time * 18))), 8);
      }
      const pt = s.t - s.delay;
      if (pt > -1.6 && pt < 2.4){   // бомбардировщик: два двигателя, огни, инверсионный след
        const p = this.planePos(s), side = norm(cross(up, s.dir));
        for (const k of [-1, 1]){ const e = add(p, mul(side, k * 4)); push(e, 0.55, sub(e, mul(s.dir, 3)), 3); push(sub(e, mul(s.dir, 3)), 0.12, sub(e, mul(s.dir, 32)), 5); push(add(p, mul(side, k * 9)), 0.18, add(p, mul(side, k * 9.1)), k < 0 ? 1 : 0); }
        push(add(p, mul(s.dir, 5)), 0.35, sub(p, mul(s.dir, 6)), 2);
      }
    }
    return n;
  },
  lights(n){
    if (!S.cam || !this.L.length) return n;
    const mx = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxL : 16;
    for (const s of this.L){
      if (n >= mx) break;
      if (s.k === 'napalm' && s.hit && s.t < s.end){ const p = add(s.pos, mul(norm(s.pos), 3)), f = 0.8 + 0.2 * sin(S.rtime * 13); LP.set([p[0], p[1], p[2], 34], n * 4); LC.set([4 * f, 1.6 * f, 0.35 * f, 0.002], n * 4); n++; }
      else if (abs(s.t - s.delay) < 2){ const p = this.planePos(s); LP.set([p[0], p[1], p[2], 30], n * 4); LC.set([2.4, 1.6, 0.8, 0.003], n * 4); n++; }
    }
    return n;
  },
  strip(s, col, fill, label){
    const up = norm(s.pos), side = norm(cross(up, s.dir)), N = 8, A = [], B = [];
    for (let i = 0; i <= N; i++){
      const off = -this.CL / 2 + this.CL * i / N, c = this.P(s, 0, off);
      A.push(project(add(c, mul(side, this.CW)))); B.push(project(sub(c, mul(side, this.CW))));
    }
    if (A.some(q => !q) || B.some(q => !q)) return;
    octx.beginPath(); A.forEach((q, i) => i ? octx.lineTo(q[0], q[1]) : octx.moveTo(q[0], q[1])); for (let i = N; i >= 0; i--) octx.lineTo(B[i][0], B[i][1]); octx.closePath();
    octx.fillStyle = fill; octx.fill(); octx.strokeStyle = col; octx.lineWidth = 2; octx.stroke();
    // стрелка захода
    const a = project(this.P(s, 0, -this.CL / 2 - 12)), b = project(this.P(s, 0, -this.CL / 2 + 6));
    if (a && b){ octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke(); }
    if (label){ const c = project(add(s.pos, mul(up, 3))); if (c){ octx.fillStyle = col; octx.fillText(label, c[0], c[1]); } }
  },
  overlay(){
    if (!S.cam || typeof facing !== 'function') return;
    octx.save(); octx.textAlign = 'center'; octx.font = '700 13px "Exo 2", sans-serif';
    for (const s of this.L){
      if (!facing(s.pos) || dist(s.pos, S.cam.pos) > 600) continue;
      const enemy = s.team !== 0, col = enemy ? '#ff4a3a' : '#ffb070', fill = enemy ? 'rgba(255,60,40,.16)' : 'rgba(255,170,90,.12)';
      const left = s.delay - s.t;
      if (s.k === 'carpet' && left > -0.6) this.strip(s, col, fill, left > 0 ? '✈ ' + left.toFixed(1) + tr(' с', ' s', ' giây') : '');
      if (s.k === 'napalm' && s.t < s.end){
        octx.strokeStyle = col; octx.lineWidth = 2; octx.setLineDash(left > 0 ? [6, 5] : []);
        groundRing(add(s.pos, mul(norm(s.pos), 0.3)), s.r, 28); octx.setLineDash([]);
        if (left > 0){ const c = project(add(s.pos, mul(norm(s.pos), 3))); if (c){ octx.fillStyle = col; octx.fillText('♨ ' + left.toFixed(1) + tr(' с', ' s', ' giây'), c[0], c[1]); } }
      }
    }
    // прицел ковровой бомбардировки в стратегии: полоса вдоль захода
    if (S.cast && S.cast.kind === 'power' && S.cast.key === 'carpet' && S.mouse && typeof pickGround === 'function'){
      const p = pickGround(S.mouse[0], S.mouse[1]);
      if (p){ octx.setLineDash([5, 5]); this.strip({ pos: p, dir: this.dirFor(0, p) }, '#ffd27a', 'rgba(255,210,122,.10)', ''); octx.setLineDash([]); }
    }
    octx.restore();
  },
};
// ---- новые удары (вкладка «Удары» стратегии и телефонная панель берут их сами)
Object.assign(POWERS, {
  carpet: { cost: 5, cd: 100, r: 10, icon: '✈', n: ['Ковровая бомбардировка', 'Carpet bombing', 'Ném bom rải thảm'], d: ['Бомбардировщик кладёт 10 бомб полосой 80 м вдоль захода от вашей базы (в бою — вдоль взгляда). Через 3.5 с, оставляет воронки.', 'A bomber drops 10 bombs along an 80 m strip, approaching from your base (in battle — along your view). After 3.5 s, leaves craters.', 'Máy bay thả 10 quả bom theo dải 80 m sau 3,5 giây.'] },
  napalm: { cost: 3, cd: 60, r: 12, icon: '♨', n: ['Напалм', 'Napalm', 'Bom napalm'], d: ['Зона огня R 12 м горит 9 секунд: урон по времени, подавление, дым. Через 2.5 с. Поджигает метан.', 'A 12 m fire zone burns for 9 seconds: damage over time, suppression, smoke. After 2.5 s. Ignites methane.', 'Vùng lửa 12 m cháy 9 giây.'] },
});
if (AIR81.on){
  { const ss0 = startStrike;
    startStrike = function(team, k, pt, by, src){
      if (k === 'carpet' || k === 'napalm'){ AIR81.safe(() => AIR81.start(team, k, pt, by, src), 'start'); return; }
      return ss0.apply(this, arguments);
    }; }
  { const ap0 = aiPowers; aiPowers = function(t){ const r = ap0.apply(this, arguments); AIR81.safe(() => AIR81.ai(t), 'ai'); return r; }; }
  if (typeof S78 !== 'undefined'){
    S78.CALLS.push('carpet', 'napalm');
    const c0 = S78.call;
    S78.call = function(k){
      if (k !== 'carpet' && k !== 'napalm') return c0.apply(this, arguments);
      const c = this.me(); if (!c) return;
      const why = this.why(k);
      if (why){ feed(`${N2(POWERS[k].n)}: ${why}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
      let p = this.aimPoint(); if (!p) return;
      if (dist(p, c.pos) < 14) p = surfacePoint(offsetOnSphere(norm(c.pos), c.fwd || S.cam.fwd, 30), 0.3);   // не себе под ноги
      AIR81.nextDir = S.cam.fwd; const r = usePower(0, k, p, 'player'); AIR81.nextDir = null;
      if (r){ feed(`${N2(POWERS[k].n)}: ${r}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
      S.markers.push({ pos: p, t: 0, life: 4, col: '#ff6040' });
      emit('ui', { kind: 'ok' });
      emit('radio', { text: k === 'carpet' ? tr('Бомбардировщик: цель принята, заходим!', 'Bomber: target received, inbound!', 'Máy bay ném bom: đã nhận mục tiêu!') : tr('Штурмовик: напалм на подходе!', 'Attack jet: napalm inbound!', 'Cường kích: napalm đang tới!'), pri: 1 });
      feed('📡 ' + N2(POWERS[k].n) + ' — ' + tr('держись подальше!', 'keep clear!', 'tránh xa!'), '#9cf');
      this.stats.calls[k] = (this.stats.calls[k] || 0) + 1;
      this.open = false; this.sig = '';
    };
    addEventListener('keydown', e => {
      if (e.repeat || MENU.isOpen() || S.attract || S.mode !== 'fps' || !S78.on || !S78.open || !S78.me()) return;
      if (/^Digit[56]$/.test(e.code)){ e.preventDefault(); e.stopImmediatePropagation(); S78.call(S78.CALLS[+e.code.slice(5) - 1]); }
    }, true);
    if (typeof BIND_NAMES !== 'undefined' && BIND_NAMES.sup78) BIND_NAMES.sup78 = ['Поддержка: ящик, разведка, «Град», артудар, бомбардировка, напалм (потом 1–6)', 'Support: crate, recon, "Grad", artillery, carpet bombing, napalm (then 1–6)', 'Hỗ trợ (rồi 1–6)'];
  }
  { const gp0 = gatherParticles; gatherParticles = function(){ let n = gp0.apply(this, arguments); const m = AIR81.safe(() => AIR81.parts(n), 'par'); if (m !== undefined) n = m; const k = AIR81.safe(() => MET81.parts(n), 'mpar'); return k === undefined ? n : k; }; }
  { const gl0 = gatherLights; gatherLights = function(){ const n = gl0.apply(this, arguments); const m = AIR81.safe(() => AIR81.lights(n), 'lit'); return m === undefined ? n : m; }; }
  { const do0 = drawOverlay; drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (!S.attract && !OPER.on && !(typeof M74 !== 'undefined' && M74.nohud)) AIR81.safe(() => { AIR81.overlay(); MET81.overlay(); }, 'ov'); return r; }; }
}
// =====================================================================
//  Метеоритный дождь — событие (MET81)
// =====================================================================
const MET81 = {
  on: (() => { try { return new URLSearchParams(location.search).get('met81') !== '0'; } catch (e){ return true; } })(),
  T: 330, phase: 0, pt: 0, L: [], spawnT: 0, left: 0, stats: { showers: 0, meteors: 0 },
  reset(){ this.T = 300 + random() * 120; this.phase = 0; this.L = []; },
  begin(){ this.phase = 1; this.pt = 10; this.stats.showers++;
    if (!S.attract){
      feed(tr('☄ Метеоритный дождь через 10 с — в укрытие: ангар в скалах, под гряду!', '☄ Meteor shower in 10 s — take cover: the rock hangar, under a ridge!', '☄ Mưa thiên thạch sau 10 giây — tìm chỗ nấp!'), '#ffcf7a');
      emit('radio', { text: tr('Внимание: метеоритный дождь! Всем в укрытие', 'Warning: meteor shower! Everyone take cover', 'Cảnh báo: mưa thiên thạch!'), pri: 2 });
    } },
  step(dt){
    if (!this.on || S.over) return;
    if ((typeof TUT !== 'undefined' && TUT.on) || (typeof T72 !== 'undefined' && T72.on)) return;
    if (this.phase === 0){ this.T -= dt; if (this.T <= 0) this.begin(); }
    else if (this.phase === 1){ this.pt -= dt; if (this.pt <= 0){ this.phase = 2; this.pt = 20; this.left = AIR81.low() ? 14 : 28; this.spawnT = 0; } }
    else if (this.phase === 2){
      this.pt -= dt; this.spawnT -= dt;
      if (this.left > 0 && this.spawnT <= 0){ this.spawnT = 20 / (AIR81.low() ? 14 : 28) * (0.5 + random()); this.left--; this.spawn(); }
      if (this.pt <= 0 && !this.L.length){ this.phase = 0; this.T = 360 + random() * 180; }
    }
    for (let i = this.L.length - 1; i >= 0; i--){
      const m = this.L[i]; m.pos = add(m.pos, mul(m.vel, dt)); m.t += dt;
      if (mapStatic(m.pos[0], m.pos[1], m.pos[2]) < 0.6 || m.t > 6){ this.L.splice(i, 1); this.impact(m.pos); }
    }
  },
  spawn(){
    const c = ctrlEntity();
    let dir;
    const ref = c && random() < 0.6 ? norm(c.pos) : (S.cam && random() < 0.5 ? norm(S.cam.pos) : null);
    if (ref) dir = offsetOnSphere(ref, randUnit(), 15 + random() * 110);
    else dir = randUnit();
    for (const b of BASES) if (surfDist(dir, b) < 60) dir = offsetOnSphere(b, randUnit(), 70 + random() * 60);
    const tgt = mul(dir, groundR(dir)), up = dir;
    const from = add(add(tgt, mul(up, 230)), mul(tangent(randUnit(), up), 140));
    this.L.push({ pos: from, vel: mul(norm(sub(tgt, from)), 95), t: 0 });
    this.stats.meteors++;
    if (random() < 0.35) emit('strike', { team: 2, pos: tgt, kind: 'meteor' });
  },
  impact(p){
    fxExplosion(p, 2.4);
    splash(p, 0, 70, 5.5, null, 'a');
    const o = typeof CR76 !== 'undefined' ? CR76.on : null; if (o !== null) CR76.on = false;
    try { splash(p, 1, 70, 5.5, null, 'a'); } finally { if (o !== null) CR76.on = o; }
    if (S.cam && dist(S.cam.pos, p) < 60) S.shake = max(S.shake, 0.4);
  },
  parts(n){
    if (!this.L.length) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    for (const m of this.L){ if (n >= pmax) break; const b = sub(m.pos, mul(m.vel, 0.16)); PAR.set([m.pos[0], m.pos[1], m.pos[2], 0.6, b[0], b[1], b[2], 3], n * 8); n++; if (n < pmax){ const b2 = sub(m.pos, mul(m.vel, 0.5)); PAR.set([b[0], b[1], b[2], 0.25, b2[0], b2[1], b2[2], 5], n * 8); n++; } }
    return n;
  },
  overlay(){
    if (this.phase === 1 && !S.attract){
      octx.save(); octx.textAlign = 'center'; octx.font = '700 15px "Exo 2", sans-serif'; octx.fillStyle = '#ffcf7a';
      octx.fillText('☄ ' + tr('Метеоритный дождь через ', 'Meteor shower in ', 'Mưa thiên thạch sau ') + Math.ceil(this.pt) + tr(' с — в укрытие', ' s — take cover', ' giây'), innerWidth / 2, (typeof TOUCH !== 'undefined' && TOUCH.on ? 64 : 96));
      octx.restore();
    }
  },
};
{ const up0 = update; update = function(rdt){ up0(rdt); if (S.paused) return; const dt = clamp(S.time - (AIR81.lt === null ? S.time : AIR81.lt), 0, 0.1); AIR81.lt = S.time; if (dt <= 0) return; if (AIR81.on) AIR81.safe(() => AIR81.step(dt), 'step'); AIR81.safe(() => MET81.step(dt), 'met'); }; }
{ const nm0 = newMatch; newMatch = function(){ AIR81.L = []; AIR81.Z.length = 0; AIR81.lt = null; AIR81.aiT = [20 + random() * 20, 30 + random() * 20]; MET81.reset(); return nm0.apply(this, arguments); }; }
// заголовок вкладки тестовой сборки (v8.0 ставил «v8.0 test» артефакту и dist/v80*)
{ const al0 = MENU.applyLang; MENU.applyLang = function(){ const r = al0.apply(this, arguments); if (window.PM_ART80 || /v8[01]/.test(location.pathname)) document.title = 'Portal Meteor v8.1 test'; return r; }; }
