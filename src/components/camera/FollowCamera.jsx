import { useFrame, useThree } from '@react-three/fiber';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import * as THREE from 'three';

const followOffset = new THREE.Vector3(0, 2.8, -6.6);
const lookOffset = new THREE.Vector3(0, 1.0, 1.3);
const tempOffset = new THREE.Vector3();
const tempLook = new THREE.Vector3();
const mapTarget = new THREE.Vector3(0, 72, 24);
const mapLookAt = new THREE.Vector3(0, 0, 2);
const targetWorldPosition = new THREE.Vector3();
const targetWorldQuaternion = new THREE.Quaternion();
const cameraTarget = new THREE.Vector3();

export function FollowCamera({ targetRef }) {
  const camera = useThree((state) => state.camera);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const selectedLandmarkId = useAppStore((state) => state.selectedLandmarkId);

  useFrame(() => {
    if (!targetRef.current) return;

    targetRef.current.getWorldPosition(targetWorldPosition);
    targetRef.current.getWorldQuaternion(targetWorldQuaternion);

    if (cameraMode === 'map') {
      camera.position.lerp(mapTarget, 0.045);
      camera.lookAt(mapLookAt);
      return;
    }

    if (cameraMode === 'focus' && selectedLandmarkId) {
      const landmark = landmarks.find((item) => item.id === selectedLandmarkId);
      if (landmark) {
        const focusPos = new THREE.Vector3(landmark.position[0] + 8, 8.5, landmark.position[2] + 8);
        camera.position.lerp(focusPos, 0.065);
        camera.lookAt(landmark.position[0], 2.4, landmark.position[2]);
        return;
      }
    }

    tempOffset.copy(followOffset).applyQuaternion(targetWorldQuaternion);
    tempLook.copy(lookOffset).add(targetWorldPosition);
    cameraTarget.copy(targetWorldPosition).add(tempOffset);
    camera.position.lerp(cameraTarget, 0.105);
    camera.lookAt(tempLook);
  });

  return null;
}
