// =====================================================================
//  v6.6 — ЦЕПОЧКА ПРОИЗВОДСТВА КАК В STARCRAFT 2 И ДВА ВИДА ДОБЫЧИ
//  • Штаб и форпост делают ТОЛЬКО инженеров (+ исследование бурения в штабе).
//    Инженер строит: Казарму (пехота, пулемётчики, снайперы, разведчики, капсулы,
//    броня/оружие) → Мехзавод (техника; нужна Казарма) · Дрон-хаб (нужна Казарма) ·
//    Аэродок (ранцы и десант; нужен Мехзавод и открывается с 6:00 боя).
//  • Добыча: (а) кристаллические поля — инженер набирает груз и несёт в штаб /
//    форпост / Склад руды (как рабочие в StarCraft); (б) жила + Экстрактор — сам
//    добывает понемногу (как в Company of Heroes), его можно взорвать; точки — доход
//    за территорию. ИИ (Рой и наш стратег) живёт по тем же правилам.
// =====================================================================
const ECO66 = { LOAD: 6, MINE_T: 2.8, AMOUNT: 1500, R: 4.2, WIN: 60 };
ECO.HQ = 0.7;   // штаб перерабатывает меньше — главное теперь добыча
// ---------------- здания
BTYPES.barracks = { n: ['Казарма', 'Barracks', 'Doanh trại'], cost: 150, time: 20, hp: 2400, rad: 6.0, bound: 8.6, H: 5.4, code: 21, key: true,
  d: ['Пехота: штурмовые отряды, пулемётчики, снайперы, разведчики, капсулы; улучшения брони и оружия.', 'Infantry: assault squads, heavy gunners, snipers, scouts, drop pods; armor and weapon upgrades.', 'Bộ binh: đội xung kích, xạ thủ, bắn tỉa, trinh sát, khoang thả; nâng cấp giáp và vũ khí.'] };
BTYPES.depot = { n: ['Склад руды', 'Ore depot', 'Kho quặng'], cost: 100, time: 14, hp: 1300, rad: 3.6, bound: 5.2, H: 3.4, code: 22,
  d: ['Сюда инженеры сдают кристаллы. Ставь рядом с кристаллическим полем — носить ближе, руды больше.', 'Builders drop crystals here. Place it next to a crystal field — shorter trips, more ore.', 'Kỹ sư nộp tinh thể ở đây. Đặt gần bãi tinh thể.'] };
BTYPES.factory.req = 'barracks'; BTYPES.hub.req = 'barracks';
BTYPES.factory.d = ['Танки и техника. Нужна Казарма.', 'Tanks and vehicles. Requires Barracks.', 'Xe tăng và xe. Cần Doanh trại.'];
BTYPES.hub.d = ['Автономные боевые дроны. Нужна Казарма.', 'Autonomous combat drones. Requires Barracks.', 'Drone chiến đấu. Cần Doanh trại.'];
BTYPES.airdock.unlock = 360;
BTYPES.airdock.d = ['Ранцы II и Небесный десант (элита на ранцах). Нужен Мехзавод, открывается с 6:00 боя.', 'Jetpacks II and Sky troopers (jetpack elite). Requires a Mech factory, unlocks at 6:00.', 'Ba lô II và lính đổ bộ. Cần Nhà máy, mở lúc 6:00.'];
BTYPES.outpost.d = ['Вторая база у своей точки: инженеры, сдача кристаллов, пополнение.', 'Forward base at an owned point: builders, crystal drop-off, reinforcement.', 'Căn cứ tiền tuyến: kỹ sư, nộp tinh thể, bổ sung quân.'];
{ const order = ['extractor', 'depot', 'barracks', 'turret', 'aa', 'factory', 'hub', 'outpost', 'airdock'], tmp = {};
  for (const k of order) if (BTYPES[k]) tmp[k] = BTYPES[k];
  for (const k in BTYPES) if (!tmp[k]) tmp[k] = BTYPES[k];
  for (const k of Object.keys(BTYPES)) delete BTYPES[k];
  Object.assign(BTYPES, tmp); }
