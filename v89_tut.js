// =====================================================================
//  v8.9 — УРОК «ЖИВОЙ МИР» на движке уроков v8.4 (L84 + T72): шутер, 3 шага, ПК и телефон.
//  Просьба (прижатый отряд → помоги → награда) → квест героя «Сыч» (Y — принять, спасти пилота) →
//  перелом боя (ретранслятор: держать 8 с → карта врага видна). Восьмая плитка в «Уроки новых механик».
// =====================================================================
if (typeof L84 !== 'undefined' && typeof DEF72 !== 'undefined' && typeof LIVE89 !== 'undefined'){
  L84.LES.l89live = { kind: 'fps', ic: '✋', n: A84('Живой мир', 'Living world'),
    d: A84('Свои просят помощи и награждают, герои дают квесты, затянувшийся фронт ломают операцией', 'Your units ask for help and reward you, heroes give quests, a stalled front is broken by an op'),
    steps: ['l89_req', 'l89_quest', 'l89_op'] };
  L84.ORDER.push('l89live');
  T72N.l89live = L84.LES.l89live.n;
  const near = (m) => { const c = L84.me(); const d = c ? norm(c.pos) : BASES[0]; return LIVE89.spotNear(L84.toward(d, L84.foeDir(), m), 0, 12); };
  const weak = (sq) => { if (sq) for (const u of sq.units){ u.hp = u.maxhp = 30; } return sq; };
  Object.assign(DEF72, {
    l89_req: { mode: 'fps', init(T){
        LIVE89.force = true; LIVE89.cur = LIVE89.offer = null; T.ref = LIVE89.stats.reqOk;
        const c = L84.me(); if (!c) return;
        const pg = playerGroup();
        let g = S.squads.find(s => s.team === 0 && s !== pg && groupAlive(s));
        const d = near(45);
        if (!g) g = spawnSquad(0, false, surfacePoint(d, 0.5), 3);
        for (const u of g.units) if (u.alive){ u.pos = surfacePoint(offsetOnSphere(d, randUnit(), 3), 0.6); u.vel = [0, 0, 0]; u.hp = u.maxhp * 0.45; }
        setOrder(g, 'hold', surfacePoint(d, 0.5), { lock: 120 });
        T.foe = weak(spawnSquad(1, false, surfacePoint(offsetOnSphere(d, tangent(sub(L84.foeDir(), d), d), 16), 0.5), 2));
        for (const u of T.foe.units) u.manualUntil = 1e9;
        T.g = g; T.d = d; T.asked = 0; },
      tick(T){
        if (!T.asked && T.g && groupAlive(T.g)){ const sq = playerGroup(); const rw = sq && (typeof LCH87 === 'undefined' || !LCH87.on || LCH87.src(0)) ? 'pod' : 'cmd'; const q = LIVE89.offerReq({ kind: 'pinned', g: T.g }); if (q){ q.rw = rw; q.T = 600; T.asked = 1; } }
        if (T.g && groupAlive(T.g)) for (const u of T.g.units) if (u.alive) u.hp = max(u.hp, u.maxhp * 0.3);
      },
      check: T => !T.g || LIVE89.stats.reqOk > T.ref || (T.asked && !LIVE89.cur && LIVE89.stats.reqOk > T.ref),
      mark: () => [] },
    l89_quest: { mode: 'fps', init(T){
        LIVE89.force = true; LIVE89.cur = LIVE89.offer = null; T.ref = LIVE89.stats.questOk; T.q = null; },
      tick(T){
        if (LIVE89.cur || LIVE89.offer) { const q = LIVE89.cur; if (q && q.type === 'quest' && q.guard && !q.guard.w89){ q.guard.w89 = 1; weak(q.guard); } if (q && q.type === 'quest') q.T = 900; return; }
        if (LIVE89.stats.questOk > T.ref) return;
        const q = LIVE89.offerQuest('pilot'); if (!q) return;
        q.dir = near(40); q.pos = surfacePoint(q.dir, 0.3); LIVE89.offer.until = S.rtime + 60;
      },
      check: T => LIVE89.stats.questOk > T.ref,
      mark: () => [] },
    l89_op: { mode: 'fps', init(T){
        LIVE89.force = true; LIVE89.cur = LIVE89.offer = null; T.ref = LIVE89.stats.opOk; },
      tick(T){
        if (LIVE89.cur || LIVE89.offer){ const q = LIVE89.cur; if (q && q.type === 'op') q.T = 900; return; }
        if (LIVE89.stats.opOk > T.ref) return;
        const op = LIVE89.offerOp('relay'); op.dir = near(35); op.pos = surfacePoint(op.dir, 0.4); LIVE89.offer.until = S.rtime + 60;
      },
      check: T => LIVE89.stats.opOk > T.ref,
      mark: () => [] },
  });
  Object.assign(T72T, { l89_req: A84('Просьба своих', 'A request'), l89_quest: A84('Квест героя', 'Hero quest'), l89_op: A84('Перелом боя', 'Breakthrough') });
  const PC = {
    l89_req: { keys: () => ['W'], h: A84('Свои иногда просят помощи: голос по радио, карточка «ПРОСЬБА» и маркер ✋. Отряд прижали — уничтожь врагов рядом с ним. Награда: боец капсулой с базы, ствол из кузова багги, место стрелка или прикрытие с орбиты. Не хочешь — ✕ или просто игнорируй.', 'Your units sometimes ask for help: a radio call, a REQUEST card and a ✋ marker. A squad is pinned — destroy the enemies near it. Reward: a trooper by pod from the base, a gun from a buggy trunk, the gunner seat or orbital cover. Not now — ✕ or just ignore it.') },
    l89_quest: { keys: () => ['Y'], h: A84('Ветеран-разведчик «Сыч» предлагает квест. Y — принять (N — отказ). Иди к метке ★, сними охрану и постой у пилота 3 с — он встанет в твой отряд.', 'Veteran scout "Owl" offers a quest. Y — accept (N — decline). Go to the ★ marker, clear the guards and stay by the pilot for 3 s — he joins your squad.') },
    l89_op: { keys: () => ['Y'], h: A84('Фронт встал — штаб предлагает перелом. Y — принять. Держи ретранслятор 8 с без врагов рядом: карта врага видна 60 с. Генератор — турели врага молчат 2 мин. В Стратеге — «Выдать отряду». Враг тоже так умеет: следи за ⚠.', 'The front is stuck — HQ offers a breakthrough. Y — accept. Hold the relay for 8 s with no foes near: the enemy map is revealed for 60 s. The generator — enemy turrets go silent for 2 min. In Strategist — "Assign a squad". The enemy can do it too: watch for ⚠.') },
  };
  const PH = {
    l89_req: { g: 'joy', h: A84('Свои просят помощи: карточка «ПРОСЬБА» и маркер ✋. Уничтожь врагов рядом с прижатым отрядом — получишь награду. ✕ — пропустить.', 'Your units ask for help: a REQUEST card and a ✋ marker. Destroy the enemies near the pinned squad — get a reward. ✕ — skip.') },
    l89_quest: { g: 'tap', h: A84('Герой «Сыч» предлагает квест — тапни «Принять». Иди к ★, сними охрану, постой у пилота.', 'Hero "Owl" offers a quest — tap "Accept". Go to ★, clear the guards, stay by the pilot.') },
    l89_op: { g: 'tap', h: A84('Фронт встал — тапни «Принять» и держи ретранслятор 8 с: карта врага откроется на минуту.', 'The front is stuck — tap "Accept" and hold the relay for 8 s: the enemy map opens for a minute.') },
  };
  for (const id in CTL72.schemes){ const s = CTL72.schemes[id]; if (!s.acts) continue; const src = s.plat === 'pc' ? PC : PH; for (const k in src) s.acts[k] = src[k]; }
  // выход из урока — обычный режим «Живого мира»
  if (T72.stop){ const s0 = T72.stop; T72.stop = function(){ const r = s0.apply(this, arguments); LIVE89.force = false; LIVE89.cur = LIVE89.offer = null; return r; }; }
}
