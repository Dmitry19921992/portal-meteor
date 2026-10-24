// =====================================================================
//  v7.6 — ВИД ОТ ТРЕТЬЕГО ЛИЦА
//  Техника: «3-е лицо» (Настройки → «Техника: вид», V в машине) — камера за машиной с плавным
//  следованием (без тряски на кочках), индикатор «башня / корпус» остаётся, плюс метка точки попадания пушки.
//  Бойцы: V в бою (как раньше) теперь запоминается (SET.tpv76), камера через плечо плавная, а стрельба идёт
//  в точку под перекрестием (луч из камеры), а не параллельно ему. Телефон: Настройки → Управление → «Боец: вид».
//  По умолчанию выключено (как было).
// =====================================================================
if (SET_DEF.tpv76 === undefined) SET_DEF.tpv76 = false;
if (SET.tpv76 === undefined) SET.tpv76 = false;
const TPV76 = {
  pos: null, last: null, tgt: null, sync: false,
  on(){ const c = ctrlEntity(); return !!c && S.mode === 'fps' && !S.attract && c.cls === 'inf' && S.third && !S.freecam; },
  vehOn(c){ return !!c && S.mode === 'fps' && !S.attract && (c.cls === 'tank' || c.cls === 'drone') && !(typeof FPS61 !== 'undefined' && FPS61.vehFP(c)); },
};
{ const as0 = applySettings; applySettings = function(){ as0.apply(this, arguments); if (!S.attract) S.third = !!SET.tpv76; }; }
{ const tc0 = takeControl; takeControl = function(u){ const r = tc0.apply(this, arguments); if (!S.attract) S.third = !!SET.tpv76; return r; }; }
// V (ui.js переключает S.third) — запоминаем выбор
{ const uf0 = uixFrame;
  uixFrame = function(dt){
    uf0.apply(this, arguments);
    if (S.attract) return;
    if (S.third !== !!SET.tpv76){ const c = ctrlEntity(); if (c && c.cls === 'inf'){ SET.tpv76 = !!S.third; MENU.save(); } }
  }; }
// камера: плавное следование
{ const sc0 = setupCamera;
  setupCamera = function(dt){
    sc0.apply(this, arguments);
    const c = ctrlEntity(), cam = S.cam;
    if (!cam || S.camOverride || (typeof CAMFX !== 'undefined' && CAMFX.busy())){ TPV76.pos = null; return; }
    const inf = TPV76.on(), veh = !inf && TPV76.vehOn(c);
    if (!inf && !veh){ TPV76.pos = null; TPV76.tgt = null; return; }
    if (TPV76.tgt !== c){ TPV76.tgt = c; TPV76.pos = null; }
    const want = cam.pos;
    if (!TPV76.pos || dist(TPV76.pos, want) > 25){ TPV76.pos = want; return; }
    const k = 1 - Math.exp(-dt * (inf ? 16 : 7));
    let p = add(TPV76.pos, mul(sub(want, TPV76.pos), k));
    const head = inf ? add(c.pos, mul(c.up, 1.2)) : add(c.pos, mul(c.up, 1.2));
    p = pullCam(head, p);
    TPV76.pos = p;
    cam.pos = p;   // направление взгляда не трогаем — перекрестие остаётся точным
  }; }
// стрельба бойца в 3-м лице: в точку под перекрестием
{ const aa0 = assistAim;
  assistAim = function(eye, fwd, team){
    if (TPV76.on() && S.cam){
      const r = rayCast(S.cam.pos, S.cam.fwd, 400, team, true);
      const v = sub(r.pos, eye);
      if (len(v) > 1.5 && dot(v, S.cam.fwd) > 0) fwd = norm(v);
    }
    return aa0.call(this, eye, fwd, team);
  }; }
// техника в 3-м лице: метка, куда сейчас смотрит пушка (рядом с индикатором башни v7.3)
{ const go0 = gunOverlay;
  gunOverlay = function(dt){
    go0.apply(this, arguments);
    try {
      const c = ctrlEntity();
      if (!TPV76.vehOn(c) || c.cls !== 'tank' || c.vk || MENU.isOpen()) return;
      const m = add(add(c.pos, mul(c.up, 0.5)), mul(c.aim, 3.4));
      const r = rayCast(m, c.aim, 220, c.team, true), s = project(r.pos);
      if (!s) return;
      const g = octx; g.save();
      g.strokeStyle = c.cd > 0 ? 'rgba(232,220,184,.45)' : 'rgba(255,179,71,.95)'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(s[0], s[1], 8, 0, PI * 2); g.stroke();
      g.beginPath(); g.moveTo(s[0] - 13, s[1]); g.lineTo(s[0] - 9, s[1]); g.moveTo(s[0] + 9, s[1]); g.lineTo(s[0] + 13, s[1]); g.stroke();
      if (r.ent){ g.fillStyle = '#ff8a6a'; g.beginPath(); g.arc(s[0], s[1], 2.5, 0, PI * 2); g.fill(); }
      g.restore();
    } catch (e){ if (!TPV76.err){ TPV76.err = 1; console.warn('TPV76', e); } }
  }; }
// настройки: ПК (блок шутера) и телефон (Управление)
if (typeof FPS61 !== 'undefined' && FPS61.settingsRows){
  const sr0 = FPS61.settingsRows;
  FPS61.settingsRows = function(row, ch){ return sr0.call(this, row, ch) + row(tr('Боец: вид (V)', 'Trooper: view (V)', 'Lính: góc nhìn (V)', 'חייל: מבט (V)'), ch('tpv76', [[false, tr('1-е лицо', '1st person', 'ngôi thứ nhất', 'גוף ראשון')], [true, tr('3-е лицо', '3rd person', 'ngôi thứ ba', 'גוף שלישי')]])); };
}
if (typeof P71M !== 'undefined' && P71M.sec){
  const sec0 = P71M.sec;
  P71M.sec = function(k){
    const h = sec0.call(this, k);
    if (k !== 's_ctl') return h;
    return h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + this.tog('tpv76', tr('Боец: вид от 3-го лица', 'Trooper: 3rd-person view', 'Lính: ngôi thứ ba', 'חייל: גוף שלישי')));
  };
}
