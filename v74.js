// =====================================================================
//  v7.4 — общие правки (ПК и телефон)
//   • вселение: две галки «Техника» / «Отряды»; старый «свой порядок» спрятан в «Расширенные»;
//     техника выключена → вместо вселения можно СЕСТЬ ЗА ДОП. ПУШКУ (E рядом с машиной);
//   • при вселении боец / машина отвечает по рации, как при клике в стратегии;
//   • умные подсказки: счётчик запусков, уровни (базовые / продвинутые / редкие), голос — отдельно;
//   • рефлекс заряжается от убийств (комбо — больше); к игроку десантируется пополнение отряда;
//   • версия, дата сборки (BUILD_DATE пишет build.py), «Новое в v7.4».
// =====================================================================
for (const [k, v] of Object.entries({ possVeh: null, possInf: true, hintB: true, hintBset: false, hintA: true, hintR: true, drop74: true }))
  if (SET[k] === undefined) SET[k] = v;
// на телефоне техника по умолчанию автономная (в неё не вселяемся), на ПК — как раньше
if (SET.possVeh === null || SET.possVeh === undefined) SET.possVeh = !(typeof TOUCH !== 'undefined' && TOUCH.on);
const V74 = {
  err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('v74 ' + tag, e); } } },
  // ------------------------------------------------------------ вселение: что можно
  isVeh(u){ return !!u && (u.cls === 'tank' || u.cls === 'drone'); },
  allowed(u){
    if (!u) return true;
    if (u.cls === 'inf') return SET.possInf !== false || SET.possVeh === false;
    if (this.isVeh(u)) return SET.possVeh !== false;
    return true;   // турели и прочее — всегда
  },
  tutOn(){ return (typeof T72 !== 'undefined' && T72.on) || (typeof TUT !== 'undefined' && TUT.on); },
  // лучший разрешённый боец ближе к бою (null — разрешённых нет)
  alt(skip){
    let best = null, bd = 1e9;
    const L = [];
    if (SET.possInf !== false || SET.possVeh === false) for (const u of S.units) if (u.alive && u.team === 0 && !u.parked && u !== skip) L.push(u);
    if (SET.possVeh !== false){ for (const v of S.vehicles) if (v.alive && v.team === 0 && v !== skip) L.push(v); for (const d of S.drones) if (d.alive && d.team === 0 && d !== skip) L.push(d); }
    for (const u of L){ const d = actionDist(u, 0) - (u.cls === 'tank' ? 15 : 0); if (d < bd){ bd = d; best = u; } }
    return best;
  },
  setPoss(k){
    SET[k] = !SET[k];
    if (SET.possVeh === false && SET.possInf === false) SET[k === 'possVeh' ? 'possInf' : 'possVeh'] = true;   // хотя бы одна галка
    MENU.save();
    feed(tr('Вселение: ', 'Possession: ', 'Nhập vai: ', 'השתלטות: ') + [SET.possInf ? tr('отряды', 'squads', 'đội', 'חוליות') : '', SET.possVeh ? tr('техника', 'vehicles', 'xe', 'רכבים') : ''].filter(Boolean).join(' + ') +
         (SET.possVeh ? '' : tr(' · технику водит ИИ, E рядом с машиной — сесть за пушку', ' · AI drives vehicles, E next to one — man its gun', ' · AI lái xe, E cạnh xe — ngồi súng', ' · הבינה נוהגת, E ליד רכב — לאייש תותח')), '#9cf');
    const c = ctrlEntity();
    if (c && !this.allowed(c) && S.mode === 'fps' && !S.attract){ const u = this.alt(c); if (u) takeControl(u); }
  },
  togBtn(k, lab, phone){
    const on = !!SET[k];
    if (phone) return `<button class="p71o ${on ? 'on' : ''}" data-p74tog="${k}"><span>${lab}</span><b>${L71(on ? 'on' : 'off')}</b></button>`;
    return `<div class="row"><label>${lab}</label><button class="tog ${on ? 'on' : ''}" data-p74tog="${k}">${on ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי')}</button></div>`;
  },
  possRows(phone){
    return this.togBtn('possInf', tr('Вселяться в отряды (пехота)', 'Possess squads (infantry)', 'Nhập vào đội (bộ binh)', 'השתלטות על חוליות'), phone) +
           this.togBtn('possVeh', tr('Вселяться в технику и дронов', 'Possess vehicles and drones', 'Nhập vào xe và drone', 'השתלטות על רכבים ורחפנים'), phone);
  },
  // ------------------------------------------------------------ доп. пушка на технике (вместо вселения)
  seat: null,
  mount(v){
    const me = S.me; if (!me || me.cls !== 'inf') return;
    this.seat = { v, me, w0: S.kit ? S.kit.w : 'rifle' };
    // боец, который сидел за пушкой, освобождается (у машины одна доп. пушка)
    if (v.gunner74 && v.gunner74 !== me && v.gunner74.alive){ v.gunner74.parked = false; }
    v.gunner74 = me;
    if (S.kit && typeof weaponAvail === 'function' && WEAPONS.hmg){ S.kit.w = 'hmg'; S.kit.mag.hmg = WEAPONS.hmg.mag; S.kit.reloadT = 0; }
    feed(tr(`За пушкой: ${groupLabel(v)}. Машину ведёт ИИ, ты стреляешь. ${TOUCH.on ? '⇥' : bk('interact')} — слезть`, `On the gun: ${groupLabel(v)}. The AI drives, you shoot. ${TOUCH.on ? '⇥' : bk('interact')} — get off`, `Ngồi súng: ${groupLabel(v)}. AI lái, bạn bắn. E — xuống`, `על התותח: ${groupLabel(v)}. הבינה נוהגת, אתה יורה. E — לרדת`), TEAM[0].css);
    emit('board', { pos: v.pos }); HINTS.used('tank');
    if (typeof VOICE66 !== 'undefined') VOICE66.say(v, 'sel', true);
  },
  unmount(why){
    const s = this.seat; if (!s) return;
    this.seat = null;
    if (s.v) s.v.gunner74 = null;
    const me = s.me;
    if (me && me.alive){
      const side = norm(cross(s.v.fwd || anyTangent(norm(s.v.pos)), norm(s.v.pos)));
      me.pos = surfacePoint(norm(add(s.v.pos, mul(side, 4))), 0.2); me.vel = [0, 0, 0];
      if (S.kit){ S.kit.w = weaponAvail(s.w0) ? s.w0 : 'rifle'; S.kit.reloadT = 0; }
    }
    if (why) feed(why, '#ffd27a');
  },
  seatStep(){
    const s = this.seat; if (!s) return;
    const me = s.me, v = s.v;
    if (S.me !== me || !me.alive){ this.seat = null; if (v) v.gunner74 = null; return; }
    if (!v.alive){ this.unmount(tr('Машина подбита — ты спрыгнул', 'The vehicle is destroyed — you jumped off', 'Xe bị hạ — bạn đã nhảy xuống', 'הרכב הושמד — קפצת')); return; }
    const up = norm(v.pos), H = (typeof VK !== 'undefined' && v.vk && VK[v.vk] && VK[v.vk].H) || 2.6;
    me.pos = add(v.pos, mul(up, H + 0.4)); me.vel = v.vel ? v.vel.slice() : [0, 0, 0]; me.grounded = true; me.up = up;
    if (S.kit && S.kit.w === 'hmg' && S.kit.mag.hmg < WEAPONS.hmg.mag * 0.3) S.kit.mag.hmg = WEAPONS.hmg.mag;   // пушка машины питается от её боекомплекта
  },
};
// ---- центральная проверка: в запрещённое тело не вселяемся (если есть разрешённое)
{ const tc0 = takeControl;
  takeControl = function(u){
    if (u && !S.attract && !V74.tutOn() && !V74.allowed(u)){ const a = V74.alt(u); if (a) u = a; }
    if (V74.seat && u !== V74.seat.me) V74.unmount();
    const prev = S.me;
    const r = tc0.call(this, u);
    // фраза юнита при вселении — как при клике в стратегии
    if (u && u !== prev && !S.attract && SET.unitVoice !== false && typeof VOICE66 !== 'undefined') V74.safe(() => { if (!(prev && !prev.alive && random() < 0.4)) VOICE66.say(u.cls === 'inf' ? u : u, 'sel', true); }, 'voice');
    return r;
  }; }
{ const sc0 = switchCandidates; switchCandidates = function(){ const L = sc0.apply(this, arguments); return V74.tutOn() ? L : L.filter(o => V74.allowed(o.e)); }; }
{ const ni0 = nearbyInteract;
  nearbyInteract = function(me){
    if (V74.seat) return { unseat: true, text: tr(`${bk('interact')} — слезть с пушки`, `${bk('interact')} — get off the gun`, `${bk('interact')} — xuống súng`, `${bk('interact')} — לרדת מהתותח`) };
    const h = ni0.apply(this, arguments);
    if (h && h.v && !V74.allowed(h.v) && !V74.tutOn()) return { seat: h.v, text: tr(`${bk('interact')} — сесть за пушку: ${groupLabel(h.v)}`, `${bk('interact')} — man the gun: ${groupLabel(h.v)}`, `${bk('interact')} — ngồi súng: ${groupLabel(h.v)}`, `${bk('interact')} — לאייש תותח: ${groupLabel(h.v)}`) };
    return h;
  }; }
{ const in0 = interact;
  interact = function(){
    if (V74.seat){ V74.unmount(); return; }
    const me = S.me, h = me && me.cls === 'inf' ? nearbyInteract(me) : null;
    if (h && h.seat){ V74.mount(h.seat); return; }
    return in0.apply(this, arguments);
  }; }
