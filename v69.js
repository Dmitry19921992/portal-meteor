// =====================================================================
//  v6.9 — номер версии и «Новое в v6.9» (RU / EN / VI / HE)
// =====================================================================
const V69_NEWS = [
  ['Новое оружие в руках: детальные 3D-модели автомата, ПП, пулемёта (вращающийся блок стволов), рельсотрона, плечевой ракетной установки и гранаты. Отдача, перезарядка с магазином, гильзы, вспышка, ствол раскаляется и дымит после длинной очереди',
   'New weapons in your hands: detailed 3D rifle, SMG, rotary machine gun, railgun, shoulder rocket launcher and grenade. Recoil, magazine reloads, ejected shells, muzzle flash, and the barrel glows and smokes after long bursts',
   'Vũ khí mới trên tay: súng trường, tiểu liên, súng máy nòng xoay, súng ray, bệ phóng tên lửa trên vai và lựu đạn 3D chi tiết. Giật, thay băng đạn, vỏ đạn văng, chớp lửa, nòng nóng đỏ và bốc khói sau loạt dài',
   'נשק חדש בידיים: רובה, תת-מקלע, מקלע עם קנים מסתובבים, רובה מסילה, משגר טילים על הכתף ורימון — בתלת-ממד מפורט. רתע, החלפת מחסנית, תרמילים, הבזק, והקנה מתלהט ומעשן אחרי צרור ארוך'],
  ['Дроны умеют больше: скан местности (видно врагов в тумане), ракетный залп и ремонт своих роботов и техники — «дрон-медик». В стратегии — кнопки F / G / T, в бою — 1 / Q / G',
   'Drones do more: terrain scan (reveals enemies in the fog), rocket salvo and repairing friendly robots and vehicles — the "medic drone". In strategy: F / G / T buttons, in battle: 1 / Q / G',
   'Drone làm được nhiều hơn: quét địa hình (lộ địch trong sương mù), loạt tên lửa và sửa robot, xe phe ta — “drone y tế”. Chiến thuật: nút F / G / T, chiến đấu: 1 / Q / G',
   'הרחפנים יודעים יותר: סריקת שטח (חושפת אויבים בערפל), מטח טילים ותיקון רובוטים ורכבים ידידותיים — „רחפן חובש". באסטרטגיה: כפתורים F / G / T, בקרב: 1 / Q / G'],
  ['У танка, рейдера, РСЗО и миномёта — ремкомплект (T, в бою — 1). Враг и ИИ-стратег тоже пользуются новыми способностями, куратор подсказывает',
   'Tanks, raiders, MLRS and mortars get a repair kit (T, in battle — 1). The enemy and the AI strategist use the new abilities too, and the curator gives tips',
   'Xe tăng, raider, MLRS và súng cối có bộ sửa chữa (T, khi chiến đấu — 1). Địch và chiến lược gia AI cũng dùng kỹ năng mới, người hướng dẫn sẽ gợi ý',
   'לטנק, לפושט, למשגר הרקטות ולמרגמה יש ערכת תיקון (T, בקרב — 1). גם האויב והאסטרטג הממוחשב משתמשים ביכולות החדשות, והמדריך נותן טיפים'],
  ['На телефоне — новые кнопки в контекстной зоне; управление на ПК не менялось', 'On the phone, new buttons in the context area; PC controls are unchanged', 'Trên điện thoại có nút mới ở vùng ngữ cảnh; điều khiển PC không đổi', 'בטלפון — כפתורים חדשים באזור ההקשר; השליטה במחשב לא השתנתה'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v6\.8 · /, 'v6.9 · ');
    const m = h.match(/<h3>[^<]*v6\.8[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v6.9', 'New in v6.9', 'Mới trong v6.9', 'חדש ב-v6.9')}</h3><ul>${V69_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v6.9'; };
}
