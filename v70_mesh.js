// =====================================================================
//  v7.0 — 3D-ПОСТРОЙКИ УЛУЧШЕНИЙ: дот, тяжёлый бункер с ПТ-пушкой, ангар ремонтных дронов,
//  генератор силового купола, радиомачта, снайперская вышка; у штаба — бронеплиты, турели,
//  маяк орбитального сброса, обогатительные колонны, радар, антенны связи.
//  Модели строятся процедурно (те же построители, что у оружия v6.9: g69box/g69tube/g69lathe/g69torus),
//  рисуются в мире после рэймарчера и 3D-бойцов, с тестом глубины (как heavy65.js).
//  Если WebGL что-то не принял — ST70.failed, постройки просто не рисуются (логика работает).
// =====================================================================
const ST70 = {
  on: true, built: false, failed: false, err: '', P: null, U: null, M: {}, items: [], stats: { ms: 0, drawn: 0, tris: 0 },
  ok(){ return this.on && !this.failed; },
  fail(e){ this.failed = true; this.err = String(e && e.message || e); try { console.warn('ST70: 3D-постройки отключены —', this.err); } catch (_){} },
};
const ST70_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
uniform mat4 uM; uniform mat3 uV; uniform vec4 uPr;
out vec3 vW; out vec3 vN; out vec4 vC; out float vZ; out vec3 vL;
void main(){
  vec4 wp = uM * vec4(aP, 1.0);
  vW = wp.xyz; vN = mat3(uM) * aN; vC = aC; vL = aP;
  vec3 v = uV * wp.xyz; vZ = -v.z;
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
const ST70_FS = `#version 300 es
precision highp float;
uniform vec3 uCamW, uPaint, uGlow;
uniform vec4 uP;      // x тень солнца, y вспышка попадания, z время, w яркость свечения / сила купола
uniform vec4 uLP[16]; uniform vec4 uLC[16]; uniform int uNL;
uniform float uLamp, uStorm; uniform int uMode;
uniform highp sampler3D uNoise;
in vec3 vW; in vec3 vN; in vec4 vC; in float vZ; in vec3 vL;
out vec4 frag;
const vec3 SUN1 = normalize(vec3(0.62, 0.55, 0.56));
const vec3 SUN2 = -SUN1;
const vec3 C1 = vec3(1.0, 0.82, 0.62) * 1.7;
const vec3 C2 = vec3(0.58, 0.74, 1.0) * 1.55;
vec3 fogCol(vec3 d){
  vec3 f = vec3(0.016, 0.019, 0.032);
  f += C1 * 0.018 * pow(max(dot(d, SUN1), 0.0), 5.0);
  f += C2 * 0.018 * pow(max(dot(d, SUN2), 0.0), 5.0);
  return mix(f, vec3(0.085, 0.065, 0.045) * (0.8 + 0.4 * max(dot(d, SUN1), 0.0)), uStorm * 0.85);
}
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 p = vW + uCamW, vd = normalize(-vW), up = normalize(p);
  float cd = length(vW);
  float fd = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0);
  if (uMode == 1){   // силовой купол: аддитивная оболочка, сетка из меридианов и колец, ярче по краю
    float fr = pow(1.0 - abs(dot(n, vd)), 2.0);
    float lon = atan(vL.z, vL.x);
    float rings = smoothstep(0.40, 0.5, abs(fract(vL.y * 9.0 - uP.z * 0.25) - 0.5));
    float mer = smoothstep(0.43, 0.5, abs(fract(lon * 2.8648) - 0.5));
    float a = (0.03 + 0.42 * fr + 0.22 * max(rings, mer) * (0.35 + fr)) * uP.w * smoothstep(0.0, 0.08, vL.y);
    frag = vec4(uGlow * a * exp(-cd * 0.0011), 1.0);
    gl_FragDepth = fd;
    return;
  }
  float m = vC.a, nz = texture(uNoise, p * 0.19).r;
  vec3 alb; float sp = 0.25; vec3 em = vec3(0.0);
  if (m < 0.5){ alb = uPaint * vC.r * 2.0 * (0.85 + 0.3 * nz); sp = 0.35; }          // краска фракции
  else if (m < 1.5){ alb = vC.rgb * (0.72 + 0.56 * nz); sp = 0.1; }                    // бетон, мешки
  else if (m < 2.5){ alb = vC.rgb * (0.9 + 0.2 * nz); sp = 0.65; }                     // металл
  else if (m < 3.5){ alb = vec3(0.02); em = uGlow * vC.r * uP.w; sp = 0.3; }           // свечение фракции
  else if (m < 4.5){ alb = vec3(0.012, 0.016, 0.02); sp = 1.4; em = uGlow * 0.03; }    // стекло
  else { alb = vec3(0.02); em = vC.rgb * (0.4 + 0.6 * uP.w); }                          // сигнальные огни
  alb = mix(alb, vec3(1.0, 0.55, 0.2), uP.y * 0.5); em += vec3(1.0, 0.45, 0.15) * uP.y * 0.6;
  float d1 = dot(n, SUN1);
  vec3 L = d1 > 0.0 ? SUN1 : SUN2, LC = d1 > 0.0 ? C1 : C2;
  float sh = smoothstep(-0.1, 0.05, dot(up, L)); if (dot(up, L) > 0.0) sh *= uP.x;
  vec3 h = normalize(L + vd);
  vec3 col = LC * abs(d1) * sh * (alb + sp * pow(max(dot(n, h), 0.0), 40.0) * 0.6);
  float hemi = 0.5 + 0.5 * dot(n, up);
  vec3 bounce = mix(C2, C1, 0.5 + 0.5 * dot(up, SUN1)) * 0.012;
  vec3 amb = mix(vec3(0.016, 0.015, 0.014), vec3(0.03, 0.036, 0.05), hemi) + bounce * (1.0 - hemi * 0.5);
  col += alb * amb;
  for (int i = 0; i < 16; i++){
    if (i >= uNL) break;
    vec3 lv = uLP[i].xyz - p; float dd = dot(lv, lv), rr = uLP[i].w;
    if (dd > rr * rr) continue;
    float ds = sqrt(dd); lv /= ds;
    float f = 1.0 - ds / rr, att = f * f / (1.0 + dd * 0.04);
    col += uLC[i].rgb * att * (alb * max(dot(n, lv), 0.0) + sp * pow(max(dot(n, normalize(lv + vd)), 0.0), 30.0) * 0.5);
  }
  col += alb * uLamp * max(dot(n, vd), 0.0) * vec3(1.0, 0.96, 0.9) * 0.3 * exp(-cd * 0.04);
  float rim = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 2.5);
  col += vec3(0.30, 0.48, 0.62) * 0.12 * rim + em;
  col = mix(fogCol(-vd), col, exp(-cd * (0.0011 + 0.016 * uStorm)));
  frag = vec4(col, 1.0);
  gl_FragDepth = fd;
}`;
// ---------------------------------------------------------------- построители (оси: x вправо, y вверх, z вперёд; метры)
const C70 = { CON: [0.30, 0.29, 0.26], CON2: [0.24, 0.235, 0.215], BAG: [0.37, 0.32, 0.22], DK: [0.05, 0.05, 0.055], ST: [0.13, 0.13, 0.14],
              P: [0.5, 0.5, 0.5], P2: [0.38, 0.38, 0.38], NET: [0.16, 0.19, 0.12], RED: [3.2, 0.25, 0.1], AMB: [3.0, 1.6, 0.3], WH: [2.2, 2.4, 2.6] };
const st70Y = (x, y, z) => M34.ch(M34.T(x, y, z), M34.RX(-PI / 2));          // ось тел вращения z -> y
function st70lathe(g, x, y, z, prof, seg, col, mat){ g69with(g, st70Y(x, y, z), () => g69lathe(g, 0, 0, prof, seg, col, mat)); }
function st70ring(g, x, y, z, R, r, col, mat, su){ g69with(g, st70Y(x, y, z), () => g69torus(g, [0, 0, 0], R, r, su || 28, 6, col, mat)); }
function st70bagRing(g, R, y, n, a0, a1){   // мешки с песком по дуге
  for (let i = 0; i < n; i++){
    const a = a0 + (a1 - a0) * (i + 0.5) / n;
    g69with(g, M34.ch(M34.T(Math.sin(a) * R, y, Math.cos(a) * R), M34.RY(a)), () => g69box(g, [0, 0, 0], [R * (a1 - a0) / n * 0.52, 0.17, 0.26], 0.12, C70.BAG, 1));
  }
}
function st70mast(g, H, w0, w1, rr){   // решётчатая мачта из 4 стоек с раскосами
  const P = (k, y) => { const w = w0 + (w1 - w0) * y / H; return [(k & 1 ? 1 : -1) * w, y, (k & 2 ? 1 : -1) * w]; };
  const ord = [0, 1, 3, 2];
  for (const k of ord) g69tube(g, P(k, 0), P(k, H), rr, rr * 0.8, 6, C70.ST, 2, false);
  for (let y = 0; y < H - 0.5; y += 1.6) for (let i = 0; i < 4; i++){
    const a = ord[i], b = ord[(i + 1) % 4];
    g69tube(g, P(a, y), P(b, y + 1.6), rr * 0.55, rr * 0.55, 4, C70.ST, 2, false);
    g69tube(g, P(a, y + 1.6), P(b, y + 1.6), rr * 0.5, rr * 0.5, 4, C70.ST, 2, false);
  }
}
const ST70_DEF = {
  // ---- «Оборона» I: дот с пулемётом
  bunker(){
    const g = G69();
    g69box(g, [0, -0.4, 0], [2.3, 0.8, 2.3], 0.2, C70.CON2, 1);                          // фундамент (уходит в грунт)
    g69box(g, [0, 0.95, 0], [1.75, 0.8, 1.75], 0.45, C70.CON, 1);                         // тело
    g69box(g, [0, 1.85, 0], [1.95, 0.16, 1.95], 0.12, C70.P, 0);                          // плита крыши
    g69box(g, [0, 1.22, 1.72], [1.15, 0.13, 0.08], 0.03, C70.DK, 2);                      // амбразура
    g69box(g, [0, 1.42, 1.9], [1.35, 0.06, 0.24], 0.03, C70.P2, 0);                       // козырёк
    st70bagRing(g, 2.75, 0.18, 14, -1.25, 1.25); st70bagRing(g, 2.7, 0.5, 13, -1.1, 1.1);
    g69tube(g, [-1.4, 2.0, -1.4], [-1.4, 4.2, -1.4], 0.035, 0.02, 5, C70.ST, 2);          // антенна
    g69box(g, [-1.4, 4.25, -1.4], [0.06, 0.06, 0.06], 0.02, [0.6, 0, 0], 5);
    g69box(g, [1.2, 2.05, -1.1], [0.4, 0.12, 0.3], 0.05, C70.DK, 2);                      // вентиляция
    return g;
  },
  bunkerArmor(){   // «Оборона» II усиливает дот: навесные плиты и маскировочная сеть
    const g = G69();
    for (const s of [-1, 1]) g69with(g, M34.ch(M34.T(s * 1.9, 0.95, 0.2), M34.RZ(s * 0.18)), () => g69box(g, [0, 0, 0], [0.12, 0.85, 1.5], 0.04, C70.P2, 0));
    g69with(g, M34.ch(M34.T(0, 0.75, 2.0), M34.RX(-0.25)), () => g69box(g, [0, 0, 0], [1.6, 0.5, 0.1], 0.04, C70.P2, 0));
    g69box(g, [0, 2.06, -0.2], [2.2, 0.05, 1.9], 0.02, C70.NET, 1);
    return g;
  },
  mg(){   // пулемёт в амбразуре (поворачивается)
    const g = G69();
    g69box(g, [0, 0, -0.15], [0.14, 0.12, 0.3], 0.04, C70.DK, 2);
    g69tube(g, [0, 0.02, 0.1], [0, 0.02, 1.25], 0.045, 0.04, 8, C70.ST, 2);
    g69tube(g, [0, 0.02, 0.85], [0, 0.02, 1.3], 0.065, 0.065, 8, C70.DK, 2);
    g69box(g, [0.18, -0.05, -0.1], [0.07, 0.11, 0.16], 0.03, C70.P, 0);                  // короб с лентой
    return g;
  },
  // ---- «Оборона» II: тяжёлый бункер с противотанковой пушкой
  hbunker(){
    const g = G69();
    g69box(g, [0, -0.5, 0], [3.4, 0.9, 2.9], 0.25, C70.CON2, 1);
    g69box(g, [0, 1.0, -0.4], [2.7, 1.0, 2.0], 0.55, C70.CON, 1);
    g69with(g, M34.ch(M34.T(0, 1.0, 1.75), M34.RX(-0.42)), () => g69box(g, [0, 0, 0], [2.6, 1.05, 0.35], 0.12, C70.CON, 1));   // наклонный лоб
    g69box(g, [0, 2.1, -0.4], [2.9, 0.2, 2.2], 0.15, C70.P, 0);
    g69box(g, [0, 0.35, 2.3], [1.5, 0.35, 0.6], 0.15, C70.CON2, 1);                       // бруствер под пушкой
    for (const s of [-1, 1]) g69box(g, [s * 2.4, 2.35, -1.6], [0.25, 0.08, 0.25], 0.04, C70.DK, 2);
    st70bagRing(g, 3.9, 0.2, 18, -1.0, 1.0);
    g69box(g, [0, 2.32, -0.4], [3.0, 0.05, 2.3], 0.02, C70.NET, 1);
    g69box(g, [-2.1, 2.4, 0.9], [0.06, 0.06, 0.06], 0.02, [0.6, 0, 0], 5);
    return g;
  },
  at(){   // ПТ-пушка: щит, длинный ствол с дульным тормозом
    const g = G69();
    g69box(g, [0, 0.05, 0.25], [0.75, 0.45, 0.05], 0.03, C70.P, 0);
    g69box(g, [0, -0.1, -0.2], [0.28, 0.22, 0.55], 0.06, C70.DK, 2);
    g69tube(g, [0, 0.08, 0.1], [0, 0.08, 3.1], 0.1, 0.075, 10, C70.ST, 2);
    g69tube(g, [0, 0.2, -0.1], [0, 0.2, 1.1], 0.05, 0.05, 8, C70.DK, 2);
    g69box(g, [0, 0.08, 3.12], [0.16, 0.1, 0.14], 0.03, C70.DK, 2);
    for (const s of [-1, 1]) g69tube(g, [s * 0.3, -0.25, -0.3], [s * 0.6, -0.55, -1.5], 0.05, 0.05, 6, C70.DK, 2);   // станины
    return g;
  },
  // ---- «Поддержка» I: ангар ремонтных дронов
  bay(){
    const g = G69();
    st70lathe(g, 0, -0.6, 0, [[0, 0], [0, 3.0], [0.75, 3.0], [0.85, 2.85], [0.85, 0]], 32, C70.CON, 1);
    st70ring(g, 0, 0.27, 0, 2.3, 0.07, [1, 1, 1], 3, 40);
    for (let k = 0; k < 4; k++){ const a = k * PI / 2 + PI / 4; g69box(g, [Math.sin(a) * 2.6, 0.3, Math.cos(a) * 2.6], [0.14, 0.05, 0.14], 0.03, [0.2, 2.5, 1.0], 5); }
    g69box(g, [0, 0.9, -4.0], [1.55, 1.15, 1.2], 0.75, C70.P, 0);                          // ангар-капсула
    g69box(g, [0, 0.75, -2.82], [0.95, 0.62, 0.06], 0.08, C70.DK, 2);                      // ворота
    g69box(g, [0, 1.55, -2.8], [1.0, 0.07, 0.04], 0.02, [1, 1, 1], 3);
    g69tube(g, [1.2, 1.9, -4.4], [1.2, 4.0, -4.4], 0.04, 0.025, 5, C70.ST, 2);
    g69box(g, [1.2, 4.05, -4.4], [0.07, 0.07, 0.07], 0.02, [0.2, 2.5, 1.0], 5);
    g69box(g, [-1.15, 0.55, -1.9], [0.35, 0.3, 0.35], 0.06, C70.DK, 2);                     // ящики с запчастями
    g69box(g, [-0.6, 0.42, -1.5], [0.25, 0.16, 0.25], 0.05, C70.P2, 0);
    return g;
  },
  drone(){   // ремонтный дрон (летает)
    const g = G69();
    g69box(g, [0, 0, 0], [0.22, 0.07, 0.3], 0.06, C70.P, 0);
    g69box(g, [0, -0.05, 0.22], [0.07, 0.04, 0.05], 0.02, [1, 1, 1], 3);
    for (let k = 0; k < 4; k++){
      const x = k & 1 ? 0.42 : -0.42, z = k & 2 ? 0.42 : -0.42;
      g69tube(g, [0, 0, 0], [x, 0.03, z], 0.025, 0.02, 5, C70.DK, 2, false);
      st70lathe(g, x, 0.05, z, [[0, 0.17], [0.02, 0.17]], 14, C70.DK, 2);
    }
    g69tube(g, [0, -0.09, 0], [0, -0.25, 0.05], 0.03, 0.015, 6, C70.ST, 2);                 // манипулятор-сварка
    return g;
  },
  // ---- «Поддержка» II: генератор силового купола + сам купол
  gen(){
    const g = G69();
    st70lathe(g, 0, -0.5, 0, [[0, 0], [0, 1.9], [0.6, 1.9], [0.8, 1.2], [1.1, 0.7], [1.1, 0]], 24, C70.CON, 1);
    st70lathe(g, 0, 0.6, 0, [[0, 0.55], [3.8, 0.38], [4.0, 0.5], [4.3, 0.0]], 18, C70.P, 0);
    for (const y of [1.9, 2.9, 3.9]) st70ring(g, 0, y, 0, 0.62, 0.07, [1, 1, 1], 3, 24);
    st70lathe(g, 0, 4.9, 0, [[-0.45, 0.0], [-0.3, 0.38], [0.0, 0.48], [0.3, 0.38], [0.45, 0.0]], 18, [1, 1, 1], 3);
    for (let k = 0; k < 3; k++){ const a = k * 2.094; g69tube(g, [Math.sin(a) * 1.6, 0.6, Math.cos(a) * 1.6], [Math.sin(a) * 0.5, 3.6, Math.cos(a) * 0.5], 0.08, 0.05, 6, C70.DK, 2); }
    return g;
  },
  dome(){
    const g = G69(), prof = [];
    for (let i = 0; i <= 18; i++){ const a = i / 18 * PI / 2; prof.push([Math.sin(a), Math.cos(a)]); }
    st70lathe(g, 0, 0, 0, prof, 64, [1, 1, 1], 0);
    return g;
  },
  // ---- «Разведка» I: радиомачта со сканером
  mast(){
    const g = G69();
    g69box(g, [0, -0.3, 0], [1.4, 0.6, 1.4], 0.15, C70.CON2, 1);
    st70mast(g, 11, 0.9, 0.35, 0.07);
    g69box(g, [0, 11.05, 0], [0.75, 0.08, 0.75], 0.05, C70.DK, 2);
    g69box(g, [1.0, 0.75, 0.9], [0.55, 0.45, 0.4], 0.08, C70.P, 0);                       // аппаратная
    g69box(g, [1.0, 0.95, 1.31], [0.3, 0.08, 0.02], 0.01, [1, 1, 1], 3);
    for (const y of [5.5, 11.2]) g69box(g, [0.38, y, 0.38], [0.07, 0.07, 0.07], 0.02, C70.RED, 5);
    return g;
  },
  dish(){   // вращающаяся антенна сканера
    const g = G69();
    g69tube(g, [0, 0, 0], [0, 0.9, 0], 0.08, 0.06, 8, C70.ST, 2);
    g69with(g, M34.ch(M34.T(0, 1.15, 0), M34.RX(-0.25)), () => {
      g69lathe(g, 0, 0, [[0.0, 0.0], [0.08, 0.5], [0.22, 0.95], [0.32, 1.25], [0.3, 1.3], [0.2, 1.0], [0.06, 0.5], [-0.02, 0.0]], 28, C70.P, 0);
      g69tube(g, [0, 0, 0.1], [0, 0, 1.0], 0.03, 0.03, 6, C70.DK, 2);
      g69box(g, [0, 0, 1.02], [0.08, 0.08, 0.06], 0.02, [1, 1, 1], 3);
    });
    return g;
  },
  // ---- «Разведка» II: снайперская вышка / корректировщик
  tower(){
    const g = G69();
    g69box(g, [0, -0.3, 0], [1.7, 0.6, 1.7], 0.15, C70.CON2, 1);
    for (let k = 0; k < 4; k++){ const x = k & 1 ? 1 : -1, z = k & 2 ? 1 : -1; g69tube(g, [x * 1.35, 0, z * 1.35], [x * 0.95, 9.2, z * 0.95], 0.11, 0.09, 6, C70.ST, 2); }
    for (const y of [3, 6]) for (let k = 0; k < 4; k++){ const a = [[-1, -1], [1, -1], [1, 1], [-1, 1]], A = a[k], B = a[(k + 1) % 4], w = 1.35 - 0.4 * y / 9.2;
      g69tube(g, [A[0] * w, y, A[1] * w], [B[0] * w, y, B[1] * w], 0.06, 0.06, 4, C70.ST, 2); }
    g69box(g, [0, 9.35, 0], [1.6, 0.15, 1.6], 0.06, C70.CON, 1);
    g69box(g, [0, 10.3, 0], [1.3, 0.8, 1.3], 0.18, C70.P, 0);
    for (let k = 0; k < 4; k++) g69with(g, M34.RY(k * PI / 2), () => g69box(g, [0, 10.55, 1.31], [0.95, 0.16, 0.03], 0.02, [0, 0, 0], 4));
    g69box(g, [0, 11.25, 0], [1.55, 0.12, 1.55], 0.08, C70.P2, 0);
    g69tube(g, [0.3, 10.45, 1.2], [0.3, 10.5, 2.1], 0.06, 0.05, 8, C70.DK, 2);           // стереотруба
    g69tube(g, [-1.25, 0.1, 1.5], [-1.25, 9.3, 1.1], 0.03, 0.03, 4, C70.ST, 2);          // лестница
    g69tube(g, [-0.85, 0.1, 1.5], [-0.85, 9.3, 1.1], 0.03, 0.03, 4, C70.ST, 2);
    for (let y = 0.5; y < 9.2; y += 0.55){ const z = 1.5 - 0.4 * y / 9.2; g69tube(g, [-1.25, y, z], [-0.85, y, z], 0.02, 0.02, 4, C70.ST, 2, false); }
    g69tube(g, [0.9, 11.37, -0.9], [0.9, 13.4, -0.9], 0.03, 0.02, 5, C70.ST, 2);
    g69box(g, [0.9, 13.45, -0.9], [0.06, 0.06, 0.06], 0.02, C70.RED, 5);
    return g;
  },
  // ---- ШТАБ
  plate(){   // бронеплита на стену штаба
    const g = G69();
    g69box(g, [0, 0, 0], [2.5, 3.0, 0.22], 0.08, C70.P2, 0);
    for (const y of [-2.2, 0, 2.2]) for (const x of [-2.1, 2.1]) g69lathe(g, x, y, [[0.2, 0.0], [0.2, 0.12], [0.28, 0.0]], 8, C70.DK, 2);
    g69box(g, [0, 2.75, 0.24], [2.3, 0.05, 0.05], 0.02, [1, 1, 1], 3);
    return g;
  },
  hqtBase(){
    const g = G69();
    st70lathe(g, 0, -0.2, 0, [[0, 0], [0, 1.3], [0.9, 1.15], [1.2, 0.8], [1.2, 0]], 20, C70.CON, 1);
    st70ring(g, 0, 0.7, 0, 1.17, 0.05, [1, 1, 1], 3, 24);
    return g;
  },
  hqtHead(){   // голова турели ПВО/обороны: два ствола
    const g = G69();
    g69box(g, [0, 0.45, -0.1], [0.7, 0.42, 0.75], 0.25, C70.P, 0);
    g69box(g, [0, 0.62, 0.55], [0.45, 0.12, 0.08], 0.03, C70.DK, 2);
    for (const s of [-1, 1]){ g69tube(g, [s * 0.35, 0.5, 0.4], [s * 0.35, 0.5, 2.1], 0.07, 0.055, 8, C70.ST, 2); g69tube(g, [s * 0.35, 0.5, 1.75], [s * 0.35, 0.5, 2.2], 0.09, 0.09, 8, C70.DK, 2); }
    g69box(g, [0, 0.95, -0.45], [0.18, 0.12, 0.18], 0.04, [1, 1, 1], 3);
    return g;
  },
  beacon(){   // маяк ускоренного орбитального сброса + посадочное кольцо
    const g = G69();
    st70lathe(g, 0, -0.5, 0, [[0, 0], [0, 4.2], [0.6, 4.2], [0.7, 4.0], [0.7, 0]], 36, C70.CON, 1);
    st70ring(g, 0, 0.22, 0, 3.6, 0.09, [1, 1, 1], 3, 48);
    g69tube(g, [0, 0.1, 0], [0, 9.0, 0], 0.32, 0.16, 10, C70.P, 0);
    for (const y of [3, 5, 7]) st70ring(g, 0, y, 0, 0.36 - y * 0.02, 0.06, C70.AMB, 5, 18);
    st70lathe(g, 0, 9.0, 0, [[0, 0.3], [0.5, 0.25], [0.9, 0.0]], 12, C70.AMB, 5);
    return g;
  },
  silo(){   // обогатительная колонна (доход)
    const g = G69();
    st70lathe(g, 0, -0.5, 0, [[0, 0], [0, 1.6], [0.5, 1.6], [0.5, 1.25], [7.0, 1.25], [7.6, 0.8], [7.9, 0.3], [8.0, 0.0]], 22, C70.P, 0);
    for (const y of [1.8, 3.4, 5.0]) st70ring(g, 0, y, 0, 1.27, 0.08, [1.3, 1.3, 1.3], 3, 28);
    g69tube(g, [1.2, 6.0, 0], [2.8, 6.0, 0], 0.18, 0.18, 8, C70.ST, 2);
    g69tube(g, [2.8, 6.0, 0], [2.8, 0.0, 0], 0.18, 0.18, 8, C70.ST, 2);
    return g;
  },
  radar(){   // мачта глобального радара (тарелка — отдельной моделью)
    const g = G69();
    g69box(g, [0, -0.4, 0], [1.8, 0.7, 1.8], 0.2, C70.CON2, 1);
    st70mast(g, 7.5, 1.1, 0.5, 0.09);
    g69box(g, [0, 7.6, 0], [0.9, 0.12, 0.9], 0.06, C70.DK, 2);
    g69box(g, [0.38, 4.0, 0.38], [0.08, 0.08, 0.08], 0.02, C70.RED, 5);
    return g;
  },
  bigDish(){
    const g = G69();
    g69tube(g, [0, 0, 0], [0, 1.0, 0], 0.15, 0.12, 8, C70.ST, 2);
    g69with(g, M34.ch(M34.T(0, 1.6, 0), M34.RX(-0.35)), () => {
      g69lathe(g, 0, 0, [[0.0, 0.0], [0.15, 1.0], [0.45, 2.0], [0.7, 2.6], [0.66, 2.7], [0.42, 2.05], [0.12, 1.0], [-0.04, 0.0]], 36, C70.P, 0);
      for (let k = 0; k < 3; k++){ const a = k * 2.094; g69tube(g, [Math.sin(a) * 2.2, Math.cos(a) * 2.2, 0.55], [0, 0, 2.0], 0.04, 0.04, 5, C70.DK, 2); }
      g69box(g, [0, 0, 2.05], [0.18, 0.18, 0.14], 0.04, [1, 1, 1], 3);
    });
    return g;
  },
  comms(){   // антенны связи (+командные очки)
    const g = G69();
    g69box(g, [0, -0.3, 0], [2.2, 0.55, 1.1], 0.15, C70.CON2, 1);
    g69box(g, [0, 0.75, 0], [1.6, 0.55, 0.8], 0.2, C70.P, 0);
    for (const [x, H] of [[-1.5, 8], [0, 11], [1.5, 6.5]]){
      g69tube(g, [x, 0.3, 0], [x, H, 0], 0.09, 0.04, 6, C70.ST, 2);
      for (let y = 2.5; y < H - 0.5; y += 2.2) g69tube(g, [x - 0.45, y, 0], [x + 0.45, y, 0], 0.025, 0.025, 4, C70.ST, 2);
      g69box(g, [x, H + 0.05, 0], [0.07, 0.07, 0.07], 0.02, C70.RED, 5);
    }
    g69box(g, [0, 1.0, 0.82], [1.2, 0.07, 0.03], 0.01, [1, 1, 1], 3);
    return g;
  },
};
// ---------------------------------------------------------------- загрузка в видеокарту
ST70.build = function(){
  this.built = true;
  try {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, ST70_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, ST70_FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const U = {};
    for (const n of ['uM', 'uV', 'uPr', 'uCamW', 'uPaint', 'uGlow', 'uP', 'uLP', 'uLC', 'uNL', 'uLamp', 'uStorm', 'uMode', 'uNoise']) U[n] = gl.getUniformLocation(p, n);
    const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    let tris = 0;
    for (const k in ST70_DEF){
      const G = ST70_DEF[k](), nv = G.P.length / 3;
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const buf = (loc, data, n) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
      buf(0, new Float32Array(G.P), 3); buf(1, new Float32Array(G.N), 3); buf(2, new Float32Array(G.C), 4);
      const I32 = nv > 65000, idx = I32 ? new Uint32Array(G.I) : new Uint16Array(G.I);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      // радиус охвата для отсечения
      let R = 0; for (let i = 0; i < G.P.length; i += 3) R = max(R, Math.hypot(G.P[i], G.P[i + 1], G.P[i + 2]));
      this.M[k] = { vao, n: G.I.length, type: I32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, R };
      tris += G.I.length / 3;
    }
    gl.bindVertexArray(prevVao);
    this.P = p; this.U = U; this.stats.tris = tris;
  } catch (e){ this.fail(e); }
};
const ST70_UM = new Float32Array(16), ST70_UV = new Float32Array(9);
// item: { m: имя модели, pos, X, Y, Z (оси), s: масштаб, team, sh: тень, flash, glow, dome }
ST70.draw = function(c, nl){
  if (!this.ok() || !this.items.length || typeof gl === 'undefined') return;
  if (!this.built) this.build();
  if (this.failed) return;
  const t0 = performance.now();
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  try {
    const U = this.U;
    gl.useProgram(this.P);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_3D, texNoise); gl.uniform1i(U.uNoise, 2);
    const R = c.right, Up = c.up, F = c.fwd;
    ST70_UV.set([R[0], Up[0], -F[0], R[1], Up[1], -F[1], R[2], Up[2], -F[2]]);
    gl.uniformMatrix3fv(U.uV, false, ST70_UV);
    const aspect = fboW / fboH, fy = 2 / c.fov, fx = fy / aspect, n = 0.05, f = 20000;
    gl.uniform4f(U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
    gl.uniform3fv(U.uCamW, c.pos);
    gl.uniform4fv(U.uLP, LP); gl.uniform4fv(U.uLC, LC); gl.uniform1i(U.uNL, nl || 0);
    gl.uniform1f(U.uLamp, S.mode === 'fps' && !S.attract ? 1 : 0);
    gl.uniform1f(U.uStorm, (S.storm ? S.storm.k : 0) * ((S.mode === 'fps' || S.attract) ? 1 : 0.12));
    const tx = c.fov * 0.5 * aspect, ty = c.fov * 0.5, tm = (performance.now() / 1000) % 1000;
    let drawn = 0;
    const domes = [];
    const setM = (it, s) => {
      ST70_UM.set([it.X[0] * s, it.X[1] * s, it.X[2] * s, 0, it.Y[0] * s, it.Y[1] * s, it.Y[2] * s, 0, it.Z[0] * s, it.Z[1] * s, it.Z[2] * s, 0,
                   it.pos[0] - c.pos[0], it.pos[1] - c.pos[1], it.pos[2] - c.pos[2], 1]);
      gl.uniformMatrix4fv(U.uM, false, ST70_UM);
    };
    const vis = (it, M) => {   // отсечение сферой по пирамиде кадра
      const s = it.s || 1, r = M.R * s + 0.5;
      const cx = it.pos[0] - c.pos[0], cy = it.pos[1] - c.pos[1], cz = it.pos[2] - c.pos[2];
      const vx = R[0] * cx + R[1] * cy + R[2] * cz, vy = Up[0] * cx + Up[1] * cy + Up[2] * cz, vz = F[0] * cx + F[1] * cy + F[2] * cz;
      return !(vz < -r || Math.abs(vx) > vz * tx + r * 1.5 || Math.abs(vy) > vz * ty + r * 1.5 || vz > 2500 + r);
    };
    let team = -1;
    gl.uniform1i(U.uMode, 0);
    for (const it of this.items){
      const M = this.M[it.m]; if (!M) continue;
      if (it.dome){ domes.push(it); continue; }
      if (!vis(it, M)) continue;
      if (it.team !== team){
        team = it.team;
        gl.uniform3fv(U.uPaint, team ? [0.33, 0.085, 0.065] : [0.40, 0.375, 0.29]);
        gl.uniform3fv(U.uGlow, team ? [3.2, 0.35, 0.15] : [0.45, 2.6, 1.1]);
      }
      setM(it, it.s || 1);
      gl.uniform4f(U.uP, it.sh === undefined ? 1 : it.sh, it.flash || 0, tm, it.glow === undefined ? 1 : it.glow);
      gl.bindVertexArray(M.vao);
      gl.drawElements(gl.TRIANGLES, M.n, M.type, 0);
      drawn++;
    }
    // купола — аддитивно, без записи глубины (видно и снаружи, и изнутри)
    if (domes.length){
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.uniform1i(U.uMode, 1);
      for (const it of domes){
        const M = this.M[it.m]; if (!vis(it, M)) continue;
        gl.uniform3fv(U.uGlow, it.team ? [1.6, 0.25, 0.12] : [0.25, 1.1, 1.5]);
        setM(it, it.s || 1);
        gl.uniform4f(U.uP, 1, 0, tm, it.glow === undefined ? 1 : it.glow);
        gl.bindVertexArray(M.vao);
        gl.drawElements(gl.TRIANGLES, M.n, M.type, 0);
        drawn++;
      }
      gl.disable(gl.BLEND); gl.depthMask(true);
    }
    this.stats.drawn = drawn;
  } catch (e){ this.fail(e); }
  gl.bindVertexArray(prevVao);
  gl.activeTexture(gl.TEXTURE0);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
};
// система координат постройки: Y — нормаль сферы, Z — «вперёд» (по касательной), X = Y × Z
function st70frame(pos, fwdHint){
  const Y = norm(pos), Z = tangent(fwdHint, Y), X = norm(cross(Y, Z));
  return { pos, X, Y, Z };
}
// позиция на грунте по направлению от центра постройки
function st70ground(base, X, Z, x, z, lift){
  const p = add(base, add(mul(X, x), mul(Z, z)));
  const d = norm(p);
  return mul(d, groundR(d) + (lift || 0));
}
function st70yaw(fr, dir){   // повернуть оси вокруг Y к направлению dir
  const Z = tangent(dir, fr.Y); if (len(Z) < 1e-4) return fr;
  const Zn = norm(Z);
  return { pos: fr.pos, X: norm(cross(fr.Y, Zn)), Y: fr.Y, Z: Zn };
}