BUILD_KEYS.barracks = 'KeyM'; BUILD_KEYS.depot = 'KeyJ';
BICON.barracks = '⚔'; BICON.depot = '⬢'; UIX_ICON.b.barracks = '⚔'; UIX_ICON.b.depot = '⬢'; UIX_ICON.b.extractor = '⛏';
WORK_R.barracks = 6.5; WORK_R.depot = 4.0;
Object.assign(BLD_BC, { barracks: 2.5, depot: 1.4 }); Object.assign(BLD_SC, { barracks: 2.2, depot: 1.2 });
Object.assign(BLD_SR, { barracks: 4.5, depot: 2.6 }); Object.assign(BLD_BR, { barracks: 9.6, depot: 5.8 });
// столкновения новых зданий
{ const bs0 = bldSDF;
  bldSDF = function(b, x, y, z){
    if (b.type !== 'barracks' && b.type !== 'depot') return bs0(b, x, y, z);
    const px = x - b.pos[0], py = y - b.pos[1], pz = z - b.pos[2];
    if (px*px + py*py + pz*pz > b.bound * b.bound) return 1e9;
    const qx = px*b.R[0] + py*b.R[1] + pz*b.R[2], qy = px*b.up[0] + py*b.up[1] + pz*b.up[2], qz = px*b.fwd[0] + py*b.fwd[1] + pz*b.fwd[2];
    const H = -1 + (b.H + 1) * max(0.05, b.built);
    const d = b.type === 'barracks' ? min(sdBox3(qx, qy + 0.6, qz, 5.4, 1.3, 4.3), sdBox3(qx, qy - 2.1, qz + 0.5, 4.7, 1.6, 3.0))
                                    : min(sdBox3(qx, qy + 0.5, qz, 3.6, 1.0, 3.2), sdBox3(qx + 0.6, qy - 1.2, qz + 0.9, 1.9, 1.3, 1.9));
    return max(d, qy - H);
  }; }
// лимиты и время открытия
{ const cb0 = canBuild;
  canBuild = function(team, type){
    const B = BTYPES[type];
    const dev = typeof DEV !== 'undefined' && DEV.on && team === 0;
    if (B && B.unlock && S.time < B.unlock && !dev) return tr(`Откроется на ${fmtTime(B.unlock)} боя`, `Unlocks at ${fmtTime(B.unlock)}`, `Mở lúc ${fmtTime(B.unlock)}`);
    if (type === 'barracks' || type === 'depot'){
      const n = S.buildings.filter(b => b.alive && b.team === team && b.type === type).length;
      if (n >= (type === 'barracks' ? 2 : 4)) return tr('Лимит: уже построено', 'Limit reached', 'Đã đạt giới hạn');
    }
    return cb0(team, type);
  }; }
{ const rr0 = rtsReason;
  rtsReason = function(action, arg){
    const [kind, key] = String(action || '').split(':');
    if ((kind === 'build' || kind === 'place') && BTYPES[key] && BTYPES[key].unlock && S.time < BTYPES[key].unlock && !(typeof DEV !== 'undefined' && DEV.on)){
      const left = BTYPES[key].unlock - S.time;
      return { ok: false, reason: tr(`Откроется через ${fmtDur(left)}`, `Unlocks in ${fmtDur(left)}`, `Mở sau ${fmtDur(left)}`), fix: tr('Ранцы и авиацию открывают не сразу — успей поставить ПВО и турели. Пока строй Казарму и Мехзавод.', 'Jetpacks and aircraft unlock later — time to set up anti-air and turrets. Build Barracks and a Mech factory meanwhile.', 'Ba lô và không quân mở sau.'), act: null, eta: left };
    }
    return rr0(action, arg);
  }; }
// ---------------- что где производится
PRODUCTS.heavy1 = { n: ['Пулемётчик-одиночка', 'Lone heavy gunner', 'Xạ thủ đơn độc'], cost: 85, time: 8, at: ['barracks'], icon: '▣', solo: 'heavy' };
for (const k of ['squad', 'sniper1', 'scout1', 'pod', 'armor', 'weapons']) PRODUCTS[k].at = ['barracks'];
PRODUCTS.builder.at = ['hq', 'outpost'];
{ const order = ['builder', 'squad', 'heavy1', 'sniper1', 'scout1', 'pod'], tmp = {};
  for (const k of order) tmp[k] = PRODUCTS[k];
  for (const k in PRODUCTS) if (!tmp[k]) tmp[k] = PRODUCTS[k];
  for (const k of Object.keys(PRODUCTS)) delete PRODUCTS[k];
  Object.assign(PRODUCTS, tmp); }
