// ==================== 键盘状态 ====================
export const controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  boost: false,
};

export function resetControls() {
  controls.forward = false;
  controls.backward = false;
  controls.left = false;
  controls.right = false;
  controls.boost = false;
}

// ==================== 键盘事件监听 ====================
const MOVEMENT_KEYS = [
  'KeyW', 'ArrowUp', 'KeyS', 'ArrowDown',
  'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight',
  'ShiftLeft', 'ShiftRight',
];

/**
 * 注册键盘事件。
 * @param {{
 *   onToggleView: Function,
 *   onExitFocus: Function,
 *   onInteractLandmark: Function,
 *   onToggleFPV: Function,
 *   onToggleAutoDrive: Function,
 *   getDrivingEnabled: Function,
 *   getCameraMode: Function,
 * }} callbacks
 */
export function registerKeyboardListeners({
  onToggleView,
  onExitFocus,
  onInteractLandmark,
  onToggleFPV,
  onToggleAutoDrive,
  getDrivingEnabled,
  getCameraMode,
}) {
  window.addEventListener('keydown', (event) => {
    if (MOVEMENT_KEYS.includes(event.code)) event.preventDefault();

    const mode = getCameraMode();

    if (event.code === 'KeyV') {
      onToggleView();
      return;
    }

    if (event.code === 'KeyR') {
      onToggleAutoDrive();
      return;
    }

    // C — 跟随 <-> FPV 切换（follow 状态下）
    if (event.code === 'KeyC') {
      if (mode === 'follow' || mode === 'fpv') { onToggleFPV(); return; }
    }

    // F — 与最近地标交互
    if (event.code === 'KeyF') {
      if (mode === 'follow' || mode === 'fpv') { onInteractLandmark(); return; }
      if (mode === 'focus')                    { onExitFocus(); return; }
    }

    // Escape — 退出聚焦或地图模式退回驾驶
    if (event.code === 'Escape') {
      if (mode === 'focus') { onExitFocus(); return; }
      if (mode === 'map')   { onToggleView(); return; }
    }

    if (!getDrivingEnabled() || (mode !== 'follow' && mode !== 'fpv')) return;

    if (event.code === 'KeyW' || event.code === 'ArrowUp')    controls.forward  = true;
    if (event.code === 'KeyS' || event.code === 'ArrowDown')  controls.backward = true;
    if (event.code === 'KeyA' || event.code === 'ArrowLeft')  controls.left     = true;
    if (event.code === 'KeyD' || event.code === 'ArrowRight') controls.right    = true;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') controls.boost = true;
  });

  window.addEventListener('keyup', (event) => {
    if (MOVEMENT_KEYS.includes(event.code)) event.preventDefault();

    if (event.code === 'KeyW' || event.code === 'ArrowUp')    controls.forward  = false;
    if (event.code === 'KeyS' || event.code === 'ArrowDown')  controls.backward = false;
    if (event.code === 'KeyA' || event.code === 'ArrowLeft')  controls.left     = false;
    if (event.code === 'KeyD' || event.code === 'ArrowRight') controls.right    = false;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') controls.boost = false;
  });
}
