// =====================================================================
//  v8.18 — АДАПТИВНАЯ ГРАФИКА БЕЗ «ПИКСЕЛЕЙ» НА МОЩНЫХ ВИДЕОКАРТАХ (GFX818, обёртка над ADG80 из v80_gfx.js + v811_perf.js)
//  Причина (плейтест 06.11, RTX 2080 Ti): пробник ADG80 мерил FPS, пока компилировались шейдеры (кадры по 0,3–2 с), за 4 шага
//  ронял масштаб до 0.33 и сохранял это в localStorage 'pm_gfx80' — навсегда. canvas #c был 360×639 при окне 1080×1920.
//  Что здесь (старые файлы не трогаем):
//   1) новый ключ сохранения 'pm_gfx818' — старые сохранённые 0.33 больше не читаются (сам старый ключ не удаляем);
//   2) первые 10 с после init и пока идут кадры > 200 мс (компиляция, подгрузка) — FPS не меряем; после такого кадра ещё 1,5 с тишины;
//   3) дискретная видеокарта (ADG80.hint = 2, не телефон): масштаб не ниже 0.75 (или потолка уровня, если он ниже),
//      уровень эффектов не ниже «Средней». Ниже — ступенями: < 25 к/с дольше 5 с подряд → пол 0.5; ещё ≥ 10 с так же → пол снят
//      («аварийно»); вернулось ≥ 40 к/с на 10 с — пол 0.75 снова. Если медленно ВСЕ кадры (среднее > 120 мс), длинный кадр
//      не считается «всплеском компиляции» — слабая видеокарта не застрянет в вечном прогреве;
//   4) включён ограничитель кадров (Настройки → «Кадров в секунду» 30/60) — это не перегрузка: цель FPS не выше лимита;
//   5) ручные «Графика» (SET.gfx80) и «Разрешение» (SET.res80) уважаются как раньше — пол действует только в «Авто»;
//   6) текущий масштаб и реальный буфер canvas (ширина×высота) видны: в строке FPS (угол экрана), F3 (подробно), Настройки → Графика.
//  Выкл.: ?gfx818=0. Консоль: GFX818.info(). Ошибка модуля не роняет кадр.
// =====================================================================
const GFX818 = {
  on: (() => { try { return new URLSearchParams(location.search).get('gfx818') !== '0'; } catch (e){ return true; } })(),
  KEY: 'pm_gfx818', WARM_MS: 10000, LONG_MS: 200, QUIET_MS: 1500, FLOOR: 0.75, FLOOR2: 0.5, LMIN: 1,
  EM_FPS: 25, EM_MS: 5000, OK_FPS: 40, OK_MS: 10000,
  t0: 0, lastT: 0, lastLong: 0, longN: 0, emergency: false, stage: 0, stageT: 0, lowSince: 0, okSince: 0,
  mf: 0, mt: 0, f: 0, err: {}, said: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('GFX818 ' + tag, e); } } },
  note(t){ if (typeof ADG80 !== 'undefined' && ADG80.note) ADG80.note('818 ' + t); },
  discrete(){ return typeof ADG80 !== 'undefined' && ADG80.hint === 2 && !ADG80.touch(); },
  floorOn(){ return this.on && this.discrete() && !this.emergency; },
  warming(now){ return !this.t0 || now - this.t0 < this.WARM_MS || now - this.lastLong < this.QUIET_MS; },
  fl(){ return this.stage > 0 ? this.FLOOR2 : this.FLOOR; },
  fsFloor(L){ return Math.min(ADG80.cap(L), this.fl()); },
  // поднять уровень/масштаб до пола (только «Авто»)
  enforce(){
    if (!this.floorOn() || !ADG80.ready) return false;
    let ch = false;
    if (ADG80.autoL() && ADG80.L < this.LMIN && ADG80.maxL() >= this.LMIN){ ADG80.L = this.LMIN; ch = true; }
    if (ADG80.autoS()){ const fl = this.fsFloor(ADG80.L); if (ADG80.s < fl - 0.004){ ADG80.s = fl; ch = true; } }
    if (ch){ this.note('floor → L' + ADG80.L + ' s' + ADG80.s.toFixed(2)); ADG80.apply(true); }
    return ch;
  },
  // собственный счётчик FPS (окна по 1 с) — для «аварийного» режима
  meter(now){
    if (this.warming(now)){ this.mf = 0; this.mt = 0; this.lowSince = 0; return; }
    if (!this.mt){ this.mt = now; this.mf = 0; return; }
    this.mf++;
    const el = now - this.mt; if (el < 1000) return;
    const f = this.f = this.mf * 1000 / el; this.mf = 0; this.mt = now;
    if (!this.discrete()) return;
    if (f < this.EM_FPS){
      this.okSince = 0;
      if (!this.lowSince) this.lowSince = now;
      else if (now - this.lowSince >= this.EM_MS && this.stage < 2){
        // ступень 1: пол 0.75 → 0.5 (уровень не ниже «Средней»); ступень 2 (ещё 10 с < 25 к/с): пол снят совсем
        if (this.stage === 0 || now - this.stageT >= 10000){ this.stage++; this.stageT = now; this.lowSince = now; this.emergency = this.stage >= 2;
          this.note('low fps <' + this.EM_FPS + ' for ' + this.EM_MS / 1000 + ' s — stage ' + this.stage + (this.stage >= 2 ? ' (floor off)' : ' (floor ' + this.FLOOR2 + ')')); }
      }
    } else {
      this.lowSince = 0;
      if (this.stage > 0 && f >= this.OK_FPS){
        if (!this.okSince) this.okSince = now;
        else if (now - this.okSince >= Math.min(120000, this.OK_MS * Math.pow(2, this.drops || 0))){ this.drops = (this.drops || 0) + 1; this.stage = 0; this.emergency = false; this.okSince = 0; this.note('fps back — floor ' + this.FLOOR + ' on'); this.enforce(); }
      } else this.okSince = 0;
    }
  },
  canvasTag(){ try { const c = document.getElementById('c'); return c && c.width ? c.width + '×' + c.height : ''; } catch (e){ return ''; } },
  info(){
    const now = performance.now();
    return Object.assign({ on: this.on, discrete: this.discrete(), floorOn: this.floorOn(), emergency: this.emergency, warming: this.warming(now),
      since: Math.round(now - this.t0), longN: this.longN, f818: +this.f.toFixed(1), stage: this.stage, ema: +(this.ema || 0).toFixed(1), iw: innerWidth, ih: innerHeight, key: ADG80.KEY }, ADG80.info());
  },
  short(){
    const e = ADG80.eff();
    return `${ADG80.names()[e.L]} ${Math.round(e.s * 100)}% · ${this.canvasTag()}${ADG80.autoL() || ADG80.autoS() ? '' : ' · ' + tr('вручную', 'manual', 'thủ công', 'ידני')}${this.emergency ? ' · ' + tr('аварийно', 'emergency', 'khẩn', 'חירום') : ''}${this.warming(performance.now()) ? ' · ' + tr('прогрев', 'warm-up', 'khởi động', 'חימום') : ''}`;
  },
};
if (typeof ADG80 !== 'undefined' && GFX818.on){
  const A = ADG80;
  A.KEY = GFX818.KEY;   // init ещё не вызывался (он ленивый — в первом кадре): сохранённое читается уже из нового ключа
  const init0 = A.init, tick0 = A.tick, min0 = A.min, down0 = A.down, tg0 = A.target, st0 = A.status;
  A.init = function(){
    const r = init0.apply(this, arguments);
    GFX818.safe(() => { GFX818.t0 = performance.now(); GFX818.note('init discrete=' + GFX818.discrete() + ' warm ' + GFX818.WARM_MS / 1000 + 's'); GFX818.enforce(); }, 'init');
    return r;
  };
  A.tick = function(now){
    if (!this.ready) return tick0.apply(this, arguments);
    const G = GFX818;
    let skip = false;
    G.safe(() => {
      const dt = G.lastT ? now - G.lastT : 0; G.lastT = now;
      // одиночный длинный кадр (компиляция/подгрузка) — окно замера выбрасываем; если медленно ВСЁ время (среднее до него > 120 мс) — это не всплеск, меряем
      if (dt > G.LONG_MS && (G.ema || 0) < 120){ G.lastLong = now; G.longN++; this.fr = 0; this.t0 = 0; }
      if (dt > 0) G.ema = G.ema ? G.ema * 0.9 + Math.min(dt, 1000) * 0.1 : Math.min(dt, 50);
      if (G.warming(now)){ this.fr = 0; this.t0 = 0; skip = true; }
      G.meter(now);
    }, 'tick');
    if (skip) return;
    return tick0.apply(this, arguments);
  };
  A.min = function(L){
    const m = min0.apply(this, arguments);
    return GFX818.floorOn() ? Math.min(this.cap(L), Math.max(m, GFX818.fl())) : m;
  };
  A.down = function(r, probe, now){
    const L0 = this.L, s0 = this.s;
    const ch = down0.apply(this, arguments);
    if (!GFX818.floorOn()) return ch;
    GFX818.safe(() => {
      if (this.autoL() && this.L < GFX818.LMIN && L0 >= GFX818.LMIN){ this.L = GFX818.LMIN; this.s = Math.max(Math.min(this.s, this.cap(this.L)), GFX818.fsFloor(this.L)); }
      if (this.autoS() && this.s < GFX818.fsFloor(this.L) - 0.004) this.s = GFX818.fsFloor(this.L);
    }, 'down');
    const ch2 = this.L !== L0 || Math.abs(this.s - s0) > 0.004;
    if (ch) this.apply();   // down0 уже применил свой (более низкий) масштаб — применяем итог после пола; ch2 = false — пол удержал
    return ch2;
  };
  // ограничитель кадров 30/60 из «Настроек» — не перегрузка
  A.target = function(){
    const t = tg0.apply(this, arguments);
    const cap = GFX818.safe(() => typeof UI815 !== 'undefined' && UI815.fpsCap && !S.attract ? UI815.fpsCap() : 0, 'cap') || 0;
    return cap ? Math.min(t, cap * 0.88) : t;
  };
  A.status = function(){
    const b = st0.apply(this, arguments), c = GFX818.canvasTag();
    return b + (c ? ' · ' + tr('буфер', 'buffer', 'bộ đệm', 'מאגר') + ' ' + c : '') + (GFX818.emergency ? ' · ' + tr('аварийно (<25 FPS)', 'emergency (<25 FPS)', 'khẩn (<25 FPS)', 'חירום (<25 FPS)') : '');
  };
  // начало боя: подгрузка 3D-моделей и компиляция новых шейдеров — снова 10 с прогрева (иначе «просадка» старта сажает масштаб)
  if (typeof newMatch === 'function'){
    const nm0 = newMatch;
    newMatch = function(o){
      const r = nm0.apply(this, arguments);
      GFX818.safe(() => { if (!(o && o.attract) && ADG80.ready){ GFX818.t0 = performance.now(); GFX818.lowSince = 0; GFX818.note('battle start — warm-up again'); } }, 'nm');
      return r;
    };
  }
  // строка FPS в углу (#dbg): масштаб + реальный буфер
  if (typeof updateHUD === 'function'){
    const hud0 = updateHUD;
    updateHUD = function(){
      const r = hud0.apply(this, arguments);
      GFX818.safe(() => {
        const el = document.getElementById('dbg'); if (!el || !el.textContent) return;
        const tag = GFX818.canvasTag(); if (!tag || el.textContent.indexOf(tag) >= 0) return;
        const t = el.textContent, k = t.indexOf('\n');
        el.textContent = k < 0 ? t + ' · ' + tag : t.slice(0, k) + ' · ' + tag + t.slice(k);
        if (S.debug && t.indexOf('ADG') < 0) el.textContent += '\nADG ' + GFX818.short() + ' · mode ' + ADG80.mode + (GFX818.f ? ' · ' + GFX818.f.toFixed(0) + ' fps' : '');
      }, 'hud');
      return r;
    };
  }
  // F3 (не в стратегии — там F3 занята панелью): подробная строка графики; повтор — скрыть
  addEventListener('keydown', e => {
    if (e.code !== 'F3' || e.repeat || e.ctrlKey || e.altKey) return;
    if (S.mode === 'rts' && !(typeof CMD85 !== 'undefined' && CMD85.on) && !MENU.isOpen()) return;
    e.preventDefault();   // в Chrome F3 — «Найти»
    if (MENU.isOpen()) return;
    e.stopImmediatePropagation();
    S.debug = !S.debug;
    GFX818.safe(() => feed(tr('Графика', 'Graphics', 'Đồ họa', 'גרפיקה') + ': ' + GFX818.short(), '#9cf'), 'f3');
  }, true);
}
