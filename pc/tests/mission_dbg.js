const sleep = ms => new Promise(r => setTimeout(r, ms));
window.requestAnimationFrame = () => 0;
MENU.newGame();
const log = [];
const oe = window.emit;
window.emit = (t, d) => { if (t === 'objective') log.push(Math.round(S.time) + ' VOICE ' + d.text.slice(0, 50)); return oe(t, d); };
const sk = TACT.sticky.bind(TACT);
TACT.sticky = function(g, s){ const k0 = this.stick; const r = sk(g, s); if (r !== k0 && k0) log.push(`${S.time.toFixed(1)} STICK ${k0.order}${k0.cp ? k0.cp.name : ''} -> ${r.order}${r.cp ? r.cp.name : ''} sameG=${k0.g === g} age=${(S.time - k0.t0).toFixed(1)} cpOwn=${k0.cp && k0.cp.owner} prog=${k0.cp && k0.cp.prog.toFixed(2)} contested=${s.cp && s.cp.contested}`); return r; };
for (let i = 0; i < 20 * 20; i++){
  update(0.05);
  if (i === 30) log.push('redeploy ' + MISSION.redeploy());
  if (i % 20 === 0){ computeNav(); const g = playerGroup(), t = TACT.task; log.push(`${Math.round(S.time)} g=${g && g.id} strat=${g && g.strat ? g.strat.order + (g.strat.cp ? g.strat.cp.name : '') : '-'} task=${t ? t.kind + (t.cp ? t.cp.name : '') + (t.done ? ' done' : '') : '-'}`); }
}
return log;
