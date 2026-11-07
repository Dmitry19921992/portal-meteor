// v8.19 TEST (test/v819-0811, integrator Claude-chat 08.11.2026): version label 8.19 over v8.18 for the test build by link.
// Only the label (FX87.VER / STATS75.ver / simple-menu header); the version list VER75.L is NOT changed (v8.18 stays the "new" entry
// until the real release with Dmitry's "yes"). Loaded right after v818_ver.js. Off: ?ver819=0.
try {
  if (new URLSearchParams(location.search).get('ver819') !== '0'){
    if (typeof FX87 !== 'undefined'){ FX87.VER = '8.19'; const f819 = FX87.ver; FX87.ver = h => { h = f819 ? f819(h) : h; return typeof h === 'string' ? h.replace(/v8\.18 · /g, 'v8.19 · ') : h; }; }
    if (typeof STATS75 !== 'undefined') STATS75.ver = '8.19';
    if (typeof UI815 !== 'undefined' && typeof UI815.main === 'function'){   // simple menu header: 'v8.18' (v818_ver.js) -> 'v8.19 test'
      const m819 = UI815.main;
      UI815.main = function(){ const h = m819.apply(this, arguments); return typeof h === 'string' ? h.replace('<small class="u8v">v8.18</small>', '<small class="u8v">v8.19 test</small>') : h; };
    }
  }
} catch (e) { console.warn('v819_ver', e); }
