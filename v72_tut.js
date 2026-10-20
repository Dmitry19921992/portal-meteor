// =====================================================================
//  v7.2 — «ОБУЧЕНИЕ ×4»: Стратегия / Шутер × ПК / телефон
//  Общий каркас и сценарий (STEPS72 — какие действия и в каком порядке, DEF72 — что
//  считается выполнением, метки в мире), а «как сделать» — из схемы управления (v72_ctl.js).
//  Песочница: Рой и наш ИИ-стратег выключены, капсулы и шторм отключены, свои юниты не
//  получают урона, враги — неподвижные манекены, которые не стреляют. Старое обучение
//  (tutorial.js) не тронуто: «Обучение» → «Старое обучение (v7.1)».
//  На ПК вне обучения ничего не меняется: все обёртки ниже пропускают вызов дальше, пока T72.on = false.
// =====================================================================
const T72N = {
  pc_rts: ['Стратегия (ПК)', 'Strategy (PC)', 'Chiến thuật (PC)', 'אסטרטגיה (מחשב)'],
  pc_fps: ['Шутер (ПК)', 'Shooter (PC)', 'Bắn súng (PC)', 'יריות (מחשב)'],
  ph_rts: ['Стратегия (телефон)', 'Strategy (phone)', 'Chiến thuật (điện thoại)', 'אסטרטגיה (טלפון)'],
  ph_fps: ['Шутер (телефон)', 'Shooter (phone)', 'Bắn súng (điện thoại)', 'יריות (טלפון)'],
};
const T72D = {
  rts: ['Камера, выделение, приказы, инженер и Казарма, производство, руда, переход в бой и обратно', 'Camera, selection, orders, builder and Barracks, production, ore, into battle and back', 'Camera, chọn, ra lệnh, kỹ sư và Doanh trại, sản xuất, quặng, vào trận và quay lại', 'מצלמה, בחירה, פקודות, מהנדס ומגורים, ייצור, עפרה, לקרב ובחזרה'],
  fps: ['Обзор, ходьба, ранец, стрельба, ракета, граната, рефлекс, укрытие, вселение, отряд', 'Look, walk, jetpack, shooting, rocket, grenade, reflex, cover, possession, squad', 'Nhìn, đi, ba lô, bắn, tên lửa, lựu đạn, phản xạ, ẩn nấp, nhập vai, đội', 'מבט, הליכה, סילון, ירי, רקטה, רימון, רפלקס, מחסה, השתלטות, חוליה'],
};
// сценарий: порядок действий; шаг без описания в текущей схеме пропускается
const STEPS72 = {
  fps: ['look', 'move', 'jet', 'brake', 'fire', 'aim', 'reload', 'auto', 'rocket', 'grenade', 'reflex', 'skills', 'cover', 'switch', 'squad', 'toRts', 'toFps'],
  rts: ['pan', 'zoom', 'select', 'order', 'selType', 'box', 'radial', 'cards', 'minimap', 'builder', 'build', 'construct', 'produce', 'gather', 'possess', 'toRts'],
};
const T72W = {
  here: ['СЮДА', 'HERE', 'ĐẾN ĐÂY', 'לכאן'], tgt: ['ЦЕЛЬ', 'TARGET', 'MỤC TIÊU', 'מטרה'], sel: ['ВЫБЕРИ', 'SELECT', 'CHỌN', 'בחר'],
  ord: ['ПРИКАЗ СЮДА', 'ORDER HERE', 'RA LỆNH ĐÂY', 'פקודה לכאן'], box: ['РАМКУ ВОКРУГ', 'BOX AROUND', 'KHUNG QUANH', 'מסגרת סביב'],
  hold: ['ДЕРЖИ ПАЛЕЦ ЗДЕСЬ', 'HOLD HERE', 'GIỮ Ở ĐÂY', 'החזק כאן'], eng: ['ИНЖЕНЕР', 'BUILDER', 'KỸ SƯ', 'מהנדס'],
  site: ['КАЗАРМА ЗДЕСЬ', 'BARRACKS HERE', 'DOANH TRẠI Ở ĐÂY', 'מגורים כאן'], bar: ['КАЗАРМА', 'BARRACKS', 'DOANH TRẠI', 'מגורים'],
  cry: ['КРИСТАЛЛЫ', 'CRYSTALS', 'TINH THỂ', 'גבישים'], sniper: ['СНАЙПЕР ВИДИТ ТЕБЯ', 'SNIPER SEES YOU', 'BẮN TỈA THẤY BẠN', 'הצלף רואה אותך'],
  hidden: ['НЕ ВИДИТ', 'CAN\'T SEE YOU', 'KHÔNG THẤY', 'לא רואה'], cover: ['УКРЫТИЕ', 'COVER', 'CHỖ NẤP', 'מחסה'],
  ok: ['Отлично!', 'Well done!', 'Tuyệt!', 'מצוין!'], step: ['Шаг', 'Step', 'Bước', 'שלב'], rep: ['Повторить шаг', 'Repeat step', 'Làm lại bước', 'חזור על השלב'],
  exit: ['Выход', 'Exit', 'Thoát', 'יציאה'], resume: ['Нажми «Продолжить», чтобы вернуться к обучению.', 'Press "Resume" to get back to the training.', 'Nhấn “Tiếp tục” để quay lại bài học.', 'לחץ „המשך" כדי לחזור לאימון.'],
  back: ['Сначала вернись: ', 'First go back: ', 'Trước hết quay lại: ', 'קודם חזור: '], train: ['ОБУЧЕНИЕ', 'TRAINING', 'HUẤN LUYỆN', 'אימון'],
  pcKeys: ['⌫ — повторить шаг · Esc — пауза', '⌫ — repeat step · Esc — pause', '⌫ — làm lại · Esc — tạm dừng', '⌫ — חזרה על השלב · Esc — השהיה'],
};
const T72T = {
  look: ['Обзор', 'Look around', 'Quan sát', 'מבט'], move: ['Движение', 'Movement', 'Di chuyển', 'תנועה'], jet: ['Ранец', 'Jetpack', 'Ba lô phản lực', 'סילון'],
  brake: ['Тормоз в воздухе', 'Air brake', 'Phanh trên không', 'בלימה באוויר'], fire: ['Стрельба', 'Shooting', 'Bắn', 'ירי'], aim: ['Прицел', 'Aiming', 'Ngắm', 'כוונת'],
  auto: ['АВТО-захват', 'AUTO lock', 'Khóa TỰ ĐỘNG', 'נעילת אוטו'], reload: ['Перезарядка', 'Reload', 'Nạp đạn', 'טעינה'], rocket: ['Ракета', 'Rocket', 'Tên lửa', 'רקטה'],
  grenade: ['Граната', 'Grenade', 'Lựu đạn', 'רימון'], reflex: ['Рефлекс — замедление', 'Reflex — slow motion', 'Phản xạ — chậm lại', 'רפלקס — הילוך איטי'],
  skills: ['Навыки', 'Skills', 'Kỹ năng', 'כישורים'], cover: ['Укрытие', 'Cover', 'Ẩn nấp', 'מחסה'], switch: ['Вселиться в другого', 'Jump into another unit', 'Nhập vai đơn vị khác', 'השתלטות על יחידה אחרת'],
  squad: ['Команда отряду', 'Squad command', 'Lệnh cho đội', 'פקודה לחוליה'], toRts: ['В стратегию', 'To strategy', 'Sang chiến thuật', 'לאסטרטגיה'],
  toFps: ['Обратно в бой', 'Back to battle', 'Trở lại trận', 'חזרה לקרב'], possess: ['Вселиться в бойца', 'Possess a trooper', 'Nhập vai lính', 'השתלטות על לוחם'],
  pan: ['Камера', 'Camera', 'Camera', 'מצלמה'], zoom: ['Масштаб', 'Zoom', 'Thu phóng', 'זום'], select: ['Выделение', 'Selecting', 'Chọn', 'בחירה'], order: ['Приказ', 'Order', 'Ra lệnh', 'פקודה'],
  selType: ['Все такие', 'All of a type', 'Tất cả cùng loại', 'כל הסוג'], box: ['Рамка', 'Box select', 'Chọn khung', 'מסגרת'], groups: ['Группы 1–9', 'Groups 1–9', 'Nhóm 1–9', 'קבוצות 1–9'],
  radial: ['Круговое меню', 'Radial menu', 'Menu tròn', 'תפריט עגול'], cards: ['Карточки отрядов', 'Squad cards', 'Thẻ đội', 'כרטיסי חוליות'], minimap: ['Миникарта', 'Minimap', 'Bản đồ nhỏ', 'מפה קטנה'],
  builder: ['Инженер', 'Builder', 'Kỹ sư', 'מהנדס'], build: ['Стройка: Казарма', 'Build: Barracks', 'Xây: Doanh trại', 'בנייה: מגורים'], construct: ['Здание строится', 'Under construction', 'Đang xây', 'בבנייה'],
  produce: ['Производство', 'Production', 'Sản xuất', 'ייצור'], gather: ['Добыча руды', 'Mining ore', 'Khai thác quặng', 'כריית עפרה'],
};
// ---------------------------------------------------------------- помощники мира
function T72ahead(c, m, side){ const f = tangent(c.fwd, c.up), r = norm(cross(f, c.up)); return surfacePoint(norm(add(add(c.pos, mul(f, m)), mul(r, side || 0))), 0.2); }
function T72sqs(){ return S.squads.filter(g => g.team === 0 && groupAlive(g) && !g.lone && !g.t72).sort((a, b) => a.id - b.id); }
function T72sq(i){ const L = T72sqs(); return L[i] || L[0] || null; }
function T72gp(g, lab, col){ const p = g && leaderPos(g); return p ? { p: add(p, mul(norm(p), 1.6)), label: L72(lab), col: col || '#8fffaa' } : null; }
function T72fromBase(p, m){ const d = norm(p), t = sub(d, BASES[0]); return surfacePoint(offsetOnSphere(d, len(tangent(t, d)) > 1e-4 ? t : anyTangent(d), m), 0.3); }
// две свои боевые группы ближе всего друг к другу (для шага «рамка»)
function T72pair(only){
  const L = groupsOf(0).filter(g => groupAlive(g) && g.cls !== 'builder' && !g.lone && !g.t72 && leaderPos(g) && (!only || only(g)));
  let best = null, bd = 1e9;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++){ const d = dist(leaderPos(L[i]), leaderPos(L[j])); if (d < bd){ bd = d; best = [L[i], L[j]]; } }
  return best;
}
function T72bar(){ let b = null; for (const x of S.buildings) if (x.alive && x.team === 0 && x.type === 'barracks' && !x.t72c && (!b || x.id > b.id)) b = x; return b; }
function T72tg(T){ return T.dummies.filter(u => u.alive && u !== T.sniper).map(u => ({ p: add(u.pos, mul(u.up, 1.1)), label: L72(T72W.tgt), col: '#ff5a4a' })); }
function T72energy(){ const c = ctrlEntity(); if (c && c.cls === 'inf' && c.jet) c.energy = c.jet.emax; }
const T72_INF = () => { const c = ctrlEntity(); return !!c && c.cls === 'inf'; };
// ---------------------------------------------------------------- что считается выполнением
const DEF72 = {
  look: { mode: 'fps', init(T){ T.acc = 0; T.pf = null; }, check(T){ const c = ctrlEntity(); if (!c) return false; const f = c.cls === 'inf' ? c.fwd : (c.aim || c.fwd); if (T.pf) T.acc += acos(clamp(dot(T.pf, f), -1, 1)); T.pf = f.slice(); return T.acc > 1.1; }, prog: T => T.acc / 1.1 },
  move: { mode: 'fps', init(T){ const c = ctrlEntity(); T.goal = c ? T72ahead(c, 14, 0) : null; }, check(T){ const c = ctrlEntity(); return !!(c && T.goal && dist(c.pos, T.goal) < 4.5); },
    prog(T){ const c = ctrlEntity(); return c && T.goal ? 1 - (dist(c.pos, T.goal) - 4.5) / 9.5 : 0; }, mark: T => T.goal ? [{ p: T.goal, label: L72(T72W.here), col: '#8fffaa' }] : [] },
  jet: { mode: 'fps', init(){ T72energy(); }, check(T){ const c = ctrlEntity(); return T72_INF() && T.since('h:jet') && c.airT > 0.6; } },
  brake: { mode: 'fps', init(){ T72energy(); }, check(T){ const c = ctrlEntity(); return T72_INF() && T.since('h:airbrake') && !c.grounded; } },
  fire: { mode: 'fps', init(T){ T.h0 = T.hits; const K = S.kit; if (K) K.mag[K.w] = (WEAPONS[K.w] && WEAPONS[K.w].mag) || K.mag[K.w]; }, check: T => T.hits - T.h0 >= 4, prog: T => (T.hits - T.h0) / 4, mark: T72tg },
  aim: { mode: 'fps', init(T){ T.acc = 0; }, check(T, dt){ T.acc = S.aiming ? T.acc + dt : 0; return T.acc > 0.6; }, prog: T => T.acc / 0.6 },
  auto: { mode: 'fps', init(){ if (typeof M71 !== 'undefined' && M71.pref.auto) M71.toggleAuto(); }, check: () => typeof M71 !== 'undefined' && M71.pref.auto && !!M71.lock && !!M71.lock.t72d, mark: T72tg },
  reload: { mode: 'fps', init(){ const K = S.kit; if (K){ K.reloadT = 0; K.mag[K.w] = max(1, ((WEAPONS[K.w] && WEAPONS[K.w].mag) || 12) - 8); } }, check: T => T.since('h:reload') && T.since('rkey') },
  rocket: { mode: 'fps', init(){ const c = ctrlEntity(); if (c) c.rocketCd = 0; }, check: T => T.since('h:rocket'), mark: T72tg },
  grenade: { mode: 'fps', init(){ const K = typeof G62 !== 'undefined' ? G62.kit() : null; if (K){ K.gren = G62.MAX; K.grenCd = 0; G62.btnSig = ''; } }, check: T => T.since('h:grenade'), mark: T72tg },
  reflex: { mode: 'fps', init(){ const K = S.kit; if (K){ if (K.reflexOn) toggleReflex(); K.reflex = 1; } }, check: T => T.since('h:reflex') && !!S.kit && S.kit.reflexOn },
  skills: { mode: 'fps', init(){ if (M71.sk){ M71.sk = false; M71.apply(); } }, check: () => !!M71.sk },
  cover: { mode: 'fps', init(T){ T.cover(); T.acc = 0; T.hid = false; },
    check(T, dt){ const c = ctrlEntity(), s = T.sniper; if (!c || !s || !s.alive) return false; T.hid = !los(add(s.pos, mul(s.up, 1.1)), c.cls === 'inf' ? gunEye(c) : centerOf(c)); T.acc = T.hid && T.cpos && dist(c.pos, T.cpos) > 3 ? T.acc + dt : 0; return T.acc > 0.8; },
    prog: T => T.acc / 0.8,
    mark: T => { const L = []; if (T.sniper && T.sniper.alive) L.push({ p: add(T.sniper.pos, mul(T.sniper.up, 1.4)), label: L72(T.hid ? T72W.hidden : T72W.sniper), col: T.hid ? '#9a9a9a' : '#ff5a4a' }); if (T.hide) L.push({ p: T.hide, label: L72(T72W.cover), col: '#8fffaa' }); return L; } },
  switch: { mode: 'fps', init(T){ T.ref = ctrlEntity(); }, check: T => T.since('h:switch') && !!ctrlEntity() && ctrlEntity() !== T.ref },
  squad: { mode: 'fps', menuOk: true, init(T){ T.ref = !!SET.solo; }, check: T => !!SET.solo !== T.ref },
  toRts: { check: () => S.mode === 'rts' },
  toFps: { check: () => S.mode === 'fps' },
  possess: { check: () => S.mode === 'fps' },
  // --- стратегия
  pan: { mode: 'rts', init(T){ T.ref = S.rts.dir.slice(); }, check: T => surfDist(S.rts.dir, T.ref) > 16, prog: T => surfDist(S.rts.dir, T.ref) / 16 },
  zoom: { mode: 'rts', init(T){ T.ref = S.rts.h; }, check: T => abs(Math.log(S.rts.h / T.ref)) > 0.3, prog: T => abs(Math.log(S.rts.h / T.ref)) / 0.3 },
  select: { mode: 'rts', init(T){ S.sel.clear(); S.selB = null; T.tg = T72sq(1); }, check: T => selGroups().some(isSquad) && T.since('h:select'), mark: T => [T72gp(T.tg, T72W.sel)].filter(Boolean) },
  order: { mode: 'rts', init(T){ let g = selGroups().find(isSquad) || T72sq(1); if (g && !selGroups().length) S.sel.add(g); T.tg = g; const L = g && leaderPos(g); T.goal = L ? T72fromBase(L, 26) : null; },
    check: T => !!T.goal && T.since('h:order') && groupsOf(0).some(g => g.goal && dist(g.goal, T.goal) < 22 && g.manualUntil > S.time),
    mark: T => T.goal ? [{ p: T.goal, label: L72(T72W.ord), col: '#ffd23f' }] : [] },
  // «все такие на экране»: в кадре должны быть два отряда — камера встаёт между ними и чуть выше
  selType: { mode: 'rts', init(T){ S.sel.clear(); S.selB = null; const P = T72pair(isSquad); T.tg = P ? P[0] : T72sq(0); T.tg2 = P ? P[1] : null;
      if (P){ const a = leaderPos(P[0]), b = leaderPos(P[1]); S.rts.hT = clamp(max(S.rts.h, dist(a, b) * 1.6 + 30), RTS_HMIN, 110); flyCamTo(norm(add(a, b))); } },
    check: T => T.since('selType') && selGroups().length >= 2, mark: T => [T72gp(T.tg, T72W.sel)].filter(Boolean) },
  box: { mode: 'rts', init(T){ S.sel.clear(); S.selB = null; T.tg = T72pair(); }, check: T => T.since('box') && selGroups().filter(g => g.cls !== 'builder').length >= 2,
    mark: T => { const P = T.tg && T.tg.map(g => leaderPos(g)).filter(Boolean); if (!P || P.length < 2) return []; return [{ p: surfacePoint(norm(add(P[0], P[1])), 0.5), label: L72(T72W.box), col: '#ffd23f' }]; } },
  groups: { mode: 'rts', check: T => T.cnt('h:ctlgroup') >= 2 },
  radial: { mode: 'rts', init(T){ S.sel.clear(); S.selB = null; const g = T72sq(0), L = g && leaderPos(g); T.goal = L ? T72fromBase(L, 16) : null; }, check: T => T.since('radItem'),
    mark: T => T.goal ? [{ p: T.goal, label: L72(T72W.hold), col: '#ffd23f' }] : [] },
  cards: { mode: 'rts', init(T){ S.sel.clear(); S.selB = null; T.pt = performance.now(); }, check: T => !!M71.sqTap && M71.sqTap.t > T.pt && selGroups().length === 1 },
  minimap: { mode: 'rts', check: T => T.since('mm') },
  builder: { mode: 'rts', init(T){ S.sel.clear(); S.selB = null; S.place = null; if (SIDE.tab !== 'build'){ SIDE.tab = 'build'; buildSidebar(); } const L = teamBuilders(0); T.tg = L[0] || null; }, check: () => selBuilders().length > 0,
    mark: T => T.tg && T.tg.alive ? [{ p: add(T.tg.pos, mul(norm(T.tg.pos), 1.5)), label: L72(T72W.eng), col: '#9fdcff' }] : [] },
  build: { mode: 'rts', init(T){ S.teams[0].ore = max(S.teams[0].ore, 1500); T.nid = NID; if (SIDE.tab !== 'build'){ SIDE.tab = 'build'; buildSidebar(); } const d = findSite(0, 'barracks'); T.goal = d ? mul(d, groundR(d) + 0.6) : null; },
    check: T => S.buildings.some(b => b.alive && b.team === 0 && b.type === 'barracks' && b.id >= T.nid && !b.t72c),
    mark: T => T.goal ? [{ p: T.goal, label: L72(T72W.site), col: '#ffd23f' }] : [] },
  construct: { mode: 'rts', init(T){ T.b = T72bar(); S.sel.clear(); S.selB = null; S.place = null; },
    tick(T, dt){ const b = T.b; if (b && b.alive && !b.done){ b.built = min(1, b.built + dt / 4); b.hp = max(b.hp, b.maxhp * 0.15 + b.maxhp * 0.85 * b.built); if (b.built >= 1) finishSite(b); } },
    check: T => !!T.b && T.b.done, prog: T => T.b ? T.b.built : 0, mark: T => T.b ? [{ p: add(T.b.pos, mul(T.b.up, T.b.H + 2)), label: L72(T72W.bar), col: '#9fdcff' }] : [] },
  produce: { mode: 'rts', init(T){ S.teams[0].ore = max(S.teams[0].ore, 1500); T.b = T72bar(); S.sel.clear(); S.selB = null; S.place = null; }, check: T => T.since('h:produce'),
    mark: T => T.b && !T72selB('barracks') ? [{ p: add(T.b.pos, mul(T.b.up, T.b.H + 2)), label: L72(T72W.bar), col: '#9fdcff' }] : [] },
  gather: { mode: 'rts', init(T){ S.place = null; if (!selBuilders().length){ const b = teamBuilders(0)[0]; if (b){ S.sel.clear(); S.selB = null; S.sel.add(b); } } const b = selBuilders()[0];
      // поле кристаллов в стороне от штаба (у штаба поле прячется под карточкой инженера)
      const F = typeof fields66 === 'function' ? fields66().filter(f => f.amount > 0 && surfDist(f.dir, BASES[0]) > 30).sort((x, y) => surfDist(x.dir, BASES[0]) - surfDist(y.dir, BASES[0])) : [];
      T.f = F[0] || (typeof g66NearestField === 'function' ? g66NearestField(0, b ? norm(b.pos) : BASES[0]) : null); }, check: T => T.since('gather'),
    mark: T => T.f ? [{ p: add(T.f.pos, mul(T.f.dir, 1.5)), label: L72(T72W.cry), col: '#8fffaa' }] : [] },
};
for (const k of ['fire', 'auto', 'rocket', 'grenade']) DEF72[k].dum = 1;
// ---------------------------------------------------------------- движок обучения
const T72 = {
  on: false, fin: false, id: null, kind: null, plat: null, scheme: null, steps: [], i: 0, t0: 0, E: [], okT: 0, hits: 0, nOk: 0,
  dummies: [], sniper: null, wall: null, saved: null, blocked: null, wrongShown: false, others: false, sig: '', mk0: null,
  // события шага: имя → {t: последний раз, n: сколько раз с начала шага}
  ev(n){ if (!this.on) return; const r = this.E[n]; if (!r || r.t < this.t0) this.E[n] = { t: S.rtime, n: 1 }; else { r.t = S.rtime; r.n++; } },
  since(n){ const r = this.E[n]; return !!r && r.t >= this.t0; },
  cnt(n){ const r = this.E[n]; return r && r.t >= this.t0 ? r.n : 0; },
  cur(){ return this.steps[this.i]; },
  how(a){ return CTL72.how(this.scheme, a || this.cur()); },
  doneMap(){ try { return JSON.parse(localStorage.getItem('pm_t72done') || '{}'); } catch (e){ return {}; } },
  stepsFor(id){ const sc = CTL72.schemes[CTL72.current(id.startsWith('pc') ? 'pc' : 'phone')]; return STEPS72[id.endsWith('rts') ? 'rts' : 'fps'].filter(a => sc && sc.acts[a] && DEF72[a]); },
  // ---- запуск / остановка
  start(id){
    const plat = id.startsWith('pc') ? 'pc' : 'phone', kind = id.endsWith('rts') ? 'rts' : 'fps';
    const touchOk = plat === 'phone' ? (TOUCH.on && typeof M71 !== 'undefined' && M71.on) : !TOUCH.on;
    if (!touchOk && QS.get('t72') !== id){ location.search = '?touch=' + (plat === 'phone' ? 1 : 0) + '&t72=' + id; return false; }   // другое устройство ввода — перезапуск страницы в нужном режиме
    if (this.on) this.stop();
    Object.assign(this, { id, plat, kind, scheme: CTL72.current(plat), fin: false, E: {}, hits: 0, nOk: 0, i: 0, others: this.others });
    this.saved = { solo: !!SET.solo };
    if (plat === 'phone'){ this.saved.m71 = { auto: M71.pref.auto, v70: M71.pref.v70 }; this.saved.cls = M67.pref.classic; M71.pref.auto = false; M71.pref.v70 = false; M71.pref.mmR = true; M71.sk = false; M67.pref.classic = false; try { M67.apply(); } catch (e){} M71.apply(); }
    this.starting = true; try { MENU.newGame(true); } finally { this.starting = false; }
    this.on = true; TUT.on = true;
    document.body.classList.add('t72', 't72' + plat);
    this.sandbox();
    this.steps = this.stepsFor(id);
    if (kind === 'rts') enterRTS();
    this.ui(); this.enter();
    this.curVoice(0);
    return true;
  },
  stop(){
    if (!this.on && !this.fin) return;
    this.leave(); this.clearDummies(); this.removeWall();
    this.on = false; this.fin = false; TUT.on = false;
    const sv = this.saved || {};
    if (sv.solo !== undefined && !!SET.solo !== sv.solo){ SET.solo = sv.solo; MENU.save(); }
    if (sv.m71 && typeof M71 !== 'undefined'){ M71.pref.auto = sv.m71.auto; M71.pref.v70 = sv.m71.v70; M67.pref.classic = sv.cls; M71.save(); try { M67.apply(); } catch (e){} M71.apply(); }
    document.body.classList.remove('t72', 't72pc', 't72phone');
    for (const k of ['P', 'SP', 'AR', 'G', 'OK', 'FIN']) if (this[k]) this[k].style.display = 'none';
  },
  sandbox(){
    for (const t of [0, 1]){ const T = S.teams[t]; T.ai = false; T.autoBuild = false; T.podT = 1e9; T.waveT = 1e9; T.skyT = 1e9; T.powT = 1e9; }
    S.stormT = 1e9;
    const en = x => x.team !== 1;
    S.units = S.units.filter(en); S.squads = S.squads.filter(en); S.vehicles = S.vehicles.filter(en); S.drones = S.drones.filter(en); S.builders = S.builders.filter(en);
    for (const k in UNLOCKS) PROG.unl.add(UNLOCKS[k]);
    S.teams[0].ore = max(S.teams[0].ore, 900);
    // свои группы стоят на месте (кроме отряда игрока в шутере) — метки и цели не «убегают»
    const pg = this.kind === 'fps' && S.me ? groupOf(S.me) : null;
    // стратегия: отряды и техника стоят веером в стороне от штаба, чтобы тап попадал в них, а не в штаб
    if (this.kind === 'rts'){
      const B = BASES[0], t1 = anyTangent(B), t2 = cross(B, t1); let k = 0;
      for (const g of groupsOf(0)){
        if (!groupAlive(g)) continue;
        const a = 0.9 + k * 0.5, c = surfacePoint(offsetOnSphere(B, norm(add(mul(t1, cos(a)), mul(t2, sin(a)))), 34), 0.5); k++;
        const us = groupUnits(g); us.forEach((u, i) => { const p = surfacePoint(offsetOnSphere(norm(c), norm(add(mul(t1, cos(i * 1.6)), mul(t2, sin(i * 1.6)))), i ? 2.4 : 0), u.rad || 0.5); u.pos = p; u.vel = [0, 0, 0]; u.up = norm(p); u.fwd = tangent(u.fwd || t1, u.up); });
        setOrder(g, 'hold', c, { lock: 30 });
      }
    } else for (const g of groupsOf(0)) if (g !== pg && groupAlive(g)){ const L = leaderPos(g); if (L) setOrder(g, 'hold', L, { lock: 30 }); }
    this.dummies = []; this.sniper = null; this.wall = null;
    if (typeof CUR !== 'undefined') CUR.hide();
  },
  // ---- манекены, снайпер и стена для шага «укрытие»
  dummy(p){ const sq = spawnSquad(1, false, p, 1); sq.t72 = true; const u = sq.units[0]; u.t72d = true; u.dPos = u.pos.slice(); u.hp = u.maxhp = 6000; u.seen[0] = 99; return u; },
  kill(u){ if (!u) return; const sq = u.squad; S.units = S.units.filter(x => x !== u); if (sq){ sq.units = sq.units.filter(x => x !== u); if (!sq.units.length) S.squads = S.squads.filter(s => s !== sq); } u.alive = false; },
  clearDummies(){ for (const u of this.dummies) this.kill(u); this.dummies = []; if (this.sniper){ this.kill(this.sniper); this.sniper = null; } },
  dumOk(){ const c = ctrlEntity(); if (!c) return true; const eye = c.cls === 'inf' ? gunEye(c) : centerOf(c); return this.dummies.some(u => u.alive && dist(u.pos, c.pos) < 34 && dot(norm(sub(u.pos, c.pos)), c.cls === 'inf' ? c.fwd : (c.aim || c.fwd)) > 0.2 && los(eye, centerOf(u))); },
  // три манекена перед бойцом; если холм закрывает их — пробуем другие направления (прямая видимость обязательна)
  placeDummies(){
    const c = ctrlEntity(); if (!c) return; for (const u of this.dummies) this.kill(u); this.dummies = [];
    const eye = c.cls === 'inf' ? gunEye(c) : centerOf(c), f0 = c.fwd.slice();
    let best = null;
    for (const a of [0, 0.6, -0.6, 1.2, -1.2, 2, -2, 3.1]){
      c.fwd = rotAxis(f0, c.up, a);
      const P = [-6, 0, 6].map(s => T72ahead(c, 19, s)), ok = P.filter(p => los(eye, add(p, mul(norm(p), 1)))).length;
      if (!best || ok > best.ok){ best = { P, ok, a }; } if (ok === 3) break;
    }
    c.fwd = f0;
    for (const p of best.P) this.dummies.push(this.dummy(p));
  },
  removeWall(){ if (!this.wall) return; this.wall.alive = false; S.buildings = S.buildings.filter(b => b !== this.wall); BLD_LIST = S.buildings; bgridDirty(); this.wall = null; },
  cover(){
    const c = ctrlEntity(); if (!c) return;
    for (const u of this.dummies) this.kill(u); this.dummies = []; if (this.sniper){ this.kill(this.sniper); this.sniper = null; } this.removeWall();
    const tries = [9, -9, 12, -12];
    for (let k = 0; k < tries.length; k++){
      const s = this.dummy(T72ahead(c, 32, 0)), b = makeBuilding('barracks', 0, norm(T72ahead(c, 13, tries[k])));
      b.done = true; b.built = 1; b.hp = b.maxhp; b.t72c = true; bgridDirty();
      this.sniper = s; this.wall = b;
      const d = norm(tangent(sub(b.pos, s.pos), norm(b.pos)));
      this.hide = surfacePoint(norm(add(b.pos, mul(d, b.bound * 0.55 + 2.6))), 0.3);
      if (los(add(s.pos, mul(s.up, 1.1)), c.cls === 'inf' ? gunEye(c) : centerOf(c)) || k === tries.length - 1) break;
      this.kill(s); this.sniper = null; this.removeWall();
    }
    this.cpos = c.pos.slice();
  },
  // ---- шаги
  enter(rep){
    const a = this.cur(); if (!a){ this.finish(); return; }
    const D = DEF72[a];
    Object.assign(this, { acc: 0, pf: null, goal: null, tg: null, ref: null, b: null, f: null, h0: this.hits, nid: 0, pt: 0, hid: false, hide: null, okT: 0, wrongShown: false, blocked: null });
    this.t0 = S.rtime; this.sig = '';
    if (D.dum && D.mode === S.mode && (rep || !this.dumOk())) this.placeDummies();
    if (D.init) try { D.init(this); } catch (e){ console.warn('t72 init ' + a, e); }
    if (S.mode === 'rts' && T72FLY.has(a) && D.mark){ try { const m = (D.mark(this) || [])[0]; if (m && m.p) this.focus(m.p); } catch (e){} }
    if (this.i === 0 && !rep) setTimeout(() => { if (this.on && this.i === 0) this.speak(); }, 2600); else this.speak();
  },
  // камера стратегии: цель должна быть в спокойной середине экрана (не под панелями)
  focus(p){
    const s = S.cam && facing(p) ? project(p) : null, W = innerWidth, H = innerHeight;
    if (!s || s[0] < W * 0.25 || s[0] > W * 0.72 || s[1] < H * 0.4 || s[1] > H * 0.7) flyCamTo(p);
  },
  leave(){
    const a = this.cur();
    if (a === 'cover'){ this.removeWall(); if (this.sniper){ this.kill(this.sniper); this.sniper = null; } }
    if (a === 'reflex' && S.kit && S.kit.reflexOn) toggleReflex();
    if (a === 'aim' && TOUCH.on && TOUCH.aimOn){ TOUCH.aimOn = false; mouseR = false; }
  },
  repeat(){ if (!this.on || this.fin) return; this.leave(); this.ev('repeat'); this.enter(true); emit('ui', { kind: 'ok' }); },
  next(){ this.leave(); this.i++; if (this.i >= this.steps.length) this.finish(); else this.enter(); },
  success(){
    this.okT = 0.95; this.nOk++; emit('ui', { kind: 'ok' });
    if (MENU.cur === 'pause') setTimeout(() => { if (this.on && MENU.cur === 'pause') MENU.resume(); }, 650);   // команда отряду на телефоне — из паузы обратно в бой
    if (typeof M71 !== 'undefined' && TOUCH.on) M71.haptic(25);
    if (this.nOk % 4 === 0) this.curVoice(2);
    this.toast(L72(T72W.ok));
  },
  finish(){
    this.fin = true; this.okT = 0;
    const m = this.doneMap(); m[this.id] = (m[this.id] || 0) + 1; try { localStorage.setItem('pm_t72done', JSON.stringify(m)); } catch (e){}
    this.xp = PROG.award(300, tr('обучение пройдено', 'training complete', 'hoàn thành huấn luyện', 'האימון הושלם'), 1, '#8fffaa') || 300;
    this.curVoice(2); unlockMouse(); this.render(); this.finUI();
  },
  // ---- голос: записанные фразы куратора (все языки) + браузерная речь для текста шага
  curVoice(i){ try { if (SET.unitVoice !== false && typeof VOICE66 !== 'undefined' && AU.ready()) VOICE66.play('curator', 'sel', i); } catch (e){} },
  speak(){
    if (SET.hintsVoice === false || LANG.cur === 'he') return;
    const a = this.cur(), H = this.how(a); if (!H) return;
    try { AU.speak((L72(T72T[a] || ['', '', '', '']) + '. ' + L72(H.h)).replace(/<[^>]+>/g, ''), 'hint'); } catch (e){}
  },
  // ---- кадр
  frame(dt){
    if (!this.on) return;
    if (S.events) for (const e of S.events) if (e.type === 'hitmark') this.hits++;
    if (TOUCH.on && TOUCH.fireT && !this.since('fireT')) this.ev('fireT');
    this.guard();
    if (this.fin){ this.render(); return; }
    const a = this.cur(); if (!a) return;
    const D = DEF72[a], H = this.how(a) || {};
    this.blocked = null;
    if (MENU.isOpen() && !D.menuOk){ this.render(); return; }
    if (D.mode && S.mode !== D.mode){ this.blocked = D.mode === 'rts' ? 'toRts' : 'toFps'; this.render(); return; }
    if (D.tick) try { D.tick(this, dt); } catch (e){}
    if (this.okT > 0){ this.okT -= dt; if (this.okT <= 0) this.next(); this.render(); return; }
    let ok = false;
    try { ok = S.rtime - this.t0 > 0.5 && !!D.check(this, dt); } catch (e){ if (!this.err){ this.err = 1; console.warn('t72 check ' + a, e); } }
    if (ok && H.via && !H.via(this)){ ok = false; if (H.wrong) this.wrongShown = true; }
    if (ok) this.success();
    this.render();
  },
  // песочница: манекены стоят и не стреляют, свои не стреляют по ним, никто не получает урона
  guard(){
    const me = ctrlEntity();
    for (const u of this.dummies.concat(this.sniper ? [this.sniper] : [])){
      if (!u.alive) continue;
      u.pos = u.dPos.slice(); u.vel = [0, 0, 0]; u.cd = max(u.cd || 0, 1); u.rocketCd = 99; u.target = null; u.hp = u.maxhp; u.seen[0] = 99;
    }
    for (const u of S.units) if (u.team === 0 && u !== me){ u.cd = max(u.cd, 0.4); u.rocketCd = max(u.rocketCd, 5); }
    for (const v of S.vehicles) if (v !== me){ v.cd = max(v.cd || 0, 0.5); v.mgCd = max(v.mgCd || 0, 0.5); }
    for (const d of S.drones) if (d !== me) d.cd = max(d.cd || 0, 0.5);
    const h = S.hq[0]; if (h){ h.cd = max(h.cd || 0, 0.5); h.acd = max(h.acd || 0, 0.5); }
    if (me && me.team === 0 && me.hp < me.maxhp) me.hp = me.maxhp;
  },
};
// дополнения к сценарию, которым нужен движок
DEF72.possess.init = () => { const g = T72sq(0); S.place = null; if (g){ S.sel.clear(); S.selB = null; S.sel.add(g); } };
DEF72.groups.init = () => { if (!selGroups().length){ const g = T72sq(0); if (g) S.sel.add(g); } };
CTL72.schemes.v71.acts.aim = { g: 'tap', el: () => [{ sel: '#touch [data-s="R3"]' }], h: ['Тапни «Прицел» — приближение. Ещё тап — обратно.', 'Tap "Aim" to zoom in. Tap again to zoom out.', 'Chạm “Ngắm” để phóng to. Chạm lại để thu nhỏ.', 'הקש „כוונת" לזום. הקשה נוספת — חזרה.'] };
CTL72.schemes.v71.acts.squad = { g: 'tap', el: () => MENU.cur === 'pause' ? [{ sel: '#screen [data-mm2^="solo"]' }] : M67.open ? [{ sel: '#m67sheet .pz' }] : [{ sel: '#touch .tt .m67m' }],
  h: ['Отряд идёт за тобой. Открой ☰ → «Пауза» → плитка «Отряд со мной» — станет «Действую один».', 'Your squad follows you. Open ☰ → "Pause" → the "Squad with me" tile — it becomes "Going solo".', 'Đội đi theo bạn. Mở ☰ → “Tạm dừng” → ô “Đội đi cùng” — thành “Một mình”.', 'החוליה הולכת אחריך. פתח ☰ ← „השהיה" ← „החוליה איתי" — יהפוך ל„לבד".'] };
