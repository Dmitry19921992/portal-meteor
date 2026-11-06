// v8.18: version label 8.18 over v8.17 (graphics floor on strong GPUs, languages, controls Tab/X); v8.17 goes to old versions. Loaded right after v817_ver.js.
try {
  if (typeof FX87 !== 'undefined'){ FX87.VER = '8.18'; const f818 = FX87.ver; FX87.ver = h => { h = f818 ? f818(h) : h; return typeof h === 'string' ? h.replace(/v8\.17 · /g, 'v8.18 · ') : h; }; }
  if (typeof STATS75 !== 'undefined') STATS75.ver = '8.18';
  if (typeof VER75 !== 'undefined'){
    VER75.L = VER75.L.map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }));
    VER75.L.unshift({ id: 'v8_18', v: 'v8.18', d: '07.11.2026', mb: 9.5, tag: 'new', n: [
      'Чётче картинка на мощных видеокартах: игра больше не «пикселит» после старта. Языки: RU · EN · веер всех языков прямо в главном меню, чужой язык больше не озвучивается по-русски (субтитры на своём языке), без перевода — английский. Управление: Tab — Стратег → Командир → Шутер по кругу, X — вселиться (в каждом режиме своё), клавиша P больше не режим.',
      'Sharper picture on strong GPUs: no more "pixel mode" after the start. Languages: RU · EN · a fan of all languages right in the main menu, other languages are no longer voiced in Russian (subtitles in your language), missing text falls back to English. Controls: Tab cycles Strategist → Commander → Shooter, X possesses (per mode), the P key is no longer a mode key.'] });
    VER75.cur = 'v8_18';
  }
  if (typeof UI815 !== 'undefined' && typeof UI815.main === 'function'){   // simple menu header: 'v8.17' (v817_ver.js) -> 'v8.18'
    const m818 = UI815.main;
    UI815.main = function(){ const h = m818.apply(this, arguments); return typeof h === 'string' ? h.replace('<small class="u8v">v8.17</small>', '<small class="u8v">v8.18</small>') : h; };
  }
} catch (e) { console.warn('v818_ver', e); }
