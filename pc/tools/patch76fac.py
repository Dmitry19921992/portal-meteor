# patch76fac.py — minimal hooks for v7.6 factions / craters in existing files (idempotent)
import re, sys
W = r'D:\AI\pm_v6\wt76fac\\'
def patch(fn, pairs):
    p = W + fn
    s = open(p, encoding='utf-8').read()
    for old, new, cnt in pairs:
        if new in s and old not in s: continue
        n = s.count(old)
        if n != cnt: print('!! %s: %r found %d (want %d)' % (fn, old[:60], n, cnt)); sys.exit(1)
        s = s.replace(old, new)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('ok', fn)

# vehicles2.js: faction (not team index) picks vehicle model/stats; DK() (AI difficulty) stays team-based
patch('vehicles2.js', [
    ("function vkv(x, team){ return Array.isArray(x) ? x[team ? 1 : 0] : x; }", "function vkv(x, team){ return Array.isArray(x) ? x[FI76(team) ? 1 : 0] : x; }", 1),
    ("name(e){ return N2(VK[e.vk].n[e.team ? 1 : 0]); },", "name(e){ return N2(VK[e.vk].n[FI76(e.team) ? 1 : 0]); },", 1),
    ("cname(vk, team){ return N2(VK[vk].cls[team ? 1 : 0]); },", "cname(vk, team){ return N2(VK[vk].cls[FI76(team) ? 1 : 0]); },", 1),
    ("reload(v){ return vkv(VK[v.vk].reload, v.team) * (v.team === 1 ? 0.95 : 1); },", "reload(v){ return vkv(VK[v.vk].reload, v.team) * (FI76(v.team) === 1 ? 0.95 : 1); },", 1),
    ("hp: KK.hp[team], maxhp: KK.hp[team], walk: KK.walk[team],", "hp: KK.hp[FI76(team)], maxhp: KK.hp[FI76(team)], walk: KK.walk[FI76(team)],", 1),
    ("hive = v.team === 1 && !smoke;", "hive = FI76(v.team) === 1 && !smoke;", 1),
    ("spread(v, d, smoke){ return smoke ? 3 : v.team === 1 ?", "spread(v, d, smoke){ return smoke ? 3 : FI76(v.team) === 1 ?", 1),
    ("lobT(v, D){ return v.team === 0 ?", "lobT(v, D){ return FI76(v.team) === 0 ?", 1),
    ("mortar = v.team === 0;", "mortar = FI76(v.team) === 0;", 1),
    ("v.salvoT = v.team === 1 && !v.salvoSmoke ? 0.16 : 0.27;", "v.salvoT = FI76(v.team) === 1 && !v.salvoSmoke ? 0.16 : 0.27;", 1),
    ("v.arm = v.team === 0 ? max(0,", "v.arm = FI76(v.team) === 0 ? max(0,", 1),
    ("v.salvoN = smoke ? 3 : v.team === 1 ? 6 : 3;", "v.salvoN = smoke ? 3 : FI76(v.team) === 1 ? 6 : 3;", 1),
    ("else { if (v.team === 0) V2.lob(v, tp, false);", "else { if (FI76(v.team) === 0) V2.lob(v, tp, false);", 1),
    ("(v.team === 0 ? 3 + d / 45 : 2.4 + d / 32)", "(FI76(v.team) === 0 ? 3 + d / 45 : 2.4 + d / 32)", 1),
    ("clamp(e.team === 0 ? (e.elev || 0) : (e.arm || 0), 0, 0.98)", "clamp(FI76(e.team) === 0 ? (e.elev || 0) : (e.arm || 0), 0, 0.98)", 1),
    ("(e.team === 0 ? clamp(e.arm || 0, 0, 1) : (e.loaded ? 1 : 0))", "(FI76(e.team) === 0 ? clamp(e.arm || 0, 0, 1) : (e.loaded ? 1 : 0))", 1),
    ("false) : c.team === 0 ? 6 : 6.5;", "false) : FI76(c.team) === 0 ? 6 : 6.5;", 1),
    ("(ready ? (c.team === 0 ? tr('МИНА", "(ready ? (FI76(c.team) === 0 ? tr('МИНА", 1),
])
# world.js: dynamic explosion craters in the collision SDF (same formula as the shader)
patch('world.js', [
    ("  let d = r - RM - hgt(nx*RM, ny*RM, nz*RM) * mask;\n",
     "  let d = r - RM - hgt(nx*RM, ny*RM, nz*RM) * mask;\n  if (CR76 && CR76.n) d += CR76.dent(nx, ny, nz);   // v7.6: воронки от взрывов (v76_craters.js)\n", 1),
])
# render.js: viewmodel / lights by faction
patch('render.js', [
    ("gl.uniform4f(U.uVM2, me ? me.team : 0,", "gl.uniform4f(U.uVM2, me ? FI76(me.team) : 0,", 1),
    ("add2(mul(b, RM + 37.2), h.team ? [6, 0.4, 0.2]", "add2(mul(b, RM + 37.2), FI76(h.team) ? [6, 0.4, 0.2]", 1),
    ("sin(a) * 12))), h.team ? [1.4, 0.45, 0.35]", "sin(a) * 12))), FI76(h.team) ? [1.4, 0.45, 0.35]", 1),
    ("const E = b.team ? [3.5, 0.3, 0.15]", "const E = FI76(b.team) ? [3.5, 0.3, 0.15]", 1),
])
patch('render.js', [("add2(cp.beacon, tg(cp.prog), 32, 0.004);", "add2(cp.beacon, tg(FI76(0) === 1 ? -cp.prog : cp.prog), 32, 0.004);", 1)])
patch('game.js', [("hp: team ? 1150 : 1400, mgCd: 0, walk: team ? 8.5 : 7,", "hp: FI76(team) ? 1150 : 1400, mgCd: 0, walk: FI76(team) ? 8.5 : 7,", 1)])
patch('v69_guns.js', [("const team = me ? me.team : 0, glowK", "const team = me ? FI76(me.team) : 0, glowK", 1)])
patch('squad.js', [("const visor = u.team ? '#ff3020'", "const visor = FI76(u.team) ? '#ff3020'", 1)])
# scene.glsl: static HQ / base pads / point glow by faction; crater dents in map(); crater floor shading
patch('scene.glsl', [
    ("uniform vec4  uScor[8];  uniform float uScorH[8]; uniform int uNSc;",
     "uniform vec4  uScor[8];  uniform float uScorH[8]; uniform int uNSc;\nuniform vec4  uCr76[12]; uniform float uCr76D[12]; uniform int uNCr76;   // v7.6: воронки (центр на грунте, радиус; глубина)\nuniform float uFac76;    // v7.6: 1 — игрок за Рой (верхняя база в цветах Роя)", 1),
    ("  float d = r - RM - hgt(n * RM) * mask;\n",
     "  float d = r - RM - hgt(n * RM) * mask;\n  for (int i = ZERO; i < 12; i++){   // v7.6: воронки (= CR76.dent в v76_craters.js)\n    if (i >= uNCr76) break;\n    vec4 c = uCr76[i]; vec3 q = n * length(c.xyz) - c.xyz; float s2 = dot(q, q);\n    if (s2 < c.w * c.w * 2.9){ float s = sqrt(s2) / c.w, b = max(0.0, 1.0 - s * s), e = s - 1.0; d += uCr76D[i] * (b * b - 0.3 * exp(-e * e * 9.0)); }\n  }\n", 1),
    ("    float team = p.y > 0.0 ? 0.0 : 1.0;\n", "    float team = abs((p.y > 0.0 ? 0.0 : 1.0) - uFac76);\n", 2),
    ("        float t = float(i);\n", "        float t = abs(float(i) - uFac76);\n", 1),
    ("vec3 teamGlow(float pr){\n", "vec3 teamGlow(float pr){\n  pr = mix(pr, -pr, uFac76);\n", 1),
    ("    float depth = clamp((RM - r) / 30.0, 0.0, 1.0);\n",
     "    for (int i = ZERO; i < 12; i++){   // v7.6: дно воронки — тёмный раздробленный грунт, светлые выбросы на валу\n      if (i >= uNCr76) break;\n      vec3 q = rn * length(uCr76[i].xyz) - uCr76[i].xyz; float s = length(q) / uCr76[i].w;\n      if (s < 1.6){ float k = 1.0 - smoothstep(0.55, 1.0, s + (mid - 0.5) * 0.25); alb *= 1.0 - 0.45 * k; alb = mix(alb, dust * 1.15, 0.35 * smoothstep(0.9, 1.05, s) * (1.0 - smoothstep(1.15, 1.6, s))); }\n    }\n    float depth = clamp((RM - r) / 30.0, 0.0, 1.0);\n", 1),
])
# build.py: own modules on their own line
patch('build.py', [
    ("JS[-1:-1] = ['v75_cine.js', 'v75.js', 'v75_field.js', 'v75_stats.js', 'v75_ver.js']   # v7.5 (отдельной строкой — не мешает слиянию веток)\n",
     "JS[-1:-1] = ['v75_cine.js', 'v75.js', 'v75_field.js', 'v75_stats.js', 'v75_ver.js']   # v7.5 (отдельной строкой — не мешает слиянию веток)\nJS[-1:-1] = ['v76_factions.js', 'v76_craters.js', 'v76_tpv.js']   # v7.6: фракции, воронки, 3-е лицо (отдельной строкой)\n", 1),
])