// ---- кадр
{ const up0 = update;
  update = function(rdt){
    up0(rdt);
    V74.safe(() => V74.seatStep(), 'seat');
    V74.safe(() => DROP74.step(rdt), 'drop');
    V74.safe(() => REFL74.step(rdt), 'refl');
  }; }
// =====================================================================
//  РЕФЛЕКС ОТ УБИЙСТВ (идея 13): каждое убийство игрока подзаряжает рефлекс, серия (комбо) — сильнее
// =====================================================================
const REFL74 = {
  combo: 0, lastT: -99,
  onKill(e){
    const K = S.kit; if (!K) return;
    const now = S.rtime;
    this.combo = now - this.lastT < 4 ? this.combo + 1 : 1; this.lastT = now;
    const base = e.cls === 'inf' || e.cls === 'builder' ? 0.07 : e.cls === 'drone' ? 0.1 : 0.18;
    const add = base * (1 + 0.35 * (this.combo - 1));
    if (!K.reflexOn) K.reflex = min(1, (K.reflex || 0) + add);
    else K.reflex = min(1, (K.reflex || 0) + add * 0.5);   // во время рефлекса — продлевает
    if (this.combo >= 2) feed(tr(`Комбо ×${this.combo} · рефлекс +${Math.round(add * 100)}%`, `Combo ×${this.combo} · reflex +${Math.round(add * 100)}%`, `Combo ×${this.combo} · phản xạ +${Math.round(add * 100)}%`, `קומבו ×${this.combo} · רפלקס +${Math.round(add * 100)}%`), '#ffd27a');
  },
  step(){ if (S.rtime - this.lastT > 4) this.combo = 0; },
};
{ const ok0 = PROG.onKill.bind(PROG);
  PROG.onKill = function(e, src){ ok0(e, src); if (!S.attract && src && src.team === 0 && typeof isPlayerSrc === 'function' && isPlayerSrc(src)) V74.safe(() => REFL74.onKill(e), 'reflk'); }; }
