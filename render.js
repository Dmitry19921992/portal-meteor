// =====================================================================
//  РЕНДЕР: WebGL2, рэймарчинг сцены в HDR + пост-обработка
// =====================================================================
const SUN1 = norm([0.62, 0.55, 0.56]), SUN2 = mul(SUN1, -1);
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
if (!gl){ document.body.innerHTML = '<p style="color:#fff;padding:20px">WebGL2 не поддерживается этим браузером. / WebGL2 is not supported by this browser.</p>'; throw new Error('no webgl2'); }
const HDR = !!gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');
const PAR_EXT = gl.getExtension('KHR_parallel_shader_compile');
const f5 = v => v.map(x => (+x).toFixed(5)).join(',');
function shaderConsts(){
  return `const float RM = ${RM.toFixed(1)};
const float TUN_R = ${TUN_R.toFixed(1)}; const float CORE_R = ${CORE_R.toFixed(1)};
const float PAD_B0 = ${PAD_B[0]}; const float PAD_B1 = ${PAD_B[1]}; const float PAD_C0 = ${PAD_C[0]}; const float PAD_C1 = ${PAD_C[1]};
const float DET_F = ${DET_F.toFixed(6)}; const float DET_A = ${DET_A.toFixed(3)};
const vec3 BASES[2] = vec3[2](${BASES.map(d => `vec3(${f5(d)})`).join(',')});
const vec3 CPD[6] = vec3[6](${CPD.map(d => `vec3(${f5(d)})`).join(',')});
const vec4 CRAT[8] = vec4[8](${CRATERS.map(c => `vec4(${f5(c)})`).join(',')});
float hgt(vec3 q){ return ${NK.map(([a,k1,k2]) => `${a.toFixed(3)}*cos(dot(q,vec3(${f5(k1)})))*cos(dot(q,vec3(${f5(k2)})))`).join(' + ')}; }`;
}
const VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
// компиляция без блокировки (для экрана загрузки): start → poll → finish
function startProgram(fsSrc){
  const p = gl.createProgram();
  const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VS); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
  gl.attachShader(p, vs); gl.attachShader(p, fs);
  gl.linkProgram(p);
  return { p, vs, fs };
}
function programReady(h){ return !PAR_EXT || gl.getProgramParameter(h.p, PAR_EXT.COMPLETION_STATUS_KHR); }
function finishProgram(h, names){
  if (!gl.getProgramParameter(h.p, gl.LINK_STATUS)){
    const e = (gl.getShaderInfoLog(h.fs) || '') + '\n' + (gl.getProgramInfoLog(h.p) || '');
    console.error(e);
    throw new Error('shader: ' + e);
  }
  const U = {};
  for (const n of names) U[n] = gl.getUniformLocation(h.p, n);
  return { p: h.p, U };
}
const SCENE_U = ['uRes','uCam','uRot','uR','uBounces','uGrid','uSelf','uTiles','uFov','uTime','uQ','uMe','uObj','uNO','uPar','uNP','uNoise',
                 'uLP','uLC','uNL','uCP','uVM','uVM2','uLamp','uHQ','uZero','uStorm','uVM3'];
