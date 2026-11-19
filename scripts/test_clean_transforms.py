import bpy
import bmesh
from mathutils import Matrix, Vector

# Load blend file
dummy_bloc = bpy.data.objects.get("Dummy_Bloc")
icps_root = bpy.data.objects.get("ICPS_2015_")

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

# Target polygon counts for decimation so total triangles <= 70,000
poly_targets = {
    'core_stage': 12000,
    'rs25_engines': 9000,
    'srb_right': 6500,
    'orion_esm': 2500,
    'orion_cm': 2500,
    'orion_las': 4000,
    'icps': 1500,
}

for comp_name, root_names in components.items():
    mesh_objs = []
    for rname in root_names:
        robj = bpy.data.objects.get(rname)
        if robj:
            mesh_objs.extend(get_all_meshes(robj))
    
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
    
    # Decimate to poly target
    target = poly_targets.get(comp_name, 5000)
    current = len(joined.data.polygons)
    if current > target:
        ratio = target / current
        mod = joined.modifiers.new(name="Decimate", type='DECIMATE')
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="Decimate")
    
    # Clean zero-area faces
    bm = bmesh.new()
    bm.from_mesh(joined.data)
    degenerate = [f for f in bm.faces if f.calc_area() <= 1e-7]
    if degenerate:
        bmesh.ops.delete(bm, geom=degenerate, context='FACES')
    bmesh.ops.dissolve_degenerate(bm, dist=0.0001, edges=bm.edges)
    bm.to_mesh(joined.data)
    bm.free()
    joined.data.update()

    # Clear parent and reset transform to identity
    joined.parent = None
    joined.matrix_world = Matrix.Identity(4)
    joined.location = (0, 0, 0)
    joined.rotation_euler = (0, 0, 0)
    joined.scale = (1, 1, 1)

    clean_nodes[comp_name] = joined

# Create srb_left by mirroring clean srb_right across X=0
srb_r = clean_nodes['srb_right']
srb_l = srb_r.copy()
srb_l.data = srb_r.data.copy()
srb_l.name = 'srb_left'
bpy.context.collection.objects.link(srb_l)

mirror_mat = Matrix.Scale(-1, 4, Vector((1, 0, 0)))
srb_l.data.transform(mirror_mat)
srb_l.data.flip_normals()
srb_l.parent = None
srb_l.matrix_world = Matrix.Identity(4)
srb_l.location = (0, 0, 0)
srb_l.rotation_euler = (0, 0, 0)
srb_l.scale = (1, 1, 1)
clean_nodes['srb_left'] = srb_l

# Process ICPS
if icps_root:
    icps_meshes = get_all_meshes(icps_root)
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
    
    target = poly_targets.get('icps', 1500)
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

    icps_joined.parent = None
    icps_joined.matrix_world = Matrix.Identity(4)
    icps_joined.location = (0, 0, 0)
    icps_joined.rotation_euler = (0, 0, 0)
    icps_joined.scale = (1, 1, 1)
    clean_nodes['icps'] = icps_joined

print("\n--- FINAL NODE AUDIT ---")
total_tris = 0
for name, obj in clean_nodes.items():
    bb = [Vector(corner) for corner in obj.bound_box]
    min_c = Vector((min(c[0] for c in bb), min(c[1] for c in bb), min(c[2] for c in bb)))
    max_c = Vector((max(c[0] for c in bb), max(c[1] for c in bb), max(c[2] for c in bb)))
    size = max_c - min_c
    tris = len(obj.data.polygons)
    total_tris += tris
    print(f"{name:15}: Tris={tris:6} Pos={list(obj.location)} Scale={list(obj.scale)} Min={[round(v,2) for v in min_c]} Max={[round(v,2) for v in max_c]} Size={[round(v,2) for v in size]}")

print(f"\nTOTAL MODEL TRIANGLES: {total_tris} (Budget <= 75,000)")

# Select only our clean objects
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
    export_draco_mesh_compression_enable=False,
)
print("SUCCESS!")
