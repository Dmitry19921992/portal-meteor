import re, glob, os
G = r'C:/Users/klaas/OneDrive/Рабочий стол/portal meteor/game/'
files = [G + 'old/portal_meteor.html', G + 'old/portal_meteor_v2.html', G + 'old/portal_meteor_v3.html', G + 'old/portal_meteor_v4.html', G + 'old/portal_meteor_v5.html',
         G + 'old/portal_meteor_v6.html', G + 'old/portal_meteor_v7_0.html', G + 'old/portal_meteor_v7_3.html', G + 'portal_meteor_v7_4.html']
for f in files:
    t = open(f, encoding='utf-8').read()
    calls = re.findall(r'localStorage\s*(\.\s*\w+|\[)', t)
    from collections import Counter
    c = Counter(x.replace(' ', '') for x in calls)
    other = re.findall(r'(sessionStorage|indexedDB|caches\.open|serviceWorker)', t)
    head = t[:200].replace('\n', ' ')
    print(os.path.basename(f), len(t.encode('utf-8')), dict(c), set(other), '| head:', head[:90])
