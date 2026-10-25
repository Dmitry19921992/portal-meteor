// действия для скриншотов стрельбы (после units_show.js): UV2.act(имя)
const run = (sec) => { S.paused = false; const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); S.paused = true; };
UV2.tgt = UV2.tgt || (() => {
  const p = surfacePoint(norm(add(mul(UV2.c0, RM), mul(UV2.t1, 85))), 0.5);
  const sq = spawnSquad(1, false, p, 4); for (const u of sq.units){ u.parked = true; u.hp = u.maxhp = 5000; }
  const tk = makeTank(surfacePoint(norm(add(p, mul(UV2.t2, 8))), 1.5), 1); tk.hp = tk.maxhp = 50000; tk.manualUntil = 1e9; tk.order = 'hold'; tk.goal = tk.pos;
  return { p, sq, tk };
})();
UV2.reset = () => { for (const k in UV2.v){ const v = UV2.v[k]; v.flash = 0; v.cd = 0; v.salvoN = 0; v.lobTp = null; v.fireAt = null; v.target = null; v.manualUntil = 1e9; } S.proj = []; S.fx = []; S.sparks = []; S.lights = []; S.waves = []; S.beams = []; };
UV2.act = (name) => {
  const V = UV2.v, T = UV2.tgt;
  for (const u of T.sq.units) u.seen[0] = 5;
  if (name === 'mlrs'){ UV2.reset(); const m = V.mlrs0; m.aim = tangent(sub(T.p, m.pos), m.up); m.elev = 0.75; V2.shootMain(m, T.p, null); run(0.75); UV2.cam('mlrs0', 2.2, 9, 2.2); }
  if (name === 'impact'){ run(2.6); const up = norm(T.p); S.camOverride = { pos: add(add(T.p, mul(UV2.t1, -22)), add(mul(up, 7), mul(UV2.t2, 10))), look: add(T.p, mul(up, 1)) }; }
  if (name === 'hive'){ UV2.reset(); const m = V.mlrs1; m.aim = tangent(sub(T.p, m.pos), m.up); m.elev = 0.75; V2.shootMain(m, add(T.p, mul(UV2.t2, 5)), null); run(1.2); UV2.cam('mlrs1', 2.0, 10, 3); }
  if (name === 'cat1'){ UV2.reset(); const c = V.cat1; c.aim = tangent(sub(T.p, c.pos), c.up); V2.shootMain(c, T.p, null); run(0.24); UV2.cam('cat1', 1.9, 7, 2.2); }
  if (name === 'split'){ run(3.2); const ps = S.proj.filter(p => p.type === 'g'); const c = ps.length ? ps[0].pos : T.p; const up = norm(c); S.camOverride = { pos: add(add(c, mul(UV2.t1, -16)), add(mul(up, 3), mul(UV2.t2, 8))), look: c }; }
  if (name === 'mortar'){ UV2.reset(); const c = V.cat0; c.aim = tangent(sub(T.p, c.pos), c.up); c.elev = 0.6; V2.shootMain(c, T.p, null); run(0.12); UV2.cam('cat0', 1.9, 6.5, 2); }
  if (name === 'raider'){ UV2.reset(); const r = V.raider0; const c = add(centerOf(T.tk), mul(norm(T.tk.pos), 0.5)); r.aim = norm(sub(c, r.pos)); V2.shootMain(r, c, T.tk); run(0.45); UV2.cam('raider0', 2.3, 6, 1.8); }
  return S.proj.length;
};
return Object.keys(UV2.v).length;
