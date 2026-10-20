// =====================================================================
//  v7.1 — ТЕЛЕФОН: управление 2.0 (только сенсор; на ПК этот файл ничего не подменяет — всё под TOUCH.on)
//  Шутер: слева джойстик, маленькая «Огонь» и «Ранец»; справа обзор (свайп или джойстик), «АВТО»
//  (захват цели как в Syphon Filter: красная рамка, стрельба сама, свайп — соседняя цель).
//  Вверху слева — показать/скрыть второстепенный HUD, вверху справа — раскрывающиеся навыки.
//  Жесты: 2× тап справа — рефлекс; вариант A — тап по рамке = ракета, свайп гранаты вверх = граната в цель;
//  вариант B — щипок (прицел / граната / ракета). Подсказки жестов при первом запуске.
//  Стратегия: тап — выбрать / приказ, держать — меню приказов (или рамка, если тянуть), 2× тап — все такие же,
//  кнопки типов войск и карточки отрядов у края, «следить», сворачиваемая миникарта, вибро-отклик.
//  Меню телефона: без ползунков и прокрутки — разделы отдельными экранами, флаги языков, «− значение +».
// =====================================================================
const T71 = {
  fire: ['Огонь', 'Fire', 'Bắn', 'אש'], jet: ['Ранец', 'Jet', 'Bay', 'סילון'], gren: ['Граната', 'Grenade', 'Lựu đạn', 'רימון'],
  reload: ['Перезар.', 'Reload', 'Nạp', 'טעינה'], aim: ['Прицел', 'Aim', 'Ngắm', 'כוונת'], use: ['Войти', 'Enter', 'Vào', 'כניסה'],
  exit: ['Выйти', 'Exit', 'Ra', 'יציאה'], rocket: ['Ракета', 'Rocket', 'Tên lửa', 'רקטה'], reflex: ['Рефлекс', 'Reflex', 'Phản xạ', 'רפלקס'],
  strike: ['Удар', 'Strike', 'Pháo', 'מכה'], weap: ['Оружие', 'Weapon', 'Súng', 'נשק'], auto: ['АВТО', 'AUTO', 'TỰ ĐỘNG', 'אוטו'],
  skills: ['Навыки', 'Skills', 'Kỹ năng', 'כישורים'], up: ['Вверх', 'Up', 'Lên', 'למעלה'], down: ['Вниз', 'Down', 'Xuống', 'למטה'],
  ram: ['Таран', 'Ram', 'Đâm', 'נגיחה'], barrage: ['Залп', 'Barrage', 'Loạt', 'מטח'], smoke: ['Дым', 'Smoke', 'Khói', 'עשן'],
  boost: ['Форсаж', 'Boost', 'Tăng tốc', 'האצה'], scan: ['Скан', 'Scan', 'Quét', 'סריקה'], repair: ['Ремонт', 'Repair', 'Sửa', 'תיקון'],
  rockets: ['Ракеты', 'Rockets', 'Tên lửa', 'רקטות'],
  army: ['Армия', 'Army', 'Quân', 'צבא'], inf: ['Пехота', 'Infantry', 'Bộ binh', 'חי"ר'], veh: ['Техника', 'Vehicles', 'Xe', 'רכבים'],
  drones: ['Дроны', 'Drones', 'Drone', 'רחפנים'], eng: ['Инженеры', 'Builders', 'Kỹ sư', 'מהנדסים'], box: ['Рамка', 'Box', 'Khung', 'מסגרת'],
  autonom: ['Автономно', 'Autonomous', 'Tự hành', 'עצמאי'], manual: ['Ручное', 'Manual', 'Thủ công', 'ידני'], follow: ['Следить', 'Follow', 'Theo dõi', 'מעקב'],
  amove: ['Атака', 'Attack', 'Tấn công', 'התקפה'], hold: ['Стоять', 'Hold', 'Giữ', 'עמוד'], patrol: ['Патруль', 'Patrol', 'Tuần tra', 'סיור'],
  build: ['Строить', 'Build', 'Xây', 'בנה'], gather: ['Сбор', 'Rally', 'Tập hợp', 'כינוס'], possess: ['Вселиться', 'Possess', 'Nhập vai', 'השתלט'],
  back: ['Назад', 'Back', 'Quay lại', 'חזרה'], apply: ['Применить', 'Apply', 'Áp dụng', 'החל'], on: ['ВКЛ', 'ON', 'BẬT', 'פועל'], off: ['ВЫКЛ', 'OFF', 'TẮT', 'כבוי'],
  lockOn: ['Цель захвачена', 'Target locked', 'Đã khóa mục tiêu', 'מטרה ננעלה'],
  autoOn: ['АВТО: захват ближайшего врага, стрельба сама; джойстик — кружить вокруг, свайп — соседняя цель', 'AUTO: locks the nearest enemy and fires by itself; stick — circle around, swipe — next target', 'TỰ ĐỘNG: khóa địch gần nhất và tự bắn; cần điều khiển — đi vòng, vuốt — mục tiêu kế', 'אוטו: נועל על האויב הקרוב ויורה לבד; ג׳ויסטיק — הקפה, החלקה — המטרה הבאה'],
  autoOff: ['АВТО выключен — обычный обзор, мягкая помощь в прицеливании', 'AUTO off — normal look with gentle aim assist', 'TẮT tự động — nhìn bình thường, hỗ trợ ngắm nhẹ', 'אוטו כבוי — מבט רגיל עם סיוע כיוון עדין'],
  noRocket: ['Ракета перезаряжается', 'Rocket reloading', 'Tên lửa đang nạp', 'הרקטה בטעינה'],
  noGren: ['Гранат нет', 'No grenades', 'Hết lựu đạn', 'אין רימונים'],
  grenAt: ['Граната — в цель', 'Grenade — at the target', 'Lựu đạn — vào mục tiêu', 'רימון — אל המטרה'],
  rocketAt: ['Ракета — в цель', 'Rocket — at the target', 'Tên lửa — vào mục tiêu', 'רקטה — אל המטרה'],
  allOf: ['Выбраны все такие на экране', 'Selected all of this type on screen', 'Đã chọn tất cả cùng loại trên màn hình', 'נבחרו כל היחידות מסוג זה במסך'],
  none: ['Таких нет', 'None of these', 'Không có', 'אין כאלה'],
  patrolOn: ['Патруль: туда и обратно', 'Patrol: back and forth', 'Tuần tra: đi và về', 'סיור: הלוך ושוב'],
  gatherOn: ['Сбор в точке', 'Rally at the point', 'Tập hợp tại điểm', 'כינוס בנקודה'],
  buildHint: ['Инженер выбран — выбери здание справа и тапни место', 'Builder selected — pick a building on the right and tap a spot', 'Đã chọn kỹ sư — chọn công trình và chạm vị trí', 'מהנדס נבחר — בחר מבנה מימין והקש על מקום'],
  noEng: ['Нет инженеров', 'No builders', 'Không có kỹ sư', 'אין מהנדסים'],
  followOn: ['Камера следит за выбранными', 'Camera follows the selection', 'Camera theo dõi đơn vị đã chọn', 'המצלמה עוקבת אחרי הנבחרים'],
};
const L71 = k => { const a = T71[k]; return a ? tr(a[0], a[1], a[2], a[3]) : k; };
// ---- иконки (inline SVG, в духе Material Design; цвет — currentColor)
const IC71 = (() => {
  const s = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const P = {
    fire: `<circle cx="12" cy="12" r="7" ${s}/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" ${s}/>`,
    aim: `<path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" ${s}/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>`,
    jet: `<path d="M12 2.5c3 2.8 4.2 6.6 4.2 10.5H7.8c0-3.9 1.2-7.7 4.2-10.5z" fill="currentColor"/><path d="M8.6 15.5 7.5 21l4.5-2.8 4.5 2.8-1.1-5.5" ${s}/>`,
    gren: `<circle cx="11" cy="14.5" r="6.5" fill="currentColor"/><path d="M8.5 8.3V6.2h5v2.1M13.5 6.5l4.5-3" ${s}/>`,
    reload: `<path d="M20 12a8 8 0 1 1-2.6-5.9" ${s}/><path d="M20 3.5v5h-5" ${s}/>`,
    rocket: `<path d="M5 19l1.2-4.6L15.6 5a3 3 0 0 1 4.2 4.2l-9.4 9.4z" fill="currentColor"/><path d="M4 20l2.5-.6M7.5 13.5l3 3" ${s}/>`,
    reflex: `<path d="M6 2.5h12M6 21.5h12M7 2.5c0 5 5 6.5 5 9.5s-5 4.5-5 9.5M17 2.5c0 5-5 6.5-5 9.5s5 4.5 5 9.5" ${s}/>`,
    strike: `<path d="M3 3l8 8M7.5 2.5l7 7M2.5 7.5l7 7" ${s}/><circle cx="16.5" cy="16.5" r="4.5" fill="currentColor"/>`,
    swap: `<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" ${s}/>`,
    enter: `<path d="M13 3.5h6.5v17H13M3.5 12h11M11 8l4 4-4 4" ${s}/>`,
    exit: `<path d="M11 3.5H4.5v17H11M9 12h11.5M17 8l4 4-4 4" ${s}/>`,
    auto: `<path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" ${s}/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>`,
    skills: `<path d="M13.5 2 4.5 13.5h6.5L9.5 22l9-11.5H12z" fill="currentColor"/>`,
    hud: `<path d="M12 3l9 4.8-9 4.8-9-4.8z" fill="currentColor"/><path d="M3 12.2l9 4.8 9-4.8M3 16.4l9 4.8 9-4.8" ${s}/>`,
    up: `<path d="M12 20V5M5.5 11.5 12 5l6.5 6.5" ${s}/>`, down: `<path d="M12 4v15M5.5 12.5 12 19l6.5-6.5" ${s}/>`,
    ram: `<path d="M3 12h13M11 6l6 6-6 6M20 4v16" ${s}/>`,
    burst: `<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19" ${s}/>`,
    smoke: `<path d="M7 18a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.3A3.4 3.4 0 0 1 17 18z" fill="currentColor"/>`,
    boost: `<path d="M3 6l8 6-8 6zM12 6l8 6-8 6z" fill="currentColor"/>`,
    scan: `<circle cx="12" cy="12" r="8.5" ${s}/><circle cx="12" cy="12" r="4" ${s}/><path d="M12 12l6-6" ${s}/>`,
    wrench: `<path d="M14.5 3.5a5 5 0 0 0-5 6.6L3.5 16a2.1 2.1 0 0 0 3 3l5.9-6a5 5 0 0 0 6.6-5l-3 3-2.6-.4-.4-2.6z" fill="currentColor"/>`,
    dash: `<path d="M5 6l6 6-6 6M12 6l6 6-6 6" ${s}/>`, eye: `<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" ${s}/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
    pod: `<path d="M12 3c3.5 2.5 5 6 5 10l-5 6-5-6c0-4 1.5-7.5 5-10z" fill="currentColor"/>`, target: `<circle cx="12" cy="12" r="8" ${s}/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
    army: `<circle cx="7" cy="8" r="2.6" fill="currentColor"/><circle cx="17" cy="8" r="2.6" fill="currentColor"/><circle cx="12" cy="6" r="2.8" fill="currentColor"/><path d="M2.5 19c.5-4 2.5-5.5 4.5-5.5S10 15 10.5 19M13.5 19c.5-4 2.5-5.5 4.5-5.5s4 1.5 4.5 5.5M7.5 19c.5-5 2.5-7 4.5-7s4 2 4.5 7" ${s}/>`,
    inf: `<circle cx="12" cy="6" r="3" fill="currentColor"/><path d="M6.5 21c.4-6 2.6-9 5.5-9s5.1 3 5.5 9" fill="currentColor"/>`,
    veh: `<path d="M3 15h18v4H3zM6 11h9l2 4H5zM12 11V8h8" ${s}/>`,
    drone: `<path d="M12 9l3 3-3 3-3-3zM5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4" ${s}/><circle cx="5" cy="5" r="2.2" ${s}/><circle cx="19" cy="5" r="2.2" ${s}/><circle cx="5" cy="19" r="2.2" ${s}/><circle cx="19" cy="19" r="2.2" ${s}/>`,
    box: `<path d="M4 4h4M12 4h4M20 4v4M20 12v4M20 20h-4M12 20H8M4 20v-4M4 12V8" ${s}/>`,
    follow: `<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" ${s}/><circle cx="12" cy="12" r="7.5" ${s}/>`,
    map: `<path d="M3 6l6-2.5 6 2.5 6-2.5v14.5L15 20.5l-6-2.5-6 2.5z M9 3.5v14.5M15 6v14.5" ${s}/>`,
    close: `<path d="M5 5l14 14M19 5L5 19" ${s}/>`, back: `<path d="M15 5l-7 7 7 7" ${s}/>`, check: `<path d="M4.5 12.5l5 5 10-11" ${s}/>`,
    gear: `<circle cx="12" cy="12" r="3.2" ${s}/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" ${s}/>`,
    sound: `<path d="M4 9h4l5-4.5v15L8 15H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" ${s}/>`,
    image: `<rect x="3" y="4.5" width="18" height="15" rx="2" ${s}/><path d="M3.5 17l5-5 4 4 3-3 5 5" ${s}/><circle cx="16" cy="9" r="1.6" fill="currentColor"/>`,
    touch: `<path d="M9 11.5V5a1.6 1.6 0 0 1 3.2 0v5.5M12.2 10V8.6a1.6 1.6 0 0 1 3.2 0V11M15.4 11a1.6 1.6 0 0 1 3.2 0v4.5A6.5 6.5 0 0 1 12 22c-3 0-4.2-1.5-6-4.5l-2-3.3a1.6 1.6 0 0 1 2.7-1.7L9 15" ${s}/>`,
    game: `<path d="M7 8h10a5 5 0 0 1 4.6 7l-.8 2a2.5 2.5 0 0 1-4.3.6L14.8 16H9.2l-1.7 1.6a2.5 2.5 0 0 1-4.3-.6l-.8-2A5 5 0 0 1 7 8z" ${s}/><path d="M8 11v3M6.5 12.5h3" ${s}/><circle cx="16" cy="11.5" r="1" fill="currentColor"/><circle cx="17.5" cy="13.5" r="1" fill="currentColor"/>`,
    phone: `<rect x="2.5" y="6.5" width="19" height="11" rx="2.5" ${s}/><path d="M6 12h.1M18 10.5v3" ${s}/>`,
    lang: `<circle cx="12" cy="12" r="9" ${s}/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" ${s}/>`,
    play: `<path d="M7 4.5l13 7.5-13 7.5z" fill="currentColor"/>`, save: `<path d="M5 3.5h11l3.5 3.5v13.5H4.5V3.5z M8 3.5v5h7v-5M7.5 20.5v-6h9v6" ${s}/>`,
    folder: `<path d="M3 6.5V19h18V8.5h-9L10 6H3z" ${s}/>`, star: `<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>`,
    tool: `<path d="M14.5 3.5a5 5 0 0 0-5 6.6L3.5 16a2.1 2.1 0 0 0 3 3l5.9-6a5 5 0 0 0 6.6-5l-3 3-2.6-.4-.4-2.6z" ${s}/>`,
    film: `<rect x="3" y="4" width="18" height="16" rx="1.5" ${s}/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" ${s}/>`,
    school: `<path d="M2 9l10-5 10 5-10 5z" fill="currentColor"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M21 9.5V15" ${s}/>`,
    news: `<rect x="3.5" y="4" width="17" height="16" rx="2" ${s}/><path d="M7 8.5h10M7 12h10M7 15.5h6" ${s}/>`,
    exitDoor: `<path d="M14 3.5H5v17h9M10 12h11M17.5 8.5 21 12l-3.5 3.5" ${s}/>`, restart: `<path d="M4 12a8 8 0 1 0 2.6-5.9" ${s}/><path d="M4 3.5v5h5" ${s}/>`,
    user: `<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c.6-5 3.8-7.5 8-7.5s7.4 2.5 8 7.5" fill="currentColor"/>`,
    flag: `<path d="M5 21V4M5 4h11l-2 4 2 4H5" ${s}/>`, minus: `<path d="M5 12h14" ${s}/>`, plus: `<path d="M5 12h14M12 5v14" ${s}/>`,
    hand: `<path d="M9 11.5V5a1.6 1.6 0 0 1 3.2 0v5.5M12.2 10V8.6a1.6 1.6 0 0 1 3.2 0V11M15.4 11a1.6 1.6 0 0 1 3.2 0v4.5A6.5 6.5 0 0 1 12 22c-3 0-4.2-1.5-6-4.5l-2-3.3a1.6 1.6 0 0 1 2.7-1.7L9 15" fill="rgba(0,0,0,.35)" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`,
  };
  const f = (k, cls) => `<svg class="ic71 ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${P[k] || P.target}</svg>`;
  f.P = P;
  return f;
})();
// =====================================================================
const M71 = {
  on: false, err: 0, t: 0,
  pref: { look: 'swipe', gest: 'A', pinch: 'gren', box2: false, auto: false, hud: true, v70: false, mmR: true },
  done: {}, lock: null, lostT: 0, scanT: 0, losC: new Map(), fr: { t: null, x: 0, y: 0, s: 0, a: 0, born: 0, ghosts: [], rect: null },
  tp: {}, pinch: null, tapL: null, flick: [0, 0], rj: null, possT: -9, plateT: -9, sk: false, follow: false, lastTapG: null, lastTapT: 0,
  load(){ try { Object.assign(this.pref, JSON.parse(localStorage.getItem('pm_v71m') || '{}')); } catch (e){} try { this.done = JSON.parse(localStorage.getItem('pm_v71g') || '{}') || {}; } catch (e){ this.done = {}; } },
  save(){ try { localStorage.setItem('pm_v71m', JSON.stringify(this.pref)); } catch (e){} },
  saveDone(){ try { localStorage.setItem('pm_v71g', JSON.stringify(this.done)); } catch (e){} },
  active(){ return this.on && typeof M67 !== 'undefined' && M67.active() && !this.pref.v70; },
  autoOn(){ return this.active() && this.pref.auto; },
  haptic(ms){ try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e){} },
  used(k){ if (!this.done[k]){ this.done[k] = 1; this.saveDone(); if (this.gh && this.gh.k === k) this.ghHide(); } },
  ctx(){ const c = ctrlEntity(); return typeof M67 !== 'undefined' ? M67.ctxOf(c) : 'inf'; },
  btn(id, cls, html, parent, fn, hold){
    const b = document.createElement('button'); if (id) b.id = id; b.className = cls || ''; b.innerHTML = html;
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); b.classList.add('on'); fn(e, b, 'down'); }, { passive: false });
    const up = e => { e.preventDefault(); e.stopPropagation(); if (!hold) b.classList.remove('on'); if (hold) { b.classList.remove('on'); fn(e, b, 'up'); } };
    b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
    b.addEventListener('click', e => { e.stopPropagation(); if (!e.isTrusted || e.detail === 0) fn(e, b, 'click'); });
    parent.appendChild(b); return b;
  },
  // ---------------------------------------------------------------- запуск (после M67.init)
  init(){
    if (!TOUCH.on || this.on || typeof M67 === 'undefined' || !M67.on) return;
    this.on = true; this.load();
    const root = $('touch'); if (!root) return;
    const tt = root.querySelector('.tt');
    // вверху справа: раскрывающийся список навыков
    this.bSk = this.btn('m71skb', 'm71skb', IC71('skills'), root, () => { this.sk = !this.sk; this.used('skills'); this.apply(); });
    // вверху слева: показать / скрыть второстепенный HUD
    this.bHud = this.btn('m71hudb', 'm71hudb', IC71('hud'), root, () => { this.pref.hud = !this.pref.hud; this.save(); this.apply(); emit('ui', { kind: 'ok' }); });
    // «АВТО» (захват цели)
    this.bAuto = this.btn('m71auto', 'm71auto', `${IC71('auto')}<small>${L71('auto')}</small>`, root, () => this.toggleAuto());
    this.bAuto.dataset.full = L71('autoOn');
    // правый «джойстик обзора», плашка смены бойца, подсказка жеста, подпись по долгому нажатию
    const mkDiv = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html || ''; root.appendChild(d); return d; };
    this.rjEl = mkDiv('m71rj', '<i></i>');
    this.plate = mkDiv('m71pl'); this.ghEl = mkDiv('m71gh'); this.tipEl = mkDiv('m71tip');
    this.ringEl = mkDiv('m71ring'); this.box2El = mkDiv('m71box2');
    // стратегия: кнопки типов войск, карточки отрядов, миникарта, радиальное меню
    this.rtsInit(root);
    // долгое нажатие на кнопку — полное название
    root.addEventListener('touchstart', e => {
      const b = e.target.closest && e.target.closest('button'); clearTimeout(this.tipT); clearTimeout(this.tipOffT); this.tipEl.classList.remove('on');
      if (!b || !this.active()) return;
      const full = b.dataset.full; if (!full) return;
      this.tipT = setTimeout(() => { const r = b.getBoundingClientRect(); const T = this.tipEl; T.textContent = full; T.classList.add('on');
        const w = T.offsetWidth, x = clamp(r.left + r.width / 2 - w / 2, 6 + M67.safe.l, innerWidth - w - 6 - M67.safe.r), y = r.top - T.offsetHeight - 8;
        T.style.left = x + 'px'; T.style.top = (y < 4 ? r.bottom + 8 : y) + 'px'; }, 520);
    }, { capture: true, passive: true });
    const tipOff = () => { clearTimeout(this.tipT); clearTimeout(this.tipOffT); this.tipOffT = setTimeout(() => this.tipEl.classList.remove('on'), 900); };
    root.addEventListener('touchend', tipOff, { capture: true, passive: true }); root.addEventListener('touchcancel', tipOff, { capture: true, passive: true });
    // граната: свайп вверх — бросок в захваченную цель (вариант A)
    const gb = root.querySelector('.g62b');
    if (gb){
      let s = null;
      gb.addEventListener('touchstart', e => { const t = e.changedTouches[0]; s = { id: t.identifier, x: t.clientX, y: t.clientY, t: performance.now(), fired: false }; }, { capture: true, passive: true });
      gb.addEventListener('touchmove', e => {
        if (!s || !this.active() || this.pref.gest !== 'A' || this.ctx() !== 'inf') return;
        for (const t of e.changedTouches){ if (t.identifier !== s.id) continue;
          const dx = t.clientX - s.x, dy = t.clientY - s.y;
          if (s.fired){ e.stopImmediatePropagation(); e.preventDefault(); return; }
          const tg = this.target();
          if (tg && dy < -34 && abs(dy) > abs(dx) * 1.3 && performance.now() - s.t < 700){
            s.fired = true; e.stopImmediatePropagation(); e.preventDefault();
            if (typeof G62 !== 'undefined') G62.cancel();
            this.grenadeAt(tg); this.used('gswipe');
          } else if (tg && dy < 0 && abs(dy) > abs(dx)){ e.stopImmediatePropagation(); e.preventDefault(); }
        }
      }, { capture: true, passive: false });
      gb.addEventListener('touchend', () => { s = null; }, { capture: true, passive: true });
    }
    this.sheetInit();
    addEventListener('resize', () => { this.sig = ''; });
    this.apply();
  },
  apply(){
    const a = this.active(), bc = document.body.classList;
    bc.toggle('m71', a); bc.toggle('m71auto', a && this.pref.auto); bc.toggle('m71sk', a && this.sk); bc.toggle('m71hudoff', a && !this.pref.hud);
    bc.toggle('m71gB', a && this.pref.gest === 'B');
    if (this.bAuto) this.bAuto.classList.toggle('act', !!this.pref.auto);
    if (this.bSk) this.bSk.classList.toggle('act', !!this.sk);
    if (this.bHud) this.bHud.classList.toggle('act', !this.pref.hud);
    if (typeof M67 !== 'undefined'){ M67.sig = ''; M67.t = 0; if (M67.sheet) M67.sheet.classList.toggle('m71', a); }
    if (!a){ this.setLock(null); this.rjHide(); this.radClose(); this.ghHide(); }
  },
  toggleAuto(){
    this.pref.auto = !this.pref.auto; this.save(); this.used('auto');
    if (!this.pref.auto){ this.setLock(null); if (M67.mine){ M67.mine = false; mouseL = !!TOUCH.fireT; } }
    feed(L71(this.pref.auto ? 'autoOn' : 'autoOff'), this.pref.auto ? '#ff8a7a' : '#9cf');
    emit('ui', { kind: 'ok' }); this.haptic(12); this.apply();
  },
};
// ---------------------------------------------------------------- шутер: раскладка кнопок
Object.assign(M71, {
  // слоты: LF/LJ — у левого большого пальца, R1–R4 — у правого, K1–K5 — раскрывающийся список навыков вверху справа
  MAP: {
    inf: { fire: 'LF', jet: 'LJ', grenade: 'R1', reload: 'R2', aim: 'R3', interact: 'R4', rocket: 'K1', reflex: 'K2', strike: 'K3', weap: 'K4' },
    veh: { fire: 'LF', grenade: 'LJ', aim: 'R3', interact: 'R4', reload: 'K1', reflex: 'K2', v69rep: 'K3' },
    drone: { fire: 'LF', jump: 'LJ', down: 'R1', aim: 'R3', interact: 'R4', reload: 'K1', rocket: 'K2', grenade: 'K3', d69scan: 'K4' },
    tur: { fire: 'LF', aim: 'R3', interact: 'R4' },
  },
  ICON: {
    inf: { fire: 'fire', jet: 'jet', grenade: 'gren', reload: 'reload', aim: 'aim', interact: 'enter', rocket: 'rocket', reflex: 'reflex', strike: 'strike', weap: 'swap',
           jump: 'up', down: 'down', dash: 'dash', switch: 'swap', v: 'eye', m0: 'pod', m1: 'army', m2: 'target', d69scan: 'scan', v69rep: 'wrench' },
    veh: { reload: 'burst', reflex: 'smoke', grenade: 'boost', interact: 'exit', v69rep: 'wrench' },
    drone: { reload: 'ram', jump: 'up', down: 'down', interact: 'exit', rocket: 'rocket', grenade: 'wrench', d69scan: 'scan' },
  },
  SHORT: {
    inf: { fire: 'fire', jet: 'jet', grenade: 'gren', reload: 'reload', aim: 'aim', interact: 'use', rocket: 'rocket', reflex: 'reflex', strike: 'strike', weap: 'weap' },
    veh: { reload: 'barrage', reflex: 'smoke', grenade: 'boost', interact: 'exit', v69rep: 'repair' },
    drone: { reload: 'ram', jump: 'up', down: 'down', interact: 'exit', rocket: 'rockets', grenade: 'repair', d69scan: 'scan' },
  },
  layout(r){
    const ctx = r.ctx, M = this.MAP[ctx] || this.MAP.tur, L = {};
    for (const k in r.L) if (M[k]) L[k] = M[k];
    if (ctx === 'inf' && r.L.interact) L.interact = 'R4';
    return { L, ctx };
  },
  label(b, k, ctx){
    const I = (this.ICON[ctx] && this.ICON[ctx][k]) || this.ICON.inf[k]; if (!I) return false;
    const sk = (this.SHORT[ctx] && this.SHORT[ctx][k]) || this.SHORT.inf[k];
    const Lb = (ctx === 'veh' && M67.VEH[k]) || (ctx === 'drone' && M67.DRN[k]) || M67.LAB[k];
    const short = sk ? L71(sk) : Lb ? M67.L(Lb[1], Lb[2], Lb[3]) : k;
    const ring = (k === 'jet' && ctx === 'inf') || (k === 'fire') ? '<b class="rg71"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" pathLength="100"/></svg></b>' : '';
    const h = `${IC71(I)}<small>${short}</small>${ring}`;
    if (b._m67h !== h){ b._m67h = h; b.innerHTML = h; }
    b.dataset.full = Lb ? M67.L(Lb[1], Lb[2], Lb[3]) : short;
    return true;
  },
  // кнопка гранаты: значок, число, кольцо восстановления, стрелка «свайп вверх»
  grenBtn(){
    const b = document.querySelector('#touch .g62b'); if (!b || !S.kit) return;
    const c = ctrlEntity(); if (c && c.cls !== 'inf') return;
    const K = G62.kit(), fr = K.gren >= G62.MAX ? 1 : clamp(1 - K.grenCd / G62.RECH, 0, 1);
    const sw = this.pref.gest === 'A' && !!this.target();
    const sig = 'm71' + K.gren + ':' + Math.round(fr * 20) + (G62.hold ? 'h' : '') + (sw ? 's' : '') + LANG.cur;
    if (sig === G62.btnSig) return;
    G62.btnSig = sig; b._m67h = '';
    b.innerHTML = `${IC71('gren')}<sup>${K.gren}</sup><small>${L71('gren')}</small><b class="rg71 gr"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" pathLength="100" style="stroke-dashoffset:${(100 - fr * 100).toFixed(1)}"/></svg></b><em class="sw71">${IC71('up')}</em>`;
    b.dataset.full = M67.L(...T71.gren.slice(0, 3)) + (this.pref.gest === 'A' ? ' · ' + tr('свайп вверх — в цель', 'swipe up — at the target', 'vuốt lên — vào mục tiêu', 'החלקה למעלה — אל המטרה') : '');
    b.classList.toggle('g62e', K.gren <= 0); b.classList.toggle('g62h', !!G62.hold); b.classList.toggle('m71sw', sw);
  },
  // кольца заполнения: ранец — топливо; огонь — пока держишь
  rings(){
    const c = ctrlEntity(), box = $('touch'); if (!box) return;
    if (keys[SET.bind.run]){ this.jetH = (this.jetH || 0) + 0.15; if (this.jetH > 0.4) this.used('jet'); } else this.jetH = 0;
    const jb = box.querySelector('.tf.fps > [data-s="LJ"] .rg71 circle');
    if (jb && c && c.jet){ const f = clamp(c.energy / c.jet.emax, 0, 1); const v = (100 - f * 100).toFixed(0); if (jb._v !== v){ jb._v = v; jb.style.strokeDashoffset = v; } }
    const fb = box.querySelector('.tf.fps > [data-s="LF"] .rg71 circle');
    if (fb){ const on = !!TOUCH.fireT; this.fireHold = on ? (this.fireHold || 0) + 0.15 : 0; const v = on ? (100 - min(1, this.fireHold / 1.2) * 100).toFixed(0) : '100'; if (fb._v !== v){ fb._v = v; fb.style.strokeDashoffset = v; } }
  },
});
// ---------------------------------------------------------------- захват цели («АВТО», как в Syphon Filter)
Object.assign(M71, {
  // цель для рамки и жестов: захват «АВТО», без него — цель помощи в прицеливании
  target(){ if (!this.active()) return null; const t = this.pref.auto ? this.lock : (typeof AIMA !== 'undefined' ? AIMA.tgt : null); return t && t.alive ? t : null; },
  eyeFwd(c){ return c.cls === 'inf' ? [gunEye(c), c.fwd] : [c.pos, c.aim]; },
  rangeOf(c){ const W = c.cls === 'inf' && S.kit ? WEAPONS[S.kit.w] : null; return min((W && W.range) || 150, 170); },
  losOk(e, eye){
    const k = this.losC.get(e), now = S.rtime;
    if (k && now - k.t < 0.2) return k.v;
    const v = los(eye, centerOf(e)); this.losC.set(e, { v, t: now });
    if (this.losC.size > 200) this.losC.clear();
    return v;
  },
  cand(e, eye, fwd, rng, cosMin){
    if (!e.alive || e.cls === 'bld' || e.cls === 'hq') return -1;
    const c = centerOf(e), v = sub(c, eye), d = len(v);
    if (d > rng || d < 1.2) return -1;
    const cs = dot(v, fwd) / d; if (cs < cosMin) return -1;
    if (e.team === 1 && e.seen && e.seen[0] <= 0 && d > 25) return -1;
    if (!this.losOk(e, eye)) return -1;
    return acos(clamp(cs, -1, 1)) * 40 + d;
  },
  nearest(eye, fwd, rng, team){
    let best = null, bs = 1e9;
    for (const e of TGT[team]){ const s = this.cand(e, eye, fwd, rng, 0.55); if (s >= 0 && s < bs){ bs = s; best = e; } }
    return best;
  },
  setLock(t){
    if (t === this.lock) return;
    const F = this.fr;
    if (this.lock && F.vis) F.ghosts.push({ x: F.x, y: F.y, s: F.s, t0: S.rtime });
    if (t && this.lock && F.vis){ F.sw = true; } else { F.sw = false; F.born = S.rtime; F.s = 0; }
    this.lock = t; this.lostT = 0;
    if (t){ this.haptic(6); if (typeof AU !== 'undefined' && AU.ready && AU.ready()) try { AU.osc(AU.sfx, AU.ctx.currentTime, 0.05, 'square', 1800, 2400, 0.025); } catch (e){} }
  },
  // шаг захвата: вызывается вместо помощи в прицеливании (AIMA.step), true — цель есть
  autoStep(rdt){
    const c = ctrlEntity();
    if (!c || S.mode !== 'fps' || S.attract || CAMFX.busy() || !(c.cls === 'inf' || c.cls === 'drone') || MENU.isOpen() || S.paused){ this.setLock(null); return false; }
    const [eye, fwd] = this.eyeFwd(c), rng = this.rangeOf(c);
    let t = this.lock;
    if (t){ const ok = t.alive && this.cand(t, eye, fwd, rng * 1.1, 0.2) >= 0; if (!ok){ this.lostT += rdt; if (!t.alive || this.lostT > 0.45) t = null; } else this.lostT = 0; }
    if (!t){ this.scanT -= rdt; if (this.scanT <= 0){ this.scanT = 0.12; t = this.nearest(eye, fwd, rng, c.team); } }
    this.setLock(t);
    if (!t) return false;
    // плавно доворачиваем прицел на цель (игрок двигается джойстиком — получается стрейф / кружение вокруг цели)
    const to = norm(sub(centerOf(t), eye)), ang = acos(clamp(dot(fwd, to), -1, 1));
    const step = min(1, rdt * (ang > 0.35 ? 11 : 8));
    const nf = norm(add(mul(fwd, 1 - step), mul(to, step)));
    if (c.cls === 'inf'){ if (abs(dot(nf, c.up)) < 0.995) c.fwd = nf; } else c.aim = nf;
    AIMA.tgt = t; AIMA.sens = 1;
    return true;
  },
  // стрельба в «АВТО»: прицел на цели — огонь
  autoFire(dt){
    const c = ctrlEntity(), t = this.lock;
    const fps = S.mode === 'fps' && !S.attract && !S.over && !MENU.isOpen() && !S.paused;
    let on = false;
    if (fps && c && t && t.alive && !(typeof G62 !== 'undefined' && G62.hold) && !M67.open){
      const K = S.kit, reloading = c.cls === 'inf' && K && K.reloadT > 0;
      if (!reloading){ const [eye, fwd] = this.eyeFwd(c), v = sub(centerOf(t), eye), d = len(v);
        const hr = t.cls === 'inf' ? 0.5 : (typeof hitRadiusRay === 'function' ? hitRadiusRay(t) : hitRadius(t));
        on = acos(clamp(dot(v, fwd) / d, -1, 1)) < Math.atan(hr / d) + 2.2 * PI / 180; }
    }
    if (on){ mouseL = true; M67.mine = true; this.firing = true; }
    else if (this.firing){ this.firing = false; M67.mine = false; if (!TOUCH.fireT) mouseL = false; }
    if (t) M67.auto = on;
  },
  // свайп при захвате — на соседнюю цель в сторону свайпа (мягкий магнит)
  flickTo(dx, dy){
    const c = ctrlEntity(), cur = this.lock; if (!c || !cur) return false;
    const [eye, fwd] = this.eyeFwd(c), rng = this.rangeOf(c);
    const p0 = project(centerOf(cur)); if (!p0) return false;
    const dl = hypot(dx, dy), ux = dx / dl, uy = dy / dl;
    let best = null, bs = 1e9;
    for (const e of TGT[c.team]){
      if (e === cur || this.cand(e, eye, fwd, rng, 0.25) < 0) continue;
      const p = project(centerOf(e)); if (!p) continue;
      const vx = p[0] - p0[0], vy = p[1] - p0[1], d = hypot(vx, vy); if (d < 4) continue;
      const cs = (vx * ux + vy * uy) / d; if (cs < 0.45) continue;
      const s = d * (1.6 - cs);
      if (s < bs){ bs = s; best = e; }
    }
    if (best){ this.setLock(best); this.used('flick'); return true; }
    return false;
  },
  rocketAt(t){
    const u = ctrlEntity(); if (!u || !t) return;
    if (u.cls === 'inf'){
      if (u.rocketCd > 0){ feed(L71('noRocket') + ` · ${Math.ceil(u.rocketCd)} ${tr('с', 's', 'giây', 'ש׳')}`, '#f88'); emit('ui', { kind: 'deny' }); return; }
      const eye = add(add(u.pos, mul(u.up, RULES.EYE)), mul(norm(cross(u.fwd, u.up)), 0.25));
      fireRocket(u, norm(sub(centerOf(t), eye)));
    } else TOUCH.key(SET.bind.rocket);
    feed(L71('rocketAt'), '#ffb070'); this.haptic(18);
  },
  grenadeAt(t){
    const u = ctrlEntity(); if (!u || u.cls !== 'inf' || !t || typeof G62 === 'undefined') return;
    if (!PROG.has('grenade')){ HINTS.denied('grenade'); return; }
    const K = G62.kit(); if (!K || K.gren <= 0){ feed(L71('noGren'), '#f88'); G62.sfx('empty'); return; }
    const goal = t.pos, f0 = u.fwd, Up = norm(u.pos), hz = tangent(sub(goal, u.pos), Up);
    G62.hold = { u, t0: S.rtime - 1, power: 1, under: false };
    const test = (el, pw) => { u.fwd = norm(add(mul(hz, cos(el)), mul(Up, sin(el)))); G62.hold.power = pw; G62.path = null; G62.fresh = false; const P = G62.predict(u, true); return dist(P.land || P.end, goal); };
    let be = 0, bp = 1, bd = 1e9;
    for (let i = 0; i < 11; i++){ const el = -0.45 + i * 0.13, d = test(el, 1); if (d < bd){ bd = d; be = el; } }
    for (const pw of [0.85, 0.7, 0.55, 0.4]) for (const de of [-0.06, 0, 0.06]){ const d = test(be + de, pw); if (d < bd){ bd = d; be = be + de; bp = pw; } }
    u.fwd = norm(add(mul(hz, cos(be)), mul(Up, sin(be)))); G62.hold.power = bp; G62.path = null;
    G62.release(u);
    u.fwd = f0;
    feed(L71('grenAt'), '#ffd27a'); this.haptic(18);
  },
});
// ---------------------------------------------------------------- красная рамка захвата
Object.assign(M71, {
  RED: '255,59,48',
  drawLock(dt){
    const F = this.fr, g = octx, t = S.mode === 'fps' && !S.attract && !MENU.isOpen() && !CAMFX.busy() ? this.target() : null;
    F.rect = null;
    if (t !== F.t){ if (F.t && F.vis && t){ F.sw = true; } else if (t){ F.born = S.rtime; F.s = 0; F.sw = false; } if (F.t && F.vis && !t) F.ghosts.push({ x: F.x, y: F.y, s: F.s, t0: S.rtime }); F.t = t; }
    F.vis = false;
    if (t){
      const p = project(centerOf(t));
      if (p){
        const hr = t.cls === 'inf' ? 0.75 : hitRadius(t) * 0.9;
        const ts = clamp(hr / (p[2] * S.cam.fov) * innerHeight * 2.3, 34, 170);
        const age = S.rtime - F.born, k = 1 - Math.exp(-dt * 26);
        if (F.s <= 0){ F.x = p[0]; F.y = p[1]; F.s = ts * 2.2; }
        if (F.sw){ F.x += (p[0] - F.x) * k; F.y += (p[1] - F.y) * k; F.s += (ts - F.s) * k; if (hypot(p[0] - F.x, p[1] - F.y) < 2) F.sw = false; }
        else { F.x = p[0]; F.y = p[1]; const c = clamp(age / 0.15, 0, 1); F.s = ts * (1 + 1.2 * (1 - c) * (1 - c)); }
        F.vis = true;
        const a = this.pref.auto ? 1 : 0.62;
        this.frame71(g, F.x, F.y, F.s, a, S.rtime, true);
        F.rect = [F.x - F.s / 2 - 14, F.y - F.s / 2 - 14, F.x + F.s / 2 + 14, F.y + F.s / 2 + 14];
      }
    }
    // потерянная цель: рамка разлетается и гаснет
    F.ghosts = F.ghosts.filter(q => S.rtime - q.t0 < 0.32);
    for (const q of F.ghosts){ const k = (S.rtime - q.t0) / 0.32; this.frame71(g, q.x, q.y, q.s * (1 + k * 0.9), (1 - k) * 0.9, S.rtime, false); }
  },
  frame71(g, x, y, s, a, tm, ticks){
    const h = s / 2, Lc = s * 0.27 * (1 + 0.07 * sin(tm * 9)), c = `rgba(${this.RED},${a.toFixed(2)})`;
    g.save(); g.strokeStyle = c; g.lineWidth = 1.8; g.lineCap = 'square';
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]){ const cx = x + sx * h, cy = y + sy * h; g.moveTo(cx - sx * Lc, cy); g.lineTo(cx, cy); g.lineTo(cx, cy - sy * Lc); }
    g.stroke();
    if (ticks){
      g.fillStyle = c; const o = 5;
      g.fillRect(x - 1, y - h - o - 2, 2, 3); g.fillRect(x - 1, y + h + o - 1, 2, 3); g.fillRect(x - h - o - 2, y - 1, 3, 2); g.fillRect(x + h + o - 1, y - 1, 3, 2);
      g.globalAlpha = a * 0.55; g.fillRect(x - 1, y - 1, 2, 2);
    }
    g.restore();
  },
});
// ---------------------------------------------------------------- сенсор в шутере: обзор, жесты
Object.assign(M71, {
  rjShow(x0, y0, dx, dy){ const j = this.rjEl; if (!j) return; j.style.display = 'block'; j.style.left = (x0 - 55) + 'px'; j.style.top = (y0 - 55) + 'px'; j.firstChild.style.transform = `translate(${dx * 38}px,${dy * 38}px)`; },
  rjHide(){ if (this.rjEl) this.rjEl.style.display = 'none'; this.rj = null; },
  fpsStart(e){
    for (const tc of e.changedTouches){
      const id = tc.identifier, x = tc.clientX, y = tc.clientY;
      const joy = !!(TOUCH.joy && TOUCH.joy.id === id);
      this.tp[id] = { x0: x, y0: y, x, y, t0: performance.now(), joy, right: x >= innerWidth * 0.42, tr: 0 };
      if (TOUCH.look && TOUCH.look.id === id){ TOUCH.look.x0 = x; TOUCH.look.y0 = y; this.flick = [0, 0]; this.flickArm = true; }
    }
    const nj = Object.keys(this.tp).filter(k => !this.tp[k].joy);
    if (nj.length >= 2 && this.pref.gest === 'B' && !this.pinch){
      const a = this.tp[nj[0]], b = this.tp[nj[1]];
      this.pinch = { a: +nj[0], b: +nj[1], d0: hypot(a.x - b.x, a.y - b.y), done: false };
      TOUCH.look = null; this.rjHide();
    }
  },
  fpsMove(e){
    let handled = false;
    for (const tc of e.changedTouches){
      const P = this.tp[tc.identifier]; if (!P) continue;
      P.tr += hypot(tc.clientX - P.x, tc.clientY - P.y); P.x = tc.clientX; P.y = tc.clientY;
    }
    if (this.pinch){
      const a = this.tp[this.pinch.a], b = this.tp[this.pinch.b];
      if (a && b && !this.pinch.done){ const d = hypot(a.x - b.x, a.y - b.y); if (abs(d - this.pinch.d0) > 44){ this.pinch.done = true; this.pinchAct(d > this.pinch.d0); } }
      return true;
    }
    const L = TOUCH.look; if (!L) return false;
    for (const tc of e.changedTouches){
      if (tc.identifier !== L.id) continue;
      const x = tc.clientX, y = tc.clientY, P = this.tp[L.id];
      if (P && P.tr > 60) this.used('look');
      const locked = this.pref.auto && this.lock;
      if (this.pref.look === 'joy'){
        let dx = (x - L.x0) / 55, dy = (y - L.y0) / 55; const l = hypot(dx, dy); if (l > 1){ dx /= l; dy /= l; }
        this.rj = l < 0.14 ? [0, 0] : [dx, dy]; this.rjShow(L.x0, L.y0, dx, dy);
        if (locked){ if (l > 0.6 && this.flickArm){ this.flickArm = false; this.flickTo(dx, dy); } else if (l < 0.3) this.flickArm = true; this.rj = [0, 0]; }
        handled = true;
      } else if (locked){
        this.flick[0] += x - L.x; this.flick[1] += y - L.y; L.x = x; L.y = y;
        if (hypot(this.flick[0], this.flick[1]) > 38){ if (this.flickArm){ this.flickArm = false; this.flickTo(this.flick[0], this.flick[1]); } this.flick = [0, 0]; }
        handled = true;
      }
    }
    return handled;
  },
  fpsEnd(e){
    const now = performance.now();
    for (const tc of e.changedTouches){
      const P = this.tp[tc.identifier]; delete this.tp[tc.identifier];
      if (TOUCH.look && TOUCH.look.id === tc.identifier){ this.rjHide(); this.flickArm = true; }
      if (!P || P.joy || !P.right || this.pinch) continue;
      const tap = now - P.t0 < 260 && P.tr < 16;
      if (!tap) continue;
      const x = tc.clientX, y = tc.clientY, R = this.fr.rect;
      // вариант A: тап по красной рамке — ракета в цель
      if (this.pref.gest === 'A' && R && x >= R[0] && x <= R[2] && y >= R[1] && y <= R[3] && this.target()){ this.rocketAt(this.target()); this.used('frame'); this.tapL = null; continue; }
      // двойной тап по правой половине — рефлекс (замедление)
      if (this.tapL && now - this.tapL.t < 330 && hypot(x - this.tapL.x, y - this.tapL.y) < 70){
        this.tapL = null; const c = ctrlEntity();
        if (c && c.cls === 'inf'){ toggleReflex(); this.used('dtap'); this.haptic(20); }
        continue;
      }
      this.tapL = { t: now, x, y };
    }
    if (this.pinch && (!this.tp[this.pinch.a] || !this.tp[this.pinch.b])) this.pinch = null;
  },
  // щипок (вариант B): по настройке — приближение прицела, граната или ракета в цель
  pinchAct(out){
    this.used('pinch'); this.haptic(15);
    const m = this.pref.pinch, t = this.target();
    if (m === 'zoom' || ((m === 'gren' || m === 'rocket') && !t)){
      if (m !== 'zoom'){ feed(tr('Нет цели в рамке', 'No target locked', 'Không có mục tiêu', 'אין מטרה'), '#f88'); return; }
      TOUCH.aimOn = out; mouseR = out; document.querySelectorAll('#touch .adsb').forEach(b => b.classList.toggle('on', out)); return;
    }
    if (m === 'gren' && this.ctx() === 'inf') this.grenadeAt(t); else this.rocketAt(t);
  },
  look(dt){
    if (!this.rj || !TOUCH.look || this.pref.look !== 'joy') return;
    const [dx, dy] = this.rj, l = hypot(dx, dy); if (l <= 0) return;
    const k = Math.pow(l, 1.6) * (TOUCH.sens || 1);
    lookBy(dx / l * k * 950 * dt, dy / l * k * 560 * dt);
  },
});
// ---------------------------------------------------------------- плашка смены бойца, подсказки жестов, кадр
Object.assign(M71, {
  onPossess(u){
    if (!this.active() || S.attract || !u) return;
    this.possT = S.rtime; S.flashT = 0;
    const name = u.cls === 'inf' ? (typeof PRIO70 !== 'undefined' ? PRIO70.icon(PRIO70.clsOf(u)) + ' ' + N2(roleOf(u).n) : N2(roleOf(u).n)) + ' · ' + groupLabel(u.squad) : groupLabel(u);
    this.plate.innerHTML = `${IC71('swap')}<span>${uixEsc(name)}</span>`;
    this.plate.classList.remove('on'); void this.plate.offsetWidth; this.plate.classList.add('on');
    clearTimeout(this.plT); this.plT = setTimeout(() => this.plate.classList.remove('on'), 1700);
    this.setLock(null);
  },
  // подсказки жестов: по одной, пока жест не сделан хотя бы раз
  GH: [
    { k: 'look', m: 'fps', g: 'swipe', at: () => [innerWidth * 0.72, innerHeight * 0.42], t: ['Свайп справа — обзор', 'Swipe on the right — look', 'Vuốt bên phải — nhìn', 'החלקה מימין — מבט'] },
    { k: 'jet', m: 'fps', g: 'hold', inf: 1, sel: '[data-s="LJ"]', t: ['Держи — полёт', 'Hold — fly', 'Giữ — bay', 'החזק — טיסה'] },
    { k: 'auto', m: 'fps', g: 'tap', sel: '#m71auto', t: ['АВТО — захват цели', 'AUTO — target lock', 'TỰ ĐỘNG — khóa mục tiêu', 'אוטו — נעילת מטרה'] },
    { k: 'frame', m: 'fps', g: 'tap', A: 1, lock: 1, at: () => M71.fr.rect ? [(M71.fr.rect[0] + M71.fr.rect[2]) / 2, M71.fr.rect[3] + 26] : null, t: ['Тап по рамке — ракета', 'Tap the frame — rocket', 'Chạm khung — tên lửa', 'הקשה על המסגרת — רקטה'] },
    { k: 'gswipe', m: 'fps', g: 'swipe', A: 1, lock: 1, inf: 1, sel: '.g62b', t: ['Свайп вверх — граната в цель', 'Swipe up — grenade at target', 'Vuốt lên — lựu đạn', 'החלקה למעלה — רימון'] },
    { k: 'pinch', m: 'fps', g: 'pinch', B: 1, lock: 1, at: () => [innerWidth * 0.7, innerHeight * 0.55], t: ['Щипок — граната / ракета / прицел', 'Pinch — grenade / rocket / zoom', 'Chụm — lựu đạn / tên lửa', 'צביטה — רימון / רקטה / זום'] },
    { k: 'dtap', m: 'fps', g: 'dtap', inf: 1, reflex: 1, at: () => [innerWidth * 0.66, innerHeight * 0.3], t: ['2× тап справа — рефлекс', 'Double tap right — reflex', 'Chạm 2 lần — phản xạ', 'הקשה כפולה מימין — רפלקס'] },
    { k: 'rtap', m: 'rts', g: 'tap', at: () => [innerWidth * 0.5, innerHeight * 0.45], t: ['Тап — выбрать, ещё тап — приказ', 'Tap — select, tap again — order', 'Chạm — chọn, chạm nữa — ra lệnh', 'הקשה — בחירה, הקשה נוספת — פקודה'] },
    { k: 'rhold', m: 'rts', g: 'hold', at: () => [innerWidth * 0.42, innerHeight * 0.55], t: ['Держи — меню приказов, держи и тяни — рамка', 'Hold — command menu, hold and drag — box', 'Giữ — menu lệnh, giữ và kéo — khung', 'החזק — תפריט פקודות, החזק וגרור — מסגרת'] },
    { k: 'rpinch', m: 'rts', g: 'pinch', at: () => [innerWidth * 0.5, innerHeight * 0.32], t: ['Щипок — масштаб, поворот двумя пальцами', 'Pinch — zoom, twist — rotate', 'Chụm — thu phóng, xoay 2 ngón — xoay', 'צביטה — זום, סיבוב בשתי אצבעות'] },
  ],
  ghStep(){
    const fps = S.mode === 'fps' && !S.attract && !MENU.isOpen(), rts = S.mode === 'rts' && !S.attract && !MENU.isOpen();
    if ((!fps && !rts) || M67.open || (typeof TUT !== 'undefined' && TUT.on) || this.radOpen){ this.ghHide(); return; }
    this.modeT = this.lastMode === S.mode ? (this.modeT || 0) + 0.15 : 0; this.lastMode = S.mode;
    if (this.modeT < 2.5){ this.ghHide(); return; }
    const c = ctrlEntity(), inf = c && c.cls === 'inf';
    const ok = h => !this.done[h.k] && h.m === S.mode && (!h.A || this.pref.gest === 'A') && (!h.B || this.pref.gest === 'B') && (!h.inf || inf) && (!h.lock || this.target()) && (!h.reflex || PROG.has('reflex'));
    let h = this.gh && ok(this.gh) ? this.gh : null;
    if (h && S.rtime - this.ghT > 14){ h = null; this.ghSkip = (this.ghSkip || 0) + 1; }
    if (!h){ const L = this.GH.filter(ok); if (!L.length){ this.ghHide(); this.gh = null; return; } h = L[(this.ghSkip || 0) % L.length]; this.gh = h; this.ghT = S.rtime; }
    let at = null;
    if (h.sel){ const el = document.querySelector(h.sel); if (el){ const r = el.getBoundingClientRect(); if (r.width) at = r.left + r.width / 2 > innerWidth / 2 ? [r.left - 8, r.top + r.height / 2, 'l'] : [r.right + 8, r.top + r.height / 2, 'r']; } }
    else if (h.at) at = h.at();
    if (!at){ this.ghHide(); return; }
    const E = this.ghEl, key = h.k + LANG.cur;
    if (E._k !== key){ E._k = key; E.className = 'g-' + h.g; E.innerHTML = `<span class="gi">${IC71('hand')}<i></i><i></i></span><b>${tr(h.t[0], h.t[1], h.t[2], h.t[3])}</b>`; }
    E.style.display = 'flex';
    const w = E.offsetWidth, hh = E.offsetHeight, s = M67.safe;
    let x = at[2] === 'l' ? at[0] - w : at[2] === 'r' ? at[0] : at[0] - w / 2, y = at[1] - hh / 2;
    x = clamp(x, s.l + 6, innerWidth - s.r - w - 6); y = clamp(y, 50, innerHeight - s.b - hh - 6);
    E.style.left = x + 'px'; E.style.top = y + 'px';
  },
  ghHide(){ if (this.ghEl) this.ghEl.style.display = 'none'; },
  frame(dt){
    if (!this.on) return;
    const a = this.active();
    if (a !== this.wasA){ this.wasA = a; this.apply(); }
    if (!a) return;
    if (this.pref.auto) this.autoFire(dt);
    this.look(dt);
    if (S.rtime - this.possT < 0.6) S.flashT = 0;
    this.t -= dt; if (this.t > 0) return; this.t = 0.15;
    const fps = S.mode === 'fps' && !S.attract && !MENU.isOpen(), c = ctrlEntity();
    const ctx = this.ctx(), canAuto = fps && c && (c.cls === 'inf' || c.cls === 'drone');
    document.body.classList.toggle('m71na', !canAuto);
    if (fps){ this.rings(); if (typeof G62 !== 'undefined') G62.touchBtn(); }
    if (this.sk && !fps) { this.sk = false; this.apply(); }
    this.rtsFrame(S.mode === 'rts' && !S.attract && !MENU.isOpen());
    this.ghStep();
    if (this.lang !== LANG.cur){ this.lang = LANG.cur; this.relabel(); }
  },
  relabel(){
    if (this.bAuto) this.bAuto.innerHTML = `${IC71('auto')}<small>${L71('auto')}</small>`;
    if (this.bAuto) this.bAuto.dataset.full = L71('autoOn');
    if (this.bSk) this.bSk.dataset.full = L71('skills');
    if (this.bHud) this.bHud.dataset.full = tr('Показать / скрыть второстепенный HUD', 'Show / hide the secondary HUD', 'Hiện / ẩn HUD phụ', 'הצג / הסתר HUD משני');
    M67.sig = ''; if (this.rail) this.railBuild();
  },
});
// ---------------------------------------------------------------- стратегия на телефоне
Object.assign(M71, {
  rtsInit(root){
    this.rail = document.createElement('div'); this.rail.id = 'm71rail'; root.appendChild(this.rail);
    this.sqEl = document.createElement('div'); this.sqEl.id = 'm71sq'; root.appendChild(this.sqEl);
    this.rad = document.createElement('div'); this.rad.id = 'm71rad'; root.appendChild(this.rad);
    this.bMM = this.btn('m71mmb', 'm71mmb', IC71('map'), root, () => { this.pref.mmR = !this.pref.mmR; this.save(); emit('ui', { kind: 'ok' }); this.mmBtn(); });
    this.bZi = this.btn('m71zi', 'm71zb', IC71('plus'), root, () => { if (typeof rtsZoomN === 'function') rtsZoomN(-2); });
    this.bZo = this.btn('m71zo', 'm71zb', IC71('minus'), root, () => { if (typeof rtsZoomN === 'function') rtsZoomN(2); });
    this.railBuild();
    const tapSq = (e, b) => {
      const i = +b.dataset.i, g = this.squads()[i]; if (!g) return;
      const now = performance.now(), dbl = this.sqTap && this.sqTap.i === i && now - this.sqTap.t < 380;
      this.sqTap = { i, t: now };
      S.sel.clear(); S.selB = null; S.sel.add(g); this.haptic(8); emit('ui', { kind: 'ok' });
      if (dbl){ const p = leaderPos(g); if (p) flyCamTo(p); }
    };
    for (let i = 0; i < 3; i++){ const b = this.btn('', 'm71sqc', '', this.sqEl, tapSq); b.dataset.i = i; }
  },
  RAIL: [['army', 'army'], ['inf', 'inf'], ['veh', 'veh'], ['drones', 'drone'], ['eng', 'wrench'], ['box', 'box'], ['autonom', 'reload'], ['follow', 'follow']],
  railBuild(){
    this.rail.innerHTML = '';
    for (const [k, ic] of this.RAIL){
      const b = this.btn('', 'm71r', `${IC71(ic)}<small>${L71(k)}</small>`, this.rail, () => this.railAct(k));
      b.dataset.k = k; b.dataset.full = L71(k);
    }
  },
  squads(){ return S.squads.filter(g => g.team === 0 && groupAlive(g)).slice(0, 3); },
  selectSet(L, k){
    S.sel.clear(); S.selB = null; for (const g of L) S.sel.add(g);
    if (!L.length){ feed(L71('none'), '#f88'); emit('ui', { kind: 'deny' }); return; }
    emit('ui', { kind: 'ok' }); this.haptic(8); HINTS.used('select');
    feed(`${L71(k)}: ${L.length}`, TEAM[0].css);
  },
  railAct(k){
    const all = groupsOf(0).filter(groupAlive);
    if (k === 'army') this.selectSet(all.filter(g => g.cls !== 'builder'), k);
    else if (k === 'inf') this.selectSet(all.filter(isSquad), k);
    else if (k === 'veh') this.selectSet(all.filter(g => g.cls === 'tank'), k);
    else if (k === 'drones') this.selectSet(all.filter(g => g.cls === 'drone'), k);
    else if (k === 'eng') this.selectSet(S.builders.filter(b => b.alive && b.team === 0), k);
    else if (k === 'box'){ TOUCH.boxMode = !TOUCH.boxMode; TOUCH.orderMode = false; this.used('rhold'); }
    else if (k === 'autonom'){ if (typeof toggleAuto66 === 'function'){ if (!selGroups().length) M67.selectArmy(); toggleAuto66(); } }
    else if (k === 'follow'){ this.follow = !this.follow; if (this.follow) feed(L71('followOn'), '#9cf'); emit('ui', { kind: 'ok' }); }
    this.railState();
  },
  railState(){
    if (!this.rail) return;
    const sel = selGroups(), on = typeof isAuto66 === 'function' && sel.length && sel.every(isAuto66);
    for (const b of this.rail.children){
      const k = b.dataset.k;
      b.classList.toggle('act', k === 'box' ? !!TOUCH.boxMode : k === 'follow' ? this.follow : k === 'autonom' ? !!on : false);
      if (k === 'autonom'){ const t = L71(on ? 'autonom' : 'manual'); const sm = b.querySelector('small'); if (sm && sm.textContent !== t) sm.textContent = t; }
    }
  },
  sqState(){
    const L = this.squads(), sel = selGroups();
    [...this.sqEl.children].forEach((b, i) => {
      const g = L[i]; b.style.display = g ? '' : 'none'; if (!g) return;
      const [h, m] = cardHP(g.units.filter(u => u.alive)), f = m ? h / m : 0;
      const html = `<b>${i + 1}</b><i>${uixEsc(cardGroupIcon(g))}</i><s style="width:${Math.round(f * 100)}%"></s>`;
      if (b._h !== html){ b._h = html; b.innerHTML = html; }
      b.dataset.full = groupLabel(g); b.classList.toggle('act', sel.length === 1 && sel[0] === g);
    });
  },
  mmBtn(){
    const b = this.bMM; if (!b) return;
    b.classList.toggle('min', !this.pref.mmR);
    const h = (this.pref.mmR ? 'x' : 'm') + LANG.cur;
    if (this.pref.mmR){ const R = MM.R || 36, s = M67.safe; b.style.left = (s.l + 8 + R * 4 + 16) + 'px'; b.style.bottom = (s.b + 8 + R * 2 - 30) + 'px'; if (b._h !== h) b.innerHTML = IC71('close'); }
    else { b.style.left = (M67.safe.l + 8) + 'px'; b.style.bottom = (M67.safe.b + 40) + 'px'; if (b._h !== h) b.innerHTML = IC71('map'); }
    b._h = h;
    b.dataset.full = tr('Миникарта: показать / свернуть (тап по карте — камера туда)', 'Minimap: show / hide (tap the map to jump there)', 'Bản đồ nhỏ: hiện / ẩn', 'מפה: הצג / הסתר');
  },
  rtsFrame(rts){
    document.body.classList.toggle('m71box2', rts && this.pref.box2);
    if (!rts){ this.radClose(); this.follow = this.follow && S.mode === 'rts'; return; }
    this.railState(); this.sqState(); this.mmBtn(); this.patrolStep();
    if (this.follow){ const sel = selGroups(); const p = sel.length ? leaderPos(sel[0]) : null; if (p && !S.camFly) rtsLookAt(p); }
    const cb = M67.bCam; if (cb && cb.className === 'min'){ cb.style.left = (M67.safe.l + 58) + 'px'; }
  },
  // ---- касания стратегии
  rtsStart(e){
    if (this.radOpen) this.radClose();
    if (TOUCH.boxMode || S.place || S.cast) return;
    const n = e.touches.length;
    if (n >= 2){
      clearTimeout(this.holdT); this.ringEl.style.display = 'none';
      if (TOUCH.rts){ TOUCH.rts = null; }
      if (this.pref.box2){ TOUCH.pinch = null; const a = e.touches[0], b = e.touches[1]; this.b2 = { a: a.identifier, b: b.identifier, ax: a.clientX, ay: a.clientY, bx: b.clientX, by: b.clientY }; this.box2Draw(); }
      else this.used('rpinch');
      return;
    }
    const r = TOUCH.rts; if (!r || r._m71) return;
    r._m71 = 1; clearTimeout(TOUCH.longT);
    clearTimeout(this.holdT);
    this.holdT = setTimeout(() => { const q = TOUCH.rts; if (q && q === r && !q.moved){ q.armed = true; this.haptic(14); const R = this.ringEl; R.style.left = (q.x - 30) + 'px'; R.style.top = (q.y - 30) + 'px'; R.style.display = 'block'; } }, 380);
  },
  rtsMove(e){
    if (this.b2){
      for (const t of e.touches){ if (t.identifier === this.b2.a){ this.b2.ax = t.clientX; this.b2.ay = t.clientY; } if (t.identifier === this.b2.b){ this.b2.bx = t.clientX; this.b2.by = t.clientY; } }
      this.box2Draw(); return true;
    }
    const r = TOUCH.rts; if (!r || !r.armed) { if (r && r.moved) this.follow = false; return false; }
    for (const t of e.changedTouches){
      if (t.identifier !== r.id) continue;
      r.x = t.clientX; r.y = t.clientY; S.mouse = [r.x, r.y];
      if (!r.box && hypot(r.x - r.x0, r.y - r.y0) > 14){ r.box = true; this.ringEl.style.display = 'none'; TOUCH.mouse('mousedown', r.x0, r.y0, 0); this.used('rhold'); }
      if (r.box) dispatchEvent(new MouseEvent('mousemove', { clientX: r.x, clientY: r.y }));
    }
    return true;
  },
  rtsEnd(e){
    if (this.b2){
      const ids = [...e.changedTouches].map(t => t.identifier);
      if (ids.includes(this.b2.a) || ids.includes(this.b2.b)){
        const B = this.b2; this.b2 = null; this.box2El.style.display = 'none';
        if (hypot(B.ax - B.bx, B.ay - B.by) > 24){ TOUCH.mouse('mousedown', B.ax, B.ay, 0); dispatchEvent(new MouseEvent('mousemove', { clientX: B.bx, clientY: B.by })); TOUCH.mouse('mouseup', B.bx, B.by, 0); this.haptic(10); }
      }
      return true;
    }
    const r = TOUCH.rts; if (!r || TOUCH.boxMode || S.place || S.cast) return false;
    let mine = false;
    for (const t of e.changedTouches){
      if (t.identifier !== r.id) continue;
      mine = true; clearTimeout(this.holdT); clearTimeout(TOUCH.longT); this.ringEl.style.display = 'none';
      TOUCH.rts = null;
      if (r.box){ TOUCH.mouse('mouseup', r.x, r.y, 0); this.haptic(10); }
      else if (r.armed && !r.moved) this.radOpenAt(r.x0, r.y0);
      else if (!r.moved) this.rtsTap(r.x, r.y);
    }
    return mine;
  },
  box2Draw(){
    const B = this.b2, E = this.box2El; if (!B){ E.style.display = 'none'; return; }
    E.style.display = 'block'; E.style.left = min(B.ax, B.bx) + 'px'; E.style.top = min(B.ay, B.by) + 'px'; E.style.width = abs(B.ax - B.bx) + 'px'; E.style.height = abs(B.ay - B.by) + 'px';
  },
  rtsTap(x, y){
    this.used('rtap');
    const ent = pickEntity(x, y, true), sel = selGroups();
    if (ent && ent.team === 0 && ent.cls !== 'bld' && ent.cls !== 'hq'){
      const g = groupOf(ent); if (!g) return;
      const now = performance.now(), dbl = this.lastTapG === g && now - this.lastTapT < 380;
      this.lastTapG = g; this.lastTapT = now;
      S.sel.clear(); S.selB = null;
      if (dbl){
        const k = groupKind(g);
        const inView = p => { const s = p && project(p); return s && s[0] > 0 && s[0] < innerWidth && s[1] > 0 && s[1] < innerHeight; };
        for (const o of (g.cls === 'builder' ? teamBuilders(0) : groupsOf(0))) if (groupAlive(o) && groupKind(o) === k && inView(leaderPos(o))) S.sel.add(o);
        S.sel.add(g); feed(`${L71('allOf')}: ${S.sel.size}`, TEAM[0].css);
      } else S.sel.add(g);
      this.haptic(8); HINTS.used('select'); emit('ui', { kind: 'ok' });
      return;
    }
    this.lastTapG = null;
    if (ent && ent.team === 0){ TOUCH.mouse('mousedown', x, y, 0); TOUCH.mouse('mouseup', x, y, 0); this.haptic(8); return; }   // своё здание — как клик
    if (sel.length){ orderAt(x, y, false); this.haptic(14); return; }   // враг — атака, земля — идти (2× тап — марш)
    S.sel.clear(); S.selB = null;
  },
});
// ---------------------------------------------------------------- радиальное меню (долгое нажатие)
Object.assign(M71, {
  radOpenAt(x, y){
    this.used('rhold');
    const ent = pickEntity(x, y, false), p = pickGround(x, y);
    let items = [];
    if (ent && ent.team === 0 && ent.cls !== 'bld' && ent.cls !== 'hq'){
      const g = groupOf(ent); if (!g) return;
      S.sel.clear(); S.selB = null; S.sel.add(g);
      items.push({ ic: 'play', t: L71('possess'), f: () => { enterFPS(ent); HINTS.used('possess'); } });
      for (const a of abilList(g).slice(0, 5)){
        const A = ABIL[a], left = g.abil && g.abil[a] > S.time ? Math.ceil(g.abil[a] - S.time) : 0;
        items.push({ ic: A.target === 'point' ? 'target' : 'skills', t: N2(A.n), cd: left, f: () => {
          if (A.target === 'point'){ S.cast = { kind: 'abil', code: A.key }; S.place = null; feed(tr('Тапни точку для способности', 'Tap a point for the ability', 'Chạm điểm cho kỹ năng', 'הקש על נקודה ליכולת'), '#9cf'); }
          else { const why = useAbility(g, a); if (why) { feed(`${N2(A.n)}: ${why}`, '#f88'); emit('ui', { kind: 'deny' }); } else { emit('ui', { kind: 'ok' }); HINTS.used('ability'); } }
        } });
      }
      items.push({ ic: 'hold', t: L71('hold'), f: () => orderHold() });
    } else {
      if (!p) return;
      const sx = x, sy = y;
      const army = () => { if (!selGroups().filter(g => g.cls !== 'builder').length) M67.selectArmy(); return selGroups().filter(g => g.cls !== 'builder'); };
      items = [
        { ic: 'fire', t: L71('amove'), f: () => { army(); orderAt(sx, sy, false); } },
        { ic: 'hold', t: L71('hold'), f: () => { army(); orderHold(); } },
        { ic: 'reload', t: L71('patrol'), f: () => this.patrol(army(), p) },
        { ic: 'wrench', t: L71('build'), f: () => this.buildHere(p) },
        { ic: 'army', t: L71('gather'), f: () => this.gather(army(), p) },
      ];
    }
    const R = this.rad, n = items.length, rr = n > 5 ? 84 : 74, s = M67.safe;
    const cx = clamp(x, s.l + rr + 34, innerWidth - s.r - rr - 34), cy = clamp(y, rr + 40, innerHeight - s.b - rr - 34);
    R.innerHTML = ''; R.style.left = cx + 'px'; R.style.top = cy + 'px';
    items.forEach((it, i) => {
      const a = -PI / 2 + i * 2 * PI / n;
      const b = this.btn('', 'm71ri' + (it.cd ? ' cd' : ''), `${IC71(it.ic === 'hold' ? 'box' : it.ic)}<small>${uixEsc(it.t)}${it.cd ? ' · ' + it.cd : ''}</small>`, R, () => { this.radClose(); it.f(); this.haptic(12); });
      b.style.left = (cos(a) * rr) + 'px'; b.style.top = (sin(a) * rr) + 'px'; b.dataset.full = it.t;
    });
    this.btn('', 'm71ri x', IC71('close'), R, () => this.radClose());
    R.classList.add('open'); this.radOpen = true; this.radItems = items;
  },
  radClose(){ if (this.rad){ this.rad.classList.remove('open'); this.rad.innerHTML = ''; } this.radOpen = false; },
  patrol(sel, p){
    for (const g of sel){ const a = leaderPos(g); if (!a) continue; g.pat71 = { a: a.slice(), b: p.slice(), to: 'b' }; setOrder(g, 'move', p, { by: 'player', lock: 1e9 }); }
    if (sel.length) feed(L71('patrolOn'), '#9cf');
  },
  patrolStep(){
    this.patT = (this.patT || 0) - 0.15; if (this.patT > 0) return; this.patT = 0.5;
    for (const g of groupsOf(0)){
      const P = g.pat71; if (!P) continue;
      const end = P[P.to];
      if (!groupAlive(g) || g.order !== 'move' || !g.goal || dist(g.goal, end) > 1){ g.pat71 = null; continue; }
      const L = leaderPos(g); if (L && surfDist(L, end) < 9){ P.to = P.to === 'b' ? 'a' : 'b'; setOrder(g, 'move', P[P.to], { lock: 1e9 }); }
    }
  },
  gather(sel, p){
    const n = sel.length;
    sel.forEach((g, i) => { const up = norm(p), a = i / max(1, n) * PI * 2, tp = n > 1 ? add(p, mul(add(mul(anyTangent(up), cos(a)), mul(cross(up, anyTangent(up)), sin(a))), 4 + n)) : p; setOrder(g, 'move', tp, { by: 'player', lock: 120, rush: true }); });
    if (n){ feed(L71('gatherOn') + ` (${n})`, '#9cf'); S.orderMark = { p, t: 0.8, col: '#9cf', kind: 'march' }; }
  },
  buildHere(p){
    let bs = selBuilders();
    if (!bs.length){ const L = teamBuilders(0).sort((a, b) => dist(a.pos, p) - dist(b.pos, p)); if (!L.length){ feed(L71('noEng'), '#f88'); emit('ui', { kind: 'deny' }); return; } bs = [L[0]]; }
    S.sel.clear(); S.selB = null; for (const b of bs) S.sel.add(b);
    this.buildAt = p; flyCamTo(p);
    feed(L71('buildHint'), '#9cf');
  },
});
// ---------------------------------------------------------------- меню ☰: страницы вместо прокрутки
Object.assign(M71, {
  PG: [['act', 'skills', ['Действия', 'Actions', 'Hành động', 'פעולות']], ['pos', 'user', ['Вселение', 'Possession', 'Nhập vai', 'השתלטות']],
       ['set', 'phone', ['Телефон', 'Phone', 'Điện thoại', 'טלפון']], ['ges', 'hand', ['Жесты', 'Gestures', 'Cử chỉ', 'מחוות']]],
  sheetInit(){
    const sh = M67.sheet; if (!sh) return;
    this.page = 'act';
    const tabs = document.createElement('div'); tabs.className = 'm71tabs'; sh.insertBefore(tabs, sh.children[1] || null);
    this.tabs = tabs;
    for (const [k, ic] of this.PG){ const b = this.btn('', 'm71tab', '', tabs, () => { this.page = k; this.sheetPage(); emit('ui', { kind: 'ok' }); }); b.dataset.pg = k; }
    if (M67.opts && M67.opts.parentElement) M67.opts.parentElement.classList.add('osec');
    const gs = document.createElement('div'); gs.className = 'sec gsec'; sh.appendChild(gs); this.gsec = gs;
    gs.addEventListener('touchstart', e => { const t = e.target.closest('[data-g71]'); if (!t) return; e.preventDefault(); this.done = {}; this.saveDone(); this.ghSkip = 0; feed(tr('Подсказки жестов покажутся снова', 'Gesture hints will show again', 'Gợi ý cử chỉ sẽ hiện lại', 'רמזי המחוות יוצגו שוב'), '#9cf'); emit('ui', { kind: 'ok' }); }, { passive: false });
  },
  sheetPage(){
    const sh = M67.sheet; if (!sh || !this.tabs) return;
    sh.dataset.pg = this.page;
    const rts = S.mode === 'rts';
    for (const b of this.tabs.children){
      const P = this.PG.find(p => p[0] === b.dataset.pg), t = b.dataset.pg === 'act' && rts ? ['Стратегия', 'Strategy', 'Chiến thuật', 'אסטרטגיה'] : P[2];
      const h = `${IC71(P[1])}<span>${tr(t[0], t[1], t[2], t[3])}</span>`; if (b._h !== h){ b._h = h; b.innerHTML = h; }
      b.classList.toggle('act', b.dataset.pg === this.page);
    }
    if (this.page === 'ges') this.gesFill();
  },
  GES: [
    ['touch', 'Джойстик слева — ход; свайп справа — обзор', 'Left stick — move; swipe right — look', 'Cần trái — di chuyển; vuốt phải — nhìn', 'ג׳ויסטיק משמאל — תנועה; החלקה מימין — מבט'],
    ['auto', 'АВТО — захват ближайшего врага и стрельба сама; свайп — соседняя цель', 'AUTO — lock the nearest enemy and fire; swipe — next target', 'TỰ ĐỘNG — khóa và tự bắn; vuốt — mục tiêu kế', 'אוטו — נעילה וירי; החלקה — המטרה הבאה'],
    ['jet', 'Держи «Ранец» — полёт туда, куда смотришь', 'Hold "Jet" — fly where you look', 'Giữ “Bay” — bay theo hướng nhìn', 'החזק „סילון" — טיסה לכיוון המבט'],
    ['reflex', '2× тап справа — рефлекс (замедление)', 'Double tap on the right — reflex (slow-mo)', 'Chạm 2 lần bên phải — phản xạ', 'הקשה כפולה מימין — רפלקס'],
    ['rocket', 'A: тап по красной рамке — ракета в цель', 'A: tap the red frame — rocket at the target', 'A: chạm khung đỏ — tên lửa', 'A: הקשה על המסגרת האדומה — רקטה'],
    ['gren', 'A: свайп «Гранаты» вверх — граната в цель', 'A: swipe "Grenade" up — grenade at the target', 'A: vuốt “Lựu đạn” lên — vào mục tiêu', 'A: החלקת „רימון" למעלה — אל המטרה'],
    ['aim', 'B: щипок — прицел / граната / ракета (настройка)', 'B: pinch — zoom / grenade / rocket (setting)', 'B: chụm — ngắm / lựu đạn / tên lửa', 'B: צביטה — זום / רימון / רקטה'],
    ['army', 'Стратегия: тап — выбрать, тап по земле — идти, по врагу — атака', 'Strategy: tap — select, tap ground — move, enemy — attack', 'Chiến thuật: chạm — chọn, chạm đất — đi, địch — tấn công', 'אסטרטגיה: הקשה — בחירה, קרקע — תנועה, אויב — התקפה'],
    ['box', 'Держи — меню приказов; держи и тяни — рамка; 2× тап — все такие', 'Hold — command menu; hold and drag — box; double tap — all of a type', 'Giữ — menu lệnh; giữ và kéo — khung; chạm 2 lần — cùng loại', 'החזק — תפריט; החזק וגרור — מסגרת; הקשה כפולה — כל הסוג'],
    ['map', 'Щипок — масштаб, поворот двумя пальцами — разворот', 'Pinch — zoom, two-finger twist — rotate', 'Chụm — thu phóng, xoay hai ngón — xoay', 'צביטה — זום, סיבוב בשתי אצבעות'],
  ],
  gesFill(){
    const L = S.mode === 'rts' ? this.GES.slice(7) : this.GES.slice(0, 7);
    const h = `<div class="g71grid">${L.map(g => `<div class="g71c">${IC71(g[0])}<span>${tr(g[1], g[2], g[3], g[4])}</span></div>`).join('')}</div><button data-g71="1" class="g71r">${IC71('restart')} ${tr('Показать подсказки жестов снова', 'Show gesture hints again', 'Hiện lại gợi ý cử chỉ', 'הצג שוב רמזי מחוות')}</button>`;
    if (this.gsec._h !== h + LANG.cur){ this.gsec._h = h + LANG.cur; this.gsec.innerHTML = h; }
  },
  // строки настроек v7.1 в «Телефон»
  optRows(){
    const P = this.pref, b = (k, txt, on) => `<div class="row"><span>${txt}</span><button data-o="v71:${k}" class="tog ${on === true ? 'on' : ''}">${on === true ? L71('on') : on === false ? L71('off') : on}</button></div>`;
    const lk = P.look === 'joy' ? tr('джойстик', 'joystick', 'cần', 'ג׳ויסטיק') : tr('свайп', 'swipe', 'vuốt', 'החלקה');
    const pn = { zoom: tr('прицел', 'zoom', 'ngắm', 'זום'), gren: tr('граната', 'grenade', 'lựu đạn', 'רימון'), rocket: tr('ракета', 'rocket', 'tên lửa', 'רקטה') }[P.pinch];
    return b('look', tr('Обзор', 'Look', 'Nhìn', 'מבט'), lk) + b('gest', tr('Жесты: A — рамка/свайп, B — щипок', 'Gestures: A — frame/swipe, B — pinch', 'Cử chỉ: A / B', 'מחוות: A / B'), P.gest) +
      b('pinch', tr('Щипок (B)', 'Pinch (B)', 'Chụm (B)', 'צביטה (B)'), pn) + b('box2', tr('Рамка двумя пальцами (стратегия)', 'Two-finger box (strategy)', 'Khung hai ngón', 'מסגרת בשתי אצבעות'), !!P.box2) +
      b('v70', tr('Раскладка v7.0 (старая)', 'Old v7.0 layout', 'Bố cục cũ v7.0', 'פריסה ישנה v7.0'), !!P.v70);
  },
  option(k){
    const P = this.pref;
    if (k === 'look') P.look = P.look === 'joy' ? 'swipe' : 'joy';
    else if (k === 'gest') P.gest = P.gest === 'A' ? 'B' : 'A';
    else if (k === 'pinch') P.pinch = { zoom: 'gren', gren: 'rocket', rocket: 'zoom' }[P.pinch] || 'gren';
    else if (k === 'box2') P.box2 = !P.box2;
    else if (k === 'v70') P.v70 = !P.v70;
    this.save(); this.apply(); M67.sig = ''; G62.btnSig = '';
  },
});
// ---------------------------------------------------------------- меню телефона: экраны с большими кнопками, без ползунков и прокрутки
const P71M = {
  on(){ return M71.active(); },
  hd(title, back){
    return `<div class="p71hd">${back ? `<button id="m_back" class="p71hb">${IC71('back')}<span>${L71('back')}</span></button>` : '<i></i>'}<h2>${title}</h2><button class="p71hb x" data-p71x="1">${IC71('close')}</button></div>`;
  },
  tile(attrs, ic, t, sub, cls){ return `<button ${attrs} class="p71t ${cls || ''}">${IC71(ic)}<b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</button>`; },
  flag(c){ return (typeof LANG_FLAG !== 'undefined' && LANG_FLAG[c]) || c.toUpperCase(); },
  // переключатели и «− значение +»
  CH(){
    return {
      quality: [[0, tr('низкое', 'low', 'thấp', 'נמוכה')], [1, tr('среднее', 'medium', 'trung bình', 'בינונית')], [2, tr('высокое', 'high', 'cao', 'גבוהה')]],
      diff: DIFF.map((d, i) => [i, N2(d.n)]), battle: SCALES.map((k, i) => [i, N2(k.n)]),
      radioLvl: [[0, tr('тишина', 'silent', 'im lặng', 'שקט')], [1, tr('важное', 'important', 'quan trọng', 'חשוב')], [2, tr('полный', 'full', 'đầy đủ', 'מלא')]],
      aimAssist: [[0, tr('выкл', 'off', 'tắt', 'כבוי')], [1, tr('слабая', 'weak', 'yếu', 'חלש')], [2, tr('средняя', 'medium', 'vừa', 'בינוני')], [3, tr('сильная', 'strong', 'mạnh', 'חזק')]],
      vehView: [['fp', tr('из кабины', 'cockpit', 'buồng lái', 'מהתא')], ['tp', tr('3-е лицо', '3rd person', 'ngôi thứ ba', 'גוף שלישי')]],
      grid: [[0, tr('нет', 'no', 'không', 'לא')], [1, tr('да', 'yes', 'có', 'כן')]],
      endless: [[true, tr('бесконечный', 'endless', 'bất tận', 'אינסופי')], [false, tr('60 минут', '60 minutes', '60 phút', '60 דקות')]],
      ordersFree: [[false, tr('следовать', 'follow', 'theo lệnh', 'לציית')], [true, tr('свобода', 'free', 'tự do', 'חופשי')]],
      solo: [[false, tr('со мной', 'with me', 'đi cùng', 'איתי')], [true, tr('один', 'solo', 'một mình', 'לבד')]],
    };
  },
  NUM: { vol: [0, 1, 0.1, v => Math.round(v * 100) + '%'], sens: [0.3, 3, 0.1, v => v.toFixed(1)], fov: [60, 100, 5, v => Math.round(v) + '°'], scale: [0.25, 1.5, 0.125, v => Math.round(v * 100) + '%'],
         bright: [0.6, 1.6, 0.1, v => v.toFixed(1)], bounces: [0, 8, 1, v => String(Math.round(v))] },
  val(k){ const o = (this.CH()[k] || []).find(o => o[0] === SET[k]); if (o) return o[1]; const N = this.NUM[k]; if (N) return N[3](+SET[k] || 0); if (k === 'aimAssist') return this.CH().aimAssist[AIMA.lvl()][1]; return String(SET[k]); },
  step(k, lab){ return `<div class="p71s"><button data-p71c="${k}" data-d="-1">${IC71('minus')}</button><span><small>${lab}</small><b>${uixEsc(this.val(k))}</b></span><button data-p71c="${k}" data-d="1">${IC71('plus')}</button></div>`; },
  tog(k, lab){ const on = !!SET[k]; return `<button class="p71o ${on ? 'on' : ''}" data-tog="${k}"><span>${lab}</span><b>${L71(on ? 'on' : 'off')}</b></button>`; },
  opt(k, lab, v, on){ return `<button class="p71o ${on ? 'on' : ''}" data-p71o="${k}"><span>${lab}</span><b>${v}</b></button>`; },
  change(k, d){
    if (k === 'aimAssist' && (SET.aimAssist === undefined || SET.aimAssist === null || SET.aimAssist < 0)) SET.aimAssist = AIMA.lvl();
    const C = this.CH()[k];
    if (C){ const i = C.findIndex(o => o[0] === SET[k]); SET[k] = C[clamp((i < 0 ? 0 : i) + d, 0, C.length - 1)][0]; }
    else { const N = this.NUM[k]; if (!N) return; SET[k] = clamp(Math.round(((+SET[k] || 0) + d * N[2]) / N[2]) * N[2], N[0], N[1]); SET[k] = +SET[k].toFixed(3); }
    applySettings(); MENU.save();
    if (k === 'scale'){ SET.autoRes = false; S.autoRes = false; resize(); }
  },
  footer(){ return `<div class="p71ft"><button data-p71back="1" class="p71ap">${IC71('check')}<b>${L71('apply')}</b></button></div>`; },
  // ---- экраны
  main(){
    const H = tr, has = SAVE.has();
    const cells = [
      `<button id="m_play" class="p71t big w2">${IC71('play')}<b>${H('Новый матч', 'New match', 'Trận mới', 'משחק חדש')}</b><small>${uixEsc(N2(DIFF[SET.diff] ? DIFF[SET.diff].n : DIFF[0].n))} · ${uixEsc(N2(SCALES[SET.battle] ? SCALES[SET.battle].n : SCALES[0].n))}</small></button>`,
      has ? this.tile('id="m_load"', 'folder', H('Продолжить', 'Continue', 'Tiếp tục', 'המשך'), uixEsc(SAVE.info())) : this.tile('id="m_tutorial"', 'school', H('Обучение', 'Training', 'Huấn luyện', 'אימון')),
      this.step('diff', H('Сложность', 'Difficulty', 'Độ khó', 'קושי')), this.step('battle', H('Масштаб боёв', 'Battle scale', 'Quy mô', 'היקף')),
      this.step('endless', H('Бой', 'Battle', 'Trận', 'קרב')),
      this.tile('id="m_saves"', 'save', H('Сохранения', 'Saves', 'Bản lưu', 'שמירות')),
      has ? this.tile('id="m_tutorial"', 'school', H('Обучение', 'Training', 'Huấn luyện', 'אימון')) : '',
      typeof DEV !== 'undefined' ? this.tile('id="m_dev"', 'tool', H('Разработчик', 'Developer', 'Nhà phát triển', 'מפתח'), H('полигон', 'sandbox', 'sa bàn', 'ארגז חול')) : '',
      this.tile('id="m_cinema"', 'film', H('Кино-режим', 'Cinema', 'Điện ảnh', 'קולנוע')),
      this.tile('id="m_settings"', 'gear', H('Настройки', 'Settings', 'Cài đặt', 'הגדרות')),
      this.tile('data-p71go="lang"', 'lang', H('Язык', 'Language', 'Ngôn ngữ', 'שפה'), this.flag(SET.lang)),
      this.tile('data-p71go="news"', 'news', H('Новое в v7.1', 'New in v7.1', 'Mới v7.1', 'חדש ב-v7.1')),
      this.tile('id="m_career"', 'star', H('Карьера', 'Career', 'Sự nghiệp', 'קריירה'), `${PROG.career.matches} · ${PROG.rankName(PROG.career.best)}`),
    ].filter(Boolean);
    return `<div class="p71 p71main"><div class="p71hd"><i></i><h1>PORTAL METEOR</h1><small class="p71v">v7.1 · ${H('телефон', 'phone', 'điện thoại', 'טלפון')}</small></div><div class="p71g c4">${cells.join('')}</div></div>`;
  },
  pause(){
    const H = tr, cells = [
      `<button id="m_resume" class="p71t big w2">${IC71('play')}<b>${H('Продолжить', 'Resume', 'Tiếp tục', 'המשך')}</b><small>${uixEsc(PROG.rankName())} · ${PROG.xp} XP · ${fmtTime(S.time)}</small></button>`,
      this.tile('id="m_save"', 'save', H('Сохранить', 'Save', 'Lưu', 'שמור')), this.tile('id="m_saves"', 'folder', H('Сохранения', 'Saves', 'Bản lưu', 'שמירות')),
      this.tile('data-p71go="p70"', 'user', H('Вселение', 'Possession', 'Nhập vai', 'השתלטות'), typeof PRIO70 !== 'undefined' && PRIO70.on ? H('свой порядок', 'custom order', 'thứ tự riêng', 'סדר אישי') : H('авто', 'auto', 'tự động', 'אוטו')),
      this.tile('id="m_career"', 'star', H('Карьера', 'Career', 'Sự nghiệp', 'קריירה')),
      this.tile('id="m_settings"', 'gear', H('Настройки', 'Settings', 'Cài đặt', 'הגדרות')),
      this.tile('data-p71go="lang"', 'lang', H('Язык', 'Language', 'Ngôn ngữ', 'שפה'), this.flag(SET.lang)),
      `<button data-mm2="free:${!SET.ordersFree}" class="p71t ${SET.ordersFree ? 'on' : ''}">${IC71('flag')}<b>${SET.ordersFree ? H('Свобода действий', 'Free play', 'Tự do', 'חופש פעולה') : H('Следовать приказам', 'Follow orders', 'Theo lệnh', 'ציות לפקודות')}</b></button>`,
      `<button data-mm2="solo:${!SET.solo}" class="p71t ${SET.solo ? 'on' : ''}">${IC71('army')}<b>${SET.solo ? H('Действую один', 'Going solo', 'Một mình', 'לבד') : H('Отряд со мной', 'Squad with me', 'Đội đi cùng', 'החוליה איתי')}</b></button>`,
      typeof DEV !== 'undefined' ? this.tile('id="m_devtog"', 'tool', H('Разработчик', 'Developer', 'Nhà phát triển', 'מפתח'), L71(DEV.on ? 'on' : 'off'), DEV.on ? 'on' : '') : '',
      typeof DEV !== 'undefined' && DEV.match ? this.tile('id="m_devars"', 'tool', H('Арсенал', 'Arsenal', 'Kho vũ khí', 'נשקייה')) : '',
      this.tile('id="m_restart"', 'restart', H('Новый матч', 'New match', 'Trận mới', 'משחק חדש')),
      this.tile('id="m_menu"', 'exitDoor', H('В главное меню', 'Main menu', 'Menu chính', 'תפריט ראשי')),
    ].filter(Boolean);
    return `<div class="p71 p71pause">${this.hd(H('ПАУЗА', 'PAUSED', 'TẠM DỪNG', 'השהיה'), false)}<div class="p71g c4">${cells.join('')}</div></div>`;
  },
  SECS: [['lang', 'lang', ['Язык', 'Language', 'Ngôn ngữ', 'שפה']], ['snd', 'sound', ['Звук', 'Sound', 'Âm thanh', 'צליל']], ['gfx', 'image', ['Графика', 'Graphics', 'Đồ họa', 'גרפיקה']],
         ['ctl', 'touch', ['Управление', 'Controls', 'Điều khiển', 'שליטה']], ['game', 'game', ['Игра', 'Game', 'Trò chơi', 'משחק']], ['phone', 'phone', ['Телефон', 'Phone', 'Điện thoại', 'טלפון']],
         ['ges', 'hand', ['Жесты', 'Gestures', 'Cử chỉ', 'מחוות']]],
  settings(){
    const cells = this.SECS.map(([k, ic, t]) => this.tile(`data-p71go="${k === 'lang' ? 'lang' : k === 'ges' ? 'ges' : 's_' + k}"`, ic, tr(t[0], t[1], t[2], t[3]), k === 'lang' ? this.flag(SET.lang) : ''));
    return `<div class="p71 p71set">${this.hd(tr('НАСТРОЙКИ', 'SETTINGS', 'CÀI ĐẶT', 'הגדרות'), true)}<div class="p71g c4 tall">${cells.join('')}</div></div>`;
  },
  sec(k){
    const H = tr, S_ = this.SECS.find(s => 's_' + s[0] === k), T = S_ ? S_[2] : ['', '', '', ''];
    let rows = [];
    if (k === 's_snd') rows = [this.step('vol', H('Громкость', 'Volume', 'Âm lượng', 'עוצמה')), this.tog('voice', H('Голос рации', 'Radio voice', 'Giọng bộ đàm', 'קול קשר')), this.tog('hintsOn', H('Подсказки', 'Hints', 'Gợi ý', 'רמזים')),
      this.tog('hintsVoice', H('Озвучивать подсказки', 'Voice the hints', 'Đọc gợi ý', 'הקראת רמזים')), this.tog('chatter', H('Переговоры отряда', 'Squad chatter', 'Đồng đội nói chuyện', 'שיחות חוליה')), this.step('radioLvl', H('Радиоэфир стратега', 'Strategist radio', 'Bộ đàm', 'קשר אסטרטג'))];
    else if (k === 's_gfx') rows = [this.step('quality', H('Качество', 'Quality', 'Chất lượng', 'איכות')), this.tog('autoRes', H('Авторазрешение', 'Auto resolution', 'Tự động độ phân giải', 'רזולוציה אוטומטית')),
      this.step('scale', H('Масштаб разрешения', 'Resolution scale', 'Tỷ lệ phân giải', 'קנה מידה')), this.step('bright', H('Яркость', 'Brightness', 'Độ sáng', 'בהירות')),
      this.tog('distort', H('Искажения', 'Distortion', 'Méo', 'עיוות')), this.tog('vhs', H('VHS-фильтр', 'VHS filter', 'Bộ lọc VHS', 'מסנן VHS')), this.step('grid', H('Сияние портала', 'Portal aurora', 'Cực quang', 'זוהר השער')), this.step('bounces', H('Отражения портала', 'Portal depth', 'Độ sâu cổng', 'עומק השער'))];
    else if (k === 's_ctl') rows = [`<div class="p71s"><button data-p71o="m67sens" data-d="-1">${IC71('minus')}</button><span><small>${H('Обзор пальцем', 'Finger look speed', 'Độ nhạy nhìn', 'רגישות מבט')}</small><b>${(M67.pref.sens || 1).toFixed(1)}</b></span><button data-p71o="m67sens" data-d="1">${IC71('plus')}</button></div>`, this.tog('invertY', H('Инверсия Y', 'Invert Y', 'Đảo Y', 'היפוך Y')),
      this.step('fov', H('Поле зрения', 'Field of view', 'Góc nhìn', 'שדה ראייה')), this.step('aimAssist', H('Помощь в прицеливании', 'Aim assist', 'Hỗ trợ ngắm', 'סיוע כיוון')), this.step('vehView', H('Техника: вид', 'Vehicles: view', 'Xe: góc nhìn', 'רכב: מבט')),
      this.opt('v71:look', H('Обзор', 'Look', 'Nhìn', 'מבט'), M71.pref.look === 'joy' ? H('джойстик', 'joystick', 'cần', 'ג׳ויסטיק') : H('свайп', 'swipe', 'vuốt', 'החלקה')),
      this.opt('v71:gest', H('Жесты (A / B)', 'Gestures (A / B)', 'Cử chỉ (A / B)', 'מחוות (A / B)'), M71.pref.gest),
      this.opt('v71:pinch', H('Щипок', 'Pinch', 'Chụm', 'צביטה'), { zoom: H('прицел', 'zoom', 'ngắm', 'זום'), gren: H('граната', 'grenade', 'lựu đạn', 'רימון'), rocket: H('ракета', 'rocket', 'tên lửa', 'רקטה') }[M71.pref.pinch])];
    else if (k === 's_game') rows = [this.step('diff', H('Сложность (новый матч)', 'Difficulty (new match)', 'Độ khó', 'קושי')), this.step('battle', H('Масштаб боёв', 'Battle scale', 'Quy mô', 'היקף')),
      this.step('endless', H('Бой', 'Battle', 'Trận', 'קרב')), this.tog('fog', H('Туман войны', 'Fog of war', 'Sương mù', 'ערפל קרב')), this.step('ordersFree', H('Приказы стратега', 'Strategist orders', 'Lệnh', 'פקודות')),
      this.step('solo', H('Отряд', 'Squad', 'Đội', 'חוליה')), this.tog('unlockAll', H('Всё открыто (тест)', 'All unlocked (test)', 'Mở khóa tất cả', 'הכל פתוח'))];
    else if (k === 's_phone') rows = [this.opt('m67simple', H('Простой огонь: прицел на враге — стреляет сам', 'Simple fire: fires when aimed at an enemy', 'Bắn đơn giản', 'ירי פשוט'), L71(M67.pref.simple ? 'on' : 'off'), M67.pref.simple),
      this.opt('m67mm', H('Миникарта в бою', 'Minimap in battle', 'Bản đồ nhỏ', 'מפה בקרב'), L71(M67.pref.mm ? 'on' : 'off'), M67.pref.mm), this.opt('m67cam', H('Живой портрет в стратегии', 'Live portrait in strategy', 'Ảnh trực tiếp', 'דיוקן חי'), L71(M67.pref.cam ? 'on' : 'off'), M67.pref.cam),
      this.opt('v71:box2', H('Рамка двумя пальцами', 'Two-finger box', 'Khung hai ngón', 'מסגרת בשתי אצבעות'), L71(M71.pref.box2 ? 'on' : 'off'), M71.pref.box2),
      this.opt('v71:v70', H('Раскладка v7.0 (старая)', 'Old v7.0 layout', 'Bố cục v7.0', 'פריסה v7.0'), L71(M71.pref.v70 ? 'on' : 'off'), M71.pref.v70),
      this.opt('m67classic', H('Раскладка v6.6 (старая)', 'Old v6.6 layout', 'Bố cục v6.6', 'פריסה v6.6'), L71(M67.pref.classic ? 'on' : 'off'), M67.pref.classic)];
    return `<div class="p71 p71sec">${this.hd(tr(T[0], T[1], T[2], T[3]), true)}<div class="p71g c2 rows">${rows.join('')}</div>${this.footer()}</div>`;
  },
  lang(){
    const cells = LANGS.map(([c, n]) => `<button class="p71t p71f ${SET.lang === c ? 'cur' : ''}" data-lang="${c}"><em>${this.flag(c)}</em><b>${n}</b></button>`).join('');
    return `<div class="p71 p71lang">${this.hd(tr('ЯЗЫК', 'LANGUAGE', 'NGÔN NGỮ', 'שפה'), true)}<div class="p71g c4 flags">${cells}</div></div>`;
  },
  news(){
    const L = typeof V71_NEWS !== 'undefined' ? V71_NEWS : [];
    return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.1', 'NEW IN v7.1', 'MỚI TRONG v7.1', 'חדש ב-v7.1'), true)}<div class="p71g c2 news">${L.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
  },
  ges(){
    return `<div class="p71 p71ges">${this.hd(tr('ЖЕСТЫ', 'GESTURES', 'CỬ CHỈ', 'מחוות'), true)}<div class="g71grid">${M71.GES.map(g => `<div class="g71c">${IC71(g[0])}<span>${tr(g[1], g[2], g[3], g[4])}</span></div>`).join('')}</div></div>`;
  },
  p70(){ return `<div class="p71 p71p70">${this.hd(tr('ВСЕЛЕНИЕ', 'POSSESSION', 'NHẬP VAI', 'השתלטות'), true)}${typeof PRIO70 !== 'undefined' ? PRIO70.html('screen') : ''}</div>`; },
  close(){ if (S.attract || MENU.cur === 'main'){ MENU.stack = []; MENU.show('main'); } else MENU.resume(); },
  wire(){
    const el = $('screen'); if (!el) return;
    const go = (b, fn) => { b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
    el.querySelectorAll('[data-p71go]').forEach(b => go(b, () => MENU.show('p71' + b.dataset.p71go, true)));
    el.querySelectorAll('[data-p71x]').forEach(b => go(b, () => this.close()));
    el.querySelectorAll('[data-p71back]').forEach(b => go(b, () => { MENU.save(); MENU.back(); }));
    el.querySelectorAll('[data-p71c]').forEach(b => go(b, () => { this.change(b.dataset.p71c, +b.dataset.d); MENU.show(MENU.cur); }));
    el.querySelectorAll('[data-p71o]').forEach(b => go(b, () => {
      const k = b.dataset.p71o;
      if (k.startsWith('v71:')) M71.option(k.slice(4));
      else if (k === 'm67sens'){ M67.option('sens', +b.dataset.d || 1); }
      else M67.option(k.slice(3));
      MENU.show(MENU.cur);
    }));
  },
};
for (const k of ['lang', 'news', 'ges', 'p70', 's_snd', 's_gfx', 's_ctl', 's_game', 's_phone']) MENU['html_p71' + k] = function(){ return k.startsWith('s_') ? P71M.sec(k) : P71M[k](); };
// ---------------------------------------------------------------------
//  ВСТРАИВАНИЕ — только на сенсорных устройствах; на ПК ни одна функция не подменяется
// ---------------------------------------------------------------------
if (TOUCH.on && typeof M67 !== 'undefined'){
  const safe = (fn, tag) => { try { return fn(); } catch (e){ if (!M71.err){ M71.err = 1; console.warn('m71 ' + tag, e); } } };
  { const ti0 = TOUCH.init; TOUCH.init = function(){ ti0.call(this); safe(() => M71.init(), 'init'); }; }
  { const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); safe(() => M71.frame(dt), 'frame'); }; }
  // раскладка и подписи кнопок шутера
  { const fl0 = M67.fpsLayout; M67.fpsLayout = function(){ const r = fl0.apply(this, arguments); return M71.active() ? M71.layout(r) : r; }; }
  { const lb0 = M67.label; M67.label = function(b, k, ctx){ if (M71.active() && !(k === 'grenade' && ctx === 'inf') && M71.label(b, k, ctx)) return; return lb0.call(this, b, k, ctx); }; }
  { const tb0 = G62.touchBtn; G62.touchBtn = function(){ if (M71.active() && S.mode === 'fps'){ const c = ctrlEntity(); if (!c || c.cls === 'inf') return M71.grenBtn(); return; } return tb0.apply(this, arguments); }; }
  // «АВТО»: захват вместо помощи в прицеливании; стрельба — своя
  { const st0 = AIMA.step; AIMA.step = function(rdt){ if (M71.autoOn() && safe(() => M71.autoStep(rdt), 'auto')) return; if (M71.lock) M71.setLock(null); return st0.call(this, rdt); }; }
  { const ss0 = M67.simpleStep; M67.simpleStep = function(dt){ if (M71.autoOn() && M71.lock) return; return ss0.call(this, dt); }; }
  { const gs0 = gunSpread; gunSpread = function(u, W, K){ const s = gs0(u, W, K); return M71.autoOn() && M71.lock && u === S.me ? s * 1.35 + 0.004 : s; }; }
  // красная рамка — поверх HUD
  { const ov0 = FPS61.overlay; FPS61.overlay = function(dt){ ov0.call(this, dt); if (M71.active()) safe(() => M71.drawLock(dt), 'lock'); }; }
  // касания
  { const s0 = TOUCH.start, m0 = TOUCH.moveEv, e0 = TOUCH.end;
    TOUCH.start = function(e){
      const r = s0.call(this, e);
      if (M71.active() && !MENU.isOpen() && !S.attract){ if (S.mode === 'fps') safe(() => M71.fpsStart(e), 'fs'); else if (S.mode === 'rts') safe(() => M71.rtsStart(e), 'rs'); }
      return r;
    };
    TOUCH.moveEv = function(e){
      if (M71.active() && !S.attract){
        if (S.mode === 'fps' && safe(() => M71.fpsMove(e), 'fm')){ const L = this.look; this.look = null; try { m0.call(this, e); } finally { this.look = L; } return; }
        if (S.mode === 'rts' && safe(() => M71.rtsMove(e), 'rm')){ e.preventDefault(); return; }
      }
      return m0.call(this, e);
    };
    TOUCH.end = function(e){
      if (M71.active() && !S.attract){ if (S.mode === 'fps') safe(() => M71.fpsEnd(e), 'fe'); else if (S.mode === 'rts') safe(() => M71.rtsEnd(e), 're'); }
      return e0.call(this, e);
    };
  }
  // смена бойца: короткая плашка без затемнения и без карточки
  { const tc0 = takeControl; takeControl = function(u){ const r = tc0(u); safe(() => M71.onPossess(u), 'pos'); return r; }; }
  { const sw0 = switchUnit; switchUnit = function(d){ const r = sw0(d); if (M71.active()) S.flashT = 0; return r; }; }
  { const as0 = autoSwitch; autoSwitch = function(){ const r = as0(); if (M71.active()) S.flashT = 0; return r; }; }
  { const dc0 = FPS61.drawCard; FPS61.drawCard = function(g, W, H, cx){ if (M71.active()){ const el = document.getElementById('dcard'); if (el && el.style.display !== 'none') el.style.display = 'none'; return; } return dc0.call(this, g, W, H, cx); }; }
  // второстепенный HUD и миникарты
  { const dm0 = drawMinimap; drawMinimap = function(){ if (M71.active() && !M71.pref.hud) return; return dm0(); }; }
  { const mc0 = mmCenters; mmCenters = function(){ const r = mc0(); if (M71.active() && !M71.pref.mmR) return [[-9999, -9999], [-9999, -9999]]; return r; }; }
  if (typeof CAM66 !== 'undefined'){ const pl0 = CAM66.place; CAM66.place = function(el){ pl0.call(this, el); if (M71.active()) el.style.left = (M67.safe.l + 58) + 'px'; }; }
  // меню ☰: страницы и строки v7.1
  { const fs0 = M67.fillSheet; M67.fillSheet = function(){
      const r = fs0.apply(this, arguments);
      safe(() => { if (M71.on){ this.opts.insertAdjacentHTML('beforeend', M71.active() ? M71.optRows() : `<div class="row"><span>${tr('Раскладка v7.0 (старая)', 'Old v7.0 layout', 'Bố cục cũ v7.0', 'פריסה ישנה v7.0')}</span><button data-o="v71:v70" class="tog ${M71.pref.v70 ? 'on' : ''}">${L71(M71.pref.v70 ? 'on' : 'off')}</button></div>`); } if (M71.active()) M71.sheetPage(); }, 'sheet');
      return r;
    }; }
  { const op0 = M67.option; M67.option = function(k, v){ if (String(k).startsWith('v71:')){ M71.option(k.slice(4)); if (this.open) this.fillSheet(); return; } return op0.call(this, k, v); }; }
  { const tg0 = M67.toggleSheet; M67.toggleSheet = function(v){ const r = tg0.call(this, v); if (this.open && M71.active() && S.mode === 'rts' && M71.page === 'act') M71.sheetPage(); return r; }; }
  // меню телефона
  { const hm = MENU.html_main, hp = MENU.html_pause, hs = MENU.html_settings, hc = MENU.html_controls, w0 = MENU.wire;
    MENU.html_main = function(){ return P71M.on() ? P71M.main() : hm.call(this); };
    MENU.html_pause = function(){ return P71M.on() ? P71M.pause() : hp.call(this); };
    MENU.html_settings = function(){ return P71M.on() ? P71M.settings() : hs.call(this); };
    MENU.html_controls = function(){ return P71M.on() ? P71M.ges() : hc.call(this); };
    MENU.wire = function(name){ w0.call(this, name); if (P71M.on()){ $('screen').classList.add('p71scr'); safe(() => P71M.wire(), 'wire'); } else $('screen').classList.remove('p71scr'); };
  }
}
// ---------------------------------------------------------------------
//  СТИЛИ (только body.m71 / #screen.p71scr — включаются лишь на телефоне)
// ---------------------------------------------------------------------
M71.css = function(){
  const st = document.createElement('style'); st.id = 'm71css';
  st.textContent = `
  .ic71{width:24px;height:24px;display:block;flex:none;fill:currentColor}
  #m71skb,#m71hudb,#m71auto,#m71rj,#m71pl,#m71gh,#m71tip,#m71ring,#m71box2,#m71rail,#m71sq,#m71rad,#m71mmb,.m71zb{display:none}
  /* ---- шутер: кнопки */
  body.m71 #touch .tf.fps > button{background:rgba(12,14,16,.34);border:1.5px solid rgba(232,220,184,.42);box-shadow:none}
  body.m71 #touch .tf.fps > button[data-s] .ic71{width:23px;height:23px}
  body.m71 #touch .tf.fps > button small{font:700 8.5px "Exo 2";letter-spacing:.03em;margin-top:2px;opacity:.85}
  body.m71 #touch .tf.fps > [data-s^="K"]{display:none!important}
  body.m71.m71sk.m64fps #touch .tf.fps > [data-s^="K"]{display:flex!important;width:52px;height:52px;top:calc(var(--st) + 58px);bottom:auto;border-radius:14px;background:rgba(12,14,16,.62)}
  body.m71 #touch .tf.fps > [data-s="K1"]{right:calc(var(--sr) + 62px)} body.m71 #touch .tf.fps > [data-s="K2"]{right:calc(var(--sr) + 120px)}
  body.m71 #touch .tf.fps > [data-s="K3"]{right:calc(var(--sr) + 178px)} body.m71 #touch .tf.fps > [data-s="K4"]{right:calc(var(--sr) + 236px)}
  body.m71 #touch .tf.fps > [data-s="LF"]{width:64px;height:64px;left:calc(var(--sl) + 16px);right:auto;bottom:calc(var(--sb) + 150px);background:rgba(170,40,30,.4);border:2px solid rgba(255,120,95,.8)}
  body.m71 #touch .tf.fps > [data-s="LF"] .ic71{width:28px;height:28px}
  body.m71 #touch .tf.fps > [data-s="LF"].on{background:rgba(230,70,40,.6)}
  body.m71 #touch .tf.fps > [data-s="LF"].m67auto{box-shadow:0 0 0 3px rgba(255,90,60,.35)}
  body.m71.m71auto #touch .tf.fps > [data-s="LF"]{opacity:.22;filter:grayscale(1);pointer-events:none}
  body.m71 #touch .tf.fps > [data-s="LJ"]{width:60px;height:60px;left:calc(var(--sl) + 92px);right:auto;bottom:calc(var(--sb) + 170px)}
  body.m71 #touch .tf.fps > [data-s="R1"]{width:64px;height:64px;right:calc(var(--sr) + 18px);bottom:calc(var(--sb) + 18px)}
  body.m71 #touch .tf.fps > [data-s="R2"]{width:52px;height:52px;right:calc(var(--sr) + 98px);bottom:calc(var(--sb) + 12px)}
  body.m71 #touch .tf.fps > [data-s="R3"]{width:54px;height:54px;right:calc(var(--sr) + 22px);bottom:calc(var(--sb) + 98px)}
  body.m71 #touch .tf.fps > [data-s="R4"]{width:54px;height:54px;right:calc(var(--sr) + 166px);bottom:calc(var(--sb) + 16px);border-color:rgba(143,255,170,.7)}
  .rg71{position:absolute;inset:-4px;pointer-events:none} .rg71 svg{width:100%;height:100%;transform:rotate(-90deg)}
  .rg71 circle{fill:none;stroke:#ffd27a;stroke-width:2.2;stroke-dasharray:100;stroke-dashoffset:100;stroke-linecap:round;transition:stroke-dashoffset .15s linear}
  [data-s="LF"] .rg71 circle{stroke:#ff8a6a}
  body.m71 #touch .g62b sup{right:7px;top:5px;font-size:12px} body.m71 #touch .g62b s{display:none}
  .sw71{display:none;position:absolute;left:50%;top:-22px;transform:translateX(-50%);color:#ff5a4a;animation:sw71 1s ease-in-out infinite}
  .sw71 .ic71{width:18px;height:18px} body.m71 #touch .g62b.m71sw .sw71{display:block}
  @keyframes sw71{0%,100%{transform:translate(-50%,3px);opacity:.5}50%{transform:translate(-50%,-4px);opacity:1}}
  body.m71.m64fps:not(.m71na) #m71auto{display:flex;flex-direction:column;align-items:center;justify-content:center;position:absolute;right:calc(var(--sr) + 94px);bottom:calc(var(--sb) + 82px);width:58px;height:44px;border-radius:12px;padding:0;
    background:rgba(12,14,16,.5);border:1.5px solid rgba(255,110,90,.6);color:#ffd7cf;pointer-events:auto}
  #m71auto .ic71{width:19px;height:19px} #m71auto small{font:800 9px "Exo 2";letter-spacing:.1em}
  body.m71 #m71auto.act{background:rgba(200,30,20,.72);border-color:#ff5a4a;color:#fff;box-shadow:0 0 12px rgba(255,59,48,.55)}
  body.m71.m64fps #m71skb{display:flex;align-items:center;justify-content:center;position:absolute;right:calc(var(--sr) + 6px);top:calc(var(--st) + 58px);width:50px;height:50px;padding:0;border-radius:14px;
    background:rgba(12,14,16,.5);border:1.5px solid rgba(214,198,154,.5);color:#ffd27a;pointer-events:auto}
  body.m71 #m71skb.act{background:rgba(214,198,154,.6);color:#111}
  body.m71.m64fps #m71hudb{display:flex;align-items:center;justify-content:center;position:absolute;left:calc(var(--sl) + 6px);top:calc(var(--st) + 6px);width:42px;height:42px;padding:0;border-radius:10px;background:rgba(12,14,16,.5);border:1.5px solid rgba(214,198,154,.5);color:#f0e8d0;pointer-events:auto}
  body.m71 #m71hudb.act{opacity:.6}
  body.m71.m64fps #hud{left:calc(var(--sl) + 54px)}
  body.m71.m71hudoff.m64fps #m67mm, body.m71.m71hudoff.m64fps #sq, body.m71.m71hudoff.m64fps #feed, body.m71.m71hudoff.m64fps #hud, body.m71.m71hudoff.m64fps #devLab, body.m71.m71hudoff.m64fps #cur{display:none!important}
  body.m71.m71sk.m64fps #sq{display:none!important}
  body.m71 #dcard{display:none!important}
  #m71rj{position:absolute;width:110px;height:110px;border-radius:50%;border:2px solid rgba(214,198,154,.35);background:rgba(214,198,154,.06);pointer-events:none}
  #m71rj i{position:absolute;left:35px;top:35px;width:40px;height:40px;border-radius:50%;background:rgba(214,198,154,.32)}
  body.m71.m64fps #m71pl{display:flex;position:absolute;left:50%;top:calc(var(--st) + 44px);transform:translate(-50%,-6px);align-items:center;gap:6px;padding:3px 12px 3px 8px;border-radius:14px;background:rgba(10,12,14,.55);border:1px solid rgba(214,198,154,.35);
    color:#f0e8d0;font:600 12px "Exo 2";white-space:nowrap;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none}
  #m71pl .ic71{width:15px;height:15px} body.m71.m64fps #m71pl.on{opacity:1;transform:translate(-50%,0)}
  #m71tip{position:fixed;z-index:40;padding:5px 10px;border-radius:8px;background:rgba(10,12,14,.92);border:1px solid rgba(214,198,154,.5);color:#f0e8d0;font:600 12px "Exo 2";max-width:60vw;pointer-events:none}
  body.m71 #m71tip.on{display:block}
  /* подсказки жестов */
  body.m71 #m71gh{position:absolute;z-index:14;align-items:center;gap:8px;padding:5px 12px 5px 6px;border-radius:22px;background:rgba(10,12,14,.72);border:1px solid rgba(255,210,122,.6);color:#ffe7b0;font:600 12.5px "Exo 2";pointer-events:none;white-space:nowrap}
  #m71gh .gi{position:relative;width:34px;height:34px;flex:none} #m71gh .gi .ic71{position:absolute;left:5px;top:6px;width:26px;height:26px;color:#fff;animation:gtap 1.2s ease-in-out infinite}
  #m71gh .gi i{position:absolute;left:9px;top:3px;width:12px;height:12px;border-radius:50%;border:2px solid #ffd27a;opacity:0}
  @keyframes gtap{0%,100%{transform:translateY(0)}45%{transform:translateY(3px) scale(.92)}}
  @keyframes gring{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.8)}}
  #m71gh.g-tap .gi i:first-of-type,#m71gh.g-dtap .gi i{animation:gring 1.2s ease-out infinite} #m71gh.g-dtap .gi i:last-of-type{animation-delay:.25s}
  #m71gh.g-hold .gi i:first-of-type{opacity:1;animation:none;border-color:#ffd27a;border-right-color:transparent;animation:spin71 1.2s linear infinite}
  @keyframes spin71{to{transform:rotate(360deg)}}
  #m71gh.g-swipe .gi .ic71{animation:gsw 1.3s ease-in-out infinite} @keyframes gsw{0%{transform:translate(-6px,4px)}60%{transform:translate(8px,-6px)}100%{transform:translate(8px,-6px);opacity:0}}
  #m71gh.g-pinch .gi i{opacity:1;animation:gpin 1.3s ease-in-out infinite} #m71gh.g-pinch .gi i:last-of-type{left:18px;top:18px;animation-direction:reverse}
  @keyframes gpin{0%,100%{transform:translate(0,0)}50%{transform:translate(-5px,-5px)}}
  /* ☰ на страницах */
  body.m71 #m67sheet.m71{top:calc(var(--st) + 6px);bottom:calc(var(--sb) + 6px);max-height:none;width:min(620px,76vw);overflow:hidden;padding:6px 10px}
  #m67sheet .m71tabs{display:none} #m67sheet.m71 .m71tabs{display:flex;gap:5px;margin:4px 0 6px}
  #touch #m67sheet .m71tabs button{flex:1;height:40px;display:flex;align-items:center;justify-content:center;gap:5px;font:700 12px "Exo 2";padding:0 4px}
  #touch #m67sheet .m71tabs button .ic71{width:18px;height:18px} #touch #m67sheet .m71tabs button.act{background:rgba(214,198,154,.55);color:#111;border-color:#d6c69a}
  #m67sheet.m71 .sec{display:none} #m67sheet.m71 h6{display:none}
  #m67sheet.m71[data-pg="act"]:not(.rts) .fsec, #m67sheet.m71[data-pg="act"].rts .rsec, #m67sheet.m71[data-pg="pos"] .p70sec, #m67sheet.m71[data-pg="set"] .osec, #m67sheet.m71[data-pg="ges"] .gsec{display:block}
  #m67sheet.m71 .grid{grid-template-columns:repeat(5,1fr)} #touch #m67sheet.m71 .grid > button{height:58px}
  #m67sheet.m71 .grid > button .ic71{width:22px;height:22px}
  #m67sheet.m71 .opts{display:grid;grid-template-columns:1fr 1fr;column-gap:10px}
  #m67sheet.m71 .row{min-height:46px} #m67sheet.m71 .row span{font-size:11.5px} #touch #m67sheet.m71 .row button{height:40px;width:auto;min-width:58px;padding:0 8px}
  #m67sheet.m71 .row:has([data-o="left"]){display:none}
  #m67sheet.m71 .p70sec .p70g{grid-template-columns:repeat(3,1fr)!important;gap:4px}
  #touch #m67sheet.m71 .p70w button{min-height:40px} #touch #m67sheet.m71 .p70w .p70a,#touch #m67sheet.m71 .p70w .p70x{width:32px}
  #m67sheet.m71 .p70w small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .g71grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .g71c{display:flex;align-items:center;gap:7px;padding:3px 7px;border:1px solid rgba(214,198,154,.22);border-radius:9px;background:rgba(214,198,154,.05);font:600 10.5px "Exo 2";color:#e8e2d0;line-height:1.15;min-height:36px}
  .g71c .ic71{color:#ffd27a;width:20px;height:20px}
  #touch #m67sheet .g71r,#screen .g71r{margin-top:5px;width:100%;height:40px;display:flex;align-items:center;justify-content:center;gap:6px}
`;
  document.head.appendChild(st);
};
M71.css2 = function(){
  const st = document.createElement('style'); st.id = 'm71css2';
  st.textContent = `
  /* ---- стратегия */
  body.m71 #m67rail{display:none!important}
  body.m71.m64rts:not(.m67side):not(.placing) #m71rail{display:grid;grid-template-columns:52px 52px;gap:5px;position:absolute;right:calc(var(--sr) + 6px);top:calc(var(--st) + 58px);pointer-events:none}
  body.m71 #touch #m71rail button{pointer-events:auto;width:52px;height:48px;padding:2px 0 0;border-radius:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(12,14,16,.58);border:1.5px solid rgba(214,198,154,.5);color:#f0e8d0}
  #m71rail .ic71{width:21px;height:21px} #m71rail small{font:700 8.5px "Exo 2";margin-top:2px;white-space:nowrap;max-width:50px;overflow:hidden;text-overflow:ellipsis}
  body.m71 #touch #m71rail button.act{background:rgba(214,198,154,.6);color:#111}
  body.m71 #touch #m71rail button[data-k="autonom"].act{background:rgba(30,90,110,.8);color:#eaf8ff;border-color:#7fdcff}
  body.m71.m64rts #m71sq{display:flex;flex-direction:column;gap:5px;position:absolute;left:calc(var(--sl) + 6px);top:calc(var(--st) + 136px);pointer-events:none}
  body.m71 #touch #m71sq button{pointer-events:auto;position:relative;width:46px;height:42px;padding:0;border-radius:9px;background:rgba(12,14,16,.6);border:1.5px solid rgba(214,198,154,.45);color:#f0e8d0;display:flex;align-items:center;justify-content:center;gap:2px;overflow:hidden}
  #m71sq b{position:absolute;left:4px;top:2px;font:800 11px "Exo 2";color:#ffd27a} #m71sq i{font-style:normal;font-size:17px;margin-left:6px}
  #m71sq s{position:absolute;left:0;bottom:0;height:3px;background:#8fffaa}
  body.m71 #touch #m71sq button.act{border-color:#8fffaa;background:rgba(40,90,50,.6)}
  body.m71.m64rts #m71mmb{display:flex;align-items:center;justify-content:center;position:absolute;width:30px;height:30px;padding:0;border-radius:8px;background:rgba(12,14,16,.6);border:1px solid rgba(214,198,154,.5);color:#f0e8d0;pointer-events:auto}
  body.m71.m64rts #m71mmb .ic71{width:16px;height:16px} body.m71.m64rts #m71mmb.min{width:46px;height:46px;border-radius:10px} body.m71.m64rts #m71mmb.min .ic71{width:24px;height:24px}
  body.m71.m64rts.m71box2:not(.m67side) .m71zb{display:flex;align-items:center;justify-content:center;position:absolute;right:calc(var(--sr) + 120px);width:44px;height:44px;padding:0;border-radius:50%;background:rgba(12,14,16,.55);border:1.5px solid rgba(214,198,154,.5);color:#f0e8d0;pointer-events:auto}
  body.m71 #m71zi{top:calc(var(--st) + 58px)} body.m71 #m71zo{top:calc(var(--st) + 108px)}
  body.m71 #m71ring{position:absolute;width:60px;height:60px;border-radius:50%;border:3px solid #ffd27a;border-right-color:transparent;pointer-events:none;animation:spin71 .6s linear infinite}
  body.m71 #m71box2{position:absolute;border:1.5px dashed #8fffaa;background:rgba(143,255,170,.08);pointer-events:none}
  body.m71 #m71rad.open{display:block;position:absolute;width:0;height:0;z-index:16}
  body.m71 #touch #m71rad .m71ri{position:absolute;width:62px;height:62px;margin:-31px 0 0 -31px;padding:2px 0 0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;
    background:rgba(12,14,16,.84);border:1.5px solid rgba(214,198,154,.7);color:#f0e8d0;box-shadow:0 4px 14px rgba(0,0,0,.5);animation:rad71 .14s ease-out}
  #m71rad .m71ri small{font:700 8.5px "Exo 2";max-width:58px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
  #m71rad .m71ri.cd{opacity:.5} body.m71 #touch #m71rad .m71ri.x{width:40px;height:40px;margin:-20px 0 0 -20px;left:0;top:0;border-color:rgba(255,140,120,.7)}
  @keyframes rad71{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
  body.m71.m64rts #card{left:calc(var(--sl) + 176px)}
  /* ---- меню телефона: экраны с большими кнопками */
  #screen.p71scr{overflow:hidden!important;align-items:stretch;justify-content:center;padding:calc(var(--st) + 6px) calc(var(--sr) + 10px) calc(var(--sb) + 6px) calc(var(--sl) + 10px)!important;box-sizing:border-box}
  #screen.p71scr > .p71{display:flex;flex-direction:column;width:100%;max-width:880px;height:100%;margin:0 auto;gap:6px;color:#f0e8d0;font-family:"Exo 2",sans-serif}
  .p71hd{display:flex;align-items:center;gap:8px;min-height:44px;flex:none}
  .p71hd h1{margin:0;font:400 22px "Russo One","Exo 2";color:#e8dcb8;letter-spacing:.06em;flex:1;text-align:center}
  .p71hd h2{margin:0;flex:1;text-align:center;font:400 18px "Russo One","Exo 2";letter-spacing:.08em;color:#e8dcb8}
  .p71hd > i{width:96px} .p71hd .p71v{width:96px;text-align:right;opacity:.6;font-size:11px}
  #screen .p71hb{display:flex;align-items:center;justify-content:center;gap:4px;min-width:96px;height:44px;padding:0 10px;border-radius:12px;background:rgba(214,198,154,.1);border:1.5px solid rgba(214,198,154,.45);color:#f0e8d0;font:700 13px "Exo 2";margin:0}
  #screen .p71hb.x{min-width:48px;width:48px}
  .p71g{display:grid;gap:7px;flex:1;min-height:0} .p71g.c4{grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr} .p71g.c2{grid-template-columns:1fr 1fr;align-content:start;grid-auto-rows:minmax(50px,auto)}
  .p71g.tall{grid-auto-rows:minmax(0,1fr);max-height:240px}
  #screen .p71t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:0;height:auto;width:auto;margin:0;padding:4px 6px;border-radius:14px;background:rgba(14,16,18,.72);border:1.5px solid rgba(214,198,154,.42);color:#f0e8d0;text-align:center;overflow:hidden}
  #screen .p71t .ic71{width:24px;height:24px;color:#d6c69a} #screen .p71t b{font:700 13.5px "Exo 2";line-height:1.1} #screen .p71t small{font:600 10.5px "Exo 2";opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  #screen .p71t.big{background:rgba(50,110,60,.55);border-color:#8fffaa} #screen .p71t.big .ic71{color:#8fffaa;width:28px;height:28px} #screen .p71t.big b{font-size:17px}
  #screen .p71t.w2{grid-column:span 2} #screen .p71t.on,#screen .p71t.cur{border-color:#8fffaa;background:rgba(40,90,50,.45)}
  .p71s{display:flex;align-items:stretch;border-radius:14px;border:1.5px solid rgba(214,198,154,.42);background:rgba(14,16,18,.72);overflow:hidden;min-height:0}
  #screen .p71s button{width:46px;flex:none;margin:0;padding:0;border:none;border-radius:0;background:rgba(214,198,154,.12);color:#f0e8d0;display:flex;align-items:center;justify-content:center;height:auto;min-height:44px}
  .p71s span{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;padding:2px} .p71s small{font:600 10px "Exo 2";opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%} .p71s b{font:700 13.5px "Exo 2";white-space:nowrap}
  #screen .p71o{display:flex;align-items:center;gap:8px;margin:0;padding:0 12px;min-height:50px;height:auto;width:auto;border-radius:14px;border:1.5px solid rgba(214,198,154,.42);background:rgba(14,16,18,.72);color:#f0e8d0;text-align:left}
  #screen .p71o span{flex:1;font:600 12.5px "Exo 2";line-height:1.2} #screen .p71o b{font:800 12px "Exo 2";padding:4px 9px;border-radius:8px;background:rgba(214,198,154,.14)} #screen .p71o.on b{background:rgba(60,130,80,.75);color:#eaffef}
  .p71g.rows .p71s{min-height:50px}
  .p71ft{display:flex;justify-content:center;flex:none} #screen .p71ap{display:flex;align-items:center;gap:6px;height:46px;min-width:200px;justify-content:center;margin:0;border-radius:14px;background:rgba(50,110,60,.6);border:1.5px solid #8fffaa;color:#eaffef}
  #screen .p71ap b{font:700 14px "Exo 2"}
  .p71g.flags{grid-auto-rows:minmax(0,120px);align-content:center} #screen .p71f em{font-style:normal;line-height:1} #screen .p71f em svg{width:60px;height:40px;margin:0!important;border-radius:4px!important} #screen .p71f b{font-size:15px}
  #screen.p71scr .p71hd h2{font-size:20px} #screen .p71t small svg{width:21px;height:14px;margin:0!important}
  .p71g.news{grid-auto-rows:auto;align-content:start} .p71n{display:flex;gap:8px;padding:7px 10px;border-radius:12px;border:1px solid rgba(214,198,154,.25);background:rgba(14,16,18,.7);font:600 12px "Exo 2";line-height:1.3}
  .p71n b{color:#ffd27a;font-size:16px}
  .p71ges .g71grid{grid-template-columns:repeat(3,1fr);flex:1;align-content:start}
  #screen.p71scr .p71p70 .p70w{flex:1} #screen.p71scr .p71p70 .p70g{grid-template-columns:repeat(3,1fr)} #screen.p71scr .p71p70 .p70w small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #screen.p71scr .p71p70 .p70w button{min-height:40px}
  #screen.p71scr.scr-career,#screen.p71scr.scr-saves{overflow-y:auto!important}
  @media (max-height:400px){ .p71hd{min-height:40px} #screen .p71hb{height:40px} .p71hd h1{font-size:19px} #screen .p71t b{font-size:12.5px} #screen .p71t .ic71{width:21px;height:21px} .p71g{gap:6px} }
`;
  document.head.appendChild(st);
};
if (TOUCH.on){ M71.css(); M71.css2(); }
