import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from resolve import resolve, must
os.chdir(r'D:\AI\pm_v6\wt_v6')

resolve('build.py', [lambda o, t: o.replace("'sim.js','vision.js'", "'sim.js','vehicles2.js','vision.js'")])

def g1(o, t):
    return t + [l for l in o.split('\n') if "'builder'" in l][0] + '\n'
resolve('game.js', [g1, 'both'])

def r1(o, t):
    return o
def r2(o, t):
    return o.split('\n')[0] + '\n' + t.split('\n')[1] + '\n'
resolve('rts.js', [r1, r2])

s = open('rts.js', encoding='utf-8').read()
s = must(s, "function cardGroupIcon(g){ return g.cls === 'builder' ? '⚒' :", "function cardGroupIcon(g){ return g.vk && typeof VK !== 'undefined' && VK[g.vk] ? VK[g.vk].icon : g.cls === 'builder' ? '⚒' :")
s = must(s, "g.cls === 'tank' ? `${tr('Танк', 'Tank')} ${tankName(0)}` :", "g.cls === 'tank' ? (g.vk ? V2.label(g) : `${tr('Танк', 'Tank')} ${tankName(0)}`) :")
open('rts.js', 'w', encoding='utf-8', newline='\n').write(s)
print('done')
