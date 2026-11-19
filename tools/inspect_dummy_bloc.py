import bpy
from mathutils import Vector

dummy_bloc = bpy.data.objects.get('Dummy_Bloc')
if not dummy_bloc:
    print("Dummy_Bloc not found!")
    sys.exit(1)

def get_hierarchy_stats(root_obj):
    all_objs = []
    def collect(o):
        all_objs.append(o)
        for c in o.children:
            collect(c)
    collect(root_obj)
    
    verts = 0
    polys = 0
    min_c = [float('inf')] * 3
    max_c = [float('-inf')] * 3
    mesh_count = 0
    
    for o in all_objs:
        if o.type == 'MESH':
            mesh_count += 1
            verts += len(o.data.vertices)
            polys += len(o.data.polygons)
            for corner in o.bound_box:
                wc = o.matrix_world @ Vector(corner)
                for i in range(3):
                    min_c[i] = min(min_c[i], wc[i])
                    max_c[i] = max(max_c[i], wc[i])
    
    dims = [max_c[i] - min_c[i] if max_c[i] != float('-inf') else 0 for i in range(3)]
    return {
        'name': root_obj.name,
        'meshes': mesh_count,
        'verts': verts,
        'polys': polys,
        'min': min_c,
        'max': max_c,
        'dims': dims
    }

print("=== CHILDREN OF DUMMY_BLOC ===")
overall_min = [float('inf')] * 3
overall_max = [float('-inf')] * 3

for child in dummy_bloc.children:
    stats = get_hierarchy_stats(child)
    print(f"\nGroup: {stats['name']}")
    print(f"   Meshes: {stats['meshes']}, Polys: {stats['polys']}, Verts: {stats['verts']}")
    print(f"   Dimensions (X, Y, Z): {[round(d, 3) for d in stats['dims']]}")
    print(f"   Min: {[round(c, 3) for c in stats['min']]}, Max: {[round(c, 3) for c in stats['max']]}")
    for i in range(3):
        if stats['min'][i] != float('inf'):
            overall_min[i] = min(overall_min[i], stats['min'][i])
            overall_max[i] = max(overall_max[i], stats['max'][i])

print("\n=== TOTAL SLS ROCKET UNDER DUMMY_BLOC ===")
overall_dims = [overall_max[i] - overall_min[i] for i in range(3)]
print(f"Overall Min: {[round(c, 3) for c in overall_min]}")
print(f"Overall Max: {[round(c, 3) for c in overall_max]}")
print(f"Overall Dimensions (X, Y, Z): {[round(d, 3) for d in overall_dims]} meters")
