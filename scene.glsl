#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler3D;
uniform vec2  uRes;
uniform vec3  uCam;
uniform mat3  uRot;
uniform float uR;
uniform int   uBounces;
uniform float uGrid;
uniform float uSelf;
uniform float uTiles;
uniform float uFov;
uniform float uTime;
uniform int   uQ;        // качество: 0 низкое, 1 среднее, 2 высокое
uniform int   uMe;       // индекс своего робота в списке объектов (скрыт в 1-м лице)
uniform sampler2D uObj;  uniform int uNO;   // объекты: 7 текселей на объект
uniform sampler2D uPar;  uniform int uNP;   // частицы: 2 текселя
uniform sampler3D uNoise;
uniform vec4  uLP[16];   // точечные источники: xyz, радиус
uniform vec4  uLC[16];   // цвет*яркость, w — сила свечения в воздухе
uniform int   uNL;
uniform vec4  uCP[7];    // точки захвата: w — прогресс (-1 Рой … +1 Консорциум)
uniform vec4  uVM;       // оружие в руках: x показ, y фаза покачивания, z отдача, w вспышка
uniform vec4  uVM2;      // x команда, y элита, z тень у глаз (0..1), w движение
uniform float uLamp;
uniform vec4  uVM3;       // v6: x — прицел (ADS), y — оружие опущено (перелёт/подъём), z — заряд рельсы
uniform vec2  uHQ;
uniform int   uZero;
uniform vec3  uGP[92];   // v6.2: центры граней м-ка Гольдберга GP(3,0) (первые 32 — усечённый икосаэдр)
uniform vec4  uVein[20]; uniform int uNV;   // v6.2: рудные жилы (центр на грунте) — тёмный базальт и изумрудная крошка вокруг
uniform float uStorm;   // пылевая буря 0..1    // всегда 0: не даёт компилятору D3D разворачивать циклы (иначе компиляция идёт минутами)
#define ZERO uZero      // штабы живы (1) или в руинах (0)
uniform float uG72;      // v7.2gfx: новая графика (0 — как в v7.1, всё ниже под этим флагом)
uniform vec4  uDen;      // v7.5 «Денди»: ступенчатый свет — x вкл (0 — как раньше), y/z уровни полутона/света, w добавка рассеянного
uniform vec4  uScor[8];  uniform float uScorH[8]; uniform int uNSc;   // v7.2gfx: опалины от взрывов (центр, радиус; жар 0..1)
out vec4 frag;

/*CONSTS*/

const vec3 SUN1 = normalize(vec3(0.62, 0.55, 0.56));   // тёплое солнце (светит на базу Консорциума)
const vec3 SUN2 = -SUN1;                               // холодное солнце (на базу Роя) — карта честная
const vec3 C1 = vec3(1.0, 0.82, 0.62) * 1.7;
const vec3 C2 = vec3(0.58, 0.74, 1.0) * 1.55;
const float BOUND = RM + 50.0;
const vec3 EMER = vec3(0.10, 1.0, 0.40);   // v6.2: изумрудное свечение руды
float gDist = 0.0;
float gBump = 1.0;
float gDetail = 1.0;

