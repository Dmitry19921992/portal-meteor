// v7.8: natural bot-vs-bot matches (render paused, accelerated): anomaly traps, AI avoidance, AI support usage, side balance
const P = Object.assign({ n: 4, T: 600, dt: 0.1 }, window.BAL78 || {});
const out = { P, runs: [] };
const raf0 = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;
await sleep(300);
for (let i = 0; i < P.n; i++){
  SET.diff = 1; S.diff = 1;
  newMatch({ attract: true, fac76: i % 2 ? [1, 0] : [0, 1] });
  S.diff = 1; S.endless = true;
  for (const k in A78.stats) A78.stats[k] = Array.isArray(A78.stats[k]) ? [0, 0] : 0;
  for (const k in S78.stats) S78.stats[k] = typeof S78.stats[k] === 'object' ? {} : 0;
  const t0 = performance.now(); let t = 0;
  for (; t < P.T && !S.over; t += P.dt){ update(P.dt); if ((t / P.dt | 0) % 600 === 0) await sleep(0); }
  out.runs.push({ t: Math.round(t), over: S.over, win: S.winner, kills: S.stats.kills.slice(), nA: A78.L.length,
    trapped: A78.stats.trapped.slice(), hits: A78.stats.hits.slice(), aKills: A78.stats.kills.slice(), blunders: A78.stats.blunders, avoided: A78.stats.avoided,
    discharged: A78.stats.discharged, pulses: A78.stats.pulses, aiGrad: S78.stats.aiGrad, err: Object.keys(A78.err).concat(Object.keys(S78.err)).join(','), ms: Math.round(performance.now() - t0) });
}
// micro-benchmark: A78.step cost with all anomalies and full armies
{ const n = 200, t0 = performance.now(); for (let i = 0; i < n; i++){ A78.lt = S.time - 0.05; A78.scanT = 0; A78.step(); } out.stepMs = +((performance.now() - t0) / n).toFixed(3); }
{ S.cam = S.cam || { pos: mul(BASES[0], RM + 30), fwd: [1, 0, 0], right: [0, 0, 1], up: [0, 1, 0], fov: 1 }; const n = 200, t0 = performance.now(); for (let i = 0; i < n; i++){ A78.parts(0); A78.lights(0); S78.parts(0); } out.gatherMs = +((performance.now() - t0) / n).toFixed(3); }
window.requestAnimationFrame = raf0; requestAnimationFrame(frame);
newMatch({ attract: true });
out.errs = errs;
return out;
