import bpy
import os
import mathutils
import re

OUT_BASE = r"E:\X Flight\Surgery\Trees Terrains\assets\extracted"
SRC_BASE = r"E:\X Flight\Surgery\#d"

def get_descendants(obj):
    desc = [obj]
    for c in obj.children:
        desc.extend(get_descendants(c))
    return desc

def export_single_mesh_draco(root_obj_or_objs, out_path, model_name=None):
    if isinstance(root_obj_or_objs, list):
        target_objs = root_obj_or_objs
    else:
        target_objs = get_descendants(root_obj_or_objs)
        
    mesh_objs = [o for o in target_objs if o.type == 'MESH']
    if not mesh_objs:
        return False
        
    # Duplicate only mesh objects
    bpy.ops.object.select_all(action='DESELECT')
    for m in mesh_objs:
        m.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objs[0]
    bpy.ops.object.duplicate()
    dup_meshes = bpy.context.selected_objects
    
    # Bake transforms and standardize UVMap
    for m in dup_meshes:
        m.parent = None
        bpy.context.view_layer.objects.active = m
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if m.data.uv_layers:
            m.data.uv_layers.active.name = "UVMap"
            while len(m.data.uv_layers) > 1:
                m.data.uv_layers.remove(m.data.uv_layers[-1])
        
    # Join into single mesh
    bpy.ops.object.select_all(action='DESELECT')
    for m in dup_meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = dup_meshes[0]
    bpy.ops.object.join()
    single_mesh = bpy.context.active_object
    
    if model_name:
        single_mesh.name = model_name
        if single_mesh.data:
            single_mesh.data.name = model_name
            
    # Compute bounding box
    all_xs = [v.co.x for v in single_mesh.data.vertices]
    all_ys = [v.co.y for v in single_mesh.data.vertices]
    all_zs = [v.co.z for v in single_mesh.data.vertices]
    if not all_xs:
        bpy.ops.object.delete()
        return False
        
    min_x, max_x = min(all_xs), max(all_xs)
    min_y, max_y = min(all_ys), max(all_ys)
    min_z = min(all_zs)
    center_offset = mathutils.Vector(((min_x + max_x) / 2.0, (min_y + max_y) / 2.0, min_z))
    
    for v in single_mesh.data.vertices:
        v.co -= center_offset
        
    # Safeguard 1: Remove black or uninitialized vertex colors
    for col_attr in list(single_mesh.data.color_attributes):
        is_all_black = True
        for d in col_attr.data:
            c = d.color
            if (c[0] + c[1] + c[2]) > 0.05:
                is_all_black = False
                break
        if is_all_black:
            single_mesh.data.color_attributes.remove(col_attr)
            
    # Safeguard 2: Prevent black PBR shading
    for mat in single_mesh.data.materials:
        if mat and mat.node_tree:
            for n in mat.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    if 'Metallic' in n.inputs and n.inputs['Metallic'].default_value > 0.3:
                        if not any(k in mat.name.lower() for k in ['metal', 'iron', 'gold', 'silver', 'steel']):
                            n.inputs['Metallic'].default_value = 0.0
                    if 'Roughness' in n.inputs and n.inputs['Roughness'].default_value < 0.2:
                        n.inputs['Roughness'].default_value = 0.6
                        
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_image_format='AUTO',
        export_image_quality=80
    )
    print(f"Exported: {out_path} ({os.path.getsize(out_path)} bytes)")
    bpy.ops.object.delete()
    return True

