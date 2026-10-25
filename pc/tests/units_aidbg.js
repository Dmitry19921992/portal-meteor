// отладка экономики ИИ: план заказов и очереди заводов
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && SCENE) break; await sleep(1000); }
newMatch({ attract: true }); S.paused = false;
const P0 = V2.plan; const log = [];
V2.plan = function(t, plan, nf){ P0.call(V2, t, plan, nf); if (Math.round(S.time) % 30 < 2) log.push(`${Math.round(S.time)} t${t} ore${Math.round(S.teams[t].ore)} f${nf}: ${plan.map(p => p[1]).join(',')}`); };
const q = [];
for (let s = 0; s < 300 / 0.05; s++){
  update(0.05);
  if (s % 600 === 0) for (const b of S.buildings) if (b.type === 'factory') q.push(`${Math.round(S.time)} t${b.team} done${b.done} q:${b.queue.join(',')}`);
  if (s % 400 === 0) await sleep(0);
}
V2.plan = P0;
return { log: log.slice(-14), q };
