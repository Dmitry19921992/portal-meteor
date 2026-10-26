// =====================================================================
//  v7.9 — version label "v7.9 · build <date>", "New in v7.9" (RU / EN / VI; other languages via v79_lang), version menu v7.9 / v7.8.1 / v7.8.
//  Loaded after v79_radio.js, before v79_lang.js (the language module stays last). Separate file — merge-friendly.
// =====================================================================
const V79_NEWS = [
  ['Робо-ниндзя: киборг с катаной. Открывается в Казарме исследованием «Протокол „Тень“» (нужен Мехзавод). Сам телепортируется в зоны врага, режет врагов на части (без крови — искры), рывки, сюрикены, дуэли с вражеским ниндзя. Вселись в неё — режим АВТО или ручное управление (на телефоне — свои кнопки).',
   'Robo-ninja: a cyborg with a katana. Unlocked at the Barracks with the "Shadow Protocol" research (needs a Mech Factory). Teleports into enemy zones by herself, cuts enemies apart (no blood — sparks), dashes, shuriken, duels with the enemy ninja. Possess her — AUTO mode or manual control (own buttons on the phone).',
   'Robo-ninja: cyborg cầm katana, mở ở Doanh trại bằng nghiên cứu “Giao thức Bóng”. Tự dịch chuyển vào vùng địch, chém, lướt, phi tiêu, đấu tay đôi.'],
  ['Радио Portal Meteor: 103 трека EDMITRY прямо в игре. Клавиша 5 (переназначается), на телефоне — ☰ → Настройки → Звук. Громкость и «включать само в бою» — в настройках; музыка тише на взрывах и под голос рации.',
   'Radio Portal Meteor: 103 EDMITRY tracks right in the game. Key 5 (rebindable), on the phone — ☰ → Settings → Sound. Volume and "auto-play in battle" in the settings; the music ducks under explosions and radio voice.',
   'Radio Portal Meteor: 103 bản nhạc EDMITRY trong game. Phím 5; trên điện thoại — ☰ → Cài đặt → Âm thanh.'],
  ['Новые языки: узбекский и таджикский — полностью; китайский, испанский, португальский — частично. Новый выбор языка в меню рядом с «Новый матч».',
   'New languages: Uzbek and Tajik — complete; Chinese, Spanish, Portuguese — partial. New language selector in the menu next to "New match".',
   'Ngôn ngữ mới: tiếng Uzbek và Tajik — đầy đủ; Trung, Tây Ban Nha, Bồ Đào Nha — một phần.'],
  ['Телефон: «скрыть значки» 👁 собирает оставшиеся кнопки в аккуратную колонку у правого края; портрет больше не налезает; iPhone — игра не конфликтует с жестами Safari, а «Поделиться → На экран „Домой“» запускает её на весь экран.',
   'Phone: "hide icons" 👁 gathers the remaining buttons into a tidy column at the right edge; portrait no longer overlaps; iPhone — the game no longer fights Safari gestures, and "Share → Add to Home Screen" launches it full screen.',
   'Điện thoại: 👁 gom các nút còn lại thành cột gọn bên phải; iPhone — “Thêm vào MH chính” mở toàn màn hình.'],
  ['Из v7.8.1: меню ☰ в углу (пауза, заново, обучение, графика), без авто-Денди, кнопка действия ✋ на телефоне. v7.8.1 и v7.8 остались в меню «🕘 Версия игры».',
   'From v7.8.1: ☰ corner menu (pause, restart, training, graphics), no auto-Dendy, ✋ action button on the phone. v7.8.1 and v7.8 stay in the "🕘 Game version" menu.',
   'Từ v7.8.1: menu ☰ ở góc, không tự bật Dendy, nút ✋. v7.8.1 và v7.8 vẫn có trong “🕘 Phiên bản”.'],
];
if (typeof STATS75 !== 'undefined') STATS75.ver = '7.9';
if (typeof VER75 !== 'undefined'){
  VER75.cur = 'v7_9';
  VER75.L = VER75.L.filter(o => o.id !== 'v7_7').map(o => o.id === 'v7_8_1' ? Object.assign({}, o, { tag: undefined }) : o);
  VER75.L.unshift({ id: 'v7_9', v: 'v7.9', d: '25.10.2026', mb: 7.0, tag: 'new', n: ['Робо-ниндзя, радио EDMITRY, узбекский и таджикский, удобство телефона и iPhone', 'Robo-ninja, EDMITRY radio, Uzbek and Tajik, phone and iPhone UX'] });
}
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.apply(this, arguments);
    h = h.replace(/(id="m_ver75"[\s\S]*?<small[^>]*>)v7\.8\.1 · [^<]*(<\/small>)/, (m, a, b) => a + 'v7.9 · ' + tr('и старые: v7.8.1, v7.8, вехи v1–v7.0', 'and older: v7.8.1, v7.8, milestones v1–v7.0', 'và bản cũ', 'וגרסאות ישנות') + b);
    h = h.replace(/v7\.8\.1 · /g, 'v7.9 · ');
    const m = h.match(/<h3>[^<]*v7\.8\.1<\/h3>/);
    const news = `<h3>${tr('Новое в v7.9', 'New in v7.9', 'Mới trong v7.9', 'חדש ב-v7.9')}</h3><ul>${V79_NEWS.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.apply(this, arguments); document.title = 'Portal Meteor — v7.9'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){
      return pm0.apply(this, arguments).replace(/v7\.8\.1 · /g, 'v7.9 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.8\.1/, '$1v7.9')
        .replace(/(id="m_ver75"[\s\S]*?<small>)v7\.8\.1(<\/small>)/, '$1v7.9$2');
    };
    P71M.news = function(){
      const all = V79_NEWS.concat(typeof V781_NEWS !== 'undefined' ? V781_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.9', 'NEW IN v7.9', 'MỚI TRONG v7.9', 'חדש ב-v7.9'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2])}</span></div>`).join('')}</div></div>`;
    };
  }
}
