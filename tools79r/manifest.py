# Build radio/playlist.json + radio/index (dist folder) and a JS snippet for the game; verify loudness of a few outputs.
import os, sys, json, subprocess, shutil, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tracks import T
R = 'D:/AI/pm_radio/'
D = R + 'radio/'   # publish folder (mirrors /radio/ on Cloudflare)
os.makedirs(D, exist_ok=True)
def dur(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip()
    return round(float(o), 1)
L = []
for rel, title, slug in T:
    o, m = R + 'out/' + slug + '.ogg', R + 'out/' + slug + '.m4a'
    for f in (o, m):
        dst = D + os.path.basename(f)
        if not os.path.exists(dst) or os.path.getsize(dst) != os.path.getsize(f): shutil.copyfile(f, dst)
    L.append({ 's': slug, 't': title, 'd': dur(o), 'ogg': os.path.getsize(o), 'm4a': os.path.getsize(m), 'src': rel })
pl = { 'artist': 'EDMITRY', 'spotify': 'https://open.spotify.com/artist/5wo3p65ZoDWVhoqPOFS9d7', 'v': 1, 'tracks': [{ 's': x['s'], 't': x['t'], 'd': x['d'] } for x in L] }
open(D + 'playlist.json', 'w', encoding='utf-8').write(json.dumps(pl, ensure_ascii=False, separators=(',', ':')))
json.dump(L, open(R + 'tracks_full.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# compact JS array for the game module: [slug, title, seconds]
js = 'const RADIO79_LIST = ' + json.dumps([[x['s'], x['t'], round(x['d'])] for x in L], ensure_ascii=False, separators=(',', ':')) + ';\n'
open(R + 'list79.js', 'w', encoding='utf-8').write(js)
tot = sum(x['d'] for x in L)
print(len(L), 'tracks', round(tot / 60, 1), 'min; ogg', round(sum(x['ogg'] for x in L) / 1e6, 1), 'MB; m4a', round(sum(x['m4a'] for x in L) / 1e6, 1), 'MB; max file', round(max(max(x['ogg'], x['m4a']) for x in L) / 1e6, 2), 'MB')
for s in sys.argv[1:]:
    for ext in ('ogg', 'm4a'):
        p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', R + 'out/' + s + '.' + ext, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace')
        j = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S).group(0))
        print(s, ext, 'I', j['input_i'], 'TP', j['input_tp'])
