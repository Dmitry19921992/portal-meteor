MENU.show('settings'); await sleep(300);
const bs = [...document.querySelectorAll('#screen [data-ch="lang"]')];
const row = bs[0].parentElement; const cs = getComputedStyle(bs[0]);
const r = e => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right), Math.round(q.width), Math.round(q.height)]; };
const out = { row: r(row), rowCls: row.className, rowParent: row.parentElement.className + '/' + row.parentElement.tagName, btns: bs.map(r), font: cs.fontSize, pad: cs.padding, gap: getComputedStyle(row).gap, rowStyle: row.getAttribute('style') };
MENU.close();
return out;
