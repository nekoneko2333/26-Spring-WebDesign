import { useMemo } from 'react';
import { landmarks } from '../data/landmarks.js';
import { currentRoute } from '../data/routes.js';
import { useAppStore } from '../state/useAppStore.js';

const DEFAULT_ROUTE_IDS = ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'];
const EARTH_RADIUS_KM = 6371.0088;

function haversineKm(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon,
  ));
}

function orientToFirstStop(points, routeIds) {
  if (points.length < 2 || routeIds.length === 0) return { points, reversed: false };
  const firstStop = landmarks.find((item) => item.id === routeIds[0]);
  if (!firstStop) return { points, reversed: false };
  const startDistance = haversineKm(points[0], firstStop);
  const endDistance = haversineKm(points[points.length - 1], firstStop);
  return endDistance < startDistance
    ? { points: [...points].reverse(), reversed: true }
    : { points, reversed: false };
}

function buildModeRanges(segments, reversed) {
  const measured = segments
    .map((segment) => {
      const coordinates = segment.geometryCoordinates ?? [];
      const distanceKm = coordinates.slice(1).reduce((sum, coordinate, index) => (
        sum + haversineKm(
          { lon: coordinates[index][0], lat: coordinates[index][1] },
          { lon: coordinate[0], lat: coordinate[1] },
        )
      ), 0);
      return { travelMode: segment.travelMode ?? 'DRIVE', distanceKm };
    })
    .filter((segment) => segment.distanceKm > 0);
  const totalKm = measured.reduce((sum, segment) => sum + segment.distanceKm, 0);
  if (!totalKm) return [];
  let cursor = 0;
  const ranges = measured.map((segment) => {
    const start = cursor / totalKm;
    cursor += segment.distanceKm;
    return { start, end: cursor / totalKm, travelMode: segment.travelMode };
  });
  return reversed
    ? ranges.reverse().map((range) => ({
      start: 1 - range.end,
      end: 1 - range.start,
      travelMode: range.travelMode,
    }))
    : ranges;
}

function buildRoute(points, modeRanges = []) {
  const cumulativeKm = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulativeKm[index] = cumulativeKm[index - 1] + haversineKm(points[index - 1], points[index]);
  }
  const totalKm = cumulativeKm[cumulativeKm.length - 1] || 1;

  return {
    points,
    cumulativeKm,
    totalKm,
    travelModeAt(progress) {
      const safeProgress = Math.max(0, Math.min(1, progress));
      return modeRanges.find((range, index) => (
        safeProgress >= range.start
        && (safeProgress < range.end || index === modeRanges.length - 1)
      ))?.travelMode ?? 'DRIVE';
    },
    sample(progress) {
      if (points.length === 1) return { ...points[0], index: 0, fraction: 0 };
      const distance = Math.max(0, Math.min(1, progress)) * totalKm;
      let endIndex = cumulativeKm.findIndex((value) => value >= distance);
      if (endIndex <= 0) endIndex = 1;
      const startIndex = endIndex - 1;
      const segmentKm = Math.max(cumulativeKm[endIndex] - cumulativeKm[startIndex], Number.EPSILON);
      const fraction = (distance - cumulativeKm[startIndex]) / segmentKm;
      return {
        lon: points[startIndex].lon + (points[endIndex].lon - points[startIndex].lon) * fraction,
        lat: points[startIndex].lat + (points[endIndex].lat - points[startIndex].lat) * fraction,
        index: startIndex,
        fraction,
      };
    },
  };
}

export function useActiveRouteGeo() {
  const routeIds = useAppStore((state) => state.activeRouteIds);
  const geometryCoordinates = useAppStore((state) => state.activeRouteGeometryCoordinates);
  const routeSegments = useAppStore((state) => state.activeRouteSegments);
  const distanceKm = useAppStore((state) => state.activeRouteDistanceKm);

  return useMemo(() => {
    const effectiveRouteIds = routeIds.length ? routeIds : DEFAULT_ROUTE_IDS;
    let points = geometryCoordinates
      .filter((coordinate) => Array.isArray(coordinate) && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]))
      .map(([lon, lat]) => ({ lon, lat }));

    if (points.length < 2 && routeIds.length === 0) {
      points = currentRoute.points.map(({ lon, lat }) => ({ lon, lat }));
    }
    if (points.length < 2) {
      points = effectiveRouteIds
        .map((id) => landmarks.find((item) => item.id === id))
        .filter(Boolean)
        .map(({ lon, lat }) => ({ lon, lat }));
    }

    const oriented = orientToFirstStop(points, effectiveRouteIds);
    points = oriented.points;
    const modeRanges = buildModeRanges(routeSegments, oriented.reversed);
    const route = buildRoute(points, modeRanges);
    return {
      ...route,
      routeIds: effectiveRouteIds,
      distanceKm: Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : route.totalKm,
      signature: `${points.length}:${points[0]?.lon ?? 0}:${points.at(-1)?.lat ?? 0}:${modeRanges.map((range) => range.travelMode).join(',')}`,
    };
  }, [distanceKm, geometryCoordinates, routeIds, routeSegments]);
}
