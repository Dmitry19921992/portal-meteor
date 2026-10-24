// =====================================================================
//  v7.5 «ДЕНДИ» — опциональный стиль графики: «Денди (8-бит)» (палитра NES, 54 цвета) и «16-бит (512 цветов)».
//  Рецепт (папка «денди» на рабочем столе), адаптированный к рэймарчеру:
//   1) низкое внутреннее разрешение (120/180/240 строк): canvas маленький, растягивается CSS с image-rendering:pixelated
//      (NEAREST-апскейл без лишнего прохода); HUD — отдельный canvas #ov и DOM, остаётся чётким;
//   2) текстуры без сглаживания — у рэймарчера процедурные материалы, их «пикселит» само низкое разрешение;
//   3) свет в 3 ступени — в scene.glsl под юниформом uDen (солнце и точечные источники);
//   4) пиксельная обводка 1 px по глубине: силуэт и сгибы граней — по обратной глубине 1/z
//      (для плоскости она линейна на экране — нет ложных линий на далёкой земле; нормали не нужны);
//   5) палитра NES 54 цвета (или 3 бита на канал = 512 цветов) + дизеринг Байера 4×4;
//   6) рубленая анимация floor(t*fps)/fps: время шейдера (вращение, мигание, пламя), фаза шага бойцов,
//      скелетные анимации тяжёлых, огонь/дым/обломки. Камера, управление и симуляция — плавные.
//  + привязка поворота камеры к пиксельной сетке со сдвигом картинки на остаток (меньше «ползающих пикселей»).
//  Выключено («Обычный») — ни одна обёртка не трогает GL, uDen = 0: рендер как в v7.4.
//  Хуки в чужом коде: только scene.glsl/post.glsl (uDen) и строка в build.py. Остальное — обёртки здесь:
//  resize, render, gatherObjects, gatherParticles, HV65.animate, WPN69.draw, CAM66.glRect, applySettings, меню.
// =====================================================================
for (const [k, v] of [['denStyle', 0], ['denRows', 0], ['denChop', 12], ['denOut', true], ['denDith', true], ['denSnap', true]]){
  if (SET_DEF[k] === undefined) SET_DEF[k] = v;
  if (SET[k] === undefined) SET[k] = v;
}
SCENE_U.push('uDen'); POST_U.push('uDen');
const DEN75 = {
  // палитра NES 2C02 (как в демо dendy_sklad.html)
  NES: ['7C7C7C','0000FC','0000BC','4428BC','940084','A80020','A81000','881400','503000','007800','006800','005800','004058','000000',
        'BCBCBC','0078F8','0058F8','6844FC','D800CC','E40058','F83800','E45C10','AC7C00','00B800','00A800','00A844','008888',
        'F8F8F8','3CBCFC','6888FC','9878F8','F878F8','F85898','F87858','FCA044','F8B800','B8F818','58D854','58F898','00E8D8','787878',
        'FCFCFC','A4E4FC','B8B8F8','D8B8F8','F8B8F8','F8A4C0','F0D0B0','FCE0A8','F8D878','D8F878','B8F8B8','B8F8D8','00FCFC','F8D8F8'],
  st: { P: null, col: null, dep: null, dep2: null, fbc: null, w: 0, h: 0 },
  M: 1, k: 1, R: 180, tick: -1, newTick: true, nowQ: 0, adv: false, uSet: false, failed: false, anchor: null,
  sx: 0, sy: 0, wpn: false, key: '', stats: { ms: 0, w: 0, h: 0 },
  style(){ return SET.denStyle | 0; },
  active(){ return this.style() > 0 && !S.fixedRes && !this.failed; },
  rows(){ const r = SET.denRows | 0; return r === 120 || r === 180 || r === 240 ? r : (this.style() === 2 ? 240 : 180); },
  chopOn(){ return this.active() && (SET.denChop | 0) > 0; },
  CH(){
    return {
      denStyle: [[0, tr('Обычный', 'Normal', 'Thường', 'רגיל')], [1, tr('Денди (8-бит)', 'Dendy (8-bit)', 'Dendy (8-bit)', 'Dendy (8-bit)')], [2, tr('16-бит (512 цветов)', '16-bit (512 colors)', '16-bit (512 màu)', '16-bit (512 צבעים)')]],
      denRows: [[0, tr('авто', 'auto', 'tự động', 'אוטו')], [120, '120'], [180, '180'], [240, '240']],
      denChop: [[0, tr('выкл', 'off', 'tắt', 'כבוי')], [6, tr('6 к/с', '6 fps', '6 khung/s', '6 fps')], [12, tr('12 к/с', '12 fps', '12 khung/s', '12 fps')]],
    };
  },
  fail(e){
    if (!this.err){ this.err = 1; console.warn('DEN75', e); }
    this.failed = true;
    try { this.uniforms(0); } catch (_){}
    try { resize(); } catch (_){}
  },
  // ---------------------------------------------------------------- шейдер финального прохода (обводка → палитра → дизеринг)
  tol: [0.05, 0.02, 0.3, 0.68],    // силуэт (доля 1/z), сгиб, множитель цвета силуэта, множитель сгиба
  gain: [1.1, 1.7, 0.85],          // гамма, насыщенность, яркость перед палитрой (картинка игры приглушённая — иначе всё уходит в серый NES)
  gain16: [1.0, 1.3, 0.95],        // 16-бит: 512 цветов передают оттенки и так — усиливаем меньше
  dith: 0.08,
  fade: [160, 300, 70, 220],       // обводка гаснет 160→300 м, дизеринг 70→220 м
  prog(){
    if (this.st.P) return this.st.P;
    const FS = `#version 300 es
precision highp float;
uniform sampler2D uCol; uniform highp sampler2D uDep; uniform highp sampler2D uDep2;
uniform vec2 uRes; uniform int uMode; uniform float uOut, uDith, uWpn; uniform vec4 uNoOut;
uniform vec3 uPal[54]; uniform vec4 uTol; uniform vec3 uGain; uniform vec4 uFade;
out vec4 frag;
const float B[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
const float LG = 12.8992198;   // log(400000) — та же логарифмическая глубина, что в scene.glsl / heavy65.js
float W(ivec2 p){   // обратная глубина 1/z: у плоскости она линейна на экране — нет ложных линий на дальней земле
  p = clamp(p, ivec2(0), ivec2(uRes) - 1);
  if (uWpn > 0.5){   // 3D-оружие в руках (v69_guns.js): своя глубина, обычная проекция near 0.01, far 10
    float dw = texelFetch(uDep2, p, 0).r;
    if (dw < 0.99999) return (10.01 - (2.0 * dw - 1.0) * 9.99) / 0.2;
  }
  return 20.0 * exp(-texelFetch(uDep, p, 0).r * LG);
}
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 c = texelFetch(uCol, p, 0).rgb;
  vec2 q = gl_FragCoord.xy - uNoOut.xy;
  if (uOut > 0.5 && !(q.x > 0.0 && q.y > 0.0 && q.x < uNoOut.z && q.y < uNoOut.w)){   // uNoOut — окно живого портрета (стратегия)
    float w0 = W(p);
    // вторая разность обратной глубины: у плоскости 0 (1/z линейна на экране); > 0 — пиксель ближе соседей:
    // ближний край разрыва глубины (силуэт, 1 px с ближней стороны) или выпуклый сгиб грани
    float lap = max(2.0 * w0 - W(p + ivec2(-1, 0)) - W(p + ivec2(1, 0)), 2.0 * w0 - W(p + ivec2(0, -1)) - W(p + ivec2(0, 1)));
    float fade = 1.0 - smoothstep(uFade.x, uFade.y, 1.0 / max(w0, 1e-6));   // далеко — без линий (иначе рябь на скалах)
    if (lap > uTol.x * w0) c *= mix(1.0, uTol.z, fade);
    else if (lap > uTol.y * w0) c *= mix(1.0, uTol.w, fade);
  }
  c = pow(max(c, vec3(0.0)), vec3(uGain.x)) * uGain.z;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = max(vec3(0.0), mix(vec3(l), c, uGain.y));
  // дизеринг только вблизи: небо и даль — ровными пятнами палитры (как фон в рецепте), без «снега»
  float b = (B[(p.y & 3) * 4 + (p.x & 3)] / 16.0 - 0.47) * (1.0 - smoothstep(uFade.z, uFade.w, 1.0 / max(W(p), 1e-6)));
  if (uMode == 1){
    c += b * uDith;
    vec3 best = uPal[0]; float be = 1e9;
    for (int i = 0; i < 54; i++){ vec3 d = c - uPal[i]; float e = dot(d * d, vec3(0.35, 0.5, 0.25)); if (e < be){ be = e; best = uPal[i]; } }
    c = best;
  } else if (uMode == 2){
    c += b * uDith * 0.6;
    c = floor(clamp(c, 0.0, 1.0) * 7.0 + 0.5) / 7.0;
  }
  frag = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
    const P = finishProgram(startProgram(FS), ['uCol', 'uDep', 'uDep2', 'uRes', 'uMode', 'uOut', 'uDith', 'uWpn', 'uNoOut', 'uPal', 'uTol', 'uGain', 'uFade']);
    this.pal = new Float32Array(this.NES.flatMap(h => { const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }));
    return (this.st.P = P);
  },
  // ---------------------------------------------------------------- буферы низкого разрешения
  build(w, h){
    const s = this.st;
    for (const t of [s.dep, s.dep2, s.col]) if (t) gl.deleteTexture(t);
    if (s.fbc) gl.deleteFramebuffer(s.fbc);
    const tex = (ifmt, fmt, type) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    s.dep = tex(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT);
    s.dep2 = tex(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT);
    s.col = tex(gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);   // копия кадра после пост-обработки (copyTexSubImage2D из экрана без альфы)
    const OK = () => gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    // глубина рэймарчера — в текстуру (вместо renderbuffer из makeFBO), чтобы обводка могла её читать
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, s.dep, 0); const ok1 = OK();
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, s.dep2, 0); const ok2 = OK();   // проверка: сюда пишет 3D-оружие (WPN69)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, s.dep, 0);
    s.fbc = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, s.fbc); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, s.col, 0); const ok3 = OK();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null);
    if (!(ok1 && ok2 && ok3)) throw new Error('dendy fbo ' + [ok1, ok2, ok3]);
    s.w = w; s.h = h;
  },
  resize(rs0){
    const R = this.R = this.rows(), m = this.M = SET.denSnap !== false ? 1 : 0;
    const W = max(64, innerWidth), H = max(36, innerHeight), px = H / R;   // CSS-пикселей на один «денди-пиксель»
    const w = Math.ceil(W / px - 1e-6) + 2 * m, h = R + 2 * m;           // + поля по 1 px: под сдвиг привязки к сетке
    S.fixedRes = [w, h];
    try { rs0(); } finally { S.fixedRes = null; }
    this.px = px; this.w = w; this.h = h;
    this.build(w, h);
    this.css(true);
    this.anchor = null; this.tx = this.ty = 0;
    this.stats.w = w; this.stats.h = h;
  },
  css(on){
    const st = canvas.style;
    if (!on){ if (this.cssOn){ for (const k of ['width', 'height', 'left', 'top', 'right', 'bottom', 'transform', 'imageRendering']) st[k] = ''; this.cssOn = false; } return; }
    this.cssOn = true;
    const px = this.px;
    st.width = (this.w * px) + 'px'; st.height = (this.h * px) + 'px';
    st.left = ((innerWidth - this.w * px) / 2) + 'px'; st.top = ((innerHeight - this.h * px) / 2) + 'px'; st.right = st.bottom = 'auto';
    st.imageRendering = 'pixelated'; if (!st.imageRendering) st.imageRendering = 'crisp-edges';   // NEAREST-апскейл силами браузера
    st.transform = ''; this.tcss = '';
  },
  drop(){
    const s = this.st;
    if (!s.w) return;
    for (const t of [s.dep, s.dep2, s.col]) if (t) gl.deleteTexture(t);
    if (s.fbc) gl.deleteFramebuffer(s.fbc);
    s.dep = s.dep2 = s.col = s.fbc = null; s.w = s.h = 0;
  },
  shift(x, y){
    const t = (x || y) ? `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` : '';
    if (t !== this.tcss){ canvas.style.transform = t; this.tcss = t; }
  },
  // ---------------------------------------------------------------- юниформы uDen в scene.glsl / post.glsl (по умолчанию 0 — как раньше)
  uVal: 0, lit: [0.3, 0.6, 1.2],   // уровни полутона и света солнца, добавка рассеянного в тени
  uniforms(v){
    if (!SCENE || !POST) return;
    const x = v > 0 ? 1 : 0, k = x + this.lit.join();
    if (this.uVal === x && (!x || this.uKey === k)) return;
    this.uVal = x; this.uKey = k;
    gl.useProgram(SCENE.p); gl.uniform4f(SCENE.U.uDen, x, this.lit[0], this.lit[1], this.lit[2]);
    gl.useProgram(POST.p); gl.uniform1f(POST.U.uDen, x);
  },
  // ---------------------------------------------------------------- камера: поля 1 px и привязка поворота к пиксельной сетке
  // Поворот камеры квантуется так, чтобы картинка сдвигалась на целое число «денди-пикселей» (сетка лучей та же —
  // пиксели не «кипят»), а остаток (< 0.5 px) показывается плавным сдвигом canvas в CSS. Перемещение камеры так
  // не лечится (перспектива), см. REPORT_dendy.md.
  snapCam(c){
    const fov = c.fov * this.h / this.R;   // поля по 1 px сверху и снизу: масштаб совпадает с HUD (project() в ui.js)
    const out = Object.assign({}, c, { fov });
    if (!this.M || SET.denSnap === false){ this.shift(0, 0); return out; }
    const pa = fov / this.h;               // тангенс угла на один пиксель
    const f = c.fwd;
    // камера «опоры», повёрнутая на целое число пикселей; базис — от опоры (не от настоящей камеры):
    // внутри одного «пиксельного шага» камера в точности та же — картинка не меняется
    const snapTo = A => {
      const fz = dot(f, A.fwd); if (!(fz > 0.9)) return null;
      const tx = dot(f, A.right) / fz, ty = dot(f, A.up) / fz;
      const fq = norm(add(A.fwd, add(mul(A.right, Math.round(tx / pa) * pa), mul(A.up, Math.round(ty / pa) * pa))));
      const right = norm(cross(fq, A.up)), up = cross(right, fq);
      const zf = dot(fq, c.fwd), ex = dot(fq, c.right) / zf / pa, ey = dot(fq, c.up) / zf / pa;
      // крен снимка относительно настоящей камеры (у шара «верх» меняется при ходьбе, у наклонной камеры — при повороте):
      // > 0.004 рад — на краю экрана расхождение с HUD уже ~0.4 px → новая опора
      if (abs(dot(c.right, up)) > 0.004 || abs(ex) > 1.2 || abs(ey) > 1.2) return null;
      return { fq, right, up, ex, ey };
    };
    let s = this.anchor && snapTo(this.anchor);
    if (!s){ this.anchor = { fwd: f.slice(), right: c.right.slice(), up: c.up.slice() }; s = snapTo(this.anchor); }
    if (!s){ this.shift(0, 0); return out; }
    out.fwd = s.fq; out.right = s.right; out.up = s.up;
    this.shift(clamp(s.ex, -1, 1) * this.px, -clamp(s.ey, -1, 1) * this.px);   // остаток < 1 px — плавным сдвигом canvas (поля по 1 px)
    return out;
  },
  // ---------------------------------------------------------------- рубленая анимация
  hold: new WeakMap(),
  clock(now){
    const fps = SET.denChop | 0;
    if (fps > 0){ const t = Math.floor(now / 1000 * fps); this.newTick = t !== this.tick; this.tick = t; this.nowQ = t * 1000 / fps; }
    else { this.newTick = true; this.nowQ = now; }
  },
  holdPhases(){   // фаза шага/анимации бойцов в шейдере (OBJ: 15-е число объекта)
    const nt = this.newTick, H = this.hold;
    for (let i = 0; i < renderList.length; i++){
      const e = renderList[i].e; let h = H.get(e);
      if (nt || !h){ h = { ph: e.phase || 0 }; H.set(e, h); }
      else if (h.ph === undefined) h.ph = e.phase || 0;
      OBJ[i * 28 + 15] = h.ph;
    }
  },
  fxLists(){ const L = [S.fx]; if (typeof GFX72 !== 'undefined'){ L.push(GFX72.deb, GFX72.dust); } return L; },
  holdFx(){   // огонь, дым, обломки, пыль: между «кадрами» показываем положение и возраст с прошлого кадра
    const nt = this.newTick, H = this.hold, back = [];
    for (const L of this.fxLists()) for (const o of L){
      let h = H.get(o);
      if (nt || !h || h.t === undefined){ H.set(o, { pos: o.pos, t: o.t }); continue; }
      back.push([o, o.pos, o.t]); o.pos = h.pos; o.t = h.t;
    }
    return back;
  },
  // ---------------------------------------------------------------- финальный проход: кадр после пост-обработки → обводка, палитра, дизеринг
  pass(){
    const s = this.st, P = this.prog(), U = P.U, t0 = performance.now();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.col);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, s.w, s.h);
    gl.viewport(0, 0, s.w, s.h);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(P.p);
    gl.uniform1i(U.uCol, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, s.dep); gl.uniform1i(U.uDep, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, s.dep2); gl.uniform1i(U.uDep2, 2);
    gl.uniform2f(U.uRes, s.w, s.h);
    gl.uniform1i(U.uMode, this.dbgMode !== undefined ? this.dbgMode : this.style() === 2 ? 2 : 1);   // dbgMode 0 — без палитры (отладка)
    gl.uniform1f(U.uOut, SET.denOut !== false ? 1 : 0);
    gl.uniform1f(U.uDith, SET.denDith !== false ? this.dith : 0);
    gl.uniform1f(U.uWpn, this.wpn ? 1 : 0);
    let R = null;
    if (typeof CAM66 !== 'undefined' && CAM66.shown && CAM66.cur) try { R = CAM66.glRect(); } catch (e){}
    gl.uniform4f(U.uNoOut, R ? R.x : 0, R ? R.y : 0, R ? R.w : 0, R ? R.h : 0);
    gl.uniform3fv(U.uPal, this.pal);
    gl.uniform4fv(U.uTol, this.tol);
    gl.uniform3fv(U.uGain, this.style() === 2 ? this.gain16 : this.gain);
    gl.uniform4fv(U.uFade, this.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // вернуть привязки, которых ждёт следующий кадр (texPar на 1-м блоке; 3D-шум на 2-м не трогали)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texPar);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
  },
  keyNow(){ return [this.active(), this.rows(), SET.denSnap !== false, innerWidth, innerHeight, devicePixelRatio].join(); },
  sync(){
    if (!fbo) return;   // ещё загрузка: resize() вызовет boot
    if ((this.active() || this.st.w || this.cssOn) && this.keyNow() !== this.key) resize();   // «Обычный» без перемен — лишнего resize нет
    if (!this.active() && SCENE) this.uniforms(0);
  },
  set(style, o){   // для тестов и консоли: DEN75.set(1, { denRows: 120 })
    SET.denStyle = style | 0; if (o) Object.assign(SET, o);
    applySettings(); MENU.save();
  },
};
// ---------------------------------------------------------------- обёртки (при стиле «Обычный» — сразу оригинал)
{ const rs0 = resize;
  resize = function(){
    const D = DEN75;
    if (D.active()){
      if (D.st.w && D.key === D.keyNow() && canvas.width === D.w) return;   // авторазрешение/лёгкий режим меняют S.scale — в «Денди» он не нужен
      try { D.resize(rs0); D.key = D.keyNow(); } catch (e){ D.fail(e); }
      return;
    }
    if (D.st.w) D.drop();
    D.css(false);
    rs0.apply(this, arguments);
    D.key = D.keyNow();
  }; }
{ const r0 = render;
  render = function(dt, now){
    const D = DEN75;
    if (!D.active()){ if (D.uVal) D.uniforms(0); return r0(dt, now); }
    if (!D.st.w){ resize(); if (!D.active() || !D.st.w) return r0(dt, now); }
    try {
      D.uniforms(1);
      D.clock(now);
      const cam = S.cam; S.cam = D.snapCam(cam);
      D.wpn = false; D.frameOn = true;
      try { r0(dt, D.chopOn() ? D.nowQ : now); } finally { S.cam = cam; D.frameOn = false; }
      D.pass();
    } catch (e){ D.fail(e); }
  }; }
{ const go0 = gatherObjects;
  gatherObjects = function(){ const r = go0.apply(this, arguments); if (DEN75.frameOn && DEN75.chopOn()) DEN75.holdPhases(); return r; }; }
{ const gp0 = gatherParticles;
  gatherParticles = function(){
    if (!DEN75.frameOn || !DEN75.chopOn()) return gp0.apply(this, arguments);
    const back = DEN75.holdFx();
    try { return gp0.apply(this, arguments); } finally { for (const [o, p, t] of back){ o.pos = p; o.t = t; } }
  }; }
if (typeof HV65 !== 'undefined' && HV65.animate){   // скелетные анимации тяжёлых бойцов — позы раз в «денди-кадр»
  const a0 = HV65.animate;
  HV65.animate = function(e, st, dt){
    const D = DEN75;
    if (!D.frameOn || !D.chopOn()) return a0.call(this, e, st, dt);
    st.den75 = (st.den75 || 0) + dt;
    if (st.den75tk === D.tick && st.posed) return;
    st.den75tk = D.tick; const d = min(0.3, st.den75); st.den75 = 0;
    return a0.call(this, e, st, d);
  };
}
if (typeof WPN69 !== 'undefined' && WPN69.draw){   // 3D-оружие в руках чистит буфер глубины — пишем его глубину в отдельную текстуру
  const wd0 = WPN69.draw;
  WPN69.draw = function(){
    const D = DEN75;
    if (!D.frameOn || !D.st.dep2) return wd0.apply(this, arguments);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, D.st.dep2, 0);
    try { D.wpn = true; return wd0.apply(this, arguments); }
    finally { gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, D.st.dep, 0); }
  };
}
if (typeof CAM66 !== 'undefined' && CAM66.glRect){   // живой портрет: canvas теперь сдвинут и растянут CSS
  const g0 = CAM66.glRect;
  CAM66.glRect = function(){
    if (!DEN75.cssOn) return g0.apply(this, arguments);
    const v = this.el && this.el.querySelector('.v'); if (!v) return null;
    const r = v.getBoundingClientRect(); if (r.width < 8) return null;
    const cr = canvas.getBoundingClientRect(), sx = canvas.width / cr.width, sy = canvas.height / cr.height;
    return { x: Math.round((r.left - cr.left) * sx), y: Math.round((cr.bottom - r.bottom) * sy), w: Math.round(r.width * sx), h: Math.round(r.height * sy), css: r };
  };
}
{ const as0 = applySettings;
  applySettings = function(){ const r = as0.apply(this, arguments); try { DEN75.sync(); } catch (e){ DEN75.fail(e); } return r; }; }
// адресная строка: ?dendy=0|1|2 (и &rows=120|180|240) — для проверки и скриншотов
{ const ld0 = MENU.load;
  MENU.load = function(){
    const r = ld0.apply(this, arguments);
    try {
      const q = new URLSearchParams(location.search), d = q.get('dendy'), rw = q.get('rows');
      if (d === '0' || d === '1' || d === '2') SET.denStyle = +d;
      if (rw === '120' || rw === '180' || rw === '240') SET.denRows = +rw;
    } catch (e){}
    return r;
  }; }
// ---------------------------------------------------------------- меню: «Стиль графики» на виду, детали — в «Расширенных»
DEN75.labels = () => ({
  style: tr('Стиль графики', 'Graphics style', 'Phong cách đồ họa', 'סגנון גרפיקה'),
  adv: tr('Расширенные: пиксель, анимация, обводка', 'Advanced: pixels, animation, outline', 'Nâng cao: điểm ảnh, hoạt ảnh, viền', 'מתקדם: פיקסלים, אנימציה, קווי מתאר'),
  rows: tr('Размер пикселя (строк на экран)', 'Pixel size (lines per screen)', 'Cỡ điểm ảnh (số dòng)', 'גודל פיקסל (שורות)'),
  chop: tr('Рубленая анимация (юниты и эффекты)', 'Choppy animation (units and effects)', 'Hoạt ảnh giật (lính và hiệu ứng)', 'אנימציה קטועה (יחידות ואפקטים)'),
  out: tr('Пиксельная обводка', 'Pixel outline', 'Viền điểm ảnh', 'קו מתאר פיקסלי'),
  dith: tr('Дизеринг (узор Байера)', 'Dithering (Bayer pattern)', 'Dithering (Bayer)', 'דיתרינג (באייר)'),
  snap: tr('Привязка камеры к пикселям (меньше «ползания»)', 'Camera pixel snapping (less shimmer)', 'Khớp camera theo điểm ảnh', 'הצמדת מצלמה לפיקסלים'),
  note: tr('Интерфейс остаётся чётким; стиль «Денди» ещё и быстрее (меньше пикселей).', 'The HUD stays sharp; the Dendy style is also faster (fewer pixels).', 'Giao diện vẫn sắc nét; kiểu Dendy còn nhanh hơn.', 'הממשק נשאר חד; סגנון Dendy גם מהיר יותר.'),
});
DEN75.pcRows = function(row, ch, tog){
  const L = this.labels(), C = this.CH();
  let h = row(L.style, ch('denStyle', C.denStyle));
  if (this.style() > 0) h += `<div class="row den75adv"><label><small>${L.adv}</small></label><button class="tog ${this.adv ? 'on' : ''}" data-den75adv="1">⚙ ${this.adv ? '▾' : '▸'}</button></div>`;
  if (this.style() > 0 && this.adv){
    h += `<div class="den75box">` + row(L.rows, ch('denRows', C.denRows)) + row(L.chop, ch('denChop', C.denChop)) +
         row(L.out, tog('denOut')) + row(L.dith, tog('denDith')) + row(L.snap, tog('denSnap')) + `<p class="note">${L.note}</p></div>`;
  }
  return h;
};
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    let h = hs0.apply(this, arguments);
    if (typeof P71M !== 'undefined' && P71M.on && P71M.on()) return h;   // телефон: свой экран «Графика»
    try {
      const row = (label, ctl) => `<div class="row"><label>${label}</label>${ctl}</div>`;
      const ch = (k, opts) => `<span class="chs">${opts.map(([v, n]) => `<button class="${SET[k] === v ? 'cur' : ''}" data-ch="${k}" data-v="${v}">${n}</button>`).join('')}</span>`;
      const tog = k => `<button class="tog ${SET[k] ? 'on' : ''}" data-tog="${k}">${SET[k] ? tr('ВКЛ', 'ON', 'BẬT', 'פועל') : tr('ВЫКЛ', 'OFF', 'TẮT', 'כבוי')}</button>`;
      const add = DEN75.pcRows(row, ch, tog);
      const re = /(<div class="row"><label>[^<]*<\/label><span class="chs"><button class="[^"]*" data-ch="quality")/;
      h = re.test(h) ? h.replace(re, add + '$1') : h.replace(/(<button class="tog[^"]*" data-tog="lite">[^<]*<\/button><\/div>)/, '$1' + add);
    } catch (e){ console.warn('DEN75 menu', e); }
    return h;
  }; }
// телефон: ☰ → Настройки → Графика — шаг «Стиль графики» сверху, детали под кнопкой «Расширенные»
if (typeof P71M !== 'undefined' && P71M.sec){
  const ch0 = P71M.CH;
  P71M.CH = function(){ return Object.assign(ch0.call(this), DEN75.CH()); };
  const sec0 = P71M.sec;
  P71M.sec = function(k){
    let h = sec0.apply(this, arguments);
    if (k !== 's_gfx') return h;
    try {
      const L = DEN75.labels(), on = DEN75.style() > 0;
      let add = this.step('denStyle', L.style);
      if (on) add += `<button class="p71o ${DEN75.adv ? 'on' : ''}" data-den75adv="1"><span>${L.adv}</span><b>${DEN75.adv ? '▾' : '▸'}</b></button>`;
      if (on && DEN75.adv) add += this.step('denRows', L.rows) + this.step('denChop', L.chop) + this.tog('denOut', L.out) + this.tog('denDith', L.dith) + this.tog('denSnap', L.snap);
      h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + add);
    } catch (e){ console.warn('DEN75 phone menu', e); }
    return h;
  };
}
{ // кнопка «Расширенные» (мышь и касание; любой экран настроек)
  let at = -1e9;
  const find = e => e.target && e.target.closest ? e.target.closest('[data-den75adv]') : null;
  const go = () => { DEN75.adv = !DEN75.adv; try { AU.init(); emit('ui', { kind: 'ok' }); } catch (e){} MENU.show(MENU.cur); };
  document.addEventListener('click', e => { if (!find(e)) return; e.stopPropagation(); e.preventDefault(); if (performance.now() - at < 700) return; go(); }, true);
  document.addEventListener('mousedown', e => { if (find(e)) e.stopPropagation(); }, true);
  document.addEventListener('touchstart', e => { if (find(e)) e.stopPropagation(); }, { capture: true, passive: true });
  document.addEventListener('touchend', e => { if (!find(e)) return; e.stopPropagation(); if (e.cancelable) e.preventDefault(); at = performance.now(); go(); }, { capture: true, passive: false });
}
(function(){ const st = document.createElement('style'); st.textContent = `
  #screen .den75box{margin:2px 0 6px 10px;padding-left:8px;border-left:2px solid rgba(214,198,154,.25)}
  #screen .row.den75adv{opacity:.85} #screen .row.den75adv button{min-width:52px}
  #screen .den75box .note{font-size:11px;opacity:.7;margin:4px 0}
`; document.head.appendChild(st); })();
