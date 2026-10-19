// =====================================================================
//  v6.5 — ТЯЖЁЛЫЙ БОЕЦ КОНСОРЦИУМА: настоящая 3D-модель со скелетом и анимациями
//  GLB (heavyE_anim.glb) встроен в страницу base64-строкой (<script id="hv65glb">) — игра остаётся одним файлом.
//  Свой мини-загрузчик glTF (three.js в игре нет — она целиком на WebGL2-рэймарчере), скиннинг на GPU,
//  смешивание клипов с плавными переходами. Рэймарчер пишет глубину (scene.glsl, gl_FragDepth),
//  модели рисуются поверх с тестом глубины. Сквозь портал (антипод) боец виден по-старому — примитивами.
//  Если модель не загрузилась — остаётся прежний вид из примитивов, игра не падает.
// =====================================================================
const HV65 = {
  ok: false, failed: false, started: false, err: '', on: true,
  SCALE: 0.92,         // модель 1.9 м -> ~1.75 м (как прежний пулемётчик)
  FADE: 0.2,           // плавный переход между клипами, с
  list: [], st: new WeakMap(), fr: 0, nid: 0,
  stats: { drawn: 0, posed: 0, ms: 0, cand: 0 },
  M: null, P: null, U: null, vao: null, tex: null,
  // --- кого рисуем моделью: пулемётчик (тяжёлый боец) Консорциума — фракции игрока
  is(e){ return !!e && e.cls === 'inf' && e.team === 0 && e.role === 'heavy'; },
  state(e){
    let s = this.st.get(e);
    if (!s){ s = { id: this.nid++, layers: [], want: '', uw: 0, ut: 0, hs: 0, pitch: 0, lt: S.time, shot: -9, sh: 1, shAt: -9, W: new Float32Array(16 * 24), K: new Float32Array(16 * 24), posed: false }; this.st.set(e, s); }
    return s;
  },
  begin(firstPerson){
    if (!this.started) this.start();
    this.list.length = 0;
    if (!this.ok || !this.on) return false;
    this.fr++;
    return true;
  },
  take(e, o, hideMe){
    if (!this.is(e) || hideMe) return false;
    this.list.push(o);
    return true;
  },
  fail(e){
    this.ok = false; this.failed = true; this.err = String(e && e.message || e);
    try { console.warn('HV65: 3D-модель отключена, остаётся прежний вид —', this.err); } catch (_){}
  },
};

// ---------------------------------------------------------------- матрицы (column-major, как в WebGL)
const HV_I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function hvCompose(o, oo, t, ti, r, ri, s, si){
  const x = r[ri], y = r[ri + 1], z = r[ri + 2], w = r[ri + 3], sx = s[si], sy = s[si + 1], sz = s[si + 2];
  const x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  o[oo] = (1 - (yy + zz)) * sx; o[oo + 1] = (xy + wz) * sx; o[oo + 2] = (xz - wy) * sx; o[oo + 3] = 0;
  o[oo + 4] = (xy - wz) * sy; o[oo + 5] = (1 - (xx + zz)) * sy; o[oo + 6] = (yz + wx) * sy; o[oo + 7] = 0;
  o[oo + 8] = (xz + wy) * sz; o[oo + 9] = (yz - wx) * sz; o[oo + 10] = (1 - (xx + yy)) * sz; o[oo + 11] = 0;
  o[oo + 12] = t[ti]; o[oo + 13] = t[ti + 1]; o[oo + 14] = t[ti + 2]; o[oo + 15] = 1;
}
function hvMul(o, oo, a, ao, b, bo){   // o = a * b (o не должен совпадать с a/b по месту)
  for (let c = 0; c < 4; c++){
    const b0 = b[bo + c * 4], b1 = b[bo + c * 4 + 1], b2 = b[bo + c * 4 + 2], b3 = b[bo + c * 4 + 3];
    for (let r = 0; r < 4; r++) o[oo + c * 4 + r] = a[ao + r] * b0 + a[ao + 4 + r] * b1 + a[ao + 8 + r] * b2 + a[ao + 12 + r] * b3;
  }
}
function hvInv(m, mo){   // обратная 4x4 (нужна один раз — для оружия)
  const a = Array.from(m.subarray ? m.subarray(mo, mo + 16) : m.slice(mo, mo + 16)), o = new Float32Array(16);
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return new Float32Array(HV_I);
  det = 1 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
}
function hvXf(m, mo, x, y, z, w){ return [m[mo] * x + m[mo + 4] * y + m[mo + 8] * z + m[mo + 12] * w, m[mo + 1] * x + m[mo + 5] * y + m[mo + 9] * z + m[mo + 13] * w, m[mo + 2] * x + m[mo + 6] * y + m[mo + 10] * z + m[mo + 14] * w]; }

