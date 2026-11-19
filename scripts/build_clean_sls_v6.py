import bpy
import bmesh
from mathutils import Matrix, Vector

print("\n" + "=" * 60)
print("BUILDING FLAWLESS SLS BLOCK 1 MODEL V6 (ANIMATION CLEARED)")
print("=" * 60)

dummy_bloc = bpy.data.objects.get("Dummy_Bloc")
icps_root = bpy.data.objects.get("ICPS_2015_")

if not dummy_bloc:
    raise RuntimeError("Dummy_Bloc not found!")

def get_all_meshes(obj):
    res = []
    if obj.type == 'MESH':
        res.append(obj)
    for c in obj.children:
        res.extend(get_all_meshes(c))
    return res

components = {
    'core_stage': ['Dummy_Core', 'Dummy_LVSA'],
    'rs25_engines': ['Dummy_Engs'],
    'srb_right': ['Dummy_SRB0'],
    'orion_esm': ['Dummy_ESM_'],
    'orion_cm': ['Dummy_MPCV', 'Dummy_Orio'],
    'orion_las': ['Dummy146', 'Dummy_NewS'],
}

clean_nodes = {}

poly_targets = {
    'core_stage': 9000,
    'rs25_engines': 6000,
    'srb_right': 5000,
    'orion_esm': 2200,
    'orion_cm': 2200,
    'orion_las': 3800,
    'icps': 1400,
}

for comp_name, root_names in components.items():
    mesh_objs = []
    for rname in root_names:
        robj = bpy.data.objects.get(rname)
        if robj:
            mesh_objs.extend(get_all_meshes(robj))
    
    print(f"\nProcessing {comp_name} ({len(mesh_objs)} meshes)...")
    bpy.ops.object.select_all(action='DESELECT')
    copies = []
    for m in mesh_objs:
        mw = m.matrix_world.copy()
        det = mw.determinant()
        new_obj = m.copy()
        new_obj.data = m.data.copy()
        new_obj.animation_data_clear()
        new_obj.parent = None
        new_obj.location = (0, 0, 0)
        new_obj.rotation_euler = (0, 0, 0)
        new_obj.scale = (1, 1, 1)
        bpy.context.collection.objects.link(new_obj)
        new_obj.data.transform(mw)
        if det < 0:
            new_obj.data.flip_normals()
        copies.append(new_obj)
        new_obj.select_set(True)
    
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    
    joined = bpy.context.view_layer.objects.active
    joined.name = comp_name
    joined.animation_data_clear()
    joined.parent = None
    joined.location = (0, 0, 0)
    joined.rotation_euler = (0, 0, 0)
    joined.scale = (1, 1, 1)
    
    target = poly_targets.get(comp_name, 5000)
    current = len(joined.data.polygons)
    if current > target:
        ratio = target / current
        print(f"  Decimating {comp_name} from {current} to target {target} (ratio {ratio:.4f})...")
        mod = joined.modifiers.new(name="Decimate", type='DECIMATE')
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="Decimate")
    
    bm = bmesh.new()
    bm.from_mesh(joined.data)
    degenerate = [f for f in bm.faces if f.calc_area() <= 1e-7]
    if degenerate:
        print(f"  Removing {len(degenerate)} zero-area faces...")
        bmesh.ops.delete(bm, geom=degenerate, context='FACES')
    bmesh.ops.dissolve_degenerate(bm, dist=0.0001, edges=bm.edges)
    bm.to_mesh(joined.data)
    bm.free()
    joined.data.update()

    joined.animation_data_clear()
    joined.location = (0, 0, 0)
    joined.rotation_euler = (0, 0, 0)
    joined.scale = (1, 1, 1)

    clean_nodes[comp_name] = joined

# Create srb_left by mirroring clean srb_right across X=0
print("\nCreating srb_left by mirroring clean srb_right across X=0...")
srb_r = clean_nodes['srb_right']
srb_l = srb_r.copy()
srb_l.data = srb_r.data.copy()
srb_l.name = 'srb_left'
srb_l.animation_data_clear()
srb_l.parent = None
srb_l.location = (0, 0, 0)
srb_l.rotation_euler = (0, 0, 0)
srb_l.scale = (1, 1, 1)
bpy.context.collection.objects.link(srb_l)

