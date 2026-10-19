// =====================================================================
//  НАСТРОЙКИ, МЕНЮ, ПРОВЕРКА И ПЕРЕНАЗНАЧЕНИЕ УПРАВЛЕНИЯ
// =====================================================================
const BIND_DEF = {
  fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', run: 'ShiftLeft', down: 'KeyC',
  reload: 'KeyR', rocket: 'KeyQ', grenade: 'KeyG', reflex: 'KeyF', strike: 'KeyT', interact: 'KeyE',
  w1: 'Digit1', w2: 'Digit2', w3: 'Digit3', switch: 'KeyX', rts: 'Tab', third: 'KeyV', follow: 'KeyL', nav: 'KeyN', ai: 'KeyI',
};
const BIND_NAMES = {
  fwd: ['Вперёд', 'Forward', 'Tiến'], back: ['Назад', 'Back', 'Quay lại'], left: ['Влево', 'Left', 'Trái'], right: ['Вправо', 'Right', 'Phải'], jump: ['Прыжок / вверх', 'Jump / up', 'Nhảy / lên'],
  run: ['Ранец (прыжок + полёт)', 'Jetpack (hop + fly)', 'Ba lô phản lực (nhảy + bay)'], down: ['Подкат на бегу · тормоз в воздухе · вниз (дрон)', 'Slide when running · air brake · down (drone)', 'Trượt khi chạy · phanh trên không · xuống (drone)'], reload: ['Перезарядка · залп танка', 'Reload · tank barrage', 'Nạp đạn · loạt pháo xe tăng'], rocket: ['Ракета', 'Rocket', 'Tên lửa'],
  grenade: ['Граната · форсаж танка', 'Grenade · tank overdrive', 'Lựu đạn · tăng tốc xe tăng'], reflex: ['Рефлекс · дым танка', 'Reflex · tank smoke', 'Phản xạ · khói xe tăng'], strike: ['Артудар', 'Artillery strike', 'Pháo kích'],
  interact: ['Танк / турель / выйти', 'Tank / turret / exit', 'Xe tăng / tháp súng / thoát'], w1: ['Винтовка', 'Rifle', 'Súng trường'], w2: ['Рельсотрон', 'Railgun', 'Súng ray'], w3: ['Пулемёт (награда)', 'Heavy MG (reward)', 'Súng máy nặng (thưởng)'],
  switch: ['Быстрая смена бойца (в бою)', 'Quick unit switch (in battle)', 'Đổi đội / xe'], rts: ['Стратегия ⇄ бой · в стратегии — вселиться в выделенного', 'Strategy ⇄ battle · in strategy — possess selection', 'Chế độ chiến thuật ⇄ nhập vai'], third: ['Вид от 3-го лица', 'Third person', 'Góc nhìn thứ ba'],
  follow: ['Режим «ведомый»', 'Follower mode', 'Chế độ đi theo'], nav: ['Линия к задаче', 'Objective line', 'Đường tới nhiệm vụ'], ai: ['ИИ-стратег вкл/выкл', 'AI strategist on/off', 'Bật/tắt chiến lược gia AI'],
};
const SET_DEF = { lang: 'ru', vol: 0.9, voice: true, hintsVoice: true, hintsOn: true, sens: 1, invertY: false, swapMouse: false, quality: 2, autoRes: true,
                  scale: 0.75, fov: 75, vhs: false, distort: true, bright: 1, diff: 3, grid: 1, bounces: 4, edgeScroll: true, unlockAll: false, battle: 1, endless: true, fog: true, chatter: true, bind: Object.assign({}, BIND_DEF) };
