// =====================================================================
//  СОХРАНЕНИЕ И ЗАГРУЗКА БОЯ (localStorage)
//  Все сущности пишутся как записи; ссылки между ними — токенами {$r:'e:12'}.
// =====================================================================
const SAVE = {
  KEY: 'pm_save_v5',
  lastAuto: 0,
  has(){ try { return !!localStorage.getItem(this.KEY); } catch (e){ return false; } },
  info(){
    try { const o = JSON.parse(localStorage.getItem(this.KEY)); return `${fmtTime(o.time)} · ${new Date(o.at).toLocaleString(LANG.cur === 'en' ? 'en-GB' : LANG.cur === 'vi' ? 'vi-VN' : 'ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`; }
    catch (e){ return ''; }
  },
  // реестр: объект -> токен
  registry(){
    const R = new Map();
    for (const u of S.units) R.set(u, 'e:' + u.id);
    for (const v of S.vehicles) R.set(v, 'e:' + v.id);
    for (const d of S.drones) R.set(d, 'e:' + d.id);
    for (const b of S.builders) R.set(b, 'e:' + b.id);
    for (const b of S.buildings) R.set(b, 'e:' + b.id);
    for (const s of S.squads) R.set(s, 's:' + s.id);
    S.hq.forEach((h, i) => R.set(h, 'h:' + i));
    S.cps.forEach((c, i) => R.set(c, 'c:' + i));
    for (const p of PROPS) R.set(p, 'p:' + p.id);
    return R;
  },
  pack(v, R, self, depth){
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === 'number') return Number.isFinite(v) ? v : 0;
    if (t === 'string' || t === 'boolean') return v;
    if (t === 'function') return undefined;
    if (R.has(v) && v !== self) return { $r: R.get(v) };
    if (v instanceof Set || v instanceof Map) return undefined;
    if (v !== self && !Array.isArray(v) && (v.cls || Array.isArray(v.units))) return null;   // мёртвая сущность — ссылка обнуляется
    if (Array.isArray(v)) return v.map(x => this.pack(x, R, null, depth + 1));
    if (t === 'object'){
      if (R.has(v) && v === self || depth < 3){
        const o = {};
        for (const k in v){ const p = this.pack(v[k], R, null, depth + 1); if (p !== undefined) o[k] = p; }
        return o;
      }
      return undefined;   // неизвестный глубокий объект (кэш и т. п.) не сохраняем
    }
    return undefined;
  },
  save(){
    if (S.attract || S.over) return false;
    try {
      const R = this.registry();
      const P = o => this.pack(o, R, o, 0);
      const data = {
        v: 5, at: Date.now(), time: S.time, endless: S.endless, battle: SET.battle, diff: S.diff,
        nid: NID, ts: TANK_SERIAL, ds: DRONE_SERIAL, nextSquad: S.nextSquad, hqAlive: [...HQ_ALIVE],
        stats: S.stats, adapt: { v: ADAPT.v }, gameK: { INC_MUL: GAME.INC_MUL },
        teams: S.teams.map(t => this.pack(t, R, null, 0)),
        hq: S.hq.map(P), cps: S.cps.map(P),
        units: S.units.filter(u => u.alive).map(P), vehicles: S.vehicles.filter(v => v.alive).map(P),
        drones: S.drones.filter(d => d.alive).map(P), builders: S.builders.filter(b => b.alive).map(P),
        buildings: S.buildings.filter(b => b.alive).map(P), squads: S.squads.map(P),
        props: PROPS.map(p => [p.alive ? 1 : 0, +p.integ.toFixed(3), Math.round(p.hp)]),
        me: S.me && R.has(S.me) ? R.get(S.me) : null, turretBody: S.turretBody && R.has(S.turretBody) ? R.get(S.turretBody) : null,
        prog: { xp: PROG.xp, rank: PROG.rank, unl: [...PROG.unl], mk: PROG.matchKills, mt: PROG.matchTasks, mx: PROG.matchXP },
        kit: S.kit ? this.pack(S.kit, R, null, 0) : null, mode: S.mode,
      };
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch (e){ console.warn('save failed', e); return false; }
  },
  load(){
    let data;
    try { data = JSON.parse(localStorage.getItem(this.KEY)); } catch (e){ return false; }
    if (!data || data.v !== 5) return false;
    SET.battle = data.battle; SET.endless = data.endless;
    newMatch({ attract: false });   // чистое поле, затем заменяем содержимое
    const objs = new Map();
    const make = (rec, list) => { const o = Object.assign({}, rec); objs.set('e:' + o.id, o); list.push(o); return o; };
    S.units = []; S.vehicles = []; S.drones = []; S.builders = []; S.buildings = []; S.squads = [];
    for (const r of data.units) make(r, S.units);
    for (const r of data.vehicles) make(r, S.vehicles);
    for (const r of data.drones) make(r, S.drones);
    for (const r of data.builders) make(r, S.builders);
    for (const r of data.buildings) make(r, S.buildings);
    for (const r of data.squads){ const o = Object.assign({}, r); objs.set('s:' + o.id, o); S.squads.push(o); }
    data.hq.forEach((r, i) => { Object.assign(S.hq[i], r); objs.set('h:' + i, S.hq[i]); });
    data.cps.forEach((r, i) => { Object.assign(S.cps[i], r); objs.set('c:' + i, S.cps[i]); });
    for (const p of PROPS) objs.set('p:' + p.id, p);
    data.props.forEach((a, i) => { const p = PROPS[i]; if (!p) return; p.alive = !!a[0]; p.integ = a[1]; p.hp = a[2]; });
    // разворачиваем ссылки
    const fix = (v, depth) => {
      if (!v || typeof v !== 'object') return v;
      if (v.$r) return objs.get(v.$r) || null;
      if (Array.isArray(v)){ for (let i = 0; i < v.length; i++) v[i] = fix(v[i], depth + 1); return v; }
      if (depth > 4) return v;
      for (const k in v) v[k] = fix(v[k], depth + 1);
      return v;
    };
    for (const o of [...S.units, ...S.vehicles, ...S.drones, ...S.builders, ...S.buildings, ...S.squads, ...S.hq, ...S.cps]) for (const k in o) o[k] = fix(o[k], 1);
    S.teams = data.teams.map(t => fix(t, 1));
    for (const sq of S.squads) sq.units = (sq.units || []).filter(u => u && u.alive);
    S.squads = S.squads.filter(sq => sq.units.length);
    for (const u of S.units){ if (!u.squad || !S.squads.includes(u.squad)) u.alive = false; u.jet = jetOf(u); }
    S.units = S.units.filter(u => u.alive);
    BLD_LIST = S.buildings; bgridDirty();
    HQ_ALIVE[0] = data.hqAlive[0]; HQ_ALIVE[1] = data.hqAlive[1];
    NID = data.nid; TANK_SERIAL = data.ts; DRONE_SERIAL = data.ds; S.nextSquad = data.nextSquad;
    S.time = data.time; S.stats = data.stats; S.diff = data.diff;
    ADAPT.v = data.adapt.v; adaptCalc();
    PROG.xp = data.prog.xp; PROG.rank = data.prog.rank; PROG.unl = new Set(data.prog.unl); PROG.matchKills = data.prog.mk; PROG.matchTasks = data.prog.mt; PROG.matchXP = data.prog.mx;
    if (data.kit) Object.assign(S.kit, fix(data.kit, 1), { reloadT: 0 });
    TACT.reset();
    S.turretBody = data.turretBody ? objs.get(data.turretBody) : null;
    const me = data.me ? objs.get(data.me) : null;
    S.me = null;
    if (me && (me.alive || me.cls === 'bld')) takeControl(me); else autoSwitch();
    if (data.mode === 'rts') enterRTS();
    feed(tr(`Бой загружен: ${fmtTime(S.time)}`, `Battle loaded: ${fmtTime(S.time)}`, `Đã tải trận: ${fmtTime(S.time)}`), TEAM[0].css);
    return true;
  },
  // автосохранение каждые 3 минуты боя
  auto(){
    if (S.attract || S.over || S.paused) return;
    if (S.time - this.lastAuto < 180) return;
    this.lastAuto = S.time;
    if (this.save()) feed(tr('Автосохранение', 'Autosaved', 'Đã tự động lưu'), '#8f8664');
  },
};
