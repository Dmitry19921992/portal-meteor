// v7.4 телефон: стики, 👁, простая стратегия, вселение без техники, пушка на машине
SET.lang = 'ru'; applySettings(); MENU.applyLang();
MENU.newGame(); await sleep(4500);
ok('m73act', M73.act()); ok('possVehOffPhone', SET.possVeh === false);
// стики
await T.down(1, W * 0.75, H * 0.5); for (let i = 1; i < 8; i++){ await sleep(30); await T.move(1, W * 0.75 + i * 8, H * 0.5); }
await sleep(200); ok('modeR', M74.mode === 'R' && mouseR === true, [M74.mode, mouseR]);
await shot('D:/AI/pm_v6/shots/v74_ph_R.jpg');
await T.down(2, W * 0.2, H * 0.7); for (let i = 1; i < 6; i++){ await sleep(30); await T.move(2, W * 0.2 + i * 6, H * 0.7 - i * 6); await T.move(1, W * 0.75 + 60 + i * 5, H * 0.5); }
await sleep(150); ok('modeLR', M74.mode === 'LR' && mouseR === false, [M74.mode, mouseR]);
await T.up(1); await sleep(900); ok('modeL', M74.mode === 'L', M74.mode);
await T.up(2); await sleep(500);
// 👁
const eye = cen('#m74eye'); ok('eyeBtn', !!eye);
if (eye){ await T.tap(eye[0], eye[1]); await sleep(300); ok('nohud', document.body.classList.contains('m74nh')); await shot('D:/AI/pm_v6/shots/v74_ph_nohud.jpg'); await T.tap(eye[0], eye[1]); await sleep(300); ok('hudBack', !document.body.classList.contains('m74nh')); }
// вселение: в технику нельзя
const v = S.vehicles.find(x => x.alive && x.team === 0);
ok('hasVeh', !!v);
if (v){ takeControl(v); await sleep(300); ok('noVehPossess', ctrlEntity() !== v && ctrlEntity().cls === 'inf', ctrlEntity() && ctrlEntity().cls);
  ok('candsNoVeh', !switchCandidates().some(o => o.e.cls === 'tank'));
  const me = S.me; me.pos = add(v.pos, mul(norm(cross(v.fwd, norm(v.pos))), 4)); await sleep(100);
  const h = nearbyInteract(me); ok('seatHint', !!(h && h.seat), h && h.text);
  interact(); await sleep(1500); ok('mounted', !!V74.seat && dist(S.me.pos, v.pos) < 6 && S.kit.w === 'hmg', [!!V74.seat, dist(S.me.pos, v.pos), S.kit.w]);
  await shot('D:/AI/pm_v6/shots/v74_ph_seat.jpg');
  interact(); await sleep(400); ok('unmounted', !V74.seat && S.kit.w !== 'hmg');
}
// простая стратегия
enterRTS(); await sleep(1500);
ok('simple', M74.simple() && document.body.classList.contains('m74s'));
await shot('D:/AI/pm_v6/shots/v74_ph_rts.jpg');
const cards = [...document.querySelectorAll('#m74L .c')]; ok('cards', cards.length >= 2, cards.length);
const hqc = cards.find(c => /Штаб/.test(c.textContent));
if (hqc){ const r = hqc.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); await sleep(700); ok('hqSel', M74.sel === S.hq[0], M74.sel && M74.sel.cls);
  const items = [...document.querySelectorAll('#m74B .it')]; ok('hqItems', items.length >= 3, items.length);
  await shot('D:/AI/pm_v6/shots/v74_ph_rts_hq.jpg');
  const sqb = items.find(i => /Штурмовой/.test(i.textContent));
  const q0 = countQueued(0, ['squad']);
  if (sqb){ const r2 = sqb.getBoundingClientRect(); await T.tap(r2.left + r2.width / 2, r2.top + r2.height / 2); await sleep(400); ok('produce', countQueued(0, ['squad']) > q0, [q0, countQueued(0, ['squad'])]); }
}
const ec = document.querySelector('#m74L .c'); if (ec){ const r = ec.getBoundingClientRect(); await T.tap(r.left + 30, r.top + r.height / 2); await sleep(600); }
ok('engSel', M74.sel && M74.sel.cls === 'builder');
const bi = [...document.querySelectorAll('#m74B .it')].find(i => /Турель/.test(i.textContent));
if (bi){ const r = bi.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); await sleep(500); ok('placeMode', S.place === 'turret', S.place); await T.tap(W * 0.55, H * 0.45); await sleep(500); await shot('D:/AI/pm_v6/shots/v74_ph_place.jpg');
  const vis = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 4 && getComputedStyle(b).display !== 'none' && /Строить|Build/.test(b.textContent); }).map(b => (b.id || b.className) + ':' + b.textContent.trim().slice(0, 20));
  R.buildBtns = vis; }
// тап по своему отряду в простой стратегии ничего не выделяет
const sq = S.squads.find(g => g.team === 0 && groupAlive(g)), lp = sq && scr(leaderPos(sq));
if (lp){ M71.rtsTap(lp[0], lp[1]); await sleep(200); ok('noSquadSel', !selGroups().some(g => g === sq)); }
const go = cen('#m74go'); if (go){ await T.tap(go[0], go[1]); await sleep(1200); ok('toBattle', S.mode === 'fps'); }
ok('no_console_errors', errs.length === 0, errs.slice(0, 4));
return R;
