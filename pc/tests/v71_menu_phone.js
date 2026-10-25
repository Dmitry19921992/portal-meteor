// v7.1: телефон — меню без ползунков и прокрутки, флаги, шаги «− +», «Назад / ✕ / Применить», страницы ☰ (настоящие касания)
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const rect = el => el.getBoundingClientRect();
const vis = el => { if (!el) return false; const r = rect(el), cs = getComputedStyle(el); return r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
const cen = el => { const r = rect(el); return [r.left + r.width / 2, r.top + r.height / 2]; };
const tag = 'D:/AI/pm_v6/shots/v71_' + (innerWidth < 900 ? 'p2' : innerWidth < 920 ? 'and' : 'ip') + '_';
const tapEl = async (el, ms) => { if (!el) return; const [x, y] = cen(el); await T.tap(x, y, ms || 70); await sleep(220); };
const scrEl = () => $('screen');
const fits = () => {
  const el = scrEl(), S0 = M67.safe, W = innerWidth, H = innerHeight;
  const over = el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
  const btns = [...el.querySelectorAll('button')].filter(vis);
  const out = btns.filter(b => { const r = rect(b); return r.left < S0.l - 1 || r.right > W - S0.r + 1 || r.bottom > H - S0.b + 1 || r.top < -1; }).map(b => b.id || b.className);
  const small = btns.filter(b => { const r = rect(b); return r.height < 38 || r.width < 38; }).map(b => (b.id || b.className) + ':' + Math.round(rect(b).width) + 'x' + Math.round(rect(b).height));
  const ranges = el.querySelectorAll('input[type=range]').length;
  return { over, out: out.slice(0, 4), small: small.slice(0, 4), ranges, n: btns.length };
};
const chk = (k, f) => ok(k, !f.over && !f.out.length && !f.small.length && !f.ranges, f);
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(300);
  ok('main_p71', scrEl().classList.contains('p71scr') && !!$('m_play'));
  chk('main_fit', fits()); await shot(tag + 'm_main.jpg');
  // язык — сетка флагов
  await tapEl(document.querySelector('[data-p71go="lang"]'));
  ok('lang_screen', MENU.cur === 'p71lang' && document.querySelectorAll('#screen .p71f svg').length >= 4);
  chk('lang_fit', fits()); await shot(tag + 'm_lang.jpg');
  await tapEl(document.querySelector('#screen [data-lang="en"]'));
  ok('lang_en', SET.lang === 'en' && MENU.cur === 'p71lang');
  await tapEl(document.querySelector('#screen [data-lang="ru"]'));
  await tapEl($('m_back')); ok('lang_back', MENU.cur === 'main');
  // шаги «− значение +» в главном меню
  { const d0 = SET.diff; await tapEl(document.querySelector('#screen [data-p71c="diff"][data-d="-1"]')); const d1 = SET.diff; await tapEl(document.querySelector('#screen [data-p71c="diff"][data-d="1"]'));
    ok('stepper_diff', d1 !== d0 || d0 === 0, [d0, d1, SET.diff]); }
  // настройки: разделы отдельными экранами
  await tapEl($('m_settings')); ok('settings_hub', MENU.cur === 'settings'); chk('settings_fit', fits()); await shot(tag + 'm_settings.jpg');
  for (const s of ['snd', 'gfx', 'ctl', 'game', 'phone']){
    await tapEl(document.querySelector(`#screen [data-p71go="s_${s}"]`));
    chk('sec_' + s, Object.assign(fits(), { cur: MENU.cur }));
    if (s === 'snd'){ const v0 = SET.vol; await tapEl(document.querySelector('#screen [data-p71c="vol"][data-d="-1"]')); ok('vol_minus', SET.vol < v0 || v0 === 0, [v0, SET.vol]); await tapEl(document.querySelector('#screen [data-p71c="vol"][data-d="1"]')); }
    if (s === 'gfx') await shot(tag + 'm_gfx.jpg');
    if (s === 'ctl'){ const lk = M71.pref.look; await tapEl(document.querySelector('#screen [data-p71o="v71:look"]')); ok('opt_look', M71.pref.look !== lk); await tapEl(document.querySelector('#screen [data-p71o="v71:look"]')); }
    await tapEl(document.querySelector('#screen .p71ap')); ok('apply_' + s, MENU.cur === 'settings', MENU.cur);
  }
  await tapEl(document.querySelector('#screen [data-p71go="ges"]')); chk('ges_fit', fits()); await tapEl($('m_back'));
  await tapEl($('m_back')); ok('settings_back', MENU.cur === 'main', MENU.cur);
  await tapEl(document.querySelector('[data-p71go="news"]')); chk('news_fit', fits()); await shot(tag + 'm_news.jpg'); await tapEl(document.querySelector('[data-p71x]')); ok('x_main', MENU.cur === 'main');
  // пауза
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1200);
  MENU.pause(); await sleep(300); chk('pause_fit', fits()); await shot(tag + 'm_pause.jpg');
  await tapEl(document.querySelector('[data-p71go="p70"]')); ok('p70_screen', MENU.cur === 'p71p70'); chk('p70_fit', fits()); await shot(tag + 'm_p70.jpg');
  await tapEl($('m_back')); ok('p70_back', MENU.cur === 'pause');
  await tapEl(document.querySelector('[data-p71x]')); ok('x_resume', !MENU.isOpen() && !S.paused);
  // иврит: те же экраны помещаются
  SET.lang = 'he'; applySettings(); MENU.applyLang(); MENU.pause(); await sleep(300); chk('he_pause_fit', fits());
  MENU.show('settings', true); await sleep(200); chk('he_settings_fit', fits()); MENU.show('p71s_ctl', true); await sleep(200); chk('he_ctl_fit', fits()); await shot(tag + 'm_he_ctl.jpg');
  MENU.close(); S.paused = false; SET.lang = 'ru'; applySettings(); MENU.applyLang(); await sleep(300);
  // меню ☰: страницы без прокрутки
  { await tapEl(document.querySelector('#touch .tt .m67m')); ok('sheet_open', M67.open);
    for (const pg of ['act', 'pos', 'set', 'ges']){
      await tapEl(document.querySelector(`#m67sheet .m71tabs [data-pg="${pg}"]`));
      const sh = $('m67sheet'), sec = [...sh.querySelectorAll('.sec')].filter(vis);
      ok('sheet_' + pg, M71.page === pg && sec.length === 1 && sh.scrollHeight <= sh.clientHeight + 2 && sec[0].getBoundingClientRect().bottom <= sh.getBoundingClientRect().bottom + 1, [sec.length, sh.scrollHeight, sh.clientHeight]);
      if (pg === 'set') await shot(tag + 'm_sheet_set.jpg');
    }
    await tapEl(document.querySelector('#m67sheet [data-x]')); ok('sheet_close', !M67.open); }
  // прочие экраны (информация)
  MENU.show('saves'); await sleep(200); R.saves_scroll = fits().over; MENU.show('career'); await sleep(200); R.career_scroll = fits().over; MENU.close(); S.paused = false;
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
