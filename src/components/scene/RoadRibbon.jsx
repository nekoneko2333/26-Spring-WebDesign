import { useMemo } from 'react';
import * as THREE from 'three';
import { getRouteSegmentAtProgress, roadCurve, routeSegments, routeTrafficColors } from '../../data/routes.js';
import { buildSemanticRouteHeightProfile } from '../../data/terrain.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';

export function RoadRibbon() {
  const terrain = useTerrainData();

  const { roadSegments, lineGeometry } = useMemo(() => {
    const ROAD_WIDTH = 1.18;
    const LINE_WIDTH = 0.07;
    const SEGMENTS = 180;
    const points = roadCurve.getPoints(SEGMENTS);
    const heights = buildSemanticRouteHeightProfile(points, getRouteSegmentAtProgress, { clearance: 0.035 });

    const buildStrip = (width, yOffset, startIndex = 0, endIndex = points.length - 1) => {
      const positions = [];
      const indices = [];

      for (let i = startIndex; i <= endIndex; i += 1) {
        const curr = points[i];
        const next = points[Math.min(i + 1, points.length - 1)];
        const prev = points[Math.max(i - 1, 0)];
        const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
        const halfW = width / 2;
        const leftX = curr.x - normal.x * halfW;
        const leftZ = curr.z - normal.z * halfW;
        const rightX = curr.x + normal.x * halfW;
        const rightZ = curr.z + normal.z * halfW;
        const deckY = heights[i] + yOffset;

        positions.push(leftX, deckY, leftZ);
        positions.push(rightX, deckY, rightZ);
      }

      for (let i = 0; i < endIndex - startIndex; i += 1) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    const progressToIndex = (progress) => THREE.MathUtils.clamp(
      Math.round(progress * (points.length - 1)),
      0,
      points.length - 1,
    );

    const roadSegments = routeSegments.map((segment) => {
      const startIndex = Math.min(progressToIndex(segment.startProgress), points.length - 2);
      const endIndex = Math.max(progressToIndex(segment.endProgress), startIndex + 1);
      return {
        id: segment.id,
        segment,
        geometry: buildStrip(ROAD_WIDTH, 0.018, startIndex, endIndex),
      };
    });

    return {
      roadSegments,
      lineGeometry: buildStrip(LINE_WIDTH, 0.028),
    };
  }, [terrain.version]);

  if (terrain.status !== 'ready') return null;

  return (
    <group>
      {roadSegments.map((segment) => (
        <group key={segment.id}>
          <mesh geometry={segment.geometry} receiveShadow>
            <meshStandardMaterial
              color={getRoadColor(segment.segment)}
              roughness={segment.segment.type === 'city' ? 0.78 : 0.62}
              emissive={segment.segment.type === 'tunnel' ? '#111827' : '#000000'}
              emissiveIntensity={segment.segment.type === 'tunnel' ? 0.22 : 0}
            />
          </mesh>
          <mesh geometry={segment.geometry}>
            <meshBasicMaterial
              color={getRoadGlowColor(segment.segment)}
              transparent
              opacity={segment.segment.trafficState === 'traffic_jam' ? 0.22 : 0.13}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
      <mesh geometry={lineGeometry} receiveShadow>
        <meshStandardMaterial color="#f0d490" emissive="#c79245" emissiveIntensity={0.2} roughness={0.42} />
      </mesh>
    </group>
  );
}

function getRoadColor(segment) {
  if (segment.type === 'tunnel') return segment.profile.color;
  if (segment.trafficState === 'slow' || segment.trafficState === 'traffic_jam') {
    return routeTrafficColors[segment.trafficState];
  }
  return segment.profile.color ?? '#6d7584';
}

function getRoadGlowColor(segment) {
  if (segment.trafficState === 'traffic_jam') return '#d35b52';
  if (segment.trafficState === 'slow') return '#f0c36d';
  return '#82c7d5';
}
