// v8.20 RELEASE (08.11.2026, Dmitry said "yes"): Tripo wave 2 (T243) - version label 8.20 over v8.19; v8.19 goes to old versions.
// Loaded right after v819_ver.js. ?ver820=0 = label of v8.19 (the version list stays 8.20).
try {
  if (new URLSearchParams(location.search).get('ver820') !== '0'){
    if (typeof FX87 !== 'undefined'){ FX87.VER = '8.20'; const f820 = FX87.ver; FX87.ver = h => { h = f820 ? f820(h) : h; return typeof h === 'string' ? h.replace(/v8\.19 · /g, 'v8.20 · ') : h; }; }
    if (typeof STATS75 !== 'undefined') STATS75.ver = '8.20';
    if (typeof UI815 !== 'undefined' && typeof UI815.main === 'function'){   // simple menu header: 'v8.19' (v819_ver.js) -> 'v8.20'
      const m820 = UI815.main;
      UI815.main = function(){ const h = m820.apply(this, arguments); return typeof h === 'string' ? h.replace('<small class="u8v">v8.19</small>', '<small class="u8v">v8.20</small>') : h; };
    }
  }
  if (typeof VER75 !== 'undefined'){
    VER75.L = VER75.L.map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }));
    VER75.L.unshift({ id: 'v8_20', v: 'v8.20', d: '08.11.2026', mb: 30, tag: 'new', n: [
      'Модели Tripo, волна 2: оба штаба, постройки Консорциума (турель, ПВО, форпост, мехзавод, дрон-хаб, аэродок, экстрактор), турели и ПВО Роя, пехота Роя, снайпер, гранатомётчик с базукой, медик, командир-стрелок, боевые дроны и «Шакал» (по-старому: ?t243=0).',
      'Tripo models, wave 2: both HQs, Consortium buildings (turret, AA, outpost, mech factory, drone hub, airdock, extractor), Swarm turrets and AA, Swarm infantry, sniper, bazooka trooper, medic, rifleman commander, combat drones and the Jackal (old look: ?t243=0).'] });
    VER75.cur = 'v8_20';
  }
} catch (e) { console.warn('v820_ver', e); }
