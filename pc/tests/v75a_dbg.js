const R = {};
try {
  R.drawSrc = ST70.draw.toString().slice(0, 160);
  let n = 0; const d0 = AS75.draw; AS75.draw = function(){ n++; return d0.apply(this, arguments); };
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(800);
  if (MENU.cur && MENU.close) MENU.close(); S.paused = false;
  await sleep(2500);
  R.calls = n; R.fps = fpsVal; R.mode = S.mode; R.paused = S.paused; R.menu = MENU.cur; R.st70items = ST70.items.length; R.info = AS75.info();
  R.renderSrc = render.toString().slice(0, 200);
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
