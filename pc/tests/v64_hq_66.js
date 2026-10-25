// v6.4: инженер только из штаба, стройка закрыта без инженера, панели зданий
const out = { errors: [], checks: {} };
const ok = (k, v) => { out.checks[k] = v ? 'OK' : 'FAIL'; if (!v) out.errors.push(k); };
const ids = () => SIDE.btns.map(b => b.id);
const key = code => { dispatchEvent(new KeyboardEvent('keydown', { code, key: code })); dispatchEvent(new KeyboardEvent('keyup', { code, key: code })); };
const step = (sec, until) => { for (let i = 0; i < sec * 30; i++){ update(1 / 30); if (until && until()) return; } };
try {
  MENU.newGame(); if (TUT.on) TUT.finish();
  await sleep(400); enterRTS(); await sleep(400);
  S.teams[0].ai = false; S.teams[0].ore = 3000;
  // 1) без инженера — вкладка «Стройка» закрыта
  S.sel.clear(); S.selB = null; SIDE.pb = null; SIDE.tab = 'build'; buildSidebar();
  out.noBuilder = { btns: ids(), gate: !!document.querySelector('#side .bgate'), sel: !!document.querySelector('#side [data-cur="selbuilder"]') };
  ok('build_gate_without_builder', out.noBuilder.gate && !ids().some(x => x.startsWith('build:')));
  ok('no_builder_in_build_tab', !ids().includes('prod:builder'));
  // 2) кнопка «выбрать ближайшего инженера»
  document.querySelector('#side [data-cur="selbuilder"]').click(); await sleep(300);
  out.afterPick = { sel: selBuilders().length, build: ids().filter(x => x.startsWith('build:')).length };
  ok('pick_builder_opens_build', out.afterPick.sel > 0 && out.afterPick.build >= 7);
  // 3) снятие выделения — панель снова закрыта (кадр пересобирает панель)
  S.sel.clear(); await sleep(500);
  ok('gate_back_after_deselect', !!document.querySelector('#side .bgate'));
  // 4) клавиша стройки без инженера: сама выбирает ближайшего и включает чертёж
  key('KeyC'); await sleep(300);
  out.hotkey = { place: S.place, sel: selBuilders().length };
  ok('hotkey_picks_builder', S.place === 'extractor' && selBuilders().length > 0);
  S.place = null; S.sel.clear();
  // 5) выбор штаба — панель штаба с инженером
  S.selB = S.hq[0]; await sleep(500);
  out.hq = { tab: SIDE.tab, pb: SIDE.pb === S.hq[0], btns: ids() };
  ok('hq_select_opens_panel', SIDE.tab === 'prod' && SIDE.pb === S.hq[0] && ids().includes('prod:builder') && !ids().includes('prod:squad'));
  const q0 = S.hq[0].queue.filter(k => k === 'builder').length;
  SIDE.btns.find(b => b.id === 'prod:builder').el.click(); await sleep(200);
  ok('order_builder_from_hq', S.hq[0].queue.filter(k => k === 'builder').length === q0 + 1);
  // 6) заказ инженера «в обход» (старый путь uiProduce) — не заказывает, а открывает панель штаба
  SIDE.tab = 'cmd'; SIDE.pb = null; S.selB = null; buildSidebar();
  const n0 = countQueued(0, ['builder']);
  uiProduce('builder'); await sleep(200);
  out.redirect = { tab: SIDE.tab, pb: SIDE.pb === S.hq[0], queued: countQueued(0, ['builder']) - n0 };
  ok('builder_only_via_hq_panel', out.redirect.tab === 'prod' && out.redirect.pb && out.redirect.queued === 0);
  // 7) мехзавод: своя панель (танки, техника), без инженера
  { const b66 = makeBuilding('barracks', 0, findSite(0, 'barracks')); finishSite(b66); }   // v6.6: Мехзавод требует Казарму
  const dir = findSite(0, 'factory');
  S.sel.clear(); for (const b of teamBuilders(0)) S.sel.add(b);
  const why = dir ? playerPlace('factory', dir, false) : 'no site';
  if (!why){ finishSite(S.lastSite); const f = S.lastSite; S.sel.clear(); S.selB = f; await sleep(500);
    out.factory = { tab: SIDE.tab, pb: SIDE.pb === f, btns: ids() };
    ok('factory_panel', SIDE.pb === f && ids().includes('prod:tank') && !ids().includes('prod:builder'));
    const tq = f.queue.length; SIDE.btns.find(b => b.id === 'prod:tank').el.click(); await sleep(200);
    ok('factory_order_goes_to_factory', f.queue.length === tq + 1);
    // F2 — следующее здание
    key('F2'); await sleep(300); out.f2 = v64BName(SIDE.pb || S.hq[0]);
    ok('f2_cycles_buildings', SIDE.pb && SIDE.pb !== f);
  } else out.errors.push('factory place: ' + why);
  // 8) список зданий
  SIDE.pb = null; SIDE.tab = 'prod'; buildSidebar();
  out.list = [...document.querySelectorAll('#side .pbsel')].map(e => e.dataset.cur);
  ok('building_list', out.list.includes('pb-hq'));
  // 9) старые сохранения грузятся
  if (typeof SAVE !== 'undefined'){ const okS = SAVE.save('m3'); const okL = SAVE.load('m3'); buildSidebar(); out.save = { okS, okL }; ok('save_load', okS && okL); SAVE.del('m3'); }
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
await shot('D:/AI/pm_v6/shots/v64_pc_hq_panel.jpg');
return out;
