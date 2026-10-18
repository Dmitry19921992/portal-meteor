// =====================================================================
//  ВВОД (с переназначаемыми клавишами — см. SET.bind в menu.js)
// =====================================================================
const keys = {};
let mouseL = false, mouseR = false, mouseM = false;
const $ = id => document.getElementById(id);
const isLocked = () => document.pointerLockElement === canvas;
let wantUnlock = false;   // мы сами отпускаем мышь (Tab в стратегию) — паузу не показываем
function lockMouse(){ try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function unlockMouse(){ if (isLocked()){ wantUnlock = true; document.exitPointerLock(); } }
function K(act){ return !!keys[SET.bind[act]]; }
function actOf(code){ for (const a in SET.bind) if (SET.bind[a] === code) return a; return null; }
function keyLabel(code){
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  const M = { Space: tr('Пробел', 'Space', 'Space'), ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt',
              Tab: 'Tab', Enter: 'Enter', Escape: 'Esc', Backquote: '`', Minus: '-', Equal: '=', Slash: '/', Backslash: '\\', Backspace: '⌫', CapsLock: 'Caps',
              ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.' };
  return M[code] || code;
}
function bk(act){ return keyLabel(SET.bind[act]); }

document.addEventListener('pointerlockchange', () => {
  if (!isLocked()){
    mouseL = mouseR = false;
    if (!wantUnlock && S.mode === 'fps' && !S.attract && !S.over && !MENU.isOpen()) MENU.pause();
    wantUnlock = false;
  }
  updateModeUI();
});
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('mousedown', e => {
  AU.init();
  MENU.testMouse(e.button, true);
  if (S.mode === 'fps' && !S.attract){
    if (!isLocked()){ if (!MENU.isOpen() && e.target === canvas) lockMouse(); return; }
    if (e.button === 0) mouseL = true;
    if (e.button === 2) mouseR = true;
  }
});
document.addEventListener('mouseup', e => { MENU.testMouse(e.button, false); if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; });
function aimRotate(c, mx, my, lo, hi){
  const s = 0.0022 * SET.sens;
  let a = rotAxis(c.aim, c.up, -mx * s);
  const right = norm(cross(a, c.up));
  const na = norm(rotAxis(a, right, -my * s * (SET.invertY ? -1 : 1)));
  const el = asin(clamp(dot(na, c.up), -1, 1));
  if (el > lo && el < hi) a = na;
  c.aim = a;
}
document.addEventListener('mousemove', e => {
  MENU.testMove(e.movementX, e.movementY);
  if (S.mode !== 'fps' || S.attract || !isLocked() || !S.me) return;
  lookBy(e.movementX, e.movementY);
});
// поворот взгляда (мышь или палец)
function lookBy(mx, my){
  if (S.mode !== 'fps' || S.attract || !S.me || CAMFX.busy()) return;
  const c = ctrlEntity(); if (!c) return;
  if (c.cls === 'inf'){
    const p = c, s = 0.0022 * SET.sens / (1 + S.slow * 0.6) * (S.aiming ? 0.6 : 1);
    p.fwd = norm(rotAxis(p.fwd, p.up, -mx * s));
    const right = norm(cross(p.fwd, p.up));
    const nf = norm(rotAxis(p.fwd, right, -my * s * (SET.invertY ? -1 : 1)));
    if (abs(dot(nf, p.up)) < 0.995) p.fwd = nf;
  } else if (c.cls === 'tank') aimRotate(c, mx, my, -0.2, 0.6);
  else if (c.cls === 'drone') aimRotate(c, mx, my, -1.2, 0.5);
  else if (c.type === 'aa') aimRotate(c, mx, my, -0.05, 1.5);
  else aimRotate(c, mx, my, -0.35, 0.9);
}
addEventListener('keydown', e => {
  if (MENU.keyCapture(e)) return;
  keys[e.code] = true;
  if (['Space', 'Tab', 'Slash', 'Quote', 'Backquote', 'F1'].includes(e.code) || (e.ctrlKey && /Digit|KeyA|KeyS|KeyD/.test(e.code))) e.preventDefault();
  if (e.repeat) return;
  AU.init();
  if (MENU.isOpen()){ if (e.code === 'Escape') MENU.back(); return; }
  if (OPER.on){
    if (e.code === 'Escape'){ OPER.end(); MENU.show('main'); }
    else if (e.code === 'KeyR'){ if (REC.active) REC.stop(); else REC.start(0); }
    else if (e.code === 'KeyC') OPER.caps = !OPER.caps;
    else if (e.code === 'KeyV' && !REC.active){ const a = OPER.aspect === '9:16' ? '16:9' : '9:16'; OPER.end(); OPER.begin({ aspect: a, title: false }); }
    else if (e.code === 'KeyN') OPER.shot = null;
    return;
  }
  if (S.attract) return;
  // общие
  switch (e.code){
    case 'KeyM': AU.toggle(); feed(tr('Звук: ', 'Sound: ', 'Âm thanh: ') + (AU.on ? tr('вкл', 'on', 'bật') : tr('выкл', 'off', 'tắt'))); return;
    case 'KeyO': if (!e.ctrlKey){ S.quality = (S.quality + 2) % 3; SET.quality = S.quality; MENU.save(); feed(tr('Качество графики: ', 'Graphics quality: ', 'Chất lượng đồ họa: ') + [tr('низкое', 'low', 'thấp'), tr('среднее', 'medium', 'trung bình'), tr('высокое', 'high', 'cao')][S.quality]); return; } break;
    case 'KeyB': if (S.mode === 'fps'){ S.vhs = !S.vhs; return; } break;
    case 'Backquote': S.debug = !S.debug; return;
    case 'Slash': S.showHelp = !S.showHelp; updateModeUI(); return;
    case 'Minus': S.autoRes = false; S.scale = max(0.25, +(S.scale - 0.125).toFixed(3)); resize(); feed(tr(`Разрешение ×${S.scale} (авто выкл)`, `Resolution ×${S.scale} (auto off)`, `Độ phân giải ×${S.scale} (tắt tự động)`)); return;
    case 'Equal': S.autoRes = false; S.scale = min(2, +(S.scale + 0.125).toFixed(3)); resize(); feed(tr(`Разрешение ×${S.scale} (авто выкл)`, `Resolution ×${S.scale} (auto off)`, `Độ phân giải ×${S.scale} (tắt tự động)`)); return;
  }
  if (S.mode === 'rts'){ rtsKey(e); return; }
  if (S.over) return;
  const act = actOf(e.code);
  switch (act){
    case 'rts': enterRTS(); HINTS.used('rts'); break;
    case 'switch': switchUnit(e.shiftKey ? -1 : 1); break;
    case 'interact': interact(); break;
    case 'third': S.third = !S.third; feed(S.third ? tr('Вид от третьего лица', 'Third-person view', 'Góc nhìn thứ ba') : tr('Вид от первого лица', 'First-person view', 'Góc nhìn thứ nhất')); HINTS.used('third'); break;
    case 'follow': S.follow = !S.follow; feed(S.follow ? tr('Режим «ведомый»: отряд ведёт бот, ты идёшь за ним', 'Follower mode: a bot leads the squad, you follow', 'Chế độ đi theo: bot dẫn đội, bạn theo sau') : tr('Ты снова лидер отряда', 'You lead the squad again', 'Bạn lại dẫn đội')); break;
    case 'nav': S.navLine = !S.navLine; feed(tr('Навигационная линия: ', 'Navigation line: ', 'Đường dẫn đường: ') + (S.navLine ? tr('вкл', 'on', 'bật') : tr('выкл', 'off', 'tắt'))); break;
    case 'ai': toggleAI(); break;
    case 'reload': if (S.me && S.me.cls === 'inf') startReload(); else if (S.me && S.me.cls === 'tank') vehAbility('barrage'); else if (S.me && S.me.cls === 'drone') vehAbility('kamikaze'); break;
    case 'grenade': if (S.me && S.me.cls === 'inf') playerGrenade(); else if (S.me && S.me.cls === 'tank') vehAbility('overdrive'); break;
    case 'reflex': if (S.me && S.me.cls === 'tank') vehAbility('smoke'); else toggleReflex(); break;
    case 'strike': playerStrike(); break;
    case 'w1': switchWeapon('rifle'); break;
    case 'w2': switchWeapon('rail'); break;
    case 'w3': switchWeapon('hmg'); break;
  }
  if (e.code === 'KeyR' && e.shiftKey && S.over) MENU.newGame();
});
addEventListener('keyup', e => { keys[e.code] = false; MENU.testKey(e.code, false); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });

function playerInput(p){
  const F = p.fwd, Uu = p.up;
  if (CAMFX.busy()) return { wish: [0, 0, 0], speedMul: 1, jump: false, thrust: false, thrustDir: Uu, lift: false, fire: false, aim: F, wish3: [0, 0, 0], freeSpeed: 0, rocket: false };
  const right = norm(cross(F, Uu));
  const tf = tangent(F, Uu);
  const f = clamp((K('fwd') ? 1 : 0) - (K('back') ? 1 : 0) + TOUCH.move[1], -1, 1);
  const r = clamp((K('right') ? 1 : 0) - (K('left') ? 1 : 0) + TOUCH.move[0], -1, 1);
  let wish = add(mul(tf, f), mul(right, r));
  if (len(wish) > 1) wish = norm(wish);
  const jetKey = K('run');
  const aimBtn = SET.swapMouse ? mouseL : mouseR;
  S.aiming = aimBtn && !jetKey;
  const run = !S.aiming;
  const hop = jetKey && !p._jetPrev && p.grounded;
  p._jetPrev = jetKey;
  const u = (K('jump') ? 1 : 0) - (K('down') ? 1 : 0);
  let wish3 = add(add(mul(F, f), mul(right, r)), mul(Uu, u));
  if (len(wish3) > 0) wish3 = norm(wish3);
  const fireBtn = SET.swapMouse ? mouseR : mouseL, jetBtn = jetKey;
  if (jetBtn) HINTS.used('jet');
  if (f || r) HINTS.used('move');
  // маршрут стратега: бег по стрелкам быстрее (задел под паркур)
  S.onRoute = false;
  if (run && navPts.length && TACT.task && !TACT.task.done){ for (let i = 0; i < min(12, navPts.length); i++) if (dist2(navPts[i], p.pos) < 30){ S.onRoute = true; break; } }
  if (S.onRoute) HINTS.used('route');
  // v5.3: C в воздухе — тормоз ранцем (на земле C — подкат)
  const brake = K('down') && !p.grounded;
  if (brake) HINTS.used('airbrake');
  return { wish, speedMul: run ? (S.onRoute ? 2.35 : 1.8) : 1, jump: K('jump') || hop, thrust: jetBtn, thrustDir: norm(add(F, mul(wish, 0.8))), lift: K('jump'),
           brake, fire: fireBtn, aim: F, wish3, freeSpeed: run ? 40 : 10, rocket: K('rocket') };
}
function tankPlayerInput(v, dt){
  S.aiming = false;
  const f = clamp((K('fwd') ? 1 : 0) - (K('back') ? 1 : 0) + TOUCH.move[1], -1, 1);
  const turn = clamp((K('right') ? 1 : 0) - (K('left') ? 1 : 0) + TOUCH.move[0], -1, 1);
  if (turn) v.fwd = tangent(rotAxis(v.fwd, v.up, -turn * (f < 0 ? -1 : 1) * 1.3 * dt), v.up);
  return { wish: mul(tangent(v.fwd, v.up), f), speedMul: K('run') ? 1.3 : 1,
           fire: SET.swapMouse ? mouseR : mouseL, alt: SET.swapMouse ? mouseL : mouseR, lift: K('jump'), thrustDir: v.up };
}
function dronePlayerInput(d){
  S.aiming = false;
  return { f: clamp((K('fwd') ? 1 : 0) - (K('back') ? 1 : 0) + TOUCH.move[1], -1, 1), r: clamp((K('right') ? 1 : 0) - (K('left') ? 1 : 0) + TOUCH.move[0], -1, 1),
           u: (K('jump') ? 1 : 0) - (K('down') ? 1 : 0), run: K('run'), fire: SET.swapMouse ? mouseR : mouseL };
}
function turretPlayerInput(b){ S.aiming = false; return { fire: SET.swapMouse ? mouseR : mouseL }; }
function vehAbility(k){
  const c = ctrlEntity(); if (!c) return;
  let pt = null;
  if (ABIL[k].target === 'point'){ const r = rayCast(S.cam.pos, S.cam.fwd, ABIL[k].range + 40, c.team, false); pt = r.pos; }
  const why = useAbility(c, k, pt);
  if (why) feed(`${N2(ABIL[k].n)}: ${why}`, '#f88');
  else { feed(N2(ABIL[k].n), TEAM[0].css); HINTS.used('vab'); }
}

// ---------- переключение режимов и вселение ----------
function takeControl(u){
  if (S.me && S.me.cls === 'bld' && u !== S.me && S.turretBody){ S.turretBody.parked = false; S.turretBody = null; }
  const prev = S.me;
  if (prev && prev.cls === 'inf' && prev !== u){ prev.isPlayerBody = false; prev.jet = jetOf(prev); }
  S.me = u; S.mode = 'fps'; S.freecam = false;
  if (u.cls === 'inf'){ u.hopT = 0; u.leapT = 0; u.isPlayerBody = true; u.jet = jetOf(u); S.lastInf = u;
    if (S.kit && !S.attract){ const w = roleOf(u).w; if (w !== 'rifle' || !weaponAvail(S.kit.w)){ S.kit.w = weaponAvail(w) ? w : 'rifle'; S.kit.mag[S.kit.w] = WEAPONS[S.kit.w].mag; } } }
  if (u.cls === 'drone'){ u.aim = tangent(u.fwd, u.up); u.kamikaze = null; }
  if (S.kit) S.kit.reloadT = 0;
  updateModeUI();
  emit('possess', { u });
  if (u.cls === 'inf' && !S.attract && u.squad && u.squad.units.length > 1 && random() < 0.6){ SQUADUI.lastT = -99; SQUADUI.say('possess', null, null, 20); }
  CAMFX.onSwitch(u);
}
function enterRTS(){
  S.mode = 'rts';
  unlockMouse();
  const c = ctrlEntity();
  if (c){ S.rts.dir = norm(c.pos); S.rts.fwd = tangent(c.fwd || c.aim || anyTangent(S.rts.dir), S.rts.dir); S.rts.h = min(S.rts.h, 60); }
  S.sel.clear();
  const g = c ? (c.cls === 'bld' ? null : groupOf(c)) : null;
  if (g) S.sel.add(g);
  updateModeUI();
}
function releasePlayerUnits(){
  releaseBuilders();   // v6
  let n = 0;
  for (const g of groupsOf(0)) if (g.byPlayer){ g.byPlayer = false; if (g.manualUntil > S.time + 60) g.manualUntil = S.time + 20; n++; }
  if (n) feed(tr(`Стратег принял командование твоими группами (${n})`, `The strategist takes over your groups (${n})`, `Chiến lược gia tiếp quản các nhóm của bạn (${n})`), '#9cf');
}
function enterFPS(){
  releasePlayerUnits();
  let u = null;
  if (S.selB && S.selB.alive && S.selB.team === 0 && (S.selB.type === 'turret' || S.selB.type === 'aa') && S.selB.done) u = S.selB;
  if (!u) for (const g of S.sel){ if (g.team !== 0 || !groupAlive(g) || g.cls === 'builder') continue; u = isSquad(g) ? g.units.find(x => x.alive) : g; if (u) break; }
  if (!u && S.me && (S.me.alive || S.me.cls === 'bld')) u = S.me;
  if (!u) u = nearestToAction(0);
  if (!u){ feed(tr('Нет живых роботов — закажи отряд', 'No robots alive — order a squad', 'Không còn robot nào — hãy gọi một đội'), '#f88'); return; }
  takeControl(u);
  lockMouse();
}
function actionDist(e, team){
  let d = 1e9;
  for (const x of TGT[team]) if (x.alive && x.cls !== 'bld') d = min(d, dist2(x.pos, e.pos));
  return sqrt(d);
}
function nearestToAction(team){
  let best = null, bd = 1e9;
  for (const u of S.units){
    if (!u.alive || u.team !== team || u.parked) continue;
    const d = actionDist(u, team);
    if (d < bd){ bd = d; best = u; }
  }
  for (const v of S.vehicles){ if (!v.alive || v.team !== team) continue; const d = actionDist(v, team) - 15; if (d < bd){ bd = d; best = v; } }
  return best;
}
// список того, во что можно вселиться — ближе к бою выше
function switchCandidates(){
  const L = [];
  for (const sq of S.squads){
    if (sq.team !== 0) continue;
    let best = null, bd = 1e9;
    for (const u of sq.units){ if (!u.alive || u.parked) continue; const d = actionDist(u, 0); if (d < bd){ bd = d; best = u; } }
    if (best) L.push({ e: best, d: bd, label: groupLabel(sq) + (sq.elite ? ' ✦' : ''), kind: 'inf' });
  }
  for (const v of S.vehicles) if (v.alive && v.team === 0) L.push({ e: v, d: actionDist(v, 0), label: groupLabel(v), kind: 'tank' });
  for (const d of S.drones) if (d.alive && d.team === 0) L.push({ e: d, d: actionDist(d, 0), label: groupLabel(d), kind: 'drone' });
  for (const b of S.buildings) if (b.alive && b.done && b.team === 0 && (b.type === 'turret' || b.type === 'aa')){ const d = actionDist(b, 0); if (d < 120) L.push({ e: b, d, label: bname(b.type), kind: 'bld' }); }
  L.sort((a, b) => a.d - b.d);
  return L;
}
const SW = { list: null, idx: 0, t: -99 };
function switchUnit(dir){
  const now = S.rtime;
  if (!SW.list || now - SW.t > 3){ SW.list = switchCandidates().filter(o => o.e !== ctrlEntity()); SW.idx = dir > 0 ? 0 : SW.list.length - 1; }
  else SW.idx = (SW.idx + dir + SW.list.length) % max(1, SW.list.length);
  SW.t = now;
  const o = SW.list[SW.idx];
  if (!o){ feed(tr('Некуда переключаться', 'Nothing to switch to', 'Không có gì để chuyển'), '#f88'); return; }
  if (S.me && S.me.cls === 'bld' && S.turretBody){ S.turretBody.parked = false; S.turretBody = null; }
  if (o.kind === 'bld'){ const body = S.me && S.me.cls === 'inf' ? S.me : null; if (body){ body.parked = true; S.turretBody = body; } }
  takeControl(o.e);
  S.flashT = 0.12;
  HINTS.used('switch');
  feed(tr(`Переключение: ${o.label}`, `Switched to: ${o.label}`, `Đã chuyển sang: ${o.label}`), '#9cf');
}
function autoSwitch(){
  if (S.turretBody && S.turretBody.alive){ const b = S.turretBody; b.parked = false; S.turretBody = null; takeControl(b); return; }
  const u = nearestToAction(0);
  if (u){ takeControl(u); S.flashT = 0.2; }
  else { enterRTS(); }
}
function interact(){
  const me = S.me; if (!me) return;
  if (me.cls === 'bld'){
    const body = S.turretBody; S.turretBody = null;
    if (body && body.alive){ body.parked = false; takeControl(body); } else { S.me = null; autoSwitch(); }
    feed(tr('Ты покинул турель', 'You left the turret', 'Bạn đã rời tháp súng')); return;
  }
  if (me.cls === 'tank' || me.cls === 'drone'){
    let best = null, bd = 30;
    for (const u of S.units) if (u.alive && u.team === 0 && !u.parked){ const d = dist(u.pos, me.pos); if (d < bd){ bd = d; best = u; } }
    if (best){ takeControl(best); feed(tr('Ты снова в пехоте', 'Back to infantry', 'Trở lại bộ binh')); }
    else feed(tr(`Рядом нет пехоты — ${bk('switch')} для переключения`, `No infantry nearby — ${bk('switch')} to switch`, `Không có bộ binh gần đây — ${bk('switch')} để chuyển`), '#f88');
    return;
  }
  const hint = nearbyInteract(me);
  if (!hint){ feed(tr('Рядом нет своей техники или турели', 'No friendly vehicle or turret nearby', 'Không có xe hay tháp súng phe ta ở gần'), '#f88'); return; }
  if (hint.v){
    takeControl(hint.v);
    feed(tr(`Ты управляешь: ${groupLabel(hint.v)}. ${bk('interact')} — обратно в пехоту`, `You are driving ${groupLabel(hint.v)}. ${bk('interact')} — back to infantry`, `Bạn đang lái ${groupLabel(hint.v)}. ${bk('interact')} — trở về bộ binh`));
    HINTS.used('tank'); emit('board', { pos: hint.v.pos });
  } else if (hint.b){
    me.parked = true; S.turretBody = me;
    takeControl(hint.b);
    HINTS.used('turret');
    feed(tr(`Ты за ${hint.b.type === 'aa' ? 'зенитной установкой' : 'турелью'}. ${bk('interact')} — выйти`, `You man the ${hint.b.type === 'aa' ? 'AA gun' : 'turret'}. ${bk('interact')} — leave`, `Bạn điều khiển ${hint.b.type === 'aa' ? 'AA gun' : 'turret'}. ${bk('interact')} — rời đi`));
  }
}
function nearbyInteract(me){
  if (!me || me.cls !== 'inf') return null;
  for (const v of S.vehicles) if (v.alive && v.team === me.team && dist(v.pos, me.pos) < 7) return { v, text: tr(`${bk('interact')} — управлять: ${groupLabel(v)}`, `${bk('interact')} — take control: ${groupLabel(v)}`, `${bk('interact')} — điều khiển: ${groupLabel(v)}`) };
  for (const b of S.buildings) if (b.alive && b.done && b.team === me.team && (b.type === 'turret' || b.type === 'aa') && dist(gunPos(b), me.pos) < 5) return { b, text: tr(`${bk('interact')} — занять ${b.type === 'aa' ? 'ПВО' : 'турель'}`, `${bk('interact')} — man the ${b.type === 'aa' ? 'AA' : 'turret'}`, `${bk('interact')} — vào ${b.type === 'aa' ? 'AA' : 'turret'}`) };
  return null;
}
function toggleAI(){ S.teams[0].ai = !S.teams[0].ai; feed(S.teams[0].ai ? tr('ИИ-стратег включён: строит базу и раздаёт задачи', 'AI strategist on: builds the base and gives orders', 'Chiến lược gia AI bật: xây căn cứ và ra lệnh') : tr('ИИ-стратег выключен — командуешь ты', 'AI strategist off — you are in command', 'Chiến lược gia AI tắt — bạn chỉ huy'), '#9cf'); updateModeUI(); }

// =====================================================================
//  HUD и наложение (режим шутера)
// =====================================================================
function updateModeUI(){
  const fps = S.mode === 'fps' && !S.attract;
  const play = !S.attract;
  const menu = MENU.isOpen();
  $('clicklock').style.display = fps && !isLocked() && !S.over && !menu && !TOUCH.on ? 'flex' : 'none';
  $('cross').style.display = fps && !menu ? 'block' : 'none';
  $('bars').style.display = fps && !menu ? 'flex' : 'none';
  $('kit').style.display = fps && !menu ? 'flex' : 'none';
  $('hud').style.display = play && !menu ? 'flex' : 'none';
  $('feed').style.display = play && !menu ? 'block' : 'none';
  $('side').style.display = play && !fps && !menu ? 'flex' : 'none';
  $('card').style.display = play && !fps && !menu ? 'flex' : 'none';
  $('help').style.display = play && !menu ? 'block' : 'none';
  const c = ctrlEntity();
  $('help').innerHTML = !S.showHelp ? tr('Esc — меню · / — управление', 'Esc — menu · / — controls', 'Esc — menu · / — điều khiển')
    : (fps ? helpFPS(c) : helpRTS());
  $('help').classList.toggle('open', S.showHelp);
}
function helpFPS(c){
  const L = [];
  const row = (k, t) => L.push(`<b>${k}</b> ${t}`);
  if (c && c.cls === 'tank'){
    row(`${bk('fwd')}/${bk('back')}`, tr('ход', 'drive', 'lái')); row(`${bk('left')}/${bk('right')}`, tr('поворот корпуса', 'turn hull', 'xoay thân'));
    row(tr('мышь', 'mouse', 'chuột'), tr('башня', 'turret', 'tháp súng')); row(tr('ЛКМ', 'LMB', 'Chuột trái'), tr('пушка', 'cannon', 'pháo')); row(tr('ПКМ', 'RMB', 'Chuột phải'), tr('пулемёт', 'machine gun', 'súng máy'));
    row(bk('reload'), tr('залп', 'barrage', 'loạt pháo')); row(bk('reflex'), tr('дым', 'smoke', 'khói')); row(bk('grenade'), tr('форсаж', 'overdrive', 'tăng tốc'));
    row(bk('interact'), tr('в пехоту рядом', 'to nearby infantry', 'về bộ binh gần đó'));
  } else if (c && c.cls === 'drone'){
    row(`${bk('fwd')}${bk('left')}${bk('back')}${bk('right')}`, tr('полёт', 'fly', 'bay')); row(`${bk('jump')}/${bk('down')}`, tr('выше/ниже', 'up/down', 'lên/xuống'));
    row(tr('ЛКМ', 'LMB', 'Chuột trái'), tr('огонь', 'fire', 'bắn')); row(bk('reload'), tr('таран', 'ram', 'đâm'));
  } else {
    row(`${bk('fwd')}${bk('left')}${bk('back')}${bk('right')}`, tr('идти', 'move', 'đi')); row(bk('run'), tr('бег', 'run', 'chạy')); row(bk('jump'), tr('прыжок · у уступа — перелезть · у стены — отскок', 'jump · at a ledge — climb · at a wall — wall-jump', 'nhảy · cạnh gờ — leo · cạnh tường — bật tường')); row(bk('down'), tr('подкат на бегу', 'slide while running', 'trượt khi chạy'));
    row(tr('ЛКМ', 'LMB', 'Chuột trái'), tr('огонь', 'fire', 'bắn')); row(tr('ПКМ', 'RMB', 'Chuột phải'), tr('прицел', 'aim', 'ngắm')); row(bk('run'), tr('ранец (прыжок + полёт)', 'jetpack (hop + fly)', 'ba lô phản lực (nhảy + bay)')); row(bk('reload'), tr('перезарядка', 'reload', 'nạp đạn'));
    row(bk('rocket'), tr('ракета', 'rocket', 'tên lửa')); row(bk('grenade'), tr('граната', 'grenade', 'lựu đạn')); row(bk('reflex'), tr('рефлекс', 'reflex', 'phản xạ')); row(bk('strike'), tr('артудар', 'strike', 'pháo kích'));
    row(`${bk('w1')} ${bk('w2')} ${bk('w3')}`, tr('оружие', 'weapons', 'vũ khí')); row(bk('interact'), tr('танк / турель', 'tank / turret', 'xe tăng / tháp súng'));
  }
  row(bk('switch'), tr('другой отряд или техника (Shift — назад)', 'another squad or vehicle (Shift — back)', 'đội hoặc xe khác (Shift — lùi lại)'));
  row(bk('rts'), tr('стратегия', 'strategy', 'chiến thuật')); row(bk('third'), tr('3-е лицо', '3rd person', 'góc nhìn 3')); row(bk('follow'), tr('ведомый', 'follower', 'đi theo')); row(bk('ai'), tr('ИИ-стратег', 'AI strategist', 'chiến lược gia AI'));
  row('M', tr('звук', 'sound', 'âm thanh')); row('O', tr('качество', 'quality', 'chất lượng')); row('Esc', tr('меню', 'menu', 'menu'));
  return L.join('<br>');
}
function fmtTime(s){ s = max(0, floor(s)); return `${floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
let navPts = [];
function objectivePos(){ return TACT.navPos(); }
function navTargetFor(p, from){
  if (len(p) < 80){ return mul(bestAxis(norm(from)), RM); }   // в ядро — через ближайшую шахту
  return p;
}
function computeNav(){
  navPts = [];
  const c = ctrlEntity(); const p = objectivePos();
  if (!c || !p || c.cls === 'bld' || underground(c.pos)) return;
  const tgt = navTargetFor(p, c.pos);
  const my = norm(c.pos), td = norm(tgt);
  const total = RM * acos(clamp(dot(my, td), -1, 1));
  for (let s = 4; s < min(total, 160); s += 3.5){
    const dir = stepToward(my, td, s / RM);
    navPts.push(mul(dir, groundR(dir) + 0.35));
  }
}
function drawDiamond(x, y, r, stroke, fill){
  octx.beginPath(); octx.moveTo(x, y - r); octx.lineTo(x + r, y); octx.lineTo(x, y + r); octx.lineTo(x - r, y); octx.closePath();
  if (fill){ octx.fillStyle = fill; octx.fill(); }
  if (stroke){ octx.strokeStyle = stroke; octx.stroke(); }
}
function project(p){
  const c = S.cam, v = sub(p, c.pos);
  const z = dot(v, c.fwd); if (z <= 0.3) return null;
  const H = innerHeight;
  return [innerWidth / 2 + dot(v, c.right) / z / c.fov * H, H / 2 - dot(v, c.up) / z / c.fov * H, z];
}
function edgeMarker(p, color, label, subt){
  const W = innerWidth, H = innerHeight;
  const c = S.cam, v = sub(p, c.pos);
  const z = dot(v, c.fwd);
  const x = dot(v, c.right), y = dot(v, c.up);
  const s = z > 0.3 ? project(p) : null;
  const m = 46;
  const on = s && s[0] > m && s[0] < W - m && s[1] > m && s[1] < H - m;
  octx.lineWidth = 2;
  if (on){
    const pulse = 1 + 0.15 * sin(performance.now() / 180);
    drawDiamond(s[0], s[1], 11 * pulse, color, 'rgba(0,0,0,.35)');
    drawDiamond(s[0], s[1], 4, null, color);
    octx.fillStyle = color; octx.textAlign = 'center';
    octx.font = '600 12px "Exo 2", Consolas, sans-serif';
    octx.fillText(label, s[0], s[1] - 18);
    octx.font = '11px "Exo 2", Consolas, sans-serif';
    octx.fillText(subt, s[0], s[1] + 26);
  } else {
    let ang = atan2(-y, x);
    if (z <= 0.3 && abs(x) < 1e-3 && abs(y) < 1e-3) ang = PI / 2;
    const cx = W / 2, cy = H / 2;
    const rx = W / 2 - m, ry = H / 2 - m;
    const k = min(rx / max(abs(cos(ang)), 1e-3), ry / max(abs(sin(ang)), 1e-3));
    const ex = cx + cos(ang) * k, ey = cy + sin(ang) * k;
    octx.save(); octx.translate(ex, ey); octx.rotate(ang);
    octx.fillStyle = color; octx.beginPath(); octx.moveTo(14, 0); octx.lineTo(-6, -9); octx.lineTo(-2, 0); octx.lineTo(-6, 9); octx.closePath(); octx.fill();
    octx.restore();
    octx.fillStyle = color; octx.textAlign = 'center'; octx.font = '600 11px "Exo 2", Consolas, sans-serif';
    octx.fillText(`${label} ${subt}`, ex - cos(ang) * 34, ey - sin(ang) * 22 + 4);
  }
}
function teamCss(owner){ return owner === 0 ? TEAM[0].css : owner === 1 ? TEAM[1].css : '#8a96a8'; }
function groundRing(center, r, n){
  const up = norm(center), t1 = anyTangent(up), t2 = cross(up, t1);
  const pts = [];
  for (let i = 0; i <= (n || 24); i++){
    const a = i / (n || 24) * PI * 2;
    const q = add(center, add(mul(t1, cos(a) * r), mul(t2, sin(a) * r)));
    pts.push(project(q));
  }
  octx.beginPath();
  let started = false;
  for (const s of pts){ if (!s){ started = false; continue; } if (!started){ octx.moveTo(s[0], s[1]); started = true; } else octx.lineTo(s[0], s[1]); }
  octx.stroke();
}
function drawMinimap(){
  const c = ctrlEntity(); if (!c) return;
  const R = 82, cx = 18 + R, cy = innerHeight - 18 - R, range = 170, k = R / range;
  const my = norm(c.pos);
  const fwd = tangent(c.cls === 'inf' ? c.fwd : c.aim, my), right = norm(cross(fwd, my));
  const toMap = (p, clampRim) => {
    const dn = norm(p);
    const ang = acos(clamp(dot(dn, my), -1, 1));
    const s = ang * RM;
    const t = tangent(sub(dn, mul(my, dot(dn, my))), my);
    let px = dot(t, right) * s * k, py = -dot(t, fwd) * s * k;
    const r = hypot(px, py);
    if (r > R - 4){ if (!clampRim) return null; px *= (R - 6) / r; py *= (R - 6) / r; }
    return [cx + px, cy + py, r > R - 4];
  };
  octx.save();
  octx.beginPath(); octx.arc(cx, cy, R, 0, PI * 2); octx.fillStyle = 'rgba(8,12,18,.62)'; octx.fill();
  octx.strokeStyle = 'rgba(214,198,154,.35)'; octx.lineWidth = 1; octx.stroke();
  octx.clip();
  octx.strokeStyle = 'rgba(214,198,154,.12)';
  for (const rr of [50, 100, 150]){ octx.beginPath(); octx.arc(cx, cy, rr * k, 0, PI * 2); octx.stroke(); }
  for (const a of AXES){ const m = toMap(mul(a, RM)); if (m){ octx.strokeStyle = '#6aa0ff'; octx.beginPath(); octx.arc(m[0], m[1], 4, 0, PI * 2); octx.stroke(); } }
  for (const p of PROPS){ if (p.kind === 5 || !p.alive && p.kind !== 6 && p.kind !== 7) continue; const m = toMap(p.pos); if (m){ octx.fillStyle = p.loot ? 'rgba(255,170,80,.8)' : 'rgba(150,140,120,.35)'; octx.fillRect(m[0] - 2, m[1] - 2, 4, 4); } }
  for (const b of S.buildings){
    if (!b.alive || (b.team === 1 && !b.known0 && dist(b.pos, c.pos) > 120)) continue;
    const m = toMap(b.pos); if (!m) continue;
    const s = max(3, b.rad * k);
    octx.fillStyle = b.team === 0 ? TEAM[0].dim : TEAM[1].dim; octx.fillRect(m[0] - s, m[1] - s, s * 2, s * 2);
  }
  const dot2 = (p, col, r) => { const m = toMap(p); if (!m) return; octx.fillStyle = col; octx.beginPath(); octx.arc(m[0], m[1], r, 0, PI * 2); octx.fill(); };
  const myG = playerGroup();
  for (const u of S.units){ if (!u.alive || u === S.me) continue; if (u.team === 1 && u.seen[0] <= 0) continue; dot2(u.pos, u.team ? TEAM[1].css : TEAM[0].css, u.squad === myG ? 2.8 : 2.2); }
  for (const v of S.vehicles){ if (!v.alive || v === c || (v.team === 1 && v.seen[0] <= 0)) continue; const m = toMap(v.pos); if (m){ octx.fillStyle = v.team ? TEAM[1].css : TEAM[0].css; octx.fillRect(m[0] - 4, m[1] - 3, 8, 6); } }
  for (const d of S.drones){ if (!d.alive || d === c || (d.team === 1 && d.seen[0] <= 0)) continue; const m = toMap(d.pos); if (m){ octx.fillStyle = d.team ? TEAM[1].css : TEAM[0].css; octx.beginPath(); octx.moveTo(m[0], m[1] - 4); octx.lineTo(m[0] + 3.5, m[1] + 3); octx.lineTo(m[0] - 3.5, m[1] + 3); octx.fill(); } }
  for (const s of S.strikes){ const m = toMap(s.pos); if (m){ octx.strokeStyle = s.team ? '#ff5040' : '#ffb070'; octx.lineWidth = 1.5; octx.beginPath(); octx.arc(m[0], m[1], 6 + 2 * sin(S.rtime * 10), 0, PI * 2); octx.stroke(); } }
  octx.restore();
  octx.font = '700 10px "Exo 2", Consolas, sans-serif'; octx.textAlign = 'center'; octx.lineWidth = 1.5;
  for (const cp of S.cps){
    if (cp.core) continue;
    const m = toMap(cp.pos, true); if (!m) continue;
    drawDiamond(m[0], m[1], 6, teamCss(cp.owner), 'rgba(0,0,0,.5)');
    octx.fillStyle = teamCss(cp.owner); octx.fillText(cp.name, m[0], m[1] + 3.5);
  }
  for (const h of S.hq){
    const m = toMap(h.pos, true); if (!m) continue;
    octx.fillStyle = h.team ? TEAM[1].css : TEAM[0].css; octx.globalAlpha = h.alive ? 1 : 0.35; octx.fillRect(m[0] - 5, m[1] - 5, 10, 10); octx.globalAlpha = 1;
    octx.fillStyle = '#000'; octx.fillText(tr('Ш', 'H', 'S'), m[0], m[1] + 3.5);
  }
  const op = objectivePos();
  const t = TACT.task;
  if (op && t && !t.done){
    const tgt = navTargetFor(op, c.pos);
    const m = toMap(tgt, true);
    if (m){
      const col = t.kind === 'strat' || t.kind === 'player' ? '140,255,170' : '255,190,90';
      octx.setLineDash([4, 4]); octx.strokeStyle = `rgba(${col},.85)`; octx.lineWidth = 1.5;
      octx.beginPath(); octx.moveTo(cx, cy); octx.lineTo(m[0], m[1]); octx.stroke(); octx.setLineDash([]);
      const pulse = 6 + 2 * sin(performance.now() / 160);
      drawDiamond(m[0], m[1], pulse, `rgb(${col})`, 'rgba(0,40,10,.6)');
    }
  }
  const sp = SIDEQ.pos();
  if (sp){ const m = toMap(sp, true); if (m) drawDiamond(m[0], m[1], 5, '#ffa94d', 'rgba(40,20,0,.6)'); }
  if (SIDEQ.sky){ octx.strokeStyle = 'rgba(120,200,255,.9)'; octx.lineWidth = 2; octx.beginPath(); octx.arc(cx, cy, 11 + 2 * sin(performance.now() / 150), 0, PI * 2); octx.stroke(); }
  octx.fillStyle = '#fff'; octx.beginPath(); octx.moveTo(cx, cy - 7); octx.lineTo(cx + 5, cy + 5); octx.lineTo(cx, cy + 2); octx.lineTo(cx - 5, cy + 5); octx.closePath(); octx.fill();
  octx.fillStyle = 'rgba(214,198,154,.7)'; octx.font = '10px "Exo 2", Consolas, sans-serif'; octx.textAlign = 'left';
  octx.fillText(`${range} ${tr('м', 'm', 'm')}`, cx + R - 30, cy + R - 4);
}
function drawWorldMarkers(rts){
  octx.textAlign = 'center';
  octx.font = '600 12px "Exo 2", Consolas, sans-serif';
  const c = ctrlEntity();
  const vis = p => !rts || facing(p);
  // точки захвата
  octx.lineWidth = 2;
  for (const cp of S.cps){
    const p = cp.core ? [0,0,0] : cp.beacon;
    if (!vis(p)) continue;
    const s = project(p); if (!s) continue;
    if (!rts && s[2] > 600) continue;
    const col = teamCss(cp.owner);
    drawDiamond(s[0], s[1], 9, col);
    if (abs(cp.prog) > 0.01){
      octx.strokeStyle = cp.prog > 0 ? TEAM[0].css : TEAM[1].css;
      octx.beginPath(); octx.arc(s[0], s[1], 13, -PI/2, -PI/2 + abs(cp.prog) * PI * 2); octx.stroke();
    }
    octx.fillStyle = col;
    octx.fillText(cpName(cp) + (rts ? '' : ` ${Math.round(s[2])}${tr('м', 'm', 'm')}`) + (cp.contested ? ' ⚔' : ''), s[0], s[1] - 17);
  }
  for (const h of S.hq){
    const p = add(h.pos, mul(BASES[h.team], h.alive ? 42 : 10));
    if (!vis(h.pos)) continue;
    const s = project(p); if (!s) continue;
    octx.fillStyle = TEAM[h.team].css;
    octx.fillText(h.alive ? `${h.team === 0 ? tr('НАШ ШТАБ', 'OUR HQ', 'SCH CỦA TA') : tr('ШТАБ РОЯ', 'SWARM HQ', 'SCH BẦY ĐÀN')} ${Math.round(max(0, h.hp) / h.maxhp * 100)}%` : (h.team === 0 ? tr('РУИНЫ НАШЕГО ШТАБА', 'OUR HQ RUINS', 'TÀN TÍCH SCH CỦA TA') : tr('РУИНЫ ШТАБА РОЯ', 'SWARM HQ RUINS', 'TÀN TÍCH SCH BẦY ĐÀN')), s[0], s[1]);
  }
  for (const b of S.buildings){
    if (!b.alive) continue;
    if (b.team === 1 && !b.known0 && !(c && dist(b.pos, c.pos) < 120)) continue;
    const p = add(b.pos, mul(b.up, b.H + 1.5));
    if (!vis(p)) continue;
    const s = project(p); if (!s) continue;
    if (!rts && s[2] > 160) continue;
    const col = TEAM[b.team].css;
    octx.font = '11px "Exo 2", Consolas, sans-serif';
    octx.fillStyle = col;
    const label = bname(b.type) + (!b.done ? ` ${Math.floor(b.built * 100)}%` : '') + (b.queue.length ? ` [${b.queue.length}]` : '');
    if (rts || s[2] < 70) octx.fillText(label, s[0], s[1] - 7);
    octx.fillStyle = 'rgba(0,0,0,.6)'; octx.fillRect(s[0] - 18, s[1] - 3, 36, 4);
    octx.fillStyle = col; octx.fillRect(s[0] - 18, s[1] - 3, 36 * max(0, b.hp) / b.maxhp, 4);
    if (rts && S.selB === b){ octx.strokeStyle = '#fff'; octx.lineWidth = 1.5; octx.strokeRect(s[0] - 21, s[1] - 20, 42, 26); }
  }
  drawEcoWorld(rts);   // v6: жилы, стройки, «+N», чертёж (rts_build.js)
  // удары, сканы, метки
  for (const st of S.strikes){
    if (!vis(st.pos)) continue;
    octx.strokeStyle = st.team ? 'rgba(255,80,60,.9)' : 'rgba(255,180,110,.9)'; octx.lineWidth = 2;
    octx.setLineDash([6, 5]); groundRing(add(st.pos, mul(norm(st.pos), 0.3)), st.r || 16, 28); octx.setLineDash([]);
  }
  for (const z of S.scans){ if (z.team !== 0 || !vis(z.pos)) continue; const k = (z.t % 2) / 2; octx.strokeStyle = `rgba(120,200,255,${(0.6 * (1 - k)).toFixed(3)})`; octx.lineWidth = 2; groundRing(z.pos, z.r * k, 40); }
  for (const m of S.markers){ if (!vis(m.pos)) continue; const s = project(m.pos); if (!s) continue; octx.strokeStyle = m.col; octx.lineWidth = 2; octx.beginPath(); octx.arc(s[0], s[1], 10 + 4 * sin(S.rtime * 12), 0, PI * 2); octx.stroke(); }
}
function drawOverlay(dt){
  octx.clearRect(0, 0, innerWidth, innerHeight);
  if (OPER.on){
    const vert = OPER.aspect === '9:16', H = innerHeight, W = vert ? H * 9 / 16 : innerWidth;
    octx.save(); octx.translate((innerWidth - W) / 2, 0); OPER.drawCaptions(octx, W, H); octx.restore();
    octx.fillStyle = 'rgba(214,198,154,.55)'; octx.font = '11px "Exo 2", sans-serif'; octx.textAlign = 'right';
    octx.fillText(tr('КИНО-РЕЖИМ · R — запись · C — подписи · V — вертикально/горизонтально · Esc — меню', 'CINEMA MODE · R — record · C — captions · V — vertical/wide · Esc — menu', 'CHẾ ĐỘ ĐIỆN ẢNH · R — ghi · C — phụ đề · V — dọc/ngang · Esc — menu') + (REC.active ? ' · ● REC ' + Math.floor((performance.now() - REC.t0) / 1000) + 's' : ''), innerWidth - 12, innerHeight - 10);
    return;
  }
  if (S.attract || !S.cam) return;
  if (S.mode === 'rts'){ drawRTSOverlay(dt); return; }
  const me = S.me, c = ctrlEntity();
  // навигационная линия
  const t = TACT.task;
  if ((S.navLine || S.navT > 0) && navPts.length && t && !t.done){
    const alpha = S.navLine ? 0.75 : min(0.75, S.navT / 2);
    const tt = performance.now() / 600;
    const col = t.kind === 'strat' || t.kind === 'player' ? '140,255,170' : '255,190,90';
    octx.lineWidth = 2.5;
    for (let i = 0; i < navPts.length - 1; i++){
      const a = project(navPts[i]), b = project(navPts[i + 1]);
      if (!a || !b) continue;
      const ph = (i * 0.35 - tt) % 1;
      const fade = alpha * (1 - i / navPts.length) * (0.45 + 0.55 * (ph < 0 ? ph + 1 : ph));
      const dx = b[0] - a[0], dy = b[1] - a[1], L = hypot(dx, dy); if (L < 1) continue;
      const ux = dx / L, uy = dy / L, sz = clamp(260 / a[2], 3, 16);
      octx.strokeStyle = `rgba(${col},${fade.toFixed(3)})`;
      octx.beginPath();
      octx.moveTo(a[0] - ux * sz + uy * sz * 0.8, a[1] - uy * sz - ux * sz * 0.8);
      octx.lineTo(a[0], a[1]);
      octx.lineTo(a[0] - ux * sz - uy * sz * 0.8, a[1] - uy * sz + ux * sz * 0.8);
      octx.stroke();
    }
  }
  drawWorldMarkers(false);
  TUT.overlay();
  SIDEQ.overlay();
  // юниты
  octx.font = '600 12px "Exo 2", Consolas, sans-serif';
  const tgts = t && t.targets && !t.done ? t.targets : null;
  const all = [...S.units, ...S.vehicles, ...S.drones];
  for (const u of all){
    if (!u.alive || u === c) continue;
    if (u.team === 1 && u.seen[0] <= 0) continue;
    const big = u.cls === 'tank';
    const s = project(add(u.pos, mul(u.up, big ? 3.8 : 1.9))); if (!s) continue;
    if (s[2] > 260) continue;
    const col = TEAM[u.team].css;
    octx.fillStyle = col;
    octx.beginPath();
    if (u.team === 0){ octx.moveTo(s[0] - 5, s[1] - 7); octx.lineTo(s[0] + 5, s[1] - 7); octx.lineTo(s[0], s[1]); }
    else { octx.moveTo(s[0] - 6, s[1] - 9); octx.lineTo(s[0], s[1] - 2); octx.lineTo(s[0] + 6, s[1] - 9); octx.lineTo(s[0], s[1] - 5); }
    octx.closePath(); octx.fill();
    if (tgts && tgts.includes(u)){ octx.strokeStyle = '#ffbe5a'; octx.lineWidth = 1.5; octx.strokeRect(s[0] - 8, s[1] - 14, 16, 16); }
    if (s[2] < 70){
      octx.fillStyle = 'rgba(0,0,0,.6)'; octx.fillRect(s[0] - 14, s[1] - 14, 28, 3);
      octx.fillStyle = col; octx.fillRect(s[0] - 14, s[1] - 14, 28 * max(0, u.hp) / u.maxhp, 3);
    }
  }
  // маркер задачи
  const op = objectivePos();
  if (op && t && !t.done && c){
    const tgt = navTargetFor(op, c.pos);
    const tac = t.kind !== 'strat' && t.kind !== 'player';
    edgeMarker(tgt, tac ? '#ffbe5a' : '#8fffaa', len(op) < 80 ? tr('ШАХТА → ЯДРО', 'SHAFT → CORE', 'GIẾNG → LÕI') : (tac ? tr('ТАКТИКА', 'TACTICAL', 'CHIẾN THUẬT') : tr('ЗАДАЧА', 'OBJECTIVE', 'NHIỆM VỤ')), `${Math.round(dist(tgt, c.pos))} ${tr('м', 'm', 'm')}`);
  }
  if (S.onRoute && c && c.cls === 'inf'){ octx.font = '600 12px "Exo 2", sans-serif'; octx.fillStyle = 'rgba(140,255,170,.9)'; octx.fillText(tr('» МАРШРУТ СТРАТЕГА · СПРИНТ »', '» STRATEGIST ROUTE · SPRINT »', '» TUYẾN ĐƯỜNG CHIẾN LƯỢC · CHẠY NƯỚC RÚT »'), innerWidth / 2, innerHeight / 2 + 48); }
  if (S.healGlow > 0){
    S.healGlow = max(0, S.healGlow - dt);
    const g = octx.createRadialGradient(innerWidth / 2, innerHeight / 2, innerHeight * 0.3, innerWidth / 2, innerHeight / 2, innerHeight * 0.8);
    g.addColorStop(0, 'rgba(60,255,120,0)'); g.addColorStop(1, `rgba(60,255,120,${(S.healGlow * 0.4).toFixed(3)})`);
    octx.fillStyle = g; octx.fillRect(0, 0, innerWidth, innerHeight);
  }
  // попадание
  if (S.hitT > 0){
    const cx = innerWidth / 2, cy = innerHeight / 2;
    octx.strokeStyle = '#fff'; octx.lineWidth = 2; octx.beginPath();
    octx.moveTo(cx - 10, cy - 10); octx.lineTo(cx - 4, cy - 4); octx.moveTo(cx + 10, cy - 10); octx.lineTo(cx + 4, cy - 4);
    octx.moveTo(cx - 10, cy + 10); octx.lineTo(cx - 4, cy + 4); octx.moveTo(cx + 10, cy + 10); octx.lineTo(cx + 4, cy + 4);
    octx.stroke();
  }
  // откуда пришёл урон
  if (S.dmgDir && S.dmgDir.t > 0 && c){
    S.dmgDir.t -= dt;
    const v = sub(S.dmgDir.pos, S.cam.pos);
    const a = atan2(dot(v, S.cam.right), dot(v, tangent(S.cam.fwd, norm(S.cam.pos))));
    const cx = innerWidth / 2, cy = innerHeight / 2, R = 90;
    octx.strokeStyle = `rgba(255,90,40,${min(0.85, S.dmgDir.t).toFixed(3)})`; octx.lineWidth = 5;
    octx.beginPath(); octx.arc(cx, cy, R, a - PI / 2 - 0.35, a - PI / 2 + 0.35); octx.stroke();
  }
  // всплывающий опыт
  octx.textAlign = 'left';
  S.popups.forEach((p, i) => {
    const k = p.t / 2.6;
    octx.globalAlpha = 1 - smoothstep(0.7, 1, k);
    octx.font = (p.mult >= 2 ? '700 15px' : '600 13px') + ' "Exo 2", Consolas, sans-serif';
    octx.fillStyle = p.color;
    octx.fillText(p.text, innerWidth / 2 + 40, innerHeight / 2 + 30 + (S.popups.length - 1 - i) * 18 - k * 14);
  });
  octx.globalAlpha = 1; octx.textAlign = 'center';
  const hint = nearbyInteract(me);
  if (hint || (me && me.cls === 'bld')){
    octx.font = '600 14px "Exo 2", Consolas, sans-serif'; octx.fillStyle = '#e8dcb8';
    octx.fillText(hint ? hint.text : tr(`${bk('interact')} — покинуть турель`, `${bk('interact')} — leave the turret`, `${bk('interact')} — rời tháp súng`), innerWidth / 2, innerHeight / 2 + 70);
  }
  drawMinimap();
}

// ---------- DOM-HUD ----------
const hudEl = $('hud'), feedEl = $('feed'), objEl = $('obj'), dbgEl = $('dbg');
let fpsVal = 0;
function hb(label, val, sub){ return `<div class="hb"><small>${label}</small><b>${val}</b><em>${sub}</em></div>`; }
function updateHUD(){
  const fps = S.mode === 'fps' && !S.attract;
  if (S.attract){ objEl.style.display = 'none'; return; }
  const T = S.teams[0], E = S.teams[1];
  const pts = [0, 0]; for (const c of S.cps) if (c.owner >= 0) pts[c.owner]++;
  const left = GAME.MATCH - S.time;
  const hqTxt = h => h.alive ? Math.round(max(0, h.hp) / h.maxhp * 100) + '%' : '✖' + keyBuildings(h.team).length;
  hudEl.innerHTML =
    ecoHB(T) +   // v6: руда, доход в минуту, клик — «Откуда руда» (rts_build.js)
    hb(tr('КО', 'CP', 'ĐCH'), `${T.cmd}`, tr('командные очки', 'command points', 'điểm chỉ huy')) +
    (S.endless ? hb(tr('БОЙ ИДЁТ', 'BATTLE', 'TRẬN ĐẤU'), fmtTime(S.time), `${N2(SCALES[clamp(SET.battle | 0, 0, 2)].n).toLowerCase()} · ∞`) : hb(tr('ВРЕМЯ', 'TIME', 'THỜI GIAN'), fmtTime(left), tr('из 60:00', 'of 60:00', 'trên 60:00'))) +
    hb(tr('ТОЧКИ', 'POINTS', 'ĐIỂM'), `<span style="color:${TEAM[0].css}">${pts[0]}</span> : <span style="color:${TEAM[1].css}">${pts[1]}</span>`, tr('из 7', 'of 7', 'trên 7')) +
    hb(tr('БАЗЫ', 'BASES', 'CĂN CỨ'), `<span style="color:${TEAM[0].css}">${hqTxt(S.hq[0])}</span> · <span style="color:${TEAM[1].css}">${hqTxt(S.hq[1])}</span>`,
       `${T.jet2 ? tr('Ранцы II ✓', 'Jets II ✓', 'Phản lực II ✓') : tr('ранцы I', 'jets I', 'phản lực I')}${T.armor ? ' · ' + tr('бр', 'ar', 'giáp') + T.armor : ''}${T.weapons ? ' · ' + tr('ор', 'wp', 'vk') + T.weapons : ''}`) +
    hb(tr('СТРАТЕГ', 'STRATEGIST', 'CHIẾN LƯỢC GIA'), T.ai ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT'), `${bk('ai')} — ${tr('переключить', 'toggle', 'bật/tắt')}`);
  // задача
  const card = fps ? TACT.card() : null;
  if (card && (!card.done || TACT.task && S.time - TACT.task.doneT < 4)){
    objEl.style.display = 'block';
    objEl.className = (card.done ? (card.ok ? 'done' : 'fail') : '') + (card.tac ? ' tac' : '');
    objEl.innerHTML = `<small>${card.head}</small><b>${card.title}</b>${card.sub ? `<em>${card.sub}</em>` : ''}` +
      (card.mult ? `<i class="mult ${card.on ? 'on' : ''}">XP ×${card.mult}${card.on ? '' : tr(' · выполняй задачу', ' · stay on task', ' · bám nhiệm vụ')}</i>` : '');
  } else objEl.style.display = 'none';
  // побочная задача
  const sqEl = $('sq'), sqH = fps ? SIDEQ.card() : '';
  if (sqH){ sqEl.style.display = 'block'; if (sqEl._h !== sqH){ sqEl._h = sqH; sqEl.innerHTML = sqH; } } else sqEl.style.display = 'none';
  // полосы и снаряжение
  const c = ctrlEntity();
  if (fps && c){
    const hpE = $('hpFill'), jE = $('jetFill'), jL = $('jetLbl'), hL = $('hpLbl'), rk = $('rocket');
    hpE.style.width = (max(0, c.hp) / c.maxhp * 100).toFixed(1) + '%';
    const g = c.cls === 'bld' ? null : groupOf(c);
    hL.textContent = c.cls === 'tank' ? `${groupLabel(c)} ${tankName(c.team)}` : c.cls === 'drone' ? groupLabel(c) : c.cls === 'bld' ? bname(c.type).toUpperCase()
      : (N2(roleOf(c).n).toUpperCase() + (c.elite ? ' ✦' : '') + (c.leader ? ' · ' + tr('ЛИДЕР', 'LEADER', 'TRƯỞNG ĐỘI') : '')) + (g ? ` · ${groupLabel(g).toUpperCase()}${g.vet ? ' ' + '★'.repeat(g.vet) : ''}` : '');
    rk.textContent = `${Math.round(max(0, c.hp))}/${c.maxhp}`; rk.className = '';
    if (c.cls === 'inf'){
      jE.style.width = (c.energy / c.jet.emax * 100).toFixed(1) + '%';
      jE.style.background = c.locked ? '#a44' : (c.thrusting ? '#ffb055' : '#b9d8ff');
      const r = len(c.pos);
      jL.textContent = S.freecam ? tr('свободная камера', 'free camera', 'camera tự do') : c.locked ? tr('ранец перезаряжается…', 'jetpack recharging…', 'ba lô đang nạp…') : c.lifting ? tr('гравилифт', 'grav lift', 'thang trọng lực') :
        r < CORE_R + 3 ? tr('ядро — невесомость', 'core — zero-g', 'lõi — không trọng lực') : `${N2(c.jet.n).toUpperCase()} · ${tr('высота', 'alt', 'độ cao')} ${Math.round(altitude(c.pos))} ${tr('м', 'm', 'm')}`;
      $('jetBar').style.display = 'block';
    } else if (c.cls === 'tank'){
      jE.style.width = (clamp(1 - c.cd / 2.6, 0, 1) * 100).toFixed(1) + '%';
      jE.style.background = c.cd > 0 ? '#887' : '#e8dcb8';
      jL.textContent = c.cd > 0 ? tr('пушка перезаряжается', 'cannon reloading', 'pháo đang nạp') : tr('ПУШКА ГОТОВА · ЛКМ', 'CANNON READY · LMB', 'PHÁO SẴN SÀNG · CHUỘT TRÁI');
    } else if (c.cls === 'drone'){
      jE.style.width = clamp(altitude(c.pos) / 60, 0, 1) * 100 + '%'; jE.style.background = '#b9d8ff';
      jL.textContent = tr(`ДРОН · высота ${Math.round(altitude(c.pos))} м`, `DRONE · altitude ${Math.round(altitude(c.pos))} m`, `DRONE · độ cao ${Math.round(altitude(c.pos))} m`);
    } else {
      jE.style.width = '100%'; jE.style.background = '#e8dcb8';
      jL.textContent = c.type === 'aa' ? tr('ЗЕНИТКА · ЛКМ', 'AA GUN · LMB', 'PHÁO PHÒNG KHÔNG · CHUỘT TRÁI') : tr('ПУЛЕМЁТ · ЛКМ', 'MACHINE GUN · LMB', 'SÚNG MÁY · CHUỘT TRÁI');
    }
    // звание
    const nx = PROG.nextXP(), base = RANKS[PROG.rank][0];
    $('rankLbl').innerHTML = `<b>${PROG.rankName().toUpperCase()}</b> · ${PROG.xp}${nx ? ' / ' + nx : ''} XP`;
    $('xpFill').style.width = (nx ? (PROG.xp - base) / (nx - base) * 100 : 100).toFixed(1) + '%';
    updateKit(c);
  }
  feedEl.innerHTML = S.feed.filter(f => S.time - f.t < 14).map(f => `<div style="color:${f.color}">${f.text}</div>`).join('');
  // баннер звания
  const ban = $('banner');
  if (S.rankBanner && S.rtime - (S.rankBanner.t0 || (S.rankBanner.t0 = S.rtime)) < 4.5){
    const u = S.rankBanner.unlock ? UNLOCK_INFO[S.rankBanner.unlock] : null;
    ban.style.display = 'block';
    ban.innerHTML = `<small>${tr('ПОВЫШЕНИЕ', 'PROMOTION', 'THĂNG CẤP')}</small><b>${PROG.rankName(S.rankBanner.rank).toUpperCase()}</b>` + (u ? `<em>${tr('Открыто', 'Unlocked', 'Mở khóa')}: ${N2(u.n)}${u.key ? ` <kbd>${u.key}</kbd>` : ''}</em>` : '');
  } else ban.style.display = 'none';
  // переключатель
  const sw = $('switcher');
  if (SW.list && S.rtime - SW.t < 2.5 && fps){
    sw.style.display = 'flex';
    const icon = { inf: '◆', tank: '■', drone: '▲', bld: '⌖' };
    sw.innerHTML = SW.list.slice(0, 8).map((o, i) => `<div class="${i === SW.idx ? 'cur' : ''}"><i>${icon[o.kind]}</i>${o.label}<em>${o.d < 1e8 ? Math.round(o.d) + ' ' + tr('м до боя', 'm to fight', 'm tới trận') : '—'}</em></div>`).join('') +
      `<p>${bk('switch')} — ${tr('дальше', 'next', 'tiếp')}, Shift+${bk('switch')} — ${tr('назад', 'back', 'lùi')}</p>`;
  } else sw.style.display = 'none';
  if (S.mode === 'rts') updateRTSHUD();
  dbgEl.style.display = 'block';
  dbgEl.textContent = S.debug
    ? `FPS ${fpsVal.toFixed(0)} · ×${S.scale} · q${S.quality} · HDR ${HDR} · obj ${renderList.length} · proj ${S.proj.length} · units ${S.units.length}\nSwarm: ore ${Math.floor(E.ore)} · squads ${S.squads.filter(s => s.team === 1).length} · tanks ${S.vehicles.filter(v => v.team === 1).length} · drones ${S.drones.filter(d => d.team === 1).length} · bld ${S.buildings.filter(b => b.team === 1).length} · cmd ${E.cmd}`
    : `${fpsVal.toFixed(0)} FPS · ×${S.scale}${S.autoRes ? ' auto' : ''}`;
}
function slot(key, name, state, frac, extra){
  return `<div class="slot ${state}"><kbd>${key}</kbd><span>${name}</span>${frac !== null ? `<i style="width:${(frac * 100).toFixed(0)}%"></i>` : ''}${extra ? `<em>${extra}</em>` : ''}</div>`;
}
function lockedSlot(key, name, unlock){
  const r = Object.keys(UNLOCKS).find(k => UNLOCKS[k] === unlock);
  return slot(key, name, 'locked', null, `🔒 ${PROG.rankName(+r)}`);
}
function updateKit(c){
  const el = $('kit'), K = S.kit;
  let h = '';
  if (c.cls === 'inf'){
    const W = WEAPONS[K.w];
    const wl = ['rifle', 'rail', 'hmg'].map((w, i) => `<span class="${K.w === w ? 'cur' : weaponAvail(w) ? '' : 'na'}">${i + 1}</span>`).join('');
    h += `<div class="weap"><small>${N2(W.n).toUpperCase()}${K.incT > 0 ? ' · ' + tr('ЗАЖИГ.', 'INC.', 'ĐẠN CHÁY') + ' ' + Math.ceil(K.incT) : ''}${K.w === 'hmg' ? ' · ' + Math.ceil(K.hmgT) + tr('с', 's', 'giây') : ''}</small>` +
         `<b>${K.reloadT > 0 ? tr('ПЕРЕЗАРЯДКА', 'RELOADING', 'ĐANG NẠP') : K.mag[K.w]}<em>/${W.mag}</em></b><div class="wl">${wl}</div></div>`;
    h += '<div class="slots">';
    h += slot(bk('rocket'), tr('Ракета', 'Rocket', 'Tên lửa'), c.rocketCd > 0 ? 'cd' : 'ok', c.rocketCd > 0 ? 1 - c.rocketCd / (roleOf(c).rocket * (c.elite ? 0.65 : 1)) : null, K.freeRockets ? '×' + K.freeRockets : (c.rocketCd > 0 ? Math.ceil(c.rocketCd) : ''));
    h += PROG.has('grenade') ? slot(bk('grenade'), tr('Граната', 'Grenade', 'Lựu đạn'), K.grenCd > 0 ? 'cd' : 'ok', K.grenCd > 0 ? 1 - K.grenCd / 9 : null, K.grenCd > 0 ? Math.ceil(K.grenCd) : '') : lockedSlot(bk('grenade'), tr('Граната', 'Grenade', 'Lựu đạn'), 'grenade');
    h += PROG.has('reflex') ? slot(bk('reflex'), tr('Рефлекс', 'Reflex', 'Phản xạ'), K.reflexOn ? 'on' : (K.reflex < 0.25 ? 'cd' : 'ok'), K.reflex, K.reflexOn ? tr('АКТИВЕН', 'ACTIVE', 'ĐANG BẬT') : '') : lockedSlot(bk('reflex'), tr('Рефлекс', 'Reflex', 'Phản xạ'), 'reflex');
    const strikeOk = PROG.has('strike') || K.strikeCharges > 0;
    h += strikeOk ? slot(bk('strike'), PROG.has('orbital') ? tr('Орбита', 'Orbital', 'Quỹ đạo') : tr('Артудар', 'Strike', 'Pháo kích'), K.strikeCd > 0 && !K.strikeCharges ? 'cd' : 'ok', K.strikeCd > 0 && !K.strikeCharges ? 1 - K.strikeCd / 90 : null, K.strikeCharges ? '×' + K.strikeCharges : (K.strikeCd > 0 ? Math.ceil(K.strikeCd) : '')) : lockedSlot(bk('strike'), tr('Артудар', 'Strike', 'Pháo kích'), 'strike');
    h += '</div>';
  } else if (c.cls === 'tank' || c.cls === 'drone'){
    const keysFor = { barrage: bk('reload'), smoke: bk('reflex'), overdrive: bk('grenade'), kamikaze: bk('reload') };
    h += '<div class="slots">';
    for (const k of abilList(c)){ const left = abilLeft(c, k), A = ABIL[k]; h += slot(keysFor[k], N2(A.n), left > 0 ? 'cd' : 'ok', left > 0 && A.cd ? 1 - left / A.cd : null, left > 0 ? Math.ceil(left) : ''); }
    h += '</div>';
  }
  if (PROG.has('reflex') && (c.cls === 'drone' || c.cls === 'bld')) h += `<div class="slots">${slot(bk('reflex'), tr('Рефлекс', 'Reflex', 'Phản xạ'), K.reflexOn ? 'on' : 'ok', K.reflex, '')}</div>`;
  el.innerHTML = h;
}
