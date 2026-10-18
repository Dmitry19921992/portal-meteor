// =====================================================================
//  ПРАВИЛА
// =====================================================================
const RULES = { G: 3.5, WALK: 4, JUMP: 4.5, AIR: 7, DRAG: 0.15, RAD: 0.5, EYE: 0.8,
  G_TOP: 0.6,       // v5.3: над поверхностью тяжесть растёт к куполу (+60% у купола) — не «висим» вдали от метеорита
  STEER: 1.8,       // v5.3: тяга ранца гасит снос поперёк направления тяги — резкие повороты в полёте
  BRAKE: 1.4,       // v5.3: воздушный тормоз (C в воздухе) — доля тяги ранца
  PORTAL_GRACE: 1.5, PORTAL_PUSH: 6 };   // v5.3: после выхода из портала — толчок внутрь и 1.5 с без тяги наружу
// джетпаки по уровням технологий
const JET = {
  basic: { n: ['прыжковый ранец', 'jump pack', 'ba lô nhảy'], thrust: 7,  emax: 2.4, rg: 0.8, ra: 0.15, unlock: 0.8 },
  jet2:  { n: ['ранец II', 'jetpack II', 'ba lô phản lực II'],       thrust: 12, emax: 6, rg: 1.2, ra: 0.30, unlock: 1.0 },
  elite: { n: ['ранец десанта', 'assault pack', 'ba lô đổ bộ'], thrust: 12.5, emax: 8.0, rg: 1.5, ra: 0.45, unlock: 1.0 },
};
const GAME = {
  HQ_HP: 18000, MATCH: 3600, START_ORE: 450, SCRAP: 8, CAP_RATE: 0.1, RANGE: 90,
  INC_BASE: 2.3, INC_PT: 2.1, INC_CORE: 5, BASE_R: 125, CP_BUILD_R: 62,
  MAX_SQUADS: 12, MAX_TANKS: 6, MAX_DRONES: 10, MAX_TURRETS: 10, MAX_AA: 5, MAX_OUTPOSTS: 3, MAX_BUILDERS: 8,
  REINF_COST: 18, REINF_T: 6, POD_EVERY: 165, CMD_MAX: 12, INC_MUL: 1, WAVE_MUL: 1,
};
// масштаб боёв (настройка «Масштаб боёв»): доход, лимиты армий, капсулы, размер волн
const SCALES = [
  { n: ['Обычный', 'Normal', 'Thường'],         inc: 1,   lim: 1,   pod: 1,    start: 450,  wave: 1 },
  { n: ['Крупный', 'Large', 'Lớn'],             inc: 1.8, lim: 1.5, pod: 0.75, start: 700,  wave: 1.5 },
  { n: ['Эпичный', 'Epic', 'Hoành tráng'],      inc: 2.7, lim: 2,   pod: 0.55, start: 1000, wave: 2.2 },
];
const LIM0 = { MAX_SQUADS: 12, MAX_TANKS: 6, MAX_DRONES: 10, MAX_TURRETS: 10, MAX_AA: 5, MAX_OUTPOSTS: 3, MAX_BUILDERS: 8 };
function applyScale(lvl){
  const K = SCALES[clamp(lvl | 0, 0, SCALES.length - 1)];
  for (const k in LIM0) GAME[k] = Math.round(LIM0[k] * (k === 'MAX_OUTPOSTS' ? min(K.lim, 1.7) : k === 'MAX_BUILDERS' ? min(K.lim, 1.5) : K.lim));
  GAME.INC_MUL = K.inc; GAME.START_ORE = K.start; GAME.POD_EVERY = 165 * K.pod; GAME.WAVE_MUL = K.wave;
}
// сложность: множители для Роя
const DIFF = [
  { n: ['Лёгкая', 'Easy', 'Dễ'],   eco: 0.75, dmg: 0.75, acc: 1.5, assist: 0.6 },
  { n: ['Нормальная', 'Normal', 'Thường'], eco: 1.0, dmg: 1.0, acc: 1.0, assist: 0.15 },
  { n: ['Тяжёлая', 'Hard', 'Khó'],  eco: 1.3, dmg: 1.2, acc: 0.8, assist: 0 },
  { n: ['Авто', 'Auto', 'Tự động'], auto: true },
];
// адаптивная сложность: игра следит, как у игрока дела, и плавно подстраивает Рой и помощь в прицеливании
const ADAPT = { v: -0.2, t: 0, kills: 0, deaths: 0, shots: 0, hits: 0, k: { eco: 0.9, dmg: 0.85, acc: 1.3, assist: 0.45 } };
function DK(){ return DIFF[S.diff].auto ? ADAPT.k : DIFF[S.diff]; }
function adaptCalc(){
  const a = (ADAPT.v + 1) / 2;   // 0 — игроку тяжело … 1 — игрок разносит всех
  ADAPT.k = { eco: lerp(0.62, 1.35, a), dmg: lerp(0.55, 1.2, a), acc: lerp(1.8, 0.8, a), assist: clamp(0.65 - a * 0.9, 0, 0.65) };
}
function adaptStep(dt){
  if (!DIFF[S.diff].auto || S.attract) return;
  ADAPT.t += dt;
  if (ADAPT.t < 15) return;
  ADAPT.t = 0;
  const kd = (ADAPT.kills + 1) / (ADAPT.deaths + 1);
  const p1 = clamp(Math.log2(kd) / 2, -1, 1);
  const p2 = ADAPT.shots > 25 ? clamp((ADAPT.hits / ADAPT.shots - 0.22) / 0.18, -1, 1) : 0;
  const pts = [0, 1].map(t => S.cps.filter(c => c.owner === t).length);
  const army = [0, 1].map(t => S.units.filter(u => u.team === t).length + S.vehicles.filter(v => v.team === t).length * 4);
  const hq = [0, 1].map(t => (S.hq[t].alive ? S.hq[t].hp / S.hq[t].maxhp : 0) + keyBuildings(t).length * 0.15);
  const team = clamp((pts[0] - pts[1]) / 3 + (army[0] / max(1, army[1]) - 1) + (hq[0] - hq[1]) * 0.5, -1, 1);
  const perf = 0.45 * p1 + 0.2 * p2 + 0.35 * team;
  ADAPT.v = clamp(ADAPT.v + perf * 0.12, -1, 1);
  ADAPT.kills = ADAPT.deaths = ADAPT.shots = ADAPT.hits = 0;
  adaptCalc();
}
function diffLabel(){
  if (!DIFF[S.diff].auto) return N2(DIFF[S.diff].n);
  const v = ADAPT.v;
  return N2(DIFF[3].n) + ' · ' + (v < -0.5 ? tr('очень мягко', 'very gentle', 'rất nhẹ nhàng') : v < -0.15 ? tr('мягче', 'gentler', 'nhẹ hơn') : v < 0.2 ? tr('ровно', 'balanced', 'cân bằng') : v < 0.55 ? tr('жёстче', 'tougher', 'khó hơn') : tr('очень жёстко', 'very tough', 'rất khó'));
}
const TEAM = [ { css: '#d6c69a', dim: '#8f8664' }, { css: '#ff4a3a', dim: '#a8302a' } ];
const TANK_NAME = [['«Бульдог»', '"Bulldog"', '“Bulldog”'], ['«Паук»', '"Spider"', '“Nhện”']];
// здания: H — высота (для «печати» при стройке), rad — радиус площади, bound — ограничивающая сфера
const BTYPES = {
  turret:  { n: ['Турель', 'Turret', 'Tháp súng'],      cost: 90,  time: 12, hp: 600,  rad: 1.6, bound: 2.6,  H: 2.4,  code: 6,
             d: ['Автоматический пулемёт. Можно вселиться.', 'Automatic machine gun. Can be manned.', 'Súng máy tự động. Có thể điều khiển.'] },
  aa:      { n: ['ПВО', 'Anti-air', 'Phòng không'],       cost: 140, time: 16, hp: 700,  rad: 2.2, bound: 3.4,  H: 3.3,  code: 7,
             d: ['Сбивает дронов и летящую пехоту.', 'Shoots down drones and flying infantry.', 'Bắn hạ drone và bộ binh đang bay.'] },
  outpost: { n: ['Форпост', 'Outpost', 'Tiền đồn'],    cost: 200, time: 24, hp: 2600, rad: 6.2, bound: 9.5,  H: 8.6,  code: 11, key: true,
             d: ['Вторая база у своей точки: отряды, пополнение, строители.', 'Forward base at an owned point: squads, reinforcement, builders.', 'Căn cứ tiền tuyến cạnh điểm đã chiếm: đội, bổ sung quân, thợ xây.'] },
  factory: { n: ['Мехзавод', 'Mech factory', 'Nhà máy cơ giới'], cost: 250, time: 30, hp: 3200, rad: 9.5, bound: 13.5, H: 12.5, code: 8, key: true,
             d: ['Танки — автономные боевые машины.', 'Tanks — autonomous combat vehicles.', 'Xe tăng — xe chiến đấu tự hành.'] },
  hub:     { n: ['Дрон-хаб', 'Drone hub', 'Trạm drone'],  cost: 200, time: 24, hp: 2300, rad: 7,   bound: 8.2,  H: 5.6,  code: 9, key: true,
             d: ['Автономные боевые дроны.', 'Autonomous combat drones.', 'Drone chiến đấu tự hành.'] },
  airdock: { n: ['Аэродок', 'Airdock', 'Bến bay'],    cost: 350, time: 40, hp: 3000, rad: 7,   bound: 15,   H: 14.2, code: 10, req: 'factory', key: true,
             d: ['Небесный десант и «Ранцы II».', 'Sky troopers and "Jetpacks II".', 'Lính đổ bộ và “Ba lô phản lực II”.'] },
  // v6: рудный экстрактор — ставится инженером только на рудную жилу (rts_build.js)
  extractor: { n: ['Экстрактор', 'Extractor', 'Máy khai thác'], cost: 80, time: 14, hp: 900, rad: 2.4, bound: 4.6, H: 4.9, code: 12, vein: true,
             d: ['Добывает руду на жиле: +66 руды/мин. Только на светящихся кристаллах жилы.', 'Mines ore on a vein: +66 ore/min. Only on the glowing crystals of a vein.', 'Khai thác quặng trên mạch: +66 quặng/phút.'] },
};
const PRODUCTS = {
  squad: { n: ['Штурмовой отряд', 'Assault squad', 'Đội xung kích'], cost: 100, time: 9,  at: ['hq', 'outpost'], icon: '◆' },
  tank:  { n: ['Танк', 'Tank', 'Xe tăng'],                      cost: 200, time: 20, at: ['factory'], icon: '■' },
  drone: { n: ['Боевой дрон', 'Combat drone', 'Drone chiến đấu'],       cost: 60,  time: 8,  at: ['hub'], icon: '▲' },
  elite: { n: ['Небесный десант', 'Sky troopers', 'Lính đổ bộ'],   cost: 240, time: 18, at: ['airdock'], icon: '✦' },
  sniper1: { n: ['Снайпер-одиночка', 'Lone sniper', 'Lính bắn tỉa đơn độc'], cost: 90, time: 8, at: ['hq', 'outpost'], icon: '⌖', solo: 'sniper' },
  scout1:  { n: ['Разведчик-одиночка', 'Lone scout', 'Trinh sát đơn độc'], cost: 70, time: 6, at: ['hq', 'outpost'], icon: '◈', solo: 'scout' },
  pod:   { n: ['Орбитальная капсула', 'Orbital drop pod', 'Khoang quỹ đạo'], cost: 260, time: 14, at: ['hq'], icon: '☄' },
  jet2:  { n: ['Ранцы II', 'Jetpacks II', 'Ba lô phản lực II'],           cost: 350, time: 70, at: ['airdock'], research: true, icon: '⇑' },
  armor:   { n: ['Броня', 'Armor', 'Giáp'],   cost: [250, 450, 700], time: [45, 70, 90], at: ['hq', 'outpost'], research: true, max: 3, icon: '⛨' },
  weapons: { n: ['Оружие', 'Weapons', 'Vũ khí'], cost: [250, 450, 700], time: [45, 70, 90], at: ['hq', 'outpost'], research: true, max: 3, icon: '✚' },
  // v6: инженер-строитель и улучшение добычи
  builder: { n: ['Инженер-строитель', 'Builder', 'Kỹ sư xây dựng'], cost: 50, time: 7, at: ['hq', 'outpost'], icon: '⚒' },
  drill:   { n: ['Глубокое бурение', 'Deep drilling', 'Khoan sâu'], cost: [200, 350], time: [40, 60], at: ['hq'], research: true, max: 2, icon: '⛏' },
};
// множители урона: b пуля, m крупнокалиберная (турели), r ракета, s снаряд, f зенитка, g граната, a артиллерия, l рельса, x орбитальный
const ARMOR = {
  inf:     { b: 1, m: 1,    r: 1,   s: 1,   f: 1,   g: 1,   a: 1,   l: 1,   x: 1 },
  tank:    { b: 0.2, m: 0.45,  r: 1,   s: 1,   f: 0.3, g: 0.6, a: 1,   l: 0.8, x: 1 },
  drone:   { b: 1, m: 1,    r: 0.6, s: 1,   f: 1.3, g: 0.8, a: 0.5, l: 1.2, x: 1 },
  builder: { b: 1, m: 1,    r: 1,   s: 1,   f: 1,   g: 1,   a: 1,   l: 1,   x: 1 },
  bld:     { b: 0.25, m: 0.3, r: 1,   s: 1.1, f: 0.2, g: 0.7, a: 1.1, l: 0.5, x: 1.5 },
  hq:      { b: 0.15, m: 0.12, r: 0.6, s: 0.3, f: 0.1, g: 0.4, a: 0.4, l: 0.3, x: 0.7 },
  prop:    { b: 0, m: 0,    r: 0.8, s: 1,   f: 0,   g: 0.6, a: 1,   l: 0.3, x: 1 },
};
// оружие игрока
const WEAPONS = {
  rifle: { n: ['Импульсная винтовка', 'Pulse rifle', 'Súng trường xung'], dmg: 9,  rof: 0.11,  mag: 32,  reload: 1.7, spread: 0.010, speed: 140, type: 'b' },
  rail:  { n: ['Рельсотрон', 'Railgun', 'Súng ray'],              dmg: 95, rof: 1.05,  mag: 5,   reload: 2.4, spread: 0,     speed: 0,   type: 'l' },
  hmg:   { n: ['Тяжёлый пулемёт', 'Heavy MG', 'Súng máy hạng nặng'],         dmg: 9,  rof: 0.062, mag: 150, reload: 3.0, spread: 0.022, speed: 150, type: 'b', temp: true },
};

