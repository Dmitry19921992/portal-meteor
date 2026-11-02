// =====================================================================
//  v8.11 — ПРОИЗВОДИТЕЛЬНОСТЬ (PERF811). Принцип Дмитрия: игра должна идти везде, включая слабые устройства
//  (Intel UHD 630 на 4K, realme Note 60, iPhone 14 Pro Max).
//  Замер (SwiftShader, work/t811/bench2.js) показал: главная цена кадра — не фичи v8.x, а перебор ВСЕХ объектов и частиц
//  для каждого пикселя. Отсюда: 1) отсечение по кадру (и сквозь портал), «Низкая» без объектов/частиц сквозь портал;
//  2a) индекс деталей TER81 для JS-физики (бит-в-бит); 2b) биомы без лишнего шума; 3) ADG80 — ниже предел «Низкой»,
//  быстрее спуск при сильной просадке; «вебка» v6.6 на «Низкой» реже. Отчёт и таблицы — REPORT_v811cloud.md.
//  Выключатели: ?perf811=0 (всё), ?cull811=0, ?lowb811=0, ?terjs811=0, ?bio811=0, ?cam811=0, ?adg811=0; ?ter811=1 — группы TER81
//  в шейдере (опция, по умолчанию выкл.); ?sv811=a,b — варианты шейдера для замеров (см. DEV).
//  Хуки в чужом коде: scene.glsl (12 строк // v811), build.py (1 строка). Остальное — обёртки здесь.
// =====================================================================
var PERF811 = {
  on: (() => { try { return new URLSearchParams(location.search).get('perf811') !== '0'; } catch (e){ return true; } })(),
  err: {}, stats: {},
  _q: null,
  q(k){ if (!this._q){ try { this._q = new URLSearchParams(location.search); } catch (e){ this._q = new Map(); } } return this._q.get(k); },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('PERF811 ' + tag, e); } } },
  // ---- варианты шейдера для замеров (только по ?sv811=…): замена строк в итоговом исходнике сцены
  DEV: {
    noTer81: [['d = ter81(p, n, r, d, mask);', '']],
    noTerMat: [['ter81mat(p, rn, n, slope, alb, em, sp, gBump);', '']],
    noBio: [['bio86(p, rn, slope, alb, em, sp, gBump);', '']],
    noWx: [['c = wx86(o, d, bestT, c);', '']],
    noFog81: [['c = fog81(o, d, bestT, c);', '']],
    noObj: [['traceObjects(o, d, b, bestT, bN, bA, bE, bS, bAO, kind);', '']],
    noPar: [['traceParticles(o, d, bestT, bE, kind);', '']],
    noVol: [['vec4 vol = volumes(o, d, bestT);', 'vec4 vol = vec4(0.0, 0.0, 0.0, 1.0);']],
    noGlow: [['vec3 gl = lightGlow(o, d, bestT) + tracerGlow(o, d, bestT);', 'vec3 gl = vec3(0.0);']],
    noShadow: [['else if (sh > 0.01) sh *= shadow(p + n * 0.04, L);', '']],
    noAO: [['bAO = uQ > 0 ? calcAO(p, bN) : 1.0;', 'bAO = 1.0;']],
    noPL: [['col += pointLights(p, n, v, alb, sp);', '']],
    noCr76: [['if (i >= uNCr76) break;', 'break;']],
    noDetail: [['if (d < 1.5 && gDetail > 0.5) d -=', 'if (false) d -=']],
    steps120: [['for (int i = ZERO; i < 220; i++){', 'for (int i = ZERO; i < 120; i++){'], ['|| i == 219){', '|| i == 119){']],
    noMat: [['material(mat, p, bN, bA, bE, bS);', 'bA = vec3(0.3); bE = vec3(0.0); bS = 0.04; gBump = 0.0;']],
    noBounce: [['if (b > uBounces) break;', 'if (b > 0) break;']],
  },
  devList(){ try { const q = new URLSearchParams(location.search).get('sv811'); return q ? q.split(',').filter(k => this.DEV[k]) : []; } catch (e){ return []; } },
};
// ---------------------------------------------------------------------
//  1) ОТСЕЧЕНИЕ ПО КАДРУ: шейдер проверял каждый объект (до 160) и каждую частицу (до 160) для КАЖДОГО пикселя —
//     главная цена кадра (замер: без объектов кадр в 2.5–3 раза дешевле). Теперь до отправки списки пересортированы:
//     [в кадре] [рядом с кадром — только для теней] [остальные]; первый отрезок луча перебирает только «в кадре»,
//     тени — «в кадре + рядом» (60 м — радиус мягкой тени объекта), отрезки сквозь портал — всех, как раньше.
//     Проверка — конус камеры с запасом на радиус ограничивающей сферы (консервативно: видимое не пропадает).
// ---------------------------------------------------------------------
PERF811.cull = { on: PERF811.q('cull811') !== '0', nO: 0, nOv: 0, nOs: 0, nP: 0, nPv: 0, tmp: new Float32Array(OBJ.length), tmpP: new Float32Array(PAR.length), ok: false };
PERF811.camK = function(){
  const c = S.cam; if (!c || !c.fwd || !c.right || !c.up) return null;
  const asp = fboW / max(1, fboH), fov = c.fov || FOV;
  const hx = 0.5 * fov * asp * 1.04, hy = 0.5 * fov * 1.04;   // +4 % — запас на округления
  return { p: c.pos, f: c.fwd, r: c.right, u: c.up, hx, hy, kx: Math.sqrt(1 + hx * hx), ky: Math.sqrt(1 + hy * hy) };
};
// сфера (x, y, z, R) в конусе камеры?
PERF811.inView = function(K, x, y, z, R){
  const vx = x - K.p[0], vy = y - K.p[1], vz = z - K.p[2];
  const zz = vx * K.f[0] + vy * K.f[1] + vz * K.f[2];
  if (zz < -R) return false;
  const xx = vx * K.r[0] + vy * K.r[1] + vz * K.r[2]; if (abs(xx) > zz * K.hx + R * K.kx) return false;
  const yy = vx * K.u[0] + vy * K.u[1] + vz * K.u[2]; if (abs(yy) > zz * K.hy + R * K.ky) return false;
  return true;
};
PERF811.splitOn = function(){ return typeof CINE75 !== 'undefined' && CINE75.on && CINE75.on() && CINE75.cS; };
// сфера в двойном конусе «виртуальной камеры» −cam (отрезок луча сквозь портал: −P + d·t = −cam + d·(t − tExit), т.е.
// те же направления из точки −cam, причём и вперёд, и назад от неё)
PERF811.inView2 = function(K, x, y, z, R){
  const vx = x + K.p[0], vy = y + K.p[1], vz = z + K.p[2];
  const zz = abs(vx * K.f[0] + vy * K.f[1] + vz * K.f[2]);
  const xx = vx * K.r[0] + vy * K.r[1] + vz * K.r[2]; if (abs(xx) > zz * K.hx + R * K.kx) return false;
  const yy = vx * K.u[0] + vy * K.u[1] + vz * K.u[2]; if (abs(yy) > zz * K.hy + R * K.ky) return false;
  return true;
};
// диапазоны [начало, конец) для шейдера: объекты отрезка 0 / тени 0 / объекты отрезка 1 / тени 1; частицы 0 / 1
PERF811.full = function(){ const C = this.cull, n = renderList.length; C.R = [0, n, 0, n, 0, n, 0, n]; };
PERF811.sortObj = function(meIdx){
  const C = this.cull, n = renderList.length;
  C.nO = n; C.R = [0, n, 0, n, 0, n, 0, n];
  if (!this.on || !C.on || n < 2 || this.splitOn()) return meIdx;
  const K = this.camK(); if (!K) return meIdx;
  // 1 — в кадре, 2 — рядом с кадром (тени, 62 м), 4 — в кадре сквозь портал, 8 — рядом сквозь портал
  const G = [[], [], [], [], [], []]; let ovS0 = false, ovBs = false;
  for (let i = 0; i < n; i++){
    const k = i * 28, R = abs(OBJ[k + 3]), x = OBJ[k], y = OBJ[k + 1], z = OBJ[k + 2];
    const a = this.inView(K, x, y, z, R), s = a || this.inView(K, x, y, z, R + 62);
    const b = this.inView2(K, x, y, z, R), bs = b || this.inView2(K, x, y, z, R + 62);
    let g;
    if (b && a) g = 2; else if (b){ g = 1; if (s) ovS0 = true; }
    else if (a){ g = 3; if (bs) ovBs = true; }
    else if (s){ g = 4; if (bs) ovBs = true; }
    else if (bs) g = 0; else g = 5;
    G[g].push(i);
  }
  const L = G.map(g => g.length), st = [0]; for (let q = 0; q < 6; q++) st.push(st[q] + L[q]);
  // st[q] — начало группы q, st[q + 1] — конец
  C.R = [st[2], st[4], ovS0 ? st[1] : st[2], st[5], st[1], st[3], st[0], ovBs ? st[5] : st[3]];
  this.stats.obj = L.join('/') + (ovS0 ? ' ovS0' : '') + (ovBs ? ' ovBs' : ''); this.stats.objN = n;
  const order = [].concat(...G);
  let id = true; for (let j = 0; j < n; j++) if (order[j] !== j){ id = false; break; }
  if (id) return meIdx;
  const T = C.tmp, L0 = renderList.slice();
  T.set(OBJ.subarray(0, n * 28));
  let me = meIdx;
  for (let j = 0; j < n; j++){ const i = order[j]; if (i !== j) OBJ.set(T.subarray(i * 28, i * 28 + 28), j * 28); renderList[j] = L0[i]; if (i === meIdx) me = j; }
  return me;
};
// частицы: 10/11 — объёмы (центр, радиус), 12+ — обломки-капсулы, остальные — капсулы-трассеры со свечением
PERF811.sortPar = function(n){
  const C = this.cull; C.nP = n; C.P = [0, n, 0, n];
  if (!this.on || !C.on || n < 2 || this.splitOn()) return;
  const K = this.camK(); if (!K) return;
  const G = [[], [], [], []];   // 0 — только сквозь портал, 1 — оба, 2 — только в кадре, 3 — нигде
  for (let i = 0; i < n; i++){
    const k = i * 8, ty = PAR[k + 7];
    let x = PAR[k], y = PAR[k + 1], z = PAR[k + 2], R = PAR[k + 3], R2 = R;
    if (ty > 6.5 && ty < 7.5){ G[1].push(i); continue; }   // орбитальный луч: свечение шириной в десятки метров — всегда
    if (!(ty > 9.5 && ty < 11.5)){
      const bx = PAR[k + 4], by = PAR[k + 5], bz = PAR[k + 6], hx = (bx - x) * 0.5, hy = (by - y) * 0.5, hz = (bz - z) * 0.5;
      x += hx; y += hy; z += hz;
      const dc = Math.hypot(x - K.p[0], y - K.p[1], z - K.p[2]), hl = Math.hypot(hx, hy, hz);
      const gl = ty < 8.5 && !(ty > 1.5 && ty < 2.5), wk = (ty > 5.5 && ty < 6.5 ? 4 : 1) * 3.2;
      R = hl + max(R, dc * 0.0012) + (gl ? (0.12 + dc * 0.004) * wk : 0) + 0.05;
      R2 = hl + max(R2, 1.6) + (gl ? (0.12 + 1300 * 0.004) * wk : 0) + 0.05;   // сквозь портал дальность до ~1300 м
    }
    const a = this.inView(K, x, y, z, R), b = this.inView2(K, x, y, z, R2);
    G[a && b ? 1 : b ? 0 : a ? 2 : 3].push(i);
  }
  const L = G.map(g => g.length);
  C.P = [L[0], L[0] + L[1] + L[2], 0, L[0] + L[1]];
  this.stats.par = L.join('/'); this.stats.parN = n;
  if (L[1] + L[2] === n && L[1] === 0 || L[3] === n) {}
  const order = [].concat(...G); let id = true; for (let j = 0; j < n; j++) if (order[j] !== j){ id = false; break; }
  if (id) return;
  const T = C.tmpP; T.set(PAR.subarray(0, n * 8));
  for (let j = 0; j < n; j++){ const i = order[j]; if (i !== j) PAR.set(T.subarray(i * 8, i * 8 + 8), j * 8); }
};
{ const sc0 = shaderConsts; shaderConsts = function(){ return sc0.apply(this, arguments) + `
// v811 (PERF811): какие объекты/частицы перебирать в каждом отрезке луча. uC811: x — отсечение включено (без JS — нули,
// всё как раньше), y — «Низкая»: сквозь портал без объектов и частиц, z — предел шагов марша сквозь портал
uniform ivec4 uC811; uniform ivec4 uO811; uniform ivec4 uO811b; uniform ivec4 uP811;   // [начало, конец): объекты/тени отрезка 0, отрезка 1; частицы 0/1
int gSO811 = 0, gNO811 = 0, gSS811 = 0, gNS811 = 0, gSP811 = 0, gNP811 = 0;
void cull811(int b){
  gSO811 = 0; gSS811 = 0; gSP811 = 0; gNO811 = uNO; gNS811 = uNO; gNP811 = uNP;
  if (uC811.x == 0) return;
  if (b == 0){ gSO811 = uO811.x; gNO811 = uO811.y; gSS811 = uO811.z; gNS811 = uO811.w; gSP811 = uP811.x; gNP811 = uP811.y; }
  else if (uC811.y > 0){ gNO811 = 0; gNS811 = 0; gNP811 = 0; }
  else if (b == 1){ gSO811 = uO811b.x; gNO811 = uO811b.y; gSS811 = uO811b.z; gNS811 = uO811b.w; gSP811 = uP811.z; gNP811 = uP811.w; }
}
`; }; }
SCENE_U.push('uC811', 'uO811', 'uO811b', 'uP811');
{ const go0 = gatherObjects; gatherObjects = function(){ const r = go0.apply(this, arguments); const m = PERF811.safe(() => PERF811.sortObj(r), 'obj'); if (m === undefined){ PERF811.cull.nO = -1; return r; } return m; }; }
{ const gp0 = gatherParticles; gatherParticles = function(){ const n = gp0.apply(this, arguments); PERF811.cull.P = null; PERF811.safe(() => PERF811.sortPar(n), 'par'); return n; }; }
PERF811.setU = function(U, full){
  const C = this.cull, n = renderList.length;
  if (!U || !U.uC811) return;
  const ok = !full && this.on && C.on && C.nO === n && C.R && C.P;
  // сквозь портал (антипод, 600+ м): на «Низкой» объекты и частицы там — доли пикселя, не перебираем; шагов марша меньше
  const lowB = ok && S.quality === 0 && this.q('lowb811') !== '0';
  gl.uniform4i(U.uC811, ok ? 1 : 0, lowB ? 1 : 0, +(this.q('ms811') || 96), 0);
  if (!ok) return;
  const R = C.R, P = C.P;
  gl.uniform4i(U.uO811, R[0], R[1], R[2], R[3]); gl.uniform4i(U.uO811b, R[4], R[5], R[6], R[7]); gl.uniform4i(U.uP811, P[0], P[1], P[2], P[3]);
};
if (typeof GFX72 !== 'undefined'){ const su0 = GFX72.sceneU; GFX72.sceneU = function(U){ su0.apply(this, arguments); PERF811.safe(() => PERF811.setU(U, false), 'u'); }; }
// «вебка» v6.6 рисует тем же шейдером со своей камерой — для неё отсечения нет
// и на «Низкой» обновляется вдвое реже (каждый 4-й кадр вместо 2-го): это второй проход рэймарчера 192×240 —
// на телефоне с «Низкой» он стоил ~четверть кадра; VHS-«вебке» 15 к/с хватает
PERF811.camK66 = 0;
if (typeof CAM66 !== 'undefined' && CAM66.renderPass){ const rp0 = CAM66.renderPass; CAM66.renderPass = function(){
  if (PERF811.on && !this.snap && S.quality === 0 && PERF811.q('cam811') !== '0' && (PERF811.camK66++ & 1)){ PERF811.stats.cam66skip = (PERF811.stats.cam66skip || 0) + 1; return; }
  if (SCENE){ gl.useProgram(SCENE.p); PERF811.safe(() => PERF811.setU(SCENE.U, true), 'u66'); }
  try { return rp0.apply(this, arguments); } finally { if (SCENE){ gl.useProgram(SCENE.p); PERF811.safe(() => PERF811.setU(SCENE.U, false), 'u66b'); } }
}; }
// ---------------------------------------------------------------------
//  2) РЕЛЬЕФ v8.1 (TER81) В map(): map() зовётся сотни раз на пиксель (марш, нормаль, тень, AO), а ter81() проверял
//     все 13 деталей полушария по одной. ОПЦИЯ (?ter811=1, по умолчанию выкл. — на SwiftShader выигрыша не дала): детали в группы (одна сфера на группу): вдали от группы —
//     одна проверка и консервативная граница шага (как у одиночной скалы: |p − C| − R + 12.5), внутри — прежний код.
//     Формула рельефа та же (JS-физика не меняется), меняется только порядок проверок.
// ---------------------------------------------------------------------
PERF811.terCode = function(f){   // = TER81.glslMap (v81_terrain.js), по одной детали
  const v = a => `vec3(${f5(a)})`, n4 = x => (+x).toFixed(4);
  if (f.type === 'lake') return `{ float cd = dot(n, ${v(f.c)}); if (cd > ${n4(f.cb)}){ float lr = RM * sqrt(max(0.0, 1.0 - cd * cd)); float w = 1.0 - smoothstep(${n4(f.R * 0.62)}, ${n4(f.R)}, lr); d = mix(d, r - ${n4(f.L)}, w); mask *= 1.0 - w; } }`;
  const bnd = `vec3 bq = p - ${v(f.bc)}; float b2 = dot(bq, bq); if (b2 < ${n4(f.br2)})`;
  if (f.type === 'crack') return `{ ${bnd}{ float t; float l = seg81(n, ${v(f.A3)}, ${v(f.AB)}, ${(f.il2).toExponential(6)}, t); float y = r - (${n4(f.gA)} + ${n4(f.gB - f.gA)} * t);
    float hp = y + ${n4(f.D)} * smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.7, 1.0, t)); float inn = max((l - ${n4(f.w0)} - ${n4(f.s)} * max(hp, 0.0)) * ${n4(f.kk)}, -hp);
    d = max(d, -inn);${f.lava ? ' if (inn < 0.5) mask *= smoothstep(0.4, 1.6, hp);' : ''} } }`;
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
  return `{ ${bnd}{ ${rock}
    d = smin81(d, rk, 2.0);${hg} } else { float e = d + ${n4(f.br - 12.5)}; if (b2 < e * e) d = min(d, sqrt(b2) - ${n4(f.br - 12.5)}); } }`;
};
// сфера детали: скалы/трещины — их (bc, br); озеро — у поверхности (влияние озера выше 40 м над ним не нужно: там шаг и так меньше)
PERF811.terSphere = function(f){
  if (f.type === 'lake') return { c: mul(f.c, f.L), r: Math.hypot(f.R + 3, 40), rin: null };
  return { c: f.bc, r: f.br, rin: f.type === 'crack' ? null : f.br - 12.5 };
};
PERF811.terClusters = function(F, maxR){
  let G = F.map(f => { const s = this.terSphere(f); return { c: s.c, r: s.r, F: [f] }; });
  const merge = (a, b) => {   // сфера, содержащая обе
    const d = dist(a.c, b.c);
    if (d + b.r <= a.r) return { c: a.c, r: a.r }; if (d + a.r <= b.r) return { c: b.c, r: b.r };
    const r = (d + a.r + b.r) / 2, k = (r - a.r) / max(d, 1e-6);
    return { c: add(a.c, mul(sub(b.c, a.c), k)), r };
  };
  for (;;){
    let best = null;
    for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++){ const m = merge(G[i], G[j]); if (m.r <= maxR && (!best || m.r < best.m.r)) best = { i, j, m }; }
    if (!best) break;
    const a = G[best.i], b = G[best.j];
    G.splice(best.j, 1); G[best.i] = { c: best.m.c, r: best.m.r, F: a.F.concat(b.F) };
  }
  // точный радиус группы и граница шага по скалам
  for (const g of G){
    let r = 0, rin = -1e9;
    for (const f of g.F){ const s = this.terSphere(f), dc = dist(s.c, g.c); r = max(r, dc + s.r); if (s.rin !== null) rin = max(rin, dc + s.rin); }
    g.r = r + 0.5; g.rin = rin > -1e8 ? rin : null;
  }
  return G;
};
PERF811.terMap = function(){
  const T = TER81, v = a => `vec3(${f5(a)})`, n4 = x => (+x).toFixed(4);
  const out = { 1: [], '-1': [] }; let ng = 0;
  for (const hemi of [1, -1]){
    const G = this.terClusters(T.F.filter(f => f.hemi === hemi), +(PERF811.q('terR811') || 150));
    for (const g of G){
      const body = g.F.map(f => this.terCode(f)).join('\n  ');
      if (g.F.length === 1){ out[hemi].push(body); continue; }
      ng++;
      out[hemi].push(`{ vec3 gq = p - ${v(g.c)}; float g2 = dot(gq, gq); if (g2 < ${n4(g.r * g.r)}){
  ${body}
  }${g.rin !== null ? ` else { float e = d + ${n4(g.rin)}; if (g2 < e * e) d = sqrt(g2) - ${n4(g.rin)}; }` : ''} }`);
    }
  }
  this.stats.terGroups = ng;
  return `float ter81(vec3 p, vec3 n, float r, float d, inout float mask){   // v811: детали TER81 по группам (PERF811.terMap)
  if (n.y > -0.08){
  ${out[1].join('\n  ')}
  }
  if (n.y < 0.08){
  ${out[-1].join('\n  ')}
  }
  return d;
}
`;
};
if (typeof TER81 !== 'undefined' && TER81.on){
  const gm0 = TER81.glslMap;
  TER81.glslMap = function(){
    const s = gm0.apply(this, arguments);
    if (!PERF811.on || PERF811.q('ter811') !== '1') return s;   // замер: на SwiftShader группы не дали выигрыша (в пределах шума, скорее −3…5 %) — по умолчанию выкл., ?ter811=1 — вкл.
    const r = PERF811.safe(() => { const i = s.indexOf('float ter81(vec3 p'), j = s.indexOf('void ter81mat(', i); if (i < 0 || j < 0) return null; return s.slice(0, i) + PERF811.terMap() + s.slice(j); }, 'ter');
    return r || s;
  };
}
// ---------------------------------------------------------------------
//  2a) ТО ЖЕ В JS-ФИЗИКЕ: mapStatic → TER81.sdf зовётся ~2000 раз за шаг симуляции (коллизии, нормали, «на земле ли»),
//      и каждый раз перебирал все 26 деталей. Теперь — индекс по направлению (куб-карта ~2.5°): в ячейке хранится список
//      деталей, чьи проверки могут сработать в ней (с запасом); перебираются только они, в том же порядке и с теми же
//      проверками — результат бит-в-бит тот же. Вдали от деталей (почти весь метеорит) — ни одной проверки.
// ---------------------------------------------------------------------
PERF811.terIdx = function(){
  const T = TER81, F = T.F, N = 36, cells = new Array(6 * N * N);
  const cellR = Math.sqrt(2) * (2 / N) * 1.05;   // угловой радиус ячейки грани (в худшем — у центра грани), с запасом
  const capOf = f => {
    if (f.type === 'lake') return { c: f.c, a: Math.acos(clamp(f.cb, -1, 1)) };
    const L = len(f.bc); return { c: mul(f.bc, 1 / L), a: f.br >= L ? PI : Math.asin(f.br / L) };
  };
  const caps = F.map(capOf);
  const dirOf = (face, u, v) => norm([[1, u, v], [-1, u, v], [u, 1, v], [u, -1, v], [u, v, 1], [u, v, -1]][face]);   // = PERF811.terCell
  for (let face = 0; face < 6; face++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++){
    const u = -1 + (i + 0.5) * 2 / N, v = -1 + (j + 0.5) * 2 / N, d = dirOf(face, u, v);
    const L = [];
    for (let k = 0; k < F.length; k++){ const c = caps[k]; const ang = Math.acos(clamp(dot(d, c.c), -1, 1)); if (ang <= c.a + cellR) L.push(F[k]); }
    cells[(face * N + i) * N + j] = L.length ? L : null;
  }
  this.terCells = cells; this.terN = N;
};
PERF811.terCell = function(nx, ny, nz){
  const ax = abs(nx), ay = abs(ny), az = abs(nz), N = this.terN;
  let face, u, v;
  if (ax >= ay && ax >= az){ face = nx > 0 ? 0 : 1; u = ny / ax; v = nz / ax; }
  else if (ay >= az){ face = ny > 0 ? 2 : 3; u = nx / ay; v = nz / ay; }
  else { face = nz > 0 ? 4 : 5; u = nx / az; v = ny / az; }
  let i = floor((u + 1) * 0.5 * N), j = floor((v + 1) * 0.5 * N);
  if (i >= N) i = N - 1; else if (i < 0) i = 0; if (j >= N) j = N - 1; else if (j < 0) j = 0;
  return this.terCells[(face * N + i) * N + j];
};
if (typeof TER81 !== 'undefined' && TER81.on && PERF811.on && PERF811.q('terjs811') !== '0'){
  const sdf0 = TER81.sdf;
  TER81.sdf = function(x, y, z, r, nx, ny, nz, d){
    if (!this.ready) return sdf0.apply(this, arguments);
    if (PERF811.terF !== this.F){ PERF811.terF = this.F; PERF811.safe(() => PERF811.terIdx(), 'teridx'); }
    const L = PERF811.terCells ? PERF811.terCell(nx, ny, nz) : undefined;
    if (L === undefined) return sdf0.apply(this, arguments);
    this.mk = 1;
    if (!L) return d;
    const F0 = this.F; this.F = L;   // тот же код v8.1, только по списку ячейки
    try { return sdf0.call(this, x, y, z, r, nx, ny, nz, d); } finally { this.F = F0; }
  };
}
// ---------------------------------------------------------------------
//  2b) БИОМЫ v8.6 (BIO86) в material(): мелкие детали (стебли, споры, искры снега) домножались на «близость»
//      exp(−0.02·дальность), но шум считался и вдали. Теперь вдали (вклад < 2 %) шум не считается — картинка та же.
// ---------------------------------------------------------------------
PERF811.BIO_REP = [
  // на «Низкой» мелкие детали биомов (стебли, споры, искры) не считаются совсем — остаются цвет, пятна и кристаллы
  ['float n1 = nz(p * 0.29), near = exp(-gDist * 0.02);', 'float n1 = nz(p * 0.29), near = uQ == 0 ? 0.0 : exp(-gDist * 0.02);   // v811'],
  ['float n2 = mix(0.5, nz(p * 1.37 + 7.1), near);', 'float n2 = near > 0.02 ? mix(0.5, nz(p * 1.37 + 7.1), near) : 0.5;   // v811'],
  ['float bl = mix(0.5, nz(vec3(p.x * 4.1, p.y * 4.3, p.z * 3.9)), near);', 'float bl = near > 0.02 ? mix(0.5, nz(vec3(p.x * 4.1, p.y * 4.3, p.z * 3.9)), near) : 0.5;   // v811'],
  ['float spo = smoothstep(0.88, 0.94, nz(p * 2.1 + vec3(0.0, uTime * 0.12, 0.0))) * near;', 'float spo = near > 0.02 ? smoothstep(0.88, 0.94, nz(p * 2.1 + vec3(0.0, uTime * 0.12, 0.0))) * near : 0.0;   // v811'],
  ['e = vec3(1.1, 1.15, 1.25) * smoothstep(0.955, 0.985, nz(p * 3.3)) * f2 * exp(-gDist * 0.05) * 0.6;', 'if (gDist < 80.0 && uQ > 0) e = vec3(1.1, 1.15, 1.25) * smoothstep(0.955, 0.985, nz(p * 3.3)) * f2 * exp(-gDist * 0.05) * 0.6;   // v811'],
];
if (typeof BIO86 !== 'undefined' && BIO86.glslTail){
  const gt0 = BIO86.glslTail;
  BIO86.glslTail = function(){
    let s = gt0.apply(this, arguments);
    if (!PERF811.on || PERF811.q('bio811') === '0' || typeof s !== 'string') return s;
    let n = 0; for (const [a, b] of PERF811.BIO_REP) if (s.indexOf(a) >= 0){ s = s.split(a).join(b); n++; }
    PERF811.stats.bioRep = n; return s;
  };
}
// ---------------------------------------------------------------------
//  3) АДАПТИВНАЯ ГРАФИКА (ADG80): нижний предел масштаба «Низкой» был 35 % от экрана — на 4K/1440p это всё ещё
//     0.6–0.9 Мпикс (Intel UHD 630 не вытягивает). Теперь «Низкая» может опуститься до 640×360 (но не ниже 25 %),
//     прежде чем покажет подсказку про «Денди». На телефоне (экран меньше) — как было.
// ---------------------------------------------------------------------
//     Сильная просадка в бою (FPS < 60 % цели, например меню было лёгким, а бой тяжёлый): раньше спуск шёл шагами по
//     ×0.85 раз в ~4 с — с «Ультры» до «Низкой» ~22 с тормозов. Теперь при такой просадке шаг ×0.7 и реакция за 1 с.
if (typeof ADG80 !== 'undefined' && PERF811.on){
  const ss0 = ADG80.steadyStep, dn0 = ADG80.down;
  ADG80.steadyStep = function(f, now){ const r = f / this.target(); if (r < 0.6 && this.hold <= 0 && PERF811.q('adg811') !== '0') this.low = max(this.low, 1); return ss0.apply(this, arguments); };
  ADG80.down = function(r, probe, now){ if (!probe && r < 0.6 && PERF811.q('adg811') !== '0'){ PERF811.stats.adgFast = (PERF811.stats.adgFast || 0) + 1; return dn0.call(this, max(r, 0.54), true, now); } return dn0.apply(this, arguments); };
  const mn0 = ADG80.min;
  ADG80.min = function(L){ const m = mn0.call(this, L); if (L !== 0) return m; const A = max(1, innerWidth * innerHeight); return min(m, max(0.25, Math.sqrt(640 * 360 / A))); };
}
// варианты для замеров: правим итоговый исходник (после всех «хвостов» модулей) прямо в gl.shaderSource
{ const L = PERF811.devList();
  if (L.length && typeof gl !== 'undefined'){
    const ss0 = gl.shaderSource.bind(gl);
    gl.shaderSource = function(sh, src){
      if (typeof src === 'string' && src.indexOf('uBounces') >= 0){ PERF811.stats.dev = []; for (const k of L) for (const [a, b] of PERF811.DEV[k]){ const n = src.split(a).length - 1; PERF811.stats.dev.push(k + ':' + n); src = src.split(a).join(b); } }
      return ss0(sh, src);
    };
  }
}
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.11'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.11'; }
