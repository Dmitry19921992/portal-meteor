// =====================================================================
//  v8.6 — УРОК «БИОМЫ И АНОМАЛИИ» на движке уроков v8.4 (L84 + T72): шутер, 4 шага, ПК и телефон.
//  Зелёная зона (трава прячет пехоту) → резкая граница в другой биом → «Вывих» (перелёт в антипод) → вердан (нейтрален,
//  пока не тронешь; уничтожить). Седьмая плитка в «Обучение» → «Уроки новых механик». В уроке аномалии и верданы включены.
// =====================================================================
if (typeof L84 !== 'undefined' && typeof DEF72 !== 'undefined'){
  L84.LES.l86bio = { kind: 'fps', ic: '🌿', n: A84('Биомы и аномалии', 'Biomes and anomalies'),
    d: A84('Зелёная трава прячет пехоту, резкая граница биомов, «Вывих» уносит в антипод, верданы нейтральны, пока не тронешь', 'Green grass hides infantry, sharp biome borders, the Dislocation throws you to the antipode, Verdans are neutral until provoked'),
    steps: ['b86_green', 'b86_cross', 'b86_disloc', 'b86_ver'] };
  L84.ORDER.push('l86bio');
  T72N.l86bio = L84.LES.l86bio.n;
  const W86 = { grass: A84('ТРАВА', 'GRASS'), cross: A84('ЗА ГРАНИЦУ', 'ACROSS'), dis: A84('ВЫВИХ', 'DISLOCATION'), ver: A84('ВЕРДАН', 'VERDAN') };
  // точка у границы зелёной зоны: идём от зерна наружу, пока биом не сменится
  const border = () => {
    BIO86.init();
    const c = L84.me(), at = c ? norm(c.pos) : BASES[0];
    const seeds = BIO86.S.map((s, i) => ({ s, k: BIO86.K[i] })).filter(o => o.k === 1).sort((a, b) => surfDist(a.s, at) - surfDist(b.s, at));
    for (const { s } of seeds) for (let a = 0; a < 12; a++){
      const t1 = anyTangent(s), t2 = cross(s, t1), F = norm(add(mul(t1, cos(a * 0.52)), mul(t2, sin(a * 0.52))));
      for (let m = 20; m < 260; m += 2){
        const d = offsetOnSphere(s, F, m), pk = BIO86.pick(mul(d, RM));
        if (pk.b === 1) continue;
        const A = offsetOnSphere(s, F, m - 26), G = offsetOnSphere(s, F, m - 10), B = offsetOnSphere(s, F, m + 7);
        const ok = [A, G, B].every(x => (!TER81.ready || !TER81.near(x, 4)) && !TER81.lakeAt(mul(x, RM)) && abs(groundR(x) - RM) < 14);
        if (ok && BIO86.at(mul(A, RM)) === 1 && BIO86.at(mul(G, RM)) === 1 && BIO86.at(mul(B, RM)) === pk.b) return { A, G, B, b2: pk.b };
        break;
      }
    }
    return null;
  };
  // в уроке аномалии волн 1–2 и верданы работают (обычно в обучении они выключены)
  const inL = () => typeof T72 !== 'undefined' && T72.on && L84.cur === 'l86bio';
  { const a0 = A78.active; A78.active = function(){ return a0.apply(this, arguments) || (inL() && this.on && SET.a78 !== false); }; }
  { const v0 = VER86.active; VER86.active = function(){ return v0.apply(this, arguments) || (inL() && this.on); }; }
  Object.assign(DEF72, {
    b86_green: { mode: 'fps', init(T){ const P = T.b86P = border(); T.acc = 0; if (!P) return; L84.tp(P.A, mul(P.G, RM)); T.goal = L84.gp(P.G, 0.2); },
      check(T, dt){ const c = L84.me(); if (!T.b86P) return true; if (c && dist(c.pos, T.goal) < 4 && BIO86.at(c.pos) === 1) T.acc += dt; return T.acc > 0.6; },
      mark: T => [mk84(T.goal, W86.grass, '#62ff9a')].filter(Boolean) },
    b86_cross: { mode: 'fps', init(T){ const P = T.b86P = DEF72.b86_green.P0 || border(); T.goal = P ? L84.gp(P.B, 0.2) : null; },
      check: T => { const c = L84.me(); if (!T.b86P) return true; return !!c && BIO86.at(c.pos) === T.b86P.b2 && dist(c.pos, T.goal) < 6; },
      mark: T => [mk84(T.goal, W86.cross, T.b86P ? BIO86.CSS[T.b86P.b2] : '#fff')].filter(Boolean) },
    b86_disloc: { mode: 'fps', init(T){
        T.ref = AN86.stats.exits; const c = L84.me();
        const a = T.b86a = A78.L.filter(x => x.k === 'disloc').sort((p, q) => dist(p.pos, c ? c.pos : p.pos) - dist(q.pos, c ? c.pos : q.pos))[0];
        if (!a) return; a.dormT = 0; a.st = 'idle';
        L84.tp(offsetOnSphere(a.dir, a.t1, a.r + 9), a.pos); T.goal = add(a.pos, mul(a.dir, 1.5)); },
      check: T => !T.b86a || AN86.stats.exits > T.ref,
      mark: T => { const c = L84.me(); return c && c.a86 ? [] : [mk84(T.goal, W86.dis, A78.K.disloc.css)].filter(Boolean); } },
    b86_ver: { mode: 'fps', init(T){
        T.ref = VER86.stats.killed;
        const s = BIO86.S[BIO86.K.indexOf(1)]; let d = null;
        for (let k = 0; k < 40 && !d; k++){ const x = offsetOnSphere(s, norm(tangent(randUnit(), s)), 10 + k * 3); if (VER86.green(x) && (!TER81.ready || !TER81.near(x, 6)) && abs(groundR(x) - RM) < 14) d = x; }
        if (!d) return;
        const F = norm(tangent(randUnit(), d)), fd = offsetOnSphere(d, F, 18);
        L84.tp(d, mul(fd, RM));
        const f = T.b86f = VER86.add('spore', fd, Math.random); f.hp = f.maxhp = 60; f.home = fd;
        const c = L84.me(); if (c){ c.rocketCd = 0; } },
      tick(){ const c = L84.me(); if (c && c.rocketCd > 1.5) c.rocketCd = 1.5; },
      check: T => !T.b86f || VER86.stats.killed > T.ref,
      mark: T => T.b86f && T.b86f.alive ? [mk84(add(T.b86f.pos, mul(T.b86f.up, 2)), W86.ver, '#d4ff6a')] : [] },
  });
  { const i0 = DEF72.b86_green.init; DEF72.b86_green.init = function(T){ i0.call(this, T); DEF72.b86_green.P0 = T.b86P; }; }
  Object.assign(T72T, {
    b86_green: A84('Зелёная зона', 'Green zone'), b86_cross: A84('Резкая граница', 'Sharp border'), b86_disloc: A84('Вывих', 'Dislocation'), b86_ver: A84('Вердан', 'Verdan'),
  });
  const PC = {
    b86_green: { keys: () => ['W'], h: A84('Метеорит теперь разный: зелёная трава, рыжая осень, снег — с резкой границей. Иди к метке «ТРАВА». В зелёной зоне трава прячет пехоту: враг дальше 40 м тебя не видит, пока ты не стреляешь.', 'The meteor now has biomes: green grass, russet autumn, snow — with sharp borders. Walk to the "GRASS" marker. In the green zone grass hides infantry: enemies beyond 40 m cannot see you unless you fire.') },
    b86_cross: { keys: () => ['W'], h: A84('Перейди границу к метке. В «Рыжем поясе» шаги громче (бегущего слышно за 32 м), в «Белой шапке» пехота медленнее на 15 %, а обзор ×0.7.', 'Cross the border to the marker. In the Russet belt footsteps are louder (runners are heard 32 m away), in the White cap infantry is 15% slower and sight is ×0.7.') },
    b86_disloc: { keys: () => ['W'], h: A84('Аномалии второй волны. «Вывих» — пыль падает вверх. Войди в него: тебя унесёт в небо-портал, и через ~5 с выйдешь в антиподе (выход виден обеим командам). Ещё: «Мозаика» (пиксели, разброс), «Гейзер» (заморозка), «Сквозняк» (сносит), «Глушитель» (нет связи). Болт (E) или граната разряжают аномалию.', 'Second-wave anomalies. The Dislocation — dust falls upwards. Step in: the sky portal takes you and ~5 s later you exit at the antipode (both teams see the exit). Also: Mosaic (pixels, spread), Geyser (freeze), Draught (pushes), Muffler (no radio). A bolt (E) or a grenade discharges an anomaly.') },
    b86_ver: { mouse: 'lmb', h: A84('Вердан — живое растение-пришелец. Нейтрален, пока не тронешь и не подойдёшь близко, но опасен обеим фракциям. Этот — Споровик: уничтожь его издалека (ЛКМ), не подходя к облаку спор. Огонь жжёт верданов сильнее.', 'A Verdan is a living alien plant. It is neutral until you touch it or come close, but dangerous to both factions. This one is a Sporecap: destroy it from range (LMB) without walking into the spore cloud. Fire burns Verdans harder.') },
  };
  const PH = {
    b86_green: { g: 'joy', h: A84('Метеорит теперь разный: зелёная трава, осень, снег — с резкой границей. Иди джойстиком к метке «ТРАВА». Трава прячет пехоту: дальше 40 м враг тебя не видит, пока не стреляешь.', 'The meteor now has biomes with sharp borders. Use the stick to walk to the "GRASS" marker. Grass hides infantry beyond 40 m unless you fire.') },
    b86_cross: { g: 'joy', h: A84('Перейди границу к метке. Осень — шаги громче, снег — медленнее и хуже обзор.', 'Cross the border to the marker. Autumn — louder steps, snow — slower and worse sight.') },
    b86_disloc: { g: 'joy', h: A84('«Вывих» — пыль падает вверх. Войди в него: унесёт в небо и через ~5 с выбросит в антиподе. Кнопка ⏏ рядом с аномалией — бросить болт и разрядить её.', 'The Dislocation — dust falls upwards. Step in: it lifts you to the sky and ~5 s later drops you at the antipode. The ⏏ button near an anomaly throws a bolt to discharge it.') },
    b86_ver: { g: 'tap', h: A84('Вердан нейтрален, пока не подойдёшь близко. Уничтожь Споровика издалека — стреляй.', 'A Verdan is neutral until you come close. Destroy the Sporecap from range — shoot.') },
  };
  for (const id in CTL72.schemes){ const s = CTL72.schemes[id]; if (!s.acts) continue; const src = s.plat === 'pc' ? PC : PH; for (const k in src) s.acts[k] = src[k]; }
  const st = document.createElement('style'); st.id = 'l86css';
  st.textContent = `@media (min-width:821px){ .t72menu .l84g{grid-template-columns:repeat(4,1fr)} }`;
  document.head.appendChild(st);
}
