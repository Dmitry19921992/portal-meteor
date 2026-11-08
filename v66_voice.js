// =====================================================================
//  v6.6 — ГОЛОСА ЮНИТОВ ПО РАЦИИ И ЗАМЕТНЫЙ КУРАТОР
//  Голоса: Piper TTS (локально, голоса ru_RU denis/dmitri — CC0, irina — лицензия не указана),
//  радиофильтр ffmpeg, mp3 24 кбит/с, base64 в <script id="vo66"> (build.py).
//  Клик по юниту — короткий ответ (3–4 фразы на тип), приказ — подтверждение.
//  Типы: инженер, штурмовик (отряд), пулемётчик, разведчик, снайпер, дрон, техника; куратор.
//  EN/VI пока звучат по-русски (как рация с «чужого» фронта); тексты — в i18n не нужны.
// =====================================================================
if (SET.unitVoice === undefined) SET.unitVoice = true;
const VOICE66 = {
  data: null, buf: {}, pend: {}, last: 0, lastI: {}, cur: null, lastSelSig: '', played: 0, errors: 0,
  load(){
    if (this.data) return this.data;
    try { const el = document.getElementById('vo66'); this.data = el ? JSON.parse(el.textContent) : {}; } catch (e){ this.data = {}; console.warn('VOICE66: нет данных голосов', e); }
    return this.data;
  },
  typeOf(g){
    if (!g) return null;
    if (typeof g === 'string') return g;
    if (g.cls === 'builder') return 'builder';
    if (g.cls === 'drone') return 'drone';
    if (g.cls === 'tank') return 'tank';
    if (g.cls === 'inf') g = g.squad;
    if (isSquad(g)){ if (g.solo === 'sniper') return 'sniper'; if (g.solo === 'scout') return 'scout'; if (g.solo === 'heavy') return 'heavy'; return 'squad'; }
    return null;
  },
  has(type, kind){ const D = this.load(); return !!(D[type] && D[type][kind] && D[type][kind].length); },
  decode(type, kind, i){
    const key = type + kind + i;
    if (this.buf[key]) return Promise.resolve(this.buf[key]);
    if (this.pend[key]) return this.pend[key];
    const b64 = this.load()[type][kind][i].b;
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
    const p = new Promise((res, rej) => AU.ctx.decodeAudioData(u8.buffer, res, rej)).then(b => { this.buf[key] = b; delete this.pend[key]; return b; });
    this.pend[key] = p;
    return p;
  },
  // kind: 'sel' — выбрали, 'ord' — приказ
  say(g, kind, force){
    if (S.attract || SET.unitVoice === false) return false;
    AU.init();
    if (!AU.ready()) return false;
    const type = this.typeOf(g); if (!type || !this.has(type, kind)) return false;
    const now = performance.now();
    if (!force && now - this.last < (kind === 'sel' ? 260 : 420)) return false;
    this.last = now;
    const L = this.load()[type][kind];
    let i = floor(random() * L.length); if (L.length > 1 && i === this.lastI[type + kind]) i = (i + 1) % L.length;
    this.lastI[type + kind] = i;
    this.play(type, kind, i);
    return true;
  },
  play(type, kind, i, vol){
    this.decode(type, kind, i).then(buf => {
      try { if (this.cur){ this.cur.stop(); this.cur = null; } } catch (e){}
      const C = AU.ctx, t = C.currentTime;
      if (type !== 'curator') AU.squelch();
      const src = C.createBufferSource(); src.buffer = buf;
      const g = C.createGain(); g.gain.value = vol || (type === 'curator' ? 1.0 : 0.95);
      src.connect(g); g.connect(AU.master);
      src.start(t + (type === 'curator' ? 0.02 : 0.07));
      src.onended = () => { if (this.cur === src){ this.cur = null; if (type !== 'curator') AU.squelch(); } };
      this.cur = src; this.played++; this.lastText = this.load()[type][kind][i].t; this.lastType = type;
    }).catch(e => { this.errors++; if (this.errors < 3) console.warn('VOICE66', e && e.message); });
  },
  // выделение изменилось — ответ первого выделенного (раз в смену выделения)
  frame(){
    if (S.mode !== 'rts' || S.attract || MENU.isOpen()) { this.lastSelSig = ''; return; }
    const sel = selGroups();
    const sig = sel.length ? sel.map(uixId).join(',') : '';
    if (sig === this.lastSelSig) return;
    const prev = this.lastSelSig; this.lastSelSig = sig;
    if (!sel.length || !prev && this.skipFirst){ this.skipFirst = false; return; }
    this.say(sel[0], 'sel');
  },
};
// v6.6 баг: события, созданные кликом/клавишей между кадрами (ответ на приказ 'ack', звуки
// интерфейса 'ui'), стирались в начале update() и не доходили до звука. Переносим их в кадр.
{ const up0 = update;
  update = function(rdt){
    const fresh = S.events.length > (S.evMark66 || 0) ? S.events.slice(S.evMark66 || 0) : null;
    up0(rdt);
    if (fresh) S.events.unshift(...fresh);
    S.evMark66 = S.events.length;
  }; }
