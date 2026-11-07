// T24 UI: игрок за Рой (RTS). Тяжёлый танк «Паук» + босс «Жнец» выделены → кнопка «⇣ В туннель» в карточке,
// отправка кнопкой, проход туннеля, выход с отталкиванием. Снимок карточки. Аргумент через window.__t24shot (путь).
const out = { err: [] };
const OUT = window.__t24shot || 'D:/AI/pm_v6/dist/t24_shots/ui.jpg';
const raf0 = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;
await sleep(300);
try { if (MENU.cur != null) MENU.close(); } catch (e) {}
newMatch({ fac76: [1, 0] });
S.endless = true; S.teams[1].ai = false; S.teams[0].ore += 3000;
const bdir = (FAC82.sites.tun82 && FAC82.sites.tun82(0)) || BASES[0];
const bur = makeBuilding('tun82', 0, bdir, null); bur.built = 1; bur.done = true; bur.hp = bur.maxhp;
const foe = S.hq[1].alive ? S.hq[1].pos : mul(BASES[1], RM);
const ex = TUN82.planExit(bur, { pos: foe }) || offsetOnSphere(TUN82.mouthDir(bur), tangent(sub(foe, bur.pos), bur.up), 150);
TUN82.startDig(bur, ex); bur.queue = ['tdig82']; bur.prodT = 99; finishProduct(bur, 'tdig82');
const m = TUN82.mouth(bur), md = TUN82.mouthDir(bur);
const tk = makeTank(surfacePoint(offsetOnSphere(md, bur.fwd, 22), 1.5), 0); tk.order = 'idle';
const inc = makeBuilding('asm83s', 0, offsetOnSphere(bdir, bur.fwd, 40), null); inc.built = 1; inc.done = true; inc.hp = inc.maxhp;
const boss = BOSS83.spawn(inc, 's');
out.setup = { open: TUN82.isOpen(bur), ok84_tank: TUN84.ok(tk), ok84_boss: TUN84.ok(boss), heavyTank: T24.heavy(tk), heavyBoss: T24.heavy(boss), t24: T24.on };
const inf0 = S.units.find(u => u.alive && u.team === 0); if (inf0) S.me = inf0;   // вселён не в тестовую технику (TUN84 не ведёт «свою» машину)
update(0.05);
enterRTS();
S.sel.clear(); S.sel.add(tk); S.sel.add(boss);
S.rts.dir = norm(add(mul(norm(tk.pos), 1), mul(norm(m), 1))); S.rts.h = 40;
updateCard();
const bt = document.querySelector('#card [data-t82]');
out.button = bt ? { text: bt.textContent, title: bt.title } : null;
window.requestAnimationFrame = raf0; requestAnimationFrame(frame);
await sleep(1500); if (S.me === tk || S.me === boss) S.me = inf0; if (S.mode !== 'rts') enterRTS(); S.sel.clear(); S.sel.add(tk); S.sel.add(boss); S.rts.dir = norm(add(norm(tk.pos), norm(m))); S.rts.h = 40; updateCard(); await sleep(600); out.mode = S.mode; out.btn2 = !!document.querySelector('#card [data-t82]') || !!document.querySelector('[data-ux="prod:tgo82"]');
await shot(OUT);
window.requestAnimationFrame = () => 0; await sleep(100);
// отправка той же кнопкой (как игрок)
out.selBefore = [...S.sel].map(g => g.boss83 ? 'boss' : g === tk ? 'tank' : (g.cls || '?')); out.alive = { tk: tk.alive, boss: boss.alive, tkT84: !!tk.t84, tkTun: !!tk.tun82 }; if (!S.sel.has(tk) || !S.sel.has(boss)){ S.sel.clear(); S.sel.add(tk); S.sel.add(boss); out.reselected = true; }
TUN82.ui('tgo82', null);
out.sent = { tank: !!tk.t84, boss: !!boss.t84, t24tank: !!tk.t24, t24boss: !!boss.t24 };
let dove = {}, back = {}, bossT = null;
for (let t = 0; t < 120; t += 0.1){
  update(0.1);
  for (const [k, v] of [['tank', tk], ['boss', boss]]){
    if (v.tun82 && dove[k] == null){ dove[k] = +t.toFixed(1); if (k === 'boss') bossT = +(v.tun82.until - S.time).toFixed(1); out['depth_' + k] = +(groundR(norm(v.pos)) - len(v.pos)).toFixed(1); }
    if (dove[k] != null && back[k] == null && !v.tun82 && !v.t84){ back[k] = +t.toFixed(1); const x = TUN82.exitOf(bur); out['exitGap_' + k] = x ? +(dist(v.pos, x.pos) - (v.rad || 1.2) - x.rad).toFixed(1) : null; }
  }
  if (back.tank != null && back.boss != null) break;
}
out.dove = dove; out.back = back; out.bossUnder = bossT; out.stats = Object.assign({}, T24.stats);
out.ok = !!(out.button && out.sent.tank && out.sent.boss && back.tank != null && back.boss != null);
window.requestAnimationFrame = raf0; requestAnimationFrame(frame);
// снимок у выхода
const x = TUN82.exitOf(bur);
if (x){ S.rts.dir = norm(x.pos); S.sel.clear(); S.sel.add(boss); updateCard(); await sleep(1200); await shot(OUT.replace('.jpg', '_exit.jpg')); }
return out;
