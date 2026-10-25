window.BAL76 = { n: 12, T: 900, dt: 0.1 };
// v7.6 balance: bot-vs-bot headless matches at accelerated time (render paused), both team/faction assignments.
// Win criterion: HQ+key buildings destroyed, else after T sec a score (points, HQ hp, army value, kills).
// args via window.BAL76 = { n, T, dt }
const P = Object.assign({ n: 6, T: 1500, dt: 0.1 }, window.BAL76 || {});
const out = { P, runs: [], errs };
// пауза рендера: кадры не рисуем, симуляцию крутим сами
const raf0 = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;
await sleep(300);
const armyVal = t => S.units.filter(u => u.alive && u.team === t).reduce((s, u) => s + 25, 0) + S.vehicles.filter(v => v.alive && v.team === t).reduce((s, v) => s + (v.rhino76 ? 330 : v.vk ? 200 : 200), 0) + S.drones.filter(d => d.alive && d.team === t).length * 45 + S.buildings.filter(b => b.alive && b.team === t && b.done).length * 60;
for (let i = 0; i < P.n; i++){
  const fac = (P.facs || [[0, 1], [1, 0]])[i % (P.facs || [0, 0]).length];
  SET.diff = 1; S.diff = 1;
  newMatch({ attract: true, fac76: fac });
  S.diff = 1; S.endless = true;
  const t0 = performance.now();
  let t = 0;
  for (; t < P.T && !S.over; t += P.dt){ update(P.dt); if ((t / P.dt | 0) % 600 === 0) await sleep(0); }
  const pts = [0, 1].map(k => S.cps.filter(c => c.owner === k).length);
  const hq = S.hq.map(h => +(max(0, h.hp) / h.maxhp).toFixed(2));
  const av = [armyVal(0), armyVal(1)];
  const score = [0, 1].map(k => pts[k] * 400 + hq[k] * 1500 + av[k] + S.stats.kills[k] * 8 + keyBuildings(k).length * 150);
  const winTeam = S.over ? S.winner : (score[0] >= score[1] ? 0 : 1);
  out.runs.push({ fac, over: S.over, t: Math.round(t), winTeam, winFac: FI76(winTeam), pts, hq, army: av, kills: S.stats.kills.slice(), score: score.map(Math.round), craters: CR76.stats.made + CR76.stats.merged,
    v: [0, 1].map(k => S.vehicles.filter(v => v.alive && v.team === k).map(v => v.rhino76 ? 'R' : v.vk ? v.vk[0] : 'T').join('')), dr: [0, 1].map(k => S.drones.filter(d => d.alive && d.team === k).length),
    up: [0, 1].map(k => (S.teams[k].plates76 ? 'P' : '') + (S.teams[k].phase76 ? 'F' : '')), ms: Math.round(performance.now() - t0) });
}
const w = [0, 0]; for (const r of out.runs) w[r.winFac]++;
out.winsByFaction = { consortium: w[0], swarm: w[1] };
const wt = [0, 0]; for (const r of out.runs) wt[r.winTeam]++;
out.winsByTeam = wt;
window.requestAnimationFrame = raf0; requestAnimationFrame(frame);
newMatch({ attract: true });
return out;


