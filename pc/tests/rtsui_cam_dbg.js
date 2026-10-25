if (!S.me || S.attract){ MENU.newGame(); await sleep(2500); }
S.paused = true; enterRTS(); await sleep(100);
const DT = 1 / 60; for (const k in keys) keys[k] = false;
const out = [];
for (const H of [40, 280]){
  S.rts.dir = [0, 1, 0]; S.rts.fwd = [0, 0, -1]; S.rts.h = S.rts.hT = H;
  let prev = null, pg = null, pk = null;
  keys.KeyW = true;
  for (let i = 0; i < (H < 100 ? 2400 : 840); i++){
    updateRTSCamera(DT); const c = rtsCamera();
    const under = mapJS(c.pos[0], c.pos[1], c.pos[2]);
    if (prev){
      const j = dist(prev.pos, c.pos), t = acos(clamp(dot(prev.fwd, c.fwd), -1, 1)) * 57.3;
      if (j > (H < 100 ? 6 : 25) || t > 2 || under < 0.15) out.push({ H, i, jump: +j.toFixed(1), turn: +t.toFixed(1), gr: +RCAM.gr.toFixed(1), grPrev: +pg.toFixed(1), pullK: +RCAM.lift.toFixed(2), pkPrev: +pk.toFixed(2), under: +under.toFixed(2), r: Math.round(len(c.pos)), dirY: +S.rts.dir[1].toFixed(3), shaft: AXES.map(a => Math.round(surfDist(a, S.rts.dir))).join(',') });
    }
    prev = c; pg = RCAM.gr; pk = RCAM.lift;
  }
  keys.KeyW = false;
}
S.paused = false;
return out.slice(0, 40);