// подтверждение приказа: вместо синтезатора речи — голос этого типа
{ const ack0 = AU.ack.bind(AU);
  AU.ack = function(g, order){
    if (g && order !== 'possess' && VOICE66.say(g, 'ord')) return;
    return ack0(g, order);
  }; }
// входя в стратегию, не «отвечает» тот, кого выделила сама игра
{ const er0 = enterRTS; enterRTS = function(){ const r = er0.apply(this, arguments); VOICE66.lastSelSig = selGroups().map(uixId).join(','); return r; }; }
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); try { VOICE66.frame(); } catch (e){ if (!VOICE66.err){ VOICE66.err = 1; console.warn('voice66', e); } } }; }
// Настройки: «Голоса юнитов»
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    const h = hs0.call(this), on = SET.unitVoice !== false;
    const row = `<div class="row"><label>${tr('Голоса юнитов по рации (ответ на клик и приказ)', 'Unit radio voices (reply on click and order)', 'Giọng đơn vị qua bộ đàm')}</label><button class="tog ${on ? 'on' : ''}" data-tog="unitVoice">${on ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</button></div>`;
    const i = h.indexOf('data-tog="curator"'); if (i < 0) return h;
    const j = h.indexOf('</div>', i) + 6;
    return h.slice(0, j) + row + h.slice(j);
  }; }

