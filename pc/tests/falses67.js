// где встречается ": false" в v6.6 и v6.7 (по тестам, с ключом)
const fs = require('fs');
const rd = f => { const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); const S = {}; let cur = null; for (const l of t.split(/\r?\n/)){ const m = l.match(/^===== (\S+)/); if (m){ cur = m[1]; S[cur] = []; continue; } if (cur && /: false/.test(l)) S[cur].push(l.trim()); } return S; };
const A = rd(process.argv[2]), B = rd(process.argv[3]);
for (const k of Object.keys(B)){ const a = (A[k] || []).sort().join(' '), b = B[k].sort().join(' '); if (a !== b) console.log(k, '\n  v66:', a, '\n  v67:', b); }
