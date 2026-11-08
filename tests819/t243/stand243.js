// T243 test stand (evaluated in the page by run243.js; adapted from tests819/t120/stand120.js).
//  STAND243.setup()  new battle; 80..160 m from our HQ a frozen row of finished buildings (Consortium: turret, AA, extractor, outpost,
//                    factory, drone hub, airdock; Swarm: turret, AA), infantry (Swarm scout / heavy, our sniper, 2 rocketeers,
//                    2 medics, assault leader), 2 drones, a Jackal. Nobody targets them, they do not fire.
//  STAND243.view(name)  fixed camera via S.camOverride, HUD hidden.
window.STAND243 = Object.assign(window.STAND243 || {}, {
  ents: {}, list: [], hooked: false,
  async setup(){
    try { MENU.newGame(); } catch (e){} try { MENU.close(); } catch (e){}
    try { if (typeof T72 !== 'undefined' && T72.on && T72.skip) T72.skip(); } catch (e){}
    await new Promise(r => setTimeout(r, 6000));
    S.paused = false;
    const base = BASES[0], c0 = offsetOnSphere(base, BASES[1], 95);
    const up0 = norm(c0), fwd0 = norm(tangent(sub(offsetOnSphere(c0, BASES[1], 10), c0), up0)), side0 = norm(cross(up0, fwd0));
    this.c0 = c0; this.fwd0 = fwd0; this.side0 = side0;
    const at = (s, f) => norm(add(add(c0, mul(side0, s / RM)), mul(fwd0, f / RM)));
    const fix = (e, face) => { const up = norm(e.pos); e.fwd = norm(tangent(face || mul(fwd0, -1), up)); e.aim = e.fwd; e.up = up; e.maxhp = e.hp = 1e6; e.stand243 = 1;
      e.fix = { pos: e.pos.slice(), fwd: e.fwd.slice(), up, aim: e.fwd.slice() }; this.list.push(e); return e; };
    const E = this.ents, er = [];
    const tryf = (k, f) => { try { E[k] = f(); } catch (e){ er.push(k + ': ' + e.message); } };
    const bld = (type, team, s, f) => { const b = makeBuilding(type, team, at(s, f), mul(fwd0, -1)); b.built = 1; b.done = true; b.hp = b.maxhp; return fix(b); };
    // buildings face our HQ (camera side); row 1 (small) at f = 0, row 2 (big) at f = 40
    tryf('tur', () => bld('turret', 0, -24, 0)); tryf('aa', () => bld('aa', 0, -14, 0)); tryf('extr', () => bld('extractor', 0, -4, 0));
    tryf('etur', () => bld('turret', 1, 8, 0)); tryf('eaa', () => bld('aa', 1, 18, 0));
    tryf('outpost', () => bld('outpost', 0, -44, 40)); tryf('factory', () => bld('factory', 0, -16, 46)); tryf('hub', () => bld('hub', 0, 14, 42)); tryf('airdock', () => bld('airdock', 0, 40, 42));
    // turrets aim to the left of the camera (check that the top turns the right way)
    for (const k of ['tur', 'etur', 'aa', 'eaa']) if (E[k]){ const a = norm(tangent(add(mul(fwd0, -1), mul(side0, 1)), E[k].up)); E[k].fix.aim = a; E[k].aim = a; }
    // infantry line 14 m in front of the buildings
    const inf = (team, role, elite, s, n) => { const sq = spawnSquad(team, elite, surfacePoint(at(s, -14)), n || 1, Array(n || 1).fill(role));
      return sq.units.map((u, i) => { u.pos = surfacePoint(at(s + i * 1.6, -14)); u.up = norm(u.pos); return fix(u); }); };
    tryf('esc', () => inf(1, 'scout', false, -9)[0]); tryf('ehv', () => inf(1, 'rocket', false, -6)[0]);
    tryf('snp', () => inf(0, 'sniper', false, -3)[0]);
    tryf('baz', () => { const L = inf(0, 'rocket', false, 0, 2); return L.find(u => (u.id & 1) === 1) || L[0]; });
    tryf('med', () => { const L = inf(0, 'medic', false, 4, 2); return L.find(u => (u.id & 1) === 1) || L[0]; });
    tryf('rif', () => { const L = inf(0, 'assault', false, 8, 2); return L.find(u => u.leader) || L[0]; });
    tryf('dra', () => { const a = fix(makeDrone(add(surfacePoint(at(12, -10)), mul(up0, 3)), 0)), b = fix(makeDrone(add(surfacePoint(at(15, -10)), mul(up0, 3)), 0));
      E.drr = (b.id & 1) ? b : a; return (b.id & 1) ? a : b; });   // even id = drone_attack, odd = drone_recon
    tryf('apc', () => fix(V2.make(surfacePoint(at(22, -14), 1.5), 0, 'raider')));
    if (!this.hooked){
      const u0 = window.update, self = this;
      window.update = function(){ const r = u0.apply(this, arguments); try { self.freeze(); } catch (e){} return r; };
      const rt0 = window.rebuildTargets;
      window.rebuildTargets = function(){ const r = rt0.apply(this, arguments); try { for (const t of [0, 1]) TGT[t] = TGT[t].filter(e => !e.stand243); } catch (e){} return r; };
      if (typeof CAM66 !== 'undefined' && CAM66.subject){ const sj0 = CAM66.subject; CAM66.subject = function(){ return self.noHud ? null : sj0.apply(this, arguments); }; }
      this.hooked = true;
    }
    this.freeze();
    const o = {}; for (const k in E) o[k] = E[k] ? E[k].cls + (E[k].type ? ':' + E[k].type : '') + (E[k].role ? ':' + E[k].role : '') + (E[k].vk ? ':' + E[k].vk : '') + ' t' + E[k].team + ' id' + E[k].id + (E[k].leader ? ' L' : '') + ' k=' + (typeof T243 !== 'undefined' ? T243.kind(E[k]) : '?') : null;
    return { ok: true, ents: o, err: er, fac: typeof FAC76_F !== 'undefined' ? FAC76_F : null };
  },
  freeze(){
    for (const v of this.list){
      if (!v.fix) continue;
      v.alive = true; v.pos = v.fix.pos.slice(); v.vel = [0, 0, 0]; v.fwd = v.fix.fwd.slice(); v.aim = v.fix.aim.slice(); v.up = v.fix.up;
      v.target = null; v.goal = null; v.order = 'idle'; v.cd = 99; v.mgCd = 99; v.hp = v.maxhp; v.flash = 0;
      if (v.cls === 'bld'){ v.built = 1; v.done = true; v.queue = []; v.known0 = true; }   // known0: Swarm building not hidden by RTS fog
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
    tur: ['tur', 7, 3, 25, 1.4], aa: ['aa', 8, 3.5, 25, 1.8], extr: ['extr', 10, 4, 30, 1.6], etur: ['etur', 8, 3, 25, 1.4], eaa: ['eaa', 8, 3.5, 25, 1.8],
    outpost: ['outpost', 24, 9, 25, 3.5], factory: ['factory', 32, 12, 25, 5], hub: ['hub', 26, 10, 25, 2.5], airdock: ['airdock', 24, 9, 25, 2.5],
    esc: ['esc', 3.2, 1.4, 25, 1.0], ehv: ['ehv', 3.6, 1.5, 25, 1.1], snp: ['snp', 3.0, 1.3, 25, 0.95], baz: ['baz', 3.0, 1.3, 25, 0.95],
    med: ['med', 3.0, 1.3, 25, 0.95], rif: ['rif', 3.0, 1.3, 25, 0.95], dra: ['dra', 4.5, 1.2, 25, 0], drr: ['drr', 4.5, 1.2, 25, 0], apc: ['apc', 9, 3.2, 35, 1.2],
    row: ['extr', 40, 16, 0, 2], hq: ['@hq0', 52, 22, 30, 7], ehq: ['@hq1', 52, 22, 30, 7],
  },
  async view(name){
    const [k, d, h, az, lh] = this.VIEWS[name];
    if (k[0] === '@'){ const t = +k[3], up = BASES[t].slice(), P = mul(up, RM + 1.6); this.cam(P, tangent([0, 0, 1], up), d, h, az, lh); }
    else { const e = this.ents[k]; if (!e) return name + ': no entity'; this.cam(e.pos, e.fwd, d, h, az, lh); }
    this.hud(false);
    await new Promise(r => setTimeout(r, 1500));
    return name;
  },
});
'ok'
