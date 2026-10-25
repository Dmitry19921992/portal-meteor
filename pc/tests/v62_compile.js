// v6.2: замер времени компиляции шейдера сцены v62 с вариантами правок (window.CVARS = [[name, [[regex, replacement], ...]], ...])
// запускать во вкладке dist/v61.html (уже загружена из кэша), исходник берётся из dist/v62.html; варианты компилируются параллельно
for (let i = 0; i < 240; i++){ try { if (document.getElementById('boot').classList.contains('done')) break; } catch (e){} await new Promise(r => setTimeout(r, 500)); }
const html = await (await fetch('/dist/v62.html?' + Math.random())).text();
const m = html.match(/<script id="fs" type="x-shader\/x-fragment">([\s\S]*?)<\/script>/);
const base = m[1].replace('/*CONSTS*/', shaderConsts());
const vars = window.CVARS || [['full', []]];
const out = {}, H = [];
const t0 = performance.now();
for (const [name, reps] of vars){
  let src = base, miss = [];
  for (const [a, b] of reps){ const re = new RegExp(a, 'g'); if (!re.test(src)) miss.push(a); src = src.replace(new RegExp(a, 'g'), b); }
  src = src.replace('out vec4 frag;', 'out vec4 frag;\n// ' + name + ' ' + Math.random());
  H.push({ name, h: startProgram(src), miss });
}
const LIM = window.CLIM || 300000;
while (H.some(x => !x.t) && performance.now() - t0 < LIM){
  for (const x of H) if (!x.t && programReady(x.h)){ x.t = (performance.now() - t0) / 1000; const ok = gl.getProgramParameter(x.h.p, gl.LINK_STATUS); out[x.name] = [x.t.toFixed(1), ok ? 'ok' : (gl.getShaderInfoLog(x.h.fs) || '').slice(0, 300), x.miss.join(';')]; }
  await new Promise(r => setTimeout(r, 200));
}
for (const x of H) if (!x.t) out[x.name] = ['>' + (LIM / 1000), 'timeout', x.miss.join(';')];
return out;
