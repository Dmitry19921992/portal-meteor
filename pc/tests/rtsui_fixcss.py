p = r'D:\AI\pm_v6\wt_rtsui\head.html'
s = open(p, encoding='utf-8-sig').read()
a = s.index('<style id="uixcss">')
head, tail = s[:a], s[a:]
for o, n in [('#card .ab i{', '#card .ab > i{'), ('#card .ab.prod i{', '#card .ab.prod > i{'), ('body.touch #card .ab i{', 'body.touch #card .ab > i{'), ('body.touch #card .ab.prod i{', 'body.touch #card .ab.prod > i{')]:
    print(o, tail.count(o))
    tail = tail.replace(o, n)
open(p, 'w', encoding='utf-8', newline='\n').write(head + tail)
