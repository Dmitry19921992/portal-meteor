// v7.9 l10n: coverage stats per language + dump of untranslated keys in chunks
// node tools79l/l79_stats.js                -> table
// node tools79l/l79_stats.js dump <lang> <from> <n> [ruOnly]  -> print id | en | ru for keys missing in lang/<lang>.json
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const K = JSON.parse(fs.readFileSync(path.join(root, 'lang/keys.json'), 'utf8'));
const cur = K.filter(o => !o.old);
const load = l => { try { return JSON.parse(fs.readFileSync(path.join(root, 'lang', l + '.json'), 'utf8')); } catch (e){ return {}; } };
const LS = ['zh', 'uz', 'tg', 'he', 'vi', 'es', 'pt', 'id'];
const need = (l, o) => l === 'vi' ? !o.vi && !/^(voice|audio\.js:en-table|camfx\.js:en-table)/.test(o.f) : l === 'he' ? !o.he && !/^voice/.test(o.f) : true;
const a = process.argv.slice(2);
if (a[0] === 'dump'){
  const l = a[1], D = load(l), from = +a[2] || 0, n = +a[3] || 100;
  const L = cur.filter(o => need(l, o) && D[o.id] === undefined).slice(from, from + n);
  for (const o of L) console.log(o.id + '\t' + JSON.stringify(o.en) + '\t' + JSON.stringify(o.ru) + (o.vi && a[4] ? '\tVI ' + JSON.stringify(o.vi) : ''));
  process.exit(0);
}
if (a[0] === 'all'){   // id | en | ru for ALL current keys (chunked), regardless of translations
  const from = +a[1] || 0, n = +a[2] || 100;
  for (const o of cur.slice(from, from + n)) console.log((need('he', o) ? 'H' : '') + (need('vi', o) ? 'V' : '') + '\t' + o.id + '\t' + JSON.stringify(o.en) + (a[3] === 'noru' ? '' : '\t' + JSON.stringify(o.ru)));
  process.exit(0);
}
console.log('keys', K.length, 'current', cur.length, 'old', K.length - cur.length, 'chars en', cur.reduce((s, o) => s + o.en.length, 0), 'old chars', K.filter(o => o.old).reduce((s, o) => s + o.en.length, 0));
for (const l of LS){
  const D = load(l), N = cur.filter(o => need(l, o));
  const have = N.filter(o => D[o.id] !== undefined).length;
  const bad = N.filter(o => D[o.id] !== undefined && (o.en.match(/\{\d+\}/g) || []).some(p => D[o.id].indexOf(p) < 0 && !/[a-z]/i.test('')) ).length;
  console.log(l.padEnd(3), 'needed', N.length, 'done', have, 'missing', N.length - have, 'phMissing', bad, 'stale', Object.keys(D).filter(id => !K.some(o => o.id === id)).length);
}