// классы бойцов: у каждого своё оружие, сильные и слабые стороны
const ROLES = {
  assault: { i: 0, icon: '◆', n: ['Штурмовик', 'Assault', 'Xung kích'], hp: 100, dmg: 10, cd: 0.38, cdr: 0.2, spread: 1, rocket: 10, speed: 1, w: 'rifle',
             d: ['Универсал: винтовка, ракета.', 'All-rounder: rifle and rocket.', 'Đa năng: súng trường và tên lửa.'] },
  heavy:   { i: 1, icon: '▣', n: ['Пулемётчик', 'Heavy gunner', 'Xạ thủ súng máy'], hp: 135, dmg: 7, cd: 0.11, cdr: 0.06, spread: 1.9, rocket: 16, speed: 0.82, w: 'hmg', supp: true,
             d: ['Косит пехоту и прижимает её к земле. Медленный, слаб против танков.', 'Mows down infantry and pins it. Slow, weak against tanks.', 'Quét bộ binh và áp chế. Chậm, yếu trước xe tăng.'] },
  rocket:  { i: 2, icon: '➹', n: ['Гранатомётчик', 'Rocketeer', 'Lính tên lửa'], hp: 95, dmg: 8, cd: 0.45, cdr: 0.2, spread: 1.1, rocket: 6.5, speed: 1, w: 'rifle', prefer: 'tank',
             d: ['Ракеты каждые 6–7 с: гроза танков и зданий. Слаб против пехоты.', 'Rockets every 6–7 s: bane of tanks and buildings. Weak against infantry.', 'Tên lửa mỗi 6–7 giây: khắc tinh xe tăng và công trình. Yếu trước bộ binh.'] },
  sniper:  { i: 3, icon: '⌖', n: ['Снайпер', 'Sniper', 'Bắn tỉa'], hp: 80, dmg: 58, cd: 2.3, cdr: 0.6, spread: 0.25, rocket: 14, speed: 1, w: 'rail', range: 150, rail: true,
             d: ['Рельсотрон бьёт издалека. Держится позади, хрупкий вблизи.', 'Railgun from afar. Stays back, fragile up close.', 'Súng ray bắn từ xa. Ở phía sau, mong manh khi cận chiến.'] },
  medic:   { i: 4, icon: '✚', n: ['Медик-инженер', 'Medic-engineer', 'Quân y - kỹ sư'], hp: 100, dmg: 9, cd: 0.4, cdr: 0.2, spread: 1, rocket: 10, speed: 1.05, w: 'rifle', heal: 1.8,
             d: ['Чинит бойцов и технику, быстрее бегает.', 'Repairs troopers and vehicles, runs faster.', 'Sửa lính và xe, chạy nhanh hơn.'] },
  scout:   { i: 5, icon: '◈', n: ['Разведчик', 'Scout', 'Trinh sát'], hp: 85, dmg: 8, cd: 0.35, cdr: 0.15, spread: 1, rocket: 14, speed: 1.35, w: 'rifle', vision: 115,
             d: ['Быстрый, видит на 115 м и подсвечивает врагов для всей армии.', 'Fast, sees 115 m and spots enemies for the whole army.', 'Nhanh, nhìn xa 115 m và đánh dấu địch cho cả quân.'] },
};
const SQUAD_ROLES = { std: ['assault', 'heavy', 'rocket', 'medic'], elite: ['assault', 'sniper', 'rocket', 'assault'] };
function roleOf(u){ return ROLES[u && u.role] || ROLES.assault; }

// =====================================================================
//  СОСТОЯНИЕ
// =====================================================================
const S = {
  R: DOME, bounces: 4, rtsBounces: 0, grid: 1, self: 0, tiles: 4, scale: 0.75, autoRes: true, quality: 2, freecam: false,
  third: false, follow: false, navLine: true, vhs: false, showHelp: false, debug: false, diff: 1, attract: true, paused: false,
  mode: 'fps', units: [], squads: [], vehicles: [], drones: [], builders: [], buildings: [], hq: [], teams: [],
  proj: [], sparks: [], wrecks: [], fx: [], lights: [], beams: [], cps: [], waves: [], pods: [], strikes: [], popups: [],
  me: null, time: 0, over: false, sel: new Set(), selB: null, feed: [], nextSquad: 1,
  rts: { dir: [0, 1, 0], fwd: [0, 0, -1], h: 32, yawV: 0 },
  cam: null, flashT: 0, dmgT: 0, hitT: 0, shake: 0, recoil: 0, muzzle: 0, bob: 0, slow: 0, slowT: 0,
  objective: null, task: null, place: null, events: [], stats: {}, groupsCtl: {}, alerts: [],
};
window.game = S;
let NID = 1;

function feed(text, color){ S.feed.push({ text, color: color || '#cfe3ff', t: S.time }); if (S.feed.length > 8) S.feed.shift(); }
function emit(type, data){ S.events.push(Object.assign({ type }, data || {})); }

