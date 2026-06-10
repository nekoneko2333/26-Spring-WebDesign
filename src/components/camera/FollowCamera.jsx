import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import * as THREE from 'three';

const followOffset = new THREE.Vector3(0, 2.2, -5.4);
const lookOffset = new THREE.Vector3(0, 0.72, 1.4);
const tempOffset = new THREE.Vector3();
const tempLook = new THREE.Vector3();
const mapTarget = new THREE.Vector3(0, 175, 145);
const mapLookAt = new THREE.Vector3(0, 0, 0);
const targetWorldPosition = new THREE.Vector3();
const targetWorldQuaternion = new THREE.Quaternion();
const cameraTarget = new THREE.Vector3();

export function FollowCamera({ targetRef }) {
  const camera = useThree((state) => state.camera);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const selectedLandmarkId = useAppStore((state) => state.selectedLandmarkId);
  const controlsRef = useRef(null);
  const lastModeRef = useRef(cameraMode);

  useFrame((_, delta) => {
    if (!targetRef.current) return;

    targetRef.current.getWorldPosition(targetWorldPosition);
    targetRef.current.getWorldQuaternion(targetWorldQuaternion);

    if (cameraMode === 'free') {
      // 自由视角只在刚切换时把 OrbitControls 目标放到小车附近，之后不再强制跟随。
      if (lastModeRef.current !== 'free' && controlsRef.current) {
        controlsRef.current.target.copy(targetWorldPosition);
        controlsRef.current.update();
      }
      lastModeRef.current = cameraMode;
      return;
    }

    lastModeRef.current = cameraMode;

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

    // 跟随视角：相机位于小车后上方，平滑看向车头前方，避免贴车晃动。
    tempOffset.copy(followOffset).applyQuaternion(targetWorldQuaternion);
    tempLook.copy(lookOffset).add(targetWorldPosition);
    cameraTarget.copy(targetWorldPosition).add(tempOffset);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, cameraTarget.x, 0.095);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, cameraTarget.z, 0.095);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraTarget.y, 3.2, delta);
    camera.lookAt(tempLook);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={cameraMode === 'free'}
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={130}
      maxPolarAngle={Math.PI * 0.48}
    />
  );
}
