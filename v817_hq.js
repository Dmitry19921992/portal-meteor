// v8.17 (T54): hand-built hard-surface HQ environment models (Blender by code: «Шакал», «Носорог», sandbag wall, concrete block,
// supply crate, «Поющая жила»). They are ordinary AS75 catalog items (c: 'hq3d', packed by assets3d_pack.py, allowed by
// tools3d/allow3d.py from Dmitry's ratings); this file only adds a per-model cap (catalog field max, halved on phone / lite)
// so the one allowed nature model does not fill every nature cluster. Without capped items the pick is exactly v7.5's
// (same random draws). ?hq817=0 — HQ models off (v8.16 set of models).
const HQ817 = { on: true, cnt(e){ let n = 0; for (const it of AS75.items) if (it.e === e) n++; return n; } };
try { if (new URLSearchParams(location.search).get('hq817') === '0') HQ817.on = false; } catch (e){}
try {
  if (typeof AS75 !== 'undefined'){
    if (!HQ817.on && AS75.cat){ AS75.cat.items = AS75.cat.items.filter(e => e.c !== 'hq3d'); if (!AS75.cat.items.length) AS75.cat = null; }
    AS75.pick = function(cls, rnd){
      const lite = this.lite();
      const L = this.cat.items.filter(e => e.p === cls && !(e.max && HQ817.cnt(e) >= (lite ? Math.max(1, Math.round(e.max / 2)) : e.max)));
      if (!L.length) return null;
      let s = 0; for (const e of L) s += e.w;
      let x = rnd() * s; for (const e of L){ x -= e.w; if (x <= 0) return e; }
      return L[L.length - 1];
    };
    HQ817.info = () => { const o = {}; for (const it of AS75.items) if (it.e.c === 'hq3d') o[it.key] = (o[it.key] || 0) + 1; return o; };
  }
} catch (e){ console.warn('v817_hq', e); }
