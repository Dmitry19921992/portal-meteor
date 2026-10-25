// v7.5 релиз: кино-сплитскрин (из главного меню, как «🛠 Разработчик» → «Кино») — Денди, 3D-модели, 16-бит, выход
const out = {};
const O = 'D:/AI/pm_v6/shots75rel/';
const info = () => ({ style: SET.denStyle, user: SET.denUser, auto: SET.denAuto, active: DEN75.active(), cv: canvas.width + 'x' + canvas.height, css: canvas.style.width + ' ' + canvas.style.height, as75: SET.as75, fps: +fpsVal.toFixed(1) });
if (!S.attract){ MENU.toMenu(); await sleep(3000); }
SET.as75 = true; DEN75.set(1); await sleep(800);
out.menu = info();
AU.init(); CINE75.split = true; CINE75.save(); OPER.begin({ aspect: '16:9' }); await sleep(9000);
out.cineDendy = Object.assign(info(), { on: CINE75.on(), views: (CINE75.views() || []).map(v => [v.x, v.w, v.rx]) });
await shot(O + 'cine_split_dendy.jpg');
CINE75.act('preset'); await sleep(10000);
out.cinePreset = { b: S.buildings.length, v: S.vehicles.length, as75: AS75.info() };
await shot(O + 'cine_split_dendy_built.jpg');
DEN75.set(0); await sleep(6000);
out.cineNormal = Object.assign(info(), { views: (CINE75.views() || []).map(v => [v.x, v.w, v.rx]), as75: AS75.info() });
await shot(O + 'cine_split_3d.jpg');
DEN75.set(2); await sleep(5000); await shot(O + 'cine_split_16bit.jpg'); out.cine16 = info();
CINE75.act('split'); await sleep(3000); out.classic = Object.assign(info(), { views: !!CINE75.views() }); await shot(O + 'cine_classic_16bit.jpg'); CINE75.act('split');
// авто-Денди в кино не включается: стиль не выбран игроком
SET.denUser = false; SET.denAuto = 'igpu'; SET.denStyle = 1; applySettings(); await sleep(2500);
out.cineAuto = info(); await shot(O + 'cine_split_autodendy_off.jpg');
CINE75.act('exit'); await sleep(2000);
out.afterCine = Object.assign(info(), { menu: MENU.cur, oper: OPER.on });
await shot(O + 'menu_after_cine.jpg');
DEN75.set(0); SET.denUser = false; SET.denAuto = 0; SET.as75 = false; applySettings(); MENU.save();
out.errs = errs.slice(0, 12);
return out;
