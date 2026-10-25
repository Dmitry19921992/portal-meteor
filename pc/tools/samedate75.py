# copies BUILD_DATE from dist/v75.html into dist/v75_base.html (so the menu text is identical for A/B)
import re
p = 'D:/AI/pm_v6/dist/'
n = open(p + 'v75.html', encoding='utf-8').read()
b = open(p + 'v75_base.html', encoding='utf-8').read()
rx = r'const BUILD_DATE = "[^"]*";'
d = re.search(rx, n).group(0)
open(p + 'v75_base.html', 'w', encoding='utf-8', newline='\n').write(re.sub(rx, lambda m: d, b, count=1))
print('date', d)