const T72FLY = new Set(['select', 'order', 'box', 'radial', 'builder', 'build', 'construct', 'produce', 'gather']);
// «добыча»: на телефоне ещё и кнопка «◆ Добывать кристаллы» в карточке инженера
CTL72.schemes.v71.acts.gather.h = ['Инженер выбран — тапни «◆ Добывать кристаллы» в его карточке внизу (или тапни по зелёным кристаллам).', 'The builder is selected — tap "◆ Mine crystals" on its card below (or tap the green crystals).', 'Đã chọn kỹ sư — chạm “◆ Khai thác tinh thể” trên thẻ bên dưới (hoặc chạm tinh thể xanh).', 'המהנדס נבחר — הקש „◆ כריית גבישים" בכרטיס למטה (או הקש על הגבישים הירוקים).'];
CTL72.schemes.v71.acts.gather.el = () => [{ sel: '#card [data-gather]' }];
Object.assign(T72, {
  toast(t){ const E = this.OK; if (!E) return; E.innerHTML = `<b>✓</b><span>${uixEsc(t)}</span>`; E.classList.remove('on'); void E.offsetWidth; E.classList.add('on'); },
  ui(){
    if (this.P) return;
    const mk = (id, cls) => { const d = document.createElement('div'); d.id = id; if (cls) d.className = cls; document.body.appendChild(d); return d; };
    this.SP = mk('t72sp'); this.AR = mk('t72ar'); this.G = mk('t72g'); this.P = mk('t72p'); this.OK = mk('t72ok'); this.FIN = mk('t72fin');
    this.AR.innerHTML = '<div><svg viewBox="0 0 60 40"><path d="M2 14h34V3l22 17-22 17V26H2z" fill="#ffd23f" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/></svg></div>';
    const tap = (el, fn) => {
      el.addEventListener('touchstart', e => { const b = e.target.closest('[data-t72]'); if (!b) return; e.preventDefault(); e.stopPropagation(); AU.init(); fn(b.dataset.t72); }, { passive: false });
      el.addEventListener('click', e => { const b = e.target.closest('[data-t72]'); if (!b) return; e.stopPropagation(); AU.init(); fn(b.dataset.t72); });
    };
    tap(this.P, k => this.act(k)); tap(this.FIN, k => this.act(k));
  },
  act(k){
    if (k === 'rep') this.repeat();
    else if (k === 'exit' || k === 'menu'){ this.stop(); MENU.toMenu(); }
    else if (k === 'again') this.start(this.id);
    else if (k === 'nextk') this.start(this.id.replace(this.kind, this.kind === 'rts' ? 'fps' : 'rts'));
    else if (k === 'play'){ this.stop(); MENU.newGame(); }
  },
  // ---- цели подсветки → прямоугольник на экране
  rectOf(t){
    if (!t) return null;
    const W = innerWidth, H = innerHeight;
    if (t.zone) return [t.zone[0] * W, t.zone[1] * H, t.zone[2] * W, t.zone[3] * H, 'zone'];
    if (t.rect) return t.rect.slice(0, 4);
    const e = document.querySelector(t.sel); if (!e) return null;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (!r.width || !r.height || cs.display === 'none' || cs.visibility === 'hidden') return null;
    return [r.left, r.top, r.right, r.bottom];
  },
  render(){
    if (!this.P) return;
    const P = this.P, a = this.blocked || this.cur(), D = DEF72[this.cur()] || {}, H = this.how(a) || {};
    const menu = MENU.isOpen(), hide = this.fin || (menu && !D.menuOk);
    // --- панель шага
    if (this.fin || menu){ if (P.style.display !== 'none') P.style.display = 'none'; }
    else {
      const n = this.steps.length, i = this.i, ph = this.plat === 'phone';
      const kk = !ph && H.keys ? H.keys() : [], ms = !ph && H.mouse ? H.mouse : '';
      const how = this.blocked ? L72(T72W.back) + L72(H.h) : L72((this.how(this.cur()) || {}).h || ['', '', '', '']);
      const sig = [this.id, i, LANG.cur, this.blocked, this.wrongShown, this.okT > 0, innerWidth].join('|');
      if (sig !== this.sig){
        this.sig = sig;
        const mouse = ms ? `<span class="ms ms-${ms}"><svg viewBox="0 0 30 44"><rect x="2" y="2" width="26" height="40" rx="13" fill="none" stroke="currentColor" stroke-width="2.4"/><path class="l" d="M15 3v15H3V15A12 12 0 0 1 15 3z"/><path class="r" d="M15 3v15h12V15A12 12 0 0 0 15 3z"/><rect class="w" x="13" y="8" width="4" height="8" rx="2"/></svg></span>` : '';
        const gi = ph && H.g ? `<span class="gic">${IC71('hand')}</span>` : '';
        P.innerHTML = `<div class="hd"><b>${L72(T72W.train)} · ${L72(T72N[this.id])}</b><span class="n">${L72(T72W.step)} ${i + 1} / ${n}</span>` +
          `<button data-t72="rep" title="${L72(T72W.rep)}">⟲<small>${L72(T72W.rep)}</small></button><button data-t72="exit" class="x" title="${L72(T72W.exit)}">✕</button></div>` +
          `<div class="dots">${this.steps.map((s, j) => `<i class="${j < i ? 'ok' : j === i ? 'cur' : ''}"></i>`).join('')}</div>` +
          `<h4>${this.okT > 0 ? '✓ ' : ''}${L72(T72T[this.cur()] || ['', '', '', ''])}</h4>` +
          `<div class="how">${kk.map(k => `<kbd>${uixEsc(k)}</kbd>`).join('')}${mouse}${gi}<span>${how}</span></div>` +
          (this.wrongShown && H.wrong && !this.blocked ? `<p class="wr">${L72(H.wrong)}</p>` : '') +
          `<div class="bar"><s></s></div>` + (ph ? '' : `<p class="ft">${L72(T72W.pcKeys)}</p>`);
        P.classList.toggle('done', this.okT > 0);
      }
      P.style.display = 'block';
      if (ph){ const tt = document.querySelector('#touch .tt'), W = innerWidth, R = tt && tt.getBoundingClientRect().width ? tt.getBoundingClientRect().left - 8 : W * 0.78, L = W * 0.2, w = min(480, R - L); P.style.width = w + 'px'; P.style.left = (L + (R - L - w) / 2) + 'px'; }
      let pr = 0; try { pr = this.okT > 0 ? 1 : D.prog ? clamp(D.prog(this), 0, 1) : 0; } catch (e){}
      const s = P.querySelector('.bar s'); if (s) s.style.width = (pr * 100).toFixed(0) + '%';
      if (!ph){ const dn = new Set(Object.keys(keys).filter(k => keys[k]).map(keyLabel)); P.querySelectorAll('.how kbd').forEach(k => k.classList.toggle('dn', dn.has(k.textContent) || (k.textContent === 'Ctrl' && (keys.ControlLeft || keys.ControlRight))));
        const m = P.querySelector('.ms'); if (m){ m.classList.toggle('dl', mouseL); m.classList.toggle('dr', mouseR); } }
    }
    // --- подсветка, стрелка, жест
    let R = null;
    if (!hide && this.okT <= 0 && H.el){ try { for (const t of H.el(this) || []){ R = this.rectOf(t); if (R) break; } } catch (e){} }
    if (!R && menu && D.menuOk && H.el){ try { for (const t of H.el(this) || []){ R = this.rectOf(t); if (R) break; } } catch (e){} }
    const SP = this.SP, AR = this.AR, G = this.G;
    if (!R){ SP.style.display = AR.style.display = 'none'; }
    else {
      const zone = R[4] === 'zone', pad = zone ? 0 : 6, x0 = R[0] - pad, y0 = R[1] - pad, w = R[2] - R[0] + pad * 2, h = R[3] - R[1] + pad * 2;
      SP.className = zone ? 'zone' : (S.mode === 'fps' && !menu ? 'lite' : '');
      Object.assign(SP.style, { display: 'block', left: x0 + 'px', top: y0 + 'px', width: w + 'px', height: h + 'px' });
      if (zone) AR.style.display = 'none';
      else {
        const cx = x0 + w / 2, cy = y0 + h / 2, dx = innerWidth / 2 - cx, dy = innerHeight * 0.45 - cy, L = hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const k = min(abs(ux) > 1e-3 ? (w / 2) / abs(ux) : 1e9, abs(uy) > 1e-3 ? (h / 2) / abs(uy) : 1e9) + 40;
        AR.style.display = 'block'; AR.style.left = (cx + ux * k - 30) + 'px'; AR.style.top = (cy + uy * k - 20) + 'px';
        AR.firstChild.style.transform = `rotate(${Math.atan2(-uy, -ux)}rad)`;
      }
    }
    SP.style.zIndex = AR.style.zIndex = menu ? 21 : '';
    const g = !hide && this.okT <= 0 && this.plat === 'phone' && !this.blocked ? H.g : null;
    // жест без элемента интерфейса (тап по отряду, по земле) — рука над меткой в мире
    let gp = R ? [(R[0] + R[2]) / 2, (R[1] + R[3]) / 2] : null;
    if (gp && R[4] !== 'zone' && R[2] - R[0] > 110) gp = [R[2] - 46, R[3] - 30];   // широкая плитка — рука в углу, не поверх надписи
    if (g && !gp && D.mark && S.cam && (!D.mode || D.mode === S.mode)){ try { const m = (D.mark(this) || [])[0], s = m && project(m.p); if (s && s[0] > 20 && s[0] < innerWidth - 20 && s[1] > 20 && s[1] < innerHeight - 20 && (S.mode !== 'rts' || facing(m.p))) gp = [s[0], s[1] + 26]; } catch (e){} }
    if (!g || !gp){ G.style.display = 'none'; }
    else {
      if (G._g !== g){ G._g = g; G.className = 'g-' + g; G.innerHTML = `<span class="tr"></span><span class="hd">${IC71('hand')}</span><span class="hd2">${IC71('hand')}</span>`; }
      G.style.display = 'block'; G.style.left = gp[0] + 'px'; G.style.top = gp[1] + 'px'; G.style.zIndex = menu ? 22 : '';
    }
    if (this.fin) this.finUI(); else if (this.FIN.style.display !== 'none') this.FIN.style.display = 'none';
  },
  finUI(){
    const F = this.FIN, sig = this.id + LANG.cur;
    if (F._s !== sig){
      F._s = sig;
      const other = this.id.replace(this.kind, this.kind === 'rts' ? 'fps' : 'rts');
      F.innerHTML = `<div class="c"><div class="cup">🏆</div><h2>${tr('Обучение пройдено!', 'Training complete!', 'Hoàn thành huấn luyện!', 'האימון הושלם!')}</h2><p class="sub">${L72(T72N[this.id])} · ${this.steps.length} ${tr('шагов', 'steps', 'bước', 'שלבים')} · <b>+${this.xp || 300} XP</b></p>` +
        `<p>${this.kind === 'rts' ? tr('Ты умеешь строить базу, заказывать войска, командовать и прыгать в бой. Дальше — настоящий матч: Куратор подскажет по ходу игры.', 'You can build a base, order troops, command and jump into battle. Next — a real match: the Curator will help as you play.', 'Bạn đã biết xây căn cứ, gọi quân, chỉ huy và vào trận. Tiếp theo — trận thật: Người hướng dẫn sẽ giúp.', 'אתה יודע לבנות בסיס, להזמין כוחות, לפקד ולקפוץ לקרב. הלאה — משחק אמיתי: האוצר יעזור תוך כדי.') : tr('Ты умеешь двигаться, летать, стрелять, прятаться и командовать отрядом. Дальше — настоящий матч.', 'You can move, fly, shoot, take cover and command your squad. Next — a real match.', 'Bạn đã biết di chuyển, bay, bắn, ẩn nấp và chỉ huy đội. Tiếp theo — trận thật.', 'אתה יודע לנוע, לעוף, לירות, להסתתר ולפקד על החוליה. הלאה — משחק אמיתי.')}</p>` +
        `<div class="b"><button data-t72="play" class="pri">▶ ${tr('Настоящий бой', 'Real battle', 'Trận thật', 'קרב אמיתי')}</button><button data-t72="nextk">${L72(T72N[other])}</button><button data-t72="again">⟲ ${tr('Ещё раз', 'Again', 'Lần nữa', 'שוב')}</button><button data-t72="menu">${tr('В меню', 'Main menu', 'Menu chính', 'תפריט ראשי')}</button></div></div>`;
    }
    F.style.display = MENU.isOpen() ? 'none' : 'flex';
  },
  // ---- метки в мире (рисуются поверх кадра)
  drawMarks(){
    if (!this.on || this.fin || MENU.isOpen() || !S.cam) return;
    const D = DEF72[this.cur()]; if (!D || !D.mark || (D.mode && S.mode !== D.mode) || this.okT > 0) return;
    let M = []; try { M = D.mark(this) || []; } catch (e){ return; }
    const W = innerWidth, H = innerHeight, t = performance.now() / 1000;
    for (const m of M){
      if (!m || !m.p) continue;
      let s = project(m.p);
      const vis = s && (S.mode !== 'rts' || facing(m.p)) && s[0] > 30 && s[0] < W - 30 && s[1] > 30 && s[1] < H - 30;
      octx.save(); octx.strokeStyle = m.col; octx.fillStyle = m.col; octx.lineWidth = 3;
      if (vis){
        const r = 15 + 4 * sin(t * 5), by = s[1] - 34 - 8 * abs(sin(t * 4));
        octx.beginPath(); octx.arc(s[0], s[1], r, 0, 6.2832); octx.stroke();
        octx.globalAlpha = 0.35; octx.beginPath(); octx.arc(s[0], s[1], r + 9, 0, 6.2832); octx.stroke(); octx.globalAlpha = 1;
        octx.beginPath(); octx.moveTo(s[0], by + 16); octx.lineTo(s[0] - 11, by); octx.lineTo(s[0] - 4, by); octx.lineTo(s[0] - 4, by - 14); octx.lineTo(s[0] + 4, by - 14); octx.lineTo(s[0] + 4, by); octx.lineTo(s[0] + 11, by); octx.closePath();
        octx.fill(); octx.strokeStyle = '#000'; octx.lineWidth = 1.5; octx.stroke();
        this.pill(m.label, s[0], by - 26, m.col);
      } else {
        let dx, dy;
        if (s && s[2] > 0){ dx = s[0] - W / 2; dy = s[1] - H / 2; }
        else { const v = sub(m.p, S.cam.pos); dx = dot(v, S.cam.right); dy = -dot(v, S.cam.up); if (abs(dx) + abs(dy) < 1e-3) dx = 1; }
        // стрелка у края экрана; сверху — ниже панели обучения, чтобы её не закрывала панель
        const top = this.P && this.P.style.display !== 'none' ? this.P.getBoundingClientRect().bottom + 30 : 48, cy = (top + H - 48) / 2;
        const L = hypot(dx, dy), ux = dx / L, uy = dy / L, k = min((W / 2 - 48) / max(1e-3, abs(ux)), (uy < 0 ? cy - top : H - 48 - cy) / max(1e-3, abs(uy)));
        const x = W / 2 + ux * k, y = cy + uy * k, a = Math.atan2(uy, ux);
        octx.save(); octx.translate(x, y); octx.rotate(a); octx.beginPath(); octx.moveTo(22, 0); octx.lineTo(-10, -16); octx.lineTo(-4, 0); octx.lineTo(-10, 16); octx.closePath(); octx.fill(); octx.strokeStyle = '#000'; octx.lineWidth = 1.5; octx.stroke(); octx.restore();
        this.pill(m.label, clamp(x - ux * 40, 60, W - 60), clamp(y - uy * 34, 40, H - 30), m.col);
      }
      octx.restore();
    }
  },
  pill(text, x, y, col){
    octx.font = '700 13px "Exo 2", Consolas, sans-serif'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
    const w = octx.measureText(text).width + 16;
    octx.fillStyle = 'rgba(0,0,0,.72)'; octx.fillRect(x - w / 2, y - 11, w, 22); octx.strokeStyle = col; octx.lineWidth = 1.5; octx.strokeRect(x - w / 2, y - 11, w, 22);
    octx.fillStyle = col; octx.fillText(text, x, y + 1); octx.textBaseline = 'alphabetic';
  },
});
// ---------------------------------------------------------------------
//  МЕНЮ «ОБУЧЕНИЕ»: 4 плитки (свои для устройства + «показать другие»), «Старое обучение (v7.1)»
// ---------------------------------------------------------------------
function T72devPlat(){ return TOUCH.on ? 'phone' : 'pc'; }
MENU.html_t72 = function(){
  const pl = T72devPlat(), dn = T72.doneMap(), all = T72.others;
  const ids = all ? ['pc_rts', 'pc_fps', 'ph_rts', 'ph_fps'] : pl === 'pc' ? ['pc_rts', 'pc_fps'] : ['ph_rts', 'ph_fps'];
  const icon = id => (id.endsWith('rts') ? IC71('army') : IC71('aim')) + (id.startsWith('pc') ? '<em>⌨</em>' : '<em>📱</em>');
  const tile = id => `<button class="t72tile ${id.startsWith(pl === 'pc' ? 'pc' : 'ph') ? 'mine' : 'other'}" data-t72go="${id}">${icon(id)}<b>${L72(T72N[id])}</b><small>${L72(T72D[id.endsWith('rts') ? 'rts' : 'fps'])}</small><span class="st">${T72.stepsFor(id).length} ${tr('шагов', 'steps', 'bước', 'שלבים')}${dn[id] ? ' · ✓ ' + tr('пройдено', 'done', 'xong', 'הושלם') : ''}</span></button>`;
  return `<div class="t72menu"><div class="hdr"><button id="m_back" class="bk">‹ ${tr('Назад', 'Back', 'Quay lại', 'חזרה')}</button><h2>${tr('ОБУЧЕНИЕ', 'TRAINING', 'HUẤN LUYỆN', 'אימון')}</h2>` +
    `<span class="dev">${pl === 'pc' ? tr('у тебя ПК: клавиатура и мышь', 'you are on PC: keyboard and mouse', 'bạn dùng PC: bàn phím và chuột', 'אתה במחשב: מקלדת ועכבר') : tr('у тебя телефон: сенсорный экран', 'you are on a phone: touch screen', 'bạn dùng điện thoại: màn hình cảm ứng', 'אתה בטלפון: מסך מגע')}</span></div>` +
    `<p class="sub">${tr('Безопасная песочница: враги — неподвижные манекены, по тебе никто не стреляет. Шаг засчитывается, только когда ты сам сделал действие.', 'A safe sandbox: enemies are still dummies, nobody shoots at you. A step counts only when you actually do the action.', 'Sa bàn an toàn: kẻ địch là hình nộm đứng yên, không ai bắn bạn. Mỗi bước chỉ tính khi bạn thật sự làm.', 'ארגז חול בטוח: האויבים הם בובות, אף אחד לא יורה בך. שלב נספר רק כשאתה באמת מבצע את הפעולה.')}</p>` +
    `<div class="grid ${all ? 'g4' : ''}">${ids.map(tile).join('')}</div>` +
    `<div class="row"><button data-t72o="1" class="${all ? 'on' : ''}">${all ? '☑' : '☐'} ${tr('Показать другие (обучения для другого устройства)', 'Show others (training for the other device)', 'Hiện các bài cho thiết bị khác', 'הצג אחרים (אימון למכשיר האחר)')}</button>` +
    `<button id="m_t72old">${tr('Старое обучение (v7.1)', 'Old training (v7.1)', 'Huấn luyện cũ (v7.1)', 'אימון ישן (v7.1)')}</button>` +
    (QS.get('touch') !== null ? `<button id="m_t72norm">${tr('Вернуть обычный режим устройства', 'Back to the normal device mode', 'Về chế độ thiết bị bình thường', 'חזרה למצב המכשיר הרגיל')}</button>` : '') + `</div>` +
    (all ? `<p class="note">${tr('Обучение для другого устройства перезапустит страницу в его режиме (ПК — мышь и клавиатура, телефон — касания; на ПК касания удобно проверять в Chrome: F12 → значок телефона).', 'Training for the other device reloads the page in its mode (PC — mouse and keyboard, phone — touch; on a PC you can test touch in Chrome: F12 → phone icon).', 'Bài cho thiết bị khác sẽ tải lại trang ở chế độ đó (PC — chuột và bàn phím, điện thoại — cảm ứng; trên PC thử cảm ứng trong Chrome: F12 → biểu tượng điện thoại).', 'אימון למכשיר האחר טוען מחדש את הדף במצב שלו (מחשב — עכבר ומקלדת, טלפון — מגע; במחשב אפשר לבדוק מגע ב-Chrome: F12 → סמל הטלפון).')}</p>` : '') + `</div>`;
};
{ const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.call(this, name);
    const el = $('screen'); if (!el) return;
    if (name === 'main') el.querySelectorAll('#m_tutorial').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); MENU.show('t72', true); });
    if (name !== 't72') return;
    el.querySelectorAll('[data-t72go]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); T72.start(b.dataset.t72go); });
    el.querySelectorAll('[data-t72o]').forEach(b => b.onclick = e => { e.stopPropagation(); T72.others = !T72.others; try { localStorage.setItem('pm_t72others', T72.others ? '1' : ''); } catch (er){} MENU.show('t72'); });
    const ob = $('m_t72old'); if (ob) ob.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); MENU.newGame(true); };
    const bk = $('m_back'); if (bk) bk.onclick = e => { e.stopPropagation(); MENU.back(); };
    const nb = $('m_t72norm'); if (nb) nb.onclick = e => { e.stopPropagation(); location.search = ''; };
  }; }
