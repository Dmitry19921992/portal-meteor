// v6.4: копия старого теста — стройка открывается только с выбранным инженером
// v61rts: интерфейс стратегии — «стройку ведёт инженер», нет дублей команд (карточка ↔ правая панель),
// «Ещё приказы ▾», панель карточек отрядов/зданий, подписи/Alt, приказы ПКМ (⚔ / »), стоимость отрисовки.
const nap = ms => new Promise(r => setTimeout(r, ms));
if (!S.me || S.attract){ MENU.newGame(); await nap(2500); }
S.paused = true;
if (S.rtime < 15) for (let i = 0; i < 600; i++) update(1 / 30);
if (S.mode !== 'rts') enterRTS();
await nap(50);
const R = {}, card = $('card');
const btn = id => SIDE.btns.find(b => b.id === id);
// 1. кнопки зданий без инженера — «нужен инженер», клик выбирает инженера и включает чертёж
S.sel.clear(); S.selB = null; S.place = null; SIDE.tab = 'build'; buildSidebar(); R.gate = !!document.querySelector('#side .bgate'); v64PickBuilder(true); updateSidebar();
R.need = { count: SIDE.btns.filter(b => b.id.startsWith('build:') && b.el.classList.contains('need')).length, text: btn('build:turret').el.querySelector('.st').textContent, hk: btn('build:turret').el.dataset.hk };
btn('build:turret').el.click();
R.need.afterClick = { place: S.place, builderSelected: selBuilders().length };
updateSidebar(); R.need.withBuilder = SIDE.btns.filter(b => b.el.classList.contains('need')).length;
S.place = null; S.sel.clear();
const kd = c => ({ code: c, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault(){} });
rtsKey(kd('KeyX')); R.need.hotkeyX = { place: S.place, builderSelected: selBuilders().length }; S.place = null; S.sel.clear();
// 2. дубли: ни одна команда (data-ux) не должна быть и в карточке, и в правой панели
const ids = el => new Set([...el.querySelectorAll('[data-ux]')].map(b => b.dataset.ux));
const setSel = v => {
  S.sel.clear(); S.selB = null;
  if (v === 'squad') for (const g of groupsOf(0).filter(isSquad).slice(0, 2)) S.sel.add(g);
  else if (v === 'tank'){ const t = groupsOf(0).find(g => g.cls === 'tank'); if (t) S.sel.add(t); }
  else if (v === 'builder') for (const b of teamBuilders(0)) S.sel.add(b);
  else if (v === 'hq') S.selB = S.hq[0];
  else if (v === 'mixed'){ for (const g of groupsOf(0).slice(0, 3)) S.sel.add(g); S.sel.add(teamBuilders(0)[0]); }
  CARD.sig = ''; updateCard();
};
const dups = [];
for (const v of ['squad', 'tank', 'builder', 'hq', 'mixed']){
  setSel(v);
  for (const tab of ['build', 'units', 'tech', 'cmd']){ SIDE.tab = tab; buildSidebar(); const a = ids(card), b = ids($('side')); for (const x of a) if (b.has(x)) dups.push(`${v}/${tab}/${x}`); }
}
R.duplicates = dups;
setSel('squad');
R.squadCard = { visibleOrderBtns: [...card.querySelectorAll('[data-act="move"],[data-act="rush"],[data-act="hold"],[data-act="retreat"]')].filter(b => !b.closest('.more61')).length, menuItems: card.querySelectorAll('.more61 .mi').length, prod: card.querySelectorAll('[data-prod]').length, build: card.querySelectorAll('[data-build]').length };
card.querySelector('[data-more]').click(); R.squadCard.menuOpens = card.querySelector('.more61').classList.contains('open');
card.querySelector('.more61 [data-act="hold"]').click(); R.squadCard.holdWorks = selGroups().every(g => g.order === 'hold'); R.squadCard.menuClosesAfter = !card.querySelector('.more61').classList.contains('open');
setSel('hq'); R.hqCard = { prodButtons: card.querySelectorAll('[data-prod]').length, note: !!card.querySelector('.r61pn') };
S.sel.clear(); SIDE.tab = 'units'; buildSidebar(); R61.t = 0; r61Frame(0.3); setSel('builder'); R61.t = 0; r61Frame(0.3);
R.builderCard = { buildButtons: card.querySelectorAll('[data-build]').length, cmds: [...card.querySelectorAll('[data-bact]')].map(b => b.dataset.bact), autoTab: SIDE.tab };
card.querySelector('[data-bact="stop"]').click(); R.builderCard.stopWorks = selBuilders().every(b => builderIdle(b) && !b.site);
// 3. панель карточек
S.sel.clear(); S.selB = null; R61.pref.cards = true; R61.pref.ctab = 'units'; R61.sig = ''; R61.t = 0; r61Frame(0.3);
const pc = $('r61cards');
R.cards = { shown: getComputedStyle(pc).display, rows: pc.querySelectorAll('.rc').length, groups: groupsOf(0).filter(groupAlive).length, builderRow: teamBuilders(0).length > 0 };
let rc = pc.querySelector('.rc'); S.camFly = null; rc.click(); R.cards.clickSelects = S.sel.size === 1; R.cards.noFlyOnSingle = !S.camFly;
rtsLookAt(mul(S.rts.dir, -1)); rc.click(); R.cards.dblFlies = !!S.camFly; S.camFly = null;
pc.querySelector('[data-v="blds"]').click(); rc = pc.querySelector('.rc'); rc.click(); R.cards.bldClick = { selB: !!S.selB, fly: !!S.camFly }; S.camFly = null;
R.cards.bldRows = pc.querySelectorAll('.rc').length;
const lab0 = R61.pref.labels; pc.querySelector('[data-c="lab"]').click(); const lab1 = R61.pref.labels; pc.querySelector('[data-c="lab"]').click(); const lab2 = R61.pref.labels; pc.querySelector('[data-c="lab"]').click();
R.labels = [lab0, lab1, lab2, R61.pref.labels];
dispatchEvent(new KeyboardEvent('keydown', { code: 'AltLeft', bubbles: true })); R.alt = R61.alt; dispatchEvent(new KeyboardEvent('keyup', { code: 'AltLeft', bubbles: true })); R.alt = [R.alt, R61.alt];
pc.querySelector('[data-v="units"]').click();
// 4. приказы мышью: ПКМ = атакующее движение (⚔), двойной ПКМ = марш (»)
const g0 = groupsOf(0).find(isSquad); S.sel.clear(); S.selB = null; S.sel.add(g0);
rtsLookAt(leaderPos(g0)); S.rts.h = S.rts.hT = 60; RCAM.blend = null;
for (let i = 0; i < 30; i++){ updateRTSCamera(1 / 60); S.cam = Object.assign({ fov: S.cam.fov }, rtsCamera()); }
const x = innerWidth * 0.42, y = innerHeight * 0.62;
S.lastRmb = null; orderAt(x, y, false);
R.orders = { single: { order: g0.order, rush: g0.rush, mark: S.orderMark && S.orderMark.kind } };
orderAt(x, y, false);
R.orders.double = { order: g0.order, rush: g0.rush, mark: S.orderMark && S.orderMark.kind };
// танк на марше не стоит на месте, когда рядом враг
const tk = S.vehicles.find(v => v.alive && v.team === 0 && v.cls === 'tank' && !v.vk);
const foe = S.units.find(u => u.alive && u.team === 1);
if (tk && foe){
  const run = rush => { const p0 = tk.pos.slice(); setOrder(tk, 'move', surfacePoint(norm(add(norm(tk.pos), mul(anyTangent(norm(tk.pos)), 0.3))), 0.5), { rush, by: 'player' }); let d = 0; for (let i = 0; i < 30; i++){ tk.target = foe; tk.think = 9; foe.pos = add(tk.pos, mul(anyTangent(norm(tk.pos)), 20)); const inp = tankInput(tk, 1 / 30); d += len(inp.wish || [0, 0, 0]); } return +d.toFixed(2); };
  R.tankWish = { attackMove: run(false), march: run(true) };
}
// 5. стоимость: значки+подписи и панель карточек
const n = S.units.filter(u => u.alive).length + S.vehicles.filter(v => v.alive).length + S.drones.filter(d => d.alive).length + S.builders.filter(b => b.alive).length;
const sel = new Set(groupsOf(0).slice(0, 4));
R61.pref.labels = 'all';
let t0 = performance.now(); for (let i = 0; i < 100; i++){ octx.save(); r61Badges(sel, 0.016); r61OrderMarks(sel, 0.016); octx.restore(); }
const badges = (performance.now() - t0) / 100;
R61.pref.labels = 'sel';
t0 = performance.now(); for (let i = 0; i < 50; i++){ R61.sig = ''; r61CardsRender(); } const rebuild = (performance.now() - t0) / 50;
t0 = performance.now(); for (let i = 0; i < 50; i++) r61CardsRender(); const live = (performance.now() - t0) / 50;
R.perf = { robots: n, badgesAllLabels_ms: +badges.toFixed(3), cardsRebuild_ms: +rebuild.toFixed(3), cardsLive_ms: +live.toFixed(3) };
r61Save(); S.sel.clear(); S.paused = false;
return R;
