// v6.7: осмотр телефонной раскладки — FPS, RTS, меню (скриншоты в shots/v67_<W>_*.jpg)
const W = innerWidth, H = innerHeight, tag = W + 'x' + H;
const out = { vp: tag, touch: TOUCH.on, m67: document.body.classList.contains('m67'), dpr: devicePixelRatio, safe: typeof M67 !== 'undefined' ? M67.safe : null };
try {
  await shot(`D:/AI/pm_v6/shots/v67_${tag}_menu.jpg`);
  MENU.newGame(); if (TUT.on) TUT.finish();
  await sleep(2500);
  await shot(`D:/AI/pm_v6/shots/v67_${tag}_fps.jpg`);
  M67.toggleSheet(true); await sleep(400);
  await shot(`D:/AI/pm_v6/shots/v67_${tag}_fps_sheet.jpg`);
  M67.toggleSheet(false);
  enterRTS(); await sleep(2000);
  await shot(`D:/AI/pm_v6/shots/v67_${tag}_rts.jpg`);
  S.sel.clear(); M67.cycleSquad(); await sleep(1500);
  await shot(`D:/AI/pm_v6/shots/v67_${tag}_rts_sel.jpg`);
  S.sel.clear(); v64PickBuilder(true); await sleep(1200);
  await shot(`D:/AI/pm_v6/shots/v67_${tag}_rts_builder.jpg`);
  S.sel.clear(); await sleep(600);
  M67.toggleSheet(true); await sleep(400);
  await shot(`D:/AI/pm_v6/shots/v67_${tag}_rts_sheet.jpg`);
  M67.toggleSheet(false);
  out.fps = fpsVal;
} catch (e){ out.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
return out;