// ---------------------------------------------------------------- утилиты
float nz(vec3 p){ return texture(uNoise, p).r; }
float fbm3(vec3 p){ return 0.5*nz(p) + 0.25*nz(p*2.03 + 0.31) + 0.125*nz(p*4.07 + 0.73); }
vec2 r2(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdCylZ(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xy), p.z)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdCylX(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.yz), p.x)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdTorusY(vec3 p, float R, float r){ return length(vec2(length(p.xz) - R, p.y)) - r; }
void U(inout vec2 r, float d, float m){ if (d < r.x) r = vec2(d, m); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec3 teamA(float t){ return t < 0.5 ? vec3(0.20, 0.215, 0.13) : vec3(0.050, 0.053, 0.060); }   // олива / воронёная сталь
vec3 teamB(float t){ return t < 0.5 ? vec3(0.44, 0.41, 0.34) : vec3(0.19, 0.195, 0.21); }     // песочный беж / сталь
vec3 teamE(float t){ return t < 0.5 ? vec3(0.62, 0.86, 1.0) * 3.2 : vec3(1.0, 0.06, 0.03) * 4.5; } // визоры

vec3 fogCol(vec3 d){
  vec3 f = vec3(0.016, 0.019, 0.032);
  f += C1 * 0.018 * pow(max(dot(d, SUN1), 0.0), 5.0);
  f += C2 * 0.018 * pow(max(dot(d, SUN2), 0.0), 5.0);
  return mix(f, vec3(0.085, 0.065, 0.045) * (0.8 + 0.4 * max(dot(d, SUN1), 0.0)), uStorm * 0.85);
}
float fogK(){ return 0.0011 + 0.016 * uStorm; }

// ---------------------------------------------------------------- статичный мир (ДОЛЖЕН совпадать с mapJS)
vec2 map(vec3 p){
  float r = max(length(p), 1e-3);
  vec3 n = p / r;
  float mask = 1.0;
  for (int i = 0; i < 2; i++) mask = min(mask, 1.0 - smoothstep(PAD_B0, PAD_B1, dot(n, BASES[i])));
  for (int i = 0; i < 6; i++) mask = min(mask, 1.0 - smoothstep(PAD_C0, PAD_C1, dot(n, CPD[i])));
  float d = r - RM - hgt(n * RM) * mask;
  for (int i = 0; i < 8; i++) d = max(d, -(length(p - CRAT[i].xyz) - CRAT[i].w));
  float tun = min(min(length(p.yz) - TUN_R, length(p.xy) - TUN_R), r - CORE_R);
  d = max(d, -tun);
  if (d < 1.5 && gDetail > 0.5) d -= (fbm3(p * DET_F) - 0.44) * DET_A * mask;
  vec2 res = vec2(d, 1.0);
  // кристаллы ядра
  vec3 cq = vec3(p.x, abs(p.y) - 16.0, p.z);
  float cr = length(cq) - 6.0 + 0.25 * sin(2.0*cq.x) * sin(2.0*cq.y + 1.0) * sin(2.0*cq.z);
  if (cr < res.x) res = vec2(cr, 6.0);
  // штабы на полюсах
  vec3 b = vec3(p.x, abs(p.y) - RM, p.z);
  float hqAlive = p.y > 0.0 ? uHQ.x : uHQ.y;
  if (hqAlive < 0.5 && length(b) - 20.0 < res.x){
    float team = p.y > 0.0 ? 0.0 : 1.0;
    vec2 bx = abs(b.xz);
    float oct = max(max(bx.x, bx.y), (bx.x + bx.y) * 0.70710678);
    float plat = max(oct - 16.0, abs(b.y - 0.2) - 1.4);
    float ruin = max(oct - 8.0, abs(b.y - 1.6) - 1.6);
    if (plat < res.x) res = vec2(plat, 2.0 + team);
    if (ruin < res.x) res = vec2(ruin, 20.0);
  }
  if (hqAlive > 0.5 && length(b) - 48.0 < res.x){
    float team = p.y > 0.0 ? 0.0 : 1.0;
    vec2 bx = abs(b.xz);
    float oct = max(max(bx.x, bx.y), (bx.x + bx.y) * 0.70710678);
    float plat = max(oct - 16.0, abs(b.y - 0.2) - 1.4);
    float blk = max(max(oct - 7.5, abs(b.y - 5.0) - 5.0), oct + b.y - 15.5);
    float top = max(oct - 4.2, abs(b.y - 11.0) - 1.2);
    vec3 bq = vec3(abs(b.x), b.y, abs(b.z)) - vec3(8.6, 2.6, 8.6);
    float pyl = sdBox(bq, vec3(1.3, 2.4, 1.3));
    float hq = min(min(plat, blk), min(top, pyl));
    float win = max(oct - 7.56, abs(b.y - 7.0) - 0.35);
    float mast = sdCapsule(b, vec3(0.0, 12.0, 0.0), vec3(0.0, 36.0, 0.0), 0.45);
    float bc = length(b - vec3(0.0, 37.2, 0.0)) - 1.6;
    if (hq < res.x) res = vec2(hq, 2.0 + team);
    if (win < res.x) res = vec2(win, 8.0 + team);
    if (mast < res.x) res = vec2(mast, 7.0);
    if (bc < res.x) res = vec2(bc, 4.0 + team);
  }
  // маяки точек захвата
  for (int i = 0; i < 6; i++){
    vec3 c = CPD[i], tp = c * RM;
    vec3 v = p - tp;
    if (length(v) - 14.0 < res.x){
      float y = dot(v, c);
      float rr = length(v - c * y);
      float disk = max(rr - 4.0, abs(y - 0.1) - 0.4);
      float tw = sdCapsule(p, tp - c * 2.0, tp + c * 10.0, 0.8);
      float bc = length(v - c * 11.5) - 2.0;
      float ring = length(vec2(rr - 3.7, y - 0.55)) - 0.14;
      if (min(disk, tw) < res.x) res = vec2(min(disk, tw), 7.0);
      if (bc < res.x) res = vec2(bc, 10.0 + float(i));
      if (ring < res.x) res = vec2(ring, 10.0 + float(i));
    }
  }
  return res;
}

vec3 calcNormal(vec3 p){
  vec3 n = vec3(0.0);
  for (int i = ZERO; i < 4; i++){
    vec3 e = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += e * map(p + e * 0.012).x;
  }
  return normalize(n);
}

vec3 teamGlow(float pr){
  return pr >= 0.0 ? mix(vec3(0.5), teamE(0.0) * 0.7, pr) : mix(vec3(0.5), teamE(1.0) * 0.55, -pr);
}

// материал статичного мира
void material(float m, vec3 p, vec3 n, out vec3 alb, out vec3 em, out float sp){
  em = vec3(0.0); sp = 0.04; gBump = 0.0;
  if (m < 1.5){
    gBump = 1.0;
    float r = length(p); vec3 rn = p / r;
    float slope = 1.0 - clamp(dot(n, rn), 0.0, 1.0);
    float big = fbm3(p * (1.0 / 260.0));
    float mid = nz(p * (1.0 / 22.0));
    float fine = mix(0.5, nz(p * (1.0 / 7.0)), exp(-gDist * 0.025));
    vec3 dust = vec3(0.30, 0.285, 0.26);
    vec3 rock = vec3(0.155, 0.15, 0.145);
    vec3 dark = vec3(0.075, 0.072, 0.07);
    alb = mix(dust, rock, smoothstep(0.32, 0.62, big + slope * 1.6));
    alb = mix(alb, dark, smoothstep(0.55, 0.85, mid) * 0.55);
    alb *= 0.82 + 0.36 * fine;
    if (uG72 > 0.5){   // v7.2gfx: тёплая охра / холодный базальт, слоистость склонов, темнее в складках
      float hue = fbm3(p * (1.0 / 95.0) + 3.7);
      alb *= mix(vec3(1.07, 0.98, 0.86), vec3(0.88, 0.94, 1.03), smoothstep(0.38, 0.62, hue));
      float strata = smoothstep(0.55, 0.95, abs(sin(dot(p, vec3(0.11, 0.37, 0.19)) + 6.0 * big)));
      alb *= (1.0 - 0.22 * strata * smoothstep(0.1, 0.5, slope)) * (0.86 + 0.14 * smoothstep(0.2, 0.8, mid));
    }
    if (TER74 > 0.5 && r > RM - 25.0){   // v7.4: озёра на дне впадин (лёд / метан / лава), тёмные останцы
      vec3 q = rn * RM;
      float lb = smoothstep(0.62, 0.95, cos(dot(q, TKE)) * cos(dot(q, TKF))) * smoothstep(0.15, 0.55, cos(dot(q, TKG)));
      float pm = 1.0;
      for (int i = 0; i < 2; i++) pm = min(pm, 1.0 - smoothstep(0.961, 0.9888, dot(rn, BASES[i])));
      float lake = smoothstep(0.5, 0.58, lb) * pm * (1.0 - smoothstep(0.05, 0.2, slope));
      if (lake > 0.001){
        float kind = cos(dot(q, vec3(-0.0049, 0.0071, 0.0038)));
        float cr = smoothstep(0.42, 0.5, abs(nz(q * 0.045) - 0.5));
        vec3 iceC = mix(vec3(0.36, 0.44, 0.52), vec3(0.55, 0.62, 0.7), nz(q * 0.08));
        vec3 metC = vec3(0.05, 0.12, 0.12) + 0.04 * nz(q * 0.1);
        vec3 lavC = vec3(0.06, 0.035, 0.03);
        vec3 la = kind > 0.35 ? iceC : kind < -0.35 ? lavC : metC;
        alb = mix(alb, la, lake);
        sp = mix(sp, kind < -0.35 ? 0.05 : 0.45, lake);
        if (kind < -0.35) em += vec3(2.4, 0.7, 0.12) * cr * lake * (0.7 + 0.3 * sin(uTime * 1.3 + dot(q, vec3(0.3))));
        gBump *= 1.0 - 0.8 * lake;
      }
      float rk = smoothstep(0.62, 0.9, cos(dot(q, TKC)) * cos(dot(q, TKD)));
      alb = mix(alb, alb * vec3(0.72, 0.68, 0.66), rk * smoothstep(0.08, 0.3, slope));
    }
    float depth = clamp((RM - r) / 30.0, 0.0, 1.0);
    alb = mix(alb, vec3(0.10, 0.095, 0.11), depth);
    // площадки баз
    for (int i = 0; i < 2; i++){
      float k = dot(rn, BASES[i]);
      if (k > PAD_B0){
        float pad = smoothstep(PAD_B0 + 0.0015, PAD_B0 + 0.004, k);
        vec2 xz = p.xz;
        vec2 g = abs(fract(xz / 4.0) - 0.5);
        float seam = smoothstep(0.46, 0.5, max(g.x, g.y));
        vec3 conc = vec3(0.27, 0.265, 0.255) * (0.85 + 0.3 * mid) * (1.0 - 0.5 * seam);
        float rr = length(xz);
        float t = float(i);
        float stripe = step(0.5, fract(atan(xz.y, xz.x) * 9.549 + rr * 0.0));
        float haz = smoothstep(17.6, 17.8, rr) * (1.0 - smoothstep(19.0, 19.2, rr));
        conc = mix(conc, mix(vec3(0.03), teamB(t) * 1.2, stripe), haz);
        float ring = smoothstep(22.0, 22.15, rr) * (1.0 - smoothstep(22.55, 22.7, rr));
        alb = mix(alb, conc, pad);
        gBump *= 1.0 - 0.85 * pad;
        em += teamE(t) * 0.05 * ring * pad;
      }
    }
    // площадки точек захвата
    for (int i = 0; i < 6; i++){
      float k = dot(rn, CPD[i]);
      if (k > PAD_C0){
        float pad = smoothstep(PAD_C0 + 0.0008, PAD_C0 + 0.002, k);
        vec3 v = p - CPD[i] * RM;
        float rr = length(v - CPD[i] * dot(v, CPD[i]));
        vec3 conc = vec3(0.25, 0.245, 0.24) * (0.85 + 0.3 * mid);
        float ring = smoothstep(13.0, 13.15, rr) * (1.0 - smoothstep(13.6, 13.75, rr));
        alb = mix(alb, conc, pad * (1.0 - smoothstep(14.0, 16.0, rr)));
        gBump *= 1.0 - 0.85 * pad * (1.0 - smoothstep(14.0, 16.0, rr));
        em += teamGlow(uCP[i].w) * 0.18 * ring * pad;
      }
    }
    // рудные жилы
    float v = sin(dot(p, vec3(0.05, 0.07, -0.03)) + 1.7 * sin(dot(p, vec3(-0.021, 0.033, 0.041))));
    float vein = smoothstep(0.990, 0.999, abs(v));
    float near = 0.0;
    for (int i = 0; i < 6; i++) near = max(near, smoothstep(0.990, 0.9985, dot(rn, CPD[i])));
    float spot = smoothstep(0.35, 0.75, sin(dot(p, vec3(0.013, -0.009, 0.011)) + 0.5) * sin(dot(p, vec3(0.007, 0.012, -0.010)) + 1.3));
    vein *= max(max(near, depth), spot * 0.6);
    em += vec3(0.1, 0.85, 0.6) * vein * (0.22 + 0.8 * depth) * (0.7 + 0.6 * fine) * mix(1.0, 0.35, smoothstep(60.0, 300.0, gDist));
    alb *= 1.0 - vein * 0.6;
    // v6.2: вокруг кристаллов жилы — чёрный базальт с холодным отливом и светящаяся изумрудная крошка
    float vk = 0.0;
    for (int i = ZERO; i < 20; i++){
      if (i >= uNV) break;
      vec3 dv = p - uVein[i].xyz;
      float dd = dot(dv, dv);
      if (dd < 324.0) vk = max(vk, 1.0 - smoothstep(4.0, 14.0, sqrt(dd) + (nz(p * 0.11) - 0.5) * 9.0));
    }
    if (vk > 0.0){   // неровное пятно базальта, без чётного круга
      float bas = smoothstep(0.0, 0.4, vk);
      alb = mix(alb, vec3(0.026, 0.033, 0.031) * (0.75 + 0.5 * fine), bas * 0.92);
      float grit = smoothstep(0.66, 0.8, nz(p * 0.85)) * smoothstep(0.35, 0.8, nz(p * 0.21 + 1.7));
      em += EMER * vk * vk * (mix(0.07, grit * 1.4, exp(-gDist * 0.012)) + 0.025);
    }
    // световые кольца в шахтах — ориентиры под землёй
    if (depth > 0.2 && r > CORE_R + 2.0 && min(length(p.yz), length(p.xy)) < TUN_R + 1.0){
      float along = r;
      float band = smoothstep(0.47, 0.49, abs(fract(along / 24.0) - 0.5));
      em += vec3(0.35, 0.6, 1.0) * 1.2 * band;
    }
    sp = 0.03 + 0.05 * (1.0 - slope);
    sp = mix(sp, 0.12, smoothstep(0.0, 0.45, vk));   // v6.2: базальт у жил блестит холодным
    // иней и лёд в низинах кратеров
    float low = RM - r - TER74 * 5.0;   // v7.4: каньоны глубже — иней только на самом дне
    if (low > 1.5 && low < 30.0 && min(length(p.yz), length(p.xy)) > TUN_R + 2.0){
      float ice = smoothstep(1.5, 7.0, low) * (1.0 - smoothstep(0.15, 0.5, slope)) * smoothstep(0.35, 0.6, nz(p * 0.08) + 0.25);
      alb = mix(alb, vec3(0.40, 0.47, 0.55) * (0.85 + 0.3 * fine), ice * 0.85);
      sp = mix(sp, 0.7, ice); gBump *= 1.0 - 0.7 * ice;
      if (uG72 > 0.5) em += vec3(0.5, 0.65, 0.8) * ice * smoothstep(0.93, 0.99, nz(p * 2.3)) * exp(-gDist * 0.05) * 0.25;   // искры инея
    }
    if (uG72 > 0.5){   // v7.2gfx: опалины от взрывов, свежие — с тлеющими углями
      for (int i = ZERO; i < 8; i++){
        if (i >= uNSc) break;
        vec3 dv = p - uScor[i].xyz; float dd = dot(dv, dv), rr = uScor[i].w;
        if (dd > rr * rr * 2.4) continue;
        float e = sqrt(dd) / rr + (nz(p * 0.35 + float(i) * 0.37) - 0.5) * 0.6;
        float k = 1.0 - smoothstep(0.5, 1.25, e);
        alb *= 1.0 - 0.8 * k; sp *= 1.0 - 0.7 * k; gBump *= 1.0 - 0.4 * k;
        em += vec3(1.8, 0.4, 0.06) * uScorH[i] * smoothstep(0.55, 0.95, k) * smoothstep(0.55, 0.8, nz(p * 1.4 + float(i) * 0.71));
      }
    }
  }
  else if (m < 3.5){
    float t = m - 2.0;
    vec3 b = vec3(p.x, abs(p.y) - RM, p.z);
    float band = step(1.6, b.y) * step(b.y, 10.0);
    alb = mix(vec3(0.24, 0.235, 0.225), teamA(t) * 1.3, band);
    if (b.y > 2.2 && b.y < 3.0) alb = teamB(t);
    alb *= 0.85 + 0.3 * nz(p * 0.2);
    sp = 0.12;
  }
  else if (m < 5.5){ alb = vec3(0.0); em = teamE(m - 4.0) * 1.2; }
  else if (m < 6.5){ alb = vec3(0.35, 0.2, 0.5); em = mix(vec3(0.45, 0.2, 0.9), teamGlow(uCP[6].w) * 0.6, abs(uCP[6].w)) * 1.4; }
  else if (m < 7.5){ alb = vec3(0.16, 0.165, 0.17) * (0.8 + 0.4 * nz(p * 0.3)); sp = 0.3; }
  else if (m < 9.5){ alb = vec3(0.02); em = teamE(m - 8.0) * 0.45; sp = 0.8; }
  else if (m < 15.5){ int i = int(m - 10.0 + 0.5); alb = vec3(0.0); em = teamGlow(uCP[i].w) * 1.4; }
  else { alb = vec3(0.05, 0.047, 0.045) * (0.6 + 0.8 * nz(p * 0.4)); em = vec3(1.0, 0.3, 0.05) * 1.2 * smoothstep(0.68, 0.8, nz(p * 0.7 + vec3(uTime * 0.05))); }
}

// ---------------------------------------------------------------- объекты (роботы, техника, здания)
float gT, gTeam, gV, gPh, gM, gTh, gProg, gFl, gYaw, gPitch;
float gTr = 0.0;   // v6.2: дальность луча при марше объекта (тонкие фермы утолщаются вдали — не мерцают)

vec2 sdInf(vec3 q){
  float lead = mod(gV, 2.0);
  float el = step(1.5, mod(gV, 4.0));
  float rl = floor(gV / 4.0 + 0.01);           // класс: 0 штурм, 1 пулемёт, 2 ракеты, 3 снайпер, 4 медик
  float sc = 1.0 + 0.07 * lead + 0.04 * el + (rl > 0.5 && rl < 1.5 ? 0.07 : 0.0) - (rl > 2.5 && rl < 3.5 ? 0.03 : 0.0);
  q /= sc;
  vec2 r = vec2(1e5, 0.0);
  vec3 qs = vec3(abs(q.x), q.y, q.z);
  for (int k = 0; k < 2; k++){
    float sd = k == 0 ? -1.0 : 1.0;
    float ph = gPh + (k == 0 ? 0.0 : 3.14159);
    float a1 = sin(ph) * 0.55 * gM;
    float a2 = a1 - (0.12 + 0.8 * max(0.0, cos(ph))) * gM - 0.1;
    vec3 hip = vec3(0.11 * sd, 0.78, 0.0);
    vec3 knee = hip + 0.37 * vec3(0.0, -cos(a1), sin(a1));
    vec3 ank = knee + 0.38 * vec3(0.0, -cos(a2), sin(a2));
    U(r, sdCapsule(q, hip, knee, 0.075), 1.0);
    U(r, sdCapsule(q, knee, ank, 0.062), 3.0);
    U(r, length(q - knee - vec3(0.0, 0.0, 0.05)) - 0.085, 2.0);
    U(r, sdRBox(q - ank - vec3(0.0, -0.005, 0.05), vec3(0.06, 0.035, 0.12), 0.02), 3.0);
  }
  U(r, sdRBox(q - vec3(0.0, 0.84, 0.0), vec3(0.15, 0.07, 0.10), 0.03), 3.0);
  U(r, sdCapsule(q, vec3(0.0, 0.86, 0.0), vec3(0.0, 0.98, 0.0), 0.11), 3.0);
  U(r, sdRBox(q - vec3(0.0, 1.07, -0.01), vec3(0.19 + 0.03 * lead, 0.18, 0.12), 0.05), 1.0);
  U(r, sdRBox(q - vec3(0.0, 1.11, 0.07), vec3(0.16 + 0.03 * lead, 0.12, 0.07), 0.03), 2.0);
  // ранец
  U(r, sdRBox(q - vec3(0.0, 1.08, -0.20), vec3(0.15 + 0.04 * el, 0.17, 0.08 + 0.02 * el), 0.03), 3.0);
  U(r, sdCapsule(qs, vec3(0.08 + 0.03 * el, 0.95, -0.24), vec3(0.08 + 0.03 * el, 0.86, -0.25), 0.045), 7.0);
  if (el > 0.5) U(r, sdRBox(qs - vec3(0.27, 1.14, -0.25), vec3(0.09, 0.02, 0.15), 0.01), 2.0);
  // наплечники
  U(r, sdRBox(qs - vec3(0.27 + 0.03 * lead, 1.22, 0.0), vec3(0.09 + 0.03 * lead, 0.07 + 0.02 * lead, 0.10 + 0.02 * lead), 0.03), 2.0);
  // голова
  if (gTeam < 0.5){
    U(r, sdRBox(q - vec3(0.0, 1.44, 0.01), vec3(0.115, 0.12, 0.13), 0.06), 1.0);
    U(r, sdRBox(q - vec3(0.0, 1.55, -0.01), vec3(0.025, 0.025, 0.1), 0.012), 2.0);
    if (lead > 0.5){
      for (int k = 0; k < 4; k++){
        vec3 lp = vec3(k < 2 ? -0.05 : 0.05, (k == 0 || k == 2) ? 1.475 : 1.41, 0.135);
        U(r, length(q - lp) - 0.026, 6.0);
      }
    } else U(r, sdRBox(q - vec3(0.0, 1.43, 0.115), vec3(0.09, 0.03, 0.03), 0.015), 4.0);
  } else {
    vec3 h = q - vec3(0.0, 1.43, 0.03);
    U(r, sdRBox(h, vec3(0.095, 0.105, 0.14), 0.035), 1.0);
    U(r, sdRBox(h - vec3(0.0, 0.09, -0.04), vec3(0.018, 0.05, 0.12), 0.01), 2.0);
    vec3 hs = vec3(abs(h.x), h.y, h.z);
    U(r, length(hs - vec3(0.045, 0.01, 0.15)) - (0.022 + 0.006 * lead), 4.0);
    if (lead > 0.5) U(r, length(hs - vec3(0.03, -0.035, 0.15)) - 0.016, 4.0);
  }
  // руки и оружие (наклон по прицелу)
  vec3 g = q - vec3(0.0, 1.20, 0.0);
  g.zy = r2(g.zy, -gPitch);
  U(r, sdRBox(g - vec3(0.09, -0.10, 0.26), vec3(0.035, 0.05, 0.21), 0.015), 5.0);
  U(r, sdCylZ(g - vec3(0.09, -0.08, 0.53), 0.018, 0.08), 5.0);
  U(r, sdRBox(g - vec3(0.09, -0.19, 0.22), vec3(0.022, 0.06, 0.03), 0.01), 3.0);
  vec3 shR = vec3(0.26, 0.0, 0.0), shL = vec3(-0.26, 0.0, 0.0);
  vec3 elR = vec3(0.24, -0.22, 0.08), elL = vec3(-0.16, -0.2, 0.22);
  vec3 haR = vec3(0.10, -0.13, 0.14), haL = vec3(0.07, -0.12, 0.38);
  U(r, sdCapsule(g, shR, elR, 0.06), 1.0); U(r, sdCapsule(g, elR, haR, 0.05), 3.0);
  U(r, sdCapsule(g, shL, elL, 0.06), 1.0); U(r, sdCapsule(g, elL, haL, 0.05), 3.0);
  if (rl > 0.5 && rl < 1.5){        // пулемётчик: толстый ствол, барабан, короб с лентой на спине
    U(r, sdCylZ(g - vec3(0.09, -0.09, 0.47), 0.034, 0.15), 5.0);
    U(r, sdCylX(g - vec3(0.04, -0.21, 0.2), 0.075, 0.045), 3.0);
    U(r, sdRBox(q - vec3(0.0, 0.83, -0.25), vec3(0.14, 0.08, 0.08), 0.02), 2.0);
  } else if (rl > 1.5 && rl < 2.5){ // гранатомётчик: труба на плече
    vec3 t = q - vec3(0.21, 1.36, -0.06);
    U(r, sdCylZ(t, 0.062, 0.34), 2.0);
    U(r, sdCylZ(t - vec3(0.0, 0.0, 0.34), 0.074, 0.03), 3.0);
    U(r, sdCylZ(t + vec3(0.0, 0.0, 0.34), 0.07, 0.025), 3.0);
  } else if (rl > 2.5 && rl < 3.5){ // снайпер: длинный ствол, прицел, плащ-накидка
    U(r, sdCylZ(g - vec3(0.09, -0.08, 0.75), 0.012, 0.2), 5.0);
    U(r, sdCylZ(g - vec3(0.09, 0.0, 0.25), 0.022, 0.08), 3.0);
    U(r, length(g - vec3(0.09, 0.0, 0.335)) - 0.017, 4.0);
    U(r, sdRBox(q - vec3(0.0, 1.0, -0.12), vec3(0.2, 0.3, 0.05), 0.04), 2.0);
  } else if (rl > 4.5){             // разведчик: капюшон, антенна-сканер, лёгкий короткий ствол
    U(r, sdRBox(q - vec3(0.0, 1.47, -0.04), vec3(0.15, 0.13, 0.15), 0.07), 2.0);
    U(r, sdCapsule(q, vec3(0.12, 1.55, -0.12), vec3(0.2, 1.95, -0.2), 0.012), 3.0);
    U(r, length(q - vec3(0.2, 1.97, -0.2)) - 0.03, 4.0);
  } else if (rl > 3.5){             // медик-инженер: светящийся крест на ранце, манипулятор
    vec3 m = q - vec3(0.0, 1.12, -0.29);
    U(r, min(sdBox(m, vec3(0.055, 0.016, 0.012)), sdBox(m, vec3(0.016, 0.055, 0.012))), 4.0);
    U(r, sdCapsule(q, vec3(-0.27, 1.2, -0.1), vec3(-0.34, 1.45, -0.18), 0.02), 3.0);
    U(r, length(q - vec3(-0.34, 1.47, -0.18)) - 0.035, 4.0);
  }
  r.x *= sc;
  return r;
}

vec2 sdWreck(vec3 q){
  vec2 r = vec2(1e5, 11.0);
  vec3 b = q - vec3(0.0, 0.2, 0.0);
  b.xy = r2(b.xy, 1.3);
  U(r, sdRBox(b, vec3(0.19, 0.18, 0.12), 0.05), 11.0);
  U(r, length(q - vec3(0.15, 0.13, 0.45)) - 0.13, 11.0);
  U(r, sdCapsule(q, vec3(-0.1, 0.07, -0.2), vec3(-0.2, 0.07, -0.65), 0.07), 11.0);
  U(r, sdRBox(q - vec3(0.42, 0.04, -0.25), vec3(0.08, 0.03, 0.1), 0.01), 11.0);
  return r;
}

// v6: инженер-строитель. Консорциум — парящий тягач на двух полозьях с кабиной, краном-манипулятором и сваркой;
// Рой — «сборщик-паук» на четырёх лапах с клешнями. gM — работа (манипулятор качается), gTh — свечение сварки
vec2 sdBuilder(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  q.y -= 0.03 * sin(gPh * 1.7);
  vec3 a = vec3(abs(q.x), q.y, q.z);
  float sw = sin(gPh * 5.0) * 0.12 * gM;
  if (gTeam < 0.5){
    U(r, sdRBox(a - vec3(0.4, 0.2, 0.0), vec3(0.11, 0.12, 0.5), 0.07), 8.0);
    U(r, sdCylX(vec3(a.x - 0.4, q.y - 0.2, abs(q.z) - 0.36), 0.1, 0.13), 3.0);
    U(r, sdRBox(q - vec3(0.0, 0.47, -0.05), vec3(0.34, 0.16, 0.44), 0.06), 1.0);
    U(r, sdRBox(q - vec3(0.0, 0.62, -0.1), vec3(0.28, 0.035, 0.34), 0.02), 2.0);
    U(r, sdRBox(q - vec3(0.0, 0.76, 0.17), vec3(0.2, 0.13, 0.14), 0.05), 1.0);
    U(r, sdRBox(q - vec3(0.0, 0.79, 0.31), vec3(0.15, 0.045, 0.02), 0.01), 4.0);
    U(r, sdRBox(q - vec3(-0.13, 0.71, -0.36), vec3(0.13, 0.08, 0.09), 0.02), 2.0);
    U(r, length(q - vec3(-0.12, 0.93, 0.12)) - 0.045, 16.0);
    vec3 k = q - vec3(0.17, 0.64, -0.22);
    U(r, sdCapsule(k, vec3(0.0), vec3(0.0, 0.5, 0.05), 0.04), 3.0);
    U(r, sdCapsule(k, vec3(0.0, 0.5, 0.05), vec3(sw, 0.42 + sw, 0.78), 0.032), 3.0);
    U(r, length(k - vec3(sw, 0.38 + sw, 0.82)) - 0.055, 7.0);
  } else {
    U(r, sdRBox(q - vec3(0.0, 0.58, -0.05), vec3(0.26, 0.15, 0.42), 0.13), 1.0);
    U(r, sdRBox(q - vec3(0.0, 0.72, -0.15), vec3(0.16, 0.06, 0.26), 0.05), 2.0);
    for (int k = 0; k < 4; k++){
      float s = (k & 1) == 0 ? -1.0 : 1.0, zz = k < 2 ? 0.22 : -0.28;
      float ph = gPh * 1.6 + float(k) * 1.57, lift = max(0.0, sin(ph)) * 0.08;
      vec3 hip = vec3(s * 0.22, 0.58, zz), knee = vec3(s * 0.55, 0.82 + lift, zz * 1.3), foot = vec3(s * 0.72, lift, zz * 1.55);
      U(r, sdCapsule(q, hip, knee, 0.045), 3.0);
      U(r, sdCapsule(q, knee, foot, 0.03), 1.0);
    }
    vec3 c = a - vec3(0.12, 0.5 + sw, 0.42);
    U(r, sdCapsule(c, vec3(0.0), vec3(0.06, -0.05, 0.3), 0.035), 3.0);
    U(r, sdCapsule(c, vec3(0.06, -0.05, 0.3), vec3(-0.02, -0.1, 0.42), 0.022), 1.0);
    U(r, length(a - vec3(0.08, 0.66, 0.38)) - 0.04, 4.0);
    U(r, length(q - vec3(0.0, 0.48, 0.5)) - 0.05, 7.0);
  }
  return r;
}
// v6.2: шестигранная призма вдоль Y (h — апофема, hy — полувысота)
float sdHexY(vec3 p, float h, float hy){
  const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
  vec2 xz = abs(p.xz);
  xz -= 2.0 * min(dot(k.xy, xz), 0.0) * k.xy;
  vec2 d = vec2(length(xz - vec2(clamp(xz.x, -k.z * h, k.z * h), h)) * sign(xz.y - h), abs(p.y) - hy);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
// v6.2: ажурная ферма-вышка: 4 сходящиеся стойки, X-раскосы и пояса на каждой секции
float sdLattice(vec3 t, float Ht, float w0, float w1, float hs){
  float th = max(0.024, gTr * 0.0015);
  vec3 a = vec3(abs(t.x), t.y, abs(t.z));
  float y = clamp(t.y, 0.0, Ht), w = mix(w0, w1, y / Ht);
  float d = sdCapsule(a, vec3(w0, 0.0, w0), vec3(w1, Ht, w1), th * 1.7);
  vec2 f = a.x > a.z ? vec2(a.z, a.x) : vec2(a.x, a.z);
  float u = fract(t.y / hs), inY = max(-t.y, t.y - Ht);
  float br = length(vec2((f.x - w * abs(2.0 * u - 1.0)) * 0.6, f.y - w)) - th;
  float ring = length(vec2(min(u, 1.0 - u) * hs, f.y - w)) - th;
  return min(d, max(min(br, ring), max(inY, f.x - w)));
}
// v6.2: огранённый кристалл — усечённый икосаэдр (многогранник Гольдберга GP(1,1)): 12 пяти- и 20 шестиугольных граней
float sdGold(vec3 a, float R){
  const float P = 1.618034;
  a = abs(a);
  float p5 = max(max(dot(a, vec3(0.0, 1.0, P)), dot(a, vec3(1.0, P, 0.0))), dot(a, vec3(P, 0.0, 1.0))) * 0.5257311;
  float p6 = max(max(dot(a, vec3(1.0)), dot(a, vec3(0.618034, 0.0, P))), max(dot(a, vec3(P, 0.618034, 0.0)), dot(a, vec3(0.0, P, 0.618034)))) * 0.5773503;
  return max(p5 - R * 1.026, p6 - R);
}
// кристалл жилы по варианту (8 — крупный на камне, 9 — средний, 10 — малый): локальные координаты и радиус
vec3 cryLocal(vec3 q, out float R){
  float v = gV - 8.0;
  vec3 c = v < 0.5 ? vec3(0.0, 1.62, 0.0) : v < 1.5 ? vec3(0.0, 0.5, 0.0) : vec3(0.0, 0.3, 0.0);
  R = v < 0.5 ? 0.9 : v < 1.5 ? 0.68 : 0.44;
  vec3 a = q - c;
  a.xz = r2(a.xz, 0.7 + v * 1.9);
  a.xy = r2(a.xy, 0.35 + v * 0.5);
  a /= vec3(1.12, 1.3, 0.86);   // вытянутый, неровный — не «мяч» (расстояние × 0.86)
  return a;
}
vec2 sdVeinCrystal(vec3 q){
  vec2 r = vec2(1e5, 32.0);
  float R; vec3 a = cryLocal(q, R);
  U(r, sdGold(a, R) * 0.86, 32.0);
  float v = gV - 8.0;
  for (int k = ZERO; k < 4; k++){   // светящиеся осколки вокруг
    float fk = float(k), ang = fk * 1.7 + v * 2.3;
    float rad = (v < 0.5 ? 1.55 : 1.1) + 0.4 * fract(fk * 0.618 + v * 0.31);
    vec3 s = q - vec3(cos(ang) * rad, 0.04, sin(ang) * rad);
    s.xz = r2(s.xz, ang * 2.0); s.xy = r2(s.xy, 0.5 + fk * 0.4);
    float sz = 0.1 + 0.08 * fract(fk * 0.37 + v * 0.5);
    U(r, (abs(s.x) + abs(s.y) * 0.45 + abs(s.z) - sz) * 0.52, 35.0);
  }
  if (v < 0.5){   // тёмный базальтовый камень под крупным кристаллом
    vec3 b = q - vec3(0.0, 0.32, 0.0); b.xz = r2(b.xz, 0.4);
    float rock = sdBox(b, vec3(1.3, 0.6, 1.0));
    rock = max(rock, dot(b, vec3(0.47, 0.85, 0.21)) - 0.55);
    rock = max(rock, dot(b, vec3(-0.55, 0.79, -0.24)) - 0.5);
    rock = max(rock, dot(b, vec3(0.17, 0.51, -0.85)) - 0.7);
    U(r, rock, 31.0);
  }
  for (int k = ZERO; k < 2; k++){   // острые камни рядом
    float fk = float(k), ang = 2.4 + fk * 2.2 + v * 1.3;
    vec3 b = q - vec3(cos(ang) * 1.5, -0.1, sin(ang) * 1.5);
    b.xz = r2(b.xz, ang); b.xy = r2(b.xy, 0.3 - fk * 0.5);
    float rk = max(sdBox(b, vec3(0.45, 0.6, 0.35) * (0.8 + 0.4 * fk)), dot(b, vec3(0.51, 0.85, 0.17)) - 0.28);
    U(r, rk, 31.0);
  }
  return r;
}
// v6.2: экстрактор по референсам — тёмный шестигранный постамент, сотовый светящийся купол над жилой,
// ажурная вышка с зелёным огнём-маяком; полоса на постаменте и вымпел — цвет команды
vec2 sdExtractor(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdHexY(q - vec3(0.0, -0.05, 0.0), 2.26, 0.55) - 0.04, 3.0);
  U(r, sdHexY(q - vec3(0.0, 0.34, 0.0), 2.34, 0.07), 10.0);
  U(r, sdHexY(q - vec3(0.0, 0.6, 0.0), 1.72, 0.1) - 0.02, 5.0);
  vec3 dc = q - vec3(0.0, 0.72, 0.0);
  U(r, max(length(dc) - 1.36, -dc.y), 33.0);
  U(r, sdTorusY(dc - vec3(0.0, 0.03, 0.0), 1.38, 0.08), 3.0);
  vec3 tq = q - vec3(-1.0, 0.5, -1.732);
  U(r, sdLattice(tq, 6.9, 0.42, 0.13, 0.78), 34.0);
  U(r, sdBox(tq - vec3(0.0, 0.08, 0.0), vec3(0.52, 0.08, 0.52)), 3.0);
  U(r, sdBox(tq - vec3(0.0, 6.95, 0.0), vec3(0.2, 0.04, 0.2)), 3.0);
  U(r, length(tq - vec3(0.0, 7.2, 0.0)) - 0.2, 36.0);
  U(r, sdCapsule(tq, vec3(0.0, 7.0, 0.0), vec3(0.0, 7.95, 0.0), 0.025), 3.0);
  vec3 fl = tq - vec3(0.21, 7.76, 0.0); fl.z += sin(uTime * 4.0 + fl.x * 6.0) * 0.03 * fl.x;
  U(r, sdBox(fl, vec3(0.2, 0.11, 0.012)), 4.0);
  U(r, sdCapsule(q, vec3(-0.8, 0.75, -1.38), vec3(-0.45, 1.05, -0.78), 0.09), 3.0);
  return r;
}

vec2 sdDrone(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  if (gTeam < 0.5){
    U(r, sdRBox(q, vec3(0.35, 0.16, 0.45), 0.08), 1.0);
    U(r, sdRBox(q - vec3(0.0, 0.1, -0.05), vec3(0.25, 0.08, 0.3), 0.05), 2.0);
    vec3 a = vec3(abs(q.x), q.y, abs(q.z));
    U(r, sdCapsule(a, vec3(0.25, 0.0, 0.3), vec3(0.6, 0.05, 0.55), 0.05), 3.0);
    U(r, sdTorusY(a - vec3(0.6, 0.05, 0.55), 0.28, 0.05), 1.0);
    U(r, sdCylZ(vec3(q.x, q.y + 0.22, q.z - 0.35), 0.05, 0.25), 5.0);
    U(r, sdRBox(q - vec3(0.0, -0.2, 0.15), vec3(0.08, 0.06, 0.12), 0.03), 3.0);
    U(r, length(q - vec3(0.0, 0.02, 0.46)) - 0.06, 4.0);
  } else {
    U(r, sdRBox(q, vec3(0.18, 0.12, 0.75), 0.1), 1.0);
    vec3 w = vec3(abs(q.x), q.y, q.z);
    vec3 wq = w - vec3(0.5, 0.0, -0.2); wq.xz = r2(wq.xz, 0.6);
    U(r, sdBox(wq, vec3(0.42, 0.02, 0.16)), 2.0);
    U(r, sdCylZ(q - vec3(0.0, 0.0, -0.8), 0.1, 0.1), 7.0);
    U(r, length(w - vec3(0.06, 0.05, 0.72)) - 0.04, 4.0);
    U(r, sdCylZ(vec3(w.x - 0.22, q.y + 0.06, q.z - 0.3), 0.03, 0.25), 5.0);
  }
  return r;
}

// ---- новая техника v6 (vehicles2.js): gV = вид (1 рейдер, 2 РСЗО, 3 миномёт/катапульта) + дробная часть*2 — подъём / рычаг
// gProg — заряжено (0..1), gTh — нитро/выхлоп (рейдер), положение ствола/бомба в ковше (миномёт/катапульта)
float sdWheel(vec3 w, float R, float W, float knob){
  float a = atan(w.y, w.z) + gPh * 1.5;
  float r = length(w.yz) - R - knob * smoothstep(-0.35, 0.35, sin(a * 9.0));
  vec2 d = vec2(r, abs(w.x) - W);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
vec2 sdRaider(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  vec3 qs = vec3(abs(q.x), q.y, q.z), qa = vec3(abs(q.x), q.y, abs(q.z));
  if (gTeam < 0.5){
    // «Шакал»: багги с каркасом, водитель-робот, ракетный блок на корме
    float hull = sdRBox(q - vec3(0.0, 0.8, 0.05), vec3(0.72, 0.24, 1.5), 0.1);
    hull = max(hull, dot(q - vec3(0.0, 0.95, 1.1), vec3(0.0, 0.83, 0.55)));
    U(r, hull, 40.0);
    U(r, sdRBox(q - vec3(0.0, 0.64, 1.62), vec3(0.62, 0.11, 0.08), 0.03), 3.0);
    U(r, sdCapsule(qs, vec3(0.58, 1.0, 0.3), vec3(0.47, 1.72, -0.02), 0.045), 3.0);
    U(r, sdCapsule(qs, vec3(0.6, 1.0, -0.95), vec3(0.47, 1.68, -0.72), 0.045), 3.0);
    U(r, sdCapsule(qs, vec3(0.47, 1.72, -0.02), vec3(0.47, 1.68, -0.72), 0.045), 3.0);
    U(r, sdCapsule(qs, vec3(0.0, 1.73, -0.02), vec3(0.47, 1.72, -0.02), 0.045), 3.0);
    U(r, sdRBox(q - vec3(0.0, 1.17, -0.4), vec3(0.2, 0.17, 0.13), 0.05), 2.0);
    U(r, sdRBox(q - vec3(0.0, 1.47, -0.38), vec3(0.11, 0.1, 0.12), 0.04), 1.0);
    U(r, sdBox(q - vec3(0.0, 1.48, -0.26), vec3(0.08, 0.022, 0.012)), 4.0);
    U(r, length(qs - vec3(0.46, 0.92, 1.5)) - 0.09, 6.0);
    U(r, sdCylZ(q - vec3(0.0, 1.05, -1.62), 0.36, 0.09), 8.0);
    U(r, sdCapsule(q, vec3(-0.6, 1.0, -1.3), vec3(-0.66, 2.5, -1.42), 0.016), 3.0);
    U(r, sdCylZ(qs - vec3(0.32, 0.72, -1.58), 0.07, 0.08), 7.0);
    vec3 w = qa - vec3(0.98, 0.5, 1.0);
    U(r, sdWheel(w, 0.46, 0.17, 0.04), 8.0);
    U(r, sdCylX(w - vec3(0.08, 0.0, 0.0), 0.2, 0.1), 5.0);
    U(r, sdCapsule(qa, vec3(0.55, 0.7, 1.0), vec3(0.92, 0.5, 1.0), 0.055), 3.0);
  } else {
    // «Оса» Роя: стреловидный ховер-байк, жвалы, шипы на хребте, красные дюзы снизу
    vec3 h = q - vec3(0.0, 1.0, 0.1);
    float hull = sdRBox(h, vec3(0.72, 0.24, 1.65), 0.2);
    hull = max(hull, dot(vec2(abs(h.x), h.z), normalize(vec2(1.0, 0.42))) - 0.98);
    U(r, hull, 40.0);
    U(r, sdRBox(q - vec3(0.0, 1.3, -0.3), vec3(0.28, 0.13, 0.95), 0.11), 2.0);
    vec3 sp = q - vec3(0.0, 1.42, -0.3); sp.z -= clamp(floor(sp.z / 0.55 + 0.5), -1.0, 1.0) * 0.55;
    U(r, sdCapsule(sp, vec3(0.0), vec3(0.0, 0.3, -0.25), 0.05), 5.0);
    U(r, sdCapsule(qs, vec3(0.3, 0.88, 1.4), vec3(0.14, 0.7, 2.3), 0.06), 5.0);
    U(r, length(qs - vec3(0.17, 1.17, 1.4)) - 0.07, 4.0);
    U(r, length(qs - vec3(0.34, 1.08, 1.25)) - 0.05, 4.0);
    // ховер-гондолы с горячими дюзами
    vec3 g = qa - vec3(0.85, 0.62, 1.05);
    U(r, sdRBox(g, vec3(0.2, 0.17, 0.5), 0.15), 1.0);
    U(r, sdCylY(g + vec3(0.0, 0.17, 0.0), 0.16, 0.03), 42.0);
  }
  // ракетный блок с пулемётом
  vec3 t = q - vec3(0.0, gTeam < 0.5 ? 1.38 : 1.55, -0.95);
  U(r, sdCylY(t + vec3(0.0, 0.1, 0.0), 0.2, 0.12), 3.0);
  t.xz = r2(t.xz, gYaw); t.zy = r2(t.zy, -gPitch);
  t.y -= 0.2;
  if (gTeam < 0.5){
    U(r, sdRBox(t, vec3(0.34, 0.27, 0.52), 0.05), 40.0);
    vec3 tb = vec3(abs(t.x) - 0.15, abs(t.y) - 0.12, t.z - 0.5);
    U(r, sdCylZ(tb, 0.1, 0.06), 3.0);
    if (gProg > 0.98) U(r, length(tb - vec3(0.0, 0.0, 0.03)) - 0.075, 41.0);
    U(r, sdCylZ(t - vec3(0.44, -0.12, 0.3), 0.035, 0.42), 5.0);
  } else {
    U(r, sdRBox(t, vec3(0.3, 0.24, 0.62), 0.2), 1.0);
    vec3 tb = vec3(abs(t.x) - 0.13, t.y, t.z - 0.6);
    U(r, length(tb) - (gProg > 0.98 ? 0.11 : 0.06), 42.0);
    U(r, sdCylZ(t - vec3(0.0, -0.2, 0.5), 0.03, 0.38), 5.0);
  }
  return r;
}
vec2 sdMLRS(vec3 q, float el){
  vec2 r = vec2(1e5, 0.0);
  vec3 qs = vec3(abs(q.x), q.y, q.z);
  if (gTeam < 0.5){
    // «Град»: трёхосный грузовик, бронекабина, пакет из трёх больших труб
    U(r, sdRBox(q - vec3(0.0, 1.42, 1.45), vec3(0.82, 0.55, 0.6), 0.12), 40.0);
    U(r, sdBox(q - vec3(0.0, 1.66, 2.06), vec3(0.62, 0.11, 0.02)), 3.0);
    U(r, length(qs - vec3(0.22, 1.66, 2.09)) - 0.035, 4.0);
    U(r, sdRBox(q - vec3(0.0, 0.98, -0.45), vec3(0.86, 0.22, 1.65), 0.08), 1.0);
    U(r, length(qs - vec3(0.6, 1.05, 2.06)) - 0.09, 6.0);
    U(r, sdRBox(qs - vec3(0.92, 1.3, -0.25), vec3(0.06, 0.16, 0.9), 0.03), 2.0);
    U(r, sdCapsule(q, vec3(-0.6, 1.95, 1.2), vec3(-0.66, 3.2, 1.1), 0.016), 3.0);
  } else {
    // «Улей» Роя: хитиновый панцирь, жвалы, сотовый пакет
    U(r, sdRBox(q - vec3(0.0, 1.25, 0.6), vec3(0.85, 0.48, 1.4), 0.45), 40.0);
    U(r, length(qs - vec3(0.25, 1.38, 1.98)) - 0.09, 4.0);
    U(r, length(qs - vec3(0.45, 1.25, 1.88)) - 0.07, 4.0);
    U(r, sdCapsule(qs, vec3(0.35, 0.85, 1.9), vec3(0.18, 0.6, 2.55), 0.07), 5.0);
    U(r, sdRBox(q - vec3(0.0, 0.98, -0.75), vec3(0.8, 0.22, 1.15), 0.15), 2.0);
  }
  vec3 w = vec3(abs(q.x) - 0.98, q.y - 0.52, q.z + 0.1);
  w.z -= clamp(floor(w.z / 1.3 + 0.5), -1.0, 1.0) * 1.3;
  U(r, sdWheel(w, 0.5, 0.18, gTeam < 0.5 ? 0.03 : 0.06), 8.0);
  U(r, sdCylX(w - vec3(0.1, 0.0, 0.0), 0.2, 0.1), gTeam < 0.5 ? 5.0 : 2.0);
  // поворотный круг, пусковая на оси подъёма
  vec3 t = q - vec3(0.0, 1.27, -0.75);
  U(r, sdCylY(t, 0.62, 0.1), 3.0);
  t.xz = r2(t.xz, gYaw);
  U(r, sdCapsule(vec3(abs(t.x), t.y, t.z), vec3(0.45, 0.0, -0.55), vec3(0.45, 0.3, -0.55), 0.09), 3.0);
  vec3 p = t - vec3(0.0, 0.32, -0.55);
  p.zy = r2(p.zy, -el);
  vec3 b = p - vec3(0.0, 0.42, 0.95);
  U(r, sdCapsule(vec3(abs(t.x), t.y, t.z), vec3(0.3, 0.05, 0.4), vec3(0.3, 0.32, -0.55) + vec3(0.0, sin(el), cos(el)) * 0.9, 0.06), 5.0);
  if (gTeam < 0.5){
    U(r, sdRBox(b, vec3(0.76, 0.34, 1.15), 0.05), 40.0);
    vec3 tb = b - vec3(0.0, 0.0, 1.15);
    float ix = clamp(floor(tb.x / 0.48 + 0.5), -1.0, 1.0);
    tb.x -= ix * 0.48;
    U(r, sdCylZ(tb, 0.2, 0.05), 3.0);
    if (gProg * 3.0 > ix + 1.5) U(r, length(tb) - 0.16, 41.0);
  } else {
    U(r, sdRBox(b, vec3(0.7, 0.42, 1.0), 0.32), 1.0);
    vec3 tb = b - vec3(0.0, 0.0, 1.05);
    float ix = clamp(floor(tb.x / 0.38 + 0.5), -1.0, 1.0), iy = tb.y > 0.0 ? 1.0 : 0.0;
    tb.x -= ix * 0.38; tb.y = abs(tb.y) - 0.18;
    float k = ix + 1.0 + iy * 3.0;
    U(r, length(tb) - (gProg * 6.0 > k + 0.5 ? 0.13 : 0.07), 42.0);
    vec3 rb = b; rb.z -= clamp(floor(rb.z / 0.45 + 0.5), -1.0, 1.0) * 0.45;
    U(r, max(sdBox(rb, vec3(0.74, 0.46, 0.04)), -sdBox(b, vec3(0.6, 0.3, 2.0))), 2.0);
  }
  return r;
}
// миномёт «Молот» (Консорциум) / катапульта «Требушет» (Рой)
vec2 sdCat(vec3 q, float f){
  vec2 r = vec2(1e5, 0.0);
  vec3 qs = vec3(abs(q.x), q.y, q.z);
  if (gTeam < 0.5){
    U(r, sdRBox(q - vec3(0.0, 0.95, 0.05), vec3(0.78, 0.3, 1.5), 0.1), 40.0);
    vec3 tr = qs - vec3(0.95, 0.5, 0.0);
    U(r, sdRBox(tr, vec3(0.22, 0.42, 1.62), 0.38), 8.0);
    vec3 rw = tr; rw.z -= clamp(floor(rw.z / 0.75 + 0.5), -2.0, 2.0) * 0.75;
    U(r, sdCylX(rw - vec3(0.12, 0.0, 0.0), 0.27, 0.12), 3.0);
    U(r, sdRBox(q - vec3(0.0, 1.32, 1.2), vec3(0.6, 0.14, 0.38), 0.05), 2.0);
    U(r, length(qs - vec3(0.5, 1.12, 1.6)) - 0.08, 6.0);
    U(r, sdRBox(qs - vec3(0.5, 1.4, -1.15), vec3(0.18, 0.18, 0.22), 0.04), 2.0);   // ящики с минами
    // поворотная платформа, плита-опора, ствол миномёта
    vec3 t = q - vec3(0.0, 1.3, -0.15);
    U(r, sdCylY(t, 0.68, 0.08), 3.0);
    t.xz = r2(t.xz, gYaw);
    U(r, sdCapsule(vec3(abs(t.x), t.y, t.z), vec3(0.32, 0.0, 0.2), vec3(0.2, 0.55, 0.05), 0.06), 3.0);
    vec3 m = t - vec3(0.0, 0.5, 0.0);
    float a = 0.8 + 0.6 * f;                       // подъём ствола
    m.zy = r2(m.zy, -a);
    float kick = gTh * 0.25;                       // откат после выстрела
    U(r, sdCylZ(m - vec3(0.0, 0.0, 0.75 - kick), 0.19, 0.95), 40.0);
    U(r, sdCylZ(m - vec3(0.0, 0.0, 1.7 - kick), 0.23, 0.07), 3.0);
    U(r, sdCylZ(m - vec3(0.0, 0.0, 1.0 - kick), 0.24, 0.05), 3.0);
    U(r, sdCylX(m, 0.14, 0.32), 5.0);
  } else {
    // «Требушет»: хитиновый корпус и хвост-рычаг скорпиона с горящим мешком-бомбой
    U(r, sdRBox(q - vec3(0.0, 1.05, 0.2), vec3(0.85, 0.38, 1.45), 0.36), 40.0);
    U(r, length(qs - vec3(0.25, 1.15, 1.72)) - 0.08, 4.0);
    U(r, length(qs - vec3(0.45, 1.05, 1.6)) - 0.06, 4.0);
    // клешни
    U(r, sdCapsule(qs, vec3(0.5, 0.9, 1.5), vec3(0.75, 0.75, 2.2), 0.1), 1.0);
    U(r, sdCapsule(qs, vec3(0.75, 0.75, 2.2), vec3(0.45, 0.7, 2.75), 0.08), 5.0);
    U(r, sdCapsule(qs, vec3(0.75, 0.75, 2.2), vec3(0.62, 0.95, 2.7), 0.06), 5.0);
    vec3 w = vec3(abs(q.x) - 0.95, q.y - 0.47, abs(q.z - 0.2) - 0.85);
    U(r, sdWheel(w, 0.45, 0.17, 0.07), 8.0);
    U(r, sdRBox(vec3(abs(q.x) - 0.95, q.y - 0.95, abs(q.z - 0.2) - 0.85), vec3(0.25, 0.06, 0.5), 0.04), 1.0);
    vec3 t = q - vec3(0.0, 1.35, -0.6);
    t.xz = r2(t.xz, gYaw);
    float b1 = mix(-0.55, 0.25, f), b2 = mix(0.95, 0.6, f), b3 = mix(1.35, 0.75, f);
    vec3 p0 = vec3(0.0, 0.0, -0.3);
    vec3 p1 = p0 + vec3(0.0, cos(b1), sin(b1)) * 1.0;
    vec3 p2 = p1 + vec3(0.0, cos(b1 + b2), sin(b1 + b2)) * 0.9;
    vec3 p3 = p2 + vec3(0.0, cos(b1 + b2 + b3), sin(b1 + b2 + b3)) * 0.75;
    U(r, sdCapsule(t, p0, p1, 0.21), 40.0);
    U(r, sdCapsule(t, p1, p2, 0.18), 40.0);
    U(r, sdCapsule(t, p2, p3, 0.15), 40.0);
    U(r, length(t - p1) - 0.25, 1.0);
    U(r, length(t - p2) - 0.21, 1.0);
    vec3 sd = vec3(0.0, cos(b1 + b2 + b3 + 0.9), sin(b1 + b2 + b3 + 0.9));
    U(r, sdCapsule(t, p3, p3 + sd * 0.75, 0.05), 5.0);          // жало
    U(r, length(t - p3 + sd * 0.15) - (gTh > 0.5 ? 0.34 : 0.17), gTh > 0.5 ? 42.0 : 1.0);
  }
  return r;
}
vec2 sdVeh2(vec3 q){
  float k = floor(gV + 0.01), f = (gV - k) * 2.0;
  if (k < 1.5) return sdRaider(q);
  if (k < 2.5) return sdMLRS(q, f);
  return sdCat(q, f);
}

vec2 sdTank(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  if (gV > 0.5) return sdVeh2(q);   // новая техника v6
  vec3 t = q - vec3(0.0, 1.95, -0.1);
  if (gTeam < 0.5){
    // «Бульдог»: шестиколёсный броневик Консорциума
    U(r, sdRBox(q - vec3(0.0, 1.05, 0.0), vec3(1.25, 0.42, 2.2), 0.18), 1.0);
    U(r, sdRBox(q - vec3(0.0, 1.45, -0.6), vec3(1.05, 0.12, 1.3), 0.06), 2.0);
    U(r, sdRBox(q - vec3(0.0, 0.95, 2.15), vec3(1.0, 0.25, 0.15), 0.05), 3.0);
    vec3 w = vec3(abs(q.x) - 1.38, q.y - 0.58, q.z);
    w.z -= clamp(floor(w.z / 1.55 + 0.5), -1.0, 1.0) * 1.55;
    U(r, sdCylX(w, 0.58, 0.2), 8.0);
    U(r, sdCylX(w - vec3(0.12, 0.0, 0.0), 0.28, 0.1), 5.0);
    U(r, length(vec3(abs(q.x) - 0.85, q.y - 1.2, q.z - 2.22)) - 0.09, 6.0);
    t.xz = r2(t.xz, gYaw);
    U(r, sdRBox(t, vec3(0.78, 0.32, 1.0), 0.14), 1.0);
    U(r, sdRBox(t - vec3(0.35, 0.36, -0.3), vec3(0.25, 0.06, 0.25), 0.04), 2.0);
    U(r, sdCapsule(t, vec3(-0.5, 0.3, -0.7), vec3(-0.5, 1.5, -0.8), 0.02), 3.0);
    vec3 bq = t - vec3(0.0, 0.05, 0.9); bq.zy = r2(bq.zy, -gPitch);
    U(r, sdCylZ(bq - vec3(0.0, 0.0, 1.1), 0.11, 1.1), 5.0);
    U(r, sdRBox(bq - vec3(0.0, 0.0, 2.25), vec3(0.17, 0.13, 0.14), 0.03), 3.0);
  } else {
    // «Паук» Роя
    U(r, sdRBox(q - vec3(0.0, 1.55, 0.0), vec3(1.05, 0.45, 1.6), 0.4), 1.0);
    U(r, sdRBox(q - vec3(0.0, 1.95, -0.4), vec3(0.6, 0.15, 0.9), 0.1), 2.0);
    for (int k = 0; k < 6; k++){
      float s = k < 3 ? -1.0 : 1.0;
      int idx = k < 3 ? k : k - 3;
      float zi = float(idx) - 1.0;
      float grp = mod(float(idx) + (s > 0.0 ? 1.0 : 0.0), 2.0);
      float ph = gPh * 1.4 + grp * 3.14159;
      float stz = sin(ph) * 0.5 * gM;
      float lift = max(0.0, cos(ph)) * 0.35 * gM;
      vec3 hip = vec3(s * 0.95, 1.55, zi * 1.1);
      vec3 foot = vec3(s * 2.4, lift, zi * 1.35 + stz);
      vec3 knee = vec3(s * 1.9, 2.5 + lift * 0.5, zi * 1.2 + stz * 0.5);
      U(r, sdCapsule(q, hip, knee, 0.13), 3.0);
      U(r, sdCapsule(q, knee, foot, 0.08), 1.0);
      U(r, length(q - knee) - 0.17, 2.0);
    }
    t.xz = r2(t.xz, gYaw);
    U(r, sdRBox(t - vec3(0.0, 0.25, 0.4), vec3(0.55, 0.22, 0.75), 0.12), 1.0);
    vec3 e = vec3(abs(t.x), t.y, t.z);
    U(r, length(e - vec3(0.15, 0.3, 1.13)) - 0.07, 4.0);
    U(r, length(e - vec3(0.3, 0.22, 1.08)) - 0.05, 4.0);
    vec3 bq = t - vec3(0.0, 0.22, 1.0); bq.zy = r2(bq.zy, -gPitch);
    U(r, sdCylZ(vec3(abs(bq.x) - 0.2, bq.y, bq.z - 0.8), 0.07, 0.8), 5.0);
  }
  return r;
}

vec2 sdTurret(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdCylY(q - vec3(0.0, -0.4, 0.0), 1.1, 0.8), 9.0);
  U(r, sdCylY(q - vec3(0.0, 0.9, 0.0), 0.28, 0.5), 3.0);
  vec3 t = q - vec3(0.0, 1.65, 0.0); t.xz = r2(t.xz, gYaw); t.zy = r2(t.zy, -gPitch);
  U(r, sdRBox(t, vec3(0.42, 0.3, 0.5), 0.1), 1.0);
  U(r, sdRBox(t - vec3(0.0, 0.18, -0.1), vec3(0.3, 0.1, 0.35), 0.05), 2.0);
  U(r, sdCylZ(vec3(abs(t.x) - 0.14, t.y + 0.02, t.z - 0.9), 0.055, 0.45), 5.0);
  U(r, length(t - vec3(0.0, 0.12, 0.5)) - 0.07, 4.0);
  return r;
}

vec2 sdAA(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdCylY(q - vec3(0.0, -0.3, 0.0), 1.7, 0.9), 9.0);
  vec3 t = q - vec3(0.0, 1.1, 0.0); t.xz = r2(t.xz, gYaw);
  U(r, sdCylY(t, 1.1, 0.25), 1.0);
  vec3 a = vec3(abs(t.x), t.y, t.z);
  U(r, sdRBox(a - vec3(0.55, 0.65, 0.0), vec3(0.12, 0.45, 0.35), 0.05), 2.0);
  vec3 c = t - vec3(0.0, 0.9, 0.0); c.zy = r2(c.zy, -gPitch);
  U(r, sdRBox(c, vec3(0.42, 0.28, 0.5), 0.1), 1.0);
  U(r, sdCylZ(vec3(abs(c.x) - 0.22, c.y, c.z - 1.3), 0.08, 0.9), 5.0);
  vec3 rd = t - vec3(0.0, 0.5, -0.8); rd.xz = r2(rd.xz, uTime * 2.0);
  U(r, sdRBox(rd - vec3(0.0, 0.45, 0.0), vec3(0.5, 0.25, 0.03), 0.02), 2.0);
  U(r, sdCapsule(rd, vec3(0.0), vec3(0.0, 0.3, 0.0), 0.05), 3.0);
  return r;
}