// ---------------- КРИСТАЛЛИЧЕСКИЕ ПОЛЯ
let FIELDS66 = null;
function fields66(){
  if (FIELDS66) return FIELDS66;
  const V = veins();
  if (!V.length) return [];
  FIELDS66 = [];
  const rnd = seeded(6606);
  const flat = dir => {
    const gr = groundR(dir); if (gr < RM - 22) return false;
    const t = anyTangent(dir), t2 = cross(dir, t), ang = 4.5 / RM;
    let lo = 1e9, hi = -1e9;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const h = groundR(norm(add(dir, add(mul(t, a * ang), mul(t2, b * ang))))); lo = min(lo, h); hi = max(hi, h); }
    return hi - lo < 2.0 && abs(gr - (hi + lo) / 2) < 1.6;
  };
  const free = dir => {
    for (const a of AXES) if (surfDist(dir, a) < 32) return false;
    for (const c of CPD) if (surfDist(dir, c) < 16) return false;
    for (const b of BASES) if (surfDist(dir, b) < 36) return false;
    for (const p of PROPS) if (surfDist(dir, p.dir) < (p.kind === 5 ? 9 : p.bound + 7)) return false;
    for (const v of V) if (surfDist(dir, v.dir) < 20) return false;
    for (const f of FIELDS66) if (surfDist(dir, f.dir) < 30) return false;
    return true;
  };
  const place = (center, r0, r1, kind, ref) => {
    const t1 = anyTangent(center), t2 = cross(center, t1);
    for (let k = 0; k < 400; k++){
      const a = rnd() * PI * 2, rr = r0 + (r1 - r0) * rnd();
      const dir = offsetOnSphere(center, add(mul(t1, cos(a)), mul(t2, sin(a))), max(0.01, rr));
      if (free(dir) && flat(dir)){ FIELDS66.push({ i: FIELDS66.length, dir, pos: mul(dir, groundR(dir)), kind, ref, amount: ECO66.AMOUNT, max: ECO66.AMOUNT, props: [] }); return; }
    }
  };
  for (let t = 0; t < 2; t++) for (let k = 0; k < 2; k++) place(BASES[t], 40, 64, 'base', t);
  CPD.forEach((c, i) => place(c, 22, 40, 'cp', i));
  for (const [la, lo] of [[0, 45], [0, 225]]) place(dirLL(la, lo), 0, 60, 'free', -1);
  // по 3 кристалла-грозди на поле (обычные инопланетные кристаллы, не огранённые — те у жил)
  const K = PROP_KINDS[5];
  for (const f of FIELDS66){
    const t1 = anyTangent(f.dir), t2 = cross(f.dir, t1);
    for (let k = 0; k < 3; k++){
      const a = f.i * 1.3 + k * 2.09, rr = [1.4, 2.3, 2.1][k];
      const dir = offsetOnSphere(f.dir, add(mul(t1, cos(a)), mul(t2, sin(a))), rr);
      const up = dir, fwd = tangent(add(mul(t1, -sin(a)), mul(t2, cos(a))), up), gr = groundR(dir);
      const p = { cls: 'prop', id: 100000 + PROPS.length, kind: 5, dir, pos: mul(dir, gr - K.sink), up, fwd, R: norm(cross(fwd, up)), hp: 1e7, maxhp: 1e7,
                  bound: K.br, integ: 1, alive: true, variant: floor(rnd() * 8), team: 2, seen: [1, 1], flash: 0, loot: 0, field: f.i };
      PROPS.push(p); f.props.push(p);
    }
  }
  buildPropGrid();
  return FIELDS66;
}
function g66Visual(f){
  const k = f.amount / f.max;
  for (const p of f.props){ if (k <= 0){ p.alive = false; p.integ = 0.05; } else { p.alive = true; p.integ = 0.3 + 0.7 * k; } p.hp = p.maxhp; }
}
{ const er0 = ecoReset;
  ecoReset = function(){ er0(); for (const f of fields66()){ f.amount = f.max; g66Visual(f); } for (const T of S.teams) if (T) T.g66 = []; }; }
