// shared: wait until the game finished booting (minutes on a loaded PC)
export async function waitBoot(ev, sleep, log, maxS = 900) {
  const t0 = Date.now();
  for (;;) {
    let st = null; try { st = await ev(`(()=>{ const b = document.getElementById('boot'); return b ? (b.style.display === 'none' ? 'done' : (document.getElementById('bootTxt') || {}).textContent) : 'nobootel' })()`); } catch (e) { st = 'eval-fail ' + e.message; if (/ws closed/.test(e.message)) { log('browser gone'); return false; } }
    if (st === 'done') { log('boot done in', ((Date.now() - t0) / 1000).toFixed(0), 's'); return true; }
    if ((Date.now() - t0) / 1000 > maxS) { log('boot TIMEOUT', st); return false; }
    if ((Date.now() - t0) % 60000 < 5200) log('boot…', st); await sleep(5000);
  }
}
