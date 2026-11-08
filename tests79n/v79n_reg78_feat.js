// v7.8: anomalies + support + tips — PC and phone. Own Chrome 9357.
const R = { steps: [] };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const warns = []; { const cw = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw.apply(console, a); }; }
const ph = TOUCH.on ? 'ph' : 'pc';
const O = 'D:/AI/pm_v6/shots_ninja/reg_' + ph + '_';
const radio = []; { const em0 = window.emit; }
const step = s => R.steps.push(s + ' @' + Math.round(performance.now() / 1000));
const sim = async (sec, dt) => { dt = dt || 0.05; for (let t = 0; t < sec; t += dt){ update(dt); AU.process(S.events); } };
// capture radio / squad lines
{ const r0 = AU.radio.bind(AU); AU.radio = function(t, p){ radio.push('R:' + t); return r0(t, p); }; const m0 = AU.mate.bind(AU); AU.mate = function(t, p){ radio.push('M:' + t); return m0(t, p); }; }
const lookAt = (c, p) => { const f = tangent(sub(p, c.pos), c.up); if (len(f) > 0.01){ c.fwd = norm(add(f, mul(c.up, -0.12))); c.aim = c.fwd; } };
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  try { localStorage.removeItem('pm_t78'); T78.done = {}; } catch (e){}
  SET.denUser = true; if (typeof DEN75 !== 'undefined' && DEN75.style()) DEN75.set(0);   // normal graphics for the shots
  MENU.show('main'); await sleep(500);
  R.title = document.title;
  const sc = document.getElementById('screen');
  R.verLabel = (sc.innerHTML.match(/v7\.\d · [^<]{0,30}/g) || []).slice(0, 2);
  R.news = (sc.innerHTML.match(/(Новое в|НОВОЕ В) v7\.\d/g) || []).slice(0, 2);
  await shot(O + '01_menu.jpg');
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (TUT.on && TUT.finish) TUT.finish();
  await sleep(500);
  const c = ctrlEntity();
  R.anoms = A78.L.map(a => a.k).join(','); R.nAnom = A78.L.length;
  R.minBaseDist = Math.round(Math.min(...A78.L.map(a => Math.min(surfDist(a.dir, BASES[0]), surfDist(a.dir, BASES[1])))));
  R.crates = S78.crates.map(k => k.kind).join(',');
  R.powers = Object.keys(POWERS).join(',');
  step('match');
  // ---------- singing vein: player stands near it, it charges and pulses
  const v = A78.L.find(a => a.k === 'vein');
  if (v && c){
    // keep enemies away from the test spot
    for (const u of S.units) if (u.team === 1 && dist(u.pos, v.pos) < 120) u.pos = surfacePoint(offsetOnSphere(v.dir, v.t1, 160), 0.5);
    c.pos = surfacePoint(offsetOnSphere(v.dir, v.t1, 16), 0.5); c.vel = [0, 0, 0]; lookAt(c, v.pos);
    for (const u of c.squad.units) if (u !== c){ u.pos = surfacePoint(offsetOnSphere(c.pos ? norm(c.pos) : v.dir, v.t2, 4 + u.id % 3), 0.5); u.vel = [0, 0, 0]; }
    await sim(0.6); setupCamera(0.016);
    await sleep(500); await shot(O + '02_vein_far.jpg');
    // warning: squad / radio
    A78.warnT = -99; v.warnT = -999; A78.revT = 0; await sim(0.6);
    R.warnFeed = S.feed.filter(f => /Аномалия впереди/.test(f.text)).map(f => f.text).slice(-1)[0] || null;
    R.warnRadio = radio.filter(x => /номали/.test(x)).slice(-2);
    step('warn');
    // step in: charge then pulse
    const hp0 = c.hp; c.hp = c.maxhp; const pul0 = A78.stats.pulses;
    c.pos = surfacePoint(offsetOnSphere(v.dir, v.t1, 4), 0.5); c.vel = [0, 0, 0]; lookAt(c, v.pos); A78.scanT = 0;
    await sim(0.9); setupCamera(0.016);
    R.veinState = v.st + ' t=' + v.t.toFixed(2);
    await sleep(300); await shot(O + '03_vein_charge.jpg');
    await sim(0.7);
    R.veinPulse = A78.stats.pulses - pul0; R.hpAfterPulse = Math.round(c.hp) + '/' + Math.round(c.maxhp);
    setupCamera(0.016); await sleep(200); await shot(O + '04_vein_pulse.jpg');
    step('vein');
    // grenade discharges it
    c.hp = c.maxhp;
    const d0 = A78.stats.discharged;
    splash(add(v.pos, mul(v.dir, 0.5)), 0, 70, 5.5, c, 'g');
    R.grenDischarge = A78.stats.discharged - d0; R.veinDorm = A78.dorm(v); R.arts = A78.arts.length;
    await sim(1.5); const hpD = c.hp; await sim(2); R.noPulseWhenDorm = c.hp >= hpD - 0.5;
    step('discharge');
  }
  // ---------- bolt on a whirlpool
  const g = A78.L.find(a => a.k === 'grav' && !A78.dorm(a));
  if (g && c){
    for (const u of S.units) if (u.team === 1 && dist(u.pos, g.pos) < 100) u.pos = surfacePoint(offsetOnSphere(g.dir, g.t1, 150), 0.5);
    c.pos = surfacePoint(offsetOnSphere(g.dir, g.t2, 12), 0.5); c.vel = [0, 0, 0]; lookAt(c, g.pos); await sim(0.3); setupCamera(0.016);
    const h = nearbyInteract(c); R.boltPrompt = h && h.text;
    await sleep(300); await shot(O + '05_grav_prompt.jpg');
    const d0 = A78.stats.discharged; interact(); R.boltFlying = !!A78.bolt;
    await sim(0.4); setupCamera(0.016); await sleep(200); await shot(O + '06_bolt.jpg');
    await sim(1.6); R.boltDischarge = A78.stats.discharged - d0; R.gravDorm = A78.dorm(g);
    setupCamera(0.016); await sleep(200); await shot(O + '07_grav_after.jpg');
    step('bolt');
  }
  // ---------- other kinds: arcs, brazier, mist, lens (shots + damage)
  const kinds = {};
  for (const k of ['arc', 'burn', 'mist', 'lens']){
    const a = A78.L.find(x => x.k === k); if (!a || !c) continue;
    a.dormT = 0;
    for (const u of S.units) if (u.team === 1 && dist(u.pos, a.pos) < 100) u.pos = surfacePoint(offsetOnSphere(a.dir, a.t1, 150), 0.5);
    c.hp = c.maxhp; c.pos = surfacePoint(offsetOnSphere(a.dir, a.t1, k === 'lens' || k === 'mist' ? 10 : 9), 0.5); c.vel = [0, 0, 0]; lookAt(c, a.pos);
    await sim(0.3); setupCamera(0.016); await sleep(300); await shot(O + '08_' + k + '.jpg');
    // walk into it
    c.pos = surfacePoint(a.dir, 0.5); c.vel = [0, 0, 0]; A78.scanT = 0; const hp0 = c.hp;
    await sim(k === 'mist' ? 2.2 : 1.6);
    if (k === 'lens'){ const eye = add(c.pos, mul(c.up, 2)), d = norm(sub(add(a.pos, mul(a.dir, 1.6 + 0.8)), sub(eye, mul(a.t1, 20)))); A78.bent = 0; A78.bend(sub(eye, mul(a.t1, 20)), norm(sub(add(a.pos, add(mul(a.dir, 1.6), mul(a.t2, 2))), sub(eye, mul(a.t1, 20)))), 200); kinds.lensBent = A78.bent; }
    kinds[k] = Math.round(hp0 - c.hp);
    setupCamera(0.016); await sleep(200); await shot(O + '09_' + k + '_in.jpg');
  }
  R.kindDmg = kinds;
  step('kinds');
  // ---------- AI: bots usually avoid, sometimes blunder (accelerated bot-vs-bot)
  c.hp = c.maxhp;
  const st0 = JSON.parse(JSON.stringify(A78.stats));
  for (const a of A78.L) a.dormT = 0;
  // herd squads through anomalies: give enemy squads goals across them
  let nGoal = 0;
  for (const sq of S.squads){
    const a = A78.L[(sq.id * 3) % A78.L.length]; if (!a) continue;
    const L = leaderOf(sq); if (!L) continue;
    for (const u of sq.units){ u.pos = surfacePoint(offsetOnSphere(a.dir, a.t1, 22 + (u.id % 4)), 0.5); u.vel = [0, 0, 0]; }
    setOrder(sq, 'move', surfacePoint(offsetOnSphere(a.dir, a.t1, -26), 0.5), { by: 'ai' }); nGoal++;
  }
  const meSq = c.squad; c.pos = surfacePoint(BASES[0], 0.5);
  for (let i = 0; i < 400; i++){ update(0.05); }
  R.ai = { goals: nGoal, blunders: A78.stats.blunders - st0.blunders, avoided: A78.stats.avoided - st0.avoided, trappedOurs: A78.stats.trapped[0] - st0.trapped[0], trappedEnemy: A78.stats.trapped[1] - st0.trapped[1], hits: [A78.stats.hits[0] - st0.hits[0], A78.stats.hits[1] - st0.hits[1]] };
  step('ai');
  // ---------- support: crate drop, scan reveals anomalies, Grad, AI reserve
  const TM = S.teams[0]; TM.cmd = 12;
  c.pos = surfacePoint(offsetOnSphere(BASES[0], anyTangent(BASES[0]), 120), 0.5); c.vel = [0, 0, 0]; c.hp = c.maxhp;
  await sim(0.3); setupCamera(0.016);
  if (!TOUCH.on){ await IN.key('Digit4'); } else { const b = document.querySelector('#s78 [data-s78="tog"]'); if (b){ const r = b.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); } }
  await sleep(600); S78.render(); R.panelOpen = S78.open; R.panelHtml = (document.getElementById('s78') || {}).textContent;
  const pr = document.querySelector('#s78') && document.querySelector('#s78').getBoundingClientRect();
  R.panelRect = pr ? [Math.round(pr.left), Math.round(pr.top), Math.round(pr.width), Math.round(pr.height)] : null;
  R.panelCenterFree = pr ? !(pr.left < innerWidth * 0.62 && pr.right > innerWidth * 0.38 && pr.top < innerHeight * 0.62 && pr.bottom > innerHeight * 0.38) : null;
  await shot(O + '10_support_panel.jpg');
  const cr0 = S78.crates.length, cmd0 = TM.cmd;
  if (!TOUCH.on) await IN.key('Digit1'); else { const b = document.querySelector('#s78 [data-s78="drop"]'); if (b){ const r = b.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); } }
  await sleep(300);
  R.dropCalled = S78.drops.length; R.cmdSpent = cmd0 - TM.cmd;
  await sim(4.6); R.crateLanded = S78.crates.length - cr0;
  const air = S78.crates.find(k => k.kind === 'air');
  if (air){ c.pos = surfacePoint(offsetOnSphere(air.dir, anyTangent(air.dir), 3.5), 0.5); lookAt(c, air.pos); await sim(0.2); setupCamera(0.016); await sleep(300); await shot(O + '11_crate.jpg');
    S.kit.mag[S.kit.w] = 1; const g0 = G62.kit().gren = 0; const p0 = S78.stats.picked; interact(); R.cratePicked = S78.stats.picked - p0; R.magAfter = S.kit.mag[S.kit.w]; R.grenAfter = G62.kit().gren; }
  // scan reveals anomalies on the strategist map
  const anyA = A78.L[0]; const kn0 = A78.L.filter(a => a.known0).length;
  usePower(0, 'scan', anyA.pos, 'player'); await sim(1);
  R.revealed = A78.L.filter(a => a.known0).length - kn0;
  // Grad strike on a cluster of enemies
  const k0 = S.stats.kills[0]; const tgtP = surfacePoint(offsetOnSphere(BASES[1], anyTangent(BASES[1]), 160), 0.5);
  for (let i = 0; i < 4; i++){ const u = S.units.find(x => x.alive && x.team === 1 && !x.g78); if (u){ u.g78 = 1; u.pos = surfacePoint(offsetOnSphere(norm(tgtP), anyTangent(norm(tgtP)), i * 2), 0.5); u.vel = [0, 0, 0]; } }
  TM.powCd = {}; TM.cmd = 12; const gr = usePower(0, 'grad', tgtP, 'player'); R.gradErr = gr; await sim(6);
  R.gradKills = S.stats.kills[0] - k0;
  // RTS: anomaly markers visible after scan
  enterRTS(); await sleep(300); flyCamTo(anyA.dir); for (let i = 0; i < 30; i++){ updateRTSCamera(0.05); } await sleep(1500);
  await shot(O + '12_rts_anomaly.jpg');
  R.rtsPowerBtns = [...document.querySelectorAll('#side [data-id^="power:"], #side button')].filter(b => /Ящик|Града|Supply|Grad/.test(b.textContent)).length;
  enterFPS(); await sleep(400);
  step('support');
  // ---------- tips
  R.tipsDone = Object.keys(T78.done).join(',');
  R.hintCur = HINTS.cur ? HINTS.cur.id : null;
  // ---------- artifact pickup
  A78.arts.push({ kind: 'grav', dir: norm(c.pos), pos: add(c.pos, mul(c.up, 0.3)), t: 0, life: 240 });
  await sim(0.3); R.art = A78.art && A78.art.k; R.jetBoost = c.jet && c.jet.a78 ? +(c.jet.emax).toFixed(2) : null;
  await sleep(200); await shot(O + '13_artifact.jpg');
  // settings toggle present
  MENU.show('settings', true); await sleep(400);
  R.setA78 = document.querySelectorAll('#screen [data-p74tog="a78"]').length;
  if (TOUCH.on && typeof P71M !== 'undefined' && P71M.on()){ MENU.show('p71s_game', true); await sleep(300); R.setA78 = document.querySelectorAll('#screen [data-p74tog="a78"]').length; }
  await shot(O + '14_settings.jpg');
  MENU.show('main'); await sleep(300);
  R.stats = A78.stats; R.s78 = S78.stats; R.aErr = A78.err; R.sErr = S78.err;
  R.radio = radio.filter(x => /номал|Аномал|Ящик|ящик|Град|болт/.test(x)).slice(0, 8);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
R.errs = errs.slice(0, 8); R.warns = warns.filter(w => /a78|s78|t78|Uncaught|TypeError/.test(w)).slice(0, 8);
return R;
