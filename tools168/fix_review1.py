# T168: apply fixes from the first review (movers, craters, far fade, soft edge, cliff weight, fail() restore)
p = r'D:\AI\pm_v6\wt_t168\v819_gnd168.js'
s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, 'NOT FOUND: ' + a[:80]
    s = s.replace(a, b)

a = s[s.index("// вершины декали в мире"):s.index("GND168.ok = function")]
b = '''// вершины декали в мире (кеш по позиции): запись { v: [x, y, z, qx, qz, вес] × nv, c: центр, r: радиус, stale }.
// null — ещё не посчитано (лимит времени кадра). Устаревшую (воронка рядом) пересчитываем, пока есть время, иначе рисуем старую.
GND168.verts = function(key, pos, X, Z, ex, ez, budget, H, cache){
  cache = cache || this.cache;
  let e = cache.get(key);
  if (e && !e.stale) return e;
  if (performance.now() > budget){ this.stats.miss++; return e || null; }
  const t0 = performance.now();
  const S = this.SEG, R = this.RINGS, nv = this.nv;
  const v = new Float32Array(nv * 6);
  const up = norm(pos), base = groundR(up);
  const lift = 0.05 + 0.01 * max(ex, ez);
  // солнце (как в шейдерах: SUN1 и противоположное SUN2): пятно сдвигается от солнца — чем ниже солнце, тем дальше
  const L = dot(up, GND168_SUN) >= 0 ? GND168_SUN : mul(GND168_SUN, -1), lu = dot(up, L);
  let off = [0, 0, 0];
  if (H && lu > 0.05){ const lt = sub(L, mul(up, lu)), tl = len(lt); if (tl > 1e-3) off = mul(lt, -min(H * 0.3 * tl / max(lu, 0.35), 0.45 * max(ex, ez)) / tl); }
  let n = 0;
  for (let k = 0; k < R.length; k++){
    const cnt = k === 0 ? 1 : S;
    for (let j = 0; j < cnt; j++){
      const a = j / S * Math.PI * 2, qx = Math.cos(a) * R[k], qz = Math.sin(a) * R[k];
      const w = add(add(pos, off), add(mul(X, qx * ex), mul(Z, qz * ez)));
      const d = norm(w);
      // высоту берём с грунта, но не даём «залезть» на соседние строения рэймарчера (штаб, вышки, скалы);
      // где пришлось обрезать (обрыв, стена) — тень там гасим, чтобы не висела в воздухе
      const g0 = groundR(d), lo = base - 2.5, hi = base + 1.2 + 0.25 * R[k] * max(ex, ez), g = clamp(g0, lo, hi);
      const wt = g0 < lo ? max(0, 1 - (lo - g0) * 0.7) : g0 > hi ? max(0, 1 - (g0 - hi) * 0.7) : 1;
      const p = mul(d, g + lift);
      v[n++] = p[0]; v[n++] = p[1]; v[n++] = p[2]; v[n++] = qx; v[n++] = qz; v[n++] = wt;
    }
  }
  if (cache.size > (cache === this.mcache ? 48 : 600)) cache.delete(cache.keys().next().value);
  e = { v, c: pos.slice(), r: max(ex, ez) * R[R.length - 1] + 2, stale: false };
  cache.set(key, e);
  this.stats.built++; this.stats.buildMs += performance.now() - t0;
  return e;
};

// воронки (CR76) меняют грунт: записи кеша рядом с изменившейся воронкой помечаем устаревшими
GND168.craters = function(){
  if (typeof CR76 === 'undefined' || !CR76.L) return;
  const L = CR76.L.slice(0, CR76.n === undefined ? CR76.L.length : CR76.n);
  const sig = L.length + ':' + L.map(c => Math.round(c.p[0] * 2) + ',' + Math.round(c.p[1] * 2) + ',' + Math.round(c.p[2] * 2) + ',' + Math.round(c.r * 10) + ',' + Math.round(c.D * 10)).join(';');
  if (sig === this.crSig) return;
  const now = L.map(c => ({ p: c.p.slice(), r: c.r, D: c.D }));
  const old = this.crL || [];
  const same = (a, b) => dist(a.p, b.p) < 0.3 && Math.abs(a.r - b.r) < 0.15 && Math.abs(a.D - b.D) < 0.15;
  const changed = now.filter(c => !old.some(o => same(o, c))).concat(old.filter(o => !now.some(c => same(o, c))));
  this.crSig = sig; this.crL = now;
  for (const c of changed){
    const R2 = c.r * 1.8;
    for (const C of [this.cache, this.mcache]) for (const e of C.values()) if (dist(e.c, c.p) < R2 + e.r) e.stale = true;
    for (const [k, h] of this.hcache) if (dist(h.c, c.p) < R2 + 8) this.hcache.delete(k);
  }
};

'''
s = s.replace(a, b)
rep("  cache: new Map(), hcache: new Map(), foot: {}, cap: 96, lastT: 0,",
    "  cache: new Map(), hcache: new Map(), mcache: new Map(), foot: {}, cap: 96, lastT: 0, crSig: '', crL: null,\n"
    "  // движутся (боссы «Бастион»/«Жнец», фауна): ключ кеша грубее (2 м), сдвиг до точной позиции — при отрисовке\n"
    "  MOVE: /^(b83|r83|f810)/,")
