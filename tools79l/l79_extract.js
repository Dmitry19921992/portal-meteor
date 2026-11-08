// v7.9 l10n: extracts every user-visible UI string pair (Russian literal followed by a Latin literal) from the game sources.
// Catches tr(...)/N2 pairs, H(...)/T(...)/L(...)/lab(...) aliases, ['ru','en','vi','he'] arrays, template literals (${...} -> {0},{1}).
// Output: lang/keys.json — [{ id, en, ru, vi?, he?, f: 'file:line', old?: 1 }]  (id = stable short hash of the English text)
// old = only shown in "New in v6.x … v7.6" news lists (hidden for the new languages, so not translated).
// usage: node tools79l/l79_extract.js [srcDir] [out]
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.join(__dirname, '..');
const out = process.argv[3] || path.join(dir, 'lang', 'keys.json');
const SKIP = new Set(['he68_dict.js']);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !SKIP.has(f));
const CYR = /[А-Яа-яЁё]/, LAT = /[A-Za-z]{2}/;
function readStr(s, i){
  const q = s[i]; let j = i + 1, val = '', ph = 0;
  while (j < s.length){
    const c = s[j];
    if (c === '\\'){ const n = s[j + 1];
      const map = { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"', '`': '`', '$': '$' };
      if (n === 'u' && s[j + 2] === '{'){ const e = s.indexOf('}', j); val += String.fromCodePoint(parseInt(s.slice(j + 3, e), 16)); j = e + 1; continue; }
      if (n === 'u'){ val += String.fromCharCode(parseInt(s.slice(j + 2, j + 6), 16)); j += 6; continue; }
      if (n === 'x'){ val += String.fromCharCode(parseInt(s.slice(j + 2, j + 4), 16)); j += 4; continue; }
      if (n === '\n'){ j += 2; continue; }
      val += map[n] !== undefined ? map[n] : n; j += 2; continue; }
    if (c === q) return { end: j + 1, val, tpl: q === '`', ph };
    if (q === '`' && c === '$' && s[j + 1] === '{'){ j = skipExpr(s, j + 2, '}'); val += '{' + (ph++) + '}'; continue; }
    val += c; j++;
  }
  return { end: j, val, tpl: q === '`', ph };
}
function skipExpr(s, i, close){
  let d = 0;
  while (i < s.length){
    const c = s[i];
    if (c === "'" || c === '"' || c === '`'){ i = readStr(s, i).end; continue; }
    if (c === '/' && s[i + 1] === '/'){ i = s.indexOf('\n', i); continue; }
    if (c === '/' && s[i + 1] === '*'){ i = s.indexOf('*/', i) + 2; continue; }
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}'){ if (d === 0 && c === close) return i + 1; d--; }
    i++;
  }
  return i;
}
function readArgs(s, i){
  const args = []; let st = i, d = 0;
  while (i < s.length){
    const c = s[i];
    if (c === "'" || c === '"' || c === '`'){ i = readStr(s, i).end; continue; }
    if (c === '/' && s[i + 1] === '/'){ i = s.indexOf('\n', i); continue; }
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}'){ if (d === 0){ args.push(s.slice(st, i)); return { args, end: i + 1 }; } d--; }
    else if (c === ',' && d === 0){ args.push(s.slice(st, i)); st = i + 1; }
    i++;
  }
  return { args, end: i };
}
function lit1(t){ const q = t[0]; if (q !== "'" && q !== '"' && q !== '`') return null; const r = readStr(t, 0); return r.end === t.length ? r : null; }
// a literal, or a top-level concatenation 'text ' + expr + ' more' -> template with {0},{1} (expressions become placeholders)
function litOf(raw){
  const t = raw.trim(); if (!t) return null;
  const one = lit1(t); if (one) return one;
  const parts = []; let st = 0, d = 0, i = 0;
  while (i < t.length){
    const c = t[i];
    if (c === "'" || c === '"' || c === '`'){ i = readStr(t, i).end; continue; }
    if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}') d--;
    else if (c === '?' && d === 0) return null;   // ternaries: not a plain concatenation
    else if (c === '+' && d === 0){ parts.push(t.slice(st, i).trim()); st = i + 1; }
    i++;
  }
  parts.push(t.slice(st).trim());
  if (parts.length < 2) return null;
  let val = '', ph = 0, nLit = 0;
  for (const p of parts){
    const L = p && lit1(p);
    if (L){ val += L.val.replace(/\{(\d+)\}/g, () => '{' + (ph++) + '}'); nLit++; }
    else if (p) val += '{' + (ph++) + '}';
    else return null;
  }
  return nLit ? { val, tpl: true, ph } : null;
}
const keys = new Map(); let nPairs = 0;
function add(a, k, f, line, old){
  const en = a[k + 1].val, ru = a[k].val;
  if (!LAT.test(en) || CYR.test(en)) return;
  nPairs++;
  let o = keys.get(en);
  if (!o){ o = { en, ru, f: f + ':' + line, old: old ? 1 : 0 }; keys.set(en, o); }
  else if (!old) o.old = 0;
  const vi = a[k + 2], he = a[k + 3];
  if (vi && !CYR.test(vi.val) && !/[֐-׿]/.test(vi.val)) o.vi = o.vi || vi.val;
  if (he && /[֐-׿]/.test(he.val)) o.he = o.he || he.val;
  if (vi && /[֐-׿]/.test(vi.val)) o.he = o.he || vi.val;
}
function lineAt(s, i){ let n = 1; for (let j = 0; j < i; j++) if (s.charCodeAt(j) === 10) n++; return n; }
for (const f of files){
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  // old news ranges
  const oldR = [];
  const reN = /const V(6\d|7[0-6]|75F)_NEWS = \[/g; let m;
  while ((m = reN.exec(s))){ const e = skipExpr(s, m.index + m[0].length, ']'); oldR.push([m.index, e]); }
  if (f === 'menu.js'){ const a = s.indexOf("<h3>${tr('Новое в v6.3'"); const b = s.indexOf('html_pause()'); if (a > 0 && b > a) oldR.push([a, b]); }
  const isOld = i => oldR.some(([a, b]) => i >= a && i < b);
  scan(s, f === 'v79_lang.js' ? Math.max(0, s.indexOf('L79.NEWS =')) : 0, s.length);   // v79_lang.js: only its news line (the language list is not UI text)
  function scan(s, i, end){
    while (i < end){
      const c = s[i];
      if (c === "'" || c === '"'){ i = readStr(s, i).end; continue; }
      if (c === '`'){
        let j = i + 1;
        while (j < end && s[j] !== '`'){
          if (s[j] === '\\'){ j += 2; continue; }
          if (s[j] === '$' && s[j + 1] === '{'){ const e = skipExpr(s, j + 2, '}'); scan(s, j + 2, e - 1); j = e; continue; }
          j++;
        }
        i = j + 1; continue; }
      if (c === '/' && s[i + 1] === '/'){ const e = s.indexOf('\n', i); i = e < 0 ? s.length : e; continue; }
      if (c === '/' && s[i + 1] === '*'){ i = s.indexOf('*/', i) + 2; continue; }
      if (c === '(' || c === '['){
        const r = readArgs(s, i + 1);
        if (r.args.length >= 2){
          const a = r.args.map(litOf);
          for (let k = 0; k + 1 < a.length; k++){
            if (a[k] && a[k + 1] && CYR.test(a[k].val) && !CYR.test(a[k + 1].val)){ add(a, k, f, lineAt(s, i), isOld(i)); break; }
          }
        }
        i++; continue;
      }
      i++;
    }
  }
}
// per-language tables keyed by language: ACKS (audio.js) and OPER.CAPS (camfx.js) — `ru: {…}` / `en: {…}` blocks, paired by order
function litsIn(s, a, b){ const L = []; let i = a; while (i < b){ const c = s[i]; if (c === "'" || c === '"' || c === '`'){ const r = readStr(s, i); L.push(r.val); i = r.end; continue; } i++; } return L; }
for (const f of ['audio.js', 'camfx.js']){
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  const blk = k => { const m = new RegExp('\\b' + k + ':\\s*([\\[{])').exec(s); if (!m) return null; const st = m.index + m[0].length; return litsIn(s, st, skipExpr(s, st, m[1] === '[' ? ']' : '}')); };
  const R = blk('ru'), E = blk('en'); if (!E) continue;
  E.forEach((en, i) => add([{ val: R && R[i] || '—' }, { val: en }], 0, f, 'en-table', false));
}
// unit voice packs: subtitles of the EN pack lines (voice68_en.json), Russian text from voice66.json
try {
  const E = JSON.parse(fs.readFileSync(path.join(dir, 'assets/voice68_en.json'), 'utf8')), R = JSON.parse(fs.readFileSync(path.join(dir, 'assets/voice66.json'), 'utf8'));
  for (const t in E) for (const k in E[t]){ const a = E[t][k]; if (!Array.isArray(a)) continue;
    a.forEach((it, i) => { const ru = R[t] && R[t][k] && R[t][k][i] ? R[t][k][i].t : '—'; if (it && it.t) add([{ val: ru }, { val: it.t }], 0, 'voice', t + '/' + k, false); }); }
} catch (e){ console.log('voice packs: ' + e.message); }
// stable id: base36 FNV-1a of the English text (collisions resolved with a suffix)
const fnv = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const used = new Set(); const L = [];
for (const o of keys.values()){
  let id = fnv(o.en); while (used.has(id)) id += 'x'; used.add(id);
  const r = { id, en: o.en, ru: o.ru }; if (o.vi) r.vi = o.vi; if (o.he) r.he = o.he; r.f = o.f; if (o.old) r.old = 1; L.push(r);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, '[\n' + L.map(o => JSON.stringify(o)).join(',\n') + '\n]\n');
const cur = L.filter(o => !o.old);
console.log('pairs', nPairs, 'unique', L.length, 'current', cur.length, 'chars', cur.reduce((a, o) => a + o.en.length, 0),
  'noVi', cur.filter(o => !o.vi).length, 'noHe', cur.filter(o => !o.he).length);
