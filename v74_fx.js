// =====================================================================
//  v7.4 — идеи 21.10 02:16: взрывчатка (5), атмосфера — снег и клубы тумана (6), переговоры по рации (4)
// =====================================================================
Object.assign(BIND_DEF, { tnt: 'KeyJ' });
BIND_NAMES.tnt = ['Заложить взрывчатку (у здания врага)', 'Plant explosives (at an enemy building)', 'Đặt thuốc nổ (cạnh công trình địch)'];
if (SET_DEF.bind) SET_DEF.bind.tnt = 'KeyJ';
if (SET.bind && !SET.bind.tnt) SET.bind.tnt = 'KeyJ';
if (SET.atm74 === undefined) SET.atm74 = true;
// ---------------------------------------------------------------- 5. ВЗРЫВЧАТКА: здания автоматом не разбить — заложи заряд
const TNT74 = {
  n: 2, MAX: 2, refT: 0, list: [], hintT: -99,
  target(me){
    if (!me || me.cls !== 'inf' || !me.alive) return null;
    let best = null, bd = 1e9;
    const L = S.buildings.filter(b => b.alive && b.team === 1);
    if (S.hq[1] && S.hq[1].alive) L.push(S.hq[1]);
    for (const b of L){ const d = dist(b.pos, me.pos) - (b.cls === 'hq' ? 16 : (BTYPES[b.type] ? BTYPES[b.type].rad : 3)); if (d < 7 && d < bd){ bd = d; best = b; } }
    return best;
  },
  plant(){
    const me = S.me;
    if (S.mode !== 'fps' || S.attract) return false;
    const b = this.target(me);
    if (!b){ feed(tr('Взрывчатку закладывают вплотную к зданию врага', 'Explosives go right next to an enemy building', 'Đặt thuốc nổ sát công trình địch', 'חומר נפץ מניחים צמוד למבנה אויב'), '#f88'); emit('ui', { kind: 'deny' }); return true; }
    if (this.n <= 0){ feed(tr(`Зарядов нет — новый через ${Math.ceil(this.refT)} с`, `No charges — next in ${Math.ceil(this.refT)} s`, `Hết thuốc nổ — ${Math.ceil(this.refT)} giây`, `אין מטענים — עוד ${Math.ceil(this.refT)} ש׳`), '#f88'); emit('ui', { kind: 'deny' }); return true; }
    this.n--; if (this.refT <= 0) this.refT = 45;
    const p = add(me.pos, mul(norm(sub(b.pos, me.pos)), 0.8));
    this.list.push({ p: surfacePoint(norm(p), 0.3), t: 5, b, src: me, blink: 0 });
    feed(tr(`Заряд заложен — 5 с, отходи! (осталось ${this.n})`, `Charge planted — 5 s, get clear! (${this.n} left)`, `Đã đặt — 5 giây, tránh xa! (còn ${this.n})`, `מטען הונח — 5 ש׳, להתרחק! (נשארו ${this.n})`), '#ffb347');
    emit('ui', { kind: 'ok' }); HINTS.used('tnt');
    return true;
  },
  step(dt){
    if (this.n < this.MAX){ this.refT -= dt; if (this.refT <= 0){ this.n++; this.refT = this.n < this.MAX ? 45 : 0; } }
    for (const c of this.list){
      c.t -= dt; c.blink -= dt;
      if (c.blink <= 0){ c.blink = c.t > 2 ? 0.5 : 0.18; addLight(c.p, [6, 0.6, 0.3], 5, 0.12, 0.02); if (typeof AU !== 'undefined' && AU.ready && AU.ready()) try { AU.osc(AU.sfx, AU.ctx.currentTime, 0.05, 'square', 2200, 2200, 0.03); } catch (e){} }
      if (c.t <= 0){ c.done = true; fxExplosion(c.p, 5); splash(c.p, 0, 1500, 11, c.src, 'x'); if (typeof shake === 'function') try { shake(0.6); } catch (e){} }
    }
    this.list = this.list.filter(c => !c.done);
    // подсказка у здания врага
    const me = S.me;
    if (S.mode === 'fps' && me && this.n > 0 && S.rtime - this.hintT > 40 && this.target(me)){ this.hintT = S.rtime; HINTS.show('tnt', tr(`Здание врага рядом — ${TOUCH.on ? '💣 справа' : bk('tnt')}: заложить взрывчатку (${this.n})`, `Enemy building close — ${TOUCH.on ? '💣 on the right' : bk('tnt')}: plant explosives (${this.n})`, `Công trình địch gần — ${TOUCH.on ? '💣' : bk('tnt')}: đặt thuốc nổ`, `מבנה אויב קרוב — ${TOUCH.on ? '💣' : bk('tnt')}: להניח חומר נפץ`), [], 'tnt'); }
  },
  reset(){ this.n = this.MAX; this.refT = 0; this.list = []; },
};
// клавиша (J — бывший «один без отряда»): перехватываем раньше MISSION.key, где J был занят
{ const tk = e => !!(SET.bind && e.code === SET.bind.tnt && S.mode === 'fps' && !S.over && !S.attract && !MENU.isOpen() && TNT74.plant());
  if (typeof MISSION !== 'undefined' && MISSION.key){ const k0 = MISSION.key.bind(MISSION); MISSION.key = function(e){ return tk(e) || k0(e); }; }
  else { const k0 = FPS61.key.bind(FPS61); FPS61.key = function(e){ return tk(e) || k0(e); }; } }
