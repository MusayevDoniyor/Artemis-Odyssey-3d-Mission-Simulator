import bpy
from mathutils import Matrix, Vector

print("\n" + "=" * 60)
print("BUILDING FLAWLESS SLS BLOCK 1 MODEL V2")
print("=" * 60)

if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')

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
    'orion_las': ['Dummy_ESM_', 'Dummy_MPCV', 'Dummy_Orio', 'Dummy146', 'Dummy_NewS'],
}

clean_nodes = {}

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
        bpy.context.collection.objects.link(new_obj)
        new_obj.data.transform(mw)
        if det < 0:
            new_obj.data.flip_normals()
        new_obj.matrix_world = Matrix.Identity(4)
        copies.append(new_obj)
        new_obj.select_set(True)
    
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    
    joined = bpy.context.view_layer.objects.active
    joined.name = comp_name
    
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.dissolve_degenerate(threshold=0.0001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    clean_nodes[comp_name] = joined

# Create srb_left by mirroring clean srb_right across X=0
print("\nCreating srb_left by mirroring clean srb_right...")
srb_r = clean_nodes['srb_right']
srb_l = srb_r.copy()
srb_l.data = srb_r.data.copy()
srb_l.name = 'srb_left'
bpy.context.collection.objects.link(srb_l)

# Mirror matrix across X
mirror_mat = Matrix.Scale(-1, 4, Vector((1, 0, 0)))
srb_l.data.transform(mirror_mat)
srb_l.data.flip_normals() # Ensure outward CCW normals
srb_l.matrix_world = Matrix.Identity(4)

bpy.context.view_layer.objects.active = srb_l
srb_l.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')

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
        bpy.context.collection.objects.link(new_obj)
        new_obj.data.transform(mw)
        if det < 0:
            new_obj.data.flip_normals()
        new_obj.matrix_world = Matrix.Identity(4)
        copies.append(new_obj)
        new_obj.select_set(True)
    
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    icps_joined = bpy.context.view_layer.objects.active
    icps_joined.name = 'icps'
    
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.dissolve_degenerate(threshold=0.0001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    clean_nodes['icps'] = icps_joined

print("\n--- MEASURING EXTENTS BEFORE DECIMATION ---")
for name, obj in clean_nodes.items():
    bb = [Vector(corner) for corner in obj.bound_box]
    min_c = Vector((min(c[0] for c in bb), min(c[1] for c in bb), min(c[2] for c in bb)))
    max_c = Vector((max(c[0] for c in bb), max(c[1] for c in bb), max(c[2] for c in bb)))
    size = max_c - min_c
    print(f"{name:15}: Tris={len(obj.data.polygons):7} Min={[round(v,2) for v in min_c]} Max={[round(v,2) for v in max_c]} Size={[round(v,2) for v in size]}")

target_counts = {
    'core_stage': 20000,
    'rs25_engines': 18000,
    'srb_right': 11000,
    'srb_left': 11000,
    'orion_las': 7000,
    'icps': 1000,
}

print("\n--- DECIMATING TO BUDGET ---")
for name, obj in clean_nodes.items():
    target = target_counts.get(name, 10000)
    current = len(obj.data.polygons)
    if current > target:
        ratio = target / current
        print(f"Decimating {name} from {current} to target {target} (ratio {ratio:.4f})...")
        mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="Decimate")
        
        # Post-decimate cleanup of degenerate polygons
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.dissolve_degenerate(threshold=0.0001)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        
    print(f"  {name:15} final tris: {len(obj.data.polygons)}, Scale={list(obj.scale)}")

# Select only our 6 clean objects
bpy.ops.object.select_all(action='DESELECT')
for obj in clean_nodes.values():
    obj.select_set(True)

out_glb = r"./public\assets\rockets\sls_block1.glb"
print(f"\nExporting to {out_glb}...")

bpy.ops.export_scene.gltf(
    filepath=out_glb,
    use_selection=True,
    export_format='GLB',
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
)

print("\nFlawless SLS Block 1 V2 export completed successfully!")