// =====================================================================
//  КУРАТОР v6.6: виден и слышен
//  • После обновления на v6.6 куратор снова включён и рассказывает заново (цепочка новая).
//  • При каждом входе в стратегию — «Куратор на связи» + главное, что сделать сейчас.
//  • Новый совет — звуковой сигнал и голос куратора (запись, работает и на телефоне),
//    окно вспыхивает; полный текст — ещё и синтезатором речи, если он есть.
// =====================================================================
try {
  if (!localStorage.getItem('pm_v66cur')){
    SET.curator = true; MENU.save();
    localStorage.removeItem('pm_curator'); CUR.once = {};
    localStorage.setItem('pm_v66cur', '1');
  }
} catch (e){}
const CUR66 = { lastVoice: -99, lastOk: -99 };
function cur66Goal(c){
  const my = t => S.buildings.filter(b => b.alive && b.team === 0 && b.type === t);
  if (!c.bs.length) return TOUCH.on ? tr('закажи инженера в штабе (тапни по штабу)', 'train a builder at the HQ (tap the HQ)', 'huấn luyện kỹ sư ở sở chỉ huy') : tr('закажи инженера в штабе (кликни по штабу)', 'train a builder at the HQ (click the HQ)', 'huấn luyện kỹ sư ở sở chỉ huy');
  if (typeof g66Gatherers === 'function' && !g66Gatherers(0).length) return TOUCH.on ? tr('отправь инженера на зелёные кристаллы ◆ — долгий тап по ним', 'send a builder to the green ◆ crystals — long-tap them', 'gửi kỹ sư tới tinh thể ◆') : tr('отправь инженера на зелёные кристаллы ◆ — ПКМ по ним', 'send a builder to the green ◆ crystals — RMB them', 'gửi kỹ sư tới tinh thể ◆');
  if (!my('barracks').length) return tr('построй Казарму ⚔ инженером — без неё нет пехоты', 'build Barracks ⚔ with a builder — no infantry without it', 'xây Doanh trại ⚔');
  if (!c.ext.length) return tr('поставь Экстрактор ⛏ на жилу — он добывает сам', 'put an Extractor ⛏ on a vein — it mines by itself', 'đặt Máy khai thác ⛏');
  if (c.squads.length < 3) return tr('закажи отряды в Казарме', 'order squads at the Barracks', 'gọi đội ở Doanh trại');
  if (!c.factory.length) return tr('построй Мехзавод ⚙ — танки и техника', 'build a Mech factory ⚙ — tanks and vehicles', 'xây Nhà máy ⚙');
  if (c.myPts < 3) return tr('захвати точки — они дают доход', 'capture points — they pay income', 'chiếm điểm');
  if (TOUCH.on) return tr('держи точки и дави Рой; «⟳ Автономно» — пусть воюют сами', 'hold points and push the Swarm; "⟳ Autonomous" lets units fight on their own', 'giữ điểm và tấn công');
  return tr('держи точки и дави Рой; «⟳ Автономно» (O) — пусть воюют сами', 'hold points and push the Swarm; "⟳ Autonomous" (O) lets units fight on their own', 'giữ điểm và tấn công');
}
{
  const curBar = c => S.buildings.find(b => b.alive && b.team === 0 && b.type === 'barracks' && b.done) || null;
  const noBar = () => !S.buildings.some(b => b.alive && b.team === 0 && b.type === 'barracks');
  const fieldW = c => { const f = typeof g66NearestField === 'function' ? g66NearestField(0, BASES[0]) : null; return f ? { pos: add(f.pos, mul(f.dir, 2)), label: tr('КРИСТАЛЛЫ ◆', 'CRYSTALS ◆', 'TINH THỂ ◆'), col: '#8fffaa' } : null; };
  const gathN = () => typeof g66Gatherers === 'function' ? g66Gatherers(0).length : 0;
  const farDrop = () => { const g = typeof g66Gatherers === 'function' ? g66Gatherers(0)[0] : null; const f = g && fields66()[g.field]; const d = f && g66Drop(0, f.pos); return f && d && surfDist(builderTarget(d), f.pos) - builderTargetR(d) > 28 ? f : null; };
  const manualIdle = () => groupsOf(0).find(g => g.auto66 === false && (g.order === 'hold' || g.order === 'idle'));
  const NEW = [
    { id: 'rts_hello', pri: 990, cool: 40, min: 4.5, when: (c, k) => (k && k.s && k.s.id === 'rts_hello') || S.rtime - (CUR.enterT || 0) < 2.5 && (S.rtime - (CUR66.helloT || -99) > 40),
      init: () => { CUR66.helloT = S.rtime; },
      text: c => tr('Куратор на связи. Сейчас главное: ', 'Curator here. Right now: ', 'Hướng dẫn: ') + cur66Goal(c) + '.',
      done: (c, k) => S.rtime - k.t0 > 6 },
    { id: 'chain', pri: 960, once: true, min: 7, when: () => true,
      text: () => tr('Как в StarCraft: штаб и форпост делают только инженеров. Инженер строит Казарму ⚔ (пехота) → Мехзавод ⚙ (техника) и Дрон-хаб → Аэродок ✈ (ранцы, с 6:00 боя).', 'Like in StarCraft: the HQ and outposts make only builders. A builder builds Barracks ⚔ (infantry) → Mech factory ⚙ (vehicles) and Drone hub → Airdock ✈ (jetpacks, from 6:00).', 'Như StarCraft: sở chỉ huy chỉ làm kỹ sư.'),
      done: (c, k) => S.rtime - k.t0 > 8 },
    curSelB('gath_sel', 650, c => gathN() === 0 && !!fieldW(c), () => tr('Руда бывает двух видов. Сначала кристаллы: инженер носит груз в штаб.', 'Ore comes two ways. First crystals: a builder carries loads to the HQ.', 'Quặng có hai loại.')),
    { id: 'gath_go', pri: 651, when: c => gathN() === 0 && c.sb.length > 0 && !!fieldW(c),
      text: () => TOUCH.on ? tr('Долгий тап по зелёным кристаллам ◆ (или «◆ Добывать» в карточке) — инженер будет носить руду в штаб.', 'Long-tap the green ◆ crystals (or "◆ Gather" in the card) — the builder will carry ore to the HQ.', 'Chạm giữ tinh thể ◆')
        : tr('ПКМ по зелёным кристаллам ◆ (или «◆ Добывать», G) — инженер будет носить руду в штаб, по 6 за рейс.', 'RMB the green ◆ crystals (or "◆ Gather", G) — the builder carries ore to the HQ, 6 per trip.', 'Chuột phải tinh thể ◆'),
      ui: ['#card [data-gather]'], world: fieldW, done: () => CUR.since('gather') || gathN() > 0 },
    curSelB('bar_sel', 560, c => noBar() && c.ore >= 110, () => tr('Пехоту делают в Казарме — штаб выпускает только инженеров.', 'Infantry comes from the Barracks — the HQ makes only builders.', 'Bộ binh từ Doanh trại.')),
    ...curPlace('bar', 'barracks', 560, c => noBar() && c.ore >= 110,
      () => tr('Нажми «Казарма» (M) и поставь её на базе — ровное место внутри пунктира.', 'Press "Barracks" (M) and place it at the base — a flat spot inside the dashed ring.', 'Nhấn “Doanh trại” (M).'), c => ({ pos: c.base, label: CUR_W.here() })),
    curOpen('bar_open', 500, c => c.squads.length < 3 && c.ore >= 100 && !c.queued('squad'), curBar,
      () => tr('Казарма готова. Выбери её — закажем отряд.', 'The Barracks is ready. Select it to order a squad.', 'Doanh trại xong.'), 60),
    curOrder('bar_order', 'squad', 501, c => c.squads.length < 3 && c.ore >= 100 && !c.queued('squad'), curBar,
      () => tr('Закажи «Штурмовой отряд» (или пулемётчика, снайпера, разведчика). Новые юниты ждут твоих приказов.', 'Order an "Assault squad" (or a heavy gunner, sniper, scout). New units wait for your orders.', 'Gọi “Đội xung kích”.'), 60),
    { id: 'auto', pri: 240, once: true, min: 6, when: c => !!manualIdle() && CUR.rtsT > 25,
      text: () => tr('Твои новые юниты слушаются только тебя. Хочешь, чтобы воевали сами — выдели и «⟳ АВТОНОМНО» (O). Над такими значок ⟳. Ушёл в бой — все становятся автономными.', 'Your new units obey only you. To let them fight on their own — select and press "⟳ AUTONOMOUS" (O). They get a ⟳ icon. When you go into battle, everyone turns autonomous.', 'Đơn vị mới chỉ nghe bạn.'),
      ui: ['#card [data-auto66]'], world: () => { const g = manualIdle(); const L = g && leaderPos(g); return L ? { pos: L, label: groupLabel(g).toUpperCase() } : null; },
      done: (c, k) => CUR.since('auto66') || S.rtime - k.t0 > 14 },
    curSelB('dep_sel', 260, c => gathN() >= 2 && !!farDrop() && !S.buildings.some(b => b.alive && b.team === 0 && b.type === 'depot') && c.ore >= 100, () => tr('Инженеры далеко носят кристаллы. Склад руды рядом с полем — быстрее.', 'Builders carry crystals a long way. An Ore depot next to the field is faster.', 'Kho quặng gần bãi sẽ nhanh hơn.'), 120),
    ...curPlace('dep', 'depot', 260, c => gathN() >= 2 && !!farDrop() && !S.buildings.some(b => b.alive && b.team === 0 && b.type === 'depot'),
      () => tr('«Склад руды» (J) — поставь рядом с кристаллическим полем ◆.', '"Ore depot" (J) — place it next to the crystal field ◆.', '“Kho quặng” (J).'), () => { const f = farDrop(); return f ? { pos: f.pos, label: tr('КРИСТАЛЛЫ ◆', 'CRYSTALS ◆', 'TINH THỂ ◆'), col: '#8fffaa' } : null; }, 120),
    curSelB('air_sel', 150, c => S.time > BTYPES.airdock.unlock && c.factory.some(b => b.done) && !S.buildings.some(b => b.alive && b.team === 0 && b.type === 'airdock') && c.ore >= 350, () => tr('Аэродок открыт: ранцы II и небесный десант.', 'The Airdock is unlocked: Jetpacks II and sky troopers.', 'Bến bay đã mở.'), 180),
    ...curPlace('air', 'airdock', 150, c => S.time > BTYPES.airdock.unlock && !S.buildings.some(b => b.alive && b.team === 0 && b.type === 'airdock') && c.ore >= 350,
      () => tr('«Аэродок» (K) — на базе. Не забудь ПВО (X): Рой тоже полетит.', '"Airdock" (K) — at the base. Remember anti-air (X): the Swarm will fly too.', '“Bến bay” (K).'), c => ({ pos: c.base, label: CUR_W.here() }), 180),
  ];
  // старые «отряд в штабе» убираем; мехзавод — после Казармы
  CUR.steps = CUR.steps.filter(s => s.id !== 'sq_open' && s.id !== 'sq_order');
  for (const s of CUR.steps) if (/^fac_/.test(s.id)){ const w0 = s.when; s.when = c => !noBar() && S.buildings.some(b => b.alive && b.team === 0 && b.type === 'barracks' && b.done) && w0(c); }
  const ext = CUR.steps.find(s => s.id === 'ext_sel'); if (ext){ const w0 = ext.when; ext.when = c => gathN() > 0 && w0(c); ext.pri = 540; }
  for (const s of CUR.steps) if (s.id === 'ext_btn' || s.id === 'ext_put'){ s.pri = s.id === 'ext_btn' ? 540 : 541; const w0 = s.when; s.when = c => gathN() > 0 && w0(c); }
  const eco = CUR.steps.find(s => s.id === 'eco'); if (eco){ eco.text = () => tr('Руда — два вида добычи: кристаллы ◆ носят инженеры, экстрактор ⛏ на жиле копает сам. Нажми «РУДА» вверху — покажу разбивку.', 'Ore comes two ways: builders carry ◆ crystals, an ⛏ extractor on a vein mines by itself. Tap "ORE" at the top for the breakdown.', 'Quặng hai loại.'); eco.when = c => c.ore < 80 && CUR.rtsT > 45; }
  CUR.steps.push(...NEW);
  CUR.steps.sort((a, b) => b.pri - a.pri);
}
// вход в стратегию: «Куратор на связи» сразу, даже если висел другой совет (он вернётся позже)
{ const fr0 = CUR.frame.bind(CUR);
  CUR.frame = function(dt){
    const entering = !this.wasRts && this.enabled() && !S.attract && !S.over && !MENU.isOpen() && S.mode === 'rts';
    fr0(dt);
    if (!entering) return;
    const hello = this.steps.find(s => s.id === 'rts_hello'), intro = this.steps.find(s => s.id === 'intro');
    if (intro && this.eligible(intro)) return;   // самый первый раз — знакомство
    if (hello && this.eligible(hello) && (!this.cur || this.cur.s.pri < hello.pri)){ try { this.start(hello, curCtx()); this.cur.c = curCtx(); } catch (e){} }
  }; }
