import bpy

srb_r = bpy.data.objects.get("Dummy_SRB0")
srb_l = bpy.data.objects.get("Dummy_SRB_")

print("SRB Right children:")
for c in srb_r.children:
    print(f"  {c.name}: type={c.type}, loc={[round(v,2) for v in c.location]}, scale={[round(v,3) for v in c.scale]}, dim={[round(v,2) for v in c.dimensions]}")
    for gc in c.children:
        print(f"    {gc.name}: type={gc.type}, loc={[round(v,2) for v in gc.location]}, scale={[round(v,3) for v in gc.scale]}")

print("\nSRB Left children:")
for c in srb_l.children:
    print(f"  {c.name}: type={c.type}, loc={[round(v,2) for v in c.location]}, scale={[round(v,3) for v in c.scale]}, dim={[round(v,2) for v in c.dimensions]}")
    for gc in c.children:
        print(f"    {gc.name}: type={gc.type}, loc={[round(v,2) for v in gc.location]}, scale={[round(v,3) for v in gc.scale]}")
