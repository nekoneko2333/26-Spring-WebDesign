import { useMemo } from 'react';
import * as THREE from 'three';
import { roadCurve } from '../../data/landmarks.js';
import { worldPosToHeight } from '../../data/terrain.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';

export function RoadRibbon() {
  const terrain = useTerrainData();

  const { roadGeometry, lineGeometry } = useMemo(() => {
    const ROAD_WIDTH = 1.8;
    const LINE_WIDTH = 0.18;
    const SEGMENTS = 200;
    const points = roadCurve.getPoints(SEGMENTS);

    const buildStrip = (width, yOffset) => {
      const positions = [];
      const indices = [];

      for (let i = 0; i < points.length; i++) {
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

        positions.push(leftX, worldPosToHeight(leftX, leftZ) + yOffset, leftZ);
        positions.push(rightX, worldPosToHeight(rightX, rightZ) + yOffset, rightZ);
      }

      for (let i = 0; i < points.length - 1; i++) {
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

    return {
      roadGeometry: buildStrip(ROAD_WIDTH, 0.08),
      lineGeometry: buildStrip(LINE_WIDTH, 0.11),
    };
  }, [terrain.version]);

  if (terrain.status !== 'ready') return null;

  return (
    <group>
      <mesh geometry={roadGeometry} receiveShadow>
        <meshStandardMaterial color="#677285" roughness={0.58} />
      </mesh>
      <mesh geometry={lineGeometry} receiveShadow>
        <meshStandardMaterial color="#f0d18a" roughness={0.4} />
      </mesh>
    </group>
  );
}
