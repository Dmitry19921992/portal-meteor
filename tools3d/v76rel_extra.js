// v7.6 release: version label, news, version menu, 3D allowlist from Cloudflare, stats POST 200, auto-Dendy simulation
const R = {};
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const ph = TOUCH.on ? 'ph' : 'pc';
const O = 'D:/AI/pm_v6/shots_v76rel/' + ph + '_';
const posts = [];
{ const f0 = window.fetch; window.fetch = function(u, o){ const p = f0.apply(this, arguments); if (String(u).includes('pm-stats')) p.then(r => posts.push({ st: r.status, n: (() => { try { return JSON.parse(o.body).ev.map(e => e.e).join(','); } catch (e){ return '?'; } })() })).catch(e => posts.push({ st: 'ERR ' + e.message })); return p; }; }
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(600);
  const sc = document.getElementById('screen');
  R.title = document.title; R.vp = innerWidth + 'x' + innerHeight;
  R.verLabel = (sc.innerHTML.match(/v7\.\d · [^<]{0,40}/g) || []).slice(0, 4);
  R.news = (sc.innerHTML.match(/(Новое в|НОВОЕ В) v7\.\d/g) || []).slice(0, 3);
  R.btnNow = !!document.getElementById('m_f76now'); R.btnVer = !!document.getElementById('m_ver75');
  await shot(O + 'e1_menu.jpg');
  if (TOUCH.on && typeof P71M !== 'undefined' && P71M.on()){ MENU.show('p71news', true); await sleep(400); R.newsPhone = (sc.textContent.match(/НОВОЕ В v7\.\d/) || [''])[0] + ' items ' + sc.querySelectorAll('.p71n').length; await shot(O + 'e2_news.jpg'); MENU.show('main'); await sleep(300); }
  MENU.show('ver75', true); await sleep(500);
  R.verList = [...sc.querySelectorAll('[data-v75]')].map(b => b.dataset.v75 + (b.classList.contains('sel') ? '*' : '') + (b.classList.contains('off') ? '(off)' : '')).join(' ');
  R.verUrl75 = VER75.url('v7_5'); R.archive = VER75.archive;
  await shot(O + 'e3_versions.jpg');
  try { const r = await fetch(VER75.url('v7_5'), { method: 'GET' }); const t = await r.text(); R.cf75 = r.status + ' ' + Math.round(t.length / 1e5) / 10 + 'MB ' + (t.match(/<title>[^<]*/) || [''])[0] + ' back=' + /pmv75back/.test(t); } catch (e){ R.cf75 = 'ERR ' + e.message; }
  MENU.show('main'); await sleep(300);
  // game: start match, wait for 3D models and stats
  MENU.newGame(false); await sleep(800); if (MENU.cur) MENU.close(); if (TUT.on && TUT.finish) TUT.finish();
  for (let i = 0; i < 20 && !(AS75.stats.loaded > 0); i++) await sleep(500);
  R.as75natural = AS75.stats.loaded;
  if (!AS75.stats.loaded && AS75.items.length){ const k = AS75.items[0].key; AS75.need(k + '_lod1', 1); AS75.need(k + '_lod0', 1); R.as75forced = k; }   // none in view yet: request one like the renderer does
  for (let i = 0; i < 40 && !(AS75.stats.loaded > 0); i++) await sleep(500);
  R.as75 = { on: AS75.on(), base: AS75.base, items: AS75.cat ? AS75.cat.items.length : 0, loaded: AS75.stats.loaded, req: AS75.stats.req, fail: AS75.stats.fail, placed: AS75.items.length, err: AS75.err };
  await shot(O + 'e4_game.jpg');
  // stats: launch already queued/sent on first frame; force a flush now and capture status
  STATS75.ev('match_start', { test: 1 }); STATS75.flush(false);
  for (let i = 0; i < 30 && !posts.length; i++) await sleep(300);
  await sleep(1500);
  R.statsEndpoint = STATS75.endpoint(); R.statsVer = STATS75.ver; R.statsSent = STATS75.sent; R.posts = posts.slice(0, 5);
  R.gpu = STATS76.gpuTier(); R.dev = STATS76.devType();
  // auto-Dendy: simulate low FPS through the same path the game uses (DEN75.autoFps), only if the real run did not already switch it
  R.denBefore = { style: DEN75.style(), auto: SET.denAuto, user: SET.denUser, lastAvg: DEN75.lastAvg };
  if (!SET.denUser){
    if (!SET.denAuto){ DEN75.am = null; for (let i = 0; i < 10; i++) DEN75.autoFps(10); }
    R.den1 = { style: DEN75.style(), rows: SET.denRows, auto: SET.denAuto, note: !!document.getElementById('den75note') };
    await sleep(400); await shot(O + 'e5_dendy.jpg');
    for (let i = 0; i < 10; i++) DEN75.autoFps(10);
    R.den2 = { rows: SET.denRows, auto: SET.denAuto };
  }
  R.feelErr = FEEL76.err;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
R.errs = errs.slice(0, 8);
return R;
