// v8.15 merge: version label once, over v7.9 (v8.15 current, v7.9 / v7.8.1 / v7.8 in old versions). Loaded after all v8 modules, before v79_lang.js.
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.15'; FX87.ver = h => typeof h === 'string' ? h.replace(/v7\.\d+(?:\.\d+)? · /g, 'v8.15 · ') : h; }
if (typeof STATS75 !== 'undefined') STATS75.ver = '8.15';
if (typeof VER75 !== 'undefined'){
  VER75.L = VER75.L.map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }));
  VER75.L.unshift({ id: 'v8_15', v: 'v8.15', d: '05.11.2026', mb: 7.9, tag: 'new', n: ['Режим «Командир», боссы фракций, живой метеорит (рельеф, биомы, погода, аномалии, фауна), живой мир; быстрее, геймпад, планшет, энциклопедия, режим отзыва, простой интерфейс для телефона', 'Commander mode, faction bosses, living meteor (terrain, biomes, weather, anomalies, fauna), living world; faster, gamepad, tablet, encyclopedia, feedback mode, simple phone interface'] });
  VER75.cur = 'v8_15';
}