mirror_mat = Matrix.Scale(-1, 4, Vector((1, 0, 0)))
srb_l.data.transform(mirror_mat)
srb_l.data.flip_normals()
clean_nodes['srb_left'] = srb_l

# Process ICPS
if icps_root:
    icps_meshes = get_all_meshes(icps_root)
    print(f"\nProcessing icps ({len(icps_meshes)} meshes)...")
    bpy.ops.object.select_all(action='DESELECT')
    copies = []
    for m in icps_meshes:
        mw = m.matrix_world.copy()
        det = mw.determinant()
        new_obj = m.copy()
        new_obj.data = m.data.copy()
        new_obj.animation_data_clear()
        new_obj.parent = None
        new_obj.location = (0, 0, 0)
        new_obj.rotation_euler = (0, 0, 0)
        new_obj.scale = (1, 1, 1)
        bpy.context.collection.objects.link(new_obj)
        new_obj.data.transform(mw)
        if det < 0:
            new_obj.data.flip_normals()
        copies.append(new_obj)
        new_obj.select_set(True)
    
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    icps_joined = bpy.context.view_layer.objects.active
    icps_joined.name = 'icps'
    icps_joined.animation_data_clear()
    icps_joined.parent = None
    icps_joined.location = (0, 0, 0)
    icps_joined.rotation_euler = (0, 0, 0)
    icps_joined.scale = (1, 1, 1)
    
    target = poly_targets.get('icps', 1400)
    current = len(icps_joined.data.polygons)
    if current > target:
        ratio = target / current
        mod = icps_joined.modifiers.new(name="Decimate", type='DECIMATE')
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="Decimate")
    
    bm = bmesh.new()
    bm.from_mesh(icps_joined.data)
    degenerate = [f for f in bm.faces if f.calc_area() <= 1e-7]
    if degenerate:
        bmesh.ops.delete(bm, geom=degenerate, context='FACES')
    bmesh.ops.dissolve_degenerate(bm, dist=0.0001, edges=bm.edges)
    bm.to_mesh(icps_joined.data)
    bm.free()
    icps_joined.data.update()

    icps_joined.animation_data_clear()
    icps_joined.location = (0, 0, 0)
    icps_joined.rotation_euler = (0, 0, 0)
    icps_joined.scale = (1, 1, 1)

    clean_nodes['icps'] = icps_joined

print("\n--- FINAL NODE VERIFICATION ---")
total_tris = 0
for name, obj in clean_nodes.items():
    bb = [Vector(corner) for corner in obj.bound_box]
    min_c = Vector((min(c[0] for c in bb), min(c[1] for c in bb), min(c[2] for c in bb)))
    max_c = Vector((max(c[0] for c in bb), max(c[1] for c in bb), max(c[2] for c in bb)))
    size = max_c - min_c
    tris = len(obj.data.polygons)
    total_tris += tris
    print(f"{name:15}: Tris={tris:6} Pos={[round(v,3) for v in obj.location]} Scale={[round(v,3) for v in obj.scale]} Bounds X=[{min_c.x:.2f},{max_c.x:.2f}] Y=[{min_c.y:.2f},{max_c.y:.2f}] Z=[{min_c.z:.2f},{max_c.z:.2f}] Height={size.z:.2f}m")

print(f"\nTOTAL MODEL TRIANGLES: {total_tris} (Budget <= 75,000)")

# Also delete all other objects in the entire scene to ensure only clean objects remain!
all_objs = list(bpy.data.objects)
for o in all_objs:
    if o not in clean_nodes.values():
        bpy.data.objects.remove(o, do_unlink=True)

# Delete all actions and animations in the blend file
for act in list(bpy.data.actions):
    bpy.data.actions.remove(act)

bpy.ops.object.select_all(action='SELECT')

out_glb = r"./public\assets\rockets\sls_block1.glb"
print(f"\nExporting clean GLB to {out_glb}...")

bpy.ops.export_scene.gltf(
    filepath=out_glb,
    use_selection=True,
    export_format='GLB',
    export_apply=True,
    export_yup=True,
    export_animations=False,
    export_skins=False,
    export_morph=False,
    export_draco_mesh_compression_enable=False,
)
print("SUCCESS: SLS Block 1 V6 successfully exported!")
