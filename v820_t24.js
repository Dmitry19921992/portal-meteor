// =====================================================================
//  T24 (v8.20) — ИИ шлёт технику в туннель; тяжёлая техника и боссы ходят туннелем
//  База: v8.18. Выключить всё: ?t24=0 (флаги FAC82/TUN82/TUN84 остаются свои).
//  1) TUN84.ok расширен: туннель открыт тяжёлой технике (базовый танк «Бульдог»/«Паук», «Носорог» rhino76)
//     и боссам (boss83). Игрок шлёт их той же кнопкой «⇣ В туннель» / ПКМ (тап) по норе, что и раньше.
//  2) ИИ Роя шлёт технику в туннель тремя путями:
//     • route — машина, едущая к своей цели (attack/cap/move), идёт туннелем, если он срезает путь
//       (с учётом времени под землёй); после выхода продолжает свой приказ. Так идёт свежая техника с завода
//       на фронт (в бою техника далеко от норы — правило «только рядом с норой» почти не срабатывало);
//     • ai — 1–2 свободные машины рядом с норой раз в 30–50 с — фланг через туннель на цель у выхода (как отряды TUN82.ai);
//     • boss — босс (опрос раз в 4 с), если туннель срезает путь к его цели ≥ 40 м; конвой (escort) — следом.
//  3) Тяжёлые и боссы идут под землёй дольше (танк +1.3 с, «Носорог» +1.7 с, босс +2.4 с) и глубже (не торчат из земли);
//     на выходе — «отталкивание» от здания выхода по габаритам. Вход — по габариту (тяжёлым радиус больше 7.5 м)
//     и при застое у зева > 2.5 с (босс с конвоем толкались у входа в ~9 м и не ныряли).
//  4) «Никто не застревает»: ИИ босса (BOSS83.ai перебивает приказ каждые 6 с) молчит, пока босс идёт в туннель/внутри;
//     сторож — 15 с без продвижения к зеву на 3 м (или ИИ-машина не дошла за 30–110 с) → приказ туннеля и замок
//     снимаются, машина возвращается в обычное управление ИИ (игроку — строка «не может пройти к туннелю»).
//  Хуки — только обёртки: TUN84.ok, TUN84.send (метка t24), шаги FAC82.steps после 'tun84', updateCard (title),
//  PRODUCTS.tgo82.d76 (текст). Старые файлы не тронуты (кроме одной строки в build.py). Отчёт: REPORT_T24.md.
// =====================================================================
const T24 = {
  on: !/[?&]t24=0/.test(location.search),
  ver: 'v8.20 T24',
  stats: { aiSent: 0, aiThrough: 0, heavyThrough: 0, bossSent: 0, bossThrough: 0, escort: 0, dive: 0, route: 0, watch: 0, nudge: 0, quiet: 0 },
  aiT: [7, 11],
  log: [],   // сторож: почему снят приказ (для проверки, до 30 записей)
  A(ru, en){ return T82(ru, en, en); },
  // «тяжёлая» техника Т24: базовый танк («Бульдог»/«Паук», без vk — брони light/medium нет), «Носорог», босс
  heavy(v){ return !!v && v.cls === 'tank' && !!v.alive && (!v.vk || v.rhino76 || v.boss83); },
  // прибавка ко времени под землёй
  extra(v){ return v.boss83 ? 2.4 : v.rhino76 ? 1.7 : 1.3; },
  // сколько секунд даём машине дойти до зева (примерно: дистанция / 0.8·walk + 20, 30–110)
  wait(v, m){ const d = surfDist(v.pos, m); return clamp(d / (max(2, v.walk || 5) * 0.8) + 20, 30, 110); },
  // ---- свой шаг: после TUN84.step (модуль грузится позже v84_fix.js)
  step(){
    if (!this.on || !FAC82.on || S.over) return;
    // 1) тяжёлым — больше времени под землёй (однократно, при погружении)
    for (const v of S.vehicles){
      if (!v.alive || !v.tun82 || !v.tun82.veh || v.tun82.k24) continue;
      if (!this.heavy(v)) { v.tun82.k24 = 1; continue; }
      v.tun82.k24 = 1; v.tun82.until += this.extra(v);
      const d = norm(v.pos); v.pos = mul(d, groundR(d) - (v.boss83 ? 16 : 10));   // высокие (босс cy до 7 м) не торчат из земли
    }
    // 2) босс в пути к туннелю / внутри: ИИ босса молчит (не перебивает приказ каждые 6 с)
    for (const v of S.vehicles){
      if (!v.alive || !v.boss83) continue;
      if (v.t84 || v.tun82){ if (v.ord83 === undefined || S.time - v.ord83 > 1){ v.ord83 = S.time; this.stats.quiet++; } }
    }
    // 3) сторож: застряла по пути к зеву (15 с без продвижения на 3 м) или ИИ-машина не дошла за расчётное время —
    //    снимаем приказ туннеля и замок приказа: машина возвращается в обычное управление (игроку — строка в ленте)
    for (const v of S.vehicles){
      if (!v.alive || !v.t84 || v.tun82) continue;
      const b = TUN82.byId(v.t84.b); if (!b) { v.t84 = null; continue; }
      const m = TUN82.mouth(b), d = dist(v.pos, m), W = v.t84.w24 || (v.t84.w24 = { d, t: S.time, max: this.wait(v, m) });
      if (d < W.d - 3){ W.d = d; W.t = S.time; }
      // вход по габариту: TUN84 пускает с 7.5 м, а босс/тяжёлый танк у норы толкаются и встают в ~9 м от зева
      // (машина «приехала»). Тяжёлым — радиус входа больше; кто стоит у зева > 2.5 с — тоже ныряет
      const R = 7.5 + (this.heavy(v) ? (v.rad || 1.2) + 1 : 0) + (S.time - W.t > 2.5 ? 5 : 0);
      if (d < R && TUN82.isOpen(b) && v !== ctrlEntity()){ this.dive(v, b); continue; }
      const stuck = S.time - W.t > 15, late = v.t84.by !== 'player' && S.time - v.t84.t > W.max;
      if (!stuck && !late) continue;
      const pl = v.t84.by === 'player';
      if (this.log.length < 30) this.log.push({ t: Math.round(S.time), why: stuck ? 'stuck' : 'late', vk: v.boss83 ? 'boss' : v.vk || 'tank', by: v.t84.by, d: Math.round(d), d0: Math.round(W.d), ord: v.order, gm: v.goal ? Math.round(dist(v.goal, m)) : -1, sp: +len(v.vel || [0, 0, 0]).toFixed(1) });
      v.t84 = null; v.t24 = null; this.stats.watch++;
      if (!pl){ v.manualUntil = S.time; setOrder(v, 'move', v.pos, {}); }
      else if (!S.attract) feed(this.A(`${groupLabel(v)}: не может пройти к туннелю`, `${groupLabel(v)} can't reach the tunnel`), '#f88');
    }
    // 4) выход из туннеля: вытолкнуть из-за габаритов, ИИ — сразу на цель
    for (const v of S.vehicles){
      if (!v.alive || !v.t24 || !v.t24.pend || v.tun82 || v.t84) continue;
      const T = v.t24; v.t24 = null;
      const b = TUN82.byId(T.b), x = b && TUN82.exitOf(b);
      if (!x) continue;                                    // туннель обвалился — TUN82 сам разобрал
      // nudge: не пересекаться со зданием «Выход туннеля» (габариты тяжёлых/боссов)
      const need = (v.rad || 1.2) + x.rad + 1.5;
      if (dist(v.pos, x.pos) < need){
        const d = norm(sub(v.pos, x.pos));
        v.pos = surfacePoint(norm(add(x.pos, mul(d, need))), v.rad || 1.2);
        v.up = norm(v.pos); this.stats.nudge++;
      }
      this.stats.aiThrough++;
      if (v.boss83) this.stats.bossThrough++; else if (this.heavy(v)) this.stats.heavyThrough++;
      if (T.by !== 'ai') continue;
      if (T.ord && !T.tgt){   // ехала к своей цели — продолжает (цель-объект погиб/захвачен — решит обычный ИИ)
        const o = T.ord, f = o.focus;
        if (o.order === 'cap' && o.cp && o.cp.owner !== v.team){ setOrder(v, 'cap', o.cp.pos, { cp: o.cp, lock: 25 }); continue; }
        if (o.order !== 'cap' && (!f || f.alive)){ setOrder(v, o.order, o.goal, { focus: f || null, lock: 25 }); continue; }
        v.manualUntil = S.time; continue;
      }
      if (!T.tgt) continue;
      if (T.tgt.k === 'b'){ const e = TUN82.byId(T.tgt.id); if (e && e.alive && e.team !== v.team){ setOrder(v, 'attack', centerOf(e), { focus: e, lock: 70 }); continue; } }
      if (T.tgt.k === 'cp'){ const c = S.cps[T.tgt.i]; if (c && c.owner !== v.team){ setOrder(v, 'cap', c.pos, { cp: c, lock: 70 }); continue; } }
      if (T.tgt.k === 'hq' && S.hq[1 - v.team].alive){ setOrder(v, 'attack', S.hq[1 - v.team].pos, { lock: 70 }); continue; }
      setOrder(v, 'move', surfacePoint(offsetOnSphere(TUN82.mouthDir(x), x.fwd, 16), 0.5), { lock: 30 });
    }
    // отметка «нырнула» для п.4; приказ туннеля снят до входа (передумали/сторож) — метку Т24 тоже снять
    for (const v of S.vehicles){
      if (!v.alive || !v.t24 || v.t24.pend) continue;
      if (v.tun82) v.t24.pend = 1; else if (!v.t84) v.t24 = null;
    }
  },
  // вход в туннель — как в TUN84.step (v8.4)
  dive(v, b){
    const md = TUN82.mouthDir(b);
    v.tun82 = { b: b.id, until: S.time + TUN82.TRANS + 1 + random() * 0.6, veh: 1 };
    v.pos = mul(md, groundR(md) - 6); v.vel = [0, 0, 0]; S.sel.delete(v);
    fxSmoke(add(TUN82.mouth(b), mul(md, 1.2)), 1.6, 0.55, 0.7); this.stats.dive++;
  },
  // ---- ИИ Роя: слать технику в открытый туннель (как отряды — TUN82.ai)
  ai(t, dt){
    if (!this.on || !FAC82.on || S.over) return;
    if (!FAC82.aiOk(t) || !FAC82.sw(t) || !S.teams[t].ai) return;
    if ((this.aiT[t] -= dt) > 0) return; this.aiT[t] = 8;
    for (const b of TUN82.list(t)){
      if (!TUN82.isOpen(b)) continue;
      const s = TUN82.st(b), m = TUN82.mouth(b), x = TUN82.exitOf(b);
      if (S.time < (s.t24v || 0)) continue;
      const md = TUN82.mouthDir(x);
      const tg = TUN82.target(t, md);
      if (!tg) continue;
      // кандидаты: свободные машины своей стороны НЕДАЛЕЕКО от норы (успеют дойти до сторожа),
      // не в ближнем бою; attack — с шансом: фланг через туннель
      const cand = S.vehicles.filter(v => v.alive && v.team === t && !v.boss83 && TUN84.ok(v) && !v.t84 && !v.tun82 && !v.t24 && !v.byPlayer
          && v !== ctrlEntity() && (v.manualUntil || 0) < S.time && v.order !== 'escort' && v.order !== 'retreat'
          && (v.order !== 'attack' || random() < 0.5)
          && !TGT[t].some(e => e.alive && dist(e.pos, v.pos) < 55))
        .map(v => ({ v, d: surfDist(v.pos, m) }))
        .filter(o => o.d < min(220, max(60, (o.v.walk || 5) * 30)))
        .sort((a, b2) => a.d - b2.d);
      let n = 0;
      // 1–2 ближайшие обычные машины
      for (const o of cand.slice(0, 2)){
        if (TUN84.send(b, o.v, 'ai')){ o.v.t24.tgt = tg; n++; this.stats.aiSent++; }
      }
      if (n) s.t24v = S.time + 30 + random() * 20;   // не чаще раза в 30–50 с на нору
    }
  },
  // ---- выигрыш пути через туннель: лучшая открытая нора стороны t для машины v к точке foe
  //      (путь по поверхности − (до зева + от выхода до цели + время под землёй × скорость)); null — не выгодно
  gain(v, t, foe, minCut, maxM){
    const over = surfDist(v.pos, foe), sp = max(2, v.walk || 4);
    let best = null, bc = minCut;
    for (const b of TUN82.list(t)){
      if (!TUN82.isOpen(b)) continue;
      const m = TUN82.mouth(b), x = TUN82.exitOf(b), dm = surfDist(v.pos, m), dx = surfDist(TUN82.mouth(x), foe);
      if (dm > maxM || dx >= over) continue;
      const cut = over - (dm + dx + (TUN82.TRANS + 1 + (this.heavy(v) ? this.extra(v) : 0.3)) * sp);
      if (cut > bc){ bc = cut; best = b; }
    }
    return best;
  },
  // ---- ИИ: машина, которая едет к своей цели (свежая с завода — на фронт), идёт туннелем, если он срезает путь;
  //      после выхода продолжает свой приказ. Опрос машины раз в 4–6 с, на нору — не больше 3 машин за 20 с
  route(t){
    if (!this.on || !FAC82.on || S.over || !FAC82.aiOk(t) || !FAC82.sw(t) || !S.teams[t].ai) return;
    if (!TUN82.list(t).some(b => TUN82.isOpen(b))) return;
    for (const v of S.vehicles){
      if (!v.alive || v.team !== t || v.boss83 || v.t84 || v.tun82 || v.t24 || v.byPlayer || v === ctrlEntity()) continue;
      if (S.time < (v.t24n || 0)) continue; v.t24n = S.time + 4 + random() * 2;
      if (!TUN84.ok(v) || !v.goal || (v.order !== 'attack' && v.order !== 'cap' && v.order !== 'move') || v.rush) continue;
      if (TGT[t].some(e => e.alive && e.cls !== 'bld' && dist(e.pos, v.pos) < 70)) continue;
      const b = this.gain(v, t, v.goal, 50, 240); if (!b) continue;
      const s = TUN82.st(b); if (S.time > (s.t24w || 0)){ s.t24w = S.time + 20; s.t24k = 0; }
      if (s.t24k >= 3) continue;
      const ord = { order: v.order, goal: v.goal, cp: v.cp, focus: v.focus };
      if (TUN84.send(b, v, 'ai')){ v.t24.ord = ord; s.t24k++; this.stats.route++; }
    }
  },
  // ---- ИИ босса: свой опрос раз в 4 с (не зависит от паузы норы). Босс сразу уходит с конвоем по поверхности,
  //      поэтому решаем по выигрышу пути (с учётом времени под землёй), пока он ещё недалеко от норы; конвой — следом
  boss(t){
    if (!this.on || !FAC82.on || S.over || !FAC82.aiOk(t) || !FAC82.sw(t) || !S.teams[t].ai) return;
    for (const B of S.vehicles){
      if (!B.alive || B.team !== t || !B.boss83 || B.t84 || B.tun82 || B.t24 || B.byPlayer || B === ctrlEntity()) continue;
      if (S.time < (B.t24n || 0)) continue; B.t24n = S.time + 4;
      if (TGT[t].some(e => e.alive && e.cls !== 'bld' && dist(e.pos, B.pos) < 90)) continue;   // в бою — не до туннелей
      const foe = B.goal || (S.hq[1 - t].alive ? S.hq[1 - t].pos : null); if (!foe) continue;
      const best = this.gain(B, t, foe, 40, 260);
      if (!best || !TUN84.send(best, B, 'ai')) continue;
      const tg = TUN82.target(t, TUN82.mouthDir(TUN82.exitOf(best)));
      B.t24.tgt = tg; this.stats.bossSent++;
      for (const g of groupsOf(t)){
        if (g === B || g.order !== 'escort' || g.escort !== B || g === playerGroup()) continue;
        if (isSquad(g)){ if (TUN82.send(best, g, 'ai', tg)) this.stats.escort++; }
        else if (TUN84.ok(g) && !g.t84 && TUN84.send(best, g, 'ai')){ g.t24.tgt = tg; this.stats.escort++; }
      }
    }
  },
  reset(){ this.aiT = [7, 11]; },
};
if (typeof TUN82 !== 'undefined' && typeof TUN84 !== 'undefined' && typeof FAC82 !== 'undefined'){
  // туннель открыт тяжёлой технике и боссам (обёртка ok из v8.4)
  { const ok0 = TUN84.ok;
    TUN84.ok = function(v){ return ok0.apply(this, arguments) || (T24.on && T24.heavy(v)); }; }
  // каждая отправка (ИИ и игрок) получает метку Т24: выход с «отталкиванием», ИИ — цель после выхода
  { const sd0 = TUN84.send;
    TUN84.send = function(b, v, by){ const r = sd0.apply(this, arguments);
      if (r && T24.on) v.t24 = { b: b.id, by: by === 'player' ? 'player' : 'ai', tgt: null, t: S.time };
      if (r && T24.on && v.boss83) v.ord83 = S.time;   // ИИ босса (раз в 6 с) не перебьёт приказ в первый же кадр
      return r; }; }
  // свой шаг — после 'tun84' (этот модуль в списке JS позже v84_fix.js)
  FAC82.steps.push(Object.assign(dt => FAC82.safe(() => T24.step(dt), 't24'), { tag: 't24' }));
  FAC82.steps.push(Object.assign(dt => FAC82.safe(() => { T24.ai(0, dt); T24.ai(1, dt); T24.boss(0); T24.boss(1); T24.route(0); T24.route(1); }, 't24ai'), { tag: 't24ai' }));
  FAC82.resets.push(() => T24.reset());
  // описание кнопки «Отряды — в туннель»: теперь и тяжёлая техника, и боссы
  if (PRODUCTS.tgo82) PRODUCTS.tgo82.d76 = [
    'Рой. Отряды в 70 м от норы (и выделенные), а также выделенная техника — вплоть до тяжёлой и боссов («Жнец») — идут в туннель и выходят на другом конце. Или: выдели и ПКМ/тап по норе.',
    'Swarm. Squads within 70 m of the burrow (and selected ones), plus selected vehicles — up to heavy tanks and the boss — go through the tunnel. Or select and RMB/tap the burrow.',
    'Bầy Đàn. Đội và xe (kể cả xe nặng và trùm) đi qua hầm.'];
  // title кнопки «В туннель» в карточке, если выделена тяжёлая техника/босс (текст v8.4 врёт)
  if (typeof updateCard === 'function'){ const uc0 = updateCard;
    updateCard = function(){
      const r = uc0.apply(this, arguments);
      FAC82.safe(() => {
        if (!T24.on) return;
        const el = $('card'); if (!el) return;
        const bt = el.querySelector('[data-t82]'); if (!bt) return;
        if (TUN84.sel().some(v => T24.heavy(v))) bt.title = T24.A('Техника Роя идёт в ближайший открытый туннель — теперь и тяжёлая, и боссы', 'Swarm vehicles go into the nearest open tunnel — heavy tanks and bosses too');
      }, 't24card');
      return r;
    }; }
}
