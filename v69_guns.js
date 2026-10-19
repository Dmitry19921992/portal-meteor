// =====================================================================
//  v6.9 — ОРУЖИЕ В РУКАХ: настоящие 3D-модели вместо SDF-примитивов.
//  Модели строятся процедурно при первом кадре (скруглённые коробки, тела вращения,
//  выдавленные силуэты, трубки) — без файлов, страница остаётся одной.
//  Рисуются отдельным проходом после рэймарчера и 3D-бойцов (в тот же HDR-буфер, свой буфер глубины).
//  Стиль Консорциума: потёртый оливково-бежевый металл со сколами, тёмные детали, зелёные огоньки.
//  Анимации: отдача (пружины), затвор, покачивание и инерция, перезарядка (магазин вниз/вверх левой рукой),
//  раскрутка блока стволов пулемёта, заряд катушек рельсотрона, нагрев ствола (свечение, дымок, марево),
//  вспышка выстрела, гильзы. Ракета — с плечевой пусковой установки, граната — в левой руке.
//  Если что-то пошло не так — WPN69.failed, игра рисует прежнее SDF-оружие.
// =====================================================================
const WPN69 = {
  on: true, built: false, failed: false, err: '', P: null, U: null, SP: null, SU: null, M: {}, rnd: null,
  st: { rz: 0, vz: 0, rp: 0, vp: 0, ry: 0, vy: 0, rr: 0, vr: 0, sx: 0, sy: 0, svx: 0, svy: 0, boltT: -9, shotT: -9, heat: {}, shells: [], wisps: [], rot: 0,
        rk: -9, lastF: null, lastR: null, rl0: 0, wisT: 0, flashSeed: 0, t: 0, w: '', gh: 0, pend: 0 },
  stats: { ms: 0, tris: 0 },
  ok(){ return this.on && !this.failed; },
  fail(e){ this.failed = true; this.err = String(e && e.message || e); try { console.warn('WPN69: 3D-оружие отключено, остаётся прежнее —', this.err); } catch (_){} },
};
// ---------------------------------------------------------------- 3x4 матрицы (строки), система оружия: x вправо, y вверх, z вперёд
const M34 = {
  I(){ return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; },
  T(x, y, z){ return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]; },
  RX(a){ const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; },
  RY(a){ const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; },
  RZ(a){ const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; },
  mul(a, b){
    const o = new Array(12);
    for (let r = 0; r < 3; r++){
      for (let c = 0; c < 3; c++) o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c];
      o[r * 4 + 3] = a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3];
    }
    return o;
  },
  ch(...ms){ let m = ms[0]; for (let i = 1; i < ms.length; i++) m = M34.mul(m, ms[i]); return m; },
  ap(m, p){ return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]]; },
  an(m, n){ return [m[0] * n[0] + m[1] * n[1] + m[2] * n[2], m[4] * n[0] + m[5] * n[1] + m[6] * n[2], m[8] * n[0] + m[9] * n[1] + m[10] * n[2]]; },
  gl(m, out){ out[0] = m[0]; out[1] = m[4]; out[2] = m[8]; out[3] = 0; out[4] = m[1]; out[5] = m[5]; out[6] = m[9]; out[7] = 0; out[8] = m[2]; out[9] = m[6]; out[10] = m[10]; out[11] = 0; out[12] = m[3]; out[13] = m[7]; out[14] = m[11]; out[15] = 1; return out; },
};
// ---------------------------------------------------------------- построитель геометрии
// вершина: позиция, нормаль, цвет (rgb — цвет Консорциума) + материал (a):
// 0 краска со сколами, 1 тёмный полимер, 2 сталь, 3 свечение, 4 ствол (нагрев), 5 латунь, 6 ткань перчаток, 7 стекло, 8 катушки (заряд)
const C69 = { OL: [0.20, 0.215, 0.13], OL2: [0.15, 0.165, 0.10], BE: [0.44, 0.41, 0.34], BE2: [0.34, 0.31, 0.25], DK: [0.045, 0.045, 0.05], DK2: [0.028, 0.028, 0.03],
              ST: [0.075, 0.075, 0.08], GL: [0.35, 1.0, 0.5], BR: [0.55, 0.36, 0.11], FAB: [0.085, 0.09, 0.065], PAD: [0.17, 0.18, 0.11], RED: [0.5, 0.08, 0.05] };
