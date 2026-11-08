// v7.9 l10n: quick probe — selector present, languages switch, no errors. Own Chrome 9363.
const R = { steps: [] };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const warns = []; { const cw = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw.apply(console, a); }; }
const ph = TOUCH.on ? 'ph' : 'pc';
const O = 'D:/AI/pm_v6/shots_l10n/probe_' + ph + '_';
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  R.lang0 = SET.lang; R.navLangs = navigator.languages;
  R.sel = !!document.querySelector('#screen .l79sel'); R.cyc = document.querySelector('.l79cyc') && document.querySelector('.l79cyc').textContent;
  await sleep(300); R.cyc2 = document.querySelector('.l79cyc') && document.querySelector('.l79cyc').textContent;
  await shot(O + 'menu_en.jpg');
  for (const c of ['zh', 'he', 'ru']){
    L79.set(c); MENU.show('main'); await sleep(400);
    R[c] = { title: document.title, play: (document.getElementById('m_play') || {}).textContent, more: (document.querySelector('.l79more') || {}).textContent, dir: document.getElementById('screen').getAttribute('dir') };
    await shot(O + 'menu_' + c + '.jpg');
  }
  MENU.show('l79', true); await sleep(300); await shot(O + 'list.jpg'); R.listN = document.querySelectorAll('.l79c').length;
  MENU.back(); await sleep(200); R.backTo = MENU.cur;
  L79.set('en'); MENU.show('main');
  R.miss = L79.miss.size;
} catch (e){ R.exc = String(e && e.stack || e).slice(0, 600); }
R.errs = errs.slice(0, 10); R.warns = warns.slice(0, 10);
return R;
