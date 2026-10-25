const sleep = ms => new Promise(r => setTimeout(r, ms));
MENU.newGame(); await sleep(3000);
const me = S.me; const out = {};
const Up = norm(me.pos), F = tangent(me.fwd, Up);
const sq = spawnSquad(1, false, add(me.pos, mul(F, 30)), 1, ['assault']); const tg = sq.units[0]; tg.parked = true;
for (let i = 0; i < 10; i++) update(1 / 60);
const eye = gunEye(me);
const d = norm(sub(add(tg.pos, mul(tg.up, 0.25)), eye));
const r = gunTrace(eye, d, 420, 0, { steps: 170 });
out.trace = { t: r.t, ent: r.ent && r.ent.cls, solid: r.solid, dist: dist(eye, tg.pos) };
// попробуем выстрел рельсы
PROG.unl.add('rail'); S.kit.w = 'rail'; S.kit.mag.rail = 5; S.kit.reloadT = 0; me.cd = 0; S.kit.trig = false; S.kit.charge = 0;
const hp0 = tg.hp; let log = [];
for (let i = 0; i < 40; i++){ me.fwd = d; S.me = me; CAMFX.fly = null; mouseL = true; update(1 / 60); log.push([S.kit.charge.toFixed(2), me.cd.toFixed(2), S.kit.mag.rail]); }
mouseL = false;
out.rail = { hp0, hp: tg.hp, alive: tg.alive, log: log.filter((x, i) => i % 4 === 0).join(' | ') };
tg.alive = false; S.units = S.units.filter(u => u.alive);
return out;
