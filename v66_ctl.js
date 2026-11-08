// =====================================================================
//  v6.6 — РУЧНОЕ УПРАВЛЕНИЕ И «АВТОНОМНО»
//  • То, что игрок создал в стратегии, слушается только его: стоит и ждёт приказа
//    (стреляет по врагам рядом), приказ не «истекает» через 2 минуты, как раньше.
//  • Кнопка «⟳ АВТОНОМНО» (клавиша O) на выделенных: действуют сами, как под
//    ИИ-стратегом в режиме шутера. Над автономными — значок ⟳. Повторное нажатие —
//    снова ручное управление. Приказ игрока автономному юниту тоже забирает его в ручное.
//  • Ушёл в шутер — ВСЕ юниты становятся автономными и остаются такими после
//    возвращения в стратегию (решение Дмитрия: всех на карте не найти).
//  • Пока игрок командует в стратегии, бот-стратег НЕ тратит руду и КО игрока:
//    не строит, не заказывает, не наносит удары, не пополняет отряды сам
//    (пополнение — кнопкой «✚ Пополнить»). Бесплатные капсулы по расписанию —
//    прилетают и ждут приказа.
// =====================================================================
const CTL66 = { t: 0, armyT: 0 };
function rtsCmd66(){ return S.mode === 'rts' && !S.attract && !S.over; }
function isAuto66(g){ return !!g && g.auto66 !== false; }
function all66(){ return [...groupsOf(0), ...S.builders.filter(b => b.alive && b.team === 0)]; }
function setAuto66(g, on){
  if (!g || g.team !== 0) return;
  g.auto66 = !!on;
  if (on){
    g.byPlayer = false; g.manualUntil = 0;
    if (g.cls === 'builder' && builderIdle(g)) g.auto = false;
  } else {
    g.byPlayer = true; g.manualUntil = 1e9;
    if (g.cls !== 'builder' && !(g.order === 'sky' && g.sky)){ const L = leaderOf(g); if (L) setOrder(g, 'hold', L.pos, {}); g.manualUntil = 1e9; }
  }
}
function makeManual66(g){ if (!g || g.team !== 0 || S.attract) return; g.auto66 = false; g.byPlayer = true; g.manualUntil = 1e9; }
// кнопка / клавиша O: все выделенные автономны → ручное; иначе → автономно
function toggleAuto66(){
  const sel = [...S.sel].filter(g => g && g.team === 0 && groupAlive(g));
  if (!sel.length){ feed(tr('Выдели юнитов, чтобы включить или выключить «Автономно»', 'Select units to toggle "Autonomous"', 'Chọn đơn vị để bật/tắt “Tự hành”'), '#f88'); emit('ui', { kind: 'deny' }); return false; }
  const on = !sel.every(isAuto66);
  for (const g of sel) setAuto66(g, on);
  feed(on ? tr(`Автономно (${sel.length}): действуют сами, как под ИИ-стратегом. Значок ⟳ над ними. Ещё раз O — снова ручное.`, `Autonomous (${sel.length}): they act on their own, like under the AI strategist. ⟳ icon above. Press O again for manual.`, `Tự hành (${sel.length})`)
          : tr(`Ручное управление (${sel.length}): ждут твоих приказов`, `Manual control (${sel.length}): waiting for your orders`, `Điều khiển tay (${sel.length})`), on ? '#7fdcff' : TEAM[0].css);
  emit('ui', { kind: 'ok' });
  if (typeof VOICE66 !== 'undefined') VOICE66.say(sel[0], 'ord');
  if (typeof CUR !== 'undefined') CUR.ev('auto66');
  return true;
}
// ---- приказ игрока = ручное управление (без срока)
{ const so0 = setOrder;
  setOrder = function(g, order, goal, opts){
    so0(g, order, goal, opts);
    if (opts && opts.by === 'player' && g && g.team === 0 && S.mode === 'rts') makeManual66(g);
  }; }
{ const bg0 = builderGive; builderGive = function(b, site, queue, byPlayer){ bg0(b, site, queue, byPlayer); if (byPlayer) makeManual66(b); }; }
{ const bo0 = builderOrderAt; builderOrderAt = function(bs, x, y, queue){ const r = bo0(bs, x, y, queue); for (const b of bs) makeManual66(b); if (typeof VOICE66 !== 'undefined') VOICE66.say(bs[0], 'ord'); return r; }; }
{ const bs0 = builderStop; builderStop = function(bs){ bs0(bs); for (const b of bs) makeManual66(b); }; }
// ---- в шутер: все автономны (и остаются такими)
releasePlayerUnits = function(){
  let n = 0;
  for (const g of all66()){
    if (g.auto66 === false) n++;
    g.auto66 = true;
    if (g.byPlayer || g.manualUntil > S.time + 60){ g.byPlayer = false; if (g.manualUntil > S.time + 60) g.manualUntil = S.time + (g.cls === 'builder' ? 15 : 20); }
  }
  if (n && !S.attract) feed(tr(`Ты в бою — все юниты автономны (${n} было на ручном). В стратегии: выдели и «Автономно» (O) — снова ручное.`, `You are in the fight — all units are autonomous (${n} were manual). In strategy: select and press "Autonomous" (O) to take manual control again.`, `Mọi đơn vị tự hành (${n})`), '#7fdcff');
};
releaseBuilders = function(){};
// ---- новые юниты: в стратегии — ручные (ждут у выхода / идут к точке сбора), в шутере — автономные
{ const fp0 = finishProduct;
  finishProduct = function(site, key){
    const before = new Set([...S.squads, ...S.vehicles, ...S.drones, ...S.builders]);
    fp0(site, key);
    if (site.team !== 0 || S.attract) return;
    const made = [...S.squads, ...S.vehicles, ...S.drones, ...S.builders].filter(g => !before.has(g) && g.team === 0);
    for (const g of made){
      if (rtsCmd66()){
        makeManual66(g);
        if (g.cls !== 'builder' && !site.rally){ const L = leaderOf(g); if (L) setOrder(g, 'hold', L.pos, {}); g.manualUntil = 1e9; }
      } else { g.auto66 = true; }
    }
    if (made.length && rtsCmd66() && S.pOrder && S.pOrder[key] < 0) S.pOrder[key] = 0;
  }; }
{ const ps0 = podStep;
  podStep = function(p, dt){
    const sq = ps0(p, dt);
    if (sq && sq.team === 0 && !S.attract){
      if (rtsCmd66()){ makeManual66(sq); const L = leaderOf(sq); if (L) setOrder(sq, 'hold', L.pos, {}); sq.manualUntil = 1e9; feed(tr(`${groupLabel(sq)} из капсулы ждёт приказа`, `${groupLabel(sq)} from the pod awaits orders`, `${groupLabel(sq)} chờ lệnh`), '#9cf'); }
      else sq.auto66 = true;
    }
    return sq;
  }; }
