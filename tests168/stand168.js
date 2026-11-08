// T168 test stand (evaluated in the page): new battle, paused, a row of ST70 building meshes on the ground near our HQ,
// fixed camera. Usage from q-file: STAND168.setup() once, then STAND168.view(i) / STAND168.toggle(on).
window.STAND168 = Object.assign(window.STAND168 || {}, {
  items: [], hooked: false,
  MODELS: ['bunker', 'hbunker', 'bay', 'gen', 'mast', 'asm83c', 'b83hull', 'comms', 'tower', 'radar'],
  async setup(){
    if (!this.noNew){
      try { MENU.newGame(); } catch (e){} try { MENU.close(); } catch (e){}
      try { if (typeof T72 !== 'undefined' && T72.on && T72.skip) T72.skip(); } catch (e){}
      await new Promise(r => setTimeout(r, 6000));
      S.paused = false;
    }
    const base = BASES[0], c0 = offsetOnSphere(base, BASES[1], 70);
    const fwd0 = norm(sub(offsetOnSphere(c0, BASES[1], 10), c0));
    this.items = [];
    let k = 0;
    for (const m of this.MODELS){
      if (!ST70_DEF[m]) continue;
      const side = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 17;
      const up0 = norm(c0), side0 = norm(cross(up0, fwd0));
      const d = norm(add(c0, mul(side0, side / RM)));
      const dir = norm(d), gr = groundR(dir), Y = dir;
      const X = norm(cross(fwd0, Y)), Z = cross(X, Y);
      this.items.push({ m, pos: mul(dir, gr), X, Y, Z, s: 1, team: 0, sh: 1, glow: 1, stand: 1 });
      k++;
    }
    if (!this.hooked){ const c1 = ST70.collect; const self = this; ST70.collect = function(){ c1.apply(this, arguments); if (self.items.length) this.items.push(...self.items); }; this.hooked = true; }
    this.c0 = c0; this.fwd0 = fwd0;
    return this.items.map(i => i.m);
  },
  hud(show){ for (const e of document.body.children){ if (e.id === 'c' || (e.querySelector && e.querySelector('#c'))) continue; e.style.visibility = show ? '' : 'hidden'; } },
  // camera i: looks at item i from the front-left, dist d, height h
  async view(i, d, h, az){
    const it = this.items[i], P = it.pos, up = norm(P), a = (az || 35) * Math.PI / 180;
    const dir = add(mul(it.Z, -Math.cos(a)), mul(it.X, Math.sin(a)));
    S.camOverride = { pos: add(add(P, mul(dir, d || 16)), mul(up, h || 5)), look: add(P, mul(up, 1.2)) };
    this.hud(false);
    await new Promise(r => setTimeout(r, 1800));
    return it.m;
  },
});
'ok'
