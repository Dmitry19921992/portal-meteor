p = r'D:\AI\pm_v6\wt_rtsui\head.html'
s = open(p, encoding='utf-8-sig').read()
a = s.index('  @media (min-width:1600px) and (min-height:860px){')
b = s.index('\n  }\n', a) + 4
blk = s[a:b]
s = s[:a] + s[b:]
e = s.index('</style>', s.index('<style id="uixcss">'))
s = s[:e] + blk + s[e:]
open(p, 'w', encoding='utf-8-sig', newline='\n').write(s)
print('moved', len(blk))
