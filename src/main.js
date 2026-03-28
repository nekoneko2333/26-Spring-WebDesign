import * as THREE from 'three';
import { scene, camera, renderer } from './core/scene.js';
import { buildMapGround } from './core/mapTiles.js';
import { initPhysicsCar, chassisMesh, updateCar } from './car/carPhysics.js';
import { carModelRoot } from './car/carVisual.js';
import { controls, resetControls, registerKeyboardListeners } from './car/carControls.js';
import {
  initLandmarksFromAPI,
  pointsOfInterest,
  landmarkClickableRoots,
  landmarkById,
} from './landmarks/landmarkLoader.js';
import {
  showPOIPopup,
  hidePOIPopup,
  dismissedPOIId,
  resetDismissed,
  registerFocusPanelListeners,
} from './ui/popup.js';
import {
  getCameraMode,
  getIsCameraTransitioning,
  getDrivingEnabled,
  getIsFocusingLandmark,
  switchToFollowView,
  switchToMapView,
  enterLandmarkFocus,
  exitLandmarkFocus,
  updateFollowCamera,
} from './camera/cameraController.js';
import './style.css';

// ==================== 初始化 ====================
initPhysicsCar();

// ==================== 返回地图按钮 & HUD 显隐 ====================
const btnMapView = document.getElementById('btn-map-view');
const hudHints   = document.getElementById('hud-hints');

if (btnMapView) {
  btnMapView.addEventListener('click', () => switchToMapView());
}

// 每帧根据相机模式控制 HUD 显隐
function updateHUD() {
  const mode = getCameraMode();
  const inFollow = mode === 'follow';
  btnMapView?.classList.toggle('is-visible', inFollow);
  hudHints?.classList.toggle('is-visible', inFollow);
}

// ==================== 键盘 & 面板事件 ====================
registerKeyboardListeners({
  onToggleView: () => switchToMapView(),
  onExitFocus:  () => exitLandmarkFocus(chassisMesh),
  getDrivingEnabled,
  getCameraMode,
});

registerFocusPanelListeners({
  onExitFocus:  () => exitLandmarkFocus(chassisMesh),
  onEnterFocus: (poi) => {
    // 找到对应的 3D 根节点用于相机定焦
    const root = landmarkClickableRoots.find((r) => r.userData.poiId === poi.id);
    enterLandmarkFocus(poi, root || { position: poi.position, userData: {} }, chassisMesh);
  },
});

// ==================== 射线拾取 ====================
const raycaster = new THREE.Raycaster();
const mouseNDC  = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (getIsCameraTransitioning()) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((event.clientX - rect.left) / rect.width)  *  2 - 1;
  mouseNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);

  if (getCameraMode() === 'map') {
    const clickableCar = carModelRoot || carVisualGroup;
    const carHit = raycaster.intersectObject(clickableCar, true);
    if (carHit.length > 0) switchToFollowView(chassisMesh);
    return;
  }

  if (getCameraMode() === 'follow') {
    const hits = raycaster.intersectObjects(landmarkClickableRoots, true);
    if (hits.length > 0) {
      let root = hits[0].object;
      while (root.parent && !root.userData.poiId) root = root.parent;
      const poi = landmarkById.get(root.userData.poiId);
      if (poi) enterLandmarkFocus(poi, root, chassisMesh);
    }
  }
});

// ==================== POI 距离触发 ====================
const _carPos = new THREE.Vector3();

function updatePOITriggerByDistance() {
  if (getCameraMode() !== 'follow' || getIsFocusingLandmark()) {
    hidePOIPopup();
    return;
  }

  _carPos.copy(chassisMesh.position);

  let nearestPOI      = null;
  let nearestDistance = Infinity;

  for (const poi of pointsOfInterest) {
    const distance = _carPos.distanceTo(poi.position);
    if (distance <= poi.triggerRadius && distance < nearestDistance) {
      nearestPOI      = poi;
      nearestDistance = distance;
    }
  }

  if (!nearestPOI) {
    resetDismissed();
    hidePOIPopup();
    return;
  }

  if (dismissedPOIId === nearestPOI.id) return;
  showPOIPopup(nearestPOI, nearestDistance);
}

// ==================== 动画循环 ====================
let lastTime;

function animate(time) {
  requestAnimationFrame(animate);

  if (lastTime !== undefined) {
    const delta = Math.min((time - lastTime) / 1000, 0.1); // 限制最大 delta 防卡顿

    updateCar(delta, controls, getDrivingEnabled());
    updatePOITriggerByDistance();
    updateFollowCamera(chassisMesh);
    updateHUD();
  }

  lastTime = time;
  renderer.render(scene, camera);
}

// ==================== 启动 ====================
buildMapGround(); // 异步加载 OSM 瓦片，加载期间显示海洋底色
initLandmarksFromAPI();
animate();
