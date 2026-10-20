// =====================================================================
//  РЕЖИМ РАЗРАБОТЧИКА (v6.4) — полигон для проверки всего подряд.
//  Главное меню → «Режим разработчика»: новый матч с бесконечной рудой и КО, всё открыто
//  и прокачано (звания, способности, ранцы II, исследования, мастерство оружия → все обвесы,
//  техника без ожидания), мгновенная стройка и производство (выключается).
//  «Арсенал» (F8 или кнопка у метки): выдать оружие, стать любым классом, сесть в любую
//  технику, заспавнить манекены-цели, пополнить способности.
//  Карьера и сохранения не страдают: на время матча PROG.career подменяется копией,
//  запись карьеры и сохранений боя отключена; при выходе в меню / новом обычном матче
//  настоящая карьера возвращается из pm_career нетронутой.
//  Пауза → «Режим разработчика: ВКЛ/ВЫКЛ» включает то же в текущем матче (матч помечается).
// =====================================================================
const DEV = {
  on: false, match: false, instant: true, open: false, saved: null, dummies: [], t: 0,
  saveCareer0: PROG.saveCareer,
  devCareer(){
    const c = JSON.parse(this.saved || '{}');
    if (!c.cls){ c.cls = {}; c.wpn = {}; c.med = {}; c.medT = {}; c.mods = {}; c.cos = { xc: 'def', emb: '' }; c.ctr = null; }
    c.wpn = c.wpn || {}; c.cls = c.cls || {};
    for (const w of WPN_KEYS) c.wpn[w] = Object.assign({}, c.wpn[w] || {}, { xp: 1e6, k: (c.wpn[w] || {}).k || 0 });
    for (const r of Object.keys(ROLES).concat('veh')) c.cls[r] = max(c.cls[r] || 0, 1e6);
    c.xp = max(c.xp || 0, 3e6); c.best = max(c.best || 0, RANKS.length - 1);
    c.lvSeen = CAREER.levelOf(c.xp).L;
    return c;
  },
  enter(){
    if (!this.match){ try { if (typeof CAREER !== 'undefined') CAREER.save(); this.saveCareer0.call(PROG); } catch (e){} this.saved = JSON.stringify(PROG.career); this.match = true; }
    this.on = true;
    PROG.saveCareer = () => {};                   // карьера в режиме разработчика не пишется
    PROG.career = this.devCareer();
    if (typeof CAREER !== 'undefined'){ CAREER.dirty = false; CAREER.mc = {}; }
    this.unlockAll();
    feed(tr('🛠 Режим разработчика: всё открыто, руда без конца. Арсенал — F8 или кнопка «🛠 Арсенал».', '🛠 Developer mode: everything unlocked, endless ore. Arsenal — F8 or the "🛠 Arsenal" button.', '🛠 Chế độ nhà phát triển: mở khóa tất cả, quặng vô hạn. Kho vũ khí — F8.'), '#ffb347');
    buildSidebar(); this.ui();
  },
  unlockAll(){
    PROG.allUnlocked = true;
    for (const k in UNLOCKS) PROG.unl.add(UNLOCKS[k]);
    if (PROG.rank < 10){ PROG.rank = 10; PROG.xp = max(PROG.xp, rankXPAt(10)); }
    const T = S.teams[0];
    T.jet2 = true; T.armor = PRODUCTS.armor.max; T.weapons = PRODUCTS.weapons.max; T.drill = PRODUCTS.drill.max;
    if (S.me && S.me.cls === 'inf') S.me.jet = jetOf(S.me);
    for (const u of S.units) if (u.team === 0 && u.cls === 'inf') u.jet = jetOf(u);
  },
  // выход из матча разработчика: вернуть настоящую карьеру
  exit(){
    if (!this.match) return;
    this.on = false; this.match = false; this.open = false;
    PROG.saveCareer = this.saveCareer0;
    try { PROG.career = Object.assign({ xp: 0, kills: 0, matches: 0, wins: 0, best: 0, tasks: 0 }, JSON.parse(localStorage.getItem('pm_career') || this.saved || '{}')); } catch (e){ PROG.career = JSON.parse(this.saved || '{}'); }
    if (typeof CAREER !== 'undefined'){ CAREER.dirty = false; CAREER.mc = {}; }
    PROG.allUnlocked = SET.unlockAll;
    this.saved = null; this.dummies = [];
    this.ui();
  },
  toggle(){ if (this.on){ this.on = false; feed(tr('Режим разработчика выключен (матч остаётся помеченным — карьера не пишется)', 'Developer mode off (the match stays flagged — career is not saved)', 'Đã tắt chế độ nhà phát triển'), '#9cf'); this.ui(); } else this.enter(); },
  start(){ MENU.newGame(); this.enter(); },
  frame(dt){
    if (!this.match || S.attract){ this.ui(); return; }
    if (this.on){
      const T = S.teams[0];
      T.ore = max(T.ore, 50000); T.cmd = max(T.cmd, GAME.CMD_MAX);
      if (this.instant){
        for (const b of S.buildings) if (b.alive && b.team === 0 && b.cls === 'bld' && !b.done) finishSite(b);
        for (const s of [S.hq[0], ...S.buildings]) if (s && s.team === 0 && s.alive && s.queue && s.queue.length && (s.cls === 'hq' || s.done)) s.prodT = max(s.prodT, pTime(0, s.queue[0]));
      }
    }
    // манекены: стоят на месте и не стреляют
    for (const u of this.dummies){ if (!u.alive) continue; if (u.dPos){ u.pos = u.dPos.slice(); if (u.vel) u.vel = [0, 0, 0]; } u.cd = max(u.cd || 0, 1); u.rocketCd = 99; u.target = null; }
    this.dummies = this.dummies.filter(u => u.alive);
    this.t -= dt; if (this.t <= 0){ this.t = 0.5; this.ui(); }
  },
};
// ---------------------------------------------------------------------
//  защита карьеры и сохранений
// ---------------------------------------------------------------------
{
  const sv0 = SAVE.save.bind(SAVE);
  SAVE.save = function(slot){ if (DEV.match){ feed(tr('В режиме разработчика сохранения боя отключены', 'Battle saves are disabled in developer mode', 'Đã tắt lưu trận trong chế độ nhà phát triển'), '#ffb347'); return false; } return sv0(slot); };
  const au0 = SAVE.auto.bind(SAVE);
  SAVE.auto = function(){ if (DEV.match) return; return au0(); };
  const ng0 = MENU.newGame.bind(MENU);
  MENU.newGame = function(t){ DEV.exit(); return ng0(t); };
  const tm0 = MENU.toMenu.bind(MENU);
  MENU.toMenu = function(){ DEV.exit(); return tm0(); };
  const lg0 = MENU.loadGame.bind(MENU);
  MENU.loadGame = function(s){ DEV.exit(); return lg0(s); };
  const pnm0 = PROG.newMatch.bind(PROG);
  PROG.newMatch = function(){ pnm0(); if (DEV.on) DEV.unlockAll(); };
  const wa0 = weaponAvail;
  weaponAvail = function(w){ if (DEV.on && WEAPONS[w]) return true; return wa0(w); };
  const vc0 = V2.canProduce.bind(V2);
  V2.canProduce = function(team, key){ const r = vc0(team, key); if (DEV.on && team === 0 && r && PRODUCTS[key] && PRODUCTS[key].unlock && S.time < PRODUCTS[key].unlock && !/[Лл]имит|[Ll]imit/.test(r)) return null; return r; };
}
// ---------------------------------------------------------------------
//  АРСЕНАЛ: оружие, классы, техника, манекены
// ---------------------------------------------------------------------
Object.assign(DEV, {
  spot(ahead){
    const c = ctrlEntity();
    if (S.mode === 'fps' && c) return surfacePoint(norm(add(c.pos, mul(c.fwd || c.aim || anyTangent(norm(c.pos)), ahead || 9))), 1.5);
    return surfacePoint(norm(S.cam ? rtsFocusPoint() : mul(BASES[0], RM)), 1.5);
  },
  weapon(w){
    const c = ctrlEntity();
    if (!c || c.cls !== 'inf'){ this.cls('assault'); }
    const K = S.kit; if (!K || !WEAPONS[w]) return;
    if (w === 'hmg') K.hmgT = 1e9;
    K.mag[w] = WEAPONS[w].mag || K.mag[w]; K.w = w; K.reloadT = 0; emit('wswitch', {});
    feed(tr(`Оружие: ${N2(WEAPONS[w].n)}`, `Weapon: ${N2(WEAPONS[w].n)}`, `Vũ khí: ${N2(WEAPONS[w].n)}`), '#ffb347');
  },
  cls(role){
    const p = this.spot(6);
    const sq = spawnSquad(0, role === 'sniper', p, 4, [role, role, role, role]);
    const u = sq.units[0];
    if (S.mode !== 'fps') enterFPS(u); else takeControl(u);
    this.unlockAll();
    feed(tr(`Класс: ${N2(ROLES[role].n)}`, `Class: ${N2(ROLES[role].n)}`, `Lớp: ${N2(ROLES[role].n)}`), '#ffb347');
  },
  veh(kind){
    const p = this.spot(12);
    let v;
    if (kind === 'tank') v = makeTank(p, 0);
    else if (kind === 'drone') v = makeDrone(add(p, mul(norm(p), 6)), 0);
    else v = V2.make(p, 0, kind);
    if (S.mode !== 'fps') enterFPS(v); else takeControl(v);
    feed(tr(`Техника: ${groupLabel(v)}`, `Vehicle: ${groupLabel(v)}`, `Xe: ${groupLabel(v)}`), '#ffb347');
  },
  refill(){
    const K = S.kit, c = ctrlEntity();
    if (K){ K.grenCd = 0; K.reflex = 1; K.strikeCd = 0; K.strikeCharges = max(K.strikeCharges || 0, 5); K.freeRockets = 20; if (K.gren !== undefined) K.gren = max(K.gren, 5); for (const w in WEAPONS) if (WEAPONS[w].mag) K.mag[w] = WEAPONS[w].mag; }
    if (c){ c.rocketCd = 0; c.hp = c.maxhp; if (c.jet) c.energy = c.jet.emax; }
    feed(tr('Способности и патроны пополнены', 'Abilities and ammo refilled', 'Đã nạp đầy'), '#ffb347');
  },
  dummy(){
    const p = this.spot(28);
    const sq = spawnSquad(1, false, p, 4);
    sq.order = 'hold'; sq.goal = p; sq.manualUntil = 1e9;
    for (const u of sq.units){ u.dummy = true; u.dPos = u.pos.slice(); this.dummies.push(u); }
    feed(tr('Манекены-цели: 4 робота Роя стоят и не стреляют', 'Target dummies: 4 Swarm robots that stand still and do not shoot', 'Hình nộm: 4 robot đứng yên'), '#ffb347');
  },
  html(){
    const b = (a, v, t) => `<button data-dv="${a}" data-v="${v}">${t}</button>`;
    const W = ['rifle', 'smg', 'rail', 'hmg'].filter(w => WEAPONS[w]);
    return `<h4>🛠 ${tr('Арсенал', 'Arsenal', 'Kho vũ khí')}<button data-dv="min" title="${tr('Свернуть / развернуть', 'Collapse / expand', 'Thu gọn / mở')}">${this.pmin ? '▸' : '▾'}</button><button data-dv="close">✕</button></h4>
      <h5>${tr('Оружие', 'Weapons', 'Vũ khí')}</h5><div class="r">${W.map(w => b('w', w, N2(WEAPONS[w].n))).join('')}${b('refill', '', '↻ ' + tr('Пополнить всё', 'Refill all', 'Nạp đầy'))}</div>
      <h5>${tr('Класс (новый отряд рядом, вселиться)', 'Class (new squad nearby, possess)', 'Lớp (đội mới, nhập vai)')}</h5><div class="r">${Object.keys(ROLES).map(r => b('c', r, ROLES[r].icon + ' ' + N2(ROLES[r].n))).join('')}</div>
      <h5>${tr('Техника (появится рядом, сесть)', 'Vehicles (spawn nearby, board)', 'Xe (xuất hiện gần, lên xe)')}</h5><div class="r">${b('v', 'tank', '■ ' + tr('Танк', 'Tank', 'Xe tăng'))}${Object.keys(VK).map(k => b('v', k, VK[k].icon + ' ' + V2.cname(k, 0))).join('')}${b('v', 'drone', '▲ ' + tr('Дрон', 'Drone', 'Drone'))}</div>
      <h5>${tr('Полигон', 'Range', 'Trường bắn')}</h5><div class="r">${b('dummy', '', '◎ ' + tr('Манекены-цели', 'Target dummies', 'Hình nộm'))}${b('instant', '', (this.instant ? '☑ ' : '☐ ') + tr('Мгновенная стройка', 'Instant build', 'Xây tức thì'))}${b('ore', '', '+ ' + tr('Руда / КО', 'Ore / CP', 'Quặng / ĐCH'))}${b('dev', '', this.on ? tr('Выключить режим', 'Turn mode off', 'Tắt chế độ') : tr('Включить режим', 'Turn mode on', 'Bật chế độ'))}</div>`;
  },
  ui(){
    let lab = $('devLab');
    if (!this.match || S.attract || MENU.isOpen()){ if (lab) lab.style.display = 'none'; const p = $('devPan'); if (p) p.style.display = 'none'; return; }
    if (!lab){
      lab = document.createElement('div'); lab.id = 'devLab'; document.body.appendChild(lab);
      const go = e => { const t = e.target.closest('[data-dl]'); if (!t) return; e.preventDefault(); e.stopPropagation(); AU.init(); DEV.panel(); };
      lab.addEventListener('mousedown', go); lab.addEventListener('touchstart', go, { passive: false });
    }
    const h = this.arsOff ? `<button data-dl="1">🛠 ${tr('Арсенал: выкл', 'Arsenal: off', 'Kho: tắt')}</button>` : `<b>${tr('РЕЖИМ РАЗРАБОТЧИКА', 'DEVELOPER MODE', 'CHẾ ĐỘ NHÀ PHÁT TRIỂN')}${this.on ? '' : ' · ' + tr('выкл', 'off', 'tắt')}</b><button data-dl="1">🛠 ${tr('Арсенал', 'Arsenal', 'Kho')}${TOUCH.on ? '' : ' <kbd>F8</kbd>'}</button>`;
    if (lab._h !== h){ lab._h = h; lab.innerHTML = h; }
    lab.style.display = 'flex';
    const p = $('devPan'); if (p) p.style.display = this.open ? 'block' : 'none';
  },
  panel(on){
    if (this.arsOff){ this.arsOff = false; on = true; }   // v7.3: Арсенал можно выключить (⏻) и включить обратно кнопкой у метки / F8
    this.open = on === undefined ? !this.open : !!on;
    let p = $('devPan');
    if (!p){
      p = document.createElement('div'); p.id = 'devPan'; document.body.appendChild(p);
      const go = e => {
        const t = e.target.closest('button'); e.stopPropagation(); if (!t) return; e.preventDefault(); AU.init();
        const a = t.dataset.dv, v = t.dataset.v;
        if (a === 'close'){ DEV.panel(false); return; }
        if (a === 'off'){ DEV.arsOff = true; DEV.panel(false); return; }
        if (a === 'min'){ DEV.pmin = !DEV.pmin; p.classList.toggle('min', DEV.pmin); p.innerHTML = DEV.html(); return; }
        if (a === 'w') DEV.weapon(v); else if (a === 'c') DEV.cls(v); else if (a === 'v') DEV.veh(v);
        else if (a === 'refill') DEV.refill(); else if (a === 'dummy') DEV.dummy();
        else if (a === 'instant') DEV.instant = !DEV.instant;
        else if (a === 'ore'){ S.teams[0].ore += 10000; S.teams[0].cmd = GAME.CMD_MAX; }
        else if (a === 'dev') DEV.toggle();
        emit('ui', { kind: 'ok' });
        p.innerHTML = DEV.html();
      };
      p.addEventListener('mousedown', e => e.stopPropagation());
      p.addEventListener('click', go);
      p.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
    }
    p.innerHTML = this.html(); p.classList.toggle('min', !!this.pmin);
    if (this.open && S.mode === 'fps' && !TOUCH.on) unlockMouse();
    if (!this.open && S.mode === 'fps' && !TOUCH.on && !MENU.isOpen()) lockMouse();
    this.ui();
  },
});
addEventListener('keydown', e => { if (e.code === 'F8' && DEV.match && !MENU.isOpen()){ e.preventDefault(); DEV.panel(); } });
// главное меню и пауза
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    const h = hm0.call(this), k = 'id="m_tutorial"', i = h.indexOf(k);
    if (i < 0) return h;
    const j = h.indexOf('</button>', i) + 9;
    return h.slice(0, j) + this.btn('dev', '🛠 ' + tr('Режим разработчика (полигон)', 'Developer mode (sandbox)', 'Chế độ nhà phát triển (sa bàn)') + ` <small style="opacity:.6">${tr('всё открыто · карьера не меняется', 'all unlocked · career untouched', 'mở khóa tất cả · sự nghiệp không đổi')}</small>`) + h.slice(j);
  };
  const hp0 = MENU.html_pause;
  MENU.html_pause = function(){
    const h = hp0.call(this), k = 'id="m_settings"', i = h.indexOf(k);
    if (i < 0) return h;
    const s = h.lastIndexOf('<button', i);
    return h.slice(0, s) + this.btn('devtog', '🛠 ' + tr('Режим разработчика', 'Developer mode', 'Chế độ nhà phát triển') + ': ' + (DEV.on ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')) + (DEV.match ? '' : ` <small style="opacity:.6">${tr('(матч не попадёт в карьеру)', '(match will not count for career)', '(trận không tính vào sự nghiệp)')}</small>`)) +
      (DEV.match ? this.btn('devars', '🛠 ' + tr('Арсенал', 'Arsenal', 'Kho vũ khí')) : '') + h.slice(s);
  };
  const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.call(this, name);
    const on = (id, fn) => { const b = $('m_' + id); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
    on('dev', () => DEV.start());
    on('devtog', () => { DEV.toggle(); this.show('pause'); });
    on('devars', () => { this.resume(); DEV.panel(true); });
  };
}
const _devUixFrame = uixFrame;
uixFrame = function(dt){ _devUixFrame(dt); try { DEV.frame(dt); } catch (e){ if (!DEV.err){ DEV.err = 1; console.warn('dev', e); } } };
(function devCSS(){
  const st = document.createElement('style'); st.id = 'devcss';
  st.textContent = `
  #devLab{position:fixed;right:12px;top:34px;z-index:19;display:none;align-items:center;gap:8px;background:rgba(80,20,10,.85);border:1px solid #ff8a5a;padding:2px 4px 2px 10px;font:700 11px "Exo 2";letter-spacing:.14em;color:#ffb38a;pointer-events:auto}
  #devLab button{pointer-events:auto;background:rgba(255,140,90,.18);border:1px solid #ff8a5a;color:#ffe2d0;font:700 11px "Exo 2";padding:3px 8px;cursor:pointer;letter-spacing:0}
  #devLab kbd{font-size:9px}
  #devPan{position:fixed;right:8px;top:62px;z-index:30;display:none;width:min(310px,40vw);max-height:calc(100vh - 80px);overflow:auto;background:rgba(14,12,10,.96);border:1px solid #ff8a5a;border-left:4px solid #ff8a5a;padding:8px 12px 12px;color:#eadcc6;font-family:"Exo 2";pointer-events:auto}
  #devPan h4{margin:0 0 4px;display:flex;align-items:center;font:400 17px "Russo One";color:#ffb38a} #devPan h4 button{width:30px;height:28px;padding:0} #devPan h4 button:first-of-type{margin-left:auto} #devPan.min{width:auto} #devPan.min h5,#devPan.min .r{display:none}
  #devPan h5{margin:8px 0 4px;font:600 10.5px "Exo 2";letter-spacing:.14em;text-transform:uppercase;color:#c9a990}
  #devPan .r{display:flex;flex-wrap:wrap;gap:5px}
  #devPan button{pointer-events:auto;background:rgba(60,40,30,.8);border:1px solid rgba(255,160,120,.5);color:#ffeadc;font:600 12.5px "Exo 2";padding:7px 10px;cursor:pointer;border-radius:3px;min-height:34px}
  #devPan button:hover{border-color:#fff}
  body.touch #devLab{bottom:2px;top:auto;left:4px;right:auto;font-size:9px;letter-spacing:.06em;padding:1px 3px 1px 6px} body.touch #devLab button{padding:4px 8px;font-size:11px}
  body.touch #devPan{max-height:92vh;padding:6px 8px} body.touch #devPan button{min-height:38px;font-size:12px;padding:6px 8px}`;
  document.head.appendChild(st);
})();
