const me = S.me; CAMFX.fly = null;
const put = (p, look) => { me.pos = p; me.vel = [0, 0, 0]; me.up = norm(p); me.fwd = look ? norm(look) : anyTangent(me.up); me.energy = me.jet.emax; me.locked = false; S.me = me; };
const clr = () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; };
clr(); put([440, 0, 0], [0, 1, 0]); keys[SET.bind.jump] = true;
const L = [];
for (let i = 0; i < 60 * 9; i++){
  S.me = me; me.hp = me.maxhp; CAMFX.fly = null;
  if (i === 60 * 4) clr();
  update(1 / 60);
  if (i % 20 === 0){ const ax = bestAxis(norm(me.pos)); const off = len(sub(me.pos, mul(ax, dot(me.pos, ax)))); L.push([+(i / 60).toFixed(1), Math.round(len(me.pos)), +off.toFixed(1), Math.round(groundR(norm(me.pos))), +dot(me.vel, norm(me.pos)).toFixed(1), me.exitHop ? 1 : 0, me.lifting ? 1 : 0]); }
}
return { gr0: groundR([1, 0, 0]), gr1: groundR(norm([1, 0.05, 0])), L };
