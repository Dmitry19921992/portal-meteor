// =====================================================================
//  ЯЗЫКИ: русский / английский / вьетнамский. tr('по-русски', 'in English', 'bằng tiếng Việt')
// =====================================================================
const LANG = { cur: 'ru' };
const LANGS = [['ru', 'Русский'], ['en', 'English'], ['vi', 'Tiếng Việt']];
// флажки языков — SVG (эмодзи-флаги Windows не рисует)
const LANG_FLAG = {
  ru: '<svg viewBox="0 0 9 6" width="21" height="14" style="vertical-align:-2px;margin-right:6px;border-radius:2px"><rect width="9" height="2" fill="#fff"/><rect y="2" width="9" height="2" fill="#0039a6"/><rect y="4" width="9" height="2" fill="#d52b1e"/></svg>',
  en: '<svg viewBox="0 0 60 30" width="24" height="14" style="vertical-align:-2px;margin-right:6px;border-radius:2px"><rect width="60" height="30" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" stroke="#C8102E" stroke-width="2.5"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  vi: '<svg viewBox="0 0 30 20" width="21" height="14" style="vertical-align:-2px;margin-right:6px;border-radius:2px"><rect width="30" height="20" fill="#da251d"/><polygon fill="#ff0" points="15,4 16.76,9.43 22.47,9.43 17.85,12.79 19.61,18.21 15,14.86 10.39,18.21 12.15,12.79 7.53,9.43 13.24,9.43"/></svg>',
};
function tr(ru, en, vi){ const L = LANG.cur; return L === 'en' ? en : L === 'vi' ? (vi !== undefined ? vi : en) : ru; }
function N2(pair){ const L = LANG.cur; return L === 'en' ? pair[1] : L === 'vi' ? (pair[2] !== undefined ? pair[2] : pair[1]) : pair[0]; }
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
  if (LANG.cur === 'en') return n === 1 ? one : many;
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few;
  return many;
}
