// v6.9: способности дронов и ремкомплект техники — ПК (клавиши) и стратегия (кнопки), ИИ. node cdp69.js v69_drones.js --vp 1280x720 --reload
const R = {}, ok = (k, v, info) => { R[k] = v ? 'OK' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
const key = async (code, ms) => { dispatchEvent(new KeyboardEvent('keydown', { code, key: code })); await sleep(ms || 60); dispatchEvent(new KeyboardEvent('keyup', { code, key: code })); };
try {
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(1500);
  DEV.enter(); await sleep(300);
  DEV.dummy(); await sleep(200);
  const dm = DEV.dummies[0];
  // ---- дрон в бою
  DEV.veh('drone'); await sleep(1800);
  const d = ctrlEntity(); ok('possess_drone', d && d.cls === 'drone');
  // повернуться к манекенам
  if (dm){ d.aim = norm(sub(dm.pos, d.pos)); d.fwd = tangent(d.aim, d.up); }
  const kit = $('kit').textContent; ok('hud_slots', /Скан/.test(kit) && /Ракетный/.test(kit) && /Ремонт/.test(kit), kit);
  const help = helpFPS(d); ok('help_rows', /скан местности/.test(help) && /ракетный залп/.test(help), help.slice(0, 200));
  const ns = S.scans.length; await key(SET.bind.w1); await sleep(300);
  ok('fps_scan', S.scans.length === ns + 1 && S.scans[S.scans.length - 1].drone === d && V69.pulses.length > 0);
  ok('fps_weapon_unchanged', S.kit.w !== undefined);
  await shot('D:/AI/pm_v6/shots/v69_d_scan_fps.jpg');
  const np = S.proj.filter(p => p.type === 'r').length;
  await key(SET.bind.rocket); await sleep(1000);
  ok('fps_rockets', S.proj.filter(p => p.type === 'r' && p.from === d).length > 0 || (abilLeft(d, 'drocket') > 0), { np, now: S.proj.filter(p => p.type === 'r').length });
  await shot('D:/AI/pm_v6/shots/v69_d_rockets_fps.jpg');
  // ремонт: рядом повреждённый танк
  const tk = makeTank(surfacePoint(norm(add(d.pos, mul(anyTangent(norm(d.pos)), 6))), 1.5), 0); tk.hp = tk.maxhp * 0.4;
  const hp0 = tk.hp; tk.pos = add(mul(norm(d.pos), len(tk.pos)), [0, 0, 0]); d.pos = add(tk.pos, mul(norm(tk.pos), 7)); d.vel = [0, 0, 0];
  await key(SET.bind.grenade); await sleep(1500);
  ok('fps_repair', d.v69rep > S.time && tk.hp > hp0 + 20, { hp0, hp: tk.hp, rep: d.v69rep, t: S.time, dd: dist(tk.pos, d.pos) });
  await shot('D:/AI/pm_v6/shots/v69_d_repair_fps.jpg');
  // ---- стратегия: кнопки дрона и куратор
  enterRTS(); await sleep(800);
  S.sel.clear(); S.selB = null; S.sel.add(d); await sleep(900);
  const card = ['KeyR', 'KeyF', 'KeyG', 'KeyT'].map(k => !!document.querySelector(`#card [data-ux="abil:${k}"]`));
  ok('rts_card_buttons', card.every(Boolean), card);
  d.abil = {};
  abilityKey('KeyF'); await sleep(100);
  ok('rts_scan_key', abilLeft(d, 'dscan') > 0);
  await sleep(1000);
  { const cs = CUR_STEPS.find(s => s.id === 'v69_drone'), cx = curCtx(); ok('curator_tip', cs && cs.when(cx) && /F —/.test(cs.text(cx)), CUR.cur && CUR.cur.s.id); }
  await shot('D:/AI/pm_v6/shots/v69_d_rts_card.jpg');
  // ---- техника: ремкомплект (T в стратегии, 1 в бою)
  S.sel.clear(); S.sel.add(tk); tk.hp = tk.maxhp * 0.3; await sleep(500);
  ok('rts_repkit_btn', !!document.querySelector('#card [data-ux="abil:KeyT"]'));
  abilityKey('KeyT'); await sleep(200);
  ok('rts_repkit', tk.v69kit > S.time);
  enterFPS(tk); await sleep(1500); tk.abil = {}; tk.v69kit = 0;
  await key(SET.bind.w1); await sleep(200);
  ok('fps_repkit', tk.v69kit > S.time && /Ремкомплект/.test($('kit').textContent), $('kit').textContent);
  // рейдер (новая техника)
  const rd = V2.make(surfacePoint(norm(add(tk.pos, mul(anyTangent(norm(tk.pos)), 15))), 1.5), 0, 'raider');
  ok('raider_repkit', abilList(rd).includes('rk_raider') && !useAbility(rd, 'rk_raider') && rd.v69kit > S.time);
  // ---- ИИ: вражеский дрон рядом с повреждённым вражеским танком — чинит; рядом скрытые враги — сканирует
  const ed = makeDrone(add(tk.pos, mul(norm(tk.pos), 8)), 1);
  const et = makeTank(surfacePoint(norm(add(ed.pos, mul(anyTangent(norm(ed.pos)), 5))), 1.5), 1); et.hp = et.maxhp * 0.5; et.pos = add(mul(norm(ed.pos), len(et.pos)), [0, 0, 0]);
  V69.ai(ed); ok('ai_repair', ed.v69rep > S.time);
  const ed2 = makeDrone(add(tk.pos, mul(norm(tk.pos), 20)), 1); ed2.abil = { drepair: 1e9 };
  for (const u of S.units.concat(S.vehicles)) if (u.team === 0 && u.seen) u.seen[1] = 0;
  V69.ai(ed2); ok('ai_scan', abilLeft(ed2, 'dscan') > 0, { near: S.units.filter(u => u.team === 0 && dist(u.pos, ed2.pos) < 70).length });
  const ed3 = makeDrone(add(tk.pos, mul(norm(tk.pos), 20)), 1); ed3.abil = { drepair: 1e9, dscan: 1e9 }; ed3.target = tk;
  V69.ai(ed3); ok('ai_rockets', !!ed3.v69salvo);
  et.hp = et.maxhp * 0.3; et.lastHurt = S.time - 5; V69.ai(et); ok('ai_repkit', et.v69kit > S.time);
  // ---- режим разработчика: «Пополнить» снимает перезарядку
  enterFPS(d); await sleep(1200); d.abil = { dscan: S.time + 50 }; DEV.refill(); ok('dev_refill', abilLeft(d, 'dscan') <= 0);
  R.fps = fpsVal; R.wpn = WPN69.ok();
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); }
return R;
