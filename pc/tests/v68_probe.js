const res = {};
for (const L of ['ru', 'he']){
  SET.lang = L; MENU.applyLang(); MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500); enterRTS(); await sleep(1500);
  const els = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 20 && r.left < 640 && r.right > 600 && r.top < 130 && r.bottom > 80 && getComputedStyle(e).display !== 'none' && e.id; });
  res[L] = els.map(e => { const r = e.getBoundingClientRect(); return e.id + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',') + ' ' + getComputedStyle(e).textAlign + ' ' + (e.innerText || '').slice(0, 40).replace(/\n/g, ' '); });
  await shot('D:/AI/pm_v6/shots/v68_probe_' + L + '.jpg');
}
SET.lang = 'ru'; MENU.applyLang(); MENU.toMenu();
return res;
