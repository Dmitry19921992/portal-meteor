// v8.16: version label 8.16 over v8.15 (T42 fixes release); v8.15 goes to old versions. Loaded right after v815_ver.js.
try {
  if (typeof FX87 !== 'undefined'){ FX87.VER = '8.16'; const f816 = FX87.ver; FX87.ver = h => { h = f816 ? f816(h) : h; return typeof h === 'string' ? h.replace(/v8\.15 · /g, 'v8.16 · ') : h; }; }
  if (typeof STATS75 !== 'undefined') STATS75.ver = '8.16';
  if (typeof VER75 !== 'undefined'){
    VER75.L = VER75.L.map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }));
    VER75.L.unshift({ id: 'v8_16', v: 'v8.16', d: '06.11.2026', mb: 8.7, tag: 'new', n: ['Исправления: карточка камеры прячется под паузой и меню, надписи над зданиями меньше и прозрачнее, «чистый экран» (F9/👁) скрывает и метки мира.', 'Fixes: the camera card hides under pause and menus, building labels are smaller and fainter, clean screen (F9/👁) also hides world markers.'] });
    VER75.cur = 'v8_16';
  }
  if (typeof UI815 !== 'undefined' && typeof UI815.main === 'function'){   // simple menu header (u815) had 'v8.15' hard-coded — found by Kimi's smoke test
    const m816 = UI815.main;
    UI815.main = function(){ const h = m816.apply(this, arguments); return typeof h === 'string' ? h.replace('<small class="u8v">v8.15</small>', '<small class="u8v">v8.16</small>') : h; };
  }
} catch (e) { console.warn('v816_ver', e); }
