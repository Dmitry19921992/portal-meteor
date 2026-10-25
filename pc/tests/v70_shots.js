// v7.0: скриншоты для листа (стартовый состав, постройки по уровням, штаб, падения). node cdp70.js v70_shots.js --vp 1280x720 --reload
const R = {}, D = 'D:/AI/pm_v6/shots/';
const st = document.createElement('style'); st.textContent = 'body.shot70 > *:not(#c){visibility:hidden!important}'; document.head.appendChild(st);
const clean = on => document.body.classList.toggle('shot70', on);
const look = async (pos, at, name, ms) => { S.camOverride = { pos, look: at }; await sleep(ms || 700); clean(true); await sleep(250); await shot(D + name); clean(false); };
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1200);
  DEV.enter(); await sleep(200);
  for (const T of S.teams) T.waveT = T.skyT = T.podT = 1e9;
  S.third = true;   // без оружия в руках в кадре
  // ---- стартовый состав у базы (сверху сбоку)
  { const B = BASES[0], X = anyTangent(B), Z = norm(cross(X, B));
    const ros = [...S.vehicles, ...S.drones, ...S.units].filter(e => e.team === 0 && e.ros70);
    let c = [0, 0, 0]; for (const e of ros) c = add(c, e.pos); c = mul(c, 1 / max(1, ros.length));
    const out = norm(sub(c, mul(B, RM)));
    await look(add(add(c, mul(norm(c), 24)), mul(out, 30)), add(c, mul(out, -4)), 'v70_s_roster.jpg', 1500);
    R.ros = ros.length; }
  // ---- форпосты по веткам: уровень I и II
  const mk = ang => { let d0 = null; for (let k = 0; k < 24; k++){ const d = offsetOnSphere(BASES[0], rotAxis(anyTangent(BASES[0]), BASES[0], ang + k * 0.06), 82 + (k % 4) * 10); d0 = d0 || d; if (!siteProblem(0, 'outpost', d)){ d0 = d; break; } } const b = makeBuilding('outpost', 0, d0); finishSite(b); return b; };
  const ops = { def: mk(0.4), sup: mk(2.5), rec: mk(4.4) };
  for (const br of ['def', 'sup', 'rec']){
    const b = ops[br]; if (!b) continue;
    const w = BASE70.tw(b); w.br = br;
    const fr = BASE70.slots(b).fr, at = add(b.pos, mul(fr.Y, br === 'rec' ? 5 : 2.5));
    const k = br === 'sup' ? 1.05 : br === 'def' ? 0.85 : 0.62; const cam = add(add(b.pos, mul(fr.Y, (br === 'sup' ? 21 : br === 'rec' ? 12 : 9))), add(mul(fr.X, -24 * k), mul(fr.Z, -22 * k)));
    for (const t of [1, 2]){
      w.tier = t; if (br === 'rec') b.visR = t === 2 ? 190 : 150;
      if (br === 'def'){ const sq = spawnSquad(1, false, add(b.pos, mul(fr.Z, -40)), 1, ['assault']); sq.units[0].hp = 9999; }
      await look(cam, at, `v70_s_${br}${t}.jpg`, 1600);
    }
  }
  // стройка: постройка «вырастает»
  { const b = ops.rec; if (b){ const w = BASE70.tw(b); w.tier = 1; w.job = { tier: 2, t: 6, T: 20, cost: 0 }; const fr = BASE70.slots(b).fr; await look(add(add(b.pos, mul(fr.Y, 15)), add(mul(fr.X, -24), mul(fr.Z, -22))), add(b.pos, mul(fr.Y, 4)), 'v70_s_build.jpg', 600); w.job = null; w.tier = 2; } }
  // ---- штаб со всеми улучшениями
  DEV.hqAll(); await sleep(300);
  { const F = BASE70.hqFrame(0), c0 = mul(BASES[0], RM + 4);
    await look(add(add(c0, mul(F.Y, 42)), add(mul(F.X, -50), mul(F.Z, -40))), add(c0, mul(F.Y, 2)), 'v70_s_hq.jpg', 1500);
    await look(add(add(c0, mul(F.Y, 9)), add(mul(F.X, -20), mul(F.Z, 16))), add(c0, mul(F.Y, 3)), 'v70_s_hq2.jpg', 900); }
  // ---- падение от взрыва: три бота
  S.camOverride = null;
  { const me = ctrlEntity(), f = tangent(me.fwd, me.up), r = norm(cross(f, me.up));
    const sq = spawnSquad(0, false, add(me.pos, mul(f, 12)), 3, ['assault', 'heavy', 'rocket']); sq.order = 'hold'; sq.manualUntil = 1e9;
    for (const u of sq.units){ u.hp = u.maxhp = 9999; u.cd = 99; }
    await sleep(600);
    const c = sq.units.reduce((a, u) => add(a, u.pos), [0, 0, 0]).map(x => x / sq.units.length); sq.goal = c;
    for (const u of sq.units){ u.pos = add(c, mul(sub(u.pos, c), 0.6)); u.vel = [0, 0, 0]; u.cd = 99; }
    const camP = add(add(c, mul(norm(c), 1.8)), add(mul(f, -6), mul(r, 2.6)));
    S.camOverride = { pos: camP, look: add(c, mul(norm(c), 0.8)) }; await sleep(400);
    const bp = add(c, mul(norm(c), 0.4));
    for (const u of sq.units){ const d = dist(centerOf(u), bp); R['d_' + u.role] = +d.toFixed(2); }
    knockback(bp, 95, 4); addWave(bp, 1.2, 0.4); burst(bp, 14, 8); addLight(bp, [9, 5, 2], 14, 0.25, 0.01);
    await sleep(330); clean(true); await sleep(40); await shot(D + 'v70_s_kd_bots.jpg'); clean(false);
    R.kd0 = sq.units.map(u => u.kd70 ? u.kd70.lv : 0);
    await sleep(900); clean(true); await shot(D + 'v70_s_kd_getup.jpg'); clean(false);
    R.kd = sq.units.map(u => u.kd70 ? u.kd70.lv : 0);
    S.camOverride = null;
    for (const u of sq.units) if (u.alive) destroy(u, null);
  }
  await sleep(500);
  S.third = false; await sleep(300);
  { const me = ctrlEntity(); me.kd70 = null; const hint = [...document.querySelectorAll('body *')].filter(e => !e.children.length && /Кликни, чтобы вернуться|Esc — меню/.test(e.textContent)); hint.forEach(e => e.style.visibility = 'hidden'); const bp = add(me.pos, add(mul(tangent(me.fwd, me.up), 1.2), mul(me.up, 0.2))); knockback(bp, 130, 4); burst(bp, 10, 7); addWave(bp, 1.2, 0.4); await sleep(300); await shot(D + 'v70_s_kd_fp.jpg'); hint.forEach(e => e.style.visibility = ''); }
  R.ok = true; R.fps = Math.round(fpsVal);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
S.camOverride = null; clean(false);
return R;
