// v62gren: стоимость дуги в реальной игре (кадры идут, мышь всё время двигается): мс на кадр, FPS
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && (MENU.cur || !S.attract)) break; } catch (e) {} await sleep(500); }
if (!S.me || S.attract || S.over){ MENU.newGame(); await sleep(3000); }
if (MENU.isOpen()) MENU.close();
S.paused = false; PROG.unl.add('grenade'); CAMFX.fly = null;
const me = S.me, B = SET.bind; me.hp = me.maxhp = 99999;
// разогрев JIT
G62.hold = { u: me, t0: S.rtime, power: 1, under: false }; for (let i = 0; i < 100; i++) G62.predict(me, true); G62.cancel();
const res = {};
for (const [name, pitch] of [['down', -0.3], ['flat', -0.05], ['up', 0.3]]){
  const Up = norm(me.pos), hz = tangent(me.fwd, Up);
  me.fwd = norm(add(mul(hz, Math.cos(pitch)), mul(Up, Math.sin(pitch))));
  S.kit.gren = 2; keys[B.grenade] = true; G62.press();
  Object.assign(G62.perf, { n: 0, ms: 0, max: 0, hf: 0 });
  let frames = 0; const t0 = performance.now();
  await new Promise(r => { const f = () => { frames++; lookBy(4, 0); if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  const P = G62.perf;
  res[name] = { fps: +(frames / 3).toFixed(1), framesWithArc: P.hf, recomputes: P.n, msPerFrame: +(P.ms / Math.max(1, P.hf)).toFixed(3), msPerPredict: +(P.ms / Math.max(1, P.n)).toFixed(3), maxMs: +P.max.toFixed(2), hold: !!G62.hold };
  keys[B.grenade] = false; G62.cancel(); await sleep(200);
}
// без гранаты — FPS для сравнения
{ let frames = 0; const t0 = performance.now(); await new Promise(r => { const f = () => { frames++; lookBy(4, 0); if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); res.noGrenadeFps = +(frames / 3).toFixed(1); }
return res;
