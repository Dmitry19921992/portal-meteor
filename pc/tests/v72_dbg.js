// отладка шага «огонь» на телефоне после ранца
const c0 = () => ctrlEntity();
T72.start('ph_fps'); await sleep(1500);
const go = async n => { T72.leave(); T72.i = T72.steps.indexOf(n); T72.enter(); await sleep(600); };
await go('jet');
const p = cen('#touch [data-s="LJ"]'); await T.down(3, p[0], p[1]); await sleep(1300); await T.up(3); await sleep(1500);
const c = c0();
R.a = { cur: cur(), alt: altitude(c.pos), gr: c.grounded, dum: T72.dummies.length };
await sleep(1200);
const d = T72.dummies[1] || T72.dummies[0];
R.b = { cur: cur(), dum: T72.dummies.map(u => [+dist(u.pos, c.pos).toFixed(1), los(gunEye(c), centerOf(u))]), alt: altitude(c.pos), hits: T72.hits };
const f = cen('#touch [data-s="LF"]'); await T.down(3, f[0], f[1]);
for (let i = 0; i < 16; i++){ if (d) c.fwd = norm(sub(centerOf(d), gunEye(c))); await sleep(100); }
R.c = { ml: mouseL, hits: T72.hits, mag: S.kit.mag[S.kit.w], cur: cur(), auto: M71.pref.auto, simple: M67.pref.simple };
await T.up(3);
await shot(tag + 'dbg_fire.jpg');
T72.act('exit'); await sleep(300);
return R;
