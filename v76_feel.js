// =====================================================================
//  v7.6 «ОЩУЩЕНИЕ БОЯ И УДЕРЖАНИЕ» (ветка v76feel) — всё в этом файле, чужие файлы не правятся.
//  1) Отклик попаданий: метка убийства с VHS-расслоением (красный/голубой), металлический «тинк» попадания,
//     «глухой удар» убийства, плавная тряска камеры (сила и дистанция взрыва + толчок), искры и светящаяся
//     охлаждайка у роботов (без крови), вспышка по краям экрана при убийстве, лёгкое слоу-мо на последнем враге
//     рядом / танке / штабе. Галки: «Тряска камеры», «Слоу-мо». Денди/лёгкий режим — дешевле (меньше частиц,
//     рамка вместо градиента, тряска мягче).
//  2) «▶ Играть сразу»: пролёт под портальным небом (~3.6 с, пропуск — любая клавиша / клик / тап) → сразу в бой.
//  3) Экран итога: время, уничтожения, лучшая серия, XP, армия, захваты, лучший отряд, MVP; карточка матча (canvas,
//     VHS) + «Поделиться» (navigator.share с картинкой, иначе — PNG + ссылка в буфер).
//  4) Угловая подсказка «что делать сейчас» (✕ / F7 — свернуть в «?»), ПК и телефон, центр экрана свободен.
//  5) Автосохранение при закрытии вкладки и при выходе в меню; «Продолжить» — вторая кнопка меню.
//  Хуки (обёртки): setupCamera, gatherParticles, gunShoot, gunOverlay, drawOverlay, kitStep, killCredit, newMatch,
//  PROG.onKill, AU.tick, SAVE.save, MENU.html_main/html_end/html_settings/wire/toMenu/loadGame, P71M.main/sec, uixFrame.
//  Проверка из консоли: FEEL76.demo.kill() / .boom(3, 20) / .slow() / .end(true) / .intro().
// =====================================================================
let F76S = 0x2545f491;
const F76R = () => { F76S ^= F76S << 13; F76S ^= F76S >>> 17; F76S ^= F76S << 5; return (F76S >>> 0) / 4294967296; };   // свой ГСЧ: эффекты не сдвигают random() боя
const F76U = () => { const z = F76R() * 2 - 1, a = F76R() * 6.2831853, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
Object.assign(SET_DEF, { shake76: true, slowmo76: true, hint76: true });
for (const k of ['shake76', 'slowmo76', 'hint76']) if (SET[k] === undefined) SET[k] = SET_DEF[k];

const FEEL76 = {
  ITCH: 'https://edmitry.itch.io/portal-meteor',
  P: [], held: 0, killT: 0, killHead: false, flashT: 0, streakT: 0, kickP: 0, kickY: 0, slowT: 0, slowDur: 1, slowPeak: 0, slowCd: -99,
  ph: [F76R() * 9, F76R() * 9, F76R() * 9], hold: false, err: 0, st: null, snap: null, snapPix: false, wantSnap: false, snapReq: false,
  cardCv: null, overSeen: false, overT: 0, intro: null, hintT: 0, hintLast: null, lastMe: null, savedThisMatch: false, hideT: 0,
  cheap(){ return (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()); },
  safe(fn, tag){ try { return fn(); } catch (e){ if (this.err++ < 6) console.warn('feel76 ' + tag, e); } },
  T(ru, en, vi, he){ return tr(ru, en, vi, he); },
  resetStats(){
    if (this.intro) this.introEnd(true);
    this.st = { units: new Map(), groups: new Map(), streak: 0, best: 0, deaths: 0, loaded: false };
    this.overSeen = false; this.snap = null; this.snapReq = false; this.wantSnap = false; this.cardCv = null;
    this.P.length = 0; this.slowT = 0; this.killT = 0; this.flashT = 0; this.streakT = 0; this.kickP = this.kickY = 0;
    this.savedThisMatch = false; this.lastMe = null; this.hintT = 0;
  },

  // ------------------------------------------------------------------ 1. отклик попаданий
  spray(pos, dir, nS, nC){
    if (!pos) return;
    const up = norm(pos), m = this.cheap() ? 0.5 : 1, back = dir ? mul(dir, -1) : up;
    for (let i = 0, n = Math.round(nS * m); i < n; i++){
      const l = 0.16 + F76R() * 0.26;
      this.P.push({ pos, vel: add(add(mul(back, 3 + F76R() * 6), mul(F76U(), 4.5)), mul(up, 1.5)), life: l, max: l, r: 0.028 + F76R() * 0.026, ty: 2, tl: 0.035, g: 9, drag: 1.4 });
    }
    for (let i = 0, n = Math.round(nC * m); i < n; i++){   // охлаждайка: светящиеся голубые капли, падают по дуге
      const l = 0.45 + F76R() * 0.5;
      this.P.push({ pos, vel: add(add(mul(back, 1.2 + F76R() * 2.6), mul(F76U(), 1.8)), mul(up, 2 + F76R() * 2.2)), life: l, max: l, r: 0.04 + F76R() * 0.03, ty: 0, tl: 0.022, g: 7.5, drag: 0.35 });
    }
    const cap = this.cheap() ? 36 : 120; if (this.P.length > cap) this.P.splice(0, this.P.length - cap);
  },
  stepParts(dt){
    const P = this.P;
    for (let i = P.length - 1; i >= 0; i--){
      const p = P[i]; p.life -= dt;
      if (p.life <= 0){ P.splice(i, 1); continue; }
      const up = norm(p.pos);
      p.vel = mul(add(p.vel, mul(up, -p.g * dt)), 1 - min(0.9, p.drag * dt));
      p.pos = add(p.pos, mul(p.vel, dt));
    }
  },
  parts(n){
    if (!this.P.length || !S.cam) return n;
    const pmax = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxP : MAXP;
    for (let i = this.P.length - 1; i >= 0 && n < pmax; i--){
      const p = this.P[i], k = p.life / p.max, t = sub(p.pos, mul(p.vel, p.tl));
      PAR.set([p.pos[0], p.pos[1], p.pos[2], p.r * (0.45 + 0.55 * k), t[0], t[1], t[2], p.ty], n * 8); n++;
    }
    return n;
  },
  onHit(r, dir){
    const e = r.ent || r.bld; if (!e || !S.cam || !r.pos || dist2(r.pos, S.cam.pos) > 25600) return;
    const robot = e.cls === 'inf' || e.cls === 'drone' || e.cls === 'builder';
    this.spray(r.pos, dir, robot ? 5 : 4, robot ? 2 : 0);
  },
  tink(){
    if (!AU.ready()) return;
    const t = AU.ctx.currentTime; if (t - (this.tinkT || 0) < 0.045) return; this.tinkT = t;
    AU.osc(AU.sfx, t, 0.06, 'triangle', 3300 + F76R() * 600, 2300, 0.07);
    AU.nz(AU.sfx, t, 0.05, 'bandpass', 5200, 3600, 7, 0.09, 0.002);
  },
  killSfx(major){
    if (!AU.ready()) return;
    const t = AU.ctx.currentTime, o = AU.sfx;
    AU.osc(o, t, 0.22, 'sine', 170, 46, 0.32);
    AU.osc(o, t + 0.015, 0.07, 'square', 2600, 650, 0.04);
    AU.nz(o, t, 0.16, 'bandpass', 900, 280, 1.2, 0.12, 0.003);
    if (major) AU.osc(o, t + 0.04, 0.7, 'sawtooth', 110, 52, 0.07, 0.02);
  },
  slowSfx(on){
    if (!AU.ready()) return;
    const t = AU.ctx.currentTime;
    if (on){ AU.osc(AU.master, t, 0.55, 'sine', 320, 70, 0.2); AU.nz(AU.master, t, 0.45, 'lowpass', 2600, 180, 1, 0.16, 0.03); }
    else AU.osc(AU.master, t, 0.35, 'sine', 90, 360, 0.12);
  },
  enemiesNear(p, R){
    const R2 = R * R; let n = 0;
    for (const L of [S.units, S.vehicles, S.drones]) for (const e of L) if (e.alive && e.team === 1 && dist2(e.pos, p) < R2) n++;
    return n;
  },
  slowmo(dur, peak, force){
    if (SET.slowmo76 === false || S.attract) return;
    if (!force && S.rtime - this.slowCd < 7) return;
    this.slowT = dur; this.slowDur = dur; this.slowPeak = peak; this.slowCd = S.rtime;
    this.slowSfx(true);
  },
  slowStep(rdt){
    if (this.slowT <= 0 || S.paused || MENU.isOpen()) return;
    this.slowT = max(0, this.slowT - rdt);
    const a = this.slowDur - this.slowT, env = min(1, a / 0.08) * smoothstep(0, this.slowDur * 0.6, this.slowT);
    S.slow = max(S.slow, this.slowPeak * env);
    if (this.slowT <= 0) this.slowSfx(false);
  },
  onCredit(e, src){
    if (S.attract || !this.st || !src || src.team !== 0 || e.team === 0 || e.team === undefined) return;
    const w = e.cls === 'tank' ? 3 : e.cls === 'bld' || e.cls === 'hq' ? 2 : 1;
    const g = groupOf(src);
    if (g){ const k = groupLabel(g); const o = this.st.groups.get(k) || { name: k, kills: 0 }; o.kills += w; this.st.groups.set(k, o); }
    let name = '';
    if (src.cls === 'inf') name = callsign(src) + ' · ' + N2(roleOf(src).n);
    else if (src.cls === 'bld') name = typeof bname === 'function' ? bname(src.type) : src.type;
    else name = groupLabel(src);
    const key = src.id !== undefined ? 'u' + src.id : 's:' + name;   // id сущности переживает загрузку сохранения
    const u = this.st.units.get(key) || { name, kills: 0, mine: false };
    u.kills += w; u.name = name; if (isPlayerSrc(src)) u.mine = true;
    this.st.units.set(key, u);
  },
  onKill(e, src){
    if (S.attract || !this.st) return;
    const cam = S.cam && S.cam.pos;
    // охлаждайка у любого робота, погибшего рядом с камерой
    if (e.pos && cam && e.team !== undefined && (e.cls === 'inf' || e.cls === 'drone' || e.cls === 'builder') && dist2(e.pos, cam) < 4900)
      this.spray(add(e.pos, mul(norm(e.pos), 0.6)), null, 6, isPlayerSrc(src) ? 7 : 4);
    if (!isPlayerSrc(src) || e.team !== 1) return;
    this.killT = 0.55; this.flashT = 0.22; this.streakT = 1.4;
    this.killHead = S.lastPT === 'b' && !!(typeof GUNS !== 'undefined' && GUNS.lastHead);
    this.st.streak++; this.st.best = max(this.st.best, this.st.streak);
    const major = e.cls === 'hq' || e.cls === 'tank';
    this.killSfx(major);
    if (e.cls === 'hq') this.slowmo(1.6, 0.7, true);
    else if (e.cls === 'tank') this.slowmo(0.85, 0.5);
    else if (e.cls === 'inf' && e.squad && e.squad.units.every(u => !u.alive || u === e)){
      const c = ctrlEntity();
      if (c && this.enemiesNear(c.pos, 55) === 0) this.slowmo(0.95, 0.55);   // последний враг волны / рядом
    }
  },
  deathCheck(){
    const c = ctrlEntity();
    if (this.lastMe && this.lastMe !== c && !this.lastMe.alive && this.lastMe.cls !== 'bld' && this.st){ this.st.streak = 0; this.st.deaths++; }
    this.lastMe = c;
  },
  // плавная тряска: сумма синусов вместо случайного дрожания каждый кадр; сила — S.shake (взрывы/удары уже кладут туда силу по дистанции)
  shakeCam(dt){
    const c = S.cam; if (!c) return;
    const on = SET.shake76 !== false, k = on ? min(1.25, this.held) : 0;
    this.kickP *= Math.exp(-dt * 16); this.kickY *= Math.exp(-dt * 16);
    if (k < 0.002 && abs(this.kickP) < 1e-4) return;
    const t = performance.now() / 1000, A = Math.pow(k, 1.4) * (this.cheap() ? 0.016 : 0.021), ph = this.ph;
    const nx = (sin(t * 27 + ph[0]) + 0.6 * sin(t * 61 + ph[1] * 2)) / 1.6, ny = (sin(t * 23 + ph[1]) + 0.6 * sin(t * 53 + ph[2] * 2)) / 1.6, nr = sin(t * 19 + ph[2]);
    let f = norm(add(c.fwd, add(mul(c.right, nx * A + this.kickY), mul(c.up, ny * A + this.kickP))));
    const roll = nr * A * 0.6, up = norm(add(c.up, mul(c.right, roll)));
    S.cam = Object.assign({}, c, camBasis(f, up));
  },
  // ------------------------------------------------------------------ наложение: метка убийства, серия, вспышка по краям
  overlay(dt){
    if (S.attract || S.mode !== 'fps' || !S.cam || OPER.on || MENU.isOpen() || this.intro || CAMFX.busy()) return;
    const g = octx, W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    this.killT = max(0, this.killT - dt); this.flashT = max(0, this.flashT - dt); this.streakT = max(0, this.streakT - dt);
    if (this.killT > 0){
      const k = this.killT / 0.55, e = 1 - k, r = 16 + 26 * Math.sqrt(e), a = min(1, k * 1.6);
      g.save(); g.lineWidth = 2;
      for (const [dx, col] of [[-2, '255,40,60'], [2, '60,230,255'], [0, this.killHead ? '255,215,90' : '255,245,235']]){
        g.strokeStyle = `rgba(${col},${(a * (dx ? 0.55 : 0.9)).toFixed(2)})`;
        g.beginPath(); g.arc(cx + dx, cy, r, 0, PI * 2); g.stroke();
        const L0 = 10 + 6 * e, L1 = 20 + 10 * e;
        g.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]){ g.moveTo(cx + dx + sx * L0, cy + sy * L0); g.lineTo(cx + dx + sx * L1, cy + sy * L1); }
        g.stroke();
      }
      g.restore();
    }
    if (this.st && this.st.streak >= 2 && this.streakT > 0){
      const a = min(1, this.streakT / 0.4);
      g.save(); g.globalAlpha = a; g.font = '400 ' + (TOUCH.on ? 15 : 18) + 'px "Russo One", sans-serif'; g.textAlign = 'left';
      const s = '×' + this.st.streak, x = cx + 34, y = cy - 22;
      g.fillStyle = 'rgba(255,40,60,.6)'; g.fillText(s, x - 1.5, y); g.fillStyle = 'rgba(60,230,255,.6)'; g.fillText(s, x + 1.5, y);
      g.fillStyle = '#fff3d6'; g.fillText(s, x, y); g.restore();
    }
    if (this.flashT > 0){
      const a = this.flashT / 0.22 * 0.32;
      g.save();
      if (this.cheap()){ g.fillStyle = `rgba(255,236,200,${a.toFixed(3)})`; const b = 18; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); g.fillRect(0, 0, b, H); g.fillRect(W - b, 0, b, H); }
      else {
        const gr = g.createRadialGradient(cx, cy, min(W, H) * 0.32, cx, cy, Math.hypot(cx, cy));
        gr.addColorStop(0, 'rgba(255,236,200,0)'); gr.addColorStop(1, `rgba(255,226,180,${a.toFixed(3)})`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      g.restore();
    }
  },
  // кадр (после рендера): снимок для карточки, конец матча, смерть, подсказка
  frame(dt){
    if (S.attract || MENU.isOpen()){ this.hintT = 0; const el = $('f76hint'); if (el && el.style.display !== 'none'){ el.style.display = 'none'; el._k = ''; } if (this.intro && S.attract) this.introEnd(true); if (S.attract) return; }
    if (this.intro) this.introStep();
    this.deathCheck();
    if (this.wantSnap && canvas.width > 8){
      this.wantSnap = false;
      try { const sc = min(1, 960 / canvas.width), cv = document.createElement('canvas'); cv.width = Math.round(canvas.width * sc); cv.height = Math.round(canvas.height * sc); cv.getContext('2d').drawImage(canvas, 0, 0, cv.width, cv.height); this.snap = cv; } catch (e){ this.snap = null; }
    }
    if (S.over && !this.overSeen){
      this.overSeen = true; this.overT = performance.now(); this.wantSnap = true;
      if (S.winner === 0) this.slowmo(1.4, 0.65, true);
      if (this.savedThisMatch) this.safe(() => SAVE.del('auto'), 'del');   // «Продолжить» не должен вести в уже закончившийся бой
    }
    this.hintT -= dt; if (this.hintT <= 0){ this.hintT = 0.25; this.safe(() => this.hintUpd(), 'hint'); }
  },
};
const F76_OFF = (() => { try { return new URLSearchParams(location.search).get('feel76') === '0' || localStorage.getItem('pm_feel76') === '0'; } catch (e){ return false; } })();
// ------------------------------------------------------------------ 2. «Играть сразу»: пролёт под порталом → бой
Object.assign(FEEL76, {
  INTRO_D: 3.6,
  playNow(){
    AU.init();
    MENU.newGame();   // умолчания игры и так «разумные» (авто-сложность, бесконечный бой, крупный масштаб); выбор игрока в меню не трогаем
    if (typeof STATS75 !== 'undefined') this.safe(() => STATS75.ev('play_now', {}), 'stats');
    this.introStart();
  },
  introStart(){
    const c = ctrlEntity(); if (!c) return;
    const up = norm(c.pos), f = tangent(c.fwd || anyTangent(up), up);
    this.intro = { t0: performance.now(), up, f, base: c.pos, ang: 0 };
    S.xfer = 0.9; if (typeof GUNS !== 'undefined') GUNS.xfer = 0.9;   // бой идёт (мир живой), ввод игрока перехвачен до конца пролёта
    document.body.classList.add('f76intro');
    this.introCam(0);
  },
  introCam(k){
    const I = this.intro, c = ctrlEntity(); if (!I) return;
    const up = I.up, a = (1 - k) * 0.9, r = norm(cross(I.f, up));
    const f = norm(add(mul(I.f, cos(a)), mul(r, sin(a))));          // лёгкий облёт — параллакс
    const B = c ? c.pos : I.base;
    const P0 = add(add(B, mul(up, 150)), mul(f, -70)), L0 = add(add(P0, mul(up, 260)), mul(f, 160));   // смотрим в небо-портал
    const P1 = add(add(B, mul(up, 26)), mul(f, -22)), L1 = add(add(B, mul(f, 140)), mul(up, 8));       // общий план боя
    const P2 = add(B, mul(up, 0.8)), L2 = add(add(B, mul(c ? (c.aim || c.fwd) : f, 40)), mul(up, 0.8)); // глаза бойца
    const s = smoothstep(0, 0.62, k), s2 = smoothstep(0.62, 1, k);
    let pos = k < 0.62 ? add(mul(P0, 1 - s), mul(P1, s)) : add(mul(P1, 1 - s2), mul(P2, s2));
    let look = k < 0.62 ? add(mul(L0, 1 - s), mul(L1, s)) : add(mul(L1, 1 - s2), mul(L2, s2));
    pos = pullCam(add(B, mul(up, 1.2)), pos);
    S.camOverride = { pos, look };
  },
  introStep(){
    const I = this.intro; if (!I) return;
    if (S.over || S.attract || MENU.isOpen()){ this.introEnd(true); return; }
    const k = (performance.now() - I.t0) / 1000 / this.INTRO_D;
    if (k >= 1){ this.introEnd(false); return; }
    S.xfer = max(0.9 * Math.exp(-k * 9), smoothstep(0.86, 1, k) * 0.8);   // VHS-«передача» в начале и в конце
    if (typeof GUNS !== 'undefined') GUNS.xfer = S.xfer;
    this.introCam(k);
  },
  introEnd(silent){
    if (!this.intro) return;
    this.intro = null; S.camOverride = null;
    document.body.classList.remove('f76intro');
    if (!silent){ if (typeof GUNS !== 'undefined') GUNS.xfer = 0.85; S.flashT = max(S.flashT, 0.1); if (typeof gunSfx === 'function') gunSfx('xfer'); }
    updateModeUI();
  },
  introDraw(){
    const I = this.intro; if (!I) return;
    const g = octx, W = innerWidth, H = innerHeight, k = (performance.now() - I.t0) / 1000 / this.INTRO_D;
    const a = clamp(min(k / 0.12, (1 - k) / 0.22), 0, 1);
    g.save(); g.globalAlpha = a; g.textAlign = 'center';
    const fs = Math.round(clamp(min(W, H * 1.6) * 0.085, 30, 96)), y = H * 0.4, jit = (F76R() < 0.12 ? (F76R() - 0.5) * 18 : 0);
    g.font = `400 ${fs}px "Russo One", sans-serif`;
    g.fillStyle = 'rgba(255,40,70,.75)'; g.fillText('PORTAL METEOR', W / 2 - 3 + jit, y);
    g.fillStyle = 'rgba(40,230,255,.75)'; g.fillText('PORTAL METEOR', W / 2 + 3 + jit, y);
    g.fillStyle = '#efe3c0'; g.shadowColor = 'rgba(214,198,154,.6)'; g.shadowBlur = 24; g.fillText('PORTAL METEOR', W / 2 + jit * 0.3, y);
    g.shadowBlur = 0; g.font = `600 ${Math.round(fs * 0.24)}px "Exo 2", sans-serif`; g.fillStyle = '#e8e2d0';
    g.fillText(tr('Над тобой — не небо. Это портал к врагу.', 'That is not the sky above you. It is a portal to the enemy.', 'Trên đầu bạn không phải bầu trời — đó là cánh cổng tới quân thù.', 'מעליך אין שמיים. זה שער אל האויב.'), W / 2, y + fs * 0.62);
    g.globalAlpha = a * 0.75; g.font = `600 ${TOUCH.on ? 12 : 13}px "Exo 2", sans-serif`; g.fillStyle = '#d6c69a';
    g.fillText(TOUCH.on ? tr('тап — пропустить', 'tap to skip', 'chạm để bỏ qua', 'הקש לדילוג') : tr('любая клавиша или клик — пропустить', 'any key or click to skip', 'nhấn phím bất kỳ để bỏ qua', 'כל מקש או קליק — דילוג'), W / 2, H - 28);
    // VHS-строка «PLAY ▶» в углу
    g.globalAlpha = a; g.textAlign = 'left'; g.font = `700 ${TOUCH.on ? 14 : 18}px Consolas, "Courier New", monospace`; g.fillStyle = '#f2f2f2';
    g.fillText('▶ PLAY', 26, 38); g.fillText('SP  0:00:0' + Math.min(9, floor(k * this.INTRO_D)), 26, 62);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let yy = 0; yy < H; yy += 3) g.fillRect(0, yy, W, 1);
    g.restore();
  },
});
// пропуск интро: любая клавиша, клик, тап (до всех остальных обработчиков, чтобы Tab/Esc не сработали в бою)
for (const ev of ['keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'touchstart']) addEventListener(ev, e => {
  if (!FEEL76.intro) return;
  if (ev === 'mousemove' || ev === 'keyup' || ev === 'mouseup' || performance.now() - FEEL76.intro.t0 < 250){ e.stopImmediatePropagation(); return; }
  e.stopImmediatePropagation(); if (ev !== 'touchstart' && e.cancelable) e.preventDefault();
  FEEL76.introEnd(false);
}, { capture: true, passive: false });
// ------------------------------------------------------------------ 4. «Что делать сейчас» — компактно в углу
Object.assign(FEEL76, {
  hintEl(){
    let el = $('f76hint');
    if (!el){
      el = document.createElement('div'); el.id = 'f76hint'; document.body.appendChild(el);
      const tog = e => { const b = e.target.closest('[data-f76h]'); if (!b) return; e.preventDefault(); e.stopPropagation(); AU.init(); SET.hint76 = b.dataset.f76h === '1'; MENU.save(); el._k = ''; this.hintUpd(); };
      el.addEventListener('mousedown', e => e.stopPropagation());
      el.addEventListener('click', tog);
      el.addEventListener('touchstart', e => { if (e.target.closest('[data-f76h]')){ tog(e); } e.stopPropagation(); }, { passive: false });
    }
    return el;
  },
  hintText(){
    const c = ctrlEntity(), phone = TOUCH.on, K = a => phone ? '' : bk(a);
    const dirD = p => { const d = Math.round(surfDist(c.pos, p)); return `${d} ${tr('м', 'm', 'm')} · ${relDirWord(p)}`; };
    if (S.mode === 'rts'){
      if (phone) return null;
      return S.sel.size ? { t: tr('ПКМ по карте — идти с боем', 'RMB on the map — attack-move', 'Chuột phải — tiến công'), s: `${K('rts')} — ${tr('вселиться в выделенного', 'possess the selection', 'nhập vai')}` }
        : { t: tr('Выдели отряд: клик или рамка', 'Select a squad: click or drag a box', 'Chọn đội: nhấp hoặc kéo khung'), s: tr('потом ПКМ — приказ · ', 'then RMB — order · ', 'rồi chuột phải — lệnh · ') + `${K('rts')} — ${tr('в бой', 'to battle', 'vào trận')}` };
    }
    if (!c) return null;
    if (c.cls === 'bld') return { t: tr('Ты за турелью — бей по Рою', 'You are on a turret — fire at the Swarm', 'Bạn đang ở tháp súng — bắn Bầy Đàn'), s: phone ? '' : `${K('interact')} — ${tr('слезть', 'get off', 'rời')}` };
    if (c.hp < c.maxhp * 0.33 && c.cls === 'inf') return { t: tr('Мало брони — отойди за укрытие', 'Low armor — get behind cover', 'Giáp yếu — nấp đi'), s: tr('вне боя чинишься сам, медик — быстрее', 'you self-repair out of combat, a medic is faster', 'tự hồi khi ngoài trận') , warn: 1 };
    const card = typeof TACT !== 'undefined' ? TACT.card() : null, tp = typeof TACT !== 'undefined' ? TACT.navPos() : null;
    const far = p => c.cls === 'inf' && surfDist(c.pos, p) > 260 ? (phone ? ' · ☰ → ⇲ ' + tr('переброска', 'redeploy', 'tái triển khai') : ` · ${K('redeploy')} — ${tr('капсула к цели', 'pod to target', 'khoang tới mục tiêu')}`) : '';
    if (card && !card.done && tp) return { t: card.title, s: dirD(tp) + (far(tp) || (phone ? '' : ` · ${K('nav')} — ${tr('линия', 'line', 'đường')}`)), ord: 1 };
    const sp = typeof SIDEQ !== 'undefined' && SIDEQ.q ? SIDEQ.pos() : null;
    if (S.teams[1] && S.teams[1].waveUntil > S.time && S.teams[1].waveTarget && surfDist(S.teams[1].waveTarget, c.pos) < 400)
      return { t: tr('Рой наступает — держи оборону', 'The Swarm is attacking — hold the line', 'Bầy Đàn tấn công — giữ phòng tuyến'), s: dirD(S.teams[1].waveTarget), warn: 1 };
    let best = null, bd = 1e9;
    for (const cp of S.cps){ if (cp.core || cp.owner === 0) continue; const d = surfDist(cp.pos, c.pos); if (d < bd){ bd = d; best = cp; } }
    if (best) return { t: tr(`Захвати точку ${best.name}`, `Capture point ${best.name}`, `Chiếm điểm ${best.name}`), s: dirD(best.pos) + (far(best.pos) || (phone ? '' : ` · ${K('switch')} — ${tr('боец ближе к бою', 'unit closer to the fight', 'lính gần trận')}`)) };
    if (sp) return { t: tr('Побочная задача рядом', 'Side task nearby', 'Nhiệm vụ phụ gần đây'), s: dirD(sp) };
    const hq = S.hq[1];
    return { t: hq && hq.alive ? tr('Снеси штаб Роя', 'Destroy the Swarm HQ', 'Phá sở chỉ huy Bầy Đàn') : tr('Добей ключевые здания Роя', 'Finish the Swarm key buildings', 'Phá nốt công trình then chốt'), s: hq && hq.alive ? dirD(hq.pos) : '' };
  },
  hintUpd(){
    const el = this.hintEl();
    const off = F76_OFF || S.attract || S.over || this.intro || MENU.isOpen() || OPER.on || (typeof TUT !== 'undefined' && TUT.on) || (typeof T72 !== 'undefined' && T72.on) || (typeof DEV !== 'undefined' && DEV.open);
    const h = off ? null : this.hintText();
    if (!h){ if (el.style.display !== 'none') el.style.display = 'none'; el._k = ''; return; }
    el.style.display = 'flex';
    el.classList.toggle('rts', S.mode === 'rts');
    const open = SET.hint76 !== false;
    const k = (open ? 1 : 0) + '|' + h.t + '|' + h.s + '|' + (h.warn || 0);
    if (el._k === k) return; el._k = k;
    el.className = (open ? 'open' : 'mini') + (h.warn ? ' warn' : '') + (h.ord ? ' ord' : '') + (S.mode === 'rts' ? ' rts' : '');
    el.innerHTML = open
      ? `<div><i>${tr('СЕЙЧАС', 'NOW', 'BÂY GIỜ', 'עכשיו')}</i><b>${uixEsc(h.t)}</b>${h.s ? `<small>${uixEsc(h.s)}</small>` : ''}</div><button data-f76h="0" title="${tr('Свернуть', 'Collapse', 'Thu gọn', 'כווץ')}${TOUCH.on ? '' : ' (F7)'}">✕</button>`
      : `<button data-f76h="1" title="${tr('Что делать сейчас', 'What to do now', 'Làm gì bây giờ', 'מה לעשות עכשיו')}${TOUCH.on ? '' : ' (F7)'}">?</button>`;
  },
});
addEventListener('keydown', e => { if (e.code === 'F7' && !e.repeat && !MENU.isOpen() && !S.attract){ e.preventDefault(); SET.hint76 = SET.hint76 === false; MENU.save(); FEEL76.hintT = 0; } });
// ------------------------------------------------------------------ 3. итог матча + карточка «Поделиться»
Object.assign(FEEL76, {
  summary(){
    const st = this.st || { units: new Map(), groups: new Map(), best: 0, deaths: 0 };
    const top = m => { let b = null; for (const v of m.values()) if (!b || v.kills > b.kills) b = v; return b && b.kills > 0 ? b : null; };
    return {
      win: S.winner === 0, why: S.overWhy || '', time: S.time, kills: PROG.matchKills || 0, best: st.best || 0, deaths: st.deaths || 0,
      xp: PROG.matchXP || 0, rank: PROG.rankName(), tasks: PROG.matchTasks || 0,
      army: S.stats && S.stats.kills ? S.stats.kills[0] : 0, lost: S.stats && S.stats.kills ? S.stats.kills[1] : 0, caps: S.stats && S.stats.caps ? S.stats.caps[0] : 0,
      mvp: top(st.units), squad: top(st.groups), loaded: !!st.loaded,
    };
  },
  endHtml(){
    const s = this.endSum = this.summary(), T = this.T;
    const tile = (lab, val, sub) => `<div class="f76t"><small>${lab}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
    const res = s.win ? T('ПОБЕДА', 'VICTORY', 'CHIẾN THẮNG', 'ניצחון') : T('ПОРАЖЕНИЕ', 'DEFEAT', 'THẤT BẠI', 'הפסד');
    const kpm = s.time > 60 ? (s.kills / (s.time / 60)).toFixed(1) : '';
    const share = navigator.share ? T('Поделиться', 'Share', 'Chia sẻ', 'שיתוף') : T('Поделиться: PNG + ссылка', 'Share: PNG + link', 'Chia sẻ: PNG + liên kết', 'שיתוף: PNG + קישור');
    return `<div class="f76end ${s.win ? 'win' : 'lose'}"><div class="f76l">
      <div class="f76vhs">▶ PLAY <span>${fmtTime(s.time)}</span></div>
      <h1 class="f76res" data-t="${res}">${res}</h1>
      <p class="f76why">${uixEsc(s.why)}</p>
      <div class="f76g">
        ${tile(T('Время матча', 'Match time', 'Thời gian', 'זמן משחק'), fmtTime(s.time))}
        ${tile(T('Твои уничтожения', 'Your kills', 'Bạn đã hạ', 'ההריגות שלך'), s.kills, kpm ? kpm + ' ' + T('в мин', 'per min', '/phút', 'לדקה') : '')}
        ${tile(T('Лучшая серия', 'Best streak', 'Chuỗi tốt nhất', 'רצף הכי טוב'), '×' + s.best, T('без гибели', 'without dying', 'không chết', 'בלי למות'))}
        ${tile(T('Опыт', 'XP', 'Kinh nghiệm', 'ניסיון'), s.xp, uixEsc(s.rank))}
        ${tile(T('Армия', 'Army', 'Quân đội', 'צבא'), `${s.army} : ${s.lost}`, T('уничтожено : потеряно', 'destroyed : lost', 'hạ : mất', 'הושמדו : אבדו'))}
        ${tile(T('Захваты · приказы', 'Captures · orders', 'Chiếm · lệnh', 'כיבושים · פקודות'), `${s.caps} · ${s.tasks}`)}
      </div>
      <div class="f76mvp">
        <div><i>★ MVP</i><b>${s.mvp ? uixEsc(s.mvp.name) + (s.mvp.mine ? ' · ' + T('ты', 'you', 'bạn', 'אתה') : '') : '—'}</b><small>${s.mvp ? s.mvp.kills + ' ' + T('уничт.', 'kills', 'hạ', 'הריגות') : ''}</small></div>
        <div><i>${T('ЛУЧШИЙ ОТРЯД', 'BEST SQUAD', 'ĐỘI GIỎI NHẤT', 'החוליה הטובה')}</i><b>${s.squad ? uixEsc(s.squad.name) : '—'}</b><small>${s.squad ? s.squad.kills + ' ' + T('уничт.', 'kills', 'hạ', 'הריגות') : ''}</small></div>
      </div>
      ${s.loaded ? `<p class="f76note">${T('Статистика — с момента загрузки сохранения.', 'Stats count from the moment the save was loaded.', 'Thống kê tính từ lúc tải bản lưu.', 'הסטטיסטיקה מרגע טעינת השמירה.')}</p>` : ''}
    </div><div class="f76r">
      <div class="f76card"><img id="f76cardimg" alt="Portal Meteor"></div>
      <button id="m_f76share" class="big f76share">⇪ ${share}</button>
      <div class="f76row"><button id="m_f76png">⬇ PNG</button><button id="m_f76link">🔗 ${T('Ссылка на игру', 'Game link', 'Liên kết', 'קישור')}</button></div>
      <p class="f76msg" id="f76msg"></p>
      ${MENU.btn('restart', '▶ ' + T('Ещё матч', 'Play again', 'Chơi lại', 'שוב'), 'big')}
      ${MENU.btn('menu', T('Главное меню', 'Main menu', 'Menu chính', 'תפריט ראשי'))}
    </div></div>`;
  },
  async fontsReady(){ try { await Promise.race([Promise.all([document.fonts.load('400 40px "Russo One"'), document.fonts.load('600 20px "Exo 2"')]), new Promise(r => setTimeout(r, 1200))]); } catch (e){} },
  async makeCard(){
    await this.fontsReady();
    const s = this.endSum || this.summary(), T = this.T, W = 1200, H = 630;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const R = (() => { let x = 12345; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; })();
    // фон: кадр конца боя (если удалось снять) или ночное небо
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a0c12'); bg.addColorStop(1, '#1d1710'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (this.snap){
      const sn = this.snap, ka = W / H, sa = sn.width / sn.height; let sw = sn.width, sh = sn.height, sx = 0, sy = 0;
      if (sa > ka){ sw = sh * ka; sx = (sn.width - sw) / 2; } else { sh = sw / ka; sy = (sn.height - sh) / 2; }
      g.globalAlpha = 0.5; g.drawImage(sn, sx, sy, sw, sh, -6, 0, W, H); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18; g.drawImage(sn, sx, sy, sw, sh, 6, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    } else { for (let i = 0; i < 260; i++){ g.fillStyle = `rgba(255,255,255,${(R() * 0.7).toFixed(2)})`; g.fillRect(R() * W, R() * H * 0.8, 1.5, 1.5); } }
    const vg = g.createRadialGradient(W * 0.5, H * 0.5, H * 0.2, W * 0.5, H * 0.5, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,.25)'); vg.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // полосы «трекинга» VHS: сдвинутые срезы кадра
    for (let i = 0; i < 4; i++){ const y = R() * H, h = 4 + R() * 14; g.drawImage(cv, 0, y, W, h, (R() - 0.5) * 40, y, W, h); }
    g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, H * 0.72, W, 18);
    const chroma = (txt, x, y, font, col, off, align) => {
      g.font = font; g.textAlign = align || 'left';
      g.fillStyle = 'rgba(255,40,70,.8)'; g.fillText(txt, x - off, y); g.fillStyle = 'rgba(40,230,255,.8)'; g.fillText(txt, x + off, y);
      g.fillStyle = col; g.fillText(txt, x, y);
    };
    g.font = '700 26px Consolas, "Courier New", monospace'; g.fillStyle = '#f4f4f4'; g.textAlign = 'left';
    g.fillText('▶ PLAY', 48, 64); g.textAlign = 'right'; g.fillText('REC', W - 72, 64);
    g.fillStyle = '#ff3344'; g.beginPath(); g.arc(W - 52, 55, 10, 0, PI * 2); g.fill();
    g.fillStyle = '#f4f4f4'; g.font = '700 20px Consolas, "Courier New", monospace';
    const d = new Date(); g.fillText(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() + '  ' + fmtTime(s.time), W - 48, 94);
    chroma('PORTAL METEOR', 48, 168, '400 92px "Russo One", sans-serif', '#efe3c0', 4);
    const res = s.win ? T('ПОБЕДА', 'VICTORY', 'CHIẾN THẮNG', 'ניצחון') : T('ПОРАЖЕНИЕ', 'DEFEAT', 'THẤT BẠI', 'הפסד');
    chroma(res, 50, 258, '400 64px "Russo One", sans-serif', s.win ? '#9fffb8' : '#ff8a78', 3);
    g.font = '600 22px "Exo 2", sans-serif'; g.fillStyle = '#d9cfb4'; g.textAlign = 'left';
    const why = s.why.length > 70 ? s.why.slice(0, 68) + '…' : s.why; g.fillText(why, 52, 296);
    const boxes = [[T('ВРЕМЯ', 'TIME', 'THỜI GIAN', 'זמן'), fmtTime(s.time)], [T('УНИЧТОЖЕНО', 'KILLS', 'ĐÃ HẠ', 'הריגות'), String(s.kills)], [T('СЕРИЯ', 'STREAK', 'CHUỖI', 'רצף'), '×' + s.best], [T('ОПЫТ', 'XP', 'KN', 'ניסיון'), String(s.xp)]];
    boxes.forEach(([lab, val], i) => {
      const x = 48 + i * 278, y = 330;
      g.fillStyle = 'rgba(10,12,14,.72)'; g.fillRect(x, y, 258, 112); g.fillStyle = '#d6c69a'; g.fillRect(x, y, 5, 112);
      g.font = '600 18px "Exo 2", sans-serif'; g.fillStyle = '#b9b19a'; g.textAlign = 'left'; g.fillText(lab, x + 22, y + 34);
      chroma(val, x + 22, y + 92, '400 50px "Russo One", sans-serif', '#fff6de', 2);
    });
    g.font = '600 24px "Exo 2", sans-serif'; g.textAlign = 'left';
    const line = (lab, v, y) => { g.fillStyle = '#ffd27a'; g.fillText(lab, 52, y); const w = g.measureText(lab + '  ').width; g.fillStyle = '#f2ecda'; g.fillText(v, 52 + w, y); };
    line('★ MVP', s.mvp ? `${s.mvp.name}${s.mvp.mine ? ' (' + T('я', 'me', 'tôi', 'אני') + ')' : ''} · ${s.mvp.kills}` : '—', 486);
    line(T('ЛУЧШИЙ ОТРЯД', 'BEST SQUAD', 'ĐỘI GIỎI NHẤT', 'החוליה הטובה'), s.squad ? `${s.squad.name} · ${s.squad.kills}` : '—', 522);
    // низ: ссылка на itch
    g.fillStyle = 'rgba(214,198,154,.92)'; g.fillRect(0, H - 64, W, 64);
    g.fillStyle = '#121212'; g.font = '700 28px "Exo 2", sans-serif'; g.textAlign = 'left'; g.fillText(this.ITCH.replace('https://', ''), 48, H - 22);
    g.textAlign = 'right'; g.font = '600 22px "Exo 2", sans-serif'; g.fillText(T('бесплатно в браузере · ПК и телефон', 'free in your browser · PC & phone', 'miễn phí trên trình duyệt', 'בחינם בדפדפן'), W - 48, H - 24);
    // строки развёртки и зерно
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < H - 64; y += 3) g.fillRect(0, y, W, 1);
    for (let i = 0; i < 1400; i++){ g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; g.fillRect(R() * W, R() * H, 2, 1); }
    this.cardCv = cv;
    return cv;
  },
  shareText(){
    const s = this.endSum || this.summary(), T = this.T;
    return (s.win ? T('Победа', 'Victory', 'Chiến thắng', 'ניצחון') : T('Поражение', 'Defeat', 'Thất bại', 'הפסד')) + ` · ${fmtTime(s.time)} · ` +
      T(`${s.kills} уничтожено, серия ×${s.best}`, `${s.kills} kills, ${s.best}× streak`, `${s.kills} hạ, chuỗi ×${s.best}`, `${s.kills} הריגות, רצף ×${s.best}`) + ' — Portal Meteor';
  },
  msg(t){ const m = $('f76msg'); if (m){ m.textContent = t; m.classList.remove('on'); void m.offsetWidth; m.classList.add('on'); } },
  async blob(){ const cv = this.cardCv || await this.makeCard(); return await new Promise(r => cv.toBlob(r, 'image/png')); },
  async download(){
    const b = await this.blob(); if (!b) return false;
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'portal_meteor_match_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  },
  async copyLink(){
    const txt = this.shareText() + ' ' + this.ITCH;
    try { await navigator.clipboard.writeText(txt); return true; } catch (e){}
    try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e){ return false; }
  },
  async share(){
    const T = this.T;
    if (typeof STATS75 !== 'undefined') this.safe(() => STATS75.ev('share', { win: S.winner === 0 ? 1 : 0 }), 'stats');
    try {
      const b = await this.blob();
      const file = b && typeof File !== 'undefined' ? new File([b], 'portal_meteor_match.png', { type: 'image/png' }) : null;
      const data = { title: 'Portal Meteor', text: this.shareText(), url: this.ITCH };
      if (file && navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share(Object.assign({ files: [file] }, data)); this.msg(T('Готово!', 'Done!', 'Xong!', 'בוצע!')); return 'share-file'; }
      if (navigator.share && TOUCH.on){ await navigator.share(data); this.msg(T('Готово!', 'Done!', 'Xong!', 'בוצע!')); return 'share-link'; }
    } catch (e){ if (e && e.name === 'AbortError') return 'abort'; }
    const okD = await this.download(), okC = await this.copyLink();
    this.msg(okD && okC ? T('Картинка скачана, ссылка скопирована — вставь в пост', 'Image downloaded, link copied — paste it into a post', 'Đã tải ảnh, đã chép liên kết', 'התמונה הורדה, הקישור הועתק')
      : okD ? T('Картинка скачана', 'Image downloaded', 'Đã tải ảnh', 'התמונה הורדה') : T('Не получилось — ссылка: ', 'Could not share — link: ', 'Không thể chia sẻ — ', 'לא הצליח — ') + this.ITCH);
    return 'fallback';
  },
  async endShown(){
    try { const cv = await this.makeCard(), img = $('f76cardimg'); if (img) img.src = cv.toDataURL('image/jpeg', 0.86); } catch (e){ console.warn('feel76 card', e); }
  },
});
// ------------------------------------------------------------------ 5. автосохранение при закрытии, «Продолжить»
Object.assign(FEEL76, {
  canAutosave(){ return !S.attract && !S.over && S.time > 20 && !OPER.on && !(typeof DEV !== 'undefined' && DEV.match) && !(typeof T72 !== 'undefined' && T72.on) && !(typeof TUT !== 'undefined' && TUT.on); },
  autosave(why){
    if (!this.canAutosave() || performance.now() - (this.lastSaveT || -1e9) < 15000) return false;
    this.lastSaveT = performance.now();
    const ok = this.safe(() => SAVE.save('auto'), 'save');
    if (ok && typeof SAVE !== 'undefined') SAVE.lastAuto = S.time;
    return ok;
  },
  stSave(slot){
    const st = this.st; if (!st) return;
    const o = { best: st.best, streak: st.streak, deaths: st.deaths, units: [...st.units.entries()].filter(([k, u]) => u.kills > 0 && typeof k === 'string').map(([k, u]) => [u.name, u.kills, u.mine ? 1 : 0, k]), groups: [...st.groups.values()].map(g => [g.name, g.kills]) };
    localStorage.setItem('pm_feel76:' + slot, JSON.stringify(o));
  },
  stLoad(slot){
    const st = this.st; let o = null;
    try { o = JSON.parse(localStorage.getItem('pm_feel76:' + slot) || 'null'); } catch (e){}
    if (!o){ st.loaded = true; return; }   // сохранение старой версии — статистика с момента загрузки
    st.best = o.best || 0; st.streak = o.streak || 0; st.deaths = o.deaths || 0;
    for (const [name, kills, mine, k] of o.units || []) st.units.set(k || 's:' + name, { name, kills, mine: !!mine });
    for (const [name, kills] of o.groups || []) st.groups.set(name, { name, kills });
  },
  // экран загрузки / меню: что предложить первым
  menuTop(){
    const T = this.T, has = SAVE.has();
    return `<div class="f76top">` +
      `<button id="m_f76now" class="big f76now"><i>▶</i><span><b>${T('ИГРАТЬ СРАЗУ', 'PLAY NOW', 'CHƠI NGAY', 'שחק עכשיו')}</b><small>${T('пролёт под порталом — и в бой', 'a flight under the portal — straight into battle', 'bay dưới cánh cổng — vào trận ngay', 'מעוף מתחת לשער — ישר לקרב')}</small></span></button>` +
      (has ? `<button id="m_load" class="big f76cont"><i>⟲</i><span><b>${T('ПРОДОЛЖИТЬ', 'CONTINUE', 'TIẾP TỤC', 'המשך')}</b><small>${uixEsc(SAVE.info())}</small></span></button>` : '') +
      `</div>`;
  },
});
addEventListener('pagehide', () => FEEL76.autosave('hide'));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') FEEL76.autosave('hidden'); });

// ------------------------------------------------------------------ ХУКИ (обёртки поверх существующих функций)
if (!F76_OFF){
  { const sc0 = setupCamera;
    setupCamera = function(dt){
      if (S.attract || S.camOverride || OPER.on){ FEEL76.held = 0; return sc0.apply(this, arguments); }
      const sh = S.shake; FEEL76.held = sh; S.shake = 0;   // старое «дрожание» (случайный вектор каждый кадр) заменяем плавной тряской
      try { sc0.apply(this, arguments); } finally { S.shake = sh; }
      if (S.mode === 'fps') FEEL76.safe(() => FEEL76.shakeCam(dt), 'shake');
    }; }
  { const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); return FEEL76.safe(() => FEEL76.parts(n), 'parts') || n; }; }
  { const gs0 = gunShoot; gunShoot = function(src, eye, dir, W, o){ const r = gs0.apply(this, arguments); if (o && o.player && r) FEEL76.safe(() => FEEL76.onHit(r, dir), 'hit'); return r; }; }
  { const go0 = gunOverlay;
    gunOverlay = function(dt){
      if (FEEL76.intro){ octx.clearRect(0, 0, innerWidth, innerHeight); FEEL76.safe(() => FEEL76.introDraw(), 'introDraw'); return; }
      const r = go0.apply(this, arguments); FEEL76.safe(() => FEEL76.overlay(dt), 'ov'); return r;
    }; }
  { const kc0 = killCredit; killCredit = function(e, src){ const r = kc0.apply(this, arguments); FEEL76.safe(() => FEEL76.onCredit(e, src), 'credit'); return r; }; }
  { const ok0 = PROG.onKill; PROG.onKill = function(e, src){ const r = ok0.apply(this, arguments); FEEL76.safe(() => FEEL76.onKill(e, src), 'kill'); return r; }; }
  { const ks0 = kitStep; kitStep = function(dt, rdt){ const r = ks0.apply(this, arguments); FEEL76.safe(() => { FEEL76.slowStep(rdt); if (FEEL76.pend){ const f = FEEL76.pend; FEEL76.pend = null; f(); } }, 'slow'); return r; }; }
  { const vm0 = gunVM3; gunVM3 = function(){ const r = vm0.apply(this, arguments); if (FEEL76.intro) r[3] = 1; return r; }; }   // в пролёте оружие в руках не рисуем
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); FEEL76.resetStats(); return r; }; }
  { const tk0 = AU.tick; AU.tick = function(){ if (S.attract) return tk0.apply(this, arguments); FEEL76.tink(); }; }
  // статистика итога (серия, MVP, отряды) живёт рядом с сохранением: ключ pm_feel76:<слот>
  { const sv0 = SAVE.save; SAVE.save = function(slot){ const r = sv0.apply(this, arguments); if (r){ if (!slot || slot === 'auto') FEEL76.savedThisMatch = true; FEEL76.safe(() => FEEL76.stSave(slot || 'auto'), 'stSave'); } return r; }; }
  { const del0 = SAVE.del; SAVE.del = function(slot){ try { localStorage.removeItem('pm_feel76:' + slot); } catch (e){} return del0.apply(this, arguments); }; }
  { const lg0 = MENU.loadGame;
    MENU.loadGame = function(slot){ FEEL76.loadedSlot = slot || SAVE.newest(); const r = lg0.apply(this, arguments); if (FEEL76.st && !S.attract){ FEEL76.safe(() => FEEL76.stLoad(FEEL76.loadedSlot), 'stLoad'); if (FEEL76.loadedSlot === 'auto') FEEL76.savedThisMatch = true; } return r; }; }
  { const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); FEEL76.safe(() => FEEL76.frame2(dt), 'frame'); }; }
  // меню (ПК): «Играть сразу» и «Продолжить» — первыми; старая строка «Продолжить сохранённый бой» убирается
  { const hm0 = MENU.html_main;
    MENU.html_main = function(){
      let h = hm0.apply(this, arguments);
      if (typeof P71M !== 'undefined' && P71M.on()) return h;
      h = h.replace(/<button id="m_load"[^>]*>[\s\S]*?<\/button>/, '');
      const i = h.indexOf('<button id="m_play"');
      return i < 0 ? h : h.slice(0, i) + FEEL76.menuTop() + h.slice(i);
    }; }
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){
      let h = pm0.apply(this, arguments);
      const tile = `<button id="m_f76now" class="p71t big w2 f76now">${IC71('play')}<b>${FEEL76.T('Играть сразу', 'Play now', 'Chơi ngay', 'שחק עכשיו')}</b><small>${FEEL76.T('сразу в бой', 'straight into battle', 'vào trận ngay', 'ישר לקרב')}</small></button>`;
      h = h.replace(/<button id="m_play" class="p71t big w2">/, '<button id="m_play" class="p71t">');
      return h.replace(/<button id="m_play"/, tile + '<button id="m_play"');
    };
    const ps0 = P71M.sec;
    P71M.sec = function(k){
      let h = ps0.apply(this, arguments);
      if (k !== 's_game') return h;
      const row = (key, lab) => `<button class="p71o ${SET[key] !== false ? 'on' : ''}" data-p74tog="${key}"><span>${uixEsc(lab)}</span><b>${L71(SET[key] !== false ? 'on' : 'off')}</b></button>`;
      return h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + row('shake76', FEEL76.T('Тряска камеры', 'Camera shake', 'Rung camera', 'רעידת מצלמה')) + row('slowmo76', FEEL76.T('Слоу-мо на важных убийствах', 'Slow-mo on major kills', 'Chậm lại khi hạ quan trọng', 'הילוך איטי בהריגות חשובות')) + row('hint76', FEEL76.T('Подсказка «что делать сейчас»', '"What to do now" hint', 'Gợi ý "làm gì bây giờ"', 'רמז "מה לעשות עכשיו"')));
    };
  }
  { const hs0 = MENU.html_settings;
    MENU.html_settings = function(){
      const h = hs0.apply(this, arguments);
      if (typeof P71M !== 'undefined' && P71M.on()) return h;
      const row = (key, lab, sub) => `<div class="row"><label>${lab}${sub ? ` <small style="opacity:.6">${sub}</small>` : ''}</label><button class="tog ${SET[key] !== false ? 'on' : ''}" data-p74tog="${key}">${SET[key] !== false ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי')}</button></div>`;
      const T = FEEL76.T;
      const rows = row('shake76', T('Тряска камеры', 'Camera shake', 'Rung camera', 'רעידת מצלמה'), T('от взрывов и ударов, мягкая', 'from blasts and hits, gentle', 'nhẹ', 'עדינה')) +
        row('slowmo76', T('Слоу-мо на важных убийствах', 'Slow-mo on major kills', 'Chậm lại khi hạ quan trọng', 'הילוך איטי בהריגות חשובות'), T('последний враг рядом, танк, штаб', 'last enemy nearby, tank, HQ', 'kẻ cuối, xe tăng, sở chỉ huy', 'אויב אחרון, טנק, מפקדה')) +
        row('hint76', T('Подсказка «что делать сейчас»', '"What to do now" hint', 'Gợi ý "làm gì bây giờ"', 'רמז "מה לעשות עכשיו"'), T('в углу; F7 — свернуть', 'corner; F7 — collapse', 'góc; F7', 'בפינה; F7'));
      const m = h.match(/<div class="row"><label>[^<]*<\/label><button class="tog[^"]*" data-tog="distort">[^<]*<\/button><\/div>/);
      if (m) return h.replace(m[0], m[0] + rows);
      const i = h.indexOf('<h4>', h.indexOf('<h4>') + 1);
      return i > 0 ? h.slice(0, i) + rows + h.slice(i) : h + rows;
    }; }
  { const he0 = MENU.html_end; MENU.html_end = function(){ try { return FEEL76.endHtml(); } catch (e){ console.warn('feel76 end', e); return he0.apply(this, arguments); } }; }
  { const w0 = MENU.wire;
    MENU.wire = function(name){
      w0.apply(this, arguments);
      const on = (id, fn) => { const b = $('m_' + id); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); fn(); }; };
      if (name === 'main') on('f76now', () => FEEL76.playNow());
      if (name === 'end'){
        on('f76share', () => FEEL76.share());
        on('f76png', async () => { const ok = await FEEL76.download(); FEEL76.msg(ok ? FEEL76.T('Картинка скачана', 'Image downloaded', 'Đã tải ảnh', 'התמונה הורדה') : '—'); });
        on('f76link', async () => { const ok = await FEEL76.copyLink(); FEEL76.msg(ok ? FEEL76.T('Ссылка скопирована', 'Link copied', 'Đã chép liên kết', 'הקישור הועתק') : FEEL76.ITCH); });
        FEEL76.endShown();
      }
    }; }
  { const tm0 = MENU.toMenu; MENU.toMenu = function(){ if (FEEL76.intro) FEEL76.introEnd(true); return tm0.apply(this, arguments); }; }
}
// кадр после рендера: частицы, события взрывов (тряска по силе и дистанции), остальное
FEEL76.frame2 = function(dt){
  if (!S.paused && !S.attract){
    const k = 1 - 0.72 * (S.slow || 0);
    this.stepParts(dt * k);
    const cam = S.cam && S.cam.pos;
    if (cam && S.mode === 'fps' && !this.intro) for (const e of S.events){
      if (e.type !== 'boom' || !e.pos) continue;
      const sz = clamp(e.size || 1, 0.3, 8), R = 55 * Math.sqrt(sz), d = dist(e.pos, cam);
      if (d > R) continue;
      const f = (1 - d / R) * (1 - d / R);
      S.shake = max(S.shake, min(1.2, sz * 0.34 * f));
      this.kickP += min(0.012, 0.0035 * sz * f) * (this.cheap() ? 0.6 : 1);
    }
  }
  this.frame(dt);
};
// демо/проверка из консоли и тестов
FEEL76.demo = {
  kill(head){ const c = ctrlEntity(); const e = S.units.find(u => u.alive && u.team === 1) || null; if (!e || !c) return false; if (head) S.lastPT = 'b'; e.hp = 1; damage(e, 999, c, 'b'); return !e.alive; },
  boom(size, d){ FEEL76.pend = () => { const c = S.cam; if (c) fxExplosion(add(c.pos, mul(c.fwd, d || 18)), size || 3); }; },   // внутри update(): события доходят как в бою
  slow(){ FEEL76.slowmo(1.2, 0.6, true); },
  end(win){ const t = win === false ? 0 : 1; S.hq[t].alive = false; HQ_ALIVE[t] = false; for (const b of S.buildings) if (b.team === t && BTYPES[b.type].key) b.alive = false; },
  intro(){ FEEL76.introStart(); },
};
// ------------------------------------------------------------------ СТИЛИ
(function feel76CSS(){
  const st = document.createElement('style'); st.id = 'feel76css';
  st.textContent = `
  @keyframes f76scan{0%{background-position:0 0}100%{background-position:0 6px}}
  @keyframes f76glitch{0%,86%,100%{transform:none;clip-path:none}88%{transform:translate(-3px,0);clip-path:inset(12% 0 58% 0)}91%{transform:translate(4px,0);clip-path:inset(55% 0 20% 0)}94%{transform:translate(-2px,0)}}
  @keyframes f76in{0%{opacity:0;transform:translateY(8px) skewX(-8deg);filter:blur(3px)}60%{opacity:1;filter:none}100%{transform:none}}
  @keyframes f76msg{0%{opacity:0}15%,80%{opacity:1}100%{opacity:.85}}
  /* --- меню: ИГРАТЬ СРАЗУ / ПРОДОЛЖИТЬ --- */
  #screen .f76top{display:flex;flex-direction:column;gap:8px;margin:2px 0 4px}
  #screen .f76now,#screen .f76cont{position:relative;display:flex;align-items:center;gap:14px;padding:10px 18px;overflow:hidden;text-align:left}
  #screen .f76now{background:linear-gradient(90deg,rgba(214,198,154,.32),rgba(214,198,154,.1));border:1px solid var(--sand);box-shadow:0 0 22px rgba(214,198,154,.18)}
  #screen .f76now::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px);animation:f76scan .6s linear infinite}
  #screen .f76now i,#screen .f76cont i{font-style:normal;font-size:30px;color:#fff3d6;text-shadow:-2px 0 rgba(255,40,70,.75),2px 0 rgba(40,230,255,.75)}
  #screen .f76now span,#screen .f76cont span{display:flex;flex-direction:column}
  #screen .f76now b,#screen .f76cont b{font:400 24px "Russo One",sans-serif;letter-spacing:.06em;color:#fff3d6;text-shadow:-1.5px 0 rgba(255,40,70,.6),1.5px 0 rgba(40,230,255,.6)}
  #screen .f76now small,#screen .f76cont small{font:600 12px "Exo 2";opacity:.75;margin-top:2px}
  #screen .f76now:hover b{animation:f76glitch 1.2s steps(1) infinite}
  #screen .f76cont{background:rgba(143,255,170,.1);border-color:rgba(143,255,170,.6)} #screen .f76cont b{font-size:19px;color:#dfffe7}
  #screen .p71t.f76now{background:linear-gradient(90deg,rgba(214,198,154,.42),rgba(214,198,154,.14));border-color:var(--sand)}
  #screen .p71t.f76now .ic71{color:#fff3d6} #screen .p71t.f76now b{text-shadow:-1.5px 0 rgba(255,40,70,.6),1.5px 0 rgba(40,230,255,.6)}
  /* --- интро: прячем HUD --- */
  body.f76intro #hud,body.f76intro #obj,body.f76intro #bars,body.f76intro #kit,body.f76intro #feed,body.f76intro #squadp,body.f76intro #sq,body.f76intro #help,body.f76intro #dbg,body.f76intro #touch,body.f76intro #clicklock,body.f76intro #who73,body.f76intro #devLab,body.f76intro #hint,body.f76intro #cur,body.f76intro #uxmode,body.f76intro #uxtoasts,body.f76intro #mtoast,body.f76intro #banner,body.f76intro #tut,body.f76intro #t72,body.f76intro .m73x{opacity:0!important;pointer-events:none!important;transition:opacity .2s}
  /* --- «что делать сейчас» --- */
  #f76hint{position:fixed;left:12px;top:104px;z-index:14;display:none;align-items:stretch;max-width:290px;pointer-events:none;font-family:"Exo 2",sans-serif;animation:f76in .35s ease-out}
  #f76hint.open{background:linear-gradient(90deg,rgba(8,12,16,.82),rgba(8,12,16,.55));border-left:3px solid var(--sand);padding:5px 6px 6px 10px}
  #f76hint.open.ord{border-left-color:#8fffaa} #f76hint.open.warn{border-left-color:#ff8a6a}
  #f76hint i{display:block;font:700 9.5px "Exo 2";letter-spacing:.22em;color:#b9b19a;font-style:normal}
  #f76hint b{display:block;font:600 14px "Exo 2";color:#f4ecd6;line-height:1.2;text-shadow:0 0 4px #000}
  #f76hint small{display:block;font:500 11.5px "Exo 2";color:#c9c0a4;margin-top:1px}
  #f76hint.warn b{color:#ffd0c4}
  #f76hint button{pointer-events:auto;background:none;border:none;color:#b9b19a;font:700 13px "Exo 2";padding:0 2px 0 8px;cursor:pointer;align-self:flex-start;line-height:1}
  #f76hint button:hover{color:#fff}
  #f76hint.mini button{width:26px;height:26px;padding:0;border-radius:50%;background:rgba(8,12,16,.7);border:1px solid rgba(214,198,154,.55);color:#e8dcb8;font-size:14px}
  #f76hint.rts{left:222px;top:74px}
  body.touch #f76hint{left:calc(env(safe-area-inset-left,0px) + 10px);top:108px;max-width:230px}
  body.touch #f76hint b{font-size:12.5px} body.touch #f76hint small{font-size:10.5px} body.touch #f76hint button{font-size:15px;padding:0 2px 0 10px}
  body.m74nh #f76hint{display:none!important}
  /* --- итог матча --- */
  #screen.scr-end{background:radial-gradient(ellipse at 50% 40%,rgba(4,6,8,.78),rgba(0,0,0,.94))}
  #screen .f76end button{text-align:center}
  #screen.scr-end::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);animation:f76scan .5s linear infinite}
  #screen .f76end{position:relative;display:flex;gap:34px;align-items:center;max-width:min(1120px,96vw);max-height:96vh;overflow:auto;color:#f0e8d0;font-family:"Exo 2",sans-serif;animation:f76in .5s ease-out}
  #screen .f76l{flex:1.15;min-width:0} #screen .f76r{flex:1;display:flex;flex-direction:column;gap:8px;min-width:280px;max-width:440px}
  #screen .f76vhs{font:700 16px Consolas,"Courier New",monospace;color:#f2f2f2;letter-spacing:.08em;opacity:.85} #screen .f76vhs span{margin-left:14px;opacity:.7}
  #screen .f76res{position:relative;font:400 72px "Russo One",sans-serif;letter-spacing:.06em;margin:2px 0 0;line-height:1}
  #screen .f76end.win .f76res{color:#9fffb8;text-shadow:0 0 30px rgba(143,255,170,.35)} #screen .f76end.lose .f76res{color:#ff8a78;text-shadow:0 0 30px rgba(255,120,100,.3)}
  #screen .f76res::before,#screen .f76res::after{content:attr(data-t);position:absolute;left:0;top:0;opacity:.7;mix-blend-mode:screen;animation:f76glitch 2.4s steps(1) infinite}
  #screen .f76res::before{color:#ff2850;transform:translateX(-3px)} #screen .f76res::after{color:#28e6ff;transform:translateX(3px);animation-delay:.3s}
  #screen .f76why{color:#c9c0a4;margin:6px 0 14px;font-size:14px}
  #screen .f76g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  #screen .f76t{background:rgba(10,12,14,.72);border-left:3px solid var(--sand);padding:7px 12px 8px;animation:f76in .5s ease-out both}
  #screen .f76t:nth-child(2){animation-delay:.06s} #screen .f76t:nth-child(3){animation-delay:.12s} #screen .f76t:nth-child(4){animation-delay:.18s} #screen .f76t:nth-child(5){animation-delay:.24s} #screen .f76t:nth-child(6){animation-delay:.3s}
  #screen .f76t small{display:block;font:600 10.5px "Exo 2";letter-spacing:.14em;text-transform:uppercase;color:#b9b19a}
  #screen .f76t b{display:block;font:400 30px "Russo One",sans-serif;color:#fff6de;line-height:1.15;text-shadow:-1.5px 0 rgba(255,40,70,.45),1.5px 0 rgba(40,230,255,.45)}
  #screen .f76t em{display:block;font-style:normal;font-size:11.5px;color:#a9a18a}
  #screen .f76mvp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
  #screen .f76mvp div{background:linear-gradient(90deg,rgba(255,210,122,.14),rgba(10,12,14,.6));border:1px solid rgba(255,210,122,.35);padding:7px 12px}
  #screen .f76mvp i{display:block;font:700 10.5px "Exo 2";letter-spacing:.16em;color:#ffd27a;font-style:normal}
  #screen .f76mvp b{display:block;font:600 16px "Exo 2";white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #screen .f76mvp small{font-size:12px;color:#c9c0a4}
  #screen .f76note{font-size:11.5px;opacity:.6;margin-top:6px}
  #screen .f76card{position:relative;border:1px solid var(--line);background:#0a0c10;aspect-ratio:1200/630;overflow:hidden}
  #screen .f76card img{display:block;width:100%;height:100%;object-fit:cover} #screen .f76card span{position:absolute;right:6px;top:4px;font:600 10px "Exo 2";letter-spacing:.14em;text-transform:uppercase;opacity:.55}
  #screen .f76share{text-align:center;background:linear-gradient(90deg,rgba(214,198,154,.34),rgba(214,198,154,.12));border-color:var(--sand);font-size:17px}
  #screen .f76row{display:flex;gap:8px} #screen .f76row button{flex:1;text-align:center}
  #screen .f76msg{min-height:16px;font-size:12.5px;color:#9fffb8;margin:0} #screen .f76msg.on{animation:f76msg 2.4s ease-out}
  #screen .f76end button.big{text-align:center}
  body.touch #screen .f76end{gap:14px;max-height:100%;padding:0 4px;align-items:flex-start}
  body.touch #screen .f76res{font-size:38px} body.touch #screen .f76why{font-size:11.5px;margin:2px 0 6px} body.touch #screen .f76vhs{font-size:12px}
  body.touch #screen .f76t{padding:4px 8px 5px} body.touch #screen .f76t b{font-size:20px} body.touch #screen .f76t small{font-size:9px} body.touch #screen .f76t em{font-size:10px}
  body.touch #screen .f76g{gap:5px} body.touch #screen .f76mvp{gap:5px;margin-top:5px} body.touch #screen .f76mvp div{padding:4px 8px} body.touch #screen .f76mvp b{font-size:13px}
  body.touch #screen .f76r{min-width:220px;gap:5px} body.touch #screen .f76end button{padding:7px 10px;font-size:14px} body.touch #screen .f76share{font-size:15px}
  @media (max-aspect-ratio: 1/1){ #screen .f76end{flex-direction:column;gap:10px;align-items:stretch} #screen .f76r{max-width:none;min-width:0} }
  @media (max-height: 640px){ #screen .f76res{font-size:48px} #screen .f76t b{font-size:22px} }`;
  document.head.appendChild(st);
})();
