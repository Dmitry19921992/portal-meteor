const scr = p => { const s = project(p); return s && s[0] > 60 && s[0] < innerWidth - 60 && s[1] > 60 && s[1] < innerHeight - 60 ? s : null; };
const sqs = groupsOf(0).filter(isSquad);
return sqs.map(g => ({ k: groupKind(g), alive: groupAlive(g), on: onScreen(leaderPos(g)), scr: !!scr(leaderPos(g)), n: g.units.length, sel: S.sel.has(g), lone: !!g.lone, elite: !!g.elite }));
