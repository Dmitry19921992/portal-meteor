// v6.6 probe: почему не видно куратора в стратегии при обычной игре (ИИ-стратег вкл)
const out = { log: [] };
MENU.newGame(); await sleep(500);
out.tut = TUT.on; if (TUT.on) TUT.finish();
out.set = { curator: SET.curator, hintsVoice: SET.hintsVoice, hintsOn: SET.hintsOn, once: JSON.stringify(CUR.once) };
for (let i = 0; i < 60; i++){ update(0.05); }
await sleep(1500);
enterRTS();
for (let k = 0; k < 16; k++){
  await sleep(1000);
  const el = $('cur');
  out.log.push({ t: S.rtime.toFixed(1), cur: CUR.cur ? CUR.cur.s.id : null, txt: CUR.cur ? CUR.cur.text.slice(0, 50) : null, disp: el ? el.style.display : 'noel', ai: S.teams[0].ai, mode: S.mode, ore: Math.round(S.teams[0].ore) });
  if (k === 3) await shot('D:/AI/pm_v6/shots/v66_probe_cur1.jpg');
}
await shot('D:/AI/pm_v6/shots/v66_probe_cur2.jpg');
out.steps = CUR.steps.map(s => { let w = false; try { w = !!s.when(curCtx()); } catch (e){ w = 'ERR ' + e.message; } return s.id + ':' + (w ? 1 : 0) + (CUR.eligible(s) ? '' : 'x'); }).join(' ');
return out;