// =====================================================================
//  СОЗДАНИЕ СУЩНОСТЕЙ
// =====================================================================
function makeBody(pos, rad){
  const up = norm(pos);
  return { id: NID++, pos, vel: [0,0,0], up, fwd: anyTangent(up), aim: null, rad: rad || RULES.RAD,
           grounded: false, groundN: up, thrusting: false, energy: 0, locked: false, teleports: 0, keepLook: false,
           alive: true, flash: 0, seen: [0, 0], phase: random() * 6, moveAmt: 0, airT: 0, cd: random() * 0.5, think: random() * 0.3,
           lastHurt: -99, kills: 0 };
}
function surfacePoint(dir, rad){
  dir = norm(dir);
  let r = groundR(dir) + (rad || RULES.RAD) + 0.15;
  let p = mul(dir, r);
  for (let i = 0; i < 30 && mapJS(p[0], p[1], p[2]) < (rad || RULES.RAD); i++){ r += 0.5; p = mul(dir, r); }
  return p;
}
function jetOf(u){
  const base = u.elite ? JET.elite : (S.teams[u.team].jet2 ? JET.jet2 : JET.basic);
  if (u.team === 0 && typeof PROG !== 'undefined' && PROG.has('jet')) return Object.assign({}, base, { emax: base.emax * 1.5 });
  return base;
}
function makeInf(pos, team, leader, elite, role){
  const e = makeBody(pos, RULES.RAD);
  const R = ROLES[role] || ROLES.assault;
  Object.assign(e, { cls: 'inf', team, leader: !!leader, elite: !!elite, role: role || 'assault',
    hp: round((elite ? R.hp * 1.5 : R.hp) + (leader ? 40 : 0)), rocketCd: 3 + random() * R.rocket * 0.6, target: null, stuckT: 0, hopT: 0,
    squad: null, parked: false, stepI: 0, suppT: 0, walk: RULES.WALK * R.speed });
  e.maxhp = e.hp; e.jet = jetOf(e); e.energy = e.jet.emax; e.aim = e.fwd;
  return e;
}
function newSquad(t, elite){
  const sq = { id: S.nextSquad++, team: t, units: [], elite: !!elite, goal: null, cp: null, order: 'idle', focus: null,
               manualUntil: 0, sky: null, skyT: 0, launchT: -999, abil: {}, kills: 0, vet: 0, reinfT: 0, strat: null };
  S.squads.push(sq);
  return sq;
}
function spawnSquad(t, elite, atPos, n, roles){
  const sq = newSquad(t, elite);
  const b = atPos ? norm(atPos) : BASES[t], tA = anyTangent(b), tB = cross(b, tA);
  const a0 = random() * PI * 2;
  for (let k = 0; k < (n || 4); k++){
    const a = a0 + k * (atPos ? 1.57 : 0.3), rr = atPos ? 4 : 24;
    const dir = norm(add(mul(b, RM), add(mul(tA, cos(a) * rr), mul(tB, sin(a) * rr))));
    const u = makeInf(surfacePoint(dir), t, k === 0, elite, (roles || (elite ? SQUAD_ROLES.elite : SQUAD_ROLES.std))[k % (roles ? roles.length : 4)]);
    u.fwd = tangent(sub(u.pos, mul(b, RM)), u.up); u.aim = u.fwd;
    u.squad = sq; sq.units.push(u); S.units.push(u);
  }
  return sq;
}
function addToSquad(sq, pos){
  const want = sq.elite ? SQUAD_ROLES.elite : SQUAD_ROLES.std;
  const have = sq.units.map(x => x.role);
  const role = want.find((r, i) => have.filter(h => h === r).length < want.filter((w, j) => w === r && j <= i).length) || want[0];
  const u = makeInf(surfacePoint(norm(pos)), sq.team, !sq.units.some(x => x.leader), sq.elite, role);
  u.squad = sq; sq.units.push(u); S.units.push(u);
  u.fwd = tangent(sub(sq.units[0].pos, u.pos), u.up); u.aim = u.fwd;
  return u;
}
let TANK_SERIAL = [1, 1];
function makeTank(pos, team){
  const e = makeBody(pos, 1.5);
  Object.assign(e, { cls: 'tank', team, hp: team ? 1150 : 1400, mgCd: 0, walk: team ? 8.5 : 7, think: 0, target: null, stuckT: 0, jet: null,
                     goal: null, order: 'idle', cp: null, focus: null, manualUntil: 0, abil: {}, vet: 0, serial: TANK_SERIAL[team]++, overT: 0, strat: null });
  e.maxhp = e.hp; e.aim = e.fwd;
  S.vehicles.push(e);
  return e;
}
let DRONE_SERIAL = [1, 1];
function makeDrone(pos, team){
  const e = makeBody(pos, 0.7);
  Object.assign(e, { cls: 'drone', team, hp: 90, alt: 11 + random() * 8, target: null, gr: RM, grT: 0, orbit: random() < 0.5 ? 1 : -1, jet: null,
                     goal: null, order: 'idle', cp: null, focus: null, manualUntil: 0, abil: {}, vet: 0, serial: DRONE_SERIAL[team]++, strat: null });
  e.maxhp = e.hp; e.aim = e.fwd;
  S.drones.push(e);
  return e;
}
function builderHome(team){
  if (S.hq[team] && S.hq[team].alive) return mul(BASES[team], RM + 22);
  const op = S.buildings.find(b => b.alive && b.team === team && b.done && (b.type === 'outpost' || b.type === 'factory'));
  return op ? add(op.pos, mul(op.up, 18)) : null;
}
// v6: инженер-строитель — наземный (парящий) юнит, которым командует игрок или ИИ (логика — rts_build.js)
function makeBuilder(team, pos){
  pos = pos || builderSpawn(team); if (!pos) return null;
  const e = makeBody(surfacePoint(norm(pos), ECO.HOVER), 0.5);
  const serial = 1 + S.builders.filter(b => b.team === team).reduce((m, b) => max(m, b.serial || 0), 0);
  Object.assign(e, { cls: 'builder', team, hp: 120, order: 'idle', goal: null, site: null, jobs: [], abil: {}, manualUntil: 0, byPlayer: false, auto: false,
                     serial, gr: 0, grT: 0, jet: null, work: 0, beam: null, vet: 0, focus: null, cp: null });
  e.maxhp = e.hp; e.aim = e.fwd;
  S.builders.push(e);
  return e;
}
function makeBuilding(type, team, dir, fwdHint){
  const T = BTYPES[type];
  dir = norm(dir);
  const gr = groundR(dir);
  const pos = mul(dir, gr - 0.05);
  const up = dir;
  const fwd = tangent(fwdHint || sub(mul(BASES[team], -1), dir), up);   // фасадом «от полюса»
  const b = { id: NID++, cls: 'bld', type, team, pos, up, fwd, R: norm(cross(fwd, up)), hp: T.hp * 0.15, maxhp: T.hp,
              built: 0, done: false, queue: [], prodT: 0, aim: fwd, cd: 0, alive: true, flash: 0, seen: [0, 0],
              H: T.H, bound: T.bound, rad: T.rad, target: null, think: 0, rally: null, lastHurt: -99 };
  S.buildings.push(b);
  BLD_LIST = S.buildings; bgridDirty();
  return b;
}
function bldCenter(b){ return add(b.pos, mul(b.up, b.H * 0.4 * max(0.2, b.built))); }
function gunPos(b){
  if (b.cls === 'hq') return mul(BASES[b.team], RM + 13.5);
  return add(b.pos, mul(b.up, b.type === 'aa' ? 2.0 : 1.65));
}
function bname(type){ return N2(BTYPES[type].n); }
function pname(key){ return N2(PRODUCTS[key].n); }
function tankName(t){ return N2(TANK_NAME[t]); }

// ---------- группы: отряд, танк или дрон ----------
function isSquad(g){ return !!g && Array.isArray(g.units); }
function groupOf(e){ if (!e) return null; if (e.cls === 'inf') return e.squad; if (e.cls === 'tank' || e.cls === 'drone' || e.cls === 'builder') return e; return null; }
function groupUnits(g){ return isSquad(g) ? g.units : (g ? [g] : []); }
function groupAlive(g){ return isSquad(g) ? (g.units.length > 0 && S.squads.includes(g)) : !!(g && g.alive); }
function groupsOf(team){ return [...S.squads.filter(s => s.team === team), ...S.vehicles.filter(v => v.team === team && v.alive), ...S.drones.filter(d => d.team === team && d.alive)]; }
function groupLabel(g){
  if (!g) return '';
  if (isSquad(g)) return (g.solo ? N2(ROLES[g.solo].n) : g.elite ? tr('Десант', 'Sky squad', 'Đội đổ bộ') : tr('Отряд', 'Squad', 'Đội')) + ' ' + g.id;
  if (g.cls === 'tank') return tr('Танк', 'Tank', 'Xe tăng') + ' ' + g.serial;
  if (g.cls === 'builder') return tr('Инженер', 'Builder', 'Kỹ sư') + ' ' + (g.serial || '');
  return tr('Дрон', 'Drone', 'Drone') + ' ' + g.serial;
}
function groupHP(g){ let h = 0, m = 0; for (const u of groupUnits(g)){ h += max(0, u.hp); m += u.maxhp; } return m ? h / m : 0; }
function ctrlEntity(){ return S.me && (S.me.alive || S.me.cls === 'bld') ? S.me : null; }
function playerGroup(){ if (S.attract || S.mode !== 'fps') return null; const c = ctrlEntity(); if (!c) return null; if (c.cls === 'bld') return S.turretBody ? S.turretBody.squad : null; return groupOf(c); }
function isPlayerSrc(src){ return !!src && !S.attract && (src === S.me || (S.me && src === ctrlEntity())); }

