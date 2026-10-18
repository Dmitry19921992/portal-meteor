// =====================================================================
//  КАМЕРА: пролёт при смерти и переключении, «оператор» (бот играет сам,
//  кинокамера сама ищет красивые планы) и запись ролика прямо из игры
// =====================================================================
const QS = new URLSearchParams(location.search);
const CAMFX = {
  fly: null, last: null,
  busy(){ return !!this.fly; },
  // переключились на другого бойца или машину — плавный пролёт от старой камеры к новой
  onSwitch(u){
    if (S.attract || !this.last) return;
    const from = this.last, to = u.pos;
    const d = dist(from.pos, to);
    if (d < 6) return;
    this.fly = { from, t: 0, dur: clamp(0.75 + d / 380, 0.8, 2.1), d };
    S.flashT = max(S.flashT, 0.06);
  },
  apply(cam, dt){
    if (S.attract || S.mode !== 'fps'){ this.fly = null; this.last = null; return cam; }
    const F = this.fly;
    if (F){
      F.t += dt;
      const k = clamp(F.t / F.dur, 0, 1);
      const e = k * k * (3 - 2 * k);
      if (k >= 1) this.fly = null;
      else {
        const A = F.from.pos, B = cam.pos;
        const dA = norm(A), dB = norm(B);
        let dir = norm(add(mul(dA, 1 - e), mul(dB, e)));
        if (len(add(mul(dA, 1 - e), mul(dB, e))) < 0.05) dir = norm(add(dA, mul(anyTangent(dA), e)));
        const lift = min(70, 6 + F.d * 0.22) * sin(PI * e);
        const r = lerp(len(A), len(B), e) + lift;
        const pos = mul(dir, r);
        const toB = norm(sub(B, pos));
        const s1 = smoothstep(0, 0.35, k), s2 = smoothstep(0.65, 1, k);
        let fwd = norm(add(mul(F.from.fwd, 1 - s1), mul(toB, s1)));
        fwd = norm(add(mul(fwd, 1 - s2), mul(cam.fwd, s2)));
        cam = Object.assign({}, cam, camBasis(fwd, norm(pos)), { pos });
      }
    }
    this.last = { pos: cam.pos, fwd: cam.fwd };
    return cam;
  },
  frame(dt){ if (OPER.on) OPER.frame(dt); },
};

