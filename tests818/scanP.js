// scan string literals for a standalone "P" key mention (v8.18 T67: remove P from hints)
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const re = /(^|[\s(«"'`,;/\[])P(?=[\s)»,.;:/\]]|$)/;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !/dict|^v818|^dict_/.test(f))){
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  lines.forEach((l, i) => {
    const strs = l.match(/'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"/g) || [];
    for (const s of strs){
      if (s.length < 6) continue;
      if (!re.test(s)) continue;
      if (!/[А-Яа-яё]|mode|Commander|strategy|ninja|AUTO|auto/i.test(s)) continue;
      const m = s.match(re); const k = s.indexOf(m[0]);
      console.log(f + ':' + (i + 1) + ': ' + s.slice(Math.max(0, k - 70), k + 70).replace(/\s+/g, ' '));
    }
  });
}
