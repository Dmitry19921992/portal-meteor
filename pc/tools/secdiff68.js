const fs = require('fs'); const n = process.argv[2];
const get = f => (fs.readFileSync(f, 'utf8').split('\n===== ').find(x => x.startsWith(n + ' ')) || '').split('\n').slice(1).map(l => l.trim());
const A = get(process.argv[3]), B = get(process.argv[4]);
const sa = new Set(A), sb = new Set(B);
console.log('only A:\n  ' + A.filter(l => !sb.has(l)).slice(0, 25).join('\n  ').slice(0, 2500));
console.log('only B:\n  ' + B.filter(l => !sa.has(l)).slice(0, 25).join('\n  ').slice(0, 2500));