vec2 sdFactory(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  float hall = sdBox(q - vec3(0.0, 3.0, 0.0), vec3(6.0, 6.0, 8.0));
  vec3 rq = q - vec3(0.0, 9.0, 0.0);
  hall = max(hall, max(dot(rq, vec3(0.5145, 0.8575, 0.0)), dot(rq, vec3(-0.5145, 0.8575, 0.0))));
  hall = max(hall, -sdBox(q - vec3(0.0, 2.6, 8.0), vec3(3.2, 2.6, 0.8)));
  U(r, hall, 1.0);
  U(r, sdBox(q - vec3(0.0, 2.6, 7.55), vec3(3.2, 2.6, 0.1)), 3.0);
  U(r, sdBox(q - vec3(0.0, 5.45, 8.05), vec3(3.4, 0.12, 0.1)), 10.0);
  U(r, sdBox(q - vec3(0.0, -1.4, 0.0), vec3(7.0, 2.0, 9.0)), 9.0);
  vec3 pz = vec3(abs(q.x), q.y, q.z) - vec3(6.15, 3.8, 0.0);
  pz.z -= clamp(floor(pz.z / 3.5 + 0.5), -2.0, 2.0) * 3.5;
  U(r, sdBox(pz, vec3(0.3, 4.2, 0.3)), 2.0);
  U(r, sdCylY(q - vec3(3.5, 10.5, -5.0), 0.6, 2.5), 3.0);
  U(r, sdCylY(q - vec3(-4.0, 1.5, -10.2), 1.2, 1.5), 2.0);
  return r;
}

