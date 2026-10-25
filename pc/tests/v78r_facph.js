// v7.6 phone (iPhone 14 Pro Max landscape): faction screen compact, choice remembered, 3rd-person option in settings
const O = 'D:/AI/pm_v6/shots_v78/';
const out = { errs, touch: TOUCH.on, menu: MENU.cur };
if (MENU.cur !== 'main'){ MENU.toMenu(); await sleep(800); }
await shot(O + 'ph_menu.jpg');
const b = document.getElementById('m_play'); out.playBtn = !!b;
const r = b.getBoundingClientRect(); await T.tap(r.left + r.width / 2, r.top + r.height / 2); await sleep(600);
out.facScreen = MENU.cur;
const cards = [...document.querySelectorAll('[data-fac76]')].map(e => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; });
const go = document.getElementById('m_fac76go'), gq = go && go.getBoundingClientRect();
out.layout = { W: innerWidth, H: innerHeight, cards, go: gq && [Math.round(gq.left), Math.round(gq.top), Math.round(gq.width), Math.round(gq.height)], fits: !!gq && gq.bottom <= innerHeight && cards.every(c => c[1] + c[3] <= innerHeight) };
const c1 = document.querySelector('[data-fac76="1"]').getBoundingClientRect();
await T.tap(c1.left + 40, c1.top + 30); await sleep(500);
out.picked = SET.fac76;
await shot(O + 'ph_faction_screen.jpg');
const g2 = document.getElementById('m_fac76go').getBoundingClientRect(); await T.tap(g2.left + g2.width / 2, g2.top + g2.height / 2); await sleep(5000);
if (MENU.cur) MENU.close(); S.paused = false;
out.match = { F: FAC76_F.slice(), mode: S.mode, me: S.me && S.me.cls };
await sleep(1500); await shot(O + 'ph_swarm_fps.jpg');
MENU.show('p71s_ctl'); await sleep(500);
out.tpvOption = !!document.querySelector('[data-tog="tpv76"]');
await shot(O + 'ph_settings_ctl.jpg');
MENU.close();
FEEL76.demo.end(true); for (let i = 0; i < 80 && MENU.cur !== 'end'; i++) await sleep(200); await sleep(1500); out.end = { cur: MENU.cur, F: FAC76_F.slice(), txt: document.getElementById('screen').textContent.replace(/\s+/g, ' ').slice(0, 120) }; await shot(O + 'ph_end_swarm.jpg');
SET.fac76 = 0; MENU.save();
out.errs = errs.slice(0, 12);
return out;
