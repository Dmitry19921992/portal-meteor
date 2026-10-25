// v61rts: кадр стратегии для скриншота. Параметры через window.SHOT = { h, sel, wait, sim }
const nap = ms => new Promise(r => setTimeout(r, ms));
const P = Object.assign({ h: 60, sel: 'army', wait: 1500, sim: 20, alt: false }, window.SHOT || {});
if (!S.me || S.attract){ MENU.newGame(); await nap(2500); }
if (P.sim && !window.__simmed){ window.__simmed = 1; S.paused = false; for (let i = 0; i < P.sim * 30; i++) update(1 / 30); }
if (S.mode !== 'rts') enterRTS();
await nap(200);
S.sel.clear(); S.selB = null;
const G = groupsOf(0);
if (P.sel === 'army') for (const g of G.slice(0, 3)) S.sel.add(g);
else if (P.sel === 'builder') S.sel.add(teamBuilders(0)[0]);
const L = G[0] && leaderPos(G[0]);
if (P.look === 'army' && L) rtsLookAt(L); else if (P.look === 'base') rtsLookAt(S.hq[0].pos);
S.rts.h = S.rts.hT = P.h; RCAM.blend = null;
if (P.alt) R61.alt = true;
if (P.more){ const m = document.querySelector('#card [data-more]'); if (m) m.click(); }
await nap(P.wait);
R61.alt = false;
return { h: S.rts.h, sel: S.sel.size, groups: G.length, units: S.units.filter(u => u.alive).length, veh: S.vehicles.filter(v => v.alive).length, b: S.builders.filter(b => b.alive).length };
