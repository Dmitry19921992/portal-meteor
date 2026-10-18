// =====================================================================
//  СТРАТЕГИЯ: камера у земли, выделение, группы, приказы, способности,
//  боковая панель производства, командная карточка, миникарта
// =====================================================================
let RTS_GR = { dir: null, r: RM };
function rtsCamera(){
  const R = S.rts;
  R.dir = norm(R.dir);
  R.fwd = tangent(R.fwd, R.dir);
  if (!RTS_GR.dir || dot(RTS_GR.dir, R.dir) < 0.99999){ RTS_GR.dir = R.dir; RTS_GR.r = max(RM - 5, groundR(R.dir)); }
  const N = R.dir, f = R.fwd;
  const focus = mul(N, RTS_GR.r + 1);
  const tilt = lerp(0.95, 0.12, smoothstep(25, 285, R.h));
  let pos = add(add(focus, mul(N, R.h)), mul(f, -R.h * tan(tilt)));
  if (len(pos) > S.R - 4) pos = mul(norm(pos), S.R - 4);
  pos = pullCam(focus, pos);
  return Object.assign({ pos }, camBasis(norm(sub(focus, pos)), N));
}
function rtsFocusPoint(){ return mul(S.rts.dir, RTS_GR.r); }
function rtsLookAt(p){ S.rts.dir = norm(p); RTS_GR.dir = null; }
function updateRTSCamera(dt){
  const R = S.rts;
  if (MENU.isOpen()) return;
  const speed = (30 + R.h * 1.1) * dt / RM;
  const k = (c1, c2) => (keys[c1] || keys[c2]) ? 1 : 0;
  let ud = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
  let lr = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
  if (keys.ControlLeft || keys.ControlRight){ ud = 0; lr = 0; }
  if (SET.edgeScroll && S.mouse && document.hasFocus() && !drag){
    const [mx, my] = S.mouse, m = 8;
    if (mx < m) lr = -1; else if (mx > innerWidth - m) lr = 1;
    if (my < m) ud = 1; else if (my > innerHeight - m) ud = -1;
  }
  const rot = k('KeyE', 'KeyE') - k('KeyQ', 'KeyQ');
  if (ud){ const a = ud * speed; const nd = norm(add(mul(R.dir, cos(a)), mul(R.fwd, sin(a)))); R.fwd = norm(sub(mul(R.fwd, cos(a)), mul(R.dir, sin(a)))); R.dir = nd; }
  if (lr){ const right = norm(cross(R.fwd, R.dir)); const a = lr * speed; R.dir = norm(add(mul(R.dir, cos(a)), mul(right, sin(a)))); }
  if (rot) R.fwd = norm(rotAxis(R.fwd, R.dir, rot * dt * 1.6));
  R.fwd = tangent(R.fwd, R.dir);
  if (S.camFly){ S.camFly.t += dt; const kk = smoothstep(0, 0.6, S.camFly.t); R.dir = norm(add(mul(S.camFly.from, 1 - kk), mul(S.camFly.to, kk))); if (kk >= 1) S.camFly = null; }
}
function flyCamTo(p){ S.camFly = { from: S.rts.dir, to: norm(p), t: 0 }; }
// видна ли точка с камеры (не за горизонтом метеорита)
function facing(p){ const l = len(p); if (l < 60) return true; return dot(sub(S.cam.pos, p), mul(p, 1 / l)) > -6; }
function screenRay(x, y){
  const c = S.cam, H = innerHeight;
  const ux = (x - innerWidth / 2) / H * c.fov, uy = -(y - H / 2) / H * c.fov;
  return norm(add(add(mul(c.right, ux), mul(c.up, uy)), c.fwd));
}
function pickGround(x, y){
  const d = screenRay(x, y), o = S.cam.pos;
  let t = 0;
  for (let i = 0; i < 400 && t < 2000; i++){
    const p = add(o, mul(d, t)), m = mapJS(p[0], p[1], p[2]);
    if (m < 0.3) return p;
    t += max(m * 0.7, 0.2);
  }
  return null;
}
function screenRadius(p, worldR){ const s = project(p); return s ? worldR / (s[2] * S.cam.fov) * innerHeight : 0; }
function pickEntity(x, y, wantEnemy){
  let best = null, bd = 16;
  const test = (e, p, r) => {
    if (!facing(p)) return;
    const s = project(p); if (!s) return;
    const d = hypot(s[0] - x, s[1] - y) - max(4, screenRadius(p, r || 1));
    if (d < bd){ bd = d; best = e; }
  };
  for (const u of S.units) if (u.alive && (u.team === 0 || (wantEnemy && u.seen[0] > 0))) test(u, u.pos, 0.6);
  for (const v of S.vehicles) if (v.alive && (v.team === 0 || (wantEnemy && v.seen[0] > 0))) test(v, v.pos, 2.5);
  for (const d of S.drones) if (d.alive && (d.team === 0 || (wantEnemy && d.seen[0] > 0))) test(d, d.pos, 1.2);
  for (const b of S.builders) if (b.alive && (b.team === 0 || (wantEnemy && b.seen[0] > 0))) test(b, b.pos, 0.9);
  for (const b of S.buildings) if (b.alive && (b.team === 0 || (wantEnemy && (b.known0 || b.seen[0] > 0)))) test(b, bldCenter(b), b.rad * 0.8);
  for (const h of S.hq) if (h.alive && (h.team === 0 || wantEnemy)) test(h, add(h.pos, mul(BASES[h.team], 4)), 10);
  return best;
}

