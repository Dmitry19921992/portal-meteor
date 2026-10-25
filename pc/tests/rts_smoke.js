// Быстрый дымовой тест: загрузка, жилы, инженеры, 60 с боя
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(1000); }
const out = { title: document.title, errors: [] };
out.veins = veins().map(v => v.kind + (v.ref >= 0 ? v.ref : '')).join(' ');
MENU.newGame(); if (TUT.on) TUT.finish(); enterRTS();
out.builders0 = S.builders.map(b => b.team + ':' + b.order + ':' + (len(b.pos) - groundR(norm(b.pos))).toFixed(2));
for (let i = 0; i < 60 * 30; i++){ try { update(1 / 30); } catch (e){ out.errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]); if (out.errors.length > 3) break; } }
out.t = Math.round(S.time);
out.builders = S.builders.map(b => b.team + ':' + b.order + (b.site ? '>' + (b.site.type || b.site.cls) : '') + ':' + (len(b.pos) - groundR(norm(b.pos))).toFixed(2));
out.bld = S.buildings.map(b => b.team + ':' + b.type + ':' + b.built.toFixed(2));
out.inc = S.teams.map(t => ecoBreakdown(S.teams.indexOf(t)));
out.ore = S.teams.map(t => Math.round(t.ore));
out.queue = [S.hq[0].queue.join(','), S.hq[1].queue.join(',')];
out.reason = ['build:airdock', 'build:extractor', 'produce:tank', 'produce:builder'].map(a => a + ' -> ' + JSON.stringify(rtsReason(a)));
return out;
