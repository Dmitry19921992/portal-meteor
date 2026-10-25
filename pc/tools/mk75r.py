# v7.5 release (branch v75rel, wt75r): own test harness copies (CDP 9340, server 8840, profile chrome_v75r, dist/v75r.html)
import io
T = 'D:/AI/pm_v6/tools/'; S = 'D:/AI/pm_v6/tests/'
def cp(src, dst, pairs, bom=False):
    t = io.open(src, encoding='utf-8-sig').read()
    for a, b in pairs: t = t.replace(a, b)
    io.open(dst, 'w', encoding='utf-8-sig' if bom else 'utf-8', newline='\n').write(t)
    print(dst, len(t))
cp(T + 'chrome75.ps1', T + 'chrome75r.ps1', [('chrome_v75', 'chrome_v75r'), ('9338', '9340'), ('8838', '8840'), ('dist/v75.html', 'dist/v75r.html'), ('chrome75', 'chrome75r'), ('v7.5 main branch', 'v7.5 release branch')], True)
cp(T + 't75.ps1', T + 't75r.ps1', [('chrome75.ps1', 'chrome75r.ps1'), ('chrome_v75', 'chrome_v75r'), ('9338', '9340'), ('8838', '8840'), ('dist/v75.html', 'dist/v75r.html')], True)
cp(S + 'pcab75.js', S + 'pcab75r.js', [('pcab75', 'pcab75r')])
cp(S + 'diff75.js', S + 'diff75r.js', [('pcab75', 'pcab75r'), ('8838', '8840')])