const SET = JSON.parse(JSON.stringify(SET_DEF));
function applySettings(){
  LANG.cur = SET.lang;
  S.quality = SET.quality; S.autoRes = SET.autoRes; S.scale = SET.scale; S.vhs = SET.vhs; S.diff = SET.diff; S.grid = SET.grid; S.bounces = SET.bounces;
  setFov(SET.fov);
  PROG.allUnlocked = SET.unlockAll;
  AU.setVol(SET.vol);
  document.documentElement.lang = SET.lang;
}
const el0 = () => $('screen');
const MENU = {
  cur: null, stack: [], rebind: null, testDown: {},
  load(){
    // телефон: при первом запуске — лёгкая графика
    try { if (TOUCH.on && !localStorage.getItem('pm_settings')) Object.assign(SET, { quality: 0, scale: 0.45, bounces: 2, distort: false, battle: 0, hintsVoice: false }); } catch (e){}
    try { const s = localStorage.getItem('pm_settings'); if (s){ const o = JSON.parse(s); Object.assign(SET, o); SET.bind = Object.assign({}, BIND_DEF, o.bind || {}); } } catch (e){}
    PROG.loadCareer();
  },
  save(){ try { localStorage.setItem('pm_settings', JSON.stringify(SET)); } catch (e){} },
  isOpen(){ return !!this.cur; },
  show(name, push){
    if (push && this.cur) this.stack.push(this.cur);
    this.cur = name;
    const el = $('screen');
    el.style.display = 'flex';
    el.className = 'scr scr-' + name;
    el.innerHTML = this['html_' + name]();
    this.wire(name);
    updateModeUI();
  },
  close(){ this.cur = null; this.stack = []; $('screen').style.display = 'none'; this.rebind = null; updateModeUI(); },
  back(){
    if (this.rebind){ this.rebind = null; this.show(this.cur); return; }
    if (this.stack.length){ this.show(this.stack.pop()); return; }
    if (this.cur === 'pause') this.resume();
    else if (this.cur === 'main' || this.cur === 'end') return;
    else this.close();
  },
  pause(){ if (S.attract) return; S.paused = true; this.stack = []; this.openedAt = performance.now(); this.show('pause'); AU.duck(true); },
  // v6: Chrome не даёт захватить мышь по нажатию Esc — тогда игра ждёт клика по оверлею «кликни, чтобы продолжить»
  resume(){
    this.close(); AU.duck(false);
    if (S.mode === 'fps' && !S.attract && !TOUCH.on && !isLocked()){ S.paused = true; this.waitLock = true; lockMouse(); updateModeUI(); }
    else S.paused = false;
  },
  newGame(tutorial){
    S.paused = false;
    TUT.on = false; $('tut').style.display = 'none';
    newMatch({ attract: false });
    if (tutorial === true){ const T = S.teams[1]; T.waveT = 1e9; T.skyT = 1e9; T.podT = 1e9; TUT.start(); }
    buildSidebar();
    S.endShown = false; SAVE.lastAuto = 0;
    this.close(); AU.duck(false);
    lockMouse();
    emit('radio', { text: tr('Связь установлена. Стратег на линии. Удачи, боец.', 'Comms online. The strategist is on the line. Good luck, trooper.', 'Liên lạc thông suốt. Chiến lược gia đang trực. Chúc may mắn, chiến binh.'), pri: 2 });
  },
  loadGame(slot){
    S.paused = false; this.waitLock = false;
    if (!SAVE.load(slot)){ this.show(this.cur); return; }
    buildSidebar(); S.endShown = false; SAVE.lastAuto = S.time;
    this.close(); AU.duck(false);
    if (S.mode === 'fps') lockMouse();
    emit('radio', { text: tr('Связь восстановлена. Продолжаем бой.', 'Comms restored. Resuming the battle.', 'Liên lạc đã khôi phục. Tiếp tục chiến đấu.'), pri: 2 });
  },
  toMenu(){ S.paused = false; this.waitLock = false; TUT.on = false; newMatch({ attract: true }); unlockMouse(); this.stack = []; this.show('main'); AU.duck(false); },
  applyLang(){
    applySettings(); this.save();
    $('clicklock').innerHTML = `<div>${tr('Кликни, чтобы вернуться в бой', 'Click to return to the fight', 'Nhấp để quay lại trận')}</div><small>${tr('Esc — меню', 'Esc — menu', 'Esc — menu')}</small>`;
    buildSidebar(); AU.pickVoice(); updateModeUI();
    document.title = 'Portal Meteor — v6';
  },
  // ---------------- экраны
  btn(id, text, cls){ return `<button id="m_${id}" class="${cls || ''}">${text}</button>`; },
  html_main(){
    const C = PROG.career;
    return `<div class="mcol">
      <h1>PORTAL METEOR</h1>
      <p class="sub">${tr('война роботов за руду метеорита · небо — это портал к врагу', 'a robot war for meteor ore · the sky is a portal to the enemy', 'cuộc chiến robot giành quặng thiên thạch · bầu trời là cánh cổng tới quân thù')}</p>
      ${this.btn('play', tr('Новый матч', 'New match', 'Trận mới'), 'big')}
      <div class="diffrow">${DIFF.map((d, i) => `<button class="dbtn ${SET.diff === i ? 'cur' : ''}" data-diff="${i}">${N2(d.n)}</button>`).join('')}</div>
      <div class="diffrow">${[[true, tr('Бесконечный бой', 'Endless war', 'Chiến tranh bất tận')], [false, tr('Матч 60 минут', '60-minute match', 'Trận 60 phút')]].map(([v, n]) => `<button class="${SET.endless === v ? 'cur' : ''}" data-ch="endless" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="diffrow">${SCALES.map((k, i) => `<button class="${SET.battle === i ? 'cur' : ''}" data-ch="battle" data-v="${i}" title="${tr('масштаб боёв', 'battle scale', 'quy mô trận')}">${N2(k.n)}</button>`).join('')}</div>
      ${SAVE.has() ? this.btn('load', tr('Продолжить сохранённый бой', 'Continue saved battle', 'Tiếp tục trận đã lưu') + ` <small style="opacity:.6">${SAVE.info()}</small>`) : ''}
      ${this.btn('saves', tr('Сохранения: список, экспорт, импорт', 'Saves: list, export, import', 'Bản lưu: danh sách, xuất, nhập'))}
      ${this.btn('tutorial', tr('Обучение', 'Training', 'Huấn luyện'))}
      ${this.btn('cinema', tr('Кино-режим: бот играет сам', 'Cinema mode: bots play by themselves', 'Chế độ điện ảnh: bot tự chơi'))}
      ${this.btn('settings', tr('Настройки', 'Settings', 'Cài đặt'))}
      ${this.btn('controls', tr('Управление и проверка клавиш', 'Controls & key test', 'Điều khiển & kiểm tra phím'))}
      <div class="diffrow">${LANGS.map(([c, n]) => `<button class="lbtn ${SET.lang === c ? 'cur' : ''}" data-lang="${c}">${n}</button>`).join('')}</div>
    </div>
    <div class="mcol side">
      <h3>${tr('Карьера', 'Career', 'Sự nghiệp')}</h3>
      <p>${tr('Матчей', 'Matches', 'Trận')}: <b>${C.matches}</b> · ${tr('побед', 'wins', 'thắng')}: <b>${C.wins}</b></p>
      <p>${tr('Убито роботов', 'Robots destroyed', 'Robot đã hạ')}: <b>${C.kills}</b> · ${tr('приказов выполнено', 'orders completed', 'lệnh đã hoàn thành')}: <b>${C.tasks}</b></p>
      <p>${tr('Всего опыта', 'Total XP', 'Tổng kinh nghiệm')}: <b>${C.xp}</b> · ${tr('лучшее звание', 'best rank', 'cấp bậc cao nhất')}: <b>${PROG.rankName(C.best)}</b></p>
      <h3>${tr('Новое в v6', 'New in v6', 'Mới trong v6')}</h3>
      <ul>
        <li>${tr('Стрельба как в шутерах: мгновенные пули, автомат 720 выстр/мин, пулемёт, отдача, прицел на ПКМ, магазины и перезарядка R, метки попаданий', 'Shooter-grade guns: hitscan bullets, 720 RPM rifle, MG, recoil, RMB aim, magazines and R reload, hit markers')}</li>
        <li>${tr('Тяжелее гравитация, отзывчивый ранец, рывок Z или 2× ранец в воздухе; при перелёте в другого бойца оружие больше не летит', 'Heavier gravity, responsive jetpack, dash on Z or double jet in the air; the weapon no longer flies along when switching units')}</li>
        <li>${tr('Инженеры-строители: выдели инженера, выбери здание, поставь чертёж; экстракторы на рудных жилах; клик по «РУДА» — откуда доход и как ускорить', 'Builders: select a builder, pick a building, place a blueprint; extractors on ore veins; click "ORE" to see income and how to boost it')}</li>
        <li>${tr('Серые кнопки можно нажать — покажем причину и кнопку-решение; крупные кнопки, полоса «В работе», «▶ Вселиться», Tab — одна клавиша', 'Grey buttons explain why and offer a fix; bigger buttons, "In progress" strip, "▶ Possess", Tab is the one mode key')}</li>
        <li>${tr('Камера стратегии без рывков и переворотов, зум к курсору, миникарту можно тянуть', 'Strategy camera without jumps or flips, zoom to cursor, draggable minimap')}</li>
        <li>${tr('Новая техника: рейдер «Шакал», РСЗО «Град» (самонаводящиеся ракеты), миномёт «Молот»; у Роя «Оса», «Улей», «Требушет»', 'New vehicles: Jackal raider, Grad MLRS (homing rockets), Hammer mortar; the Swarm gets Wasp, Hive, Trebuchet')}</li>
        <li>${tr('Стратег не дёргает приказы и не спамит голосом; бои рядом с тобой; B — переброска, Shift+B — в гущу боя; компас, H — какая цель', 'The strategist keeps orders and stops voice spam; fights come to you; B — redeploy, Shift+B — into the fight; compass, H — which target')}</li>
        <li>${tr('Свобода действий (K) и «действую один» (J), F2 — пресеты; Esc — пауза и обратно; сохранения: слоты, экспорт и импорт файла', 'Free play (K) and going solo (J), F2 presets; Esc pauses and resumes; saves: slots, export and import')}</li>
      </ul>
      <h3>${tr('Новое в v5.3', 'New in v5.3', 'Mới trong v5.3')}</h3>
      <ul>
        <li>${tr('Полёт: тяжесть вдали от метеорита сильнее, C в воздухе — тормоз, тяга рулит резче; больше не «зависаешь» в портале', 'Flight: stronger gravity far from the meteor, C in the air brakes, thrust steers sharper; no more getting stuck in the portal', 'Bay: trọng lực xa thiên thạch mạnh hơn, C trên không để phanh, lực đẩy lái gắt hơn; không còn kẹt trong cổng')}</li>
      </ul>
      <h3>${tr('Новое в v5', 'New in v5', 'Mới trong v5')}</h3>
      <ul>
        <li>${tr('Бесконечный бой по умолчанию и масштаб боёв: обычный, крупный, эпичный', 'Endless war by default and battle scale: normal, large, epic', 'Mặc định chiến tranh bất tận và quy mô trận: thường, lớn, hoành tráng')}</li>
        <li>${tr('Сохранение и загрузка боя (и автосохранение каждые 3 минуты)', 'Save and load the battle (autosave every 3 minutes)', 'Lưu và tải trận (tự lưu mỗi 3 phút)')}</li>
        <li>${tr('Отряд с позывными: портреты, здоровье и живые переговоры', 'Squadmates with callsigns: portraits, health and live chatter', 'Đồng đội có biệt danh: chân dung, máu và trò chuyện')}</li>
        <li>${tr('Туман войны в стратегии, свои и враги подсвечены по-разному', 'Fog of war in strategy, friends and foes outlined differently', 'Sương mù chiến tranh, bạn và thù được viền khác màu')}</li>
        <li>${tr('Пролёт камеры при переключении, сияние портала вместо колец', 'Camera fly-over when switching, portal aurora instead of rings', 'Camera bay khi chuyển, cực quang cổng thay cho vòng tròn')}</li>
        <li>${tr('Побочные задачи, короткий путь через небо, модули первой экспедиции с припасами, кристаллы, лёд в кратерах, пылевые бури', 'Side tasks, sky shortcut, first-expedition habitats with supplies, crystals, crater ice, dust storms', 'Nhiệm vụ phụ, lối tắt qua bầu trời, mô-đun đoàn thám hiểm đầu tiên có tiếp tế, tinh thể, băng trong miệng hố, bão bụi')}</li>
        <li>${tr('Обучение, кино-режим с записью роликов, техника сопровождения от стратега', 'Training, cinema mode with video recording, escort vehicles from the strategist', 'Huấn luyện, chế độ điện ảnh có ghi video, xe hộ tống từ chiến lược gia')}</li>
      </ul>
    </div>`;
  },
  html_pause(){
    return `<div class="mcol"><h2>${tr('ПАУЗА', 'PAUSED', 'TẠM DỪNG')}</h2>
      <p class="sub">${PROG.rankName()} · ${PROG.xp} XP · ${tr('убито', 'kills', 'hạ')} ${PROG.matchKills} · ${fmtTime(S.time)}</p>
      ${this.btn('resume', tr('Продолжить', 'Resume', 'Tiếp tục'), 'big')}
      ${this.btn('save', tr('Сохранить бой', 'Save battle', 'Lưu trận'))}
      ${this.btn('saves', tr('Сохранения и загрузка…', 'Saves & loading…', 'Lưu & tải…'))}
      ${typeof MISSION !== 'undefined' ? MISSION.modeRows() : ''}
      ${this.btn('settings', tr('Настройки', 'Settings', 'Cài đặt'))}
      ${this.btn('controls', tr('Управление и проверка клавиш', 'Controls & key test', 'Điều khiển & kiểm tra phím'))}
      <div class="diffrow">${LANGS.map(([c, n]) => `<button class="lbtn ${SET.lang === c ? 'cur' : ''}" data-lang="${c}">${n}</button>`).join('')}</div>
      ${this.btn('restart', tr('Новый матч', 'New match', 'Trận mới'))}
      ${this.btn('menu', tr('Выйти в главное меню', 'Quit to main menu', 'Thoát ra menu chính'))}</div>`;
  },
  html_end(){
    const win = S.winner === 0;
    return `<div class="mcol"><h1 style="color:${win ? TEAM[0].css : TEAM[1].css}">${win ? tr('ПОБЕДА', 'VICTORY', 'CHIẾN THẮNG') : tr('ПОРАЖЕНИЕ', 'DEFEAT', 'THẤT BẠI')}</h1>
      <p class="sub">${S.overWhy}</p>
      <div class="stats">
        <p>${tr('Время', 'Time', 'Thời gian')}: <b>${fmtTime(S.time)}</b></p>
        <p>${tr('Звание', 'Rank', 'Cấp bậc')}: <b>${PROG.rankName()}</b> · <b>${PROG.matchXP}</b> XP</p>
        <p>${tr('Твои уничтожения', 'Your kills', 'Bạn đã hạ')}: <b>${PROG.matchKills}</b> · ${tr('приказов выполнено', 'orders done', 'lệnh hoàn thành')}: <b>${PROG.matchTasks}</b></p>
        <p>${tr('Армия', 'Army', 'Quân đội')}: ${tr('уничтожено', 'destroyed', 'đã hạ')} <b>${S.stats.kills[0]}</b> · ${tr('потеряно', 'lost', 'đã mất')} <b>${S.stats.kills[1]}</b> · ${tr('захватов', 'captures', 'lần chiếm')} <b>${S.stats.caps[0]}</b></p>
      </div>
      ${this.btn('restart', tr('Новый матч', 'New match', 'Trận mới'), 'big')}
      ${this.btn('menu', tr('Главное меню', 'Main menu', 'Menu chính'))}</div>`;
  },
  html_settings(){
    const row = (label, ctl) => `<div class="row"><label>${label}</label>${ctl}</div>`;
    const tog = (k) => `<button class="tog ${SET[k] ? 'on' : ''}" data-tog="${k}">${SET[k] ? tr('ВКЛ', 'ON', 'BẬT') : tr('ВЫКЛ', 'OFF', 'TẮT')}</button>`;
    const sl = (k, a, b, st) => `<input type="range" data-sl="${k}" min="${a}" max="${b}" step="${st}" value="${SET[k]}"><span class="val" id="v_${k}">${SET[k]}</span>`;
    const ch = (k, opts) => `<span class="chs">${opts.map(([v, n]) => `<button class="${SET[k] === v ? 'cur' : ''}" data-ch="${k}" data-v="${v}">${n}</button>`).join('')}</span>`;
    return `<div class="mcol wide"><h2>${tr('НАСТРОЙКИ', 'SETTINGS', 'CÀI ĐẶT')}</h2><div class="cols"><div>
      <h4>${tr('Язык и звук', 'Language & sound', 'Ngôn ngữ & âm thanh')}</h4>
      ${row(tr('Язык', 'Language', 'Ngôn ngữ'), ch('lang', LANGS))}
      ${row(tr('Громкость', 'Volume', 'Âm lượng'), sl('vol', 0, 1, 0.05))}
      ${row(tr('Голос рации', 'Radio voice', 'Giọng bộ đàm'), tog('voice'))}
      ${row(tr('Подсказки', 'Hints', 'Gợi ý'), tog('hintsOn'))}
      ${row(tr('Озвучивать подсказки', 'Voice the hints', 'Đọc gợi ý thành tiếng'), tog('hintsVoice'))}
      <h4>${tr('Мышь и камера', 'Mouse & camera', 'Chuột & camera')}</h4>
      ${row(tr('Чувствительность', 'Sensitivity', 'Độ nhạy'), sl('sens', 0.3, 3, 0.05))}
      ${row(tr('Инверсия Y', 'Invert Y', 'Đảo trục Y'), tog('invertY'))}
      ${row(tr('ЛКМ ↔ ПКМ (огонь и прицел)', 'Swap LMB ↔ RMB (fire/aim)', 'Đổi chuột trái ↔ phải (bắn/ngắm)'), tog('swapMouse'))}
      ${row(tr('Поле зрения', 'Field of view', 'Góc nhìn'), sl('fov', 60, 100, 1))}
      ${row(tr('Прокрутка краями (стратегия)', 'Edge scrolling (strategy)', 'Cuộn bằng mép màn hình (chiến thuật)'), tog('edgeScroll'))}
      </div><div>
      <h4>${tr('Графика', 'Graphics', 'Đồ họa')}</h4>
      ${row(tr('Качество', 'Quality', 'Chất lượng'), ch('quality', [[0, tr('низкое', 'low', 'thấp')], [1, tr('среднее', 'medium', 'trung bình')], [2, tr('высокое', 'high', 'cao')]]))}
      ${row(tr('Авторазрешение', 'Auto resolution', 'Độ phân giải tự động'), tog('autoRes'))}
      ${row(tr('Масштаб разрешения', 'Resolution scale', 'Tỷ lệ độ phân giải'), sl('scale', 0.25, 1.5, 0.125))}
      ${row(tr('Яркость', 'Brightness', 'Độ sáng'), sl('bright', 0.6, 1.6, 0.05))}
      ${row(tr('Искажения (ударная волна)', 'Distortion (shockwaves)', 'Méo không gian (sóng xung kích)'), tog('distort'))}
      ${row(tr('VHS-фильтр', 'VHS filter', 'Bộ lọc VHS'), tog('vhs'))}
      ${row(tr('Сияние портала', 'Portal aurora', 'Cực quang cổng'), ch('grid', [[1, tr('да', 'yes', 'có')], [0, tr('нет', 'no', 'không')]]))}
      ${row(tr('Глубина отражений портала', 'Portal recursion depth', 'Độ sâu phản chiếu cổng'), sl('bounces', 0, 8, 1))}
      <h4>${tr('Игра', 'Game', 'Trò chơi')}</h4>
      ${row(tr('Сложность (новый матч)', 'Difficulty (new match)', 'Độ khó (trận mới)'), ch('diff', DIFF.map((d, i) => [i, N2(d.n)])))}
      ${row(tr('Масштаб боёв (новый матч)', 'Battle scale (new match)', 'Quy mô trận (trận mới)'), ch('battle', SCALES.map((k, i) => [i, N2(k.n)])))}
      ${row(tr('Туман войны в стратегии', 'Fog of war in strategy', 'Sương mù chiến tranh'), tog('fog'))}
      ${row(tr('Переговоры отряда', 'Squad chatter', 'Đồng đội trò chuyện'), tog('chatter'))}
      ${row(tr('Радиоэфир стратега', 'Strategist radio', 'Bộ đàm chiến lược gia'), ch('radioLvl', [[2, tr('полный', 'full', 'đầy đủ')], [1, tr('важное', 'important', 'quan trọng')], [0, tr('тишина', 'silent', 'im lặng')]]))}
      ${row(tr('Приказы стратега', 'Strategist orders', 'Lệnh chiến lược gia'), ch('ordersFree', [[false, tr('следовать', 'follow', 'theo lệnh')], [true, tr('свобода действий', 'free play', 'tự do')]]))}
      ${row(tr('Отряд', 'Squad', 'Đội'), ch('solo', [[false, tr('со мной', 'with me', 'đi cùng')], [true, tr('действую один', 'going solo', 'một mình')]]))}
      ${row(tr('Все способности сразу (тест)', 'All abilities unlocked (test)', 'Mở khóa mọi kỹ năng (thử nghiệm)'), tog('unlockAll'))}
      </div></div>
      ${this.btn('back', tr('Назад', 'Back', 'Quay lại'), 'big')}</div>`;
  },
  html_controls(){
    const acts = Object.keys(BIND_DEF);
    const rows = acts.map(a => `<div class="brow"><label>${N2(BIND_NAMES[a])}</label><button class="kb ${this.rebind === a ? 'wait' : ''}" data-bind="${a}">${this.rebind === a ? tr('нажми клавишу…', 'press a key…', 'nhấn một phím…') : keyLabel(SET.bind[a])}</button></div>`).join('');
    const kbRows = [
      ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
      ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
      ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
      ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
      ['ControlLeft', 'AltLeft', 'Space', 'Escape', 'Home'],
    ];
    const kb = kbRows.map(r => `<div class="krow">${r.map(c => { const a = actOf(c); return `<div class="key ${a ? 'bound' : ''} ${c === 'Space' ? 'space' : ''} ${this.testDown[c] ? 'down' : ''}" data-code="${c}"><b>${keyLabel(c)}</b>${a ? `<small>${N2(BIND_NAMES[a]).split(' ')[0]}</small>` : ''}</div>`; }).join('')}</div>`).join('');
    return `<div class="mcol wide"><h2>${tr('УПРАВЛЕНИЕ', 'CONTROLS', 'ĐIỀU KHIỂN')}</h2>
      <div class="cols"><div><h4>${tr('Шутер — кликни, чтобы переназначить', 'Shooter — click to rebind', 'Bắn súng — nhấp để đổi phím')}</h4><div class="binds">${rows}</div>
        <p class="note">${tr('Мышь: ЛКМ — огонь, ПКМ — прицел, Shift — ранец. Танк: ЛКМ — пушка, ПКМ — пулемёт. M — звук, O — качество, Esc — меню.', 'Mouse: LMB — fire, RMB — aim, Shift — jetpack. Tank: LMB — cannon, RMB — MG. M — sound, O — quality, Esc — menu.', 'Chuột: trái — bắn, phải — ngắm, Shift — ba lô phản lực. Xe tăng: trái — pháo, phải — súng máy. M — âm thanh, O — chất lượng, Esc — menu.')}</p>
        ${this.btn('resetbind', tr('Сбросить по умолчанию', 'Reset to defaults', 'Khôi phục mặc định'))}</div>
      <div><h4>${tr('Проверка: нажимай клавиши и кнопки мыши', 'Test: press keys and mouse buttons', 'Kiểm tra: nhấn phím và nút chuột')}</h4>
        <div class="kbd">${kb}</div>
        <div class="mouse"><div class="mb" id="mb0">${tr('ЛКМ', 'LMB', 'Chuột trái')}</div><div class="mb" id="mb1">${tr('СКМ', 'MMB', 'chuột giữa')}</div><div class="mb" id="mb2">${tr('ПКМ', 'RMB', 'Chuột phải')}</div><div class="mmove"><i id="mdot"></i></div></div>
        <h4>${tr('Стратегия', 'Strategy', 'Chiến thuật')}</h4><div class="note">${helpRTS()}</div></div></div>
      ${this.btn('back', tr('Назад', 'Back', 'Quay lại'), 'big')}</div>`;
  },
  wire(name){
    const on = (id, fn) => { const b = $('m_' + id); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
    on('play', () => this.newGame());
    on('load', () => this.loadGame());
    on('tutorial', () => this.newGame(true));
    on('cinema', () => { AU.init(); OPER.begin({ aspect: '16:9' }); });
    on('save', () => { const slot = SAVE.freeSlot(), ok = SAVE.save(slot); feed(ok ? tr('Бой сохранён: ', 'Battle saved: ', 'Đã lưu trận: ') + SAVE.slotName(slot) : tr('Не удалось сохранить', 'Save failed', 'Lưu thất bại'), ok ? TEAM[0].css : '#f88'); this.show('pause'); });
    on('restart', () => this.newGame());
    on('resume', () => this.resume());
    on('settings', () => this.show('settings', true));
    on('controls', () => this.show('controls', true));
    on('menu', () => { if (this.cur === 'pause' && typeof MISSION !== 'undefined') this.show('quit', true); else this.toMenu(); });
    on('saves', () => this.show('saves', true));
    if (typeof MISSION !== 'undefined') MISSION.wireMenu(name);
    on('back', () => this.back());
    el0().querySelectorAll('[data-lang]').forEach(b => b.onclick = e => { e.stopPropagation(); SET.lang = b.dataset.lang; this.applyLang(); this.show(this.cur); });
    on('resetbind', () => { SET.bind = Object.assign({}, BIND_DEF); this.save(); this.show('controls'); });
    const el = $('screen');
    el.querySelectorAll('[data-diff]').forEach(b => b.onclick = e => { e.stopPropagation(); SET.diff = +b.dataset.diff; applySettings(); this.save(); this.show(this.cur); });
    el.querySelectorAll('[data-tog]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.tog; SET[k] = !SET[k]; applySettings(); this.save(); if (k === 'autoRes' || k === 'scale') resize(); this.show(this.cur); });
    el.querySelectorAll('[data-ch]').forEach(b => b.onclick = e => {
      e.stopPropagation(); const k = b.dataset.ch; const v = b.dataset.v; SET[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
      if (k === 'lang') this.applyLang(); else { applySettings(); this.save(); }
      this.show(this.cur);
    });
    el.querySelectorAll('[data-sl]').forEach(s => s.oninput = () => { const k = s.dataset.sl; SET[k] = +s.value; $('v_' + k).textContent = s.value; applySettings(); if (k === 'scale'){ SET.autoRes = false; S.autoRes = false; resize(); } this.save(); });
    el.querySelectorAll('[data-bind]').forEach(b => b.onclick = e => { e.stopPropagation(); this.rebind = b.dataset.bind; this.show('controls'); });
  },
  // перехват клавиш для переназначения и проверки
  keyCapture(e){
    if (!this.cur) return false;
    if (this.cur === 'controls'){
      e.preventDefault();
      if (this.rebind){
        if (e.code !== 'Escape'){
          const a = this.rebind, old = SET.bind[a];
          for (const b in SET.bind) if (b !== a && SET.bind[b] === e.code) SET.bind[b] = old;   // меняем местами
          SET.bind[a] = e.code; this.save();
        }
        this.rebind = null; this.show('controls'); return true;
      }
      if (e.code === 'Escape'){ this.back(); return true; }
      this.testKey(e.code, true);
      return true;
    }
    return false;
  },
  testKey(code, down){
    this.testDown[code] = down;
    if (this.cur !== 'controls') return;
    const k = document.querySelector(`.key[data-code="${code}"]`);
    if (k) k.classList.toggle('down', down);
  },
  testMouse(btn, down){ if (this.cur !== 'controls') return; const m = $('mb' + btn); if (m) m.classList.toggle('down', down); },
  testMove(dx, dy){ if (this.cur !== 'controls') return; const d = $('mdot'); if (d){ d.style.transform = `translate(${clamp(dx, -20, 20)}px, ${clamp(dy, -20, 20)}px)`; } },
};
