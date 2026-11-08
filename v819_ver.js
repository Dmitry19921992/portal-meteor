// v8.19 RELEASE (08.11.2026, Dmitry said "yes"): version label 8.19 over v8.18 + the version list.
// v8.17 and v8.18 were test builds only (never on itch / portal-meteor.pages.dev, no archive file), so their entries are
// removed from the "Game version" menu and their notes are folded into the v8.19 entry; v8.16 (last live version) goes
// to old versions. Loaded right after v818_ver.js. ?ver819=0 = label of v8.18 (the version list stays 8.19).
try {
  if (new URLSearchParams(location.search).get('ver819') !== '0'){
    if (typeof FX87 !== 'undefined'){ FX87.VER = '8.19'; const f819 = FX87.ver; FX87.ver = h => { h = f819 ? f819(h) : h; return typeof h === 'string' ? h.replace(/v8\.18 · /g, 'v8.19 · ') : h; }; }
    if (typeof STATS75 !== 'undefined') STATS75.ver = '8.19';
    if (typeof UI815 !== 'undefined' && typeof UI815.main === 'function'){   // simple menu header: 'v8.18' (v818_ver.js) -> 'v8.19'
      const m819 = UI815.main;
      UI815.main = function(){ const h = m819.apply(this, arguments); return typeof h === 'string' ? h.replace('<small class="u8v">v8.18</small>', '<small class="u8v">v8.19</small>') : h; };
    }
  }
  if (typeof VER75 !== 'undefined'){
    VER75.L = VER75.L.filter(o => o.id !== 'v8_17' && o.id !== 'v8_18').map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }));
    VER75.L.unshift({ id: 'v8_19', v: 'v8.19', d: '08.11.2026', mb: 30, tag: 'new', n: [
      'Модели Tripo: наши бойцы и робопсы-строители у штаба, мехи «Град» и «Молот», танки «Бульдог» и «Паук» (по-старому: ?t120=0 / ?t94=0). Красивее мир: стены штаба, бетон площадок, тени построек, детальные модели техники и укрытий, трассеры. Музыка EDMITRY в меню и бою, энциклопедия с мини-рендерами, кусты и деревья мешают проходу, ИИ водит технику через туннели. Чётче картинка на мощных видеокартах, 50+ языков, Tab — смена режима, X — вселиться.',
      'Tripo models: our troopers and robodog builders at the HQ, the Grad and Hammer mechs, the Bulldog and Spider tanks (old look: ?t120=0 / ?t94=0). Prettier world: HQ walls, concrete pads, building shadows, detailed vehicle and cover models, tracers. EDMITRY music in the menu and in battle, encyclopedia with mini-renders, bushes and trees block the way, AI drives vehicles through tunnels. Sharper picture on strong GPUs, 50+ languages, Tab switches the mode, X possesses.'] });
    VER75.cur = 'v8_19';
  }
} catch (e) { console.warn('v819_ver', e); }
