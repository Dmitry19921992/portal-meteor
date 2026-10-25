// размеры частей собранной страницы: node scr70.js v69 v70
const fs = require('fs');
for (const f of process.argv.slice(2)){
  const s = fs.readFileSync('D:/AI/pm_v6/dist/' + f + '.html', 'utf8');
  const re = /<script(?: id="(\w+)")?[^>]*>/g; let m; const pos = [];
  while ((m = re.exec(s))) pos.push([m[1] || 'js', m.index]);
  console.log(f, s.length, pos.map((p, i) => p[0] + ':' + ((pos[i + 1] ? pos[i + 1][1] : s.length) - p[1])).join(' '));
}
