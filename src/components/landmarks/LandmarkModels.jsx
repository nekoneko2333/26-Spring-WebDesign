import { Clone, Html, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { landmarks } from '../../data/landmarks.js';
import { worldPosToHeight } from '../../data/terrain.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';
import { useAppStore } from '../../state/useAppStore.js';
import { travelLandmarkMeta } from '../../data/travelGuide.js';

function LoadedLandmarkModel({ landmark }) {
  const { scene } = useGLTF(landmark.modelPath);
  const fittedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = landmark.scale;
    const fitScale = targetSize / maxDimension;

    clone.scale.setScalar(fitScale);
    clone.position.set(-center.x * fitScale, -box.min.y * fitScale, -center.z * fitScale);
    return clone;
  }, [landmark.scale, scene]);

  return <Clone object={fittedScene} castShadow receiveShadow />;
}

function PlaceholderLandmarkModel({ landmark }) {
  const color = {
    dome: '#c47b58',
    bridge: '#d7c2a2',
    cathedral: '#d9d2bd',
    ruins: '#b99b72',
  }[landmark.modelKind] ?? '#c7a070';

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[landmark.scale * 0.86, 0.7, landmark.scale * 0.54]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.03} />
      </mesh>
      {landmark.modelKind === 'dome' && (
        <mesh castShadow position={[0, 1.16, 0]}>
          <sphereGeometry args={[landmark.scale * 0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#b95f46" roughness={0.68} />
        </mesh>
      )}
      {landmark.modelKind === 'bridge' && (
        <mesh castShadow position={[0, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[landmark.scale * 0.32, 0.18, 8, 18, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.66} />
        </mesh>
      )}
      {landmark.modelKind === 'cathedral' && [ -1.8, 0, 1.8 ].map((x) => (
        <mesh key={x} castShadow position={[x, 1.3, 0]}>
          <coneGeometry args={[0.42, 1.9, 5]} />
          <meshStandardMaterial color="#eee4ce" roughness={0.62} />
        </mesh>
      ))}
      {landmark.modelKind === 'ruins' && [ -2.1, -0.7, 0.8, 2.2 ].map((x, index) => (
        <mesh key={x} castShadow position={[x, 1 + (index % 2) * 0.22, -0.1]}>
          <cylinderGeometry args={[0.18, 0.22, 1.8 + (index % 2) * 0.35, 8]} />
          <meshStandardMaterial color="#d1b58d" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function LandmarkModel({ landmark }) {
  const selectLandmark = useAppStore((state) => state.selectLandmark);
  const language = useAppStore((state) => state.language);
  useTerrainData();
  const baseY = worldPosToHeight(landmark.position[0], landmark.position[2]);
  const displayName = travelLandmarkMeta[landmark.id]?.name?.[language] ?? landmark.name;

  return (
    <group position={[landmark.position[0], baseY, landmark.position[2]]} rotation={landmark.rotation} onClick={() => selectLandmark(landmark.id)}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[landmark.triggerRadius * 0.28, landmark.triggerRadius * 0.42, 64]} />
        <meshBasicMaterial color="#7ed0e4" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[landmark.triggerRadius * 0.24, 48]} />
        <meshBasicMaterial color="#f0d490" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {landmark.modelPath ? <LoadedLandmarkModel landmark={landmark} /> : <PlaceholderLandmarkModel landmark={landmark} />}
      <pointLight position={[0, 4.8, 0]} color="#f0d490" distance={18} intensity={0.42} />
      <mesh position={[0, 2.8, 0]} visible={false} onClick={() => selectLandmark(landmark.id)}>
        <cylinderGeometry args={[landmark.triggerRadius * 0.45, landmark.triggerRadius * 0.45, 6, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <Html position={[0, 4.2, 0]} center distanceFactor={28} transform={false} sprite>
        <div className="landmark-chip">{displayName}</div>
      </Html>
    </group>
  );
}

export function LandmarkModels() {
  return (
    <group>
      {landmarks.map((landmark) => (
        <LandmarkModel key={landmark.id} landmark={landmark} />
      ))}
    </group>
  );
}

useGLTF.preload('/models/colosseum.glb');
useGLTF.preload('/models/leaning_tower_of_pisa.glb');
