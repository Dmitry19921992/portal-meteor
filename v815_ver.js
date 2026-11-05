// v8.15 merge: version label once, over v7.9 (v8.15 current, v7.9 / v7.8.1 / v7.8 in old versions). Loaded after all v8 modules, before v79_lang.js.
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.15'; FX87.ver = h => typeof h === 'string' ? h.replace(/v7\.\d+(?:\.\d+)? · /g, 'v8.15 · ') : h; }
if (typeof STATS75 !== 'undefined') STATS75.ver = '8.15';
if (typeof VER75 !== 'undefined'){
  VER75.L = VER75.L.map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }));
  VER75.L.unshift({ id: 'v8_15', v: 'v8.15', d: '05.11.2026', mb: 7.9, tag: 'new', n: ['Режим «Командир», боссы фракций, живой метеорит (рельеф, биомы, погода, аномалии, фауна), живой мир; быстрее, геймпад, планшет, энциклопедия, режим отзыва, простой интерфейс для телефона', 'Commander mode, faction bosses, living meteor (terrain, biomes, weather, anomalies, fauna), living world; faster, gamepad, tablet, encyclopedia, feedback mode, simple phone interface'] });
  VER75.cur = 'v8_15';
}
// "New in v8.15" (PC menu + phone ☰ news), over v7.9's block
const V815_NEWS = [
  ['Три режима одной кнопкой: Шутер (сам в бою), новый Командир (ведёшь один отряд, у каждого типа 4 способности) и Стратег. На телефоне — простой интерфейс: меньше кнопок, режимы открываются по ходу боя.',
   'Three modes on one button: Shooter (you fight yourself), the new Commander (lead one squad, 4 abilities per unit type) and Strategist. On the phone — a simple interface: fewer buttons, modes unlock during the battle.',
   'Ba chế độ một nút: Bắn súng, Chỉ huy (mới) và Chiến lược. Điện thoại: giao diện đơn giản.'],
  ['Живой метеорит: скалы, гряды, ангар в столовой горе, озёра лавы, льда и метана, три биома, погода местами, новые аномалии и местная фауна.',
   'Living meteor: rocks, ridges, a hangar in a mesa, lava / ice / methane lakes, three biomes, local weather, new anomalies and native fauna.',
   'Thiên thạch sống: đá, hang, hồ dung nham/băng/metan, ba quần xã, thời tiết, dị thường và động vật.'],
  ['Фракции стали разными: Рой роет туннели и лечится, Консорциум ставит барьеры и чинит технику. С 12-й минуты — боссы «Бастион» и «Жнец»; в своего можно вселиться.',
   'Factions play differently: the Swarm digs tunnels and regenerates, the Consortium builds barriers and repairs. From minute 12 — the Bastion and Reaper bosses; you can possess your own.',
   'Phe khác biệt: Bầy đào hầm, Tập đoàn dựng rào. Từ phút 12 — trùm Bastion và Reaper.'],
  ['Живой мир: свои бойцы просят помощи по радио (с наградой), герои дают задания, при застое фронта — операция «Перелом боя». Капсулы, ящики и удары стартуют с базы через небо-портал.',
   'Living world: your troopers ask for help over the radio (with a reward), heroes give quests, a stalled front gets a "Breakthrough" operation. Capsules, crates and strikes launch from the base through the sky portal.',
   'Thế giới sống: lính xin trợ giúp qua radio, anh hùng giao nhiệm vụ, chiến dịch “Đột phá”.'],
  ['Быстрее (кадр до 2 раз дешевле), геймпад во всех режимах, раскладка для планшета, энциклопедия всего в игре, режим отзыва — заметка со скриншотом одной клавишей.',
   'Faster (a frame up to 2x cheaper), gamepad in every mode, tablet layout, an encyclopedia of everything in the game, feedback mode — a note with a screenshot on one key.',
   'Nhanh hơn, tay cầm, máy tính bảng, bách khoa toàn thư, chế độ góp ý.'],
  ['Все новые тексты переведены на узбекский, таджикский, китайский, испанский, португальский и иврит. Ниндзя и радио v7.9 на месте; v7.9 — в меню «🕘 Версия игры».',
   'All new texts are translated into Uzbek, Tajik, Chinese, Spanish, Portuguese and Hebrew. The v7.9 ninja and radio stay; v7.9 is in the "🕘 Game version" menu.',
   'Văn bản mới đã được dịch. Ninja và radio v7.9 vẫn còn; v7.9 có trong “🕘 Phiên bản”.'],
];
if (typeof MENU !== 'undefined' && MENU.html_main){
  const hm815 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm815.apply(this, arguments);
    const m = h.match(/<h3>[^<]*v7\.9<\/h3>/);
    const news = `<h3>${tr('Новое в v8.15', 'New in v8.15', 'Mới trong v8.15', 'חדש ב-v8.15')}</h3><ul>${V815_NEWS.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h.replace(/(и старые: |and older: )v7\.8\.1/, '$1v7.9, v7.8.1');
  };
}
if (typeof P71M !== 'undefined' && P71M.news){
  const pn815 = P71M.main;
  P71M.main = function(){ return pn815.apply(this, arguments).replace(/(Новое в |New in |Mới |חדש ב-)v7\.9/, '$1v8.15'); };
  P71M.news = function(){
    const all = V815_NEWS.concat(typeof V79_NEWS !== 'undefined' ? V79_NEWS : []);
    return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v8.15', 'NEW IN v8.15', 'MỚI TRONG v8.15', 'חדש ב-v8.15'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2])}</span></div>`).join('')}</div></div>`;
  };
}
