// =====================================================================
//  v7.6 — РАЗРУШАЕМЫЙ МЕТЕОРИТ: ВОРОНКИ ОТ ВЗРЫВОВ
//  Рельеф — не меш, а функция расстояния (рэймарчинг), поэтому воронка меняет саму функцию рельефа:
//  JS mapStatic() (world.js, одна строка) и map() в scene.glsl (uniform uCr76) — одна и та же формула,
//  значит ходьба, гравитация (по нормали грунта), коллизии, groundR/surfacePoint (постановка юнитов и зданий),
//  тени и нормали видят новую поверхность сразу, без пересчёта вершин.
//  Профиль: s = расстояние от центра по поверхности / R;  Δh = −D·(1−s²)² + 0.3·D·exp(−9(s−1)²)  (яма + вал).
//  Делают воронки только крупные взрывы: артиллерия, «Град»/«Улей», миномёт, танковая пушка, ракеты пехоты (базука),
//  орбитальный удар, гранаты-бомбы катапульты. Пули, рельса, дрон — нет.
//  Бюджет: ПК 12 воронок, телефон / лёгкий режим / «Денди» — 6. Новая воронка рядом со старой сливается с ней
//  (растёт вглубь и вширь до предела), иначе вытесняет самую старую мелкую. Ни у баз, ни на точках захвата не копаем.
//  Выключить: localStorage pm_cr76 = '0' или ?cr76=0.
// =====================================================================
var CR76 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('cr76') === '0') return false; return localStorage.getItem('pm_cr76') !== '0'; } catch (e){ return true; } })(),
  n: 0, L: [], U: new Float32Array(12 * 4), UD: new Float32Array(12), stats: { made: 0, merged: 0, evicted: 0 },
  max(){ return (typeof TOUCH !== 'undefined' && TOUCH.on) || (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()) ? 6 : 12; },
  // смещение SDF в точке направления (nx,ny,nz) — d += dent  (>0 — грунт ниже)
  dent(nx, ny, nz){
    let s = 0;
    for (let i = 0; i < this.n; i++){
      const c = this.L[i], qx = nx * c.rc - c.p[0], qy = ny * c.rc - c.p[1], qz = nz * c.rc - c.p[2];
      const s2 = qx * qx + qy * qy + qz * qz, R2 = c.r * c.r;
      if (s2 >= R2 * 2.9) continue;
      const u = Math.sqrt(s2) / c.r, b = Math.max(0, 1 - u * u), e = u - 1;
      s += c.D * (b * b - 0.3 * Math.exp(-e * e * 9));
    }
    return s;
  },
  // размер воронки по взрыву: радиус поражения → радиус воронки, глубина
  size(radius, dmg){ return { r: clamp(radius * 0.62, 1.6, 6.5), D: clamp(0.18 * radius + dmg * 0.004, 0.45, 2.4) }; },
  allowed(dir){
    for (const b of BASES) if (dot(dir, b) > PAD_B[0] - 0.004) return false;   // у штабов не копаем (стройка, обучение)
    for (const c of CPD) if (dot(dir, c) > PAD_C[0] - 0.0015) return false;     // и на площадках точек захвата
    return true;
  },
  add(p, radius, dmg){
    if (!this.on) return null;
    const dir = norm(p);
    if (!this.allowed(dir)) return null;
    const g = groundR(dir);
    if (len(p) - g > max(2.5, radius * 0.6)) return null;   // взрыв в воздухе — без воронки
    const { r, D } = this.size(radius, dmg);
    const pos = mul(dir, g);
    // слияние со старой воронкой рядом
    for (const c of this.L){
      if (dist(c.p, pos) < (c.r + r) * 0.6){
        const w = r / (c.r + r);
        c.p = mul(norm(add(mul(c.p, 1 - w), mul(pos, w))), c.rc);
        c.r = min(9, Math.hypot(c.r, r * 0.7)); c.D = min(c.r * 0.3, c.D + D * 0.45); c.t = S.time;
        this.stats.merged++; this.dirty(c); return c;
      }
    }
    const M = this.max();
    if (this.L.length >= M){
      let k = 0, best = 1e9;
      // вытесняем дальнюю от камеры (и старую): рядом с игроком воронки не пропадают на глазах
      const cp = S.cam ? S.cam.pos : pos, ca = mul(cp, -1);
      this.L.forEach((c, i) => { const sc = -min(dist(c.p, cp), dist(c.p, ca)) - (S.time - c.t) * 0.3 + c.D * c.r; if (sc < best){ best = sc; k = i; } });
      this.L.splice(k, 1); this.stats.evicted++;
    }
    const c = { p: pos, rc: g, r, D: min(D, r * 0.3), t: S.time };
    this.L.push(c); this.stats.made++;
    this.sync(); this.dirty(c);
    return c;
  },
  sync(){
    this.n = this.L.length;
    this.U.fill(0); this.UD.fill(0);
    this.L.forEach((c, i) => { this.U.set([c.p[0], c.p[1], c.p[2], c.r], i * 4); this.UD[i] = c.D; });
  },
  // после изменения рельефа: юниты/обломки/здания встают на новый грунт, кэш краёв шахт — сброс
  dirty(c){
    this.sync();
    if (typeof FPS61 !== 'undefined') FPS61._rim = {};
    const R = c.r * 1.8 + 2;
    for (const L of [S.units, S.vehicles, S.builders, S.wrecks]) for (const e of L){
      if (!e || !e.pos || dist(e.pos, c.p) > R) continue;
      e.grounded = false;   // physStep сам опустит в воронку (гравитация) или вытолкнет на вал (collide)
    }
    for (const b of S.buildings){
      if (!b.alive || dist(b.pos, c.p) > R + b.rad) continue;
      const gr = groundR(b.up); b.pos = mul(b.up, gr - 0.05); bgridDirty();   // здание оседает вместе с грунтом
    }
    for (const p of PROPS){
      if (!p.alive || dist(p.pos, c.p) > R + 2) continue;
      const gr = groundR(p.dir); p.pos = mul(p.dir, gr - PROP_KINDS[p.kind].sink);
    }
    buildPropGrid();
  },
  reset(){ this.L = []; this.sync(); },
  // крупные взрывы: тип снаряда и радиус
  big(ptype, radius){ return radius >= 3 && ptype !== 'b' && ptype !== 'm' && ptype !== 'l' && ptype !== 'f'; },
};
{ const sp0 = splash;
  splash = function(p, team, dmg, radius, src, ptype){
    const r = sp0.apply(this, arguments);
    // ручные гранаты пехоты — без воронок (только ракеты / артиллерия / снаряды / мины / бомбы)
    const hand = ptype === 'g' && src && src.cls === 'inf';
    try { if (!hand && CR76.big(ptype || 'g', radius) && dmg >= 40) CR76.add(p, radius, dmg); } catch (e){ if (!CR76.err){ CR76.err = 1; console.warn('CR76', e); } }
    return r;
  }; }
{ const nm0 = newMatch; newMatch = function(){ CR76.reset(); return nm0.apply(this, arguments); }; }
// сохранение: воронки — в отдельном ключе рядом со слотом (формат сохранения не меняем)
{ const sv0 = SAVE.save;
  SAVE.save = function(slot){ const ok = sv0.apply(this, arguments); try { if (ok) localStorage.setItem(this.keyOf(slot) + ':cr76', JSON.stringify(CR76.L)); } catch (e){} return ok; };
  const ld0 = SAVE.load;
  SAVE.load = function(slot){ const ok = ld0.apply(this, arguments); try { if (ok){ const s = localStorage.getItem(this.keyOf(slot || this.newest()) + ':cr76'); CR76.L = s ? JSON.parse(s) : []; CR76.sync(); buildPropGrid(); } } catch (e){} return ok; }; }
// шейдер
SCENE_U.push('uCr76', 'uCr76D', 'uNCr76');
if (typeof GFX72 !== 'undefined'){ const su0 = GFX72.sceneU;
  GFX72.sceneU = function(U){ su0.apply(this, arguments); if (U.uNCr76){ gl.uniform4fv(U.uCr76, CR76.U); gl.uniform1fv(U.uCr76D, CR76.UD); gl.uniform1i(U.uNCr76, CR76.n); } }; }
