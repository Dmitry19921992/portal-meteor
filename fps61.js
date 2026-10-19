// =====================================================================
//  v6.1 (ветка v61fps): выход из ядра, класс для вселения (как в Battlefield),
//  техника от первого лица, сброс временных эффектов, помощь в прицеливании.
//  Прокачка (карьера, мастерство, медали, контракты) — career.js.
// =====================================================================
Object.assign(BIND_DEF, { prefCls: 'KeyU' });
BIND_NAMES.prefCls = ['Класс для вселения (сменить)', 'Preferred class (cycle)', 'Lớp ưu tiên (đổi)'];
if (SET_DEF.bind) SET_DEF.bind.prefCls = 'KeyU';
if (SET.bind && !SET.bind.prefCls) SET.bind.prefCls = 'KeyU';
if (SET_DEF.prefCls === undefined) Object.assign(SET_DEF, { prefCls: 'any', aimAssist: -1, vehView: 'fp' });
for (const k of ['prefCls', 'aimAssist', 'vehView']) if (SET[k] === undefined) SET[k] = SET_DEF[k];

const PREFS = ['any', 'assault', 'heavy', 'rocket', 'sniper', 'medic', 'scout', 'veh'];
const FPS61 = {
  last: null, card: null, missT: -99, btn: null, coreAx: null, evacT: -99,
  // ---------------------------------------------------------------- класс
  prefName(k){
    if (k === 'any' || !k) return tr('Любой', 'Any', 'Bất kỳ');
    if (k === 'veh') return tr('Техника', 'Vehicle', 'Xe');
    return N2(ROLES[k].n);
  },
  prefIcon(k){ return k === 'any' ? '✱' : k === 'veh' ? '■' : ROLES[k].icon; },
  bodyName(u){ return !u ? '—' : u.cls === 'inf' ? N2(roleOf(u).n) : u.cls === 'tank' ? (u.vk ? V2.name(u) : tankName(u.team)) : u.cls === 'drone' ? tr('Дрон', 'Drone', 'Drone') : bname(u.type); },
  matches(u, pref){ return pref === 'veh' ? u.cls === 'tank' : u.cls === 'inf' && u.role === pref; },
  // кого брать: свой класс (ближе к бою), иначе ближайший к бою
  pick(){
    const pref = SET.prefCls || 'any', near = nearestToAction(0);
    if (pref === 'any') return { u: near };
    let best = null, bd = 1e9;
    const L = pref === 'veh' ? S.vehicles : S.units;
    for (const u of L){
      if (!u.alive || u.team !== 0 || u.parked || u === S.me || !this.matches(u, pref)) continue;
      const d = actionDist(u, 0); if (d < bd){ bd = d; best = u; }
    }
    return best ? { u: best, pref: true } : { u: near, miss: pref };
  },
  pickAuto(){
    const p = this.pick();
    if (p.miss && p.u) this.missHint(p.miss, p.u);
    return p.u;
  },
  inSquad(sq){
    const pref = SET.prefCls;
    if (!pref || pref === 'any' || pref === 'veh') return null;
    return sq.units.filter(u => u.alive && !u.parked && u.role === pref).sort((a, b) => actionDist(a, 0) - actionDist(b, 0))[0] || null;
  },
  missHint(pref, u){
    if (S.rtime - this.missT < 3) return;
    this.missT = S.rtime;
    const t = tr(`Нет свободного: ${this.prefName(pref)} — вселился в: ${this.bodyName(u)}`, `No free ${this.prefName(pref)} — possessed ${this.bodyName(u)}`, `Không còn ${this.prefName(pref)} — nhập vào ${this.bodyName(u)}`);
    feed(t, '#ffd27a');
    this.pendMiss = t;
    if (this.card && S.rtime - this.card.t < 5) this.card.miss = t;
  },
  sortCands(L){
    const pref = SET.prefCls;
    if (!pref || pref === 'any') return L;
    for (const o of L){
      if (o.kind === 'inf' && pref !== 'veh'){ const m = o.e.squad ? this.inSquad(o.e.squad) : null; if (m){ o.e = m; o.pref = true; o.label += ' · ' + ROLES[pref].icon; } }
      else if (pref === 'veh' && o.kind === 'tank') o.pref = true;
    }
    L.sort((a, b) => (b.pref ? 1 : 0) - (a.pref ? 1 : 0) || a.d - b.d);
    return L;
  },
  setPref(k, now){
    if (!PREFS.includes(k)) return;
    SET.prefCls = k; MENU.save();
    feed(tr('Класс для вселения: ', 'Preferred class: ', 'Lớp ưu tiên: ') + this.prefIcon(k) + ' ' + this.prefName(k), '#9cf');
    if (now && k !== 'any' && !S.attract && S.mode === 'fps'){
      const c = ctrlEntity();
      if (c && this.matches(c, k)) return;
      const p = this.pick();
      if (p.pref && p.u){ takeControl(p.u); S.flashT = 0.15; }
      else if (p.miss) this.missHint(k, c || p.u);
    }
  },
  cyclePref(){ const i = PREFS.indexOf(SET.prefCls || 'any'); this.setPref(PREFS[(i + 1) % PREFS.length], false); this.card = { t: S.rtime, died: false }; },
  prefRow(){
    return `<div class="row prefrow"><label>${tr('Класс для вселения', 'Preferred class', 'Lớp ưu tiên')} <small>(${bk('prefCls')})</small></label><span class="chs">` +
      PREFS.map(k => `<button class="${(SET.prefCls || 'any') === k ? 'cur' : ''}" data-ch="prefCls" data-v="${k}" title="${this.prefName(k)}">${this.prefIcon(k)} ${this.prefName(k)}</button>`).join('') + '</span></div>';
  },
  // ---------------------------------------------------------------- вселение и сброс эффектов
  onPossess(u){
    const prev = this.last;
    const died = !!(prev && !prev.alive && prev.cls !== 'bld');
    this.resetFx(died ? 'death' : 'possess');
    if (died && !S.attract){
      this.card = { t: S.rtime, died: true, miss: this.pendMiss || null };
      if (typeof CAREER !== 'undefined') CAREER.onDeath();
    }
    this.last = u; this.pendMiss = null;
  },
  // все временные эффекты игрока: рефлекс (замедление), прицел, присед/подкат, отдача, вспышки, «вид сверху» артиллерии
  resetFx(why){
    const K = S.kit;
    if (K){
      if (K.reflexOn){ K.reflexOn = false; emit('slowoff', {}); }
      K.charge = 0; K.spin = 0; K.trig = false; K.kick = 0; K.kickY = 0; K.bloom = 0; K.dry = 0;
    }
    S.slow = 0; S.aiming = false; S.aimK = 0; S.recoil = 0; S.muzzle = 0; S.dmgT = 0; S.dmgDir = null; S.healGlow = 0; S.hitT = 0;
    if (why !== 'possess') S.shake = 0;
    if (typeof GUNS !== 'undefined'){ GUNS.crouchK = 0; GUNS.fb.t = 0; GUNS.fb.head = 0; }
    if (typeof PK !== 'undefined' && PK.slideT) PK.slideT = 0;
    if (TOUCH.on && TOUCH.aimOn){ TOUCH.aimOn = false; mouseR = false; document.querySelectorAll('#touch .adsb').forEach(b => b.classList.remove('on')); }
    for (const v of S.vehicles){ if (v.hiCam && v !== ctrlEntity()){ v.hiCam = false; v.hiK = 0; } }
    if (typeof AIMA !== 'undefined') AIMA.reset();
    if (typeof AU !== 'undefined' && AU.ready && AU.ready() && AU.slowF) try { AU.slowF.frequency.setTargetAtTime(20000, AU.ctx.currentTime, 0.05); } catch (e){}
    this.lastReset = why;
  },
  // ---------------------------------------------------------------- шаг
  step(dt, rdt){
    if (S.attract) return;
    const c = ctrlEntity();
    if (c !== this.last && c){ /* вселение мимо takeControl (загрузка) */ this.onPossess(c); }
    if (typeof AIMA !== 'undefined') AIMA.step(rdt);
    if (typeof CAREER !== 'undefined') CAREER.step(rdt);
    if (TOUCH.on && !this.btn) this.touchBtn();
  },
  key(e){
    if (S.mode !== 'fps' || S.over || S.attract) return false;
    if (this.card && S.rtime - this.card.t < 5 && /^Digit[1-8]$/.test(e.code)){ this.setPref(PREFS[+e.code.slice(5) - 1], true); this.card.t = S.rtime - 3.5; return true; }
    const act = actOf(e.code);
    if (act === 'prefCls'){ this.cyclePref(); return true; }
    if (act === 'third'){
      const c = ctrlEntity();
      if (c && (c.cls === 'tank' || c.cls === 'drone')){
        SET.vehView = SET.vehView === 'tp' ? 'fp' : 'tp'; MENU.save();
        feed(SET.vehView === 'fp' ? tr('Техника: вид из кабины (V)', 'Vehicle: cockpit view (V)', 'Xe: góc nhìn buồng lái (V)') : tr('Техника: вид от 3-го лица (V)', 'Vehicle: third-person view (V)', 'Xe: góc nhìn thứ ba (V)'), '#9cf');
        return true;
      }
    }
    return false;
  },
  touchBtn(){
    const host = document.querySelector('#touch .tf.fps'); if (!host) return;
    const b = document.createElement('button'); b.textContent = 'V'; b.className = 'v61v';
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); const c = ctrlEntity(); if (c && (c.cls === 'tank' || c.cls === 'drone')) this.key({ code: SET.bind.third }); else { S.third = !S.third; } }, { passive: false });
    host.appendChild(b); this.btn = b;
  },
  // ---------------------------------------------------------------- техника от первого лица
  vehFP(c){
    if (!c || S.mode !== 'fps' || S.attract || SET.vehView === 'tp') return false;
    if (c.cls === 'drone') return true;
    if (c.cls !== 'tank') return false;
    return !(c.vk && (c.hiCam || (c.hiK || 0) > 0.02));   // «вид сверху» артиллерии (ПКМ) — снаружи
  },
  EYE: { tank: [2.15, 0.6], raider: [1.45, 0.4], mlrs: [2.3, 0.9], mortar: [2.2, 0.8], cat: [2.0, 0.6] },
  vehCam(c, dt){
    if (c.cls === 'drone'){
      const pos = add(c.pos, mul(c.aim, 0.75));
      return Object.assign({ pos }, camBasis(c.aim, c.up));
    }
    const E = this.EYE[c.vk || 'tank'] || this.EYE.tank;
    const af = tangent(c.aim, c.up);
    // люк/прицел: над башней, чуть вперёд; лёгкое покачивание от хода
    const bob = c.grounded ? sin((c.phase || 0) * 2) * 0.03 * min(1, len(c.vel) / 6) : 0;
    const pos = add(add(c.pos, mul(c.up, E[0] + bob)), mul(af, E[1]));
    return Object.assign({ pos }, camBasis(c.aim, c.up));
  },
  // ---------------------------------------------------------------- ядро и шахты: выход
  exitAxis(u){
    const r = len(u.pos);
    if (r > CORE_R - 2) return bestAxis(norm(u.pos));
    // в ядре: шахта, на которую смотрим (держим выбор, пока не отвернулись сильно)
    const look = S.cam ? S.cam.fwd : u.fwd;
    const b = bestAxis(look);
    if (!this.coreAx || dot(look, this.coreAx) < dot(look, b) - 0.25) this.coreAx = b;
    return this.coreAx;
  },
  coreInput(u, inp, dt){
    if (CAMFX.busy()) return;
    const r = len(u.pos), Up = norm(u.pos);
    const shaft = inShaft(u.pos);
    if (!shaft && !underground(u.pos)) return;
    // у устья (поднимаемся) — прыжок вбок по взгляду, чтобы не упасть обратно в шахту
    if (shaft && r > RM - 40){
      const ax = bestAxis(Up), rim = this.rimR(ax);
      if (r > rim + 0.6 && dot(u.vel, Up) > 1 && !(u.exitHop > S.time - 3)){
        let f = tangent(u.fwd, Up); if (len(f) < 0.2) f = anyTangent(Up);
        u.vel = add(mul(Up, 7), mul(norm(f), 10)); u.exitHop = S.time;
        return;
      }
    }
    if (inp.thrust && !inp.brake) inp.lift = true;   // ранец под землёй тоже работает как лифт
    if (!inp.lift) return;
    if (r < CORE_R + 2 && !shaft){
      // ядро: держим пробел — летим к устью выбранной шахты
      const ax = this.exitAxis(u), tgt = mul(ax, CORE_R + 10);
      const d = sub(tgt, u.pos), L = len(d);
      const want = mul(d, min(18, 3 + L * 0.6) / max(L, 0.01));
      u.vel = add(u.vel, mul(sub(want, u.vel), 1 - Math.exp(-dt * 2.5)));
      return;
    }
    if (shaft){
      // шахта: скоростной лифт (≈30 м/с), у поверхности притормаживаем и выносим вбок от устья
      const ax = bestAxis(Up);
      const near = r > RM - 55;
      inp.liftV = near ? 13 : 38; inp.liftA = near ? 5 : 18;
      const vr = dot(u.vel, Up);
      if (near && vr > 15) u.vel = sub(u.vel, mul(Up, (vr - 15) * min(1, dt * 3)));
      const off = sub(u.pos, mul(ax, dot(u.pos, ax)));
      if (len(off) > 2 && !near){ const k = 1 - Math.exp(-dt * 2); u.vel = sub(u.vel, mul(off, k * 0.8)); }
    }
  },
  // высота края устья шахты (максимум рельефа по кругу в 9 м от оси)
  rimR(ax){
    const k = ax.join(','); this._rim = this._rim || {};
    if (this._rim[k] === undefined){
      const t1 = anyTangent(ax), t2 = cross(ax, t1); let m = 0;
      for (let i = 0; i < 12; i++){ const a = i / 12 * PI * 2; m = max(m, groundR(norm(add(mul(ax, RM), add(mul(t1, 9 * cos(a)), mul(t2, 9 * sin(a))))))); }
      this._rim[k] = min(m, RM + 5);
    }
    return this._rim[k];
  },
  // B под землёй — капсула на поверхность (без перезарядки — это эвакуация)
  coreEvac(hot){
    const c = ctrlEntity();
    if (hot || !c || c.cls !== 'inf' || !underground(c.pos) || typeof MISSION === 'undefined') return false;
    let tp = MISSION.trackTarget();
    if (!tp || len(tp) < 80 || surfDist(c.pos, tp) < 70){
      const ax = len(c.pos) < CORE_R ? this.exitAxis(c) : bestAxis(norm(c.pos));
      tp = surfacePoint(norm(add(ax, mul(anyTangent(ax), 0.16))), 0.3);
    }
    const ready = MISSION.podReadyT;
    MISSION.podDrop(c, tp);
    MISSION.podReadyT = max(ready, S.time + 20);
    this.evacT = S.rtime;
    feed(tr('Эвакуация из-под земли: капсула выносит на поверхность', 'Underground evac: the pod lifts you to the surface', 'Sơ tán: khoang đưa bạn lên mặt đất'), '#8fffaa');
    return true;
  },
  coreHintText(){
    const c = ctrlEntity();
    if (!c || c.cls !== 'inf' || !underground(c.pos)) return null;
    const r = len(c.pos), inCore = r < CORE_R + 2 && !inShaft(c.pos);
    const sp = bk('jump'), b = bk('redeploy');
    if (inCore) return tr(`ВЫХОД ИЗ ЯДРА: держи ${sp} — к шахте и лифтом наверх ↑ · ${b} — капсула на поверхность`, `EXIT THE CORE: hold ${sp} — to the shaft and lift up ↑ · ${b} — pod to the surface`, `RA KHỎI LÕI: giữ ${sp} — tới giếng và thang lên ↑ · ${b} — khoang lên mặt đất`);
    return tr(`ШАХТА: держи ${sp} — лифт наверх ↑ ${Math.max(0, Math.round(RM - r))} м · ${b} — капсула`, `SHAFT: hold ${sp} — lift up ↑ ${Math.max(0, Math.round(RM - r))} m · ${b} — pod`, `GIẾNG: giữ ${sp} — thang lên ↑ ${Math.max(0, Math.round(RM - r))} m · ${b} — khoang`);
  },
  // ---------------------------------------------------------------- рисование поверх HUD
  overlay(dt){
    if (S.attract || S.mode !== 'fps' || !S.cam || OPER.on || MENU.isOpen()) return;
    const g = octx, W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2, c = ctrlEntity();
    if (c && !CAMFX.busy() && this.vehFP(c)) this.drawSight(g, c, W, H, cx, cy);
    // подсказка выхода из ядра / шахты
    const ht = this.coreHintText();
    if (ht){
      g.save(); g.textAlign = 'center';
      const fs = Math.round(clamp(H * 0.026, 13, 19));
      g.font = `700 ${fs}px "Exo 2", Consolas, sans-serif`;
      const w = g.measureText(ht).width + 28, y = H * 0.7;
      g.fillStyle = 'rgba(10,14,18,.72)'; g.fillRect(cx - w / 2, y - fs - 6, w, fs + 16);
      g.strokeStyle = 'rgba(140,255,170,.7)'; g.lineWidth = 1.5; g.strokeRect(cx - w / 2, y - fs - 6, w, fs + 16);
      g.fillStyle = '#8fffaa'; g.fillText(ht, cx, y);
      g.restore();
      if (len(c.pos) < CORE_R + 2 && !inShaft(c.pos)){
        const ax = this.exitAxis(c), mouth = mul(ax, CORE_R);
        if (typeof edgeMarker === 'function') edgeMarker(mouth, '#8fffaa', tr('ВЫХОД ↑ ШАХТА', 'EXIT ↑ SHAFT', 'LỐI RA ↑ GIẾNG'), `${Math.round(dist(mouth, c.pos))} ${tr('м', 'm', 'm')}`);
      }
    }
    this.drawCard(g, W, H, cx);
    if (typeof CAREER !== 'undefined') CAREER.drawBanner(g, W, H, cx);
  },
  drawSight(g, c, W, H, cx, cy){
    g.save();
    const drone = c.cls === 'drone';
    // рамка смотровой щели / камеры
    const R = Math.hypot(W, H) * 0.5;
    const grd = g.createRadialGradient(cx, cy, min(W, H) * (drone ? 0.42 : 0.36), cx, cy, R);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, drone ? 'rgba(0,10,20,.55)' : 'rgba(6,6,4,.82)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = drone ? 'rgba(150,230,255,.55)' : 'rgba(255,210,120,.55)'; g.lineWidth = 1.2;
    if (!drone){
      // шкала дальности и поправок
      for (let i = 1; i <= 5; i++){ const y = cy + i * H * 0.035; g.beginPath(); g.moveTo(cx - 10 + i, y); g.lineTo(cx + 10 - i, y); g.stroke(); }
      g.beginPath(); g.moveTo(cx - W * 0.16, cy); g.lineTo(cx - 26, cy); g.moveTo(cx + 26, cy); g.lineTo(cx + W * 0.16, cy); g.stroke();
      for (let i = -4; i <= 4; i++){ if (!i) continue; const x = cx + i * W * 0.035; g.beginPath(); g.moveTo(x, cy - 4); g.lineTo(x, cy + 4); g.stroke(); }
    } else {
      const s = min(W, H) * 0.3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]){ g.beginPath(); g.moveTo(cx + sx * s, cy + sy * s * 0.6); g.lineTo(cx + sx * s * 0.8, cy + sy * s * 0.6); g.moveTo(cx + sx * s, cy + sy * s * 0.6); g.lineTo(cx + sx * s, cy + sy * s * 0.45); g.stroke(); }
    }
    g.font = '600 11px "Exo 2", Consolas, sans-serif'; g.textAlign = 'left'; g.fillStyle = drone ? 'rgba(150,230,255,.8)' : 'rgba(255,210,120,.8)';
    const hdg = Math.round((Math.atan2(c.aim[0], c.aim[2]) * 180 / PI + 360) % 360);
    g.fillText(`${this.bodyName(c).toUpperCase()} · ${tr('КУРС', 'HDG', 'HƯỚNG')} ${hdg}° · ${Math.round(len(c.vel) * 3.6)} ${tr('км/ч', 'km/h', 'km/h')}`, cx - W * 0.16, cy - H * 0.3);
    g.textAlign = 'right'; g.fillText(`${bk('third')} — ${tr('вид снаружи', 'outside view', 'nhìn ngoài')}`, cx + W * 0.16, cy - H * 0.3);
    g.restore();
  },
  // карточка после гибели: класс для следующего вселения (цифры / тап)
  drawCard(g, W, H, cx){
    let el = document.getElementById('dcard');
    const on = this.card && S.rtime - this.card.t < 5 && S.mode === 'fps' && !S.over;
    if (!on){ if (el && el.style.display !== 'none') el.style.display = 'none'; return; }
    if (!el){
      el = document.createElement('div'); el.id = 'dcard'; document.body.appendChild(el);
      el.addEventListener('click', e => { const b = e.target.closest('[data-pref]'); if (b){ e.stopPropagation(); this.setPref(b.dataset.pref, true); this.card.t = S.rtime - 3.5; } });
      el.addEventListener('touchstart', e => { const b = e.target.closest('[data-pref]'); if (b){ e.preventDefault(); e.stopPropagation(); this.setPref(b.dataset.pref, true); this.card.t = S.rtime - 3.5; } }, { passive: false });
      const st = document.createElement('style');
      st.textContent = `#dcard{position:fixed;left:50%;top:max(104px,19%);transform:translateX(-50%);z-index:30;background:rgba(10,12,14,.8);border:1px solid rgba(232,220,184,.3);padding:6px 10px;color:#e8dcb8;font:600 12px "Exo 2",Consolas,sans-serif;text-align:center;pointer-events:auto;max-width:min(94vw,760px)}
#dcard h5{margin:0 0 5px;font-size:13px;color:#ff8a70;letter-spacing:.05em}#dcard .pl{display:flex;flex-wrap:wrap;gap:3px;justify-content:center}
#dcard button{background:rgba(232,220,184,.08);border:1px solid rgba(232,220,184,.3);color:#e8dcb8;font:600 11px "Exo 2",sans-serif;padding:3px 6px;cursor:pointer}#dcard button.cur{background:rgba(140,255,170,.2);border-color:#8fffaa;color:#8fffaa}
#dcard kbd{opacity:.6;margin-right:3px}#dcard em{display:block;font-style:normal;color:#ffd27a;margin-top:5px}#dcard small{opacity:.65}
body.touch #dcard button{padding:8px 9px;font-size:13px}#touch .v61v{font-weight:700}`;
      document.head.appendChild(st);
    }
    const k = this.card.died ? 'd' : 'c', key = k + (SET.prefCls || 'any') + (this.card.miss || '') + LANG.cur;
    if (el._k !== key){
      el._k = key;
      el.innerHTML = `<h5>${this.card.died ? tr('✖ РОБОТ УНИЧТОЖЕН — СИГНАЛ ПЕРЕДАН', '✖ ROBOT DESTROYED — SIGNAL TRANSFERRED', '✖ ROBOT BỊ HẠ — ĐÃ CHUYỂN TÍN HIỆU') : tr('КЛАСС ДЛЯ ВСЕЛЕНИЯ', 'PREFERRED CLASS', 'LỚP ƯU TIÊN')}</h5>` +
        `<div class="pl">${PREFS.map((p, i) => `<button data-pref="${p}" class="${(SET.prefCls || 'any') === p ? 'cur' : ''}"><kbd>${i + 1}</kbd>${this.prefIcon(p)} ${this.prefName(p)}</button>`).join('')}</div>` +
        (this.card.miss ? `<em>${this.card.miss}</em>` : '') + `<small>${TOUCH.on ? tr('тап — выбрать', 'tap to choose', 'chạm để chọn') : tr('цифры 1–8 — выбрать', 'keys 1–8 to choose', 'phím 1–8 để chọn')} · ${bk('prefCls')} — ${tr('сменить в бою', 'cycle in battle', 'đổi trong trận')}</small>`;
    }
    el.style.display = 'block';
    el.style.opacity = String(clamp(5 - (S.rtime - this.card.t), 0, 1));
  },
  // ---------------------------------------------------------------- меню
  settingsRows(row, ch){
    if (SET.aimAssist === undefined || SET.aimAssist === null || SET.aimAssist < 0) SET.aimAssist = AIMA.lvl();
    return `<h4>${tr('Шутер v6.1', 'Shooter v6.1', 'Bắn súng v6.1')}</h4>` +
      row(tr('Помощь в прицеливании', 'Aim assist', 'Hỗ trợ ngắm'), ch('aimAssist', [[0, tr('выкл', 'off', 'tắt')], [1, tr('слабая', 'weak', 'yếu')], [2, tr('средняя', 'medium', 'vừa')], [3, tr('сильная', 'strong', 'mạnh')]])) +
      row(tr('Техника: вид', 'Vehicles: view', 'Xe: góc nhìn'), ch('vehView', [['fp', tr('из кабины', 'cockpit', 'buồng lái')], ['tp', tr('3-е лицо', '3rd person', 'ngôi thứ ba')]])) +
      this.prefRow();
  },
  pauseRows(){ return this.prefRow() + MENU.btn('career', tr('Карьера: прогресс, медали, обвесы', 'Career: progress, medals, attachments', 'Sự nghiệp: tiến độ, huy chương, phụ kiện')); },
  wireMenu(name){
    const b = $('m_career'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); MENU.show('career', true); };
    if (typeof CAREER !== 'undefined') CAREER.wire(name);
  },
};