// ---------------------------------------------------------------- мини-загрузчик GLB
function hvB64(s){ const b = atob(s.replace(/\s+/g, '')), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function hvParseGLB(bytes){
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('не GLB');
  let off = 12, J = null, BIN = null;
  while (off + 8 <= bytes.length){
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), chunk = bytes.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) J = JSON.parse(new TextDecoder().decode(chunk)); else if (type === 0x004E4942) BIN = chunk;
    off += 8 + len;
  }
  if (!J || !BIN) throw new Error('GLB без JSON/BIN');
  return { J, BIN };
}
function hvAcc(G, i){
  const A = G.J.accessors[i], V = G.J.bufferViews[A.bufferView];
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[A.type];
  const C = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[A.componentType];
  const bs = C.BYTES_PER_ELEMENT, stride = V.byteStride || N * bs;
  const base = G.BIN.byteOffset + (V.byteOffset || 0) + (A.byteOffset || 0);
  let out = new C(A.count * N);
  if (stride === N * bs && base % bs === 0) out.set(new C(G.BIN.buffer, base, A.count * N));
  else {
    const dv = new DataView(G.BIN.buffer), get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[A.componentType];
    for (let k = 0; k < A.count; k++) for (let c = 0; c < N; c++) out[k * N + c] = dv[get](base + k * stride + c * bs, true);
  }
  if (A.normalized && C !== Float32Array){
    const mx = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[A.componentType], f = new Float32Array(out.length);
    for (let k = 0; k < out.length; k++) f[k] = Math.max(out[k] / mx, -1);
    out = f;
  }
  return out;
}

// ---------------------------------------------------------------- скелет и клипы
function hvBuildModel(G){
  const J = G.J, skin = J.skins[0];
  const meshNode = J.nodes.findIndex(n => n.mesh !== undefined && n.skin !== undefined);
  if (meshNode < 0) throw new Error('нет скинованного меша');
  const prim = J.meshes[J.nodes[meshNode].mesh].primitives[0];
  const parent = new Array(J.nodes.length).fill(-1);
  J.nodes.forEach((n, i) => (n.children || []).forEach(c => { parent[c] = i; }));
  const nodeLocal = i => { const n = J.nodes[i], m = new Float32Array(16); if (n.matrix) m.set(n.matrix); else hvCompose(m, 0, n.translation || [0, 0, 0], 0, n.rotation || [0, 0, 0, 1], 0, n.scale || [1, 1, 1], 0); return m; };
  const nodeWorld = i => { let m = nodeLocal(i); for (let p = parent[i]; p >= 0; p = parent[p]){ const t = new Float32Array(16); hvMul(t, 0, nodeLocal(p), 0, m, 0); m = t; } return m; };
  const JN = skin.joints, NJ = JN.length;
  if (NJ > 24) throw new Error('костей больше 24: ' + NJ);
  const jIdx = new Map(JN.map((n, j) => [n, j]));
  const jPar = JN.map(n => jIdx.has(parent[n]) ? jIdx.get(parent[n]) : -1);
  const jRoot = JN.map((n, j) => jPar[j] < 0 ? (parent[n] >= 0 ? nodeWorld(parent[n]) : new Float32Array(HV_I)) : null);
  const order = [], seen = new Array(NJ).fill(false);
  const visit = j => { if (seen[j]) return; if (jPar[j] >= 0) visit(jPar[j]); seen[j] = true; order.push(j); };
  for (let j = 0; j < NJ; j++) visit(j);
  const bT = new Float32Array(NJ * 3), bR = new Float32Array(NJ * 4), bS = new Float32Array(NJ * 3);
  JN.forEach((n, j) => { const N = J.nodes[n]; if (N.matrix) throw new Error('кость с matrix'); bT.set(N.translation || [0, 0, 0], j * 3); bR.set(N.rotation || [0, 0, 0, 1], j * 4); bS.set(N.scale || [1, 1, 1], j * 3); });
  const ibm = skin.inverseBindMatrices !== undefined ? hvAcc(G, skin.inverseBindMatrices) : (() => { const a = new Float32Array(16 * NJ); for (let j = 0; j < NJ; j++) a.set(HV_I, j * 16); return a; })();
  const names = JN.map(n => J.nodes[n].name || '');
  const find = re => names.findIndex(n => re.test(n));
  const hips = find(/^hips$/i) >= 0 ? find(/^hips$/i) : order[0];
  const top = jRoot[hips] || jRoot[order[0]];
  const rootScale = Math.hypot(top[0], top[1], top[2]) || 1;
  // клипы
  const clips = {};
  for (const an of J.animations || []){
    const tr = Array.from({ length: NJ }, () => ({}));
    let dur = 0;
    for (const ch of an.channels){
      const j = jIdx.get(ch.target.node), path = ch.target.path;
      if (j === undefined || (path !== 'translation' && path !== 'rotation' && path !== 'scale')) continue;
      const sm = an.samplers[ch.sampler], ti = hvAcc(G, sm.input), n = path === 'rotation' ? 4 : 3;
      let v = hvAcc(G, sm.output);
      if (!(v instanceof Float32Array)) v = Float32Array.from(v);
      if (sm.interpolation === 'CUBICSPLINE'){ const k = ti.length, v2 = new Float32Array(k * n); for (let i = 0; i < k; i++) for (let c = 0; c < n; c++) v2[i * n + c] = v[(i * 3 + 1) * n + c]; v = v2; }
      const L = ti.length, t0 = ti[0], t1 = ti[L - 1], step = L > 1 ? (t1 - t0) / (L - 1) : 1;
      let uni = L > 1; for (let i = 1; i < L && uni; i++) if (Math.abs(ti[i] - ti[i - 1] - step) > 1e-3) uni = false;
      tr[j][path[0]] = { t: ti, v, n, L, t0, dt: step, uni, stepI: sm.interpolation === 'STEP' };
      dur = Math.max(dur, t1);
    }
    clips[an.name] = { name: an.name, dur: Math.max(dur, 1e-3), tr, speed: 0 };
  }
  // корневое движение: убираем горизонтальный дрейф Hips (юнита двигает игра), колебания и высоту оставляем
  for (const c of Object.values(clips)){
    const k = c.tr[hips] && c.tr[hips].t; if (!k || k.L < 2) continue;
    const v = k.v, L = k.L, dx = v[(L - 1) * 3] - v[0], dz = v[(L - 1) * 3 + 2] - v[2];
    c.speed = Math.hypot(dx, dz) * rootScale * HV65.SCALE / c.dur;   // естественная скорость клипа, м/с
    if (/dying|death/i.test(c.name)) continue;
    let mx = 0, mz = 0;
    for (let i = 0; i < L; i++){ const f = i / (L - 1); v[i * 3] -= dx * f; v[i * 3 + 2] -= dz * f; mx += v[i * 3]; mz += v[i * 3 + 2]; }
    mx = mx / L - bT[hips * 3]; mz = mz / L - bT[hips * 3 + 2];
    for (let i = 0; i < L; i++){ v[i * 3] -= mx; v[i * 3 + 2] -= mz; }
  }
  const pick = (...res) => { for (const re of res){ const c = Object.values(clips).find(c => re.test(c.name)); if (c) return c; } return null; };
  const CL = {
    idle: pick(/^idle$/i, /idle/i), walk: pick(/^walk$/i, /walk(?!.*shoot)/i), shoot: pick(/shoot/i, /walk/i),
    run: pick(/charge/i, /^run$/i, /run/i), die: pick(/dying|death|die/i),
  };
  const run0 = pick(/^run$/i);
  for (const k of Object.keys(CL)) if (!CL[k]) CL[k] = CL.idle || Object.values(clips)[0];
  if (!CL.idle) throw new Error('нет клипов');
  const natural = (c, def) => (c && c.speed > 0.6 && c.speed < 7 ? c.speed : def);
  const SPD = { walk: natural(CL.walk, 1.4), shoot: natural(CL.shoot, 1.3), run: natural(CL.run, natural(run0, 3.6)) };
  // верх тела = всё от первого позвонка над тазом (в этом скелете порядок имён обратный: Hips → Spine02 → Spine01 → Spine)
  const spRoot = (() => { for (let j = 0; j < NJ; j++) if (jPar[j] === hips && /spine/i.test(names[j])) return j; return find(/^spine$/i); })();
  const upperJ = [], isUpper = j => { for (let p = j; p >= 0; p = jPar[p]) if (p === spRoot) return true; return false; };
  for (let j = 0; j < NJ; j++) if (isUpper(j)) upperJ.push(j);
  const pitchJ = [find(/^spine01$/i), find(/^spine02$/i)].filter(j => j >= 0);
  return { G, prim, NJ, names, jPar, jRoot, order, bT, bR, bS, ibm, clips, CL, SPD, upperJ, pitchJ, hips,
           handR: find(/^righthand$/i), handL: find(/^lefthand$/i), tRef: CL.shoot.dur * 0.3 };
}

