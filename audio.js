// =====================================================================
//  ЗВУК: всё синтезируется в браузере (WebAudio), голоса — синтез речи системы
// =====================================================================
const ACKS = {
  ru: { move: ['Есть!', 'Выполняю.', 'Принято.', 'Так точно.', 'Выдвигаемся.', 'Уже идём.'], attack: ['Атакуем!', 'Цель вижу.', 'Огонь по готовности.', 'Работаем!'],
        tank: ['Двигаюсь.', 'Принял. Наводчик готов.', 'Есть, выдвигаюсь.'], abil: ['Есть!', 'Выполняем!', 'Принято, работаем.'], possess: ['На связи.', 'Готов.', 'Слушаю.'] },
  vi: { move: ['Rõ!', 'Đang làm.', 'Đã nhận.', 'Tuân lệnh.', 'Xuất phát.', 'Đang tới.'], attack: ['Tấn công!', 'Thấy mục tiêu.', 'Tự do khai hỏa.', 'Xông lên!'],
        tank: ['Đang tiến.', 'Rõ, pháo thủ sẵn sàng.', 'Tiến lên.'], abil: ['Rõ!', 'Thực hiện!', 'Đã nhận, làm ngay.'], possess: ['Đã kết nối.', 'Sẵn sàng.', 'Tôi nghe.'] },
  en: { move: ['Yes sir!', 'On it.', 'Copy that.', 'Roger.', 'Moving out.', 'On our way.'], attack: ['Engaging!', 'Target sighted.', 'Weapons free.', 'Going in!'],
        tank: ['Rolling.', 'Copy, gunner ready.', 'Moving up.'], abil: ['Roger!', 'Executing!', 'Copy, on it.'], possess: ['Online.', 'Ready.', 'Listening.'] },
};
const AU = {
  ctx: null, on: true, vol: 0.9, master: null, sfx: null, verb: null, noise: null, brown: null, slowF: null,
  starts: 0, startT: 0, radioQ: [], speaking: false, voices: {}, lastCall: {}, ducked: false, lastAck: -99,
  init(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = C.createGain(); this.master.gain.value = this.on ? this.vol : 0;
      const comp = C.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.25;
      this.master.connect(comp); comp.connect(C.destination);
      // замедление: низкочастотный фильтр на все эффекты
      this.slowF = C.createBiquadFilter(); this.slowF.type = 'lowpass'; this.slowF.frequency.value = 20000; this.slowF.Q.value = 0.5;
      this.slowF.connect(this.master);
      this.sfx = C.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.slowF);
      this.verb = C.createConvolver();
      const L = C.sampleRate * 1.8, ir = C.createBuffer(2, L, C.sampleRate);
      for (let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3.2); }
      this.verb.buffer = ir;
      const vg = C.createGain(); vg.gain.value = 0.28; this.verb.connect(vg); vg.connect(this.slowF);
      const N = C.sampleRate * 2;
      this.noise = C.createBuffer(1, N, C.sampleRate);
      const nd = this.noise.getChannelData(0); for (let i = 0; i < N; i++) nd[i] = Math.random() * 2 - 1;
      this.brown = C.createBuffer(1, N, C.sampleRate);
      const bd = this.brown.getChannelData(0); let last = 0;
      for (let i = 0; i < N; i++){ last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
      const amb = C.createBufferSource(); amb.buffer = this.brown; amb.loop = true;
      const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      this.ambG = C.createGain(); this.ambG.gain.value = 0.16;
      amb.connect(lp); lp.connect(this.ambG); this.ambG.connect(this.master); amb.start();
      const hum = C.createOscillator(); hum.type = 'sine'; hum.frequency.value = 47;
      const hg = C.createGain(); hg.gain.value = 0.025; hum.connect(hg); hg.connect(this.master); hum.start();
      const jn = C.createBufferSource(); jn.buffer = this.noise; jn.loop = true;
      const jbp = C.createBiquadFilter(); jbp.type = 'bandpass'; jbp.frequency.value = 520; jbp.Q.value = 0.6;
      this.jetG = C.createGain(); this.jetG.gain.value = 0;
      jn.connect(jbp); jbp.connect(this.jetG); this.jetG.connect(this.sfx); jn.start();
      this.jetF = jbp;
      const eo = C.createOscillator(); eo.type = 'sawtooth'; eo.frequency.value = 36;
      const eo2 = C.createOscillator(); eo2.type = 'square'; eo2.frequency.value = 18;
      const elp = C.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 240;
      this.engG = C.createGain(); this.engG.gain.value = 0;
      eo.connect(elp); eo2.connect(elp); elp.connect(this.engG); this.engG.connect(this.sfx); eo.start(); eo2.start();
      this.engO = eo; this.engO2 = eo2;
      const d1 = C.createOscillator(); d1.type = 'sawtooth'; d1.frequency.value = 172;
      const d2 = C.createOscillator(); d2.type = 'sawtooth'; d2.frequency.value = 176.5;
      const dbp = C.createBiquadFilter(); dbp.type = 'bandpass'; dbp.frequency.value = 900; dbp.Q.value = 1.2;
      this.dronePan = this.mkPanner([0, 0, 0]);
      this.droneG = C.createGain(); this.droneG.gain.value = 0;
      d1.connect(dbp); d2.connect(dbp); dbp.connect(this.droneG); this.droneG.connect(this.dronePan); d1.start(); d2.start();
      // сердцебиение в рефлексе
      this.heartG = C.createGain(); this.heartG.gain.value = 0; this.heartG.connect(this.master);
      this.heartT = 0;
      // гул орбитального луча
      const ob = C.createOscillator(); ob.type = 'sawtooth'; ob.frequency.value = 55;
      const obf = C.createBiquadFilter(); obf.type = 'lowpass'; obf.frequency.value = 400;
      this.orbG = C.createGain(); this.orbG.gain.value = 0;
      ob.connect(obf); obf.connect(this.orbG); this.orbG.connect(this.sfx); ob.start(); this.orbO = ob;
      this.pickVoice();
      if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => this.pickVoice();
    } catch (e){ console.warn('audio off', e); this.ctx = null; }
  },
  pickVoice(){
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    const FEM = /irina|svetlana|dariya|ekaterina|female|жен|zira|aria|jenny|hazel|susan|samantha|libby|sonia|hoaimy|hoai|linh|mai|google русский|google us english/i;
    const MAL = /pavel|dmitr|male|муж|david|mark|guy|george|ryan|james|an\b|namminh|nam minh/i;
    const pick = (re) => {
      const L = vs.filter(v => re.test(v.lang));
      const f = L.find(v => FEM.test(v.name) && !/male/i.test(v.name.replace(/female/i, ''))) || null;
      const m = L.find(v => MAL.test(v.name) && v !== f) || null;
      return { f: f || L[0] || null, m: m || L.find(v => v !== f) || L[0] || null, any: L.length };
    };
    // голос игры (рация, стратег) — женский; подсказки по управлению — мужской
    this.voices.ru = pick(/^ru/i); this.voices.en = pick(/^en/i); this.voices.vi = pick(/^vi/i);
  },
  setVol(v){ this.vol = v; if (this.master) this.master.gain.value = this.on ? v * (this.ducked ? 0.35 : 1) : 0; },
  duck(on){ this.ducked = on; this.setVol(this.vol); },
  toggle(){
    this.on = !this.on;
    this.setVol(this.vol);
    if (!this.on && window.speechSynthesis) speechSynthesis.cancel();
  },
  ready(){ return this.ctx && this.on && this.ctx.state === 'running'; },
  allow(pos, maxD){
    const now = this.ctx.currentTime;
    if (now - this.startT > 0.1){ this.startT = now; this.starts = 0; }
    if (this.starts > 12) return false;
    if (pos && S.cam && dist(pos, S.cam.pos) > maxD) return false;
    this.starts++;
    return true;
  },
  mkPanner(pos){
    const p = this.ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
    p.refDistance = 5; p.maxDistance = 600; p.rolloffFactor = 1.1;
    this.setPos(p, pos);
    p.connect(this.sfx);
    return p;
  },
  setPos(p, pos){
    if (p.positionX){ p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; }
    else p.setPosition(pos[0], pos[1], pos[2]);
  },
  out(pos, verb){
    const node = pos ? this.mkPanner(pos) : this.sfx;
    if (verb){
      const s = this.ctx.createGain(); s.gain.value = verb;
      s.connect(this.verb);
      const g = this.ctx.createGain(); g.connect(node); g.connect(s);
      return g;
    }
    return node;
  },
  nz(out, t, dur, type, f0, f1, q, vol, att){
    const C = this.ctx;
    const n = C.createBufferSource(); n.buffer = this.noise;
    const f = C.createBiquadFilter(); f.type = type; f.Q.value = q || 0.7;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = C.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (att || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(out);
    n.start(t, Math.random() * 1.5, dur + 0.05);
  },
  osc(out, t, dur, type, f0, f1, vol, att){
    const C = this.ctx;
    const o = C.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = C.createGain();
    if (att){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  },
  // ---------------- звуки
  shot(pos, team, kind, gun){
    const me = kind === 'me';
    if (!this.allow(me ? null : pos, 230)) return;
    const t = this.ctx.currentTime;
    if (me && gun){
      // v6: свой выстрел — три слоя: щелчок затвора, «тело» с низким ударом, хвост эха; у каждого ствола свой характер
      const out = this.out(null, 0.32);
      const H = gun === 'hmg', P = gun === 'smg';
      const v = H ? 0.62 : P ? 0.42 : 0.5;
      this.nz(out, t, 0.018, 'highpass', P ? 5200 : 4200, 0, 0.7, v * 0.7, 0.001);                          // щелчок
      this.nz(out, t, H ? 0.12 : 0.07, 'bandpass', H ? 900 : P ? 1900 : 1400, H ? 260 : 600, 0.9, v, 0.002);   // тело
      this.osc(out, t, H ? 0.16 : 0.09, 'sine', H ? 120 : P ? 190 : 150, 38, v * (H ? 1.25 : 0.95), 0.002);     // удар
      this.nz(out, t + 0.01, H ? 0.4 : 0.26, 'lowpass', 1100, 140, 0.5, v * 0.35, 0.01);                        // хвост
      if (H) this.osc(out, t, 0.05, 'square', 70, 50, v * 0.25, 0.002);
      return;
    }
    const out = this.out(me ? null : pos, me ? 0.15 : 0.25);
    const v = me ? 0.55 : kind === 'heavy' ? 0.9 : 0.7;
    if (team === 0){
      this.nz(out, t, 0.11, 'bandpass', 1300, 500, 0.8, v);
      this.osc(out, t, 0.09, 'sine', 150, 45, v * 0.9);
      this.nz(out, t, 0.03, 'highpass', 4000, 0, 0.5, v * 0.4);
    } else {
      this.nz(out, t, 0.08, 'bandpass', 2400, 900, 1.8, v * 0.8);
      this.osc(out, t, 0.07, 'square', 1500, 260, v * 0.12);
      this.osc(out, t, 0.06, 'sine', 230, 60, v * 0.7);
    }
    if (kind === 'heavy') this.osc(out, t, 0.12, 'triangle', 90, 40, v * 0.6);
  },
  rail(pos){
    if (!this.ready()) return;
    // v6: чужая рельса — позиционный звук (раньше любая рельса звучала как своя)
    if (pos && S.cam && dist(pos, S.cam.pos) > 4){ if (!this.allow(pos, 400)) return; const t = this.ctx.currentTime, o = this.out(pos, 0.6); this.osc(o, t, 0.4, 'sawtooth', 2000, 140, 0.3); this.nz(o, t, 0.3, 'highpass', 2500, 700, 0.5, 0.5); this.osc(o, t + 0.02, 0.5, 'sine', 80, 30, 0.6); return; }
    const t = this.ctx.currentTime, out = this.out(null, 0.5);
    this.osc(out, t, 0.5, 'sawtooth', 2400, 120, 0.35);
    this.osc(out, t, 0.35, 'sine', 900, 60, 0.6);
    this.nz(out, t, 0.25, 'highpass', 3000, 800, 0.5, 0.5);
    this.osc(out, t + 0.02, 0.6, 'sine', 70, 30, 0.8);
  },
  cannon(pos){
    if (!this.allow(pos, 400)) return;
    const t = this.ctx.currentTime, out = this.out(pos, 0.6);
    this.nz(out, t, 0.6, 'lowpass', 2500, 180, 0.5, 1.4);
    this.osc(out, t, 0.45, 'sine', 90, 28, 1.2);
    this.nz(out, t, 0.05, 'highpass', 3000, 0, 0.5, 0.6);
  },
  boom(pos, size){
    if (!this.allow(pos, 500)) return;
    const t = this.ctx.currentTime, out = this.out(pos, 0.7);
    const dur = 0.7 + size * 0.35, v = min(1.6, 0.6 + size * 0.25);
    this.nz(out, t, dur, 'lowpass', 1600, 120, 0.6, v, 0.006);
    this.osc(out, t, dur * 0.8, 'sine', 70, 22, v);
    this.nz(out, t + 0.03, 0.25, 'highpass', 2500, 900, 0.5, v * 0.35);
    // «вдох» ударной волны
    if (S.cam && dist(pos, S.cam.pos) < 60) this.osc(this.sfx, t, 0.5, 'sine', 40, 20, 0.9);
    for (let k = 0; k < 3; k++) this.osc(out, t + 0.05 + Math.random() * 0.3, 0.15, 'triangle', 1200 + Math.random() * 2500, 600, 0.08);
  },
  impact(pos, hit, cls){
    if (!this.allow(pos, 70)) return;
    const t = this.ctx.currentTime, out = this.out(pos, 0.1);
    if (hit){
      const f = (cls === 'tank' || cls === 'bld' || cls === 'hq') ? 900 + Math.random() * 600 : 2000 + Math.random() * 2400;
      this.osc(out, t, 0.14, 'triangle', f, f * 0.8, 0.22);
      this.nz(out, t, 0.04, 'highpass', 5000, 0, 0.5, 0.15);
    } else if (cls === 'prop'){ this.osc(out, t, 0.25, 'triangle', 600 + Math.random() * 300, 400, 0.25); }
    else this.nz(out, t, 0.07, 'bandpass', 500, 200, 0.8, 0.25);
  },
  whiz(){ if (!this.ready()) return; const t = this.ctx.currentTime; this.nz(this.sfx, t, 0.18, 'bandpass', 3500, 1200, 4, 0.3, 0.03); },
  step(pos, heavy, mine){
    if (!this.allow(mine ? null : pos, 30)) return;
    const t = this.ctx.currentTime, out = this.out(mine ? null : pos);
    const v = mine ? 0.18 : 0.3;
    this.nz(out, t, 0.06, 'bandpass', 300 + Math.random() * 100, 150, 1.0, v);
    this.osc(out, t, 0.07, 'triangle', heavy ? 95 : 130, 60, v * 0.7);
    this.osc(out, t + 0.01, 0.05, 'square', 1800 + Math.random() * 400, 900, v * 0.05);
  },
  servo(pos){
    if (!this.allow(pos, 25)) return;
    const t = this.ctx.currentTime, out = this.out(pos);
    this.osc(out, t, 0.12, 'sawtooth', 380, 520, 0.03);
  },
  land(pos, hard, mine){
    if (!this.allow(mine ? null : pos, 60)) return;
    const t = this.ctx.currentTime, out = this.out(mine ? null : pos, 0.2);
    this.nz(out, t, hard ? 0.4 : 0.2, 'lowpass', 600, 100, 0.7, hard ? 0.9 : 0.5);
    this.osc(out, t, 0.15, 'triangle', 160, 70, 0.4);
  },
  die(pos){
    if (!this.allow(pos, 120)) return;
    const t = this.ctx.currentTime, out = this.out(pos, 0.3);
    this.nz(out, t, 0.35, 'bandpass', 3000, 400, 2, 0.5);
    this.osc(out, t, 0.4, 'sawtooth', 600, 40, 0.15);
    this.osc(out, t + 0.1, 0.2, 'triangle', 300, 120, 0.4);
  },
  rocket(pos, mine){
    if (!this.allow(mine ? null : pos, 200)) return;
    const t = this.ctx.currentTime, out = this.out(mine ? null : pos, 0.3);
    this.nz(out, t, 0.9, 'bandpass', 900, 2600, 0.6, 0.7, 0.02);
    this.osc(out, t, 0.2, 'sine', 120, 50, 0.6);
  },
  throwG(pos, mine){
    if (!this.allow(mine ? null : pos, 60)) return;
    const t = this.ctx.currentTime, out = this.out(mine ? null : pos);
    this.nz(out, t, 0.15, 'bandpass', 700, 1500, 1, 0.3, 0.02);
    this.osc(out, t + 0.05, 0.06, 'square', 2200, 1800, 0.06);
  },
  whistle(pos){
    if (!this.allow(pos, 400)) return;
    const t = this.ctx.currentTime, out = this.out(pos, 0.3);
    this.osc(out, t, 1.8, 'sine', 2200, 500, 0.18, 0.2);
  },
  portal(){
    if (!this.ready()) return;
    const t = this.ctx.currentTime, out = this.out(null, 0.5);
    this.nz(out, t, 0.9, 'bandpass', 250, 3200, 3, 0.6, 0.15);
    this.osc(out, t, 0.9, 'sine', 440, 880, 0.12);
    this.osc(out, t + 0.05, 0.8, 'sine', 660, 1320, 0.08);
  },
  slow(on){
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    if (on){ this.osc(this.master, t, 0.7, 'sine', 400, 60, 0.4); this.nz(this.master, t, 0.6, 'lowpass', 4000, 200, 1, 0.4, 0.05); }
    else { this.osc(this.master, t, 0.5, 'sine', 80, 500, 0.3); }
  },
  click(){ if (!this.ready()) return; const t = this.ctx.currentTime; this.osc(this.sfx, t, 0.04, 'square', 1800, 900, 0.08); this.osc(this.sfx, t + 0.12, 0.05, 'square', 1200, 700, 0.07); },
  tick(){ if (!this.ready()) return; const t = this.ctx.currentTime; this.osc(this.sfx, t, 0.04, 'sine', 1700, 1400, 0.12); },
  ui(kind){
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    if (kind === 'ok'){ this.osc(this.sfx, t, 0.06, 'sine', 880, 0, 0.12); this.osc(this.sfx, t + 0.06, 0.08, 'sine', 1320, 0, 0.12); }
    else { this.osc(this.sfx, t, 0.16, 'square', 150, 110, 0.1); }
  },
  chime(good){
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const notes = good ? [523, 659, 784] : [392, 330, 262];
    notes.forEach((f, i) => this.osc(this.sfx, t + i * 0.1, 0.35, 'triangle', f, 0, 0.16));
  },
  fanfare(){
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    [392, 523, 659, 784, 1046].forEach((f, i) => { this.osc(this.master, t + i * 0.09, 0.5, 'triangle', f, 0, 0.14); this.osc(this.master, t + i * 0.09, 0.5, 'sine', f * 2, 0, 0.04); });
  },
  ping(){ if (!this.ready()) return; const t = this.ctx.currentTime; this.osc(this.sfx, t, 0.9, 'sine', 1400, 1350, 0.15); this.osc(this.sfx, t + 0.35, 0.6, 'sine', 1400, 1350, 0.07); },
  squelch(){
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    this.nz(this.master, t, 0.12, 'bandpass', 1900, 1500, 1.5, 0.25);
    this.osc(this.master, t + 0.02, 0.05, 'sine', 1750, 0, 0.12);
  },
  // ---------------- речь: рация штаба, подсказки, ответы бойцов
  speak(text, kind){
    if (!window.speechSynthesis || !this.on || S.attract) return;
    if (kind === 'radio' && !SET.voice) return;
    const pri = kind === 'hint' ? -1 : kind === 'ack' ? -2 : 0;
    this.say(text, kind, pri);
  },
  radio(text, pri){ if (!SET.voice || S.attract) return; this.say(text, 'radio', pri || 0); },
  say(text, kind, pri){
    if (!window.speechSynthesis || !this.on) return;
    if (pri <= -2 && (this.speaking || this.radioQ.length)) return;            // ответ бойца — только если эфир свободен
    if (this.radioQ.length >= 2){ if (pri < 1) return; this.radioQ = this.radioQ.filter(q => q.pri >= pri); }
    this.radioQ.push({ text, pri, kind });
    this.pump();
  },
  pump(){
    if (this.speaking || !this.radioQ.length || !this.on) return;
    const { text, kind, pitch } = this.radioQ.shift();
    this.speaking = true;
    if (kind === 'radio') this.squelch();
    const u = new SpeechSynthesisUtterance(text);
    const L = LANG.cur;
    u.lang = L === 'en' ? 'en-US' : L === 'vi' ? 'vi-VN' : 'ru-RU';
    const V = this.voices[L] || {};
    const v = kind === 'hint' || kind === 'ack' || kind === 'mate' ? V.m : V.f;
    if (v) u.voice = v;
    const same = V.f === V.m;   // если в системе один голос — различаем высотой
    if (kind === 'hint'){ u.rate = 1.05; u.pitch = same ? 0.55 : 0.95; u.volume = 0.85; }
    else if (kind === 'ack'){ u.rate = 1.25; u.pitch = same ? 0.7 : 1.0; u.volume = 0.8; }
    else if (kind === 'mate'){ u.rate = 1.18; u.pitch = (same ? 0.6 : 0.85) * (pitch || 1); u.volume = 0.75; }
    else { u.rate = 1.1; u.pitch = same ? 1.15 : 1.0; u.volume = 0.95; }
    const done = () => { if (!this.speaking) return; this.speaking = false; if (kind === 'radio') this.squelch(); setTimeout(() => this.pump(), 300); };
    u.onend = done; u.onerror = done;
    setTimeout(() => { try { speechSynthesis.speak(u); } catch (e){ done(); } }, kind === 'radio' ? 140 : 20);
    setTimeout(() => { if (this.speaking && !speechSynthesis.speaking) done(); }, 12000);
  },
  // реплика бойца отряда: мужской голос, высота — своя у каждого
  mate(text, pitch){
    if (!SET.voice) return;
    if (this.speaking || this.radioQ.length) return;
    this.radioQ.push({ text, pri: -2, kind: 'mate', pitch });
    this.pump();
  },
  callout(key, text, cool){
    if ((S.time - (this.lastCall[key] || -99)) < cool) return;
    this.lastCall[key] = S.time;
    this.radio(text, 0);
  },
  ack(g, order){
    if (S.rtime - this.lastAck < 1.6) return;
    this.lastAck = S.rtime;
    const A = ACKS[LANG.cur] || ACKS.ru;
    const set = order === 'abil' ? A.abil : order === 'possess' ? A.possess : (order === 'focus' || order === 'attack') ? A.attack : (g && g.cls === 'tank') ? A.tank : A.move;
    this.say(set[floor(random() * set.length)], 'ack', -2);
    if (this.ready()){ const t = this.ctx.currentTime; this.osc(this.sfx, t, 0.05, 'sine', 2100, 0, 0.05); }
  },
  // ---------------- обработка событий и петли
  frame(dt){
    if (!this.ctx || !S.cam) return;
    const C = this.ctx, L = C.listener, c = S.cam;
    if (L.positionX){
      L.positionX.value = c.pos[0]; L.positionY.value = c.pos[1]; L.positionZ.value = c.pos[2];
      L.forwardX.value = c.fwd[0]; L.forwardY.value = c.fwd[1]; L.forwardZ.value = c.fwd[2];
      L.upX.value = c.up[0]; L.upY.value = c.up[1]; L.upZ.value = c.up[2];
    } else { L.setPosition(...c.pos); L.setOrientation(...c.fwd, ...c.up); }
    const fps = S.mode === 'fps' && !S.attract, me = ctrlEntity(), t = C.currentTime;
    const jet = fps && me && me.cls === 'inf' && me.thrusting ? 0.28 : 0;
    this.jetG.gain.setTargetAtTime(jet, t, 0.05);
    this.jetF.frequency.setTargetAtTime(me && me.thrusting ? 480 + random() * 120 : 400, t, 0.05);
    const tank = fps && me && me.cls === 'tank';
    const sp = tank ? len(me.vel) : 0;
    this.engG.gain.setTargetAtTime(tank ? 0.12 + sp * 0.015 : 0, t, 0.1);
    this.engO.frequency.setTargetAtTime(32 + sp * 4, t, 0.1); this.engO2.frequency.setTargetAtTime(16 + sp * 2, t, 0.1);
    let nd = null, best = 60;
    for (const d of S.drones){ if (!d.alive) continue; const dd = dist(d.pos, c.pos); if (dd < best){ best = dd; nd = d; } }
    this.droneG.gain.setTargetAtTime(nd ? (nd === me ? 0.04 : 0.07) : 0, t, 0.1);
    if (nd) this.setPos(this.dronePan, nd.pos);
    this.ambG.gain.setTargetAtTime(fps && me && underground(me.pos) ? 0.3 : 0.16, t, 0.5);
    // рефлекс: глухой звук и сердце
    this.slowF.frequency.setTargetAtTime(S.slow > 0.05 ? 20000 * Math.pow(0.03, S.slow) : 20000, t, 0.08);
    if (S.slow > 0.3){ this.heartT -= dt; if (this.heartT <= 0){ this.heartT = 0.85; this.osc(this.master, t, 0.18, 'sine', 55, 40, 0.5 * S.slow); this.osc(this.master, t + 0.22, 0.15, 'sine', 50, 38, 0.35 * S.slow); } }
    const orb = S.strikes.some(s => s.type === 'orb' && dist(s.pos, c.pos) < 300);
    this.orbG.gain.setTargetAtTime(orb ? 0.18 : 0, t, 0.2);
    if (orb) this.orbO.frequency.setTargetAtTime(45 + 30 * random(), t, 0.05);
    if (fps && S.me && S.me.squad && S.me.cls === 'inf'){
      const sq = S.me.squad;
      if (sq.units.some(u => u !== S.me && u.target && u.target.cls === 'inf' && u.target.alive) && !SQUADUI.say('contact', null, null, 22)) this.callout('contact', tr('Контакт!', 'Contact!', 'Chạm trán!'), 22);
      for (const e of TGT[0]){
        if (!e.alive) continue;
        const d = dist(e.pos, S.me.pos);
        if (e.cls === 'tank' && d < 80 && SQUADUI.say('tank', null, null, 30)) break;
        if ((e.cls === 'drone' || isAir(e)) && d < 90 && SQUADUI.say('air', null, null, 28)) break;
        if (e.cls === 'tank' && d < 80) { this.callout('tank', tr('Вражеский танк!', 'Enemy tank!', 'Xe tăng địch!'), 30); break; }
        if ((e.cls === 'drone' || isAir(e)) && d < 90) { this.callout('air', tr('Воздух!', 'Air contact!', 'Địch trên không!'), 28); break; }
      }
    }
  },
  process(events){
    if (!this.ready()) return;
    const fps = S.mode === 'fps', me = S.me, live = !S.attract;
    for (const e of events){
      switch (e.type){
        case 'shot': this.shot(e.pos, e.team, e.me ? 'me' : (e.heavy ? 'heavy' : 'rifle'), e.gun); break;
        case 'rail': this.rail(e.src === me ? null : e.pos); break;
        case 'cannon': this.cannon(e.pos); break;
        case 'boom': this.boom(e.pos, e.size); if (S.cam){ const dd = dist(e.pos, S.cam.pos); if (dd < 40 * e.size) S.shake = max(S.shake, 0.4 * e.size * (1.3 - 0.8 * dd / (40 * e.size))); } break;
        case 'impact': this.impact(e.pos, e.hit, e.cls); break;
        case 'step': this.step(e.pos, e.e.leader, fps && e.e === me); if (random() < 0.15) this.servo(e.pos); break;
        case 'land': this.land(e.pos, e.hard, fps && e.e === me); break;
        case 'die': this.die(e.pos); break;
        case 'rocket': this.rocket(e.pos, fps && e.src === me); break;
        case 'throw': this.throwG(e.pos, !!e.me); break;
        case 'portal': this.portal(); break;
        case 'hitmark': this.tick(); break;
        case 'whiz': this.whiz(); break;
        case 'reload': this.click(); break;
        case 'wswitch': this.click(); break;
        case 'slowon': this.slow(true); break;
        case 'slowoff': this.slow(false); break;
        case 'ui': this.ui(e.kind); break;
        case 'board': this.land(e.pos || (S.cam && S.cam.pos), false, true); break;
        case 'strike': this.whistle(e.pos); break;
        case 'podincoming': this.whistle(e.pos); break;
        case 'scan': if (e.team === 0) this.ping(); break;
        case 'leap': case 'repair': case 'overdrive': case 'smoke': if (live && this.allow(e.pos, 120)){ const t = this.ctx.currentTime, o = this.out(e.pos, 0.2); this.nz(o, t, 0.5, 'bandpass', 400, 1600, 0.8, 0.4, 0.05); } break;
        case 'capture':
          if (!live) break;
          if (e.owner === 0){ this.chime(true); this.radio(tr(`${cpSayNom(e.cp)} захвачена`, `${cpSayNom(e.cp)} captured`, `${cpSayNom(e.cp)} đã bị chiếm`), 0); }
          else if (e.old === 0){ this.chime(false); this.radio(tr(`Потеряна ${cpSay(e.cp)}`.replace('Потеряна точку', 'Потеряна точка').replace('Потеряна ядро', 'Потеряно ядро'), `We lost ${cpSay(e.cp)}`, `Ta đã mất ${cpSay(e.cp)}`), 1); }
          break;
        case 'objective': if (live){ if (e.tac) this.squelch(); this.radio(e.text, 2); } break;
        case 'objdone': if (live){ this.chime(true); if (e.text) this.radio(e.text, 1); } break;
        case 'radio': if (live) this.radio(e.text, e.pri); break;
        case 'rankup': if (live){ this.fanfare(); this.say(e.text, 'radio', 3); } break;
        case 'reward': if (live){ this.chime(true); this.radio(e.text, 1); } break;
        case 'ack': if (live) this.ack(e.g, e.order); break;
        case 'possess': if (live && e.u && e.u.cls !== 'inf') this.ack(null, 'possess'); break;
        case 'built': if (live && e.b.team === 0){ this.chime(true); this.radio(tr(`Построено: ${bname(e.b.type)}`, `Construction complete: ${bname(e.b.type)}`, `Xây xong: ${bname(e.b.type)}`), 0); } break;
        case 'place': if (live && e.b.team === 0) this.ui('ok'); break;
        case 'hqdown': this.boom(S.hq[e.team].pos, 8); break;
        case 'over': if (live) this.radio(S.winner === 0 ? tr('Победа. Противник разгромлен', 'Victory. The enemy is crushed', 'Chiến thắng. Quân địch đã bị nghiền nát') : tr('Поражение', 'Defeat', 'Thất bại'), 3); break;
      }
    }
  },
};
