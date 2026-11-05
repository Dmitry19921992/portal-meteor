// =====================================================================
//  v8.16 — МЕЛКИЕ ИСПРАВЛЕНИЯ (T42)
//  1) Карточка камеры «CAM-xx» прячется под ЛЮБЫМ меню: не только под экранами
//     MENU (это уже было в CAM66.subject), но и под ☰-шторкой телефона (M67.open)
//     и под туром режимов (UI815.tourI). После закрытия меню карточка возвращается.
//  2) Плавающая надпись над зданием — заметно меньше и полупрозрачнее, особенно
//     на телефоне: ui.js drawWorldMarkers (FIX816.bldFont/bldAlpha, // v816) и
//     rts61.js r61DrawLabel(..., small) для подписи здания под курсором. Остальные
//     метки не тронуты.
//  3) «Чистый экран» (F9 / 👁, body.clean88) теперь прячет 3D-метки мира: шевроны
//     маршрута стратега, «ЗАДАЧА … м», метки зданий/точек/штаба/юнитов/техники,
//     метки урока и побочных задач, строку «» МАРШРУТ СТРАТЕГА · СПРИНТ »».
//     Миникарта, прицел и прочий «разрешённый» HUD остаются (HUD88).
//     Обёртки здесь + две помеченные строки в ui.js (// v816).
//  Хуки: CAM66.subject, edgeMarker, drawWorldMarkers, drawOverlay (S.onRoute),
//  MISSION.drawObjMarker/overlay, V2.overlay, TUT.overlay, SIDEQ.overlay.
//  Выключатель: ?fix816=0 (localStorage не используем). Ошибки модуля не роняют игру.
// =====================================================================
const FIX816 = {
  on: (() => { try { return new URLSearchParams(location.search).get('fix816') !== '0'; } catch (e){ return true; } })(),
  err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ this.fail(e, tag); } },
  fail(e, tag){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('FIX816 ' + tag, e); } },
  ph(){ return typeof TOUCH !== 'undefined' && !!TOUCH.on; },
  // «чистый экран» активен (класс ставит HUD88 только в шутере)
  clean(){ return this.on && !!document.body && document.body.classList.contains('clean88'); },
  // открыто ли меню, под которым CAM-карточка должна прятаться
  uiOpen(){
    if (typeof MENU !== 'undefined' && MENU.isOpen && MENU.isOpen()) return true;
    if (typeof M67 !== 'undefined' && M67.open) return true;                    // ☰-шторка телефона (= пауза в Normal-интерфейсе)
    if (typeof UI815 !== 'undefined' && UI815.tourI >= 0) return true;          // тур «Стратег/Командир/Шутер»
    return false;
  },
  // п.2: шрифт/прозрачность надписи над зданием (null/1 — поведение v8.15)
  bldFont(){ return this.on ? (this.ph() ? '6px "Exo 2", Consolas, sans-serif' : '7px "Exo 2", Consolas, sans-serif') : null; },
  bldAlpha(){ return this.on ? (this.ph() ? 0.6 : 0.72) : 1; },
};
try { window.FIX816 = FIX816; } catch (e){}   // глобальная привязка для помеченных строк // v816 в ui.js/rts61.js
if (FIX816.on){
  // ---------------- п.1: CAM-карточка под любым меню ----------------
  if (typeof CAM66 !== 'undefined' && CAM66.subject){
    const subj816 = CAM66.subject;
    CAM66.subject = function(){ const s = subj816.call(this); return (s && FIX816.uiOpen()) ? null : s; };
  }
  // ---------------- п.3: чистый экран прячет 3D-метки мира ----------------
  // FIX816.clean() в try/catch: при ошибке модуля — лог и «не чистый экран»,
  // чтобы дальше штатно вызвался исходный отрисовщик (игра не падает)
  const clean816 = (tag) => { try { return FIX816.clean(); } catch (e){ FIX816.fail(e, 'clean:' + tag); return false; } };
  const quiet = (obj, name) => {   // обёртка «не рисовать в чистом экране»
    if (!obj || !obj[name]) return;
    const f0 = obj[name];
    obj[name] = function(){ if (clean816(name)) return; return f0.apply(this, arguments); };
  };
  if (typeof edgeMarker !== 'undefined'){ const em816 = edgeMarker; edgeMarker = function(){ if (clean816('edgeMarker')) return; return em816.apply(this, arguments); }; }
  if (typeof drawWorldMarkers !== 'undefined'){ const wm816 = drawWorldMarkers; drawWorldMarkers = function(){ if (clean816('drawWorldMarkers')) return; return wm816.apply(this, arguments); }; }
  quiet(typeof MISSION !== 'undefined' ? MISSION : null, 'drawObjMarker');
  quiet(typeof MISSION !== 'undefined' ? MISSION : null, 'overlay');
  quiet(typeof V2 !== 'undefined' ? V2 : null, 'overlay');
  quiet(typeof TUT !== 'undefined' ? TUT : null, 'overlay');
  quiet(typeof SIDEQ !== 'undefined' ? SIDEQ : null, 'overlay');
  { // строка «» МАРШРУТ СТРАТЕГА · СПРИНТ »» рисуется из S.onRoute внутри drawOverlay
    const do816 = drawOverlay;
    drawOverlay = function(dt){
      try {
        if (!FIX816.clean()) return do816.call(this, dt);
        const r = S.onRoute; S.onRoute = false;
        try { return do816.call(this, dt); } finally { S.onRoute = r; }
      } catch (e){   // ошибка модуля — штатно вызываем исходный отрисовщик
        FIX816.fail(e, 'drawOverlay');
        return do816.call(this, dt);
      }
    };
  }
  // шевроны маршрута и метки юнитов — помеченные условия в ui.js (// v816)
}