vec2 sdHub(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdCylY(q - vec3(0.0, -1.0, 0.0), 6.5, 1.4), 9.0);
  U(r, max(length(q - vec3(0.0, 0.4, 0.0)) - 3.2, 0.4 - q.y), 2.0);
  U(r, sdTorusY(q - vec3(0.0, 0.45, 0.0), 5.6, 0.12), 10.0);
  U(r, sdCapsule(q, vec3(0.0, 3.4, 0.0), vec3(0.0, 5.2, 0.0), 0.08), 3.0);
  U(r, length(q - vec3(0.0, 5.3, 0.0)) - 0.2, 4.0);
  vec3 a = vec3(abs(q.x), q.y, abs(q.z));
  U(r, sdCylY(a - vec3(3.9, 0.55, 3.9), 1.0, 0.15), 1.0);
  return r;
}

vec2 sdAirdock(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdBox(q - vec3(0.0, -1.0, 0.0), vec3(6.0, 1.6, 6.0)), 9.0);
  U(r, sdTorusY(q - vec3(0.0, 0.62, 0.8), 2.6, 0.12), 10.0);
  vec3 a = vec3(abs(q.x), q.y, q.z);
  U(r, sdBox(a - vec3(3.2, 7.0, -3.5), vec3(0.45, 6.5, 0.45)), 1.0);
  U(r, sdBox(a - vec3(3.2, 7.0, -3.04), vec3(0.08, 6.0, 0.03)), 10.0);
  U(r, sdBox(q - vec3(0.0, 13.6, -3.5), vec3(3.7, 0.4, 0.5)), 2.0);
  U(r, max(sdCylZ(q - vec3(0.0, 0.6, -4.6), 3.0, 1.4), 0.6 - q.y), 2.0);
  return r;
}

