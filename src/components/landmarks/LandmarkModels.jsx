import { Clone, Html, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { landmarks } from '../../data/landmarks.js';
import { worldPosToHeight } from '../../data/terrain.js';
import { useTerrainData } from '../../hooks/useTerrainData.js';
import { useAppStore } from '../../state/useAppStore.js';

function LandmarkModel({ landmark }) {
  const { scene } = useGLTF(landmark.modelPath);
  const selectLandmark = useAppStore((state) => state.selectLandmark);
  useTerrainData();

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

  const baseY = worldPosToHeight(landmark.position[0], landmark.position[2]);

  return (
    <group position={[landmark.position[0], baseY, landmark.position[2]]} rotation={landmark.rotation} onClick={() => selectLandmark(landmark.id)}>
      <Clone object={fittedScene} castShadow receiveShadow />
      <mesh position={[0, 2.8, 0]} visible={false} onClick={() => selectLandmark(landmark.id)}>
        <cylinderGeometry args={[landmark.triggerRadius * 0.45, landmark.triggerRadius * 0.45, 6, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <Html position={[0, 5.5, 0]} center distanceFactor={18}>
        <div className="landmark-chip">{landmark.name}</div>
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
