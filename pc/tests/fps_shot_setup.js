// подготовка кадра: бой, враги перед игроком, огонь (mode: fire | ads | xfer | rail)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur !== undefined && (MENU.cur || S.me)) break; } catch (e){} await sleep(1000); }
if (!document.getElementById('nolock')){ const st = document.createElement('style'); st.id = 'nolock'; st.textContent = '#clicklock{display:none !important}'; document.head.appendChild(st); }
const mode = window.SHOTMODE || 'fire';
if (S.attract || !S.me){ MENU.newGame(); await sleep(3500); }
MENU.close && MENU.close();
const me = S.me;
mouseL = false; mouseR = false;
if (mode === 'xfer'){
  switchUnit(1); await sleep(350); if (CAMFX.fly){ CAMFX.fly.dur = 5; CAMFX.fly.t = 1.2; } await sleep(200);
  return { xfer: S.xfer, busy: CAMFX.busy(), to: GUNS.xferTo && GUNS.xferTo.role };
}
if (me.cls !== 'inf') return 'not inf';
const Up = norm(me.pos), F = tangent(me.fwd, Up);
// враги в 22 м
if (!window._tg || !window._tg.alive){
  const sq = spawnSquad(1, false, add(me.pos, mul(F, 22)), 3, ['assault', 'heavy', 'assault']);
  for (const u of sq.units){ u.parked = true; u.hp = u.maxhp = 400; }
  window._tg = sq.units[0];
  makeDrone(add(add(me.pos, mul(F, 30)), add(mul(Up, 10), mul(norm(cross(F, Up)), 6))), 1);
}
const tg = window._tg;
me.fwd = norm(sub(add(tg.pos, mul(tg.up, 0.35)), add(me.pos, mul(me.up, RULES.EYE))));
me.hp = me.maxhp = 5000;
if (mode === 'rail'){ PROG.unl.add('rail'); S.kit.w = 'rail'; S.kit.mag.rail = 5; }
else if (S.kit.w === 'rail') S.kit.w = 'rifle';
if (mode === 'ads' || mode === 'rail'){ mouseR = true; await sleep(400); }
mouseL = true;
await sleep(mode === 'rail' ? 380 : 260);
return { w: S.kit.w, mag: S.kit.mag[S.kit.w], aimK: S.aimK, tracers: TRACERS.filter(t => t.on).length, fps: Math.round(fpsVal) };
