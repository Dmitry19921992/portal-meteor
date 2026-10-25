// v6.6 core: цепочка производства, ручное/автономно, бот не тратит в стратегии, два вида добычи
const out = { errors: [], checks: {}, info: {} };
const ok = (k, v, info) => { out.checks[k] = v ? 'OK' : 'FAIL'; if (!v) out.errors.push(k + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
const step = n => { for (let i = 0; i < n; i++) update(0.05); };
try {
  MENU.newGame(); await sleep(400); if (TUT.on) TUT.finish();
  // ---------- 1. штаб — только инженеры
  const hp = v64Prods(S.hq[0]);
  ok('hq_only_builders', hp.includes('builder') && !hp.some(k => !PRODUCTS[k].research && k !== 'builder'), hp);
  ok('squad_needs_barracks', /Казарм|Barracks|Doanh/.test(canProduce(0, 'squad') || ''), canProduce(0, 'squad'));
  ok('factory_needs_barracks', /Казарм|Barracks|Doanh/.test(rtsReason('build:factory').reason || ''), rtsReason('build:factory').reason);
  S.time = 10; ok('airdock_time_lock', !rtsReason('build:airdock').ok && /Откро|Unlock|Mở|Нужн|Requ/.test(rtsReason('build:airdock').reason), rtsReason('build:airdock').reason);
  ok('outpost_builder', PRODUCTS.builder.at.includes('outpost') && !PRODUCTS.squad.at.includes('outpost'));
  // ---------- стратегия: ручная казарма
  S.teams[0].ore = 2000; S.teams[1].ai = false;
  enterRTS(); await sleep(200);
  const T0 = S.teams[0];
  const b0 = teamBuilders(0)[0];
  S.sel.clear(); S.sel.add(b0);
  const why = playerPlace('barracks', findSite(0, 'barracks'), false);
  ok('barracks_placed', !why, why);
  step(700);
  const bar = S.buildings.find(b => b.team === 0 && b.type === 'barracks');
  ok('barracks_built', bar && bar.done, bar && bar.built);
  ok('barracks_prods', v64Prods(bar).includes('squad') && v64Prods(bar).includes('heavy1'), v64Prods(bar));
  const nSq = S.squads.filter(s => s.team === 0).length;
  ok('barracks_order', produceAt(bar, 'squad') === true);
  step(240);
  const sqs = S.squads.filter(s => s.team === 0);
  const made = sqs[sqs.length - 1];
  ok('barracks_produced', sqs.length === nSq + 1 && surfDist(leaderPos(made), bar.pos) < 40, { n: sqs.length, d: made && Math.round(surfDist(leaderPos(made), bar.pos)) });
  // ---------- 3. новые юниты — ручные
  ok('new_unit_manual', made.auto66 === false && made.manualUntil > 1e8 && (made.order === 'hold' || made.order === 'move'), { a: made.auto66, o: made.order });
  const p0 = leaderPos(made).slice();
  S.teams[0].ai = true; step(200);
  ok('manual_stays', surfDist(leaderPos(made), p0) < 12 && made.order === 'hold', { d: Math.round(surfDist(leaderPos(made), p0)), o: made.order });
  // АВТОНОМНО
  S.sel.clear(); S.sel.add(made); toggleAuto66();
  ok('auto_on', made.auto66 === true && made.manualUntil < S.time);
  step(120);
  ok('auto_acts', made.order !== 'hold' && made.order !== 'idle', made.order);
  toggleAuto66();
  ok('auto_off', made.auto66 === false && made.manualUntil > 1e8 && made.order === 'hold', made.order);
  // приказ = ручное
  S.sel.clear(); S.sel.add(made); toggleAuto66(); setOrder(made, 'move', leaderPos(made), { by: 'player', lock: 120 });
  ok('order_takes_manual', made.auto66 === false && made.manualUntil > 1e8);
  // ---------- FPS → RTS: все автономны и остаются
  enterFPS(); step(10);
  ok('fps_all_auto', groupsOf(0).every(isAuto66) && teamBuilders(0).every(isAuto66) && made.auto66 === true);
  enterRTS(); step(10);
  ok('rts_stays_auto', groupsOf(0).every(isAuto66) && made.auto66 === true);
  // ---------- 2b. бот не тратит руду игрока в стратегии
  for (const g of groupsOf(0)){ g.auto66 = false; g.manualUntil = 1e9; }
  S.teams[0].ai = true; S.teams[0].autoBuild = true;
  const q0 = [S.hq[0], ...S.buildings.filter(b => b.team === 0)].reduce((n, s) => n + (s.queue || []).length, 0);
  const sites0 = S.buildings.filter(b => b.team === 0).length, ore0 = T0.ore, cmd0 = T0.cmd;
  const units0 = S.units.filter(u => u.team === 0 && u.alive).length;
  let inc = 0; for (let i = 0; i < 1200; i++){ update(0.05); inc += T0.income * 0.05; }
  const q1 = [S.hq[0], ...S.buildings.filter(b => b.team === 0)].reduce((n, s) => n + (s.queue || []).length, 0);
  out.info.bot = { ore0: Math.round(ore0), ore1: Math.round(T0.ore), inc: Math.round(inc), cry: T0.g66tot || 0, q0, q1, sites0, sites1: S.buildings.filter(b => b.team === 0).length, cmd0, cmd1: T0.cmd };
  ok('bot_no_queue', q1 <= q0, { q0, q1 });
  ok('bot_no_sites', S.buildings.filter(b => b.team === 0).length <= sites0);
  ok('bot_no_spend', T0.ore >= ore0 + inc - 1, out.info.bot);
  // в шутере бот снова управляет экономикой
  enterFPS(); T0.ore = 2000; step(400);
  const q2 = [S.hq[0], ...S.buildings.filter(b => b.team === 0)].reduce((n, s) => n + (s.queue || []).length, 0);
  ok('bot_spends_in_fps', T0.ore < 2000 + 400 * 0.05 * 3 || q2 > 0 || S.buildings.filter(b => b.team === 0).length > sites0, { ore: Math.round(T0.ore), q2 });
  // ---------- 4. два вида добычи
  enterRTS(); step(5);
  const bb = teamBuilders(0)[1] || teamBuilders(0)[0];
  const f = g66NearestField(0, bb.pos);
  const am0 = f.amount, g0 = T0.g66tot || 0;
  g66Start(bb, f, true); step(800);
  ok('crystal_income', (T0.g66tot || 0) > g0 && f.amount < am0, { g: (T0.g66tot || 0) - g0, am: [am0, f.amount] });
  const v = veins().find(x => !veinProblem(0, x) && surfDist(x.dir, BASES[0]) < 130);
  S.sel.clear(); S.sel.add(bb); const ew = playerPlace('extractor', v.dir, false);
  step(800);
  const ex = S.buildings.find(b => b.team === 0 && b.type === 'extractor' && b.done);
  const E = ecoBreakdown(0);
  ok('extractor_income', !!ex && E.ext > 0 && E.nExt > 0, { ew, E });
  ok('hud_both', /◆\d+/.test(ecoHB(T0)) && /⛏\d+/.test(ecoHB(T0)));
  ok('builder_back_to_crystals', bb.order === 'gather' || bb.order === 'build', bb.order);
  // ---------- сохранение / загрузка (поля, автономность)
  SAVE.save('m3'); const am1 = f.amount;
  SAVE.load('m3'); await sleep(200);
  ok('save_fields', abs(fields66()[f.i].amount - am1) < 1, [am1, fields66()[f.i].amount]);
  SAVE.del('m3');
  // ---------- ИИ Роя по тем же правилам
  MENU.newGame(); await sleep(300); if (TUT.on) TUT.finish();
  S.teams[0].ai = true; S.teams[1].ai = true;
  const sq1 = S.squads.filter(s => s.team === 1).length;
  for (let i = 0; i < 6000; i++) update(0.05);
  const bar1 = S.buildings.filter(b => b.team === 1 && b.type === 'barracks');
  out.info.ai = { bar1: bar1.length, sq: S.squads.filter(s => s.team === 1).length, sq0: sq1, gath1: g66Gatherers(1).length, cry1: S.teams[1].g66tot || 0, blds: S.buildings.filter(b => b.team === 1).map(b => b.type).join(','), t: Math.round(S.time) };
  ok('ai_barracks', bar1.length > 0, out.info.ai);
  ok('ai_gathers', (S.teams[1].g66tot || 0) > 0, out.info.ai);
  ok('ai_no_squad_at_hq', !S.hq[1].queue.some(k => k !== 'builder' && !PRODUCTS[k].research));
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); }
return out;