// ---- бот не тратит ресурсы игрока, пока игрок командует в стратегии
{ const ec0 = economy; economy = function(t){ if (t === 0 && rtsCmd66()) return; return ec0(t); }; }
{ const ap0 = aiPowers; aiPowers = function(t){ if (t === 0 && rtsCmd66()) return; return ap0(t); }; }
{ const cm0 = commander;
  commander = function(t, dt){
    cm0(t, dt);
    // автономные юниты в стратегии живут своей головой, даже если ИИ-стратег выключен
    if (t === 0 && rtsCmd66() && !S.teams[0].ai){
      CTL66.armyT -= dt;
      if (CTL66.armyT <= 0){ CTL66.armyT = 2; if (groupsOf(0).some(g => isAuto66(g) && g.manualUntil < S.time)) army(0); }
    }
  }; }
{ const rs0 = reinforceStep;
  reinforceStep = function(dt){
    const tmp = [];
    if (rtsCmd66()) for (const sq of S.squads) if (sq.team === 0 && !sq.lone && !(sq.reinf66 > S.time)){ sq.lone = true; tmp.push(sq); }
    try { rs0(dt); } finally { for (const sq of tmp) sq.lone = false; }
  }; }
// «✚ Пополнить» — разрешить пополнение выделенных отрядов (90 с), по 18 руды за бойца
function reinforce66(){
  const sqs = selGroups().filter(g => isSquad(g) && !g.solo && g.units.length < 4);
  if (!sqs.length){ feed(tr('Нужен неполный отряд (меньше 4 бойцов)', 'Select a squad with fewer than 4 troopers', 'Chọn đội chưa đủ quân'), '#f88'); emit('ui', { kind: 'deny' }); return; }
  for (const sq of sqs){ sq.reinf66 = S.time + 90; sq.reinfT = 0; }
  feed(tr(`Пополнение (${sqs.length}): у штаба, форпоста или своей точки, по ${GAME.REINF_COST} руды за бойца`, `Reinforcing (${sqs.length}): at the HQ, an outpost or an owned point, ${GAME.REINF_COST} ore per trooper`, `Bổ sung (${sqs.length})`), TEAM[0].css);
  emit('ui', { kind: 'ok' });
}
// ---- автономные инженеры в стратегии сами добывают кристаллы (как рабочие в SC2)
function ctl66Step(dt){
  CTL66.t -= dt; if (CTL66.t > 0) return; CTL66.t = 0.5;
  if (S.attract) return;
  const rts = rtsCmd66();
  for (const g of all66()){
    if (g.auto66 === false){
      if (g.manualUntil < 1e8 && !(g.huntUntil > S.time)){ g.manualUntil = 1e9; g.byPlayer = true; }
    } else if (g.auto66 === undefined) g.auto66 = true;
    if (rts && g.cls === 'builder' && g.auto66 !== false && (builderIdle(g) || g.order === 'gather' && !g.cargo) && !g.site){
      // сначала — брошенная стройка рядом (её никто не строит), потом — кристаллы
      const site = S.buildings.find(s => s.alive && s.team === 0 && !s.done && surfDist(s.pos, g.pos) < 160 && !S.builders.some(x => x.alive && x.site === s && builderBusy(x)));
      if (site){ const lf = g.lastField; builderGive(g, site, false, false); g.lastField = lf; }
      else if (builderIdle(g) && typeof g66NearestField === 'function'){ const f = g66NearestField(0, g.pos, null, 220); if (f) g66Start(g, f, false); }
    }
  }
}
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); try { ctl66Step(dt); ctl66Card(); } catch (e){ if (!CTL66.err){ CTL66.err = 1; console.warn('ctl66', e); } } }; }
// ---- клавиша O
{ const rk0 = rtsKey; rtsKey = function(e){ if (e.code === 'KeyO' && !e.ctrlKey && !e.altKey){ toggleAuto66(); return; } return rk0(e); }; }
// ---- кнопки в карточке выделенного
function ctl66Card(){
  if (S.mode !== 'rts' || S.attract) return;
  const el = $('card'); if (!el) return;
  const sel = selGroups();
  let b = el.querySelector('[data-auto66]');
  if (!sel.length){ return; }
  if (!b){
    const box = el.querySelector('.cmds') || el.querySelector('.bmenu .abils'); if (!box) return;
    b = document.createElement('button'); b.className = 'ab a66'; b.dataset.auto66 = '1';
    b.onclick = e => { e.stopPropagation(); AU.init(); toggleAuto66(); ctl66Card(); };
    box.insertBefore(b, box.firstChild);
    if (sel.some(g => isSquad(g) && !g.solo)){
      const r = document.createElement('button'); r.className = 'ab r66b'; r.dataset.reinf66 = '1';
      r.innerHTML = `<i>✚</i><b>${tr('Пополнить', 'Reinforce', 'Bổ sung')}</b>`;
      r.title = tr(`В стратегии отряды не пополняются сами (это тратит руду). Нажми — отряд пополнится у штаба/форпоста/своей точки, ${GAME.REINF_COST} руды за бойца.`, `In strategy squads do not reinforce by themselves (it costs ore). Press — the squad reinforces at the HQ/outpost/owned point, ${GAME.REINF_COST} ore per trooper.`, 'Bổ sung');
      r.onclick = e => { e.stopPropagation(); AU.init(); reinforce66(); };
      box.insertBefore(r, b.nextSibling);
    }
  }
  const on = sel.every(isAuto66), some = !on && sel.some(isAuto66);
  const h = `<i>${on ? '⟳' : '✋'}</i><b>${on ? tr('АВТОНОМНО', 'AUTONOMOUS', 'TỰ HÀNH') : some ? tr('Частично', 'Mixed', 'Một phần') : tr('Ручное', 'Manual', 'Thủ công')}</b>${TOUCH.on ? '' : '<kbd>O</kbd>'}`;
  if (b._h !== h){ b._h = h; b.innerHTML = h; b.classList.toggle('on', on); b.title = on ? tr('Сейчас действуют сами. Нажми (O) — снова слушаются только тебя.', 'Acting on their own now. Press (O) to take manual control.', '') : tr('Сейчас слушаются только тебя. Нажми (O) — пусть действуют сами, как под ИИ-стратегом.', 'Obeying only you now. Press (O) to let them act on their own, like under the AI strategist.', ''); }
}
// ---- значок ⟳ над автономными юнитами (стратегия)
{ const rb0 = r61Badges;
  r61Badges = function(sel, dt){
    rb0(sel, dt);
    if (S.mode !== 'rts' || S.attract) return;
    const sz = r61Size();
    octx.save(); octx.textAlign = 'center'; octx.textBaseline = 'middle';
    for (const g of all66()){
      if (!isAuto66(g) || !groupAlive(g)) continue;
      const p = r61Anchor(g); if (!p) continue;
      const x = p[0] + sz * 1.05, y = p[1] - sz * 0.95, r = max(5, sz * 0.42);
      octx.fillStyle = 'rgba(10,30,40,.85)'; octx.beginPath(); octx.arc(x, y, r, 0, PI * 2); octx.fill();
      octx.strokeStyle = '#7fdcff'; octx.lineWidth = 1.4; octx.stroke();
      octx.fillStyle = '#9fe6ff'; octx.font = `700 ${Math.round(r * 1.5)}px "Exo 2", sans-serif`; octx.fillText('⟳', x, y + 0.5);
    }
    octx.restore();
  }; }
// ---- начало матча: всё автономно (бой начинается в шутере)
{ const nm0 = newMatch; newMatch = function(opts){ const r = nm0(opts); for (const g of all66()) g.auto66 = true; return r; }; }
// подписи / «Ещё приказы»: состояние в карточке
{ const ot0 = orderText; orderText = function(g){ const t = ot0(g); return g && g.team === 0 && S.mode === 'rts' && !S.attract ? (isAuto66(g) ? '⟳ ' : '✋ ') + t : t; }; }
(function ctl66CSS(){
  const st = document.createElement('style');
  st.textContent = `#card .ab.a66{min-width:76px} #card .ab.a66 b{font-size:9.5px;letter-spacing:0;white-space:nowrap;overflow:visible} body.touch #card .ab.a66{min-width:60px} body.touch #card .ab.a66 b{font-size:8px} #card .ab.a66{border-color:rgba(127,220,255,.55)} #card .ab.a66.on{background:rgba(30,80,100,.7);border-color:#7fdcff;box-shadow:0 0 8px rgba(127,220,255,.45)} #card .ab.a66 i{color:#9fe6ff}
  #card .ab.r66b i{color:#8fffaa}`;
  document.head.appendChild(st);
})();
