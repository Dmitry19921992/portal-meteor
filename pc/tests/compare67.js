// сравнение результатов полного прогона v6.6 и v6.7 по каждому тесту: ошибки, FAIL, исключения, консоль
const fs = require('fs');
const rd = f => { const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); const S = {}; let cur = null; for (const l of t.split(/\r?\n/)){ const m = l.match(/^===== (\S+)/); if (m){ cur = m[1]; S[cur] = []; continue; } if (cur) S[cur].push(l); } return S; };
const A = rd(process.argv[2]), B = rd(process.argv[3]);
const sum = L => {
  const t = L.join('\n');
  const fails = (t.match(/"FAIL"|: false,? *$|FAIL/gm) || []).length;
  let errs = [];
  const re = /"errors": \[([\s\S]*?)\]/g; let m; while ((m = re.exec(t))) { const s = m[1].trim(); if (s) errs.push(s.replace(/\s+/g, ' ').slice(0, 160)); }
  return { fails: (t.match(/"FAIL"/g) || []).length, errs, exc: /EXCEPTION|EXC:|NO TARGET/.test(t), console: /CONSOLE:/.test(t) ? t.split('CONSOLE:')[1].trim().split('\n').slice(0, 3).join(' | ').slice(0, 200) : '' };
};
for (const k of Object.keys(B)){
  const a = A[k] ? sum(A[k]) : null, b = sum(B[k]);
  const same = a && a.fails === b.fails && a.errs.join() === b.errs.join() && a.exc === b.exc;
  console.log(`${k.padEnd(20)} v66: ${a ? `FAIL=${a.fails} errs=${a.errs.length}${a.exc ? ' EXC' : ''}${a.console ? ' console' : ''}` : '(нет)'}  |  v67: FAIL=${b.fails} errs=${b.errs.length}${b.exc ? ' EXC' : ''}${b.console ? ' console' : ''}  ${same ? '' : '<-- ' + JSON.stringify({ v66: a && a.errs, v67: b.errs })}${b.console ? '\n      console: ' + b.console : ''}`);
}
