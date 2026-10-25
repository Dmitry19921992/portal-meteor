// node blk69.js out_a.txt out_b.txt name1,name2 — строки с FAIL/false у выбранных тестов в двух прогонах
const fs = require('fs');
const blk = (f, n) => { const t = fs.readFileSync(f, 'utf8'); const b = t.split(/\n===== /).find(x => x.startsWith(n + ' ')) || ''; return b.split('\n').filter(l => /FAIL|: false\b|"pass": false|EXC|CONSOLE|error/i.test(l)).map(l => l.trim().slice(0, 240)); };
for (const n of process.argv[4].split(',')){
  const A = blk(process.argv[2], n), B = blk(process.argv[3], n);
  console.log('### ' + n);
  for (const l of B) if (!A.includes(l)) console.log('  + ' + l);
  for (const l of A) if (!B.includes(l)) console.log('  - ' + l);
}