// ---------------------------------------------------------------------
//  ОПЕРАТОР: режиссёр сам выбирает план — облёт, погоня, «из-за плеча»,
//  низкий план, пролёт, общий план с высоты, тактический сверху
// ---------------------------------------------------------------------
const OPER = {
  on: false, shot: null, t: 0, cut: 0, caps: true, aspect: '16:9', lines: [], lineI: 0, lineT: 0, title: 0,
  CAPS: {
    ru: ['Метеорит. Две армии роботов. Одна руда.', 'Небо — это портал к врагу', 'Стратегия и шутер — в одной игре', 'Вселяйся в любого бойца или танк', 'Десант через купол — прямо на базу врага', 'Без крови — только искры', 'Подпишись — девлог каждую неделю'],
    en: ['One meteor. Two robot armies. One ore.', 'The sky is a portal to the enemy', 'Strategy and shooter in one game', 'Possess any trooper or tank', 'Sky assault through the dome — right onto the enemy base', 'No blood — only sparks', 'Subscribe — weekly devlog'],
    vi: ['Một thiên thạch. Hai đội quân robot. Một mỏ quặng.', 'Bầu trời là cánh cổng tới quân thù', 'Chiến thuật và bắn súng trong một trò chơi', 'Nhập vai bất kỳ lính hay xe tăng nào', 'Đổ bộ xuyên mái vòm — thẳng xuống căn cứ địch', 'Không máu — chỉ có tia lửa', 'Đăng ký — nhật ký phát triển mỗi tuần'],
  },
  begin(opts){
    opts = opts || {};
    this.on = true; this.aspect = opts.aspect || '16:9'; this.caps = opts.caps !== false;
    this.lines = (this.CAPS[LANG.cur] || this.CAPS.ru).slice(); this.lineI = 0; this.lineT = 4; this.title = opts.title === false ? 0 : 5.5;
    S.fixedRes = this.aspect === '9:16' ? [720, 1280] : [1600, 900];
    S.autoRes = false;
    document.body.classList.add('oper', this.aspect === '9:16' ? 'vert' : 'hor');
    resize();
    this.shot = null; this.cut = 0;
    MENU.close();
    updateModeUI();
  },
  end(){
    this.on = false; S.fixedRes = null; document.body.classList.remove('oper', 'vert', 'hor');
    S.autoRes = SET.autoRes; resize();
    if (REC.active) REC.stop();
  },
  hot(){
    const L = [];
    for (const u of S.units) if (u.alive && !underground(u.pos) && u.target && u.target.alive) L.push({ e: u, w: u.skyState ? 6 : u.elite ? 2 : 1 });
    for (const v of S.vehicles) if (v.alive && !underground(v.pos)) L.push({ e: v, w: v.target && v.target.alive ? 4 : 1.2 });
    for (const d of S.drones) if (d.alive && d.target && d.target.alive) L.push({ e: d, w: 1.5 });
    for (const u of S.units) if (u.alive && u.skyState) L.push({ e: u, w: 8 });
    return L;
  },
  pickSubject(pref){
    let L = this.hot();
    if (pref) { const f = L.filter(o => pref(o.e)); if (f.length) L = f; }
    if (!L.length){ const any = S.units.filter(u => u.alive && !underground(u.pos)); return any[floor(random() * any.length)] || null; }
    let sum = 0; for (const o of L) sum += o.w;
    let r = random() * sum;
    for (const o of L){ r -= o.w; if (r <= 0) return o.e; }
    return L[0].e;
  },
  newShot(){
    const kinds = [['orbit', 3], ['chase', 3], ['shoulder', 2.5], ['low', 2], ['flyby', 2], ['sky', 0.6], ['tactical', 1.2], ['portal', S.units.some(u => u.alive && u.skyState && altitude(u.pos) < 120) ? 1.5 : 0]];
    const prev = this.shot ? this.shot.kind : '';
    let sum = 0; for (const k of kinds) if (k[0] !== prev) sum += k[1];
    let r = random() * sum, kind = 'orbit';
    for (const k of kinds){ if (k[0] === prev) continue; r -= k[1]; if (r <= 0){ kind = k[0]; break; } }
    let e;
    if (kind === 'portal') e = this.pickSubject(x => !!x.skyState);
    else if (kind === 'chase') e = this.pickSubject(x => x.cls === 'tank' || x.cls === 'inf');
    else if (kind === 'shoulder') e = this.pickSubject(x => x.cls === 'inf' || x.cls === 'tank');
    else e = this.pickSubject();
    if (!e) return;
    const up = norm(e.pos);
    this.shot = { kind, e, t: 0, dur: kind === 'sky' ? 6 : kind === 'portal' ? 4.5 : 5 + random() * 3, ang: random() * PI * 2, dirA: random() < 0.5 ? 1 : -1,
                  side: norm(cross(up, tangent(e.fwd || anyTangent(up), up))), center: e.pos, pos: null, look: null };
    const s = this.shot;
    if (kind === 'low'){
      const f = tangent(e.vel && len(e.vel) > 0.5 ? e.vel : e.fwd, up);
      const p = add(e.pos, add(mul(f, 22), mul(s.side, (random() - 0.5) * 10)));
      s.fixed = add(surfacePoint(norm(p), 0.5), mul(norm(p), 0.6));
    }
    if (kind === 'sky'){ s.center = e.pos; s.ang = random() * PI * 2; }
  },
  camera(dt){
    if (!this.shot || this.shot.t > this.shot.dur || !this.shot.e || (!this.shot.e.alive && this.shot.kind !== 'sky') || (this.shot.e.pos && altitude(this.shot.e.pos) > 140)) this.newShot();
    const s = this.shot;
    if (!s) return cineCamera(dt);
    s.t += dt;
    const e = s.e, k = s.t / s.dur;
    const up = norm(e.pos), fwd = tangent(e.cls === 'inf' ? e.fwd : (e.aim || e.fwd), up), right = norm(cross(fwd, up));
    const head = add(e.pos, mul(up, e.cls === 'tank' ? 1.6 : e.cls === 'drone' ? 0.2 : 1.1));
    let want, look, snap = false;
    switch (s.kind){
      case 'orbit': {
        s.ang += dt * 0.22 * s.dirA;
        const t1 = anyTangent(up), t2 = cross(up, t1), R = e.cls === 'tank' ? 16 : 11;
        want = add(add(head, add(mul(t1, cos(s.ang) * R), mul(t2, sin(s.ang) * R))), mul(up, e.cls === 'tank' ? 5 : 3.2));
        look = head; break;
      }
      case 'chase': {
        const b = e.cls === 'tank' ? 11 : 6.5, h = e.cls === 'tank' ? 4 : 2.4;
        want = add(add(head, mul(fwd, -b)), add(mul(up, h), mul(right, 1.2)));
        look = add(head, mul(fwd, 25)); break;
      }
      case 'shoulder': {
        const aim = e.aim || fwd;
        want = add(add(head, mul(fwd, e.cls === 'tank' ? -7 : -2.4)), add(mul(right, e.cls === 'tank' ? 0 : 0.75), mul(up, e.cls === 'tank' ? 2.8 : 0.35)));
        look = add(head, mul(e.target && e.target.alive ? norm(sub(centerOf(e.target), head)) : aim, 30)); snap = true; break;
      }
      case 'low': { want = s.fixed; look = head; break; }
      case 'flyby': {
        const c = s.center, cu = norm(c);
        const a = add(add(c, mul(s.side, 38)), mul(cu, 10)), b = add(add(c, mul(s.side, -38)), mul(cu, 14));
        want = add(mul(a, 1 - k), mul(b, k)); look = head; break;
      }
      case 'sky': {
        const cu = norm(s.center), t1 = anyTangent(cu), t2 = cross(cu, t1);
        s.ang += dt * 0.05;
        const off = add(mul(t1, cos(s.ang)), mul(t2, sin(s.ang)));
        want = add(mul(cu, RM + 70 + 25 * k), mul(off, 110));
        look = add(s.center, mul(off, -20)); break;
      }
      case 'tactical': {
        const cu = norm(e.pos);
        want = add(add(e.pos, mul(cu, 60 + 15 * k)), mul(fwd, -35));
        look = e.pos; break;
      }
      case 'portal': {
        const v = e.vel && len(e.vel) > 1 ? norm(e.vel) : up;
        want = add(add(e.pos, mul(v, -9)), mul(right, 3)); look = add(e.pos, mul(v, 20)); snap = true; break;
      }
    }
    want = pullCam(head, want);
    const el = len(want); if (el > S.R - 2) want = mul(want, (S.R - 2) / el);
    if (!s.pos || snap && s.t < 0.05){ s.pos = want; s.look = look; }
    const kp = 1 - Math.exp(-dt * (snap ? 9 : s.kind === 'low' ? 30 : 3.5)), kl = 1 - Math.exp(-dt * (snap ? 10 : 4));
    s.pos = add(s.pos, mul(sub(want, s.pos), kp));
    // через портал камера не «протаскивается»: если субъект телепортировался — режем план
    if (dist(s.pos, want) > 120){ s.pos = want; s.look = look; }
    s.look = add(s.look, mul(sub(look, s.look), kl));
    return Object.assign({ pos: s.pos }, camBasis(norm(sub(s.look, s.pos)), norm(s.pos)));
  },
  frame(dt){
    this.title = max(0, this.title - dt);
    this.lineT -= dt;
    if (this.lineT <= 0 && this.caps){ this.lineI++; this.lineT = 7.5; }
    if (REC.active) REC.frame();
  },
  // подписи и титр — рисуются в кадр записи и на экран
  drawCaptions(g, W, H){
    if (!this.caps) return;
    const vert = H > W, u = H / (vert ? 1920 : 1080);
    g.save();
    // логотип в углу
    g.font = `400 ${Math.round(30 * u)}px "Russo One", sans-serif`; g.textAlign = 'left'; g.fillStyle = 'rgba(214,198,154,.85)';
    g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8 * u;
    g.fillText('PORTAL METEOR', 36 * u, (vert ? 120 : 64) * u);
    if (this.title > 0){
      const a = min(1, this.title / 0.8, (5.5 - this.title) / 0.6);
      g.globalAlpha = clamp(a, 0, 1);
      g.textAlign = 'center';
      g.font = `400 ${Math.round((vert ? 110 : 120) * u)}px "Russo One", sans-serif`; g.fillStyle = '#d6c69a'; g.shadowBlur = 30 * u; g.shadowColor = 'rgba(214,198,154,.5)';
      if (vert){ g.fillText('PORTAL', W / 2, H * 0.42); g.fillText('METEOR', W / 2, H * 0.42 + 120 * u); }
      else g.fillText('PORTAL METEOR', W / 2, H * 0.45);
      g.font = `600 ${Math.round(34 * u)}px "Exo 2", sans-serif`; g.fillStyle = '#e8e2d0'; g.shadowBlur = 8 * u; g.shadowColor = 'rgba(0,0,0,.9)';
      g.fillText(tr('война роботов · небо — это портал', 'robot war · the sky is a portal', 'chiến tranh robot · bầu trời là cánh cổng'), W / 2, vert ? H * 0.42 + 200 * u : H * 0.45 + 70 * u);
      g.globalAlpha = 1;
    } else if (this.lineI > 0){
      const text = this.lines[(this.lineI - 1) % this.lines.length];
      const age = 7.5 - this.lineT, a = clamp(min(age / 0.5, (7.5 - age - 1.5) / 0.6), 0, 1);
      if (a > 0){
        g.globalAlpha = a;
        g.font = `600 ${Math.round((vert ? 54 : 44) * u)}px "Exo 2", sans-serif`;
        const maxW = W * (vert ? 0.86 : 0.7);
        const words = text.split(' '), rows = []; let row = '';
        for (const w of words){ const t = row ? row + ' ' + w : w; if (g.measureText(t).width > maxW && row){ rows.push(row); row = w; } else row = t; }
        rows.push(row);
        const lh = (vert ? 66 : 54) * u, y0 = H * (vert ? 0.74 : 0.84) - (rows.length - 1) * lh / 2;
        const bw = max(...rows.map(r => g.measureText(r).width)) + 60 * u;
        g.fillStyle = 'rgba(8,10,8,.55)'; g.shadowBlur = 0;
        g.fillRect(W / 2 - bw / 2, y0 - lh * 0.85, bw, lh * rows.length + lh * 0.35);
        g.fillStyle = '#d6c69a'; g.fillRect(W / 2 - bw / 2, y0 - lh * 0.85, 6 * u, lh * rows.length + lh * 0.35);
        g.textAlign = 'center'; g.fillStyle = '#f2ecda'; g.shadowBlur = 6 * u; g.shadowColor = 'rgba(0,0,0,.9)';
        rows.forEach((r, i) => g.fillText(r, W / 2, y0 + i * lh));
        g.globalAlpha = 1;
      }
    }
    if (REC.active && !REC.hidden){ g.fillStyle = '#f33'; g.beginPath(); g.arc(W - 40 * u, 50 * u, 10 * u, 0, PI * 2); g.fill(); }
    g.restore();
  },
};

