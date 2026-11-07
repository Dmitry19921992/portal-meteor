// =====================================================================
//  v8.19 (T131) — ДЕТАЛИЗАЦИЯ ПОВЕРХНОСТЕЙ: БЕТОН ПЛОЩАДОК + ГРУНТ ВБЛИЗИ
//  Причина (плейтест 07.11, Фитба: «графон примитивнейший»): плиты баз и точек
//  захвата — сплошной равномерный бетон без разнотона/пятен/трещин; грунт под
//  ногами — гладкий шум без мелочи. Камера шутера половину времени смотрит на пол.
//  Что здесь (всё в своём модуле; старые файлы — одна помеченная строка в scene.glsl):
//   1) бетон площадок баз и точек захвата — мультипликативный оверлей с весом
//      площадки: разнотон плит (hash на плиту 4 м), редкие «ремонтные» плиты,
//      более глубокие швы, трещины на части плит, масляно-сажевые пятна,
//      пыльный подтёк у края площадки;
//   2) грунт вблизи игрока (fade exp(-gDist·0.03)): мелкая галька (светлые камешки
//      + локальная шероховатость bump), изолинии сухой треснувшей почвы, пятна
//      влажного грунта (темнее, чуть блестят);
//   3) всё затухает с дистанцией (дальше 60–80 м — как раньше); на «низкой»
//      графике радиус меньше; под землёй не рисуется; скалы/ангары (ter81mat)
//      красятся после нас и остаются как были.
//  Выкл.: ?t131=0. Консоль: DET131.on. Ошибка модуля не роняет шейдер (stub).
// =====================================================================
const DET131 = {
  on: (() => { try { return new URLSearchParams(location.search).get('t131') !== '0'; } catch (e){ return true; } })(),
  err: {},
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('T131 ' + tag, e); } } },
  proto: 'void DET131(vec3 p, vec3 rn, vec3 n, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump);',
  stub: '\nvoid DET131(vec3 p, vec3 rn, vec3 n, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){}\n',
  // реализация дописывается в конец сценового шейдера (здесь доступны nz, fbm3, gDist,
  // uQ, RM, BASES, CPD, PAD_B0, PAD_C0 из scene.glsl / shaderConsts)
  tail: `
// ---- T131: детализация поверхностей (= DET131 в v819_t131.js)
float d131h(vec2 v){ return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
// бетон площадки: xy — локальные коорд. вдоль плоскости, rEdge — расстояние до края (м),
// w — вес площадки (0..1). Возвращает мультипликатор цвета; sp/bump правит с тем же весом
vec3 d131conc(vec2 xy, float rEdge, float w, inout float sp, inout float bump){
  vec2 cell = floor(xy / 4.0);
  vec2 cf = fract(xy / 4.0);
  float h = d131h(cell);
  float mid2 = nz(vec3(xy.x, xy.y, 1.7) * (1.0 / 3.1));
  vec3 m = vec3(1.0);
  // разнотон плит + тёплый/холодный отлив + редкая «ремонтная» плита другого оттенка
  m *= 0.82 + 0.32 * h;
  float h2 = d131h(cell + 7.7);
  m *= mix(vec3(1.05, 0.98, 0.92), vec3(0.94, 0.99, 1.06), step(0.5, h2));
  m *= 0.94 + 0.10 * mid2;
  m *= mix(vec3(1.0), vec3(0.93, 1.0, 0.88), step(0.93, h) * 0.8);
  // швы глубже, в них застряла пыль
  vec2 g = abs(cf - 0.5);
  float seam = smoothstep(0.44, 0.5, max(g.x, g.y));
  m *= 1.0 - 0.45 * seam;
  // трещины на части плит — тонкие прерывистые линии
  if (h > 0.55 && h < 0.9){
    vec2 q = (cf + h * 17.0) * 5.0;
    float wob = nz(vec3(q * 0.7, h * 23.0));
    float c1 = abs(fract(q.x + 0.55 * wob) - 0.5);
    float c2 = abs(fract(q.y * 0.8 + 0.5 * wob) - 0.5);
    float brk = smoothstep(0.40, 0.60, nz(vec3(cf * 3.0, h * 51.0)));
    m *= 1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.07, min(c1, c2))) * brk;
  }
  // масляно-сажевые пятна и потёртости
  float stain = clamp(smoothstep(0.58, 0.84, nz(vec3(xy, 3.3) * (1.0 / 2.7))) * 0.65
                    + smoothstep(0.62, 0.9, nz(vec3(xy, 8.8) * (1.0 / 9.5))) * 0.5, 0.0, 1.0);
  m *= 1.0 - 0.42 * stain;
  sp = mix(sp, 0.11, stain * 0.5 * w);
  // пыльный подтёк у края площадки
  float edge = 1.0 - smoothstep(0.0, 2.6, rEdge);
  m *= mix(vec3(1.0), vec3(1.07, 1.0, 0.9), edge * 0.55);
  bump *= 1.0 - (0.3 * stain + 0.3 * edge) * w;
  return m;
}
void DET131(vec3 p, vec3 rn, vec3 n, float slope, inout vec3 alb, inout vec3 em, inout float sp, inout float bump){
  float r = length(p);
  if (r < RM - 4.0) return;                    // не под землёй
  float dmax = uQ > 0 ? 80.0 : 32.0;           // на «низкой» графике — ближе
  if (gDist > dmax) return;
  float near = exp(-gDist * 0.03);
  if (near < 0.02) return;
  float padM = 0.0;
  // площадки баз (координаты как в scene.glsl: p.xz, жёсткий край ~22.7 м)
  for (int i = 0; i < 2; i++){
    float k = dot(rn, BASES[i]);
    if (k > PAD_B0 - 0.004){
      float pad = smoothstep(PAD_B0 + 0.0015, PAD_B0 + 0.004, k);
      if (pad > 0.001){
        vec2 xz = p.xz;
        alb *= mix(vec3(1.0), d131conc(xz, 22.8 - length(xz), pad, sp, bump), pad);
        padM = max(padM, pad);
      }
    }
  }
  // площадки точек захвата (локальный базис вдоль CPD[i], край ~14.5 м)
  for (int i = 0; i < 6; i++){
    float k = dot(rn, CPD[i]);
    if (k > PAD_C0 - 0.004){
      float pad = smoothstep(PAD_C0 + 0.0008, PAD_C0 + 0.002, k);
      if (pad > 0.001){
        vec3 ci = CPD[i];
        vec3 t1 = normalize(abs(ci.y) < 0.9 ? cross(ci, vec3(0.0, 1.0, 0.0)) : cross(ci, vec3(1.0, 0.0, 0.0)));
        vec3 t2 = cross(ci, t1);
        vec3 v = p - ci * RM;
        vec2 xy = vec2(dot(v, t1), dot(v, t2));
        float rr = length(xy);
        float w = pad * (1.0 - smoothstep(14.0, 16.0, rr));
        alb *= mix(vec3(1.0), d131conc(xy, 14.8 - rr, w, sp, bump), w);
        padM = max(padM, w);
      }
    }
  }
  // грунт вблизи (вне площадок)
  float gr = (1.0 - padM) * near;
  if (gr > 0.01){
    // галька: редкие светлые камешки + локальная шероховатость
    float st = smoothstep(0.80, 0.9, nz(p * 0.55)) * (0.55 + 0.45 * (1.0 - slope));
    alb *= 1.0 + 0.34 * st * gr;
    bump *= 1.0 + 0.9 * st * gr;
    // сухая треснувшая почва: тёмные изолинии
    float cr = (1.0 - smoothstep(0.0, 0.035, abs(nz(p * 0.21) - 0.5)))
             * smoothstep(0.35, 0.65, nz(p * 0.53 + 5.0));
    alb *= 1.0 - 0.30 * cr * gr;
    // пятна влажного грунта: темнее, чуть блестят
    float mo = smoothstep(0.58, 0.82, nz(p * 0.043 + 7.0));
    alb *= 1.0 - 0.22 * mo * gr;
    sp = mix(sp, 0.09, mo * gr * 0.6);
  }
}
`,
  init(){
    if (this.did) return; this.did = true;
    const sc0 = shaderConsts;
    shaderConsts = function(){ return sc0.apply(this, arguments) + '\n' + DET131.proto + '\n'; };
    const sp0 = startProgram;
    startProgram = function(src){
      if (typeof src === 'string' && src.indexOf('DET131(p, rn') >= 0 && src.indexOf('void d131conc') < 0)
        src += DET131.on ? (DET131.safe(() => DET131.tail, 'tail') || DET131.stub) : DET131.stub;
      return sp0.call(this, src);
    };
  }
};
DET131.safe(() => DET131.init(), 'init');
