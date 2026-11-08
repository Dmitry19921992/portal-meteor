// v7.9 l10n: merges translation parts lang/parts/<code>/*.tsv ("id<TAB>text", \n = line break) into lang/<code>.json,
// writes the runtime id->English table lang/en.json, checks ids and {0} placeholders, prints coverage.
// usage: node tools79l/l79_merge.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const K = JSON.parse(fs.readFileSync(path.join(root, 'lang/keys.json'), 'utf8'));
const byId = new Map(K.map(o => [o.id, o]));
const cur = K.filter(o => !o.old);
const en = {}; for (const o of cur) en[o.id] = o.en;
fs.writeFileSync(path.join(root, 'lang/en.json'), JSON.stringify(en).replace(/","/g, '",\n"') + '\n');
const pdir = path.join(root, 'lang/parts');
const langs = fs.existsSync(pdir) ? fs.readdirSync(pdir).filter(d => /^[a-z]{2}$/.test(d)) : [];
const need = (l, o) => l === 'vi' ? !o.vi && !/^(voice|audio\.js:en-table|camfx\.js:en-table)/.test(o.f) : l === 'he' ? !o.he && !/^voice/.test(o.f) : true;
let bad = 0;
for (const l of langs){
  const D = {}; const warn = [];
  for (const f of fs.readdirSync(path.join(pdir, l)).filter(f => f.endsWith('.tsv')).sort()){
    const lines = fs.readFileSync(path.join(pdir, l, f), 'utf8').replace(/^﻿/, '').split(/\r?\n/);
    lines.forEach((ln, i) => {
      if (!ln.trim() || ln.startsWith('#')) return;
      const t = ln.indexOf('\t'); if (t < 0){ warn.push(f + ':' + (i + 1) + ' no TAB'); return; }
      const id = ln.slice(0, t).trim();
      let tx = ln.slice(t + 1).replace(/\\n/g, '\n').trim();
      if (l === 'uz') tx = tx.replace(/([oOgG])[‘’'`ʼ]/g, '$1ʻ');   // Uzbek Latin: oʻ gʻ with U+02BB (the separator ʼ stays elsewhere)
      const o = byId.get(id); if (!o){ warn.push(f + ':' + (i + 1) + ' unknown id ' + id); return; }
      tx = (o.en.match(/^\s*/)[0]) + tx + (o.en.match(/\s*$/)[0]);   // keep the English leading/trailing spaces (they glue template pieces)
      const ph = o.en.match(/\{\d+\}/g) || [];
      const extra = (tx.match(/\{\d+\}/g) || []).filter(p => !ph.includes(p));
      if (extra.length) warn.push(f + ':' + (i + 1) + ' ' + id + ' extra placeholder ' + extra.join(','));
      const lost = ph.filter(p => !tx.includes(p));
      if (lost.length && !/^(zh|vi)$/.test(l) && lost.length > 1) warn.push(f + ':' + (i + 1) + ' ' + id + ' lost ' + lost.join(',') + ' :: ' + o.en.slice(0, 60));
      D[id] = tx;
    });
  }
  const ordered = {}; for (const o of K) if (D[o.id] !== undefined) ordered[o.id] = D[o.id];
  fs.writeFileSync(path.join(root, 'lang', l + '.json'), JSON.stringify(ordered).replace(/","/g, '",\n"') + '\n');
  const N = cur.filter(o => need(l, o)), have = N.filter(o => D[o.id] !== undefined).length;
  console.log(l, 'entries', Object.keys(D).length, 'needed', N.length, 'done', have, 'missing', N.length - have, warn.length ? 'WARN ' + warn.length : '');
  warn.slice(0, 15).forEach(w => console.log('   ' + w)); bad += warn.length;
}
console.log('en.json', Object.keys(en).length, 'keys');
