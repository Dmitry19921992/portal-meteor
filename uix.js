// =====================================================================
//  RTS UI v6 (ветка rtsui): почему кнопка серая и как это исправить,
//  подсказки при наведении, очередь производства, «готово»-уведомления,
//  крупная карточка выделения, единая кнопка «Вселиться» / «Стратегия».
//
//  Причины недоступности — через uiExplain(actionId). Идентификаторы:
//    build:<тип здания> · prod:<продукт> · power:<способность штаба> · abil:<KeyR|KeyF|…>
//    cmd:hold · cmd:retreat · cmd:sky · possess
//  Источники причин (по порядку): rtsReason(actionId) из ветки rts (если есть),
//  затем UIX.providers (здесь — uixReasonDefault). Формат ответа провайдера:
//    { ok:false, reason:'…', detail:['…'], eta:сек, progress:0..1,
//      fix: 'build:factory' | () => {…} | {label, run|action} | [ … ], fixLabel:'…' }
//  или { ok:true }, или null — «не знаю, спроси следующего».
// =====================================================================
const UIX = {
  providers: [], pop: null, tip: null, toasts: [], wants: [], spoke: {}, bdone: new Map(), brate: new Map(), t: 0,
  closePop(){ if (!this.pop) return false; this.pop = null; const el = $('uxpop'); if (el) el.style.display = 'none'; return true; },
};
const SLOT_KEYS = ['KeyZ', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyJ', 'KeyK', 'KeyL', 'KeyU'];
const ORE_I = '<i class="ore"></i>';
function fmtDur(s){ s = max(0, Math.ceil(s)); return s < 60 ? `${s} ${tr('с', 's')}` : `${floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function uixEsc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
// что за действие: название, значок, описание, цена, время, клавиша
function uixInfo(id){
  const [k, v] = String(id).split(':');
  if (k === 'build' && BTYPES[v]){ const B = BTYPES[v]; return { title: bname(v), icon: UIX_ICON.b[v] || '▣', desc: N2(B.d), cost: B.cost, time: B.time }; }
  if (k === 'prod' && PRODUCTS[v]){ const P = PRODUCTS[v]; return { title: pname(v), icon: P.icon, desc: uixProdDesc(v), cost: pCost(0, v), time: pTime(0, v) }; }
  if (k === 'power' && POWERS[v]){ const P = POWERS[v]; return { title: N2(P.n), icon: P.icon, desc: N2(P.d), cmd: P.cost, time: null }; }
  if (k === 'abil'){ const a = Object.values(ABIL).find(A => A.key === v); return { title: a ? N2(a.n) : v, icon: a ? a.icon : '?', desc: a ? N2(a.d) : '', key: v }; }
  if (id === 'cmd:move') return { title: tr('Идти с боем', 'Attack-move'), icon: '➤', desc: tr('Потом кликни (тапни) по земле: идут и отстреливаются по пути. По врагу — атаковать его. То же самое — ПКМ.', 'Then click (tap) the ground: they move and fight on the way. On an enemy — attack it. Same as RMB.'), key: tr('ПКМ', 'RMB') };
  if (id === 'cmd:rush') return { title: tr('Бегом', 'Run'), icon: '»', desc: tr('Потом кликни (тапни) по земле: бегут, не ввязываясь в бой. То же — двойной ПКМ.', 'Then click (tap) the ground: they run without engaging. Same as double RMB.'), key: tr('2×ПКМ', '2×RMB') };
  if (id === 'cmd:hold') return { title: tr('Удерживать позицию', 'Hold position'), icon: '⛊', desc: tr('Выделенные стоят на месте и отстреливаются.', 'Selected groups stay put and return fire.'), key: 'KeyH' };
  if (id === 'cmd:retreat') return { title: tr('Отступить', 'Retreat'), icon: '↩', desc: tr('Бегом назад к штабу (или ближайшему форпосту), не ввязываясь в бой.', 'Run back to the HQ (or nearest outpost) without engaging.'), key: 'Shift+H' };
  if (id === 'cmd:sky') return { title: tr('Десант через купол', 'Sky assault'), icon: '⇑', desc: tr('Отряды взлетают на ранцах, проходят портал купола и высаживаются у врага.', 'Squads jet up through the dome portal and land at the enemy.'), key: 'KeyY' };
  if (id === 'possess') return { title: tr('Вселиться', 'Possess'), icon: '▶', desc: tr('Управлять выделенным бойцом, танком или турелью от первого лица. Та же клавиша в бою вернёт в стратегию.', 'Control the selected trooper, tank or turret yourself. The same key in battle brings you back to strategy.'), key: SET.bind.rts };
  return { title: id, icon: '?', desc: '' };
}
const UIX_ICON = { b: { turret: '⌖', aa: '⇡', outpost: '⛫', factory: '⚙', hub: '◎', airdock: '✈' } };
function uixProdDesc(k){
  const P = PRODUCTS[k], where = P.at.map(a => a === 'hq' ? tr('штаб', 'HQ') : bname(a)).join(' / ');
  const D = { squad: tr('4 бойца: штурмовик, пулемётчик, гранатомётчик, медик.', '4 troopers: assault, heavy gunner, rocketeer, medic.'),
    tank: tr('Автономная боевая машина: пушка и пулемёт, залп, дым, форсаж.', 'Autonomous combat vehicle: cannon and MG, barrage, smoke, overdrive.'),
    drone: tr('Быстрый летающий стрелок, хорош против пехоты.', 'Fast flying gunner, good against infantry.'),
    elite: tr('Элитный отряд с мощными ранцами — может десантироваться через купол.', 'Elite squad with strong jetpacks — can sky-assault through the dome.'),
    sniper1: tr('Одиночный снайпер с рельсотроном.', 'A lone railgun sniper.'), scout1: tr('Быстрый разведчик: видит далеко и подсвечивает врагов.', 'Fast scout: sees far and spots enemies.'),
    pod: tr('Отряд прилетает с орбиты прямо к линии фронта.', 'A squad drops from orbit right at the front line.'),
    jet2: tr('Ранцы II: пехота долетает до купола и может десантироваться.', 'Jetpacks II: infantry reaches the dome and can sky-assault.'),
    armor: tr('+броня всей армии (3 уровня).', '+armor for the whole army (3 levels).'), weapons: tr('+урон всей армии (3 уровня).', '+damage for the whole army (3 levels).') };
  return (D[k] || '') + ' ' + tr('Где: ', 'At: ') + where + '.';
}
// ---------- причины (запасной провайдер ветки rtsui; ветка rts подключает rtsReason) ----------
function uixMyBld(type, done){ return S.buildings.filter(b => b.alive && b.team === 0 && b.type === type && (done === undefined || b.done === done)); }
function uixBuildEta(b){ const r = UIX.brate.get(b); return r && r > 1e-4 ? (1 - b.built) / r : null; }
function uixNearestCp(){
  const ref = S.rts.dir; let best = null, bd = 1e9;
  for (const c of S.cps){ if (c.core || c.owner === 0) continue; const d = surfDist(c.pos, ref); if (d < bd){ bd = d; best = c; } }
  return best;
}
// последний ещё не начатый заказ игрока — его отмена вернёт руду
function uixLastQueued(){
  for (const s of [S.hq[0], ...S.buildings]){ if (!s || s.team !== 0 || !s.queue) continue; for (let i = s.queue.length - 1; i >= 1; i--) return { site: s, i, key: s.queue[i] }; }
  return null;
}
function uixOre(cost, wantKey){
  const T = S.teams[0], need = Math.ceil(cost - T.ore), inc = max(0.01, T.income || 0), eta = need / inc;
  const r = { ok: false, reason: tr(`Не хватает ${need} руды`, `Need ${need} more ore`), short: tr(`−${need} руды · ${fmtDur(eta)}`, `−${need} ore · ${fmtDur(eta)}`), eta, progress: clamp(T.ore / cost, 0, 1),
    detail: [tr(`≈ ${fmtDur(eta)} при доходе +${inc.toFixed(1)}/с`, `≈ ${fmtDur(eta)} at +${inc.toFixed(1)}/s income`),
             tr(`Ускорить: захвати точку (+${(GAME.INC_PT * GAME.INC_MUL).toFixed(1)}/с каждая) или взрывай обломки — в них руда.`, `Speed up: capture points (+${(GAME.INC_PT * GAME.INC_MUL).toFixed(1)}/s each) or blow up wreckage — it holds ore.`)],
    fixes: [] };
  if (wantKey) r.fixes.push({ label: tr('Заказать, когда накопится', 'Order when affordable'), run: () => uixWant(wantKey), primary: true });
  const cp = uixNearestCp();
  if (cp) r.fixes.push({ label: tr(`К точке ${cpName(cp)}`, `Go to point ${cpName(cp)}`), run: () => { flyCamTo(cp.pos); UIX.closePop(); } });
  const q = uixLastQueued();
  if (q){ const back = pCost(0, q.key); r.fixes.push({ label: tr(`Отменить «${pname(q.key)}» (+${back})`, `Cancel "${pname(q.key)}" (+${back})`), run: () => { cancelProduct(q.site, q.i); emit('ui', { kind: 'ok' }); } }); }
  return r;
}
function uixShow(b){ return () => { if (!b) return; S.sel.clear(); S.selB = b; flyCamTo(b.pos); UIX.closePop(); }; }
function uixReasonDefault(id){
  const [k, v] = String(id).split(':'), T = S.teams[0];
  if (k === 'build' && BTYPES[v]){
    const why = canBuild(0, v); if (!why) return { ok: true };
    const B = BTYPES[v];
    if (B.req && !uixMyBld(B.req, true).length){
      const s = uixMyBld(B.req, false)[0], short = tr(`Нужен ${bname(B.req)}`, `Needs ${bname(B.req)}`);
      if (s){ const eta = uixBuildEta(s); return { ok: false, short, reason: tr(`Нужен ${bname(B.req)} — он строится: ${Math.floor(s.built * 100)}%`, `Requires ${bname(B.req)} — under construction: ${Math.floor(s.built * 100)}%`), eta, progress: s.built, fixes: [{ label: tr(`Показать: ${bname(B.req)}`, `Show ${bname(B.req)}`), run: uixShow(s) }] }; }
      return { ok: false, short, reason: tr(`Сначала нужен ${bname(B.req)}`, `Requires ${bname(B.req)} first`), fix: 'build:' + B.req };
    }
    if (T.ore < B.cost) return uixOre(B.cost, null);
    const n = uixMyBld(v).length;
    const lim = { turret: GAME.MAX_TURRETS, aa: GAME.MAX_AA, outpost: GAME.MAX_OUTPOSTS, factory: 2, hub: 1, airdock: 1 }[v];
    if (lim !== undefined && n >= lim){
      const one = lim <= 2;
      return { ok: false, short: one ? tr('Уже построено', 'Already built') : tr(`Лимит ${n}/${lim}`, `Limit ${n}/${lim}`), reason: one ? tr(`${bname(v)} уже есть (${n}/${lim})`, `${bname(v)} already built (${n}/${lim})`) : tr(`Достигнут лимит: ${bname(v)} ${n}/${lim}`, `Limit reached: ${bname(v)} ${n}/${lim}`),
        detail: one ? [] : [tr('Лимит растёт с «Масштабом боёв» (Настройки). Потерянные постройки освобождают место.', 'The limit grows with "Battle scale" (Settings). Lost buildings free slots.')],
        fixes: [{ label: tr('Показать', 'Show'), run: uixShow(uixMyBld(v)[0]) }] };
    }
    if (!S.builders.some(b => b.team === 0)){
      const home = builderHome(0);
      return { ok: false, short: tr('Нет строителей', 'No builders'), reason: tr('Нет дронов-строителей', 'No builder drones'), eta: home ? T.builderT : null,
        detail: [home ? tr(`Новый дрон вылетит через ≈ ${fmtDur(T.builderT)}`, `A new drone launches in ≈ ${fmtDur(T.builderT)}`) : tr('Дроны собирает штаб, форпост или мехзавод — нужен хотя бы один.', 'Drones come from the HQ, an outpost or a mech factory — you need one.')] };
    }
    return { ok: false, reason: why };
  }
  if (k === 'prod' && PRODUCTS[v]){
    const why = canProduce(0, v); if (!why) return { ok: true };
    const P = PRODUCTS[v];
    if (!productionSite(0, v)){
      for (const a of P.at){ if (a === 'hq') continue; const s = uixMyBld(a, false)[0]; if (s){ const eta = uixBuildEta(s); return { ok: false, short: tr(`${bname(a)}: стройка ${Math.floor(s.built * 100)}%`, `${bname(a)}: ${Math.floor(s.built * 100)}% built`), reason: tr(`Нужен ${bname(a)} — строится: ${Math.floor(s.built * 100)}%`, `Requires ${bname(a)} — building: ${Math.floor(s.built * 100)}%`), eta, progress: s.built, fixes: [{ label: tr(`Показать: ${bname(a)}`, `Show ${bname(a)}`), run: uixShow(s) }] }; } }
      const bl = P.at.filter(a => a !== 'hq');
      return { ok: false, short: tr(`Нужен ${bname(bl[0])}`, `Needs ${bname(bl[0])}`), reason: tr(`Нужно здание: ${bl.map(bname).join(tr(' или ', ' or '))}`, `Requires: ${bl.map(bname).join(' or ')}`) + (P.at.includes('hq') ? tr(' (штаб разрушен)', ' (HQ destroyed)') : ''), fix: bl.map(a => 'build:' + a) };
    }
    if (v === 'jet2' && (T.jet2 || countQueued(0, ['jet2']) > 0)) return { ok: false, reason: T.jet2 ? tr('Уже исследовано', 'Already researched') : tr('Уже исследуется', 'Already in research'), soft: true };
    if (P.max && (T[v] || 0) + countQueued(0, [v]) >= P.max) return { ok: false, reason: tr('Максимальный уровень', 'Max level'), soft: true };
    if (T.ore < pCost(0, v)) return uixOre(pCost(0, v), v);
    const site = productionSite(0, v);
    if (site && site.queue.length >= 5){
      const nm = site.cls === 'hq' ? tr('штаба', 'HQ') : bname(site.type);
      const r = { ok: false, short: tr('Очередь 5/5', 'Queue 5/5'), reason: tr(`Очередь заполнена (${nm}: 5/5)`, `Queue is full (${nm}: 5/5)`), detail: [tr('Подожди, пока выйдет первый заказ, или построй ещё одно такое здание.', 'Wait for the first order to finish, or build another such building.')], fixes: [{ label: tr('Показать очередь', 'Show queue'), run: uixShow(site) }] };
      const more = P.at.find(a => a !== 'hq' && canBuild(0, a) === null); if (more) r.fixes.push({ label: tr(`Построить: ${bname(more)}`, `Build ${bname(more)}`), run: () => uixRun('build:' + more) });
      return r;
    }
    const capN = { squad: 'MAX_SQUADS', elite: 'MAX_SQUADS', pod: 'MAX_SQUADS', tank: 'MAX_TANKS', drone: 'MAX_DRONES' }[v];
    if (capN) return { ok: false, short: why, reason: tr('Достигнут лимит армии: ', 'Army limit reached: ') + why, detail: [tr(`Лимит: ${GAME[capN]}${v === 'pod' ? ' + 4' : ''}. Место освобождается, когда юнит погибает. Больше — «Масштаб боёв» в настройках.`, `Limit: ${GAME[capN]}${v === 'pod' ? ' + 4' : ''}. A slot frees up when a unit dies. More — "Battle scale" in settings.`)] };
    return { ok: false, reason: why };
  }
  if (k === 'power' && POWERS[v]){
    const P = POWERS[v], left = powerLeft(0, v);
    if (T.cmd < P.cost){
      const nxt = max(0, 75 - (T.cmdT || 0));
      return { ok: false, short: tr(`Нужно ${P.cost} КО (есть ${T.cmd})`, `Needs ${P.cost} CP (${T.cmd})`), reason: tr(`Нужно ${P.cost} КО, есть ${T.cmd}`, `Needs ${P.cost} CP, you have ${T.cmd}`), progress: T.cmd / P.cost,
        detail: [tr(`КО даются: +1 за захват точки, +1 каждые 75 с (следующее через ${fmtDur(nxt)}), понемногу — за уничтожение врагов.`, `CP come from: +1 per captured point, +1 every 75 s (next in ${fmtDur(nxt)}), a little for kills.`)],
        fixes: uixNearestCp() ? [{ label: tr(`К точке ${cpName(uixNearestCp())}`, `Go to point ${cpName(uixNearestCp())}`), run: () => { flyCamTo(uixNearestCp().pos); UIX.closePop(); } }] : [] };
    }
    if (left > 0) return { ok: false, short: '⏱ ' + fmtDur(left), reason: tr(`Перезарядка: ещё ${fmtDur(left)}`, `Cooling down: ${fmtDur(left)} left`), eta: left, progress: 1 - left / P.cd };
    return { ok: true };
  }
  if (k === 'abil'){
    const sel = selGroups();
    if (!sel.length) return { ok: false, reason: tr('Сначала выдели отряд или технику', 'Select a squad or vehicle first') };
    let best = null;
    for (const g of sel) for (const a of abilList(g)) if (ABIL[a].key === v){ const l = abilLeft(g, a); if (!best || l < best.l) best = { l, a }; }
    if (!best) return { ok: false, reason: tr('У выделенных нет такой способности', 'The selection has no such ability') };
    if (best.l > 0) return { ok: false, reason: tr(`${N2(ABIL[best.a].n)}: перезарядка ${fmtDur(best.l)}`, `${N2(ABIL[best.a].n)}: cooldown ${fmtDur(best.l)}`), eta: best.l, progress: ABIL[best.a].cd ? 1 - best.l / ABIL[best.a].cd : 0 };
    return { ok: true };
  }
  if (id === 'cmd:sky'){
    const sq = selGroups().filter(isSquad);
    if (!sq.length) return { ok: false, reason: tr('Выдели пехотный отряд', 'Select an infantry squad') };
    if (!sq.some(s => s.elite || T.jet2)) return { ok: false, reason: tr('Нужен «Небесный десант» или исследование «Ранцы II»', 'Needs Sky troopers or the "Jetpacks II" research'), fix: ['prod:jet2', 'prod:elite'] };
    return { ok: true };
  }
  if (id === 'cmd:hold' || id === 'cmd:retreat' || id === 'cmd:move' || id === 'cmd:rush') return selGroups().length ? { ok: true } : { ok: false, reason: tr('Сначала выдели войска', 'Select troops first') };
  if (id === 'possess'){
    const any = S.units.some(u => u.alive && u.team === 0) || S.vehicles.some(v2 => v2.alive && v2.team === 0) || S.drones.some(d => d.alive && d.team === 0);
    return any ? { ok: true } : { ok: false, reason: tr('Нет живых роботов', 'No robots alive'), fix: 'prod:squad' };
  }
  return null;
}
UIX.providers.push(uixReasonDefault);
// ---------- общий интерфейс ----------
function uixFixOf(f, label){
  if (!f) return [];
  if (Array.isArray(f)) return f.flatMap(x => uixFixOf(x));
  if (typeof f === 'function') return [{ label: label || tr('Исправить', 'Fix it'), run: f, primary: true }];
  if (typeof f === 'string'){
    if (/^(build|prod|power|abil|cmd):|^possess$/.test(f)){ const I = uixInfo(f); const verb = f.startsWith('build:') ? tr('Построить', 'Build') : f.startsWith('prod:') ? (PRODUCTS[f.slice(5)] && PRODUCTS[f.slice(5)].research ? tr('Исследовать', 'Research') : tr('Заказать', 'Order')) : ''; return [{ label: label || `${I.icon} ${verb} ${I.title}`.trim(), run: () => uixRun(f), primary: true, act: f }]; }
    return [{ text: f }];   // текстовый совет без кнопки
  }
  if (typeof f === 'object'){ const run = f.run || (f.action ? () => uixRun(f.action) : null); return run ? [{ label: f.label || label || tr('Исправить', 'Fix it'), run, primary: f.primary !== false }] : (f.text ? [{ text: f.text }] : []); }
  return [];
}
function uixNorm(r){
  if (!r) return null;
  if (typeof r === 'string') return { ok: false, reason: r, detail: [], fixes: [] };
  if (r.ok) return { ok: true, detail: [], fixes: [] };
  const fixes = [...(r.fixes || []), ...uixFixOf(r.fix, r.fixLabel)];
  const detail = (r.detail ? [].concat(r.detail) : []).concat(fixes.filter(f => f.text).map(f => '→ ' + f.text));
  return { ok: false, reason: r.reason || r.why || tr('Недоступно', 'Unavailable'), short: r.short || null, detail, eta: r.eta, progress: r.progress, soft: !!r.soft, fixes: fixes.filter(f => f.run) };
}
// главный вход: объяснение для действия (ok, reason, detail[], eta, progress, fixes[] + название/значок/описание)
function uiExplain(id){
  let r = null;
  // v6: причины ветки rts (стройка инженерами, производство, удары) — главнее; act → кнопка-исправление
  if (typeof rtsReason === 'function' && /^(build|prod|power):/.test(id)){
    try { const rr = rtsReason(id.replace(/^prod:/, 'produce:'));
      if (rr && !rr.ok){ const act = rr.act ? rr.act.replace(/^produce:/, 'prod:') : null; r = uixNorm({ ok: false, reason: rr.reason, fix: act ? [act, rr.fix].filter(Boolean) : rr.fix }); } } catch (e){ r = null; }
  }
  if (!r) for (const p of UIX.providers){ try { r = uixNorm(p(id)); } catch (e){ r = null; } if (r) break; }
  return Object.assign({ id, ok: true, detail: [], fixes: [] }, uixInfo(id), r || {});
}
// выполнить действие, а если нельзя — показать почему (цепочки «нужно здание → построить» работают так же)
function uixRun(id, el){
  const x = uiExplain(id);
  if (!x.ok){ uiExplainShow(id, el); return false; }
  const [k, v] = id.split(':');
  UIX.closePop();
  if (k === 'build') startPlace(v);
  else if (k === 'prod') uiProduce(v);
  else if (k === 'power') startPower(v);
  else if (k === 'abil') abilityKey(v);
  else if (id === 'cmd:hold') orderHold();
  else if (id === 'cmd:retreat') orderRetreat();
  else if (id === 'cmd:sky') orderSkySel();
  else if (id === 'cmd:move' || id === 'cmd:rush') startOrderCast(id === 'cmd:rush');
  else if (id === 'possess') enterFPS();
  return true;
}
// «заказать, когда накопится руда»
function uixWant(key){
  if (!UIX.wants.includes(key)) UIX.wants.push(key);
  feed(tr(`${pname(key)}: закажем, как только хватит руды`, `${pname(key)}: will be ordered once there is enough ore`), '#9cf');
  emit('ui', { kind: 'ok' }); UIX.closePop();
}
function uixWantsStep(){
  for (let i = UIX.wants.length - 1; i >= 0; i--){
    const k = UIX.wants[i], x = uiExplain('prod:' + k);
    if (x.ok){ UIX.wants.splice(i, 1); uiProduce(k); continue; }
    if (S.teams[0].ore >= pCost(0, k)) UIX.wants.splice(i, 1);   // мешает уже не руда — снимаем ожидание
  }
}
// ---------- всплывающее объяснение ----------
function uiExplainShow(id, anchor){
  UIX.pop = { id, anchor: anchor || null, t: S.rtime, sig: '' };
  const x = uiExplain(id);
  if (!x.ok){
    emit('ui', { kind: 'deny' });
    const now = performance.now();
    if (SET.hintsVoice !== false && (UIX.spoke[x.reason] || 0) < now - 6000){ UIX.spoke[x.reason] = now; AU.speak(x.reason, 'ack'); }
  }
  uixPopRender(true);
}
function uixPopRender(force){
  const P = UIX.pop, el = $('uxpop'); if (!el) return;
  if (!P){ el.style.display = 'none'; return; }
  if (S.rtime - P.t > 9 && !el.matches(':hover')){ UIX.closePop(); return; }
  const x = uiExplain(P.id);
  const head = `<div class="uh"><i>${x.icon}</i><b>${uixEsc(x.title)}</b>${x.cost ? `<span>${ORE_I}${x.cost}</span>` : ''}${x.cmd ? `<span>${x.cmd} ${tr('КО', 'CP')}</span>` : ''}<button class="ux" data-x="1">✕</button></div>`;
  let body;
  if (x.ok) body = `<p class="okk">✓ ${tr('Теперь доступно', 'Available now')}</p><div class="fx"><button class="pri" data-run="1">${x.icon} ${uixEsc(x.title)}</button></div>`;
  else {
    body = `<p class="why">⛔ ${uixEsc(x.reason)}</p>` + x.detail.map(d => `<p class="dt">${uixEsc(d)}</p>`).join('');
    if (x.progress !== undefined && x.progress !== null) body += `<div class="pb"><s style="width:${(clamp(x.progress, 0, 1) * 100).toFixed(0)}%"></s>${x.eta ? `<em>${fmtDur(x.eta)}</em>` : ''}</div>`;
    if (x.fixes.length) body += `<div class="fx">${x.fixes.map((f, i) => `<button class="${f.primary ? 'pri' : ''}" data-fix="${i}">${uixEsc(f.label)}</button>`).join('')}</div>`;
  }
  const h = head + body;
  if (!force && h === P.sig) return;
  P.sig = h; P.x = x;
  el.innerHTML = h; el.style.display = 'block';
  el.querySelectorAll('[data-fix]').forEach(b => b.onclick = e => { e.stopPropagation(); const f = P.x.fixes[+b.dataset.fix]; AU.init(); if (f && f.run) f.run(); if (UIX.pop === P && !(f && f.act)) uixPopRender(true); });
  el.querySelector('[data-x]').onclick = e => { e.stopPropagation(); UIX.closePop(); };
  const rb = el.querySelector('[data-run]'); if (rb) rb.onclick = e => { e.stopPropagation(); uixRun(P.id); };
  if (force) uixPlace(el, P.anchor);
}
// разместить окошко рядом с кнопкой (слева от боковой панели, над нижней карточкой), не вылезая за экран
function uixPlace(el, a){
  const W = innerWidth, H = innerHeight, w = el.offsetWidth, h = el.offsetHeight;
  let x = (W - w) / 2, y = H * 0.42 - h / 2;
  if (a && a.isConnected){
    const r = a.getBoundingClientRect(), side = a.closest('#side'), sl = side ? side.getBoundingClientRect().left : r.left;
    if (sl > w + 16 && sl > W * 0.55){ x = sl - w - 10; y = r.top + r.height / 2 - h / 2; }
    else { x = r.left + r.width / 2 - w / 2; y = r.top - h - 10; if (y < 50) y = r.bottom + 10; }
  }
  el.style.left = clamp(x, 6, W - w - 6) + 'px'; el.style.top = clamp(y, 6, H - h - 6) + 'px';
}
// клик/тап по недоступной кнопке → объяснение вместо действия (перехват до обработчика кнопки)
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-ux]');
  if (!b || S.attract) return;
  const x = uiExplain(b.dataset.ux);
  if (x.ok) return;
  e.stopPropagation(); e.preventDefault(); AU.init();
  uiExplainShow(b.dataset.ux, b);
}, true);
document.addEventListener('mousedown', e => { if (UIX.pop && !e.target.closest('#uxpop') && !e.target.closest('[data-ux]')) UIX.closePop(); }, true);
// ---------- подсказка при наведении (ПК) ----------
document.addEventListener('mouseover', e => {
  if (TOUCH.on) return;
  const b = e.target.closest && e.target.closest('[data-ux],[data-tip]');
  if (b === (UIX.tip && UIX.tip.el)) return;
  UIX.tip = b ? { el: b, sig: '' } : null;
  uixTipRender();
});
function uixTipRender(){
  const el = $('uxtip'); if (!el) return;
  const T = UIX.tip;
  if (!T || !T.el.isConnected || S.attract || MENU.isOpen() || (UIX.pop && T.el === UIX.pop.anchor)){ el.style.display = 'none'; return; }
  let h;
  if (T.el.dataset.ux){
    const x = Object.assign({}, uiExplain(T.el.dataset.ux)); if (!x.key && T.el.dataset.hk) x.key = T.el.dataset.hk;
    const meta = [x.cost ? `${ORE_I}${x.cost}` : '', x.cmd ? `${x.cmd} ${tr('КО', 'CP')}` : '', x.time ? `⏱ ${fmtDur(x.time)}` : '', x.key ? `<kbd>${x.key.startsWith('Shift') ? x.key : keyLabel(x.key)}</kbd>` : ''].filter(Boolean).join(' ');
    h = `<b>${x.icon} ${uixEsc(x.title)}</b>${meta ? `<span class="m">${meta}</span>` : ''}<p>${uixEsc(x.desc || '')}</p>` +
      (x.ok ? '' : `<p class="why">⛔ ${uixEsc(x.reason)}${x.eta ? ` · ${fmtDur(x.eta)}` : ''}</p><p class="dt">${tr('Клик — подробнее и как исправить', 'Click — details and how to fix')}</p>`);
  } else h = T.el.dataset.tip;
  if (h === T.sig) return;
  T.sig = h; el.innerHTML = h; el.style.display = 'block';
  const r = T.el.getBoundingClientRect(), w = el.offsetWidth, hh = el.offsetHeight;
  let x = r.left > innerWidth * 0.6 ? r.left - w - 8 : r.left + r.width / 2 - w / 2, y = r.left > innerWidth * 0.6 ? r.top : r.top - hh - 8;
  if (y < 4) y = r.bottom + 8;
  el.style.left = clamp(x, 4, innerWidth - w - 4) + 'px'; el.style.top = clamp(y, 4, innerHeight - hh - 4) + 'px';
}
// ---------- приказ «отступить» ----------
function orderRetreat(){
  const sel = selGroups();
  if (!sel.length){ uiExplainShow('cmd:retreat'); return; }
  const homes = [];
  if (S.hq[0].alive) homes.push(siteExit(S.hq[0]));
  for (const b of S.buildings) if (b.alive && b.done && b.team === 0 && b.type === 'outpost') homes.push(siteExit(b, 6));
  if (!homes.length){ feed(tr('Некуда отступать — нет штаба и форпостов', 'Nowhere to retreat — no HQ or outposts'), '#f88'); emit('ui', { kind: 'deny' }); return; }
  let mark = null;
  for (const g of sel){
    const L = leaderPos(g); if (!L) continue;
    let best = homes[0]; for (const h of homes) if (dist(h, L) < dist(best, L)) best = h;
    setOrder(g, 'move', best, { by: 'player', lock: 120, rush: true }); mark = best;
  }
  if (mark) S.orderMark = { p: mark, t: 0.8, col: '#9cf' };
  feed(tr('Отступаем! Бегом к базе, не ввязываясь в бой', 'Retreat! Running back to base, not engaging'), '#9cf');
  emit('ui', { kind: 'ok' });
}
// ---------- горячие клавиши панели ----------
function uixKey(e){
  const c = e.code;
  const fk = { F1: 'build', F2: 'units', F3: 'tech', F4: 'cmd' }[c];
  if (fk){ e.preventDefault(); SIDE.tab = fk; buildSidebar(); emit('ui', { kind: 'ok' }); return true; }
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  const i = SLOT_KEYS.indexOf(c);
  if (i >= 0 && SIDE.btns[i]){ SIDE.btns[i].el.click(); return true; }
  return false;
}
// ---------- уникальные id объектов для DOM ----------
const UIX_IDS = new WeakMap(); let UIX_NID = 1;
function uixId(o){ let i = UIX_IDS.get(o); if (!i){ i = UIX_NID++; UIX_IDS.set(o, i); } return i; }
// ---------- полоса «в производстве» ----------
function uixProdItems(){
  const L = [], T = S.teams[0];
  for (const s of [S.hq[0], ...S.buildings]){
    if (!s || s.team !== 0 || !s.alive || !s.queue) continue;
    s.queue.forEach((k, i) => {
      const tt = pTime(0, k);
      L.push({ kind: 'q', site: s, i, key: k, icon: PRODUCTS[k].icon, name: pname(k), prog: i === 0 ? s.prodT / tt : 0, left: i === 0 ? tt - s.prodT : null, wait: i > 0, paused: s.cls === 'bld' && !s.done });
    });
  }
  for (const b of S.buildings) if (b.alive && b.team === 0 && !b.done) L.push({ kind: 'b', site: b, icon: UIX_ICON.b[b.type] || '▣', name: bname(b.type), prog: b.built, left: uixBuildEta(b), stalled: !uixBuildEta(b) });
  for (const k of UIX.wants){ const c = pCost(0, k); L.push({ kind: 'w', key: k, icon: PRODUCTS[k].icon, name: pname(k), prog: clamp(T.ore / c, 0, 1), left: (c - T.ore) / max(0.01, T.income || 0) }); }
  return L;
}
function uixStripRender(){
  const el = $('pstrip'); if (!el) return;
  const L = uixProdItems();
  if (!L.length){ el.style.display = 'none'; UIX.strip = null; return; }
  el.style.display = 'flex';
  const sig = L.map(it => it.kind + (it.key || '') + (it.site ? uixId(it.site) : '') + ':' + (it.i || 0) + (it.wait ? 'w' : '') + (it.paused ? 'p' : '')).join('|') + LANG.cur;
  if (!UIX.strip || UIX.strip.sig !== sig){
    UIX.strip = { sig, L };
    el.innerHTML = `<small>${tr('В РАБОТЕ', 'IN PROGRESS')}</small>` + L.slice(0, 14).map((it, n) => {
      const cls = it.kind === 'b' ? 'bld' : it.kind === 'w' ? 'want' : it.wait ? 'wait' : '';
      const tip = it.kind === 'q' ? `<b>${it.icon} ${it.name}</b><p>${it.site.cls === 'hq' ? tr('Штаб', 'HQ') : bname(it.site.type)} · ${it.wait ? tr(`в очереди №${it.i + 1}`, `queued #${it.i + 1}`) : tr('производится', 'in production')}</p><p class="dt">${tr('Клик — к зданию · ПКМ — отменить (руда вернётся)', 'Click — go to building · RMB — cancel (ore refunded)')}</p>`
        : it.kind === 'b' ? `<b>${it.icon} ${it.name}</b><p>${tr('Стройка: дроны-строители собирают здание', 'Construction: builder drones are assembling it')}</p><p class="dt">${tr('Клик — показать', 'Click — show')}</p>`
        : `<b>${it.icon} ${it.name}</b><p>${tr('Ждёт руды — закажется автоматически', 'Waiting for ore — will be ordered automatically')}</p><p class="dt">${tr('ПКМ — не ждать', 'RMB — stop waiting')}</p>`;
      return `<button class="pc ${cls}" data-n="${n}" data-tip="${uixEsc(tip)}"><i>${it.icon}</i><em></em><s><u></u></s></button>`;
    }).join('') + (L.length > 14 ? `<span class="more">+${L.length - 14}</span>` : '');
    el.querySelectorAll('.pc').forEach(b => {
      const it = UIX.strip.L[+b.dataset.n];
      b.onclick = e => { e.stopPropagation(); if (it.site){ S.sel.clear(); S.selB = it.site; flyCamTo(it.site.pos); emit('ui', { kind: 'ok' }); } };
      b.oncontextmenu = e => { e.preventDefault(); e.stopPropagation();
        if (it.kind === 'q' && it.site.queue[it.i] === it.key){ cancelProduct(it.site, it.i); emit('ui', { kind: 'ok' }); feed(tr(`Отменено: ${it.name}`, `Cancelled: ${it.name}`), '#9cf'); }
        else if (it.kind === 'w'){ UIX.wants = UIX.wants.filter(k => k !== it.key); emit('ui', { kind: 'ok' }); } };
    });
  }
  // живые значения без пересборки DOM (чтобы клики не терялись)
  el.querySelectorAll('.pc').forEach(b => {
    const it = L[+b.dataset.n]; if (!it) return;
    b.querySelector('u').style.width = (clamp(it.prog, 0, 1) * 100).toFixed(0) + '%';
    b.querySelector('em').textContent = it.kind === 'b' ? Math.floor(it.prog * 100) + '%' : it.paused ? '⏸' : it.wait ? '#' + (it.i + 1) : it.left !== null && it.left !== undefined ? fmtDur(it.left) : '';
  });
}
// ---------- уведомления «готово» (клик — камера к юниту и выделение) ----------
function uixToast(icon, text, target, col){
  if (S.attract) return;
  const box = $('uxtoasts'); if (!box) return;
  const d = document.createElement('div'); d.className = 'tst';
  d.innerHTML = `<i style="color:${col || TEAM[0].css}">${icon}</i><span>${uixEsc(text)}</span>${target ? '<em>➜</em>' : ''}`;
  d.onclick = e => {
    e.stopPropagation(); AU.init();
    if (target){
      if (target.cls === 'bld' || target.cls === 'hq'){ S.sel.clear(); S.selB = target; flyCamTo(target.pos); }
      else if (groupAlive(target)){ S.sel.clear(); S.selB = null; S.sel.add(target); const L = leaderPos(target); if (L) flyCamTo(L); }
      if (S.mode !== 'rts') enterRTS();
    }
    d.remove();
  };
  box.prepend(d);
  UIX.toasts.push({ el: d, t: S.rtime });
  while (box.children.length > 4) box.lastChild.remove();
}
function uixToastsStep(){
  for (const T of UIX.toasts) if (S.rtime - T.t > 9) T.el.remove(); else if (S.rtime - T.t > 8) T.el.classList.add('out');
  UIX.toasts = UIX.toasts.filter(T => T.el.isConnected);
}
// перехват выпуска продукции: узнаём, кто родился, и показываем уведомление (ядро finishProduct не трогаем)
const _uixFinishProduct = finishProduct;
finishProduct = function(site, key){
  const n0 = [S.squads.length, S.vehicles.length, S.drones.length];
  _uixFinishProduct(site, key);
  if (site.team !== 0 || S.attract) return;
  const made = S.squads.length > n0[0] ? S.squads[S.squads.length - 1] : S.vehicles.length > n0[1] ? S.vehicles[S.vehicles.length - 1] : S.drones.length > n0[2] ? S.drones[S.drones.length - 1] : null;
  const P = PRODUCTS[key];
  if (P.research) uixToast(P.icon, tr(`Исследовано: ${pname(key)}${P.max ? ' ' + 'I'.repeat(S.teams[0][key] || 1) : ''}`, `Researched: ${pname(key)}${P.max ? ' ' + 'I'.repeat(S.teams[0][key] || 1) : ''}`), null, '#8fffaa');
  else if (key === 'pod') uixToast(P.icon, tr('Капсула с отрядом летит к фронту', 'Squad pod is falling to the front'), null);
  else if (made) uixToast(P.icon, tr(`${pname(key)} готов: ${groupLabel(made)}`, `${pname(key)} ready: ${groupLabel(made)}`), made);
  emit('ui', { kind: 'ok' });
};
function uixTrackBuildings(dt){
  for (const b of S.buildings){
    if (b.team !== 0 || !b.alive) continue;
    const prev = UIX.bdone.get(b);
    if (prev && !prev.done){
      const r = (b.built - prev.built) / max(1e-3, S.time - prev.t);
      if (S.time - prev.t > 0.05) UIX.brate.set(b, (UIX.brate.get(b) || r) * 0.7 + r * 0.3);
      if (b.done){ uixToast(UIX_ICON.b[b.type] || '▣', tr(`Построено: ${bname(b.type)}`, `Built: ${bname(b.type)}`), b); emit('ui', { kind: 'ok' }); }
    }
    UIX.bdone.set(b, { done: b.done, built: b.built, t: S.time });
  }
}
// ---------- прогресс над зданиями в мире ----------
function uixWorldOverlay(){
  octx.save();
  octx.textAlign = 'center'; octx.textBaseline = 'middle';
  const sites = [S.hq[0], ...S.buildings];
  for (const s of sites){
    if (!s || s.team !== 0 || !s.alive) continue;
    if (s.cls === 'bld' && !s.done){
      const c = bldCenter(s); if (!facing(c)) continue;
      const p = project(c); if (!p) continue;
      const r = clamp(screenRadius(c, s.rad) * 0.9, 12, 40);
      octx.lineWidth = 4; octx.strokeStyle = 'rgba(0,0,0,.55)'; octx.beginPath(); octx.arc(p[0], p[1], r, 0, PI * 2); octx.stroke();
      octx.strokeStyle = '#8fffaa'; octx.beginPath(); octx.arc(p[0], p[1], r, -PI / 2, -PI / 2 + s.built * PI * 2); octx.stroke();
      octx.font = '700 12px "Exo 2", sans-serif'; octx.fillStyle = '#eafff0'; octx.fillText(Math.floor(s.built * 100) + '%', p[0], p[1]);
      continue;
    }
    if (!s.queue || !s.queue.length) continue;
    const top = s.cls === 'hq' ? add(s.pos, mul(BASES[0], 42)) : add(s.pos, mul(s.up, s.H + 1.5));
    if (!facing(top)) continue;
    const p = project(top); if (!p) continue;
    const k = s.queue[0], prog = clamp(s.prodT / pTime(0, k), 0, 1), x = p[0], y = p[1] + (s.cls === 'hq' ? 16 : -28), w = 74;
    octx.fillStyle = 'rgba(8,10,12,.78)'; octx.fillRect(x - w / 2, y - 10, w, 20);
    octx.strokeStyle = 'rgba(143,255,170,.55)'; octx.lineWidth = 1; octx.strokeRect(x - w / 2 + 0.5, y - 9.5, w - 1, 19);
    octx.font = '15px "Exo 2", sans-serif'; octx.fillStyle = '#ffd27a'; octx.fillText(PRODUCTS[k].icon, x - w / 2 + 11, y + 1);
    octx.fillStyle = 'rgba(255,255,255,.12)'; octx.fillRect(x - w / 2 + 22, y - 3, 30, 6);
    octx.fillStyle = '#8fffaa'; octx.fillRect(x - w / 2 + 22, y - 3, 30 * prog, 6);
    octx.font = '700 11px "Exo 2", sans-serif'; octx.fillStyle = '#fff'; octx.fillText(s.queue.length > 1 ? '×' + s.queue.length : fmtDur(pTime(0, k) - s.prodT), x + w / 2 - 11, y + 1);
  }
  octx.restore();
}
// ---------- кнопка режима в шутере: «Стратегия» (и подсказка про быструю смену бойца) ----------
function uixModeRender(fps){
  const el = $('uxmode'); if (!el) return;
  const show = fps && !TOUCH.on && !S.over;
  el.style.display = show ? 'flex' : 'none';
  if (!show) return;
  const h = `<button id="uxStrat" data-tip="${uixEsc(`<b>◩ ${tr('Стратегия', 'Strategy')}</b><p>${tr('Вид сверху: стройка, заказ войск, приказы. Та же клавиша в стратегии вселяет в выделенного бойца.', 'Top view: build, order troops, give orders. The same key in strategy possesses the selected unit.')}</p>`)}">◩ ${tr('Стратегия', 'Strategy')} <kbd>${bk('rts')}</kbd></button>` +
    `<span>⇄ ${tr('другой боец', 'next unit')} <kbd>${bk('switch')}</kbd></span>`;
  if (el._h !== h){ el._h = h; el.innerHTML = h; $('uxStrat').onclick = e => { e.stopPropagation(); AU.init(); enterRTS(); HINTS.used('rts'); }; }
  el.classList.toggle('live', !isLocked());
}
// ---------- кадр ----------
function uixFrame(dt){
  if (UIX.teams !== S.teams){ UIX.teams = S.teams; UIX.wants = []; UIX.bdone = new Map(); UIX.brate = new Map(); UIX.closePop(); for (const T of UIX.toasts) T.el.remove(); UIX.toasts = []; }
  const menu = MENU.isOpen(), rts = S.mode === 'rts' && !S.attract && !menu, fps = S.mode === 'fps' && !S.attract && !menu;
  document.body.classList.toggle('rtsm', rts);
  if (rts && UIX.mmR !== MM.R){ UIX.mmR = MM.R; document.documentElement.style.setProperty('--mmR', MM.R + 'px'); }
  const tb = $('uxtoasts'); if (tb) tb.style.display = rts ? 'flex' : 'none';
  if (!rts){ const ps = $('pstrip'); if (ps) ps.style.display = 'none'; if (UIX.pop) UIX.closePop(); }
  UIX.t -= dt; if (UIX.t > 0) return; UIX.t = 0.2;
  uixModeRender(fps);
  if (TOUCH.on){
    const mb = document.querySelector('#touch [data-t="map"]');
    if (mb){ const t = '◩ ' + tr('Стратегия', 'Strategy'); if (mb.textContent !== t) mb.textContent = t; mb.style.display = rts ? 'none' : ''; }
  }
  if (S.attract) return;
  uixTrackBuildings(dt);
  uixWantsStep();
  if (rts) uixStripRender();
  uixToastsStep();
  uixPopRender(false);
  uixTipRender();
}
