// =====================================================================
//  v7.2gfx — ЗВУК (всё синтез WebAudio, без файлов): акустика места (открыто / кратер / шахта: реверб и эхо),
//  дальность (глухие дальние выстрелы, запоздание дальних взрывов), взрывы с низами, хвостом и осыпью,
//  слой затвора у своего оружия, рикошеты, разброс высоты (нет «пулемётной» одинаковости), шаги по поверхностям
//  (порода / металл площадок / лёд кратеров / гулкая шахта), ранец (рокот, треск, поджиг), моторы техники
//  и чужие ранцы позиционно, эмбиент метеорита (ветер, дальний бой, скрип), шум рации под голосом.
//  Включено вместе с графикой: SET.gfx72 (Настройки → «Графика и звук: v7.1 / новая»).
//  Хуки: только обёртки методов AU (audio.js не правится).
// =====================================================================
let A72S = 0x51f15e7; const A72R = () => { A72S ^= A72S << 13; A72S ^= A72S >>> 17; A72S ^= A72S << 5; return (A72S >>> 0) / 4294967296; };
const A72U = () => { const z = A72R() * 2 - 1, a = A72R() * 6.2831853, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
const A72 = {
  ctx: null, env: { k: 'open', vk: 0.75, echo: 0 }, envForce: null, far: 0, creakT: 8, wasJet: false, dripT: 3,
  on(){ return SET.gfx72 !== false; },
  // ---- узлы (создаются лениво: AudioContext появляется только после жеста пользователя)
  ensure(){
    const C = AU.ctx; if (!C) return false;
    if (this.ctx === C) return true;
    this.ctx = C;
    const N = (C.sampleRate * 2.6) | 0, ir = C.createBuffer(2, N, C.sampleRate);   // длинный «шахтный» хвост: плотный, с ранними отражениями
    for (let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for (let i = 0; i < N; i++){ const x = i / N; d[i] = (A72R() * 2 - 1) * Math.pow(1 - x, 2.2) * (x < 0.04 ? 1.6 : 1); } }
    this.verbL = C.createConvolver(); this.verbL.buffer = ir;
    const vl = C.createBiquadFilter(); vl.type = 'lowpass'; vl.frequency.value = 2600;
    this.verbLG = C.createGain(); this.verbLG.gain.value = 0.5;
    this.verbL.connect(vl); vl.connect(this.verbLG); this.verbLG.connect(AU.slowF);
    // эхо (кратер — короткий «хлопок» от стен, шахта — повторы)
    this.echoIn = C.createGain(); this.echoD = C.createDelay(1.0); this.echoD.delayTime.value = 0.14;
    this.echoFb = C.createGain(); this.echoFb.gain.value = 0.25;
    const el = C.createBiquadFilter(); el.type = 'lowpass'; el.frequency.value = 1800;
    this.echoOut = C.createGain(); this.echoOut.gain.value = 0.55;
    this.echoIn.connect(this.echoD); this.echoD.connect(el); el.connect(this.echoFb); this.echoFb.connect(this.echoD); el.connect(this.echoOut); this.echoOut.connect(AU.slowF);
    const loop = (buf, type, f, q) => { const s = C.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = A72R(); const fl = C.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; const g = C.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); s.start(); return { s, f: fl, g }; };
    // ранец: рокот и треск
    this.jl = loop(AU.brown, 'lowpass', 170); this.jl.g.connect(AU.sfx);
    this.jc = loop(AU.noise, 'highpass', 3200); this.jc.g.connect(AU.sfx);
    // эмбиент: ветер (две полосы с медленным «дыханием»), дальний бой (низкий гул)
    this.w1 = loop(AU.noise, 'bandpass', 420, 0.6); this.w1.g.connect(AU.master);
    this.w2 = loop(AU.noise, 'bandpass', 1300, 1.4); this.w2.g.connect(AU.master);
    this.rb = loop(AU.brown, 'lowpass', 85); this.rb.g.connect(AU.master);
    // рация: шум полосы под голосом
    this.rs = loop(AU.noise, 'bandpass', 1900, 0.9); this.rs.g.connect(AU.master);
    // позиционные петли: ближайшая чужая машина, ближайший чужой ранец
    this.vp = AU.mkPanner([0, 0, 0]); this.vp.refDistance = 8;
    const o1 = C.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 34;
    const o2 = C.createOscillator(); o2.type = 'square'; o2.frequency.value = 17;
    this.vf = C.createBiquadFilter(); this.vf.type = 'lowpass'; this.vf.frequency.value = 260;
    this.vg = C.createGain(); this.vg.gain.value = 0;
    o1.connect(this.vf); o2.connect(this.vf); this.vf.connect(this.vg); this.vg.connect(this.vp); o1.start(); o2.start(); this.vo1 = o1; this.vo2 = o2;
    this.vt = loop(AU.noise, 'bandpass', 1100, 2.5); this.vt.g.disconnect(); this.vt.g.connect(this.vp);   // лязг гусениц/подвески
    this.up = AU.mkPanner([0, 0, 0]); this.up.refDistance = 4;
    this.uj = loop(AU.noise, 'bandpass', 600, 0.8); this.uj.g.disconnect(); this.uj.g.connect(this.up);
    return true;
  },
  // ---- где камера: открыто / кратер / шахта (стратегия — сухо и широко)
  envOf(){
    if (this.envForce) return this.envForce;
    if (!S.cam || S.mode !== 'fps' || S.attract) return 'rts';
    const p = S.cam.pos, r = len(p);
    if ((typeof underground === 'function' && underground(p)) || (typeof inShaft === 'function' && inShaft(p) && r < RM - 4)) return 'tunnel';
    const gr = groundR(norm(p));
    if (gr < RM - 4 && r - gr < 12) return 'crater';
    return 'open';
  },
  ENV: { open: { vk: 0.7, echo: 0, d: 0.14, fb: 0.2, wind: 1 }, crater: { vk: 1.15, echo: 0.55, d: 0.13, fb: 0.28, wind: 0.6 }, tunnel: { vk: 1.7, echo: 0.6, d: 0.23, fb: 0.5, wind: 0 }, rts: { vk: 0.55, echo: 0, d: 0.14, fb: 0.2, wind: 0.5 } },
  surface(pos){
    if (!pos) return 'rock';
    const n = norm(pos), r = len(pos);
    for (const b of BASES) if (dot(n, b) > PAD_B[0] + 0.002) return 'metal';
    for (const c of CPD) if (dot(n, c) > PAD_C[0] + 0.0006) return 'metal';
    if (typeof inShaft === 'function' && inShaft(pos) && r < RM - 6) return 'tunnel';
    if (r < RM - 3) return 'ice';
    return 'rock';
  },
  pv(){ AU._pv = 0.92 + A72R() * 0.16; },
};
// ---- разброс высоты для всех синтезированных звуков (AU._pv ставят обёртки ниже)
{ const nz0 = AU.nz, osc0 = AU.osc;
  AU.nz = function(out, t, dur, type, f0, f1, q, vol, att){ const k = this._pv || 1; return nz0.call(this, out, t, dur, type, f0 * k, f1 ? f1 * k : f1, q, vol, att); };
  AU.osc = function(out, t, dur, type, f0, f1, vol, att){ const k = this._pv || 1; return osc0.call(this, out, t, dur, type, f0 * k, f1 ? f1 * k : f1, vol, att); }; }
