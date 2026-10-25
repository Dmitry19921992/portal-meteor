// v6.4: режим разработчика — ресурсы, всё открыто, арсенал, мгновенная стройка; карьера и сохранения не меняются
const out = { errors: [], checks: {} };
const ok = (k, v) => { out.checks[k] = v ? 'OK' : 'FAIL'; if (!v) out.errors.push(k); };
try {
  MENU.toMenu(); await sleep(300);
  const c0 = localStorage.getItem('pm_career'), x0 = PROG.career.xp, k0 = PROG.career.kills;
  const saves0 = SAVE.list().map(s => s.slot + ':' + s.at).join(',');
  ok('menu_button', !!$('m_dev'));
  $('m_dev').click(); await sleep(1200);
  const T = S.teams[0];
  ok('dev_on', DEV.on && DEV.match && $('devLab').style.display === 'flex');
  ok('ore_unlimited', T.ore >= 50000 && T.cmd >= GAME.CMD_MAX);
  ok('all_unlocks', Object.values(UNLOCKS).every(u => PROG.has(u)) && T.jet2 && T.armor === PRODUCTS.armor.max);
  ok('attachments_open', CAREER.attOpen('rifle', 'hammer') && CAREER.attOpen('rail', 'comp'));
  ok('weapons_avail', ['rifle', 'rail', 'hmg'].every(w => weaponAvail(w)));
  ok('vehicles_unlocked', !V2.canProduce(0, 'mlrs'));
  // арсенал
  DEV.panel(true); await sleep(200); ok('arsenal_panel', $('devPan').style.display === 'block' && $('devPan').querySelectorAll('button').length > 15);
  await shot('D:/AI/pm_v6/shots/v64_pc_dev_arsenal.jpg');
  DEV.weapon('rail'); await sleep(200); ok('give_weapon', S.kit.w === 'rail');
  DEV.cls('sniper'); await sleep(400); ok('class_sniper', ctrlEntity() && ctrlEntity().role === 'sniper');
  DEV.veh('mlrs'); await sleep(400); ok('vehicle_mlrs', ctrlEntity() && ctrlEntity().vk === 'mlrs');
  DEV.veh('tank'); await sleep(400); ok('vehicle_tank', ctrlEntity() && ctrlEntity().cls === 'tank' && !ctrlEntity().vk);
  DEV.cls('assault'); await sleep(300);
  DEV.dummy(); const d = DEV.dummies.slice(); await sleep(2000);
  ok('dummies_stand', d.length === 4 && d.every(u => !u.alive || dist(u.pos, u.dPos) < 0.01));
  DEV.panel(false);
  // мгновенная стройка
  enterRTS(); await sleep(300);
  const dir = findSite(0, 'factory'); S.sel.clear(); for (const b of teamBuilders(0)) S.sel.add(b);
  const why = dir ? playerPlace('factory', dir, false) : 'no site'; const site = S.lastSite; await sleep(500);
  ok('instant_build', !why && site && site.done);
  // карьера и сохранения не пишутся
  PROG.award(5000, 'dev'); PROG.saveCareer(); CAREER.dirty = true; CAREER.save();
  ok('career_not_written', localStorage.getItem('pm_career') === c0);
  ok('battle_save_blocked', SAVE.save('m3') === false && SAVE.list().map(s => s.slot + ':' + s.at).join(',') === saves0);
  await shot('D:/AI/pm_v6/shots/v64_pc_dev_rts.jpg');
  MENU.toMenu(); await sleep(300);
  ok('career_restored', !DEV.match && PROG.career.xp === x0 && PROG.career.kills === k0 && localStorage.getItem('pm_career') === c0);
  ok('save_works_again', typeof PROG.saveCareer === 'function' && PROG.saveCareer === DEV.saveCareer0);
  // включение из паузы в обычном матче
  MENU.newGame(); await sleep(400); MENU.pause(); await sleep(200);
  ok('pause_toggle', !!$('m_devtog')); $('m_devtog').click(); await sleep(200);
  ok('pause_dev_on', DEV.on && DEV.match);
  MENU.toMenu(); await sleep(200);
  ok('career_after_pause_dev', PROG.career.xp === x0 && localStorage.getItem('pm_career') === c0);
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
return out;
