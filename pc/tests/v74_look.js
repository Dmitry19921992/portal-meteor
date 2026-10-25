// v7.4: скриншоты телефона: стратегия, выбор штаба и инженера
SET.lang = 'ru'; applySettings(); MENU.applyLang();
MENU.newGame(); await sleep(4000);
enterRTS(); await sleep(1500);
const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
const dump = () => { const rows = []; for (const e of document.querySelectorAll('body *')){ if (!e.id || !vis(e)) continue; const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') continue; const r = e.getBoundingClientRect(); rows.push('#' + e.id + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '] ' + (e.textContent || '').trim().slice(0, 30)); } return rows; };
const out = ['RTS'].concat(dump());
const hq = S.buildings.find(b => b.team === 0 && b.alive && b.type === 'hq') || S.buildings.find(b => b.team === 0 && b.alive);
S.sel.clear(); S.selB = hq; updateModeUI(); if (typeof buildSidebar === 'function') buildSidebar(); await sleep(800);
await shot('D:/AI/pm_v6/shots/v74_rts_hq.jpg');
out.push('HQ ' + (hq && hq.type)); out.push(...dump());
const bl = S.builders.find(b => b.alive && b.team === 0);
S.selB = null; S.sel.clear(); if (bl) S.sel.add(bl); updateModeUI(); if (typeof buildSidebar === 'function') buildSidebar(); await sleep(800);
await shot('D:/AI/pm_v6/shots/v74_rts_eng.jpg');
out.push('ENG ' + !!bl); out.push(...dump());
out.push('blds ' + S.buildings.filter(b => b.team === 0).map(b => b.type + (b.done ? '' : '*')).join(','));
out.push('errs ' + errs.length + ' ' + errs.slice(0, 5).join(' | '));
return out.join('\n');
