import json
import os
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


BBOX = {
    "south": 52.3555,
    "west": 4.878,
    "north": 52.361,
    "east": 4.889,
}

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

RAW_OUT = Path("data/raw/osm/amsterdam-museumplein/overpass-ground.json")
RAW_XML_OUT = Path("data/raw/osm/amsterdam-museumplein/osm-map.xml")
GEOJSON_OUT = Path("public/city/amsterdam-museumplein/layers/ground-layers.geojson")

HIGHWAY_WIDTH = {
    "primary": 14,
    "secondary": 12,
    "tertiary": 10,
    "residential": 7,
    "service": 5,
    "unclassified": 7,
    "pedestrian": 5,
    "footway": 3,
    "path": 3,
    "cycleway": 3,
    "steps": 2,
}


def overpass_query():
    bbox = f'{BBOX["south"]},{BBOX["west"]},{BBOX["north"]},{BBOX["east"]}'
    return f"""
[out:json][timeout:90];
(
  way["highway"]({bbox});
  way["landuse"]({bbox});
  way["leisure"]({bbox});
  way["natural"]({bbox});
  way["waterway"]({bbox});
  way["amenity"~"parking|marketplace|fountain"]({bbox});
  way["tourism"]({bbox});
  way["place"="square"]({bbox});
);
out tags geom;
"""


def category_queries():
    bbox = f'{BBOX["south"]},{BBOX["west"]},{BBOX["north"]},{BBOX["east"]}'
    selectors = [
        'way["highway"]',
        'way["landuse"]',
        'way["leisure"]',
        'way["natural"]',
        'way["waterway"]',
        'way["amenity"~"parking|marketplace|fountain"]',
        'way["tourism"]',
        'way["place"="square"]',
    ]
    return [f'[out:json][timeout:45];{selector}({bbox});out tags geom qt;' for selector in selectors]


def fetch_query(query):
    payload = urllib.parse.urlencode({"data": query}).encode("utf-8")
    last_error = None

    for url in OVERPASS_URLS:
        try:
            request = urllib.request.Request(url, data=payload, headers={"User-Agent": "web3d-project-local-data-prep/1.0"})
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as error:
            last_error = error
            print(f"Overpass endpoint failed: {url}: {error}", file=sys.stderr)

    raise RuntimeError(f"All Overpass endpoints failed: {last_error}")


def fetch_overpass():
    merged = {"version": 0.6, "generator": "web3d-project-local-data-prep", "elements": []}
    seen = set()

    for query in category_queries():
        payload = fetch_query(query)
        for element in payload.get("elements", []):
            key = (element.get("type"), element.get("id"))
            if key in seen:
                continue
            seen.add(key)
            merged["elements"].append(element)

    return merged


def fetch_osm_xml():
    url = (
        "https://api.openstreetmap.org/api/0.6/map?"
        f'bbox={BBOX["west"]},{BBOX["south"]},{BBOX["east"]},{BBOX["north"]}'
    )
    request = urllib.request.Request(url, headers={"User-Agent": "web3d-project-local-data-prep/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def parse_osm_xml(xml_bytes):
    root = ET.fromstring(xml_bytes)
    nodes = {}
    for node in root.findall("node"):
        nodes[node.attrib["id"]] = {
            "lon": float(node.attrib["lon"]),
            "lat": float(node.attrib["lat"]),
        }

    elements = []
    for way in root.findall("way"):
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
        geometry = []
        for nd in way.findall("nd"):
            node = nodes.get(nd.attrib["ref"])
            if node:
                geometry.append(node)
        elements.append({
            "type": "way",
            "id": int(way.attrib["id"]),
            "tags": tags,
            "geometry": geometry,
        })

    return {"version": 0.6, "generator": "openstreetmap-map-api", "elements": elements}


def is_closed(coords):
    return len(coords) >= 4 and coords[0] == coords[-1]


def classify(tags, closed):
    highway = tags.get("highway")
    landuse = tags.get("landuse")
    leisure = tags.get("leisure")
    natural = tags.get("natural")
    waterway = tags.get("waterway")
    amenity = tags.get("amenity")
    place = tags.get("place")

    if natural in {"water", "bay"} or waterway in {"canal", "river", "stream"}:
        return "water"
    if leisure in {"park", "garden"} or landuse in {"grass", "meadow", "forest", "recreation_ground", "village_green"}:
        return "park"
    if place == "square" or amenity in {"marketplace", "fountain"}:
        return "plaza"
    if highway in {"pedestrian"} and closed:
        return "plaza"
    if highway in {"footway", "path", "cycleway", "steps"}:
        return "path"
    if highway:
        return "road"
    if landuse in {"commercial", "retail", "institutional"}:
        return "plaza"
    return None


def feature_from_way(element):
    tags = element.get("tags", {})
    geometry = element.get("geometry") or []
    coords = [[point["lon"], point["lat"]] for point in geometry if "lon" in point and "lat" in point]
    if len(coords) < 2:
        return None

    closed = is_closed(coords)
    kind = classify(tags, closed)
    if not kind:
        return None

    highway = tags.get("highway")
    name = tags.get("name") or tags.get("name:en") or tags.get("description") or kind
    properties = {
        "id": f"osm-way-{element['id']}",
        "kind": kind,
        "name": name,
        "source": "OpenStreetMap",
        "osmId": element["id"],
    }
    if highway:
        properties["highway"] = highway
        properties["width"] = HIGHWAY_WIDTH.get(highway, 6)

    if closed and kind not in {"road", "path"}:
        return {
            "type": "Feature",
            "properties": properties,
            "geometry": {"type": "Polygon", "coordinates": [coords]},
        }

    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {"type": "LineString", "coordinates": coords},
    }


def priority(feature):
    order = {"water": 0, "park": 1, "plaza": 2, "road": 3, "path": 4}
    return order.get(feature["properties"].get("kind"), 9)


def main():
    RAW_OUT.parent.mkdir(parents=True, exist_ok=True)
    GEOJSON_OUT.parent.mkdir(parents=True, exist_ok=True)

    xml_bytes = fetch_osm_xml()
    RAW_XML_OUT.write_bytes(xml_bytes)
    payload = parse_osm_xml(xml_bytes)
    RAW_OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    features = []
    seen = set()
    for element in payload.get("elements", []):
        if element.get("type") != "way":
            continue
        feature = feature_from_way(element)
        if not feature:
            continue
        feature_id = feature["properties"]["id"]
        if feature_id in seen:
            continue
        seen.add(feature_id)
        features.append(feature)

    features.sort(key=priority)
    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "OpenStreetMap via Overpass API",
            "bbox": BBOX,
            "note": "Downloaded once for local static use in the Amsterdam Museumplein VR experiment."
        },
        "features": features,
    }
    GEOJSON_OUT.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
    print(f"wrote {len(features)} features -> {GEOJSON_OUT}")


if __name__ == "__main__":
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy:
        print(f"using proxy {proxy}")
    main()
