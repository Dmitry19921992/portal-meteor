// =====================================================================
//  v8.20 (T35) — ЭНЦИКЛОПЕДИЯ: мини-рендеры, поиск на телефоне, встреча «по экрану», живые HP (CX820).
//  Дополняет CX813 (v813_codex.js) — старый файл не меняется, всё через обёртки:
//  1. Мини-рендеры: вместо эмодзи-значка карточка получает canvas с 3/4-рендером процедурной низкополигональной
//     модели (свой крошечный WebGL2-рендерер на отдельном холсте, кэш на модель+краску; фракционная краска из TEAM).
//     Модели есть для юнитов/боссов/зданий; у аномалий/фауны/поддержки/режимов/мира — прежние значки.
//  2. Поиск: поле ввода теперь и на телефоне/планшете (TOUCH), а не только на ПК.
//  3. Встреча «по экрану»: аномалии и фауна отмечаются встреченными, когда попадают в камеру (onScreen/project),
//     а не по расстоянию до отрядов; техника — по-прежнему по «засветке» (team/seen/fog).
//  4. Живые HP: makeTank/makeDrone/makeBuilder/finishProduct(rhino76)/BOSS83.weakK обёрнуты — реальные maxhp и
//     множитель слабого места пишутся в localStorage (pm835_hp) и подставляются в CX813.FB вместо констант;
//     до первого спавна в бою — прежние запасные значения CX813.FB.
//  Хуки — обёртки: CX813.card/html/refresh/wire/scan, makeTank, makeDrone, makeBuilder, finishProduct, BOSS83.weakK.
//  Новый код только здесь. Выкл.: ?t35=0 (при ?cx813=0 модуль ничего не делает).
// =====================================================================
const CX820 = {
  on: (() => { try { return new URLSearchParams(location.search).get('t35') !== '0'; } catch (e){ return true; } })(),
  err: {}, stats: { mk: 0, rendered: 0, painted: 0, hp: 0, scans: 0 },
  SZ: 96,                        // размер квадрата рендера, px
  HP: { tank: [0, 0], drone: 0, builder: 0, rhino: 0, weak: 0 },   // 0 = ещё не захвачено
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('CX820 ' + tag, e); } } },
  ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e){ return null; } },
  // ---------------------------------------------------------------- живые HP: захват и подстановка в CX813.FB
  loadHP(){
    this.safe(() => {
      const d = JSON.parse(this.ls('pm835_hp') || 'null');
      if (d && typeof d === 'object') this.HP = Object.assign(this.HP, d);
    }, 'hp.load');
    this.applyFB();
  },
  hp(k, v){
    if (!(v > 0)) return;
    let ch = 0;
    if (k === 'tank0' || k === 'tank1'){ const f = +k.slice(4); if (this.HP.tank[f] !== v){ this.HP.tank[f] = v; ch = 1; } }
    else if (this.HP[k] !== v){ this.HP[k] = v; ch = 1; }
    if (!ch) return;
    this.stats.hp++;
    this.safe(() => this.ls('pm835_hp', JSON.stringify(this.HP)), 'hp.save');
    this.applyFB();
  },
  applyFB(){
    if (typeof CX813 === 'undefined' || !CX813 || !CX813.FB) return;
    const H = this.HP;
    if (H.tank[0] > 0 && H.tank[1] > 0) CX813.FB.tankHp = [H.tank[0], H.tank[1]];
    if (H.drone > 0) CX813.FB.droneHp = H.drone;
    if (H.builder > 0) CX813.FB.builderHp = H.builder;
    if (H.rhino > 0) CX813.FB.rhinoHp = H.rhino;
    if (H.weak > 0) CX813.FB.weak = H.weak;
  },
  hooksHP(){
    const SELF = this;
    if (typeof makeTank === 'function'){ const f0 = makeTank; makeTank = function(pos, team){ const e = f0.apply(this, arguments);
      SELF.safe(() => { if (e && e.maxhp > 0 && typeof FI76 === 'function') SELF.hp('tank' + FI76(team), e.maxhp); }, 'hp.tank'); return e; }; }
    if (typeof makeDrone === 'function'){ const f0 = makeDrone; makeDrone = function(pos, team){ const e = f0.apply(this, arguments);
      SELF.safe(() => { if (e && e.maxhp > 0) SELF.hp('drone', e.maxhp); }, 'hp.drone'); return e; }; }
    if (typeof makeBuilder === 'function'){ const f0 = makeBuilder; makeBuilder = function(team, pos){ const e = f0.apply(this, arguments);
      SELF.safe(() => { if (e && e.maxhp > 0) SELF.hp('builder', e.maxhp); }, 'hp.builder'); return e; }; }
    if (typeof finishProduct === 'function'){ const f0 = finishProduct; finishProduct = function(site, key){ const n0 = (typeof S !== 'undefined' && S.vehicles) ? S.vehicles.length : 0;
      const r = f0.apply(this, arguments);
      SELF.safe(() => { if (key === 'rhino76' && typeof S !== 'undefined' && S.vehicles.length > n0){ const v = S.vehicles[S.vehicles.length - 1]; if (v && v.rhino76 && v.maxhp > 0) SELF.hp('rhino', v.maxhp); } }, 'hp.rhino');
      return r; }; }
    if (typeof BOSS83 !== 'undefined' && BOSS83.weakK){ const w0 = BOSS83.weakK; BOSS83.weakK = function(e, src){ const k = w0.apply(this, arguments);
      SELF.safe(() => { if (e && k > 1 && k < 2) SELF.hp('weak', k); else if (e && e.boss83 === 'c' && k > 1) SELF.hp('weak', k); }, 'hp.weak'); return k; }; }
  },
  // ---------------------------------------------------------------- встреча «по экрану»
  hookScan(){
    const SELF = this, C = CX813;
    C.scan = function(){
      if (S.attract || !S.units) return;
      SELF.stats.scans++;
      const vis = e => e.team === 0 || (e.seen && e.seen[0] > 0) || !SET.fog;
      for (const v of S.vehicles || []){ if (!v.alive || !vis(v)) continue;
        if (v.boss83) this.mark('boss:' + v.boss83, BOSS83.nameK(v.boss83));
        else if (v.vk) this.mark('u:' + v.vk, N2(VK[v.vk].n[FI76(v.team) ? 1 : 0]));
        else if (v.rhino76) this.mark('u:rhino76', N2(PRODUCTS.rhino76.n)); }
      // «по экрану»: объект встречен, когда попадает в камеру (project + границы вьюпорта + facing)
      const onS = typeof onScreen === 'function' ? onScreen : null;
      const eyes = [];
      if (!onS){
        const me = ctrlEntity(); if (me) eyes.push(me.pos);
        for (const g of groupsOf(0).slice(0, 14)){ const L = leaderOf(g); if (L && L.pos) eyes.push(L.pos); }
      }
      const met = p => onS ? !!onS(p) : eyes.some(q => dist(q, p) < 60);
      if (typeof A78 !== 'undefined') for (const a of A78.L || []) if (a.pos && A78.K[a.k] && met(a.pos)) this.mark('a:' + a.k, N2(A78.K[a.k].n));
      if (typeof VER86 !== 'undefined') for (const f of VER86.L || []) if (f.pos && VER86.SP[f.sp] && f.alive !== false && met(f.pos)) this.mark('f:' + f.sp, N2(VER86.SP[f.sp].n));
    };
  },
  // ---------------------------------------------------------------- поиск на телефоне/планшете
  hookHtml(){
    const h0 = CX813.html.bind(CX813), SELF = this;
    CX813.html = function(){
      let h = h0.apply(this, arguments);
      SELF.safe(() => {
        if (typeof TOUCH !== 'undefined' && TOUCH.on && h.indexOf('id="cx813q"') < 0){
          const inp = `<input id="cx813q" type="text" placeholder="${CX813.L('Поиск…', 'Search…', 'Tìm…')}" value="${CX813.esc(CX813.q)}" autocomplete="off">`;
          h = h.replace('<span class="cxfr">', inp + '<span class="cxfr">');
        }
      }, 'html');
      return h;
    };
  },
  // ---------------------------------------------------------------- мини-рендеры
  MAP: {
    'role:assault': ['inf', 'assault'], 'role:heavy': ['inf', 'heavy'], 'role:rocket': ['inf', 'rocket'], 'role:sniper': ['inf', 'sniper'],
    'role:medic': ['inf', 'medic'], 'role:scout': ['inf', 'scout'],
    'p:squad': ['inf', 'assault'], 'p:elite': ['inf', 'heavy'], 'sniper1': ['inf', 'sniper'], 'scout1': ['inf', 'scout'],
    'p:builder': ['builder'], 'p:tank': ['tank'], 'u:rhino76': ['rhino'], 'p:drone': ['drone'],
    'u:raider': ['raider'], 'u:mlrs': ['mlrs'], 'u:cat': ['cat'],
    'boss:c': ['bossc'], 'boss:s': ['bosss'],
    'b:hq': ['hq'], 'b:turret': ['bturret'], 'b:aa': ['baa'], 'b:outpost': ['boutpost'], 'b:factory': ['bfactory'],
    'b:hub': ['bhub'], 'b:airdock': ['bairdock'], 'b:extractor': ['bextractor'], 'b:wall82': ['bwall'],
    'b:rep82': ['brepair'], 'b:tun82': ['btun'], 'b:tunx82': ['btunx'], 'b:asm83c': ['basmc'], 'b:asm83s': ['basms'],
  },
  hookCard(){
    const c0 = CX813.card.bind(CX813), SELF = this;
    CX813.card = function(e){
      const h = c0.apply(this, arguments);
      const m = SELF.MAP[e.key];
      if (!m || CX813.locked(e)) return h;
      const fac = (e.fac === 0 || e.fac === 1) ? e.fac : 0;
      return h.replace(/<i[^>]*>[\s\S]*?<\/i>/, `<i class="cxmi" title=""><canvas width="${SELF.SZ}" height="${SELF.SZ}" data-cxm="${m[0]}" data-cxi="${m[1] || ''}" data-cxf="${fac}"></canvas></i>`);
    };
  },
  paint(){
    const grid = document.getElementById('cx813g');
    if (!grid) return;
    for (const cv of grid.querySelectorAll('canvas[data-cxm]')){
      const img = this.render(cv.dataset.cxm, cv.dataset.cxi || '', +cv.dataset.cxf || 0);
      if (!img) continue;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      this.stats.painted++;
    }
  },
  hookRefresh(){
    const r0 = CX813.refresh.bind(CX813), SELF = this;
    CX813.refresh = function(){ const r = r0.apply(this, arguments); SELF.safe(() => SELF.paint(), 'paint'); return r; };
    const w0 = CX813.wire.bind(CX813);
    CX813.wire = function(){ const r = w0.apply(this, arguments); SELF.safe(() => SELF.paint(), 'paint.w'); return r; };
  },
  // ---------------------------------------------------------------- движок рендера
  gl: null, prog: null, geo: {}, cache: {},
  pal(){
    // краски фракций из TEAM (game.js), запасные — как в игре
    const hex = h => { const m = /^#([0-9a-f]{6})$/i.exec(h || ''); return m ? [parseInt(m[1].slice(0, 2), 16) / 255, parseInt(m[1].slice(2, 4), 16) / 255, parseInt(m[1].slice(4, 6), 16) / 255] : null; };
    const P = [hex(typeof TEAM !== 'undefined' && TEAM[0] && TEAM[0].css) || [0.84, 0.78, 0.6], hex(typeof TEAM !== 'undefined' && TEAM[1] && TEAM[1].css) || [1, 0.29, 0.23]];
    return { P, dark: [0.13, 0.14, 0.16], steel: [0.44, 0.47, 0.52], steelD: [0.26, 0.28, 0.31], track: [0.09, 0.09, 0.1],
             glass: [0.1, 0.15, 0.18], glowA: [1, 0.72, 0.25], glowR: [1, 0.32, 0.2], olive: [0.36, 0.39, 0.31], concrete: [0.52, 0.52, 0.5] };
  },
  initGL(){
    if (this.gl !== null) return this.gl;
    this.gl = false;
    const cv = document.createElement('canvas'); cv.width = cv.height = this.SZ;
    const gl = cv.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return false;
    const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
uniform mat4 uVP; uniform vec3 uPaint;
out vec3 vN; out vec3 vC; out float vE;
void main(){
  gl_Position = uVP * vec4(aP, 1.0);
  vN = aN;
  float pnt = min(aC.a, 1.0);
  vE = step(1.5, aC.a);
  vC = mix(aC.rgb, uPaint, pnt * step(aC.a, 1.5));
}`;
    const FS = `#version 300 es
precision mediump float;
in vec3 vN; in vec3 vC; in float vE;
out vec4 o;
void main(){
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(0.55, 0.82, 0.45));
  float d = max(dot(n, L), 0.0), b = max(dot(n, -L), 0.0) * 0.22;
  vec3 col = vC * (0.32 + 0.78 * d + b);
  vec3 h = normalize(L + vec3(0.0, 0.0, 1.0));
  col += vec3(0.28) * pow(max(dot(n, h), 0.0), 30.0);
  col += vC * vE * 1.4 + vec3(1.0, 0.85, 0.5) * vE * 0.25;
  o = vec4(col, 1.0);
}`;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.prog = p;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, this.SZ, this.SZ);
    this.gl = gl;
    return gl;
  },
  geoOf(mk, vari){
    const key = mk + '|' + vari;
    if (this.geo[key]) return this.geo[key];
    const a = [];
    this.safe(() => SPECS[mk] && SPECS[mk](a, vari || ''), 'geo.' + key);
    if (!a.length) return null;
    let n = 0; for (let i = 0; i < a.length; i++) n += a[i].length;
    const f = new Float32Array(n); let o = 0;
    for (const b of a){ f.set(b, o); o += b.length; }
    // центр и радиус
    let cx = 0, cy = 0, cz = 0, cnt = 0;
    for (let i = 0; i < f.length; i += 10){ cx += f[i]; cy += f[i + 1]; cz += f[i + 2]; cnt++; }
    cx /= cnt; cy /= cnt; cz /= cnt;
    let r2 = 0;
    for (let i = 0; i < f.length; i += 10){ const dx = f[i] - cx, dy = f[i + 1] - cy, dz = f[i + 2] - cz; const q = dx * dx + dy * dy + dz * dz; if (q > r2) r2 = q; }
    const out = { f, c: [cx, cy, cz], r: Math.sqrt(r2) || 1, tris: cnt / 3 };
    this.geo[key] = out;
    this.stats.mk++;
    return out;
  },
  render(mk, vari, fac){
    const key = mk + '|' + vari + '|' + fac;
    if (this.cache[key]) return this.cache[key];
    const gl = this.safe(() => this.initGL(), 'gl');
    if (!gl) return null;
    const g = this.geoOf(mk, vari);
    if (!g) return null;
    const paint = this.pal().P[fac] || this.pal().P[0];
    // сдвиг центра в начало координат
    const f = g.f.slice();
    for (let i = 0; i < f.length; i += 10){ f[i] -= g.c[0]; f[i + 1] -= g.c[1]; f[i + 2] -= g.c[2]; }
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, f, gl.STATIC_DRAW);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const S = 40; // stride floats
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 24);
    // камера: 3/4, чуть сверху
    const yaw = 0.72, pit = 0.42, fv = 0.72, aspect = 1;
    const dist = g.r / Math.tan(fv / 2) * 1.18 + g.r * 0.35;
    const eye = [Math.sin(yaw) * Math.cos(pit) * dist, Math.sin(pit) * dist + g.r * 0.12, Math.cos(yaw) * Math.cos(pit) * dist];
    const vp = MVP(eye, [0, 0, 0], fv, aspect, dist + g.r * 4);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.prog, 'uVP'), false, vp);
    gl.uniform3fv(gl.getUniformLocation(this.prog, 'uPaint'), paint);
    gl.drawArrays(gl.TRIANGLES, 0, f.length / 10);
    gl.bindVertexArray(null);
    gl.deleteBuffer(vbo); gl.deleteVertexArray(vao);
    const out = document.createElement('canvas'); out.width = out.height = this.SZ;
    out.getContext('2d').drawImage(gl.canvas, 0, 0);
    this.cache[key] = out;
    this.stats.rendered++;
    return out;
  },
  css(){
    if (document.getElementById('cx820css')) return;
    const st = document.createElement('style'); st.id = 'cx820css';
    st.textContent = `
.cx813 .cxc>i.cxmi{overflow:hidden;padding:0!important;background:radial-gradient(circle at 35% 28%,rgba(120,140,160,.30),rgba(0,0,0,.55))}
.cx813 .cxc>i.cxmi canvas{width:100%;height:100%;display:block}
.cx813 .cxc>i.cxmi canvas[data-cxm^="b"]{width:118%;height:118%;margin:-9%}
@media (max-width:520px){ .cx813 #cx813q{flex:1 1 120px;min-width:110px;max-width:none} }`;
    document.head.appendChild(st);
  },
  selfTest(){
    return { on: this.on, err: this.err, stats: this.stats, hp: this.HP, fb: (typeof CX813 !== 'undefined' && CX813.FB) || null,
      models: Object.keys(this.MAP).length, geo: Object.keys(this.geo).length, gl: !!this.gl };
  },
};