// ---------------------------------------------------------------- 6. АТМОСФЕРА: лёгкий снег и клубы тумана у земли (наложение, дёшево)
const ATM74 = {
  fl: [], puffs: [], pf: null, seed: 1,
  rnd(){ this.seed = (this.seed * 16807) % 2147483647; return (this.seed - 1) / 2147483646; },   // свой ГСЧ — бой не сдвигается
  on(){ return SET.atm74 !== false && !(typeof LITE73 !== 'undefined' && LITE73.on) && S.mode === 'fps' && !S.attract && !MENU.isOpen(); },
  init(W, H){
    this.fl = []; this.puffs = [];
    const n = TOUCH.on ? 70 : 140;
    for (let i = 0; i < n; i++) this.fl.push({ x: this.rnd() * W, y: this.rnd() * H, z: 0.25 + this.rnd() * 0.75, ph: this.rnd() * 6.28 });
    for (let i = 0; i < 7; i++) this.puffs.push({ x: this.rnd() * W * 1.4 - W * 0.2, y: H * (0.5 + this.rnd() * 0.28), r: 90 + this.rnd() * 160, a: 0.05 + this.rnd() * 0.05, v: 4 + this.rnd() * 8 });
    this.W = W; this.H = H;
  },
  draw(dt){
    if (!this.on()) { this.pf = null; return; }
    const c = S.cam; if (!c || underground(c.pos)) return;
    const W = innerWidth, H = innerHeight, g = octx;
    if (this.W !== W || this.H !== H || !this.fl.length) this.init(W, H);
    // поворот камеры → сдвиг снежинок (ближние сдвигаются сильнее) — снег «в мире», а не на стекле
    let dx = 0, dy = 0;
    if (this.pf){ const f = c.fwd, p = this.pf, up = c.up || norm(c.pos); dx = -dot(cross(p, f), up) * W * 0.9; dy = dot(sub(f, p), up) * H * 1.1; }
    this.pf = c.fwd.slice();
    if (abs(dx) > W * 0.5 || abs(dy) > H * 0.5){ dx = 0; dy = 0; }
    const t = S.rtime || 0, sl = 1 - 0.7 * (S.slow || 0);
    g.save();
    // клубы тумана у горизонта
    for (const q of this.puffs){
      q.x += (q.v * dt * sl + dx * 0.35); if (q.x - q.r > W) q.x = -q.r; if (q.x + q.r < 0) q.x = W + q.r;
      const y = q.y + dy * 0.35, gr = g.createRadialGradient(q.x, y, 0, q.x, y, q.r);
      gr.addColorStop(0, `rgba(196,204,214,${q.a})`); gr.addColorStop(1, 'rgba(196,204,214,0)');
      g.fillStyle = gr; g.fillRect(q.x - q.r, y - q.r, q.r * 2, q.r * 2);
    }
    // снег
    g.fillStyle = 'rgba(235,240,248,.75)';
    for (const f of this.fl){
      f.y += (18 + 40 * f.z) * dt * sl + dy * f.z; f.x += (sin(t * 0.7 + f.ph) * 8 * f.z + 6) * dt * sl + dx * f.z;
      if (f.y > H + 4){ f.y = -4; f.x = this.rnd() * W; } if (f.y < -6) f.y = H + 3;
      if (f.x > W + 4) f.x = -4; if (f.x < -6) f.x = W + 3;
      const s = 0.9 + 2.2 * f.z;
      g.globalAlpha = 0.25 + 0.5 * f.z;
      g.fillRect(f.x, f.y, s, s);
    }
    g.restore();
  },
};
{ const go0 = gunOverlay; gunOverlay = function(dt){ try { ATM74.draw(min(0.05, dt || 0.016)); } catch (e){ if (!ATM74.err){ ATM74.err = 1; console.warn('atm74', e); } } return go0.apply(this, arguments); }; }
// ---------------------------------------------------------------- 4. ПЕРЕГОВОРЫ ПО РАЦИИ: отряды говорят между собой, отряд игрока отвечает стратегу
const CHAT74 = {
  t: 18,
  sub(g, delay){
    setTimeout(() => { try { if (VOICE66.lastText) feed(`≋ ${groupLabel(g)}: «${VOICE66.lastText}»`, '#b9d6ff'); } catch (e){} }, delay || 350);
  },
  step(dt){
    if (S.attract || S.over || S.mode !== 'fps' || SET.chatter === false || SET.unitVoice === false || typeof VOICE66 === 'undefined') return;
    this.t -= dt; if (this.t > 0) return;
    this.t = 22 + random() * 20;
    const me = ctrlEntity(), mine = me && me.squad;
    const L = groupsOf(0).filter(g => groupAlive(g) && g !== mine && g.cls !== 'builder');
    if (!L.length) return;
    // в бою — чаще говорят те, кто воюет
    const hot = L.filter(g => groupUnits(g).some(u => S.time - (u.lastHurt || -99) < 6));
    const g = (hot.length ? hot : L)[floor(random() * (hot.length ? hot.length : L.length))];
    if (VOICE66.say(g, random() < 0.6 ? 'ord' : 'sel')) this.sub(g);
  },
};
// стратег отдаёт приказ отряду игрока — командир отряда отвечает по рации
{ const b0 = TACT.begin.bind(TACT);
  TACT.begin = function(cand, g){
    const r = b0.apply(this, arguments);
    try { if (!S.attract && S.mode === 'fps' && g && g.team === 0 && SET.unitVoice !== false && this.task && this.task.g === g && this.task.kind === 'strat') setTimeout(() => { try { if (VOICE66.say(g, 'ord')) CHAT74.sub(g); } catch (e){} }, 2600); } catch (e){}
    return r;
  }; }
{ const up0 = update; update = function(rdt){ up0(rdt); try { if (!S.paused){ TNT74.step(rdt); CHAT74.step(rdt); } } catch (e){ if (!TNT74.err){ TNT74.err = 1; console.warn('fx74', e); } } }; }
{ const ng0 = MENU.newGame; MENU.newGame = function(){ const r = ng0.apply(this, arguments); try { TNT74.reset(); CHAT74.t = 25; } catch (e){} return r; }; }
// настройки: «Снег и туман» (ПК — графика; телефон — экран графики)
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){ const h = hs0.apply(this, arguments); return h.replace(/(<button class="tog[^"]*" data-tog="lite">[^<]*<\/button><\/div>)/, '$1' + V74.togBtn('atm74', tr('Снег и клубы тумана (шутер)', 'Snow and mist (shooter)', 'Tuyết và sương (bắn súng)', 'שלג וערפל (יריות)'), false)); }; }
if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_gfx') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + V74.togBtn('atm74', tr('Снег и туман', 'Snow and mist', 'Tuyết và sương', 'שלג וערפל'), true)); return h; }; }
