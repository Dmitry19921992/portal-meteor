// =====================================================================
//  v6.6 — ЖИВОЙ ПОРТРЕТ ВЫДЕЛЕННОГО ЮНИТА («ВЕБКА»)
//  Второй маленький проход того же рэймарчера (192×240, на телефоне 128×160) с камерой
//  у груди/головы юнита, раз в 2 кадра, + 3D-модель пулемётчика (HV65). Поверх —
//  VHS: строки развёртки, шум, дрожь строк, хроматическая аберрация, бегущая полоса,
//  тон по фракции. Рамка, имя, звание, HP, «● REC» — DOM поверх (окно прозрачное).
//  Картинка рисуется прямо в основной canvas (без readPixels) — дёшево.
// =====================================================================
const CAM66 = { on: true, ok: false, failed: false, fr: 0, g: null, pos: null, look: null, st: 0, nl: 0, np: 0, rect: null, ms: 0, drawn: 0, lastSig: '' };
{ const gl0 = gatherLights; gatherLights = function(){ return (CAM66.nl = gl0()); }; }
{ const gp0 = gatherParticles; gatherParticles = function(){ return (CAM66.np = gp0()); }; }
const CAM66_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes, uOrg; uniform float uTime, uExpo, uTeam, uHurt, uStatic;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = (gl_FragCoord.xy - uOrg) / uRes;
  float t = uTime;
  float ln = floor(uv.y * 140.0);
  float roll = fract(t * 0.11);
  float band = smoothstep(0.035, 0.0, abs(uv.y - roll));
  float glitch = step(0.94, h1(vec2(floor(t * 5.0), 3.1))) * step(0.6, h1(vec2(ln, floor(t * 30.0))));
  float wob = (h1(vec2(ln, floor(t * 24.0))) - 0.5) * 0.004 + sin(uv.y * 37.0 + t * 2.7) * 0.0012 + band * 0.012 + glitch * 0.03;
  vec2 c = uv - 0.5;
  vec2 q = 0.5 + c * (1.0 + 0.10 * dot(c, c));
  q.x += wob;
  vec3 col;
  col.r = texture(uTex, q + vec2(0.003, 0.0)).r;
  col.g = texture(uTex, q).g;
  col.b = texture(uTex, q - vec2(0.003, 0.0)).b;
  col = aces(col * uExpo);
  col = pow(col, vec3(1.0 / 2.2));
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.7);
  col *= uTeam < 0.5 ? vec3(1.06, 0.99, 0.80) : vec3(1.12, 0.86, 0.80);
  col *= 0.80 + 0.20 * sin(uv.y * uRes.y * 1.5708);
  float n = h1(gl_FragCoord.xy * 0.73 + vec2(t * 61.0, t * 17.0));
  col += (n - 0.5) * 0.10 + band * 0.07;
  col *= mix(0.55, 1.0, smoothstep(0.78, 0.25, length(c * vec2(1.0, 0.85))));
  col = mix(col, vec3(0.85, 0.12, 0.06), uHurt * (0.12 + 0.12 * sin(t * 9.0)));
  col = mix(col, vec3(n * 0.9), clamp(uStatic, 0.0, 1.0));
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) col = vec3(0.02);
  o = vec4(col, 1.0);
}`;
CAM66.init = function(){
  if (this.ok || this.failed) return this.ok;
  try {
    const phone = TOUCH.on || Math.min(innerWidth, innerHeight) < 500;
    this.W = phone ? 128 : 192; this.H = phone ? 160 : 240;
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, HDR ? gl.RGBA16F : gl.RGBA8, this.W, this.H);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    this.dep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.dep);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.W, this.H);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.dep);
    const okF = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!okF) throw new Error('fbo incomplete');
    const h = startProgram(CAM66_FS);
    this.P = finishProgram(h, ['uTex', 'uRes', 'uOrg', 'uTime', 'uExpo', 'uTeam', 'uHurt', 'uStatic']);
    this.ok = true;
  } catch (e){ this.failed = true; console.warn('CAM66: живой портрет отключён —', e && e.message); }
  return this.ok;
};
// кого снимаем: первый выделенный (лидер отряда)
CAM66.subject = function(){
  if (S.mode !== 'rts' || S.attract || S.over || !this.on || MENU.isOpen()) return null;
  const sel = selGroups(); if (!sel.length) return null;
  const g = sel[0], L = isSquad(g) ? (g.units.find(u => u.leader && u.alive) || g.units.find(u => u.alive)) : g;
  return L && L.alive ? { g, e: L } : null;
};
CAM66.camFor = function(e){
  const up = e.up || norm(e.pos), fwd = tangent(e.fwd || anyTangent(up), up), right = norm(cross(fwd, up));
  let tgt, want;
  const sway = sin(S.rtime * 0.7) * 0.12;
  if (e.cls === 'inf'){
    tgt = add(e.pos, mul(up, 0.45));
    // камера спереди-сбоку; если между ней и бойцом кто-то стоит — заходим с другой стороны
    let side = (e.id % 2 ? 1 : -1);
    const mk = s => add(add(add(tgt, mul(fwd, 1.75)), mul(up, 0.3)), mul(right, s * (0.55 + sway * 0.6)));
    want = mk(side);
    for (const u of (e.squad ? e.squad.units : [])){ if (u !== e && u.alive && segSphere(want, tgt, u.pos, 0.7)){ side = -side; want = mk(side); break; } }
  }
  else if (e.cls === 'builder'){ tgt = add(e.pos, mul(up, 0.6)); want = add(add(add(tgt, mul(fwd, 3.0)), mul(up, 0.9)), mul(right, 1.0 + sway)); }
  else if (e.cls === 'drone'){ tgt = e.pos; want = add(add(add(tgt, mul(fwd, 2.0)), mul(up, 0.45)), mul(right, 0.6 + sway)); }
  else { tgt = add(e.pos, mul(up, 1.2)); want = add(add(add(tgt, mul(fwd, 5.8)), mul(up, 1.5)), mul(right, 2.0 + sway * 3)); }
  want = pullCam(tgt, want);
  return { tgt, want };
};
CAM66.renderPass = function(){
  const s = this.cur; if (!s) return;
  const t0 = performance.now();
  const { tgt, want } = this.camFor(s.e);
  const k = this.snap ? 1 : 0.6;
  this.pos = this.pos && !this.snap ? add(this.pos, mul(sub(want, this.pos), k)) : want;
  this.look = this.look && !this.snap ? add(this.look, mul(sub(tgt, this.look), 0.8)) : tgt;
  this.snap = false;
  const cam = Object.assign({ pos: this.pos, fov: 2 * Math.tan(38 * PI / 360) }, camBasis(norm(sub(this.look, this.pos)), norm(this.pos)));
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
  gl.viewport(0, 0, this.W, this.H);
  gl.useProgram(SCENE.p);
  const U = SCENE.U;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texObj);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texPar);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_3D, texNoise);
  gl.uniform2f(U.uRes, this.W, this.H);
  gl.uniform3fv(U.uCam, cam.pos);
  gl.uniformMatrix3fv(U.uRot, false, [...cam.right, ...cam.up, ...mul(cam.fwd, -1)]);
  gl.uniform1f(U.uFov, cam.fov);
  gl.uniform1i(U.uMe, -1);
  gl.uniform1i(U.uBounces, 0);
  gl.uniform1f(U.uLamp, 0);
  gl.uniform4f(U.uVM, 0, 0, 0, 0);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.ALWAYS); gl.depthMask(true);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (typeof HV65 !== 'undefined' && HV65.ok){
    const w0 = fboW, h0 = fboH; fboW = this.W; fboH = this.H;
    try { HV65.draw(cam, this.nl, this.np); } finally { fboW = w0; fboH = h0; }
  }
  gl.disable(gl.DEPTH_TEST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  this.drawn++;
  this.ms = this.ms * 0.9 + (performance.now() - t0) * 0.1;
};
// прямоугольник окна портрета в пикселях canvas (низ-лево — как у WebGL)
CAM66.glRect = function(){
  const v = this.el && this.el.querySelector('.v'); if (!v) return null;
  const r = v.getBoundingClientRect(); if (r.width < 8) return null;
  const sx = canvas.width / (canvas.clientWidth || innerWidth), sy = canvas.height / (canvas.clientHeight || innerHeight);
  return { x: Math.round(r.left * sx), y: Math.round(canvas.height - r.bottom * sy), w: Math.round(r.width * sx), h: Math.round(r.height * sy), css: r };
};
CAM66.blit = function(now){
  const R = this.glRect(); if (!R) return;
  this.rect = R.css;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(R.x, R.y, R.w, R.h);
  gl.useProgram(this.P.p);
  const U = this.P.U;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(U.uTex, 0);
  gl.uniform2f(U.uRes, R.w, R.h); gl.uniform2f(U.uOrg, R.x, R.y);
  gl.uniform1f(U.uTime, now / 1000 % 1000);
  gl.uniform1f(U.uExpo, expo * 0.95 * SET.bright);
  gl.uniform1f(U.uTeam, 0);
  const e = this.cur && this.cur.e;
  gl.uniform1f(U.uHurt, e && e.lastHurt !== undefined && S.time - e.lastHurt < 1.2 ? 1 : (e && e.hp < e.maxhp * 0.3 ? 0.5 : 0));
  this.st = max(0, this.st - 0.06);
  gl.uniform1f(U.uStatic, this.st);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.viewport(0, 0, canvas.width, canvas.height);
};
// DOM: рамка, подписи, HP
const CAM66_RANK = [['Рядовой', 'Private', 'Binh nhì'], ['Ефрейтор', 'Corporal', 'Hạ sĩ'], ['Сержант', 'Sergeant', 'Trung sĩ'], ['Ветеран', 'Veteran', 'Cựu binh']];
CAM66.dom = function(){
  let el = this.el;
  if (!el){
    el = this.el = document.createElement('div'); el.id = 'cam66';
    el.innerHTML = '<div class="v"></div><div class="hdr"><span class="rec">● REC</span><span class="id"></span><span class="tm"></span></div><div class="cr tl"></div><div class="cr tr"></div><div class="cr bl"></div><div class="cr br"></div><i class="au">⟳</i><div class="ftr"><b class="nm"></b><small class="rk"></small><div class="hp"><s></s></div></div>';
    document.body.appendChild(el);
    el.addEventListener('mousedown', e => e.stopPropagation());
    el.addEventListener('click', e => { e.stopPropagation(); const s = this.cur; if (s && s.e && s.e.pos) flyCamTo(s.e.pos); });
  }
  return el;
};
CAM66.place = function(el){
  const phone = TOUCH.on || innerHeight < 500;
  const W = phone ? 96 : innerHeight >= 900 ? 200 : 168, H = Math.round(W * 1.25);
  const card = $('card'), cr = card && getComputedStyle(card).display !== 'none' ? card.getBoundingClientRect() : null;
  let left, top;
  const mmR = (typeof MM !== 'undefined' ? MM.R : 62) * 2 * 2 + 30;   // две миникарты слева внизу
  const sd = $('side'), sr = sd && getComputedStyle(sd).display !== 'none' ? sd.getBoundingClientRect() : null;
  const sideL = sr && sr.width ? sr.left : innerWidth;
  let cardR = cr ? cr.right : 0;
  if (cr){ const pb = card.querySelector('.poss'); if (pb){ const r = pb.getBoundingClientRect(); if (r.width) cardR = max(cardR, r.right); } }
  const room = sideL - 6 - (cardR + 8);
  if (phone && cr && cr.width && room < 80){ left = max(4, cr.left); top = cr.top - H - 6; el.style.left = left + 'px'; el.style.top = max(56, top) + 'px'; el.style.width = W + 'px'; el.style.height = H + 'px'; el.classList.add('ph'); return; }   // телефон: над карточкой
  if (cr && cr.width && room >= (phone ? 80 : 140)){ const w2 = min(W, room); left = cardR + 8; top = cr.bottom - Math.round(w2 * 1.25); el.style.left = left + 'px'; el.style.top = max(4, top) + 'px'; el.style.width = w2 + 'px'; el.style.height = Math.round(w2 * 1.25) + 'px'; el.classList.toggle('ph', phone); return; }   // справа от карточки
  else if (cr && cr.width && cr.left - W - 10 >= (phone ? 4 : mmR)){ left = cr.left - W - 10; top = cr.bottom - H; }
  else if (cr && cr.width){ left = max(4, cr.left); top = cr.top - H - 8; }
  else { left = 12; top = innerHeight - H - 170; }
  if (phone){ top = max(56, top); }
  el.style.left = left + 'px'; el.style.top = max(4, top) + 'px'; el.style.width = W + 'px'; el.style.height = H + 'px';
  el.classList.toggle('ph', phone);
};
CAM66.labels = function(el){
  const s = this.cur; if (!s) return;
  const g = s.g, e = s.e;
  const nm = isSquad(g) ? (g.solo ? `${N2(roleOf(e).n)} ${callsign(e)}` : `${groupLabel(g)} · ${callsign(e)}`) : groupLabel(g);
  const kind = typeof r61KindName === 'function' ? r61KindName(g) : '';
  const rk = `${N2(CAM66_RANK[min(3, g.vet || 0)])}${g.vet ? ' ' + '★'.repeat(g.vet) : ''}${kind ? ' · ' + kind : ''}`;
  const sig = nm + '|' + rk + '|' + LANG.cur;
  if (sig !== this.lastSig){ this.lastSig = sig; el.querySelector('.nm').textContent = nm; el.querySelector('.rk').textContent = rk; el.querySelector('.id').textContent = 'CAM-' + String(((e.id || 1) % 97) + 1).padStart(2, '0'); }
  el.querySelector('.tm').textContent = fmtTime(S.time) + ':' + String(floor((S.time % 1) * 30)).padStart(2, '0');
  const k = groupHP(g), hs = el.querySelector('.hp s'); hs.style.width = (k * 100).toFixed(0) + '%'; hs.style.background = k > 0.5 ? '#9c9' : k > 0.25 ? '#dc6' : '#e66';
  el.querySelector('.au').style.display = typeof isAuto66 === 'function' && isAuto66(g) ? '' : 'none';
};
// кадр: после основного рендера
{ const r0 = render;
  render = function(dt, now){
    r0(dt, now);
    try {
      const s = CAM66.subject();
      if (!s){ if (CAM66.el && CAM66.shown){ CAM66.el.style.display = 'none'; CAM66.shown = false; } CAM66.cur = null; return; }
      if (!CAM66.init()) return;
      const el = CAM66.dom();
      if (!CAM66.shown){ el.style.display = 'block'; CAM66.shown = true; CAM66.snap = true; CAM66.st = 1; }
      if (!CAM66.cur || CAM66.cur.e !== s.e){ CAM66.snap = true; CAM66.st = max(CAM66.st, 0.85); }
      CAM66.cur = s;
      CAM66.place(el);
      CAM66.fr++;
      if (CAM66.snap || CAM66.fr % 2 === 0) CAM66.renderPass();
      CAM66.blit(now);
      CAM66.labels(el);
    } catch (e){ if (!CAM66.err){ CAM66.err = 1; console.warn('CAM66', e); } CAM66.failed = true; CAM66.ok = false; }
  }; }
// оверлей-канва не должна закрывать окно портрета
{ const uf0 = uixFrame; uixFrame = function(dt){ uf0(dt); if (CAM66.cur && CAM66.rect && CAM66.shown){ const r = CAM66.rect; octx.clearRect(r.left, r.top, r.width, r.height); } }; }
(function cam66CSS(){
  const st = document.createElement('style');
  st.textContent = `
  #cam66{position:fixed;z-index:9;display:none;pointer-events:auto;cursor:pointer;font-family:"Exo 2",sans-serif;box-sizing:border-box;border:2px solid rgba(214,198,154,.75);box-shadow:0 0 0 1px #000,0 6px 22px rgba(0,0,0,.6)}
  #cam66 .v{position:absolute;inset:0}
  #cam66 .hdr{position:absolute;left:4px;right:4px;top:3px;display:flex;justify-content:space-between;font:700 9px "Exo 2";letter-spacing:.08em;color:#f2e6c4;text-shadow:0 0 3px #000,0 0 1px #000}
  #cam66 .rec{color:#ff5a4a;animation:cam66b 1s steps(2) infinite} #cam66 .tm{font-variant-numeric:tabular-nums}
  #cam66 .cr{position:absolute;width:10px;height:10px;border:2px solid #e8dcb8;opacity:.85} #cam66 .tl{left:5px;top:16px;border-right:0;border-bottom:0} #cam66 .tr{right:5px;top:16px;border-left:0;border-bottom:0}
  #cam66 .bl{left:5px;bottom:42px;border-right:0;border-top:0} #cam66 .br{right:5px;bottom:42px;border-left:0;border-top:0}
  #cam66 .au{position:absolute;right:6px;top:30px;font-style:normal;font:700 15px "Exo 2";color:#9fe6ff;text-shadow:0 0 4px #000}
  #cam66 .ftr{position:absolute;left:0;right:0;bottom:0;padding:3px 6px 5px;background:linear-gradient(transparent,rgba(0,0,0,.82) 40%)}
  #cam66 .nm{display:block;font:700 12px "Exo 2";color:#fff3d6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 3px #000}
  #cam66 .rk{display:block;font:600 9.5px "Exo 2";color:#d6c69a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #cam66 .hp{height:4px;margin-top:3px;background:rgba(255,255,255,.15)} #cam66 .hp s{display:block;height:100%;text-decoration:none}
  #cam66.ph .hdr{font-size:7px} #cam66.ph .nm{font-size:9.5px} #cam66.ph .rk{display:none} #cam66.ph .cr{display:none} #cam66.ph .au{top:14px;font-size:12px}
  @keyframes cam66b{50%{opacity:.2}}`;
  document.head.appendChild(st);
})();
