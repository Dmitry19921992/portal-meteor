// =====================================================================
//  v8.18 — ЯЗЫКИ (L818): обёртка над v79_lang.js / v815_l10n.js (старые файлы не трогаем). Грузится сразу после v815_l10n.js.
//  1) Новые языки — ОДНОЙ СТРОКОЙ в L818.MORE: [код, самоназвание, слово «Язык», англ. имя, BCP-47, RTL].
//     Язык появляется в меню сам, как только в сборке есть его словарь (V8X_DICT[код] — файл dict_<код>_1107.js,
//     build.py подхватывает такие файлы автоматически). Шрифты — системные (CJK, тайский, деванагари, арабский), RTL — как иврит.
//  2) Нет перевода — АНГЛИЙСКИЙ, не русский (tr/L79.t уже так для языков из L79.DICT; здесь все языки, кроме RU/EN/VI/HE, — в DICT;
//     неизвестный код в настройках → EN). Счётчик утечек русского: L818.leaks() (для тестов).
//  3) Голос: свои пакеты есть только у RU / EN / VI / HE. Для остальных языков голос юнитов и куратора МОЛЧИТ (решение Дмитрия 07.11:
//     «языки без честного голоса — текстом»), а субтитр берётся из SUB818 (v818_subs.js, перевод фраз пакета) — не русским текстом.
//     Речь браузера (рация, подсказки) — только если в системе есть голос этого языка (как v7.9), иначе тишина.
//  4) Главное меню (уровень «Простой» тоже) и пауза: RU · EN · веер (слово «Язык» крутится на всех языках, VHS-глитч) → список.
//     Смена языка оставляет тот же экран.
//  Выкл.: ?lang818=0.
// =====================================================================
const L818 = {
  on: (() => { try { return new URLSearchParams(location.search).get('lang818') !== '0'; } catch (e){ return true; } })(),
  // ---- новые языки: одна строка = один язык (словари — D:\AI\pm_l10n\dict_<код>_1107.js, другой агент 07.11)
  MORE: [
    ['ar', 'العربية', 'اللغة', 'Arabic', 'ar', 1],
    ['ja', '日本語', '言語', 'Japanese', 'ja-JP', 0],
    ['ko', '한국어', '언어', 'Korean', 'ko-KR', 0],
    ['fr', 'Français', 'Langue', 'French', 'fr-FR', 0],
    ['de', 'Deutsch', 'Sprache', 'German', 'de-DE', 0],
    ['it', 'Italiano', 'Lingua', 'Italian', 'it-IT', 0],
    ['tr', 'Türkçe', 'Dil', 'Turkish', 'tr-TR', 0],
    ['id', 'Bahasa Indonesia', 'Bahasa', 'Indonesian', 'id-ID', 0],
    ['pl', 'Polski', 'Język', 'Polish', 'pl-PL', 0],
    ['uk', 'Українська', 'Мова', 'Ukrainian', 'uk-UA', 0],
    ['th', 'ไทย', 'ภาษา', 'Thai', 'th-TH', 0],
    ['hi', 'हिन्दी', 'भाषा', 'Hindi', 'hi-IN', 0],
    ['nl', 'Nederlands', 'Taal', 'Dutch', 'nl-NL', 0],
    ['ms', 'Bahasa Melayu', 'Bahasa', 'Malay', 'ms-MY', 0],
    ['fil', 'Filipino', 'Wika', 'Filipino (Tagalog)', 'fil-PH', 0],
    ['cs', 'Čeština', 'Jazyk', 'Czech', 'cs-CZ', 0],
    ['ro', 'Română', 'Limbă', 'Romanian', 'ro-RO', 0],
    ['sv', 'Svenska', 'Språk', 'Swedish', 'sv-SE', 0],
    ['kk', 'Қазақша', 'Тіл', 'Kazakh', 'kk-KZ', 0],
    ['ky', 'Кыргызча', 'Тил', 'Kyrgyz', 'ky-KG', 0],
    ['az', 'Azərbaycanca', 'Dil', 'Azerbaijani', 'az-Latn-AZ', 0],
    ['fa', 'فارسی', 'زبان', 'Persian', 'fa-IR', 1],
    ['bn', 'বাংলা', 'ভাষা', 'Bengali', 'bn-BD', 0],
    ['el', 'Ελληνικά', 'Γλώσσα', 'Greek', 'el-GR', 0],
    ['hu', 'Magyar', 'Nyelv', 'Hungarian', 'hu-HU', 0],
    ['bg', 'Български', 'Език', 'Bulgarian', 'bg-BG', 0],
    ['zh-TW', '繁體中文', '語言', 'Chinese (Traditional)', 'zh-TW', 0],
    ['fi', 'Suomi', 'Kieli', 'Finnish', 'fi-FI', 0],
    ['da', 'Dansk', 'Sprog', 'Danish', 'da-DK', 0],
    ['nb', 'Norsk bokmål', 'Språk', 'Norwegian', 'nb-NO', 0],
    ['sk', 'Slovenčina', 'Jazyk', 'Slovak', 'sk-SK', 0],
    ['hr', 'Hrvatski', 'Jezik', 'Croatian', 'hr-HR', 0],
    ['sr', 'Srpski', 'Jezik', 'Serbian (Latin)', 'sr-Latn-RS', 0],
    ['sl', 'Slovenščina', 'Jezik', 'Slovenian', 'sl-SI', 0],
    ['lt', 'Lietuvių', 'Kalba', 'Lithuanian', 'lt-LT', 0],
    ['lv', 'Latviešu', 'Valoda', 'Latvian', 'lv-LV', 0],
    ['et', 'Eesti', 'Keel', 'Estonian', 'et-EE', 0],
    ['ca', 'Català', 'Idioma', 'Catalan', 'ca-ES', 0],
    ['ur', 'اردو', 'زبان', 'Urdu', 'ur-PK', 1],
    ['ta', 'தமிழ்', 'மொழி', 'Tamil', 'ta-IN', 0],
    ['sw', 'Kiswahili', 'Lugha', 'Swahili', 'sw-KE', 0],
    ['ka', 'ქართული', 'ენა', 'Georgian', 'ka-GE', 0],
    ['hy', 'Հայերեն', 'Լեզու', 'Armenian', 'hy-AM', 0],
    ['be', 'Беларуская', 'Мова', 'Belarusian', 'be-BY', 0],
  ],
  RTL: new Set(['he', 'ar', 'fa', 'ur']),
  OWN_VOICE: ['ru', 'en', 'vi', 'he'],   // свои голосовые пакеты (assets/voice66.json, voice68_<код>.json)
  added: [], err: {}, leak: new Map(), muted: 0,
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('L818 ' + tag, e); } } },
  hasDict(c){ try { const D = typeof V8X_DICT !== 'undefined' ? V8X_DICT[typeof V8X !== 'undefined' ? V8X.code(c) : c] : null; return !!D && Object.keys(D).length > 50; } catch (e){ return false; } },
  ownVoice(L){
    if (L === 'ru') return true;
    if (!this.OWN_VOICE.includes(L)) return false;
    const V = typeof VOICE66 !== 'undefined' ? VOICE66 : null;
    return !!(V && V.packs && V.packs[L]) || !!document.getElementById('vo68' + L);
  },
  mute(){ return this.on && !this.ownVoice(LANG.cur); },
  sub(type, kind, i, en){
    const L = LANG.cur, T = typeof SUB818 !== 'undefined' ? SUB818[L] : null;
    const s = T && T[type + '.' + kind + '.' + i];
    if (typeof s === 'string' && s) return s;
    const t = typeof L79 !== 'undefined' ? L79.lookup(L, en) : undefined;
    return t !== undefined ? t : en;
  },
  leaks(){ return [...this.leak.entries()].sort((a, b) => b[1] - a[1]); },
};
// ---------------------------------------------------------------------------- флажки новых языков (простые SVG)
L818.FL = {
  ar: ['0 0 30 20', '<rect width="30" height="20" fill="#0b6b3a"/><text x="15" y="14" font-size="10" text-anchor="middle" fill="#fff" font-family="Tahoma,sans-serif">ع</text>'],
  ja: ['0 0 30 20', '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>'],
  ko: ['0 0 30 20', '<rect width="30" height="20" fill="#fff"/><path d="M9,10a6,6 0 0 1 12,0z" fill="#cd2e3a"/><path d="M9,10a6,6 0 0 0 12,0z" fill="#0047a0"/>'],
  fr: ['0 0 3 2', '<rect width="1" height="2" fill="#0055a4"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ef4135"/>'],
  de: ['0 0 5 3', '<rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#dd0000"/><rect y="2" width="5" height="1" fill="#ffce00"/>'],
  it: ['0 0 3 2', '<rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/>'],
  tr: ['0 0 30 20', '<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#e30a17"/><circle cx="18" cy="10" r="1.6" fill="#fff"/>'],
  id: ['0 0 3 2', '<rect width="3" height="1" fill="#ce1126"/><rect y="1" width="3" height="1" fill="#fff"/>'],
  pl: ['0 0 8 5', '<rect width="8" height="2.5" fill="#fff"/><rect y="2.5" width="8" height="2.5" fill="#dc143c"/>'],
  uk: ['0 0 3 2', '<rect width="3" height="1" fill="#0057b7"/><rect y="1" width="3" height="1" fill="#ffd700"/>'],
  th: ['0 0 9 6', '<rect width="9" height="6" fill="#a51931"/><rect y="1" width="9" height="4" fill="#f4f5f8"/><rect y="2" width="9" height="2" fill="#2d2a4a"/>'],
  hi: ['0 0 30 20', '<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ff9933"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width=".8"/>'],
  nl: ['0 0 9 6', '<rect width="9" height="2" fill="#ae1c28"/><rect y="2" width="9" height="2" fill="#fff"/><rect y="4" width="9" height="2" fill="#21468b"/>'],
  ms: ['0 0 28 14', '<rect width="28" height="14" fill="#cc0001"/><g fill="#fff"><rect y="2" width="28" height="1"/><rect y="4" width="28" height="1"/><rect y="6" width="28" height="1"/><rect y="8" width="28" height="1"/><rect y="10" width="28" height="1"/><rect y="12" width="28" height="1"/></g><rect width="14" height="8" fill="#010066"/><circle cx="6" cy="4" r="2.6" fill="#fc0"/><circle cx="6.8" cy="4" r="2.1" fill="#010066"/>'],
  fil: ['0 0 30 15', '<rect width="30" height="7.5" fill="#0038a8"/><rect y="7.5" width="30" height="7.5" fill="#ce1126"/><path d="M0,0 13,7.5 0,15z" fill="#fff"/><circle cx="4.5" cy="7.5" r="1.8" fill="#fcd116"/>'],
  cs: ['0 0 30 20', '<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#d7141a"/><path d="M0,0 15,10 0,20z" fill="#11457e"/>'],
  ro: ['0 0 3 2', '<rect width="1" height="2" fill="#002b7f"/><rect x="1" width="1" height="2" fill="#fcd116"/><rect x="2" width="1" height="2" fill="#ce1126"/>'],
  sv: ['0 0 16 10', '<rect width="16" height="10" fill="#006aa7"/><rect x="5" width="2" height="10" fill="#fecc00"/><rect y="4" width="16" height="2" fill="#fecc00"/>'],
  fi: ['0 0 18 11', '<rect width="18" height="11" fill="#fff"/><rect x="5" width="3" height="11" fill="#002f6c"/><rect y="4" width="18" height="3" fill="#002f6c"/>'],
  da: ['0 0 37 28', '<rect width="37" height="28" fill="#c8102e"/><rect x="12" width="4" height="28" fill="#fff"/><rect y="12" width="37" height="4" fill="#fff"/>'],
  nb: ['0 0 22 16', '<rect width="22" height="16" fill="#ba0c2f"/><rect x="6" width="4" height="16" fill="#fff"/><rect y="6" width="22" height="4" fill="#fff"/><rect x="7" width="2" height="16" fill="#00205b"/><rect y="7" width="22" height="2" fill="#00205b"/>'],
  hu: ['0 0 3 2', '<rect width="3" height=".67" fill="#ce2939"/><rect y=".67" width="3" height=".67" fill="#fff"/><rect y="1.33" width="3" height=".67" fill="#477050"/>'],
  bg: ['0 0 5 3', '<rect width="5" height="1" fill="#fff"/><rect y="1" width="5" height="1" fill="#00966e"/><rect y="2" width="5" height="1" fill="#d62612"/>'],
  el: ['0 0 27 18', '<rect width="27" height="18" fill="#0d5eaf"/><g fill="#fff"><rect y="2" width="27" height="2"/><rect y="6" width="27" height="2"/><rect y="10" width="27" height="2"/><rect y="14" width="27" height="2"/></g><rect width="10" height="10" fill="#0d5eaf"/><rect x="4" width="2" height="10" fill="#fff"/><rect y="4" width="10" height="2" fill="#fff"/>'],
  kk: ['0 0 30 15', '<rect width="30" height="15" fill="#00afca"/><circle cx="15" cy="7" r="3" fill="#fec50c"/>'],
  ky: ['0 0 30 18', '<rect width="30" height="18" fill="#e8112d"/><circle cx="15" cy="9" r="4.5" fill="#ffef00"/><circle cx="15" cy="9" r="2.6" fill="#e8112d"/>'],
  az: ['0 0 3 1.5', '<rect width="3" height=".5" fill="#00b5e2"/><rect y=".5" width="3" height=".5" fill="#ef3340"/><rect y="1" width="3" height=".5" fill="#509e2f"/>'],
  fa: ['0 0 7 4', '<rect width="7" height="1.33" fill="#239f40"/><rect y="1.33" width="7" height="1.33" fill="#fff"/><rect y="2.67" width="7" height="1.33" fill="#da0000"/>'],
  bn: ['0 0 10 6', '<rect width="10" height="6" fill="#006a4e"/><circle cx="4.5" cy="3" r="2" fill="#f42a41"/>'],
  'zh-TW': ['0 0 30 20', '<rect width="30" height="20" fill="#fe0000"/><rect width="15" height="10" fill="#000095"/><circle cx="7.5" cy="5" r="2.6" fill="#fff"/>'],
};
// ---------------------------------------------------------------------------- регистрация
L818.add = function(row){
  const [c, n, w, e, bcp, rtl] = row;
  if (L79.known(c)) return false;
  L79.LIST.push([c, n, w, e, bcp]);
  L79.DICT.add(c);
  if (rtl) this.RTL.add(c);
  if (!LANGS.some(x => x[0] === c)) LANGS.push([c, n]);
  if (this.FL[c]){ L79.FL[c] = this.FL[c]; LANG_FLAG[c] = L79.flag(c, 14, 'vertical-align:-2px;margin-right:6px;border-radius:2px'); }
  const g = s => { try { const t = V8X.get(c, s); return t !== undefined && t !== s ? t : null; } catch (er){ return null; } };
  const ca = g('Consortium'), sw = g('Swarm'); if (ca && sw) L79.FAC[c] = [ca, sw];
  const ld = g('loading'); if (ld) L79.LOADING[c] = ld;
  try { Object.defineProperty(ACKS, c, { get(){ const o = {}; for (const k in ACKS.en) o[k] = ACKS.en[k].map(s => L79.t(c, s)); return o; }, configurable: true }); } catch (er){}
  try { if (typeof OPER !== 'undefined' && OPER.CAPS) Object.defineProperty(OPER.CAPS, c, { get(){ return OPER.CAPS.en.map(s => L79.t(c, s)); }, configurable: true }); } catch (er){}
  try { if (typeof CAMFX !== 'undefined' && CAMFX.CAPS && CAMFX.CAPS.en && !CAMFX.CAPS[c]) Object.defineProperty(CAMFX.CAPS, c, { get(){ return CAMFX.CAPS.en.map(s => L79.t(c, s)); }, configurable: true }); } catch (er){}
  this.added.push(c);
  return true;
};
if (L818.on && typeof L79 !== 'undefined'){
  for (const r of L818.MORE) if (L818.hasDict(r[0])) L818.safe(() => L818.add(r), 'add ' + r[0]);
  L79.WORDS = [...new Set(L79.LIST.map(x => x[2]))];
  // браузер на украинском / казахском / киргизском / белорусском — свой язык, если он уже есть (v7.9 отдавал русский)
  const dt0 = L79.detect;
  L79.detect = function(){
    let L = []; try { L = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).map(x => String(x)); } catch (e){}
    for (const x of L){ const p = x.toLowerCase(); if (p === 'zh-tw' || p === 'zh-hant' || p === 'zh-hk'){ if (this.known('zh-TW')) return 'zh-TW'; } const c = p.split('-')[0]; if (c !== 'ru' && this.known(c) && L818.added.includes(c)) return c; if (c === 'tl' && this.known('fil')) return 'fil'; if ((c === 'no' || c === 'nn') && this.known('nb')) return 'nb'; break; }
    return dt0.apply(this, arguments);
  };
}
// ---------------------------------------------------------------------------- неизвестный код языка → EN (никогда не русский по умолчанию)
if (L818.on && typeof MENU !== 'undefined'){
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){
    if (typeof L79 !== 'undefined' && !L79.known(SET.lang)) SET.lang = 'en';
    const r = al0.apply(this, arguments);
    L818.safe(() => {
      const L = SET.lang, rtl = L818.RTL.has(L);
      for (const id of ['screen', 'tut', 'clicklock']){ const el = document.getElementById(id); if (!el) continue; if (rtl) el.setAttribute('dir', 'rtl'); else if (L !== 'he') el.removeAttribute('dir'); }
      document.documentElement.setAttribute('data-l818', L);
      const bn = document.getElementById('m818'); if (bn){ bn.classList.remove('on'); bn.innerHTML = ''; }   // надпись режима на старом языке
      if (typeof VOICE66 !== 'undefined' && VOICE66.cur && L818.mute()){ try { VOICE66.cur.stop(); } catch (e){} VOICE66.cur = null; }   // фраза на старом языке — оборвать
    }, 'apply');
    return r;
  };
}
// ---------------------------------------------------------------------------- голос: нет своего пакета — тишина + переведённый субтитр
if (L818.on && typeof VOICE66 !== 'undefined' && VOICE66.play){
  const V = VOICE66, pk0 = V.packLang, pl0 = V.play;
  // текст фраз для «немых» языков берём из EN-пакета (индексы совпадают с voice_lines_<код>.json)
  V.packLang = function(){
    const L = LANG.cur;
    if (L818.ownVoice(L)) return L === 'ru' ? 'ru' : L;
    return (this.packs && this.packs.en) || document.getElementById('vo68en') ? 'en' : 'ru';
  };
  V.play = function(type, kind, i, vol, vr){
    if (!L818.mute()) return pl0.apply(this, arguments);
    const D = this.load(), it = D[type] && D[type][kind] && D[type][kind][i];
    if (!it) return;
    try { if (this.cur){ this.cur.stop(); this.cur = null; } } catch (e){}
    this.played++; this.lastType = type; this.lastVar = vr; this.lastLang = LANG.cur;
    this.lastText = it.t; this.sub818 = { raw: it.t, t: L818.sub(type, kind, i, it.t) };
    L818.muted++;
  };
  try {
    const d = Object.getOwnPropertyDescriptor(V, 'lastText');
    let lt = d && d.get ? d.get.call(V) : V.lastText;
    Object.defineProperty(V, 'lastText', {
      get(){
        if (typeof lt !== 'string') return lt;
        if (V.sub818 && V.sub818.raw === lt && L818.mute()) return V.sub818.t;
        const L = LANG.cur;
        if (L === 'ru' || L === 'en' || L === V.lastLang && L818.ownVoice(L)) return lt;
        const t = typeof L79 !== 'undefined' ? L79.lookup(L, lt) : undefined;
        return t !== undefined ? t : lt;
      },
      set(v){ lt = v; },
      configurable: true,
    });
  } catch (e){ console.warn('L818 lastText', e); }
}
// ---------------------------------------------------------------------------- речь браузера: голос этого языка из системы или тишина
if (L818.on && typeof AU !== 'undefined' && AU.pickVoice){
  const pv0 = AU.pickVoice.bind(AU);
  AU.pickVoice = function(){
    const r = pv0();
    L818.safe(() => {
      const vs = speechSynthesis.getVoices();
      for (const c of L818.added){ const p = c.split('-')[0], re = new RegExp('^' + (c === 'zh-TW' ? 'zh[-_](TW|HK|Hant)' : p) + '([-_]|$)', 'i'), Vv = vs.filter(v => re.test(v.lang)); this.voices[c] = { f: Vv[0] || null, m: Vv[1] || Vv[0] || null, any: Vv.length }; }
    }, 'voices');
    return r;
  };
  L818.safe(() => AU.pickVoice(), 'pv');
}
// ---------------------------------------------------------------------------- меню: RU · EN · веер — в «Простом» главном меню и в паузе
if (L818.on && typeof UI815 !== 'undefined' && typeof L79 !== 'undefined'){
  const m0 = UI815.main, p0 = UI815.pause;
  UI815.main = function(){
    let h = m0.apply(this, arguments);
    return L818.safe(() => h.replace(/<button id="m_u815lang" class="u8lang">[\s\S]*?<\/button>/, `<div class="u8l79">${L79.sel('pc')}</div>`)
      .replace(/<div id="u8langs" class="u8langs" style="display:none">[\s\S]*?<\/div>/, ''), 'main') || h;
  };
  UI815.pause = function(){
    const h = p0.apply(this, arguments);
    return L818.safe(() => h.replace('<button id="m_u815resume"', `<div class="u8l79 wide">${L79.sel('pc wide')}</div><button id="m_u815resume"`), 'pause') || h;
  };
}
// ---------------------------------------------------------------------------- счётчик «русского» в чужом языке (тесты): tr вернул русский аргумент
if (L818.on){
  const trL = tr;
  tr = function(ru, en){
    const r = trL.apply(this, arguments);
    if (r === ru && LANG.cur !== 'ru' && typeof ru === 'string' && ru !== en && L818.leak.size < 400 && /[А-Яа-яЁё]/.test(ru)) L818.leak.set(ru.slice(0, 80), (L818.leak.get(ru.slice(0, 80)) || 0) + 1);
    return r;
  };
}
// ---------------------------------------------------------------------------- стили: шрифты систем, прокрутка длинного списка, веер в шапке
(function(){ const st = document.createElement('style'); st.id = 'l818css'; st.textContent = `
#screen .u8hd .u8l79{margin-left:auto;display:flex}
#screen .u8l79 .l79sel{gap:4px}
#screen .u8l79 .l79sel .l79b{min-height:36px}
#screen .u8l79.wide{margin:2px 0 8px}
#screen .u8l79.wide .l79sel{width:100%}
#screen .u8l79 .l79sel .l79b.cur{background:var(--sand,#d6c69a);color:#111}
#screen .l79list .l79grid{max-height:min(66vh,620px);overflow-y:auto;grid-template-columns:repeat(4,minmax(0,1fr));padding-right:4px}
#screen .l79list .l79grid.ph{grid-template-columns:repeat(5,minmax(0,1fr))}
html[lang=ja] *{font-family:"Exo 2","Yu Gothic UI","Meiryo","Hiragino Sans","Noto Sans JP",Arial,sans-serif !important}
html[lang=ko] *{font-family:"Exo 2","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",Arial,sans-serif !important}
html[lang=zh-TW] *{font-family:"Exo 2","Microsoft JhengHei","PingFang TC","Noto Sans TC",Arial,sans-serif !important}
html[lang=th] *{font-family:"Exo 2","Leelawadee UI","Tahoma","Noto Sans Thai",Arial,sans-serif !important}
html[lang=hi] *{font-family:"Exo 2","Nirmala UI","Mangal","Noto Sans Devanagari",Arial,sans-serif !important}
html[lang=bn] *{font-family:"Exo 2","Nirmala UI","Vrinda","Noto Sans Bengali",Arial,sans-serif !important}
html[lang=ta] *{font-family:"Exo 2","Nirmala UI","Latha","Noto Sans Tamil",Arial,sans-serif !important}
html[lang=ar] *, html[lang=fa] *, html[lang=ur] *{font-family:"Segoe UI","Tahoma","Noto Naskh Arabic",Arial,sans-serif !important}
html[lang=ka] *, html[lang=hy] *{font-family:"Exo 2","Segoe UI","Sylfaen","Noto Sans Georgian","Noto Sans Armenian",Arial,sans-serif !important}
`; document.head.appendChild(st); })();
