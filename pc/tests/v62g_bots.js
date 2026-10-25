// v62gren: боты бросают гранаты по тем же правилам (физика G62): точность попадания в точку, фитиль, урон
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && (MENU.cur || !S.attract)) break; } catch (e) {} await sleep(500); }
if (!S.me || S.attract || S.over){ MENU.newGame(); await sleep(2500); }
if (MENU.isOpen()) MENU.close(); S.paused = false; CAMFX.fly = null;
const out = {};
const step = n => { for (let i = 0; i < n; i++) update(1 / 60); };
// 1) прямой вызов throwGrenade у бота Роя: точка 10–35 м, место взрыва и время
const bot = S.units.find(u => u.alive && u.team === 1 && u.cls === 'inf');
const res = [];
for (const D of [10, 18, 26, 35]){
  const d0 = norm(bot.pos), t0 = anyTangent(d0);
  const pt = surfacePoint(norm(add(mul(d0, RM), mul(t0, D))), 0.2);
  const n0 = S.proj.length;
  throwGrenade(bot, pt, 70, 5.5);
  const p = S.proj[S.proj.length - 1];
  const ok = p && p.g62 === 1;
  let t = 0, last = p.pos;
  while (S.proj.includes(p) && t < 5){ last = p.pos; update(1 / 60); t += 1 / 60; }
  res.push({ D, g62: ok, fuse: +t.toFixed(2), miss: +dist(last, pt).toFixed(1) });
}
out.direct = res;
// 2) способность отряда «Гранаты» (useAbility) — броски тремя бойцами, всё взрывается
const g = S.squads.find(s => s.team === 1 && s.units.filter(u => u.alive).length >= 3);
if (g){
  g.abil = g.abil || {}; g.abil.grenade = 0;
  const L = leaderOf(g), d0 = norm(L.pos), t0 = anyTangent(d0);
  const pt = surfacePoint(norm(add(mul(d0, RM), mul(t0, 20))), 0.2);
  const before = S.proj.filter(p => p.g62).length;
  const why = useAbility(g, 'grenade', pt);
  const thrown = S.proj.filter(p => p.g62).length - before;
  let booms = 0; const ids = S.proj.filter(p => p.g62).map(p => p);
  step(60 * 3.2);
  out.ability = { why, thrown, left: ids.filter(p => S.proj.includes(p)).length };
}
// 3) урон: граната игрока рядом с ботом Роя
{
  const e = S.units.find(u => u.alive && u.team === 1 && u.cls === 'inf');
  e.hp = e.maxhp;
  const hp0 = e.hp;
  const p = G62.spawn(S.me, add(e.pos, mul(norm(e.pos), 1.2)), [0, 0, 0], 0.3, 85, 6, S.me);
  let minHp = e.hp;
  for (let i = 0; i < 30; i++){ update(1 / 60); minHp = Math.min(minHp, e.hp); }
  out.damage = { hp0, hpMin: Math.round(minHp), hp1: Math.round(e.hp), alive: e.alive, exploded: !S.proj.includes(p), d: +dist(p.pos, e.pos).toFixed(1) };
}
// 4) граната ударяется в робота — не взрывается, отскакивает
{
  const e = S.units.find(u => u.alive && u.team === 1 && u.cls === 'inf');
  const c = centerOf(e), d0 = norm(e.pos), t0 = anyTangent(d0);
  const from = add(c, mul(t0, -4));
  const p = G62.spawn(S.me, from, mul(t0, 12), 2.5, 85, 6, S.me);
  step(30);
  out.bounceUnit = { stillFlying: S.proj.includes(p), fuseLeft: +p.fuse.toFixed(2), passedThrough: dot(sub(p.pos, c), t0) > 1 };
}
return out;
