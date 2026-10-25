// v6.4: скриншоты ПК (стройка без инженера, куратор у жилы, главное меню)
const out = { shots: [] };
const P = n => { const p = 'D:/AI/pm_v6/shots/v64_pc_' + n + '.jpg'; out.shots.push(p); return p; };
SET.curator = true; localStorage.removeItem('pm_curator'); CUR.once = { intro: 1, cam: 1 };
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(300); enterRTS(); S.teams[0].ai = false; S.teams[0].ore = 300;
S.sel.clear(); S.selB = null; SIDE.tab = 'build'; buildSidebar(); await sleep(1500);
await shot(P('build_gate'));
v64PickBuilder(true); await sleep(1200); startBuild('extractor'); await sleep(400);
const v = curCtx().vein; if (v) rtsLookAt(v.pos); await sleep(1800);
out.cur = CUR.cur && CUR.cur.s.id;
await shot(P('curator_vein'));
S.place = null; S.sel.clear(); S.selB = S.hq[0]; await sleep(1500);
await shot(P('hq_panel2'));
MENU.toMenu(); await sleep(800);
await shot(P('menu'));
return out;
