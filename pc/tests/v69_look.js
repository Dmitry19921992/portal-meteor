// v6.9: осмотр нового оружия в руках (shots/v69_w_*.jpg)
const out = { w: {} };
try {
  MENU.newGame(); if (TUT.on) TUT.finish();
  await sleep(1500); DEV.enter(); DEV.cls('assault'); await sleep(1500);
  const me = S.me; out.cls = me && me.cls;
  const W = (typeof __W !== 'undefined' ? __W : ['rifle', 'smg', 'hmg', 'rail']);
  for (const w of W){
    S.kit.w = w; S.kit.mag[w] = WEAPONS[w].mag; S.kit.reloadT = 0; if (w === 'hmg') S.kit.hmgT = 1e9;
    await sleep(900);
    await shot(`D:/AI/pm_v6/shots/v69_w_${w}_hip.jpg`);
    mouseR = true; await sleep(700); await shot(`D:/AI/pm_v6/shots/v69_w_${w}_ads.jpg`); mouseR = false; await sleep(400);
    mouseL = true; await sleep(w === 'hmg' ? 1100 : 450); await shot(`D:/AI/pm_v6/shots/v69_w_${w}_fire.jpg`);
    await sleep(w === 'rail' ? 1500 : 1500); mouseL = false; await sleep(250);
    await shot(`D:/AI/pm_v6/shots/v69_w_${w}_hot.jpg`);
    S.kit.reloadT = 0; startReload(); await sleep(WEAPONS[w].reload * 450); await shot(`D:/AI/pm_v6/shots/v69_w_${w}_reload.jpg`);
    await sleep(WEAPONS[w].reload * 700);
    out.w[w] = { heat: +(WPN69.st.heat[w] || 0).toFixed(2), ms: +WPN69.stats.ms.toFixed(2) };
  }
  // ракета и граната
  S.kit.w = 'rifle'; S.me.rocketCd = 0; fireRocket(S.me, S.me.fwd); await sleep(60); await shot(`D:/AI/pm_v6/shots/v69_w_rocket.jpg`);
  await sleep(1200);
  if (typeof G62 !== 'undefined'){ S.kit.gren = 2; const gc = SET.bind.grenade; dispatchEvent(new KeyboardEvent('keydown', { code: gc, key: gc })); await sleep(700); await shot(`D:/AI/pm_v6/shots/v69_w_grenade.jpg`); dispatchEvent(new KeyboardEvent('keyup', { code: gc, key: gc })); await sleep(90); await shot(`D:/AI/pm_v6/shots/v69_w_grenade_throw.jpg`); }
  DEV.cls('heavy'); await sleep(1500); S.third = true; S.kit.w = 'hmg'; await sleep(900); await shot(`D:/AI/pm_v6/shots/v69_w_third.jpg`); S.third = false;
  out.ok = WPN69.ok(); out.err = WPN69.err; out.tris = WPN69.stats.tris; out.fps = fpsVal; out.hv = HV65.ok;
} catch (e){ out.err2 = e.message + ' ' + (e.stack || '').split('\n')[1]; }
return out;
