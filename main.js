// =====================================================================
//  ЗАГРУЗКА и КАДР
// =====================================================================
let lastT = performance.now(), navTimer = 0, hudTimer = 0, panelTimer = 0, fpsT0 = performance.now(), fpsN = 0;
function frame(now){
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  update(dt);
  fpsN++;
  if (now - fpsT0 > 1000){
    fpsVal = fpsN * 1000 / (now - fpsT0); fpsN = 0; fpsT0 = now;
    if (S.autoRes && document.visibilityState === 'visible'){
      if (fpsVal < 44 && S.scale > 0.5){ S.scale = +(S.scale - 0.125).toFixed(3); resize(); }
      else if (fpsVal > 58 && S.scale < 1){ S.scale = +(S.scale + 0.125).toFixed(3); resize(); }
    }
  }
  if (S.mode === 'rts' && !S.attract) updateRTSCamera(dt);
  S.flashT = max(0, S.flashT - dt); S.hitT = max(0, S.hitT - dt); S.dmgT = max(0, S.dmgT - dt * 1.5);
  S.shake = max(0, S.shake - dt * 2.5); S.recoil *= Math.exp(-dt * 14); S.muzzle -= dt; S.navT = (S.navT || 0) - dt;
  if (S.me && S.me.cls === 'inf') S.bob = S.me.phase;
  setupCamera(dt);
  render(dt, now);
  drawOverlay(dt); gunOverlay(dt);
  navTimer -= dt; if (navTimer <= 0){ navTimer = 0.25; computeNav(); }
  AU.frame(dt); AU.process(S.events); gunEvents(S.events);
  rtsWatch(dt);
  SAVE.auto();
  CAMFX.frame(dt);
  TOUCH.frame();
  hudTimer -= dt; if (hudTimer <= 0){ hudTimer = 0.1; updateHUD(); SQUADUI.render(); TUT.render(); }
  if (!S.paused){ SQUADUI.step(dt); TUT.step(dt); SIDEQ.step(dt); }
  panelTimer -= dt; if (panelTimer <= 0 && S.mode === 'rts' && !S.attract){ panelTimer = 0.25; updateSidebar(); updateCard(); }
  if (S.over && !S.attract && !S.endShown && S.rtime - S.overT > 3.5){ S.endShown = true; unlockMouse(); MENU.show('end'); }
  requestAnimationFrame(frame);
}
const nextTick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
async function boot(){
  const bar = $('bootBar'), txt = $('bootTxt');
  const st = (p, t) => { bar.style.width = p.toFixed(0) + '%'; txt.textContent = t; };
  MENU.load(); TOUCH.init(); applySettings();
  $('bootTitle').textContent = tr('загрузка', 'loading', 'đang tải');
  st(4, tr('Генерация рельефа метеорита…', 'Generating the meteor terrain…', 'Đang tạo địa hình thiên thạch…')); await nextTick();
  genNoise();
  st(12, tr('Подготовка видеокарты…', 'Preparing the GPU…', 'Đang chuẩn bị card đồ họa…')); await nextTick();
  initTextures(); resize();
  st(18, tr('Компиляция шейдеров — в первый раз до минуты…', 'Compiling shaders — up to a minute the first time…', 'Đang biên dịch shader — lần đầu có thể mất tới một phút…')); await nextTick();
  const hS = startProgram(document.getElementById('fs').textContent.replace('/*CONSTS*/', shaderConsts()));
  const hP = startProgram(document.getElementById('ps').textContent);
  const t0 = performance.now();
  const tips = [
    tr('Небо — это портал: улетев вверх, ты выйдешь с противоположной стороны метеорита.', 'The sky is a portal: fly up and you come out on the opposite side of the meteor.', 'Bầu trời là cánh cổng: bay lên và bạn sẽ xuất hiện ở phía bên kia thiên thạch.'),
    tr('Выполняй приказы стратега — опыт за них удваивается и утраивается.', 'Follow the strategist\'s orders — XP for them is doubled and tripled.', 'Làm theo lệnh của chiến lược gia — kinh nghiệm được nhân đôi và nhân ba.'),
    tr('X — мгновенно переключиться на отряд или машину, которые ближе всего к бою.', 'X — instantly switch to the squad or vehicle closest to the fight.', 'X — chuyển ngay sang đội hoặc xe gần trận đánh nhất.'),
    tr('Пули бьют сильнее всего на средней дистанции, 20–50 метров.', 'Bullets hit hardest at medium range, 20–50 meters.', 'Đạn mạnh nhất ở tầm trung, 20–50 mét.'),
    tr('Чтобы победить, снеси штаб Роя и все его ключевые здания.', 'To win, destroy the Swarm HQ and all its key buildings.', 'Để thắng, hãy phá sở chỉ huy Bầy Đàn và mọi công trình then chốt của chúng.'),
  ];
  while (!(programReady(hS) && programReady(hP))){
    const k = (performance.now() - t0) / 1000;
    st(18 + 60 * (1 - Math.exp(-k / 10)), tr('Компиляция шейдеров…', 'Compiling shaders…', 'Đang biên dịch shader…') + ` ${k.toFixed(0)} ${tr('с', 's', 'giây')}`);
    $('bootTip').textContent = tips[floor(k / 5) % tips.length];
    await nextTick();
  }
  try { SCENE = finishProgram(hS, SCENE_U); POST = finishProgram(hP, POST_U); }
  catch (e){ txt.textContent = tr('Ошибка шейдера: ', 'Shader error: ', 'Lỗi shader: ') + e.message.slice(0, 400); bar.style.background = '#c44'; throw e; }
  st(80, tr('Разбрасываем обломки старых экспедиций…', 'Scattering old expedition wreckage…', 'Đang rải xác tàu của các đoàn thám hiểm cũ…')); await nextTick();
  genProps();
  st(88, tr('Высадка армий…', 'Deploying the armies…', 'Đang triển khai quân đội…')); await nextTick();
  newMatch({ attract: true });
  buildSidebar();
  MENU.applyLang();
  st(94, tr('Прогрев видеокарты…', 'Warming up the GPU…', 'Đang làm nóng card đồ họa…')); await nextTick();
  setupCamera(0.016); render(0.016, performance.now()); gl.finish();
  st(100, tr('Готово', 'Ready', 'Sẵn sàng')); await nextTick();
  $('boot').classList.add('done'); setTimeout(() => { $('boot').style.display = 'none'; }, 700);
  if (/norun/.test(location.search)) return;
  if (QS.get('operator')){
    // кино-режим из адресной строки: ?operator=1&aspect=9x16&warm=200&rec=60&lang=en&caps=1&name=short1
    if (QS.get('lang')){ SET.lang = QS.get('lang'); applySettings(); MENU.applyLang(); }
    if (QS.get('battle')) SET.battle = +QS.get('battle');
    newMatch({ attract: true });
    const warm = +(QS.get('warm') || 0);
    if (warm > 0){
      $('boot').style.display = ''; $('boot').classList.remove('done');
      for (let s = 0, step = 0; s < warm; s += 0.05, step++){
        update(0.05);
        if (step % 100 === 0){ st(100 * s / warm, tr('Перемотка боя…', 'Fast-forwarding the battle…', 'Tua nhanh trận đánh…') + ` ${Math.round(s)} / ${warm}`); await nextTick(); }
      }
      $('boot').classList.add('done'); setTimeout(() => { $('boot').style.display = 'none'; }, 700);
    }
    OPER.begin({ aspect: QS.get('aspect') === '9x16' ? '9:16' : '16:9', caps: QS.get('caps') !== '0' });
    if (QS.get('rec')) setTimeout(() => REC.start(+QS.get('rec'), QS.get('name') || ''), 1500);
    lastT = performance.now();
    requestAnimationFrame(frame);
    return;
  }
  MENU.show('main');
  lastT = performance.now();
  requestAnimationFrame(frame);
}
window.BOOT = boot();
