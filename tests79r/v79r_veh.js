// cockpit filter check: no vehicles at match start -> mock ctrlEntity synchronously (only R79.step sees it), filter params read after AudioParam settles
const R = {};
const errs = []; addEventListener('error', e => errs.push(e.message));
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (typeof FEEL76 !== 'undefined' && FEEL76.intro) FEEL76.introEnd(true);
R79.play(); await sleep(4000); R.st = R79.st;
const ce0 = window.ctrlEntity, me1 = S.me, fake = { cls: 'tank', alive: true, pos: me1.pos };
const inVeh = on => { window.ctrlEntity = on ? () => fake : ce0; try { R79.step(0.016); } finally { window.ctrlEntity = ce0; } };
inVeh(true);
R.cockpit = { veh: R79.veh, label: (R79.sig = '', R79.render(), (document.querySelector('#r79 .hd em') || {}).textContent) };
await sleep(40); R.cockpit.lp = Math.round(R79.lp.frequency.value); R.cockpit.hp = Math.round(R79.hp.frequency.value);
await sleep(1500);
R.after = { veh: R79.veh, lp: Math.round(R79.lp.frequency.value), hp: Math.round(R79.hp.frequency.value) };
R79.stop(true); R.errs = errs;
return R;
