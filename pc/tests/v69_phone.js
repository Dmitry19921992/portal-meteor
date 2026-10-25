// v6.9: телефон — кнопки новых способностей дрона и техники в контекстной зоне (настоящие касания CDP). node cdp69.js v69_phone.js --phone --reload
const R = { vp: innerWidth + 'x' + innerHeight }, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 10 && r.height > 10 && cs.display !== 'none' && cs.visibility !== 'hidden' && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1; };
const btnK = k => [...document.querySelectorAll('#touch .tf.fps > button')].find(b => M67.keyOf(b) === k);
const tapEl = async el => { const r = el.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2, 70); await sleep(150); };
try {
  ok('m67', TOUCH.on && M67.active());
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500);
  DEV.enter(); await sleep(300);
  // пехота: новых кнопок не видно, раскладка прежняя
  M67.sig = ''; await sleep(600);
  const m69 = [...document.querySelectorAll('#touch .m69b')];
  ok('inf_no_new_buttons', m69.length === 2 && m69.every(b => !vis(b)), m69.map(b => vis(b)));
  // дрон
  DEV.veh('drone'); await sleep(1800);
  const d = ctrlEntity(); ok('drone', d && d.cls === 'drone');
  const bs = btnK('d69scan'), br = btnK('rocket'), bg = btnK('grenade');
  ok('drone_buttons_visible', vis(bs) && vis(br) && vis(bg), [vis(bs), vis(br), vis(bg)]);
  ok('drone_labels', /Скан|Scan/.test(bs.textContent) && /Ракеты|Rockets/.test(br.textContent) && /Ремонт|Repair/.test(bg.textContent), [bs.textContent, br.textContent, bg.textContent]);
  // кнопки не перекрывают друг друга и огонь
  const all = [...document.querySelectorAll('#touch .tf.fps > button[data-s]')].filter(vis).map(b => [M67.keyOf(b) || b.dataset.t, b.getBoundingClientRect()]);
  const ov = []; for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++){ const a = all[i][1], b = all[j][1]; if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) ov.push(all[i][0] + '/' + all[j][0]); }
  ok('no_overlap', !ov.length, ov);
  await shot(`D:/AI/pm_v6/shots/v69_phone_${innerWidth}_drone.jpg`);
  const ns = S.scans.length; await tapEl(bs); ok('tap_scan', S.scans.length === ns + 1);
  await tapEl(br); await sleep(900); ok('tap_rockets', abilLeft(d, 'drocket') > 0);
  await tapEl(bg); ok('tap_repair', d.v69rep > S.time);
  // танк
  DEV.veh('tank'); await sleep(1800);
  const tk = ctrlEntity(); tk.hp = tk.maxhp * 0.4;
  const bk2 = btnK('v69rep');
  ok('tank_button', vis(bk2) && /Ремкомплект|Repair/.test(bk2.textContent), bk2 && bk2.textContent);
  await tapEl(bk2); ok('tap_repkit', tk.v69kit > S.time);
  const boost = btnK('grenade'); ok('tank_boost_label', /Форсаж|Boost/.test(boost.textContent), boost.textContent);
  await shot(`D:/AI/pm_v6/shots/v69_phone_${innerWidth}_tank.jpg`);
  // обратно в пехоту: кнопки скрыты
  DEV.cls('assault'); await sleep(1500);
  ok('inf_again', m69.every(b => !vis(b)) && vis(btnK('grenade')));
  R.fps = fpsVal;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