// =====================================================================
//  ФИЗИКА — общие правила для всех
// =====================================================================
function collide(e){
  for (let i = 0; i < 20; i++){
    const d = mapJS(e.pos[0], e.pos[1], e.pos[2]);
    if (d >= e.rad) return;
    const n = gradN(e.pos);
    e.pos = add(e.pos, mul(n, e.rad - d));
    const vn = dot(e.vel, n);
    if (vn < 0){
      e.vel = sub(e.vel, mul(n, vn));
      if (vn < -3) e.vel = mul(e.vel, 0.6);
      if (vn < -9 && e.cls === 'inf') emit('land', { pos: e.pos, e, hard: vn < -16 });
    }
  }
}
function clampFwd(e){
  const c = dot(e.fwd, e.up);
  if (abs(c) < 0.995) return;
  let t = sub(e.fwd, mul(e.up, c));
  t = len(t) < 1e-4 ? anyTangent(e.up) : norm(t);
  e.fwd = norm(add(mul(e.up, Math.sign(c) * 0.995), mul(t, sqrt(1 - 0.995*0.995))));
}
function alignUp(e, dt){
  const T = norm(e.pos);
  const ang = acos(clamp(dot(e.up, T), -1, 1));
  if (ang < 1e-4){ e.keepLook = false; return; }
  let axis = cross(e.up, T);
  if (len(axis) < 1e-5){ axis = cross(e.up, e.fwd); if (len(axis) < 1e-5) axis = anyTangent(e.up); }
  axis = norm(axis);
  const step = min(ang, (e.keepLook ? 2.5 : 7) * dt);
  e.up = norm(rotAxis(e.up, axis, step));
  if (!e.keepLook){ e.fwd = norm(rotAxis(e.fwd, axis, step)); if (e.aim) e.aim = norm(rotAxis(e.aim, axis, step)); }
  if (ang - step < 0.05) e.keepLook = false;
  clampFwd(e);
}
function physStep(e, inp, dt, free){
  const r = len(e.pos), Up = mul(e.pos, 1 / r);
  const deep = underground(e.pos);
  e.grounded = false;
  if (!free && mapJS(e.pos[0], e.pos[1], e.pos[2]) < e.rad + 0.12){
    const n = gradN(e.pos);
    if (dot(n, Up) > 0.3){ e.grounded = true; e.groundN = n; }
  }
  const J = e.jet;
  const thr = !!J && !free && inp.thrust && !e.locked && e.energy > 0;
  // v5.3: воздушный тормоз — ранец бьёт против скорости (тратит ту же энергию)
  const brk = !!J && !free && !!inp.brake && !e.grounded && !e.locked && e.energy > 0;
  if (e.portT > 0) e.portT -= dt;
  if (J){
    if (thr || brk){ e.energy -= dt; if (e.energy <= 0){ e.energy = 0; e.locked = true; } }
    else {
      e.energy = min(J.emax, e.energy + dt * ((e.grounded || deep) ? J.rg : J.ra));
      if (e.locked && e.energy >= J.unlock) e.locked = false;
    }
  }
  e.thrusting = thr || brk || !!inp.boost;
  e.braking = brk;
  e.lifting = false;
  if (free){
    const k = 1 - Math.exp(-dt * 5);
    e.vel = add(e.vel, mul(sub(mul(inp.wish3, inp.freeSpeed), e.vel), k));
  } else {
    let a = mul(Up, -gAt(r));
    if (thr){
      let td = inp.thrustDir;
      // сразу после выхода из портала тяга наружу не работает — иначе снова влетаем в купол и «зависаем»
      if (e.portT > 0){ const o = dot(td, Up); if (o > 0) td = sub(td, mul(Up, o)); }
      a = add(a, mul(td, J.thrust));
      // рулёжка: в полёте тяга гасит снос поперёк своего направления
      const tl = len(td);
      // (гасим только горизонтальный снос — падение по вертикали остаётся честным, без «зависания»)
      if (!e.grounded && tl > 0.2){ const d = mul(td, 1 / tl); let vp = sub(e.vel, mul(d, dot(e.vel, d))); vp = sub(vp, mul(Up, dot(vp, Up))); a = add(a, mul(vp, -RULES.STEER)); }
    }
    if (brk){
      const sp = len(e.vel);
      if (sp > 0.3) a = add(a, mul(e.vel, -min(sp / dt, J.thrust * RULES.BRAKE) / sp));
    }
    if (inp.boost) a = add(a, mul(inp.boostDir, inp.boost));
    if (inp.lift && inShaft(e.pos)){
      const vr = dot(e.vel, Up);
      a = add(a, mul(Up, gAt(r) + (vr < 12 ? 5 : 0)));
      e.lifting = true;
    }
    if (e.grounded){
      const n = e.groundN, vn = dot(e.vel, n);
      const vt = sub(e.vel, mul(n, vn));
      const w = sub(inp.wish, mul(n, dot(inp.wish, n)));
      let spd = (e.walk || RULES.WALK) * inp.speedMul;
      if (e.suppT > 0) spd *= 0.5;
      if (e.overT > 0) spd *= 1.8;
      const target = mul(w, spd);
      const k = 1 - Math.exp(-dt * (e.cls === 'tank' ? 4 : e.sliding ? 0.7 : 12));
      e.vel = add(add(vt, mul(sub(target, vt), k)), mul(n, vn));
      if (inp.jump && vn < 1 && e.cls === 'inf') e.vel = add(e.vel, mul(n, RULES.JUMP));
    } else {
      if (e.cls === 'inf') e.vel = add(e.vel, mul(inp.wish, RULES.AIR * dt));
      if (!deep && r < RM + 25) e.vel = mul(e.vel, 1 - RULES.DRAG * dt);   // «пыль» у поверхности; выше — вакуум
    }
    e.vel = add(e.vel, mul(a, dt));
  }
  const n = max(1, Math.ceil(len(e.vel) * dt / 0.3)), h = dt / n;
  e.justTeleported = false;
  for (let s = 0; s < n; s++){
    e.pos = add(e.pos, mul(e.vel, h));
    const l = len(e.pos);
    if (l > S.R){
      e.pos = mul(e.pos, 1 - 2 * S.R / l); e.teleports++; e.justTeleported = true; e.keepLook = true; if (S.stats.tele) S.stats.tele[e.team]++;
      // v5.3: гарантированный выход из портала внутрь. Раньше при касательном влёте прямая уводила
      // обратно за купол, и юнит пинг-понгом прыгал между антиподами («завис в воздухе»)
      const Un = norm(e.pos), vr = dot(e.vel, Un);
      if (vr > -RULES.PORTAL_PUSH) e.vel = add(e.vel, mul(Un, -RULES.PORTAL_PUSH - vr));
      e.portT = RULES.PORTAL_GRACE;
    }
    collide(e);
  }
  alignUp(e, dt);
  // анимация шага
  const Up2 = norm(e.pos);
  const vt = len(sub(e.vel, mul(Up2, dot(e.vel, Up2))));
  if (e.grounded){
    e.phase += vt * dt * (e.cls === 'tank' ? 1.3 : 3.9);
    e.moveAmt += (clamp(vt / 3, 0, 1) - e.moveAmt) * (1 - Math.exp(-dt * 8));
  } else e.moveAmt *= Math.exp(-dt * 4);
  e.airT = (e.grounded || deep) ? 0 : e.airT + dt;
}
function isAir(e){ return e.cls === 'drone' || (e.cls === 'inf' && e.airT > 0.8 && altitude(e.pos) > 4); }

// =====================================================================
//  ЦЕЛИ
// =====================================================================
let TGT = [[], []];   // TGT[t] — всё, во что может стрелять команда t
function centerOf(e){
  if (e.cls === 'inf') return add(e.pos, mul(e.up, 0.3));
  if (e.cls === 'tank') return add(e.pos, mul(e.up, 0.3));
  if (e.cls === 'bld') return bldCenter(e);
  return e.pos;
}
function hitRadius(e){
  if (e.cls === 'inf') return e.crouch ? 0.6 : 0.8;
  if (e.cls === 'tank') return 2.4;
  if (e.cls === 'drone') return 1.1;
  if (e.cls === 'builder') return 0.7;
  if (e.cls === 'hq') return 14;
  return e.rad;
}
function rebuildTargets(){
  for (const t of [0, 1]){
    const L = [];
    for (const u of S.units) if (u.alive && u.team !== t) L.push(u);
    for (const v of S.vehicles) if (v.alive && v.team !== t) L.push(v);
    for (const d of S.drones) if (d.alive && d.team !== t) L.push(d);
    for (const b of S.builders) if (b.alive && b.team !== t) L.push(b);
    for (const b of S.buildings) if (b.alive && b.team !== t) L.push(b);
    TGT[t] = L;
  }
}
// opts: range, air (только воздушные), noAir, structures, prefer, focus
function findTarget(src, team, eye, opts){
  const range = opts.range || GAME.RANGE;
  if (opts.focus && opts.focus.alive && dist(centerOf(opts.focus), eye) < range && los(eye, centerOf(opts.focus))){ opts.focus.seen[team] = max(opts.focus.seen[team], 1.5); return opts.focus; }
  let best = null, bs = 1e9;
  for (const e of TGT[team]){
    if (e.cls === 'inf' && e.squad && e.squad.solo === 'sniper' && e.seen[team] <= 0 && dist2(e.pos, eye) > 900) continue;   // маскировка
    const air = isAir(e);
    if (opts.air && !air) continue;
    if (opts.noAir && air) continue;
    const st = e.cls === 'bld';
    if (st && !opts.structures) continue;
    const c = centerOf(e);
    const d = dist(c, eye);
    if (d > range) continue;
    let score = d;
    if (st && e.type !== 'turret' && e.type !== 'aa') score += 60;
    if (opts.prefer && e.cls === opts.prefer) score -= 40;
    if (score >= bs) continue;
    if (!los(eye, c)) continue;
    bs = score; best = e;
  }
  if (best){ best.seen[team] = max(best.seen[team], 1.5); return best; }
  if (opts.structures !== false){
    const h = S.hq[1 - team];
    if (h.alive && dist(h.pos, eye) < range + 25) return h;
  }
  return null;
}