# ==================== 1. 4 HOUSES FANTASY ====================
print("\n=== 1. 4 HOUSES FANTASY ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "4_houses_fantasy_village.glb"))
houses_4 = {
    "fantasy_house_orange_roof": "Cube.017_6",
    "fantasy_tower_teal": "Cylinder_4",
    "fantasy_house_tall_timber": "Cube.032_8",
    "fantasy_house_round_mushroom": "Sphere.001_7"
}
for label, o_name in houses_4.items():
    o = bpy.data.objects.get(o_name)
    if o:
        export_single_mesh_draco(o, os.path.join(OUT_BASE, "4_houses_fantasy", f"{label}.glb"), label)

# ==================== 2. GERMAN VILLAGE ====================
print("\n=== 2. GERMAN VILLAGE ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "german_style_village.glb"))
german_models = {
    "german_house_1": "casa1",
    "german_house_2": "casa2",
    "german_house_4": "casa4",
    "german_house_5": "casa5",
    "german_house_6": "casa6",
    "german_lighthouse": "faro"
}
for label, o_name in german_models.items():
    o = bpy.data.objects.get(o_name)
    if o:
        export_single_mesh_draco(o, os.path.join(OUT_BASE, "german_village", f"{label}.glb"), label)

# ==================== 3. GREEK SCULPTOR ====================
print("\n=== 3. GREEK SCULPTOR ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "dae_villages__greek_sculptor_house.glb"))
hm = bpy.data.objects.get("ambientLight4_HouseTEX_0")
vm = bpy.data.objects.get("ambientLight4_VegetationTEX_0")
if hm:
    export_single_mesh_draco(hm, os.path.join(OUT_BASE, "greek_sculptor", "greek_sculptor_house.glb"), "greek_sculptor_house")
if vm:
    export_single_mesh_draco(vm, os.path.join(OUT_BASE, "greek_sculptor", "greek_sculptor_cypress_trees.glb"), "greek_sculptor_cypress_trees")
if hm and vm:
    export_single_mesh_draco([hm, vm], os.path.join(OUT_BASE, "greek_sculptor", "greek_sculptor_house_with_trees.glb"), "greek_sculptor_house_with_trees")

# ==================== 4. VILLAGE PACK ====================
print("\n=== 4. VILLAGE PACK ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "village_pack.glb"))
rn = bpy.data.objects.get("RootNode")
if rn:
    for c in rn.children:
        clean = c.name.replace(" ", "_")
        export_single_mesh_draco(c, os.path.join(OUT_BASE, "village_pack", f"{clean}.glb"), clean)

# ==================== 5. SIMPLE LOW POLY ====================
print("\n=== 5. SIMPLE LOW POLY ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "simple_low_poly_village_buildings.glb"))
rn = bpy.data.objects.get("RootNode")
if rn:
    for c in rn.children:
        clean = c.name.replace(" ", "_")
        export_single_mesh_draco(c, os.path.join(OUT_BASE, "simple_low_poly", f"{clean}.glb"), clean)

# ==================== 6. VILLAGE TOWN ASSETS ====================
print("\n=== 6. VILLAGE TOWN ASSETS ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "village__town_assets.glb"))
rn = bpy.data.objects.get("RootNode")
if rn:
    seen = set()
    for c in rn.children:
        cat = re.sub(r'[\._]\d+.*$', '', c.name)
        if cat in ["World", "Plane", "Cube", "Cylinder", "Sphere"]:
            continue
        if cat not in seen:
            seen.add(cat)
            clean = cat.replace(" ", "_").lower()
            export_single_mesh_draco(c, os.path.join(OUT_BASE, "village_town", f"{clean}.glb"), clean)

# ==================== 7. CASTLE TOWN ====================
print("\n=== 7. CASTLE TOWN ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "castle_town.glb"))
bp1 = bpy.data.objects.get("boardPieces_1")
if bp1:
    seen = set()
    for c in bp1.children:
        cat = c.name.split("_")[0].replace("ps.", "").replace("medieval002.", "").replace(" ", "_").lower()
        if cat not in seen:
            seen.add(cat)
            export_single_mesh_draco(c, os.path.join(OUT_BASE, "castle_town", f"{cat}.glb"), cat)

# ==================== 8. LITTLE VILLAGE ====================
print("\n=== 8. LITTLE VILLAGE ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "little_village.glb"))
for o in bpy.data.objects:
    if any(k in o.name.lower() for k in ["house", "muehle", "windmill"]):
        if o.parent and ("house" in o.parent.name.lower() or "windmill" in o.parent.name.lower()):
            continue
        clean = re.sub(r'[\._]\d+.*$', '', o.name.replace(" ", "_").lower())
        export_single_mesh_draco(o, os.path.join(OUT_BASE, "little_village", f"{clean}.glb"), clean)

# ==================== 9. FREE MEDIEVAL ====================
print("\n=== 9. FREE MEDIEVAL ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC_BASE, "free_medieval_village_low_poly_npr_pack.glb"))
root = bpy.data.objects.get("Sketchfab_model")
if root:
    candidates = []
    def find_p(o):
        if any(c.type == 'MESH' for c in o.children) or o.type == 'MESH':
            candidates.append(o)
        for c in o.children:
            if c.type != 'MESH':
                find_p(c)
    find_p(root)
    seen = set()
    for obj in candidates:
        if obj.parent and obj.parent in candidates:
            continue
        cat = re.sub(r'[\._]\d+.*$', '', obj.name).replace(" ", "_").lower()
        if cat not in seen and not cat.startswith("sketchfab"):
            seen.add(cat)
            export_single_mesh_draco(obj, os.path.join(OUT_BASE, "free_medieval", f"{cat}.glb"), cat)

# ==================== 10. WINTER CASTLE ====================
print("\n=== 10. WINTER CASTLE ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
winter_path = os.path.join(SRC_BASE, "low_poly_winter_medieval_castle_and_town_pack.glb")
if os.path.exists(winter_path):
    bpy.ops.import_scene.gltf(filepath=winter_path)
    for o in bpy.data.objects:
        if o.parent and o.parent.name == "RootNode":
            clean = o.name.replace(" ", "_").lower()
            export_single_mesh_draco(o, os.path.join(OUT_BASE, "winter_castle", f"{clean}.glb"), clean)

# ==================== 11. ISSUM ISLAND CLEAN ====================
print("\n=== 11. ISSUM ISLAND CLEAN ===")
clean_issum_path = os.path.join(OUT_BASE, "issum_island_clean.glb")
if os.path.exists(clean_issum_path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=clean_issum_path)
    bpy.ops.export_scene.gltf(
        filepath=clean_issum_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_image_format='AUTO',
        export_image_quality=80
    )
    print(f"Compressed issum_island_clean.glb with Draco: {os.path.getsize(clean_issum_path)} bytes")

print("\n=== ALL INSTANCED SINGLE-MESH ASSETS COMPLETED WITH DRACO AND COLOR PRESERVATION! ===")
