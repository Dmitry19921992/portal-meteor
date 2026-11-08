// test/v819-0811: extra view 'tracers' for ST169 (stand169.js): same frozen battle, fixed camera outside our HQ looking out,
// 5 rifle tracers (3 ours, 2 enemy) added through the normal addTracer() and advanced to mid-flight. Base build = v8.7 tracers,
// test build = the same call wrapped by T92 (wider bolt, comet tail, muzzle flash, impact spark, glowing smoke).
Object.assign(window.ST169, {
  g(x, y, z){ const d = norm([x, RM, z]); return mul(d, groundR(d) + y); },
  trcSpawn(){
    const g = (x, y, z) => this.g(x, y, z);
    const L = [[g(1.4, 1.5, 33), g(5, 0.6, 95), 0], [g(-1.6, 1.5, 34), g(-7, 0.8, 92), 0], [g(0.4, 1.4, 36), g(2, 1.0, 75), 0],
               [g(-16, 1.6, 72), g(9, 1.0, 46), 1], [g(18, 1.5, 84), g(-3, 1.0, 55), 1]];
    for (const [a, b, t] of L){
      addTracer(a, b, t, 0.05, 0);
      const T = TRACERS[(trcI + TRC_N - 1) % TRC_N];
      T.t = Math.min(T.L * 0.6, T.L - 2) / TRC_SPEED;
    }
    return L.length;
  },
});
{ const c0 = ST169.cams, v0 = ST169.view;
  ST169.cams = function(){ const o = c0.apply(this, arguments); o.tracers = { pos: this.g(0, 2.2, 26), look: this.g(0, 1.6, 62), up: false }; return o; };
  ST169.view = async function(name){ const r = await v0.apply(this, arguments); if (name === 'tracers'){ r.trc = this.trcSpawn(); await this.sleep(300); } return r; };
}
'ST169 trc ok';
