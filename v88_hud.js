// =====================================================================
//  v8.8 — ЧИСТЫЙ ЭКРАН В БОЮ (HUD88). Правило Дмитрия: центр свободен, остальное компактно по углам, подсказки закрываются.
//  • Длинная справка по управлению — только в начале самого первого матча (карточка справа, гаснет через 9 с, ✕),
//    потом — по запросу: F1 в бою, ☰ → «? Управление» (телефон), кнопка в паузе. Длинные строки начала матча в ленту не идут.
//  • Подсказки (HINTS): по одной, короткие тексты, 6 с, одна и та же — один раз навсегда (localStorage pm88_tips),
//    в бою (враг ближе 60 м) — только боевые (ракета, граната, рефлекс, удар, «повреждён»).
//  • Лента событий: 4 строки (телефон — 3), живут 7 с и гаснут, мельче, длинные фразы обрезаются по первой паузе,
//    одинаковые подряд — «×2».
//  • Карточка «Сейчас» прячется, когда сверху уже виден тот же приказ штаба; на ПК в шутере верхний ряд HUD короче
//    (без «КО», «Базы», «Стратег» — не наезжает на приказ), «Поддержка» не наезжает на оружие.
//  • «Чистый экран»: F9 / ☰ / пауза / Настройки — в бою остаются прицел, здоровье, патроны, миникарта.
//  • Портрет телефона: приказ и подсказка под верхним рядом кнопок; панель шага урока не закрывает кнопку режима.
//  Хуки: обёртки feed, updateHUD, HINTS.show, V87M.hint, uixFrame, T72.render, M67.fillSheet, MENU.html_pause/html_settings/wire,
//  P71M.sec, BIND_NAMES.rts. Новый код только здесь.
// =====================================================================
const HUD88 = {
  err: {}, KEY: 'F9', LIFE: 7, introT: -1, introEl: null, toastT: 0,
  stats: { feedIn: 0, feedDup: 0, feedCut: 0, feedIntro: 0, tipShown: 0, tipSeen: 0, tipCombat: 0, intro: 0, clean: 0 },
  CBT: new Set(['lowhp', 'rocket', 'grenade', 'reflex', 'strike', 'vtank2', 'g62']),
  L: (ru, en) => tr(ru, en, en, en),
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('HUD88 ' + tag, e); } } },
  ph(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e){ return null; } },
  seen: (() => { try { return JSON.parse(localStorage.getItem('pm88_tips') || '{}') || {}; } catch (e){ return {}; } })(),
  saveSeen(){ this.ls('pm88_tips', JSON.stringify(this.seen)); },
  tut(){ return (typeof T72 !== 'undefined' && T72.on) || (typeof TUT !== 'undefined' && TUT.on); },
  battle(){ return !S.attract && !S.over && !MENU.isOpen(); },
  plain(t){ return String(t).replace(/<[^>]+>/g, ''); },
  // ---------------------------------------------------------------- лента: коротко
  shorten(t){
    if (t.indexOf('<') >= 0 || t.length <= 64) return t;
    let best = -1;
    for (const s of ['. ', ' — ', '; ', ' · ', '! ']){ let i = t.indexOf(s); while (i >= 0 && i < 18) i = t.indexOf(s, i + 1); if (i >= 18 && i <= 62 && (best < 0 || i < best)) best = i; }
    this.stats.feedCut++;
    if (best > 0) return t.slice(0, best) + (t[best] === '!' ? '!' : '');
    const sp = t.lastIndexOf(' ', 58); return t.slice(0, sp > 30 ? sp : 58) + '…';
  },
  renderFeed(){
    const el = $('feed'); if (!el) return;
    const now = S.time, N = this.ph() ? 3 : 4;
    const L = S.feed.filter(f => now - f.t < this.LIFE).slice(-N);
    const h = L.map(f => `<div style="color:${f.color};opacity:${clamp((this.LIFE - (now - f.t)) / 1.5, 0, 1).toFixed(2)}">${f.text}</div>`).join('');
    if (el.innerHTML !== h) el.innerHTML = h;
  },
  // ---------------------------------------------------------------- подсказки: короткие тексты
  short(id){
    const ph = this.ph(), L = this.L;
    if (id === 'possess') return ph ? L('Выдели юнит → «▶ Вселиться» или двойной тап. Кнопка режима вверху справа: Стратег → Командир → Шутер.', 'Select a unit → "▶ Possess" or double-tap. Mode button at the top right: Strategist → Commander → Shooter.')
      : L(`Выдели юнит → «▶ Вселиться» или двойной клик. ${bk('rts')} — по кругу: Стратег → Командир → Шутер.`, `Select a unit → "▶ Possess" or double-click. ${bk('rts')} cycles: Strategist → Commander → Shooter.`);
    const NEU = { range: 1, lowhp: 1, route: 1, task: 1 };
    if (ph && !NEU[id]) return null;   // на телефоне свои короткие тексты (v67_mobile); общие — ниже
    const M = {
      redeploy: [`${bk('redeploy')} — капсула к цели · Shift+${bk('redeploy')} — в гущу боя`, `${bk('redeploy')} — pod to the objective · Shift+${bk('redeploy')} — into the fight`],
      task: ['Сверху — приказ стратега: выполняй, опыт ×2–×3', 'At the top is the strategist\'s order: follow it, XP ×2–×3'],
      jet: [`${bk('run')} — ранец: тап — прыжок, держать — полёт`, `${bk('run')} — jump pack: tap to hop, hold to fly`],
      airbrake: [`${bk('down')} в воздухе — тормоз ранцем`, `${bk('down')} in the air — jet brake`],
      slide: [`${bk('down')} на бегу — подкат · прыжок у стены — отскок`, `${bk('down')} while running — slide · jump at a wall — wall-jump`],
      range: ['Пули сильнее всего на 20–50 м', 'Bullets hit hardest at 20–50 m'],
      lowhp: ['Сильно повреждён — уйди из-под огня, броня чинится', 'Badly damaged — get out of the fire, armor self-repairs'],
      tank: [`${bk('interact')} у нашего танка — сесть`, `${bk('interact')} next to our tank — take it`],
      turret: [`${bk('interact')} у турели — занять`, `${bk('interact')} next to the turret — man it`],
      switch: [`Тихо — ${bk('switch')}: боец ближе к бою`, `Quiet here — ${bk('switch')}: a unit closer to the fight`],
      route: ['По зелёным стрелкам стратега бежишь быстрее', 'You run faster along the strategist\'s green chevrons'],
      rts: [`${bk('rts')} — режим: Стратег → Командир → Шутер`, `${bk('rts')} — mode: Strategist → Commander → Shooter`],
      ai: [`${bk('ai')} — выключить ИИ-стратега и командовать самому`, `${bk('ai')} — turn off the AI strategist and command yourself`],
      third: [`${bk('third')} — вид от 3-го лица`, `${bk('third')} — third-person view`],
      reload: [`${bk('reload')} — перезаряжайся заранее`, `${bk('reload')} — reload early`],
      reflex: [`Много врагов — ${bk('reflex')}: рефлекс`, `Lots of hostiles — ${bk('reflex')}: Reflex`],
      rocket: [`Техника или здание врага — ${bk('rocket')}: ракета`, `Enemy vehicle or structure — ${bk('rocket')}: rocket`],
      grenade: [`Враги кучей — ${bk('grenade')}: граната`, `Enemies bunched up — ${bk('grenade')}: grenade`],
      strike: [`Скопление врагов — ${bk('strike')}: удар в прицел`, `Enemy cluster — ${bk('strike')}: strike at your aim`],
    };
    const m = M[id]; return m ? L(m[0], m[1]) : null;
  },
  combat(){ const c = ctrlEntity(); return !!(c && S.mode === 'fps' && enemiesNear(0, c.pos, 60).length); },
  // ---------------------------------------------------------------- карточка «Управление» (один раз; потом — по запросу)
  introHTML(){
    const L = this.L, k = s => `<kbd>${s}</kbd>`;
    const goal = S.endless ? L('Цель: снести штаб врага и все его ключевые здания', 'Goal: destroy the enemy HQ and all its key buildings')
      : L('60 минут: снеси штаб врага или держи больше точек', '60 minutes: destroy the enemy HQ or hold more points');
    const rows = this.ph() ? [
      L('Левый палец — идти, правый — обзор, красная — огонь', 'Left thumb — move, right — look, red — fire'),
      L('Кнопка режима вверху справа: тап — следующий, удержать — выбор', 'Mode button at the top right: tap — next, hold — pick'),
      L('⇆ — сменить бойца · ☰ — меню, «чистый экран», эта справка', '⇆ — next unit · ☰ — menu, clean screen, this card'),
      goal,
    ] : [
      `${k(bk('fwd') + bk('left') + bk('back') + bk('right'))} ${L('идти', 'move')} · ${k(bk('run'))} ${L('ранец', 'jets')} · ${k(L('ЛКМ', 'LMB'))} ${L('огонь', 'fire')} · ${k(L('ПКМ', 'RMB'))} ${L('прицел', 'aim')}`,
      `${k(bk('rts'))} ${L('режим: Стратег → Командир → Шутер', 'mode: Strategist → Commander → Shooter')} · ${k('Alt+1/2/3')}`,
      `${k(bk('switch'))} ${L('сменить бойца', 'next unit')} · ${k(bk('redeploy'))} ${L('капсула к цели', 'pod to objective')} · ${k(bk('interact'))} ${L('танк', 'tank')}`,
      goal,
      `${k('F1')} ${L('эта справка', 'this card')} · ${k('/')} ${L('все клавиши', 'all keys')} · ${k(this.KEY)} ${L('чистый экран', 'clean screen')}`,
    ];
    return `<b>${L('Управление · коротко', 'Controls · in short')}</b><button class="x88">✕</button>` + rows.map(r => `<p>${r}</p>`).join('');
  },
  showIntro(sec){
    let el = this.introEl;
    if (!el){
      el = this.introEl = document.createElement('div'); el.id = 'intro88'; document.body.appendChild(el);
      const x = e => { if (e.target.closest && e.target.closest('.x88')){ e.preventDefault(); e.stopPropagation(); this.hideIntro(); } };
      el.addEventListener('click', x); el.addEventListener('touchstart', x, { passive: false });
    }
    el.innerHTML = this.introHTML(); el.classList.add('on'); el.classList.remove('fade');
    this.introT = S.rtime + (sec || 9); this.stats.intro++;
  },
  hideIntro(){ const el = this.introEl; if (el){ el.classList.remove('on', 'fade'); } this.introT = -1; },
  // ---------------------------------------------------------------- чистый экран
  isClean(){ return !!SET.clean88; },
  setClean(v){
    SET.clean88 = v === undefined ? !SET.clean88 : !!v; MENU.save(); this.stats.clean++;
    if (typeof V74 !== 'undefined' && V74.refreshBtns) V74.refreshBtns();
    this.toast((SET.clean88 ? '▢ ' + this.L('Чистый экран', 'Clean screen') : '▣ ' + this.L('Обычный экран', 'Full HUD')) + (this.ph() ? '' : ' · ' + this.KEY));
  },
  toast(t){
    let el = $('t88'); if (!el){ el = document.createElement('div'); el.id = 't88'; document.body.appendChild(el); }
    el.textContent = t; el.classList.add('on'); this.toastT = performance.now() / 1000 + 1.6;
  },
  // ---------------------------------------------------------------- кадр
  frame(){
    const bc = document.body.classList, fps = S.mode === 'fps' && !S.attract && !MENU.isOpen();
    if (bc.contains('fps88') !== fps) bc.toggle('fps88', fps);
    const cl = fps && this.isClean(); if (bc.contains('clean88') !== cl) bc.toggle('clean88', cl);
    const ob = $('obj'), oo = fps && ob && ob.style.display === 'block'; if (bc.contains('obj88') !== oo) bc.toggle('obj88', oo);
    const now = performance.now() / 1000;
    // первая игра: справка один раз
    if (fps && this.battle() && !this.tut() && S.time > 0.6 && S.time < 30 && !this.ls('pm88_intro')){ this.ls('pm88_intro', '1'); this.showIntro(9); }
    if (this.introT > 0){
      const el = this.introEl, rt = S.rtime;
      if (!fps || rt > this.introT || rt < this.introT - 20) this.hideIntro();
      else if (el && rt > this.introT - 1.2 && !el.classList.contains('fade')) el.classList.add('fade');
    }
    const io = this.introT > 0; if (bc.contains('intro88on') !== io) bc.toggle('intro88on', io);
    const t = $('t88'); if (t && this.toastT && now > this.toastT){ t.classList.remove('on'); this.toastT = 0; }
  },
  key(e){
    if (e.repeat || !this.battle() || this.ph()) return false;
    if (e.code === this.KEY){ this.setClean(); return true; }
    if (e.code === 'F1' && S.mode === 'fps'){ if (this.introT > 0) this.hideIntro(); else this.showIntro(12); return true; }
    return false;
  },
  // портрет телефона: панель шага урока — под верхним рядом кнопок, не закрывает кнопку режима
  t72fix(){
    if (!this.ph() || innerHeight <= innerWidth) return;
    const P = $('t72p'); if (!P || P.style.display === 'none') return;
    let top = 6; for (const s of ['#touch .tt', '#m87', '#m74go']){ const e = document.querySelector(s); if (!e) continue; const r = e.getBoundingClientRect(); if (r.width && r.top < 80) top = max(top, r.bottom + 6); }
    const L = 58, w = max(190, innerWidth - L - 142);
    P.style.left = L + 'px'; P.style.width = w + 'px'; P.style.top = top + 'px';
  },
};
// ---------------------------------------------------------------- лента
{ const fd0 = feed; feed = function(text, color){
    if (typeof text !== 'string' || S.attract) return fd0.apply(this, arguments);
    let t = text;
    try {
      HUD88.stats.feedIn++;
      // длинные строки самого начала матча (справка) — не в ленту; справка — карточкой, один раз
      if (S.time < 2.5 && !HUD88.tut() && HUD88.plain(text).length > 44){ HUD88.stats.feedIntro++; return; }
      t = HUD88.shorten(text);
      const last = S.feed.slice(-4).find(f => f.raw88 === t && S.time - f.t < 8);
      if (last){ last.n88 = (last.n88 || 1) + 1; last.t = S.time; last.text = last.base88 + ` <i class="x88n">×${last.n88}</i>`; HUD88.stats.feedDup++; return; }
    } catch (e){ HUD88.safe(() => { throw e; }, 'feed'); }
    const r = fd0.call(this, t, color), f = S.feed[S.feed.length - 1];
    if (f && f.t === S.time && f.raw88 === undefined){ f.raw88 = t; f.base88 = f.text; }
    return r;
  }; }
{ const uh0 = updateHUD; updateHUD = function(){ const r = uh0.apply(this, arguments); if (!S.attract) HUD88.safe(() => HUD88.renderFeed(), 'rfeed'); return r; }; }
// ---------------------------------------------------------------- подсказки
{ const sh0 = HINTS.show; HINTS.show = function(id, text, kbd, act, force){
    const H = HUD88;
    if (!force && !S.attract){
      if (H.seen[id]){ H.stats.tipSeen++; this.shown[id] = 99; return false; }
      if (H.combat() && !H.CBT.has(id)){ H.stats.tipCombat++; this.lastT = S.rtime - 10; return false; }
    }
    const s = H.safe(() => H.short(id), 'short'); if (s){ text = s; kbd = []; }
    const r = sh0.call(this, id, text, kbd, act, force);
    if (r){ if (this.cur) this.cur.until = min(this.cur.until, S.rtime + 6); if (!force){ H.seen[id] = 1; H.saveSeen(); H.stats.tipShown++; } }
    return r;
  }; }
