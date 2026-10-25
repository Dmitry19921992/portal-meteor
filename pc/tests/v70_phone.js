// v7.0 на телефоне: «Вселение» в меню ☰ (настоящие касания), карточка после гибели, карточки форпоста и штаба.
// node cdp70.js v70_phone.js --phone --reload   (также --android, --phone2)
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const rect = el => el.getBoundingClientRect();
const inVP = r => r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
const tapEl = async el => { el.scrollIntoView({ block: 'center' }); await sleep(120); const r = rect(el); await T.tap(r.left + r.width / 2, r.top + r.height / 2, 70); await sleep(200); };
const overlap = els => { const rs = els.map(rect); for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++){ const a = rs[i], b = rs[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return [i, j]; } return null; };
try {
  try { localStorage.removeItem('pm_prio70'); } catch (e){}
  PRIO70.on = false; PRIO70.rank = {}; PRIO70.never = {}; PRIO70.fix();
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1800);
  ok('touch_on', TOUCH.on && M67.active());
  M67.toggleSheet(true); await sleep(400);
  let sec = document.querySelector('#m67sheet .p70sec');
  ok('sheet_section', !!sec && sec.querySelectorAll('.p70c').length === P70_CLS.length);
  await tapEl(sec.querySelector('[data-p70="tog"]'));
  sec = document.querySelector('#m67sheet .p70sec');
  ok('tap_toggle_on', PRIO70.on && sec.querySelector('.p70w.on') && new Set(P70_CLS.map(c => PRIO70.rank[c])).size === P70_CLS.length);
  const btns = [...sec.querySelectorAll('button')];
  const small = btns.filter(b => { const r = rect(b); return r.height < 40 || r.width < 34; }).map(b => b.dataset.p70 + ':' + Math.round(rect(b).width) + 'x' + Math.round(rect(b).height));
  ok('touch_targets', small.length === 0, small.slice(0, 6));
  ok('no_overlap', !overlap(btns), overlap(btns));
  { const o = PRIO70.order(), c3 = o[2], c2 = o[1];
    await tapEl(document.querySelector(`#m67sheet [data-p70="up"][data-c="${c3}"]`));
    ok('tap_up', PRIO70.rank[c3] === 2 && PRIO70.rank[c2] === 3, [PRIO70.rank[c3], PRIO70.rank[c2]]); }
  await tapEl(document.querySelector('#m67sheet [data-p70="top"][data-c="raider"]'));
  ok('tap_top', PRIO70.rank.raider === 1);
  await tapEl(document.querySelector('#m67sheet [data-p70="nv"][data-c="drone"]'));
  ok('tap_never', !!PRIO70.never.drone && !!document.querySelector('#m67sheet .p70c.nv'));
  ok('sheet_open', M67.open);
  document.querySelector('#m67sheet .p70sec').scrollIntoView({ block: 'start' }); await sleep(200);
  await shot('D:/AI/pm_v6/shots/v70_prio_phone' + (innerWidth < 900 ? '2' : innerWidth < 920 ? 'a' : '') + '.jpg');
  M67.toggleSheet(false); await sleep(300);
  // гибель → рейдер (№1), карточка с номерами
  { const m = ctrlEntity(); destroy(m, null); await sleep(800); ok('phone_pick', PRIO70.clsOf(ctrlEntity()) === 'raider', PRIO70.clsOf(ctrlEntity()));
    const dc = $('dcard'); ok('phone_card', dc && dc.style.display !== 'none' && !!dc.querySelector('.p70chips') && inVP(rect(dc)), dc && rect(dc)); }
  await sleep(4500);
  // стратегия: форпост и штаб
  DEV.enter(); await sleep(200); DEV.on = false; S.teams[0].ore = 5000;
  DEV.outpost70('def'); const op = DEV.op70; op.tw70.br = null; op.tw70.tier = 0;
  const e = makeBuilder(0, surfacePoint(norm(add(op.pos, mul(op.fwd, op.rad + 4))), ECO.HOVER)); e.manualUntil = 1e9; e.byPlayer = true; e.auto66 = false;
  enterRTS(); await sleep(500); S.sel.clear(); S.selB = op; flyCamTo(op.pos); await sleep(1200);
  const bb = [...document.querySelectorAll('#card [data-v70^="br:"]')];
  ok('phone_op_card', bb.length === 3 && bb.every(b => inVP(rect(b)) && rect(b).height >= 50), bb.map(b => rect(b)).map(r => [Math.round(r.top), Math.round(r.bottom), Math.round(r.height)]));
  await shot('D:/AI/pm_v6/shots/v70_op_card_phone' + (innerWidth < 900 ? '2' : innerWidth < 920 ? 'a' : '') + '.jpg');
  if (bb[1]) await tapEl(bb[1]);
  ok('phone_op_tap', op.tw70.br === 'sup' && !!op.tw70.job, op.tw70);
  S.sel.clear(); S.selB = S.hq[0]; flyCamTo(S.hq[0].pos); await sleep(1200);
  const hb = [...document.querySelectorAll('#card [data-v70^="hq:"]')];
  ok('phone_hq_card', hb.length === 6 && hb.every(b => inVP(rect(b))), hb.map(b => rect(b)).map(r => [Math.round(r.top), Math.round(r.bottom)]));
  if (hb[0]) await tapEl(hb[0]);
  ok('phone_hq_tap', !!BASE70.hqu(0).job);
  await shot('D:/AI/pm_v6/shots/v70_hq_card_phone' + (innerWidth < 900 ? '2' : innerWidth < 920 ? 'a' : '') + '.jpg');
  PRIO70.setOn(false);
  R.fps = Math.round(fpsVal);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
