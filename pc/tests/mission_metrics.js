// mission_metrics.js — симуляция 10 минут боя с «ботом-игроком», который выполняет приказы стратега.
// Меряем: смены приказов и голосовые строки в минуту, «дёрганье» направления маршрута,
// дистанцию пешком между боями и время без боя. Работает и на базовой сборке (main), и на ветке mission.
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 180; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(1000); }
const MIN = window.__MIN || 10, DT = 0.05, MODE = window.__MODE || 'follow';
window.requestAnimationFrame = () => 0;           // останавливаем рендер-цикл: крутим мир вручную
if (typeof MISSION !== 'undefined'){ SET.ordersFree = MODE === 'free'; SET.solo = MODE === 'solo'; }
MENU.newGame();
const B = SET.bind;
const ev = { objective: 0, radio: 0, nag: 0, objdone: 0, ask: 0 };
const voiceT = [];
const oe = window.emit;
window.emit = (t, d) => { if (ev[t] !== undefined) ev[t]++; if (t === 'objective' || t === 'radio') voiceT.push({ t: Math.round(S.time), type: t, text: (d && d.text || '').slice(0, 70) }); return oe(t, d); };
const out = { build: typeof MISSION !== 'undefined' ? 'mission' : 'base', mode: MODE, minutes: MIN };
let lastTask = null, taskChanges = 0, stratSig = '', stratChanges = 0, kinds = {};
let prevDir = null, prevPos = null, prevTask = null, thrash = 0, orderFlip = 0, samples = 0;
let combatUntil = -1, inCombat = false, calmStart = 0, calmWalk = 0, segs = [], combatTime = 0, deaths = 0, lastMe = S.me, teleports = 0;
let tgt = null, thinkT = 0, stuckT = 0, lastP = S.me.pos, redeploys = 0, kills0 = PROG.matchKills;
const enemyNear = (p, r) => { for (const e of [...S.units, ...S.vehicles, ...S.drones]) if (e.alive && e.team === 1 && dist(e.pos, p) < r) return true; return false; };
const N = Math.round(MIN * 60 / DT);
const t0 = performance.now();
for (let i = 0; i < N; i++){
  const me = S.me;
  if (me !== lastMe){ if (lastMe && !lastMe.alive) deaths++; lastMe = me; prevPos = null; }
  for (const k in keys) keys[k] = false; mouseL = false;
  if (me && me.alive && me.cls === 'inf'){
    const up = norm(me.pos), eye = add(me.pos, mul(up, 1.6));
    thinkT -= DT;
    if (thinkT <= 0){
      thinkT = 0.25; tgt = null; let bd = 62;
      for (const e of [...S.units, ...S.vehicles, ...S.drones]){ if (!e.alive || e.team !== 1) continue; const d = dist(e.pos, me.pos); if (d < bd && los(eye, centerOf(e))){ bd = d; tgt = e; } }
    }
    if (tgt && tgt.alive){
      me.fwd = norm(sub(centerOf(tgt), eye)); mouseL = true;
      if (dist(tgt.pos, me.pos) > 38) keys[B.fwd] = true;
      if (tgt.cls === 'tank' || tgt.cls === 'bld') keys[B.rocket] = true;
    } else {
      const p = TACT.navPos ? TACT.navPos() : null;
      if (p){
        if (typeof MISSION !== 'undefined' && MISSION.canRedeploy && MISSION.canRedeploy() && surfDist(me.pos, len(p) < 80 ? mul(bestAxis(norm(me.pos)), RM) : p) > 220){ if (MISSION.redeploy()) redeploys++; }
        const q = navPts.length > 4 ? navPts[4] : (len(p) < 80 ? mul(bestAxis(norm(me.pos)), RM) : p);
        // в шахте/ядре (невесомость) летим прямо к цели в 3D, на поверхности — по касательной
        const under = len(me.pos) < RM - 12;
        const f = under ? norm(sub(len(p) < 80 ? [0, 0, 0] : mul(bestAxis(norm(me.pos)), RM + 5), me.pos)) : tangent(sub(q, me.pos), up);
        if (len(f) > 1e-3){ me.fwd = norm(f); keys[B.fwd] = true; if (under) keys[B.run] = true; }
      }
    }
    if (dist(me.pos, lastP) < 0.02 && keys[B.fwd]) stuckT += DT; else stuckT = 0;
    if (stuckT > 1.5){ keys[B.jump] = true; if (stuckT > 2.2) stuckT = 0; }
    lastP = me.pos;
  }
  update(DT);
  if (typeof SIDEQ !== 'undefined') SIDEQ.step(DT);
  if (i % 5 === 0) computeNav();
  // --- метрики
  const t = TACT.task;
  if (t && t !== lastTask){ taskChanges++; kinds[t.kind] = (kinds[t.kind] || 0) + 1; lastTask = t; }
  if (t && (t.kind === 'strat' || t.kind === 'player') && t.g){ const g = t.g, sig = g.order + '|' + (g.cp ? g.cp.name : '') ; if (sig !== stratSig){ stratChanges++; stratSig = sig; } }
  const c = ctrlEntity();
  if (c && i % 10 === 0){
    // направление на цель маршрута: «дёрганье» — резкий поворот на >45° при малом перемещении
    // считаем только при неизменной задаче и цели дальше 30 м (смена приказа и подход вплотную — не «дёрганье»);
    // отдельно — резкие повороты из-за смены приказа (orderFlip)
    const p = objectivePos();     // то, куда ведёт линия маршрута на экране
    if (p && len(p) > 80 && surfDist(p, c.pos) > 30){
      const d = tangent(sub(p, c.pos), norm(c.pos));
      if (len(d) > 1e-3){
        const dn = norm(d); samples++;
        if (prevDir && prevPos && dist(prevPos, c.pos) < 10 && dot(dn, prevDir) < 0.7){ if (prevTask === TACT.task) thrash++; else orderFlip++; }
        prevDir = dn; prevPos = c.pos; prevTask = TACT.task;
      }
    } else prevDir = null;
  }
  if (c){
    const fight = enemyNear(c.pos, 55) || (c.lastHurt > S.time - 3);
    if (fight) combatUntil = S.time + 5;
    const nowC = S.time < combatUntil;
    if (nowC) combatTime += DT;
    if (nowC && !inCombat){ if (i > 0) segs.push({ dur: S.time - calmStart, walk: calmWalk }); inCombat = true; }
    if (!nowC && inCombat){ inCombat = false; calmStart = S.time; calmWalk = 0; }
    if (!nowC && c._mp){ const dd = dist(c._mp, c.pos); if (dd < 3) calmWalk += dd; else teleports++; }
    c._mp = c.pos;
  }
}
if (!inCombat) segs.push({ dur: S.time - calmStart, walk: calmWalk, open: true });
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const closed = segs.filter(s => !s.open && s.dur > 0.5);
out.simSec = Math.round(S.time); out.realSec = Math.round((performance.now() - t0) / 1000);
out.perMin = { taskChanges: +(taskChanges / MIN).toFixed(2), stratOrderChanges: +(stratChanges / MIN).toFixed(2), objectiveVoice: +(ev.objective / MIN).toFixed(2), radio: +(ev.radio / MIN).toFixed(2), nag: +(ev.nag / MIN).toFixed(2) };
out.kinds = kinds;
out.navThrashPct = samples ? +(100 * thrash / samples).toFixed(1) : 0;
out.navOrderFlipPct = samples ? +(100 * orderFlip / samples).toFixed(1) : 0;
out.navTurnsPerMin = +((thrash + orderFlip) / MIN).toFixed(2);
out.calm = { segments: closed.length, avgCalmSec: +avg(closed.map(s => s.dur)).toFixed(1), maxCalmSec: Math.round(Math.max(0, ...segs.map(s => s.dur))), avgWalkBetweenFights: Math.round(avg(closed.map(s => s.walk))), totalCalmWalk: Math.round(segs.reduce((s, x) => s + x.walk, 0)), combatPct: +(100 * combatTime / S.time).toFixed(1), longCalm60: segs.filter(s => s.dur > 60).length };
out.deaths = deaths; out.kills = PROG.matchKills - kills0; out.tasksDone = PROG.matchTasks; out.redeploys = redeploys; out.teleports = teleports;
out.voiceSample = voiceT.filter(v => v.type === 'objective').slice(0, 14).map(v => v.t + ' ' + v.text);
if (typeof MISSION !== 'undefined' && MISSION.stats) out.missionStats = MISSION.stats();
return out;
