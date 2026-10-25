// =====================================================================
//  v7.9 l10n — more interface languages + the new language selector (Dmitry's design)
//  Languages: RU / EN (base), 中文, Oʻzbekcha (Latin), Тоҷикӣ, עברית (RTL), Tiếng Việt (completed), Español (LatAm), Português (BR).
//  Strings: lang/en.json (id -> English) + lang/<code>.json (id -> text), embedded by build.py as <script id="l79_<code>">,
//  parsed lazily only for the chosen language. Lookup is by the English text (like HE68): tr()/N2() keep working unchanged;
//  templates "{0}" match dynamic strings. Missing string -> English (counted in L79.miss for tests).
//  Selector: main menu next to "New match" — RU, EN and a fan-of-flags button whose label cycles FAST through all
//  languages with a VHS glitch; tap -> full list (flag + native name). Choice remembered (pm_lang79), default = browser language.
//  Loaded last before main.js (wraps tr / N2 / HE68 / menus). Separate file so feature branches do not conflict.
// =====================================================================
const L79 = {
  // code, native name, word "Language" in that language, English name, BCP-47 for dates/speech
  LIST: [
    ['ru', 'Русский', 'Язык', 'Russian', 'ru-RU'],
    ['en', 'English', 'Language', 'English', 'en-GB'],
    ['zh', '中文', '语言', 'Chinese (Simplified)', 'zh-CN'],
    ['uz', 'Oʻzbekcha', 'Til', 'Uzbek', 'uz-Latn-UZ'],
    ['tg', 'Тоҷикӣ', 'Забон', 'Tajik', 'tg-TJ'],
    ['he', 'עברית', 'שפה', 'Hebrew', 'he-IL'],
    ['vi', 'Tiếng Việt', 'Ngôn ngữ', 'Vietnamese', 'vi-VN'],
    ['es', 'Español', 'Idioma', 'Spanish (Latin America)', 'es-419'],
    ['pt', 'Português', 'Idioma', 'Portuguese (Brazil)', 'pt-BR'],
  ],
  SUB: { es: 'Latinoamérica', pt: 'Brasil', uz: 'lotin', zh: '简体' },
  DICT: new Set(['zh', 'uz', 'tg', 'es', 'pt']),          // whole interface from lang/<code>.json
  VOICE: { zh: 'en', es: 'en', pt: 'en', uz: 'ru', tg: 'ru' },   // unit voice packs: only RU / EN / VI / HE exist — subtitles are translated
  FAC: { zh: ['财团', '蜂群'], uz: ['Konsorsium', 'Gala'], tg: ['Консорсиум', 'Гала'], es: ['Consorcio', 'Enjambre'], pt: ['Consórcio', 'Enxame'] },
  LOADING: { ru: 'загрузка', en: 'loading', zh: '加载中', uz: 'yuklanmoqda', tg: 'боргирӣ', he: 'טוען', vi: 'đang tải', es: 'cargando', pt: 'carregando' },
  D: {}, K: null, miss: new Map(), err: 0,
  safe(fn, tag){ try { return fn(); } catch (e){ if (this.err++ < 5) console.warn('l79 ' + tag, e); } },
  item(c){ return this.LIST.find(x => x[0] === c) || this.LIST[1]; },
  known(c){ return this.LIST.some(x => x[0] === c); },
  on(){ return this.DICT.has(LANG.cur); },
  // ---- dictionaries
  json(id){ try { const el = document.getElementById(id); return el ? JSON.parse(el.textContent) : null; } catch (e){ console.warn('l79 json ' + id, e); return null; } },
  keys(){ if (!this.K) this.K = this.json('l79_en') || {}; return this.K; },
  dict(L){
    let C = this.D[L]; if (C) return C;
    C = this.D[L] = { map: new Map(), tpl: [], cache: new Map() };
    const T = this.json('l79_' + L) || {}, K = this.keys();
    for (const id in T){
      const en = K[id], tx = T[id]; if (en === undefined || typeof tx !== 'string') continue;
      if (!/\{\d+\}/.test(en)){ C.map.set(en, tx); continue; }
      const lits = en.split(/\{\d+\}/), lit = lits.join('');
      if (lit.replace(/[^A-Za-z]/g, '').length < 3) continue;
      const order = (en.match(/\{\d+\}/g) || []).map(x => +x.slice(1, -1));
      const re = new RegExp('^' + lits.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('([\\s\\S]*?)') + '$');
      C.tpl.push({ re, order, tx, key: lits.reduce((a, b) => a.length >= b.length ? a : b, ''), n: lit.length });
    }
    C.tpl.sort((a, b) => b.n - a.n);
    return C;
  },
  lookup(L, en){
    if (typeof en !== 'string' || !en) return undefined;
    const C = this.dict(L);
    const m0 = C.map.get(en); if (m0 !== undefined) return m0;
    const c0 = C.cache.get(en); if (c0 !== undefined) return c0 === null ? undefined : c0;
    let out = null;
    for (const t of C.tpl){
      if (t.key && en.indexOf(t.key) < 0) continue;
      const m = t.re.exec(en); if (!m) continue;
      const val = []; t.order.forEach((ix, j) => { val[ix] = m[j + 1]; });
      out = t.tx.replace(/\{(\d+)\}/g, (s, d) => val[+d] !== undefined ? val[+d] : '');
      break;
    }
    if (C.cache.size > 4000) C.cache.clear();
    C.cache.set(en, out);
    return out === null ? undefined : out;
  },
  t(L, en, fb){
    const r = this.lookup(L, en);
    if (r !== undefined) return r;
    if (typeof en === 'string' && /[A-Za-z]{2}/.test(en) && this.miss.size < 3000){ const k = L + '|' + en; this.miss.set(k, (this.miss.get(k) || 0) + 1); }
    return fb !== undefined ? fb : en;
  },
  // faction names swap when the player fights for the Swarm (FAC76 does it for RU / EN / VI / HE)
  flip(){ return typeof FAC76_F !== 'undefined' && FAC76_F[0] === 1; },
  fac(L, s){
    if (!this.flip() || typeof s !== 'string') return s;
    const F = this.FAC[L]; if (!F) return s;
    const [a, b] = F, A = a.toUpperCase(), B = b.toUpperCase();
    const re = this.facRe || (this.facRe = {});
    const r = re[L] || (re[L] = new RegExp('(?<![\\p{L}])(' + [a, b, A, B].map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gu'));
    return s.replace(r, w => w === a ? b : w === b ? a : w === A ? B : A);
  },
  facOld(s){ return this.flip() && typeof FAC76 !== 'undefined' ? FAC76.swapT(s) : s; },
  // ---- default language: browser / device languages, fallback EN
  detect(){
    let L = [];
    try { L = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).map(x => String(x).toLowerCase()); } catch (e){}
    for (const x of L){
      const p = x.slice(0, 2);
      if (p === 'ru' || p === 'uk' || p === 'be' || p === 'kk' || p === 'ky') return 'ru';
      if (p === 'iw') return 'he';
      if (this.known(p)) return p;
    }
    return 'en';
  },
  detect78(){ try { const l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return ['ru', 'uk', 'be', 'kk'].includes(l) ? 'ru' : l === 'vi' ? 'vi' : (l === 'he' || l === 'iw') ? 'he' : 'en'; } catch (e){ return 'en'; } },
  picked(){ try { const o = JSON.parse(localStorage.getItem('pm_lang79') || 'null'); return o && this.known(o.lang) ? o.lang : null; } catch (e){ return null; } },
  initLang(hadSettings){
    const p = this.picked();
    if (p){ SET.lang = p; return; }
    // never picked in v7.9: follow the browser, unless an older build saved a language that differs from its own auto-pick (= chosen by hand)
    if (!hadSettings || SET.lang === this.detect78() || !this.known(SET.lang)) SET.lang = this.detect();
  },
  set(c){
    if (!this.known(c)) return;
    SET.lang = c;
    try { localStorage.setItem('pm_lang79', JSON.stringify({ lang: c, t: Date.now() })); } catch (e){}
    MENU.applyLang();
  },
};
// ---------------------------------------------------------------------
//  flags (SVG — Windows does not draw emoji flags)
// ---------------------------------------------------------------------
L79.star = (cx, cy, r, rot) => { let p = ''; for (let i = 0; i < 10; i++){ const a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.38 : r; p += (i ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(2) + ',' + (cy + q * Math.sin(a)).toFixed(2); } return p + 'Z'; };
L79.FL = {
  ru: ['0 0 9 6', '<rect width="9" height="2" fill="#fff"/><rect y="2" width="9" height="2" fill="#0039a6"/><rect y="4" width="9" height="2" fill="#d52b1e"/>'],
  en: ['0 0 60 30', '<rect width="60" height="30" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" stroke="#C8102E" stroke-width="2.5"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/>'],
  zh: ['0 0 30 20', '<rect width="30" height="20" fill="#de2910"/><path fill="#ffde00" d="' + L79.star(5, 5, 3) + L79.star(10, 2, 1, 0.9) + L79.star(12, 4, 1, 0.4) + L79.star(12, 7, 1, 0) + L79.star(10, 9, 1, -0.4) + '"/>'],
  uz: ['0 0 250 125', '<rect width="250" height="125" fill="#1eb53a"/><rect width="250" height="84" fill="#ce1126"/><rect width="250" height="80" fill="#fff"/><rect width="250" height="43" fill="#ce1126"/><rect width="250" height="40" fill="#0099b5"/>'
      + '<circle cx="34" cy="20" r="14" fill="#fff"/><circle cx="40" cy="20" r="12.5" fill="#0099b5"/><g fill="#fff"><circle cx="62" cy="10" r="3"/><circle cx="74" cy="10" r="3"/><circle cx="86" cy="10" r="3"/><circle cx="74" cy="21" r="3"/><circle cx="86" cy="21" r="3"/><circle cx="86" cy="32" r="3"/><circle cx="62" cy="32" r="3"/><circle cx="74" cy="32" r="3"/></g>'],
  tg: ['0 0 28 14', '<rect width="28" height="14" fill="#060"/><rect width="28" height="10" fill="#fff"/><rect width="28" height="4" fill="#c00"/>'
      + '<path fill="#f8c300" d="M11.6,8.6h4.8l.5-1.9-1.2.7-1.7-1.6-1.7,1.6-1.2-.7z"/><g fill="#f8c300"><circle cx="10.6" cy="7" r=".45"/><circle cx="11.2" cy="5.8" r=".45"/><circle cx="12.5" cy="5.1" r=".45"/><circle cx="14" cy="4.9" r=".45"/><circle cx="15.5" cy="5.1" r=".45"/><circle cx="16.8" cy="5.8" r=".45"/><circle cx="17.4" cy="7" r=".45"/></g>'],
  he: ['0 0 220 160', '<rect width="220" height="160" fill="#fff"/><rect y="15" width="220" height="25" fill="#0038b8"/><rect y="120" width="220" height="25" fill="#0038b8"/><path d="M110,52 L135,95 L85,95 Z M110,108 L85,65 L135,65 Z" fill="none" stroke="#0038b8" stroke-width="7"/>'],
  vi: ['0 0 30 20', '<rect width="30" height="20" fill="#da251d"/><polygon fill="#ff0" points="15,4 16.76,9.43 22.47,9.43 17.85,12.79 19.61,18.21 15,14.86 10.39,18.21 12.15,12.79 7.53,9.43 13.24,9.43"/>'],
  es: ['0 0 21 12', '<rect width="7" height="12" fill="#006847"/><rect x="7" width="7" height="12" fill="#fff"/><rect x="14" width="7" height="12" fill="#ce1126"/><circle cx="10.5" cy="6" r="1.9" fill="#8c5b2b"/><path d="M8.7,6.8a1.9,1.9 0 0 0 3.6,0" fill="none" stroke="#3a7d2c" stroke-width=".6"/>'],
  pt: ['0 0 20 14', '<rect width="20" height="14" fill="#009c3b"/><path d="M2,7 10,1.4 18,7 10,12.6z" fill="#ffdf00"/><circle cx="10" cy="7" r="3.4" fill="#002776"/><path d="M6.8,6.2c2.2-.6 4.6-.3 6.5,1" fill="none" stroke="#fff" stroke-width=".55"/>'],
};
L79.flag = function(c, h, style){
  const F = this.FL[c]; if (!F) return '';
  const vb = F[0].split(' ').map(Number), w = Math.round(Math.min(h * vb[2] / vb[3], h * 1.75));
  return `<svg class="l79f" viewBox="${F[0]}" width="${w}" height="${h}" preserveAspectRatio="none" style="${style || ''}">${F[1]}</svg>`;
};
// fan / cluster of small flags for the "other languages" button
L79.fan = function(){
  // like a hand of cards: flags overlap, pivot below the button
  const fl = ['uz', 'es', 'he', 'pt', 'vi', 'zh'], ang = [-40, -24, -8, 8, 24, 40];
  const out = fl.map((c, i) => {
    const F = this.FL[c];
    return `<g transform="rotate(${ang[i]} 23 38)"><svg x="13" y="3" width="20" height="13" viewBox="${F[0]}" preserveAspectRatio="none">${F[1]}</svg><rect x="13" y="3" width="20" height="13" fill="none" stroke="rgba(0,0,0,.55)" stroke-width=".7"/></g>`;
  }).join('');
  return `<svg class="l79fan" viewBox="0 0 46 30" width="44" height="29">${out}</svg>`;
};
// LANG / LANGS / LANG_FLAG for the older code (phone flag chips, version list, etc.)
for (const [c, n] of L79.LIST) if (!LANGS.some(x => x[0] === c)) LANGS.push([c, n]);
for (const c of ['zh', 'uz', 'tg', 'es', 'pt']) LANG_FLAG[c] = L79.flag(c, 14, 'vertical-align:-2px;margin-right:6px;border-radius:2px');
// ---------------------------------------------------------------------
//  string functions: tr / N2 / HE68 / FAC76 team names / plural / ranks / per-language tables
// ---------------------------------------------------------------------
{
  const tr0 = tr;   // RU / EN / VI / HE chain (with the FAC76 faction swap)
  tr = function(ru, en, vi, he){
    const L = LANG.cur;
    if (L79.DICT.has(L)) return typeof en === 'string' ? L79.fac(L, L79.t(L, en)) : (en !== undefined ? en : ru);
    if (L === 'vi' && vi === undefined && typeof en === 'string') return L79.facOld(L79.t('vi', en));   // VI: fill the gaps
    return tr0.apply(this, arguments);
  };
  const n0 = N2;
  N2 = function(pair){
    const L = LANG.cur;
    if (L79.DICT.has(L)) return L79.t(L, pair[1]);
    if (L === 'vi' && pair[2] === undefined) return L79.t('vi', pair[1]);
    return n0(pair);
  };
  // HE: own Hebrew dictionary first, the older NLLB machine dictionary (HE68_DICT) as a fallback
  const he0 = HE68;
  HE68 = function(en){ const r = L79.lookup('he', en); return r !== undefined ? r : he0(en); };
  if (typeof FAC76 !== 'undefined' && FAC76.tr0){
    const f0 = FAC76.tr0;
    FAC76.tr0 = function(ru, en, vi){ const L = LANG.cur; if (L79.DICT.has(L)) return L79.t(L, en); if (L === 'vi' && vi === undefined) return L79.t('vi', en); return f0.apply(this, arguments); };
  }
  const pl0 = plural;
  plural = function(n, one, few, many){ return L79.DICT.has(LANG.cur) ? (n === 1 ? one : many) : pl0.apply(this, arguments); };
  const rn0 = PROG.rankName;
  PROG.rankName = function(i){
    const L = LANG.cur; if (!L79.DICT.has(L)) return rn0.apply(this, arguments);
    LANG.cur = 'en'; let r; try { r = rn0.apply(this, arguments); } finally { LANG.cur = L; }
    const k = r.indexOf(' ★'); return k < 0 ? L79.t(L, r) : L79.t(L, r.slice(0, k)) + r.slice(k);
  };
  for (const L of L79.DICT){
    try { Object.defineProperty(ACKS, L, { get(){ const o = {}; for (const k in ACKS.en) o[k] = ACKS.en[k].map(s => L79.t(L, s)); return o; }, configurable: true }); } catch (e){}
    try { if (typeof OPER !== 'undefined' && OPER.CAPS) Object.defineProperty(OPER.CAPS, L, { get(){ return OPER.CAPS.en.map(s => L79.t(L, s)); }, configurable: true }); } catch (e){}
  }
  if (typeof SAVE !== 'undefined' && SAVE.fmtAt){
    const fa0 = SAVE.fmtAt;
    SAVE.fmtAt = function(at){ const L = LANG.cur; if (!L79.DICT.has(L)) return fa0.apply(this, arguments); LANG.cur = 'en'; try { return fa0.apply(this, arguments); } finally { LANG.cur = L; } };
  }
}
// ---- voices: unit voice packs exist for RU / EN / VI / HE — the new languages use the EN pack, subtitles are translated
if (typeof VOICE66 !== 'undefined' && VOICE66.packLang){
  const pk0 = VOICE66.packLang;
  VOICE66.packLang = function(){ const L = LANG.cur; if (L79.DICT.has(L)) return L79.VOICE[L] === 'en' && document.getElementById('vo68en') ? 'en' : 'ru'; return pk0.apply(this, arguments); };
  try {
    let lt = VOICE66.lastText;
    Object.defineProperty(VOICE66, 'lastText', { get(){ return L79.on() && typeof lt === 'string' ? L79.t(LANG.cur, lt) : lt; }, set(v){ lt = v; }, configurable: true });
  } catch (e){}
}
// ---- browser speech (radio, hints): use a voice of that language if the system has one, otherwise stay silent (text stays on screen)
{
  const pv0 = AU.pickVoice.bind(AU);
  AU.pickVoice = function(){
    const r = pv0();
    try {
      const vs = speechSynthesis.getVoices();
      for (const L of L79.DICT){
        const re = new RegExp('^' + L, 'i'), V = vs.filter(v => re.test(v.lang));
        this.voices[L] = { f: V[0] || null, m: V[1] || V[0] || null, any: V.length };
      }
    } catch (e){}
    return r;
  };
  const pu0 = AU.pump.bind(AU);
  AU.pump = function(){
    const L = LANG.cur;
    if (L79.DICT.has(L) && !(this.voices[L] && this.voices[L].any)){ this.radioQ.length = 0; return; }
    return pu0();
  };
}
// ---- first start: language of the browser / device (navigator.languages), the player's pick is remembered (pm_lang79)
{
  const ld0 = MENU.load;
  MENU.load = function(){
    let had = false; try { had = !!localStorage.getItem('pm_settings'); } catch (e){}
    const r = ld0.apply(this, arguments);
    L79.safe(() => L79.initLang(had), 'init');
    return r;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){
    const r = al0.apply(this, arguments);
    L79.safe(() => { if (typeof VOICE66 !== 'undefined'){ VOICE66.buf = {}; VOICE66.pend = {}; } document.documentElement.setAttribute('data-l79', SET.lang); }, 'apply');
    return r;
  };
  L79.safe(() => {   // boot screen word "loading" (shown before the menu exists)
    const b = document.getElementById('bootTitle'), L = L79.picked() || L79.detect();
    if (b && L79.LOADING[L]) b.textContent = L79.LOADING[L];
  }, 'boot');
}
// ---------------------------------------------------------------------
//  the selector: [RU] [EN] [fan of flags + cycling "Language / Язык / 语言 / Til / Забон / שפה / Ngôn ngữ / Idioma"]
// ---------------------------------------------------------------------
L79.WORDS = [...new Set(L79.LIST.map(x => x[2]))];
L79.sel = function(kind){
  const L = SET.lang, other = L !== 'ru' && L !== 'en', it = this.item(L);
  const b = c => `<button class="l79b l79rb ${L === c ? 'cur' : ''}" data-l79set="${c}" title="${this.item(c)[1]}">${this.flag(c, 12)}<span>${c.toUpperCase()}</span></button>`;
  const more = other
    ? `<span class="l79fl">${this.flag(L, 18)}</span><span class="l79w" dir="auto">${it[2]}</span><small class="l79n" dir="auto">${it[1]}</small>`
    : `${this.fan()}<span class="l79w l79cyc" dir="auto">${this.WORDS[this.cycI % this.WORDS.length]}</span>`;
  return `<div class="l79sel ${kind}" dir="ltr">${b('ru')}${b('en')}<button class="l79b l79more ${other ? 'cur l79pk' : ''}" data-l79more="1" title="${this.WORDS.join(' / ')}">${more}</button></div>`;
};
L79.cycI = 0;
L79.cyc = function(){
  if (this.cycT || !document.querySelector('.l79cyc')) return;
  const slow = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e){ return false; } })();
  this.cycT = setInterval(() => {
    const els = document.querySelectorAll('.l79cyc');
    if (!els.length){ clearInterval(this.cycT); this.cycT = 0; return; }
    this.cycI = (this.cycI + 1) % this.WORDS.length;
    for (const e of els){
      e.textContent = this.WORDS[this.cycI];
      if (!slow){ e.classList.remove('g1', 'g2'); void e.offsetWidth; e.classList.add(this.cycI % 2 ? 'g1' : 'g2'); }
    }
  }, slow ? 700 : 140);
};
// full list: flag + native name (+ English name), for PC and phone
L79.listHtml = function(){
  const L = SET.lang, ph = typeof P71M !== 'undefined' && P71M.on();
  const cells = this.LIST.map(([c, n, w, e]) => `<button class="l79c ${L === c ? 'cur' : ''}" data-l79set="${c}">${this.flag(c, ph ? 20 : 22)}<b dir="auto">${n}</b><small>${this.SUB[c] ? this.SUB[c] + ' · ' : ''}${e}</small></button>`).join('');
  const title = this.WORDS.slice(0, 4).join(' · ');
  if (ph) return `<div class="p71 p71lang l79list">${P71M.hd(title, true)}<div class="l79grid ph">${cells}</div></div>`;
  return `<div class="mcol l79list"><h2>${title}</h2><div class="l79grid">${cells}</div>${MENU.btn('back', '← ' + tr('Назад', 'Back', 'Quay lại', 'חזרה'), 'big')}</div>`;
};
MENU.html_l79 = function(){ return L79.listHtml(); };
if (typeof P71M !== 'undefined') P71M.lang = function(){ return L79.listHtml(); };
// ---- old "New in v6.x … v7.6" lists are not translated: hidden for the new languages (v7.7+ stay)
L79.trimNews = function(h){
  if (!L79.on()) return h;
  return h.replace(/<h3>[^<]*v(\d+)(?:\.(\d+))?[^<]*<\/h3>\s*<ul>[\s\S]*?<\/ul>/g, (m, a, b) => (+a * 10 + (+b || 0)) >= 77 ? m : '');
};
// ---- menus (PC: main / pause / settings; phone: main tile, settings and pause tiles open the full list)
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.apply(this, arguments);
    if (typeof P71M !== 'undefined' && P71M.on()){
      const ver = typeof STATS75 !== 'undefined' && STATS75.ver ? STATS75.ver : '7.8';
      if (L79.on()) h = h.replace(/(data-p71go="news"[^>]*>[\s\S]*?<b>)[^<]*(<\/b>)/, (m, a, b) => a + L79.t(LANG.cur, 'New in v7.8').replace('7.8', ver) + b);   // older wrappers only know RU/EN/VI/HE titles
      return h.replace(/<button data-p71go="lang" class="p71t[^"]*">[\s\S]*?<\/button>/, `<div class="p71t l79tile">${L79.sel('ph')}</div>`);
    }
    h = h.replace(/<div class="diffrow"><button class="lbtn[\s\S]*?<\/div>/, '');
    h = h.replace(/(<button id="m_play"[^>]*>[\s\S]*?<\/button>)/, `<div class="l79row">$1${L79.sel('pc')}</div>`);
    return L79.trimNews(h);
  };
  const hp0 = MENU.html_pause;
  MENU.html_pause = function(){
    const h = hp0.apply(this, arguments);
    if (typeof P71M !== 'undefined' && P71M.on()) return h;
    return h.replace(/<div class="diffrow"><button class="lbtn[\s\S]*?<\/div>/, L79.sel('pc wide'));
  };
  const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    const h = hs0.apply(this, arguments);
    if (typeof P71M !== 'undefined' && P71M.on()) return h;
    return h.replace(/<span class="chs[^"]*">(?=<button[^>]*data-ch="lang")[\s\S]*?<\/span>/, L79.sel('pc set'));
  };
  const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.apply(this, arguments);
    L79.safe(() => {
      const el = $('screen'); if (!el) return;
      const go = (b, fn) => { b.onclick = e => { e.stopPropagation(); e.preventDefault(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
      el.querySelectorAll('[data-l79set]').forEach(b => go(b, () => {
        L79.set(b.dataset.l79set);
        if (MENU.cur === 'l79' || MENU.cur === 'p71lang') MENU.back(); else MENU.show(MENU.cur);
      }));
      el.querySelectorAll('[data-l79more]').forEach(b => go(b, () => MENU.show(typeof P71M !== 'undefined' && P71M.on() ? 'p71lang' : 'l79', true)));
      if (name === 'l79'){ const bb = $('m_back'); if (bb) go(bb, () => MENU.back()); }
      L79.cyc();
    }, 'wire');
  };
}
// ---------------------------------------------------------------------
//  styles: VHS glitch label, fan, list; Chinese / Tajik / Uzbek font fallbacks
// ---------------------------------------------------------------------
(function l79CSS(){
  const st = document.createElement('style'); st.id = 'l79css';
  st.textContent = `
#screen .l79row{display:flex;gap:6px;align-items:stretch}
#screen .l79row > #m_play{flex:1 1 auto;min-width:0}
#screen .l79sel{display:flex;gap:4px;align-items:stretch;flex:0 0 auto}
#screen .l79sel.wide, #screen .l79sel.set{width:100%}
#screen .l79sel.set{width:auto;min-width:230px}
#screen .l79sel .l79b{display:flex;align-items:center;justify-content:center;gap:4px;padding:4px 7px;text-align:center;font:700 12px "Exo 2",sans-serif;position:relative;overflow:hidden;white-space:nowrap}
#screen .l79sel .l79rb{flex-direction:column;min-width:38px;gap:2px;line-height:1}
#screen .l79sel .l79rb .l79f{border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
#screen .l79sel .l79more{flex:1 1 auto;min-width:122px;gap:6px}
#screen .l79sel.wide .l79more, #screen .l79sel.set .l79more{min-width:150px}
#screen .l79sel .l79more::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.12) 2px 3px)}
#screen .l79sel .l79w{font:700 15px "Exo 2","Microsoft YaHei","PingFang SC","Noto Sans SC",Arial,sans-serif;letter-spacing:.3px}
#screen .l79sel .l79cyc{display:inline-block;min-width:5.4em;text-align:center;color:#fff;text-shadow:1.2px 0 rgba(255,50,80,.85),-1.2px 0 rgba(50,220,255,.85)}
#screen .l79sel .l79cyc.g1{animation:l79g1 .14s steps(3) 1}
#screen .l79sel .l79cyc.g2{animation:l79g2 .14s steps(3) 1}
@keyframes l79g1{0%{transform:translate(-3px,0) skewX(-12deg);clip-path:inset(0 0 52% 0);opacity:.55}45%{transform:translate(2px,1px);clip-path:inset(46% 0 0 0)}100%{transform:none;clip-path:inset(0 0 0 0);opacity:1}}
@keyframes l79g2{0%{transform:translate(3px,0) skewX(10deg);clip-path:inset(38% 0 18% 0);opacity:.55}45%{transform:translate(-2px,-1px);clip-path:inset(0 0 60% 0)}100%{transform:none;clip-path:inset(0 0 0 0);opacity:1}}
#screen .l79sel .l79fan{flex:0 0 auto;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
#screen .l79sel .l79more:hover .l79fan{transform:scale(1.08)}
#screen .l79sel .l79pk{flex-direction:row}
#screen .l79sel .l79pk .l79w{color:#111;text-shadow:none}
#screen .l79sel .l79n{font:600 10px "Exo 2",sans-serif;opacity:.7}
#screen .l79sel .l79pk .l79f{border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
#screen .l79sel.pc .l79b.cur{background:var(--sand);color:#111}
#screen .l79list h2{margin:0 0 6px;font-size:20px}
#screen .l79grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
#screen .l79grid .l79c{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;text-align:center}
#screen .l79grid .l79c b{font:700 16px "Exo 2","Microsoft YaHei","PingFang SC","Noto Sans SC",Arial,sans-serif}
#screen .l79grid .l79c small{font:600 10.5px "Exo 2",sans-serif;opacity:.65}
#screen .l79grid .l79c .l79f{border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
#screen .l79grid.ph{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:0 4px}
#screen .l79grid.ph .l79c{border-radius:14px;padding:8px 4px;min-height:74px;justify-content:center}
#screen .l79grid.ph .l79c b{font-size:14px}
#screen .l79grid.ph .l79c small{font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#screen .p71t.l79tile{padding:6px;justify-content:center}
#screen .p71t.l79tile .l79sel{flex-wrap:wrap;width:100%;height:100%;gap:6px}
#screen .p71t.l79tile .l79rb{flex:1 1 40%;min-height:36px;border-radius:10px}
#screen .p71t.l79tile .l79more{flex:1 1 100%;min-height:40px;border-radius:10px;min-width:0}
#screen .p71t.l79tile .l79b.cur{background:rgba(214,198,154,.85);color:#111}
html[lang=zh] *{font-family:"Exo 2","Microsoft YaHei","PingFang SC","Noto Sans SC",Arial,sans-serif !important}
html[lang=tg] *, html[lang=uz] *{font-family:"Exo 2",Arial,sans-serif !important}`;
  document.head.appendChild(st);
})();
// one news line for main to merge into "New in v7.9" (RU / EN / VI / HE; other languages via the dictionaries)
L79.NEWS = [['Новые языки: китайский, узбекский, таджикский, испанский, португальский (Бразилия), обновлены иврит и вьетнамский. Кнопка языка рядом с «Новым матчем»: RU, EN и веер флагов — все языки списком. Язык по умолчанию — как в браузере',
  'New languages: Chinese, Uzbek, Tajik, Spanish, Portuguese (Brazil); Hebrew and Vietnamese updated. Language button next to "New match": RU, EN and a fan of flags with the full list. The default language follows your browser',
  'Ngôn ngữ mới: tiếng Trung, Uzbek, Tajik, Tây Ban Nha, Bồ Đào Nha (Brazil); cập nhật tiếng Do Thái và tiếng Việt. Nút ngôn ngữ cạnh “Trận mới”: RU, EN và chùm cờ với danh sách đầy đủ. Ngôn ngữ mặc định theo trình duyệt',
  'שפות חדשות: סינית, אוזבקית, טג׳יקית, ספרדית, פורטוגזית (ברזיל); עברית ווייטנאמית עודכנו. כפתור השפה ליד „משחק חדש": RU, EN ומניפת דגלים עם הרשימה המלאה. שפת ברירת המחדל לפי הדפדפן']];
