// =====================================================================
//  v6.6 — номер версии и «Новое в v6.6» в главном меню
// =====================================================================
const V66_NEWS = [
  ['Как в StarCraft 2: штаб и форпост делают только инженеров. Пехота — в Казарме, техника — в Мехзаводе, дроны — в Дрон-хабе, ранцы и десант — в Аэродоке (с 6:00 боя). Рой играет по тем же правилам', 'Like StarCraft 2: the HQ and outposts make only builders. Infantry comes from the Barracks, vehicles from the Mech factory, drones from the Drone hub, jetpacks and sky troopers from the Airdock (from 6:00). The Swarm plays by the same rules', 'Như StarCraft 2: sở chỉ huy chỉ làm kỹ sư. Bộ binh từ Doanh trại, xe từ Nhà máy, drone từ Trạm drone, ba lô và lính đổ bộ từ Bến bay (từ 6:00)'],
  ['Два вида добычи: инженеры носят зелёные кристаллы в штаб или Склад руды, а Экстрактор на жиле копает сам. Вверху видно, сколько даёт каждый вид', 'Two kinds of mining: builders carry green crystals to the HQ or an Ore depot, and an Extractor on a vein mines by itself. The top bar shows what each kind gives', 'Hai kiểu khai thác: kỹ sư mang tinh thể xanh về, Máy khai thác trên mạch tự khai thác'],
  ['Твои юниты слушаются только тебя; кнопка «⟳ Автономно» (O) — пусть воюют сами. Ушёл в бой — все автономны. Бот больше не тратит твою руду, пока ты командуешь', 'Your units obey only you; the "⟳ Autonomous" button (O) lets them fight on their own. Going into battle makes everyone autonomous. The bot no longer spends your ore while you command', 'Đơn vị chỉ nghe bạn; nút “⟳ Tự hành” (O). Bot không tiêu quặng của bạn khi bạn chỉ huy'],
  ['Юниты отвечают по рации на клик и приказ — у каждого типа свой голос. Живая «вебка» выделенного юнита в стиле VHS', 'Units answer on the radio when clicked and ordered — each type has its own voice. A live VHS-style "webcam" of the selected unit', 'Đơn vị trả lời qua bộ đàm; “webcam” trực tiếp của đơn vị được chọn'],
  ['Куратор в стратегии снова виден и слышен: голос, сигнал, стрелки — и при каждом входе подсказывает главное', 'The strategy Curator is visible and audible again: voice, chime, arrows — and on every entry it tells you the main thing to do', 'Người hướng dẫn hiển thị và có tiếng'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v6\.5 · /, 'v6.6 · ');
    const m = h.match(/<h3>[^<]*v6\.5[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v6.6', 'New in v6.6', 'Mới trong v6.6')}</h3><ul>${V66_NEWS.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v6.6'; };
}