const POST_U = ['uTex','uRes','uTime','uExpo','uFlash','uDmg','uVhs','uBloom','uWave','uNW','uTrc','uNT','uSlow','uDist','uXfer'];
let SCENE = null, POST = null;
let texObj, texPar, texNoise;
const MAXO = 160, MAXP = 200;
const OBJ = new Float32Array(7 * 4 * MAXO), PAR = new Float32Array(2 * 4 * MAXP);
function dataTex(w, h){
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return t;
}
function initTextures(){
  texObj = dataTex(7, MAXO); texPar = dataTex(2, MAXP);
  texNoise = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, texNoise);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, NOISE_N, NOISE_N, NOISE_N, 0, gl.RED, gl.UNSIGNED_BYTE, NOISE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT);
  gl.bindVertexArray(gl.createVertexArray());
}
let fbo = null, fboTex = null, fboW = 0, fboH = 0;
function makeFBO(w, h){
  if (fboTex) gl.deleteTexture(fboTex);
  if (fbo) gl.deleteFramebuffer(fbo);
  fboTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fboTex);
  const levels = 1 + floor(Math.log2(max(w, h)));
  gl.texStorage2D(gl.TEXTURE_2D, levels, HDR ? gl.RGBA16F : gl.RGBA8, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  fboW = w; fboH = h;
}
const ov = document.getElementById('ov'), octx = ov.getContext('2d');
function resize(){
  if (S.fixedRes){ canvas.width = S.fixedRes[0]; canvas.height = S.fixedRes[1]; }
  else {
    canvas.width = max(64, Math.round(innerWidth * S.scale));
    canvas.height = max(36, Math.round(innerHeight * S.scale));
  }
  makeFBO(canvas.width, canvas.height);
  const dpr = devicePixelRatio || 1;
  ov.width = Math.round(innerWidth * dpr); ov.height = Math.round(innerHeight * dpr);
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', () => { if (SCENE) resize(); });

// ---- камера
let FOV = 2 * Math.tan(75 * PI / 360);
function setFov(deg){ FOV = 2 * Math.tan(deg * PI / 360); }
let eyeSh = 1, eyeShT = 0, expo = 1;
function shadowJS(p){
  const L = dot(norm(p), SUN1) > 0 ? SUN1 : SUN2;
  const hor = smoothstep(-0.1, 0.05, dot(norm(p), L));
  if (hor <= 0) return 0;
  let t = 0.3, res = 1;
  for (let i = 0; i < 40; i++){
    const q = add(p, mul(L, t));
    const h = mapJS(q[0], q[1], q[2]);
    res = min(res, 9 * h / t);
    if (res < 0.01) return 0;
    t += clamp(h, 0.3, 7);
    if (t > 140) break;
  }
  return hor * clamp(res, 0, 1);
}
function camBasis(fwd, upHint){
  const right = norm(cross(fwd, upHint));
  return { right, up: cross(right, fwd), fwd };
}
function pullCam(from, to){   // не пускаем камеру в скалы
  const v = sub(to, from), L = len(v);
  let t = 0;
  while (t < L){
    const p = add(from, mul(v, t / L));
    const d = mapJS(p[0], p[1], p[2]);
    if (d < 0.4) return add(from, mul(v, max(0, t - 0.5) / L));
    t += max(d * 0.8, 0.2);
  }
  return to;
}
// кинематографичная камера для меню: следит за самыми жаркими местами боя
const CINE = { target: null, t: 99, ang: 0, pos: null, look: null };
function cineCamera(dt){
  CINE.t += dt; CINE.ang += dt * 0.12;
  if (CINE.t > 9 || !CINE.target || !CINE.target.alive){
    CINE.t = 0;
    const hot = [...S.units, ...S.vehicles].filter(u => u.alive && u.target && u.target.alive && !underground(u.pos));
    CINE.target = hot.length ? hot[floor(random() * hot.length)] : (S.units[floor(random() * S.units.length)] || null);
    CINE.pos = null;
  }
  const e = CINE.target;
  const focus = e ? add(e.pos, mul(norm(e.pos), 1.5)) : mul(BASES[0], RM + 2);
  const up = norm(focus);
  const t1 = anyTangent(up), t2 = cross(up, t1);
  const off = add(mul(t1, cos(CINE.ang) * 15), mul(t2, sin(CINE.ang) * 15));
  let want = add(add(focus, off), mul(up, 6.5));
  want = pullCam(focus, want);
  CINE.pos = CINE.pos ? add(CINE.pos, mul(sub(want, CINE.pos), 1 - Math.exp(-dt * 2))) : want;
  CINE.look = CINE.look ? add(CINE.look, mul(sub(focus, CINE.look), 1 - Math.exp(-dt * 3))) : focus;
  return Object.assign({ pos: CINE.pos }, camBasis(norm(sub(CINE.look, CINE.pos)), norm(CINE.pos)));
}
function setupCamera(dt){
  if (S.camOverride){ const o = S.camOverride; S.cam = Object.assign({ fov: FOV, pos: o.pos }, camBasis(norm(sub(o.look, o.pos)), norm(o.pos))); eyeSh = shadowJS(o.pos); return; }
  const c = ctrlEntity();
  let cam;
  if (S.attract) cam = OPER.on ? OPER.camera(dt) : cineCamera(dt);
  else if (S.mode === 'fps' && c){
    if (c.cls === 'inf' && !S.third){
      const right = norm(cross(c.fwd, c.up));
      cam = { pos: add(c.pos, mul(c.up, RULES.EYE + parkourEye(dt) - 0.32 * GUNS.crouchK)), right, up: cross(right, c.fwd), fwd: c.fwd };
    } else if (c.cls === 'inf'){
      const head = add(c.pos, mul(c.up, 1.2));
      const right = norm(cross(c.fwd, c.up));
      const want = add(add(head, mul(c.fwd, -3.4)), add(mul(c.up, 0.5), mul(right, 0.7)));
      const pos = pullCam(head, want);
      cam = Object.assign({ pos }, camBasis(c.fwd, c.up));
    } else if (c.cls === 'tank' && c.vk){
      cam = V2.camera(c, dt);
    } else if (c.cls === 'tank'){
      const center = add(c.pos, mul(c.up, 1.2));
      const af = tangent(c.aim, c.up);
      const want = add(add(center, mul(af, -9.5)), mul(c.up, 3.2));
      const pos = pullCam(center, want);
      const look = norm(sub(add(center, mul(c.aim, 40)), pos));
      cam = Object.assign({ pos }, camBasis(look, c.up));
    } else if (c.cls === 'drone'){
      const center = c.pos;
      const want = add(add(center, mul(c.aim, -4.2)), mul(c.up, 1.3));
      const pos = pullCam(center, want);
      const look = norm(sub(add(center, mul(c.aim, 30)), pos));
      cam = Object.assign({ pos }, camBasis(look, c.up));
    } else {
      const g = gunPos(c);
      const pos = add(add(g, mul(c.up, 0.75)), mul(c.aim, -0.9));
      cam = Object.assign({ pos }, camBasis(c.aim, c.up));
    }
    if (S.shake > 0){
      const k = S.shake * 0.012;
      cam = Object.assign({}, cam, camBasis(norm(add(cam.fwd, mul(randUnit(), k))), cam.up), { pos: cam.pos });
    }
    const el = len(cam.pos); if (el > S.R) cam.pos = mul(cam.pos, 1 - 2 * S.R / el);
  } else cam = rtsCamera();
  cam = CAMFX.apply(cam, dt);
  S.aimK = (S.aimK || 0) + (((S.mode === 'fps' && S.aiming) ? 1 : 0) - (S.aimK || 0)) * min(1, dt * 12);
  cam.fov = FOV * (1 - (S.adsZ || 0.4) * S.aimK);   // v6: приближение зависит от оружия
  S.cam = cam;
  eyeShT -= dt;
  if (eyeShT <= 0){ eyeShT = 0.15; eyeSh = shadowJS(cam.pos); }
  const under = S.mode === 'fps' && underground(cam.pos) ? 1.5 : 1.0;
  expo += (under - expo) * (1 - Math.exp(-dt * 1.5));
}

// ---- сбор объектов
const BLD_BC = { turret: 1.0, aa: 1.2, factory: 4, hub: 1, airdock: 5, outpost: 2.5, extractor: 2.1 };
const BLD_SC = { turret: 1.2, aa: 1.3, factory: 4, hub: 1.5, airdock: 7, outpost: 2.2, extractor: 2.0 };
const BLD_SR = { turret: 0.7, aa: 1.0, factory: 6, hub: 3, airdock: 3, outpost: 4, extractor: 1.2 };
const BLD_BR = { turret: 2.7, aa: 3.7, factory: 14, hub: 8, airdock: 12, outpost: 10, extractor: 4.2 };
function objInfo(e){
  switch (e.cls){
    case 'inf': {
      if (!e.alive){ const o = sub(e.pos, mul(e.up, 0.5)); return { type: 2, origin: o, bc: add(o, mul(e.up, 0.2)), br: 0.95, prog: e.heat || 0 }; }
      const o = sub(e.pos, mul(e.up, 0.5));
      return { type: 1, origin: o, bc: add(o, mul(e.up, 0.9)), br: 1.2, variant: (e.leader ? 1 : 0) + (e.elite ? 2 : 0) + 4 * roleOf(e).i,
               sc: add(o, mul(e.up, 0.9)), sr: 0.33, thrust: e.thrusting ? 1 : 0 };
    }
    case 'tank': { if (e.vk) return V2.objInfo(e); const o = sub(e.pos, mul(e.up, 1.5)); return { type: 5, origin: o, bc: add(o, mul(e.up, 1.6)), br: 4.3, sc: add(o, mul(e.up, 1.3)), sr: 1.6, thrust: e.overT > 0 ? 1 : 0 }; }
    case 'drone': return { type: 4, origin: e.pos, bc: e.pos, br: 1.5, sc: e.pos, sr: 0.5, thrust: 1 };
    case 'builder': { const o = sub(e.pos, mul(e.up, ECO.HOVER)); return { type: 3, origin: o, bc: add(o, mul(e.up, 0.9)), br: 1.9, sc: add(o, mul(e.up, 0.8)), sr: 0.6, thrust: e.work || 0 }; }
    case 'bld': {
      const T = BTYPES[e.type];
      return { type: T.code, origin: e.pos, bc: add(e.pos, mul(e.up, BLD_BC[e.type])), br: BLD_BR[e.type],
               sc: add(e.pos, mul(e.up, BLD_SC[e.type] * e.built)), sr: BLD_SR[e.type] * max(0.2, e.built), prog: e.built };
    }
    case 'prop': {
      const K = PROP_KINDS[e.kind];
      const lc = (v) => add(e.pos, add(add(mul(e.R, v[0]), mul(e.up, v[1] * (0.3 + 0.7 * e.integ))), mul(e.fwd, v[2])));
      return { type: K.code, origin: e.pos, bc: lc([0, K.br * 0.35, 0]), br: K.br, sc: lc(K.sc), sr: K.sr * (0.5 + 0.5 * e.integ), prog: e.integ, variant: e.variant };
    }
  }
  return null;
}
let renderList = [];
function gatherObjects(){
  const cam = S.cam.pos, anti = mul(cam, -1);
  const rts = S.mode !== 'fps' && !S.attract;
  const cull = rts ? 2000 : 340;
  const L = [];
  const consider = e => {
    if (rts && fogHidden(e)) return;   // туман войны в стратегии
    const info = objInfo(e); if (!info) return;
    const d = min(dist(info.bc, cam), dist(info.bc, anti));
    if (d > cull + info.br) return;
    if (rts && dot(sub(cam, info.bc), norm(info.bc)) < -info.br * 2) return;   // за горизонтом
    info.e = e; info.d = d; L.push(info);
  };
  for (const u of S.units) if (u.alive) consider(u);
  for (const w of S.wrecks) consider(w);
  for (const v of S.vehicles) if (v.alive) consider(v);
  for (const d of S.drones) if (d.alive) consider(d);
  for (const b of S.builders) if (b.alive) consider(b);
  for (const b of S.buildings) if (b.alive) consider(b);
  for (const p of PROPS) consider(p);
  L.sort((a, b) => a.d - b.d);
  renderList = L.slice(0, MAXO);
  let meIdx = -1;
  const firstPerson = S.mode === 'fps' && !S.attract && S.me && S.me.cls === 'inf' && !S.third;
  renderList.forEach((o, i) => {
    const e = o.e, k = i * 28;
    if (firstPerson && e === S.me) meIdx = i;
    const fwd = tangent(e.fwd, e.up);
    const aim = e.aim || fwd;
    OBJ.set([o.bc[0], o.bc[1], o.bc[2], o.br,
             o.origin[0], o.origin[1], o.origin[2], o.type,
             e.up[0], e.up[1], e.up[2], e.team,
             fwd[0], fwd[1], fwd[2], e.phase || 0,
             aim[0], aim[1], aim[2], e.flash || 0,
             o.thrust || 0, o.prog !== undefined ? o.prog : 1, o.variant || 0, e.moveAmt || 0,
             o.sc ? o.sc[0] : 0, o.sc ? o.sc[1] : 0, o.sc ? o.sc[2] : 0, o.sr || 0], k);
  });
  return meIdx;
}
function gatherParticles(){
  const cam = S.cam.pos, anti = mul(cam, -1);
  const rts = S.mode !== 'fps' && !S.attract;
  let n = 0;
  const near = (p, r) => rts || min(dist(p, cam), dist(p, anti)) < (r || 320);
  const push = (a, ra, b, ty) => { if (n >= MAXP) return; PAR.set([a[0], a[1], a[2], ra, b[0], b[1], b[2], ty], n * 8); n++; };
  // яркие лучи — первыми
  for (const s of S.strikes){
    if (s.type !== 'orb') continue;
    const up = norm(s.pos);
    if (s.t < s.delay){ push(add(s.pos, mul(up, 260)), 0.06 + 0.05 * s.t / s.delay, s.pos, 8); }
    else { const k = min(1, (s.t - s.delay) * 3); push(add(s.pos, mul(up, 300)), 4.5 * k + random() * 0.6, sub(s.pos, mul(up, 2)), 7); }
  }
  for (const s of S.strikes){ if (s.type === 'arty' && s.t < s.delay){ push(add(s.pos, mul(norm(s.pos), 0.2)), 0.25, add(s.pos, mul(norm(s.pos), 3 + 2 * sin(S.time * 20))), 8); } }
  for (const b of S.beams){ if (!near(b.a)) continue; const k = 1 - b.t / b.life; push(b.a, 0.05 + 0.12 * k, b.b, 6); }
  for (const p of S.pods){ push(p.pos, 1.1, add(p.pos, mul(norm(sub(p.from, p.to)), 3.5)), 3); }
  for (const f of S.fx){
    if (!near(f.pos, 360)) continue;
    const age = f.t / f.life;
    if (f.type === 'fire') push(f.pos, lerp(f.r0, f.r1, sqrt(age)), [age, f.inten, 0], 10);
    else push(f.pos, lerp(f.r0, f.r1, age), [f.dens * Math.pow(1 - age, 1.3), f.grey, max(0, f.heat * (1 - age * 4))], 11);
  }
  let jets = 0;
  for (const u of S.units){
    if (!u.alive || !u.thrusting || jets > 14 || !near(u.pos, 200)) continue;
    if (u === S.me && S.mode === 'fps' && !S.third) continue;
    const f = tangent(u.fwd, u.up);
    const p = add(sub(u.pos, mul(u.up, 0.05)), mul(f, -0.27));
    push(p, 0.22 + random() * 0.08, [0.15 + random() * 0.2, 0.9, 0], 10); jets++;
  }
  for (const p of S.proj){
    if (!near(p.pos)) continue;
    const L = p.type === 's' ? 3 : p.type === 'a' ? 6 : p.type === 'r' ? 1.2 : p.type === 'g' ? 0.15 : 2.2;
    const b = sub(p.pos, mul(norm(p.vel), L));
    const ty = p.type === 'b' ? (p.inc ? 3 : p.team) : p.type === 'f' ? 5 : 3;
    push(p.pos, p.type === 's' || p.type === 'a' ? 0.12 : p.type === 'r' ? 0.1 : p.type === 'g' ? 0.14 : 0.055, b, ty);
  }
  tracersGather(push, near);   // v6: трассеры мгновенных пуль
  for (const s of S.sparks){
    if (!near(s.pos, 250)) continue;
    push(s.pos, s.big ? 0.07 : 0.035, sub(s.pos, mul(s.vel, s.big ? 0.05 : 0.03)), s.heal ? 9 : 2);
  }
  for (const b of S.builders){
    if (!b.alive || !b.beam || !near(b.pos, 250)) continue;
    if (random() < 0.85) push(add(b.pos, mul(b.up, -0.15)), 0.04, add(b.beam, mul(randUnit(), 0.6)), 4);
  }
  return n;
}
const LP = new Float32Array(16 * 4), LC = new Float32Array(16 * 4);
function gatherLights(){
  const cam = S.cam.pos, anti = mul(cam, -1);
  const C = [];
  const add2 = (pos, col, rad, glow) => {
    const d = min(dist(pos, cam), dist(pos, anti));
    const I = col[0] + col[1] + col[2];
    C.push({ pos, col, rad, glow, score: I / (1 + d * d / (rad * rad * 4)) });
  };
  for (const l of S.lights){ const k = 1 - l.t / l.life; add2(l.pos, mul(l.col, k), l.rad, l.glow); }
  const tg = pr => pr >= 0 ? [lerp(0.5, 2.0, pr), lerp(0.5, 2.8, pr), lerp(0.5, 3.2, pr)] : [lerp(0.5, 4.2, -pr), lerp(0.5, 0.25, -pr), lerp(0.5, 0.12, -pr)];
  for (const cp of S.cps){
    if (cp.core){ add2([0, 16, 0], [2.5, 1.2, 4], 40, 0.002); add2([0, -16, 0], [2.5, 1.2, 4], 40, 0.002); continue; }
    add2(cp.beacon, tg(cp.prog), 32, 0.004);
  }
  for (const h of S.hq){
    if (!h.alive) continue;
    const b = BASES[h.team], t1 = anyTangent(b), t2 = cross(b, t1);
    add2(mul(b, RM + 37.2), h.team ? [6, 0.4, 0.2] : [2.6, 3.4, 4], 45, 0.004);
    for (let k = 0; k < 4; k++){
      const a = k * PI / 2 + PI / 4;
      add2(add(mul(b, RM + 11), add(mul(t1, cos(a) * 12), mul(t2, sin(a) * 12))), h.team ? [1.4, 0.45, 0.35] : [1.3, 1.2, 1.0], 30, 0);
    }
  }
  for (const b of S.buildings){
    if (!b.alive) continue;
    const E = b.team ? [3.5, 0.3, 0.15] : [1.6, 2.2, 2.6];
    if (!b.done) add2(add(b.pos, mul(b.up, b.H * b.built)), [0.6, 1.6, 2.2], 14, 0.003);
    else if (b.type === 'factory') add2(add(add(b.pos, mul(b.up, 5)), mul(b.fwd, 9.5)), E, 18, 0.002);
    else if (b.type === 'airdock') add2(add(b.pos, mul(b.up, 2)), E, 16, 0.003);
    else if (b.type === 'hub') add2(add(b.pos, mul(b.up, 1.5)), E, 14, 0.002);
    else if (b.type === 'outpost') add2(add(b.pos, mul(b.up, 4.5)), E, 14, 0.003);
    else if (b.type === 'extractor') add2(add(add(b.pos, mul(b.up, 1.2)), mul(b.R, 1.5)), [2.2, 1.3, 0.4], 9, 0.002);
  }
  for (const p of PROPS){
    if (p.alive && p.kind === 1) add2(add(p.pos, mul(p.up, 3)), [1.6, 0.8, 0.2].map(x => x * (0.5 + 0.5 * (sin(S.time * 2 + p.id) > 0.6 ? 1 : 0))), 9, 0.002);
  }
  for (const u of S.units){
    if (!u.alive || !u.thrusting) continue;
    add2(sub(u.pos, mul(u.up, 0.3)), [3, 1.4, 0.4], 7, 0.002);
  }
  C.sort((a, b) => b.score - a.score);
  const n = min(16, C.length);
  for (let i = 0; i < n; i++){
    const l = C[i];
    LP.set([l.pos[0], l.pos[1], l.pos[2], l.rad], i * 4);
    LC.set([l.col[0], l.col[1], l.col[2], l.glow], i * 4);
  }
  return n;
}
// ---- искажения для пост-обработки: ударные волны и трассеры (в экранных координатах)
const WAVE = new Float32Array(8 * 4), TRC = new Float32Array(8 * 4);
function gatherDistortion(){
  let nw = 0, nt = 0;
  if (!S.cam || !SET.distort) return [0, 0];
  const W = innerWidth, H = innerHeight;
  const ws = S.waves.map(w => ({ w, d: dist(w.pos, S.cam.pos) })).filter(o => o.d < 260).sort((a, b) => a.d - b.d);
  for (const { w, d } of ws){
    if (nw >= 8) break;
    const s = project(w.pos); if (!s) continue;
    const k = w.t / w.life;
    const Rw = w.size * (1.2 + 7 * sqrt(k));
    const r = Rw / (s[2] * S.cam.fov);
    if (r > 3) continue;
    const str = (1 - k) * (1 - k) * clamp(0.6 + w.size * 0.25, 0, 2.2) * clamp(30 / s[2], 0.25, 1.4);
    WAVE.set([s[0] / W, 1 - s[1] / H, r, str], nw * 4); nw++;
  }
  // ближайшие к камере трассеры
  const tr = [];
  for (const p of S.proj){
    if (p.type !== 'b' && p.type !== 'r' && p.type !== 's') continue;
    const d = dist(p.pos, S.cam.pos); if (d > 45 || d < 0.8) continue;
    tr.push({ p, d });
  }
  // v6: трассеры мгновенных пуль у камеры
  tracersNear((T, h) => {
    if (nt >= 8) return;
    const h2 = max(0, h - 4);
    const a = project([T.a[0] + T.d[0] * h, T.a[1] + T.d[1] * h, T.a[2] + T.d[2] * h]), b = project([T.a[0] + T.d[0] * h2, T.a[1] + T.d[1] * h2, T.a[2] + T.d[2] * h2]);
    if (a && b){ TRC.set([a[0] / W, 1 - a[1] / H, b[0] / W, 1 - b[1] / H], nt * 4); nt++; }
  });
  tr.sort((a, b) => a.d - b.d);
  for (const { p } of tr){
    if (nt >= 8) break;
    const L = p.type === 'b' ? 3 : 4;
    const a = project(p.pos), b = project(sub(p.pos, mul(norm(p.vel), L)));
    if (!a || !b) continue;
    TRC.set([a[0] / W, 1 - a[1] / H, b[0] / W, 1 - b[1] / H], nt * 4); nt++;
  }
  for (const b of S.beams){
    if (nt >= 8) break;
    const a = project(b.a), c = project(b.b); if (!a || !c) continue;
    TRC.set([a[0] / W, 1 - a[1] / H, c[0] / W, 1 - c[1] / H], nt * 4); nt++;
  }
  return [nw, nt];
}
const CPU = new Float32Array(7 * 4);
function render(dt, now){
  const c = S.cam;
  const meIdx = gatherObjects();
  const np = gatherParticles();
  const nl = gatherLights();
  S.cps.forEach((cp, i) => CPU.set([cp.beacon[0], cp.beacon[1], cp.beacon[2], cp.prog], i * 4));

  gl.bindTexture(gl.TEXTURE_2D, texObj);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 7, max(1, renderList.length), gl.RGBA, gl.FLOAT, OBJ.subarray(0, 28 * max(1, renderList.length)));
  gl.bindTexture(gl.TEXTURE_2D, texPar);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 2, max(1, np), gl.RGBA, gl.FLOAT, PAR.subarray(0, 8 * max(1, np)));

  // --- сцена
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, fboW, fboH);
  gl.useProgram(SCENE.p);
  const U = SCENE.U;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texObj); gl.uniform1i(U.uObj, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texPar); gl.uniform1i(U.uPar, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_3D, texNoise); gl.uniform1i(U.uNoise, 2);
  gl.uniform2f(U.uRes, fboW, fboH);
  gl.uniform3fv(U.uCam, c.pos);
  gl.uniformMatrix3fv(U.uRot, false, [...c.right, ...c.up, ...mul(c.fwd, -1)]);
  gl.uniform1f(U.uR, S.R);
  const fpsLike = S.mode === 'fps' || S.attract;
  gl.uniform1i(U.uBounces, fpsLike ? (S.quality === 0 ? min(S.bounces, 2) : S.bounces) : S.rtsBounces);
  gl.uniform1f(U.uGrid, S.grid);
  gl.uniform1f(U.uSelf, S.self);
  gl.uniform1f(U.uTiles, S.tiles);
  gl.uniform1f(U.uFov, c.fov);
  gl.uniform1f(U.uTime, now / 1000 % 1000);
  gl.uniform1i(U.uQ, S.quality);
  gl.uniform1i(U.uMe, meIdx);
  gl.uniform1i(U.uNO, renderList.length);
  gl.uniform1i(U.uNP, np);
  gl.uniform4fv(U.uLP, LP); gl.uniform4fv(U.uLC, LC); gl.uniform1i(U.uNL, nl);
  gl.uniform4fv(U.uCP, CPU);
  gl.uniform2f(U.uHQ, HQ_ALIVE[0] ? 1 : 0, HQ_ALIVE[1] ? 1 : 0);
  gl.uniform1i(U.uZero, 0);
  gl.uniform1f(U.uStorm, (S.storm ? S.storm.k : 0) * (fpsLike ? 1 : 0.12));
  const me = S.me;
  const showVM = S.mode === 'fps' && !S.attract && me && me.cls === 'inf' && !S.third && !S.freecam;
  const wk = S.kit ? S.kit.w : 'rifle';
  const reload = S.kit && S.kit.reloadT > 0 ? min(1, S.kit.reloadT / WEAPONS[wk].reload) : 0;
  const vm3 = gunVM3();   // v6: прицел, опускание оружия при перелёте, заряд рельсы
  gl.uniform4f(U.uVM, showVM && !vm3[3] ? 1 : 0, S.bob, S.recoil, S.muzzle > 0 ? 1 : min(0.5, vm3[2] * 0.5));
  gl.uniform4f(U.uVM3, vm3[0], vm3[1], vm3[2], 0);
  gl.uniform4f(U.uVM2, me ? me.team : 0, (wk === 'rail' ? 2 : wk === 'hmg' ? 3 : (me && me.elite ? 1 : 0)) + reload * 0.9, eyeSh, me ? (me.moveAmt || 0) : 0);
  gl.uniform1f(U.uLamp, S.mode === 'fps' && !S.attract ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // --- пост
  const [nw, nt] = gatherDistortion();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fboTex);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(POST.p);
  const P = POST.U;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.uniform1i(P.uTex, 0);
  gl.uniform2f(P.uRes, canvas.width, canvas.height);
  gl.uniform1f(P.uTime, now / 1000 % 1000);
  gl.uniform1f(P.uExpo, expo * (fpsLike ? 0.85 : 0.72) * SET.bright);
  gl.uniform1f(P.uFlash, min(1, S.flashT * 1.6));
  gl.uniform1f(P.uDmg, min(0.7, S.dmgT));
  gl.uniform1f(P.uVhs, S.vhs ? 1 : 0);
  gl.uniform1f(P.uBloom, HDR ? 1 : 0.6);
  gl.uniform4fv(P.uWave, WAVE); gl.uniform1i(P.uNW, nw);
  gl.uniform4fv(P.uTrc, TRC); gl.uniform1i(P.uNT, nt);
  gl.uniform1f(P.uSlow, S.slow);
  gl.uniform1f(P.uDist, SET.distort ? 1 : 0);
  gl.uniform1f(P.uXfer, S.attract ? 0 : (S.xfer || 0));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
