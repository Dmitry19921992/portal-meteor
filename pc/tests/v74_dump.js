// v7.4: список видимых элементов HUD телефона в шутере
SET.lang = 'ru'; applySettings(); MENU.applyLang();
MENU.newGame(); await sleep(4000);
const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
const rows = [];
for (const e of document.querySelectorAll('body *')){ if (!vis(e)) continue; const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') continue; const r = e.getBoundingClientRect(); if (r.width > 900) continue; rows.push((e.id ? '#' + e.id : '') + '.' + String(e.className).replace(/\s+/g, '.') + ' ' + e.tagName + ' p=' + (e.parentElement && (e.parentElement.id || e.parentElement.className)) + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '] ' + (e.dataset && e.dataset.s ? 's=' + e.dataset.s : '') + ' ' + (e.textContent || '').trim().slice(0, 20)); }
return rows.join('\n') + '\nerrs ' + errs.join('|');
