// =====================================================================
//  v8.5 — КАМПАНИЯ ОТРЯДОВ (CAMP85): ветеранство сохраняется МЕЖДУ матчами (решение Дмитрия 24.10.2026).
//  • Каждый свой отряд (штурмовой, десант, одиночка) получает имя («Волки», «Кобры-2»…) и запись в localStorage
//    (ключ 'pm_cmd85_v1', версия V). В строю — до 12 именных отрядов, остальные воюют без имени.
//  • Опыт = g.kills из game.js (пехота 1, здание 2, техника 3). Уровни 1–5: 5 / 12 / 24 / 40 / 60 опыта.
//    Звёзды g.vet (★–★★★, бонус урона/брони из game.js) идут от того же опыта — после матча они не пропадают.
//  • Перки по уровню (небольшие): 1 — способности −8 % перезарядки, 2 — +6 % прочности, 3 — +6 % скорости,
//    4 — вне боя +1 % прочности/с, 5 — +5 % урона и ещё −8 % перезарядки.
//  • В новом матче первыми встают в строй ветераны (лучший опыт — первым). Погибший отряд теряет всё: запись уходит в «Павшие».
//  • Экран «Мои отряды» (главное меню), настройка «Режим Командир на телефоне». Не пишет в обучении, «бот против бота», песочнице.
//  Хуки — только обёртки: update, newMatch, SAVE.load, killCredit, damage, botInput, addToSquad, MENU.html_settings/wire, P71M.sec.
// =====================================================================
const T85 = (ru, en) => tr(ru, en, en, en);
const CAMP85 = {
  KEY: 'pm_cmd85_v1', V: 1, MAXACT: 12, MAXFALL: 40,
  LV: [0, 5, 12, 24, 40, 60],
  NAMES: [['Волки', 'Wolves'], ['Кобры', 'Cobras'], ['Соколы', 'Falcons'], ['Гадюки', 'Vipers'], ['Шершни', 'Hornets'], ['Вороны', 'Ravens'], ['Барсы', 'Snow Leopards'],
    ['Медведи', 'Bears'], ['Скорпионы', 'Scorpions'], ['Ястребы', 'Hawks'], ['Рыси', 'Lynxes'], ['Беркуты', 'Golden Eagles'], ['Тигры', 'Tigers'], ['Акулы', 'Sharks'],
    ['Грифы', 'Vultures'], ['Молнии', 'Lightnings'], ['Кометы', 'Comets'], ['Титаны', 'Titans'], ['Призраки', 'Ghosts'], ['Клинки', 'Blades']],
  PERKS: [null,
    { ic: '⟳', n: ['Сработанность', 'Teamwork'], d: ['способности перезаряжаются на 8 % быстрее', 'abilities recharge 8% faster'] },
    { ic: '⛨', n: ['Закалка', 'Hardened'], d: ['+6 % прочности бойцов', '+6% trooper hull'] },
    { ic: '»', n: ['Марш-бросок', 'Forced march'], d: ['+6 % скорости', '+6% speed'] },
    { ic: '✚', n: ['Самоперевязка', 'Self-aid'], d: ['вне боя +1 % прочности в секунду', 'out of combat +1% hull per second'] },
    { ic: '★', n: ['Легенда', 'Legend'], d: ['+5 % урона и ещё −8 % к перезарядке', '+5% damage and another −8% cooldowns'] }],
  d: null, live: new Map(), mid: 0, fin: true, dirty: false, saveT: 0, scanT: 0, err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('CAMP85 ' + tag, e); } } },
  load(){
    let o = null; try { o = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e){}
    this.d = o && o.v === this.V && Array.isArray(o.sq) ? o : { v: this.V, seq: 0, sq: [], fallen: [] };
    if (!Array.isArray(this.d.fallen)) this.d.fallen = [];
    return this.d;
  },
  save(){ try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); this.dirty = false; } catch (e){} },
  lvl(x){ let L = 0; for (let i = 1; i < this.LV.length; i++) if (x >= this.LV[i]) L = i; return L; },
  vet(x){ return x >= 24 ? 3 : x >= 12 ? 2 : x >= 5 ? 1 : 0; },   // те же пороги, что в killCredit (game.js)
  cdK(g){ const L = g && g.c85L || 0; return 1 - (L >= 1 ? 0.08 : 0) - (L >= 5 ? 0.08 : 0); },
  name(r){ if (!r) return ''; const N = this.NAMES[r.ni % this.NAMES.length]; return '«' + T85(N[0], N[1]) + (r.ns > 1 ? '-' + r.ns : '') + '»'; },
  kindOf(sq){ return sq.solo ? 'solo' : sq.elite ? 'elite' : 'std'; },
  kindName(r){ return r.kind === 'elite' ? T85('Небесный десант', 'Sky troopers') : r.kind === 'solo' ? (r.solo && ROLES[r.solo] ? N2(ROLES[r.solo].n) : T85('Одиночка', 'Lone trooper')) : T85('Штурмовой отряд', 'Assault squad'); },
  facIc(f){ return f === 1 ? '⬢' : '◆'; },
  on(){ return !S.attract && !(typeof T72 !== 'undefined' && T72.on) && !(typeof DEV !== 'undefined' && DEV.match) && !!this.mid; },
  rec(id){ return this.d.sq.find(r => r.id === id) || null; },
  ofSq(sq){ return sq && sq.c85 ? this.rec(sq.c85) : null; },
  labelOf(g){ const r = this.ofSq(g); return r ? this.name(r) : groupLabel(g); },
  today(){ const t = new Date(); return ('0' + t.getDate()).slice(-2) + '.' + ('0' + (t.getMonth() + 1)).slice(-2) + '.' + t.getFullYear(); },
  newRec(sq){
    const all = [...this.d.sq, ...this.d.fallen], act = new Set(this.d.sq.map(r => r.ni));
    let best = 0, bn = 1e9;
    for (let i = 0; i < this.NAMES.length; i++){ const n = all.filter(r => r.ni === i).length + (act.has(i) ? 100 : 0) + random() * 0.5; if (n < bn){ bn = n; best = i; } }
    const r = { id: ++this.d.seq, ni: best, ns: 1 + all.filter(x => x.ni === best).length, kind: this.kindOf(sq), solo: sq.solo || null, fac: FI76(0),
                xp: 0, kills: 0, matches: 0, wins: 0, born: this.today(), deploys: 0, mid: 0 };
    this.d.sq.push(r); this.dirty = true;
    return r;
  },
  hpPerk(u){ if (!u || u.c85hp) return; u.c85hp = 1; u.maxhp *= 1.06; u.hp *= 1.06; },
  attach(sq){
    const kind = this.kindOf(sq), fac = FI76(0);
    let r = null;
    if (sq.c85){ r = this.rec(sq.c85); if (r && this.live.has(r.id) && this.live.get(r.id) !== sq) r = null; }   // загрузка сохранения
    else {
      for (const x of this.d.sq) if (x.kind === kind && x.fac === fac && x.mid !== this.mid && !this.live.has(x.id) && (kind !== 'solo' || x.solo === (sq.solo || null)) && (!r || x.xp > r.xp)) r = x;
      if (!r && this.d.sq.length < this.MAXACT) r = this.newRec(sq);
    }
    if (!r){ sq.c85 = 0; return; }
    const fresh = sq.c85 !== r.id;
    sq.c85 = r.id; r.mid = this.mid; this.live.set(r.id, sq);
    if (fresh){ sq.kills = max(sq.kills || 0, r.xp); r.deploys = (r.deploys || 0) + 1; this.dirty = true; }
    sq.vet = max(sq.vet || 0, this.vet(sq.kills || 0));
    sq.c85L = this.lvl(r.xp);
    if (sq.c85L >= 2) for (const u of sq.units) this.hpPerk(u);
    if (fresh && sq.team === 0 && (r.xp > 0 || r.matches > 0)) feed(T85(`Ветераны в строю: ${this.name(r)} ${'★'.repeat(sq.vet)} · ур. ${sq.c85L} · боёв ${r.matches}`, `Veterans deployed: ${this.name(r)} ${'★'.repeat(sq.vet)} · lv ${sq.c85L} · battles ${r.matches}`), '#ffd27a');
  },
  fall(r, sq){
    const i = this.d.sq.indexOf(r); if (i < 0) return;
    this.d.sq.splice(i, 1);
    this.d.fallen.unshift(Object.assign({}, r, { died: this.today(), lvl: this.lvl(r.xp), st: 'fallen' }));
    if (this.d.fallen.length > this.MAXFALL) this.d.fallen.length = this.MAXFALL;
    this.dirty = true; this.save();
    feed(T85(`Отряд ${this.name(r)} погиб — ветеранство (ур. ${this.lvl(r.xp)}) потеряно. Он в «Мои отряды → Павшие».`, `Squad ${this.name(r)} is lost — its veterancy (lv ${this.lvl(r.xp)}) is gone. See "My squads → Fallen".`), '#f88');
  },
  lvUp(r, sq, L){
    sq.c85L = L;
    if (L >= 2) for (const u of sq.units) this.hpPerk(u);
    const P = this.PERKS[L];
    feed(T85(`${this.name(r)}: уровень ${L} — перк «${P.n[0]}» (${P.d[0]})`, `${this.name(r)}: level ${L} — perk "${P.n[1]}" (${P.d[1]})`), '#ffd27a');
    emit('ui', { kind: 'ok' });
  },
  scan(){
    if (!this.on()) return;
    for (const sq of S.squads){
      if (sq.team !== 0 || sq.c85 === 0 || !sq.units.length) continue;
      if (sq.c85 && this.live.get(sq.c85) === sq) continue;
      this.attach(sq);
    }
    for (const [id, sq] of this.live){
      const r = this.rec(id);
      if (!r){ this.live.delete(id); continue; }
      if (!groupAlive(sq)){ this.live.delete(id); this.fall(r, sq); continue; }
      const x = sq.kills || 0;
      if (x > r.xp){ const L0 = this.lvl(r.xp); r.xp = x; sq.vet = max(sq.vet || 0, this.vet(x)); const L1 = this.lvl(x); if (L1 > L0) this.lvUp(r, sq, L1); this.dirty = true; }
    }
  },
  finalize(){
    if (this.fin || !this.mid) return;
    this.fin = true;
    for (const [id, sq] of this.live){ const r = this.rec(id); if (!r || !groupAlive(sq)) continue; r.matches++; if (S.over && S.winner === 0) r.wins++; r.xp = max(r.xp, sq.kills || 0); }
    this.save();
  },
  step(dt){
    if (S.attract || !this.d) return;
    this.scanT -= dt;
    if (this.scanT <= 0){ this.scanT = 0.5; this.scan(); if (S.over && !this.fin) this.finalize(); }
    // перк 4: самоперевязка вне боя
    for (const sq of this.live.values()){
      if ((sq.c85L || 0) < 4) continue;
      for (const u of sq.units) if (u.alive && u.hp < u.maxhp && S.time - (u.lastHurt || -99) > 6) u.hp = min(u.maxhp, u.hp + u.maxhp * 0.01 * dt);
    }
    if (this.dirty && S.rtime - this.saveT > 5){ this.saveT = S.rtime; this.save(); }
  },
  // ---------------------------------------------------------------- экран «Мои отряды»
  bar(f, col){ return `<span class="cbar"><s style="width:${(clamp(f, 0, 1) * 100).toFixed(1)}%;background:${col || '#ffd27a'}"></s></span>`; },
  row(r, dead){
    const L = dead ? (r.lvl || this.lvl(r.xp)) : this.lvl(r.xp), nx = this.LV[L + 1], pv = this.LV[L];
    const pk = this.PERKS.slice(1).map((P, i) => `<i class="${i + 1 <= L ? 'on' : ''}" title="${T85(P.n[0], P.n[1])}: ${T85(P.d[0], P.d[1])} · ${T85('ур.', 'lv')} ${i + 1}">${P.ic}</i>`).join('');
    return `<div class="crow c85r ${dead ? 'dead' : ''}"><span>${dead ? '✝' : this.facIc(r.fac)} <b>${this.name(r)}</b> <small>${this.kindName(r)}</small></span>
      <b>${T85('ур.', 'lv')} ${L}${this.vet(r.xp) ? ' <em>' + '★'.repeat(this.vet(r.xp)) + '</em>' : ''}</b>
      <small>${T85('убито', 'kills')} ${r.kills} · ${T85('опыт', 'XP')} ${r.xp}${nx !== undefined && !dead ? '/' + nx : ''} · ${T85('боёв', 'battles')} ${r.matches} · ${T85('побед', 'wins')} ${r.wins}${dead ? ' · ✝ ' + r.died : ' · ' + T85('с', 'since') + ' ' + r.born}</small>
      ${dead ? '' : this.bar(nx === undefined ? 1 : (r.xp - pv) / max(1, nx - pv), '#8fffaa')}<div class="pk">${pk}</div></div>`;
  },
  html(){
    const d = this.d || this.load();
    const act = d.sq.slice().sort((a, b) => b.xp - a.xp);
    const perks = this.PERKS.slice(1).map((P, i) => `<div class="crow c85p"><span><i>${P.ic}</i> ${T85('ур.', 'lv')} ${i + 1} · <b>${T85(P.n[0], P.n[1])}</b></span><small>${T85(P.d[0], P.d[1])} · ${T85('опыт', 'XP')} ${this.LV[i + 1]}</small></div>`).join('');
    return `<div class="mcol wide career c85m"><h2>${T85('МОИ ОТРЯДЫ', 'MY SQUADS')}</h2>
      <p class="note">${T85('Ветеранство сохраняется между боями. Отряд копит опыт (пехота 1, здание 2, техника 3), получает уровни, звёзды и перки. В новом бою ветераны встают в строй первыми. Погибший отряд теряет всё и уходит в «Павшие».', 'Veterancy carries over between battles. A squad earns XP (infantry 1, building 2, vehicle 3), levels, stars and perks. Veterans deploy first in a new battle. A lost squad loses everything and joins the Fallen.')}</p>
      <div class="cols"><div>
        <h4>${T85('В строю', 'Active')} · ${act.length} / ${this.MAXACT}</h4>${act.length ? act.map(r => this.row(r)).join('') : `<p class="note">${T85('Пока пусто — отряды получат имена в первом же бою.', 'Empty for now — squads get names in your next battle.')}</p>`}
      </div><div>
        <h4>${T85('Перки по уровням', 'Perks by level')}</h4>${perks}
        <h4>${T85('Павшие', 'Fallen')} · ${d.fallen.length}</h4>${d.fallen.length ? d.fallen.slice(0, 12).map(r => this.row(r, true)).join('') : `<p class="note">${T85('Потерь нет.', 'No losses.')}</p>`}
      </div></div>
      ${MENU.btn('back', T85('Назад', 'Back'), 'big')}</div>`;
  },
};
CAMP85.load();
MENU.html_c85 = () => CAMP85.html();
// ---------------------------------------------------------------- хуки
{ const up0 = update; update = function(dt){ const r = up0.apply(this, arguments); CAMP85.safe(() => CAMP85.step(dt), 'step'); return r; }; }
{ const nm0 = newMatch;
  newMatch = function(opts){
    CAMP85.safe(() => { CAMP85.finalize(); CAMP85.live.clear(); }, 'nm');
    const r = nm0.apply(this, arguments);
    CAMP85.mid = S.attract ? 0 : Date.now(); CAMP85.fin = !CAMP85.mid; CAMP85.scanT = 0;
    return r;
  }; }
{ const ld0 = SAVE.load;
  SAVE.load = function(){
    CAMP85.safe(() => { CAMP85.finalize(); CAMP85.live.clear(); }, 'ld');
    const r = ld0.apply(this, arguments);
    if (!S.attract){ CAMP85.mid = Date.now(); CAMP85.fin = false; CAMP85.scanT = 0; }
    return r;
  }; }
{ const kc0 = killCredit;
  killCredit = function(e, src){
    const r = kc0.apply(this, arguments);
    if (src && src.team === 0 && e && e.team !== 0){ const g = groupOf(src), R = g && CAMP85.ofSq(g); if (R && CAMP85.live.get(R.id) === g){ R.kills++; CAMP85.dirty = true; } }
    return r;
  }; }
{ const dm0 = damage; damage = function(e, dmg, src, ptype){ if (src && src.squad && (src.squad.c85L || 0) >= 5) dmg *= 1.05; return dm0.call(this, e, dmg, src, ptype); }; }
{ const bi0 = botInput; botInput = function(u, dt){ const inp = bi0.apply(this, arguments); const sq = u.squad; if (sq){ if ((sq.c85L || 0) >= 3) inp.speedMul *= 1.06; if (sq.c85spr > S.time) inp.speedMul *= 1.6; } return inp; }; }
{ const as0 = addToSquad; addToSquad = function(sq){ const u = as0.apply(this, arguments); if (sq && (sq.c85L || 0) >= 2) CAMP85.hpPerk(u); return u; }; }
addEventListener('beforeunload', () => { if (CAMP85.dirty) CAMP85.save(); });
// ---------------------------------------------------------------- меню: кнопка «Мои отряды», настройка «Командир на телефоне»
{ const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.apply(this, arguments);
    const el = $('screen'); if (!el) return;
    if (name === 'main' && !$('m_c85')){
      const tut = $('m_tutorial');
      if (tut){
        const b = document.createElement('button'); b.id = 'm_c85';
        b.className = (tut.className || '') + ' c85btn';
        const n = CAMP85.d ? CAMP85.d.sq.length : 0;
        b.innerHTML = `⌖ ${T85('Мои отряды', 'My squads')} <small>${n ? n + ' ' + T85('в строю', 'active') : T85('кампания', 'campaign')}</small>`;
        tut.parentNode.insertBefore(b, tut.nextSibling);
      }
    }
    const b = $('m_c85'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); MENU.show('c85', true); };
  }; }
{ const lab = () => T85('Режим «Командир» на телефоне', '"Commander" mode on phone');
  const fix = () => { if (SET.cmd85ph !== true) SET.cmd85ph = false; };
  const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    const h = hs0.apply(this, arguments);
    if (typeof V74 === 'undefined') return h;
    fix();
    const re = /(<button class="tog[^"]*" data-p74tog="a78">[^<]*<\/button><\/div>)/;
    return re.test(h) ? h.replace(re, '$1' + V74.togBtn('cmd85ph', lab(), false)) : h;
  };
  if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_game' && typeof V74 !== 'undefined'){ fix(); h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + V74.togBtn('cmd85ph', lab(), true)); } return h; }; } }
(function(){ const st = document.createElement('style'); st.id = 'c85campcss'; st.textContent = `
  .c85m .c85r{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}
  .c85m .c85r>span{font-size:14px} .c85m .c85r>span small{opacity:.65;margin-left:4px} .c85m .c85r>b em{font-style:normal;color:#ffd27a}
  .c85m .c85r>small{grid-column:1/3;opacity:.8} .c85m .c85r .cbar{grid-column:1/3}
  .c85m .c85r .pk{grid-column:1/3;display:flex;gap:4px} .c85m .pk i{font-style:normal;width:20px;height:20px;line-height:20px;text-align:center;border-radius:5px;background:rgba(255,255,255,.06);color:#666;font-size:12px}
  .c85m .pk i.on{background:rgba(255,210,122,.18);color:#ffd27a}
  .c85m .c85r.dead{opacity:.6} .c85m .c85p i{font-style:normal;color:#ffd27a} .c85m .c85p small{display:block;opacity:.75}
  #screen .c85btn small{opacity:.6;font-size:.8em;margin-left:4px}
  @media (max-height:500px){ .c85m .cols{grid-template-columns:1fr 1fr} .c85m .note{font-size:11px} }
`; document.head.appendChild(st); })();