function G69(){ return { P: [], N: [], C: [], I: [], X: null }; }
function g69v(g, p, n, col, mat){
  if (g.X){ p = M34.ap(g.X, p); n = M34.an(g.X, n); }
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  g.P.push(p[0], p[1], p[2]); g.N.push(n[0] / l, n[1] / l, n[2] / l); g.C.push(col[0], col[1], col[2], mat);
  return g.P.length / 3 - 1;
}
function g69with(g, X, fn){ const o = g.X; g.X = o ? M34.mul(o, X) : X; fn(); g.X = o; }
// скруглённая коробка: центр c, полуразмеры h, радиус скругления r
function g69box(g, c, h, r, col, mat){
  r = Math.min(r, h[0] * 0.95, h[1] * 0.95, h[2] * 0.95);
  const vals = a => r > 0.0004 ? [-a, -a + r * 0.3, -a + r, a - r, a - r * 0.3, a] : [-a, a];
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]){
    const u = (k + 1) % 3, v = (k + 2) % 3, U = vals(h[u]), V = vals(h[v]), base = g.P.length / 3, nU = U.length;
    for (const b of V) for (const a of U){
      const p = [0, 0, 0]; p[k] = s * h[k]; p[u] = a; p[v] = b;
      const inn = [0, 1, 2].map(i => clamp(p[i], -(h[i] - r), h[i] - r));
      let d = [p[0] - inn[0], p[1] - inn[1], p[2] - inn[2]]; const L = Math.hypot(d[0], d[1], d[2]);
      if (L < 1e-7){ d = [0, 0, 0]; d[k] = s; } else d = d.map(x => x / L);
      const q = r > 0.0004 ? [inn[0] + d[0] * r, inn[1] + d[1] * r, inn[2] + d[2] * r] : p;
      g69v(g, [c[0] + q[0], c[1] + q[1], c[2] + q[2]], r > 0.0004 ? d : (() => { const n = [0, 0, 0]; n[k] = s; return n; })(), col, mat);
    }
    for (let j = 0; j < V.length - 1; j++) for (let i = 0; i < nU - 1; i++){
      const a = base + j * nU + i, b = a + 1, c2 = a + nU, d2 = c2 + 1;
      if (s > 0) g.I.push(a, b, d2, a, d2, c2); else g.I.push(a, d2, b, a, c2, d2);
    }
  }
}
// усечённый конус/трубка между точками a и b
function g69tube(g, a, b, r0, r1, seg, col, mat, caps){
  const w = norm(sub(b, a)), hlp = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(hlp, w)), v = cross(w, u), base = g.P.length / 3, L = dist(a, b), sl = (r0 - r1) / (L || 1);
  for (let i = 0; i <= seg; i++){
    const t = i / seg * PI * 2, cs = Math.cos(t), sn = Math.sin(t);
    const rd = add(mul(u, cs), mul(v, sn)), n = add(rd, mul(w, sl));
    g69v(g, add(a, mul(rd, r0)), n, col, mat); g69v(g, add(b, mul(rd, r1)), n, col, mat);
  }
  for (let i = 0; i < seg; i++){ const k = base + i * 2; g.I.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  if (caps !== false) for (const [p, r, s] of [[a, r0, -1], [b, r1, 1]]){
    if (r < 1e-4) continue;
    const c0 = g69v(g, p, mul(w, s), col, mat), k0 = g.P.length / 3;
    for (let i = 0; i <= seg; i++){ const t = i / seg * PI * 2; g69v(g, add(p, mul(add(mul(u, Math.cos(t)), mul(v, Math.sin(t))), r)), mul(w, s), col, mat); }
    for (let i = 0; i < seg; i++){ if (s > 0) g.I.push(c0, k0 + i, k0 + i + 1); else g.I.push(c0, k0 + i + 1, k0 + i); }
  }
}
// тело вращения вокруг оси z (через cx, cy): prof = [[z, r, col?, mat?], ...]
function g69lathe(g, cx, cy, prof, seg, col, mat){
  const base = g.P.length / 3, n = prof.length;
  for (let j = 0; j < n; j++){
    const pr = prof[max(0, j - 1)], nx = prof[min(n - 1, j + 1)];
    let dz = nx[0] - pr[0], dr = nx[1] - pr[1]; if (Math.abs(dz) + Math.abs(dr) < 1e-7){ dz = 1; dr = 0; }
    const L = Math.hypot(dz, dr), nr = dz / L, nz = -dr / L;
    const cl = prof[j][2] || col, mt = prof[j][3] !== undefined ? prof[j][3] : mat;
    for (let i = 0; i <= seg; i++){
      const t = i / seg * PI * 2, cs = Math.cos(t), sn = Math.sin(t);
      g69v(g, [cx + cs * prof[j][1], cy + sn * prof[j][1], prof[j][0]], [cs * nr, sn * nr, nz], cl, mt);
    }
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < seg; i++){
    const a = base + j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
    g.I.push(a, c, b, b, c, d);
  }
}
// тор: центр c, ось — после матрицы X (по умолчанию z)
function g69torus(g, c, R, r, su, sv, col, mat){
  const base = g.P.length / 3;
  for (let j = 0; j <= sv; j++){
    const v = j / sv * PI * 2;
    for (let i = 0; i <= su; i++){
      const u = i / su * PI * 2, cu = Math.cos(u), su2 = Math.sin(u), cv = Math.cos(v), sv2 = Math.sin(v);
      g69v(g, [c[0] + (R + r * cv) * cu, c[1] + (R + r * cv) * su2, c[2] + r * sv2], [cv * cu, cv * su2, sv2], col, mat);
    }
  }
  for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++){ const a = base + j * (su + 1) + i, b = a + 1, c2 = a + su + 1, d = c2 + 1; g.I.push(a, b, c2, b, d, c2); }
}
// выдавленный силуэт: многоугольник в плоскости (z, y), толщина по x от x0 до x1; bev — фаска по краям лицевых граней
function g69earclip(poly){
  const n = poly.length, idx = [...Array(n).keys()], out = [];
  let area = 0; for (let i = 0; i < n; i++){ const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  if (area < 0) idx.reverse();
  const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p, a, b, c) => cr(a, b, p) >= 0 && cr(b, c, p) >= 0 && cr(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 5000){
    let cut = false;
    for (let i = 0; i < idx.length; i++){
      const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const a = poly[ia], b = poly[ib], c = poly[ic];
      if (cr(a, b, c) <= 1e-12) continue;
      let ok = true;
      for (const j of idx){ if (j === ia || j === ib || j === ic) continue; if (inside(poly[j], a, b, c)){ ok = false; break; } }
      if (!ok) continue;
      out.push([ia, ib, ic]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return { tris: out, ccw: area >= 0 };
}
function g69ext(g, poly, x0, x1, col, mat, bev){
  bev = bev || 0;
  const T = g69earclip(poly), n = poly.length;
  // лицевые грани (с фаской: внутренний контур чуть уже)
  const cen = poly.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  const shrink = p => { if (!bev) return p; const d = [p[0] - cen[0], p[1] - cen[1]], L = Math.hypot(d[0], d[1]) || 1; return [p[0] - d[0] / L * bev, p[1] - d[1] / L * bev]; };
  for (const [xx, s] of [[x1, 1], [x0, -1]]){
    const base = g.P.length / 3, xf = xx, xi = xx;
    for (const p of poly){ const q = shrink(p); g69v(g, [xf, q[1], q[0]], [s, 0, 0], col, mat); }
    for (const t of T.tris){ const [a, b, c] = t; if ((s > 0) === T.ccw) g.I.push(base + a, base + c, base + b); else g.I.push(base + a, base + b, base + c); }
    if (bev){   // фаска: полоса от внутреннего контура к внешнему, на bev глубже
      const b2 = g.P.length / 3;
      for (const p of poly){
        const q = shrink(p), d = [p[0] - q[0], p[1] - q[1]];
        g69v(g, [xi, q[1], q[0]], [s * 1.6, d[1] / bev, d[0] / bev], col, mat); g69v(g, [xi - s * bev, p[1], p[0]], [s * 0.5, d[1] / bev, d[0] / bev], col, mat);
      }
      for (let i = 0; i < n; i++){ const a = b2 + i * 2, b = b2 + ((i + 1) % n) * 2; if ((s > 0) === T.ccw) g.I.push(a, a + 1, b, b, a + 1, b + 1); else g.I.push(a, b, a + 1, b, b + 1, a + 1); }
    }
  }
  // боковые стенки
  const xa = x0 + (bev || 0), xb = x1 - (bev || 0);
  for (let i = 0; i < n; i++){
    const p = poly[i], q = poly[(i + 1) % n], e = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(e[0], e[1]) || 1;
    const nn = T.ccw ? [0, -e[0] / L, e[1] / L] : [0, e[0] / L, -e[1] / L];
    const k = g.P.length / 3;
    g69v(g, [xa, p[1], p[0]], nn, col, mat); g69v(g, [xb, p[1], p[0]], nn, col, mat); g69v(g, [xa, q[1], q[0]], nn, col, mat); g69v(g, [xb, q[1], q[0]], nn, col, mat);
    if (T.ccw) g.I.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); else g.I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
}
// ---------------------------------------------------------------- руки (перчатки и рукава)
// правая: обхват пистолетной рукояти; gp — верх рукояти, rake — наклон рукояти назад
function g69handR(g, gp, rake, fwd){
  const { FAB, PAD, OL2, DK } = C69;
  g69with(g, M34.mul(M34.T(gp[0], gp[1], gp[2]), M34.RX(rake)), () => {
    g69box(g, [0.011, -0.05, -0.006], [0.027, 0.04, 0.03], 0.013, FAB, 6);
    g69box(g, [0.035, -0.046, 0.004], [0.006, 0.032, 0.019], 0.004, PAD, 0);        // накладка на тыльной стороне
    for (let k = 0; k < 3; k++) g69tube(g, [0.03, -0.042 - k * 0.019, 0.024], [-0.024, -0.042 - k * 0.019, 0.026], 0.0088, 0.0082, 8, FAB, 6);
    g69tube(g, [0.03, -0.018, 0.026], [0.004, -0.02, 0.05 + (fwd || 0)], 0.0085, 0.008, 8, FAB, 6);   // указательный — на спуске
    g69tube(g, [0.022, -0.012, -0.022], [-0.018, 0.004, 0.006], 0.0095, 0.0085, 8, FAB, 6);         // большой
    g69tube(g, [0.02, -0.07, -0.035], [0.05, -0.15, -0.16], 0.031, 0.036, 12, PAD, 0);               // манжета с бронёй
    g69tube(g, [0.05, -0.15, -0.16], [0.13, -0.3, -0.38], 0.037, 0.05, 12, OL2, 6);                  // рукав
    g69box(g, [0.06, -0.135, -0.13], [0.012, 0.02, 0.05], 0.006, DK, 1);
  });
}
// левая: под цевьём (vert = false) или на вертикальной рукояти (vert = true); координаты — от точки хвата
function g69handL(g, vert){
  const { FAB, PAD, OL2 } = C69;
  if (!vert){
    g69box(g, [-0.006, -0.018, 0], [0.024, 0.014, 0.04], 0.012, FAB, 6);
    for (let k = 0; k < 4; k++) g69tube(g, [-0.026, -0.026, -0.028 + k * 0.019], [-0.033, 0.018, -0.026 + k * 0.018], 0.0085, 0.008, 8, FAB, 6);
    g69tube(g, [0.022, -0.02, -0.02], [0.031, 0.012, 0.018], 0.009, 0.0085, 8, FAB, 6);
    g69tube(g, [-0.01, -0.03, -0.035], [-0.07, -0.1, -0.16], 0.03, 0.035, 12, PAD, 0);
    g69tube(g, [-0.07, -0.1, -0.16], [-0.2, -0.27, -0.36], 0.036, 0.05, 12, OL2, 6);
  } else {
    g69box(g, [0.004, -0.03, -0.022], [0.026, 0.03, 0.02], 0.012, FAB, 6);
    for (let k = 0; k < 3; k++) g69tube(g, [-0.026, -0.018 - k * 0.02, -0.01], [-0.004, -0.018 - k * 0.02, 0.026], 0.0085, 0.008, 8, FAB, 6);
    g69tube(g, [-0.02, -0.004, -0.015], [0.012, 0.004, 0.022], 0.009, 0.0085, 8, FAB, 6);
    g69tube(g, [-0.004, -0.05, -0.045], [-0.06, -0.12, -0.17], 0.03, 0.035, 12, PAD, 0);
    g69tube(g, [-0.06, -0.12, -0.17], [-0.2, -0.28, -0.38], 0.036, 0.05, 12, OL2, 6);
  }
}
// ---------------------------------------------------------------- модели оружия
// у каждой: части body / mag / bolt / rot / handL; muz — дуло, ej — окно выброса гильз, fl — точка хвата левой,
// sight — высота линии прицела, hip/ads — положение у бедра / в прицеле (система камеры: x вправо, y вверх, z вперёд)
const W69_DEF = {};
function w69rail(g, z0, z1, y, w){   // планка Пикатинни
  g69box(g, [0, y, (z0 + z1) / 2], [w, 0.004, (z1 - z0) / 2], 0.001, C69.DK, 1);
  for (let z = z0 + 0.008; z < z1 - 0.004; z += 0.021) g69box(g, [0, y + 0.0058, z], [w + 0.001, 0.0019, 0.0052], 0, C69.DK, 1);
}
function w69dot(g, c, R){   // светящаяся марка коллиматора
  g69torus(g, c, R, R * 0.17, 16, 4, C69.GL, 3);
  g69box(g, c, [R * 0.22, R * 0.22, 0.0004], 0, C69.GL, 3);
}
W69_DEF.rifle = () => {
  const { OL, OL2, BE, BE2, DK, DK2, ST, GL } = C69;
  const body = G69(), mag = G69(), bolt = G69(), hl = G69();
  g69box(body, [0, 0.018, -0.01], [0.025, 0.022, 0.14], 0.006, BE, 0);                        // верхний ресивер
  g69ext(body, [[-0.13, -0.002], [0.10, -0.002], [0.10, -0.028], [0.05, -0.034], [0.0, -0.034], [-0.06, -0.031], [-0.13, -0.021]], -0.022, 0.022, OL, 0, 0.003);
  g69box(body, [0, -0.04, 0.03], [0.0185, 0.012, 0.03], 0.004, OL, 0);                       // приёмник магазина
  g69box(body, [0, 0.016, 0.235], [0.029, 0.03, 0.105], 0.011, OL, 0);                       // цевьё
  for (const s of [-1, 1]){
    for (let i = 0; i < 4; i++) g69box(body, [s * 0.0292, 0.014, 0.17 + i * 0.036], [0.0016, 0.011, 0.0095], 0, DK2, 1);
    g69box(body, [s * 0.0302, -0.007, 0.235], [0.0011, 0.0026, 0.085], 0, GL, 3);             // зелёная полоса
    g69box(body, [s * 0.0256, 0.019, -0.09], [0.0009, 0.007, 0.03], 0, DK2, 1);
  }
  g69box(body, [0.0256, 0.02, 0.022], [0.0012, 0.008, 0.028], 0, DK2, 1);                    // окно выброса
  w69rail(body, -0.135, 0.31, 0.045, 0.0095);
  g69tube(body, [0, 0.016, 0.33], [0, 0.016, 0.485], 0.0085, 0.0085, 10, ST, 4);              // ствол
  g69box(body, [0, 0.023, 0.355], [0.012, 0.014, 0.012], 0.003, DK, 1);                      // газовый блок
  g69lathe(body, 0, 0.016, [[0.48, 0], [0.48, 0.0115], [0.49, 0.0135], [0.536, 0.0135], [0.542, 0.011], [0.542, 0.0068], [0.53, 0.0068]], 12, ST, 4);
  for (let k = 0; k < 3; k++) g69with(body, M34.mul(M34.T(0, 0.016, 0), M34.RZ(k * 2.094)), () => g69box(body, [0, 0.0128, 0.522], [0.0023, 0.0022, 0.016], 0, DK2, 1));
  // приклад
  g69ext(body, [[-0.14, 0.034], [-0.36, 0.03], [-0.372, 0.018], [-0.372, -0.07], [-0.35, -0.078], [-0.30, -0.045], [-0.2, -0.02], [-0.14, -0.018]], -0.016, 0.016, OL, 0, 0.003);
  g69ext(body, [[-0.21, 0.016], [-0.31, 0.014], [-0.33, -0.03], [-0.3, -0.03], [-0.24, -0.008]], -0.0165, 0.0165, DK2, 1);   // вырез приклада
  g69box(body, [0, -0.025, -0.374], [0.018, 0.053, 0.006], 0.004, DK, 1);
  g69box(body, [0, 0.04, -0.27], [0.013, 0.008, 0.07], 0.004, BE, 0);
  g69tube(body, [0, 0.012, -0.135], [0, 0.012, -0.2], 0.014, 0.014, 12, DK, 1);
  // пистолетная рукоять, спуск
  g69with(body, M34.mul(M34.T(0, -0.025, -0.065), M34.RX(0.32)), () => {
    g69box(body, [0, -0.046, 0], [0.0135, 0.048, 0.019], 0.007, DK, 1);
    for (let k = 0; k < 4; k++) g69box(body, [0, -0.028 - k * 0.019, 0], [0.0142, 0.0024, 0.016], 0.001, DK2, 1);
  });
  g69box(body, [0, -0.044, 0.0], [0.004, 0.0025, 0.042], 0, DK, 1);
  g69box(body, [0, -0.034, 0.04], [0.004, 0.012, 0.003], 0, DK, 1);
  g69with(body, M34.mul(M34.T(0, -0.03, 0.01), M34.RX(0.25)), () => g69box(body, [0, -0.006, 0], [0.0022, 0.009, 0.0028], 0, ST, 2));
  // коллиматор
  g69box(body, [0, 0.054, 0.03], [0.014, 0.005, 0.03], 0.002, DK, 1);
  for (const s of [-1, 1]) g69box(body, [s * 0.0148, 0.075, 0.034], [0.0026, 0.019, 0.03], 0.002, BE2, 0);
  g69box(body, [0, 0.0955, 0.034], [0.0174, 0.0026, 0.03], 0.002, BE2, 0);
  g69box(body, [0, 0.075, 0.062], [0.0123, 0.0165, 0.0007], 0, DK, 7);
  w69dot(body, [0, 0.075, 0.0605], 0.0034);
  g69box(body, [0, 0.0625, 0.0035], [0.008, 0.0035, 0.0009], 0, GL, 3);                      // счётчик патронов
  // затвор (рукоять взведения) — отдельная часть
  g69box(bolt, [0, 0.036, -0.133], [0.021, 0.0042, 0.0085], 0.002, DK, 1);
  g69box(bolt, [0.015, 0.02, 0.005], [0.006, 0.004, 0.006], 0.002, ST, 2);
  // изогнутый магазин
  g69with(mag, M34.T(0, -0.04, 0.03), () => {
    g69ext(mag, [[-0.02, 0.005], [0.018, 0.005], [0.03, -0.05], [0.046, -0.11], [0.012, -0.119], [-0.002, -0.06]], -0.0118, 0.0118, OL2, 0, 0.002);
    g69box(mag, [0.03, -0.118, 0], [0.019, 0.005, 0.0135], 0.002, DK, 1);
    for (let k = 0; k < 3; k++) g69box(mag, [0.008 + k * 0.006, -0.03 - k * 0.026, 0.0121], [0.0016, 0.0016, 0.0005], 0, GL, 3);
  });
  g69handL(hl, false);
  return { parts: { body, mag, bolt, hl }, muz: [0, 0.016, 0.546], ej: [0.027, 0.021, 0.022], fl: [0, -0.016, 0.235], gp: [0, -0.025, -0.065], rake: 0.32,
           magO: [0, -0.04, 0.03], magD: [0.0, -0.32, 0.06], sight: 0.075, hip: [0.19, -0.18, 0.5], ads: [0, -0.075, 0.38], flash: 0.075, kick: 1 };
};
W69_DEF.smg = () => {
  const { OL, OL2, BE, BE2, DK, DK2, ST, GL } = C69;
  const body = G69(), mag = G69(), bolt = G69(), hl = G69();
  g69box(body, [0, 0.012, 0.0], [0.023, 0.03, 0.11], 0.008, BE, 0);
  g69lathe(body, 0, 0.012, [[0.105, 0], [0.105, 0.021], [0.29, 0.021], [0.3, 0.017], [0.3, 0.009]], 14, OL2, 0);
  for (let i = 0; i < 5; i++) for (const a of [0, 1.2, -1.2]) g69with(body, M34.mul(M34.T(0, 0.012, 0), M34.RZ(a)), () => g69box(body, [0, 0.0205, 0.135 + i * 0.034], [0.004, 0.0014, 0.009], 0, DK2, 1));
  g69tube(body, [0, 0.012, 0.29], [0, 0.012, 0.335], 0.0082, 0.0082, 10, ST, 4);
  g69lathe(body, 0, 0.012, [[0.322, 0], [0.322, 0.0115], [0.336, 0.0115], [0.336, 0.006]], 10, ST, 4);
  for (const s of [-1, 1]) g69box(body, [s * 0.0233, -0.004, 0.0], [0.0009, 0.0022, 0.07], 0, GL, 3);
  g69box(body, [0.0236, 0.018, 0.02], [0.0011, 0.007, 0.022], 0, DK2, 1);
  w69rail(body, -0.09, 0.09, 0.044, 0.009);
  g69with(body, M34.mul(M34.T(0, -0.018, -0.04), M34.RX(0.25)), () => g69box(body, [0, -0.044, 0], [0.013, 0.045, 0.018], 0.007, DK, 1));
  g69box(body, [0, -0.036, 0.012], [0.004, 0.0025, 0.035], 0, DK, 1);
  for (const s of [-1, 1]){ g69tube(body, [s * 0.012, 0.02, -0.1], [s * 0.012, 0.02, -0.3], 0.0042, 0.0042, 6, DK, 1); g69tube(body, [s * 0.012, 0.02, -0.3], [s * 0.012, -0.055, -0.318], 0.0042, 0.0042, 6, DK, 1); }
  g69box(body, [0, -0.02, -0.322], [0.017, 0.045, 0.006], 0.004, DK, 1);
  g69box(body, [0, 0.051, 0.02], [0.011, 0.004, 0.022], 0.002, DK, 1);
  g69with(body, M34.T(0, 0.067, 0.03), () => { g69torus(body, [0, 0, 0], 0.0145, 0.0026, 18, 6, BE2, 0); g69lathe(body, 0, 0, [[0, 0], [0, 0.0128]], 14, DK, 7); });
  g69box(body, [0, 0.055, 0.03], [0.004, 0.006, 0.002], 0, BE2, 0);
  w69dot(body, [0, 0.067, 0.0295], 0.003);
  g69box(bolt, [0.0, 0.045, -0.062], [0.006, 0.004, 0.012], 0.002, DK, 1);
  g69with(mag, M34.T(0, -0.02, 0.045), () => {
    g69box(mag, [0, -0.055, 0], [0.0108, 0.06, 0.0158], 0.003, OL2, 0);
    g69box(mag, [0, -0.117, 0], [0.013, 0.004, 0.018], 0.002, DK, 1);
    g69box(mag, [0.0112, -0.05, 0.006], [0.0005, 0.035, 0.0016], 0, GL, 3);
  });
  g69handL(hl, false);
  return { parts: { body, mag, bolt, hl }, muz: [0, 0.012, 0.338], ej: [0.025, 0.02, 0.02], fl: [0, -0.009, 0.2], gp: [0, -0.018, -0.04], rake: 0.25,
           magO: [0, -0.02, 0.045], magD: [0, -0.32, 0.04], sight: 0.067, hip: [0.18, -0.17, 0.45], ads: [0, -0.067, 0.34], flash: 0.06, kick: 0.75 };
};
W69_DEF.hmg = () => {
  const { OL, OL2, BE, BE2, DK, DK2, ST, GL, BR } = C69;
  const body = G69(), mag = G69(), bolt = G69(), rot = G69(), hl = G69();
  g69box(body, [0, 0.0, -0.02], [0.045, 0.055, 0.15], 0.013, BE, 0);
  g69box(body, [0, 0.058, -0.02], [0.038, 0.008, 0.12], 0.005, OL, 0);
  for (let i = 0; i < 5; i++) g69box(body, [0.0455, -0.012, -0.11 + i * 0.03], [0.0012, 0.025, 0.006], 0, DK2, 1);
  g69box(body, [0.046, 0.03, -0.02], [0.0012, 0.003, 0.11], 0, GL, 3);
  g69lathe(body, 0, 0, [[0.125, 0], [0.125, 0.046], [0.165, 0.049], [0.19, 0.042], [0.19, 0.012]], 18, OL2, 0);
  g69torus(body, [0, 0, 0.172], 0.0495, 0.0032, 28, 5, GL, 3);
  // ручка для переноски и коллиматор на ней
  g69tube(body, [0, 0.066, -0.1], [0, 0.1, -0.08], 0.007, 0.007, 8, DK, 1);
  g69tube(body, [0, 0.1, -0.08], [0, 0.1, 0.05], 0.007, 0.007, 8, DK, 1);
  g69tube(body, [0, 0.1, 0.05], [0, 0.066, 0.07], 0.007, 0.007, 8, DK, 1);
  g69box(body, [0, 0.108, -0.01], [0.009, 0.004, 0.02], 0.002, DK, 1);
  g69with(body, M34.T(0, 0.124, -0.005), () => { g69torus(body, [0, 0, 0], 0.0125, 0.0024, 18, 6, BE2, 0); g69lathe(body, 0, 0, [[0, 0], [0, 0.011]], 14, DK, 7); });
  w69dot(body, [0, 0.124, -0.0055], 0.0028);
  // рукояти, приклад
  g69with(body, M34.mul(M34.T(0, -0.055, -0.1), M34.RX(0.25)), () => g69box(body, [0, -0.046, 0], [0.015, 0.05, 0.02], 0.007, DK, 1));
  g69with(body, M34.mul(M34.T(0, -0.055, 0.1), M34.RX(-0.08)), () => { g69box(body, [0, -0.046, 0], [0.014, 0.046, 0.017], 0.007, DK, 1); g69box(body, [0, -0.095, 0], [0.018, 0.005, 0.02], 0.003, DK2, 1); });
  g69box(body, [0, 0.0, -0.19], [0.03, 0.042, 0.026], 0.01, DK, 1);
  g69box(body, [0, -0.005, -0.218], [0.032, 0.05, 0.005], 0.004, DK2, 1);
  g69tube(body, [-0.046, 0.0, 0.0], [-0.04, 0.035, 0.0], 0.013, 0.012, 10, DK, 1);   // рукав подачи ленты
  for (let i = 0; i < 4; i++) g69tube(body, [-0.078 + i * 0.009, 0.03, -0.017], [-0.078 + i * 0.009, 0.03, 0.017], 0.0045, 0.0045, 6, BR, 5);
  // блок стволов (крутится)
  for (let k = 0; k < 6; k++){ const a = k * PI / 3, x = Math.cos(a) * 0.021, y = Math.sin(a) * 0.021; g69tube(rot, [x, y, 0.19], [x, y, 0.585], 0.0074, 0.0074, 8, ST, 4); }
  g69tube(rot, [0, 0, 0.19], [0, 0, 0.56], 0.0085, 0.0085, 8, DK, 1);
  for (const z of [0.31, 0.47]) g69lathe(rot, 0, 0, [[z, 0], [z, 0.034], [z + 0.014, 0.034], [z + 0.014, 0]], 18, DK, 1);
  g69lathe(rot, 0, 0, [[0.555, 0], [0.555, 0.033], [0.572, 0.033], [0.572, 0.012]], 18, ST, 4);
  // короб с лентой (магазин)
  g69box(mag, [-0.086, -0.03, 0.0], [0.035, 0.055, 0.07], 0.007, OL, 0);
  g69box(mag, [-0.086, 0.027, 0.0], [0.028, 0.0012, 0.004], 0, GL, 3);
  g69box(mag, [-0.122, -0.03, 0.0], [0.0015, 0.03, 0.05], 0.001, OL2, 0);
  g69box(mag, [-0.086, -0.03, 0.071], [0.022, 0.01, 0.002], 0.001, DK, 1);
  g69box(bolt, [0.05, 0.012, -0.05], [0.007, 0.006, 0.01], 0.002, DK, 1);
  g69with(hl, M34.T(0, 0, 0), () => g69handL(hl, true));
  return { parts: { body, mag, bolt, rot, hl }, muz: [0, 0.0, 0.59], ej: [0.047, -0.02, 0.02], ejDown: true, fl: [0, -0.07, 0.1], vert: true, gp: [0, -0.055, -0.1], rake: 0.25,
           magO: [-0.086, -0.03, 0.0], magD: [-0.08, -0.3, 0.0], sight: 0.124, hip: [0.2, -0.2, 0.52], ads: [0, -0.124, 0.44], flash: 0.095, kick: 0.45 };
};
W69_DEF.rail = () => {
  const { OL, OL2, BE, BE2, DK, DK2, ST, GL } = C69;
  const body = G69(), mag = G69(), bolt = G69(), hl = G69();
  g69ext(body, [[-0.36, 0.03], [-0.12, 0.045], [0.16, 0.045], [0.172, 0.02], [0.162, -0.03], [0.02, -0.035], [-0.05, -0.02], [-0.13, -0.02], [-0.22, -0.035], [-0.36, -0.085]], -0.024, 0.024, BE, 0, 0.003);
  g69ext(body, [[-0.17, -0.0], [-0.27, 0.005], [-0.3, -0.045], [-0.24, -0.04]], -0.0245, 0.0245, DK2, 1);
  g69box(body, [0, 0.0, -0.362], [0.026, 0.06, 0.006], 0.004, DK, 1);
  for (const s of [-1, 1]) g69box(body, [s * 0.0245, 0.0, -0.05], [0.0009, 0.003, 0.09], 0, GL, 3);
  g69with(body, M34.mul(M34.T(0, -0.02, -0.08), M34.RX(0.3)), () => g69box(body, [0, -0.046, 0], [0.013, 0.048, 0.019], 0.007, DK, 1));
  g69box(body, [0, -0.04, -0.03], [0.004, 0.0025, 0.04], 0, DK, 1);
  for (const s of [-1, 1]) g69box(body, [s * 0.019, 0.012, 0.4], [0.006, 0.02, 0.245], 0.003, ST, 4);
  g69box(body, [0, 0.037, 0.4], [0.012, 0.004, 0.225], 0.002, OL, 0);
  for (let z = 0.2; z < 0.62; z += 0.064) g69torus(body, [0, 0.012, z], 0.031, 0.0062, 20, 6, DK, 8);
  g69box(body, [0, 0.012, 0.648], [0.031, 0.027, 0.008], 0.004, DK, 1);
  // прицел
  g69lathe(body, 0, 0.088, [[-0.11, 0], [-0.11, 0.021], [-0.08, 0.022], [-0.06, 0.016], [0.1, 0.016], [0.12, 0.024], [0.16, 0.024], [0.16, 0.0]], 18, DK, 1);
  g69lathe(body, 0, 0.088, [[0.158, 0], [0.158, 0.02]], 16, DK, 7);
  g69lathe(body, 0, 0.088, [[-0.108, 0], [-0.108, 0.019]], 16, DK, 7);
  g69torus(body, [0, 0.088, -0.103], 0.0195, 0.0015, 20, 4, GL, 3);
  for (const z of [-0.03, 0.08]) g69box(body, [0, 0.06, z], [0.008, 0.013, 0.008], 0.002, DK, 1);
  g69tube(body, [0, 0.1, 0.02], [0, 0.118, 0.02], 0.009, 0.009, 10, BE2, 0);
  g69tube(body, [0.014, 0.088, 0.02], [0.031, 0.088, 0.02], 0.008, 0.008, 10, BE2, 0);
  g69box(bolt, [0.03, 0.025, -0.02], [0.008, 0.005, 0.006], 0.002, DK, 1);
  g69box(mag, [0, -0.052, 0.07], [0.016, 0.022, 0.04], 0.005, OL2, 0);
  g69box(mag, [0.0165, -0.052, 0.07], [0.0008, 0.012, 0.03], 0, GL, 8);
  g69handL(hl, false);
  return { parts: { body, mag, bolt, hl }, muz: [0, 0.012, 0.656], fl: [0, -0.012, 0.23], gp: [0, -0.02, -0.08], rake: 0.3, noShell: true,
           magO: [0, -0.052, 0.07], magD: [0, -0.3, 0.02], sight: 0.088, hip: [0.19, -0.19, 0.5], ads: [0, -0.088, 0.4], flash: 0.11, kick: 1.6, rail: true };
};
// плечевая пусковая установка (ракета Q) и граната в левой руке
function w69launcher(){
  const { OL, OL2, BE, BE2, DK, DK2, GL } = C69, g = G69();
  g69lathe(g, 0, 0, [[-0.52, 0.0], [-0.52, 0.062], [-0.48, 0.05], [-0.45, 0.044]], 18, DK, 1);
  g69lathe(g, 0, 0, [[-0.45, 0.046], [0.4, 0.046], [0.415, 0.053], [0.46, 0.053], [0.46, 0.041], [0.4, 0.041]], 20, OL, 0);
  for (const z of [-0.12, 0.18]) g69lathe(g, 0, 0, [[z, 0.0475], [z + 0.03, 0.0475]], 20, BE, 0);
  g69lathe(g, 0, 0, [[0.34, 0], [0.34, 0.032], [0.4, 0.032], [0.44, 0.013], [0.452, 0]], 16, OL2, 0);
  g69lathe(g, 0, 0, [[0.444, 0.009], [0.453, 0.0]], 10, GL, 3);
  g69box(g, [-0.05, 0.03, 0.3], [0.01, 0.02, 0.028], 0.003, DK, 1);
  g69box(g, [-0.05, 0.03, 0.271], [0.006, 0.012, 0.0008], 0, GL, 3);
  g69box(g, [0.0, 0.049, 0.05], [0.004, 0.0015, 0.22], 0, GL, 3);
  g69box(g, [0.0, -0.062, -0.12], [0.016, 0.02, 0.06], 0.004, DK, 1);
  g69tube(g, [0.0, -0.075, -0.12], [0.02, -0.2, -0.25], 0.014, 0.018, 10, DK2, 1);
  return g;
}
function w69grenade(){
  const { OL2, DK, ST, GL, FAB, PAD, OL } = C69, gr = G69(), arm = G69();
  g69with(gr, M34.RX(-PI / 2), () => {
    g69lathe(gr, 0, 0, [[-0.036, 0], [-0.034, 0.012], [-0.026, 0.024], [-0.01, 0.0295], [0.012, 0.0295], [0.026, 0.024], [0.034, 0.013], [0.036, 0.0]], 18, OL2, 0);
    g69lathe(gr, 0, 0, [[-0.004, 0.0302], [0.004, 0.0302]], 18, GL, 3);
    g69tube(gr, [0, 0, 0.034], [0, 0, 0.05], 0.009, 0.009, 10, DK, 1);
  });
  g69box(gr, [0.006, 0.03, 0.0], [0.004, 0.022, 0.0065], 0.002, ST, 2);
  g69with(gr, M34.mul(M34.T(-0.012, 0.046, 0.0), M34.RY(PI / 2)), () => g69torus(gr, [0, 0, 0], 0.009, 0.0016, 14, 4, ST, 2));
  // левая рука с гранатой (ладонь снизу, пальцы обхватывают)
  g69box(arm, [0.0, -0.028, 0.0], [0.026, 0.012, 0.032], 0.011, FAB, 6);
  for (let k = 0; k < 4; k++) g69tube(arm, [-0.026, -0.03, -0.024 + k * 0.016], [-0.03, 0.012, -0.02 + k * 0.014], 0.0085, 0.008, 8, FAB, 6);
  g69tube(arm, [0.024, -0.026, -0.01], [0.03, 0.008, 0.012], 0.009, 0.0085, 8, FAB, 6);
  g69tube(arm, [0.0, -0.035, -0.03], [-0.03, -0.11, -0.16], 0.03, 0.035, 12, PAD, 0);
  g69tube(arm, [-0.03, -0.11, -0.16], [-0.12, -0.28, -0.38], 0.036, 0.05, 12, OL, 6);
  return { gr, arm };
}
function w69shell(big){ const g = G69(), s = big ? 1.35 : 1; g69tube(g, [0, 0, -0.011 * s], [0, 0, 0.011 * s], 0.0042 * s, 0.0042 * s, 8, C69.BR, 5); g69tube(g, [0, 0, -0.0125 * s], [0, 0, -0.011 * s], 0.0048 * s, 0.0048 * s, 8, C69.BR, 5); return g; }
// ---------------------------------------------------------------- шейдеры
const W69_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
uniform mat4 uM; uniform vec4 uPr;
out vec3 vV; out vec3 vN; out vec4 vC; out vec3 vG;
void main(){
  vec4 g = uM * vec4(aP, 1.0);
  vec3 c = vec3(g.x, g.y, -g.z);
  vec3 n = mat3(uM) * aN;
  vV = c; vN = vec3(n.x, n.y, -n.z); vC = aC; vG = aP;
  gl_Position = vec4(c.x * uPr.x, c.y * uPr.y, uPr.z * c.z + uPr.w, -c.z);
}`;
const W69_FS = `#version 300 es
precision highp float;
uniform highp sampler3D uNoise;
uniform vec3 uCamW; uniform mat3 uCR;
uniform vec4 uLP[16]; uniform vec4 uLC[16]; uniform int uNL;
uniform vec4 uP;    // x тень солнца, y фонарь, z команда, w нагрев ствола
uniform vec4 uQ;    // x яркость огоньков, y заряд, z вспышка, w время
uniform vec3 uFlP;  // точка вспышки (камера)
in vec3 vV; in vec3 vN; in vec4 vC; in vec3 vG;
out vec4 frag;
const vec3 SUN1 = normalize(vec3(0.62, 0.55, 0.56));
const vec3 C1 = vec3(1.0, 0.82, 0.62) * 1.7;
const vec3 C2 = vec3(0.58, 0.74, 1.0) * 1.55;
void main(){
  vec3 nc = normalize(vN);
  vec3 n = normalize(uCR * nc);
  vec3 vd = normalize(uCR * -vV);
  vec3 p = uCamW + uCR * vV;
  vec3 up = normalize(p);
  float m = vC.a, team = uP.z;
  vec3 alb = vC.rgb, em = vec3(0.0); float sp = 0.3;
  vec3 glow = team < 0.5 ? vec3(0.35, 1.0, 0.5) * 2.4 : vec3(1.0, 0.1, 0.05) * 3.2;
  float n1 = texture(uNoise, vG * 2.4).r, n2 = texture(uNoise, vG * 9.0 + 0.37).r;
  if (team > 0.5 && (m < 0.5 || m > 5.5 && m < 6.5)){ float l = dot(alb, vec3(0.3, 0.5, 0.2)); alb = vec3(l) * vec3(0.3, 0.32, 0.38); }
  if (m < 0.5){   // краска со сколами до металла и потёртостями
    alb *= 0.78 + 0.44 * n2;
    float chip = smoothstep(0.64, 0.7, n1 * 0.6 + n2 * 0.55);
    float scr = smoothstep(0.76, 0.79, texture(uNoise, vec3(vG.x * 26.0, vG.y * 26.0, vG.z * 1.6)).r);
    alb = mix(alb, vec3(0.1, 0.1, 0.105), max(chip, scr * 0.6));
    sp = mix(0.16, 0.75, max(chip, scr * 0.5));
  } else if (m < 1.5){ sp = 0.32; alb *= 0.85 + 0.3 * n2; }
  else if (m < 2.5){ sp = 0.9; alb *= 0.8 + 0.4 * n1; }
  else if (m < 3.5){ em = glow * uQ.x * (0.88 + 0.12 * sin(uQ.w * 3.1 + vG.z * 40.0)); alb = vec3(0.02); sp = 0.6; }
  else if (m < 4.5){
    sp = 0.65; alb *= 0.8 + 0.4 * n1;
    float h = uP.w; em = vec3(1.7, 0.36, 0.06) * pow(h, 1.5) * 3.2 * (0.6 + 0.8 * n1) * smoothstep(0.08, 0.3, h);
  }
  else if (m < 5.5){ sp = 1.0; }
  else if (m < 6.5){ sp = 0.06; alb *= 0.75 + 0.5 * n2; }
  else if (m < 7.5){ alb = vec3(0.008); sp = 1.8; em = glow * 0.012; }
  else { alb = vec3(0.03); sp = 0.6; em = glow * (0.18 + 2.4 * uQ.y * uQ.y) * (0.9 + 0.1 * sin(uQ.w * 20.0)); }
  float d1 = dot(n, SUN1);
  vec3 L = d1 > 0.0 ? SUN1 : -SUN1, LC = d1 > 0.0 ? C1 : C2;
  float sh = smoothstep(-0.1, 0.05, dot(up, L)); if (dot(up, L) > 0.0) sh *= uP.x;
  vec3 h = normalize(L + vd);
  vec3 col = LC * abs(d1) * sh * (alb + sp * pow(max(dot(n, h), 0.0), 40.0) * 0.6);
  float hemi = 0.5 + 0.5 * dot(n, up);
  vec3 bounce = mix(C2, C1, 0.5 + 0.5 * dot(up, SUN1)) * 0.012;
  vec3 amb = mix(vec3(0.016, 0.015, 0.014), vec3(0.03, 0.036, 0.05), hemi) + bounce * (1.0 - hemi * 0.5);
  col += alb * amb * 1.4 + sp * amb * 0.5;
  for (int i = 0; i < 16; i++){
    if (i >= uNL) break;
    vec3 lv = uLP[i].xyz - p; float dd = dot(lv, lv), rr = uLP[i].w;
    if (dd > rr * rr) continue;
    float ds = sqrt(dd); lv /= ds;
    float f = 1.0 - ds / rr, att = f * f / (1.0 + dd * 0.04);
    col += uLC[i].rgb * att * (alb * max(dot(n, lv), 0.0) + sp * pow(max(dot(n, normalize(lv + vd)), 0.0), 30.0) * 0.5);
  }
  col += alb * uP.y * max(dot(n, vd), 0.0) * vec3(1.0, 0.96, 0.9) * 0.3;
  if (uQ.z > 0.0){ vec3 fl = uFlP - vV; float fd = dot(fl, fl); col += vec3(3.0, 1.9, 0.9) * uQ.z * (alb + sp * 0.3) * max(dot(nc, normalize(fl)), 0.0) / (1.0 + fd * 90.0); }
  float rim = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 3.0);
  col += vec3(0.30, 0.48, 0.62) * 0.05 * rim + em;
  frag = vec4(col, 1.0);
}`;
// спрайты: вспышка выстрела, огонь, дымок от горячего ствола
const W69_SVS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ;
uniform vec3 uC; uniform vec3 uAx; uniform vec3 uAy; uniform vec4 uPr;
out vec2 vQ;
void main(){
  vec3 g = uC + uAx * aQ.x + uAy * aQ.y;
  vec3 c = vec3(g.x, g.y, -g.z);
  vQ = aQ;
  gl_Position = vec4(c.x * uPr.x, c.y * uPr.y, uPr.z * c.z + uPr.w, -c.z);
}`;
const W69_SFS = `#version 300 es
precision highp float;
uniform int uK; uniform vec4 uCol; uniform float uS;
in vec2 vQ;
out vec4 frag;
float hs(float x){ return fract(sin(x * 91.17 + uS * 13.7) * 43758.5); }
void main(){
  float r = length(vQ), a = atan(vQ.y, vQ.x);
  vec3 c; float al = 1.0;
  if (uK == 0){        // звезда вспышки
    float sp = pow(abs(cos(a * 1.5 + uS * 6.28)), 18.0) * exp(-r * 2.2) * (0.7 + 0.6 * hs(floor(a * 3.0 / 3.1416 + 3.0)));
    float core = exp(-r * r * 26.0);
    c = uCol.rgb * (core * 0.9 + sp * 0.55 + exp(-r * 5.0) * 0.12) * uCol.a * (1.0 - smoothstep(0.85, 1.0, r));
  } else if (uK == 1){ // язык пламени вдоль ствола: x от дула (-1) вперёд (+1)
    float x = vQ.x * 0.5 + 0.5, w = 0.12 + 0.55 * x * (1.0 - x) * 2.0;
    float f = exp(-pow(vQ.y / w, 2.0) * 4.0) * pow(1.0 - x, 2.2) * smoothstep(0.0, 0.06, x);
    f *= 0.6 + 0.8 * hs(floor(x * 7.0 + uS * 5.0));
    c = uCol.rgb * f * uCol.a * 0.42;
  } else {             // дымок (премультиплицированная альфа)
    float d = exp(-r * r * 3.2) * (1.0 - smoothstep(0.8, 1.0, r));
    al = d * uCol.a; c = uCol.rgb * al;
  }
  frag = vec4(c, al);
}`;
// ---------------------------------------------------------------- загрузка в видеокарту
WPN69.build = function(){
  this.built = true;
  this.rnd = typeof seeded === 'function' ? seeded(69069) : Math.random;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs, names) => {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const U = {}; for (const n of names) U[n] = gl.getUniformLocation(p, n); return { p, U };
  };
  const A = prog(W69_VS, W69_FS, ['uM', 'uPr', 'uNoise', 'uCamW', 'uCR', 'uLP', 'uLC', 'uNL', 'uP', 'uQ', 'uFlP']);
  const B = prog(W69_SVS, W69_SFS, ['uC', 'uAx', 'uAy', 'uPr', 'uK', 'uCol', 'uS']);
  this.P = A.p; this.U = A.U; this.SP = B.p; this.SU = B.U;
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  const upload = parts => {   // parts: { имя: G69 } -> один VAO, у каждой части свой диапазон индексов
    let nv = 0, ni = 0; for (const k in parts){ nv += parts[k].P.length / 3; ni += parts[k].I.length; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 4), I = new Uint32Array(ni), R = {};
    let ov = 0, oi = 0;
    for (const k in parts){
      const g = parts[k]; P.set(g.P, ov * 3); N.set(g.N, ov * 3); C.set(g.C, ov * 4);
      for (let i = 0; i < g.I.length; i++) I[oi + i] = g.I[i] + ov;
      R[k] = { first: oi, count: g.I.length }; ov += g.P.length / 3; oi += g.I.length;
    }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (loc, data, n) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
    buf(0, P, 3); buf(1, N, 3); buf(2, C, 4);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
    this.stats.tris += ni / 3;
    return { vao, R };
  };
  for (const w of ['rifle', 'smg', 'hmg', 'rail']){
    const D = W69_DEF[w]();
    g69handR(D.parts.body, D.gp, D.rake, w === 'hmg' ? -0.01 : 0);
    D.gpu = upload(D.parts); delete D.parts;
    this.M[w] = D;
  }
  const gn = w69grenade();
  this.M.extra = upload({ launcher: w69launcher(), gren: gn.gr, garm: gn.arm, shell: w69shell(false), shellB: w69shell(true) });
  const qv = gl.createVertexArray(); gl.bindVertexArray(qv);
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  this.quad = qv;
  gl.bindVertexArray(prevVao);
};
// ---------------------------------------------------------------- события: выстрел, ракета
const W69_HEAT = { rifle: 0.024, smg: 0.018, hmg: 0.014, rail: 0.22 };
WPN69.r = function(){ return this.rnd ? this.rnd() : (this._q = ((this._q || 7) * 16807) % 2147483647) / 2147483647; };   // свой ГСЧ — Math.random игры не трогаем
WPN69.onShot = function(w){
  const st = this.st, D = this.M[w], ads = S.aimK || 0;
  const k = (D ? D.kick : (w === 'hmg' ? 0.45 : w === 'rail' ? 1.6 : 1)) * (1 - 0.45 * ads);
  st.vz -= 0.85 * k; st.vp += 6.5 * k; st.vy += (this.r() - 0.5) * 2.2 * k; st.vr += (this.r() - 0.5) * 4.5 * k;
  const now = performance.now() / 1000;
  st.shotT = now; st.flashSeed = this.r();
  st.heat[w] = min(1.25, (st.heat[w] || 0) + (W69_HEAT[w] || 0.02));
  if (w !== 'rail') st.pend = min(4, (st.pend || 0) + 1);
};
{
  const ps0 = gunPlayerShot;
  gunPlayerShot = function(u, W, K, w){ const r = ps0.apply(this, arguments); try { WPN69.onShot(w); } catch (e){} return r; };
  const fr0 = fireRocket;
  fireRocket = function(u, dir){ const r = fr0.apply(this, arguments); if (u === S.me && u.cls === 'inf') WPN69.st.rkT = performance.now() / 1000; return r; };
}
// ---------------------------------------------------------------- поза оружия и частей на этот кадр
function w69ss(a, b, x){ const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
WPN69.pose = function(D, w, dt, now, c, vm3, me){
  const st = this.st, K = S.kit;
  const spr = (x, v, k, d) => { v += (-k * x - d * v) * dt; return [x + v * dt, v]; };
  [st.rz, st.vz] = spr(st.rz, st.vz, 210, 21); [st.rp, st.vp] = spr(st.rp, st.vp, 160, 17);
  [st.ry, st.vy] = spr(st.ry, st.vy, 140, 16); [st.rr, st.vr] = spr(st.rr, st.vr, 120, 14);
  st.rz = clamp(st.rz, -0.09, 0.03); st.rp = clamp(st.rp, -0.3, 0.45);
  // инерция при повороте камеры
  if (st.lastF && dt > 0){
    const d = sub(c.fwd, st.lastF), dx = dot(d, c.right), dy = dot(d, c.up);
    st.svx -= clamp(dx, -0.2, 0.2) * 2.4; st.svy -= clamp(dy, -0.2, 0.2) * 2.4;
  }
  st.lastF = c.fwd.slice();
  [st.sx, st.svx] = spr(st.sx, st.svx, 90, 13); [st.sy, st.svy] = spr(st.sy, st.svy, 90, 13);
  st.sx = clamp(st.sx, -0.04, 0.04); st.sy = clamp(st.sy, -0.04, 0.04);
  // перезарядка: доля 0..1 (по сохранённой начальной длительности — с обвесами тоже верно)
  const rT = K && K.reloadT > 0 ? K.reloadT : 0;
  if (rT > 0){ if (!(st.rl0 > 0) || rT > st.rl0) st.rl0 = rT; } else st.rl0 = 0;
  const rp = rT > 0 ? clamp(1 - rT / st.rl0, 0, 1) : -1;
  // нагрев
  const firing = now - st.shotT < 0.15;
  for (const k in st.heat) st.heat[k] = max(0, st.heat[k] - dt * (firing && k === w ? 0.09 : 0.16));
  // ракета с плеча и граната в левой руке: основное оружие уходит вниз
  const rk = now - (st.rkT || -9), rkE = rk < 0.9 ? w69ss(0, 0.07, rk) * (1 - w69ss(0.55, 0.85, rk)) : 0;
  const gh = typeof G62 !== 'undefined' && G62.hold && G62.hold.u === me;
  if (typeof G62 !== 'undefined' && G62.last !== st.gLast){ if (st.gLast !== undefined && st.gh > 0.3) st.grT = now; st.gLast = G62.last; }
  st.gh += ((gh ? 1 : 0) - (st.gh || 0)) * min(1, dt * 14);
  const gq = now - (st.grT || -9), thr = gq < 0.45 ? 1 - w69ss(0.25, 0.45, gq) : 0;
  if (st.w !== w){ st.w = w; st.swT = now; }
  const sw = 1 - w69ss(0, 0.28, now - (st.swT || -9));
  const gk = max(rkE * 0.85, st.gh * 0.55, thr * 0.55, sw);
  // основное положение
  const ads = vm3[0], low = vm3[1], mv = clamp((me && me.moveAmt) || 0, 0, 1), bob = S.bob || 0;
  const pos = [lerp(D.hip[0], D.ads[0], ads), lerp(D.hip[1], D.ads[1], ads), lerp(D.hip[2], D.ads[2], ads)];
  const bk = 1 - ads * 0.75;
  pos[0] += Math.sin(bob) * 0.008 * mv * bk + st.sx; pos[1] += -Math.abs(Math.cos(bob)) * 0.01 * mv * bk + st.sy + Math.sin(now * 1.3) * 0.0012 * bk;
  pos[2] += st.rz;
  let pitch = st.rp + st.sy * 1.2, yaw = st.ry + st.sx * 1.4, roll = st.rr * 0.5 - st.sx * 1.5;
  if (rp >= 0){
    const a = w69ss(0, 0.14, rp) * (1 - w69ss(0.84, 1, rp));
    roll += 0.42 * a; pitch += 0.2 * a; pos[0] -= 0.05 * a; pos[1] -= 0.025 * a; pos[2] -= 0.03 * a;
  }
  pos[1] -= low * 0.3 + gk * 0.13; pos[0] += low * 0.06 + gk * 0.035; pitch -= low * 0.7 + gk * 0.3; roll -= gk * 0.25;
  const pv = [0, -0.03, -0.06];
  const Mg = M34.ch(M34.T(pos[0] + pv[0], pos[1] + pv[1], pos[2] + pv[2]), M34.RY(yaw), M34.RX(-pitch), M34.RZ(roll), M34.T(-pv[0], -pv[1], -pv[2]));
  // части
  const since = now - st.shotT;
  let bolt = since < 0.06 && w !== 'hmg' ? 0.02 * (1 - since / 0.06) : 0;
  let magOff = [0, 0, 0], magTilt = 0, hand = [0, 0, 0], magHide = false;
  if (rp >= 0){
    const f = w69ss(0.12, 0.34, rp), g = w69ss(0.44, 0.68, rp), m = rp < 0.39 ? f : 1 - g;
    magOff = mul(D.magD, m); magTilt = 0.35 * m; magHide = m > 0.85;
    const kh = w69ss(0.06, 0.16, rp) * (1 - w69ss(0.68, 0.8, rp));
    const grab = D.vert ? [D.magO[0] - 0.01, D.magO[1] - 0.02, D.magO[2] - 0.03] : [D.magO[0], D.magO[1] - 0.105, D.magO[2] + 0.025];
    hand = mul(sub(add(grab, magOff), D.fl), kh);
    if (rp > 0.74 && rp < 0.9) bolt = max(bolt, Math.sin(PI * (rp - 0.74) / 0.16) * 0.05);
  }
  st.rot += dt * (K ? K.spin || 0 : 0) * 48;
  const P = {
    body: Mg, bolt: M34.mul(Mg, M34.T(0, 0, -bolt)), rot: M34.mul(Mg, M34.RZ(st.rot)),
    mag: magHide ? null : M34.ch(Mg, M34.T(D.magO[0] + magOff[0], D.magO[1] + magOff[1], D.magO[2] + magOff[2]), M34.RX(magTilt), M34.T(-D.magO[0], -D.magO[1], -D.magO[2])),
    hl: st.gh > 0.05 || thr > 0 ? null : M34.mul(Mg, M34.T(D.fl[0] + hand[0], D.fl[1] + hand[1], D.fl[2] + hand[2])),
  };
  return { Mg, P, rk, rkE, thr, gq, heat: st.heat[w] || 0, since };
};
// ---------------------------------------------------------------- отрисовка (после рэймарчера и 3D-бойцов)
const W69_UM = new Float32Array(16), W69_CR = new Float32Array(9);
WPN69.draw = function(c, nl, eyeSh, vm3, wk, me){
  if (!this.ok()) return;
  const t0 = performance.now();
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  try {
    if (!this.built) this.build();
    const st = this.st, now = performance.now() / 1000, dt = clamp(now - (st.t || now), 0, 0.05); st.t = now;
    const w = wk === 'smg' || wk === 'hmg' || wk === 'rail' ? wk : 'rifle', D = this.M[w], K = S.kit;
    const ps = this.pose(D, w, dt, now, c, vm3, me);
    const U = this.U, aspect = fboW / fboH, fy = 2 / c.fov, fx = fy / aspect, n = 0.01, f = 10;
    const pr = [fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n)];
    gl.useProgram(this.P);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND);
    gl.uniform4fv(U.uPr, pr);
    gl.uniform3fv(U.uCamW, c.pos);
    W69_CR.set([...c.right, ...c.up, -c.fwd[0], -c.fwd[1], -c.fwd[2]]); gl.uniformMatrix3fv(U.uCR, false, W69_CR);
    gl.uniform4fv(U.uLP, LP); gl.uniform4fv(U.uLC, LC); gl.uniform1i(U.uNL, nl || 0);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_3D, texNoise); gl.uniform1i(U.uNoise, 2);
    const fl = ps.since < 0.05 ? 1 - ps.since / 0.05 : 0;
    const mz = M34.ap(ps.Mg, D.muz);
    gl.uniform3f(U.uFlP, mz[0], mz[1], -mz[2]);
    const team = me ? me.team : 0, glowK = (me && me.elite ? 1.3 : 1) * (K && K.incT > 0 ? 1.25 : 1);
    gl.uniform4f(U.uP, eyeSh, 1, team, ps.heat);
    gl.uniform4f(U.uQ, glowK, K ? K.charge || 0 : 0, fl * (w === 'rail' ? 0.6 : 1), now % 1000);
    const part = (G, k, M) => { const r = G.R[k]; if (!r || !M) return; gl.uniformMatrix4fv(U.uM, false, M34.gl(M, W69_UM)); gl.drawElements(gl.TRIANGLES, r.count, gl.UNSIGNED_INT, r.first * 4); };
    gl.bindVertexArray(D.gpu.vao);
    for (const k of ['body', 'bolt', 'rot', 'mag', 'hl']) part(D.gpu, k, ps.P[k]);
    // плечевая пусковая, граната, гильзы
    const X = this.M.extra;
    gl.bindVertexArray(X.vao);
    gl.uniform4f(U.uP, eyeSh, 1, team, 0);
    let rkM = null;
    if (ps.rkE > 0.001){
      const kick = ps.rk > 0.02 ? Math.exp(-(ps.rk - 0.02) * 10) : 0;
      rkM = M34.ch(M34.T(0.3, -0.1 - (1 - ps.rkE) * 0.34, 0.16 - kick * 0.07), M34.RX(-0.02 - kick * 0.08), M34.RY(-0.11));
      part(X, 'launcher', rkM);
    }
    const st2 = this.st;
    if (st2.gh > 0.05 || ps.thr > 0){
      const h = st2.gh, q = ps.thr > 0 ? clamp(ps.gq / 0.3, 0, 1) : 0;
      const Ma = M34.ch(M34.T(-0.2 + 0.06 * q, -0.27 + 0.1 * h + 0.16 * q - (ps.thr > 0 ? 0.25 * w69ss(0.25, 0.45, ps.gq) : 0), 0.46 + 0.28 * q), M34.RX(-0.35 - 0.9 * q), M34.RZ(-0.2));
      part(X, 'garm', Ma);
      if (q < 0.4) part(X, 'gren', M34.mul(Ma, M34.T(0, 0.012, 0)));
    }
    // гильзы
    const Up = norm(c.pos), gV = [-dot(Up, c.right) * 9.8, -dot(Up, c.up) * 9.8, -dot(Up, c.fwd) * 9.8];
    while (st.pend > 0){
      st.pend--;
      const p = M34.ap(ps.Mg, D.ej || D.muz), r = () => this.r() - 0.5;
      const v = M34.an(ps.Mg, D.ejDown ? [0.5 + r() * 0.3, -1.1 + r() * 0.3, 0.1] : [1.6 + r() * 0.5, 1.2 + r() * 0.4, -0.35 + r() * 0.2]);
      st.shells.push({ p, v, a: [r() * 6, r() * 6], av: [r() * 50, 20 + r() * 40], t: 0, big: w === 'hmg' });
      if (st.shells.length > 14) st.shells.shift();
    }
    for (const s of st.shells){
      s.t += dt; s.v = add(s.v, mul(gV, dt)); s.p = add(s.p, mul(s.v, dt)); s.a[0] += s.av[0] * dt; s.a[1] += s.av[1] * dt;
      part(X, s.big ? 'shellB' : 'shell', M34.ch(M34.T(s.p[0], s.p[1], s.p[2]), M34.RX(s.a[0]), M34.RY(s.a[1])));
    }
    st.shells = st.shells.filter(s => s.t < 0.6);
    // ---- спрайты: вспышка, огонь, дымок
    const SU = this.SU;
    gl.useProgram(this.SP); gl.bindVertexArray(this.quad);
    gl.uniform4fv(SU.uPr, pr);
    gl.enable(gl.BLEND); gl.depthMask(false);
    const spr = (k, C, ax, ay, col, a, seed) => { gl.uniform1i(SU.uK, k); gl.uniform3fv(SU.uC, C); gl.uniform3fv(SU.uAx, ax); gl.uniform3fv(SU.uAy, ay); gl.uniform4f(SU.uCol, col[0], col[1], col[2], a); gl.uniform1f(SU.uS, seed); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    // дымок от горячего ствола (после очереди)
    st.wisT -= dt;
    if (ps.heat > 0.3 && ps.since > 0.15 && st.wisT <= 0 && vm3[0] < 0.5){ st.wisT = 0.06; st.wisps.push({ p: mz.slice(), v: [(this.r() - 0.5) * 0.03, 0.08 + this.r() * 0.05, 0.03], t: 0, life: 1.2 + this.r() * 0.4, k: min(1, ps.heat), s: this.r() }); if (st.wisps.length > 30) st.wisps.shift(); }
    if (st.wisps.length){
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      for (const q of st.wisps){
        q.t += dt; q.p = add(q.p, mul(q.v, dt)); q.v[0] += (Math.sin(q.t * 3 + q.s * 9) * 0.04) * dt;
        const s = 0.012 + q.t * 0.05, a = 0.2 * q.k * (1 - q.t / q.life) * w69ss(0, 0.15, q.t);
        spr(2, q.p, [s, 0, 0], [0, s, 0], [0.045, 0.045, 0.048], a, q.s);
      }
      st.wisps = st.wisps.filter(q => q.t < q.life);
    }
    gl.blendFunc(gl.ONE, gl.ONE); gl.disable(gl.DEPTH_TEST);
    if (fl > 0){
      const dir = M34.an(ps.Mg, [0, 0, 1]), sz = D.flash * (0.8 + 0.4 * st.flashSeed) * (0.5 + 0.5 * fl), ang = st.flashSeed * 6.28;
      const col = w === 'rail' ? [0.7, 1.5, 3.2] : K && K.incT > 0 ? [3.4, 1.5, 0.5] : [3.0, 1.9, 0.9];
      spr(0, add(mz, mul(dir, 0.012)), [Math.cos(ang) * sz, Math.sin(ang) * sz, 0], [-Math.sin(ang) * sz, Math.cos(ang) * sz, 0], col, fl, st.flashSeed);
      const L = sz * 1.5, wy = mul(norm(cross(dir, norm(mz))), sz * 0.55);
      spr(1, add(mz, mul(dir, L)), mul(dir, L), wy, col, fl * 0.9, st.flashSeed);
    }
    if (rkM && ps.rk < 0.1){
      const rf = 1 - ps.rk / 0.1, tip = M34.ap(rkM, [0, 0, 0.47]), dir = M34.an(rkM, [0, 0, 1]), sz = 0.16 * (0.6 + 0.4 * rf);
      spr(0, tip, [sz, 0, 0], [0, sz, 0], [3.2, 1.8, 0.8], rf, 0.37);
      spr(1, add(tip, mul(dir, sz * 1.3)), mul(dir, sz * 1.3), mul(norm(cross(dir, norm(tip))), sz * 0.6), [3.2, 1.8, 0.8], rf, 0.71);
    }
    st.mz = mz; st.fx = fx; st.fy = fy;
  } catch (e){ this.fail(e); }
  gl.disable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ZERO); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  gl.bindVertexArray(prevVao);
  gl.activeTexture(gl.TEXTURE0);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
  this.drawnAt = performance.now();
};
// марево над раскалённым стволом: короткие «трассеры» постобработки (post.glsl, uTrc) над дулом
WPN69.shimmer = function(TRC, nt){
  const st = this.st, w = st.w, h = st.heat[w] || 0, mz = st.mz;
  if (!this.ok() || !mz || h < 0.45 || nt >= 7 || performance.now() - (this.drawnAt || -1e9) > 100 || mz[2] < 0.05) return nt;
  const uv = p => [0.5 + 0.5 * p[0] * st.fx / p[2], 0.5 + 0.5 * p[1] * st.fy / p[2]];
  const t = performance.now() / 1000;
  const a = uv([mz[0], mz[1] + 0.015, mz[2]]), b = uv([mz[0] + 0.012 * Math.sin(t * 5), mz[1] + 0.06 + 0.07 * min(1, h), mz[2]]);
  TRC.set([a[0], a[1], b[0], b[1]], nt * 4);
  return nt + 1;
};
// ---------------------------------------------------------------- пулемёт в руках 3D-пулемётчика (heavy65.js): та же новая модель
{
  const hg0 = hvGunGeo;
  hvGunGeo = function(){
    try {
      const D = W69_DEF.hmg(), out = { P: [], N: [], C: [], I: [] }, X = M34.T(0, 0.055, 0.09);
      for (const k of ['body', 'mag', 'rot', 'bolt']){
        const g = D.parts[k], base = out.P.length / 3;
        for (let i = 0; i < g.P.length / 3; i++){
          const p = M34.ap(X, [g.P[i * 3], g.P[i * 3 + 1], g.P[i * 3 + 2]]), m = g.C[i * 4 + 3];
          let col = [g.C[i * 4], g.C[i * 4 + 1], g.C[i * 4 + 2]], a = 1;
          if (m === 3){ col = mul(C69.GL, 2.2); a = 2; }
          else if (m === 4) col = C69.ST;
          else if (m === 7) col = C69.DK;
          else if (m === 0){ const hh = Math.abs(Math.sin(p[0] * 91.7 + p[1] * 47.3 + p[2] * 23.9) * 437.5) % 1; col = mul(col, 0.82 + 0.3 * hh); }
          out.P.push(...p); out.N.push(g.N[i * 3], g.N[i * 3 + 1], g.N[i * 3 + 2]); out.C.push(col[0], col[1], col[2], a);
        }
        for (const ix of g.I) out.I.push(ix + base);
      }
      return out;
    } catch (e){ try { console.warn('WPN69: пулемёт пулемётчика — прежний', e && e.message); } catch (_){} return hg0(); }
  };
}
