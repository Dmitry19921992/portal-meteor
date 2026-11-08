// =====================================================================
//  v7.5 — из «НЕ СДЕЛАНО» v7.4 (идеи 21.10 02:16):
//   2) стройка солдатами: E у своей стройки — боец строит сам (напарники рядом помогают);
//      стратег-бот сам просит помочь с ближайшей стройкой (метка «СТРОЙКА» + рация);
//   9, 10) артудар и ракетница по меткам стратега: стратег-бот ставит метку ⌖ на скопление врагов
//      рядом с тобой — через 8 с туда бьёт артиллерия, свои РСЗО «Град» в радиусе 220 м дают залп;
//      артудар стратега-человека (RTS) — РСЗО рядом тоже стреляют по этой точке;
//   8) тайники с оружием в грузовых контейнерах и упавших спутниках: E — взять (пулемёт на 90 с,
//      зажигательные, ракеты…), гранаты пополняются; тайник наполняется снова через 5 мин;
//   7) ползком: Ctrl — лечь / встать (нажать и отпустить: держать Ctrl нельзя — Ctrl+W закрывает вкладку).
//   Выключить всё: localStorage pm_field75 = 0.
// =====================================================================
const FIELD75 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('field75') === '0') return false; return localStorage.getItem('pm_field75') !== '0'; } catch (e){ return true; } })(),
  err: {}, build: null, order: null, orderT: 70, marks: [], markT: 45, prone: false, proneK: 0, stats: { built: 0, marks: 0, caches: 0, salvo: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('field75 ' + tag, e); } } },
  me(){ const c = S.me; return c && c.alive && c.cls === 'inf' && S.mode === 'fps' && !S.attract && ctrlEntity() === c ? c : null; },
  seated(){ return typeof V74 !== 'undefined' && !!V74.seat; },
  // ---------------- стройка
  siteNear(c, R){
    let best = null, bd = 1e9;
    for (const b of S.buildings){
      if (!b.alive || b.team !== 0 || b.done || b.cls !== 'bld') continue;
      const d = dist(b.pos, c.pos) - b.rad;
      if (d < (R || 4.5) && d < bd){ bd = d; best = b; }
    }
    return best;
  },
  buildStep(dt){
    const B = this.build; if (!B) return;
    const c = this.me(), b = B.b;
    if (!c || c !== B.u || !b.alive || b.done || dist(b.pos, c.pos) - b.rad > 7 || this.seated()){
      if (b.done && c){ feed(tr(`Построено руками отряда: ${bname(b.type)}`, `Built by the squad: ${bname(b.type)}`, `Đội đã xây xong: ${bname(b.type)}`, `החוליה בנתה: ${bname(b.type)}`), '#8fffaa'); this.stats.built++; if (this.order && this.order.b === b) this.order = null; }
      this.build = null; return;
    }
    // напарники в 14 м помогают (каждый +40 %)
    let help = 0; if (c.squad) for (const u of c.squad.units) if (u !== c && u.alive && dist(u.pos, b.pos) < b.rad + 14) help++;
    const T = BTYPES[b.type], d = dt * 0.75 * (1 + 0.4 * help) / T.time;
    b.built = min(1, b.built + d); b.hp = min(b.maxhp, b.hp + b.maxhp * 0.85 * d);
    B.t += dt;
    const top = add(b.pos, mul(b.up, max(0.4, b.H * max(0.15, b.built) * 0.9)));
    if (random() < dt * 14) S.sparks.push({ pos: add(top, mul(randUnit(), b.rad * 0.5)), vel: add(mul(b.up, 2.5), mul(randUnit(), 2.5)), life: 0.35, heal: 0 });
    if (b.built >= 1) finishSite(b);
  },
  // стратег просит помочь с ближайшей стройкой
  orderStep(dt){
    const c = this.me();
    if (this.order && (!this.order.b.alive || this.order.b.done || S.time - this.order.t > 150)) this.order = null;
    if (!c || this.order || this.build){ return; }
    this.orderT -= dt; if (this.orderT > 0) return;
    this.orderT = 60 + random() * 40;
    if (S.teams[0] && S.teams[0].ai === false) return;   // стратег-бот выключен (I)
    let best = null, bd = 230;
    for (const b of S.buildings){
      if (!b.alive || b.team !== 0 || b.done || b.cls !== 'bld') continue;
      const d = surfDist(b.pos, c.pos);
      const eng = S.builders.some(x => x.alive && x.team === 0 && dist(x.pos, b.pos) < b.rad + 12);
      if (d < bd && !eng){ bd = d; best = b; }
    }
    if (!best) return;
    this.order = { b: best, t: S.time };
    const m = Math.round(bd);
    emit('radio', { text: tr(`Боец, инженеры заняты — помоги достроить: ${bname(best.type)}, ${m} м. ${TOUCH.on ? 'Кнопка «Войти»' : bk('interact')} у стройки.`, `Trooper, the engineers are busy — help finish the ${bname(best.type)}, ${m} m. ${TOUCH.on ? 'The "Enter" button' : bk('interact')} at the site.`, `Chiến binh, giúp xây ${bname(best.type)}, ${m} m.`, `חייל, עזור לסיים ${bname(best.type)}, ${m} מ׳.`), pri: 1 });
    feed(tr(`Приказ стратега: достроить ${bname(best.type)} (${m} м)`, `Strategist order: finish the ${bname(best.type)} (${m} m)`, `Lệnh: xây ${bname(best.type)} (${m} m)`, `פקודה: לסיים ${bname(best.type)} (${m} מ׳)`), '#9cf');
  },
  // ---------------- метки стратега: артудар + РСЗО
  markStep(dt){
    for (let i = this.marks.length - 1; i >= 0; i--){
      const M = this.marks[i]; M.t += dt;
      if (!M.fired && M.t >= M.delay){ M.fired = true; startStrike(0, 'party', M.pos, 'mark75'); this.salvo(M.pos); }
      if (M.t > M.delay + 6) this.marks.splice(i, 1);
    }
    const c = this.me(); if (!c) return;
    this.markT -= dt; if (this.markT > 0) return;
    this.markT = 40 + random() * 30;
    if (S.teams[0] && S.teams[0].ai === false) return;
    // скопление видимых врагов рядом с игроком (не ближе 18 м к нему и к своим)
    const foes = [...S.units, ...S.vehicles].filter(e => e.alive && e.team === 1 && e.seen && e.seen[0] > 0 && dist(e.pos, c.pos) < 260 && dist(e.pos, c.pos) > 25 && altitude(e.pos) < 30);
    let best = null, bs = 0;
    for (const e of foes){
      let s = e.cls === 'tank' ? 3 : 1;
      for (const o of foes) if (o !== e && dist(o.pos, e.pos) < 16) s += o.cls === 'tank' ? 3 : 1;
      if (s > bs){ bs = s; best = e; }
    }
    if (!best || bs < 3) return;
    const pos = surfacePoint(norm(best.pos), 0.3);
    if (S.units.some(u => u.alive && u.team === 0 && dist(u.pos, pos) < 18)) return;
    this.marks.push({ pos, t: 0, delay: 8, fired: false });
    this.stats.marks++;
    emit('radio', { text: tr(`Стратег: метка ⌖ на скопление врага, ${Math.round(dist(pos, c.pos))} м — артудар через 8 секунд. Не подходи!`, `Strategist: target mark ⌖ on an enemy cluster, ${Math.round(dist(pos, c.pos))} m — artillery in 8 seconds. Stay clear!`, `Chiến lược gia: đánh dấu ⌖ — pháo kích sau 8 giây!`, `אסטרטג: סימון ⌖ — ארטילריה בעוד 8 שניות!`), pri: 2 });
  },
  salvo(pos){
    let n = 0;
    for (const v of S.vehicles){
      if (!v.alive || v.team !== 0 || v.vk !== 'mlrs' || dist(v.pos, pos) > 220 || n >= 2) continue;
      this.safe(() => { V2.startSalvo(v, pos, null, false); n++; }, 'salvo');
    }
    if (n){ this.stats.salvo += n; if (!S.attract) feed(tr(`РСЗО «Град» ×${n}: залп по метке стратега`, `MLRS "Grad" ×${n}: salvo at the strategist's mark`, `MLRS ×${n}: bắn loạt vào điểm đánh dấu`, `MLRS ×${n}: מטח לעבר הסימון`), '#ffd27a'); }
  },
  // ---------------- тайники
  // PROP_KINDS[3] — грузовые контейнеры (все), [0] — упавшие спутники (каждый второй)
  cacheReset(){ for (const p of PROPS){ p.cache75 = (p.kind === 3 || (p.kind === 0 && p.id % 2 === 0)) ? 1 : 0; p.cacheT75 = 0; } },
  cacheNear(c){
    for (const p of PROPS){ if (!p.alive || !p.cache75) continue; if (dist(p.pos, c.pos) < (p.bound || 6) + 3) return p; }
    return null;
  },
  cacheStep(){
    for (const p of PROPS) if (!p.cache75 && p.cacheT75 && S.time > p.cacheT75){ p.cache75 = 1; p.cacheT75 = 0; }
  },
  takeCache(p){
    const K = S.kit, c = S.me; if (!K || !c) return;
    p.cache75 = 0; p.cacheT75 = S.time + 300;
    const opts = ['hmg', 'inc', 'rockets'];
    const r = opts[floor(random() * opts.length)];
    let t = '';
    if (r === 'hmg' && WEAPONS.hmg){ K.hmgT = max(K.hmgT || 0, 90); K.mag.hmg = WEAPONS.hmg.mag; K.w = 'hmg'; K.reloadT = 0; emit('wswitch', {}); t = tr('тяжёлый пулемёт на 90 с', 'a heavy MG for 90 s', 'súng máy nặng 90 giây', 'מקלע כבד ל-90 שניות'); }
    else if (r === 'inc'){ K.incT = max(K.incT || 0, 60); t = tr('зажигательные патроны на 60 с', 'incendiary rounds for 60 s', 'đạn cháy 60 giây', 'תחמושת מבעירה ל-60 שניות'); }
    else { K.freeRockets = (K.freeRockets || 0) + 3; c.rocketCd = 0; t = tr('3 ракеты без перезарядки', '3 rockets with no cooldown', '3 tên lửa', '3 רקטות'); }
    if (typeof G62 !== 'undefined') this.safe(() => { const G = G62.kit(); G.gren = max(G.gren || 0, G62.MAX || 3); }, 'gren');
    for (const w in WEAPONS) if (WEAPONS[w].mag && K.mag) K.mag[w] = WEAPONS[w].mag;
    this.stats.caches++;
    emit('reward', { text: t }); emit('ui', { kind: 'ok' });
    feed('📦 ' + tr('Тайник: ', 'Weapon cache: ', 'Kho vũ khí: ', 'מטמון: ') + t + tr(' · гранаты и магазины полные', ' · grenades and mags full', ' · lựu đạn và băng đạn đầy', ' · רימונים ומחסניות מלאים'), '#ffd27a');
  },
  // ---------------- ползком
  proneStep(dt){
    const c = this.me();
    if (!c || !c.grounded || this.seated() || c.thrusting){ if (this.prone && (!c || c.thrusting || this.seated())) this.prone = false; }
    this.proneK += ((this.prone && c ? 1 : 0) - this.proneK) * min(1, dt * 8);
    if (this.proneK > 0.5 && c) c.crouch = true;
  },
  // ---------------- поверх кадра
  overlay(){
    const c = this.me(); if (!c || !S.cam) return;
    const W = innerWidth, H = innerHeight;
    octx.save(); octx.textAlign = 'center';
    // метки стратега
    for (const M of this.marks){
      const s = project(add(M.pos, mul(norm(M.pos), 0.5))); if (!s) continue;
      const left = max(0, M.delay - M.t), k = 0.5 + 0.5 * sin(S.rtime * (left < 3 ? 14 : 6));
      const r = clamp(1400 / s[2], 10, 60);
      octx.strokeStyle = `rgba(255,90,60,${(0.55 + 0.4 * k).toFixed(2)})`; octx.lineWidth = 2.5;
      octx.beginPath(); octx.arc(s[0], s[1], r, 0, PI * 2); octx.moveTo(s[0] - r * 1.3, s[1]); octx.lineTo(s[0] + r * 1.3, s[1]); octx.moveTo(s[0], s[1] - r * 1.3); octx.lineTo(s[0], s[1] + r * 1.3); octx.stroke();
      octx.font = '700 12px "Exo 2", sans-serif'; octx.fillStyle = '#ff8a6a';
      octx.fillText(M.fired ? tr('⌖ АРТУДАР', '⌖ ARTILLERY', '⌖ PHÁO KÍCH', '⌖ ארטילריה') : `⌖ ${tr('МЕТКА СТРАТЕГА', "STRATEGIST'S MARK", 'ĐIỂM ĐÁNH DẤU', 'סימון')} · ${left.toFixed(0)} ${tr('с', 's', 'giây', 'ש׳')}`, s[0], s[1] - r - 8);
    }
    // приказ «помоги со стройкой»
    if (this.order && !this.build && typeof edgeMarker === 'function'){ const b = this.order.b; edgeMarker(add(b.pos, mul(b.up, 3)), '#9cf', tr('СТРОЙКА', 'BUILD SITE', 'CÔNG TRƯỜNG', 'אתר בנייה') + ' ' + Math.floor(b.built * 100) + '%', `${Math.round(dist(b.pos, c.pos))} ${tr('м', 'm', 'm', 'מ׳')}`); }
    // тайники рядом (только в кадре, до 70 м)
    octx.font = '600 12px "Exo 2", sans-serif';
    for (const p of PROPS){
      if (!p.alive || !p.cache75) continue;
      const d = dist(p.pos, c.pos); if (d > 70) continue;
      const s = project(add(p.pos, mul(p.up, 4))); if (!s || s[0] < 0 || s[0] > W || s[1] < 0 || s[1] > H) continue;
      octx.fillStyle = 'rgba(255,210,122,.9)'; octx.fillText('📦 ' + tr('тайник', 'cache', 'kho', 'מטמון') + ' · ' + Math.round(d) + tr(' м', ' m', ' m', ' מ׳'), s[0], s[1]);
    }
    // стройка идёт
    if (this.build){ const b = this.build.b; octx.font = '700 14px "Exo 2", sans-serif'; octx.fillStyle = '#8fffaa'; octx.fillText(`⚒ ${tr('Строишь', 'Building', 'Đang xây', 'בונה')}: ${bname(b.type)} ${Math.floor(b.built * 100)}% · ${TOUCH.on ? tr('кнопка — стоп', 'button — stop', 'nút — dừng', 'כפתור — עצור') : bk('interact') + ' ' + tr('— стоп', '— stop', '— dừng', '— עצור')}`, W / 2, H / 2 + 70); }
    if (this.proneK > 0.5){ octx.font = '700 12px "Exo 2", sans-serif'; octx.fillStyle = 'rgba(240,232,208,.8)'; octx.fillText(tr('ЛЁЖА · ползком · Ctrl — встать', 'PRONE · crawling · Ctrl — stand up', 'NẰM · bò · Ctrl — đứng dậy', 'שכיבה · זחילה · Ctrl — לקום'), W / 2, H - 92); }
    octx.restore();
  },
};
// ---------------------------------------------------------------------
//  встраивание
// ---------------------------------------------------------------------
if (FIELD75.on){
  // E: стройка / тайник (если рядом нет машины, турели и т. п. — у них приоритет)
  { const ni0 = nearbyInteract;
    nearbyInteract = function(me){
      const h = ni0.apply(this, arguments);
      if (h || !me || me.cls !== 'inf' || S.attract) return h;
      const F = FIELD75;
      if (F.build) return { field75: 'stop', text: `${bk('interact')} — ${tr('перестать строить', 'stop building', 'dừng xây', 'להפסיק לבנות')}` };
      const b = F.siteNear(me); if (b) return { field75: 'build', b, text: `${bk('interact')} — ${tr('строить', 'build', 'xây', 'לבנות')}: ${bname(b.type)} ${Math.floor(b.built * 100)}%` };
      const p = F.cacheNear(me); if (p) return { field75: 'cache', p, text: `${bk('interact')} — ${tr('тайник: взять оружие', 'cache: take the weapons', 'kho: lấy vũ khí', 'מטמון: לקחת נשק')}` };
      return h;
    }; }
  { const in0 = interact;
    interact = function(){
      const me = S.me;
      if (me && me.cls === 'inf' && !S.attract && S.mode === 'fps' && !FIELD75.seated()){
        const h = nearbyInteract(me);
        if (h && h.field75 === 'stop'){ FIELD75.build = null; return; }
        if (h && h.field75 === 'build'){ FIELD75.build = { b: h.b, u: me, t: 0 }; feed(tr(`Строишь: ${bname(h.b.type)} — стой рядом`, `Building: ${bname(h.b.type)} — stay close`, `Đang xây: ${bname(h.b.type)}`, `בונה: ${bname(h.b.type)}`), '#8fffaa'); return; }
        if (h && h.field75 === 'cache'){ FIELD75.takeCache(h.p); return; }
      }
      return in0.apply(this, arguments);
    }; }
  // артудар стратега-человека: свои РСЗО рядом стреляют по той же точке
  { const ss0 = startStrike;
    startStrike = function(team, k, pt, by, src){
      const r = ss0.apply(this, arguments);
      if (team === 0 && (k === 'arty' || k === 'party') && by !== 'mark75' && pt) FIELD75.safe(() => FIELD75.salvo(pt), 'salvoH');
      return r;
    }; }
  // ползком: глаза ниже, скорость и разброс меньше
  { const pe0 = parkourEye; parkourEye = function(dt){ return pe0(dt) - 0.52 * FIELD75.proneK; }; }
  { const ge0 = gunEye; gunEye = function(u){ const p = ge0(u); return u === S.me && FIELD75.proneK > 0.01 ? sub(p, mul(u.up, 0.52 * FIELD75.proneK)) : p; }; }
  { const pi0 = playerInput;
    playerInput = function(p){
      const r = pi0.apply(this, arguments);
      if (r && FIELD75.proneK > 0.05){
        r.speedMul = (r.speedMul || 1) * (1 - 0.68 * FIELD75.proneK);
        if (r.jump || r.thrust){ FIELD75.prone = false; }   // прыжок или ранец — встать
        if (FIELD75.proneK > 0.5){ r.jump = false; r.thrust = false; }
      }
      return r;
    }; }
  { const gs0 = gunSpread; gunSpread = function(u, W, K){ const s = gs0.apply(this, arguments); return u === S.me && FIELD75.proneK > 0.5 ? s * 0.55 : s; }; }
  addEventListener('keydown', e => {
    if (e.repeat || MENU.isOpen() || S.attract || S.mode !== 'fps') return;
    if (e.code !== ((SET.bind && SET.bind.prone) || 'ControlLeft')) return;
    const c = FIELD75.me(); if (!c) return;
    FIELD75.prone = !FIELD75.prone;
  });
  // кадр
  { const up0 = update;
    update = function(rdt){
      up0(rdt);
      if (S.attract || S.paused) return;
      const dt = rdt;
      FIELD75.safe(() => FIELD75.buildStep(dt), 'build');
      FIELD75.safe(() => FIELD75.orderStep(dt), 'order');
      FIELD75.safe(() => FIELD75.markStep(dt), 'mark');
      FIELD75.safe(() => FIELD75.cacheStep(), 'cache');
      FIELD75.safe(() => FIELD75.proneStep(dt), 'prone');
    }; }
  { const do0 = drawOverlay;
    drawOverlay = function(dt){
      const r = do0.apply(this, arguments);
      if (!S.attract && S.mode === 'fps' && !OPER.on && !(typeof M74 !== 'undefined' && M74.nohud)) FIELD75.safe(() => FIELD75.overlay(), 'ov');
      return r;
    }; }
  { const nm0 = newMatch; newMatch = function(opts){ const r = nm0.apply(this, arguments); FIELD75.build = null; FIELD75.order = null; FIELD75.orderT = 70; FIELD75.marks = []; FIELD75.markT = 45; FIELD75.prone = false; FIELD75.proneK = 0; FIELD75.safe(() => FIELD75.cacheReset(), 'reset'); return r; }; }
  FIELD75.safe(() => FIELD75.cacheReset(), 'reset0');
  // клавиша «Лечь / встать» в меню управления (переназначается)
  if (typeof BIND_DEF !== 'undefined' && !BIND_DEF.prone){
    BIND_DEF.prone = 'ControlLeft';
    BIND_NAMES.prone = ['Лечь / встать (ползком)', 'Prone / stand up (crawl)', 'Nằm / đứng (bò)'];
    if (typeof SET_DEF !== 'undefined' && SET_DEF.bind) SET_DEF.bind.prone = 'ControlLeft';
    if (SET.bind && !SET.bind.prone) SET.bind.prone = 'ControlLeft';
  }
}
const V75F_NEWS = [
  ['Стройка солдатами: E (на телефоне «Войти») у своей стройки — боец строит сам, напарники рядом помогают. Если инженеры заняты, стратег сам попросит помочь — метка «СТРОЙКА».',
   'Troopers can build: E (phone: "Enter") at a friendly construction site — your trooper builds it, squadmates nearby help. If the engineers are busy, the strategist asks you for help — a "BUILD SITE" marker.',
   'Lính xây dựng: E cạnh công trường — lính tự xây, đồng đội giúp. Chiến lược gia sẽ nhờ bạn khi kỹ sư bận.',
   'חיילים בונים: E ליד אתר בנייה — החייל בונה, חברים עוזרים. האסטרטג יבקש עזרה כשהמהנדסים עסוקים.'],
  ['Метки стратега: стратег ставит ⌖ на скопление врагов рядом с тобой — через 8 с туда бьёт артиллерия, а свои РСЗО «Град» поблизости дают залп. Твой артудар из стратегии — тоже с поддержкой «Градов».',
   'Strategist marks: the strategist puts ⌖ on an enemy cluster near you — artillery hits it 8 s later and nearby friendly "Grad" MLRS fire a salvo. Your own artillery strike from strategy mode gets "Grad" support too.',
   'Đánh dấu của chiến lược gia: ⌖ trên cụm địch — pháo kích sau 8 giây, MLRS gần đó cùng bắn.',
   'סימוני אסטרטג: ⌖ על ריכוז אויבים — ארטילריה אחרי 8 שניות ומטח MLRS.'],
  ['Тайники с оружием в грузовых контейнерах и упавших спутниках (📦 видно с 70 м): E — пулемёт на 90 с, зажигательные или ракеты, плюс полные гранаты. Ползком: Ctrl — лечь / встать (ниже, тише, точнее, но медленно).',
   'Weapon caches in cargo containers and crashed satellites (📦 visible within 70 m): E — a heavy MG for 90 s, incendiary rounds or rockets, plus full grenades. Crawling: Ctrl — go prone / stand up (lower, steadier aim, but slow).',
   'Kho vũ khí trong container và vệ tinh rơi (📦): E — súng máy, đạn cháy hoặc tên lửa. Bò: Ctrl — nằm / đứng.',
   'מטמוני נשק במכולות ובלוויינים (📦): E — מקלע, תחמושת מבעירה או רקטות. זחילה: Ctrl — לשכב / לקום.'],
];
