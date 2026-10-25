# v6.8: машинный перевод строк интерфейса EN -> HE (NLLB-200 distilled 1.3B, локально на GPU)
# вход tests/he68_keys.json, выход tests/he68_mt.json {en: he}
import json, re, sys, torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
IN = 'D:/AI/pm_v6/tests/he68_keys.json'; OUT = 'D:/AI/pm_v6/tests/he68_mt.json'
M = 'facebook/nllb-200-distilled-1.3B'
keys = list(json.load(open(IN, encoding='utf-8')).keys())
try: done = json.load(open(OUT, encoding='utf-8'))
except Exception: done = {}
tok = AutoTokenizer.from_pretrained(M, src_lang='eng_Latn')
model = AutoModelForSeq2SeqLM.from_pretrained(M, torch_dtype=torch.float16).cuda().eval()
HEB = tok.convert_tokens_to_ids('heb_Hebr')
def mt(texts, bs=24):
    out = []
    for i in range(0, len(texts), bs):
        b = texts[i:i + bs]
        enc = tok(b, return_tensors='pt', padding=True, truncation=True, max_length=400).to('cuda')
        with torch.no_grad(): g = model.generate(**enc, forced_bos_token_id=HEB, max_new_tokens=420, num_beams=4)
        out += tok.batch_decode(g, skip_special_tokens=True)
        print('mt', i + len(b), '/', len(texts), flush=True)
    return out
# «атомы», которые нельзя переводить: {0}, клавиши (M) [Q] , эмодзи и значки, числа
ATOM = re.compile(r'\{\w+\}|<[^>]+>|&\w+;|\((?:[A-Z0-9]{1,3}|ПКМ|ЛКМ|RMB|LMB|Shift|Ctrl|Alt|Space|Tab|Esc|Enter|F\d+)\)|\[[A-Z0-9]{1,5}\]|\s[—–]\s|[^\w\s.,:;!?\'"()\-«»“”/%+&{}]+|\d+(?:[.,]\d+)?')
def split(s):
    parts = []; last = 0
    for m in ATOM.finditer(s):
        if m.start() > last: parts.append(('t', s[last:m.start()]))
        parts.append(('a', m.group())); last = m.end()
    if last < len(s): parts.append(('t', s[last:]))
    return parts
todo = [k for k in keys if k not in done]
# 1) целиком, атомы заменены на <n> маркеры-числа «[[n]]»
prot, maps = [], []
for k in todo:
    p = split(k); atoms = [x for t, x in p if t == 'a']; s = ''; n = 0
    for t, x in p:
        if t == 'a': s += f' [{n}] '; n += 1
        else: s += x
    prot.append(re.sub(r'\s+', ' ', s).strip()); maps.append(atoms)
res = mt(prot)
bad = []
for k, r, atoms in zip(todo, res, maps):
    ok = all(r.count(f'[{i}]') == 1 for i in range(len(atoms))) and not re.search(r'\[\d+\]', re.sub(r'\[(\d+)\]', lambda m: '' if int(m.group(1)) < len(atoms) else m.group(), r))
    if not ok or not re.search(r'[\u0590-\u05FF]', r) and re.search(r'[A-Za-z]{3}', k): bad.append(k); continue
    for i, a in enumerate(atoms): r = r.replace(f'[{i}]', a)
    done[k] = re.sub(r'\s+', ' ', r).strip()
print('whole ok', len(todo) - len(bad), 'bad', len(bad), flush=True)
# 2) плохие — по кускам между атомами
segs = sorted({x.strip() for k in bad for t, x in split(k) if t == 't' and re.search(r'[A-Za-z]{2}', x)})
sm = dict(zip(segs, mt(segs))) if segs else {}
for k in bad:
    s = ''
    for t, x in split(k):
        if t == 'a': s += x
        else:
            xs = x.strip()
            if xs in sm:
                lead = ' ' if x[:1].isspace() else ''; trail = ' ' if x[-1:].isspace() else ''
                s += lead + sm[xs] + trail
            else: s += x
    done[k] = s
json.dump(done, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('DONE', len(done), flush=True)
