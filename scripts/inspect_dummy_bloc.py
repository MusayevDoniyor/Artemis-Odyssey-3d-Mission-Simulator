import bpy

dummy_bloc = bpy.data.objects.get("Dummy_Bloc")
if dummy_bloc:
    print(f"Dummy_Bloc children ({len(dummy_bloc.children)}):")
    for child in dummy_bloc.children:
        print(f"  Child: {child.name:25} Type: {child.type:8} Children: {len(child.children):3} Loc: {[round(v, 2) for v in child.location]} Scale: {[round(v, 3) for v in child.scale]}")
