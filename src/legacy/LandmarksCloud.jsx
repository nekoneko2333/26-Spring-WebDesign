import { useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../state/useAppStore.js';

const LANDMARKS = [
  { id: 'colosseum', position: [18, 2, -8], color: '#d7b27d' },
  { id: 'pisa', position: [-14, 2, 12], color: '#d6dbe8' },
  { id: 'duomo', position: [6, 2, 22], color: '#b8d7ca' },
  { id: 'venice', position: [-22, 2, -20], color: '#c6b9da' },
];

export function LandmarksCloud() {
  const selectLandmark = useAppStore((state) => state.selectLandmark);

  const palette = useMemo(() => LANDMARKS.map((item) => new THREE.Color(item.color)), []);

  return (
    <group>
      {LANDMARKS.map((landmark, index) => (
        <instancedMesh
          key={landmark.id}
          args={[undefined, undefined, 24]}
          position={landmark.position}
          onClick={() => selectLandmark(landmark.id)}
        >
          <icosahedronGeometry args={[1.8, 1]} />
          <meshStandardMaterial color={palette[index]} roughness={0.45} />
        </instancedMesh>
      ))}
    </group>
  );
}