// ---- форпост
vec2 sdOutpost(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdBox(q - vec3(0.0, -0.5, 0.0), vec3(4.6, 1.5, 4.6)), 9.0);
  vec3 b = q - vec3(0.0, 2.4, -0.6);
  float blk = sdRBox(b, vec3(3.2, 1.5, 2.8), 0.25);
  blk = max(blk, dot(b - vec3(0.0, 1.5, 1.9), vec3(0.0, 0.7071, 0.7071)));
  U(r, blk, 1.0);
  U(r, sdBox(q - vec3(0.0, 2.75, 2.12), vec3(2.2, 0.14, 0.32)), 10.0);
  U(r, sdBox(q - vec3(0.0, 4.0, -1.4), vec3(2.3, 0.14, 1.5)), 2.0);
  U(r, sdCapsule(q, vec3(2.2, 3.0, -2.0), vec3(2.2, 8.5, -2.0), 0.18), 3.0);
  U(r, sdCapsule(q, vec3(2.2, 7.0, -2.0), vec3(2.9, 7.4, -2.0), 0.06), 3.0);
  U(r, length(q - vec3(2.2, 8.6, -2.0)) - 0.28, 4.0);
  vec3 a = vec3(abs(q.x), q.y, q.z);
  U(r, sdRBox(a - vec3(3.6, 1.55, 3.4), vec3(0.6, 0.55, 0.6), 0.08), 2.0);
  U(r, sdRBox(a - vec3(3.7, 1.35, 1.9), vec3(0.45, 0.35, 0.45), 0.06), 13.0);
  U(r, sdTorusY(q - vec3(0.0, 1.05, 0.0), 4.3, 0.08), 10.0);
  return r;
}
// ---- обломки старых экспедиций
float sdEll(vec3 p, vec3 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
vec2 sdSat(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  vec3 b = q - vec3(0.0, 1.0, 0.0);
  U(r, sdRBox(b, vec3(1.1, 0.85, 0.85), 0.08), 15.0);
  U(r, sdBox(vec3(b.x, b.y, abs(b.z) - 0.86), vec3(0.85, 0.6, 0.03)), 13.0);
  U(r, sdCylY(b - vec3(0.0, 0.95, 0.0), 0.18, 0.12), 3.0);
  vec3 w = b - vec3(1.15, 0.15, 0.0);
  U(r, sdBox(w - vec3(0.3, 0.0, 0.0), vec3(0.3, 0.05, 0.05)), 3.0);
  U(r, sdBox(w - vec3(2.4, 0.0, 0.0), vec3(1.8, 0.03, 0.75)), 14.0);
  vec3 w2 = b - vec3(-1.15, 0.15, 0.0); w2.xy = r2(w2.xy, 0.55);
  U(r, sdBox(w2 - vec3(-0.3, 0.0, 0.0), vec3(0.3, 0.05, 0.05)), 3.0);
  vec3 w2p = w2 - vec3(-1.9, 0.0, 0.0); w2p.xz = r2(w2p.xz, 0.25);
  U(r, sdBox(w2p, vec3(1.5, 0.03, 0.72)), 14.0);
  vec3 d = b - vec3(0.0, 1.05, 0.2);
  d.yz = r2(d.yz, 0.5);
  float dish = max(abs(length(d - vec3(0.0, 1.2, 0.0)) - 1.25) - 0.035, d.y - 0.42);
  U(r, dish, 15.0);
  U(r, sdCapsule(d, vec3(0.0, -0.05, 0.0), vec3(0.0, 0.9, 0.0), 0.04), 3.0);
  U(r, length(d - vec3(0.0, 0.92, 0.0)) - 0.09, 16.0);
  return r;
}
vec2 sdModule(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  vec3 c = q - vec3(0.0, 1.15, 0.0);
  U(r, sdCylZ(c, 1.75, 2.8), 13.0);
  vec3 rq = c; rq.z = mod(rq.z + 0.45, 0.9) - 0.45;
  U(r, max(sdCylZ(rq, 1.95, 0.07), abs(c.z) - 2.6), 3.0);
  U(r, sdEll(vec3(c.x, c.y, abs(c.z) - 2.8), vec3(1.6, 1.6, 0.7)), 15.0);
  U(r, sdCylY(q - vec3(0.6, 3.4, -1.2), 0.45, 1.2), 3.0);
  U(r, sdTorusY(q - vec3(0.6, 4.6, -1.2), 0.45, 0.07), 13.0);
  U(r, sdCapsule(q, vec3(1.5, 0.7, 1.6), vec3(3.0, 0.15, 2.7), 0.17), 3.0);
  U(r, sdCapsule(q, vec3(-1.4, 1.6, -0.8), vec3(-2.6, 0.2, -2.4), 0.13), 13.0);
  U(r, sdBox(q - vec3(1.73, 1.25, 0.2), vec3(0.06, 0.55, 0.5)), 3.0);
  U(r, length(q - vec3(-0.9, 2.85, 1.0)) - 0.16, 16.0);
  return r;
}
vec2 sdSonar(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdCylY(q - vec3(0.0, 0.2, 0.0), 1.6, 0.25), 9.0);
  U(r, sdCapsule(q, vec3(0.0), vec3(0.0, 6.4, 0.0), 0.3), 3.0);
  for (int k = 0; k < 3; k++){
    float a = float(k) * 2.094;
    vec3 foot = vec3(cos(a) * 2.6, 0.0, sin(a) * 2.6);
    vec3 top = k == 2 ? vec3(cos(a) * 1.1, 1.5, sin(a) * 1.1) : vec3(0.0, 3.6, 0.0);
    U(r, sdCapsule(q, foot, top, 0.12), 13.0);
  }
  U(r, sdRBox(q - vec3(0.0, 2.2, 0.35), vec3(0.4, 0.5, 0.18), 0.05), 15.0);
  U(r, length(q - vec3(0.0, 2.4, 0.55)) - 0.08, 16.0);
  vec3 d = q - vec3(0.0, 6.6, 0.0);
  d.yz = r2(d.yz, -0.6);
  U(r, max(abs(length(d - vec3(0.0, 2.6, 0.0)) - 2.7) - 0.05, d.y - 0.9), 15.0);
  U(r, sdCapsule(d, vec3(0.0), vec3(0.0, 1.9, 0.0), 0.05), 3.0);
  U(r, length(d - vec3(0.0, 1.95, 0.0)) - 0.14, 16.0);
  return r;
}
vec2 sdCont(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  vec3 c1 = q - vec3(0.0, 1.3, 0.0);
  U(r, sdBox(c1, vec3(1.2, 1.3, 3.0)), 17.0);
  U(r, sdBox(vec3(c1.x, c1.y, abs(c1.z) - 3.0), vec3(1.16, 1.26, 0.04)), 3.0);
  vec3 c2 = q - vec3(0.3, 3.9, 0.8); c2.xz = r2(c2.xz, 0.2);
  U(r, sdBox(c2, vec3(1.2, 1.3, 3.0)), 18.0);
  vec3 c3 = q - vec3(3.6, 1.0, -1.4); c3.xz = r2(c3.xz, 0.5);
  U(r, sdBox(c3, vec3(1.3, 1.2, 3.0)), 19.0);
  return r;
}
vec2 sdTruss(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  vec3 b = q - vec3(0.0, 0.65, 0.0);
  float env = sdBox(b, vec3(0.75, 0.75, 8.3));
  if (env < 0.4){
    vec3 a = vec3(abs(b.x), abs(b.y), b.z);
    U(r, sdBox(vec3(a.x - 0.55, a.y - 0.55, b.z), vec3(0.06, 0.06, 8.2)), 13.0);
    vec3 rp = b; rp.z = mod(rp.z + 0.8, 1.6) - 0.8;
    float k1 = sdCapsule(vec3(abs(rp.x), rp.y, rp.z), vec3(0.55, -0.55, -0.8), vec3(0.55, 0.55, 0.8), 0.035);
    float k2 = sdCapsule(vec3(rp.x, abs(rp.y), rp.z), vec3(-0.55, 0.55, -0.8), vec3(0.55, 0.55, 0.8), 0.035);
    U(r, max(min(k1, k2), abs(b.z) - 8.2), 3.0);
  } else U(r, env, 13.0);
  U(r, sdBox(q - vec3(0.0, 1.0, 8.6), vec3(1.4, 1.0, 1.4)), 9.0);
  vec3 t = q - vec3(0.4, 0.4, -8.6); t.xy = r2(t.xy, 0.9);
  U(r, sdCylY(t, 0.9, 0.05), 15.0);
  return r;
}

// инопланетные кристаллы: пучок наклонных граней из одной точки
vec2 sdCrystal(vec3 q){
  vec2 r = vec2(1e5, 30.0);
  for (int k = 0; k < 5; k++){
    float a = float(k) * 1.2566 + gV * 0.7, t = 0.25 + 0.28 * fract(float(k) * 0.618 + gV * 0.31);
    float L = 1.1 + 1.3 * fract(float(k) * 0.37 + gV * 0.19);
    vec3 dir = normalize(vec3(cos(a) * t, 1.0, sin(a) * t));
    vec3 base = vec3(cos(a) * 0.25, -0.2, sin(a) * 0.25);
    vec3 p = q - base;
    float h = clamp(dot(p, dir), 0.0, L);
    float rad = 0.2 * (1.0 - h / L) + 0.02;
    U(r, length(p - dir * h) - rad, 30.0);
  }
  return r;
}
// жилой модуль первой экспедиции: лежащая бочка на опорах, купол-шлюз, антенна, панель
vec2 sdHut(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  vec3 b = q - vec3(0.0, 1.9, 0.0);
  U(r, sdCylX(b, 1.6, 2.6), 25.0);
  U(r, length(vec3(abs(b.x) - 2.6, b.y, b.z)) - 1.45, 25.0);
  U(r, sdCylX(vec3(abs(b.x) - 1.4, b.y, b.z), 1.66, 0.08), 13.0);
  U(r, sdBox(vec3(b.x, b.y - 0.35, b.z - 1.5), vec3(1.6, 0.18, 0.06)), 26.0);
  vec3 lq = vec3(abs(q.x) - 1.8, q.y, abs(q.z) - 0.9);
  U(r, sdCapsule(lq, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.8, 0.0), 0.1), 13.0);
  U(r, sdCapsule(q, vec3(-1.0, 3.3, 0.0), vec3(-1.0, 5.6, 0.0), 0.06), 3.0);
  U(r, length(q - vec3(-1.0, 5.7, 0.0)) - 0.12, 26.0);
  vec3 sp = q - vec3(1.2, 3.7, 0.0); sp.xy = r2(sp.xy, 0.4);
  U(r, sdBox(sp, vec3(1.0, 0.03, 0.7)), 14.0);
  return r;
}
// склад первой экспедиции: полуцилиндрический ангар с воротами
vec2 sdDepot(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  float shell = max(abs(length(q.xy) - 3.0) - 0.12, max(-q.y, abs(q.z) - 4.5));
  float rib = max(abs(length(q.xy) - 3.0) - 0.2, max(-q.y, abs(mod(q.z + 0.75, 1.5) - 0.75) - 0.08));
  rib = max(rib, abs(q.z) - 4.5);
  U(r, shell, 25.0);
  U(r, rib, 13.0);
  U(r, max(sdBox(q - vec3(0.0, 1.2, 4.45), vec3(1.4, 1.2, 0.08)), -q.y), 3.0);
  U(r, sdBox(q - vec3(0.0, 2.55, 4.5), vec3(0.5, 0.12, 0.05)), 26.0);
  U(r, sdRBox(q - vec3(3.6, 0.6, 2.0), vec3(0.6, 0.6, 0.6), 0.05), 17.0);
  U(r, sdRBox(q - vec3(3.5, 0.5, 3.4), vec3(0.5, 0.5, 0.5), 0.05), 18.0);
  return r;
}

// ---- v6.6: казарма — длинный бункер со скатной крышей, воротами, окнами, антенной и флажком
vec2 sdBarracks(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdBox(q - vec3(0.0, -0.6, 0.0), vec3(5.4, 1.3, 4.3)), 9.0);
  vec3 b = q - vec3(0.0, 2.1, -0.5);
  float hall = sdRBox(b, vec3(4.7, 1.6, 3.0), 0.3);
  hall = max(hall, dot(b - vec3(0.0, 1.0, 0.0), vec3(0.0, 0.9701, 0.2425)));
  U(r, hall, 1.0);
  U(r, sdBox(q - vec3(0.0, 2.25, -1.6), vec3(4.2, 1.9, 0.9)), 2.0);
  U(r, sdBox(q - vec3(0.0, 1.4, 2.52), vec3(1.5, 0.95, 0.14)), 3.0);
  U(r, sdBox(q - vec3(0.0, 2.45, 2.55), vec3(1.75, 0.08, 0.12)), 10.0);
  vec3 a = vec3(abs(q.x), q.y, q.z);
  U(r, sdBox(a - vec3(3.3, 1.65, 2.55), vec3(0.65, 0.25, 0.06)), 10.0);
  U(r, sdRBox(a - vec3(5.0, 1.05, 3.3), vec3(0.45, 0.4, 0.45), 0.08), 13.0);
  U(r, sdRBox(q - vec3(-4.95, 1.0, 2.2), vec3(0.4, 0.35, 0.4), 0.08), 13.0);
  U(r, sdCapsule(q, vec3(-3.4, 4.0, -1.8), vec3(-3.4, 8.2, -1.8), 0.11), 3.0);
  U(r, length(q - vec3(-3.4, 8.3, -1.8)) - 0.2, 4.0);
  vec3 fl = q - vec3(-2.85, 7.65, -1.8); fl.z += sin(uTime * 4.0 + fl.x * 5.0) * 0.05 * (fl.x + 0.55);
  U(r, sdBox(fl, vec3(0.55, 0.32, 0.025)), 1.0);
  U(r, sdTorusY(q - vec3(0.0, 0.75, 0.0), 5.3, 0.08), 10.0);
  return r;
}
// ---- v6.6: склад руды — приёмный бункер с зелёной рудой, транспортёр, ангар
vec2 sdOreDepot(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  U(r, sdBox(q - vec3(0.0, -0.5, 0.0), vec3(3.6, 1.0, 3.2)), 9.0);
  vec3 h = q - vec3(-0.6, 1.5, -0.9);
  float hang = max(abs(length(h.xy) - 1.8) - 0.12, max(-(h.y + 1.0), abs(h.z) - 1.9));
  U(r, hang, 1.0);
  U(r, max(length(h.xy) - 1.8, max(-(h.y + 1.0), abs(h.z + 1.85) - 0.06)), 2.0);
  vec3 f = q - vec3(2.0, 1.4, 1.5);
  float fun = max(abs(length(f.xz) - (0.7 + 0.35 * (f.y + 0.9))) - 0.08, abs(f.y) - 0.9);
  U(r, fun, 3.0);
  U(r, max(length(f.xz) - (0.62 + 0.35 * (f.y + 0.9)), f.y - 0.45 + 0.08 * sin(uTime * 2.0 + f.x * 6.0)), 35.0);
  U(r, sdCapsule(q, vec3(1.4, 0.5, 0.9), vec3(0.4, 1.5, -0.2), 0.16), 3.0);
  vec3 a = vec3(abs(q.x), q.y, abs(q.z));
  U(r, sdBox(a - vec3(3.0, 0.7, 2.7), vec3(0.18, 0.2, 0.18)), 4.0);
  U(r, sdTorusY(q - vec3(0.0, 0.55, 0.0), 3.4, 0.07), 10.0);
  return r;
}

