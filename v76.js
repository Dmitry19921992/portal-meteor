// =====================================================================
//  v7.6 — version label "v7.6 · build <date>", "New in v7.6" (RU / EN / VI; HE via HE68),
//  version menu: v7.6 (this one) / v7.5 / v7.4 + milestones (old ones open from Cloudflare Pages).
//  Separate file so feature branches (v76feel, v76fac) do not conflict on it.
// =====================================================================
const V76_NEWS = [
  ['«▶ Играть сразу» — первая кнопка меню: короткий пролёт под небом-порталом — и сразу в бой (пропуск — любая клавиша или тап).',
   '"▶ Play now" — the first menu button: a short flight under the portal sky and straight into battle (skip with any key or a tap).',
   '“▶ Chơi ngay” — nút đầu tiên: bay ngắn dưới bầu trời cổng — vào trận ngay.'],
  ['Попадания ощущаются: металлический звук и искры, метка убийства у прицела (в голову — жёлтая), серия ×N, плавная тряска от взрывов, слоу-мо на важных убийствах. Тряску, слоу-мо и подсказку можно выключить в Настройках.',
   'Hits feel like hits: a metallic sound and sparks, a kill marker at the crosshair (headshot — yellow), a ×N streak, smooth shake from explosions, slow motion on key kills. Shake, slow motion and the hint can be turned off in Settings.',
   'Cảm giác bắn trúng: âm kim loại, tia lửa, dấu hạ gục, chuỗi ×N, rung mượt, quay chậm khi hạ mục tiêu quan trọng.'],
  ['Итог матча: время, уничтожения, лучшая серия, ★ MVP и лучший отряд, карточка матча — «⇪ Поделиться», PNG или ссылка на игру.',
   'Match results: time, kills, best streak, ★ MVP and best squad, a match card — "⇪ Share", PNG or a link to the game.',
   'Kết quả trận: thời gian, số hạ gục, ★ MVP, đội giỏi nhất, thẻ trận để chia sẻ.'],
  ['Подсказка «что делать сейчас» слева под ресурсами: приказ стратега, точка для захвата, наступление Роя. ✕ или F7 — свернуть.',
   'A "what to do now" hint on the left under resources: the strategist\'s order, a point to capture, a Swarm attack. ✕ or F7 — collapse.',
   'Gợi ý “làm gì bây giờ” bên trái: lệnh, điểm cần chiếm, đợt tấn công. ✕ hoặc F7 — thu gọn.'],
  ['Бой сохраняется сам, если закрыть или свернуть вкладку, — в меню «⟲ Продолжить».',
   'The battle saves itself when you close or hide the tab — "⟲ Continue" in the menu.',
   'Trận tự lưu khi đóng tab — “⟲ Tiếp tục” trong menu.'],
  ['Версия v7.5 осталась в меню «🕘 Версия игры» — если новая не понравится. Анонимная статистика (без имён и почты) теперь отправляется; выключить — в Настройках.',
   'v7.5 stays in the "🕘 Game version" menu in case you prefer it. Anonymous statistics (no names or e-mail) are now sent; turn off in Settings.',
   'v7.5 vẫn có trong menu “🕘 Phiên bản”. Thống kê ẩn danh — tắt trong Cài đặt.'],
];
// ---- version menu: v7.6 is current, v7.5 joins the archive (Cloudflare versions/v7_5), v7.3 leaves the short list
if (typeof VER75 !== 'undefined'){
  VER75.cur = 'v7_6';
  VER75.L = VER75.L.filter(o => o.id !== 'v7_3').map(o => o.id === 'v7_5' ? Object.assign({}, o, { tag: undefined, d: '25.10.2026', mb: 6.7 }) : o);
  VER75.L.unshift({ id: 'v7_6', v: 'v7.6', d: '25.10.2026', mb: 6.8, tag: 'new', n: ['«Играть сразу», отклик попаданий, итог матча с карточкой, подсказка «что делать», автосохранение', '"Play now", hit feedback, match results with a share card, "what to do" hint, autosave'] });
}
{
  const VTXT = () => 'v7.6 · ' + tr('и старые: v7.5, v7.4, вехи v1–v7.0', 'and older: v7.5, v7.4, milestones v1–v7.0', 'và bản cũ', 'וגרסאות ישנות');
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.apply(this, arguments);
    h = h.replace(/(id="m_ver75"[\s\S]*?<small[^>]*>)v7\.5 · [^<]*(<\/small>)/, (m, a, b) => a + VTXT() + b);
    h = h.replace(/v7\.5 · /g, 'v7.6 · ');
    const m = h.match(/<h3>[^<]*v7\.5[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.6', 'New in v7.6', 'Mới trong v7.6', 'חדש ב-v7.6')}</h3><ul>${V76_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.apply(this, arguments); document.title = 'Portal Meteor — v7.6'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){
      return pm0.apply(this, arguments).replace(/v7\.5 · /g, 'v7.6 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.5/, '$1v7.6')
        .replace(/(id="m_ver75"[\s\S]*?<small>)v7\.5(<\/small>)/, '$1v7.6$2');
    };
    P71M.news = function(){
      const all = V76_NEWS.concat(typeof V75_NEWS !== 'undefined' ? V75_NEWS : [], typeof V75F_NEWS !== 'undefined' ? V75F_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.6', 'NEW IN v7.6', 'MỚI TRONG v7.6', 'חדש ב-v7.6'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}
