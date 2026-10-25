// v7.5 релиз: кино-сплитскрин с 3D-моделями окружения — бот-шутер и камера стратега у руины (обычный стиль и Денди)
const out = {};
const O = 'D:/AI/pm_v6/shots75rel/';
if (!S.attract){ MENU.toMenu(); await sleep(2000); }
SET.as75 = true; DEN75.set(0); await sleep(500);
AU.init(); CINE75.split = true; OPER.begin({ aspect: '16:9', title: false }); await sleep(3000);
AS75.placeStep(1e9);
const it = AS75.items.filter(i => i.e.p === 'ruin').sort((a, b) => b.rr - a.rr)[0];
const u = S.units.find(x => x.alive && x.team === 0 && x.cls === 'inf');
const side = anyTangent(it.dir);
const place = () => { u.pos = surfacePoint(offsetOnSphere(it.dir, side, it.rr * 1.6 + 14), 1); u.vel = [0, 0, 0]; u.target = null; };
place();
// шутер смотрит на руину (камера бота-шутера, чуть выше глаз)
const cs0 = CINE75.camShooter;
CINE75.camShooter = function(dt){ const c = cs0.call(this, dt); if (!c) return c; place(); const up = norm(u.pos); const eye = add(u.pos, mul(up, RULES.EYE + 1.2)); return Object.assign({ pos: eye, fov: c.fov }, camBasis(norm(sub(add(it.cen, mul(up, -1)), eye)), up)); };
CINE75.sh = { u, t: 0, fwd: null, bob: 0, ph: 0 };
CINE75.st = { kind: 'army', t: 0, dur: 1e9, f: it.dir, ang: 0.7, H: 55, pos: null, look: null };
await sleep(7000);
out.normal = { info: AS75.info(), views: (CINE75.views() || []).map(v => [v.x, v.w]), d: Math.round(dist(it.cen, CINE75.cF.pos)), key: it.key };
await shot(O + 'cine_split_3d.jpg');
DEN75.set(1); await sleep(4000);
out.dendy = { info: AS75.info(), active: DEN75.active(), cv: canvas.width + 'x' + canvas.height };
await shot(O + 'cine_split_3d_dendy.jpg');
CINE75.camShooter = cs0;
CINE75.act('exit'); await sleep(1000);
DEN75.set(0); SET.denUser = false; SET.as75 = false; applySettings(); MENU.save();
out.errs = errs.slice(0, 8);
return out;
