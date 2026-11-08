// v7.9 l10n: uz + tg check — menus, pause, settings, tutorial, HUD, end screen; overflow + missing strings. Own Chrome 9363.
const R = { };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const ph = TOUCH.on ? 'ph' : 'pc';
const O = 'D:/AI/pm_v6/shots_l10n/';
const over = () => { const L = []; document.querySelectorAll('#screen button, #screen .p71t, #hint, #obj, #tut').forEach(e => { if (e.offsetParent && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 4) && getComputedStyle(e).overflow !== 'visible') L.push((e.id || e.className || e.tagName).toString().slice(0, 30) + ':' + e.textContent.trim().slice(0, 40)); }); return L.slice(0, 12); };
const sim = async (sec) => { for (let t = 0; t < sec; t += 0.05){ update(0.05); AU.process(S.events); } };
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  for (const L of ['uz', 'tg']){
    const r = R[L] = {}; L79.miss.clear();
    L79.set(L); MENU.stack = []; MENU.show('main'); await sleep(500);
    r.mainOver = over(); await shot(O + L + '_' + ph + '_1_menu.jpg');
    MENU.show('settings', true); await sleep(300); r.setOver = over(); await shot(O + L + '_' + ph + '_2_settings.jpg'); MENU.back();
    MENU.show(TOUCH.on ? 'p71lang' : 'l79', true); await sleep(300); await shot(O + L + '_' + ph + '_3_langlist.jpg'); MENU.back();
    // tutorial step (shooter training)
    MENU.newGame(true); await sleep(1200); if (MENU.cur) MENU.close();
    await sleep(800); r.tut = (document.getElementById('tut') || {}).textContent; r.tut = r.tut && r.tut.trim().slice(0, 120);
    await shot(O + L + '_' + ph + '_4_tutorial.jpg');
    // HUD in a normal match
    TUT.on = false; MENU.newGame(false); await sleep(900); if (MENU.cur) MENU.close(); if (typeof FEEL76 !== 'undefined' && FEEL76.intro) FEEL76.introEnd(true);
    await sim(6); await sleep(600); r.hudOver = over();
    await shot(O + L + '_' + ph + '_5_hud.jpg');
    MENU.pause(); await sleep(300); r.pauseOver = over(); await shot(O + L + '_' + ph + '_6_pause.jpg'); MENU.resume(); MENU.close(); S.paused = false;
    // end screen
    S.winner = 0; S.over = true; S.overWhy = tr('Штаб Роя и все ключевые здания уничтожены', 'The Swarm HQ and all key buildings are destroyed'); MENU.show('end'); await sleep(600);
    r.endOver = over(); r.endTitle = (document.querySelector('#screen h1') || {}).textContent; await shot(O + L + '_' + ph + '_7_end.jpg');
    S.over = false; MENU.toMenu(); await sleep(300);
    r.miss = [...L79.miss.keys()].filter(k => k.startsWith(L + '|')).map(k => k.slice(3, 80)).slice(0, 40); r.missN = L79.miss.size;
  }
  L79.set('en');
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 600); }
R.errs = errs.slice(0, 10);
return R;
