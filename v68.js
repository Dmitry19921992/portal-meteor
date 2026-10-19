// =====================================================================
//  v6.8 — номер версии, «Новое в v6.8», иврит: RTL меню и текстов HUD, мелочи для 4-го языка
//  Иврит — МАШИННЫЙ перевод (machine translation, NLLB-200), не вычитан носителем языка.
// =====================================================================
const V68_NEWS = [
  ['Голоса бойцов на английском, вьетнамском и иврите: язык озвучки переключается вместе с языком интерфейса. По-английски — 7 разных голосов, у каждого бойца свой; дрон и куратор говорят женскими голосами',
   'Unit voices in English, Vietnamese and Hebrew: the voice language follows the interface language. English has 7 different voices, so every soldier sounds different; the drone and the curator have female voices',
   'Giọng lính bằng tiếng Anh, tiếng Việt và tiếng Do Thái: giọng nói đổi theo ngôn ngữ giao diện. Tiếng Anh có 7 giọng khác nhau — mỗi lính một giọng; drone và hướng dẫn viên là giọng nữ',
   'קולות החיילים באנגלית, בווייטנאמית ובעברית: שפת הקול מתחלפת יחד עם שפת הממשק. באנגלית יש 7 קולות שונים — לכל חייל קול משלו; הרחפן והמדריך מדברים בקול נשי'],
  ['Новый язык интерфейса — иврит (עברית): меню и подсказки справа налево. Перевод машинный',
   'New interface language: Hebrew (עברית), with right-to-left menus and hints. Machine translation',
   'Ngôn ngữ giao diện mới: tiếng Do Thái (עברית), menu và gợi ý từ phải sang trái. Bản dịch máy',
   'שפת ממשק חדשה: עברית, תפריטים ורמזים מימין לשמאל. תרגום מכונה'],
  ['Куратор на английском, вьетнамском и иврите вслух подсказывает «начни с казармы»',
   'In English, Vietnamese and Hebrew the curator also says "start with a barracks" out loud',
   'Bằng tiếng Anh, Việt và Do Thái, hướng dẫn viên nhắc thành tiếng “hãy xây doanh trại trước”',
   'באנגלית, בווייטנאמית ובעברית המדריך גם אומר בקול „תתחיל עם מגורים"'],
  ['Управление на ПК и на телефоне — как в v6.7', 'PC and phone controls are the same as in v6.7', 'Điều khiển trên PC và điện thoại giữ như v6.7', 'השליטה במחשב ובטלפון — כמו ב-v6.7'],
];
const V68_CREDITS = 'Piper TTS (ryan, alan, amy; vais1000 — CC BY 4.0), Kokoro-82M (Apache 2.0), Meta MMS-TTS heb (CC BY-NC 4.0)';
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v6\.7 · /, 'v6.8 · ');
    const m = h.match(/<h3>[^<]*v6\.7[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v6.8', 'New in v6.8', 'Mới trong v6.8', 'חדש ב-v6.8')}</h3><ul>${V68_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`
      + `<p class="cred68" style="font-size:11px;opacity:.55;margin:2px 0 10px">${tr('Голоса', 'Voices', 'Giọng nói', 'קולות')}: <span dir="ltr">${V68_CREDITS}</span>${LANG.cur === 'he' ? ' · תרגום מכונה' : ''}</p>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v6.8'; VOICE66.buf = {}; VOICE66.pend = {}; };
}
// ---- иврит: направление текста. Весь документ НЕ переворачиваем (HUD стоит абсолютно — сломался бы),
// только меню (#screen dir=rtl) и текстовые окна. Панели стратегии (#side, #card) — как были: там значки клавиш.
function rtl68(){
  const he = LANG.cur === 'he';
  for (const id of ['screen', 'tut', 'clicklock']){ const el = $(id); if (!el) continue; if (he) el.setAttribute('dir', 'rtl'); else el.removeAttribute('dir'); }
}
(function rtl68CSS(){
  const st = document.createElement('style'); st.id = 'rtl68';
  st.textContent = `html[lang=he] #hint, html[lang=he] #feed, html[lang=he] #banner, html[lang=he] #obj, html[lang=he] #uxtip, html[lang=he] #uxtoasts,
    html[lang=he] #cur .cbox, html[lang=he] #help { unicode-bidi: plaintext; }
    html[lang=he] #screen ul { padding-right: 18px; padding-left: 0; }
    html[lang=he] #screen .lbtn svg { margin-right: 0; }`;
  document.head.appendChild(st);
})();
{ const as0 = applySettings; applySettings = function(){ const r = as0.apply(this, arguments); rtl68(); return r; }; }
{ const sh0 = MENU.show; MENU.show = function(){ const r = sh0.apply(this, arguments); rtl68(); return r; }; }
// ---- речь браузера (рация, подсказки): еврейского голоса в Windows обычно нет — тогда молчим, а не читаем иврит русским голосом
{
  const pv0 = AU.pickVoice.bind(AU);
  AU.pickVoice = function(){
    const r = pv0();
    try { const L = speechSynthesis.getVoices().filter(v => /^(he|iw)/i.test(v.lang)); this.voices.he = { f: L[0] || null, m: L[1] || L[0] || null, any: L.length }; } catch (e){}
    return r;
  };
  const pu0 = AU.pump.bind(AU);
  AU.pump = function(){
    if (LANG.cur === 'he' && !(this.voices.he && this.voices.he.any)){ this.radioQ.length = 0; return; }
    return pu0();
  };
}
// ---- таблицы, где язык выбирается ключом объекта: для иврита — английские строки через словарь
try { Object.defineProperty(OPER.CAPS, 'he', { get(){ return OPER.CAPS.en.map(HE68); }, configurable: true }); } catch (e){}
try { Object.defineProperty(ACKS, 'he', { get(){ const o = {}; for (const k in ACKS.en) o[k] = ACKS.en[k].map(HE68); return o; }, configurable: true }); } catch (e){}
{ const rn0 = PROG.rankName;
  PROG.rankName = function(i){
    if (LANG.cur !== 'he') return rn0.call(this, i);
    LANG.cur = 'en'; let r; try { r = rn0.call(this, i); } finally { LANG.cur = 'he'; }
    const k = r.indexOf(' ★'); return k < 0 ? HE68(r) : HE68(r.slice(0, k)) + r.slice(k);
  }; }
