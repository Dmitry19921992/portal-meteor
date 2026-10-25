// v7.5 релиз (v75rel = v75 + dendy + assets): авто-Денди, обычный матч, кино-сплитскрин с Денди и с 3D-моделями
const out = {};
const O = 'D:/AI/pm_v6/shots75rel/';
const info = () => ({ style: SET.denStyle, user: SET.denUser, auto: SET.denAuto, active: DEN75.active(), cv: canvas.width + 'x' + canvas.height, as75: SET.as75, fps: +fpsVal.toFixed(1) });
out.gpu = DEN75.gpu(); out.weak = DEN75.weakGPU();
out.boot = info();
await shot(O + 'pc_menu.jpg');
// 1. матч с настройками по умолчанию (на Intel UHD — авто-Денди)
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(6000);
if (MENU.cur) MENU.close(); S.paused = false;
out.matchAuto = info(); out.feed = S.feed.map(f => f.text).filter(t => /Денди|Dendy/.test(t));
await shot(O + 'pc_match_auto.jpg');
// 2. игрок выбирает «Обычный» — выбор приоритетнее и запоминается
DEN75.set(0); await sleep(3000);
out.matchNormal = info(); out.saved = JSON.parse(localStorage.getItem('pm_settings') || '{}').denUser;
await shot(O + 'pc_match_normal.jpg');
enterRTS(); await sleep(2500); await shot(O + 'pc_rts_normal.jpg'); enterFPS(); await sleep(800);
// 3. 3D-модели окружения (по умолчанию выкл) — включаем, камера у руины
SET.as75 = true; applySettings(); MENU.save(); await sleep(500);
AS75.placeStep(1e9);
const it = AS75.near(S.me.pos, 1, 'ruin')[0] || AS75.items[0];
if (it){
  S.camOverride = { pos: add(it.cen, add(mul(anyTangent(it.Y), it.rr * 2.4 + 6), mul(it.Y, it.rr * 0.8 + 4))), look: it.cen };
  for (let i = 0; i < 60 && !(AS75.M[it.key + '_lod0'] && AS75.M[it.key + '_lod0'].st === 2); i++) await sleep(200);
  await sleep(1200); await shot(O + 'pc_3d_normal.jpg');
  DEN75.set(1); await sleep(2500); await shot(O + 'pc_3d_dendy.jpg');
  S.camOverride = null;
}
out.as75 = AS75.info();
// 4. кино-сплитскрин: Денди + 3D-модели, обе половины
AU.init(); OPER.begin({ aspect: '16:9' }); await sleep(8000);
out.cineDendy = Object.assign(info(), { on: CINE75.on(), views: (CINE75.views() || []).map(v => [v.x, v.w, v.rx]), css: canvas.style.width + ' ' + canvas.style.height });
await shot(O + 'cine_split_dendy.jpg');
CINE75.act('preset'); await sleep(9000);
out.cinePreset = { b: S.buildings.length, v: S.vehicles.length, as75drawn: AS75.stats.drawn };
await shot(O + 'cine_split_dendy_built.jpg');
DEN75.set(0); await sleep(5000);
out.cineNormal = Object.assign(info(), { views: (CINE75.views() || []).map(v => [v.x, v.w, v.rx]), as75drawn: AS75.stats.drawn });
await shot(O + 'cine_split_3d.jpg');
DEN75.set(2); await sleep(4000); await shot(O + 'cine_split_16bit.jpg'); out.cine16 = info();
CINE75.act('split'); await sleep(3000); out.classic = { views: !!CINE75.views(), active: DEN75.active() }; await shot(O + 'cine_classic_16bit.jpg'); CINE75.act('split');
CINE75.act('exit'); await sleep(1500);
out.afterCine = Object.assign(info(), { menu: MENU.cur, oper: OPER.on, css: canvas.style.width });
DEN75.set(0); SET.as75 = false; applySettings(); MENU.save();
out.errs = errs.slice(0, 12);
return out;
