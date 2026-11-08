// =====================================================================
//  ЯЗЫКИ: русский / английский / вьетнамский. tr('по-русски', 'in English', 'bằng tiếng Việt')
// =====================================================================
const LANG = { cur: 'ru' };
const LANGS = [['ru', 'Русский'], ['en', 'English'], ['vi', 'Tiếng Việt'], ['he', 'עברית']];
// v6.8: иврит — 4-й язык. Строки берутся из словаря HE68_DICT (he68_dict.js) по английскому тексту;
// перевод МАШИННЫЙ (NLLB-200, локально) — machine translation, not reviewed by a native speaker.
// флажки языков — SVG (эмодзи-флаги Windows не рисует)
const LANG_FLAG = {
  ru: '<svg viewBox="0 0 9 6" width="21" height="14" style="vertical-align:-2px;margin-right:6px;border-radius:2px"><rect width="9" height="2" fill="#fff"/><rect y="2" width="9" height="2" fill="#0039a6"/><rect y="4" width="9" height="2" fill="#d52b1e"/></svg>',
  en: '<svg viewBox="0 0 60 30" width="24" height="14" style="vertical-align:-2px;margin-right:6px;border-radius:2px"><rect width="60" height="30" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" stroke="#C8102E" stroke-width="2.5"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  vi: '<svg viewBox="0 0 30 20" width="21" height="14" style="vertical-align:-2px;margin-right:6px;border-radius:2px"><rect width="30" height="20" fill="#da251d"/><polygon fill="#ff0" points="15,4 16.76,9.43 22.47,9.43 17.85,12.79 19.61,18.21 15,14.86 10.39,18.21 12.15,12.79 7.53,9.43 13.24,9.43"/></svg>',
  he: '<svg viewBox="0 0 220 160" width="19" height="14" style="vertical-align:-2px;margin-right:6px;margin-left:6px;border-radius:2px"><rect width="220" height="160" fill="#fff"/><rect y="15" width="220" height="25" fill="#0038b8"/><rect y="120" width="220" height="25" fill="#0038b8"/><path d="M110,52 L135,95 L85,95 Z M110,108 L85,65 L135,65 Z" fill="none" stroke="#0038b8" stroke-width="7"/></svg>',
};
function tr(ru, en, vi, he){ const L = LANG.cur; return L === 'en' ? en : L === 'vi' ? (vi !== undefined ? vi : en) : L === 'he' ? (he !== undefined ? he : HE68(en)) : ru; }
function N2(pair){ const L = LANG.cur; return L === 'en' ? pair[1] : L === 'vi' ? (pair[2] !== undefined ? pair[2] : pair[1]) : L === 'he' ? (typeof pair[3] === 'string' && /[֐-׿]/.test(pair[3]) ? pair[3] : HE68(pair[1])) : pair[0]; }
// английский текст -> иврит: точное совпадение, затем шаблоны с {0},{1} (подставленные куски переносятся как есть)
const HE68C = { map: null, tpl: null, cache: new Map() };
function HE68(en){
  if (typeof en !== 'string' || !en) return en;
  const C = HE68C;
  if (!C.map){
    C.map = new Map(); C.tpl = [];
    const D = typeof HE68_DICT !== 'undefined' ? HE68_DICT : {};
    for (const k in D){
      if (!/\{\d+\}/.test(k)){ C.map.set(k, D[k]); continue; }
      const lits = k.split(/\{\d+\}/); const lit = lits.join('');
      if (lit.replace(/[^A-Za-z]/g, '').length < 3) continue;   // «{0} {1}» и т.п. — ловили бы всё подряд
      const order = (k.match(/\{\d+\}/g) || []).map(x => +x.slice(1, -1));
      const re = new RegExp('^' + lits.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('([\\s\\S]*?)') + '$');
      C.tpl.push({ re, order, he: D[k], key: lits.reduce((a, b) => a.length >= b.length ? a : b, ''), n: lit.length });
    }
    C.tpl.sort((a, b) => b.n - a.n);
  }
  const m0 = C.map.get(en); if (m0 !== undefined) return m0;
  const c0 = C.cache.get(en); if (c0 !== undefined) return c0;
  let out = en;
  for (const t of C.tpl){
    if (t.key && en.indexOf(t.key) < 0) continue;
    const m = t.re.exec(en); if (!m) continue;
    const val = []; t.order.forEach((ix, j) => { val[ix] = m[j + 1]; });
    out = t.he.replace(/\{(\d+)\}/g, (s, d) => val[+d] !== undefined ? val[+d] : '');
    break;
  }
  if (C.cache.size > 4000) C.cache.clear();
  C.cache.set(en, out);
  return out;
}
const TEAMN = [['Консорциум', 'Consortium', 'Liên minh'], ['Рой', 'Swarm', 'Bầy Đàn']];
function teamName(t){ return N2(TEAMN[t]); }
const SAY_LETTER_RU = { A: 'А', B: 'Бэ', C: 'Цэ', D: 'Дэ', E: 'Е', F: 'Эф' };
function cpName(cp){ return cp.core ? tr('Ядро', 'Core', 'Lõi') : cp.name; }
function cpSay(cp){ return cp.core ? tr('ядро', 'the core', 'lõi') : tr('точку ' + (SAY_LETTER_RU[cp.name] || cp.name), 'point ' + cp.name, 'điểm ' + cp.name); }
function cpSayNom(cp){ return cp.core ? tr('Ядро', 'The core', 'Lõi') : tr('Точка ' + (SAY_LETTER_RU[cp.name] || cp.name), 'Point ' + cp.name, 'Điểm ' + cp.name); }
// направление относительно взгляда камеры
function relDirWord(pos){
  const c = S.cam; if (!c) return '';
  const v = sub(pos, c.pos);
  const up = norm(c.pos.length ? c.pos : [0, 1, 0]);
  const f = tangent(c.fwd, up), r = norm(cross(f, up));
  const x = dot(v, r), z = dot(v, f);
  const a = atan2(x, z) * 180 / PI;
  if (abs(a) < 35) return tr('впереди', 'ahead', 'phía trước');
  if (abs(a) > 140) return tr('сзади', 'behind you', 'phía sau bạn');
  if (a > 0) return abs(a) < 80 ? tr('справа впереди', 'front right', 'phía trước bên phải') : tr('справа', 'on your right', 'bên phải');
  return abs(a) < 80 ? tr('слева впереди', 'front left', 'phía trước bên trái') : tr('слева', 'on your left', 'bên trái');
}
function plural(n, one, few, many){
  if (LANG.cur === 'vi') return '';
  if (LANG.cur === 'en' || LANG.cur === 'he') return n === 1 ? one : many;
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few;
  return many;
}
