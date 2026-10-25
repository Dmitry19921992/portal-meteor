// v6.6: копия — + Склад и Казарма (Мехзавод/Дрон-хаб требуют Казарму, Аэродок — с 6:00). Инженеры: строят каждый тип здания, скорость от числа инженеров, отмена с возвратом, ремонт, сохранение/загрузка
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(1000); }
const out = { errors: [], types: {}, power: {}, cancel: null, repair: null, save: null, old: null };
const step = (sec, until) => { for (let i = 0; i < sec * 30; i++){ try { update(1 / 30); } catch (e){ out.errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]); return; } if (until && until()) return; } };
MENU.newGame(); if (TUT.on) TUT.finish(); enterRTS();
S.teams[0].ai = false; S.teams[1].ai = false;
const T = S.teams[0];
// 1) каждый тип здания: ставим чертёж, строят 2 стартовых инженера
S.time = 400;   // v6.6: Аэродок открывается с 6:00
for (const type of ['extractor', 'depot', 'barracks', 'turret', 'aa', 'outpost', 'factory', 'hub', 'airdock']){
  T.ore = 5000;
  const dir = type === 'extractor' ? (aiVein(0) || {}).dir : findSite(0, type);
  if (!dir){ out.types[type] = 'no site'; continue; }
  S.sel.clear(); for (const b of teamBuilders(0)) S.sel.add(b);
  const why = playerPlace(type, dir, false);
  if (why){ out.types[type] = 'place: ' + why; continue; }
  const site = S.lastSite, t0 = S.time;
  step(240, () => site.done);
  out.types[type] = site.done ? `ok ${Math.round(S.time - t0)}s (base ${BTYPES[type].time}s, walk incl.)` : `NOT DONE built=${site.built.toFixed(2)} builders=${teamBuilders(0).map(b => b.order).join(',')}`;
}
// 2) скорость: 1 / 2 / 4 инженера на одинаковой турели (инженеры уже рядом)
while (teamBuilders(0).length < 4) makeBuilder(0);
for (const n of [1, 2, 4]){
  T.ore = 5000;
  const dir = findSite(0, 'turret'); if (!dir) break;
  const bs = teamBuilders(0).slice(0, n);
  for (const b of bs){ b.pos = surfacePoint(offsetOnSphere(dir, anyTangent(dir), 4), ECO.HOVER); b.vel = [0, 0, 0]; }
  S.sel.clear(); for (const b of bs) S.sel.add(b);
  playerPlace('turret', dir, false);
  const site = S.lastSite, t0 = S.time;
  step(60, () => site.done);
  out.power[n] = Math.round((S.time - t0) * 10) / 10;
}
// 3) отмена стройки — полный возврат
T.ore = 1000;
{ const dir = findSite(0, 'factory'); S.sel.clear(); S.sel.add(teamBuilders(0)[0]); playerPlace('factory', dir, false); const site = S.lastSite; const ore1 = T.ore; step(3); S.selB = site; cancelSite(site); out.cancel = { refund: Math.round(T.ore - ore1), siteGone: !S.buildings.includes(site), builder: teamBuilders(0)[0].order }; }
// 4) ремонт: повреждаем турель, ПКМ инженером
{ const tur = S.buildings.find(b => b.type === 'turret' && b.done); tur.hp = tur.maxhp * 0.3; const b = teamBuilders(0)[1]; builderGive(b, tur, false, true); const h0 = tur.hp; step(20, () => tur.hp >= tur.maxhp * 0.995); out.repair = { from: Math.round(h0), to: Math.round(tur.hp), max: tur.maxhp, by: b.order }; }
// 5) жила: нельзя строить другое здание на жиле, экстрактор вне жилы
{ const v = veins().find(x => x.kind === 'base' && x.ref === 0 && !veinExtractor(x)); out.vein = { other: v ? siteProblem(0, 'turret', v.dir) : 'n/a', extractorOff: siteProblem(0, 'extractor', offsetOnSphere(BASES[0], [1, 0, 0], 110)), reason: JSON.stringify(rtsReason('place:extractor', offsetOnSphere(BASES[0], [1, 0, 0], 110))) }; }
// 6) сохранение / загрузка: стройка в процессе и инженеры с заданиями
T.ore = 2000;
{ const dir = findSite(0, 'turret'); S.sel.clear(); S.sel.add(teamBuilders(0)[2]); S.sel.add(teamBuilders(0)[3]); playerPlace('turret', dir, false); }
step(4);
const before = { builders: teamBuilders(0).map(b => b.order + (b.site ? ':' + b.site.type : '')).join(','), sites: S.buildings.filter(b => !b.done).length, ext: S.buildings.filter(b => b.type === 'extractor').length, drill: T.drill, ore: Math.round(T.ore) };
const okSave = SAVE.save();
const okLoad = SAVE.load(); enterRTS(); S.teams[0].ai = false; S.teams[1].ai = false;
const after = { builders: teamBuilders(0).map(b => b.order + (b.site ? ':' + b.site.type : '')).join(','), sites: S.buildings.filter(b => !b.done).length, ext: S.buildings.filter(b => b.type === 'extractor').length, drill: S.teams[0].drill, ore: Math.round(S.teams[0].ore) };
const site2 = S.buildings.find(b => !b.done && b.team === 0);
step(60, () => !site2 || site2.done);
out.save = { okSave, okLoad, before, after, siteFinishedAfterLoad: site2 ? site2.done : 'none', siteRefOk: site2 ? S.builders.some(b => b.site === site2) || site2.done : true };
// 7) старое сохранение v5 (без новых полей): дроны-строители с job, без экстракторов
{
  const d = JSON.parse(localStorage.getItem(SAVE.KEY));
  for (const b of d.builders){ delete b.order; delete b.jobs; delete b.site; delete b.serial; delete b.abil; b.job = null; b.pos = [b.pos[0] * 1.02, b.pos[1] * 1.02, b.pos[2] * 1.02]; }
  d.buildings = d.buildings.filter(b => b.type !== 'extractor');
  for (const t of d.teams){ delete t.drill; delete t.autoBuild; delete t.incParts; }
  d.props = d.props.slice(0, 90);
  localStorage.setItem(SAVE.KEY, JSON.stringify(d));
  const ok = SAVE.load(); enterRTS();
  step(30);
  out.old = { ok, builders: teamBuilders(0).map(b => b.order + ':' + (len(b.pos) - groundR(norm(b.pos))).toFixed(1)).join(','), inc: ecoBreakdown(0).total, t: Math.round(S.time) };
}
return out;