if (typeof V87M !== 'undefined'){ const h0 = V87M.hint; V87M.hint = function(){
    if (HUD88.seen.v87mode){ this.hintM = S.match87; return; }
    if (this.hintM === S.match87 || S.attract) return;
    HUD88.seen.v87mode = 1; HUD88.saveSeen(); return h0.apply(this, arguments); }; }
// подпись клавиши режима (Настройки → Управление) — под лестницу v8.7
BIND_NAMES.rts = ['Режим по кругу: Стратег → Командир → Шутер', 'Mode cycle: Strategist → Commander → Shooter', 'Chế độ: Chiến lược → Chỉ huy → Bắn súng'];
// ---------------------------------------------------------------- ввод, кадр, урок
addEventListener('keydown', e => { if (HUD88.safe(() => HUD88.key(e), 'key')){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0.apply(this, arguments); HUD88.safe(() => HUD88.frame(), 'frame'); }; }
{ const nm0 = newMatch; newMatch = function(){ HUD88.safe(() => HUD88.hideIntro(), 'nm'); return nm0.apply(this, arguments); }; }
if (typeof T72 !== 'undefined' && T72.render){ const r0 = T72.render; T72.render = function(){ const r = r0.apply(this, arguments); HUD88.safe(() => HUD88.t72fix(), 't72'); return r; }; }
if (SET.clean88 === undefined) SET.clean88 = false;
// ---------------------------------------------------------------- меню: ☰ телефона, пауза, Настройки
if (typeof M67 !== 'undefined' && M67.fillSheet){ const fs0 = M67.fillSheet; M67.fillSheet = function(){
    const r = fs0.apply(this, arguments);
    HUD88.safe(() => {
      const sh = this.sheet; if (!sh) return;
      let row = sh.querySelector('#m88row');
      if (!row){
        row = document.createElement('div'); row.id = 'm88row'; const hd = sh.querySelector('.hd'); if (hd) hd.after(row); else sh.prepend(row);
        const go = e => { const b = e.target.closest && e.target.closest('[data-m88]'); if (!b) return; e.preventDefault(); e.stopPropagation();
          if (e.type === 'click' && performance.now() - (row._t || -1e9) < 700) return; if (e.type === 'touchstart') row._t = performance.now();
          AU.init(); emit('ui', { kind: 'ok' }); this.toggleSheet(false);
          if (b.dataset.m88 === 'clean') HUD88.setClean(); else HUD88.showIntro(12); };
        row.addEventListener('touchstart', go, { passive: false }); row.addEventListener('click', go);
      }
      const L = HUD88.L, on = HUD88.isClean();
      row.innerHTML = `<button data-m88="clean" class="${on ? 'on' : ''}">▢ ${L('Чистый экран', 'Clean screen')}: <b>${on ? L('ВКЛ', 'ON') : L('ВЫКЛ', 'OFF')}</b></button><button data-m88="help">? ${L('Управление', 'Controls')}</button>`;
    }, 'sheet');
    return r;
  }; }
{ const lab = () => HUD88.L(`Чистый экран в бою (${HUD88.KEY}): прицел, здоровье, патроны, миникарта`, `Clean screen in battle (${HUD88.KEY}): crosshair, health, ammo, minimap`);
  const labPh = () => HUD88.L('Чистый экран в бою (прицел, здоровье, патроны, миникарта)', 'Clean screen in battle (crosshair, health, ammo, minimap)');
  const hs0 = MENU.html_settings; MENU.html_settings = function(){
    const h = hs0.apply(this, arguments); if (typeof V74 === 'undefined') return h;
    const re = /(<button class="tog[^"]*" data-p74tog="hint76">[^<]*<\/button><\/div>)/;
    return re.test(h) ? h.replace(re, '$1' + V74.togBtn('clean88', lab(), false)) : h; };
  if (typeof P71M !== 'undefined' && P71M.sec){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_game' && typeof V74 !== 'undefined') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + V74.togBtn('clean88', labPh(), true)); return h; }; }
  const hp0 = MENU.html_pause; MENU.html_pause = function(){
    const h = hp0.apply(this, arguments); if (HUD88.ph()) return h;
    const add = this.btn('help88', '? ' + HUD88.L('Управление коротко', 'Controls in short') + ' · F1') + (typeof V74 !== 'undefined' ? V74.togBtn('clean88', lab(), false) : '');
    const i = h.indexOf('<button id="m_settings"'); return i >= 0 ? h.slice(0, i) + add + h.slice(i) : h; };
  const w0 = MENU.wire; MENU.wire = function(name){ const r = w0.apply(this, arguments);
    const b = $('m_help88'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); MENU.close(); setTimeout(() => HUD88.showIntro(12), 50); };
    return r; }; }
// ---------------------------------------------------------------- стили
(function(){ const st = document.createElement('style'); st.id = 'hud88css'; st.textContent = `
  #feed{font-size:12px;line-height:1.35}
  body:not(.touch) #feed{bottom:196px;max-width:min(34vw,440px)}
  #feed .x88n{font-style:normal;opacity:.7;font-size:.9em}
  body:not(.touch) #s78{bottom:162px}
  body:not(.touch) #hint{max-width:440px;font-size:12.5px;padding:5px 11px;line-height:1.3}
  body:not(.touch).fps88 #hud > .hb:nth-child(2), body:not(.touch).fps88 #hud > .hb:nth-child(n+5){display:none}
  body.obj88 #f76hint:not(.warn){display:none!important}
  #intro88{position:fixed;right:12px;top:76px;z-index:16;display:none;width:330px;padding:7px 10px 6px;border-radius:9px;pointer-events:auto;
    background:rgba(8,12,18,.84);border:1px solid rgba(214,198,154,.4);color:#e6e0cc;font:500 12px/1.4 "Exo 2",sans-serif;transition:opacity 1.1s;box-shadow:0 4px 16px rgba(0,0,0,.45)}
  #intro88.on{display:block;opacity:1} #intro88.fade{opacity:0}
  #intro88 b{display:block;font:700 10px "Exo 2";letter-spacing:.18em;color:#d6c69a;text-transform:uppercase;margin-bottom:3px}
  #intro88 p{margin:2px 0} #intro88 kbd{font:700 10.5px "Exo 2";padding:0 4px;border-radius:3px;background:rgba(255,255,255,.13);color:#ffd27a}
  #intro88 .x88{all:unset;position:absolute;right:4px;top:3px;cursor:pointer;color:#b9b19a;font:700 13px "Exo 2";padding:2px 6px}
  #intro88 .x88:hover{color:#fff}
  body.touch #intro88{right:auto;left:calc(var(--sl,0px) + 80px);top:calc(var(--st,0px) + 108px);width:min(300px,40vw);font-size:11px;line-height:1.3}
  body.intro88on #f76hint{display:none!important}
  body.touch #intro88 .x88{width:30px;height:28px;text-align:center;font-size:16px}
  #t88{position:fixed;left:12px;bottom:12px;z-index:40;display:none;padding:4px 10px;border-radius:7px;background:rgba(8,12,18,.85);border:1px solid rgba(214,198,154,.45);color:#f0e8d0;font:600 12px "Exo 2",sans-serif;pointer-events:none}
  #t88.on{display:block} body.touch #t88{left:50%;transform:translateX(-50%);bottom:auto;top:calc(var(--st,0px) + 52px)}
  #m88row{display:flex;gap:6px;margin:6px 0 2px}
  #touch #m67sheet #m88row button{flex:1;height:40px;border-radius:9px;font:600 12px "Exo 2";padding:0 6px}
  #touch #m67sheet #m88row button.on{border-color:#ffd27a;color:#ffd27a}
  /* чистый экран: остаются прицел, здоровье/патроны, миникарта (и кнопки телефона) */
  body.clean88 #hud, body.clean88 #obj, body.clean88 #sq, body.clean88 #feed, body.clean88 #help, body.clean88 #squadp, body.clean88 #who73,
  body.clean88 #f76hint, body.clean88 #hint, body.clean88 #dbg, body.clean88 #rankLbl, body.clean88 #xpBar, body.clean88 #banner, body.clean88 #intro88,
  body.clean88 .m73x, body.clean88 #uxtoasts{display:none!important}
  body.clean88:not(.touch) #uxmode, body.clean88:not(.touch) #s78{display:none!important}
  /* портрет телефона: приказ и подсказка — под верхним рядом кнопок, «Ты:» скрыт (не помещается) */
  @media (orientation:portrait){
    body.touch.m64fps #obj{left:112px!important;right:auto!important;top:calc(var(--st,0px) + 62px)!important;transform:none!important;max-width:calc(100vw - 210px)!important}
    body.touch.m64fps #who73{display:none!important}
    body.touch.m64fps #hint{left:112px!important;right:auto!important;transform:none!important;top:calc(var(--st,0px) + 114px)!important;box-sizing:border-box;max-width:calc(100vw - 186px)!important}
    body.touch #intro88{left:10px;right:10px;width:auto;top:calc(var(--st,0px) + 176px)}
    body.touch.m64fps #feed{max-width:52vw!important}
  }
`; document.head.appendChild(st); })();
