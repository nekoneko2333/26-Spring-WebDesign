import { useMemo } from 'react';
import * as THREE from 'three';
import { buildRouteHeightProfile } from '../../data/terrain.js';
import { useActiveRoute3d } from '../../hooks/useActiveRoute3d.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';

export function RoadRibbon() {
  const terrain = useTerrainData();
  const activeRoute = useActiveRoute3d();

  const { roadSegments, lineGeometry } = useMemo(() => {
    const ROAD_WIDTH = 1.18;
    const LINE_WIDTH = 0.07;
    const SEGMENTS = activeRoute.source === 'osrm' ? 420 : 180;
    const points = activeRoute.curve.getPoints(SEGMENTS);
    const heights = buildRouteHeightProfile(points, { clearance: 0.16, maxGrade: 0.025, smoothPasses: 2 });

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

    const segmentCount = Math.min(10, Math.max(1, Math.ceil(points.length / 60)));
    const roadSegments = Array.from({ length: segmentCount }, (_, index) => {
      const startIndex = Math.floor((index / segmentCount) * (points.length - 1));
      const endIndex = Math.max(Math.floor(((index + 1) / segmentCount) * (points.length - 1)), startIndex + 1);
      return {
        id: `active-route-${index}`,
        segment: { trafficState: 'normal', type: activeRoute.source === 'osrm' ? 'realRoad' : 'plannedRoad' },
        geometry: buildStrip(ROAD_WIDTH, 0.018, startIndex, endIndex),
      };
    });

    return {
      roadSegments,
      lineGeometry: buildStrip(LINE_WIDTH, 0.028),
    };
  }, [activeRoute, terrain.version]);

  if (terrain.status !== 'ready') return null;

  return (
    <group>
      {roadSegments.map((segment) => (
        <group key={segment.id}>
          <mesh geometry={segment.geometry} receiveShadow>
            <meshStandardMaterial
              color={getRoadColor(segment.segment)}
              roughness={0.66}
              emissive="#000000"
              emissiveIntensity={0}
            />
          </mesh>
          <mesh geometry={segment.geometry}>
            <meshBasicMaterial
              color={getRoadGlowColor(segment.segment)}
              transparent
              opacity={0.13}
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
  return segment.type === 'realRoad' ? '#6b7f84' : '#7c858b';
}

function getRoadGlowColor(segment) {
  return segment.type === 'realRoad' ? '#82c7d5' : '#f0c36d';
}
