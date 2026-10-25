// поставить игрока в точку для скриншота: window.PLACE = {pos, look}
const me = S.me; if (!me) return 'no me';
const P = window.PLACE || { pos: [4, 3, 2], look: [1, 0.1, 0.2] };
for (const k in keys) keys[k] = false; mouseL = mouseR = false;
me.pos = P.pos; me.vel = [0, 0, 0]; me.up = norm(P.pos); me.fwd = norm(P.look); CAMFX.fly = null; S.paused = false;
me.hp = me.maxhp;
await new Promise(r => setTimeout(r, 1500));
return { r: len(me.pos), hint: FPS61.coreHintText(), fps: Math.round(fpsVal) };
