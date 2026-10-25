// v6.8: tests/he68_mt.json (+ ручные правки tools/he68_fix.json) -> wt68/he68_dict.js
const fs = require('fs');
const keys = Object.keys(JSON.parse(fs.readFileSync('D:/AI/pm_v6/tests/he68_keys2.json', 'utf8')));
const mt = JSON.parse(fs.readFileSync('D:/AI/pm_v6/tests/he68_mt.json', 'utf8'));
let fix = {}; try { fix = JSON.parse(fs.readFileSync('D:/AI/pm_v6/tools/he68_fix.json', 'utf8').replace(/^\uFEFF/, '')); } catch (e){}
const D = {}; const skip = { missing: 0, noHeb: 0, ph: 0 }; const bad = [];
for (const k of keys){
  let he = fix[k] !== undefined ? fix[k] : mt[k];
  if (he === undefined){ skip.missing++; continue; }
  if (!/[\u0590-\u05FF]/.test(he)){ skip.noHeb++; continue; }
  const ph = k.match(/\{\w+\}/g) || [];
  if (ph.some(p => he.split(p).length - 1 !== k.split(p).length - 1)){ skip.ph++; bad.push(k); continue; }
  // глоссарий: типичные промахи NLLB на игровых словах (ore -> «נחל» ручей, dome -> «קפה» кофе ...)
  if (/\bore\b/i.test(k)) he = he.replace(/נחל/g, 'עפרה').replace(/אור(?=[\s.,:;!?)]|$)/g, 'עפרה');
  if (/\bdome\b/i.test(k)) he = he.replace(/קפה/g, 'כיפה');
  if (/\bsquad/i.test(k)) he = he.replace(/חטיבות/g, 'חוליות').replace(/חטיבה/g, 'חוליה');
  if (/\bbuilder/i.test(k)) he = he.replace(/בונים/g, 'מהנדסים');
  he = he.replace(/\bv\s+(?=\d)/g, 'v');   // «v 6.6» -> «v6.6» (по номеру версии меню ищет заголовки)
  const lead = k.match(/^\s*/)[0], trail = k.match(/\s*$/)[0];
  he = lead + he.trim() + trail;
  // NLLB иногда дублирует фразу или ставит точку там, где в оригинале её нет
  if (!/[.!?。]$/.test(k.trim()) && /\.$/.test(he.trim())) he = lead + he.trim().replace(/\.$/, '') + trail;
  D[k] = he;
}
const js = '// v6.8: словарь иврита для интерфейса: английский текст -> иврит. МАШИННЫЙ ПЕРЕВОД (NLLB-200-distilled-1.3B, локально),\n'
  + '// machine translation — not reviewed by a native speaker. Генерируется tools/he68_extract.js + he68_mt.py + he68_mkdict.js;\n'
  + '// ручные правки — tools/he68_fix.json. Строк без перевода нет в словаре — для них показывается английский.\n'
  + 'const HE68_DICT = ' + JSON.stringify(D, null, 0).replace(/","/g, '",\n"') + ';\n';
fs.writeFileSync('D:/AI/pm_v6/wt68/he68_dict.js', js);
console.log('keys', keys.length, 'dict', Object.keys(D).length, 'skip', JSON.stringify(skip), 'bytes', Buffer.byteLength(js));
if (bad.length) console.log('PH-BAD', bad.slice(0, 20).join(' || '));
