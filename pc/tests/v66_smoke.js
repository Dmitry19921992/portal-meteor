// v6.6 smoke: загрузка, стратегия, штаб, поля, портрет
const out = { errors: [], info: {} };
try {
  out.info.title = document.title; out.info.fields = fields66().length; out.info.props = PROPS.length;
  out.info.hqProds = v64Prods(S.hq[0]);
  MENU.newGame(); await sleep(400); if (TUT.on) TUT.finish();
  for (let i = 0; i < 40; i++) update(0.05);
  enterRTS(); await sleep(800);
  out.info.auto = groupsOf(0).map(g => g.auto66);
  // выделить инженера и послать на кристаллы
  const b = teamBuilders(0)[0]; S.sel.clear(); S.sel.add(b);
  const f = g66NearestField(0, b.pos); out.info.field = f && { i: f.i, d: Math.round(surfDist(f.pos, b.pos)), amount: f.amount };
  g66Start(b, f, true);
  const ore0 = S.teams[0].ore;
  for (let i = 0; i < 600; i++) update(0.05);
  out.info.gathered = S.teams[0].g66tot || 0; out.info.cargo = b.cargo; out.info.order = b.order; out.info.oreDelta = Math.round(S.teams[0].ore - ore0);
  // выделенный отряд — портрет
  const sq = S.squads.find(s => s.team === 0); S.sel.clear(); S.sel.add(sq); flyCamTo(leaderPos(sq));
  await sleep(1500);
  out.info.cam = { ok: CAM66.ok, failed: CAM66.failed, drawn: CAM66.drawn, ms: +CAM66.ms.toFixed(2), disp: CAM66.el && CAM66.el.style.display };
  out.info.voice = { played: VOICE66.played, err: VOICE66.errors, has: VOICE66.has('squad', 'sel') };
  out.info.cur = CUR.cur && CUR.cur.s.id;
  await shot('D:/AI/pm_v6/shots/v66_smoke1.jpg');
  out.info.fps = fpsVal;
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); }
return out;
