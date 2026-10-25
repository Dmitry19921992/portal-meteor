// v6.5: галерея состояний 3D-модели тяжёлого бойца (камера следует за бойцом, HUD скрыт)
const out = { shots: [], st: [] };
const P = n => { const p = 'D:/AI/pm_v6/shots/v65g_' + n + '.jpg'; out.shots.push(p); return p; };
const A = window.__v65args || {};
MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(400);
S.paused = false; MENU.waitLock = false;
const hide = on => { for (const el of document.body.children) if (el.id !== 'c') el.style.visibility = on ? 'hidden' : ''; };
hide(true); S.freecam = true;
for (let k = 0; k < (A.warm || 30); k++){ for (let i = 0; i < 40; i++) update(0.05); await sleep(10); }
S.paused = false;
let tgt = null, cam = { back: 3.4, side: 1.4, h: 0.6 };
const follow = () => {
  if (tgt){
    const u = tgt, f = tangent(u.fwd, u.up), r = norm(cross(f, u.up)), look = add(sub(u.pos, mul(u.up, 0.5)), mul(u.up, 1.0));
    S.camOverride = { pos: add(add(look, mul(f, cam.back)), add(mul(r, cam.side), mul(u.up, cam.h))), look };
  }
  if (!window.__v65stop) requestAnimationFrame(follow);
};
window.__v65stop = false; follow();
const H = () => S.units.filter(u => HV65.is(u) && u.alive);
const rec = (tag, u) => { const s = HV65.state(u); out.st.push({ tag, want: s.want, hs: +s.hs.toFixed(2), uw: +s.uw.toFixed(2), air: !u.grounded, fire: S.time - s.shot < 0.45, pitch: +s.pitch.toFixed(2), stats: { ...HV65.stats }, fps: +fpsVal.toFixed(1) }); };
const hs = H(); out.n = hs.length;
for (let i = 0; i < Math.min(3, hs.length); i++){
  tgt = hs[i]; cam = { back: 3.2, side: 1.3 * (i % 2 ? -1 : 1), h: 0.5 };
  await sleep(900); rec('u' + i, tgt); await shot(P('u' + i));
}
// поиск стреляющего
for (let k = 0; k < 40; k++){
  const f = H().find(u => S.time - HV65.state(u).shot < 0.3);
  if (f){ tgt = f; await sleep(250); rec('fire', f); await shot(P('fire')); break; }
  await sleep(250);
}
// смерть
const v = H()[0];
if (v){
  tgt = v; cam = { back: 3.5, side: 2.0, h: 1.0 }; await sleep(500);
  damage(v, 99999, null); await sleep(500); rec('die05', v); await shot(P('die05'));
  await sleep(1700); rec('die22', v); await shot(P('die22'));
}
// стратегия
tgt = null; S.camOverride = null; window.__v65stop = true;
enterRTS(); const h2 = H()[0]; if (h2 && typeof rtsLookAt === 'function') rtsLookAt(h2.pos);
await sleep(1800); await shot(P('rts'));
out.rtsStats = { ...HV65.stats };
hide(false);
return out;
