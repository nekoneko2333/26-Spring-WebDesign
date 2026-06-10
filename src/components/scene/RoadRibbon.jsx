import { useMemo } from 'react';
import * as THREE from 'three';
import { sampleRoadSurface, worldPosToHeight } from '../../data/terrain.js';
import { landmarks } from '../../data/landmarks.js';
import { useActiveRoute3d } from '../../hooks/useActiveRoute3d.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';
import { useAppStore } from '../../state/useAppStore.js';

const FALLBACK_ROUTE_IDS = ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'];

export function RoadRibbon() {
  const terrain = useTerrainData();
  const activeRoute = useActiveRoute3d();
  const routeProgress = useAppStore((state) => state.routeProgress);
  const nearbyLandmarkId = useAppStore((state) => state.nearbyLandmarkId);
  const renderedRouteProgress = Math.round(routeProgress * 100) / 100;

  const { baseRoadGeometry, passedRoadGeometry, edgeGeometries, dashGeometries, stationMarkers, vehicleMarker, roadsideMarkers } = useMemo(() => {
    const ROAD_WIDTH = activeRoute.source === 'routed' ? 0.36 : 0.48;
    const EDGE_WIDTH = activeRoute.source === 'routed' ? 0.42 : 0.56;
    const PASSED_WIDTH = ROAD_WIDTH * 0.82;
    const DASH_WIDTH = activeRoute.source === 'routed' ? 0.018 : 0.026;
    const SEGMENTS = activeRoute.source === 'routed' ? 720 : 220;
    const points = activeRoute.curve.getPoints(SEGMENTS);
    const heights = points.map((point) => worldPosToHeight(point.x, point.z) + 0.004);
    const progressIndex = Math.max(1, Math.round(THREE.MathUtils.clamp(renderedRouteProgress, 0, 1) * (points.length - 1)));

    // 基于路线采样点生成轻量道路带，宽度由切线法线控制，不引入贴图资源。
    const buildStrip = (width, yOffset, startIndex = 0, endIndex = points.length - 1) => {
      const safeStart = THREE.MathUtils.clamp(startIndex, 0, points.length - 2);
      const safeEnd = THREE.MathUtils.clamp(endIndex, safeStart + 1, points.length - 1);
      const positions = [];
      const indices = [];

      for (let i = safeStart; i <= safeEnd; i += 1) {
        const curr = points[i];
        const next = points[Math.min(i + 1, points.length - 1)];
        const prev = points[Math.max(i - 1, 0)];
        const tangent = new THREE.Vector3().subVectors(next, prev).setY(0).normalize();
        const surface = sampleRoadSurface(curr.x, curr.z, tangent.x, tangent.z, width / 2, 0.004 + yOffset);
        positions.push(surface.left.x, surface.left.y, surface.left.z);
        positions.push(surface.right.x, surface.right.y, surface.right.z);
      }

      for (let i = 0; i < safeEnd - safeStart; i += 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    };

    const dashGeometries = [];
    const dashEvery = activeRoute.source === 'routed' ? 24 : 12;
    const dashLength = Math.max(4, Math.floor(dashEvery * 0.48));
    for (let start = 3; start < points.length - 2; start += dashEvery) {
      dashGeometries.push(buildStrip(DASH_WIDTH, 0.003, start, Math.min(start + dashLength, points.length - 1)));
    }

    const routeStopIds = activeRoute.routeIds.length ? activeRoute.routeIds : FALLBACK_ROUTE_IDS;
    const stationMarkers = routeStopIds.map((id) => {
      const landmark = landmarks.find((item) => item.id === id);
      if (!landmark) return null;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < points.length; index += 1) {
        const dx = points[index].x - landmark.position[0];
        const dz = points[index].z - landmark.position[2];
        const distance = Math.hypot(dx, dz);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
      return {
        id,
        isActive: id === nearbyLandmarkId,
        position: [points[closestIndex].x, heights[closestIndex] + 0.018, points[closestIndex].z],
      };
    }).filter(Boolean);

    const markerPoint = points[progressIndex] ?? points[0];
    const vehicleMarker = [markerPoint.x, heights[progressIndex] + 0.022, markerPoint.z];
    const roadsideMarkers = [];
    const markerEvery = activeRoute.source === 'routed' ? 80 : 32;
    for (let index = 10; index < points.length - 10; index += markerEvery) {
      const curr = points[index];
      const next = points[Math.min(index + 1, points.length - 1)];
      const prev = points[Math.max(index - 1, 0)];
      const tangent = new THREE.Vector3().subVectors(next, prev).setY(0).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const side = (index / markerEvery) % 2 === 0 ? 1 : -1;
      roadsideMarkers.push({
        id: `roadside-${index}`,
        kind: index % (markerEvery * 2) === 0 ? 'lamp' : 'tree',
        position: [
          curr.x + normal.x * side * 0.48,
          worldPosToHeight(curr.x + normal.x * side * 0.48, curr.z + normal.z * side * 0.48) + 0.006,
          curr.z + normal.z * side * 0.48,
        ],
      });
    }

    return {
      baseRoadGeometry: buildStrip(ROAD_WIDTH, 0),
      passedRoadGeometry: buildStrip(PASSED_WIDTH, 0.002, 0, progressIndex),
      edgeGeometries: [buildStrip(EDGE_WIDTH, -0.001), buildStrip(ROAD_WIDTH + 0.03, 0.001)],
      dashGeometries,
      stationMarkers,
      vehicleMarker,
      roadsideMarkers,
    };
  }, [activeRoute, nearbyLandmarkId, renderedRouteProgress, terrain.version]);

  if (terrain.status !== 'ready') return null;

  return (
    <group>
      <mesh geometry={edgeGeometries[0]} receiveShadow renderOrder={1}>
        <meshStandardMaterial color="#43545a" roughness={0.82} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={baseRoadGeometry} receiveShadow renderOrder={2}>
        <meshStandardMaterial color="#59666b" roughness={0.76} metalness={0.02} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh geometry={passedRoadGeometry} receiveShadow renderOrder={3}>
        <meshStandardMaterial color="#56d6e6" emissive="#2caaba" emissiveIntensity={0.26} roughness={0.58} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      <mesh geometry={edgeGeometries[1]}>
        <meshBasicMaterial color="#111827" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {dashGeometries.map((geometry, index) => (
        <mesh key={`lane-dash-${index}`} geometry={geometry} renderOrder={4}>
          <meshStandardMaterial color="#fff1bf" emissive="#c89545" emissiveIntensity={0.16} roughness={0.48} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      {stationMarkers.map((marker) => (
        <group key={marker.id} position={marker.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[marker.isActive ? 0.17 : 0.13, 24]} />
            <meshBasicMaterial color={marker.isActive ? '#f0d490' : '#ffffff'} transparent opacity={marker.isActive ? 0.9 : 0.58} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.19, 0.23, 32]} />
            <meshBasicMaterial color={marker.isActive ? '#7ed0e4' : '#c9a96e'} transparent opacity={marker.isActive ? 0.78 : 0.38} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <group position={vehicleMarker}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.17, 0.22, 40]} />
          <meshBasicMaterial color="#7ed0e4" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <sphereGeometry args={[0.06, 16, 10]} />
          <meshStandardMaterial color="#f0d490" emissive="#f0d490" emissiveIntensity={0.45} roughness={0.36} />
        </mesh>
      </group>
      {roadsideMarkers.map((marker) => (
        <group key={marker.id} position={marker.position} scale={0.32}>
          {marker.kind === 'tree' ? (
            <>
              <mesh position={[0, 0.32, 0]}>
                <cylinderGeometry args={[0.05, 0.07, 0.64, 6]} />
                <meshStandardMaterial color="#7b5b38" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.88, 0]}>
                <coneGeometry args={[0.38, 0.8, 7]} />
                <meshStandardMaterial color="#6f9b70" roughness={0.82} />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0, 0.46, 0]}>
                <cylinderGeometry args={[0.035, 0.045, 0.92, 8]} />
                <meshStandardMaterial color="#44525c" roughness={0.62} />
              </mesh>
              <mesh position={[0, 0.95, 0]}>
                <sphereGeometry args={[0.12, 10, 8]} />
                <meshStandardMaterial color="#f0d490" emissive="#f0d490" emissiveIntensity={0.28} roughness={0.4} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
