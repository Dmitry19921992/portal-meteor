// mission_modes.js — «Свобода действий», «Действую один» (+ позвать обратно), вопрос «работаешь сам?» после игнора приказов
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(500); }
window.requestAnimationFrame = () => 0;
const out = {};
const count = () => { const c = { objective: 0, radio: 0 }; const oe = window.emit; window.emit = (t, d) => { if (c[t] !== undefined) c[t]++; return oe(t, d); }; return () => { window.emit = oe; return c; }; };
const run = sec => { for (let i = 0; i < sec * 20; i++){ for (const k in keys) keys[k] = false; mouseL = false; update(0.05); if (i % 5 === 0) computeNav(); } };
// 1) свобода действий: голоса приказов нет, отряд стратег не дёргает, подсказка тихая
SET.ordersFree = false; SET.solo = false;
MENU.newGame();
MISSION.setFree(true);
let stop = count();
run(240);
const c1 = stop();
const g = playerGroup();
out.free = { objectiveVoice: c1.objective, radio: c1.radio, card: (TACT.card() || {}).head, squadOrder: g && g.order, squadSize: g && g.units.length, task: TACT.task && TACT.task.kind };
// Y — принять подсказку
dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyY' }));
out.free.accepted = !!(TACT.task && TACT.task.accepted);
MISSION.setFree(false);
// 2) одиночка: отряд уходит, игрок — один; потом зовём обратно
const sq0 = playerGroup(), n0 = sq0.units.length;
MISSION.setSolo(true);
run(3);
const lone = playerGroup();
out.solo = { before: n0, lone: !!lone.lone, loneSize: lone.units.length, formerSize: MISSION.former ? MISSION.former.units.length : 0, formerOrder: MISSION.former && MISSION.former.order };
run(30);
out.solo.formerAfter30s = MISSION.former ? { order: MISSION.former.order, dist: Math.round(surfDist(leaderPos(MISSION.former), S.me.pos)) } : null;
MISSION.setSolo(false);
let merged = -1;
for (let s = 0; s < 150 && merged < 0; s += 5){ run(5); if (!playerGroup().lone && playerGroup().units.length > 1) merged = s + 5; }
out.recall = { mergedAfterSec: merged, size: playerGroup().units.length, recallActive: !!MISSION.recall };
// 3) игрок стоит и игнорирует приказы → один раз спросят «работаешь сам?»
SET.ordersFree = false; SET.solo = false;
MENU.newGame();
stop = count();
let askedAt = -1;
for (let s = 0; s < 900 && askedAt < 0; s += 5){ run(5); if (MISSION.ask) askedAt = Math.round(S.time); }
out.ignore = { askedAt, toast: $('mtoast') && $('mtoast').style.display, voice: stop() };
if (MISSION.ask){
  dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyY' }));
  out.ignore.afterYes = { free: SET.ordersFree, toast: $('mtoast').style.display };
}
SET.ordersFree = false; MENU.save();
out.stats = MISSION.stats();
return out;
