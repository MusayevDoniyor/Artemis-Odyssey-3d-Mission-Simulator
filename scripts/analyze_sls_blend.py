import bpy

print("\n--- ROOT OBJECTS IN SLS BLEND FILE ---")
for obj in bpy.data.objects:
    if obj.parent is None:
        print(f"Root: {obj.name:30} Type: {obj.type:8} Children: {len(obj.children)} Loc: {[round(v, 2) for v in obj.location]}")

print("\n--- COLLECTIONS ---")
for col in bpy.data.collections:
    print(f"Collection: {col.name:30} Objects: {len(col.objects)}")
