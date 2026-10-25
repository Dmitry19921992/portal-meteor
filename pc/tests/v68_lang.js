// v6.8: 4 языка (RU/EN/VI/HE) — переключение, флажки, RTL в иврите, нет наложений в меню/настройках/HUD,
// голосовые пакеты: язык реплики = язык интерфейса, число голосов, разные голоса у разных юнитов, без ошибок декодирования
const W = innerWidth, H = innerHeight, tag = W + 'x' + H + (TOUCH.on ? 'ph' : '');
const out = { vp: tag, errors: [], checks: {}, info: {} };
const ok = (k, v, info) => { out.checks[k] = v ? 'OK' : 'FAIL'; if (!v) out.errors.push(k + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 300) : '')); if (info !== undefined) out.info[k] = info; };
const vis = e => { if (!e.isConnected) return false; let p = e; while (p && p !== document.body){ const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden') return false; p = p.parentElement; } return true; };
function overlaps(sel, name){
  const L = [...document.querySelectorAll(sel)].filter(vis).map(e => ({ e, r: e.getBoundingClientRect() })).filter(x => x.r.width > 3 && x.r.height > 3);
  const over = [], offs = [];
  for (const a of L) if (a.r.left < -1 || a.r.right > W + 1) offs.push(a.e.tagName + ':' + (a.e.textContent || '').slice(0, 20) + ' ' + Math.round(a.r.left) + '..' + Math.round(a.r.right));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++){
    const a = L[i], b = L[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = min(a.r.right, b.r.right) - max(a.r.left, b.r.left), h = min(a.r.bottom, b.r.bottom) - max(a.r.top, b.r.top);
    if (w > 2 && h > 2) over.push((a.e.textContent || a.e.id).slice(0, 18) + ' × ' + (b.e.textContent || b.e.id).slice(0, 18) + ` (${Math.round(w)}×${Math.round(h)})`);
  }
  ok(name + '_noOverlap', !over.length, over.slice(0, 6)); ok(name + '_inScreen', !offs.length, offs.slice(0, 6));
}
const latinLeft = () => { const t = $('screen').innerText; const w = (t.match(/[A-Za-z]{4,}/g) || []).filter(x => !/Portal|Meteor|Piper|Kokoro|ryan|alan|amy|vais|Meta|MMS|TTS|heb|Apache|Esc|Shift|Ctrl|Space|Tab|Enter|English|Việt|itch|WASD|RMB|LMB/i.test(x)); return w; };
const MENU_SEL = '#screen button, #screen h1, #screen h3, #screen p, #screen li, #screen label, #screen select, #screen input';
const save0 = MENU.save; MENU.save = function(){};   // язык теста не сохраняем (Chrome могут закрыть до записи на диск)
try {
  const shotDir = 'D:/AI/pm_v6/shots/v68';
  for (const L of ['ru', 'en', 'vi', 'he']){
    SET.lang = L; MENU.applyLang(); MENU.show('main'); await sleep(400);
    ok(L + '_cur', LANG.cur === L && document.documentElement.lang === L);
    ok(L + '_title', document.title === 'Portal Meteor — v6.8', document.title);
    const lb = [...document.querySelectorAll('#screen .lbtn')];
    ok(L + '_4langs', lb.length === 4 && lb.every(b => b.querySelector('svg')), lb.map(b => b.textContent));
    ok(L + '_news68', /v6\.8/.test($('screen').innerText));
    ok(L + '_dir', ($('screen').getAttribute('dir') === 'rtl') === (L === 'he'));
    overlaps(MENU_SEL, L + '_main');
    await shot(`${shotDir}_${tag}_${L}_main.jpg`);
    if (L === 'he'){ const w = latinLeft(); out.info.he_main_latin = w.slice(0, 30); ok('he_main_mostlyHebrew', w.length < 30, w.length); }
    MENU.show('settings', true); await sleep(300);
    overlaps(MENU_SEL, L + '_settings');
    if (L === 'he' || L === 'ru') await shot(`${shotDir}_${tag}_${L}_settings.jpg`);
    if (L === 'he'){ const w = latinLeft(); out.info.he_set_latin = w.slice(0, 30); }
    MENU.back(); await sleep(150);
    // голос: пакет языка
    AU.init(); await sleep(100);
    const D = VOICE66.load();
    ok(L + '_pack', VOICE66.packLang() === L, VOICE66.packLang());
    const vc = VOICE66.voiceCount(); out.info[L + '_voices'] = vc;
    const nLines = Object.values(D).reduce((s, t) => s + t.sel.length + t.ord.length, 0);
    const nClips = Object.values(D).reduce((s, t) => s + [...t.sel, ...t.ord].reduce((q, it) => q + (Array.isArray(it.b) ? it.b.length : 1), 0), 0);
    out.info[L + '_lines'] = nLines; out.info[L + '_clips'] = nClips;
    ok(L + '_types', ['builder', 'squad', 'heavy', 'scout', 'sniper', 'drone', 'tank', 'curator'].every(t => D[t] && D[t].sel.length >= 4 && (t === 'curator' || D[t].ord.length === 4)));
    if (L === 'en') ok('en_2voices', Object.values(vc).every(n => n >= 2), vc);
    const e0 = VOICE66.errors;
    // все клипы пакета декодируются
    const jobs = []; for (const t in D) for (const k of ['sel', 'ord']) D[t][k].forEach((it, i) => { const n = Array.isArray(it.b) ? it.b.length : 1; for (let v = 0; v < n; v++) jobs.push(VOICE66.decode(t, k, i, v).then(b => b.duration, () => -1)); });
    const durs = await Promise.all(jobs);
    ok(L + '_decodeAll', durs.every(d => d > 0.2 && d < 6), [durs.length, Math.min(...durs).toFixed(2), Math.max(...durs).toFixed(2)]);
    for (const t of ['builder', 'drone', 'curator']){
      VOICE66.last = 0; const p0 = VOICE66.played;
      VOICE66.play(t, 'sel', 0, 1);
      for (let k = 0; k < 40 && VOICE66.played === p0; k++) await sleep(50);
      const txt = VOICE66.lastText || '';
      const langOk = L === 'ru' ? /[А-Яа-я]/.test(txt) : L === 'he' ? /[\u0590-\u05FF]/.test(txt) : L === 'vi' ? /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(txt) : /^[A-Za-z' ,.!?-]+$/.test(txt);
      ok(L + '_say_' + t, VOICE66.played > p0 && VOICE66.lastLang === L && langOk, [VOICE66.lastLang, txt]);
      await sleep(250);
    }
    ok(L + '_noDecodeErr', VOICE66.errors === e0, VOICE66.errors);
  }
  // EN: разные юниты — разные голоса
  SET.lang = 'en'; MENU.applyLang();
  const vars = new Set(); for (let k = 0; k < 12; k++) vars.add(VOICE66.varOf({ id: 'sq' + k }, 3));
  out.info.en_varSpread = [...vars]; ok('en_varSpread', vars.size >= 2);
  // бой и стратегия в иврите (HUD, куратор, панели)
  SET.lang = 'he'; MENU.applyLang();
  PROG.allUnlocked = true;
  MENU.newGame(); if (TUT.on) TUT.finish(); await sleep(2200);
  await shot(`${shotDir}_${tag}_he_fps.jpg`);
  { const gs = groupsOf(0); const vs = gs.map(g => VOICE66.varOf(g, 3)); out.info.varReal = [gs.length, vs.join('')]; ok('varReal_spread', gs.length < 3 || new Set(vs).size >= 2, vs); }
  ok('he_hud_text', /[\u0590-\u05FF]/.test(document.body.innerText), document.body.innerText.slice(0, 80));
  if (typeof enterRTS === 'function'){ enterRTS(); await sleep(1500); }
  await shot(`${shotDir}_${tag}_he_rts.jpg`);
  const sideTxt = ($('side') && $('side').innerText || '') + ' ' + ($('cur') && $('cur').innerText || '');
  out.info.he_rts_text = sideTxt.replace(/\s+/g, ' ').slice(0, 160);
  ok('he_rts_hebrew', /[\u0590-\u05FF]/.test(sideTxt));
  MENU.pause(); await sleep(300); overlaps(MENU_SEL, 'he_pause'); await shot(`${shotDir}_${tag}_he_pause.jpg`);
  MENU.resume(); await sleep(200);
} catch (e){ out.errors.push('EXC ' + e.message + ' ' + (e.stack || '').slice(0, 300)); }
finally { MENU.save = save0; SET.lang = 'ru'; MENU.applyLang(); MENU.toMenu(); }
out.pass = !out.errors.length;
return out;