// =====================================================================
//  ДЕСАНТ К ИГРОКУ (идея 3): напарники отстали или погибли — к игроку периодически
//  десантируются новые (дороже обычного пополнения, но стратег идёт на это ради игрока)
// =====================================================================
const DROP74 = {
  t: 20, cd: 0, n: 0,
  COST: 30,   // за бойца (обычное пополнение — 18)
  step(rdt){
    if (SET.drop74 === false || S.attract || S.over || V74.tutOn() || S.mode !== 'fps') return;
    this.cd -= rdt; this.t -= rdt; if (this.t > 0) return; this.t = 2;
    const me = S.me; if (!me || me.cls !== 'inf' || !me.alive || !me.squad || V74.seat) return;
    const sq = me.squad; if (sq.solo || sq.lone || sq.order === 'sky') return;
    const mates = sq.units.filter(u => u.alive && u !== me);
    const near = mates.filter(u => dist(u.pos, me.pos) < 45).length;
    if (near >= 2 || this.cd > 0) return;
    if (enemiesNear && enemiesNear(0, me.pos, 14).length) return;   // не прямо в перестрелку
    const T = S.teams[0], want = 2 - near;   // далёких напарников (>45 м) не ждём
    if (T.ore < this.COST * want) return;
    let got = 0;
    for (let i = 0; i < want; i++){
      if (sq.units.filter(u => u.alive).length >= 6) break;
      const back = mul(me.fwd, -6 - i * 2), side = mul(norm(cross(me.fwd, me.up)), (i ? 3 : -3));
      const u = addToSquad(sq, add(add(me.pos, back), side));
      u.pos = add(u.pos, mul(u.up, 14)); u.vel = mul(u.up, -9); u.grounded = false;
      burst(u.pos, 12, 5); addLight(u.pos, [1, 2.2, 3], 14, 0.5, 0.004);
      got++;
    }
    if (!got) return;
    T.ore -= this.COST * got; this.n += got;
    this.cd = 55;
    emit('reinf', { pos: me.pos, sq });
    feed(tr(`Стратег: десант к тебе — +${got} бойц. (−${this.COST * got} руды)`, `Strategist: troopers dropping to you — +${got} (−${this.COST * got} ore)`, `Chiến lược gia: thả quân tới bạn — +${got} (−${this.COST * got} quặng)`, `אסטרטג: צונחים אליך — +${got} (−${this.COST * got} עפרה)`), TEAM[0].css);
    emit('radio', { text: tr('Держись, высылаю к тебе десант', 'Hold on, sending troopers your way', 'Cố lên, đang gửi quân tới', 'תחזיק, שולח אליך צנחנים'), pri: 1 });
  },
};
// =====================================================================
//  УМНЫЕ ПОДСКАЗКИ: счётчик запусков, уровни, «подскажу то, чем ты не пользуешься»
// =====================================================================
const HINT74 = {
  st: { runs: 0, used: {} },
  BASIC: ['move', 'jet', 'task', 'select', 'camera', 'order', 'possess', 'build', 'produce', 'switch', 'reload', 'rts', 'fight', 'squad', 'rocket', 'grenade', 'controls', 'cmd', 'side'],
  RARE: ['why', 'lowhp', 'redeploy', 'rally', 'beacon', 'eco', 'power', 'strike', 'rail', 'hmg', 'slide', 'third', 'vehView', 'airbrake', 'bunker', 'bunkerArmor', 'hbunker', 'silo', 'dome', 'mast', 'dish', 'bigDish', 'tower', 'plate', 'radar', 'comms', 'gen', 'bay'],
  load(){ try { const o = JSON.parse(localStorage.getItem('pm_hint74') || 'null'); if (o && typeof o === 'object') this.st = { runs: o.runs | 0, used: o.used || {} }; } catch (e){} },
  save(){ try { localStorage.setItem('pm_hint74', JSON.stringify(this.st)); } catch (e){} },
  lvl(id){ if (/^deny_/.test(id) || this.RARE.includes(id)) return 'R'; return this.BASIC.includes(id) ? 'B' : 'A'; },
  basicOn(){ return SET.hintBset ? SET.hintB !== false : this.st.runs <= 2; },
  // можно ли показать подсказку id (act — действие, которым она «гасится»)
  ok(id, act){
    const L = this.lvl(id);
    if (L === 'R' && SET.hintR === false) return false;
    if (L === 'A' && SET.hintA === false) return false;
    if (L === 'B' && !this.basicOn()){
      // базовые выключены — но если игрок из раза в раз не пользуется функцией, подскажем один раз за матч
      const a = act || id;
      if (this.st.runs < 3 || (this.st.used[a] | 0) > 0 || this.once[a]) return false;
      this.once[a] = 1;
    }
    return true;
  },
  once: {},
  used(a){ if (!a || S.attract) return; if (!this.st.used[a]){ this.st.used[a] = 1; this.save(); } },
  newRun(){ this.st.runs++; this.once = {}; this.save(); },
};
HINT74.load();
{ const sh0 = HINTS.show.bind(HINTS);
  HINTS.show = function(id, text, kbd, act, force){ if (!force && !HINT74.ok(id, act)) return false; return sh0(id, text, kbd, act, force); }; }
{ const us0 = HINTS.used.bind(HINTS); HINTS.used = function(a){ us0(a); HINT74.used(a); }; }
// голос подсказок отдельной галкой: SET.hintsVoice гасит и озвучку подсказок, и голос куратора
if (typeof VOICE66 !== 'undefined'){ const pl0 = VOICE66.play.bind(VOICE66); VOICE66.play = function(type){ if (type === 'curator' && SET.hintsVoice === false) return; return pl0.apply(this, arguments); }; }
{ const ng0 = MENU.newGame;
  MENU.newGame = function(tutorial){ const r = ng0.apply(this, arguments); if (tutorial !== true && !S.attract) V74.safe(() => { HINT74.newRun(); DROP74.cd = 0; DROP74.t = 20; REFL74.combo = 0; V74.seat = null; }, 'ng'); return r; }; }
