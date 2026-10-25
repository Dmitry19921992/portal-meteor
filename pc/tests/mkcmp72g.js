// делает cmp72g.js из pcab72g.js: тот же детерминированный прогон, сценарий — из cmp72g_scen.js.
const fs = require('fs');
let s = fs.readFileSync(__dirname + '/pcab72g.js', 'utf8');
const a = s.indexOf('const SCEN = `'), b = s.indexOf('`;', a);
const scen = fs.readFileSync(__dirname + '/cmp72g_scen.js', 'utf8');
s = s.slice(0, a) + 'const SCEN = ' + JSON.stringify(scen) + ';' + s.slice(b + 2);
fs.writeFileSync(__dirname + '/cmp72g.js', s);
console.log('ok', s.length);
