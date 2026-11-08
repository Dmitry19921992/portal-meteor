// =====================================================================
//  v6.8 — ГОЛОСОВЫЕ ПАКЕТЫ ПО ЯЗЫКУ ИНТЕРФЕЙСА: RU (v6.6, как было), EN, VI, HE
//  EN: Piper (ryan, alan, amy) + Kokoro (am_michael, bm_george, am_fenrir, af_heart) — каждая фраза
//      записана 2–3 голосами; голос выбирается по юниту (у каждого бойца свой), дрон и куратор — женские.
//  VI: Piper vais1000 (CC BY 4.0), HE: Meta MMS-TTS heb (CC BY-NC 4.0) — высота/темп свои у каждого типа.
//  Данные: <script id="vo68en|vo68vi|vo68he"> (build.py); разбирается только пакет текущего языка,
//  mp3 декодируется лениво при первой реплике. Нет пакета — русский (v6.6).
//  Формат пакета: {type: {sel: [{t, b: [base64 голос0, голос1, ...]}], ord: [...]}}
// =====================================================================
{
  const V = VOICE66;
  V.packs = {};
  V.packLang = function(){ const L = LANG.cur; return (L === 'en' || L === 'vi' || L === 'he') && document.getElementById('vo68' + L) ? L : 'ru'; };
  V.load = function(){
    const L = this.packLang();
    if (this.packs[L]) return this.packs[L];
    let d = {};
    try {
      const el = document.getElementById(L === 'ru' ? 'vo66' : 'vo68' + L);
      d = el ? JSON.parse(el.textContent) : {};
      if (L !== 'ru') el.textContent = '';   // строка больше не нужна — освобождаем память
    } catch (e){ d = {}; console.warn('VOICE68: нет данных голосов', L, e); }
    this.packs[L] = d;
    return d;
  };
  // какой из голосов строки: у каждого юнита свой (хэш id), куратор — один на сессию
  V.curVar = (Date.now() / 997 | 0) % 16;   // не трогаем random(): детерминированные прогоны (A/B ПК) не сдвигаются
  V.varOf = function(g, n){
    if (n <= 1) return 0;
    if (typeof g === 'string') return this.curVar % n;
    let id = '';
    try { id = String(uixId(g.cls === 'inf' && g.squad ? g.squad : g)); } catch (e){ id = String(g.id || ''); }
    let h = 7; for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) | 0;
    return Math.abs(h) % n;
  };
  V.decode = function(type, kind, i, vr){
    const L = this.packLang(), it = this.load()[type][kind][i];
    const arr = Array.isArray(it.b) ? it.b : [it.b];
    vr = (vr || 0) % arr.length;
    const key = L + type + kind + i + '_' + vr;
    if (this.buf[key]) return Promise.resolve(this.buf[key]);
    if (this.pend[key]) return this.pend[key];
    const bin = atob(arr[vr]), u8 = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
    const p = new Promise((res, rej) => AU.ctx.decodeAudioData(u8.buffer, res, rej)).then(b => { this.buf[key] = b; delete this.pend[key]; return b; });
    this.pend[key] = p;
    return p;
  };
  V.say = function(g, kind, force){
    if (S.attract || SET.unitVoice === false) return false;
    AU.init();
    if (!AU.ready()) return false;
    const type = this.typeOf(g); if (!type || !this.has(type, kind)) return false;
    const now = performance.now();
    if (!force && now - this.last < (kind === 'sel' ? 260 : 420)) return false;
    this.last = now;
    const L = this.load()[type][kind];
    let i = floor(random() * L.length); if (L.length > 1 && i === this.lastI[type + kind]) i = (i + 1) % L.length;
    this.lastI[type + kind] = i;
    const b = L[i].b;
    this.play(type, kind, i, undefined, this.varOf(g, Array.isArray(b) ? b.length : 1));
    return true;
  };
  V.play = function(type, kind, i, vol, vr){
    const D = this.load();
    if (!D[type] || !D[type][kind] || !D[type][kind][i]) return;
    if (vr === undefined){ const b = D[type][kind][i].b; vr = this.varOf(type, Array.isArray(b) ? b.length : 1); }
    this.decode(type, kind, i, vr).then(buf => {
      try { if (this.cur){ this.cur.stop(); this.cur = null; } } catch (e){}
      const C = AU.ctx, t = C.currentTime;
      if (type !== 'curator') AU.squelch();
      const src = C.createBufferSource(); src.buffer = buf;
      const g = C.createGain(); g.gain.value = vol || (type === 'curator' ? 1.0 : 0.95);
      src.connect(g); g.connect(AU.master);
      src.start(t + (type === 'curator' ? 0.02 : 0.07));
      src.onended = () => { if (this.cur === src){ this.cur = null; if (type !== 'curator') AU.squelch(); } };
      this.cur = src; this.played++; this.lastText = D[type][kind][i].t; this.lastType = type; this.lastVar = vr; this.lastLang = this.packLang();
    }).catch(e => { this.errors++; if (this.errors < 3) console.warn('VOICE68', e && e.message); });
  };
  // сколько голосов (для тестов): {type: n}
  V.voiceCount = function(){ const D = this.load(), o = {}; for (const t in D){ const it = (D[t].sel || [])[0]; o[t] = it ? (Array.isArray(it.b) ? it.b.length : 1) : 0; } return o; };
}