// =====================================================================
//  НАСТРОЙКИ: галки вселения и подсказок (ПК — настройки и пауза; телефон — экраны ☰)
// =====================================================================
V74.hintRows = function(phone){
  const b = HINT74.basicOn();
  const lab = (ru, en, vi, he) => tr(ru, en, vi, he);
  const row = (k, on, l) => phone ? `<button class="p71o ${on ? 'on' : ''}" data-p74tog="${k}"><span>${l}</span><b>${L71(on ? 'on' : 'off')}</b></button>`
    : `<div class="row"><label>${l}</label><button class="tog ${on ? 'on' : ''}" data-p74tog="${k}">${on ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי')}</button></div>`;
  return row('hintB', b, lab(`· базовые${SET.hintBset ? '' : ' (сами гаснут после 2-го запуска)'}`, `· basic${SET.hintBset ? '' : ' (turn off after the 2nd launch)'}`, `· cơ bản${SET.hintBset ? '' : ' (tự tắt sau lần 2)'}`, `· בסיסיים${SET.hintBset ? '' : ' (נכבים אחרי ההפעלה השנייה)'}`)) +
         row('hintA', SET.hintA !== false, lab('· продвинутые', '· advanced', '· nâng cao', '· מתקדמים')) +
         row('hintR', SET.hintR !== false, lab('· редкие', '· rare', '· hiếm', '· נדירים'));
};
V74.tog = function(k){
  if (k === 'possVeh' || k === 'possInf') return this.setPoss(k);
  if (k === 'hintB'){ SET.hintB = !HINT74.basicOn(); SET.hintBset = true; }
  else SET[k] = !(SET[k] !== false);
  MENU.save();
};
V74.refreshBtns = function(){
  document.querySelectorAll('[data-p74tog]').forEach(b => {
    const k = b.dataset.p74tog, on = k === 'hintB' ? HINT74.basicOn() : SET[k] !== false;
    b.classList.toggle('on', on);
    if (b.classList.contains('p71o')){ const t = b.querySelector('b'); if (t) t.textContent = L71(on ? 'on' : 'off'); }
    else b.textContent = on ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי');
  });
};
{ // клик мышью и касание по галкам v7.4 (любой экран: настройки, пауза, меню телефона)
  let at = -1e9, t0 = null;
  const find = e => e.target && e.target.closest ? e.target.closest('[data-p74tog]') : null;
  const go = b => { AU.init(); V74.tog(b.dataset.p74tog); V74.refreshBtns(); emit('ui', { kind: 'ok' }); };
  document.addEventListener('click', e => { const b = find(e); if (!b) return; e.stopPropagation(); e.preventDefault(); if (performance.now() - at < 700) return; go(b); }, true);
  document.addEventListener('mousedown', e => { if (find(e)) e.stopPropagation(); }, true);
  document.addEventListener('touchstart', e => { const b = find(e); if (!b){ t0 = null; return; } const p = e.changedTouches[0]; t0 = { b, x: p.clientX, y: p.clientY }; e.stopPropagation(); }, { capture: true, passive: true });
  document.addEventListener('touchend', e => { const b = find(e); if (!b || !t0 || t0.b !== b) return; const p = e.changedTouches[0]; e.stopPropagation(); if (e.cancelable) e.preventDefault(); if (Math.hypot(p.clientX - t0.x, p.clientY - t0.y) > 14) return; at = performance.now(); t0 = null; go(b); }, { capture: true, passive: false });
}
// ПК: строка «Вселение» (настройки и пауза) — две галки + «Расширенные» (старый «свой порядок» с номерами классов)
FPS61.prefRow = function(){
  return `<div class="row p74poss"><label>${tr('Вселение', 'Possession', 'Nhập vai', 'השתלטות')}</label></div>` + V74.possRows(false) +
    `<div class="row p74adv"><label><small>${tr('Расширенные: порядок классов', 'Advanced: class order', 'Nâng cao: thứ tự lớp', 'מתקדם: סדר סוגים')}${typeof PRIO70 !== 'undefined' && PRIO70.on ? ' · ' + tr('ВКЛ', 'ON', 'BẬT', 'פועל') : ''}</small></label><button class="tog" data-p70="open">⚙ ▸</button></div>`;
};
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    let h = hs0.apply(this, arguments);
    h = h.replace(/(Озвучивать подсказки|Voice the hints|Đọc gợi ý thành tiếng)/, tr('Голос подсказок и куратора', 'Voice of hints and curator', 'Giọng gợi ý và người hướng dẫn'));
    h = h.replace(/(<button class="tog[^"]*" data-tog="hintsOn">[^<]*<\/button><\/div>)/, '$1' + V74.hintRows(false));
    return h;
  }; }
