// v6.9: скриншоты для Дмитрия — оружие в руках и способности дрона (shots/v69_s*.jpg)
const out = {};
const key = async (code, ms) => { dispatchEvent(new KeyboardEvent('keydown', { code, key: code })); await sleep(ms || 60); dispatchEvent(new KeyboardEvent('keyup', { code, key: code })); };
const hide = () => { const c = $('clicklock'); if (c) c.style.display = 'none'; };
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500);
  DEV.enter(); DEV.cls('assault'); await sleep(1800); hide();
  // 1. автомат: очередь, вспышка, гильзы
  S.kit.w = 'rifle'; S.kit.mag.rifle = 999; mouseL = true; await sleep(700);
  mouseL = false; WPN69.dbgFlash = 0.85; WPN69.st.flashSeed = 0.3; WPN69.st.pend = 2; await sleep(120); await shot('D:/AI/pm_v6/shots/v69_s1_rifle.jpg'); delete WPN69.dbgFlash; await sleep(300);
  // 2. пулемёт: раскалённые стволы после длинной очереди
  S.kit.w = 'hmg'; S.kit.hmgT = 1e9; S.kit.mag.hmg = 999; await sleep(800); mouseL = true; await sleep(5200); mouseL = false; await sleep(450); hide();
  await shot('D:/AI/pm_v6/shots/v69_s2_hmg_hot.jpg'); out.heat = +(WPN69.st.heat.hmg || 0).toFixed(2);
  // 3. дрон: скан местности (кольцо и ромбы на врагах)
  DEV.dummy(); await sleep(300);
  DEV.veh('drone'); await sleep(1800); hide();
  const d = ctrlEntity(), dm = DEV.dummies[0];
  if (dm){ d.aim = norm(sub(add(dm.pos, mul(dm.up, -6)), d.pos)); d.fwd = tangent(d.aim, d.up); }
  await sleep(300); await key(SET.bind.w1); await sleep(450);
  await shot('D:/AI/pm_v6/shots/v69_s3_drone_scan.jpg');
  await key(SET.bind.rocket); await sleep(350); await shot('D:/AI/pm_v6/shots/v69_s3b_drone_rockets.jpg');
  // 4. стратегия: кнопки дрона
  await sleep(1500); enterRTS(); await sleep(900);
  S.sel.clear(); S.selB = null; S.sel.add(d); d.abil = {}; await sleep(1200);
  await shot('D:/AI/pm_v6/shots/v69_s4_drone_rts.jpg');
  out.ok = WPN69.ok(); out.fps = fpsVal;
} catch (e){ out.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
return out;
