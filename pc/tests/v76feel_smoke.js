// v7.6 feel: smoke — menu, play now intro, hit feedback, hint, end screen + card, continue
const R = { steps: [] };
const errs = []; { const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); }; addEventListener('error', e => errs.push('ERR ' + e.message)); }
const warns = []; { const cw = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ').slice(0, 300)); cw.apply(console, a); }; }
const ph = (TOUCH.on ? (innerHeight > innerWidth ? 'phP' : 'ph') : 'pc') + (window.__den0 ? 'N' : '');
const O = 'D:/AI/pm_v6/shots_v76feel/' + ph + '_';
const step = s => R.steps.push(s + ' @' + Math.round(performance.now() / 1000));
try {
  for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') break; } catch (e){} await sleep(300); }
  SET.lang = 'ru'; applySettings(); MENU.applyLang();
  if (window.__den0 && typeof DEN75 !== 'undefined'){ DEN75.set(0); await sleep(500); }
  R.den = typeof DEN75 !== 'undefined' ? DEN75.active() : null; R.vp = innerWidth + 'x' + innerHeight;
  try { SAVE.del('auto'); } catch (e){}
  MENU.show('main'); await sleep(600);
  R.menuNow = !!document.getElementById('m_f76now'); R.menuCont0 = !!document.querySelector('#m_load');
  await shot(O + '1_menu.jpg'); step('menu');
  // играть сразу
  document.getElementById('m_f76now').click();
  await sleep(500); R.intro = !!FEEL76.intro; await shot(O + '2_intro_a.jpg');
  if (FEEL76.intro) FEEL76.intro.t0 = performance.now() - 0.55 * FEEL76.INTRO_D * 1000;   // кадр середины пролёта (FPS низкий — фиксируем фазу)
  await sleep(300); await shot(O + '2_intro_b.jpg');
  if (FEEL76.intro) FEEL76.intro.t0 = performance.now() - 0.85 * FEEL76.INTRO_D * 1000;
  await sleep(300); await shot(O + '2_intro_c.jpg');
  for (let i = 0; i < 40 && FEEL76.intro; i++) await sleep(150);
  R.introDone = !FEEL76.intro; R.mode = S.mode; R.me = !!ctrlEntity(); step('intro');
  if (MENU.cur) MENU.close();
  if (TUT.on && TUT.finish) TUT.finish();
  await sleep(1500);
  FEEL76.hintT = 0; await sleep(400);
  const he = document.getElementById('f76hint'); R.hint = he ? he.style.display + ' | ' + he.textContent.slice(0, 90) : 'none';
  await shot(O + '3_hint.jpg'); step('hint');
  // попадания: ставим врага перед камерой и стреляем «как игрок»
  const c = ctrlEntity();
  let e = S.units.find(u => u.alive && u.team === 1);
  if (c && e){
    e.pos = add(c.pos, mul(c.fwd, 9)); e.vel = [0, 0, 0];
    e.hp = e.maxhp;
    for (let i = 0; i < 3; i++){ const W = WEAPONS.rifle, eye = add(c.pos, mul(c.up, RULES.EYE)); gunShoot(c, eye, norm(sub(centerOf(e), eye)), W, { player: true, steps: 140 }); }
    R.partsAfterHit = FEEL76.P.length;
    await sleep(60); await shot(O + '4_hits.jpg');
    R.killed = FEEL76.demo.kill(); R.killT = FEEL76.killT; R.streak = FEEL76.st.streak;
    e = S.units.find(u => u.alive && u.team === 1 && u !== e); if (e){ e.pos = add(c.pos, mul(c.fwd, 12)); e.hp = 1; damage(e, 999, c, 'b'); }
    R.streak2 = FEEL76.st.streak; R.parts = FEEL76.P.length;
    await sleep(80); await shot(O + '5_kill.jpg'); step('kill');
  }
  FEEL76.demo.boom(3, 16);
  { let mx = 0, mk = 0; for (let i = 0; i < 30; i++){ mx = Math.max(mx, S.shake, FEEL76.held || 0); mk = Math.max(mk, FEEL76.kickP); if (!FEEL76.pend && mx > 0) break; await sleep(50); } R.shake = +mx.toFixed(2); R.kick = +mk.toFixed(4); }
  await shot(O + '6_boom.jpg');
  FEEL76.demo.slow(); await sleep(400); R.slow = +S.slow.toFixed(2); await shot(O + '7_slowmo.jpg'); await sleep(1200); R.slowAfter = +S.slow.toFixed(2); step('fx');
  // F7 — свернуть подсказку
  SET.hint76 = false; FEEL76.hintT = 0; await sleep(400); R.hintMini = document.getElementById('f76hint').className; await shot(O + '8_hint_mini.jpg'); SET.hint76 = true;
  // автосохранение (как при закрытии вкладки) → «Продолжить» в меню
  S.time = Math.max(S.time, 40); FEEL76.lastSaveT = -1e9; R.autosave = FEEL76.autosave('test');
  MENU.toMenu(); await sleep(800);
  R.menuCont = !!document.querySelector('#m_load'); await shot(O + '9_menu_continue.jpg'); step('continue');
  document.querySelector('#m_load').click(); await sleep(1500); R.loaded = !S.attract && !!ctrlEntity();
  if (MENU.cur) MENU.close();
  // победа
  FEEL76.demo.end(true);
  for (let i = 0; i < 80 && MENU.cur !== 'end'; i++) await sleep(200);
  R.end = MENU.cur; await sleep(1800);
  R.card = !!FEEL76.cardCv; R.cardImg = (document.getElementById('f76cardimg') || {}).naturalWidth || 0;
  R.contAfterEnd = SAVE.has();
  await shot(O + '10_end.jpg'); step('end');
  R.shareText = FEEL76.shareText();
  R.share = await Promise.race([FEEL76.share(), sleep(6000).then(() => 'timeout')]);
  R.shareMsg = (document.getElementById('f76msg') || {}).textContent;
  await shot(O + '11_end_shared.jpg');
  if (FEEL76.cardCv){
    const im = document.createElement('img'); im.src = FEEL76.cardCv.toDataURL('image/png');
    im.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:auto;z-index:99999;background:#000';
    document.body.appendChild(im); await sleep(400); await shot(O + '12_card.jpg'); im.remove();
  }
  MENU.show('main'); MENU.show('settings', true); await sleep(500);
  R.setRows = document.querySelectorAll('#screen [data-p74tog="shake76"],#screen [data-p74tog="slowmo76"],#screen [data-p74tog="hint76"]').length;
  if (TOUCH.on && typeof P71M !== 'undefined' && P71M.on()){ MENU.show('p71s_game', true); await sleep(400); R.setRows = document.querySelectorAll('#screen [data-p74tog="shake76"]').length; }
  else { const r = document.querySelector('#screen [data-p74tog="shake76"]'); if (r) r.scrollIntoView({ block: 'center' }); }
  await shot(O + '13_settings.jpg');
  MENU.show('main');
} catch (e){ R.err = e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
R.errs = errs.slice(0, 8); R.warns = warns.filter(w => /feel76|Uncaught|TypeError/.test(w)).slice(0, 8); R.feelErr = FEEL76.err;
return R;
