// отладка: куда ложатся ракеты рейдера по турели — профиль рельефа и траектории
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && SCENE) break; await sleep(1000); }
MENU.newGame(); await sleep(1200);
S.teams[0].ai = false; S.teams[1].ai = false;
const step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++){ update(1 / 60); if (fn && fn(i / 60) === true) return true; } return false; };
const cp = S.cps[0], up = cp.dir, t1 = anyTangent(up), t2 = cross(up, t1);
const at = (a, b, r) => surfacePoint(norm(add(add(mul(up, RM), mul(t1, a)), mul(t2, b))), r || 1.5);
for (const u of S.units) if (dist(u.pos, cp.pos) < 260) u.alive = false;
S.units = S.units.filter(u => u.alive); for (const sq of S.squads) sq.units = sq.units.filter(u => u.alive); S.squads = S.squads.filter(s => s.units.length);
const out = {};
const r = V2.make(at(-30, 60), 0, 'raider'); r.manualUntil = 1e9; r.order = 'hold'; r.goal = r.pos; r.cd = 0; r.hp = r.maxhp = 99999;
const tu = makeBuilding('turret', 1, norm(at(25, 60, 0))); tu.built = 1; tu.done = true; tu.hp = tu.maxhp = 99999;
step(2);
const c = bldCenter(tu);
// траектории первых ракет: высота над землёй по пути
const tr = new Map(); const paths = [];
r.cd = 0;
step(3, () => { for (const p of S.proj) if (p.from === r && p.type === 'r'){ if (!tr.has(p)) tr.set(p, []); tr.get(p).push(+(len(p.pos) - groundR(norm(p.pos))).toFixed(2)); } });
for (const [p, h] of tr) paths.push({ n: h.length, h: h.filter((x, i) => i % 3 === 0).join(' '), endD: +dist(p.pos, c).toFixed(1), endH: +(len(p.pos) - groundR(norm(p.pos))).toFixed(2) });
out.paths = paths;
const prof = []; for (let k = 0; k <= 10; k++){ const q = add(r.pos, mul(sub(c, r.pos), k / 10)); prof.push(+(len(q) - groundR(norm(q))).toFixed(1)); }
out.lineHeights = prof.join(' ');
out.raider = { grounded: r.grounded, upDot: +dot(r.up, norm(r.pos)).toFixed(3), aimDot: +dot(r.aim, norm(sub(c, r.pos))).toFixed(3), muzzleH: +(len(V2.muzzle(r, 0)) - groundR(norm(r.pos))).toFixed(2) };
out.turretDmg = Math.round(99999 - tu.hp);
return out;