// звук и голос на каждый новый совет, вспышка окна
{ const st0 = CUR.start.bind(CUR);
  CUR.start = function(s, c){
    st0(s, c);
    if (!AU.ready()) return;
    const now = S.rtime;
    AU.ping();
    if (now - CUR66.lastVoice > 14 || s.id === 'threat' || s.id === 'rts_hello'){
      // v6.8: в пакетах EN/VI/HE есть 5-я фраза куратора — «начни с казармы» (на подсказки про Казарму)
      const i = s.id === 'threat' ? 3 : (s.id === 'rts_hello' || s.id === 'intro') ? 0 : (/^bar_(sel|btn|put|place)$/.test(s.id) && ((VOICE66.load().curator || {}).sel || []).length > 4) ? 4 : 1;
      if (VOICE66.has('curator', 'sel')){ CUR66.lastVoice = now; VOICE66.play('curator', 'sel', i, 1.0); }
    }
    const el = $('cur'); const box = el && el.querySelector('.cbox');
    if (box){ box.classList.remove('flash66'); void box.offsetWidth; box.classList.add('flash66'); }
  };
  const cp0 = CUR.complete.bind(CUR);
  CUR.complete = function(c){ const id = this.cur && this.cur.s.id; cp0(c); if (AU.ready()){ AU.chime(true); if (S.rtime - CUR66.lastOk > 45 && id !== 'rts_hello' && id !== 'intro' && VOICE66.has('curator', 'sel')){ CUR66.lastOk = S.rtime; setTimeout(() => VOICE66.play('curator', 'sel', 2, 0.9), 350); } } };
}
// подсказки шутера (строка про ПКМ/прицел/присесть) в стратегии не показываем
(function cur66CSS(){
  const st = document.createElement('style');
  st.textContent = `#cur .cbox{max-width:540px} #cur .ctx p{font-size:14.5px;line-height:1.35} #cur .cic{font-size:26px}
  #cur .cbox.flash66{animation:curIn .25s ease-out, cur66Flash 1.6s ease-out}
  @keyframes cur66Flash{0%{box-shadow:0 0 0 3px #7fd4ff,0 0 30px rgba(127,212,255,.95)}100%{box-shadow:0 4px 18px rgba(0,0,0,.5)}}
  body.mode-rts #help .fpsline{display:none}
  body.touch #cur .ctx p{font-size:12px}`;
  document.head.appendChild(st);
})();
