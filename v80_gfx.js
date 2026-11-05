// =====================================================================
//  v8.0 — АДАПТИВНАЯ ГРАФИКА (ADG80). Решение Дмитрия:
//   • старт со СРЕДНЕГО уровня; до замера — подсказка по имени видеочипа (WEBGL_debug_renderer_info):
//     SwiftShader / llvmpipe / Intel UHD·HD / слабые Mali·Adreno → ниже среднего; RTX / GTX / RX / Arc / Apple M Pro → выше;
//   • первые секунды (ещё в меню) — быстрый замер FPS и сразу подъём/спуск уровня (до 5 проходов);
//   • дальше плавная подстройка с гистерезисом: просадка 2 с подряд — вниз, стабильный запас 6 с — вверх;
//     если подъём сразу дал просадку — откат и «потолок» на 2 минуты;
//   • главный рычаг — масштаб внутреннего разрешения (на 4K «Высокая» рисует ≈1080p и растягивает), плюс уровни эффектов
//     (качество шейдера S.quality 0–2, глубина отражений портала);
//   • подобранный уровень запоминается на устройстве с привязкой к имени видеочипа (localStorage pm_gfx80);
//     при каждом запуске — короткий перепроверочный замер; видеочип сменился — сброс и подбор заново;
//   • мощное железо: «Ультра» = родное разрешение (масштаб 1) и все эффекты;
//   • меню «Графика»: Авто / Низкая / Средняя / Высокая / Ультра и «Разрешение: Авто / 100% / 75% / 50%».
//     Ручной уровень → эффекты и разрешение уровня фиксированы; ручное разрешение → авто меняет только эффекты;
//   • «Денди» НИКОГДА не включается сам (старое авто v7.5 выключено) — только закрываемая подсказка, если даже «Низкая» не тянет.
//  Заменяет старые «Качество / Авторазрешение / Масштаб» (строки скрыты в меню ПК и телефона) и подстройку LITE73.adapt.
//  Тестовые хуки: ADG80.sim = 120 (подменить замер FPS), ?gfx80gpu=<имя> (подменить видеочип), ADG80.noDraw (не рисовать 3D),
//  ADG80.info(). Хуков в чужих файлах нет — только обёртки (render, applySettings, MENU.html_settings, P71M.*, DEN75.autoFps, LITE73.adapt).
// =====================================================================
if (SET_DEF.gfx80 === undefined) SET_DEF.gfx80 = 'auto';
if (SET_DEF.res80 === undefined) SET_DEF.res80 = 'auto';
if (SET.gfx80 === undefined) SET.gfx80 = 'auto';
if (SET.res80 === undefined) SET.res80 = 'auto';
const ADG80 = {
  KEY: 'pm_gfx80',
  // уровни: q — S.quality шейдера, b — потолок отражений портала, pc/ph — потолок масштаба (ПК / телефон), px — потолок пикселей, mn — нижний масштаб
  LV: [
    { q: 0, b: 1, pc: 0.75, ph: 0.5,  px: 1280 * 720,  mn: 0.35 },
    { q: 1, b: 2, pc: 0.85, ph: 0.65, px: 1600 * 900,  mn: 0.5 },
    { q: 2, b: 4, pc: 1,    ph: 0.85, px: 1920 * 1080, mn: 0.6 },
    { q: 2, b: 8, pc: 1,    ph: 1,    px: 1e12,        mn: 0.8 },
  ],
  L: 1, s: 0.75, gpu: '', hint: 1, ready: false, mode: 'probe', passes: 0,
  fr: 0, t0: 0, skip: 0, low: 0, high: 0, hold: 0, ceil: null, lastUp: null, sim: null, noDraw: false,
  lowDen: 0, denShown: false, log: [], err: 0,
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err){ this.err = 1; console.warn('ADG80 ' + tag, e); } } },
  touch(){ return typeof TOUCH !== 'undefined' && TOUCH.on; },
  lite(){ return typeof LITE73 !== 'undefined' && LITE73.on; },
  target(){ return this.lite() ? 27 : this.touch() ? 45 : 55; },
  maxL(){ return this.lite() ? 1 : 3; },
  autoL(){ return SET.gfx80 === 'auto' || SET.gfx80 === undefined; },
  autoS(){ return SET.res80 === 'auto' || SET.res80 === undefined; },
  cap(L){ const V = this.LV[L], A = max(1, innerWidth * innerHeight); return clamp(min(this.touch() ? V.ph : V.pc, Math.sqrt(V.px / A)), 0.25, 1); },
  min(L){ return min(this.LV[L].mn, this.cap(L) * 0.8); },
  // ---- видеочип
  gpuName(){
    let q = null; try { q = new URLSearchParams(location.search).get('gfx80gpu'); } catch (e){}
    if (q) return q;
    try { const x = gl.getExtension('WEBGL_debug_renderer_info'); const n = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); return String(n || ''); } catch (e){ return ''; }
  },
  hintOf(n){
    if (/swiftshader|llvmpipe|softpipe|software|basic render|intel.*(uhd|hd graphics|hd \d)|mali-(4|t[6-8]|g[3-5]\d)\b|adreno[^0-9]*[2-5]\d\d\b|powervr|videocore/i.test(n)) return 0;
    if (/rtx|gtx|quadro|radeon\s*(rx|pro|vii)|\brx\s?\d{3,4}|\barc\s?a\d|apple m\d\s*(pro|max|ultra)/i.test(n)) return 2;
    return 1;
  },
  // ---- запуск: сохранённое для этого видеочипа или подсказка по имени
  init(){
    this.ready = true;
    this.gpu = this.gpuName(); this.hint = this.hintOf(this.gpu);
    let sv = null; try { sv = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e){}
    if (sv && sv.gpu === this.gpu && sv.L >= 0 && sv.L <= 3){ this.L = min(sv.L, this.maxL()); this.from = 'saved'; this.s = this.min(this.L) + (this.cap(this.L) - this.min(this.L)) * clamp(+sv.k || 0, 0, 1); this.passes = 3; }   // перепроверка — 2 прохода
    else { this.L = min(clamp(1 + (this.hint - 1), 0, 3), this.maxL()); this.from = sv ? 'gpu-changed' : 'hint'; this.s = this.cap(this.L); this.passes = 0; if (sv) try { localStorage.removeItem(this.KEY); } catch (e){} }
    this.mode = this.autoL() || this.autoS() ? 'probe' : 'fixed';
    this.note('init ' + this.from + ' gpu=' + this.gpu.slice(0, 60) + ' hint=' + this.hint + ' L=' + this.L + ' s=' + this.s.toFixed(2));
    this.apply(true);
  },
  save(){
    if (!this.autoL() && !this.autoS()) return;
    const mn = this.min(this.L), cp = this.cap(this.L);
    try { localStorage.setItem(this.KEY, JSON.stringify({ v: 1, gpu: this.gpu, L: this.L, k: +(cp > mn ? (this.s - mn) / (cp - mn) : 1).toFixed(3), t: Date.now() })); } catch (e){}
  },
  note(t){ this.log.push(Math.round(performance.now() / 100) / 10 + 's ' + t); if (this.log.length > 60) this.log.shift(); },
  // ---- итоговые значения → S (после applySettings, LITE73.apply)
  eff(){
    const L = this.autoL() ? this.L : clamp(+SET.gfx80 | 0, 0, 3);
    const s = !this.autoS() ? clamp(+SET.res80 || 1, 0.25, 1) : this.autoL() ? this.s : this.cap(L);
    return { L, s };
  },
  apply(force){
    if (!this.ready) return;
    const { L, s } = this.eff(), V = this.LV[L];
    S.autoRes = false;
    S.quality = V.q;
    S.bounces = min(SET.bounces === undefined ? 4 : SET.bounces, V.b);
    if (typeof LITE73 !== 'undefined' && LITE73.on) LITE73.sc = s;
    if (S.fixedRes) return;
    if (force || abs(S.scale - s) > 0.004){ S.scale = +s.toFixed(3); resize(); this.skip = 3; this.fr = 0; this.t0 = 0; }
  },
  // ---- замер: каждый кадр (обёртка render)
  tick(now){
    if (!this.ready){ if (typeof gl !== 'undefined' && gl) this.init(); return; }
    if (this.mode === 'fixed' || S.fixedRes || document.visibilityState !== 'visible'){ this.fr = 0; this.t0 = 0; return; }
    if (this.skip > 0){ this.skip--; return; }
    if (!this.t0){ this.t0 = now; this.fr = 0; return; }
    this.fr++;
    const el = now - this.t0;
    const probe = this.mode === 'probe';
    if (probe ? !((el >= 600 && this.fr >= 4) || el >= 4000) : el < 1000) return;
    let f = this.fr * 1000 / el; this.fr = 0; this.t0 = now;
    if (this.sim !== null && this.sim !== undefined) f = this.sim;
    this.lastF = f;
    if (probe) this.probeStep(f, now); else this.steadyStep(f, now);
  },
  probeStep(f, now){
    this.passes++;
    const r = f / this.target();
    let ch = false;
    if (r < 0.8) ch = this.down(r, true, now);
    else if (r >= 0.95) ch = this.up(true, now);
    else if (this.lastUp && now - this.lastUp.t < 9000 && r < 0.9){ ch = this.revert(now, true); }
    this.note(`probe#${this.passes} f=${f.toFixed(1)} → L${this.L} s${this.s.toFixed(2)}${ch ? '' : ' ok'}`);
    if (!ch || this.passes >= 5){ this.mode = 'steady'; this.low = this.high = 0; this.hold = 2; this.save(); }
  },
  steadyStep(f, now){
    const r = f / this.target();
    if (this.hold > 0){ this.hold--; return; }
    this.denCheck(f);
    if (r < 0.85){ this.high = 0; if (++this.low >= 2){ this.low = 0; const ch = this.lastUp && now - this.lastUp.t < 9000 ? this.revert(now, false) : this.down(r, false, now); if (ch){ this.hold = 2; this.save(); this.note(`down f=${f.toFixed(1)} → L${this.L} s${this.s.toFixed(2)}`); } } }
    else if (r >= 0.95){ this.low = 0; if (++this.high >= 6){ this.high = 0; if (this.up(false, now)){ this.hold = 2; this.save(); this.note(`up f=${f.toFixed(1)} → L${this.L} s${this.s.toFixed(2)}`); } } }
    else { this.low = 0; this.high = 0; }
  },
  down(r, probe, now){
    const L0 = this.L, s0 = this.s;
    if (this.autoS()){
      let ns = this.s * (probe ? Math.sqrt(max(r, 0.04)) * 0.95 : max(0.85, Math.sqrt(max(r, 0.04))));
      if (ns < this.min(this.L) - 0.005 && this.L > 0 && this.autoL()){ this.L--; ns = ns * 1.12; }
      this.s = clamp(ns, this.min(this.L), this.cap(this.L));
    } else if (this.autoL() && this.L > 0) this.L--;
    const ch = this.L !== L0 || abs(this.s - s0) > 0.004;
    if (ch){ this.lastUp = null; this.apply(); }
    return ch;
  },
  up(probe, now){
    const L0 = this.L, s0 = this.s, C = this.ceil && now < this.ceil.until ? this.ceil : null;
    const blocked = (L, s) => C && (L > C.L || (L === C.L && s > C.s + 0.004));
    if (this.autoS() && this.s < this.cap(this.L) - 0.005){
      const ns = probe ? this.cap(this.L) : min(this.cap(this.L), this.s * 1.12);
      if (!blocked(this.L, ns)) this.s = ns;
      else if (C.L === this.L && C.s > this.s + 0.01) this.s = C.s;
    } else if (this.autoL() && this.L < this.maxL() && !blocked(this.L + 1, 0)){
      this.L++; this.s = clamp(this.s, this.min(this.L), this.cap(this.L));
    }
    const ch = this.L !== L0 || abs(this.s - s0) > 0.004;
    if (ch){ this.lastUp = { t: now, L: L0, s: s0 }; this.apply(); }
    return ch;
  },
  // подъём сразу дал просадку — вернуть как было и не пробовать выше 2 минуты (в первом замере — до конца сессии)
  revert(now, probe){
    const U = this.lastUp; if (!U) return false;
    this.ceil = { L: U.L, s: U.s, until: now + (probe ? 1e12 : 120000) };
    this.L = U.L; this.s = U.s; this.lastUp = null; this.apply();
    this.note('revert → L' + this.L + ' s' + this.s.toFixed(2));
    return true;
  },
  // ручной выбор / смена языка / ресайз — пересчитать
  reconf(){
    if (!this.ready) return;
    const sig = SET.gfx80 + '|' + SET.res80 + '|' + this.lite();
    if (sig !== this.sig){
      const first = this.sig === undefined; this.sig = sig;
      if (!first){
        this.mode = this.autoL() || this.autoS() ? 'steady' : 'fixed';
        if (!this.autoL()) this.L = clamp(+SET.gfx80 | 0, 0, 3);
        if (this.L > this.maxL()) this.L = this.maxL();
        if (this.autoL() && this.autoS()){ this.mode = 'probe'; this.passes = 2; this.ceil = null; }   // вернули «Авто» — быстрый замер
        this.s = clamp(this.s, this.min(this.L), this.cap(this.L));
        this.low = this.high = 0; this.lastUp = null;
        this.note('reconf ' + sig + ' mode=' + this.mode);
      }
    }
    this.apply();
  },
  onResize(){ if (!this.ready) return; this.s = clamp(this.s, this.min(this.L), this.cap(this.L)); this.apply(); },
  names(){ return [tr('Низкая', 'Low', 'Thấp', 'נמוכה'), tr('Средняя', 'Medium', 'Trung bình', 'בינונית'), tr('Высокая', 'High', 'Cao', 'גבוהה'), tr('Ультра', 'Ultra', 'Siêu', 'אולטרה')]; },
  status(){ const e = this.eff(); return `${this.names()[e.L]} · ${Math.round(e.s * 100)}% (${Math.round(innerWidth * e.s)}×${Math.round(innerHeight * e.s)})`; },
  info(){ const e = this.eff(); return { gpu: this.gpu, hint: this.hint, from: this.from, L: e.L, s: +e.s.toFixed(3), mode: this.mode, q: S.quality, b: S.bounces, scale: S.scale, cw: canvas.width, ch: canvas.height, f: this.lastF, ceil: this.ceil, log: this.log.slice(-12) }; },
  // ---- «Денди» — только подсказка (никогда не включаем сами)
  denCheck(f){
    if (this.denShown || typeof DEN75 === 'undefined' || DEN75.style() > 0 || S.attract || MENU.cur || S.mode === undefined) { this.lowDen = 0; return; }
    if (this.eff().L === 0 && this.s <= this.min(0) + 0.01 && f < 18){ if (++this.lowDen >= 10){ this.denShown = true; this.denHint(); } }
    else this.lowDen = 0;
  },
  denHint(){
    let el = document.getElementById('adg80den'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'adg80den';
    el.innerHTML = `<span>${tr('Тормозит даже на «Низкой»? Попробуй денди-режим — он легче', 'Still slow on “Low”? Try the Dendy mode — it is lighter', 'Vẫn chậm ở “Thấp”? Thử chế độ Dendy — nhẹ hơn', 'עדיין איטי ב„נמוכה"? נסה את מצב Dendy')}</span> · ` +
      `<a href="#" data-a80="on">${tr('включить', 'turn on', 'bật', 'הפעל')}</a><b data-a80="x">×</b>`;
    const go = e => {
      const t = e.target.closest('[data-a80]'); if (!t) return;
      e.preventDefault(); e.stopPropagation();
      if (t.dataset.a80 === 'on') this.safe(() => DEN75.set(1), 'den');   // выбор игрока (SET.denUser)
      el.remove();
    };
    el.addEventListener('click', go, true);
    el.addEventListener('touchend', go, { capture: true, passive: false });
    for (const ev of ['mousedown', 'pointerdown', 'touchstart']) el.addEventListener(ev, e => e.stopPropagation(), { capture: true, passive: true });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 20000);
  },
};
// ---------------------------------------------------------------- обёртки
{ const r0 = render;
  render = function(dt, now){ ADG80.safe(() => ADG80.tick(now === undefined ? performance.now() : now), 'tick'); if (ADG80.noDraw) return; return r0.apply(this, arguments); }; }
{ const as0 = applySettings;
  applySettings = function(){ const r = as0.apply(this, arguments); ADG80.safe(() => ADG80.reconf(), 'reconf'); return r; }; }
