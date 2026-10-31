// =====================================================================
//  v8.1 — «ЖИВОЙ МЕТЕОРИТ», этап 1: РЕЛЬЕФ и ОЗЁРА (TER81)
//  Всё — в той же формуле расстояния (SDF), что и рельеф: JS mapStatic (world.js, одна строка // v81) и map() в scene.glsl
//  (одна строка). Поэтому ходьба, коллизии, groundR/surfacePoint, тени, нормали и воронки видят скалы сразу.
//   • гряды (полилинии-«стены» со скосом и сколами), скалы-останцы («ворота»), столовая гора с АНГАРОМ (укрытие:
//     урон от взрывов снаружи ×0.3), трещины (на концах — пандусы, из трещины можно выехать), широкий каньон;
//   • озёра: ЛАВА (свечение, урон, искры/дым), ЛЁД (скольжение), МЕТАН (туман; взрывается от огня/взрывов, потом туман
//     восстанавливается), «лавовая река» — трещина с лавой на дне;
//   • карта честная: каждая деталь повторена в антиподе (точка −p), как воронки-кратеры v1;
//   • штабы, точки захвата, стартовые зоны, жилы и аномалии — не тронуты (детали далеко, 3D-модели/обломки в скалах убираются);
//   • ИИ объезжает скалы, трещины, лаву и горящий напалм (рулёжка поверх обычной; игрок — не трогаем);
//   • графика: на «Низкой» (S.quality 0 / лёгкий режим) — меньше искр/дыма, туман метана реже, озёра без второй октавы.
//  Хуки — обёртки: shaderConsts, startProgram, GFX72.sceneU, genProps, physStep, splash, damage, CR76.allowed,
//  AS75.free, A78.freeAt, gatherLights, update, newMatch. Выключить: ?ter81=0 или localStorage pm_ter81 = '0'.
// =====================================================================
var TER81 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('ter81') === '0') return false; return localStorage.getItem('pm_ter81') !== '0'; } catch (e){ return true; } })(),
  ready: false, F: [], OB: [], LAKES: [], HANG: [], mk: 1, err: {}, meth: [1, 1], methT: [0, 0], fxT: 0, lt: null, warnT: 0,
  stats: { lava: 0, ice: 0, methBoom: 0, steer: 0, cover: 0, propsOut: 0, assetsOut: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('TER81 ' + tag, e); } } },
  low(){ return S.quality === 0 || (typeof LITE73 !== 'undefined' && LITE73.on) || (typeof DEN75 !== 'undefined' && DEN75.active && DEN75.active()); },
  // ------------------------------------------------------------------ карта деталей (север; юг — антипод)
  DEF: {
    ridges: [ { pts: [[40, -12], [50, -4], [61, -10]], W0: 8, Wk: 0.3, H: 15 },
              { pts: [[28, 238], [38, 246], [50, 242]], W0: 7, Wk: 0.32, H: 13 } ],
    spires: [ { c: [64, 82], Rb: 10, Rt: 3.5, H: 32 }, { c: [64, 100], Rb: 9, Rt: 3, H: 26 } ],
    mesas:  [ { c: [46, 20], Rb: 18, Rt: 15.5, H: 14, hangar: 1 } ],
    lakes:  [ { c: [18, 52], R: 24, kind: 'lava' }, { c: [30, 135], R: 28, kind: 'ice' }, { c: [44, 305], R: 24, kind: 'meth' } ],
    cracks: [ { a: [20, 55], b: [30, 70], w0: 2.6, s: 0.35, D: 6, lava: 1 },
              { a: [36, 296], b: [28, 288], w0: 1.6, s: 0.25, D: 9 },
              { a: [10, 158], b: [26, 162], w0: 6, s: 0.65, D: 12, canyon: 1 } ],
  },
  g0(dir){ const r = this.ready; this.ready = false; try { return groundR(dir); } finally { this.ready = r; } },
  east(lon){ lon *= D2R; return norm([-Math.sin(lon), 0, Math.cos(lon)]); },
  build(){
    if (this.ready || !this.on) return;
    const F = [], OB = [], D = this.DEF;
    const seg = (A, B, extra) => {
      const A3 = mul(A, RM), B3 = mul(B, RM), AB = sub(B3, A3), L2 = dot(AB, AB);
      return Object.assign({ A3, AB, il2: 1 / L2, len: Math.sqrt(L2), gA: this.g0(A), gB: this.g0(B) }, extra);
    };
    for (const s of [1, -1]){
      const M = d => s > 0 ? d : mul(d, -1), LL = (la, lo) => M(dirLL(la, lo)), hemi = s;
      D.ridges.forEach((rd, gi) => {
        const P = rd.pts.map(([a, b]) => LL(a, b)), grp = 'r' + gi + s;
        for (let i = 0; i + 1 < P.length; i++){
          const f = seg(P[i], P[i + 1], { type: 'ridge', hemi, W0: rd.W0, Wk: rd.Wk, H: rd.H, grp });
          const mid = norm(add(P[i], P[i + 1])); f.bc = mul(mid, (f.gA + f.gB) / 2 + rd.H * 0.4); f.br = f.len / 2 + rd.W0 + rd.H + 14;
          F.push(f); OB.push({ seg: 1, A3: f.A3, AB: f.AB, il2: f.il2, W: rd.W0 + 2.5, grp, GA: P[0], GB: P[P.length - 1], c: mid, hard: 0 });
        }
      });
      for (const sp of [...D.spires, ...D.mesas]){
        const c = LL(sp.c[0], sp.c[1]), g0 = this.g0(c), f = { type: sp.hangar ? 'mesa' : 'spire', hemi, c, g0, Rb: sp.Rb, Rt: sp.Rt, H: sp.H };
        f.bc = mul(c, g0 + sp.H * 0.4); f.br = Math.hypot(sp.Rb, sp.H) + 16;
        if (sp.hangar){
          const fw = tangent(M(this.east(sp.c[1])), c), ent = offsetOnSphere(c, fw, sp.Rb), gE = this.g0(ent);
          const h = { O: mul(c, gE), U: c, Fw: fw, Rt: norm(cross(fw, c)), mesa: f };
          f.h = h; this.HANG.push(h); f.br += 6;
        }
        F.push(f); OB.push({ c, W: sp.Rb + 2.5, hard: 0 });
      }
      for (const lk of D.lakes){
        const c = LL(lk.c[0], lk.c[1]); let lo = this.g0(c);
        const t1 = anyTangent(c), t2 = cross(c, t1);
        for (let k = 0; k < 8; k++){ const a = k * PI / 4; lo = min(lo, this.g0(offsetOnSphere(c, add(mul(t1, cos(a)), mul(t2, sin(a))), lk.R * 0.6))); }
        const f = { type: 'lake', hemi, c, R: lk.R, L: lo - 1.2, kind: lk.kind, cb: cos((lk.R + 2) / RM), id: this.LAKES.length };
        F.push(f); this.LAKES.push(f);
        if (lk.kind === 'lava') OB.push({ c, W: lk.R * 0.85, hard: 1, lava: 1 });
      }
      for (const cr of D.cracks){
        const A = LL(cr.a[0], cr.a[1]), B = LL(cr.b[0], cr.b[1]);
        const f = seg(A, B, { type: 'crack', hemi, w0: cr.w0, s: cr.s, D: cr.D, lava: cr.lava ? 1 : 0, canyon: cr.canyon ? 1 : 0 });
        f.kk = 1 / Math.sqrt(1 + cr.s * cr.s);
        const mid = norm(add(A, B)); f.bc = mul(mid, (f.gA + f.gB) / 2 - cr.D * 0.3); f.br = f.len / 2 + cr.w0 + cr.s * cr.D + cr.D + 8;
        F.push(f); OB.push({ seg: 1, A3: f.A3, AB: f.AB, il2: f.il2, W: cr.w0 + cr.s * cr.D * 0.6 + 2, grp: 'c' + F.length, GA: A, GB: B, c: mid, hard: 1, crack: 1, lava: f.lava });
      }
    }
    for (const o of OB){ o.cb = cos(((o.seg ? Math.sqrt(1 / o.il2) / 2 : 0) + o.W + 40) / RM); if (o.seg){ o.GAB = sub(mul(o.GB, RM), mul(o.GA, RM)); o.Gil2 = 1 / dot(o.GAB, o.GAB); o.GA3 = mul(o.GA, RM); } }
    for (const f of F) f.br2 = f.br * f.br;
    this.F = F; this.OB = OB; this.ready = true;
  },
  // ------------------------------------------------------------------ SDF (та же формула — в шейдере, см. glslMap)
  crag(x, y, z){ return 0.7 * sin(0.43 * x + 0.9 * sin(0.21 * z)) * sin(0.39 * z + 0.31 * y) + 0.35 * sin(0.83 * y + 0.57 * x); },
  smin(a, b, k){ const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); },
  segLT(f, nx, ny, nz){
    const qx = nx * RM - f.A3[0], qy = ny * RM - f.A3[1], qz = nz * RM - f.A3[2];
    const t = clamp((qx * f.AB[0] + qy * f.AB[1] + qz * f.AB[2]) * f.il2, 0, 1);
    let vx = qx - f.AB[0] * t, vy = qy - f.AB[1] * t, vz = qz - f.AB[2] * t; const vn = vx * nx + vy * ny + vz * nz;
    vx -= nx * vn; vy -= ny * vn; vz -= nz * vn;
    this._t = t; return Math.hypot(vx, vy, vz);
  },
  rockOf(f, x, y, z, r, nx, ny, nz){
    if (f.type === 'ridge'){
      const l = this.segLT(f, nx, ny, nz), t = this._t, yy = r - (f.gA + (f.gB - f.gA) * t), H = f.H * (0.6 + 0.4 * sin(PI * t));
      this._y = yy; return max(max(l - f.W0 + f.Wk * max(yy, 0), yy - H) + 0.8 * this.crag(x, y, z), -yy - 40) * 0.8;
    }
    const c = f.c, cd = nx * c[0] + ny * c[1] + nz * c[2], l = RM * Math.sqrt(max(0, 1 - cd * cd)), yy = r - f.g0;
    const R = f.Rb + (f.Rt - f.Rb) * clamp(yy / f.H, 0, 1) + (f.type === 'spire' ? 0.7 * sin(yy * 0.8) : 0);   // у скал — уступы
    this._y = yy; return max(max(l - R, yy - f.H) + (f.type === 'mesa' ? 0.55 : 0.8) * this.crag(x, y, z), -yy - 40) * 0.8;
  },
  hang(h, x, y, z){
    const qx = x - h.O[0], qy = y - h.O[1], qz = z - h.O[2];
    const hx = qx * h.Rt[0] + qy * h.Rt[1] + qz * h.Rt[2], hy = qx * h.U[0] + qy * h.U[1] + qz * h.U[2], hz = qx * h.Fw[0] + qy * h.Fw[1] + qz * h.Fw[2];
    return [hx, hy, hz];
  },
  sdf(x, y, z, r, nx, ny, nz, d){
    this.mk = 1;
    if (!this.ready) return d;
    const F = this.F;
    for (let i = 0; i < F.length; i++){
      const f = F[i];
      if (f.hemi > 0 ? ny < -0.08 : ny > 0.08) continue;
      if (f.type === 'lake'){
        const cd = nx * f.c[0] + ny * f.c[1] + nz * f.c[2]; if (cd < f.cb) continue;
        const lr = RM * Math.sqrt(max(0, 1 - cd * cd)), w = 1 - smoothstep(f.R * 0.62, f.R, lr);
        d = d + (r - f.L - d) * w; this.mk *= 1 - w; continue;
      }
      const bx = x - f.bc[0], by = y - f.bc[1], bz = z - f.bc[2];
      if (bx * bx + by * by + bz * bz > f.br2) continue;
      if (f.type === 'crack'){
        const l = this.segLT(f, nx, ny, nz), t = this._t, yy = r - (f.gA + (f.gB - f.gA) * t);
        const Dt = f.D * smoothstep(0, 0.3, t) * (1 - smoothstep(0.7, 1, t)), hp = yy + Dt;
        const inn = max((l - f.w0 - f.s * max(hp, 0)) * f.kk, -hp);
        d = max(d, -inn);
        if (f.lava && inn < 0.5) this.mk *= smoothstep(0.4, 1.6, hp);
        continue;
      }
      const rk = this.rockOf(f, x, y, z, r, nx, ny, nz);
      d = this.smin(d, rk, 2.0);
      if (f.h){
        const [hx, hy, hz] = this.hang(f.h, x, y, z);
        const cav = sdBox3(hx, hy - 3.4, hz - 9.0, 6.2, 3.4, 10.5);
        d = max(d, -cav);
        const fr = min(sdBox3(abs(hx) - 6.9, hy - 3.7, hz - 18.2, 0.7, 3.7, 0.8), sdBox3(hx, hy - 7.3, hz - 18.2, 7.6, 0.5, 0.8));
        const fl = sdBox3(hx, hy + 0.7, hz - 9.5, 6.2, 0.7, 11.0);
        d = min(d, fr, fl);
        this.mk *= smoothstep(0, 1, cav);
      }
    }
    return d;
  },
  // ------------------------------------------------------------------ шейдер: та же формула (константы вписаны в код — без uniform-массивов)
  glslMap(){
    const v = a => `vec3(${f5(a)})`, n4 = x => (+x).toFixed(4);
    const blk = { 1: [], '-1': [] };
    for (const f of this.F){
      let c = '';
      if (f.type === 'lake'){
        c = `{ float cd = dot(n, ${v(f.c)}); if (cd > ${n4(f.cb)}){ float lr = RM * sqrt(max(0.0, 1.0 - cd * cd)); float w = 1.0 - smoothstep(${n4(f.R * 0.62)}, ${n4(f.R)}, lr); d = mix(d, r - ${n4(f.L)}, w); mask *= 1.0 - w; } }`;
      } else {
        const bnd = `vec3 bq = p - ${v(f.bc)}; float b2 = dot(bq, bq); if (b2 < ${n4(f.br2)})`;
        if (f.type === 'crack'){
          c = `{ ${bnd}{ float t; float l = seg81(n, ${v(f.A3)}, ${v(f.AB)}, ${(f.il2).toExponential(6)}, t); float y = r - (${n4(f.gA)} + ${n4(f.gB - f.gA)} * t);
    float hp = y + ${n4(f.D)} * smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.7, 1.0, t)); float inn = max((l - ${n4(f.w0)} - ${n4(f.s)} * max(hp, 0.0)) * ${n4(f.kk)}, -hp);
    d = max(d, -inn);${f.lava ? ' if (inn < 0.5) mask *= smoothstep(0.4, 1.6, hp);' : ''} } }`;
        } else {
          let rock;
          if (f.type === 'ridge') rock = `float t; float l = seg81(n, ${v(f.A3)}, ${v(f.AB)}, ${(f.il2).toExponential(6)}, t); float y = r - (${n4(f.gA)} + ${n4(f.gB - f.gA)} * t); float H = ${n4(f.H)} * (0.6 + 0.4 * sin(3.14159265 * t));
    float rk = max(max(l - ${n4(f.W0)} + ${n4(f.Wk)} * max(y, 0.0), y - H) + 0.8 * crag81(p), -y - 40.0) * 0.8;`;
          else rock = `float cd = dot(n, ${v(f.c)}); float l = RM * sqrt(max(0.0, 1.0 - cd * cd)); float y = r - ${n4(f.g0)};
    float rk = max(max(l - (${n4(f.Rb)} + ${n4(f.Rt - f.Rb)} * clamp(y / ${n4(f.H)}, 0.0, 1.0)${f.type === 'spire' ? ' + 0.7 * sin(y * 0.8)' : ''}), y - ${n4(f.H)}) + ${f.type === 'mesa' ? '0.55' : '0.8'} * crag81(p), -y - 40.0) * 0.8;`;
          let hg = '';
          if (f.h){ const h = f.h;
            hg = `
    vec3 hq = p - ${v(h.O)}; vec3 hl = vec3(dot(hq, ${v(h.Rt)}), dot(hq, ${v(h.U)}), dot(hq, ${v(h.Fw)}));
    float cav = box81(hl - vec3(0.0, 3.4, 9.0), vec3(6.2, 3.4, 10.5)); d = max(d, -cav);
    float fr = min(box81(vec3(abs(hl.x) - 6.9, hl.y - 3.7, hl.z - 18.2), vec3(0.7, 3.7, 0.8)), box81(hl - vec3(0.0, 7.3, 18.2), vec3(7.6, 0.5, 0.8)));
    d = min(d, min(fr, box81(hl - vec3(0.0, -0.7, 9.5), vec3(6.2, 0.7, 11.0)))); mask *= smoothstep(0.0, 1.0, cav);`; }
          c = `{ ${bnd}{ ${rock}
    d = smin81(d, rk, 2.0);${hg} } else { float e = d + ${n4(f.br - 12.5)}; if (b2 < e * e) d = min(d, sqrt(b2) - ${n4(f.br - 12.5)}); } }`;
        }
      }
      blk[f.hemi].push(c);
    }
    return `
// ---- v8.1 TER81: скалы, гряды, ангар, трещины, озёра (= TER81.sdf в v81_terrain.js)
uniform vec2 uMeth81;
float nz(vec3 p);
float crag81(vec3 p){ return 0.7 * sin(0.43 * p.x + 0.9 * sin(0.21 * p.z)) * sin(0.39 * p.z + 0.31 * p.y) + 0.35 * sin(0.83 * p.y + 0.57 * p.x); }
float smin81(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float box81(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float seg81(vec3 n, vec3 A, vec3 AB, float il2, out float t){ vec3 q = n * RM - A; t = clamp(dot(q, AB) * il2, 0.0, 1.0); vec3 v = q - AB * t; v -= n * dot(v, n); return length(v); }
float ter81(vec3 p, vec3 n, float r, float d, inout float mask){
  if (n.y > -0.08){
  ${blk[1].join('\n  ')}
  }
  if (n.y < 0.08){
  ${blk[-1].join('\n  ')}
  }
  return d;
}
void ter81mat(vec3 p, vec3 rn, vec3 n, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump);
vec3 fog81(vec3 o, vec3 d, float tH, vec3 c);
`;
  },
  // материалы и туман — в конце шейдера (там уже видны nz, SUN1, C1 …)
  glslTail(){
    const v = a => `vec3(${f5(a)})`, n4 = x => (+x).toFixed(4);
    const blk = { 1: [], '-1': [] };
    for (const f of this.F){
      let c = '';
      if (f.type === 'lake'){
        const k = f.kind === 'lava' ? 0 : f.kind === 'ice' ? 1 : 2;
        c = `{ float cd = dot(rn, ${v(f.c)}); if (cd > ${n4(f.cb)}){ float lr = RM * sqrt(max(0.0, 1.0 - cd * cd)); float w = (1.0 - smoothstep(${n4(f.R * 0.62)}, ${n4(f.R * 0.9)}, lr)) * (1.0 - smoothstep(0.15, 0.45, abs(r - ${n4(f.L)}))); if (w > 0.001) liq81(${k}, p, w, alb, em, sp, bump); } }`;
      } else {
        const bnd = `vec3 bq = p - ${v(f.bc)}; if (dot(bq, bq) < ${n4(f.br2)})`;
        if (f.type === 'crack'){
          c = `{ ${bnd}{ float t; float l = seg81(rn, ${v(f.A3)}, ${v(f.AB)}, ${(f.il2).toExponential(6)}, t); float y = r - (${n4(f.gA)} + ${n4(f.gB - f.gA)} * t);
    float hp = y + ${n4(f.D)} * smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.7, 1.0, t)); float wl = l - ${n4(f.w0)} - ${n4(f.s)} * max(hp, 0.0);
    if (wl < 1.5 && y < 0.5){ float k = (1.0 - smoothstep(-0.5, 1.5, wl)) * smoothstep(0.5, -2.0, y); alb *= 1.0 - 0.45 * k; alb = mix(alb, vec3(0.12, 0.10, 0.09), 0.5 * k);${f.lava ? ` if (hp < 0.9) liq81(0, p, (1.0 - smoothstep(0.3, 0.9, hp)), alb, em, sp, bump); else em += vec3(2.0, 0.5, 0.08) * k * exp(-hp * 0.6) * 0.5;` : ''} } } }`;
        } else {
          let rock;
          if (f.type === 'ridge') rock = `float t; float l = seg81(rn, ${v(f.A3)}, ${v(f.AB)}, ${(f.il2).toExponential(6)}, t); float y = r - (${n4(f.gA)} + ${n4(f.gB - f.gA)} * t); float H = ${n4(f.H)} * (0.6 + 0.4 * sin(3.14159265 * t));
    float rk = max(max(l - ${n4(f.W0)} + ${n4(f.Wk)} * max(y, 0.0), y - H) + 0.8 * crag81(p), -y - 40.0) * 0.8;`;
          else rock = `float cd = dot(rn, ${v(f.c)}); float l = RM * sqrt(max(0.0, 1.0 - cd * cd)); float y = r - ${n4(f.g0)};
    float rk = max(max(l - (${n4(f.Rb)} + ${n4(f.Rt - f.Rb)} * clamp(y / ${n4(f.H)}, 0.0, 1.0)${f.type === 'spire' ? ' + 0.7 * sin(y * 0.8)' : ''}), y - ${n4(f.H)}) + ${f.type === 'mesa' ? '0.55' : '0.8'} * crag81(p), -y - 40.0) * 0.8;`;
          let hg = '';
          if (f.h){ const h = f.h;
            hg = ` vec3 hq = p - ${v(h.O)}; hang81(vec3(dot(hq, ${v(h.Rt)}), dot(hq, ${v(h.U)}), dot(hq, ${v(h.Fw)})), alb, em, sp, bump);`; }
          c = `{ ${bnd}{ ${rock}
    if (rk < 1.8) rock81(rk, y, p, slope, alb, em, sp);${hg} } }`;
        }
      }
      blk[f.hemi].push(c);
    }
    const M = this.LAKES.filter(l => l.kind === 'meth');
    const fogs = M.map((l, i) => `c = meth81(o, d, tH, c, ${v(mul(l.c, l.L + 2.5))}, ${v(l.c)}, ${n4(l.R * 1.35)}, uMeth81.${i ? 'y' : 'x'});`).join('\n  ');
    return `
// ---- v8.1 TER81: материалы скал, ангара, трещин, озёр; туман метана
void rock81(float rk, float y, vec3 p, float slope, inout vec3 alb, inout vec3 em, inout float sp){
  float w = (1.0 - smoothstep(-0.4, 1.8, rk)) * (0.4 + 0.6 * smoothstep(0.06, 0.35, slope));
  float st = 0.5 + 0.5 * sin(y * 1.7 + 2.6 * nz(p * 0.08));
  vec3 rc = mix(vec3(0.21, 0.155, 0.12), vec3(0.10, 0.085, 0.08), st) * (0.78 + 0.44 * nz(p * 0.21));
  alb = mix(alb, rc, w); sp = mix(sp, 0.07, w); em *= 1.0 - 0.9 * w;   // рудные полосы рельефа на скалах не светятся
}
void liq81(int k, vec3 p, float w, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){
  if (k == 0){   // лава: тёмная корка, светящиеся разломы, пульсация
    float a = nz(p * 0.035 + vec3(0.0, uTime * 0.012, 0.0));
    if (uQ > 0) a = 0.65 * a + 0.35 * nz(p * 0.11 - vec3(uTime * 0.02, 0.0, 0.0));
    float cr = 1.0 - smoothstep(0.0, 0.07, abs(a - 0.5));   // светящиеся разломы — по изолиниям шума
    float pul = 0.75 + 0.25 * sin(uTime * 1.6 + dot(p, vec3(0.21, 0.17, 0.13)));
    alb = mix(alb, vec3(0.03, 0.02, 0.018), w);
    em += vec3(3.6, 1.0, 0.16) * w * (0.07 + 1.5 * cr * cr) * pul;
    sp = mix(sp, 0.05, w);
  } else if (k == 1){   // лёд: голубой, блестящий, с трещинами
    float c = smoothstep(0.46, 0.5, abs(nz(p * 0.12) - 0.5));
    vec3 ic = mix(vec3(0.46, 0.58, 0.72), vec3(0.72, 0.8, 0.88), 0.5 * nz(p * 0.05) + 0.5 * c);
    alb = mix(alb, ic, w); sp = mix(sp, 0.85, w);
  } else {   // метан: тёмная жидкость, редкие пузыри
    alb = mix(alb, vec3(0.022, 0.055, 0.05), w); sp = mix(sp, 0.7, w);
    em += vec3(0.05, 0.3, 0.14) * w * smoothstep(0.82, 0.95, nz(p * 0.3 + vec3(0.0, uTime * 0.06, 0.0))) * 0.7;
  }
  bump *= 1.0 - 0.9 * w;
}
void hang81(vec3 hl, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){
  if (hl.z < -2.0 || hl.z > 21.0 || abs(hl.x) > 8.6 || hl.y < -1.5 || hl.y > 8.2) return;
  float cav = box81(hl - vec3(0.0, 3.4, 9.0), vec3(6.2, 3.4, 10.5));
  float fr = min(box81(vec3(abs(hl.x) - 6.9, hl.y - 3.7, hl.z - 18.2), vec3(0.7, 3.7, 0.8)), box81(hl - vec3(0.0, 7.3, 18.2), vec3(7.6, 0.5, 0.8)));
  float fl = box81(hl - vec3(0.0, -0.7, 9.5), vec3(6.2, 0.7, 11.0));
  if (min(abs(cav), min(fr, fl)) > 0.3) return;
  vec2 g = abs(fract(vec2(hl.x + hl.y, hl.z) / 2.5) - 0.5);
  vec3 cc = vec3(0.30, 0.295, 0.28) * (0.85 + 0.3 * nz(hl * 0.4)) * (1.0 - 0.35 * smoothstep(0.46, 0.5, max(g.x, g.y)));
  if (fr < 0.3){ float s = step(0.5, fract((hl.y + abs(hl.x)) * 0.45)); cc = mix(vec3(0.03), vec3(0.85, 0.42, 0.08), s); if (hl.y > 7.5 && abs(abs(hl.x) - 7.0) < 0.6) em += vec3(3.0, 0.15, 0.05) * (0.6 + 0.4 * sin(uTime * 5.0)); }
  if (hl.y < 0.05 && fl < 0.3){ if (abs(abs(hl.x) - 5.2) < 0.18) cc = vec3(0.8, 0.62, 0.08); if (hl.z > 17.0 && step(0.5, fract((hl.x + hl.z) * 0.5)) > 0.5) cc = vec3(0.75, 0.55, 0.06); }
  if (hl.y > 6.3 && abs(hl.x) < 0.7 && cav > -0.3) em += vec3(2.4, 2.2, 1.8) * step(fract(hl.z / 3.5), 0.62);
  alb = cc; sp = 0.12; bump *= 0.25;
}
void ter81mat(vec3 p, vec3 rn, vec3 n, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){
  float r = length(p);
  if (rn.y > -0.08){
  ${blk[1].join('\n  ')}
  }
  if (rn.y < 0.08){
  ${blk[-1].join('\n  ')}
  }
}
vec3 meth81(vec3 o, vec3 d, float tH, vec3 c, vec3 C, vec3 U, float R, float k){
  if (k < 0.01) return c;
  vec3 oc = o - C; vec3 o2 = oc + U * dot(oc, U) * 2.0, d2 = d + U * dot(d, U) * 2.0;   // эллипсоид R×R×R/3
  float a = dot(d2, d2), b = dot(o2, d2), cc = dot(o2, o2) - R * R, disc = b * b - a * cc;
  if (disc <= 0.0) return c;
  float s = sqrt(disc), t0 = max((-b - s) / a, 0.0), t1 = min((-b + s) / a, tH);
  if (t1 <= t0) return c;
  float sw = 0.8 + 0.4 * nz(o * 0.02 + d * (t0 + t1) * 0.01 + vec3(uTime * 0.015));
  float am = (1.0 - exp(-(t1 - t0) * 0.03 * k * sw)) * (uQ == 0 ? 0.65 : 1.0);
  vec3 fc = vec3(0.07, 0.09, 0.055) + (C1 * max(dot(U, SUN1), 0.0) + C2 * max(dot(U, SUN2), 0.0)) * vec3(0.05, 0.065, 0.035);
  return mix(c, fc, am);
}
vec3 fog81(vec3 o, vec3 d, float tH, vec3 c){
  ${fogs}
  return c;
}
`;
  },
  // ------------------------------------------------------------------ геймплей: что под ногами
  lakeAt(p){
    if (!this.ready) return null;
    const r = len(p), n = mul(p, 1 / r);
    for (const f of this.LAKES){
      const cd = dot(n, f.c); if (cd < cos(f.R * 0.9 / RM)) continue;
      if (r - f.L < 2.2) return f;
    }
    return null;
  },
  inLavaCrack(p){
    if (!this.ready) return false;
    const r = len(p), n = mul(p, 1 / r);
    for (const f of this.F){
      if (f.type !== 'crack' || !f.lava || dist2(p, f.bc) > f.br2) continue;
      const l = this.segLT(f, n[0], n[1], n[2]), t = this._t, y = r - (f.gA + (f.gB - f.gA) * t);
      const hp = y + f.D * smoothstep(0, 0.3, t) * (1 - smoothstep(0.7, 1, t));
      if (hp < 1.8 && l < f.w0 + 1 && f.D * smoothstep(0, 0.3, t) * (1 - smoothstep(0.7, 1, t)) > 1.5) return true;
    }
    return false;
  },
  inHangar(p){
    for (const h of this.HANG){
      if (dist2(p, h.O) > 900) continue;
      const [x, y, z] = this.hang(h, p[0], p[1], p[2]);
      if (abs(x) < 6.4 && y > -0.5 && y < 7 && z > -1.5 && z < 18.6) return h;
    }
    return null;
  },
  // вблизи детали (для расстановки обломков, моделей, аномалий, воронок)
  near(dir, pad){
    if (!this.ready) return false;
    const q = mul(dir, RM);
    for (const o of this.OB){
      if (dot(dir, o.c) < o.cb) continue;
      let l;
      if (o.seg){ const t = clamp(dot(sub(q, o.A3), o.AB) * o.il2, 0, 1); l = len(sub(q, add(o.A3, mul(o.AB, t)))); }
      else l = len(sub(q, mul(o.c, RM)));
      if (l < o.W + pad) return true;
    }
    for (const f of this.LAKES) if (surfDist(dir, f.c) < f.R + pad) return true;
    return false;
  },
  // ------------------------------------------------------------------ ИИ: объезд скал, трещин, лавы и огня
  steer(e, inp){
    const w = inp.wish; if (!w) return;
    const wl = len(w); if (wl < 1e-4) return;
    const n = norm(e.pos), q = mul(n, RM);
    let out = mul(w, 1 / wl), ch = false;
    const obs = this.OB, dyn = typeof AIR81 !== 'undefined' ? AIR81.zones() : null;
    const N = obs.length + (dyn ? dyn.length : 0);
    for (let i = 0; i < N; i++){
      const o = i < obs.length ? obs[i] : dyn[i - obs.length];
      if (dot(n, o.c) < o.cb) continue;
      let v, t = 0.5;
      if (o.seg){ t = clamp(dot(sub(q, o.A3), o.AB) * o.il2, 0, 1); v = sub(q, add(o.A3, mul(o.AB, t))); }
      else v = sub(q, mul(o.c, RM));
      v = sub(v, mul(n, dot(v, n)));
      const l = len(v), gap = l - o.W;
      if (gap > 14) continue;
      const away = l > 1e-3 ? mul(v, 1 / l) : anyTangent(n);
      if (gap < 0 && o.hard){
        // внутри трещины — к ближнему концу (там пандус); в лаве/огне — наружу
        if (o.crack) out = tangent(mul(o.AB, t < 0.5 ? -1 : 1), n); else out = norm(add(out, mul(away, 2)));
        ch = true; continue;
      }
      const into = -dot(out, away); if (into <= 0) continue;
      const k = clamp(1 - gap / 14, 0, 1);
      // сторона объезда: касательная к контуру препятствия (вокруг торца гряды/трещины — тоже), направление помним
      const key = o.grp || i, mem = e._s81, T = norm(cross(n, away));
      let sgn;
      if (mem && mem.k === key && S.time - mem.t < 8) sgn = dot(T, mem.v) >= 0 ? 1 : -1;
      else if (o.seg){ const gt = clamp(dot(sub(q, o.GA3), o.GAB) * o.Gil2, 0, 1), along = tangent(o.GAB, n), s0 = dot(out, along), ds = abs(s0) > 0.3 ? Math.sign(s0) : (gt < 0.5 ? -1 : 1); sgn = dot(T, mul(tangent(o.AB, n), ds)) >= 0 ? 1 : -1; }
      else { const s0 = dot(out, T); sgn = abs(s0) > 0.08 ? Math.sign(s0) : (e.id % 2 ? 1 : -1); }
      const side = mul(T, sgn);
      e._s81 = { k: key, v: side, t: S.time };
      // в базисе (наружу, вдоль): «внутрь» убираем, вдоль — только в выбранную сторону (не гасим цель встречным)
      const ts = dot(out, side), an = dot(out, away);
      out = norm(add(mul(away, an * (1 - k)), mul(side, ts + k * (max(0, -ts) + into + 0.3))));
      ch = true;
    }
    if (ch){ inp.wish = mul(out, wl); this.stats.steer++; }
  },
  // ------------------------------------------------------------------ кадр: метан, лава (свечение, искры)
  Q: [],
  later(t, fn){ this.Q.push({ t: S.time + t, fn }); },   // по игровому времени (пауза — ждёт)
  step(dt){
    if (!this.ready) return;
    for (let i = this.Q.length - 1; i >= 0; i--) if (S.time >= this.Q[i].t){ const q = this.Q.splice(i, 1)[0]; q.fn(); }
    for (let i = 0; i < 2; i++){ if (this.meth[i] < 1) this.meth[i] = min(1, this.meth[i] + dt / 90); if (this.methT[i] > 0) this.methT[i] -= dt; }
    this.fxT -= dt;
    if (this.fxT > 0 || !S.cam) return;
    const low = this.low(); this.fxT = low ? 0.5 : 0.18;
    const cam = S.cam.pos, anti = mul(cam, -1);
    for (const f of this.LAKES){
      if (f.kind !== 'lava') continue;
      const cp = mul(f.c, f.L), dc = min(dist(cp, cam), dist(cp, anti)); if (dc > 220) continue;
      const t1 = anyTangent(f.c), a = random() * PI * 2, rr = f.R * 0.6 * Math.sqrt(random());
      const p = mul(offsetOnSphere(f.c, add(mul(t1, cos(a)), mul(cross(f.c, t1), sin(a))), rr), f.L + 0.3);
      for (let k = 0; k < (low ? 1 : 3); k++) S.sparks.push({ pos: p, vel: add(mul(f.c, 2.5 + random() * 3), mul(randUnit(), 1.2)), life: 0.9 + random() * 0.9 });
      if (random() < (low ? 0.12 : 0.3) && S.fx.length < 60) fxSmoke(add(p, mul(f.c, 1.5)), 2.2, 0.16, 0.5);
    }
  },
  lights(n){
    if (!this.ready || !S.cam) return n;
    const mx = typeof LITE73 !== 'undefined' && LITE73.on ? LITE73.maxL : 16, cam = S.cam.pos, anti = mul(cam, -1);
    const L = [];
    for (const f of this.LAKES) if (f.kind === 'lava'){ const p = mul(f.c, f.L + 6); L.push({ p, d: min(dist(p, cam), dist(p, anti)), r: 55, c: [3.2, 1.1, 0.25], g: 0.0016 }); }
    for (const f of this.F) if (f.type === 'crack' && f.lava){ const p = mul(norm(add(f.A3, mul(f.AB, 0.5))), (f.gA + f.gB) / 2); L.push({ p, d: min(dist(p, cam), dist(p, anti)), r: 40, c: [2.6, 0.8, 0.15], g: 0.001 }); }
    for (const h of this.HANG){ const p = add(h.O, add(mul(h.U, 5.5), mul(h.Fw, 9))); L.push({ p, d: min(dist(p, cam), dist(p, anti)), r: 16, c: [1.6, 1.5, 1.2], g: 0 }); }
    L.sort((a, b) => a.d - b.d);
    for (const o of L){ if (n >= mx || o.d > 260) break; LP.set([o.p[0], o.p[1], o.p[2], o.r], n * 4); LC.set([o.c[0], o.c[1], o.c[2], o.g], n * 4); n++; }
    return n;
  },
  methBoom(i, p, src){
    const f = this.LAKES.filter(l => l.kind === 'meth')[i]; if (!f) return;
    this.meth[i] = 0; this.methT[i] = 3; this.stats.methBoom++;
    const t1 = anyTangent(f.c), t2 = cross(f.c, t1);
    const pts = [mul(f.c, f.L + 2)];
    for (let k = 0; k < (this.low() ? 3 : 6); k++){ const a = k * 1.047 + random(); pts.push(mul(offsetOnSphere(f.c, add(mul(t1, cos(a)), mul(t2, sin(a))), f.R * (0.35 + 0.4 * random())), f.L + 2)); }
    pts.forEach((q, k) => this.later(k * 0.14, () => this.safe(() => {
      fxExplosion(q, k ? 3 : 5);
      if (k === 0){
        for (const tm of [0, 1]) splash(q, tm, 130, f.R * 0.9, src && src.team === tm ? src : null, 'x');
        addWave(q, 12, 1.1); if (S.cam && dist(S.cam.pos, q) < 160) S.shake = max(S.shake, 0.9);
      }
    }, 'mboom')));
    feed(tr('💥 Метан взорвался! Туман над озером выгорел', '💥 Methane exploded! The fog over the lake burned away', '💥 Khí mê-tan phát nổ!'), '#ffb070');
  },
};
// ---- шейдер
if (TER81.on){
  const sc0 = shaderConsts;
  shaderConsts = function(){ const s = sc0.apply(this, arguments); TER81.safe(() => TER81.build(), 'build'); return TER81.ready ? s + TER81.glslMap() : s + '\nuniform vec2 uMeth81;\nfloat ter81(vec3 p, vec3 n, float r, float d, inout float mask){ return d; }\nvoid ter81mat(vec3 p, vec3 rn, vec3 n, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){}\nvec3 fog81(vec3 o, vec3 d, float tH, vec3 c){ return c; }\n'; };
  const sp0 = startProgram;
  startProgram = function(src){ if (TER81.ready && typeof src === 'string' && src.indexOf('ter81mat(') >= 0 && src.indexOf('void rock81') < 0) src += TER81.glslTail(); return sp0.call(this, src); };
} else {
  const sc0 = shaderConsts;   // выключено: заглушки (scene.glsl вызывает ter81/ter81mat/fog81)
  shaderConsts = function(){ return sc0.apply(this, arguments) + '\nuniform vec2 uMeth81;\nfloat ter81(vec3 p, vec3 n, float r, float d, inout float mask){ return d; }\nvoid ter81mat(vec3 p, vec3 rn, vec3 n, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){}\nvec3 fog81(vec3 o, vec3 d, float tH, vec3 c){ return c; }\n'; };
}
SCENE_U.push('uMeth81');
if (typeof GFX72 !== 'undefined'){ const su0 = GFX72.sceneU;
  GFX72.sceneU = function(U){ su0.apply(this, arguments); if (U.uMeth81) gl.uniform2f(U.uMeth81, TER81.meth[0], TER81.meth[1]); }; }