try { T72.others = !!localStorage.getItem('pm_t72others'); } catch (e){}
// ---------------------------------------------------------------------
//  ВСТРАИВАНИЕ (все обёртки ничего не делают, пока T72.on = false)
// ---------------------------------------------------------------------
{
  const safe = (fn, tag) => { try { return fn(); } catch (e){ if (!T72.err2){ T72.err2 = 1; console.warn('t72 ' + tag, e); } } };
  // старое обучение не мешает новому; при выходе из матча — выключаемся
  { const ts0 = TUT.step; TUT.step = function(dt){ if (T72.on) return; return ts0.call(this, dt); }; }
  { const st0 = TUT.start; TUT.start = function(){ if (T72.starting){ this.on = true; this.i = 0; this.done = false; return; } return st0.call(this); }; }
  { const tr0 = TUT.render; TUT.render = function(){ if (T72.on){ const el = $('tut'); if (el && el.style.display !== 'none') el.style.display = 'none'; return; } return tr0.call(this); }; }
  { const to0 = TUT.overlay; TUT.overlay = function(){ if (T72.on) return; return to0.call(this); }; }
  { const ng0 = MENU.newGame; MENU.newGame = function(t){ if (T72.on && !T72.starting) T72.stop(); return ng0.apply(this, arguments); }; }
  { const tm0 = MENU.toMenu; MENU.toMenu = function(){ if (T72.on) T72.stop(); return tm0.apply(this, arguments); }; }
  { const lg0 = MENU.loadGame; MENU.loadGame = function(){ if (T72.on) T72.stop(); return lg0.apply(this, arguments); }; }
  { const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); if (T72.on){ safe(() => T72.frame(dt), 'frame'); safe(() => T72.drawMarks(), 'marks'); } }; }
  // события «как именно сделано»
  { const hu0 = HINTS.used; HINTS.used = function(a){ if (T72.on) T72.ev('h:' + a); return hu0.call(this, a); }; }
  { const am0 = M71 && M71.used; if (am0) M71.used = function(k){ if (T72.on) T72.ev('m71:' + k); return am0.call(this, k); }; }
  { const mc0 = minimapClick; minimapClick = function(x, y, b){ const r = mc0(x, y, b); if (r && T72.on) T72.ev('mm'); return r; }; }
  { const ex0 = typeof g66Start === 'function' ? g66Start : null; if (ex0) g66Start = function(b, f, byPlayer){ const r = ex0(b, f, byPlayer); if (T72.on && byPlayer) T72.ev('gather'); return r; }; }
  { const ss0 = MISSION.setSolo; MISSION.setSolo = function(v){ if (T72.on) T72.ev('solo'); return ss0.call(this, v); }; }
  // рамка (ЛКМ-перетаскивание на ПК, удержание+тянуть на телефоне) и «все такие» (2× тап / Ctrl+клик)
  addEventListener('mousedown', e => { if (T72.on && S.mode === 'rts' && e.button === 0) T72.md = [e.clientX, e.clientY, e.ctrlKey]; }, true);
  addEventListener('mouseup', e => {
    if (!T72.on || S.mode !== 'rts' || e.button !== 0 || !T72.md) return;
    const [x0, y0, ctrl] = T72.md; T72.md = null;
    setTimeout(() => { if (hypot(e.clientX - x0, e.clientY - y0) >= 6) T72.ev('box'); else if (ctrl && selGroups().length >= 2) T72.ev('selType'); }, 0);
  }, true);
  if (typeof M71 !== 'undefined'){
    // 2× тап по своему юниту выделяет «всех таких» (одиночный тап — всегда ровно одного)
    const rt0 = M71.rtsTap; M71.rtsTap = function(x, y){ const r = rt0.call(this, x, y); if (T72.on && this.lastTapG && S.sel.size >= 2) T72.ev('selType'); return r; };
    // пункт кругового меню: кнопка вызывает it.f() того же объекта — подменяем f
    const ro0 = M71.radOpenAt; M71.radOpenAt = function(x, y){ const r = ro0.call(this, x, y); if (T72.on && this.radOpen && this.radItems) for (const it of this.radItems){ if (it.ic === 'play') continue; const f = it.f; it.f = () => { T72.ev('radItem'); f(); }; } return r; };   // «Вселиться» не считается — шаг про приказы
  }
  // куратор стратегии молчит, пока идёт обучение (у обучения свои подсказки)
  if (typeof CUR !== 'undefined'){ const cf0 = CUR.frame; CUR.frame = function(dt){ if (T72.on){ this.hide(); return; } return cf0.call(this, dt); }; }
  // ПК: ⌫ — повторить шаг
  addEventListener('keydown', e => {
    if (!T72.on || T72.fin || MENU.isOpen()) return;
    if (e.code === 'Backspace'){ e.preventDefault(); T72.repeat(); }
    else if (e.code === SET.bind.reload && !e.repeat) T72.ev('rkey');
  }, true);
  // песочница: никто не получает урона (кроме манекенов — они бессмертны)
  { const dm0 = damage; damage = function(e, dmg, src, ptype){ if (T72.on){ if (e && e.t72d){ e.flash = 1; if (isPlayerSrc(src) && S.mode === 'fps'){ S.hitT = 0.15; emit('hitmark', {}); } return; } if (e && e.team === 0) return; } return dm0(e, dmg, src, ptype); }; }
  { const kb0 = knockback; knockback = function(p, dmg, radius){ if (T72.on) return; return kb0(p, dmg, radius); }; }
  // автосохранение и побочные задания в обучении не нужны
  { const sa0 = SAVE.auto; SAVE.auto = function(){ if (T72.on) return; return sa0.call(this); }; }
  // манекены и снайпер не стреляют (бот-ввод: только стоять)
  { const bi0 = botInput; botInput = function(u, dt){ if (T72.on && u.t72d){ const Up = norm(u.pos); return { wish: [0, 0, 0], speedMul: 1, jump: false, thrust: false, thrustDir: Up, lift: false, fire: false, aim: null, rocket: false }; } return bi0(u, dt); }; }
  // запуск из адресной строки: ?t72=ph_fps (после переключения режима ввода)
  { const q = QS.get('t72'); if (q && T72N[q]){ const go = () => { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main'){ T72.start(q); } else setTimeout(go, 300); }; setTimeout(go, 600); } }
}
// ---------------------------------------------------------------------
//  СТИЛИ (только элементы обучения #t72* и экран меню .t72menu — в обычной игре их нет)
// ---------------------------------------------------------------------
(function t72css(){
  const st = document.createElement('style'); st.id = 't72css';
  st.textContent = `
  #t72p{position:fixed;left:50%;top:76px;transform:translateX(-50%);width:min(560px,58vw);z-index:17;display:none;pointer-events:auto;font-family:"Exo 2",sans-serif;
    background:linear-gradient(180deg,rgba(8,20,32,.95),rgba(6,14,22,.92));border:2px solid rgba(255,210,63,.75);border-radius:12px;padding:8px 12px 9px;color:#eef3f8;box-shadow:0 6px 26px rgba(0,0,0,.55)}
  body.t72phone #t72p{transform:none;top:calc(var(--st,0px) + 6px);padding:6px 10px 7px;border-radius:10px}
  body.t72pc.rtsm #t72p{top:70px}
  #t72p.done{border-color:#8fffaa;box-shadow:0 0 0 3px rgba(143,255,170,.25),0 6px 26px rgba(0,0,0,.55)}
  #t72p .hd{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.08em;color:#ffd23f}
  #t72p .hd b{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #t72p .hd .n{color:#cfd8e2;white-space:nowrap}
  #t72p .hd button{display:flex;align-items:center;gap:4px;height:28px;padding:0 9px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;font:600 12px "Exo 2";cursor:pointer;white-space:nowrap}
  #t72p .hd button small{font-size:11px} #t72p .hd button.x{width:30px;justify-content:center;padding:0;font-size:14px}
  body.t72phone #t72p .hd button small{display:none} body.t72phone #t72p .hd button{height:34px;min-width:38px;justify-content:center;font-size:17px}
  #t72p .dots{display:flex;gap:3px;margin:5px 0 4px} #t72p .dots i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.18)}
  #t72p .dots i.ok{background:#8fffaa} #t72p .dots i.cur{background:#ffd23f;box-shadow:0 0 6px #ffd23f}
  #t72p h4{margin:2px 0 3px;font:400 19px "Russo One",sans-serif;color:#fff} body.t72phone #t72p h4{font-size:16px;margin:0 0 2px}
  #t72p .how{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:15px;line-height:1.35;color:#e6edf4} body.t72phone #t72p .how{font-size:13px;line-height:1.3;gap:5px}
  #t72p .how > span:last-child{flex:1 1 220px}
  #t72p kbd{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;padding:0 7px;border-radius:7px;background:#e9edf2;color:#111;font:700 15px Consolas,monospace;
    border-bottom:4px solid #9aa4ae;animation:t72k 1.2s ease-in-out infinite}
  #t72p kbd:nth-child(2){animation-delay:.15s} #t72p kbd:nth-child(3){animation-delay:.3s} #t72p kbd:nth-child(4){animation-delay:.45s}
  #t72p kbd.dn{background:#ffd23f;border-bottom-width:1px;transform:translateY(3px);animation:none}
  @keyframes t72k{0%,70%,100%{transform:none;border-bottom-width:4px}80%{transform:translateY(3px);border-bottom-width:1px}}
  #t72p .ms{display:inline-flex;width:28px;height:40px;color:#e9edf2} #t72p .ms svg{width:100%;height:100%} #t72p .ms path,#t72p .ms rect.w{fill:transparent}
  #t72p .ms-lmb .l,#t72p .ms-drag .l,#t72p .ms.dl .l{fill:#ffd23f;animation:t72b 1s infinite} #t72p .ms-rmb .r,#t72p .ms.dr .r{fill:#ffd23f;animation:t72b 1s infinite}
  #t72p .ms-wheel .w{fill:#ffd23f;animation:t72w .8s infinite} #t72p .ms-move,#t72p .ms-drag{animation:t72m 1.6s ease-in-out infinite}
  @keyframes t72b{0%,100%{opacity:1}50%{opacity:.25}} @keyframes t72w{0%{transform:translateY(-3px)}100%{transform:translateY(4px)}}
  @keyframes t72m{0%,100%{transform:translateX(-7px)}50%{transform:translateX(7px)}}
  #t72p .gic{display:inline-flex;width:30px;height:30px;color:#ffd23f} #t72p .gic .ic71{width:30px;height:30px}
  #t72p .wr{margin:4px 0 0;padding:3px 7px;border-left:3px solid #ff9a5a;color:#ffd0b0;font-size:13px;background:rgba(255,120,60,.12)}
  #t72p .bar{height:4px;margin-top:6px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden} #t72p .bar s{display:block;height:100%;width:0;background:#8fffaa;transition:width .15s}
  #t72p .ft{margin:4px 0 0;font-size:11px;color:#95a3b2}
  html[lang=he] #t72p .how,html[lang=he] #t72p h4,html[lang=he] #t72p .wr{direction:rtl;unicode-bidi:plaintext}
  /* подсветка: всё остальное затемнено, нужный элемент — в жёлтой пульсирующей рамке */
  #t72sp{position:fixed;display:none;z-index:16;pointer-events:none;border:3px solid #ffd23f;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,.5),0 0 18px 4px rgba(255,210,63,.8);animation:t72p 1s ease-in-out infinite}
  #t72sp.lite{box-shadow:0 0 0 9999px rgba(0,0,0,.28),0 0 18px 4px rgba(255,210,63,.8)}
  #t72sp.zone{border:3px dashed rgba(255,210,63,.85);box-shadow:none;background:rgba(255,210,63,.07);animation:none}
  @keyframes t72p{0%,100%{outline:0 solid rgba(255,210,63,.5);outline-offset:0}50%{outline:8px solid rgba(255,210,63,0);outline-offset:6px}}
  #t72ar{position:fixed;display:none;z-index:18;width:60px;height:40px;pointer-events:none}
  #t72ar > div{width:60px;height:40px;filter:drop-shadow(0 2px 4px #000)} #t72ar svg{width:60px;height:40px;animation:t72a .7s ease-in-out infinite alternate}
  @keyframes t72a{from{transform:translateX(-7px)}to{transform:translateX(5px)}}
  /* жест: рука и след */
  #t72g{position:fixed;display:none;z-index:19;width:0;height:0;pointer-events:none}
  #t72g .hd,#t72g .hd2{position:absolute;left:-8px;top:-4px;width:52px;height:52px;color:#fff;filter:drop-shadow(0 2px 3px #000)} #t72g .ic71{width:52px;height:52px}
  #t72g .hd2{display:none} #t72g .tr{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:3px solid #ffd23f;opacity:0}
  #t72g.g-tap .hd{animation:t72tap 1.1s infinite} #t72g.g-tap .tr{animation:t72ring 1.1s infinite}
  #t72g.g-dtap .hd{animation:t72dt 1.3s infinite} #t72g.g-dtap .tr{animation:t72dr 1.3s infinite}
  #t72g.g-hold .hd{animation:t72hold 1.8s infinite} #t72g.g-hold .tr{animation:t72hr 1.8s infinite}
  #t72g.g-swipe .hd{animation:t72sw 1.4s infinite} #t72g.g-swipe .tr{width:110px;height:6px;left:-55px;top:-3px;border:0;border-radius:3px;background:linear-gradient(90deg,transparent,#ffd23f);animation:t72swt 1.4s infinite}
  #t72g.g-joy .hd{animation:t72joy 2s infinite} #t72g.g-joy .tr{width:90px;height:90px;left:-45px;top:-45px;border:3px solid rgba(255,255,255,.5);opacity:.8}
  #t72g.g-swipeUp .hd{animation:t72su 1.2s infinite} #t72g.g-swipeUp .tr{width:6px;height:80px;left:-3px;top:-80px;border:0;border-radius:3px;background:linear-gradient(0deg,transparent,#ffd23f);animation:t72sut 1.2s infinite}
  #t72g.g-drag .hd{animation:t72dg 2.2s infinite} #t72g.g-drag .tr{border-radius:3px;border:2px dashed #ffd23f;animation:t72dgr 2.2s infinite}
  #t72g.g-pinch .hd,#t72g.g-pinch .hd2{display:block} #t72g.g-pinch .hd{animation:t72pa 1.5s infinite} #t72g.g-pinch .hd2{transform:scaleX(-1);animation:t72pb 1.5s infinite}
  @keyframes t72tap{0%,100%{transform:translateY(-8px)}40%{transform:translateY(0) scale(.92)}}
  @keyframes t72ring{0%,35%{opacity:0;transform:scale(.4)}45%{opacity:1}100%{opacity:0;transform:scale(1.8)}}
  @keyframes t72dt{0%,100%{transform:translateY(-8px)}20%,50%{transform:translateY(0) scale(.92)}35%{transform:translateY(-6px)}}
  @keyframes t72dr{0%,15%{opacity:0;transform:scale(.4)}22%{opacity:1}40%{opacity:0;transform:scale(1.4)}48%{opacity:1;transform:scale(.4)}70%{opacity:0;transform:scale(1.6)}100%{opacity:0}}
  @keyframes t72hold{0%{transform:translateY(-8px)}15%,80%{transform:translateY(0) scale(.92)}100%{transform:translateY(-8px)}}
  @keyframes t72hr{0%,15%{opacity:0;transform:scale(.3)}75%{opacity:1;transform:scale(1.6)}100%{opacity:0;transform:scale(1.6)}}
  @keyframes t72sw{0%{transform:translateX(-55px)}70%,100%{transform:translateX(55px)}} @keyframes t72swt{0%{opacity:0}40%{opacity:1}100%{opacity:0}}
  @keyframes t72joy{0%,100%{transform:translate(0,0)}25%{transform:translate(0,-34px)}50%{transform:translate(30px,-20px)}75%{transform:translate(-26px,-10px)}}
  @keyframes t72su{0%{transform:translateY(0)}70%,100%{transform:translateY(-80px);opacity:.4}} @keyframes t72sut{0%{opacity:0}50%{opacity:1}100%{opacity:0}}
  @keyframes t72dg{0%,20%{transform:translate(-50px,-30px)}75%,100%{transform:translate(50px,30px)}}
  @keyframes t72dgr{0%,20%{left:-50px;top:-30px;width:0;height:0;opacity:1}75%,100%{left:-50px;top:-30px;width:100px;height:60px;opacity:1}}
  @keyframes t72pa{0%,100%{transform:translate(-14px,-14px)}50%{transform:translate(-50px,-40px)}} @keyframes t72pb{0%,100%{transform:scaleX(-1) translate(-14px,14px)}50%{transform:scaleX(-1) translate(-50px,40px)}}
  /* «Отлично!» и финал */
  #t72ok{position:fixed;left:50%;top:44%;z-index:19;display:none;transform:translate(-50%,-50%);pointer-events:none;align-items:center;gap:10px;padding:10px 22px;border-radius:40px;background:rgba(10,40,20,.9);border:2px solid #8fffaa;color:#8fffaa;font:400 24px "Russo One",sans-serif}
  #t72ok b{font-size:30px} #t72ok.on{display:flex;animation:t72ok .95s ease-out forwards}
  @keyframes t72ok{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-60%) scale(1)}}
  #t72fin{position:fixed;inset:0;z-index:19;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);pointer-events:auto;font-family:"Exo 2",sans-serif}
  #t72fin .c{width:min(560px,90vw);max-height:92vh;overflow:auto;background:linear-gradient(180deg,#14261a,#0b140e);border:2px solid #8fffaa;border-radius:16px;padding:16px 20px;text-align:center;color:#e8f4ec}
  #t72fin .cup{font-size:54px;line-height:1;animation:t72cup 1.6s ease-in-out infinite} @keyframes t72cup{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-8px) rotate(6deg)}}
  #t72fin h2{margin:6px 0 2px;font:400 26px "Russo One",sans-serif;color:#8fffaa} #t72fin .sub{color:#ffd23f;margin:0 0 8px} #t72fin p{margin:6px 0;line-height:1.4}
  #t72fin .b{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px} #t72fin button{min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:600 15px "Exo 2";cursor:pointer}
  #t72fin button.pri{background:#2f8f4e;border-color:#8fffaa}
  @media (max-height:500px){ #t72fin .cup{font-size:34px} #t72fin h2{font-size:20px} #t72fin p{font-size:13px;margin:3px 0} #t72fin .b{grid-template-columns:repeat(4,1fr);margin-top:8px} #t72fin button{font-size:13px;min-height:40px} }
  /* во время обучения: подсказки старых систем молчат */
  body.t72 #hint, body.t72 #m71gh, body.t72 #cur, body.t72 #cam66, body.t72 #m67cam{display:none!important}
  body.t72pc.rtsm #feed{top:250px} body.t72phone.rtsm #feed{top:auto;bottom:30vh}
  /* экран «Обучение» */
  #screen .t72menu{width:min(980px,94vw);max-height:96vh;overflow:auto;display:flex;flex-direction:column;gap:10px;font-family:"Exo 2",sans-serif;color:#e8dcb8}
  .t72menu .hdr{display:flex;align-items:center;gap:12px} .t72menu h2{margin:0;font:400 28px "Russo One",sans-serif;color:#ffd23f;flex:1}
  .t72menu .dev{font-size:13px;color:#9fdcff;border:1px solid rgba(159,220,255,.4);border-radius:20px;padding:3px 10px}
  #screen .t72menu .bk{margin:0;min-height:40px;padding:0 14px;border-radius:10px} .t72menu .sub{margin:0;font-size:14px;color:#cfc6ad}
  .t72menu .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px} .t72menu .grid.g4{grid-template-columns:repeat(4,1fr);gap:8px}
  #screen .t72tile{position:relative;margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:14px 14px 12px;min-height:150px;border-radius:14px;text-align:left;
    border:2px solid rgba(255,210,63,.55);background:linear-gradient(160deg,rgba(40,34,18,.9),rgba(16,14,10,.9));cursor:pointer}
  #screen .t72tile.other{border-color:rgba(159,220,255,.4);background:linear-gradient(160deg,rgba(18,30,44,.9),rgba(10,14,20,.9))}
  #screen .t72tile:hover{border-color:#ffd23f;transform:translateY(-2px)} .t72tile .ic71{width:38px;height:38px;color:#ffd23f} .t72tile.other .ic71{color:#9fdcff}
  .t72tile em{position:absolute;right:12px;top:10px;font-style:normal;font-size:22px} .t72tile b{font:400 19px "Russo One",sans-serif;color:#fff}
  .t72tile small{font-size:12px;line-height:1.35;color:#cfc6ad} .t72tile .st{margin-top:auto;font-size:12px;color:#8fffaa}
  .t72menu .row{display:flex;gap:8px;flex-wrap:wrap} #screen .t72menu .row button{margin:0;flex:1;min-height:42px;border-radius:10px}
  #screen .t72menu .row button.on{border-color:#ffd23f;color:#ffd23f} .t72menu .note{margin:0;font-size:12px;color:#95a3b2}
  @media (max-height:500px){ .t72menu{gap:6px!important} .t72menu h2{font-size:20px!important} .t72menu .sub{font-size:12px!important} #screen .t72tile{min-height:0;padding:9px 10px 8px;gap:3px}
    .t72tile .ic71{width:28px;height:28px} .t72tile b{font-size:15px} .t72tile small{font-size:11px} #screen .t72menu .row button{min-height:38px;font-size:13px} .t72menu .grid.g4{grid-template-columns:1fr 1fr} }
  html[lang=he] .t72menu{direction:rtl} html[lang=he] #screen .t72tile{text-align:right;align-items:flex-end}
  `;
  document.head.appendChild(st);
})();