// ---------- мышь ----------
let drag = null, lastClick = 0, mdrag = null;
canvas.addEventListener('mousedown', e => {
  if (S.mode !== 'rts' || S.attract || MENU.isOpen()) return;
  if (minimapClick(e.clientX, e.clientY, e.button)) return;
  if (e.button === 1){ mdrag = { x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
  if (e.button === 0){
    if (S.place){ tryPlace(e.clientX, e.clientY, e.shiftKey); return; }
    if (S.cast){ tryCast(e.clientX, e.clientY, e.shiftKey); return; }
    drag = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, shift: e.shiftKey, ctrl: e.ctrlKey };
  }
  if (e.button === 2){ if (S.place || S.cast){ S.place = null; S.cast = null; return; } orderAt(e.clientX, e.clientY, e.shiftKey); }
});
addEventListener('mousemove', e => {
  S.mouse = [e.clientX, e.clientY];
  if (drag){ drag.x1 = e.clientX; drag.y1 = e.clientY; }
  if (mdrag && S.mode === 'rts'){
    const dx = e.clientX - mdrag.x, dy = e.clientY - mdrag.y; mdrag.x = e.clientX; mdrag.y = e.clientY;
    S.rts.fwd = norm(rotAxis(S.rts.fwd, S.rts.dir, -dx * 0.006));
    S.rts.h = clamp(S.rts.h * (1 + dy * 0.004), 12, 285);
  }
});
addEventListener('mouseup', e => {
  if (e.button === 1) mdrag = null;
  if (S.mode !== 'rts' || e.button !== 0 || !drag) return;
  const d = drag; drag = null;
  if (!d.shift){ S.sel.clear(); S.selB = null; }
  if (hypot(d.x1 - d.x0, d.y1 - d.y0) < 6){
    const ent = pickEntity(d.x1, d.y1, false);
    const now = performance.now(), dbl = now - lastClick < 350 && S.lastPick === ent;
    lastClick = now; S.lastPick = ent;
    if (!ent) return;
    if (ent.cls === 'bld' || ent.cls === 'hq'){
      S.selB = ent;
      if (dbl && ent.cls === 'bld' && (ent.type === 'turret' || ent.type === 'aa') && ent.done){ S.turretBody = null; takeControl(ent); lockMouse(); }
      return;
    }
    const g = groupOf(ent);
    if (d.ctrl){ for (const o of g.cls === 'builder' ? teamBuilders(0) : groupsOf(0)) if (groupKind(o) === groupKind(g) && onScreen(leaderPos(o))) S.sel.add(o); return; }
    S.sel.add(g);
    if (dbl && g.cls === 'builder'){ for (const o of teamBuilders(0)) if (onScreen(o.pos)) S.sel.add(o); return; }   // двойной клик по инженеру — все инженеры на экране
    if (dbl){ takeControl(ent); lockMouse(); HINTS.used('possess'); }
  } else {
    const x0 = min(d.x0, d.x1), x1 = max(d.x0, d.x1), y0 = min(d.y0, d.y1), y1 = max(d.y0, d.y1);
    const inBox = p => { if (!facing(p)) return false; const s = project(p); return s && s[0] >= x0 && s[0] <= x1 && s[1] >= y0 && s[1] <= y1; };
    for (const u of S.units) if (u.alive && u.team === 0 && inBox(u.pos)) S.sel.add(u.squad);
    for (const v of S.vehicles) if (v.alive && v.team === 0 && inBox(v.pos)) S.sel.add(v);
    for (const dr of S.drones) if (dr.alive && dr.team === 0 && inBox(dr.pos)) S.sel.add(dr);
    // инженеры попадают в рамку, только если в ней нет боевых групп (как рабочие в StarCraft II)
    if (![...S.sel].some(g => g.cls !== 'builder')) for (const b of S.builders) if (b.alive && b.team === 0 && inBox(b.pos)) S.sel.add(b);
  }
  if (S.sel.size) HINTS.used('select');
});
canvas.addEventListener('wheel', e => {
  if (S.mode !== 'rts' || S.attract) return;
  S.rts.h = clamp(S.rts.h * (e.deltaY > 0 ? 1.1 : 1 / 1.1), 12, 285);
  e.preventDefault();
}, { passive: false });
function onScreen(p){ if (!p || !facing(p)) return false; const s = project(p); return s && s[0] > 0 && s[0] < innerWidth && s[1] > 0 && s[1] < innerHeight; }
function selGroups(){ return [...S.sel].filter(g => g.team === 0 && groupAlive(g)); }

// ---------- клавиши стратегии ----------
const GTAP = { n: -1, t: 0 };
function rtsKey(e){
  const c = e.code;
  if (builderKey(e)) return;   // v6: стройка инженерами (rts_build.js)
  if (c.startsWith('Digit')){
    const n = +c.slice(5);
    if (e.ctrlKey){ S.groupsCtl[n] = selGroups(); feed(tr(`Группа ${n}: ${S.groupsCtl[n].length}`, `Group ${n}: ${S.groupsCtl[n].length}`, `Nhóm ${n}: ${S.groupsCtl[n].length}`), '#9cf'); HINTS.used('ctlgroup'); return; }
    const G = (S.groupsCtl[n] || []).filter(groupAlive);
    if (!G.length) return;
    if (!e.shiftKey){ S.sel.clear(); S.selB = null; }
    for (const g of G) S.sel.add(g);
    const now = performance.now();
    if (GTAP.n === n && now - GTAP.t < 400){ const L = leaderPos(G[0]); if (L) flyCamTo(L); }
    GTAP.n = n; GTAP.t = now;
    HINTS.used('ctlgroup');
    return;
  }
  switch (c){
    case 'KeyA': if (e.ctrlKey){ S.sel.clear(); for (const g of groupsOf(0)) S.sel.add(g); } return;
    case 'KeyR': case 'KeyF': case 'KeyG': case 'KeyT': abilityKey(c); return;
    case 'KeyH': orderHold(); return;
    case 'KeyY': orderSkySel(); return;
    case 'KeyI': toggleAI(); return;
    case 'Space': { const a = S.alerts[S.alerts.length - 1]; if (a) flyCamTo(a.pos); return; }
    case 'Home': case 'Backspace': flyCamTo(S.hq[0].alive ? S.hq[0].pos : (keyBuildings(0)[0] || S.hq[0]).pos); return;
    case 'Enter': case 'Tab': enterFPS(); return;
    case 'Escape':
      if (S.place || S.cast){ S.place = null; S.cast = null; return; }
      if (S.sel.size || S.selB){ S.sel.clear(); S.selB = null; return; }
      MENU.pause(); return;
  }
}
// R F G T: способность с этой клавишей у выделенных групп
function abilityKey(code){
  const sel = selGroups();
  if (!sel.length){ feed(tr('Выдели отряд или технику', 'Select a squad or vehicle', 'Hãy chọn một đội hoặc xe'), '#f88'); return; }
  let needPoint = false, did = 0;
  for (const g of sel){
    const k = abilList(g).find(a => ABIL[a].key === code); if (!k) continue;
    if (ABIL[k].target === 'point') needPoint = true;
    else { if (!useAbility(g, k)){ did++; } }
  }
  if (did){ emit('ui', { kind: 'ok' }); HINTS.used('ability'); }
  if (needPoint){ S.cast = { kind: 'abil', code }; S.place = null; }
  else if (!did) { feed(tr('Нет готовой способности на этой клавише', 'No ready ability on that key', 'Không có kỹ năng sẵn sàng ở phím này'), '#f88'); emit('ui', { kind: 'deny' }); }
}
function startPower(k){
  const why = S.teams[0].cmd < POWERS[k].cost ? tr('Мало командных очков', 'Not enough command points', 'Không đủ điểm chỉ huy') : powerLeft(0, k) > 0 ? tr('Перезарядка', 'Cooling down', 'Đang hồi chiêu') : null;
  if (why){ feed(`${N2(POWERS[k].n)}: ${why}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
  S.cast = { kind: 'power', key: k }; S.place = null;
  feed(tr(`${N2(POWERS[k].n)}: ЛКМ — цель, ПКМ — отмена`, `${N2(POWERS[k].n)}: LMB — target, RMB — cancel`, `${N2(POWERS[k].n)}: chuột trái — mục tiêu, chuột phải — hủy`), '#9cf');
}
function tryCast(x, y, keep){
  if (!S.cast) return;
  const p = pickGround(x, y); if (!p) return;
  const C = S.cast;
  if (C.kind === 'power'){
    const why = usePower(0, C.key, p, 'player');
    if (why){ feed(why, '#f88'); emit('ui', { kind: 'deny' }); return; }
    feed(N2(POWERS[C.key].n), TEAM[0].css); emit('ui', { kind: 'ok' }); HINTS.used('power');
    S.markers.push({ pos: p, t: 0, life: 3, col: '#ffb070' });
    S.cast = null; return;
  }
  let n = 0;
  for (const g of selGroups()){
    const k = abilList(g).find(a => ABIL[a].key === C.code && ABIL[a].target === 'point'); if (!k) continue;
    if (!useAbility(g, k, p)) n++;
  }
  if (n){ emit('ui', { kind: 'ok' }); emit('ack', { g: selGroups()[0], order: 'abil' }); HINTS.used('ability'); S.orderMark = { p, t: 0.8, col: '#ffb070' }; }
  else { feed(tr('Способность не готова', 'Ability not ready', 'Kỹ năng chưa sẵn sàng'), '#f88'); emit('ui', { kind: 'deny' }); }
  if (!keep) S.cast = null;
}
function orderAt(x, y, queue){
  let sel = selGroups();
  // v6: инженеры — свои приказы (стройка/ремонт/идти), остальным — как обычно
  const bsel = sel.filter(g => g.cls === 'builder');
  if (bsel.length){ builderOrderAt(bsel, x, y, queue); sel = sel.filter(g => g.cls !== 'builder'); if (!sel.length) return; }
  const p = pickGround(x, y);
  if (!sel.length){
    // точка сбора для производящего здания
    if (S.selB && S.selB.team === 0 && p && (S.selB.cls === 'hq' || ['outpost', 'factory', 'hub', 'airdock'].includes(S.selB.type))){
      S.selB.rally = p; feed(tr('Точка сбора установлена', 'Rally point set', 'Đã đặt điểm tập kết'), '#9cf'); emit('ui', { kind: 'ok' }); HINTS.used('rally');
    }
    return;
  }
  const ent = pickEntity(x, y, true);
  if (ent && ent.team === 1){
    for (const g of sel){ setOrder(g, 'focus', centerOf(ent), { focus: ent.cls === 'hq' ? null : ent, by: 'player', lock: 120 }); if (ent.cls === 'hq') g.order = 'attack'; }
    S.orderMark = { p: centerOf(ent), t: 0.8, col: '#ff6050' };
    emit('ui', { kind: 'ok' });
    return;
  }
  if (!p) return;
  // двойной ПКМ — бегом, не ввязываясь в бой; одиночный — движение с атакой по пути
  const now = performance.now();
  const rush = S.lastRmb && now - S.lastRmb.t < 380 && hypot(S.lastRmb.x - x, S.lastRmb.y - y) < 30;
  S.lastRmb = { t: now, x, y };
  let target = p, order = 'move', cp = null;
  for (const c of S.cps) if (!c.core && dist(c.pos, p) < 25){ target = c.pos; order = 'cap'; cp = c; }
  if (len(p) < CORE_R + 10){ order = 'cap'; cp = S.cps[6]; target = cp.pos; }
  const n = sel.length;
  sel.forEach((g, i) => {
    if (g.order === 'sky' && g.sky) return;
    // разносим группы, чтобы не толпились в одной точке
    let tp = target;
    if (n > 1 && order === 'move'){ const up = norm(p), a = i / n * PI * 2; tp = add(p, mul(add(mul(anyTangent(up), cos(a)), mul(cross(up, anyTangent(up)), sin(a))), 5 + n * 1.5)); }
    setOrder(g, order, tp, { cp, by: 'player', lock: 120, rush });
  });
  S.orderMark = { p: target, t: 0.8, col: rush ? '#9cf' : null };
  if (rush) HINTS.used('rush');
  if (rush) feed(tr('Бегом! Не ввязываться в бой', 'On the double! Do not engage', 'Chạy nhanh! Không giao chiến'), '#9cf');
  emit('ui', { kind: 'ok' });
  HINTS.used('order');
}
function orderHold(){
  for (const g of selGroups()){ const L = leaderOf(g); if (L) setOrder(g, 'hold', L.pos, { by: 'player', lock: 300 }); }
  feed(tr('Удерживать позицию', 'Hold position', 'Giữ vị trí')); emit('ui', { kind: 'ok' });
}
function orderSkySel(){
  const sel = selGroups().filter(isSquad);
  if (!sel.length) return feed(tr('Выбери отряд', 'Select a squad', 'Hãy chọn một đội'), '#f88');
  let n = 0;
  for (const s of sel){ if (!(s.elite || S.teams[0].jet2)) continue; orderSky(s); n++; }
  if (!n){ feed(tr('Для десанта нужен «Небесный десант» или исследование «Ранцы II» (Аэродок)', 'Sky assault needs Sky troopers or the "Jetpacks II" research (Airdock)', 'Đổ bộ cần Lính đổ bộ hoặc nghiên cứu “Ba lô phản lực II” (Bến bay)'), '#f88'); emit('ui', { kind: 'deny' }); }
  else { feed(tr(`Десант через купол: ${n} отр. — сбор у штаба и взлёт`, `Sky assault: ${n} squad(s) — gathering at HQ and launching`, `Đổ bộ: ${n} đội — tập trung ở sở chỉ huy và cất cánh`), TEAM[0].css); emit('ui', { kind: 'ok' }); }
}
function startPlace(type){ startBuild(type); }   // v6: стройка через инженеров (rts_build.js)
function tryPlace(x, y, keep){
  const p = pickGround(x, y); if (!p) return;
  if (TOUCH.on){ S.placeAt = p; return; }   // телефон: тап — место, подтверждение кнопкой «Строить»
  const type = S.place;
  const why = playerPlace(type, norm(p), keep);
  if (why){ feed(why, '#f88'); emit('ui', { kind: 'deny' }); return; }
  feed(tr(`Стройка: ${bname(type)} — инженер в пути`, `Construction: ${bname(type)} — builder on the way`, `Xây dựng: ${bname(type)} — kỹ sư đang tới`), TEAM[0].css); emit('ui', { kind: 'ok' });
  HINTS.used('build');
  if (!keep || canBuild(0, type)) S.place = null;
}
function uiProduce(key){
  const why = produce(0, key);
  if (why){
    const r = rtsReason('produce:' + key);   // v6: причина + как исправить; «Нужно: здание» — сразу ставим его чертёж
    feed(`${pname(key)}: ${r.reason || why}${r.fix ? ' — ' + r.fix : ''}`, '#f88'); emit('ui', { kind: 'deny' });
    if (r.act && r.act.startsWith('build:')) startBuild(r.act.slice(6));
  }
  else { feed(tr(`В очереди: ${pname(key)}`, `Queued: ${pname(key)}`, `Đã xếp hàng: ${pname(key)}`), TEAM[0].css); emit('ui', { kind: 'ok' }); HINTS.used('produce'); S.pOrder = S.pOrder || {}; S.pOrder[key] = (S.pOrder[key] || 0) + 1; }
}
function pushAlert(pos){ if (!pos) return; S.alerts.push({ pos, t: S.rtime }); if (S.alerts.length > 6) S.alerts.shift(); }
let alertT = 0;
function rtsWatch(dt){
  alertT -= dt; if (alertT > 0) return; alertT = 2;
  if (S.attract) return;
  for (const g of groupsOf(0)){
    const L = leaderOf(g); if (!L) continue;
    if (groupUnits(g).some(u => S.time - u.lastHurt < 2) && !onScreen(L.pos) && S.rtime - (S.lastAttackAlert || -99) > 25){
      S.lastAttackAlert = S.rtime; pushAlert(L.pos);
      if (S.mode === 'rts'){ feed(tr(`${groupLabel(g)} под атакой! Пробел — к месту боя`, `${groupLabel(g)} under attack! Space — jump there`, `${groupLabel(g)} đang bị tấn công! Space — tới đó`), '#f88'); emit('radio', { text: tr(`${groupLabel(g)} под атакой`, `${groupLabel(g)} is under attack`, `${groupLabel(g)} đang bị tấn công`), pri: 0 }); }
      break;
    }
  }
}

// =====================================================================
//  БОКОВАЯ ПАНЕЛЬ (как в C&C) и КОМАНДНАЯ КАРТОЧКА
// =====================================================================
const SIDE = { tab: 'build', btns: [] };
function buildSidebar(){
  const el = $('side'); el.innerHTML = '';
  const tabs = document.createElement('div'); tabs.className = 'tabs';
  const T = [['build', tr('Здания', 'Build', 'Xây')], ['units', tr('Войска', 'Units', 'Quân')], ['tech', tr('Улучш.', 'Tech', 'Công nghệ')], ['cmd', tr('Командование', 'Command', 'Chỉ huy')]];
  for (const [k, n] of T){ const b = document.createElement('button'); b.textContent = n; b.className = SIDE.tab === k ? 'cur' : ''; b.onclick = e => { e.stopPropagation(); SIDE.tab = k; buildSidebar(); emit('ui', { kind: 'ok' }); }; tabs.appendChild(b); }
  el.appendChild(tabs);
  const list = document.createElement('div'); list.className = 'items'; el.appendChild(list);
  SIDE.btns = [];
  const mk = (icon, name, cost, desc, fn, check, extra) => {
    const b = document.createElement('button'); b.className = 'item';
    b.innerHTML = `<i>${icon}</i><b>${name}</b><span class="cost">${cost}</span><span class="q"></span><span class="bar"><s></s></span>`;
    b.onclick = e => { e.stopPropagation(); AU.init(); fn(); };
    b.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); if (extra && extra.cancel) extra.cancel(); };
    list.appendChild(b);
    SIDE.btns.push({ el: b, check, desc, extra: extra || {} });
  };
  if (SIDE.tab === 'build'){
    sidebarBuildTab(list, mk);   // v6: стройка инженерами + очередь работ (rts_build.js)
  } else if (SIDE.tab === 'units' || SIDE.tab === 'tech'){
    for (const k in PRODUCTS){
      const P = PRODUCTS[k];
      if (!!P.research !== (SIDE.tab === 'tech')) continue;
      const where = P.at.map(a => a === 'hq' ? tr('штаб', 'HQ', 'Sở chỉ huy') : bname(a)).join('/');
      mk(P.icon, pname(k), pCost(0, k), tr(`Где: ${where}. ПКМ — отменить последний в очереди.`, `At: ${where}. RMB — cancel the last queued.`, `Tại: ${where}. Chuột phải — hủy mục cuối trong hàng.`), () => uiProduce(k), () => canProduce(0, k),
         { key: k, cancel: () => { for (const s of [S.hq[0], ...S.buildings]) { const i = s.team === 0 ? s.queue.lastIndexOf(k) : -1; if (i >= 0){ cancelProduct(s, i); emit('ui', { kind: 'ok' }); return; } } } });
    }
  } else {
    for (const k in POWERS){ const P = POWERS[k]; mk(P.icon, N2(P.n), P.cost + ' ' + tr('КО', 'CP', 'ĐCH'), N2(P.d), () => startPower(k), () => S.teams[0].cmd < P.cost ? tr('Мало командных очков', 'Not enough command points', 'Không đủ điểm chỉ huy') : powerLeft(0, k) > 0 ? tr(`Перезарядка ${Math.ceil(powerLeft(0, k))} с`, `Cooldown ${Math.ceil(powerLeft(0, k))} s`, `Hồi chiêu ${Math.ceil(powerLeft(0, k))} giây`) : null, { power: k }); }
  }
  const foot = document.createElement('div'); foot.className = 'sfoot';
  foot.innerHTML = `<button id="aiBtn"></button><button id="abBtn"></button><button id="fpsBtn">${tr('В бой', 'To battle', 'Vào trận')} <kbd>Enter</kbd></button>`;
  el.appendChild(foot);
  $('aiBtn').onclick = e => { e.stopPropagation(); toggleAI(); updateSidebar(); };
  $('abBtn').onclick = e => { e.stopPropagation(); const T = S.teams[0]; T.autoBuild = T.autoBuild === false; feed(T.autoBuild ? tr('Автостройка включена: стратег строит базу инженерами', 'Auto-build on: the strategist builds the base with builders', 'Tự xây bật') : tr('Автостройка выключена: здания строишь только ты', 'Auto-build off: only you build', 'Tự xây tắt'), '#9cf'); updateSidebar(); };
  $('fpsBtn').onclick = e => { e.stopPropagation(); enterFPS(); };
  updateSidebar();
}
function updateSidebar(){
  for (const b of SIDE.btns){
    const why = b.check();
    b.el.classList.toggle('off', !!why);
    b.el.title = (why ? why + '\n' : '') + b.desc;
    const q = b.el.querySelector('.q'), bar = b.el.querySelector('.bar s');
    if (b.extra.key){
      const k = b.extra.key, n = countQueued(0, [k]);
      q.textContent = n ? '×' + n : '';
      let prog = 0;
      for (const s of [S.hq[0], ...S.buildings]) if (s.team === 0 && s.queue[0] === k){ prog = max(prog, s.prodT / pTime(0, k)); }
      bar.style.width = (prog * 100).toFixed(0) + '%';
      const P = PRODUCTS[k];
      if (P.max){ const lv = pLevel(0, k); b.el.querySelector('b').textContent = `${pname(k)} ${lv >= P.max ? 'MAX' : 'I'.repeat(lv + 1)}`; b.el.querySelector('.cost').textContent = lv >= P.max ? '—' : pCost(0, k); }
    } else if (b.extra.power){
      const left = powerLeft(0, b.extra.power);
      bar.style.width = left > 0 ? ((1 - left / POWERS[b.extra.power].cd) * 100).toFixed(0) + '%' : '0%';
      q.textContent = '';
    }
  }
  const ai = $('aiBtn'); if (ai) ai.innerHTML = `${tr('ИИ-стратег', 'AI strategist', 'chiến lược gia AI')}: <b>${S.teams[0].ai ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</b> <kbd>I</kbd>`;
  const ab = $('abBtn'); if (ab){ ab.innerHTML = `${tr('Автостройка', 'Auto-build', 'Tự xây')}: <b>${S.teams[0].autoBuild !== false && S.teams[0].ai ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</b>`; ab.title = tr('Стратег сам строит здания и экстракторы своими инженерами (когда ИИ-стратег включён). Твои приказы инженерам в стратегии — главнее.', 'The strategist builds buildings and extractors with its builders (when the AI strategist is on). Your orders to builders take priority.', 'Chiến lược gia tự xây'); }
  updateBuildQueue();
}
const CARD = { sig: '' };
function updateCard(){
  const el = $('card');
  const sel = selGroups();
  const icon = g => isSquad(g) ? (g.elite ? '✦' : '◆') : g.cls === 'tank' ? '■' : g.cls === 'builder' ? '⚒' : '▲';
  let h = '';
  if (sel.length){
    h += '<div class="ports">' + sel.slice(0, 14).map(g => {
      const hp = groupHP(g), n = groupUnits(g).length;
      return `<div class="port" data-gid="${S.squads.indexOf(g)}|${g.id}"><i>${icon(g)}</i><b>${groupLabel(g)}</b><span>${isSquad(g) ? '●'.repeat(n) + '○'.repeat(max(0, 4 - n)) : ''}${g.vet ? ' ' + '★'.repeat(g.vet) : ''}</span><em>${orderText(g)}</em><s style="width:${(hp * 100).toFixed(0)}%;background:${hp > 0.5 ? '#9c9' : hp > 0.25 ? '#dc6' : '#e66'}"></s></div>`;
    }).join('') + (sel.length > 14 ? `<div class="port more">+${sel.length - 14}</div>` : '') + '</div>';
    // способности
    const keysSeen = {};
    for (const g of sel) for (const k of abilList(g)){ const A = ABIL[k]; const left = abilLeft(g, k); if (!keysSeen[k] || left < keysSeen[k].left) keysSeen[k] = { left, A, k }; }
    h += '<div class="abils">';
    for (const k in keysSeen){
      const { left, A } = keysSeen[k];
      h += `<button class="ab ${left > 0 ? 'cd' : ''} ${S.cast && S.cast.code === A.key ? 'cast' : ''}" data-key="${A.key}" title="${N2(A.d)}"><i>${A.icon}</i><b>${N2(A.n)}</b><kbd>${keyLabel(A.key)}</kbd>${left > 0 ? `<em>${Math.ceil(left)}</em><s style="height:${(left / A.cd * 100).toFixed(0)}%"></s>` : ''}</button>`;
    }
    h += `<button class="ab" data-act="hold"><i>⛊</i><b>${tr('Удерживать', 'Hold', 'Giữ')}</b><kbd>H</kbd></button>`;
    if (sel.some(g => isSquad(g) && (g.elite || S.teams[0].jet2))) h += `<button class="ab" data-act="sky"><i>⇑</i><b>${tr('Десант', 'Sky assault', 'Đổ bộ')}</b><kbd>Y</kbd></button>`;
    if (sel.some(g => g.cls !== 'builder')) h += `<button class="ab" data-act="fps"><i>◉</i><b>${tr('Вселиться', 'Possess', 'Nhập vai')}</b><kbd>Enter</kbd></button>`;
    h += '</div>';
    h += builderCardHTML(sel);   // v6: меню стройки для выбранных инженеров
  } else if (S.selB && (S.selB.alive || S.selB.cls === 'hq')){
    const b = S.selB;
    const nm = b.cls === 'hq' ? tr('Штаб', 'HQ', 'Sở chỉ huy') : bname(b.type);
    h += `<div class="binfo"><b>${nm}</b><span>${Math.round(max(0, b.hp))}/${b.maxhp}${b.cls === 'bld' && !b.done ? ' · ' + tr('стройка', 'building', 'công trình') + ' ' + Math.floor(b.built * 100) + '%' : ''}</span>`;
    h += siteCardHTML(b);   // v6: кто строит, сколько осталось, отмена с возвратом руды
    if (b.queue && b.queue.length) h += '<div class="queue">' + b.queue.map((k, i) => `<button data-q="${i}" title="${tr('Отменить', 'Cancel', 'Hủy')}">${PRODUCTS[k].icon} ${pname(k)}${i === 0 ? ` <s style="width:${(b.prodT / pTime(0, k) * 100).toFixed(0)}%"></s>` : ''}</button>`).join('') + '</div>';
    const prods = Object.keys(PRODUCTS).filter(k => PRODUCTS[k].at.includes(b.cls === 'hq' ? 'hq' : b.type));
    if (prods.length && (b.cls === 'hq' || b.done)) h += '<div class="abils">' + prods.map(k => { const r = rtsReason('produce:' + k); return `<button class="ab ${r.ok ? '' : 'cd'}" data-prod="${k}" title="${(r.reason + (r.fix ? ' — ' + r.fix : '')).replace(/"/g, '&quot;')}"><i>${PRODUCTS[k].icon}</i><b>${pname(k)}</b><kbd>${pCost(0, k)}</kbd></button>`; }).join('') + '</div>';
    if (prods.length) h += `<em>${tr('ПКМ по земле — точка сбора', 'RMB on the ground — rally point', 'Chuột phải xuống đất — điểm tập kết')}</em>`;
    if (b.cls === 'bld' && (b.type === 'turret' || b.type === 'aa') && b.done) h += `<em>${tr('Двойной клик — занять', 'Double-click — man it', 'Nhấp đúp — điều khiển')}</em>`;
    h += '</div>';
  } else {
    h += `<div class="binfo"><em>${tr('ЛКМ — выделить · рамка — несколько · двойной клик — вселиться · Ctrl+1…9 — группа', 'LMB — select · box — many · double-click — possess · Ctrl+1…9 — group', 'Chuột trái — chọn · khung — nhiều · nhấp đúp — nhập vai · Ctrl+1…9 — nhóm')}</em></div>`;
  }
  if (h === CARD.sig) return;
  CARD.sig = h; el.innerHTML = h;
  bindBuilderCard(el);
  el.querySelectorAll('[data-key]').forEach(b => b.onclick = e => { e.stopPropagation(); abilityKey(b.dataset.key); });
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); const a = b.dataset.act; if (a === 'hold') orderHold(); else if (a === 'sky') orderSkySel(); else enterFPS(); });
  el.querySelectorAll('[data-prod]').forEach(b => b.onclick = e => { e.stopPropagation(); uiProduce(b.dataset.prod); });
  el.querySelectorAll('[data-q]').forEach(b => b.onclick = e => { e.stopPropagation(); cancelProduct(S.selB, +b.dataset.q); emit('ui', { kind: 'ok' }); });
  el.querySelectorAll('.port').forEach((p, i) => p.onclick = e => { e.stopPropagation(); const g = sel[i]; if (!g) return; if (e.shiftKey){ S.sel.delete(g); return; } S.sel.clear(); S.sel.add(g); const L = leaderPos(g); if (L && performance.now() - (p._t || 0) < 400) flyCamTo(L); p._t = performance.now(); });
}
function updateRTSHUD(){ $('sel').textContent = ''; }
function helpRTS(){
  const L = [];
  const row = (k, t) => L.push(`<b>${k}</b> ${t}`);
  row('WASD / ←↑→↓', tr('камера (и края экрана)', 'camera (and screen edges)', 'camera (và mép màn hình)')); row('Q / E', tr('поворот', 'rotate', 'xoay')); row(tr('колесо', 'wheel', 'con lăn'), tr('высота', 'zoom', 'phóng to')); row(tr('СКМ', 'MMB', 'chuột giữa'), tr('вращать', 'orbit', 'xoay quanh'));
  row(tr('ЛКМ', 'LMB', 'Chuột trái'), tr('выделить, рамка — несколько', 'select, drag — many', 'chọn, kéo khung — nhiều')); row('Ctrl+' + tr('клик', 'click', 'nhấp'), tr('все такие на экране', 'all of that type on screen', 'mọi đơn vị cùng loại trên màn hình'));
  row(tr('ПКМ', 'RMB', 'Chuột phải'), tr('идти / захват / атаковать цель', 'move / capture / attack target', 'đi / chiếm / tấn công mục tiêu'));
  row(tr('двойной клик', 'double-click', 'nhấp đúp'), tr('вселиться', 'possess', 'nhập vai')); row('R F G T', tr('способности', 'abilities', 'kỹ năng'));
  row('Z X C V B N K', tr('стройка (выбраны инженеры): турель, ПВО, экстрактор, форпост, мехзавод, дрон-хаб, аэродок', 'build (builders selected): turret, AA, extractor, outpost, factory, hub, airdock', 'xây (đã chọn kỹ sư)'));
  row('.', tr('свободный инженер', 'idle builder', 'kỹ sư rảnh')); row('Del', tr('отменить стройку (+руда)', 'cancel construction (refund)', 'hủy xây (hoàn quặng)'));
  row('H', tr('удерживать', 'hold', 'giữ')); row('Y', tr('десант через купол', 'sky assault', 'đổ bộ')); row('Ctrl+1…9 / 1…9', tr('группы', 'groups', 'nhóm')); row('Ctrl+A', tr('вся армия', 'whole army', 'toàn quân'));
  row(tr('Пробел', 'Space', 'Space'), tr('к последней тревоге', 'jump to last alert', 'tới cảnh báo gần nhất')); row('Home', tr('к базе', 'to base', 'về căn cứ')); row('Enter / Tab', tr('в бой', 'to battle', 'vào trận')); row('I', tr('ИИ-стратег', 'AI strategist', 'chiến lược gia AI'));
  return L.join('<br>');
}

