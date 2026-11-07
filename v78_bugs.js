// =====================================================================
//  T78 — баги плейтеста 07.11 (первая партия). Отдельные выключатели:
//    ?t78lock=0  — фикс 1 (потеря pointer lock -> подсказка, пауза только по Esc)
//    ?t78p=0     — фикс 2 (P — только авто-ниндзя; см. правки в v85_cmd.js)
//    ?t78fin=0   — фикс 3 (финал обучения ставит бой на паузу)
// =====================================================================
const BUG78 = {
  on: (() => { try { return new URLSearchParams(location.search).get('t78') !== '0'; } catch (e){ return true; } })(),
  q: k => { try { const v = new URLSearchParams(location.search).get('t78' + k); return v === null ? true : v !== '0'; } catch (e){ return true; } },
  err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('T78 ' + tag, e); } } },
};
if (BUG78.on && BUG78.q('lock')){
  // ---------------------------------------------------------------- фикс 1
  // Потеря захвата мыши в бою (Alt в Chrome и т.п.) больше не кидает в паузу:
  // показываем подсказку «клик — вернуть мышь», бой идёт дальше. Пауза — только по Esc:
  // Esc рвёт захват без видимых странице клавиш Alt, поэтому «потеря без Alt» = Esc = пауза как раньше.
  let altT = 0, block = false;
  addEventListener('keydown', e => { if (e.code === 'AltLeft' || e.code === 'AltRight') altT = performance.now(); }, true);
  addEventListener('keyup', e => { if (e.code === 'AltLeft' || e.code === 'AltRight') altT = performance.now(); }, true);
  const hint = document.createElement('div');
  hint.id = 't78lock';
  hint.textContent = tr('Клик — вернуть мышь', 'Click to regain the mouse', 'Nhấp để lấy lại chuột');
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(hint));
  if (document.body) document.body.appendChild(hint);
  document.addEventListener('pointerlockchange', () => {
    BUG78.safe(() => {
      if (document.pointerLockElement){ block = false; hint.classList.remove('on'); return; }   // мышь снова захвачена
      block = false;
      if (wantUnlock) return;                                  // свой выход из захвата (Tab в стратегию) — как было
      if (S.mode !== 'fps' || S.attract || S.over || MENU.isOpen()) return;
      if (performance.now() - altT < 700){ block = true; hint.classList.add('on'); }   // Alt случайно — подсказка, не пауза
    }, 'plc');
  }, true);
  const pause0 = MENU.pause;
  MENU.pause = function(){ if (block){ block = false; hint.classList.add('on'); return; } return pause0.apply(this, arguments); };
  if (typeof V8X_DICT !== 'undefined'){
    const A = { 'Click to regain the mouse': ['Click to regain the mouse', 'Чтобы вернуть мышь, нажми', 'Щоб повернути мишу, натисни', '单击以重新捕获鼠标', 'Haz clic para recuperar el ratón', 'Clique para recuperar o mouse', '‏לחץ כדי להחזיר את העכבר', 'Nhấp để lấy lại chuột'] };
    const C = ['en', 'ru', 'tg', 'zh', 'es', 'pt-BR', 'he', 'vi'];
    for (const en in A) C.forEach((L, i) => { const D = V8X_DICT[L] || (V8X_DICT[L] = {}); if (D[en] === undefined) D[en] = A[en][i]; });
  }
  (function(){ const st = document.createElement('style'); st.id = 't78css';
    st.textContent = `#t78lock{position:fixed;left:50%;bottom:18%;transform:translateX(-50%) translateY(8px);z-index:55;pointer-events:none;opacity:0;transition:opacity .18s,transform .18s;
      padding:9px 20px;border-radius:11px;background:rgba(8,10,14,.72);border:1px solid rgba(255,210,122,.55);color:#ffd27a;font:600 16px "Exo 2",sans-serif;text-shadow:0 2px 6px #000}
      #t78lock.on{opacity:1;transform:translateX(-50%) translateY(0)}`;
    document.head.appendChild(st); })();
}
