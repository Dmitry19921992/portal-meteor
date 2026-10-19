// =====================================================================
//  v6.9 — ДРОНЫ ИНТЕРЕСНЕЕ, У ТЕХНИКИ — РЕМКОМПЛЕКТ
//  Боевой дрон (Дрон-хаб): R — таран (как было), F — скан местности (враги в радиусе 70 м видны 10 с
//  сквозь туман войны, импульс сканера), G — ракетный залп (4 ракеты в точку), T — ремонт: дрон-медик 8 с
//  чинит своих роботов, технику и дроны в радиусе 16 м. Танк, рейдер, РСЗО, миномёт: T — ремкомплект.
//  В бою (вселившись): дрон — 1 скан, Q ракеты, G ремонт, R таран; техника — 1 ремкомплект.
//  На телефоне — кнопки в контекстной зоне. ИИ (враг и стратег) пользуется ими по ситуации.
// =====================================================================
const V69 = { pulses: [], noteT: -99, rnd: typeof seeded === 'function' ? seeded(6909) : Math.random, lastT: null, btn: {} };
const V69_ABIL = {
  dscan:   { who: 'drone', key: 'KeyF', cd: 26, target: 'none', icon: '◎', r: 70, life: 10, n: ['Скан местности', 'Terrain scan', 'Quét địa hình', 'סריקת שטח'],
             d: ['Импульс сканера: 10 с видны все враги в радиусе 70 м — даже в тумане войны.', 'A scanner pulse: for 10 s every enemy within 70 m is revealed, even in the fog of war.', 'Xung quét: trong 10 giây lộ mọi kẻ địch trong bán kính 70 m, kể cả trong sương mù chiến tranh.', 'פולס סורק: למשך 10 שניות כל אויב ברדיוס 70 מ׳ נחשף, גם בערפל המלחמה.'] },
  drocket: { who: 'drone', key: 'KeyG', cd: 16, range: 110, target: 'point', icon: '➶', n: ['Ракетный залп', 'Rocket salvo', 'Loạt tên lửa', 'מטח טילים'],
             d: ['4 ракеты в точку: против техники, турелей и зданий.', '4 rockets at a point: for vehicles, turrets and buildings.', '4 tên lửa vào một điểm: chống xe, tháp súng và công trình.', '4 טילים אל נקודה: נגד רכבים, צריחים ומבנים.'] },
  drepair: { who: 'drone', key: 'KeyT', cd: 30, target: 'none', icon: '✚', r: 16, life: 8, n: ['Ремонт (медик)', 'Repair (medic)', 'Sửa chữa (y tế)', 'תיקון (חובש)'],
             d: ['Дрон-медик: 8 с чинит своих роботов, технику и дроны в радиусе 16 м.', 'Medic drone: for 8 s it repairs friendly robots, vehicles and drones within 16 m.', 'Drone y tế: trong 8 giây sửa robot, xe và drone phe ta trong bán kính 16 m.', 'רחפן חובש: למשך 8 שניות מתקן רובוטים, רכבים ורחפנים ידידותיים ברדיוס 16 מ׳.'] },
};
const V69_KIT = { key: 'KeyT', cd: 60, target: 'none', icon: '⚙', n: ['Ремкомплект', 'Repair kit', 'Bộ sửa chữa', 'ערכת תיקון'],
                  d: ['Экипаж латает машину: +35% прочности за 6 с.', 'The crew patches the vehicle: +35% hull over 6 s.', 'Tổ lái vá xe: +35% độ bền trong 6 giây.', 'הצוות מטליא את הרכב: ‎+35% שריון במשך 6 שניות.'] };
