// =====================================================================
//  ЯЗЫКИ: русский / английский / вьетнамский. tr('по-русски', 'in English', 'bằng tiếng Việt')
// =====================================================================
const LANG = { cur: 'ru' };
const LANGS = [['ru', 'Русский'], ['en', 'English'], ['vi', 'Tiếng Việt']];
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
