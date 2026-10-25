// v62gren smoke: меню (Новое в v6.2, Управление), бой с гранатами в реальном времени, отмена при переходе в стратегию,
// танк: G = форсаж, сохранение/загрузка (новое поле kit.gren и старое сохранение без него), ошибки консоли
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done') && (MENU.cur || !S.attract)) break; } catch (e) {} await sleep(500); }
const out = {};
const errs = []; const oe = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 200)); oe.apply(console, a); };
addEventListener('error', e => errs.push('onerror ' + e.message));
// меню
MENU.show('main');
const sc = document.getElementById('screen');
out.news62 = sc.innerHTML.includes('v6.2') && sc.innerHTML.includes(tr(G62.NEWS[0][0], G62.NEWS[0][1], G62.NEWS[0][2]).slice(0, 20));
MENU.show('controls');
out.controlsNote = !!sc.querySelector('.g62note');
out.bindName = sc.innerHTML.includes(N2(BIND_NAMES.grenade).slice(0, 15));
MENU.close();
// бой
MENU.newGame(); await sleep(2500); if (MENU.isOpen()) MENU.close(); S.paused = false;
PROG.unl.add('grenade'); S.me.hp = S.me.maxhp = 99999;
out.kitInit = { gren: G62.kit().gren };
// 5 бросков в реальном времени с удержанием 0.1–0.6 с
for (let i = 0; i < 5; i++){
  S.kit.gren = 2; CAMFX.fly = null;
  keys[SET.bind.grenade] = true; dispatchEvent(new KeyboardEvent('keydown', { code: SET.bind.grenade }));
  await sleep(100 + i * 120);
  keys[SET.bind.grenade] = false; dispatchEvent(new KeyboardEvent('keyup', { code: SET.bind.grenade }));
  await sleep(300);
}
out.thrownRealtime = G62.boomLog.length + S.proj.filter(p => p.g62 && p.me).length;
await sleep(2500);
out.boomsRealtime = G62.boomLog.length;
// удержание → Tab в стратегию → отмена без траты гранаты
S.kit.gren = 2; keys[SET.bind.grenade] = true; G62.press(); await sleep(200);
enterRTS(); await sleep(200);
out.cancelRTS = { hold: !!G62.hold, gren: S.kit.gren };
keys[SET.bind.grenade] = false;
enterFPS(); await sleep(1500); CAMFX.fly = null;
// танк: G — форсаж
const me = S.me; const Up = norm(me.pos);
const tank = makeTank(surfacePoint(norm(add(me.pos, mul(tangent(me.fwd, Up), 10))), 1.5), 0);
takeControl(tank); await sleep(300); CAMFX.fly = null;
dispatchEvent(new KeyboardEvent('keydown', { code: SET.bind.grenade })); await sleep(100); dispatchEvent(new KeyboardEvent('keyup', { code: SET.bind.grenade }));
out.tankOverdrive = { overT: +(tank.overT || 0).toFixed(1), hold: !!G62.hold };
takeControl(me); await sleep(300);
// сохранение и загрузка
S.kit.gren = 1; S.kit.grenCd = 4;
let saveOk = null;
try { SAVE.save('m3'); saveOk = !!localStorage.getItem(SAVE.keyOf('m3')); } catch (e) { saveOk = 'ERR ' + e.message; }
out.save = saveOk;
S.kit.gren = 2; S.kit.grenCd = 0;
try { SAVE.load('m3'); await sleep(800); if (MENU.isOpen()) MENU.close(); out.loadKit = { gren: S.kit.gren, grenCd: +(S.kit.grenCd || 0).toFixed(1) }; } catch (e) { out.loadKit = 'ERR ' + e.message; }
SAVE.del('m3');
// старое сохранение без gren
delete S.kit.gren; S.kit.grenCd = 3;
out.oldKit = G62.kit().gren;
out.errors = errs;
console.error = oe;
return out;
