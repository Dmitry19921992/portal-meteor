// v61fps_core.js — игрок в ядре: можно ли выбраться (пробел/ранец/капсула B)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; } catch (e){} await sleep(1000); }
const errs = []; window.onerror = (m) => errs.push(String(m));
const out = {};
if (S.attract || !S.me) { MENU.newGame(); await sleep(2500); }
const me = S.me; CAMFX.fly = null;
const put = (p, look) => { me.pos = p; me.vel = [0, 0, 0]; me.up = norm(p); me.fwd = look ? norm(look) : anyTangent(me.up); me.energy = me.jet.emax; me.locked = false; S.me = me; };
const step = (sec, fn) => { const n = Math.round(sec * 60); let t = 0; for (let i = 0; i < n; i++){ S.me = me; me.hp = me.maxhp; CAMFX.fly = null; if (fn && fn(i / 60) === false) return i / 60; update(1 / 60); } return sec; };
const clr = () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; };
const scen = {};
// A: центр ядра, держим пробел, смотрим «как придётся»
const runA = (name, start, look, keysOn, dur) => {
  clr(); put(start, look); for (const k of keysOn) keys[SET.bind[k]] = true;
  let maxR = len(me.pos), out = -1;
  const t = step(dur, (tt) => { maxR = Math.max(maxR, len(me.pos)); if (!underground(me.pos) && !inShaft(me.pos) && len(me.pos) > RM - 30){ out = tt; return false; } });
  const hint0 = typeof FPS61 !== 'undefined' ? FPS61.coreHintText() : null;
  clr(); step(5);
  scen[name] = { out: out >= 0 ? +out.toFixed(1) : 'STUCK', after5s: { under: underground(me.pos), shaft: inShaft(me.pos), alt: +(len(me.pos) - groundR(norm(me.pos))).toFixed(1), grounded: me.grounded }, maxR: Math.round(maxR), hint: hint0 };
};
clr(); put([3, 2, 1], [0, 1, 0]); step(0.1); out.hintCore = FPS61.coreHintText(); put([200, 0, 0], [1, 0, 0]); step(0.1); out.hintShaft = FPS61.coreHintText();
runA('center_space', [3, 2, 1], [0, 1, 0], ['jump'], 40);
runA('center_space_lookdown', [3, 2, 1], [0, -1, 0], ['jump'], 40);
runA('wall_space', [0, 30, 5], [1, 0, 0], ['jump'], 40);
runA('shaftmouth_space', [40, 0, 0], [0, 1, 0], ['jump'], 40);
runA('shaftmid_space', [200, 0, 0], [1, 0, 0], ['jump'], 40);
runA('center_jet', [3, 2, 1], [1, 0, 0], ['run'], 40);
// B: капсула из ядра
clr(); put([2, 1, 2], [1, 0, 0]); MISSION.podReadyT = 0;
const okB = MISSION.redeploy(false);
step(2.5);
scen.capsuleB = { ret: okB, under: underground(me.pos), r: Math.round(len(me.pos)) };
out.scen = scen; out.errs = errs;
return out;