if (TER81.on){
  // обломки старых экспедиций и 3D-модели — не в скалах и не в озёрах
  { const gp0 = genProps; genProps = function(){ const r = gp0.apply(this, arguments); TER81.safe(() => { TER81.build(); const n0 = PROPS.length; PROPS = PROPS.filter(p => p.kind === 5 || !TER81.near(p.dir, (p.bound || 4) + 3)); TER81.stats.propsOut = n0 - PROPS.length; if (n0 !== PROPS.length) buildPropGrid(); }, 'props'); return r; }; }
  if (typeof AS75 !== 'undefined' && AS75.free){ const fr0 = AS75.free; AS75.free = function(dir, r, gap){ if (TER81.near(dir, r + 3)){ TER81.stats.assetsOut++; return false; } return fr0.apply(this, arguments); }; }
  if (typeof A78 !== 'undefined' && A78.freeAt){ const fa0 = A78.freeAt; A78.freeAt = function(dir, r){ if (TER81.near(dir, r + 4)) return false; return fa0.apply(this, arguments); }; }
  // воронки: не в озёрах, не у скал и ангара (воронка сдвигает всю колонну рельефа — иначе выемка на вершине скалы)
  if (typeof CR76 !== 'undefined'){ const al0 = CR76.allowed; CR76.allowed = function(dir){ if (TER81.near(dir, 4)) return false; return al0.apply(this, arguments); }; }
  // физика: рулёжка ИИ, лёд, лава
  { const ps0 = physStep;
    physStep = function(e, inp, dt, free){
      if (!TER81.ready || free || !e || !e.alive || !inp) return ps0.apply(this, arguments);
      const me = e === ctrlEntity() && !S.attract;
      if (!me && inp.wish && len(e.pos) - RM < 40) TER81.safe(() => TER81.steer(e, inp), 'steer');
      const lk = TER81.lakeAt(e.pos);
      const v0 = e.vel;
      const r = ps0.apply(this, arguments);
      if (lk && e.grounded){
        if (lk.kind === 'ice'){
          // скольжение: касательная часть скорости меняется в 4 раза медленнее (у танков тоже), разгон по инерции
          const up = norm(e.pos), dv = sub(e.vel, v0), dn = dot(dv, up), dt_ = sub(dv, mul(up, dn));
          e.vel = add(add(v0, mul(up, dn)), mul(dt_, 0.22)); TER81.stats.ice++;
          if (me && random() < dt * 0.4 && S.time > TER81.warnT){ TER81.warnT = S.time + 25; feed(tr('Лёд — скользко, тормозить трудно', 'Ice — slippery, hard to stop', 'Băng — trơn trượt'), '#9cf'); }
        } else if (lk.kind === 'lava') TER81.burn(e, dt, me);
      } else if (e.grounded && TER81.inLavaCrack(e.pos)) TER81.burn(e, dt, me);
      return r;
    }; }
  TER81.burn = function(e, dt, me){
    damage(e, (e.cls === 'tank' ? 34 : 26) * dt, null, 'f'); this.stats.lava++;
    if (random() < dt * 6) S.sparks.push({ pos: add(e.pos, mul(e.up || norm(e.pos), 0.3)), vel: add(mul(norm(e.pos), 3 + random() * 2), mul(randUnit(), 1.5)), life: 0.6 });
    if (me && S.time > this.warnT){ this.warnT = S.time + 8; feed(tr('🔥 Лава! Уходи с неё', '🔥 Lava! Get off it', '🔥 Dung nham! Rời khỏi ngay'), '#ff8a50'); }
  };
  // ангар — укрытие: взрывы снаружи бьют внутрь слабее
  { const sp0 = splash; splash = function(p){ const o = TER81.boomP; TER81.boomP = p; try { return sp0.apply(this, arguments); } finally { TER81.boomP = o; } }; }
  { const dm0 = damage; damage = function(e, dmg){ const p = TER81.boomP; if (p && e && e.pos && TER81.HANG.length && e.cls !== 'hq' && TER81.inHangar(e.pos) && !TER81.inHangar(p)){ arguments[1] = dmg * 0.3; TER81.stats.cover++; } return dm0.apply(this, arguments); }; }
  // метан: взрыв или огонь над озером поджигает его (раз в 90 с туман восстанавливается)
  { const sp1 = splash; splash = function(p, team, dmg, radius, src, ptype){
      const r = sp1.apply(this, arguments);
      if (TER81.ready && (dmg >= 30 || ptype === 'f')) TER81.safe(() => {
        const M = TER81.LAKES.filter(l => l.kind === 'meth');
        M.forEach((f, i) => { if (TER81.meth[i] > 0.6 && TER81.methT[i] <= 0 && surfDist(p, f.c) < f.R * 1.1 && len(p) - f.L < 14){ TER81.methT[i] = 3; TER81.later(0.35, () => TER81.safe(() => TER81.methBoom(i, p, src), 'mb')); } });
      }, 'meth');
      return r;
    }; }
  { const gl0 = gatherLights; gatherLights = function(){ const n = gl0.apply(this, arguments); const m = TER81.safe(() => TER81.lights(n), 'lit'); return m === undefined ? n : m; }; }
  { const up0 = update; update = function(rdt){ up0(rdt); if (S.paused) return; const dt = clamp(S.time - (TER81.lt === null ? S.time : TER81.lt), 0, 0.1); TER81.lt = S.time; if (dt > 0) TER81.safe(() => TER81.step(dt), 'step'); }; }
  { const nm0 = newMatch; newMatch = function(){ TER81.meth = [1, 1]; TER81.methT = [0, 0]; TER81.lt = null; TER81.Q = []; return nm0.apply(this, arguments); }; }
}
