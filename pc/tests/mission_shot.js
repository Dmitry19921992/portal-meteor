// mission_shot.js <stage> — готовит сцену для скриншота (сам снимок делает cdp.js --shot следующим вызовом)
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; await sleep(500); }
const stage = window.__STAGE || 'hud';
const hideLock = () => { const el = $('clicklock'); if (el) el.style.display = 'none'; };
if (stage === 'hud'){
  SET.ordersFree = false; SET.solo = false;
  MENU.newGame();
  for (let i = 0; i < 20 * 50; i++) update(0.05);
  const c = ctrlEntity();
  if (!SIDEQ.q) SIDEQ.offer(c);
  S.navT = 30; computeNav();
  await sleep(1500); hideLock();
  return { task: TACT.task && TACT.task.kind, card: TACT.card(), side: SIDEQ.q && SIDEQ.q.kind, nav: MISSION.nav && MISSION.nav.mode, navPts: navPts.length };
}
if (stage === 'track'){ MISSION.cycleTrack(); computeNav(); S.navT = 30; await sleep(1200); hideLock(); return { nav: MISSION.nav && MISSION.nav.mode, navPts: navPts.length }; }
if (stage === 'ask'){ MISSION.showAsk(); await sleep(600); hideLock(); return { toast: $('mtoast').style.display }; }
if (stage === 'free'){ MISSION.answer(true); await sleep(1200); hideLock(); return { card: TACT.card() }; }
if (stage === 'pause'){ MISSION.hideToast(); SET.ordersFree = false; MENU.pause(); await sleep(400); return { menu: MENU.cur }; }
if (stage === 'saves'){ SAVE.save('m1'); MENU.show('saves', true); await sleep(300); const b = document.querySelector('#screen [data-sv^="exp:"]'); if (b) b.click(); await sleep(300); return { rows: document.querySelectorAll('#screen .srow').length }; }
if (stage === 'quit'){ MENU.back(); MENU.show('quit', true); await sleep(300); return { menu: MENU.cur }; }
if (stage === 'resume'){ MENU.back(); MENU.back(); await sleep(400); return { paused: S.paused, waitLock: MENU.waitLock, lock: $('clicklock').style.display }; }
return 'unknown stage';
