// =====================================================================
//  v7.2 — номер версии, «Новое в v7.2» (RU / EN / VI / HE)
// =====================================================================
const V72_NEWS = [
  ['Обучение ×4: отдельные пошаговые обучения «Стратегия» и «Шутер» для ПК и для телефона. Безопасная песочница с манекенами, подсветка нужной кнопки, стрелки, анимированные клавиши, мышь и жесты, шаг засчитывается только за настоящее действие, «повторить шаг», прогресс вверху и награда в конце',
   'Training ×4: separate step-by-step "Strategy" and "Shooter" lessons for PC and for phone. A safe sandbox with dummies, the right button highlighted, arrows, animated keys, mouse and gestures; a step counts only for the real action, "repeat step", progress at the top and a reward at the end',
   'Huấn luyện ×4: bài “Chiến thuật” và “Bắn súng” riêng cho PC và điện thoại. Sa bàn an toàn với hình nộm, làm nổi nút cần bấm, mũi tên, phím, chuột và cử chỉ động; bước chỉ tính khi làm thật, “làm lại bước”, tiến độ phía trên và phần thưởng cuối bài',
   'אימון ×4: שיעורי „אסטרטגיה" ו„יריות" נפרדים למחשב ולטלפון. ארגז חול בטוח עם בובות, הדגשת הכפתור הנכון, חצים, מקשים, עכבר ומחוות מונפשים; שלב נספר רק על פעולה אמיתית, „חזור על השלב", התקדמות למעלה ופרס בסוף'],
  ['Меню «Обучение» само показывает обучения для твоего устройства; «Показать другие» — все четыре на любом устройстве; «Старое обучение (v7.1)» осталось',
   'The Training menu shows the lessons for your device; "Show others" — all four on any device; the "Old training (v7.1)" is still there',
   'Menu Huấn luyện tự hiện bài cho thiết bị của bạn; “Hiện các bài khác” — cả bốn bài trên mọi thiết bị; vẫn còn “Huấn luyện cũ (v7.1)”',
   'תפריט האימון מציג את השיעורים למכשיר שלך; „הצג אחרים" — כל הארבעה בכל מכשיר; „האימון הישן (v7.1)" נשאר'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v7\.1 · /, 'v7.2 · ');
    const m = h.match(/<h3>[^<]*v7\.1[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.2', 'New in v7.2', 'Mới trong v7.2', 'חדש ב-v7.2')}</h3><ul>${V72_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v7.2'; };
  // телефонное меню (v7.1): номер версии и «Новое в v7.2»
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){ return pm0.call(this).replace(/v7\.1 · /, 'v7.2 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.1/, '$1v7.2'); };
    const pn0 = P71M.news;
    P71M.news = function(){
      const all = V72_NEWS.concat(typeof V71_NEWS !== 'undefined' ? V71_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.2', 'NEW IN v7.2', 'MỚI TRONG v7.2', 'חדש ב-v7.2'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}
