# v7.5 3D-модели окружения: упаковка игровых LOD из D:\AI\pm_assets (их делает Blender-конвейер D:\AI\pm_3d\scripts\game_assets.py)
# в компактные GLB для игры: позиции uint16, нормали int8, UV uint16 (KHR_mesh_quantization; разжатие — матрицей узла),
# текстура JPEG как есть. Выход: assets3d/<имя>_<lod>.glb + assets/catalog3d.json (встраивается в страницу при сборке).
# python assets3d_pack.py [D:\AI\pm_assets]   — build.py потом кладёт рядом со страницей dist/assets3d/*.js (base64-обёртки)
import sys, os, json, struct, math
SRC = sys.argv[1] if len(sys.argv) > 1 else r'D:\AI\pm_assets'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets3d'); os.makedirs(OUT, exist_ok=True)
CATS = ('props', 'buildings', 'vehicles')          # оружие пока только в каталоге pm_assets (для FPS позже)
LODS = ('lod0', 'lod0m', 'lod1')
try:
    import PIL; JQ = 72
except Exception: JQ = 0; print('PIL нет — JPEG как есть (запускать лучше D:\\AI\\pm_3d\\venv\\Scripts\\python.exe)')

def read_glb(p):
    b = open(p, 'rb').read()
    assert struct.unpack('<I', b[:4])[0] == 0x46546C67
    off, J, BIN = 12, None, None
    while off + 8 <= len(b):
        ln, ty = struct.unpack('<II', b[off:off + 8]); ch = b[off + 8: off + 8 + ln]
        if ty == 0x4E4F534A: J = json.loads(ch)
        elif ty == 0x004E4942: BIN = ch
        off += 8 + ln
    return J, BIN

def acc(J, BIN, i):
    A = J['accessors'][i]; V = J['bufferViews'][A['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[A['type']]
    fmt = {5126: 'f', 5123: 'H', 5125: 'I', 5121: 'B'}[A['componentType']]
    cs = struct.calcsize(fmt); st = V.get('byteStride') or n * cs
    base = V.get('byteOffset', 0) + A.get('byteOffset', 0)
    out = []
    for k in range(A['count']):
        out.append(struct.unpack_from('<' + fmt * n, BIN, base + k * st))
    return out

def pad4(b, fill=b'\0'): return b + fill * ((4 - len(b) % 4) % 4)

def pack(src, dst):
    J, BIN = read_glb(src)
    prim = J['meshes'][0]['primitives'][0]; at = prim['attributes']
    P = acc(J, BIN, at['POSITION']); N = acc(J, BIN, at['NORMAL']); T = acc(J, BIN, at['TEXCOORD_0'])
    I = [x[0] for x in acc(J, BIN, prim['indices'])]
    mn = [min(p[i] for p in P) for i in range(3)]; mx = [max(p[i] for p in P) for i in range(3)]
    ext = [max(mx[i] - mn[i], 1e-5) for i in range(3)]
    q = lambda v, i: max(0, min(65535, round((v - mn[i]) / ext[i] * 65535)))
    sb = lambda v: max(-127, min(127, round(v * 127)))
    cu = lambda v: max(0, min(65535, round(min(1.0, max(0.0, v)) * 65535)))
    pos = b''.join(struct.pack('<HHHH', q(p[0], 0), q(p[1], 1), q(p[2], 2), 0) for p in P)
    nrm = b''.join(struct.pack('<bbbb', sb(n[0]), sb(n[1]), sb(n[2]), 0) for n in N)
    uv = b''.join(struct.pack('<HH', cu(t[0]), cu(t[1])) for t in T)
    big = len(P) > 65535
    idx = struct.pack('<%d%s' % (len(I), 'I' if big else 'H'), *I)
    im = J['images'][0]; iv = J['bufferViews'][im['bufferView']]
    img = BIN[iv.get('byteOffset', 0): iv.get('byteOffset', 0) + iv['byteLength']]
    if JQ:   # перекодировать JPEG (Blender пишет q82 4:4:4) -> q72 4:2:0: текстура ~в 1.7 раза легче, на глаз в игре не отличить
        import io
        from PIL import Image
        bo = io.BytesIO(); Image.open(io.BytesIO(img)).convert('RGB').save(bo, 'JPEG', quality=JQ, subsampling=2, optimize=True)
        if bo.tell() < len(img): img = bo.getvalue()
    parts, views, off = [], [], 0
    for data, stride, tgt in ((pos, 8, 34962), (nrm, 4, 34962), (uv, 4, 34962), (idx, None, 34963), (img, None, None)):
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if stride: v['byteStride'] = stride
        if tgt: v['target'] = tgt
        views.append(v); d = pad4(data); parts.append(d); off += len(d)
    nv = len(P)
    G = {'asset': {'version': '2.0', 'generator': 'pm assets3d_pack v7.5'},
         'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'],
         'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'translation': mn, 'scale': ext}],
         'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
         'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 0.75}}],
         'textures': [{'source': 0, 'sampler': 0}], 'samplers': [{'magFilter': 9729, 'minFilter': 9987}],
         'images': [{'bufferView': 4, 'mimeType': im.get('mimeType', 'image/jpeg')}],
         'accessors': [{'bufferView': 0, 'componentType': 5123, 'normalized': True, 'count': nv, 'type': 'VEC3', 'min': [0, 0, 0], 'max': [1, 1, 1]},
                       {'bufferView': 1, 'componentType': 5120, 'normalized': True, 'count': nv, 'type': 'VEC3'},
                       {'bufferView': 2, 'componentType': 5123, 'normalized': True, 'count': nv, 'type': 'VEC2'},
                       {'bufferView': 3, 'componentType': 5125 if big else 5123, 'count': len(I), 'type': 'SCALAR'}],
         'bufferViews': views, 'buffers': [{'byteLength': off}]}
    js = pad4(json.dumps(G, separators=(',', ':')).encode(), b' ')
    binb = b''.join(parts)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binb)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binb), 0x004E4942) + binb
    open(dst, 'wb').write(out)
    return len(out), len(I) // 3, nv