// =====================================================================
//  БОЙ
// =====================================================================
function burst(p, n, speed, life){
  for (let i = 0; i < n; i++) S.sparks.push({ pos: p, vel: mul(randUnit(), (speed || 6) * (0.4 + random())), life: (life || 0.25) + random() * 0.35 });
  if (S.sparks.length > 110) S.sparks.splice(0, S.sparks.length - 110);
}
function addLight(pos, col, rad, life, glow){
  S.lights.push({ pos, col, rad, life, t: 0, glow: glow || 0 });
  if (S.lights.length > 40) S.lights.shift();
}
function addWave(pos, size, life){ S.waves.push({ pos, size, t: 0, life: life || (0.45 + 0.08 * size) }); if (S.waves.length > 10) S.waves.shift(); }
function fxExplosion(p, size, noWave){
  S.fx.push({ type: 'fire', pos: p, r0: 0.8 * size, r1: 3.2 * size, life: 0.5 + 0.2 * size, t: 0, inten: 1 });
  const up = norm(p);
  for (let k = 0; k < 1 + size; k++)
    S.fx.push({ type: 'smoke', pos: add(p, mul(randUnit(), size * 0.6)), vel: add(mul(up, 1.2 + random()), mul(randUnit(), 0.7)),
                r0: size * 1.0, r1: size * 3.5 + 2, life: 4 + size * 2 + random() * 2, t: 0, grey: 0.2 + random() * 0.15, dens: 1.4, heat: 0.6 });
  if (S.fx.length > 80) S.fx.splice(0, S.fx.length - 80);
  burst(p, 6 + size * 5, 5 + size * 3);
  // обломки — длинные искры с гравитацией
  for (let i = 0; i < size * 3; i++) S.sparks.push({ pos: p, vel: add(mul(up, 4 + random() * 5 * size), mul(randUnit(), 3 + size * 2)), life: 0.9 + random() * 0.8, big: 1 });
  addLight(p, [9 * size, 5 * size, 2 * size], 12 + size * 9, 0.25 + 0.12 * size, 0.012);
  if (!noWave) addWave(p, size);
  emit('boom', { pos: p, size });
}
function fxSmoke(p, size, grey, dens){
  S.fx.push({ type: 'smoke', pos: p, vel: mul(norm(p), 0.8 + random() * 0.6), r0: size, r1: size * 2.5, life: 3 + random() * 2, t: 0, grey: grey || 0.3, dens: dens || 0.8, heat: 0 });
  if (S.fx.length > 80) S.fx.splice(0, S.fx.length - 80);
}
function fire(eye, dir, team, spread, dmg, speed, from, type, extra){
  const d = norm(add(dir, mul(randUnit(), spread)));
  const p = { pos: add(eye, mul(d, 0.9)), org: eye, vel: mul(d, speed), team, life: type === 'r' ? 4 : type === 'g' ? 2.0 : 2.2, dmg, from, type: type || 'b' };
  if (extra) Object.assign(p, extra);
  S.proj.push(p);
  return p;
}
function segSphere(a, b, c, r){
  const ab = sub(b, a), t = clamp(dot(sub(c, a), ab) / (dot(ab, ab) || 1), 0, 1);
  return len(sub(add(a, mul(ab, t)), c)) < r;
}
// пули смертоноснее всего на средней дистанции: в упор и издалека — слабее
function rangeFactor(d){ return 0.45 + 0.85 * smoothstep(2, 20, d) - 0.55 * smoothstep(55, 125, d); }
function damage(e, dmg, src, ptype){
  if (!e.alive) return;
  ptype = ptype || 'b';
  const arm = ARMOR[e.cls] || ARMOR.inf;
  dmg *= (arm[ptype] !== undefined ? arm[ptype] : 1);
  if (dmg <= 0) return;
  if (src && src.team !== undefined && src.team < 2){
    dmg *= 1 + 0.15 * (S.teams[src.team].weapons || 0);
    const sg = groupOf(src); if (sg && sg.vet) dmg *= 1 + 0.08 * sg.vet;
    if (src.team === 1 && e.team === 0) dmg *= DK().dmg;
    if (isPlayerSrc(src)) dmg *= PROG.dmgMul();
  }
  if (e.cls !== 'bld' && e.cls !== 'hq' && e.cls !== 'prop' && e.team < 2){
    dmg *= 1 - 0.12 * (S.teams[e.team].armor || 0);
    const eg = groupOf(e); if (eg && eg.vet) dmg *= 1 - 0.06 * eg.vet;
    if (e === ctrlEntity() && !S.attract) dmg *= PROG.armorMul();
  }
  if (window.DMGLOG) window.DMGLOG(e, src, ptype, dmg);
  e.hp -= dmg; e.flash = 1; e.lastHurt = S.time;
  if (e.cls === 'inf' && e.team === 0) SQUADUI.onHurt(e, dmg);
  if (e.cls === 'inf' && src && src.role === 'heavy') e.suppT = max(e.suppT || 0, 1.1);
  if (src && src.team !== undefined && src.team < 2 && src.team !== e.team){ e.seen[src.team] = 2; e.lastAttacker = src; }
  const meCtrl = ctrlEntity();
  if (isPlayerSrc(src) && S.mode === 'fps'){ S.hitT = 0.15; emit('hitmark', {}); e.playerHitT = S.time; if (ptype === 'b' || ptype === 'l') ADAPT.hits++; }
  if (meCtrl && e === meCtrl && S.mode === 'fps' && !S.attract){ S.dmgT = min(0.6, S.dmgT + dmg / 60); if (src && src.pos) S.dmgDir = { pos: src.pos, t: 1.2 }; }
  if (e.cls === 'hq'){ e.lastHit = S.time; if (e.hp <= 0) destroyHQ(e, src); return; }
  if (e.hp <= 0) destroy(e, src);
}
// ударная волна раскидывает всех рядом (и своих тоже — без урона)
function knockback(p, dmg, radius){
  const R = radius * 1.4, up = norm(p);
  const push = (e, k) => {
    const v = sub(centerOf(e), p), d = len(v); if (d > R) return;
    const f = (1 - d / R) * min(14, dmg * 0.09) * k;
    e.vel = add(e.vel, add(mul(d > 0.01 ? mul(v, 1 / d) : up, f), mul(up, f * 0.6)));
    if (e === ctrlEntity()){ S.shake = max(S.shake, 0.3 + f * 0.06); S.dmgT = max(S.dmgT, 0.1); }
  };
  for (const u of S.units) if (u.alive) push(u, 1);
  for (const w of S.wrecks) push(w, 1.3);
  for (const d of S.drones) if (d.alive) push(d, 0.8);
  for (const v of S.vehicles) if (v.alive) push(v, 0.12);
}
function splash(p, team, dmg, radius, src, ptype){
  knockback(p, dmg, radius);
  for (const e of TGT[team]){
    if (!e.alive) continue;
    const d = dist(centerOf(e), p) - hitRadius(e) * 0.5;
    if (d < radius) damage(e, dmg * (1 - max(0, d) / radius), src, ptype);
  }
  const h = S.hq[1 - team];
  if (h.alive && dist(h.pos, p) < 16 + radius) damage(h, dmg, src, ptype);
  for (const pr of PROPS){
    if (!pr.alive) continue;
    const d = dist(add(pr.pos, mul(pr.up, 1.5)), p) - pr.bound * 0.6;
    if (d < radius) damage(pr, dmg * (1 - max(0, d) / radius), src, ptype);
  }
}
function addCmd(team, v){ const T = S.teams[team]; T.cmdAcc = (T.cmdAcc || 0) + v; while (T.cmdAcc >= 1){ T.cmdAcc -= 1; T.cmd = min(GAME.CMD_MAX, T.cmd + 1); } }
function killCredit(e, src){
  if (!src || src.team === undefined || src.team > 1 || src.team === e.team) return;
  src.kills = (src.kills || 0) + 1;
  const g = groupOf(src);
  if (g){ g.kills = (g.kills || 0) + (e.cls === 'tank' ? 3 : e.cls === 'bld' ? 2 : 1); const nv = g.kills >= 24 ? 3 : g.kills >= 12 ? 2 : g.kills >= 5 ? 1 : 0; if (nv > g.vet){ g.vet = nv; if (g.team === 0) feed(tr(`${groupLabel(g)}: ветеранство ${'★'.repeat(nv)}`, `${groupLabel(g)}: veterancy ${'★'.repeat(nv)}`, `${groupLabel(g)}: cựu binh ${'★'.repeat(nv)}`), '#ffd27a'); } }
  if (src.team === 0) SQUADUI.onKill(e, src);
  addCmd(src.team, e.cls === 'tank' ? 0.6 : e.cls === 'bld' ? 0.5 : 0.22);
  S.stats.kills[src.team]++;
}
function destroy(e, src){
  if (!e.alive) return;
  if (e.cls === 'prop'){ destroyProp(e, src); return; }
  e.alive = false;
  const scrap = (n) => { if (src && src.team !== undefined && src.team < 2 && src.team !== e.team) S.teams[src.team].ore += n; };
  killCredit(e, src);
  PROG.onKill(e, src);
  if (e.cls === 'inf'){
    burst(add(e.pos, mul(e.up, 0.3)), 14, 8);
    fxSmoke(add(e.pos, mul(e.up, 0.2)), 0.6, 0.25);
    emit('die', { pos: e.pos, e });
    if (e.team === 0) SQUADUI.onDie(e);
    e.wreckT = 30; e.thrusting = false; e.heat = 1;
    S.wrecks.push(e); if (S.wrecks.length > 16) S.wrecks.shift();
    scrap(GAME.SCRAP);
    const sq = e.squad;
    if (sq){
      sq.units = sq.units.filter(x => x.alive);
      if (sq.units.length && !sq.units.some(x => x.leader)) sq.units[0].leader = true;
      if (!sq.units.length){ S.squads.splice(S.squads.indexOf(sq), 1); S.sel.delete(sq); }
    }
    S.units.splice(S.units.indexOf(e), 1);
    if (e === S.me){
      S.me = null; ADAPT.deaths++;
      if (S.mode === 'fps' && !S.attract) feed(tr('Твой робот уничтожен — переключение на ближайшего к бою', 'Your robot is destroyed — switching to the one closest to the fight', 'Robot của bạn đã bị hạ — chuyển sang robot gần trận đánh nhất'), '#f88');
    }
  } else if (e.cls === 'tank'){
    fxExplosion(add(e.pos, mul(e.up, 0.6)), 3);
    scrap(40);
    S.vehicles.splice(S.vehicles.indexOf(e), 1); S.sel.delete(e);
    if (!S.attract) feed(e.team === 0 ? tr(`Наш ${groupLabel(e).toLowerCase()} уничтожен`, `Our ${groupLabel(e)} destroyed`, `${groupLabel(e)} của ta đã bị phá hủy`) : tr('Вражеский танк уничтожен', 'Enemy tank destroyed', 'Đã hạ xe tăng địch'), e.team === 0 ? '#f88' : TEAM[0].css);
    if (e === S.me){ S.me = null; ADAPT.deaths++; }
  } else if (e.cls === 'drone'){
    fxExplosion(e.pos, 1.2); scrap(10);
    S.drones.splice(S.drones.indexOf(e), 1); S.sel.delete(e);
    if (e === S.me){ S.me = null; }
  } else if (e.cls === 'builder'){
    fxExplosion(e.pos, 1);
    S.builders.splice(S.builders.indexOf(e), 1); S.sel.delete(e);
    scrap(10);
    if (e.team === 0 && !S.attract){ feed(tr(`Потерян ${groupLabel(e).toLowerCase()}`, `${groupLabel(e)} lost`, `Mất ${groupLabel(e)}`), '#f88'); if (S.mode === 'rts') pushAlert(e.pos); }
  } else if (e.cls === 'bld'){
    fxExplosion(bldCenter(e), e.type === 'turret' || e.type === 'aa' ? 3 : 5);
    for (let k = 0; k < 3; k++) fxSmoke(add(bldCenter(e), mul(randUnit(), e.rad * 0.5)), e.rad * 0.4, 0.15);
    S.buildings.splice(S.buildings.indexOf(e), 1);
    BLD_LIST = S.buildings; bgridDirty();
    if (S.selB === e) S.selB = null;
    if (!S.attract){
      feed(e.team === 0 ? tr(`Потеряно здание: ${bname(e.type)}`, `Building lost: ${bname(e.type)}`, `Mất công trình: ${bname(e.type)}`) : tr(`Уничтожено вражеское здание: ${bname(e.type)}`, `Enemy building destroyed: ${bname(e.type)}`, `Đã phá công trình địch: ${bname(e.type)}`), e.team === 0 ? '#f88' : TEAM[0].css);
      if (e.team === 0) emit('radio', { text: tr(`Потеряно здание: ${bname(e.type)}`, `Building lost: ${bname(e.type)}`, `Mất công trình: ${bname(e.type)}`), pri: 1 });
      if (e.team === 1 && BTYPES[e.type].key){ const left = keyBuildings(1).length; if (!S.hq[1].alive) emit('radio', { text: left ? tr(`Осталось ключевых зданий Роя: ${left}`, `Swarm key buildings left: ${left}`, `Công trình then chốt của Bầy Đàn còn lại: ${left}`) : tr('Последнее ключевое здание Роя уничтожено', 'The last Swarm key building is down', 'Công trình then chốt cuối cùng của Bầy Đàn đã sập'), pri: 2 }); }
    }
    if (S.me === e){ S.me = null; }
    scrap(30);
  }
}
function destroyHQ(h, src){
  if (!h.alive) return;
  h.alive = false; h.hp = 0; HQ_ALIVE[h.team] = false;
  h.queue = []; h.prodT = 0;
  const c = mul(BASES[h.team], RM + 6);
  for (let k = 0; k < 6; k++) fxExplosion(add(c, mul(randUnit(), 9)), 4 + random() * 2, k > 0);
  addWave(c, 10, 1.1);
  for (let k = 0; k < 6; k++) fxSmoke(add(c, mul(randUnit(), 10)), 5, 0.12, 1.2);
  killCredit({ cls: 'bld', team: h.team }, src);
  PROG.onKill({ cls: 'hq', team: h.team, pos: h.pos, alive: false }, src);
  // все стоявшие на штабе падают
  for (const u of S.units) if (u.alive && dist(u.pos, c) < 30) u.vel = add(u.vel, mul(randUnit(), 4));
  const left = keyBuildings(h.team).length;
  if (!S.attract){
    if (h.team === 1){ feed(tr(`ШТАБ РОЯ УНИЧТОЖЕН! Осталось ключевых зданий: ${left}`, `SWARM HQ DESTROYED! Key buildings left: ${left}`, `SỞ CHỈ HUY BẦY ĐÀN ĐÃ BỊ PHÁ! Công trình then chốt còn lại: ${left}`), TEAM[0].css); emit('radio', { text: left ? tr(`Штаб противника уничтожен. Добейте ключевые здания: ${left}`, `Enemy HQ destroyed. Finish the remaining key buildings: ${left}`, `Sở chỉ huy địch đã bị phá. Hãy hạ nốt các công trình then chốt: ${left}`) : tr('Штаб противника уничтожен', 'Enemy HQ destroyed', 'Sở chỉ huy địch đã bị phá'), pri: 3 }); }
    else { feed(tr(`НАШ ШТАБ УНИЧТОЖЕН! Держитесь за форпосты и заводы (${left})`, `OUR HQ IS DOWN! Hold the outposts and factories (${left})`, `SỞ CHỈ HUY CỦA TA ĐÃ SẬP! Giữ các tiền đồn và nhà máy (${left})`), '#f88'); emit('radio', { text: tr('Наш штаб уничтожен. Защищайте оставшиеся здания', 'Our HQ is down. Defend the remaining buildings', 'Sở chỉ huy của ta đã sập. Bảo vệ các công trình còn lại'), pri: 3 }); }
  }
  emit('hqdown', { team: h.team });
}
function destroyProp(p, src){
  if (!p.alive) return;
  p.alive = false; p.integ = 0; p.hp = 0;
  const c = add(p.pos, mul(p.up, 1.5));
  fxExplosion(c, 3);
  for (let k = 0; k < 2; k++) fxSmoke(add(c, mul(randUnit(), 2)), 2, 0.14, 1);
  burst(c, 20, 10, 0.6);
  const ore = PROP_KINDS[p.kind].ore || 35;
  if (src && src.team !== undefined && src.team < 2){ S.teams[src.team].ore += ore; if (isPlayerSrc(src)) feed(tr(`+${ore} руды: ${N2(PROP_KINDS[p.kind].n)} — разобрано взрывом`, `+${ore} ore: ${N2(PROP_KINDS[p.kind].n)} blown apart`, `+${ore} quặng: ${N2(PROP_KINDS[p.kind].n)} bị nổ tung`), TEAM[0].css); }
  emit('propdown', { p });
}
function keyBuildings(team){ return S.buildings.filter(b => b.alive && b.team === team && BTYPES[b.type].key); }

