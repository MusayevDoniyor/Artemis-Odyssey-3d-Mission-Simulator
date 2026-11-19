import bpy
from mathutils import Vector

print("=== INSPECTING SLS BLOCK 1 BLEND HIERARCHY ===")

top_level_objects = [obj for obj in bpy.data.objects if obj.parent is None]
print(f"Top level root objects ({len(top_level_objects)}):")
for obj in top_level_objects:
    print(f"Root: '{obj.name}' (type: {obj.type})")

min_coord = [float('inf')] * 3
max_coord = [float('-inf')] * 3
total_polys = 0

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        total_polys += len(obj.data.polygons)
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            for i in range(3):
                min_coord[i] = min(min_coord[i], world_corner[i])
                max_coord[i] = max(max_coord[i], world_corner[i])

print("\n--- OVERALL BOUNDING BOX (meters) ---")
print(f"Min: {min_coord}")
print(f"Max: {max_coord}")
dims = [max_coord[i] - min_coord[i] for i in range(3)]
print(f"Dimensions (X, Y, Z): {dims}")
print(f"Total Polygons/Triangles: {total_polys}")

# Print direct children of top roots to see major components
print("\n--- FIRST LEVEL SUB-GROUPS ---")
for root in top_level_objects:
    children = [c for c in bpy.data.objects if c.parent == root]
    print(f"Children of '{root.name}' ({len(children)}): {[c.name for c in children[:15]]}")
