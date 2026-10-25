# вклейка моделей техники v6 (tests/units_veh.glsl) и материалов 40–42 в scene.glsl; повторный запуск заменяет блок
p = 'D:/AI/pm_v6/wt_units/scene.glsl'
s = open(p, encoding='utf-8').read()
v = open('D:/AI/pm_v6/tests/units_veh.glsl', encoding='utf-8').read()
a = 'vec2 sdTank(vec3 q){\n  vec2 r = vec2(1e5, 0.0);\n'
assert s.count(a) == 1
if 'sdVeh2' not in s:
    s = s.replace(a, v + a + '  if (gV > 0.5) return sdVeh2(q);   // новая техника v6\n')
else:
    i = s.index('// ---- новая техника v6 (vehicles2.js)'); j = s.index(a)
    s = s[:i] + v + s[j:]
m = '  else if (m > 29.5){   // кристаллы'
assert s.count(m) == 1
mat = open('D:/AI/pm_v6/tests/units_mat.glsl', encoding='utf-8').read()
if '// техника v6: материалы' in s:
    i = s.index('  else if (m > 39.5){   // техника v6: материалы'); j = s.index(m)
    s = s[:i] + mat + s[j:]
else:
    s = s.replace(m, mat + m)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
