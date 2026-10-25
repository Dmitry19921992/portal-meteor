# v7.5: own test harness copies (CDP 9338, server 8838, profile chrome_v75, dist/v75.html)
import io
T = 'D:/AI/pm_v6/tools/'; S = 'D:/AI/pm_v6/tests/'
def cp(src, dst, pairs, bom=False):
    t = io.open(src, encoding='utf-8-sig').read()
    for a, b in pairs: t = t.replace(a, b)
    io.open(dst, 'w', encoding='utf-8-sig' if bom else 'utf-8', newline='\n').write(t)
    print(dst, len(t))
cp(T + 'chrome75d.ps1', T + 'chrome75.ps1', [('chrome_v75d', 'chrome_v75'), ('9334', '9338'), ('8834', '8838'), ('dist/v75d.html', 'dist/v75.html'), ('chrome75d', 'chrome75'), ('the dendy branch', 'v7.5 main branch')], True)
cp(S + 'pcab75d.js', S + 'pcab75.js', [('pcab75d', 'pcab75')])
cp(S + 'diff75d.js', S + 'diff75.js', [('pcab75d', 'pcab75'), ('8798', '8838')])
cp(T + 'samedate75d.py', T + 'samedate75.py', [('v75d', 'v75')])
cp(T + 'pcab75d.ps1', T + 'pcab75.ps1', [('out75d_pcab', 'out75_pcab'), ('tmp_base75d', 'tmp_base75'), ('wt74d', 'wt75'), ('v75d_base.html', 'v75_base.html'), ('v75d.html', 'v75.html'), ('samedate75d', 'samedate75'), ('chrome75d', 'chrome75'), ('9334', '9338'), ('8834', '8838'), ('pcab75d.js', 'pcab75.js'), ('diff75d.js', 'diff75.js'), ("[string]$Base = 'd114417'", "[string]$Base = '7c42e8b'")], True)
cp(T + 't74.ps1', T + 't75.ps1', [('chrome74.ps1', 'chrome75.ps1'), ('chrome_v74', 'chrome_v75'), ('9247', '9338'), ('8798', '8838'), ('dist/v74.html', 'dist/v75.html')], True)
