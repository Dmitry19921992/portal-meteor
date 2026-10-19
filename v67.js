// =====================================================================
//  v6.7 — номер версии и «Новое в v6.7» в главном меню
// =====================================================================
const V67_NEWS = [
  ['Телефон: управление как в PUBG Mobile — джойстик появляется там, где коснулся левый палец, обзор — правой половиной экрана, большая кнопка огня справа, рядом ранец, граната, прицел, перезарядка и ракета. Всё остальное — в меню ☰', 'Phone: PUBG Mobile-style controls — the joystick appears where your left thumb touches, look with the right half of the screen, a big fire button on the right with jetpack, grenade, aim, reload and rocket around it. Everything else is in the ☰ menu', 'Điện thoại: điều khiển kiểu PUBG Mobile — cần điều khiển hiện ở chỗ ngón trái chạm, nhìn bằng nửa phải màn hình, nút bắn lớn bên phải cùng ba lô, lựu đạn, ngắm, nạp đạn và tên lửa. Mọi thứ khác nằm trong menu ☰'],
  ['«Простой огонь» на телефоне (включён сразу): навёл прицел на врага — стреляет сам, у цели прицел чуть «липнет». Выключается в ☰ или в настройках', '"Simple fire" on phone (on by default): put the crosshair on an enemy and it fires by itself, with a gentle aim assist. Turn it off in ☰ or in settings', '“Bắn đơn giản” trên điện thoại (bật sẵn): ngắm trúng địch là tự bắn, có hỗ trợ ngắm nhẹ. Tắt trong ☰ hoặc cài đặt'],
  ['Стратегия на телефоне: справа большие кнопки «Вся армия», «Отряд» (по очереди), «Инженер», «Рамка», «Автономно»; панель стройки — только когда выбран инженер или завод; портрет и миникарты меньше, куратор — одной строкой', 'Strategy on phone: big buttons on the right — "All army", "Squad" (cycles), "Builder", "Box", "Autonomous"; the build panel appears only with a builder or factory selected; smaller portrait and minimaps, one-line curator', 'Chiến thuật trên điện thoại: nút lớn bên phải — “Toàn quân”, “Đội” (lần lượt), “Kỹ sư”, “Khung”, “Tự hành”; bảng xây chỉ hiện khi chọn kỹ sư hoặc nhà máy'],
  ['Кнопки не заходят под вырез экрана и полоску «домой»; в портретной ориентации — подсказка повернуть телефон. На компьютере всё как было', 'Buttons stay clear of the notch and the home bar; in portrait you get a hint to turn the phone. On PC nothing changed', 'Nút bấm tránh tai thỏ và thanh home; ở chiều dọc có gợi ý xoay ngang. Trên máy tính không thay đổi'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v6\.6 · /, 'v6.7 · ');
    const m = h.match(/<h3>[^<]*v6\.6[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v6.7', 'New in v6.7', 'Mới trong v6.7')}</h3><ul>${V67_NEWS.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v6.7'; };
}