// =====================================================================
//  ЗДАНИЯ: проверка места, стройка, производство
// =====================================================================
function siteProblem(team, type, dir){
  const T = BTYPES[type];
  dir = norm(dir);
  if (T.vein) return veinSiteProblem(team, dir);   // v6: экстрактор — только на рудной жиле
  for (const v of veins()) if (surfDist(dir, v.dir) < 5 + T.rad) return tr('Здесь рудная жила — сюда только экстрактор', 'Ore vein here — extractors only', 'Đây là mạch quặng — chỉ đặt máy khai thác');
  const home = BASES[team];
  const dHome = RM * acos(clamp(dot(dir, home), -1, 1));
  let ok = S.hq[team].alive && dHome < GAME.BASE_R;
  if (!ok) for (const cp of S.cps) if (!cp.core && cp.owner === team && surfDist(dir, cp.dir) < GAME.CP_BUILD_R) ok = true;
  if (!ok) for (const b of S.buildings) if (b.alive && b.done && b.team === team && b.type === 'outpost' && surfDist(dir, b.up) < 55) ok = true;
  if (!ok) return tr('Только на своей базе, у своей точки или форпоста', 'Only at your base, an owned point or an outpost', 'Chỉ ở căn cứ, điểm đã chiếm hoặc tiền đồn của bạn');
  if (dHome < 16 + T.rad + 2) return tr('Слишком близко к штабу', 'Too close to the HQ', 'Quá gần sở chỉ huy');
  for (const cp of S.cps) if (!cp.core && surfDist(dir, cp.dir) < 9 + T.rad) return tr('Мешает маяк точки', 'Blocked by the point beacon', 'Bị cột đèn của điểm chắn');
  for (const a of AXES) if (surfDist(dir, a) < 22 + T.rad) return tr('Слишком близко к шахте', 'Too close to a shaft', 'Quá gần giếng');
  for (const b of S.buildings) if (b.alive && surfDist(dir, b.up) < b.rad + T.rad + 2) return tr('Место занято', 'Spot is taken', 'Chỗ này đã có');
  for (const p of PROPS) if (surfDist(dir, p.dir) < p.bound * 0.8 + T.rad) return tr('Мешают обломки', 'Wreckage in the way', 'Xác tàu chắn đường');
  const gr = groundR(dir);
  const t = anyTangent(dir), t2 = cross(dir, t);
  const ang = T.rad / RM;
  let hmin = 1e9, hmax = -1e9;
  for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const dd = norm(add(dir, add(mul(t, a * ang), mul(t2, b * ang))));
    const h = groundR(dd); hmin = min(hmin, h); hmax = max(hmax, h);
  }
  if (hmax - hmin > 1.6 + T.rad * 0.25 || abs(gr - (hmin + hmax) / 2) > 2.5) return tr('Слишком неровно', 'Too uneven', 'Quá gồ ghề');
  if (gr < RM - 25) return tr('Нельзя строить в яме', 'Cannot build in a pit', 'Không thể xây trong hố');
  return null;
}
function canBuild(team, type){
  const T = S.teams[team], B = BTYPES[type];
  if (T.ore < B.cost) return tr('Мало руды', 'Not enough ore', 'Không đủ quặng');
  if (B.req && !S.buildings.some(b => b.alive && b.team === team && b.type === B.req && b.done)) return tr(`Нужен ${bname(B.req)}`, `Requires ${bname(B.req)}`, `Cần ${bname(B.req)}`);
  const n = S.buildings.filter(b => b.alive && b.team === team && b.type === type).length;
  if (type === 'turret' && n >= GAME.MAX_TURRETS) return tr('Лимит турелей', 'Turret limit', 'Đã đạt giới hạn tháp súng');
  if (type === 'aa' && n >= GAME.MAX_AA) return tr('Лимит ПВО', 'Anti-air limit', 'Đã đạt giới hạn phòng không');
  if (type === 'outpost' && n >= GAME.MAX_OUTPOSTS) return tr('Лимит форпостов', 'Outpost limit', 'Đã đạt giới hạn tiền đồn');
  if ((type === 'factory' || type === 'hub' || type === 'airdock') && n >= (type === 'factory' ? 2 : 1)) return tr('Уже построено', 'Already built', 'Đã xây rồi');
  if (!S.builders.some(b => b.team === team && b.alive)) return tr('Нет инженеров-строителей', 'No builders', 'Không có kỹ sư xây dựng');
  return null;
}
// ставит чертёж (стройплощадку). Строят её инженеры (rts_build.js). S.lastSite — созданная стройка
function placeBuilding(team, type, dir){
  let vein = null;
  if (BTYPES[type].vein){ vein = nearestVein(dir, 14); if (vein) dir = vein.dir; }
  const why = canBuild(team, type) || siteProblem(team, type, dir);
  if (why) return why;
  S.teams[team].ore -= BTYPES[type].cost;
  const b = makeBuilding(type, team, dir);
  if (vein) b.vein = vein.i;
  S.lastSite = b;
  emit('place', { b });
  return null;
}
function sitesFor(team, key){
  const at = PRODUCTS[key].at;
  const L = [];
  if (at.includes('hq') && S.hq[team].alive) L.push(S.hq[team]);
  for (const b of S.buildings) if (b.alive && b.team === team && b.done && at.includes(b.type)) L.push(b);
  return L;
}
function productionSite(team, key){
  const list = sitesFor(team, key);
  if (!list.length) return null;
  return list.sort((a, b) => a.queue.length - b.queue.length)[0];
}
function countProduct(team, key){
  let n = countQueued(team, [key]);
  if (key === 'squad' || key === 'elite') n += S.squads.filter(s => s.team === team).length;
  if (key === 'tank') n += S.vehicles.filter(v => v.team === team).length;
  if (key === 'drone') n += S.drones.filter(d => d.team === team).length;
  if (key === 'builder') n += S.builders.filter(b => b.team === team && b.alive).length;
  return n;
}
function canProduce(team, key){
  const P = PRODUCTS[key], T = S.teams[team];
  const site = productionSite(team, key);
  if (!site) return tr(`Нужно здание: ${P.at.map(a => a === 'hq' ? tr('штаб', 'HQ', 'Sở chỉ huy') : bname(a)).join(tr(' или ', ' or ', ' hoặc '))}`, `Requires: ${P.at.map(a => a === 'hq' ? 'HQ' : bname(a)).join(' or ')}`, `Cần: ${P.at.map(a => a === 'hq' ? 'HQ' : bname(a)).join(' or ')}`);
  if (key === 'jet2' && (T.jet2 || countQueued(team, ['jet2']) > 0)) return tr('Уже исследовано', 'Already researched', 'Đã nghiên cứu');
  if (P.max && (T[key] || 0) + countQueued(team, [key]) >= P.max) return tr('Максимальный уровень', 'Max level', 'Cấp tối đa');
  if (T.ore < pCost(team, key)) return tr('Мало руды', 'Not enough ore', 'Không đủ quặng');
  if (key === 'pod' && S.squads.filter(s => s.team === team).length + countQueued(team, ['squad', 'elite', 'pod']) + S.pods.filter(p => p.team === team).length >= GAME.MAX_SQUADS + 4) return tr('Лимит отрядов', 'Squad limit', 'Đã đạt giới hạn đội');
  if ((key === 'squad' || key === 'elite') && S.squads.filter(s => s.team === team).length + countQueued(team, ['squad', 'elite']) >= GAME.MAX_SQUADS) return tr('Лимит отрядов', 'Squad limit', 'Đã đạt giới hạn đội');
  if (key === 'tank' && countProduct(team, 'tank') >= GAME.MAX_TANKS) return tr('Лимит танков', 'Tank limit', 'Đã đạt giới hạn xe tăng');
  if (key === 'drone' && countProduct(team, 'drone') >= GAME.MAX_DRONES) return tr('Лимит дронов', 'Drone limit', 'Đã đạt giới hạn drone');
  if (key === 'builder' && countProduct(team, 'builder') >= GAME.MAX_BUILDERS) return tr(`Лимит инженеров (${GAME.MAX_BUILDERS})`, `Builder limit (${GAME.MAX_BUILDERS})`, `Đã đạt giới hạn kỹ sư (${GAME.MAX_BUILDERS})`);
  if (site.queue.length >= 5) return tr('Очередь заполнена', 'Queue is full', 'Hàng chờ đã đầy');
  return null;
}
function pLevel(team, key){ return (S.teams[team][key] || 0) + countQueued(team, [key]); }
function pCost(team, key){ const c = PRODUCTS[key].cost; return Array.isArray(c) ? c[min(c.length - 1, pLevel(team, key))] : c; }
function pTime(team, key){ const c = PRODUCTS[key].time; return Array.isArray(c) ? c[min(c.length - 1, S.teams[team][key] || 0)] : c; }
function countQueued(team, keys){
  let n = 0;
  for (const s of [S.hq[team], ...S.buildings.filter(b => b.alive && b.team === team)]) for (const q of s.queue) if (keys.includes(q)) n++;
  return n;
}
function produce(team, key){
  const why = canProduce(team, key);
  if (why) return why;
  S.teams[team].ore -= pCost(team, key);
  productionSite(team, key).queue.push(key);
  return null;
}
function cancelProduct(site, idx){
  const key = site.queue[idx]; if (!key) return;
  site.queue.splice(idx, 1);
  if (idx === 0) site.prodT = 0;
  S.teams[site.team].ore += pCost(site.team, key);
}
function siteExit(site, ahead){
  if (site.cls === 'hq') return add(mul(BASES[site.team], RM), mul(anyTangent(BASES[site.team]), 24));
  return add(site.pos, mul(site.fwd, site.rad + (ahead || 4)));
}
function finishProduct(site, key){
  const t = site.team;
  let made = null;
  if (key === 'squad'){
    made = site.cls === 'hq' ? spawnSquad(t, false) : spawnSquad(t, false, siteExit(site, 5));
    if (t === 0 && !S.attract) feed(tr(`${groupLabel(made)} собран`, `${groupLabel(made)} is ready`, `${groupLabel(made)} đã sẵn sàng`), TEAM[0].css);
  } else if (key === 'elite'){
    made = spawnSquad(t, true, add(site.pos, mul(site.fwd, 1)));
    if (t === 0 && !S.attract){ feed(tr(`Небесный десант #${made.id} готов`, `Sky troopers #${made.id} ready`, `Lính đổ bộ #${made.id} sẵn sàng`), TEAM[0].css); emit('radio', { text: tr('Небесный десант готов к вылету', 'Sky troopers ready for launch', 'Lính đổ bộ sẵn sàng xuất kích'), pri: 1 }); }
  } else if (key === 'tank'){
    let dir = norm(add(site.pos, mul(site.fwd, 13)));
    for (let k = 0; k < 12; k++){
      const p = surfacePoint(dir, 1.5);
      if (!bldAt(p, 3) && !inShaft(p) && !propAt(p, 3)) break;
      dir = norm(add(site.pos, add(mul(site.fwd, 13 + k * 2), mul(site.R, (k % 2 ? 1 : -1) * k * 2))));
    }
    made = makeTank(surfacePoint(dir, 1.5), t);
    made.fwd = tangent(site.fwd, made.up); made.aim = made.fwd;
    if (t === 0 && !S.attract){ feed(tr(`${groupLabel(made)} ${tankName(0)} готов к бою`, `${groupLabel(made)} ${tankName(0)} ready`, `${groupLabel(made)} ${tankName(0)} sẵn sàng`), TEAM[0].css); emit('radio', { text: tr('Танк готов к бою', 'Tank ready for combat', 'Xe tăng sẵn sàng chiến đấu'), pri: 0 }); }
  } else if (key === 'drone'){
    made = makeDrone(add(site.pos, mul(site.up, 6)), t);
    made.fwd = tangent(site.fwd, made.up);
  } else if (PRODUCTS[key].solo){
    made = spawnSquad(t, false, site.cls === 'hq' ? null : siteExit(site, 5), 1, [PRODUCTS[key].solo]);
    made.solo = PRODUCTS[key].solo;
    if (t === 0 && !S.attract) feed(tr(`${pname(key)} готов: ${callsign(made.units[0])}`, `${pname(key)} ready: ${callsign(made.units[0])}`, `${pname(key)} sẵn sàng: ${callsign(made.units[0])}`), TEAM[0].css);
  } else if (key === 'pod'){
    launchPod(t, frontlineDir(t), false, 'buy');
    if (t === 0 && !S.attract){ feed(tr('Капсула с отрядом летит к линии фронта', 'A squad pod is falling to the front line', 'Khoang chở đội đang rơi xuống tiền tuyến'), TEAM[0].css); emit('radio', { text: tr('Орбита: капсула сброшена', 'Orbit: pod away', 'Quỹ đạo: đã thả khoang'), pri: 0 }); }
  } else if (key === 'builder'){
    made = makeBuilder(t, surfacePoint(norm(siteExit(site, 3)), ECO.HOVER));
    if (made && t === 0 && !S.attract) feed(tr(`${groupLabel(made)} готов к работе`, `${groupLabel(made)} ready for work`, `${groupLabel(made)} sẵn sàng`), TEAM[0].css);
  } else if (key === 'armor' || key === 'weapons' || key === 'drill'){
    const T = S.teams[t]; T[key] = (T[key] || 0) + 1;
    if (t === 0 && !S.attract){ feed(tr(`Исследование завершено: ${pname(key)} ${'I'.repeat(T[key])}`, `Research complete: ${pname(key)} ${'I'.repeat(T[key])}`, `Nghiên cứu xong: ${pname(key)} ${'I'.repeat(T[key])}`), TEAM[0].css); emit('radio', { text: tr(`Исследование завершено. ${pname(key)}, уровень ${T[key]}`, `Research complete. ${pname(key)}, level ${T[key]}`, `Nghiên cứu xong. ${pname(key)}, cấp ${T[key]}`), pri: 1 }); }
  } else if (key === 'jet2'){
    S.teams[t].jet2 = true;
    for (const u of S.units) if (u.team === t) u.jet = jetOf(u);
    if (S.attract) return;
    if (t === 0){ feed(tr('Исследование завершено: Ранцы II — пехота долетает до купола', 'Research complete: Jetpacks II — infantry can reach the dome', 'Nghiên cứu xong: Ba lô phản lực II — bộ binh bay tới được mái vòm'), TEAM[0].css); emit('radio', { text: tr('Исследование завершено. Ранцы второго поколения', 'Research complete. Second generation jetpacks', 'Nghiên cứu xong. Ba lô phản lực thế hệ hai'), pri: 2 }); }
    else { feed(tr('Разведка: у Роя появились мощные ранцы — ждите атак с неба', 'Intel: the Swarm has strong jetpacks — expect attacks from the sky', 'Tình báo: Bầy Đàn có ba lô phản lực mạnh — chờ tấn công từ trên trời'), '#f88'); emit('radio', { text: tr('Внимание. У противника мощные ранцы. Ждите атак с неба', 'Warning. The enemy has strong jetpacks. Expect attacks from above', 'Cảnh báo. Địch có ba lô phản lực mạnh. Chờ tấn công từ trên cao'), pri: 2 }); }
  }
  if (made && site.rally){ setOrder(made, 'move', site.rally, { lock: 25 }); }
  // заказано игроком в стратегии — слушается только его, пока он не вернётся в шутер
  if (made && t === 0 && S.pOrder && S.pOrder[key] > 0 && !S.attract){
    S.pOrder[key]--;
    if (S.mode === 'rts'){ made.byPlayer = true; made.manualUntil = 1e9; if (!site.rally) setOrder(made, 'hold', leaderPos(made) || siteExit(site), {}); made.manualUntil = 1e9;
      feed(tr(`${groupLabel(made)} ждёт твоих приказов`, `${groupLabel(made)} awaits your orders`, `${groupLabel(made)} chờ lệnh của bạn`), '#9cf'); }
  }
}
function updateProduction(site, dt){
  if (!site.queue.length){ site.prodT = 0; return; }
  if (site.cls === 'bld' && !site.done) return;
  const key = site.queue[0];
  site.prodT += dt * (site.team === 1 ? DK().eco : 1);
  if (site.prodT >= pTime(site.team, key)){
    site.prodT = 0;
    site.queue.shift();
    finishProduct(site, key);
  }
}

