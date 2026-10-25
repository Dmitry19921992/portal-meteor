// v7.2: обучение на иврите и вьетнамском (скриншоты для проверки читаемости)
for (const L of ['he', 'vi', 'en']){
  SET.lang = L; applySettings(); MENU.applyLang(); MENU.show('main'); await sleep(200);
  document.getElementById('m_tutorial').click(); await sleep(300);
  await shot(tag + 'lang_' + L + '_menu.jpg');
  T72.start(L === 'en' ? 'pc_rts' : 'pc_fps'); await sleep(1800);
  R[L] = { on: T72.on, title: document.querySelector('#t72p h4') && document.querySelector('#t72p h4').textContent, how: (document.querySelector('#t72p .how') || {}).textContent };
  await shot(tag + 'lang_' + L + '_step.jpg');
  T72.act('exit'); await sleep(400);
}
SET.lang = 'ru'; applySettings(); MENU.applyLang();
R.errs = errs;
return R;
