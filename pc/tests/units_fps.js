// FPS: обычный бой (~125 роботов) с 8 новыми машинами в кадре против того же без них (реальный рендер)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && SCENE) break; await sleep(1000); }
MENU.newGame(); await sleep(1500);
for (const e of document.body.children) if (e.id !== 'c') e.style.visibility = 'hidden';
S.autoRes = false; S.scale = 0.75; resize(); S.quality = 2;
// добираем армии до ~125 роботов
for (const t of [0, 1]) for (let k = 0; k < 12; k++) spawnSquad(t);
const me = S.me, up = norm(me.pos), f = tangent(me.fwd, up), r = norm(cross(f, up));
const extra = [];
['raider', 'mlrs', 'cat', 'raider'].forEach((vk, i) => [0, 1].forEach(team => {
  const p = surfacePoint(norm(add(add(me.pos, mul(f, 22 + team * 10)), mul(r, (i - 1.5) * 9))), 1.5);
  const v = V2.make(p, team, vk); v.manualUntil = 1e9; v.order = 'hold'; v.goal = v.pos; extra.push(v);
}));
S.third = true;
const measure = async () => { const t0 = performance.now(); let n = 0; while (performance.now() - t0 < 6000){ await new Promise(r => requestAnimationFrame(r)); n++; } return +(n * 1000 / (performance.now() - t0)).toFixed(1); };
await sleep(1500);
const withV = await measure();
const objWith = renderList.length, vkInList = renderList.filter(o => o.e.vk).length;
for (const v of extra) v.alive = false; S.vehicles = S.vehicles.filter(v => v.alive);
await sleep(800);
const without = await measure();
return { robots: S.units.length, fpsWith: withV, fpsWithout: without, objWith, vkInList, canvas: [canvas.width, canvas.height] };
