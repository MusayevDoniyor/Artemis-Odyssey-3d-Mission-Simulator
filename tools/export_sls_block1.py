import bpy
from mathutils import Vector, Matrix
import os

print("=== STARTING SLS BLOCK 1 EXPORT & DECIMATION SCRIPT ===")

# Groups to consolidate from Dummy_Bloc hierarchy
group_definitions = {
    'srb_left': ['Dummy_SRB_'],
    'srb_right': ['Dummy_SRB0'],
    'core_stage': ['Dummy_Core'],
    'rs25_engines': ['Dummy_Engs'],
    'icps': ['Dummy_LVSA', 'Dummy_ICP0'],
    'orion_las': ['Dummy146', 'Dummy_MPCV', 'Dummy_ESM_', 'Dummy_Orio', 'Dummy_NewS']
}

# Target polygon budgets per stage (sum <= 65,000, hero budget <= 75,000)
stage_poly_targets = {
    'core_stage': 18000,
    'srb_left': 11000,
    'srb_right': 11000,
    'rs25_engines': 6000,
    'icps': 6000,
    'orion_las': 10000
}

consolidated_objects = {}

# Ensure in object mode
if bpy.ops.object.mode_set.poll():
    bpy.ops.object.mode_set(mode='OBJECT')

for stage_name, group_roots in group_definitions.items():
    print(f"\nProcessing stage: {stage_name}...")
    mesh_objs = []
    
    for root_name in group_roots:
        root = bpy.data.objects.get(root_name)
        if not root:
            continue
        
        def collect_meshes(o):
            if o.type == 'MESH':
                mesh_objs.append(o)
            for c in o.children:
                collect_meshes(c)
        collect_meshes(root)
    
    print(f"Found {len(mesh_objs)} meshes for {stage_name}")
    if not mesh_objs:
        continue
    
    # Duplicate and preserve world transformation
    bpy.ops.object.select_all(action='DESELECT')
    cloned_meshes = []
    for m in mesh_objs:
        m_copy = m.copy()
        m_copy.data = m.data.copy()
        m_copy.matrix_world = m.matrix_world
        bpy.context.collection.objects.link(m_copy)
        cloned_meshes.append(m_copy)
        m_copy.select_set(True)
    
    bpy.context.view_layer.objects.active = cloned_meshes[0]
    bpy.ops.object.join()
    joined_obj = bpy.context.view_layer.objects.active
    joined_obj.name = stage_name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    initial_polys = len(joined_obj.data.polygons)
    target = stage_poly_targets.get(stage_name, 10000)
    print(f"Joined {stage_name}: initial polys = {initial_polys}, target = {target}")
    
    if initial_polys > target:
        ratio = target / initial_polys
        decimate_mod = joined_obj.modifiers.new(name="Decimate", type='DECIMATE')
        decimate_mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier="Decimate")
        final_polys = len(joined_obj.data.polygons)
        print(f"Decimated {stage_name} to {final_polys} polys (ratio {ratio:.4f})")
    else:
        final_polys = initial_polys
    
    bbox = [joined_obj.matrix_world @ Vector(pt) for pt in joined_obj.bound_box]
    min_c = [min(pt[i] for pt in bbox) for i in range(3)]
    max_c = [max(pt[i] for pt in bbox) for i in range(3)]
    dims = [max_c[i] - min_c[i] for i in range(3)]
    print(f"  Stage {stage_name} bounds: dims={dims}, min={min_c}, max={max_c}")
    
    consolidated_objects[stage_name] = joined_obj

# Deselect all except our consolidated objects
bpy.ops.object.select_all(action='DESELECT')
total_export_polys = 0
for stage_name, obj in consolidated_objects.items():
    obj.select_set(True)
    polys = len(obj.data.polygons)
    total_export_polys += polys
    print(f"Selected for export: '{stage_name}' with {polys} polys")

print(f"\nTOTAL EXPORT TRIANGLES/POLYS: {total_export_polys} (Budget <= 75,000)")

out_dir = r"./public\assets\rockets"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "sls_block1.glb")

print(f"Exporting GLTF to {out_path}...")
bpy.ops.export_scene.gltf(
    filepath=out_path,
    use_selection=True,
    export_format='GLB',
    export_apply=True,
    export_draco_mesh_compression_enable=True
)

print(f"SUCCESS: Exported SLS Block 1 to {out_path}")
print(f"File size: {os.path.getsize(out_path)} bytes")
