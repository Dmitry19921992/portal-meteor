// v8.20 RELEASE (08.11.2026, Dmitry said "yes"): Tripo wave 2 (T243) - version label 8.20 over v8.19; v8.19 goes to old versions.
// Dmitry 08.11: the version is always shown WITH build date and time (PC time, UTC+7): "8.20 · 08.11.2026 20:15".
// BUILD_DATE comes from build.py; old versions get the BUILD_DATE of their own archived builds (dates only where the build has none).
// Loaded right after v819_ver.js. ?ver820=0 = label of v8.19 (the version list stays 8.20).
try {
  const BD820 = (typeof BUILD_DATE === 'string' && BUILD_DATE) || '08.11.2026';
  if (new URLSearchParams(location.search).get('ver820') !== '0'){
    if (typeof FX87 !== 'undefined'){ FX87.VER = '8.20'; FX87.VERD = '8.20 · ' + BD820; const f820 = FX87.ver; FX87.ver = h => { h = f820 ? f820(h) : h; return typeof h === 'string' ? h.replace(/v8\.19 · /g, 'v8.20 · ' + BD820 + ' · ') : h; }; }
    if (typeof STATS75 !== 'undefined') STATS75.ver = '8.20';
    if (typeof UI815 !== 'undefined' && typeof UI815.main === 'function'){   // simple menu header: 'v8.19' (v819_ver.js) -> 'v8.20 · <date time>'
      const m820 = UI815.main;
      UI815.main = function(){ const h = m820.apply(this, arguments); return typeof h === 'string' ? h.replace('<small class="u8v">v8.19</small>', '<small class="u8v">v8.20 · ' + BD820 + '</small>') : h; };
    }
  }
  if (typeof VER75 !== 'undefined'){
    const BD = { v8_19: '08.11.2026 14:39', v8_16: '06.11.2026 06:35', v8_15: '05.11.2026 20:03', v7_9: '25.10.2026 22:31', v7_8_1: '25.10.2026 17:46', v7_8: '25.10.2026 11:28',
                 v7_7: '25.10.2026 05:13', v7_6: '25.10.2026 04:07', v7_5: '25.10.2026 02:11', v7_4: '24.10.2026 17:05' };   // BUILD_DATE of the archived builds
    VER75.L = VER75.L.map(o => Object.assign({}, o, { tag: o.tag === 'new' ? undefined : o.tag }, BD[o.id] ? { d: BD[o.id] } : {}));
    VER75.L.unshift({ id: 'v8_20', v: 'v8.20', d: BD820, mb: 30, tag: 'new', n: [
      'Модели Tripo, волна 2: оба штаба, постройки Консорциума (турель, ПВО, форпост, мехзавод, дрон-хаб, аэродок, экстрактор), турели и ПВО Роя, пехота Роя, снайпер, гранатомётчик с базукой, медик, командир-стрелок, боевые дроны и «Шакал» (по-старому: ?t243=0).',
      'Tripo models, wave 2: both HQs, Consortium buildings (turret, AA, outpost, mech factory, drone hub, airdock, extractor), Swarm turrets and AA, Swarm infantry, sniper, bazooka trooper, medic, rifleman commander, combat drones and the Jackal (old look: ?t243=0).'] });
    VER75.cur = 'v8_20';
  }
} catch (e) { console.warn('v820_ver', e); }
