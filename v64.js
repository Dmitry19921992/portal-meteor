// =====================================================================
//  v6.4 — СТРОЙКА И ПРОИЗВОДСТВО ПО-НОВОМУ
//  • Инженер заказывается только в панели штаба (или форпоста — второй базы):
//    выбрал здание → справа раскрывается его панель производства. Так же у мехзавода,
//    дрон-хаба и аэродока — одна схема для всех производящих зданий.
//  • Вкладка «Стройка» закрыта, пока не выбран инженер: вместо кнопок — подсказка
//    и кнопка «выбрать ближайшего инженера». Горячие клавиши стройки (Z X C V B N K)
//    без выбранного инженера сами выбирают ближайшего и включают чертёж.
//  Вкладки правой панели: ⚒ Стройка (F1) · ⌂ Здание (F2, повторно — следующее здание) · ✺ Удары (F4).
// =====================================================================
const V64 = { sig: '', lastSelB: null, t: 0 };
SIDE.pb = null;   // здание, чья панель производства открыта
function v64At(b){ return b.cls === 'hq' ? 'hq' : b.type; }
function v64Prods(b){ const at = v64At(b); return Object.keys(PRODUCTS).filter(k => PRODUCTS[k].at.includes(at)); }
function v64BName(b){ return b.cls === 'hq' ? tr('Штаб', 'HQ', 'Sở chỉ huy') : bname(b.type); }
function v64BIcon(b){ return b.cls === 'hq' ? '⌂' : (UIX_ICON.b[b.type] || BICON[b.type] || '▣'); }
function v64IsProd(b){ return !!(b && b.team === 0 && (b.cls === 'hq' ? b.alive : (b.cls === 'bld' && b.alive)) && v64Prods(b).length); }
function v64ProdBlds(){
  const L = [];
  if (S.hq[0] && S.hq[0].alive) L.push(S.hq[0]);
  for (const b of S.buildings) if (b.alive && b.team === 0 && v64Prods(b).length) L.push(b);
  return L;
}
function v64PB(){ const b = SIDE.pb; if (v64IsProd(b)) return b; SIDE.pb = null; return null; }
// открыть панель здания (и выделить его)
function v64OpenBld(b, fly){
  if (!v64IsProd(b)) return false;
  SIDE.pb = b; SIDE.tab = 'prod'; S.sel.clear(); S.selB = b; V64.lastSelB = b;
  if (fly && b.pos && !onScreen(b.pos)) flyCamTo(b.pos);
  buildSidebar(); emit('ui', { kind: 'ok' });
  return true;
}
function v64SelectHQ(){
  if (S.hq[0] && S.hq[0].alive) return v64OpenBld(S.hq[0], true);
  const b = v64ProdBlds().find(x => v64Prods(x).includes('builder') && (x.cls === 'hq' || x.done));
  if (b) return v64OpenBld(b, true);
  feed(tr('Штаба нет — инженера закажет только форпост', 'No HQ — only an outpost can train builders', 'Không có sở chỉ huy — chỉ tiền đồn mới huấn luyện kỹ sư'), '#f88'); emit('ui', { kind: 'deny' });
  return false;
}
// выбрать ближайшего (к центру экрана) инженера и открыть стройку
function v64PickBuilder(quiet){
  const p = S.cam ? rtsFocusPoint() : BASES[0];
  const b = nearestBuilder(0, p, true) || nearestBuilder(0, p, false);
  if (!b){
    if (!quiet){ feed(tr('Инженеров нет — выбери штаб и закажи инженера', 'No builders — select the HQ and train one', 'Không có kỹ sư — chọn sở chỉ huy và huấn luyện'), '#f88'); emit('ui', { kind: 'deny' }); }
    return false;
  }
  S.sel.clear(); S.selB = null; S.sel.add(b);
  if (!onScreen(b.pos)) flyCamTo(b.pos);
  SIDE.tab = 'build'; buildSidebar();
  if (!quiet) emit('ui', { kind: 'ok' });
  HINTS.used('select');
  return true;
}
// заказ в конкретном здании (панель здания)
function produceAt(site, key){
  const P = PRODUCTS[key];
  if (!P || !site || !v64IsProd(site) || !P.at.includes(v64At(site))) return v64Order(key);
  if (site.cls === 'bld' && !site.done){ feed(tr(`${v64BName(site)} ещё строится`, `${v64BName(site)} is still under construction`, `${v64BName(site)} đang xây`), '#f88'); emit('ui', { kind: 'deny' }); return false; }
  if (site.queue.length >= 5){ feed(tr(`${v64BName(site)}: очередь заполнена (5/5)`, `${v64BName(site)}: queue is full (5/5)`, `${v64BName(site)}: hàng chờ đầy (5/5)`), '#f88'); emit('ui', { kind: 'deny' }); return false; }
  const why = canProduce(0, key);
  if (why && !/[Оо]черед|[Qq]ueue|[Hh]àng/.test(why)){ v64Order(key, true); return false; }
  S.teams[0].ore -= pCost(0, key);
  if (key === 'builder') site.queue.splice(min(1, site.queue.length), 0, key); else site.queue.push(key);
  feed(tr(`${v64BName(site)}: в очереди ${pname(key)}`, `${v64BName(site)}: queued ${pname(key)}`, `${v64BName(site)}: đã xếp ${pname(key)}`), TEAM[0].css);
  emit('ui', { kind: 'ok' }); HINTS.used('produce');
  S.pOrder = S.pOrder || {}; S.pOrder[key] = (S.pOrder[key] || 0) + 1;
  if (typeof CUR !== 'undefined') CUR.ev('produce', key);
  return true;
}
// общий заказ (старый путь). Инженер — только через панель штаба
const _v64uiProduce = uiProduce;
function v64Order(key, force){
  if (key === 'builder' && !force){
    if (v64SelectHQ()) feed(tr('Инженера заказывают в штабе — панель штаба открыта справа', 'Builders are trained at the HQ — its panel is open on the right', 'Kỹ sư được huấn luyện ở sở chỉ huy — bảng bên phải đã mở'), '#9cf');
    return false;
  }
  return _v64uiProduce(key);
}
uiProduce = function(key){ return v64Order(key); };
// ---------------------------------------------------------------------
//  ПРАВАЯ ПАНЕЛЬ (замена buildSidebar из rts.js)
// ---------------------------------------------------------------------
function v64Sig(){
  const pb = v64PB(), hasB = selBuilders().length > 0;
  const blds = SIDE.tab === 'prod' && !pb ? v64ProdBlds().map(b => uixId(b) + (b.done ? 'd' : '')).join(',') : '';
  return [SIDE.tab, hasB, SIDE.tab === 'build' && !hasB ? teamBuilders(0).length > 0 : '', pb ? uixId(pb) + (pb.cls === 'hq' || pb.done ? 'd' : '') : '', blds, LANG.cur, TOUCH.on, typeof CUR !== 'undefined' ? CUR.enabled() : ''].join('|');
}
buildSidebar = function(){
  const el = $('side'); el.innerHTML = '';
  V64.sig = v64Sig();
  const pb = v64PB();
  const tabs = document.createElement('div'); tabs.className = 'tabs';
  const T = [['build', '⚒', tr('Стройка', 'Build', 'Xây'), 'F1'], ['prod', pb ? v64BIcon(pb) : '⌂', pb ? v64BName(pb) : tr('Здания', 'Buildings', 'Công trình'), 'F2'], ['cmd', '✺', tr('Удары', 'Powers', 'Chỉ huy'), 'F4']];
  for (const [k, ic, n, f] of T){
    const b = document.createElement('button'); b.dataset.tab = k; b.className = SIDE.tab === k ? 'cur' : '';
    b.innerHTML = `<i>${ic}</i><span>${n}</span><em></em>`; b.dataset.tip = `<b>${ic} ${n}</b> <kbd>${f}</kbd>`;
    b.onclick = e => { e.stopPropagation(); AU.init(); SIDE.tab = k; buildSidebar(); emit('ui', { kind: 'ok' }); };
    tabs.appendChild(b);
  }
  el.appendChild(tabs);
  const list = document.createElement('div'); list.className = 'items'; el.appendChild(list);
  SIDE.btns = [];
  const ore = c => `<i class="ore"></i>${c}`;
  const mk = (id, icon, name, cost, time, fn, extra) => {
    const b = document.createElement('button'); b.className = 'item'; b.dataset.ux = id;
    const hk = extra && 'hk' in extra ? extra.hk : SLOT_KEYS[SIDE.btns.length]; if (hk) b.dataset.hk = hk;
    b.innerHTML = `<i>${icon}</i>${hk ? `<kbd>${keyLabel(hk)}</kbd>` : ''}<b>${name}</b><span class="cost">${cost}</span>${time ? `<span class="tm">${time}</span>` : ''}<span class="q"></span><span class="st"></span><span class="bar"><s></s></span>`;
    b.onclick = e => { e.stopPropagation(); AU.init(); fn(); };
    b.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); if (extra && extra.cancel) extra.cancel(); };
    list.appendChild(b);
    SIDE.btns.push({ el: b, id, extra: extra || {} });
  };
  const note = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; list.appendChild(d); return d; };
  const btn = (parent, cur, html, fn, cls) => { const b = document.createElement('button'); b.className = cls || 'v64b'; b.dataset.cur = cur; b.innerHTML = html; b.onclick = e => { e.stopPropagation(); AU.init(); fn(); }; parent.appendChild(b); return b; };
  const cancelOf = (site, k) => () => {
    if (UIX.wants.includes(k)){ UIX.wants = UIX.wants.filter(w => w !== k); emit('ui', { kind: 'ok' }); return; }
    for (const s of site ? [site] : [S.hq[0], ...S.buildings]){ const i = s.team === 0 && s.queue ? s.queue.lastIndexOf(k) : -1; if (i >= 0){ cancelProduct(s, i); emit('ui', { kind: 'ok' }); return; } }
  };
  let hintTxt = '';
  if (SIDE.tab === 'build'){
    const bs = selBuilders();
    if (bs.length){
      note('bnote v64h', `⚒ <b>${tr('Инженеры', 'Builders', 'Kỹ sư')}: ${bs.length}</b> · ${TOUCH.on ? tr('выбери здание → тапни место → «Строить»', 'pick a building → tap a spot → "Build"', 'chọn công trình → chạm chỗ → “Xây”') : tr('выбери здание → ЛКМ по месту (Shift — несколько)', 'pick a building → LMB on a spot (Shift — several)', 'chọn công trình → chuột trái lên chỗ (Shift — nhiều)')}`);
      for (const k in BTYPES){ const B = BTYPES[k]; mk('build:' + k, UIX_ICON.b[k] || BICON[k] || '▣', bname(k), ore(B.cost), fmtDur(B.time), () => startPlace(k), { hk: BUILD_KEYS[k] || '' }); }
      hintTxt = tr('Стройку ведут выбранные инженеры. ПКМ по своему зданию — ремонт.', 'The selected builders do the building. RMB on your building — repair.', 'Kỹ sư đã chọn sẽ xây. Chuột phải lên công trình — sửa.');
    } else {
      const g = note('bgate', '');
      const any = teamBuilders(0).length > 0;
      g.innerHTML = `<i>⚒</i><p><b>${tr('Выбери инженера, чтобы строить', 'Select a builder to build', 'Chọn kỹ sư để xây')}</b><br>${any ? tr('Здания строят только инженеры. Кликни по инженеру на карте или нажми кнопку.', 'Only builders construct. Click a builder on the map or press the button.', 'Chỉ kỹ sư mới xây. Nhấp vào kỹ sư hoặc bấm nút.') : tr('Инженеров нет: выбери штаб и закажи инженера.', 'No builders: select the HQ and train a builder.', 'Không có kỹ sư: chọn sở chỉ huy và huấn luyện.')}</p>`;
      if (any) btn(g, 'selbuilder', `⚒ ${tr('Выбрать ближайшего инженера', 'Select nearest builder', 'Chọn kỹ sư gần nhất')}${TOUCH.on ? '' : ' <kbd>.</kbd>'}`, () => v64PickBuilder(), 'v64b big').dataset.ux = 'selbuilder';
      btn(g, 'selhq', `⌂ ${tr('Штаб: заказать инженера', 'HQ: train a builder', 'Sở chỉ huy: huấn luyện kỹ sư')}`, () => v64SelectHQ(), 'v64b' + (any ? '' : ' big')).dataset.ux = 'selhq';
      if (!TOUCH.on) note('bnote', tr('Клавиши стройки (Z X C V B N K) сами выберут ближайшего инженера.', 'Build keys (Z X C V B N K) pick the nearest builder automatically.', 'Phím xây (Z X C V B N K) tự chọn kỹ sư gần nhất.'));
    }
    const bq = document.createElement('div'); bq.className = 'bqueue'; bq.id = 'bqueue'; list.appendChild(bq);
  } else if (SIDE.tab === 'prod'){
    if (!pb){
      note('bnote v64h', tr('Выбери здание — откроется его производство. Или кликни здание на карте.', 'Pick a building to open its production. Or click a building on the map.', 'Chọn công trình để mở sản xuất. Hoặc nhấp công trình trên bản đồ.'));
      for (const b of v64ProdBlds()){
        const st = b.cls === 'bld' && !b.done ? tr(`строится ${Math.floor(b.built * 100)}%`, `building ${Math.floor(b.built * 100)}%`, `đang xây ${Math.floor(b.built * 100)}%`) : b.queue.length ? tr(`очередь ${b.queue.length}`, `queue ${b.queue.length}`, `hàng ${b.queue.length}`) : tr('простаивает', 'idle', 'rảnh');
        const it = btn(list, 'pb-' + v64At(b), `<i>${v64BIcon(b)}</i><b>${v64BName(b)}</b><small>${st}</small><span>${v64Prods(b).map(k => PRODUCTS[k].icon).join(' ')}</span>`, () => v64OpenBld(b, true), 'pbsel');
        it.dataset.ux = 'pb:' + v64At(b);
      }
      hintTxt = tr('Новые производящие здания строят инженеры (вкладка «Стройка»).', 'New production buildings are built by builders ("Build" tab).', 'Công trình sản xuất mới do kỹ sư xây (thẻ “Xây”).');
    } else {
      const h = note('pbhead', '');
      const all = v64ProdBlds(), i = all.indexOf(pb);
      h.innerHTML = `<i>${v64BIcon(pb)}</i><div><b>${v64BName(pb)}</b><small data-pbst></small></div>`;
      if (all.length > 1){
        btn(h, 'pbprev', '◂', () => v64OpenBld(all[(i - 1 + all.length) % all.length], true), 'v64n').title = tr('Предыдущее здание', 'Previous building', 'Trước');
        btn(h, 'pbnext', '▸', () => v64OpenBld(all[(i + 1) % all.length], true), 'v64n').title = tr('Следующее здание (F2)', 'Next building (F2)', 'Tiếp (F2)');
      }
      btn(h, 'pblist', '☰', () => { SIDE.pb = null; buildSidebar(); }, 'v64n').title = tr('Все здания', 'All buildings', 'Tất cả');
      if (pb.cls === 'bld' && !pb.done) note('bnote', tr('Здание строится — заказы откроются после постройки.', 'Under construction — orders open once it is built.', 'Đang xây — mở đặt hàng sau khi xây xong.'));
      const ks = v64Prods(pb), units = ks.filter(k => !PRODUCTS[k].research).sort((a, b) => (b === 'builder') - (a === 'builder')), tech = ks.filter(k => PRODUCTS[k].research);
      for (const k of units) mk('prod:' + k, PRODUCTS[k].icon, pname(k), ore(pCost(0, k)), fmtDur(pTime(0, k)), () => produceAt(v64PB() || pb, k), { key: k, cancel: cancelOf(pb, k) });
      if (tech.length){ note('pbsub', tr('Улучшения', 'Research', 'Nâng cấp')); for (const k of tech) mk('prod:' + k, PRODUCTS[k].icon, pname(k), ore(pCost(0, k)), fmtDur(pTime(0, k)), () => produceAt(v64PB() || pb, k), { key: k, cancel: cancelOf(pb, k) }); }
      hintTxt = TOUCH.on ? tr('Долгий тап по земле — точка сбора', 'Long tap on the ground — rally point', 'Chạm giữ mặt đất — điểm tập kết') : tr('ПКМ по кнопке — отменить заказ · ПКМ по земле — точка сбора', 'RMB on a button — cancel · RMB on the ground — rally point', 'Chuột phải lên nút — hủy · lên mặt đất — điểm tập kết');
    }
  } else if (SIDE.tab === 'units' || SIDE.tab === 'tech'){
    // старые вкладки (только для совместимости тестов/сохранённых настроек): все заказы, кроме инженера
    for (const k in PRODUCTS){ const P = PRODUCTS[k]; if (k === 'builder' || !!P.research !== (SIDE.tab === 'tech')) continue; mk('prod:' + k, P.icon, pname(k), ore(pCost(0, k)), fmtDur(pTime(0, k)), () => uiProduce(k), { key: k, cancel: cancelOf(null, k) }); }
  } else {
    for (const k in POWERS){ const P = POWERS[k]; mk('power:' + k, P.icon, N2(P.n), P.cost + ' ' + tr('КО', 'CP', 'ĐCH'), fmtDur(P.cd), () => startPower(k), { power: k }); }
    hintTxt = tr('Выбери удар и кликни цель на карте', 'Pick a power, then click the target', 'Chọn đòn đánh rồi nhấp mục tiêu');
  }
  if (hintTxt){ const hint = document.createElement('div'); hint.className = 'shint'; hint.innerHTML = hintTxt; list.appendChild(hint); }
  const foot = document.createElement('div'); foot.className = 'sfoot';
  foot.innerHTML = `<button id="aiBtn"></button><button id="abBtn"></button><button id="curBtn" data-cur="curbtn"></button><button id="helpBtn" data-tip="${uixEsc(`<b>${tr('Управление', 'Controls')}</b><p>${tr('Все клавиши стратегии', 'All strategy keys')}</p>`)}">?${TOUCH.on ? '' : ' <kbd>/</kbd>'}</button>`;
  el.appendChild(foot);
  $('helpBtn').onclick = e => { e.stopPropagation(); S.showHelp = !S.showHelp; updateModeUI(); };
  $('aiBtn').onclick = e => { e.stopPropagation(); toggleAI(); updateSidebar(); };
  $('aiBtn').dataset.tip = `<b>${tr('ИИ-стратег', 'AI strategist')}</b><p>${tr('Включён — сам строит базу, заказывает войска и раздаёт приказы (твои приказы важнее). Выключен — всё делаешь ты.', 'On — builds the base, orders troops and gives orders by itself (your orders take priority). Off — you do everything.')}</p>`;
  $('abBtn').onclick = e => { e.stopPropagation(); const T = S.teams[0]; T.autoBuild = T.autoBuild === false; feed(T.autoBuild ? tr('Автостройка включена: стратег строит базу инженерами', 'Auto-build on: the strategist builds the base with builders', 'Tự xây bật') : tr('Автостройка выключена: здания строишь только ты', 'Auto-build off: only you build', 'Tự xây tắt'), '#9cf'); updateSidebar(); };
  $('curBtn').onclick = e => { e.stopPropagation(); AU.init(); if (typeof CUR !== 'undefined') CUR.toggle(); updateSidebar(); };
  $('curBtn').dataset.tip = `<b>${tr('Куратор', 'Curator', 'Người hướng dẫn')}</b><p>${tr('Подсказывает по ходу игры, что и где делать: стрелки на кнопки и метки на карте. Можно выключить в любой момент (и в Настройках).', 'Guides you during play: arrows to buttons and marks on the map. Turn it off any time (also in Settings).', 'Hướng dẫn trong lúc chơi. Có thể tắt bất cứ lúc nào.')}</p>`;
  updateSidebar();
};
// живые значения панели: счётчик заказов на вкладке «Здание», состояние здания, кнопка куратора
const _v64UpdateSidebar = updateSidebar;
updateSidebar = function(){
  _v64UpdateSidebar();
  let n = 0; for (const s of [S.hq[0], ...S.buildings]) if (s && s.team === 0 && s.alive && s.queue) n += s.queue.length;
  const em = document.querySelector('#side .tabs [data-tab="prod"] em'); if (em){ const v = n ? n + '' : ''; if (em.textContent !== v) em.textContent = v; }
  const pb = v64PB(), st = document.querySelector('#side [data-pbst]');
  if (pb && st){ const v = pb.cls === 'bld' && !pb.done ? tr(`строится ${Math.floor(pb.built * 100)}%`, `building ${Math.floor(pb.built * 100)}%`, `đang xây ${Math.floor(pb.built * 100)}%`) : (pb.queue.length ? `${PRODUCTS[pb.queue[0]].icon} ${fmtDur(pTime(0, pb.queue[0]) - pb.prodT)} · ` : '') + tr(`очередь ${pb.queue.length}/5`, `queue ${pb.queue.length}/5`, `hàng ${pb.queue.length}/5`); if (st.textContent !== v) st.textContent = v; }
  const cb = $('curBtn');
  if (cb && typeof CUR !== 'undefined'){ const h = `${TOUCH.on ? '🎓' : tr('Куратор', 'Curator', 'Hướng dẫn')}: <b class="${CUR.enabled() ? 'on' : ''}">${CUR.enabled() ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</b>`; if (cb._h !== h){ cb._h = h; cb.innerHTML = h; } }
};
// кадр: панель здания открывается при выборе здания; стройка — при выборе инженера
function v64Frame(dt){
  V64.t -= dt; if (V64.t > 0) return; V64.t = 0.15;
  if (S.mode !== 'rts' || S.attract) return;
  const B = S.selB;
  if (B !== V64.lastSelB){
    V64.lastSelB = B;
    if (v64IsProd(B) && !selGroups().length){ SIDE.pb = B; SIDE.tab = 'prod'; buildSidebar(); return; }
  }
  if (v64Sig() !== V64.sig) buildSidebar();
}
const _v64UixFrame = uixFrame;
uixFrame = function(dt){ _v64UixFrame(dt); try { v64Frame(dt); } catch (e){ if (!V64.err){ V64.err = 1; console.warn('v64', e); } } };
// клавиши: F1 стройка, F2 здание (повторно — следующее), F3 = F2, F4 удары
const _v64UixKey = uixKey;
uixKey = function(e){
  const c = e.code;
  if (c === 'F2' || c === 'F3'){
    e.preventDefault();
    const pb = v64PB(), all = v64ProdBlds();
    if (SIDE.tab === 'prod' && pb && all.length > 1) v64OpenBld(all[(all.indexOf(pb) + 1) % all.length], true);
    else if (pb) v64OpenBld(pb, false);
    else if (!v64SelectHQ()){ SIDE.tab = 'prod'; buildSidebar(); }
    return true;
  }
  if (c === 'F1'){ e.preventDefault(); SIDE.tab = 'build'; buildSidebar(); emit('ui', { kind: 'ok' }); return true; }
  if (c === 'F4'){ e.preventDefault(); SIDE.tab = 'cmd'; buildSidebar(); emit('ui', { kind: 'ok' }); return true; }
  return _v64UixKey(e);
};
// клавиши стройки без выбранного инженера: выбрать ближайшего и сразу включить чертёж
const _v64BuilderKey = builderKey;
builderKey = function(e){
  if (_v64BuilderKey(e)) return true;
  if (e.ctrlKey || e.altKey || e.metaKey || SIDE.tab === 'prod' || SIDE.tab === 'cmd') return false;
  for (const k in BUILD_KEYS) if (BUILD_KEYS[k] === e.code){
    if (v64PickBuilder()) startBuild(k);
    else v64SelectHQ();
    return true;
  }
  return false;
};
// действия-исправления: «выбрать штаб», «выбрать инженера»
const _v64RtsDo = rtsDo;
rtsDo = function(act){
  if (act === 'selhq') return v64SelectHQ();
  if (act === 'selbuilder') return v64PickBuilder();
  if (/^prod:/.test(act || '')) return v64Order(act.slice(5));
  return _v64RtsDo(act);
};
const _v64RtsReason = rtsReason;
rtsReason = function(action, arg){
  const r = _v64RtsReason(action, arg);
  if (r && !r.ok && r.act === 'produce:builder' && /^(build|place):/.test(action)){
    r.fix = tr('Выбери штаб и закажи инженера (50 руды) — клик откроет панель штаба', 'Select the HQ and train a builder (50 ore) — click to open the HQ panel', 'Chọn sở chỉ huy và huấn luyện kỹ sư (50 quặng)');
    r.act = 'prod:builder';   // uixRun('prod:builder') → uiProduce → откроет панель штаба
  }
  return r;
};
// ---------------------------------------------------------------------
//  «Новое в v6.4» (вставкой в главное меню, как в v6.2)
// ---------------------------------------------------------------------
const V64_NEWS = [
  ['Инженер заказывается только в штабе: выбери штаб (клик по нему или F2) — справа откроется его панель производства. Так же у мехзавода, дрон-хаба, аэродока и форпоста', 'Builders are trained only at the HQ: select the HQ (click it or F2) — its production panel opens on the right. Same for the mech factory, drone hub, airdock and outpost', 'Kỹ sư chỉ được huấn luyện ở sở chỉ huy: chọn sở chỉ huy (nhấp hoặc F2) — bảng sản xuất mở bên phải. Tương tự với nhà máy, trạm drone, bến bay và tiền đồn'],
  ['Вкладка «Стройка» открывается, когда выбран инженер; кнопка «Выбрать ближайшего инженера»; клавиши Z X C V B N K сами выбирают инженера', 'The Build tab opens when a builder is selected; a "Select nearest builder" button; Z X C V B N K pick a builder automatically', 'Thẻ “Xây” mở khi chọn kỹ sư; nút “Chọn kỹ sư gần nhất”; phím Z X C V B N K tự chọn kỹ sư'],
  ['Куратор вместо обучения стратегии: по ходу игры подсказывает, что делать, показывает стрелкой кнопку и метку на карте; выключается кнопкой на панели или в Настройках', 'The Curator replaces the strategy tutorial: it suggests what to do as you play, points at the button and marks the map; turn it off on the panel or in Settings', 'Người hướng dẫn thay cho phần huấn luyện chiến thuật: gợi ý việc cần làm, chỉ nút và đánh dấu trên bản đồ; tắt trên bảng hoặc trong Cài đặt'],
  ['Режим разработчика (главное меню): бесконечная руда, всё открыто, мгновенная стройка, «Арсенал» — любое оружие, класс, техника, манекены-цели; карьера не меняется', 'Developer mode (main menu): unlimited ore, everything unlocked, instant build, the Arsenal — any weapon, class, vehicle, target dummies; your career is untouched', 'Chế độ nhà phát triển (menu chính): quặng vô hạn, mở khóa tất cả, xây tức thì, “Kho vũ khí” — mọi vũ khí, lớp, xe, hình nộm; sự nghiệp không đổi'],
  ['Телефон: кнопки шутера не перекрывают прицел и оружие, панели стратегии сворачиваются, крупнее кнопки, понятный переход «Стратегия ⇄ Бой»', 'Phone: shooter buttons no longer cover the crosshair or weapon, strategy panels collapse, bigger buttons, a clear "Strategy ⇄ Battle" switch', 'Điện thoại: nút không che tâm ngắm và vũ khí, bảng chiến thuật thu gọn được, nút lớn hơn, chuyển “Chiến thuật ⇄ Trận” rõ ràng'],
];
const V64_NEWS63 = [
  ['Сводная версия: новые кристаллы рудных жил и экстракторы v6.2 + гранаты с дугой броска', 'Combined build: the v6.2 ore-vein crystals and extractors + grenades with a throw arc', 'Bản tổng hợp: tinh thể mạch quặng và máy khai thác v6.2 + lựu đạn có quỹ đạo ném'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v6\.3 · /, 'v6.4 · ');
    const m = h.match(/<h3>[^<]*v6\.3[^<]*<\/h3>/);
    if (m){
      const news = `<h3>${tr('Новое в v6.4', 'New in v6.4', 'Mới trong v6.4')}</h3><ul>${V64_NEWS.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join('')}</ul>`;
      h = h.replace(m[0], news + m[0]);
      h = h.replace(/(<h3>[^<]*v6\.3[^<]*<\/h3>\s*<ul>)/, '$1' + V64_NEWS63.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join(''));
    }
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v6.5'; };
}
// ---------------------------------------------------------------------
//  стили
// ---------------------------------------------------------------------
(function v64CSS(){
  const st = document.createElement('style'); st.id = 'v64css';
  st.textContent = `
  #side .bgate{grid-column:1/-1;display:flex;flex-direction:column;gap:7px;padding:10px 8px;border:1px dashed rgba(127,212,255,.5);background:rgba(20,40,52,.45);color:#cfe9f5;font-size:12px;line-height:1.35}
  #side .bgate > i{font-style:normal;font-size:28px;color:#7fd4ff;text-align:center} #side .bgate p{margin:0} #side .bgate b{color:#fff;font-size:13px}
  #side .v64b{pointer-events:auto;background:rgba(40,70,90,.75);border:1px solid rgba(127,212,255,.7);color:#eaf8ff;font:600 12px "Exo 2";padding:8px 6px;cursor:pointer;border-radius:3px;text-align:center}
  #side .v64b.big{font-size:13.5px;padding:11px 6px;background:rgba(40,90,120,.85)} #side .v64b:hover{border-color:#fff;background:rgba(60,110,140,.9)}
  #side .v64b kbd{font-size:10px}
  #side .pbhead{grid-column:1/-1;display:flex;align-items:center;gap:6px;padding:4px 4px 6px;border-bottom:1px solid var(--line)}
  #side .pbhead > i{font-style:normal;font-size:24px;color:var(--sand);width:30px;text-align:center} #side .pbhead > div{flex:1;min-width:0;display:flex;flex-direction:column}
  #side .pbhead b{font:400 15px "Russo One";color:#fff} #side .pbhead small{font-size:10.5px;color:#b9b19a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #side .v64n{pointer-events:auto;width:30px;height:30px;background:rgba(40,38,30,.75);border:1px solid var(--line);color:#e8dcb8;font-size:15px;cursor:pointer;padding:0;border-radius:3px} #side .v64n:hover{border-color:#fff}
  #side .pbsub{grid-column:1/-1;font:600 10px "Exo 2";letter-spacing:.14em;text-transform:uppercase;color:var(--sand2);padding:4px 2px 0}
  #side .pbsel{grid-column:1/-1;display:grid;grid-template-columns:34px 1fr;grid-template-rows:auto auto auto;column-gap:6px;text-align:left;background:linear-gradient(180deg,rgba(52,49,38,.82),rgba(30,29,24,.86));border:1px solid rgba(214,198,154,.42);color:var(--ink);padding:6px 8px;cursor:pointer;font-family:"Exo 2";border-radius:3px}
  #side .pbsel:hover{border-color:#fff} #side .pbsel i{grid-row:1/4;font-style:normal;font-size:24px;color:var(--sand);align-self:center;text-align:center}
  #side .pbsel b{font-size:13px} #side .pbsel small{font-size:10.5px;color:#9a937e} #side .pbsel span{font-size:12px;color:#ffd27a;letter-spacing:2px}
  #side .v64h{color:#cfe9f5} #side .v64h b{color:#9fdcff}
  #side .sfoot #curBtn b.on{color:var(--ok)}
  body.touch #side .bgate{font-size:11px;padding:7px 6px;gap:6px} body.touch #side .bgate > i{font-size:22px} body.touch #side .v64b{min-height:40px;font-size:12px}
  body.touch #side .pbsel{padding:4px 6px} body.touch #side .pbhead b{font-size:13px} body.touch #side .v64n{width:34px;height:34px}`;
  document.head.appendChild(st);
})();
