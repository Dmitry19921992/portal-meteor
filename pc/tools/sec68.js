// node sec68.js name [pattern] — строки раздела теста из out_v67 и out_v68
const fs = require('fs'); const n = process.argv[2]; const re = new RegExp(process.argv[3] || 'FAIL|overlap|EXC|CONSOLE|error', 'i');
for (const f of ['out_v67', 'out_v68']){
  const t = fs.readFileSync('D:/AI/pm_v6/tests/' + f + '.txt', 'utf8');
  const b = t.split('\n===== ').find(x => x.startsWith(n + ' ')) || '';
  console.log('### ' + f + ' ' + n); console.log(b.split('\n').filter(l => re.test(l)).slice(0, 14).map(l => '  ' + l.trim().slice(0, 260)).join('\n'));
}
