// v7.9 robo-ninja — features (PC and phone). Own Chrome 9360.
const R = { steps: [] };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const warns = []; { const cw = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 400)); cw.apply(console, a); }; }
const ph = TOUCH.on ? 'ph' : 'pc';
const O = 'D:/AI/pm_v6/shots_ninja/' + ph + '_';
const step = s => R.steps.push(s + ' @' + Math.round(performance.now() / 1000));
const sim = async (sec, dt) => { dt = dt || 0.05; for (let t = 0; t < sec; t += dt){ update(dt); AU.process(S.events); } };
const freezeShot = async (name, ms) => { CAMFX.fly = null; const cl = document.getElementById('clicklock'); if (cl) cl.style.display = 'none'; S.paused = true; setupCamera(0.016); await sleep(Math.max(1400, ms || 0)); await shot(O + name + '.jpg'); S.paused = false; };
const front = (u, d, side) => { const up = norm(u.pos), f = tangent(u.fwd, up), r = norm(cross(f, up)); return surfacePoint(offsetOnSphere(up, add(mul(f, d), mul(r, side || 0)), Math.hypot(d, side || 0)), 0.5); };
const look = (u, p) => { const f = tangent(sub(p, u.pos), u.up); u.fwd = norm(add(f, mul(u.up, -0.15))); u.aim = u.fwd; };
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  SET.denUser = true; if (typeof DEN75 !== 'undefined' && DEN75.style()) DEN75.set(0);
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (TUT.on && TUT.finish) TUT.finish();
  await sleep(300);
  // ---------- unlock flow
  R.lock0 = [canProduce(0, 'nj79r'), canProduce(0, 'nj79')];
  const fb = makeBuilding('factory', 0, offsetOnSphere(BASES[0], anyTangent(BASES[0]), 60)); fb.built = 1; fb.done = true; fb.hp = fb.maxhp;
  R.lock1 = canProduce(0, 'nj79r');
  finishProduct(S.hq[0], 'nj79r');
  R.lock2 = [S.teams[0].nj79r, canProduce(0, 'nj79')];
  finishProduct(S.hq[0], 'nj79');
  let a = NJ.of(0); R.spawned0 = !!a; R.lock3 = canProduce(0, 'nj79');
  R.inProducts = ['nj79r', 'nj79'].map(k => PRODUCTS[k].at.join('/'));
  let b = NJ.spawn(1);
  step('unlock');
  // ---------- AUTO mode (both AI): zones cycle
  const zl = [[], []];
  for (let s = 0; s < 80; s++){
    await sim(1);
    [a, b] = [NJ.of(0) || NJ.spawn(0), NJ.of(1) || NJ.spawn(1)];
    for (const [i, u] of [[0, a], [1, b]]){ const z = u.nj && u.nj.zone; if (z && zl[i][zl[i].length - 1] !== z.name) zl[i].push(z.name); }
  }
  R.zones = zl.map(z => z.slice(0, 12)); R.nZones = zl.map(z => z.length);
  R.stAuto = JSON.parse(JSON.stringify(NJ.stats));
  step('auto');
  // ---------- possess (Commander) + 3rd person + auto toggle
  a = NJ.of(0) || NJ.spawn(0); b = NJ.of(1);
  if (b) destroy(b, null);   // no duel for now
  NJ.duelCd = 999;
  takeControl(a); a.hp = a.maxhp; CAMFX.fly = null; S.autoRes = false; S.scale = 0.75; resize(); await sleep(1500);
  R.third = S.third; R.autoDefault = NJ.autoP; NJ.toggleAuto(false); R.autoAfter = NJ.autoP;
  R.meshItems = ST70.items.filter(i => i.nj).length; R.sdfHidden = (() => { const i = renderList.findIndex(o => o.e === a); return i < 0 ? 'n/a' : OBJ[i * 28 + 3] < 0; })();
  await freezeShot('01_ninja_back');
  // side view of the model: freecam-like override for one frame
  { const up = norm(a.pos), f = tangent(a.fwd, up), r = norm(cross(f, up)); S.camOverride = true; S.paused = true;
    const cp = add(add(a.pos, mul(up, 0.6)), add(mul(f, 2.6), mul(r, 1.3))); S.cam = Object.assign({ pos: cp, fov: S.cam.fov }, camBasis(norm(sub(add(a.pos, mul(up, 0.4)), cp)), up));
    const sc0 = setupCamera; setupCamera = () => {}; await sleep(1600); await shot(O + '02_ninja_front.jpg'); setupCamera = sc0; S.camOverride = false; S.paused = false; }
  step('possess');
  if (TOUCH.on){   // phone: buttons, tap on an enemy = dash + cut, swipe = slash, AUTO button
    if (S.me !== a) takeControl(a); CAMFX.fly = null; a.hp = a.maxhp; await sleep(600);
    R.phState = { me: S.me === a, ctrl: !!NJ.ctrl(), busy: CAMFX.busy(), alive: a.alive, menu: MENU.isOpen(), mode: S.mode, gestures: !!NJUI.el };
    const el = document.getElementById('nj79'), rr = el && el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    R.phoneBtns = rr && { x: rr.left | 0, y: rr.top | 0, w: rr.width | 0, h: rr.height | 0, disp: getComputedStyle(el).display, distCenter: Math.round(Math.hypot(rr.left + rr.width / 2 - W / 2, rr.top + rr.height / 2 - H / 2)) };
    R.relabel = [...document.querySelectorAll('#touch button small')].map(s => s.textContent).filter(Boolean).slice(0, 14);
    const en = S.units.find(u => u.alive && u.team === 1 && u.role !== 'ninja');
    if (en){ en.pos = front(a, 8); en.vel = [0, 0, 0]; look(a, en.pos); CAMFX.fly = null; S.paused = true; setupCamera(0.016); await sleep(1300);
      const s = project(centerOf(en)), d0 = NJ.stats.dashStrikes, t0 = NJUI.taps;
      const touch = (type, id, x, y, tg) => { const t = new Touch({ identifier: id, target: tg, clientX: x, clientY: y }); tg.dispatchEvent(new TouchEvent(type, { changedTouches: [t], touches: type === 'touchend' ? [] : [t], bubbles: true, cancelable: true })); };
      if (s){ R.tapEl = (el => el && el.tagName + '#' + el.id)(document.elementFromPoint(s[0], s[1])); touch('touchstart', 21, s[0], s[1], canvas); touch('touchend', 21, s[0], s[1], canvas); }
      S.paused = false; await sim(0.3);
      R.tapEnemy = { at: s && [s[0] | 0, s[1] | 0], taps: NJUI.taps - t0, dash: NJ.stats.dashStrikes - d0 };
      { const s0 = NJUI.swipes, sw0 = NJ.stats.swings || 0; await sim(0.8); touch('touchstart', 22, W * 0.66, H * 0.55, canvas); touch('touchend', 22, W * 0.66 + 130, H * 0.5, canvas); await sim(0.2); R.swipe = { swipes: NJUI.swipes - s0, swings: (NJ.stats.swings || 0) - sw0 }; }
      { const ab = document.querySelector('#nj79 [data-nj="auto"]'), before = NJ.autoP; touch('touchstart', 23, 0, 0, ab); R.autoBtn = [before, NJ.autoP]; if (NJ.autoP) NJ.toggleAuto(false); }
      { const bb = document.querySelector('#nj79 [data-nj="block"]'); touch('touchstart', 24, 0, 0, bb); await sim(0.2); R.blockBtn = a.nj.block; touch('touchend', 24, 0, 0, bb); await sim(0.1); R.blockBtnUp = a.nj.block; }
    }    await freezeShot('02b_phone_hud');
  }
  // ---------- katana + dismemberment
  const cut0 = NJ.stats.cuts, cuts = [];
  for (let round = 0; round < 3; round++){
    const sq = S.squads.filter(s => s.team === 1 && !s.solo && s.units.some(u => u.alive)).sort((p, q) => dist(p.units[0].pos, a.pos) - dist(q.units[0].pos, a.pos))[0];
    if (!sq) break;
    const v = sq.units.filter(u => u.alive).slice(0, 2);
    v.forEach((u, i) => { u.pos = front(a, 3.0, (i ? 1 : -1) * 0.7); u.vel = [0, 0, 0]; u.hp = min(u.hp, 60 + round * 30); u.target = null; });
    look(a, v[0].pos); a.vel = [0, 0, 0];
    a.nj.comboT = round === 0 ? -9 : S.time; a.nj.combo = round - 1;
    const c0 = NJ.stats.cuts;
    for (let k = 0; k < 60 && NJ.stats.cuts === c0; k++){ NJ.strikeInput(a); await sim(0.05); }
    await sim(0.12);
    cuts.push(NJ.lastCut && NJ.lastCut.cut);
    await freezeShot('03_cut_' + round, 600);
    await sim(0.6);
    if (round === 0) await freezeShot('04_parts_fall', 500);
  }
  R.cuts = NJ.stats.cuts - cut0; R.cutKinds = cuts; R.pieces = NJ.pieces.length;
  step('cut');
  // ---------- manual moves
  { const p0 = a.pos, e0 = a.energy; look(a, front(a, 10)); keys[SET.bind.run] = true; await sim(0.05); keys[SET.bind.run] = false; await sim(0.3); R.blink = { moved: +dist(p0, a.pos).toFixed(1), energy: +(e0 - a.energy).toFixed(2) }; }
  { keys[SET.bind.jump] = true; await sim(0.1); keys[SET.bind.jump] = false; await sim(0.25); const air = !a.grounded; keys[SET.bind.jump] = true; await sim(0.05); R.doubleJump = { air, jumps: a.nj.jumps, wall: !!a.nj.wall }; keys[SET.bind.jump] = false; await sim(1.2); }
  { const sh0 = NJ.stats.shur; keys[SET.bind.rocket] = true; await sim(0.05); keys[SET.bind.rocket] = false; R.shur = NJ.stats.shur - sh0; await sim(0.3); }
  { const en = S.units.find(u => u.alive && u.team === 1 && !u.role.startsWith('ninja')); if (en){ en.pos = front(a, 12); look(a, en.pos); mouseR = true; NJ.touchBlock = TOUCH.on; await sim(0.4); const h0 = a.hp; damage(a, 20, en, 'b'); R.blockBullet = { block: a.nj.block, hpLost: +(h0 - a.hp).toFixed(1), deflects: NJ.stats.deflects }; mouseR = false; NJ.touchBlock = false; await sim(0.1); } }
  { mouseL = true; await sim(0.55); R.heavy = a.nj.atk && a.nj.atk.k; await freezeShot('05_heavy_windup', 400); mouseL = false; await sim(1.2); }
  { const p0 = a.pos, up = norm(a.pos); a.fwd = norm(add(tangent(a.fwd, up), mul(up, -0.06))); a.aim = a.fwd; CAMFX.fly = null; setupCamera(0.016); NJ.N(a).teleCd = 0; playerGrenade(); R.teleCharge = a.nj.tp && a.nj.tp.ph; await sim(0.5); await freezeShot('06_teleport_charge', 400); await sim(1.2); R.teleDist = +dist(p0, a.pos).toFixed(1); }
  step('manual');
  // ---------- AUTO while possessed
  NJ.toggleAuto(true); const z0 = NJ.stats.zones[0], k0 = NJ.stats.kills[0];
  for (let s = 0; s < 30; s++){ await sim(1); if (s === 12){ setupCamera(0.016); await freezeShot('07_auto_possessed', 500); } }
  R.autoPossessed = { zones: NJ.stats.zones[0] - z0, kills: NJ.stats.kills[0] - k0, zone: a.alive && a.nj.zone && a.nj.zone.name, alive: a.alive };
  step('autoP');
  // ---------- DUEL
  a = NJ.of(0) || NJ.spawn(0); if (S.me !== a){ takeControl(a); CAMFX.fly = null; await sleep(800); }
  a.hp = a.maxhp; NJ.duelCd = 0;
  b = NJ.spawn(1); b.pos = front(a, 9); b.vel = [0, 0, 0]; for (const u of [a, b]){ Object.assign(u.nj, { zone: null, tp: null, hidden: false, home: false, teleCd: 6, atk: null }); }
  const d0 = { ...NJ.stats };
  let teleShot = false, hudShot = false;
  for (let k = 0; k < 600 && a.alive && b.alive; k++){
    await sim(0.05);
    if (NJ.duel && !hudShot){ hudShot = true; await freezeShot('08_duel_start', 500); }
    if (NJ.duel && !teleShot && b.nj.atk && b.nj.atk.A.tele && b.nj.atk.t > b.nj.atk.A.h0 * 0.5){ teleShot = true; await freezeShot('09_duel_telegraph', 500); }
    if (!NJ.duel && k > 100 && NJ.stats.duels > d0.duels) break;
  }
  R.duel = { started: NJ.stats.duels - d0.duels, parries: NJ.stats.parries - d0.parries, blocks: NJ.stats.blocks - d0.blocks, breaks: NJ.stats.postureBreaks - d0.postureBreaks, blinks: NJ.stats.blinks - d0.blinks, wins: NJ.stats.duelWins, alive: [a.alive, b.alive], hp: [a.hp | 0, b.hp | 0], teleShot, hudShot, on: !!NJ.duel };
  step('duel');
  // ---------- RTS: map marker, order to a zone, Commander possess
  NJ.duelEnd(null); NJ.duelCd = 999; const bb = NJ.of(1); if (bb) destroy(bb, null);
  a = NJ.of(0) || NJ.spawn(0); a.nj.tp = null; a.nj.teleCd = 0; a.nj.home = false;
  enterRTS(); S.sel.clear(); S.sel.add(a.squad);
  const cp = S.cps.filter(c => !c.core).sort((p, q) => dist(q.pos, a.pos) - dist(p.pos, a.pos))[0];
  const dA = dist(a.pos, cp.pos); setOrder(a.squad, 'move', cp.pos, { by: 'player', lock: 120 });
  await sim(3);
  R.rtsOrder = { from: Math.round(dA), to: Math.round(dist(a.pos, cp.pos)), zone: a.nj.zone && a.nj.zone.name, icon: cardGroupIcon(a.squad), label: groupLabel(a.squad) };
  S.rts.dir = norm(a.pos); await sleep(4000); await shot(O + '10_rts.jpg');
  enterFPS(a); CAMFX.fly = null; await sleep(800); R.rePossess = S.me === a && S.third;
  step('rts');
  R.ms = +NJ.stats.ms.toFixed(3); R.msMax = +NJ.stats.msMax.toFixed(2); R.st70 = ST70.failed ? ST70.err : 'ok';
  R.stats = NJ.stats;
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 900); }
R.errs = errs.slice(0, 12); R.warns = warns.filter(w => /nj79|ST70|NJ/.test(w)).slice(0, 10);
return R;
