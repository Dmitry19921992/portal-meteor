// v7.2gfx: офлайн-рендер звуковых пар «было → стало» (те же функции AU, SET.gfx72 = false / true) в WAV (base64 → cdpShot не нужен)
const R = { clips: [] };
const SR = 44100;
const wav = buf => {   // моно/стерео float -> 16-bit WAV base64
  const ch = buf.numberOfChannels, n = buf.length, d = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); d.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, ch, true);
  d.setUint32(24, SR, true); d.setUint32(28, SR * ch * 2, true); d.setUint16(32, ch * 2, true); d.setUint16(34, 16, true); ws(36, 'data'); d.setUint32(40, n * ch * 2, true);
  const C = []; for (let c = 0; c < ch; c++) C.push(buf.getChannelData(c));
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++){ d.setInt16(o, Math.max(-1, Math.min(1, C[c][i])) * 32767, true); o += 2; }
  let s = ''; const u8 = new Uint8Array(d.buffer); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s);
};
// подменяем AU на офлайн-контекст: заново строим узлы AU.init на нём (сохранив настоящий)
const real = { ctx: AU.ctx };
async function render(sec, setup, scene){
  const C = new OfflineAudioContext(2, SR * sec, SR);
  // init AU на офлайн-контексте
  const save = {}; for (const k of ['ctx','master','sfx','verb','noise','brown','slowF','jetG','jetF','engG','engO','engO2','droneG','dronePan','heartG','orbG','orbO','ambG','starts','startT']) save[k] = AU[k];
  const AC = window.AudioContext; window.AudioContext = function(){ return C; };
  AU.ctx = null; AU.init(); window.AudioContext = AC;
  AU.ctx = C; A72.ctx = null;
  // AU.ready() проверяет state === 'running' — у офлайн-контекста 'suspended' до старта
  const rd = AU.ready; AU.ready = function(){ return true; };
  setup && setup();
  const evs = scene(C);
  // события по времени: suspend/resume офлайн-контекста
  for (const [t, fn] of evs){ C.suspend(t).then(() => { AU.starts = 0; AU.startT = -1; try { fn(); } catch (e){ R.err = (R.err || '') + e.message + ';'; } C.resume(); }); }
  // кадры AU.frame каждые 50 мс (петли ранца, эмбиент, акустика)
  for (let t = 0.05; t < sec - 0.05; t += 0.05) if (!evs.some(e => Math.abs(e[0] - t) < 0.001)) C.suspend(t).then(() => { try { AU.frame(0.05); } catch (e){} C.resume(); });
  const buf = await C.startRendering();
  AU.ready = rd; Object.assign(AU, save); A72.ctx = null;
  return buf;
}
try {
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(500);
  MENU.pause = function(){};
  const me = S.me; const cam = S.cam; const fw = tangent(cam.fwd, me.up), rt = norm(cross(fw, me.up));
  const at = (f, r, u) => add(add(add(me.pos, mul(fw, f)), mul(rt, r || 0)), mul(me.up, u || 0));
  const freeze = () => { S.paused = true; };
  const CL = [
    ['01_svoy_avtomat', 2.2, () => { const L = []; for (let i = 0; i < 10; i++) L.push([0.1 + i * 0.11, () => AU.shot(null, 0, 'me', 'rifle')]); return L; }],
    ['02_pulemet', 2.4, () => { const L = []; for (let i = 0; i < 16; i++) L.push([0.1 + i * 0.075, () => AU.shot(null, 0, 'me', 'hmg')]); return L; }],
    ['03_chuzhie_vystrely_blizko_i_daleko', 3.0, () => { const L = []; for (let i = 0; i < 6; i++) L.push([0.1 + i * 0.16, () => AU.shot(at(20, -8), 1, 'rifle')]); for (let i = 0; i < 6; i++) L.push([1.3 + i * 0.18, () => AU.shot(at(140, 30), 1, 'rifle')]); return L; }],
    ['04_vzryv_ryadom', 3.6, () => [[0.15, () => AU.boom(at(14, 3), 3)]]],
    ['05_vzryv_vdali', 4.0, () => [[0.15, () => AU.boom(at(220, -60), 4)]]],
    ['06_shagi_poroda_metall', 3.0, () => { const L = []; const pm = mul(BASES[0], RM + 0.5); for (let i = 0; i < 6; i++) L.push([0.1 + i * 0.22, () => AU.step(me.pos, false, true)]); for (let i = 0; i < 6; i++) L.push([1.6 + i * 0.22, () => AU.step(pm, false, true)]); return L; }],
    ['07_ranec', 3.0, () => [[0.2, () => { me.thrusting = true; }], [2.2, () => { me.thrusting = false; }]]],
    ['08_shahta_vystrely', 3.0, () => [[0.05, () => { A72.envForce = 'tunnel'; }], ...Array.from({ length: 5 }, (_, i) => [0.2 + i * 0.3, () => AU.shot(null, 0, 'me', 'rifle')]), [2.95, () => { A72.envForce = null; }]]],
  ];
  const parts = [];
  for (const [name, sec, sc] of CL){
    for (const v of [false, true]){
      SET.gfx72 = v; A72.envForce = null; S.paused = false; me.thrusting = false;
      const buf = await render(sec, null, sc);
      parts.push({ name: name + (v ? '_B_novoe' : '_A_bylo'), b64: wav(buf) });
    }
  }
  SET.gfx72 = true;
  window.__a72 = parts;
  R.clips = parts.map(p => [p.name, p.b64.length]);
} catch (e){ R.err = (R.err || '') + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
