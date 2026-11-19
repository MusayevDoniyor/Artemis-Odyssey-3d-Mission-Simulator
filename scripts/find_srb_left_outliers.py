import bpy

srb_l = bpy.data.objects.get("Dummy_SRB_")
srb_r = bpy.data.objects.get("Dummy_SRB0")

def get_meshes(obj):
    res = []
    if obj.type == 'MESH':
        res.append(obj)
    for c in obj.children:
        res.extend(get_meshes(c))
    return res

l_meshes = get_meshes(srb_l)
print(f"Total meshes in Dummy_SRB_: {len(l_meshes)}")

for m in l_meshes:
    # Evaluate world bounds
    mw = m.matrix_world
    bb = [mw @ m.data.vertices[i].co for i in range(len(m.data.vertices))]
    min_x = min(v.x for v in bb)
    max_x = max(v.x for v in bb)
    min_y = min(v.y for v in bb)
    max_y = max(v.y for v in bb)
    
    # Left SRB should be centered near x = -6.2, y = 0
    # Radius is ~2.5m, so x in [-9, -3.5], y in [-3, 3]
    if min_x < -10 or max_x > -3 or min_y < -4 or max_y > 4:
        print(f"Outlier mesh in SRB Left: {m.name:25} X: [{min_x:.2f}, {max_x:.2f}] Y: [{min_y:.2f}, {max_y:.2f}] Parent: {m.parent.name if m.parent else 'None'}")
