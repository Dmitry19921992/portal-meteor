// combat_core tests — одинаковый файл в D:\AI\combat_core, D:\AI\pm_vr\tests и ветке основной игры (tests819\).
// Запуск: node <путь>\combat_core.test.mjs [путь к combat_core.js]. Без аргумента ищет combat_core.js рядом, затем ..\src\, затем ..\
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const cand = [process.argv[2], path.join(here, 'combat_core.js'), path.join(here, '..', 'src', 'combat_core.js'), path.join(here, '..', 'combat_core.js')].filter(Boolean);
const file = cand.find(f => fs.existsSync(f)); if (!file) { console.error('combat_core.js not found'); process.exit(2); }
const src = fs.readFileSync(file, 'utf8');
// чистота: пустой контекст — нет window/document/THREE/module; модуль должен сам положить CombatCore в globalThis
const ctx = vm.createContext({}); vm.runInContext(src, ctx, { filename: file });
const CC = ctx.CombatCore;
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL', name); } };
ok(CC && CC.VERSION, 'loads in an empty vm context (no DOM, no three.js)');
ok(!/\b(document|window|THREE|navigator|requestAnimationFrame)\s*[.(]/.test(src.replace(/\/\/.*$/gm, '')), 'no DOM/three references in code');
ok(!src.includes('Math.random'), 'deterministic (no Math.random)');

const vr = CC.create('vr_arena'), mg = CC.create('main');
// --- профили: различия только флагами
ok(vr.friendlyMult(0, 0) === 1 && mg.friendlyMult(0, 0) === 0 && vr.friendlyMult(0, 1) === 1 && mg.friendlyMult(0, 1) === 1, 'friendlyFire: vr_arena ON, main OFF');
ok(vr.cfg.lineOfFireCheck && mg.cfg.lineOfFireCheck, 'lineOfFireCheck ON in both');
ok(JSON.stringify(vr.cfg.weapons) === JSON.stringify(mg.cfg.weapons) && JSON.stringify(vr.cfg.cost) === JSON.stringify(mg.cfg.cost), 'same numbers in both profiles');
let threw = false; try { CC.create('nope'); } catch (e) { threw = true; } ok(threw, 'unknown profile throws');

// --- attackTokens: 2–3 одновременно, сзади ждут, пока спереди заняты
for (const c of [vr, mg]) {
  ok(c.tokens.max(1) === 2 && c.tokens.max(4) === 3 && c.tokens.max(30) === 3, 'tokens 2..3 (' + c.profile + ')');
  c.tokens.reset();
  ok(c.tokens.request('a', 'P', 0, { front: true, wave: 1 }), 'front A gets token');
  ok(!c.tokens.request('b', 'P', 0, { front: false, wave: 1 }), 'back B waits while front busy');
  ok(c.tokens.request('c', 'P', 0, { front: true, wave: 1 }), 'front C gets 2nd token');
  ok(!c.tokens.request('d', 'P', 0, { front: true, wave: 1 }), '3rd blocked on wave 1');
  c.tokens.release('a'); c.tokens.release('c');
  ok(c.tokens.request('b', 'P', 0.1, { front: false, wave: 1 }), 'back B attacks when front is free');
  c.tokens.reset(); c.tokens.request('x', 'P', 0, {}); ok(c.tokens.request('y', 'P', 5, {}), 'stale token expires');
}
ok(vr.isFront([0, 0, 0], [0, 0, -1], [0, 0, -2]) && !vr.isFront([0, 0, 0], [0, 0, -1], [0, 0, 2]), 'isFront');

// --- линия огня: свой на линии — не стрелять
ok(!mg.lineOfFire([0, 1, 0], [10, 1, 0], [{ pos: [5, 1, 0.2] }]).clear, 'ally on the line blocks the shot');
ok(mg.lineOfFire([0, 1, 0], [10, 1, 0], [{ pos: [5, 1, 3] }]).clear, 'ally off the line does not block');
ok(vr.lineOfFire({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: -8 }, [{ pos: { x: 0, y: 1.1, z: -4 } }]).clear === false, '{x,y,z} vectors work');

// --- удар: одинаковый взмах → разный результат у трёх оружий (приёмка 1.1)
const same = { speed: 3.3, edgeCos: 0.9, stab: 0, part: 'armR' };
const rk = vr.swing({ ...same, weapon: 'katana' }), rd = vr.swing({ ...same, weapon: 'dagger' }), rc = vr.swing({ ...same, weapon: 'cleaver' });
const sig = r => r.kind + ':' + r.dmg.toFixed(2);
ok(new Set([sig(rk), sig(rd), sig(rc)]).size === 3, 'same swing, 3 weapons → 3 different results (' + [sig(rk), sig(rd), sig(rc)].join(' | ') + ')');
ok(vr.swing({ speed: 0.3, weapon: 'katana' }).kind === 'none', 'too slow → none');
ok(vr.swing({ speed: 1.5, weapon: 'katana', part: 'torso' }).kind === 'scratch', 'slow touch → scratch');
ok(vr.swing({ speed: 6, weapon: 'katana', part: 'armL' }).kind === 'cut', 'fast swing → cut');
ok(vr.swing({ speed: 6, edgeCos: 0, weapon: 'katana', part: 'armL' }).kind !== 'cut' || vr.swing({ speed: 4, edgeCos: 0, weapon: 'katana', part: 'armL' }).kind !== 'cut', 'flat hit cuts worse');
ok(vr.swing({ speed: 2, weapon: 'katana', targetWeapon: true, targetState: 'strike' }).kind === 'parry', 'parry = any weapon contact during strike');
ok(vr.swing({ speed: 2, weapon: 'katana', targetWeapon: true, targetState: 'idle' }).kind !== 'parry', 'no parry when enemy is not attacking');
ok(vr.swing({ speed: 8, weapon: 'staff', part: 'armL' }).kind !== 'cut', 'blunt weapon never cuts');
ok(vr.swing({ speed: 4, weapon: 'flail', armor: true }).kind === 'chip', 'blunt breaks armour');
ok(vr.cfg.switchTime < 0.3, 'weapon switch < 0.3 s');
for (const w of ['staff', 'nunchaku', 'flail', 'curved', 'wrist']) ok(vr.cfg.weapons[w], 'test-range weapon ' + w);
ok(vr.cfg.weapons.nunchaku.chain && vr.cfg.weapons.flail.chain, 'chain weapons have chain params');

// --- манекен: ≥ 6 частей, без правой руки бьёт левой
const b = vr.body();
ok(Object.keys(b.parts).length >= 6, 'dummy has ≥ 6 parts');
ok(vr.attackArm(b) === 'armR', 'attacks with right arm');
const cutArm = vr.applyHit(b, vr.swing({ speed: 7, weapon: 'katana', part: 'armR' }));
ok(cutArm.severed === 'armR' && b.alive && vr.attackArm(b) === 'armL', 'lost right arm → attacks with left');
vr.applyHit(b, vr.swing({ speed: 7, weapon: 'katana', part: 'armL' })); ok(vr.attackArm(b) === 'none' && b.alive, 'no arms → cannot attack, still alive');
vr.applyHit(b, vr.swing({ speed: 7, weapon: 'katana', part: 'legL' })); ok(vr.mobility(b) < 1, 'lost leg → slower');
const b2 = vr.body(); vr.applyHit(b2, vr.swing({ speed: 2.5, weapon: 'katana', part: 'torso' })); ok(b2.alive, 'hard to kill: one gash does not kill');
const b3 = vr.body(); vr.applyHit(b3, vr.swing({ speed: 9, weapon: 'katana', part: 'head' })); ok(!b3.alive, 'head cut kills');

// --- заряды «вариант C»
const m = vr.meter; m.reset();
let r1 = []; for (let i = 0; i < 4; i++) r1 = r1.concat(m.gain('dodge', i));
ok(m.charges.slow >= 1 && r1.includes('slow'), 'dodges charge SLOW (+ready event)');
m.reset(); for (let i = 0; i < 3; i++) m.gain('parry', i); ok(m.ready('shield'), 'parries charge SHIELD');
m.reset(); for (let i = 0; i < 5; i++) m.gain('kill', i); ok(m.ready('uzi'), 'kills charge UZI');
m.reset(); for (let i = 0; i < 15; i++) m.gain('hit', i * 0.3); ok(m.ready('lightning'), 'clean combos charge LIGHTNING');
m.reset(); for (let i = 0; i < 15; i++) { m.gain('hit', i * 0.3); if (i % 2) m.hurt(); } ok(!m.ready('lightning'), 'combo broken by damage does not charge lightning');
m.reset(); m.gain('cut', 0); ok(m.charges.slow > 0 && m.charges.shield > 0 && m.charges.uzi > 0, 'any action trickles into every charge');
m.reset(100); ok(m.pay('uzi') && m.energy === 55 && !m.pay('walker'), 'energy pay/deny');
ok(m.spend('lightning') === false, 'cannot spend empty charge');

// --- кулдауны
vr.cooldowns.start('turret', 0, 3); ok(!vr.cooldowns.ready('turret', 2) && vr.cooldowns.ready('turret', 3.01), 'cooldowns');

// --- наведение «куда смотришь» (aimRay)
const enemies = [{ id: 'e1', team: 1, pos: [0, 1.6, -10] }, { id: 'e2', team: 1, pos: [6, 1.6, -10] }, { id: 'own', team: 0, pos: [0, 1.6, -5] }, { id: 'dead', team: 1, alive: false, pos: [0, 1.6, -3] }];
ok(vr.aimPick({ origin: [0, 1.6, 0], dir: [0, 0, -1] }, enemies, { team: 0 }).id === 'e1', 'aimPick picks gazed enemy, skips own team and dead');
ok(vr.aimPick({ origin: [0, 1.6, 0], dir: [0.51, 0, -0.86] }, enemies, { team: 0 }).id === 'e2', 'aimPick follows gaze');
ok(vr.aimPick({ origin: [0, 1.6, 0], dir: [0, 0, 1] }, enemies, { team: 0 }) === null, 'nothing behind');

// --- адреналин: < 25 %, 3–4 с, не чаще раза в 60 с и раза за волну
const ad = vr.adrenaline; ad.reset();
ok(!ad.update(0.5, 0, 1).active, 'no adrenaline at 50 %');
const s1 = ad.update(0.2, 1, 1); ok(s1.started && s1.timeScale < 1, 'adrenaline starts at 20 %');
ok(ad.update(0.2, 4, 1).active && !ad.update(0.2, 5.1, 1).active, 'lasts 3–4 s');
ok(!ad.update(0.2, 30, 2).started, 'not again within 60 s');
ok(ad.update(0.2, 70, 3).started, 'again after 60 s on a new wave');
ok(!ad.update(0.2, 200, 3).started, 'once per wave');

// --- кривая сложности: 1–3 волны легко, 10-я трудно
const w1 = vr.wave(1), w3 = vr.wave(3), w10 = vr.wave(10);
ok(w1.elite === 0 && w1.dodge === 0 && w3.attackers === 2, 'waves 1–3 newbie-friendly');
ok(w10.count > w3.count * 1.8 && w10.dodge > 0.25 && w10.block > 0.3 && w10.elite > 0 && w10.attackers === 3, 'wave 10 is hard');

// --- обломки и ракетница
ok(vr.debrisCap('off') === 0 && vr.debrisCap('auto', true) === 8 && vr.debrisCap('high') === 28, 'debris caps Auto/Off/Low/High');
const rs = { team: 0 }; let rr = vr.rocketTargets(enemies, [0, 1, 0], 0, rs); ok(!rr.fire, 'rockets wait for the first period');
rr = vr.rocketTargets(enemies, [0, 1, 0], 12.1, rs); ok(rr.fire && rr.targets.length <= 3 && rr.targets.every(e => e.team !== 0 && e.alive !== false), 'rockets: ≤3 targets, never own team');

// --- одна версия во всех копиях
const canon = 'D:\\AI\\combat_core\\combat_core.js';
if (fs.existsSync(canon) && path.resolve(canon) !== path.resolve(file)) {
  const h = f => crypto.createHash('sha1').update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  ok(h(canon) === h(file), 'copy is identical to canon D:\\AI\\combat_core (run sync.ps1)');
}
console.log(`combat_core ${CC.VERSION} (${path.basename(path.dirname(file))}): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
