# Radio build: COPY masters out of D:\Commercial tracks (read-only) -> src/, then 2-pass loudnorm (-16 LUFS, TP -1.5) -> out/<slug>.ogg (Opus 96k) + out/<slug>.m4a (AAC 96k)
import os, sys, json, shutil, subprocess, re, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tracks import T
SRCROOT = 'D:/Commercial tracks/'
R = 'D:/AI/pm_radio/'
os.makedirs(R + 'src', exist_ok=True); os.makedirs(R + 'out', exist_ok=True); os.makedirs(R + 'tmp', exist_ok=True)
FF = 'ffmpeg'
def run(a): return subprocess.run(a, capture_output=True, text=True, encoding='utf-8', errors='replace')
def one(t):
    rel, title, slug = t
    s = SRCROOT + rel.replace('\\', '/')
    ext = os.path.splitext(s)[1].lower()
    c = R + 'src/' + slug + ext
    if not os.path.exists(c) or os.path.getsize(c) != os.path.getsize(s): shutil.copyfile(s, c)   # copy only (reads source)
    o1, o2 = R + 'out/' + slug + '.ogg', R + 'out/' + slug + '.m4a'
    if os.path.exists(o1) and os.path.exists(o2): return slug, 'skip'
    p = run([FF, '-hide_banner', '-nostats', '-i', c, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    if not m: return slug, 'ERR measure ' + p.stderr[-300:]
    j = json.loads(m.group(0))
    af = ('loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}:linear=true'.format(**j))
    w = R + 'tmp/' + slug + '.wav'
    p = run([FF, '-y', '-hide_banner', '-i', c, '-af', af + ',aresample=48000', '-ac', '2', '-c:a', 'pcm_f32le', '-map_metadata', '-1', w])
    if p.returncode: return slug, 'ERR norm ' + p.stderr[-300:]
    md = ['-metadata', 'artist=EDMITRY', '-metadata', 'title=' + title, '-metadata', 'album=Radio Portal Meteor']
    p = run([FF, '-y', '-hide_banner', '-i', w, '-c:a', 'libopus', '-b:a', '96k', '-vbr', 'on', '-application', 'audio', '-map_metadata', '-1'] + md + [o1])
    if p.returncode: return slug, 'ERR opus ' + p.stderr[-300:]
    p = run([FF, '-y', '-hide_banner', '-i', w, '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-map_metadata', '-1'] + md + [o2])
    if p.returncode: return slug, 'ERR aac ' + p.stderr[-300:]
    os.remove(w)
    return slug, 'ok I=%s' % j['input_i']
if __name__ == '__main__':
    sl = [t[2] for t in T]; assert len(sl) == len(set(sl)), 'dup slug'
    for t in T: assert os.path.exists(SRCROOT + t[0].replace('\\', '/')), 'missing ' + t[0]
    with cf.ThreadPoolExecutor(int(sys.argv[1]) if len(sys.argv) > 1 else 6) as ex:
        for slug, r in ex.map(one, T): print(slug, r, flush=True)
    print('DONE', flush=True)
