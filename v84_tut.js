// =====================================================================
//  v8.4 — УРОКИ НОВЫХ МЕХАНИК (L84) на движке обучения v7.2 (T72: песочница, шаги с проверкой реального действия,
//  подсказки ПК / телефона, метки в мире, «повторить шаг», выход, итог). Пять коротких уроков по 4–6 шагов:
//   1. «Авиаудары» (v8.1)            — ковровая бомбардировка и напалм: выбрать, повернуть полосу, навести, увидеть
//                                       предупреждение врага, напалм, вызов из боя через «Поддержку» / 📡;
//   2. «Рельеф и озёра» (v8.1)       — лава жжёт, лёд скользит, метан взрывается от огня, ангар — укрытие;
//   3. «Рой: туннели» (v8.2)         — играешь за Рой: Нора-туннель, «Прорыть выход», пыль-предупреждение, отряд в туннель;
//   4. «Консорциум: укрепления» (v8.2) — играешь за Консорциум: барьер, цепочка встык, ремонтный пост, полевой ремонт;
//   5. «Боссы» (v8.3)                — перемотка на 12:00, цех, сборка без ожидания, приказ, слабое место врага, вселение.
//  Каждый шаг можно пропустить (⏭), урок — бросить (✕); пройденные уроки запоминаются (pm_t72done, как и обучения v7.2).
//  Меню: «Обучение» → блок «Уроки новых механик». Хуки — обёртки: T72.start/stepsFor/act/render/finUI/leave,
//  MENU.html_t72/wire, newMatch (фракция урока), TER81.burn, TUN82.done, BOSS83.weakK; DEF72/T72T/CTL72 — дополнены.
// =====================================================================
const A84 = (ru, en) => [ru, en, en, en];
const L84 = {
  cur: null, fac: null, err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('L84 ' + tag, e); } } },
  LES: {
    l84air:  { kind: 'rts', ic: '✈', n: A84('Авиаудары', 'Air strikes'), d: A84('Ковровая бомбардировка и напалм: прицел, поворот полосы, предупреждение врага, вызов из боя', 'Carpet bombing and napalm: aiming, rotating the strip, enemy warning, calling from battle'),
               steps: ['air_pick', 'air_rot', 'air_fire', 'air_warn', 'air_nap', 'air_fps'] },
    l84ter:  { kind: 'fps', ic: '⛰', n: A84('Рельеф и озёра', 'Terrain and lakes'), d: A84('Лава жжёт, лёд скользит, метан взрывается от огня, ангар в скалах — укрытие', 'Lava burns, ice slides, methane explodes from fire, the rock hangar is cover'),
               steps: ['ter_lava', 'ter_ice', 'ter_meth', 'ter_hang'] },
    l84tun:  { kind: 'rts', fac: 1, ic: '⇣', n: A84('Рой: туннели', 'Swarm: tunnels'), d: A84('Играешь за Рой: Нора-туннель, выход до 220 м, пыль-предупреждение, отряды и техника — в туннель', 'You play the Swarm: tunnel burrow, exit up to 220 m, dust warning, squads and vehicles through'),
               steps: ['tun_build', 'tun_built', 'tun_dig', 'tun_open', 'tun_send', 'tun_out'] },
    l84con:  { kind: 'rts', fac: 0, ic: '▥', n: A84('Консорциум: укрепления', 'Consortium: fortifications'), d: A84('Играешь за Консорциум: бетонные барьеры цепочкой, ремонтный пост, полевой ремонт инженерами', 'You play the Consortium: barrier chains, repair post, field repair by builders'),
               steps: ['con_wall', 'con_chain', 'con_rep', 'con_fix', 'con_field'] },
    l84boss: { kind: 'rts', ic: '▣', n: A84('Боссы', 'Bosses'), d: A84('«Бастион» и «Жнец»: с 12:00 (в уроке — перемотка), цех, сборка, приказ, слабые места, вселение', '"Bastion" and "Reaper": from 12:00 (skipped here), plant, assembly, orders, weak spots, possession'),
               steps: ['boss_hall', 'boss_order', 'boss_move', 'boss_weak', 'boss_poss'] },
  },
  ORDER: ['l84air', 'l84ter', 'l84tun', 'l84con', 'l84boss'],
  is(id){ return !!(id && this.LES[id]); },
  on(){ return typeof T72 !== 'undefined' && T72.on && this.is(T72.id); },
  ph(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  start(id){
    const L = this.LES[id]; if (!L) return false;
    const base = (this.ph() ? 'ph_' : 'pc_') + L.kind;
    this.fac = L.fac !== undefined ? L.fac : (SET.fac76 | 0);
    let ok;
    try { ok = L84.start0.call(T72, base); } finally { this.fac = null; }
    if (ok === false) return false;
    T72.leave();
    T72.id = id; this.cur = id; T72.steps = T72.stepsFor(id); T72.i = 0; T72.sig = '';
    T72.enter();
    return true;
  },
  // ---- помощники мира
  me(){ return ctrlEntity(); },
  toward(from, to, m){ const d = norm(from), t = tangent(sub(norm(to), d), d); return offsetOnSphere(d, len(t) > 1e-4 ? norm(t) : anyTangent(d), m); },
  foeDir(){ return S.hq[1] ? norm(S.hq[1].pos) : BASES[1]; },
  // точка для здания: от базы в сторону врага, перебором (siteProblem — те же правила, что у игрока)
  siteFor(type, from, m0){
    from = from || BASES[0];
    const t1 = norm(tangent(sub(this.foeDir(), from), from)), t2 = norm(cross(from, t1));
    for (const m of [m0 || 46, (m0 || 46) + 14, (m0 || 46) - 12, (m0 || 46) + 28])
      for (const a of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]){
        const d = offsetOnSphere(from, norm(add(mul(t1, cos(a)), mul(t2, sin(a)))), m);
        if (!siteProblem(0, type, d)) return d;
      }
    return null;
  },
  gp(dir, lift){ return dir ? mul(dir, groundR(dir) + (lift || 0.6)) : null; },
  newOf(type, nid){ let b = null; for (const x of S.buildings) if (x.alive && x.team === 0 && x.type === type && x.id >= nid && (!b || x.id > b.id)) b = x; return b; },
  rush(b, dt, k){ if (b && b.alive && !b.done){ b.built = min(1, b.built + dt / (k || 3)); b.hp = max(b.hp, b.maxhp * (0.15 + 0.85 * b.built)); if (b.built >= 1) finishSite(b); } },
  mk(label, col){ return label; },
  tp(dir, look){
    const c = this.me(); if (!c || !dir) return;
    const p = surfacePoint(dir, (typeof RULES !== 'undefined' && RULES.RAD) || 0.6);
    c.pos = p; c.vel = [0, 0, 0]; c.up = norm(p);
    if (look){ const f = tangent(sub(look, p), c.up); if (len(f) > 1e-3){ c.fwd = norm(f); c.aim = c.fwd; } }
    if (c.jet) c.energy = c.jet.emax;
  },
  lake(kind){ const c = this.me(), at = c ? c.pos : mul(BASES[0], RM); return TER81.LAKES.filter(l => l.kind === kind).sort((a, b) => surfDist(a.c, at) - surfDist(b.c, at))[0] || null; },
  powers(){ const T = S.teams[0]; T.cmd = max(T.cmd || 0, 30); T.powCd = T.powCd || {}; T.powCd.carpet = 0; T.powCd.napalm = 0; },
  newStrike(T, k){ return AIR81.L.find(s => s.team === 0 && s.k === k && !T.seen84.has(s)); },
  bossK(t){ return BOSS83.kindOf(t); },
  phEl(k){ const sv = $('side'), open = sv && sv.offsetWidth && getComputedStyle(sv).display !== 'none' && !document.body.classList.contains('p64min'); if (typeof M67 !== 'undefined' && M67.open) return [{ sel: '#m67sheet [data-r="tab:cmd"]' }, { sel: '[data-r="tab:cmd"]' }]; if (SIDE.tab === 'cmd' && open) return [{ sel: `#side [data-ux="power:${k}"]` }]; return [{ sel: '#touch .tt .m67m' }]; },
};
L84.start0 = T72.start;
// ---------------------------------------------------------------- шаги: что считается выполнением
const W84 = { tgt: A84('ЦЕЛЬ', 'TARGET'), foe: A84('УДАР ВРАГА', 'ENEMY STRIKE'), lava: A84('ЛАВА', 'LAVA'), ice: A84('ЛЁД', 'ICE'), meth: A84('МЕТАН', 'METHANE'), hang: A84('АНГАР', 'HANGAR'),
  site: A84('СТРОЙ ЗДЕСЬ', 'BUILD HERE'), exit: A84('ВЫХОД', 'EXIT'), bur: A84('НОРА', 'BURROW'), tank: A84('ТАНК', 'TANK'), post: A84('ПОСТ', 'POST'), weak: A84('СЛАБОЕ МЕСТО', 'WEAK SPOT'),
  go: A84('СЮДА', 'HERE'), boss: A84('БОСС', 'BOSS'), next: A84('ВСТЫК', 'NEXT TO IT') };
