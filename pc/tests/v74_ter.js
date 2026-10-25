// v7.4: рельеф — FPS и скриншоты (вызывать дважды: с pm_ter74 и без)
SET.lang = 'ru'; applySettings(); MENU.applyLang();
MENU.newGame(); await sleep(3500);
const tg4 = (TER74 ? 'on' : 'off') + (PH ? '_ph' : '');
const fps = async ms => { let n = 0, go = true; const f = () => { n++; if (go) requestAnimationFrame(f); }; requestAnimationFrame(f); await sleep(ms); go = false; return +(n / ms * 1000).toFixed(1); };
R.fps_base = await fps(4000);
// найти каньон, останец и озеро недалеко от базы
const find = (fn) => { let best = null, bv = 1e9; for (let la = 40; la < 88; la += 2) for (let lo = 0; lo < 360; lo += 4){ const d = dirLL(la, lo), q = mul(d, RM), v = fn(q); if (v < bv){ bv = v; best = d; } } return best; };
const can = find(q => { const s = Math.cos(TKd(TK.A, ...q)) + 0.7 * Math.cos(TKd(TK.B, ...q)); return Math.abs(s) + (TER74 ? 0 : 0); });
const lake = find(q => -(smoothstep(0.62, 0.95, Math.cos(TKd(TK.E, ...q)) * Math.cos(TKd(TK.F, ...q))) * smoothstep(0.15, 0.55, Math.cos(TKd(TK.G, ...q)))) + Math.abs(dot(norm(q), [0,1,0]) - 0.85));
const rock = find(q => -(Math.cos(TKd(TK.C, ...q)) * Math.cos(TKd(TK.D, ...q))));
const me = S.me;
const look = async (d, name, back) => {
  const tdir = anyTangent(d), pos = offsetOnSphere(d, tdir, -(back || 30));
  me.pos = surfacePoint(pos, 1.2); me.vel = [0, 0, 0];
  me.fwd = tangent(sub(surfacePoint(d, 0), me.pos), norm(me.pos)); me.aim = me.fwd;
  await sleep(900); await shot(`D:/AI/pm_v6/shots/v74_ter_${name}_${tg4}.jpg`);
};
await look(can, 'canyon', 25); R.fps_canyon = await fps(3000);
await look(lake, 'lake', 35);
await look(rock, 'rock', 40);
R.ter = TER74; R.relief_can = +relief74(...mul(can, RM)).toFixed(1); R.relief_lake = +relief74(...mul(lake, RM)).toFixed(1); R.relief_rock = +relief74(...mul(rock, RM)).toFixed(1);
// игрок не проваливается: высота над грунтом
R.alt = +(len(me.pos) - groundR(norm(me.pos))).toFixed(2);
ok('no_console_errors', errs.length === 0, errs.slice(0, 4));
return R;
