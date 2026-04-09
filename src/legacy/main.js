import * as THREE from 'three';
import { scene, camera, renderer } from './core/scene.js';
import { buildMapGround } from './core/mapTiles.js';
import { initPhysicsCar, chassisMesh, updateCar, carState } from './car/carPhysics.js';
import { carModelRoot, carVisualGroup } from './car/carVisual.js';
import { controls, registerKeyboardListeners } from './car/carControls.js';
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
  switchToFPV,
  switchFPVToFollow,
  enterLandmarkFocus,
  exitLandmarkFocus,
  updateFollowCamera,
} from './camera/cameraController.js';
import { initIntroScreen, showLoadingProgress } from './ui/introScreen.js';
import './style.css';

// ==================== 初始化 ====================
initPhysicsCar();

// ==================== HUD 元素 ====================
const btnMapView = document.getElementById('btn-map-view');
const hudHints = document.getElementById('hud-hints');
const hudTitle = document.getElementById('hud-title');
const hudSpeed = document.getElementById('hud-speed');
const hudSpeedVal = document.getElementById('hud-speed-val');
const hudMode = document.getElementById('hud-mode');
const viewFlash = document.getElementById('view-flash');

let _hasStarted = false;
let _lastMode = getCameraMode();
let _nearestPOIForInteract = null;
let _uiWakeUntil = 0;

function flashTransition() {
  if (!viewFlash) return;
  wakeUI(1600);
  viewFlash.classList.add('flash-in');
  setTimeout(() => viewFlash.classList.remove('flash-in'), 180);
}

function showHUDAfterStart() {
  hudTitle?.classList.add('is-visible');
  hudMode?.classList.add('is-visible');
  wakeUI(2600);
}

function wakeUI(duration = 1800) {
  _uiWakeUntil = performance.now() + duration;
}

function getPOIRootById(poiId) {
  return landmarkClickableRoots.find((r) => r.userData.poiId === poiId);
}

function interactNearestPOI() {
  if (!_nearestPOIForInteract) return;
  const root = getPOIRootById(_nearestPOIForInteract.id);
  if (!root) return;
  flashTransition();
  enterLandmarkFocus(_nearestPOIForInteract, root, chassisMesh);
}

function toggleView() {
  const mode = getCameraMode();
  if (mode === 'map') {
    flashTransition();
    switchToFollowView(chassisMesh);
    return;
  }
  if (mode === 'follow' || mode === 'fpv') {
    if (mode === 'fpv') switchFPVToFollow(chassisMesh);
    flashTransition();
    switchToMapView();
  }
}

function toggleFPV() {
  const mode = getCameraMode();
  if (mode === 'follow') {
    flashTransition();
    switchToFPV(chassisMesh);
    return;
  }
  if (mode === 'fpv') {
    flashTransition();
    switchFPVToFollow(chassisMesh);
  }
}

if (btnMapView) {
  btnMapView.addEventListener('click', toggleView);
}

window.addEventListener('pointermove', () => wakeUI(1300), { passive: true });
window.addEventListener('keydown', () => wakeUI(1800));

// 每帧根据相机模式控制 HUD 显隐
function updateHUD() {
  if (!_hasStarted) return;

  const mode = getCameraMode();
  const inDrivingMode = mode === 'follow' || mode === 'fpv';
  const isUIAwake = performance.now() < _uiWakeUntil || mode === 'map' || mode === 'focus';
  document.body.classList.toggle('ui-awake', isUIAwake);

  btnMapView?.classList.toggle('is-visible', inDrivingMode && isUIAwake);
  hudHints?.classList.toggle('is-visible', inDrivingMode && isUIAwake);
  hudSpeed?.classList.toggle('is-visible', inDrivingMode && isUIAwake);

  const compass = document.getElementById('map-compass');
  compass?.classList.toggle('is-visible', mode === 'map');

  if (hudMode) {
    const modeText = mode === 'map'
      ? 'MAP VIEW'
      : mode === 'focus'
        ? 'LANDMARK FOCUS'
        : mode === 'fpv'
          ? 'FIRST PERSON'
          : 'DRIVING';
    hudMode.textContent = modeText;
  }

  if (mode !== _lastMode) {
    flashTransition();
    _lastMode = mode;
  }

  if (hudSpeedVal) {
    const kmh = Math.round(Math.abs(carState.speed) * 3.6);
    hudSpeedVal.textContent = String(kmh);
    hudSpeedVal.classList.toggle('is-boosting', controls.boost && inDrivingMode);
  }
}