vec2 objMap(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  int ty = int(gT + 0.5);
  float sq = 1.0;
  bool prop = ty >= 13 && ty < 21;
  if (prop){ sq = 0.3 + 0.7 * gProg; q.y /= sq; }   // разрушенные обломки — сплющены
  switch (ty){
    case 1: r = sdInf(q); break;
    case 2: r = sdWreck(q); break;
    case 3: r = sdBuilder(q / 1.5); r.x *= 1.5; break;   // v6: инженер крупнее (заметен с высоты стратегии)
    case 4: r = sdDrone(q); break;
    case 5: r = sdTank(q); break;
    case 6: r = sdTurret(q); break;
    case 7: r = sdAA(q); break;
    case 8: r = sdFactory(q); break;
    case 9: r = sdHub(q); break;
    case 10: r = sdAirdock(q); break;
    case 11: r = sdOutpost(q); break;
    case 12: r = sdExtractor(q); break;
    case 13: r = sdSat(q); break;
    case 14: r = sdModule(q); break;
    case 15: r = sdSonar(q); break;
    case 16: r = sdCont(q); break;
    case 18: r = gV > 7.5 ? sdVeinCrystal(q) : sdCrystal(q); break;   // v6.2: кристаллы жил — огранённые
    case 19: r = sdHut(q); break;
    case 20: r = sdDepot(q); break;
    case 21: r = sdBarracks(q); break;
    case 22: r = sdOreDepot(q); break;
    default: r = sdTruss(q); break;
  }
  if (prop){ r.x *= sq; return r; }
  if (gT > 5.5 && gProg < 0.999){
    float bh = gT < 6.5 ? 2.4 : gT < 7.5 ? 3.3 : gT < 8.5 ? 12.5 : gT < 9.5 ? 5.6 : gT < 10.5 ? 14.2 : gT < 11.5 ? 8.6 : gT < 20.5 ? 8.2 : gT < 21.5 ? 5.4 : 3.4;
    float H = -1.0 + (bh + 1.0) * gProg;
    if (q.y - H > r.x){ r.x = q.y - H; r.y = 12.0; }
    // v6: строительные леса — угловые стойки на полную высоту и светящаяся рамка на уровне стройки
    float hs = gT < 6.5 ? 1.25 : gT < 7.5 ? 1.8 : gT < 8.5 ? 7.4 : gT < 9.5 ? 5.4 : gT < 10.5 ? 6.3 : gT < 11.5 ? 4.9 : gT < 20.5 ? 2.25 : gT < 21.5 ? 5.0 : 3.4;
    vec3 sq2 = vec3(abs(q.x) - hs, q.y, abs(q.z) - hs);
    float th = 0.05 + hs * 0.012;
    U(r, sdCapsule(sq2, vec3(0.0, -0.5, 0.0), vec3(0.0, bh + 0.3, 0.0), th), 3.0);
    vec3 fr = vec3(abs(q.x), q.y - H, abs(q.z));
    U(r, min(sdBox(fr - vec3(hs, 0.0, 0.0), vec3(th, th, hs)), sdBox(fr - vec3(0.0, 0.0, hs), vec3(hs, th, th))), 12.0);
  }
  return r;
}



void objMaterial(float m, vec3 q, out vec3 alb, out vec3 em, out float sp){
  em = vec3(0.0); sp = 0.25;
  float grime = 0.8 + 0.4 * nz(q * 0.11 + 0.37);
  if (m < 1.5){ alb = teamA(gTeam) * grime; }
  else if (m < 2.5){ alb = teamB(gTeam) * grime; }
  else if (m < 3.5){ alb = vec3(0.045, 0.045, 0.05); sp = 0.4; }
  else if (m < 4.5){ alb = vec3(0.0); em = teamE(gTeam); }
  else if (m < 5.5){ alb = vec3(0.07, 0.07, 0.075); sp = 0.8; }
  else if (m < 6.5){ alb = vec3(0.0); em = vec3(3.2, 3.0, 2.6); }
  else if (m < 7.5){ alb = vec3(0.05); sp = 0.5; em = vec3(1.0, 0.45, 0.12) * 4.0 * gTh; }
  else if (m < 8.5){ alb = vec3(0.022); sp = 0.05; }
  else if (m < 9.5){ alb = vec3(0.27, 0.265, 0.25) * (0.75 + 0.4 * nz(q * 0.05)); sp = 0.05; }
  else if (m < 10.5){ alb = vec3(0.04); em = teamE(gTeam) * 0.4; }
  else if (m < 11.5){ alb = vec3(0.035, 0.032, 0.03) * (0.6 + 0.8 * nz(q * 0.5)); em = vec3(1.0, 0.28, 0.04) * 2.0 * gProg * smoothstep(0.55, 0.75, nz(q * 0.9)); }
  else if (m < 12.5){ alb = vec3(0.05); em = vec3(0.35, 0.85, 1.0) * 2.5; }
  else if (m < 13.5){   // ржавый металл
    float n1 = nz(q * 0.35 + 0.2), n2 = nz(q * 1.7);
    alb = mix(vec3(0.11, 0.105, 0.1), vec3(0.27, 0.12, 0.05), smoothstep(0.35, 0.7, n1 + 0.25 * n2));
    alb *= 0.75 + 0.5 * n2; sp = 0.15;
  }
  else if (m < 14.5){   // солнечные панели
    vec2 g = abs(fract(q.xz * 2.2) - 0.5);
    float line = smoothstep(0.44, 0.48, max(g.x, g.y));
    alb = mix(vec3(0.015, 0.025, 0.06), vec3(0.18, 0.18, 0.2), line);
    alb *= 0.6 + 0.6 * nz(q * 0.8);
    sp = 0.9;
  }
  else if (m < 15.5){   // выцветшая белая краска
    alb = vec3(0.42, 0.41, 0.38) * (0.6 + 0.5 * nz(q * 0.6));
    alb = mix(alb, vec3(0.2, 0.1, 0.05), smoothstep(0.6, 0.8, nz(q * 1.3 + 3.1)) * 0.7);
    sp = 0.2;
  }
  else if (m < 16.5){ alb = vec3(0.05); em = vec3(2.6, 1.1, 0.2) * (0.25 + 0.75 * step(0.6, sin(uTime * 2.5 + gV * 1.7))); }
  else if (m > 39.5){   // техника v6: материалы 40 корпус, 41 головки ракет/мины, 42 горячие «мешки» Роя
    if (m < 40.5){
      float n1 = nz(q * 0.9 + 0.2), n2 = nz(q * 3.1 + 1.3);
      if (gTeam < 0.5){   // песочный беж с оливковыми пятнами, сколы до металла, грязь снизу
        float camo = smoothstep(0.47, 0.53, nz(q * 0.55 + vec3(gV * 1.7, 0.0, 0.0)));
        alb = mix(teamB(0.0), teamA(0.0) * 1.2, camo);
        float chip = smoothstep(0.7, 0.76, n2 * 0.6 + n1 * 0.5);
        alb = mix(alb, vec3(0.085, 0.08, 0.075), chip);
        alb *= (0.78 + 0.34 * n1) * mix(0.6, 1.0, smoothstep(0.3, 1.1, q.y));
        sp = mix(0.1, 0.5, chip);
      } else {            // воронёная сталь пластинами, редкие тлеющие красные швы
        alb = teamA(1.0) * (1.1 + 0.5 * n1) * (1.0 + 0.35 * step(0.5, fract(q.z * 1.3)));   // пластины чуть разного тона
        float seam = smoothstep(0.485, 0.5, abs(fract(q.z * 0.9 + 0.25) - 0.5)) * step(0.5, n2);
        em = vec3(1.0, 0.08, 0.03) * 0.8 * seam;
        sp = 0.5;
      }
    } else if (m < 41.5){ alb = vec3(0.5, 0.48, 0.42) * (0.8 + 0.3 * nz(q * 2.0)); sp = 0.5; }
    else { alb = vec3(0.03); em = vec3(1.0, 0.1, 0.03) * (2.2 + 0.8 * sin(uTime * 6.0 + q.z * 4.0)); }
  }
  else if (m > 30.5){   // v6.2: руда жил и экстрактор — 31 базальт, 32 огранённый кристалл, 33 сотовый купол, 34 ферма, 35 осколки, 36 маяк
    if (m < 31.5){
      alb = vec3(0.026, 0.032, 0.030) * (0.6 + 0.8 * nz(q * 1.7)); sp = 0.6;
      em = EMER * 0.025;
    } else if (m < 33.5){
      // грани: две ближайшие плоскости (м-к Гольдберга GP(1,1)) → тёмные швы; внутри — трещины по сетке GP(3,0) и искры
      vec3 a; float R = 1.0;
      bool dome = m > 32.5;
      if (dome){ a = q - vec3(0.0, 0.72, 0.0); R = 1.36; }
      else a = cryLocal(q, R);
      vec3 na = normalize(a);
      float b1 = -1e5, b2 = -1e5, c1 = -1e5, c2 = -1e5; int id = 0, cid = 0;
      for (int i = ZERO; i < 92; i++){
        float c = dot(na, uGP[i]);
        if (c > c1){ c2 = c1; c1 = c; cid = i; } else if (c > c2) c2 = c;
        if (i < 32){
          float v = dot(a, uGP[i]) - R * (i < 12 ? 1.026 : 1.0);
          if (v > b1){ b2 = b1; b1 = v; id = i; } else if (v > b2) b2 = v;
        }
      }
      float seam, crack, fb;
      if (dome){
        seam = 1.0 - smoothstep(0.004, 0.012, c1 - c2);
        crack = 0.0;
        fb = 0.65 + 0.7 * hash12(vec2(float(cid), 7.3));
      } else {
        float g = (b1 - b2) / R;
        seam = 1.0 - smoothstep(0.008, 0.022, g);
        crack = 0.0;
        vec3 nf = uGP[id];
        fb = 0.45 + 0.8 * hash12(vec2(float(id), gV)) + 0.45 * max(dot(nf, vec3(0.28, 0.92, 0.27)), 0.0);   // грани светятся неравномерно, верх ярче
        fb *= 0.55 + 0.45 * smoothstep(-0.9, 0.5, na.y);
        fb += 1.1 * (1.0 - smoothstep(0.0, 0.08, g)) * (1.0 - seam);   // светлая кайма у рёбер, как преломление
      }
      vec3 cell = floor(a * 9.0);
      float hs = hash12(cell.xy + vec2(cell.z * 17.31, gV * 3.7));
      float spark = step(0.9, hs) * smoothstep(0.32, 0.05, length(fract(a * 9.0) - 0.5)) * pow(0.5 + 0.5 * sin(uTime * (2.0 + hs * 5.0) + hs * 40.0), 4.0);
      float pulse = dome ? (0.75 + 0.25 * sin(uTime * 2.6 - na.y * 6.0)) * mix(0.12, 1.0, step(0.999, gProg))
                         : 0.85 + 0.15 * sin(uTime * 1.6 + gV * 2.0);
      alb = EMER * 0.03; sp = 0.95;
      em = EMER * (1.3 * fb * pulse * (1.0 - 0.4 * crack) + 3.0 * spark) * (1.0 - 0.93 * seam);
    } else if (m < 34.5){
      alb = vec3(0.03); sp = 0.5;
      em = EMER * (0.7 + 0.3 * sin(uTime * 2.2 - q.y * 1.3)) * mix(0.1, 1.0, gProg);
    } else if (m < 35.5){
      alb = EMER * 0.05; sp = 0.9;
      em = EMER * (1.3 + 0.5 * sin(uTime * 2.0 + dot(q, vec3(5.0, 3.0, 4.0))));
    } else {
      alb = vec3(0.0);
      em = mix(EMER, vec3(0.8, 1.0, 0.85), 0.35) * 7.0 * (0.7 + 0.3 * sin(uTime * 3.4)) * mix(0.08, 1.0, step(0.999, gProg));
    }
  }
  else if (m > 29.5){   // кристаллы: светятся изнутри, цвет зависит от варианта
    vec3 cA = vec3(0.1, 1.0, 0.85), cB = vec3(0.7, 0.3, 1.0);
    vec3 c = mix(cA, cB, fract(gV * 0.37));
    alb = c * 0.08; sp = 0.95;
    em = c * (0.9 + 0.5 * sin(uTime * 1.3 + q.y * 3.0 + gV)) * (0.4 + 0.6 * smoothstep(-0.2, 1.8, q.y)) * gProg;
  }
  else if (m > 25.5){   // окна заброшенного модуля: изредка мерцают
    alb = vec3(0.03); em = vec3(1.0, 0.75, 0.35) * 0.9 * step(0.92, fract(sin(floor(uTime * 3.0) + gV * 7.1) * 43758.5)) * gProg;
  }
  else if (m > 24.5){   // выцветшая белая обшивка с оранжевой полосой первой экспедиции
    alb = vec3(0.46, 0.45, 0.42) * (0.6 + 0.5 * nz(q * 0.5));
    alb = mix(alb, vec3(0.5, 0.2, 0.05), step(abs(q.y - 1.0), 0.18) * 0.8);
    alb = mix(alb, vec3(0.2, 0.1, 0.05), smoothstep(0.6, 0.8, nz(q * 1.1 + 2.3)) * 0.7);
    sp = 0.25;
  }
  else {                // контейнеры: цвет зависит от варианта
    int ci = int(mod(m - 17.0 + gV, 4.0));
    vec3 base = ci == 0 ? vec3(0.30, 0.12, 0.05) : ci == 1 ? vec3(0.07, 0.13, 0.19) : ci == 2 ? vec3(0.15, 0.17, 0.09) : vec3(0.33, 0.32, 0.29);
    float rib = 0.85 + 0.15 * step(0.0, sin(q.z * 9.0 + q.x * 9.0));
    alb = base * rib * (0.6 + 0.6 * nz(q * 0.5));
    alb = mix(alb, vec3(0.2, 0.09, 0.04), smoothstep(0.62, 0.8, nz(q * 0.9 + 1.7)) * 0.8);
    sp = 0.12;
  }
  if (gT > 12.5 && gT < 20.5 && gProg < 0.99){   // обгоревшие обломки (v6.6: 21–22 — здания)
    alb *= mix(0.22, 1.0, gProg);
    em += vec3(1.0, 0.3, 0.05) * (1.0 - gProg) * 1.6 * smoothstep(0.62, 0.78, nz(q * 0.9 + vec3(0.0, uTime * 0.05, 0.0)));
  }
  alb = mix(alb, vec3(1.0, 0.55, 0.2), gFl * 0.5);
  em += vec3(1.0, 0.45, 0.15) * gFl * 0.8;
}

void loadObj(int i, out vec3 O, out vec3 R, out vec3 Uu, out vec3 F){
  vec4 b1 = texelFetch(uObj, ivec2(1, i), 0), b2 = texelFetch(uObj, ivec2(2, i), 0);
  vec4 b3 = texelFetch(uObj, ivec2(3, i), 0), b4 = texelFetch(uObj, ivec2(4, i), 0), b5 = texelFetch(uObj, ivec2(5, i), 0);
  O = b1.xyz; Uu = b2.xyz; F = b3.xyz; R = normalize(cross(F, Uu));
  gT = b1.w; gTeam = b2.w; gPh = b3.w; gFl = b4.w; gTh = b5.x; gProg = b5.y; gV = b5.z; gM = b5.w;
  vec3 la = vec3(dot(b4.xyz, R), dot(b4.xyz, Uu), dot(b4.xyz, F));
  gYaw = atan(la.x, la.z); gPitch = asin(clamp(la.y, -1.0, 1.0));
}

