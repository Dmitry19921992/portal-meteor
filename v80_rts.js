// =====================================================================
//  v8.0 — УДОБНАЯ СТРАТЕГИЯ (G80): мышь и палец
//   • правая панель: сворачиваемые группы «Инженеры / Отряды / Техника / Здания»; в заголовке значки статуса
//     (⚠ под атакой, 🔨 строит, ○N свободных, счётчик; у инженеров «5/7»); тап — раскрыть/свернуть, долгое нажатие — выбрать всех;
//     внутри у каждого полоска HP и прогресс работы (стройка, производство, захват);
//     ПК — над панелью «Здания/Войска/…» (#side опускается ниже); телефон — у правого края под ☰, компактно;
//     на ПК заменяет левый список v6.1 (#r61cards) — не дублируем;
//   • лимит инженеров 7 (GAME.MAX_BUILDERS) — кнопка заказа серая с подсказкой «7/7»;
//   • быстрые кнопки: «Штаб» (1-е нажатие — штаб, дальше — здания под атакой, захваченные точки, остальные здания),
//     «Свободные» (перебор простаивающих), «Тревога» (камера к месту последней атаки);
//   • значки над зданиями, где можно заказать бойцов/технику (солдат, танк, дрон, десант) — всплывают раз в ~8 с; тап по значку — заказ;
//   • обучение стратегии: новый шаг «Отряд — в бой» после «Производства».
//  Хуки — только обёртки: applyScale, canProduce, uixFrame, drawOverlay, STEPS72/DEF72/CTL72. Выключить: ?g80=0.
// =====================================================================
const G80 = {
  on: (() => { try { return new URLSearchParams(location.search).get('g80') !== '0'; } catch (e){ return true; } })(),
  MAXB: 7, el: null, open: { eng: false, sq: false, veh: false, bld: false }, sig: '', t: 0, err: {},
  cyc: { hq: { i: -1, t: -99 }, idle: { i: -1, t: -99 } }, alarm: null, badges: [], badgeT: 0, stats: { hq: 0, idle: 0, alarm: 0, long: 0, badgeOrders: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('g80 ' + tag, e); } } },
  touch(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  m74(){ return typeof M74 !== 'undefined' && M74.simple && M74.simple(); },
  show(){ return this.on && S.mode === 'rts' && !S.attract && !MENU.isOpen() && !S.over && !(typeof OPER !== 'undefined' && OPER.on) && !(typeof T72 !== 'undefined' && T72.on); },   // в обучении экран и так занят карточкой
  hurt(e, s){ return e && S.time - (e.lastHurt === undefined ? -99 : e.lastHurt) < (s || 4); },
  // ---------------------------------------------------------------- данные групп
  bName(b){ return b.cls === 'hq' ? tr('Штаб', 'HQ', 'Sở chỉ huy', 'מפקדה') : bname(b.type); },
  blds(){ const L = []; if (S.hq[0] && S.hq[0].alive) L.push(S.hq[0]); const o = ['outpost', 'barracks', 'factory', 'hub', 'airdock', 'extractor', 'turret', 'aa'];
    return L.concat(S.buildings.filter(b => b.alive && b.team === 0).sort((a, b) => ((o.indexOf(a.type) + 99) % 99 - (o.indexOf(b.type) + 99) % 99) || a.id - b.id)); },
  idleG(g){
    if (g.cls === 'builder') return builderIdle(g);
    if (typeof r61State === 'function'){ const s = r61State(g); return s[0] === 'idle' && g.order !== 'hold' && g.order !== 'escort'; }
    return !g.combat && !groupGoal(g);
  },
  groups(){
    const sq = S.squads.filter(s => s.team === 0 && groupAlive(s)).sort((a, b) => a.id - b.id);
    const veh = S.vehicles.filter(v => v.team === 0 && v.alive).concat(S.drones.filter(d => d.team === 0 && d.alive));
    const eng = teamBuilders(0), bld = this.blds();
    return [
      { k: 'eng', n: tr('Инженеры', 'Builders', 'Kỹ sư', 'מהנדסים'), ic: '⚒', L: eng },
      { k: 'sq', n: tr('Отряды', 'Squads', 'Đội', 'חוליות'), ic: '◆', L: sq },
      { k: 'veh', n: tr('Техника', 'Vehicles', 'Xe', 'רכבים'), ic: '■', L: veh },
      { k: 'bld', n: tr('Здания', 'Buildings', 'Công trình', 'מבנים'), ic: '⌂', L: bld },
    ];
  },
  // состояние одного элемента: [текст, hp 0–1, прогресс 0–1 | -1, класс]
  item(k, e){
    if (k === 'bld'){
      const hp = max(0, e.hp) / e.maxhp;
      if (e.cls === 'bld' && !e.done) return [tr('стройка', 'building', 'đang xây', 'בבנייה') + ' ' + Math.floor(e.built * 100) + '%', hp, e.built, 'work'];
      if (e.queue && e.queue.length){ const q = e.queue[0], p = clamp(e.prodT / pTime(0, q), 0, 1); return [`${PRODUCTS[q].icon} ${pname(q)}${e.queue.length > 1 ? ' +' + (e.queue.length - 1) : ''}`, hp, p, 'work']; }
      return [this.hurt(e) ? tr('под атакой', 'under attack', 'bị tấn công', 'תחת מתקפה') : '—', hp, -1, this.hurt(e) ? 'fight' : ''];
    }
    if (k === 'eng'){
      const busy = builderBusy(e), st = typeof r61State === 'function' ? r61State(e) : ['idle', ''];
      return [st[1], max(0, e.hp) / e.maxhp, busy && e.site ? clamp(e.site.built !== undefined ? e.site.built : (e.site.hp / e.site.maxhp), 0, 1) : -1, this.hurt(e) ? 'fight' : st[0]];
    }
    const st = typeof r61State === 'function' ? r61State(e) : ['idle', ''];
    let pr = -1;
    const L = leaderOf(e); if (L && S.cps) for (const c of S.cps){ if (!c.core && c.owner !== 0 && c.prog && surfDist(L.pos, c.pos) < 22){ pr = clamp(abs(c.prog), 0, 1); break; } }
    const fight = st[0] === 'fight' || groupUnits(e).some(u => this.hurt(u, 3));
    return [st[1] + ' · ' + Math.round(groupHP(e) * 100) + '%', groupHP(e), pr, fight ? 'fight' : st[0]];
  },
  head(G){
    const L = G.L; let atk = false, work = 0, idle = 0;
    for (const e of L){
      if (G.k === 'bld'){ if (this.hurt(e)) atk = true; if ((e.cls === 'bld' && !e.done) || (e.queue && e.queue.length)) work++; }
      else if (G.k === 'eng'){ if (this.hurt(e)) atk = true; if (builderBusy(e)) work++; else if (builderIdle(e)) idle++; }
      else { if (groupUnits(e).some(u => this.hurt(u, 3))) atk = true; if (this.idleG(e)) idle++; }
    }
    const cnt = G.k === 'eng' ? `${L.length}/${GAME.MAX_BUILDERS}` : String(L.length);
    return { atk, work, idle, cnt };
  },
  // ---------------------------------------------------------------- DOM
  ensure(){
    if (this.el) return this.el;
    const el = this.el = document.createElement('div'); el.id = 'g80';
    document.body.appendChild(el);
    const stop = e => e.stopPropagation();
    for (const ev of ['mousedown', 'touchstart', 'wheel', 'contextmenu', 'dblclick']) el.addEventListener(ev, e => { stop(e); if (ev === 'contextmenu') e.preventDefault(); }, { passive: ev !== 'contextmenu' });
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', () => { clearTimeout(this.lpT); this.pd = null; });
    el.addEventListener('click', e => { e.stopPropagation(); });
    return el;
  },
  down(e){
    e.stopPropagation();
    const t = e.target.closest('[data-g80]'); if (!t) return;
    try { AU.init(); } catch (_){}
    this.pd = { t, x: e.clientX, y: e.clientY, at: performance.now(), long: false };
    clearTimeout(this.lpT);
    if (t.dataset.g80.startsWith('h:')) this.lpT = setTimeout(() => { if (this.pd && this.pd.t === t){ this.pd.long = true; this.selectAll(t.dataset.g80.slice(2)); } }, 520);
  },
  up(e){
    e.stopPropagation(); clearTimeout(this.lpT);
    const P = this.pd; this.pd = null; if (!P || P.long) return;
    if (Math.hypot(e.clientX - P.x, e.clientY - P.y) > 14) return;
    this.act(P.t.dataset.g80, e);
  },
  act(a, e){
    const [k, v] = a.split(':');
    if (k === 'h'){ this.open[v] = !this.open[v]; this.save(); this.sig = ''; this.render(true); emit('ui', { kind: 'ok' }); return; }
    if (k === 'q'){ if (v === 'hq') this.goHQ(); else if (v === 'idle') this.goIdle(); else if (v === 'alarm') this.goAlarm(); else if (v === 'lab') this.labels(); return; }
    if (k === 'i'){ const [gk, id] = v.split('.'); const G = this.groups().find(g => g.k === gk); const it = G && G.L.find(x => this.uid(x) === id); if (it) this.pick(gk, it, e && e.shiftKey); }
  },
  uid(x){ return (x.cls === 'hq' ? 'hq' : x.cls || 'g') + (x.id !== undefined ? x.id : x.serial); },
  pick(k, x, add){
    const now = performance.now(), dbl = this.lastPick === x && now - this.lastPickT < 420;
    this.lastPick = x; this.lastPickT = now;
    if ((k === 'eng' || k === 'bld') && this.m74()){ M74.pick(x); this.sig = ''; return; }   // телефон, простая стратегия: нижняя панель «что строить / производить»
    if (k === 'bld'){ this.selBld(x, true); }
    else {
      if (!add){ S.sel.clear(); S.selB = null; }
      if (add && S.sel.has(x)) S.sel.delete(x); else S.sel.add(x);
      const p = isSquad(x) ? leaderPos(x) : x.pos;
      if (p && (dbl || this.touch() || !onScreen(p))) flyCamTo(p);
      try { HINTS.used('select'); } catch (_){}
    }
    emit('ui', { kind: 'ok' });
    this.sig = '';
  },
  selBld(b, fly){
    if (typeof v64OpenBld === 'function' && v64IsProd(b) && (b.cls === 'hq' || b.done)){ v64OpenBld(b, false); }
    else { S.sel.clear(); S.selB = b; }
    if (fly) flyCamTo(b.cls === 'hq' ? b.pos : b.pos);
  },
  selectAll(k){
    const G = this.groups().find(g => g.k === k); if (!G || !G.L.length) return;
    this.stats.long++;
    if (k === 'bld'){ this.goHQ(true); return; }
    S.sel.clear(); S.selB = null; for (const x of G.L) S.sel.add(x);
    feed(tr(`Выбраны все: ${G.n} (${G.L.length})`, `Selected all: ${G.n} (${G.L.length})`, `Đã chọn tất cả: ${G.n} (${G.L.length})`, `נבחרו כולם: ${G.n} (${G.L.length})`), '#8fffaa');
    try { emit('ui', { kind: 'ok' }); if (navigator.vibrate) navigator.vibrate(12); } catch (_){}
    this.sig = '';
  },
  labels(){ if (typeof R61 === 'undefined') return; const L = ['sel', 'all', 'off']; R61.pref.labels = L[(L.indexOf(R61.pref.labels) + 1) % 3]; r61Save();
    feed(tr('Подписи: ', 'Labels: ', 'Nhãn: ', 'תוויות: ') + { all: tr('все', 'all', 'tất cả', 'הכל'), sel: tr('выделенные', 'selected', 'đã chọn', 'נבחרים'), off: tr('выкл (Alt — показать)', 'off (Alt — show)', 'tắt', 'כבוי') }[R61.pref.labels]); this.sig = ''; },
  // ---------------------------------------------------------------- быстрые кнопки
  goHQ(first){
    const now = S.rtime || 0, C = this.cyc.hq;
    const hq = S.hq[0] && S.hq[0].alive ? [S.hq[0]] : [];
    const blds = S.buildings.filter(b => b.alive && b.team === 0);
    const atk = blds.filter(b => this.hurt(b, 10)).sort((a, b) => b.lastHurt - a.lastHurt);
    const cps = (S.cps || []).filter(c => !c.core && c.owner === 0);
    const rest = this.blds().filter(b => b.cls !== 'hq' && !atk.includes(b));
    const L = [...hq.map(b => ({ b })), ...atk.map(b => ({ b, atk: 1 })), ...cps.map(c => ({ cp: c })), ...rest.map(b => ({ b }))];
    if (!L.length) return;
    C.i = first || now - C.t > 5 ? 0 : (C.i + 1) % L.length; C.t = now;
    const x = L[C.i]; this.stats.hq++;
    if (x.b){ this.selBld(x.b, true); feed(`⌂ ${this.bName(x.b)}${x.atk ? ' · ⚠ ' + tr('под атакой', 'under attack', 'bị tấn công', 'תחת מתקפה') : ''} (${C.i + 1}/${L.length})`, x.atk ? '#ff9a8a' : '#d8cfb4'); }
    else { flyCamTo(x.cp.pos); feed(`⚑ ${tr('Точка', 'Point', 'Điểm', 'נקודה')} ${x.cp.name} (${C.i + 1}/${L.length})`, '#ffd27a'); }
    emit('ui', { kind: 'ok' }); this.sig = '';
  },
  goIdle(){
    const now = S.rtime || 0, C = this.cyc.idle;
    const L = [...teamBuilders(0).filter(builderIdle), ...groupsOf(0).filter(g => groupAlive(g) && this.idleG(g))];
    if (!L.length){ feed(tr('Свободных нет — все при деле', 'Nobody idle — everyone is busy', 'Không ai rảnh', 'אין פנויים'), '#9cf'); emit('ui', { kind: 'deny' }); return; }
    C.i = now - C.t > 6 ? 0 : (C.i + 1) % L.length; C.t = now;
    const g = L[C.i]; this.stats.idle++;
    S.sel.clear(); S.selB = null; S.sel.add(g);
    const p = isSquad(g) ? leaderPos(g) : g.pos; if (p) flyCamTo(p);
    feed(`○ ${groupLabel(g)} (${C.i + 1}/${L.length})`, '#cfe8ff');
    emit('ui', { kind: 'ok' }); this.sig = '';
  },
  goAlarm(){
    const a = this.alarm, al = S.alerts && S.alerts.length ? S.alerts[S.alerts.length - 1] : null;
    const p = a && (!al || a.rt >= al.t) ? a.pos : al ? al.pos : null;
    if (!p){ feed(tr('Атак пока не было', 'No attacks yet', 'Chưa có tấn công', 'עדיין לא היו התקפות'), '#9cf'); emit('ui', { kind: 'deny' }); return; }
    this.stats.alarm++;
    flyCamTo(p); emit('ui', { kind: 'ok' });
    if (a && a.what) feed('⚠ ' + a.what + ' · ' + fmtDur(max(0, (S.rtime || 0) - a.rt)) + ' ' + tr('назад', 'ago', 'trước', 'לפני'), '#ff9a8a');
  },
  // запоминаем, где последний раз били по нашим (здания, инженеры, отряды, техника)
  watch(){
    let best = null;
    for (const b of [S.hq[0], ...S.buildings]) if (b && b.alive && b.team === 0 && this.hurt(b, 1.2) && (!best || b.lastHurt > best.t)) best = { t: b.lastHurt, pos: b.cls === 'hq' ? b.pos : b.pos, what: this.bName(b) };
    for (const u of S.builders) if (u.alive && u.team === 0 && this.hurt(u, 1.2) && (!best || u.lastHurt > best.t)) best = { t: u.lastHurt, pos: u.pos, what: groupLabel(u) };
    for (const g of groupsOf(0)){ for (const u of groupUnits(g)) if (u.alive && this.hurt(u, 1.2) && u.lastAttacker && u.lastAttacker.team === 1 && (!best || u.lastHurt > best.t)) best = { t: u.lastHurt, pos: u.pos, what: groupLabel(g) }; }
    if (best && (!this.alarm || best.t > this.alarm.t)) this.alarm = { t: best.t, rt: S.rtime || 0, pos: best.pos.slice(), what: best.what };
  },
  // ---------------------------------------------------------------- отрисовка панели (4 раза в секунду)
  save(){ try { localStorage.setItem('pm_g80', JSON.stringify(this.open)); } catch (e){} },
  render(force){
    const el = this.ensure(), show = this.show();
    document.body.classList.toggle('g80on', show);
    document.body.classList.toggle('g80m74', show && this.touch() && this.m74());
    if (!show){ if (el.style.display !== 'none') el.style.display = 'none'; return; }
    el.style.display = 'block';
    const G = this.groups(), H = G.map(g => this.head(g));
    const qb = (id, ic, n, tip, extra, cnt) => `<button class="qb ${extra || ''}" data-g80="q:${id}" title="${uixEsc(tip)}"><i>${ic}</i><span>${n}</span>${cnt ? `<em>${cnt}</em>` : ''}</button>`;
    const idleN = teamBuilders(0).filter(builderIdle).length + groupsOf(0).filter(g => groupAlive(g) && this.idleG(g)).length;
    const alarmFresh = this.alarm && (S.rtime || 0) - this.alarm.rt < 12;
    const sig = [LANG.cur, this.touch(), JSON.stringify(this.open), G.map(g => g.k + g.L.map(x => this.uid(x)).join(',')).join('|'), H.map(h => [h.atk, h.work, h.idle, h.cnt].join(',')).join('|'), idleN, alarmFresh, R61 && R61.pref.labels].join('#');
    if (force || sig !== this.sig){
      this.sig = sig;
      let h = `<div class="qr">${qb('hq', '⌂', tr('Штаб', 'HQ', 'Sở CH', 'מפקדה'), tr('1-е нажатие — штаб; дальше — здания под атакой, захваченные точки, остальные здания', '1st press — HQ; then buildings under attack, captured points, other buildings', 'Lần 1 — sở chỉ huy; sau đó công trình bị tấn công, điểm chiếm, còn lại', 'לחיצה 1 — מפקדה; אחר כך מבנים תחת מתקפה, נקודות, שאר המבנים'))}` +
        qb('idle', '○', tr('Свободные', 'Idle', 'Rảnh', 'פנויים'), tr('Перебор простаивающих юнитов', 'Cycle through idle units', 'Lần lượt các đơn vị rảnh', 'מעבר בין יחידות פנויות'), idleN ? '' : 'dim', idleN) +
        qb('alarm', '⚠', tr('Тревога', 'Alarm', 'Báo động', 'אזעקה'), tr('Камера к месту последней атаки', 'Camera to the last attack', 'Camera tới nơi bị tấn công gần nhất', 'מצלמה למקום ההתקפה האחרונה'), alarmFresh ? 'hot' : this.alarm ? '' : 'dim') +
        (!this.touch() && typeof R61 !== 'undefined' ? `<button class="qb lab" data-g80="q:lab" title="${uixEsc(tr('Подписи над юнитами: все / выделенные / выкл (Alt — показать все)', 'Unit labels: all / selected / off (Alt — show all)', 'Nhãn', 'תוויות'))}"><i>🏷</i></button>` : '') + '</div>';
      G.forEach((g, gi) => {
        const hd = H[gi], op = this.open[g.k] && g.L.length;
        h += `<div class="gr ${op ? 'op' : ''} ${g.L.length ? '' : 'empty'}" data-gk="${g.k}"><button class="gh ${hd.atk ? 'atk' : ''}" data-g80="h:${g.k}" title="${uixEsc(tr('Тап — раскрыть/свернуть · долгое нажатие — выбрать всех', 'Tap — expand/collapse · long press — select all', 'Chạm — mở/đóng · giữ — chọn tất cả', 'הקשה — פתח/סגור · לחיצה ארוכה — בחר הכל'))}">` +
          `<i class="ic">${g.ic}</i><b>${g.n}</b><span class="bd">${hd.atk ? '<u class="a">⚠</u>' : ''}${hd.work ? `<u class="w">🔨${hd.work > 1 ? hd.work : ''}</u>` : ''}${hd.idle && g.k !== 'bld' ? `<u class="f">○${hd.idle}</u>` : ''}<u class="n">${hd.cnt}</u></span><i class="ar">${op ? '▾' : '▸'}</i></button>`;
        if (op){
          h += '<div class="gl">';
          for (const x of g.L){
            const nm = g.k === 'bld' ? this.bName(x) : groupLabel(x);
            h += `<button class="it" data-g80="i:${g.k}.${this.uid(x)}" data-u="${this.uid(x)}"><b>${uixEsc(nm)}</b><small data-st></small><s class="hp"><u data-hp></u></s><s class="pr"><u data-pr></u></s></button>`;
          }
          h += '</div>';
        }
        h += '</div>';
      });
      el.innerHTML = h;
    }
    // живые значения без пересборки
    const selS = new Set(selGroups());
    el.querySelectorAll('.gr').forEach(gd => {
      const g = G.find(x => x.k === gd.dataset.gk); if (!g) return;
      gd.querySelectorAll('.it').forEach(d => {
        const x = g.L.find(y => this.uid(y) === d.dataset.u); if (!x) return;
        const [st, hp, pr, cls] = this.item(g.k, x);
        const sm = d.querySelector('[data-st]'); if (sm.textContent !== st) sm.textContent = st;
        const u = d.querySelector('[data-hp]'); u.style.width = (clamp(hp, 0, 1) * 100).toFixed(0) + '%'; u.style.background = hp > 0.5 ? '#8fd18f' : hp > 0.25 ? '#dc6' : '#e66';
        const p = d.querySelector('[data-pr]'); p.parentElement.style.visibility = pr >= 0 ? 'visible' : 'hidden'; p.style.width = (clamp(pr, 0, 1) * 100).toFixed(0) + '%';
        const c2 = 'it ' + cls + ((g.k === 'bld' ? S.selB === x : selS.has(x)) ? ' sel' : '');
        if (d.className !== c2) d.className = c2;
      });
    });
    this.place();
  },
  // положение: ПК — над #side (он опускается на высоту панели); телефон — справа под ☰ (и под колонкой кнопок m67rail)
  place(){
    const el = this.el; if (!el) return;
    const de = document.documentElement;
    if (!this.touch()){
      el.style.top = '64px'; el.style.right = '0px'; el.style.left = 'auto';
      const h = el.offsetHeight; de.style.setProperty('--g80h', h + 'px');
      return;
    }
    let top = 58, right = 6, left = null;
    const cs = getComputedStyle(de), st = parseFloat(cs.getPropertyValue('--st')) || 0, sr = parseFloat(cs.getPropertyValue('--sr')) || 0;
    top += st; right += sr;
    const vis = e => e && e.offsetWidth && e.offsetHeight && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
    const side = $('side'); if (vis(side)) right = innerWidth - side.getBoundingClientRect().left + 6;
    const r71 = $('m71rail'), narrow = innerWidth < 520;
    if (vis(r71)){ const r = r71.getBoundingClientRect(); if (narrow) left = 58 + (parseFloat(cs.getPropertyValue('--sl')) || 0); else right = max(right, innerWidth - r.left + 6); }   // полная стратегия: сетка кнопок справа — левее неё (портрет — у левого края, за карточками отрядов)
    const rail = $('m67rail'); if (vis(rail)){ const r = rail.getBoundingClientRect(); if (innerWidth - r.left < right + el.offsetWidth) top = max(top, r.bottom + 6); }
    const w = left !== null ? 112 : 148;
    if (el._w !== w){ el._w = w; el.style.width = w + 'px'; el.classList.toggle('nar', w < 140); }
    const x0 = left !== null ? left : innerWidth - right - w, x1 = x0 + w;
    // полоса куратора во всю ширину (портрет) — встаём под неё
    for (const o of document.querySelectorAll('.cbox')){ if (!vis(o)) continue; const r = o.getBoundingClientRect(); if (r.right > x0 && r.left < x1 && r.top < top + 40 && r.bottom > top - 4) top = max(top, r.bottom + 6); }
    // снизу: командная карточка, нижняя панель стройки, миникарты — не заезжаем
    let bot = innerHeight - (innerHeight < 500 ? 84 : 150);
    for (const id of ['card', 'm74B', 'm71sq', 'uxStrat']){ const o = $(id); if (!vis(o)) continue; const r = o.getBoundingClientRect(); if (r.right > x0 && r.left < x1 && r.top > top + 60) bot = min(bot, r.top - 6); }
    el.style.top = top + 'px';
    if (left !== null){ el.style.left = left + 'px'; el.style.right = 'auto'; } else { el.style.right = right + 'px'; el.style.left = 'auto'; }
    el.style.maxHeight = max(96, bot - top) + 'px';
  },
  // ---------------------------------------------------------------- значки над зданиями: «можно заказать»
  BADGE: { squad: 'sol', tank: 'tank', drone: 'drone', elite: 'sky', builder: 'eng' },
  badgeStep(dt){
    this.badgeT += dt;
    const cyc = this.badgeT % 8;
    this.badges.length = 0;
    if (!this.show() || cyc > 3.2 || (typeof T72 !== 'undefined' && T72.on && !this.tutBadges)) return;
    const a = cyc < 0.3 ? cyc / 0.3 : cyc > 2.8 ? (3.2 - cyc) / 0.4 : 1;
    for (const b of [S.hq[0], ...S.buildings]){
      if (!b || !b.alive || b.team !== 0 || (b.cls === 'bld' && !b.done) || (b.queue && b.queue.length >= 2)) continue;
      if (typeof v64Prods !== 'function') break;
      const ks = v64Prods(b).filter(k => this.BADGE[k] && !canProduce(0, k));
      if (!ks.length) continue;
      const c = b.cls === 'hq' ? add(b.pos, mul(BASES[0], 9)) : add(b.pos, mul(b.up, (b.H || 4) + 2.2));
      if (!facing(c)) continue;
      const p = project(c); if (!p || p[0] < 0 || p[1] < 0 || p[0] > innerWidth || p[1] > innerHeight) continue;
      ks.slice(0, 2).forEach((k, i) => this.badges.push({ b, k, x: p[0] + (i - (min(2, ks.length) - 1) / 2) * 26, y: p[1] - 4 * (1 - a), a }));
    }
  },
  drawBadges(){
    if (!this.badges.length) return;
    const g = octx; g.save();
    for (const B of this.badges){
      g.globalAlpha = B.a * 0.95;
      g.fillStyle = 'rgba(10,14,12,.85)'; g.strokeStyle = '#8fffaa'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(B.x, B.y, 11, 0, PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(B.x - 4, B.y + 11); g.lineTo(B.x, B.y + 16); g.lineTo(B.x + 4, B.y + 11); g.fill();
      g.fillStyle = '#d8ffe2'; g.strokeStyle = '#d8ffe2'; g.lineWidth = 1.6;
      const x = B.x, y = B.y, t = this.BADGE[B.k];
      if (t === 'sol' || t === 'sky'){   // солдат: голова, плечи, винтовка
        g.beginPath(); g.arc(x, y - 4, 2.6, 0, PI * 2); g.fill();
        g.beginPath(); g.moveTo(x - 5, y + 6); g.lineTo(x - 4, y); g.lineTo(x + 4, y); g.lineTo(x + 5, y + 6); g.fill();
        g.beginPath(); g.moveTo(x + 3, y + 5); g.lineTo(x + 7, y - 4); g.stroke();
        if (t === 'sky'){ g.beginPath(); g.moveTo(x - 7, y - 6); g.lineTo(x - 4, y - 9); g.lineTo(x - 1, y - 6); g.stroke(); }
      } else if (t === 'tank'){   // танк: корпус, башня, ствол
        g.fillRect(x - 7, y + 1, 14, 4.5); g.fillRect(x - 3.5, y - 3, 7, 4); g.fillRect(x + 3, y - 2, 6, 1.6);
      } else if (t === 'eng'){   // инженер: молоток
        g.save(); g.translate(x, y); g.rotate(-0.6); g.fillRect(-1, -2, 2.2, 10); g.fillRect(-5, -6, 10, 4.2); g.restore();
      } else {   // дрон: крест с роторами
        g.beginPath(); g.moveTo(x - 6, y - 4); g.lineTo(x + 6, y + 4); g.moveTo(x + 6, y - 4); g.lineTo(x - 6, y + 4); g.stroke();
        for (const [dx, dy] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]){ g.beginPath(); g.arc(x + dx, y + dy, 2, 0, PI * 2); g.fill(); }
      }
    }
    g.restore();
  },
  badgeHit(x, y){
    for (const B of this.badges) if (B.a > 0.5 && Math.hypot(x - B.x, y - B.y) < (this.touch() ? 18 : 13)) return B;
    return null;
  },
  badgeOrder(B){
    this.stats.badgeOrders++;
    if (typeof produceAt === 'function') produceAt(B.b, B.k); else uiProduce(B.k);
    this.badges = this.badges.filter(x => x.b !== B.b);
  },
};
try { const o = JSON.parse(localStorage.getItem('pm_g80') || 'null'); if (o) Object.assign(G80.open, o); } catch (e){}
// ---------------------------------------------------------------- лимит инженеров 7
if (G80.on){
  const as0 = applyScale;
  applyScale = function(){ const r = as0.apply(this, arguments); GAME.MAX_BUILDERS = G80.MAXB; return r; };
  GAME.MAX_BUILDERS = G80.MAXB;
  const cp0 = canProduce;
  canProduce = function(team, key){
    if (key === 'builder' && team === 0 && countProduct(team, 'builder') >= GAME.MAX_BUILDERS)
      return tr(`Лимит инженеров ${GAME.MAX_BUILDERS}/${GAME.MAX_BUILDERS} — новый, когда освободится место`, `Builder limit ${GAME.MAX_BUILDERS}/${GAME.MAX_BUILDERS} — a new one once a slot frees up`, `Giới hạn kỹ sư ${GAME.MAX_BUILDERS}/${GAME.MAX_BUILDERS}`, `מגבלת מהנדסים ${GAME.MAX_BUILDERS}/${GAME.MAX_BUILDERS}`);
    return cp0.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- кадр, оверлей, клики по значкам
if (G80.on){
  const uf0 = uixFrame;
  uixFrame = function(dt){
    const r = uf0.apply(this, arguments);
    G80.safe(() => {
      G80.badgeStep(dt || 0.016);
      G80.t -= dt || 0.016; if (G80.t > 0) return; G80.t = 0.25;
      if (!S.attract) G80.watch();
      G80.render();
    }, 'frame');
    return r;
  };
  const do0 = drawOverlay;
  drawOverlay = function(dt){ const r = do0.apply(this, arguments); if (S.mode === 'rts' && !S.attract) G80.safe(() => G80.drawBadges(), 'badges'); return r; };
  const hit = (x, y, e) => {
    if (S.mode !== 'rts' || S.attract || MENU.isOpen() || S.place || S.cast) return false;
    if (e.target && e.target.closest && e.target.closest('#g80,#side,#card,#hud,#screen,button')) return false;
    const B = G80.badgeHit(x, y); if (!B) return false;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    G80.badgeOrder(B); return true;
  };
  addEventListener('mousedown', e => { if (e.button === 0) hit(e.clientX, e.clientY, e); }, true);
  addEventListener('touchstart', e => { const t = e.changedTouches[0]; if (t && e.touches.length === 1) hit(t.clientX, t.clientY, e); }, { capture: true, passive: false });
}
// ---------------------------------------------------------------- обучение стратегии: «Отряд — в бой» после «Производства»
if (G80.on && typeof STEPS72 !== 'undefined' && typeof DEF72 !== 'undefined' && typeof CTL72 !== 'undefined') G80.safe(() => {
  const i = STEPS72.rts.indexOf('produce');
  if (i >= 0 && !STEPS72.rts.includes('send80')) STEPS72.rts.splice(i + 1, 0, 'send80');
  T72T.send80 = ['Отряд — в бой', 'Squad — into battle', 'Đội — ra trận', 'חוליה — לקרב'];
  T72W.go80 = ['В БОЙ', 'ATTACK', 'TẤN CÔNG', 'לקרב'];
  DEF72.send80 = {
    mode: 'rts',
    init(T){
      T.id0 = T.id0 || 0; T.g = null; T.goal = null;
      const b = T72bar ? T72bar() : null;
      // заказанный отряд — сразу готов (ждать 9 с в обучении незачем); не заказан — заказываем сами
      for (const s of [S.hq[0], ...S.buildings]) if (s && s.alive && s.team === 0 && s.queue && s.queue[0] === 'squad'){ s.prodT = pTime(0, 'squad'); T.id0 = -1; }
      if (T.id0 !== -1 && b && b.done && !b.queue.length){ S.teams[0].ore = max(S.teams[0].ore, 500); b.queue.push('squad'); b.prodT = pTime(0, 'squad'); }
      T.ids = new Set(S.squads.map(s => s.id));
      S.sel.clear(); S.selB = null;
    },
    tick(T){
      if (!T.g){
        const n = S.squads.filter(s => s.team === 0 && groupAlive(s) && !T.ids.has(s.id)).sort((a, b) => b.id - a.id)[0];
        if (n){ T.g = n; S.sel.clear(); S.selB = null; S.sel.add(n); const L = leaderPos(n); T.goal = L ? T72fromBase(L, 46) : null; }
      }
    },
    check: T => !!T.g && !!T.goal && groupAlive(T.g) && T.g.goal && dist(T.g.goal, T.goal) < 26 && T.g.manualUntil > S.time,
    prog: T => T.g ? 0.5 : 0,
    mark: T => T.goal ? [{ p: T.goal, label: L72(T72W.go80), col: '#ff7a5a' }] : (T.g ? [] : []),
  };
  const H = {
    pc: { mouse: 'rmb', h: ['Новый отряд выделен — ПКМ по красной метке «В БОЙ».', 'The new squad is selected — RMB on the red "ATTACK" marker.', 'Đội mới đã chọn — chuột phải vào dấu đỏ “TẤN CÔNG”.', 'החוליה החדשה נבחרה — לחיצה ימנית על הסימון האדום „לקרב".'] },
    ph: { g: 'tap', h: ['Новый отряд выделен — тапни по красной метке «В БОЙ».', 'The new squad is selected — tap the red "ATTACK" marker.', 'Đội mới đã chọn — chạm dấu đỏ “TẤN CÔNG”.', 'החוליה החדשה נבחרה — הקש על הסימון האדום „לקרב".'] },
  };
  for (const id in CTL72.schemes){ const s = CTL72.schemes[id]; if (s.acts && s.acts.order && !s.acts.send80) s.acts.send80 = s.plat === 'pc' ? H.pc : H.ph; }
}, 'tut');
// ---------------------------------------------------------------- стили
(function(){ const st = document.createElement('style'); st.id = 'g80css'; st.textContent = `
  #g80{position:fixed;z-index:6;display:none;width:var(--sideW,244px);box-sizing:border-box;padding:4px 5px 5px;background:linear-gradient(90deg,rgba(10,11,12,.84),rgba(12,13,14,.93));
    border-left:1px solid var(--line,rgba(214,198,154,.3));border-bottom:1px solid var(--line,rgba(214,198,154,.3));font-family:"Exo 2",sans-serif;color:#d8cfb4;user-select:none;-webkit-user-select:none;touch-action:manipulation}
  #g80 button{font-family:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
  #g80 .qr{display:flex;gap:3px;margin-bottom:3px}
  #g80 .qb{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:3px;height:26px;padding:0 3px;background:rgba(40,38,30,.7);border:1px solid rgba(214,198,154,.35);border-radius:3px;font:600 11.5px "Exo 2";white-space:nowrap}
  #g80 .qb i{font-style:normal;font-size:13px} #g80 .qb span{overflow:hidden;text-overflow:ellipsis} #g80 .qb em{font-style:normal;color:#8fffaa;font-size:10.5px} #g80 .qb:hover{border-color:#fff}
  #g80 .qb.dim{opacity:.55} #g80 .qb.hot{border-color:#ff6a5a;color:#ffb0a4;animation:g80p 1s infinite alternate} #g80 .qb.lab{flex:0 0 26px;padding:0}
  @keyframes g80p{to{background:rgba(110,30,24,.75)}}
  #g80 .gr{margin-top:2px} #g80 .gr.empty{opacity:.55}
  #g80 .gh{display:flex;align-items:center;gap:5px;width:100%;height:26px;padding:0 5px;background:rgba(18,19,20,.85);border:1px solid rgba(214,198,154,.22);border-radius:3px;text-align:left}
  #g80 .gh:hover{border-color:rgba(255,255,255,.6)} #g80 .gh.atk{border-color:#ff6a5a;background:rgba(60,18,14,.85)}
  #g80 .gh .ic{font-style:normal;width:14px;text-align:center;color:var(--sand,#d6c69a)} #g80 .gh b{font-size:12px;color:#fff;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #g80 .gh .bd{display:flex;gap:4px;align-items:center;font-size:11px} #g80 .gh .bd u{text-decoration:none}
  #g80 .gh .a{color:#ff7a6a;font-weight:700} #g80 .gh .w{font-size:10px} #g80 .gh .f{color:#9fdcff} #g80 .gh .n{color:#ffd27a;font-weight:700;min-width:14px;text-align:right}
  #g80 .gh .ar{font-style:normal;color:#9a937e;font-size:10px;width:8px}
  #g80 .gl{display:flex;flex-direction:column;gap:2px;margin:2px 0 3px 8px;max-height:24vh;overflow-y:auto;scrollbar-width:thin}
  body:not(.touch) #g80{max-height:44vh;overflow-y:auto;scrollbar-width:thin}
  #g80 .it{position:relative;display:flex;align-items:baseline;gap:5px;width:100%;min-height:24px;padding:2px 5px 5px;background:rgba(12,13,14,.82);border:1px solid rgba(214,198,154,.18);border-left:3px solid #6a6a6a;text-align:left}
  #g80 .it b{font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%} #g80 .it small{font-size:10px;color:#b9b19a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:right}
  #g80 .it.fight{border-left-color:#ff5a4a} #g80 .it.fight small{color:#ff9a8a} #g80 .it.move{border-left-color:#7fd4ff} #g80 .it.idle{border-left-color:#8a8a7a} #g80 .it.work{border-left-color:#ffd27a}
  #g80 .it.sel{background:rgba(40,70,48,.9);border-color:rgba(143,255,170,.75)}
  #g80 .it s{position:absolute;left:3px;right:3px;height:2px;background:rgba(255,255,255,.08)} #g80 .it s u{display:block;height:100%;width:0}
  #g80 .it .hp{bottom:1px} #g80 .it .pr{bottom:3.5px} #g80 .it .pr u{background:#ffd27a}
  body.g80on:not(.touch) #side{top:calc(64px + var(--g80h,150px)) !important}
  body.g80on:not(.touch) #r61cards{display:none !important}
  body.g80m74 #m74L{display:none !important}
  body.touch #g80{width:148px;padding:3px;border:1px solid var(--line,rgba(214,198,154,.3));border-radius:6px;overflow-y:auto;scrollbar-width:none;background:rgba(10,11,12,.62)}
  body.touch #g80 .qb{height:30px;flex-direction:column;gap:0;font-size:9px;line-height:1;position:relative} body.touch #g80 .qb em{position:absolute;top:1px;right:2px;font-size:9px} body.touch #g80 .qb span{max-width:100%} body.touch #g80 .qb i{font-size:12px}
  body.touch #g80 .gh{height:30px;padding:0 4px;gap:3px} body.touch #g80 .gh b{font-size:11px} body.touch #g80 .gh .bd{gap:2px;font-size:10px}
  body.touch #g80.nar .qb span{display:none} body.touch #g80.nar .gh .ic{display:none} body.touch #g80.nar .gh .w{display:none}
  body.touch #g80 .gl{margin-left:0;max-height:none} body.touch #g80 .it{min-height:30px;flex-direction:column;gap:0;align-items:stretch} body.touch #g80 .it b{max-width:none} body.touch #g80 .it small{text-align:left}
`; document.head.appendChild(st); })();