// поля не разрушаются оружием (запас кончается только от добычи)
{ const dp0 = destroyProp; destroyProp = function(p, src){ if (p && p.field !== undefined) return; return dp0(p, src); }; }
function g66Drops(team){
  const L = [];
  if (S.hq[team] && S.hq[team].alive) L.push(S.hq[team]);
  for (const b of S.buildings) if (b.alive && b.done && b.team === team && (b.type === 'depot' || b.type === 'outpost')) L.push(b);
  return L;
}
function g66Drop(team, p){
  let best = null, bd = 1e9;
  for (const d of g66Drops(team)){ const x = surfDist(builderTarget(d), p) - builderTargetR(d); if (x < bd){ bd = x; best = d; } }
  return best;
}
function g66FieldSafe(team, f){
  let foes = 0; for (const e of TGT[team] || []) if (e.alive && e.cls !== 'bld' && dist2(e.pos, f.pos) < 2500) foes++;
  return foes < 2;
}
function g66NearestField(team, p, not, maxD){
  let best = null, bd = maxD || 1e9;
  for (const f of fields66()){
    if (f === not || f.amount <= 0) continue;
    let d = surfDist(f.dir, p);
    const dr = g66Drop(team, f.pos); if (!dr) continue;
    d += 0.5 * max(0, surfDist(builderTarget(dr), f.pos) - builderTargetR(dr));
    if (!g66FieldSafe(team, f)) d += 300;
    if (d < bd){ bd = d; best = f; }
  }
  return best;
}
// начать добычу
function g66Start(b, f, byPlayer){
  if (!b || !b.alive || !f) return false;
  b.order = 'gather'; b.field = f.i; b.lastField = f.i; b.site = null; b.jobs = []; b.goal = null; b.auto = false; b.mineT = 0;
  if (byPlayer){ b.byPlayer = true; b.manualUntil = 1e9; b.auto66 = false; }
  return true;
}
function g66Gatherers(team, f){ return S.builders.filter(b => b.alive && b.team === team && b.order === 'gather' && (!f || b.field === f.i)); }
function g66Record(team, n){
  const T = S.teams[team]; if (!T.g66) T.g66 = [];
  T.g66.push([S.time, n]); while (T.g66.length && T.g66[0][0] < S.time - ECO66.WIN) T.g66.shift();
  T.g66tot = (T.g66tot || 0) + n;
}
function g66PerMin(team){ const T = S.teams[team]; if (!T || !T.g66) return 0; let s = 0; for (const [t, n] of T.g66) if (t >= S.time - ECO66.WIN) s += n; return Math.round(s * 60 / ECO66.WIN); }
// шаг инженера-добытчика. false — приказ сменился, пусть работает обычный шаг
function g66Step(b, dt){
  b.work = max(0, (b.work || 0) - dt * 3); b.beam = null;
  if (!b.jobs) b.jobs = [];
  b.thinkT = (b.thinkT || 0) - dt;
  if (b.thinkT <= 0){ b.thinkT = 0.45 + random() * 0.15; builderThink(b); if (b.order !== 'gather') return false; }
  const FL = fields66();
  let f = FL[b.field];
  if (!b.cargo && (!f || f.amount <= 0)){
    const nf = g66NearestField(b.team, b.pos, f, 220);
    if (nf){ b.field = nf.i; b.lastField = nf.i; f = nf; }
    else { b.order = 'idle'; b.lastField = null; if (b.team === 0 && !S.attract) feed(tr('Кристаллы рядом кончились — инженер свободен', 'Crystals nearby are depleted — builder is idle', 'Tinh thể gần đây đã hết'), '#ffd27a'); return false; }
  }
  let goal = null, face = null;
  const ring = (c, R) => { const up = norm(c), from = tangent(sub(b.pos, c), up), side = norm(cross(up, from)), a = ((b.id * 2.39) % 2.0) - 1.0; return add(c, mul(norm(add(mul(from, cos(a)), mul(side, sin(a)))), R)); };
  if (b.cargo > 0){
    const d = g66Drop(b.team, b.pos);
    if (d){
      const c = builderTarget(d), R = builderTargetR(d) + 1.6;
      if (surfDist(b.pos, c) > R + 1.2) goal = ring(c, R);
      else {
        const n = b.cargo; S.teams[b.team].ore += n; b.cargo = 0; g66Record(b.team, n);
        if (b.team === 0 && !S.attract){ ecoFloat(add(b.pos, mul(b.up, 2.2)), '+' + n, '#8fffaa'); }
        b.mineT = 0;
        if (!f || f.amount <= 0){ const nf = g66NearestField(b.team, b.pos, f, 220); if (nf){ b.field = nf.i; b.lastField = nf.i; } }
      }
    }
  } else {
    const c = f.pos, R = ECO66.R;
    if (surfDist(b.pos, c) > R + 1.0) goal = ring(c, R);
    else {
      face = c;
      const n = g66Gatherers(b.team, f).filter(x => x.cargo === 0 && surfDist(x.pos, c) < R + 1.5).length;
      const k = (b.team === 1 ? DK().eco : 1) * min(1, 3 / max(1, n));
      b.mineT = (b.mineT || 0) + dt * k; b.work = 1;
      const pr = f.props[(b.id + floor(S.time)) % f.props.length];
      if (pr) b.beam = add(add(pr.pos, mul(pr.up, 0.6 * pr.integ)), mul(randUnit(), 0.35));
      if (random() < dt * 8 && b.beam) S.sparks.push({ pos: b.beam, vel: add(mul(norm(b.beam), 2.2), mul(randUnit(), 2)), life: 0.4, heal: 1 });
      if (b.mineT >= ECO66.MINE_T){
        const take = min(f.amount, Math.round(ECO66.LOAD * GAME.INC_MUL));
        f.amount -= take; b.cargo = take; b.mineT = 0; g66Visual(f);
        if (f.amount <= 0){ for (const p of f.props) fxSmoke(add(p.pos, mul(p.up, 0.6)), 1.2, 0.3, 0.6); if (b.team === 0 && !S.attract) feed(tr('Кристаллическое поле выработано', 'A crystal field is depleted', 'Một bãi tinh thể đã cạn'), '#ffd27a'); }
      }
    }
  }
  builderMove(b, goal, dt, face);
  if (b.cargo > 0) b.moveAmt = max(b.moveAmt || 0, 0.25);
  return true;
}
{ const st0 = builderStep;
  builderStep = function(b, dt){ if (b.order === 'gather' && g66Step(b, dt)) return; st0(b, dt); }; }