void traceObjects(vec3 o, vec3 d, int seg, inout float bestT, inout vec3 bN, inout vec3 bA, inout vec3 bE, inout float bS, inout float bAO, inout int kind){
  int hitI = -1;
  float hitMid = 0.0; vec3 hitQ = vec3(0.0), hitN = vec3(0.0, 1.0, 0.0), hO, hR, hU, hF;
  for (int i = ZERO; i < 160; i++){
    if (i >= uNO) break;
    if (i == uMe && (seg == 0 || uSelf < 0.5)) continue;
    vec4 b0 = texelFetch(uObj, ivec2(0, i), 0);
    if (b0.w < 0.0 && seg == 0) continue;   // v6.5: юнит рисуется 3D-моделью (heavy65.js); сквозь портал — по-старому
    vec3 oc = o - b0.xyz;
    float bb = dot(oc, d);
    float h = bb*bb - (dot(oc, oc) - b0.w*b0.w);
    if (h < 0.0) continue;
    h = sqrt(h);
    float t0 = max(-bb - h, 0.0), t1 = min(-bb + h, bestT);
    if (t1 <= t0) continue;
    vec3 O, R, Uu, F;
    loadObj(i, O, R, Uu, F);
    vec3 po = o - O;
    vec3 lo = vec3(dot(po, R), dot(po, Uu), dot(po, F)), ld = vec3(dot(d, R), dot(d, Uu), dot(d, F));
    // один вызов objMap на итерацию: сначала марш, после попадания — 4 пробы нормали и материал
    float t = t0, hn = gT > 11.5 ? 0.01 : 0.004;
    int mode = 0;
    vec3 q = vec3(0.0), nq = vec3(0.0);
    for (int s = ZERO; s < 86; s++){
      vec3 e = vec3(0.0);
      if (mode > 0 && mode < 5) e = 0.5773 * (2.0 * vec3(float(((mode + 2) >> 1) & 1), float(((mode - 1) >> 1) & 1), float((mode - 1) & 1)) - 1.0);
      if (mode == 0) gTr = t;
      vec2 m = objMap(mode == 0 ? lo + ld * t : q + e * hn);
      if (mode == 0){
        if (m.x < 0.0015 + t * 0.0005){ q = lo + ld * t; bestT = t; hitI = i; mode = 1; nq = vec3(0.0); continue; }
        t += m.x * 0.9;
        if (t > t1) break;
      } else if (mode < 5){ nq += e * m.x; mode++; }
      else { hitMid = m.y; hitQ = q; hitN = normalize(R * nq.x + Uu * nq.y + F * nq.z); mode = 6; break; }
    }
    if (mode > 0 && mode < 6){ hitQ = q; hitN = -d; hitMid = 1.0; }   // не успели досчитать нормаль
  }
  if (hitI < 0) return;
  loadObj(hitI, hO, hR, hU, hF);   // вернуть параметры объекта, в который попали
  vec3 q = hitQ;
  kind = 2;
  bN = hitN;
  objMaterial(hitMid, q, bA, bE, bS);
  if (gT < 5.5 && gT > 0.5 && (gT < 1.5 || gT > 2.5)){
    // контурный свет по команде: свои — холодный, враги — красный (легче различать)
    float rim = pow(1.0 - clamp(dot(bN, -d), 0.0, 1.0), 2.5);
    bE += (gTeam < 0.5 ? vec3(0.30, 0.48, 0.62) * 0.35 : vec3(1.0, 0.10, 0.05) * 0.55) * rim;
  }
  bAO = gT < 2.5 ? mix(0.45, 1.0, smoothstep(0.0, 1.1, q.y)) : (gT > 5.5 ? mix(0.45, 1.0, smoothstep(-0.5, 2.2, q.y)) : 0.9);
}

// ---------------------------------------------------------------- частицы
vec3 parColor(float ty){
  if (ty < 0.5) return vec3(0.75, 1.15, 1.9) * 1.7;   // трассер Консорциума
  if (ty < 1.5) return vec3(2.2, 0.28, 0.12) * 1.3;   // трассер Роя
  if (ty < 2.5) return vec3(2.0, 1.2, 0.5);           // искра
  if (ty < 3.5) return vec3(2.6, 1.5, 0.6) * 1.5;     // снаряд танка / ракета
  if (ty < 4.5) return vec3(0.4, 1.2, 2.0);           // луч строителя
  if (ty < 5.5) return vec3(2.2, 1.7, 0.8);           // зенитка
  if (ty < 6.5) return vec3(0.8, 2.2, 4.5) * 2.2;     // рельсотрон
  if (ty < 7.5) return vec3(4.0, 3.4, 6.5) * 3.0;     // орбитальный луч
  if (ty < 8.5) return vec3(4.0, 0.25, 0.12) * 2.0;   // лазер целеуказания
  return vec3(0.4, 2.4, 0.8);                         // ремонт
}
float hitSphere(vec3 o, vec3 d, vec3 c, float r){
  vec3 oc = o - c; float b = dot(oc, d); float h = b*b - (dot(oc, oc) - r*r);
  if (h < 0.0) return -1.0;
  return -b - sqrt(h);
}
float hitCapsule(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float ra){
  vec3 ba = pb - pa, oa = ro - pa;
  float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
  float a = baba - bard*bard, b = baba*rdoa - baoa*bard, c = baba*oaoa - baoa*baoa - ra*ra*baba;
  float h = b*b - a*c;
  if (h >= 0.0){
    float t = (-b - sqrt(h)) / a;
    float y = baoa + t*bard;
    if (y > 0.0 && y < baba) return t;
    vec3 oc = (y <= 0.0) ? oa : ro - pb;
    b = dot(rd, oc); c = dot(oc, oc) - ra*ra; h = b*b - c;
    if (h > 0.0) return -b - sqrt(h);
  }
  return -1.0;
}
void traceParticles(vec3 o, vec3 d, inout float bestT, inout vec3 bE, inout int kind){
  for (int i = ZERO; i < 160; i++){
    if (i >= uNP) break;
    vec4 b = texelFetch(uPar, ivec2(1, i), 0);
    if (b.w > 9.5 && b.w < 11.5) continue;
    vec4 a = texelFetch(uPar, ivec2(0, i), 0);
    float rr = max(a.w, length(a.xyz - o) * 0.0012);
    float t = hitCapsule(o, d, a.xyz, b.xyz, rr);
    // v7.2gfx: тип 12+f — обломок породы (тёмный, с тлеющей кромкой f = жар 0..1)
    if (t > 0.0 && t < bestT){ bestT = t; bE = b.w > 11.5 ? vec3(0.018, 0.016, 0.014) + vec3(3.0, 0.9, 0.2) * fract(b.w) * fract(b.w) : parColor(b.w); kind = 3; }
  }
}
vec3 tracerGlow(vec3 o, vec3 d, float tMax){
  vec3 g = vec3(0.0);
  for (int i = ZERO; i < 160; i++){
    if (i >= uNP) break;
    vec4 b = texelFetch(uPar, ivec2(1, i), 0);
    if (b.w > 8.5 || (b.w > 1.5 && b.w < 2.5)) continue;
    vec4 a = texelFetch(uPar, ivec2(0, i), 0);
    vec3 ba = b.xyz - a.xyz;
    float wide = b.w > 6.5 && b.w < 7.5 ? 30.0 * a.w : (b.w > 5.5 && b.w < 6.5 ? 4.0 : 1.0);
    float ba2 = max(dot(ba, ba), 1e-4);
    float t = max(dot(a.xyz + ba * 0.5 - o, d), 0.0);
    float s = clamp(dot(o + d * t - a.xyz, ba) / ba2, 0.0, 1.0);
    t = max(dot(a.xyz + ba * s - o, d), 0.0);
    if (t > tMax) continue;
    float dist = length(o + d * t - (a.xyz + ba * s));
    float w = (0.12 + t * 0.004) * wide;
    g += parColor(b.w) * 0.07 * exp(-dist * dist / (w * w)) * (wide > 2.0 ? 0.5 : 1.0);
  }
  return g;
}
// объёмные частицы: дым и огненные шары
vec4 volumes(vec3 o, vec3 d, float tMax){
  vec3 add = vec3(0.0); float T = 1.0;
  for (int i = ZERO; i < 160; i++){
    if (i >= uNP) break;
    vec4 b = texelFetch(uPar, ivec2(1, i), 0);
    if (b.w < 9.5) continue;
    vec4 a = texelFetch(uPar, ivec2(0, i), 0);
    vec3 c = a.xyz; float r = a.w;
    vec3 oc = o - c; float bb = dot(oc, d); float h = bb*bb - (dot(oc, oc) - r*r);
    if (h <= 0.0) continue;
    h = sqrt(h);
    float t0 = max(-bb - h, 0.0), t1 = min(-bb + h, tMax);
    if (t1 <= t0) continue;
    float L = t1 - t0;
    float dist2 = max(dot(oc, oc) - bb*bb, 0.0);
    float prof = max(1.0 - dist2 / (r*r), 0.0);
    vec3 mp = o + d * clamp(-bb, t0, t1);
    float nn = nz(mp * 0.06 + vec3(0.0, uTime * 0.04, float(i) * 0.137));
    if (b.w > 11.5) continue;   // v7.2gfx: обломки — не объём
    if (uG72 > 0.5){   // v7.2gfx: клубящийся огонь с горячим ядром и копотью, дым с освещённой и теневой стороной
      float n2 = fbm3(mp * (0.55 / max(r, 0.6)) + vec3(0.0, -uTime * 0.35, float(i) * 0.21));
      if (b.w < 10.5){
        float age = b.x;
        float hot = clamp(prof * 1.25 - age * 0.9 + (n2 - 0.5) * 0.7, 0.0, 1.0);
        vec3 fc = mix(vec3(0.9, 0.18, 0.03), vec3(7.5, 4.2, 1.6), hot) * (1.0 - age) * b.y;
        fc += vec3(3.4, 2.7, 1.8) * pow(hot, 3.0) * (1.0 - age) * (1.0 - age) * b.y;
        float tau = L / r * prof * (0.25 + 1.6 * n2) * 1.9;
        float al = 1.0 - exp(-tau);
        add += T * fc * al; T *= 1.0 - al * mix(0.85, 0.35, hot);
      } else {
        vec3 up = c / max(length(c), 1.0);
        vec3 nrm = normalize(mp - c + up * r * 0.3);
        vec3 sunl = C1 * max(dot(up, SUN1), 0.0) * (0.35 + 0.65 * max(dot(nrm, SUN1), 0.0)) + C2 * max(dot(up, SUN2), 0.0) * (0.35 + 0.65 * max(dot(nrm, SUN2), 0.0));
        float under = clamp(0.5 - 0.5 * dot(nrm, up), 0.0, 1.0);
        vec3 sc = vec3(b.y) * (vec3(0.03) + sunl * 0.2) * (0.75 + 0.5 * n2) + b.z * vec3(1.4, 0.5, 0.12) * (0.4 + under);
        float tau = L / r * prof * b.x * (0.1 + 1.6 * n2 * n2 + 0.3 * nn);
        float al = 1.0 - exp(-tau);
        add += T * sc * al; T *= 1.0 - al;
      }
      continue;
    }
    if (b.w < 10.5){
      float age = b.x;
      vec3 fc = mix(vec3(7.0, 3.6, 1.3), vec3(1.8, 0.4, 0.08), smoothstep(0.0, 0.55, age)) * (1.0 - age) * b.y;
      float tau = L / r * prof * (0.5 + 1.0 * nn) * 1.6;
      float al = 1.0 - exp(-tau);
      add += T * fc * al; T *= 1.0 - al * 0.45;
    } else {
      vec3 up = c / max(length(c), 1.0);
      vec3 sunl = C1 * max(dot(up, SUN1), 0.0) + C2 * max(dot(up, SUN2), 0.0);
      vec3 sc = vec3(b.y) * (vec3(0.035) + sunl * 0.22) + b.z * vec3(1.2, 0.5, 0.15);
      float tau = L / r * prof * b.x * (0.25 + 1.3 * nn);
      float al = 1.0 - exp(-tau);
      add += T * sc * al; T *= 1.0 - al;
    }
  }
  return vec4(add, T);
}
vec3 lightGlow(vec3 o, vec3 d, float tMax){
  vec3 g = vec3(0.0);
  for (int i = ZERO; i < 16; i++){
    if (i >= uNL) break;
    if (uLC[i].w <= 0.0) continue;
    vec3 w = o - uLP[i].xyz;
    float b = dot(w, d);
    float h = sqrt(max(dot(w, w) - b*b, 0.09));
    float a0 = atan(b / h), a1 = atan((tMax + b) / h);
    g += uLC[i].rgb * uLC[i].w * (a1 - a0) / h;
  }
  return g;
}

// ---------------------------------------------------------------- освещение
float sphSoftShadow(vec3 ro, vec3 rd, vec4 sph){
  vec3 oc = ro - sph.xyz;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - sph.w*sph.w;
  float h = b*b - c;
  float d = sqrt(max(0.0, sph.w*sph.w - h)) - sph.w;
  float t = -b - sqrt(max(h, 0.0));
  return (t < 0.0) ? 1.0 : smoothstep(0.0, 1.0, 2.5 * 4.0 * d / t);
}
float shadow(vec3 p, vec3 l){
  float res = 1.0;
  if (uQ > 0){
    float t = 0.25;
    int N = uQ > 1 ? 44 : 26;
    gDetail = 0.0;
    for (int i = ZERO; i < 44; i++){
      if (i >= N) break;
      float h = map(p + l * t).x;
      res = min(res, 9.0 * h / t);
      t += clamp(h, 0.3, 9.0);
      if (res < 0.01 || t > 110.0) break;
    }
    gDetail = 1.0;
    res = clamp(res, 0.0, 1.0);
  }
  for (int i = ZERO; i < 160; i++){
    if (i >= uNO) break;
    if (res < 0.02) break;
    vec4 s6 = texelFetch(uObj, ivec2(6, i), 0);
    if (s6.w <= 0.0) continue;
    vec3 dc = s6.xyz - p;
    if (dot(dc, dc) > 3600.0) continue;
    res = min(res, sphSoftShadow(p, l, s6));
  }
  return res * res * (3.0 - 2.0 * res);
}
float calcAO(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for (int i = ZERO; i < 4; i++){
    float h = 0.15 + 0.55 * float(i);
    float d = map(p + n * h).x;
    occ += (h - d) * sca; sca *= 0.72;
  }
  return clamp(1.0 - 0.4 * occ, 0.0, 1.0);
}
vec3 pointLights(vec3 p, vec3 n, vec3 v, vec3 alb, float sp){
  vec3 col = vec3(0.0);
  for (int i = ZERO; i < 16; i++){
    if (i >= uNL) break;
    vec3 lv = uLP[i].xyz - p;
    float dd = dot(lv, lv), rr = uLP[i].w;
    if (dd > rr * rr) continue;
    float dist = sqrt(dd); lv /= dist;
    float f = 1.0 - dist / rr;
    float att = f * f / (1.0 + dd * 0.04);
    float nl = max(dot(n, lv), 0.0);
    col += uLC[i].rgb * att * (alb * nl + sp * pow(max(dot(n, normalize(lv + v)), 0.0), 30.0) * 0.5);
    if (uDen.x > 0.5){   // v7.5 «Денди»: свет ступенями (поправка к обычному свету — сам обычный не меняется)
      float sq = pow(max(dot(n, normalize(lv + v)), 0.0), 30.0);
      col += uLC[i].rgb * (alb * (floor(att * nl * 4.0 + 0.5) * 0.25 - att * nl) + att * sp * (step(0.6, sq) - sq) * 0.5);
    }
  }
  return col;
}
vec3 shade(vec3 p, vec3 n, vec3 v, vec3 alb, float sp, float ao, float shOverride){
  vec3 up = normalize(p);
  float d1 = dot(n, SUN1);
  vec3 L = d1 > 0.0 ? SUN1 : SUN2;
  vec3 LC = d1 > 0.0 ? C1 : C2;
  float dl = abs(d1);
  float sh = smoothstep(-0.1, 0.05, dot(up, L));
  if (shOverride >= 0.0) sh *= shOverride;
  else if (sh > 0.01) sh *= shadow(p + n * 0.04, L);
  vec3 h = normalize(L + v);
  vec3 col = LC * dl * sh * (alb + sp * pow(max(dot(n, h), 0.0), 48.0) * 0.7);
  if (uDen.x > 0.5){   // v7.5 «Денди»: солнце в 3 ступени (тень / полутон / свет), жёсткий блик
    float lk = dl * sh;
    lk = lk < 0.12 ? 0.0 : (lk < 0.5 ? uDen.y : uDen.z);
    col = LC * lk * (alb + sp * step(0.55, pow(max(dot(n, h), 0.0), 48.0)) * 0.7);
  }
  float hemi = 0.5 + 0.5 * dot(n, up);
  // рассеянный: тёплый/холодный отражённый свет от освещённой стороны метеорита
  float side = dot(up, SUN1);
  vec3 bounce = mix(C2, C1, 0.5 + 0.5 * side) * 0.012;
  vec3 amb = mix(vec3(0.016, 0.015, 0.014), vec3(0.03, 0.036, 0.05), hemi) + bounce * (1.0 - hemi * 0.5);
  col += alb * ao * amb;
  if (uDen.x > 0.5) col += alb * ao * amb * uDen.w;   // v7.5: в тени не чёрная дыра (после 3 ступеней света)
  col += pointLights(p, n, v, alb, sp);
  float cd = length(p - uCam);
  col += alb * uLamp * max(dot(n, v), 0.0) * vec3(1.0, 0.96, 0.9) * 0.3 * exp(-cd * 0.04);
  if (uG72 > 0.5){   // v7.2gfx: в шахтах — холодный отражённый свет от световых колец (не чёрная дыра)
    float rp = length(p);
    float shf = step(min(length(p.yz), length(p.xy)), TUN_R + 3.0) * smoothstep(RM - 6.0, RM - 26.0, rp) * step(CORE_R, rp);
    col += alb * ao * vec3(0.13, 0.21, 0.34) * shf * (0.6 + 0.4 * hemi);
  }
  return col;
}

