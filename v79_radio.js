// =====================================================================
//  v7.9 — «Радио Portal Meteor»: in-game radio with Dmitry's own music (artist EDMITRY).
//  Music is NOT in the page / itch zip: tracks stream on demand from Cloudflare Pages (project portal-meteor,
//  branch alias radio.portal-meteor.pages.dev/radio/<slug>.ogg|.m4a — Opus 96k + AAC 96k for Safari, −16 LUFS).
//  Each track is fetched whole (≤3.5 MB) into a blob: works without HTTP range support, plays offline once loaded,
//  and a failed fetch is silent (the widget just says «нет связи»).
//  Off by default; forced off in tutorials; optional autostart (Settings). Key 5 (rebindable «Радио»), [ ] — track,
//  Shift+[ ] — volume. Phone: 📻 round button in the right column under 📡, panel opens to the left (screen centre free).
//  Game SFX duck the radio a little (analyser on the SFX bus + radio voice); in vehicles the radio sounds through the
//  cockpit (band-limited). Media Session (lock screen) on phones. Hooks: MENU.html_pause / html_settings, P71M.sec,
//  uixFrame, newMatch, BIND_DEF — all wrappers inside this file. Off completely: ?r79=0.
// =====================================================================
const RADIO79_LIST = /*R79LIST*/[["rearview","REARVIEW",210],["drift","Drift",127],["my-guys","My Guys",135],["movie-so-deep","Movie So Deep",156],["game","Game",139],["awful","Awful",255],["best-is-yet-to-come","Best Is Yet To Come",123],["call-me","Call Me",146],["drug","Drug",184],["em-o-ben","Em ở bên",165],["forget-you","Forget You",129],["holes","Holes",110],["i-feel-alive","I Feel Alive",160],["walls","Walls",189],["ya-tebya","Я тебя",111],["all-my-love","All My Love",158],["all-the-things","All The Things",168],["i-wish","I Wish",146],["known-then","Known Then",120],["believe-in","Believe In",137],["blazing-sky","Blazing Sky",147],["call","Call",173],["cant-forget","Can’t Forget",168],["cool","Cool",136],["dreaming","Dreaming",134],["fast","Fast",143],["flex","Flex",120],["hands-up","Hands Up",182],["harley","Harley",178],["in-the-dark","In the Dark",171],["in-too-deep","In Too Deep",164],["jump-in","Jump In",113],["losing-control","Losing Control",159],["loving-this-moment","Loving This Moment",207],["rain-on-me","Rain On Me",210],["meant-to-be","Meant to Be",154],["clever","Clever",126],["dumb","Dumb",165],["mistakes","Mistakes",141],["neverland","Neverland",133],["new-horizon","New Horizon",126],["nothing-i-can-do","Nothing I Can Do",167],["omg","OMG",147],["our-eyes","Our Eyes",140],["over-you","Over You",113],["pines","Pines",188],["monsters","Monsters",158],["poison","Poison",160],["reflection","Reflection",171],["toxins","Toxins",158],["real-real-love","Real Real Love",167],["side-by-side","Side By Side",180],["simulation","Simulation",158],["stop-control","Stop Control",124],["summertime-breeze","Summertime Breeze",202],["feelings-right","Feeling’s Right",139],["sweet-escape","Sweet Escape",246],["take-me-away","Take Me Away",163],["thirsty","Thirsty",153],["wanna-know","Wanna Know",153],["yes-please","Yes Please",143],["tears","Tears",153],["when-i-found-you","When I Found You",140],["chatgpt","ChatGPT",216],["claude","Claude",233],["deepseek","DeepSeek",192],["gemini","Gemini",211],["grok","Grok",258],["baby","Baby",153],["close","Close",153],["hold-me","Hold Me",169],["im-falling","I’m Falling",152],["falling-down","Falling Down",132],["in-my-mind","In My Mind",233],["liquid-gold","Liquid Gold",259],["got-no-limits","Got No Limits",210],["no-control","No Control",232],["every-memory-is-true","Every Memory Is True",244],["im-ice-cold","I’m Ice Cold",244],["things-you-do","Things You Do",214],["wanna-be-there","Wanna Be There",143],["power","Power",118],["the-heaven-is-so-strange","The Heaven Is So Strange",175],["ya-vsegda-s-toboy","Я всегда с тобой",197],["every-time","Every Time",160],["fall-in-love","Fall in Love",160],["mean-it","Mean It",243],["say-the-words","Say the Words",234],["sun-dance","Sun Dance",176],["when-the-dj-plays","When the DJ Plays",242],["bol-i-stradanie","Bol i Stradanie",232],["camera","Camera",146],["career","Career",144],["dumpling","Dumpling",96],["hardbass-vs-phonk","Hardbass VS Phonk",117],["how-you-love-me","How You Love Me",204],["rockstar","Rockstar",158],["simple","Simple",136],["spa","SPA",65],["tem","TEM",165],["vinaphonk","Vinaphonk",119],["in-love","In Love",154],["part-of-me","Part of Me",148]];
// "New in v7.9" lines for main (RU / EN / VI) — main decides where to show them
const RADIO79_NEWS = [
  'Радио Portal Meteor: 100+ треков EDMITRY прямо в игре — кнопка 📻 (ПК: клавиша 5, [ ] — трек). Музыка подгружается по сети и не утяжеляет игру; громкость, автозапуск в настройках, ссылка «Слушать в Spotify».',
  'Radio Portal Meteor: 100+ tracks by EDMITRY right in the game — the 📻 button (PC: key 5, [ ] — track). Music streams on demand and does not bloat the game; volume and autostart in Settings, plus a "Listen on Spotify" link.',
  'Radio Portal Meteor: hơn 100 bài của EDMITRY ngay trong game — nút 📻 (PC: phím 5, [ ] — bài). Nhạc tải qua mạng, không làm nặng game; nghe trên Spotify.',
];
const R79 = {
  off: (() => { try { return new URLSearchParams(location.search).get('r79') === '0'; } catch (e){ return false; } })(),
  BASES: (() => { const d = ['https://radio.portal-meteor.pages.dev/radio/', 'https://portal-meteor.pages.dev/radio/']; try { const q = new URLSearchParams(location.search).get('r79base'); if (q) return [q]; } catch (e){} return d; })(),
  SPOTIFY: 'https://open.spotify.com/artist/5wo3p65ZoDWVhoqPOFS9d7',
  L: RADIO79_LIST, order: [], pos: 0, on: false, st: 'off', err: 0, fails: 0, tok: 0, cache: new Map(), loading: new Map(),
  el: null, src: null, g: null, hp: null, lp: null, an: null, anBuf: null, recDest: null, wired: false, unlocked: false,
  duckV: 1, gainV: -1, veh: false, vehV: -1, showT: 0, glT: 0, tipT: 0, autoT: -1, userOff: false, tutPaused: false, tutAllowed: false, hidPaused: false,
  ui: null, sig: '', open: false, toastT: 0, pgT: 0, curI: -1, baseI: 0,
  mem: (() => { try { return JSON.parse(localStorage.getItem('pm_r79') || '{}') || {}; } catch (e){ return {}; } })(),
  saveMem(){ try { localStorage.setItem('pm_r79', JSON.stringify(this.mem)); } catch (e){} },
  safe(f, w){ try { return f(); } catch (e){ if (this.err++ < 4) console.warn('r79 ' + w, e); } },
  vol(){ const v = +SET.r79vol; return isFinite(v) ? clamp(v, 0, 1) : 0.55; },
  tut(){ return (typeof TUT !== 'undefined' && TUT.on) || (typeof T72 !== 'undefined' && T72.on); },
  ext(){
    if (this._ext) return this._ext;
    const a = document.createElement('audio'), ua = navigator.userAgent || '';
    const apple = /iPhone|iPad|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|Android/.test(ua));
    return this._ext = (!apple && a.canPlayType('audio/ogg; codecs="opus"')) ? '.ogg' : '.m4a';
  },
  cur(){ return this.L[this.order[this.pos]]; },
  buildOrder(){
    const n = this.L.length, rest = [];
    for (let i = 0; i < n; i++) rest.push(i);
    for (let i = n - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
    if (!this.mem.seen){ const fav = [0, 1, 2, 3]; this.order = fav.concat(rest.filter(i => !fav.includes(i))); }   // first time: REARVIEW + video favourites
    else { this.order = rest.filter(i => i !== 0); this.order.splice(1, 0, 0); }   // later: shuffled, REARVIEW second
    this.pos = 0;
  },
  // ---------------------------------------------------------------- audio graph (after the game's compressor: music never squashes SFX)
  elem(){
    if (this.el) return this.el;
    const a = this.el = new Audio(); a.preload = 'auto'; a.setAttribute('playsinline', ''); a.loop = false;
    a.addEventListener('ended', () => this.safe(() => { if (this.on && /^blob:/.test(a.src)) this.next(1, true); }, 'ended'));
    a.addEventListener('error', () => this.safe(() => { if (!this.on || !a.src || /^data:/.test(a.src)) return; this.fail(); }, 'err'));
    a.addEventListener('playing', () => this.safe(() => { if (this.on && /^blob:/.test(a.src)){ this.st = 'play'; this.fails = 0; this.sig = ''; } }, 'playing'));
    return a;
  },
  wire(){
    if (this.wired || !AU.ctx) return;
    const C = AU.ctx, a = this.elem();
    this.src = C.createMediaElementSource(a);
    this.hp = C.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 10; this.hp.Q.value = 0.7;
    this.lp = C.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.7;
    this.g = C.createGain(); this.g.gain.value = 0;
    this.src.connect(this.hp); this.hp.connect(this.lp); this.lp.connect(this.g); this.g.connect(C.destination);
    if (AU.sfx){ this.an = C.createAnalyser(); this.an.fftSize = 512; this.anBuf = new Float32Array(this.an.fftSize); AU.sfx.connect(this.an); }
    this.wired = true; a.volume = 1;
  },
  // first tap/key unlocks the <audio> element inside the gesture (iOS), so later async play() is allowed
  unlock(){
    if (this.unlocked) return; this.unlocked = true;
    const a = this.elem();
    try { a.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA=='; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e){}
  },
  // ---------------------------------------------------------------- fetch whole track into a blob (no range support needed; silent on failure)
  async fetchTrack(i){
    const t = this.L[i], key = t[0];
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.loading.has(key)) return this.loading.get(key);
    const job = (async () => {
      if (navigator.onLine === false) return null;
      for (let k = 0; k < this.BASES.length; k++){
        const b = (this.baseI + k) % this.BASES.length, ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const to = setTimeout(() => { if (ac) ac.abort(); }, 45000);
        try {
          const r = await fetch(this.BASES[b] + key + this.ext(), { mode: 'cors', signal: ac ? ac.signal : undefined });
          if (!r.ok) throw 0;
          const bl = await r.blob(); clearTimeout(to);
          if (bl.size < 2000) throw 0;
          this.baseI = b;
          const u = URL.createObjectURL(bl); this.cache.set(key, u); this.trim(); return u;
        } catch (e){ clearTimeout(to); }
      }
      return null;
    })();
    this.loading.set(key, job);
    try { return await job; } finally { this.loading.delete(key); }
  },
  trim(){   // keep current, next and previous only
    const keep = new Set([-1, 0, 1].map(d => { const j = this.order[(this.pos + d + this.order.length) % this.order.length]; return this.L[j][0]; }));
    for (const [k, u] of this.cache) if (!keep.has(k) && !(this.el && this.el.src === u)){ URL.revokeObjectURL(u); this.cache.delete(k); }
  },
  async load(){
    const tok = ++this.tok, i = this.order[this.pos];
    this.st = 'load'; this.sig = ''; this.showT = 6; this.glT = 0.7; this.toastT = 5; this.media();
    const u = await this.fetchTrack(i);
    if (tok !== this.tok || !this.on) return;
    if (!u){ this.fail(); return; }
    const a = this.elem(); this.wire();
    a.src = u; this.curI = i;
    if (this.tutPaused || this.hidPaused){ this.st = 'pause'; this.sig = ''; return; }
    try { const p = a.play(); if (p && p.catch) p.catch(e => { if (tok === this.tok && e && e.name === 'NotAllowedError'){ this.st = 'tap'; this.sig = ''; } }); } catch (e){}
    this.mem.seen = 1; this.mem.last = this.L[i][0]; this.saveMem();
  },
  fail(){
    this.fails++;
    if (this.fails >= 3 || navigator.onLine === false){ this.st = 'net'; this.sig = ''; this.showT = 6; this.toastT = 5; return; }   // no network: the radio just stays silent
    this.pos = (this.pos + 1) % this.order.length; this.load();
  },
  // ---------------------------------------------------------------- controls
  play(){
    if (this.off) return;
    AU.init(); this.unlock(); this.wire();
    if (!this.order.length) this.buildOrder();
    this.on = true; this.userOff = false; this.fails = 0;
    if (this.tut()) this.tutAllowed = true;
    this.tutPaused = false;
    const a = this.elem(), t = this.cur();
    if (t && this.cache.has(t[0]) && a.src === this.cache.get(t[0]) && a.paused && a.currentTime > 0){ const p = a.play(); if (p && p.catch) p.catch(() => {}); this.st = 'play'; }
    else this.load();
    this.blip(); this.sig = ''; this.showT = 6;
  },
  stop(user){
    this.on = false; this.tok++; this.st = 'off'; this.sig = ''; this.showT = 3;
    if (user) this.userOff = true;
    if (this.el && !this.el.paused) this.el.pause();
    this.blip(); this.media();
  },
  toggle(){ if (this.on && this.st !== 'net' && this.st !== 'tap') this.stop(true); else this.play(); },
  next(d, auto){
    if (this.off) return;
    if (!this.order.length) this.buildOrder();
    if (d < 0 && this.el && this.el.currentTime > 6 && !auto){ this.el.currentTime = 0; this.showT = 4; this.sig = ''; return; }
    this.pos = (this.pos + d + this.order.length) % this.order.length;
    if (!this.on){ this.play(); return; }
    if (!auto){ AU.init(); this.blip(); }
    this.fails = 0; this.load();
  },
  setVol(v){ SET.r79vol = Math.round(clamp(v, 0, 1) * 20) / 20; if (typeof MENU !== 'undefined' && MENU.save) MENU.save(); this.showT = 4; this.sig = ''; this.refreshVol(); },
  blip(){ try { if (AU.ready() && AU.squelch) AU.squelch(); } catch (e){} },
  media(){
    if (!('mediaSession' in navigator)) return;
    try {
      const t = this.cur(); if (!t) return;
      navigator.mediaSession.metadata = typeof MediaMetadata !== 'undefined' ? new MediaMetadata({ title: t[1], artist: 'EDMITRY', album: 'Radio Portal Meteor' }) : null;
      if (!this.msSet){ this.msSet = true;
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next(1));
        navigator.mediaSession.setActionHandler('previoustrack', () => this.next(-1));
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.stop(true)); }
    } catch (e){}
  },
  // ---------------------------------------------------------------- per frame: ducking, cockpit filter, tutorial / tab rules, autostart
  refreshVol(){
    if (!this.g || !AU.ctx) return;
    const master = AU.on ? 1 : 0, menuDuck = (typeof MENU !== 'undefined' && MENU.isOpen() && !S.attract) ? 0.7 : 1;
    const v = this.on ? this.vol() * 0.62 * this.duckV * master * menuDuck * (AU.vol > 0 ? Math.min(1, AU.vol / 0.9) : 0) : 0;
    if (Math.abs(v - this.gainV) > 0.002){ this.gainV = v; try { this.g.gain.setTargetAtTime(v, AU.ctx.currentTime, 0.08); } catch (e){ this.g.gain.value = v; } }
  },
  step(dt){
    if (this.off) return;
    // SFX energy -> duck (−3.5 dB max, fast attack, slow release); radio voice -> a bit more
    let target = 1;
    if (this.on && this.an && AU.ctx && AU.ctx.state === 'running'){
      this.an.getFloatTimeDomainData(this.anBuf);
      let s = 0; for (let i = 0; i < this.anBuf.length; i += 4){ const x = this.anBuf[i]; s += x * x; }
      const rms = Math.sqrt(s / (this.anBuf.length / 4));
      target = 1 - 0.33 * clamp((rms - 0.03) / 0.22, 0, 1);
    }
    if (AU.speaking) target = Math.min(target, 0.7);
    const k = target < this.duckV ? 1 - Math.exp(-dt * 25) : 1 - Math.exp(-dt * 1.6);
    this.duckV += (target - this.duckV) * k;
    // cockpit: in a tank / drone the music comes through the vehicle speakers
    const c = typeof ctrlEntity === 'function' ? ctrlEntity() : null;
    const veh = !!(c && S.mode === 'fps' && !S.attract && (c.cls === 'tank' || c.cls === 'drone' || (typeof V74 !== 'undefined' && V74.seat)));
    if (this.lp && veh !== this.veh){
      this.veh = veh; const t = AU.ctx.currentTime;
      try { this.lp.frequency.setTargetAtTime(veh ? 3400 : 20000, t, 0.15); this.hp.frequency.setTargetAtTime(veh ? 170 : 10, t, 0.15); this.lp.Q.setTargetAtTime(veh ? 1.6 : 0.7, t, 0.15); } catch (e){}
      if (this.on) this.sig = '';
    }
    // hold: tutorials (unless turned on inside the tutorial), main menu (attract), hidden tab — pause, resume after
    const tut = this.tut();
    if (!tut) this.tutAllowed = false;
    const hold = (tut && !this.tutAllowed) || !!S.attract || document.visibilityState === 'hidden';
    if (this.on && hold && !this.tutPaused){ this.tutPaused = true; if (this.el && !this.el.paused) this.el.pause(); this.sig = ''; }
    if (this.tutPaused && (!hold || !this.on)){ this.tutPaused = false; if (this.on && this.el && /^blob:/.test(this.el.src) && this.st !== 'load'){ const p = this.el.play(); if (p && p.catch) p.catch(() => {}); } this.sig = ''; }
    // recorder (devlog capture) gets the radio too
    if (this.g && typeof CAMFX !== 'undefined' && CAMFX.audioDest !== this.recDest){
      try { if (this.recDest) this.g.disconnect(this.recDest); } catch (e){}
      this.recDest = CAMFX.audioDest || null; if (this.recDest) try { this.g.connect(this.recDest); } catch (e){}
    }
    // autostart (setting): first real battle second after a gesture
    if (!this.on && !this.userOff && SET.r79auto && !tut && !S.attract && S.mode === 'fps' && AU.ctx && AU.ctx.state === 'running' && !(typeof MENU !== 'undefined' && MENU.isOpen())){
      this.autoT = this.autoT < 0 ? 1.2 : this.autoT - dt;
      if (this.autoT <= 0){ this.autoT = -1; this.play(); }
    }
    if (this.showT > 0) this.showT -= dt;
    if (this.glT > 0) this.glT -= dt;
    if (this.toastT > 0) this.toastT -= dt;
    this.refreshVol();
  },
  // ---------------------------------------------------------------- widget (VHS / glitch): PC — bottom-left above the minimap; phone — 📻 in the right column
  ensure(){
    if (this.ui) return this.ui;
    const el = this.ui = document.createElement('div'); el.id = 'r79'; el.className = 'r79'; document.body.appendChild(el);
    const act = t => {
      const b = t && t.closest ? t.closest('[data-r79]') : null; if (!b) return false;
      const k = b.dataset.r79; AU.init();
      if (k === 'tog') this.toggle(); else if (k === 'next') this.next(1); else if (k === 'prev') this.next(-1);
      else if (k === 'up') this.setVol(this.vol() + 0.1); else if (k === 'dn') this.setVol(this.vol() - 0.1);
      else if (k === 'open'){ this.open = !this.open; if (this.open && !this.on) this.play(); }
      else if (k === 'sp') return false;   // the Spotify link opens by itself
      this.sig = ''; this.render();
      if (typeof M71 !== 'undefined' && M71.haptic) M71.haptic(10);
      return true;
    };
    el.addEventListener('touchstart', e => { const b = e.target.closest('[data-r79]'); if (b && b.dataset.r79 !== 'sp'){ e.preventDefault(); act(e.target); } e.stopPropagation(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.stopPropagation(); });
    el.addEventListener('click', e => { e.stopPropagation(); if (act(e.target)) e.preventDefault(); });
    return el;
  },
  visible(){
    if (this.off || S.attract || S.mode !== 'fps' || S.over || OPER.on) return false;
    if (typeof MENU !== 'undefined' && MENU.isOpen()) return false;
    if (typeof M74 !== 'undefined' && M74.nohud) return false;
    if (typeof FEEL76 !== 'undefined' && FEEL76.intro) return false;
    if (this.tut() && !this.on) return false;
    return true;
  },
  fmt(s){ s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
  render(){
    const el = this.ensure();
    if (!this.visible()){ if (el.style.display !== 'none') el.style.display = 'none'; this.open = false; return; }
    el.style.display = 'block';
    const ph = TOUCH.on, t = this.cur() || this.L[0], kb = SET.bind.radio79 || 'Digit5';
    const tm = this.el && this.on && this.st === 'play' ? this.fmt(this.el.currentTime) + ' / ' + this.fmt(this.el.duration || t[2]) : '';
    const full = ph ? this.open : (this.on || this.showT > 0);
    const sig = [ph, full, this.on, this.st, t[0], this.veh, Math.round(this.vol() * 20), this.tutPaused, LANG.cur, this.glT > 0, tm.slice(0, -2)].join('|');
    if (sig === this.sig) return; this.sig = sig;
    const ST = { off: tr('выкл', 'off', 'tắt', 'כבוי'), load: tr('настройка…', 'tuning…', 'đang dò…', 'מכוון…'), play: this.veh ? tr('эфир · кабина', 'on air · cockpit', 'phát · buồng lái', 'שידור · תא') : tr('в эфире', 'on air', 'đang phát', 'בשידור'),
      pause: tr('пауза', 'paused', 'tạm dừng', 'מושהה'), net: tr('нет связи — тихо', 'no signal — silent', 'mất tín hiệu', 'אין קליטה'), tap: tr('нажми ▶', 'tap ▶', 'nhấn ▶', 'לחץ ▶') };
    const st = this.tutPaused ? ST.pause : ST[this.st] || '';
    el.className = 'r79' + (ph ? ' ph' : '') + (full ? ' full' : '') + (this.on ? ' on' : '') + (this.glT > 0 ? ' gl' : '') + (this.st === 'net' ? ' net' : '');
    const name = `EDMITRY — ${uixEsc(t[1])}`;
    const head = `<div class="hd"><i class="dot"></i><b>${tr('РАДИО PORTAL METEOR', 'RADIO PORTAL METEOR', 'RADIO PORTAL METEOR', 'רדיו PORTAL METEOR')}</b><em>${st}</em></div>`;
    const now = `<div class="np"><small>${tr('Сейчас играет', 'Now playing', 'Đang phát', 'מתנגן עכשיו')}:</small><span data-t="${uixEsc(name)}">${name}</span></div>`;
    const ctl = `<div class="ctl"><button data-r79="prev" title="[">⏮</button><button data-r79="tog" class="pl">${this.on && this.st !== 'net' && this.st !== 'tap' ? '⏸' : '▶'}</button><button data-r79="next" title="]">⏭</button>` +
      `<button data-r79="dn" title="Shift+[">−</button><span class="vb"><i style="width:${Math.round(this.vol() * 100)}%"></i></span><button data-r79="up" title="Shift+]">+</button>${tm ? `<em class="tm">${tm}</em>` : ''}</div>`;
    const sp = `<a data-r79="sp" class="sp" href="${this.SPOTIFY}" target="_blank" rel="noopener">${tr('Слушать в Spotify', 'Listen on Spotify', 'Nghe trên Spotify', 'האזן בספוטיפיי')} ↗</a>`;
    if (ph){
      const btn = `<button data-r79="open" class="rb">📻${this.on ? '<i class="eq"><b></b><b></b><b></b></i>' : ''}</button>`;
      const toast = !full && this.on && this.toastT > 0 ? `<div class="toast">♪ ${name}</div>` : '';
      const hp = `<div class="hd"><i class="dot"></i><b>${tr('РАДИО', 'RADIO', 'RADIO', 'רדיו')}</b><em>${st}</em></div>`;
      const np = `<div class="np2"><small>${tr('Сейчас играет', 'Now playing', 'Đang phát', 'מתנגן עכשיו')}:</small><span>${name}</span></div>`;
      const c2 = `<div class="ctl"><button data-r79="prev">⏮</button><button data-r79="tog" class="pl">${this.on && this.st !== 'net' && this.st !== 'tap' ? '⏸' : '▶'}</button><button data-r79="next">⏭</button></div>` +
        `<div class="ctl"><button data-r79="dn">−</button><span class="vb"><i style="width:${Math.round(this.vol() * 100)}%"></i></span><button data-r79="up">+</button></div>`;
      el.innerHTML = btn + (full ? `<div class="pn">${hp}${np}${c2}${sp}</div>` : toast);
    } else {
      el.innerHTML = full ? `<div class="pn">${head}${now}${ctl}<div class="ft"><span><kbd>${keyLabel(kb)}</kbd> ${tr('вкл', 'on/off', 'bật', 'הפעלה')} · <kbd>[</kbd><kbd>]</kbd> ${tr('трек', 'track', 'bài', 'רצועה')}</span>${sp}</div></div>`
        : `<button data-r79="tog" class="mini"><kbd>${keyLabel(kb)}</kbd>📻 ${tr('Радио', 'Radio', 'Radio', 'רדיו')}</button>`;
    }
  },
};
// ---- settings defaults + rebindable key «Радио» (5); [ ] — track, Shift+[ ] — volume
if (typeof SET_DEF !== 'undefined'){ if (SET_DEF.r79vol === undefined) SET_DEF.r79vol = 0.55; if (SET_DEF.r79auto === undefined) SET_DEF.r79auto = false; }
if (SET.r79vol === undefined) SET.r79vol = 0.55;
if (SET.r79auto === undefined) SET.r79auto = false;
if (typeof BIND_DEF !== 'undefined' && !BIND_DEF.radio79){
  BIND_DEF.radio79 = 'Digit5';
  BIND_NAMES.radio79 = ['Радио Portal Meteor вкл/выкл ([ ] — трек, Shift+[ ] — громкость)', 'Radio Portal Meteor on/off ([ ] — track, Shift+[ ] — volume)', 'Radio bật/tắt ([ ] — bài)'];
  if (SET_DEF.bind) SET_DEF.bind.radio79 = 'Digit5';
  if (SET.bind && !SET.bind.radio79) SET.bind.radio79 = 'Digit5';
}
addEventListener('keydown', e => {
  if (R79.off || e.repeat || MENU.isOpen() || S.attract || S.mode !== 'fps' || OPER.on) return;
  if (typeof FPS61 !== 'undefined' && FPS61.card && S.rtime - FPS61.card.t < 5 && /^Digit[1-8]$/.test(e.code)) return;   // possession-order card owns 1–8 for 5 s
  const kb = SET.bind.radio79 || 'Digit5';
  if (e.code === kb && !e.ctrlKey && !e.altKey){ e.preventDefault(); e.stopImmediatePropagation(); AU.init(); R79.toggle(); R79.mem.used = 1; R79.saveMem(); return; }
  if (e.code === 'BracketLeft' || e.code === 'BracketRight'){
    e.preventDefault(); e.stopImmediatePropagation(); AU.init();
    const d = e.code === 'BracketRight' ? 1 : -1;
    if (e.shiftKey) R79.setVol(R79.vol() + d * 0.1); else R79.next(d);
  }
}, true);
// ---- per-frame: ui + audio (uixFrame runs every frame, also in menus and pause)
{ let lt = performance.now();   // real time (frame dt is capped at 0.05 — on a slow GPU ducking / autostart would crawl)
  const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); if (R79.off) return; const n = performance.now(), d = Math.min((n - lt) / 1000, 0.5); lt = n; R79.safe(() => R79.step(d), 'step'); R79.safe(() => R79.render(), 'ui'); }; }
{ const nm0 = newMatch; newMatch = function(o){ const r = nm0.apply(this, arguments); R79.autoT = -1; return r; }; }
// unlock the <audio> element on the first real gesture (iOS: later async play() is then allowed)
for (const ev of ['touchend', 'mousedown', 'keydown']) addEventListener(ev, () => { if (!R79.off && !R79.unlocked && (SET.r79auto || R79.mem.used)) R79.unlock(); }, { capture: true, passive: true });
// ---- one short tip per player (PC: key, phone: 📻), not in tutorials
R79.tip = function(dt){
  if (this.mem.tip || this.mem.used || this.on) return;
  this.tipT += dt; if (this.tipT < 1) return; this.tipT = 0;
  if (S.attract || S.over || S.mode !== 'fps' || S.time < 75 || this.tut() || MENU.isOpen() || typeof HINTS === 'undefined') return;
  if (HINTS.cur && S.rtime < HINTS.cur.until) return;
  const ph = TOUCH.on, k = keyLabel(SET.bind.radio79 || 'Digit5');
  const ok = HINTS.show('r79tip', ph ? tr('📻 справа — Радио Portal Meteor: музыка EDMITRY во время боя.', '📻 on the right — Radio Portal Meteor: music by EDMITRY while you fight.', '📻 bên phải — Radio: nhạc EDMITRY.') : tr(`${k} — Радио Portal Meteor: музыка EDMITRY во время боя. [ ] — трек.`, `${k} — Radio Portal Meteor: music by EDMITRY while you fight. [ ] — track.`, `${k} — Radio: nhạc EDMITRY.`), ph ? [] : [k], 'r79');
  if (ok !== false){ this.mem.tip = 1; this.saveMem(); }
};
{ const st0 = R79.step; R79.step = function(dt){ st0.call(this, dt); this.tip(dt); }; }
// ---- settings: PC (after «voice of hints») and phone (☰ → Settings → Sound)
R79.setRows = function(phone){
  const v = Math.round(this.vol() * 100) + '%', H = tr;
  const lab = H('Радио Portal Meteor (EDMITRY): громкость', 'Radio Portal Meteor (EDMITRY): volume', 'Radio (EDMITRY): âm lượng', 'רדיו: עוצמה');
  const auto = H('Радио: включать само в бою', 'Radio: start by itself in battle', 'Radio: tự bật trong trận', 'רדיו: הפעלה אוטומטית');
  if (phone) return `<div class="p71s"><button data-r79v="-1">${IC71('minus')}</button><span><small>${lab}</small><b>${v}</b></span><button data-r79v="1">${IC71('plus')}</button></div>` +
    `<button class="p71o ${SET.r79auto ? 'on' : ''}" data-tog="r79auto"><span>${auto}</span><b>${L71(SET.r79auto ? 'on' : 'off')}</b></button>`;
  return `<div class="row"><label>${lab}</label><input type="range" data-sl="r79vol" min="0" max="1" step="0.05" value="${this.vol()}"><span class="val" id="v_r79vol">${this.vol()}</span></div>` +
    `<div class="row"><label>${auto}</label><button class="tog ${SET.r79auto ? 'on' : ''}" data-tog="r79auto">${SET.r79auto ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי')}</button></div>`;
};
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    const h = hs0.apply(this, arguments);
    if (R79.off || (typeof P71M !== 'undefined' && P71M.on && P71M.on())) return h;
    const re = /(<button class="tog[^"]*" data-tog="hintsVoice">[^<]*<\/button><\/div>)/;
    return re.test(h) ? h.replace(re, '$1' + R79.setRows(false)) : h;
  }; }
