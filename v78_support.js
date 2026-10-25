// =====================================================================
//  v7.8 — SUPPORT CALLS and SUPPLY CRATES (everything in this file).
//  • Command points (КО / CP) already exist: time (1 per 75 s), kills, captures; v7.8 adds anomaly discharges (+0.5).
//    The AI strategist of your team keeps a reserve of 4 CP for you.
//  • New powers (also in the strategy sidebar): «Ящик снабжения» / Supply drop (2 CP) and «Град» / Grad rocket strike (4 CP).
//    In battle: 4 (rebindable) — a compact panel above the weapon box; 1–4 calls at the crosshair: crate, recon scan,
//    «Град», artillery. Phone: the 📡 button on the right → the same list. The screen centre stays free.
//  • Supply crates lie in ruins of old expeditions and wrecks, near the bases and next to finished buildings (refill in 4 min);
//    the airdrop crate is the richest. Contents: magazines and grenades full, rockets, weapon parts (mastery XP → attachments).
//  • The enemy AI uses «Град» on clusters; your AI strategist sometimes drops a crate next to you when you run dry.
//  Hooks: POWERS (+2), usePower, startStrike, aiPowers, update, newMatch, finishSite, nearbyInteract, interact,
//  gatherParticles, gatherLights, drawOverlay, updateModeUI, keydown (capture). Off: ?s78=0.
// =====================================================================
const S78 = {
  on: (() => { try { return new URLSearchParams(location.search).get('s78') !== '0'; } catch (e){ return true; } })(),
  crates: [], drops: [], open: false, err: {}, el: null, sig: '', strT: 60, lt: null, stats: { calls: {}, picked: 0, drops: 0, aiDrops: 0, aiGrad: 0, crates0: 0 },
  CALLS: ['drop', 'scan', 'grad', 'arty'],
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('s78 ' + tag, e); } } },
  lite(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof TOUCH !== 'undefined' && TOUCH.on); },
  me(){ const c = ctrlEntity(); return c && c.alive && S.mode === 'fps' && !S.attract ? c : null; },
  // ------------------------------------------------------------------ crates in the world
  mkCrate(dir, kind, b){
    const g = groundR(dir), up = dir, f = anyTangent(up);
    const c = { dir, pos: mul(dir, g + 0.05), up, fwd: f, R: norm(cross(f, up)), kind, full: true, refT: 0, b: b || null };
    this.crates.push(c);
    this.model(c);
    return c;
  },
  okSpot(dir){
    if (abs(groundR(dir) - RM) > 16) return false;
    for (const c of this.crates) if (surfDist(dir, c.dir) < 8) return false;
    if (typeof A78 !== 'undefined') for (const a of A78.L) if (surfDist(dir, a.dir) < a.r + 4) return false;
    if (propAt(mul(dir, groundR(dir) + 0.6), 0.4)) return false;
    return true;
  },
  near(center, r0, r1, rnd){
    const t1 = anyTangent(center), t2 = cross(center, t1);
    for (let k = 0; k < 24; k++){
      const a = rnd() * PI * 2, rr = r0 + (r1 - r0) * rnd();
      const d = offsetOnSphere(center, add(mul(t1, cos(a)), mul(t2, sin(a))), rr);
      if (this.okSpot(d)) return d;
    }
    return null;
  },
  spawn(){
    this.clearModels(); this.crates = []; this.drops = []; this.open = false;
    if (!this.on || typeof PROPS === 'undefined') return;
    const rnd = seeded((Date.now() ^ 0x5e78) >>> 0), max = this.lite() ? 7 : 12;
    // ruins of old expeditions first (habitats, depots), then wrecks
    const ruins = PROPS.filter(p => p.kind === 6 || p.kind === 7), wrecks = PROPS.filter(p => p.kind <= 4);
    for (const p of [...ruins, ...wrecks.sort(() => rnd() - 0.5)]){
      if (this.crates.length >= max - 2) break;
      const d = this.near(p.dir, p.bound + 2, p.bound + 6, rnd); if (d) this.mkCrate(d, 'ruin');
    }
    // one next to each HQ (the enemy one is a tempting raid target)
    for (const t of [0, 1]){ const d = this.near(BASES[t], 30, 44, rnd); if (d) this.mkCrate(d, 'base'); }
    this.stats.crates0 = this.crates.length;
  },
  onBuilt(b){
    if (!this.on || !b || b.cls !== 'bld' || !b.done || b.crate78) return;
    if (!['outpost', 'factory', 'hub', 'airdock'].includes(b.type)) return;
    if (this.crates.filter(c => c.kind === 'bld').length >= (this.lite() ? 4 : 8)) return;
    b.crate78 = 1;
    const d = this.near(b.up, b.rad + 3, b.rad + 7, Math.random); if (d) this.mkCrate(d, 'bld', b);
  },
  // optional textured model of the approved «crates» 3D asset (AS75); without it — a simple box made of particles
  model(c){
    if (typeof AS75 === 'undefined' || !AS75.cat || !AS75.items || !AS75.placed) return;   // AS75 re-plans its list on first draw — add after that
    const e = AS75.cat.items.find(x => x.t === 'crates'); if (!e) return;
    const s = 0.62, Y = c.up, Z = c.fwd, X = norm(cross(Y, Z)), r = 0.5 * Math.hypot(e.d[0], e.d[2]) * s, h = e.d[1] * s;
    const it = { e, key: e.n, dir: c.dir, pos: sub(c.pos, mul(Y, 0.08)), X, Y, Z, s, r, h, rr: Math.hypot(r, h * 0.5), cen: add(c.pos, mul(Y, h * 0.5)), sh: -1, hide: false, col: false, lodA: [0, 0, 0], s78: 1 };
    AS75.items.push(it); c.it = it; c.itArr = AS75.items;
  },
  clearModels(){ if (typeof AS75 !== 'undefined' && AS75.items) AS75.items = AS75.items.filter(i => !i.s78); for (const c of this.crates) c.it = null; },
  modelShown(c){
    if (typeof AS75 === 'undefined') return false;
    if ((!c.it || c.itArr !== AS75.items) && AS75.placed && !c.noModel){ c.it = null; this.model(c); if (!c.it) c.noModel = 1; }
    return c.it && c.itArr === AS75.items && typeof AS75 !== 'undefined' && AS75.on() && !c.it.hide && AS75.M[c.key0 || (c.key0 = c.it.key + '_lod1')] && AS75.M[c.key0].st === 2; },
  // ------------------------------------------------------------------ airdrop
  airdrop(team, pt, by){
    const dir = norm(pt);
    this.drops.push({ team, dir, to: mul(dir, groundR(dir) + 0.4), t: 0, T: 4.2, by });
    emit('podincoming', { pos: pt });
    this.stats.drops++;
    if (!S.attract && team === 0) feed(tr('📦 Ящик снабжения: сброс через 4 секунды', '📦 Supply drop: landing in 4 seconds', '📦 Thả tiếp tế: 4 giây nữa'), '#ffd27a');
  },
  dropPos(d){ const k = min(1, d.t / d.T); return add(d.to, mul(d.dir, 140 * (1 - k) * (1 - k) + 0.1)); },
  stepDrops(dt){
    for (let i = this.drops.length - 1; i >= 0; i--){
      const d = this.drops[i]; d.t += dt;
      if (random() < dt * 8) fxSmoke(this.dropPos(d), 0.5, 0.35, 0.5);
      if (d.t >= d.T){
        this.drops.splice(i, 1);
        fxSmoke(d.to, 1.4, 0.3, 0.9); burst(d.to, 10, 6, 0.4); addWave(d.to, 1.2, 0.4);
        emit('land', { pos: d.to, hard: true });
        if (d.team === 0) this.mkCrate(d.dir, 'air');
      }
    }
  },
  // ------------------------------------------------------------------ pickup
  crateNear(c, R){
    let best = null, bd = R || 5;
    for (const k of this.crates){ if (!k.full) continue; const d = dist(k.pos, c.pos); if (d < bd){ bd = d; best = k; } }
    return best;
  },
  take(k){
    const c = S.me, K = S.kit; if (!c || c.cls !== 'inf' || !K || !k.full) return;
    k.full = false; k.refT = k.kind === 'air' ? -1 : S.time + 240;
    const got = [];
    for (const w in WEAPONS) if (WEAPONS[w].mag && K.mag) K.mag[w] = (typeof pW === 'function' && typeof gstat === 'function') ? gstat(pW(w), 'mag') : WEAPONS[w].mag;
    K.reloadT = 0; got.push(tr('магазины полные', 'full magazines', 'đầy băng đạn'));
    if (typeof G62 !== 'undefined') this.safe(() => { const G = G62.kit(); if (G) G.gren = max(G.gren || 0, G62.MAX); }, 'gren');
    K.grenCd = 0; got.push(tr('гранаты', 'grenades', 'lựu đạn'));
    const rich = k.kind === 'air' || k.kind === 'base';
    if (rich || random() < 0.5){ K.freeRockets = (K.freeRockets || 0) + (rich ? 2 : 1); c.rocketCd = 0; got.push(tr(`ракеты ×${rich ? 2 : 1}`, `rockets ×${rich ? 2 : 1}`, `tên lửa ×${rich ? 2 : 1}`)); }
    if (typeof CAREER !== 'undefined' && (rich || random() < 0.6)){ const w = K.w === 'rail' || K.w === 'hmg' ? K.w : (roleOf(c).w === 'smg' ? 'smg' : 'rifle'); this.safe(() => CAREER.addW(w, rich ? 220 : 140), 'parts'); got.push(tr('детали оружия', 'weapon parts', 'linh kiện súng')); }
    if (k.kind === 'air'){ c.hp = min(c.maxhp, c.hp + c.maxhp * 0.4); got.push(tr('ремкомплект', 'repair kit', 'bộ sửa chữa')); }
    this.stats.picked++;
    if (typeof AU !== 'undefined' && AU.ready()) AU.chime(true);
    emit('ui', { kind: 'ok' });
    feed('📦 ' + tr('Ящик снабжения: ', 'Supply crate: ', 'Thùng tiếp tế: ') + got.join(', '), '#ffd27a');
    if (typeof HINTS !== 'undefined') HINTS.used('s78crate');
    if (k.kind === 'air'){ this.crates.splice(this.crates.indexOf(k), 1); if (k.it && typeof AS75 !== 'undefined') AS75.items = AS75.items.filter(i => i !== k.it); }
  },
  stepCrates(){
    for (const k of this.crates){
      if (!k.full && k.refT > 0 && S.time > k.refT){ k.full = true; k.refT = 0; }
      if (k.b && !k.b.alive){ k.b = null; }
    }
    const c = this.me();
    if (c && c.cls === 'inf'){ const k = this.crateNear(c, 2.2); if (k) this.take(k); }
  },
  // ------------------------------------------------------------------ calls from the battle (FPS)
  aimPoint(){
    const c = this.me(); if (!c || !S.cam) return null;
    const r = rayCast(S.cam.pos, S.cam.fwd, 320, c.team, false);
    if (r.t < 319) return r.pos;
    return surfacePoint(offsetOnSphere(norm(c.pos), c.fwd || S.cam.fwd, 30), 0.3);
  },
  why(k){
    const P = POWERS[k], T = S.teams[0];
    if (!P || !T) return '?';
    if (T.cmd < P.cost) return tr('мало КО', 'not enough CP', 'thiếu ĐCH');
    const left = powerLeft(0, k); if (left > 0) return Math.ceil(left) + tr(' с', ' s', ' giây');
    return null;
  },
  call(k){
    const c = this.me(); if (!c) return;
    const why = this.why(k);
    if (why){ feed(`${N2(POWERS[k].n)}: ${why}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
    let p = this.aimPoint(); if (!p) return;
    if (k === 'drop'){ if (dist(p, c.pos) > 70 || dist(p, c.pos) < 3) p = surfacePoint(offsetOnSphere(norm(c.pos), c.fwd || S.cam.fwd, 7), 0.3); }
    if (k === 'scan' && dist(p, c.pos) > 140) p = c.pos;
    const r = usePower(0, k, p, 'player');
    if (r){ feed(`${N2(POWERS[k].n)}: ${r}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
    S.markers.push({ pos: p, t: 0, life: 4, col: k === 'drop' ? '#ffd27a' : k === 'scan' ? '#9cf' : '#ff7050' });
    this.stats.calls[k] = (this.stats.calls[k] || 0) + 1;
    emit('ui', { kind: 'ok' });
    const txt = { drop: tr('Снабжение: ящик сброшен рядом', 'Logistics: crate dropped nearby', 'Hậu cần: đã thả thùng'), scan: tr('Разведка: сканируем район', 'Recon: scanning the area', 'Trinh sát: đang quét'),
                  grad: tr('«Град»: цель принята, залп!', '"Grad": target received, salvo!', '"Grad": đã nhận mục tiêu!'), arty: tr('Артиллерия: цель принята', 'Artillery: target received', 'Pháo binh: đã nhận mục tiêu') }[k];
    emit('radio', { text: txt, pri: 1 });
    feed('📡 ' + N2(POWERS[k].n) + (k === 'grad' || k === 'arty' ? ' — ' + tr('держись подальше!', 'keep clear!', 'tránh xa!') : ''), '#9cf');
    if (typeof HINTS !== 'undefined') HINTS.used('s78sup');
    this.open = false; this.sig = '';
  },
  // ------------------------------------------------------------------ AI
  aiStep(dt){
    if (S.over) return;
    this.strT -= dt; if (this.strT > 0) return;
    this.strT = 30 + random() * 25;
    // enemy: «Град» on a cluster of our troops
    const E = S.teams[1];
    if (E && E.ai && E.cmd >= POWERS.grad.cost + 1 && powerLeft(1, 'grad') <= 0 && random() < 0.5){
      const known = TGT[1].filter(e => e.alive && (e.cls === 'inf' || e.cls === 'tank') && e.seen[1] > 0);
      const cc = clusterCenter(known);
      if (cc && cc.n >= 3 && !S.units.some(u => u.alive && u.team === 1 && dist(u.pos, cc.pos) < 22) && !usePower(1, 'grad', cc.pos, 'ai')) this.stats.aiGrad++;
    }
    // our strategist bot: a crate next to the player when he runs dry
    const T = S.teams[0], c = this.me();
    if (T && T.ai !== false && c && c.cls === 'inf' && !S.attract && T.cmd >= POWERS.drop.cost + 2 && powerLeft(0, 'drop') <= 0){
      const K = S.kit, W = K && WEAPONS[K.w];
      const dry = K && ((W && W.mag && K.mag[K.w] < W.mag * 0.3) || (typeof G62 !== 'undefined' && G62.kit() && (G62.kit().gren | 0) === 0) || c.hp < c.maxhp * 0.4);
      if (dry && !this.crateNear(c, 60) && random() < 0.6){
        const p = surfacePoint(offsetOnSphere(norm(c.pos), anyTangent(norm(c.pos)), 6), 0.3);
        if (!usePower(0, 'drop', p, 'ai')){ this.stats.aiDrops++; emit('radio', { text: tr('Стратег: сбрасываю тебе ящик снабжения, рядом', 'Strategist: dropping you a supply crate nearby', 'Chiến lược gia: thả thùng tiếp tế gần bạn'), pri: 1 }); }
      }
    }
  },
  // ------------------------------------------------------------------ rendering
  parts(n){
    if (!S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    const push = (a, ra, b, ty) => { if (n >= pmax) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
    const cam = S.cam.pos, rts = S.mode !== 'fps' && !S.attract;
    let m = 0;
    for (const k of this.crates){
      if (m >= 6) break;
      if (dist2(k.pos, cam) > (rts ? 0 : 3600)) continue;
      if (!this.modelShown(k)){
        m++;
        const P = (x, y, z) => add(k.pos, add(add(mul(k.R, x), mul(k.up, y)), mul(k.fwd, z)));
        for (let i = 0; i < 3; i++) push(P(-0.45, 0.2 + i * 0.26, 0), 0.15, P(0.45, 0.2 + i * 0.26, 0), 12.0);
        if (k.full) push(P(-0.47, 0.8, 0), 0.03, P(0.47, 0.8, 0), 5);
      }
    }
    for (const d of this.drops){ const p = this.dropPos(d); push(p, 0.35, add(p, mul(d.dir, 3.5)), 3); }
    return n;
  },
  lights(n){
    if (!S.cam) return n;
    const max_ = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxL : 16, cam = S.cam.pos;
    let best = null, bd = 1600;
    for (const k of this.crates){ if (!k.full) continue; const d = dist2(k.pos, cam); if (d < bd){ bd = d; best = k; } }
    if (best && n < max_){ const p = add(best.pos, mul(best.up, 1.2)), f = 0.6 + 0.4 * sin(S.rtime * 4); LP.set([p[0], p[1], p[2], 6], n * 4); LC.set([1.8 * f, 1.1 * f, 0.2 * f, 0.0015], n * 4); n++; }
    for (const d of this.drops){ if (n >= max_) break; const p = this.dropPos(d); LP.set([p[0], p[1], p[2], 14], n * 4); LC.set([3, 1.6, 0.4, 0.004], n * 4); n++; }
    return n;
  },
  overlay(){
    const c = this.me(); if (!c || !S.cam) return;
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    octx.save(); octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", sans-serif';
    for (const k of this.crates){
      if (!k.full) continue;
      const d = dist(k.pos, c.pos); if (d > 60) continue;
      const s = project(add(k.pos, mul(k.up, 2.2))); if (!s || s[0] < 0 || s[0] > W || s[1] < 0 || s[1] > H || hypot(s[0] - cx, s[1] - cy) < 80) continue;
      octx.fillStyle = 'rgba(255,210,122,.92)';
      octx.fillText(`📦 ${k.kind === 'air' ? tr('сброс', 'airdrop', 'thả') : tr('ящик', 'crate', 'thùng')} · ${Math.round(d)} ${tr('м', 'm', 'm')}`, s[0], s[1]);
    }
    for (const d of this.drops){ const s = project(d.to); if (s && hypot(s[0] - cx, s[1] - cy) > 80){ octx.fillStyle = '#ffd27a'; octx.fillText('📦 ↓ ' + Math.max(0, d.T - d.t).toFixed(0) + tr(' с', ' s', ' giây'), s[0], s[1]); } }
    octx.restore();
  },
  // ------------------------------------------------------------------ compact panel (PC: above the weapon box; phone: 📡 on the right)
  ensure(){
    if (this.el) return this.el;
    const el = this.el = document.createElement('div'); el.id = 's78'; document.body.appendChild(el);
    const act = t => { const b = t && t.closest ? t.closest('[data-s78]') : null; if (!b) return; AU.init(); const k = b.dataset.s78; if (k === 'tog'){ this.open = !this.open; this.sig = ''; this.render(); if (this.open && typeof HINTS !== 'undefined') HINTS.used('s78sup'); } else this.call(k); if (typeof M71 !== 'undefined' && M71.haptic) M71.haptic(10); };
    el.addEventListener('touchstart', e => { if (e.target.closest('[data-s78]')){ e.preventDefault(); act(e.target); } e.stopPropagation(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.stopPropagation(); });
    el.addEventListener('click', e => { e.stopPropagation(); act(e.target); });
    return el;
  },
  render(){
    const el = this.ensure();
    const fps = !!this.me() && !MENU.isOpen() && !S.over && !(typeof FEEL76 !== 'undefined' && FEEL76.intro) && !(typeof TUT !== 'undefined' && TUT.on) && !(typeof T72 !== 'undefined' && T72.on) && !OPER.on && !(typeof M74 !== 'undefined' && M74.nohud);
    if (!fps || !this.on){ if (el.style.display !== 'none') el.style.display = 'none'; this.open = false; return; }
    el.style.display = 'block';
    const T = S.teams[0], cp = T ? Math.floor(T.cmd) : 0, ph = TOUCH.on, kb = SET.bind.sup78 || 'Digit4';
    const rows = this.CALLS.map((k, i) => { const P = POWERS[k], w = this.why(k); return [k, i, P, w]; });
    const sig = (this.open ? 1 : 0) + '|' + cp + '|' + rows.map(r => r[3] || '').join(',') + '|' + LANG.cur + ph;
    if (sig === this.sig) return; this.sig = sig;
    el.className = (this.open ? 'open' : '') + (ph ? ' ph' : '');
    const head = `<button data-s78="tog" class="hd">${ph ? '📡' : `<kbd>${keyLabel(kb)}</kbd>📡`}<b>${ph ? '' : tr('Поддержка', 'Support', 'Hỗ trợ') + ' · '}${cp} ${tr('КО', 'CP', 'ĐCH')}</b></button>`;
    const list = this.open ? `<div class="ls">${rows.map(([k, i, P, w]) => `<button data-s78="${k}" class="${w ? 'off' : ''}">${ph ? '' : `<kbd>${i + 1}</kbd>`}<i>${k === 'drop' ? '📦' : P.icon}</i><span>${N2(P.n)}</span><em>${w || P.cost + ' ' + tr('КО', 'CP', 'ĐCH')}</em></button>`).join('')}<small>${ph ? tr('по прицелу · ✕ — закрыть', 'at the crosshair · ✕ — close', 'theo tâm ngắm') : tr('цель — прицел · ', 'target — crosshair · ', 'mục tiêu — tâm ngắm · ') + keyLabel(kb) + tr(' — закрыть', ' — close', ' — đóng')}</small></div>` : '';
    el.innerHTML = ph ? list + head : list + head;
  },
};
// ---- new powers (strategy sidebar picks them up automatically)
Object.assign(POWERS, {
  drop: { cost: 2, cd: 45, r: 4, icon: '⇩', n: ['Ящик снабжения', 'Supply drop', 'Thả tiếp tế'], d: ['Сброс ящика рядом с вашими силами: патроны, гранаты, ракеты, детали оружия, ремкомплект.', 'Drops a crate near your forces: ammo, grenades, rockets, weapon parts, a repair kit.', 'Thả thùng gần quân ta: đạn, lựu đạn, tên lửa, linh kiện, bộ sửa.'] },
  grad: { cost: 4, cd: 75, r: 18, icon: '⁂', n: ['Удар «Града»', '"Grad" rocket strike', 'Pháo phản lực "Grad"'], d: ['16 ракет по большой площади через 3 секунды — быстрее и шире артудара.', '16 rockets over a wide area after 3 seconds — faster and wider than artillery.', '16 tên lửa phủ rộng sau 3 giây.'] },
});
if (typeof BIND_DEF !== 'undefined' && !BIND_DEF.sup78){
  BIND_DEF.sup78 = 'Digit4';
  BIND_NAMES.sup78 = ['Поддержка: ящик, разведка, «Град», артудар (потом 1–4)', 'Support: crate, recon, "Grad", artillery (then 1–4)', 'Hỗ trợ (rồi 1–4)'];
  if (SET_DEF.bind) SET_DEF.bind.sup78 = 'Digit4';
  if (SET.bind && !SET.bind.sup78) SET.bind.sup78 = 'Digit4';
}
{ const up0 = usePower; usePower = function(team, k, pt, by){ if (k === 'drop' && pt && !podAllowed(team, pt)) return tr('Слишком далеко от ваших сил', 'Too far from your forces', 'Quá xa lực lượng của bạn'); return up0.apply(this, arguments); }; }
{ const ss0 = startStrike;
  startStrike = function(team, k, pt, by, src){
    if (k === 'drop'){ S78.safe(() => S78.airdrop(team, pt, by), 'drop'); return; }
    if (k === 'grad'){
      S.strikes.push({ type: 'arty', team, pos: pt, t: 0, delay: 3, n: 16, every: 0.16, fired: 0, r: 18, dmg: 78, splash: 6, src: src || null, by, grad78: 1 });
      emit('strike', { team, pos: pt, kind: k, by });
      if (team === 1 && !S.attract){ const c = ctrlEntity(); if (c && dist(c.pos, pt) < 130){ feed(tr('ВНИМАНИЕ: «Град» Роя по вашему району!', 'WARNING: Swarm "Grad" incoming on your area!', 'CẢNH BÁO: "Grad" của Bầy Đàn!'), '#f88'); emit('radio', { text: tr('Внимание! Реактивный залп по нашей позиции!', 'Warning! Rocket salvo on our position!', 'Cảnh báo! Loạt tên lửa vào vị trí ta!'), pri: 2 }); } }
      return;
    }
    return ss0.apply(this, arguments);
  }; }
// our AI strategist keeps 4 CP for the player's support calls
{ const ap0 = aiPowers; aiPowers = function(t){ if (t !== 0 || S.attract) return ap0.apply(this, arguments); const T = S.teams[0], keep = min(T.cmd, 4); T.cmd -= keep; try { return ap0.apply(this, arguments); } finally { T.cmd += keep; } }; }
{ const up0 = update; update = function(rdt){ up0(rdt); if (S.paused) return; const dt = clamp(S.time - (S78.lt === null ? S.time : S78.lt), 0, 0.1); S78.lt = S.time; if (dt <= 0 || !S78.on) return; S78.safe(() => S78.stepDrops(dt), 'drops'); S78.safe(() => S78.stepCrates(), 'crates'); S78.safe(() => S78.aiStep(dt), 'ai'); }; }
{ const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); S78.lt = null; S78.strT = 60; S78.safe(() => S78.spawn(), 'spawn'); return r; }; }
if (typeof finishSite === 'function'){ const fs0 = finishSite; finishSite = function(b){ const r = fs0.apply(this, arguments); S78.safe(() => S78.onBuilt(b), 'built'); return r; }; }
{ const ni0 = nearbyInteract;
  nearbyInteract = function(me){
    const h = ni0.apply(this, arguments);
    if (h || !me || me.cls !== 'inf' || !S78.on) return h;
    const k = S78.crateNear(me, 5);
    return k ? { s78: k, text: `${TOUCH.on ? '⏏' : bk('interact')} — ${tr('взять ящик снабжения', 'take the supply crate', 'lấy thùng tiếp tế')}` } : h;
  }; }
{ const in0 = interact;
  interact = function(){
    const me = S.me;
    if (me && me.cls === 'inf' && !S.attract && S.mode === 'fps'){ const h = nearbyInteract(me); if (h && h.s78){ S78.take(h.s78); return; } }
    return in0.apply(this, arguments);
  }; }
if (typeof M67 !== 'undefined' && M67.nearUse){ const nu0 = M67.nearUse; M67.nearUse = function(c){ return nu0.call(this, c) || (c && c.cls === 'inf' && !!S78.crateNear(c, 5)); }; }
{ const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); const m = S78.safe(() => S78.parts(n), 'par'); return m === undefined ? n : m; }; }
{ const gl0 = gatherLights; gatherLights = function(){ const n = gl0.apply(this, arguments); const m = S78.safe(() => S78.lights(n), 'lit'); return m === undefined ? n : m; }; }
{ const do0 = drawOverlay; drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (!S.attract && S.mode === 'fps' && !OPER.on && !(typeof M74 !== 'undefined' && M74.nohud)) S78.safe(() => S78.overlay(), 'ov'); return r; }; }
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); S78.safe(() => S78.render(), 'ui'); }; }
addEventListener('keydown', e => {
  if (e.repeat || MENU.isOpen() || S.attract || S.mode !== 'fps' || !S78.on || !S78.me()) return;
  if (typeof MENU.keyCapture === 'function' && MENU.capturing) return;
  if (e.code === (SET.bind.sup78 || 'Digit4')){ e.preventDefault(); e.stopImmediatePropagation(); S78.open = !S78.open; S78.sig = ''; if (S78.open && typeof HINTS !== 'undefined') HINTS.used('s78sup'); return; }
  if (S78.open && /^Digit[1-4]$/.test(e.code)){ e.preventDefault(); e.stopImmediatePropagation(); S78.call(S78.CALLS[+e.code.slice(5) - 1]); return; }
  if (S78.open && e.code === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); S78.open = false; S78.sig = ''; }
}, true);
(function s78CSS(){
  const st = document.createElement('style');
  st.textContent = `
#s78{position:fixed;right:14px;bottom:128px;z-index:15;display:none;pointer-events:auto;font-family:"Exo 2",sans-serif;text-align:right}
#s78 button{all:unset;cursor:pointer;box-sizing:border-box}
#s78 .hd{display:inline-flex;gap:6px;align-items:center;background:rgba(8,12,16,.72);border:1px solid rgba(214,198,154,.45);border-right:3px solid #9cf;padding:3px 9px;color:#e8dcb8;font:600 12px "Exo 2"}
#s78 .hd b{font-weight:600} #s78 kbd{font-size:10px}
#s78.open .hd{border-color:#9cf}
#s78 .ls{display:flex;flex-direction:column;gap:3px;margin-bottom:4px;align-items:stretch;width:250px;margin-left:auto}
#s78 .ls button{display:flex;gap:7px;align-items:center;background:rgba(8,12,16,.8);border:1px solid rgba(214,198,154,.35);border-left:3px solid #ffb070;padding:4px 8px;color:#f0e8d0;font:600 12.5px "Exo 2"}
#s78 .ls button:hover{border-color:#ffd27a}
#s78 .ls button.off{opacity:.45}
#s78 .ls i{font-style:normal;width:18px;text-align:center} #s78 .ls span{flex:1;text-align:left} #s78 .ls em{font-style:normal;color:#ffd27a;font-size:11px}
#s78 .ls small{color:#b9b19a;font-size:10.5px;text-align:right}
#s78.ph{right:calc(var(--sr, 0px) + 10px);top:calc(var(--st, 0px) + 106px);bottom:auto}
#s78.ph .hd{width:44px;height:44px;border-radius:50%;justify-content:center;flex-direction:column;gap:0;padding:0;border:1.5px solid rgba(214,198,154,.55);background:rgba(10,12,14,.6);font-size:16px;touch-action:manipulation}
#s78.ph .hd b{font-size:9.5px;line-height:1}
#s78.ph .ls{position:absolute;right:52px;top:0;width:210px}
#s78.ph .ls button{padding:7px 9px;font-size:12.5px;touch-action:manipulation}
body.m74nh #s78{display:none!important}
body.rtsm #s78{display:none!important}`;
  document.head.appendChild(st);
})();
