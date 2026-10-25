import re
w = r'D:\AI\pm_v6\wt61\\'
h = open(w + 'head.html', encoding='utf-8').read()
h2 = re.sub(r'<title>Portal Meteor[^<]*</title>', '<title>Portal Meteor — v6.1</title>', h, count=1)
open(w + 'head.html', 'w', encoding='utf-8', newline='\n').write(h2)
b = open(w + 'build_artifact.py', encoding='utf-8-sig').read()
b = b.replace("h = h.replace('<title>Portal Meteor — v6</title>', '<title>Portal Meteor v6</title>",
              "h = re.sub(r'<title>Portal Meteor[^<]*</title>', '<title>Portal Meteor v6</title>")
b = b.replace("<meta name=\"theme-color\" content=\"#000000\">', 1)", "<meta name=\"theme-color\" content=\"#000000\">', h, count=1)")
open(w + 'build_artifact.py', 'w', encoding='utf-8', newline='\n').write(b)
print([l for l in b.splitlines() if 'title' in l])
print(re.findall(r'<title>[^<]*</title>', h2))
