// v6.5: крупные планы поз (игра на паузе, поза задаётся вручную)
const out = { shots: [] };
const P = n => { const p = 'D:/AI/pm_v6/shots/v65c_' + n + '.jpg'; out.shots.push(p); return p; };
const A = window.__v65args || {};
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(400);
for (const el of document.body.children) if (el.id !== 'c') el.style.visibility = 'hidden';
S.freecam = true; S.paused = false; MENU.waitLock = false;
for (let i = 0; i < 60; i++) update(0.05);
const h = S.units.find(u => HV65.is(u) && u.alive && u.grounded) || S.units.find(u => HV65.is(u));
S.paused = true;
const st = HV65.state(h);
const views = A.views || [['f', 1.9, 0.8, 0.25], ['s', 0.2, 2.0, 0.2], ['b', -1.8, -0.9, 0.4]];
const poses = A.poses || [['idle', 0, 0.8], ['walk', 0.3, 0.65], ['run', 0.2, 0], ['shoot', 1.0, 0], ['idlefire', 0.5, 1]];
for (const [pw, t, uw] of poses){
  st.force = { want: pw === 'idlefire' ? 'idle' : pw, sp: 0, uw }; st.layers = []; st.want = ''; st.uw = uw; st.ut = HV65.M.tRef;
  HV65.animate(h, st, 0); st.layers[0].t = t * st.layers[0].clip.dur; st.posed = false;
  for (const [vn, back, side, hh] of views){
    const f = tangent(h.fwd, h.up), r = norm(cross(f, h.up)), look = add(sub(h.pos, mul(h.up, 0.5)), mul(h.up, 1.1));
    S.camOverride = { pos: add(add(look, mul(f, back)), add(mul(r, side), mul(h.up, hh))), look };
    await sleep(350); await shot(P(pw + '_' + vn));
  }
}
st.force = null; S.camOverride = null; S.paused = false;
return out;
