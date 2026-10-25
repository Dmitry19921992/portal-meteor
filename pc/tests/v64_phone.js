// v6.4: телефонные раскладки — нет перекрытий кнопок, ничего не вылезает за экран (bounding rect)
const W = innerWidth, H = innerHeight, tag = W + 'x' + H;
const out = { vp: tag, touch: TOUCH.on, errors: [], states: {} };
const SEL = '#touch button, #side button, #card button, #cur .cbox, #kit, #obj, #pstrip .pc, #r61cards button, #placeBar button, #sideTog, #hud .hb, #devLab, #hint, #squadp';
const vis = e => { if (!e.isConnected) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; let p = e; while (p && p !== document.body){ if (getComputedStyle(p).display === 'none') return false; p = p.parentElement; } return true; };
const nm = e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + (e.dataset.t || e.dataset.k || e.dataset.tab || e.dataset.ux || e.dataset.cur ? '[' + (e.dataset.t || e.dataset.k || e.dataset.tab || e.dataset.ux || e.dataset.cur) + ']' : e.className ? '.' + String(e.className).split(' ')[0] : '');
function check(state){
  const L = [];
  for (const e of document.querySelectorAll(SEL)){
    if (!vis(e)) continue;
    let r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) continue;
    const box = e.closest('#side .items, #r61cards .rl, #pstrip');   // прокручиваемые списки — видимая часть
    let R = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    if (box && box !== e){ const q = box.getBoundingClientRect(); R = { l: max(R.l, q.left), t: max(R.t, q.top), r: min(R.r, q.right), b: min(R.b, q.bottom) }; if (R.r - R.l < 3 || R.b - R.t < 3) continue; }
    L.push({ e, R, n: nm(e) });
  }
  const over = [], offs = [];
  for (const a of L){
    if (a.R.l < -1 || a.R.t < -1 || a.R.r > W + 1 || a.R.b > H + 1) offs.push(a.n + ' ' + [a.R.l, a.R.t, a.R.r, a.R.b].map(Math.round).join(','));
  }
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++){
    const a = L[i], b = L[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = min(a.R.r, b.R.r) - max(a.R.l, b.R.l), h = min(a.R.b, b.R.b) - max(a.R.t, b.R.t);
    if (w > 2 && h > 2) over.push(`${a.n} × ${b.n} (${Math.round(w)}×${Math.round(h)})`);
  }
  out.states[state] = { n: L.length, overlaps: over.slice(0, 14), offscreen: offs.slice(0, 8) };
  if (over.length) out.errors.push(state + ': overlaps ' + over.length);
  if (offs.length) out.errors.push(state + ': offscreen ' + offs.length);
}
try {
  SET.curator = true;
  MENU.newGame(); if (TUT.on) TUT.finish();
  await sleep(1500);
  check('fps'); await shot(`D:/AI/pm_v6/shots/v64_phone${W}_fps.jpg`);
  enterRTS(); await sleep(1500);
  check('rts'); await shot(`D:/AI/pm_v6/shots/v64_phone${W}_rts.jpg`);
  S.sel.clear(); S.selB = S.hq[0]; await sleep(800);
  check('rts_hq'); await shot(`D:/AI/pm_v6/shots/v64_phone${W}_rts_hq.jpg`);
  out.hqHasBuilder = !!document.querySelector('#side [data-ux="prod:builder"]');
  S.selB = null; v64PickBuilder(true); await sleep(800);
  check('rts_builder'); await shot(`D:/AI/pm_v6/shots/v64_phone${W}_rts_builder.jpg`);
  p64Side(true); await sleep(500);
  check('rts_sidemin'); out.sideMin = { side: getComputedStyle($('side')).display, tog: $('sideTog').getBoundingClientRect().right };
  await shot(`D:/AI/pm_v6/shots/v64_phone${W}_rts_sidemin.jpg`);
  p64Side(false);
  DEV.enter(); await sleep(600); check('rts_dev'); DEV.panel(true); await sleep(300);
  const dp = $('devPan').getBoundingClientRect(); out.devPan = [dp.left, dp.top, dp.right, dp.bottom].map(Math.round);
  if (dp.right > W + 1 || dp.bottom > H + 1 || dp.left < 0 || dp.top < 0) out.errors.push('devPan offscreen');
  await shot(`D:/AI/pm_v6/shots/v64_phone${W}_dev_arsenal.jpg`);
  DEV.panel(false);
  MENU.toMenu(); await sleep(800);
  const mm = [...document.querySelectorAll('#screen button')].filter(vis).map(e => e.getBoundingClientRect());
  const sc = $('screen'); out.menu = { buttons: mm.length, scrollable: sc.scrollHeight > sc.clientHeight + 2, devBtn: !!$('m_dev') };
  await shot(`D:/AI/pm_v6/shots/v64_phone${W}_menu.jpg`);
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
return out;
