// v6.5: камера рядом с тяжёлым бойцом — скриншоты модели в бою
const out = { shots: [] };
const P = n => { const p = 'D:/AI/pm_v6/shots/v65_' + n + '.jpg'; out.shots.push(p); return p; };
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(600);
out.mode = S.mode; out.me = S.me && S.me.role;
// перемотка боя, чтобы были движение и стрельба
for (let i = 0; i < 200; i++) update(0.05);
const H = S.units.filter(u => HV65.is(u));
out.heavies = H.length;
const h = H.find(u => u.grounded) || H[0];
if (!h) return out;
const view = (u, back, side, hgt) => {
  const f = tangent(u.fwd, u.up), r = norm(cross(f, u.up));
  const look = add(u.pos, mul(u.up, 0.4));
  S.camOverride = { pos: add(add(look, mul(f, back)), add(mul(r, side), mul(u.up, hgt))), look };
};
S.mode = 'fps';
view(h, 3.2, 1.2, 0.5); await sleep(700); await shot(P('front'));
out.st1 = { want: HV65.state(h).want, hs: HV65.state(h).hs, stats: { ...HV65.stats } };
view(h, -3, 2, 0.8); await sleep(700); await shot(P('back'));
view(h, 1.5, 3.5, 0.3); await sleep(500); await shot(P('side'));
out.st2 = { want: HV65.state(h).want, hs: HV65.state(h).hs, uw: HV65.state(h).uw, stats: { ...HV65.stats } };
S.camOverride = null;
out.fps = fpsVal;
return out;
