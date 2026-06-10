import { useMemo } from 'react';
import * as THREE from 'three';
import { landmarks, worldUnitsFromMeters } from '../../data/landmarks.js';
import { sampleRoadSurface, worldPosToHeight } from '../../data/terrain.js';
import { useActiveRoute3d } from '../../hooks/useActiveRoute3d.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';
import { useAppStore } from '../../state/useAppStore.js';

const FALLBACK_ROUTE_IDS = ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'];
const ROAD_WIDTH = worldUnitsFromMeters(7.2);
const ROAD_CLEARANCE = worldUnitsFromMeters(0.05);
const LOCAL_ROAD_SAMPLES = 180;
const LOCAL_PROGRESS_STEP = 0.001;

function buildStrip(points, width, clearance) {
  const positions = [];
  const indices = [];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangentX = next.x - previous.x;
    const tangentZ = next.z - previous.z;
    const surface = sampleRoadSurface(
      current.x,
      current.z,
      tangentX,
      tangentZ,
      width / 2,
      clearance,
    );
    positions.push(surface.left.x, surface.left.y, surface.left.z);
    positions.push(surface.right.x, surface.right.y, surface.right.z);
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const offset = index * 2;
    indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function sampleLocalRoad(curve, progress) {
  const routeLength = Math.max(curve.totalDistance, Number.EPSILON);
  const start = Math.max(0, progress - worldUnitsFromMeters(800) / routeLength);
  const end = Math.min(1, progress + worldUnitsFromMeters(2500) / routeLength);
  return Array.from({ length: LOCAL_ROAD_SAMPLES + 1 }, (_, index) => (
    curve.getPointAt(THREE.MathUtils.lerp(start, end, index / LOCAL_ROAD_SAMPLES), new THREE.Vector3())
  ));
}

function buildOverviewRoute(curve) {
  const points = Array.from({ length: 121 }, (_, index) => {
    const point = curve.getPointAt(index / 120, new THREE.Vector3());
    point.y = 0.03;
    return point;
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, 0.11, 4, false);
}

export function RoadRibbon() {
  const terrain = useTerrainData();
  const activeRoute = useActiveRoute3d();
  const routeProgress = useAppStore((state) => state.routeProgress);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const nearbyLandmarkId = useAppStore((state) => state.nearbyLandmarkId);
  const localProgress = Math.round(routeProgress / LOCAL_PROGRESS_STEP) * LOCAL_PROGRESS_STEP;

  const localRoad = useMemo(() => {
    if (cameraMode === 'map') return null;
    const points = sampleLocalRoad(activeRoute.curve, localProgress);
    const currentIndex = Math.round(
      THREE.MathUtils.clamp(
        (routeProgress - Math.max(0, localProgress - worldUnitsFromMeters(800) / activeRoute.curve.totalDistance))
          / Math.max(
            Math.min(1, localProgress + worldUnitsFromMeters(2500) / activeRoute.curve.totalDistance)
              - Math.max(0, localProgress - worldUnitsFromMeters(800) / activeRoute.curve.totalDistance),
            Number.EPSILON,
          ),
        0,
        1,
      ) * LOCAL_ROAD_SAMPLES,
    );
    return {
      base: buildStrip(points, ROAD_WIDTH, ROAD_CLEARANCE),
      passed: buildStrip(points.slice(0, Math.max(2, currentIndex + 1)), ROAD_WIDTH * 0.82, ROAD_CLEARANCE + worldUnitsFromMeters(0.015)),
      center: buildStrip(points, worldUnitsFromMeters(0.13), ROAD_CLEARANCE + worldUnitsFromMeters(0.025)),
    };
  }, [activeRoute.signature, cameraMode, localProgress, terrain.status, terrain.version]);

  const overviewGeometry = useMemo(() => (
    cameraMode === 'map' ? buildOverviewRoute(activeRoute.curve) : null
  ), [activeRoute.signature, cameraMode]);

  const overview = useMemo(() => {
    if (cameraMode !== 'map') return null;
    const routeStopIds = activeRoute.routeIds.length ? activeRoute.routeIds : FALLBACK_ROUTE_IDS;
    return {
      stops: routeStopIds.map((id) => {
        const landmark = landmarks.find((item) => item.id === id);
        return landmark ? { id, active: id === nearbyLandmarkId, position: [landmark.position[0], 0.08, landmark.position[2]] } : null;
      }).filter(Boolean),
      vehicle: activeRoute.curve.getPointAt(routeProgress, new THREE.Vector3()),
    };
  }, [activeRoute.routeIds, activeRoute.signature, cameraMode, nearbyLandmarkId, routeProgress]);

  if (cameraMode === 'map' && overview) {
    return (
      <group>
        <mesh geometry={overviewGeometry} renderOrder={2}>
          <meshBasicMaterial color="#314f5c" />
        </mesh>
        {overview.stops.map((stop) => (
          <mesh key={stop.id} position={stop.position} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[stop.active ? 0.9 : 0.62, 16]} />
            <meshBasicMaterial color={stop.active ? '#f0d490' : '#ffffff'} />
          </mesh>
        ))}
        <mesh position={[overview.vehicle.x, 0.16, overview.vehicle.z]}>
          <sphereGeometry args={[0.42, 12, 8]} />
          <meshBasicMaterial color="#56d6e6" />
        </mesh>
      </group>
    );
  }

  if (!localRoad) return null;
  return (
    <group>
      <mesh geometry={localRoad.base} receiveShadow renderOrder={2}>
        <meshStandardMaterial color="#59666b" roughness={0.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh geometry={localRoad.passed} receiveShadow renderOrder={3}>
        <meshStandardMaterial color="#56d6e6" emissive="#2caaba" emissiveIntensity={0.2} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      <mesh geometry={localRoad.center} renderOrder={4}>
        <meshBasicMaterial color="#fff1bf" polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
      </mesh>
    </group>
  );
}