// ---------------------------------------------------------------- позы: выборка клипов, смешивание, матрицы костей
const HVS = { T: new Float32Array(72), R: new Float32Array(96), S: new Float32Array(72), aT: new Float32Array(72), aR: new Float32Array(96), aS: new Float32Array(72), m: new Float32Array(16) };
function hvTrack(k, time, out, oi){
  const n = k.n, v = k.v, L = k.L;
  if (L === 1 || time <= k.t[0]){ for (let c = 0; c < n; c++) out[oi + c] = v[c]; return; }
  if (time >= k.t[L - 1]){ for (let c = 0; c < n; c++) out[oi + c] = v[(L - 1) * n + c]; return; }
  let i;
  if (k.uni) i = Math.min(L - 2, Math.max(0, Math.floor((time - k.t0) / k.dt)));
  else { let lo = 0, hi = L - 1; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (k.t[m] <= time) lo = m; else hi = m; } i = lo; }
  const a = k.t[i], f = k.stepI ? 0 : Math.min(1, Math.max(0, (time - a) / (k.t[i + 1] - a))), A = i * n, B = A + n;
  if (n === 4){
    const s = (v[A] * v[B] + v[A + 1] * v[B + 1] + v[A + 2] * v[B + 2] + v[A + 3] * v[B + 3]) < 0 ? -1 : 1;
    let x = v[A] + (v[B] * s - v[A]) * f, y = v[A + 1] + (v[B + 1] * s - v[A + 1]) * f, z = v[A + 2] + (v[B + 2] * s - v[A + 2]) * f, w = v[A + 3] + (v[B + 3] * s - v[A + 3]) * f;
    const l = 1 / (Math.hypot(x, y, z, w) || 1);
    out[oi] = x * l; out[oi + 1] = y * l; out[oi + 2] = z * l; out[oi + 3] = w * l;
  } else for (let c = 0; c < 3; c++) out[oi + c] = v[A + c] + (v[B + c] - v[A + c]) * f;
}
function hvSample(M, clip, time){   // -> HVS.T/R/S (локальные TRS всех костей)
  const { T, R, S: Sc } = HVS;
  for (let j = 0; j < M.NJ; j++){
    const tr = clip.tr[j];
    if (tr.t) hvTrack(tr.t, time, T, j * 3); else { T[j * 3] = M.bT[j * 3]; T[j * 3 + 1] = M.bT[j * 3 + 1]; T[j * 3 + 2] = M.bT[j * 3 + 2]; }
    if (tr.r) hvTrack(tr.r, time, R, j * 4); else for (let c = 0; c < 4; c++) R[j * 4 + c] = M.bR[j * 4 + c];
    if (tr.s) hvTrack(tr.s, time, Sc, j * 3); else for (let c = 0; c < 3; c++) Sc[j * 3 + c] = M.bS[j * 3 + c];
  }
}
function hvBlendInto(M, w, joints){   // HVS.a* += w * HVS.*  (кватернионы — в одном полушарии)
  const { T, R, S: Sc, aT, aR, aS } = HVS;
  const each = j => {
    for (let c = 0; c < 3; c++){ aT[j * 3 + c] += T[j * 3 + c] * w; aS[j * 3 + c] += Sc[j * 3 + c] * w; }
    const d = aR[j * 4] * R[j * 4] + aR[j * 4 + 1] * R[j * 4 + 1] + aR[j * 4 + 2] * R[j * 4 + 2] + aR[j * 4 + 3] * R[j * 4 + 3], s = d < 0 ? -w : w;
    for (let c = 0; c < 4; c++) aR[j * 4 + c] += R[j * 4 + c] * s;
  };
  if (joints) for (const j of joints) each(j); else for (let j = 0; j < M.NJ; j++) each(j);
}
// layers: [{clip, t, w}], up: {clip, t, w} — верх тела (позвоночник и выше) поверх основы
function hvPose(M, layers, up, pitch, W, K){
  const { aT, aR, aS } = HVS;
  aT.fill(0); aR.fill(0); aS.fill(0);
  let ws = 0;
  for (const L of layers){ if (L.w <= 1e-3) continue; hvSample(M, L.clip, L.t); hvBlendInto(M, L.w, null); ws += L.w; }
  if (ws < 1e-4){ aT.set(M.bT); aR.set(M.bR); aS.set(M.bS); ws = 1; }
  else { const k = 1 / ws; for (let i = 0; i < M.NJ * 3; i++){ aT[i] *= k; aS[i] *= k; } }
  if (up && up.w > 1e-3){
    hvSample(M, up.clip, up.t);
    const w = Math.min(1, up.w);
    for (const j of M.upperJ){ for (let c = 0; c < 3; c++){ aT[j * 3 + c] *= 1 - w; aS[j * 3 + c] *= 1 - w; } }
    // кватернионы: нормируем основу, затем nlerp к верхнему слою
    for (const j of M.upperJ){ const l = 1 / (Math.hypot(aR[j * 4], aR[j * 4 + 1], aR[j * 4 + 2], aR[j * 4 + 3]) || 1); for (let c = 0; c < 4; c++) aR[j * 4 + c] *= l * (1 - w); }
    hvBlendInto(M, w, M.upperJ);
  }
  const m = HVS.m;
  for (const j of M.order){
    const l = 1 / (Math.hypot(aR[j * 4], aR[j * 4 + 1], aR[j * 4 + 2], aR[j * 4 + 3]) || 1);
    for (let c = 0; c < 4; c++) aR[j * 4 + c] *= l;
    hvCompose(m, 0, aT, j * 3, aR, j * 4, aS, j * 3);
    const p = M.jPar[j];
    if (p >= 0) hvMul(W, j * 16, W, p * 16, m, 0); else hvMul(W, j * 16, M.jRoot[j], 0, m, 0);
    if (pitch && M.pitchJ.includes(j)){   // наклон корпуса по прицелу: поворот вокруг оси X модели в шарнире
      const a = -pitch / M.pitchJ.length, cs = Math.cos(a), sn = Math.sin(a);
      for (let c = 0; c < 3; c++){ const o = j * 16 + c * 4, y = W[o + 1], z = W[o + 2]; W[o + 1] = y * cs - z * sn; W[o + 2] = y * sn + z * cs; }
    }
  }
  for (let j = 0; j < M.NJ; j++) hvMul(K, j * 16, W, j * 16, M.ibm, j * 16);
}

