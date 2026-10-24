#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2  uRes;
uniform float uTime;
uniform float uExpo;
uniform float uFlash;    // белая вспышка при проходе портала
uniform float uDmg;      // оранжевая виньетка урона
uniform float uVhs;      // режим «VHS»
uniform float uBloom;
uniform vec4  uWave[8];  // ударные волны: xy центр (uv), z радиус (в долях высоты), w сила
uniform int   uNW;
uniform vec4  uTrc[8];   // трассеры у камеры: отрезки в uv
uniform int   uNT;
uniform float uSlow;     // рефлекс (замедление времени)
uniform float uDist;     // искажения вкл/выкл
uniform float uXfer;     // v6: «передача сигнала» при перелёте камеры между бойцами
uniform float uG72;      // v7.2gfx: новая пост-обработка (0 — как в v7.1)
uniform float uDen;      // v7.5 «Денди»: без зерна плёнки (иначе пиксели палитры мерцают каждый кадр)
out vec4 frag;

vec3 aces(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 blurLod(vec2 uv, float lod){
  vec2 px = exp2(lod) / uRes;
  vec3 s = textureLod(uTex, uv, lod).rgb * 0.4;
  s += textureLod(uTex, uv + vec2( px.x, 0.0), lod).rgb * 0.15;
  s += textureLod(uTex, uv + vec2(-px.x, 0.0), lod).rgb * 0.15;
  s += textureLod(uTex, uv + vec2(0.0,  px.y), lod).rgb * 0.15;
  s += textureLod(uTex, uv + vec2(0.0, -px.y), lod).rgb * 0.15;
  return s;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  if (uVhs > 0.5){
    float line = floor(uv.y * uRes.y * 0.5);
    uv.x += (hash(vec2(line, floor(uTime * 24.0))) - 0.5) * 0.0025;
  }
  if (uXfer > 0.0){
    // срыв строк: полосы сдвигаются рывками
    float band = floor(uv.y * 38.0 + floor(uTime * 15.0) * 7.0);
    float jit = step(0.72, hash(vec2(band, floor(uTime * 20.0))));
    uv.x += (hash(vec2(band * 1.7, floor(uTime * 30.0))) - 0.5) * 0.06 * jit * uXfer;
  }
  // ---- искажение пространства (как в F.E.A.R.): ударная волна-линза и марево трассеров
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 off = vec2(0.0);
  float ring = 0.0;
  if (uDist > 0.5){
    vec2 p = uv * asp;
    for (int i = 0; i < 8; i++){
      if (i >= uNW) break;
      vec4 w = uWave[i];
      vec2 dv = p - w.xy * asp;
      float d = length(dv);
      float r = w.z;
      float width = 0.22 * r + 0.012;
      float x = (d - r) / width;
      float shell = exp(-x * x);
      float inside = 1.0 - smoothstep(0.0, r + 1e-4, d);
      vec2 dir = d > 1e-5 ? dv / d : vec2(0.0);
      // фронт волны толкает изображение наружу, внутри — лёгкая линза
      off += dir * (shell * 0.03 - inside * 0.25 * d * 0.5) * w.w;
      ring += shell * w.w;
    }
    for (int i = 0; i < 8; i++){
      if (i >= uNT) break;
      vec4 t = uTrc[i];
      vec2 a = t.xy * asp, b = t.zw * asp;
      vec2 ba = b - a;
      float h = clamp(dot(p - a, ba) / max(dot(ba, ba), 1e-7), 0.0, 1.0);
      vec2 q = p - (a + ba * h);
      float dd = length(q);
      float k = exp(-dd * dd / 0.00009);
      off += (dd > 1e-6 ? q / dd : vec2(0.0)) * k * 0.0035 * sin(dd * 1400.0 - uTime * 50.0);
    }
    off = clamp(off, vec2(-0.06), vec2(0.06)) / asp;
  }
  vec2 cc = uv - 0.5;
  float ca = dot(cc, cc) * (0.012 + uSlow * 0.03) + ring * 0.004 + uXfer * 0.035;
  vec2 u2 = uv + off;
  vec3 col;
  col.r = texture(uTex, u2 - cc * ca + off * 0.35).r;
  col.g = texture(uTex, u2).g;
  col.b = texture(uTex, u2 + cc * ca - off * 0.35).b;
  // рефлекс: радиальное размытие
  if (uSlow > 0.01){
    vec3 acc = col;
    for (int k = 1; k < 5; k++){ acc += texture(uTex, u2 - cc * 0.012 * float(k) * uSlow).rgb; }
    col = mix(col, acc / 5.0, uSlow * 0.7);
  }

  vec3 bl = blurLod(u2, 1.5) * 0.18 + blurLod(u2, 3.0) * 0.26 + blurLod(u2, 4.5) * 0.30 + blurLod(u2, 6.0) * 0.26;
  col += max(bl - vec3(0.18), 0.0) * (0.55 + 0.4 * uSlow) * uBloom;
  col += vec3(1.0, 0.85, 0.7) * ring * 0.035;
  if (uG72 > 0.75){
    // v7.2gfx: горизонтальный «анаморфный» блик от ярких источников и «грязь» на линзе в ореоле
    vec3 st = vec3(0.0);
    for (int k = -3; k <= 3; k++){ if (k == 0) continue; float fx = float(k) / 3.0; st += max(textureLod(uTex, u2 + vec2(fx * 0.09, 0.0), 4.0).rgb - vec3(1.6), 0.0) * (1.0 - abs(fx) * 0.8); }
    col += st * vec3(0.55, 0.75, 1.0) * 0.05 * uBloom;
    vec2 dq = uv * vec2(11.0, 6.5), di = floor(dq), df = smoothstep(0.0, 1.0, fract(dq));
    float dn = mix(mix(hash(di), hash(di + vec2(1.0, 0.0)), df.x), mix(hash(di + vec2(0.0, 1.0)), hash(di + vec2(1.0, 1.0)), df.x), df.y);
    float dirt = smoothstep(0.5, 0.95, dn * 0.7 + 0.3 * sin(uv.x * 9.0 + uv.y * 5.0) * sin(uv.y * 7.0));
    col += max(bl - vec3(0.3), 0.0) * dirt * 0.3 * uBloom;
  }

  col *= uExpo;
  col = aces(col);
  // цветокоррекция: холодные тени, тёплые света, чуть приглушённая насыщенность
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, col * vec3(0.92, 1.0, 1.1), (1.0 - lum) * 0.5);
  col = mix(col, col * vec3(1.06, 1.0, 0.93), lum * 0.4);
  col = mix(vec3(lum), col, 0.88 - 0.4 * uSlow);
  col = mix(col, col * vec3(1.08, 1.0, 0.86), uSlow * 0.6);
  col = pow(col, vec3(1.0 / 2.2));
  col = mix(col, smoothstep(0.0, 1.0, col), 0.25);
  if (uG72 > 0.25){
    // v7.2gfx: «военная плёнка» — тени в холодный сине-зелёный, света в беж/охру, поднятый чёрный, мягкое плечо
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, col * vec3(0.9, 1.0, 1.06) + vec3(0.0, 0.006, 0.012), smoothstep(0.45, 0.0, l) * 0.8);
    col = mix(col, col * vec3(1.05, 1.0, 0.9), smoothstep(0.35, 0.9, l) * 0.55);
    col = mix(vec3(l), col, 0.92);
    col = col * 0.965 + 0.022;
    // зерно плёнки: сильнее в тенях и полутонах, крупнее VHS-шума
    float gr = hash(floor(gl_FragCoord.xy * 0.7) + fract(uTime * 23.1) * 517.0) - 0.5;
    if (uDen < 0.5) col += gr * 0.05 * (1.0 - l * 0.7);
  }

  float vig = smoothstep(1.05, 0.3, length(cc * vec2(1.25, 1.0)));
  col *= mix(0.55 - 0.25 * uSlow, 1.0, vig);
  col += vec3(1.0, 0.35, 0.05) * uDmg * smoothstep(0.25, 0.8, length(cc * vec2(1.3, 1.0)));
  col = mix(col, vec3(1.0), uFlash);

  float g = hash(gl_FragCoord.xy + fract(uTime * 13.7) * 311.0) - 0.5;
  if (uDen < 0.5) col += g * (0.035 + uVhs * 0.05 + uSlow * 0.02);
  if (uVhs > 0.5) col *= 0.9 + 0.1 * sin(gl_FragCoord.y * 3.14159);
  if (uXfer > 0.0){
    float l2 = dot(col, vec3(0.3, 0.55, 0.15));
    col = mix(col, vec3(l2 * 0.75, l2 * 1.05, l2 * 1.2), uXfer * 0.55);           // холодный «сигнал»
    col *= 1.0 - uXfer * 0.3 * (0.5 + 0.5 * sin(gl_FragCoord.y * 1.6 + uTime * 40.0));   // строки развёртки
    col += (hash(gl_FragCoord.xy * 0.5 + fract(uTime * 7.3) * 97.0) - 0.5) * uXfer * 0.32; // статика
    col += vec3(0.25, 0.6, 0.8) * uXfer * 0.12 * step(0.985, hash(vec2(floor(uv.y * 90.0), floor(uTime * 25.0))));
  }
  frag = vec4(clamp(col, 0.0, 1.0), 1.0);
}