const mk84 = (p, w, col) => p ? { p, label: L72(w), col: col || '#ffd23f' } : null;
const D84 = {
  // ---------------- 1. Авиаудары
  air_pick: { mode: 'rts', init(T){ L84.powers(); S.cast = null; T.goal = L84.gp(L84.toward(BASES[0], L84.foeDir(), 105), 0.3); T.seen84 = new Set(AIR81.L); },
    check: () => !!S.cast && S.cast.kind === 'power' && S.cast.key === 'carpet', mark: T => [mk84(T.goal, W84.tgt, '#ffb070')].filter(Boolean) },
  air_rot: { mode: 'rts', init(T){ T.ref = AIR84.rotN; T.goal = T.goal || L84.gp(L84.toward(BASES[0], L84.foeDir(), 105), 0.3); },
    tick(){ if (!S.cast && powerLeft(0, 'carpet') <= 0){ L84.powers(); S.cast = { kind: 'power', key: 'carpet' }; } },
    check: T => AIR84.rotN > T.ref, mark: T => [mk84(T.goal, W84.tgt, '#ffb070')].filter(Boolean) },
  air_fire: { mode: 'rts', init(T){ T.seen84 = new Set(AIR81.L); T.goal = T.goal || L84.gp(L84.toward(BASES[0], L84.foeDir(), 105), 0.3); },
    tick(T){ if (!S.cast && !L84.newStrike(T, 'carpet')){ L84.powers(); S.cast = { kind: 'power', key: 'carpet' }; } },
    check: T => !!L84.newStrike(T, 'carpet'), mark: T => [mk84(T.goal, W84.tgt, '#ffb070')].filter(Boolean) },
  air_warn: { mode: 'rts', init(T){ S.cast = null; const d = L84.toward(BASES[0], L84.foeDir(), 70), p = L84.gp(d, 0.2); T.goal = p; T.ws = null;
      if (p){ AIR81.nextDir = norm(tangent(anyTangent(d), d)); try { T.ws = AIR81.start(1, 'carpet', p, 'ai', null); } finally { AIR81.nextDir = null; } flyCamTo(p); } },
    check: T => !!T.ws && T.ws.t > T.ws.end - 0.2 && S.rtime - T.t0 > 4, prog: T => T.ws ? clamp(T.ws.t / T.ws.end, 0, 1) : 0, mark: T => T.ws && T.ws.t < T.ws.delay ? [mk84(T.goal, W84.foe, '#ff4a3a')] : [] },
  air_nap: { mode: 'rts', init(T){ L84.powers(); S.cast = null; T.seen84 = new Set(AIR81.L); T.goal = L84.gp(L84.toward(BASES[0], L84.foeDir(), 90), 0.3); },
    check: T => !!L84.newStrike(T, 'napalm'), mark: T => [mk84(T.goal, W84.tgt, '#ffb070')].filter(Boolean) },
  air_fps: { mode: 'fps', init(T){ L84.powers(); const c = S78.stats.calls; T.ref = (c.carpet || 0) + (c.napalm || 0); },
    tick(){ const T0 = S.teams[0]; if (T0.cmd < 8) L84.powers(); },
    check: T => { const c = S78.stats.calls; return (c.carpet || 0) + (c.napalm || 0) > T.ref; } },
  // ---------------- 2. Рельеф и озёра (шутер; переносим бойца к месту)
  ter_lava: { mode: 'fps', init(T){ const L = T.L = L84.lake('lava'); if (!L) return; const c = L84.me(), a = c ? L84.toward(L.c, c.pos, 1) : null, dir = a ? norm(tangent(sub(a, L.c), L.c)) : anyTangent(L.c);
      L84.tp(offsetOnSphere(L.c, dir, L.R + 12), mul(L.c, RM)); T.goal = L84.gp(offsetOnSphere(L.c, dir, L.R * 0.72), 0.2); },
    check: T => T.since('lava84') || !T.L, mark: T => [mk84(T.goal, W84.lava, '#ff8a50')].filter(Boolean) },
  ter_ice: { mode: 'fps', init(T){ const L = T.L = L84.lake('ice'); T.acc = 0; if (!L) return; const c = L84.me(), dir = c ? norm(tangent(sub(norm(c.pos), L.c), L.c)) : anyTangent(L.c);
      const D = len(dir) > 1e-3 ? dir : anyTangent(L.c); L84.tp(offsetOnSphere(L.c, D, L.R + 8), mul(L.c, RM)); T.goal = L84.gp(offsetOnSphere(L.c, D, L.R * 0.4), 0.2); },
    check(T, dt){ const c = L84.me(); if (!T.L) return true; const lk = c && TER81.lakeAt(c.pos); if (lk && lk.kind === 'ice' && len(c.vel) > 2.5) T.acc += dt; return T.acc > 1.6; },
    prog: T => T.acc / 1.6, mark: T => T.acc > 0 ? [] : [mk84(T.goal, W84.ice, '#9fdcff')].filter(Boolean) },
  ter_meth: { mode: 'fps', init(T){ const L = T.L = L84.lake('meth'); TER81.meth = [1, 1]; TER81.methT = [0, 0]; T.ref = TER81.stats.methBoom; if (!L) return;
      const c = L84.me(), dir = c ? norm(tangent(sub(norm(c.pos), L.c), L.c)) : anyTangent(L.c), D = len(dir) > 1e-3 ? dir : anyTangent(L.c);
      L84.tp(offsetOnSphere(L.c, D, L.R + 16), mul(L.c, L.L + 3)); T.goal = mul(L.c, L.L + 3);
      if (c){ c.rocketCd = 0; } const K = typeof G62 !== 'undefined' ? G62.kit() : null; if (K){ K.gren = G62.MAX; K.grenCd = 0; G62.btnSig = ''; } },
    tick(){ const c = L84.me(); if (c && c.rocketCd > 1.5) c.rocketCd = 1.5; },
    check: T => !T.L || TER81.stats.methBoom > T.ref, mark: T => [mk84(T.goal, W84.meth, '#c8ff6a')].filter(Boolean) },
  ter_hang: { mode: 'fps', init(T){ const c = L84.me(); const H = T.H = TER81.HANG.slice().sort((a, b) => dist(a.O, c ? c.pos : a.O) - dist(b.O, c ? c.pos : b.O))[0]; T.acc = 0; if (!H) return;
      const out = norm(tangent(mul(H.Fw, -1), norm(H.O))); L84.tp(offsetOnSphere(norm(H.O), out, 18), add(H.O, mul(H.Fw, 6))); T.goal = add(add(H.O, mul(H.Fw, 9)), mul(H.U, 1.2)); },
    check(T, dt){ const c = L84.me(); if (!T.H) return true; T.acc = c && TER81.inHangar(c.pos) ? T.acc + dt : 0; return T.acc > 1; },
    prog: T => T.acc, mark: T => [mk84(T.goal, W84.hang, '#8fffaa')].filter(Boolean) },
  // ---------------- 3. Рой: туннели
  tun_build: { mode: 'rts', init(T){ S.teams[0].ore = max(S.teams[0].ore, 3000); T.nid = NID; if (SIDE.tab !== 'build'){ SIDE.tab = 'build'; buildSidebar(); } T.goal = L84.gp(L84.siteFor('tun82', BASES[0], 52)); },
    check: T => !!L84.newOf('tun82', T.nid), mark: T => [mk84(T.goal, W84.site)].filter(Boolean) },
  tun_built: { mode: 'rts', init(T){ T.b = L84.newOf('tun82', 0); }, tick(T, dt){ L84.rush(T.b, dt, 3); },
    check: T => !!T.b && T.b.done, prog: T => T.b ? T.b.built : 0, mark: T => T.b ? [mk84(add(T.b.pos, mul(T.b.up, (T.b.H || 3) + 2)), W84.bur, '#9fdcff')] : [] },
  tun_dig: { mode: 'rts', init(T){ S.teams[0].ore = max(S.teams[0].ore, 1500); T.b = TUN82.list(0).filter(b => b.done).pop() || null; T.goal = null;
      if (T.b){ const m = TUN82.mouthDir(T.b), f = L84.foeDir(), t1 = norm(tangent(sub(f, m), m)), t2 = norm(cross(m, t1));
        for (const L of [120, 100, 140, 80, 160]) { for (const a of [0, 0.4, -0.4, 0.9, -0.9]){ const d = offsetOnSphere(m, norm(add(mul(t1, cos(a)), mul(t2, sin(a)))), L); if (!TUN82.exitProblem(T.b, d)){ T.goal = L84.gp(d, 0.4); break; } } if (T.goal) break; } } },
    check: T => !!T.b && TUN82.st(T.b).st !== 'idle', mark: T => T.b && !(S.cast && S.cast.kind === 'tun82') ? [mk84(add(T.b.pos, mul(T.b.up, (T.b.H || 3) + 2)), W84.bur, '#9fdcff')] : [mk84(T.goal, W84.exit, '#ff8a50')].filter(Boolean) },
  tun_open: { mode: 'rts', init(T){ T.b = TUN82.list(0).find(b => TUN82.st(b).st !== 'idle') || null; const s = T.b && TUN82.st(T.b); T.goal = s && s.exitDir ? L84.gp(s.exitDir, 1) : null; if (T.goal) flyCamTo(T.goal); },
    tick(T, dt){ const b = T.b; if (b && b.queue[0] === 'tdig82') b.prodT += dt * 2.2; },   // в уроке подкоп втрое быстрее (пыль за 10 с — видна)
    check: T => !!T.b && TUN82.isOpen(T.b), prog: T => T.b && T.b.queue[0] === 'tdig82' ? T.b.prodT / pTime(0, 'tdig82') : T.b && TUN82.isOpen(T.b) ? 1 : 0, mark: T => [mk84(T.goal, W84.exit, '#ff8a50')].filter(Boolean) },
  tun_send: { mode: 'rts', init(T){ T.b = TUN82.list(0).find(b => TUN82.isOpen(b)) || null; T.ref = TUN82.stats.sent + TUN84.stats.sent; S.sel.clear(); S.selB = null; },
    check: T => TUN82.stats.sent + TUN84.stats.sent > T.ref, mark: T => T.b ? [mk84(add(T.b.pos, mul(T.b.up, (T.b.H || 3) + 2)), W84.bur, '#9fdcff')] : [] },
  tun_out: { mode: 'rts', init(T){ T.b = TUN82.list(0).find(b => TUN82.isOpen(b)) || null; const x = T.b && TUN82.exitOf(T.b); T.goal = x ? add(x.pos, mul(x.up, 3)) : null; T.ref = TUN84.stats.through; },
    check: T => T.since('tunout84') || TUN84.stats.through > T.ref, mark: T => [mk84(T.goal, W84.exit, '#8fffaa')].filter(Boolean) },
  // ---------------- 4. Консорциум: укрепления
  con_wall: { mode: 'rts', init(T){ S.teams[0].ore = max(S.teams[0].ore, 3000); T.nid = NID; L84.wnid = NID; if (SIDE.tab !== 'build'){ SIDE.tab = 'build'; buildSidebar(); } T.goal = L84.gp(L84.siteFor('wall82', BASES[0], 58)); },
    check: T => !!L84.newOf('wall82', T.nid), mark: T => [mk84(T.goal, W84.site)].filter(Boolean) },
  con_chain: { mode: 'rts', init(T){ T.first = S.buildings.find(b => b.alive && b.type === 'wall82' && b.team === 0 && b.id >= (L84.wnid || 0)) || null; T.goal = T.first ? L84.gp(offsetOnSphere(T.first.up, T.first.R, CON82.PITCH), 0.5) : null; },
    tick(T, dt){ for (const b of S.buildings) if (b.alive && b.team === 0 && b.type === 'wall82' && !b.done) L84.rush(b, dt, 1.5); },
    check: T => { if (!T.first) return true; const c = V84.chains().get(T.first); return !!c && c.n >= 2; }, mark: T => [mk84(T.goal, W84.next)].filter(Boolean) },
  con_rep: { mode: 'rts', init(T){ S.teams[0].ore = max(S.teams[0].ore, 3000); T.nid = NID; T.goal = L84.gp(L84.siteFor('rep82', BASES[0], 36)); },
    tick(T, dt){ for (const b of S.buildings) if (b.alive && b.team === 0 && (b.type === 'wall82' || b.type === 'rep82') && !b.done) L84.rush(b, dt, 2); },
    check: T => { const b = L84.newOf('rep82', T.nid); return !!b && b.done; }, mark: T => L84.newOf('rep82', T.nid) ? [] : [mk84(T.goal, W84.site)].filter(Boolean) },
  con_fix: { mode: 'rts', init(T){ const p = FAC82.mine('rep82', 0).find(b => b.done) || null; T.post = p;
      let v = S.vehicles.find(x => x.alive && x.team === 0 && !x.boss83 && x.cls === 'tank');
      const at = p ? offsetOnSphere(p.up, norm(tangent(sub(L84.foeDir(), p.up), p.up)), 44) : L84.toward(BASES[0], L84.foeDir(), 60);
      if (!v) v = makeTank(surfacePoint(at, 1.5), 0); else { v.pos = surfacePoint(at, v.rad || 1.4); v.vel = [0, 0, 0]; }
      v.hp = v.maxhp * 0.35; v.lastHurt = S.time; setOrder(v, 'hold', v.pos, { lock: 30 }); v.manualUntil = 0; T.v = v; L84.fixV = v; S.sel.clear(); S.selB = null;
      for (const b of S.builders) if (b.alive && b.team === 0 && dist(b.pos, v.pos) < 90){ b.pos = surfacePoint(BASES[0], 0.9); b.order = 'idle'; b.site = null; } },
    tick(T){ const v = T.v; if (v && v.alive && v.manualUntil < S.time && v.hp > v.maxhp * 0.4) v.hp = v.maxhp * 0.4; },
    check: T => !T.v || !T.v.alive || (T.v.hp >= T.v.maxhp * 0.9 && T.v.manualUntil > S.time), prog: T => T.v ? T.v.hp / T.v.maxhp : 0,
    mark: T => { const v = T.v; if (!v || !v.alive) return []; if (v.manualUntil > S.time && T.post) return [mk84(add(T.post.pos, mul(T.post.up, 4)), W84.post, '#8fffaa')]; return [mk84(add(v.pos, mul(v.up, 3)), W84.tank, '#ffb070')]; } },
  con_field: { mode: 'rts', init(T){ const v = T.v = L84.fixV && L84.fixV.alive ? L84.fixV : S.vehicles.find(x => x.alive && x.team === 0 && x.cls === 'tank'); T.ref = CON82.stats.field;
      if (v){ const far = FAC82.mine('rep82', 0)[0]; const at = far ? offsetOnSphere(far.up, norm(tangent(sub(BASES[0], far.up), far.up)), -60) : null; if (at && !siteProblem(0, 'wall82', at)) { v.pos = surfacePoint(at, v.rad || 1.4); }
        v.hp = v.maxhp * 0.45; v.lastHurt = S.time - 3; setOrder(v, 'hold', v.pos, { lock: 60 });
        const b = teamBuilders(0)[0]; if (b){ b.pos = surfacePoint(offsetOnSphere(norm(v.pos), anyTangent(norm(v.pos)), 22), 0.9); b.order = 'idle'; b.site = null; b.auto = false; } } },
    check: T => !T.v || !T.v.alive || ((CON82.stats.field > T.ref || S.builders.some(b => b.alive && b.team === 0 && b.site === T.v && b.order === 'repair')) && T.v.hp >= T.v.maxhp * 0.6), prog: T => T.v ? (T.v.hp / T.v.maxhp - 0.45) / 0.15 : 0,
    mark: T => T.v && T.v.alive ? [mk84(add(T.v.pos, mul(T.v.up, 3)), W84.tank, '#ffb070')] : [] },
  // ---------------- 5. Боссы
  boss_hall: { mode: 'rts', init(T){ S.time = max(S.time, BOSS83.UNLOCK + 5); S.teams[0].ore = max(S.teams[0].ore, 6000); T.nid = NID;
      if (!FAC82.mine('factory', 0).some(b => b.done)){ const d = L84.siteFor('factory', BASES[0], 40); if (d){ const f = makeBuilding('factory', 0, d); finishSite(f); } }
      if (SIDE.tab !== 'build'){ SIDE.tab = 'build'; buildSidebar(); }
      const k = BOSS83.K[L84.bossK(0)]; T.goal = L84.gp(BOSS83.site ? BOSS83.site(0, k.bld) : L84.siteFor(k.bld, BASES[0], 60)); },
    check: T => !!L84.newOf(BOSS83.K[L84.bossK(0)].bld, T.nid), mark: T => [mk84(T.goal, W84.site)].filter(Boolean) },
  boss_order: { mode: 'rts', init(T){ T.b = L84.newOf(BOSS83.K[L84.bossK(0)].bld, 0); S.teams[0].ore = max(S.teams[0].ore, 4000); },
    tick(T, dt){ const b = T.b; L84.rush(b, dt, 2); if (b && b.done && b.queue[0] === BOSS83.K[L84.bossK(0)].key) b.prodT += dt * 30; },
    check: () => BOSS83.list(0).length > 0, prog: T => T.b ? (T.b.done ? 0.5 + (T.b.queue.length ? 0.5 * T.b.prodT / pTime(0, T.b.queue[0]) : 0) : 0.5 * T.b.built) : 0,
    mark: T => T.b ? [mk84(add(T.b.pos, mul(T.b.up, (T.b.H || 8) + 2)), A84(T.b.done ? 'ЗАКАЖИ' : 'СТРОИТСЯ', T.b.done ? 'ORDER' : 'BUILDING'), '#9fdcff')] : [] },
  boss_move: { mode: 'rts', init(T){ T.v = BOSS83.list(0)[0] || null; if (T.v){ T.v.manualUntil = 0; T.goal = L84.gp(L84.toward(T.v.pos, L84.foeDir(), 40), 0.5); flyCamTo(T.v.pos); } },
    check: T => !T.v || (T.v.goal && T.goal && dist(T.v.goal, T.goal) < 26 && T.v.manualUntil > S.time),
    mark: T => { if (!T.v) return []; const sel = S.sel.has(T.v); return [sel ? mk84(T.goal, W84.go) : mk84(add(T.v.pos, mul(T.v.up, 9)), W84.boss, '#9fdcff')].filter(Boolean); } },
  boss_weak: { mode: 'fps', init(T){ T.eb = null; },
    tick(T){
      const c = L84.me(); if (!c) return;
      if (!T.eb || !T.eb.alive){
        const k = L84.bossK(1), f = norm(tangent(c.fwd || anyTangent(c.up), c.up)), d = offsetOnSphere(norm(c.pos), f, 34);
        const site = { team: 1, pos: surfacePoint(d, 0), fwd: norm(tangent(mul(f, -1), d)), rad: -13, R: norm(cross(d, f)) };
        T.eb = BOSS83.spawn(site, k); T.eb.t84 = 1; L84.eb = T.eb; T.ep = T.eb.pos.slice(); T.ef = tangent(sub(c.pos, T.eb.pos), T.eb.up); T.eb.fwd = norm(T.ef); T.eb.aim = T.eb.fwd;
      }
      const v = T.eb; v.pos = T.ep.slice(); v.vel = [0, 0, 0]; v.fwd = norm(T.ef); v.cd = max(v.cd || 0, 2); v.st83 = 2; v.rk83 = 6; v.bm83 = null; v.target = null; v.manualUntil = 1e9;
      if (v.mg83) for (const M of v.mg83){ M.cd = 2; M.tgt = null; } if (v.hp < v.maxhp * 0.5) v.hp = v.maxhp * 0.5; v.seen[0] = 99;
    },
    check: T => T.since('weak84'),
    mark: T => { const v = T.eb; if (!v || !v.alive) return []; const p = v.boss83 === 'c' ? add(add(v.pos, mul(v.up, 2.4)), mul(v.fwd, -7)) : add(v.pos, mul(v.up, 5.1)); return [mk84(p, W84.weak, '#ff5a4a')]; },
    leave(){ const v = L84.eb; if (v && v.alive){ v.alive = false; S.vehicles = S.vehicles.filter(x => x !== v); S.sel.delete(v); } L84.eb = null; } },
  boss_poss: { init(T){ T.v = BOSS83.list(0)[0] || null; },
    check: T => { const c = L84.me(); return !T.v || (!!c && !!c.boss83 && c.team === 0); }, mark: T => T.v && S.mode === 'rts' ? [mk84(add(T.v.pos, mul(T.v.up, 9)), W84.boss, '#9fdcff')] : [] },
};
Object.assign(DEF72, D84);
T72N.l84air = L84.LES.l84air.n; T72N.l84ter = L84.LES.l84ter.n; T72N.l84tun = L84.LES.l84tun.n; T72N.l84con = L84.LES.l84con.n; T72N.l84boss = L84.LES.l84boss.n;
Object.assign(T72T, {
  air_pick: A84('Ковровая бомбардировка', 'Carpet bombing'), air_rot: A84('Поверни полосу', 'Rotate the strip'), air_fire: A84('Наведи удар', 'Aim the strike'),
  air_warn: A84('Удар врага: предупреждение', 'Enemy strike: warning'), air_nap: A84('Напалм', 'Napalm'), air_fps: A84('Вызов из боя', 'Call from battle'),
  ter_lava: A84('Лава жжёт', 'Lava burns'), ter_ice: A84('Лёд скользит', 'Ice slides'), ter_meth: A84('Метан взрывается', 'Methane explodes'), ter_hang: A84('Ангар — укрытие', 'The hangar is cover'),
  tun_build: A84('Нора-туннель', 'Tunnel burrow'), tun_built: A84('Нора строится', 'Burrow under construction'), tun_dig: A84('Прорыть выход', 'Dig the exit'),
  tun_open: A84('Подкоп: враг слышит', 'Digging: the enemy hears it'), tun_send: A84('Отряд — в туннель', 'Squad into the tunnel'), tun_out: A84('Выход на другом конце', 'Out at the other end'),
  con_wall: A84('Бетонный барьер', 'Concrete barrier'), con_chain: A84('Цепочка встык', 'Chain them up'), con_rep: A84('Ремонтный пост', 'Repair post'),
  con_fix: A84('Танк — на ремонт', 'Tank to the repair post'), con_field: A84('Полевой ремонт', 'Field repair'),
  boss_hall: A84('Цех босса', 'Boss plant'), boss_order: A84('Сборка босса', 'Assembling the boss'), boss_move: A84('Приказ боссу', 'Order the boss'),
  boss_weak: A84('Слабое место', 'Weak spot'), boss_poss: A84('Вселиться в босса', 'Possess the boss'),
});
for (const k of ['air_pick', 'air_fire', 'air_nap', 'tun_build', 'tun_built', 'tun_dig', 'tun_send', 'con_wall', 'con_chain', 'con_rep', 'con_fix', 'con_field', 'boss_hall', 'boss_order', 'boss_move']) T72FLY.add(k);
// ---------------------------------------------------------------- как сделать: ПК и телефон (во все схемы управления)
{
  const BN = () => { const k = BOSS83.kindOf(0); return k === 'c' ? ['«Сборочный цех»', '«Бастион»', 'корма «Бастиона»'] : ['«Инкубатор»', '«Жнец»', 'ядро под брюхом «Жнеца»']; };
  const BNe = () => { const k = BOSS83.kindOf(1); return k === 'c' ? A84('Слабое место «Бастиона» — корма (двигатель): зайди сзади, урон ×1.8. Он медленно разворачивается!', 'The Bastion\'s weak spot is the rear (engine): get behind it, ×1.8 damage. It turns slowly!') : A84('Слабое место «Жнеца» — светящееся ядро под брюхом: стреляй снизу (подлети ранцем под корпус), урон ×1.8–2.', 'The Reaper\'s weak spot is the glowing core under the belly: shoot from below, ×1.8–2 damage.'); };
  const sup = () => { try { return keyLabel(SET.bind.sup78 || 'Digit4'); } catch (e){ return '4'; } };
  const PC = {
    air_pick: { keys: () => ['F4'], el: () => SIDE.tab === 'cmd' ? [{ sel: '#side [data-ux="power:carpet"]' }] : [{ sel: '#side .tabs [data-tab="cmd"]' }], h: A84('Открой вкладку «Удары» (F4) справа и нажми «✈ Ковровая бомбардировка» (5 КО). Жёлтая полоса — где лягут 10 бомб.', 'Open the "Powers" tab (F4) on the right and press "✈ Carpet bombing" (5 CP). The yellow strip is where 10 bombs will fall.') },
    air_rot: { keys: () => ['R'], mouse: 'wheel', h: A84('Поверни полосу: колесо мыши или R (Shift+R — обратно). Заход бомбардировщика — по стрелке.', 'Rotate the strip: mouse wheel or R (Shift+R back). The bomber flies along the arrow.') },
    air_fire: { mouse: 'lmb', h: A84('ЛКМ по метке «ЦЕЛЬ» — удар через 3.5 с. Можно зажать ЛКМ и протянуть — так задаётся направление захода. ПКМ — отмена.', 'LMB on the "TARGET" marker — impact in 3.5 s. Or hold LMB and drag to set the run direction. RMB cancels.') },
    air_warn: { h: A84('Так выглядит удар врага: красная полоса, лазеры на концах и отсчёт ✈. В бою — сирена и «ВОЗДУХ!». Не стой на полосе — уведи отряды в сторону.', 'This is an enemy strike: a red strip, lasers at the ends and a ✈ countdown. In battle — a siren and "AIR RAID!". Get off the strip.') },
    air_nap: { mouse: 'lmb', el: () => S.cast ? [] : SIDE.tab === 'cmd' ? [{ sel: '#side [data-ux="power:napalm"]' }] : [{ sel: '#side .tabs [data-tab="cmd"]' }], h: A84('«Удары» → «♨ Напалм» (3 КО) → ЛКМ по метке. Огонь горит 9 с: жжёт пехоту, слабее — технику и здания, поджигает метан.', '"Powers" → "♨ Napalm" (3 CP) → LMB on the marker. Burns 9 s: infantry fully, vehicles and buildings less; ignites methane.') },
    air_fps: { keys: () => [sup(), '5', '6'], h: A84(`В бою: ${sup()} — «Поддержка», потом 5 (бомбардировка) или 6 (напалм). Удар ляжет туда, куда смотришь (не ближе 14 м).`, `In battle: ${sup()} — "Support", then 5 (bombing) or 6 (napalm). It lands where you look (not closer than 14 m).`) },
    ter_lava: { keys: () => ['W'], h: A84('Ты у лавового озера. Ступи на край лавы у метки — почувствуешь жар (в бою лава жжёт пехоту и танки) — и сразу назад. ИИ лаву объезжает.', 'You are at a lava lake. Step onto its edge at the marker — feel the heat (in battle lava burns infantry and tanks) — and step back. The AI drives around it.') },
    ter_ice: { keys: () => ['W', 'S'], h: A84('Лёд: разгонись по озеру и попробуй остановиться — заносит, тормозить трудно. Технику тоже.', 'Ice: run across the lake and try to stop — you slide, braking is hard. Vehicles too.') },
    ter_meth: { keys: () => [bk('rocket'), bk('grenade')], h: A84(`Над метановым озером — туман. Огонь и взрывы его поджигают: ракета (${bk('rocket')}) или граната (${bk('grenade')}) в туман у метки. Через 90 с туман снова копится.`, `Methane fog hangs over the lake. Fire and blasts ignite it: a rocket (${bk('rocket')}) or a grenade (${bk('grenade')}) into the fog. It builds up again in 90 s.`) },
    ter_hang: { keys: () => ['W'], h: A84('Ангар в столовой горе — укрытие: взрывы снаружи бьют внутрь втрое слабее, метеоритный дождь не достаёт. Зайди внутрь. В стратегии приказ «идти» в ангар ведёт на его пол.', 'The hangar in the mesa is cover: blasts from outside do a third of the damage inside, meteors can\'t reach. Walk in. In strategy a move order into it targets the floor.') },
    tun_build: { mouse: 'lmb', h: A84('Ты — Рой. Выдели инженера → вкладка «Стройка» (F1) → «Нора-туннель» → ЛКМ у метки (на своей территории).', 'You are the Swarm. Select a builder → "Build" tab (F1) → "Tunnel burrow" → LMB at the marker (on your own ground).') },
    tun_built: { h: A84('Нора строится (в уроке — быстро). Впереди у неё зев — вход в туннель.', 'The burrow is going up (fast in the lesson). The mouth in front of it is the tunnel entrance.') },
    tun_dig: { mouse: 'lmb', h: A84('Кликни по норе → «⛏ Прорыть выход» → ЛКМ по метке «ВЫХОД» (до 220 м от норы; не у штаба и не в скалах).', 'Click the burrow → "⛏ Dig the exit" → LMB on the "EXIT" marker (up to 220 m; not near an HQ or rocks).') },
    tun_open: { h: A84('Подкоп идёт (в уроке — быстрее). За 10 с до прорыва у выхода пыль, дрожь и гул — враг предупреждён и может встретить. Выбирай место, где не ждут.', 'Digging (faster in the lesson). 10 s before breakthrough there is dust, tremor and rumble at the exit — the enemy is warned. Pick a place they don\'t expect.') },
    tun_send: { mouse: 'rmb', h: A84('Выдели отряд (или лёгкую технику: Шакал, Молот, Град) → «⇣ В туннель» в карточке внизу, или ПКМ по норе. Ещё: в панели норы «Отряды — в туннель».', 'Select a squad (or light vehicles: Jackal, Hammer, Grad) → "⇣ Into tunnel" on the card, or RMB the burrow. Or "Squads into the tunnel" in the burrow panel.') },
    tun_out: { h: A84('Бойцы ныряют в зев, ~2.5 с под землёй (невидимы и неуязвимы) и выходят у выхода. Разрушат «Выход туннеля» — обвал; нору — обвалится всё.', 'Troopers dive in, ~2.5 s underground (invisible, invulnerable), and come out at the exit. Lose the "Tunnel exit" — collapse; lose the burrow — everything collapses.') },
    con_wall: { mouse: 'lmb', h: A84('Ты — Консорциум. Инженер → «Стройка» (F1) → «Бетонный барьер» → ЛКМ у метки. Секция сама встанет поперёк направления на врага.', 'You are the Consortium. Builder → "Build" (F1) → "Concrete barrier" → LMB at the marker. The section faces the enemy by itself.') },
    con_chain: { mouse: 'lmb', h: A84('Вторую секцию поставь у метки «ВСТЫК» — она прилипнет к первой (Shift+ЛКМ — несколько подряд). Стена держит пули, снаряды и технику; ИИ её объезжает.', 'Place the second section at the "NEXT TO IT" marker — it snaps to the first (Shift+LMB for several). The wall stops bullets, shells and vehicles.') },
    con_rep: { mouse: 'lmb', h: A84('«Стройка» → «Ремонтный пост» → ЛКМ у метки. Пост чинит технику, здания и пехоту в 26 м — ставь за барьерами у фронта.', '"Build" → "Repair post" → LMB at the marker. It repairs vehicles, buildings and infantry within 26 m — put it behind the barriers.') },
    con_fix: { mouse: 'rmb', h: A84('Танк побит (35 %). Выдели его (ЛКМ) и ПКМ рядом с ремонтным постом — зелёные лучи чинят его.', 'The tank is damaged (35 %). Select it (LMB) and RMB next to the repair post — green beams fix it.') },
    con_field: { h: A84('Полевой ремонт: свободные инженеры Консорциума сами берутся за побитую технику в 70 м и здания в 80 м — и чинят в 1.3 раза быстрее. Просто смотри.', 'Field repair: idle Consortium builders take on damaged vehicles within 70 m and buildings within 80 m by themselves — 1.3× faster. Just watch.') },
    boss_hall: { mouse: 'lmb', h: () => A84(`Боссы открываются с 12:00 боя (в уроке время перемотано, руды хватит). Нужен мехзавод — он уже стоит. Инженер → «Стройка» → ${BN()[0]} → ЛКМ у метки.`, `Bosses unlock at 12:00 (time is skipped here). A factory is required — it is already built. Builder → "Build" → the boss plant → LMB at the marker.`) },
    boss_order: { mouse: 'lmb', h: () => A84(`Цех строится. Потом кликни по нему → закажи ${BN()[1]} (в уроке — без ожидания; в бою ~100 с). Один на армию; противник слышит по радио.`, `The plant is going up. Then click it → order the boss (instant in the lesson; ~100 s in battle). One per army; the enemy gets a radio warning.`) },
    boss_move: { mouse: 'rmb', h: () => A84(`${BN()[1]}: огромная прочность (полоска вверху), очень медленный, медленно разворачивается. Выдели его (ЛКМ) и ПКМ по метке «СЮДА».`, 'Huge hull (bar at the top), very slow, slow to turn. Select it (LMB) and RMB on the "HERE" marker.') },
    boss_weak: { keys: () => ['W', bk('run')], mouse: 'lmb', h: () => BNe() },
    boss_poss: { keys: () => [bk('rts')], h: () => A84(`Вселись в своего босса: выдели его в стратегии и ${bk('rts')} (или «▶ Вселиться»). Вид — снаружи, ЛКМ — главное оружие${BOSS83.kindOf(0) === 's' ? ', ПКМ — топот' : ', пулемёты и ракеты стреляют сами'}.`, `Possess your boss: select it in strategy and press ${bk('rts')} (or "▶ Possess"). Outside camera, LMB — main weapon.`) },
  };
  const PH = {
    air_pick: { g: 'tap', el: () => L84.phEl('carpet'), h: A84('☰ → «▤ Удары» → «✈ Ковровая бомбардировка» (5 КО). Жёлтая полоса — где лягут 10 бомб.', '☰ → "▤ Powers" → "✈ Carpet bombing" (5 CP). The yellow strip shows where 10 bombs fall.') },
    air_rot: { g: 'tap', el: () => [{ sel: '#air84' }], h: A84('Тапни ⟳ внизу — полоса повернётся на 30°. Заход бомбардировщика — по стрелке.', 'Tap ⟳ at the bottom — the strip turns 30°. The bomber flies along the arrow.') },
    air_fire: { g: 'tap', h: A84('Тапни по метке «ЦЕЛЬ» — удар через 3.5 с. Или прижми палец к цели и протяни — так задаётся заход.', 'Tap the "TARGET" marker — impact in 3.5 s. Or press on the target and drag to set the run.') },
    air_warn: { h: PC.air_warn.h },
    air_nap: { g: 'tap', el: () => S.cast ? [] : L84.phEl('napalm'), h: A84('☰ → «▤ Удары» → «♨ Напалм» (3 КО) → тап по метке. Огонь горит 9 с, поджигает метан.', '☰ → "▤ Powers" → "♨ Napalm" (3 CP) → tap the marker. Burns 9 s, ignites methane.') },
    air_fps: { g: 'tap', el: () => [{ sel: '#s78 [data-s78="tog"]' }], h: A84('В бою: 📡 справа → «Ковровая» или «Напалм». Удар — туда, куда смотришь.', 'In battle: 📡 on the right → "Carpet" or "Napalm". It lands where you look.') },
    ter_lava: { g: 'joy', h: A84('Ты у лавового озера. Джойстиком ступи на край лавы у метки — почувствуешь жар (в бою лава жжёт) — и назад.', 'You are at a lava lake. Use the stick to step onto its edge at the marker — feel the heat — and back off.') },
    ter_ice: { g: 'joy', h: A84('Лёд: разгонись по озеру и попробуй остановиться — заносит.', 'Ice: run across and try to stop — you slide.') },
    ter_meth: { g: 'tap', h: A84('Над метановым озером туман. Огонь и взрывы его поджигают: «Ракета» или «Граната» в туман у метки.', 'Methane fog over the lake. Fire and blasts ignite it: a rocket or a grenade into the fog.') },
    ter_hang: { g: 'joy', h: A84('Ангар в скале — укрытие: взрывы снаружи бьют втрое слабее, метеориты не достают. Зайди внутрь.', 'The rock hangar is cover: outside blasts do a third of the damage. Walk in.') },
    tun_build: { g: 'tap', h: A84('Ты — Рой. Тапни инженера → «Стройка» → «Нора-туннель» → тап у метки → «Строить».', 'You are the Swarm. Tap a builder → "Build" → "Tunnel burrow" → tap at the marker → "Build".') },
    tun_built: { h: PC.tun_built.h },
    tun_dig: { g: 'tap', h: A84('Тапни нору → «⛏ Прорыть выход» → тап по метке «ВЫХОД» (до 220 м).', 'Tap the burrow → "⛏ Dig the exit" → tap the "EXIT" marker (up to 220 m).') },
    tun_open: { h: PC.tun_open.h },
    tun_send: { g: 'tap', h: A84('Тапни отряд (или лёгкую технику) → «⇣ В туннель» в карточке, или тап по норе. Ещё: в панели норы «Отряды — в туннель».', 'Tap a squad (or light vehicles) → "⇣ Into tunnel" on the card, or tap the burrow. Or "Squads into the tunnel" in the burrow panel.') },
    tun_out: { h: PC.tun_out.h },
    con_wall: { g: 'tap', h: A84('Ты — Консорциум. Инженер → «Стройка» → «Бетонный барьер» → тап у метки → «Строить».', 'You are the Consortium. Builder → "Build" → "Concrete barrier" → tap at the marker → "Build".') },
    con_chain: { g: 'tap', h: A84('После «Строить» сразу предлагается следующая секция встык — ещё раз «Строить» (или тап у метки «ВСТЫК»).', 'After "Build" the next section is offered right away — "Build" again (or tap the "NEXT TO IT" marker).') },
    con_rep: { g: 'tap', h: A84('«Стройка» → «Ремонтный пост» → тап у метки → «Строить». Чинит технику, здания и пехоту в 26 м.', '"Build" → "Repair post" → tap the marker → "Build". Repairs everything within 26 m.') },
    con_fix: { g: 'tap', h: A84('Танк побит (35 %). Тапни его, потом тап рядом с ремонтным постом — зелёные лучи чинят.', 'The tank is damaged (35 %). Tap it, then tap next to the repair post — green beams fix it.') },
    con_field: { h: PC.con_field.h },
    boss_hall: { g: 'tap', h: () => A84(`Боссы — с 12:00 боя (в уроке время перемотано). Мехзавод уже стоит. Инженер → «Стройка» → ${BN()[0]} → тап у метки → «Строить».`, 'Bosses unlock at 12:00 (skipped here). Builder → "Build" → the boss plant → tap the marker → "Build".') },
    boss_order: { g: 'tap', h: () => A84(`Цех строится. Потом тапни его → закажи ${BN()[1]} (в уроке — без ожидания). Один на армию.`, 'The plant is going up. Then tap it → order the boss (instant here). One per army.') },
    boss_move: { g: 'tap', h: () => A84(`${BN()[1]}: огромная прочность, очень медленный. Тапни его, потом тап по метке «СЮДА».`, 'Huge hull, very slow. Tap it, then tap the "HERE" marker.') },
    boss_weak: { g: 'joy', h: () => BNe() },
    boss_poss: { g: 'tap', h: () => A84(`Вселись в своего босса: тапни его в стратегии → «▶ Вселиться». В босса можно всегда, даже если в настройках «Вселение: Техника» выключено.`, 'Possess your boss: tap it in strategy → "▶ Possess". Always allowed, even if "Possession: vehicles" is off.') },
  };
  // h может быть функцией (имя босса зависит от фракции): движок v7.2 читает H.h — отдаём геттер
  const wrap = o => { const r = Object.assign({}, o); if (typeof o.h === 'function'){ const f = o.h; Object.defineProperty(r, 'h', { get: f, enumerable: true }); } return r; };
  for (const id in CTL72.schemes){ const s = CTL72.schemes[id]; if (!s.acts) continue; const src = s.plat === 'pc' ? PC : PH; for (const k in src) s.acts[k] = wrap(src[k]); }
}
// ---------------------------------------------------------------- движок: запуск, шаги, пропуск, итог
{
  const st0 = T72.start; T72.start = function(id){ if (L84.is(id)) return L84.start(id); L84.cur = null; return st0.apply(this, arguments); };
  const sf0 = T72.stepsFor; T72.stepsFor = function(id){ if (!L84.is(id)) return sf0.apply(this, arguments); const sc = CTL72.schemes[CTL72.current(L84.ph() ? 'phone' : 'pc')]; return L84.LES[id].steps.filter(a => DEF72[a] && (!sc || sc.acts[a])); };
  const lv0 = T72.leave; T72.leave = function(){ const D = DEF72[this.cur()]; if (L84.is(this.id) && D && D.leave) L84.safe(() => D.leave(this), 'leave'); return lv0.apply(this, arguments); };
  const sp0 = T72.stop; T72.stop = function(){ const r = sp0.apply(this, arguments); L84.cur = null; return r; };
  const ac0 = T72.act; T72.act = function(k){
    if (k === 'l84skip'){ if (this.on && !this.fin){ emit('ui', { kind: 'ok' }); this.next(); } return; }
    if (k === 'l84menu'){ this.stop(); MENU.toMenu(); setTimeout(() => MENU.show('t72', true), 0); return; }
    if (k === 'l84next'){ const L = L84.ORDER, n = L[(L.indexOf(this.id) + 1) % L.length]; L84.start(n); return; }
    return ac0.apply(this, arguments);
  };
  // кнопка «⏭ Пропустить шаг» в панели урока
  const rn0 = T72.render; T72.render = function(){
    const r = rn0.apply(this, arguments);
    if (L84.is(this.id) && this.P && this.P.style.display !== 'none') L84.safe(() => {
      const hd = this.P.querySelector('.hd'); if (!hd || hd.querySelector('[data-t72="l84skip"]')) return;
      const b = document.createElement('button'); b.dataset.t72 = 'l84skip'; b.title = L72(A84('Пропустить шаг', 'Skip step')); b.innerHTML = '⏭<small>' + L72(A84('Пропустить', 'Skip')) + '</small>';
      hd.insertBefore(b, hd.querySelector('[data-t72="rep"]'));
    }, 'skipbtn');
    return r;
  };
  const fu0 = T72.finUI; T72.finUI = function(){
    if (!L84.is(this.id)) return fu0.apply(this, arguments);
    const F = this.FIN, sig = 'l84' + this.id + LANG.cur;
    if (F._s !== sig){
      F._s = sig;
      const L = L84.ORDER, n = L[(L.indexOf(this.id) + 1) % L.length], dn = this.doneMap();
      const left = L.filter(x => !dn[x]).length;
      F.innerHTML = `<div class="c"><div class="cup">🏆</div><h2>${tr('Урок пройден!', 'Lesson complete!', 'Lesson complete!', 'Lesson complete!')}</h2><p class="sub">${L72(T72N[this.id])} · +${this.xp || 300} XP</p>` +
        `<p>${left ? L72(A84(`Осталось уроков: ${left} из ${L.length}.`, `Lessons left: ${left} of ${L.length}.`)) : L72(A84('Все уроки новых механик пройдены!', 'All new-mechanics lessons done!'))}</p>` +
        `<div class="b"><button data-t72="play" class="pri">▶ ${tr('Настоящий бой', 'Real battle', 'Trận thật', 'קרב אמיתי')}</button><button data-t72="l84next">⏭ ${L72(T72N[n])}</button>` +
        `<button data-t72="again">⟲ ${tr('Ещё раз', 'Again', 'Lại', 'שוב')}</button><button data-t72="l84menu">☰ ${tr('Все уроки', 'All lessons', 'All lessons', 'All lessons')}</button></div></div>`;
    }
    F.style.display = MENU.isOpen() ? 'none' : 'flex';
  };
  // фракция урока (туннели — Рой, укрепления — Консорциум)
  const nm0 = newMatch; newMatch = function(opts){ if (L84.fac !== null && L84.fac !== undefined && opts && !opts.attract){ opts = Object.assign({}, opts, { fac76: [L84.fac, 1 - L84.fac] }); return nm0.call(this, opts); } return nm0.apply(this, arguments); };
  // события для проверок
  if (typeof TER81 !== 'undefined' && TER81.burn){ const b0 = TER81.burn; TER81.burn = function(e, dt, me){ if (me && T72.on) T72.ev('lava84'); return b0.apply(this, arguments); }; }
  if (typeof TUN82 !== 'undefined'){ const d0 = TUN82.done; TUN82.done = function(g){ const by = g && g.t82 && g.t82.by; const r = d0.apply(this, arguments); if (T72.on && by === 'player') T72.ev('tunout84'); return r; }; }
  if (typeof BOSS83 !== 'undefined'){ const w0 = BOSS83.weakK; BOSS83.weakK = function(e, src){ const k = w0.apply(this, arguments); if (k > 1 && T72.on && src && isPlayerSrc(src)) T72.ev('weak84'); return k; }; }
}
// ---------------------------------------------------------------- меню «Обучение»: блок «Уроки новых механик»
{
  const h0 = MENU.html_t72;
  MENU.html_t72 = function(){
    let h = h0.apply(this, arguments);
    const dn = T72.doneMap();
    const tiles = L84.ORDER.map(id => { const L = L84.LES[id], n = dn[id] || 0;
      return `<button class="l84tile ${n ? 'ok' : ''}" data-l84go="${id}"><i>${L.ic}</i><b>${L72(L.n)}</b><small>${L72(L.d)}</small><span class="st">${L.steps.length} ${L72(A84('шагов', 'steps'))}${n ? ' · ✓ ' + L72(A84('пройден', 'done')) + (n > 1 ? ' ×' + n : '') : ''}</span></button>`; }).join('');
    const blk = `<h3 class="l84h">${L72(A84('Уроки новых механик', 'New mechanics lessons'))} <small>${L72(A84('коротко, по 4–6 шагов; любой шаг можно пропустить ⏭', 'short, 4–6 steps; any step can be skipped ⏭'))}</small></h3><div class="l84g">${tiles}</div>`;
    const i = h.indexOf('<div class="row">');
    return i >= 0 ? h.slice(0, i) + blk + h.slice(i) : h.replace(/<\/div>\s*$/, blk + '</div>');
  };
  const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.apply(this, arguments);
    if (name !== 't72') return;
    const el = $('screen'); if (!el) return;
    el.querySelectorAll('[data-l84go]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); L84.start(b.dataset.l84go); });
  };
}
(function(){ const st = document.createElement('style'); st.id = 'l84css'; st.textContent = `
  .t72menu .l84h{margin:4px 0 0;font:400 18px "Russo One",sans-serif;color:#ffd23f} .t72menu .l84h small{font:400 12px "Exo 2",sans-serif;color:#cfc6ad;margin-left:6px}
  .t72menu .l84g{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
  #screen .l84tile{position:relative;margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 10px 9px;min-height:120px;border-radius:12px;text-align:left;cursor:pointer;
    border:2px solid rgba(255,138,80,.55);background:linear-gradient(160deg,rgba(44,26,14,.92),rgba(16,12,10,.92))}
  #screen .l84tile:hover{border-color:#ffb070;transform:translateY(-2px)} #screen .l84tile.ok{border-color:rgba(143,255,170,.6)}
  .l84tile i{font-style:normal;font-size:24px;line-height:1;color:#ffb070} .l84tile b{font:400 15px "Russo One",sans-serif;color:#fff;line-height:1.15}
  .l84tile small{font-size:11px;line-height:1.3;color:#cfc6ad} .l84tile .st{margin-top:auto;font-size:11px;color:#8fffaa}
  @media (max-width:820px){ .t72menu .l84g{grid-template-columns:repeat(3,1fr)} }
  @media (max-width:520px){ .t72menu .l84g{grid-template-columns:1fr 1fr} }
  @media (max-height:500px){ .t72menu .l84h{font-size:14px!important;margin:0} .t72menu .l84h small{display:none} #screen .l84tile{min-height:0;padding:6px 8px;gap:2px} .l84tile small{display:none} .l84tile i{font-size:18px} .l84tile b{font-size:13px} }
  body.t72phone #t72p .hd button[data-t72="l84skip"]{min-width:38px}
`; document.head.appendChild(st); })();