// ---------------- маленькая матбиблиотека камеры (column-major, как в игре)
function MVP(eye, ctr, fov, aspect, far){
  const z = norm3(sub3(eye, ctr)), x = norm3(cross3([0, 1, 0], z)), y = cross3(z, x);
  const t = 1 / Math.tan(fov / 2), n = Math.max(0.05, far * 0.02);
  const V = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot3(x, eye), -dot3(y, eye), -dot3(z, eye), 1];
  const P = [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + n) / (n - far), -1, 0, 0, 2 * far * n / (n - far), 0];
  return mul4(P, V);
}
function sub3(a, b){ return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot3(a, b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b){ return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm3(a){ const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function mul4(A, B){
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++){ let s = 0; for (let k = 0; k < 4; k++) s += A[k * 4 + r] * B[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
}

// ---------------- построители геометрии (вершина: pos3 nrm3 rgb + флаг краски: 0 цвет / 1 краска фракции / 2 свечение)
function mkBox(a, x, y, z, sx, sy, sz, c, o){
  o = o || {};
  const rz = o.rz || 0, rx = o.rx || 0, ry = o.ry || 0, f = o.f || 0;
  const P = (px, py, pz) => {
    let X = px, Y = py, Z = pz;
    if (rz){ const cs = Math.cos(rz), sn = Math.sin(rz); const q = cs * X - sn * Y; Y = sn * X + cs * Y; X = q; }
    if (rx){ const cs = Math.cos(rx), sn = Math.sin(rx); const q = cs * Y - sn * Z; Z = sn * Y + cs * Z; Y = q; }
    if (ry){ const cs = Math.cos(ry), sn = Math.sin(ry); const q = cs * X + sn * Z; Z = -sn * X + cs * Z; X = q; }
    return [X + x, Y + y, Z + z];
  };
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const K = [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]];
  const F = [[1, 5, 6, 2, [1, 0, 0]], [0, 3, 7, 4, [-1, 0, 0]], [3, 2, 6, 7, [0, 1, 0]], [0, 4, 5, 1, [0, -1, 0]], [4, 7, 6, 5, [0, 0, 1]], [0, 1, 2, 3, [0, 0, -1]]];
  const push = (p, n) => { a.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], f); };
  for (const q of F){
    const n = P(q[4][0], q[4][1], q[4][2]);              // нормаль грани (только поворот)
    const nv = norm3([n[0] - x, n[1] - y, n[2] - z]);
    const p0 = P(...K[q[0]]), p1 = P(...K[q[1]]), p2 = P(...K[q[2]]), p3 = P(...K[q[3]]);
    push(p0, nv); push(p1, nv); push(p2, nv);
    push(p0, nv); push(p2, nv); push(p3, nv);
  }
}
function mkCyl(a, x, y, z, rB, rT, h, seg, c, o){
  o = o || {};
  const rx = o.rx || 0, rz = o.rz || 0, ry = o.ry || 0, f = o.f || 0;
  const P = (px, py, pz) => {
    let X = px, Y = py, Z = pz;
    if (rz){ const cs = Math.cos(rz), sn = Math.sin(rz); const q = cs * X - sn * Y; Y = sn * X + cs * Y; X = q; }
    if (rx){ const cs = Math.cos(rx), sn = Math.sin(rx); const q = cs * Y - sn * Z; Z = sn * Y + cs * Z; Y = q; }
    if (ry){ const cs = Math.cos(ry), sn = Math.sin(ry); const q = cs * X + sn * Z; Z = -sn * X + cs * Z; X = q; }
    return [X + x, Y + y, Z + z];
  };
  const N = (nx, ny, nz) => { const p = P(nx, ny, nz); return norm3([p[0] - x, p[1] - y, p[2] - z]); };
  const hh = h / 2, push = (p, n) => a.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], f);
  for (let i = 0; i < seg; i++){
    const t0 = i / seg * Math.PI * 2, t1 = (i + 1) / seg * Math.PI * 2;
    const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
    const b0 = P(c0 * rB, -hh, s0 * rB), b1 = P(c1 * rB, -hh, s1 * rB), t0p = P(c0 * rT, hh, s0 * rT), t1p = P(c1 * rT, hh, s1 * rT);
    const n0 = N(c0, (rB - rT) / h, s0), n1 = N(c1, (rB - rT) / h, s1);
    push(b0, n0); push(b1, n1); push(t1p, n1);
    push(b0, n0); push(t1p, n1); push(t0p, n0);
    const nb = N(0, -1, 0), nt = N(0, 1, 0), cb = P(0, -hh, 0), ct = P(0, hh, 0);
    push(cb, nb); push(b1, nb); push(b0, nb);
    push(ct, nt); push(t0p, nt); push(t1p, nt);
  }
}