addEventListener('resize', () => ADG80.safe(() => ADG80.onResize(), 'resize'));
// старая подстройка лёгкого режима (масштаб 0.35–0.6) — теперь ADG80; «глубокое» урезание частиц оставляем
if (typeof LITE73 !== 'undefined'){
  LITE73.adapt = function(f){ if (!ADG80.ready) return; if (ADG80.eff().L === 0 && ADG80.s <= ADG80.min(0) + 0.01 && f < 20 && !this.deep){ this.deep = 1; this.maxP = 12; this.maxL = 3; } };
}
// «Денди» сам не включается никогда (решение Дмитрия) — остаётся только подсказка ADG80.denHint
if (typeof DEN75 !== 'undefined'){ DEN75.autoFps = function(){}; DEN75.autoSet = function(){}; }
// камера/кино-режим возвращает S.autoRes = SET.autoRes — держим выключенным, масштаб ведёт ADG80
SET.autoRes = false;
if (typeof CAMFX !== 'undefined' && CAMFX.end){ const e0 = CAMFX.end; CAMFX.end = function(){ const r = e0.apply(this, arguments); S.autoRes = false; ADG80.apply(true); return r; }; }
// ---------------------------------------------------------------- меню ПК: «Графика» и «Разрешение» вместо «Качество / Авторазрешение / Масштаб»
ADG80.opts = () => ({
  gfx80: [['auto', tr('Авто', 'Auto', 'Tự động', 'אוטו')]].concat(ADG80.names().map((n, i) => [i, n])),
  res80: [['auto', tr('Авто', 'Auto', 'Tự động', 'אוטו')], [1, '100%'], [0.75, '75%'], [0.5, '50%']],
});
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    let h = hs0.apply(this, arguments);
    if (typeof P71M !== 'undefined' && P71M.on && P71M.on()) return h;
    try {
      const O = ADG80.opts();
      const ch = (k, opts) => `<span class="chs adg80">${opts.map(([v, n]) => `<button class="${SET[k] === v ? 'cur' : ''}" data-ch="${k}" data-v="${v}">${n}</button>`).join('')}</span>`;
      const row = (label, ctl) => `<div class="row"><label>${label}</label>${ctl}</div>`;
      const add = row(tr('Графика', 'Graphics', 'Đồ họa', 'גרפיקה'), ch('gfx80', O.gfx80)) + row(tr('Разрешение', 'Resolution', 'Độ phân giải', 'רזולוציה'), ch('res80', O.res80)) +
        `<p class="note adg80n">${tr('Сейчас', 'Now', 'Hiện tại', 'כעת')}: ${ADG80.status()}${ADG80.autoL() || ADG80.autoS() ? ' · ' + tr('подстраивается под FPS', 'adapts to FPS', 'tự chỉnh theo FPS', 'מתכוונן ל-FPS') : ''}</p>`;
      const qRe = /<div class="row"><label>[^<]*<\/label><span class="chs">(?:<button[^>]*data-ch="quality"[^>]*>[^<]*<\/button>)+<\/span><\/div>/;
      h = qRe.test(h) ? h.replace(qRe, add) : h.replace(/(<h4>[^<]*(Графика|Graphics|Đồ họa)[^<]*<\/h4>)/, '$1' + add);
      h = h.replace(/<div class="row"><label>[^<]*<\/label><button class="tog[^"]*" data-tog="autoRes">[^<]*<\/button><\/div>/, '');
      h = h.replace(/<div class="row"><label>[^<]*<\/label><input type="range" data-sl="scale"[^>]*><span class="val" id="v_scale">[^<]*<\/span><\/div>/, '');
    } catch (e){ console.warn('ADG80 menu', e); }
    return h;
  }; }
