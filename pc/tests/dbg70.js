const R = {};
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1200);
DEV.enter(); await sleep(200); DEV.on = false;
DEV.outpost70('sup'); const b = DEV.op70; b.tw70.tier = 1;
const u = S.units.find(x => x.alive && x.team === 0 && x !== ctrlEntity()); u.pos = surfacePoint(norm(add(b.pos, mul(b.fwd, 12)))); u.hp = u.maxhp * 0.4; u.squad.order = 'hold'; u.squad.goal = u.pos; u.squad.manualUntil = 1e9;
const h0 = u.hp;
for (let i = 0; i < 40; i++){ u.lastHurt = S.time; await sleep(100); }
const g = BASE70.g70(b);
R.h = [h0, u.hp, u.maxhp, u.role, dist(u.pos, b.pos)];
R.dr = (g.drones || []).map(d => ({ tg: d.tg && (d.tg.cls + ':' + (d.tg.type || d.tg.role) + ':' + (d.tg.hp / d.tg.maxhp).toFixed(2) + ':' + dist(d.tg.pos, b.pos).toFixed(0)), beam: d.beam, dd: d.tg ? dist(d.pos, centerOf(d.tg)).toFixed(1) : null, isU: d.tg === u }));
return R;
