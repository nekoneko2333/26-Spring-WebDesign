import { useQuery } from '@tanstack/react-query';
import { landmarks } from '../data/landmarks.js';
import { travelLandmarkMeta } from '../data/travelGuide.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const DRIVABLE_ACCESS_POINTS = {
  milan_duomo: { lon: 9.1954, lat: 45.4614 },
  venice_rialto: { lon: 12.3181, lat: 45.4379 },
  florence_duomo: { lon: 11.248, lat: 43.7765 },
  pisa: { lon: 10.3913, lat: 43.7229 },
  colosseum: { lon: 12.4923, lat: 41.8892 },
  pompeii: { lon: 14.4987, lat: 40.7497 },
};
const VENICE_ACCESS_POINT = { lon: 12.3181, lat: 45.4379 };
const landmarkCoordinates = new Map(landmarks.map((landmark) => [
  landmark.id,
  {
    lon: landmark.navigationCoordinates?.lon ?? landmark.lon,
    lat: landmark.navigationCoordinates?.lat ?? landmark.lat,
    city: landmark.location?.city?.en ?? null,
  },
]));

function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * Math.PI / 180;
  const deltaLon = (b.lon - a.lon) * Math.PI / 180;
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function routeTravelMode(from, to) {
  if (!from || !to) return 'DRIVE';
  if (from.city === 'Venice' && to.city === 'Venice') return 'WALK';
  return 'DRIVE';
}

function isAutoWalkCandidate(from, to) {
  return Boolean(
    from?.city
    && from.city === to?.city
    && haversineKm(from, to) <= 1,
  );
}

function shouldPreferWalking(walk, drive) {
  if (!walk || !drive || walk.mode === 'estimated' || drive.mode === 'estimated') return false;
  return walk.distanceKm > 0
    && walk.distanceKm <= 1
    && walk.durationHours > 0
    && drive.durationHours > 0
    && walk.durationHours <= drive.durationHours * 0.8;
}

function shouldAutoUseWalking(walk, drive) {
  if (shouldPreferWalking(walk, drive)) return true;
  if (!walk || !drive || walk.mode === 'estimated' || drive.mode === 'estimated') return false;

  const shortWalk = walk.distanceKm > 0 && walk.distanceKm <= 1.6 && walk.durationHours <= 0.4;
  const driveLoopsAround = drive.diagnostics?.excessiveDetour
    || (drive.distanceKm > 0 && walk.distanceKm > 0 && drive.distanceKm >= walk.distanceKm * 1.6);

  return shortWalk && driveLoopsAround;
}

function osrmUrl(coords, travelMode) {
  const encoded = coords.map((c) => `${c.lon},${c.lat}`).join(';');
  const baseUrl = travelMode === 'WALK'
    ? 'https://routing.openstreetmap.de/routed-foot/route/v1/driving'
    : 'https://router.project-osrm.org/route/v1/driving';
  return `${baseUrl}/${encoded}?overview=full&geometries=geojson&annotations=false&steps=false`;
}

function routeDiagnostics(distanceKm, straightKm, geometryCoordinates) {
  const detourRatio = straightKm > 0 ? distanceKm / straightKm : 1;
  const rounded = (geometryCoordinates ?? []).map(([lon, lat]) => `${lon.toFixed(3)},${lat.toFixed(3)}`);
  const overlapRatio = rounded.length ? 1 - (new Set(rounded).size / rounded.length) : 0;
  return {
    straightDistanceKm: Number(straightKm.toFixed(3)),
    detourRatio: Number(detourRatio.toFixed(2)),
    overlapRatio: Number(overlapRatio.toFixed(2)),
    excessiveDetour: detourRatio >= 3.2 || overlapRatio >= 0.28,
  };
}

function estimatedSegment(coords, travelMode) {
  const straightKm = haversineKm(coords[0], coords[coords.length - 1]);
  const multiplier = travelMode === 'WALK' ? 1.12 : straightKm <= 8 ? 1.3 : 1.18;
  const distanceKm = straightKm * multiplier;
  const speed = travelMode === 'WALK' ? 4.5 : straightKm <= 8 ? 24 : 58;
  return {
    mode: 'estimated',
    travelMode,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationHours: Number((distanceKm / speed).toFixed(2)),
    geometryCoordinates: coords.map((coord) => [coord.lon, coord.lat]),
    diagnostics: routeDiagnostics(distanceKm, straightKm, coords.map((coord) => [coord.lon, coord.lat])),
  };
}

