// =====================================================================
//  v8.17 — T22: ПРОСТАЯ СТРАТЕГИЯ ТЕЛЕФОНА — «Удары» и карточка отряда
//   • кнопка ✺ под «▶ В бой» открывает панель ударов: кнопки из POWERS (цена КО,
//     перезарядка/доступность по uiExplain); тап по удару — штатный startPower,
//     дальше обычный каст тапом по карте (⟳ ковровой из v8.1 работает);
//     пока летит прицел, ✺ становится ✕ — тап отменяет каст
//   • карточка отряда: выделенные в простом режиме отряды/техника — имя, HP, состояние,
//     кнопки «▶ В бой» (вселение), «↩ К базе» (отступление), «✕» (снять выделение);
//     выделение держится и при одиночном тапе по отряду/технике в панели групп v8.0
//     (раньше держалось только от долгого нажатия «выбрать всех», v8.4)
//  Хуки — только обёртки: G80.pick, M74.frame. Выключить: ?t22=0.
// =====================================================================
const T22 = {
  on: (() => { try { return new URLSearchParams(location.search).get('t22') !== '0'; } catch (e){ return true; } })(),
  err: {}, open: false, lastF: 0, plKeys: '', cardKey: '',
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('t22 ' + tag, e); } } },
  L(ru, en){ return tr(ru, en, en, en); },
  // ---------------------------------------------------------------- DOM
  ensure(){
    if (this.btn) return;
    const tap = (el, fn) => {
      el.addEventListener('touchstart', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
      el.addEventListener('touchend', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); fn(); }, { passive: false });
      el.addEventListener('click', e => { e.stopPropagation(); fn(); });
    };
    const btn = this.btn = document.createElement('button'); btn.id = 't22pw'; btn.style.display = 'none';
    document.body.appendChild(btn); tap(btn, () => this.safe(() => this.onBtn(), 'btn'));
    const pl = this.pl = document.createElement('div'); pl.id = 't22pl'; pl.style.display = 'none';
    document.body.appendChild(pl);
    pl.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    pl.addEventListener('click', e => e.stopPropagation());
    const card = this.card = document.createElement('div'); card.id = 't22card'; card.style.display = 'none';
    document.body.appendChild(card);
    card.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    card.addEventListener('click', e => e.stopPropagation());
  },
  onBtn(){
    AU.init();
    if (S.cast){ S.cast = null; feed(this.L('Прицел удара отменён', 'Strike targeting cancelled'), '#9cf'); return; }
    this.open = !this.open; this.plKeys = '';
    if (typeof M71 !== 'undefined' && M71.haptic) M71.haptic(8);
  },
  pick(k){
    if (S.cast && S.cast.kind === 'power' && S.cast.key === k){ S.cast = null; return; }
    this.open = false;
    startPower(k);
  },
  q(s){ return document.querySelector(s); },
  visR(sel){ const e = this.q(sel); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (!r.width || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return null; return r; },
  // кнопка — под «▶ В бой»; в режиме «Командир» (m74go скрыт) — под чипом «📡 N КО»; иначе у левого края
  anchor(){
    const go = this.visR('#m74go'); if (go) return { x: go.left, y: go.bottom + 6 };
    const hd = this.visR('#s78 .hd'); if (hd) return { x: hd.left, y: hd.bottom + 6 };
    return { x: 8 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sl')) || 0), y: 96 };
  },
  // ---------------------------------------------------------------- панель ударов (скелет строим на открытии, живые значения — каждый кадр)
  renderPanel(){
    let h = '<div class="t22t">' + this.L('✺ Удары — выбери удар, затем тапни цель на карте', '✺ Powers — pick a strike, then tap the target on the map') + '</div><div class="row">';
    for (const k in POWERS){
      const P = POWERS[k];
      h += `<button class="pw" data-t22="${k}"><i>${P.icon}</i><b>${uixEsc(N2(P.n))}</b><em>${P.cost} ${this.L('КО', 'CP')}</em><small></small><s><u></u></s></button>`;
    }
    this.pl.innerHTML = h + '</div>';
    this.pl.querySelectorAll('[data-t22]').forEach(b => {
      const go = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); this.safe(() => this.pick(b.dataset.t22), 'pick'); };
      b.addEventListener('touchstart', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
      b.addEventListener('touchend', go, { passive: false });
      b.addEventListener('click', go);
    });
    this.plKeys = Object.keys(POWERS).join('|') + '#' + LANG.cur;
  },
  updatePanel(){
    this.pl.querySelectorAll('[data-t22]').forEach(b => {
      const k = b.dataset.t22, P = POWERS[k], x = uiExplain('power:' + k), left = powerLeft(0, k);
      const cur = !!(S.cast && S.cast.kind === 'power' && S.cast.key === k);
      b.classList.toggle('off', !x.ok && !cur);
      b.classList.toggle('cur', cur);
      const st = cur ? this.L('тапни цель', 'tap the target') : !x.ok ? (x.short || '') : '';
      const sm = b.querySelector('small'); if (sm.textContent !== st) sm.textContent = st;
      const u = b.querySelector('s u'), w = Math.round(clamp(x.progress || 0, 0, 1) * 100) + '%';
      if (u.style.width !== w) u.style.width = w;
    });
  },
  // ---------------------------------------------------------------- карточка отряда
  renderCard(gs){
    let h = '';
    gs.forEach((g, i) => {
      h += `<button class="sq" data-t22g="${i}"><i>${isSquad(g) ? '◆' : '■'}</i><span><b>${uixEsc(groupLabel(g))}</b><small></small></span><s><u></u></s></button>`;
    });
    h += `<div class="t22c"><button class="go" data-t22a="poss">▶ ${this.L('В бой', 'To battle')}</button><button class="rt" data-t22a="retreat">↩ ${this.L('К базе', 'To base')}</button><button class="x" data-t22a="clear">✕</button></div>`;
    this.card.innerHTML = h;
    this.card.querySelectorAll('[data-t22g]').forEach(b => {
      const f = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); const g = gs[+b.dataset.t22g]; const p = g && leaderPos(g); if (p) flyCamTo(p); };
      b.addEventListener('click', f); b.addEventListener('touchend', f, { passive: false });
      b.addEventListener('touchstart', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
    });
    this.card.querySelectorAll('[data-t22a]').forEach(b => {
      const f = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); this.safe(() => {
        const a = b.dataset.t22a;
        if (a === 'poss'){ enterFPS(); HINTS.used('possess'); }
        else if (a === 'retreat') orderRetreat();
        else { S.sel.clear(); if (typeof V84 !== 'undefined') V84.keep = null; }
      }, 'card'); };
      b.addEventListener('click', f); b.addEventListener('touchend', f, { passive: false });
      b.addEventListener('touchstart', e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
    });
    this.cardKey = gs.map(g => uixId(g)).join('|');
  },
  updateCard(gs){
    const rows = this.card.querySelectorAll('[data-t22g]');
    gs.forEach((g, i) => {
      const b = rows[i]; if (!b) return;
      const hp = groupHP(g), st = typeof r61State === 'function' ? r61State(g) : ['idle', ''];
      const sm = b.querySelector('small'), t = st[1] + ' · ' + Math.round(hp * 100) + '%';
      if (sm.textContent !== t) sm.textContent = t;
      const u = b.querySelector('s u'), w = Math.round(clamp(hp, 0, 1) * 100) + '%';
      if (u.style.width !== w) u.style.width = w;
    });
  },
  // ---------------------------------------------------------------- кадр
  frame(dt){
    if (!this.on || typeof M74 === 'undefined' || !M74.simple() || MENU.isOpen() || S.over || S.place){ if (this.btn) this.hideAll(); return; }
    this.ensure();
    const casting = !!(S.cast && S.cast.kind === 'power');
    // позиция кнопки — под якорём (с проверкой видимости)
    const a = this.anchor();
    if (a){
      this.btn.style.display = 'flex';
      this.btn.style.left = a.x + 'px';
      this.btn.style.top = a.y + 'px';
    } else this.btn.style.display = 'none';
    const cmd = S.teams[0].cmd;
    const bh = '<b>✺</b><small>' + (casting ? '✕' : Math.floor(cmd) + ' ' + this.L('КО', 'CP')) + '</small>';
    if (this.btn._h !== bh){ this.btn._h = bh; this.btn.innerHTML = bh; }
    this.btn.classList.toggle('cast', casting);
    // панель ударов — над нижней панелью стройки
    if (this.open && !casting){
      if (this.plKeys !== Object.keys(POWERS).join('|') + '#' + LANG.cur) this.renderPanel();
      const mb = document.getElementById('m74B'), mr = mb && getComputedStyle(mb).display !== 'none' ? mb.getBoundingClientRect() : null;
      this.pl.style.bottom = (mr && mr.width ? innerHeight - mr.top + 4 : 96) + 'px';
      this.pl.style.display = 'block';
      this.safe(() => this.updatePanel(), 'upl');
    } else this.pl.style.display = 'none';
    // карточка отряда — над нижней панелью (не показываем во время каста и при открытой панели ударов)
    const gs = selGroups().filter(g => g.cls !== 'builder' && groupAlive(g));
    if (gs.length && !casting && !this.open){
      if (this.cardKey !== gs.map(g => uixId(g)).join('|')) this.renderCard(gs);
      const mb = document.getElementById('m74B'), mr = mb && getComputedStyle(mb).display !== 'none' ? mb.getBoundingClientRect() : null;
      this.card.style.bottom = (mr && mr.width ? innerHeight - mr.top + 4 : 96) + 'px';
      this.card.style.display = 'flex';
      this.safe(() => this.updateCard(gs), 'ucard');
    } else this.card.style.display = 'none';
  },
  hideAll(){
    this.btn.style.display = 'none';
    this.pl.style.display = 'none';
    this.card.style.display = 'none';
  },
};
// ---------------------------------------------------------------- обёртки
if (T22.on && typeof TOUCH !== 'undefined' && TOUCH.on){
  // простая стратегия: одиночный тап по отряду/технике в панели групп держит выделение (карточка видна)
  if (typeof G80 !== 'undefined' && typeof V84 !== 'undefined'){
    const pk0 = G80.pick;
    G80.pick = function(k, x, add){
      const r = pk0.apply(this, arguments);
      T22.safe(() => { if ((k === 'sq' || k === 'veh') && this.m74()) V84.keep = new Set(selGroups().filter(g => g.cls !== 'builder' && groupAlive(g))); }, 'keep');
      return r;
    };
  }
  { const fr0 = M74.frame;
    M74.frame = function(dt){
      const r = fr0.apply(this, arguments);
      const now = performance.now();
      if (now - T22.lastF >= 200){ T22.lastF = now; T22.safe(() => T22.frame(dt || 0.016), 'frame'); }
      return r;
    }; }
}
// ---------------------------------------------------------------- стили
(function(){ const st = document.createElement('style'); st.id = 't22css'; st.textContent = `
  #t22pw{display:none;position:fixed;z-index:25;align-items:center;gap:5px;height:34px;padding:0 10px;border-radius:9px;
    background:rgba(10,12,14,.72);border:1.5px solid rgba(214,198,154,.5);color:#f0e8d0;font:700 14px "Exo 2",sans-serif;pointer-events:auto;touch-action:manipulation}
  #t22pw b{color:#ffd27a} #t22pw small{font-size:10px;color:#9fdcff;letter-spacing:.05em}
  #t22pw.cast{border-color:#ff8a70;color:#ffb0a0;background:rgba(70,20,12,.78)}
  #t22pw.cast b{color:#ff8a70}
  #t22pl{display:none;position:fixed;left:50%;transform:translateX(-50%);z-index:25;width:min(96vw,720px);box-sizing:border-box;
    background:rgba(10,11,12,.9);border:1px solid rgba(214,198,154,.4);border-radius:10px;padding:5px 7px;pointer-events:auto;touch-action:manipulation}
  #t22pl .t22t{font:600 10.5px "Exo 2",sans-serif;color:#e8dcb8;text-align:center;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #t22pl .row{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;max-height:40vh;overflow-y:auto;scrollbar-width:none;padding-bottom:1px}
  #t22pl .pw{position:relative;flex:none;width:72px;height:62px;padding:3px 2px;border-radius:8px;background:rgba(10,12,14,.75);
    border:1px solid rgba(214,198,154,.4);color:#f0e8d0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-family:"Exo 2",sans-serif}
  #t22pl .pw i{font-style:normal;font-size:17px;color:#ffd27a}
  #t22pl .pw b{font-size:9px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:68px}
  #t22pl .pw em{font-style:normal;font-size:9px;color:#9fdcff}
  #t22pl .pw small{position:absolute;left:1px;right:1px;bottom:11px;font-size:8.5px;color:#ffb0a0;white-space:nowrap;overflow:hidden;background:rgba(10,12,14,.85)}
  #t22pl .pw s{position:absolute;left:3px;right:3px;bottom:2px;height:2px;background:rgba(255,255,255,.1);text-decoration:none}
  #t22pl .pw s u{display:block;height:100%;background:#ffd27a}
  #t22pl .pw.off{opacity:.55} #t22pl .pw.cur{border-color:#8fffaa;background:rgba(40,90,55,.7)}
  #t22card{display:none;position:fixed;left:50%;transform:translateX(-50%);z-index:24;max-width:min(96vw,560px);box-sizing:border-box;
    background:rgba(10,11,12,.88);border:1px solid rgba(214,198,154,.4);border-radius:10px;padding:5px 7px;pointer-events:auto;touch-action:manipulation;
    flex-direction:column;gap:3px}
  #t22card .sq{position:relative;display:flex;align-items:center;gap:6px;min-width:200px;max-width:100%;padding:4px 6px 7px;border-radius:7px;
    background:rgba(10,12,14,.7);border:1px solid rgba(214,198,154,.3);color:#f0e8d0;text-align:left;font-family:"Exo 2",sans-serif;overflow:hidden}
  #t22card .sq i{font-style:normal;font-size:15px;color:#ffd27a}
  #t22card .sq span{display:flex;flex-direction:column;min-width:0;flex:1}
  #t22card .sq b{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #t22card .sq small{font-size:9.5px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #t22card .sq s{position:absolute;left:3px;right:3px;bottom:2px;height:2px;background:rgba(255,255,255,.1);text-decoration:none}
  #t22card .sq s u{display:block;height:100%;background:#8fd18f}
  #t22card .t22c{display:flex;gap:5px;justify-content:center}
  #t22card .t22c button{height:32px;padding:0 12px;border-radius:8px;border:1px solid rgba(214,198,154,.45);background:rgba(40,38,30,.8);
    color:#f0e8d0;font:700 12px "Exo 2",sans-serif;pointer-events:auto;touch-action:manipulation}
  #t22card .t22c .go{border-color:#8fffaa;background:rgba(40,90,55,.75)}
  #t22card .t22c .x{padding:0 9px}
  body.clean88 #t22pw, body.clean88 #t22pl, body.clean88 #t22card, body.u8eye.u8eyeok #t22pw, body.u8eye.u8eyeok #t22pl, body.u8eye.u8eyeok #t22card{display:none !important}
`; document.head.appendChild(st); })();
