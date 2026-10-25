// v7.0: стартовый состав, «свой порядок», промахи, падения, точки и форпосты, штаб. node cdp70.js v70_feat.js --vp 1280x720 --reload
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const clickEl = el => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); };
const killMe = () => { const m = ctrlEntity(); if (m && m.cls !== 'bld') destroy(m, null); };
try {
  try { localStorage.removeItem('pm_prio70'); } catch (e){}
  PRIO70.on = false; PRIO70.rank = {}; PRIO70.never = {}; PRIO70.fix();
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  // ---- меню: «Новое в v7.0» на 4 языках
  { const res = {}; for (const l of ['ru', 'en', 'vi', 'he']){ SET.lang = l; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(150); const h = document.getElementById('screen').innerHTML; res[l] = /v7\.0/.test(h) && (l !== 'he' || /חדש ב-v7\.0/.test(h)); } ok('menu_news4', Object.values(res).every(Boolean), res); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  ok('title', document.title === 'Portal Meteor — v7.0', document.title);
  // ---- 1. стартовый состав
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500);
  for (const c of S.cps) c.pod70 = [1e9, 1e9];   // капсулы на точки — проверяются отдельно ниже (иначе новые бойцы путают проверку порядка)
  for (const t of [0, 1]){
    const vk = S.vehicles.filter(v => v.team === t).map(v => v.vk || 'tank');
    const roles = new Set(S.units.filter(u => u.team === t).map(u => u.role));
    const need = ['tank', 'raider', 'mlrs', 'cat'].every(k => vk.includes(k)) && ['assault', 'heavy', 'rocket', 'medic', 'sniper', 'scout'].every(r => roles.has(r));
    const types = { elite: S.squads.some(s => s.team === t && s.elite), sniper: S.squads.some(s => s.team === t && s.solo === 'sniper'), scout: S.squads.some(s => s.team === t && s.solo === 'scout'), drone: S.drones.some(d => d.team === t) };
    const atBase = [...S.vehicles, ...S.drones].filter(v => v.team === t).every(v => surfDist(v.pos, BASES[t]) < 70);
    ok('roster_team' + t, need && Object.values(types).every(Boolean) && atBase, { vk, roles: [...roles], types, atBase });
  }
  { const o0 = S.teams[0].ore, n0 = S.vehicles.length; const made = ROSTER70.spawn(0); ok('roster_free', S.teams[0].ore === o0 && S.vehicles.length === n0 + 3 && S.squads.some(s => s.team === 0 && s.solo === 'heavy'), { o0, o: S.teams[0].ore }); for (const g of made) for (const u of groupUnits(g)) destroy(u, null); }
  // в каждого класса можно вселиться
  { const got = []; for (const c of P70_CLS){ const b = PRIO70.bodies(c)[0]; if (b){ takeControl(b); await sleep(60); if (PRIO70.clsOf(ctrlEntity()) === c) got.push(c); } } ok('possess_every_class', got.length === P70_CLS.length, got); }
  // ---- 2. свой порядок (ПК, пауза)
  MENU.pause(); await sleep(400);
  { const c = document.querySelector('#screen .p70-menu'); ok('prio_pause_compact', !!c && !!c.querySelector('[data-p70="open"]') && !!c.querySelector('[data-p70="tog"]')); clickEl(c.querySelector('[data-p70="open"]')); await sleep(300); ok('prio_screen', MENU.cur === 'p70', MENU.cur); }
  let w = document.querySelector('#screen .p70w');
  ok('prio_widget_pause', !!w && w.querySelectorAll('.p70c').length === P70_CLS.length && !!w.querySelector('[data-p70="auto"].cur'));
  clickEl(w.querySelector('[data-p70="tog"]')); await sleep(150);
  w = document.querySelector('#screen .p70w');
  const ranks = P70_CLS.map(c => PRIO70.rank[c]);
  ok('prio_on_unique', PRIO70.on && new Set(ranks).size === P70_CLS.length && Math.min(...ranks) === 1 && Math.max(...ranks) === P70_CLS.length && w.classList.contains('on'), ranks);
  ok('prio_auto_grey', !w.querySelector('[data-p70="auto"].cur'));
  // яркость: №1 насыщеннее последнего
  { const sat = c => { const b = w.querySelector(`[data-p70="top"][data-c="${c}"]`); const m = /hsla\(138,\s*(\d+)%/.exec(b.getAttribute('style')); return m ? +m[1] : -1; };
    const o = PRIO70.order(); ok('prio_brightness', sat(o[0]) > 70 && sat(o[o.length - 1]) < 10, [sat(o[0]), sat(o[o.length - 1])]); }
  // ▲ у класса №3 — меняется с №2
  { const o = PRIO70.order(), c3 = o[2], c2 = o[1];
    clickEl(w.querySelector(`[data-p70="up"][data-c="${c3}"]`)); await sleep(100);
    ok('prio_up_swap', PRIO70.rank[c3] === 2 && PRIO70.rank[c2] === 3);
    w = document.querySelector('#screen .p70w');
    clickEl(w.querySelector(`[data-p70="dn"][data-c="${c3}"]`)); await sleep(100);
    ok('prio_dn_swap', PRIO70.rank[c3] === 3 && PRIO70.rank[c2] === 2);
    const last = o[o.length - 1]; w = document.querySelector('#screen .p70w');
    clickEl(w.querySelector(`[data-p70="dn"][data-c="${last}"]`)); await sleep(80);
    ok('prio_bounds', PRIO70.rank[last] === P70_CLS.length); }
  // клик по классу — сделать первым
  w = document.querySelector('#screen .p70w');
  clickEl(w.querySelector('[data-p70="top"][data-c="mlrs"]')); await sleep(100);
  ok('prio_top', PRIO70.rank.mlrs === 1 && new Set(P70_CLS.map(c => PRIO70.rank[c])).size === P70_CLS.length);
  w = document.querySelector('#screen .p70w');
  clickEl(w.querySelector('[data-p70="top"][data-c="sniper"]')); await sleep(100);
  ok('prio_top2', PRIO70.rank.sniper === 1 && PRIO70.rank.mlrs === 2);
  { let st = null; try { st = JSON.parse(localStorage.getItem('pm_prio70')); } catch (e){} ok('prio_saved', st && st.on && st.rank.sniper === 1 && st.rank.mlrs === 2, st); }
  await shot('D:/AI/pm_v6/shots/v70_prio_pc.jpg');
  MENU.back(); await sleep(300); ok('prio_back_pause', MENU.cur === 'pause' && !!document.querySelector('#screen .p70-menu .p70chips'));
  await shot('D:/AI/pm_v6/shots/v70_prio_pause.jpg');
  MENU.close(); S.paused = false; MENU.waitLock = false; await sleep(400);
  // логика: гибель — вселение в №1 (снайпер), его нет — №2 (РСЗО), «никогда» — пропуск
  takeControl(PRIO70.bodies('assault')[0]); await sleep(200);
  killMe(); await sleep(700);
  ok('prio_pick_rank1', PRIO70.clsOf(ctrlEntity()) === 'sniper', PRIO70.clsOf(ctrlEntity()));
  for (const u of PRIO70.bodies('sniper')) if (u !== ctrlEntity()) destroy(u, null);
  killMe(); await sleep(700);
  ok('prio_pick_rank2', PRIO70.clsOf(ctrlEntity()) === 'mlrs', PRIO70.clsOf(ctrlEntity()));
  PRIO70.toggleNever('mlrs'); await sleep(50);
  { const o = PRIO70.order().filter(c => PRIO70.ok(c) && PRIO70.bodies(c, ctrlEntity()).length); switchUnit(1); await sleep(400); ok('prio_never_skip', PRIO70.clsOf(ctrlEntity()) === o[0] && PRIO70.clsOf(ctrlEntity()) !== 'mlrs', { got: PRIO70.clsOf(ctrlEntity()), want: o[0] }); }
  { const L = switchCandidates(); ok('prio_x_order', L.every((o, i) => i === 0 || o.kind === 'bld' || (o.r || 99) >= (L[i - 1].r || 0)) && !L.some(o => o.e.vk === 'mlrs'), L.map(o => o.r)); }
  PRIO70.toggleNever('mlrs');
  // карточка гибели
  killMe(); await sleep(500);
  ok('prio_death_card', /СВОЙ ПОРЯДОК|РОБОТ УНИЧТОЖЕН/.test(($('dcard') || {}).textContent || '') && !!document.querySelector('#dcard .p70chips'));
  await shot('D:/AI/pm_v6/shots/v70_prio_card.jpg');
  // выключили — снова «Авто»
  PRIO70.setOn(false); await sleep(100);
  ok('prio_off_auto', !PRIO70.on && FPS61.pick().u === nearestToAction(0));
  // ---- 3. промахи: 4 бота Роя стреляют по игроку 10 с (с промахами и без), игрок бессмертен
  DEV.enter(); await sleep(200);
  const me0 = PRIO70.bodies('assault')[0]; takeControl(me0); await sleep(300);
  const shoot = async (on) => {
    MISS70.on = on; MISS70.stats = { cine: 0, shots: 0, ground: 0, whiz: 0, cover: 0 };
    const me = ctrlEntity(), p0 = me.pos.slice();
    const sq = spawnSquad(1, false, add(me.pos, mul(tangent(me.fwd, me.up), 26)), 4, ['assault', 'assault', 'assault', 'assault']);
    sq.order = 'hold'; sq.goal = sq.units[0].pos; sq.manualUntil = 1e9; for (const u of sq.units){ u.maxhp = u.hp = 1e5; }
    const bots = new Set(sq.units); let n = 0; const gb0 = gunBotFire; gunBotFire = function(u, a, s){ if (bots.has(u) && u.target === ctrlEntity()) n++; return gb0(u, a, s); };
    let dmg = 0; const hp = me.hp, t0 = S.time;
    while (S.time - t0 < 10){ me.pos = p0.slice(); me.vel = [0, 0, 0]; for (const u of sq.units){ u.target = me; u.hp = 1e5; u.dPos = u.dPos || u.pos.slice(); u.pos = u.dPos.slice(); u.vel = [0, 0, 0]; } if (me.hp < hp){ dmg += hp - me.hp; me.hp = hp; } await sleep(50); }
    gunBotFire = gb0;
    for (const u of sq.units) if (u.alive) destroy(u, null);
    return { dmg: Math.round(dmg), n, cine: MISS70.stats.cine, ground: MISS70.stats.ground, whiz: MISS70.stats.whiz, cover: MISS70.stats.cover };
  };
  const sum = (a, b) => { const o = {}; for (const k in a) o[k] = a[k] + b[k]; return o; };
  const mOff = sum(await shoot(false), await shoot(false)), mOn = sum(await shoot(true), await shoot(true));
  mOff.per100 = +(100 * mOff.dmg / max(1, mOff.n)).toFixed(1); mOn.per100 = +(100 * mOn.dmg / max(1, mOn.n)).toFixed(1);
  R.miss = { off: mOff, on: mOn };
  ok('miss_less_damage', mOn.per100 < mOff.per100 * 0.8 && mOn.dmg > 0 && mOff.n > 30 && mOn.n > 30, R.miss);
  ok('miss_cinematic', mOn.cine > 5 && mOn.whiz + mOn.ground + mOn.cover === mOn.cine, mOn);
  { // разброс бот-бот: дальность, движение, укрытие
    const u = S.units.find(x => x.team === 1 && x.alive) || spawnSquad(1, false, mul(BASES[1], RM), 1).units[0];
    const tg = S.units.find(x => x.team === 0 && x.alive && x !== ctrlEntity());
    const e0 = MISS70.err(u, Object.assign({}, tg, { vel: [0, 0, 0], grounded: true }), 15, 0.03, false, u.pos);
    const e1 = MISS70.err(u, Object.assign({}, tg, { vel: mul(tangent(randUnit(), tg.up), 8), grounded: true }), 80, 0.03, false, u.pos);
    ok('miss_spread_grows', e1 > e0 * 2, [e0, e1]); }
  { // сложность: на лёгкой промахов больше
    const d0 = S.diff; S.diff = 0; const pe = MISS70.pCine(null); S.diff = 2; const ph = MISS70.pCine(null); S.diff = d0; ok('miss_difficulty', pe > ph + 0.1, [pe, ph]); }
  // ---- 4. падения от взрывов
  { const res = []; for (const lv of [1, 2, 3]){ const me = ctrlEntity(); me.kd70 = null; DEV.blast70(lv); await sleep(60); res.push(me.kd70 ? me.kd70.lv : 0); await sleep(lv === 3 ? 2100 : 1300); } ok('kd_levels', res.join() === '1,2,3', res); }
  { const me = ctrlEntity(); me.kd70 = null; await sleep(100); DEV.blast70(3); await sleep(250);
    const c = S.cam, upW = norm(me.pos), roll = Math.asin(clamp(dot(c.right, upW), -1, 1));
    const inp = playerInput(me);
    ok('kd_player_cam_input', Math.abs(roll) > 0.05 && len(inp.wish) === 0 && !inp.fire, { roll, wish: inp.wish });
    await shot('D:/AI/pm_v6/shots/v70_kd_fp.jpg');
    await sleep(2000); ok('kd_getup', !me.kd70 && !me.kdUp); }
  { // бот: с ног, наклон, не стреляет, встаёт
    const me = ctrlEntity();
    const sq = spawnSquad(1, false, add(me.pos, mul(tangent(me.fwd, me.up), 14)), 2, ['assault', 'heavy']); for (const u of sq.units){ u.dPos = u.pos.slice(); }
    await sleep(300);
    const b = sq.units[0], hv = sq.units[1];
    knockback(add(b.pos, mul(b.up, 0.3)), 140, 4); await sleep(320);
    const tilt = b.kdUp ? Math.acos(clamp(dot(b.kdUp, b.up), -1, 1)) : 0;
    ok('kd_bot_down', b.kd70 && b.kd70.lv === 3 && tilt > 1.0 && b.cd > 0, { lv: b.kd70 && b.kd70.lv, tilt });
    ok('kd_heavy', !!hv.kd70, hv.kd70 && hv.kd70.lv);
    S.third = true; me.fwd = tangent(sub(b.pos, me.pos), me.up); me.aim = me.fwd; await sleep(300);
    knockback(add(b.pos, mul(b.up, 0.3)), 140, 4); knockback(add(hv.pos, mul(hv.up, 0.3)), 160, 4); await sleep(450);
    await shot('D:/AI/pm_v6/shots/v70_kd_bots.jpg');
    await sleep(2200); ok('kd_bot_up', !b.kd70 && !b.kdUp);
    for (const u of sq.units) if (u.alive) destroy(u, null);
    enterFPS(); await sleep(500);
  }
  // ---- 5. точки: капсула с отрядом и инженером
  DEV.on = false;   // проверяем без режима разработчика: руда и инженер нужны
  S.teams[0].ore = 5000;
  const cp = S.cps.filter(c => !c.core).sort((a, b) => surfDist(a.dir, BASES[0]) - surfDist(b.dir, BASES[0]))[0];
  cp.owner = 1; cp.prog = -1; cp.pod70 = null; await sleep(100);
  const nSq = S.squads.filter(s => s.team === 0).length, nB = S.builders.filter(b => b.alive && b.team === 0).length;
  GAME.MAX_SQUADS = 99; GAME.MAX_BUILDERS = 99;
  cp.prog = 1; cp.owner = 0; emit('capture', { cp, owner: 0, old: 1 }); BASE70.onCapture(cp, 0);
  ok('cap_pod', S.pods.some(p => p.v70 && p.team === 0));
  await sleep(4000);
  const L = BASE70.lastLand;
  ok('cap_landed', L && L.cp === cp.i && L.sq && S.squads.includes(L.sq) && L.sq.units.length === 4 && L.eng && L.eng.alive && dist(L.eng.pos, cp.pos) < 25, { L: !!L, nSq, nB });
  // форпост у точки (инженер с капсулы строит)
  let op = null;
  for (let k = 0; k < 12 && !op; k++){ const dir = offsetOnSphere(cp.dir, rotAxis(anyTangent(cp.dir), cp.dir, k * 0.55), 18); if (!siteProblem(0, 'outpost', dir)){ placeBuilding(0, 'outpost', dir); op = S.lastSite; } }
  ok('op_placed', !!op);
  finishSite(op); await sleep(200);
  const e = L.eng; e.pos = surfacePoint(norm(add(op.pos, mul(op.fwd, op.rad + 4))), ECO.HOVER); e.order = 'idle'; e.site = null; e.manualUntil = 1e9; e.byPlayer = true; e.auto66 = false;
  enterRTS(); await sleep(400); S.sel.clear(); S.selB = op; flyCamTo(op.pos); await sleep(900);
  ok('op_card_branches', document.querySelectorAll('#card [data-v70^="br:"]').length === 3, document.querySelectorAll('#card .u70').length);
  await shot('D:/AI/pm_v6/shots/v70_op_card.jpg');
  const ore0 = S.teams[0].ore;
  clickEl(document.querySelector('#card [data-v70="br:def"]')); await sleep(300);
  ok('op_start', op.tw70 && op.tw70.br === 'def' && op.tw70.job && op.tw70.job.cost === BR70.def.tiers[0].cost && S.teams[0].ore < ore0 - 100, { tw: op.tw70, ore0, ore: S.teams[0].ore });
  // без инженера стройка стоит
  e.pos = add(e.pos, mul(norm(e.pos), 0)); const far = surfacePoint(offsetOnSphere(norm(op.pos), anyTangent(norm(op.pos)), 80), ECO.HOVER); const keep = e.pos; e.pos = far; e.goal = null; const away = []; for (const x of S.builders) if (x.alive && x.team === 0 && x !== e && dist(x.pos, op.pos) < 45){ away.push([x, x.pos]); x.pos = surfacePoint(offsetOnSphere(norm(op.pos), anyTangent(norm(op.pos)), 90), ECO.HOVER); x.order = 'idle'; x.site = null; x.manualUntil = 1e9; x.auto66 = false; }
  const t0 = op.tw70.job.t; await sleep(1200); ok('op_needs_engineer', Math.abs(op.tw70.job.t - t0) < 1e-6 && !!document.querySelector('#card [data-v70="eng:0"]'), op.tw70.job.t - t0);
  e.pos = keep; await sleep(1000); ok('op_progress', op.tw70.job.t > t0 + 0.5);
  op.tw70.job.t = op.tw70.job.T; await sleep(300);
  ok('op_tier1', op.tw70.tier === 1 && !op.tw70.job);
  // дот стреляет по врагу
  { const A = BASE70.slots(op).s[0]; const sq = spawnSquad(1, false, add(A.pos, mul(A.Z, 24)), 2, ['assault', 'assault']); for (const u of sq.units){ u.dPos = u.pos.slice(); }
    const hp0 = sq.units.reduce((a, u) => a + u.hp, 0); const g0 = BASE70.g70(op).burst;
    for (let i = 0; i < 40; i++){ for (const u of sq.units){ if (u.alive){ u.pos = u.dPos.slice(); u.vel = [0, 0, 0]; u.cd = 1; } } await sleep(100); }
    const hp1 = sq.units.reduce((a, u) => a + (u.alive ? u.hp : 0), 0);
    ok('op_def_mg', BASE70.g70(op).burst > g0 && hp1 < hp0, { b: BASE70.g70(op).burst - g0, hp0, hp1 });
    for (const u of sq.units) if (u.alive) destroy(u, null); }
  BASE70.start(op); op.tw70.job.t = op.tw70.job.T; await sleep(300);
  ok('op_tier2', op.tw70.tier === 2 && op.maxhp > BTYPES.outpost.hp, { tier: op.tw70.tier, hp: op.maxhp });
  ok('op_other_branch_blocked', !!BASE70.why(op, 'sup'));
  flyCamTo(op.pos); S.rts.h = 22; await sleep(900);
  await shot('D:/AI/pm_v6/shots/v70_op_def2.jpg');
  // ветки поддержки и разведки (у других форпостов)
  const mkOp = (br, tier) => { let b = null; for (let k = 0; k < 16 && !b; k++){ const dir = offsetOnSphere(cp.dir, rotAxis(anyTangent(cp.dir), cp.dir, k * 0.4 + 1), 45 + (k % 3) * 10); if (!siteProblem(0, 'outpost', dir)){ b = makeBuilding('outpost', 0, dir); } } finishSite(b); const w = BASE70.tw(b); w.br = br; w.tier = tier; if (br === 'rec') b.visR = tier === 2 ? 190 : 150; return b; };
  const sup = mkOp('sup', 1);
  { const u = spawnSquad(0, false, add(sup.pos, mul(sup.fwd, 12)), 1, ['heavy']).units[0]; await sleep(100); u.pos = surfacePoint(norm(add(sup.pos, mul(sup.fwd, 12)))); u.hp = u.maxhp * 0.4; u.lastHurt = S.time; const h0 = u.hp; u.squad.order = 'hold'; u.squad.goal = u.pos; u.squad.manualUntil = 1e9;
    for (let i = 0; i < 40; i++){ u.lastHurt = S.time; await sleep(100); }
    ok('op_sup_heal', u.hp > h0 + 10, { h0, h: u.hp }); }
  sup.tw70.tier = 2; await sleep(200);
  { const u = S.units.find(x => x.alive && x.team === 0 && x !== ctrlEntity() && dist(x.pos, sup.pos) < 20) || S.units.find(x => x.alive && x.team === 0 && x !== ctrlEntity());
    u.pos = surfacePoint(norm(add(sup.pos, mul(sup.fwd, 8)))); await sleep(150); u.hp = 1000; u.maxhp = 1000; damage(u, 100, null, 'b'); const inDome = 1000 - u.hp;
    u.pos = surfacePoint(norm(add(sup.pos, mul(sup.fwd, 60)))); await sleep(150); u.hp = 1000; damage(u, 100, null, 'b'); const out = 1000 - u.hp;
    ok('op_sup_dome', inDome < out * 0.7 && inDome > 0, { inDome, out }); }
  flyCamTo(sup.pos); S.rts.h = 26; await sleep(900);
  await shot('D:/AI/pm_v6/shots/v70_op_sup2.jpg');
  const rec = mkOp('rec', 1); await sleep(400);
  ok('op_rec_vision', visRadius0(rec) === 150);
  rec.tw70.tier = 2; await sleep(400);
  { const sq = spawnSquad(1, false, add(rec.pos, mul(rec.fwd, 120)), 1, ['assault']); const u = sq.units[0]; u.dPos = u.pos.slice(); u.seen[0] = 0;
    await sleep(1600); ok('op_rec_spot', u.seen[0] > 1 && BASE70.spotted(0, u.pos), u.seen[0]); destroy(u, null); }
  flyCamTo(rec.pos); S.rts.h = 30; await sleep(900);
  await shot('D:/AI/pm_v6/shots/v70_op_rec2.jpg');
  // ИИ Роя выбирает ветку и улучшает свой форпост
  { let b = null; const ecp = S.cps.filter(c => !c.core).sort((a, c) => surfDist(a.dir, BASES[1]) - surfDist(c.dir, BASES[1]))[0];
    ecp.owner = 1; ecp.prog = -1;
    for (let k = 0; k < 16 && !b; k++){ const dir = offsetOnSphere(ecp.dir, rotAxis(anyTangent(ecp.dir), ecp.dir, k * 0.4), 20); if (!siteProblem(1, 'outpost', dir)) b = makeBuilding('outpost', 1, dir); }
    if (!b) b = makeBuilding('outpost', 1, offsetOnSphere(ecp.dir, anyTangent(ecp.dir), 20));
    finishSite(b);
    const en = makeBuilder(1, surfacePoint(norm(add(b.pos, mul(b.fwd, b.rad + 3))), ECO.HOVER)); en.manualUntil = 1e9; en.order = 'idle';
    S.teams[1].ore = 3000; BASE70.aiT[1] = 0; BASE70.aiStep(0.1);
    ok('ai_outpost', b.tw70 && b.tw70.br && b.tw70.job, b.tw70); }
  // ---- 6. штаб
  S.teams[0].ore = 5000;
  S.sel.clear(); S.selB = S.hq[0]; flyCamTo(S.hq[0].pos); S.rts.h = 40; await sleep(900);
  ok('hq_card', document.querySelectorAll('#card [data-v70^="hq:"]').length === 6);
  await shot('D:/AI/pm_v6/shots/v70_hq_card.jpg');
  const inc0 = ecoIncome(0, 1, 0), pt0 = pTime(0, 'squad'), hp0 = S.hq[0].maxhp, cmd0 = S.teams[0].cmd;
  for (const k of Object.keys(HQUP70)){
    S.selB = S.hq[0]; CARD.sig = ''; await sleep(400);
    const b = document.querySelector(`#card [data-v70="hq:${k}"]`); if (b) clickEl(b); await sleep(150);
    const U = BASE70.hqu(0); if (U.job && U.job.k === k) U.job.t = U.job.T; await sleep(250);
  }
  const U = BASE70.hqu(0);
  ok('hq_all', Object.keys(HQUP70).every(k => U.done[k]), U.done);
  ok('hq_effects', ecoIncome(0, 1, 0) > inc0 * 1.2 && pTime(0, 'squad') < pt0 * 0.7 && S.hq[0].maxhp > hp0 * 1.4 && S.teams[0].cmd >= Math.min(GAME.CMD_MAX, cmd0 + 2), { inc: [inc0, ecoIncome(0, 1, 0)], pt: [pt0, pTime(0, 'squad')], hp: [hp0, S.hq[0].maxhp] });
  { const h = S.hq[0]; const a = h.hp; damage(h, 1000, null, 'r'); const d = a - h.hp; h.hp = a; ok('hq_armor', d < 0.6 * 1000 * 0.76 + 1, d); }
  { await sleep(4000); ok('hq_radar', S.scans.some(z => z.radar70 && z.team === 0)); }
  { const sq = spawnSquad(1, false, mul(BASES[0], RM + 0), 1, ['assault']); const u = sq.units[0]; u.pos = surfacePoint(offsetOnSphere(BASES[0], anyTangent(BASES[0]), 50)); u.dPos = u.pos.slice(); const h0 = u.hp;
    for (let i = 0; i < 30; i++){ if (u.alive){ u.pos = u.dPos.slice(); u.cd = 1; } await sleep(100); }
    ok('hq_turrets', (BASE70.g70(S.hq[0]).tur || []).some(q => q.n > 0), (BASE70.g70(S.hq[0]).tur || []).map(q => q.n)); if (u.alive) destroy(u, null); }
  flyCamTo(S.hq[0].pos); S.rts.h = 55; await sleep(1200);
  await shot('D:/AI/pm_v6/shots/v70_hq_all.jpg');
  // ---- 7. куратор
  { const ids = ['v70_roster', 'v70_pod', 'v70_branch', 'v70_hq', 'v70_prio']; ok('curator_steps', ids.every(i => CUR_STEPS.some(s => s.id === i))); }
  { const b = BASE70.outposts(0).find(x => x.tw70 && x.tw70.br); ok('st70_render', ST70.ok() && ST70.stats.drawn > 5, ST70.stats); }
  R.fps = Math.round(fpsVal); R.st70ms = +ST70.stats.ms.toFixed(3);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
