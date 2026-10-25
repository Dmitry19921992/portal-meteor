// v7.4: взрывчатка, снег, переговоры по рации
SET.lang = 'ru'; applySettings(); MENU.applyLang();
MENU.newGame(); await sleep(4000);
if (!PH){ lockMouse && lockMouse(); }
await sleep(1500);
await shot(PH ? 'D:/AI/pm_v6/shots/v74_fx_snow_ph.jpg' : 'D:/AI/pm_v6/shots/v74_fx_snow.jpg');
ok('atm', ATM74.fl.length > 0, ATM74.fl.length);
// рация
const vp0 = VOICE66.played; CHAT74.t = 0; await sleep(1500); ok('chatter', VOICE66.played > vp0, [vp0, VOICE66.played]);
// взрывчатка у здания Роя
let b = S.buildings.find(x => x.team === 1 && x.alive) || S.hq[1];
const me = S.me;
const pB = b.pos, up = norm(pB), side = anyTangent(up);
const rr = b.cls === 'hq' ? 18 : (BTYPES[b.type] ? BTYPES[b.type].rad : 3) + 2;
me.pos = surfacePoint(norm(add(pB, mul(side, rr))), 0.3); me.vel = [0, 0, 0];
await sleep(200);
ok('tntTarget', TNT74.target(me) === b, [b.type || b.cls, dist(me.pos, pB)]);
const hp0 = b.hp, n0 = TNT74.n;
if (PH){ await sleep(300); const c = cen('#m74tnt'); ok('tntBtn', !!c); if (c) await T.tap(c[0], c[1]); }
else await IN.key('KeyJ', 60);
await sleep(300);
ok('planted', TNT74.n === n0 - 1 && TNT74.list.length === 1, [TNT74.n, TNT74.list.length]);
me.pos = surfacePoint(norm(add(pB, mul(side, rr + 30))), 0.3);
await sleep(5600);
ok('tntDamage', b.hp < hp0 - 300 || !b.alive, [hp0, b.hp, b.alive]);
await shot(PH ? 'D:/AI/pm_v6/shots/v74_fx_tnt_ph.jpg' : 'D:/AI/pm_v6/shots/v74_fx_tnt.jpg');
ok('no_console_errors', errs.length === 0, errs.slice(0, 4));
return R;
