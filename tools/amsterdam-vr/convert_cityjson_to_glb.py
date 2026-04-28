import argparse
import gzip
import json
from pathlib import Path

import numpy as np
import trimesh
from pyproj import Transformer


DEFAULT_MANIFEST = Path("public/city/amsterdam-museumplein/manifest.json")


def load_cityjson(path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as handle:
        return json.load(handle)


def transform_vertices(data, origin):
    scale = data.get("transform", {}).get("scale", [1, 1, 1])
    translate = data.get("transform", {}).get("translate", [0, 0, 0])
    raw = np.asarray(data.get("vertices", []), dtype=np.float64)
    coords = raw * np.asarray(scale) + np.asarray(translate)
    min_z = float(np.min(coords[:, 2])) if len(coords) else 0

    vertices = np.empty_like(coords)
    vertices[:, 0] = coords[:, 0] - origin[0]
    vertices[:, 1] = coords[:, 2] - min_z
    vertices[:, 2] = -(coords[:, 1] - origin[1])
    return vertices


def rings_from_geometry(geometry):
    gtype = geometry.get("type")
    boundaries = geometry.get("boundaries", [])

    if gtype == "MultiSurface":
        for surface in boundaries:
            yield surface
    elif gtype == "Solid":
        for shell in boundaries:
            for surface in shell:
                yield surface
    elif gtype == "MultiSolid":
        for solid in boundaries:
            for shell in solid:
                for surface in shell:
                    yield surface


def triangulate_ring(ring):
    # CityJSON surfaces can include holes. For this POC we keep the outer ring
    # only and fan-triangulate it, which is enough for a quick massing preview.
    if len(ring) < 3:
        return []
    return [[ring[0], ring[index], ring[index + 1]] for index in range(1, len(ring) - 1)]


def rd_origin_from_manifest(manifest_path):
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    center = manifest["center"]
    transformer = Transformer.from_crs("EPSG:4326", "EPSG:28992", always_xy=True)
    return transformer.transform(center["lon"], center["lat"])


def convert_file(src, dst, lod, origin):
    data = load_cityjson(src)
    vertices = transform_vertices(data, origin)
    faces = []

    for city_object in data.get("CityObjects", {}).values():
        if city_object.get("type") not in {"Building", "BuildingPart"}:
            continue
        for geometry in city_object.get("geometry", []):
            if str(geometry.get("lod")) != lod:
                continue
            for surface in rings_from_geometry(geometry):
                if not surface:
                    continue
                faces.extend(triangulate_ring(surface[0]))

    if not faces:
        return False

    mesh = trimesh.Trimesh(vertices=vertices, faces=np.asarray(faces), process=False)
    mesh.visual.material = trimesh.visual.material.PBRMaterial(
        name="3DBAG Museumplein buildings",
        baseColorFactor=[0.72, 0.77, 0.72, 1.0],
        roughnessFactor=0.82,
        metallicFactor=0.0,
    )
    dst.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(dst)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default="data/raw/3dbag/museumplein/cityjson")
    parser.add_argument("--out", default="public/city/amsterdam-museumplein/tiles")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--lod", default="1.2")
    args = parser.parse_args()

    src_dir = Path(args.src)
    out_dir = Path(args.out)
    origin = rd_origin_from_manifest(args.manifest)
    entries = []
    print(f"using RD origin x={origin[0]:.3f}, y={origin[1]:.3f}")

    for src in sorted(src_dir.glob("*.city.json.gz")):
        tile_id = src.name.replace(".city.json.gz", "")
        dst = out_dir / f"{tile_id}.glb"
        if convert_file(src, dst, args.lod, origin):
            entries.append({
                "id": tile_id,
                "url": f"/city/amsterdam-museumplein/tiles/{dst.name}",
                "position": [0, 0, 0],
                "rotation": [0, 0, 0],
                "scale": 1,
            })
            print(f"converted {src.name} -> {dst.name}")
        else:
            print(f"skipped {src.name}: no LoD {args.lod} faces")

    manifest = {
        "source": f"3DBAG CityJSON converted locally at LoD {args.lod}",
        "tiles": entries,
    }
    (out_dir / "building-tiles.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {len(entries)} tile entries")


if __name__ == "__main__":
    main()
