const out = [];
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(2500);
const me = S.me;
const en = S.units.find(u => u.alive && u.team === 1 && u.cls === 'inf');
const up = norm(me.pos), fw = tangent(me.fwd, up);
for (let i = 0; i < 8; i++){
  en.pos = add(me.pos, mul(fw, 18)); en.vel = [0, 0, 0]; if (en.seen) en.seen[0] = 5;
  me.fwd = norm(sub(centerOf(en), gunEye(me)));
  await sleep(80);
  const eye = gunEye(me), h = AIMA.scan(eye, me.fwd, me.team, 0.9 * PI / 180, 150), h2 = AIMA.scan(eye, me.fwd, me.team, 5 * PI / 180, 150);
  out.push({ inT: TGT[me.team].includes(en), d: +dist(centerOf(en), eye).toFixed(1), los: los(eye, centerOf(en)), h: h && [h.ang, h.rad].map(x => +(x * 180 / PI).toFixed(2)), h2: h2 && (h2.e === en), auto: M67.auto, onT: +M67.onT.toFixed(2), simple: M67.pref.simple, cam: CAMFX.busy(), open: M67.open, hold: !!G62.hold, rl: S.kit.reloadT, ml: mouseL, cls: ctrlEntity() && ctrlEntity().cls, act: M67.active(), mode: S.mode, mo: MENU.isOpen(), p: S.paused });
}
return out;
