import { useQuery } from '@tanstack/react-query';
import { travelLandmarkMeta } from '../data/travelGuide.js';

function osrmUrl(coords) {
  const encoded = coords.map((c) => `${c.lon},${c.lat}`).join(';');
  return `https://router.project-osrm.org/route/v1/driving/${encoded}?overview=false&annotations=false&steps=false`;
}

async function fetchOsrmMetrics(routeIds) {
  const coords = routeIds
    .map((id) => travelLandmarkMeta[id])
    .filter(Boolean)
    .map((m) => ({ lon: m.lon, lat: m.lat }));

  if (coords.length < 2) {
    return { mode: 'osrm', distanceKm: 0, durationHours: 0 };
  }

  const response = await fetch(osrmUrl(coords), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Failed to load OSRM metrics');
  const json = await response.json();
  const route = json.routes?.[0];
  if (!route) throw new Error('No OSRM route');

  return {
    mode: 'osrm',
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationHours: Number((route.duration / 3600).toFixed(2)),
  };
}

export function useRouteMetrics(routeIds) {
  const keyIds = (routeIds ?? []).filter(Boolean);

  return useQuery({
    queryKey: ['route-metrics', keyIds],
    queryFn: () => fetchOsrmMetrics(keyIds),
    enabled: keyIds.length >= 2,
    staleTime: 10 * 60 * 1000,
  });
}

