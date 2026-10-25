// v7.1: «Полигон» (режим разработчика) — ПК мышью и телефон касанием.  node cdp71.js v71_polytest.js --vp 1280x720 --reload  (--phone)
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const tag = 'D:/AI/pm_v6/shots/v71_poly_' + (TOUCH.on ? 'phone' : 'pc') + '_';
const click = el => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, detail: 1 })); };
const tapEl = async el => { el.scrollIntoView({ block: 'center' }); await sleep(80); const r = el.getBoundingClientRect(); if (TOUCH.on){ await T.tap(r.left + r.width / 2, r.top + r.height / 2, 70); } else click(el); await sleep(250); };
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  // вне режима разработчика полигон не включается
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  POLY71.start(); ok('no_effect_outside_dev', !POLY71.on && !S.squads.some(g => g.poly71));
  const g0 = S.squads.length + S.vehicles.length + S.drones.length;
  // режим разработчика → Арсенал → «Полигон: ВКЛ»
  DEV.start(); await sleep(800);
  DEV.panel(true); await sleep(200);
  const pb = document.querySelector('#devPan [data-dv71="poly"]');
  ok('arsenal_button', !!pb && /Полигон/.test(pb.textContent));
  await tapEl(pb);
  ok('poly_on', POLY71.on && /ВКЛ/.test((document.querySelector('#devPan [data-dv71="poly"]') || {}).textContent || ''));
  const sl = POLY71.slots;
  const sqN = t => sl.filter(s => s.team === t && s.kind === 'sq' && s.g).length, vN = (t, k) => sl.filter(s => s.team === t && s.kind === k && s.g && s.g.alive).length;
  ok('squads_both', sqN(0) === 4 && sqN(1) === 4, [sqN(0), sqN(1)]);
  ok('roles_all', ['assault', 'heavy', 'rocket', 'sniper', 'medic', 'scout'].every(r => sl.some(s => s.kind === 'sq' && s.team === 1 && s.g.units.some(u => u.role === r))));
  ok('veh_2each', ['tank', 'raider', 'mlrs', 'cat', 'drone'].every(k => vN(0, k) === 2 && vN(1, k) === 2), ['tank', 'raider', 'mlrs', 'cat', 'drone'].map(k => vN(0, k) + '/' + vN(1, k)));
  const c = mul(POLY71.c, RM);
  ok('center_neutral', abs(POLY71.c[1]) < 0.05 && dist(c, mul(BASES[0], RM)) > 500 && dist(c, mul(BASES[1], RM)) > 500);
  DEV.panel(false);
  // бой идёт: через 25 с есть потери, подкрепления их восполняют
  const k0 = S.stats.kills[0] + S.stats.kills[1];
  // вселиться в бойца на полигоне (X)
  if (S.mode !== 'fps') enterFPS();
  switchUnit(1); await sleep(300);
  const me = ctrlEntity();
  ok('x_into_polygon', me && me.cls === 'inf' && me.squad && me.squad.poly71 && dist(me.pos, c) < 120, me && dist(me.pos, c));
  await sleep(2500); await shot(tag + 'fps.jpg');
  enterRTS(); flyCamTo(c); S.rts.hT = 120; await sleep(2500); await shot(tag + 'rts.jpg');
  await sleep(20000);
  const k1 = S.stats.kills[0] + S.stats.kills[1];
  let dead = 0; for (const s of sl) if (s.kind === 'sq' && s.g) dead += 4 - s.g.units.filter(u => u.alive).length;
  ok('battle_losses', k1 > k0, [k0, k1]);
  // уничтожить всю машину слота — через 6 с новая
  { const s = sl.find(q => q.team === 1 && q.kind === 'tank'), v = s.g; destroy(v, null); await sleep(7500);
    ok('reinforce_vehicle', s.g && s.g !== v && s.g.alive); }
  { const s = sl.find(q => q.team === 0 && q.kind === 'sq'), sq = s.g; for (const u of sq.units) if (u.alive && u !== S.me) destroy(u, null); if (S.me && S.me.squad === sq) destroy(S.me, null); await sleep(5500);
    ok('reinforce_squad', s.g && s.g !== sq && groupAlive(s.g)); }
  ok('no_victory', !S.over);
  ok('units_stay', sl.filter(s => s.g && groupAlive(s.g)).every(s => { const L = leaderPos(s.g); return L && dist(L, c) < 260; }), sl.filter(s => s.g && groupAlive(s.g)).map(s => Math.round(dist(leaderPos(s.g), c))).filter(d => d >= 260));
  // кнопка «Вселиться на полигоне»
  enterFPS(); DEV.panel(true); await sleep(200); await tapEl(document.querySelector('#devPan [data-dv71="go"]')); await sleep(300);
  ok('possess_button', ctrlEntity() && ctrlEntity().squad && ctrlEntity().squad.poly71);
  // выключить: полигон отпускает бойцов
  DEV.panel(true); await sleep(200); await tapEl(document.querySelector('#devPan [data-dv71="poly"]'));
  ok('poly_off', !POLY71.on && !POLY71.slots.length);
  DEV.panel(false);
  R.fps = Math.round(fpsVal); R.units = S.units.length;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
