// v6.8: выдёргивает все английские строки интерфейса (2-й аргумент tr(...), пары/тройки ['ru','en','vi'])
// -> tests/he68_keys.json  { key: count }. Шаблоны `...${x}...` -> ключ с {0},{1}
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || 'D:/AI/pm_v6/wt68';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const keys = new Map();
const add = (k, f) => { if (!k || !/[A-Za-z]{2}/.test(k)) return; const o = keys.get(k) || { n: 0, f: new Set() }; o.n++; o.f.add(f); keys.set(k, o); };
// читает строку/шаблон с позиции i (кавычка); возвращает {end, val, tpl}
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
// пропускает выражение до закрывающего символа на нулевой глубине; возвращает позицию после него
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
// разбирает аргументы вызова начиная после '(' ; возвращает [{raw, lit}]
function readArgs(s, i){
  const args = []; let cur = { start: i }, d = 0;
  while (i < s.length){
    const c = s[i];
    if (c === "'" || c === '"' || c === '`'){ i = readStr(s, i).end; continue; }
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}'){ if (d === 0){ args.push(s.slice(cur.start, i)); return { args, end: i + 1 }; } d--; }
    else if (c === ',' && d === 0){ args.push(s.slice(cur.start, i)); cur = { start: i + 1 }; }
    i++;
  }
  return { args, end: i };
}
function litOf(raw){ const t = raw.trim(); if (!t) return null; const q = t[0]; if (q !== "'" && q !== '"' && q !== '`') return null; const r = readStr(t, 0); return r.end === t.length ? r : null; }
let nTr = 0, nArr = 0;
for (const f of files){ const s = fs.readFileSync(path.join(dir, f), 'utf8'); scan(s, 0, s.length, f); }
function scan(s, i, end, f){
  while (i < end){
    const c = s[i];
    if (c === "'" || c === '"'){ i = readStr(s, i).end; continue; }
    if (c === '`'){   // шаблон: внутри ${...} тоже ищем tr(...)
      let j = i + 1;
      while (j < end && s[j] !== '`'){
        if (s[j] === '\\'){ j += 2; continue; }
        if (s[j] === '$' && s[j + 1] === '{'){ const e = skipExpr(s, j + 2, '}'); scan(s, j + 2, e - 1, f); j = e; continue; }
        j++;
      }
      i = j + 1; continue; }
    if (c === '/' && s[i + 1] === '/'){ const e = s.indexOf('\n', i); i = e < 0 ? s.length : e; continue; }
    if (c === '/' && s[i + 1] === '*'){ i = s.indexOf('*/', i) + 2; continue; }
    const fn = (s.startsWith('tr', i) && !/[\w$]/.test(s[i + 2])) ? 2 : (s.startsWith('curL', i) && !/[\w$]/.test(s[i + 4])) ? 4 : 0;
    if (fn && !/[\w$.]/.test(s[i - 1] || ' ')){
      let j = i + fn; while (s[j] === ' ') j++;
      if (s[j] === '('){ const r = readArgs(s, j + 1); nTr++;
        if (r.args.length >= 2){ const L = litOf(r.args[1]); if (L) add(L.val, f); }
        i = j + 1; continue; }
    }
    // en: [ ... ] (CAPS кино-режима, ACKS) — все строки массива
    if (s.startsWith('en:', i) && !/[\w$]/.test(s[i - 1] || ' ')){
      let j = i + 3; while (s[j] === ' ') j++;
      if (s[j] === '['){ const r = readArgs(s, j + 1); r.args.map(litOf).forEach(L => L && add(L.val, f)); i = j + 1; continue; }
    }
    if (c === '['){ const r = readArgs(s, i + 1);
      if (r.args.length >= 2 && r.args.length <= 4){ const a = r.args.map(litOf);
        const k = a.findIndex(x => x && /[А-Яа-яЁё]/.test(x.val));
        if (k >= 0 && a[k + 1] && !/[А-Яа-яЁё]/.test(a[k + 1].val)){ add(a[k + 1].val, f); nArr++; } }
      i++; continue; }
    i++;
  }
}
const out = {}; let chars = 0;
for (const [k, o] of [...keys].sort((a, b) => a[0].localeCompare(b[0]))){ out[k] = [...o.f].join(','); chars += k.length; }
fs.writeFileSync(process.argv[3] || 'D:/AI/pm_v6/tests/he68_keys.json', JSON.stringify(out, null, 0).replace(/","/g, '",\n"'));
console.log('tr calls', nTr, 'arrays', nArr, 'unique', keys.size, 'chars', chars);
