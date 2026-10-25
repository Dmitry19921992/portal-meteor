// дамп мобильного HUD: t73.ps1 v73_ui.js out.txt "--android --reload"
SET.lang = 'ru'; applySettings(); MENU.applyLang();
try { localStorage.setItem('pm_t72done', '{}'); } catch (e){}
MENU.newGame(); await sleep(4500);
const dump = () => {
  const rows = [];
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.right > 0 && r.left < innerWidth; };
  for (const e of document.querySelectorAll('body > *, #touch *, #hud *')){
    if (e.id === 'ov' || e.tagName === 'CANVAS' || e.tagName === 'SCRIPT' || e.tagName === 'STYLE') continue;
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    if (r.width > innerWidth * 0.95 && r.height > innerHeight * 0.95) continue;
    rows.push((e.id ? '#' + e.id : '') + '.' + String(e.className).replace(/\s+/g, '.') + ' ' + e.tagName + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '] ' + (e.dataset && e.dataset.s ? 's=' + e.dataset.s : '') + ' ' + (e.textContent || '').trim().slice(0, 18));
  }
  return rows;
};
await shot('D:/AI/pm_v6/shots/v73_ui_fps.jpg');
return ['VP ' + innerWidth + 'x' + innerHeight + ' mode ' + S.mode + ' active ' + M71.active() + ' lite ' + LITE73.on].concat(dump()).join('\n');
