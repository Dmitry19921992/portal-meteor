// v6.6: голоса юнитов, куратор виден и слышен, живой портрет
const out = { errors: [], checks: {}, info: {} };
const ok = (k, v, info) => { out.checks[k] = v ? 'OK' : 'FAIL'; if (!v) out.errors.push(k + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
const step = n => { for (let i = 0; i < n; i++) update(0.05); };
const PH = location.search.includes('phone') || TOUCH.on;
try {
  ok('curator_default_on', CUR.enabled());
  ok('migration_flag', localStorage.getItem('pm_v66cur') === '1');
  // все клипы декодируются
  AU.init(); await sleep(200);
  const D = VOICE66.load(); let n = 0, bad = 0; const P = [];
  for (const t in D) for (const k of ['sel', 'ord']) (D[t][k] || []).forEach((c, i) => { n++; P.push(VOICE66.decode(t, k, i).catch(() => bad++)); });
  await Promise.all(P);
  out.info.clips = n; ok('voice_decode_all', n >= 56 && bad === 0, { n, bad });
  ok('voice_types', ['builder', 'squad', 'heavy', 'scout', 'sniper', 'drone', 'tank'].every(t => VOICE66.has(t, 'sel') && VOICE66.has(t, 'ord') && D[t].sel.length >= 3 && D[t].ord.length >= 3));
  // куратор при входе в стратегию
  localStorage.removeItem('pm_curator'); CUR.once = {};
  MENU.newGame(); await sleep(400); if (TUT.on) TUT.finish();
  step(20);
  const pv = VOICE66.played;
  enterRTS(); await sleep(1500);
  out.info.cur1 = CUR.cur && CUR.cur.s.id;
  ok('curator_shows_on_enter', !!CUR.cur && $('cur').style.display === 'block', out.info.cur1);
  ok('curator_voice', VOICE66.played > pv && VOICE66.lastType === 'curator', { p: VOICE66.played, t: VOICE66.lastType });
  await shot('D:/AI/pm_v6/shots/v66_' + (PH ? 'ph_' : '') + 'curator_enter.jpg');
  // промотать вступление, следующий — цепочка
  if (CUR.cur){ CUR.cur.t0 -= 9; } await sleep(2500);
  if (CUR.cur && CUR.cur.s.id === 'chain'){ await shot('D:/AI/pm_v6/shots/v66_' + (PH ? 'ph_' : '') + 'curator_chain.jpg'); CUR.cur.t0 -= 9; }
  await sleep(2500);
  out.info.cur2 = CUR.cur && CUR.cur.s.id;
  // выйти и зайти снова — «Куратор на связи»
  enterFPS(); step(10); await sleep(300); enterRTS(); await sleep(1300);
  out.info.cur3 = CUR.cur && CUR.cur.s.id; out.info.cur3t = CUR.cur && CUR.cur.text;
  ok('curator_hello_reenter', !!CUR.cur && (CUR.cur.s.id === 'rts_hello' || CUR.cur.s.pri >= 900), out.info.cur3);
  ok('curator_frame_or_mark', !!CUR.uiHit || !!CUR.worldHit || CUR.cur.s.id === 'rts_hello');
  await shot('D:/AI/pm_v6/shots/v66_' + (PH ? 'ph_' : '') + 'curator_hello.jpg');
  // голос на выделение по типам
  const types = [];
  const sel = async g => { S.sel.clear(); await sleep(350); S.sel.add(g); rtsLookAt(leaderPos(g)); await sleep(700); types.push(VOICE66.lastType); };
  const b = teamBuilders(0)[0]; await sel(b);
  const sq = S.squads.find(s => s.team === 0 && !s.solo); await sel(sq);
  const tk = S.vehicles.find(v => v.team === 0 && v.alive); if (tk) await sel(tk);
  out.info.types = types;
  ok('voice_on_select', types[0] === 'builder' && types[1] === 'squad' && (!tk || types[2] === 'tank'), types);
  const p1 = VOICE66.played; await sleep(700);
  S.sel.clear(); S.sel.add(sq); VOICE66.lastSelSig = selGroups().map(uixId).join(',');
  const L = leaderPos(sq), s2 = project(add(L, mul(tangent(anyTangent(norm(L)), norm(L)), 12)));
  const g0 = sq.goal; if (s2) orderAt(s2[0], s2[1], false); if (sq.goal === g0) setOrder(sq, 'move', add(L, mul(anyTangent(norm(L)), 8)), { by: 'player' });
  await sleep(500);
  ok('voice_on_order', VOICE66.played > p1, { p1, p: VOICE66.played, t: VOICE66.lastText });
  // портрет
  await sleep(1500);
  ok('portrait_on', CAM66.ok && CAM66.shown && CAM66.drawn > 10, { ok: CAM66.ok, sh: CAM66.shown, d: CAM66.drawn });
  out.info.cam = { ms: +CAM66.ms.toFixed(3), W: CAM66.W, H: CAM66.H, rect: CAM66.rect && [CAM66.rect.left, CAM66.rect.top, CAM66.rect.width, CAM66.rect.height].map(Math.round) };
  const r = CAM66.rect, ir = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const overl = [...document.querySelectorAll('#card .ab, #card .poss, #side, #hud .hb, .mm, #r61cards')].filter(e => e.offsetParent !== null).filter(e => ir(r, e.getBoundingClientRect())).map(e => e.id || e.className);
  ok('portrait_no_overlap', !overl.length, overl);
  await shot('D:/AI/pm_v6/shots/v66_' + (PH ? 'ph_' : '') + 'portrait.jpg');
  S.sel.clear(); await sleep(400);
  ok('portrait_hides', !CAM66.shown);
  out.info.fps = fpsVal;
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); }
return out;