for (const who of ['tank', 'raider', 'mlrs', 'cat']) V69_ABIL['rk_' + who] = Object.assign({ who }, V69_KIT);
Object.assign(ABIL, V69_ABIL);
// иврит для коротких подписей (кнопки телефона, подсказки) — через словарь v6.8
try {
  Object.assign(HE68_DICT, { 'Rockets': 'טילים', 'Repair': 'תיקון', 'Scan': 'סריקה', 'Repair kit': 'ערכת תיקון',
    'Drone: ⤒ / ⤓ — up / down, ◎ "Scan", ➶ "Rockets", ✚ "Repair", ➤ "Ram" your aim point.': 'רחפן: ⤒ / ⤓ — למעלה / למטה, ◎ „סריקה", ➶ „טילים", ✚ „תיקון", ➤ „התנגשות" בנקודת הכוונת.',
    'Tank: 💥 "Barrage", ☁ "Smoke", ⏩ "Boost", ⚙ "Repair kit", ⏏ "Exit".': 'טנק: 💥 „מטח", ☁ „עשן", ⏩ „האצה", ⚙ „ערכת תיקון", ⏏ „יציאה".' });
  HE68C.map = null; HE68C.cache.clear();
} catch (e){}
// ---------------------------------------------------------------- исполнение
V69_ABIL.dscan.fn = g => {
  const A = V69_ABIL.dscan, p = g.pos.slice();
  S.scans.push({ team: g.team, pos: p, t: 0, life: A.life, r: A.r, drone: g });
  V69.pulses.push({ pos: p, team: g.team, t: 0 });
  addWave(p, 2.6, 0.9);
  addLight(p, g.team ? [6, 1, 0.5] : [1.2, 5, 3], 45, 0.6, 0.02);
  emit('scan', { pos: p, team: g.team });
  // враг сканирует рядом с игроком — предупредить
  const me = ctrlEntity();
  if (g.team === 1 && me && !S.attract && dist(me.pos, p) < A.r) feed(tr('Вражеский дрон просканировал местность — тебя видно!', 'An enemy drone scanned the area — you are revealed!', 'Drone địch đã quét khu vực — bạn bị lộ!', 'רחפן אויב סרק את האזור — אתה חשוף!'), '#f88');
};
V69_ABIL.drocket.fn = (g, pt) => { g.v69salvo = { pt, n: 4, next: S.time }; };
V69_ABIL.drepair.fn = g => { g.v69rep = S.time + V69_ABIL.drepair.life; emit('repair', { pos: g.pos, g }); };
for (const who of ['tank', 'raider', 'mlrs', 'cat']) V69_ABIL['rk_' + who].fn = g => { g.v69kit = S.time + 6; emit('repair', { pos: g.pos, g }); };
V69.allies = function(team){ return [S.units, S.vehicles, S.drones]; };
V69.step = function(){
  const t = S.time; if (this.lastT === null || t < this.lastT){ this.lastT = t; return; }
  const dt = min(0.1, t - this.lastT); this.lastT = t; if (dt <= 0) return;
  for (const d of S.drones){
    if (!d.alive){ d.v69salvo = null; d.v69rep = 0; continue; }
    // ракетный залп: по одной каждые 0.18 с
    const sv = d.v69salvo;
    if (sv && t >= sv.next){
      sv.next = t + 0.18; sv.n--;
      const from = add(d.pos, mul(d.up, -0.35));
      const j = [(this.rnd() - 0.5) * 3, (this.rnd() - 0.5) * 3, (this.rnd() - 0.5) * 3];
      fire(from, norm(sub(add(sv.pt, j), from)), d.team, 0.012, 48, 72, d, 'r', { splash: 3.2 });
      emit('rocket', { pos: from, src: d });
      addLight(from, [5, 3, 1.2], 8, 0.08, 0.004);
      if (sv.n <= 0) d.v69salvo = null;
    }
    // дрон-медик
    if (d.v69rep > t){
      const R = V69_ABIL.drepair.r, R2 = R * R;
      let heal = null;
      for (const L of this.allies(d.team)) for (const e of L){
        if (!e.alive || e.team !== d.team || e === d || e.hp >= e.maxhp || dist2(e.pos, d.pos) > R2) continue;
        const rate = e.cls === 'tank' ? 45 : e.cls === 'drone' ? 10 : 12;
        e.hp = min(e.maxhp, e.hp + rate * dt);
        if (e === S.me) S.healGlow = 0.4;
        if (!heal || this.rnd() < 0.3) heal = e;
      }
      if (heal && this.rnd() < dt * 16) S.sparks.push({ pos: add(d.pos, mul(d.up, -0.3)), vel: mul(sub(centerOf(heal), d.pos), 2.2), life: 0.4, heal: 1 });
      if (this.rnd() < dt * 2.5) addLight(d.pos, [0.6, 3.2, 1.4], R, 0.3, 0.008);
    }
  }
  for (const v of S.vehicles){
    if (!v.alive || !(v.v69kit > t)) continue;
    v.hp = min(v.maxhp, v.hp + v.maxhp * 0.35 / 6 * dt);
    if (this.rnd() < dt * 8) S.sparks.push({ pos: add(v.pos, add(mul(v.up, 1.2), mul([this.rnd() - 0.5, this.rnd() - 0.5, this.rnd() - 0.5], 2.4))), vel: mul(v.up, 2), life: 0.4, heal: 1 });
  }
  for (const p of this.pulses) p.t += dt;
  this.pulses = this.pulses.filter(p => p.t < 1.4);
};
{ const up0 = update; update = function(){ const r = up0.apply(this, arguments); try { V69.step(); } catch (e){ if (!V69.err){ V69.err = 1; console.warn('v69 step', e); } } return r; }; }
// голос и куратор: способности, применённые игроком
{
  const ua0 = useAbility;
  useAbility = function(g, k, pt){
    const why = ua0.apply(this, arguments);
    if (!why && g && g.team === 0 && !S.attract){
      if (typeof CUR !== 'undefined') CUR.ev('abil', k);
      if (V69_ABIL[k] && !V69.aiCall && typeof VOICE66 !== 'undefined') try { VOICE66.say(g, 'ord'); } catch (e){}
    }
    return why;
  };
}
// ---------------------------------------------------------------- ИИ: враг и стратег пользуются способностями по ситуации
V69.ai = function(g){
  if (!g || !g.alive || S.me === g || !g.abil) return;
  const kind = groupKind(g), t = g.team;
  const use = (k, pt) => { this.aiCall = true; let r; try { r = useAbility(g, k, pt); } finally { this.aiCall = false; } if (!r) this.note(g, k); return !r; };
  if (kind === 'drone'){
    // ремонт: рядом свои раненые (техника — ниже 70 %, бойцы — двое ниже 60 %)
    if (abilLeft(g, 'drepair') <= 0){
      const R2 = V69_ABIL.drepair.r ** 2; let veh = 0, inf = 0;
      for (const v of S.vehicles) if (v.alive && v.team === t && v.hp < v.maxhp * 0.7 && dist2(v.pos, g.pos) < R2) veh++;
      for (const u of S.units) if (u.alive && u.team === t && u.hp < u.maxhp * 0.6 && dist2(u.pos, g.pos) < R2) inf++;
      if ((veh || inf >= 2) && use('drepair')) return;
    }
    // ракеты: по технике, турелям и зданиям в пределах 100 м
    if (abilLeft(g, 'drocket') <= 0 && g.target && g.target.alive){
      const T = g.target, hard = T.cls === 'tank' || T.cls === 'bld' || T.cls === 'hq' || T.cls === 'harvester';
      if (hard && dist(T.pos, g.pos) < 100 && use('drocket', centerOf(T))) return;
    }
    // скан: рядом есть враги, которых команда не видит (или дрон у вражеской точки без цели)
    if (abilLeft(g, 'dscan') <= 0 && !g.v69salvo){
      const R2 = V69_ABIL.dscan.r ** 2; let hidden = 0;
      for (const L of [S.units, S.vehicles, S.drones]) for (const e of L) if (e.alive && e.team !== t && dist2(e.pos, g.pos) < R2 && !(e.seen && e.seen[t] > 0)) hidden++;
      const nearCp = !g.target && S.cps.some(c => !c.core && c.owner === 1 - t && dist(c.pos, g.pos) < 60);
      if ((hidden >= 2 || nearCp) && use('dscan')) return;
    }
  } else if (kind === 'tank' || kind === 'raider' || kind === 'mlrs' || kind === 'cat'){
    const k = 'rk_' + kind;
    if (abilLeft(g, k) <= 0 && !(g.v69kit > S.time) && g.hp < g.maxhp * 0.45 && (S.time - (g.lastHurt || -99) > 1.5 || g.hp < g.maxhp * 0.25)) use(k);
  }
};
V69.note = function(g, k){
  if (S.attract || g.team !== 0 || !S.teams[0].ai || S.rtime - this.noteT < 25) return;
  this.noteT = S.rtime;
  feed(tr(`Стратег: ${groupLabel(g)} — ${N2(ABIL[k].n).toLowerCase()}`, `Strategist: ${groupLabel(g)} — ${N2(ABIL[k].n).toLowerCase()}`, `Chiến lược gia: ${groupLabel(g)} — ${N2(ABIL[k].n).toLowerCase()}`, `אסטרטג: ${groupLabel(g)} — ${N2(ABIL[k].n)}`), '#9cf');
};
{ const aa0 = aiAbilities; aiAbilities = function(g){ const r = aa0.apply(this, arguments); try { V69.ai(g); } catch (e){ if (!V69.errA){ V69.errA = 1; console.warn('v69 ai', e); } } return r; }; }
// ---------------------------------------------------------------- бой от первого лица: клавиши (переназначаемые: «оружие 1», «ракета», «граната»)
V69.fpsAbil = function(c, act){
  if (!c) return null;
  if (c.cls === 'drone') return act === 'w1' ? 'dscan' : (act === 'grenade' || act === 'w2') ? 'drepair' : (act === 'rocket' || act === 'w3') ? 'drocket' : null;
  if (c.cls === 'tank') return act === 'w1' ? (c.vk ? 'rk_' + c.vk : 'rk_tank') : null;
  return null;
};
V69.fpsUse = function(k){
  const c = ctrlEntity(); if (!c || !ABIL[k]) return;
  vehAbility(k);
};
addEventListener('keydown', e => {
  if (e.repeat || S.mode !== 'fps' || S.attract || S.over || (typeof MENU !== 'undefined' && MENU.isOpen && MENU.isOpen())) return;
  const k = V69.fpsAbil(ctrlEntity(), actOf(e.code)); if (!k) return;
  e.stopImmediatePropagation();
  V69.fpsUse(k);
}, true);
V69.keyFor = function(c, k){
  if (k === 'dscan' || /^rk_/.test(k)) return bk('w1');
  if (k === 'drepair') return bk('grenade');
  if (k === 'drocket') return bk('rocket');
  return null;
};
// слоты способностей на HUD: для дрона и техники — с правильными клавишами
{
  const uk0 = updateKit;
  updateKit = function(c){
    if (!c || (c.cls !== 'tank' && c.cls !== 'drone')) return uk0.apply(this, arguments);
    const el = $('kit'), K = S.kit, keysFor = { barrage: bk('reload'), smoke: bk('reflex'), overdrive: bk('grenade'), kamikaze: bk('reload') };
    let h = '<div class="slots">';
    for (const k of abilList(c)){ const left = abilLeft(c, k), A = ABIL[k]; h += slot(V69.keyFor(c, k) || keysFor[k] || (A.key === 'KeyR' ? bk('reload') : A.key === 'KeyF' ? bk('reflex') : bk('grenade')), N2(A.n), left > 0 ? 'cd' : 'ok', left > 0 && A.cd ? 1 - left / A.cd : null, left > 0 ? Math.ceil(left) : ''); }
    h += '</div>';
    if (PROG.has('reflex') && c.cls === 'drone') h += `<div class="slots">${slot(bk('reflex'), tr('Рефлекс', 'Reflex', 'Phản xạ'), K.reflexOn ? 'on' : 'ok', K.reflex, '')}</div>`;
    if (el.innerHTML !== h) el.innerHTML = h;
  };
  const hf0 = helpFPS;
  helpFPS = function(c){
    const r = hf0.apply(this, arguments);
    if (!c || (c.cls !== 'drone' && c.cls !== 'tank')) return r;
    const add = c.cls === 'drone'
      ? [`<b>${bk('w1')}</b> ${tr('скан местности', 'terrain scan', 'quét địa hình', 'סריקת שטח')}`, `<b>${bk('rocket')}</b> ${tr('ракетный залп', 'rocket salvo', 'loạt tên lửa', 'מטח טילים')}`, `<b>${bk('grenade')}</b> ${tr('ремонт своих рядом', 'repair nearby allies', 'sửa quân ta gần đó', 'תיקון כוחות ידידותיים')}`]
      : [`<b>${bk('w1')}</b> ${tr('ремкомплект', 'repair kit', 'bộ sửa chữa', 'ערכת תיקון')}`];
    const L = r.split('<br>'), i = L.findIndex(s => s.startsWith(`<b>${bk('switch')}</b>`));
    L.splice(i >= 0 ? i : L.length, 0, ...add);
    return L.join('<br>');
  };
}
// ---------------------------------------------------------------- импульс скана: кольцо по земле и отметки врагов (в бою)
{
  const go0 = gunOverlay;
  gunOverlay = function(dt){
    const r = go0.apply(this, arguments);
    try { V69.overlay(); } catch (e){ if (!V69.errO){ V69.errO = 1; console.warn('v69 overlay', e); } }
    return r;
  };
}
V69.overlay = function(){
  if (S.attract || !S.cam || (typeof OPER !== 'undefined' && OPER.on)) return;
  octx.save();
  for (const p of this.pulses){
    const k = clamp(p.t / 1.2, 0, 1), a = (1 - k) * 0.85;
    if (a <= 0.01 || dist(p.pos, S.cam.pos) > 400) continue;
    octx.strokeStyle = p.team ? `rgba(255,90,70,${a.toFixed(3)})` : `rgba(120,255,170,${a.toFixed(3)})`;
    octx.lineWidth = 3 * (1 - k) + 1;
    const c = surfacePoint(norm(p.pos), 0.3);
    groundRing(c, V69_ABIL.dscan.r * (0.08 + 0.92 * Math.sqrt(k)), 48);
  }
  // в бою: враги, найденные сканом наших дронов
  if (S.mode === 'fps'){
    const sc = S.scans.filter(z => z.drone && z.team === 0);
    if (sc.length){
      octx.fillStyle = 'rgba(255,90,70,0.9)'; octx.strokeStyle = 'rgba(20,0,0,0.8)'; octx.lineWidth = 1;
      for (const L of [S.units, S.vehicles, S.drones]) for (const e of L){
        if (!e.alive || e.team !== 1 || !sc.some(z => dist2(z.pos, e.pos) < z.r * z.r)) continue;
        const s = project(add(e.pos, mul(e.up, e.cls === 'tank' ? 3.2 : 2.2))); if (!s) continue;
        const r = 5; octx.beginPath(); octx.moveTo(s[0], s[1] - r); octx.lineTo(s[0] + r, s[1]); octx.lineTo(s[0], s[1] + r); octx.lineTo(s[0] - r, s[1]); octx.closePath(); octx.fill(); octx.stroke();
      }
    }
  }
  octx.restore();
};
// ---------------------------------------------------------------- телефон: кнопки в контекстной зоне (v6.7)
if (typeof M67 !== 'undefined'){
  Object.assign(M67.DRN, { rocket: ['➶', 'Ракеты', 'Rockets', 'Tên lửa'], grenade: ['✚', 'Ремонт', 'Repair', 'Sửa'], d69scan: ['◎', 'Скан', 'Scan', 'Quét'] });
  Object.assign(M67.VEH, { v69rep: ['⚙', 'Ремкомплект', 'Repair kit', 'Sửa xe'] });
  Object.assign(M67.LAB, { d69scan: ['◎', 'Скан', 'Scan', 'Quét'], v69rep: ['⚙', 'Ремкомплект', 'Repair kit', 'Sửa xe'] });
  if (M67.HINT){
    M67.HINT.vdrone = ['Дрон: ⤒ / ⤓ — выше / ниже, ◎ «Скан», ➶ «Ракеты», ✚ «Ремонт», ➤ «Таран» — в точку прицела.', 'Drone: ⤒ / ⤓ — up / down, ◎ "Scan", ➶ "Rockets", ✚ "Repair", ➤ "Ram" your aim point.'];
    M67.HINT.vtank = ['Танк: 💥 «Залп», ☁ «Дым», ⏩ «Форсаж», ⚙ «Ремкомплект», ⏏ «Выйти».', 'Tank: 💥 "Barrage", ☁ "Smoke", ⏩ "Boost", ⚙ "Repair kit", ⏏ "Exit".'];
  }
  V69.mkBtn = function(box, key, fn){
    const b = document.createElement('button'); b.className = 'm69b'; b._m67home = box; b._m67k = key; b._m67txt = '';
    const dn = e => { e.preventDefault(); e.stopPropagation(); if (typeof AU !== 'undefined') AU.init(); b.classList.add('on'); fn(); };
    const up = e => { e.preventDefault(); e.stopPropagation(); b.classList.remove('on'); };
    b.addEventListener('touchstart', dn, { passive: false }); b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
    box.appendChild(b); return b;
  };
  const fl0 = M67.fpsLayout;
  M67.fpsLayout = function(){
    const r = fl0.apply(this, arguments);
    const box = $('touch') && $('touch').querySelector('.tf.fps');
    if (box && !V69.btn.scan){
      V69.btn.scan = V69.mkBtn(box, 'd69scan', () => V69.fpsUse('dscan'));
      V69.btn.rep = V69.mkBtn(box, 'v69rep', () => { const c = ctrlEntity(); const k = V69.fpsAbil(c, 'w1'); if (k) V69.fpsUse(k); });
    }
    if (r.ctx === 'drone') Object.assign(r.L, { rocket: 'E', grenade: 'G', d69scan: 'H' });
    else if (r.ctx === 'veh') r.L.v69rep = 'E';
    return r;
  };
  const st = document.createElement('style'); st.id = 'v69css';
  st.textContent = '#touch .m69b:not([data-s]){display:none!important} body:not(.m67) #touch .m69b{display:none!important}';
  document.head.appendChild(st);
}
// граната на кнопке: в дроне/технике подписи кнопки ставит раскладка v6.7 (не «G»)
if (typeof G62 !== 'undefined'){
  const tb0 = G62.touchBtn;
  G62.touchBtn = function(){ if (typeof M67 !== 'undefined' && M67.active && M67.active() && S.me && S.me.cls !== 'inf' && S.mode === 'fps') return; return tb0.apply(this, arguments); };
  // плоская «рука с гранатой» v6.2 больше не нужна, когда в кадре 3D-рука (v69_guns.js)
  const dh0 = G62.drawHand;
  G62.drawHand = function(){ if (typeof WPN69 !== 'undefined' && WPN69.ok() && !S.third && WPN69.drawnAt && performance.now() - WPN69.drawnAt < 200) return; return dh0.apply(this, arguments); };
}
// ---------------------------------------------------------------- режим разработчика: «Пополнить» снимает и перезарядку способностей
if (typeof DEV !== 'undefined'){
  const rf0 = DEV.refill;
  DEV.refill = function(){
    const r = rf0.apply(this, arguments);
    const c = ctrlEntity(); if (c && c.abil) c.abil = {};
    for (const g of selGroups ? selGroups() : []) if (g.abil) g.abil = {};
    return r;
  };
}
// ---------------------------------------------------------------- куратор: короткие подсказки про новые способности
if (typeof CUR_STEPS !== 'undefined'){
  const tp = () => TOUCH.on;
  const myDrones = () => S.drones.filter(d => d.alive && d.team === 0);
  const hurtVeh = () => S.vehicles.find(v => v.alive && v.team === 0 && v.hp < v.maxhp * 0.6);
  CUR_STEPS.push(
    { id: 'v69_drone', pri: 230, once: true, when: c => c.sel.some(g => g.cls === 'drone'),
      text: () => tp() ? tr('У дрона новые кнопки: ◎ «Скан» — видно врагов в тумане, ➶ «Ракеты» — по технике, ✚ «Ремонт» — чинит своих рядом, ✸ «Таран».', 'The drone has new buttons: ◎ "Scan" reveals enemies in the fog, ➶ "Rockets" hit vehicles, ✚ "Repair" fixes allies nearby, ✸ "Ram".', 'Drone có nút mới: ◎ “Quét” lộ địch trong sương mù, ➶ “Tên lửa” bắn xe, ✚ “Sửa chữa” sửa quân ta gần đó, ✸ “Đâm”.', 'לרחפן כפתורים חדשים: ◎ „סריקה" חושפת אויבים בערפל, ➶ „טילים" נגד רכבים, ✚ „תיקון" מתקן כוחות ידידותיים בקרבת מקום, ✸ „התנגשות".')
        : tr('Дрон теперь умеет больше: F — скан (видно врагов в тумане 10 с), G — ракетный залп по технике, T — ремонт своих роботов и техники рядом, R — таран.', 'The drone can do more now: F — scan (enemies in the fog revealed for 10 s), G — rocket salvo at vehicles, T — repair nearby robots and vehicles, R — ram.', 'Drone giờ làm được nhiều hơn: F — quét (lộ địch 10 giây), G — loạt tên lửa vào xe, T — sửa robot và xe gần đó, R — đâm.', 'הרחפן יודע יותר עכשיו: F — סריקה (אויבים בערפל נחשפים ל-10 שניות), G — מטח טילים נגד רכבים, T — תיקון רובוטים ורכבים בקרבת מקום, R — התנגשות.'),
      ui: ['#card [data-ux="abil:KeyF"]', '#card [data-ux="abil:KeyT"]'], done: (c, k) => CUR.since('abil') || S.rtime - k.t0 > 14 },
    { id: 'v69_medic', pri: 240, cool: 120, when: c => myDrones().length > 0 && !!hurtVeh() && !c.threat,
      text: () => tr(`Техника повреждена — дрон-медик починит её: выдели дрон, подведи к машине и нажми «✚ Ремонт»${tp() ? '' : ' (T)'}. У самой техники есть «⚙ Ремкомплект»${tp() ? '' : ' (T)'}.`, `A vehicle is damaged — a medic drone can fix it: select a drone, bring it close and press "✚ Repair"${tp() ? '' : ' (T)'}. Vehicles also have a "⚙ Repair kit"${tp() ? '' : ' (T)'}.`, `Xe bị hỏng — drone y tế sửa được: chọn drone, đưa lại gần và nhấn “✚ Sửa chữa”${tp() ? '' : ' (T)'}. Xe cũng có “⚙ Bộ sửa chữa”.`, `רכב פגוע — רחפן חובש יתקן אותו: בחר רחפן, קרב אותו ולחץ „✚ תיקון"${tp() ? '' : ' (T)'}. לרכבים יש גם „⚙ ערכת תיקון".`),
      world: () => { const v = hurtVeh(); return v ? { pos: v.pos, label: tr('ЧИНИТЬ', 'REPAIR', 'SỬA', 'לתקן'), col: '#8fffaa' } : null; },
      ui: ['#card [data-ux="abil:KeyT"]'], done: (c, k) => CUR.since('abil') || !hurtVeh() || S.rtime - k.t0 > 20 },
    { id: 'v69_scan', pri: 140, cool: 180, when: c => myDrones().length > 0 && !!c.cp && CUR.rtsT > 90,
      text: c => tr(`Не видно, кто у точки ${c.cp.name}? Отправь туда дрон и нажми «◎ Скан»${tp() ? '' : ' (F)'} — 10 с будут видны все враги вокруг.`, `Can't see who holds point ${c.cp.name}? Send a drone there and press "◎ Scan"${tp() ? '' : ' (F)'} — all enemies around are revealed for 10 s.`, `Không thấy ai giữ điểm ${c.cp.name}? Gửi drone tới và nhấn “◎ Quét”${tp() ? '' : ' (F)'}.`, `לא רואים מי מחזיק בנקודה ${c.cp.name}? שלח לשם רחפן ולחץ „◎ סריקה"${tp() ? '' : ' (F)'} — כל האויבים בסביבה ייחשפו ל-10 שניות.`),
      world: c => ({ pos: c.cp.pos, label: tr('СКАН', 'SCAN', 'QUÉT', 'סריקה') + ' ' + c.cp.name, col: '#8fffaa' }),
      ui: ['#card [data-ux="abil:KeyF"]'], done: (c, k) => CUR.since('abil', 'dscan') || S.rtime - k.t0 > 20 },
  );
}
