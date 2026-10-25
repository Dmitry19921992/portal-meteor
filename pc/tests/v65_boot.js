// v6.5: загрузка модели, кадр меню
await sleep(1500);
const out = { ok: HV65.ok, failed: HV65.failed, err: HV65.err, nVerts: HV65.nVerts, nIdx: HV65.nIdx, title: document.title };
if (HV65.M) out.spd = HV65.M.SPD, out.clips = Object.keys(HV65.M.clips), out.CL = Object.fromEntries(Object.entries(HV65.M.CL).map(([k, c]) => [k, c.name + ' ' + c.dur.toFixed(2)])), out.upper = HV65.M.upperJ.length;
out.heavies = S.units.filter(u => HV65.is(u)).length;
out.stats = HV65.stats;
out.fps = typeof fpsVal !== 'undefined' ? fpsVal : null;
await shot('D:/AI/pm_v6/shots/v65_menu.jpg');
return out;
