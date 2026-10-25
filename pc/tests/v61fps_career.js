// v61fps_career.js — прокачка: совместимость со старой карьерой, кривая, медали, мастерство и обвесы, контракты, экран «Карьера», сохранение боя
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = []; window.onerror = (m) => errs.push(String(m));
const out = {};
// 1. старое сохранение карьеры (v6)
const backup = localStorage.getItem('pm_career');
localStorage.setItem('pm_career', JSON.stringify({ xp: 20000, kills: 300, matches: 12, wins: 5, best: 9, tasks: 40 }));
PROG.career = { xp: 0, kills: 0, matches: 0, wins: 0, best: 0, tasks: 0 }; PROG.loadCareer();
const c = CAREER.C(); out.oldSave = { lv: CAREER.levelOf(c.xp), name: CAREER.lvName(CAREER.levelOf(c.xp).L), lvSeen: c.lvSeen, kills: c.kills };
// кривая уровней
const curve = {}; let tot = 0; for (let L = 1; L <= 150; L++){ tot += CAREER_LV.cost(L); if ([1, 5, 10, 25, 50, 100, 150].includes(L)) curve[L] = { cost: CAREER_LV.cost(L), total: tot }; }
out.curve = curve;
// звания в бою
out.ranks = [0, 5, 10, 15, 16, 17, 20].map(i => [PROG.rankName(i), PROG.rankXP(i)]);
// 2. бой: убийства разным оружием
MENU.newGame(); await sleep(1500); CAMFX.fly = null;
const me = S.me; const feeds0 = S.feed.length;
const mk = (cls, extra) => Object.assign({ cls, team: 1, alive: false, pos: add(me.pos, mul(me.fwd, 30)), up: me.up }, extra || {});
S.kit.w = 'rifle';
for (let i = 0; i < 60; i++){ S.lastPT = 'b'; GUNS.lastHead = i % 3 === 0; PROG.onKill(mk('inf'), me); }
S.lastPT = 'r'; PROG.onKill(mk('drone'), me); PROG.onKill(mk('tank'), me);
out.afterKills = { wpn: c.wpn, med: c.med, medT: c.medT, streak: CAREER.streak, ctr: c.ctr.list.map(o => [o.k, o.p + '/' + o.n, o.done]) };
out.riflelv = CAREER.wLv('rifle'); out.rifleMods = CAREER.modsFor('rifle');
out.magPlayer = gstat(pW('rifle'), 'mag'); out.magBots = gstat(WEAPONS.rifle, 'mag'); out.kickPlayer = +gstat(pW('rifle'), 'kick').toFixed(4); out.kickBots = gstat(WEAPONS.rifle, 'kick');
out.matchRank = { rank: PROG.rank, name: PROG.rankName(), xp: PROG.xp };
out.feedSample = S.feed.slice(feeds0).map(f => f.text).filter(t => /Медаль|мастерство|Контракт|КАРЬЕРА|Серия/.test(t)).slice(0, 8);
// смерть сбрасывает серию
FPS61.last = me; me.alive = false; FPS61.onPossess(S.units.find(u => u.team === 0 && u.alive && u !== me)); me.alive = true; out.streakAfterDeath = CAREER.streak;
// 3. экран «Карьера» и переключение обвеса
MENU.pause(); MENU.show('career', true); await sleep(200);
const scr = document.getElementById('screen'); out.careerScreen = { meds: scr.querySelectorAll('.med').length, atts: scr.querySelectorAll('[data-mod]').length, ctr: scr.querySelectorAll('.ctr').length, xc: scr.querySelectorAll('[data-xc]').length };
const b = scr.querySelector('[data-mod="rifle:extmag"]'); if (b){ b.click(); await sleep(50); out.extmagOff = { on: CAREER.attOn('rifle', 'extmag'), mag: gstat(pW('rifle'), 'mag') }; const b2 = document.querySelector('[data-mod="rifle:extmag"]'); if (b2) b2.click(); }
const x = document.querySelector('[data-xc="grn"]'); if (x){ x.click(); out.xcol = CAREER.xcol(); }
MENU.back(); out.backTo = MENU.cur; MENU.close(); S.paused = false;
// 4. сохранение боя и карьеры
PROG.saveCareer(); const saved = JSON.parse(localStorage.getItem('pm_career')); out.savedKeys = Object.keys(saved);
const ok = SAVE.save('m3'); const ld = SAVE.load('m3'); out.saveLoad = { ok, ld, rank: PROG.rank, xp: PROG.xp };
// главное меню рисуется
MENU.show('main'); out.mainHasCareer = !!document.getElementById('m_career'); MENU.close();
out.errs = errs;
if (backup) localStorage.setItem('pm_career', backup); else localStorage.removeItem('pm_career');
return out;
