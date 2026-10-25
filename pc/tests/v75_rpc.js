// v7.5 ПК: меню (главное, разработчик, версии, обучение), ядро убрано, пауза/панель разработчика, стройка/тайник/ползком/метка
const out = {};
const groundH75 = () => { let t = RM + 80; for (let i = 0; i < 80; i++){ const d = mapStatic(t, 0, 0); if (abs(d) < 0.05) break; t -= d * 0.8; } return t - RM; };
const tg = 'D:/AI/pm_v6/shots75rel/t/v75_' + (PH ? 'ph' : 'pc') + '_';
const ids = () => [...document.querySelectorAll('#screen button')].map(b => (b.id || b.dataset.t72go || b.dataset.v75 || b.dataset.t72o || '') + ':' + b.textContent.trim().slice(0, 28));
await shot(tg + 'menu.jpg');
out.mainBtns = ids().filter(s => /dev|ver75|cinema|tutorial/.test(s));
document.getElementById('m_tutorial').click(); await sleep(400); out.tutNormal = [...document.querySelectorAll('[data-t72go]')].map(b => b.dataset.t72go); out.othersBtn = !!document.querySelector('[data-t72o]'); await shot(tg + 't72.jpg');
MENU.show('main'); await sleep(200);
document.getElementById('m_dev').click(); await sleep(400); out.devScreen = MENU.cur; out.devBtns = ids(); await shot(tg + 'dev75.jpg');
document.getElementById('m_d75tut').click(); await sleep(400); out.tutDev = [...document.querySelectorAll('[data-t72go]')].map(b => b.dataset.t72go); await shot(tg + 't72dev.jpg');
MENU.show('main'); await sleep(200);
document.getElementById('m_ver75').click(); await sleep(400); out.verScreen = MENU.cur; out.verRows = [...document.querySelectorAll('[data-v75]')].map(b => b.dataset.v75); await shot(tg + 'ver75.jpg');
MENU.show('main'); await sleep(200);
// ядро и шахты: точки бывшей шахты и ядра — внутри скалы
out.core = { cps: S.cps.length, shaft: +mapStatic(RM - 30, 0, 0).toFixed(2), core: +mapStatic(0, 10, 0).toFixed(2), under: underground([RM - 30, 0, 0]), axes: AXES.length };
// новый матч разработчика
DEV.start(); await sleep(2500);
out.dev = { on: DEV.on, match: DEV.match };
// камера над бывшим устьем шахты (+X)
{ const g = RM + groundH75(); S.camOverride = { pos: [g + 70, 60, 20], look: [g, 0, 0] }; await sleep(1500); await shot(tg + 'shaftmouth.jpg'); S.camOverride = null; }
// пауза: одна кнопка «Разработчик»
MENU.pause(); await sleep(300); out.pause = ids().filter(s => /dev/.test(s)); await shot(tg + 'pause.jpg');
document.getElementById('m_devars').click(); await sleep(500); out.panel = { open: DEV.open, html: (document.getElementById('devPan') || {}).innerText.slice(0, 300) }; await shot(tg + 'devpanel.jpg');
DEV.panel(false); MENU.close(); S.paused = false; MENU.waitLock = false; DEV.instant = false; await sleep(200);
// стройка солдатом: ставим турель рядом и E
const me = S.me;
const dir = norm(add(me.pos, mul(tangent(me.fwd, me.up), 7)));
const b = makeBuilding('turret', 0, dir); b.built = 0.05;
await sleep(300);
const nh = nearbyInteract(me); out.buildHint = nh && nh.text;
interact(); await sleep(4000);
out.build = { going: !!FIELD75.build, built: +b.built.toFixed(3), done: b.done };
await shot(tg + 'build.jpg');
FIELD75.build = null;
// тайник: ставим бойца к ближайшему контейнеру
const cp = PROPS.filter(p => p.cache75 && p.alive).sort((a, c) => dist(a.pos, me.pos) - dist(c.pos, me.pos))[0];
if (cp){ me.pos = surfacePoint(norm(add(cp.pos, mul(cp.R, (cp.bound || 6) + 1.5))), 1); me.vel = [0, 0, 0]; await sleep(500); const h2 = nearbyInteract(me); out.cacheHint = h2 && h2.text; await shot(tg + 'cache_near.jpg'); interact(); await sleep(300); out.cache = { left: cp.cache75, w: S.kit.w, hmgT: S.kit.hmgT, inc: S.kit.incT, rockets: S.kit.freeRockets }; }
// ползком
const eye0 = S.cam.pos.slice();
await IN.key('ControlLeft', 60); await sleep(900);
out.prone = { on: FIELD75.prone, k: +FIELD75.proneK.toFixed(2), eyeDrop: +(dot(sub(eye0, S.cam.pos), norm(S.me.pos))).toFixed(2) };
await shot(tg + 'prone.jpg');
await IN.key('ControlLeft', 60); await sleep(600); out.prone2 = FIELD75.prone;
// метка стратега: враги рядом
const foe = spawnSquad(1, false, surfacePoint(norm(add(S.me.pos, mul(tangent(S.me.fwd, S.me.up), 60))), 1.5), 4);
for (const u of foe.units) u.seen[0] = 5;
FIELD75.markT = 0; await sleep(600);
out.marks = FIELD75.marks.length; await sleep(1500); await shot(tg + 'mark.jpg');
out.stats = { q: STATS75.q.map(e => e.e), ep: STATS75.endpoint(), sent: STATS75.sent };
MENU.show('settings'); await sleep(300); out.statsRow = !!document.querySelector('[data-p74tog="stats75"]'); await shot(tg + 'settings.jpg'); MENU.close();
out.errs = errs.slice(0, 12);
return out;
