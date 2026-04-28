# Amsterdam Museumplein VR Lab

This experiment is isolated from the Italy guide and is mounted at:

```txt
http://127.0.0.1:5173/#/amsterdam-vr
```

Runtime data lives in:

```txt
public/city/amsterdam-museumplein/
```

## Data Files

- `manifest.json`: entry point for local city data.
- `pois.json`: curated Museumplein POI anchors.
- `layers/ground-layers.geojson`: OSM-derived roads, paths, parks, plazas, and water.
- `routes/museumplein-loop.geojson`: first hand-authored walking route.
- `tiles/building-tiles.json`: GLB tile manifest.
- `tiles/*.glb`: converted 3DBAG building tiles.

## Coordinate Alignment

Buildings and ground layers come from different coordinate systems:

- 3DBAG buildings: EPSG:28992.
- OSM ground layers and POIs: EPSG:4326.

The building conversion script reads the manifest center and uses `pyproj` to project it into EPSG:28992. Both data sources are then rendered as local meters around the same Museumplein center.

## Data Prep Scripts

See:

```txt
tools/amsterdam-vr/
```

Useful commands:

```powershell
C:\Users\33549\.conda\envs\web3d-backend\python.exe .\tools\amsterdam-vr\convert_cityjson_to_glb.py
```

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
C:\Users\33549\.conda\envs\web3d-backend\python.exe .\tools\amsterdam-vr\fetch_osm_ground_layers.py
```
