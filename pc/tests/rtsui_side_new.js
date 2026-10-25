const SIDE = { tab: 'build', btns: [] };
// v6 rtsui: крупные кнопки со значком, ценой, временем, горячей клавишей и строкой состояния
// (причина недоступности / сколько осталось). Клик по серой кнопке — объяснение и решение (uix.js).
function buildSidebar(){
  const el = $('side'); el.innerHTML = '';
  const tabs = document.createElement('div'); tabs.className = 'tabs';
  const T = [['build', '⚒', tr('Здания', 'Build', 'Xây'), 'F1'], ['units', '◆', tr('Войска', 'Units', 'Quân'), 'F2'], ['tech', '⚗', tr('Улучш.', 'Tech', 'Công nghệ'), 'F3'], ['cmd', '✺', tr('Удары', 'Powers', 'Chỉ huy'), 'F4']];
  for (const [k, ic, n, f] of T){
    const b = document.createElement('button'); b.dataset.tab = k; b.className = SIDE.tab === k ? 'cur' : '';
    b.innerHTML = `<i>${ic}</i><span>${n}</span><em></em>`; b.dataset.tip = `<b>${ic} ${n}</b> <kbd>${f}</kbd>`;
    b.onclick = e => { e.stopPropagation(); SIDE.tab = k; buildSidebar(); emit('ui', { kind: 'ok' }); };
    tabs.appendChild(b);
  }
  el.appendChild(tabs);
  const list = document.createElement('div'); list.className = 'items'; el.appendChild(list);
  SIDE.btns = [];
  const ore = c => `<i class="ore"></i>${c}`;
  const mk = (id, icon, name, cost, time, fn, extra) => {
    const b = document.createElement('button'); b.className = 'item'; b.dataset.ux = id;
    const hk = SLOT_KEYS[SIDE.btns.length];
    b.innerHTML = `<i>${icon}</i>${hk ? `<kbd>${keyLabel(hk)}</kbd>` : ''}<b>${name}</b><span class="cost">${cost}</span>${time ? `<span class="tm">${time}</span>` : ''}<span class="q"></span><span class="st"></span><span class="bar"><s></s></span>`;
    b.onclick = e => { e.stopPropagation(); AU.init(); fn(); };
    b.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); if (extra && extra.cancel) extra.cancel(); };
    list.appendChild(b);
    SIDE.btns.push({ el: b, id, extra: extra || {} });
  };
  if (SIDE.tab === 'build'){
    for (const k in BTYPES){ const B = BTYPES[k]; mk('build:' + k, UIX_ICON.b[k] || '▣', bname(k), ore(B.cost), fmtDur(B.time), () => startPlace(k)); }
  } else if (SIDE.tab === 'units' || SIDE.tab === 'tech'){
    for (const k in PRODUCTS){
      const P = PRODUCTS[k];
      if (!!P.research !== (SIDE.tab === 'tech')) continue;
      mk('prod:' + k, P.icon, pname(k), ore(pCost(0, k)), fmtDur(pTime(0, k)), () => uiProduce(k),
         { key: k, cancel: () => { if (UIX.wants.includes(k)){ UIX.wants = UIX.wants.filter(w => w !== k); emit('ui', { kind: 'ok' }); return; } for (const s of [S.hq[0], ...S.buildings]) { const i = s.team === 0 ? s.queue.lastIndexOf(k) : -1; if (i >= 0){ cancelProduct(s, i); emit('ui', { kind: 'ok' }); return; } } } });
    }
  } else {
    for (const k in POWERS){ const P = POWERS[k]; mk('power:' + k, P.icon, N2(P.n), P.cost + ' ' + tr('КО', 'CP', 'ĐCH'), fmtDur(P.cd), () => startPower(k), { power: k }); }
  }
  const hint = document.createElement('div'); hint.className = 'shint';
  hint.innerHTML = SIDE.tab === 'units' || SIDE.tab === 'tech' ? tr('ПКМ по кнопке — отменить последний заказ', 'RMB on a button — cancel the last order') : SIDE.tab === 'build' ? tr('Выбери здание и кликни место на своей базе', 'Pick a building, then click a spot on your base') : tr('Выбери удар и кликни цель на карте', 'Pick a power, then click the target');
  list.appendChild(hint);
  const foot = document.createElement('div'); foot.className = 'sfoot';
  foot.innerHTML = `<button id="aiBtn"></button>`;
  el.appendChild(foot);
  $('aiBtn').onclick = e => { e.stopPropagation(); toggleAI(); updateSidebar(); };
  $('aiBtn').dataset.tip = `<b>${tr('ИИ-стратег', 'AI strategist')}</b><p>${tr('Включён — сам строит базу, заказывает войска и раздаёт приказы (твои приказы важнее). Выключен — всё делаешь ты.', 'On — builds the base, orders troops and gives orders by itself (your orders take priority). Off — you do everything.')}</p>`;
  updateSidebar();
}
function updateSidebar(){
  for (const b of SIDE.btns){
    const x = uiExplain(b.id);
    b.el.classList.toggle('off', !x.ok); b.el.classList.toggle('soft', !x.ok && !!x.soft);
    const q = b.el.querySelector('.q'), bar = b.el.querySelector('.bar s'), st = b.el.querySelector('.st');
    let stT = x.ok ? '' : x.reason, stC = x.ok ? '' : 'bad', prog = 0;
    if (b.extra.key){
      const k = b.extra.key, n = countQueued(0, [k]);
      q.textContent = n ? '×' + n : '';
      let left = null;
      for (const s of [S.hq[0], ...S.buildings]) if (s.team === 0 && s.alive && s.queue[0] === k){ const tt = pTime(0, k); if (s.prodT / tt >= prog){ prog = s.prodT / tt; left = tt - s.prodT; } }
      if (UIX.wants.includes(k)){ stT = '⏳ ' + tr('ждёт руды', 'waiting for ore'); stC = 'wait'; }
      else if (left !== null && (x.ok || x.soft)){ stT = '▶ ' + fmtDur(left); stC = 'run'; }
      const P = PRODUCTS[k];
      if (P.max){ const lv = pLevel(0, k); b.el.querySelector('b').textContent = `${pname(k)} ${lv >= P.max ? 'MAX' : 'I'.repeat(lv + 1)}`; b.el.querySelector('.cost').innerHTML = lv >= P.max ? '—' : `<i class="ore"></i>${pCost(0, k)}`; }
    } else if (b.extra.power){
      const left = powerLeft(0, b.extra.power);
      prog = left > 0 ? 1 - left / POWERS[b.extra.power].cd : 0;
      q.textContent = '';
    } else if (b.id.startsWith('build:')){
      const n = S.buildings.filter(o => o.alive && o.team === 0 && o.type === b.id.slice(6)).length;
      q.textContent = n ? n + '' : '';
    }
    bar.style.width = (clamp(prog, 0, 1) * 100).toFixed(0) + '%';
    if (st.textContent !== stT) st.textContent = stT;
    st.className = 'st ' + stC;
  }
  // счётчики на вкладках
  const tq = { units: 0, tech: 0 };
  for (const s of [S.hq[0], ...S.buildings]) if (s && s.team === 0 && s.alive && s.queue) for (const k of s.queue) tq[PRODUCTS[k].research ? 'tech' : 'units']++;
  document.querySelectorAll('#side .tabs button').forEach(t => { const n = tq[t.dataset.tab]; const em = t.querySelector('em'); const v = n ? n + '' : ''; if (em.textContent !== v) em.textContent = v; });
  const ai = $('aiBtn'); if (ai) ai.innerHTML = `${tr('ИИ-стратег', 'AI strategist', 'chiến lược gia AI')}: <b class="${S.teams[0].ai ? 'on' : ''}">${S.teams[0].ai ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</b> <kbd>I</kbd>`;
}
// ---------- нижняя карточка: кто выделен, приказы, большая кнопка «Вселиться» ----------
const CARD = { sig: '' };
// в кого вселит Tab / кнопка «Вселиться»
function cardPossessTarget(){
  const b = S.selB;
  if (b && b.alive && b.team === 0 && b.cls === 'bld' && (b.type === 'turret' || b.type === 'aa') && b.done && !selGroups().length) return { e: b, label: bname(b.type) };
  for (const g of selGroups()){ const u = isSquad(g) ? g.units.find(x => x.alive) : g; if (u) return { e: u, label: groupLabel(g) }; }
  return null;
}
function cardGroupIcon(g){ return isSquad(g) ? (g.elite ? '✦' : g.solo ? (g.solo === 'sniper' ? '⌖' : '◈') : '◆') : g.cls === 'tank' ? '■' : '▲'; }
function cardHP(list){ let h = 0, m = 0; for (const u of list){ h += max(0, u.hp); m += u.maxhp; } return [h, m]; }
function updateCard(){
  const el = $('card');
  const sel = selGroups();
  const B = !sel.length && S.selB && S.selB.team === 0 && (S.selB.alive || S.selB.cls === 'hq') ? S.selB : (!sel.length && S.selB && S.selB.team === 1 && S.selB.alive ? S.selB : null);
  const pt = cardPossessTarget();
  const abil = {};
  for (const g of sel) for (const k of abilList(g)) abil[ABIL[k].key] = k;
  const sky = sel.some(isSquad);
  const prods = B && B.team === 0 ? Object.keys(PRODUCTS).filter(k => PRODUCTS[k].at.includes(B.cls === 'hq' ? 'hq' : B.type)) : [];
  const sig = [LANG.cur, sel.map(uixId).join(','), B ? uixId(B) + (B.done || B.cls === 'hq' ? 'd' : '') + ':' + (B.queue || []).join(',') : '', pt ? uixId(pt.e) : '', Object.keys(abil).join(''), sky, sel.length === 1 && isSquad(sel[0]) ? groupUnits(sel[0]).length : ''].join('#');
  if (sig !== CARD.sig){
    CARD.sig = sig;
    let h = '<div class="inf">';
    if (sel.length === 1){
      const g = sel[0], L = leaderOf(g), us = groupUnits(g);
      const port = isSquad(g) && L && typeof SQUADUI !== 'undefined' ? `<img src="${SQUADUI.portrait(L)}">` : `<div class="glyph">${cardGroupIcon(g)}</div>`;
      const cls = isSquad(g) ? `${us.map(u => `<span title="${N2(roleOf(u).n)}">${roleOf(u).icon}</span>`).join('')} · ${us.length} ${tr('бойц.', 'troopers')}` : g.cls === 'tank' ? `${tr('Танк', 'Tank')} ${tankName(0)}` : tr('Боевой дрон', 'Combat drone');
      h += `<div class="pt">${port}</div><div class="tx"><b>${groupLabel(g)}${g.vet ? ' <span class="vet">' + '★'.repeat(g.vet) + '</span>' : ''}</b><small>${cls}</small><div class="hp"><s data-hp="0"></s><em data-hpt="0"></em></div><em class="ord" data-ord="0"></em></div>`;
    } else if (sel.length > 1){
      const cnt = {}; for (const g of sel){ const i = cardGroupIcon(g); cnt[i] = (cnt[i] || 0) + 1; }
      h += `<div class="tx"><b>${tr('Выделено', 'Selected')}: ${sel.length}</b><small>${Object.keys(cnt).map(i => `${i}×${cnt[i]}`).join('  ')}</small><div class="ports">` +
        sel.slice(0, 12).map((g, i) => `<div class="port" data-pi="${i}" data-tip="${uixEsc(`<b>${groupLabel(g)}</b><p>${orderText(g)}</p><p class="dt">${tr('Клик — выделить только его · Shift — убрать · двойной — камера', 'Click — select only it · Shift — remove · double — camera')}</p>`)}"><i>${cardGroupIcon(g)}</i><s data-hp="${i}"></s></div>`).join('') +
        (sel.length > 12 ? `<div class="port more">+${sel.length - 12}</div>` : '') + '</div></div>';
    } else if (B){
      const nm = B.cls === 'hq' ? tr('Штаб', 'HQ', 'Sở chỉ huy') : bname(B.type);
      const ic = B.cls === 'hq' ? '⌂' : (UIX_ICON.b[B.type] || '▣');
      h += `<div class="pt"><div class="glyph ${B.team ? 'enemy' : ''}">${ic}</div></div><div class="tx"><b>${nm}${B.team ? ' · ' + tr('враг', 'enemy') : ''}</b><div class="hp"><s data-bhp></s><em data-bhpt></em></div><em class="ord" data-bst></em>`;
      if (B.queue && B.queue.length && B.team === 0) h += '<div class="queue">' + B.queue.map((k, i) => `<button data-q="${i}" data-tip="${uixEsc(`<b>${PRODUCTS[k].icon} ${pname(k)}</b><p class="dt">${tr('Клик — отменить (руда вернётся)', 'Click — cancel (ore refunded)')}</p>`)}"><i>${PRODUCTS[k].icon}</i>${i === 0 ? '<s data-qp></s>' : ''}</button>`).join('') + '</div>';
      h += '</div>';
    } else {
      h += `<div class="tx"><small class="help">${TOUCH.on ? tr('Тап — выделить · долгий тап — приказ · двойной тап — вселиться · палец — камера, два — масштаб', 'Tap — select · long tap — order · double tap — possess · drag — camera, pinch — zoom') : tr('ЛКМ — выделить · рамка — несколько · ПКМ — приказ · двойной клик — вселиться · Ctrl+1…9 — группа', 'LMB — select · drag — box · RMB — order · double-click — possess · Ctrl+1…9 — group')}</small></div>`;
    }
    h += '</div><div class="cmds">';
    if (sel.length){
      for (const code of ['KeyR', 'KeyF', 'KeyG', 'KeyT']){ const k = abil[code]; if (!k) continue; const A = ABIL[k]; h += `<button class="ab" data-ux="abil:${code}" data-key="${code}"><i>${A.icon}</i><b>${N2(A.n)}</b><kbd>${keyLabel(code)}</kbd><em></em><s></s></button>`; }
      h += `<button class="ab" data-ux="cmd:hold" data-act="hold"><i>⛊</i><b>${tr('Стоять', 'Hold', 'Giữ')}</b><kbd>H</kbd></button>`;
      h += `<button class="ab" data-ux="cmd:retreat" data-act="retreat"><i>↩</i><b>${tr('Отступить', 'Retreat')}</b><kbd>⇧H</kbd></button>`;
      if (sky) h += `<button class="ab" data-ux="cmd:sky" data-act="sky"><i>⇑</i><b>${tr('Десант', 'Sky assault', 'Đổ bộ')}</b><kbd>Y</kbd></button>`;
    } else if (B && prods.length && (B.cls === 'hq' || B.done)){
      h += prods.map(k => `<button class="ab prod" data-ux="prod:${k}" data-prod="${k}"><i>${PRODUCTS[k].icon}</i><b>${pname(k)}</b><kbd><i class="ore"></i>${pCost(0, k)}</kbd><em></em><s></s></button>`).join('');
    }
    h += '</div>';
    const rally = B && B.team === 0 && prods.length ? `<em class="note">${TOUCH.on ? tr('Долгий тап по земле — точка сбора', 'Long tap on the ground — rally point') : tr('ПКМ по земле — точка сбора', 'RMB on the ground — rally point')}</em>` : '';
    h += `<button class="poss ${pt ? '' : 'back'}" data-ux="possess"><i>▶</i><b>${pt ? tr('Вселиться', 'Possess', 'Nhập vai') : tr('В бой', 'To battle', 'Vào trận')}</b><small>${pt ? uixEsc(pt.label) : tr('к своему бойцу', 'back to your unit')}</small>${TOUCH.on ? '' : `<kbd>${bk('rts')}</kbd>`}</button>` + rally;
    el.innerHTML = h;
    el.querySelectorAll('[data-key]').forEach(b => b.onclick = e => { e.stopPropagation(); abilityKey(b.dataset.key); });
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); const a = b.dataset.act; if (a === 'hold') orderHold(); else if (a === 'retreat') orderRetreat(); else if (a === 'sky') orderSkySel(); });
    el.querySelectorAll('[data-prod]').forEach(b => b.onclick = e => { e.stopPropagation(); uiProduce(b.dataset.prod); });
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = e => { e.stopPropagation(); if (S.selB && S.selB.queue){ cancelProduct(S.selB, +b.dataset.q); emit('ui', { kind: 'ok' }); } });
    el.querySelector('.poss').onclick = e => { e.stopPropagation(); AU.init(); const t = cardPossessTarget(); enterFPS(t ? t.e : undefined); HINTS.used('possess'); };
    el.querySelectorAll('.port[data-pi]').forEach(p => p.onclick = e => { e.stopPropagation(); const g = sel[+p.dataset.pi]; if (!g) return; if (e.shiftKey){ S.sel.delete(g); return; } S.sel.clear(); S.sel.add(g); const L = leaderPos(g); if (L && performance.now() - (p._t || 0) < 400) flyCamTo(L); p._t = performance.now(); });
  }
  cardLive(el, sel, B);
}
// живые значения карточки (без пересборки DOM)
function cardLive(el, sel, B){
  const col = k => k > 0.5 ? '#9c9' : k > 0.25 ? '#dc6' : '#e66';
  el.querySelectorAll('[data-hp]').forEach(s => { const g = sel[+s.dataset.hp]; if (!g) return; const k = groupHP(g); s.style.width = (k * 100).toFixed(0) + '%'; s.style.background = col(k); });
  const ht = el.querySelector('[data-hpt]'); if (ht && sel[0]){ const [h, m] = cardHP(groupUnits(sel[0])); ht.textContent = `${Math.round(h)} / ${m}`; }
  const ord = el.querySelector('[data-ord]'); if (ord && sel[0]){ const t = orderText(sel[0]); if (ord.textContent !== t) ord.textContent = t; }
  if (B){
    const k = max(0, B.hp) / B.maxhp, s = el.querySelector('[data-bhp]'); if (s){ s.style.width = (k * 100).toFixed(0) + '%'; s.style.background = col(k); }
    const t = el.querySelector('[data-bhpt]'); if (t) t.textContent = `${Math.round(max(0, B.hp))} / ${B.maxhp}`;
    const st = el.querySelector('[data-bst]');
    if (st){ let v = ''; if (B.cls === 'bld' && !B.done){ const eta = uixBuildEta(B); v = tr('Стройка', 'Building') + ` ${Math.floor(B.built * 100)}%` + (eta ? ` · ≈${fmtDur(eta)}` : ' · ' + tr('ждёт строителей', 'waiting for builders')); } else if (B.queue && B.queue.length){ const tt = pTime(0, B.queue[0]); v = `${PRODUCTS[B.queue[0]].icon} ${pname(B.queue[0])} · ${fmtDur(tt - B.prodT)}` + (B.queue.length > 1 ? ` · ${tr('в очереди', 'queued')} ${B.queue.length - 1}` : ''); } else if (B.team === 0 && B.type !== 'turret' && B.type !== 'aa') v = tr('Простаивает', 'Idle'); if (st.textContent !== v) st.textContent = v; }
    const qp = el.querySelector('[data-qp]'); if (qp && B.queue && B.queue.length) qp.style.width = (clamp(B.prodT / pTime(0, B.queue[0]), 0, 1) * 100).toFixed(0) + '%';
  }
  el.querySelectorAll('.ab[data-ux]').forEach(b => {
    const x = uiExplain(b.dataset.ux);
    b.classList.toggle('off', !x.ok);
    const em = b.querySelector('em'), s = b.querySelector('s');
    if (em) em.textContent = !x.ok && x.eta ? Math.ceil(x.eta) : '';
    if (s) s.style.height = !x.ok && x.eta && x.progress !== undefined ? ((1 - clamp(x.progress, 0, 1)) * 100).toFixed(0) + '%' : '0%';
    if (b.dataset.key) b.classList.toggle('cast', !!(S.cast && S.cast.code === b.dataset.key));
  });
  const pb = el.querySelector('.poss'); if (pb) pb.classList.toggle('off', !uiExplain('possess').ok);
}
