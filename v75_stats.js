// =====================================================================
//  v7.5 — АНОНИМНАЯ СТАТИСТИКА (заготовка клиента)
//  Что шлём: запуск (версия, дата сборки, язык, телефон/ПК, размер экрана, откуда пришёл — только домен
//  referrer и utm-метки), смена режима (шутер / стратегия / кино), начало и конец матча (сложность,
//  масштаб, итог, длительность), обучение (какое, дошёл ли), длительность сессии. Разработчик помечается.
//  НЕ шлём: имён, почты, IP (его видит только сервер), содержимого сохранений.
//  Анонимный id — случайная строка в localStorage (pm_anon75), сбрасывается вместе с данными сайта.
//  Галка «Анонимная статистика» в настройках (вкл по умолчанию). Пока STATS75_ENDPOINT пуст — НИЧЕГО не шлётся
//  (события копятся в STATS75.q, максимум 200, для проверки). Бэкенд — Cloudflare Worker (отдельно).
// =====================================================================
const STATS75_ENDPOINT = '';   // напр. 'https://pm-stats.<аккаунт>.workers.dev/e' — POST JSON { v, sid, aid, ev: [...] }
const STATS75 = {
  ver: '7.5', q: [], sent: 0, t0: Date.now(), sid: '', aid: '', mode: null, modeT: 0, modeAcc: {}, match: null, flushT: 0, err: 0,
  enabled(){ return SET.stats75 !== false; },
  endpoint(){ try { return STATS75_ENDPOINT || (typeof window.PM_STATS_ENDPOINT === 'string' ? window.PM_STATS_ENDPOINT : ''); } catch (e){ return ''; } },
  rnd(n){ const a = new Uint8Array(n); (crypto && crypto.getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256)); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); },
  init(){
    try { this.aid = localStorage.getItem('pm_anon75') || ''; if (!this.aid){ this.aid = this.rnd(8); localStorage.setItem('pm_anon75', this.aid); } } catch (e){ this.aid = 'na'; }
    this.sid = this.rnd(6);
    let ref = '', utm = {};
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e){}
    try { const q = new URLSearchParams(location.search); for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'ref']) if (q.get(k)) utm[k] = q.get(k).slice(0, 40); } catch (e){}
    const phone = typeof TOUCH !== 'undefined' && TOUCH.on;
    this.ev('launch', { build: typeof BUILD_DATE !== 'undefined' ? BUILD_DATE : '', lang: SET.lang || '', dev: phone ? 'phone' : 'pc',
      scr: [screen.width, screen.height].join('x'), dpr: Math.round((devicePixelRatio || 1) * 10) / 10, host: location.hostname || 'file', ref, utm,
      lite: typeof LITE73 !== 'undefined' && LITE73.on ? 1 : 0, ret: (() => { try { const n = +(localStorage.getItem('pm_runs75') || 0) + 1; localStorage.setItem('pm_runs75', String(n)); return n; } catch (e){ return 0; } })() });
  },
  isDev(){ return typeof DEV !== 'undefined' && (DEV.on || DEV.match) ? 1 : 0; },
  ev(name, data){
    if (!this.enabled()) return;
    const e = Object.assign({ e: name, t: Math.round((Date.now() - this.t0) / 1000) }, data || {});
    if (this.isDev()) e.devm = 1;
    this.q.push(e); if (this.q.length > 200) this.q.splice(0, this.q.length - 200);
  },
  setMode(m){
    const now = Date.now();
    if (this.mode) this.modeAcc[this.mode] = (this.modeAcc[this.mode] || 0) + (now - this.modeT) / 1000;
    if (m !== this.mode && m) this.ev('mode', { m });
    this.mode = m; this.modeT = now;
  },
  body(final){
    const ev = this.q.splice(0, 50);
    if (final){ this.setMode(this.mode); ev.push({ e: 'session', t: Math.round((Date.now() - this.t0) / 1000), modes: Object.fromEntries(Object.entries(this.modeAcc).map(([k, v]) => [k, Math.round(v)])) }); }
    return JSON.stringify({ v: this.ver, sid: this.sid, aid: this.aid, ev });
  },
  flush(final){
    const url = this.endpoint();
    if (!url || !this.enabled() || (!this.q.length && !final)) return false;   // нет адреса — молча ничего не шлём
    try {
      const b = this.body(final);
      if (final && navigator.sendBeacon) navigator.sendBeacon(url, new Blob([b], { type: 'text/plain' }));
      else fetch(url, { method: 'POST', body: b, headers: { 'Content-Type': 'text/plain' }, keepalive: true, mode: 'cors', credentials: 'omit' }).catch(() => {});
      this.sent++;
      return true;
    } catch (e){ if (this.err++ < 3) console.warn('stats75', e); return false; }
  },
  frame(dt){
    const m = S.attract ? (OPER.on ? 'cinema' : 'menu') : (typeof T72 !== 'undefined' && T72.on) ? 'tutorial_' + S.mode : S.mode;
    if (m !== this.mode) this.setMode(m);
    this.flushT -= dt; if (this.flushT <= 0){ this.flushT = 60; this.flush(false); }
  },
};
// ---- события
{ const ng0 = MENU.newGame;
  MENU.newGame = function(tutorial){
    const r = ng0.apply(this, arguments);
    STATS75.match = { t: Date.now() };
    if (!S.attract) STATS75.ev('match_start', { tut: tutorial === true ? 1 : 0, diff: SET.diff, scale: SET.battle, endless: SET.endless ? 1 : 0 });
    return r;
  }; }
