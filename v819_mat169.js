// =====================================================================
//  v8.19 (T169) — МАТЕРИАЛЫ СТЕН ШТАБОВ И ПОСТРОЕК
//  Причина (Фитба 07.11: «графон примитивнейший»; карточка T131 «Бетон у базы»): штаб, к которому игрок
//  возвращается каждый бой, и постройки у баз — ровная заливка краской + крупный шум, «серые коробки».
//  Что здесь (всё в своём модуле; старые файлы — только помеченные строки: 2 в scene.glsl, 1 в v70_mesh.js,
//  1 в build.py):
//   1) штаб на полюсе (рэймарчер, материалы 2/3): бетонные панели со швами и стяжками опалубки, разнотон
//      панелей, подтёки грязи под кромками и под окнами, сколы краски на углах октагона, тёмный цоколь
//      у земли, плиты на площадке и крыше, жёлто-чёрные полосы на пилонах, огоньки на цветной полосе,
//      окна разбиты переплётами (часть горит тёплым светом);
//   2) металл маяков точек захвата и мачты штаба (материал 7): болтовые пояса, подтёки ржавчины,
//      жёлто-чёрное кольцо по краю диска маяка (читается и сверху, в стратегии);
//   3) постройки-объекты рэймарчера (завод, хаб, ангар, форпост, экстрактор, казарма, склады):
//      швы панелей по главной оси грани, разнотон, подтёки сверху, грязь снизу;
//   4) процедурные меши ST70/BOSS83 (доты, бункеры, плиты и турели штаба, цеха): то же в их шейдере —
//      краска панелями со сколами, бетон опалубкой, металл с потёртостями.
//  Всё затухает с дистанцией (дальше ~150 м — как было); на «низкой» графике — без мелочи (стяжки, огоньки).
//  Выкл.: ?mat169=0 (или localStorage pm_mat169=0). Консоль: MAT169.info().
//  Безопасность: если шейдер с вставкой не собрался — игра пересобирает его с пустой заглушкой (как v8.18);
//  если не собрался шейдер ST70 — пересобирается без вставки (постройки не пропадают).
// =====================================================================
const MAT169 = {
  on: (() => { try { if (new URLSearchParams(location.search).get('mat169') === '0') return false; return localStorage.getItem('pm_mat169') !== '0'; } catch (e){ return true; } })(),
  err: {}, scene: 'none', st70: 'none',
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('T169 ' + tag, e); } } },
  info(){ return { on: this.on, scene: this.scene, st70: this.st70, err: Object.keys(this.err) }; },
  proto: 'void MAT169w(float m, vec3 p, vec3 n, inout vec3 alb, inout vec3 em, inout float sp);\n' +
         'void MAT169o(float m, vec3 q, vec3 wn, vec3 R, vec3 Uu, vec3 F, inout vec3 alb, inout vec3 em, inout float sp);',
  stub: '\nvoid MAT169w(float m, vec3 p, vec3 n, inout vec3 alb, inout vec3 em, inout float sp){}\n' +
        'void MAT169o(float m, vec3 q, vec3 wn, vec3 R, vec3 Uu, vec3 F, inout vec3 alb, inout vec3 em, inout float sp){}\n',
  // ---- реализация для сценового шейдера (дописывается в конец; доступны nz, hash12, sdBox, teamE, gDist, gTr,
  //      gT, gTeam, gProg, uQ, uTime, RM, CPD из scene.glsl / shaderConsts)
  tail: `
// ---- T169: материалы стен штабов и построек (= MAT169 в v819_mat169.js)
float m169h(vec2 v){ return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
// швы панелей: uv в метрах, s — размер панели, w — полуширина шва, aa — сглаживание (растёт с дистанцией)
float m169seam(vec2 uv, vec2 s, float w, float aa, out vec2 cell){
  vec2 c = uv / s; cell = floor(c);
  vec2 f = (0.5 - abs(fract(c) - 0.5)) * s;
  return 1.0 - smoothstep(w, w + aa, min(f.x, f.y));
}
// общий «износ» вертикальной стены: подтёки под верхней кромкой (dTop, м) и грязь у низа (dBot, м)
void m169weather(vec2 uv, float y, float dTop, float dBot, float seed, float k, inout vec3 alb, inout float sp){
  float s = nz(vec3(uv.x * 0.85, y * 0.045, seed));                        // вытянутые по вертикали пятна
  float sf = uQ > 0 ? nz(vec3(uv.x * 3.7, y * 0.16, seed + 0.5)) : 0.5;   // мелкая рябь подтёка
  float streak = smoothstep(0.5, 0.78, s + 0.18 * (sf - 0.5)) * exp(-max(dTop, 0.0) * 0.22);
  alb *= mix(vec3(1.0), vec3(0.62, 0.58, 0.52), streak * 0.75 * k);
  sp *= 1.0 - 0.5 * streak * k;
  float dirt = 1.0 - smoothstep(0.0, 1.1 + 0.7 * nz(vec3(uv.x * 0.6, seed, 0.3)), dBot);
  alb *= mix(vec3(1.0), vec3(0.6, 0.53, 0.44), dirt * 0.8 * k);
  sp *= 1.0 - 0.6 * dirt * k;
}
void MAT169w(float m, vec3 p, vec3 n, inout vec3 alb, inout vec3 em, inout float sp){
  if (m < 1.5 || m > 9.5 || (m > 3.5 && m < 6.5)) return;   // только штаб (2,3), металл (7), окна (8,9)
  float k = 1.0 - smoothstep(70.0, 160.0, gDist);
  if (k <= 0.0) return;
  float aa = 0.015 + gDist * 0.0018;
  if (m > 6.5 && m < 7.5){   // ---- металл: маяки точек захвата, мачта штаба
    float r = length(p); vec3 rn = p / r; float h = r - RM;
    vec3 t1 = normalize(abs(rn.y) < 0.9 ? cross(rn, vec3(0.0, 1.0, 0.0)) : cross(rn, vec3(1.0, 0.0, 0.0)));
    vec3 t2 = cross(rn, t1);
    vec2 tc = vec2(dot(p, t1), dot(p, t2));
    float vert = 1.0 - abs(dot(n, rn));   // 1 — боковая поверхность (башня, мачта), 0 — верх диска
    float band = 1.0 - smoothstep(0.035, 0.035 + aa, abs(fract(h / 1.6) - 0.5) * 1.6 - 0.72);   // болтовой пояс
    alb *= 1.0 - 0.45 * band * vert * k;
    float rust = smoothstep(0.55, 0.8, nz(vec3(tc * 1.1, h * 0.07))) * vert;
    alb = mix(alb, vec3(0.2, 0.1, 0.045), rust * 0.6 * k);
    sp = mix(sp, 0.08, rust * k);
    // диск маяка: жёлто-чёрная кайма по краю (верх и бортик)
    for (int i = 0; i < 6; i++){
      vec3 c = CPD[i], v = p - c * RM;
      if (dot(v, v) > 30.0) continue;
      float y = dot(v, c); vec3 vr = v - c * y; float rr = length(vr);
      vec3 a1 = normalize(abs(c.y) < 0.9 ? cross(c, vec3(0.0, 1.0, 0.0)) : cross(c, vec3(1.0, 0.0, 0.0)));
      float ang = atan(dot(vr, cross(c, a1)), dot(vr, a1));
      float zone = smoothstep(3.0, 3.05, rr) * (1.0 - smoothstep(4.05, 4.1, rr)) * step(y, 0.6) * step(-0.4, y);
      float st = step(0.5, fract(ang * 3.8197 + y * 0.5));   // 24 полосы по кругу
      alb = mix(alb, mix(vec3(0.02), vec3(0.62, 0.45, 0.05), st), zone * 0.9 * k);
      sp = mix(sp, 0.2, zone * k);
    }
    return;
  }
  // ---- штаб: локальные координаты как в map() (b — от полюса, верх — к +y)
  vec3 b = vec3(p.x, abs(p.y) - RM, p.z);
  vec3 nb = vec3(n.x, p.y > 0.0 ? n.y : -n.y, n.z);
  float ang = atan(b.z, b.x);
  float fi = floor(ang / 0.78539816 + 0.5);
  vec2 fn = vec2(cos(fi * 0.78539816), sin(fi * 0.78539816));
  float u = dot(b.xz, vec2(-fn.y, fn.x));    // вдоль грани октагона
  float ap = dot(b.xz, fn);                   // апофема в точке
  float edge = ap * 0.41421356 - abs(u);      // до угла октагона, м
  // пилоны — квадратные, свои грани
  vec3 bq = vec3(abs(b.x), b.y, abs(b.z)) - vec3(8.6, 2.6, 8.6);
  bool pyl = sdBox(bq, vec3(1.3, 2.4, 1.3)) < 0.08 && m < 3.5;
  if (pyl){
    bool sx = abs(nb.x) > abs(nb.z);
    u = sx ? bq.z : bq.x; fi = sx ? 11.0 : 13.0;
    edge = 1.3 - abs(u);
  }
  if (m > 7.5){   // ---- окна: переплёты, часть окон горит тёплым, часть тёмная
    float pane = floor(u / 1.04);
    float mull = smoothstep(0.43, 0.47, abs(fract(u / 1.04) - 0.5)) + smoothstep(0.25, 0.3, abs(b.y - 7.0));
    float hh = m169h(vec2(pane, fi * 7.0 + (p.y > 0.0 ? 0.0 : 3.0)));
    vec3 warm = vec3(1.0, 0.72, 0.38) * 1.6 * (0.85 + 0.15 * sin(uTime * 0.7 + hh * 30.0));
    vec3 lit = hh > 0.72 ? warm : (hh < 0.2 ? em * 0.25 : em);
    em = mix(em, lit, k) * (1.0 - clamp(mull, 0.0, 1.0) * 0.92 * k);
    alb = mix(alb, vec3(0.05, 0.05, 0.055), clamp(mull, 0.0, 1.0) * k);
    sp = mix(sp, 0.35, clamp(mull, 0.0, 1.0) * k);
    return;
  }
  float team = m - 2.0;
  bool hor = abs(nb.y) > 0.6;
  vec2 cell;
  if (hor){   // ---- площадка и крыши: плиты 4 м со швами, разнотон, пятна
    float roof = step(9.0, b.y);
    float sz = roof > 0.5 ? 2.5 : 4.0;
    float sm = m169seam(b.xz + 0.37, vec2(sz), 0.05, aa, cell);
    float hh = m169h(cell + vec2(fi * 0.0, roof * 19.0 + team * 7.0));
    alb *= mix(1.0, 0.86 + 0.24 * hh, k);
    alb *= 1.0 - 0.5 * sm * k;
    float stn = smoothstep(0.6, 0.85, nz(vec3(b.xz * 0.21, 4.4 + team)));
    alb *= 1.0 - 0.35 * stn * k;
    sp = mix(sp, 0.05, (0.5 * sm + 0.4 * stn) * k);
    if (roof > 0.5 && uQ > 0){   // вентиляционные решётки на крыше — ряды тёмных полос
      vec2 vg = abs(fract(b.xz / 2.5 + 0.37 / 2.5) - 0.5);
      float vent = step(max(vg.x, vg.y), 0.18) * step(0.6, hh) * step(0.5, fract(b.x * 3.0));
      alb *= 1.0 - 0.5 * vent * k;
    }
    return;
  }
  // ---- стены: панели 3.1 × 2.5 м от уровня площадки
  float y0 = ap > 12.0 && !pyl ? -1.2 : 1.6;       // борт площадки — от грунта, блок и пилоны — от площадки
  float yTop = pyl ? 5.0 : (ap > 12.0 ? 1.6 : (ap > 6.0 ? 10.0 : 12.2));
  vec2 uv = vec2(u, b.y - y0);
  float sm = m169seam(uv + vec2(1.55, 0.0), vec2(3.1, 2.5), 0.03, aa, cell);
  float hh = m169h(cell + vec2(fi * 13.1, team * 5.0 + (p.y > 0.0 ? 0.0 : 31.0)));
  alb *= mix(1.0, 0.88 + 0.22 * hh, k);
  alb *= 1.0 - 0.55 * sm * k;
  sp = mix(sp, 0.05, sm * k);
  if (uQ > 0 && gDist < 35.0){   // стяжки опалубки: 2×2 тёмные точки на панель
    vec2 tf = (fract((uv + vec2(1.55, 0.0)) / vec2(1.55, 1.25)) - 0.5) * vec2(1.55, 1.25);
    float hole = 1.0 - smoothstep(0.045, 0.07, length(tf));
    alb *= 1.0 - 0.5 * hole * (1.0 - gDist / 35.0);
  }
  // сколы краски на углах и у швов: под оливой/сталью проступает бетон
  float painted = step(1.6, b.y) * step(b.y, 10.0) * (ap < 12.0 || pyl ? 1.0 : 0.0);
  float cn = nz(b * 1.35 + vec3(fi));
  float chip = (1.0 - smoothstep(0.0, 0.4 + aa, edge)) * smoothstep(0.42, 0.62, cn)
             + sm * smoothstep(0.62, 0.75, cn);
  chip = clamp(chip, 0.0, 1.0) * k;
  alb = mix(alb, mix(vec3(0.27, 0.265, 0.25), vec3(0.33, 0.32, 0.3), cn), chip * (painted > 0.5 ? 0.85 : 0.4));
  sp = mix(sp, 0.06, chip * painted);
  // подтёки под верхней кромкой и под окнами, грязь у низа
  float dTop = yTop - b.y;
  if (!pyl && ap < 12.0 && ap > 6.0 && b.y < 6.65) dTop = min(dTop, (6.65 - b.y) * 0.8);
  m169weather(uv, b.y, dTop, b.y - y0, fi * 3.7 + team * 11.0, k, alb, sp);
  // пилоны: жёлто-чёрные полосы у основания
  if (pyl){
    float hz = step(1.6, b.y) * (1.0 - step(2.6, b.y));
    float st = step(0.5, fract((u + b.y) * 1.1));
    float wear = smoothstep(0.55, 0.8, nz(b * 2.1 + 7.0));
    alb = mix(alb, mix(vec3(0.03), vec3(0.6, 0.44, 0.05), st) * (1.0 - 0.45 * wear), hz * 0.92 * k);
  }
  // цветная полоса (2.2–3.0 м на блоке): огоньки на стыках панелей, медленно дышат
  if (!pyl && ap < 12.0 && ap > 6.0 && uQ > 0){
    vec2 lp = vec2(abs(fract((u + 1.55) / 3.1) - 0.5) * 3.1 - 1.55, b.y - 2.6);
    float lamp = 1.0 - smoothstep(0.06, 0.1 + aa, length(lp));
    float ph = 0.55 + 0.45 * sin(uTime * 1.7 + floor((u + 1.55) / 3.1) * 0.9 + fi);
    em += teamE(team) * 0.5 * lamp * ph * k;
  }
}
void MAT169o(float m, vec3 q, vec3 wn, vec3 R, vec3 Uu, vec3 F, inout vec3 alb, inout vec3 em, inout float sp){
  // постройки рэймарчера: 6 турель, 7 ПВО, 8 завод, 9 хаб, 10 ангар, 11 форпост, 12 экстрактор, 19–22 хижина/склады/казарма
  bool bld = (gT > 5.5 && gT < 12.5) || (gT > 18.5 && gT < 22.5);
  if (!bld) return;
  if (!(m < 2.5 || (m > 8.5 && m < 9.5) || (m > 12.5 && m < 13.5) || (m > 14.5 && m < 15.5))) return;   // краска, бетон, ржавчина, белая
  float k = 1.0 - smoothstep(55.0, 130.0, gTr);
  if (k <= 0.0) return;
  float aa = 0.012 + gTr * 0.0018;
  vec3 ln = vec3(dot(wn, R), dot(wn, Uu), dot(wn, F)); vec3 an = abs(ln);
  float bh = gT < 6.5 ? 2.4 : gT < 7.5 ? 3.3 : gT < 8.5 ? 12.5 : gT < 9.5 ? 5.6 : gT < 10.5 ? 14.2 : gT < 11.5 ? 8.6 : gT < 20.5 ? 8.2 : gT < 21.5 ? 5.4 : 3.4;
  vec2 cell, uv;
  float sz = bh > 6.0 ? 1.0 : 0.6;   // крупные здания — панели крупнее
  if (an.y > max(an.x, an.z)){   // крыши и площадки
    uv = q.xz;
    float sm = m169seam(uv, vec2(2.0, 2.0) * sz, 0.03, aa, cell);
    alb *= mix(1.0, 0.88 + 0.22 * m169h(cell + gT), k) * (1.0 - 0.45 * sm * k);
    return;
  }
  uv = an.x > an.z ? vec2(q.z, q.y) : vec2(q.x, q.y);
  float sm = m169seam(uv, vec2(2.4, 1.8) * sz, 0.025, aa, cell);
  float hh = m169h(cell + vec2(gT * 3.1, gTeam * 7.0));
  alb *= mix(1.0, 0.87 + 0.24 * hh, k);
  alb *= 1.0 - 0.5 * sm * k;
  float cn = nz(q * 1.6 + gT);
  if (m < 2.5) alb = mix(alb, vec3(0.13, 0.125, 0.12), sm * smoothstep(0.6, 0.75, cn) * 0.8 * k);   // сколы краски у швов
  m169weather(uv, q.y, bh - q.y, q.y + 0.3, gT * 2.3 + (an.x > an.z ? 1.0 : 0.0), k * 0.85, alb, sp);
}
`,
  // ---- вставка в шейдер процедурных мешей ST70 (v70_mesh.js): p — мировая точка, vL — локальная (метры, y — вверх от грунта)
  st70fn: `
float m169h(vec2 v){ return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
void m169st(float m, vec3 p, float cd, inout vec3 alb, inout float sp){
  vec3 dx = dFdx(vL), dy = dFdy(vL);
  if (m > 2.5) return;
  float k = 1.0 - smoothstep(60.0, 150.0, cd);
  if (k <= 0.0) return;
  vec3 ln = cross(dx, dy); float ll = length(ln);
  if (ll < 1e-12) return;
  vec3 an = abs(ln / ll);
  bool hor = an.y > max(an.x, an.z);
  vec2 uv = hor ? vL.xz : (an.x > an.z ? vec2(vL.z, vL.y) : vec2(vL.x, vL.y));
  float fw = max(fwidth(uv.x) + fwidth(uv.y), 1e-4);
  vec2 s = m < 0.5 ? vec2(1.25, 1.0) : (m < 1.5 ? vec2(1.5, 0.75) : vec2(0.9, 0.9));
  vec2 c = uv / s, cell = floor(c), f = (0.5 - abs(fract(c) - 0.5)) * s;
  float w = m < 1.5 ? 0.022 : 0.012;
  float seam = (1.0 - smoothstep(w, w + fw * 1.5, min(f.x, f.y))) * (1.0 - smoothstep(0.05, 0.2, fw));
  float hh = m169h(cell + vec2(m * 17.0, hor ? 5.0 : 0.0));
  float n1 = texture(uNoise, vL * 0.9 + 0.31).r, n2 = texture(uNoise, vec3(uv.x * 0.8, vL.y * 0.05, 0.71)).r;
  alb *= mix(1.0, 0.86 + 0.26 * hh, k);
  alb *= 1.0 - 0.5 * seam * k;
  if (m < 0.5){   // краска: сколы у швов и рёбер панелей до тёмного металла
    float chip = smoothstep(0.62, 0.74, n1) * (seam + smoothstep(0.08, 0.0, min(f.x, f.y)));
    alb = mix(alb, vec3(0.085, 0.08, 0.075), clamp(chip, 0.0, 1.0) * 0.85 * k);
    sp = mix(sp, 0.55, clamp(chip, 0.0, 1.0) * k);
  } else if (m < 1.5){   // бетон: стяжки опалубки, пористость
    vec2 tf = (fract(uv / vec2(0.75, 0.375)) - 0.5) * vec2(0.75, 0.375);
    float hole = (1.0 - smoothstep(0.03, 0.05, length(tf))) * (1.0 - smoothstep(0.02, 0.06, fw));
    alb *= (1.0 - 0.45 * hole * k) * mix(1.0, 0.9 + 0.2 * texture(uNoise, vL * 3.1).r, k);
  } else {   // металл: потёртости и редкая ржавчина
    float rust = smoothstep(0.62, 0.82, n1);
    alb = mix(alb, vec3(0.2, 0.1, 0.045), rust * 0.55 * k);
    sp = mix(sp, 0.12, rust * k);
  }
  if (!hor){   // подтёки вниз и грязь у грунта
    float streak = smoothstep(0.52, 0.8, n2);
    alb *= mix(vec3(1.0), vec3(0.64, 0.6, 0.54), streak * 0.6 * k);
    float dirt = 1.0 - smoothstep(0.0, 0.8 + 0.5 * n1, vL.y);
    alb *= mix(vec3(1.0), vec3(0.6, 0.53, 0.44), dirt * 0.75 * k);
    sp *= 1.0 - 0.5 * (streak + dirt) * k;
  }
}
`,
  st70src(src){   // вызывается из v70_mesh.js (помеченная строка) перед компиляцией шейдера ST70
    if (!this.on || this.st70 === 'fallback') return src;
    const a = 'void main(){', b = '  alb = mix(alb, vec3(1.0, 0.55, 0.2), uP.y * 0.5);';
    if (src.indexOf(a) < 0 || src.indexOf(b) < 0){ this.st70 = 'no-anchor'; return src; }
    this.st70 = 'patched';
    return src.replace(a, this.st70fn + a).replace(b, '  m169st(m, p, cd, alb, sp);   // T169\n' + b);
  },
  init(){
    if (this.did) return; this.did = true;
    const sc0 = shaderConsts;
    shaderConsts = function(){ return sc0.apply(this, arguments) + '\n' + MAT169.proto + '\n'; };
    const sp0 = startProgram, fp0 = finishProgram;
    startProgram = function(src){
      if (typeof src === 'string' && src.indexOf('MAT169w(m, p') >= 0 && src.indexOf('void m169seam') < 0){
        const plain = src + MAT169.stub;
        const tail = MAT169.on ? MAT169.safe(() => MAT169.tail, 'tail') : null;
        if (!tail){ MAT169.scene = MAT169.on ? 'stub' : 'off'; return sp0.call(this, plain); }
        const h = sp0.call(this, src + tail);
        h.m169plain = plain; MAT169.scene = 'patched';
        return h;
      }
      return sp0.call(this, src);
    };
    // шейдер с вставкой не собрался — пересобрать с заглушкой (игра не падает)
    finishProgram = function(h, names){
      try { return fp0.call(this, h, names); }
      catch (e){
        if (!h || !h.m169plain) throw e;
        console.warn('T169: scene shader with MAT169 failed, rebuilding without it', e);
        MAT169.scene = 'fallback'; MAT169.err.scene = 1;
        return fp0.call(this, sp0.call(this, h.m169plain), names);
      }
    };
    if (typeof ST70 !== 'undefined' && ST70.build){
      const b0 = ST70.build;
      ST70.build = function(){
        b0.apply(this, arguments);
        if (this.failed && MAT169.st70 === 'patched'){
          console.warn('T169: ST70 shader with MAT169 failed, rebuilding without it', this.err);
          MAT169.st70 = 'fallback'; MAT169.err.st70 = 1;
          this.failed = false; this.err = '';
          b0.apply(this, arguments);
        }
      };
    }
  }
};
MAT169.safe(() => MAT169.init(), 'init');
