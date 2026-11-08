// T120 + T94 test stand (evaluated in the page by run120.js; adapted from tests94/stand94.js).
//  STAND120.setup()  new battle, a frozen line-up 70 m from our HQ: Consortium infantry (assault, elite assault, rocket, medic, scout),
//                    builder, Grad + Hammer, Bulldog (team 0) and Spider (team 1). Nobody targets them, they do not fire.
//  STAND120.view(name)  fixed camera via S.camOverride, HUD hidden.
window.STAND120 = Object.assign(window.STAND120 || {}, {
  ents: {}, list: [], hooked: false,
  async setup(){
    try { MENU.newGame(); } catch (e){} try { MENU.close(); } catch (e){}
    try { if (typeof T72 !== 'undefined' && T72.on && T72.skip) T72.skip(); } catch (e){}
    await new Promise(r => setTimeout(r, 6000));
    S.paused = false;
    const base = BASES[0], c0 = offsetOnSphere(base, BASES[1], 70);
    const up0 = norm(c0), fwd0 = norm(tangent(sub(offsetOnSphere(c0, BASES[1], 10), c0), up0)), side0 = norm(cross(up0, fwd0));
    this.c0 = c0; this.fwd0 = fwd0; this.side0 = side0;
    const at = (s, f) => norm(add(add(c0, mul(side0, s / RM)), mul(fwd0, f / RM)));
    const fix = (e, face) => { const up = norm(e.pos); e.fwd = norm(tangent(face || fwd0, up)); e.aim = e.fwd; e.up = up; e.maxhp = e.hp = 1e6; e.stand120 = 1;
      e.fix = { pos: e.pos.slice(), fwd: e.fwd.slice(), up }; this.list.push(e); return e; };
    const inf = (role, elite, s) => { const sq = spawnSquad(0, elite, surfacePoint(at(s, 0)), 1, [role]), u = sq.units[0]; u.pos = surfacePoint(at(s, 0)); u.up = norm(u.pos); return fix(u); };
    const E = this.ents, er = [];
    const tryf = (k, f) => { try { E[k] = f(); } catch (e){ er.push(k + ': ' + e.message); } };
    tryf('jet', () => inf('assault', false, -5)); tryf('mg', () => inf('assault', true, -2.5)); tryf('flamer', () => inf('rocket', false, 0));
    tryf('eng', () => inf('medic', false, 2.5)); tryf('spy', () => inf('scout', false, 5));
    tryf('dog', () => fix(makeBuilder(0, surfacePoint(at(8.5, 0), 1))));
    tryf('mechg', () => fix(V2.make(surfacePoint(at(-9, -14), 1.5), 0, 'mlrs')));
    tryf('mechm', () => fix(V2.make(surfacePoint(at(0, -14), 1.5), 0, 'cat')));
    tryf('bulldog', () => fix(makeTank(surfacePoint(at(9, -14), 1.5), 0)));
    tryf('spider', () => fix(makeTank(surfacePoint(at(20, -14), 1.5), 1), mul(fwd0, -1)));
    if (!this.hooked){
      const u0 = window.update, self = this;
      window.update = function(){ const r = u0.apply(this, arguments); try { self.freeze(); } catch (e){} return r; };
      const rt0 = window.rebuildTargets;
      window.rebuildTargets = function(){ const r = rt0.apply(this, arguments); try { for (const t of [0, 1]) TGT[t] = TGT[t].filter(e => !e.stand120); } catch (e){} return r; };
      if (typeof CAM66 !== 'undefined' && CAM66.subject){ const sj0 = CAM66.subject; CAM66.subject = function(){ return self.noHud ? null : sj0.apply(this, arguments); }; }
      this.hooked = true;
    }
    this.freeze();
    const o = {}; for (const k in E) o[k] = E[k] ? E[k].cls + (E[k].role ? ':' + E[k].role : '') + (E[k].vk ? ':' + E[k].vk : '') + (E[k].elite ? ':elite' : '') + ' t' + E[k].team : null;
    return { ok: true, ents: o, err: er, fac: typeof FAC76_F !== 'undefined' ? FAC76_F : null };
  },
  freeze(){
    for (const v of this.list){
      if (!v.fix) continue;
      v.alive = true; v.pos = v.fix.pos.slice(); v.vel = [0, 0, 0]; v.fwd = v.fix.fwd.slice(); v.aim = v.fix.fwd.slice(); v.up = v.fix.up;
      v.target = null; v.goal = null; v.order = 'idle'; v.cd = 99; v.mgCd = 99; v.hp = v.maxhp; v.flash = 0;
      if (v.seen) { v.seen[0] = 5; v.seen[1] = 5; }
    }
  },
  hud(show){ this.noHud = !show; for (const e of document.body.children){ if (e.id === 'c' || (e.querySelector && e.querySelector('#c'))) continue; e.style.visibility = show ? '' : 'hidden'; } },
  cam(P, fwd, d, h, az, lookH){
    const up = norm(P), F = norm(tangent(fwd, up)), Rt = norm(cross(F, up)), a = az * Math.PI / 180;
    const dir = add(mul(F, Math.cos(a)), mul(Rt, Math.sin(a)));
    S.camOverride = { pos: add(add(P, mul(dir, d)), mul(up, h)), look: add(P, mul(up, lookH === undefined ? 1.0 : lookH)) };
  },
  // name: [entity key, distance, height, azimuth (0 = in front of it), look height]
  VIEWS: {
    inf: ['flamer', 8.5, 1.8, 12, 0.9], jet: ['jet', 3.0, 1.3, 25, 0.95], mg: ['mg', 3.0, 1.3, 25, 0.95], flamer: ['flamer', 3.0, 1.3, 25, 0.95],
    eng: ['eng', 3.0, 1.3, 25, 0.95], spy: ['spy', 3.0, 1.3, 25, 0.95], dog: ['dog', 3.4, 1.4, 35, 0.6],
    mechg: ['mechg', 9.5, 3.0, 30, 2.0], mechm: ['mechm', 9.5, 3.0, 30, 2.0], bulldog: ['bulldog', 9, 3.2, 35, 1.2], spider: ['spider', 10, 3.5, 35, 1.2],
    all: ['mechm', 30, 10, 20, 1],
  },
  async view(name){
    const [k, d, h, az, lh] = this.VIEWS[name], e = this.ents[k];
    if (!e) return name + ': no entity';
    this.cam(e.pos, e.fwd, d, h, az, lh);
    this.hud(false);
    await new Promise(r => setTimeout(r, 1500));
    return name;
  },
});
'ok'
