// v61rts: стоимость нового наложения стратегии при большой армии + FPS (headless на общей GPU — ориентир)
const nap = ms => new Promise(r => setTimeout(r, ms));
if (!S.me || S.attract){ MENU.newGame(); await nap(2500); }
S.paused = false;   // update() при паузе не идёт; цикл синхронный — кадры не вмешиваются
const cnt = () => S.units.filter(u => u.alive).length + S.vehicles.filter(v => v.alive).length + S.drones.filter(d => d.alive).length + S.builders.filter(b => b.alive).length;
let simT = performance.now(), steps = 0;
while (cnt() < 125 && steps < 30 * 420){ update(1 / 30); steps++; }
simT = (performance.now() - simT) / max(1, steps);
if (S.mode !== 'rts') enterRTS();
S.paused = false;
const res = { robots: cnt(), simulated_s: Math.round(steps / 30), sim_ms_per_step: +simT.toFixed(2) };
for (const [h, lab] of [[45, 'sel'], [140, 'sel'], [140, 'all'], [260, 'all']]){
  S.rts.h = S.rts.hT = h; R61.pref.labels = lab; S.sel.clear(); for (const g of groupsOf(0).slice(0, 6)) S.sel.add(g);
  await nap(400);
  let t0 = performance.now(); for (let i = 0; i < 40; i++){ octx.save(); drawRTSOverlay(1 / 60); octx.restore(); } const ov = (performance.now() - t0) / 40;
  t0 = performance.now(); for (let i = 0; i < 40; i++){ octx.save(); r61Badges(new Set(selGroups()), 1 / 60); octx.restore(); } const bd = (performance.now() - t0) / 40;
  let n = 0; const f0 = performance.now(); await new Promise(r => { const f = () => { n++; if (performance.now() - f0 < 2500) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  res[`h${h}_${lab}`] = { overlay_ms: +ov.toFixed(3), badges_ms: +bd.toFixed(3), fps_headless: Math.round(n / 2.5) };
}
R61.pref.labels = 'sel'; S.sel.clear();
return res;
