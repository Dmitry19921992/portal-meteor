// =====================================================================
//  v7.7 — version label "v7.7 · build <date>", "New in v7.7" (RU / EN / VI; HE via HE68),
//  version menu: v7.7 (this one) / v7.6 / v7.5 + milestones (old ones open from Cloudflare Pages).
//  Loaded after v76.js (wraps its menu hooks). Separate file so feature branches do not conflict on it.
// =====================================================================
const V77_NEWS = [
  ['Выбор фракции перед матчем: «Консорциум» (тяжёлая пехота в силовой броне, броня и артиллерия) или «Рой» (скорость, стаи дронов, тяжёлые выстрелы с искажением). ИИ играет за другую. Выбор запоминается.',
   'Choose your faction before a match: the "Consortium" (heavy power-armoured infantry, armour and artillery) or the "Swarm" (speed, drone packs, heavy shots with distortion). The AI plays the other one. The choice is remembered.',
   'Chọn phe trước trận: “Liên minh” (bộ binh giáp nặng, pháo binh) hoặc “Bầy Đàn” (tốc độ, bầy drone, phát bắn nặng). AI chơi phe kia.'],
  ['У каждой фракции своя техника и уникальное: у Консорциума — танк «Носорог» и «Керамитовые плиты», у Роя — «Стая дронов» и «Фазовые ранцы». Баланс проверен матчами ботов.',
   'Each faction has its own vehicles and uniques: the Consortium — the "Rhino" tank and "Ceramite plates", the Swarm — the "Drone pack" and "Phase jetpacks". Balance checked with bot matches.',
   'Mỗi phe có xe và đơn vị riêng: “Rhino”, “Giáp ceramite” / “Bầy drone”, “Ba lô pha”.'],
  ['Воронки от взрывов: артиллерия, ракеты и пушки танков копают ямы в метеорите — по ним ходят и ездят, в них можно укрыться.',
   'Explosion craters: artillery, rockets and tank cannons dig pits into the meteor — you can walk and drive through them and take cover inside.',
   'Hố nổ: pháo, tên lửa, pháo xe tăng đào hố trên thiên thạch — có thể đi, lái và nấp trong đó.'],
  ['Вид от 3-го лица для бойца (V, запоминается; на телефоне — Управление) и плавная камера техники с меткой, куда попадёт пушка.',
   'Third-person view for troopers (V, remembered; on the phone — Controls) and a smooth vehicle camera with a marker where the cannon will hit.',
   'Góc nhìn thứ ba cho lính (V; trên điện thoại — Điều khiển) và camera xe mượt với dấu điểm trúng.'],
  ['Версия v7.6 осталась в меню «🕘 Версия игры» — если новая не понравится.',
   'v7.6 stays in the "🕘 Game version" menu in case you prefer it.',
   'v7.6 vẫn có trong menu “🕘 Phiên bản”.'],
];
if (typeof STATS75 !== 'undefined') STATS75.ver = '7.7';
// ---- version menu: v7.7 is current, v7.6 joins the archive (Cloudflare versions/v7_6)
if (typeof VER75 !== 'undefined'){
  VER75.cur = 'v7_7';
  // v7.4 leaves the short list (its file stays on Cloudflare: versions/v7_4)
  VER75.L = VER75.L.filter(o => o.id !== 'v7_4').map(o => o.id === 'v7_6' ? Object.assign({}, o, { tag: undefined }) : o);
  VER75.L.unshift({ id: 'v7_7', v: 'v7.7', d: '25.10.2026', mb: 6.8, tag: 'new', n: ['Фракции Консорциум / Рой с выбором перед матчем, воронки от взрывов, вид от 3-го лица', 'Consortium / Swarm factions with a choice before the match, explosion craters, third-person view'] });
}
{
  const VTXT = () => 'v7.7 · ' + tr('и старые: v7.6, v7.5, вехи v1–v7.0', 'and older: v7.6, v7.5, milestones v1–v7.0', 'và bản cũ', 'וגרסאות ישנות');
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.apply(this, arguments);
    h = h.replace(/(id="m_ver75"[\s\S]*?<small[^>]*>)v7\.6 · [^<]*(<\/small>)/, (m, a, b) => a + VTXT() + b);
    h = h.replace(/v7\.6 · /g, 'v7.7 · ');
    const m = h.match(/<h3>[^<]*v7\.6[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.7', 'New in v7.7', 'Mới trong v7.7', 'חדש ב-v7.7')}</h3><ul>${V77_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.apply(this, arguments); document.title = 'Portal Meteor — v7.7'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){
      return pm0.apply(this, arguments).replace(/v7\.6 · /g, 'v7.7 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.6/, '$1v7.7')
        .replace(/(id="m_ver75"[\s\S]*?<small>)v7\.6(<\/small>)/, '$1v7.7$2');
    };
    P71M.news = function(){
      const all = V77_NEWS.concat(typeof V76_NEWS !== 'undefined' ? V76_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.7', 'NEW IN v7.7', 'MỚI TRONG v7.7', 'חדש ב-v7.7'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}