// ==================== 键盘 & 面板事件 ====================
registerKeyboardListeners({
  onToggleView: toggleView,
  onToggleFPV: toggleFPV,
  onInteractLandmark: interactNearestPOI,
  onToggleAutoDrive: () => {
    // R：如果正在自动驾驶，优先退出
    if (carState.autoDrive) {
      carState.autoDrive = false;
      return;
    }

    // 仅在驾驶视角允许开启自动驾驶
    const mode = getCameraMode();
    if (mode !== 'follow' && mode !== 'fpv') return;

    carState.autoDrive = true;
    carState.autoDriveT = 0;
  },
  onExitFocus: () => {
    flashTransition();
    exitLandmarkFocus(chassisMesh);
  },
  getDrivingEnabled,
  getCameraMode,
});

registerFocusPanelListeners({
  onExitFocus: () => {
    flashTransition();
    exitLandmarkFocus(chassisMesh);
  },
  onEnterFocus: (poi) => {
    const root = landmarkClickableRoots.find((r) => r.userData.poiId === poi.id);
    flashTransition();
    enterLandmarkFocus(poi, root || { position: poi.position, userData: {} }, chassisMesh);
  },
});

// ==================== 射线拾取 ====================
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!_hasStarted || getIsCameraTransitioning()) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);

  const mode = getCameraMode();

  if (mode === 'map') {
    const clickableCar = carModelRoot || carVisualGroup;
    const carHit = raycaster.intersectObject(clickableCar, true);
    if (carHit.length > 0) {
      flashTransition();
      switchToFollowView(chassisMesh);
    }
    return;
  }

  if (mode === 'follow' || mode === 'fpv') {
    const hits = raycaster.intersectObjects(landmarkClickableRoots, true);
    if (hits.length > 0) {
      let root = hits[0].object;
      while (root.parent && !root.userData.poiId) root = root.parent;
      const poi = landmarkById.get(root.userData.poiId);
      if (poi) {
        flashTransition();
        enterLandmarkFocus(poi, root, chassisMesh);
      }
    }
  }
});

// ==================== POI 距离触发 ====================
const _carPos = new THREE.Vector3();

function updatePOITriggerByDistance() {
  const mode = getCameraMode();
  if (!_hasStarted || (mode !== 'follow' && mode !== 'fpv') || getIsFocusingLandmark()) {
    _nearestPOIForInteract = null;
    hidePOIPopup();
    return;
  }

  _carPos.copy(chassisMesh.position);

  let nearestPOI = null;
  let nearestDistance = Infinity;

  for (const poi of pointsOfInterest) {
    const distance = _carPos.distanceTo(poi.position);
    if (distance <= poi.triggerRadius && distance < nearestDistance) {
      nearestPOI = poi;
      nearestDistance = distance;
    }
  }

  _nearestPOIForInteract = nearestPOI;

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
    const delta = Math.min((time - lastTime) / 1000, 0.1);

    updateCar(delta, controls, getDrivingEnabled());
    updatePOITriggerByDistance();
    updateFollowCamera(chassisMesh);
    updateHUD();
  }

  lastTime = time;
  renderer.render(scene, camera);
}

async function boot() {
  initIntroScreen({
    onStart: () => {
      _hasStarted = true;
      showHUDAfterStart();
      flashTransition();
      switchToFollowView(chassisMesh);
    },
  });

  showLoadingProgress(15);
  await buildMapGround();
  showLoadingProgress(70);
  await initLandmarksFromAPI();
  showLoadingProgress(100);
}

boot();
animate();