rep("RINGS: [0, 0.6, 1.05, 1.6], SEG: 16,", "RINGS: [0, 0.6, 1.05, 1.85], SEG: 16,")
rep("    if (S.time < this.lastT - 1){ this.cache.clear(); this.hcache.clear(); }   // новый бой — новый рельеф\n    this.lastT = S.time;",
    "    if (S.time < this.lastT - 1){ this.cache.clear(); this.hcache.clear(); this.mcache.clear(); this.crSig = ''; this.crL = null; }   // новый бой — новый рельеф\n"
    "    this.lastT = S.time;\n    this.craters();")
rep("""        const key = 's' + it.m + '|' + it.pos.map(x => Math.round(x * 4)).join(',') + '|' + Math.round(it.X[0] * 50) + ',' + Math.round(it.X[2] * 50);
        let h = this.hcache.get(key);
        if (h === undefined){
          if (performance.now() > budget){ this.stats.miss++; rej.budget++; continue; }
          h = len(it.pos) - groundR(norm(it.pos)) + f.y0 * s;
          if (this.hcache.size > 600) this.hcache.delete(this.hcache.keys().next().value);
          this.hcache.set(key, h);
        }
        if (h > 0.45 || h < -1.5){ rej.h++; continue; }          // турели на крыше, дроны, утопленные шахты — не трогаем
        aoList.push([it, f, s]);
        if (decals.length < this.cap){
          const v = this.verts(key, it.pos, it.X, it.Z, f.ex * s * 1.08, f.ez * s * 1.08, budget, f.H * s);
          if (v) decals.push([v, 0.72]);
        }""", """        const mv = this.MOVE.test(it.m), q = mv ? 0.5 : 4, qa = mv ? 8 : 50;
        const P = mv ? it.pos.map(x => Math.round(x * q) / q) : it.pos;
        const key = 's' + it.m + '|' + P.map(x => Math.round(x * q)).join(',') + '|' + Math.round(it.X[0] * qa) + ',' + Math.round(it.X[2] * qa);
        let he = this.hcache.get(key);
        if (he === undefined){
          if (performance.now() > budget){ this.stats.miss++; rej.budget++; continue; }
          he = { h: len(P) - groundR(norm(P)) + f.y0 * s, c: P.slice() };
          if (this.hcache.size > 600) this.hcache.delete(this.hcache.keys().next().value);
          this.hcache.set(key, he);
        }
        const h = he.h + (mv ? len(it.pos) - len(P) : 0);
        if (h > 0.45 || h < -1.5){ rej.h++; continue; }          // турели на крыше, дроны, утопленные шахты — не трогаем
        aoList.push([it, f, s]);
        if (decals.length < this.cap){
          const e = this.verts(key, P, it.X, it.Z, f.ex * s * 1.08, f.ez * s * 1.08, budget, f.H * s, mv ? this.mcache : this.cache);
          if (e) decals.push([e, 0.72, mv ? sub(it.pos, P) : null]);
        }""")
rep("""        const v = this.verts(key, it.pos, it.X, it.Z, ex * 1.1, ez * 1.1, budget, it.e.d[1] * s);
        if (v){ decals.push([v, it.e.p === 'nature' ? -0.5 : 0.5]); nas++; }""", """        const e = this.verts(key, it.pos, it.X, it.Z, ex * 1.1, ez * 1.1, budget, it.e.d[1] * s);
        if (e){ decals.push([e, it.e.p === 'nature' ? -0.5 : 0.5, null]); nas++; }""")