// ---------------------------------------------------------------------
//  ЗАПИСЬ: кадр игры + подписи → webm (видео + звук игры), скачивается файлом
// ---------------------------------------------------------------------
const REC = {
  active: false, cv: null, g: null, rec: null, chunks: [], t0: 0, limit: 0, hidden: true, name: '',
  start(sec, name){
    if (this.active) return;
    const vert = OPER.aspect === '9:16';
    const W = vert ? 1080 : 1920, H = vert ? 1920 : 1080;
    this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H;
    this.g = this.cv.getContext('2d');
    const stream = this.cv.captureStream(30);
    try {
      AU.init();
      if (AU.ctx && AU.master){ const d = AU.ctx.createMediaStreamDestination(); AU.master.connect(d); for (const t of d.stream.getAudioTracks()) stream.addTrack(t); this.audioDest = d; }
    } catch (e){ console.warn('rec audio', e); }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    this.rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16e6, audioBitsPerSecond: 192000 });
    this.chunks = [];
    this.rec.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => this.save();
    this.rec.start(1000);
    this.active = true; this.t0 = performance.now(); this.limit = sec || 0; this.name = name || '';
    console.log('[REC] start', W, H, mime);
  },
  frame(){
    if (!this.active) return;
    const g = this.g, W = this.cv.width, H = this.cv.height;
    // вписываем картинку игры с обрезкой под формат кадра
    const sw = canvas.width, sh = canvas.height, ka = W / H, sa = sw / sh;
    let cw = sw, ch = sh, cx = 0, cy = 0;
    if (sa > ka){ cw = sh * ka; cx = (sw - cw) / 2; } else { ch = sw / ka; cy = (sh - ch) / 2; }
    g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, cx, cy, cw, ch, 0, 0, W, H);
    OPER.drawCaptions(g, W, H);
    if (this.limit && (performance.now() - this.t0) / 1000 >= this.limit) this.stop();
  },
  stop(){
    if (!this.active) return;
    this.active = false;
    try { this.rec.stop(); } catch (e){}
    if (this.audioDest){ try { AU.master.disconnect(this.audioDest); } catch (e){} this.audioDest = null; }
  },
  save(){
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `portal_meteor_${this.name || (OPER.aspect === '9:16' ? 'vertical' : 'wide')}_${LANG.cur}_${stamp}.webm`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); a.remove();
    console.log('[REC] saved', a.download, blob.size);
    window.REC_DONE = a.download;
    if (QS.get('closeAfter')) setTimeout(() => window.close(), 4000);
  },
};
