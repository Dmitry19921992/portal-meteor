// v6.2: скриншоты кристаллов жил и экстрактора (шутер вблизи + стратегия сверху)
// node rtsui_cdp62.js v62_minshot.js --vp 1280x720 --reload   (папка вывода — window.MSHOT_DIR или D:\AI\pm_v6\tests\shots62)
const dir = window.MSHOT_DIR || 'D:\\AI\\pm_v6\\tests\\shots62\\';
const tag = window.MSHOT_TAG || 'a';
if (!document.getElementById('nolock')){ const st = document.createElement('style'); st.id = 'nolock'; st.textContent = '#clicklock{display:none !important}'; document.head.appendChild(st); }
MENU.newGame(); await sleep(3000); if (TUT.on) TUT.finish(); MENU.close && MENU.close();
const V = veins();
const vb = V.filter(v => v.kind === 'base' && v.ref === 0);
const vFree = vb[0], vExt = vb[1];
const vFoe = V.find(v => v.kind === 'free') || V[V.length - 1];
for (const b of S.buildings.filter(b => b.type === 'extractor')) b.alive = false;
const mk = (v, team) => { const t1 = anyTangent(v.dir); const b = makeBuilding('extractor', team, v.dir, t1); b.vein = v.i; b.built = 1; b.done = true; b.hp = b.maxhp; b.seen = [9, 9]; b.known0 = true; return b; };
const e0 = mk(vExt, 0), e1 = mk(vFoe, 1);
BLD_LIST = S.buildings; bgridDirty();
const res = { veins: V.length, free: vFree.i, ext: vExt.i, foe: vFoe.i };
const camAt = (v, dist, h, ang, lookH) => {
  const up = norm(v.pos), t1 = anyTangent(up), t2 = cross(up, t1);
  const off = add(mul(t1, cos(ang) * dist), mul(t2, sin(ang) * dist));
  const gp = surfacePoint(norm(add(v.pos, off)), 0);
  const pos = add(gp, mul(up, h));
  return { pos, look: add(v.pos, mul(up, lookH)) };
};
// чистый кадр: прячем интерфейс и оружие в руках
if (window.MSHOT_CLEAN !== false && !document.getElementById('cleanshot')){ const st = document.createElement('style'); st.id = 'cleanshot'; st.textContent = 'body > *:not(#c){visibility:hidden !important}'; document.head.appendChild(st); }
S.third = true;
S.paused = false;
// шутер: камера на высоте глаз
S.mode = 'fps';
for (const [name, v, d, h, a, lh] of [['fps_crystals', vFree, 9, 1.7, 0.6, 0.8], ['fps_crystals2', vFree, 8, 1.2, 3.4, 1.0], ['fps_crystals_far', vFree, 22, 1.8, 2.2, 1.0], ['fps_extractor', vExt, 15, 1.8, 0.9, 3.6], ['fps_extractor_foe', vFoe, 15, 1.8, 0.4, 3.6]]){
  S.camOverride = camAt(v, d, h, a, lh);
  await sleep(900);
  await shot(dir + tag + '_' + name + '.jpg');
}
S.camOverride = null;
// стратегия сверху
enterRTS(); await sleep(600);
for (const [name, v, h] of [['rts_veins', vExt, 55], ['rts_veins_high', vExt, 140], ['rts_close', vFree, 22]]){
  S.rts.dir = norm(v.pos); S.rts.h = h; S.rts.fwd = tangent(sub(BASES[0], v.pos), S.rts.dir);
  await sleep(1200);
  await shot(dir + tag + '_' + name + '.jpg');
}
res.fps = Math.round(fpsVal);
return res;
