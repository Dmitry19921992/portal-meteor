// «витрина» новой техники для скриншотов: ряд машин обеих фракций у нашей базы, камера-оверрайд
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && SCENE) break; await sleep(1000); }
if (S.attract || !S.me){ MENU.newGame(); await sleep(1500); }
S.teams[0].ai = false; S.teams[1].ai = false;
window.UV2 = {
  hud(on){ for (const id of ['hud', 'feed', 'kit', 'bars', 'cross', 'help', 'obj', 'dbg', 'sq', 'switcher', 'ov', 'side', 'card', 'banner']){ const e = document.getElementById(id); if (e) e.style.visibility = on ? '' : 'hidden'; } },
  build(){
    const b = BASES[0], t1 = anyTangent(b), t2 = cross(b, t1);
    const c0 = norm(add(mul(b, cos(70 / RM)), mul(t1, sin(70 / RM))));
    this.c0 = c0; this.t1 = tangent(t1, c0); this.t2 = norm(cross(c0, this.t1));
    for (const u of S.units) if (dist(u.pos, mul(c0, RM)) < 60 && u !== S.me) u.alive = false;
    S.units = S.units.filter(u => u.alive); for (const sq of S.squads) sq.units = sq.units.filter(u => u.alive); S.squads = S.squads.filter(s => s.units.length);
    this.v = {};
    ['raider', 'mlrs', 'cat'].forEach((vk, i) => [0, 1].forEach(team => {
      const p = surfacePoint(norm(add(mul(c0, RM), add(mul(this.t2, (i - 1) * 11), mul(this.t1, team * 12)))), 1.5);
      const v = V2.make(p, team, vk); v.manualUntil = 1e9; v.order = 'hold'; v.goal = v.pos;
      v.fwd = tangent(mul(this.t1, -1), v.up); v.aim = norm(add(v.fwd, mul(this.t2, 0.35))); v.load = 1; v.cd = 0; v.elev = 0.6; v.arm = 0; v.loaded = true;
      this.v[vk + team] = v;
    }));
    for (let i = 0; i < 90; i++) update(1 / 60);
    for (const k in this.v){ const v = this.v[k]; v.load = 1; v.elev = 0.62; v.arm = 0; v.loaded = true; v.aim = norm(add(tangent(v.fwd, v.up), mul(this.t2, 0.35))); }
  },
  cam(k, a, d, h){
    const v = this.v[k], up = norm(v.pos);
    const f = tangent(v.fwd, up), r = norm(cross(f, up));
    const look = add(v.pos, mul(up, 0.8));
    const pos = add(add(look, mul(add(mul(f, cos(a)), mul(r, sin(a))), d)), mul(up, h));
    S.camOverride = { pos, look };
  },
  wide(h, back){ const c = mul(this.c0, RM + 1); const up = this.c0; S.camOverride = { pos: add(add(c, mul(this.t1, -(back || 26))), mul(up, h || 9)), look: add(c, mul(this.t1, 6)) }; },
};
UV2.build(); S.paused = true; UV2.hud(false);
UV2.cam('raider0', 0.7, 7, 2.5);
await sleep(1500);
return { ok: true, n: Object.keys(UV2.v).length, alive: Object.values(UV2.v).map(v => v.alive && v.grounded) };