// телефон: экран «Вселение» — две галки сверху, порядок классов ниже (расширенное)
if (typeof P71M !== 'undefined'){
  const p70 = P71M.p70;
  P71M.p70 = function(){
    const h = p70.apply(this, arguments);
    const top = `<div class="p71g c2 rows p74poss">${V74.possRows(true)}</div><h6 class="p74h6">${uixEsc(tr('Расширенные: свой порядок классов', 'Advanced: custom class order', 'Nâng cao: thứ tự lớp', 'מתקדם: סדר סוגים'))}</h6>`;
    return h.replace(/(<div class="p70w)/, top + '$1');
  };
  const sec0 = P71M.sec;
  P71M.sec = function(k){
    let h = sec0.apply(this, arguments);
    if (k === 's_snd'){
      h = h.replace(/(Озвучивать подсказки|Voice the hints|Đọc gợi ý|הקראת רמזים)/, tr('Голос подсказок и куратора', 'Voice of hints & curator', 'Giọng gợi ý', 'קול רמזים ומדריך'));
      h = h.replace(/(<button class="p71o[^"]*" data-tog="hintsOn">[\s\S]*?<\/button>)/, '$1' + V74.hintRows(true));
    }
    return h;
  };
}
if (typeof M67 !== 'undefined' && M67.fillSheet){
  const fs0 = M67.fillSheet;
  M67.fillSheet = function(){
    const r = fs0.apply(this, arguments);
    V74.safe(() => { const sec = this.sheet.querySelector('.p70sec'); if (sec && !sec.querySelector('.p74poss')) sec.insertAdjacentHTML('afterbegin', `<div class="p74poss">${V74.possRows(true)}</div>`); }, 'sheet');
    return r;
  };
}
(function(){ const st = document.createElement('style'); st.textContent = `
  #screen .row.p74poss{margin-top:6px;border-bottom:1px solid rgba(232,220,184,.18)} #screen .row.p74adv{opacity:.8}
  #screen .row.p74adv button{min-width:52px} .p74h6{margin:10px 0 4px;font:600 12px "Exo 2",sans-serif;opacity:.7;text-transform:uppercase;letter-spacing:.06em}
  #touch #m67sheet .p74poss button{position:static;height:auto;min-height:40px;width:100%;margin:2px 0}
`; document.head.appendChild(st); })();
// =====================================================================
//  ВЕРСИЯ И «НОВОЕ В v7.4»
// =====================================================================
const V74_NEWS = [
  ['Телефон: три режима стиков. Только левый — «авто» (сильный магнит, но пули слабее). Только правый — сам включается прицел, магнит сильнее, стрельба точнее. Оба сразу — без прицела, магнит и точность меньше. Кнопка 👁 справа — скрыть/вернуть интерфейс.',
   'Phone: three stick modes. Left only — "auto" (strong magnet, weaker bullets). Right only — aiming turns on by itself, stronger magnet, better accuracy. Both — no aiming, weaker magnet and accuracy. The 👁 button on the right hides/returns the HUD.',
   'Điện thoại: ba chế độ cần. Chỉ trái — “tự động”. Chỉ phải — tự ngắm, hút mạnh hơn, chính xác hơn. Cả hai — không ngắm. Nút 👁 — ẩn/hiện giao diện.',
   'טלפון: שלושה מצבי ג׳ויסטיק. רק שמאל — אוטו. רק ימין — כוונת נפתחת לבד, מגנט חזק ודיוק גבוה. שניהם — בלי כוונת. כפתור 👁 — הסתרת הממשק.'],
  ['Телефон: стратегия упрощена — только инженер и здания. Слева карточки (инженер, штаб, казарма…): тап — камера к нему, внизу сразу что строить/производить. «В бой» — слева сверху. Армия воюет сама. Полная стратегия — Настройки → Телефон.',
   'Phone: strategy simplified — engineer and buildings only. Cards on the left (engineer, HQ, barracks…): tap — the camera flies there, the bottom bar shows what to build/produce. "To battle" — top left. The army fights by itself. Full strategy — Settings → Phone.',
   'Điện thoại: chiến thuật đơn giản — chỉ kỹ sư và công trình. Thẻ bên trái, chạm — camera tới, thanh dưới để xây/sản xuất. “Vào trận” — góc trái trên.',
   'טלפון: אסטרטגיה פשוטה — רק מהנדס ומבנים. כרטיסים משמאל, הקשה — המצלמה עפה, למטה מה לבנות/לייצר. „לקרב" — שמאל למעלה.'],
  ['Вселение — две галки: «Отряды» и «Техника» (на телефоне техника по умолчанию выключена — её водит ИИ). Если техника выключена, E (на телефоне — кнопка справа) рядом со своей машиной — сесть за её пушку: машина едет сама, ты стреляешь. Старый «свой порядок классов» — в «Расширенных». При вселении юнит отвечает по рации.',
   'Possession — two switches: "Squads" and "Vehicles" (vehicles are off by default on phones — the AI drives them). With vehicles off, E (phone: the button on the right) next to a friendly vehicle — man its gun: it drives itself, you shoot. The old custom class order is under "Advanced". A unit answers on the radio when you possess it.',
   'Nhập vai — hai công tắc: “Đội” và “Xe”. Tắt xe: E cạnh xe phe ta — ngồi súng, xe tự lái, bạn bắn. Thứ tự lớp cũ — trong “Nâng cao”. Đơn vị trả lời qua bộ đàm.',
   'השתלטות — שני מתגים: „חוליות" ו„רכבים". רכבים כבויים: E ליד רכב — לאייש את התותח שלו. הסדר הישן — ב„מתקדם". היחידה עונה בקשר.'],
  ['Умные подсказки: базовые сами гаснут после 2-го запуска, но игра подскажет функцию, которой ты так и не пользуешься. Галки: базовые / продвинутые / редкие, отдельно — голос подсказок и куратора.',
   'Smart hints: basic hints switch off after the 2nd launch, but the game still points out a feature you never use. Switches: basic / advanced / rare, and a separate one for the voice of hints and curator.',
   'Gợi ý thông minh: gợi ý cơ bản tự tắt sau lần 2, nhưng vẫn nhắc chức năng bạn chưa dùng. Công tắc: cơ bản / nâng cao / hiếm, giọng — riêng.',
   'רמזים חכמים: הבסיסיים נכבים אחרי ההפעלה השנייה, אבל המשחק עדיין יציע יכולת שלא השתמשת בה. מתגים: בסיסיים / מתקדמים / נדירים, וקול בנפרד.'],
  ['Рефлекс заряжается от убийств (серия — сильнее). Напарники отстали или погибли — стратег десантирует к тебе новых (дороже обычного пополнения). Графика и звук v7.2gfx влиты: взрывы клубами, дым, обломки, акустика шахт и кратеров. Дата сборки — настоящая.',
   'Reflex charges from kills (streaks charge more). Squadmates fell behind or died — the strategist drops new ones to you (pricier than normal reinforcement). The v7.2gfx graphics and sound are merged in: billowing explosions, smoke, debris, shaft and crater acoustics. The build date is real now.',
   'Phản xạ nạp từ hạ địch (combo nạp nhiều hơn). Đồng đội tụt lại — chiến lược gia thả quân mới tới bạn. Đồ họa và âm thanh v7.2gfx đã gộp.',
   'רפלקס נטען מהריגות (רצף — יותר). חברים נפלו או פיגרו — האסטרטג מצניח אליך חדשים. הגרפיקה והסאונד v7.2gfx מוזגו.'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v7\.3 · /, 'v7.4 · ');
    const m = h.match(/<h3>[^<]*v7\.3[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.4', 'New in v7.4', 'Mới trong v7.4', 'חדש ב-v7.4')}</h3><ul>${V74_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v7.4'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){ return pm0.apply(this, arguments).replace(/v7\.3 · /, `v7.4 · ${typeof BUILD_DATE !== 'undefined' ? BUILD_DATE.slice(0, 10) + ' · ' : ''}`).replace(/(Новое в |New in |Mới |חדש ב-)v7\.3/, '$1v7.4'); };
    const pn0 = P71M.news;
    P71M.news = function(){
      const all = V74_NEWS.concat(typeof V73_NEWS !== 'undefined' ? V73_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.4', 'NEW IN v7.4', 'MỚI TRONG v7.4', 'חדש ב-v7.4'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}
