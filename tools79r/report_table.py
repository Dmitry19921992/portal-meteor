import json
L = json.load(open('D:/AI/pm_radio/tracks_full.json', encoding='utf-8'))
B = 'https://radio.portal-meteor.pages.dev/radio/'
out = ['| # | трек | длит. | Opus .ogg | AAC .m4a | источник (D:\\Commercial tracks\\…) |', '|---|---|---|---|---|---|']
for i, x in enumerate(L):
    d = int(round(x['d']))
    out.append(f"| {i + 1} | EDMITRY — {x['t']} | {d // 60}:{d % 60:02d} | [{x['ogg'] / 1e6:.2f} МБ]({B}{x['s']}.ogg) | [{x['m4a'] / 1e6:.2f} МБ]({B}{x['s']}.m4a) | `{x['src']}` |")
tot = sum(x['d'] for x in L)
out.append(f"| | **итого {len(L)}** | **{int(tot // 3600)} ч {int(tot % 3600 // 60)} мин** | **{sum(x['ogg'] for x in L) / 1e6:.1f} МБ** | **{sum(x['m4a'] for x in L) / 1e6:.1f} МБ** | |")
open('D:/AI/pm_radio/report_table.md', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(len(out))