// ---- выход звука: глушение дальних, акустика места
{ const out0 = AU.out;
  AU.out = function(pos, verb){
    if (!A72.on() || !A72.ensure()) return out0.call(this, pos, verb);
    const C = this.ctx, E = A72.env;
    let node = pos ? this.mkPanner(pos) : this.sfx;
    if (pos && S.cam){
      const d = dist(pos, S.cam.pos);
      if (d > 22){ const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = clamp(17000 * Math.exp(-(d - 22) / 85), 650, 17000); f.Q.value = 0.5; f.connect(node); node = f; }
    }
    const v = (verb || 0) * E.vk;
    if (v <= 0 && !E.echo) return node;
    const g = C.createGain(); g.connect(node);
    if (v > 0){ const s = C.createGain(); s.gain.value = E.k === 'tunnel' ? v * 0.55 : v; g.connect(s); s.connect(E.k === 'tunnel' ? A72.verbL : this.verb); }
    if (E.echo && (verb || 0) > 0.05){ const e = C.createGain(); e.gain.value = E.echo * min(1, verb * 1.6); g.connect(e); e.connect(A72.echoIn); }
    return g;
  }; }
// ---- обёртки звуков
{ const W = (name, fn) => { const f0 = AU[name]; AU[name] = function(...a){ if (!A72.on() || !this.ctx) return f0.apply(this, a); return fn.call(this, f0, ...a); }; };
  const pvWrap = name => W(name, function(f0, ...a){ A72.pv(); try { return f0.apply(this, a); } finally { this._pv = 1; } });
  ['die', 'rocket', 'land', 'throwG', 'servo', 'cannon'].forEach(pvWrap);
  W('shot', function(f0, pos, team, kind, gun){
    A72.pv();
    try {
      f0.call(this, pos, team, kind, gun);
      if (kind === 'me' && gun && this.ready()){
        // затвор и «пинок» в плечо: у каждого ствола свой
        const t = this.ctx.currentTime, o = this.sfx, H = gun === 'hmg', P = gun === 'smg';
        this.osc(o, t + (P ? 0.025 : 0.04), 0.022, 'square', H ? 1900 : P ? 3100 : 2500, H ? 1300 : 1900, H ? 0.05 : 0.035);
        this.nz(o, t + (P ? 0.028 : 0.045), 0.03, 'bandpass', H ? 2200 : 3400, 0, 2.5, 0.12);
        this.osc(o, t, H ? 0.12 : 0.07, 'sine', H ? 62 : 85, 38, H ? 0.55 : 0.32, 0.002);
      } else if (kind !== 'me' && pos && S.cam && this.ready()){
        const d = dist(pos, S.cam.pos);
        if (d > 60){ const t = this.ctx.currentTime + min(0.25, d / 600), o = this.out(pos, 0.5); this.nz(o, t, 0.5, 'lowpass', 700, 120, 0.6, 0.18, 0.01); }   // дальний «хлопок» с хвостом
      }
    } finally { this._pv = 1; }
  });
  W('impact', function(f0, pos, hit, cls){
    A72.pv();
    try {
      f0.call(this, pos, hit, cls);
      if (!hit && cls !== 'prop' && A72R() < 0.2 && this.ready()){   // рикошет
        const t = this.ctx.currentTime, o = this.out(pos, 0.15), f = 2600 + A72R() * 2200;
        this.osc(o, t + 0.01, 0.32 + A72R() * 0.2, 'sine', f, f * 0.45, 0.05, 0.004);
      }
    } finally { this._pv = 1; }
  });
  W('boom', function(f0, pos, size){
    if (!this.allow(pos, 650)) return;
    const C = this.ctx, d = S.cam ? dist(pos, S.cam.pos) : 0;
    const t = C.currentTime + min(0.45, d / 360);   // дальний взрыв слышен с запозданием
    const out = this.out(pos, 0.8), v = min(1.7, 0.6 + size * 0.25), k = 0.9 + A72R() * 0.2;
    if (d < 140) this.nz(out, t, 0.05, 'highpass', 2200 * k, 900, 0.5, v * 0.55, 0.001);                 // треск фронта
    this.nz(out, t, 0.45 + size * 0.28, 'lowpass', 2400 * k, 150, 0.7, v, 0.004);                         // тело
    this.osc(out, t, 1.1 + size * 0.25, 'sine', 56 * k, 24, v * 1.05, 0.008);                             // низ
    this.nz(out, t + 0.07, 1.6 + size * 0.5, 'lowpass', 460, 60, 0.6, v * 0.5, 0.15);                     // перекатывающийся хвост
    const nd = min(9, 3 + floor(size * 1.5));
    for (let i = 0; i < nd; i++) this.nz(out, t + 0.3 + A72R() * (0.6 + size * 0.15), 0.04 + A72R() * 0.07, 'bandpass', 900 + A72R() * 3000, 0, 3, 0.05 + 0.05 * A72R(), 0.002);   // осыпь
    if (d < 60) this.osc(this.sfx, t, 0.8, 'sine', 36, 17, 1.0 * (1 - d / 70), 0.02);                      // удар в грудь
    if (d > 160) this.nz(out, t + 0.4, 1.4, 'lowpass', 320, 70, 0.5, v * 0.35, 0.25);                       // раскат вдали
    if (d > 120) A72.far = min(1, A72.far + 0.25 * size / 3);
  });
  W('step', function(f0, pos, heavy, mine){
    if (!this.allow(mine ? null : pos, 30)) return;
    const t = this.ctx.currentTime, out = this.out(mine ? null : pos, 0.04), v = mine ? 0.2 : 0.32, s = A72.surface(pos);
    A72.pv();
    try {
      if (s === 'metal'){
        this.nz(out, t, 0.04, 'bandpass', 2300, 1500, 3, v * 0.5, 0.001);
        this.osc(out, t, 0.11, 'triangle', heavy ? 170 : 220, 120, v * 0.55, 0.002);
        this.osc(out, t + 0.005, 0.08, 'square', 3300, 2900, v * 0.04);
      } else if (s === 'ice'){
        this.nz(out, t, 0.07, 'highpass', 3600, 2200, 0.7, v * 0.45, 0.003);
        this.nz(out, t + 0.02, 0.05, 'bandpass', 1500, 900, 1.5, v * 0.35);
        this.osc(out, t, 0.06, 'triangle', heavy ? 110 : 140, 70, v * 0.5);
      } else if (s === 'tunnel'){
        this.nz(out, t, 0.06, 'bandpass', 420, 220, 1.2, v * 0.8);
        this.osc(out, t, 0.12, 'triangle', heavy ? 90 : 115, 50, v * 0.8);
      } else {   // порода: хруст мелкой крошки
        for (let i = 0; i < 3; i++) this.nz(out, t + i * 0.012 + A72R() * 0.01, 0.035, 'bandpass', 700 + A72R() * 1400, 0, 1.8, v * 0.45, 0.002);
        this.osc(out, t, 0.08, 'triangle', heavy ? 92 : 125, 55, v * 0.65);
      }
    } finally { this._pv = 1; }
  });
}
// ---- петли: акустика, ранец, техника, эмбиент, рация
{ const fr0 = AU.frame;
  AU.frame = function(dt){
    fr0.call(this, dt);
    if (!this.ctx || !S.cam) return;
    const C = this.ctx, t = C.currentTime;
    if (!A72.on()){ if (A72.ctx === C) for (const g of [A72.jl.g, A72.jc.g, A72.w1.g, A72.w2.g, A72.rb.g, A72.rs.g, A72.vg, A72.vt.g, A72.uj.g]) g.gain.setTargetAtTime(0, t, 0.1); A72.env = { k: 'open', vk: 1, echo: 0 }; return; }
    if (!A72.ensure()) return;
    const k = A72.envOf(), E = A72.ENV[k];
    A72.env = { k, vk: E.vk, echo: E.echo };
    A72.echoD.delayTime.setTargetAtTime(E.d, t, 0.3); A72.echoFb.gain.setTargetAtTime(E.fb, t, 0.3);
    const fps = S.mode === 'fps' && !S.attract, me = ctrlEntity();
    // свой ранец: рокот + треск + поджиг/отсечка
    const jet = fps && me && me.cls === 'inf' && me.thrusting;
    A72.jl.g.gain.setTargetAtTime(jet ? 0.5 : 0, t, jet ? 0.03 : 0.12);
    A72.jc.g.gain.setTargetAtTime(jet ? 0.05 + 0.05 * A72R() : 0, t, 0.02);
    if (jet && !A72.wasJet && this.ready()){ this.nz(this.sfx, t, 0.3, 'bandpass', 260, 1300, 0.9, 0.45, 0.01); this.osc(this.sfx, t, 0.22, 'sine', 95, 45, 0.4, 0.005); }
    if (!jet && A72.wasJet && this.ready()) this.nz(this.sfx, t, 0.25, 'highpass', 2500, 900, 0.6, 0.12, 0.005);
    A72.wasJet = !!jet;
    // ближайшая чужая машина и чужой ранец — позиционно
    let nv = null, bv = 70;
    for (const v of S.vehicles){ if (!v.alive || v === me) continue; const dd = dist(v.pos, S.cam.pos); if (dd < bv){ bv = dd; nv = v; } }
    if (nv){ AU.setPos(A72.vp, nv.pos); const sp = len(nv.vel || [0, 0, 0]); const kk = nv.vk === 'raider' ? 1.9 : nv.vk ? 1.25 : 1;
      A72.vg.gain.setTargetAtTime(0.1 + min(0.18, sp * 0.02), t, 0.15); A72.vo1.frequency.setTargetAtTime((30 + sp * 4) * kk, t, 0.15); A72.vo2.frequency.setTargetAtTime((15 + sp * 2) * kk, t, 0.15);
      A72.vt.g.gain.setTargetAtTime(min(0.12, sp * 0.02), t, 0.1); A72.vt.f.frequency.setTargetAtTime(900 + sp * 60, t, 0.1);
    } else { A72.vg.gain.setTargetAtTime(0, t, 0.3); A72.vt.g.gain.setTargetAtTime(0, t, 0.3); }
    let nu = null, bu = 40;
    for (const u of S.units){ if (!u.alive || !u.thrusting || u === me) continue; const dd = dist(u.pos, S.cam.pos); if (dd < bu){ bu = dd; nu = u; } }
    if (nu){ AU.setPos(A72.up, nu.pos); A72.uj.g.gain.setTargetAtTime(0.16, t, 0.05); } else A72.uj.g.gain.setTargetAtTime(0, t, 0.15);
    // эмбиент: ветер дышит, дальний бой гудит, изредка скрипит металл / капает в шахте
    const br = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.053 + 1.3);
    A72.w1.g.gain.setTargetAtTime(E.wind * (0.012 + 0.018 * br), t, 0.6); A72.w1.f.frequency.setTargetAtTime(300 + 200 * br, t, 0.8);
    A72.w2.g.gain.setTargetAtTime(E.wind * 0.005 * br * br, t, 0.6);
    A72.far *= Math.exp(-dt * 0.25);
    A72.rb.g.gain.setTargetAtTime(0.05 + 0.3 * A72.far, t, 0.4);
    if (this.ready() && !S.paused){
      if (k === 'tunnel'){ A72.dripT -= dt; if (A72.dripT <= 0){ A72.dripT = 1.5 + A72R() * 4; const o = this.out(null, 0.9); this.osc(o, t, 0.07, 'sine', 1500 + A72R() * 900, 900, 0.05, 0.002); } }
      else if (fps){ A72.creakT -= dt; if (A72.creakT <= 0){ A72.creakT = 14 + A72R() * 18; const o = this.out(add(S.cam.pos, mul(A72U(), 40)), 0.9); this.osc(o, t, 1.4, 'sawtooth', 70 + A72R() * 40, 55, 0.025, 0.3); this.nz(o, t + 0.2, 1.0, 'bandpass', 500, 300, 6, 0.04, 0.3); } }
    }
    // рация: шум полосы, пока говорит голос
    const talk = (typeof VOICE66 !== 'undefined' && VOICE66.cur) || this.speaking;
    A72.rs.g.gain.setTargetAtTime(talk ? 0.012 + (A72R() < 0.06 ? 0.04 : 0) : 0, t, talk ? 0.02 : 0.08);
  }; }