// =====================================================================
//  НАЛОЖЕНИЕ СТРАТЕГИИ
// =====================================================================
function drawRTSOverlay(dt){
  const sel = new Set(selGroups());
  drawWorldMarkers(true);
  // юниты
  const all = [...S.units, ...S.vehicles, ...S.drones, ...S.builders];
  for (const u of all){
    if (!u.alive || !facing(u.pos)) continue;
    if (u.team === 1 && u.seen[0] <= 0 && SET.fog) continue;
    const s = project(u.pos); if (!s) continue;
    const g = groupOf(u);
    const isSel = g && sel.has(g);
    const col = TEAM[u.team].css;
    if (isSel){
      octx.strokeStyle = 'rgba(140,255,170,.85)'; octx.lineWidth = 1.5;
      groundRing(u.pos, u.cls === 'tank' ? 3.2 : u.cls === 'drone' ? 1.6 : 0.9, 16);
    }
    const far = S.rts.h > 120;
    if (far || u.cls === 'builder'){
      octx.fillStyle = u.cls === 'builder' && u.team === 0 ? '#7fd4ff' : col;
      if (u.cls === 'tank') octx.fillRect(s[0] - 5, s[1] - 4, 10, 8);
      else if (u.cls === 'drone'){ octx.beginPath(); octx.moveTo(s[0], s[1] - 5); octx.lineTo(s[0] + 4, s[1] + 3); octx.lineTo(s[0] - 4, s[1] + 3); octx.fill(); }
      else { octx.beginPath(); octx.arc(s[0], s[1], u.leader ? 3.6 : 2.6, 0, PI * 2); octx.fill(); }
    }
    if (isSel || u.hp < u.maxhp * 0.95){
      const hp = add(u.pos, mul(u.up, u.cls === 'tank' ? 4 : u.cls === 'builder' ? 1.4 : 2.2));
      const q = project(hp);
      if (q){ const w = u.cls === 'tank' ? 30 : 16; octx.fillStyle = 'rgba(0,0,0,.6)'; octx.fillRect(q[0] - w / 2, q[1], w, 3); octx.fillStyle = u.hp / u.maxhp > 0.5 ? '#9c9' : u.hp / u.maxhp > 0.25 ? '#dc6' : '#e66'; octx.fillRect(q[0] - w / 2, q[1], w * max(0, u.hp) / u.maxhp, 3); }
    }
    if (u === ctrlEntity()){ octx.strokeStyle = '#7cf'; octx.lineWidth = 1.5; octx.beginPath(); octx.arc(s[0], s[1], 11, 0, PI * 2); octx.stroke(); }
  }
  // приказы выделенных
  octx.setLineDash([5, 5]); octx.lineWidth = 1.2;
  for (const g of sel){
    const L = leaderOf(g); if (!L) continue;
    const tgt = g.focus && g.focus.alive ? centerOf(g.focus) : g.goal;
    if (!tgt) continue;
    const a = project(L.pos), b = project(tgt);
    if (a && b && facing(L.pos)){ octx.strokeStyle = g.focus ? 'rgba(255,110,90,.7)' : 'rgba(255,255,255,.5)'; octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke(); }
    octx.fillStyle = '#fff'; octx.font = '600 11px "Exo 2", sans-serif'; octx.textAlign = 'center';
    if (a && facing(L.pos) && S.rts.h < 200) octx.fillText(groupLabel(g), a[0], a[1] - 18);
  }
  octx.setLineDash([]);
  // точка сбора
  const B = S.selB;
  if (B && B.rally){ const a = project(B.cls === 'hq' ? B.pos : B.pos), b = project(B.rally); if (b){ octx.strokeStyle = '#9cf'; octx.setLineDash([3, 4]); if (a){ octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke(); } octx.setLineDash([]); octx.fillStyle = '#9cf'; octx.fillRect(b[0], b[1] - 14, 10, 7); octx.fillRect(b[0], b[1] - 14, 1.5, 14); } }
  if (S.orderMark && S.orderMark.t > 0){
    S.orderMark.t -= dt;
    const s = project(S.orderMark.p);
    if (s){ octx.strokeStyle = S.orderMark.col || '#7f7'; octx.lineWidth = 2; octx.beginPath(); octx.arc(s[0], s[1], 6 + (0.8 - S.orderMark.t) * 20, 0, PI * 2); octx.stroke(); }
  }
  if (drag && hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > 6){
    octx.strokeStyle = '#8fffaa'; octx.lineWidth = 1; octx.fillStyle = 'rgba(140,255,170,.08)';
    const x = min(drag.x0, drag.x1), y = min(drag.y0, drag.y1), w = abs(drag.x1 - drag.x0), h = abs(drag.y1 - drag.y0);
    octx.fillRect(x, y, w, h); octx.strokeRect(x, y, w, h);
  }
  // прицел способности / командной способности
  if (S.cast && S.mouse){
    const p = pickGround(S.mouse[0], S.mouse[1]);
    if (p){
      const r = S.cast.kind === 'power' ? max(6, POWERS[S.cast.key].r) : 5;
      octx.strokeStyle = S.cast.kind === 'power' ? '#ffb070' : '#ffd27a'; octx.lineWidth = 2;
      groundRing(add(p, mul(norm(p), 0.4)), r, 28);
      if (S.cast.kind === 'abil'){
        octx.setLineDash([4, 6]); octx.strokeStyle = 'rgba(255,210,122,.4)';
        for (const g of sel){ const k = abilList(g).find(a => ABIL[a].key === S.cast.code); const L = leaderOf(g); if (k && L) groundRing(L.pos, ABIL[k].range, 40); }
        octx.setLineDash([]);
      }
    }
  }
  // призрак-чертёж стройки рисует drawEcoWorld → drawPlaceGhost (rts_build.js)
  // тревоги
  for (const a of S.alerts){ const k = (S.rtime - a.t); if (k > 6 || !facing(a.pos)) continue; const s = project(a.pos); if (!s) continue; octx.strokeStyle = `rgba(255,80,60,${(1 - k / 6).toFixed(2)})`; octx.lineWidth = 2; octx.beginPath(); octx.arc(s[0], s[1], 10 + (k * 30) % 30, 0, PI * 2); octx.stroke(); }
  drawRTSMinimap();
}
// ---------- миникарта: два полушария (север — наша база, юг — Рой)
const MM = { R: 62 };
function mmCenters(){ const R = MM.R, y = innerHeight - 22 - R; return [[20 + R, y], [20 + R * 3 + 14, y]]; }
function mmProject(p){
  const d = norm(p), C = mmCenters(), R = MM.R;
  if (d[1] >= 0) return [C[0][0] + d[0] * R, C[0][1] + d[2] * R, 0];
  return [C[1][0] - d[0] * R, C[1][1] + d[2] * R, 1];
}
function minimapClick(x, y, btn){
  const C = mmCenters(), R = MM.R;
  for (let i = 0; i < 2; i++){
    const dx = (x - C[i][0]) / R, dz = (y - C[i][1]) / R;
    if (dx * dx + dz * dz > 1.02) continue;
    const yy = sqrt(max(0, 1 - dx * dx - dz * dz));
    const dir = i === 0 ? [dx, yy, dz] : [-dx, -yy, dz];
    if (btn === 0) rtsLookAt(dir);
    else if (btn === 2){
      const sel = selGroups(); if (!sel.length) return true;
      const p = surfacePoint(dir, 0.5);
      for (const g of sel) setOrder(g, 'move', p, { by: 'player', lock: 120 });
      S.orderMark = { p, t: 0.8 }; emit('ui', { kind: 'ok' });
    }
    return true;
  }
  return false;
}
function drawRTSMinimap(){
  const C = mmCenters(), R = MM.R;
  octx.save();
  for (let i = 0; i < 2; i++){
    octx.beginPath(); octx.arc(C[i][0], C[i][1], R, 0, PI * 2); octx.fillStyle = 'rgba(8,12,18,.78)'; octx.fill();
    octx.strokeStyle = 'rgba(214,198,154,.4)'; octx.lineWidth = 1; octx.stroke();
    octx.fillStyle = 'rgba(214,198,154,.6)'; octx.font = '10px "Exo 2", sans-serif'; octx.textAlign = 'center';
    octx.fillText(i === 0 ? tr('СЕВЕР · МЫ', 'NORTH · US', 'BẮC · TA') : tr('ЮГ · РОЙ', 'SOUTH · SWARM', 'NAM · BẦY ĐÀN'), C[i][0], C[i][1] - R - 4);
  }
  drawFogMinimap(C, R, mmProject);
  const pt = (p, col, r, sq) => { const m = mmProject(p); octx.fillStyle = col; if (sq) octx.fillRect(m[0] - r, m[1] - r, r * 2, r * 2); else { octx.beginPath(); octx.arc(m[0], m[1], r, 0, PI * 2); octx.fill(); } };
  for (const b of S.buildings) if (b.alive && (b.team === 0 || b.known0 || !SET.fog)) pt(b.pos, TEAM[b.team].dim, 2.5, true);
  ecoMinimap(mmProject);   // v6: рудные жилы и инженеры
  for (const h of S.hq) pt(h.pos, h.alive ? TEAM[h.team].css : '#555', 4, true);
  for (const cp of S.cps){ if (cp.core) continue; const m = mmProject(cp.pos); drawDiamond(m[0], m[1], 4, teamCss(cp.owner), 'rgba(0,0,0,.6)'); }
  for (const g of groupsOf(0)){ const L = leaderOf(g); if (L) pt(L.pos, S.sel.has(g) ? '#fff' : TEAM[0].css, g.cls === 'tank' ? 2.4 : 1.8); }
  for (const g of groupsOf(1)){ for (const u of groupUnits(g)) if (u.alive && (u.seen[0] > 0 || !SET.fog)){ pt(u.pos, TEAM[1].css, u.cls === 'tank' ? 2.4 : 1.6); } }
  for (const a of S.alerts){ const k = S.rtime - a.t; if (k > 6) continue; const m = mmProject(a.pos); octx.strokeStyle = `rgba(255,80,60,${(1 - k / 6).toFixed(2)})`; octx.beginPath(); octx.arc(m[0], m[1], 4 + (k * 8) % 8, 0, PI * 2); octx.stroke(); }
  for (const s of S.strikes){ const m = mmProject(s.pos); octx.strokeStyle = s.team ? '#ff5040' : '#ffb070'; octx.beginPath(); octx.arc(m[0], m[1], 4, 0, PI * 2); octx.stroke(); }
  // камера
  const f = mmProject(rtsFocusPoint());
  octx.strokeStyle = '#7cf'; octx.lineWidth = 1.5; octx.strokeRect(f[0] - 6, f[1] - 4, 12, 8);
  octx.restore();
}
