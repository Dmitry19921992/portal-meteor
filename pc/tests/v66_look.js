// v6.6: посмотреть портрет, казарму, склад, поля
const out = { errors: [], info: {} };
try {
  MENU.newGame(); await sleep(400); if (TUT.on) TUT.finish();
  S.teams[0].ore = 3000;
  for (let i = 0; i < 20; i++) update(0.05);
  enterRTS(); await sleep(300);
  AU.init(); out.info.au = { ctx: AU.ctx && AU.ctx.state, on: AU.on, ready: AU.ready() };
  // казарма и склад рядом с базой
  const b0 = teamBuilders(0)[0], b1 = teamBuilders(0)[1];
  S.sel.clear(); S.sel.add(b0);
  const d1 = findSite(0, 'barracks'); out.info.bar = playerPlace('barracks', d1, false);
  const f = g66NearestField(0, BASES[0]);
  let dd = null; for (let k = 0; k < 60 && !dd; k++){ const a = k * 0.7, t1 = anyTangent(f.dir), t2 = cross(f.dir, t1); const d = offsetOnSphere(f.dir, add(mul(t1, cos(a)), mul(t2, sin(a))), 10 + k * 0.2); if (!siteProblem(0, 'depot', d)) dd = d; }
  S.sel.clear(); S.sel.add(b1); out.info.dep = playerPlace('depot', dd, false);
  for (let i = 0; i < 1400; i++) update(0.05);
  const bar = S.buildings.find(b => b.team === 0 && b.type === 'barracks'), dep = S.buildings.find(b => b.team === 0 && b.type === 'depot');
  out.info.built = { bar: bar && bar.built, dep: dep && dep.built };
  rtsLookAt(bar.pos); S.rts.h = S.rts.hT = 30; await sleep(1200);
  S.sel.clear(); S.selB = bar; await sleep(600);
  await shot('D:/AI/pm_v6/shots/v66_barracks.jpg');
  rtsLookAt(f.pos); S.rts.h = S.rts.hT = 26; S.sel.clear(); S.selB = null; await sleep(1200);
  await shot('D:/AI/pm_v6/shots/v66_field.jpg');
  // портреты: отряд, инженер, танк
  const sq = S.squads.find(s => s.team === 0); S.sel.clear(); S.sel.add(sq); rtsLookAt(leaderPos(sq)); S.rts.h = S.rts.hT = 40; await sleep(1500);
  await shot('D:/AI/pm_v6/shots/v66_cam_squad.jpg');
  S.sel.clear(); S.sel.add(b0); rtsLookAt(b0.pos); await sleep(1200);
  await shot('D:/AI/pm_v6/shots/v66_cam_builder.jpg');
  const tk = S.vehicles.find(v => v.team === 0 && v.alive); if (tk){ S.sel.clear(); S.sel.add(tk); rtsLookAt(tk.pos); await sleep(1200); await shot('D:/AI/pm_v6/shots/v66_cam_tank.jpg'); }
  out.info.cam = { ok: CAM66.ok, drawn: CAM66.drawn, ms: +CAM66.ms.toFixed(2), rect: CAM66.rect && [CAM66.rect.left, CAM66.rect.top, CAM66.rect.width, CAM66.rect.height] };
  out.info.voice = { played: VOICE66.played, err: VOICE66.errors, last: VOICE66.lastText };
  out.info.fps = fpsVal;
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); }
return out;
