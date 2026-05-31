import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { currentRoute } from '../src/data/routes.js';
import { travelLandmarkMeta } from '../src/data/travelGuide.js';

const OUT_FILE = resolve('public/data/italy-route-topology.json');
const BOUNDS = { lonMin: 6.2, lonMax: 18.8, latMin: 36.4, latMax: 46.5 };
const CONTOUR_LEVELS = [0, 150, 300, 600, 900, 1200, 1600, 2100];

function osrmUrl(coords) {
  const encoded = coords.map(([lon, lat]) => `${lon},${lat}`).join(';');
  return `https://router.project-osrm.org/route/v1/driving/${encoded}?overview=full&geometries=geojson&annotations=false&steps=false`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function routeStopCoords() {
  return currentRoute.stops
    .map((id) => travelLandmarkMeta[id])
    .filter(Boolean)
    .map((meta) => [meta.lon, meta.lat]);
}

function sampleGrid(cols = 34, rows = 28) {
  const points = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lon = BOUNDS.lonMin + (BOUNDS.lonMax - BOUNDS.lonMin) * (col / (cols - 1));
      const lat = BOUNDS.latMin + (BOUNDS.latMax - BOUNDS.latMin) * (row / (rows - 1));
      points.push({ lon: Number(lon.toFixed(5)), lat: Number(lat.toFixed(5)), row, col });
    }
  }
  return { cols, rows, points };
}

function chunk(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

async function fetchElevations(points) {
  const out = [];
  for (const batch of chunk(points, 100)) {
    const payload = await fetchJson('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        locations: batch.map((point) => ({
          latitude: point.lat,
          longitude: point.lon,
        })),
      }),
    });
    const results = payload.results ?? [];
    out.push(...batch.map((point, index) => ({
      ...point,
      elevation: Math.round(results[index]?.elevation ?? 0),
    })));
  }
  return out;
}

async function fetchItalyBoundary() {
  try {
    const metadata = await fetchJson('https://www.geoboundaries.org/api/current/gbOpen/ITA/ADM0');
    const boundaryUrl = metadata.simplifiedGeometryGeoJSON ?? metadata.gjDownloadURL;
    if (!boundaryUrl) return null;
    const geojson = await fetchJson(boundaryUrl);
    const geometry = geojson.features?.[0]?.geometry ?? geojson.geometry;
    const polygons = geometry?.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
    return polygons
      .map((polygon) => polygon[0] ?? [])
      .filter((ring) => ring.length > 3)
      .map((ring) => ring.map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]));
  } catch (error) {
    console.warn(`Boundary download skipped: ${error.message}`);
    return null;
  }
}

function interpolate(a, b, level) {
  const range = b.elevation - a.elevation;
  const t = Math.abs(range) < 0.001 ? 0.5 : (level - a.elevation) / range;
  return {
    lon: Number((a.lon + (b.lon - a.lon) * t).toFixed(5)),
    lat: Number((a.lat + (b.lat - a.lat) * t).toFixed(5)),
  };
}

function contoursFromGrid(grid, level) {
  const byCell = new Map(grid.points.map((point) => [`${point.row}:${point.col}`, point]));
  const lines = [];
  for (let row = 0; row < grid.rows - 1; row += 1) {
    for (let col = 0; col < grid.cols - 1; col += 1) {
      const nw = byCell.get(`${row}:${col}`);
      const ne = byCell.get(`${row}:${col + 1}`);
      const se = byCell.get(`${row + 1}:${col + 1}`);
      const sw = byCell.get(`${row + 1}:${col}`);
      const crossings = [];
      if ((nw.elevation < level) !== (ne.elevation < level)) crossings.push(interpolate(nw, ne, level));
      if ((ne.elevation < level) !== (se.elevation < level)) crossings.push(interpolate(ne, se, level));
      if ((se.elevation < level) !== (sw.elevation < level)) crossings.push(interpolate(se, sw, level));
      if ((sw.elevation < level) !== (nw.elevation < level)) crossings.push(interpolate(sw, nw, level));
      if (crossings.length === 2) lines.push(crossings);
      if (crossings.length === 4) {
        lines.push([crossings[0], crossings[1]]);
        lines.push([crossings[2], crossings[3]]);
      }
    }
  }
  return lines;
}

async function main() {
  const stops = routeStopCoords();
  const osrm = await fetchJson(osrmUrl(stops));
  const route = osrm.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error('OSRM returned no route geometry');

  const grid = sampleGrid();
  const boundary = await fetchItalyBoundary();
  const elevatedGridPoints = await fetchElevations(grid.points);
  const elevatedGrid = { ...grid, points: elevatedGridPoints };
  const contours = CONTOUR_LEVELS.map((level) => ({
    level,
    lines: contoursFromGrid(elevatedGrid, level),
  }));

  const routeSamplePoints = route.geometry.coordinates
    .filter((_, index) => index % Math.max(1, Math.floor(route.geometry.coordinates.length / 90)) === 0)
    .slice(0, 100)
    .map(([lon, lat]) => ({ lon, lat }));
  const routeElevation = await fetchElevations(routeSamplePoints);

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: {
      route: 'OSRM public demo server',
      elevation: 'Open-Elevation public API',
    },
    bounds: BOUNDS,
    map: {
      boundary,
    },
    route: {
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      durationHours: Number((route.duration / 3600).toFixed(2)),
      coordinates: route.geometry.coordinates.map(([lon, lat]) => [Number(lon.toFixed(6)), Number(lat.toFixed(6))]),
      elevationSamples: routeElevation,
    },
    terrain: {
      cols: elevatedGrid.cols,
      rows: elevatedGrid.rows,
      points: elevatedGrid.points,
      contours,
    },
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`${payload.route.coordinates.length} route points, ${payload.terrain.points.length} elevation points`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
