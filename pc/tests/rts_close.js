// крупный план: инженеры Консорциума строят мехзавод, рядом «сборщик-паук» Роя (для сравнения моделей)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(1000); }
MENU.newGame(); if (TUT.on) TUT.finish(); enterRTS();
S.teams[0].ai = false; S.teams[1].ai = false; S.teams[0].ore = 3000;
makeBuilder(0);
const dir = findSite(0, 'factory');
const bs = teamBuilders(0);
for (const b of bs) b.pos = surfacePoint(offsetOnSphere(dir, randUnit(), 14), ECO.HOVER);
S.sel.clear(); for (const b of bs) S.sel.add(b);
playerPlace('factory', dir, false);
const site = S.lastSite;
const foe = makeBuilder(1, surfacePoint(offsetOnSphere(dir, site.R, -16), ECO.HOVER));
foe.order = 'hold';
for (let i = 0; i < 30 * 5; i++) update(1 / 30);
foe.pos = surfacePoint(offsetOnSphere(dir, site.R, -13), ECO.HOVER); foe.fwd = tangent(site.R, foe.up);
const cam = offsetOnSphere(dir, site.R, -11);
rtsLookAt(cam); S.camFly = null; S.rts.h = 10; S.rts.fwd = tangent(add(site.R, mul(site.fwd, 0.6)), S.rts.dir);
foe.seen[0] = 50; S.sel.clear(); for (const b of bs) S.sel.add(b);
for (let i = 0; i < 5; i++) update(1 / 30);
S.paused = true;
await sleep(800);
return { built: site.built.toFixed(2), b: bs.map(b => b.order) };
