# game_assets.py — 3D-конвейер Portal Meteor: TRELLIS GLB -> игровые LOD (Blender 5.2, --background, CPU)
# blender -b --factory-startup -P game_assets.py -- <selection.json> [out_root=D:\AI\pm_assets] [only_name]
# На каждую модель: чистка мусорных островков, нормализация (центр, пол y=0, масштаб по типу, метры),
# LOD0 ~3000 тр. + текстура 512, LOD0m (то же, текстура 256, для телефона), LOD1 ~500 тр. + текстура 256.
# Текстура запекается с исходника (Cycles CPU, EMIT selected->active) на новую развёртку — без «рваных» UV после децимации.
# Результат: <out>\<cat>\<name>_lod0.glb / _lod0m.glb / _lod1.glb, превью _work\prev\, сведения _work\items\<name>.json
import bpy, bmesh, sys, os, json, math, time, traceback
from mathutils import Vector
A = sys.argv[sys.argv.index('--') + 1:]
SEL = A[0]; OUT = A[1] if len(A) > 1 else r'D:\AI\pm_assets'; ONLY = A[2] if len(A) > 2 else ''
WORK = os.path.join(OUT, '_work'); os.makedirs(os.path.join(WORK, 'items'), exist_ok=True); os.makedirs(os.path.join(WORK, 'prev'), exist_ok=True)
LOG = os.path.join(WORK, 'ga_log.txt')
def log(*a):
    s = time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a)
    print(s, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f: f.write(s + '\n')
LOD0, LOD1 = 3000, 500
# целевой наибольший габарит, м (боец ~1.75 м)
SIZE = {'rock': 2.4, 'crystal_cluster': 2.6, 'alien_fungus': 2.4, 'alien_plant': 2.2, 'container': 6.0, 'sandbags': 2.6,
        'wall_segment': 5.0, 'antenna': 6.5, 'floodlight': 4.5, 'mini_turret': 2.4, 'ammo_dump': 3.2, 'barrels': 1.6,
        'barrier': 3.0, 'crates': 2.0, 'deploy_cover': 2.6, 'bunker': 9.0, 'enemy_turret': 6.0, 'extractor': 12.0,
        'power_plant': 14.0, 'radar': 10.0, 'repair_bay': 12.0, 'barracks': 14.0, 'enemy_hq': 18.0, 'factory': 16.0,
        'hq': 18.0, 'outpost': 10.0, 'airpad': 14.0, 'apc': 7.5, 'buggy': 4.5, 'drone_attack': 1.6, 'drone_recon': 1.4,
        'drone_repair': 1.4, 'dropship': 16.0, 'enemy_walker': 7.0, 'grad_mlrs': 8.0, 'gunship': 13.0, 'mech': 6.5,
        'aa_vehicle': 7.5, 'tank': 8.0, 'assault_rifle': 0.95, 'bazooka': 1.3, 'enemy_cannon': 2.2, 'enemy_rifle': 1.0,
        'flamethrower': 1.1, 'grenade': 0.16, 'shotgun': 1.0, 'smg': 0.7, 'sniper': 1.3}
DEF = {'props': 2.5, 'buildings': 10.0, 'vehicles': 6.0, 'weapons': 1.0, 'world': 10.0}

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def sel_only(*objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def load(path):
    global CAM
    bpy.ops.wm.read_factory_settings(use_empty=True)
    CAM = None
    bpy.ops.import_scene.gltf(filepath=path)
    ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not ms: raise RuntimeError('нет мешей')
    sel_only(*ms)
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for x in [x for x in bpy.context.scene.objects if x is not o]: bpy.data.objects.remove(x, do_unlink=True)
    sel_only(o)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o

def clean(o, frac=0.004):
    bm = bmesh.new(); bm.from_mesh(o.data)
    dim = max(o.dimensions) or 1
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004 * dim)
    bm.faces.ensure_lookup_table()
    seen, isl = set(), []
    for f in bm.faces:
        if f.index in seen: continue
        st, cur = [f], []
        seen.add(f.index)
        while st:
            c = st.pop(); cur.append(c)
            for e in c.edges:
                for g in e.link_faces:
                    if g.index not in seen: seen.add(g.index); st.append(g)
        isl.append(cur)
    tot = sum(len(i) for i in isl)
    kill = [f for i in isl if len(i) < frac * tot for f in i]
    if kill: bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(o.data); bm.free(); o.data.update()
    # импортёр glTF кладёт «свои» нормали на каждый угол — после децимации они расщепляют почти каждую вершину; убираем
    sel_only(o)
    try: bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except Exception as e: log('  custom normals clear fail', e)
    return len(isl), len(kill)

def normalize(o, target):
    vs = [v.co for v in o.data.vertices]
    mn = Vector([min(v[i] for v in vs) for i in range(3)]); mx = Vector([max(v[i] for v in vs) for i in range(3)])
    s = target / max(mx - mn)
    off = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    for v in o.data.vertices: v.co = (v.co - off) * s
    o.data.update()
    d = (mx - mn) * s
    return [round(d.x, 3), round(d.z, 3), round(d.y, 3)]   # glTF: x ширина, y высота, z глубина

def src_emission(o):
    # исходник «светит» своим базовым цветом -> EMIT-запекание копирует альбедо без освещения
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes: continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not out: continue
        e = nt.nodes.new('ShaderNodeEmission')
        if b and b.inputs['Base Color'].is_linked:
            nt.links.new(b.inputs['Base Color'].links[0].from_socket, e.inputs['Color'])
        elif b:
            e.inputs['Color'].default_value = b.inputs['Base Color'].default_value
        nt.links.new(e.outputs[0], out.inputs['Surface'])

def xatlas_uv(o, res):
    if r'D:\AI\pm_3d\bpylib' not in sys.path: sys.path.insert(0, r'D:\AI\pm_3d\bpylib')
    import xatlas, numpy as np
    me = o.data
    me.calc_loop_triangles()
    if len(me.loop_triangles) != len(me.polygons): raise RuntimeError('не треугольники')
    V = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', V); V = V.reshape(-1, 3)
    F = np.array([p.vertices[:] for p in me.polygons], np.uint32)
    at = xatlas.Atlas(); at.add_mesh(V, F)
    po = xatlas.PackOptions(); po.resolution = res; po.padding = 2; po.bilinear = True
    at.generate(xatlas.ChartOptions(), po)
    vmap, idx, uv = at[0]
    idx = np.asarray(idx).reshape(-1); uv = np.asarray(uv).reshape(-1, 2)
    # UV на «углы» исходных треугольников (сетка остаётся сварной -> нормали гладкие, швы только в UV)
    uvl = me.uv_layers.new(name='UVMap')
    lp = np.zeros(len(me.loops) * 2, np.float32)
    k = 0
    for pi, p in enumerate(me.polygons):
        for j, li in enumerate(p.loop_indices):
            u = uv[idx[pi * 3 + j]]; lp[li * 2] = u[0]; lp[li * 2 + 1] = u[1]
    uvl.data.foreach_set('uv', lp)
    me.uv_layers.active = uvl

def make_lod(src, target, res, tag, size):
    sc = bpy.context.scene
    o = src.copy(); o.data = src.data.copy(); o.name = tag; sc.collection.objects.link(o)
    o.data.materials.clear()
    while o.data.uv_layers: o.data.uv_layers.remove(o.data.uv_layers[0])
    for ca in list(o.data.color_attributes): o.data.color_attributes.remove(ca)
    # децимация в несколько проходов: если коллапс «упёрся» (швы/немногообразные рёбра), сшиваем вершины всё крупнее
    for k in range(7):
        t = tris(o)
        if t <= target * 1.12: break
        if k:
            bm = bmesh.new(); bm.from_mesh(o.data)
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=size * (0.004, 0.008, 0.015, 0.025, 0.04, 0.06)[k - 1])
            bm.to_mesh(o.data); bm.free(); o.data.update()
            t = tris(o)
            if t <= target * 1.12: break
        sel_only(o)
        md = o.modifiers.new('dec', 'DECIMATE'); md.decimate_type = 'COLLAPSE'; md.ratio = min(1.0, target / t); md.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier='dec')
    sel_only(o)
    if ONLY and ONLY != '*': log('  dbg', tag, 'verts', len(o.data.vertices), 'tris', tris(o), 'src verts', len(src.data.vertices), 'src tris', tris(src))
    # развёртка xatlas (крупные карты, мало швов -> в GLB почти нет расщеплённых вершин); запасной вариант — Smart UV Project
    try: xatlas_uv(o, res)
    except Exception as e:
        log('  xatlas fail, smart_project:', e)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(72), island_margin=0.008 if res >= 512 else 0.012)
        bpy.ops.object.mode_set(mode='OBJECT')
    try: bpy.ops.object.shade_smooth_by_angle(angle=math.radians(75))
    except Exception:
        for p in o.data.polygons: p.use_smooth = True
    img = bpy.data.images.new(tag + '_tex', res, res, alpha=False); img.colorspace_settings.name = 'sRGB'
    mt = bpy.data.materials.new(tag + '_mat'); mt.use_nodes = True
    nt = mt.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn
    nt.links.new(tn.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.75; b.inputs['Metallic'].default_value = 0.0
    o.data.materials.append(mt)
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4
    try: sc.render.bake.target = 'IMAGE_TEXTURES'
    except Exception: pass
    sel_only(o); src.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.bake(type='EMIT', use_selected_to_active=True, cage_extrusion=0.015 * size, max_ray_distance=0.06 * size,
                        margin=4 if res >= 512 else 2)
    return o, tn, img

GLTF_OK = None
def export(o, path):
    global GLTF_OK
    if GLTF_OK is None: GLTF_OK = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=82,
              export_animations=False, export_skins=False, export_morph=False, export_vertex_color='NONE', export_cameras=False,
              export_lights=False, export_apply=True, export_extras=False, export_yup=True, export_texcoord=True, export_normals=True,
              export_tangents=False, export_materials='EXPORT')
    kw = {k: v for k, v in kw.items() if k in GLTF_OK or k == 'filepath'}
    sel_only(o)
    bpy.ops.export_scene.gltf(**kw)
    return os.path.getsize(path)

