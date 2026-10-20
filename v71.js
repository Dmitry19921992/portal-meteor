// =====================================================================
//  v7.1 — номер версии, «Новое в v7.1» (RU / EN / VI / HE)
// =====================================================================
const V71_NEWS = [
  ['Телефон: новое управление шутером — слева джойстик, «Огонь» и «Ранец», справа обзор свайпом или джойстиком; «АВТО» — захват цели с красной рамкой, как в Syphon Filter: боец сам держит цель и стреляет, джойстиком кружишь вокруг, свайпом — соседняя цель',
   'Phone: new shooter controls — stick, Fire and Jet on the left, look by swipe or a second stick on the right; AUTO locks on with a red frame like Syphon Filter: your trooper keeps the target and fires, the stick circles around it, a swipe flicks to the next target',
   'Điện thoại: điều khiển mới — bên trái cần, Bắn và Bay; bên phải vuốt hoặc cần để nhìn; TỰ ĐỘNG khóa mục tiêu với khung đỏ như Syphon Filter: lính tự bám mục tiêu và bắn, cần để đi vòng, vuốt để đổi mục tiêu',
   'טלפון: שליטה חדשה ביריות — משמאל ג׳ויסטיק, „אש" ו„סילון", מימין מבט בהחלקה או בג׳ויסטיק; „אוטו" נועל מטרה עם מסגרת אדומה כמו ב-Syphon Filter: הלוחם מחזיק את המטרה ויורה, הג׳ויסטיק מקיף אותה, החלקה — המטרה הבאה'],
  ['Жесты: 2× тап справа — рефлекс; тап по красной рамке — ракета, свайп «Гранаты» вверх — граната точно в цель (или вариант B — щипок); подсказки жестов при первом запуске, значки вместо слов, вверху — навыки и «скрыть HUD»',
   'Gestures: double tap on the right — reflex; tap the red frame — rocket, swipe "Grenade" up — a grenade right at the target (or variant B — pinch); first-run gesture hints, icons instead of words, skills and "hide HUD" at the top',
   'Cử chỉ: chạm 2 lần bên phải — phản xạ; chạm khung đỏ — tên lửa, vuốt “Lựu đạn” lên — lựu đạn vào mục tiêu (hoặc kiểu B — chụm); gợi ý cử chỉ lần đầu, biểu tượng thay chữ',
   'מחוות: הקשה כפולה מימין — רפלקס; הקשה על המסגרת האדומה — רקטה, החלקת „רימון" למעלה — רימון אל המטרה (או גרסה B — צביטה); רמזי מחוות בהפעלה הראשונה, סמלים במקום מילים'],
  ['Стратегия на телефоне: тап — выбрать и приказать, держать — радиальное меню (атака, стоять, патруль, строить, сбор), держать и тянуть — рамка, 2× тап — все такие же на экране; кнопки «пехота / техника / дроны / инженеры», карточки отрядов 1-2-3, «следить», вибро-отклик',
   'Strategy on the phone: tap to select and order, hold for a radial menu (attack, hold, patrol, build, rally), hold and drag for a box, double tap for all of a type on screen; infantry / vehicles / drones / builders buttons, squad cards 1-2-3, follow camera, haptic ticks',
   'Chiến thuật trên điện thoại: chạm để chọn và ra lệnh, giữ — menu tròn (tấn công, giữ, tuần tra, xây, tập hợp), giữ và kéo — khung, chạm 2 lần — cùng loại; nút bộ binh / xe / drone / kỹ sư, thẻ đội 1-2-3, theo dõi, rung',
   'אסטרטגיה בטלפון: הקשה — בחירה ופקודה, החזקה — תפריט עגול (התקפה, עמידה, סיור, בנייה, כינוס), החזקה וגרירה — מסגרת, הקשה כפולה — כל הסוג במסך; כפתורי חי"ר / רכבים / רחפנים / מהנדסים, כרטיסי חוליות 1-2-3, מעקב, רטט'],
  ['Меню на телефоне без ползунков и прокрутки: каждый раздел — свой экран с большими кнопками, языки — флагами, «− значение +», «Назад / ✕ / Применить»',
   'Phone menus without sliders or scrolling: every section is its own screen with big buttons, languages as flags, "− value +", "Back / ✕ / Apply"',
   'Menu điện thoại không thanh trượt, không cuộn: mỗi mục một màn hình nút lớn, ngôn ngữ bằng cờ, “− giá trị +”',
   'תפריטי טלפון בלי מחוונים ובלי גלילה: כל חלק — מסך משלו עם כפתורים גדולים, שפות כדגלים, „− ערך +"'],
  ['Режим разработчика: «Полигон» в Арсенале — бесконечный бой отрядов всех типов и всей техники в центре карты, подкрепления обеим сторонам; X — сразу в бойца на полигоне (ПК и телефон)',
   'Developer mode: "Polygon" in the Arsenal — an endless battle of every squad type and vehicle at the map centre with reinforcements for both sides; X takes you straight into a soldier there (PC and phone)',
   'Chế độ nhà phát triển: “Trường bắn” trong Kho — trận bất tận mọi loại quân và xe ở trung tâm bản đồ; X — nhập vai lính ở đó',
   'מצב מפתח: „פוליגון" בנשקייה — קרב אינסופי של כל סוגי החוליות והרכבים במרכז המפה עם תגבורות; X — ישר ללוחם שם (מחשב וטלפון)'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v7\.0 · /, 'v7.1 · ');
    const m = h.match(/<h3>[^<]*v7\.0[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.1', 'New in v7.1', 'Mới trong v7.1', 'חדש ב-v7.1')}</h3><ul>${V71_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v7.1'; };
}
