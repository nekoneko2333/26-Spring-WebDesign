import { useQuery } from '@tanstack/react-query';
import { landmarks } from '../data/landmarks.js';
import { travelLandmarkMeta } from '../data/travelGuide.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const ROUTE_METRICS_SCHEMA_VERSION = 6;
const DRIVABLE_ACCESS_POINTS = {
  milan_duomo: { lon: 9.1954, lat: 45.4614 },
  venice_rialto: { lon: 12.3181, lat: 45.4379 },
  florence_duomo: { lon: 11.248, lat: 43.7765 },
  pisa: { lon: 10.3913, lat: 43.7229 },
  colosseum: { lon: 12.4923, lat: 41.8892 },
  pompeii: { lon: 14.4987, lat: 40.7497 },
};
const VENICE_ACCESS_POINT = { lon: 12.3181, lat: 45.4379 };
const WATER_CROSSINGS = {
  SICILY: {
    mainland: { lon: 15.634, lat: 38.216 },
    island: { lon: 15.562, lat: 38.194 },
    water: [
      { lon: 15.634, lat: 38.216 },
      { lon: 15.612, lat: 38.203 },
      { lon: 15.585, lat: 38.196 },
      { lon: 15.562, lat: 38.194 },
    ],
  },
  SARDINIA: {
    mainland: { lon: 11.795, lat: 42.092 },
    island: { lon: 9.106, lat: 39.215 },
    water: [
      { lon: 11.795, lat: 42.092 },
      { lon: 11.12, lat: 41.38 },
      { lon: 10.43, lat: 40.65 },
      { lon: 9.72, lat: 39.91 },
      { lon: 9.106, lat: 39.215 },
    ],
  },
};
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

function waterRegion({ lon, lat } = {}) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lon >= 8 && lon <= 9.9 && lat >= 38.7 && lat <= 41.5) return 'SARDINIA';
  if (lon >= 12.2 && lon <= 15.8 && lat >= 36.4 && lat <= 38.5) return 'SICILY';
  return null;
}

function crossesOpenWater(from, to) {
  const fromRegion = waterRegion(from);
  const toRegion = waterRegion(to);
  return fromRegion !== toRegion && Boolean(fromRegion || toRegion);
}

function ferrySegment(coords) {
  const geometryCoordinates = coords.map(({ lon, lat }) => [lon, lat]);
  const distanceKm = coords.slice(1).reduce(
    (sum, coordinate, index) => sum + haversineKm(coords[index], coordinate),
    0,
  );
  return {
    mode: 'ferry',
    travelMode: 'FERRY_DRIVE',
    displayTravelMode: 'FERRY_DRIVE',
    modeSource: 'FALLBACK',
    modelType: 'ferry_drive',
    colorKey: 'ferry',
    distanceKm: Number(distanceKm.toFixed(2)),
    durationHours: Number((distanceKm / 58).toFixed(2)),
    geometryCoordinates,
    diagnostics: routeDiagnostics(distanceKm, haversineKm(coords[0], coords.at(-1)), geometryCoordinates),
  };
}

function veniceFerryCoordinates(from, to) {
  const start = { lon: from.lon, lat: from.lat };
  const end = { lon: to.lon, lat: to.lat };
  const accessFirst = haversineKm(start, VENICE_ACCESS_POINT)
    <= haversineKm(end, VENICE_ACCESS_POINT);
  const access = accessFirst ? start : end;
  const landmark = accessFirst ? end : start;
  const water = [
    access,
    { lon: 12.3218, lat: 45.4395 },
    { lon: 12.3288, lat: 45.4402 },
    { lon: 12.3342, lat: 45.4384 },
    landmark,
  ];
  return accessFirst ? water : water.reverse();
}

async function buildOpenWaterParts(from, to, travelMode) {
  const fromRegion = waterRegion(from);
  const toRegion = waterRegion(to);
  const region = fromRegion ?? toRegion;
  const crossing = WATER_CROSSINGS[region];
  if (!crossing) return null;

  const fromIsland = fromRegion === region;
  const departure = fromIsland ? crossing.island : crossing.mainland;
  const arrival = fromIsland ? crossing.mainland : crossing.island;
  const water = fromIsland ? [...crossing.water].reverse() : crossing.water;
  return [
    await planLeg([from, departure], travelMode),
    ferrySegment(water),
    await planLeg([arrival, to], travelMode),
  ];
}

