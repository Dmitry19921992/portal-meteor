// Темп экономики/армии ИИ: два ИИ (наш стратег + Рой) играют 9 минут, ручной шаг update().
// Снимки на 5:00 и 9:00. Запуск: $env:CDP_PORT=9232; node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\rts_pace.js v6_rts
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 180; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(1000); }
const RUNS = window.PACE_RUNS || 2, DT = 1 / 30;
const snap = () => [0, 1].map(t => {
  const bl = S.buildings.filter(b => b.alive && b.team === t);
  const types = {}; for (const b of bl) types[b.type] = (types[b.type] || 0) + (b.done ? 1 : 0.001);
  const inf = S.units.filter(u => u.alive && u.team === t).length, tanks = S.vehicles.filter(v => v.alive && v.team === t).length, drones = S.drones.filter(d => d.alive && d.team === t).length;
  return { army: inf + tanks * 4 + drones, inf, squads: S.squads.filter(s => s.team === t).length, tanks, drones,
           builders: (S.builders || []).filter(b => b.alive && b.team === t).length, bld: Object.entries(types).map(([k, v]) => k + ':' + (Math.round(v * 1000) / 1000)).join(' '),
           ore: Math.round(S.teams[t].ore), inc: +(S.teams[t].income * 60).toFixed(0), earned: Math.round(EARN[t]), pts: S.cps.filter(c => c.owner === t).length, hq: Math.round(S.hq[t].hp) };
});
let EARN = [0, 0];
const runs = [];
const errors = [];
const t0 = performance.now();
for (let r = 0; r < RUNS; r++){
  MENU.newGame();
  if (typeof TUT !== 'undefined' && TUT.on) TUT.finish();
  enterRTS();
  EARN = [0, 0];
  const res = {};
  let last = S.teams.map(t => t.ore);
  for (let i = 1; i <= 540 / DT; i++){
    try { update(DT); } catch (e){ errors.push(e.message + ' @' + Math.round(S.time)); if (errors.length > 5) break; }
    for (const t of [0, 1]){ const d = S.teams[t].ore - last[t]; if (d > 0) EARN[t] += d; last[t] = S.teams[t].ore; }
    if (i === Math.round(300 / DT)) res.m5 = snap();
  }
  res.m9 = snap();
  res.over = S.over; res.winner = S.winner;
  runs.push(res);
}
return { build: document.title, sec: Math.round((performance.now() - t0) / 1000), errors, runs };