// ---------------------------------------------------------------- пулемёт в руке (в модели оружия нет)
// строим из коробок и цилиндров в системе оружия: +Z — ствол, +Y — верх, начало — рукоять
function hvGunGeo(){
  const P = [], N = [], C = [], I = [];
  const STEEL = [0.055, 0.058, 0.064], DARK = [0.03, 0.032, 0.036], OLIVE = [0.17, 0.185, 0.11], SAND = [0.36, 0.33, 0.26];
  const quad = (a, b, c, d, n, col) => { const k = P.length / 3; for (const v of [a, b, c, d]){ P.push(...v); N.push(...n); C.push(...col, 1); } I.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const box = (cx, cy, cz, hx, hy, hz, col) => {
    const v = (x, y, z) => [cx + x * hx, cy + y * hy, cz + z * hz];
    quad(v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1), [1, 0, 0], col);
    quad(v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1), v(-1, -1, -1), [-1, 0, 0], col);
    quad(v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1), [0, 1, 0], col);
    quad(v(-1, -1, 1), v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), [0, -1, 0], col);
    quad(v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1), [0, 0, 1], col);
    quad(v(1, -1, -1), v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), [0, 0, -1], col);
  };
  const cyl = (cx, cy, cz, r, hz, col, seg) => {
    seg = seg || 8;
    for (let i = 0; i < seg; i++){
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
      const p = (a, z) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz + z];
      quad(p(a0, -hz), p(a1, -hz), p(a1, hz), p(a0, hz), [Math.cos(am), Math.sin(am), 0], col);
      quad([cx, cy, cz + hz], p(a0, hz), p(a1, hz), [cx, cy, cz + hz], [0, 0, 1], col);
    }
  };
  box(0, 0.035, 0.07, 0.042, 0.055, 0.19, STEEL);          // ствольная коробка
  box(0, 0.10, 0.06, 0.016, 0.014, 0.12, DARK);            // планка сверху
  cyl(0, 0.04, 0.43, 0.036, 0.17, DARK, 10);               // кожух ствола
  for (let k = 0; k < 4; k++) box(0, 0.04, 0.32 + k * 0.07, 0.04, 0.04, 0.008, STEEL);   // рёбра кожуха
  cyl(0, 0.04, 0.65, 0.015, 0.06, STEEL, 8);               // дульный срез
  box(-0.075, -0.02, 0.06, 0.035, 0.065, 0.075, OLIVE);    // короб с лентой
  box(0, -0.06, -0.01, 0.02, 0.06, 0.026, DARK);           // рукоять
  box(0, 0.02, -0.24, 0.032, 0.05, 0.11, SAND);            // приклад
  box(0, -0.035, 0.27, 0.02, 0.03, 0.05, DARK);            // передняя рукоять
  return { P, N, C, I };
}
// ---------------------------------------------------------------- шейдеры модели
const HV_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aT;
layout(location=3) in vec4 aJ; layout(location=4) in vec4 aW; layout(location=5) in vec4 aC;
uniform mat4 uB[24];
uniform mat4 uM;     // модель -> мир (относительно камеры)
uniform mat3 uV;     // мир -> вид
uniform vec4 uPr;    // fx, fy, A, B
out vec3 vW; out vec3 vN; out vec2 vT; out vec4 vC; out float vZ; out float vH;
void main(){
  mat4 K = aW.x * uB[int(aJ.x + 0.5)] + aW.y * uB[int(aJ.y + 0.5)] + aW.z * uB[int(aJ.z + 0.5)] + aW.w * uB[int(aJ.w + 0.5)];
  vec4 mp = K * vec4(aP, 1.0);
  vH = mp.y;
  vec4 wp = uM * mp;
  vW = wp.xyz;
  vN = mat3(uM) * (mat3(K) * aN);
  vT = aT; vC = aC;
  vec3 v = uV * wp.xyz;
  vZ = -v.z;
  gl_Position = vec4(v.x * uPr.x, v.y * uPr.y, uPr.z * v.z + uPr.w, -v.z);
}`;
const HV_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uCamW;
uniform vec4 uP;      // x тень солнца, y вспышка попадания, z жар обломков, w яркость текстуры
uniform vec4 uLP[16]; uniform vec4 uLC[16]; uniform int uNL;
uniform float uLamp, uStorm, uTime;
uniform highp sampler2D uPar; uniform highp sampler3D uNoise; uniform int uNP;   // дым и огонь — те же объёмы, что у рэймарчера
in vec3 vW; in vec3 vN; in vec2 vT; in vec4 vC; in float vZ; in float vH;
out vec4 frag;
const vec3 C1v = vec3(1.0, 0.82, 0.62) * 1.7;
const vec3 C2v = vec3(0.58, 0.74, 1.0) * 1.55;
vec4 volumes(vec3 o, vec3 d, float tMax){   // копия volumes() из scene.glsl: дым перед бойцом закрывает его
  vec3 add = vec3(0.0); float T = 1.0;
  vec3 S1 = normalize(vec3(0.62, 0.55, 0.56));
  for (int i = 0; i < 200; i++){
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
    float nn = texture(uNoise, mp * 0.06 + vec3(0.0, uTime * 0.04, float(i) * 0.137)).r;
    if (b.w < 10.5){
      float age = b.x;
      vec3 fc = mix(vec3(7.0, 3.6, 1.3), vec3(1.8, 0.4, 0.08), smoothstep(0.0, 0.55, age)) * (1.0 - age) * b.y;
      float al = 1.0 - exp(-(L / r * prof * (0.5 + 1.0 * nn) * 1.6));
      add += T * fc * al; T *= 1.0 - al * 0.45;
    } else {
      vec3 up = c / max(length(c), 1.0);
      vec3 sunl = C1v * max(dot(up, S1), 0.0) + C2v * max(dot(up, -S1), 0.0);
      vec3 sc = vec3(b.y) * (vec3(0.035) + sunl * 0.22) + b.z * vec3(1.2, 0.5, 0.15);
      float al = 1.0 - exp(-(L / r * prof * b.x * (0.25 + 1.3 * nn)));
      add += T * sc * al; T *= 1.0 - al;
    }
  }
  return vec4(add, T);
}
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
  vec3 alb; float sp;
  if (vC.a > 1.5){ alb = vec3(0.02); sp = 0.3; }   // v6.9: светящиеся детали оружия
  else if (vC.a > 0.5){ alb = vC.rgb; sp = 0.55; }
  else { alb = pow(texture(uTex, vT).rgb, vec3(2.2)) * uP.w; sp = 0.22; }
  alb = mix(alb, vec3(1.0, 0.55, 0.2), uP.y * 0.5);
  vec3 em = vec3(1.0, 0.45, 0.15) * uP.y * 0.8 + vec3(1.4, 0.45, 0.12) * uP.z * uP.z * 0.04 * (1.0 - smoothstep(0.1, 0.6, vH)) + (vC.a > 1.5 ? vC.rgb : vec3(0.0));
  float d1 = dot(n, SUN1);
  vec3 L = d1 > 0.0 ? SUN1 : SUN2, LC = d1 > 0.0 ? C1 : C2;
  float sh = smoothstep(-0.1, 0.05, dot(up, L)); if (dot(up, L) > 0.0) sh *= uP.x;
  vec3 h = normalize(L + vd);
  vec3 col = LC * abs(d1) * sh * (alb + sp * pow(max(dot(n, h), 0.0), 48.0) * 0.7);
  float hemi = 0.5 + 0.5 * dot(n, up);
  vec3 bounce = mix(C2, C1, 0.5 + 0.5 * dot(up, SUN1)) * 0.012;
  vec3 amb = mix(vec3(0.016, 0.015, 0.014), vec3(0.03, 0.036, 0.05), hemi) + bounce * (1.0 - hemi * 0.5);
  col += alb * mix(0.5, 1.0, smoothstep(0.0, 1.2, vH)) * amb;
  for (int i = 0; i < 16; i++){
    if (i >= uNL) break;
    vec3 lv = uLP[i].xyz - p; float dd = dot(lv, lv), rr = uLP[i].w;
    if (dd > rr * rr) continue;
    float ds = sqrt(dd); lv /= ds;
    float f = 1.0 - ds / rr, att = f * f / (1.0 + dd * 0.04);
    col += uLC[i].rgb * att * (alb * max(dot(n, lv), 0.0) + sp * pow(max(dot(n, normalize(lv + vd)), 0.0), 30.0) * 0.5);
  }
  float cd = length(vW);
  col += alb * uLamp * max(dot(n, vd), 0.0) * vec3(1.0, 0.96, 0.9) * 0.3 * exp(-cd * 0.04);
  float rim = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 2.5);
  col += vec3(0.30, 0.48, 0.62) * 0.2 * rim + em;
  col = mix(fogCol(-vd), col, exp(-cd * (0.0011 + 0.016 * uStorm)));
  vec4 vol = volumes(uCamW, -vd, cd);
  col = vol.rgb + vol.a * col;
  frag = vec4(col, 1.0);
  gl_FragDepth = clamp(log(max(vZ, 0.05) / 0.05) / log(400000.0), 0.0, 1.0);
}`;