function normalizeDurationHours(distanceKm, durationHours, travelMode) {
  const providerDuration = Number(durationHours || 0);
  if (travelMode === 'WALK') return Math.max(providerDuration, distanceKm / 4.8);
  if (distanceKm <= 8) return Math.max(providerDuration, distanceKm / 30);
  return providerDuration;
}

function dedupeGeometry(parts) {
  const geometry = [];
  parts.forEach((part) => {
    (part.geometryCoordinates ?? []).forEach((coordinate) => {
      if (geometry.length && geometry[geometry.length - 1][0] === coordinate[0] && geometry[geometry.length - 1][1] === coordinate[1]) return;
      geometry.push(coordinate);
    });
  });
  return geometry;
}

async function planLeg(coords, travelMode) {
  try {
    const backendResponse = await fetch(`${API_BASE_URL}/api/routes/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: coords, travelMode }),
    });
    if (backendResponse.ok) {
      const route = await backendResponse.json();
      if (route?.geometryCoordinates?.length) {
        const straightKm = haversineKm(coords[0], coords[coords.length - 1]);
        return {
          mode: route.provider ?? 'backend',
          travelMode: route.travelMode ?? travelMode,
          distanceKm: Number(route.distanceKm ?? 0),
          durationHours: normalizeDurationHours(
            Number(route.distanceKm ?? 0),
            Number(route.durationHours ?? 0),
            route.travelMode ?? travelMode,
          ),
          geometryCoordinates: route.geometryCoordinates,
          diagnostics: routeDiagnostics(Number(route.distanceKm ?? 0), straightKm, route.geometryCoordinates),
        };
      }
    }
  } catch {
    // Local development can run without the backend; use the public OSM router below.
  }

  const response = await fetch(
    osrmUrl(coords, travelMode),
    { headers: { accept: 'application/json' } },
  ).catch(() => null);
  if (!response?.ok) return estimatedSegment(coords, travelMode);
  const json = await response.json().catch(() => null);
  const route = json?.routes?.[0];
  if (!route) return estimatedSegment(coords, travelMode);
  const distanceKm = Number((route.distance / 1000).toFixed(2));
  const straightKm = haversineKm(coords[0], coords[coords.length - 1]);
  return {
    mode: 'osrm',
    travelMode,
    distanceKm,
    durationHours: normalizeDurationHours(distanceKm, Number((route.duration / 3600).toFixed(2)), travelMode),
    geometryCoordinates: route.geometry?.coordinates ?? [],
    diagnostics: routeDiagnostics(distanceKm, straightKm, route.geometry?.coordinates ?? []),
  };
}

async function buildMixedSegment(from, to, index, routePreference = 'AUTO') {
  const baseMode = routePreference === 'DRIVE' || routePreference === 'WALK'
    ? routePreference
    : routeTravelMode(from, to);
  const fromAccess = from.city === 'Venice' ? VENICE_ACCESS_POINT : DRIVABLE_ACCESS_POINTS[from.id];
  const toAccess = to.city === 'Venice' ? VENICE_ACCESS_POINT : DRIVABLE_ACCESS_POINTS[to.id];
  const parts = [];

  if (routePreference !== 'AUTO') {
    parts.push(await planLeg([from, to], baseMode));
  } else {
    if (baseMode === 'DRIVE' && from.city === 'Venice' && fromAccess) {
      parts.push(await planLeg([from, { ...fromAccess, city: from.city }], 'WALK'));
    }
    if (baseMode === 'DRIVE' && to.city === 'Venice' && toAccess) {
      parts.push(await planLeg([
        from.city === 'Venice' && fromAccess ? { ...fromAccess, city: from.city } : from,
        { ...toAccess, city: to.city },
      ], 'DRIVE'));
      parts.push(await planLeg([{ ...toAccess, city: to.city }, to], 'WALK'));
    } else if (baseMode === 'WALK') {
      parts.push(await planLeg([from, to], 'WALK'));
    } else if (isAutoWalkCandidate(from, to)) {
      const [drive, walk] = await Promise.all([
        planLeg([from, to], 'DRIVE'),
        planLeg([from, to], 'WALK'),
      ]);
      parts.push(shouldAutoUseWalking(walk, drive) ? walk : drive);
    } else {
      parts.push(await planLeg([
        from.city === 'Venice' && fromAccess && baseMode === 'DRIVE' ? { ...fromAccess, city: from.city } : from,
        to,
      ], baseMode));
    }
  }

  const resolvedParts = parts;
  const geometryCoordinates = dedupeGeometry(resolvedParts);
  const distanceKm = Number(resolvedParts.reduce((sum, part) => sum + Number(part.distanceKm || 0), 0).toFixed(2));
  const durationHours = Number(resolvedParts.reduce((sum, part) => sum + Number(part.durationHours || 0), 0).toFixed(2));
  return {
    index,
    fromId: from.id,
    toId: to.id,
    mode: resolvedParts.some((part) => part.mode !== resolvedParts[0]?.mode) ? 'mixed' : resolvedParts[0]?.mode ?? 'estimated',
    travelMode: resolvedParts.some((part) => part.travelMode !== resolvedParts[0]?.travelMode) ? 'MIXED' : resolvedParts[0]?.travelMode ?? baseMode,
    distanceKm,
    durationHours,
    geometryCoordinates,
    diagnostics: routeDiagnostics(distanceKm, haversineKm(from, to), geometryCoordinates),
    parts: resolvedParts,
  };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function routeOverlapDiagnostics(segments) {
  const edgeCounts = new Map();
  let edgeTotal = 0;
  segments.forEach((segment) => {
    const coordinates = segment.geometryCoordinates ?? [];
    for (let index = 1; index < coordinates.length; index += 1) {
      const a = coordinates[index - 1].map((value) => value.toFixed(4)).join(',');
      const b = coordinates[index].map((value) => value.toFixed(4)).join(',');
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      edgeTotal += 1;
    }
  });
  const repeatedEdges = [...edgeCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const overlapRatio = edgeTotal ? repeatedEdges / edgeTotal : 0;
  return {
    overlapRatio: Number(overlapRatio.toFixed(2)),
    repeatedEdges,
    edgeTotal,
    excessiveOverlap: overlapRatio >= 0.16,
  };
}

export async function fetchRouteMetrics(routeIds, routePreference = 'AUTO') {
  const routeSignature = routeIds.filter(Boolean).join('|');
  const coords = routeIds
    .map((id) => {
      const coordinate = landmarkCoordinates.get(id) ?? travelLandmarkMeta[id];
      if (!coordinate) return DRIVABLE_ACCESS_POINTS[id] ? { ...DRIVABLE_ACCESS_POINTS[id], id, city: null } : null;
      return { ...coordinate, id };
    })
    .filter(Boolean)
    .map((m) => ({ id: m.id, lon: m.lon, lat: m.lat, city: m.city ?? null }));

  if (coords.length < 2) {
    return { mode: 'estimated', travelMode: 'MIXED', routeSignature, distanceKm: 0, durationHours: 0, segments: [] };
  }

  const pairs = coords.slice(1).map((to, index) => ({ from: coords[index], to }));
  const segments = await mapWithConcurrency(
    pairs,
    6,
    ({ from, to }, index) => buildMixedSegment(from, to, index, routePreference),
  );
  const geometryCoordinates = dedupeGeometry(segments);
  const travelModes = new Set(segments.map((segment) => segment.travelMode));
  const modes = new Set(segments.map((segment) => segment.mode));

  return {
    mode: modes.size > 1 ? 'mixed' : [...modes][0],
    travelMode: travelModes.size > 1 ? 'MIXED' : [...travelModes][0],
    routeSignature,
    routePreference,
    distanceKm: Number(segments.reduce((sum, segment) => sum + segment.distanceKm, 0).toFixed(2)),
    durationHours: Number(segments.reduce((sum, segment) => sum + segment.durationHours, 0).toFixed(2)),
    geometryCoordinates,
    segments,
    diagnostics: routeOverlapDiagnostics(segments),
  };
}

export function useRouteMetrics(routeIds, routePreference = 'AUTO') {
  const keyIds = (routeIds ?? []).filter(Boolean);

  return useQuery({
    queryKey: ['route-metrics', keyIds, routePreference],
    queryFn: () => fetchRouteMetrics(keyIds, routePreference),
    enabled: keyIds.length >= 2,
    staleTime: 10 * 60 * 1000,
  });
}
