// осмотр раскладки: скриншоты + видимые кнопки (rect) в шутере и стратегии. Аргумент — префикс файла через window.__pfx
const pfx = window.__pfx || 'D:/AI/pm_v6/shots/v64_look';
const out = { vp: [innerWidth, innerHeight], touch: TOUCH.on };
MENU.newGame(); if (TUT.on) TUT.finish();
await sleep(2500);
const vis = () => [...document.querySelectorAll('button, .hb, #minimap, canvas#mm, #mm, #card, #side, #pstrip, #r61cards, #hud > *, #touch .tt, #tjoy')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && e.offsetParent !== null; })
  .map(e => { const r = e.getBoundingClientRect(); return (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0]) + '[' + (e.dataset.t || e.dataset.k || e.dataset.tab || e.dataset.ux || (e.textContent || '').trim().slice(0, 10)) + '] ' + [r.left, r.top, r.width, r.height].map(Math.round).join(','); });
out.fps = vis();
await shot(pfx + '_fps.jpg');
enterRTS(); await sleep(2500);
out.rts = vis();
await shot(pfx + '_rts.jpg');
S.sel.clear(); S.selB = S.hq[0]; await sleep(800);
await shot(pfx + '_rts_hq.jpg');
S.selB = null; const b = teamBuilders(0)[0]; if (b) S.sel.add(b); await sleep(800);
out.rtsBuilder = vis();
await shot(pfx + '_rts_builder.jpg');
return out;