// после стройки/ремонта инженер возвращается к своим кристаллам (как рабочие в SC2)
{ const bn0 = builderNext;
  builderNext = function(b){
    bn0(b);
    if (b.order === 'idle' && b.lastField !== null && b.lastField !== undefined){ const f = fields66()[b.lastField]; if (f && f.amount > 0) { b.order = 'gather'; b.field = f.i; b.mineT = 0; } }
  }; }
{ const bs0 = builderStop; builderStop = function(bs){ for (const b of bs) b.lastField = null; return bs0(bs); }; }
{ const bd0 = builderDoing;
  builderDoing = function(b){
    if (b.order === 'gather') return b.cargo > 0 ? tr(`несёт руду (+${b.cargo})`, `carrying ore (+${b.cargo})`, `chở quặng (+${b.cargo})`) : tr('добывает кристаллы', 'mining crystals', 'khai thác tinh thể');
    return bd0(b);
  }; }
{ const ib0 = builderIdle; }
// поле под курсором (для ПКМ инженером)
function g66FieldAt(x, y){
  let best = null, bd = 34;
  for (const f of fields66()){
    if (f.amount <= 0 || !facing(f.pos)) continue;
    const s = project(add(f.pos, mul(f.dir, 0.8))); if (!s) continue;
    const d = hypot(s[0] - x, s[1] - y) - max(0, screenRadius(f.pos, 3.2) - 6);
    if (d < bd){ bd = d; best = f; }
  }
  return best;
}
{ const bo0 = builderOrderAt;
  builderOrderAt = function(bs, x, y, queue){
    const f = g66FieldAt(x, y);
    if (f){
      for (const b of bs) g66Start(b, f, true);
      feed(tr(`Инженеры (${bs.length}): добывают кристаллы и носят в ${g66Drop(0, f.pos) && g66Drop(0, f.pos).cls === 'hq' ? 'штаб' : 'склад'}`, `Builders (${bs.length}): mining crystals`, `Kỹ sư (${bs.length}): khai thác tinh thể`), '#8fffaa');
      S.orderMark = { p: f.pos, t: 0.8, col: '#8fffaa' }; emit('ui', { kind: 'ok' }); emit('ack', { g: bs[0], order: 'gather' });
      if (typeof CUR !== 'undefined') CUR.ev('gather');
      return true;
    }
    for (const b of bs) b.lastField = null;
    return bo0(bs, x, y, queue);
  }; }
