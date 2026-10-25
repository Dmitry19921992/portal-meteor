// v7.8.1: audit every phone tutorial step — does the highlighted element exist/visible, what the hint says
const R = { fps: [], rts: [] };
const errs = []; addEventListener('error', e => errs.push('ERR ' + e.message));
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
SET.lang = 'ru'; SET.denStyle = 0; SET.denUser = true; applySettings(); MENU.applyLang();
const O = 'D:/AI/pm_v6/shots_v781/tut_' + innerWidth + 'x' + innerHeight + '_';
for (const kind of ['fps', 'rts']){
  T72.start('ph_' + kind); await sleep(1800);
  for (let i = 0; i < T72.steps.length; i++){
    const a = T72.steps[i]; T72.leave(); T72.i = i; T72.enter(); await sleep(900);
    const H = T72.how(a) || {}, D = DEF72[a] || {};
    if (D.mode && S.mode !== D.mode){ if (D.mode === 'rts') enterRTS(); else enterFPS(); await sleep(900); T72.leave(); T72.enter(); await sleep(500); }
    let el = null; try { const L = H.el ? H.el(T72) || [] : []; for (const t of L){ const r = T72.rectOf(t); el = (t.sel || (t.zone ? 'zone' : 'rect')) + ' -> ' + (r ? r.slice(0, 4).map(Math.round).join(',') : 'MISSING'); if (r) break; } } catch (e){ el = 'ERR ' + e.message; }
    R[kind].push(`${i + 1}. ${a} [${H.g || '-'}] el=${el || 'none'} | ${(H.h || [''])[0].slice(0, 110)}`);
    if (['fire', 'reload', 'auto', 'rocket', 'grenade', 'skills', 'box', 'radial', 'pan'].includes(a)) await shot(O + kind + '_' + a + '.jpg');
  }
  T72.stop(); MENU.toMenu(); await sleep(600);
}
R.errs = errs;
return R;
