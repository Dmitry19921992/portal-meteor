// ИИ обеих сторон 12 минут боя (ручной шаг update): строят ли новую технику, наносят ли урон, от чего гибнут
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && SCENE) break; await sleep(1000); }
newMatch({ attract: true });            // оба стратега — ИИ, игрок не вмешивается
S.paused = false;
const DUR = +(window.UNITS_DUR || 720), DT = 0.05;
const dealt = {}, taken = {}, deaths = {}, made = {}, firstT = {};
const key = e => e && e.cls === 'tank' ? (e.vk || 'tank') + e.team : e ? (e.cls === 'bld' ? 'bld:' + e.type : e.cls) + (e.team !== undefined ? e.team : '') : 'none';
window.DMGLOG = (e, src, ptype, dmg) => {
  if (src && src.vk){ const k = key(src); dealt[k] = dealt[k] || {}; const t = e.cls === 'bld' ? 'bld' : e.cls; dealt[k][t] = Math.round((dealt[k][t] || 0) + dmg); }
  if (e.vk && e.hp - dmg <= 0 && e.alive){ const k = key(e); deaths[k] = deaths[k] || {}; const s = src ? (src.cls === 'tank' ? (src.vk || 'tank') : src.cls === 'inf' ? 'inf:' + (src.role || '') : src.cls === 'bld' ? 'bld:' + src.type : src.cls) : 'none'; deaths[k][s] = (deaths[k][s] || 0) + 1; }
};
const seenIds = new Set();
let worst = 0, sum = 0, n = 0;
const t0 = performance.now();
for (let s = 0; s < DUR / DT; s++){
  const a = performance.now();
  update(DT);
  const b = performance.now() - a; worst = Math.max(worst, b); sum += b; n++;
  for (const v of S.vehicles) if (v.vk && !seenIds.has(v.id)){ seenIds.add(v.id); const k = key(v); made[k] = (made[k] || 0) + 1; if (firstT[k] === undefined) firstT[k] = Math.round(S.time); }
  if (S.over) break;
  if (s % 400 === 0) await sleep(0);
}
window.DMGLOG = null;
const alive = {}; for (const v of S.vehicles) if (v.vk){ const k = key(v); alive[k] = (alive[k] || 0) + 1; }
return { simT: Math.round(S.time), wall: Math.round((performance.now() - t0) / 1000), msPerUpdate: +(sum / n).toFixed(2), worstMs: Math.round(worst), made, firstT, alive, dealt, deaths,
         units: S.units.length, veh: S.vehicles.length, over: S.over, winner: S.winner, ore: S.teams.map(t => Math.round(t.ore)) };
