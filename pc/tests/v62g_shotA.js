// v62gren: кадр «держу гранату» — дуга, круг взрыва, HUD. Вызов 1: подготовка (держим G), затем cdp --shot
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && (MENU.cur || !S.attract)) break; } catch (e) {} await sleep(500); }
if (!S.me || S.attract || S.over){ MENU.newGame(); await sleep(3000); }
if (MENU.isOpen()) MENU.close();
S.paused = false; PROG.allUnlocked = true; PROG.unl.add('grenade'); SET.hintsOn = false;
const me = S.me, B = SET.bind;
{ const cl = document.getElementById('clicklock'); if (cl) cl.style.visibility = 'hidden'; const hi = document.getElementById('hint'); if (hi) hi.style.visibility = 'hidden'; }   // headless: мышь не захвачена; карточку подсказки прячем
const mode = window.__v62mode || 'hold';
const d = norm(add(BASES[0], mul(norm([0.3, 0, 0.2]), 0.25))), t0 = anyTangent(d), t1 = cross(d, t0);
keys[B.grenade] = false; G62.cancel(); mouseR = false; CAMFX.fly = null;
const yaw = window.__v62yaw || 3.2, pitch = mode === 'under' ? -0.3 : mode === 'far' ? 0.25 : -0.32;
const hz = add(mul(t0, Math.cos(yaw)), mul(t1, Math.sin(yaw)));
me.pos = surfacePoint(d, 0.6); me.vel = [0, 0, 0]; me.up = d; me.fwd = norm(add(mul(hz, Math.cos(pitch)), mul(d, Math.sin(pitch))));
me.hp = me.maxhp = 99999;
await sleep(400);
S.kit.gren = 2; S.kit.grenCd = 0;
if (mode === 'warn'){
  // вражеская граната катится к игроку
  const e = S.units.find(u => u.alive && u.team === 1);
  const side = norm(cross(hz, d));
  const p0 = add(add(add(me.pos, mul(hz, -3)), mul(side, 3)), mul(d, 1.5));   // сзади-справа, вне экрана
  G62.spawn(e, p0, add(mul(side, -1.5), mul(d, 1)), 2.5, 60, 5.5, e);
  const p1 = add(add(me.pos, mul(hz, 6)), mul(d, 1));                        // и одна впереди — видна на экране
  G62.spawn(e, p1, add(mul(hz, -1), mul(d, 1.5)), 2.5, 60, 5.5, e);
  await sleep(500);
  return { warn: S.proj.filter(p => p.g62 && p.team === 1).length };
}
keys[B.grenade] = true; G62.press();
if (mode === 'under') mouseR = true;
if (mode === 'power'){ G62.hold.power = 0.5; }
await sleep(700);
return { hold: !!G62.hold, pts: G62.path && G62.path.pts.length, dist: G62.path && +dist(me.pos, G62.path.end).toFixed(1), mode, perf: G62.perf };