if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_snd' && !R79.off) h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + R79.setRows(true)); return h; }; }
{ let at = -1e9;   // phone volume −/+ in settings (tap or click, deduped)
  const go = b => { if (performance.now() - at < 400) return; at = performance.now(); AU.init(); R79.setVol(R79.vol() + (+b.dataset.r79v) * 0.05); emit('ui', { kind: 'ok' }); if (MENU.cur) MENU.show(MENU.cur); };
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-r79v]'); if (!b) return; e.stopPropagation(); e.preventDefault(); go(b); }, true);
  document.addEventListener('touchend', e => { const b = e.target && e.target.closest && e.target.closest('[data-r79v]'); if (!b) return; e.stopPropagation(); if (e.cancelable) e.preventDefault(); go(b); }, { capture: true, passive: false });
}
(function r79CSS(){
  const st = document.createElement('style');
  st.textContent = `
#r79{position:fixed;left:196px;bottom:10px;z-index:15;display:none;pointer-events:auto;font-family:"Exo 2",sans-serif;color:#e8dcb8;user-select:none;-webkit-user-select:none}
#r79 button{all:unset;cursor:pointer;box-sizing:border-box;touch-action:manipulation}
#r79 kbd{font-size:10px}
#r79 .mini{display:inline-flex;gap:6px;align-items:center;background:rgba(8,12,16,.6);border:1px solid rgba(214,198,154,.35);border-left:3px solid #ff5aa8;padding:3px 9px;font:600 12px "Exo 2";opacity:.75}
#r79 .mini:hover{opacity:1;border-color:#ff5aa8}
#r79 .pn{position:relative;box-sizing:border-box;width:252px;padding:6px 9px 5px;background:linear-gradient(180deg,rgba(14,10,22,.86),rgba(6,8,12,.86));border:1px solid rgba(255,90,168,.45);border-left:3px solid #ff5aa8;overflow:hidden;
  box-shadow:0 0 14px rgba(255,90,168,.18),inset 0 0 22px rgba(80,220,255,.06)}
#r79 .pn::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.045) 0 1px,transparent 1px 3px);mix-blend-mode:screen}
#r79 .pn::after{content:"";position:absolute;left:0;right:0;height:14px;top:-20px;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(160,230,255,.10),transparent);animation:r79roll 5.5s linear infinite}
@keyframes r79roll{0%{top:-20px}100%{top:110%}}
#r79 .hd{display:flex;gap:6px;align-items:center;font:400 11px "Russo One",sans-serif;letter-spacing:.14em;text-shadow:1px 0 rgba(255,40,90,.75),-1px 0 rgba(40,220,255,.75)}
#r79 .hd b{font-weight:400;flex:1;white-space:nowrap} #r79 .hd em{font:600 10px "Exo 2";letter-spacing:.05em;color:#9fd8ff;font-style:normal;text-shadow:none;white-space:nowrap}
#r79 .dot{width:7px;height:7px;border-radius:50%;background:#555;flex:none}
#r79.on .dot{background:#ff3060;box-shadow:0 0 6px #ff3060;animation:r79blink 1.2s steps(2) infinite}
#r79.net .dot{background:#a86;animation:none}
@keyframes r79blink{50%{opacity:.25}}
#r79 .np{margin:4px 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:600 12.5px "Exo 2"}
#r79 .np small{color:#b9a6c8;font-size:10.5px;margin-right:4px;font-weight:600}
#r79 .np span{color:#fff;position:relative;text-shadow:1px 0 rgba(255,40,90,.55),-1px 0 rgba(40,220,255,.55)}
#r79.gl .np span,#r79.gl .hd b{animation:r79gl .35s steps(3) 2}
@keyframes r79gl{0%{transform:translate(0);clip-path:inset(0 0 0 0)}33%{transform:translate(-2px,1px);clip-path:inset(10% 0 45% 0)}66%{transform:translate(2px,-1px);clip-path:inset(55% 0 5% 0)}100%{transform:translate(0);clip-path:inset(0 0 0 0)}}
#r79 .ctl{display:flex;gap:4px;align-items:center}
#r79 .ctl button{min-width:24px;height:22px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border:1px solid rgba(214,198,154,.3);font-size:12px;color:#f0e8d0}
#r79 .ctl button:hover{border-color:#ff5aa8;color:#fff}
#r79 .ctl .pl{min-width:30px;border-color:rgba(255,90,168,.6)}
#r79 .vb{width:44px;height:5px;background:rgba(255,255,255,.12);position:relative;overflow:hidden}
#r79 .vb i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#3cf,#ff5aa8)}
#r79 .tm{font:600 10px "Exo 2";color:#9fd8ff;font-style:normal;margin-left:auto;font-variant-numeric:tabular-nums}
#r79 .ft{margin-top:4px;font-size:10px;color:#a99fb0;white-space:nowrap;display:flex;gap:6px;align-items:center;justify-content:space-between}
#r79 .ft span{overflow:hidden;text-overflow:ellipsis}
#r79 .sp{color:#1ed760;text-decoration:none;font:700 11px "Exo 2";pointer-events:auto}
#r79 .sp:hover{text-decoration:underline}
#r79 .eq{display:inline-flex;gap:1px;align-items:flex-end;height:9px;margin-left:2px}
#r79 .eq b{width:2px;background:#ff5aa8;animation:r79eq .9s ease-in-out infinite}
#r79 .eq b:nth-child(2){animation-delay:-.3s} #r79 .eq b:nth-child(3){animation-delay:-.6s}
@keyframes r79eq{0%,100%{height:2px}50%{height:9px}}
#r79.ph{left:auto;bottom:auto;right:calc(var(--sr, 0px) + 10px);top:calc(var(--st, 0px) + 158px)}
#r79.ph .rb{width:44px;height:44px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1.5px solid rgba(255,90,168,.55);background:rgba(10,12,14,.6);font-size:18px;line-height:1}
#r79.ph.on .rb{border-color:#ff5aa8;box-shadow:0 0 8px rgba(255,90,168,.35)}
#r79.ph .pn{position:absolute;right:52px;top:-6px;width:clamp(150px,calc(33vw - var(--sr, 0px) - 66px),210px);padding:5px 7px}
#r79.ph .hd{letter-spacing:.1em}
#r79.ph .np2{margin:3px 0;font:600 11.5px "Exo 2";line-height:1.25}
#r79.ph .np2 small{display:block;color:#b9a6c8;font-size:10px}
#r79.ph .np2 span{display:block;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:1px 0 rgba(255,40,90,.55),-1px 0 rgba(40,220,255,.55)}
#r79.ph .ctl{justify-content:space-between;margin-top:4px}
#r79.ph .ctl button{flex:1;min-width:0;height:32px;font-size:15px}
#r79.ph .vb{flex:1.2;width:auto}
#r79.ph .sp{display:block;margin-top:5px;font-size:11.5px;white-space:nowrap}
#r79.ph .toast{position:absolute;right:52px;top:10px;white-space:nowrap;max-width:min(230px,calc(100vw - 140px));overflow:hidden;text-overflow:ellipsis;background:rgba(10,8,16,.72);border-left:2px solid #ff5aa8;padding:3px 8px;font:600 11px "Exo 2";color:#fff;text-shadow:1px 0 rgba(255,40,90,.55),-1px 0 rgba(40,220,255,.55)}
body.m74nh #r79{display:none!important}
body.rtsm #r79{display:none!important}
@media (max-width:1100px){ #r79:not(.ph){left:190px} #r79:not(.ph) .pn{width:236px} }
@media (prefers-reduced-motion:reduce){ #r79 .pn::after,#r79 .eq b,#r79.on .dot{animation:none} }`;
  document.head.appendChild(st);
})();