# где модель стоит в мире: nature — камни/кристаллы/грибы; camp — укрепления и снаряжение; ruin — постройки прошлых экспедиций;
# wreck — брошенная техника; '' — не расставляется (летающее, оружие)
PLACE = {'rock': 'nature', 'crystal_cluster': 'nature', 'alien_fungus': 'nature', 'alien_plant': 'nature'}
FLY = ('drone_attack', 'drone_recon', 'drone_repair', 'gunship', 'dropship')
# отсев по листу моделей (_work\sheet_all.jpg): «каша» после TRELLIS или неподходящий концепт; переназначения
SKIP = {'grad_mlrs_1162544219': 'бесформенная каша', 'ammo_dump_1081288764': 'бесформенная каша', 'outpost_1250551182': 'на концепте флаг реальной страны'}
OVERRIDE = {'factory_1553196644': 'wreck', 'deploy_cover_1497690636': 'wreck'}   # по факту это грузовик и броневичок
def place(cat, typ, name=''):
    if name in SKIP: return ''
    if name in OVERRIDE: return OVERRIDE[name]
    if cat == 'props': return PLACE.get(typ, 'camp')
    if cat == 'buildings': return 'ruin'
    if cat == 'vehicles': return '' if typ in FLY else 'wreck'
    return ''

items, tot = [], {l: 0 for l in LODS}
for f in sorted(os.listdir(os.path.join(SRC, '_work', 'items'))):
    r = json.load(open(os.path.join(SRC, '_work', 'items', f), encoding='utf-8'))
    if r.get('error') or r['cat'] not in CATS: continue
    pl = place(r['cat'], r['type'], r['name'])
    if not pl: continue
    e = {'n': r['name'], 'c': r['cat'], 't': r['type'], 'p': pl, 'w': r['weight'], 'd': r['dims'], 'kb': [], 'tr': []}
    for l in LODS:
        b, tr, nv = pack(os.path.join(SRC, r['cat'], r['name'] + '_' + l + '.glb'), os.path.join(OUT, r['name'] + '_' + l + '.glb'))
        e['kb'].append(round(b / 1024)); e['tr'].append(tr); tot[l] += b
    items.append(e)
    print('%-34s %-6s %3d/%3d/%3d KB  %d/%d tris  %s' % (r['name'], pl, *e['kb'], e['tr'][0], e['tr'][2], r['dims']))
cat = {'v': 1, 'items': items, 'bytes': tot}
os.makedirs(os.path.join(HERE, 'assets'), exist_ok=True)
json.dump(cat, open(os.path.join(HERE, 'assets', 'catalog3d.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('items', len(items), 'total KB', {k: v // 1024 for k, v in tot.items()})
