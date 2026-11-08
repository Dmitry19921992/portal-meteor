// v7.9 radio smoke: game still works with the radio module present and off (no network requests, no audio element), reload R untouched,
// key 4 support panel still opens, tutorial starts, controls screen lists «Радио», 0 errors.
const R = {};
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); addEventListener('unhandledrejection', e => errs.push('REJ ' + (e.reason && e.reason.message || e.reason))); }
const ph = TOUCH.on;
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); SET.r79auto = false;
  try { localStorage.setItem('pm_r79', '{"tip":1}'); R79.mem = { tip: 1 }; } catch (e){}
  R.title = document.title;
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (typeof FEEL76 !== 'undefined' && FEEL76.intro) FEEL76.introEnd(true);
  await sleep(500);
  for (let t = 0; t < 20; t += 0.05){ update(0.05); AU.process(S.events); }
  R.time = +S.time.toFixed(1); R.alive = !!(S.me && S.me.alive); R.units = S.units.length;
  R.radioReq = performance.getEntriesByType('resource').filter(e => /\/radio\//.test(e.name)).length;
  R.audioEl = !!R79.el; R.radioOn = R79.on;
  if (!ph){
    S.me.kit && (S.me.kit.mag = S.me.kit.mag || {});
    const k0 = S.kit ? JSON.stringify(S.kit.mag) : '';
    if (S.kit){ S.kit.mag[S.kit.w] = 1; }
    await IN.key('KeyR', 60); await sleep(200);
    R.reloadStarted = S.kit ? (S.kit.reloadT > 0 || S.kit.mag[S.kit.w] > 1) : null;
    R.radioAfterR = R79.on;
    await IN.key('Digit4', 60); await sleep(200);
    R.supportOpen = S78.open; await IN.key('Digit4', 60); await sleep(100);
    R.supportClosed = !S78.open;
    MENU.show('controls'); await sleep(300);
    R.controlsRow = /Радио Portal Meteor/.test(document.getElementById('screen').innerHTML);
    MENU.close();
  } else {
    R.radioBtn = (() => { const e = document.querySelector('#r79 .rb'); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })();
    MENU.show('settings'); await sleep(300); R.phoneSettingsHasSound = /s_snd/.test(document.getElementById('screen').innerHTML); MENU.close();
    if (typeof P71M !== 'undefined' && P71M.on && P71M.on()){ MENU.show('p71s_snd'); await sleep(300); R.phoneSoundRows = /data-r79v/.test(document.getElementById('screen').innerHTML) && /r79auto/.test(document.getElementById('screen').innerHTML); MENU.close(); }
  }
  MENU.newGame(true); await sleep(1500); if (MENU.cur) MENU.close();
  R.tutorial = TUT.on || (typeof T72 !== 'undefined' && T72.on);
  for (let t = 0; t < 5; t += 0.05){ update(0.05); AU.process(S.events); }
  R.radioInTut = R79.on; R.widgetInTut = !!(document.getElementById('r79') && document.getElementById('r79').style.display !== 'none');
  if (TUT.finish) TUT.finish(); TUT.on = false; if (typeof T72 !== 'undefined' && T72.on) T72.stop();
  MENU.toMenu(); await sleep(400);
  R.errs = errs;
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 800); R.errs = errs; }
return R;