// телефон: ☰ → Настройки → Графика
if (typeof P71M !== 'undefined' && P71M.sec){
  const ch0 = P71M.CH;
  P71M.CH = function(){ return Object.assign(ch0.call(this), ADG80.opts()); };
  const sec0 = P71M.sec;
  P71M.sec = function(k){
    let h = sec0.apply(this, arguments);
    if (k !== 's_gfx') return h;
    try {
      h = h.replace(/<div class="p71s"><button data-p71c="(quality|scale)"[\s\S]*?<\/div>/g, '').replace(/<button class="p71o[^"]*" data-tog="autoRes">[\s\S]*?<\/button>/, '');
      const add = this.step('gfx80', tr('Графика', 'Graphics', 'Đồ họa', 'גרפיקה')) + this.step('res80', tr('Разрешение', 'Resolution', 'Độ phân giải', 'רזולוציה'));
      h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + add) + '';
      h = h.replace(/(<div class="p71g c2 rows">[\s\S]*?)(<\/div>\s*<div class="p71ft">)/, `$1<p class="adg80n">${uixEsc(ADG80.status())}</p>$2`);
    } catch (e){ console.warn('ADG80 phone menu', e); }
    return h;
  };
}
(function(){ const st = document.createElement('style'); st.textContent = `
  #screen .chs.adg80 button{min-width:0;padding-left:7px;padding-right:7px}
  #screen .adg80n{font-size:11px;opacity:.75;margin:2px 0 6px}
  #screen .p71 .adg80n{grid-column:1/-1;margin:2px 4px;color:#cfc6a8}
  #adg80den{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:2147483000;background:rgba(10,12,14,.88);color:#ffd27a;border:1px solid rgba(255,210,122,.55);
    border-radius:6px;padding:6px 32px 6px 12px;font:600 13px "Exo 2",Arial,sans-serif;max-width:92vw;pointer-events:auto}
  #adg80den a{color:#8fffaa;text-decoration:underline;cursor:pointer} #adg80den b{position:absolute;right:8px;top:3px;cursor:pointer;font-size:18px;color:#e8dcb8}
`; document.head.appendChild(st); })();
// ---------------------------------------------------------------- версия для публикации артефактом claude.ai (window.PM_ART80 ставит build_artifact.py):
// внешние модели, статистика и шрифты недоступны — тихо выключаем, без ошибок в консоли
if (window.PM_ART80){
  try { SET.as75 = false; if (typeof AS75 !== 'undefined'){ AS75.on = () => false; AS75.need = function(){}; } } catch (e){}
  try { if (typeof STATS75 !== 'undefined'){ STATS75.enabled = () => false; STATS75.endpoint = () => ''; } } catch (e){}
}
{ const al0 = MENU.applyLang; MENU.applyLang = function(){ const r = al0.apply(this, arguments); if (window.PM_ART80 || /v80/.test(location.pathname)) document.title = 'Portal Meteor v8.0 test'; return r; }; }
