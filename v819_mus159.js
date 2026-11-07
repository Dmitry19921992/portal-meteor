// =====================================================================
//  v8.19 (T159) — ADAPTIVE MUSIC: menu theme + battle music that follows the fight. Music by EDMITRY (Dmitry).
//  Menu (main menu / attract): «New Horizon» instrumental, <audio> from a blob (no decode memory), fade in/out.
//  Battle: 16-bar loop of «Side By Side» split into 3 sample-aligned layers that start together and loop forever:
//    L1 calm (synth + keys) → L2 contact (+ bass) → L3 combat (+ drums + FX). The layer level follows a «heat» value
//    (shots / booms near the camera, enemy fire, own hits, damage taken, enemies close by); changes land on the next
//    bar line, a level is held at least one phrase (4 bars), calm stretches «breathe» (music rests, comes back on contact).
//  Mix: after the game's compressor (like the radio), ducks under radio voices / unit voices / heavy SFX, quieter and
//  muffled in pause; silent while Radio Portal Meteor (R79) plays, in a hidden tab, in the end screen fades out.
//  Data: mus159_data.js (MUS159_DATA, base64 MP3s made by D:\AI\pm_mus159\tools from D:\Commercial tracks — copies only).
//  Settings: «Музыка игры (EDMITRY)» volume slider (0 = off), PC after the radio rows, phone ☰ → Settings → Sound.
//  Off completely: ?mus159=0 (no nodes, no decode). Debug: MUS159.dbg() / ?mus159dbg=1 (small heat meter).
//  Hooks (wrappers only, inside this file): AU.process, uixFrame, newMatch, MENU.html_settings, P71M.sec.
// =====================================================================
const MUS159 = {
  off: (() => { try { return new URLSearchParams(location.search).get('mus159') === '0' || typeof MUS159_DATA === 'undefined'; } catch (e){ return typeof MUS159_DATA === 'undefined'; } })(),
  dbgOn: (() => { try { return new URLSearchParams(location.search).get('mus159dbg') === '1'; } catch (e){ return false; } })(),
  D: typeof MUS159_DATA !== 'undefined' ? MUS159_DATA : null,
  ctx: null, out: null, lpf: null, layers: [], t0: 0, bar: 2, started: false, decoding: false, decErr: false,
  menuEl: null, menuSrc: null, menuG: null, menuUrl: '', menuV: 0,
  heat: 0, level: 0, want: 0, holdT: 0, calmT: 0, restT: 0, resting: false, lastBar: -1, gainV: -1, duckV: 1,
  an: null, anBuf: null, recDest: null, err: 0, credT: 0, credTxt: '', credSig: '', ui: null, mode: '', lt: 0,
  safe(f, w){ try { return f(); } catch (e){ if (this.err++ < 4) console.warn('mus159 ' + w, e); } },
  vol(){ const v = +SET.mus159vol; return isFinite(v) ? clamp(v, 0, 1) : 0.5; },
  tut(){ return (typeof TUT !== 'undefined' && TUT.on) || (typeof T72 !== 'undefined' && T72.on); },
  radioOn(){ return typeof R79 !== 'undefined' && !R79.off && R79.on && (R79.st === 'play' || R79.st === 'load'); },
  speaking(){ return !S.attract && !!(AU.speaking || (typeof VOICE66 !== 'undefined' && VOICE66.cur)); },   // the menu has no radio talk (a stale flag from the battle must not duck the theme)
  b64(s){ const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; },
  // ---------------------------------------------------------------- graph: music bus after the compressor (never squashes SFX)
  ensure(){
    const C = AU.ctx; if (!C) return false;
    if (this.ctx === C) return true;
    this.ctx = C;
    this.out = C.createGain(); this.out.gain.value = 0;
    this.lpf = C.createBiquadFilter(); this.lpf.type = 'lowpass'; this.lpf.frequency.value = 20000; this.lpf.Q.value = 0.6;
    this.lpf.connect(this.out); this.out.connect(C.destination);
    if (AU.sfx){ this.an = C.createAnalyser(); this.an.fftSize = 512; this.anBuf = new Float32Array(this.an.fftSize); AU.sfx.connect(this.an); }
    return true;
  },
  // battle layers: decode once (lazy, first battle), start all three on the same time so they stay sample-aligned
  decode(){
    if (this.decoding || this.layers.length || this.decErr || !this.ensure()) return;
    this.decoding = true;
    const C = this.ctx, D = this.D, keys = ['l1', 'l2', 'l3'];
    const one = k => new Promise((ok, no) => { const ab = this.b64(D[k]).buffer; const p = C.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
    Promise.all(keys.map(one)).then(bufs => {
      this.decoding = false;
      const sr = D.sr || 44100, n = D.n, t0 = C.currentTime + 0.12;
      this.bar = 240 / D.bpm;
      this.layers = bufs.map((b, i) => {
        const s = C.createBufferSource(), g = C.createGain(), lead = (D.lead && D.lead[i]) || 0;
        s.buffer = b; s.loop = true; s.loopStart = lead / sr; s.loopEnd = Math.min(b.duration, (lead + n) / sr);
        g.gain.value = 0; s.connect(g); g.connect(this.lpf); s.start(t0, lead / sr);
        return { s, g, v: 0 };
      });
      this.t0 = t0; this.started = true; this.lastBar = -1;
    }, e => { this.decoding = false; this.decErr = true; if (this.err++ < 4) console.warn('mus159 decode', e); });
  },
  // menu theme: <audio> + blob url, looped, through the same bus
  menuElem(){
    if (this.menuEl || !this.ensure()) return this.menuEl;
    const a = this.menuEl = new Audio(); a.loop = true; a.preload = 'auto'; a.setAttribute('playsinline', '');
    this.menuUrl = URL.createObjectURL(new Blob([this.b64(this.D.menu)], { type: 'audio/mpeg' }));
    a.src = this.menuUrl;
    this.menuSrc = this.ctx.createMediaElementSource(a);
    this.menuG = this.ctx.createGain(); this.menuG.gain.value = 0;
    this.menuSrc.connect(this.menuG); this.menuG.connect(this.lpf);
    return a;
  },
  // ---------------------------------------------------------------- heat: what happens around the camera
  feel(events){
    if (S.attract || !S.cam) return;
    const cp = S.cam.pos, me = typeof ctrlEntity === 'function' ? ctrlEntity() : null, rts = S.mode === 'rts';
    const R = rts ? 140 : 75;
    let h = 0;
    for (const e of events){
      const d = e.pos ? dist(e.pos, cp) : 0;
      switch (e.type){
        case 'shot': if (e.me) h += 0.012; else if (d < R) h += (e.team !== 0 ? 0.025 : 0.01) * (e.heavy ? 1.6 : 1) * (1 - d / R * 0.6); break;
        case 'boom': if (d < R * 1.4) h += 0.16 * (e.size || 1) * (1 - d / (R * 1.4) * 0.6); break;
        case 'hitmark': h += 0.05; break;
        case 'whiz': h += 0.1; break;
        case 'rocket': case 'cannon': if (!e.pos || d < R) h += 0.08; break;
      }
    }
    if (me && S.dmgT > 0) h += S.dmgT * 0.06;
    this.heat = Math.min(1.6, this.heat + h);
  },
  nearFoes(){
    if (!S.cam || !S.units) return 0;
    const cp = S.cam.pos, R2 = (S.mode === 'rts' ? 90 : 55) ** 2; let n = 0;
    for (const u of S.units){ if (!u.alive || u.team === 0) continue; const dx = u.pos[0] - cp[0], dy = u.pos[1] - cp[1], dz = u.pos[2] - cp[2]; if (dx * dx + dy * dy + dz * dz < R2 && ++n >= 6) break; }
    return n;
  },
  // ---------------------------------------------------------------- per frame (uixFrame: also in menus and pause)
  step(dt){
    const C = AU.ctx;
    if (!C || C.state !== 'running' || !this.ensure()) return;
    const t = C.currentTime, menu = !!S.attract, hidden = document.visibilityState === 'hidden';
    const paused = typeof MENU !== 'undefined' && MENU.isOpen() && !menu;
    const userV = this.vol() * (AU.on ? 1 : 0) * (AU.vol > 0 ? Math.min(1, AU.vol / 0.9) : 0);
    const silent = hidden || this.radioOn() || userV <= 0.001;
    this.mode = menu ? 'menu' : S.over ? 'end' : 'battle';
    // heat decay (~5 s), floor from enemies close by
    this.heat *= Math.exp(-dt / 5);
    let floor = 0;
    if (!menu && !S.over){ const n = this.nearFoes(); floor = n ? 0.22 + Math.min(n, 6) * 0.06 : 0; }
    const hv = Math.max(this.heat, floor);
    const want = S.over || menu ? 0 : hv > 0.62 ? 2 : hv > 0.2 ? 1 : 0;
    // calm «breathing»: ~100 s of calm → rest 35–60 s; contact ends the rest at once
    if (!menu && !S.over){
      if (want === 0 && !this.resting){ this.calmT += dt; if (this.calmT > 100){ this.resting = true; this.restT = 35 + Math.random() * 25; } }
      else if (want > 0){ this.calmT = 0; this.resting = false; }
      if (this.resting){ this.restT -= dt; if (this.restT <= 0){ this.resting = false; this.calmT = 0; } }
    }
    // battle layers: decode on the first battle frame
    if (!menu && !this.layers.length && !silent) this.decode();
    if (this.started){
      const bi = Math.floor((t - this.t0) / this.bar);
      this.holdT -= dt;
      if (bi !== this.lastBar){   // bar line: commit level changes (up at once, down only after the hold)
        this.lastBar = bi;
        if (want > this.level || (want < this.level && this.holdT <= 0)){ this.level = want; this.holdT = this.bar * 4; }
      }
      const tut = this.tut(), on = !menu && !S.over && !this.resting;
      const tg = [on ? 1 : 0, on && this.level >= 1 ? 0.95 : 0, on && this.level >= 2 && !tut ? 0.9 : 0];
      const nb = this.t0 + (bi + 1) * this.bar;
      for (let i = 0; i < 3; i++){
        const L = this.layers[i];
        if (Math.abs(tg[i] - L.v) < 0.01) continue;
        const up = tg[i] > L.v; L.v = tg[i];
        try { L.g.gain.cancelScheduledValues(t); L.g.gain.setValueAtTime(L.g.gain.value, t);
          if (up && i > 0){ L.g.gain.setValueAtTime(L.g.gain.value, Math.max(t, nb - 0.02)); L.g.gain.linearRampToValueAtTime(L.v, nb + this.bar / 4); }   // enters on the downbeat
          else L.g.gain.setTargetAtTime(L.v, t, up ? 0.8 : (i === 0 ? 2.2 : 1.4)); } catch (e){ L.g.gain.value = L.v; }
      }
    }
    // menu theme
    const mOn = menu && !silent;
    if (mOn && !this.menuEl) this.menuElem();
    if (this.menuEl){
      if (mOn && this.menuEl.paused){ const p = this.menuEl.play(); if (p && p.catch) p.catch(() => {}); this.cred(tr('♪ EDMITRY — New Horizon', '♪ EDMITRY — New Horizon', '♪ EDMITRY — New Horizon', '♪ EDMITRY — New Horizon')); }
      const mv = mOn ? 0.85 : 0;
      if (Math.abs(mv - this.menuV) > 0.005){ this.menuV = mv; try { this.menuG.gain.setTargetAtTime(mv, t, mOn ? 1.2 : 0.5); } catch (e){ this.menuG.gain.value = mv; } }
      if (!mOn && !this.menuEl.paused && this.menuG.gain.value < 0.01) this.menuEl.pause();
    }
    // credit once per match when the battle music first comes in
    if (this.started && !menu && !this.credDone && this.layers[0].v > 0 && !silent){ this.credDone = true; this.cred('♪ EDMITRY — Side By Side'); }
    // ducking: voices (−6 dB), loud SFX (up to −4 dB); pause: quieter + muffled
    let dk = 1;
    if (this.an){
      this.an.getFloatTimeDomainData(this.anBuf);
      let s = 0; for (let i = 0; i < this.anBuf.length; i += 4){ const x = this.anBuf[i]; s += x * x; }
      const rms = Math.sqrt(s / (this.anBuf.length / 4));   // only transients above the running battle level duck the music (steady fire / engines don't)
      this.sfxAvg = (this.sfxAvg || 0) + (rms - (this.sfxAvg || 0)) * Math.min(1, dt * 0.4);
      this.sfxRms = rms;
      dk = 1 - 0.37 * clamp((rms - Math.max(0.06, this.sfxAvg * 1.4)) / 0.25, 0, 1);
    }
    if (this.speaking()) dk = Math.min(dk, 0.5);
    const k = dk < this.duckV ? 1 - Math.exp(-dt * 20) : 1 - Math.exp(-dt * 1.2);
    this.duckV += (dk - this.duckV) * k;
    const v = silent ? 0 : userV * 0.7 * this.duckV * (paused ? 0.55 : 1);
    if (Math.abs(v - this.gainV) > 0.002){ this.gainV = v; try { this.out.gain.setTargetAtTime(v, t, silent ? 0.6 : 0.12); } catch (e){ this.out.gain.value = v; } }
    const lf = paused ? 900 : 20000;
    if (this.lpfV !== lf){ this.lpfV = lf; try { this.lpf.frequency.setTargetAtTime(lf, t, 0.25); } catch (e){ this.lpf.frequency.value = lf; } }
    // devlog recorder (CAMFX) gets the music too
    if (typeof CAMFX !== 'undefined' && CAMFX.audioDest !== this.recDest){
      try { if (this.recDest) this.out.disconnect(this.recDest); } catch (e){}
      this.recDest = CAMFX.audioDest || null; if (this.recDest) try { this.out.connect(this.recDest); } catch (e){}
    }
    if (this.credT > 0) this.credT -= dt;
    this.hv = hv; this.want = want;
  },
  cred(txt){ this.credTxt = txt; this.credT = 4.5; },
  // small credit line (and the debug heat meter)
  render(){
    if (!this.ui){ const el = this.ui = document.createElement('div'); el.id = 'mus159'; document.body.appendChild(el); }
    const show = this.credT > 0 && (!(typeof MENU !== 'undefined' && MENU.isOpen()) || S.attract);
    const dbg = this.dbgOn ? `<i>heat ${(this.hv || 0).toFixed(2)} · want ${this.want} · lvl ${this.level}${this.resting ? ' · rest' : ''} · ${this.mode}</i>` : '';
    const sig = (show ? this.credTxt + (this.credT > 0.8 ? 1 : 0) : '') + dbg + (TOUCH.on ? 'p' : '') + (S.attract ? 'm' : '');
    if (sig === this.credSig) return; this.credSig = sig;
    this.ui.className = (show && this.credT > 0.8 ? 'on' : '') + (TOUCH.on ? ' ph' : '') + (S.attract ? ' mn' : '');
    this.ui.innerHTML = (show ? `<b>${uixEsc(this.credTxt)}</b>` : '') + dbg;
    this.ui.style.display = show || dbg ? 'block' : 'none';
  },
  dbg(){ this.dbgOn = !this.dbgOn; this.credSig = ''; return { heat: this.heat, hv: this.hv, want: this.want, level: this.level, resting: this.resting, started: this.started, mode: this.mode, gain: this.gainV, layers: this.layers.map(L => L.v), menu: this.menuEl ? !this.menuEl.paused : false }; },
};
if (!MUS159.off){
  // settings default (half volume; 0 = off)
  if (typeof SET_DEF !== 'undefined' && SET_DEF.mus159vol === undefined) SET_DEF.mus159vol = 0.5;
  if (SET.mus159vol === undefined) SET.mus159vol = 0.5;
  // events → heat (AU.process runs every frame with this frame's battle events)
  { const p0 = AU.process; AU.process = function(ev){ const r = p0.apply(this, arguments); MUS159.safe(() => MUS159.feel(ev), 'feel'); return r; }; }
  { const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); const n = performance.now(), d = Math.min((n - (MUS159.lt || n)) / 1000, 0.5); MUS159.lt = n; MUS159.safe(() => MUS159.step(d), 'step'); MUS159.safe(() => MUS159.render(), 'ui'); }; }
  { const nm0 = newMatch; newMatch = function(o){ const r = nm0.apply(this, arguments); MUS159.heat = 0; MUS159.level = 0; MUS159.calmT = 0; MUS159.resting = false; MUS159.credDone = false; return r; }; }
  // the audio context needs a gesture: the first tap / key in the main menu starts the menu theme
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, () => { if (!AU.ctx) MUS159.safe(() => AU.init(), 'init'); }, { capture: true, passive: true, once: true });
  // settings rows: PC (after the radio rows / «voice of hints»), phone (☰ → Settings → Sound)
  MUS159.setRows = function(phone){
    const v = Math.round(this.vol() * 100), lab = tr('Музыка игры (EDMITRY): меню и бой', 'Game music (EDMITRY): menu and battle', 'Nhạc game (EDMITRY): menu và trận', 'מוזיקת המשחק (EDMITRY)');
    if (phone) return `<div class="p71s"><button data-mus159v="-1">${IC71('minus')}</button><span><small>${lab}</small><b>${v ? v + '%' : L71('off')}</b></span><button data-mus159v="1">${IC71('plus')}</button></div>`;
    return `<div class="row"><label>${lab}</label><input type="range" data-sl="mus159vol" min="0" max="1" step="0.05" value="${this.vol()}"><span class="val" id="v_mus159vol">${this.vol()}</span></div>`;
  };
  { const hs0 = MENU.html_settings;
    MENU.html_settings = function(){
      const h = hs0.apply(this, arguments);
      if (typeof P71M !== 'undefined' && P71M.on && P71M.on()) return h;
      const r2 = /(<button class="tog[^"]*" data-tog="r79auto">[^<]*<\/button><\/div>)/, re = /(<button class="tog[^"]*" data-tog="hintsVoice">[^<]*<\/button><\/div>)/;
      return r2.test(h) ? h.replace(r2, '$1' + MUS159.setRows(false)) : re.test(h) ? h.replace(re, '$1' + MUS159.setRows(false)) : h;
    }; }
  if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_snd') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + MUS159.setRows(true)); return h; }; }
  { let at = -1e9;   // phone volume −/+ (tap or click, deduped)
    const go = b => { if (performance.now() - at < 400) return; at = performance.now(); AU.init(); SET.mus159vol = Math.round(clamp(MUS159.vol() + (+b.dataset.mus159v) * 0.1, 0, 1) * 20) / 20; if (MENU.save) MENU.save(); emit('ui', { kind: 'ok' }); if (MENU.cur) MENU.show(MENU.cur); };
    document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-mus159v]'); if (!b) return; e.stopPropagation(); e.preventDefault(); go(b); }, true);
    document.addEventListener('touchend', e => { const b = e.target && e.target.closest && e.target.closest('[data-mus159v]'); if (!b) return; e.stopPropagation(); if (e.cancelable) e.preventDefault(); go(b); }, { capture: true, passive: false });
  }
  (function mus159CSS(){
    const st = document.createElement('style');
    st.textContent = `
#mus159{position:fixed;left:50%;top:132px;transform:translateX(-50%);z-index:16;display:none;pointer-events:none;font-family:"Exo 2",sans-serif;text-align:center}
#mus159 b{display:inline-block;font:600 12.5px "Exo 2";color:#f4ecd4;letter-spacing:.04em;padding:3px 12px;background:rgba(8,10,16,.55);border:1px solid rgba(255,90,168,.35);border-radius:2px;
  text-shadow:1px 0 rgba(255,40,90,.55),-1px 0 rgba(40,220,255,.55);opacity:0;transition:opacity .8s}
#mus159.on b{opacity:.92}
#mus159.mn{left:auto;right:14px;top:auto;bottom:10px;transform:none} #mus159.ph{top:52px} #mus159.ph.mn{top:auto;bottom:6px} #mus159.ph b{font-size:11px;padding:2px 9px}
#mus159 i{display:block;margin-top:3px;font:600 11px monospace;color:#9fd8ff;font-style:normal;background:rgba(0,0,0,.5);padding:1px 6px}`;
    document.head.appendChild(st);
  })();
}
