import sys
p = r'D:\AI\pm_v6\wt_rtsui\rts.js'
s = open(p, encoding='utf-8').read()
a = s.index("const SIDE = { tab: 'build', btns: [] };")
b = s.index("function updateRTSHUD(){")
new = open(r'D:\AI\pm_v6\tests\rtsui_side_new.js', encoding='utf-8').read()
if not new.endswith('\n'): new += '\n'
s = s[:a] + new + s[b:]
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', a, b, len(s))
