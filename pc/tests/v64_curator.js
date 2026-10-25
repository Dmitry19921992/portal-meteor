// v6.4: Куратор — шаги появляются, указывают кнопку/место, засчитываются по действиям игрока; выключение запоминается
const out = { errors: [], checks: {}, steps: [] };
const ok = (k, v) => { out.checks[k] = v ? 'OK' : 'FAIL'; if (!v) out.errors.push(k); };
const waitFor = async (f, ms) => { for (let t = 0; t < ms; t += 100){ if (f()) return true; await sleep(100); } return false; };
try {
  localStorage.removeItem('pm_curator'); CUR.once = {}; SET.curator = true;
  MENU.newGame(); if (TUT.on) TUT.finish();
  await sleep(300); enterRTS(); S.teams[0].ai = false; S.teams[1].ai = false; S.teams[0].ore = 400;
  await waitFor(() => CUR.cur, 3000);
  out.first = CUR.cur && CUR.cur.s.id;
  ok('intro_shown', out.first === 'intro' && $('cur').style.display === 'block' && !!CUR.uiHit);
  await shot('D:/AI/pm_v6/shots/v64_pc_curator_intro.jpg');
  CUR.cur.t0 -= 8;   // промотать вступление
  const vein0 = () => (curCtx().vein || {}).dir;
  for (let i = 0; i < 9; i++){
    if (!await waitFor(() => CUR.cur, 4000)) break;
    const c = CUR.cur, id = c.s.id, n = CUR.doneN;
    const rec = { id, text: c.text.slice(0, 60), ui: CUR.uiHit ? (CUR.uiHit.dataset.cur || CUR.uiHit.dataset.ux || CUR.uiHit.dataset.tab || CUR.uiHit.id || CUR.uiHit.className) : null, world: CUR.worldHit ? CUR.worldHit.label : null };
    if (i === 2) await shot('D:/AI/pm_v6/shots/v64_pc_curator_step.jpg');
    // действие игрока
    if (id === 'intro'){ c.t0 -= 8; }
    else if (id === 'cam') rtsLookAt(S.cps[0].pos);
    else if (id.endsWith('_put')){ if (!S.place){ await sleep(500); continue; } const d = id.startsWith('ext') ? vein0() : findSite(0, S.place); if (d){ rtsLookAt(surfacePoint(d, 0)); await sleep(700); } const s = d && project(surfacePoint(d, 0)); if (s) tryPlace(s[0], s[1], false); else if (d) playerPlace(S.place, d, false); }
    else if (id === 'cap_go'){ const cp = curCtx().cp; rtsLookAt(cp.pos); await sleep(700); const s = project(cp.pos); if (s) orderAt(s[0], s[1], false); }
    else if (id === 'threat' || id === 'idle'){ orderHold(); CUR.ev('order'); }
    else if (CUR.uiHit) CUR.uiHit.click();
    rec.done = await waitFor(() => CUR.doneN > n, 4000);
    out.steps.push(rec);
    if (S.place && !id.endsWith('_btn')) S.place = null;
  }
  ok('steps_progress', out.steps.filter(s => s.done).length >= 4);
  ok('ext_flow', ['ext_sel', 'ext_btn', 'ext_put'].every(k => out.steps.some(s => s.id === k && s.done)));
  ok('extractor_built_by_player', S.buildings.some(b => b.alive && b.team === 0 && b.type === 'extractor'));
  // выключение — кнопка ✕ в окне; запоминается в pm_settings
  await waitFor(() => CUR.cur, 4000);
  const off = document.querySelector('#cur [data-c="off"]'); if (off) off.click(); else CUR.toggle(false);
  await sleep(300);
  const saved = JSON.parse(localStorage.getItem('pm_settings') || '{}');
  ok('off_persisted', saved.curator === false && !CUR.enabled() && $('cur').style.display === 'none');
  MENU.load();   // перечитать настройки как при новом запуске
  ok('off_after_reload', SET.curator === false);
  ok('settings_row', MENU.html_settings().includes('data-tog="curator"'));
  ok('panel_button', !!document.querySelector('#curBtn'));
  document.querySelector('#curBtn').click(); await sleep(200);
  ok('on_again', CUR.enabled() && JSON.parse(localStorage.getItem('pm_settings')).curator === true);
  // старые подсказки стратегии не показываются при включённом кураторе
  HINTS.cur = null; HINTS.lastT = -99; HINTS.rtsT = 100; HINTS.rtsStep();
  ok('old_rts_hints_suppressed', !HINTS.cur);
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
return out;
