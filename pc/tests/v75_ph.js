// v7.5 телефон: обучения, 👁 (что остаётся видимым), магнит по режимам, «Слезть», пауза, настройки → управление
const out = {};
const tg = 'D:/AI/pm_v6/shots/v75_ph_';
const vis = el => { if (!el) return 'none'; const cs = getComputedStyle(el); let o = 1, e = el; while (e && e !== document.body){ o *= +getComputedStyle(e).opacity; if (getComputedStyle(e).display === 'none') return 'hidden(display)'; e = e.parentElement; } const r = el.getBoundingClientRect(); return o > 0.05 && r.width > 0 ? 'visible' : 'hidden(op ' + o.toFixed(2) + ')'; };
await shot(tg + 'menu.jpg');
out.mainTiles = [...document.querySelectorAll('#screen [id^="m_"]')].map(b => b.id);
document.getElementById('m_tutorial') && document.getElementById('m_tutorial').click(); await sleep(500);
out.tut = [...document.querySelectorAll('[data-t72go]')].map(b => b.dataset.t72go); out.othersBtn = !!document.querySelector('[data-t72o]');
await shot(tg + 't72.jpg');
MENU.show('main'); await sleep(300);
MENU.newGame(); await sleep(3500);
out.inMatch = { mode: S.mode, me: S.me && S.me.cls };
// режимы стиков → сила магнита
const lvl = AIMA.lvl(); const base = [0, 0.45, 0.75, 1][lvl];
const kOf = m => { M74.mode = m; return +AIMA.K().toFixed(2); };
out.mag = { lvl, L: kOf('L'), R: kOf('R'), LR: kOf('LR') }; M74.mode = 'L';
// 👁
await shot(tg + 'fps.jpg');
const eye = document.getElementById('m74eye'); out.eyeBtn = vis(eye);
M74.nohud = true; document.body.classList.add('m74nh'); eye && eye.classList.add('on'); await sleep(700);
const q = s => document.querySelector(s);
out.hidden = { eye: vis(eye), switch: vis(q('#touch .tt .m67n')), jet: vis(q('#touch [data-s="LJ"]')) + '/' + vis(q('#touch [data-t="jet"]')), ljoy: vis(q('#m71lj')), rjoy: vis(q('#m71rj')), ov: vis(q('#ov')), hud: vis(q('#hud')), menu: vis(q('#touch .tt [data-t="menu"]') || q('#m67m')), feed: vis(q('#feed')) };
out.jetHtml = (q('#touch [data-s="LJ"]') || {}).outerHTML ? q('#touch [data-s="LJ"]').outerHTML.slice(0, 120) : null;
out.ttKids = [...document.querySelectorAll('#touch .tt > *')].map(e => e.id || e.dataset.t || e.className).slice(0, 12);
await shot(tg + 'nohud.jpg');
M74.nohud = false; document.body.classList.remove('m74nh'); eye && eye.classList.remove('on'); await sleep(300);
// «Слезть»: сесть за пушку ближайшей своей машины
const v = S.vehicles.find(x => x.alive && x.team === 0);
if (v){ S.me.pos = surfacePoint(norm(add(v.pos, mul(anyTangent(norm(v.pos)), 4))), 1); V74.mount(v); await sleep(900); const b = q('#touch [data-s="R4"]'); out.seat = { seat: !!V74.seat, btn: b ? b.textContent.trim() : null, vis: vis(b) }; await shot(tg + 'seat.jpg'); V74.unmount(); await sleep(600); const b2 = q('#touch [data-s="R4"]'); out.unseatBtn = b2 ? b2.textContent.trim() : null; }
// пауза
MENU.pause(); await sleep(500); out.pauseTiles = [...document.querySelectorAll('#screen [id^="m_dev"]')].map(b => b.id + ':' + b.textContent.trim()); await shot(tg + 'pause.jpg');
MENU.show('p71s_ctl', true); await sleep(500); out.magOpen = !!document.querySelector('[data-p75mag="open"]'); await shot(tg + 'ctl.jpg');
document.querySelector('[data-p75mag="open"]').click(); await sleep(500); out.magScreen = MENU.cur; out.magRows = document.querySelectorAll('[data-p75mag]').length; await shot(tg + 'mag.jpg');
const plus = document.querySelector('[data-p75mag="R"][data-d="1"]'); if (plus){ plus.click(); await sleep(300); out.magR = MAG75.get('R'); SET.mag75 = null; MENU.save(); }
MENU.show('p71s_game'); await sleep(400); out.statsRow = !!document.querySelector('[data-p74tog="stats75"]');
MENU.resume(); await sleep(300);
out.errs = errs.slice(0, 12);
return out;