if (typeof PROG !== 'undefined' && PROG.matchEnd){ const me0 = PROG.matchEnd; PROG.matchEnd = function(win){ STATS75.ev('match_end', { win: win ? 1 : 0, min: STATS75.match ? Math.round((Date.now() - STATS75.match.t) / 60000) : -1, k: PROG.matchKills || 0 }); STATS75.flush(false); return me0.apply(this, arguments); }; }
if (typeof T72 !== 'undefined'){
  const st0 = T72.start; T72.start = function(id){ STATS75.ev('tut_start', { id }); return st0.apply(this, arguments); };
  const sp0 = T72.stop; if (sp0) T72.stop = function(){ STATS75.ev('tut_stop', { id: this.id, step: this.i, fin: this.fin ? 1 : 0 }); return sp0.apply(this, arguments); };
}
{ const ob0 = OPER.begin; OPER.begin = function(o){ STATS75.ev('cinema', { split: typeof CINE75 !== 'undefined' && CINE75.split ? 1 : 0 }); return ob0.apply(this, arguments); }; }
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); try { STATS75.frame(dt); } catch (e){ if (STATS75.err++ < 3) console.warn('stats75 frame', e); } }; }
addEventListener('pagehide', () => STATS75.flush(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') STATS75.flush(false); });
// ---- галка в настройках (общий обработчик [data-p74tog] из v74.js: SET[k] !== false — вкл по умолчанию)
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    const h = hs0.apply(this, arguments), on = SET.stats75 !== false;
    const row = `<div class="row"><label>${tr('Анонимная статистика', 'Anonymous statistics', 'Thống kê ẩn danh', 'סטטיסטיקה אנונימית')} <small style="opacity:.6">${tr('без имён и почты: версия, устройство, время игры — чтобы делать игру лучше', 'no names or emails: version, device, play time — to make the game better', 'không tên, không email', 'בלי שמות ואימייל')}</small></label><button class="tog ${on ? 'on' : ''}" data-p74tog="stats75">${on ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי')}</button></div>`;
    const i = h.lastIndexOf('</div>');
    return i > 0 ? h.slice(0, i) + row + h.slice(i) : h + row;
  }; }
if (typeof P71M !== 'undefined'){
  const sec0 = P71M.sec;
  P71M.sec = function(k){
    let h = sec0.apply(this, arguments);
    if (k !== 's_game') return h;
    const on = SET.stats75 !== false;
    const row = `<button class="p71o ${on ? 'on' : ''}" data-p74tog="stats75"><span>${uixEsc(tr('Анонимная статистика (без имён и почты)', 'Anonymous statistics (no names or emails)', 'Thống kê ẩn danh', 'סטטיסטיקה אנונימית'))}</span><b>${L71(on ? 'on' : 'off')}</b></button>`;
    return h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + row);
  };
}
setTimeout(() => { try { STATS75.init(); } catch (e){ console.warn('stats75 init', e); } }, 0);
