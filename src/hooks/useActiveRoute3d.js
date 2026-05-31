import { useMemo } from 'react';
import * as THREE from 'three';
import { landmarks, lngLatToWorld } from '../data/landmarks.js';
import { useAppStore } from '../state/useAppStore.js';

function coordinatesToWorldPoints(coordinates) {
  return coordinates
    .filter((coord) => Array.isArray(coord) && Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
    .map(([lon, lat]) => {
      const [x, y, z] = lngLatToWorld(lon, lat);
      return new THREE.Vector3(x, y, z);
    });
}

function routeIdsToWorldPoints(routeIds) {
  return routeIds
    .map((id) => landmarks.find((landmark) => landmark.id === id))
    .filter(Boolean)
    .map((landmark) => new THREE.Vector3(landmark.position[0], 0, landmark.position[2]));
}

function cumulativeDistances(points) {
  if (points.length === 0) return [0];
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances[index] = distances[index - 1] + points[index].distanceTo(points[index - 1]);
  }
  return distances;
}

export function useActiveRoute3d() {
  const routeIds = useAppStore((state) => state.activeRouteIds);
  const geometryCoordinates = useAppStore((state) => state.activeRouteGeometryCoordinates);
  const distanceKm = useAppStore((state) => state.activeRouteDistanceKm);

  return useMemo(() => {
    let points = coordinatesToWorldPoints(geometryCoordinates);
    const source = points.length >= 2 ? 'osrm' : 'waypoints';

    if (points.length < 2) points = routeIdsToWorldPoints(routeIds);
    if (points.length < 2) points = routeIdsToWorldPoints(['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii']);

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.08);
    const distances = cumulativeDistances(points);
    const worldDistance = distances[distances.length - 1] || 1;
    const fallbackDistanceKm = Math.max(worldDistance * 6.2, 1);

    return {
      curve,
      points,
      routeIds,
      source,
      distanceKm: Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : fallbackDistanceKm,
      progressAtIndex(index) {
        if (points.length <= 1) return 0;
        return distances[index] / worldDistance;
      },
      pointAtProgress(progress) {
        const clamped = THREE.MathUtils.clamp(progress, 0, 0.9999);
        const index = Math.min(Math.floor(clamped * (points.length - 1)), points.length - 2);
        return { index, point: points[index] };
      },
    };
  }, [distanceKm, geometryCoordinates, routeIds]);
}
