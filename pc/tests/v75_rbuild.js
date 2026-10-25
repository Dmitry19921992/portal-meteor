// v7.5: стройка солдатом по E
const out = {};
MENU.close(); S.paused = false; MENU.waitLock = false; if (typeof DEV !== 'undefined') DEV.instant = false;
if (S.attract || !S.me){ MENU.newGame(); await sleep(2500); }
const me = S.me;
const dir = norm(add(me.pos, mul(tangent(me.fwd, me.up), 4.5)));
const b = makeBuilding('turret', 0, dir); b.built = 0.05;
await sleep(300);
out.near = FIELD75.siteNear(me) === b; out.dist = +(dist(b.pos, me.pos) - b.rad).toFixed(2);
const nh = nearbyInteract(me); out.hint = nh && nh.text;
interact(); await sleep(300); out.going = !!FIELD75.build;
await sleep(4000);
out.built = +b.built.toFixed(3); out.done = b.done;
await shot('D:/AI/pm_v6/shots75rel/t/v75_pc_build.jpg');
interact(); await sleep(200); out.stopped = !FIELD75.build;
// приказ стратега
FIELD75.order = null; FIELD75.orderT = 0; b.built = 0.1; me.pos = surfacePoint(norm(add(me.pos, mul(tangent(me.fwd, me.up), -60))), 1); await sleep(800);
out.order = FIELD75.order ? bname(FIELD75.order.b.type) : null;
await shot('D:/AI/pm_v6/shots75rel/t/v75_pc_order.jpg');
out.errs = errs.slice(0, 8);
return out;
