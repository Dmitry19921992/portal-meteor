// =====================================================================
//  T24 (v8.20) — ИИ шлёт технику в туннель; тяжёлая техника и боссы ходят туннелем
//  База: v8.16. Выключить всё: ?t24=0 (флаги FAC82/TUN82/TUN84 остаются свои).
//  1) TUN84.ok расширен: туннель open для тяжёлой техники (танк «Бульдог»/«Паук»,
//     «Носорог» rhino76) и боссов («Жнец» boss83). Игрок шлёт их той же кнопкой
//     «⇣ В туннель» / ПКМ по норе, что и раньше.
//  2) ИИ Роя (T24.ai) periodically шлёт свою технику в открытый туннель (1–2 машины
//     раз в 30–50 с на нору, как отряды у TUN82.ai), после выхода — сразу на цель.
//     Босс — если туннель реально срезает путь к базе врага.
//  3) Тяжёлая техника и боссы идут под землёй дольше (танк +1.3 с, «Носорог» +1.7 с,
//     босс +2.4 с к TRANS+1 у лёгких) и выходят дальше от выхода (nudge из-за габаритов).
//  4) «Боссы не застревают»: ИИ босса (BOSS83.ai перебивает приказы каждые 6 с)
//     молчит, пока босс идёт в туннель/внутри (v.ord83); сторож — если машина не дошла
//     до зева за расчётное время (30–110 с по дистанции и скорости), приказ туннеля
//     снимается, машина возвращается в обычное управление ИИ.
//  Хуки — только обёртки: TUN84.ok, TUN84.step (свой шаг после), updateCard (title),
//  PRODUCTS.tgo82.d76 (текст). Старые файлы не тронуты. Отчёт: REPORT_T24.md.
// =====================================================================
const T24 = {
  on: !/[?&]t24=0/.test(location.search),
  ver: 'v8.20 T24',
  stats: { aiSent: 0, aiThrough: 0, heavyThrough: 0, bossSent: 0, bossThrough: 0, watch: 0, nudge: 0, quiet: 0 },
  aiT: [7, 11],
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
    }
    // 2) босс в пути к туннелю / внутри: ИИ босса молчит (не перебивает приказ каждые 6 с)
    for (const v of S.vehicles){
      if (!v.alive || !v.boss83) continue;
      if (v.t84 || v.tun82){ if (v.ord83 === undefined || S.time - v.ord83 > 1){ v.ord83 = S.time; this.stats.quiet++; } }
    }
    // 3) сторож: не дошла до зева за расчётное время — снимаем приказ туннеля
    for (const v of S.vehicles){
      if (!v.alive || !v.t84 || v.tun82) continue;
      const b = TUN82.byId(v.t84.b); if (!b) { v.t84 = null; continue; }
      if (S.time - v.t84.t > this.wait(v, TUN82.mouth(b))){ v.t84 = null; v.t24 = null; this.stats.watch++; }
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
      if (T.by !== 'ai' || !T.tgt) continue;
      if (T.tgt.k === 'b'){ const e = TUN82.byId(T.tgt.id); if (e && e.alive && e.team !== v.team){ setOrder(v, 'attack', centerOf(e), { focus: e, lock: 70 }); continue; } }
      if (T.tgt.k === 'cp'){ const c = S.cps[T.tgt.i]; if (c && c.owner !== v.team){ setOrder(v, 'cap', c.pos, { cp: c, lock: 70 }); continue; } }
      if (T.tgt.k === 'hq' && S.hq[1 - v.team].alive){ setOrder(v, 'attack', S.hq[1 - v.team].pos, { lock: 70 }); continue; }
      setOrder(v, 'move', surfacePoint(offsetOnSphere(TUN82.mouthDir(x), x.fwd, 16), 0.5), { lock: 30 });
    }
    // отметка «нырнула» для п.4
    for (const v of S.vehicles) if (v.alive && v.t24 && !v.t24.pend && v.tun82) v.t24.pend = 1;
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
      const cand = S.vehicles.filter(v => v.alive && v.team === t && !v.t84 && !v.tun82 && !v.t24 && !v.byPlayer
          && v !== ctrlEntity() && (v.manualUntil || 0) < S.time && v.order !== 'escort' && v.order !== 'retreat'
          && (v.order !== 'attack' || random() < 0.5)
          && !TGT[t].some(e => e.alive && dist(e.pos, v.pos) < 55))
        .map(v => ({ v, d: surfDist(v.pos, m) }))
        .filter(o => o.d < min(220, max(60, (o.v.walk || 5) * 30)))
        .sort((a, b2) => a.d - b2.d);
      let n = 0;
      // 1–2 ближайшие обычные машины
      for (const o of cand.slice(0, 2)){
        if (TUN84.send(b, o.v, 'ai')){ o.v.t24 = { b: b.id, by: 'ai', tgt: tg, t: S.time }; n++; this.stats.aiSent++; }
      }
      // босс — один, если туннель реально срезает путь к базе/цели врага и босс не в бою у себя
      const boss = S.vehicles.find(v => v.alive && v.team === t && v.boss83 && !v.t84 && !v.tun82 && !v.t24 && !v.byPlayer && v !== ctrlEntity());
      if (boss && random() < 0.6){
        const foe = S.hq[1 - t].alive ? S.hq[1 - t].pos : tg.pos;
        const cut = surfDist(boss.pos, foe) - (surfDist(boss.pos, m) + surfDist(TUN82.mouth(x), foe));
        const inFight = TGT[t].some(e => e.alive && dist(e.pos, boss.pos) < 90);
        if (cut > 100 && !inFight && surfDist(boss.pos, m) < max(120, boss.walk * 30)){
          if (TUN84.send(b, boss, 'ai')){ boss.t24 = { b: b.id, by: 'ai', tgt: tg, t: S.time }; this.stats.bossSent++; }
        }
      }
      if (n) s.t24v = S.time + 30 + random() * 20;   // не чаще раза в 30–50 с на нору
    }
  },
  reset(){ this.aiT = [7, 11]; },
};
if (typeof TUN82 !== 'undefined' && typeof TUN84 !== 'undefined' && typeof FAC82 !== 'undefined'){
  // туннель открыт тяжёлой технике и боссам (обёртка ok из v8.4)
  { const ok0 = TUN84.ok;
    TUN84.ok = function(v){ return ok0.apply(this, arguments) || (T24.on && T24.heavy(v)); }; }
  // свой шаг — после 'tun84' (этот модуль в списке JS позже v84_fix.js)
  FAC82.steps.push(Object.assign(dt => FAC82.safe(() => T24.step(dt), 't24'), { tag: 't24' }));
  FAC82.steps.push(Object.assign(dt => FAC82.safe(() => { T24.ai(0, dt); T24.ai(1, dt); }, 't24ai'), { tag: 't24ai' }));
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
