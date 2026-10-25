// v6.5: игрок в теле тяжёлого бойца — 1-е лицо (своя модель скрыта), 3-е лицо (видна), стратегия; FPS
const out = { shots: [] };
const P = n => { const p = 'D:/AI/pm_v6/shots/v65f_' + n + '.jpg'; out.shots.push(p); return p; };
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(500);
S.paused = false; MENU.waitLock = false;
const cl = document.getElementById('clicklock'); if (cl) cl.style.display = 'none';
const h = S.units.find(u => HV65.is(u) && u.alive);
takeControl(h); await sleep(300);
S.paused = false; MENU.waitLock = false;
out.me = S.me && S.me.role; out.mode = S.mode;
await sleep(1200);
out.fp = { ...HV65.stats, meDrawn: HV65.list.some(o => o.e === S.me) };
await shot(P('first'));
S.third = true; await sleep(1200);
out.tp = { ...HV65.stats, meDrawn: HV65.list.some(o => o.e === S.me), want: HV65.state(h).want };
await shot(P('third'));
// стрельба в 3-м лице
for (let i = 0; i < 30; i++){ HV65.state(h).shot = S.time; await sleep(30); }
out.tpFire = HV65.state(h).want + ' uw' + HV65.state(h).uw.toFixed(2);
await shot(P('third_fire'));
S.third = false;
// замер FPS: 4 с в шутере
const fpsN = async ms => { let n = 0; const t0 = performance.now(); await new Promise(r => { const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); return +(n * 1000 / (performance.now() - t0)).toFixed(1); };
out.fpsFP = await fpsN(4000); out.scaleFP = S.scale;
enterRTS(); await sleep(1500);
out.fpsRTS = await fpsN(4000); out.rts = { ...HV65.stats }; out.scaleRTS = S.scale;
await shot(P('rts'));
out.err = HV65.err; out.ok = HV65.ok;
return out;
