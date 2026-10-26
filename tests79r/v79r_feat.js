// v7.9 radio: widget, key 5 / [ ], real streaming from Cloudflare, ducking, cockpit filter, tutorial rule, autostart, offline fallback, settings.
// Runs in OWN Chrome (CDP 9361, profile chrome_radio) via tools\t79r.ps1. PC: --vp 1280x720; phone: --phone2.
const R = { steps: [] };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); addEventListener('unhandledrejection', e => errs.push('REJ ' + (e.reason && e.reason.message || e.reason))); }
const warns = []; { const cw = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw.apply(console, a); }; }
const PH = TOUCH.on ? 'ph' : 'pc', ph = TOUCH.on;
const O = 'D:/AI/pm_v6/shots_v79r/' + PH + '_';
const step = s => R.steps.push(s + ' @' + Math.round(performance.now() / 1000));
const rect = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null; };
const waitFor = async (f, ms) => { for (let t = 0; t < ms; t += 100){ if (f()) return true; await sleep(100); } return false; };
const press = async code => { if (ph) return; await IN.key(code, 50); await sleep(150); };
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  try { localStorage.removeItem('pm_r79'); R79.mem = {}; } catch (e){}
  SET.r79auto = false; SET.r79vol = 0.55;
  SET.denUser = true; if (typeof DEN75 !== 'undefined' && DEN75.style()) DEN75.set(0);
  R.ext = R79.ext(); R.tracks = R79.L.length; R.bind = SET.bind.radio79;
  R.keyConflict = Object.entries(SET.bind).filter(([a, c]) => c === SET.bind.radio79 && a !== 'radio79').map(x => x[0]);
  // ---------- main menu: no widget
  MENU.show('main'); await sleep(400);
  R.widgetInMenu = !!rect('#r79');
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (TUT.on && TUT.finish) TUT.finish();
  if (typeof FEEL76 !== 'undefined' && FEEL76.intro) FEEL76.introEnd(true);
  await sleep(700);
  R.idleWidget = rect('#r79'); R.idleHTML = (document.getElementById('r79') || {}).textContent;
  R.offByDefault = !R79.on;
  await shot(O + '01_idle.jpg');
  step('match');
  // ---------- turn on (PC: real key 5 via CDP; phone: real tap on 📻)
  if (ph){ const c = ctr('#r79 .rb'); R.phoneBtn = rect('#r79 .rb'); if (c) await T.tap(c[0], c[1]); }
  else { R.keyState = { menu: MENU.isOpen(), cur: MENU.cur, attract: S.attract, mode: S.mode, oper: OPER.on, card: FPS61.card ? +(S.rtime - FPS61.card.t).toFixed(1) : null, intro: !!(typeof FEEL76 !== 'undefined' && FEEL76.intro) }; await IN.key('Digit5', 50); }
  await sleep(200);
  if (!R79.on && !ph){ R.keyRetry = true; if (FPS61.card) FPS61.card = null; await IN.key('Digit5', 50); await sleep(200); }
  R.onAfterKey = R79.on; R.stAfterKey = R79.st;
  const t0 = performance.now();
  R.playing = await waitFor(() => R79.st === 'play' && R79.el && !R79.el.paused && R79.el.currentTime > 0.3, 30000);
  R.loadMs = Math.round(performance.now() - t0);
  R.first = R79.cur() && R79.cur()[1];
  R.src = R79.el && R79.el.src.slice(0, 30);
  R.dur = R79.el && Math.round(R79.el.duration);
  R.nowText = (document.querySelector('#r79 .np') || {}).textContent || null;
  R.spotify = (document.querySelector('#r79 .sp') || {}).href || null;
  R.panel = rect('#r79 .pn');
  R.fetchedFrom = performance.getEntriesByType('resource').filter(e => /\/radio\//.test(e.name)).map(e => e.name.replace(/^https:\/\//, '').slice(0, 70) + ' ' + Math.round(e.transferSize / 1024) + 'KB');
  await sleep(1200); await shot(O + '02_playing.jpg');
  step('play');
  // ---------- audio graph: radio gain > 0, ducking on game SFX
  R.gain = R79.g && +R79.g.gain.value.toFixed(3);
  const dk = []; for (let i = 0; i < 6; i++){ AU.boom(S.cam ? S.cam.pos : S.me.pos, 3); await sleep(60); dk.push(+R79.duckV.toFixed(2)); }
  R.duckOnBooms = dk; await sleep(2500); R.duckAfter = +R79.duckV.toFixed(2);
  // ---------- next / prev / volume
  const tA = R79.cur()[0];
  if (ph){ R79.open = true; R79.sig = ''; R79.render(); await sleep(100); const c = ctr('#r79 [data-r79="next"]'); if (c) await T.tap(c[0], c[1]); } else await press('BracketRight');
  R.nextChanged = R79.cur()[0] !== tA; R.nextTitle = R79.cur()[1];
  R.nextPlaying = await waitFor(() => R79.st === 'play' && !R79.el.paused, 30000);
  R.glitch = document.getElementById('r79').className;
  if (ph){ const c = ctr('#r79 [data-r79="prev"]'); if (c) await T.tap(c[0], c[1]); } else await press('BracketLeft');
  R.prevBack = R79.cur()[0] === tA;
  await waitFor(() => R79.st === 'play' && !R79.el.paused, 30000);
  const v0 = R79.vol();
  if (ph){ const c = ctr('#r79 [data-r79="up"]'); if (c) await T.tap(c[0], c[1]); } else { await IN.key('BracketRight', 50, 8); await sleep(150); }
  R.volUp = [v0, R79.vol()];
  if (ph){ const c = ctr('#r79 [data-r79="dn"]'); if (c) await T.tap(c[0], c[1]); } else { await IN.key('BracketLeft', 50, 8); await sleep(150); }
  R.volDn = R79.vol();
  R.reloadUntouched = SET.bind.reload === 'KeyR';
  await sleep(500); await shot(O + '03_controls.jpg');
  step('ctl');
  // ---------- centre free (phone): panel must not cover the middle third
  const W = innerWidth, H = innerHeight, pr = rect(ph ? '#r79 .pn' : '#r79');
  if (pr){ const cx0 = W / 3, cx1 = W * 2 / 3, cy0 = H / 3, cy1 = H * 2 / 3; R.centerFree = !(pr[0] < cx1 && pr[0] + pr[2] > cx0 && pr[1] < cy1 && pr[1] + pr[3] > cy0); R.panelRect = pr; R.vp = [W, H]; }
  if (ph){ R79.open = false; R79.sig = ''; R79.render(); await sleep(150); R.phoneCompact = rect('#r79'); await shot(O + '04_compact.jpg'); }
  // overlaps with other HUD: support, eye, hint, feed
  const other = ['#s78 .hd', '#m74eye', '#hint', '#feed'].map(s => [s, rect(s)]).filter(x => x[1]);
  const me = rect(ph ? '#r79 .rb' : '#r79');
  R.overlaps = other.filter(([s, o]) => me && o && me[0] < o[0] + o[2] && me[0] + me[2] > o[0] && me[1] < o[1] + o[3] && me[1] + me[3] > o[1]).map(x => x[0]);
  // ---------- cockpit filter in a vehicle
  const tank = S.units.find(u => u.team === 0 && u.alive && u.cls === 'tank');
  if (tank){ const me0 = S.me; takeControl(tank); await sleep(600); R.cockpit = { veh: R79.veh, lp: Math.round(R79.lp.frequency.value), hp: Math.round(R79.hp.frequency.value), st: (document.querySelector('#r79 .hd em') || {}).textContent }; await shot(O + '05_cockpit.jpg'); if (me0 && me0.alive) takeControl(me0); await sleep(600); R.afterVeh = Math.round(R79.lp.frequency.value); }
  step('veh');
  // ---------- pause menu -> radio keeps playing (quieter); settings rows present
  MENU.pause(); await sleep(400);
  R.pauseStill = !R79.el.paused; R.widgetHiddenInMenu = !rect('#r79');
  MENU.show(typeof P71M !== 'undefined' && P71M.on && P71M.on() ? 'p71s_snd' : 'settings'); await sleep(300);
  const sh = document.getElementById('screen').innerHTML;
  R.settingsRows = [/r79vol|data-r79v/.test(sh), /data-tog="r79auto"/.test(sh)];
  await shot(O + '06_settings.jpg');
  MENU.close(); S.paused = false; await sleep(300);
  // ---------- tutorial: autostart does not fire, widget hidden
  R79.stop(true); await sleep(200);
  MENU.newGame(true); await sleep(1200); if (MENU.cur) MENU.close();
  R.tutOn = TUT.on; SET.r79auto = true; R79.userOff = false; await sleep(2500);
  R.autoInTut = R79.on; R.widgetInTut = !!rect('#r79');
  SET.r79auto = false;
  if (TUT.finish) TUT.finish(); TUT.on = false; if (typeof T72 !== 'undefined' && T72.on) T72.stop();
  // ---------- autostart in a normal match
  SET.r79auto = true; R79.userOff = false;
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (typeof FEEL76 !== 'undefined' && FEEL76.intro) FEEL76.introEnd(true);
  R.autoStarted = await waitFor(() => R79.on, 6000);
  R.autoPlaying = await waitFor(() => R79.st === 'play' && !R79.el.paused, 30000);
  SET.r79auto = false;
  step('auto');
  // ---------- offline fallback: unreachable host -> silent "no signal", no errors
  R79.stop(true); const B0 = R79.BASES; R79.BASES = ['https://radio-offline.invalid/radio/']; R79.cache.clear();
  R79.next(1); await waitFor(() => R79.st === 'net', 20000);
  R.offline = { st: R79.st, on: R79.on, paused: R79.el.paused, text: (document.querySelector('#r79 .hd em') || {}).textContent };
  await shot(O + '07_offline.jpg');
  R79.BASES = B0; R79.stop(true);
  step('offline');
  R.errs = errs; R.warns = warns.filter(w => /r79|radio/i.test(w));
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 800); R.errs = errs; }
return R;