// =====================================================================
//  ПОМОЩЬ В ПРИЦЕЛИВАНИИ (как на консолях): «трение» у цели, слабое
//  притяжение при стрельбе/прицеливании, магнетизм пуль. Не аимбот:
//  работает только в малом конусе и только пока игрок сам ведёт прицел.
// =====================================================================
const AIMA = {
  sens: 1, tgt: null, ang: 0, wasAim: false, holdT: 0,
  lvl(){ const v = SET.aimAssist; return v === undefined || v === null || v < 0 ? (TOUCH.on ? 3 : 2) : v | 0; },
  K(){ return [0, 0.45, 0.75, 1][this.lvl()] || 0; },
  reset(){ this.sens = 1; this.tgt = null; this.wasAim = false; this.holdT = 0; },
  // лучшая цель у перекрестия: угол до края хитбокса
  scan(eye, fwd, team, cone, maxD){
    let best = null, bs = 1e9, bAng = 0, bRad = 0;
    for (const e of TGT[team]){
      if (!e.alive || e.cls === 'bld' || e.cls === 'hq') continue;
      const c = centerOf(e), v = sub(c, eye), d = len(v);
      if (d > maxD || d < 1.5) continue;
      const cs = dot(v, fwd) / d; if (cs < 0.95) continue;
      const hr = e.cls === 'inf' ? 0.45 : (typeof hitRadiusRay === 'function' ? hitRadiusRay(e) : hitRadius(e));   // пехота: реальный «корпус», а не грубая сфера
      const ang = acos(clamp(cs, -1, 1)), rad = Math.atan(hr / d);
      const edge = ang - rad;
      if (edge > cone) continue;
      if (e.team === 1 && e.seen && e.seen[0] <= 0 && d > 25) continue;   // невидимых не подсказываем
      const s = edge + d * 0.0004;
      if (s < bs){ bs = s; best = e; bAng = ang; bRad = rad; }
    }
    if (best && !los(eye, centerOf(best))) best = null;
    return best ? { e: best, ang: bAng, rad: bRad } : null;
  },
  step(rdt){
    const c = ctrlEntity(), k = this.K();
    if (!c || S.mode !== 'fps' || CAMFX.busy() || !k || !(c.cls === 'inf' || c.cls === 'drone')){ this.sens = 1; this.tgt = null; this.wasAim = false; return; }
    const eye = c.cls === 'inf' ? gunEye(c) : c.pos, fwd = c.cls === 'inf' ? c.fwd : c.aim;
    const coneDeg = (TOUCH.on ? 4.2 : 2.6) * (0.6 + 0.4 * k);
    const h = this.scan(eye, fwd, c.team, coneDeg * PI / 180, 160);
    this.tgt = h ? h.e : null;
    // (а) «трение»: прицел на цели или рядом — чувствительность ниже (×0.6 на средней)
    const onIt = h && h.ang < h.rad + 1.2 * PI / 180;
    const want = onIt ? 1 - 0.53 * k : 1;
    this.sens += (want - this.sens) * min(1, rdt * 14);
    // (б) притяжение: только при стрельбе или прицеливании (ПКМ), мягко, в малом конусе
    const firing = (SET.swapMouse ? mouseR : mouseL), aiming = !!S.aiming;
    // тянем только до корпуса цели (не «прилипаем» к центру)
    if (h && (firing || aiming) && h.ang > h.rad * 0.6){
      const to = norm(sub(centerOf(h.e), eye));
      let rate = (TOUCH.on ? 6 : 3.2) * k;
      // начало прицеливания — короткий «доворот» (как на консолях)
      if (aiming && !this.wasAim) this.holdT = 0.16;
      if (this.holdT > 0){ this.holdT -= rdt; rate += 10 * k; }
      const step = min(1, rate * rdt);
      const nf = norm(add(mul(fwd, 1 - step), mul(to, step)));
      if (c.cls === 'inf'){ if (abs(dot(nf, c.up)) < 0.995) c.fwd = nf; }
      else c.aim = nf;
    }
    this.wasAim = aiming;
  },
  // (в) магнетизм пули: почти-попадание засчитывается; дроны — как раньше (droneMagnet)
  fire(eye, fwd, team){
    const k = this.K(); if (!k) return fwd;
    const h = this.scan(eye, fwd, team, (0.35 + 0.65 * k) * PI / 180, 140);
    if (!h) return fwd;
    if (h.ang <= h.rad * 0.85) return fwd;   // и так попадает
    const to = norm(sub(centerOf(h.e), eye));
    const w = 0.35 + 0.45 * k;
    return norm(add(mul(fwd, 1 - w), mul(to, w)));
  },
};
