// =====================================================================
//  v8.5 — УРОК «КОМАНДИР» на движке уроков v8.4 (L84 + T72): 6 шагов, ПК и телефон.
//  Войти в режим → приказ строем к метке → способность → смена отряда → нырок в шутер → обратно в «Командир».
//  Плитка — в «Обучение» → «Уроки новых механик» (шестая). На телефоне режим в уроке включён принудительно (CMD85.force).
// =====================================================================
{
  L84.LES.l85cmd = { kind: 'rts', ic: '⌖', n: A84('Командир', 'Commander'),
    d: A84('Третий режим: вид сверху на один отряд, приказы кликом, 4 способности, смена отряда, нырок в шутер и обратно', 'The third mode: top view of one squad, click orders, 4 abilities, squad switching, diving into the shooter and back'),
    steps: ['c85_enter', 'c85_move', 'c85_abil', 'c85_switch', 'c85_dive', 'c85_back'] };
  L84.ORDER.push('l85cmd');
  T72N.l85cmd = L84.LES.l85cmd.n;
  const W85 = { go: A84('СЮДА', 'HERE'), sq: A84('ОТРЯД', 'SQUAD') };
  const sqs = () => CMD85.list().filter(isSquad);
  Object.assign(DEF72, {
    c85_enter: { init(T){ CMD85.force = true; }, check: () => CMD85.on && !!CMD85.g },
    c85_move: { init(T){ T.ref = CMD85.stats.orders; const p = CMD85.anchor(CMD85.g); T.goal = p ? L84.gp(L84.toward(norm(p), L84.foeDir(), 42), 0.3) : null; },
      tick(T){ if (!T.goal && CMD85.g){ const p = CMD85.anchor(CMD85.g); if (p) T.goal = L84.gp(L84.toward(norm(p), L84.foeDir(), 42), 0.3); } },
      check: T => { const g = CMD85.g; return CMD85.on && CMD85.stats.orders > T.ref && !!g && !!g.goal && (!T.goal || surfDist(g.goal, T.goal) < 24); },
      mark: T => CMD85.on ? [mk84(T.goal, W85.go)].filter(Boolean) : [] },
    c85_abil: { init(T){ T.ref = CMD85.stats.abil; const g = CMD85.g; if (g) g.c85cd = {}; }, check: T => CMD85.stats.abil > T.ref },
    c85_switch: { init(T){ T.ref = CMD85.stats.sw;
        if (sqs().length < 2){ const g = CMD85.g, p = g && CMD85.anchor(g); const sq = spawnSquad(0, false, p ? offsetOnSphere(norm(p), anyTangent(norm(p)), 30) : BASES[0], 4); setOrder(sq, 'hold', leaderPos(sq), { lock: 600 }); } },
      check: T => CMD85.stats.sw > T.ref,
      mark: T => { if (!CMD85.on) return []; const o = sqs().find(x => x !== CMD85.g); const p = o && CMD85.anchor(o); return p ? [mk84(add(p, mul(norm(p), 3)), W85.sq, '#9fdcff')] : []; } },
    c85_dive: { init(T){ T.ref = CMD85.stats.dive; }, check: T => CMD85.stats.dive > T.ref && S.mode === 'fps' },
    c85_back: { init(T){ T.ref = CMD85.stats.ret; }, check: T => CMD85.stats.ret > T.ref && CMD85.on },
  });
  Object.assign(T72T, {
    c85_enter: A84('Режим «Командир»', 'Commander mode'), c85_move: A84('Приказ строем', 'Move in formation'), c85_abil: A84('Способность отряда', 'Squad ability'),
    c85_switch: A84('Другой отряд', 'Another squad'), c85_dive: A84('Нырок в шутер', 'Dive into the shooter'), c85_back: A84('Обратно в «Командир»', 'Back to Commander'),
  });
  const PC = {
    c85_enter: { keys: () => ['P'], el: () => [{ sel: '#c85go' }], h: A84('Включи третий режим «Командир»: клавиша P или кнопка «⌖ Командир» внизу, рядом с «▶ Вселиться». Камера опустится к отряду — 27 м над ним, под углом.', 'Turn on the third mode, Commander: the P key or the "⌖ Commander" button at the bottom next to "▶ Possess". The camera drops to the squad — 27 m above it, at an angle.') },
    c85_move: { mouse: 'lmb', h: A84('ЛКМ по метке «СЮДА» — отряд пойдёт туда строем. ЛКМ по врагу — атаковать, двойной ЛКМ по земле — бегом. Q/E и колесо — камера.', 'LMB on the "HERE" marker — the squad moves there in formation. LMB on an enemy — attack, double LMB on the ground — run. Q/E and the wheel — camera.') },
    c85_abil: { keys: () => ['1', '2', '3', '4'], el: () => [{ sel: '#c85 .c5ab' }], h: A84('Четыре способности отряда — клавиши 1–4 или кнопки внизу. Дым, рывок и подавление — потом ЛКМ по точке (та же клавиша ещё раз — по курсору). Медик — сразу.', 'Four squad abilities — keys 1–4 or the buttons below. Smoke, sprint and suppression — then LMB on a point (the same key again — at the cursor). Medic — instantly.') },
    c85_switch: { keys: () => ['Tab'], el: () => [{ sel: '#c85 .c5cd:not(.cur)' }], h: A84('Смени отряд: Tab, карточка слева или средняя кнопка мыши по отряду на карте. Прежний отряд сам продолжит последний приказ.', 'Switch squads: Tab, a card on the left or the middle mouse button on a squad. The previous squad carries on with its last order.') },
    c85_dive: { mouse: 'lmb', el: () => [{ sel: '#c85 .c5go' }], h: A84('Двойной ЛКМ по бойцу своего отряда (или F, «▶ В бой») — нырок в шутер. Колесо «внутрь» до упора — в бойца от третьего лица.', 'Double LMB on a trooper of your squad (or F, "▶ Fight") — dive into the shooter. Wheel all the way in — into the trooper in third person.') },
    c85_back: { keys: () => [bk('rts')], h: () => A84(`${bk('rts')} в шутере — обратно в «Командир» над тем же отрядом; P — к «Стратегу». Ветеранство отрядов сохраняется между боями: меню → «Мои отряды».`, `${bk('rts')} in the shooter — back to Commander over the same squad; P — to the Strategist. Squad veterancy carries over between battles: menu → "My squads".`) },
  };
  const PH = {
    c85_enter: { g: 'tap', el: () => [{ sel: '#c85go' }], h: A84('Тапни ⌖ вверху справа — режим «Командир». На телефоне он включается в Настройках («Режим «Командир» на телефоне»), в уроке — уже включён.', 'Tap ⌖ at the top right — Commander mode. On a phone turn it on in Settings ("Commander mode on phone"); in the lesson it is already on.') },
    c85_move: { g: 'tap', h: A84('Тапни метку «СЮДА» — отряд пойдёт строем. Тап по врагу — атаковать. Тянуть пальцем — поворот камеры, щипок — зум.', 'Tap the "HERE" marker — the squad moves in formation. Tap an enemy — attack. Drag — rotate the camera, pinch — zoom.') },
    c85_abil: { g: 'tap', el: () => [{ sel: '#c85 .c5ab' }], h: A84('Круглые кнопки справа внизу — 4 способности. Дым, рывок, подавление — потом тап по точке на карте.', 'The round buttons at the bottom right are 4 abilities. Smoke, sprint, suppression — then tap a point on the map.') },
    c85_switch: { g: 'tap', el: () => [{ sel: '#c85 .c5cd:not(.cur)' }], h: A84('Тапни другую карточку слева — камера перелетит к тому отряду.', 'Tap another card on the left — the camera flies to that squad.') },
    c85_dive: { g: 'tap', el: () => [{ sel: '#c85 .c5go' }], h: A84('Двойной тап по бойцу отряда или «▶ В бой» — нырок в шутер.', 'Double-tap a trooper of the squad or "▶ Fight" — dive into the shooter.') },
    c85_back: { g: 'tap', el: () => [{ sel: '#touch .tt [data-t="map"]' }], h: A84('«◩ Стратегия» в шутере вернёт в «Командир» над тем же отрядом. Ветеранство отрядов сохраняется между боями: меню → «Мои отряды».', '"◩ Strategy" in the shooter brings you back to Commander over the same squad. Squad veterancy carries over: menu → "My squads".') },
  };
  const wrap = o => { const r = Object.assign({}, o); if (typeof o.h === 'function'){ const f = o.h; Object.defineProperty(r, 'h', { get: f, enumerable: true }); } return r; };
  for (const id in CTL72.schemes){ const s = CTL72.schemes[id]; if (!s.acts) continue; const src = s.plat === 'pc' ? PC : PH; for (const k in src) s.acts[k] = wrap(src[k]); }
  const ls0 = L84.start; L84.start = function(id){ CMD85.force = id === 'l85cmd'; if (CMD85.on) CMD85.exit(); return ls0.apply(this, arguments); };
  const sp0 = T72.stop; T72.stop = function(){ const was = CMD85.force; CMD85.force = false; if (was && CMD85.on) CMD85.exit(); return sp0.apply(this, arguments); };
  const st = document.createElement('style'); st.id = 'l85css';
  st.textContent = `@media (min-width:821px){ .t72menu .l84g{grid-template-columns:repeat(6,1fr)} }`;
  document.head.appendChild(st);
}
