import bpy

print("=" * 60)
print("INSPECTING NASA SLS BLEND FILE")
print("=" * 60)

for obj in bpy.data.objects:
    print(f"Name: {obj.name:30} Type: {obj.type:8} Parent: {obj.parent.name if obj.parent else 'None':20} Loc: {[round(v, 2) for v in obj.location]} Scale: {[round(v, 3) for v in obj.scale]} Dim: {[round(v, 2) for v in obj.dimensions]}")
