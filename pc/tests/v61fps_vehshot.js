// вселиться в технику вида window.VK ('tank'|'raider'|'mlrs'|'cat'|'drone') для скриншота (вид из кабины)
if (S.attract || !S.me){ MENU.newGame(); await new Promise(r => setTimeout(r, 2000)); }
MENU.close(); S.paused = false; MENU.waitLock = false;
const k = window.VK || 'tank';
let v = k === 'drone' ? S.drones.find(d => d.team === 0 && d.alive) : S.vehicles.find(x => x.team === 0 && x.alive && (k === 'tank' ? !x.vk : x.vk === k));
const base = S.units.find(u => u.team === 0 && u.alive && !u.parked) || S.me;
if (!v){ const Up = norm(base.pos), F = tangent(base.fwd, Up); const p = surfacePoint(norm(add(base.pos, mul(F, -10))), 1.5);
  v = k === 'drone' ? makeDrone(add(p, mul(Up, 8)), 0) : k === 'tank' ? makeTank(p, 0) : V2.make(p, 0, k); v.fwd = tangent(F, v.up); v.aim = v.fwd; }
takeControl(v); CAMFX.fly = null; SET.vehView = window.VV || 'fp';
await new Promise(r => setTimeout(r, 1800));
return { k, fp: FPS61.vehFP(v), fps: Math.round(fpsVal) };
