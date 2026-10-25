// v6.6: портреты разных юнитов крупно
const out = { errors: [], info: {} };
try {
  MENU.newGame(); await sleep(400); if (TUT.on) TUT.finish();
  S.teams[0].ore = 3000;
  for (let i = 0; i < 20; i++) update(0.05);
  enterRTS(); await sleep(300);
  const b0 = teamBuilders(0)[0];
  S.sel.clear(); S.sel.add(b0); playerPlace('barracks', findSite(0, 'barracks'), false);
  for (let i = 0; i < 700; i++) update(0.05);
  const bar = S.buildings.find(b => b.team === 0 && b.type === 'barracks');
  out.info.barDone = bar.done;
  finishProduct(bar, 'heavy1'); finishProduct(bar, 'squad');
  for (let i = 0; i < 30; i++) update(0.05);
  const hv = S.squads.filter(s => s.team === 0 && s.solo === 'heavy').pop();
  const sq = S.squads.filter(s => s.team === 0 && !s.solo).pop();
  out.info.heavyAuto = hv && hv.auto66; out.info.sqAuto = sq && sq.auto66; out.info.sqOrder = sq && sq.order;
  const list = [['heavy', hv], ['squad', sq], ['builder', b0], ['tank', S.vehicles.find(v => v.team === 0 && v.alive)]];
  for (const [n, g] of list){
    if (!g) continue;
    S.sel.clear(); S.sel.add(g); rtsLookAt(leaderPos(g)); S.rts.h = S.rts.hT = 34;
    await sleep(1400);
    await shot('D:/AI/pm_v6/shots/v66_cam_' + n + '.jpg');
  }
  out.info.cam = { ok: CAM66.ok, drawn: CAM66.drawn, ms: +CAM66.ms.toFixed(2) };
  out.info.voice = { played: VOICE66.played, err: VOICE66.errors, last: VOICE66.lastText };
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); }
return out;
