// =====================================================================
//  v8.12 — ПЛАНШЕТ (TAB812): iPad 1024×768 / 1180×820 / 1366×1024, Android-планшеты, обе ориентации.
//  Раньше на планшете включалась телефонная раскладка как есть: мелкие кнопки в углах большого экрана, отступы 6–8 px,
//  в портрете — заглушка «Поверни телефон», «Командир» налезал на счётчик руды, стройка — полосой по низу.
//  Теперь: сенсор + меньшая сторона экрана ≥ 700 CSS px → профиль «планшет» (body.tab812, tab812L / tab812P):
//  • управление как на телефоне, но поля безопасности шире (края 14–16 px, низ 18 px — полоска «домой» на iPad);
//  • кнопки и панели крупнее в k раз (k = 1.2…1.4 от размера экрана) — растут от своего угла внутрь экрана;
//  • миникарты крупнее; меню и пауза — тот же телефонный интерфейс, но крупнее и не растянуты на всю ширину;
//  • Стратег: панель «что строить / производить» — колонкой у левого края, группы v8.0 — справа, центр свободен;
//  • портрет на планшете играбелен — заглушки «поверни телефон» нет;
//  • если что-то всё же налезло (кнопка режима на счётчики) — сдвигаем счётчики (проверка 4 раза в секунду).
//  Хуки — обёртки: M67.measure, mmCenters. Новый код только здесь. ?tab812=0 — выкл., ?tab812=1 — принудительно.
// =====================================================================
const TAB812 = {
  q: (() => { try { return new URLSearchParams(location.search).get('tab812'); } catch (e){ return null; } })(),
  on: false, k: 1, t: 0, err: {}, stats: { checks: 0, nudge: 0, flips: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('TAB812 ' + tag, e); } } },
  PAD: { l: 14, r: 14, t: 10, b: 18 },
  detect(){
    if (this.q === '0') return false;
    if (this.q === '1') return true;
    if (typeof TOUCH === 'undefined' || !TOUCH.on) return false;
    const s = min(innerWidth, innerHeight), sc = screen && screen.width ? min(screen.width, screen.height) : s;
    return min(s, sc || s) >= 700 || (s >= 700 && sc >= 600);
  },
  apply(){
    const on = this.detect(), B = document.body;
    if (on !== this.on){ this.stats.flips++; }
    this.on = on;
    B.classList.toggle('tab812', on);
    B.classList.toggle('tab812L', on && innerWidth >= innerHeight);
    B.classList.toggle('tab812P', on && innerWidth < innerHeight);
    if (!on){ B.style.removeProperty('--k812'); return; }
    this.k = clamp(min(innerWidth, innerHeight) / 600, 1.2, 1.4);
    B.style.setProperty('--k812', this.k.toFixed(3));
    // портрет на планшете — играем, заглушки «поверни телефон» нет
    if (typeof M67 !== 'undefined'){ M67.rotOk = true; } B.classList.add('m67rotok');
    if (typeof M67 !== 'undefined' && M67.measure) this.safe(() => M67.measure(), 'meas');
  },
  // отступы для того, что рисуется на канве (миникарты и пр.)
  padSafe(s){ if (!this.on || !s) return s; const P = this.PAD; return { t: max(s.t, P.t), r: max(s.r, P.r), b: max(s.b, P.b), l: max(s.l, P.l) }; },
  // налезание: кнопка режима «Командир/В бой» (Стратег) или живой портрет на счётчики слева вверху
  nudge(){
    const hud = document.getElementById('hud'); if (!hud) return;
    const B = document.body; let dx = 0;
    if (this.on){
      const prev = parseFloat(B.style.getPropertyValue('--hudx812')) || 0;
      const hr = hud.getBoundingClientRect(), x0 = hr.left - prev;
      for (const id of ['m74go', 'm87']){
        const e = document.getElementById(id); if (!e || !e.offsetWidth) continue;
        const r = e.getBoundingClientRect();
        if (r.top < hr.bottom && r.bottom > hr.top && r.left < hr.right - prev && r.right > x0 - 2 && r.left < x0 + 40) dx = max(dx, r.right + 8 - x0);
      }
    }
    const v = dx > 0 ? Math.round(dx) + 'px' : '';
    if (B.style.getPropertyValue('--hudx812') !== v){ if (v) B.style.setProperty('--hudx812', v); else B.style.removeProperty('--hudx812'); if (v) this.stats.nudge++; }
  },
  frame(dt){
    this.t -= dt; if (this.t > 0) return; this.t = 0.25; this.stats.checks++;
    this.nudge();
  },
};
{
  // отступы безопасности: и для CSS (переменные --sl/--sr/--st/--sb), и для канвы (M67.safe)
  if (typeof M67 !== 'undefined' && M67.measure){ const ms0 = M67.measure; M67.measure = function(){ const r = ms0.apply(this, arguments); if (TAB812.on) this.safe = TAB812.padSafe(this.safe); return r; }; }
  // миникарты крупнее (k), по той же схеме, что и на телефоне (слева внизу, рядом)
  { const mc0 = mmCenters; mmCenters = function(){
      const C = mc0.apply(this, arguments);
      if (!TAB812.on || !C || !C[0] || C[0][0] < -999 || typeof M67 === 'undefined' || !M67.active || !M67.active()) return C;
      MM.R = Math.round(36 * TAB812.k);
      const R = MM.R, s = M67.safe || { l: 14, b: 18 }, y = innerHeight - s.b - 10 - R, x0 = s.l + 8 + R;
      return [[x0, y], [x0 + R * 2 + 14, y]];
    }; }
  const ap = () => TAB812.safe(() => TAB812.apply(), 'apply');
  addEventListener('resize', () => setTimeout(ap, 50));
  addEventListener('orientationchange', () => setTimeout(ap, 250));
  ap(); setTimeout(ap, 0);
  if (typeof TOUCH !== 'undefined' && TOUCH.init){ const ti0 = TOUCH.init; TOUCH.init = function(){ const r = ti0.apply(this, arguments); ap(); return r; }; }
  { const uf0 = uixFrame; uixFrame = function(dt){ const r = uf0.apply(this, arguments); if (TAB812.on || document.body.style.getPropertyValue('--hudx812')) TAB812.safe(() => TAB812.frame(dt || 0.1), 'frame'); return r; }; }
  const st = document.createElement('style'); st.id = 'tab812css'; st.textContent = `
  body.touch.tab812{--sl:max(env(safe-area-inset-left,0px),14px);--sr:max(env(safe-area-inset-right,0px),14px);--sb:max(env(safe-area-inset-bottom,0px),18px);--st:max(env(safe-area-inset-top,0px),10px)}
  body.tab812 #trot{display:none!important}
  /* правый верхний угол: ⇆ / режим / ☰, под ними 👁 и 📡, группы v8.0 */
  body.tab812 #touch .tt{scale:var(--k812);transform-origin:top right}
  body.tab812 #m74eye{transform-origin:top right;scale:var(--k812);translate:0 calc(46px * (var(--k812) - 1) + 4px)}
  body.tab812 #s78{transform-origin:top right;scale:var(--k812);translate:0 calc(90px * (var(--k812) - 1) + 8px)}
  body.tab812 #g80{transform-origin:top right;scale:var(--k812);translate:0 calc(46px * (var(--k812) - 1) + 10px);max-height:calc((100vh - 120px) / var(--k812))}
  /* левый верхний угол: счётчики, «Ты: …», кнопка режима Стратега */
  body.tab812 #hud{transform-origin:top left;scale:var(--k812);translate:calc(var(--sl) - 8px + var(--hudx812, 0px)) calc(var(--st) - 6px)}
  body.tab812 #who73{transform-origin:top left;scale:var(--k812);translate:calc(var(--sl) - 8px) calc(var(--st) - 6px + 34px * (var(--k812) - 1))}
  body.tab812 #m74go{transform-origin:top left;scale:var(--k812)}
  body.tab812 #feed{translate:0 calc(42px * (var(--k812) - 1));font-size:calc(12px * var(--k812))}
  body.tab812.m74s #feed{translate:calc(170px * var(--k812) - 130px) calc(48px * (var(--k812) - 1))}
  /* шутер: кнопки сенсора крупнее (от своего центра), низ — выше полоски «домой» */
  body.tab812 #touch .tf.fps > button{scale:calc(1 + (var(--k812) - 1) * .8)}
  body.tab812 #kit, body.tab812 #bars, body.tab812 #m74mode{translate:0 calc(-1 * var(--sb) + 4px)}
  body.tab812 #kit{scale:var(--k812);transform-origin:bottom center}
  body.tab812 #obj{scale:calc(1 + (var(--k812) - 1) * .6);transform-origin:top center}
  /* Стратег (простая панель): «что строить / производить» — колонкой у левого края, центр свободен */
  body.tab812 #m74B{left:calc(var(--sl) + 2px);right:auto;top:calc(var(--st) + 52px * var(--k812) + 12px);bottom:auto;width:calc(150px * var(--k812));align-items:flex-start}
  body.tab812 #m74B .t{white-space:normal;font-size:calc(11px * var(--k812));line-height:1.2;margin-bottom:5px;max-width:100%}
  body.tab812 #m74B .row{flex-wrap:wrap;overflow-x:hidden;overflow-y:auto;gap:5px;max-height:calc(100vh - var(--st) - var(--sb) - 52px * var(--k812) - 60px - 72px * var(--k812) - 40px)}
  body.tab812 #m74B .it{width:calc(70px * var(--k812));height:calc(60px * var(--k812))}
  body.tab812 #m74B .it i{font-size:calc(16px * var(--k812))} body.tab812 #m74B .it b, body.tab812 #m74B .it em{font-size:calc(9.5px * var(--k812));max-width:calc(66px * var(--k812))}
  /* Командир: карточки отрядов и способности крупнее */
  body.tab812 #c85.ph .c5cards{top:calc(var(--st) + 52px * var(--k812) + 14px);bottom:auto;left:var(--sl);scale:var(--k812);transform-origin:top left;max-height:calc((100vh - var(--st) - var(--sb) - 124px * var(--k812) - 90px) / var(--k812))}
  body.tab812P #c85.ph .c5cards{max-height:calc(42vh / var(--k812))}
  body.tab812 #c85.ph .c5bar{scale:var(--k812);transform-origin:bottom right;translate:calc(-1 * var(--sr) + 8px) calc(-1 * var(--sb) + 8px)}
  body.tab812P #c85.ph .c5bar{transform-origin:bottom center;translate:0 calc(-1 * var(--sb) + 8px)}
  /* пауза / меню поверх: панели Стратега под ней не видны (раньше просвечивали поверх плиток паузы) */
  body.touch:has(#screen[style*="flex"]) #m74r{display:none!important}
  /* меню и пауза: крупнее, не растянуты */
  body.tab812 #screen.p71scr > *{zoom:calc(var(--k812) * .92)}
  body.tab812.tab812L #screen.p71scr > *{max-width:calc(1100px / var(--k812));margin-left:auto;margin-right:auto}
  body.tab812 #m87pk{scale:var(--k812)}
  `; document.head.appendChild(st);
}
