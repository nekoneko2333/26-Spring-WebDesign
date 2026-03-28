import * as THREE from 'three';
import { gsap } from 'gsap';
import { camera } from '../core/scene.js';
import { resetControls } from '../car/carControls.js';
import { openFocusPanel, closeFocusPanel } from '../ui/popup.js';

// ==================== 相机常量 ====================
export const MAP_CAMERA_POSITION = new THREE.Vector3(0, 120, 0.01);
export const MAP_LOOK_TARGET = new THREE.Vector3(0, 0, 0);
const FOLLOW_OFFSET_LOCAL = new THREE.Vector3(0, 5.5, -11);
const FOLLOW_LOOK_OFFSET = new THREE.Vector3(0, 1.4, 0);

// ==================== 状态（getter 供外部读取） ====================
let _cameraMode = 'map'; // 'map' | 'follow' | 'focus'
let _isCameraTransitioning = false;
let _drivingEnabled = false;
let _isFocusingLandmark = false;
let _focusedLandmark = null;

export const getCameraMode = () => _cameraMode;
export const getIsCameraTransitioning = () => _isCameraTransitioning;
export const getDrivingEnabled = () => _drivingEnabled;
export const getIsFocusingLandmark = () => _isFocusingLandmark;

// 临时向量（复用避免 GC）
const tempFollowOffset = new THREE.Vector3();
const tempLookTarget = new THREE.Vector3();
const tempBox = new THREE.Box3();
const tempBoxSize = new THREE.Vector3();
const tempBoxCenter = new THREE.Vector3();

// 初始相机位置
camera.position.copy(MAP_CAMERA_POSITION);
camera.lookAt(MAP_LOOK_TARGET);

// ==================== 切换到跟随视角 ====================
export function switchToFollowView(chassisMesh) {
  if (_cameraMode === 'follow' || _isCameraTransitioning) return;

  _cameraMode = 'follow';
  _isCameraTransitioning = true;

  tempFollowOffset.copy(FOLLOW_OFFSET_LOCAL).applyQuaternion(chassisMesh.quaternion);
  const targetPosition = chassisMesh.position.clone().add(tempFollowOffset);
  tempLookTarget.copy(chassisMesh.position).add(FOLLOW_LOOK_OFFSET);

  gsap.to(camera.position, {
    x: targetPosition.x,
    y: targetPosition.y,
    z: targetPosition.z,
    duration: 1.2,
    ease: 'power3.inOut',
  });

  gsap.to(MAP_LOOK_TARGET, {
    x: tempLookTarget.x,
    y: tempLookTarget.y,
    z: tempLookTarget.z,
    duration: 1.2,
    ease: 'power3.inOut',
    onUpdate: () => camera.lookAt(MAP_LOOK_TARGET),
    onComplete: () => {
      _isCameraTransitioning = false;
      _drivingEnabled = true;
    },
  });
}

// ==================== 切换到地图视角 ====================
export function switchToMapView() {
  if (_cameraMode === 'map' || _isCameraTransitioning) return;

  _cameraMode = 'map';
  _isCameraTransitioning = true;
  _drivingEnabled = false;
  resetControls();

  gsap.to(camera.position, {
    x: MAP_CAMERA_POSITION.x,
    y: MAP_CAMERA_POSITION.y,
    z: MAP_CAMERA_POSITION.z,
    duration: 1,
    ease: 'power3.inOut',
  });

  gsap.to(MAP_LOOK_TARGET, {
    x: 0, y: 0, z: 0,
    duration: 1,
    ease: 'power3.inOut',
    onUpdate: () => camera.lookAt(MAP_LOOK_TARGET),
    onComplete: () => {
      _isCameraTransitioning = false;
    },
  });
}

// ==================== 进入地标聚焦视角 ====================
export function enterLandmarkFocus(poi, clickedObject, chassisMesh) {
  if (_isCameraTransitioning || _cameraMode !== 'follow') return;

  tempBox.setFromObject(clickedObject);
  tempBox.getCenter(tempBoxCenter);
  tempBox.getSize(tempBoxSize);

  const focusDistance = Math.max(tempBoxSize.x, tempBoxSize.y, tempBoxSize.z) * 1.45;
  const toCar = new THREE.Vector3()
    .subVectors(chassisMesh.position, tempBoxCenter)
    .setY(0)
    .normalize();

  if (toCar.lengthSq() < 0.0001) toCar.set(0, 0, 1);

  const targetPos = tempBoxCenter.clone().add(toCar.multiplyScalar(focusDistance));
  targetPos.y = tempBoxCenter.y + Math.max(3, tempBoxSize.y * 0.55);

  _isFocusingLandmark = true;
  _focusedLandmark = poi;
  _cameraMode = 'focus';
  _drivingEnabled = false;
  resetControls();

  openFocusPanel(poi);

  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.05,
    ease: 'power3.inOut',
  });

  gsap.to(MAP_LOOK_TARGET, {
    x: tempBoxCenter.x,
    y: tempBoxCenter.y,
    z: tempBoxCenter.z,
    duration: 1.05,
    ease: 'power3.inOut',
    onUpdate: () => camera.lookAt(MAP_LOOK_TARGET),
  });
}

// ==================== 退出地标聚焦，返回跟随视角 ====================
export function exitLandmarkFocus(chassisMesh) {
  if (!_isFocusingLandmark || _isCameraTransitioning) return;

  _isCameraTransitioning = true;
  closeFocusPanel();

  tempFollowOffset.copy(FOLLOW_OFFSET_LOCAL).applyQuaternion(chassisMesh.quaternion);
  const backToFollow = chassisMesh.position.clone().add(tempFollowOffset);
  tempLookTarget.copy(chassisMesh.position).add(FOLLOW_LOOK_OFFSET);

  gsap.to(camera.position, {
    x: backToFollow.x,
    y: backToFollow.y,
    z: backToFollow.z,
    duration: 1,
    ease: 'power3.inOut',
  });

  gsap.to(MAP_LOOK_TARGET, {
    x: tempLookTarget.x,
    y: tempLookTarget.y,
    z: tempLookTarget.z,
    duration: 1,
    ease: 'power3.inOut',
    onUpdate: () => camera.lookAt(MAP_LOOK_TARGET),
    onComplete: () => {
      _isCameraTransitioning = false;
      _isFocusingLandmark = false;
      _focusedLandmark = null;
      _cameraMode = 'follow';
      _drivingEnabled = true;
    },
  });
}

// ==================== 每帧跟随相机更新 ====================
export function updateFollowCamera(chassisMesh) {
  if (_cameraMode !== 'follow' || _isCameraTransitioning) return;

  tempFollowOffset.copy(FOLLOW_OFFSET_LOCAL).applyQuaternion(chassisMesh.quaternion);
  const desiredPosition = chassisMesh.position.clone().add(tempFollowOffset);
  camera.position.lerp(desiredPosition, 0.12);

  tempLookTarget.copy(chassisMesh.position).add(FOLLOW_LOOK_OFFSET);
  MAP_LOOK_TARGET.lerp(tempLookTarget, 0.18);
  camera.lookAt(MAP_LOOK_TARGET);
}
