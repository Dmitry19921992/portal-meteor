// ---------------------------------------------------------------- v7.5 релиз: авто-«Денди» по FPS (решение Дмитрия)
// Средний FPS за первые ~10 с матча < 24 → «Денди» 180 строк; следующие ~10 с ещё < 20 → «Денди» 120 строк.
// Закрываемая плашка «Включён денди-режим для плавности · вернуть обычный»: «вернуть обычный» — обычная графика и
// авто на этом устройстве больше не включается (localStorage pm_den75auto = 'off'). Любой ручной выбор стиля игроком
// (меню / ?dendy=) всегда важнее авто (SET.denUser). Без отдельной ветки «встроенная видеокарта» — только замер FPS.
// ?autodendy=0 — не включать авто в этой сессии, ?autodendy=1 — авто разрешено даже после «вернуть обычный» (проверка).
DEN75.autoKey = 'pm_den75auto';
DEN75.autoAllowed = function(){
  let q = null; try { q = new URLSearchParams(location.search).get('autodendy'); } catch (e){}
  if (q === '0') return false;
  if (q === '1') return true;
  try { return localStorage.getItem(this.autoKey) !== 'off'; } catch (e){ return true; }
};
DEN75.autoBoot = function(){
  if (SET.denUser){ SET.denAuto = 0; return; }
  // старое авто (ветка 'igpu' прошлых сборок / авто прошлой сессии) не наследуем: каждый матч решает свежий замер FPS
  if (SET.denAuto){ SET.denStyle = 0; SET.denAuto = 0; }
};
DEN75.am = null;   // замер текущего матча: { st: 1 | 2 | 0, t, n, f }
DEN75.autoFps = function(f){
  if (S.attract || S.paused || MENU.cur || document.visibilityState !== 'visible' || S.fixedRes || this.failed){ return; }
  if (SET.denUser || !this.autoAllowed()){ this.am = null; return; }
  const m = this.am || (this.am = { st: (SET.denAuto && this.style() === 1) ? 2 : (this.style() > 0 ? 0 : 1), n: 0, f: 0 });
  if (!m.st) return;
  m.n++; m.f += f;
  if (m.n < 10) return;   // ~10 замеров по 1 с
  const avg = m.f / m.n; m.n = 0; m.f = 0;
  this.lastAvg = avg;
  if (m.st === 1){
    m.st = 0;
    if (avg < 24){ this.autoSet(180); m.st = 2; }
  } else if (m.st === 2){
    m.st = 0;
    if (avg < 20) this.autoSet(120);
  }
};
DEN75.autoSet = function(rows){
  SET.denStyle = 1; SET.denRows = rows; SET.denAuto = 'fps';
  applySettings(); MENU.save();
  this.notice();
};
DEN75.autoRevert = function(){
  try { localStorage.setItem(this.autoKey, 'off'); } catch (e){}
  SET.denStyle = 0; SET.denRows = 0; SET.denAuto = 0; this.am = { st: 0, n: 0, f: 0 };
  applySettings(); MENU.save();
  this.noticeClose();
};
DEN75.noticeClose = function(){ const el = document.getElementById('den75note'); if (el) el.remove(); };
DEN75.notice = function(){
  this.noticeClose();
  const el = document.createElement('div'); el.id = 'den75note';
  el.innerHTML = `<span>${tr('Включён денди-режим для плавности', 'Dendy mode enabled for smoothness', 'Đã bật chế độ Dendy cho mượt hơn', 'מצב Dendy הופעל לחלקות')}</span> · ` +
    `<a href="#" data-den75="back">${tr('вернуть обычный', 'back to normal', 'trở về bình thường', 'חזרה לרגיל')}</a><b data-den75="x" title="×">×</b>`;
  el.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:2147483000;background:rgba(10,12,14,.86);color:#ffd27a;' +
    'border:1px solid rgba(255,210,122,.55);border-radius:6px;padding:6px 32px 6px 12px;font:600 13px "Exo 2",Arial,sans-serif;max-width:92vw;pointer-events:auto';
  const st = el.querySelector('b'); st.style.cssText = 'position:absolute;right:8px;top:3px;cursor:pointer;font-size:18px;color:#e8dcb8';
  const a = el.querySelector('a'); a.style.cssText = 'color:#8fffaa;text-decoration:underline;cursor:pointer';
  const go = e => {
    const t = e.target.closest('[data-den75]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.den75 === 'back') this.autoRevert(); else this.noticeClose();
  };
  el.addEventListener('click', go, true);
  el.addEventListener('touchend', go, { capture: true, passive: false });
  for (const ev of ['mousedown', 'pointerdown', 'touchstart']) el.addEventListener(ev, e => e.stopPropagation(), { capture: true, passive: true });
  document.body.appendChild(el);
  clearTimeout(this.noteT); this.noteT = setTimeout(() => this.noticeClose(), 20000);
};
// замер FPS — и в лёгком режиме (телефон): после LITE73.adapt
if (typeof LITE73 !== 'undefined' && LITE73.adapt){
  const ad0 = LITE73.adapt;
  LITE73.adapt = function(f){ const r = ad0.apply(this, arguments); try { DEN75.autoFps(f); } catch (e){} return r; };
}
// новый матч — новый замер (выход в меню между матчами сбрасывает его)
{ let wasMenu = true;
  setInterval(() => { try { const inMenu = !!MENU.cur || !!S.attract; if (inMenu && !wasMenu) DEN75.am = null; wasMenu = inMenu; } catch (e){} }, 1000); }
