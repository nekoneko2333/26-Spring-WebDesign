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
const landmarkCoordinates = new Map(landmarks.map((landmark) => [
  landmark.id,
  { lon: landmark.lon, lat: landmark.lat, city: landmark.location?.city?.en ?? null },
]));

function routeTravelMode(coords) {
  if (coords.length < 2) return 'DRIVE';
  const cities = new Set(coords.map((coord) => coord.city).filter(Boolean));
  const lons = coords.map((coord) => coord.lon);
  const lats = coords.map((coord) => coord.lat);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  if (cities.size === 1 && (lonSpan < 0.18 && latSpan < 0.18)) return 'WALK';
  if (Math.max(lonSpan, latSpan) < 0.08) return 'WALK';
  return 'DRIVE';
}

function osrmUrl(coords, travelMode) {
  const encoded = coords.map((c) => `${c.lon},${c.lat}`).join(';');
  const profile = travelMode === 'WALK' ? 'foot' : 'driving';
  return `https://router.project-osrm.org/route/v1/${profile}/${encoded}?overview=full&geometries=geojson&annotations=false&steps=false`;
}

function estimatedMetrics(coords, routeSignature, travelMode) {
  const distanceKm = coords.slice(1).reduce((total, coord, index) => {
    const from = coords[index];
    const earthRadiusKm = 6371;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = coord.lat * Math.PI / 180;
    const deltaLat = (coord.lat - from.lat) * Math.PI / 180;
    const deltaLon = (coord.lon - from.lon) * Math.PI / 180;
    const haversine = Math.sin(deltaLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return total + earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 1.18;
  }, 0);
  const speed = travelMode === 'WALK' ? 4.5 : 58;
  return {
    mode: 'estimated',
    travelMode,
    routeSignature,
    distanceKm: Number(distanceKm.toFixed(1)),
    durationHours: Number((distanceKm / speed).toFixed(2)),
    geometryCoordinates: coords.map((coord) => [coord.lon, coord.lat]),
  };
}

export async function fetchRouteMetrics(routeIds) {
  const routeSignature = routeIds.filter(Boolean).join('|');
  const coords = routeIds
    .map((id) => {
      const coordinate = landmarkCoordinates.get(id) ?? travelLandmarkMeta[id];
      if (!coordinate) return DRIVABLE_ACCESS_POINTS[id] ?? null;
      return coordinate.city ? coordinate : (DRIVABLE_ACCESS_POINTS[id] ?? coordinate);
    })
    .filter(Boolean)
    .map((m) => ({ lon: m.lon, lat: m.lat, city: m.city ?? null }));
  const travelMode = routeTravelMode(coords);

  if (coords.length < 2) {
    return { mode: 'estimated', travelMode, routeSignature, distanceKm: 0, durationHours: 0 };
  }

  try {
    const backendResponse = await fetch(`${API_BASE_URL}/api/routes/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: coords, travelMode }),
    });
    if (backendResponse.ok) {
      const route = await backendResponse.json();
      if (route?.geometryCoordinates?.length) {
        return {
          mode: route.provider ?? 'backend',
          travelMode: route.travelMode ?? travelMode,
          routeSignature,
          distanceKm: route.distanceKm,
          durationHours: route.durationHours,
          geometryCoordinates: route.geometryCoordinates,
        };
      }
    }
  } catch {
    // Local development can run without the backend; use the public OSM router below.
  }

  const response = await fetch(osrmUrl(coords, travelMode), { headers: { accept: 'application/json' } }).catch(() => null);
  if (!response?.ok) return estimatedMetrics(coords, routeSignature, travelMode);
  const json = await response.json().catch(() => null);
  const route = json?.routes?.[0];
  if (!route) return estimatedMetrics(coords, routeSignature, travelMode);

  return {
    mode: 'osrm',
    travelMode,
    routeSignature,
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationHours: Number((route.duration / 3600).toFixed(2)),
    geometryCoordinates: route.geometry?.coordinates ?? [],
  };
}

export function useRouteMetrics(routeIds) {
  const keyIds = (routeIds ?? []).filter(Boolean);

  return useQuery({
    queryKey: ['route-metrics', keyIds],
    queryFn: () => fetchRouteMetrics(keyIds),
    enabled: keyIds.length >= 2,
    staleTime: 10 * 60 * 1000,
  });
}