function mergeDisplayModeRanges(ranges) {
  const merged = ranges.reduce((result, range) => {
    if (!Number.isFinite(range.distanceKm) || range.distanceKm <= 0) return result;
    const previous = result[result.length - 1];
    if (previous?.travelMode === range.travelMode && previous?.modeSource === range.modeSource) {
      previous.distanceKm += range.distanceKm;
    } else {
      result.push({ ...range });
    }
    return result;
  }, []);
  for (let index = merged.length - 2; index >= 1; index -= 1) {
    const current = merged[index];
    if (
      current.distanceKm <= 0.15
      && merged[index - 1].travelMode === merged[index + 1].travelMode
    ) {
      merged[index - 1].distanceKm += current.distanceKm + merged[index + 1].distanceKm;
      merged.splice(index, 2);
    }
  }
  return merged;
}

function routeDisplayModeRanges(route, fallbackTravelMode) {
  if (route?.displayModeRanges?.length) {
    const normalized = mergeDisplayModeRanges(route.displayModeRanges.map((range) => ({
      travelMode: range.travelMode ?? fallbackTravelMode,
      modeSource: range.modeSource ?? route.modeSource ?? 'FALLBACK',
      distanceKm: Number(range.distanceKm ?? 0),
    })));
    return normalized.some((range) => isFerryMode(range.travelMode)) ? normalized : null;
  }
  const steps = (route?.legs ?? []).flatMap((leg) => leg.steps ?? []);
  const ranges = mergeDisplayModeRanges(steps.map((step) => {
    const ferrySignal = `${step.mode ?? ''} ${step.name ?? ''} ${step.ref ?? ''}`.toLowerCase();
    return {
      travelMode: /ferry|traghetto|轮渡/.test(ferrySignal) ? 'FERRY_DRIVE' : fallbackTravelMode,
      modeSource: 'OSRM',
      distanceKm: Number(step.distance || 0) / 1000,
    };
  }));
  return ranges.some((range) => isFerryMode(range.travelMode)) ? ranges : null;
}

function isFerryMode(mode) {
  return mode === 'FERRY_DRIVE' || mode === 'FERRY';
}

function routeHasFerry(route) {
  return Boolean(route?.displayModeRanges?.some((range) => isFerryMode(range.travelMode))
    || route?.parts?.some((part) => isFerryMode(part.displayTravelMode ?? part.travelMode)));
}

