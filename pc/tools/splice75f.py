import io
W = 'D:/AI/pm_v6/wt75f/'
p = W + 'v75_dendy.js'
t = io.open(p, encoding='utf-8').read()
a = t.index('// ---------------------------------------------------------------- v7.5 релиз: авто-«Денди» на слабых устройствах')
b = t.index('// выбор стиля игроком (ПК: кнопки data-ch')
new = io.open(W + 'tools3d/den_auto75f.js', encoding='utf-8').read()
t = t[:a] + new + t[b:]
# player's manual choice also closes the auto notice
t = t.replace("if (b){ SET.denUser = true; SET.denAuto = 0; }", "if (b){ SET.denUser = true; SET.denAuto = 0; DEN75.noticeClose(); }")
t = t.replace("tr('авто: слабая графика', 'auto: weak graphics', 'tự động: đồ họa yếu', 'אוטו: גרפיקה חלשה')",
              "tr('авто: для плавности', 'auto: for smoothness', 'tự động: cho mượt', 'אוטו: לחלקות')")
t = t.replace("// denUser — стиль выбрал сам игрок (меню / ?dendy=): авто-Денди его больше не трогает; denAuto — стиль включён автоматически ('igpu' | 'fps')",
              "// denUser — стиль выбрал сам игрок (меню / ?dendy=): авто-Денди его больше не трогает; denAuto — стиль включён автоматически по FPS ('fps')")
io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
# main.js: one call, after the auto-resolution step (lite mode is measured inside the LITE73.adapt wrapper)
p = W + 'main.js'
m = io.open(p, encoding='utf-8').read()
old = "if (!LITE73.on && typeof DEN75 !== 'undefined') try { DEN75.autoFps(fpsVal, false); } catch (e){}   // v7.5: авто-«Денди» (лёгкий режим — внутри LITE73.adapt)"
assert old in m
m = m.replace(old, "if (!LITE73.on && typeof DEN75 !== 'undefined') try { DEN75.autoFps(fpsVal); } catch (e){}   // v7.5: авто-«Денди» по среднему FPS (лёгкий режим — внутри LITE73.adapt)")
io.open(p, 'w', encoding='utf-8', newline='\n').write(m)
print('ok')