CAM = None
def render(o, path, size=300):
    global CAM
    sc = bpy.context.scene
    for x in sc.objects:
        if x.type == 'MESH': x.hide_render = x is not o
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_cavity = True; sh.show_shadows = True
    if not sc.world: sc.world = bpy.data.worlds.new('w')
    sc.world.color = (0.26, 0.27, 0.29)
    sc.render.resolution_x = sc.render.resolution_y = size; sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    if CAM is None or CAM.name not in sc.objects:
        CAM = bpy.data.objects.new('cam', bpy.data.cameras.new('c')); sc.collection.objects.link(CAM)
        CAM.data.type = 'ORTHO'
    sc.camera = CAM
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector([min(p[i] for p in bb) for i in range(3)]); mx = Vector([max(p[i] for p in bb) for i in range(3)])
    ctr = (mn + mx) / 2; dm = max(mx - mn)
    d = Vector((1.0, -1.25, 0.85)).normalized()
    CAM.location = ctr + d * dm * 4
    CAM.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    CAM.data.ortho_scale = dm * 1.35; CAM.data.clip_end = dm * 20
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def _px(img):
    import array
    a = array.array('f', [0.0]) * (img.size[0] * img.size[1] * 4); img.pixels.foreach_get(a); return a

def process(it):
    name, cat = it['name'], it['cat']
    t0 = time.time()
    od = os.path.join(OUT, cat); os.makedirs(od, exist_ok=True)
    o = load(it['src']); o.name = 'SRC'
    t_raw = tris(o)
    nisl, nkill = clean(o)
    size = SIZE.get(it['type'], DEF.get(cat, 3.0))
    dims = normalize(o, size)
    src_emission(o)
    rec = dict(name=name, cat=cat, type=it['type'], liked=it['liked'], weight=it['weight'], dims=dims, size=size,
               src=it['src'], src2d=it.get('src2d', ''), src_tris=t_raw, islands=nisl, removed_faces=nkill)
    l0, tn0, img0 = make_lod(o, LOD0, 512, name + '_lod0', size)
    l1, tn1, img1 = make_lod(o, LOD1, 256, name + '_lod1', size)
    rec['tris0'], rec['tris1'] = tris(l0), tris(l1)
    rec['bytes0'] = export(l0, os.path.join(od, name + '_lod0.glb'))
    im_m = bpy.data.images.new(name + '_lod0m_tex', 512, 512, alpha=False); im_m.pixels.foreach_set(_px(img0)); im_m.scale(256, 256); im_m.update(); tn0.image = im_m
    rec['bytes0m'] = export(l0, os.path.join(od, name + '_lod0m.glb'))
    tn0.image = img0
    rec['bytes1'] = export(l1, os.path.join(od, name + '_lod1.glb'))
    pv = os.path.join(WORK, 'prev')
    try:
        render(o, os.path.join(pv, name + '_src.png')); render(l0, os.path.join(pv, name + '_lod0.png')); render(l1, os.path.join(pv, name + '_lod1.png'))
    except Exception as e:
        rec['prev_err'] = str(e)[:200]; log('  preview fail', e)
    rec['sec'] = round(time.time() - t0, 1)
    return rec

