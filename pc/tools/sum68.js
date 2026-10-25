// сводка out_v6x.txt: по каждому тесту — FAIL, EXCEPTION, CONSOLE, errors; сравнение двух прогонов
const fs = require('fs');
const parse = f => { const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); const o = {};
  t.split(/\n===== /).slice(1).forEach(b => { const name = b.split(' ')[0]; const fails = (b.match(/"FAIL"|: false\b|"pass": false/g) || []).length;
    const err = (b.match(/"errors": \[([\s\S]*?)\]/) || [])[1] || ''; const errs = err.trim() ? err.trim().replace(/\s+/g, ' ').slice(0, 220) : '';
    const con = b.includes('CONSOLE:') ? b.slice(b.indexOf('CONSOLE:') + 8).trim().split('\n').slice(0, 3).join(' | ').slice(0, 220) : '';
    o[name] = { fails, exc: /EXCEPTION|NO TARGET/.test(b), errs, con }; }); return o; };
const A = parse(process.argv[2]), B = parse(process.argv[3]);
for (const k of new Set([...Object.keys(A), ...Object.keys(B)])){
  const a = A[k] || {}, b = B[k] || {};
  const same = a.fails === b.fails && a.exc === b.exc && !!a.con === !!b.con && a.errs === b.errs;
  console.log((same ? '  = ' : '  ! ') + k.padEnd(22) + ` A: f${a.fails} ${a.exc ? 'EXC' : ''} ${a.con ? 'CON' : ''} | B: f${b.fails} ${b.exc ? 'EXC' : ''} ${b.con ? 'CON' : ''}`);
  if (!same){ if (a.errs !== b.errs) console.log('      A errs: ' + a.errs + '\n      B errs: ' + b.errs); if (b.con) console.log('      B con: ' + b.con); }
}
