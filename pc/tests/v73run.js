// node v72run.js <test.js> [args...] — склеивает v73_common.js + тест и запускает cdp73.js
const fs = require('fs'), { spawnSync } = require('child_process');
const a = process.argv.slice(2);
const code = fs.readFileSync(__dirname + '/v73_common.js', 'utf8') + '\n' + fs.readFileSync(a[0], 'utf8');
const tmp = __dirname + '/_v73tmp_' + a[0].replace(/[^a-z0-9_]/gi, '') + '.js';
fs.writeFileSync(tmp, code);
const r = spawnSync('node', [__dirname + '/cdp73.js', tmp, ...a.slice(1)], { encoding: 'utf8', env: process.env, maxBuffer: 1 << 26, timeout: 1500000 });
process.stdout.write((r.stdout || '') + (r.stderr || ''));