rep("""      for (const [v, k] of decals){
        for (let i = 0; i < nv; i++){
          B[o++] = v[i * 5] - c.pos[0]; B[o++] = v[i * 5 + 1] - c.pos[1]; B[o++] = v[i * 5 + 2] - c.pos[2];
          B[o++] = v[i * 5 + 3]; B[o++] = v[i * 5 + 4]; B[o++] = k;
        }
      }""", """      for (const [e, k, dv] of decals){
        const v = e.v, ox = c.pos[0] - (dv ? dv[0] : 0), oy = c.pos[1] - (dv ? dv[1] : 0), oz = c.pos[2] - (dv ? dv[2] : 0);
        for (let i = 0; i < nv; i++){
          const j = i * 6;
          B[o++] = v[j] - ox; B[o++] = v[j + 1] - oy; B[o++] = v[j + 2] - oz;
          B[o++] = v[j + 3]; B[o++] = v[j + 4]; B[o++] = k * v[j + 5];
        }
      }""")
# far fade (no jump at the range limit)
rep("in vec3 vQ; in float vZ;\nout vec4 frag;\nvoid main(){\n  vec2 q = abs(vQ.xy);",
    "uniform float uFar;\nin vec3 vQ; in float vZ;\nout vec4 frag;\nvoid main(){\n  vec2 q = abs(vQ.xy);")
rep("  a *= exp(-max(vZ - 120.0, 0.0) * 0.004);                 // вдали тень тает вместе с деталями",
    "  a *= 1.0 - smoothstep(uFar * 0.55, uFar, vZ);              // вдали тень плавно тает (без скачка на границе дальности)")
rep("uniform vec2 uH;      // x — высота полосы затемнения (м, локально), y — сила",
    "uniform vec2 uH;      // x — высота полосы затемнения (м, локально), y — сила\nuniform float uFar;")
rep("  ao = mix(1.0, ao, exp(-vD * 0.0011));", "  ao = mix(1.0, ao, exp(-vD * 0.0011) * (1.0 - smoothstep(uFar * 0.55, uFar, vZ)));")
rep("[this.P, this.U] = prog(GND168_DVS, GND168_DFS, ['uV', 'uPr']);", "[this.P, this.U] = prog(GND168_DVS, GND168_DFS, ['uV', 'uPr', 'uFar']);")
rep("[this.aP, this.aU] = prog(GND168_AVS, GND168_AFS, ['uM', 'uV', 'uPr', 'uH']);", "[this.aP, this.aU] = prog(GND168_AVS, GND168_AFS, ['uM', 'uV', 'uPr', 'uH', 'uFar']);")
rep("      gl.uniformMatrix3fv(this.aU.uV, false, UV);\n      gl.uniform4f(this.aU.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));\n",
    "      gl.uniformMatrix3fv(this.aU.uV, false, UV);\n      gl.uniform4f(this.aU.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));\n      gl.uniform1f(this.aU.uFar, farST);\n")
rep("      gl.uniformMatrix3fv(this.U.uV, false, UV);\n      gl.uniform4f(this.U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));\n",
    "      gl.uniformMatrix3fv(this.U.uV, false, UV);\n      gl.uniform4f(this.U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));\n      gl.uniform1f(this.U.uFar, farST);\n")
rep("    if (typeof ST70 !== 'undefined' && ST70.ok() && ST70.built && ST70.items){\n      const far = lite ? 160 : 320;",
    "    const farST = lite ? 160 : 320;\n    if (typeof ST70 !== 'undefined' && ST70.ok() && ST70.built && ST70.items){\n      const far = farST;")
rep("      const far = lite ? 120 : 260;", "      const far = farST;")
rep("  fail(e){ this.failed = true; this.err = String(e && e.message || e); try { console.warn('GND168: приземление моделей отключено —', this.err); } catch (_){} },",
    "  fail(e){\n    this.failed = true; this.err = String(e && e.message || e);\n"
    "    try { if (this.oldS && typeof AS75 !== 'undefined'){ AS75.sP = this.oldS[0]; AS75.sU = this.oldS[1]; this.asHooked = false; } } catch (_){}   // вернуть старый диск AS75\n"
    "    try { console.warn('GND168: приземление моделей отключено —', this.err); } catch (_){}\n  },")
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