// ---------------------------------------------------------------- загрузка в видеокарту
HV65.start = function(){
  this.started = true;
  try {
    const el = document.getElementById('hv65glb');
    if (!el || !el.textContent || el.textContent.length < 1000) throw new Error('нет встроенной модели');
    const G = hvParseGLB(hvB64(el.textContent));
    const M = hvBuildModel(G), J = G.J, A = M.prim.attributes;
    const pos = hvAcc(G, A.POSITION), nrm = hvAcc(G, A.NORMAL), uv = A.TEXCOORD_0 !== undefined ? hvAcc(G, A.TEXCOORD_0) : null;
    const jnt = hvAcc(G, A.JOINTS_0), wgt = hvAcc(G, A.WEIGHTS_0);
    const nv = pos.length / 3;
    const idx0 = M.prim.indices !== undefined ? hvAcc(G, M.prim.indices) : Uint32Array.from({ length: nv }, (_, i) => i);
    // оружие: запекаем в позу привязки кисти, чтобы оно двигалось вместе с правой рукой
    const gun = hvGunGeo(), ng = gun.P.length / 3;
    const W = new Float32Array(16 * 24), K = new Float32Array(16 * 24);
    hvPose(M, [{ clip: M.CL.shoot, t: M.tRef, w: 1 }], null, 0, W, K);
    const hR = M.handR, hL = M.handL;
    const pR = [W[hR * 16 + 12], W[hR * 16 + 13], W[hR * 16 + 14]], pL = hL >= 0 ? [W[hL * 16 + 12], W[hL * 16 + 13], W[hL * 16 + 14]] : null;
    let f = pL ? norm(sub(pL, pR)) : [0, 0, 1];
    if (f[2] < 0.25) f = [0, 0, 1];
    f = norm(add(f, [0, 0, 0.6]));   // ближе к «вперёд»: в позе стрельбы ствол смотрит на цель
    const upv = norm(sub([0, 1, 0], mul(f, f[1]))), xv = cross(upv, f);
    const hy = norm([W[hR * 16 + 4], W[hR * 16 + 5], W[hR * 16 + 6]]);   // ось кисти (к пальцам)
    const grip = add(pR, add(mul(hy, 0.075 * HV65.GRIP), mul(upv, -0.01)));
    const D = new Float32Array([...xv, 0, ...upv, 0, ...f, 0, ...grip, 1]);
    const Kinv = hvInv(K, hR * 16), DK = new Float32Array(16); hvMul(DK, 0, Kinv, 0, D, 0);
    const N = nv + ng;
    const P = new Float32Array(N * 3), Nn = new Float32Array(N * 3), T = new Float32Array(N * 2), Jt = new Uint8Array(N * 4), Wt = new Float32Array(N * 4), Cc = new Float32Array(N * 4);
    P.set(pos); Nn.set(nrm); if (uv) T.set(uv);
    for (let i = 0; i < nv * 4; i++){ Jt[i] = jnt[i]; Wt[i] = wgt[i]; }
    for (let i = 0; i < ng; i++){
      const o = (nv + i);
      const v = hvXf(DK, 0, gun.P[i * 3], gun.P[i * 3 + 1], gun.P[i * 3 + 2], 1), n = norm(hvXf(DK, 0, gun.N[i * 3], gun.N[i * 3 + 1], gun.N[i * 3 + 2], 0));
      P.set(v, o * 3); Nn.set(n, o * 3); Jt[o * 4] = hR; Wt[o * 4] = 1; Cc.set(gun.C.slice(i * 4, i * 4 + 4), o * 4);
    }
    const NI = idx0.length + gun.I.length, I32 = N > 65000;
    const idx = I32 ? new Uint32Array(NI) : new Uint16Array(NI);
    idx.set(idx0); for (let i = 0; i < gun.I.length; i++) idx[idx0.length + i] = gun.I[i] + nv;
    // программа
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, HV_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, HV_FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const U = {};
    for (const n of ['uB', 'uM', 'uV', 'uPr', 'uTex', 'uCamW', 'uP', 'uLP', 'uLC', 'uNL', 'uLamp', 'uStorm', 'uTime', 'uPar', 'uNoise', 'uNP']) U[n] = gl.getUniformLocation(p, n);
    const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (loc, data, n, type) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, type || gl.FLOAT, false, 0, 0); };
    buf(0, P, 3); buf(1, Nn, 3); buf(2, T, 2); buf(3, Jt, 4, gl.UNSIGNED_BYTE); buf(4, Wt, 4); buf(5, Cc, 4);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(prevVao);
    Object.assign(this, { M, P: p, U, vao, nIdx: NI, idxType: I32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, nVerts: N });
    // текстура (JPEG внутри GLB) — асинхронно; до её готовности бойцы рисуются по-старому
    const img = J.images && J.images[J.materials[M.prim.material || 0].pbrMetallicRoughness.baseColorTexture.index !== undefined ? J.textures[J.materials[M.prim.material || 0].pbrMetallicRoughness.baseColorTexture.index].source : 0];
    if (!img || img.bufferView === undefined) throw new Error('нет текстуры');
    const bv = J.bufferViews[img.bufferView], blob = new Blob([G.BIN.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)], { type: img.mimeType || 'image/jpeg' });
    const upload = src => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      gl.activeTexture(gl.TEXTURE0);
      this.tex = t; this.ok = true;
    };
    const viaImg = () => { const im = new Image(); im.onload = () => { try { upload(im); } catch (e){ this.fail(e); } URL.revokeObjectURL(im.src); }; im.onerror = () => this.fail('текстура не декодировалась'); im.src = URL.createObjectURL(blob); };
    if (typeof createImageBitmap === 'function') createImageBitmap(blob).then(b => { try { upload(b); } catch (e){ this.fail(e); } }).catch(viaImg);
    else viaImg();
  } catch (e){ this.fail(e); }
};
HV65.GRIP = 1;

