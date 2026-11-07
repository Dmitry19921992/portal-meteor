// T24 серия: сценарий B (нора+выход, 2 тяжёлых танка «Паук» + босс «Жнец» у норы, враг пассивен), 200 с.
// runs: window.__runs = [[on, n], ...]. Метрики на прогон: сколько тяжёлых/босс прошли, первая техника через туннель (с),
// сторож, «застой» босса (макс. окно без движения > 3 м при цели > 60 м, не под землёй).
const R = [];
window.requestAnimationFrame = () => 0;
await sleep(250);
const runs = window.__runs || [[true, 4], [false, 2]];
for (const [on, n] of runs) for (let k = 0; k < n; k++){
  T24.on = on;
  newMatch({ attract: true, fac76: [1, 0] });
  S.diff = 1; S.endless = true; S.teams[1].ai = false; S.teams[0].ore += 3000;
  const bdir = (FAC82.sites.tun82 && FAC82.sites.tun82(0)) || BASES[0];
  const bur = makeBuilding('tun82', 0, bdir, null); bur.built = 1; bur.done = true; bur.hp = bur.maxhp;
  const foe = S.hq[1].alive ? S.hq[1].pos : mul(BASES[1], RM);
  const ex = TUN82.planExit(bur, { pos: foe }) || offsetOnSphere(TUN82.mouthDir(bur), tangent(sub(foe, bur.pos), bur.up), 150);
  TUN82.startDig(bur, ex); bur.queue = ['tdig82']; bur.prodT = 99; finishProduct(bur, 'tdig82');
  const m = TUN82.mouth(bur), md = TUN82.mouthDir(bur);
  const tk = []; for (let i = 0; i < 2; i++){ const v = makeTank(surfacePoint(offsetOnSphere(md, bur.fwd, 50 + i * 8), 1.5), 0); v.order = 'idle'; tk.push(v); }
  const side = norm(cross(bur.up, bur.fwd)); const inc = makeBuilding('asm83s', 0, offsetOnSphere(offsetOnSphere(bdir, bur.fwd, 30), side, 30), null); inc.built = 1; inc.done = true; inc.hp = inc.maxhp;
  const boss = BOSS83.spawn(inc, 's');
  const all = [...tk, boss], went = new Set(), first = {};
  const s0 = Object.assign({}, T24.stats); T24.log = [];
  let last = boss.pos, lastT = 0, worst = 0;
  for (let t = 0; t < 200 && !S.over; t += 0.1){
    update(0.1);
    for (const v of all) if (v.tun82 && !went.has(v)){ went.add(v); first[v.boss83 ? 'boss' : 'tank' + tk.indexOf(v)] = Math.round(t); }
    if (boss.alive){
      if (dist(boss.pos, last) > 3 || boss.tun82 || !boss.goal || dist(boss.pos, boss.goal) < 60){ last = boss.pos; lastT = t; }
      worst = max(worst, t - lastT);
    }
    if (t > 1 && t < 1.15) var at1 = { boss: !!boss.t84, tanks: tk.filter(v => v.t84).length };
    if ((t * 10 | 0) % 300 === 0) await sleep(0);
  }
  const d = {}; for (const k of Object.keys(T24.stats)) d[k] = T24.stats[k] - (s0[k] || 0);
  R.push({ on, open: TUN82.isOpen(bur), cut: Math.round(surfDist(inc.pos, foe) - surfDist(TUN82.mouth(TUN82.exitOf(bur) || bur), foe)), first, tanksThrough: tk.filter(v => went.has(v)).length,
    bossThrough: went.has(boss), bossAlive: boss.alive, bossStuckMax: Math.round(worst), watch: d.watch, dive: d.dive, escort: d.escort, err: Object.keys(FAC82.err || {}), log: T24.log.slice(0, 6), at1 });
}
T24.on = true;
requestAnimationFrame = window.requestAnimationFrame; 
return R;
