// Прогон «как игрок»: ИИ включён, переключаемся бой↔стратегия, жмём кнопки, всплывашки, зум/панорама, сохранение/загрузка.
const out = { errors: [] };
const oe = window.onerror; window.onerror = (m, s, l, c, e) => { out.errors.push(String(m) + ' @' + l); };
MENU.newGame(); await sleep(2500);
const tab = () => { dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'Tab' })); };
const key = (c, sh) => { dispatchEvent(new KeyboardEvent('keydown', { code: c, shiftKey: !!sh })); dispatchEvent(new KeyboardEvent('keyup', { code: c })); };
let fpsMin = 999;
for (let round = 0; round < 6; round++){
  tab(); await sleep(400);                       // в стратегию
  if (S.mode !== 'rts') out.errors.push('tab->rts failed r' + round);
  const gs = groupsOf(0); if (gs.length){ S.sel.clear(); S.sel.add(gs[round % gs.length]); }
  for (const tabk of ['F1', 'F2', 'F3', 'F4']){ key(tabk); await sleep(150); for (const b of SIDE.btns.slice(0, 3)){ b.el.click(); await sleep(60); UIX.closePop(); S.place = null; S.cast = null; } }
  key('KeyW'); keys.KeyW = true; await sleep(500); keys.KeyW = false;
  rtsZoomAt(-300, innerWidth / 2, innerHeight / 2); await sleep(300); rtsZoomAt(300); await sleep(300);
  key('KeyH', true); await sleep(200);
  key('Space'); await sleep(400); key('Home'); await sleep(500);
  document.querySelectorAll('#card .ab').forEach((b, i) => { if (i < 3) b.click(); }); S.cast = null; UIX.closePop();
  fpsMin = Math.min(fpsMin, fpsVal);
  tab(); await sleep(1200);                      // вселиться
  if (S.mode !== 'fps') out.errors.push('tab->fps failed r' + round);
  key('KeyX'); await sleep(800);                 // быстрая смена бойца
}
SAVE.save(); await sleep(200);
const m0 = S.mode;
enterRTS(); await sleep(300);
SAVE.save(); SAVE.load(); await sleep(1500);
out.afterLoad = { mode: S.mode, camOk: S.cam && S.cam.pos.every(isFinite), h: Math.round(S.rts.h) };
out.fpsMin = Math.round(fpsMin);
out.units = S.units.length;
window.onerror = oe;
return out;
