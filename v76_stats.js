// =====================================================================
//  v7.6 — СТАТИСТИКА: дополнение к v75_stats.js (бэкенд pm-stats на Cloudflare, см. D:\AI\pm_stats\REPORT.md).
//  Подключать ПОСЛЕ v75_stats.js и v75_dendy.js (нужны STATS75, DEN75, PROG): в build.py —
//    JS.insert(JS.index('main.js'), 'v76_stats.js')
//  Добавляет (всё анонимно, без имён/IP/отпечатков):
//   • адрес бэкенда (через window.PM_STATS_ENDPOINT — v75_stats.js его читает, константу можно не трогать);
//   • launch: dev = pc | phone | tablet, gpu = dgpu | igpu | sw | mobile | unknown (только класс, не строка видеокарты),
//     dendy = off | user_1 | user_2 | auto_igpu | auto_fps;
//   • first_kill — первое убийство в матче (сек от начала матча);
//   • play_min {n: 5|15|30} — отметки чистого времени матча (без паузы и меню);
//   • hb раз в минуту (вместе с отправкой): play — секунд в матчах за сессию, fps — медиана за минуту игры, dendy;
//     (время игры не теряется, даже если последний sendBeacon при закрытии вкладки не дошёл);
//   • dendy {why:'fps'} — авто-«Денди» включился посреди игры из-за низкого FPS;
//   • err — JS-ошибки (window.onerror / unhandledrejection): не больше 5 за сессию, без повторов, текст ≤ 140 символов.
//  Время игры и FPS считаются по настоящему времени кадра (performance.now): dt в main.js обрезан до 0.05 с,
//  иначе на слабых устройствах (< 20 к/с) время матча и FPS занижались бы.
//  (Первая отправка уже есть в v7.5: STATS75.frame шлёт очередь на первом же кадре, дальше раз в 60 с.)
// =====================================================================
if (typeof window.PM_STATS_ENDPOINT !== 'string' || !window.PM_STATS_ENDPOINT) window.PM_STATS_ENDPOINT = 'https://pm-stats.pm-gford3.workers.dev/e';
STATS75.ver = '7.6';   // version split on the dashboard
const STATS76 = {
  play: 0, mPlay: 0, match: null, ms: {}, fk: false, dts: [], nErr: 0, seen: new Set(),
  tablet(){ try { return Math.min(screen.width, screen.height) >= 600; } catch (e){ return false; } },
  devType(){ return typeof TOUCH !== 'undefined' && TOUCH.on ? (this.tablet() ? 'tablet' : 'phone') : 'pc'; },
  gpuTier(){
    if (typeof TOUCH !== 'undefined' && TOUCH.on) return 'mobile';
    // v7.6 merge: v7.5 final removed DEN75.gpu / weakGPU (auto-Dendy is FPS-only), so read the renderer here; only the class is sent
    let s = '';
    try { if (typeof DEN75 !== 'undefined' && DEN75.gpu) s = DEN75.gpu(); else { const x = gl.getExtension('WEBGL_debug_renderer_info'); s = String((x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || ''); } } catch (e){}
    if (!s) return 'unknown';
    if (/swiftshader|llvmpipe|basic render|software/i.test(s)) return 'sw';
    if (/nvidia|geforce|quadro|rtx|gtx|\barc\b|radeon ?(rx|pro|vii|r9)/i.test(s)) return 'dgpu';
    if (/intel|uhd graphics|hd graphics|iris|radeon\(tm\) graphics|radeon graphics|vega \d/i.test(s)) return 'igpu';
    return 'unknown';
  },
  dendy(){
    if (typeof SET === 'undefined' || !(SET.denStyle | 0)) return 'off';
    return SET.denAuto ? 'auto_' + SET.denAuto : 'user_' + (SET.denStyle | 0);
  },
  fps(){
    const a = this.dts; if (a.length < 20) return 0;
    const s = a.slice().sort((x, y) => x - y), m = s[s.length >> 1];
    return m > 0 ? Math.round(1 / m) : 0;
  },
  inMatch(){ return typeof S !== 'undefined' && !S.attract && !S.paused && !(typeof MENU !== 'undefined' && MENU.cur) && document.visibilityState === 'visible'; },
  last: 0,
  frame(){
    // wall-clock frame time: main.js caps dt at 0.05 s, which would undercount play time and FPS below 20 fps
    const now = performance.now(), dt = this.last ? (now - this.last) / 1000 : 0;
    this.last = now;
    if (!(dt > 0) || dt > 2) return;   // > 2 s — tab was hidden / frozen
    const M = STATS75.match;
    if (M !== this.match){ this.match = M; this.mPlay = 0; this.ms = {}; this.fk = false; }
    if (this.inMatch()){
      this.play += dt;
      if (M){
        this.mPlay += dt;
        for (const n of [5, 15, 30]) if (!this.ms[n] && this.mPlay >= n * 60){ this.ms[n] = 1; STATS75.ev('play_min', { n }); }
      }
      this.dts.push(dt); if (this.dts.length > 1800) this.dts.splice(0, this.dts.length - 1800);
    }
  },
  hb(){
    STATS75.ev('hb', { play: Math.round(this.play), fps: this.fps(), dendy: this.dendy(), gpu: this.gpuTier() });
    this.dts.length = 0;
  },
  err(msg, at){
    try {
      if (!STATS75.enabled() || this.nErr >= 5) return;
      msg = String(msg || '?').replace(/\s+/g, ' ').slice(0, 140);
      const k = msg + '|' + (at || '');
      if (this.seen.has(k)) return;
      this.seen.add(k); this.nErr++;
      STATS75.ev('err', { msg, at: String(at || '').slice(0, 20) });
    } catch (e){}
  },
};
// launch: уточнить тип устройства, класс видеокарты, стиль графики (init вызывается из setTimeout в v75_stats.js)
{ const in0 = STATS75.init;
  STATS75.init = function(){
    const r = in0.apply(this, arguments);
    try {
      const L = this.q.find(e => e.e === 'launch');
      if (L){ L.dev = STATS76.devType(); L.gpu = STATS76.gpuTier(); L.dendy = STATS76.dendy(); }
    } catch (e){}
    return r;
  }; }
// heartbeat перед каждой отправкой (раз в минуту, при сворачивании и при закрытии)
{ const fl0 = STATS75.flush;
  STATS75.flush = function(final){
    try { if (this.endpoint() && this.enabled()) STATS76.hb(); } catch (e){}
    return fl0.apply(this, arguments);
  }; }
// чистое время матча, отметки 5/15/30 мин, FPS
{ const fr0 = STATS75.frame;
  STATS75.frame = function(dt){ try { STATS76.frame(); } catch (e){} return fr0.apply(this, arguments); }; }
// первое убийство игрока в матче
if (typeof PROG !== 'undefined' && PROG.onKill){
  const ok0 = PROG.onKill;
  PROG.onKill = function(){
    const k0 = this.matchKills | 0, r = ok0.apply(this, arguments);
    try { if (!S.attract && !STATS76.fk && k0 === 0 && (this.matchKills | 0) > 0){ STATS76.fk = true; STATS75.ev('first_kill', { s: Math.round(STATS76.mPlay) }); } } catch (e){}
    return r;
  };
}
// авто-«Денди» посреди игры (низкий FPS)
if (typeof DEN75 !== 'undefined' && DEN75.autoFps){
  const af0 = DEN75.autoFps;
  DEN75.autoFps = function(){
    const was = SET.denAuto, r = af0.apply(this, arguments);
    try { if (!was && SET.denAuto) STATS75.ev('dendy', { why: SET.denAuto, fps: STATS76.fps(), rows: SET.denRows | 0 }); } catch (e){}
    return r;
  };
}
// JS-ошибки
addEventListener('error', e => {
  if (!e || !e.message) return;   // ошибки загрузки ресурсов (img/script) — без message, пропускаем
  const f = String(e.filename || '').split(/[\\/]/).pop().split('?')[0];
  STATS76.err(e.message, (f ? f.slice(-12) : '') + ':' + (e.lineno || 0));
});
addEventListener('unhandledrejection', e => {
  const r = e && e.reason;
  STATS76.err('unhandled: ' + (r && r.message ? r.message : String(r)), '');
});
