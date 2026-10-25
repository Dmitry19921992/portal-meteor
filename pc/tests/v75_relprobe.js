// probe: почему в кино 3D-модели окружения не рисуются
const out = {};
if (!S.attract){ MENU.toMenu(); await sleep(2000); }
SET.as75 = true; DEN75.set(0); await sleep(500);
AU.init(); CINE75.split = true; OPER.begin({ aspect: '16:9' }); await sleep(6000);
let calls = 0; const d0 = AS75.draw; AS75.draw = function(c, nl){ calls++; return d0.apply(this, arguments); };
await sleep(4000);
AS75.draw = d0;
out.calls = calls; out.info = AS75.info(); out.views = (CINE75.views() || []).map(v => [v.x, v.w]);
const cams = [CINE75.cS, CINE75.cF].filter(Boolean);
out.near = cams.map(c => AS75.items.map(it => dist(it.cen, c.pos)).sort((a, b) => a - b).slice(0, 3).map(x => Math.round(x)));
out.st70 = { ok: ST70.ok(), items: ST70.items.length };
// камера правой половины — у ближайшей модели
const it = AS75.near(CINE75.cF ? CINE75.cF.pos : S.units[0].pos, 1)[0];
out.nearest = it && { key: it.key, d: Math.round(dist(it.cen, CINE75.cF.pos)) };
CINE75.act('exit'); await sleep(1000);
out.errs = errs.slice(0, 8);
return out;
