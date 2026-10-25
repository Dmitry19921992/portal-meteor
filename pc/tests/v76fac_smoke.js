// v7.6 factions/craters/tpv — smoke on PC: faction screen, both factions, craters, 3rd person
const O = 'D:/AI/pm_v6/shots_v76fac/';
const out = { errs }; DEN75.set(0); await sleep(1500);
out.boot = { menu: MENU.cur, fac: SET.fac76, cr: CR76.on, u: !!SCENE.U.uNCr76, uf: !!SCENE.U.uFac76 };
await shot(O + 'pc_menu.jpg');
// 1. экран выбора фракции
document.getElementById('m_play').click(); await sleep(400);
out.facScreen = { cur: MENU.cur, cards: document.querySelectorAll('[data-fac76]').length };
await shot(O + 'pc_faction_screen.jpg');
document.querySelector('[data-fac76="1"]').click(); await sleep(300);
out.picked = { set: SET.fac76, saved: JSON.parse(localStorage.getItem('pm_settings')).fac76 };
await shot(O + 'pc_faction_swarm.jpg');
document.getElementById('m_fac76go').click(); await sleep(5000);
if (MENU.cur) MENU.close(); S.paused = false;
const me = S.me;
out.swarm = { F: FAC76_F.slice(), me: me && me.cls, hp: me && me.maxhp, walk: me && +me.walk.toFixed(2), tank0: S.vehicles.filter(v => v.team === 0).map(v => v.hp), tank1: S.vehicles.filter(v => v.team === 1).map(v => v.hp),
  team0: teamName(0), team1: teamName(1), feed: S.feed.slice(-3).map(f => f.text), trSample: tr('Штаб Роя уничтожен', 'Swarm HQ destroyed') };
await sleep(1500); await shot(O + 'pc_swarm_fps.jpg');
enterRTS(); await sleep(2500); await shot(O + 'pc_swarm_rts.jpg');
out.swarmRTS = { packBtn: !!document.querySelector('[data-ux="prod:pack76"]'), rhinoHidden: (() => { const b = document.querySelector('[data-ux="prod:rhino76"]'); return !b || b.style.display === 'none'; })() };
S.selB = S.hq[0]; await sleep(800);
out.canPack = canProduce(0, 'pack76'); out.canRhino = canProduce(0, 'rhino76');
enterFPS(); await sleep(500);
// 2. Консорциум
MENU.toMenu(); await sleep(800);
SET.fac76 = 0; MENU.save(); MENU.newGame(); await sleep(4000); if (MENU.cur) MENU.close(); S.paused = false;
out.cons = { F: FAC76_F.slice(), hp: S.me && S.me.maxhp, walk: S.me && +S.me.walk.toFixed(2), team0: teamName(0), tank0: S.vehicles.filter(v => v.team === 0).map(v => v.hp) };
await shot(O + 'pc_cons_fps.jpg');
// 3. воронки: «Град» бьёт по земле перед бойцом, боец идёт в воронку
const u = S.me, up = norm(u.pos), fw = tangent(u.fwd, up);
const tp = surfacePoint(offsetOnSphere(up, fw, 14), 0.2);
const g0 = groundR(norm(tp));
for (let k = 0; k < 3; k++){ splash(add(tp, mul(randUnit(), 0.8)), 1, 110, 7, null, 'a'); fxExplosion(tp, 3); await sleep(300); }
const g1 = groundR(norm(tp));
out.crater = { n: CR76.n, stats: CR76.stats, before: +(g0 - RM).toFixed(2), after: +(g1 - RM).toFixed(2), depth: +(g0 - g1).toFixed(2), L: CR76.L.map(c => [+c.r.toFixed(2), +c.D.toFixed(2)]) };
// малое оружие — без воронок
const n0 = CR76.stats.made + CR76.stats.merged; splash(offsetOnSphere(up, fw, -20).map(x => x * RM), 1, 30, 2, null, 'b'); out.smallNoCrater = CR76.stats.made + CR76.stats.merged === n0;
await sleep(1200);
S.camOverride = { pos: add(add(u.pos, mul(up, 9)), mul(fw, -4)), look: tp }; await sleep(2500); await shot(O + 'pc_crater_view.jpg'); S.camOverride = null;
// боец идёт в центр воронки
const dir0 = norm(tp); let minR = 1e9, gr = 0;
for (let i = 0; i < 160; i++){
  const w = tangent(sub(tp, u.pos), norm(u.pos)); u.fwd = w;
  keys.KeyW = true; await sleep(50); minR = min(minR, len(u.pos)); if (u.grounded) gr++;
  if (surfDist(u.pos, tp) < 0.8) break;
}
keys.KeyW = false;
out.walk = { distToCenter: +surfDist(u.pos, tp).toFixed(2), alt: +(len(u.pos) - groundR(norm(u.pos))).toFixed(2), r: +(len(u.pos) - RM).toFixed(2), grounded: u.grounded, groundedFrames: gr, minR: +(minR - RM).toFixed(2) };
await sleep(800); await shot(O + 'pc_in_crater.jpg');
// 4. 3-е лицо: боец и техника
IN.key('KeyV'); await sleep(1500);
out.tpvInf = { third: S.third, set: SET.tpv76 }; await shot(O + 'pc_tpv_trooper.jpg');
IN.key('KeyV'); await sleep(500);
const tank = S.vehicles.find(v => v.team === 0 && !v.vk);
if (tank){ takeControl(tank); SET.vehView = 'tp'; await sleep(2500); out.tpvVeh = { fp: FPS61.vehFP(tank), camD: +dist(S.cam.pos, tank.pos).toFixed(1) }; await shot(O + 'pc_tpv_tank.jpg'); SET.vehView = 'fp'; }
out.fps = +fpsVal.toFixed(1);
out.errs = errs.slice(0, 12);
return out;