def main():
    S = json.load(open(SEL, encoding='utf-8'))['items']
    log('START', len(S), 'items')
    for k, it in enumerate(S):
        if ONLY and ONLY != '*' and it['name'] != ONLY: continue   # '*' = пересобрать всё
        jp = os.path.join(WORK, 'items', it['name'] + '.json')
        od = os.path.join(OUT, it['cat'])
        if not ONLY and os.path.exists(jp) and all(os.path.exists(os.path.join(od, it['name'] + s)) for s in ('_lod0.glb', '_lod0m.glb', '_lod1.glb')):
            continue
        try:
            rec = process(it)
            log(f"[{k + 1}/{len(S)}] OK {it['cat']}/{it['name']} src={rec['src_tris']} -> {rec['tris0']}/{rec['tris1']} tris, "
                f"{rec['bytes0'] // 1024}/{rec['bytes0m'] // 1024}/{rec['bytes1'] // 1024} KB, dims={rec['dims']}, {rec['sec']}s")
        except Exception as e:
            rec = dict(name=it['name'], cat=it['cat'], error=str(e)[:300])
            log(f"[{k + 1}/{len(S)}] FAIL {it['name']}: {e}"); log(traceback.format_exc()[-800:])
        json.dump(rec, open(jp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    log('ALL DONE')

main()
