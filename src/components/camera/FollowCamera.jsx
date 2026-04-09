import { useFrame, useThree } from '@react-three/fiber';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import * as THREE from 'three';

const followOffset = new THREE.Vector3(0, 3.2, -7.4);
const lookOffset = new THREE.Vector3(0, 1.1, 0);
const tempOffset = new THREE.Vector3();
const tempLook = new THREE.Vector3();
const mapTarget = new THREE.Vector3(0, 66, 14);
const mapLookAt = new THREE.Vector3(0, 0, 8);

export function FollowCamera({ targetRef }) {
  const camera = useThree((state) => state.camera);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const selectedLandmarkId = useAppStore((state) => state.selectedLandmarkId);

  useFrame(() => {
    if (!targetRef.current) return;

    const target = targetRef.current.translation();
    const rotation = targetRef.current.rotation();
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

    if (cameraMode === 'map') {
      camera.position.lerp(mapTarget, 0.06);
      camera.lookAt(mapLookAt);
      return;
    }

    if (cameraMode === 'focus' && selectedLandmarkId) {
      const landmark = landmarks.find((item) => item.id === selectedLandmarkId);
      if (landmark) {
        const focusPos = new THREE.Vector3(landmark.position[0] + 8, 8.5, landmark.position[2] + 8);
        camera.position.lerp(focusPos, 0.08);
        camera.lookAt(landmark.position[0], 2.4, landmark.position[2]);
        return;
      }
    }

    tempOffset.copy(followOffset).applyQuaternion(quat);
    tempLook.copy(lookOffset).add(new THREE.Vector3(target.x, target.y, target.z));
    camera.position.lerp(new THREE.Vector3(target.x, target.y, target.z).add(tempOffset), 0.08);
    camera.lookAt(tempLook);
  });

  return null;
}
