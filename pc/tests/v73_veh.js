// v7.3: телефон, техника от первого лица: кнопки, индикатор башни.  t73.ps1 v73_veh.js out73_veh.txt "--android --reload"
SET.lang = 'ru'; applySettings(); MENU.applyLang();
try { localStorage.setItem('pm_t72done', '{}'); } catch (e){}
MENU.newGame(); await sleep(4500);
const tk = S.vehicles.find(v => v.alive && v.team === 0 && v.cls === 'tank');
if (!tk) return 'no tank';
S.mode = 'fps'; takeControl(tk); await sleep(1800);
tk.aim = norm(add(tk.fwd, mul(cross(tk.fwd, tk.up), 0.7))); await sleep(700);
await shot('D:/AI/pm_v6/shots/v73_tank.jpg');
const vis = [...document.querySelectorAll('#touch .tf.fps > button, #m71auto, #m71skb, #m73hx, #m73ox')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 2 && getComputedStyle(b).display !== 'none'; }).map(b => (b.dataset.s || b.id) + ':' + Math.round(b.getBoundingClientRect().left) + ',' + Math.round(b.getBoundingClientRect().top));
return { cls: ctrlEntity().cls, act: M73.act(), auto: M71.pref.auto, vis, split: TOUCH.split };
