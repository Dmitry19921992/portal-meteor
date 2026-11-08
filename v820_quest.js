// =====================================================================
//  v8.20 Q820 — Quest / Oculus Browser boot preset. FIRST module of the build (before every flag is read).
//  Dmitry 08.11: 8.19 in Quest Browser loaded for a while, froze, then the whole browser crashed (≈30 MB page + Tripo models).
//  On a headset browser (UA "OculusBrowser" / "Quest" / "Pico") — before anything else reads the address line:
//   * lite=1 (phone preset: render scale 0.55, quality 0, 1 bounce, fewer particles / lights, half the bots, 30 fps cap outside VR),
//     t120=0 / t94=0 (no Tripo unit and tank meshes — SDF bodies), mus159=0 (no decoded 3-layer music), hq817=0, t131=0,
//     gnd168=0, mat169=0 (no extra surface / material / contact-shadow passes), as75 3D props off (SET.as75 = false, see below);
//   * the 44 extra language dictionaries (l106/dicts.js, 15 MB of text) are not downloaded (RU / EN / VI are built in).
//   * the scene shader is compiled with quality fixed at low (const uQ = 0: medium / high branches are dropped) — ?qsh=0 keeps it dynamic.
//  ?quest=1 — force on any device (tests), ?quest=0 — off on a headset, ?dicts=1 — keep the dictionaries.
//  Flags the player put in the address line himself win (only missing ones are added).
// =====================================================================
const Q820 = (() => {
  const q = { quest: false, on: false, added: [], dictsSkipped: false, shaderLow: false };
  try {
    const ua = navigator.userAgent || '', sp = new URLSearchParams(location.search);
    q.quest = /OculusBrowser|\bQuest\b|Pico/i.test(ua);
    if (sp.get('quest') === '1') q.quest = true;
    if (sp.get('quest') === '0' || !q.quest) return q;
    q.on = true;
    const want = { lite: '1', t120: '0', t94: '0', mus159: '0', hq817: '0', t131: '0', gnd168: '0', mat169: '0' };
    for (const k in want) if (!sp.has(k)){ sp.set(k, want[k]); q.added.push(k); }
    if (q.added.length) history.replaceState(history.state, '', location.pathname + '?' + sp.toString() + location.hash);
    // the ray-marching shader with the quality switch fixed at «low»: the compiler drops the medium / high branches (shorter compile, fewer registers)
    if (sp.get('qsh') !== '0'){ const fs = document.getElementById('fs'); if (fs){ const t = fs.textContent, t2 = t.replace(/uniform\s+int\s+uQ\s*;/, 'const int uQ = 0;'); if (t2 !== t){ fs.textContent = t2; q.shaderLow = true; } } }
    if (sp.get('dicts') !== '1'){   // the packer loads the dictionaries with a synchronous XHR — answer it with an empty script
      const open0 = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(m, url){
        if (typeof url === 'string' && /(^|\/)l106\/dicts\.js(\?|$)/.test(url)){ q.dictsSkipped = true; XMLHttpRequest.prototype.open = open0; arguments[1] = 'data:text/javascript,%2F%2F%20Q820%3A%20dictionaries%20skipped%20on%20Quest'; }
        return open0.apply(this, arguments);
      };
    }
  } catch (e){ try { console.warn('Q820', e); } catch (_){} }
  return q;
})();
