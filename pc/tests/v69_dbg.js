const out = {};
try {
  if (S.attract || S.mode !== 'fps'){ MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(2500); }
  out.me = S.me && S.me.cls; out.third = S.third; out.vm3 = gunVM3(); out.busy = CAMFX.busy();
  out.err0 = gl.getError();
  await sleep(300);
  out.err1 = gl.getError(); out.ok = WPN69.ok(); out.built = WPN69.built; out.drawnAgo = performance.now() - (WPN69.drawnAt || 0);
  out.cull = gl.isEnabled(gl.CULL_FACE); out.cm = gl.getParameter(gl.COLOR_WRITEMASK);
  out.mz = WPN69.st.mz; out.fov = S.cam.fov;
  await shot('D:/AI/pm_v6/shots/v69_dbg_a.jpg');
  WPN69.on = false; await sleep(300); await shot('D:/AI/pm_v6/shots/v69_dbg_b.jpg'); WPN69.on = true;
} catch (e){ out.e = e.message; }
return out;