// кнопка «◆ Добывать» в карточке инженеров
function g66GatherSel(){
  const bs = selBuilders(); if (!bs.length) return false;
  const c = bs.reduce((p, b) => add(p, b.pos), [0, 0, 0]);
  const f = g66NearestField(0, norm(c));
  if (!f){ feed(tr('Нет доступных кристаллических полей рядом со складом/штабом', 'No crystal field near a drop-off', 'Không có bãi tinh thể gần kho'), '#f88'); emit('ui', { kind: 'deny' }); return false; }
  for (const b of bs) g66Start(b, f, true);
  feed(tr(`Инженеры (${bs.length}): добывают кристаллы`, `Builders (${bs.length}): mining crystals`, `Kỹ sư (${bs.length}): khai thác tinh thể`), '#8fffaa');
  emit('ui', { kind: 'ok' }); emit('ack', { g: bs[0], order: 'gather' });
  if (!onScreen(f.pos)) flyCamTo(f.pos);
  if (typeof CUR !== 'undefined') CUR.ev('gather');
  return true;
}
{ const bc0 = builderCardHTML;
  builderCardHTML = function(sel){
    const h = bc0(sel); if (!h) return h;
    const btn = `<button class="ab bb g66" data-gather="1" title="${tr('Добывать кристаллы: инженер набирает груз на зелёном поле и носит в штаб/склад. Или ПКМ по кристаллам.', 'Mine crystals: the builder picks up a load at a green field and carries it to the HQ/depot. Or RMB the crystals.', 'Khai thác tinh thể')}"><i>◆</i><b>${tr('Добывать', 'Gather', 'Khai thác')}</b><span class="bc">${tr('кристаллы', 'crystals', 'tinh thể')}</span><kbd>G</kbd></button>`;
    return h.replace('<div class="abils">', '<div class="abils">' + btn);
  };
  const bb0 = bindBuilderCard;
  bindBuilderCard = function(el){ bb0(el); el.querySelectorAll('[data-gather]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); g66GatherSel(); }); }; }
// G при выбранных инженерах — добывать
{ const bk0 = builderKey;
  builderKey = function(e){ if (e.code === 'KeyG' && !e.ctrlKey && !e.altKey && selBuilders().length && !selGroups().some(g => g.cls !== 'builder')){ g66GatherSel(); return true; } return bk0(e); }; }
// ---------------- ИИ: те же правила
{ const af0 = aiFreeBuilders;
  aiFreeBuilders = function(t){
    const L = af0(t);
    const g = teamBuilders(t).filter(b => b.order === 'gather' && !b.byPlayer && b.manualUntil < S.time && !b.cargo && !L.includes(b));
    return L.concat(g);
  }; }
// свободные инженеры ИИ (те, что не строят) — на кристаллы
function g66AiGather(t){
  for (const b of teamBuilders(t)){
    if (b.byPlayer || b.manualUntil > S.time || !builderIdle(b) || b.site || b.order === 'retreat') continue;
    const f = g66NearestField(t, b.pos, null, 260); if (f) g66Start(b, f, false);
  }
}
{ const aj0 = aiBuilderJobs; aiBuilderJobs = function(t){ aj0(t); g66AiGather(t); }; }
// план ИИ: Казарма до пехоты, Склад у далёкого поля, пулемётчики-одиночки
{ const vp0 = V2.plan;
  V2.plan = function(t, plan, nf){
    vp0.call(this, t, plan, nf);
    const my = type => S.buildings.filter(b => b.alive && b.team === t && b.type === type);
    if (!my('barracks').length){
      const i = plan.findIndex(p => p[0] === 'p' && PRODUCTS[p[1]] && PRODUCTS[p[1]].at.includes('barracks'));
      plan.splice(i < 0 ? 0 : i, 0, ['b', 'barracks']);
    } else if (my('barracks').length < 2 && S.time > 700) plan.push(['b', 'barracks']);
    if (!my('depot').length && g66Gatherers(t).length >= 2){
      const f = fields66()[g66Gatherers(t)[0].field], d = f && g66Drop(t, f.pos);
      if (f && d && surfDist(builderTarget(d), f.pos) - builderTargetR(d) > 30) plan.splice(min(plan.length, 4), 0, ['b', 'depot']);
    }
    const solos = S.squads.filter(s => s.team === t && s.solo).length + countQueued(t, ['sniper1', 'scout1', 'heavy1']);
    if (S.time > 200 && solos < 3 && random() < 0.4) plan.push(['p', 'heavy1']);
  }; }
{ const as0 = aiSiteFor;
  aiSiteFor = function(t, key){
    if (key === 'depot'){
      const g = g66Gatherers(t)[0], f = g && fields66()[g.field];
      if (f) for (let k = 0; k < 40; k++){
        const a = random() * PI * 2, t1 = anyTangent(f.dir), t2 = cross(f.dir, t1);
        const dir = offsetOnSphere(f.dir, add(mul(t1, cos(a)), mul(t2, sin(a))), 9 + random() * 10);
        if (!siteProblem(t, 'depot', dir)) return dir;
      }
      return null;
    }
    return as0(t, key);
  }; }
// склад нельзя ставить прямо на кристаллы
{ const sp0 = siteProblem;
  siteProblem = function(team, type, dir){
    const r = sp0(team, type, dir); if (r) return r;
    if (type !== 'extractor') for (const f of fields66()) if (f.amount > 0 && surfDist(dir, f.dir) < 4.5 + BTYPES[type].rad) return tr('Здесь кристаллическое поле', 'Crystal field here', 'Đây là bãi tinh thể');
    return null;
  }; }
// ---------------- СОХРАНЕНИЕ: запас полей
{ const sv0 = SAVE.save;
  SAVE.save = function(slot){
    const w0 = this.write;
    this.write = (s, json, data) => { try { data.f66 = fields66().map(f => Math.round(f.amount)); data.g66 = S.teams.map(T => T.g66tot || 0); json = JSON.stringify(data); } catch (e){} return w0.call(this, s, json, data); };
    try { return sv0.call(this, slot); } finally { this.write = w0; }
  };
  const ld0 = SAVE.load;
  SAVE.load = function(slot){
    let f66 = null;
    try { const d = JSON.parse(localStorage.getItem(this.keyOf(slot || this.newest()))); f66 = d && d.f66; } catch (e){}
    const ok = ld0.call(this, slot);
    if (ok && Array.isArray(f66)) fields66().forEach((f, i) => { if (f66[i] !== undefined){ f.amount = f66[i]; g66Visual(f); } });
    return ok;
  }; }
// ---------------- ВЕРХНЯЯ ПАНЕЛЬ: руда, доход и разбивка по видам добычи
{ const eb0 = ecoBreakdown;
  ecoBreakdown = function(t){ const E = eb0(t); E.cry = g66PerMin(t); E.nGat = g66Gatherers(t).length; E.total += E.cry; return E; }; }
ecoHB = function(T){
  const E = ecoBreakdown(0);
  ecoPopUpdate();
  return `<div class="hb ore r66" data-eco="1" title="${tr('Откуда руда и как ускорить — клик', 'Where ore comes from — click', 'Quặng từ đâu — nhấp')}"><small>${tr('РУДА', 'ORE', 'QUẶNG')} ⓘ</small><b>${Math.floor(T.ore)}</b><em>+${E.total}/${tr('мин', 'min', 'phút')}` +
    `<span class="r66s"><i title="${tr('кристаллы (носят инженеры)', 'crystals (carried by builders)', 'tinh thể')}">◆${E.cry}</i><i title="${tr('экстракторы на жилах', 'extractors on veins', 'máy khai thác')}">⛏${E.ext}</i><i title="${tr('точки', 'points', 'điểm')}">⚑${E.pts}</i></span></em></div>`;
};
{ const ep0 = ecoPopHTML;
  ecoPopHTML = function(){
    const E = ecoBreakdown(0);
    const row = `<tr><td>◆</td><td>${tr('Кристаллы — носят инженеры', 'Crystals — carried by builders', 'Tinh thể — kỹ sư mang về')} <i>×${E.nGat}</i><small>${tr('выдели инженера → ПКМ по зелёному полю ◆ (или кнопка «Добывать», G). Груз 6 — в штаб, форпост или Склад руды (J). Склад рядом с полем — быстрее.', 'select a builder → RMB a green ◆ field (or "Gather", G). Loads of 6 go to the HQ, an outpost or an Ore depot (J). A depot next to the field is faster.', 'chọn kỹ sư → chuột phải bãi ◆')}</small></td><td>+${E.cry}</td></tr>`;
    let h = ep0();
    h = h.replace('<table>', '<table>' + row);
    h = h.replace(/<span>\+\d+\//, `<span>+${E.total}/`);
    return h.replace(tr('Ещё: обломки', 'Also: wrecks', 'Thêm: xác'), tr('Два вида добычи: <b>кристаллы</b> ◆ — быстро, но нужны инженеры и рейсы; <b>экстрактор</b> ⛏ на жиле — сам, медленнее, его можно взорвать. Ещё: обломки', 'Two kinds of mining: <b>crystals</b> ◆ — fast but needs builders running loads; an <b>extractor</b> ⛏ on a vein — automatic, slower, can be destroyed. Also: wrecks', 'Hai kiểu khai thác. Thêm: xác'));
  }; }
// ---------------- НАЛОЖЕНИЕ: поля, груз, миникарта
{ const dw0 = drawEcoWorld;
  drawEcoWorld = function(rts){
    dw0(rts);
    if (!rts || !S.cam) return;
    const selB = selBuilders().length > 0;
    octx.save(); octx.textAlign = 'center';
    for (const f of fields66()){
      if (f.amount <= 0 || !facing(f.pos)) continue;
      const s = project(add(f.pos, mul(f.dir, 3))); if (!s || s[2] > 700) continue;
      if (selB || S.rts.h < 80){
        octx.font = '600 11px "Exo 2", sans-serif'; octx.fillStyle = '#8fffaa';
        octx.fillText(`◆ ${tr('кристаллы', 'crystals', 'tinh thể')} ${Math.round(f.amount)}`, s[0], s[1] - 10);
        const g = g66Gatherers(0, f).length; if (g){ octx.fillStyle = '#7fd4ff'; octx.fillText('⚒'.repeat(min(g, 5)), s[0], s[1] + 4); }
      }
      if (selB){ const r = max(8, screenRadius(f.pos, 4.5)); octx.strokeStyle = 'rgba(143,255,170,.7)'; octx.setLineDash([4, 4]); octx.lineWidth = 1.5; octx.beginPath(); octx.arc(s[0], s[1] + 8, r, 0, PI * 2); octx.stroke(); octx.setLineDash([]); }
    }
    for (const b of S.builders){
      if (!b.alive || b.team !== 0 || !b.cargo || !facing(b.pos)) continue;
      const s = project(add(b.pos, mul(b.up, 2.0))); if (!s) continue;
      octx.fillStyle = '#8fffaa'; octx.beginPath(); octx.moveTo(s[0], s[1] - 5); octx.lineTo(s[0] + 4, s[1]); octx.lineTo(s[0], s[1] + 5); octx.lineTo(s[0] - 4, s[1]); octx.closePath(); octx.fill();
    }
    octx.restore();
  }; }
{ const em0 = ecoMinimap;
  ecoMinimap = function(mmProject){ em0(mmProject); for (const f of fields66()){ if (f.amount <= 0) continue; const m = mmProject(f.pos); if (!m) continue; octx.fillStyle = '#5dff9a'; octx.fillRect(m[0] - 2, m[1] - 2, 4, 4); } }; }
(function g66CSS(){
  const st = document.createElement('style');
  st.textContent = `.hb.ore.r66 em{white-space:nowrap} .hb.ore.r66 .r66s{display:inline-flex;gap:5px;font-size:10px;line-height:1;margin-left:6px;white-space:nowrap} .hb.ore.r66 .r66s i{font-style:normal;color:#cfe3c8} .hb.ore.r66 .r66s i:first-child{color:#8fffaa}
  #card .ab.bb.g66{border-color:rgba(143,255,170,.6)} #card .ab.bb.g66 i{color:#8fffaa}`;
  document.head.appendChild(st);
})();
