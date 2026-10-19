// =====================================================================
//  v7.0 — БОЙ: стартовый состав, «свой порядок» вселения, система промахов, падения от взрывов.
//  1) ROSTER70: в начале матча у каждой стороны на базе — по одному каждого типа (десант, снайпер,
//     разведчик, дрон, рейдер, РСЗО, миномёт; штурмовые отряды с пулемётчиком/медиком и танк были и раньше).
//  2) PRIO70: «✱ Авто» / «☑ Свой порядок» — у каждого класса уникальный номер 1…N (случайно при включении),
//     ▲▼ — обмен с соседним номером, клик по классу — сделать первым, ✕ — никогда. После гибели и по X —
//     ближайший к бою боец класса №1, нет такого — №2 и т. д. Хранится в localStorage (pm_prio70).
//  3) MISS70: разброс ботов растёт с дальностью, движением стрелка и цели, укрытием, подавлением;
//     по игроку — «киношные» промахи: пули свистят у головы, бьют в землю и укрытие рядом (пыль, рикошет).
//  4) KD70: взрывы сбивают с ног — лёгкий вздрог / на колено / с ног с подъёмом ~1 с; у игрока — короткий
//     крен и «приседание» камеры (без долгой тряски) и приглушённый звук.
// =====================================================================
const V70 = { steps: [], last: 0 };
{
  const up0 = update;
  update = function(rdt){
    up0(rdt);
    if (S.paused) return;
    const dt = clamp(S.time - V70.last, 0, 0.1); V70.last = S.time;
    for (const f of V70.steps){ try { f(dt, rdt); } catch (e){ if (!V70.errShown){ V70.errShown = true; console.warn('v7.0 step:', e); } } }
  };
  const nm0 = newMatch;
  newMatch = function(opts){ const r = nm0(opts); V70.last = S.time; return r; };
}
// ---------------------------------------------------------------- 1. стартовый состав
const ROSTER70 = {
  spawn(t){
    const b = BASES[t], ta = anyTangent(b), tb = cross(b, ta);
    const at = (ang, m) => norm(add(mul(b, RM), add(mul(ta, cos(ang) * m), mul(tb, sin(ang) * m))));
    const free = (ang, m, r) => {   // свободное место (без обломков и зданий)
      for (let k = 0; k < 10; k++){ const d = at(ang + k * 0.11 * (k % 2 ? 1 : -1), m + k); const p = surfacePoint(d, 1.5); if (!propAt(p, r || 3) && !bldAt(p, r || 3) && !inShaft(p)) return d; }
      return at(ang, m);
    };
    const face = e => { e.fwd = tangent(sub(e.pos, mul(b, RM)), e.up); e.aim = e.fwd; };
    const made = [];
    const el = spawnSquad(t, true, surfacePoint(free(2.25, 34))); made.push(el);
    for (const [r, a] of [['heavy', 1.75], ['sniper', 2.85], ['scout', 3.35]]){ const sq = spawnSquad(t, false, surfacePoint(free(a, 30)), 1, [r]); sq.solo = r; made.push(sq); }
    const dr = makeDrone(add(surfacePoint(free(3.9, 30)), mul(b, 7)), t); face(dr); made.push(dr);
    for (const [vk, a] of [['raider', 4.45], ['mlrs', 5.05], ['cat', 5.65]]){
      const v = V2.make(surfacePoint(free(a, 38, 4), 1.5), t, vk); face(v); made.push(v);
    }
    for (const g of made){ g.ros70 = true; for (const u of groupUnits(g)){ u.ros70 = true; face(u); } }
    return made;
  },
  off: false,
  start(){
    if (S.attract || this.off) return;
    ROSTER70.spawn(0); ROSTER70.spawn(1);
    for (const T of S.teams) T.skyT = max(T.skyT || 0, 150 + random() * 60);   // десант из стартового состава — не в первую же минуту
    S.ros70 = true;
    feed(tr('На базе — вся армия по одному: десант, пулемётчик, снайпер, разведчик, дрон, рейдер, РСЗО и миномёт. Вселяйся в любого (Tab → выдели → ▶ Вселиться).',
            'Your whole army is at the base, one of each: sky troopers, heavy gunner, sniper, scout, drone, raider, MLRS and mortar. Possess anyone (Tab → select → ▶ Possess).',
            'Cả quân đội ở căn cứ, mỗi loại một: lính đổ bộ, xạ thủ súng máy, bắn tỉa, trinh sát, drone, raider, MLRS và súng cối. Nhập vai bất kỳ ai (Tab → chọn → ▶ Nhập vai).',
            'כל הצבא בבסיס, אחד מכל סוג: צנחנים, מקלען, צלף, סייר, רחפן, פושט, משגר רקטות ומרגמה. השתלט על כל אחד (Tab ← בחר ← ▶ השתלט).'), '#9cf');
  },
};
{
  const ng0 = MENU.newGame;
  MENU.newGame = function(tutorial){ const r = ng0.apply(this, arguments); if (tutorial !== true && !S.attract){ try { ROSTER70.start(); buildSidebar(); } catch (e){ console.warn('roster70', e); } } return r; };
}
// ---------------------------------------------------------------- 2. свой порядок вселения
const P70_CLS = ['assault', 'heavy', 'rocket', 'sniper', 'medic', 'scout', 'tank', 'raider', 'mlrs', 'cat', 'drone'];
const PRIO70 = {
  on: false, rank: {}, never: {}, hintT: -99,
  load(){
    try { const o = JSON.parse(localStorage.getItem('pm_prio70') || 'null'); if (o && typeof o === 'object'){ this.on = !!o.on; this.rank = o.rank || {}; this.never = o.never || {}; } } catch (e){}
    this.fix();
  },
  save(){ try { localStorage.setItem('pm_prio70', JSON.stringify({ on: this.on, rank: this.rank, never: this.never })); } catch (e){} },
  fix(){   // номера 1…N без повторов
    const L = P70_CLS.slice().sort((a, b) => ((this.rank[a] | 0) || 99) - ((this.rank[b] | 0) || 99) || P70_CLS.indexOf(a) - P70_CLS.indexOf(b));
    L.forEach((c, i) => { this.rank[c] = i + 1; });
    for (const k in this.never) if (!P70_CLS.includes(k) || !this.never[k]) delete this.never[k];
  },
  shuffle(){
    const a = P70_CLS.slice();
    for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const q = a[i]; a[i] = a[j]; a[j] = q; }
    a.forEach((c, i) => { this.rank[c] = i + 1; });
  },
  N(){ return P70_CLS.length; },
  order(){ return P70_CLS.slice().sort((a, b) => this.rank[a] - this.rank[b]); },
  setOn(v){
    this.on = !!v; if (this.on) this.shuffle(); this.save();
    if (this.on){ SET.prefCls = 'any'; MENU.save(); }
    feed(this.on ? tr('Свой порядок вселения: ВКЛ — номера перемешаны, 1 — главный. ▲▼ — поменять, ✕ — никогда.', 'Custom possession order: ON — numbers shuffled, 1 is the top. ▲▼ to swap, ✕ for never.', 'Thứ tự nhập vai riêng: BẬT — số đã xáo, 1 là cao nhất. ▲▼ để đổi, ✕ — không bao giờ.', 'סדר השתלטות אישי: מופעל — המספרים עורבבו, 1 הוא הראשון. ▲▼ להחלפה, ✕ — אף פעם.')
                 : tr('Вселение: Авто — ближайший к бою боец', 'Possession: Auto — the unit closest to the fight', 'Nhập vai: Tự động — đơn vị gần trận nhất', 'השתלטות: אוטומטי — הלוחם הקרוב ביותר לקרב'), '#9cf');
  },
  move(c, d){
    const r = this.rank[c], r2 = r + d; if (!r || r2 < 1 || r2 > this.N()) return;
    const o = P70_CLS.find(x => this.rank[x] === r2); this.rank[o] = r; this.rank[c] = r2; this.save();
  },
  top(c){ const r = this.rank[c]; for (const x of P70_CLS) if (this.rank[x] < r) this.rank[x]++; this.rank[c] = 1; this.save(); },
  toggleNever(c){ if (this.never[c]) delete this.never[c]; else this.never[c] = true; this.save(); },
  clsOf(e){ if (!e) return null; if (e.cls === 'inf') return e.role || 'assault'; if (e.cls === 'tank') return e.vk || 'tank'; if (e.cls === 'drone') return 'drone'; return null; },
  name(c){
    if (ROLES[c]) return N2(ROLES[c].n);
    if (c === 'tank') return tr('Танк', 'Tank', 'Xe tăng', 'טנק');
    if (c === 'drone') return tr('Дрон', 'Drone', 'Drone', 'רחפן');
    if (VK[c]) return V2.cname(c, 0);
    return c;
  },
  icon(c){ return ROLES[c] ? ROLES[c].icon : c === 'tank' ? '■' : c === 'drone' ? '▲' : VK[c] ? VK[c].icon : '•'; },
  ok(c){ return !this.never[c]; },
  // все свои живые тела класса c
  bodies(c, skip){
    const L = c === 'drone' ? S.drones : (c === 'tank' || VK[c]) ? S.vehicles : S.units;
    return L.filter(u => u.alive && u.team === 0 && !u.parked && u !== skip && this.clsOf(u) === c);
  },
  pick(skip){
    for (const c of this.order()){
      if (!this.ok(c)) continue;
      let best = null, bd = 1e9;
      for (const u of this.bodies(c, skip)){ const d = actionDist(u, 0) - (u.cls === 'tank' ? 15 : 0); if (d < bd){ bd = d; best = u; } }
      if (best) return { u: best, c, r: this.rank[c] };
    }
    return { u: null };
  },
  // список для X (быстрая смена): по номеру класса, затем ближе к бою; «никогда» — не попадает
  cands(L){
    const me = ctrlEntity(), out = [];
    for (const sq of S.squads){
      if (sq.team !== 0) continue;
      let best = null, bk = 1e9;
      for (const u of sq.units){ if (!u.alive || u.parked || u === me) continue; const c = this.clsOf(u); if (!this.ok(c)) continue; const k = this.rank[c] * 1e5 + actionDist(u, 0); if (k < bk){ bk = k; best = u; } }
      if (best){ const c = this.clsOf(best); out.push({ e: best, d: actionDist(best, 0), r: this.rank[c], label: groupLabel(sq) + ' · ' + this.icon(c) + ' ' + this.name(c), kind: 'inf' }); }
    }
    for (const v of S.vehicles){ if (!v.alive || v.team !== 0 || v === me) continue; const c = this.clsOf(v); if (!this.ok(c)) continue; out.push({ e: v, d: actionDist(v, 0), r: this.rank[c], label: groupLabel(v), kind: 'tank' }); }
    for (const d of S.drones){ if (!d.alive || d.team !== 0 || d === me || !this.ok('drone')) continue; out.push({ e: d, d: actionDist(d, 0), r: this.rank.drone, label: groupLabel(d), kind: 'drone' }); }
    out.sort((a, b) => a.r - b.r || a.d - b.d);
    for (const o of L) if (o.kind === 'bld') out.push(o);
    return out;
  },
  // ---- интерфейс (пауза, настройки, карточка гибели, меню ☰ на телефоне)
  html(mode){
    const N = this.N(), on = this.on;
    const L = (ru, en, vi, he) => uixEsc(tr(ru, en, vi, he));
    let h = `<div class="p70w p70-${mode} ${on ? 'on' : ''}" data-mode="${mode}">`;
    h += `<div class="p70h"><button class="p70auto ${on ? '' : 'cur'}" data-p70="auto" title="${L('Ближайший к бою боец, как раньше', 'The unit closest to the fight, as before', 'Đơn vị gần trận nhất', 'הלוחם הקרוב ביותר לקרב')}">✱ ${L('Авто', 'Auto', 'Tự động', 'אוטומטי')}</button>` +
         `<button class="p70tg ${on ? 'on' : ''}" data-p70="tog"><i>${on ? '☑' : '☐'}</i> ${L('Свой порядок', 'Custom order', 'Thứ tự riêng', 'סדר אישי')}</button></div>`;
    if (mode === 'menu'){   // пауза и настройки — компактно: порядок цветными номерами и кнопка «Настроить»
      if (on) h += `<div class="p70chips">${this.order().map(c => { const k = (this.rank[c] - 1) / (N - 1); return `<span class="${this.never[c] ? 'nv' : ''}" style="${this.col(k, true)}" title="${uixEsc(this.name(c))}"><b>${this.never[c] ? '✕' : this.rank[c]}</b>${this.icon(c)}</span>`; }).join('')}</div>`;
      h += `<button class="p70open" data-p70="open">⚙ ${L('Настроить порядок классов', 'Set up the class order', 'Chỉnh thứ tự lớp', 'הגדר את סדר הסוגים')} ▸</button></div>`;
      return h;
    }
    if (mode === 'card'){
      h += `<div class="p70chips">${this.order().map(c => { const k = (this.rank[c] - 1) / (N - 1); return `<span class="${this.never[c] ? 'nv' : ''}" style="${this.col(k, true)}"><b>${this.never[c] ? '✕' : this.rank[c]}</b>${this.icon(c)}</span>`; }).join('')}</div>`;
      h += `<small>${TOUCH.on ? L('☰ → «Вселение» — настроить', '☰ → "Possession" to set up', '☰ → “Nhập vai” để chỉnh', '☰ ← „השתלטות" להגדרה') : L('Esc → пауза — настроить порядок', 'Esc → pause to set the order', 'Esc → tạm dừng để chỉnh', 'Esc ← השהיה לסידור')}</small></div>`;
      return h;
    }
    h += `<div class="p70g">`;
    for (const c of P70_CLS){
      const r = this.rank[c], nv = !!this.never[c], k = (r - 1) / (N - 1);
      h += `<div class="p70c ${nv ? 'nv' : ''}"><button class="p70n" data-p70="top" data-c="${c}" style="${this.col(k)}" title="${L('Сделать первым', 'Make it number 1', 'Đặt lên số 1', 'הפוך לראשון')}"><b>${nv ? '✕' : r}</b><span>${this.icon(c)} ${uixEsc(this.name(c))}</span></button>` +
           `<button class="p70a" data-p70="up" data-c="${c}" title="${L('Выше (меньше номер)', 'Higher (smaller number)', 'Cao hơn', 'גבוה יותר')}">▲</button><button class="p70a" data-p70="dn" data-c="${c}" title="${L('Ниже', 'Lower', 'Thấp hơn', 'נמוך יותר')}">▼</button>` +
           `<button class="p70x ${nv ? 'on' : ''}" data-p70="nv" data-c="${c}" title="${L('Никогда не вселяться', 'Never possess', 'Không bao giờ', 'לעולם לא')}">✕</button></div>`;
    }
    h += `</div><small>${on ? L('1 — главный: после гибели и по X — ближайший к бою боец класса №1, нет такого — №2 и дальше. Тап/клик по классу — сделать первым, ▲▼ — поменяться с соседом, ✕ — никогда.',
                                  '1 is the top: after death and on X you take the unit of class #1 closest to the fight, if none — #2 and so on. Tap/click a class to make it #1, ▲▼ swap with a neighbour, ✕ — never.',
                                  '1 là cao nhất: khi chết và khi nhấn X — đơn vị lớp #1 gần trận nhất, không có — #2… Chạm lớp để đặt #1, ▲▼ đổi chỗ, ✕ — không bao giờ.',
                                  '1 הוא הראשון: אחרי מוות וב-X — הלוחם מסוג מס׳ 1 הקרוב לקרב, אם אין — מס׳ 2 וכן הלאה. לחיצה על סוג — הופך לראשון, ▲▼ — החלפה עם השכן, ✕ — אף פעם.')
                               : L('Авто — ближайший к бою боец. Включи «Свой порядок», чтобы решить, в кого вселяться первым.', 'Auto — the unit closest to the fight. Turn on "Custom order" to choose who comes first.', 'Tự động — đơn vị gần trận nhất. Bật “Thứ tự riêng” để chọn ai trước.', 'אוטומטי — הלוחם הקרוב לקרב. הפעל „סדר אישי" כדי לבחור מי ראשון.')}</small></div>`;
    return h;
  },
  // яркость по номеру: 1 — насыщенный зелёный, N — почти серый
  col(k, chip){
    const s = Math.round(82 * (1 - k) + 4), l = Math.round(16 + 12 * (1 - k)), lb = Math.round(34 + 30 * (1 - k)), lt = Math.round(62 + 30 * (1 - k));
    return `background:hsla(138,${s}%,${l}%,.92);border-color:hsl(138,${s}%,${lb}%);color:hsl(138,${Math.round(s * 0.6)}%,${lt}%)` + (chip ? '' : `;box-shadow:0 0 ${Math.round(10 * (1 - k))}px hsla(138,${s}%,50%,${(0.45 * (1 - k)).toFixed(2)})`);
  },
  refresh(){
    document.querySelectorAll('.p70w').forEach(el => { const m = el.dataset.mode; const t = document.createElement('div'); t.innerHTML = this.html(m); el.replaceWith(t.firstChild); });
    const dc = document.getElementById('dcard'); if (dc) dc._k = '';
  },
  act(t){
    const a = t.dataset.p70, c = t.dataset.c;
    AU.init();
    if (a === 'auto'){ if (this.on) this.setOn(false); }
    else if (a === 'tog') this.setOn(!this.on);
    else if (a === 'open'){ emit('ui', { kind: 'ok' }); MENU.show('p70', true); return; }
    else if (!this.on) return;
    else if (a === 'up') this.move(c, -1);
    else if (a === 'dn') this.move(c, +1);
    else if (a === 'top') this.top(c);
    else if (a === 'nv') this.toggleNever(c);
    emit('ui', { kind: 'ok' });
    this.refresh();
  },
  CSS: `.p70w{display:block;width:100%;font:600 12px "Exo 2",Consolas,sans-serif;color:#e8dcb8;text-align:left}
.p70w button{cursor:pointer;font:inherit;color:inherit;background:rgba(232,220,184,.07);border:1px solid rgba(232,220,184,.28);border-radius:4px;margin:0}
.p70h{display:flex;gap:6px;margin-bottom:6px}.p70auto,.p70tg{flex:1;padding:6px 8px}
.p70auto.cur{background:rgba(140,255,170,.22);border-color:#8fffaa;color:#c8ffd6;box-shadow:0 0 8px rgba(140,255,170,.35)}
.p70w.on .p70auto{opacity:.42;filter:grayscale(1)}.p70tg i{font-style:normal}.p70tg.on{border-color:#8fffaa;color:#8fffaa}
.p70g{display:grid;grid-template-columns:1fr 1fr;gap:4px}.p70c{display:flex;gap:2px;align-items:stretch;min-width:0}
.p70n{flex:1;display:flex;align-items:center;gap:6px;padding:3px 6px;text-align:left;min-width:0}
.p70n b{flex:none;min-width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(0,0,0,.38);font-size:12px}
.p70n span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.p70a,.p70x{flex:none;width:23px;padding:0;font-size:10px}
.p70w:not(.on) .p70g{opacity:.36;filter:grayscale(1);pointer-events:none}
.p70c.nv .p70n{filter:grayscale(1);opacity:.42;text-decoration:line-through}.p70x.on{color:#ff8a70;border-color:#ff8a70}
.p70w small{display:block;margin-top:5px;opacity:.7;font-weight:500;line-height:1.3;font-size:11px}
.p70chips{display:flex;flex-wrap:wrap;gap:3px;justify-content:center}.p70chips span{display:inline-flex;align-items:center;gap:3px;padding:2px 5px;border:1px solid;border-radius:3px;font-size:12px}
.p70chips span b{font-size:10px;opacity:.8}.p70chips span.nv{filter:grayscale(1);opacity:.4}
.p70-card .p70h{justify-content:center}.p70-card .p70auto,.p70-card .p70tg{flex:none;padding:3px 9px}.p70-card small{text-align:center}
#screen .row.p70row{display:block}
#screen .p70w button{font:600 12px "Exo 2",sans-serif;padding:5px 8px;text-align:left}#screen .p70w .p70auto,#screen .p70w .p70tg{padding:7px 10px;font-size:13px}
#screen .p70w .p70a,#screen .p70w .p70x{padding:0;width:28px;text-align:center}#screen .p70w .p70n{padding:4px 7px}
#screen .p70w .p70open{display:block;width:100%;margin-top:5px;text-align:center}#screen .p70-menu .p70chips{justify-content:flex-start;margin-top:2px}
#screen .mcol.p70col{max-width:min(700px,96vw);width:min(700px,96vw)}#screen .p70col .p70g{gap:5px}#screen .p70col .p70w small{font-size:12px}
body.touch #screen .p70w button{min-height:42px}body.touch #screen .p70w .p70a,body.touch #screen .p70w .p70x{width:40px}
body.touch .p70w button{min-height:40px}body.touch .p70a,body.touch .p70x{width:34px;font-size:12px}
#touch #m67sheet .p70w button{position:static;height:auto;min-height:44px;border-radius:8px;font:600 12.5px "Exo 2";padding:0 6px;width:auto}
#touch #m67sheet .p70w .p70a,#touch #m67sheet .p70w .p70x{width:40px;flex:none}
#touch #m67sheet .p70g{grid-template-columns:1fr}#touch #m67sheet .p70n{flex:1}
body.touch #dcard .p70w button{min-height:36px}`,
};
PRIO70.load();
MENU.html_p70 = function(){
  return `<div class="mcol p70col"><h2>${tr('ВСЕЛЕНИЕ', 'POSSESSION', 'NHẬP VAI', 'השתלטות')}</h2><p class="sub">${tr('В кого вселяться после гибели и по', 'Who to take after death and on', 'Chọn ai khi chết và khi nhấn', 'במי להשתלט אחרי מוות וב-')} ${TOUCH.on ? '⇆' : bk('switch')}</p>${PRIO70.html('screen')}${this.btn('back', tr('Назад', 'Back', 'Quay lại', 'חזרה'), 'big')}</div>`;
};
(function(){ const st = document.createElement('style'); st.textContent = PRIO70.CSS; document.head.appendChild(st); })();
// события: клик мышью и касание (без двойного срабатывания); у кнопок нет других обработчиков
{
  const T = { t0: null, at: -1e9 };
  const find = e => e.target && e.target.closest ? e.target.closest('[data-p70]') : null;
  document.addEventListener('click', e => { const t = find(e); if (!t) return; e.stopPropagation(); e.preventDefault(); if (performance.now() - T.at < 700) return; PRIO70.act(t); }, true);
  document.addEventListener('mousedown', e => { if (find(e)) e.stopPropagation(); }, true);
  document.addEventListener('touchstart', e => { const t = find(e); if (!t){ T.t0 = null; return; } const p = e.changedTouches[0]; T.t0 = { t, x: p.clientX, y: p.clientY }; e.stopPropagation(); }, { capture: true, passive: true });
  document.addEventListener('touchend', e => {
    const t = find(e); if (!t || !T.t0 || T.t0.t !== t) return;
    const p = e.changedTouches[0]; e.stopPropagation(); if (e.cancelable) e.preventDefault();
    if (Math.hypot(p.clientX - T.t0.x, p.clientY - T.t0.y) > 14) return;   // прокрутка, а не нажатие
    T.at = performance.now(); T.t0 = null; PRIO70.act(t);
  }, { capture: true, passive: false });
}
// выбор тела: после гибели (autoSwitch), Tab без выделения (enterFPS), X (switchUnit)
{
  const pick0 = FPS61.pick.bind(FPS61);
  FPS61.pick = function(){
    if (!PRIO70.on) return pick0();
    const me = ctrlEntity(), r = PRIO70.pick(me);
    if (r.u){
      if (S.rtime - PRIO70.hintT > 2 && !S.attract){ PRIO70.hintT = S.rtime; feed(tr(`Свой порядок: №${r.r} ${PRIO70.icon(r.c)} ${PRIO70.name(r.c)}`, `Custom order: #${r.r} ${PRIO70.icon(r.c)} ${PRIO70.name(r.c)}`, `Thứ tự riêng: #${r.r} ${PRIO70.icon(r.c)} ${PRIO70.name(r.c)}`, `סדר אישי: מס׳ ${r.r} ${PRIO70.icon(r.c)} ${PRIO70.name(r.c)}`), '#8fffaa'); }
      return { u: r.u, pref: true };
    }
    const near = nearestToAction(0);
    if (near && S.rtime - PRIO70.hintT > 2 && !S.attract){ PRIO70.hintT = S.rtime; feed(tr('Никого из твоего порядка нет — вселяюсь в ближайшего к бою', 'Nobody from your order is alive — taking the unit closest to the fight', 'Không còn ai trong thứ tự — chọn đơn vị gần trận nhất', 'אין אף אחד מהסדר שלך — לוקח את הקרוב לקרב'), '#ffd27a'); }
    return { u: near };
  };
  const sc0 = FPS61.sortCands.bind(FPS61);
  FPS61.sortCands = function(L){ return PRIO70.on ? PRIO70.cands(L) : sc0(L); };
  const pr0 = FPS61.prefRow.bind(FPS61);
  FPS61.prefRow0 = pr0;
  FPS61.prefRow = function(){ return `<div class="row p70row"><label>${tr('Вселение: в кого после гибели и по', 'Possession: who to take after death and on', 'Nhập vai: chọn ai khi chết và khi nhấn', 'השתלטות: במי אחרי מוות וב-')} ${bk('switch')}</label>${PRIO70.html('menu')}</div>`; };
  const key0 = FPS61.key.bind(FPS61);
  FPS61.key = function(e){
    if (PRIO70.on && S.mode === 'fps' && !S.over && !S.attract){
      if (actOf(e.code) === 'prefCls'){ feed(tr('Включён «Свой порядок» вселения — настройка в паузе (Esc)', '"Custom order" possession is on — set it up in the pause menu (Esc)', 'Đang bật “Thứ tự riêng” — chỉnh trong menu tạm dừng (Esc)', '„סדר אישי" פעיל — הגדרה בתפריט ההשהיה (Esc)'), '#9cf'); return true; }
      if (this.card && S.rtime - this.card.t < 5 && /^Digit[1-8]$/.test(e.code)) return false;
    }
    return key0(e);
  };
  // карточка после гибели: при «своём порядке» — его номера вместо одного класса
  const dc0 = FPS61.drawCard.bind(FPS61);
  FPS61.drawCard = function(g, W, H, cx){
    if (!PRIO70.on) return dc0(g, W, H, cx);
    let el = document.getElementById('dcard');
    const on = this.card && S.rtime - this.card.t < 5 && S.mode === 'fps' && !S.over;
    if (!on){ if (el && el.style.display !== 'none') el.style.display = 'none'; return; }
    if (!el) return dc0(g, W, H, cx);
    const key = 'p70' + this.card.died + PRIO70.order().join(',') + Object.keys(PRIO70.never).join(',') + LANG.cur + (TOUCH.on ? 't' : '');
    if (el._k !== key){
      el._k = key;
      el.innerHTML = `<h5>${this.card.died ? tr('✖ РОБОТ УНИЧТОЖЕН — СИГНАЛ ПЕРЕДАН', '✖ ROBOT DESTROYED — SIGNAL TRANSFERRED', '✖ ROBOT BỊ HẠ — ĐÃ CHUYỂN TÍN HIỆU') : tr('СВОЙ ПОРЯДОК ВСЕЛЕНИЯ', 'CUSTOM POSSESSION ORDER', 'THỨ TỰ NHẬP VAI RIÊNG', 'סדר השתלטות אישי')}</h5>` + PRIO70.html('card');
    }
    el.style.display = 'block';
    el.style.opacity = String(clamp(5 - (S.rtime - this.card.t), 0, 1));
  };
}
// меню ☰ на телефоне: раздел «Вселение»
if (typeof M67 !== 'undefined'){
  const fs0 = M67.fillSheet;
  M67.fillSheet = function(){
    const r = fs0.apply(this, arguments);
    try {
      let sec = this.sheet.querySelector('.p70sec');
      if (!sec){ sec = document.createElement('div'); sec.className = 'sec p70sec'; const opts = this.opts && this.opts.parentElement; this.sheet.insertBefore(sec, opts || null); }
      sec.innerHTML = `<h6>${uixEsc(tr('Вселение — порядок классов', 'Possession — class order', 'Nhập vai — thứ tự lớp', 'השתלטות — סדר סוגים'))}</h6>` + PRIO70.html('sheet');
    } catch (e){}
    return r;
  };
}
// ---------------------------------------------------------------- 3. система промахов
const MISS70 = {
  on: true, stats: { cine: 0, shots: 0, ground: 0, whiz: 0, cover: 0 },
  // доля «киношных» промахов по игроку: лёгкая — больше, тяжёлая — меньше (от DK().acc)
  pCine(me){
    const a = DK().acc;
    let p = clamp(0.2 + 0.3 * a, 0.42, 0.8);
    if (me){
      if (me.hp < me.maxhp * 0.35) p += 0.12;
      if (S.time - (me.lastHurt || -99) < 0.45) p += 0.1;            // только что попали — дать шанс укрыться
      if (len(me.vel || [0, 0, 0]) > 6 || !me.grounded) p += 0.06;     // бег, полёт, подкат
    }
    return min(0.9, p);
  },
  // укрытие перед целью (по линии стрелок → цель, на уровне пояса): кэш на 0.4 с
  cover(u, tg, eye){
    if (!tg || tg.cls !== 'inf') return null;
    if (u.cov70 && u.cov70.tg === tg && S.time - u.cov70.t < 0.4) return u.cov70.p;
    const c = centerOf(tg), d = norm(sub(c, eye)), up = tg.up || norm(tg.pos);
    let p = null;
    for (const k of [1.0, 1.8]){
      const q = add(sub(c, mul(d, k)), mul(up, -0.35));
      if (mapJS(q[0], q[1], q[2]) < 0.3){ p = q; break; }
    }
    u.cov70 = { tg, t: S.time, p };
    return p;
  },
  err(u, tg, td, err, vsPlayer, eye){
    if (!this.on) return vsPlayer ? err * 1.1 : err;
    let k = 1 + clamp((td - 18) / 65, 0, 1.3);                                       // дальность
    if (tg && tg.vel){ const up = tg.up || norm(tg.pos); const v = sub(tg.vel, mul(up, dot(tg.vel, up))); k *= 1 + min(0.9, len(v) * 0.085); }   // цель движется
    if (tg && tg.cls === 'inf' && !tg.grounded) k *= 1.25;                          // цель в полёте
    k *= 1 + (u.moveAmt || 0) * 0.45;                                               // стрелок на бегу
    if (u.suppT > 0) k *= 1.35;                                                     // стрелок под подавлением
    if (this.cover(u, tg, eye)) k *= 1.55;                                          // цель за укрытием
    if (tg && tg.crouch) k *= 1.12;
    if (tg && tg.kd70 && tg.kd70.lv >= 3) k *= 1.3;                                 // лежит после взрыва
    if (!vsPlayer && tg && tg.cls === 'inf') k *= 1.12;                             // боты друг по другу тоже не снайперы
    return err * k;
  },
  // вместо попадания — пуля мимо: у головы, в землю рядом, в укрытие
  cine(u, tg, eye, dir){
    if (!this.on || !tg || tg !== ctrlEntity() || tg.cls !== 'inf' || S.attract) return null;
    this.stats.shots++;
    if (random() >= this.pCine(tg)) return null;
    const up = tg.up, head = add(tg.pos, mul(up, RULES.EYE)), side = norm(cross(sub(head, eye), up)), sg = random() < 0.5 ? -1 : 1;
    const cov = this.cover(u, tg, eye);
    const r = random();
    let pt, kind;
    if (cov && r < 0.45){ pt = add(cov, mul(randUnit(), 0.25)); kind = 'cover'; }
    else if (r < 0.75){
      const toward = tangent(sub(eye, tg.pos), up);
      pt = add(add(tg.pos, mul(toward, 0.9 + random() * 2.2)), add(mul(side, sg * (0.2 + random() * 1.3)), mul(up, -0.9)));
      kind = 'ground';
    } else {
      pt = add(head, add(mul(side, sg * (0.65 + random() * 0.6)), mul(up, -0.1 + random() * 0.75)));
      kind = 'whiz';
    }
    this.stats.cine++; this.stats[kind]++;
    return { dir: norm(sub(pt, eye)), kind, me: tg };
  },
  after(c, r){
    if (!c || !r || !S.cam) return;
    const hit = r.pos, d = dist(hit, c.me.pos);
    if (c.kind !== 'whiz' && d < 6 && !r.ent){
      fxSmoke(add(hit, mul(norm(hit), 0.15)), 0.18 + random() * 0.12, 0.38, 0.75);   // пыль
      const n = norm(hit);
      for (let i = 0; i < 4; i++) S.sparks.push({ pos: hit, vel: add(mul(n, 3 + random() * 4), mul(randUnit(), 4)), life: 0.15 + random() * 0.2 });
      if (random() < 0.55) emit('rico70', { pos: hit });
    }
    if (c.kind === 'whiz') emit('crack70', { pos: c.me.pos });
  },
};
// машины, турели, дроны: тоже «мажут по герою»
{
  const gs0 = gunShootSimple;
  gunShootSimple = function(src, muzzle, dir, spread, W){
    if (MISS70.on && src && src.team === 1 && !S.attract && src.target && src.target === ctrlEntity() && src.target.cls === 'inf' && random() < MISS70.pCine(src.target) * 0.7){
      const c = MISS70.cine(src, src.target, muzzle, dir) || null;
      if (c){ const r = gs0(src, muzzle, c.dir, 0.002, W); MISS70.after(c, r); return r; }
    }
    return gs0(src, muzzle, dir, spread, W);
  };
}
// звуки: рикошет и «щелчок» сверхзвуковой пули у уха
if (typeof AU !== 'undefined'){
  AU.rico70 = function(pos){
    if (!this.ready() || !this.allow(pos, 40)) return;
    const t = this.ctx.currentTime, out = this.out(pos, 0.15), f = 2400 + Math.random() * 1800;
    this.osc(out, t, 0.32, 'triangle', f, f * 0.42, 0.13);
    this.nz(out, t, 0.05, 'highpass', 4000, 0, 0.6, 0.18);
  };
  AU.crack70 = function(){
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    this.nz(this.sfx, t, 0.04, 'highpass', 5200, 0, 0.7, 0.32);
    this.nz(this.sfx, t + 0.01, 0.16, 'bandpass', 2600 + Math.random() * 1500, 900, 3, 0.22, 0.02);
  };
  const pr0 = AU.process.bind(AU);
  AU.process = function(evs){
    pr0(evs);
    if (!this.ready || !this.ready()) return;
    for (const e of evs){ try { if (e.type === 'rico70') this.rico70(e.pos); else if (e.type === 'crack70') this.crack70(); } catch (_){} }
  };
}
// ---------------------------------------------------------------- 4. падения от взрывов
const KD70 = {
  on: true, last: null,
  T: [0, 0.42, 1.15, 1.8],
  lvOf(s){ return s > 70 ? 3 : s > 32 ? 2 : s > 10 ? 1 : 0; },
  blast(p, dmg, radius){
    if (!this.on) return;
    const R = radius * 1.6 + 1.5;
    for (const u of S.units){
      if (!u.alive || u.parked) continue;
      const d = dist(centerOf(u), p); if (d > R) continue;
      const s = dmg * (1 - d / R) * (u.role === 'heavy' ? 0.78 : 1) * (u.elite ? 0.9 : 1);
      const lv = this.lvOf(s); if (!lv) continue;
      this.hit(u, lv, p);
    }
  },
  hit(u, lv, p){
    const k = u.kd70;
    if (k && k.lv >= lv && k.t < k.T * 0.6) return;
    const up = u.up;
    let dir = tangent(sub(u.pos, p), up); if (dist(u.pos, p) < 0.3) dir = tangent(mul(u.fwd, -1), up);
    u.kd70 = { lv, t: 0, T: this.T[lv] * (0.9 + random() * 0.2), dir, sg: random() < 0.5 ? -1 : 1 };
    if (lv >= 2){ u.cd = max(u.cd || 0, lv === 3 ? 0.9 : 0.45); u.burst = 0; }
    this.last = { lv, t: S.time, u };
    const me = ctrlEntity();
    if (u === me && S.mode === 'fps' && !S.attract){
      const c = S.cam; if (c){ const sd = dot(c.right, sub(p, u.pos)); u.kd70.sg = sd > 0 ? -1 : 1; }
      if (lv >= 2) this.muff = { t: S.rtime, T: lv === 3 ? 1.5 : 0.8, f: lv === 3 ? 480 : 1400 };
      if (lv === 3 && typeof AU !== 'undefined' && AU.ready && AU.ready()) try { AU.osc(AU.master, AU.ctx.currentTime, 1.3, 'sine', 3900, 3700, 0.035); } catch (e){}
      S.dmgT = max(S.dmgT, 0.12 * lv);
      if (lv === 3) S.shake = min(S.shake, 0.35);   // вместо долгой тряски — короткое падение камеры
    }
  },
  // огибающая: 0..1 (наклон тела / крен камеры)
  env(k){
    const t = k.t, T = k.T, ss = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    if (k.lv === 1) return Math.sin(PI * clamp(t / T, 0, 1));
    if (k.lv === 2) return ss(t / 0.14) * (1 - ss((t - T + 0.4) / 0.4));
    return ss(t / 0.32) * (1 - ss((t - 0.85) / (T - 0.85)));
  },
  step(dt, rdt){
    for (const u of S.units){
      const k = u.kd70; if (!k) continue;
      if (!u.alive){ u.kd70 = null; u.kdUp = null; u.kdSink = 0; continue; }
      k.t += u === ctrlEntity() ? rdt : dt;
      if (k.t >= k.T){ u.kd70 = null; u.kdUp = null; u.kdSink = 0; continue; }
      const e = this.env(k), a = [0, 0.2, 0.42, 1.38][k.lv] * e;
      u.kdUp = norm(add(mul(u.up, cos(a)), mul(k.dir, sin(a))));
      u.kdSink = [0, 0, 0.42, 0.25][k.lv] * e;
      if (k.lv === 3 && k.t < k.T - 0.25) u.cd = max(u.cd, 0.1);
    }
  },
};
V70.steps.push((dt, rdt) => KD70.step(dt, rdt));
{
  const kb0 = knockback;
  knockback = function(p, dmg, radius){ kb0(p, dmg, radius); try { KD70.blast(p, dmg, radius); } catch (e){} };
  const bi0 = botInput;
  botInput = function(u, dt){
    const inp = bi0(u, dt), k = u.kd70;
    if (k){
      if (k.lv === 3 && k.t < k.T - 0.2){ inp.wish = [0, 0, 0]; inp.fire = false; inp.rocket = false; inp.thrust = false; inp.jump = false; inp.aim = null; }
      else if (k.lv === 2 && k.t < k.T * 0.75){ inp.wish = mul(inp.wish, 0.3); inp.speedMul = min(inp.speedMul || 1, 0.6); inp.rocket = false; inp.thrust = false; inp.jump = false; }
    }
    return inp;
  };
  const pi0 = playerInput;
  playerInput = function(u){
    const inp = pi0.apply(this, arguments), k = u && u.kd70;
    if (k && !S.attract){
      if (k.lv === 3 && k.t < k.T - 0.3){ inp.wish = [0, 0, 0]; if (inp.wish3) inp.wish3 = [0, 0, 0]; inp.fire = false; inp.thrust = false; inp.jump = false; inp.lift = false; inp.rocket = false; }
      else if (k.lv === 2 && k.t < k.T * 0.7){ inp.wish = mul(inp.wish, 0.45); inp.speedMul = min(inp.speedMul || 1, 1); inp.jump = false; }
    }
    return inp;
  };
  // камера от первого лица: короткий крен, «осадка» и взгляд чуть вверх — без тряски
  const ca0 = CAMFX.apply.bind(CAMFX);
  CAMFX.apply = function(cam, dt){
    cam = ca0(cam, dt);
    const me = ctrlEntity(), k = me && me.kd70;
    if (!k || S.mode !== 'fps' || S.attract || me.cls !== 'inf') return cam;
    const e = KD70.env(k);
    const roll = k.sg * [0, 0.045, 0.09, 0.2][k.lv] * e, pitch = [0, 0.025, 0.035, 0.13][k.lv] * e, dip = [0, 0.03, 0.38, 0.95][k.lv] * e;
    const f0 = cam.fwd, r0 = cam.right, u0 = cam.up;
    const f = norm(add(mul(f0, cos(pitch)), mul(u0, sin(pitch)))), u1 = norm(add(mul(u0, cos(pitch)), mul(f0, -sin(pitch))));
    const r = norm(add(mul(r0, cos(roll)), mul(u1, sin(roll)))), u2 = norm(add(mul(u1, cos(roll)), mul(r0, -sin(roll))));
    return Object.assign({}, cam, { pos: sub(cam.pos, mul(norm(me.pos), dip)), fwd: f, right: r, up: u2 });
  };
  // приглушённый звук после сильного взрыва
  if (typeof AU !== 'undefined'){
    const fr0 = AU.frame.bind(AU);
    AU.frame = function(dt){
      fr0(dt);
      const M = KD70.muff; if (!M || !this.ready || !this.ready() || !this.slowF) return;
      const k = (S.rtime - M.t) / M.T;
      if (k >= 1){ KD70.muff = null; return; }
      const f = M.f + (20000 - M.f) * k * k * k;
      try { this.slowF.frequency.setTargetAtTime(min(f, S.slow > 0.05 ? 20000 * Math.pow(0.03, S.slow) : 20000), this.ctx.currentTime, 0.04); } catch (e){}
    };
  }
}
// для попиксельного A/B с v6.9 (tools/pcab70.ps1): ?v70off=1 выключает стартовый состав, промахи и падения
if (typeof QS !== 'undefined' && QS.get('v70off')){ ROSTER70.off = true; MISS70.on = false; KD70.on = false; }
