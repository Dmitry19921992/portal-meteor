const R = []; window.requestAnimationFrame = () => 0; await sleep(250);
newMatch({ attract: true, fac76: [0, 1] }); S.diff = 1; S.endless = true;
const log = [];
for (let t = 0; t < 700 && !S.over; t += 0.1){
  update(0.1);
  if ((t * 10 | 0) % 150 === 0){
    const L = TUN82.list(1);
    if (L.length) log.push({ t: Math.round(t), ore: Math.round(S.teams[1].ore), cost: pCost(1, 'tdig82'), b: L.map(b => { const tg = TUN82.target(1, TUN82.mouthDir(b)); const dir = tg && TUN82.planExit(b, tg);
      return { done: b.done, st: TUN82.st(b).st, q: b.queue.slice(0, 3), tg: tg ? tg.k + ':' + Math.round(surfDist(TUN82.mouthDir(b), tg.pos)) : null, plan: !!dir }; }) });
  }
  if ((t * 10 | 0) % 400 === 0) await sleep(0);
}
requestAnimationFrame(frame);
return { over: S.over, time: Math.round(S.time), log: log.slice(0, 40) };