// ---------------------------------------------------------------- автомат состояний анимации
const HV_LOCO = { walk: 1, run: 1, shoot: 1 };
HV65.animate = function(e, st, dt){
  const M = this.M, CL = M.CL;
  const v = e.vel || [0, 0, 0], up = e.up, vu = dot(v, up);
  const hs = len(sub(v, mul(up, vu)));
  st.hs += (hs - st.hs) * (1 - Math.exp(-dt * 8));
  const fire = S.time - st.shot < 0.45;
  const air = e.alive && !e.grounded && (e.airT || 0) > 0.3;
  let want, sp = 1, upW = 0;
  if (!e.alive){ want = 'die'; }
  else if (air){ want = 'run'; sp = e.thrusting ? 0.45 : 0.25; upW = fire ? 0.9 : 0.4; }
  else if (fire && st.hs > 0.5){ want = 'shoot'; sp = clamp(st.hs / M.SPD.shoot, 0.6, 2.2); }
  else if (st.hs < 0.35){ want = 'idle'; upW = fire ? 1 : 0.8; }
  else if (st.hs < 2.2){ want = 'walk'; sp = clamp(st.hs / M.SPD.walk, 0.6, 1.8); upW = fire ? 1 : 0.65; }
  else { want = 'run'; sp = clamp(st.hs / M.SPD.run, 0.7, 2.0); }
  if (st.force){ want = st.force.want; sp = st.force.sp !== undefined ? st.force.sp : 1; upW = st.force.uw || 0; }   // для тестов/скриншотов
  if (st.want !== want){
    const nc = CL[want], cur = st.layers[st.layers.length - 1];
    let t0 = 0;
    if (cur && HV_LOCO[st.want] && HV_LOCO[want]) t0 = (cur.t / cur.clip.dur) * nc.dur;   // фаза шага сохраняется
    else if (want === 'idle') t0 = random() * nc.dur;
    for (const L of st.layers) L.tw = 0;
    st.layers.push({ clip: nc, t: t0, w: st.layers.length ? 0 : 1, tw: 1, sp, loop: want !== 'die' });
    if (st.layers.length > 3) st.layers.shift();
    st.want = want;
  }
  st.layers[st.layers.length - 1].sp = sp;
  const r = dt / this.FADE;
  for (const L of st.layers){
    L.t += dt * L.sp;
    if (L.loop) L.t %= L.clip.dur; else L.t = Math.min(L.t, L.clip.dur);
    L.w = L.tw > L.w ? Math.min(L.tw, L.w + r) : Math.max(L.tw, L.w - r);
  }
  st.layers = st.layers.filter(L => L.w > 0 || L.tw > 0);
  st.uw += clamp(upW - st.uw, -dt / 0.15, dt / 0.15);
  st.ut = fire ? (st.ut + dt) % CL.shoot.dur : M.tRef + 0.04 * Math.sin(S.time * 1.7 + st.id);
  const aim = e.aim || e.fwd, pw = e.alive ? clamp(Math.asin(clamp(dot(aim, up), -1, 1)), -0.7, 0.7) * (want === 'run' && !air ? 0.3 : 1) : 0;
  st.pitch += (pw - st.pitch) * (1 - Math.exp(-dt * 10));
  hvPose(M, st.layers, st.uw > 0.01 ? { clip: CL.shoot, t: st.ut, w: st.uw } : null, st.pitch, st.W, st.K);
};
// ---------------------------------------------------------------- отрисовка (после рэймарчера, в тот же HDR-буфер)
const HV_UM = new Float32Array(16), HV_UV = new Float32Array(9);
HV65.draw = function(c, nl, np){
  if (!this.ok || !this.list.length) return;
  const t0 = performance.now();
  const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
  try {
    const U = this.U, M = this.M;
    gl.useProgram(this.P);
    gl.bindVertexArray(this.vao);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(U.uTex, 3);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texPar); gl.uniform1i(U.uPar, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_3D, texNoise); gl.uniform1i(U.uNoise, 2);
    gl.uniform1i(U.uNP, np || 0); gl.uniform1f(U.uTime, performance.now() / 1000 % 1000);
    const R = c.right, Up = c.up, F = c.fwd;
    HV_UV.set([R[0], Up[0], -F[0], R[1], Up[1], -F[1], R[2], Up[2], -F[2]]);
    gl.uniformMatrix3fv(U.uV, false, HV_UV);
    const aspect = fboW / fboH, fy = 2 / c.fov, fx = fy / aspect, n = 0.05, f = 20000;
    gl.uniform4f(U.uPr, fx, fy, -(f + n) / (f - n), -2 * f * n / (f - n));
    gl.uniform3fv(U.uCamW, c.pos);
    gl.uniform4fv(U.uLP, LP); gl.uniform4fv(U.uLC, LC); gl.uniform1i(U.uNL, nl || 0);
    gl.uniform1f(U.uLamp, S.mode === 'fps' && !S.attract ? 1 : 0);
    gl.uniform1f(U.uStorm, (S.storm ? S.storm.k : 0) * ((S.mode === 'fps' || S.attract) ? 1 : 0.12));
    const tx = c.fov * 0.5 * aspect, ty = c.fov * 0.5;
    let drawn = 0, posed = 0;
    for (const o of this.list){
      const e = o.e, st = this.state(e);
      // отсечение по кадру (сфера 1.3 м вокруг центра бойца)
      const cx = o.origin[0] + e.up[0] * 0.9 - c.pos[0], cy = o.origin[1] + e.up[1] * 0.9 - c.pos[1], cz = o.origin[2] + e.up[2] * 0.9 - c.pos[2];
      const vx = R[0] * cx + R[1] * cy + R[2] * cz, vy = Up[0] * cx + Up[1] * cy + Up[2] * cz, vz = F[0] * cx + F[1] * cy + F[2] * cz;
      if (vz < -1.3 || Math.abs(vx) > vz * tx + 1.6 || Math.abs(vy) > vz * ty + 1.6){ st.lt = S.time; continue; }
      // поза: вблизи каждый кадр, дальше — реже (время клипов всё равно идёт)
      const per = e === S.me || o.d < 60 ? 1 : o.d < 150 ? 2 : o.d < 300 ? 4 : 8;
      if (!st.posed || (this.fr + st.id) % per === 0){
        st.posed = true;
        const dt = clamp(S.time - st.lt, 0, 0.3); st.lt = S.time;
        this.animate(e, st, dt); posed++;
      }
      if (S.time - st.shAt > 0.4){ st.shAt = S.time + random() * 0.1; st.sh = shadowJS(add(o.origin, mul(e.up, 1.0))); }
      // модель: X = Up × F (правая тройка), Y = нормаль поверхности, Z = взгляд; ступни на o.origin
      const fw = tangent(e.fwd, e.up), xs = cross(e.up, fw), s = this.SCALE;
      HV_UM.set([xs[0] * s, xs[1] * s, xs[2] * s, 0, e.up[0] * s, e.up[1] * s, e.up[2] * s, 0, fw[0] * s, fw[1] * s, fw[2] * s, 0,
                 o.origin[0] - c.pos[0], o.origin[1] - c.pos[1], o.origin[2] - c.pos[2], 1]);
      gl.uniformMatrix4fv(U.uM, false, HV_UM);
      gl.uniformMatrix4fv(U.uB, false, st.K);
      gl.uniform4f(U.uP, st.sh, e.flash || 0, e.alive ? 0 : (e.heat || 0), this.ALB);
      gl.drawElements(gl.TRIANGLES, this.nIdx, this.idxType, 0);
      drawn++;
    }
    this.stats.drawn = drawn; this.stats.posed = posed; this.stats.cand = this.list.length;
  } catch (e){ this.fail(e); }
  gl.bindVertexArray(prevVao);
  gl.activeTexture(gl.TEXTURE0);
  this.stats.ms = this.stats.ms * 0.95 + (performance.now() - t0) * 0.05;
};
HV65.ALB = 1.0;
// ---------------------------------------------------------------- кто стреляет (для клипа «стрельба на ходу»)
{
  const _hvEmit = emit;
  emit = function(type, data){
    if (type === 'shot' && data && data.src && HV65.ok && HV65.is(data.src)) HV65.state(data.src).shot = S.time;
    return _hvEmit(type, data);
  };
}
