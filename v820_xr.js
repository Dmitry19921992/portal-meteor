// =====================================================================
//  v8.20 XR8 — VR in the main game (WebXR, Meta Quest 2 browser). Prototype, Claude 08.11.2026 (branch task/vr-main-proto)
//  * «Войти в VR» appears ONLY when navigator.xr says immersive-vr is supported (PC / phone without a headset: nothing changes);
//    ?vr=0 switches the whole module off. Main menu: «Ниндзя в VR» and «VR-арена →» (only with WebXR).
//  * In VR the game runs on the XR frame loop (requestAnimationFrame is routed to session.requestAnimationFrame while a session
//    is live, so update / AI / audio stay the same). Each eye: the ray-marched scene + meshes into an own HDR buffer (asymmetric
//    eye frustum = a symmetric frustum + viewport offset, render.js V.x / V.y / V.ry / V.fovS), post-processing into an own LDR
//    buffer, then a blit into the XR layer (comfort vignette / dash fade). Quality: the phone «lite» preset (quality 0, 1 bounce,
//    fewer particles and lights) + dynamic eye resolution; fixed foveation on the layer; 72 Hz requested.
//  * Ninja (first VR unit, T141 stage 4): the katana follows the right controller; a cut = blade sweep vs the body capsule,
//    graded by combat_core.swing (speed / edge angle / body part; profile 'main' + headset aim + comfort fade) and applied
//    through the game's own NJ.strike (damage, block / parry rules, dismemberment). Trigger — dash to the enemy you look at,
//    B — dash along the stick, left trigger — aim the far teleport with the left controller (release = go), snap turn on the
//    right stick, grip — block.
//  * Other units: head aim — the shot goes where you look (aimRay()), right trigger fires.
//  * Y — VR menu (Continue / Switch unit / Ninja / VR arena → / Exit VR). WebXR Navigation: 'sessiongranted' starts VR at load.
// =====================================================================
const XR8 = {
  QS: new URLSearchParams(location.search),
  on: false, supported: false, active: false, starting: false, sess: null, ref: null, layer: null, xf: null, pose: null,
  q: [], side: [], gen: 0, mainPend: 0, drawn: false, err: {}, granted: false, want: null,
  k: 0.42, kMin: 0.25, kMax: 0.75, fbs: 0.5, vig: 0, vigOn: true, fade: 0, snapDeg: 30,
  refF: null, U: [0, 1, 0], R: [1, 0, 0], pos0: [0, 0, 0], anchor: [0, 0, 0], head: null, lastMe: undefined, still: null,
  pad: { left: { b: [], pb: [], ax: [0, 0, 0, 0], src: null }, right: { b: [], pb: [], ax: [0, 0, 0, 0], src: null } }, snapArm: true,
  panel: { open: false, c: null, ax: null, ay: null, items: [], hover: -1, key: '', cv: null, tex: null, cur: null },
  hud: { c: null, ax: null, ay: null, t: 0, key: '', cv: null, tex: null },
  hintUntil: 0, blade: null, bladeHits: new Map(), whooshT: 0, tele: null, ret: null, held: {}, xt: 0, xn: 0, xs: 0, slow: 0, fast: 0,
  stats: { frames: 0, gameFrames: 0, cuts: 0, gashes: 0, scratches: 0, blocks: 0, swings: 0, dashes: 0, teles: 0, snaps: 0, eyeW: 0, eyeH: 0, ms: 0, starts: 0, ends: 0, fallback: 0 },
  ARENA: 'https://portal-meteor-vr.pages.dev/',
  core: null,
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('XR8 ' + tag, e); } } },
  T(ru, en){ return typeof tr === 'function' ? tr(ru, en, en) : ru; },
  // ---------------------------------------------------------------- tiny math (XR local space <-> game world)
  qrot(q, v){ const x = q.x, y = q.y, z = q.z, w = q.w, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
    return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)]; },
  P3(p){ return [p.x, p.y, p.z]; },
  tg(v, up){ const t = sub(v, mul(up, dot(v, up))), l = len(t); return l < 1e-6 ? anyTangent(up) : mul(t, 1 / l); },
  Bv(v){ return add(add(mul(this.R, v[0]), mul(this.U, v[1])), mul(this.refF, -v[2])); },   // local direction -> world
  Bi(w){ return [dot(w, this.R), dot(w, this.U), -dot(w, this.refF)]; },                     // world direction -> local
  W(pl){ return add(this.anchor, this.Bv(sub(pl, this.pos0))); },                             // local point -> world
  L(pw){ return add(this.pos0, this.Bi(sub(pw, this.anchor))); },                             // world point -> local
  m4(a, b){ const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++){ let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  setBasis(up){ this.U = up; if (!this.refF) this.refF = anyTangent(up); this.refF = this.tg(this.refF, up); this.R = norm(cross(this.refF, up)); },
  yawFwdL(q){ const h = this.qrot(q, [0, 0, -1]), l = Math.hypot(h[0], h[2]) || 1; return [h[0] / l, 0, h[2] / l]; },

  // ---------------------------------------------------------------- support check + buttons (only with WebXR)
  init(){
    this.on = this.QS.get('vr') !== '0' && !!navigator.xr && typeof navigator.xr.isSessionSupported === 'function';
    if (!this.on) return;
    const k = +this.QS.get('vrscale'); if (k > 0.1 && k <= 1) this.k = k;
    const f = +this.QS.get('vrfb'); if (f > 0.2 && f <= 1) this.fbs = f;
    if (this.QS.get('vrvig') === '0') this.vigOn = false;
    this.safe(() => { if (typeof CombatCore !== 'undefined') this.core = CombatCore.create('main', { aimSource: 'headset', comfortFade: true }); }, 'core');
    const chk = () => navigator.xr.isSessionSupported('immersive-vr').then(ok => { this.supported = !!ok; this.ui(); }).catch(() => {});
    chk();
    this.safe(() => navigator.xr.addEventListener('devicechange', chk), 'dev');
    // WebXR Navigation (Quest Browser): arriving from the VR arena while in VR — the page starts immersive mode itself
    this.safe(() => navigator.xr.addEventListener('sessiongranted', () => { this.granted = true; this.start('granted'); }), 'granted');
    setInterval(() => this.safe(() => this.uiTick(), 'uitick'), 400);
  },
  ui(){
    if (!this.supported || this.el) return;
    const st = document.createElement('style');
    st.textContent = `#xr8b{position:fixed;right:14px;bottom:16px;z-index:60;display:none;font:700 15px "Exo 2",sans-serif;letter-spacing:.04em;padding:11px 16px;border-radius:10px;border:1px solid #7fe0c0;background:rgba(10,22,20,.86);color:#bff5e2;cursor:pointer;box-shadow:0 0 0 1px #000,0 4px 18px rgba(0,0,0,.5)}
#xr8b:hover{background:rgba(20,52,44,.92)}
#xr8m{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:60;display:none;gap:8px}
#xr8m button{font:600 12px "Exo 2",sans-serif;padding:7px 11px;border-radius:8px;border:1px solid rgba(127,224,192,.6);background:rgba(10,22,20,.8);color:#bff5e2;cursor:pointer}`;
    document.head.appendChild(st);
    const b = document.createElement('button'); b.id = 'xr8b'; b.type = 'button';
    b.addEventListener('click', e => { e.stopPropagation(); this.start('button'); });
    const m = document.createElement('div'); m.id = 'xr8m';
    m.innerHTML = '<button type="button" data-x="nj"></button><button type="button" data-x="arena"></button>';
    m.addEventListener('click', e => { const x = e.target && e.target.dataset && e.target.dataset.x; if (!x) return; e.stopPropagation(); if (x === 'nj') this.start('ninja'); else this.toArena(); });
    for (const el of [b, m]) for (const ev of ['mousedown', 'pointerdown', 'touchstart']) el.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    document.body.appendChild(b); document.body.appendChild(m);
    this.el = b; this.elM = m; this.uiTick();
  },
  inMatch(){ return typeof S !== 'undefined' && !S.attract && !S.over; },
  uiTick(){
    if (!this.el) return;
    const menuMain = typeof MENU !== 'undefined' && MENU.cur === 'main' && S.attract;
    const showB = !this.active && this.inMatch() && (!MENU.isOpen() || MENU.cur === 'pause');
    this.el.style.display = showB ? 'block' : 'none';
    if (showB){ const nj = typeof NJ !== 'undefined' && (NJ.is(S.me) || S.mode !== 'fps'); this.el.textContent = '◉ ' + this.T('Войти в VR', 'Enter VR') + (nj ? ' · ' + this.T('ниндзя', 'ninja') : ''); }
    this.elM.style.display = !this.active && menuMain ? 'flex' : 'none';
    if (menuMain){ const [a, r] = this.elM.children; a.textContent = '◉ ' + this.T('Ниндзя в VR', 'Ninja in VR'); r.textContent = this.T('VR-арена →', 'VR arena →'); }
  },
  toArena(){ try { location.href = this.ARENA; } catch (e){} },   // in a live session Quest Browser keeps VR (the arena gets 'sessiongranted')

  // ---------------------------------------------------------------- session start / end
  start(why){
    if (this.active || this.starting || !navigator.xr) return;
    this.starting = true; this.want = why === 'button' ? 'current' : 'ninja';
    let p;
    try { p = navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] }); }   // first call — still inside the click
    catch (e){ this.starting = false; console.warn('XR8 requestSession', e); return; }
    p.then(s => this.begin(s)).catch(e => { this.starting = false; console.warn('XR8 requestSession', e && e.message); });
  },
  async begin(sess){
    try {
      if (gl.makeXRCompatible) await gl.makeXRCompatible();
      const layer = new XRWebGLLayer(sess, gl, { antialias: false, depth: false, alpha: false, framebufferScaleFactor: this.fbs });
      try { if ('fixedFoveation' in layer) layer.fixedFoveation = 1; } catch (e){}
      sess.updateRenderState({ baseLayer: layer, depthNear: 0.05, depthFar: 2000 });
      this.ref = await sess.requestReferenceSpace('local');
      this.safe(() => { if (sess.updateTargetFrameRate && sess.supportedFrameRates && Array.from(sess.supportedFrameRates).includes(72)) sess.updateTargetFrameRate(72).catch(() => {}); }, 'hz');
      this.safe(() => this.ref.addEventListener('reset', () => { this.lastMe = undefined; }), 'reset');
      this.sess = sess; this.layer = layer; this.active = true; this.starting = false; this.stats.starts++;
      sess.addEventListener('end', () => this.end());
      this.gl0();
      this.perfOn();
      this.gen++;
      if (this.mainPend === 1){ this.mainPend = 0; this.kickMain(); }   // a window-rAF frame may never fire while immersive (Quest) — run it on the XR loop
      this.lastMe = undefined; this.refF = null; this.panel.open = false; this.hintUntil = performance.now() + 14000;
      this.afterBoot();
      if (this.el) this.uiTick();
      sess.requestAnimationFrame((t, f) => this.onXR(t, f));
    } catch (e){
      this.starting = false; console.warn('XR8 begin', e && e.message);
      try { await sess.end(); } catch (e2){}
    }
  },
  afterBoot(){   // possess the ninja (or keep the current unit); in the main menu start a quick battle first
    const go = () => this.safe(() => {
      if (!this.active) return;
      if (typeof MENU !== 'undefined' && MENU.isOpen() && MENU.cur === 'pause'){ MENU.close(); }
      if (S.paused && !this.panel.open){ S.paused = false; MENU.waitLock = false; }
      if (S.attract || S.over){ if (this.want === 'ninja' || this.granted){ MENU.newGame(); } else { this.openPanel(); return; } }
      let u = null;
      if (this.want === 'ninja' || this.granted || !S.me || !ctrlEntity()) u = typeof NJ !== 'undefined' ? (NJ.of(0) || NJ.spawn(0)) : null;
      if (!u && !ctrlEntity()) u = typeof FPS61 !== 'undefined' ? FPS61.pickAuto() : nearestToAction(0);
      if (u && u !== S.me){ releasePlayerUnits(); takeControl(u); }
      if (typeof NJ !== 'undefined') NJ.autoP = false;
      this.granted = false;
    }, 'afterboot');
    const wait = () => { if (window.BOOT) window.BOOT.then(go); else setTimeout(wait, 250); };   // sessiongranted arrives while the game still loads
    wait();
  },
  end(){
    if (!this.active) return;
    this.active = false; this.sess = null; this.xf = null; this.pose = null; this.stats.ends++;
    this.release();
    this.perfOff();
    this.gen++;
    const q = this.q; this.q = [];
    for (const cb of q) XR8.rafO(cb);   // nextTick and friends must not hang
    if (this.mainPend === 2){ this.mainPend = 0; window.requestAnimationFrame(frame); }
    else if (!this.mainPend && window.BOOT && typeof SCENE !== 'undefined' && SCENE) window.requestAnimationFrame(frame);
    this.safe(() => { if (this.inMatch() && S.mode === 'fps' && !MENU.isOpen()) MENU.pause(); else if (S.paused && !MENU.isOpen()) S.paused = false; }, 'endpause');
    this.panel.open = false;
    if (this.el) this.uiTick();
  },
  perfOn(){
    const L = typeof LITE73 !== 'undefined' ? LITE73 : null;
    this.sv = { q: S.quality, b: S.bounces, third: S.third, lite: L ? L.on : false, ms: L ? L.minMs : 0, auto: typeof NJ !== 'undefined' ? NJ.autoP : false, paused: S.paused };
    S.quality = 0; S.bounces = min(S.bounces, 1);
    if (L){ L.on = true; L.minMs = 0; }
    if (typeof NJ !== 'undefined') NJ.autoP = false;
  },
  perfOff(){
    const v = this.sv; if (!v) return;
    S.quality = v.q; S.bounces = v.b; S.third = v.third;
    if (typeof LITE73 !== 'undefined'){ LITE73.on = v.lite; LITE73.minMs = v.ms; }
    if (typeof NJ !== 'undefined') NJ.autoP = v.auto;
    this.sv = null;
  },
  release(){
    for (const c in this.held) if (this.held[c]){ keys[c] = false; this.held[c] = 0; }
    if (this.heldM){ mouseL = mouseR = false; this.heldM = 0; }
    if (this.heldMove){ TOUCH.move = [0, 0]; this.heldMove = 0; }
    this.tele = null; this.blade = null;
    for (const s of ['left', 'right']){ this.pad[s].b = []; this.pad[s].pb = []; }
  },
  // ---------------------------------------------------------------- frame loop routing
  queue(cb){ this.q.push(cb); return 0; },
  kickMain(){ const g = this.gen; this.mainPend = 2; this.queue(t => { if (g !== XR8.gen) return; XR8.mainPend = 0; frame(t); }); },
  onXR(t, xf){
    const s = this.sess; if (!s || !this.active) return;
    s.requestAnimationFrame((t2, f2) => this.onXR(t2, f2));
    this.xf = xf; this.drawn = false; this.stats.frames++;
    const dtX = this.xt ? t - this.xt : 14; this.xt = t; this.adapt(dtX);
    this.pose = xf.getViewerPose(this.ref);
    this.safe(() => this.pre(xf, min(0.05, dtX / 1000)), 'pre');
    const q = this.q; this.q = [];
    for (const cb of q){ try { cb(t); } catch (e){ console.error(e); } }
    if (this.side.length){
      const now = performance.now(), sd = this.side; this.side = [];
      const stale = now - (this.winT || 0) > 600;   // window rAF has not fired for 0.6 s — suspended while immersive
      for (const o of sd){ if (o.done) continue; if (stale && now - o.t > 400){ o.done = true; try { o.cb(t); } catch (e){ console.error(e); } } else this.side.push(o); }
    }
    if (!this.drawn) this.safe(() => this.fallback(), 'fallback');
    this.xf = null;
  },
  adapt(ms){   // dynamic eye resolution: below ~66 fps — smaller eye buffers; steady 72 — a bit sharper
    if (ms <= 0 || ms > 200) return;
    this.xn++; this.xs += ms;
    if (this.xn < 54) return;
    const a = this.xs / this.xn; this.xn = 0; this.xs = 0; this.stats.ms = +a.toFixed(2);
    if (a > 15.2){ this.fast = 0; if (++this.slow >= 1 && this.k > this.kMin){ this.k = max(this.kMin, +(this.k - 0.06).toFixed(3)); this.slow = 0; } }
    else if (a < 14.4){ this.slow = 0; if (++this.fast >= 3 && this.k < this.kMax){ this.k = min(this.kMax, +(this.k + 0.04).toFixed(3)); this.fast = 0; } }
    else { this.slow = this.fast = 0; }
  },
  // ---------------------------------------------------------------- per XR frame, before the game update: pose, basis, gaze, input, blade
  pre(xf, dt){
    const P = this.pose; if (!P) return;
    this.hp = this.P3(P.transform.position); this.hq = P.transform.orientation;
    this.pollPads(xf);
    if (typeof MENU !== 'undefined' && MENU.isOpen() && MENU.cur === 'pause' && !this.panel.open){ MENU.close(); S.paused = false; MENU.waitLock = false; }   // lost pointer lock etc.
    const ready = typeof SCENE !== 'undefined' && !!SCENE && !!this.stats.gameFrames;
    if (!this.inMatch() && !this.panel.open) this.openPanel();
    if (this.dn('left', 5) && this.inMatch()){ if (this.panel.open) this.closePanel(); else this.openPanel(); }   // Y — VR menu
    if (this.panel.open){ this.releaseHeld(); this.panelInput(); this.panelTick(); }
    if (typeof SCENE === 'undefined' || !SCENE) return;
    this.frameBasis(); this.headCam();
    if (!ready) return;
    if (!this.panel.open){ this.applyGaze(); this.inputs(dt); this.bladeStep(dt); } else this.blade = null;
    this.hudTick(dt);
  },
  pollPads(xf){
    for (const s of ['left', 'right']){ const P = this.pad[s]; P.pb = P.b; P.b = []; P.src = null; P.grip = null; P.aim = null; P.ax = [0, 0]; }
    for (const src of this.sess.inputSources){
      const P = this.pad[src.handedness]; if (!P) continue;
      P.src = src;
      const gp = src.gamepad;
      if (gp){ P.b = Array.from(gp.buttons, b => !!(b && (b.pressed || b.value > 0.55))); const a = gp.axes || []; P.ax = a.length >= 4 ? [a[2] || 0, a[3] || 0] : [a[0] || 0, a[1] || 0]; }
      try { if (src.gripSpace) P.grip = xf.getPose(src.gripSpace, this.ref); if (src.targetRaySpace) P.aim = xf.getPose(src.targetRaySpace, this.ref); } catch (e){}
    }
  },
  dn(s, i){ const P = this.pad[s]; return !!P.b[i] && !P.pb[i]; },
  upE(s, i){ const P = this.pad[s]; return !P.b[i] && !!P.pb[i]; },
  frameBasis(){
    const c = ctrlEntity(), me = c && S.mode === 'fps' && !S.attract ? c : null;
    let up, anchor;
    if (me){ up = me.up || norm(me.pos); anchor = this.anchorOf(me); }
    else {
      if (!this.still || this.lastMe !== null){ const g = this.gameCam || S.cam; this.still = g ? g.pos.slice() : mul(BASES[0], RM + 30); }
      anchor = this.still; up = norm(anchor);
    }
    if (me !== this.lastMe){
      const g = this.gameCam || S.cam;
      this.recenter(me ? (me.cls === 'inf' ? me.fwd : (me.aim || me.fwd)) : (g ? g.fwd : anyTangent(up)), up);
      this.lastMe = me; this.bladeHits.clear(); this.blade = null;
      if (me) this.hintUntil = max(this.hintUntil, performance.now() + 9000);
    } else this.setBasis(up);
    const off = sub(this.hp, this.pos0), l = len(off);   // lean up to 0.45 m away from the body, then the body follows
    if (l > 0.45) this.pos0 = add(this.pos0, mul(off, (l - 0.45) / l));
    this.anchor = anchor;
  },
  recenter(fw, up){
    this.U = up;
    const D = this.tg(fw || anyTangent(up), up), RD = norm(cross(D, up)), h = this.qrot(this.hq, [0, 0, -1]), th = Math.atan2(-h[0], -h[2]);
    this.refF = norm(add(mul(D, Math.cos(th)), mul(RD, Math.sin(th)))); this.R = norm(cross(this.refF, up));
    this.pos0 = this.hp.slice();
  },
  anchorOf(c){
    const up = c.up || norm(c.pos);
    if (c.cls === 'inf'){
      if (typeof NJ !== 'undefined' && NJ.is(c)) return add(c.pos, mul(up, 0.95));
      return add(c.pos, mul(up, (typeof RULES !== 'undefined' && RULES.EYE || 1.1) - 0.32 * (typeof GUNS !== 'undefined' && GUNS.crouchK || 0)));
    }
    if (c.cls === 'tank') return add(add(c.pos, mul(up, 2.3)), mul(this.tg(c.fwd, up), -0.6));
    if (c.cls === 'drone') return add(c.pos, mul(up, 0.15));
    if (c.cls === 'bld' && typeof gunPos === 'function') return add(gunPos(c), mul(up, 0.75));
    return (this.gameCam || S.cam || { pos: c.pos }).pos;
  },
  headCam(){
    const q = this.hq;
    this.head = { pos: this.W(this.hp), right: this.Bv(this.qrot(q, [1, 0, 0])), up: this.Bv(this.qrot(q, [0, 1, 0])), fwd: this.Bv(this.qrot(q, [0, 0, -1])), fov: this.fovH || 1.9 };
    S.cam = Object.assign({}, this.head);
  },
  postCam(){ this.gameCam = S.cam; this.frameBasis(); this.headCam(); },   // after the game's own camera: the body moved during update
  applyGaze(){   // «куда смотришь — туда стреляешь»: the possessed unit looks / aims along the headset forward
    const c = ctrlEntity(); if (!c || S.mode !== 'fps' || S.attract || S.paused) return;
    const r = aimRay(); if (!r) return;
    const g = r.dir, up = c.up || norm(c.pos);
    if (c.cls === 'inf'){ const s = dot(g, up); c.fwd = abs(s) < 0.985 ? g : norm(add(mul(this.tg(g, up), 0.17), mul(up, Math.sign(s) * 0.985))); }
    else c.aim = g;
  },
  inputs(dt){
    const Lp = this.pad.left, Rp = this.pad.right, c = ctrlEntity();
    if (!c || S.mode !== 'fps' || S.attract || S.paused){ this.releaseHeld(); if (this.dn('right', 0)) this.openPanel(); return; }
    const rx = Rp.ax[0];   // snap turn on the right stick
    if (this.snapArm && abs(rx) > 0.7){ this.snap(rx > 0 ? 1 : -1); this.snapArm = false; } else if (abs(rx) < 0.3) this.snapArm = true;
    const lx = Lp.ax[0], ly = Lp.ax[1], m = Math.hypot(lx, ly);   // left stick — move (relative to where you look)
    if (m > 0.15){ const k = min(1, (m - 0.15) / 0.85) / m; TOUCH.move = [lx * k, -ly * k]; this.heldMove = 1; } else if (this.heldMove){ TOUCH.move = [0, 0]; this.heldMove = 0; }
    const setK = (act, v) => { const code = SET.bind[act]; if (!code || !!this.held[code] === !!v) return; this.held[code] = v ? 1 : 0; keys[code] = !!v; };
    const tap = act => { const code = SET.bind[act]; if (!code) return; const o = { code, key: '', bubbles: true }; window.dispatchEvent(new KeyboardEvent('keydown', o)); window.dispatchEvent(new KeyboardEvent('keyup', o)); };
    const setM = (l, r) => { const a = SET.swapMouse ? r : l, b = SET.swapMouse ? l : r; mouseL = !!a; mouseR = !!b; this.heldM = 1; };
    if (typeof NJ !== 'undefined' && NJ.is(c)){
      setM(false, !!Rp.b[1] || !!Lp.b[1]);   // grip (either hand) — block; timed = parry
      setK('jump', !!Rp.b[4]);               // A — jump (in the air: double jump / wall-run)
      setK('run', !!Rp.b[5]);                // B — dash along the stick (NJ blink on the key edge)
      setK('rocket', !!Lp.b[4]);             // X — shuriken fan
      if (this.dn('right', 0)) this.dashTo(c);   // trigger — dash to the enemy you look at
      this.teleAim(c, !!Lp.b[0], this.upE('left', 0));   // left trigger: aim with the left controller, release — far teleport
    } else {
      setM(!!Rp.b[0], !!Rp.b[1]);            // trigger — fire along the gaze, grip — aim
      setK('jump', !!Rp.b[4]); setK('run', !!Rp.b[5]); setK('rocket', !!Lp.b[1]);
      if (this.dn('left', 4)) tap('reload');
      if (this.dn('left', 0)) tap('grenade');
      if (this.dn('left', 3)) tap('interact');
      if (this.dn('right', 3)) tap('switch');
      this.tele = null;
    }
  },
  releaseHeld(){
    for (const c in this.held) if (this.held[c]){ keys[c] = false; this.held[c] = 0; }
    if (this.heldM){ mouseL = mouseR = false; this.heldM = 0; }
    if (this.heldMove){ TOUCH.move = [0, 0]; this.heldMove = 0; }
  },
  release(){ this.releaseHeld(); this.tele = null; this.blade = null; for (const s of ['left', 'right']){ this.pad[s].b = []; this.pad[s].pb = []; } },
  snap(dir){
    const d = dir * this.snapDeg * PI / 180;
    this.refF = norm(add(mul(this.refF, Math.cos(d)), mul(this.R, Math.sin(d)))); this.R = norm(cross(this.refF, this.U));
    this.stats.snaps++;
  },
  haptic(s, v, ms){ const P = this.pad[s], gp = P && P.src && P.src.gamepad, h = gp && gp.hapticActuators && gp.hapticActuators[0]; try { if (h && h.pulse) h.pulse(min(1, v), ms); } catch (e){} },
  telegraphNear(c){
    if (!c || typeof NJ === 'undefined') return false;
    for (const e of TGT[c.team] || []) if (e.alive && NJ.is(e) && e.nj && e.nj.atk && e.nj.atk.A && e.nj.atk.A.tele && dist(e.pos, c.pos) < 14) return true;
    return false;
  },
  // ---------------------------------------------------------------- ninja: dash, teleport, katana on the controller
  pickLook(u, R){   // combat_core.aimPick on aimRay() (the shared «where you look» interface), NJ soft-lock as the fallback
    const r = aimRay(); let t = null;
    if (this.core && r){
      const C = []; for (const e of TGT[u.team] || []) if (e.alive && e.cls !== 'bld' && e.cls !== 'hq') C.push({ pos: centerOf(e), alive: true, e });
      const b = this.core.aimPick({ origin: r.origin, dir: r.dir }, C, { maxDist: R, maxAngleDeg: 14 }); t = b && b.e;
    }
    return t || NJ.pick(u, R);
  },
  dashTo(u){
    const N = NJ.N(u); if (N.blink || N.tp || N.stag > 0) return;
    const r = aimRay(), up = NJ.up(u), t = this.pickLook(u, 16);
    let to;
    if (t && dist(t.pos, u.pos) > NJ.reach(t) * 0.9){ const tu = norm(t.pos), from = this.tg(sub(u.pos, t.pos), tu); to = add(t.pos, mul(from, NJ.reach(t) * 0.55)); }
    else to = add(u.pos, mul(this.tg(r ? r.dir : u.fwd, up), 6.5));
    if (NJ.blink(u, to, null, !u.grounded)){ this.stats.dashes++; this.haptic('right', 0.25, 30); } else NJ.sfx('ping', u.pos);
  },
  teleAim(u, hold, rel){
    const A = this.pad.left.aim, N = NJ.N(u);
    if (hold && A){
      const o = this.W(this.P3(A.transform.position)), d = this.Bv(this.qrot(A.transform.orientation, [0, 0, -1]));
      const r = rayCast(o, d, 150, u.team, false);
      this.tele = { pos: r.pos, ok: r.t < 149 && dist(r.pos, u.pos) > 4 && N.teleCd <= 0 && !N.tp, cd: N.teleCd };
    } else if (rel && this.tele){
      const T = this.tele; this.tele = null;
      if (T.ok && NJ.teleport(u, NJ.safeSpot(norm(T.pos), 0.5), null)){ S.markers.push({ pos: T.pos, t: 0, life: 1.2, col: '#9cf' }); this.stats.teles++; this.haptic('left', 0.4, 50); }
      else { NJ.sfx('ping', u.pos); if (T.cd > 0) feed(`${this.T('Телепорт', 'Teleport')}: ${Math.ceil(T.cd)} ${this.T('с', 's')}`, '#f88'); }
    } else if (!hold) this.tele = null;
  },
  segD(a, b, p){ const ab = sub(b, a), t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1e-9), 0, 1); return dist(p, add(a, mul(ab, t))); },
  bladeStep(dt){
    const c = ctrlEntity(), G = this.pad.right.grip;
    if (!c || typeof NJ === 'undefined' || !NJ.is(c) || S.mode !== 'fps' || S.attract || !G){ this.blade = null; return; }
    const gp = this.P3(G.transform.position), gq = G.transform.orientation;
    const B = { gp, bl: add(gp, this.qrot(gq, [0, 0, -0.15])), tl: add(gp, this.qrot(gq, [0, 0, -1.06])), zl: this.qrot(gq, [0, 1, 0]), t: performance.now(), sp: 0 };
    const pv = this.blade; this.blade = B;   // positions in the XR local space: walking, dashes and snap turns are no swings
    this.whooshT -= dt;
    if (!pv || S.paused) return;
    const sp = dist(B.tl, pv.tl) / max(0.004, (B.t - pv.t) / 1000); B.sp = sp;
    if (sp > 4.2 && this.whooshT <= 0){ NJ.sfx('swish', this.W(B.tl)); this.whooshT = 0.3; }
    const N = NJ.N(c); if (N.stag > 0 || N.tp || N.hidden) return;
    if (sp < (this.core ? this.core.cfg.minSpeed : 0.5)) return;
    const swW = norm(this.Bv(sub(B.tl, pv.tl))), now = S.time, pts = [];
    for (const a of [0, 0.5, 1]){   // swept blade: 3 time samples × 6 points along the blade
      const b0 = add(mul(pv.bl, 1 - a), mul(B.bl, a)), t0 = add(mul(pv.tl, 1 - a), mul(B.tl, a));
      for (let j = 0; j <= 5; j++) pts.push(this.W(add(mul(b0, 1 - j / 5), mul(t0, j / 5))));
    }
    const hand = this.W(gp), bdW = norm(sub(this.W(B.tl), this.W(B.bl)));
    for (const e of TGT[c.team] || []){
      if (!e.alive || e.cls === 'hq' || e.cls === 'bld') continue;
      const ce = centerOf(e); if (dist(ce, hand) > 5) continue;
      const last = this.bladeHits.get(e); if (last !== undefined && now - last < 0.3) continue;
      const up = norm(e.pos), feet = sub(e.pos, mul(up, 0.5));
      let hit = null, best = 9;
      if (e.cls === 'inf' || e.cls === 'builder'){
        const a = add(feet, mul(up, 0.3)), b = add(feet, mul(up, e.cls === 'inf' ? 1.55 : 1.2)), r = 0.34;
        for (const p of pts){ const d = this.segD(a, b, p); if (d < r && d < best){ best = d; hit = p; } }
      } else {
        const r = (typeof hitRadius === 'function' ? hitRadius(e) : 1) + 0.1;
        for (const p of pts){ const d = dist(p, ce); if (d < r && d < best){ best = d; hit = p; } }
      }
      if (!hit) continue;
      this.bladeHits.set(e, now);
      this.cut(c, e, hit, sp, swW, bdW, up, feet);
    }
    if (this.bladeHits.size > 48) for (const [e, t] of this.bladeHits) if (now - t > 2 || !e.alive) this.bladeHits.delete(e);
  },
  cut(u, e, p, sp, sw, bd, up, feet){   // grade the contact with combat_core, apply it with the game's own strike (block / parry / dismemberment)
    const h = dot(sub(p, feet), up), side = dot(sub(p, e.pos), norm(cross(this.tg(e.fwd || anyTangent(up), up), up)));
    let part = 'torso';
    if (e.cls === 'inf'){ if (h > 1.3) part = 'head'; else if (h > 0.95 && abs(side) > 0.19) part = side > 0 ? 'armR' : 'armL'; else if (h < 0.72) part = side > 0 ? 'legR' : 'legL'; }
    const stab = abs(dot(sw, bd)), edge = Math.sqrt(max(0, 1 - stab * stab));
    let st = 'idle';
    if (NJ.is(e)){ const M = NJ.N(e); if (M.stag > 0) st = 'stagger'; else if (M.atk && M.atk.A){ const A = M.atk.A; st = M.atk.t >= A.h0 && M.atk.t <= A.h1 ? 'strike' : 'windup'; } }
    const res = this.core ? this.core.swing({ speed: sp, edgeCos: edge, stab, weapon: 'katana', part, targetState: st }) : { kind: sp > 3.4 ? 'cut' : sp > 1.9 ? 'gash' : 'scratch' };
    if (!res || res.kind === 'none') return;
    const horiz = abs(dot(sw, up)) < 0.5;
    const cutK = part === 'head' ? 'neck' : part.slice(0, 3) === 'arm' ? 'arm' : part === 'torso' ? (horiz ? 'waist' : 'diag') : 'diag';
    const base = NJ.ATK.c0.dmg, kind = res.kind;
    const dmg = (kind === 'cut' ? base * 2.2 : kind === 'gash' || kind === 'chip' || kind === 'smash' ? base * 0.75 : base * 0.18) * (e.cls === 'tank' ? 0.45 : 1) * (1 + min(0.4, max(0, sp - 5) * 0.06));
    const r = NJ.strike(u, e, { dmg, cut: cutK, reach: 1, cosA: 0, T: 0, h0: 0, h1: 0 }, 1, norm(add(sw, mul(up, 0.1))));
    this.stats.swings++; this.lastCut = { kind, part, sp: +sp.toFixed(2), r, cls: e.cls };
    if (r === 'block' || r === 'parry'){ this.stats.blocks++; this.haptic('right', 0.9, 70); return; }
    if (r === 'dodge') return;
    if (kind === 'cut'){ this.stats.cuts++; this.haptic('right', 1, 80); }
    else if (kind === 'scratch'){ this.stats.scratches++; this.haptic('right', 0.3, 25); }
    else { this.stats.gashes++; this.haptic('right', 0.6, 45); }
  },
  ownKatana(L, n0){   // first person: hide the own head / torso / arms, the katana goes to the right controller
    const u = ctrlEntity(); if (!u || !NJ.is(u) || S.mode !== 'fps' || S.attract || !L) return;
    const up = norm(u.pos), a = sub(u.pos, mul(up, 0.5)), b = add(u.pos, mul(up, 1.3));
    const near = { nj_head: 0.45, nj_torso: 0.45, nj_kit0: 0.45, nj_kit1: 0.45, nj_uarm: 0.7, nj_farm: 0.75, nj_katana: 0.85 };
    let kat = null;
    for (let i = L.length - 1; i >= n0; i--){
      const it = L[i], r = near[it.m]; if (!r || !it.pos || this.segD(a, b, it.pos) > r) continue;
      if (it.m === 'nj_katana') kat = it;
      L.splice(i, 1);
    }
    const B = this.blade; if (!B || !kat) return;
    const Y = norm(sub(this.W(B.tl), this.W(B.bl))), z0 = this.Bv(B.zl), Z = norm(sub(z0, mul(Y, dot(z0, Y)))), X = norm(cross(Y, Z));
    L.push(Object.assign({}, kat, { pos: add(this.W(B.gp), mul(Y, 0.1)), X, Y, Z, glow: (kat.glow || 1) * (B.sp > 3.4 ? 1.7 : 1) }));
  },
  // ---------------------------------------------------------------- stereo render into the XR layer
  draw(dt, now){
    const P = this.pose, layer = this.layer; if (!P || !layer || !SCENE) return false;
    this.gl0();
    if (typeof GFX72 !== 'undefined') this.safe(() => GFX72.events(S.paused ? 0 : dt * (1 - 0.72 * (S.slow || 0))), 'gfx72');   // debris / dust of hits (v72_gfx render wrapper is skipped in VR)
    const c = ctrlEntity(), fpsU = c && S.mode === 'fps' && !S.attract ? c : null;
    const inf = fpsU && fpsU.cls === 'inf' && !(typeof NJ !== 'undefined' && NJ.is(fpsU));
    if (inf) S.third = false;
    const fp = fpsU && (inf || fpsU.cls === 'drone') ? fpsU : null;
    this.vigStep(dt);
    const ret = this.reticle();
    const sv = { fbo, fboTex, fboW, fboH, cam: S.cam };
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer); gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    try {
      for (const view of P.views){
        const vp = layer.getViewport(view); if (!vp || vp.width < 16 || vp.height < 16) continue;   // (an emulator may report an empty second view)
        const m = view.projectionMatrix;
        const l = (-1 + m[8]) / m[0], r = (1 + m[8]) / m[0], b = (-1 + m[9]) / m[5], t = (1 + m[9]) / m[5];
        const Tx = max(-l, r), Ty = max(-b, t);
        const w = max(64, Math.round(vp.width * this.k / 8) * 8), h = max(64, Math.round(w * (t - b) / (r - l)));   // square pixels: the same aspect as the eye frustum
        this.bufs(w, h);
        // the asymmetric eye frustum = a symmetric one (half-extents Tx, Ty) drawn into a larger viewport shifted by (vx, vy)
        const px = w / (r - l), py = h / (t - b), W2 = Math.round(2 * Tx * px), H2 = Math.round(2 * Ty * py);
        const vx = -Math.round((l + Tx) * px), vy = -Math.round((b + Ty) * py), rx = 2 * vx + W2, ry = 2 * vy + H2;
        const eq = view.transform.orientation, ep = this.P3(view.transform.position);
        S.cam = { pos: this.W(ep), right: this.Bv(this.qrot(eq, [1, 0, 0])), up: this.Bv(this.qrot(eq, [0, 1, 0])), fwd: this.Bv(this.qrot(eq, [0, 0, -1])), fov: 2 * Ty };
        this.fovH = 2 * Ty;
        fbo = this.hfb; fboTex = this.htex; fboW = W2; fboH = H2;
        renderScene(dt, now, { x: vx, y: vy, rx, ry, fovS: 2 * Ty * ry / H2, fp, vm: false, lamp: fpsU ? 1 : 0 });
        renderPost(now, true, { fb: this.lfb, w, h });
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        this.blit(vp);
        this.overlays(this.m4(m, view.transform.inverse.matrix), ret);
      }
    } finally {
      fbo = sv.fbo; fboTex = sv.fboTex; fboW = sv.fboW; fboH = sv.fboH;
      S.cam = this.head ? Object.assign({}, this.head) : sv.cam;
    }
    this.stats.gameFrames++; this.drawn = true;
    return true;
  },
  bufs(w, h){
    if (this.bw === w && this.bh === h) return;
    for (const t of [this.htex, this.ltex]) if (t) gl.deleteTexture(t);
    for (const f of [this.hfb, this.lfb]) if (f) gl.deleteFramebuffer(f);
    if (this.hdep) gl.deleteRenderbuffer(this.hdep);
    const tex = (fmt, levels) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, levels, fmt, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, levels > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    this.htex = tex(HDR ? gl.RGBA16F : gl.RGBA8, 1 + floor(Math.log2(max(w, h))));
    this.hfb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.hfb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.htex, 0);
    this.hdep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.hdep); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.hdep);
    this.ltex = tex(gl.RGBA8, 1);
    this.lfb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.lfb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.ltex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.bw = w; this.bh = h; this.stats.eyeW = w; this.stats.eyeH = h;
  },
  gl0(){
    if (this.bp) return;
    const mk = (vs, fs, names) => {
      const p = gl.createProgram(), v = gl.createShader(gl.VERTEX_SHADER), f = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(v, vs); gl.compileShader(v); gl.shaderSource(f, fs); gl.compileShader(f); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.warn('XR8 shader', gl.getShaderInfoLog(v), gl.getShaderInfoLog(f), gl.getProgramInfoLog(p));
      const U = {}; for (const n of names) U[n] = gl.getUniformLocation(p, n); return { p, U };
    };
    this.bp = mk(VS, `#version 300 es
precision highp float; uniform sampler2D uT; uniform vec4 uVp; uniform vec3 uK; out vec4 o;
void main(){ vec2 uv = (gl_FragCoord.xy - uVp.xy) / uVp.zw; vec3 c = texture(uT, uv).rgb; float r = length(uv * 2.0 - 1.0);
  c *= 1.0 - uK.x * smoothstep(uK.y, 1.2, r); c *= 1.0 - uK.z; o = vec4(c, 1.0); }`, ['uT', 'uVp', 'uK']);
    this.op = mk(`#version 300 es
uniform mat4 uPV; uniform vec3 uC; uniform vec3 uX; uniform vec3 uY; out vec2 vUv;
void main(){ vec2 k = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0; vUv = k * 0.5 + 0.5; gl_Position = uPV * vec4(uC + uX * k.x + uY * k.y, 1.0); }`, `#version 300 es
precision mediump float; uniform sampler2D uT; uniform vec4 uCol; uniform float uTex; in vec2 vUv; out vec4 o;
void main(){ vec4 c = uCol;
  if (uTex > 0.5) c = texture(uT, vec2(vUv.x, 1.0 - vUv.y)) * uCol;
  else { float r = length(vUv * 2.0 - 1.0); c.a *= smoothstep(1.0, 0.82, r) * smoothstep(0.3, 0.5, r); }
  if (c.a < 0.01) discard; o = c; }`, ['uPV', 'uC', 'uX', 'uY', 'uT', 'uCol', 'uTex']);
    this.vao = gl.createVertexArray();
  },
  blit(vp){
    const B = this.bp; gl.useProgram(B.p); gl.bindVertexArray(this.vao); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.ltex); gl.uniform1i(B.U.uT, 0);
    gl.uniform4f(B.U.uVp, vp.x, vp.y, vp.width, vp.height); gl.uniform3f(B.U.uK, this.vig, 0.5, this.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },
  vigStep(dt){   // comfort: edges darken while gliding on the stick; a 0.1 s fade to black on a dash / teleport (not while a telegraphed attack comes)
    const c = ctrlEntity(); let want = 0, f = 0;
    if (c && S.mode === 'fps' && !S.attract){
      if (this.vigOn && c.vel){ const up = norm(c.pos), v = len(sub(c.vel, mul(up, dot(c.vel, up)))); want = 0.75 * smoothstep(1.2, 6, v) * (this.heldMove ? 1 : 0.4); }
      if (typeof NJ !== 'undefined' && NJ.is(c) && this.core && this.core.cfg.comfortFade){
        const N = NJ.N(c);
        if (N.blink) f = min(1, (N.blink.t + 0.02) / 0.05);
        else if (N.tp && (N.tp.ph === 'gone' || (N.tp.ph === 'charge' && N.tp.t > N.tp.ct - 0.1))) f = 1;
        if (f > 0 && this.telegraphNear(c)) f = 0;
      }
    }
    this.fade = f > this.fade ? f : max(0, this.fade - dt / 0.1);
    this.vig += (want - this.vig) * min(1, dt * 8);
  },
  reticle(){
    const out = [], c = ctrlEntity(), r = aimRay();
    if (!r || !c || S.mode !== 'fps' || S.attract || this.panel.open) return out;
    if (typeof NJ !== 'undefined' && NJ.is(c)){ const t = this.pickLook(c, 16); if (t) out.push({ p: this.L(centerOf(t)), col: [1, 0.82, 0.4, 0.75], s: 0.02 }); }
    else { const h = rayCast(r.origin, r.dir, 300, c.team, true), en = h.ent && h.ent.team !== c.team; out.push({ p: this.L(h.pos), col: en ? [1, 0.35, 0.3, 0.95] : [0.85, 1, 0.9, 0.8], s: 0.011 }); }
    if (this.tele) out.push({ p: this.L(this.tele.pos), col: this.tele.ok ? [0.45, 0.9, 1, 0.95] : [1, 0.4, 0.3, 0.8], s: 0.03 });
    return out;
  },
  quad(c, x, y, col){ const U = this.op.U; gl.uniform3fv(U.uC, c); gl.uniform3fv(U.uX, x); gl.uniform3fv(U.uY, y); gl.uniform4fv(U.uCol, col); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); },
  overlays(PV, ret){
    const O = this.op; if (!O) return;
    gl.useProgram(O.p); gl.bindVertexArray(this.vao); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniformMatrix4fv(O.U.uPV, false, PV);
    const hx = this.qrot(this.hq, [1, 0, 0]), hy = this.qrot(this.hq, [0, 1, 0]);
    gl.uniform1f(O.U.uTex, 0);
    for (const o of ret){ const s = o.s * max(0.3, dist(o.p, this.hp)); this.quad(o.p, mul(hx, s), mul(hy, s), o.col); }
    const tx = (T, c, ax, ay) => { gl.uniform1f(O.U.uTex, 1); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T); gl.uniform1i(O.U.uT, 0); this.quad(c, ax, ay, [1, 1, 1, 1]); };
    const H = this.hud; if (H.tex && H.c && H.on) tx(H.tex, H.c, H.ax, H.ay);
    const P = this.panel;
    if (P.open && P.tex && P.c){
      tx(P.tex, P.c, P.ax, P.ay);
      if (P.hit){ gl.uniform1f(O.U.uTex, 0); const s = 0.012; this.quad(add(P.hit, mul(P.n, -0.004)), mul(hx, s), mul(hy, s), [1, 1, 1, 0.95]); }
    }
    gl.disable(gl.BLEND);
  },
  fallback(){   // loading / no game frame: dark room + the VR menu (so the session never shows garbage)
    const P = this.pose, layer = this.layer; if (!P || !layer) return;
    this.gl0(); this.stats.fallback++;
    if (!this.panel.open) this.openPanel();
    this.panelTick();
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer); gl.disable(gl.SCISSOR_TEST); gl.clearColor(0.02, 0.03, 0.05, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    for (const view of P.views){ const vp = layer.getViewport(view); if (!vp || vp.width < 16) continue; gl.viewport(vp.x, vp.y, vp.width, vp.height); this.overlays(this.m4(view.projectionMatrix, view.transform.inverse.matrix), []); }
  },
  // ---------------------------------------------------------------- VR menu panel (canvas texture, right-controller pointer)
  canvasTex(o, w, h){
    if (!o.cv){ o.cv = document.createElement('canvas'); o.cv.width = w; o.cv.height = h; o.g = o.cv.getContext('2d'); }
    if (!o.tex){ o.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, o.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
    return o.g;
  },
  upload(o){ gl.bindTexture(gl.TEXTURE_2D, o.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, o.cv); },
  openPanel(){
    const P = this.panel; if (P.open) return;
    P.open = true; P.key = ''; P.hover = -1; P.hit = null;
    if (this.hq){ const f = this.yawFwdL(this.hq), r = [-f[2], 0, f[0]]; P.c = add(add(this.hp, mul(f, 1.1)), [0, -0.06, 0]); P.ax = mul(r, 0.36); P.ay = [0, 0.27, 0]; P.n = f; }
    if (this.inMatch() && !S.paused){ S.paused = true; this.pausedBy = true; }
    this.releaseHeld();
  },
  closePanel(){ const P = this.panel; P.open = false; P.hit = null; if (this.pausedBy){ S.paused = false; this.pausedBy = false; } },
  items(){
    const L = [];
    const ready = typeof SCENE !== 'undefined' && !!SCENE && !!this.stats.gameFrames;
    if (ready){
      if (this.inMatch()){ L.push({ id: 'resume', t: this.T('Продолжить', 'Continue') }); L.push({ id: 'switch', t: this.T('Сменить юнит', 'Switch unit') }); }
      if (!(typeof NJ !== 'undefined' && NJ.is(S.me) && this.inMatch())) L.push({ id: 'ninja', t: this.inMatch() ? this.T('Играть за ниндзю', 'Play the ninja') : this.T('Бой за ниндзю', 'Battle as the ninja') });
    }
    L.push({ id: 'arena', t: this.T('VR-арена →', 'VR arena →') });
    L.push({ id: 'exit', t: this.T('Выйти из VR', 'Exit VR') });
    return L;
  },
  act(id){
    this.safe(() => {
      if (id === 'resume') this.closePanel();
      else if (id === 'switch'){ this.closePanel(); switchUnit(1); }
      else if (id === 'ninja'){
        this.closePanel();
        if (!this.inMatch()) MENU.newGame();
        const u = NJ.of(0) || NJ.spawn(0);
        if (u){ releasePlayerUnits(); takeControl(u); NJ.autoP = false; }
        S.paused = false;
      }
      else if (id === 'arena') this.toArena();
      else if (id === 'exit' && this.sess) this.sess.end().catch(() => {});
    }, 'act');
  },
  panelInput(){
    const P = this.panel; P.hit = null; P.hover = -1;
    const A = this.pad.right.aim || this.pad.left.aim; if (!A || !P.c) return;
    const o = this.P3(A.transform.position), d = this.qrot(A.transform.orientation, [0, 0, -1]), den = dot(d, P.n);
    if (den > 1e-4){
      const t = dot(sub(P.c, o), P.n) / den;
      if (t > 0 && t < 5){
        const hit = add(o, mul(d, t)), v = sub(hit, P.c), ax = len(P.ax), ay = len(P.ay);
        const u = dot(v, P.ax) / (ax * ax), w = dot(v, P.ay) / (ay * ay);
        if (abs(u) <= 1.05 && abs(w) <= 1.05){ P.hit = hit; const X = (u + 1) * 256, Y = (1 - w) * 192; P.hover = (P.rows || []).findIndex(r => X >= r[0] && X <= r[2] && Y >= r[1] && Y <= r[3]); }
      }
    }
    if ((this.dn('right', 0) || this.dn('left', 0)) && P.hover >= 0){ const it = P.items[P.hover]; if (it){ this.haptic('right', 0.3, 20); this.act(it.id); } }
  },
  panelTick(){
    const P = this.panel; if (!P.open) return;
    P.items = this.items();
    const bar = document.getElementById('bootBar'), load = !(typeof SCENE !== 'undefined' && SCENE && this.stats.gameFrames) ? (bar && bar.style.width || '0%') : '';
    const key = P.items.map(i => i.id).join(',') + '|' + P.hover + '|' + load + '|' + (S && S.over ? 1 : 0);
    if (key === P.key && P.tex) return;
    P.key = key;
    const g = this.canvasTex(P, 512, 384);
    g.clearRect(0, 0, 512, 384);
    g.fillStyle = 'rgba(8,14,16,0.9)'; g.strokeStyle = 'rgba(127,224,192,0.85)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(4, 4, 504, 376, 18) : g.rect(4, 4, 504, 376); g.fill(); g.stroke();
    g.fillStyle = '#bff5e2'; g.font = '700 30px "Exo 2", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(load ? this.T('PORTAL METEOR — загрузка ', 'PORTAL METEOR — loading ') + load : S.over ? this.T('Бой окончен', 'Battle over') : 'PORTAL METEOR · VR', 256, 42);
    P.rows = [];
    P.items.forEach((it, i) => {
      const y = 82 + i * 58, r = [40, y, 472, y + 48]; P.rows.push(r);
      g.fillStyle = i === P.hover ? 'rgba(127,224,192,0.32)' : 'rgba(127,224,192,0.1)';
      g.beginPath(); g.roundRect ? g.roundRect(r[0], r[1], r[2] - r[0], r[3] - r[1], 10) : g.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); g.fill();
      g.fillStyle = i === P.hover ? '#ffffff' : '#bff5e2'; g.font = '600 26px "Exo 2", sans-serif'; g.fillText(it.t, 256, y + 25);
    });
    g.font = '400 17px "Exo 2", sans-serif'; g.fillStyle = 'rgba(191,245,226,0.7)';
    g.fillText(this.T('курок — выбрать · Y — закрыть', 'trigger — select · Y — close'), 256, 362);
    this.upload(P);
  },
  // ---------------------------------------------------------------- small HUD under the view (HP, energy, hints)
  hudTick(dt){
    const H = this.hud, c = ctrlEntity();
    H.on = !!(c && S.mode === 'fps' && !S.attract && !this.panel.open);
    if (!H.on || !this.hq) return;
    const f = this.yawFwdL(this.hq), r = [-f[2], 0, f[0]], want = add(add(this.hp, mul(f, 1.25)), [0, -0.5, 0]);
    H.c = H.c ? add(H.c, mul(sub(want, H.c), 1 - Math.exp(-dt * 3))) : want;
    const tl = norm(sub(this.hp, H.c)), ry = norm(sub([0, 1, 0], mul(tl, tl[1])));   // tilted towards the eyes
    const rr = norm(cross(ry, tl)); H.ax = mul(rr, 0.3); H.ay = mul(ry, 0.075);
    H.t -= dt; if (H.t > 0 && H.tex) return; H.t = 0.2;
    const nj = typeof NJ !== 'undefined' && NJ.is(c), hp = c.maxhp ? clamp(c.hp / c.maxhp, 0, 1) : 1, en = nj ? clamp((c.energy || 0) / NJ.JET.emax, 0, 1) : -1;
    const hint = performance.now() < this.hintUntil;
    const N = nj ? NJ.N(c) : null;
    const st = nj ? (N.teleCd > 0 ? this.T('телепорт ', 'teleport ') + Math.ceil(N.teleCd) + this.T(' с', ' s') : this.T('телепорт готов', 'teleport ready')) : (S.kit && S.kit.mag ? this.T('патроны ', 'ammo ') + (S.kit.mag[S.kit.w] | 0) : '');
    const line = hint ? (nj ? this.T('Меч — правая рука (резкий взмах = разрез) · курок — рывок к цели · B — рывок · левый курок — телепорт · grip — блок · Y — меню', 'Sword — right hand (sharp swing = cut) · trigger — dash to target · B — dash · left trigger — teleport · grip — block · Y — menu')
                             : this.T('Курок — огонь туда, куда смотришь · A — прыжок · B — ранец · левый курок — граната · X — перезарядка · Y — меню', 'Trigger — fire where you look · A — jump · B — jetpack · left trigger — grenade · X — reload · Y — menu')) : st;
    const key = (hp * 50 | 0) + '|' + (en * 50 | 0) + '|' + line;
    if (key === H.key && H.tex) return;
    H.key = key;
    const g = this.canvasTex(H, 512, 128);
    g.clearRect(0, 0, 512, 128);
    g.fillStyle = 'rgba(6,10,12,0.72)'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#2a1414'; g.fillRect(16, 14, 480, 20); g.fillStyle = hp > 0.5 ? '#8fe0a0' : hp > 0.25 ? '#e0c060' : '#ff6a5a'; g.fillRect(16, 14, 480 * hp, 20);
    if (en >= 0){ g.fillStyle = '#10202a'; g.fillRect(16, 40, 480, 10); g.fillStyle = '#7fd8ff'; g.fillRect(16, 40, 480 * en, 10); }
    g.fillStyle = '#e8f6f0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = line.split(' · '), lines = [''];
    g.font = hint ? '500 17px "Exo 2", sans-serif' : '600 22px "Exo 2", sans-serif';
    for (const w of words){ const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' · ' + w : w; if (g.measureText(t).width > 490 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
    lines.slice(0, 3).forEach((t, i) => g.fillText(t, 256, 72 + i * 21 - (lines.length > 2 ? 8 : 0)));
    this.upload(H);
  },
  debug(){ const c = ctrlEntity(); return { active: this.active, k: this.k, eye: [this.stats.eyeW, this.stats.eyeH], stats: Object.assign({}, this.stats), me: c ? { cls: c.cls, role: c.role, ninja: typeof NJ !== 'undefined' && NJ.is(c) } : null,
    panel: this.panel.open, head: this.head ? { pos: this.head.pos, fwd: this.head.fwd } : null, lastCut: this.lastCut || null, fade: this.fade, vig: this.vig, tele: this.tele }; },
};
// ---------------------------------------------------------------------
//  aimRay(): the one «where you look» ray for every system (T141 ГЛАВНОЕ ПРАВИЛО 3) — VR: the headset, PC / phone: the camera
// ---------------------------------------------------------------------
function aimRay(){
  if (XR8.active && XR8.head) return { origin: XR8.head.pos, dir: XR8.head.fwd, src: 'headset' };
  const c = typeof S !== 'undefined' && S.cam;
  return c ? { origin: c.pos, dir: c.fwd, src: 'camera' } : null;
}
// Quest boot preset (Q820, first module): no environment 3D props on a headset browser (saved settings are loaded in boot -> after MENU.load)
if (typeof Q820 !== 'undefined' && Q820.on && typeof MENU !== 'undefined'){ const ld0 = MENU.load; MENU.load = function(){ const r = ld0.apply(this, arguments); try { SET.as75 = false; } catch (e){} return r; }; }
// Quest 2D page: the canvas at most ~0.3 MPix (a phone renders ~0.15), whatever the adaptive graphics or a big Quest window asks for
if (typeof Q820 !== 'undefined' && Q820.on && typeof resize === 'function'){
  const rz0 = resize;
  resize = function(){ try { const cap = Math.sqrt(300000 / max(1, innerWidth * innerHeight)); if (!S.fixedRes && S.scale > cap){ S.scale = +cap.toFixed(3); Q820.capped = S.scale; } } catch (e){} return rz0.apply(this, arguments); };
}
XR8.rafO = window.requestAnimationFrame.bind(window);
XR8.init();
if (XR8.on){
  // the frame loop: while a session is live every requestAnimationFrame goes to the XR loop (one main-loop chain, generation-guarded)
  window.requestAnimationFrame = function(cb){
    if (typeof frame === 'function' && cb === frame){
      if (XR8.mainPend) return 0;
      const g = XR8.gen;
      if (XR8.active){ XR8.mainPend = 2; return XR8.queue(t => { if (g !== XR8.gen) return; XR8.mainPend = 0; frame(t); }); }
      XR8.mainPend = 1;
      return XR8.rafO(t => { XR8.winT = performance.now(); if (g !== XR8.gen) return; XR8.mainPend = 0; frame(t); });
    }
    if (!XR8.active) return XR8.rafO(cb);
    // other callbacks (boot nextTick, effects — and the XR runtime's own pump in an emulator) stay on window rAF; if the browser
    // suspends window rAF while immersive (allowed by the spec), the XR loop runs them after 0.4 s instead
    const o = { cb, t: performance.now(), done: false }; XR8.side.push(o);
    return XR8.rafO(t => { XR8.winT = performance.now(); if (o.done) return; o.done = true; cb(t); });
  };
  { const sc0 = setupCamera; setupCamera = function(dt){ sc0.apply(this, arguments); if (XR8.active && XR8.pose) XR8.safe(() => XR8.postCam(), 'cam'); }; }
  { const r0 = render; render = function(dt, now){ if (XR8.active && XR8.xf && XR8.pose){ let ok = false; XR8.safe(() => { ok = XR8.draw(dt, now); }, 'draw'); if (ok) return; } return r0.apply(this, arguments); }; }
  if (typeof NJ !== 'undefined'){ const it0 = NJ.items; NJ.items = function(L){ const n0 = L ? L.length : 0, r = it0.apply(this, arguments); if (XR8.active) XR8.safe(() => XR8.ownKatana(L, n0), 'items'); return r; }; }
}
