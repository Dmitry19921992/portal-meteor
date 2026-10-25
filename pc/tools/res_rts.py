import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from resolve import resolve, must
os.chdir(r'D:\AI\pm_v6\wt_v6')

def build(o, t):
    return t.replace("'rts.js','menu.js'", "'rts.js','uix.js','menu.js'")
resolve('build.py', [build])

def hints(o, t):
    lines_t = t.split('\n')
    keep = [l for l in lines_t if "H('build'" in l or "H('eco'" in l]
    lo = [l for l in o.split('\n') if "H('power'" in l]
    return '\n'.join(lo + keep) + '\n'
resolve('hints.js', [hints])

def r1(o, t):
    return [l for l in t.split('\n') if 'builder' in l][0] + '\n' + o
def r2(o, t):
    t = t.replace('function orderAt(x, y, queue){', 'function orderAt(x, y, queue, forceRush){')
    return t
def r3(o, t):
    return ("    mk('prod:builder', BICON.builder, pname('builder'), ore(pCost(0, 'builder')), fmtDur(pTime(0, 'builder')), () => uiProduce('builder'), { key: 'builder' });\n"
            + o.replace("UIX_ICON.b[k] || '▣'", "UIX_ICON.b[k] || BICON[k] || '▣'")
            + "    const bq = document.createElement('div'); bq.className = 'bqueue'; bq.id = 'bqueue'; list.appendChild(bq);\n")
def r4(o, t):
    return o.replace('<button id="aiBtn"></button>', '<button id="aiBtn"></button><button id="abBtn"></button>')
def r5(o, t):
    ab = [l for l in t.split('\n') if "$('abBtn').onclick" in l][0]
    return o + ab + '\n'
def r6(o, t):
    extra = [l for l in t.split('\n') if "$('abBtn')" in l or 'updateBuildQueue()' in l]
    return o + '\n'.join(extra) + '\n'
def r7(o, t):
    o = must(o, "  const prods = B && B.team === 0 ?", "  const bxh = builderCardHTML(sel) + (B && B.team === 0 ? siteCardHTML(B) : '');\n  const prods = B && B.team === 0 ?")
    o = must(o, "sel.length === 1 && isSquad(sel[0]) ? groupUnits(sel[0]).length : ''].join('#');", "sel.length === 1 && isSquad(sel[0]) ? groupUnits(sel[0]).length : '', bxh].join('#');")
    o = must(o, "    h += '</div>';\n    const rally", "    h += '</div>' + bxh;\n    const rally")
    o = must(o, "    el.innerHTML = h;\n", "    el.innerHTML = h;\n    bindBuilderCard(el);\n")
    o = must(o, ": tr('Боевой дрон', 'Combat drone');", ": g.cls === 'builder' ? tr('Инженер-строитель', 'Builder') : tr('Боевой дрон', 'Combat drone');")
    return o
resolve('rts.js', [r1, r2, r3, r4, r5, r6, r7])

def u1(o, t):
    o = must(o, "(want.alive || (want.cls === 'bld' && want.done)) ? want : null;", "(want.alive || (want.cls === 'bld' && want.done)) && want.cls !== 'builder' ? want : null;")
    o = must(o, "if (g.team !== 0 || !groupAlive(g)) continue;", "if (g.team !== 0 || !groupAlive(g) || g.cls === 'builder') continue;")
    return o
resolve('ui.js', [u1])

# пост-правки вне конфликтов
s = open('rts.js', encoding='utf-8').read()
s = must(s, "  for (const g of selGroups()){ const u = isSquad(g) ? g.units.find(x => x.alive) : g; if (u) return { e: u, label: groupLabel(g) }; }",
            "  for (const g of selGroups()){ if (g.cls === 'builder') continue; const u = isSquad(g) ? g.units.find(x => x.alive) : g; if (u) return { e: u, label: groupLabel(g) }; }")
s = must(s, "function cardGroupIcon(g){ return isSquad(g) ?", "function cardGroupIcon(g){ return g.cls === 'builder' ? '⚒' : isSquad(g) ?")
open('rts.js', 'w', encoding='utf-8', newline='\n').write(s)

s = open('uix.js', encoding='utf-8').read()
s = must(s, "  if (typeof rtsReason === 'function'){ try { r = uixNorm(rtsReason(id)); } catch (e){ r = null; } }",
"""  // v6: причины ветки rts (стройка инженерами, производство, удары) — главнее; act → кнопка-исправление
  if (typeof rtsReason === 'function' && /^(build|prod|power):/.test(id)){
    try { const rr = rtsReason(id.replace(/^prod:/, 'produce:'));
      if (rr && !rr.ok){ const act = rr.act ? rr.act.replace(/^produce:/, 'prod:') : null; r = uixNorm({ ok: false, reason: rr.reason, fix: act ? [act, rr.fix].filter(Boolean) : rr.fix }); } } catch (e){ r = null; }
  }""")
open('uix.js', 'w', encoding='utf-8', newline='\n').write(s)
print('done')
