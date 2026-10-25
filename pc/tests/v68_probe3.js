MENU.show('settings'); await sleep(300);
const rr = e => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width)].join(','); };
const rows = [...document.querySelectorAll('#screen .row')].slice(0, 6).map(r => rr(r) + ' | ' + [...r.children].map(rr).join(' ; '));
const col = document.querySelector('#screen .row').parentElement;
const o = { lang: LANG.cur, col: rr(col) + ' ' + col.className, rows, chs: [...document.querySelectorAll('#screen [data-ch="lang"]')].map(rr) };
MENU.close(); return o;
