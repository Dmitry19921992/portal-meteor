// =====================================================================
//  v7.2gfx — ГРАФИКА: обломки породы и пыль попаданий, опалины от взрывов (декали в шейдере),
//  новый огонь/дым, высотная дымка у грунта, дымка шва портала, цветокор «военная плёнка», анаморфные блики.
//  Переключатель: Настройки → «Графика/звук: v7.1 / новая» (SET.gfx72, по умолчанию новая).
//  Телефон и «низкое» качество: эффекты сцены выключены, остаётся только цветокор (дёшево).
//  Хуки в чужом коде: render.js (SCENE_U/POST_U, gatherParticles → GFX72.particles, render → GFX72.sceneU / GFX72.postK),
//  scene.glsl и post.glsl (всё под uG72). Остальное — обёртки здесь.
// =====================================================================
if (SET.gfx72 === undefined) SET.gfx72 = true;
// свой генератор случайных чисел: эффекты не сдвигают общий Math.random (симуляция боя одинакова в обоих режимах)
let G72S = 0x9e3779b9; const G72R = () => { G72S ^= G72S << 13; G72S ^= G72S >>> 17; G72S ^= G72S << 5; return (G72S >>> 0) / 4294967296; };
const G72U = () => { const z = G72R() * 2 - 1, a = G72R() * 6.2831853, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
const GFX72 = {
  deb: [], dust: [], scor: [], SC: new Float32Array(8 * 4), SH: new Float32Array(8), lastT: 0,
  stats: { deb: 0, dust: 0, scor: 0 },
  on(){ return SET.gfx72 !== false; },
  lite(){ return (typeof TOUCH !== 'undefined' && TOUCH.on) || S.quality === 0; },
  full(){ return this.on() && !this.lite(); },
  postK(){ return !this.on() ? 0 : this.lite() ? 0.5 : 1; },
  set(v){ SET.gfx72 = !!v; try { MENU.save(); } catch (e){} if (!v){ this.deb.length = 0; this.dust.length = 0; this.scor.length = 0; } },
  // ---- события боя → обломки, пыль, опалины
  events(dt){
    if (!this.full()){ this.deb.length = 0; this.dust.length = 0; return; }
    const cam = S.cam && S.cam.pos;
    for (const e of S.events){
      if (e.type === 'boom' && e.pos && cam){
        const dc = dist(e.pos, cam); if (dc > 260) continue;
        const sz = clamp(e.size || 1, 0.5, 8), up = norm(e.pos);
        const gr = groundR(up), h = len(e.pos) - gr;
        const n = min(18, floor(5 + sz * 3.5)) * (dc < 120 ? 1 : 0.5);
        for (let i = 0; i < n; i++){
          const v = add(mul(up, 3 + G72R() * 6 * sqrt(sz)), mul(G72U(), 3 + sz * 2.2));
          this.deb.push({ pos: add(e.pos, mul(G72U(), 0.3 * sz)), vel: v, gr, t: 0, life: 2.5 + G72R() * 3, heat: G72R() < 0.5 ? 0.6 + G72R() * 0.39 : 0.15, r: 0.05 + G72R() * 0.07 * sqrt(sz), b: 0 });
        }
        if (this.deb.length > 70) this.deb.splice(0, this.deb.length - 70);
        if (h < 2.5 + sz){
          const g = mul(up, gr);
          const t1 = anyTangent(up), t2 = cross(up, t1);
          for (let k = 0; k < 4; k++){   // пылевая «юбка» у земли
            const a = k * PI / 2 + G72R();
            const off = add(mul(t1, cos(a)), mul(t2, sin(a)));
            this.dust.push({ pos: add(add(g, mul(up, 0.4 + 0.2 * sz)), mul(off, 0.6 * sz)), vel: add(mul(off, 2.2 + sz), mul(up, 0.4)), t: 0, life: 2.6 + sz * 0.4, r0: 0.6 * sz, r1: 2.6 * sz + 1, dens: 0.9, grey: 0.34 });
          }
          this.scor.push({ pos: add(g, mul(up, -0.1)), r: 1.1 + sz * 1.05, t: 0 });
          if (this.scor.length > 24) this.scor.shift();
        }
      } else if (e.type === 'impact' && e.pos && !e.hit && e.cls !== 'prop' && cam && dist2(e.pos, cam) < 2500){
        if (this.dust.length < 26) this.dust.push({ pos: e.pos, vel: mul(norm(e.pos), 0.9), t: 0, life: 0.75, r0: 0.12, r1: 0.65, dens: 1.6, grey: 0.3 });
      }
    }
    if (this.dust.length > 30) this.dust.splice(0, this.dust.length - 30);
    // физика обломков: тяготение к центру, отскок от грунта (радиус грунта запомнен при взрыве)
    for (const d of this.deb){
      d.t += dt; d.heat *= Math.exp(-dt * 0.9);
      if (d.rest) continue;
      const up = norm(d.pos);
      d.vel = add(d.vel, mul(up, -9.5 * dt));
      d.pos = add(d.pos, mul(d.vel, dt));
      const r = len(d.pos);
      if (r < d.gr + d.r){
        d.pos = mul(up, d.gr + d.r);
        const vr = dot(d.vel, up);
        d.vel = add(mul(sub(d.vel, mul(up, vr)), 0.55), mul(up, -vr * 0.32));
        if (++d.b > 2 || len(d.vel) < 0.8) d.rest = true;
      }
    }
    this.deb = this.deb.filter(d => d.t < d.life);
    for (const p of this.dust){ p.t += dt; p.pos = add(p.pos, mul(p.vel, dt)); p.vel = mul(p.vel, Math.exp(-dt * 1.6)); }
    this.dust = this.dust.filter(p => p.t < p.life);
    for (const s of this.scor) s.t += dt;
    this.scor = this.scor.filter(s => s.t < 150);
  },
  particles(push, near){
    if (!this.full()) return;
    for (const d of this.dust){
      if (!near(d.pos, 200)) continue;
      const a = d.t / d.life;
      push(d.pos, lerp(d.r0, d.r1, sqrt(a)), [d.dens * Math.pow(1 - a, 1.5), d.grey, 0], 11);
    }
    for (const d of this.deb){
      if (!near(d.pos, 160)) continue;
      const v = d.rest ? mul(norm(d.pos), 0.04) : mul(d.vel, 0.018);
      push(d.pos, d.r, sub(d.pos, v), 12 + min(0.99, d.heat));
    }
    this.stats.deb = this.deb.length; this.stats.dust = this.dust.length;
  },
  sceneU(U){
    const f = this.full();
    gl.uniform1f(U.uG72, f ? 1 : 0);
    let n = 0;
    if (f && this.scor.length && S.cam){
      const c = S.cam.pos, L = this.scor.map(s => ({ s, d: min(dist(s.pos, c), dist(s.pos, mul(c, -1))) })).filter(o => o.d < 300).sort((a, b) => a.d - b.d);
      for (const { s } of L){
        if (n >= 8) break;
        this.SC.set([s.pos[0], s.pos[1], s.pos[2], s.r], n * 4);
        const h = max(0, 1 - s.t / 7); this.SH[n] = h * h; n++;
      }
    }
    gl.uniform4fv(U.uScor, this.SC); gl.uniform1fv(U.uScorH, this.SH); gl.uniform1i(U.uNSc, n);
    this.stats.scor = n;
  },
};
// кадр: события боя разбираем до рендера (S.events живут до следующего update)
{ const r0 = render;
  render = function(dt, now){
    try { GFX72.events(S.paused ? 0 : dt * (1 - 0.72 * (S.slow || 0))); } catch (e){ if (!GFX72.err){ GFX72.err = 1; console.warn('GFX72', e); } }
    r0(dt, now);
  }; }
// настройки телефона (☰ → Настройки → Графика): кнопка-переключатель (общий обработчик [data-tog] в menu.js)
if (typeof P71M !== 'undefined' && P71M.sec){
  const sec0 = P71M.sec;
  P71M.sec = function(k){
    const h = sec0.call(this, k);
    if (k !== 's_gfx') return h;
    const b = this.tog('gfx72', tr('Графика/звук: новая v7.2 (выкл — как v7.1)', 'Graphics/sound: new v7.2 (off — like v7.1)', 'Đồ họa/âm thanh: mới v7.2', 'גרפיקה/סאונד: חדש v7.2'));
    return h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + b);
  };
}
// настройки ПК: строка «Графика/звук: v7.1 / новая» (в блоке шутера — без правки menu.js)
if (typeof FPS61 !== 'undefined' && FPS61.settingsRows){
  const sr0 = FPS61.settingsRows;
  FPS61.settingsRows = function(row, ch){
    return row(tr('Графика и звук', 'Graphics & sound', 'Đồ họa & âm thanh', 'גרפיקה וסאונד'), ch('gfx72', [[false, 'v7.1'], [true, tr('новая v7.2', 'new v7.2', 'mới v7.2', 'חדש v7.2')]])) + sr0.call(this, row, ch);
  };
}
