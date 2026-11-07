// T24: натуральный бой, Рой = команда 1. Пока туннель открыт — раз в 8 с воронка фильтра кандидатов T24.ai.
const R = []; window.requestAnimationFrame = () => 0; await sleep(250);
const N = window.__n || 2, L = window.__len || 900;
for (let k = 0; k < N; k++){
  const s0 = Object.assign({}, T24.stats); T24.log = [];
  newMatch({ attract: true, fac76: [0, 1] }); S.diff = 1; S.endless = true;
  const F = { ticks: 0, openSec: 0, tanks: 0, ok: 0, free: 0, lock: 0, ordBad: 0, fight: 0, near: 0, dists: [] };
  let acc = 0;
  for (let t = 0; t < L && !S.over; t += 0.1){
    update(0.1);
    const B = TUN82.list(1).filter(b => TUN82.isOpen(b));
    if (B.length){ F.openSec += 0.1; acc += 0.1;
      if (acc >= 8){ acc = 0; F.ticks++;
        const m = TUN82.mouth(B[0]);
        for (const v of S.vehicles){ if (!v.alive || v.team !== 1 || v.cls !== 'tank') continue; F.tanks++;
          if (!TUN84.ok(v) || v.boss83) continue; F.ok++;
          if ((v.manualUntil || 0) >= S.time){ F.lock++; continue; }
          if (v.order === 'escort' || v.order === 'retreat'){ F.ordBad++; continue; }
          if (TGT[1].some(e => e.alive && dist(e.pos, v.pos) < 55)){ F.fight++; continue; }
          const d = surfDist(v.pos, m); F.dists.push(Math.round(d));
          if (d < min(220, max(60, (v.walk || 5) * 30))) F.near++;
        } } }
    if ((t * 10 | 0) % 400 === 0) await sleep(0);
  }
  F.openSec = Math.round(F.openSec); F.dists = F.dists.slice(0, 30);
  const d = {}; for (const q of Object.keys(T24.stats)) d[q] = T24.stats[q] - (s0[q] || 0);
  R.push({ over: !!S.over, time: Math.round(S.time), F, t24: d, err: Object.keys(FAC82.err || {}), log: T24.log.slice(0, 8) });
}
requestAnimationFrame(frame);
return R;