// небо-портал: вместо сетки колец — голографическое «полярное сияние» с мерцанием граней
vec3 portalGlow(vec3 P, vec3 d){
  vec3 n = P / uR;
  float tt = uTime * 0.035;
  // медленно текущие «занавеси»
  vec3 q = n * 1.35 + vec3(tt, -tt * 0.6, tt * 0.45);
  float w = fbm3(q * 0.55);
  float band = 0.5 + 0.5 * sin((n.y * 3.2 + n.x * 1.1 - n.z * 0.8 + w * 5.0) * 3.14159 + uTime * 0.1);
  float veil = fbm3(q * 1.7 + vec3(0.0, uTime * 0.01, 0.0));
  float curtain = pow(band, 5.0) * smoothstep(0.3, 0.75, veil);
  // вертикальные лучи-штрихи внутри занавеса
  float rays = 0.6 + 0.4 * sin(dot(n, vec3(57.0, 13.0, 41.0)) + w * 22.0 + uTime * 0.5);
  // голографическая сетка: едва заметные шестиугольные грани под скользящим углом
  vec2 h = vec2(atan(n.z, n.x) * 9.0, asin(clamp(n.y, -1.0, 1.0)) * 9.0);
  vec2 hc = abs(fract(h + vec2(0.5 * floor(h.y), 0.0)) - 0.5);
  float hex = smoothstep(0.47, 0.5, max(hc.x * 1.15 + hc.y * 0.6, hc.y * 1.2));
  float fres = pow(1.0 - abs(dot(d, n)), 3.0);
  float hue = nz(n * 0.9 + vec3(3.1, tt * 0.5, 1.7));
  vec3 cA = vec3(0.15, 1.0, 0.65), cB = vec3(0.45, 0.35, 1.0), cC = vec3(1.0, 0.45, 0.2);
  vec3 col = mix(cA, cB, smoothstep(0.35, 0.65, hue));
  col = mix(col, cC, smoothstep(0.72, 0.85, hue) * 0.6);
  float shimmer = 0.75 + 0.25 * sin(uTime * 1.7 + w * 12.0);
  float k = curtain * rays * 0.045 + 0.0015 + hex * fres * 0.012 * shimmer + fres * 0.006 * w;
  return col * k * uGrid;
}

// ---------------------------------------------------------------- оружие в руках
float vmWeapon(){ return floor(uVM2.y + 0.001); }
float vmReload(){ return fract(uVM2.y + 0.001) / 0.9; }
vec3 vmOff(){
  float bob = uVM.y, mv = uVM2.w, ads = uVM3.x, low = uVM3.y;
  float rl = sin(clamp(vmReload(), 0.0, 1.0) * 3.14159);
  vec3 hip = vec3(0.19 + sin(bob) * 0.008 * mv, -0.185 - abs(cos(bob)) * 0.01 * mv + uVM.z * 0.012 - rl * 0.09, 0.50 - uVM.z * 0.06);
  vec3 aim = vec3(0.0, -0.132 + uVM.z * 0.004 - rl * 0.09, 0.42 - uVM.z * 0.045);
  vec3 o = mix(hip, aim, ads);
  o.y -= low * 0.3; o.x += low * 0.06;
  return o;
}
vec2 vmSDF(vec3 g){
  vec2 r = vec2(1e5, 0.0);
  float w = vmWeapon();
  if (w > 1.5 && w < 2.5){
    // рельсотрон: длинный ствол с катушками
    U(r, sdRBox(g - vec3(0.0, 0.0, 0.0), vec3(0.036, 0.05, 0.19), 0.014), 5.0);
    U(r, sdRBox(g - vec3(0.0, -0.005, -0.25), vec3(0.028, 0.045, 0.09), 0.012), 3.0);
    vec3 b = g - vec3(0.0, 0.012, 0.38);
    U(r, sdBox(vec3(abs(b.x) - 0.022, b.y, b.z), vec3(0.008, 0.02, 0.22)), 1.0);
    vec3 cz = b; cz.z = mod(cz.z + 0.05, 0.1) - 0.05;
    U(r, max(sdTorusY(vec3(cz.x, cz.z, cz.y), 0.034, 0.009), abs(b.z) - 0.2), 10.0);
    U(r, sdRBox(g - vec3(0.0, 0.085, 0.05), vec3(0.016, 0.02, 0.09), 0.006), 3.0);
    U(r, sdCylZ(g - vec3(0.0, 0.085, 0.15), 0.017, 0.006), 4.0);
  } else if (w > 2.5){
    // тяжёлый пулемёт: кожух ствола и короб
    U(r, sdRBox(g - vec3(0.0, 0.0, 0.0), vec3(0.042, 0.055, 0.17), 0.014), 5.0);
    U(r, sdCylZ(g - vec3(0.0, 0.005, 0.33), 0.034, 0.16), 3.0);
    vec3 h = g - vec3(0.0, 0.005, 0.33); h.z = mod(h.z + 0.025, 0.05) - 0.025;
    U(r, max(sdCylZ(h, 0.038, 0.006), abs(g.z - 0.33) - 0.15), 1.0);
    U(r, sdCylZ(g - vec3(0.0, 0.005, 0.5), 0.014, 0.04), 5.0);
    U(r, sdRBox(g - vec3(-0.06, -0.06, 0.04), vec3(0.03, 0.06, 0.07), 0.012), 2.0);
    U(r, sdRBox(g - vec3(0.0, -0.005, -0.23), vec3(0.03, 0.05, 0.09), 0.012), 3.0);
  } else {
    U(r, sdRBox(g - vec3(0.0, 0.0, 0.02), vec3(0.032, 0.047, 0.17), 0.012), 5.0);
    U(r, sdRBox(g - vec3(0.0, 0.018, 0.0), vec3(0.034, 0.02, 0.12), 0.008), 1.0);
    U(r, sdRBox(g - vec3(0.0, -0.005, -0.23), vec3(0.026, 0.043, 0.09), 0.012), 3.0);
    U(r, sdRBox(g - vec3(0.0, 0.006, 0.29), vec3(0.029, 0.033, 0.12), 0.01), 1.0);
    U(r, sdCylZ(g - vec3(0.0, 0.01, 0.47), 0.012, 0.07), 5.0);
    vec3 mg = g - vec3(0.0, -0.1, 0.07); mg.zy = r2(mg.zy, 0.25);
    U(r, sdRBox(mg, vec3(0.022, 0.06, 0.032), 0.008), 3.0);
    U(r, sdRBox(g - vec3(0.0, 0.08, 0.03), vec3(0.02, 0.022, 0.07), 0.008), 3.0);
    U(r, sdCylZ(g - vec3(0.0, 0.08, 0.10), 0.014, 0.004), 4.0);
    if (w > 0.5) U(r, sdBox(vec3(abs(g.x) - 0.035, g.y - 0.015, g.z - 0.05), vec3(0.002, 0.006, 0.11)), 10.0);
  }
  U(r, sdRBox(g - vec3(-0.005, -0.055, 0.25), vec3(0.04, 0.03, 0.055), 0.015), 2.0);
  U(r, sdCapsule(g, vec3(-0.03, -0.07, 0.25), vec3(-0.15, -0.21, 0.04), 0.036), 1.0);
  U(r, sdRBox(g - vec3(0.0, -0.06, -0.06), vec3(0.035, 0.035, 0.045), 0.015), 2.0);
  U(r, sdCapsule(g, vec3(0.02, -0.08, -0.08), vec3(0.09, -0.21, -0.26), 0.042), 1.0);
  return r;
}
vec3 toGun(vec3 c){   // камера (-z вперёд) -> система оружия (+z вперёд)
  vec3 g = vec3(c.x, c.y, -c.z) - vmOff();
  g.zy = r2(g.zy - vec2(-0.1, 0.0), uVM.z * 0.08 * (1.0 - 0.6 * uVM3.x) + sin(clamp(vmReload(), 0.0, 1.0) * 3.14159) * 0.5 + uVM3.y * 0.7) + vec2(-0.1, 0.0);
  return g;
}
vec4 viewModel(vec3 dc, out vec3 nW){
  nW = vec3(0.0);
  float t = 0.12;
  for (int i = ZERO; i < 48; i++){
    vec2 m = vmSDF(toGun(dc * t));
    if (m.x < 0.0004){
      vec3 g = toGun(dc * t);
      vec3 ng = vec3(0.0);
      for (int k = ZERO; k < 4; k++){
        vec3 e = 0.5773 * (2.0 * vec3(float(((k + 3) >> 1) & 1), float((k >> 1) & 1), float(k & 1)) - 1.0);
        ng += e * vmSDF(g + e * 0.0007).x;
      }
      ng = normalize(ng);
      vec3 nc = vec3(ng.x, ng.y, -ng.z);
      nW = normalize(uRot * nc);
      return vec4(t, m.y, 0.0, 1.0);
    }
    t += m.x;
    if (t > 0.95) break;
  }
  return vec4(0.0);
}

// ---------------------------------------------------------------- главный цикл
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 dc = normalize(vec3(uv * uFov, -1.0));
  vec3 d = normalize(uRot * dc);
  vec3 o = uCam;

  if (uVM.x > 0.5 && uv.x > -0.1 - uVM3.x * 0.2 && uv.y < 0.15){
    vec3 nW;
    vec4 vm = viewModel(dc, nW);
    if (vm.w > 0.0){
      gTeam = uVM2.x; gFl = 0.0; gTh = 0.0; gProg = 1.0;
      vec3 alb, em; float sp;
      objMaterial(vm.y, toGun(dc * vm.x) * 3.0, alb, em, sp);
      vec3 p = o + d * vm.x;
      vec3 c = shade(p, nW, -d, alb, sp, 0.85, uVM2.z) + em;
      c += vec3(2.4, 1.6, 0.8) * uVM.w * 0.25 * max(dot(nW, normalize(uRot * vec3(0.0, 0.0, -1.0))), 0.0);
      frag = vec4(c, 1.0);
      gl_FragDepth = 0.0;
      return;
    }
  }

  float total = 0.0;
  float tPrim = 1e6;   // v6.5: дальность первого отрезка луча -> буфер глубины для 3D-моделей
  vec3 acc = vec3(0.0), thr = vec3(1.0), pend = vec3(0.0);
  bool done = false;
  for (int b = ZERO; b < 16; b++){
    if (b > uBounces) break;
    float B = dot(o, d);
    float C = dot(o, o) - uR * uR;
    float tExit = -B + sqrt(max(B*B - C, 0.0));
    float bestT = tExit;
    vec3 bN = vec3(0.0), bA = vec3(0.0), bE = vec3(0.0); float bS = 0.0, bAO = 1.0, mat = 0.0;
    int kind = 0;   // 1 рельеф, 2 объект, 3 светящаяся частица

    float hb = B*B - (dot(o, o) - BOUND*BOUND);
    if (hb > 0.0){
      float s = sqrt(hb);
      float t = max(-B - s, 0.0);
      float t1 = min(-B + s, tExit);
      for (int i = ZERO; i < 220; i++){
        if (t > t1) break;
        vec3 p = o + d * t;
        vec2 r = map(p);
        if (r.x < 0.003 * (1.0 + t * 0.03) || i == 219){ bestT = t; mat = r.y; kind = 1; break; }
        t += r.x * (r.x > 3.0 ? 0.85 : 0.62);
      }
    }
    traceObjects(o, d, b, bestT, bN, bA, bE, bS, bAO, kind);
    traceParticles(o, d, bestT, bE, kind);
    if (b == 0) tPrim = bestT;

    // сияние купола, сквозь которое видна земля антипода, приглушаем — иначе оно похоже на светящиеся дороги
    acc += pend * (kind == 1 ? 0.3 : 1.0); pend = vec3(0.0);
    vec4 vol = volumes(o, d, bestT);
    vec3 gl = lightGlow(o, d, bestT) + tracerGlow(o, d, bestT);
    float fseg = exp(-total * fogK());
    acc += thr * (vol.rgb + gl) * fseg;
    thr *= vol.a;

    if (kind > 0){
      vec3 p = o + d * bestT;
      total += bestT;
      vec3 c;
      if (kind == 3) c = bE;
      else {
        if (kind == 1){
          bN = calcNormal(p);
          gDist = bestT;
          material(mat, p, bN, bA, bE, bS);
          if (bestT < 60.0 && gBump > 0.01){
            vec3 bp = p * (1.0 / 14.0);
            float b0 = nz(bp);
            vec3 gr = vec3(nz(bp + vec3(0.012, 0.0, 0.0)), nz(bp + vec3(0.0, 0.012, 0.0)), nz(bp + vec3(0.0, 0.0, 0.012))) - b0;
            bN = normalize(bN - gr * 5.0 * gBump * (1.0 - bestT / 60.0));
          }
          bAO = uQ > 0 ? calcAO(p, bN) : 1.0;
        }
        c = shade(p, bN, -d, bA, bS, bAO, -1.0) + bE;
      }
      if (uG72 > 0.5 && b == 0){   // v7.2gfx: высотная пылевая дымка, подсвеченная солнцами (воздушная перспектива; только прямой луч)
        float h0 = length(o) - RM, h1 = length(p) - RM;
        float hz = 0.55 * exp(-max(min(h0, h1), 0.0) / 22.0) + 0.45 * exp(-max(0.5 * (h0 + h1), 0.0) / 22.0);
        float sky = clamp((h1 + 14.0) / 14.0, 0.0, 1.0);
        vec3 up = p / length(p);
        vec3 sunl = C1 * max(dot(up, SUN1) + 0.15, 0.0) + C2 * max(dot(up, SUN2) + 0.15, 0.0);
        vec3 hc = vec3(0.5, 0.46, 0.4) * sunl * (0.05 + 0.08 * pow(max(dot(d, SUN1), 0.0), 6.0) + 0.05 * pow(max(dot(d, SUN2), 0.0), 6.0));
        hc = mix(vec3(0.012, 0.012, 0.016), hc, sky);
        float fk = fogK() + 0.0045 * hz * (0.35 + 0.65 * sky);
        float tr = exp(-bestT * fk) * exp(-(total - bestT) * fogK());
        acc += thr * mix(mix(fogCol(d), hc, hz), c, tr);
      } else
      acc += thr * mix(fogCol(d), c, exp(-total * fogK()));
      done = true;
      break;
    }
    vec3 P = o + d * tExit;
    total += tExit;
    pend = thr * portalGlow(P, d) * exp(-total * 0.0006);
    if (uG72 > 0.5) pend += thr * vec3(0.06, 0.2, 0.17) * pow(1.0 - abs(dot(d, P / uR)), 5.0) * 0.05 * uGrid * (0.8 + 0.4 * nz(P * 0.004 + uTime * 0.01));   // v7.2gfx: дымка шва портала
    thr *= vec3(0.88, 0.92, 0.97);
    o = -P + d * 0.01;
  }
  if (!done) acc += thr * fogCol(d) + pend;

  // вспышка выстрела у ствола
  if (uVM.x > 0.5 && uVM.w > 0.0){
    vec3 g0 = vmOff() + vec3(0.0, 0.01, 0.56);
    vec3 tip = normalize(vec3(g0.x, g0.y, -g0.z));
    float a = acos(clamp(dot(dc, tip), -1.0, 1.0));
    vec2 rel = (dc.xy / -dc.z) - (tip.xy / -tip.z);
    float star = 1.0 + 1.5 * pow(abs(cos(atan(rel.y, rel.x) * 2.0 + uTime * 40.0)), 8.0);
    acc += vec3(3.0, 1.9, 0.9) * uVM.w * exp(-a * a / (0.0016 * star));
  }
  frag = vec4(acc, 1.0);
  // v6.5: логарифмическая глубина (та же формула в heavy65.js): z вдоль оси камеры, 0.05 … 20000 м
  gl_FragDepth = clamp(log(max(tPrim * -dc.z, 0.05) / 0.05) / log(400000.0), 0.0, 1.0);
}