// =====================================================================
//  ПОДГОТОВКА МАТЧА
// =====================================================================
function newMatch(opts){
  opts = opts || {};
  applyScale(typeof SET !== 'undefined' ? SET.battle : 1);
  S.endless = typeof SET !== 'undefined' ? SET.endless !== false : true;
  NID = 1; TANK_SERIAL = [1, 1]; DRONE_SERIAL = [1, 1];
  HQ_ALIVE[0] = HQ_ALIVE[1] = true;
  Object.assign(S, { units: [], squads: [], vehicles: [], drones: [], builders: [], buildings: [], proj: [], sparks: [],
                     wrecks: [], fx: [], lights: [], beams: [], waves: [], pods: [], strikes: [], popups: [], alerts: [], supp: [], scans: [], markers: [],
                     rankBanner: null, overT: 0, dmgDir: null,
                     over: false, time: 0, feed: [], me: null, objective: null, task: null, turretBody: null,
                     place: null, selB: null, events: [], winner: null, slow: 0, slowT: 0, attract: !!opts.attract, paused: false,
                     stats: { tele: [0, 0], sky: [0, 0], landed: [0, 0], kills: [0, 0], caps: [0, 0] }, groupsCtl: {}, nextSquad: 1 });
  SCREENS = [];
  BLD_LIST = S.buildings; bgridDirty();
  for (const p of PROPS){ p.alive = true; p.integ = 1; p.hp = p.maxhp; p.loot = PROP_KINDS[p.kind].loot || 0; }
  S.storm = null; S.stormT = 300 + random() * 240;
  S.sel.clear();
  S.teams = [0, 1].map(t => ({ ore: GAME.START_ORE, ai: t === 1 ? true : (opts.attract ? true : (opts.ai !== undefined ? opts.ai : true)), think: 1 + t, income: 0, jet2: false, builderT: 0,
                               waveT: 150 + random() * 60, skyT: 0, droneGoal: null, lastAlert: -99, cmd: 2, cmdAcc: 0, podT: 90 + t * 20, powT: 30, armor: 0, weapons: 0, drill: 0, autoBuild: true }));
  S.hq = [0, 1].map(t => ({ cls: 'hq', team: t, pos: mul(BASES[t], RM + 5), hp: GAME.HQ_HP, maxhp: GAME.HQ_HP, cd: 0, alive: true,
                            queue: [], prodT: 0, seen: [0, 0], flash: 0, aim: anyTangent(BASES[t]), lastHit: -99, rally: null, up: BASES[t], fwd: anyTangent(BASES[t]) }));
  S.cps = CPD.map((d, i) => ({ i, dir: d, pos: mul(d, RM + 1), beacon: mul(d, RM + 11.5), prog: 0, owner: -1, core: false, name: 'ABCDEF'[i] }));
  S.cps.push({ i: 6, dir: [0,0,0], pos: [0,0,0], beacon: [0,0,0], prog: 0, owner: -1, core: true, name: 'Core' });
  for (const t of [0, 1]){
    for (let k = 0; k < 3; k++) spawnSquad(t);
    const b = BASES[t], ta = anyTangent(b);
    const v = makeTank(surfacePoint(offsetOnSphere(b, ta, 40 * (t ? -1 : 1)), 1.5), t);
    v.fwd = tangent(sub(v.pos, mul(b, RM)), v.up); v.aim = v.fwd;
    makeBuilder(t); makeBuilder(t);   // v6: пара инженеров-строителей с начала боя
  }
  ecoReset();
  ADAPT.v *= 0.6; ADAPT.t = 0; ADAPT.kills = ADAPT.deaths = ADAPT.shots = ADAPT.hits = 0; adaptCalc();
  PROG.newMatch();
  TACT.reset();
  SIDEQ.reset();
  HINTS.reset();
  if (!S.attract){
    const first = S.squads.find(s => s.team === 0).units[0];
    first.isPlayerBody = true;
    takeControl(first);
    if (S.endless) feed(tr('Бесконечный бой: снеси штаб Роя и все его ключевые здания.', 'Endless war: destroy the Swarm HQ and all its key buildings.', 'Chiến tranh bất tận: phá sở chỉ huy Bầy Đàn và mọi công trình then chốt.'));
    else feed(tr('Матч: 60 минут. Снеси штаб Роя и все его ключевые здания — или держи больше точек к концу.', 'Match: 60 minutes. Destroy the Swarm HQ and all its key buildings — or hold more points at the end.', 'Trận đấu: 60 phút. Phá sở chỉ huy Bầy Đàn và mọi công trình then chốt — hoặc giữ nhiều điểm hơn khi hết giờ.'));
    if (typeof TOUCH !== 'undefined' && TOUCH.on) feed(tr('«Карта» — стратегия. X — другой отряд или техника.', '"Map" — strategy. X — another squad or vehicle.', '“Bản đồ” — chiến thuật. X — đội hoặc xe khác.'), '#9cf');
    else feed(tr('Tab — стратегия. X — переключиться на другой отряд или технику.', 'Tab — strategy. X — switch to another squad or vehicle.', 'Tab — chiến thuật. X — chuyển sang đội hoặc xe khác.'), '#9cf');
  } else {
    S.mode = 'fps'; S.me = null;
  }
}