// ---------------- модели (вид 3/4, «вперёд» = +Z)
function mTank(a, s, heavy, boss){
  const P = PALX, f1 = { f: 1 };
  mkBox(a, 0, 0.95 * s, -0.15 * s, 2.3 * s, 0.8 * s, 3.5 * s, P.P0, f1);                    // корпус
  mkBox(a, 0, 1.25 * s, 1.55 * s, 2.3 * s, 0.42 * s, 0.9 * s, P.P0, { f: 1, rx: 0.5 });      // лобовой лист
  for (const sd of [-1, 1]){
    mkBox(a, sd * 1.08 * s, 0.5 * s, -0.1 * s, 0.5 * s, 0.75 * s, 3.8 * s, P.track);          // гусеница
    for (const wz of [-1.3, 0, 1.3]) mkCyl(a, sd * 1.1 * s, 0.42 * s, wz * s, 0.42 * s, 0.42 * s, 0.5 * s, 10, P.dark, { rz: Math.PI / 2 });
    if (heavy) mkBox(a, sd * 1.2 * s, 1.0 * s, -0.1 * s, 0.16 * s, 0.6 * s, 3.4 * s, P.steelD); // бортовой экран
  }
  mkBox(a, 0, 1.72 * s, -0.25 * s, 1.55 * s, 0.55 * s, 1.9 * s, P.P0, f1);                   // башня
  mkBox(a, 0, 2.05 * s, -0.25 * s, 1.0 * s, 0.16 * s, 1.3 * s, P.steelD);                     // крышка приборов
  mkCyl(a, 0, 1.72 * s, 1.75 * s, 0.09 * s, 0.09 * s, 2.3 * s, 8, P.dark, { rx: Math.PI / 2 });// ствол
  mkBox(a, 0, 1.72 * s, 2.8 * s, 0.2 * s, 0.2 * s, 0.35 * s, P.dark);                          // дульный тормоз
  mkBox(a, -0.5 * s, 2.3 * s, -0.9 * s, 0.05 * s, 0.9 * s, 0.05 * s, P.dark);                  // антенна
  mkBox(a, -0.5 * s, 2.78 * s, -0.9 * s, 0.08 * s, 0.08 * s, 0.08 * s, P.glowA, { f: 2 });
  if (boss) for (const sd of [-1, 1]){
    mkBox(a, sd * 1.35 * s, 1.5 * s, 0.9 * s, 0.5 * s, 0.4 * s, 0.9 * s, P.P0, f1);
    mkCyl(a, sd * 1.35 * s, 1.5 * s, 1.7 * s, 0.05 * s, 0.05 * s, 1.1 * s, 6, P.dark, { rx: Math.PI / 2 });
    mkBox(a, sd * 0.9 * s, 1.9 * s, -1.6 * s, 0.6 * s, 0.7 * s, 1.1 * s, P.steelD);            // кассета
  }
}
function mInf(a, role){
  const P = PALX, slim = role === 'scout' ? 0.85 : 1, wide = role === 'heavy' ? 1.3 : 1;
  mkBox(a, -0.15, 0.45, 0, 0.17, 0.9, 0.22, P.dark);
  mkBox(a, 0.15, 0.45, 0, 0.17, 0.9, 0.22, P.dark);
  mkBox(a, -0.15, 0.06, 0.04, 0.2, 0.12, 0.3, P.track);
  mkBox(a, 0.15, 0.06, 0.04, 0.2, 0.12, 0.3, P.track);
  mkBox(a, 0, 1.22, 0, 0.55 * slim * wide, 0.62, 0.34 * slim, P.P0, { f: 1 });                // торс
  mkBox(a, 0, 0.92, 0, 0.5 * slim * wide, 0.1, 0.3 * slim, P.dark);                            // ремень
  mkBox(a, 0, 1.7, 0, 0.26, 0.26, 0.26, P.P0, { f: 1 });                                       // шлем
  mkBox(a, 0, 1.71, 0.11, 0.2, 0.07, 0.1, P.glass, { f: 2 });                                  // визор
  mkBox(a, -0.36 * slim * wide, 1.3, 0, 0.14, 0.5, 0.2, P.P0, { f: 1, rz: 0.15 });             // руки
  mkBox(a, 0.36 * slim * wide, 1.3, 0, 0.14, 0.5, 0.2, P.P0, { f: 1, rz: -0.15 });
  if (role === 'heavy'){
    mkBox(a, 0, 1.3, -0.3, 0.6, 0.55, 0.22, P.steelD);                                         // ранец с лентой
    mkBox(a, 0.2, 1.32, 0.3, 0.16, 0.18, 0.6, P.dark);
    mkCyl(a, 0.2, 1.32, 0.85, 0.055, 0.055, 0.5, 6, P.dark, { rx: Math.PI / 2 });
  } else if (role === 'sniper'){
    mkBox(a, 0.2, 1.36, 0.35, 0.08, 0.12, 1.3, P.dark);
    mkCyl(a, 0.2, 1.36, 1.15, 0.02, 0.02, 0.5, 6, P.dark, { rx: Math.PI / 2 });
    mkBox(a, 0.2, 1.48, 0.5, 0.06, 0.12, 0.2, P.glass, { f: 2 });                              // прицел
  } else if (role === 'rocket'){
    mkBox(a, 0.2, 1.42, 0.2, 0.14, 0.14, 0.9, P.steelD, { rx: -0.2 });
    mkBox(a, 0.2, 1.52, 0.62, 0.18, 0.18, 0.1, P.glowR, { f: 2 });
  } else if (role === 'medic'){
    mkBox(a, 0, 1.35, -0.28, 0.44, 0.5, 0.2, P.steelD);
    mkBox(a, 0, 1.4, -0.39, 0.26, 0.08, 0.02, P.glowA, { f: 2 });                              // крест
    mkBox(a, 0, 1.4, -0.39, 0.08, 0.26, 0.02, P.glowA, { f: 2 });
    mkBox(a, 0.2, 1.3, 0.3, 0.09, 0.12, 0.55, P.dark);
  } else {
    mkBox(a, 0.2, 1.3, 0.3, 0.1, 0.13, 0.6, P.dark);                                           // винтовка
    mkCyl(a, 0.2, 1.3, 0.75, 0.025, 0.025, 0.3, 6, P.dark, { rx: Math.PI / 2 });
    if (role === 'scout'){ mkBox(a, -0.25, 1.95, -0.05, 0.03, 0.55, 0.03, P.dark); mkBox(a, -0.25, 2.24, -0.05, 0.05, 0.05, 0.05, P.glowA, { f: 2 }); }
  }
}
function mDrone(a){
  const P = PALX;
  mkBox(a, 0, 0, 0, 0.55, 0.25, 0.7, P.P0, { f: 1, rx: -0.12 });
  mkBox(a, 0, -0.05, 0.4, 0.3, 0.12, 0.15, P.glass, { f: 2 });
  mkBox(a, 0, 0.18, -0.1, 0.3, 0.08, 0.35, P.steelD);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]){
    mkBox(a, sx * 0.48, 0.05, sz * 0.5, 0.5, 0.06, 0.1, P.dark, { ry: sx * sz * 0.7 });
    mkCyl(a, sx * 0.75, 0.1, sz * 0.72, 0.3, 0.3, 0.03, 12, P.steelD);
    mkCyl(a, sx * 0.75, 0.06, sz * 0.72, 0.08, 0.08, 0.12, 8, P.dark);
  }
  mkCyl(a, 0, 0.02, 0.42, 0.05, 0.05, 0.3, 6, P.dark, { rx: Math.PI / 2 });
}
function mBuilder(a){
  const P = PALX;
  mkCyl(a, 0, 0.35, 0, 0.55, 0.45, 0.18, 12, P.steelD);
  mkCyl(a, 0, 0.22, 0, 0.3, 0.3, 0.12, 10, P.glowA, { f: 2 });                                  // подъёмный вентиль
  mkBox(a, 0, 0.72, 0, 0.6, 0.4, 0.7, P.P0, { f: 1 });
  mkBox(a, 0, 0.8, 0.32, 0.3, 0.2, 0.12, P.glass, { f: 2 });
  mkBox(a, 0.42, 1.0, -0.1, 0.12, 0.9, 0.12, P.steel, { rz: -0.5 });                            // кран
  mkBox(a, 0.62, 1.38, -0.1, 0.2, 0.14, 0.2, P.dark);
  mkBox(a, -0.35, 0.95, -0.2, 0.25, 0.3, 0.3, P.olive);
}
function mRaider(a){
  const P = PALX;
  mkBox(a, 0, 0.62, 0, 1.5, 0.4, 2.4, P.P0, { f: 1 });
  mkBox(a, 0, 0.9, 0.5, 1.2, 0.35, 0.9, P.P0, { f: 1, rx: 0.25 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    mkCyl(a, sx * 0.85, 0.45, sz * 0.85, 0.48, 0.48, 0.3, 12, P.track, { rz: Math.PI / 2 });
  mkBox(a, 0, 1.05, -0.4, 0.7, 0.25, 0.7, P.dark);
  mkCyl(a, 0, 1.15, 0.6, 0.05, 0.05, 1.2, 6, P.dark, { rx: Math.PI / 2 });
  mkBox(a, 0, 1.0, -0.75, 1.0, 0.5, 0.3, P.steelD);
}
function mMlrs(a){
  const P = PALX;
  mkBox(a, 0, 0.85, 1.3, 1.7, 0.9, 1.2, P.P0, { f: 1 });                                       // кабина
  mkBox(a, 0, 1.15, 1.75, 1.5, 0.35, 0.1, P.glass, { f: 2 });
  mkBox(a, 0, 0.8, -0.7, 1.8, 0.5, 2.6, P.P0, { f: 1 });                                       // платформа
  for (const sx of [-0.45, 0.45]) for (let i = 0; i < 3; i++)
    mkCyl(a, sx, 1.35, -0.9 - i * 0.28, 0.14, 0.14, 2.4, 8, P.steelD, { rx: Math.PI / 2 - 0.55 }); // пакет
  for (const sx of [-1, 1]) for (const sz of [-1.4, 0, 1.4])
    mkCyl(a, sx * 0.95, 0.45, sz, 0.45, 0.45, 0.28, 12, P.track, { rz: Math.PI / 2 });
  mkBox(a, 0, 1.15, -1.9, 1.6, 0.5, 0.25, P.steelD);
}
function mCat(a){
  const P = PALX;
  mkBox(a, 0, 0.75, -0.6, 1.9, 0.7, 2.6, P.P0, { f: 1 });
  mkBox(a, 0, 1.15, 0.6, 1.2, 0.4, 1.0, P.steelD, { rx: 0.3 });
  mkCyl(a, 0, 1.7, 1.9, 0.11, 0.14, 4.6, 10, P.dark, { rx: Math.PI / 2 - 0.62 });               // длинный ствол
  mkBox(a, 0, 1.05, -1.3, 1.6, 0.9, 1.2, P.steelD);
  for (const sx of [-1, 1]) for (const sz of [-1.2, 0.9])
    mkCyl(a, sx * 1.0, 0.42, sz, 0.5, 0.5, 0.3, 12, P.track, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) mkBox(a, sx * 1.1, 0.35, 2.0, 0.25, 0.7, 0.25, P.dark, { rx: 0.4 }); // упоры
}
function mBossS(a){
  const P = PALX;
  mkBox(a, 0, 3.4, 0, 2.6, 1.6, 3.2, P.P0, { f: 1 });                                          // тело
  mkBox(a, 0, 3.5, 1.75, 1.2, 0.7, 0.7, P.dark);
  mkBox(a, 0, 3.55, 2.1, 0.7, 0.16, 0.1, P.glowR, { f: 2 });                                   // глаз-сенсор
  mkBox(a, 0, 4.35, -0.4, 1.4, 0.4, 1.6, P.steelD);
  mkCyl(a, 0, 2.4, 0, 0.7, 0.9, 1.4, 12, P.steelD);                                             // «брюхо» с ядром
  mkBox(a, 0, 2.05, 0, 0.5, 0.3, 0.5, P.glowR, { f: 2 });                                      // ядро
  for (const sx of [-1, 1]) for (const sz of [-1, 1]){
    const hip = [sx * 1.5, 3.3, sz * 1.4], knee = [sx * 2.3, 1.9, sz * 2.0], foot = [sx * 2.5, 0.25, sz * 2.3];
    limb(a, hip, knee, 0.28, P.steelD); limb(a, knee, foot, 0.22, P.dark);
    mkBox(a, foot[0], 0.15, foot[2], 0.7, 0.3, 0.9, P.track);
  }
}
function limb(a, p0, p1, w, c){
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], l = Math.hypot(dx, dy, dz);
  const ry = Math.atan2(dx, dz), rx = -Math.asin(dy / l);
  mkBox(a, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, w, w, l, c, { ry, rx });
}
function mHq(a){
  const P = PALX;
  mkBox(a, 0, 0.3, 0, 7.5, 0.6, 7.5, P.concrete);
  mkBox(a, 0, 1.7, -0.5, 4.6, 2.6, 4.4, P.steel, { f: 0 });
  mkBox(a, 0, 1.9, 1.85, 2.2, 1.6, 0.3, P.P0, { f: 1 });                                       // ворота
  mkBox(a, 0, 3.3, -0.8, 3.0, 0.5, 3.0, P.steelD);
  mkCyl(a, 0, 4.4, -0.8, 1.5, 1.7, 2.2, 12, P.steelD);                                         // башня
  mkCyl(a, 0, 5.9, -0.8, 0.06, 0.06, 2.2, 6, P.dark);
  mkBox(a, 0, 7.05, -0.8, 0.16, 0.16, 0.16, P.glowA, { f: 2 });
  mkBox(a, 0, 2.0, 2.02, 3.6, 0.14, 0.06, P.glowA, { f: 2 });                                  // окна
  for (const sx of [-1, 1]){
    mkCyl(a, sx * 2.9, 1.6, -2.6, 0.5, 0.5, 2.6, 10, P.steelD);
    mkBox(a, sx * 2.9, 3.1, -2.6, 0.8, 0.5, 0.8, P.P0, { f: 1 });
  }
}
function mBturret(a){
  const P = PALX;
  mkCyl(a, 0, 0.3, 0, 0.8, 0.65, 0.6, 12, P.concrete);
  mkBox(a, 0, 0.85, 0, 0.7, 0.5, 0.8, P.steelD);
  mkBox(a, 0, 1.25, 0.1, 0.9, 0.5, 1.2, P.P0, { f: 1 });
  mkCyl(a, 0, 1.25, 1.1, 0.06, 0.06, 1.1, 8, P.dark, { rx: Math.PI / 2 });
  mkBox(a, 0, 1.55, -0.3, 0.5, 0.2, 0.5, P.dark);
}
function mBaa(a){
  const P = PALX;
  mkCyl(a, 0, 0.35, 0, 0.9, 0.75, 0.7, 12, P.concrete);
  mkBox(a, 0, 1.0, 0, 0.9, 0.6, 1.0, P.P0, { f: 1 });
  for (const sx of [-0.2, 0.2]) mkCyl(a, sx, 1.55, 0.45, 0.05, 0.05, 1.9, 8, P.dark, { rx: Math.PI / 4 });
  mkBox(a, 0, 1.5, -0.45, 0.7, 0.3, 0.4, P.steelD);
}
function mBoutpost(a){
  const P = PALX;
  mkBox(a, 0, 1.0, 0, 4.6, 2.0, 4.2, P.concrete);
  mkBox(a, 0, 2.2, 0.4, 3.2, 0.5, 3.0, P.steelD, { rx: 0.08 });
  mkBox(a, 0, 1.0, 2.15, 1.6, 1.4, 0.3, P.P0, { f: 1 });
  mkBox(a, 0, 1.6, 2.32, 1.2, 0.12, 0.06, P.glowA, { f: 2 });
  mkBox(a, 1.6, 2.9, -1.0, 0.08, 1.6, 0.08, P.dark);
  mkBox(a, 1.6, 3.6, -1.0, 0.7, 0.4, 0.04, P.P0, { f: 1 });
}
function mBfactory(a){
  const P = PALX;
  mkBox(a, 0, 1.6, 0, 6.4, 3.2, 5.4, P.steel);
  mkBox(a, 0, 3.4, 0, 6.6, 0.4, 5.6, P.steelD);
  mkBox(a, 0, 1.3, 2.75, 2.6, 2.2, 0.3, P.P0, { f: 1 });
  mkBox(a, -1.9, 2.2, 2.78, 1.0, 0.5, 0.06, P.glowA, { f: 2 });
  mkBox(a, 1.9, 2.2, 2.78, 1.0, 0.5, 0.06, P.glowA, { f: 2 });
  mkCyl(a, 2.2, 4.4, -1.6, 0.45, 0.55, 2.4, 10, P.steelD);
  mkBox(a, -2.4, 3.9, 1.4, 0.9, 0.9, 0.9, P.steelD);
  mkBox(a, 0, 3.62, 0, 2.0, 0.06, 2.0, P.dark);
}
function mBhub(a){
  const P = PALX;
  mkCyl(a, 0, 0.25, 0, 3.2, 3.0, 0.5, 14, P.concrete);
  mkCyl(a, 0, 1.35, 0, 2.4, 1.0, 2.2, 14, P.steel);
  mkCyl(a, 0, 2.75, 0, 1.0, 0.3, 0.9, 12, P.steelD);
  mkBox(a, 0, 1.5, 2.42, 1.8, 0.8, 0.06, P.glowA, { f: 2 });
  mkBox(a, 0, 0.6, 0, 2.6, 0.08, 2.6, P.dark);                                                  // площадка
  mkBox(a, 0.8, 0.85, 0.5, 0.4, 0.2, 0.5, P.P0, { f: 1 });                                     // дрон на площадке
}
function mBairdock(a){
  const P = PALX;
  mkCyl(a, 0, 0.3, 0, 2.6, 2.4, 0.6, 14, P.concrete);
  mkBox(a, 0, 2.6, 0, 1.4, 4.4, 1.4, P.steel);
  mkBox(a, 0, 5.0, 0, 4.2, 0.35, 4.2, P.steelD);
  mkCyl(a, 0, 5.25, 0, 1.6, 1.6, 0.08, 16, P.dark);                                            // площадка
  mkBox(a, 0, 5.4, 0, 0.5, 0.25, 0.5, P.P0, { f: 1 });
  for (const sx of [-1, 1]) mkBox(a, sx * 1.9, 4.0, 0, 0.15, 2.4, 0.15, P.steelD, { rz: sx * 0.35 });
  mkBox(a, 0, 3.2, 0.72, 0.9, 0.5, 0.06, P.glowA, { f: 2 });
}
function mBextractor(a){
  const P = PALX;
  for (let i = 0; i < 3; i++){
    const t = i / 3 * Math.PI * 2;
    mkBox(a, Math.cos(t) * 0.9, 1.1, Math.sin(t) * 0.9, 0.18, 2.4, 0.18, P.steelD, { rz: Math.cos(t) * 0.35, rx: -Math.sin(t) * 0.35 });
  }
  mkCyl(a, 0, 1.6, 0, 0.55, 0.4, 1.6, 10, P.P0, { f: 1 });
  mkCyl(a, 0, 0.5, 0, 0.16, 0.05, 1.6, 8, P.dark);                                              // бур
  mkCyl(a, 0, 0.12, 0, 0.7, 0.7, 0.16, 12, P.glowA, { f: 2 });                                  // жила
}
function mBwall(a){
  const P = PALX;
  mkBox(a, 0, 0.75, 0, 6.6, 1.5, 0.7, P.concrete);
  mkBox(a, 0, 1.35, 0, 6.6, 0.25, 0.75, P.concrete);
  mkBox(a, 0, 0.9, 0.37, 6.2, 0.18, 0.03, P.P0, { f: 1 });
  for (const sx of [-2.2, 0, 2.2]) mkBox(a, sx, 0.15, 0.55, 0.9, 0.3, 0.5, P.concrete);
}
function mBrepair(a){
  const P = PALX;
  mkBox(a, 0, 0.2, 0, 4.4, 0.4, 4.0, P.concrete);
  mkBox(a, -1.2, 1.1, -0.8, 1.6, 1.8, 1.6, P.steel);
  mkBox(a, -1.2, 1.5, -0.8, 1.8, 0.25, 1.8, P.steelD);
  mkBox(a, 1.2, 1.5, 0.6, 0.3, 2.6, 0.3, P.steelD);
  mkBox(a, 0.6, 2.7, 0.6, 1.8, 0.25, 0.25, P.steelD, { rz: -0.35 });
  mkBox(a, -0.1, 2.35, 0.6, 0.12, 0.7, 0.12, P.dark);
  mkBox(a, -0.1, 2.0, 0.6, 0.5, 0.3, 0.4, P.glowA, { f: 2 });
  mkBox(a, 1.2, 0.75, -0.9, 1.4, 0.06, 1.4, P.dark);
}
function mBtun(a, exit){
  const P = PALX;
  mkCyl(a, 0, 0.5, 0, 2.6, 0.6, 1.0, 14, P.olive);
  mkCyl(a, 0, 0.95, 0, 1.6, 0.2, 0.5, 12, P.olive);
  mkCyl(a, 0, 0.55, 1.9, exit ? 0.75 : 0.9, exit ? 0.75 : 0.9, 0.35, 12, P.dark, { rx: Math.PI / 2 });
  mkBox(a, 0, 0.9, 2.05, 1.2, 0.2, 0.15, P.P0, { f: 1 });
  mkBox(a, 0, 1.25, -0.4, 0.5, 0.35, 0.5, P.glowR, { f: 2 });
}
function mBasm(a, sw){
  const P = PALX;
  mBfactory(a);
  mkBox(a, 0, 4.6, -1.2, 4.4, 2.0, 3.4, P.steelD);
  for (const sx of [-2.2, 2.2]) for (const sz of [-2.9, 0.5]) mkBox(a, sx, 4.6, sz - 1.2 + 1.2, 0.25, 2.2, 0.25, P.steel);
  if (sw){ mkBox(a, 0, 4.7, -1.2, 1.2, 1.2, 1.2, P.glowR, { f: 2 }); mkCyl(a, 1.6, 4.4, -1.2, 0.25, 0.4, 1.4, 10, P.dark, { rz: 0.4 }); }
  else { mkCyl(a, 0, 5.9, -1.2, 0.7, 0.7, 0.5, 12, P.dark); mkBox(a, 0, 6.4, -1.2, 1.0, 0.6, 1.2, P.P0, { f: 1 }); }
}
const SPECS = {
  tank: a => mTank(a, 1, false, false),
  rhino: a => mTank(a, 1.28, true, false),
  bossc: a => mTank(a, 1.75, true, true),
  bosss: a => mBossS(a),
  inf: (a, v) => mInf(a, v || 'assault'),
  builder: a => mBuilder(a),
  drone: a => mDrone(a),
  raider: a => mRaider(a),
  mlrs: a => mMlrs(a),
  cat: a => mCat(a),
  hq: a => mHq(a),
  bturret: a => mBturret(a),
  baa: a => mBaa(a),
  boutpost: a => mBoutpost(a),
  bfactory: a => mBfactory(a),
  bhub: a => mBhub(a),
  bairdock: a => mBairdock(a),
  bextractor: a => mBextractor(a),
  bwall: a => mBwall(a),
  brepair: a => mBrepair(a),
  btun: a => mBtun(a, false),
  btunx: a => mBtun(a, true),
  basmc: a => mBasm(a, false),
  basms: a => mBasm(a, true),
};
// палитра (после загрузки тяжёлого heavy65 не зависит; краски TEAM читаются в pal())
const PALX = { P0: [0.5, 0.5, 0.5], track: [0.09, 0.09, 0.1], dark: [0.13, 0.14, 0.16], steel: [0.44, 0.47, 0.52], steelD: [0.26, 0.28, 0.31],
               glowA: [1, 0.72, 0.25], glowR: [1, 0.32, 0.2], olive: [0.36, 0.39, 0.31], concrete: [0.52, 0.52, 0.5], glass: [0.1, 0.15, 0.18] };

// ---------------- запуск
if (CX820.on && typeof CX813 !== 'undefined' && CX813 && CX813.on){
  CX820.safe(() => {
    CX820.loadHP();
    CX820.hooksHP();
    CX820.hookScan();
    CX820.hookHtml();
    CX820.hookCard();
    CX820.hookRefresh();
    CX820.css();
  }, 'init');
}
