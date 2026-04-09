import { openModelViewer } from './modelViewer.js';

// ==================== DOM 元素引用 ====================
const popupEl = document.getElementById('poi-popup');
const popupTitleEl = document.getElementById('poi-title');
const popupDescEl = document.getElementById('poi-desc');
const popupDistanceEl = document.getElementById('poi-distance');
const popupCloseEl = document.getElementById('poi-close');
const popupActionEl = document.getElementById('poi-action');
const interactPromptTextEl = document.getElementById('interact-prompt-text');

const focusOverlayEl = document.getElementById('focus-overlay');
const focusTitleEl = document.getElementById('focus-title');
const focusDescEl = document.getElementById('focus-description');
const focusBackEl = document.getElementById('focus-back');
const focusModelBtnEl = document.getElementById('focus-model-btn');

// 当前弹窗对应的 POI 对象（供"查看详情"按钮使用）
let _currentPOI = null;

// ==================== POI 弹窗状态 ====================
export let activePOIId = null;
export let dismissedPOIId = null;

export function resetDismissed() {
  dismissedPOIId = null;
}

// ==================== POI 弹窗 ====================
export function showPOIPopup(poi, distance) {
  if (!popupEl || !popupTitleEl || !popupDescEl || !popupDistanceEl) return;
  popupTitleEl.textContent = poi.name;
  popupDescEl.textContent = poi.description;
  popupDistanceEl.textContent = `距离 ${distance.toFixed(1)} m`;
  if (interactPromptTextEl) interactPromptTextEl.textContent = 'Explore Landmark';
  const promptEl = document.getElementById('interact-prompt');
  if (promptEl) promptEl.classList.add('is-visible');
  popupEl.classList.add('is-visible');
  activePOIId = poi.id;
  _currentPOI = poi;
}

export function hidePOIPopup() {
  if (!popupEl) return;
  popupEl.classList.remove('is-visible');
  if (interactPromptTextEl) interactPromptTextEl.textContent = 'Cruise & Discover';
  const promptEl = document.getElementById('interact-prompt');
  if (promptEl) promptEl.classList.remove('is-visible');
  activePOIId = null;
}

  if (popupCloseEl) {
  popupCloseEl.addEventListener('click', () => {
    dismissedPOIId = activePOIId;
    const promptEl = document.getElementById('interact-prompt');
    if (promptEl) promptEl.classList.remove('is-visible');
    hidePOIPopup();
  });
}

// ==================== Focus 面板 ====================
export function openFocusPanel(poi) {
  if (!focusOverlayEl || !focusTitleEl || !focusDescEl) return;
  _currentPOI = poi;
  focusTitleEl.textContent = poi.name;
  focusDescEl.textContent = poi.description;
  focusOverlayEl.classList.add('is-visible');
  focusOverlayEl.setAttribute('aria-hidden', 'false');
}

export function closeFocusPanel() {
  if (!focusOverlayEl) return;
  focusOverlayEl.classList.remove('is-visible');
  focusOverlayEl.setAttribute('aria-hidden', 'true');
}

/**
 * 注册 Focus 面板的关闭事件，以及弹窗"查看详情"按钮事件。
 * @param {{ onExitFocus: Function, onEnterFocus: Function }} callbacks
 */
export function registerFocusPanelListeners({ onExitFocus, onEnterFocus }) {
  // "查看详情"按钮 → 打开模型预览弹窗
  if (popupActionEl) {
    popupActionEl.addEventListener('click', () => {
      if (_currentPOI) openModelViewer(_currentPOI);
    });
  }
  if (focusModelBtnEl) {
    focusModelBtnEl.addEventListener('click', () => {
      if (_currentPOI) openModelViewer(_currentPOI);
    });
  }
  if (focusBackEl) {
    focusBackEl.addEventListener('click', () => onExitFocus());
  }
  if (focusOverlayEl) {
    focusOverlayEl.addEventListener('click', (event) => {
      if (event.target === focusOverlayEl) onExitFocus();
    });
  }
}