function osrmUrl(coords, travelMode) {
  const encoded = coords.map((c) => `${c.lon},${c.lat}`).join(';');
  const baseUrl = travelMode === 'WALK'
    ? 'https://routing.openstreetmap.de/routed-foot/route/v1/driving'
    : 'https://router.project-osrm.org/route/v1/driving';
  return `${baseUrl}/${encoded}?overview=full&geometries=geojson&annotations=false&steps=true`;
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
    modeSource: 'FALLBACK',
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
        const routeParts = (route.parts ?? route.steps ?? [])
          .filter((part) => part?.geometryCoordinates?.length)
          .map((part) => ({
            mode: route.provider ?? 'backend',
            travelMode: part.displayTravelMode ?? part.travelMode ?? route.travelMode ?? travelMode,
            displayTravelMode: part.displayTravelMode ?? part.travelMode ?? route.travelMode ?? travelMode,
            rawTravelMode: part.rawTravelMode ?? route.travelMode ?? travelMode,
            modeSource: part.modeSource ?? route.modeSource ?? 'FALLBACK',
            modelType: part.modelType ?? (
              isFerryMode(part.displayTravelMode ?? part.travelMode) ? 'ferry_drive'
                : (part.displayTravelMode ?? part.travelMode) === 'WALK' ? 'walk' : 'drive'
            ),
            colorKey: part.colorKey ?? (
              isFerryMode(part.displayTravelMode ?? part.travelMode) ? 'ferry'
                : (part.displayTravelMode ?? part.travelMode) === 'WALK' ? 'walk' : 'drive'
            ),
            distanceKm: Number(part.distanceKm ?? 0),
            durationHours: Number(part.durationHours ?? 0),
            geometryCoordinates: part.geometryCoordinates,
            providerStep: part.providerStep ?? null,
          }));
        const geometryCoordinates = routeParts.length ? dedupeGeometry(routeParts) : route.geometryCoordinates;
        return {
          mode: route.provider ?? 'backend',
          travelMode: route.travelMode ?? travelMode,
          modeSource: route.modeSource ?? (
            route.provider === 'google-routes' ? 'GOOGLE'
              : route.provider === 'osrm' ? 'OSRM' : 'FALLBACK'
          ),
          distanceKm: Number(route.distanceKm ?? 0),
          durationHours: normalizeDurationHours(
            Number(route.distanceKm ?? 0),
            Number(route.durationHours ?? 0),
            route.travelMode ?? travelMode,
          ),
          geometryCoordinates,
          parts: routeParts,
          displayModeRanges: routeParts.length
            ? routeParts.map((part) => ({
              travelMode: part.displayTravelMode ?? part.travelMode,
              displayTravelMode: part.displayTravelMode ?? part.travelMode,
              modeSource: part.modeSource,
              distanceKm: part.distanceKm,
            }))
            : route.displayModeRanges ?? routeDisplayModeRanges(route, route.travelMode ?? travelMode),
          diagnostics: routeDiagnostics(Number(route.distanceKm ?? 0), straightKm, geometryCoordinates),
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
  const osrmParts = (route.legs ?? []).flatMap((leg) => leg.steps ?? [])
    .filter((step) => step?.geometry?.coordinates?.length)
    .map((step) => {
      const signal = `${step.mode ?? ''} ${step.name ?? ''} ${step.ref ?? ''}`.toLowerCase();
      const displayMode = /ferry|traghetto|boat/.test(signal) ? 'FERRY_DRIVE' : travelMode;
      return {
        mode: 'osrm',
        travelMode: displayMode,
        displayTravelMode: displayMode,
        rawTravelMode: travelMode,
        modeSource: 'OSRM',
        modelType: displayMode === 'FERRY_DRIVE' ? 'ferry_drive' : displayMode === 'WALK' ? 'walk' : 'drive',
        colorKey: displayMode === 'FERRY_DRIVE' ? 'ferry' : displayMode === 'WALK' ? 'walk' : 'drive',
        distanceKm: Number((Number(step.distance || 0) / 1000).toFixed(3)),
        durationHours: Number((Number(step.duration || 0) / 3600).toFixed(3)),
        geometryCoordinates: step.geometry.coordinates,
        providerStep: {
          mode: step.mode,
          name: step.name,
          ref: step.ref,
        },
      };
    });
  const geometryCoordinates = osrmParts.length ? dedupeGeometry(osrmParts) : route.geometry?.coordinates ?? [];
  return {
    mode: 'osrm',
    travelMode,
    modeSource: 'OSRM',
    distanceKm,
    durationHours: normalizeDurationHours(distanceKm, Number((route.duration / 3600).toFixed(2)), travelMode),
    geometryCoordinates,
    parts: (route.legs ?? []).flatMap((leg) => leg.steps ?? [])
      .filter((step) => step?.geometry?.coordinates?.length)
      .map((step) => {
        const signal = `${step.mode ?? ''} ${step.name ?? ''} ${step.ref ?? ''}`.toLowerCase();
        const displayMode = /ferry|traghetto|boat|轮渡|渡轮/.test(signal) ? 'FERRY_DRIVE' : travelMode;
        return {
          mode: 'osrm',
          travelMode: displayMode,
          displayTravelMode: displayMode,
          rawTravelMode: travelMode,
          modeSource: 'OSRM',
          modelType: displayMode === 'FERRY_DRIVE' ? 'ferry_drive' : displayMode === 'WALK' ? 'walk' : 'drive',
          colorKey: displayMode === 'FERRY_DRIVE' ? 'ferry' : displayMode === 'WALK' ? 'walk' : 'drive',
          distanceKm: Number((Number(step.distance || 0) / 1000).toFixed(3)),
          durationHours: Number((Number(step.duration || 0) / 3600).toFixed(3)),
          geometryCoordinates: step.geometry.coordinates,
          providerStep: {
            mode: step.mode,
            name: step.name,
            ref: step.ref,
          },
        };
      }),
    displayModeRanges: osrmParts.length
      ? osrmParts.map((part) => ({
        travelMode: part.displayTravelMode,
        displayTravelMode: part.displayTravelMode,
        modeSource: part.modeSource,
        distanceKm: part.distanceKm,
      }))
      : routeDisplayModeRanges(route, travelMode),
    diagnostics: routeDiagnostics(distanceKm, straightKm, geometryCoordinates),
  };
}

async function buildMixedSegment(from, to, index, routePreference = 'AUTO') {
  const baseMode = routePreference === 'DRIVE' || routePreference === 'WALK'
    ? routePreference
    : routeTravelMode(from, to);
  const fromAccess = from.city === 'Venice' ? VENICE_ACCESS_POINT : DRIVABLE_ACCESS_POINTS[from.id];
  const toAccess = to.city === 'Venice' ? VENICE_ACCESS_POINT : DRIVABLE_ACCESS_POINTS[to.id];
  const parts = [];

  if (from.city === 'Venice' && to.city === 'Venice') {
    parts.push(await planLeg([from, to], 'WALK'));
  } else if (from.city === 'Venice' && fromAccess) {
    parts.push(await planLeg([from, { ...fromAccess, city: from.city }], 'WALK'));
    parts.push(await planLeg([{ ...fromAccess, city: from.city }, to], 'DRIVE'));
  } else if (to.city === 'Venice' && toAccess) {
    parts.push(await planLeg([from, { ...toAccess, city: to.city }], 'DRIVE'));
    parts.push(await planLeg([{ ...toAccess, city: to.city }, to], 'WALK'));
  } else if (crossesOpenWater(from, to)) {
    const providerRoute = await planLeg([from, to], 'DRIVE');
    if (routeHasFerry(providerRoute)) {
      parts.push(providerRoute);
    } else {
      const fallbackParts = await buildOpenWaterParts(from, to, 'DRIVE');
      parts.push(...(fallbackParts ?? [providerRoute]));
    }
  } else if (routePreference !== 'AUTO') {
    parts.push(await planLeg([from, to], baseMode));
  } else {
    if (isAutoWalkCandidate(from, to)) {
      const [drive, walk] = await Promise.all([
        planLeg([from, to], 'DRIVE'),
        planLeg([from, to], 'WALK'),
      ]);
      parts.push(shouldAutoUseWalking(walk, drive) ? walk : drive);
    } else {
      parts.push(await planLeg([from, to], 'DRIVE'));
    }
  }

  const resolvedParts = parts.flatMap((part) => (
    part.parts?.length ? part.parts : [part]
  ));
  const geometryCoordinates = dedupeGeometry(resolvedParts);
  const distanceKm = Number(resolvedParts.reduce((sum, part) => sum + Number(part.distanceKm || 0), 0).toFixed(2));
  const durationHours = Number(resolvedParts.reduce((sum, part) => sum + Number(part.durationHours || 0), 0).toFixed(2));
  return {
    index,
    fromId: from.id,
    toId: to.id,
    mode: resolvedParts.some((part) => part.mode !== resolvedParts[0]?.mode) ? 'mixed' : resolvedParts[0]?.mode ?? 'estimated',
    travelMode: resolvedParts.some((part) => part.travelMode !== resolvedParts[0]?.travelMode) ? 'MIXED' : resolvedParts[0]?.travelMode ?? baseMode,
    modeSource: resolvedParts.some((part) => part.modeSource !== resolvedParts[0]?.modeSource)
      ? 'FALLBACK'
      : resolvedParts[0]?.modeSource ?? 'FALLBACK',
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
    queryKey: ['route-metrics', ROUTE_METRICS_SCHEMA_VERSION, keyIds, routePreference],
    queryFn: () => fetchRouteMetrics(keyIds, routePreference),
    enabled: keyIds.length >= 2,
    staleTime: 10 * 60 * 1000,
  });
}
