// v8.17: version label 8.17 over v8.16 (T54: HQ hard-surface environment models); v8.16 goes to old versions. Loaded right after v816_ver.js.
try {
  if (typeof FX87 !== 'undefined'){ FX87.VER = '8.17'; const f817 = FX87.ver; FX87.ver = h => { h = f817 ? f817(h) : h; return typeof h === 'string' ? h.replace(/v8\.16 · /g, 'v8.17 · ') : h; }; }
  if (typeof STATS75 !== 'undefined') STATS75.ver = '8.17';
  if (typeof VER75 !== 'undefined'){
    VER75.L = VER75.L.map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }));
    VER75.L.unshift({ id: 'v8_17', v: 'v8.17', d: '06.11.2026', mb: 8.7, tag: 'new', n: ['Красивее мир: детальные 3D-модели — «Шакал» и танк «Носорог» на равнинах, стенки из мешков, бетонные блоки и ящики снабжения у точек захвата, редкие кристаллы «Поющей жилы».', 'Prettier world: detailed 3D models — the Jackal and the Rhino tank on the plains, sandbag walls, concrete blocks and supply crates at capture points, rare Singing Vein crystals.'] });
    VER75.cur = 'v8_17';
  }
  if (typeof UI815 !== 'undefined' && typeof UI815.main === 'function'){   // simple menu header: v816_ver.js turns 'v8.15' into 'v8.16' — and this into 'v8.17'
    const m817 = UI815.main;
    UI815.main = function(){ const h = m817.apply(this, arguments); return typeof h === 'string' ? h.replace('<small class="u8v">v8.16</small>', '<small class="u8v">v8.17</small>') : h; };
  }
} catch (e) { console.warn('v817_ver', e); }
