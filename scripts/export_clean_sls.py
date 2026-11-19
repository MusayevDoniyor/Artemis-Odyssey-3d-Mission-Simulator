import bpy
import mathutils

print("\n" + "=" * 60)
print("EXPORTING CLEAN NASA SLS BLOCK 1 MODEL")
print("=" * 60)

# Deselect everything
bpy.ops.object.select_all(action='DESELECT')

# Helper function to get all mesh descendants of an object
def get_mesh_descendants(obj):
    meshes = []
    if obj.type == 'MESH':
        meshes.append(obj)
    for child in obj.children:
        meshes.extend(get_mesh_descendants(child))
    return meshes

dummy_bloc = bpy.data.objects.get("Dummy_Bloc")
icps_root = bpy.data.objects.get("ICPS_2015_")

if not dummy_bloc:
    raise RuntimeError("Dummy_Bloc not found in blend file!")

# Mapping of required nodes
node_definitions = {
    'core_stage': ['Dummy_Core', 'Dummy_LVSA'],
    'rs25_engines': ['Dummy_Engs'],
    'srb_right': ['Dummy_SRB0'],
    'srb_left': ['Dummy_SRB_'],
    'orion_las': ['Dummy_ESM_', 'Dummy_MPCV', 'Dummy_Orio', 'Dummy146', 'Dummy_NewS'],
}

created_nodes = {}

# Make sure we are in object mode
if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

for node_name, child_names in node_definitions.items():
    mesh_objects = []
    for c_name in child_names:
        child = bpy.data.objects.get(c_name)
        if child:
            mesh_objects.extend(get_mesh_descendants(child))
    
    print(f"Node '{node_name}': found {len(mesh_objects)} mesh objects")
    
    if not mesh_objects:
        continue
    
    # Duplicate and join meshes into a single clean mesh
    bpy.ops.object.select_all(action='DESELECT')
    for m in mesh_objects:
        # Create a copy so we don't destroy original
        new_obj = m.copy()
        new_obj.data = m.data.copy()
        bpy.context.collection.objects.link(new_obj)
        new_obj.select_set(True)
    
    # Active object for joining
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
    
    # Apply all visual transforms to copies
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Join into one object
    bpy.ops.object.join()
    joined_obj = bpy.context.view_layer.objects.active
    joined_obj.name = node_name
    
    # Clean up mesh: recalculate outside normals
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    created_nodes[node_name] = joined_obj

# ICPS
if icps_root:
    icps_meshes = get_mesh_descendants(icps_root)
    print(f"Node 'icps': found {len(icps_meshes)} mesh objects")
    bpy.ops.object.select_all(action='DESELECT')
    for m in icps_meshes:
        new_obj = m.copy()
        new_obj.data = m.data.copy()
        bpy.context.collection.objects.link(new_obj)
        new_obj.select_set(True)
    
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    icps_obj = bpy.context.view_layer.objects.active
    icps_obj.name = 'icps'
    
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    created_nodes['icps'] = icps_obj

# Now check dimensions and triangles
total_tris = 0
for name, obj in created_nodes.items():
    tris = len(obj.data.polygons)
    total_tris += tris
    print(f"Joined {name:15}: Triangles={tris:6}, Dim={[round(d, 2) for d in obj.dimensions]}")

print(f"Total un-decimated triangles: {total_tris}")

# Decimate to hero budget <= 75,000 triangles total
target_total = 70000
ratio = min(1.0, target_total / total_tris) if total_tris > target_total else 1.0
print(f"Decimation ratio: {ratio:.4f}")

for name, obj in created_nodes.items():
    if ratio < 1.0:
        mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="Decimate")
    print(f"Final {name:15}: Triangles={len(obj.data.polygons):6}, Loc={[round(v, 2) for v in obj.location]} Scale={[round(v, 3) for v in obj.scale]}")

# Select only our 6 created nodes
bpy.ops.object.select_all(action='DESELECT')
for obj in created_nodes.values():
    obj.select_set(True)

out_glb = r"./public\assets\rockets\sls_block1.glb"
print(f"\nExporting to {out_glb}...")

# Export glTF
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

print("Export completed successfully!")
