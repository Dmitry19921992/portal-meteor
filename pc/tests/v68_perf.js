// v6.8: цена иврита (словарь/шаблоны) на кадр: FPS и время JS в бою и стратегии, RU vs HE
const res = { startLang: LANG.cur, saved: (() => { try { return JSON.parse(localStorage.getItem('pm_settings')).lang; } catch (e){ return '?'; } })() };
let calls = 0, ms = 0; const h0 = HE68; HE68 = function(s){ calls++; const t = performance.now(); const r = h0(s); ms += performance.now() - t; return r; };
const meas = async (sec) => { let n = 0, t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < sec * 1000) requestAnimationFrame(f); }; requestAnimationFrame(f); await sleep(sec * 1000 + 100); return +(n / sec).toFixed(1); };
for (const L of ['ru', 'he']){
  SET.lang = L; MENU.applyLang(); PROG.allUnlocked = true; MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(2500);
  calls = 0; ms = 0; const fF = await meas(4); const c1 = calls, m1 = ms;
  enterRTS(); await sleep(1500); calls = 0; ms = 0; const fR = await meas(4);
  res[L] = { fpsFps: fF, fpsRts: fR, heCallsFps: c1, heMsFps: +m1.toFixed(1), heCallsRts: calls, heMsRts: +ms.toFixed(1), cache: HE68C.cache.size, tpl: HE68C.tpl ? HE68C.tpl.length : 0 };
}
HE68 = h0; SET.lang = 'ru'; MENU.applyLang(); MENU.toMenu();
return res;
