// =====================================================================
//  v6.5 — номер версии и «Новое в v6.5» в главном меню
// =====================================================================
const V65_NEWS = [
  ['Тяжёлый боец (пулемётчик) Консорциума теперь — настоящая 3D-модель со скелетом: стоит, ходит, бежит с оружием, стреляет на ходу и красиво падает', 'The Consortium heavy gunner is now a real rigged 3D model: idles, walks, charges with his gun, fires on the move and falls when destroyed', 'Xạ thủ hạng nặng của Liên minh giờ là mô hình 3D có khung xương: đứng, đi, chạy cầm súng, vừa đi vừa bắn và ngã khi bị hạ'],
  ['Модель стоит по нормали к поверхности метеорита, поворачивает корпус по прицелу и держит пулемёт в руках; вдали анимация обновляется реже — FPS не падает', 'The model follows the meteor surface normal, turns its torso to aim and holds the machine gun; far away the animation updates less often to keep FPS', 'Mô hình bám theo bề mặt thiên thạch, xoay thân theo hướng ngắm và cầm súng máy; ở xa hoạt ảnh cập nhật thưa hơn để giữ FPS'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v6\.4 · /, 'v6.5 · ');
    const m = h.match(/<h3>[^<]*v6\.4[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v6.5', 'New in v6.5', 'Mới trong v6.5')}</h3><ul>${V65_NEWS.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v6.5'; };
}
