// Сколько стоит новый UI/камера на CPU (мс на вызов)
if (!S.me || S.attract){ MENU.newGame(); await sleep(2500); }
enterRTS(); await sleep(500);
const g = groupsOf(0)[0]; S.sel.clear(); S.sel.add(g);
SIDE.tab = 'units'; buildSidebar();
const T = (fn, n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return +((performance.now() - t0) / n).toFixed(3); };
const out = {
  rtsCamera_ms: T(() => { updateRTSCamera(1 / 60); rtsCamera(); }, 300),
  updateSidebar_ms: T(updateSidebar, 100),
  updateCard_ms: T(updateCard, 100),
  uixFrame_tick_ms: T(() => { UIX.t = 0; uixFrame(0.016); }, 100),
  uixWorldOverlay_ms: T(uixWorldOverlay, 100),
  uiExplain_ms: T(() => uiExplain('prod:tank'), 1000),
};
// в пересчёте на кадр: камера каждый кадр, панель/карточка раз в 0.25 с, uix раз в 0.2 с
out.perFrame_ms = +(out.rtsCamera_ms + out.uixWorldOverlay_ms + (out.updateSidebar_ms + out.updateCard_ms) / 15 + out.uixFrame_tick_ms / 12).toFixed(3);
return out;
