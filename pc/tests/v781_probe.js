// probe: what element is under the finger on the phone RTS / FPS screens
const R = {};
for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
SET.lang = 'ru'; applySettings(); MENU.applyLang();
const at = () => { const o = {}; for (const [x, y] of [[300, 250], [420, 200], [420, 280], [600, 200], [200, 150], [500, 330]]){ const e = document.elementFromPoint(x, y); o[x + ',' + y] = e ? (e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) + ' pe=' + getComputedStyle(e).pointerEvents + ' «' + e.textContent.trim().slice(0, 30) + '»') : null; } return o; };
T72.start('ph_rts'); await sleep(1500);
const i = T72.steps.indexOf('box'); T72.leave(); T72.i = i; T72.enter(); await sleep(1800);
R.t72box = at();
R.hintEl = (() => { const e = [...document.querySelectorAll('div')].find(d => d.children.length < 3 && /долгий тап/.test(d.textContent)); if (!e) return null; const r = e.getBoundingClientRect(); return e.id + '.' + e.className + ' ' + [r.left, r.top, r.width, r.height].map(Math.round) + ' pe=' + getComputedStyle(e).pointerEvents; })();
T72.stop(); MENU.toMenu(); await sleep(500);
MENU.newGame(false); await sleep(1200); if (MENU.cur) MENU.close(); await sleep(800);
enterRTS(); await sleep(1500);
R.rts = at(); R.p64min = typeof P64 !== 'undefined' ? P64.min : null; R.rail = (() => { const r = document.getElementById('m71rail'); if (!r) return null; const b = r.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round) + ' ' + getComputedStyle(r).display; })();
R.bodyCls = document.body.className;
MENU.toMenu();
return R;
