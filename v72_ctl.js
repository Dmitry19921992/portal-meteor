// =====================================================================
//  v7.2 — РЕЕСТР СХЕМ УПРАВЛЕНИЯ ДЛЯ ОБУЧЕНИЯ
//  Обучение (v72_tut.js) обращается к действию по ИМЕНИ (look, move, jet, fire, grenade,
//  rocket, reflex, skills, select, order, radial, box, zoom, possess, …). «Как это сделать»
//  — текст, клавиши / мышь / жест для анимации, что подсветить, дополнительная проверка
//  способа — берётся из описания текущей схемы управления:
//    CTL72.schemes.pc  — ПК (клавиатура и мышь);
//    CTL72.schemes.v71 — телефон, раскладка v7.1.
//  Новая схема телефона: CTL72.add('v73b', { name, plat: 'phone', acts: { … } }) и вернуть её id
//  из CTL72.pickPhone() (когда игрок выбрал эту раскладку). Действие, которого нет в схеме,
//  обучение просто пропускает (например, «АВТО» есть только на телефоне).
//  Поля действия: h — текст [ru, en, vi, he]; keys() — клавиши; mouse — 'move'|'lmb'|'rmb'|'wheel'|'drag';
//  g — жест 'swipe'|'swipeUp'|'tap'|'dtap'|'hold'|'pinch'|'drag'|'joy'; el(T) — цели подсветки
//  [{sel}|{zone:[x0,y0,x1,y1] доли экрана}|{rect:[l,t,r,b]}]; via(T) — доказательство, что сделано
//  именно этим способом; wrong(T) — подсказка, если цель достигнута другим способом.
// =====================================================================
const CTL72 = {
  schemes: {},
  add(id, def){ def.id = id; this.schemes[id] = def; return def; },
  pickPhone(){ return 'v71'; },
  current(plat){ return plat === 'pc' ? 'pc' : this.pickPhone(); },
  how(id, act){ const s = this.schemes[id]; return (s && s.acts[act]) || null; },
};
const L72 = a => tr(a[0], a[1], a[2], a[3]);
// ---------------------------------------------------------------- ПК
CTL72.add('pc', { plat: 'pc', name: ['ПК', 'PC', 'PC', 'מחשב'], acts: {
  look: { mouse: 'move', h: ['Двигай мышью — взгляд поворачивается.', 'Move the mouse to turn your view.', 'Di chuột để xoay góc nhìn.', 'הזז את העכבר כדי לסובב את המבט.'] },
  move: { keys: () => [bk('fwd'), bk('left'), bk('back'), bk('right')], h: [`${bk('fwd')} ${bk('left')} ${bk('back')} ${bk('right')} — идти. Дойди до зелёной метки.`, `${bk('fwd')} ${bk('left')} ${bk('back')} ${bk('right')} — walk. Reach the green marker.`, `${bk('fwd')} ${bk('left')} ${bk('back')} ${bk('right')} — đi. Tới điểm đánh dấu xanh.`, `${bk('fwd')} ${bk('left')} ${bk('back')} ${bk('right')} — הליכה. הגע לסימון הירוק.`] },
  jet: { keys: () => [bk('run')], h: [`Держи ${bk('run')} — ранец поднимет тебя в воздух.`, `Hold ${bk('run')} — the jetpack lifts you up.`, `Giữ ${bk('run')} — ba lô phản lực nâng bạn lên.`, `החזק ${bk('run')} — הסילון מרים אותך לאוויר.`] },
  brake: { keys: () => [bk('run'), bk('down')], h: [`Взлети (${bk('run')}) и в воздухе нажми ${bk('down')} — тормоз.`, `Take off (${bk('run')}) and press ${bk('down')} in the air — brake.`, `Bay lên (${bk('run')}) rồi nhấn ${bk('down')} trên không — phanh.`, `המרא (${bk('run')}) ולחץ ${bk('down')} באוויר — בלימה.`] },
  fire: { mouse: 'lmb', h: ['Наведи прицел на манекен и жми ЛКМ.', 'Aim at a dummy and press LMB.', 'Ngắm vào hình nộm và nhấn chuột trái.', 'כוון לבובה ולחץ על הכפתור השמאלי.'] },
  aim: { mouse: 'rmb', h: ['Держи ПКМ — прицел с приближением.', 'Hold RMB — aim with zoom.', 'Giữ chuột phải — ngắm và phóng to.', 'החזק את הכפתור הימני — כוונת עם זום.'] },
  reload: { keys: () => [bk('reload')], h: [`Нажми ${bk('reload')}.`, `Press ${bk('reload')}.`, `Nhấn ${bk('reload')}.`, `לחץ ${bk('reload')}.`] },
  rocket: { keys: () => [bk('rocket')], h: [`Наведи на манекен и нажми ${bk('rocket')}.`, `Aim at a dummy and press ${bk('rocket')}.`, `Ngắm hình nộm và nhấn ${bk('rocket')}.`, `כוון לבובה ולחץ ${bk('rocket')}.`] },
  grenade: { keys: () => [bk('grenade')], h: [`Нажми ${bk('grenade')} — бросок (держи дольше — дальше).`, `Press ${bk('grenade')} to throw (hold longer — farther).`, `Nhấn ${bk('grenade')} để ném (giữ lâu — xa hơn).`, `לחץ ${bk('grenade')} לזריקה (החזק יותר — רחוק יותר).`] },
  reflex: { keys: () => [bk('reflex')], h: [`Нажми ${bk('reflex')}.`, `Press ${bk('reflex')}.`, `Nhấn ${bk('reflex')}.`, `לחץ ${bk('reflex')}.`] },
  cover: { keys: () => [bk('fwd'), bk('left'), bk('back'), bk('right')], h: ['Зайди за стену, пока метка снайпера не станет серой.', 'Get behind the wall until the sniper marker turns grey.', 'Nấp sau tường đến khi dấu bắn tỉa chuyển xám.', 'היכנס מאחורי הקיר עד שסימון הצלף יאפיר.'] },
  switch: { keys: () => [bk('switch')], h: [`Нажми ${bk('switch')}.`, `Press ${bk('switch')}.`, `Nhấn ${bk('switch')}.`, `לחץ ${bk('switch')}.`] },
  squad: { keys: () => [bk('solo')], el: () => [{ sel: '#squadp [data-mm="solo"]' }], h: [`Нажми ${bk('solo')} — «отряд со мной ⇄ действую один».`, `Press ${bk('solo')} — "squad with me ⇄ going solo".`, `Nhấn ${bk('solo')} — “đội đi cùng ⇄ một mình”.`, `לחץ ${bk('solo')} — „החוליה איתי ⇄ לבד".`] },
  toRts: { keys: () => [bk('rts')], el: () => [{ sel: '#uxStrat' }], h: [`Нажми ${bk('rts')} или «◩ Стратегия» слева вверху.`, `Press ${bk('rts')} or "◩ Strategy" at the top left.`, `Nhấn ${bk('rts')} hoặc “◩ Chiến thuật” góc trên trái.`, `לחץ ${bk('rts')} או „◩ אסטרטגיה" למעלה משמאל.`] },
  toFps: { keys: () => [bk('rts')], el: () => [{ sel: '#card .poss' }], h: [`Нажми ${bk('rts')} или зелёную «▶ Вселиться» внизу.`, `Press ${bk('rts')} or the green "▶ Possess" below.`, `Nhấn ${bk('rts')} hoặc nút xanh “▶ Nhập vai” bên dưới.`, `לחץ ${bk('rts')} או על „▶ השתלט" הירוק למטה.`] },
  pan: { keys: () => ['W', 'A', 'S', 'D'], h: ['W A S D или стрелки — сдвиг камеры (или подведи мышь к краю экрана).', 'W A S D or arrows move the camera (or push the mouse to the screen edge).', 'W A S D hoặc phím mũi tên để di chuyển camera (hoặc đưa chuột ra mép).', 'W A S D או החצים מזיזים את המצלמה (או קרב את העכבר לקצה).'] },
  zoom: { mouse: 'wheel', h: ['Крути колесо мыши.', 'Scroll the mouse wheel.', 'Lăn bánh xe chuột.', 'גלגל את גלגלת העכבר.'] },
  select: { mouse: 'lmb', h: ['ЛКМ по отряду с зелёной меткой.', 'LMB on the squad with the green marker.', 'Chuột trái vào đội có dấu xanh.', 'לחיצה שמאלית על החוליה עם הסימון הירוק.'] },
  order: { mouse: 'rmb', h: ['ПКМ по жёлтой метке на земле (2× ПКМ — бегом).', 'RMB on the yellow marker on the ground (double RMB — run).', 'Chuột phải vào dấu vàng trên mặt đất (2 lần — chạy).', 'לחיצה ימנית על הסימון הצהוב בקרקע (כפולה — ריצה).'] },
  selType: { keys: () => ['Ctrl'], mouse: 'lmb', h: ['Ctrl + ЛКМ по отряду — выделятся все такие на экране.', 'Ctrl + LMB on a squad — all of that type on screen get selected.', 'Ctrl + chuột trái vào đội — chọn tất cả cùng loại trên màn hình.', 'Ctrl + לחיצה שמאלית על חוליה — כל החוליות מהסוג הזה נבחרות.'] },
  box: { mouse: 'drag', h: ['Зажми ЛКМ на пустом месте и протяни рамку через отряды.', 'Hold LMB on empty ground and drag a box over the squads.', 'Giữ chuột trái ở chỗ trống và kéo khung qua các đội.', 'החזק לחיצה שמאלית במקום ריק וגרור מסגרת על החוליות.'] },
  minimap: { mouse: 'lmb', el: () => T72mm(), h: ['ЛКМ по миникарте слева внизу — камера прыгнет туда.', 'LMB on the minimap at the bottom left — the camera jumps there.', 'Chuột trái vào bản đồ nhỏ góc dưới trái — camera nhảy tới đó.', 'לחיצה שמאלית על המפה הקטנה למטה משמאל — המצלמה קופצת לשם.'] },
  builder: { mouse: 'lmb', keys: () => ['.'], el: () => [{ sel: '#side [data-ux="selbuilder"]' }], h: ['ЛКМ по инженеру с меткой (или «.» — ближайший инженер).', 'LMB on the marked builder (or "." — nearest builder).', 'Chuột trái vào kỹ sư có dấu (hoặc “.” — kỹ sư gần nhất).', 'לחיצה שמאלית על המהנדס המסומן (או „." — הקרוב ביותר).'] },
  build: { keys: () => [keyCap(BUILD_KEYS.barracks)], el: () => S.place === 'barracks' ? [] : [{ sel: '#side [data-ux="build:barracks"]' }], h: [`Справа «Казарма» (${keyCap(BUILD_KEYS.barracks)}), затем ЛКМ по земле у метки.`, `"Barracks" on the right (${keyCap(BUILD_KEYS.barracks)}), then LMB on the ground at the marker.`, `“Doanh trại” bên phải (${keyCap(BUILD_KEYS.barracks)}), rồi chuột trái xuống đất tại dấu.`, `„מגורים" מימין (${keyCap(BUILD_KEYS.barracks)}), ואז לחיצה שמאלית על הקרקע ליד הסימון.`] },
  construct: { h: ['Ничего нажимать не нужно — смотри, как растёт здание.', 'No input needed — watch the building rise.', 'Không cần bấm gì — xem công trình mọc lên.', 'אין צורך ללחוץ — צפה בבניין צומח.'] },
  produce: { mouse: 'lmb', el: () => T72selB('barracks') ? [{ sel: '#side [data-ux="prod:squad"]' }] : [], h: ['ЛКМ по Казарме → справа «Штурмовой отряд».', 'LMB on the Barracks → "Assault squad" on the right.', 'Chuột trái vào Doanh trại → “Đội xung kích” bên phải.', 'לחיצה שמאלית על המגורים → „חוליית הסתערות" מימין.'] },
  gather: { mouse: 'rmb', h: ['Выбери инженера и ПКМ по зелёным кристаллам.', 'Select a builder and RMB on the green crystals.', 'Chọn kỹ sư rồi chuột phải vào tinh thể xanh.', 'בחר מהנדס ולחץ לחיצה ימנית על הגבישים הירוקים.'] },
} });
// ---------------------------------------------------------------- телефон, раскладка v7.1
const T72R = [0.5, 0.24, 0.96, 0.86], T72Lz = [0.05, 0.4, 0.4, 0.95];
CTL72.add('v71', { plat: 'phone', name: ['Телефон', 'Phone', 'Điện thoại', 'טלפון'], acts: {
  look: { g: 'swipe', el: () => [{ zone: T72R }], h: ['Веди пальцем по правой половине экрана.', 'Drag a finger on the right half of the screen.', 'Kéo ngón tay ở nửa phải màn hình.', 'גרור אצבע בחצי הימני של המסך.'] },
  move: { g: 'joy', el: () => [{ zone: T72Lz }], h: ['Коснись слева и веди пальцем — это джойстик. Дойди до зелёной метки.', 'Touch the left side and slide — that is the stick. Reach the green marker.', 'Chạm bên trái và trượt — đó là cần điều khiển. Tới dấu xanh.', 'גע בצד שמאל והחלק — זה הג׳ויסטיק. הגע לסימון הירוק.'] },
  jet: { g: 'hold', el: () => [{ sel: '#touch [data-s="LJ"]' }], h: ['Держи кнопку «Ранец».', 'Hold the "Jet" button.', 'Giữ nút “Bay”.', 'החזק את כפתור „סילון".'] },
  fire: { g: 'hold', el: () => [{ sel: '#touch [data-s="LF"]' }], h: ['Правым пальцем наведи прицел на манекен и держи «Огонь».', 'Aim at a dummy with your right finger and hold "Fire".', 'Ngắm hình nộm bằng ngón phải và giữ “Bắn”.', 'כוון לבובה באצבע ימין והחזק „אש".'] },
  reload: { g: 'tap', el: () => [{ sel: '#touch [data-s="R2"]' }], h: ['Тапни «Перезар.».', 'Tap "Reload".', 'Chạm “Nạp”.', 'הקש „טעינה".'] },
  auto: { g: 'tap', el: () => [{ sel: '#m71auto' }], h: ['Тапни «АВТО» — красная рамка захватит манекен, боец стреляет сам.', 'Tap "AUTO" — a red frame locks the dummy and your trooper fires.', 'Chạm “TỰ ĐỘNG” — khung đỏ khóa hình nộm, lính tự bắn.', 'הקש „אוטו" — מסגרת אדומה ננעלת על הבובה והלוחם יורה.'] },
  rocket: { g: 'tap', el: () => M71.fr.rect ? [{ rect: M71.fr.rect }] : [{ sel: '#m71auto' }], via: T => T.since('m71:frame'),
    h: ['Тапни по красной рамке на цели — вылетит ракета. (Нет рамки — включи «АВТО».)', 'Tap the red frame on the target — a rocket flies. (No frame? Turn on "AUTO".)', 'Chạm khung đỏ trên mục tiêu — tên lửa bay ra. (Không có khung? Bật “TỰ ĐỘNG”.)', 'הקש על המסגרת האדומה — רקטה יוצאת. (אין מסגרת? הפעל „אוטו".)'],
    wrong: ['Ракета ушла, но через навыки. Попробуй тап прямо по красной рамке.', 'Rocket fired from the skills row. Try tapping the red frame itself.', 'Tên lửa bắn từ hàng kỹ năng. Thử chạm thẳng vào khung đỏ.', 'הרקטה נורתה משורת הכישורים. נסה להקיש על המסגרת עצמה.'] },
  grenade: { g: 'swipeUp', el: () => [{ sel: '#touch .g62b' }], via: T => T.since('m71:gswipe'),
    h: ['Проведи пальцем по «Гранате» вверх — граната полетит точно в цель.', 'Swipe up on "Grenade" — it flies right at the target.', 'Vuốt lên trên nút “Lựu đạn” — bay thẳng vào mục tiêu.', 'החלק למעלה על „רימון" — הוא עף ישר אל המטרה.'],
    wrong: ['Это обычный бросок. Теперь свайп вверх по кнопке — в цель.', 'That was a normal throw. Now swipe up on the button — at the target.', 'Đó là ném thường. Giờ vuốt lên trên nút — vào mục tiêu.', 'זו הייתה זריקה רגילה. עכשיו החלק למעלה על הכפתור.'] },
  reflex: { g: 'dtap', el: () => [{ zone: T72R }], via: T => T.since('m71:dtap'), h: ['Быстро тапни 2 раза по правой половине экрана.', 'Double tap quickly on the right half of the screen.', 'Chạm nhanh 2 lần ở nửa phải màn hình.', 'הקש פעמיים מהר בחצי הימני של המסך.'] },
  skills: { g: 'tap', el: () => [{ sel: '#m71skb' }], h: ['Тапни молнию справа вверху — откроется ряд навыков.', 'Tap the lightning bolt at the top right — the skills row opens.', 'Chạm tia sét góc trên phải — hàng kỹ năng mở ra.', 'הקש על הברק למעלה מימין — שורת הכישורים נפתחת.'] },
  cover: { g: 'joy', el: () => [{ zone: T72Lz }], h: ['Джойстиком зайди за стену, пока метка снайпера не станет серой.', 'Use the stick to get behind the wall until the sniper marker turns grey.', 'Dùng cần đi ra sau tường đến khi dấu bắn tỉa chuyển xám.', 'השתמש בג׳ויסטיק כדי להיכנס מאחורי הקיר עד שהסימון יאפיר.'] },
  switch: { g: 'tap', el: () => [{ sel: '#touch .tt .m67n' }], h: ['Тапни «⇆» вверху справа.', 'Tap "⇆" at the top right.', 'Chạm “⇆” góc trên phải.', 'הקש „⇆" למעלה מימין.'] },
  squad: { g: 'tap', el: () => [{ sel: '#squadp [data-mm="solo"]' }], h: ['Тапни плашку «Отряд со мной» слева вверху.', 'Tap the "Squad with me" tag at the top left.', 'Chạm nhãn “Đội đi cùng” góc trên trái.', 'הקש על התווית „החוליה איתי" למעלה משמאל.'] },
  toRts: { g: 'tap', el: () => [{ sel: '#touch .tt [data-t="map"]' }], h: ['Тапни «◩ Стратегия» вверху справа.', 'Tap "◩ Strategy" at the top right.', 'Chạm “◩ Chiến thuật” góc trên phải.', 'הקש „◩ אסטרטגיה" למעלה מימין.'] },
  toFps: { g: 'tap', el: () => [{ sel: '#touch .tt [data-t="map"]' }], h: ['Тапни «▶ В бой» вверху справа (или «Вселиться» в карточке).', 'Tap "▶ To battle" at the top right (or "Possess" on the card).', 'Chạm “▶ Vào trận” góc trên phải (hoặc “Nhập vai” trên thẻ).', 'הקש „▶ לקרב" למעלה מימין (או „השתלט" בכרטיס).'] },
  pan: { g: 'swipe', el: () => [{ zone: [0.3, 0.3, 0.7, 0.7] }], h: ['Веди одним пальцем по карте.', 'Drag one finger across the map.', 'Kéo một ngón tay trên bản đồ.', 'גרור אצבע אחת על המפה.'] },
  zoom: { g: 'pinch', el: () => [{ zone: [0.32, 0.28, 0.68, 0.72] }], h: ['Щипок двумя пальцами — ближе / дальше.', 'Pinch with two fingers — closer / farther.', 'Chụm hai ngón — gần / xa.', 'צביטה בשתי אצבעות — קרוב / רחוק.'] },
  select: { g: 'tap', h: ['Тапни по отряду с зелёной меткой.', 'Tap the squad with the green marker.', 'Chạm vào đội có dấu xanh.', 'הקש על החוליה עם הסימון הירוק.'] },
  order: { g: 'tap', h: ['Тапни по жёлтой метке на земле (2× тап — бегом).', 'Tap the yellow marker on the ground (double tap — run).', 'Chạm dấu vàng trên mặt đất (2 lần — chạy).', 'הקש על הסימון הצהוב בקרקע (פעמיים — ריצה).'] },
  selType: { g: 'dtap', via: T => T.since('m71:rtap'), h: ['Быстро тапни 2 раза по отряду — выделятся все такие на экране.', 'Double tap a squad — all of that type on screen get selected.', 'Chạm nhanh 2 lần vào đội — chọn tất cả cùng loại.', 'הקש פעמיים על חוליה — כל החוליות מהסוג הזה נבחרות.'] },
  box: { g: 'drag', el: () => [{ zone: [0.25, 0.3, 0.75, 0.8] }], via: T => T.since('m71:rhold'), h: ['Держи палец на пустом месте до жёлтого кольца, затем веди — получится рамка.', 'Hold a finger on empty ground until the yellow ring, then drag — a box appears.', 'Giữ ngón tay ở chỗ trống đến khi có vòng vàng, rồi kéo — thành khung.', 'החזק אצבע במקום ריק עד הטבעת הצהובה, ואז גרור — נוצרת מסגרת.'] },
  radial: { g: 'hold', h: ['Держи палец на земле у метки до кольца и отпусти — откроется круговое меню.', 'Hold a finger on the ground at the marker until the ring, then release — a radial menu opens.', 'Giữ ngón tay trên đất tại dấu đến khi có vòng rồi thả — menu tròn mở ra.', 'החזק אצבע על הקרקע ליד הסימון עד הטבעת ושחרר — נפתח תפריט עגול.'] },
  cards: { g: 'tap', el: () => [{ sel: '#m71sq button:nth-child(2)' }], h: ['Тапни карточку «2» слева (2× тап — камера к отряду).', 'Tap card "2" on the left (double tap — camera to the squad).', 'Chạm thẻ “2” bên trái (2 lần — camera tới đội).', 'הקש על כרטיס „2" משמאל (פעמיים — מצלמה לחוליה).'] },
  minimap: { g: 'tap', el: () => T72mm(), h: ['Тапни по миникарте слева внизу — камера прыгнет туда.', 'Tap the minimap at the bottom left — the camera jumps there.', 'Chạm bản đồ nhỏ góc dưới trái — camera nhảy tới đó.', 'הקש על המפה הקטנה למטה משמאל — המצלמה קופצת לשם.'] },
  builder: { g: 'tap', el: () => [{ sel: '#m71rail [data-k="eng"]' }], h: ['Тапни «Инженеры» справа или по инженеру с меткой.', 'Tap "Builders" on the right or the marked builder.', 'Chạm “Kỹ sư” bên phải hoặc kỹ sư có dấu.', 'הקש „מהנדסים" מימין או על המהנדס המסומן.'] },
  build: { g: 'tap', el: () => S.place === 'barracks' ? (S.placeAt ? [{ sel: '#placeBar [data-pb="ok"]' }] : []) : [{ sel: '#side [data-ux="build:barracks"]' }],
    h: ['Справа «Казарма» → тапни землю у метки → «✔ Строить».', '"Barracks" on the right → tap the ground at the marker → "✔ Build".', '“Doanh trại” bên phải → chạm đất tại dấu → “✔ Xây”.', '„מגורים" מימין → הקש על הקרקע ליד הסימון → „✔ בנה".'] },
  construct: { h: ['Ничего нажимать не нужно — смотри, как растёт здание.', 'No input needed — watch the building rise.', 'Không cần bấm gì — xem công trình mọc lên.', 'אין צורך ללחוץ — צפה בבניין צומח.'] },
  produce: { g: 'tap', el: () => T72selB('barracks') ? [{ sel: '#side [data-ux="prod:squad"]' }] : [], h: ['Тапни по Казарме → справа «Штурмовой отряд».', 'Tap the Barracks → "Assault squad" on the right.', 'Chạm Doanh trại → “Đội xung kích” bên phải.', 'הקש על המגורים → „חוליית הסתערות" מימין.'] },
  gather: { g: 'tap', h: ['Выбери инженера и тапни по зелёным кристаллам.', 'Select a builder and tap the green crystals.', 'Chọn kỹ sư rồi chạm vào tinh thể xanh.', 'בחר מהנדס והקש על הגבישים הירוקים.'] },
  possess: { g: 'tap', el: () => [{ sel: '#card .poss' }], h: ['Тапни зелёную «▶ Вселиться» в карточке (или держи палец на отряде → «Вселиться»).', 'Tap the green "▶ Possess" on the card (or hold on a squad → "Possess").', 'Chạm nút xanh “▶ Nhập vai” trên thẻ (hoặc giữ trên đội → “Nhập vai”).', 'הקש על „▶ השתלט" הירוק בכרטיס (או החזק על חוליה → „השתלט").'] },
} });
CTL72.schemes.pc.acts.possess = CTL72.schemes.pc.acts.toFps;
CTL72.schemes.v71.acts.possess.alt = CTL72.schemes.v71.acts.toFps;
// цели: миникарта (центр и радиус из mmCenters), выбранное здание
function T72mm(){ try { const c = mmCenters()[0], R = (MM && MM.R) || 50; if (c[0] < 0) return [{ sel: '#m71mmb' }]; return [{ rect: [c[0] - R - 4, c[1] - R - 4, c[0] + R + 4, c[1] + R + 4] }]; } catch (e){ return []; } }
function T72selB(type){ return S.selB && S.selB.alive && S.selB.team === 0 && S.selB.type === type ? S.selB : null; }
