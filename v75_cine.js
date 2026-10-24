// =====================================================================
//  v7.5: КИНО-РЕЖИМ — СПЛИТСКРИН
//  Слева бот-стратег: вид сверху на базу и армию (облёт, смена плана каждые ~9 с),
//  справа бот-шутер: от первого лица бойца нашей армии (смена бойца при гибели / раз в ~20 с).
//  S — сплитскрин / обычный оператор, P — «всё построено и прокачано» (для съёмки),
//  остальные клавиши — как раньше (R запись, C подписи, V вертикаль, N новый план, Esc меню).
//  Рендер: render.js рисует две половины буфера одной пост-обработкой (CINE75.views()).
// =====================================================================
const CINE75 = {
  split: true, cS: null, cF: null, st: null, sh: null, built: 0, err: 0,
  init(){ try { this.split = localStorage.getItem('pm_cine75split') !== '0'; } catch (e){} },
  save(){ try { localStorage.setItem('pm_cine75split', this.split ? '1' : '0'); } catch (e){} },
  on(){ return OPER.on && this.split && OPER.aspect === '16:9' && S.attract; },
  views(){
    if (!this.on() || !this.cS || !this.cF || !this.sh || !this.sh.u) return null;
    const w = fboW, hw = Math.floor(w / 2), rw = w - hw, u = this.sh.u;
    return [{ cam: this.cS, x: 0, w: hw, rx: hw, fp: null, lamp: 0 },
            { cam: this.cF, x: hw, w: rw, rx: 2 * hw + rw, fp: u, vm: u.cls === 'inf', wk: u.w || 'rifle', bob: this.sh.bob || 0, recoil: (u.flash || 0) * 0.6, muzzle: (u.flash || 0) > 0.5, lamp: 1 }];
  },
  // ---------------- бот-шутер: кого снимаем
  pickShooter(prev){
    const L = S.units.filter(u => u.alive && u.team === 0 && u.cls === 'inf' && u !== prev && altitude(u.pos) < 60);
    if (!L.length) return S.units.find(u => u.alive && u.team === 0 && u.cls === 'inf') || null;
    const sc = u => (u.target && u.target.alive ? 5 : 0) + (u.leader ? 1.5 : 0) + (u.elite ? 1 : 0) + random() * 2;
    L.sort((a, b) => sc(b) - sc(a));
    return L[0];
  },
  camShooter(dt){
    let s = this.sh;
    if (!s) s = this.sh = { u: null, t: 0, fwd: null, bob: 0, ph: 0 };
    s.t += dt;
    const fighting = s.u && s.u.target && s.u.target.alive;
    if (!s.u || !s.u.alive || (s.t > 22 && !fighting) || s.t > 45){
      const n = this.pickShooter(s.u);
      if (n !== s.u){ s.u = n; s.t = 0; s.fwd = null; S.flashT = max(S.flashT || 0, 0.05); }
    }
    const u = s.u; if (!u) return null;
    const up = u.up || norm(u.pos);
    const eye = add(u.pos, mul(up, RULES.EYE));
    let want = u.target && u.target.alive ? norm(sub(centerOf(u.target), eye)) : (u.aim || u.fwd || anyTangent(up));
    if (abs(dot(want, up)) > 0.97) want = norm(add(tangent(u.fwd || anyTangent(up), up), mul(up, 0.2)));
    s.fwd = s.fwd ? norm(add(s.fwd, mul(sub(want, s.fwd), 1 - Math.exp(-dt * 5)))) : want;
    const sp = u.vel ? len(tangent(u.vel, up)) : 0;
    s.ph += dt * (4 + sp * 1.2); s.bob = min(1, sp / 4) * sin(s.ph);
    const cam = Object.assign({ pos: add(eye, mul(up, 0.04 * s.bob)) }, camBasis(s.fwd, up));
    cam.fov = FOV * 1.08;
    return cam;
  },
  // ---------------- бот-стратег: вид сверху
  stratFocus(kind){
    const own = S.units.filter(u => u.alive && u.team === 0 && altitude(u.pos) < 80);
    if (kind === 'army' && own.length){ let c = [0, 0, 0]; for (const u of own) c = add(c, u.pos); return norm(c); }
    if (kind === 'front'){
      const hot = [...own, ...S.vehicles.filter(v => v.alive && v.team === 0)].filter(u => u.target && u.target.alive);
      if (hot.length) return norm(hot[floor(random() * hot.length)].pos);
      if (own.length) return norm(own[floor(random() * own.length)].pos);
    }
    return BASES[0];
  },
  camStrat(dt){
    let s = this.st;
    if (!s || s.t > s.dur){
      const kinds = ['base', 'army', 'front', 'army'];
      const k = s ? kinds[(kinds.indexOf(s.kind) + 1) % kinds.length] : 'base';
      const f = this.stratFocus(k);
      this.st = s = { kind: k, t: 0, dur: k === 'base' ? 10 : 8, f, ang: random() * PI * 2, H: k === 'base' ? 120 : 95, pos: s ? s.pos : null, look: s ? s.look : null };
    }
    s.t += dt; s.ang += dt * 0.05;
    if (s.kind !== 'base' && s.t % 2 < dt){ const nf = this.stratFocus(s.kind === 'front' ? 'army' : s.kind); s.f = norm(add(mul(s.f, 0.8), mul(nf, 0.2))); }
    const up = s.f, t1 = anyTangent(up), t2 = cross(up, t1);
    const ground = mul(up, RM + 2);
    const off = add(mul(t1, cos(s.ang)), mul(t2, sin(s.ang)));
    let want = add(add(ground, mul(up, s.H)), mul(off, s.H * 0.55));
    const el = len(want); if (el > S.R - 4) want = mul(want, (S.R - 4) / el);
    const k = 1 - Math.exp(-dt * 1.2);
    s.pos = s.pos ? add(s.pos, mul(sub(want, s.pos), k)) : want;
    s.look = s.look ? add(s.look, mul(sub(ground, s.look), k)) : ground;
    const cam = Object.assign({ pos: s.pos }, camBasis(norm(sub(s.look, s.pos)), norm(s.pos)));
    cam.fov = FOV * 1.08;
    return cam;
  },
  // ---------------- кадр поверх: подписи половин, разделитель, отряды стратега
  proj(c, p, cx, H){ const v = sub(p, c.pos), z = dot(v, c.fwd); if (z <= 0.3) return null; return [cx + dot(v, c.right) / z / c.fov * H, H / 2 - dot(v, c.up) / z / c.fov * H, z]; },
  drawSplit(g, W, H){
    if (!this.cS || !this.cF) return;
    const u = H / 1080, hw = W / 2;
    g.save();
    // отряды и техника нашей армии на виде стратега: рамки + приказ
    g.lineWidth = 2 * u; g.font = `600 ${Math.round(17 * u)}px "Exo 2", sans-serif`; g.textAlign = 'center';
    const seen = new Set(), labs = [];
    for (const e of [...S.units, ...S.vehicles]){
      if (!e.alive || e.team !== 0) continue;
      const gr = groupOf(e); if (!gr || seen.has(gr)) continue; seen.add(gr);
      const L = isSquad(gr) ? leaderOf(gr) : gr; if (!L) continue;
      const p = this.proj(this.cS, L.pos, hw / 2, H); if (!p || p[0] < 8 * u || p[0] > hw - 8 * u || p[1] < 40 * u || p[1] > H - 20 * u) continue;
      const r = clamp(900 / p[2], 6, 26) * u;
      g.strokeStyle = 'rgba(150,230,170,.85)'; g.strokeRect(p[0] - r, p[1] - r, r * 2, r * 2);
      // подписи приказов — без наложения (каждая занимает свою строку)
      const y = p[1] - r - 6 * u, t = orderText(gr), w = g.measureText(t).width;
      if (labs.length < 6 && !labs.some(o => abs(o[1] - y) < 20 * u && abs(o[0] - p[0]) < (o[2] + w) / 2 + 6 * u)){ labs.push([p[0], y, w]); g.fillStyle = 'rgba(210,255,220,.9)'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 4 * u; g.fillText(t, p[0], y); g.shadowBlur = 0; }
    }
    // боец, которого снимает правая половина — жёлтая рамка на виде стратега
    const me = this.sh && this.sh.u;
    if (me && me.alive){ const p = this.proj(this.cS, me.pos, hw / 2, H); if (p && p[0] < hw){ g.strokeStyle = '#ffd27a'; g.lineWidth = 3 * u; g.beginPath(); g.arc(p[0], p[1], 14 * u, 0, PI * 2); g.stroke(); } }
    // разделитель
    g.fillStyle = 'rgba(0,0,0,.85)'; g.fillRect(hw - 3 * u, 0, 6 * u, H);
    g.fillStyle = 'rgba(214,198,154,.9)'; g.fillRect(hw - 1 * u, 0, 2 * u, H);
    // подписи
    const tag = (x, t1, t2) => {
      g.font = `400 ${Math.round(26 * u)}px "Russo One", sans-serif`; g.textAlign = 'left';
      const w1 = g.measureText(t1).width; g.font = `600 ${Math.round(18 * u)}px "Exo 2", sans-serif`; const w2 = g.measureText(t2).width;
      g.fillStyle = 'rgba(8,10,8,.62)'; g.fillRect(x, 96 * u, max(w1, w2) + 34 * u, 66 * u); g.fillStyle = '#d6c69a'; g.fillRect(x, 96 * u, 5 * u, 66 * u);
      g.font = `400 ${Math.round(26 * u)}px "Russo One", sans-serif`; g.fillStyle = '#f2ecda'; g.fillText(t1, x + 16 * u, 126 * u);
      g.font = `600 ${Math.round(18 * u)}px "Exo 2", sans-serif`; g.fillStyle = '#cfc4a4'; g.fillText(t2, x + 16 * u, 152 * u);
    };
    const kindT = { base: tr('база', 'base', 'căn cứ', 'בסיס'), army: tr('армия', 'army', 'quân đội', 'צבא'), front: tr('линия фронта', 'front line', 'tiền tuyến', 'קו החזית') };
    tag(24 * u, tr('СТРАТЕГ', 'STRATEGIST', 'CHIẾN LƯỢC GIA', 'אסטרטג'), tr('бот · вид сверху · ', 'bot · top view · ', 'bot · nhìn từ trên · ', 'בוט · מבט מלמעלה · ') + (this.st ? kindT[this.st.kind] : ''));
    if (me) tag(hw + 24 * u, tr('ШУТЕР', 'SHOOTER', 'XẠ THỦ', 'יורה'), tr('бот · ', 'bot · ', 'bot · ', 'בוט · ') + (typeof callsign === 'function' ? callsign(me) : '') + (isSquad(me.squad) ? ' · ' + orderText(me.squad) : ''));
    g.restore();
  },
  // ---------------- «всё построено и прокачано» — обе армии, для съёмки
  preset(){
    const safe = (f, k) => { try { f(); } catch (e){ if (this.err++ < 6) console.warn('cine75 preset ' + k, e); } };
    for (const t of [0, 1]){
      const T = S.teams[t];
      safe(() => { T.ore = max(T.ore, 6000); T.jet2 = true; T.armor = PRODUCTS.armor.max; T.weapons = PRODUCTS.weapons.max; if (PRODUCTS.drill) T.drill = PRODUCTS.drill.max; T.cmd = GAME.CMD_MAX; }, 'res');
      safe(() => { for (const u of S.units) if (u.team === t && u.cls === 'inf') u.jet = jetOf(u); }, 'jet');
      if (typeof BASE70 !== 'undefined') safe(() => { const U = BASE70.hqu(t); for (const k of HQUP70_ORDER) if (!U.done[k] && S.hq[t].alive){ U.job = { k, t: 0, T: 0, cost: 0 }; BASE70.hqFinish(t); } }, 'hq');
      const want = { turret: 4, aa: 2, factory: 1, hub: 1, airdock: 1, outpost: 1, extractor: 2 };
      for (const key of Object.keys(BTYPES)){
        const have = S.buildings.filter(b => b.alive && b.team === t && b.type === key).length;
        for (let i = have; i < (want[key] || 1); i++) safe(() => {
          const dir = aiSiteFor(t, key); if (!dir) return;
          const b = makeBuilding(key, t, dir);
          if (BTYPES[key].vein){ const v = nearestVein(dir, 14); if (v) b.vein = v.i; }
          finishSite(b);
        }, 'b:' + key);
      }
      for (const b of S.buildings) if (b.alive && b.team === t && !b.done) safe(() => finishSite(b), 'fin');
      if (typeof BASE70 !== 'undefined') for (const b of S.buildings) if (b.alive && b.team === t && b.type === 'outpost') safe(() => { const w = BASE70.tw(b); if (!w.br){ w.br = 'def'; } while (w.tier < 2){ w.job = { tier: w.tier + 1, t: 0, T: 0, cost: 0 }; BASE70.finish(b); } }, 'op');
      const near = m => surfacePoint(offsetOnSphere(BASES[t], anyTangent(BASES[t]), m), 1.5);
      safe(() => { for (let i = 0; i < 2; i++) spawnSquad(t, i === 1, near(45 + random() * 40)); }, 'sq');
      safe(() => { makeTank(near(60 + random() * 30), t); }, 'tank');
      if (typeof VK !== 'undefined') for (const k of Object.keys(VK)) safe(() => V2.make(near(55 + random() * 50), t, k), 'v:' + k);
      safe(() => { for (let i = 0; i < 2; i++){ const p = near(50 + random() * 30); makeDrone(add(p, mul(norm(p), 6)), t); } }, 'drone');
    }
    this.built = 4;
    feed(tr('Кино: всё построено и прокачано (обе армии)', 'Cinema: everything built and upgraded (both armies)', 'Điện ảnh: đã xây và nâng cấp tất cả', 'קולנוע: הכול בנוי ומשודרג'), '#ffd27a');
  },
  // ---------------- кнопки на экране (и для телефона — там нет клавиш)
  ui(){
    let el = document.getElementById('cine75');
    if (!OPER.on){ if (el) el.style.display = 'none'; return; }
    if (!el){
      el = document.createElement('div'); el.id = 'cine75'; document.body.appendChild(el);
      const go = e => { const b = e.target.closest('[data-c75]'); if (!b) return; e.preventDefault(); e.stopPropagation(); CINE75.act(b.dataset.c75); };
      el.addEventListener('mousedown', go); el.addEventListener('touchstart', go, { passive: false });
    }
    const h = `<button data-c75="split" class="${this.split ? 'on' : ''}">▥ ${tr('Сплитскрин', 'Split screen', 'Chia màn hình', 'מסך מפוצל')}${TOUCH.on ? '' : ' <kbd>S</kbd>'}</button>` +
      `<button data-c75="preset">★ ${tr('Всё построено', 'All built', 'Xây hết', 'הכול בנוי')}${TOUCH.on ? '' : ' <kbd>P</kbd>'}</button>` +
      `<button data-c75="exit">✕ ${tr('Меню', 'Menu', 'Menu', 'תפריט')}${TOUCH.on ? '' : ' <kbd>Esc</kbd>'}</button>`;
    if (el._h !== h){ el._h = h; el.innerHTML = h; }
    el.style.display = REC.active ? 'none' : 'flex';
  },
  act(a){
    AU.init();
    if (a === 'split'){ this.split = !this.split; this.save(); this.st = null; feed(this.split ? tr('Кино: сплитскрин — стратег слева, шутер справа', 'Cinema: split screen — strategist left, shooter right', 'Điện ảnh: chia đôi màn hình', 'קולנוע: מסך מפוצל') : tr('Кино: обычный оператор', 'Cinema: classic camera operator', 'Điện ảnh: máy quay thường', 'קולנוע: צלם רגיל'), '#d6c69a'); }
    else if (a === 'preset') this.preset();
    else if (a === 'exit'){ OPER.end(); MENU.show('main'); }
    this.ui();
  },
};
CINE75.init();
// оператор: в сплитскрине камера кадра — шутер (для звука, тумана и т. п.), стратег — вторая камера
{ const oc0 = OPER.camera;
  OPER.camera = function(dt){
    if (CINE75.on()){
      try {
        CINE75.cS = CINE75.camStrat(dt);
        const f = CINE75.camShooter(dt);
        if (f){ CINE75.cF = f; return f; }
      } catch (e){ if (CINE75.err++ < 4) console.warn('cine75 cam', e); }
      CINE75.cF = null;
    }
    return oc0.call(this, dt);
  }; }
{ const dc0 = OPER.drawCaptions;
  OPER.drawCaptions = function(g, W, H){
    if (CINE75.on() && W > H){ try { CINE75.drawSplit(g, W, H); } catch (e){ if (CINE75.err++ < 4) console.warn('cine75 draw', e); } }
    return dc0.call(this, g, W, H);
  }; }
{ const ob0 = OPER.begin; OPER.begin = function(o){ CINE75.st = null; CINE75.sh = null; CINE75.cS = CINE75.cF = null; const r = ob0.call(this, o); CINE75.ui(); return r; }; }
{ const oe0 = OPER.end; OPER.end = function(){ const r = oe0.call(this); CINE75.cS = CINE75.cF = null; CINE75.ui(); return r; }; }
addEventListener('keydown', e => {
  if (!OPER.on || MENU.isOpen() || e.repeat) return;
  if (e.code === 'KeyS'){ e.preventDefault(); e.stopImmediatePropagation(); CINE75.act('split'); }
  else if (e.code === 'KeyP'){ e.preventDefault(); e.stopImmediatePropagation(); CINE75.act('preset'); }
}, true);
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); if (OPER.on || document.getElementById('cine75')) CINE75.ui(); }; }
(function cine75CSS(){
  const st = document.createElement('style');
  st.textContent = `#cine75{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;display:none;gap:8px;pointer-events:auto}
  #cine75 button{pointer-events:auto;background:rgba(10,12,10,.72);border:1px solid rgba(214,198,154,.55);color:#efe6cc;font:600 12px "Exo 2",sans-serif;padding:6px 10px;cursor:pointer;border-radius:3px}
  #cine75 button.on{border-color:#ffd27a;color:#ffd27a} #cine75 kbd{font-size:9px;opacity:.7}
  body.touch #cine75{bottom:max(10px,env(safe-area-inset-bottom))} body.touch #cine75 button{min-height:40px;font-size:13px}`;
  document.head.appendChild(st);
})();
